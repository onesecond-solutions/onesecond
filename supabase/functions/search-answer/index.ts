// supabase/functions/search-answer/index.ts
//
// AI 검색 답변 — 소식지(newsletters) 본문에서 질문 관련 구절을 찾아 Gemini가 "회사별 정리 + 출처"로 합성.
// 예) "암주요치료비" → 회사별 보장내용 정리 + 근거(회사·연월).
//
// 🔒 정확성 원칙(보험): 제공된 소식지 원문에 있는 내용만. 추측·창작 금지. 각 항목 출처 명시.
//
// 키:  GEMINI_API_KEY (secret, gemini-card 재사용)
// DB:  SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (Edge Function 자동 주입) — newsletters 읽기 전용
//
// 입력 (POST JSON): { "query": "암주요치료비" }
// 출력 (200 JSON): { found, summary, companies:[{company, period, detail, source_id}], used }
// 실패 (4xx/5xx):  { error }

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MAX_DOCS = 25;          // 본문 검색 상한
const EXCERPT_RADIUS = 700;   // 키워드 주변 발췌 반경(자)
const MAX_EXCERPTS_PER_DOC = 2;
let CACHED_MODEL = "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

async function pickModel(apiKey: string): Promise<string> {
  if (CACHED_MODEL) return CACHED_MODEL;
  try {
    const r = await fetch(`${API_BASE}/models?key=${apiKey}`);
    if (r.ok) {
      const j = await r.json();
      const usable = (j.models || []).filter((m: { supportedGenerationMethods?: string[] }) =>
        (m.supportedGenerationMethods || []).includes("generateContent"));
      const bad = /(embedding|aqa|tts|audio|imagen|image-generation|learnlm)/i;
      const chosen =
        usable.find((m: { name: string }) => /flash/i.test(m.name) && !bad.test(m.name)) ||
        usable.find((m: { name: string }) => /gemini/i.test(m.name) && !bad.test(m.name)) ||
        usable[0];
      if (chosen) { CACHED_MODEL = String(chosen.name).replace(/^models\//, ""); return CACHED_MODEL; }
    }
  } catch (e) { console.error("[search-answer] ListModels 오류", e); }
  return "gemini-1.5-flash";
}

// full_text 에서 질문어 주변 구절만 발췌(토큰 절약)
function buildExcerpt(text: string, terms: string[]): string {
  if (!text) return "";
  const lower = text.toLowerCase();
  const hits: number[] = [];
  for (const t of terms) {
    let from = 0, k;
    while ((k = lower.indexOf(t.toLowerCase(), from)) >= 0 && hits.length < MAX_EXCERPTS_PER_DOC) {
      hits.push(k); from = k + t.length;
    }
    if (hits.length >= MAX_EXCERPTS_PER_DOC) break;
  }
  if (!hits.length) return text.slice(0, EXCERPT_RADIUS).replace(/\s+/g, " ").trim();
  const parts: string[] = [];
  for (const h of hits) {
    const s = Math.max(0, h - EXCERPT_RADIUS), e = Math.min(text.length, h + EXCERPT_RADIUS);
    parts.push((s > 0 ? "…" : "") + text.slice(s, e).replace(/\s+/g, " ").trim() + (e < text.length ? "…" : ""));
  }
  return parts.join(" / ");
}

const RESULT_SCHEMA = {
  type: "OBJECT",
  properties: {
    found: { type: "BOOLEAN", description: "관련 내용이 소식지에 있었는지" },
    summary: { type: "STRING", description: "질문에 대한 1~2문장 요약(회사 통틀어)" },
    companies: {
      type: "ARRAY",
      description: "회사별 정리. 소식지 원문에 근거가 있는 회사만.",
      items: {
        type: "OBJECT",
        properties: {
          company: { type: "STRING", description: "보험사명" },
          period: { type: "STRING", description: "출처 소식지 연월 (예: 2026.3)" },
          detail: { type: "STRING", description: "해당 질문에 대한 보장/내용 정리(원문 근거, 수치·조건 그대로)" },
          source_id: { type: "STRING", description: "근거 소식지 id" },
        },
        required: ["company", "detail", "source_id"],
      },
    },
  },
  required: ["found", "summary", "companies"],
};

const SYSTEM_PROMPT = [
  "너는 보험 소식지 자료만 근거로 답하는 검색 도우미다.",
  "사용자 질문에 대해, 제공된 소식지 발췌들에서 회사별로 핵심 내용을 정리한다.",
  "🔒 절대 규칙: 제공된 발췌에 실제로 있는 내용만 쓴다. 없는 수치·조건·보장은 절대 지어내지 않는다.",
  "발췌에 질문과 관련된 내용이 없는 회사는 결과에서 제외한다. 하나도 없으면 found=false.",
  "보장 금액·비율·조건·특약명은 원문 표기를 그대로 옮긴다(요약하되 수치는 변형 금지).",
  "각 회사 항목에는 반드시 출처 소식지의 id(source_id)와 연월(period)을 넣는다.",
  "한국어로, 상담사가 한눈에 비교할 수 있게 간결하게.",
].join(" ");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST만 허용됩니다." }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const sbUrl = Deno.env.get("SUPABASE_URL");
  const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!apiKey || !sbUrl || !sbKey) {
    console.error("[search-answer] 환경변수 누락", { apiKey: !!apiKey, sbUrl: !!sbUrl, sbKey: !!sbKey });
    return json({ error: "검색 설정이 아직 준비되지 않았습니다." }, 500);
  }

  let query = "";
  try { const b = await req.json(); query = String((b && b.query) || "").trim(); }
  catch (_e) { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  if (query.length < 2) return json({ error: "검색어를 2자 이상 입력해 주세요." }, 400);

  const terms = query.split(/\s+/).filter(Boolean);

  // 1) 관련 소식지 본문 검색 (service_role, RLS 우회, 읽기 전용)
  let docs: Array<{ id: string; company: string; publish_year: number; publish_month: number; title: string; full_text: string }> = [];
  try {
    const orFilter = terms.length <= 1
      ? `or=(full_text.ilike.${encodeURIComponent("*" + (terms[0] || "") + "*")},title.ilike.${encodeURIComponent("*" + (terms[0] || "") + "*")})`
      : `and=(${terms.map((t) => `or(full_text.ilike.${encodeURIComponent("*" + t + "*")},title.ilike.${encodeURIComponent("*" + t + "*")})`).join(",")})`;
    const url = `${sbUrl}/rest/v1/newsletters?${orFilter}&select=id,company,publish_year,publish_month,title,full_text&order=publish_year.desc.nullslast,publish_month.desc.nullslast&limit=${MAX_DOCS}`;
    const r = await fetch(url, { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } });
    if (r.ok) docs = await r.json();
    else console.error("[search-answer] newsletters 조회 실패", r.status, await r.text().catch(() => ""));
  } catch (e) { console.error("[search-answer] 조회 오류", e); }

  if (!docs.length) return json({ found: false, summary: "관련 소식지를 찾지 못했습니다.", companies: [], used: 0 });

  // 2) 발췌 구성(토큰 절약)
  const context = docs.map((d) =>
    `[id:${d.id} | ${d.company || "회사미상"} | ${d.publish_year || "?"}.${d.publish_month || "?"}]\n${buildExcerpt(d.full_text || "", terms)}`
  ).join("\n\n---\n\n");

  // 3) Gemini 합성
  try {
    const model = await pickModel(apiKey);
    const gemRes = await fetch(`${API_BASE}/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{
          role: "user",
          parts: [{ text: `질문: "${query}"\n\n아래는 보험사 소식지 발췌들이다. 이 발췌에 근거해서만 회사별로 정리해줘.\n\n${context}` }],
        }],
        generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: RESULT_SCHEMA, maxOutputTokens: 4096 },
      }),
    });
    if (!gemRes.ok) {
      const errText = await gemRes.text().catch(() => "");
      console.error("[search-answer] Gemini HTTP", gemRes.status, "model=", model, errText.slice(0, 300));
      if (gemRes.status === 404) CACHED_MODEL = "";
      return json({ error: "AI 정리에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 502);
    }
    const data = await gemRes.json();
    const text = (data?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("");
    let result;
    try { result = JSON.parse(text); } catch (_e) {
      console.error("[search-answer] JSON 파싱 실패", text.slice(0, 300));
      return json({ error: "AI 정리 결과를 해석하지 못했습니다." }, 502);
    }
    return json({
      found: !!result.found,
      summary: String(result.summary || ""),
      companies: Array.isArray(result.companies) ? result.companies : [],
      used: docs.length,
    });
  } catch (e) {
    console.error("[search-answer] 호출 오류", e);
    return json({ error: "AI 검색 중 오류가 발생했습니다." }, 500);
  }
});
