// api/sync-events.js
// External K-pop event crawler -> music_show_lineups manual_event-compatible rows.

const SUPA_URL = 'https://kzffotlfdtubkbxsjqiv.supabase.co';
const SUPA_SERVICE_KEY = process.env.SUPA_SERVICE_KEY;
const SYNC_SECRET = process.env.SYNC_SECRET || '';

const GROUP_SLUGS = {
  bts: 'BTS',
  seventeen: 'SEVENTEEN',
  dxs: 'DxS',
  bss: 'BSS',
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
const TIMESPREAD_SOURCES = [
  { group_id: 'illit', url: 'https://www.timespread.co.kr/subscription-calendar/%EC%95%84%EC%9D%BC%EB%A6%BF' },
  { group_id: 'seventeen', url: 'https://www.timespread.co.kr/subscription-calendar/%EC%84%B8%EB%B8%90%ED%8B%B4' },
  { group_id: 'ive', url: 'https://www.timespread.co.kr/subscription-calendar/%EC%95%84%EC%9D%B4%EB%B8%8C' },
  { group_id: 'bts', url: 'https://www.timespread.co.kr/subscription-calendar/%EB%B0%A9%ED%83%84%EC%86%8C%EB%85%84%EB%8B%A8' },
  { group_id: 'twice', url: 'https://www.timespread.co.kr/subscription-calendar/%ED%8A%B8%EC%99%80%EC%9D%B4%EC%8A%A4' },
  { group_id: 'riize', url: 'https://www.timespread.co.kr/subscription-calendar/%EB%9D%BC%EC%9D%B4%EC%A6%88' },
  { group_id: 'babymonster', url: 'https://www.timespread.co.kr/subscription-calendar/%EB%B2%A0%EC%9D%B4%EB%B9%84%EB%AA%AC%EC%8A%A4%ED%84%B0' },
];

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
  // MD 카테고리 제거 — md 타입 이벤트는 크롤링하지 않음
  if (/fan\s*meeting|fanmeet|fan\s*sign|fansign|meet\s*&\s*greet|팬미팅|팬싸|사인회/i.test(text)) return 'fanmeeting';
  if (/concert|tour|live|festival|showcase|on\s*stage|fan\s*con|콘서트|투어|페스티벌|쇼케이스|공연|행사/i.test(text)) return 'concert';
  return fallback || 'event';
}

// 한국어 도시명 → 영어
const CITY_KO_EN = {
  '서울': 'Seoul', '인천': 'Incheon', '부산': 'Busan', '대구': 'Daegu',
  '대전': 'Daejeon', '광주': 'Gwangju', '수원': 'Suwon', '고양': 'Goyang',
  '성남': 'Seongnam', '울산': 'Ulsan', '제주': 'Jeju',
  '도쿄': 'Tokyo', '오사카': 'Osaka', '나고야': 'Nagoya', '요코하마': 'Yokohama',
  '후쿠오카': 'Fukuoka', '삿포로': 'Sapporo', '고베': 'Kobe', '교토': 'Kyoto',
  '치바': 'Chiba', '아이치': 'Aichi', '효고': 'Hyogo',
  '방콕': 'Bangkok', '싱가포르': 'Singapore', '마닐라': 'Manila',
  '자카르타': 'Jakarta', '쿠알라룸푸르': 'Kuala Lumpur', '호치민': 'Ho Chi Minh City',
  '홍콩': 'Hong Kong', '마카오': 'Macau', '타이베이': 'Taipei',
  '가오슝': 'Kaohsiung', '상하이': 'Shanghai', '베이징': 'Beijing',
  '런던': 'London', '파리': 'Paris', '베를린': 'Berlin', '암스테르담': 'Amsterdam',
  '마드리드': 'Madrid', '바르셀로나': 'Barcelona', '로마': 'Rome',
  '브뤼셀': 'Brussels', '뮌헨': 'Munich', '취리히': 'Zurich',
  '뉴욕': 'New York', '로스앤젤레스': 'Los Angeles', '시카고': 'Chicago',
  '댈러스': 'Dallas', '휴스턴': 'Houston', '시애틀': 'Seattle',
  '밴쿠버': 'Vancouver', '토론토': 'Toronto', '멕시코시티': 'Mexico City',
  '상파울루': 'São Paulo', '부에노스아이레스': 'Buenos Aires',
  '시드니': 'Sydney', '멜버른': 'Melbourne', '오클랜드': 'Auckland',
  '두바이': 'Dubai', '방갈로르': 'Bangalore',
};

// 한국어 예매/공지 suffix → 영어
const SUFFIX_KO_EN = [
  [/\s*멤버십\s*사전\s*인증$/i, ' - Membership Pre-Verification'],
  [/\s*멤버십\s*선예매$/i, ' - Membership Presale'],
  [/\s*멤버십\s*선예매\s*신청$/i, ' - Membership Presale Application'],
  [/\s*일반\s*예매\s*오픈$/i, ' - General Sale Open'],
  [/\s*일반\s*예매$/i, ' - General Sale'],
  [/\s*일반예매$/i, ' - General Sale'],
  [/\s*얼리버드$/i, ' - Early Bird'],
  [/\s*휠체어석\s*예매$/i, ' - Wheelchair Seat Booking'],
  [/\s*당락\s*발표[^a-z]*입금\s*기간$/i, ' - Result Announcement & Payment'],
  [/\s*선예매$/i, ' - Presale'],
  [/\s*예매$/i, ' - Ticketing'],
  [/\s*스폰서사[^)]*\)\s*선예매$/i, ' - Sponsor Presale'],
];

