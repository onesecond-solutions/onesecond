/* scripts/verify_silson_shared.mjs — 실손 변천사 공개본↔SPA 자동 대조 검수 (대표 명시 요구 2026-07-26)
   ────────────────────────────────────────────────────────────────────────────
   목적: 공개본(insurance/silson-history/index.html, 무접촉)과 SPA D영역 공용 모듈
   (js/silson-history.js)이 "문구·표·세대 데이터·본문 마크업"을 동일하게 렌더하는지 자동 비교한다.
   하나라도 어긋나면 non-zero exit. 공개본을 손대지 않으므로 이 스크립트가 두 원천의 동일성을 계속 보증한다.

   대조 항목:
     [A] SL_COLS / SL_ROWS (세대 컬럼 + 행 데이터)  → deep-equal
     [B] 본문 마크업(.doc-body 내부 vs 모듈 BODY_HTML) → 정규화(주석·onclick·태그간공백 제거) 동일
     [C] 비교표 렌더(공개본 drawSlCmp vs 모듈 drawCmp 출력) → 정규화 동일

   실행: node scripts/verify_silson_shared.mjs   (동일 → "PASS" + exit 0 / 불일치 → 상세 + exit 1)
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULE_PATH = path.join(ROOT, 'js', 'silson-history.js');
const PUBLIC_PATH = path.join(ROOT, 'insurance', 'silson-history', 'index.html');

const fails = [];
function check(name, ok, detail) {
  if (ok) { console.log('  ✓ ' + name); }
  else { console.log('  ✗ ' + name); if (detail) console.log(detail); fails.push(name); }
}

/* 정규화: HTML 주석·onclick 속성·태그 사이/내부 공백 제거 → 렌더에 무관한 차이 흡수 */
function norm(h) {
  return String(h)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\son(?:click)="[^"]*"/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .replace(/>\s+/g, '>').replace(/\s+</g, '<')
    .trim();
}
function firstDiff(a, b) {
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return '    module: ' + JSON.stringify(a.slice(Math.max(0, i - 60), i + 60)) + '\n' +
         '    public: ' + JSON.stringify(b.slice(Math.max(0, i - 60), i + 60));
}

/* ── 1) 모듈 로드 → SL_COLS/SL_ROWS + BODY_HTML + 표 출력 캡처 ── */
const modSrc = fs.readFileSync(MODULE_PATH, 'utf8');
globalThis.window = {};
new Function(modSrc)();
const M = globalThis.window.SilsonHistory;
if (!M) { console.error('FAIL: window.SilsonHistory 미등록 (모듈 로드 실패)'); process.exit(2); }

const cap = {};
const cardsEl = { set innerHTML(v) { cap.cards = v; } };
const tableEl = { set innerHTML(v) { cap.table = v; } };
const moduleRoot = {
  classList: { add() {} },
  set innerHTML(v) { cap.body = v; },
  querySelector(sel) { return sel === '#cmpCards' ? cardsEl : (sel === '#cmpTable' ? tableEl : null); },
  querySelectorAll() { return []; }
};
M.renderInto(moduleRoot);   /* cap.body = BODY_HTML(빈 표 컨테이너), cap.cards/cap.table = 렌더된 표 */

/* ── 2) 공개본 파싱 → SL_COLS/SL_ROWS + drawSlCmp 실제 실행 + .doc-body 마크업 ── */
const pub = fs.readFileSync(PUBLIC_PATH, 'utf8');

const dataStart = pub.indexOf('const SL_COLS=');
const drawCall = pub.indexOf('drawSlCmp();');
if (dataStart < 0 || drawCall < 0) { console.error('FAIL: 공개본에서 SL_COLS/drawSlCmp 위치를 못 찾음'); process.exit(2); }
const scriptSlice = pub.slice(dataStart, drawCall);   /* const SL_COLS…const SL_ROWS…function drawSlCmp(){…} */

