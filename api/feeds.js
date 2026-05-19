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
// so the function still returns in ~max(timeouts) ≈ 8s, under the 10s cap.
const FETCH_TIMEOUT_MS = 8000;

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

async function fetchSource(src) {
  try {
    const xml = await fetchXml(src.url);
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
    if (err.name === "AbortError") msg = `Timed out after ${FETCH_TIMEOUT_MS}ms`;
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

  deduped.sort((a, b) => {
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

  const payload = {
    version: "0.3.2",
    generated_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    sources_total: totalCount,
    sources_ok: okCount,
    items_total: deduped.length,
    platform_health: platformHealth,
    source_status: sourceStatus,
    items: deduped,
  };

  res.setHeader(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400"
  );
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(200).send(JSON.stringify(payload));
};
