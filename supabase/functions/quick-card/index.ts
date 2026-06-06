// supabase/functions/quick-card/index.ts
//
// Quick 카드 v2 추출 — 입력(텍스트/이미지) → Gemini → 카드 데이터 JSON.
// C1(satori-render) 입력과 정합: { title, brand, rows[{k,v,big}], notice }.
//
// 원칙: 숫자·금액·기간·비율은 입력 원문 그대로(환각 금지) / 고객 식별정보 카드 금지.
// 키(GEMINI_API_KEY)는 Supabase secret 에서만. 앱 코드/레포 평문 0.
//
// 입력 (POST JSON): { text?: string, imageUrl?: string }  (둘 중 하나 이상)
// 출력 (200 JSON): { title, brand, rows: {k,v,big}[], notice }
// 실패 (4xx/5xx JSON): { error: string }

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MAX_IMAGE_BYTES = 7 * 1024 * 1024;
let CACHED_MODEL = "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// 키가 generateContent 로 쓸 수 있는 모델 (flash 우선, 404 회피). gemini-card 동일 패턴.
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
  } catch (e) { console.error("[quick-card] ListModels 오류", e); }
  return "gemini-1.5-flash";
}

const QC_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING", description: "카드 제목 = 주제 한 줄(12자 내외)" },
    brand: { type: "STRING", description: "보험사명 또는 분류 부제 한 줄(예: 삼성생명 / 건강보험 · 암 보장). 없으면 빈 문자열" },
    rows: {
      type: "ARRAY",
      description: "핵심을 '항목:값' 표로 3~5행. k=항목명(8자 내외), v=값(숫자·금액·기간 등 원문 그대로), big=가장 중요한 1~2개 행만 true",
      items: {
        type: "OBJECT",
        properties: {
          k: { type: "STRING", description: "항목명 (예: 암 진단비)" },
          v: { type: "STRING", description: "값 (예: 5,000만원)" },
          big: { type: "BOOLEAN", description: "강조 행이면 true (1~2개만)" },
        },
        required: ["k", "v"],
      },
    },
    notice: { type: "STRING", description: "주의·안내 1줄. 없으면 빈 문자열" },
  },
  required: ["title", "rows"],
};

const SYSTEM_PROMPT = [
  "너는 보험 상담사가 고객에게 보낼 '핵심 요약 카드'를 만든다.",
  "이미지가 첨부되면 이미지 내용을 먼저 읽고 우선 분석한다(텍스트 메모는 보조 설명일 뿐이다).",
  "입력에서 핵심만 뽑아 title(주제 한 줄), brand(보험사명 또는 분류 부제, 없으면 빈 문자열), rows(항목:값 표 3~5행), notice(주의 1줄, 없으면 빈 문자열)로 정리한다.",
  "rows 의 각 행은 k(항목명, 8자 내외)와 v(값)로 구성한다. 가장 중요한 1~2개 행만 big=true 로 표시한다.",
  "입력에서 보험 관련 핵심을 찾지 못하면 rows 를 빈 배열([])로 둔다. '정보 없음'·'요약 없음' 같은 행을 지어내 rows 에 넣지 않는다.",
  "숫자·금액·기간·비율은 입력 원문 그대로 쓴다. 절대 지어내지 않는다(환각 금지).",
  "입력에 없는 보장·수치를 추가하지 않는다.",
  "고객 실명·주민번호 등 개인 식별정보는 카드에 넣지 않는다.",
  "모든 텍스트는 한국어, 짧고 명료하게.",
].join(" ");

async function imageToInline(imageUrl: string) {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error("이미지를 불러오지 못했습니다.");
  const mimeType = imgRes.headers.get("content-type") || "image/png";
  if (!/^image\//.test(mimeType)) throw new Error("이미지 파일만 처리할 수 있습니다.");
  const buf = new Uint8Array(await imgRes.arrayBuffer());
  if (buf.byteLength > MAX_IMAGE_BYTES) throw new Error("이미지가 너무 큽니다.");
  let binary = ""; const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) binary += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + CHUNK)));
  return { mimeType, data: btoa(binary) };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST 요청만 허용됩니다." }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) { console.error("[quick-card] GEMINI_API_KEY 미설정"); return json({ error: "카드 생성 설정이 아직 준비되지 않았습니다." }, 500); }

  let text = "", imageUrl = "", imageBase64 = "", imageMime = "image/png";
  try {
    const b = await req.json();
    text = String(b?.text || "").trim();
    imageUrl = String(b?.imageUrl || "").trim();
    imageBase64 = String(b?.imageBase64 || "").trim();   // 로컬 업로드 이미지(무저장 — 공개 URL 없이 base64 직접)
    imageMime = String(b?.imageMime || "image/png").trim();
  } catch { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  if (!text && !imageUrl && !imageBase64) return json({ error: "텍스트 또는 이미지를 입력해 주세요." }, 400);
  if (imageUrl && !/^https?:\/\//.test(imageUrl)) return json({ error: "이미지 주소를 확인할 수 없습니다." }, 400);
  if (imageBase64 && !/^image\//.test(imageMime)) return json({ error: "이미지 형식을 확인할 수 없습니다." }, 400);
  if (imageBase64 && imageBase64.length > MAX_IMAGE_BYTES * 1.4) return json({ error: "이미지가 너무 큽니다." }, 413); // base64 ~= 4/3

  const parts: unknown[] = [{ text: "다음 내용에서 카드용 핵심을 JSON으로 뽑아줘." }];
  if (text) parts.push({ text });
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: imageMime, data: imageBase64 } });
  } else if (imageUrl) {
    try { parts.push({ inlineData: await imageToInline(imageUrl) }); }
    catch (e) { return json({ error: (e as Error)?.message || "이미지 처리 실패" }, 502); }
  }

  try {
    const model = await pickModel(apiKey);
    const gemRes = await fetch(`${API_BASE}/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json", responseSchema: QC_SCHEMA },
      }),
    });
    if (!gemRes.ok) { console.error("[quick-card] Gemini 실패", gemRes.status, await gemRes.text().catch(() => "")); return json({ error: "핵심 추출에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 502); }
    const gj = await gemRes.json();
    const raw = gj?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    let data: any;
    try { data = JSON.parse(raw); } catch { return json({ error: "추출 결과를 해석하지 못했습니다." }, 502); }

    const rows = Array.isArray(data.rows)
      ? data.rows
          .map((r: any) => ({ k: String(r?.k || "").trim(), v: String(r?.v || "").trim(), big: !!r?.big }))
          .filter((r: { k: string; v: string }) => r.k || r.v)
          .slice(0, 6)
      : [];
    const out = {
      title: String(data.title || "").trim(),
      brand: String(data.brand || "").trim(),
      rows,
      notice: String(data.notice || "").trim(),
    };
    if (!out.title || !out.rows.length) return json({ error: "카드로 만들 핵심을 찾지 못했습니다. 내용을 더 자세히 입력해 주세요." }, 422);
    return json(out);
  } catch (e) {
    console.error("[quick-card] 처리 오류", e);
    return json({ error: "카드 추출 중 오류가 발생했습니다." }, 500);
  }
});
