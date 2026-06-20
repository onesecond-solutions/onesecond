// supabase/functions/mine-batch/index.ts
//
// 자동 채굴(mine-batch) — 공식 원천에서 보험 지식을 추출·정규화해 검수 큐 후보로 쌓는다.
// 검수기준 진실원천: docs/decisions/2026-06-20_mining_review_criteria_v1.md
// 패턴 원본: ocr-batch(오케스트레이터) + extract-knowledge(Gemini 추출).
//
// 안전 원칙(작업지시서 §19):
//  - 자동 approved 0 (status는 항상 ai_draft 또는 hold).
//  - internal_only 원천은 공용 knowledge_entries 적재 안 함.
//  - 원문·정제본·기존 approved 행 수정 0 (읽기 + INSERT만).
//  - 개인정보 원문 로그 0 (마스킹). 멱등은 knowledge_mining_state로만(원천 본문 미변경).
//  - dry_run 기본 true. cron 미등록(CRON_ENABLED=false). 표본 20건 통과 전 대량 금지.
//
// 보안: x-cron-secret == CRON_SECRET 일 때만. DB 쓰기는 service_role.
// 입력: { limit?, source_type?('newsletter'|'post'), source_ids?[], dry_run?, pipeline_version?, force_reprocess? }

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

// ── 설정 상수(작업지시서 §11) ─────────────────────────────────
const PIPELINE_VERSION  = "v1";
const MAX_ITEMS_PER_RUN = 5;
const MAX_ITEMS_PER_DAY = 50;
const MAX_RETRIES       = 2;
const CRON_ENABLED      = false;          // 이 함수는 cron 미등록(수동 호출만). 표본 통과 전 false 고정.
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
interface Config {
  cronSecret: string; geminiKey: string; killed: boolean;
  limit: number; sourceType: "newsletter" | "post"; sourceIds: string[];
  dryRun: boolean; pipelineVersion: string; forceReprocess: boolean;
}
interface Candidate {
  source_type: string; source_id: string; raw: string;
  company: string | null; title: string | null;
  publish_year: number | null; publish_month: number | null;
}
type Eligibility = "eligible_public" | "internal_only" | "manual_review_required" | "source_rejected";
type DiffFlag    = "diff_pass" | "diff_warning" | "diff_fail";
type Lifecycle   = "current" | "archive" | "expired_or_superseded" | "validity_unknown";
type ReviewState = "ai_draft" | "hold" | "discarded";   // approved는 사람만. discard=discarded(기존 제약).

