// supabase/functions/worknote-publish/index.ts
//
// 임태성 실장 업무노트(scripts) → 원세컨드 제공 검색자료(knowledge_entries) 발행·동기화.
//
// ★범위·원칙 (2026-06-30 대표 확정):
//  - 호출 가능 계정 = 임태성 실작업 계정(98c5f4f9)만. JWT로 검증, 그 외 403.
//  - service_role은 이 함수(서버) 안에서만 사용. 브라우저 미노출.
//  - scripts.scope 는 건드리지 않음(계속 personal). 제공 스크립트 라이브러리·단계·채팅에 미노출.
//  - 제공 지정한 글만 knowledge_entries 1행으로 upsert (source_type='work_note', source_id=scripts.id::text).
//    → 일반 사용자에겐 기존 'approved' 검색자료로만 노출. 중복 생성 0(원본 id 기준 upsert).
//  - 새 DDL·새 컬럼 없음. ke 기존 컬럼만 사용(title/body/category/tags/source_company/source_date/source_type/source_id/status).
//  - 개인정보(주민번호·휴대폰) 탐지 시 발행하지 않고 경고 반환(§13).
//
// 입력 (POST JSON):
//   { "scriptId": <number|string>, "action": "publish"|"unpublish"|"delete",
//     "meta": { "documentType": "...", "company": "...", "referenceMonth": "2026-06", "sourceUrl": "...", "ocrText": "..." } }
// 출력 (200): { ok:true, action, entryId } / 차단(409): { ok:false, error, piiDetected:true } / 실패(4xx/5xx): { error }

import { createClient } from "npm:@supabase/supabase-js@2";