function translateEventName(name) {
  let s = String(name || '');

  // "- 도시명 suffix" 패턴 처리 (도시+suffix 함께)
  s = s.replace(/[-–]\s*([가-힣]+)\s*(멤버십\s*사전\s*인증|멤버십\s*선예매\s*신청|멤버십\s*선예매|일반\s*예매\s*오픈|일반\s*예매|일반예매|얼리버드|휠체어석\s*예매|당락\s*발표[^가-힣]*입금\s*기간|선예매|예매)?(\s*\(\d[^)]*\))?$/g,
    (match, city, suffix, date) => {
      const en = CITY_KO_EN[city];
      if (!en) return match;
      const suffixMap = {
        '멤버십 사전 인증': ' - Membership Pre-Verification',
        '멤버십 선예매 신청': ' - Membership Presale Application',
        '멤버십 선예매': ' - Membership Presale',
        '일반 예매 오픈': ' - General Sale Open',
        '일반 예매': ' - General Sale',
        '일반예매': ' - General Sale',
        '얼리버드': ' - Early Bird',
        '휠체어석 예매': ' - Wheelchair Seat Booking',
        '선예매': ' - Presale',
        '예매': ' - Ticketing',
      };
      const suffixKey = suffix ? suffix.replace(/\s+/g, ' ').trim() : '';
      // 당락 발표 패턴은 키가 가변적이므로 별도 처리
      if (suffixKey && /당락\s*발표/.test(suffixKey)) return `- ${en}${date ? ` ${date.trim()}` : ''} - Result Announcement & Payment`;
      const enSuffix = suffixKey ? (suffixMap[suffixKey] || ` - ${suffixKey}`) : '';
      return `- ${en}${date ? ` ${date.trim()}` : ''}${enSuffix}`;
    }
  );

  // suffix만 있는 경우 (도시명 없이)
  for (const [pattern, replacement] of SUFFIX_KO_EN) {
    if (pattern.test(s)) {
      s = s.replace(pattern, replacement);
      break;
    }
  }

  return s.trim();
}

function shouldKeepTimespreadEvent(name) {
  if (/방송|생일|기념일|컴백|티저|뮤비|발매|음원|챌린지|당첨자\s*발표/i.test(name)) return false;
  return /concert|tour|live|festival|showcase|on\s*stage|fan\s*meeting|fanmeet|fansign|fan\s*sign|콘서트|투어|페스티벌|쇼케이스|팬미팅|팬싸|팬사인|사인회|공연|행사/i.test(name);
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

function parseTimespreadEvents(html, { from, to, group_id }) {
  const events = [];
  const seen = new Set();
  const itemRe = /"name":"([^"]+)","url":"([^"]+)"/g;
  let m;
  while ((m = itemRe.exec(html))) {
    const rawName = decodeEntities(m[1].replace(/\\u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))));
    if (!shouldKeepTimespreadEvent(rawName)) continue;
    const name = translateEventName(rawName);
    const sourceUrl = decodeEntities(m[2].replace(/\\\//g, '/'));
    const dateMatch = sourceUrl.match(/(20\d{2})-(\d{2})-(\d{2})/) || rawName.match(/(20\d{2})[.-](\d{2})[.-](\d{2})/);
    if (!dateMatch) continue;
    const date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    if (!dateInRange(date, from, to)) continue;
    const type = inferType(rawName, 'fanmeeting');
    const key = `${date}:${name}:${sourceUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    events.push({
      type,
      group_id,
      name,
      venue: '',
      date_start: date,
      date_end: date,
      source_url: sourceUrl,
    });
  }
  return events;
}

async function crawlTimespread(range) {
  const all = [];
  for (const source of TIMESPREAD_SOURCES) {
    const res = await fetch(source.url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/html' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) continue;
    const html = await res.text();
    all.push(...parseTimespreadEvents(html, { ...range, group_id: source.group_id }));
  }
  return all;
}

async function crawlExternalEvents(range) {
  if (range.source === 'timespread') {
    const events = await crawlTimespread(range);
    return { source: 'timespread', events };
  }
  try {
    const events = await crawlKpopping(range);
    return { source: 'kpopping', events };
  } catch (err) {
    const events = await crawlTimespread(range);
    return { source: `timespread fallback (${err.message})`, events };
  }
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
    if (req.query.source) range.source = String(req.query.source);
    const { source, events } = await crawlExternalEvents(range);
    await deleteAutoEvents(range.from, range.to);
    const upserted = await upsertEvents(events);
    return res.status(200).json({ ok: true, source, ...range, found: events.length, upserted, events });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
};
