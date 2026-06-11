// api/goods-enrich.js
// GET /api/goods-enrich?pids=123,456,789
// Returns { "123": "English product name", ... }
// Uses Bunjang Global batch API — single request for all pids, no per-page crawling

const GLOBAL_API = 'https://api.globalbunjang.com/api/global-pms/v1/products/get-summaries';

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const pids = (req.query.pids || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 100);

  if (!pids.length) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({});
  }

  try {
    const r = await fetch(GLOBAL_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'X-Client-ID': 'bun-web-mobile-global',
        'Origin': 'https://globalbunjang.com',
        'Referer': 'https://globalbunjang.com/',
      },
      body: JSON.stringify({ pids: pids.map(Number) }),
      signal: AbortSignal.timeout(5000),
    });

    if (!r.ok) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({});
    }

    const json = await r.json();
    const nameMap = {};
    for (const item of (json.data || [])) {
      const eng = item.nameEng;
      if (eng && eng.trim().length > 1) {
        nameMap[String(item.pid)] = eng.trim();
      }
    }

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    return res.status(200).json(nameMap);
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({});
  }
};