const IMTAESUNG_ID = "98c5f4f9-10c1-4ee1-a656-5c2ca63239fd"; // 임태성 실작업 계정(ga_manager)
const WN_SOURCE_TYPE = "work_note";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// HTML → 평문 (검색문에 태그 미포함)
function toPlain(html: string): string {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

// 개인정보 탐지(주민번호·휴대폰). 탐지 시 발행 차단.
function detectPII(text: string): string | null {
  const t = String(text || "");
  if (/\b\d{6}\s*-\s*[1-4]\d{6}\b/.test(t)) return "주민등록번호로 보이는 값";
  if (/01[016789][\s-]?\d{3,4}[\s-]?\d{4}/.test(t)) return "휴대폰 번호로 보이는 값";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST만 허용됩니다." }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: "서버 설정이 준비되지 않았습니다." }, 500);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 1) 호출자 검증 — 임태성 실작업 계정만
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return json({ error: "로그인이 필요합니다." }, 401);
  const { data: au, error: auErr } = await admin.auth.getUser(jwt);
  if (auErr || !au || !au.user) return json({ error: "인증에 실패했습니다." }, 401);
  if (au.user.id !== IMTAESUNG_ID) return json({ error: "이 기능은 임태성 실장 계정만 사용할 수 있습니다." }, 403);

  // 2) 입력
  let scriptId = "", action = "publish", meta: Record<string, string> = {};
  try {
    const b = await req.json();
    scriptId = String((b && b.scriptId) ?? "").trim();
    action = String((b && b.action) || "publish");
    meta = (b && b.meta) || {};
  } catch (_e) { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  if (!scriptId) return json({ error: "scriptId가 없습니다." }, 400);

  const sid = scriptId; // source_id = scripts.id::text

  try {
    // 3) 삭제 — 연결 ke 제거(고아 0)
    if (action === "delete") {
      const { error } = await admin.from("knowledge_entries").delete().eq("source_type", WN_SOURCE_TYPE).eq("source_id", sid);
      if (error) return json({ error: "검색자료 삭제 실패: " + error.message }, 500);
      return json({ ok: true, action });
    }

    // 4) 공개 해제 — discarded (원본 scripts는 보존)
    if (action === "unpublish") {
      const { error } = await admin.from("knowledge_entries").update({ status: "discarded", updated_at: new Date().toISOString() }).eq("source_type", WN_SOURCE_TYPE).eq("source_id", sid);
      if (error) return json({ error: "공개 해제 실패: " + error.message }, 500);
      return json({ ok: true, action });
    }

    // 5) 발행/동기화 (publish) — scripts 원본 읽어 평문화 후 upsert
    const { data: rows, error: selErr } = await admin
      .from("scripts")
      .select("id,title,script_text,search_text,highlight_text,keywords,owner_id,scope")
      .eq("id", sid).limit(1);
    if (selErr) return json({ error: "원본 조회 실패: " + selErr.message }, 500);
    const s = rows && rows[0];
    if (!s) return json({ error: "원본 업무노트를 찾을 수 없습니다." }, 404);
    if (String(s.owner_id) !== IMTAESUNG_ID) return json({ error: "본인 업무노트만 발행할 수 있습니다." }, 403);

    const title = String(s.title || "").trim() || "(제목 없음)";
    // 본문 평문: search_text(이미 평문) 우선, 없으면 script_text 평문화
    let bodyPlain = String(s.search_text || "").trim();
    if (!bodyPlain) bodyPlain = toPlain(s.highlight_text ? (s.highlight_text + "\n\n" + (s.script_text || "")) : (s.script_text || ""));
    const ocrText = String(meta.ocrText || "").trim(); // §14 첨부 OCR 재동기화분
    const sourceUrl = String(meta.sourceUrl || "").trim();
    const bodyFull = [bodyPlain, ocrText, sourceUrl ? ("출처: " + sourceUrl) : ""].filter(Boolean).join("\n\n");

    // 6) 개인정보 탐지 → 발행 차단(§13)
    const pii = detectPII(title + "\n" + bodyFull);
    if (pii) return json({ ok: false, piiDetected: true, error: pii + "가 포함되어 있어 공개 발행을 중단했습니다. 개인정보를 제거한 뒤 다시 시도해 주세요." }, 409);

    // tags = 사용자 키워드(유형:* 분류태그 제외)
    const kwArr: string[] = Array.isArray(s.keywords) ? s.keywords : [];
    const tags = kwArr.filter((k: string) => k && String(k).indexOf("유형:") !== 0);

    const category = String(meta.documentType || "").trim() || "업무노트";
    const company = String(meta.company || "").trim();
    const refMonth = String(meta.referenceMonth || "").trim(); // 예: "2026-06"

    const payload: Record<string, unknown> = {
      type: WN_SOURCE_TYPE,
      title,
      body: bodyFull,
      category,
      tags,
      source_type: WN_SOURCE_TYPE,
      source_id: sid,
      source_title: sourceUrl || null,
      source_company: company || null,
      canonical_company_name: company || null,
      source_date: refMonth || null,
      status: "approved",
      created_by: IMTAESUNG_ID,
      updated_at: new Date().toISOString(),
    };

    // upsert (원본 id 기준 1건) — 기존 행 있으면 update, 없으면 insert. 중복 생성 0.
    const { data: ex } = await admin.from("knowledge_entries").select("entry_id").eq("source_type", WN_SOURCE_TYPE).eq("source_id", sid).limit(1);
    if (ex && ex[0]) {
      const { error: upErr } = await admin.from("knowledge_entries").update(payload).eq("entry_id", ex[0].entry_id);
      if (upErr) return json({ error: "검색자료 갱신 실패: " + upErr.message }, 500);
      return json({ ok: true, action: "update", entryId: ex[0].entry_id });
    } else {
      const { data: ins, error: insErr } = await admin.from("knowledge_entries").insert(payload).select("entry_id").limit(1);
      if (insErr) return json({ error: "검색자료 등록 실패: " + insErr.message }, 500);
      return json({ ok: true, action: "insert", entryId: ins && ins[0] && ins[0].entry_id });
    }
  } catch (e) {
    console.error("[worknote-publish] 오류", e);
    return json({ error: "처리 중 오류가 발생했습니다." }, 500);
  }
});
