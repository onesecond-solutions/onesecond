-- 🟢 읽기전용 진단 출력 — scripts / team_notices RLS 정책 현재 상태를 RAISE NOTICE 로 CI 로그에 출력.
--   변경 없음. 접근 불가 항목은 오류를 NOTICE 로만 남김(RAISE EXCEPTION 없음).
--   목적(2026-07-15): 공유글 수정·삭제 막힘 = scripts/team_notices update·delete 정책에 admin/매니저 절이
--   실제 살아있는지, 이후 마이그레이션이 덮었는지 확인.
do $$
declare r record;
begin
  -- ── scripts 정책 ──────────────────────────────────────────────
  begin
    raise notice '=== [scripts] policies ===';
    for r in
      select policyname, cmd, permissive, roles::text as roles,
             left(coalesce(pg_get_expr(polqual, polrelid),''),400)      as using_expr,
             left(coalesce(pg_get_expr(polwithcheck, polrelid),''),300) as check_expr
        from pg_policy p join pg_class c on c.oid=p.polrelid
        join pg_policies pp on pp.policyname=p.polname and pp.tablename=c.relname
       where c.relname='scripts'
       order by p.polname
    loop
      raise notice 'SCRIPTS pol=% | cmd=% | using=% | check=%', r.policyname, r.cmd, r.using_expr, r.check_expr;
    end loop;
  exception when others then
    -- pg_policy 조인 실패 시 pg_policies 뷰로 폴백
    begin
      for r in select policyname, cmd, left(coalesce(qual,''),400) as using_expr, left(coalesce(with_check,''),300) as check_expr
                 from pg_policies where schemaname='public' and tablename='scripts' order by policyname
      loop
        raise notice 'SCRIPTS pol=% | cmd=% | using=% | check=%', r.policyname, r.cmd, r.using_expr, r.check_expr;
      end loop;
    exception when others then raise notice '[scripts] 정책 조회 불가: %', sqlerrm; end;
  end;

  -- ── team_notices 정책 ─────────────────────────────────────────
  begin
    raise notice '=== [team_notices] policies ===';
    for r in select policyname, cmd, left(coalesce(qual,''),400) as using_expr, left(coalesce(with_check,''),300) as check_expr
               from pg_policies where schemaname='public' and tablename='team_notices' order by policyname
    loop
      raise notice 'TEAMNOTICES pol=% | cmd=% | using=% | check=%', r.policyname, r.cmd, r.using_expr, r.check_expr;
    end loop;
  exception when others then raise notice '[team_notices] 정책 조회 불가: %', sqlerrm; end;

  -- ── is_admin / is_manager 헬퍼 존재 ───────────────────────────
  begin
    raise notice '=== helper functions ===';
    for r in select proname from pg_proc where proname in ('is_admin','is_manager','os_user_team_id','os_user_branch_id') order by proname
    loop raise notice 'FN %', r.proname; end loop;
  exception when others then raise notice 'helper 조회 불가: %', sqlerrm; end;

  raise notice 'DIAG DONE (읽기전용 · 변경 0)';
end $$;
