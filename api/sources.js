// ============================================================================
// Africa Esports Radar — curated source list (v0.6.0)
// ============================================================================
//
// v0.6.0 (Phase 3d): restored 5 Cloudflare-blocked SA news sources via
// self-hosted FlareSolverr behind a Cloudflare Access service token.
// Entries are flagged `useFlareSolverr: true` so feeds.js routes them
// through the tunnel instead of direct fetch.
//
// v0.3.0 (Phase 3a): added 11 SA/African YouTube channels via native
// youtube.com/feeds/videos.xml feeds (Atom).
//
// v0.2.2 baseline: 19 entries verified live after gzip fix.
//
// Still excluded (wrong URL / dead domain):
//   - SA Gamer, Esports Charts, Gaming and Esports SA, ACGL website
//
// ============================================================================

// RSSHub instance — used selectively for routes that work from Vercel
// (Telegram, generic XML bridges). NOT used for YouTube (native feeds beat it).
const RSSHUB = "https://aer-rsshub.vercel.app";

const AFRICA_KEYWORDS = [
  "africa", "african",
  "south africa", "south african",
  "carry1st", "mettlestate", "acgl",
  "bravado", "goliath gaming", "energy esports", "atk", "exdee",
  "white rabbit gaming", "royalty esports", "five fears", "nixuh",
  "anubis gaming", "anubis esports",
  "nigeria", "nigerian",
  "egypt", "egyptian",
  "morocco", "moroccan",
  "kenya", "kenyan",
  "ghana", "ghanaian",
  "tunisia", "tunisian",
  "mssa", "mind sports",
  "carry1st africa cup", "africa cup", "agc 2025", "agc25",
  "pmgc africa", "pubg mobile africa",
  "free fire africa",
  "rlcs ssa", "sub-saharan africa",
  "techgirl", "tech girl",
];

// Relevance gate for SA/global sources that publish mixed gaming/tech content.
// v0.7.2 — tightened: drop ambiguous generic words (championship/league/cup/
// season/team/broadcast — motorsport uses all those) in favour of esports-
// specific phrases, named games, and named African orgs/teams.
const ESPORTS_KEYWORDS = [
  // Esports-specific phrases
  "esport", "e-sport",                    // catches esports / e-sports
  "esports tournament", "esports team", "esports league", "esports championship",
  "esports player", "esports fan", "esports event", "esports industry",
  "online qualifier", "lan event", "lan tournament",
  "playoff bracket", "showmatch", "scrim",
  "pro player", "pro team", "shoutcast", "shoutcaster",
  "twitch streamer", "kick streamer", "twitch stream", "kick stream",
  "competitive gaming", "competitive scene",

  // Named games (substring matches the longer forms too)
  "cs2", "counter-strike", "counter strike", "csgo", "cs:go",
  "valorant", "vct ", "vct/",
  "dota 2", "dota2",
  "league of legends", "lcs ", "lec ", "lcs/", "lec/",
  "mobile legends", "mlbb",
  "pubg", "pmgc",
  "free fire",
  "rocket league", "rlcs",
  "ea fc", "fc 26", "fc 25", "fc 24", "fifa esports", "fifae",
  "apex legends",
  "overwatch league", "overwatch esports",
  "fortnite",
  "tekken", "street fighter", "evo championship", "evo tournament",
  "sim racing", "iracing", "esoccer",

  // African orgs / publishers / teams (high signal)
  "carry1st", "mettlestate", "acgl", "mssa", "vs gaming",
  "bravado gaming", "atk arena", "goliath gaming", "energy esports",
  "white rabbit gaming", "royalty esports", "exdee", "nixuh",
  "five fears", "anubis gaming", "anubis esports",
  "twareg esports", "sahara warriors",
  "fox gaming", "olympus gaming", "the black lotus",
];

