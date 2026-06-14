// supabase/functions/ocr-batch/index.ts
//
// OCR 정규 채용 — 미처리 소식지(newsletters.full_text 비어있음)를 한 번에 N건씩 OCR 적재.
// pg_cron 이 주기적으로 호출(x-cron-secret) → 백로그 자동 소진 + 신규 업로드도 다음 틱에 자동 포함.
// 엔진은 기존 ocr-extract(Gemini 멀티모달) 재사용. 이 함수는 "오케스트레이터"만.
//
// 동작: full_text 비어있고(아직 시도 안 했거나 비어있지 않은 text_quality) source_pdf_url 있는 행 N건
//   → 각 PDF URL을 ocr-extract 에 보내 텍스트 추출 → newsletters.full_text/text_quality/char_length UPDATE.
// 멱등: 이미 적재된 행 skip. 빈 추출은 text_quality='비었음' 마킹 → 무한 재시도 방지.
// 비용 제어: BATCH 건수/틱 스로틀. 미처리 0이면 호출당 작업 0(과금 0).
//
// 보안: x-cron-secret == CRON_SECRET 일 때만(diary-push 동일 패턴). DB 쓰기는 service_role.
// 출력(200): { picked, ok, empty, failed, remaining }

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET   = Deno.env.get("CRON_SECRET") ?? "";
const BATCH = 5;            // 틱당 처리 건수(비용·시간 제어). 필요 시 cron 주기와 함께 조정.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// PostgREST 헬퍼 (service_role)
async function rest(path: string, init?: RequestInit) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST만 허용됩니다." }, 405);
  // 보안: cron 시크릿
  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: "env(SUPABASE_URL/SERVICE_ROLE) 미설정" }, 500);

  // 1) 미처리 대상 N건 — full_text 비어있고, 빈추출 마킹('비었음') 아님, (공개 PDF URL 또는 private storage 경로) 있음
  //    PostgREST: full_text.is.null, text_quality not '비었음'(또는 null), source_pdf_url 또는 source_path 있음
  //    ※ source_path = newsletters private 버킷 경로(2026-06 정리분). source_pdf_url 없으면 아래에서 서명URL 생성.
  const q = "newsletters?select=id,source_pdf_url,source_path,title&full_text=is.null"
          + "&or=(source_pdf_url.not.is.null,source_path.not.is.null)"
          + "&or=(text_quality.is.null,text_quality.neq." + encodeURIComponent("비었음") + ")"
          + "&limit=" + BATCH;
  let rows: Array<{ id: string; source_pdf_url: string | null; source_path: string | null; title: string | null }> = [];
  try {
    const r = await rest(q);
    if (!r.ok) return json({ error: "대상 조회 실패 " + r.status, detail: await r.text().catch(() => "") }, 500);
    rows = await r.json();
  } catch (e) { return json({ error: "대상 조회 오류", detail: String(e) }, 500); }

  if (!rows.length) {
    return json({ picked: 0, ok: 0, empty: 0, failed: 0, remaining: 0, note: "미처리 없음(idle)" });
  }

  let ok = 0, empty = 0, failed = 0;
  for (const nl of rows) {
    try {
      // 2a) fileUrl 결정 — 공개 source_pdf_url 우선 / 없으면 source_path로 newsletters private 버킷 서명URL(자료실과 동일 패턴)
      let fileUrl = (nl.source_pdf_url || "").trim();
      if (!fileUrl && nl.source_path) {
        const enc = nl.source_path.split("/").map(encodeURIComponent).join("/");
        const sg = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/newsletters/${enc}`, {
          method: "POST",
          headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
          body: JSON.stringify({ expiresIn: 3600 }),
        });
        const sj = await sg.json().catch(() => ({}));
        const signed = sj && typeof sj.signedURL === "string" ? sj.signedURL : "";
        if (!sg.ok || !signed) { failed++; console.error("[ocr-batch] 소식지 서명 실패", nl.id, sg.status); continue; }
        fileUrl = `${SUPABASE_URL}/storage/v1${signed}`;
      }
      if (!fileUrl) { failed++; console.error("[ocr-batch] fileUrl 없음", nl.id); continue; }

      // 2b) ocr-extract 호출 (Gemini)
      const ex = await fetch(`${SUPABASE_URL}/functions/v1/ocr-extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
        body: JSON.stringify({ fileUrl }),
      });
      const j = await ex.json().catch(() => ({}));
      if (!ex.ok) { failed++; console.error("[ocr-batch] extract 실패", nl.id, ex.status, j?.error); continue; }
      const text = (j && typeof j.text === "string") ? j.text : "";
      const chars = (j && typeof j.chars === "number") ? j.chars : text.length;

      // 3) 적재 (빈 추출이면 full_text 그대로 두고 text_quality='비었음' 마킹 → 재시도 방지)
      const patch = text.trim().length
        ? { full_text: text, text_quality: "텍스트", char_length: chars }
        : { text_quality: "비었음" };
      const up = await rest("newsletters?id=eq." + encodeURIComponent(nl.id), {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(patch),
      });
      if (!(up.ok || up.status === 204)) { failed++; console.error("[ocr-batch] UPDATE 실패", nl.id, up.status); continue; }
      if (text.trim().length) ok++; else empty++;
    } catch (e) { failed++; console.error("[ocr-batch] 처리 오류", nl.id, String(e)); }
  }

  // 남은 미처리 건수(참고)
  let remaining = -1;
  try {
    const r2 = await rest("newsletters?select=id&full_text=is.null"
      + "&or=(source_pdf_url.not.is.null,source_path.not.is.null)"
      + "&or=(text_quality.is.null,text_quality.neq." + encodeURIComponent("비었음") + ")", { headers: { Prefer: "count=exact", Range: "0-0" } });
    const cr = r2.headers.get("content-range"); if (cr) remaining = parseInt(cr.split("/")[1] || "-1", 10);
  } catch (_e) {}

  // ── 자료실 파일(myspace_files) OCR — Phase A (2026-06-14) ─────────────────
  //   ocr_status is null(미처리) + PDF/이미지 + storage_path 있는 행 N건.
  //   private 'myspace' 버킷 → service_role 서명URL 생성 → ocr-extract → search_text 적재.
  //   스코프(personal/team/branch) 격리는 검색 시 사용자 토큰 RLS가 자동 보장(여기선 적재만).
  //   멱등: 성공='done' / 빈추출='empty' / 비대상 타입='skip' 마킹 → 재선택 방지.
  const files = await processMyspaceFiles();

  return json({ picked: rows.length, ok, empty, failed, remaining, files });
});

