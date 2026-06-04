// supabase/functions/extract-knowledge/index.ts
//
// 보험 지식 엔진 v0 — 소식지 샘플 채굴 (관리자/서버 전용). 측정이 목적.
// newsletters.full_text → Gemini 추출{용어/상품/보험사/시나리오} → knowledge_entries(ai_draft).
// 추적: run → run_item(newsletter별) → errors / entries (run_id·run_item_id).
//
// 보안: x-cron-secret 일치 시만 / service_role 함수 내부만(클라 노출 0).
// 환각방지: "본문에 실제 있는 내용만" + source_id=newsletter.id.
// 멱등/중복방지: (type, lower title) 존재 시 skip.
// 입력: { "ids":[...] } 또는 { "sample":true, "limit":30 }
// secret: CRON_SECRET, GEMINI_API_KEY (+ SUPABASE_URL/SERVICE_ROLE_KEY 자동)

import { createClient } from "npm:@supabase/supabase-js@2";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MAX_CHARS = 30000;
let CACHED_MODEL = "";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

const CANON: Record<string, string> = {
  "메트라이프생명": "메트라이프", "메트라이프": "메트라이프",
  "AIG손해보험": "AIG손보", "AIG손보": "AIG손보",
  "KB라이프생명": "KB라이프", "KB라이프": "KB라이프",
  "iM라이프생명": "iM라이프", "iM라이프": "iM라이프", "IM라이프": "iM라이프",
  "DB생명": "DB생명", "KDB생명": "DB생명", "ABL생명": "ABL생명",
  "동양생명": "동양생명", "라이나생명": "라이나생명", "미래에셋생명": "미래에셋생명", "메리츠화재": "메리츠화재",
};
const canon = (c: string) => CANON[(c || "").trim()] || (c || "").trim();

async function pickModel(apiKey: string): Promise<string> {
  if (CACHED_MODEL) return CACHED_MODEL;
  try {
    const r = await fetch(`${API_BASE}/models?key=${apiKey}`);
    if (r.ok) {
      const j = await r.json();
      const usable = (j.models || []).filter((m: { supportedGenerationMethods?: string[] }) => (m.supportedGenerationMethods || []).includes("generateContent"));
      const bad = /(vision|embedding|aqa|image|tts|audio|thinking|learnlm)/i;
      const chosen = usable.find((m: { name: string }) => /flash/i.test(m.name) && !bad.test(m.name)) || usable.find((m: { name: string }) => /flash/i.test(m.name)) || usable.find((m: { name: string }) => /gemini/i.test(m.name) && !bad.test(m.name)) || usable[0];
      if (chosen) { CACHED_MODEL = String(chosen.name).replace(/^models\//, ""); return CACHED_MODEL; }
    }
  } catch (_e) { /* */ }
  return "gemini-1.5-flash";
}

const SCHEMA = {
  type: "OBJECT",
  properties: {
    terms: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, body: { type: "STRING" } }, required: ["title", "body"] } },
    products: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, body: { type: "STRING" } }, required: ["title", "body"] } },
    insurers: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, body: { type: "STRING" } }, required: ["title", "body"] } },
    scenarios: { type: "ARRAY", items: { type: "OBJECT", properties: { title: { type: "STRING" }, body: { type: "STRING" } }, required: ["title", "body"] } },
  },
  required: ["terms", "products", "insurers", "scenarios"],
};
const SYSTEM = [
  "너는 보험 소식지/매뉴얼 본문에서 '검색 가능한 보험 지식'을 추출한다.",
  "반드시 아래 본문에 '실제로 적혀 있는 내용'만 추출한다. 본문에 없는 상식·추측·창작은 절대 넣지 않는다(환각 금지).",
  "terms=용어+정의 / products=상품명+핵심 / insurers=발행사 특징 / scenarios=실무 안내·절차. 근거 없으면 빈 배열.",
].join("\n");

