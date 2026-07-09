// supabase/functions/newsletter-sign/index.ts
//
// 비로그인 소식지 미리보기 — published 소식지에 한해 만료 서명 URL을 발급하는 공개 Edge Function.
// 홈(회사 허브·통합검색)은 비로그인 사용자도 published 소식지 목록을 보지만, source_path 가 private
// 'newsletters' 버킷에 있어 프론트가 직접 서명 URL을 못 만든다(토큰 없음). 이 함수가 서버에서
// service_role 로 서명해 돌려준다.
//
// 🔒 보안 (서버 강제):
//   1) status='published' 인 행만 서명 발급 — 검수중(reviewing)·비공개 초안은 404 로 거부.
//   2) 버킷은 'newsletters' 하드코딩 — 타 버킷 서명 발급 불가(경로 주입·버킷 주입 차단).
//   3) 입력은 소식지 id 뿐 — 임의 storage path 를 받지 않는다(경로 주입 차단). 실제 path 는 DB 에서만 읽음.
//   4) anon 허용 — 배포 시 --no-verify-jwt (verify_jwt=false). 인증 없이 호출 가능하나 위 1~3 으로 노출은 published 로 제한.
//
// 입력 (POST JSON): { "id": "<newsletters.id>" }
// 출력 (200):       { "signedUrl": "https://.../storage/v1/object/sign/newsletters/...?token=..." }
// 실패:             404 { error } (없음·미발행·source_path 없음) / 400 { error } (id 누락) / 5xx { error }
//
// DB/Storage: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (Edge Function 자동 주입).
// 서명 유효기간: 3600초(1시간). ocr-batch 의 newsletters 버킷 서명 패턴과 동일.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const BUCKET = "newsletters";   // 하드코딩 — 타 버킷 발급 금지
const EXPIRES_IN = 3600;         // 서명 유효기간(초) = 1시간

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// PostgREST 헬퍼 (service_role, 읽기 전용 사용)
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
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: "env(SUPABASE_URL/SERVICE_ROLE) 미설정" }, 500);

  // 1) 입력 = 소식지 id 뿐 (임의 path 금지)
  let id = "";
  try {
    const body = await req.json();
    id = (body && typeof body.id === "string") ? body.id.trim() : "";
  } catch (_e) { return json({ error: "JSON 본문 필요" }, 400); }
  if (!id) return json({ error: "id 누락" }, 400);

  // 2) published 소식지만 조회 — status='published' + source_path 존재 (서버에서 강제)
  //    id 는 eq. 필터로만 사용, path 는 DB 값(source_path)만 사용 → 경로 주입 불가.
  let row: { source_path: string | null } | null = null;
  try {
    const q = "newsletters?select=source_path&status=eq.published&id=eq." + encodeURIComponent(id) + "&limit=1";
    const r = await rest(q);
    if (!r.ok) return json({ error: "조회 실패 " + r.status }, 500);
    const rows = await r.json();
    row = (Array.isArray(rows) && rows[0]) ? rows[0] : null;
  } catch (e) { return json({ error: "조회 오류", detail: String(e) }, 500); }

  // 미발행·없음·source_path 없음 → 404 (존재 여부·발행 상태를 구분 노출하지 않음)
  const sourcePath = (row && typeof row.source_path === "string") ? row.source_path.trim() : "";
  if (!sourcePath) return json({ error: "소식지를 찾을 수 없습니다." }, 404);

  // 3) newsletters 버킷 서명 URL 발급 (service_role) — ocr-batch 와 동일 패턴
  try {
    const enc = sourcePath.split("/").map(encodeURIComponent).join("/");
    const sg = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${enc}`, {
      method: "POST",
      headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: EXPIRES_IN }),
    });
    const sj = await sg.json().catch(() => ({}));
    // Storage v2=signedUrl(소문자 l) / 구버전=signedURL 양쪽 호환. 응답 signed 는 /object/sign/... (앞에 /storage/v1 없음)
    const signed = sj && (sj.signedUrl ?? sj.signedURL ?? "");
    if (!sg.ok || !signed) {
      console.error("[newsletter-sign] 서명 실패", id, sg.status, JSON.stringify(sj));
      return json({ error: "서명 URL 생성 실패" }, 502);
    }
    return json({ signedUrl: `${SUPABASE_URL}/storage/v1${signed}` });
  } catch (e) {
    console.error("[newsletter-sign] 처리 오류", id, String(e));
    return json({ error: "서명 처리 오류", detail: String(e) }, 500);
  }
});

// ── 배포 NOTE ──────────────────────────────────────────────
// · anon 호출 허용이 목적 → verify_jwt=false 로 배포:
//     supabase functions deploy newsletter-sign --no-verify-jwt
// · SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 는 Edge Function 런타임에 자동 주입(별도 secret 설정 불필요).
// · 프론트는 apikey(anon)만 실어 호출(window.db.fetchPublic). verify_jwt=false 라 Authorization 불필요.
