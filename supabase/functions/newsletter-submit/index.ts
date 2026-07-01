// supabase/functions/newsletter-submit/index.ts
//
// 김실장(GPT)·기획팀장(Web)이 보험사 소식지를 읽고 구조 분석한 결과(JSON)를
// newsletters 테이블에 reviewing 초안으로 등록하는 "좁은 통로" API.
//
// ★전략 배경 (2026-07-01 대표 확정):
//  - Code(총괄팀장)의 PDF 데이터베이스화(추출)는 실패 → PDF 읽기·구조 분석은 김실장·기획팀장이 담당.
//  - Code = 이 등록 통로(API) 구현 + 시스템 검수(중복·검색작동·미리보기·권한) → published 승격.
//  - PDF 원본은 Storage(newsletters 버킷)에 Code가 업로드(별도), 본 API는 텍스트·메타만 적재.
//
// ★보안 (메모리 project_official_material_submission_pipeline 정합):
//  - service_role은 이 함수(서버) 안에서만. 외부 AI엔 전용 등록키(NEWSLETTER_SUBMIT_KEY)만 공유(키·MCP 노출 0).
//  - 서버 강제: status='reviewing', submitted_by, extracted_at, ocr_status='done'. 외부가 approved/published 못 만듦(검수 게이트).
//  - 격리: newsletters 외 테이블 접근 0. 삭제·승인·발행 권한 0.
//
// 입력 (POST JSON): { "action": "check_duplicate"|"create_draft"|"get_status", "submitter": "gpt"|"web", ...payload }
//   create_draft payload: { company, insurance_type("생명"|"손해"), publish_year, publish_month,
//                           category, title, full_text, keywords?[], source_filename, page_count? }
// 인증: 헤더 x-submit-key: <NEWSLETTER_SUBMIT_KEY>
// 출력: 200 { ok:true, ... } / 4xx { error }

import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-submit-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

const ALLOWED_SUBMITTERS = ["gpt", "web"];               // 김실장(gpt) · 기획팀장(web)
const ALLOWED_TYPES = ["생명", "손해"];
// 카테고리 화이트리스트(기존 4월호 사용값 정합) — 그 외는 '소식지'로 정규화
const ALLOWED_CATEGORY = ["소식지", "영업방향", "세일즈가이드", "매거진", "요약", "리플렛", "강의안"];

