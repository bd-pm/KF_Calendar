// api/sync-naver.js
// 전체 5개 음악방송 — 공식 페이지/Naver 회차정보 탭 크롤링 → Supabase upsert
// Vercel Cron: 0 0 * * * (매일 09:00 KST)

const { resolveEnNames, normalizeArtistName } = require('./artist-en-name');
const { getSpecialLineupRow } = require('./show-status');

const SUPA_URL         = 'https://kzffotlfdtubkbxsjqiv.supabase.co';
const SUPA_SERVICE_KEY = process.env.SUPA_SERVICE_KEY;
const SYNC_SECRET      = process.env.SYNC_SECRET || '';
const TG_BOT_TOKEN     = process.env.TG_BOT_TOKEN || '';
const TG_CHAT_ID       = process.env.TG_CHAT_ID || '';

// os: Naver 내부 프로그램 ID (회차정보 탭 URL에서 확인)
// descFormat: 'dt_dd' = <dt>출연</dt><dd>..., 'span_desc' = <span class="desc _text">...
const SHOWS_NAVER = [
  { show_name: 'music_bank',    dayOfWeek: 5, label: '뮤직뱅크',    navOs: '659774', navQuery: '뮤직뱅크' },
  { show_name: 'show_champion', dayOfWeek: 3, label: '쇼챔피언',    navOs: '669613', navQuery: '쇼 챔피언' },
  { show_name: 'music_core',    dayOfWeek: 6, label: '음악중심',    navOs: '658837', navQuery: '음악중심' },
  { show_name: 'mcountdown',    dayOfWeek: 4, label: '엠카운트다운', navOs: '659252', navQuery: '엠카운트다운' },
  { show_name: 'inkigayo',      dayOfWeek: 0, label: '인기가요',    navOs: '658960', navQuery: '인기가요', descFormat: 'span_desc' },
];

