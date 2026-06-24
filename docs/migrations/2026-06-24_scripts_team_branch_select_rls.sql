-- ============================================================
-- P0 — scripts 팀/지점 스코프 SELECT RLS 추가 (스페이스 네비 P2 토대)
-- 작성: 2026-06-24 (총괄팀장 Code) / 신버전 pdnwgzneooyygfejrvbg (onesecond-v1-restore-0420)
-- 결재: 대표님 — 팀/지점 스크립트 공유의 SELECT 격리. myspace_files(자료실)와 동일 패턴.
--
-- 배경:
--   · scripts 테이블에 scope('personal' 기본)·scope_id(text)·owner_id(text) 이미 존재 → 컬럼 DDL 불필요.
--   · 현재 scope 값 = global(59)·personal(48)뿐. team/branch 미사용 → 충돌 0.
--   · 기존 SELECT 정책 "authenticated read scripts" = is_admin() OR global OR (personal AND owner) 까지만.
--     → 팀/지점 스크립트를 만들어도 같은 팀/지점원이 못 봄. 본 패치로 team/branch SELECT 허용.
--
-- 패턴 출처(검증된 격리): myspace_files_scoped
--   personal → owner_id = auth.uid()::text
--   team     → scope_id = os_user_team_id()      (myspace_files.scope_id = uuid → 직접 비교)
--   branch   → scope_id = os_user_branch_id()
--
-- ⚠️ 타입 차이(중요): scripts.scope_id 는 TEXT 이고 os_user_team_id()/os_user_branch_id() 는 UUID 반환.
--    → text = uuid 직접 비교 불가. 함수 결과를 ::text 로 캐스팅한다. (myspace_files는 scope_id=uuid라 캐스팅 없음)
--
-- 범위: SELECT 만(공유 보기). INSERT/UPDATE with_check 강화(팀 스크립트 작성 시 scope_id=내 팀 강제)는
--    P2-b(스크립트 공유 기능)에서 별도. 현재 scripts_insert_own = owner_id 본인 검사라 임의 team_id 작성은
--    "본인만 보이고 타 팀 미노출"이라 정보 유출 위험 없음(P0 범위 밖으로 둠).
--
-- ⚠️ 실행 = 대표님/검수팀(SQL 게이트). 한 RUN = BEGIN~COMMIT. 검증/롤백은 별도 RUN.
-- 관련: app.html _snScopeCard(scope,'script') 준비중 → 본 적용 후 _spSplitShow 팀/지점 scope로 연결(P2-b).
-- ============================================================


-- ───────────────────────────────────────────────────────────
-- [RUN 1] 검증용 — 적용 후 정책 확인하고 ROLLBACK (운영 미반영)
-- ───────────────────────────────────────────────────────────
begin;

drop policy if exists "authenticated read scripts" on public.scripts;

create policy "authenticated read scripts" on public.scripts
for select to authenticated
using (
  is_admin()
  or scope = 'global'
  or (scope = 'personal' and owner_id = (auth.uid())::text)
  or (scope = 'team'   and scope_id is not null and scope_id = os_user_team_id()::text)
  or (scope = 'branch' and scope_id is not null and scope_id = os_user_branch_id()::text)
);

-- 확인 1: 정책 qual 에 team/branch + ::text 캐스팅 들어갔는지
select policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'scripts' and policyname = 'authenticated read scripts';

-- 확인 2: 기존 노출 회귀 없음 — global/personal 카운트 그대로 (RLS는 행을 줄이지 늘리지 않음)
select scope, count(*) as n from public.scripts group by scope order by n desc;

rollback;


-- ───────────────────────────────────────────────────────────
-- [RUN 2] 운영 반영 — 위 검증 통과 후에만 실행
-- ───────────────────────────────────────────────────────────
-- begin;
--
-- drop policy if exists "authenticated read scripts" on public.scripts;
--
-- create policy "authenticated read scripts" on public.scripts
-- for select to authenticated
-- using (
--   is_admin()
--   or scope = 'global'
--   or (scope = 'personal' and owner_id = (auth.uid())::text)
--   or (scope = 'team'   and scope_id is not null and scope_id = os_user_team_id()::text)
--   or (scope = 'branch' and scope_id is not null and scope_id = os_user_branch_id()::text)
-- );
--
-- commit;
