// api/artist-en-name.js
// 한국어 아티스트명 → 공식 영문명 변환
// 우선순위: 수동 맵 → Supabase 캐시 → Melon 검색 → 원본 유지

const { OFFICIAL_ARTIST_NAMES } = require('../lib/artist-official-names');

const SUPA_URL         = process.env.SUPA_URL || 'https://kzffotlfdtubkbxsjqiv.supabase.co';
const SUPA_SERVICE_KEY = process.env.SUPA_SERVICE_KEY;

// ── 수동 맵: 멜론에 영문명 없는 경우 직접 지정 ──
const MANUAL_EN_MAP = {
  ...OFFICIAL_ARTIST_NAMES,
  '가비엔제이': 'Gavy NJ',
  '이예준': 'Lee Ye-jun',
  '박재범': 'Jay Park',
  '박현규': 'Park Hyun-kyu',
  '비비': 'BIBI',
  '에스파': 'aespa',
  '아일릿': 'ILLIT',
  '셔누X형원': 'SHOWNU X HYUNGWON',
  '셔누x형원': 'SHOWNU X HYUNGWON',
  '셔누': 'SHOWNU',
  '형원': 'HYUNGWON',
  '아이오아이': 'I.O.I',
  '유어즈': 'YUHZ',
  '윤산하': 'Yoon San-ha',
  '조혜련': 'Cho Hye-ryun',
  '차동협': 'Cha Dong-hyup',
  '태용': 'TAEYONG',
  '하입프린세스': 'H//PE Princess',
  '자두': 'Jadu',
  '이채연': 'Lee Chae-yeon',
  '휘인': 'WHEEIN',
  '박지훈': 'Park Ji-hoon',
  '캣츠아이': 'KATSEYE',
  '오르빗': 'ORβIT',
  '박혜경': 'Park Hye-kyung',
  '유주': 'YUJU',
  '소유': 'SOYOU',
  '이지훈': 'Lee Ji-hoon',
  '동해': 'DONGHAE',
  '다영': 'DAYOUNG',
  '김재환': 'Kim Jae-hwan',
  '연준': 'YEONJUN',
  '유나': 'YUNA',
  '한해': 'HANHAE',
  '문세윤': 'Moon Se-yoon',
  '올아워즈': 'ALL(H)OURS',
  '앳하트': 'AtHeart',
  '레드 오파츠': 'RED OOPARTS',
  '아이린': 'IRENE',
  '강민': 'KANGMIN',
  '서이브': 'SEO EVE',
  '장한음': 'Jang Han Eum',
  '에스투잇': 'S2IT',
  '엠비오': 'MBIO',
  '키노': 'KINO',
  '슬레이': 'S.LAY',
  '민지운': 'Min Ji Woon',
  '나태주': 'Na Tae Joo',
  '박재정': 'Parc Jae Jung',
  '화사': 'HWASA',
  '엔젤노이즈': 'Angel Noise',
  '이지민': 'Lee Jimin',
  '김하온': 'HAON',
  '투모로우바이투게더': 'TOMORROW X TOGETHER',
  '천도': 'Cheon Do',
  '비보이즈': 'B.BOYS',
  '제이창': 'Jay Chang',
  '언차일드': 'UNCHILD',
  '최은빈': 'Choi Eun Bin',
  '홍승민': 'Hong Seung Min',
  '포레스텔라': 'Forestella',
  '크레이즈엔젤': 'CrazAngel',
  '오션': 'O3ean',
  '영파씨': 'YOUNG POSSE',
  '하이키': 'H1-KEY',
  '빌리': 'Billlie',
  '케플러': 'Kep1er',
  '앰퍼샌드원': 'AMPERS&ONE',
  '엑스디너리히어로즈': 'Xdinary Heroes',
  '보이넥스트도어': 'BOYNEXTDOOR',
  '제로베이스원': 'ZEROBASEONE',
  '투어스': 'TWS',
  '베이비몬스터': 'BABYMONSTER',
  '앤팀': '&TEAM',
  '더보이즈': 'THE BOYZ',
  '크래비티': 'CRAVITY',
  '싸이커스': 'xikers',
  '플레어 유': 'FLARE U',
};

