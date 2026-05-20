// Vercel serverless function: aggregates all RSS feeds, returns JSON.
// Edge-cached for 1 hour with stale-while-revalidate.
//
// v0.3.0 — Phase 3a: 11 SA/African YouTube channels added via native Atom feeds.
// v0.2.2 — uses native fetch (Node 18+) which auto-decompresses gzip/deflate/br.
// rss-parser's internal HTTP layer (axios) does NOT decompress, which silently
// broke ~8 sources in v0.2.1 with "Non-whitespace before first tag" errors.

const Parser = require("rss-parser");
const { SOURCES } = require("./sources");

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

// Bumped from 5.5s → 8s in v0.3.2 so RSSHub-backed Telegram sources can
// cold-start within budget. Sources run in parallel via Promise.allSettled,
// so the function still returns in ~max(timeouts).
const FETCH_TIMEOUT_MS = 8000;

// FlareSolverr-routed sources need much more headroom — Chromium boot +
// (sometimes) heavy Cloudflare challenge solving. Function maxDuration is
// 50s in vercel.json; per-source budget is 45s. Glitched and HLTV in
// particular need >30s.
const FLARESOLVERR_TIMEOUT_MS = 45000;
const FLARESOLVERR_URL = process.env.FLARESOLVERR_URL;
const FLARESOLVERR_CLIENT_ID = process.env.FLARESOLVERR_CLIENT_ID;
const FLARESOLVERR_CLIENT_SECRET = process.env.FLARESOLVERR_CLIENT_SECRET;

// rss-parser used only for parsing — we do the HTTP ourselves with native fetch
const parser = new Parser({
  // No headers here — we fetch manually
});

function cleanText(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesKeywords(item, keywords) {
  if (!keywords || keywords.length === 0) return true;
  const haystack = `${item.title || ""} ${item.contentSnippet || ""} ${
    item.content || ""
  }`.toLowerCase();
  return keywords.some((kw) => haystack.includes(kw.toLowerCase()));
}

async function fetchXml(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": BROWSER_UA,
        Accept:
          "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.6",
        "Accept-Language": "en-US,en;q=0.9",
        // Native fetch will set Accept-Encoding itself and auto-decompress
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// Cloudflare-blocked sites: route through self-hosted FlareSolverr behind a
// CF Access service-token gate. FlareSolverr boots a Chromium tab, fetches
// the URL, and returns the rendered DOM wrapped in <pre>...</pre>. We
// extract the XML from inside the <pre>.
async function fetchXmlViaFlareSolverr(url, timeoutMs = FLARESOLVERR_TIMEOUT_MS) {
  if (!FLARESOLVERR_URL || !FLARESOLVERR_CLIENT_ID || !FLARESOLVERR_CLIENT_SECRET) {
    throw new Error("FlareSolverr env vars not configured");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(FLARESOLVERR_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "CF-Access-Client-Id": FLARESOLVERR_CLIENT_ID,
        "CF-Access-Client-Secret": FLARESOLVERR_CLIENT_SECRET,
      },
      body: JSON.stringify({
        cmd: "request.get",
        url,
        maxTimeout: Math.max(15000, timeoutMs - 2000),
      }),
    });
    if (!res.ok) {
      throw new Error(`FlareSolverr HTTP ${res.status} ${res.statusText}`);
    }
    const body = await res.json();
    if (body.status !== "ok") {
      throw new Error(`FlareSolverr ${body.status}: ${body.message || "no detail"}`);
    }
    const sol = body.solution || {};
    if (sol.status !== 200) {
      throw new Error(`upstream HTTP ${sol.status} via FlareSolverr`);
    }
    return unwrapBrowserXml(sol.response || "");
  } finally {
    clearTimeout(timer);
  }
}

// FlareSolverr returns the page HTML as rendered by Chromium. For XML feeds
// the browser wraps the content in <pre>…</pre> with HTML-encoded entities.
// Pull the inner XML back out so rss-parser can read it.
function unwrapBrowserXml(html) {
  const trimmed = html.trim();
  // If the response is already XML (no Chromium wrapping), return as-is.
  if (trimmed.startsWith("<?xml") || trimmed.startsWith("<rss") || trimmed.startsWith("<feed")) {
    return trimmed;
  }
  const m = trimmed.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (!m) {
    // Maybe a Chromium "RSS detected" view-source-style — just return raw.
    return trimmed;
  }
  return m[1]
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// ─── DEDUP: simple-signal multi-source merging (Phase 5.0) ───────────────
// Group near-identical headlines published within a short window across
// different sources, collapse them into a single item carrying `sources: []`.
// No embeddings, no API cost. Conservative: only merges cross-source items
// with matching title shingles and Web/News platforms.

const STORY_KEY_LEN = 60;
const MERGE_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "of", "in", "on", "at", "to", "for",
  "with", "is", "are", "was", "were", "be", "been", "by", "as", "from", "this",
  "that", "it", "its", "his", "her", "their", "our", "your",
]);

function storyKey(title) {
  if (!title) return "";
  const cleaned = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w))
    .join(" ");
  return cleaned.slice(0, STORY_KEY_LEN);
}

