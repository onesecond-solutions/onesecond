// supabase/functions/gemini-card/index.ts
//
// 보험사 자료실 첨부 이미지 → Gemini(멀티모달) → 핵심 내용만 추출한 "표 카드" JSON.
// 자료실 라이트박스 딸깍 → "카드 만들기"가 이 함수를 호출한다.
//
// 키(GEMINI_API_KEY)는 Supabase secret 에서만 읽는다. 앱 코드/레포에 평문 0 (2026-05-22 노출 사고 재발 방지).
//
// 입력 (POST JSON): { "imageUrl": "https://.../onesecond_banner/vault/....png" }
// 출력 (200 JSON): { "brand": string, "name": string, "rows": [{ "k", "v", "big" }] }
// 실패 (4xx/5xx JSON): { "error": "사람이 읽는 안내 문구" }
//
// 모델명은 고정하지 않고, 키가 실제 쓸 수 있는 모델을 ListModels로 골라 쓴다(404 회피).

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MAX_IMAGE_BYTES = 7 * 1024 * 1024; // 7MB (5MB 정책 + 여유)
let CACHED_MODEL = ""; // warm 인스턴스에서 재사용

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// 키가 generateContent 로 쓸 수 있는 모델을 골라온다. flash 계열 우선(빠름·저렴).
async function pickModel(apiKey: string): Promise<string> {
  if (CACHED_MODEL) return CACHED_MODEL;
  try {
    const r = await fetch(`${API_BASE}/models?key=${apiKey}`);
    if (r.ok) {
      const j = await r.json();
      const usable = (j.models || []).filter((m: { supportedGenerationMethods?: string[] }) =>
        (m.supportedGenerationMethods || []).includes("generateContent")
      );
      const bad = /(vision|embedding|aqa|image|tts|audio|thinking|learnlm)/i;
      const chosen =
        usable.find((m: { name: string }) => /flash/i.test(m.name) && !bad.test(m.name)) ||
        usable.find((m: { name: string }) => /flash/i.test(m.name)) ||
        usable.find((m: { name: string }) => /gemini/i.test(m.name) && !bad.test(m.name)) ||
        usable[0];
      if (chosen) {
        CACHED_MODEL = String(chosen.name).replace(/^models\//, "");
        return CACHED_MODEL;
      }
    } else {
      console.error("[gemini-card] ListModels 실패", r.status, await r.text().catch(() => ""));
    }
  } catch (e) {
    console.error("[gemini-card] ListModels 오류", e);
  }
  return "gemini-1.5-flash"; // 최후 fallback
}

const CARD_SCHEMA = {
  type: "OBJECT",
  properties: {
    brand: { type: "STRING", description: "출처/보험사·상품명 등 카드 상단 한 줄" },
    name: { type: "STRING", description: "카드 제목 = 자료의 핵심을 한 줄로" },
    rows: {
      type: "ARRAY",
      description: "핵심 항목 3~5개. 표의 한 행씩.",
      items: {
        type: "OBJECT",
        properties: {
          k: { type: "STRING", description: "항목명" },
          v: { type: "STRING", description: "값" },
          big: { type: "BOOLEAN", description: "가장 중요한 핵심 수치 한 줄만 true" },
        },
        required: ["k", "v"],
      },
    },
  },
  required: ["brand", "name", "rows"],
};

const SYSTEM_PROMPT = [
  "너는 보험 자료 이미지를 보고 상담사가 한눈에 보는 '핵심 요약 카드'를 만든다.",
  "이미지(요율표·보장표·소식지·안내문 등)에서 가장 중요한 핵심 항목만 3~5개 골라낸다.",
  "장식·머리말·약관 고지문구·연락처 같은 부수 정보는 버린다.",
  "표가 있으면 표의 핵심 행을 그대로 살리고, 글 위주면 핵심 수치/조건을 항목으로 정리한다.",
  "rows 중 가장 핵심이 되는 수치 한 줄만 big=true.",
  "모든 텍스트는 한국어, 짧고 명료하게. 이미지에 없는 내용은 만들지 않는다.",
  "이미지가 보험 자료가 아니거나 글자를 읽을 수 없으면 rows를 빈 배열로 둔다.",
].join(" ");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST만 허용됩니다." }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.error("[gemini-card] GEMINI_API_KEY 미설정");
    return json({ error: "카드 생성 설정이 아직 준비되지 않았습니다." }, 500);
  }

  let imageUrl = "";
  try {
    const body = await req.json();
    imageUrl = (body && body.imageUrl) || "";
  } catch (_e) {
    return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  }
  if (!imageUrl || !/^https?:\/\//.test(imageUrl)) {
    return json({ error: "이미지 주소를 확인할 수 없습니다." }, 400);
  }

  let base64 = "";
  let mimeType = "image/png";
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      console.error("[gemini-card] 이미지 다운로드 실패", imgRes.status, imageUrl);
      return json({ error: "이미지를 불러오지 못했습니다." }, 502);
    }
    mimeType = imgRes.headers.get("content-type") || "image/png";
    if (!/^image\//.test(mimeType)) {
      return json({ error: "이미지 파일만 카드로 만들 수 있습니다." }, 415);
    }
    const buf = new Uint8Array(await imgRes.arrayBuffer());
    if (buf.byteLength > MAX_IMAGE_BYTES) {
      return json({ error: "이미지가 너무 큽니다. (다이어트 후 다시 시도해 주세요)" }, 413);
    }
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < buf.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + CHUNK)));
    }
    base64 = btoa(binary);
  } catch (e) {
    console.error("[gemini-card] 이미지 처리 오류", e);
    return json({ error: "이미지를 처리하지 못했습니다." }, 502);
  }

  try {
    const model = await pickModel(apiKey);
    const gemRes = await fetch(`${API_BASE}/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{
          role: "user",
          parts: [
            { text: "이 이미지에서 핵심 내용만 카드용 JSON으로 뽑아줘." },
            { inlineData: { mimeType, data: base64 } },
          ],
        }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: CARD_SCHEMA,
        },
      }),
    });

    if (!gemRes.ok) {
      const errText = await gemRes.text().catch(() => "");
      console.error("[gemini-card] Gemini HTTP", gemRes.status, "model=", model, errText);
      if (gemRes.status === 404) CACHED_MODEL = ""; // 다음 호출에 모델 재선택
      return json({ error: "카드 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 502);
    }

    const data = await gemRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) {
      console.error("[gemini-card] 빈 응답", JSON.stringify(data).slice(0, 500));
      return json({ error: "이미지에서 카드를 만들 내용을 찾지 못했습니다." }, 422);
    }

    let card;
    try {
      card = JSON.parse(text);
    } catch (_e) {
      console.error("[gemini-card] JSON 파싱 실패", text.slice(0, 500));
      return json({ error: "카드 생성 결과를 해석하지 못했습니다." }, 502);
    }

    if (!card || !Array.isArray(card.rows) || card.rows.length === 0) {
      return json({ error: "이미지에서 핵심 내용을 찾지 못했습니다. (보험 자료 이미지가 맞는지 확인해 주세요)" }, 422);
    }

    return json({
      brand: String(card.brand || ""),
      name: String(card.name || "핵심 요약"),
      rows: card.rows.slice(0, 6).map((r: { k?: unknown; v?: unknown; big?: unknown }) => ({
        k: String(r.k ?? ""),
        v: String(r.v ?? ""),
        big: !!r.big,
      })),
    });
  } catch (e) {
    console.error("[gemini-card] 호출 오류", e);
    return json({ error: "카드 생성 중 오류가 발생했습니다." }, 500);
  }
});
