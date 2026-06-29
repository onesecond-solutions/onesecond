// supabase/functions/gemini-customer-ocr/index.ts
//
// 영업노트 전용 — 고객정보 화면 캡처(해피톡·뱅크샐러드·카카오페이·보맵·키워 등) → Gemini(멀티모달)
// → 정형 고객정보(이름·성별·생년월일·나이·연락처·고객유형)만 추출한 JSON.
//
// ★범위 제한(2026-06-29 대표 확정):
//  - 정형 고객정보 6항목만 추출. 상담내용 정리·요약 안 함.
//  - 이미지는 base64로 본문 전송받아 Gemini에만 보내고 **저장하지 않는다**(원본 미보존·버킷 미사용).
//  - 호출은 사용자가 직접 [캡처에서 정보 읽기] 실행할 때만(백그라운드 자동 분석 없음).
//
// 키(GEMINI_API_KEY)는 Supabase secret 에서만 읽는다(레포 평문 0). gemini-card와 동일 키 재사용.
//
// 입력 (POST JSON): { "imageBase64": "<base64, no prefix>", "mimeType": "image/png" }
// 출력 (200 JSON): { "name","gender","birth_date","age","phone","customer_type" } (없는 값은 "")
// 실패 (4xx/5xx JSON): { "error": "사람이 읽는 안내" }

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MAX_IMAGE_BYTES = 7 * 1024 * 1024;
let CACHED_MODEL = "";

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
      if (chosen) { CACHED_MODEL = String(chosen.name).replace(/^models\//, ""); return CACHED_MODEL; }
    } else {
      console.error("[gemini-customer-ocr] ListModels 실패", r.status, await r.text().catch(() => ""));
    }
  } catch (e) {
    console.error("[gemini-customer-ocr] ListModels 오류", e);
  }
  return "gemini-1.5-flash";
}

const CUSTOMER_SCHEMA = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING", description: "고객 이름. 없으면 빈 문자열." },
    gender: { type: "STRING", description: "'남' 또는 '여'. 알 수 없으면 빈 문자열." },
    birth_date: { type: "STRING", description: "생년월일 YYYY-MM-DD. 화면에 생년월일이 있으면 정규화. 없으면 빈 문자열." },
    age: { type: "STRING", description: "나이(숫자만, 예 '45'). 없으면 빈 문자열." },
    phone: { type: "STRING", description: "연락처(예 010-1234-5678). 없으면 빈 문자열." },
    customer_type: { type: "STRING", description: "고객유형=고객이 들어온 플랫폼. 화면에 '고객 유형: X'가 있으면 X. 없으면 화면 출처(로고·UI)로 뱅크샐러드/카카오페이/보맵/키워/해피톡 중 추정. 확신 없으면 빈 문자열." },
  },
  required: ["name", "gender", "birth_date", "age", "phone", "customer_type"],
};

const SYSTEM_PROMPT = [
  "너는 보험 상담사가 올린 '고객정보 화면 캡처'에서 정형 고객정보만 정확히 읽어내는 추출기다.",
  "추출 대상은 오직: 이름, 성별, 생년월일, 나이, 연락처, 고객유형. 그 외 내용(상담내용·메모·주소·금융정보)은 절대 추출/요약하지 않는다.",
  "화면에 명시된 값만 읽는다. 보이지 않으면 해당 항목은 빈 문자열로 둔다. 절대 지어내지 않는다.",
  "성별은 '남'/'여'로만. 생년월일은 가능하면 YYYY-MM-DD로 정규화. 연락처는 화면 표기 그대로.",
  "고객유형 = 고객이 유입된 플랫폼(뱅크샐러드·카카오페이·보맵·키워 등). 화면에 '고객 유형: X' 라벨이 있으면 그 값을 그대로. 라벨이 없으면 화면의 로고·UI·헤더로 어느 플랫폼 화면인지 추정해 넣되, 확신이 없으면 빈 문자열.",
  "고객유형은 상담채널(전화·문자·카카오톡·해피톡=상담 수단)과 다르다. 플랫폼만 고객유형에 넣는다.",
  "모든 값은 한국어/숫자. 이미지가 고객정보 화면이 아니면 모든 값을 빈 문자열로 둔다.",
].join(" ");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST만 허용됩니다." }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.error("[gemini-customer-ocr] GEMINI_API_KEY 미설정");
    return json({ error: "OCR 설정이 아직 준비되지 않았습니다." }, 500);
  }

  let base64 = "";
  let mimeType = "image/png";
  try {
    const body = await req.json();
    base64 = (body && body.imageBase64) || "";
    mimeType = (body && body.mimeType) || "image/png";
  } catch (_e) {
    return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  }
  if (!base64) return json({ error: "이미지가 없습니다. 캡처를 붙여넣어 주세요." }, 400);
  if (!/^image\//.test(mimeType)) return json({ error: "이미지만 처리할 수 있습니다." }, 415);
  // base64 길이로 대략 용량 가드 (4/3 비율)
  if (base64.length * 0.75 > MAX_IMAGE_BYTES) return json({ error: "이미지가 너무 큽니다." }, 413);

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
            { text: "이 고객정보 화면에서 이름·성별·생년월일·나이·연락처·고객유형만 JSON으로 추출해줘. 없는 값은 빈 문자열." },
            { inlineData: { mimeType, data: base64 } },
          ],
        }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: CUSTOMER_SCHEMA },
      }),
    });

    if (!gemRes.ok) {
      const errText = await gemRes.text().catch(() => "");
      console.error("[gemini-customer-ocr] Gemini HTTP", gemRes.status, "model=", model, errText);
      if (gemRes.status === 404) CACHED_MODEL = "";
      return json({ error: "정보 추출에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 502);
    }

    const data = await gemRes.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) return json({ error: "캡처에서 고객정보를 찾지 못했습니다." }, 422);

    let o;
    try { o = JSON.parse(text); } catch (_e) {
      console.error("[gemini-customer-ocr] JSON 파싱 실패", text.slice(0, 300));
      return json({ error: "추출 결과를 해석하지 못했습니다." }, 502);
    }

    return json({
      name: String(o?.name || ""),
      gender: String(o?.gender || ""),
      birth_date: String(o?.birth_date || ""),
      age: String(o?.age || ""),
      phone: String(o?.phone || ""),
      customer_type: String(o?.customer_type || ""),
    });
  } catch (e) {
    console.error("[gemini-customer-ocr] 호출 오류", e);
    return json({ error: "정보 추출 중 오류가 발생했습니다." }, 500);
  }
});