const ARTIST_TO_GROUP = {
  'BTS':'bts','방탄소년단':'bts','RM':'bts','Jin':'bts','진':'bts',
  'SUGA':'bts','j-hope':'bts','j-Hope':'bts',
  'Jimin':'bts','지민':'bts','V':'bts','뷔':'bts',
  'Jung Kook':'bts','Jungkook':'bts','정국':'bts',
  'SEVENTEEN':'seventeen','세븐틴':'seventeen',
  'ENHYPEN':'enhypen','엔하이픈':'enhypen',
  'aespa':'aespa','AESPA':'aespa','에스파':'aespa',
  'IVE':'ive','아이브':'ive',
  'LE SSERAFIM':'lesserafim','르세라핌':'lesserafim',
  'NewJeans':'newjeans','NEWJEANS':'newjeans','뉴진스':'newjeans',
  'TWICE':'twice','트와이스':'twice',
  'BLACKPINK':'blackpink','블랙핑크':'blackpink',
  'EXO':'exo',
  'NCT':'nct','NCT 127':'nct127','NCT DREAM':'nctdream','NCT WISH':'nctwish',
  'WayV':'wayv',
  'SUPER JUNIOR':'superjunior','슈퍼주니어':'superjunior',
  'SHINee':'shinee','샤이니':'shinee',
  'MONSTA X':'monstax',
  'ASTRO':'astro',
  'ATEEZ':'ateez','에이티즈':'ateez',
  'Stray Kids':'straykids','STRAY KIDS':'straykids',
  'TXT':'txt','TOMORROW X TOGETHER':'txt','투모로우바이투게더':'txt',
  'BTOB':'btob','INFINITE':'infinite','인피니트':'infinite',
  '2PM':'2pm','GOT7':'got7','DAY6':'day6',
  'ITZY':'itzy','있지':'itzy','NMIXX':'nmixx',
  'tripleS':'triples',
  'PLAVE':'plave','플레이브':'plave',
  'ZEROBASEONE':'zerobaseone','ZB1':'zerobaseone','제로베이스원':'zerobaseone',
  'BOYNEXTDOOR':'boynextdoor','보이넥스트도어':'boynextdoor',
  'TWS':'tws','투어스':'tws',
  'KISS OF LIFE':'kissoflife',
  'QWER':'qwer',
  'ILLIT':'illit','아일릿':'illit',
  'BABYMONSTER':'babymonster','베이비몬스터':'babymonster',
  '&TEAM':'andteam','앤팀':'andteam',
  'INI':'ini',
  'EVNNE':'evnne','이븐':'evnne','EVNNE(이븐)':'evnne',
  'CRAVITY':'cravity','크래비티':'cravity',
  'XIKERS':'xikers','xikers':'xikers','자이커스':'xikers',
  'DRIPPIN':'drippin','VERIVERY':'verivery',
  'THE BOYZ':'theboyz','더보이즈':'theboyz',
  'ONEUS':'oneus','원어스':'oneus',
  'NEXZ':'nexz','넥스지':'nexz',
  'KATSEYE':'katseye',
  'Xdinary Heroes':'xdinaryheroes','엑스디너리히어로즈':'xdinaryheroes',
  'ALPHA DRIVE ONE':'alphadriveone',
  'Kep1er':'kep1er','케플러':'kep1er',
  '82MAJOR':'82major',
  'AMPERS&ONE':'ampersandone','앰퍼샌드원':'ampersandone',
  'SOOJIN':'soojin','수진':'soojin',
  'PENTAGON':'pentagon','펜타곤':'pentagon',
  '(G)I-DLE':'gidle','여자아이들':'gidle',
  'MAMAMOO':'mamamoo','마마무':'mamamoo',
  'Red Velvet':'redvelvet','레드벨벳':'redvelvet',
  'TREASURE':'treasure',
  'YOUNG POSSE':'youngposse','영파씨':'youngposse',
  'DAYOUNG':'dayoung','다영':'dayoung',
  'RESCENE':'rescene','리센느':'rescene',
  'ICHILLIN':'ichillin','ICHILLIN\'':'ichillin','아이칠린':'ichillin',
  'cosmosy':'cosmosy','COSMOSY':'cosmosy','코스모시':'cosmosy',
  'KEYVITUP':'keyvitup',
  'ANGEL NOISE':'angelnoise','엔젤노이즈':'angelnoise',
  'HWASA':'hwasa','화사':'hwasa',
  'ORBIT':'orbit','오르빗':'orbit',
  'B1A4':'b1a4',
  'AB6IX':'ab6ix',
  'P1Harmony':'p1harmony','P1HARMONY':'p1harmony',
  'EVERGLOW':'everglow',
  'H1-KEY':'h1key','하이키':'h1key',
  'KiiiKiii':'kiikikii',
  'Billlie':'billlie','빌리':'billlie',
  '82MAJOR':'82major',
  'YOUNITE':'younite','유나이트':'younite',
  'NAZE':'naze','네이즈':'naze',
  'UNCHILD':'unchild',
  'CORTIS':'cortis',
  'Queenz Eye':'queenzeye','QUEENZ EYE':'queenzeye','퀸즈아이':'queenzeye',
  'XLOV':'xlov',
  'XODIAC':'xodiac','소디엑':'xodiac',
  'IDID':'idid','아이딧':'idid',
  'MODYSSEY':'modyssey','모디세이':'modyssey',
  'Hearts2Hearts':'hearts2hearts',
  'MEOVV':'meovv',
  'KickFlip':'kickflip','킥플립':'kickflip',
  'LNGSHOT':'lngshot',
  'ALPHA DRIVE ONE':'alphadriveone','알파드라이브원':'alphadriveone',
  'AND2BLE':'and2ble','앤더블':'and2ble',
  'HEART OF WOMAN':'heartofwoman',
  '따따블':'ddaddable',
  '박현규':'parkhyunkyu',
  '윤산하':'yoonsanha',
  'ONEWE':'onewe','원위':'onewe',
  'hrtz.wav':'hrtswav','하츠웨이브':'hrtswav',
  'CrazAngel':'crazangel','크레이즈엔젤':'crazangel',
  'KIIRAS':'kiiras',
  'FLARE U':'flareu','플레어 유':'flareu',
  'H//PE Princess':'hpeprincess',
  'XngHan&Xoul':'xnghananxoul',
  '자두':'jadu',
  '차동협':'chadonghyup',
};

