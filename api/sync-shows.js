// api/sync-shows.js
// 매일 오전 9시(KST) Vercel Cron으로 자동 실행
// 역할:
//   1. 오늘~다음달 말까지 쇼챔(수), 음악중심(토) 날짜 뼈대 INSERT (없으면)
//   2. iMBC API에서 최근 에피소드 가져와 groups/raw_title 업데이트

const SUPA_URL         = 'https://kzffotlfdtubkbxsjqiv.supabase.co';
const SUPA_SERVICE_KEY = process.env.SUPA_SERVICE_KEY;
const SYNC_SECRET      = process.env.SYNC_SECRET || '';

const IMBC = 'https://playvod.imbc.com/api/PreviewList';
// dayOfWeek: 방송일 기준 (iMBC BroadDate = 실제 방송일)
// 음악중심 토(6), 쇼챔피언 수(3)
const SHOWS_IMBC = [
  { show_name: 'music_core',    programId: '1000788100000100000', dayOfWeek: 6 }, // 토
  { show_name: 'show_champion', programId: '1003864100000100000', dayOfWeek: 3 }, // 수
];

// ── 아티스트 → 그룹ID 매핑
const ARTIST_TO_GROUP = {
  'BTS':'bts','방탄소년단':'bts','RM':'bts','Jin':'bts','진':'bts',
  'SUGA':'bts','슈가':'bts','j-hope':'bts','j-Hope':'bts',
  'Jimin':'bts','지민':'bts','V':'bts','뷔':'bts',
  'Jung Kook':'bts','Jungkook':'bts','정국':'bts',
  'SEVENTEEN':'seventeen','세븐틴':'seventeen',
  'ENHYPEN':'enhypen','엔하이픈':'enhypen',
  'aespa':'aespa','AESPA':'aespa',
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
  'EVNNE':'evnne','이븐':'evnne',
  'CRAVITY':'cravity','크래비티':'cravity',
  'XIKERS':'xikers','자이커스':'xikers',
  'DRIPPIN':'drippin','VERIVERY':'verivery',
  'THE BOYZ':'theboyz','더보이즈':'theboyz',
  'ONEUS':'oneus','원어스':'oneus',
  '청하':'chunga','CHUNG HA':'chunga',
  '이채연':'leechaeyeon','휘인':'wheein','WHEEIN':'wheein',
  '박지훈':'parkjihoon',
  'NEXZ':'nexz','넥스지':'nexz',
  'KATSEYE':'katseye',
  'Xdinary Heroes':'xdinaryheroes',
  'ALPHA DRIVE ONE':'alphadriveone',
  'Kep1er':'kep1er','케플러':'kep1er',
  '82MAJOR':'82major',
  'AMPERS&ONE':'ampersandone','앰퍼샌드원':'ampersandone',
  'SOOJIN':'soojin',
  'SHOWNU X HYUNGWON':'monstax',
  'PENTAGON':'pentagon','펜타곤':'pentagon',
  '(G)I-DLE':'gidle','여자아이들':'gidle',
  'MAMAMOO':'mamamoo','마마무':'mamamoo',
  'Red Velvet':'redvelvet','레드벨벳':'redvelvet',
  // 추가
  'IZNA':'izna','izna':'izna','이즈나':'izna',
  'RIIZE':'riize','라이즈':'riize',
  'FIFTY FIFTY':'fiftyfifty','피프티피프티':'fiftyfifty','FIFTY FIFTY (피프티피프티)':'fiftyfifty',
  'ONF':'onf','온앤오프':'onf','온앤오프(ONF)':'onf',
  'STAYC':'stayc','스테이씨':'stayc',
  'CrazAngel':'crazangel','크레이즈엔젤':'crazangel','CRAZANGEL':'crazangel',
  'HEART OF WOMAN':'heartofwoman',
  'USPEER':'uspeer','유스피어':'uspeer',
  'Rothy':'rothy','로시':'rothy',
  'UmYull':'umyull','음율':'umyull',
  'MEOVV':'meovv','미어브':'meovv',
  'TREASURE':'treasure','트레저':'treasure',
  'EVERGLOW':'everglow','에버글로우':'everglow',
  'OH MY GIRL':'ohmygirl','오마이걸':'ohmygirl',
  'fromis_9':'fromis9','프로미스나인':'fromis9',
  'WJSN':'wjsn','우주소녀':'wjsn',
  'Kep1er':'kep1er','케플러':'kep1er',
  'OMEGA X':'omegax','오메가엑스':'omegax',
  'H1-KEY':'h1key','하이키':'h1key',
  'Billlie':'billlie','빌리':'billlie',
  'P1Harmony':'p1harmony','피원하모니':'p1harmony',
  'YOUNG POSSE':'youngposse','영파씨':'youngposse',
  'BOYNEXTDOOR':'boynextdoor',
  'CSR':'csr','씨에스알':'csr',
  'EPEX':'epex','이펙스':'epex',
  'CLASS:y':'classy','클라씨':'classy',
  'tripleS':'triples','트리플에스':'triples',
  'AB6IX':'ab6ix','에이비식스':'ab6ix',
};

