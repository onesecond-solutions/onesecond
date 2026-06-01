// supabase/functions/charge-subscriptions/index.ts
//
// 정기결제 월 자동청구 (조각 3). subscriptions 의 빌링키로 PortOne V2 결제 API를 호출해
// "다음 청구일 도래" 구독을 청구한다. 조각 4(cron)가 매일 1회 이 함수를 호출한다.
//
// 보안: 실제 돈이 빠지는 함수이므로 공개 호출을 막는다. x-cron-secret 헤더가
//       CRON_SECRET 과 일치할 때만 동작 (cron 만 안다).
// 멱등성: paymentId = 구독ID+청구월 로 고정 → 재시도 시 PortOne 가 중복으로 거부 = 이중청구 방지.
// 금액: 서버 고정 맵(PLAN_AMOUNT)만 신뢰 (클라가 보낸 금액 신뢰 X).
//
// 필요한 secret (Supabase):
//   - PORTONE_V2_API_SECRET : PortOne 콘솔 발급 V2 API Secret
//   - CRON_SECRET           : 이 함수 호출 인가용 임의 문자열
//   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 는 Edge 런타임이 자동 주입)
// 선택 secret:
//   - OS_STORE_ID           : 미설정 시 아래 기본값 사용

const PORTONE_API = "https://api.portone.io";
const DEFAULT_STORE_ID = "store-41e93948-a67a-4ae0-abc5-1c95266ee12b";

// 플랜별 월 청구액 (원). 서버 단일 진실 — 클라/DB 금액 신뢰하지 않음.
const PLAN_AMOUNT: Record<string, number> = { plus: 9900, pro: 19900 };
const PLAN_NAME: Record<string, string> = { plus: "PLUS", pro: "PRO" };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// next_billing_at 을 한 달 앞당긴 ISO 문자열 (drift 방지 — now 가 아니라 예정일 기준).
function addOneMonth(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + 1);
  // 말일 보정 (예: 1/31 +1달 → 3월로 넘어가는 것 방지 → 해당 월 말일로)
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d.toISOString();
}

// 구독ID + 청구월(YYYYMM) 로 고정 paymentId (멱등). 40자 이내(이니시스 oid 제약 정합).
function buildPaymentId(subId: string, periodIso: string): string {
  const hex = subId.replace(/-/g, "").slice(0, 24);
  const d = new Date(periodIso);
  const ym = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return `os${hex}${ym}`; // 2 + 24 + 6 = 32자
}

interface Sub {
  id: string;
  user_id: string;
  plan_id: string;
  billing_key: string;
  next_billing_at: string;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST만 허용됩니다." }, 405);