function mapArtists(names) {
  const ids = new Set();
  const keys = Object.keys(ARTIST_TO_GROUP).sort((a, b) => b.length - a.length);
  for (const n of names) {
    const g = ARTIST_TO_GROUP[n];
    if (g) { ids.add(g); continue; }
    for (const k of keys) {
      if (n.includes(k)) { ids.add(ARTIST_TO_GROUP[k]); break; }
    }
  }
  return [...ids];
}

function dKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function addDays(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function todayKstKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function maxDateKey(a, b) {
  return a > b ? a : b;
}

function isSpecialCancelled(showName, broadDate) {
  return getSpecialLineupRow(showName, broadDate)?.source === 'cancelled';
}

async function deleteRowsByDates(showName, dates) {
  if (!dates.length) return 0;
  const url = new URL(`${SUPA_URL}/rest/v1/music_show_lineups`);
  url.searchParams.set('show_name', `eq.${showName}`);
  url.searchParams.set('broad_date', `in.(${dates.join(',')})`);
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      apikey: SUPA_SERVICE_KEY,
      Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Supabase delete HTTP ${res.status}`);
  return 1;
}

function datesForDay(dayOfWeek, sinceDate, cutoffDate) {
  // 오늘부터 다음 2주만 뼈대 생성 (불필요한 과거/먼 미래 row 방지)
  const today = new Date(); today.setHours(0,0,0,0);
  const startKey = maxDateKey(cutoffDate || todayKstKey(), sinceDate || '');
  const start = new Date(startKey);
  start.setHours(0,0,0,0);
  const end = new Date(today);
  end.setDate(today.getDate() + 14);
  const dates = [];
  const cur = new Date(start);
  while (cur <= end) {
    if (cur.getDay() === dayOfWeek) dates.push(dKey(new Date(cur)));
    cur.setDate(cur.getDate()+1);
  }
  return dates;
}

function decodeHtml(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function textFromHtml(html) {
  return decodeHtml(html)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function stripHtmlText(html) {
  return decodeHtml(String(html || ''))
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
}

function cleanShowChampionArtistName(name) {
  return String(name || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeShowChampionArtistToken(name) {
  return String(name || '')
    .replace(/^[\s"'‘’“”]+|[\s"'‘’“”]+$/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitShowChampionArtistNames(name) {
  const raw = cleanShowChampionArtistName(name);
  if (!raw) return [];
  const out = [];
  const clean = value => {
    const cleaned = normalizeShowChampionArtistToken(value);
    return cleaned && cleaned.length > 1 && cleaned.length < 80 ? cleaned : null;
  };
  for (const part of raw.split(/\s+X\s+/i)) {
    const parens = [...part.matchAll(/\(([^)]+)\)/g)].map(m => clean(m[1])).filter(Boolean);
    const outside = clean(part.replace(/\([^)]*\)/g, '').trim());
    if (outside && ARTIST_TO_GROUP[outside]) {
      out.push(outside);
      continue;
    }
    const mappedParen = parens.find(token => ARTIST_TO_GROUP[token]);
    if (mappedParen) {
      out.push(mappedParen);
      continue;
    }
    if (outside) out.push(outside);
    else out.push(...parens);
  }
  return out;
}

function extractShowChampionQuotedSegments(text) {
  const segments = [];
  let quote = null;
  let start = -1;
  let parenDepth = 0;
  const quoteChars = new Set(["'", '‘', '’']);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') parenDepth++;
    else if (ch === ')' && parenDepth > 0) parenDepth--;
    if (!quote) {
      if (quoteChars.has(ch)) {
        quote = ch;
        start = i + 1;
      }
      continue;
    }
    if (quoteChars.has(ch) && parenDepth === 0) {
      const segment = text.slice(start, i).trim();
      if (segment) segments.push(segment);
      quote = null;
      start = -1;
    }
  }
  return segments;
}

function isShowChampionIntroArtistName(name) {
  if (!name || name.length < 2 || name.length > 80) return false;
  if (ARTIST_TO_GROUP[name]) return true;
  if (/[가-힣]/.test(name)) return true;
  if (/[A-Z]/.test(name)) return true;
  return false;
}

async function fetchShowChampionOfficialRows({ cutoffDate, backfill }) {
  const [cy, cm, cd] = cutoffDate.split('-').map(Number);
  const recentCutoff = dKey(addDays(new Date(cy, cm - 1, cd), -7));
  const listUrl = 'https://www.mbcplus.com/web/program/contentList.do?searchCondition=001005&programMenuSeq=220&programInfoSeq=67';
  const res = await fetch(listUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`MBC PLUS HTTP ${res.status}`);
  const html = await res.text();
  const rows = [];
  const rowRe = /fnGetForm\('220','001005',\s*'(\d+)'\)[\s\S]*?>(쇼챔피언[^<]+)<[\s\S]*?<td>(\d{4}-\d{2}-\d{2})<\/td>/g;
  let match;
  while ((match = rowRe.exec(html))) {
    const seq = match[1];
    const title = stripHtmlText(match[2]);
    const postedAt = match[3];
    const md = title.match(/\((\d{2})(\d{2})\)/);
    const year = Number(postedAt.slice(0, 4));
    const broadDate = md ? `${year}-${md[1]}-${md[2]}` : postedAt;
    if (!backfill && broadDate < recentCutoff) continue;

    if (/결방|휴방/i.test(title)) {
      rows.push({
        show_name: 'show_champion',
        broad_date: broadDate,
        groups: [],
        raw_title: title,
        episode_number: Number((title.match(/(\d+)회/) || [])[1]) || null,
        source: 'cancelled',
      });
      continue;
    }

    if (!/생방송\s*출연진/.test(title)) continue;

    const iframeUrl = `https://www.mbcplus.com/web/program/iframeContent.do?seq=${seq}&programMenuSeq=220`;
    const detailRes = await fetch(iframeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!detailRes.ok) continue;
    const text = stripHtmlText(await detailRes.text())
      .replace(/[<>]+/g, '\n')
      .replace(/\s*\n\s*/g, '\n');
    const lineupMatch = text.match(/&\s*출연진\s*&\s*([\s\S]*?)(?:\n\s*\n|$)/);
    if (!lineupMatch) continue;

    const introText = text.slice(0, lineupMatch.index);
    const introPerformers = extractShowChampionQuotedSegments(introText)
      .flatMap(splitShowChampionArtistNames)
      .filter(isShowChampionIntroArtistName);
    const listedPerformers = lineupMatch[1]
      .split('/')
      .flatMap(splitShowChampionArtistNames)
      .filter(name => name.length > 1 && name.length < 80);
    const seenPerformers = new Set();
    const performers = [...introPerformers, ...listedPerformers].filter(name => {
      const key = name.toLowerCase();
      if (seenPerformers.has(key)) return false;
      seenPerformers.add(key);
      return true;
    });
    if (performers.length === 0) continue;
    rows.push({
      show_name: 'show_champion',
      broad_date: broadDate,
      groups: mapArtists(performers),
      raw_title: `show_champion - ${performers.join(', ')}`,
      episode_number: Number((title.match(/(\d+)회/) || [])[1]) || null,
      source: 'mbcplus',
    });
  }
  return rows;
}

