// api/lineup-upsert.js
// admin.html 수동 입력 → service_role key로 music_show_lineups upsert
// POST /api/lineup-upsert  body: { show_name, broad_date, episode_number?, groups, raw_title }

const SUPA_URL         = 'https://kzffotlfdtubkbxsjqiv.supabase.co';
const SUPA_SERVICE_KEY = process.env.SUPA_SERVICE_KEY;
const SYNC_SECRET      = process.env.SYNC_SECRET || '';

const ARTIST_TO_GROUP = {
  BTS:'bts', '방탄소년단':'bts', SEVENTEEN:'seventeen', '세븐틴':'seventeen',
  ENHYPEN:'enhypen', '엔하이픈':'enhypen', aespa:'aespa', AESPA:'aespa',
  IVE:'ive', '아이브':'ive', 'LE SSERAFIM':'lesserafim', NewJeans:'newjeans',
  TWICE:'twice', BLACKPINK:'blackpink', EXO:'exo',
  NCT:'nct', 'NCT 127':'nct127', 'NCT DREAM':'nctdream', 'NCT WISH':'nctwish',
  ATEEZ:'ateez', 'Stray Kids':'straykids', 'STRAY KIDS':'straykids',
  TXT:'txt', 'TOMORROW X TOGETHER':'txt', ITZY:'itzy', NMIXX:'nmixx',
  PLAVE:'plave', ZEROBASEONE:'zerobaseone', ZB1:'zerobaseone',
  BOYNEXTDOOR:'boynextdoor', TWS:'tws', 'KISS OF LIFE':'kissoflife',
  QWER:'qwer', ILLIT:'illit', BABYMONSTER:'babymonster', '&TEAM':'andteam',
  INI:'ini', EVNNE:'evnne', CRAVITY:'cravity', 'THE BOYZ':'theboyz',
  ONEUS:'oneus', GOT7:'got7', DAY6:'day6', tripleS:'triples',
  XIKERS:'xikers', xikers:'xikers', NEXZ:'nexz', KATSEYE:'katseye',
  'Xdinary Heroes':'xdinaryheroes', 'ALPHA DRIVE ONE':'alphadriveone',
  '82MAJOR':'82major', Billlie:'billlie', YOUNITE:'younite',
  NAZE:'naze', UNCHILD:'unchild', CORTIS:'cortis', CrazAngel:'crazangel',
  KIIRAS:'kiiras', 'FLARE U':'flareu', 'H//PE Princess':'hpeprincess',
  'XngHan&Xoul':'xnghananxoul', 'Queenz Eye':'queenzeye',
  QUEENZEYE:'queenzeye', 'QUEENZ EYE':'queenzeye', '퀸즈아이':'queenzeye',
  XLOV:'xlov', XODIAC:'xodiac', IDID:'idid', MODYSSEY:'modyssey',
  Hearts2Hearts:'hearts2hearts', MEOVV:'meovv', KickFlip:'kickflip',
  LNGSHOT:'lngshot', AND2BLE:'and2ble', 'ANGEL NOISE':'angelnoise',
  'Angel Noise':'angelnoise', DAYOUNG:'dayoung', RESCENE:'rescene',
  ICHILLIN:'ichillin', "ICHILLIN'":'ichillin', cosmosy:'cosmosy',
  COSMOSY:'cosmosy', KEYVITUP:'keyvitup', 'YOUNG POSSE':'youngposse',
  'AMPERS&ONE':'ampersandone', 'B.BOYS':'bboys', LOVEONE:'loveone',
  YUHZ:'yuhz', '5TION':'5tion', NOWZ:'nowz', ifeye:'ifeye',
  'ORβIT':'orbit', ORBIT:'orbit', VVS:'vvs', 'Gavy NJ':'gavynj',
  Jadu:'jadu', XdinaryHeroes:'xdinaryheroes', 'CLOSE YOUR EYES':'closeyoureyes',
  moyo:'moyo', 'Cheon Do':'cheondo', 'Park Hye-kyung':'parkhyekyung',
  "ALL'N":'alln', 'Jay Chang':'jaychang', B1A4:'b1a4', RISABAE:'risabae',
  'Park Hyun-kyu':'parkhyunkyu', '박현규':'parkhyunkyu',
  'Yoon San-ha':'yoonsanha', '윤산하':'yoonsanha', ONEWE:'onewe', WONWE:'onewe',
  TAEYONG:'taeyong', TAEYANG:'taeyang', BIBI:'bibi', '비비':'bibi',
  'I.O.I':'ioi', IOI:'ioi', '아이오아이':'ioi',
};

