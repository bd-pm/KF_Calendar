// api/sync-events.js
// External K-pop event crawler -> music_show_lineups manual_event-compatible rows.

const SUPA_URL = 'https://kzffotlfdtubkbxsjqiv.supabase.co';
const SUPA_SERVICE_KEY = process.env.SUPA_SERVICE_KEY;
const SYNC_SECRET = process.env.SYNC_SECRET || '';

const GROUP_SLUGS = {
  bts: 'BTS',
  seventeen: 'SEVENTEEN',
  enhypen: 'ENHYPEN',
  aespa: 'aespa',
  ive: 'IVE',
  lesserafim: 'LE SSERAFIM',
  newjeans: 'NewJeans',
  twice: 'TWICE',
  blackpink: 'BLACKPINK',
  nct: 'NCT',
  nctwish: 'NCT WISH',
  nctdream: 'NCT DREAM',
  nct127: 'NCT 127',
  riize: 'RIIZE',
  tws: 'TWS',
  day6: 'DAY6',
  zerobaseone: 'ZEROBASEONE',
  boynextdoor: 'BOYNEXTDOOR',
  babymonster: 'BABYMONSTER',
  txt: 'TOMORROW X TOGETHER',
  straykids: 'Stray Kids',
  ateez: 'ATEEZ',
  itzy: 'ITZY',
  nmixx: 'NMIXX',
  plave: 'PLAVE',
  kiss_of_life: 'KISS OF LIFE',
  kissolife: 'KISS OF LIFE',
  illit: 'ILLIT',
  treasure: 'TREASURE',
};

const SOURCE_URL = 'https://kpopping.com/calendar';

function dKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function todayKstDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date()).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
}

function thisWeekRange(base = todayKstDate()) {
  const from = new Date(base);
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
  const to = addDays(from, 6);
  return { from: dKey(from), to: dKey(to) };
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function inferType(text, fallback) {
  const s = String(text || '').toLowerCase();
  if (/\b(md|merch|merchandise|official goods|popup|pop-up)\b|굿즈|공식\s*md/i.test(text)) return 'md';
  if (/fan\s*meeting|fanmeet|fan\s*sign|fansign|meet\s*&\s*greet|팬미팅|팬싸|사인회/i.test(text)) return 'fanmeeting';
  if (/concert|tour|live|festival|showcase|fan\s*con|콘서트|투어|페스티벌|쇼케이스/i.test(text)) return 'concert';
  return fallback || 'event';
}

function normalizeGroupId(name) {
  const lower = String(name || '').toLowerCase();
  for (const [id, label] of Object.entries(GROUP_SLUGS)) {
    const variants = [label, label.replace(/\s+/g, ''), id.replace(/_/g, ' '), id.replace(/_/g, '')]
      .filter(Boolean)
      .map(v => String(v).toLowerCase());
    if (variants.some(v => {
      const i = lower.indexOf(v);
      if (i < 0) return false;
      const before = i === 0 ? '' : lower[i - 1];
      const after = lower[i + v.length] || '';
      return !/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after);
    })) return id;
  }
  return '';
}

function dateInRange(date, from, to) {
  return (!from || date >= from) && (!to || date <= to);
}

function eventShowName(evt) {
  const group = evt.group_id || 'general';
  const type = evt.type || 'event';
  const slug = String(evt.name || 'external')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 34) || 'external';
  return `event_${type}_${group}_${slug}`;
}

function eventRawTitle(evt) {
  const parts = [evt.name || 'External event'];
  if (evt.venue) parts.push(`@ ${evt.venue}`);
  if (evt.source_url) parts.push(`| ${evt.source_url}`);
  return `event - ${parts.join(' ')}`;
}