function extractSbsVodId(section) {
  const decoded = decodeHtml(section).replace(/\\\//g, '/');
  const patterns = [
    /programs\.sbs\.co\.kr\/programTemplate\/amp\/vod\/gayo\/(\d{8,})/,
    /programs\.sbs\.co\.kr\/enter\/gayo\/vod\/54767\/(\d{8,})/,
    /\/programTemplate\/amp\/vod\/gayo\/(\d{8,})/,
    /\/enter\/gayo\/vod\/54767\/(\d{8,})/,
  ];
  for (const pattern of patterns) {
    const m = decoded.match(pattern);
    if (m) return m[1];
  }
  return null;
}

function parseSbsInkigayoPerformers(html, episodeNo) {
  const text = textFromHtml(html);
  const escapedNo = String(episodeNo || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`#\\s*${escapedNo}\\s*회\\s*인기가요\\s*출연자\\s*#([\\s\\S]*?)(?:\\*\\s*출연자는|$)`),
    /#\s*\d+\s*회\s*인기가요\s*출연자\s*#([\s\S]*?)(?:\*\s*출연자는|$)/,
  ];
  const m = patterns.map(p => text.match(p)).find(Boolean);
  if (!m) return [];

  return m[1]
    .split(',')
    .map(p => p.replace(/\*.*$/, '').replace(/\\[rn]/g, ' ').replace(/[\r\n]+/g, ' ').trim())
    .filter(p => p.length > 1 && p.length < 80);
}