function supaHeaders() {
  return {
    apikey: SUPA_SERVICE_KEY,
    Authorization: `Bearer ${SUPA_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };
}

function isKorean(str) {
  return /[가-힣]/.test(str);
}

function normalizeArtistName(name) {
  let n = String(name || '')
    .replace(/\\[rn]/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!n) return n;

  if (MANUAL_EN_MAP[n]) return MANUAL_EN_MAP[n];

  // "비비(BIBI)" / "박재범(Jay Park) & LNGSHOT"처럼 한글명 뒤 영문 병기가 있으면 영문명을 사용.
  n = n.replace(/[가-힣][가-힣\s]*[（\(]\s*([A-Za-z0-9 &!./'\-+]+?)\s*[）\)]/g, '$1');
  n = n.replace(/\s+/g, ' ').trim();
  if (MANUAL_EN_MAP[n]) return MANUAL_EN_MAP[n];

  // "Billlie (빌리)" / "FLARE U (플레어 유)"처럼 영문명 뒤 한글 병기는 제거.
  n = n.replace(/\s*[（\(]\s*[가-힣][가-힣\s]*\s*[）\)]/g, '').replace(/\s+/g, ' ').trim();
  if (MANUAL_EN_MAP[n]) return MANUAL_EN_MAP[n];

  return n;
}

// Supabase 캐시 일괄 조회
async function fetchCached(krNames) {
  if (!krNames.length) return {};
  const inList = krNames.map(n => `"${n.replace(/"/g, '\\"')}"`).join(',');
  const url = `${SUPA_URL}/rest/v1/artist_name_map?kr_name=in.(${encodeURIComponent(inList)})&select=kr_name,en_name`;
  try {
    const res = await fetch(url, { headers: supaHeaders(), signal: AbortSignal.timeout(8000) });
    if (!res.ok) return {};
    const rows = await res.json();
    const map = {};
    for (const r of rows) map[r.kr_name] = r.en_name;
    return map;
  } catch {
    return {};
  }
}

// Supabase 캐시 저장 (중복 무시)
async function saveCache(entries) {
  if (!entries.length) return;
  await fetch(`${SUPA_URL}/rest/v1/artist_name_map`, {
    method: 'POST',
    headers: { ...supaHeaders(), Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(entries),
    signal: AbortSignal.timeout(8000),
  }).catch(() => {});
}

// Melon 검색으로 영문명 조회
// ARTISTNAME 필드가 "KIIRAS (키라스)" 형태면 영문 부분 추출
async function searchMelon(krName) {
  try {
    const q = encodeURIComponent(krName);
    const url = `https://www.melon.com/search/keyword/index.json?query=${q}&section=all&startIndex=1&pageSize=5`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.melon.com/',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const artists = data.ARTISTCONTENTS || [];

    for (const a of artists) {
      const raw = (a.ARTISTNAME || '').trim();
      // "KIIRAS (키라스)" → "KIIRAS"
      const m = raw.match(/^([A-Za-z0-9 &!.\-']+?)\s*[（\(][가-힣]/);
      if (m) return m[1].trim();

      // 순수 영문명인데 검색어(한국어)가 포함된 ARTISTNAMEDP에 있으면 사용
      if (/^[A-Za-z0-9 &!.\-']+$/.test(raw) && (a.ARTISTNAMEDP || '').includes(krName)) {
        return raw;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// 메인: 이름 목록 → { 원본: 영문명 } 맵 반환
async function resolveEnNames(names) {
  const direct = {};
  const normalizedNames = names.map(n => {
    const normalized = normalizeArtistName(n);
    direct[n] = normalized;
    return normalized;
  });

  const koreanNames = [...new Set(normalizedNames.filter(isKorean))];
  if (!koreanNames.length) {
    return Object.fromEntries(names.map(n => [n, direct[n] || n]));
  }

  // 1. 수동 맵 먼저 확인
  const resolved = {};
  const needLookup = [];
  for (const n of koreanNames) {
    if (MANUAL_EN_MAP[n]) resolved[n] = MANUAL_EN_MAP[n];
    else needLookup.push(n);
  }

  // 2. Supabase 캐시 조회
  const cached = await fetchCached(needLookup);
  const needSearch = [];
  for (const n of needLookup) {
    if (cached[n]) resolved[n] = cached[n];
    else needSearch.push(n);
  }

  // 3. Melon 검색 (캐시 미스)
  const toSave = [];
  await Promise.all(needSearch.map(async krName => {
    const enName = await searchMelon(krName);
    resolved[krName] = enName || krName;
    if (enName) toSave.push({ kr_name: krName, en_name: enName });
  }));

  // 4. 새로 찾은 것 Supabase에 저장
  if (toSave.length) await saveCache(toSave);

  // 5. 전체 이름 맵 반환 (영문은 그대로)
  return Object.fromEntries(names.map(n => {
    const normalized = direct[n] || n;
    return [n, isKorean(normalized) ? normalizeArtistName(resolved[normalized] || normalized) : normalized];
  }));
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'GET/POST only' });

  try {
    const rawNames = req.method === 'POST' ? req.body?.names : req.query.names;
    const names = Array.isArray(rawNames)
      ? rawNames
      : String(rawNames || '')
        .trim()
        .replace(/^\[/, '')
        .replace(/\]$/, '')
        .split(',')
        .map(s => s.replace(/^["']|["']$/g, '').trim())
        .filter(Boolean);

    const uniqueNames = [...new Set(names)].slice(0, 100);
    const map = await resolveEnNames(uniqueNames);
    return res.status(200).json({ names: map });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}

module.exports = handler;
module.exports.resolveEnNames = resolveEnNames;
module.exports.isKorean = isKorean;
module.exports.normalizeArtistName = normalizeArtistName;
