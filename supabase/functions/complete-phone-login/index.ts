// supabase/functions/complete-phone-login/index.ts
// SMS 로그인 — PortOne 휴대폰 본인인증 성공 → 기존 사용자 확정 → 일회용 token_hash 발급.
// ★세션은 이 함수가 직접 만들지 않음: 클라가 받은 token_hash를 supabase.auth.verifyOtp로 "교환"해 세션 생성.
// ★배포 금지(테스트 프로젝트 검증 후 PR). 신규 계정 자동생성 0. service_role=이 함수 내부만.
//
// 대표 조건 반영:
//  1) service_role Edge 내부만  2) user id·email 먼저 확정 후 generateLink  3) 없는 번호 신규생성 금지
//  4) 번호 중복 계정 로그인 차단  5) verificationId 재사용 차단  6) link/token_hash/토큰 로그·DB 저장 금지
//  7) 외부 응답에 사용자 존재여부 비노출(실패는 단일 코드)  8/9) 이메일 OTP는 별개로 유지(이 함수는 SMS 경로만)

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

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: "payload_too_large" }, 413);
  let body: { verificationId?: string; state?: string };
  try { body = JSON.parse(raw); } catch { return json({ error: "bad_request" }, 400); }
  const verificationId = body.verificationId, state = body.state;
  if (!verificationId || !state) return json({ error: "missing_fields" }, 400);

  // (1) 서버 재조회 — 클라 결과 불신
  const apiSecret = Deno.env.get("PORTONE_V2_API_SECRET");
  if (!apiSecret) return json({ error: "server_misconfig" }, 500);
  const r = await fetch(`${PORTONE_API}/identity-verifications/${encodeURIComponent(verificationId)}`, {
    headers: { Authorization: `PortOne ${apiSecret}` },
  });
  if (!r.ok) return json({ error: "reverify_failed" }, 502);
  const iv = await r.json();
  if (iv?.status !== "VERIFIED") return json({ error: "not_verified" }, 409);

  const phone = normalizePhone(iv?.verifiedCustomer?.phoneNumber ?? "");
  if (!phone) return json({ error: "login_failed" }, 401);   // 존재여부 비노출 — 단일 실패코드

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // (5) verificationId 재사용 차단 — 먼저 선점(있으면 차단). purpose=login.
  const { error: usedErr } = await sb.from("used_verifications")
    .insert({ verification_id: verificationId, purpose: "login", phone_normalized: phone });
  if (usedErr) return json({ error: "login_failed" }, 401);   // 재사용 = 단일 실패코드

  // (2)(3)(4) 그 번호의 활성 사용자 확정 — 0건/2건↑ 모두 차단(존재여부 비노출). 신규 생성 0.
  const { data: users } = await sb.from("users")
    .select("id, email").eq("phone_normalized", phone).is("deleted_at", null).limit(2);
  if (!users || users.length !== 1 || !users[0].email) {
    return json({ error: "login_failed" }, 401);              // 0건(미가입)·중복 → 동일 코드
  }
  const email = users[0].email as string;

  // (6) 일회용 token_hash 발급 — magiclink. 세션 아님. 로그·DB 저장 0(반환만).
  const { data: link, error: linkErr } = await sb.auth.admin.generateLink({ type: "magiclink", email });
  if (linkErr || !link?.properties?.hashed_token) {
    return json({ error: "login_failed" }, 401);
  }

  // 클라가 supabase.auth.verifyOtp({ token_hash, type:'email' })로 교환해 세션 생성.
  return json({ ok: true, token_hash: link.properties.hashed_token }, 200);
});
