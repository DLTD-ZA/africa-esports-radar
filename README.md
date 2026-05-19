# Africa Esports Radar — v0.2.2

## What changed (v0.2.1 → v0.2.2)

After live deployment of v0.2.1 we got real data. **10/28 sources worked** (all Reddit). All 18 Web sources failed.

### The root-cause bug

`rss-parser`'s internal HTTP layer uses axios, which **does not auto-decompress gzip responses**. The previous `feeds.js` sent `Accept-Encoding: gzip, deflate, br` in the headers, so servers sent compressed bodies — and `rss-parser` choked on the binary data with "Non-whitespace before first tag" errors. ~8 sources were affected.

**Fix:** swapped to **native `fetch()`** (Node 18+) for the HTTP call. Native fetch auto-decompresses gzip/deflate/br. Pass the decompressed string to `parser.parseString()`.

### Cleaned the source list

After the live verification, removed sources that were *not* fixable by the gzip patch:

| Source | Failure | Plan |
|---|---|---|
| Glitched Africa | Cloudflare 403 | Phase 3 RSSHub |
| NAG | Cloudflare 403 | Phase 3 RSSHub |
| MyBroadband Gaming | Cloudflare 403 | Phase 3 RSSHub |
| Hypertext Gaming | Cloudflare 403 | Phase 3 RSSHub |
| HLTV | Cloudflare 403 | Phase 3 RSSHub or HLTV API in Phase 4 |
| SA Gamer | 404 at /feed/ | Phase 3 — verify feed URL or RSSHub |
| Esports Charts | 404 at /news.rss | Phase 3 — verify feed URL |
| Gaming and Esports SA | DNS NXDOMAIN (dead) | Drop permanently |
| ACGL | No /rss.xml endpoint | Phase 3 RSSHub Twitter route |

### Current source count: 19

| Group | Count | Expected after gzip fix |
|---|---|---|
| SA WordPress news | 6 | 5–6 working |
| International (filtered) | 2 | 2 working |
| MSSA Blogspot | 1 | 1 working |
| Reddit | 10 | 10 working |
| **Total** | **19** | **~18 working** |

## Expected outcome of redeploy

- `sources_ok: 18/19` (or thereabouts) up from `10/28`
- Cleaner `source_status` — no noise from sources we know are blocked
- More items in the feed once Web sources start returning data

## Deploy

```bash
cd aer-v2.2
npm install
npx vercel --prod --yes
```

## Next: Phase 2 (RSSHub on Vercel)

Once this is deployed and confirmed working, fork [DIYgod/RSSHub](https://github.com/DIYgod/RSSHub) and deploy your own RSSHub instance to Vercel as a separate project. That's what brings back the Cloudflare-blocked sources, all YouTube channels, all X/Instagram/Telegram, etc.