function mergeDuplicateStories(items) {
  const groups = new Map();
  const orphans = [];

  for (const item of items) {
    // Only merge Web/News platform items. YouTube/Reddit/Telegram are
    // platform-distinct content even with similar titles.
    if (item.platform !== "Web" && item.platform !== undefined) {
      orphans.push(item);
      continue;
    }
    const key = storyKey(item.title);
    if (!key || key.length < 20) {
      orphans.push(item);
      continue;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  const out = [...orphans];
  for (const group of groups.values()) {
    if (group.length === 1) {
      out.push(group[0]);
      continue;
    }
    // Check items are from different sources and within MERGE_WINDOW_MS
    const sortedByDate = group
      .filter((it) => it.published)
      .sort((a, b) => new Date(a.published) - new Date(b.published));
    if (sortedByDate.length === 0) {
      out.push(...group);
      continue;
    }
    const earliest = sortedByDate[0];
    const inWindow = group.filter((it) => {
      if (!it.published) return false;
      const dt = new Date(it.published) - new Date(earliest.published);
      return dt >= 0 && dt <= MERGE_WINDOW_MS;
    });
    const distinctSources = new Set(inWindow.map((it) => it.source));
    if (distinctSources.size < 2 || inWindow.length < 2) {
      out.push(...group);
      continue;
    }
    // Merge: keep the earliest item as the canonical, attach sources list.
    const primary = earliest;
    const sources = Array.from(distinctSources);
    const merged = {
      ...primary,
      sources, // marker that this item is multi-source
      source: primary.source, // keep original for backwards compat
      merge_count: inWindow.length,
    };
    out.push(merged);
    // Items in window that weren't picked are absorbed; items OUTSIDE the
    // window stay as separate entries (likely follow-up coverage).
    for (const it of group) {
      if (!inWindow.includes(it)) out.push(it);
    }
  }
  return out;
}

async function fetchSource(src) {
  try {
    const xml = src.useFlareSolverr
      ? await fetchXmlViaFlareSolverr(src.url)
      : await fetchXml(src.url);
    const feed = await parser.parseString(xml);
    const items = (feed.items || [])
      .filter((item) => matchesKeywords(item, src.keywords))
      .map((item) => {
        const publishedRaw =
          item.isoDate || item.pubDate || item.published || item.updated;
        const published = publishedRaw ? new Date(publishedRaw) : null;
        return {
          id: item.guid || item.link || `${src.source}-${item.title}`,
          title: cleanText(item.title || "Untitled"),
          link: item.link || "",
          description: cleanText(
            item.contentSnippet || item.summary || item.content || ""
          ).slice(0, 280),
          published: published ? published.toISOString() : null,
          source: src.source,
          platform: src.platform || "Web",
          category: src.category,
          region: src.region,
          games: src.games || [],
        };
      });
    return { ok: true, source: src.source, platform: src.platform, items };
  } catch (err) {
    let msg = String(err.message || err);
    if (err.name === "AbortError") {
      const t = src.useFlareSolverr ? FLARESOLVERR_TIMEOUT_MS : FETCH_TIMEOUT_MS;
      msg = `Timed out after ${t}ms`;
    }
    return {
      ok: false,
      source: src.source,
      platform: src.platform,
      url: src.url,
      note: src.note || null,
      error: msg.slice(0, 200),
      items: [],
    };
  }
}

module.exports = async (req, res) => {
  const startedAt = Date.now();

  const results = await Promise.allSettled(SOURCES.map(fetchSource));
  const settled = results.map((r) =>
    r.status === "fulfilled"
      ? r.value
      : { ok: false, source: "unknown", error: String(r.reason), items: [] }
  );

  const allItems = settled.flatMap((r) => r.items);

  const seen = new Set();
  const deduped = [];
  for (const item of allItems) {
    const key = (item.link || item.title || "").toLowerCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  const merged = mergeDuplicateStories(deduped);

  merged.sort((a, b) => {
    if (!a.published && !b.published) return 0;
    if (!a.published) return 1;
    if (!b.published) return -1;
    return new Date(b.published) - new Date(a.published);
  });

  const sourceStatus = settled.map((r) => ({
    source: r.source,
    platform: r.platform || null,
    ok: r.ok,
    count: r.items.length,
    error: r.error || null,
    note: r.note || null,
  }));

  const platformHealth = {};
  for (const s of sourceStatus) {
    const p = s.platform || "Web";
    if (!platformHealth[p]) platformHealth[p] = { ok: 0, fail: 0, total: 0 };
    platformHealth[p].total++;
    if (s.ok) platformHealth[p].ok++;
    else platformHealth[p].fail++;
  }

  const okCount = sourceStatus.filter((s) => s.ok).length;
  const totalCount = sourceStatus.length;

  const mergedCount = merged.filter((it) => it.sources).length;

  const payload = {
    version: "0.7.2",
    generated_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    sources_total: totalCount,
    sources_ok: okCount,
    items_total: merged.length,
    items_pre_merge: deduped.length,
    stories_merged: mergedCount,
    platform_health: platformHealth,
    source_status: sourceStatus,
    items: merged,
  };

  res.setHeader(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400"
  );
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(200).send(JSON.stringify(payload));
};
