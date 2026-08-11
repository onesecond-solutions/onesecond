-- 🔧 RLS 수정 — 자료실 파일(myspace_files) admin 수정·삭제 권한 추가 (공유글 수정·삭제 재발 대응)
-- ═══════════════════════════════════════════════════════════════════════════
-- 대표 재신고(2026-07-15): 지점 공유글 수정·삭제 안 됨(2026-07-10 완결분 재발).
--   진단(라이브 pg_policies 확인): scripts·team_notices·shares 는 admin 허용(정상).
--   그러나 myspace_files_scoped(FOR ALL, 파일 update/delete)에는 is_admin() 절이 없어
--   admin(대표)이 지점 공유 파일을 수정·삭제 못 함. 2026-07-10 #1216은 scripts 만 확장,
--   파일 경로가 누락됐다. scripts 의 "admin manage scripts"(ALL=is_admin) 패턴을 파일에도 이식한다.
--
-- 방식: 기존 myspace_files_scoped 정책은 건드리지 않고(회귀 0), admin 전용 정책을 additive 로 추가.
--   RLS 는 permissive OR 결합이라, 기존 스코프 정책 + admin 정책이 함께 허용된다.
-- ⚠️ 대상: onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg). is_admin() 헬퍼 라이브 실재 확인됨.

begin;

drop policy if exists myspace_files_admin_write on public.myspace_files;
create policy myspace_files_admin_write on public.myspace_files
  for all to authenticated
  using ( public.is_admin() )
  with check ( public.is_admin() );

commit;

-- DOWN / ROLLBACK: 아래 주석 해제 실행 시 admin 정책 제거(기존 스코프 정책만 남음).
-- drop policy if exists myspace_files_admin_write on public.myspace_files;
