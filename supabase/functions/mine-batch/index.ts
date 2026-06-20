// supabase/functions/mine-batch/index.ts
//
// 자동 채굴(mine-batch) — 공식 원천에서 보험 지식을 추출·정규화해 검수 큐 후보로 쌓는다.
// 검수기준 진실원천: docs/decisions/2026-06-20_mining_review_criteria_v1.md
// 패턴 원본: ocr-batch(오케스트레이터) + extract-knowledge(Gemini 추출).
//
// Phase C(2026-06-20): false positive 정밀화
//  - 날짜 토큰 정규화(형식 차이를 신규 숫자로 오판 안 함)
//  - 회사명 diff = 근거집합(raw본문+source_company+canonical+제목) 기반(단순 사전 화이트리스트 금지)
//  - PII 계좌·증권 = 문맥 결합(은행/계좌/예금주/입금/account), 문맥 없으면 pii_warning→hold
//  - diff 3분기: diff_pass / diff_warning(hold) / diff_hard_fail(적재차단+재채굴)
//  - discard 한정: 개인정보 분리불가·소스부적격·지식없음·재시도 후 확인된 hard fail
//  - 프롬프트: 발행사명 본문 억지 삽입 금지 + 원문에 없는 회사·상품·담보·수치 생성 금지 재강조
//  - 표본: payload.samples=[{type,id}] 로 newsletters+posts 혼합 20건 지정 실행
//
// 안전 원칙(작업지시서 §19):
//  - 자동 approved 0 / internal_only 적재 0 / 원문·정제본 수정 0(읽기+INSERT만)
//  - 개인정보 원문 로그 0(마스킹) / 멱등=knowledge_mining_state(원천 본문 미변경)
//  - dry_run 기본 true / cron 미등록(CRON_ENABLED=false) / 표본 통과 전 대량 금지
//
// 보안: x-cron-secret == CRON_SECRET 일 때만. DB 쓰기는 service_role.
// 입력: { limit?, source_type?, source_ids?[], samples?[{type,id}], dry_run?, pipeline_version?, force_reprocess? }

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

// ── 설정 상수(작업지시서 §11) ─────────────────────────────────
const PIPELINE_VERSION  = "v1d";          // Phase D — 시의성/uncertainty 분리·PII 인접성 정밀화
// uncertainty_code 중 자동 hold 사유가 되는 것(작업지시서 Phase D). lifecycle_ambiguity·none은 hold 아님.
const HOLD_UNCERTAINTY = new Set(["source_missing", "numeric_ambiguity", "condition_ambiguity", "extraction_quality"]);
const MAX_ITEMS_PER_RUN = 5;
const MAX_ITEMS_PER_DAY = 50;
const MAX_SAMPLE        = 30;             // dry-run 표본 지정 상한
const MAX_RETRIES       = 2;
const CRON_ENABLED      = false;          // cron 미등록(수동 호출만). 표본 통과 전 false 고정.
const GEMINI_BASE       = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL      = "gemini-2.5-flash";
const MAX_INPUT_CHARS   = 30000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

// ── 타입 ──────────────────────────────────────────────────────
interface SampleRef { type: "newsletter" | "post"; id: string; }
interface Config {
  cronSecret: string; geminiKey: string; killed: boolean;
  limit: number; sourceType: "newsletter" | "post"; sourceIds: string[]; samples: SampleRef[];
  dryRun: boolean; pipelineVersion: string; forceReprocess: boolean;
}
interface Candidate {
  source_type: string; source_id: string; raw: string; has_clean: boolean;
  company: string | null; title: string | null;
  publish_year: number | null; publish_month: number | null;
}
type Eligibility = "eligible_public" | "internal_only" | "manual_review_required" | "source_rejected";
type DiffFlag    = "diff_pass" | "diff_warning" | "diff_hard_fail";
type Lifecycle   = "current" | "archive" | "expired_or_superseded" | "validity_unknown";
type Decision    = "ai_draft" | "hold" | "discarded" | "hard_fail";

