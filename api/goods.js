// api/goods.js — Vercel Serverless Function (CommonJS)
// 그룹명 + 공방/역조공/공방포/사녹 키워드로 번장 검색 → 최신순 반환
// GET /api/goods?artist=방탄소년단&n=30

const fs = require('fs');
const path = require('path');

const BUNJANG_API = 'https://api.bunjang.co.kr/api/1/find_v2.json';
const KRW_PER_USD = 1300;

// 이벤트 타입별 검색 키워드 (아티스트명과 조합해서 OR 검색)
const KEYWORDS_BY_TYPE = {
  // 공방 (기존)
  gonbang: ['공방포', '역조공', '공방', '사녹'],
  // 콘서트
  concert: [
    '콘서트', '콘포카', '콘굿', '콘입굿', '콘한정',
    '콘서트포카', '콘서트굿즈', '투어', '투어포카', '투어굿즈', '투어MD',
    '콘서트한정', '공연포카', '공연굿즈',
    'Lucky Draw', '럭키드로우',
  ],
  // 팬미팅
  fanmeeting: [
    '팬미팅', '팬콘', '팬사', '팬싸', '팬이벤트',
    '팬미팅포카', '팬미팅굿즈', '팬콘포카', '팬콘굿즈',
    '쇼케이스포카', '쇼케이스굿즈', '기념포카',
  ],

};
// 타입 미지정 시 기본 (공방)
const KEYWORDS = KEYWORDS_BY_TYPE.gonbang;
const STATIC_GOODS = {
  bts: 'goods-bts.json',
  seventeen: 'goods-seventeen.json',
  enhypen: 'goods-enhypen.json',
};

// 영문 공식명 → 한국어/현지 표기. 검색 쿼리 확장용이며, 결과 후처리 필터에는 쓰지 않는다.
const EN_TO_KR = {
  'NOWZ': '나우즈',
  'NAZE': '네이즈',
  'RIIZE': '라이즈',
  'NCT 127': ['엔시티127', 'NCT127'],
  'NCT DREAM': ['엔시티드림', 'NCT드림'],
  'NCT WISH': '엔시티위시',
  'EXO': '엑소',
  'SHINEE': '샤이니',
  'GOT7': '갓세븐',
  'ASTRO': '아스트로',
  'DAY6': '데이식스',
  'MONSTA X': ['몬스타엑스', '몬스타 엑스'],
  'PENTAGON': '펜타곤',
  'WINNER': '위너',
  'BIGBANG': '빅뱅',
  'HIGHLIGHT': '하이라이트',
  'BTOB': '비투비',
  'INFINITE': '인피니트',
  // 세븐틴 유닛
  'DxS': ['도겸승관', '도겸 승관', 'DXS', '도겸x승관', '도겸X승관'],
  'BSS': ['부석순', '부석순'],
  'Jeonghan & Joshua': ['정한조슈아', '정한 조슈아'],
  'aespa': '에스파',
  'IVE': '아이브',
  'LE SSERAFIM': '르세라핌',
  'NewJeans': '뉴진스',
  'TWICE': '트와이스',
  'BLACKPINK': '블랙핑크',
  'ENHYPEN': '엔하이픈',
  'SEVENTEEN': '세븐틴',
  'ATEEZ': '에이티즈',
  'Stray Kids': '스트레이키즈',
  'TXT': ['투모로우바이투게더', '투모로우 바이 투게더', '투바투'],
  'TOMORROW X TOGETHER': ['투모로우바이투게더', '투모로우 바이 투게더', '투바투', 'TXT'],
  'PLAVE': '플레이브',
  'ZEROBASEONE': ['제로베이스원', 'ZB1'],
  'BOYNEXTDOOR': ['보이넥스트도어', 'BND'],
  'TWS': '투어스',
  'ILLIT': '아일릿',
  'BABYMONSTER': '베이비몬스터',
  '&TEAM': '앤팀',
  'CRAVITY': '크래비티',
  'XIKERS': '자이커스',
  'THE BOYZ': '더보이즈',
  'ONEUS': '원어스',
  'MAMAMOO': '마마무',
  'Red Velvet': '레드벨벳',
  'ITZY': '있지',
  'NMIXX': 'NMIXX',
  'EVNNE': '이븐',
  'NEXZ': '넥스지',
  'Kep1er': '케플러',
  'AMPERS&ONE': '앰퍼샌드원',
  'SHINee': '샤이니',
  'SUPER JUNIOR': '슈퍼주니어',
  '(G)I-DLE': '여자아이들',
  'BTOB': '비투비',
  'INFINITE': '인피니트',
  'MONSTA X': '몬스타엑스',
  'Xdinary Heroes': '엑스디너리히어로즈',
  'P1Harmony': '피원하모니',
  'H1-KEY': '하이키',
  'Billlie': '빌리',
  'BIBI': '비비',
  'VIVIZ': '비비지',
  'YOUNG POSSE': '영파씨',
  'KATSEYE': '케이씨아이',
  'Queenz Eye': ['퀸즈아이', 'Queenzeye'],
  'EVERGLOW': '에버글로우',
  'OH MY GIRL': ['오마이걸', 'OMG'],
  'fromis_9': ['프로미스나인', 'fromis9'],
  'WJSN': '우주소녀',
  'APINK': '에이핑크',
  'LOONA': '이달의 소녀',
  'GFRIEND': '여자친구',
  'CLASS:y': '클라씨',
  'LIGHTSUM': '라잇썸',
  'PURPLE KISS': '퍼플키스',
  'SECRET NUMBER': '시크릿넘버',
  'Kep1er': '케플러',
  'STAYC': '스테이씨',
  'KISS OF LIFE': '키스오브라이프',
  'tripleS': '트리플에스',
  'OMEGA X': '오메가엑스',
  'KiiiKiii': '키키키',
  'AB6IX': '에이비식스',
  'DRIPPIN': '드리핀',
  'VERIVERY': '베리베리',
  'DAY6': '데이식스',
  'GOT7': '갓세븐',
  'WayV': '웨이션브이',
  'ASTRO': '아스트로',
  'PENTAGON': '펜타곤',
  'CHUU': '츄',
  'WONHO': '원호',
  'HWASA': '화사',
  'SUNMI': '선미',
  'WHEEIN': '휘인',
  'CHUNG HA': '청하',
  'TREASURE': '트레저',
  'BTOB': '비투비',
  'INFINITE': '인피니트',
  'NCT 127': '엔시티127',
  'NCT DREAM': '엔시티드림',
  'NCT WISH': '엔시티위시',
  'BOYNEXTDOOR': '보이넥스트도어',
  'NEXZ': '넥스지',
  'AMPERS&ONE': '앰퍼샌드원',
  'MEOVV': '미어브',
  'IZNA': '이즈나',
  'TWS': '투어스',
  'CSR': '씨에스알',
};