  // ── 1. 인가 (cron 만 호출 가능) ──────────────────────────────────────────
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret) {
    console.error("[charge] CRON_SECRET 미설정");
    return json({ error: "서버 설정이 준비되지 않았습니다." }, 500);
  }
  if (req.headers.get("x-cron-secret") !== cronSecret) {
    return json({ error: "권한이 없습니다." }, 401);
  }

  const apiSecret = Deno.env.get("PORTONE_V2_API_SECRET");
  const supaUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const storeId = Deno.env.get("OS_STORE_ID") || DEFAULT_STORE_ID;
  if (!apiSecret || !supaUrl || !serviceKey) {
    console.error("[charge] 필수 env 누락", { apiSecret: !!apiSecret, supaUrl: !!supaUrl, serviceKey: !!serviceKey });
    return json({ error: "서버 설정이 준비되지 않았습니다." }, 500);
  }

  const sbHeaders = {
    "apikey": serviceKey,
    "Authorization": `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  // ── 2. 활성 구독 전체 조회 후 사용자별 최신만 유지 (dedup) ─────────────────
  let subs: Sub[] = [];
  try {
    const r = await fetch(
      `${supaUrl}/rest/v1/subscriptions?status=eq.active&select=id,user_id,plan_id,billing_key,next_billing_at,created_at&order=user_id.asc,created_at.desc`,
      { headers: sbHeaders },
    );
    if (!r.ok) {
      console.error("[charge] 구독 조회 실패", r.status, await r.text().catch(() => ""));
      return json({ error: "구독 조회에 실패했습니다." }, 502);
    }
    subs = await r.json();
  } catch (e) {
    console.error("[charge] 구독 조회 오류", e);
    return json({ error: "구독 조회 중 오류." }, 502);
  }

  const keepByUser = new Map<string, Sub>();
  const superseded: Sub[] = [];
  for (const s of subs) {
    if (!keepByUser.has(s.user_id)) keepByUser.set(s.user_id, s); // created_at desc 정렬이라 첫 행 = 최신
    else superseded.push(s);
  }

  // 재발급으로 밀려난 옛 active → canceled (이중청구 방지)
  for (const s of superseded) {
    try {
      await fetch(`${supaUrl}/rest/v1/subscriptions?id=eq.${s.id}`, {
        method: "PATCH",
        headers: { ...sbHeaders, "Prefer": "return=minimal" },
        body: JSON.stringify({ status: "canceled", updated_at: new Date().toISOString() }),
      });
    } catch (e) {
      console.error("[charge] supersede 처리 오류", s.id, e);
    }
  }

  // ── 3. 청구일 도래분 청구 ────────────────────────────────────────────────
  const now = new Date();
  const result = { checked: keepByUser.size, due: 0, charged: 0, failed: 0, skipped: 0, superseded: superseded.length };

  for (const sub of keepByUser.values()) {
    if (new Date(sub.next_billing_at) > now) continue; // 아직 청구일 전
    result.due++;

    const amount = PLAN_AMOUNT[sub.plan_id];
    const planName = PLAN_NAME[sub.plan_id] || sub.plan_id;
    if (!amount) {
      console.error("[charge] 알 수 없는 plan_id, 건너뜀", sub.id, sub.plan_id);
      result.skipped++;
      continue;
    }

    const paymentId = buildPaymentId(sub.id, sub.next_billing_at);
    let paid = false;
    try {
      const payRes = await fetch(`${PORTONE_API}/payments/${encodeURIComponent(paymentId)}/billing-key`, {
        method: "POST",
        headers: { "Authorization": `PortOne ${apiSecret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          billingKey: sub.billing_key,
          orderName: `원세컨드 ${planName} 정기결제`,
          amount: { total: amount },
          currency: "KRW",
        }),
      });
      const payText = await payRes.text();
      // 멱등 충돌(이미 청구된 paymentId) = 성공 처리 (재시도 안전망)
      if (payRes.ok || /already|conflict|duplicate/i.test(payText)) {
        paid = true;
      } else {
        console.error("[charge] 결제 실패", sub.id, payRes.status, payText.slice(0, 300));
      }
    } catch (e) {
      console.error("[charge] 결제 호출 오류", sub.id, e);
    }

    try {
      if (paid) {
        await fetch(`${supaUrl}/rest/v1/subscriptions?id=eq.${sub.id}`, {
          method: "PATCH",
          headers: { ...sbHeaders, "Prefer": "return=minimal" },
          body: JSON.stringify({
            last_payment_at: new Date().toISOString(),
            last_payment_id: paymentId,
            next_billing_at: addOneMonth(sub.next_billing_at),
            updated_at: new Date().toISOString(),
          }),
        });
        result.charged++;
      } else {
        await fetch(`${supaUrl}/rest/v1/subscriptions?id=eq.${sub.id}`, {
          method: "PATCH",
          headers: { ...sbHeaders, "Prefer": "return=minimal" },
          body: JSON.stringify({ status: "past_due", updated_at: new Date().toISOString() }),
        });
        result.failed++;
      }
    } catch (e) {
      console.error("[charge] 구독 갱신 오류", sub.id, e);
    }
  }

  console.log("[charge] 완료", JSON.stringify(result));
  return json(result);
});
