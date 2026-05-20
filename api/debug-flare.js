// Temporary debug endpoint — hit /api/debug-flare to see the raw response
// the Vercel function gets from the FlareSolverr tunnel. Delete after Phase 3d.
module.exports = async (req, res) => {
  const url = process.env.FLARESOLVERR_URL;
  const cid = process.env.FLARESOLVERR_CLIENT_ID;
  const sec = process.env.FLARESOLVERR_CLIENT_SECRET;

  const envSummary = {
    FLARESOLVERR_URL_present: Boolean(url),
    FLARESOLVERR_URL_length: url ? url.length : 0,
    FLARESOLVERR_URL_value: url || null, // safe to show — it's a public URL
    FLARESOLVERR_CLIENT_ID_present: Boolean(cid),
    FLARESOLVERR_CLIENT_ID_length: cid ? cid.length : 0,
    FLARESOLVERR_CLIENT_ID_preview: cid ? cid.slice(0, 8) + "…" + cid.slice(-12) : null,
    FLARESOLVERR_CLIENT_SECRET_present: Boolean(sec),
    FLARESOLVERR_CLIENT_SECRET_length: sec ? sec.length : 0,
    FLARESOLVERR_CLIENT_SECRET_preview: sec ? sec.slice(0, 4) + "…" + sec.slice(-4) : null,
  };

  let probe = null;
  if (url && cid && sec) {
    try {
      const probeRes = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CF-Access-Client-Id": cid,
          "CF-Access-Client-Secret": sec,
        },
        body: JSON.stringify({
          cmd: "request.get",
          url: "https://example.com/",
          maxTimeout: 15000,
        }),
      });
      const text = await probeRes.text();
      probe = {
        status: probeRes.status,
        statusText: probeRes.statusText,
        contentType: probeRes.headers.get("content-type"),
        cfRay: probeRes.headers.get("cf-ray"),
        server: probeRes.headers.get("server"),
        location: probeRes.headers.get("location"),
        cfMitigated: probeRes.headers.get("cf-mitigated"),
        wwwAuthenticate: probeRes.headers.get("www-authenticate"),
        bodyHead: text.slice(0, 1500),
      };
    } catch (err) {
      probe = { error: String(err.message || err) };
    }
  }

  res.setHeader("Content-Type", "application/json");
  res.status(200).send(JSON.stringify({ env: envSummary, probe }, null, 2));
};
