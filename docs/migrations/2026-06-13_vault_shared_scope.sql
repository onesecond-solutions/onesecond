-- ============================================================
-- 팀/지점 공유 자료실 — myspace 스코프 확장
-- 작성: 2026-06-13 (총괄팀장 Code) / 신버전 pdnwgzneooyygfejrvbg (onesecond-v1-restore-0420)
-- 결재: 대표님 "스코프 컬럼 추가" 방식 채택 (단일 테이블·단일 컴포넌트 재사용)
--
-- 개인(personal) = 기존 그대로(owner_id 격리)
-- 팀(team)   = scope='team'   AND scope_id = 내 team_id   → 같은 팀원 공유
-- 지점(branch)= scope='branch' AND scope_id = 내 branch_id → 같은 지점원 공유
--
-- ⚠️ 이번 단계 = 멤버 "읽기 + 올리기" 공유까지.
--    삭제권(작성자 + 그룹 최고위자=지점장/실장)은 권한 결재 후 별 트랙(space_permission_model_v1).
-- ⚠️ 실행 = 대표님/Chrome AI (SQL 게이트). 한 RUN = STEP1~4 통째(BEGIN~COMMIT), 검증 SELECT는 별도 RUN.
-- 매핑 근거: users.id = auth.uid() (db_schema.md 검증), owner_id = (auth.uid())::text.
-- ============================================================

begin;

-- ---- STEP 1. 스코프 컬럼 (기존 행은 전부 default 'personal' → 개인 자료실 무영향) ----
alter table public.myspace_folders add column if not exists scope    text not null default 'personal';
alter table public.myspace_folders add column if not exists scope_id uuid;
alter table public.myspace_files   add column if not exists scope    text not null default 'personal';
alter table public.myspace_files   add column if not exists scope_id uuid;
create index if not exists idx_myspace_folders_scope on public.myspace_folders(scope, scope_id);
create index if not exists idx_myspace_files_scope   on public.myspace_files(scope, scope_id);

-- ---- STEP 2. 소속 헬퍼 (SECURITY DEFINER — RLS 자기참조 회피, rls_self_reference_avoidance 정합) ----
create or replace function public.os_user_team_id() returns uuid
  language sql security definer stable set search_path = public as
$$ select team_id from public.users where id = auth.uid() limit 1 $$;
create or replace function public.os_user_branch_id() returns uuid
  language sql security definer stable set search_path = public as
$$ select branch_id from public.users where id = auth.uid() limit 1 $$;
revoke all on function public.os_user_team_id()   from public;
revoke all on function public.os_user_branch_id() from public;
grant execute on function public.os_user_team_id()   to authenticated;
grant execute on function public.os_user_branch_id() to authenticated;

-- ---- STEP 3. 테이블 RLS (개인=owner / 팀=내 team / 지점=내 branch) ----
drop policy if exists myspace_folders_own    on public.myspace_folders;
drop policy if exists myspace_folders_scoped on public.myspace_folders;
create policy myspace_folders_scoped on public.myspace_folders for all
  using (
       (scope = 'personal' and (auth.uid())::text = owner_id)
    or (scope = 'team'     and scope_id is not null and scope_id = public.os_user_team_id())
    or (scope = 'branch'   and scope_id is not null and scope_id = public.os_user_branch_id())
  )
  with check (
       (scope = 'personal' and (auth.uid())::text = owner_id)
    or (scope = 'team'     and scope_id is not null and scope_id = public.os_user_team_id())
    or (scope = 'branch'   and scope_id is not null and scope_id = public.os_user_branch_id())
  );

drop policy if exists myspace_files_own    on public.myspace_files;
drop policy if exists myspace_files_scoped on public.myspace_files;
create policy myspace_files_scoped on public.myspace_files for all
  using (
       (scope = 'personal' and (auth.uid())::text = owner_id)
    or (scope = 'team'     and scope_id is not null and scope_id = public.os_user_team_id())
    or (scope = 'branch'   and scope_id is not null and scope_id = public.os_user_branch_id())
  )
  with check (
       (scope = 'personal' and (auth.uid())::text = owner_id)
    or (scope = 'team'     and scope_id is not null and scope_id = public.os_user_team_id())
    or (scope = 'branch'   and scope_id is not null and scope_id = public.os_user_branch_id())
  );

-- ---- STEP 4. Storage 정책 — 경로 prefix로 스코프 격리 ----
-- personal: {owner_id}/...      team: team/{team_id}/...     branch: branch/{branch_id}/...
-- storage.foldername(name)[1]=첫 세그먼트, [2]=두번째. (버킷 접두 'myspace/'는 name에 미포함)
drop policy if exists myspace_obj_own    on storage.objects;
drop policy if exists myspace_obj_scoped on storage.objects;
create policy myspace_obj_scoped on storage.objects for all
  using (
    bucket_id = 'myspace' and (
         (storage.foldername(name))[1] = (auth.uid())::text
      or ((storage.foldername(name))[1] = 'team'   and (storage.foldername(name))[2] = public.os_user_team_id()::text)
      or ((storage.foldername(name))[1] = 'branch' and (storage.foldername(name))[2] = public.os_user_branch_id()::text)
    )
  )
  with check (
    bucket_id = 'myspace' and (
         (storage.foldername(name))[1] = (auth.uid())::text
      or ((storage.foldername(name))[1] = 'team'   and (storage.foldername(name))[2] = public.os_user_team_id()::text)
      or ((storage.foldername(name))[1] = 'branch' and (storage.foldername(name))[2] = public.os_user_branch_id()::text)
    )
  );

commit;

-- ============================================================
-- 검증 SELECT (위 RUN 커밋 후 별도 RUN에서 — 트랜잭션 분리)
-- ============================================================
-- 1) 컬럼 추가 확인
-- select column_name from information_schema.columns
--   where table_schema='public' and table_name='myspace_files' and column_name in ('scope','scope_id');
-- 2) 헬퍼 동작 (본인 로그인 세션에서)
-- select public.os_user_team_id() as my_team, public.os_user_branch_id() as my_branch;
-- 3) 정책 존재 확인
-- select policyname from pg_policies where tablename in ('myspace_folders','myspace_files');
-- select policyname from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'myspace%';
