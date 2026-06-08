// goods/fandom-names.js
// 그룹별 공식 팬덤명 사전
// key: 그룹 공식 영문명 (EN_TO_KR / GROUP_SLUGS 기준에 맞춤)
// fandom.en  : 영문 공식 팬덤명
// fandom.kr  : 한국어 팬덤명 (팬덤존 표기에 쓰이는 것)
// fandom.zone: 콘서트 팬덤존 표기 변형 목록 (e.g. "아미존", "ARMY ZONE")
// fandom.aliases: 번장/중고 매물 제목에 자주 등장하는 변형 표기
//
// 출처 기준: 소속사 공식 발표 팬덤명.
// 투어별 Zone 이름은 별도 concert-keywords.js에서 관리.

const FANDOM_DICT = {

  // ──────────────────────────────────────────────────────
  // HYBE
  // ──────────────────────────────────────────────────────
  BTS: {
    krName: '방탄소년단',
    fandom: {
      en: 'ARMY',
      kr: '아미',
      zone: ['아미존', 'ARMY ZONE', 'Army Zone', 'ARMY ZONE Seoul'],
      aliases: ['아미', 'ARMY', 'army'],
    },
  },

  'TOMORROW X TOGETHER': {
    krName: '투모로우바이투게더',
    aliases_group: ['TXT'],
    fandom: {
      en: 'MOA',
      kr: '모아',
      zone: ['모아존', 'MOA ZONE', 'Moa Zone'],
      aliases: ['모아', 'MOA', 'moa'],
    },
  },

  ENHYPEN: {
    krName: '엔하이픈',
    fandom: {
      en: 'ENGENE',
      kr: '엔진',
      zone: ['엔진존', 'ENGENE ZONE', 'Engene Zone'],
      aliases: ['엔진', 'ENGENE', 'engene'],
    },
  },

  ILLIT: {
    krName: '아일릿',
    fandom: {
      en: 'LLIT',
      kr: '릿',
      zone: ['릿존', 'LLIT ZONE'],
      aliases: ['릿', 'LLIT', 'llit'],
    },
  },

  'LE SSERAFIM': {
    krName: '르세라핌',
    fandom: {
      en: 'FEARNOT',
      kr: '피어낫',
      zone: ['피어낫존', 'FEARNOT ZONE', 'Fearnot Zone'],
      aliases: ['피어낫', 'FEARNOT', 'fearnot'],
    },
  },

  // ──────────────────────────────────────────────────────
  // SM Entertainment
  // ──────────────────────────────────────────────────────
  'NCT 127': {
    krName: 'NCT 127',
    fandom: {
      en: 'NCTzen',
      kr: 'NCTzen',
      zone: ['NCTzen ZONE', 'NCTzen존'],
      aliases: ['엔시티즌', 'NCTzen', 'nctzen'],
    },
  },

  'NCT DREAM': {
    krName: 'NCT DREAM',
    fandom: {
      en: 'NCTzen / DREAM',
      kr: 'NCTzen / 드림',
      zone: ['드림존', 'DREAM ZONE', 'NCTzen ZONE'],
      aliases: ['엔시티즌', 'NCTzen', 'nctzen', '드림'],
    },
  },

  'NCT WISH': {
    krName: 'NCT WISH',
    fandom: {
      en: 'WISH',
      kr: '위시',
      zone: ['위시존', 'WISH ZONE'],
      aliases: ['위시', 'WISH', 'wish'],
    },
  },

  NCT: {
    krName: 'NCT',
    fandom: {
      en: 'NCTzen',
      kr: 'NCTzen',
      zone: ['NCTzen ZONE', 'NCTzen존'],
      aliases: ['엔시티즌', 'NCTzen', 'nctzen'],
    },
  },

  aespa: {
    krName: '에스파',
    fandom: {
      en: 'MY',
      kr: '마이',
      zone: ['마이존', 'MY ZONE', 'My Zone'],
      aliases: ['마이', 'MY', 'my'],
    },
  },

  RIIZE: {
    krName: '라이즈',
    fandom: {
      en: 'BRIIZE',
      kr: '브리즈',
      zone: ['브리즈존', 'BRIIZE ZONE'],
      aliases: ['브리즈', 'BRIIZE', 'briize'],
    },
  },

  'Red Velvet': {
    krName: '레드벨벳',
    fandom: {
      en: 'ReVeluv',
      kr: '레베럽',
      zone: ['레베럽존', 'ReVeluv ZONE', 'ReVeluv Zone'],
      aliases: ['레베럽', 'ReVeluv', 'reveluve', 'reveluv'],
    },
  },

  SHINee: {
    krName: '샤이니',
    fandom: {
      en: 'Shawol',
      kr: '샤월',
      zone: ['샤월존', 'Shawol ZONE', 'SHAWOL ZONE'],
      aliases: ['샤월', 'Shawol', 'shawol', 'SHAWOL'],
    },
  },

  'SUPER JUNIOR': {
    krName: '슈퍼주니어',
    fandom: {
      en: 'E.L.F.',
      kr: '엘프',
      zone: ['엘프존', 'E.L.F. ZONE', 'ELF ZONE'],
      aliases: ['엘프', 'ELF', 'elf', 'E.L.F'],
    },
  },

  // ──────────────────────────────────────────────────────
  // JYP Entertainment
  // ──────────────────────────────────────────────────────
  TWICE: {
    krName: '트와이스',
    fandom: {
      en: 'ONCE',
      kr: '원스',
      zone: ['원스존', 'ONCE ZONE', 'Once Zone'],
      aliases: ['원스', 'ONCE', 'once'],
    },
  },

  'Stray Kids': {
    krName: '스트레이키즈',
    fandom: {
      en: 'STAY',
      kr: '스테이',
      zone: ['스테이존', 'STAY ZONE', 'Stay Zone'],
      aliases: ['스테이', 'STAY', 'stay'],
    },
  },

  ITZY: {
    krName: '있지',
    fandom: {
      en: 'MIDZY',
      kr: '믿지',
      zone: ['믿지존', 'MIDZY ZONE', 'Midzy Zone'],
      aliases: ['믿지', 'MIDZY', 'midzy'],
    },
  },

  NMIXX: {
    krName: 'NMIXX',
    fandom: {
      en: 'NSWER',
      kr: '엔서',
      zone: ['엔서존', 'NSWER ZONE'],
      aliases: ['엔서', 'NSWER', 'nswer'],
    },
  },

  DAY6: {
    krName: '데이식스',
    fandom: {
      en: 'MY DAY',
      kr: '마이데이',
      zone: ['마이데이존', 'MY DAY ZONE', 'MyDay Zone'],
      aliases: ['마이데이', 'MY DAY', 'MYDAY', 'myday'],
    },
  },

  // ──────────────────────────────────────────────────────
  // YG Entertainment
  // ──────────────────────────────────────────────────────
  BLACKPINK: {
    krName: '블랙핑크',
    fandom: {
      en: 'BLINK',
      kr: '블링크',
      zone: ['블링크존', 'BLINK ZONE', 'Blink Zone'],
      aliases: ['블링크', 'BLINK', 'blink'],
    },
  },

  TREASURE: {
    krName: '트레저',
    fandom: {
      en: 'TREASURE MAKER',
      kr: '트메',
      zone: ['트메존', 'TREASURE MAKER ZONE', 'TMAKER ZONE'],
      aliases: ['트메', 'TREASURE MAKER', 'tmaker', 'TMAKER'],
    },
  },

  BABYMONSTER: {
    krName: '베이비몬스터',
    fandom: {
      en: 'MONSTERA',
      kr: '몬스테라',
      zone: ['몬스테라존', 'MONSTERA ZONE', 'Monstera Zone'],
      aliases: ['몬스테라', 'MONSTERA', 'monstera'],
    },
  },

  // ──────────────────────────────────────────────────────
  // PLEDIS / HYBE
  // ──────────────────────────────────────────────────────
  SEVENTEEN: {
    krName: '세븐틴',
    fandom: {
      en: 'CARAT',
      kr: '캐럿',
      zone: ['캐럿존', 'CARAT ZONE', 'Carat Zone'],
      aliases: ['캐럿', 'CARAT', 'carat'],
    },
  },

  // ──────────────────────────────────────────────────────
  // Kakao Entertainment / STARSHIP
  // ──────────────────────────────────────────────────────
  IVE: {
    krName: '아이브',
    fandom: {
      en: 'DIVE',
      kr: '다이브',
      zone: ['다이브존', 'DIVE ZONE', 'Dive Zone'],
      aliases: ['다이브', 'DIVE', 'dive'],
    },
  },

  'MONSTA X': {
    krName: '몬스타엑스',
    fandom: {
      en: 'MONBEBE',
      kr: '몬베베',
      zone: ['몬베베존', 'MONBEBE ZONE'],
      aliases: ['몬베베', 'MONBEBE', 'monbebe'],
    },
  },

  // ──────────────────────────────────────────────────────
  // Source Music / HYBE
  // ──────────────────────────────────────────────────────
  // LE SSERAFIM already above

  // ──────────────────────────────────────────────────────
  // BELIFT LAB / HYBE
  // ──────────────────────────────────────────────────────
  // ENHYPEN already above

  // ──────────────────────────────────────────────────────
  // KQ Entertainment
  // ──────────────────────────────────────────────────────
  ATEEZ: {
    krName: '에이티즈',
    fandom: {
      en: 'ATINY',
      kr: '에이티니',
      zone: ['에이티니존', 'ATINY ZONE', 'Atiny Zone'],
      aliases: ['에이티니', 'ATINY', 'atiny'],
    },
  },

  // ──────────────────────────────────────────────────────
  // Cube Entertainment
  // ──────────────────────────────────────────────────────
  '(G)I-DLE': {
    krName: '여자아이들',
    fandom: {
      en: 'NEVERLAND',
      kr: '네버랜드',
      zone: ['네버랜드존', 'NEVERLAND ZONE', 'Neverland Zone'],
      aliases: ['네버랜드', 'NEVERLAND', 'neverland'],
    },
  },

  BTOB: {
    krName: '비투비',
    fandom: {
      en: 'MELODY',
      kr: '멜로디',
      zone: ['멜로디존', 'MELODY ZONE'],
      aliases: ['멜로디', 'MELODY', 'melody'],
    },
  },

  // ──────────────────────────────────────────────────────
  // Woollim Entertainment
  // ──────────────────────────────────────────────────────
  INFINITE: {
    krName: '인피니트',
    fandom: {
      en: 'Inspirit',
      kr: '인스피릿',
      zone: ['인스피릿존', 'Inspirit ZONE', 'INSPIRIT ZONE'],
      aliases: ['인스피릿', 'Inspirit', 'inspirit', 'INSPIRIT'],
    },
  },

  // ──────────────────────────────────────────────────────
  // FNC Entertainment
  // ──────────────────────────────────────────────────────
  'Xdinary Heroes': {
    krName: '엑스디너리히어로즈',
    fandom: {
      en: 'VILLAINS',
      kr: '빌런즈',
      zone: ['빌런즈존', 'VILLAINS ZONE'],
      aliases: ['빌런즈', 'VILLAINS', 'villains'],
    },
  },

  // ──────────────────────────────────────────────────────
  // IST Entertainment
  // ──────────────────────────────────────────────────────
  ASTRO: {
    krName: '아스트로',
    fandom: {
      en: 'AROHA',
      kr: '아로하',
      zone: ['아로하존', 'AROHA ZONE'],
      aliases: ['아로하', 'AROHA', 'aroha'],
    },
  },

  // ──────────────────────────────────────────────────────
  // RBW
  // ──────────────────────────────────────────────────────
  MAMAMOO: {
    krName: '마마무',
    fandom: {
      en: 'MooMoo',
      kr: '무무',
      zone: ['무무존', 'MooMoo ZONE', 'MOOMOO ZONE'],
      aliases: ['무무', 'MooMoo', 'moomoo', 'MOOMOO'],
    },
  },

  ONEUS: {
    krName: '원어스',
    fandom: {
      en: 'TO MOON',
      kr: '투문',
      zone: ['투문존', 'TO MOON ZONE'],
      aliases: ['투문', 'TO MOON', 'tomoon', 'TOMOON'],
    },
  },

  // ──────────────────────────────────────────────────────
  // Cre.ker Entertainment
  // ──────────────────────────────────────────────────────
  'THE BOYZ': {
    krName: '더보이즈',
    fandom: {
      en: 'THE B',
      kr: '더비',
      zone: ['더비존', 'THE B ZONE', 'THEB ZONE'],
      aliases: ['더비', 'THE B', 'THEB', 'theb'],
    },
  },

  // ──────────────────────────────────────────────────────
  // Wakeone / Swing
  // ──────────────────────────────────────────────────────
  ZEROBASEONE: {
    krName: '제로베이스원',
    fandom: {
      en: 'ZEROSE',
      kr: '제로즈',
      zone: ['제로즈존', 'ZEROSE ZONE', 'Zerose Zone'],
      aliases: ['제로즈', 'ZEROSE', 'zerose'],
    },
  },

  // ──────────────────────────────────────────────────────
  // HYBE Labels
  // ──────────────────────────────────────────────────────
  BOYNEXTDOOR: {
    krName: '보이넥스트도어',
    fandom: {
      en: 'NEIGHBOR',
      kr: '네이버',
      zone: ['네이버존', 'NEIGHBOR ZONE'],
      aliases: ['네이버', 'NEIGHBOR', 'neighbor'],
    },
  },

  TWS: {
    krName: '투어스',
    fandom: {
      en: 'TWSISH',
      kr: '투어시시',
      zone: ['투어시시존', 'TWSISH ZONE'],
      aliases: ['투어시시', 'TWSISH', 'twsish'],
    },
  },

  // ──────────────────────────────────────────────────────
  // VLAP / KAKAO
  // ──────────────────────────────────────────────────────
  PLAVE: {
    krName: '플레이브',
    fandom: {
      en: 'ASTERUM',
      kr: '아스테룸',
      zone: ['아스테룸존', 'ASTERUM ZONE'],
      aliases: ['아스테룸', 'ASTERUM', 'asterum'],
    },
  },

  // ──────────────────────────────────────────────────────
  // WM Entertainment
  // ──────────────────────────────────────────────────────
  'OH MY GIRL': {
    krName: '오마이걸',
    fandom: {
      en: 'Miracle',
      kr: '미라클',
      zone: ['미라클존', 'Miracle ZONE', 'MIRACLE ZONE'],
      aliases: ['미라클', 'Miracle', 'miracle', 'MIRACLE'],
    },
  },

  // ──────────────────────────────────────────────────────
  // P NATION
  // ──────────────────────────────────────────────────────
  'KISS OF LIFE': {
    krName: '키스오브라이프',
    fandom: {
      en: 'KISSY',
      kr: '키씨',
      zone: ['키씨존', 'KISSY ZONE'],
      aliases: ['키씨', 'KISSY', 'kissy'],
    },
  },

  // ──────────────────────────────────────────────────────
  // MMO / iNSO / 기타
  // ──────────────────────────────────────────────────────
  'H1-KEY': {
    krName: '하이키',
    fandom: {
      en: 'SWITH',
      kr: '스위스',
      zone: ['스위스존', 'SWITH ZONE'],
      aliases: ['스위스', 'SWITH', 'swith'],
    },
  },

  Billlie: {
    krName: '빌리',
    fandom: {
      en: 'belllie've',
      kr: '빌리브',
      zone: ['빌리브존', "belllie've ZONE"],
      aliases: ['빌리브', "belllie've", 'billieve'],
    },
  },

  VIVIZ: {
    krName: '비비지',
    fandom: {
      en: 'NAVILLERA',
      kr: '나빌레라',
      zone: ['나빌레라존', 'NAVILLERA ZONE'],
      aliases: ['나빌레라', 'NAVILLERA', 'navillera'],
    },
  },

  BIBI: {
    krName: '비비',
    fandom: {
      en: 'BEBE',
      kr: '베베',
      zone: ['베베존', 'BEBE ZONE'],
      aliases: ['베베', 'BEBE', 'bebe'],
    },
  },

  P1Harmony: {
    krName: '피원하모니',
    fandom: {
      en: 'P1ECE',
      kr: '피원스',
      zone: ['피원스존', 'P1ECE ZONE'],
      aliases: ['피원스', 'P1ECE', 'p1ece'],
    },
  },

  'YOUNG POSSE': {
    krName: '영파씨',
    fandom: {
      en: 'POSSE',
      kr: '포시',
      zone: ['포시존', 'POSSE ZONE'],
      aliases: ['포시', 'POSSE', 'posse'],
    },
  },

  CRAVITY: {
    krName: '크래비티',
    fandom: {
      en: 'LUVITY',
      kr: '러비티',
      zone: ['러비티존', 'LUVITY ZONE'],
      aliases: ['러비티', 'LUVITY', 'luvity'],
    },
  },

  XIKERS: {
    krName: '자이커스',
    fandom: {
      en: 'XIKE',
      kr: '자이크',
      zone: ['자이크존', 'XIKE ZONE'],
      aliases: ['자이크', 'XIKE', 'xike'],
    },
  },

  Kep1er: {
    krName: '케플러',
    fandom: {
      en: 'KEPPY',
      kr: '케피',
      zone: ['케피존', 'KEPPY ZONE'],
      aliases: ['케피', 'KEPPY', 'keppy'],
    },
  },

  EVNNE: {
    krName: '이븐',
    fandom: {
      en: 'EVEN',
      kr: '이븐',
      zone: ['이븐존', 'EVEN ZONE'],
      aliases: ['이븐', 'EVEN', 'even'],
    },
  },

  'AMPERS&ONE': {
    krName: '앰퍼샌드원',
    fandom: {
      en: 'AMPERSONE',
      kr: '앰퍼원',
      zone: ['앰퍼원존', 'AMPERSONE ZONE'],
      aliases: ['앰퍼원', 'AMPERSONE', 'ampersone'],
    },
  },

  NEXZ: {
    krName: '넥스지',
    fandom: {
      en: 'NEXZEN',
      kr: '넥스젠',
      zone: ['넥스젠존', 'NEXZEN ZONE'],
      aliases: ['넥스젠', 'NEXZEN', 'nexzen'],
    },
  },

  KATSEYE: {
    krName: '캣츠아이',
    fandom: {
      en: 'EYE',
      kr: '아이',
      zone: ['아이존', 'EYE ZONE'],
      aliases: ['아이', 'EYE', 'eye'],
    },
  },

  'Queenz Eye': {
    krName: '퀸즈아이',
    fandom: {
      en: 'QUEEN',
      kr: '퀸',
      zone: ['퀸존', 'QUEEN ZONE'],
      aliases: ['퀸', 'QUEEN', 'queen', 'Queenzeye'],
    },
  },

  '&TEAM': {
    krName: '앤팀',
    fandom: {
      en: 'LUV',
      kr: '러브',
      zone: ['러브존', 'LUV ZONE'],
      aliases: ['러브', 'LUV', 'luv'],
    },
  },

  NOWZ: {
    krName: '나우즈',
    fandom: {
      en: null, // 공식 팬덤명 미정 또는 미확인
      kr: null,
      zone: [],
      aliases: ['나우즈', 'NOWZ'],
    },
  },

  NAZE: {
    krName: '네이즈',
    fandom: {
      en: null,
      kr: null,
      zone: [],
      aliases: ['네이즈', 'NAZE'],
    },
  },
};

