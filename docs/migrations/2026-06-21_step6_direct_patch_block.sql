-- 6단계: knowledge_entries status 직접 변경 차단 (권한 제거 + 가드 트리거 활성화)
-- 신버전 pdnwgzneooyygfejrvbg. ★실행은 대표님 결재 후 (검수팀 묶음).
--
-- 선행 충족(2026-06-21): 검수큐 프론트 RPC 완전 전환(#870) + status 직접 UPDATE 코드 경로 0건 확인
--   (grep: knowledge_entries 직접 PATCH/update = 프론트·Edge 0건. status 변경=RPC만).
-- 방어 2겹: 1차=authenticated/anon UPDATE 권한 제거 / 2차(최종)=kpe_guard_status_change 트리거.
-- 영향: review_knowledge_entry·record_mined_entry는 SECURITY DEFINER(소유자 postgres)라 무영향.

-- ════════════════════════════════════════════════════════════════
-- STEP 0 : 선행 검증 (읽기)
-- ════════════════════════════════════════════════════════════════
-- select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema='public' and table_name='knowledge_entries' and privilege_type='UPDATE';  -- anon/authenticated 가 제거 대상
-- select proname from pg_proc where proname='kpe_guard_status_change' and pronamespace='public'::regnamespace;  -- 1건(이미 정의됨)

-- ════════════════════════════════════════════════════════════════
-- STEP 1 : 직접 UPDATE 권한 제거 (1차 방어)
--   RPC(SECURITY DEFINER)는 영향 없음. 검수큐 승인/보류/폐기는 review_knowledge_entry RPC 경유라 정상.
-- ════════════════════════════════════════════════════════════════
revoke update on public.knowledge_entries from anon;
revoke update on public.knowledge_entries from authenticated;

-- ════════════════════════════════════════════════════════════════
-- STEP 2 : 가드 트리거 활성화 (2차·최종 방어)
--   kpe_guard_status_change 함수는 2026-06-21_knowledge_pipeline_events.sql STEP 3 에서 이미 생성됨.
--   허용 = (app.kpe_via_rpc='on') AND (current_user = review_knowledge_entry 소유자). 그 외 status 변경 차단.
-- ════════════════════════════════════════════════════════════════
drop trigger if exists trg_kpe_guard_status on public.knowledge_entries;
create trigger trg_kpe_guard_status before update on public.knowledge_entries
  for each row execute function public.kpe_guard_status_change();

-- ════════════════════════════════════════════════════════════════
-- STEP 3 : 검증 (읽기)
-- ════════════════════════════════════════════════════════════════
-- select tgname, tgenabled from pg_trigger where tgrelid='public.knowledge_entries'::regclass and tgname='trg_kpe_guard_status';  -- 1건, O(enabled)
-- select grantee from information_schema.role_table_grants
--   where table_schema='public' and table_name='knowledge_entries' and privilege_type='UPDATE';  -- anon/authenticated 없어야