const SOURCES = [
  // ─── SA NEWS (Cloudflare-blocked from Vercel — via FlareSolverr) ───────
  // Each request takes ~10–28s (Chromium boot + CF challenge solve). Per-source
  // timeout in feeds.js is 28s, function maxDuration is 30s. Runs in parallel
  // with all other sources so total wall-clock is still ~28s worst case.
  { url: "https://www.glitched.online/feed/",
    source: "Glitched Africa", platform: "Web",
    category: "news", region: "sa", games: ["general"],
    keywords: ESPORTS_KEYWORDS,
    useFlareSolverr: true, note: "Cloudflare-protected; via FlareSolverr" },

  { url: "https://www.nag.co.za/feed/",
    source: "NAG (New Age Gaming)", platform: "Web",
    category: "news", region: "sa", games: ["general"],
    keywords: ESPORTS_KEYWORDS,
    useFlareSolverr: true, note: "Cloudflare-protected; via FlareSolverr" },

  { url: "https://mybroadband.co.za/news/gaming/feed",
    source: "MyBroadband Gaming", platform: "Web",
    category: "news", region: "sa", games: ["general"],
    keywords: ESPORTS_KEYWORDS,
    useFlareSolverr: true, note: "Cloudflare-protected; via FlareSolverr" },

  { url: "https://www.htxt.co.za/category/gaming/feed/",
    source: "Hypertext Gaming", platform: "Web",
    category: "news", region: "sa", games: ["general"],
    keywords: ESPORTS_KEYWORDS,
    useFlareSolverr: true, note: "Cloudflare-protected; via FlareSolverr" },

  { url: "https://www.hltv.org/rss/news",
    source: "HLTV", platform: "Web",
    category: "news", region: "global", games: ["cs2"],
    keywords: AFRICA_KEYWORDS,
    useFlareSolverr: true, note: "Cloudflare-protected; via FlareSolverr" },

  // ─── SA NEWS & MEDIA (WordPress /feed/) ────────────────────────────────
  // On-topic by name (no filter): Esports Central, Esports Africa News,
  //   Games Industry Africa.
  // Mixed content (filter via ESPORTS_KEYWORDS): Stuff SA, Tech Girl, Vamers.
  { url: "https://esportscentral.co.za/feed/",
    source: "Esports Central", platform: "Web",
    category: "news", region: "sa", games: ["general"] },

  { url: "https://stuff.co.za/category/gaming/feed/",
    source: "Stuff SA — Gaming", platform: "Web",
    category: "news", region: "sa", games: ["general"],
    keywords: ESPORTS_KEYWORDS },

  { url: "https://esportsafricanews.com/feed/",
    source: "Esports Africa News", platform: "Web",
    category: "news", region: "africa", games: ["general"] },

  { url: "https://techgirl.co.za/feed/",
    source: "Tech Girl Blog", platform: "Web",
    category: "news", region: "sa", games: ["general"],
    keywords: ESPORTS_KEYWORDS },

  { url: "https://gamesindustryafrica.com/feed/",
    source: "Games Industry Africa", platform: "Web",
    category: "news", region: "africa", games: ["general"] },

  { url: "https://vamers.com/feed/",
    source: "Vamers", platform: "Web",
    category: "news", region: "sa", games: ["general"],
    keywords: ESPORTS_KEYWORDS },

  // ─── INTERNATIONAL ESPORTS MEDIA (Africa-filtered) ─────────────────────
  { url: "https://dotesports.com/feed",
    source: "Dot Esports", platform: "Web",
    category: "news", region: "global", games: ["multiple"],
    keywords: AFRICA_KEYWORDS },

  { url: "https://esportsinsider.com/feed",
    source: "Esports Insider", platform: "Web",
    category: "news", region: "global", games: ["multiple"],
    keywords: AFRICA_KEYWORDS },

  { url: "https://www.vlr.gg/rss/news",
    source: "VLR.gg (Valorant)", platform: "Web",
    category: "news", region: "global", games: ["valorant"],
    keywords: AFRICA_KEYWORDS,
    note: "Valorant news; nginx-hosted (no Cloudflare block from Vercel)" },

  // ─── FEDERATIONS ───────────────────────────────────────────────────────
  { url: "https://esportscommentator.blogspot.com/feeds/posts/default",
    source: "MSSA Esports Commentator", platform: "Web",
    category: "announcement", region: "sa", games: ["multiple"] },

  // ─── REDDIT (native /.rss — rock solid) ────────────────────────────────
  { url: "https://www.reddit.com/r/southafrica/.rss",
    source: "r/southafrica", platform: "Reddit",
    category: "community", region: "sa", games: ["general"],
    keywords: ["gaming", "esports", "valorant", "csgo", "cs2", "league of legends",
              "dota", "fifa", "fc 24", "fc 25", "fc 26", "playstation", "xbox",
              "rocket league", "carry1st", "mettlestate", "acgl", "twitch", "stream"] },

  { url: "https://www.reddit.com/r/Esports/.rss",
    source: "r/Esports", platform: "Reddit",
    category: "community", region: "global", games: ["multiple"],
    keywords: AFRICA_KEYWORDS },

  { url: "https://www.reddit.com/r/GlobalOffensive/.rss",
    source: "r/GlobalOffensive", platform: "Reddit",
    category: "community", region: "global", games: ["cs2"],
    keywords: AFRICA_KEYWORDS },

  { url: "https://www.reddit.com/r/ValorantCompetitive/.rss",
    source: "r/ValorantCompetitive", platform: "Reddit",
    category: "community", region: "global", games: ["valorant"],
    keywords: AFRICA_KEYWORDS },

  { url: "https://www.reddit.com/r/MobileLegendsGame/.rss",
    source: "r/MobileLegendsGame", platform: "Reddit",
    category: "community", region: "global", games: ["mlbb"],
    keywords: AFRICA_KEYWORDS },

  { url: "https://www.reddit.com/r/PUBGMobile/.rss",
    source: "r/PUBGMobile", platform: "Reddit",
    category: "community", region: "global", games: ["pubgm"],
    keywords: AFRICA_KEYWORDS },

  { url: "https://www.reddit.com/r/FreeFireGlobal/.rss",
    source: "r/FreeFireGlobal", platform: "Reddit",
    category: "community", region: "global", games: ["freefire"],
    keywords: AFRICA_KEYWORDS },

  { url: "https://www.reddit.com/r/EAFC/.rss",
    source: "r/EAFC", platform: "Reddit",
    category: "community", region: "global", games: ["fc"],
    keywords: AFRICA_KEYWORDS },

  { url: "https://www.reddit.com/r/apexlegends/.rss",
    source: "r/apexlegends", platform: "Reddit",
    category: "community", region: "global", games: ["apex"],
    keywords: AFRICA_KEYWORDS },

  { url: "https://www.reddit.com/r/pcmasterrace/.rss",
    source: "r/pcmasterrace", platform: "Reddit",
    category: "community", region: "global", games: ["general"],
    keywords: AFRICA_KEYWORDS },

  // ─── YOUTUBE (native Atom feeds — no auth, works from Vercel) ──────────
  // URL pattern: https://www.youtube.com/feeds/videos.xml?channel_id=<UC...>
  // Resolved 2026-05-19 from each channel's @handle page.
  //
  // STRAGGLERS (handles in brief return 404 — need current handle from Danie):
  //   @DarknessRoshi  (2.1M+, SA GTA content)
  //   @LosSantosLeaks (1.8M+, SA GTA content)

  // Mixed-content personalities — filter via ESPORTS_KEYWORDS to drop
  // general gaming/vlog content while keeping tournament/competitive videos.
  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCjgzxIZmwSc-ksJRdGLIuMw",
    source: "Grant Hinds (YouTube)", platform: "YouTube",
    category: "video", region: "sa", games: ["general"],
    keywords: ESPORTS_KEYWORDS },

  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCpPpQ-TsXr3XTWmyr_mDo-w",
    source: "ArcadeZA (YouTube)", platform: "YouTube",
    category: "video", region: "sa", games: ["general"],
    keywords: ESPORTS_KEYWORDS },

  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCVlh1uuYKDvvHv6AgFZc-Bw",
    source: "Glitched (YouTube)", platform: "YouTube",
    category: "video", region: "sa", games: ["general"],
    keywords: ESPORTS_KEYWORDS },

  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCNleRx-SOy-qpTHohzsMS6Q",
    source: "NAG (YouTube)", platform: "YouTube",
    category: "video", region: "sa", games: ["general"],
    keywords: ESPORTS_KEYWORDS },

  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCTQJBEHfnRtTptn6CVs_dxw",
    source: "Esports Central (YouTube)", platform: "YouTube",
    category: "video", region: "sa", games: ["general"] },

  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCL3pNEgCMctHbqHHr2Ceq3A",
    source: "Spyro ZA (YouTube)", platform: "YouTube",
    category: "video", region: "sa", games: ["general"],
    keywords: ESPORTS_KEYWORDS },

  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCbyELsBEIp3BY5sIhD9chLg",
    source: "Chani ZA (YouTube)", platform: "YouTube",
    category: "video", region: "sa", games: ["general"],
    keywords: ESPORTS_KEYWORDS },

  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UC0zvD50_4-Jhgvad6kZoktA",
    source: "Luca Rakic (YouTube)", platform: "YouTube",
    category: "video", region: "sa", games: ["general"],
    keywords: ESPORTS_KEYWORDS },

  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCPZhHphk5dwumWfw2ehbOng",
    source: "ACGL (YouTube)", platform: "YouTube",
    category: "video", region: "africa", games: ["multiple"] },

  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCW583hog3QfQhVw_hhU-XIg",
    source: "Mettlestate (YouTube)", platform: "YouTube",
    category: "video", region: "sa", games: ["multiple"] },

  { url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCgaDrFvLQXyo7Joqu_XLEZg",
    source: "Carry1st (YouTube)", platform: "YouTube",
    category: "video", region: "africa", games: ["multiple"] },

  // ─── TELEGRAM (via self-hosted RSSHub — works from Vercel) ─────────────
  { url: `${RSSHUB}/telegram/channel/vpesports`,
    source: "VPEsports (Telegram)", platform: "Telegram",
    category: "news", region: "global", games: ["multiple"],
    keywords: AFRICA_KEYWORDS,
    note: "International esports news; Africa-keyword filtered" },

  { url: `${RSSHUB}/telegram/channel/motorsportsouthafrica`,
    source: "Motorsport South Africa (Telegram)", platform: "Telegram",
    category: "announcement", region: "sa", games: ["motorsport"],
    keywords: ESPORTS_KEYWORDS,
    note: "Real motorsport — only sim-racing-adjacent posts pass" },
];

module.exports = { SOURCES, AFRICA_KEYWORDS, ESPORTS_KEYWORDS, RSSHUB };