interface NL { id: string; company: string | null; title: string | null; source_filename: string | null; full_text: string | null; text_quality: string | null; publish_year: number | null; publish_month: number | null; }
type Stage = "fetch" | "prompt_build" | "gemini_call" | "json_parse" | "validation" | "insert";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) return json({ error: "unauthorized" }, 401);
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "missing_gemini_key" }, 500);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let payload: { ids?: string[]; sample?: boolean; limit?: number; preflight?: boolean } = {};
  try { payload = await req.json(); } catch (_e) { /* */ }

  // ── preflight: 대상 테이블 존재 확인 (없으면 Gemini 호출 0회로 즉시 중단) ──
  {
    const { error: pf } = await supabase.from("knowledge_extract_runs").select("run_id").limit(1);
    if (pf) return json({ error: "tables_missing", detail: pf.message }, 400);
  }
  // payload.preflight=true → Gemini 호출 없이 점검만(테이블 OK + 채굴 대상 건수)
  if (payload.preflight) {
    const { count, error: nlErr } = await supabase.from("newsletters").select("id", { count: "exact", head: true }).not("full_text", "is", null);
    if (nlErr) return json({ error: "newsletter_probe_failed", detail: nlErr.message }, 500);
    return json({ ok: true, preflight: true, tables_ok: true, newsletters_available: count });
  }

  const model = await pickModel(apiKey);
  const runId = crypto.randomUUID();
  const sourceKind = payload.ids && payload.ids.length ? "ids" : "sample";

  let rows: NL[] = [];
  if (sourceKind === "ids") {
    const { data } = await supabase.from("newsletters").select("id, company, title, source_filename, full_text, text_quality, publish_year, publish_month").in("id", payload.ids!);
    rows = (data as NL[]) || [];
  } else {
    const lim = Math.min(payload.limit ?? 30, 30);
    const { data } = await supabase.from("newsletters").select("id, company, title, source_filename, full_text, text_quality, publish_year, publish_month").not("full_text", "is", null).order("char_length", { ascending: false }).limit(lim);
    rows = (data as NL[]) || [];
  }

  const { error: runInsErr } = await supabase.from("knowledge_extract_runs").insert({ run_id: runId, model, source: sourceKind, requested: rows.length, status: "running" });
  if (runInsErr) return json({ error: "run_insert_failed", detail: runInsErr.message }, 500);

  async function logErr(nl: NL, runItemId: number | null, stage: Stage, msg: string, retryable: boolean, inputLen: number) {
    console.error(`[extract-knowledge][${stage}]`, nl.id, msg);
    try {
      await supabase.from("knowledge_extract_errors").insert({
        run_id: runId, run_item_id: runItemId, source_type: "newsletter", source_id: nl.id, file_name: nl.source_filename || nl.title,
        insurance_company: canon(nl.company || ""), stage, error_message: String(msg).slice(0, 500),
        retryable, input_text_length: inputLen, model_name: model,
      });
    } catch (_e) { /* 로그 실패도 작업 중단 X */ }
  }

  const t0 = Date.now();
  let processed = 0, success = 0, fail = 0, entriesCreated = 0;
  let termCnt = 0, productCnt = 0, insurerCnt = 0, scenarioCnt = 0, geminiChars = 0;
  const samples: unknown[] = [];

  for (const nl of rows) {
    processed++;
    const itemStart = Date.now();
    const inputLen = (nl.full_text || "").length;
    // run_item 생성 (newsletter별 처리 상태)
    const { data: itemRow } = await supabase.from("knowledge_extract_run_items").insert({
      run_id: runId, source_type: "newsletter", source_id: nl.id, file_name: nl.source_filename || nl.title, company: canon(nl.company || ""),
      status: "processing", input_text_length: inputLen,
    }).select("run_item_id").single();
    const runItemId: number | null = itemRow?.run_item_id ?? null;

    let stage: Stage = "fetch";
    let itemEntries = 0, itemStatus = "success", failStage: string | null = null;
    try {
      const body = (nl.full_text || "").slice(0, MAX_CHARS);
      if (!body.trim()) { failStage = "fetch"; itemStatus = "fail"; await logErr(nl, runItemId, "fetch", "empty_body", false, 0); fail++; throw new Error("__handled__"); }
      geminiChars += body.length;
      const conf = nl.text_quality === "텍스트" ? "high" : (nl.text_quality === "이미지" ? "low" : "med");
      const sourceDate = (nl.publish_year && nl.publish_month) ? `${nl.publish_year}-${String(nl.publish_month).padStart(2, "0")}` : null;

      stage = "prompt_build";
      const prompt = `[발행사: ${canon(nl.company || "")}] [제목: ${nl.title || ""}]\n\n${body}`;

      stage = "gemini_call";
      const gemRes = await fetch(`${API_BASE}/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: SCHEMA, thinkingConfig: { thinkingBudget: 0 } } }),
      });
      if (!gemRes.ok) { failStage = "gemini_call"; itemStatus = "fail"; await logErr(nl, runItemId, "gemini_call", "http_" + gemRes.status, gemRes.status >= 500 || gemRes.status === 429, body.length); fail++; throw new Error("__handled__"); }

      stage = "json_parse";
      const gj = await gemRes.json();
      const txt = gj?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      let ex: { terms?: { title: string; body: string }[]; products?: { title: string; body: string }[]; insurers?: { title: string; body: string }[]; scenarios?: { title: string; body: string }[] };
      try { ex = JSON.parse(txt); } catch (pe) { failStage = "json_parse"; itemStatus = "fail"; await logErr(nl, runItemId, "json_parse", String(pe), true, body.length); fail++; throw new Error("__handled__"); }

      stage = "validation";
      if (!ex || typeof ex !== "object") { failStage = "validation"; itemStatus = "fail"; await logErr(nl, runItemId, "validation", "not_object", true, body.length); fail++; throw new Error("__handled__"); }
      success++;

      stage = "insert";
      const buckets: Array<[string, { title: string; body: string }[]]> = [["term", ex.terms || []], ["product", ex.products || []], ["insurer", ex.insurers || []], ["scenario", ex.scenarios || []]];
      for (const [type, items] of buckets) {
        for (const it of items) {
          const title = (it.title || "").trim();
          if (!title) continue;
          const { data: dup } = await supabase.from("knowledge_entries").select("entry_id").eq("type", type).ilike("title", title).limit(1);
          if (dup && dup.length) continue;
          const { error: insErr } = await supabase.from("knowledge_entries").insert({
            type, title, body: (it.body || "").slice(0, 4000), category: type === "insurer" ? "보험사" : null,
            source_type: "newsletter", source_id: nl.id, source_title: nl.title, source_company: nl.company,
            canonical_company_name: canon(nl.company || ""), source_date: sourceDate, source_page: null,
            run_id: runId, run_item_id: runItemId, model_name: model, confidence: conf, status: "ai_draft", created_by: "ai",
          });
          if (insErr) { await logErr(nl, runItemId, "insert", insErr.message, true, body.length); continue; }
          entriesCreated++; itemEntries++;
          if (type === "term") termCnt++; else if (type === "product") productCnt++; else if (type === "insurer") insurerCnt++; else scenarioCnt++;
          if (samples.length < 5) samples.push({ type, title, body: (it.body || "").slice(0, 200), source_id: nl.id });
        }
      }
    } catch (e) {
      if (String((e as Error)?.message) !== "__handled__") { failStage = stage; itemStatus = "fail"; await logErr(nl, runItemId, stage, String((e as Error)?.message || e), true, inputLen); fail++; }
    }
    // run_item 종료 갱신
    if (runItemId != null) {
      await supabase.from("knowledge_extract_run_items").update({ status: itemStatus, fail_stage: failStage, entries_count: itemEntries, elapsed_ms: Date.now() - itemStart }).eq("run_item_id", runItemId).then(() => {}, () => {});
    }
  }

  const elapsedMs = Date.now() - t0;
  const estInputTokens = Math.round(geminiChars / 4);
  await supabase.from("knowledge_extract_runs").update({
    finished_at: new Date().toISOString(), processed, success, fail, entries_created: entriesCreated,
    terms: termCnt, products: productCnt, insurers: insurerCnt, scenarios: scenarioCnt,
    input_chars: geminiChars, est_input_tokens: estInputTokens, status: "done",
  }).eq("run_id", runId).then(() => {}, () => {});

  return json({
    ok: true, run_id: runId, model, processed, success, fail, entries_created: entriesCreated,
    terms: termCnt, products: productCnt, insurers: insurerCnt, scenarios: scenarioCnt,
    elapsed_ms: elapsedMs, gemini_input_chars: geminiChars, est_input_tokens: estInputTokens, samples,
  });
});
