-- 다이어리 스케줄 푸시 — pg_cron 5분 주기 (작업2 PWA 푸시, 2026-06-11)
-- 🚨 실행 = 대표님 (Supabase SQL Editor). 신버전 onesecond-v1-restore-0420 / pdnwgzneooyygfejrvbg 확인 후.
-- 🚨 선행 필수: (1) push_sent_log 테이블 생성(2026-06-11_push_sent_log.sql)
--              (2) diary-push Edge Function 배포 완료
-- 🚨 __CRON_SECRET__ = 현재 라이브 CRON_SECRET 값으로 교체(2026-06-04 로테이션된 값).
--    notify_new_post 함수에 들어있는 값과 동일. 채팅·커밋에 실제 값 비노출.
-- 정합: 발송 방식 A(pg_cron), 전날 알람=전날 20:00(전날 처리 = Edge Function 내부). 대표 결재 2026-06-11.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 재실행 안전: 기존 동일 작업 제거(없으면 무시)
do $$ begin
  perform cron.unschedule('diary-push-5min');
exception when others then null; end $$;

-- 5분마다 diary-push 호출 (도달 reminders 발송은 Edge Function이 판정·중복방지)
select cron.schedule('diary-push-5min', '*/5 * * * *', $job$
  select net.http_post(
    url     := 'https://pdnwgzneooyygfejrvbg.supabase.co/functions/v1/diary-push',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','__CRON_SECRET__'),
    body    := '{}'::jsonb
  );
$job$);

-- ── 검증 (별도 RUN 권장) ──
-- select jobid, jobname, schedule, active from cron.job where jobname='diary-push-5min';
-- 최근 실행 이력:
-- select status, return_message, start_time from cron.job_run_details
--   where jobid=(select jobid from cron.job where jobname='diary-push-5min')
--   order by start_time desc limit 5;
-- 중단(필요 시): select cron.unschedule('diary-push-5min');
