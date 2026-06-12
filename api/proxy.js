// /api/proxy.js
// Thin pass-through to API-Football. The real API key lives in Vercel env vars.
// The browser only ever calls /api/proxy?path=... — it never sees the key.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const path = req.query.path;
  if (!path) return res.status(400).json({ error: 'Missing path parameter' });

  // Whitelist — only allow the endpoints the dashboard actually needs
  const allowed = [
    /^\/players\?/,
    /^\/fixtures\/events\?/,
    /^\/fixtures\?/,
    /^\/standings\?/,
  ];
  if (!allowed.some(r => r.test(path))) {
    return res.status(403).json({ error: 'Endpoint not permitted' });
  }

  const url = `https://v3.football.api-sports.io${path}`;
  try {
    const upstream = await fetch(url, {
      headers: { 'x-apisports-key': apiKey },
    });
    const data = await upstream.json();
    // Cache successful responses for 60 s at the CDN edge
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Upstream error', detail: err.message });
  }
}
