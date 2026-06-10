// api/goods-enrich.js
// GET /api/goods-enrich?pids=123,456,789
// Returns { "123": "English product name", ... }
// All product pages fetched in parallel with 5s timeout per page

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const pids = (req.query.pids || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 20);

  if (!pids.length) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({});
  }

  const nameMap = {};
  await Promise.all(
    pids.map(async pid => {
      try {
        const r = await fetch(`https://globalbunjang.com/product/${pid}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
          },
          signal: AbortSignal.timeout(5000),
        });
        if (!r.ok) return;
        const html = await r.text();
        // og:title — "Product name | Bunjang Global"
        const m = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/);
        if (m?.[1]) {
          const name = m[1]
            .replace(/\s*\|\s*Bunjang Global\s*$/i, '')
            .replace(/\s+/g, ' ')
            .trim();
          if (name.length > 1) nameMap[pid] = name;
        }
      } catch {}
    })
  );

  // Cache 24hr — product names rarely change
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
  return res.status(200).json(nameMap);
};
