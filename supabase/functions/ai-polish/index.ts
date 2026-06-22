// supabase/functions/ai-polish/index.ts
//
// AI 글 다듬기 — 스크립트/메모 등 본문을 Gemini로 교정·다듬기.
//   mode="spelling" → 맞춤법만 교정(의미·어휘·구조 불변)
//   mode="natural"  → 문장을 자연스럽게 다듬기(뜻 보존, 더 읽기 쉽게)
//
// 🔒 보험 정확성 원칙: 숫자·금액·날짜·보험사명·상품명·담보명 등 수치·고유명사는 절대 변경 금지(프롬프트에 명시).
//
// 키:  GEMINI_API_KEY (secret, gemini-card / search-answer 재사용 — 추가 키 없음)
// 입력 (POST JSON): { "text": "<본문>", "mode": "spelling" | "natural" }
// 출력 (200 JSON): { "polished": "<다듬은 본문>", "mode", "model" }
// 실패 (4xx/5xx):  { "error" }

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MAX_INPUT = 8000;   // 입력 글자 상한(비용·악용 방지)
let CACHED_MODEL = "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// search-answer 와 동일한 모델 선택(gemini-2.5-flash 우선)
async function pickModel(apiKey: string): Promise<string> {
  if (CACHED_MODEL) return CACHED_MODEL;
  try {
    const r = await fetch(`${API_BASE}/models?key=${apiKey}`);
    if (r.ok) {
      const j = await r.json();
      const usable = (j.models || []).filter((m: { supportedGenerationMethods?: string[] }) =>
        (m.supportedGenerationMethods || []).includes("generateContent"));
      const bad = /(embedding|aqa|tts|audio|imagen|image-generation|learnlm|vision|1\.0|1\.5|2\.0)/i;
      const chosen =
        usable.find((m: { name: string }) => /2\.5-flash/i.test(m.name) && !/lite|thinking|preview/i.test(m.name) && !bad.test(m.name)) ||
        usable.find((m: { name: string }) => /2\.5-flash/i.test(m.name) && !bad.test(m.name)) ||
        usable.find((m: { name: string }) => /flash/i.test(m.name) && !bad.test(m.name)) ||
        usable.find((m: { name: string }) => /gemini/i.test(m.name) && !bad.test(m.name)) ||
        usable[0];
      if (chosen) { CACHED_MODEL = String(chosen.name).replace(/^models\//, ""); return CACHED_MODEL; }
    }
  } catch (e) { console.error("[ai-polish] ListModels 오류", e); }
  return "gemini-2.5-flash";
}

// ── 프롬프트 2종 (총괄팀장 작성 · 서버측 고정) ────────────────────────────
const PROMPT_SPELLING = [
  "당신은 한국어 맞춤법 교정 도구입니다. 입력된 글의 맞춤법·띄어쓰기·오탈자·조사 오류만 바로잡아 출력합니다.",
  "- 의미·어휘 선택·문장 구조·어조·말투·길이는 절대 바꾸지 않는다.",
  "- 오직 맞춤법/띄어쓰기/오탈자/명백한 조사 오류만 고친다.",
  "- 숫자·금액·날짜·보험사명·상품명·담보명 등 수치와 고유명사는 한 글자도 바꾸지 않는다.",
  "- 줄바꿈·문단 구성은 그대로 둔다.",
  "- 고칠 것이 없으면 입력을 그대로 출력한다.",
  "- 설명·머리말·따옴표·마크다운 없이 교정된 본문만 출력한다.",
].join("\n");

const PROMPT_NATURAL = [
  "당신은 한국어 글다듬기 도구입니다. 보험 설계사가 고객에게 쓰는 스크립트·메시지를, 뜻은 그대로 두고 더 자연스럽고 읽기 쉽게 다듬어 출력합니다.",
  "- 원문의 의미·의도·핵심 정보를 보존한다. 없던 내용을 새로 지어내지 않는다.",
  "- 어색한 표현·비문·중복·어순을 자연스럽게 고치고, 맞춤법·띄어쓰기도 함께 바로잡는다.",
  "- 숫자·금액·날짜·보험사명·상품명·담보명 등 수치와 고유명사는 절대 바꾸지 않는다.",
  "- 어조·격식(존댓말 등)은 원문을 따른다. 과하게 화려하거나 장황하게 만들지 않는다.",
  "- 길이는 원문과 비슷하게 유지한다(불필요하게 늘리지 않음).",
  "- 줄바꿈·문단 구성은 가능한 한 유지한다.",
  "- 설명·머리말·따옴표·마크다운 없이 다듬은 본문만 출력한다.",
].join("\n");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST만 허용됩니다." }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.error("[ai-polish] GEMINI_API_KEY 누락");
    return json({ error: "AI 설정이 아직 준비되지 않았습니다." }, 500);
  }

  let text = ""; let mode = "spelling";
  try {
    const b = await req.json();
    text = String((b && b.text) || "");
    mode = String((b && b.mode) || "spelling");
  } catch (_e) { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }

  if (!text.trim()) return json({ error: "다듬을 본문이 없습니다." }, 400);
  if (text.length > MAX_INPUT) return json({ error: `본문이 너무 깁니다(최대 ${MAX_INPUT}자).` }, 400);
  if (mode !== "spelling" && mode !== "natural") return json({ error: "mode는 spelling 또는 natural 이어야 합니다." }, 400);

  const systemPrompt = mode === "natural" ? PROMPT_NATURAL : PROMPT_SPELLING;
  const temperature = mode === "natural" ? 0.3 : 0;

  try {
    const model = await pickModel(apiKey);
    const gemRes = await fetch(`${API_BASE}/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text }] }],
        generationConfig: { temperature, responseMimeType: "text/plain", maxOutputTokens: 4096, thinkingConfig: { thinkingBudget: 0 } },
      }),
    });
    if (!gemRes.ok) {
      const errText = await gemRes.text().catch(() => "");
      console.error("[ai-polish] Gemini HTTP", gemRes.status, "model=", model, errText.slice(0, 300));
      if (gemRes.status === 404) CACHED_MODEL = "";
      return json({ error: "AI 다듬기에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 502);
    }
    const data = await gemRes.json();
    const cand = data?.candidates?.[0];
    const out = (cand?.content?.parts || []).map((p: { text?: string }) => p.text || "").join("").trim();
    if (!out) {
      console.error("[ai-polish] 빈 응답", cand?.finishReason, JSON.stringify(data).slice(0, 250));
      return json({ error: "AI 응답이 비었습니다. 잠시 후 다시 시도해 주세요." }, 502);
    }
    return json({ polished: out, mode, model });
  } catch (e) {
    console.error("[ai-polish] 호출 오류", e);
    return json({ error: "AI 다듬기 중 오류가 발생했습니다." }, 500);
  }
});