function normalizeArtistToken(value) {
  return String(value || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^[\s"'‘’“”]+|[\s"'‘’“”]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function artistCandidates(value) {
  const raw = normalizeArtistToken(value);
  if (!raw) return [];
  const noParens = normalizeArtistToken(raw.replace(/\([^)]*\)/g, ''));
  const parens = [...raw.matchAll(/\(([^)]+)\)/g)].map(m => normalizeArtistToken(m[1]));
  return [raw, noParens, ...parens].filter(Boolean);
}

function splitArtistsFromRawTitle(rawTitle) {
  const raw = String(rawTitle || '');
  const dashIdx = raw.indexOf(' - ');
  const artistPart = dashIdx >= 0 ? raw.slice(dashIdx + 3) : raw;
  return artistPart
    .replace(/\s+등\s*$/, '')
    .split(/[\n,]+/)
    .flatMap(part => String(part).split(/\s+X\s+/i))
    .map(normalizeArtistToken)
    .filter(Boolean);
}

function mapGroupsFromRawTitle(rawTitle, providedGroups = []) {
  const groups = new Set(Array.isArray(providedGroups) ? providedGroups.filter(Boolean) : []);
  for (const token of splitArtistsFromRawTitle(rawTitle)) {
    for (const candidate of artistCandidates(token)) {
      const group = ARTIST_TO_GROUP[candidate] || ARTIST_TO_GROUP[candidate.toUpperCase()];
      if (group) {
        groups.add(group);
        break;
      }
    }
  }
  return [...groups];
}