async function fetchSbsInkigayoPerformers(ep) {
  if (!ep.sbsVodId) return [];
  const url = `https://programs.sbs.co.kr/programTemplate/amp/vod/gayo/${ep.sbsVodId}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    return parseSbsInkigayoPerformers(await res.text(), ep.no);
  } catch {
    return [];
  }
}

// Naver 회차정보 탭 HTML 가져오기
// pkid=57 (음악 프로그램), os=프로그램별 ID
async function fetchNaverEpisodeTab(show) {
  const xCsa = encodeURIComponent(JSON.stringify({ pkid: '57', isOpen: false, tab: 'episode_info' }));
  const query = encodeURIComponent(show.navQuery);
  const url = `https://search.naver.com/search.naver?where=nexearch&sm=tab_etc&x_csa=${xCsa}&pkid=57&os=${show.navOs}&qvt=0&query=${query}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9',
      'Referer': 'https://www.naver.com/',
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Naver HTTP ${res.status}`);
  return res.text();
}

// HTML에서 회차 데이터 파싱
// descFormat 'dt_dd':   <dt>출연</dt> <dd>[performers]</dd>  (뮤직뱅크·음악중심·엠카·쇼챔)
// descFormat 'span_desc': <span class="desc _text">aespa, NMIXX ... 등</span>  (인기가요)
function parseNaverEpisodes(html, descFormat = 'dt_dd') {
  const episodes = [];
  const seen = new Set();

  const sections = html.split('class="num_txt">');
  for (let i = 1; i < sections.length; i++) {
    const s = sections[i];

    const noM = s.match(/^(\d+)<\/span>회/);
    if (!noM) continue;
    const no = +noM[1];

    const dateM = s.match(/class="date_info">(\d{4})\.(\d{2})\.(\d{2})/);
    if (!dateM) continue;
    const date = `${dateM[1]}-${dateM[2]}-${dateM[3]}`;

    if (seen.has(date)) continue;

    let performers = [];
    const sbsVodId = extractSbsVodId(s);

    if (descFormat === 'span_desc') {
      // 인기가요 포맷: <span class="desc _text">aespa, NMIXX, BOYNEXTDOOR 등</span>
      const descM = s.match(/class="desc _text">([^<]+)/);
      if (!descM) continue;
      performers = descM[1]
        .replace(/\s*등\s*$/, '')
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 1 && p.length < 40);
    } else {
      // 기본 포맷: <dt>출연</dt> <dd>...</dd>
      const subM = s.match(/<dt>출연<\/dt>\s*<dd>([\s\S]*?)<\/dd>/);
      if (!subM) continue;

      let ddText = subM[1]
        .replace(/<a[^>]*>([^<]*)<\/a>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      performers = ddText
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 1 && p.length < 40);
    }

    if (performers.length > 0) {
      seen.add(date);
      episodes.push({ no, date, performers, sbsVodId });
    }
  }

  return episodes;
}

async function enrichInkigayoEpisodes(episodes) {
  const enriched = [];
  for (const ep of episodes) {
    const detailPerformers = await fetchSbsInkigayoPerformers(ep);
    if (detailPerformers.length > ep.performers.length) {
      enriched.push({ ...ep, performers: detailPerformers, detailSource: 'sbs_amp' });
    } else {
      enriched.push(ep);
    }
  }
  return enriched;
}

function officialPerformerNames(rawNames, enNameMap) {
  const seen = new Set();
  const names = [];
  for (const rawName of rawNames) {
    const official = normalizeArtistName(enNameMap[rawName] || rawName);
    if (!official || /\\[rn]/.test(official) || /[\r\n]/.test(official)) continue;
    if (seen.has(official)) continue;
    seen.add(official);
    names.push(official);
  }
  return names;
}

// Supabase upsert — manual/cancelled는 항상 보호, backfill 모드에서는 과거 날짜도 허용
async function upsertRows(rows, { backfill = false, allowManualOverride = false } = {}) {
  if (!rows.length) return 0;
  const todayKey = todayKstKey();
  let ok = 0;
  const hdrs = {
    apikey: SUPA_SERVICE_KEY,
    Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  };

  for (const row of rows) {
    // 일반 크론 모드: 오늘 이전 날짜는 건드리지 않음
    if (!backfill && row.broad_date < todayKey) { ok++; continue; }

    // 기존 row 확인
    const ex = await fetch(
      `${SUPA_URL}/rest/v1/music_show_lineups?show_name=eq.${row.show_name}&broad_date=eq.${row.broad_date}&select=id,source`,
      { headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}` },
        signal: AbortSignal.timeout(10000) }
    ).then(r => r.json()).catch(() => []);

    if (ex.length > 0) {
      const existingSource = ex[0].source;
      // manual/cancelled는 항상 보호 (backfill 포함)
      if (existingSource === 'manual' && !allowManualOverride) { ok++; continue; }
      if (existingSource === 'cancelled' && row.source !== 'manual') { ok++; continue; }
      if (row.source === 'date_rule' && existingSource !== 'date_rule') { ok++; continue; }
      await fetch(`${SUPA_URL}/rest/v1/music_show_lineups?id=eq.${ex[0].id}`, {
        method: 'PATCH',
        headers: { ...hdrs },
        body: JSON.stringify({ groups: row.groups, raw_title: row.raw_title, episode_number: row.episode_number, source: row.source }),
        signal: AbortSignal.timeout(10000),
      });
      ok++;
    } else {
      const ins = await fetch(`${SUPA_URL}/rest/v1/music_show_lineups`, {
        method: 'POST', headers: hdrs, body: JSON.stringify([row]),
        signal: AbortSignal.timeout(10000),
      });
      if (ins.ok) ok++;
    }
  }
  return ok;
}

