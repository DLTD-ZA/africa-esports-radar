// Tiny auth-proxy: validates `Authorization: Bearer <AUTH_TOKEN>` then forwards
// the request to FlareSolverr. Pure Node stdlib — runs inside a stock
// node:20-alpine container with no `npm install` step.

import http from "node:http";

const PORT = parseInt(process.env.PORT || "8080", 10);
const UPSTREAM_HOST = process.env.UPSTREAM_HOST || "flaresolverr";
const UPSTREAM_PORT = parseInt(process.env.UPSTREAM_PORT || "8191", 10);
const TOKEN = process.env.AUTH_TOKEN;

if (!TOKEN) {
  console.error("[proxy] AUTH_TOKEN env var is required");
  process.exit(1);
}

function send(res, code, body) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  // Unauthenticated health endpoint for compose/Cloudflare health probes.
  if (req.url === "/healthz" && req.method === "GET") {
    return send(res, 200, { ok: true });
  }

  const auth = req.headers["authorization"] || "";
  if (auth !== `Bearer ${TOKEN}`) {
    return send(res, 401, { error: "unauthorized" });
  }

  const headers = { ...req.headers };
  delete headers["authorization"];
  delete headers["host"];

  const upstream = http.request(
    {
      hostname: UPSTREAM_HOST,
      port: UPSTREAM_PORT,
      path: req.url,
      method: req.method,
      headers,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    }
  );

  upstream.on("error", (err) => {
    console.error("[proxy] upstream error:", err.message);
    if (!res.headersSent) {
      send(res, 502, { error: "upstream_unavailable", detail: err.message });
    }
  });

  req.pipe(upstream);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    `[proxy] listening on :${PORT}  →  http://${UPSTREAM_HOST}:${UPSTREAM_PORT}`
  );
});
