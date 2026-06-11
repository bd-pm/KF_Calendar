// api/prefetch-goods.js
// Vercel Cron: 매일 KST 00:10 (UTC 15:10 전날) + KST 18:10 (UTC 09:10)
// 당일 공방 lineup 아티스트를 Supabase에서 읽고 goods + enrich API를 Vercel CDN에 워밍

const SUPA_URL = 'https://kzffotlfdtubkbxsjqiv.supabase.co';
const SUPA_KEY = process.env.SUPA_SERVICE_KEY || process.env.SUPA_ANON_KEY || 'sb_publishable__Qi94MjMjmOJRuotulyOZA_ftnVkHxL';
const SYNC_SECRET = process.env.SYNC_SECRET || '';
const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'https://kf-calendar-alpha.vercel.app';

function todayKst() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date()).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

async function getLineupArtistsForDate(dateStr) {
  const url = `${SUPA_URL}/rest/v1/music_show_lineups?select=groups,raw_title&broad_date=eq.${dateStr}&source=neq.date_rule`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
  const rows = await res.json();
  const artists = new Set();
  (Array.isArray(rows) ? rows : []).forEach(r => {
    (r.groups || []).forEach(g => { if (g) artists.add(g); });
    // raw_title에서 직접 아티스트명 추출 (세션 포함)
    const rt = String(r.raw_title || '');
    const after = rt.includes(' - ') ? rt.slice(rt.indexOf(' - ') + 3) : '';
    if (after) {
      after.split(/[,·×+\/]/).map(s => s.trim()).filter(Boolean).forEach(a => artists.add(a));
    }
  });
  return [...artists];
}

async function warmGoodsUrl(url) {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'kf-calendar-prefetch/1.0' },
      signal: AbortSignal.timeout(20000),
    });
    return r.ok;
  } catch { return false; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  // cron 또는 secret 인증
  const isCron = req.headers['x-vercel-cron'] === '1';
  const auth = (req.headers.authorization || '').replace('Bearer ', '');
  const qs = req.query.secret || '';
  if (!isCron && SYNC_SECRET && auth !== SYNC_SECRET && qs !== SYNC_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const dateStr = req.query.date || todayKst();
  const log = [];

  try {
    const artists = await getLineupArtistsForDate(dateStr);
    log.push(`date=${dateStr}, artists=${artists.length}: ${artists.join(', ')}`);

    if (!artists.length) {
      return res.status(200).json({ ok: true, date: dateStr, artists: 0, warmed: 0, log });
    }

    const EVENT_TYPES = ['gonbang', 'concert', 'fanmeeting'];
    const urlsToWarm = [];

    for (const artist of artists) {
      for (const type of EVENT_TYPES) {
        urlsToWarm.push(`${BASE_URL}/api/goods?artist=${encodeURIComponent(artist)}&n=60&type=${type}`);
      }
    }

    // goods URL 워밍 (병렬, 최대 10개씩)
    let warmed = 0;
    for (let i = 0; i < urlsToWarm.length; i += 10) {
      const batch = urlsToWarm.slice(i, i + 10);
      const results = await Promise.all(batch.map(u => warmGoodsUrl(u)));
      warmed += results.filter(Boolean).length;
    }

    // enrich 워밍: goods 결과에서 pid 수집 후 enrich 호출
    // 아티스트별 goods 응답에서 pid 목록을 모아 enrich 배치 워밍
    const allPids = [];
    for (const artist of artists) {
      try {
        const r = await fetch(`${BASE_URL}/api/goods?artist=${encodeURIComponent(artist)}&n=60&type=gonbang`, {
          headers: { 'User-Agent': 'kf-calendar-prefetch/1.0' },
          signal: AbortSignal.timeout(15000),
        });
        if (!r.ok) continue;
        const data = await r.json();
        (data.items || []).forEach(item => { if (item.id) allPids.push(String(item.id)); });
      } catch {}
    }

    // pid 중복 제거 후 20개씩 enrich 워밍
    const uniquePids = [...new Set(allPids)];
    let enrichWarmed = 0;
    for (let i = 0; i < uniquePids.length; i += 20) {
      const batch = uniquePids.slice(i, i + 20);
      const ok = await warmGoodsUrl(`${BASE_URL}/api/goods-enrich?pids=${batch.join(',')}`);
      if (ok) enrichWarmed += batch.length;
    }

    log.push(`goods warmed=${warmed}/${urlsToWarm.length}, enrich pids=${enrichWarmed}/${uniquePids.length}`);
    return res.status(200).json({ ok: true, date: dateStr, artists: artists.length, warmed, enrichPids: uniquePids.length, enrichWarmed, log });

  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message, log });
  }
};
