// supabase/functions/verify-identity/index.ts
// PortOne V2 휴대폰 본인인증 결과 서버 재조회 → 검증 → 가입용 signup_token 발급.
// ★배포 금지(설계·코드 단계). 환경변수·운영 채널 미연결. 본인인증 PG=NHN KCP SMS.
//
// 보안 원칙:
//  - 클라 인증 결과만 신뢰 X → PortOne REST 재조회로 확정.
//  - verificationId 1회만(재사용 차단) / 활성 동일번호 중복 차단.
//  - 최소 저장(phone·phone_verified_at 등 / CI·주민번호 미저장).
//  - 토큰=해시 저장·짧은 만료·1회·verification_id+phone+state 바인딩.
//  - API Secret·service_role=서버 전용. 로그에 휴대폰/전체 payload 미출력.

import { createClient } from "npm:@supabase/supabase-js@2";

const PORTONE_API = "https://api.portone.io";
const MAX_BODY = 16 * 1024;
const TOKEN_TTL = 600;   // 가입 토큰 10분

// ★CORS: 허용 출처는 env(ALLOWED_ORIGIN). 운영/테스트 프로젝트별 Secret로 도메인 주입(하드코딩 0).
//   미설정 시 빈 문자열(차단) — 배포 시 ALLOWED_ORIGIN 필수.
const CORS = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

function normalizePhone(p: string): string {
  let s = (p || "").replace(/[^0-9]/g, "");
  if (s.startsWith("82")) s = "0" + s.slice(2);          // +82 → 0
  return s;
}
async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
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

  // (1) ★서버 재조회 — 클라 결과 불신. PortOne REST로 본인인증 재확인.
  const apiSecret = Deno.env.get("PORTONE_V2_API_SECRET");
  if (!apiSecret) return json({ error: "server_misconfig" }, 500);
  const r = await fetch(`${PORTONE_API}/identity-verifications/${encodeURIComponent(verificationId)}`, {
    headers: { Authorization: `PortOne ${apiSecret}` },
  });
  if (!r.ok) return json({ error: "reverify_failed" }, 502);
  const iv = await r.json();

  // (2) 인증 완료·취소·실패·만료 구분
  if (iv?.status !== "VERIFIED") {
    return json({ error: "not_verified", status: iv?.status ?? "unknown" }, 409);
  }
  // (3) state/nonce 일치 (요청 state ↔ 인증 시작 시 customData/state). 불일치=위조 의심.
  if (iv?.customData && state && iv.customData.state && iv.customData.state !== state) {
    return json({ error: "state_mismatch" }, 401);
  }

  // (4) 전화번호 정규화 (재조회 결과 기준)
  const phone = normalizePhone(iv?.verifiedCustomer?.phoneNumber ?? "");
  if (!phone) return json({ error: "no_phone" }, 422);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // (5) 활성 계정 동일번호 중복 확인 (deleted_at IS NULL)
  const { data: dup } = await sb.from("users")
    .select("id").eq("phone_normalized", phone).is("deleted_at", null).limit(1);
  if (dup && dup.length) {
    return json({ error: "phone_in_use", recover: true }, 409);   // 기존 계정 찾기/복구 안내용
  }

  // (6) 가입 토큰 발급 — 원문은 Edge 생성·클라 반환, 해시만 DB(issue_signup_token이 verificationId 재사용 차단)
  const token = crypto.randomUUID() + crypto.randomUUID();
  const tokenHash = await sha256(token);
  const { error } = await sb.rpc("issue_signup_token", {
    p_token_hash: tokenHash, p_verification_id: verificationId, p_phone_normalized: phone,
    p_state: state, p_ttl_seconds: TOKEN_TTL,
  });
  if (error) {
    // verification_already_used 등 비식별 코드만(휴대폰·payload 미출력)
    console.error("[verify-identity] issue_failed", error.code || "rpc_error");
    return json({ error: "issue_failed" }, 409);
  }

  // (7) 응답 — 가입 토큰 + 최소정보(마스킹 번호). 가입 함수가 consume_signup_token으로 검증 후 계정 생성.
  return json({
    ok: true,
    signup_token: token,        // 클라가 가입 제출 시 함께 전송(서버에서 consume)
    phone_masked: phone.replace(/(\d{3})(\d+)(\d{4})/, "$1****$3"),
    expires_in: TOKEN_TTL,
  }, 200);
});
