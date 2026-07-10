-- ═══════════════════════════════════════════════════════════════════════════
-- 🟠 스키마 변경(RLS 정책 DROP/CREATE) — 팀/지점 공유 업무노트(scripts)
--    수정·삭제 권한을 "공유한 본인 + 소속 매니저(실장·지점장) + admin"으로 확장
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️⚠️⚠️ 초안(DRAFT) — 대표 승인 전 실행 금지. 이 파일은 검토용이며 아직 적용되지 않았다. ⚠️⚠️⚠️
--   실제 반영 = production-db Environment 대표 1클릭 승인(workflow_dispatch) 자리. 본 PR 머지만으로 DB 변경 없음.
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
--    구버전(qursjteiovcylqiepmlo)은 2026-06-19 삭제됨 — 절대 참조 금지.
--
-- 목적:
--   팀/지점에 공유된 scripts 행은 지금 "공유한 본인(owner_id)"만 수정·삭제 가능.
--   → 같은 팀/지점의 매니저(실장·지점장)도 수정·삭제할 수 있게 UPDATE/DELETE RLS 확장.
--   admin 전용 "admin manage scripts"(ALL, is_admin) 정책은 건드리지 않는다(이름 유지, 로직만 확장).
--
-- 재정의 대상(기존 정책 → 본 파일이 "본인 OR 소속 매니저 OR admin"으로 재정의):
--   · scripts_update_own — 현재: USING ((auth.uid())::text = owner_id)
--        WITH CHECK ( owner_id=(auth.uid())::text AND ( is_admin() OR personal
--                     OR (team AND scope_id=os_user_team_id()::text)
--                     OR (branch AND scope_id=os_user_branch_id()::text) ) )
--   · scripts_delete_own — 현재: USING ((auth.uid())::text = owner_id)
--
-- 사용 헬퍼(라이브 배포 확인됨 · 지어낸 함수명 없음):
--   · is_manager()        returns bool  — 소속 무관 전역 role 판정(admin, ga_branch_manager, ga_manager,
--                                          insurer_branch_manager, insurer_manager).
--   · os_user_team_id()   returns uuid  — 쓰는 사람 본인의 team_id.
--   · os_user_branch_id() returns uuid  — 쓰는 사람 본인의 branch_id.
--   · is_admin()          returns bool  — 어드민 판정.
--   ⚠️ is_manager() 는 소속(팀/지점)을 안 봄 → 반드시 scope_id 소속 일치 조건과 함께 걸어
--      타 팀/지점 글은 못 건드리게 격리한다(권한 격리 절대 원칙).
--
-- 타입 주의: scripts.scope_id 는 TEXT, os_user_*_id() 는 UUID 반환 → 함수 결과를 ::text 캐스팅해 비교.
--
-- 격리 근거(요약):
--   · 매니저 분기는 scope_id 를 "쓰는 사람 본인의 team/branch"(os_user_*_id())로 고정 → 타 팀/지점 접근·이동 불가.
--   · personal 스크립트에는 매니저 분기가 없음 → 남의 개인 스크립트는 매니저도 못 건드림.
--   · UPDATE WITH CHECK 도 동일 소속 고정 → 매니저가 수정 후 scope_id 를 타 소속으로 옮기지 못함.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── UPDATE: 본인 OR 소속 매니저(팀/지점 일치) OR admin ────────────────────────
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

-- ── DELETE: 본인 OR 소속 매니저(팀/지점 일치) OR admin ────────────────────────
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

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK (되돌리기) — 두 정책을 이전 정의(본인 전용)로 복귀시킨다.
--   아래 블록의 주석을 해제해 실행하면 매니저 확장이 제거되고 owner_id 전용 정책으로 돌아간다.
--   scope_id ::text / os_user_*_id() 캐스팅 및 with_check 스코프 강화 규칙은 이전과 동일하게 유지한다.
-- ═══════════════════════════════════════════════════════════════════════════
-- begin;
--   drop policy if exists "scripts_update_own" on public.scripts;
--   create policy "scripts_update_own" on public.scripts
--   for update to authenticated
--   using ( (auth.uid())::text = owner_id )
--   with check (
--     owner_id = (auth.uid())::text
--     and (
--       is_admin()
--       or scope = 'personal'
--       or (scope = 'team'   and scope_id = os_user_team_id()::text)
--       or (scope = 'branch' and scope_id = os_user_branch_id()::text)
--     )
--   );
--
--   drop policy if exists "scripts_delete_own" on public.scripts;
--   create policy "scripts_delete_own" on public.scripts
--   for delete to authenticated
--   using ( (auth.uid())::text = owner_id );
-- commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- 검증(🟢 읽기전용) — 적용 후 실행. is_manager 분기가 두 정책에 들어갔는지 확인.
--   (동반 사후검증: scripts/ci/postverify_2026-07-10_scripts_manager_update_delete_scope.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- select policyname, cmd,
--        (qual       ilike '%is_manager%') as has_mgr_using,
--        (with_check  ilike '%is_manager%') as has_mgr_check
--   from pg_policies
--  where schemaname='public' and tablename='scripts'
--    and policyname in ('scripts_update_own','scripts_delete_own')
--  order by cmd, policyname;
--   PASS 기대:
--     scripts_delete_own | DELETE | has_mgr_using=t | has_mgr_check=(null)
--     scripts_update_own | UPDATE | has_mgr_using=t | has_mgr_check=t