function eventShowName(body) {
  const group = String(body.group_id || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'general';
  const type = String(body.type || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'event';
  const slug = String(body.name || 'manual').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32) || 'manual';
  return `event_${type}_${group}_${slug}`;
}

function eventRawTitle(body) {
  const parts = [body.name || 'Manual event'];
  if (body.venue) parts.push(`@ ${body.venue}`);
  if (body.source_url) parts.push(`| ${body.source_url}`);
  return `event - ${parts.join(' ')}`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'DELETE') {
    if (!SUPA_SERVICE_KEY) return res.status(500).json({ error: 'SUPA_SERVICE_KEY 없음' });
    // ?cleanup=1 : 오래된/잘못된 날짜 데이터 일괄 삭제
    if (req.query.cleanup === '1') {
      const auth = (req.headers.authorization || '').replace('Bearer ', '');
      const qs   = req.query.secret || '';
      if (SYNC_SECRET && auth !== SYNC_SECRET && qs !== SYNC_SECRET) {
        return res.status(401).json({ error: 'unauthorized' });
      }
      const hdrs = { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}`, Prefer: 'return=minimal' };
      const before = req.query.before || '2026-05-01';
      const [r1, r2] = await Promise.all([
        fetch(`${SUPA_URL}/rest/v1/music_show_lineups?broad_date=lt.${before}`, { method:'DELETE', headers: hdrs, signal: AbortSignal.timeout(30000) }),
        fetch(`${SUPA_URL}/rest/v1/music_show_lineups?broad_date=gt.2027-12-31`, { method:'DELETE', headers: hdrs, signal: AbortSignal.timeout(30000) }),
      ]);
      return res.status(200).json({ ok: true, old: r1.ok, future: r2.ok });
    }
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'id 필수' });
    const delRes = await fetch(`${SUPA_URL}/rest/v1/music_show_lineups?id=eq.${id}`, {
      method: 'DELETE',
      headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}`, Prefer: 'return=minimal' },
      signal: AbortSignal.timeout(10000),
    });
    if (!delRes.ok) return res.status(delRes.status).json({ error: await delRes.text() });
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'PATCH') {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'id 필수' });
    if (!SUPA_SERVICE_KEY) return res.status(500).json({ error: 'SUPA_SERVICE_KEY 없음' });
    const body = req.body;
    const raw_title = (body.raw_title && body.raw_title.includes(' - '))
      ? body.raw_title
      : `${body.show_name} - ${body.raw_title || ''}`;
    const groups = mapGroupsFromRawTitle(raw_title, body.groups);
    const patchRes = await fetch(`${SUPA_URL}/rest/v1/music_show_lineups?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPA_SERVICE_KEY,
        Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        show_name:      body.show_name,
        broad_date:     body.broad_date,
        episode_number: body.episode_number || null,
        groups,
        raw_title,
        source: 'manual',
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!patchRes.ok) return res.status(patchRes.status).json({ error: await patchRes.text() });
    return res.status(200).json({ ok: true, updated: true });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST/PATCH/DELETE only' });

  // 간단한 secret 체크 (SYNC_SECRET 미설정 시 열려있음)
  const auth = (req.headers.authorization || '').replace('Bearer ', '');
  const qs   = req.query.secret || '';
  if (SYNC_SECRET && auth !== SYNC_SECRET && qs !== SYNC_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (!SUPA_SERVICE_KEY) return res.status(500).json({ error: 'SUPA_SERVICE_KEY 없음' });

  const body = req.body;
  if (body?.kind === 'event') {
    const start = body.date_start || body.broad_date;
    if (!body.name || !start) {
      return res.status(400).json({ error: 'name, date_start 필수' });
    }
    const end = body.date_end || start;
    const [sy, sm, sd] = start.split('-').map(Number);
    const [ey, em, ed] = end.split('-').map(Number);
    const cur = new Date(sy, sm - 1, sd);
    const last = new Date(ey, em - 1, ed);
    if (!Number.isFinite(cur.getTime()) || !Number.isFinite(last.getTime()) || cur > last) {
      return res.status(400).json({ error: 'date_start/date_end invalid' });
    }
    const hdrs = {
      apikey: SUPA_SERVICE_KEY,
      Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    };
    const rows = [];
    while (cur <= last) {
      rows.push({
        show_name: eventShowName(body),
        broad_date: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`,
        episode_number: null,
        groups: body.group_id ? [body.group_id] : [],
        raw_title: eventRawTitle(body),
        source: 'manual_event',
      });
      cur.setDate(cur.getDate() + 1);
    }
    const eventRes = await fetch(`${SUPA_URL}/rest/v1/music_show_lineups`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify(rows),
      signal: AbortSignal.timeout(15000),
    });
    if (!eventRes.ok) return res.status(eventRes.status).json({ error: await eventRes.text() });
    return res.status(200).json({ ok: true, inserted: rows.length });
  }

  if (!body?.show_name || !body?.broad_date) {
    return res.status(400).json({ error: 'show_name, broad_date 필수' });
  }

  const row = {
    show_name:      body.show_name,
    broad_date:     body.broad_date,
    episode_number: body.episode_number || null,
    groups:         body.groups || [],
    // raw_title은 반드시 "show_name - artist1, artist2, ..." 포맷이어야 파싱됨
    raw_title: (body.raw_title && body.raw_title.includes(' - '))
      ? body.raw_title
      : `${body.show_name} - ${body.raw_title || ''}`,
    source:         'manual',
  };
  row.groups = mapGroupsFromRawTitle(row.raw_title, row.groups);

  const upRes = await fetch(`${SUPA_URL}/rest/v1/music_show_lineups`, {
    method: 'POST',
    headers: {
      apikey:          SUPA_SERVICE_KEY,
      Authorization:   `Bearer ${SUPA_SERVICE_KEY}`,
      'Content-Type':  'application/json',
      Prefer:          'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
    signal: AbortSignal.timeout(15000),
  });

  if (upRes.status === 409 || upRes.status === 400) {
    // 중복 시 PATCH로 업데이트
    const patchRes = await fetch(
      `${SUPA_URL}/rest/v1/music_show_lineups?show_name=eq.${encodeURIComponent(row.show_name)}&broad_date=eq.${row.broad_date}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPA_SERVICE_KEY,
          Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ groups: row.groups, raw_title: row.raw_title, episode_number: row.episode_number, source: 'manual' }),
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!patchRes.ok) return res.status(patchRes.status).json({ error: await patchRes.text() });
    return res.status(200).json({ ok: true, updated: true });
  }

  if (!upRes.ok) {
    const txt = await upRes.text();
    return res.status(upRes.status).json({ error: txt });
  }
  return res.status(200).json({ ok: true });
};