// 회사명 정규화(축약 — extract-knowledge CANON과 동일 원천). 미상=비공식 신호.
const CANON: Record<string, string> = {
  "동양생명":"동양생명","한화생명":"한화생명","삼성생명":"삼성생명","교보생명":"교보생명","교보":"교보생명",
  "신한라이프":"신한라이프","NH농협생명":"농협생명","농협생명":"농협생명","미래에셋생명":"미래에셋생명",
  "미래에셋":"미래에셋생명","DB생명":"DB생명","KB라이프":"KB라이프","흥국생명":"흥국생명","라이나생명":"라이나생명",
  "메트라이프":"메트라이프","ABL생명":"ABL생명","하나생명":"하나생명","KDB생명":"DB생명",
  "삼성화재":"삼성화재","현대해상":"현대해상","DB손보":"DB손보","KB손보":"KB손보","메리츠화재":"메리츠화재",
  "메리츠":"메리츠화재","한화손보":"한화손보","흥국화재":"흥국화재","롯데손보":"롯데손보","하나손보":"하나손보",
  "농협손보":"농협손보","NH농협손보":"농협손보","MG손보":"MG손보","AIG손보":"AIG손보",
  "미상":"미상","소식지":"미상",
};
function canon(c: string): string {
  const s = (c || "").trim();
  if (!s) return "미상";
  if (CANON[s]) return CANON[s];
  for (const k of Object.keys(CANON)) { if (s.includes(k)) return CANON[k]; }
  const t = s.replace(/\.(pdf|hwp|docx?|xlsx?|pptx?)$/i, "").split(/[_/]/)[0].trim();
  return /[가-힣]/.test(t) ? t : "미상";
}
// 문자열에서 알려진 회사명(정규화) 집합 추출. '미상'·'소식지'는 회사 신호 아님.
function knownCompanies(s: string): string[] {
  const found = new Set<string>();
  for (const k of Object.keys(CANON)) {
    if (k === "미상" || k === "소식지") continue;
    if (s.includes(k)) found.add(CANON[k]);
  }
  return Array.from(found);
}

// ── 날짜 정규화(Phase C-1) — 형식 차이를 신규 숫자로 오판 방지 ──
// 2022-11-01 / 2022.11.01 / 2022/11/01 / 20221101 → 모두 'YYYYMMDD'.
const DATE_SEP = /\b(20\d{2})\s*[-.\/]\s*(\d{1,2})\s*[-.\/]\s*(\d{1,2})\b/g;
const DATE_KOR = /\b(20\d{2})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?/g;
const DATE_8   = /\b(20\d{2})(\d{2})(\d{2})\b/g;
function canonicalDates(s: string): Set<string> {
  const out = new Set<string>();
  const push = (y: string, m: string, d: string) =>
    out.add(y + m.padStart(2, "0") + d.padStart(2, "0"));
  let mm: RegExpExecArray | null;
  for (const re of [DATE_SEP, DATE_KOR, DATE_8]) {
    re.lastIndex = 0;
    while ((mm = re.exec(s)) !== null) push(mm[1], mm[2], mm[3]);
  }
  return out;
}
// 날짜로 인식된 부분을 제거(일반 숫자 비교용 — 날짜 숫자가 일반 숫자에 섞이지 않게).
function stripDates(s: string): string {
  return s.replace(DATE_SEP, " ").replace(DATE_KOR, " ").replace(DATE_8, " ");
}
// Phase E — 안전 숫자 정규화 + 비정상 자릿수 감지.
//  · 통화기호·천단위쉼표·천단위공백 제거(소수점 보존) → 28,700 = 28 700 = 28700
//  · 비정상(쉼표 뒤 4자리+, 예 $3,5000)은 ★복원 추정 안 함 → nums에 미포함 + abnormal로 보고 → hold 유도
//  · 호출 측에서 raw쪽 집합에만 적용(원문 동일숫자 확인용). out(Gemini) 쪽도 동일 정규화하되 결합 추정은 안 함.
function numberTokens(text: string): { nums: Set<string>; abnormal: string[] } {
  const nums = new Set<string>();
  const abnormal: string[] = [];
  let work = text.replace(/[$₩€£¥]/g, " ");
  // (1) 비정상 자릿수: 쉼표 뒤 4자리+ → 추정 금지(제거만, nums에 안 넣음)
  work = work.replace(/\b\d{1,3},\d{4,}\b/g, (m) => { abnormal.push(m); return " "; });
  // (2) 정상 천단위 그룹(쉼표/공백 1~2개 + 정확히 3자리)+ 소수 → 구분자 제거.
  //     1~2개 제한 = OCR이 "28,700"을 "28, 700"·"28 700"으로 깬 것은 결합하되,
  //     명확한 셀 구분(여러 공백)은 결합 안 함. 3자리 규칙으로 별개 숫자 합침도 방지.
  work = work.replace(/\b\d{1,3}(?:[,\s]{1,2}\d{3})+(?:\.\d+)?\b/g, (m) => { nums.add(m.replace(/[,\s]/g, "")); return " "; });
  // (3) 나머지 일반 숫자/소수/퍼센트
  work = work.replace(/\b\d+(?:\.\d+)?%?\b/g, (m) => { nums.add(m.replace(/%$/, "")); return " "; });
  return { nums, abnormal };
}