const pubCap = {};
const pubDoc = { getElementById(id) { return { set innerHTML(v) { pubCap[id] = v; } }; } };
const sandbox = {};
new Function('document', 'sandbox', scriptSlice + '\ndrawSlCmp();\nsandbox.SL_COLS=SL_COLS;sandbox.SL_ROWS=SL_ROWS;')(pubDoc, sandbox);

/* .doc-body 내부 마크업 */
const bStart = pub.indexOf('<div class="doc-body">') + '<div class="doc-body">'.length;
const bEnd = pub.indexOf('</div><!-- /.doc-body -->');
if (bStart < '<div class="doc-body">'.length || bEnd < 0) { console.error('FAIL: 공개본 .doc-body 경계를 못 찾음'); process.exit(2); }
const publicBody = pub.slice(bStart, bEnd);

/* ── 3) 대조 ── */
console.log('실손 공개본↔SPA 자동 대조 — 공개본(insurance/silson-history/index.html) vs 모듈(js/silson-history.js)');

check('[A] SL_COLS deep-equal', JSON.stringify(M.SL_COLS) === JSON.stringify(sandbox.SL_COLS),
  '    ' + JSON.stringify({ module: M.SL_COLS, public: sandbox.SL_COLS }));
check('[A] SL_ROWS deep-equal', JSON.stringify(M.SL_ROWS) === JSON.stringify(sandbox.SL_ROWS));

{
  const a = norm(cap.body), b = norm(publicBody);
  check('[B] 본문 마크업 동일(.doc-body)', a === b, a === b ? '' : firstDiff(a, b));
}
{
  const a = norm(cap.cards), b = norm(pubCap.cmpCards);
  check('[C] 비교표(모바일 카드) 동일', a === b, a === b ? '' : firstDiff(a, b));
}
{
  const a = norm(cap.table), b = norm(pubCap.cmpTable);
  check('[C] 비교표(PC 표) 동일', a === b, a === b ? '' : firstDiff(a, b));
}

/* ── [D] 우측 레일 스캐폴딩(블록·버튼·라벨) 동일 ──
   공개본 #v3side(side.innerHTML=…)와 모듈 renderRailInto(railEl.innerHTML=…)의 템플릿에서 따옴표 문자열
   리터럴만 추출·연결해 비교한다. 동적부(목차=본문 .section-t·관련=원장)는 따옴표 밖 변수라 제외 →
   순수 스캐폴딩(목차/이 자료 활용/함께 보면 좋은 자료 라벨 + PDF·링크복사 버튼)이 글자까지 같은지 확인.
   (목차 항목·관련자료는 각각 본문 .section-t[B]·공유 원장에서 나오므로 별도 데이터 대조 불필요.) */
function railTpl(src, marker) {
  const i = src.indexOf(marker);
  if (i < 0) return null;
  const semi = src.indexOf(';', i);
  const expr = src.slice(i + marker.length, semi < 0 ? undefined : semi);
  const lits = expr.match(/'((?:[^'\\]|\\.)*)'/g) || [];
  return lits.join('');
}
{
  const modRail = railTpl(modSrc, 'railEl.innerHTML =');
  const pubRail = railTpl(pub, 'side.innerHTML =');
  const ok = modRail != null && pubRail != null && modRail === pubRail;
  check('[D] 우측 레일 스캐폴딩(목차·이 자료 활용·함께 보면 좋은 자료) 동일', ok,
    ok ? '' : ('    module: ' + JSON.stringify(modRail) + '\n    public: ' + JSON.stringify(pubRail)));
}

if (fails.length) {
  console.error('\nFAIL: ' + fails.length + '건 불일치 — 공개본과 모듈 원천이 어긋났습니다. 위 항목을 정합시키세요.');
  process.exit(1);
}
console.log('\nPASS: 공개본과 SPA 모듈이 데이터·문구·표·본문 마크업 모두 동일(공개본↔SPA 렌더 결과 자동 대조로 동일성 보장).');
process.exit(0);
