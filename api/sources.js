// ============================================================================
// Africa Esports Radar — curated source list (v0.2.2)
// ============================================================================
//
// Trimmed to 19 high-confidence entries after live verification on v0.2.1.
//
// Removed (will be re-added via self-hosted RSSHub in Phase 3):
//
//   CLOUDFLARE-BLOCKED FROM VERCEL IPS (5):
//     - Glitched Africa, NAG, MyBroadband Gaming, Hypertext Gaming, HLTV
//     → Need RSSHub-with-Chromium routes, or fetch from a non-Vercel IP
//
//   WRONG URL / DEAD DOMAIN (4):
//     - SA Gamer (404 at /feed/), Esports Charts (404 at /news.rss),
//       Gaming and Esports SA (DNS NXDOMAIN), ACGL (no /rss.xml endpoint)
//     → These need RSSHub bridge or manual feed URL discovery
//
// ============================================================================

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

const SOURCES = [
  // ─── SA NEWS & MEDIA (WordPress /feed/ — should work after gzip fix) ───
  { url: "https://esportscentral.co.za/feed/",
    source: "Esports Central", platform: "Web",
    category: "news", region: "sa", games: ["general"] },

  { url: "https://stuff.co.za/category/gaming/feed/",
    source: "Stuff SA — Gaming", platform: "Web",
    category: "news", region: "sa", games: ["general"] },

  { url: "https://esportsafricanews.com/feed/",
    source: "Esports Africa News", platform: "Web",
    category: "news", region: "africa", games: ["general"] },

  { url: "https://techgirl.co.za/feed/",
    source: "Tech Girl Blog", platform: "Web",
    category: "news", region: "sa", games: ["general"] },

  { url: "https://gamesindustryafrica.com/feed/",
    source: "Games Industry Africa", platform: "Web",
    category: "news", region: "africa", games: ["general"] },

  { url: "https://vamers.com/feed/",
    source: "Vamers", platform: "Web",
    category: "news", region: "sa", games: ["general"] },

  // ─── INTERNATIONAL ESPORTS MEDIA (Africa-filtered) ─────────────────────
  { url: "https://dotesports.com/feed",
    source: "Dot Esports", platform: "Web",
    category: "news", region: "global", games: ["multiple"],
    keywords: AFRICA_KEYWORDS },

  { url: "https://esportsinsider.com/feed",
    source: "Esports Insider", platform: "Web",
    category: "news", region: "global", games: ["multiple"],
    keywords: AFRICA_KEYWORDS },

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
];

module.exports = { SOURCES, AFRICA_KEYWORDS };
