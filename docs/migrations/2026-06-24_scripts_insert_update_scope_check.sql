-- ============================================================
-- P2-b-1 — scripts INSERT/UPDATE with_check 스코프 강화 (팀/지점 스크립트 보안 토대)
-- 작성: 2026-06-24 (총괄팀장 Code) / 신버전 pdnwgzneooyygfejrvbg (onesecond-v1-restore-0420)
-- 결재: 대표님 — P0(SELECT RLS) 검수 PASS 후속. 작성 단계 격리 강제.
--
-- 배경(허점):
--   · 기존 scripts_insert_own with_check = owner_id = auth.uid()::text 뿐(scope 무검증).
--   · → 일반 사용자가 scope='global' 로 INSERT 시 전사 노출 / scope='team' 에 임의 scope_id 주입 가능.
--
-- 진단(2026-06-24):
--   · global 59건 전부 owner_id IS NULL(스크립트 뱅크, 소유자 없음).
--   · → 일반 사용자는 owner_id=auth.uid() 조건을 못 넘어 global INSERT/UPDATE 원천 불가.
--   · global 관리는 기존 "admin manage scripts"(ALL, is_admin()) 정책으로 admin만 → 회귀 0.
--
-- 강화 규칙(myspace_files_scoped 패턴, scope_id=text 라 ::text 캐스팅):
--   owner_id = auth.uid()::text
--   AND ( is_admin()                                    -- admin 은 admin manage 로도 처리되나 명시
--         OR scope = 'personal'
--         OR (scope='team'   AND scope_id = os_user_team_id()::text)
--         OR (scope='branch' AND scope_id = os_user_branch_id()::text) )
--   → 일반 사용자: personal(본인) / team·branch(본인+소속 일치)만. global 차단.
--
-- ⚠️ 실행 = 대표님/검수팀(SQL 게이트). 한 RUN = BEGIN~COMMIT. 검증/롤백은 별도 RUN.
-- 관련: P0 SELECT RLS(2026-06-24_scripts_team_branch_select_rls.sql) PASS 후속. P2-b-2(스크립트 카드 표시·작성).
-- ============================================================


-- ───────────────────────────────────────────────────────────
-- [RUN 1] 검증용 — 적용 후 정책 확인하고 ROLLBACK (운영 미반영)
-- ───────────────────────────────────────────────────────────
begin;

drop policy if exists "scripts_insert_own" on public.scripts;
create policy "scripts_insert_own" on public.scripts
for insert to authenticated
with check (
  owner_id = (auth.uid())::text
  and (
    is_admin()
    or scope = 'personal'
    or (scope = 'team'   and scope_id = os_user_team_id()::text)
    or (scope = 'branch' and scope_id = os_user_branch_id()::text)
  )
);

drop policy if exists "scripts_update_own" on public.scripts;
create policy "scripts_update_own" on public.scripts
for update to authenticated
using ( (auth.uid())::text = owner_id )
with check (
  owner_id = (auth.uid())::text
  and (
    is_admin()
    or scope = 'personal'
    or (scope = 'team'   and scope_id = os_user_team_id()::text)
    or (scope = 'branch' and scope_id = os_user_branch_id()::text)
  )
);

-- 확인: 두 정책 with_check 에 scope 분기 + ::text 캐스팅 들어갔는지
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'scripts'
  and policyname in ('scripts_insert_own','scripts_update_own')
order by policyname;

rollback;


-- ───────────────────────────────────────────────────────────
-- [RUN 2] 운영 반영 — 위 검증 통과 후에만 실행 (주석 해제)
-- ───────────────────────────────────────────────────────────
-- begin;
--
-- drop policy if exists "scripts_insert_own" on public.scripts;
-- create policy "scripts_insert_own" on public.scripts
-- for insert to authenticated
-- with check (
--   owner_id = (auth.uid())::text
--   and ( is_admin()
--         or scope = 'personal'
--         or (scope = 'team'   and scope_id = os_user_team_id()::text)
--         or (scope = 'branch' and scope_id = os_user_branch_id()::text) )
-- );
--
-- drop policy if exists "scripts_update_own" on public.scripts;
-- create policy "scripts_update_own" on public.scripts
-- for update to authenticated
-- using ( (auth.uid())::text = owner_id )
-- with check (
--   owner_id = (auth.uid())::text
--   and ( is_admin()
--         or scope = 'personal'
--         or (scope = 'team'   and scope_id = os_user_team_id()::text)
--         or (scope = 'branch' and scope_id = os_user_branch_id()::text) )
-- );
--
-- commit;
