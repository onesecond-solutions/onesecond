-- ============================================================
-- scripts 팀/지점 공유 글 — 소속 매니저(실장·지점장)도 수정·삭제 허용 (2026-07-10)
-- 작성: 총괄팀장(Code) / 신버전 pdnwgzneooyygfejrvbg (onesecond-v1-restore-0420)
-- 🟠 데이터 변경(정책 DROP/CREATE = 스키마 변경). 실행 = 대표님/검수팀(SQL 게이트). 본 파일 자체는 DB 미반영.
--
-- 목적:
--   팀/지점에 공유된 scripts 행을 지금은 "공유한 본인(owner_id)"만 수정·삭제 가능.
--   → 같은 팀/지점의 매니저(실장·지점장)도 수정·삭제할 수 있게 UPDATE/DELETE RLS 확장.
--
-- 보완/대체 대상(기존 정책):
--   · scripts_update_own — docs/architecture/migrations/2026-05-25_scripts_update_own_policy.sql
--       + docs/migrations/2026-06-24_scripts_insert_update_scope_check.sql 에서 with_check 스코프 강화됨.
--       현재 정의: USING ((auth.uid())::text = owner_id)
--                  WITH CHECK ( owner_id=(auth.uid())::text AND ( is_admin() OR personal
--                               OR (team AND scope_id=os_user_team_id()::text)
--                               OR (branch AND scope_id=os_user_branch_id()::text) ) )
--   · scripts_delete_own — docs/migrations/2026-06-09_scripts_delete_own_rls.sql
--       현재 정의: USING ((auth.uid())::text = owner_id)
--   → 본 파일이 위 두 정책을 "본인 OR 소속 매니저" 조건으로 재정의(이름 유지). admin 전용 "admin manage scripts"(ALL, is_admin) 정책은 건드리지 않음.
--
-- 사용 헬퍼(실측 확인 — 지어낸 함수명 없음):
--   · os_user_team_id()   returns uuid  — 정의: docs/migrations/2026-06-13_vault_shared_scope.sql:27  (public, security definer stable)
--   · os_user_branch_id() returns uuid  — 정의: docs/migrations/2026-06-13_vault_shared_scope.sql:30
--   · is_manager()        returns bool  — 소속 무관 전역 role 판정. 집합 = admin, ga_branch_manager, ga_manager,
--                                          insurer_branch_manager, insurer_manager.
--       근거: app.html:15693 "서버 is_manager()와 동일 집합" _isMgrShare 배열 + 아카이브 정의
--             (docs/archive/2026-05/db/phase1_step_a_capture.md:261).
--       ⚠️ is_manager() 는 소속(팀/지점) 정보를 안 봄 → 반드시 scope_id 소속 일치 조건과 함께 걸어
--          타 팀/지점 글은 못 건드리게 격리한다(권한 격리 절대 원칙). 아래 로직 참조.
--
-- 타입 주의: scripts.scope_id 는 TEXT, os_user_*_id() 는 UUID 반환 → 함수 결과를 ::text 캐스팅해 비교
--            (SELECT 선례 docs/migrations/2026-06-24_scripts_team_branch_select_rls.sql 정합).
--
-- 격리 근거(요약):
--   · 매니저 분기는 scope_id 를 "쓰는 사람 본인의 team/branch"(os_user_*_id())로 고정 → 다른 팀/지점 글 접근·이동 불가.
--   · personal 스크립트에는 매니저 분기가 없음(scope='team'/'branch' 만) → 남의 개인 스크립트는 매니저도 못 건드림.
--   · UPDATE WITH CHECK 도 동일 소속 고정 → 매니저가 수정 후 scope_id 를 타 소속으로 옮기지 못함.
--   · ⚠️ 잔여 엣지(문서화): 매니저가 owner_id=본인 + scope='personal' 로 바꾸면 owner 분기 with_check 로 통과 가능
--        = 팀 공유 글을 "본인 개인 스크립트로 회수". 타 소속 이동은 아니며(자기 관할 내) 위험 낮음. 완전 차단은
--        restrictive 정책이 필요해 본 범위 밖. 핵심 격리(타 팀/지점 불가)는 보장됨.
--
-- ⚠️ 실행 = 대표님/검수팀. 한 RUN = BEGIN~COMMIT. 검증/롤백은 별도 RUN. 순수 정책 DDL(데이터 무변경).
-- ============================================================


-- ───────────────────────────────────────────────────────────
-- [사전 점검] 🟢 읽기 전용 — 헬퍼 함수가 실제로 존재하는지 먼저 확인(없으면 RUN 진행 금지)
-- ───────────────────────────────────────────────────────────
-- select proname, pg_get_function_result(oid) as returns
-- from pg_proc
-- where pronamespace = (select oid from pg_namespace where nspname='public')
--   and proname in ('is_manager','os_user_team_id','os_user_branch_id','is_admin')
-- order by proname;
--   기대: 4행. is_manager=boolean, os_user_team_id/os_user_branch_id=uuid, is_admin=boolean.
--   ⚠️ is_manager 가 0행이면(미배포) 아래 RUN 중단하고 총괄팀장에게 보고. (아카이브에만 정의가 남아 배포 여부 재확인 필요)


