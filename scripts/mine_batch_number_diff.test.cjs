// mine-batch 숫자 diff 단위 테스트 (Phase F)
//   실행: node scripts/mine_batch_number_diff.test.cjs
//   ⚠️ 아래 numberTokens/diff 는 supabase/functions/mine-batch/index.ts 의 로직 미러본.
//       index.ts 의 numberTokens·runDeterministicDiff 숫자 비교를 바꾸면 여기도 동기화할 것.
//   목적: 비율(%)·금액·비정상·환각을 타입별로 정확히 가르는지 회귀 방지.
function numberTokens(text) {
  const plain = new Set(), percent = new Set(), currency = new Set(), abnormal = [];
  const normNum = (s) => { const n = Number(s); return Number.isFinite(n) ? String(n) : s; };
  let work = text;
  work = work.replace(/(?<![\d.])[$₩€£¥]?\s?\d{1,3},\d{4,}(?![\d])/g, (m) => { abnormal.push(m.trim()); return " "; });
  work = work.replace(/(?<![\d.])\d{1,3}(?:[, ]\d{3})*(?:\.\d+)?\s?%(?![\d])/g, (m) => { percent.add(normNum(m.replace(/[%,\s]/g, ""))); return " "; });
  work = work.replace(/[$₩€£¥]\s?\d{1,3}(?:[, ]\d{3})*(?:\.\d+)?(?![\d])/g, (m) => { currency.add(m.replace(/[$₩€£¥,\s]/g, "")); return " "; });
  work = work.replace(/(?<![\d.])\d{1,3}(?:[, \t]{1,2}\d{3})+(?:\.\d+)?(?![\d])/g, (m) => { plain.add(m.replace(/[, \t]/g, "")); return " "; });
  work = work.replace(/(?<![\d.])\d+(?:\.\d+)?(?![\d%])/g, (m) => { plain.add(m); return " "; });
  return { plain, percent, currency, abnormal };
}
function diff(raw, out) {
  const r = numberTokens(raw), o = numberTokens(out);
  const rMoney = new Set([...r.plain, ...r.currency]), oMoney = new Set([...o.plain, ...o.currency]);
  const newMoney = [...oMoney].filter((n) => n.length >= 2 && !rMoney.has(n) && !r.percent.has(n));
  const newPct = [...o.percent].filter((p) => !r.percent.has(p) && !rMoney.has(p));
  const unitMis = [...o.percent].filter((p) => !r.percent.has(p) && rMoney.has(p))
    .concat([...oMoney].filter((n) => !rMoney.has(n) && r.percent.has(n)));
  let v;
  if (newMoney.length && r.abnormal.length) v = "AMBIGUITY";
  else if (newMoney.length || newPct.length) v = "HARD";
  else if (unitMis.length) v = "WARN";       // hold
  else if (r.abnormal.length) v = "AMBIGUITY"; // hold
  else v = "PASS";
  return v;
}
let fail = 0;
const ck = (name, got, want) => { const ok = got === want; if (!ok) fail++; console.log((ok ? "PASS" : "FAIL") + "  " + name + " => " + got + (ok ? "" : "  (want " + want + ")")); };

// 회귀 2건 복원 (원문에 실제 존재하는 비율)
ck("교보 120.2% == out 120.2%", diff("9,220\n120.2%\n20년", "환급률 120.2% 입니다"), "PASS");
ck("교보 120.2% -> out 120.2 (% 소실)", diff("9,220\n120.2%\n20년", "환급률 120.2 입니다"), "WARN");
ck("iM x3.0% == out 3.0%", diff("기본보험료×12×납입기간x3.0%", "납입기간 3.0% 지급"), "PASS");
ck("iM x3.0% == out 3% (3.0%=3%)", diff("기본보험료×12×납입기간x3.0%", "지급률 3% 적용"), "PASS");
// 비율 검증 유지 (김실장 핵심 — 비율 제외 금지)
ck("없는 비율 3.2% 생성", diff("환급률 120.2%", "환급률 3.2%"), "HARD");
ck("비율 변조 120.2%->12.2%", diff("환급률 120.2%", "환급률 12.2%"), "HARD");
ck("동일 비율 pass", diff("수익률 5.5% 보장", "수익률 5.5%"), "PASS");
// 회귀 안전
ck("IBK 79 환각", diff("5년 14,993,279 83.2%\n10년 28,987,752 80.5% 가입 20년", "20년 보증 연금수령 79세"), "HARD");
ck("NH OCR 깸 49,04845", diff("보험료 49,04845 항목", "보험료 4904845"), "AMBIGUITY");
ck("AIA 비정상 $3,5000", diff("월보험료 $3,5000이상 15%", "월보험료 3500달러 15%"), "AMBIGUITY");
ck("28,700 = 28700", diff("1형 28,700 2형 22,600", "1형 28700 2형 22600"), "PASS");
ck("28 700 = 28700 (공백)", diff("1형 28 700", "1형 28700"), "PASS");

console.log(fail === 0 ? "\nALL PASS" : "\n" + fail + " FAILED");
if (fail) process.exit(1);
