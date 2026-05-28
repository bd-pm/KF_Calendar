// api/goods.js — Vercel Serverless Function (CommonJS)
// 그룹명 + 공방/역조공/공방포/사녹 키워드로 번장 검색 → 최신순 반환
// GET /api/goods?artist=방탄소년단&n=30

const fs = require('fs');
const path = require('path');

const BUNJANG_API = 'https://api.bunjang.co.kr/api/1/find_v2.json';
const KEYWORDS = ['공방포', '역조공', '공방', '사녹'];
const KRW_PER_USD = 1300;
const STATIC_GOODS = {
  bts: 'goods-bts.json',
  seventeen: 'goods-seventeen.json',
  enhypen: 'goods-enhypen.json',
};

// 영문 공식명 → 한국어 표기 (번장에서 한국어로 등록된 상품명 매칭용)
const EN_TO_KR = {
  'NOWZ': '나우즈',
  'NAZE': '네이즈',
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
  'TXT': '투모로우바이투게더',
  'PLAVE': '플레이브',
  'ZEROBASEONE': '제로베이스원',
  'BOYNEXTDOOR': '보이넥스트도어',
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
  'YOUNG POSSE': '영파씨',
  'KATSEYE': '케이씨아이',
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

function parseGlobalProduct(html, id) {
  const escapedId = String(id).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = html.match(new RegExp(`pid\\\\?":${escapedId}[\\s\\S]{0,2500}?totalPriceGlobal\\\\?":([0-9.]+)`));
  if (!m) return {};

  const chunk = m[0];
  const nameEng = chunk.match(/nameEng\\?":"((?:\\.|[^"\\])*)"/);
  const priceGlobal = chunk.match(/priceGlobal\\?":([0-9.]+)/);
  const totalPriceGlobal = chunk.match(/totalPriceGlobal\\?":([0-9.]+)/);

  return {
    displayName: nameEng?.[1] ? cleanDisplayName(nameEng[1].replace(/\\"/g, '"')) : null,
    priceGlobal: priceGlobal ? Number(priceGlobal[1]) : null,
    totalPriceGlobal: totalPriceGlobal ? Number(totalPriceGlobal[1]) : null,
  };
}

async function resolveGlobalBunjangProduct(id, fallbackName) {
  try {
    const res = await fetch(`https://globalbunjang.com/product/${id}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return {};
    const html = await res.text();

    const globalProduct = parseGlobalProduct(html, id);

    const patterns = [
      /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
      /<h1[^>]*>([^<]+)<\/h1>/i,
      /<title>([^<]+)<\/title>/i,
    ];
    let displayName = globalProduct.displayName || null;
    for (const pattern of patterns) {
      const m = html.match(pattern);
      if (m && m[1]) {
        const cleaned = cleanDisplayName(m[1]);
        if (cleaned && !displayName) displayName = cleaned;
      }
    }

    return {
      ...globalProduct,
      displayName: displayName || null,
      displayPrice: formatUsdPrice(globalProduct.priceGlobal),
      currency: globalProduct.priceGlobal != null ? 'USD' : null,
    };
  } catch {}

  return {};
}

// 상품명에 artist(영문) 또는 krAlias(한국어)가 포함되는지 확인
// 한국어는 앞뒤 한글 경계 체크 (이즈나 ≠ 네이즈 오매칭 방지)
function nameMatchesArtist(productName, artist, krAlias) {
  // 영문: 단어 경계 기준
  const enRe = new RegExp(`(?<![\\w가-힣])${artist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w가-힣])`, 'i');
  if (enRe.test(productName)) return true;
  // 한국어 별칭: 앞뒤가 한글이 아닌 경계에서 매칭
  if (krAlias) {
    const krRe = new RegExp(`(?<![가-힣])${krAlias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![가-힣])`);
    if (krRe.test(productName)) return true;
  }
  return false;
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

  const n = Math.min(parseInt(req.query.n || '50', 10), 100);
  const krAlias = EN_TO_KR[artist] || null;

  try {
    // 영문명 + 소문자 + 한국어 별칭 각각 키워드 조합으로 검색
    const artistLower = artist.toLowerCase();
    const queries = [];
    for (const kw of KEYWORDS) {
      queries.push(`${artist} ${kw}`);
      if (artistLower !== artist) queries.push(`${artistLower} ${kw}`);
      if (krAlias) queries.push(`${krAlias} ${kw}`);
    }
    // 중복 쿼리 제거
    const uniqueQueries = [...new Set(queries)];

    const results = await Promise.allSettled(
      uniqueQueries.map(q => {
        const url = `${BUNJANG_API}?q=${encodeURIComponent(q)}&order=date&n=${n}&page=0`;
        return fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(10000),
        }).then(r => r.ok ? r.json() : { list: [] });
      })
    );

    // 중복 제거 (pid 기준), 최신순 정렬
    const seen = new Set();
    const items = [];
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      for (const p of (r.value.list || [])) {
        if (seen.has(p.pid)) continue;
        seen.add(p.pid);
        items.push({
          id:         p.pid,
          name:       p.name,
          price:      parseInt(p.price, 10) || 0,
          imageUrl:   p.product_image
            ? p.product_image.replace('{res}', '360')
            : '',
          updatedAt:  p.update_time || 0,
          status:     p.status, // '0'=판매중
        });
      }
    }

    // 판매중인 것만, 그룹명(영문/소문자/한국어 별칭) 포함 확인, 최신순
    const live = items
      .filter(i => i.status === '0' && (nameMatchesArtist(i.name, artist, krAlias) || nameMatchesArtist(i.name, artistLower, null)))
      .sort((a, b) => b.updatedAt - a.updatedAt);

    const visibleCount = Math.min(live.length, Math.max(1, n));
    const enriched = await Promise.all(
      live.slice(0, visibleCount).map(async item => {
        const globalProduct = await resolveGlobalBunjangProduct(item.id, item.name);
        return {
          ...withUsdPrice(item),
          ...globalProduct,
          displayName: globalProduct.displayName || item.name,
          displayPrice: globalProduct.displayPrice || formatUsdPrice(krwToGlobalUsd(item.price)),
          currency: 'USD',
        };
      })
    );
    const itemsOut = [...enriched, ...live.slice(visibleCount).map(withUsdPrice)];

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json({ artist, items: itemsOut });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
};
