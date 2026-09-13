const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const ALLOWED_USER_ID = "98c5f4f9-10c1-4ee1-a656-5c2ca63239fd";
const MAX_BYTES = 15 * 1024 * 1024;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

function jwtSubject(req: Request) {
  try {
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).sub || "";
  } catch (_) { return ""; }
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    customerInfo: { type: "OBJECT", properties: { name: { type: "STRING" }, birthDate: { type: "STRING" } }, required: ["name", "birthDate"] },
    products: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          company: { type: "STRING" }, product: { type: "STRING" }, premium: { type: "STRING" }, renewal: { type: "STRING" },
        },
        required: ["company", "product", "premium", "renewal"],
      },
    },
    rows: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          section: { type: "STRING" }, group: { type: "STRING" }, name: { type: "STRING" }, recommended: { type: "STRING" }, status: { type: "STRING" }, total: { type: "STRING" }, values: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["section", "group", "name", "recommended", "status", "total", "values"],
      },
    },
  },
  required: ["customerInfo", "products", "rows"],
};

const PROMPT = [
  "보험 보장분석 PDF 또는 이미지에서 화면에 실제로 보이는 표만 구조화한다.",
  "customerInfo는 보장분석 대상 고객의 이름(name)과 생년월일(birthDate, YYYY-MM-DD)이다. 문서에 명시된 값만 읽고 가려진 이름은 원문대로 유지한다. 설계사나 다른 계약자 이름, 계약일/보험기간/출력일은 고객 정보로 쓰지 않는다. 생년월일이 없거나 일부가 가려졌으면 빈 문자열로 둔다. 나이·파일 암호·상품코드로 생년월일을 추정하지 않는다.",
  "요약하거나 보장명을 새로 만들지 말고 회사명, 상품명, 담보명, 가입금액을 원문 표기 그대로 옮긴다.",
  "products는 문서에 보이는 회사·상품 열 또는 회사/상품별 특약 묶음 순서다. 보험료와 갱신 정보는 보이는 경우에만 넣는다.",
  "rows의 values 배열은 products 순서와 길이를 정확히 맞추고, 해당 상품에 값이 없으면 빈 문자열로 둔다.",
  "비교표에 합계금액이 있으면 total에 넣는다. 추천금액과 충분·부족·없음 상태는 각각 recommended와 status에 넣되 보이지 않으면 빈 문자열이다.",
  "대분류는 원문 구분을 유지한다. 중분류는 원문에 있을 때만 group에 넣는다. 읽히지 않는 값은 추측하지 말고 빈 문자열로 둔다.",
  "같은 담보 행을 임의로 합치거나 삭제하지 않는다.",
].join(" ");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST만 허용됩니다." }, 405);
  if (jwtSubject(req) !== ALLOWED_USER_ID) return json({ error: "보장분석 파일 인식 권한이 없습니다." }, 403);
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "파일 인식 설정이 준비되지 않았습니다." }, 500);

  let data = "", mimeType = "";
  try {
    const body = await req.json(); data = String(body?.data || ""); mimeType = String(body?.mimeType || "");
  } catch (_) { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  if (!/^(application\/pdf|image\/(png|jpeg|webp))$/.test(mimeType)) return json({ error: "PDF 또는 PNG/JPG/WEBP 파일만 인식할 수 있습니다." }, 415);
  if (!data || Math.ceil(data.length * 3 / 4) > MAX_BYTES) return json({ error: "파일이 비었거나 15MB를 초과합니다." }, 413);

  try {
    const response = await fetch(`${API_BASE}/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: PROMPT }] },
        contents: [{ role: "user", parts: [{ text: "이 보장분석 자료를 표 구조로 추출해줘." }, { inlineData: { mimeType, data } }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA, maxOutputTokens: 32768, thinkingConfig: { thinkingBudget: 0 } },
      }),
    });
    if (!response.ok) { console.error("[gemini-coverage-import]", response.status, (await response.text()).slice(0, 400)); return json({ error: "파일 표 인식에 실패했습니다." }, 502); }
    const result = await response.json();
    const text = (result?.candidates?.[0]?.content?.parts || []).map((part: { text?: string }) => part.text || "").join("");
    const parsed = JSON.parse(text || "{}");
    return json({ customerInfo: { name: typeof parsed.customerInfo?.name === "string" ? parsed.customerInfo.name : "", birthDate: typeof parsed.customerInfo?.birthDate === "string" ? parsed.customerInfo.birthDate : "" }, products: Array.isArray(parsed.products) ? parsed.products : [], rows: Array.isArray(parsed.rows) ? parsed.rows : [] });
  } catch (error) {
    console.error("[gemini-coverage-import]", error);
    return json({ error: "파일 표 인식 중 오류가 발생했습니다." }, 500);
  }
});
