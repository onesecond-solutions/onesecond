-- 🟢 읽기전용 진단 — Supabase Cron/푸시 트리거 상태 확인 (변경·발송 0)
-- ═══════════════════════════════════════════════════════════════════════════
-- 대표 지시(2026-07-14): 캘린더 알림 미발송 원인 = diary-push cron 이 꺼져 있어서일 가능성.
--   anon REST 로는 cron 스키마를 못 읽으므로, 이 CI 채널로 상태만 읽어 로그로 출력한다.
--
-- ⚠️ 이 마이그레이션은 no-op 다. 어떤 DML/DDL/발송/스케줄 변경도 하지 않는다.
--    실제 상태는 동반 postverify(scripts/ci/postverify_2026-07-14_diag_cron_status_readonly.sql)가
--    cron.job / cron.job_run_details / 푸시 트리거를 RAISE NOTICE 로 CI 로그에 출력한다(읽기전용).
--
-- ⚠️ 대상 프로젝트(유일 진실): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
begin;
select 1;  -- no-op (읽기전용 진단이라 변경할 것 없음)
commit;

-- DOWN / ROLLBACK: 되돌릴 변경 없음(no-op).
