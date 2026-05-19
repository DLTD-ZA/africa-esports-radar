# `flare/` — FlareSolverr + Cloudflare-Tunnel stack

Cloudflare-bypass scraper for aer-feeds, hosted on an Unraid server at home.
Exposed publicly at `https://flare.dkhome.web.za` via Cloudflare Tunnel, with
a Bearer-token check in front so casual scanners can't use it.

```
Vercel /api/feeds  ──HTTPS──→  flare.dkhome.web.za  ──tunnel──→  unraid
                                                                    │
                                                                    │ docker-compose
                                                                    ▼
                                  cloudflared  ──→  proxy(8080)  ──→  flaresolverr(8191)
```

## One-time setup

### 1. Create the Cloudflare Tunnel

1. Go to <https://one.dash.cloudflare.com> → **Networks → Tunnels → Create tunnel**.
2. Connector: **Cloudflared**. Name: `aer-flare`. Save.
3. Skip the "Install and run connector" page — `docker-compose.yml` handles
   that side. **Copy the token** shown on that page (long base64-ish string).
4. Next page → **Public Hostnames → Add a public hostname**:
   - Subdomain: `flare`
   - Domain: `dkhome.web.za`
   - Service type: `HTTP`
   - URL: `proxy:8080`
   - Save.

### 2. Drop the stack on Unraid

On the Unraid box:

```bash
# Put the contents of this folder under your appdata or compose dir
mkdir -p /mnt/user/appdata/aer-flare
cd /mnt/user/appdata/aer-flare
# Copy proxy.mjs, docker-compose.yml, .env.example into this directory.

# Create .env from the example
cp .env.example .env
nano .env
# AUTH_TOKEN: openssl rand -hex 32   (paste output)
# TUNNEL_TOKEN: paste the token from step 1.3

# Start it
docker compose up -d
docker compose logs -f
```

### 3. Verify

From anywhere on the public internet:

```bash
# Health check (no auth required)
curl https://flare.dkhome.web.za/healthz
# → {"ok":true}

# Bearer auth check
curl -i -H "Authorization: Bearer $AUTH_TOKEN" https://flare.dkhome.web.za/v1
# → 405 Method Not Allowed (POST-only)  ← good, auth passed

# End-to-end Cloudflare bypass test (Glitched is normally CF-403)
curl -sS -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cmd":"request.get","url":"https://glitched.online/feed/","maxTimeout":60000}' \
  https://flare.dkhome.web.za/v1 | jq '.status, .solution.status, .solution.url' \
  | head
# → "ok"
# → 200
# → "https://glitched.online/feed/"
```

If the third command returns `status: "ok"` with `solution.status: 200`,
FlareSolverr is bypassing Cloudflare successfully and we can wire aer-feeds
to it.

## Hand-off to me

Once verified, share:

- The `AUTH_TOKEN` (so I can set it as a Vercel env var on aer-feeds)
- Confirmation that `https://flare.dkhome.web.za` is reachable

I'll add `FLARESOLVERR_URL` and `FLARESOLVERR_TOKEN` env vars to the aer-feeds
Vercel project, modify `api/feeds.js` to route the 5 Cloudflare-blocked SA
news sources through the tunnel, and restore them in `api/sources.js`.

## Common issues

- **`cloudflared` keeps restarting**: the `TUNNEL_TOKEN` in `.env` is wrong
  or the tunnel was deleted in the Cloudflare dashboard. Recreate the tunnel
  and update `.env`.
- **`/healthz` returns Cloudflare 502/503**: the tunnel is up but the proxy
  container isn't reachable on the internal network. Check
  `docker compose ps` — all three services should be `running`.
- **FlareSolverr returns `status: error` with "Cloudflare detection"**: the
  upstream site has stronger anti-bot than FlareSolverr can handle. Try
  bumping `maxTimeout` to 90s in the request body.
- **Container eats 100% CPU**: FlareSolverr's Chromium is heavy. The Unraid
  box should have ≥1 CPU core and ≥1GB RAM free for the stack. If load is
  a concern, set the stack's Docker resource limits via Unraid's compose UI.

## Updating

```bash
cd /mnt/user/appdata/aer-flare
docker compose pull   # grab latest flaresolverr / cloudflared / node
docker compose up -d
```

Pulls happen on the host, so the stack stays current with FlareSolverr's
Cloudflare cat-and-mouse fixes (which they ship roughly monthly).
