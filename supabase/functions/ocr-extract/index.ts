// supabase/functions/ocr-extract/index.ts
//
// 자료 첨부(PDF·이미지) → Gemini(멀티모달) → 전체 텍스트를 원문 그대로 추출 = 검색용 OCR 엔진.
// 두 진입점이 같은 함수를 공유한다:
//   ① 소식지 461건 배치 (로컬 스크립트가 호출 → newsletters 적재)
//   ② (Phase 2) Supabase Database Webhook — 자료/문서가 올라오면 즉시 자동 발동
//
// 키(GEMINI_API_KEY)는 Supabase secret 에서만 읽는다. 레포/앱에 평문 0 (2026-05-22 노출 사고 재발 방지).
// gemini-card 와 동일 인프라(같은 키·같은 API)지만, 출력이 "핵심 카드 요약"이 아니라 "전체 텍스트 그대로".
//
// 입력 (POST JSON): { "fileUrl": "https://.../xxx.pdf" }   (PDF 또는 image/*)
// 출력 (200 JSON): { "text": string, "chars": number, "model": string, "quality": "텍스트"|"비었음" }
// 실패 (4xx/5xx JSON): { "error": "사람이 읽는 안내 문구" }

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MAX_FILE_BYTES = 18 * 1024 * 1024; // ~18MB (inlineData 한계 여유)
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

// 키가 generateContent 로 쓸 수 있는 모델을 골라온다. flash 계열 우선(빠름·저렴·PDF 지원).
async function pickModel(apiKey: string): Promise<string> {
  if (CACHED_MODEL) return CACHED_MODEL;
  try {
    const r = await fetch(`${API_BASE}/models?key=${apiKey}`);
    if (r.ok) {
      const j = await r.json();
      const usable = (j.models || []).filter((m: { supportedGenerationMethods?: string[] }) =>
        (m.supportedGenerationMethods || []).includes("generateContent")
      );
      const bad = /(embedding|aqa|tts|audio|imagen|image-generation|learnlm)/i;
      const chosen =
        usable.find((m: { name: string }) => /flash/i.test(m.name) && !bad.test(m.name)) ||
        usable.find((m: { name: string }) => /gemini/i.test(m.name) && !bad.test(m.name)) ||
        usable[0];
      if (chosen) {
        CACHED_MODEL = String(chosen.name).replace(/^models\//, "");
        return CACHED_MODEL;
      }
    } else {
      console.error("[ocr-extract] ListModels 실패", r.status, await r.text().catch(() => ""));
    }
  } catch (e) {
    console.error("[ocr-extract] ListModels 오류", e);
  }
  return "gemini-1.5-flash"; // 최후 fallback
}

const SYSTEM_PROMPT = [
  "너는 문서(PDF·이미지)에서 사람이 읽을 수 있는 모든 텍스트를 빠짐없이 그대로 추출하는 OCR 엔진이다.",
  "요약·해석·생략을 절대 하지 않는다. 본문 텍스트를 원문 그대로 옮긴다.",
  "표가 있으면 행 단위로 읽되 칸은 공백으로 구분한다.",
  "페이지 순서대로 이어서 출력한다. 페이지 번호와 반복되는 머리말/꼬리말 장식은 생략해도 된다.",
  "읽을 수 있는 글자가 전혀 없으면 빈 문자열만 출력한다.",
  "출력은 추출한 텍스트 그 자체만. 설명·머리말을 붙이지 않는다.",
].join(" ");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST만 허용됩니다." }, 405);

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.error("[ocr-extract] GEMINI_API_KEY 미설정");
    return json({ error: "OCR 설정이 아직 준비되지 않았습니다." }, 500);
  }

  let fileUrl = "";
  try {
    const body = await req.json();
    fileUrl = (body && body.fileUrl) || "";
  } catch (_e) {
    return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  }
  if (!fileUrl || !/^https?:\/\//.test(fileUrl)) {
    return json({ error: "파일 주소를 확인할 수 없습니다." }, 400);
  }

  let base64 = "";
  let mimeType = "application/pdf";
  try {
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      console.error("[ocr-extract] 다운로드 실패", fileRes.status, fileUrl);
      return json({ error: "파일을 불러오지 못했습니다." }, 502);
    }
    mimeType = fileRes.headers.get("content-type") || "application/pdf";
    // Storage가 octet-stream 으로 줄 때 = URL 확장자로 보정
    if (!/^(application\/pdf|image\/)/.test(mimeType)) {
      if (/\.pdf($|\?)/i.test(fileUrl)) {
        mimeType = "application/pdf";
      } else {
        const ext = (fileUrl.match(/\.(png|jpe?g|webp|gif)($|\?)/i) || [])[1];
        if (ext) mimeType = "image/" + ext.toLowerCase().replace("jpg", "jpeg");
        else return json({ error: "PDF 또는 이미지 파일만 OCR할 수 있습니다." }, 415);
      }
    }
    const buf = new Uint8Array(await fileRes.arrayBuffer());
    if (buf.byteLength > MAX_FILE_BYTES) {
      return json({ error: "파일이 너무 큽니다. (18MB 초과)" }, 413);
    }
    let binary = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < buf.length; i += CHUNK) {
      binary += String.fromCharCode.apply(null, Array.from(buf.subarray(i, i + CHUNK)));
    }
    base64 = btoa(binary);
  } catch (e) {
    console.error("[ocr-extract] 파일 처리 오류", e);
    return json({ error: "파일을 처리하지 못했습니다." }, 502);
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
            { text: "이 문서의 모든 텍스트를 원문 그대로 추출해줘." },
            { inlineData: { mimeType, data: base64 } },
          ],
        }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "text/plain",
          maxOutputTokens: 8192, // 한 번에 추출 상한 (긴 문서는 배치 측에서 재요청/분할)
        },
      }),
    });

    if (!gemRes.ok) {
      const errText = await gemRes.text().catch(() => "");
      console.error("[ocr-extract] Gemini HTTP", gemRes.status, "model=", model, errText.slice(0, 300));
      if (gemRes.status === 404) CACHED_MODEL = ""; // 다음 호출에 모델 재선택
      return json({ error: "OCR에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 502);
    }

    const data = await gemRes.json();
    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map((p: { text?: string }) => p.text || "")
      .join("")
      .trim();

    return json({
      text,
      chars: text.length,
      model,
      quality: text.length > 20 ? "텍스트" : "비었음",
    });
  } catch (e) {
    console.error("[ocr-extract] 호출 오류", e);
    return json({ error: "OCR 중 오류가 발생했습니다." }, 500);
  }
});
