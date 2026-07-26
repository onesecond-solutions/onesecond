/* scripts/verify_caregiver_shared.mjs — 간병보험 변천사 "단일 원천" 자동 대조 검수
   ────────────────────────────────────────────────────────────────────────────
   공개본(insurance/caregiver-history/index.html, 무접촉)과 SPA 공용 모듈(js/caregiver-history.js)이
   데이터·본문 마크업·비교표·체크리스트·우측 레일을 동일하게 렌더하는지 자동 비교. 불일치 시 non-zero exit.

   대조: [A] COLS/ROWS/CHK deep-equal · [B] 본문 마크업(.doc-body) · [C] 렌더 결과(cmpCards/cmpTable/chk) · [D] 레일 스캐폴딩
   실행: node scripts/verify_caregiver_shared.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULE_PATH = path.join(ROOT, 'js', 'caregiver-history.js');
const PUBLIC_PATH = path.join(ROOT, 'insurance', 'caregiver-history', 'index.html');

const fails = [];
function check(name, ok, detail) {
  if (ok) console.log('  ✓ ' + name);
  else { console.log('  ✗ ' + name); if (detail) console.log(detail); fails.push(name); }
}
function norm(h) {
  return String(h).replace(/<!--[\s\S]*?-->/g, '').replace(/\son(?:click)="[^"]*"/g, '')
    .replace(/>\s+</g, '><').replace(/\s+/g, ' ').replace(/>\s+/g, '>').replace(/\s+</g, '<').trim();
}
function firstDiff(a, b) {
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return '    module: ' + JSON.stringify(a.slice(Math.max(0, i - 60), i + 60)) + '\n' +
         '    public: ' + JSON.stringify(b.slice(Math.max(0, i - 60), i + 60));
}
function capEl(store, key) {
  return { set innerHTML(v) { store[key] = v; }, get innerHTML() { return store[key]; }, querySelectorAll() { return []; } };
}

/* ── 1) 모듈 로드 → 데이터 + BODY_HTML + cmpCards/cmpTable/chk 캡처 ── */
const modSrc = fs.readFileSync(MODULE_PATH, 'utf8');
globalThis.window = {};
new Function(modSrc)();
const M = globalThis.window.CaregiverHistory;
if (!M) { console.error('FAIL: window.CaregiverHistory 미등록'); process.exit(2); }

const mcap = {};
const mEls = { '#cmpCards': capEl(mcap, 'cards'), '#cmpTable': capEl(mcap, 'table'), '#chk': capEl(mcap, 'chk') };
const mRoot = {
  classList: { add() {} },
  set innerHTML(v) { mcap.body = v; },
  querySelector(sel) { return mEls[sel] || null; },
  querySelectorAll() { return []; }
};
M.renderInto(mRoot);

/* ── 2) 공개본 인라인 실행(shim) + .doc-body 추출 ── */
const pub = fs.readFileSync(PUBLIC_PATH, 'utf8');
const dataStart = pub.indexOf('const COLS=');
const iifeStart = pub.indexOf('(function(){', dataStart);
if (dataStart < 0 || iifeStart < 0) { console.error('FAIL: 공개본에서 COLS/V3 경계를 못 찾음'); process.exit(2); }
const scriptSlice = pub.slice(dataStart, iifeStart);   // COLS/ROWS + cmpCards/cmpTable 직접 채움 + CHK + chk 채움

const pcap = {};
const pEls = { cmpCards: capEl(pcap, 'cards'), cmpTable: capEl(pcap, 'table'), chk: capEl(pcap, 'chk') };
const pubDoc = { getElementById(id) { return pEls[id] || null; }, addEventListener() {} };
const sandbox = {};
new Function('document', 'sandbox', scriptSlice + '\nsandbox.COLS=COLS;sandbox.ROWS=ROWS;sandbox.CHK=CHK;')(pubDoc, sandbox);

const bStart = pub.indexOf('<div class="doc-body">') + '<div class="doc-body">'.length;
const bEnd = pub.indexOf('</div><!-- /.doc-body -->');
const publicBody = pub.slice(bStart, bEnd);

/* ── 3) 대조 ── */
console.log('간병 공개본↔SPA 자동 대조 — 공개본(insurance/caregiver-history/index.html) vs 모듈(js/caregiver-history.js)');
check('[A] COLS deep-equal', JSON.stringify(M.COLS) === JSON.stringify(sandbox.COLS));
check('[A] ROWS deep-equal', JSON.stringify(M.ROWS) === JSON.stringify(sandbox.ROWS));
check('[A] CHK deep-equal', JSON.stringify(M.CHK) === JSON.stringify(sandbox.CHK));
{ const a = norm(mcap.body), b = norm(publicBody); check('[B] 본문 마크업 동일(.doc-body)', a === b, a === b ? '' : firstDiff(a, b)); }
{ const a = norm(mcap.cards), b = norm(pcap.cards); check('[C] 비교표(모바일 카드) 동일', a === b, a === b ? '' : firstDiff(a, b)); }
{ const a = norm(mcap.table), b = norm(pcap.table); check('[C] 비교표(PC 표) 동일', a === b, a === b ? '' : firstDiff(a, b)); }
{ const a = norm(mcap.chk), b = norm(pcap.chk); check('[C] 체크리스트(8항목) 동일', a === b, a === b ? '' : firstDiff(a, b)); }

function railTpl(src, marker) {
  const i = src.indexOf(marker); if (i < 0) return null;
  const semi = src.indexOf(';', i);
  const expr = src.slice(i + marker.length, semi < 0 ? undefined : semi);
  return (expr.match(/'((?:[^'\\]|\\.)*)'/g) || []).join('');
}
{
  const modRail = railTpl(modSrc, 'railEl.innerHTML =');
  const pubRail = railTpl(pub, 'side.innerHTML =');
  const ok = modRail != null && pubRail != null && modRail === pubRail;
  check('[D] 우측 레일 스캐폴딩 동일', ok, ok ? '' : ('    module: ' + JSON.stringify(modRail) + '\n    public: ' + JSON.stringify(pubRail)));
}

if (fails.length) { console.error('\nFAIL: ' + fails.length + '건 불일치 — 공개본과 모듈 원천이 어긋났습니다.'); process.exit(1); }
console.log('\nPASS: 공개본과 SPA 모듈이 데이터·문구·본문·비교표·체크리스트·레일 모두 동일(자동 대조로 동일성 보장).');
process.exit(0);