// PDF/이미지 판별 (Gemini 직접 OCR 대상). office류는 후순위(skip).
function isOcrTarget(mime: string, ext: string): boolean {
  const m = (mime || "").toLowerCase(); const e = (ext || "").toLowerCase().replace(/^\./, "");
  if (m === "application/pdf" || m.startsWith("image/")) return true;
  return ["pdf", "png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff", "heic", "heif"].indexOf(e) >= 0;
}

async function processMyspaceFiles() {
  const out = { picked: 0, ok: 0, empty: 0, failed: 0, skip: 0, remaining: -1 };
  let rows: Array<{ id: string; storage_path: string; mime_type: string | null; ext: string | null; original_name: string | null }> = [];
  try {
    const q = "myspace_files?select=id,storage_path,mime_type,ext,original_name"
            + "&ocr_status=is.null&storage_path=not.is.null&deleted_at=is.null&limit=" + BATCH;
    const r = await rest(q);
    if (!r.ok) { (out as any).error = "files 조회 실패 " + r.status; return out; }
    rows = await r.json();
  } catch (e) { (out as any).error = "files 조회 오류 " + String(e); return out; }

  out.picked = rows.length;
  for (const f of rows) {
    try {
      // 비대상 타입(office류 등) → skip 마킹(재선택 방지)
      if (!isOcrTarget(f.mime_type || "", f.ext || "")) {
        await patchFile(f.id, { ocr_status: "skip" }); out.skip++; continue;
      }
      // private 'myspace' 버킷 서명URL (service_role)
      const enc = f.storage_path.split("/").map(encodeURIComponent).join("/");
      const sg = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/myspace/${enc}`, {
        method: "POST",
        headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: 3600 }),
      });
      const sj = await sg.json().catch(() => ({}));
      const signed = sj && typeof sj.signedURL === "string" ? sj.signedURL : "";
      if (!sg.ok || !signed) { out.failed++; console.error("[ocr-batch/files] 서명 실패", f.id, sg.status); continue; }
      const fileUrl = `${SUPABASE_URL}/storage/v1${signed}`;

      const ex = await fetch(`${SUPABASE_URL}/functions/v1/ocr-extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
        body: JSON.stringify({ fileUrl }),
      });
      const j = await ex.json().catch(() => ({}));
      if (!ex.ok) { out.failed++; console.error("[ocr-batch/files] extract 실패", f.id, ex.status, j?.error); continue; }
      const text = (j && typeof j.text === "string") ? j.text : "";

      if (text.trim().length) {
        // 파일명 + 추출본문 → search_text (둘 다 검색되게). 'done' 마킹.
        const name = (f.original_name || "").trim();
        const merged = (name ? name + "\n" : "") + text;
        await patchFile(f.id, { search_text: merged, ocr_status: "done" });
        out.ok++;
      } else {
        await patchFile(f.id, { ocr_status: "empty" });
        out.empty++;
      }
    } catch (e) { out.failed++; console.error("[ocr-batch/files] 처리 오류", f.id, String(e)); }
  }

  try {
    const r2 = await rest("myspace_files?select=id&ocr_status=is.null&storage_path=not.is.null&deleted_at=is.null",
      { headers: { Prefer: "count=exact", Range: "0-0" } });
    const cr = r2.headers.get("content-range"); if (cr) out.remaining = parseInt(cr.split("/")[1] || "-1", 10);
  } catch (_e) {}
  return out;
}

async function patchFile(id: string, patch: Record<string, unknown>) {
  const up = await rest("myspace_files?id=eq." + encodeURIComponent(id), {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!(up.ok || up.status === 204)) console.error("[ocr-batch/files] UPDATE 실패", id, up.status);
  return up;
}

// ── 배포 NOTE ──────────────────────────────────────────────
// 1) source_pdf_url 이 private(서명 필요/만료) URL이면 ocr-extract fetch 가 403 → failed.
//    그 경우 이 함수에서 storage signed URL 생성으로 교체:
//      POST {SUPABASE_URL}/storage/v1/object/sign/{bucket}/{path}  (service_role) → signedURL
//    배포 후 1~2건 테스트로 source_pdf_url 직결 가능 여부 먼저 확인할 것.
// 2) CRON_SECRET / SUPABASE_SERVICE_ROLE_KEY / GEMINI_API_KEY(ocr-extract용) 는 Supabase secret 에 이미 존재.
// 3) 배포: supabase functions deploy ocr-batch   (verify_jwt 기본 — cron은 x-cron-secret로 별도 인증하므로
//    --no-verify-jwt 로 배포하거나, cron 호출 시 Authorization Bearer SERVICE_ROLE 동봉 중 택1. 가이드 참조)