function mapArtists(names) {
  const ids = new Set();
  for (const n of names) {
    const g = ARTIST_TO_GROUP[n];
    if (g) ids.add(g);
  }
  return [...ids];
}

function dKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// 오늘부터 다음달 말일까지 특정 요일의 날짜 목록 (since 지정 시 max(오늘, since)부터)
function datesForDay(dayOfWeek, sinceDate) {
  const today = new Date(); today.setHours(0,0,0,0);
  const start = sinceDate ? new Date(Math.max(today, new Date(sinceDate))) : new Date(today);
  const end = new Date(today.getFullYear(), today.getMonth()+2, 0);

  const dates = [];
  const cur = new Date(start);
  while (cur <= end) {
    if (cur.getDay() === dayOfWeek) dates.push(dKey(new Date(cur)));
    cur.setDate(cur.getDate()+1);
  }
  return dates;
}

// iMBC에서 최근 에피소드 가져오기 (최대 3페이지)
async function fetchImbcEpisodes(programId) {
  const episodes = [];
  for (let page = 1; page <= 3; page++) {
    try {
      const res = await fetch(
        `${IMBC}?programId=${programId}&curPage=${page}&pageSize=50`,
        { signal: AbortSignal.timeout(15000) }
      );
      if (!res.ok) break;
      const data = await res.json();
      const list = data?.ContList || [];
      if (!list.length) break;
      episodes.push(...list);
    } catch { break; }
  }
  return episodes;
}

function protectDottedArtistNames(raw) {
  return String(raw || '')
    .replace(/\bI\s*\.\s*O\s*\.\s*I\b/gi, 'I{{DOT}}O{{DOT}}I')
    .replace(/\bIOI\b/gi, 'I{{DOT}}O{{DOT}}I')
    .replace(/아이오아이/g, 'I{{DOT}}O{{DOT}}I');
}

function normalizeParsedArtistName(name) {
  const restored = String(name || '').replace(/\{\{DOT\}\}/g, '.').trim();
  return /^(?:I\.O\.I|IOI|아이오아이)$/i.test(restored) ? 'I.O.I' : restored;
}

// 음악중심 파싱: "휘인 . 박지훈 . LE SSERAFIM ..."
function parseMusicCore(ep) {
  const raw = ep.ContentTitle || ep.contentTitle || '';
  const artists = protectDottedArtistNames(raw).split(/\s*[·.]\s*/).map(normalizeParsedArtistName).filter(s=>s && s !== 'EVNNE(이븐)'.replace(/\([^)]*\)/g,'').trim());
  // 괄호 안 한국어 제거
  const cleaned = artists.map(s => s.replace(/\s*\([^)]*\)/g,'').trim()).filter(Boolean);
  return { raw, artists: cleaned };
}