// date_rule source rows 삭제 (백필 후 빈 뼈대 정리)
async function deleteDateRuleRows(showName, since) {
  const url = `${SUPA_URL}/rest/v1/music_show_lineups?show_name=eq.${showName}&source=eq.date_rule&broad_date=gte.${since}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}` },
    signal: AbortSignal.timeout(15000),
  });
  return res.ok;
}

// ── 텔레그램 노티 ──
async function sendTelegram(text) {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text, parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    console.error('[sync-naver] TG 전송 실패:', e.message);
  }
}

// 이번 주 + 다음 주 방송일(월~일) 범위 반환
function thisAndNextWeekRange() {
  const now = new Date();
  // 이번 주 월요일
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  mon.setHours(0, 0, 0, 0);
  // 다음 주 일요일
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 13);
  return { from: dKey(mon), to: dKey(sun) };
}

// 이번 주/다음 주 방송별 lineup 건수를 Supabase에서 조회
async function fetchWeekCounts(from, to) {
  const url = `${SUPA_URL}/rest/v1/music_show_lineups` +
    `?broad_date=gte.${from}&broad_date=lte.${to}` +
    `&select=show_name,broad_date,groups,source`;
  const res = await fetch(url, {
    headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Supabase fetch HTTP ${res.status}`);
  return res.json();
}

function scheduledShowNameForDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return SHOWS_NAVER.find(show => show.dayOfWeek === dow)?.show_name || null;
}

function todayLineupSummary(rows, todayKey) {
  const todayRows = rows.filter(r => r.broad_date === todayKey);
  const expectedShowName = scheduledShowNameForDateKey(todayKey);
  if (expectedShowName && !todayRows.some(r => r.show_name === expectedShowName)) {
    todayRows.push({ show_name: expectedShowName, broad_date: todayKey, groups: [], source: 'date_rule' });
  }
  return todayRows
    .filter(r => SHOWS_NAVER.some(show => show.show_name === r.show_name))
    .map(r => {
      const show = SHOWS_NAVER.find(s => s.show_name === r.show_name);
      const count = Array.isArray(r.groups) ? r.groups.length : 0;
      const status = r.source === 'cancelled' ? '휴방' : `${count}개 그룹`;
      return `${show?.label || r.show_name}: ${status}`;
    });
}

module.exports = async function handler(req, res) {
  const authHeader = req.headers.authorization || '';
  const secret = req.query.secret || '';
  if (SYNC_SECRET && secret !== SYNC_SECRET && authHeader !== `Bearer ${SYNC_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!SUPA_SERVICE_KEY) return res.status(500).json({ error: 'SUPA_SERVICE_KEY 없음' });

  const since = req.query.since || null;
  const backfill = req.query.backfill === '1';
  // backfill 모드: since부터 과거 포함 전체 처리
  // 일반 모드: 오늘 이후만 처리
  const cutoffDate = backfill && since ? since : todayKstKey();
  const log = [];
  let totalUpserted = 0;

  for (const show of SHOWS_NAVER) {
    try {
      // backfill 모드에서만: 기존 date_rule 빈 뼈대 먼저 삭제 (나중에 데이터 없는 날짜는 row 자체를 만들지 않음)
      if (backfill && since) {
        await deleteDateRuleRows(show.show_name, since);
        log.push(`[${show.show_name}] date_rule rows 삭제 완료 (${since} 이후)`);
      }

      // 일반 모드: 앞으로 2주 뼈대만 생성 (데이터 없는 날짜 표시용)
      // backfill 모드: 뼈대 생성 안 함 — 크롤링 데이터 있는 날짜만 저장
      let skelOk = 0;
      if (!backfill) {
        const dates = datesForDay(show.dayOfWeek, since, cutoffDate);
        const cancelledDates = dates.filter(d => isSpecialCancelled(show.show_name, d));
        if (cancelledDates.length > 0) {
          await deleteRowsByDates(show.show_name, cancelledDates);
        }
        const skelRows = dates
          .filter(d => !cancelledDates.includes(d))
          .map(d => ({
            show_name: show.show_name,
            broad_date: d,
            groups: [],
            raw_title: '',
            episode_number: null,
            source: 'date_rule',
          }));
        skelOk = await upsertRows(skelRows);
        log.push(`[${show.show_name}] 뼈대 ${skelOk}/${skelRows.length}개`);
      }

      if (show.show_name === 'show_champion') {
        const officialRows = await fetchShowChampionOfficialRows({ cutoffDate, backfill });
        if (officialRows.length > 0) {
          const officialOk = await upsertRows(officialRows, { backfill: true, allowManualOverride: true });
          log.push(`[${show.show_name}] MBC PLUS 공식 업데이트 ${officialOk}/${officialRows.length}개 (기준일 ${cutoffDate})`);
          totalUpserted += skelOk + officialOk;
          continue;
        }
        log.push(`[${show.show_name}] MBC PLUS 공식 공지 없음 → Naver fallback`);
      }

      // Naver 회차정보 크롤링
      const html = await fetchNaverEpisodeTab(show);
      const episodes = parseNaverEpisodes(html, show.descFormat || 'dt_dd');

      if (episodes.length === 0) {
        log.push(`[${show.show_name}] Naver 에피소드 없음 (HTML ${html.length}자)`);
        totalUpserted += skelOk;
        continue;
      }

      // 처리 대상 에피소드 필터링
      const cancelledSet = new Set();
      let targetEpisodes = episodes.filter(ep => ep.date >= cutoffDate && !cancelledSet.has(ep.date));
      const skippedCount = episodes.length - targetEpisodes.length;

      if (targetEpisodes.length === 0) {
        log.push(`[${show.show_name}] Naver 업데이트 0개 (기준일 ${cutoffDate}, ${skippedCount}개 스킵)`);
        totalUpserted += skelOk;
        continue;
      }

      // 인기가요: SBS 공홈 상세페이지에서 전체 출연진 보강
      if (show.show_name === 'inkigayo') {
        targetEpisodes = await enrichInkigayoEpisodes(targetEpisodes);
      }

      // 한국어 performer명 → 공식 영문명 변환
      const allPerformers = [...new Set(targetEpisodes.flatMap(ep => ep.performers))];
      const enNameMap = await resolveEnNames(allPerformers);

      const dataRows = targetEpisodes.map(ep => {
        const enPerformers = officialPerformerNames(ep.performers, enNameMap);
        return {
          show_name: show.show_name,
          broad_date: ep.date,
          groups: mapArtists([...ep.performers, ...enPerformers]),
          raw_title: `${show.show_name} - ${ep.performers.join(', ')}`,
          episode_number: ep.no || null,
          source: 'naver',
        };
      });

      const dataOk = await upsertRows(dataRows, { backfill });
      log.push(`[${show.show_name}] Naver 업데이트 ${dataOk}/${dataRows.length}개 (기준일 ${cutoffDate}, ${skippedCount}개 스킵)`);
      totalUpserted += skelOk + dataOk;

    } catch (err) {
      log.push(`[${show.show_name}] 오류: ${err.message}`);
    }
  }

  // ── 텔레그램 노티 ──
  // Cron 실행(Authorization 헤더 없음)이거나 ?notify=1 일 때만 전송
  const isCron = !req.headers.authorization && !req.query.secret;
  const forceNotify = req.query.notify === '1';
  if ((isCron || forceNotify) && TG_BOT_TOKEN && TG_CHAT_ID) {
    try {
      const { from, to } = thisAndNextWeekRange();
      const rows = await fetchWeekCounts(from, to);
      const todayKey = todayKstKey();
      const todaySummary = todayLineupSummary(rows, todayKey);

      // 방송별 집계
      const counts = {};
      const warns = [];
      for (const show of SHOWS_NAVER) counts[show.show_name] = { total: 0, withLineup: 0 };
      for (const r of rows) {
        if (!counts[r.show_name]) continue;
        counts[r.show_name].total++;
        if (r.groups && r.groups.length > 0) counts[r.show_name].withLineup++;
      }

      // 로그에서 오류 줄 추출
      const errLines = log.filter(l => l.includes('오류') || l.includes('없음'));

      // 5개 이하 경고 (뼈대만 있고 출연진 없는 방송)
      for (const [show_name, c] of Object.entries(counts)) {
        if (c.withLineup <= 5) warns.push(`⚠️ <b>${show_name}</b>: 출연진 있는 일정 ${c.withLineup}개`);
      }

      const hasIssue = errLines.length > 0 || warns.length > 0;
      const icon = hasIssue ? '🚨' : '✅';
      const lines = [
        `${icon} <b>sync-naver 실행 완료</b> (${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })})`,
        `📊 총 upsert: ${totalUpserted}건 | 대상기간: ${from} ~ ${to}`,
        '',
        `📅 <b>오늘(${todayKey}) 등록 현황:</b>`,
        ...(todaySummary.length ? todaySummary.map(line => `  ${line}`) : ['  오늘 고정 방송 없음']),
        '',
      ];

      if (errLines.length > 0) {
        lines.push('❌ <b>크롤링 실패/없음:</b>');
        errLines.forEach(l => lines.push(`  ${l}`));
        lines.push('');
      }
      if (warns.length > 0) {
        lines.push('📉 <b>출연진 적은 방송 (≤5개):</b>');
        warns.forEach(w => lines.push(`  ${w}`));
        lines.push('');
      }

      lines.push('<b>방송별 현황:</b>');
      for (const [sn, c] of Object.entries(counts)) {
        const label = SHOWS_NAVER.find(s => s.show_name === sn)?.label || sn;
        lines.push(`  ${label}: 전체 ${c.total}회 / 출연진 ${c.withLineup}회`);
      }

      await sendTelegram(lines.join('\n'));
    } catch (notifyErr) {
      log.push(`[notify] 텔레그램 전송 오류: ${notifyErr.message}`);
    }
  }

  return res.status(200).json({ ok: true, log, totalUpserted, ts: new Date().toISOString() });
};
