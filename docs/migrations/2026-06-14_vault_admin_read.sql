-- ============================================================
-- 팀/지점 자료실 — 어드민 읽기 전용(사고 대응) 열람 정책
-- 작성: 2026-06-14 (총괄팀장 Code) / 신버전 pdnwgzneooyygfejrvbg (onesecond-v1-restore-0420)
-- 결재: 대표님 "지점/팀 자료실도 지점방·팀방처럼 어드민이 상황에 따라 볼 수 있게" + (전체 열람 / 읽기 전용)
--
-- 배경: 기존 vault 정책(2026-06-13_vault_shared_scope.sql)은 team/branch 읽기 조건이
--   scope_id = 내 team_id/branch_id 뿐 → 소속 없는 어드민은 0건(검수 불가).
--   공지(team_notices)는 RLS에 is_admin()이 있어 사고 대응 열람이 됨. 자료실도 동일하게 풀어준다.
--
-- 원칙:
--   · 어드민 = SELECT(읽기) 전용 정책만 신설. 기존 scoped(FOR ALL) 정책은 그대로 → 어드민 쓰기 불가.
--     (PostgreSQL 다중 permissive 정책은 OR → 어드민은 admin_read 통과로 SELECT만, 쓰기는 어느 정책도 통과 못 함)
--   · 개인(personal) 자료실은 손대지 않음 → 어드민이 남의 개인 서랍 보는 일 없음.
--   · 대상 = team/branch 스코프 행 + 그 storage 객체(미리보기 서명URL용).
--   · 전체 열람 = scope_id 무관 모든 팀/지점 행(공지 "전체 열람"과 동일 모델).
--
-- ⚠️ 실행 = 대표님/Chrome AI (SQL 게이트). 한 RUN = BEGIN~COMMIT 통째, 검증 SELECT는 별도 RUN.
-- ⚠️ 전제: public.is_admin() 함수 존재(기존 knowledge/posts/team_notices 정책에서 사용 중).
-- ============================================================

begin;

-- ---- 1. myspace_folders — 어드민 읽기 전용(team/branch 전체) ----
drop policy if exists myspace_folders_admin_read on public.myspace_folders;
create policy myspace_folders_admin_read on public.myspace_folders for select to authenticated
  using ( scope in ('team','branch') and is_admin() );

-- ---- 2. myspace_files — 어드민 읽기 전용(team/branch 전체) ----
drop policy if exists myspace_files_admin_read on public.myspace_files;
create policy myspace_files_admin_read on public.myspace_files for select to authenticated
  using ( scope in ('team','branch') and is_admin() );

-- ---- 3. storage.objects — 어드민 읽기 전용(team/branch prefix, 미리보기 서명URL) ----
-- 경로: team/{team_id}/...  branch/{branch_id}/...  (개인=auth.uid()/... 는 제외)
drop policy if exists myspace_obj_admin_read on storage.objects;
create policy myspace_obj_admin_read on storage.objects for select to authenticated
  using (
    bucket_id = 'myspace'
    and (storage.foldername(name))[1] in ('team','branch')
    and is_admin()
  );

commit;

-- ============================================================
-- 검증 SELECT (위 RUN 커밋 후 별도 RUN에서 — 트랜잭션 분리)
-- ============================================================
-- 1) 정책 신설 확인
-- select policyname, cmd from pg_policies
--   where tablename in ('myspace_folders','myspace_files') and policyname like '%admin_read%';
-- select policyname, cmd from pg_policies
--   where schemaname='storage' and tablename='objects' and policyname='myspace_obj_admin_read';
-- 2) 어드민 세션에서 team/branch 행 보이는지 (본인=어드민 로그인 상태)
-- select scope, count(*) from public.myspace_files  where scope in ('team','branch') group by scope;
-- select scope, count(*) from public.myspace_folders where scope in ('team','branch') group by scope;
