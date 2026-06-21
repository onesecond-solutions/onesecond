// supabase/functions/complete-signup/index.ts
// SMS 가입 — 휴대폰 본인인증(signup token) + 가입정보 → 계정 생성. ★배포·머지 금지(테스트 검증용).
//
// 흐름(대표 §1 보강 — 토큰 유실·고아·중복 방지, 한 흐름 원자성+보상):
//  1) verificationId 재조회 VERIFIED → phone_normalized(로그 0)
//  2) reserve_signup_token(processing 선점) — 이미 완료면 created_user_id로 수렴(중복 계정 0)
//  3) auth.admin.createUser(email_confirm) — already_exists면 기존 user로 멱등 수렴(고아·중복 0)
//  4) public.users 보강(handle_new_user가 메타 복사) 5) finalize_signup_token(consumed+user_id)
// 중간 실패 시 토큰은 processing 유지 → 동일 요청 재시도 안전. service_role=Edge 내부만.

import { createClient } from "npm:@supabase/supabase-js@2";

const PORTONE_API = "https://api.portone.io";
const MAX_BODY = 32 * 1024;
const CORS = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
function normalizePhone(p: string){ let s=(p||"").replace(/[^0-9]/g,""); if(s.startsWith("82")) s="0"+s.slice(2); return s; }
async function sha256(s: string){ const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join(""); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: "payload_too_large" }, 413);
  let b: Record<string, unknown>;
  try { b = JSON.parse(raw); } catch { return json({ error: "bad_request" }, 400); }
  const signupToken = String(b.signup_token ?? ""), verificationId = String(b.verificationId ?? "");
  const email = String(b.email ?? "").trim(), name = String(b.name ?? "").trim();
  if (!signupToken || !verificationId || !email || email.indexOf("@") < 0 || !name) return json({ error: "missing_fields" }, 400);

  // (1) 재조회 — phone 확정(로그·응답 0)
  const apiSecret = Deno.env.get("PORTONE_V2_API_SECRET");
  if (!apiSecret) return json({ error: "server_misconfig" }, 500);
  const r = await fetch(`${PORTONE_API}/identity-verifications/${encodeURIComponent(verificationId)}`, {
    headers: { Authorization: `PortOne ${apiSecret}` } });
  if (!r.ok) return json({ error: "reverify_failed" }, 502);
  const iv = await r.json();
  if (iv?.status !== "VERIFIED") return json({ error: "not_verified" }, 409);
  const phone = normalizePhone(iv?.verifiedCustomer?.phoneNumber ?? "");
  if (!phone) return json({ error: "signup_failed" }, 422);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const tokenHash = await sha256(signupToken);

  // (2) reserve — processing 선점/수렴. 토큰 유효성·바인딩(verificationId+phone) 검증은 RPC 내부.
  const { data: rv, error: rvErr } = await sb.rpc("reserve_signup_token", {
    p_token_hash: tokenHash, p_verification_id: verificationId, p_phone_normalized: phone });
  if (rvErr) { console.error("[complete-signup] reserve", rvErr.code || "err"); return json({ error: "signup_token_invalid" }, 409); }
  if (rv && rv.proceed === false && rv.created_user_id) {
    return json({ ok: true, user_id: rv.created_user_id, converged: true }, 200);  // 이미 가입됨 → 수렴(중복 0)
  }

  // (3) 계정 생성 — 멱등(already_exists면 기존 user로 수렴)
  const meta = { name, phone, phone_normalized: phone,
    company_id: b.company_id ?? null, branch_id: b.branch_id ?? null, team_id: b.team_id ?? null,
    role: b.role ?? "ga_member", status: b.status ?? "active",
    phone_verified_at: new Date().toISOString(), phone_verification_provider: "portone", verification_id: verificationId };
  let userId: string | null = null;
  const { data: created, error: cErr } = await sb.auth.admin.createUser({
    email, email_confirm: true, user_metadata: meta });
  if (created?.user?.id) userId = created.user.id;
  else {
    // already_exists → 본인 재시도(방금 생성, phone 미설정/이번 phone 동일)인지 타인 이메일 중복인지 구분.
    //   타인 이메일에 휴대폰이 매핑되는 탈취를 막음.
    const { data: ex } = await sb.from("users").select("id, phone_normalized").eq("email", email).is("deleted_at", null).limit(1);
    if (ex && ex.length) {
      const exu = ex[0] as { id: string; phone_normalized: string | null };
      if (!exu.phone_normalized || exu.phone_normalized === phone) userId = exu.id;  // 본인 수렴
      else return json({ error: "email_in_use" }, 409);                              // 타인 이메일 중복 → 차단
    }
  }
  if (!userId) { console.error("[complete-signup] create", cErr?.code || "err"); return json({ error: "signup_failed" }, 409); }

  // (4) public.users 휴대폰 인증정보 보강(트리거가 못 채운 값 대비)
  await sb.from("users").update({ phone_normalized: phone, phone_verified_at: meta.phone_verified_at,
    phone_verification_provider: "portone", verification_id: verificationId }).eq("id", userId);

  // (5) 마지막에 consumed 확정
  const { error: fErr } = await sb.rpc("finalize_signup_token", { p_token_hash: tokenHash, p_user_id: userId });
  if (fErr) console.error("[complete-signup] finalize", fErr.code || "err");  // 토큰 processing 유지=재시도 안전

  return json({ ok: true, user_id: userId }, 200);
});