// ──────────────────────────────────────────────────────
// 그룹 별칭 → 정규키 역방향 인덱스
// e.g. groupAliasMap['TXT'] === 'TOMORROW X TOGETHER'
// ──────────────────────────────────────────────────────
const groupAliasMap = {};
for (const [key, val] of Object.entries(FANDOM_DICT)) {
  groupAliasMap[key] = key;
  if (val.krName) groupAliasMap[val.krName] = key;
  for (const a of (val.aliases_group || [])) groupAliasMap[a] = key;
}

// 팬덤명(한/영) → 그룹키 역방향 인덱스
// e.g. fandomToGroup['ARMY'] === 'BTS'
const fandomToGroup = {};
for (const [key, val] of Object.entries(FANDOM_DICT)) {
  const f = val.fandom;
  if (!f) continue;
  if (f.en)  fandomToGroup[f.en.toUpperCase()]  = key;
  if (f.kr)  fandomToGroup[f.kr]                = key;
  for (const a of (f.aliases || [])) fandomToGroup[a.toUpperCase()] = key;
}

/**
 * 아티스트명(영/한/별칭)으로 fandom 정보를 반환
 * @param {string} artistName
 * @returns {{ en, kr, zone, aliases } | null}
 */
function getFandom(artistName) {
  const key = groupAliasMap[artistName] || groupAliasMap[String(artistName || '').trim()];
  return key ? (FANDOM_DICT[key]?.fandom ?? null) : null;
}

/**
 * 상품 제목에서 팬덤존 키워드를 감지해 그룹키를 반환
 * @param {string} title  — 상품명 (한/영 혼용)
 * @returns {string | null}  — FANDOM_DICT 키 (e.g. 'BTS') 또는 null
 */
function detectGroupFromTitle(title) {
  const t = String(title || '');
  for (const [groupKey, val] of Object.entries(FANDOM_DICT)) {
    const f = val.fandom;
    if (!f) continue;
    for (const zone of (f.zone || [])) {
      if (t.toLowerCase().includes(zone.toLowerCase())) return groupKey;
    }
    for (const alias of (f.aliases || [])) {
      if (alias.length >= 3 && t.toLowerCase().includes(alias.toLowerCase())) return groupKey;
    }
    if (val.krName && val.krName.length >= 2 && t.includes(val.krName)) return groupKey;
  }
  return null;
}

module.exports = { FANDOM_DICT, groupAliasMap, fandomToGroup, getFandom, detectGroupFromTitle };