// 개인정보 탐지(주민번호·휴대폰). 공식 소식지엔 없어야 정상 — 방어적 차단.
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
  const SUBMIT_KEY = Deno.env.get("NEWSLETTER_SUBMIT_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE || !SUBMIT_KEY) return json({ error: "서버 설정이 준비되지 않았습니다." }, 500);

  // 1) 인증 — 전용 등록키(service_role 아님)
  const key = (req.headers.get("x-submit-key") || "").trim();
  if (!key || key !== SUBMIT_KEY) return json({ error: "등록 권한이 없습니다." }, 401);

  // 2) 입력
  let action = "", submitter = "", b: Record<string, unknown> = {};
  try {
    b = await req.json();
    action = String((b && b.action) || "").trim();
    submitter = String((b && b.submitter) || "").trim().toLowerCase();
  } catch (_e) { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  if (!ALLOWED_SUBMITTERS.includes(submitter)) return json({ error: "submitter는 gpt|web만 허용됩니다." }, 400);
  if (!["check_duplicate", "create_draft", "get_status"].includes(action)) {
    return json({ error: "action은 check_duplicate|create_draft|get_status만 허용됩니다." }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const submittedBy = "ai:" + submitter;

  try {
    // ── get_status: 최근 제출분 상태 ──
    if (action === "get_status") {
      const { data, error } = await admin
        .from("newsletters")
        .select("id,company,title,publish_year,publish_month,status,submitted_by,created_at")
        .eq("submitted_by", submittedBy)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return json({ error: "상태 조회 실패: " + error.message }, 500);
      return json({ ok: true, items: data || [] });
    }

    // 공통 파싱
    const company = String(b.company || "").trim();
    const py = Number(b.publish_year) || 0;
    const pm = Number(b.publish_month) || 0;
    const filename = String(b.source_filename || "").trim();

    // ── check_duplicate: 회사·발행월·자료유형·파일해시 기준 ──
    if (action === "check_duplicate") {
      const cat = String(b.category || "").trim();
      const fh = String(b.file_hash || "").trim().toLowerCase();
      if (!company || !py || !pm) return json({ error: "company, publish_year, publish_month가 필요합니다." }, 400);
      let q = admin.from("newsletters").select("id,company,category,title,source_filename,file_hash,status,submitted_by")
        .eq("company", company).eq("publish_year", py).eq("publish_month", pm);
      if (cat) q = q.eq("category", cat);
      const { data, error } = await q;
      if (error) return json({ error: "중복 조회 실패: " + error.message }, 500);
      const exact = fh ? (data || []).filter((r: Record<string, unknown>) => String(r.file_hash || "").toLowerCase() === fh) : [];
      const revision = (data || []).length > 0 && exact.length === 0;
      return json({ ok: true, exactDuplicate: exact.length > 0, revisionCandidate: revision, existing: data || [] });
    }

    // ── create_draft: 구조 JSON → newsletters INSERT (status='reviewing' 서버 강제) ──
    const insurance_type = String(b.insurance_type || "").trim();
    const category = String(b.category || "").trim();
    const title = String(b.title || "").trim();
    const full_text = String(b.full_text || "").trim();
    const page_count = Number(b.page_count) || null;
    const keywords = Array.isArray(b.keywords) ? (b.keywords as string[]).filter(Boolean).slice(0, 30) : [];
    const file_hash = String(b.file_hash || "").trim().toLowerCase();

    // 필수 검증 — insurance_type·category = 허용값 목록으로 제한(자유입력 불가, 미허용값=거부)
    const missing: string[] = [];
    if (!company) missing.push("company");
    if (!ALLOWED_TYPES.includes(insurance_type)) missing.push("insurance_type(허용값: " + ALLOWED_TYPES.join("|") + ")");
    if (!py) missing.push("publish_year");
    if (!pm || pm < 1 || pm > 12) missing.push("publish_month(1-12)");
    if (!ALLOWED_CATEGORY.includes(category)) missing.push("category(허용값: " + ALLOWED_CATEGORY.join("|") + ")");
    if (!title) missing.push("title");
    if (!full_text || full_text.length < 30) missing.push("full_text(30자 이상)");
    if (!filename) missing.push("source_filename");
    if (!/^[a-f0-9]{64}$/.test(file_hash)) missing.push("file_hash(sha256 64자리 hex)");
    if (missing.length) return json({ error: "필수 항목 누락/오류: " + missing.join(", ") }, 400);

    // 개인정보 방어
    const pii = detectPII(title + "\n" + full_text);
    if (pii) return json({ ok: false, piiDetected: true, error: pii + "가 포함되어 등록을 중단했습니다." }, 409);

    // 중복 판단 = 회사·발행월·자료유형·파일해시 (파일명 아님)
    const { data: sameGroup } = await admin.from("newsletters")
      .select("id,file_hash,status,source_filename")
      .eq("company", company).eq("publish_year", py).eq("publish_month", pm).eq("category", category);
    // 완전 일치(해시 동일) → 멱등 차단
    const exact = (sameGroup || []).find((r: Record<string, unknown>) => String(r.file_hash || "").toLowerCase() === file_hash);
    if (exact) return json({ ok: false, duplicate: true, id: (exact as Record<string, unknown>).id, status: (exact as Record<string, unknown>).status, error: "이미 등록된 동일 소식지입니다(회사·발행월·자료유형·해시 일치)." }, 409);
    // 같은 회사·발행월·자료유형의 다른 해시 → 수정본 후보(등록하되 검수 표시)
    const revisionCandidate = (sameGroup || []).length > 0;

    const cpp = page_count && page_count > 0 ? Math.round(full_text.length / page_count) : null;

    const payload: Record<string, unknown> = {
      source_filename: filename,
      company,
      insurance_type,
      publish_year: py,
      publish_month: pm,
      category,
      title,
      full_text,
      page_count,
      char_length: full_text.length,
      chars_per_page: cpp,
      text_quality: "텍스트",
      ocr_needed: false,
      ocr_status: "done",
      // 서버 강제(검수 게이트) — 외부가 못 바꿈
      status: "reviewing",
      submitted_by: submittedBy,
      extracted_at: new Date().toISOString(),
      file_hash,
      is_revision: revisionCandidate,
      // keywords는 newsletters에 컬럼 없음 → title/full_text 검색으로 흡수(별도 컬럼 도입 시 확장)
    };

    const { data: ins, error: insErr } = await admin.from("newsletters").insert(payload).select("id").limit(1);
    if (insErr) return json({ error: "등록 실패: " + insErr.message }, 500);
    return json({
      ok: true, action: "insert", id: ins && ins[0] && ins[0].id, status: "reviewing",
      revisionCandidate,
      existingSameGroup: (sameGroup || []).map((r: Record<string, unknown>) => ({ id: r.id, source_filename: r.source_filename, status: r.status })),
      note: revisionCandidate
        ? "같은 회사·발행월·자료유형의 기존 자료가 있어 '수정본 후보'로 등록됐습니다. 총괄팀장 검수 후 처리됩니다."
        : "총괄팀장 시스템검수 후 published 승격 시 검색 노출됩니다.",
    });
  } catch (e) {
    console.error("[newsletter-submit] 오류", e);
    return json({ error: "처리 중 오류가 발생했습니다." }, 500);
  }
});