-- ───────────────────────────────────────────────────────────
-- [RUN 1] 검증용 — 적용 후 정책 확인하고 ROLLBACK (운영 미반영)
-- ───────────────────────────────────────────────────────────
begin;

-- UPDATE: 본인 OR 소속 매니저(팀/지점 일치) OR admin
drop policy if exists "scripts_update_own" on public.scripts;
create policy "scripts_update_own" on public.scripts
for update to authenticated
using (
  (auth.uid())::text = owner_id
  or is_admin()
  or (
    is_manager()
    and (
      (scope = 'team'   and scope_id is not null and scope_id = os_user_team_id()::text)
      or (scope = 'branch' and scope_id is not null and scope_id = os_user_branch_id()::text)
    )
  )
)
with check (
  -- 소유자 자기 글 쓰기(기존 스코프 강화 규칙 유지)
  (
    owner_id = (auth.uid())::text
    and (
      is_admin()
      or scope = 'personal'
      or (scope = 'team'   and scope_id = os_user_team_id()::text)
      or (scope = 'branch' and scope_id = os_user_branch_id()::text)
    )
  )
  -- 소속 매니저 쓰기: 결과 행이 본인 team/branch 안에 머물러야 함(타 소속 이동 차단)
  or (
    is_manager()
    and (
      (scope = 'team'   and scope_id = os_user_team_id()::text)
      or (scope = 'branch' and scope_id = os_user_branch_id()::text)
    )
  )
  or is_admin()
);

-- DELETE: 본인 OR 소속 매니저(팀/지점 일치) OR admin
drop policy if exists "scripts_delete_own" on public.scripts;
create policy "scripts_delete_own" on public.scripts
for delete to authenticated
using (
  (auth.uid())::text = owner_id
  or is_admin()
  or (
    is_manager()
    and (
      (scope = 'team'   and scope_id is not null and scope_id = os_user_team_id()::text)
      or (scope = 'branch' and scope_id is not null and scope_id = os_user_branch_id()::text)
    )
  )
);

-- 확인: 두 정책 qual/with_check 에 is_manager + scope_id ::text 분기 들어갔는지
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'scripts'
  and policyname in ('scripts_update_own','scripts_delete_own')
order by policyname;

rollback;


-- ───────────────────────────────────────────────────────────
-- [RUN 2] 운영 반영 — 위 사전점검(4행) + RUN 1 검증 통과 후에만 실행(주석 해제)
-- ───────────────────────────────────────────────────────────
-- begin;
--
-- drop policy if exists "scripts_update_own" on public.scripts;
-- create policy "scripts_update_own" on public.scripts
-- for update to authenticated
-- using (
--   (auth.uid())::text = owner_id
--   or is_admin()
--   or ( is_manager() and (
--          (scope='team'   and scope_id is not null and scope_id = os_user_team_id()::text)
--       or (scope='branch' and scope_id is not null and scope_id = os_user_branch_id()::text) ) )
-- )
-- with check (
--   ( owner_id = (auth.uid())::text
--     and ( is_admin() or scope='personal'
--           or (scope='team'   and scope_id = os_user_team_id()::text)
--           or (scope='branch' and scope_id = os_user_branch_id()::text) ) )
--   or ( is_manager() and (
--          (scope='team'   and scope_id = os_user_team_id()::text)
--       or (scope='branch' and scope_id = os_user_branch_id()::text) ) )
--   or is_admin()
-- );
--
-- drop policy if exists "scripts_delete_own" on public.scripts;
-- create policy "scripts_delete_own" on public.scripts
-- for delete to authenticated
-- using (
--   (auth.uid())::text = owner_id
--   or is_admin()
--   or ( is_manager() and (
--          (scope='team'   and scope_id is not null and scope_id = os_user_team_id()::text)
--       or (scope='branch' and scope_id is not null and scope_id = os_user_branch_id()::text) ) )
-- );
--
-- commit;


-- ───────────────────────────────────────────────────────────
-- [PASS/FAIL 확인] 🟢 읽기 전용 — RUN 2 (운영 반영) 후 실행
-- ───────────────────────────────────────────────────────────
-- select policyname, cmd,
--        (qual        ilike '%is_manager%') as has_mgr_using,
--        (with_check   ilike '%is_manager%') as has_mgr_check
-- from pg_policies
-- where schemaname='public' and tablename='scripts'
--   and policyname in ('scripts_update_own','scripts_delete_own')
-- order by cmd, policyname;
--   PASS 기대:
--     scripts_delete_own | DELETE | has_mgr_using=t | has_mgr_check=(null)
--     scripts_update_own | UPDATE | has_mgr_using=t | has_mgr_check=t
--   FAIL = 위 행이 안 나오거나 has_mgr_* = f → RUN 2 미반영/오류. 재확인.
