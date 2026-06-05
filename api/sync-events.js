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

const EVENT_TYPES = [
  { type: 'concert', url: 'https://kpopcalendar.com/?type=concert' },
  { type: 'fanmeeting', url: 'https://kpopcalendar.com/?type=fanmeeting' },
];

function dKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function escRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
    if (variants.some(v => lower.includes(v))) return id;
  }
  return '';
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

function parseKpopCalendarEvents(html, fallbackType, sourceUrl) {
  const text = stripHtml(html);
  const events = [];
  const now = new Date();
  const maxDate = addDays(now, 120);
  const dateRe = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},\s+2026\b|\b2026[-.]\d{1,2}[-.]\d{1,2}\b/gi;
  let m;
  while ((m = dateRe.exec(text))) {
    const rawDate = m[0];
    const d = new Date(rawDate.replace(/\./g, '-'));
    if (!Number.isFinite(d.getTime()) || d < addDays(now, -7) || d > maxDate) continue;
    const start = Math.max(0, m.index - 220);
    const end = Math.min(text.length, m.index + 260);
    const windowText = text.slice(start, end);
    const groupId = normalizeGroupId(windowText);
    if (!groupId) continue;
    const groupLabel = GROUP_SLUGS[groupId] || groupId;
    const type = inferType(windowText, fallbackType);
    const titleMatch = windowText.match(new RegExp(`${escRegExp(groupLabel)}[^.]{0,120}`, 'i'));
    const name = (titleMatch ? titleMatch[0] : `${groupLabel} ${type}`)
      .replace(/\s+/g, ' ')
      .replace(/\bView details\b.*$/i, '')
      .trim();
    events.push({
      type,
      group_id: groupId,
      name,
      venue: '',
      date_start: dKey(d),
      date_end: dKey(d),
      source_url: sourceUrl,
    });
  }
  const seen = new Set();
  return events.filter(evt => {
    const key = `${evt.type}:${evt.group_id}:${evt.date_start}:${evt.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function crawlKpopCalendar() {
  const all = [];
  for (const source of EVENT_TYPES) {
    const res = await fetch(source.url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Kpopcalendar ${source.type} HTTP ${res.status}`);
    const html = await res.text();
    all.push(...parseKpopCalendarEvents(html, source.type, source.url));
  }
  return all;
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

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const auth = (req.headers.authorization || '').replace('Bearer ', '');
  const qs = req.query.secret || '';
  if (SYNC_SECRET && auth !== SYNC_SECRET && qs !== SYNC_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!SUPA_SERVICE_KEY) return res.status(500).json({ error: 'SUPA_SERVICE_KEY 없음' });
  try {
    const events = await crawlKpopCalendar();
    const upserted = await upsertEvents(events);
    return res.status(200).json({ ok: true, source: 'kpopcalendar', found: events.length, upserted, events });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