// ── 1) loadConfig ─────────────────────────────────────────────
function loadConfig(payload: Record<string, unknown>): Config {
  const num = (v: unknown, d: number) => (typeof v === "number" && v > 0 ? v : d);
  const rawSamples = Array.isArray(payload.samples) ? payload.samples : [];
  const samples: SampleRef[] = rawSamples
    .map((x) => x as Record<string, unknown>)
    .filter((x) => (x.type === "newsletter" || x.type === "post") && x.id != null)
    .slice(0, MAX_SAMPLE)
    .map((x) => ({ type: x.type as "newsletter" | "post", id: String(x.id) }));
  const limit = samples.length
    ? samples.length
    : Math.min(num(payload.limit, MAX_ITEMS_PER_RUN), MAX_ITEMS_PER_RUN);
  return {
    cronSecret: Deno.env.get("CRON_SECRET") ?? "",
    geminiKey:  Deno.env.get("GEMINI_API_KEY") ?? "",
    killed:     (Deno.env.get("MINE_KILL_SWITCH") ?? "").toLowerCase() === "on",
    limit,
    sourceType: payload.source_type === "post" ? "post" : "newsletter",
    sourceIds:  Array.isArray(payload.source_ids) ? payload.source_ids.map(String) : [],
    samples,
    dryRun:     payload.dry_run === false ? false : true,      // 기본 true(안전)
    pipelineVersion: typeof payload.pipeline_version === "string" && payload.pipeline_version
                     ? payload.pipeline_version : PIPELINE_VERSION,
    forceReprocess: payload.force_reprocess === true,
  };
}

// ── 2) checkKillSwitch ────────────────────────────────────────
function checkKillSwitch(cfg: Config): string | null {
  return cfg.killed ? "kill_switch_on" : null;
}

// ── 3) selectCandidates ───────────────────────────────────────
//   samples 지정 시: newsletters+posts 혼합 지정 실행(표본 전용).
//   일반: newsletter=실적재 대상 / post(qna)=dry-run 검증 대상.
async function fetchNewsletters(sb: SupabaseClient, ids: string[] | null, limit: number): Promise<Candidate[]> {
  let q = sb.from("newsletters")
    .select("id, company, title, source_filename, full_text, clean_text, publish_year, publish_month")
    .not("full_text", "is", null);
  if (ids && ids.length) q = q.in("id", ids);
  else q = q.order("publish_year", { ascending: false }).limit(limit * 4);
  const { data } = await q;
  return ((data as Array<Record<string, unknown>>) || []).map((n) => ({
    source_type: "newsletter",
    source_id: String(n.id),
    raw: String(n.clean_text ?? n.full_text ?? ""),    // clean_text 최우선 입력(없으면 raw fallback)
    has_clean: n.clean_text != null && String(n.clean_text).trim().length > 0,
    company: (n.company as string) ?? null,
    title: (n.title as string) ?? (n.source_filename as string) ?? null,
    publish_year: (n.publish_year as number) ?? null,
    publish_month: (n.publish_month as number) ?? null,
  }));
}
async function fetchPosts(sb: SupabaseClient, ids: string[] | null, limit: number): Promise<Candidate[]> {
  let q = sb.from("posts")
    .select("id, board_type, title, content, author_name, created_at")
    .in("board_type", ["qna", "insurer"]);
  if (ids && ids.length) q = q.in("id", ids.map((x) => Number(x)));
  else q = q.limit(limit);
  const { data } = await q;
  return ((data as Array<Record<string, unknown>>) || []).map((p) => ({
    source_type: "post",
    source_id: String(p.id),
    raw: String(p.content ?? ""),
    has_clean: false,
    company: null,
    title: (p.title as string) ?? null,
    publish_year: null, publish_month: null,
  }));
}
async function selectCandidates(sb: SupabaseClient, cfg: Config): Promise<Candidate[]> {
  if (cfg.samples.length) {
    const nlIds = cfg.samples.filter((s) => s.type === "newsletter").map((s) => s.id);
    const psIds = cfg.samples.filter((s) => s.type === "post").map((s) => s.id);
    const [nl, ps] = await Promise.all([
      nlIds.length ? fetchNewsletters(sb, nlIds, nlIds.length) : Promise.resolve([] as Candidate[]),
      psIds.length ? fetchPosts(sb, psIds, psIds.length) : Promise.resolve([] as Candidate[]),
    ]);
    return [...nl, ...ps];
  }
  if (cfg.sourceType === "post") return fetchPosts(sb, cfg.sourceIds.length ? cfg.sourceIds : null, cfg.limit);
  return fetchNewsletters(sb, cfg.sourceIds.length ? cfg.sourceIds : null, cfg.limit);
}

