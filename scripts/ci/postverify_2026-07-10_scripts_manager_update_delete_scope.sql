-- CI 사후 검증 (🟢 읽기전용) — scripts 매니저 수정·삭제 확장 RLS 마이그레이션
--   (db/migrations/2026-07-10_scripts_manager_update_delete_scope.sql) 적용 직후 실행.
--
-- 검증 목표:
--   1) scripts_update_own — cmd=UPDATE, roles에 authenticated 포함, qual·with_check 둘 다 is_manager 분기 포함.
--   2) scripts_delete_own — cmd=DELETE, roles에 authenticated 포함, qual 에 is_manager 분기 포함.
--   3) 소속 격리 근거 잔존 확인 — 두 정책의 qual 에 os_user_team_id / os_user_branch_id 캐스팅 조건 포함
--      (매니저 분기가 scope_id 소속 일치와 함께 걸려 타 팀/지점 격리가 유지되는지).
--
-- 방식: pg_policies 조회(소유자 관점, RLS 무관). 조건 불충족 시 RAISE EXCEPTION
--   → psql(ON_ERROR_STOP=1) 종료코드!=0 → apply_and_verify.sh 가 FAIL 처리.
do $$
declare
  upd_qual   text;
  upd_check  text;
  del_qual   text;
  upd_roles  boolean;
  del_roles  boolean;
begin
  -- ── UPDATE 정책 존재 + 정의 로드 ─────────────────────────────────────────
  select p.qual, p.with_check, ('authenticated' = any(p.roles))
    into upd_qual, upd_check, upd_roles
    from pg_policies p
   where p.schemaname='public' and p.tablename='scripts'
     and p.policyname='scripts_update_own' and p.cmd='UPDATE';
  if not found then
    raise exception 'FAIL scripts_update_own (UPDATE) 정책 미적재.';
  end if;

  -- ── DELETE 정책 존재 + 정의 로드 ─────────────────────────────────────────
  select p.qual, ('authenticated' = any(p.roles))
    into del_qual, del_roles
    from pg_policies p
   where p.schemaname='public' and p.tablename='scripts'
     and p.policyname='scripts_delete_own' and p.cmd='DELETE';
  if not found then
    raise exception 'FAIL scripts_delete_own (DELETE) 정책 미적재.';
  end if;

  -- ── 대상 role = authenticated ───────────────────────────────────────────
  if not upd_roles then raise exception 'FAIL scripts_update_own roles 에 authenticated 없음.'; end if;
  if not del_roles then raise exception 'FAIL scripts_delete_own roles 에 authenticated 없음.'; end if;

  -- ── 핵심: is_manager 분기 포함 여부 ─────────────────────────────────────
  if upd_qual is null or upd_qual not ilike '%is_manager%' then
    raise exception 'FAIL scripts_update_own USING 에 is_manager 분기 없음(매니저 수정 확장 미적용). qual=%', upd_qual;
  end if;
  if upd_check is null or upd_check not ilike '%is_manager%' then
    raise exception 'FAIL scripts_update_own WITH CHECK 에 is_manager 분기 없음(매니저 쓰기 허용 미적용). with_check=%', upd_check;
  end if;
  if del_qual is null or del_qual not ilike '%is_manager%' then
    raise exception 'FAIL scripts_delete_own USING 에 is_manager 분기 없음(매니저 삭제 확장 미적용). qual=%', del_qual;
  end if;

  -- ── 소속 격리 근거 잔존: 매니저 분기가 team/branch 소속 함수와 함께 걸렸는가 ──
  --   (헬퍼명이 qual 에 존재해야 타 팀/지점 격리가 유지됨을 보증)
  if upd_qual not ilike '%os_user_team_id%' or upd_qual not ilike '%os_user_branch_id%' then
    raise exception 'FAIL scripts_update_own USING 에 소속 격리(os_user_team_id/os_user_branch_id) 조건 누락. qual=%', upd_qual;
  end if;
  if del_qual not ilike '%os_user_team_id%' or del_qual not ilike '%os_user_branch_id%' then
    raise exception 'FAIL scripts_delete_own USING 에 소속 격리(os_user_team_id/os_user_branch_id) 조건 누락. qual=%', del_qual;
  end if;

  raise notice 'POSTVERIFY PASS: scripts_update_own(UPDATE)·scripts_delete_own(DELETE) 에 is_manager 매니저 분기 + 소속 격리(os_user_team_id/os_user_branch_id) 정합. authenticated 대상.';
end $$;
