// supabase/functions/extract-knowledge/index.ts
//
// 보험 지식 엔진 v0 — 소식지 샘플 채굴 (관리자/서버 전용).
// newsletters.full_text 를 읽어 Gemini 로 {용어/상품/보험사/시나리오} 추출 →
// knowledge_entries 에 status='ai_draft' 로 저장. 사용자 화면·검색 미연결.
//
// 보안:
//   - x-cron-secret 헤더가 CRON_SECRET 과 일치할 때만 동작 (공개 호출 차단).
//   - service_role 은 이 함수 내부에서만 사용(클라이언트 노출 0). [조건 1·2]
// 환각 방지:
//   - 프롬프트가 "본문에 실제로 있는 내용만" 추출하도록 강제 + 각 항목 source_ref=newsletter.id 부착. [조건]
// 멱등/중복방지:
//   - (type, lower(title)) 가 이미 knowledge_entries 에 있으면 skip. [조건 9]
// 로그:
//   - 건당 시간·문자수·추출수 + 누적 → 응답 report 로 반환. [조건 8]
//
// 입력(POST body):
//   { "ids": ["uuid", ...] }            // 특정 소식지 id 들
//   또는 { "sample": true, "limit": 30 } // text_quality 분포 비례 샘플
//
// 필요한 secret: CRON_SECRET, GEMINI_API_KEY
//   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 는 런타임 자동 주입)

import { createClient } from "npm:@supabase/supabase-js@2";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MAX_CHARS = 30000;          // Gemini 에 보낼 본문 상한 (비용 통제)
let CACHED_MODEL = "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// 회사명 정규화 사전 (조건 4) — 변형 → canonical. 미등록은 원문 유지.
const CANON: Record<string, string> = {
  "메트라이프생명": "메트라이프", "메트라이프": "메트라이프",
  "AIG손해보험": "AIG손보", "AIG손보": "AIG손보",
  "KB라이프생명": "KB라이프", "KB라이프": "KB라이프",
  "iM라이프생명": "iM라이프", "iM라이프": "iM라이프", "IM라이프": "iM라이프",
  "DB생명": "DB생명", "KDB생명": "DB생명",
  "ABL생명": "ABL생명", "동양생명": "동양생명", "라이나생명": "라이나생명",
  "미래에셋생명": "미래에셋생명", "메리츠화재": "메리츠화재",
};
function canon(c: string): string { return CANON[(c || "").trim()] || (c || "").trim(); }

