-- ============================================================================
-- 감사센터 부트스트랩 제거(down · INVOKER 모델) — 이번 부트스트랩 생성분만 정확한 이름 역순 삭제.
-- drop owned by / drop schema … cascade 미사용. newsletters 원본·RLS 무접촉. 커스텀 역할 없음.
-- ⚠️ 철회 시에만. 대표 승인 후 실행.
-- ============================================================================
begin;

-- 함수(공개) 역순
drop function if exists public.ac_nlstd_get_job(uuid);
drop function if exists public.ac_nlstd_rollback(uuid);
drop function if exists public.ac_nlstd_approve_execute(uuid);
drop function if exists public.ac_nlstd_prepare(text);

-- authenticated ops GRANT 회수(부여분만)
revoke select, insert, update on ops.ac_nlstd_jobs from authenticated;
revoke select, insert on ops.ac_nlstd_job_items from authenticated;
revoke select on ops.ac_nlstd_mapping from authenticated;
revoke usage on schema ops from authenticated;

-- 테이블(ops) 역순 — 정책은 테이블과 함께 삭제
drop table if exists ops.ac_nlstd_job_items;
drop table if exists ops.ac_nlstd_jobs;
drop table if exists ops.ac_nlstd_mapping;
drop table if exists ops.audit_install;

-- 스키마 (cascade 없이 — 잔여 객체 있으면 실패=안전)
drop schema if exists ops;

commit;