// 회사명 정규화(축약 — extract-knowledge CANON과 동일 원천). 미상=비공식 신호.
const CANON: Record<string, string> = {
  "동양생명":"동양생명","한화생명":"한화생명","삼성생명":"삼성생명","교보생명":"교보생명","교보":"교보생명",
  "신한라이프":"신한라이프","NH농협생명":"농협생명","농협생명":"농협생명","미래에셋생명":"미래에셋생명",
  "DB생명":"DB생명","KB라이프":"KB라이프","흥국생명":"흥국생명","라이나생명":"라이나생명",
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

// ── 1) loadConfig ─────────────────────────────────────────────
function loadConfig(payload: Record<string, unknown>): Config {
  const num = (v: unknown, d: number) => (typeof v === "number" && v > 0 ? v : d);
  return {
    cronSecret: Deno.env.get("CRON_SECRET") ?? "",
    geminiKey:  Deno.env.get("GEMINI_API_KEY") ?? "",
    killed:     (Deno.env.get("MINE_KILL_SWITCH") ?? "").toLowerCase() === "on",
    limit:      Math.min(num(payload.limit, MAX_ITEMS_PER_RUN), MAX_ITEMS_PER_RUN),
    sourceType: payload.source_type === "post" ? "post" : "newsletter",
    sourceIds:  Array.isArray(payload.source_ids) ? payload.source_ids.map(String) : [],
    dryRun:     payload.dry_run === false ? false : true,      // 기본 true(안전)
    pipelineVersion: typeof payload.pipeline_version === "string" && payload.pipeline_version
                     ? payload.pipeline_version : PIPELINE_VERSION,
    forceReprocess: payload.force_reprocess === true,
  };
}

// ── 2) checkKillSwitch ────────────────────────────────────────
function checkKillSwitch(cfg: Config): string | null {
  if (cfg.killed) return "kill_switch_on";
  return null;
}

// ── 3) selectCandidates ───────────────────────────────────────
//   newsletter = 실제 후보 적재 대상(공식). post(qna) = dry-run 검증 대상(가드 시험).
async function selectCandidates(sb: SupabaseClient, cfg: Config): Promise<Candidate[]> {
  if (cfg.sourceType === "post") {
    let q = sb.from("posts")
      .select("id, board_type, title, content, author_name, created_at")
      .in("board_type", ["qna", "insurer"]);
    if (cfg.sourceIds.length) q = q.in("id", cfg.sourceIds.map((x) => Number(x)));
    const { data } = await q.limit(cfg.limit);
    return ((data as Array<Record<string, unknown>>) || []).map((p) => ({
      source_type: "post",
      source_id: String(p.id),
      raw: String(p.content ?? ""),
      company: null,
      title: (p.title as string) ?? null,
      publish_year: null, publish_month: null,
    }));
  }
  // newsletter: clean_text(정제본) 우선, 없으면 full_text fallback
  let q = sb.from("newsletters")
    .select("id, company, title, source_filename, full_text, clean_text, publish_year, publish_month")
    .not("full_text", "is", null);
  if (cfg.sourceIds.length) q = q.in("id", cfg.sourceIds);
  const { data } = await q.order("publish_year", { ascending: false }).limit(cfg.limit * 4);
  return ((data as Array<Record<string, unknown>>) || []).map((n) => ({
    source_type: "newsletter",
    source_id: String(n.id),
    raw: String(n.clean_text ?? n.full_text ?? ""),
    company: (n.company as string) ?? null,
    title: (n.title as string) ?? (n.source_filename as string) ?? null,
    publish_year: (n.publish_year as number) ?? null,
    publish_month: (n.publish_month as number) ?? null,
  }));
}

// ── 4) calculateSourceHash (원문 변경 감지) ───────────────────
async function calculateSourceHash(raw: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

// ── 5) checkMiningState (멱등: 같은 hash+version 이미 done이면 skip) ──
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
  // 같은 해시 + 이미 처리됨(done/skipped) → 멱등 skip. 해시 변하면 재채굴.
  if (row.source_hash === hash && (row.mining_status === "done" || row.mining_status === "skipped")) {
    return { skip: true, attempt: row.attempt_count };
  }
  // 재시도 한도 초과(failed 누적) → skip (무한 재시도 차단)
  if (row.mining_status === "failed" && row.attempt_count >= MAX_RETRIES) return { skip: true, attempt: row.attempt_count };
  return { skip: false, attempt: row.attempt_count };
}

// ── 6) evaluateSourceEligibility (검수기준 §2) ────────────────
function evaluateSourceEligibility(c: Candidate): { status: Eligibility; reason: string } {
  if (c.source_type === "newsletter") {
    const company = canon(c.company || "");
    if (company === "미상") return { status: "manual_review_required", reason: "발행사 미확인" };
    return { status: "eligible_public", reason: "원수사 공식 소식지" };
  }
  // 게시판(post) = 지점/회사 내부 → 공용 적재 금지. dry-run 검증 전용.
  return { status: "internal_only", reason: "게시판 내부 자료(공용 적재 금지)" };
}

// ── 7) detectSensitiveData (검수기준 §3 — 코드 1차 정규식) ────
const PII_PATTERNS: Array<[string, RegExp]> = [
  ["주민번호", /\b\d{6}\s*-\s*[1-4]\d{6}\b/],
  ["전화번호", /\b01[016-9][-\s]?\d{3,4}[-\s]?\d{4}\b/],
  ["계좌/증권", /\b\d{2,6}-\d{2,6}-\d{2,7}\b/],
  ["이메일", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/],
  ["카톡대화", /\[(오전|오후)\s*\d{1,2}:\d{2}\]/],
];
function detectSensitiveData(raw: string): { found: boolean; kinds: string[] } {
  const kinds: string[] = [];
  for (const [name, re] of PII_PATTERNS) { if (re.test(raw)) kinds.push(name); }
  return { found: kinds.length > 0, kinds };
}
// 개인정보 마스킹(로그·보고용 — 원문 저장 금지)
function maskPII(s: string): string {
  let t = s;
  for (const [, re] of PII_PATTERNS) t = t.replace(new RegExp(re, "g"), "███");
  return t;
}

// ── 8) extractKnowledgeWithGemini (검수기준 §5·§6 — 추출·일반화·중립) ──
const EXTRACT_SCHEMA = {
  type: "OBJECT",
  properties: {
    has_insurance_knowledge: { type: "BOOLEAN" },
    title: { type: "STRING" },
    body:  { type: "STRING" },
    category: { type: "STRING" },
    tags: { type: "ARRAY", items: { type: "STRING" } },
    company: { type: "STRING" },
    proper_nouns: { type: "ARRAY", items: { type: "STRING" } },   // 상품·담보·특약·제도명
    timeliness_signal: { type: "STRING" },   // 'current'|'expired'|'archive'|'unknown'
    pii_present: { type: "BOOLEAN" },
    pii_separable: { type: "BOOLEAN" },       // 개인정보와 지식 분리 가능?
    eligibility_doubt: { type: "BOOLEAN" },   // 타 GA·외부 저작물 의심?
    neutrality_ok: { type: "BOOLEAN" },       // 영업·단정 표현 없음?
    uncertainty: { type: "STRING" },
    confidence: { type: "STRING" },           // 'high'|'med'|'low'
  },
  required: ["has_insurance_knowledge", "title", "body", "pii_present", "pii_separable",
             "eligibility_doubt", "neutrality_ok", "timeliness_signal", "confidence"],
};
const EXTRACT_SYSTEM = [
  "너는 보험 공식 자료에서 '검색 가능한 보험 지식'을 추출·일반화하는 검수자다.",
  "본문에 실제로 적힌 내용만 사용한다. 본문에 없는 상식·추측·창작·일반론을 절대 추가하지 않는다(환각 금지).",
  "숫자·금액·비율·기간·보험회사명·상품명·담보명·특약명·제도명은 원문 그대로 둔다. 바꾸거나 새로 만들지 않는다.",
  "특정 고객 1:1 설계 사례는 일반 원칙으로 재서술한다. 고객명·작성자명·소속(GA/지점/팀)은 제거한다.",
  "중립: 특정 보험사를 단정적으로 우대('무조건 최고','반드시 가입')하지 않는다. 사실 기반 비교만 허용.",
  "개인정보(고객실명·주민번호·전화·녹취·가족/질병)가 있으면 pii_present=true. 지식과 분리 불가하면 pii_separable=false.",
  "보험 지식이 없으면 has_insurance_knowledge=false. 타 GA·외부 제작물로 의심되면 eligibility_doubt=true.",
].join("\n");

interface Extracted {
  has_insurance_knowledge: boolean; title: string; body: string;
  category?: string; tags?: string[]; company?: string; proper_nouns?: string[];
  timeliness_signal: string; pii_present: boolean; pii_separable: boolean;
  eligibility_doubt: boolean; neutrality_ok: boolean; uncertainty?: string; confidence: string;
}
async function extractKnowledgeWithGemini(cfg: Config, c: Candidate): Promise<Extracted | null> {
  const body = c.raw.slice(0, MAX_INPUT_CHARS);
  const prompt = `[발행사: ${canon(c.company || "")}] [제목: ${c.title || ""}]\n\n${body}`;
  const res = await fetch(`${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${cfg.geminiKey}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: EXTRACT_SYSTEM }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0, responseMimeType: "application/json",
        responseSchema: EXTRACT_SCHEMA, thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  if (!res.ok) throw new Error("gemini_http_" + res.status);
  const gj = await res.json();
  const txt = gj?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  try { return JSON.parse(txt) as Extracted; } catch { return null; }
}

// ── 9) runDeterministicDiff (검수기준 §4 — 코드 토큰 대조) ────
function tokenizeNumbers(s: string): string[] {
  return (s.match(/\d[\d,]*(?:\.\d+)?%?/g) || []).map((x) => x.replace(/,/g, ""));
}
function knownCompanies(s: string): string[] {
  const found = new Set<string>();
  for (const k of Object.keys(CANON)) { if (k !== "미상" && k !== "소식지" && s.includes(k)) found.add(CANON[k]); }
  return Array.from(found);
}
function runDeterministicDiff(raw: string, ex: Extracted): { flag: DiffFlag; notes: string[] } {
  const notes: string[] = [];
  const rawNums = new Set(tokenizeNumbers(raw));
  const outText = `${ex.title}\n${ex.body}\n${(ex.proper_nouns || []).join(" ")}`;
  const outNums = tokenizeNumbers(outText);
  // (a) 정규화에 있는데 원문에 없는 숫자 = 신규 생성 → fail
  const newNums = outNums.filter((n) => n.length >= 2 && !rawNums.has(n));
  if (newNums.length) notes.push("신규 숫자 " + newNums.slice(0, 5).join(","));
  // (b) 정규화에 있는데 원문에 없는 회사명 = 환각 → fail
  const rawCos = new Set(knownCompanies(raw));
  const newCos = knownCompanies(outText).filter((co) => !rawCos.has(co));
  if (newCos.length) notes.push("신규 회사명 " + newCos.join(","));
  // (c) 본문이 비정상적으로 김(원문보다 길면 창작 의심) → warning
  if ((ex.body || "").length > raw.length * 1.3 && raw.length > 200) notes.push("본문 과다(창작 의심)");

  if (newNums.length || newCos.length) return { flag: "diff_fail", notes };
  if (notes.length || ex.uncertainty) return { flag: "diff_warning", notes };
  return { flag: "diff_pass", notes };
}

// ── 10) evaluateLifecycleCandidate (검수기준 §8) ──────────────
function evaluateLifecycleCandidate(c: Candidate, ex: Extracted): Lifecycle {
  const sig = (ex.timeliness_signal || "").toLowerCase();
  if (sig.includes("expired") || sig.includes("superseded") || sig.includes("단종") || sig.includes("만료"))
    return "expired_or_superseded";
  if (sig.includes("archive") || sig.includes("과거")) return "archive";
  if (sig.includes("current") || sig.includes("현재")) {
    // published 기준 보조 — 24개월 초과면 사람 확인 위해 unknown로 낮춤(보수)
    if (c.publish_year && c.publish_year <= 2024) return "validity_unknown";
    return "current";
  }
  return "validity_unknown";
}

// ── 11) buildKnowledgeCandidate (적재 행 + 검수상태 판정) ──────
interface BuiltResult {
  decision: ReviewState; lifecycle: Lifecycle; diff: DiffFlag;
  row: Record<string, unknown> | null; reason: string;
}
function buildKnowledgeCandidate(
  c: Candidate, ex: Extracted, elig: Eligibility, diff: { flag: DiffFlag }, lifecycle: Lifecycle,
  hash: string, pipelineVersion: string,
): BuiltResult {
  // 검수기준 분기 — 공개 적재는 eligible_public + 지식 있음 + 개인정보 분리 가능에 한함.
  if (!ex.has_insurance_knowledge)
    return { decision: "discarded", lifecycle, diff: diff.flag, row: null, reason: "보험지식 없음" };
  if (ex.pii_present && !ex.pii_separable)
    return { decision: "discarded", lifecycle, diff: diff.flag, row: null, reason: "개인정보 분리 불가" };
  if (elig === "source_rejected" || ex.eligibility_doubt)
    return { decision: "discarded", lifecycle, diff: diff.flag, row: null, reason: "소스 부적격/외부저작물 의심" };
  if (elig === "internal_only")
    return { decision: "discarded", lifecycle, diff: diff.flag, row: null, reason: "내부자료(공용 적재 금지)" };
  if (diff.flag === "diff_fail")
    return { decision: "discarded", lifecycle, diff: diff.flag, row: null, reason: "diff_fail(왜곡/환각)" };

  // hold 사유: 개인정보 있었음(제거 후 확인) / diff_warning / 적격성 불확실 / 시의성 미확정 / 중립성 의심
  const holdReasons: string[] = [];
  if (ex.pii_present) holdReasons.push("개인정보 제거후 확인");
  if (diff.flag === "diff_warning") holdReasons.push("diff_warning");
  if (elig === "manual_review_required") holdReasons.push("소스 적격성 확인");
  if (lifecycle === "validity_unknown") holdReasons.push("시의성 미확정");
  if (!ex.neutrality_ok) holdReasons.push("중립성 확인");

  const decision: ReviewState = holdReasons.length ? "hold" : "ai_draft";
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
    diff_flag: diff.flag,
    pipeline_version: pipelineVersion,
    source_hash: hash,
    created_by: "ai",
  };
  return { decision, lifecycle, diff: diff.flag, row, reason: holdReasons.join("+") || "ok" };
}

// ── 12) writeMiningState (멱등 upsert) ────────────────────────
async function writeMiningState(
  sb: SupabaseClient, cfg: Config, c: Candidate, hash: string,
  elig: Eligibility, status: "done" | "failed" | "skipped", attempt: number, errCode: string | null, batchId: string,
) {
  if (cfg.dryRun) return;   // dry-run은 멱등 마커 안 남김(반복 검증 가능)
  await sb.from("knowledge_mining_state").upsert({
    source_type: c.source_type, source_id: c.source_id, source_hash: hash,
    pipeline_version: cfg.pipelineVersion, mining_status: status,
    eligibility_status: elig, attempt_count: attempt + 1,
    last_error_code: errCode, last_mined_at: new Date().toISOString(), batch_id: batchId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "source_type,source_id,pipeline_version" });
}

// ── 13) writeCandidate (dry_run=false + 적재 대상일 때만 INSERT) ──
async function writeCandidate(sb: SupabaseClient, cfg: Config, row: Record<string, unknown>): Promise<boolean> {
  if (cfg.dryRun || !row) return false;
  // 중복 방지: 같은 source_id + 같은 pipeline_version 이미 있으면 skip
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
// 응답 직전 마지막 안전망 — report 항목의 발췌 필드를 한 번 더 마스킹해 원문 누출 0 보장.
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

  // 보안
  if (!cfg.cronSecret || req.headers.get("x-cron-secret") !== cfg.cronSecret) return json({ error: "unauthorized" }, 401);
  if (!cfg.geminiKey) return json({ error: "missing_gemini_key" }, 500);

  // kill switch + cron 가드
  const kill = checkKillSwitch(cfg);
  if (kill) return json({ ok: false, halted: kill });
  // cron 호출인데 아직 CRON_ENABLED=false면 즉시 idle (표본 통과 전 대량 차단)
  if (payload.via === "cron" && !CRON_ENABLED) return json({ ok: true, note: "cron_disabled" });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // 테이블 존재 preflight
  {
    const { error } = await sb.from("knowledge_mining_state").select("state_id").limit(1);
    if (error) return json({ error: "tables_missing", detail: error.message }, 400);
  }

  // 일일 상한(작업지시서 §11) — 오늘 done 건수 확인
  if (!cfg.dryRun) {
    const since = new Date(); since.setUTCHours(0, 0, 0, 0);
    const { count } = await sb.from("knowledge_mining_state").select("state_id", { count: "exact", head: true })
      .eq("mining_status", "done").gte("last_mined_at", since.toISOString());
    if ((count ?? 0) >= MAX_ITEMS_PER_DAY) return json({ ok: true, note: "daily_cap_reached", done_today: count });
  }

  const batchId = crypto.randomUUID();
  const candidates = await selectCandidates(sb, cfg);

  const report: Array<Record<string, unknown>> = [];
  let processed = 0, adraft = 0, held = 0, discarded = 0, skipped = 0, failed = 0, inserted = 0;
  let geminiCalls = 0, inputChars = 0;

  for (const c of candidates) {
    if (processed >= cfg.limit) break;
    if (!c.raw.trim()) { skipped++; continue; }

    const hash = await calculateSourceHash(c.raw);
    const ms = await checkMiningState(sb, cfg, c, hash);
    if (ms.skip) { skipped++; continue; }
    processed++;

    const elig = evaluateSourceEligibility(c);
    const piiCode = detectSensitiveData(c.raw);   // 코드 1차 탐지(Gemini와 교차)

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

    // 코드 PII 탐지와 Gemini 판정 병합(보수: 둘 중 하나라도 present면 present)
    if (piiCode.found) ex.pii_present = true;

    const diff = runDeterministicDiff(c.raw, ex);
    const lifecycle = evaluateLifecycleCandidate(c, ex);
    const built = buildKnowledgeCandidate(c, ex, elig.status, diff, lifecycle, hash, cfg.pipelineVersion);

    // 적재(비-dry-run + 적재 대상)
    const didInsert = await writeCandidate(sb, cfg, built.row || {});
    if (didInsert) inserted++;
    const finalState: "done" | "skipped" = built.decision === "discarded" ? "skipped" : "done";
    await writeMiningState(sb, cfg, c, hash, elig.status, finalState, ms.attempt, null, batchId);

    if (built.decision === "ai_draft") adraft++;
    else if (built.decision === "hold") held++;
    else discarded++;

    report.push({
      source_id: c.source_id, source_type: c.source_type,
      eligibility: elig.status,
      pii_present: ex.pii_present, pii_separable: ex.pii_separable, pii_kinds: piiCode.kinds,
      diff: diff.flag, diff_notes: diff.notes,
      lifecycle,
      decision: built.decision, reason: built.reason,
      neutrality_ok: ex.neutrality_ok, confidence: ex.confidence,
      title: (ex.title || "").slice(0, 80),
      raw_excerpt: safeExcerpt(c.raw),        // 마스킹된 원문 발췌
      norm_excerpt: maskPII((ex.body || "").slice(0, 160)).replace(/\s+/g, " ").trim(),
    });
  }

  return returnSafeReport({
    ok: true, batch_id: batchId, pipeline_version: cfg.pipelineVersion,
    dry_run: cfg.dryRun, source_type: cfg.sourceType,
    counts: { processed, ai_draft: adraft, hold: held, discarded, skipped, failed, inserted },
    cost: { gemini_calls: geminiCalls, input_chars: inputChars, est_input_tokens: Math.round(inputChars / 4) },
    note: cfg.dryRun ? "DRY-RUN — knowledge_entries INSERT 0, mining_state 마커 0" : "LIVE",
    report,
  });
});
