/* scripts/verify_cancer_shared.mjs — 암주요치료비 변천사 "단일 원천" 자동 대조 검수
   ────────────────────────────────────────────────────────────────────────────
   공개본(insurance/cancer-treatment-history/index.html, 무접촉)과 SPA 공용 모듈(js/cancer-treatment.js)이
   데이터·본문 마크업·비교표/세대카드/심층패널·우측 레일을 동일하게 렌더하는지 자동 비교. 불일치 시 non-zero exit.

   대조: [A] CT_COLS/CT_ROWS/GENS deep-equal · [B] 본문 마크업(.doc-body) · [C] 렌더 결과(cmpCards/cmpTable/gens/deep) · [D] 레일 스캐폴딩
   실행: node scripts/verify_cancer_shared.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULE_PATH = path.join(ROOT, 'js', 'cancer-treatment.js');
const PUBLIC_PATH = path.join(ROOT, 'insurance', 'cancer-treatment-history', 'index.html');

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

/* ── 1) 모듈 로드 → 데이터 + BODY_HTML + cmpCards/cmpTable/gens/deep 캡처 ── */
const modSrc = fs.readFileSync(MODULE_PATH, 'utf8');
globalThis.window = {};
new Function(modSrc)();
const M = globalThis.window.CancerTreatment;
if (!M) { console.error('FAIL: window.CancerTreatment 미등록'); process.exit(2); }

const mcap = {};
const mEls = { '#cmpCards': capEl(mcap, 'cards'), '#cmpTable': capEl(mcap, 'table'), '#gens': capEl(mcap, 'gens'), '#deep': capEl(mcap, 'deep') };
const mRoot = {
  classList: { add() {} },
  set innerHTML(v) { mcap.body = v; },
  querySelector(sel) { return mEls[sel] || null; },
  querySelectorAll() { return []; }
};
M.renderInto(mRoot);

/* ── 2) 공개본 인라인 실행(shim) + .doc-body 추출 ── */
const pub = fs.readFileSync(PUBLIC_PATH, 'utf8');
const dataStart = pub.indexOf('const CT_COLS=');
const iifeStart = pub.indexOf('(function(){', dataStart);   // V3 IIFE 시작
if (dataStart < 0 || iifeStart < 0) { console.error('FAIL: 공개본에서 CT_COLS/V3 경계를 못 찾음'); process.exit(2); }
const scriptSlice = pub.slice(dataStart, iifeStart);   // CT_COLS…renderCancerTreatmentHistory(); + addEventListener

const pcap = {};
const pEls = { cmpCards: capEl(pcap, 'cards'), cmpTable: capEl(pcap, 'table'), gens: capEl(pcap, 'gens'), deep: capEl(pcap, 'deep') };
const pubDoc = { getElementById(id) { return pEls[id] || null; }, addEventListener() {} };
const sandbox = {};
new Function('document', 'sandbox', scriptSlice + '\nsandbox.CT_COLS=CT_COLS;sandbox.CT_ROWS=CT_ROWS;sandbox.GENS=GENS;')(pubDoc, sandbox);

const bStart = pub.indexOf('<div class="doc-body">') + '<div class="doc-body">'.length;
const bEnd = pub.indexOf('</div><!-- /.doc-body -->');
const publicBody = pub.slice(bStart, bEnd);

/* ── 3) 대조 ── */
console.log('암 공개본↔SPA 자동 대조 — 공개본(insurance/cancer-treatment-history/index.html) vs 모듈(js/cancer-treatment.js)');
check('[A] CT_COLS deep-equal', JSON.stringify(M.CT_COLS) === JSON.stringify(sandbox.CT_COLS));
check('[A] CT_ROWS deep-equal', JSON.stringify(M.CT_ROWS) === JSON.stringify(sandbox.CT_ROWS));
check('[A] GENS deep-equal', JSON.stringify(M.GENS) === JSON.stringify(sandbox.GENS));
{ const a = norm(mcap.body), b = norm(publicBody); check('[B] 본문 마크업 동일(.doc-body)', a === b, a === b ? '' : firstDiff(a, b)); }
{ const a = norm(mcap.cards), b = norm(pcap.cards); check('[C] 비교표(모바일 카드) 동일', a === b, a === b ? '' : firstDiff(a, b)); }
{ const a = norm(mcap.table), b = norm(pcap.table); check('[C] 비교표(PC 표) 동일', a === b, a === b ? '' : firstDiff(a, b)); }
{ const a = norm(mcap.gens), b = norm(pcap.gens); check('[C] 세대 카드(초기 5세대 선택) 동일', a === b, a === b ? '' : firstDiff(a, b)); }
{ const a = norm(mcap.deep), b = norm(pcap.deep); check('[C] 심층 패널 동일', a === b, a === b ? '' : firstDiff(a, b)); }

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
console.log('\nPASS: 공개본과 SPA 모듈이 데이터·문구·표·세대카드·심층패널·레일 모두 동일(자동 대조로 동일성 보장).');
process.exit(0);