function parseKpoppingEvents(html, { from, to, sourceUrl }) {
  const events = [];
  const dayRe = /<div id="cal-day-(\d{4}-\d{2}-\d{2})">([\s\S]*?)(?=<div id="cal-day-\d{4}-\d{2}-\d{2}">|<\/main>|$)/g;
  let dayMatch;
  while ((dayMatch = dayRe.exec(html))) {
    const date = dayMatch[1];
    if (!dateInRange(date, from, to)) continue;
    const dayHtml = dayMatch[2];
    const anchorRe = /<a\b[^>]*href="(\/events\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    let anchorMatch;
    while ((anchorMatch = anchorRe.exec(dayHtml))) {
      const href = anchorMatch[1];
      const card = anchorMatch[2];
      const title = decodeEntities((card.match(/<p[^>]*font-weight:700[^>]*>([\s\S]*?)<\/p>/) || [])[1] || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!title) continue;
      const venue = decodeEntities((card.match(/<p class="text-sm text-gray-400 truncate">([\s\S]*?)<\/p>/) || [])[1] || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const badge = stripHtml((card.match(/<span class="text-xs font-bold">([\s\S]*?)<\/span>/) || [])[1] || '');
      const type = inferType(`${title} ${badge}`, badge && /fan/i.test(badge) ? 'fanmeeting' : 'concert');
      const groupId = normalizeGroupId(title) || 'general';
      events.push({
        type,
        group_id: groupId,
        name: title,
        venue,
        date_start: date,
        date_end: date,
        source_url: `https://kpopping.com${href}`,
      });
    }
  }
  const seen = new Set();
  return events.filter(evt => {
    const key = `${evt.type}:${evt.group_id}:${evt.date_start}:${evt.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function crawlKpopping({ from, to }) {
  const date = from || dKey(new Date());
  const url = `${SOURCE_URL}?date=${encodeURIComponent(date)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Kpopping calendar HTTP ${res.status}`);
  const html = await res.text();
  return parseKpoppingEvents(html, { from, to, sourceUrl: url });
}

async function upsertEvents(events) {
  const hdrs = {
    apikey: SUPA_SERVICE_KEY,
    Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal',
  };
  let ok = 0;
  for (const evt of events) {
    const row = {
      show_name: eventShowName(evt),
      broad_date: evt.date_start,
      episode_number: null,
      groups: evt.group_id ? [evt.group_id] : [],
      raw_title: eventRawTitle(evt),
      source: 'auto_event',
    };
    const existing = await fetch(
      `${SUPA_URL}/rest/v1/music_show_lineups?show_name=eq.${encodeURIComponent(row.show_name)}&broad_date=eq.${row.broad_date}&select=id,source`,
      { headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}` }, signal: AbortSignal.timeout(10000) }
    ).then(r => r.json()).catch(() => []);
    if (existing.length > 0 && existing[0].source === 'manual_event') {
      ok++;
      continue;
    }
    const res = existing.length > 0
      ? await fetch(`${SUPA_URL}/rest/v1/music_show_lineups?id=eq.${existing[0].id}`, {
          method: 'PATCH',
          headers: hdrs,
          body: JSON.stringify(row),
          signal: AbortSignal.timeout(10000),
        })
      : await fetch(`${SUPA_URL}/rest/v1/music_show_lineups`, {
          method: 'POST',
          headers: hdrs,
          body: JSON.stringify([row]),
          signal: AbortSignal.timeout(10000),
        });
    if (res.ok) ok++;
  }
  return ok;
}

async function deleteAutoEvents(from, to) {
  const url = `${SUPA_URL}/rest/v1/music_show_lineups?source=eq.auto_event&broad_date=gte.${from}&broad_date=lte.${to}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: SUPA_SERVICE_KEY,
      Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
      Prefer: 'return=minimal',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`auto_event cleanup HTTP ${res.status}`);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const auth = (req.headers.authorization || '').replace('Bearer ', '');
  const qs = req.query.secret || '';
  if (SYNC_SECRET && auth !== SYNC_SECRET && qs !== SYNC_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!SUPA_SERVICE_KEY) return res.status(500).json({ error: 'SUPA_SERVICE_KEY 없음' });
  try {
    const range = req.query.from && req.query.to
      ? { from: String(req.query.from), to: String(req.query.to) }
      : thisWeekRange();
    const events = await crawlKpopping(range);
    await deleteAutoEvents(range.from, range.to);
    const upserted = await upsertEvents(events);
    return res.status(200).json({ ok: true, source: 'kpopping', ...range, found: events.length, upserted, events });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