const RESULT_EXCLUDES = {
  BIBI: [/비비지/i, /\bVIVIZ\b/i, /비비업/i, /\bVVUP\b/i],
};

function decodeHtml(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function cleanDisplayName(s) {
  return decodeHtml(s)
    .replace(/\s+on Bunjang Global Site\.?$/i, '')
    .replace(/\s+\|\s*Bunjang Global.*$/i, '')
    .replace(/\s*\|\s*Bunjang Global\s*$/i, '')
    .replace(/^#\s*/, '')
    .replace(/\s*Translate to English\s*/i, '')
    .trim();
}

function formatUsdPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return `$${n.toFixed(2)}`;
}

function krwToGlobalUsd(price) {
  const n = Number(price) || 0;
  return Math.round((n / KRW_PER_USD) * 100) / 100;
}

function withUsdPrice(item) {
  const priceGlobal = Number.isFinite(Number(item.priceGlobal))
    ? Number(item.priceGlobal)
    : krwToGlobalUsd(item.price);
  return {
    ...item,
    priceGlobal,
    displayPrice: formatUsdPrice(priceGlobal),
    currency: 'USD',
  };
}

function loadStaticGoods() {
  return Object.fromEntries(
    Object.entries(STATIC_GOODS).map(([group, file]) => {
      const filePath = path.join(process.cwd(), 'goods', file);
      const items = JSON.parse(fs.readFileSync(filePath, 'utf8')).map(withUsdPrice);
      return [group, items];
    })
  );
}

function compactLatinName(name) {
  const s = String(name || '').trim();
  if (!/[A-Za-z]/.test(s)) return null;
  const compact = s.replace(/[\s._-]+/g, '');
  return compact && compact !== s ? compact : null;
}

function artistVariants(artist) {
  const s = String(artist || '').trim();
  const variants = [s];
  const paren = s.match(/^(.+?)[（(]\s*([^）)]+?)\s*[）)]$/);
  if (paren) variants.push(paren[1].trim(), paren[2].trim());
  return variants.filter(Boolean);
}

function canonicalArtistKey(artist) {
  for (const variant of artistVariants(artist)) {
    if (/^BIBI$/i.test(variant)) return 'BIBI';
    if (variant === '비비') return 'BIBI';
  }
  return String(artist || '').trim();
}

