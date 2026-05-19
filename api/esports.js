// Vercel serverless function: Liquipedia African tournament tracker (Phase 4b).
// Returns recent page-edit signals for curated African tournament/team/player
// pages across CS2, Valorant, Dota 2, and League of Legends Liquipedia wikis.
//
// Same response shape as /api/feeds so the frontend can merge in parallel.
//
// Liquipedia rate-limit: 1 req/sec. We hit each game wiki sequentially with
// a 1.1s gap and batch all pages per game into a single titles=p1|p2|... call.
// Required headers per Liquipedia ToU: User-Agent (identifying) + gzip.

const FETCH_TIMEOUT_MS = 9000;
const RATE_LIMIT_GAP_MS = 1100;

const UA =
  "AfricaEsportsRadar/0.4 (+https://aer-v21-package.vercel.app; contact@eutopia.tech)";

// Curated pages per Liquipedia wiki. Discovered via Liquipedia search for
// "African", "South Africa", and team/personality names. Trim / extend freely.
const LIQUIPEDIA_PAGES = {
  counterstrike: [
    "ESL/African Championship",
    "ESL/African Championship/Season 1",
    "ESL/African Championship/Season 2",
    "ESEA/Season 41/Open/South Africa",
    "ESEA/Season 40/Open/South Africa",
    "ESEA/Season 39/Open/South Africa",
    "ESEA/Season 38/Open/South Africa",
    "ESEA/Season 37/Open/South Africa",
    "ESEA/Season 36/Open/South Africa",
    "ATK",
    "Bravado Gaming",
  ],
  valorant: [
    "VCT/2025/Game Changers/EMEA/Stage 1",
    "VCT/2025/Game Changers/EMEA/Stage 2",
    "VCT/2025/Game Changers/EMEA/Kickoff",
    "VCL/2023/MENA/Levant and North Africa/Split 2",
    "Carry1st VALZA Cup",
    "AGC/2025",
    "Red Bull/Campus Clutch/Regional Final/Africa & West Asia",
    "Anubis Gaming",
    "Bravado Gaming",
    "Team RA'AD",
  ],
  dota2: [
    "World Electronic Sports Games/2019/Africa",
    "World Electronic Sports Games/2018/Africa",
    "World Electronic Sports Games/2019/South Africa",
    "World Electronic Sports Games/2018/Africa/South Africa",
    "Telkom Do Gaming Championships",
    "White Rabbit Gaming",
    "Bravado Gaming",
  ],
  leagueoflegends: [
    "Intel Arabian Cup/Playground/2022/Season 2/North Africa",
    "Intel Arabian Cup/Playground/2022/Season 1/North Africa",
    "IeSF/Esports World Championship/2017",
    "IeSF/Esports World Championship/2018",
  ],
};

const GAME_TO_TAG = {
  counterstrike: "cs2",
  valorant: "valorant",
  dota2: "dota2",
  leagueoflegends: "lol",
};

async function fetchLiquipedia(game, pages) {
  const params = new URLSearchParams({
    action: "query",
    prop: "revisions",
    titles: pages.join("|"),
    rvprop: "timestamp|comment|user|ids|size",
    rvlimit: "1",
    format: "json",
  });
  const url = `https://liquipedia.net/${game}/api.php?${params.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        // Native fetch sets Accept-Encoding and auto-decompresses; Liquipedia
        // requires gzip. Node 18+ handles this transparently.
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function pageToItems(game, json) {
  const pages = (json && json.query && json.query.pages) || {};
  const items = [];
  for (const pageId of Object.keys(pages)) {
    if (pageId === "-1") continue; // missing pages
    const page = pages[pageId];
    const rev = page.revisions && page.revisions[0];
    if (!rev) continue;

    const pageTitle = page.title;
    const pageUrl = `https://liquipedia.net/${game}/${encodeURIComponent(
      pageTitle.replace(/ /g, "_")
    ).replace(/%2F/g, "/")}`;

    // Crude heuristic — team/player pages have no slash, tournament pages do.
    const isTeam = !pageTitle.includes("/");
    const region = pageTitle.toLowerCase().includes("south africa")
      ? "sa"
      : "africa";

    const comment = (rev.comment || "").trim();
    const description = comment
      ? `${rev.user || "?"}: ${comment}`
      : `Edited by ${rev.user || "an editor"}`;

    items.push({
      id: `liquipedia-${game}-${page.pageid}-${rev.revid}`,
      title: `${pageTitle} — updated on Liquipedia`,
      link: pageUrl,
      description: description.slice(0, 280),
      published: rev.timestamp || null,
      source: `Liquipedia (${game})`,
      platform: "Web",
      category: isTeam ? "team-update" : "tournament",
      region,
      games: [GAME_TO_TAG[game] || game],
    });
  }
  return items;
}

module.exports = async (req, res) => {
  const startedAt = Date.now();
  const games = Object.keys(LIQUIPEDIA_PAGES);
  const results = [];

  // Sequential to respect the 1 req/sec rate limit.
  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    try {
      const json = await fetchLiquipedia(game, LIQUIPEDIA_PAGES[game]);
      const items = pageToItems(game, json);
      results.push({ ok: true, game, count: items.length, items });
    } catch (err) {
      let msg = String(err.message || err);
      if (err.name === "AbortError") msg = `Timed out after ${FETCH_TIMEOUT_MS}ms`;
      results.push({
        ok: false,
        game,
        error: msg.slice(0, 200),
        items: [],
      });
    }
    if (i < games.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_GAP_MS));
    }
  }

  const allItems = results.flatMap((r) => r.items);
  allItems.sort((a, b) => {
    if (!a.published && !b.published) return 0;
    if (!a.published) return 1;
    if (!b.published) return -1;
    return new Date(b.published) - new Date(a.published);
  });

  const payload = {
    version: "0.4.1",
    endpoint: "esports",
    generated_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt,
    games_total: games.length,
    games_ok: results.filter((r) => r.ok).length,
    pages_tracked: games.reduce((n, g) => n + LIQUIPEDIA_PAGES[g].length, 0),
    items_total: allItems.length,
    source_status: results.map((r) => ({
      game: r.game,
      ok: r.ok,
      count: r.count || 0,
      error: r.error || null,
      pages: LIQUIPEDIA_PAGES[r.game].length,
    })),
    items: allItems,
  };

  res.setHeader(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400"
  );
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(200).send(JSON.stringify(payload));
};
