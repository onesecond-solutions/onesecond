// supabase/functions/portone-webhook/index.ts
// PortOne V2 결제 웹훅 수신 → ★서버 재조회(웹훅 본문 불신) → apply_payment_event RPC 원자 반영.
// ★배포 금지(설계·코드 단계). 환경변수·운영 채널 미연결.
//
// 보안 원칙:
//  - 웹훅 서명 검증(위조 방지) 후에만 처리. 본문만 신뢰 X.
//  - 결제 상태/금액/plan은 PortOne REST 재조회 결과만 신뢰.
//  - users.plan 변경은 apply_payment_event RPC(service_role)만.
//  - 로그에 휴대폰번호/빌링키/전체 payload 출력 금지. 오류 응답 내부정보 비노출.
//  - 멱등(event_id) → 중복 웹훅 0. 처리 실패 시 5xx → PortOne 재발송(재처리).

import { createClient } from "npm:@supabase/supabase-js@2";
// PortOne 웹훅 검증(StandardWebhooks 표준). 실제 배포 시 @portone/server-sdk Webhook.verify 사용.
// import { Webhook } from "npm:@portone/server-sdk";

const PORTONE_API = "https://api.portone.io";
const MAX_BODY = 64 * 1024;            // 요청 크기 제한

const CORS = {
  "Access-Control-Allow-Origin": "*",  // 웹훅은 PortOne 서버→우리 서버. 운영 시 PortOne IP/Origin 한정 검토.
  "Access-Control-Allow-Headers": "content-type, webhook-id, webhook-signature, webhook-timestamp",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

// PortOne webhook type → 내부 event_type 매핑 (정확한 type 문자열은 PortOne V2 webhook 문서 기준 확정)
function mapEventType(t: string, status: string): string {
  const x = (t || "").toLowerCase(), s = (status || "").toLowerCase();
  if (x.includes("billingkey") && x.includes("paid")) return "billing_paid";
  if (x.includes("paid") || s === "paid") return "paid";
  if (x.includes("failed") || s === "failed") return "failed";
  if (x.includes("partialcancel") || x.includes("partial")) return "partial_refunded";
  if (x.includes("cancel") || s === "cancelled") {
    return s === "cancelled" ? "cancelled" : "refunded";   // 전액취소=환불 / 결제취소
  }
  return x || "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: "payload_too_large" }, 413);

  // (1) 웹훅 서명 검증 — 위조 방지. 실패 시 401(본문 불신).
  const whSecret = Deno.env.get("PORTONE_WEBHOOK_SECRET");
  if (!whSecret) return json({ error: "server_misconfig" }, 500);
  let evt: Record<string, unknown>;
  try {
    // 실제: const payload = await Webhook.verify(whSecret, raw, {
    //   "webhook-id": req.headers.get("webhook-id")!, "webhook-signature": ..., "webhook-timestamp": ... });
    // 설계 단계 스켈레톤: 서명 검증 통과 가정 후 파싱(배포 전 verify 연결 필수).
    evt = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_signature_or_body" }, 401);
  }

  const eventId = req.headers.get("webhook-id") || String((evt as { id?: string }).id || "");
  const evType = String((evt as { type?: string }).type || "");
  const paymentId = (evt as { data?: { paymentId?: string } }).data?.paymentId;
  if (!eventId || !paymentId) return json({ error: "missing_event_fields" }, 400);

  // (2) ★서버 재조회 — 웹훅 본문 불신. PortOne REST로 결제 재확인.
  const apiSecret = Deno.env.get("PORTONE_V2_API_SECRET");
  if (!apiSecret) return json({ error: "server_misconfig" }, 500);
  const r = await fetch(`${PORTONE_API}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `PortOne ${apiSecret}` },
  });
  if (!r.ok) return json({ error: "reverify_failed" }, 502);   // 재조회 실패 → 재발송 유도
  const pay = await r.json();

  // (3) 검증값 구성 — 금액·통화·상태·plan·구독 매칭. (plan/금액 서버 plans 대조는 RPC 또는 여기 확장)
  const verified = {
    payment_id: pay?.id,
    status: pay?.status,
    amount: pay?.amount?.total,
    currency: pay?.currency,
    user_id: pay?.customer?.id ?? pay?.customData?.user_id,
    subscription_id: pay?.customData?.subscription_id ?? "",
    plan_code: pay?.customData?.plan_code,
    paid_at: pay?.paidAt ?? "",
    failure_code: pay?.failure?.pgCode ?? null,
    provider_transaction_id: pay?.pgTxId ?? null,
  };
  if (!verified.user_id) return json({ error: "unmatched_payment" }, 422);

  // (4) event_type 매핑 + (5) 원자 RPC (payment_events 멱등 → payments → subscriptions → users.plan)
  const mapped = mapEventType(evType, String(pay?.status || ""));
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await sb.rpc("apply_payment_event", {
    p_event_id: eventId, p_event_type: mapped, p_verified: verified,
  });
  if (error) {
    // 비식별 오류코드만. 휴대폰/빌링키/payload 미출력. 5xx → PortOne 재발송(재처리).
    console.error("[portone-webhook] apply_failed", error.code || "rpc_error");
    return json({ error: "processing_failed" }, 500);
  }
  return json({ ok: true, outcome: (data as { outcome?: string })?.outcome }, 200);  // 200 → 재발송 중단
});
