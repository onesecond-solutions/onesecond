-- OCR 정규 채용 — pg_cron 으로 ocr-batch 상시 호출 (2026-06-14, 총괄팀장 Code)
-- 🚨 실행 = 대표님/Chrome (Supabase SQL Editor). 신버전 pdnwgzneooyygfejrvbg 확인 후.
-- 🚨 선행 필수: ocr-batch Edge Function 배포 완료 + 1~2건 테스트 통과(아래 가이드).
-- 🚨 __CRON_SECRET__ = 현재 라이브 CRON_SECRET 값으로 교체(diary-push/notify_new_post와 동일 값). 채팅·커밋에 실제 값 비노출.
-- 동작: 5분마다 ocr-batch 호출 → 미처리 소식지 N건씩 OCR 적재. 미처리 0이면 작업 0(과금 0). 신규 업로드 자동 포함.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 재실행 안전: 기존 동일 작업 제거
do $$ begin perform cron.unschedule('ocr-batch-5min'); exception when others then null; end $$;

select cron.schedule('ocr-batch-5min', '*/5 * * * *', $job$
  select net.http_post(
    url     := 'https://pdnwgzneooyygfejrvbg.supabase.co/functions/v1/ocr-batch',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','__CRON_SECRET__'),
    body    := '{}'::jsonb
  );
$job$);

-- ── 검증 (별도 RUN) ──
-- 등록 확인:
--   select jobid, jobname, schedule, active from cron.job where jobname='ocr-batch-5min';
-- 최근 실행 이력(다음 5분 틱 이후 행 생김):
--   select status, return_message, start_time from cron.job_run_details
--     where jobid=(select jobid from cron.job where jobname='ocr-batch-5min') order by start_time desc limit 5;
-- 진척(미처리 줄어드는지):
--   select count(*) as remaining from public.newsletters
--     where full_text is null and source_pdf_url is not null and (text_quality is null or text_quality <> '비었음');
-- 적재 확인(본문 들어온 최신):
--   select id, title, text_quality, char_length from public.newsletters where full_text is not null order by char_length desc nulls last limit 10;

-- ── 중단 (백로그 소진 후/필요 시) ──
--   select cron.unschedule('ocr-batch-5min');