// 쇼챔피언 파싱
// iMBC ContentTitle 예시:
//   "601회 2026.06.24. (수)\n출연\n크레이즈엔젤, EPEX, ...\nCrazAngel / EPEX(이펙스) / ...\n독보적인 ... 'izna'. ... 'RIIZE'. ..."
// 전략:
//   1) " - " 뒤 쉼표 구분 (구형 포맷)
//   2) 줄바꿈 포함된 신형 포맷: "출연" 다음 줄 or 영문명 줄 or 마지막 홍보문구 속 작은따옴표 이름 추출
function parseShowChampion(ep) {
  const raw = ep.ContentTitle || ep.contentTitle || '';

  // ── 구형 포맷: " - 아티스트, 아티스트, ..."
  const dashM = raw.match(/ -\s*/);
  if (dashM) {
    const artists = raw.slice(dashM.index + dashM[0].length)
      .replace(/\s+등\s*$/, '')
      .split(',')
      .map(s => s.replace(/\s*\([^)]*\)/g, '').trim())
      .filter(Boolean);
    if (artists.length > 0) return { raw, artists };
  }

  // ── 신형 포맷: 줄바꿈 기반 파싱
  const lines = raw.split(/\n|\r\n|\r/).map(l => l.trim()).filter(Boolean);
  const collected = new Set();

  for (const line of lines) {
    // "출연" 레이블 자체는 스킵
    if (/^출연$/.test(line)) continue;
    // 회차·날짜 줄 스킵: "601회 2026.06.24. (수)"
    if (/^\d+회\s+\d{4}/.test(line)) continue;

    // 쉼표로 구분된 한국어/영문 혼합 줄: "크레이즈엔젤, EPEX, HEART OF WOMAN, 유스피어, ..."
    if (line.includes(',')) {
      line.split(',')
        .map(s => s.replace(/\s*\([^)]*\)/g, '').trim())
        .filter(Boolean)
        .forEach(s => collected.add(s));
      continue;
    }

    // 슬래시로 구분된 영문명 줄: "CrazAngel / EPEX(이펙스) / HEART OF WOMAN / ..."
    if (line.includes('/')) {
      line.split('/')
        .map(s => s.replace(/\s*\([^)]*\)/g, '').replace(/\s*\[[^\]]*\]/g, '').trim())
        .filter(Boolean)
        .forEach(s => collected.add(s));
      continue;
    }

    // 홍보 문구 속 작은따옴표로 감싸인 이름: '이름' or 'ONF'
    // 예: "독보적인 템포로 완성한 파워 몽환 'izna'. 도파민 터지는 이모셔널 팝 'RIIZE'."
    const quoted = [...line.matchAll(/[''"'"]([^''""'"\n]{1,40})[''"'"]/g)].map(m => m[1].trim());
    quoted.filter(Boolean).forEach(s => collected.add(s));
  }

  const artists = [...collected]
    .map(s => s.replace(/\s*\([^)]*\)/g, '').replace(/\.$/, '').trim())
    .filter(s => s.length > 0 && !/^\d+회$/.test(s));

  return { raw, artists };
}

// 방영일 추출
function parseBroadDate(ep) {
  const raw = ep.BroadDate || ep.broadDate || ep.BroadcastDate || '';
  if (!raw) return null;
  const m = raw.match(/(\d{4})[.\-/]?(\d{2})[.\-/]?(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

// naver source로 저장된 날짜 조회 (iMBC가 덮어쓰지 않도록)
async function getNaverProtectedDates(showName) {
  const res = await fetch(
    `${SUPA_URL}/rest/v1/music_show_lineups?show_name=eq.${showName}&source=eq.naver&select=broad_date`,
    { headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}` } }
  ).then(r => r.json()).catch(() => []);
  return new Set((res || []).map(r => r.broad_date));
}

// 우선순위: manual > naver > imbc/date_rule
// 오늘 이전 날짜는 절대 건드리지 않음
async function upsertRows(rows) {
  const today = new Date(); today.setHours(0,0,0,0);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const hdrs = {
    'apikey': SUPA_SERVICE_KEY,
    'Authorization': `Bearer ${SUPA_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  };
  let ok = 0;
  for (const row of rows) {
    // 오늘 이전 날짜는 source 불문 절대 건드리지 않음
    if (row.broad_date < todayKey) { ok++; continue; }
    const existing = await fetch(
      `${SUPA_URL}/rest/v1/music_show_lineups?show_name=eq.${row.show_name}&broad_date=eq.${row.broad_date}&select=id,groups,source`,
      { headers: { apikey: SUPA_SERVICE_KEY, Authorization: `Bearer ${SUPA_SERVICE_KEY}` },
        signal: AbortSignal.timeout(10000) }
    ).then(r=>r.json()).catch(()=>[]);

    if (existing.length > 0) {
      const es = existing[0].source;
      // manual 최우선 보호 — 어떤 자동 소스도 덮어쓰지 않음
      if (es === 'manual') { ok++; continue; }
      // naver 보호 — imbc/date_rule이 덮어쓰지 않음
      if (es === 'naver' && row.source !== 'naver') { ok++; continue; }
      // date_rule이 이미 실제 데이터 있으면 스킵
      if (row.source === 'date_rule' && existing[0].groups?.length > 0) { ok++; continue; }
      await fetch(`${SUPA_URL}/rest/v1/music_show_lineups?id=eq.${existing[0].id}`, {
        method: 'PATCH',
        headers: hdrs,
        body: JSON.stringify({ groups: row.groups, raw_title: row.raw_title, source: row.source }),
        signal: AbortSignal.timeout(10000),
      });
      ok++;
    } else {
      const ins = await fetch(`${SUPA_URL}/rest/v1/music_show_lineups`, {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify([row]),
        signal: AbortSignal.timeout(10000),
      });
      if (ins.ok) ok++;
    }
  }
  return ok;
}

module.exports = async function handler(req, res) {
  // 크론 또는 시크릿 검증
  const authHeader = req.headers.authorization || '';
  const secret = req.query.secret || '';
  if (SYNC_SECRET && secret !== SYNC_SECRET && authHeader !== `Bearer ${SYNC_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const since = req.query.since || null; // 백필용: ?since=2026-05-08

  const log = [];
  let totalUpserted = 0;

  for (const show of SHOWS_IMBC) {
    // ① since~다음달말 범위의 날짜 뼈대 채우기 (기본: 30일 전부터)
    const futureDates = datesForDay(show.dayOfWeek, since);
    const skeletonRows = futureDates.map(d => ({
      show_name: show.show_name,
      broad_date: d,
      groups: [],
      raw_title: '',
      episode_number: null,
      source: 'date_rule',
    }));
    const skelOk = await upsertRows(skeletonRows);
    log.push(`[${show.show_name}] 뼈대 ${skelOk}/${futureDates.length}개`);

    // ② iMBC에서 최근 에피소드 가져와서 groups 업데이트 (naver 데이터 보호)
    const naverDates = await getNaverProtectedDates(show.show_name);
    const episodes = await fetchImbcEpisodes(show.programId);
    const dataRows = [];
    for (const ep of episodes) {
      const date = parseBroadDate(ep);
      if (!date) continue;
      if (naverDates.has(date)) continue; // naver 우선: iMBC가 덮어쓰지 않음
      const { raw, artists } = show.show_name === 'music_core'
        ? parseMusicCore(ep)
        : parseShowChampion(ep);
      if (artists.length === 0) continue; // 출연진 없으면 저장 안 함
      const groups = mapArtists(artists);
      dataRows.push({
        show_name: show.show_name,
        broad_date: date,
        groups,
        raw_title: raw,
        episode_number: ep.EpisodeNo || ep.episodeNo || null,
        source: 'imbc',
      });
    }
    const dataOk = await upsertRows(dataRows);
    log.push(`[${show.show_name}] iMBC 업데이트 ${dataOk}/${dataRows.length}개`);
    totalUpserted += skelOk + dataOk;
  }

  return res.status(200).json({ ok: true, log, totalUpserted, ts: new Date().toISOString() });
};