async function pickModel(apiKey: string): Promise<string> {
  if (CACHED_MODEL) return CACHED_MODEL;
  try {
    const r = await fetch(`${API_BASE}/models?key=${apiKey}`);
    if (r.ok) {
      const j = await r.json();
      const usable = (j.models || []).filter((m: { supportedGenerationMethods?: string[] }) =>
        (m.supportedGenerationMethods || []).includes("generateContent"));
      const bad = /(vision|embedding|aqa|image|tts|audio|thinking|learnlm)/i;
      const chosen =
        usable.find((m: { name: string }) => /flash/i.test(m.name) && !bad.test(m.name)) ||
        usable.find((m: { name: string }) => /flash/i.test(m.name)) ||
        usable.find((m: { name: string }) => /gemini/i.test(m.name) && !bad.test(m.name)) ||
        usable[0];
      if (chosen) { CACHED_MODEL = String(chosen.name).replace(/^models\//, ""); return CACHED_MODEL; }
    }
  } catch (_e) { /* fallthrough */ }
  return "gemini-1.5-flash";
}

const EXTRACT_SCHEMA = {
  type: "OBJECT",
  properties: {
    terms: { type: "ARRAY", description: "보험 용어 + 정의", items: {
      type: "OBJECT", properties: { title: { type: "STRING" }, body: { type: "STRING" } }, required: ["title", "body"] } },
    products: { type: "ARRAY", description: "상품명 + 핵심 설명", items: {
      type: "OBJECT", properties: { title: { type: "STRING" }, body: { type: "STRING" } }, required: ["title", "body"] } },
    insurers: { type: "ARRAY", description: "보험사 + 이 자료에서 드러난 특징", items: {
      type: "OBJECT", properties: { title: { type: "STRING" }, body: { type: "STRING" } }, required: ["title", "body"] } },
    scenarios: { type: "ARRAY", description: "실무 안내/시나리오(있으면)", items: {
      type: "OBJECT", properties: { title: { type: "STRING" }, body: { type: "STRING" } }, required: ["title", "body"] } },
  },
  required: ["terms", "products", "insurers", "scenarios"],
};

const SYSTEM = [
  "너는 보험 소식지/매뉴얼 본문에서 '검색 가능한 보험 지식'을 추출하는 전문가다.",
  "반드시 아래 본문에 '실제로 적혀 있는 내용'만 추출한다. 본문에 없는 일반 상식·추측·창작은 절대 넣지 않는다(환각 금지).",
  "terms: 보험 용어와 그 정의 / products: 상품명과 핵심 / insurers: 발행 보험사 특징 / scenarios: 실무 안내·절차.",
  "각 항목은 간결하게. 본문에 근거 없는 항목은 빈 배열로 둔다.",
].join("\n");

interface NL { id: string; company: string | null; title: string | null; full_text: string | null; text_quality: string | null; }

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) return json({ error: "unauthorized" }, 401);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "missing_gemini_key" }, 500);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const model = await pickModel(apiKey);

  let payload: { ids?: string[]; sample?: boolean; limit?: number } = {};
  try { payload = await req.json(); } catch (_e) { /* */ }

  // 대상 소식지 선정 (조건 3: 읽기)
  let rows: NL[] = [];
  if (payload.ids && payload.ids.length) {
    const { data } = await supabase.from("newsletters")
      .select("id, company, title, full_text, text_quality").in("id", payload.ids);
    rows = (data as NL[]) || [];
  } else {
    const lim = Math.min(payload.limit ?? 30, 30); // 샘플 상한 30
    const { data } = await supabase.from("newsletters")
      .select("id, company, title, full_text, text_quality")
      .not("full_text", "is", null).order("char_length", { ascending: false }).limit(lim);
    rows = (data as NL[]) || [];
  }

  const t0 = Date.now();
  let processed = 0, success = 0, fail = 0, entriesCreated = 0;
  let termCnt = 0, productCnt = 0, insurerCnt = 0, scenarioCnt = 0, geminiChars = 0;
  const samples: unknown[] = [];

  for (const nl of rows) {
    processed++;
    const body = (nl.full_text || "").slice(0, MAX_CHARS);
    if (!body.trim()) { fail++; continue; }
    geminiChars += body.length;
    const conf = nl.text_quality === "텍스트" ? "high" : (nl.text_quality === "이미지" ? "low" : "med");
    try {
      const gemRes = await fetch(`${API_BASE}/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ parts: [{ text: `[발행사: ${canon(nl.company || "")}] [제목: ${nl.title || ""}]\n\n${body}` }] }],
          generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: EXTRACT_SCHEMA },
        }),
      });
      if (!gemRes.ok) { fail++; continue; }
      const gj = await gemRes.json();
      const txt = gj?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
      const ex = JSON.parse(txt);
      success++;

      const buckets: Array<[string, Array<{ title: string; body: string }>]> = [
        ["term", ex.terms || []], ["product", ex.products || []],
        ["insurer", ex.insurers || []], ["scenario", ex.scenarios || []],
      ];
      for (const [type, items] of buckets) {
        for (const it of items) {
          const title = (it.title || "").trim();
          if (!title) continue;
          // 중복 방지 (조건 9): 동일 (type, lower title) 이미 있으면 skip
          const { data: dup } = await supabase.from("knowledge_entries")
            .select("id").eq("type", type).ilike("title", title).limit(1);
          if (dup && dup.length) continue;
          const { error: insErr } = await supabase.from("knowledge_entries").insert({
            type, title, body: (it.body || "").slice(0, 4000),
            category: type === "insurer" ? "보험사" : null,
            source_type: "newsletter", source_ref: nl.id,
            status: "ai_draft", confidence: conf, created_by: "extract-knowledge",
          });
          if (insErr) continue;
          entriesCreated++;
          if (type === "term") termCnt++; else if (type === "product") productCnt++;
          else if (type === "insurer") insurerCnt++; else scenarioCnt++;
          if (samples.length < 5) samples.push({ type, title, body: (it.body || "").slice(0, 200), source_ref: nl.id });
        }
      }
    } catch (_e) { fail++; }
  }

  const elapsedMs = Date.now() - t0;
  // 대략 비용 추정 (Gemini flash 입력 토큰 ≈ 문자/4). 실단가는 콘솔 확인.
  const estInputTokens = Math.round(geminiChars / 4);
  return json({
    ok: true, model,
    processed, success, fail, entries_created: entriesCreated,
    terms: termCnt, products: productCnt, insurers: insurerCnt, scenarios: scenarioCnt,
    elapsed_ms: elapsedMs, gemini_input_chars: geminiChars, est_input_tokens: estInputTokens,
    samples,
  });
});
