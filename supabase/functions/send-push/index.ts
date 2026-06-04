// supabase/functions/send-push/index.ts
//
// 웹 푸시 발송 (인앱 알림 Phase 3). push_subscriptions 에 저장된 구독으로
// VAPID 서명 웹푸시를 보낸다. 새 글 등록 시 DB 트리거(pg_net) 또는 수동 호출로 동작.
//
// 보안: x-cron-secret 헤더가 CRON_SECRET 과 일치할 때만 동작 (공개 호출 차단).
// 만료 구독(404/410)은 자동 삭제.
//
// 필요한 secret (Supabase):
//   - VAPID_PRIVATE_KEY : npx web-push generate-vapid-keys 의 Private Key
//   - VAPID_SUBJECT     : mailto:bylts0428@gmail.com
//   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 는 Edge 런타임이 자동 주입)
// 선택 secret:
//   - VAPID_PUBLIC_KEY  : 미설정 시 아래 기본값(클라이언트와 동일 공개키) 사용
//
// 호출 예 (cron 또는 DB 트리거):
//   POST /functions/v1/send-push
//   headers: { x-cron-secret: <CRON_SECRET>, content-type: application/json }
//   body: { "title": "현장의 소리 새 글", "body": "...", "url": "/app.html?view=voice" }

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

// 클라이언트(app.html)와 동일한 VAPID 공개키 기본값.
const DEFAULT_VAPID_PUBLIC =
  "BGKzheThBmjNvKisxIb5VmI56waoxFV6oFjh2RAus_kYByleefGmUIq-puo9qVdBW19erWgLNhdFEPNjIS5ygF0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

interface Subscription {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // 인가
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return json({ error: "unauthorized" }, 401);
  }

  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") ?? DEFAULT_VAPID_PUBLIC;
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:bylts0428@gmail.com";
  if (!vapidPrivate) return json({ error: "missing_vapid_private_key" }, 500);

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  // 발송 페이로드 (서비스워커 push 핸들러가 d.title/d.body/d.url 사용)
  let payload: { title?: string; body?: string; url?: string; tag?: string } = {};
  try { payload = await req.json(); } catch (_e) { payload = {}; }
  const message = JSON.stringify({
    title: payload.title || "원세컨드 새 글",
    body: payload.body || "",
    url: payload.url || "/app.html",
    tag: payload.tag,
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth");
  if (error) return json({ error: "db_select_failed", detail: error.message }, 500);

  let sent = 0, removed = 0, failed = 0;
  const staleIds: number[] = [];

  for (const s of (subs ?? []) as Subscription[]) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        message,
      );
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) { staleIds.push(s.id); removed++; }
      else { failed++; }
    }
  }

  // 만료 구독 정리
  if (staleIds.length) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }

  return json({ ok: true, total: (subs ?? []).length, sent, removed, failed });
});
