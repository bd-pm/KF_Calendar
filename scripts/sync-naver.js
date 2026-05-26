// scripts/sync-naver.js
// 로컬 실행: node scripts/sync-naver.js [--since YYYY-MM-DD] [--backfill] [--debug]
// 예) node scripts/sync-naver.js --since 2026-04-01 --backfill

// dotenv 선택적 로드 (.env → .env.local 순서)
const path = require('path');
try { require('dotenv').config({ path: path.join(__dirname, '../.env') }); } catch {}
try { require('dotenv').config({ path: path.join(__dirname, '../.env.local'), override: true }); } catch {}

const handler = require('../api/sync-naver');

const args   = process.argv.slice(2);
const since  = args.includes('--since')  ? args[args.indexOf('--since') + 1]  : null;
const debug  = args.includes('--debug')  ? '1' : '0';
const backfill = args.includes('--backfill') ? '1' : '0';

const fakeReq = {
  headers: { authorization: `Bearer ${process.env.SYNC_SECRET || ''}` },
  query: { since, debug, backfill },
};
const fakeRes = {
  status(code) { this._code = code; return this; },
  json(data) {
    console.log('HTTP', this._code);
    console.log(JSON.stringify(data, null, 2));
  },
};

handler(fakeReq, fakeRes).catch(console.error);
