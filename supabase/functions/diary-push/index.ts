// supabase/functions/diary-push/index.ts
//
// 다이어리 일정 알람 — 스케줄 웹푸시 (작업2, PWA 푸시).
// pg_cron 이 5분마다 호출 → 도달한 reminders 를 찾아 "그 일정 작성자에게만" 웹푸시 발송.
//
// 기존 send-push 와 차이: send-push 는 전체 구독자 브로드캐스트(새 글용).
// 다이어리 알람은 개인 일정이므로 작성자(author_id) 구독에만 발송한다(§4: 타인 노출 0).
//
// §4 가드: 푸시 본문 = 일정 제목 + 시간만. 메모(description)·고객 식별정보 본문 금지.
// 중복방지: push_sent_log (event_id, reminder_min, fire_date) UNIQUE — 원자적 INSERT 성공분만 발송.
// 전날 알람(1440) = 전날 20:00 고정(대표 결재 2026-06-11).
//
// 보안: x-cron-secret 헤더가 CRON_SECRET 과 일치할 때만 동작(send-push 와 동일 패턴).
// 필요한 secret (이미 send-push 용으로 설정됨): VAPID_PRIVATE_KEY / VAPID_SUBJECT / CRON_SECRET.

import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

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

const KST_OFFSET = 9 * 3600 * 1000;
const GRACE_MS = 10 * 60 * 1000; // cron 5분 주기 + 여유 → 누락 방지(중복은 sent_log 가 차단)

// 'YYYY-MM-DD' + 'HH:MM' → KST 벽시계 ms (UTC 프레임으로 일관 비교)
function wallMs(dateStr: string, timeStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = (timeStr || "00:00").split(":").map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
}
function ymd(ms: number): string {
  const dt = new Date(ms);
  const p = (n: number) => (n < 10 ? "0" : "") + n;
  return dt.getUTCFullYear() + "-" + p(dt.getUTCMonth() + 1) + "-" + p(dt.getUTCDate());
}

interface Ev {
  id: number | string;
  event_date: string;
  event_time: string | null;
  title: string;
  reminders: number[] | null;
  author_id: string | null;
}
interface Sub { id: number; endpoint: string; p256dh: string; auth: string; }

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
    return json({ error: "unauthorized" }, 401);
  }
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") ?? DEFAULT_VAPID_PUBLIC;
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:bylts0428@gmail.com";
  if (!vapidPrivate) return json({ error: "missing_vapid_private_key" }, 500);
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 마스터 스위치: app_settings.calendar_reminder_enabled 가 OFF 면 전체 발송 skip.
  // 조회 실패·미설정 = 기본 ON 폴백(안전). service_role 조회라 RLS 무관.
  {
    const { data: setRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "calendar_reminder_enabled")
      .maybeSingle();
    if (setRow) {
      const v = String((setRow as { value: unknown }).value).toLowerCase();
      if (v === "off" || v === "false") {
        return json({ ok: true, disabled: true, scanned: 0, due: 0, sent: 0, removed: 0, failed: 0, skipped: 0 });
      }
    }
  }

  const nowMs = Date.now() + KST_OFFSET; // KST 벽시계
  const fromDate = ymd(nowMs - 1 * 86400000); // today-1
  const toDate = ymd(nowMs + 2 * 86400000);   // today+2 (전날 알람: 내일·모레 일정 대비)

  // 알람 설정된 일정만 조회 (메타만 select — description 미포함, §4)
  const { data: evs, error } = await supabase
    .from("calendar_events")
    .select("id, event_date, event_time, title, reminders, author_id")
    .gte("event_date", fromDate)
    .lte("event_date", toDate)
    .not("event_time", "is", null)
    .not("reminders", "is", null);
  if (error) return json({ error: "db_select_failed", detail: error.message }, 500);

  let due = 0, sent = 0, removed = 0, failed = 0, skipped = 0;
  const staleIds: number[] = [];
  const subCache: Record<string, Sub[]> = {};

  for (const ev of (evs ?? []) as Ev[]) {
    if (!ev.event_time || !Array.isArray(ev.reminders) || !ev.reminders.length || !ev.author_id) continue;
    const evtMs = wallMs(ev.event_date, String(ev.event_time).slice(0, 5));
    if (isNaN(evtMs)) continue;

    for (const min of ev.reminders) {
      // 전날(1440) = 전날 20:00 고정 / 그 외 = 일정시각 - N분
      const fireMs = (min === 1440)
        ? wallMs(ymd(evtMs - 86400000), "20:00")
        : evtMs - min * 60000;
      if (!(nowMs >= fireMs && nowMs <= fireMs + GRACE_MS)) continue;
      due++;

      // 원자적 중복방지: 먼저 sent_log INSERT, 성공(신규)한 것만 발송
      const { data: ins, error: insErr } = await supabase
        .from("push_sent_log")
        .upsert(
          { event_id: String(ev.id), reminder_min: min, fire_date: ev.event_date },
          { onConflict: "event_id,reminder_min,fire_date", ignoreDuplicates: true },
        )
        .select("id");
      if (insErr) { failed++; continue; }
      if (!ins || !ins.length) { skipped++; continue; } // 이미 발송됨

      // 작성자 구독 (캐시)
      let subs = subCache[ev.author_id];
      if (!subs) {
        const { data: sd } = await supabase
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", ev.author_id);
        subs = (sd ?? []) as Sub[];
        subCache[ev.author_id] = subs;
      }
      if (!subs.length) continue;

      const tm = String(ev.event_time).slice(0, 5);
      const when = (min === 0 ? "지금" : (min === 1440 ? "내일 일정" : (min + "분 후 일정")));
      // §4: 제목 + 시간만 (메모·고객정보 본문 금지)
      const message = JSON.stringify({
        title: "🔔 일정 알림",
        body: (ev.title || "일정") + " · " + tm + " (" + when + ")",
        url: "/app.html",
        tag: "dia-" + String(ev.id) + "-" + min + "-" + ev.event_date,
      });
      for (const s of subs) {
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
    }
  }
  if (staleIds.length) {
    await supabase.from("push_subscriptions").delete().in("id", staleIds);
  }
  return json({ ok: true, scanned: (evs ?? []).length, due, sent, removed, failed, skipped });
});