// ── 4) calculateSourceHash (원문 변경 감지) ───────────────────
async function calculateSourceHash(raw: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

// ── 5) checkMiningState (멱등 + 재시도 한도) ──────────────────
async function checkMiningState(
  sb: SupabaseClient, cfg: Config, c: Candidate, hash: string,
): Promise<{ skip: boolean; attempt: number }> {
  const { data } = await sb.from("knowledge_mining_state")
    .select("mining_status, source_hash, attempt_count")
    .eq("source_type", c.source_type).eq("source_id", c.source_id)
    .eq("pipeline_version", cfg.pipelineVersion).maybeSingle();
  if (!data) return { skip: false, attempt: 0 };
  const row = data as { mining_status: string; source_hash: string | null; attempt_count: number };
  if (cfg.forceReprocess) return { skip: false, attempt: row.attempt_count };
  if (row.source_hash === hash && (row.mining_status === "done" || row.mining_status === "skipped"))
    return { skip: true, attempt: row.attempt_count };
  // 재시도 한도 초과(반복 hard fail) → skip (무한 재시도 차단 = discard 검토 대상)
  if (row.mining_status === "failed" && row.attempt_count >= MAX_RETRIES) return { skip: true, attempt: row.attempt_count };
  return { skip: false, attempt: row.attempt_count };
}

// ── 6) evaluateSourceEligibility (검수기준 §2) ────────────────
function evaluateSourceEligibility(c: Candidate): { status: Eligibility; reason: string } {
  if (c.source_type === "newsletter") {
    if (canon(c.company || "") === "미상") return { status: "manual_review_required", reason: "발행사 미확인" };
    return { status: "eligible_public", reason: "원수사 공식 소식지" };
  }
  return { status: "internal_only", reason: "게시판 내부 자료(공용 적재 금지)" };
}

// ── 7) detectSensitiveData (검수기준 §3 — 강확정 vs 문맥 필요) ──
const HARD_PII: Array<[string, RegExp]> = [
  ["주민번호", /\b\d{6}\s*-\s*[1-4]\d{6}\b/],
  ["휴대전화", /\b01[016-9][-\s]?\d{3,4}[-\s]?\d{4}\b/],
  ["이메일",   /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["카톡대화", /\[(오전|오후)\s*\d{1,2}:\d{2}\]/],
];
const ACCT_RE   = /\b\d{2,6}-\d{2,6}-\d{2,7}\b/g;
const ACCT_CTX  = /(은행|계좌|예금주|입금|송금|이체|account|bank)/i;
const PHONE_RE  = /\b0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}\b/g;       // 전화(계좌 오인 제외용)
const CARD16_RE = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;               // 카드번호(계좌 오인 제외용)
// Phase D: 계좌·증권은 '인접 문맥'이 있을 때만 PII 확정. 전화·카드·날짜는 사전 제거(오인 방지).
function detectSensitiveData(raw: string): { hard: string[]; warning: string[] } {
  const hard: string[] = [], warning: string[] = [];
  for (const [name, re] of HARD_PII) { if (re.test(raw)) hard.push(name); }
  // 계좌형식 검사 입력 = 날짜·전화·카드 제거(이들을 계좌로 오인하지 않게)
  const cleaned = stripDates(raw).replace(PHONE_RE, " ").replace(CARD16_RE, " ");
  let m: RegExpExecArray | null, acctHard = false, acctWarn = false;
  ACCT_RE.lastIndex = 0;
  while ((m = ACCT_RE.exec(cleaned)) !== null) {
    const around = cleaned.slice(Math.max(0, m.index - 15), m.index + m[0].length + 15);
    if (ACCT_CTX.test(around)) acctHard = true; else acctWarn = true;   // 숫자 '주변'에 문맥 있을 때만 hard
  }
  if (acctHard) hard.push("계좌(문맥인접)");
  else if (acctWarn) warning.push("계좌형식(문맥없음)");
  return { hard, warning };
}
// 개인정보 마스킹(로그·보고용 — 원문 저장 금지)
function maskPII(s: string): string {
  let t = s;
  for (const [, re] of HARD_PII) t = t.replace(new RegExp(re, "g"), "███");
  t = t.replace(ACCT_RE, "███");
  return t;
}

// ── 8) extractKnowledgeWithGemini (검수기준 §5·§6) ────────────
const EXTRACT_SCHEMA = {
  type: "OBJECT",
  properties: {
    has_insurance_knowledge: { type: "BOOLEAN" },
    title: { type: "STRING" }, body: { type: "STRING" }, category: { type: "STRING" },
    tags: { type: "ARRAY", items: { type: "STRING" } },
    company: { type: "STRING" },
    proper_nouns: { type: "ARRAY", items: { type: "STRING" } },
    timeliness_signal: { type: "STRING", enum: ["current", "expired", "archive", "unknown"] },
    pii_present: { type: "BOOLEAN" }, pii_separable: { type: "BOOLEAN" },
    eligibility_doubt: { type: "BOOLEAN" }, neutrality_ok: { type: "BOOLEAN" },
    uncertainty_code: { type: "STRING",
      enum: ["none", "source_missing", "numeric_ambiguity", "condition_ambiguity", "lifecycle_ambiguity", "extraction_quality"] },
    uncertainty_note: { type: "STRING" },
    confidence: { type: "STRING" },
  },
  required: ["has_insurance_knowledge", "title", "body", "pii_present", "pii_separable",
             "eligibility_doubt", "neutrality_ok", "timeliness_signal", "uncertainty_code", "confidence"],
};
const EXTRACT_SYSTEM = [
  "너는 보험 공식 자료에서 '검색 가능한 보험 지식'을 추출·일반화하는 검수자다.",
  "본문에 실제로 적힌 내용만 사용한다. 본문에 없는 상식·추측·창작·일반론을 절대 추가하지 않는다(환각 금지).",
  "원문에 없는 보험회사명·상품명·담보명·특약명·숫자·금액·비율·기간을 새로 만들지 않는다. 원문에 있는 값만 그대로 쓴다.",
  "발행사명은 분류·출처 메타(company 필드)에만 넣는다. 보험지식 본문(body)에 꼭 필요하지 않으면 발행사명을 억지로 삽입하지 않는다.",
  "특정 고객 1:1 설계 사례는 일반 원칙으로 재서술한다. 고객명·작성자명·소속(GA/지점/팀)은 제거한다.",
  "중립: 특정 보험사를 단정적으로 우대('무조건 최고','반드시 가입')하지 않는다. 사실 기반 비교만 허용.",
  "개인정보(고객실명·주민번호·전화·녹취·가족/질병)가 있으면 pii_present=true. 지식과 분리 불가하면 pii_separable=false.",
  "보험 지식이 없으면 has_insurance_knowledge=false. 타 GA·외부 제작물로 의심되면 eligibility_doubt=true.",
  // Phase D — 시의성: 발행 시점이 아니라 '내용의 현재 유효성' 기준. 명확한 근거가 있을 때만 판정.
  "timeliness_signal: 원문에 명확한 시행일·사용기한·판매중단·단종·대체 표현이 있을 때만 current/expired/archive. 그런 근거가 없으면 unknown. 발행 월이 최근이라는 이유만으로 current로 단정하지 마라.",
  // Phase D — 불확실성은 구조화 코드로. 자유서술(note)은 참고용일 뿐 판정 트리거 아님.
  "uncertainty_code로 분류: none / source_missing(출처 불명) / numeric_ambiguity(숫자·금액·기간 모호) / condition_ambiguity(조건·예외 모호) / lifecycle_ambiguity(현재성만 모호) / extraction_quality(원문 OCR 품질 불량). 상세는 uncertainty_note에 짧게.",
  "단순히 '확실하지 않다'는 일반 서술은 uncertainty_code=none + note로만 남긴다. 실제 모호함이 있을 때만 해당 code를 쓴다.",
].join("\n");

interface Extracted {
  has_insurance_knowledge: boolean; title: string; body: string;
  category?: string; tags?: string[]; company?: string; proper_nouns?: string[];
  timeliness_signal: string; pii_present: boolean; pii_separable: boolean;
  eligibility_doubt: boolean; neutrality_ok: boolean;
  uncertainty_code?: string; uncertainty_note?: string; confidence: string;
}
async function extractKnowledgeWithGemini(cfg: Config, c: Candidate): Promise<Extracted | null> {
  const body = c.raw.slice(0, MAX_INPUT_CHARS);
  const prompt = `[발행사(메타): ${canon(c.company || "")}] [제목: ${c.title || ""}]\n\n${body}`;
  const res = await fetch(`${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${cfg.geminiKey}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: EXTRACT_SYSTEM }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json",
        responseSchema: EXTRACT_SCHEMA, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  if (!res.ok) throw new Error("gemini_http_" + res.status);
  const gj = await res.json();
  const txt = gj?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  try { return JSON.parse(txt) as Extracted; } catch { return null; }
}

// ── 9) runDeterministicDiff (검수기준 §4 — Phase C 3분기 + Phase E 숫자 정규화) ─────
function runDeterministicDiff(raw: string, ex: Extracted, c: Candidate): { flag: DiffFlag; hard: string[]; warn: string[]; ambiguity: string[] } {
  const hard: string[] = [], warn: string[] = [], ambiguity: string[] = [];
  const outText = `${ex.title}\n${ex.body}\n${(ex.proper_nouns || []).join(" ")}`;

  // (1) 날짜 — canonical 비교(형식 차이는 오판 아님). 본문에 없는 새 날짜는 메타 가능성 → warning.
  const rawD = canonicalDates(raw), outD = canonicalDates(outText);
  const newD = [...outD].filter((d) => !rawD.has(d));
  if (newD.length) warn.push("신규 날짜(메타 가능) " + newD.slice(0, 3).join(","));

  // (2) 숫자 — Phase E: 안전 정규화(쉼표·공백·통화 제거, 소수점 보존) 후 비교.
  //     rawAbnormal(쉼표 뒤 4자리 등)은 ★복원 추정 안 함 → numeric_ambiguity → hold(추정 통과 금지).
  const rawTok = numberTokens(stripDates(raw));
  const outTok = numberTokens(stripDates(outText));
  if (rawTok.abnormal.length) ambiguity.push("raw 비정상 숫자 " + rawTok.abnormal.slice(0, 3).join(","));
  const newNums = [...outTok.nums].filter((n) => n.length >= 2 && !rawTok.nums.has(n));
  // 비정상 자릿수가 raw에 있으면, 신규 숫자가 그 복원 후보일 수 있음 → hard 단정 금지, ambiguity로 hold.
  if (newNums.length) {
    if (rawTok.abnormal.length) ambiguity.push("신규 숫자(비정상 동반·추정금지) " + newNums.slice(0, 5).join(","));
    else hard.push("신규 숫자 " + newNums.slice(0, 5).join(","));
  }

  // (3) 회사명 — 근거집합(raw본문 + source_company + canonical + 제목/파일명) 기반
  const evidence = new Set<string>([
    ...knownCompanies(raw),
    ...knownCompanies(c.title || ""),
  ]);
  const metaCo = canon(c.company || "");
  if (metaCo !== "미상") evidence.add(metaCo);          // source_company / canonical_company_name
  const rawCos = new Set(knownCompanies(raw));
  for (const co of knownCompanies(outText)) {
    if (rawCos.has(co)) continue;                       // 본문에 있음 = 정상(pass)
    if (evidence.has(co)) warn.push("메타 발행사(본문엔 없음) " + co);  // 메타 근거 = warning
    else hard.push("환각 회사명(근거 없음) " + co);      // 어디에도 없음 = hard
  }

  // (4) 본문 과다(원문보다 1.3배+) = 창작 의심 → warning
  if ((ex.body || "").length > raw.length * 1.3 && raw.length > 200) warn.push("본문 과다(창작 의심)");

  // Phase D: Gemini 자유서술(uncertainty)은 더 이상 diff 트리거가 아님(구조화 code로 build에서 처리).

  // 우선순위: 진짜 환각(hard) > 비정상 추정금지(ambiguity→hold) > 형식차이(warning) > pass.
  // ambiguity는 hard로 격상하지 않음(추정 금지) + diff_pass로 통과시키지도 않음 → warning + build에서 hold.
  const flag: DiffFlag = hard.length ? "diff_hard_fail"
    : (warn.length || ambiguity.length) ? "diff_warning" : "diff_pass";
  return { flag, hard, warn, ambiguity };
}

// ── 10) evaluateLifecycleCandidate (검수기준 §8 — Phase D: 발행일과 분리) ──
// 발행 시점(publish_year/month)으로 current를 자동 확정하지 않는다. 내용의 현재 유효성은 별도 축.
// 원문에 명확한 시행/만료/단종/대체 표현이 있을 때만 확정. 근거 불충분 = validity_unknown(hold 사유 아님).
const EXPIRE_KW = /판매\s*(종료|중단|중지)|단종|판매\s*중지|신상품으로\s*대체|대체\s*판매|개정\s*시행/;
function evaluateLifecycleCandidate(raw: string, ex: Extracted): Lifecycle {
  const sig = (ex.timeliness_signal || "").toLowerCase();
  if (sig === "expired" || EXPIRE_KW.test(raw)) return "expired_or_superseded";
  if (sig === "archive") return "archive";
  if (sig === "current") return "current";   // Gemini가 '명확한 현재 유효 근거'로 판정한 경우만
  return "validity_unknown";                  // 근거 불충분 — hold로 보내지 않음(빠른 줄 허용)
}

// ── 11) buildKnowledgeCandidate (Phase C — discard 한정 + hard_fail 분기) ──
interface BuiltResult {
  decision: Decision; lifecycle: Lifecycle; diff: DiffFlag;
  row: Record<string, unknown> | null; reason: string;
}
function buildKnowledgeCandidate(
  c: Candidate, ex: Extracted, elig: Eligibility, diff: DiffFlag, lifecycle: Lifecycle,
  hash: string, pipelineVersion: string, piiWarning: boolean, numericAmbiguity: boolean,
): BuiltResult {
  // discard 한정(§6): 지식없음 / 개인정보 분리불가 / 소스 부적격 / 내부자료.
  if (!ex.has_insurance_knowledge)
    return { decision: "discarded", lifecycle, diff, row: null, reason: "보험지식 없음" };
  if (ex.pii_present && !ex.pii_separable)
    return { decision: "discarded", lifecycle, diff, row: null, reason: "개인정보 분리 불가" };
  if (elig === "source_rejected" || ex.eligibility_doubt)
    return { decision: "discarded", lifecycle, diff, row: null, reason: "소스 부적격/외부저작물 의심" };
  if (elig === "internal_only")
    return { decision: "discarded", lifecycle, diff, row: null, reason: "내부자료(공용 적재 금지)" };

  // diff_hard_fail = 적재 차단이되 즉시 영구폐기 아님 → 재채굴 분기(§6).
  if (diff === "diff_hard_fail")
    return { decision: "hard_fail", lifecycle, diff, row: null, reason: "diff_hard_fail(실제 왜곡/환각)" };

  // Phase D — hold 사유(느린 줄): 실제 의심 항목만. ★시의성 미확정(validity_unknown)은 hold 사유 아님.
  const code = ex.uncertainty_code || "none";
  const holdReasons: string[] = [];
  if (diff === "diff_warning") holdReasons.push("diff_warning");
  if (ex.pii_present) holdReasons.push("개인정보 제거후 확인");      // hard PII(분리가능) — 빠른 줄 불가
  if (piiWarning) holdReasons.push("pii_warning(계좌형식)");
  if (HOLD_UNCERTAINTY.has(code)) holdReasons.push("uncertainty:" + code);  // source_missing/numeric/condition/extraction_quality
  if (numericAmbiguity) holdReasons.push("numeric_ambiguity(raw 비정상·추정금지)");  // Phase E — diff_pass 통과 금지
  if (!ex.neutrality_ok) holdReasons.push("중립성 확인");
  if (elig === "manual_review_required") holdReasons.push("소스 적격성 확인");
  // lifecycle_ambiguity·none·validity_unknown → hold 아님(빠른 줄 허용). 현재성은 검색 노출 단계에서 분리.
  // clean_text 없고 raw 비정상(numericAmbiguity)이면 위에서 이미 hold = 자동 ai_draft 금지(안전경계 6).

  const decision: Decision = holdReasons.length ? "hold" : "ai_draft";
  const noteParts = [`code=${code}`, ex.uncertainty_note ? `note=${ex.uncertainty_note}` : ""].filter(Boolean);
  const row = {
    type: "scenario",
    title: (ex.title || "").slice(0, 300),
    body: (ex.body || "").slice(0, 4000),
    category: ex.category || null,
    tags: Array.isArray(ex.tags) ? ex.tags.slice(0, 12) : null,
    source_type: c.source_type === "newsletter" ? "mine_newsletter" : "mine_post",
    source_id: c.source_id,
    source_title: c.title,
    source_company: c.company,
    canonical_company_name: canon(c.company || ""),
    source_date: (c.publish_year && c.publish_month)
      ? `${c.publish_year}-${String(c.publish_month).padStart(2, "0")}` : null,
    confidence: ["high", "med", "low"].includes(ex.confidence) ? ex.confidence : "low",
    status: decision,                 // ai_draft 또는 hold — approved 절대 0
    lifecycle_status: lifecycle,
    diff_flag: diff,                  // diff_pass 또는 diff_warning만(hard_fail은 여기 도달 못함)
    pipeline_version: pipelineVersion,
    source_hash: hash,
    review_note: maskPII("[ai] " + noteParts.join("; ")).slice(0, 500),   // uncertainty 참고정보(트리거 아님·마스킹)
    created_by: "ai",
  };
  return { decision, lifecycle, diff, row, reason: holdReasons.join("+") || "ok" };
}

// ── 12) writeMiningState (멱등 upsert) ────────────────────────
async function writeMiningState(
  sb: SupabaseClient, cfg: Config, c: Candidate, hash: string,
  elig: Eligibility, status: "done" | "failed" | "skipped", attempt: number, errCode: string | null, batchId: string,
) {
  if (cfg.dryRun) return;   // dry-run은 마커 안 남김(반복 검증 가능)
  await sb.from("knowledge_mining_state").upsert({
    source_type: c.source_type, source_id: c.source_id, source_hash: hash,
    pipeline_version: cfg.pipelineVersion, mining_status: status,
    eligibility_status: elig, attempt_count: attempt + 1,
    last_error_code: errCode, last_mined_at: new Date().toISOString(), batch_id: batchId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "source_type,source_id,pipeline_version" });
}

// ── 13) writeCandidate (dry_run=false + 적재 대상일 때만 INSERT) ──
async function writeCandidate(sb: SupabaseClient, cfg: Config, row: Record<string, unknown> | null): Promise<boolean> {
  if (cfg.dryRun || !row) return false;
  const { data: dup } = await sb.from("knowledge_entries")
    .select("entry_id").eq("source_id", row.source_id).eq("pipeline_version", row.pipeline_version).limit(1);
  if (dup && dup.length) return false;
  const { error } = await sb.from("knowledge_entries").insert(row);
  return !error;
}

// ── 14) returnSafeReport (raw 마스킹 — 원문 비노출 보장) ───────
function safeExcerpt(raw: string, n = 160): string {
  return maskPII(raw.slice(0, n)).replace(/\s+/g, " ").trim();
}
function returnSafeReport(body: Record<string, unknown>): Response {
  const rep = body.report;
  if (Array.isArray(rep)) {
    for (const r of rep as Array<Record<string, unknown>>) {
      if (typeof r.raw_excerpt === "string") r.raw_excerpt = maskPII(r.raw_excerpt);
      if (typeof r.norm_excerpt === "string") r.norm_excerpt = maskPII(r.norm_excerpt);
    }
  }
  return json(body);
}

// ════ 엔트리포인트 ════
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let payload: Record<string, unknown> = {};
  try { payload = await req.json(); } catch { /* */ }
  const cfg = loadConfig(payload);

  if (!cfg.cronSecret || req.headers.get("x-cron-secret") !== cfg.cronSecret) return json({ error: "unauthorized" }, 401);
  if (!cfg.geminiKey) return json({ error: "missing_gemini_key" }, 500);

  const kill = checkKillSwitch(cfg);
  if (kill) return json({ ok: false, halted: kill });
  if (payload.via === "cron" && !CRON_ENABLED) return json({ ok: true, note: "cron_disabled" });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  {
    const { error } = await sb.from("knowledge_mining_state").select("state_id").limit(1);
    if (error) return json({ error: "tables_missing", detail: error.message }, 400);
  }

  // 일일 상한(§11) — 비-dry-run만
  if (!cfg.dryRun) {
    const since = new Date(); since.setUTCHours(0, 0, 0, 0);
    const { count } = await sb.from("knowledge_mining_state").select("state_id", { count: "exact", head: true })
      .eq("mining_status", "done").gte("last_mined_at", since.toISOString());
    if ((count ?? 0) >= MAX_ITEMS_PER_DAY) return json({ ok: true, note: "daily_cap_reached", done_today: count });
  }

  const batchId = crypto.randomUUID();
  const candidates = await selectCandidates(sb, cfg);

  const report: Array<Record<string, unknown>> = [];
  let processed = 0, adraft = 0, held = 0, discarded = 0, hardfail = 0, skipped = 0, failed = 0, inserted = 0;
  let geminiCalls = 0, inputChars = 0;

  for (const c of candidates) {
    if (processed >= cfg.limit) break;
    if (!c.raw.trim()) { skipped++; continue; }

    const hash = await calculateSourceHash(c.raw);
    const ms = await checkMiningState(sb, cfg, c, hash);
    if (ms.skip) { skipped++; continue; }
    processed++;

    const elig = evaluateSourceEligibility(c);
    const pii = detectSensitiveData(c.raw);   // {hard, warning}

    let ex: Extracted | null = null;
    try {
      geminiCalls++; inputChars += Math.min(c.raw.length, MAX_INPUT_CHARS);
      ex = await extractKnowledgeWithGemini(cfg, c);
    } catch (e) {
      failed++;
      await writeMiningState(sb, cfg, c, hash, elig.status, "failed", ms.attempt, String((e as Error)?.message).slice(0, 60), batchId);
      report.push({ source_id: c.source_id, source_type: c.source_type, eligibility: elig.status, error: "gemini_fail" });
      continue;
    }
    if (!ex) {
      failed++;
      await writeMiningState(sb, cfg, c, hash, elig.status, "failed", ms.attempt, "json_parse", batchId);
      report.push({ source_id: c.source_id, source_type: c.source_type, eligibility: elig.status, error: "json_parse" });
      continue;
    }

    // 코드 강확정 PII 발견 → present 병합(보수). warning은 hold 신호.
    if (pii.hard.length) ex.pii_present = true;

    const diff = runDeterministicDiff(c.raw, ex, c);
    const lifecycle = evaluateLifecycleCandidate(c.raw, ex);
    const built = buildKnowledgeCandidate(c, ex, elig.status, diff.flag, lifecycle, hash, cfg.pipelineVersion, pii.warning.length > 0, diff.ambiguity.length > 0);

    const didInsert = await writeCandidate(sb, cfg, built.row);
    if (didInsert) inserted++;

    // mining_state: ai_draft/hold=done / discarded=skipped(영구) / hard_fail=failed(재채굴, 한도 내)
    let finalState: "done" | "failed" | "skipped" = "done";
    let errCode: string | null = null;
    if (built.decision === "discarded") finalState = "skipped";
    else if (built.decision === "hard_fail") { finalState = "failed"; errCode = "diff_hard_fail"; }
    await writeMiningState(sb, cfg, c, hash, elig.status, finalState, ms.attempt, errCode, batchId);

    if (built.decision === "ai_draft") adraft++;
    else if (built.decision === "hold") held++;
    else if (built.decision === "hard_fail") hardfail++;
    else discarded++;

    report.push({
      source_id: c.source_id, source_type: c.source_type,
      eligibility: elig.status,
      pii_present: ex.pii_present, pii_separable: ex.pii_separable,
      pii_hard: pii.hard, pii_warning: pii.warning,
      diff: diff.flag, diff_hard: diff.hard, diff_warn: diff.warn, diff_ambiguity: diff.ambiguity,
      has_clean: c.has_clean,
      lifecycle, timeliness_signal: ex.timeliness_signal,
      uncertainty_code: ex.uncertainty_code || "none",
      decision: built.decision, reason: built.reason,
      neutrality_ok: ex.neutrality_ok, confidence: ex.confidence,
      title: (ex.title || "").slice(0, 80),
      raw_excerpt: safeExcerpt(c.raw),
      norm_excerpt: maskPII((ex.body || "").slice(0, 160)).replace(/\s+/g, " ").trim(),
    });
  }

  return returnSafeReport({
    ok: true, batch_id: batchId, pipeline_version: cfg.pipelineVersion,
    dry_run: cfg.dryRun, mode: cfg.samples.length ? "samples" : cfg.sourceType,
    counts: { processed, ai_draft: adraft, hold: held, hard_fail: hardfail, discarded, skipped, failed, inserted },
    cost: { gemini_calls: geminiCalls, input_chars: inputChars, est_input_tokens: Math.round(inputChars / 4) },
    note: cfg.dryRun ? "DRY-RUN — knowledge_entries INSERT 0, mining_state 마커 0" : "LIVE",
    report,
  });
});