function getSearchAliases(artist) {
  const variants = artistVariants(artist);

  // EN_TO_KR에서 매핑된 alias를 한 단계 더 재귀 조회 (TXT → 투모로우바이투게더 체인 등)
  function expandMapped(v) {
    const mapped = EN_TO_KR[v] || EN_TO_KR[canonicalArtistKey(v)];
    const direct = Array.isArray(mapped) ? mapped : mapped ? [mapped] : [];
    const extra = direct.flatMap(m => {
      const m2 = EN_TO_KR[m];
      return m2 ? (Array.isArray(m2) ? m2 : [m2]) : [];
    });
    return [...direct, ...extra];
  }

  const aliases = [
    ...variants,
    ...variants.map(v => v.toLowerCase()),
    ...variants.map(compactLatinName),
    ...variants.flatMap(expandMapped),
  ].filter(Boolean);

  return [...new Set(aliases.flatMap(alias => {
    const compact = compactLatinName(alias);
    return compact ? [alias, compact] : [alias];
  }))];
}

function isExcludedResult(item, artist) {
  const rules = RESULT_EXCLUDES[canonicalArtistKey(artist)] || [];
  if (!rules.length) return false;
  const text = `${item.name || ''} ${item.displayName || ''}`;
  return rules.some(rule => rule.test(text));
}

function matchesArtist(item, aliases) {
  const text = `${item.name || ''} ${item.displayName || ''}`.toLowerCase();
  return aliases.some(a => {
    const alias = a.toLowerCase();
    const idx = text.indexOf(alias);
    if (idx < 0) return false;
    const before = idx === 0 ? '' : text[idx - 1];
    // 한국어 alias: 앞에만 한글이 붙지 않으면 통과 (뒤는 '공방', '포카' 등 키워드가 붙는 게 정상)
    // 예) '라이즈' → '문라이즈'·'썬라이즈' 제외, '라이즈공방' 포함
    if (/[가-힣]/.test(alias)) {
      return !/[가-힣]/.test(before);
    }
    // 영문/숫자 alias: 앞뒤가 알파벳/숫자가 아닌지 확인 (단어 경계)
    return !/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(text[idx + alias.length] || '');
  });
}


module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const artist = (req.query.artist || '').trim();
  if (!artist) {
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json(loadStaticGoods());
  }

  const n = Math.min(parseInt(req.query.n || '50', 10), 200);
  const eventType = (req.query.type || 'gonbang').trim();
  const keywords = KEYWORDS_BY_TYPE[eventType] || KEYWORDS_BY_TYPE.gonbang;

  try {
    const aliases = getSearchAliases(artist);
    // 쿼리 → 해당 키워드 매핑 (결과 필터링에 사용)
    const queryList = []; // { q, kw }
    for (const kw of keywords) {
      for (const alias of aliases) queryList.push({ q: `${alias} ${kw}`, kw });
    }
    // 중복 쿼리 제거 (q 기준)
    const uniqueQueryList = [];
    const seenQ = new Set();
    for (const item of queryList) {
      if (!seenQ.has(item.q)) { seenQ.add(item.q); uniqueQueryList.push(item); }
    }

    // 각 쿼리당 100개씩 fetch — 번장이 이미 쿼리로 필터링하므로 충분히 가져옴
    const FETCH_N = 100;
    const results = await Promise.allSettled(
      uniqueQueryList.map(({ q, kw }) => {
        const url = `${BUNJANG_API}?q=${encodeURIComponent(q)}&order=date&n=${FETCH_N}&page=0`;
        return fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
            'Referer': 'https://bunjang.co.kr/',
            'Origin': 'https://bunjang.co.kr',
          },
          signal: AbortSignal.timeout(10000),
        }).then(r => r.ok ? r.json() : { list: [] }).then(data => ({ data, kw }));
      })
    );

    // 중복 제거 (pid 기준): alias가 상품명에 정확히 매칭되어야 통과
    const seen = new Set();
    const items = [];
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const { data, kw } = r.value;
      for (const p of (data.list || [])) {
        if (seen.has(p.pid)) continue;
          // alias가 상품명에 정확히 매칭되어야 통과 (단어 경계 + 한글 경계 포함)
        if (!matchesArtist({ name: p.name }, aliases)) continue;
        seen.add(p.pid);
        items.push({
          id:         p.pid,
          name:       p.name,
          price:      parseInt(p.price, 10) || 0,
          imageUrl:   p.product_image
            ? p.product_image.replace('{res}', '360')
            : '',
          updatedAt:  p.update_time || 0,
          status:     p.status,
        });
      }
    }

    const isConcertNoise = item => {
      const n = item.name || '';
      return /티켓/.test(n) || /\d+열/.test(n) || /구역/.test(n);
    };
    const isWanted = item => /구함|구해요|구합니다/.test(item.name || '');
    const live = items
      .filter(i => (i.status === '0' || i.status === 0) && !isExcludedResult(i, artist) && !isWanted(i) && !(eventType === 'concert' && isConcertNoise(i)))
      .sort((a, b) => b.updatedAt - a.updatedAt);

    const itemsOut = live.slice(0, n).map(item => ({
      ...withUsdPrice(item),
      displayName: item.name || '',
    }));

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=120');
    return res.status(200).json({ artist, items: itemsOut });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
};
