// supabase/functions/complete-phone-login-testmap/index.ts
// ★★onesecond-test 전용 검수 함수. 검수 완료 후 반드시 삭제(운영 배포 절대 금지).
//   운영 complete-phone-login 에는 이 자동 매핑 백도어가 없음(순수 로그인 경로).
//
// 목적: 본인인증 1회로 (a)지정 테스트 사용자에 휴대폰 서버내부 매핑 + (b)로그인 세션 교환을 한 흐름에 처리.
//   → 대표님 본인인증 2회 요구 제거. phone_normalized 로그/응답 0.
//
// 흐름: PortOne 본인인증 1회 → VERIFIED 재조회 → phone_normalized(외부출력 0)
//   → TEST_LOGIN_USER_ID(서버 env, 클라 지정 불가) 사용자에 서버내부 매핑(update)
//   → generateLink → token_hash 만 반환 → 클라가 verifyOtp 교환 → 세션.

import { createClient } from "npm:@supabase/supabase-js@2";

const PORTONE_API = "https://api.portone.io";
const MAX_BODY = 16 * 1024;
const CORS = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
function normalizePhone(p: string): string {
  let s = (p || "").replace(/[^0-9]/g, "");
  if (s.startsWith("82")) s = "0" + s.slice(2);
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // ★테스트 전용 가드: TEST_LOGIN_USER_ID(서버 env)가 없으면 비활성(운영 환경엔 미설정 → 동작 0)
  const testUserId = Deno.env.get("TEST_LOGIN_USER_ID");
  if (!testUserId) return json({ error: "disabled" }, 403);

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: "payload_too_large" }, 413);
  let body: { verificationId?: string; state?: string };
  try { body = JSON.parse(raw); } catch { return json({ error: "bad_request" }, 400); }
  if (!body.verificationId || !body.state) return json({ error: "missing_fields" }, 400);

  const apiSecret = Deno.env.get("PORTONE_V2_API_SECRET");
  if (!apiSecret) return json({ error: "server_misconfig" }, 500);
  const r = await fetch(`${PORTONE_API}/identity-verifications/${encodeURIComponent(body.verificationId)}`, {
    headers: { Authorization: `PortOne ${apiSecret}` },
  });
  if (!r.ok) return json({ error: "reverify_failed" }, 502);
  const iv = await r.json();
  if (iv?.status !== "VERIFIED") return json({ error: "not_verified" }, 409);

  const phone = normalizePhone(iv?.verifiedCustomer?.phoneNumber ?? "");   // ★로그/응답 출력 0
  if (!phone) return json({ error: "login_failed" }, 401);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // 서버내부 매핑 — 대상은 env의 TEST_LOGIN_USER_ID만(클라가 user_id 지정 불가)
  const { error: upErr } = await sb.from("users")
    .update({ phone_normalized: phone }).eq("id", testUserId).is("deleted_at", null);
  if (upErr) return json({ error: "login_failed" }, 401);

  // 그 사용자 email 확정 → generateLink → token_hash만
  const { data: u } = await sb.from("users").select("email").eq("id", testUserId).single();
  if (!u?.email) return json({ error: "login_failed" }, 401);
  const { data: link, error: linkErr } = await sb.auth.admin.generateLink({ type: "magiclink", email: u.email });
  if (linkErr || !link?.properties?.hashed_token) return json({ error: "login_failed" }, 401);

  return json({ ok: true, token_hash: link.properties.hashed_token }, 200);   // 클라가 verifyOtp로 교환
});
