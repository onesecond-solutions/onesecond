-- CI 사후 진단 (🟢 읽기전용, 데이터·스키마 변경 0) — 업무노트 목록 쿼리 RLS 비용
--   (db/migrations/2026-07-27_diag_myspace_rls_explain.sql no-op 동반).
--
-- 출력(RAISE NOTICE, CI 로그 캡처):
--   [A] scripts/library RLS 정책(roles·qual·with_check).
--   [B] authenticated 롤 + 임태성 JWT 로 EXPLAIN(ANALYZE,BUFFERS) — RLS 적용 실제 플랜/시간.
--   [C] 대조: 현재 롤(RLS 우회) EXPLAIN — 새 인덱스 사용 여부.
--   각 측정은 예외 가드 → 실패해도 다른 측정 계속.
do $$
declare
  r record;
  uid constant text := '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';  -- 임태성 실장(실측 대상)
  scr_sql constant text := 'select id,title,keywords,created_at,sort_order from public.scripts where owner_id='''||uid||''' and is_active = true order by created_at desc limit 50';
  lib_sql constant text := 'select id,title,description,memo_text,keywords,created_at,sort_order from public.library where owner_id='''||uid||''' order by created_at desc limit 50';
begin
  -- ── [A] RLS 정책 덤프 ─────────────────────────────────────────────
  raise notice '════ [A] RLS 정책 (scripts/library) ════';
  for r in
    select tablename, policyname, cmd, roles::text as roles, coalesce(qual,'(none)') as qual, coalesce(with_check,'(none)') as wchk
      from pg_policies
     where schemaname='public' and tablename in ('scripts','library')
     order by tablename, cmd, policyname
  loop
    raise notice '  %.% [%] roles=% qual=% check=%', r.tablename, r.policyname, r.cmd, r.roles, r.qual, r.wchk;
  end loop;

  -- ── [B] RLS 적용 EXPLAIN ANALYZE (authenticated + 임태성 JWT) ──────
  raise notice '════ [B] RLS 적용 EXPLAIN ANALYZE ════';
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role','authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', uid, true);
    execute 'set local role authenticated';
    raise notice '── scripts (RLS 적용) ──';
    for r in execute 'explain (analyze, buffers, timing) '||scr_sql loop raise notice '  %', r."QUERY PLAN"; end loop;
    raise notice '── library (RLS 적용) ──';
    for r in execute 'explain (analyze, buffers, timing) '||lib_sql loop raise notice '  %', r."QUERY PLAN"; end loop;
    execute 'reset role';
  exception when others then
    begin execute 'reset role'; exception when others then null; end;
    raise notice '  [B] RLS 컨텍스트 측정 실패(롤 전환/권한): %', sqlerrm;
  end;

  -- ── [C] 대조: 현재 롤 EXPLAIN ANALYZE (RLS 우회) — 인덱스 사용 확인 ──
  raise notice '════ [C] 현재 롤 EXPLAIN ANALYZE (RLS 우회, 인덱스 사용 확인) ════';
  begin
    raise notice '── scripts (no-RLS) ──';
    for r in execute 'explain (analyze, buffers, timing) '||scr_sql loop raise notice '  %', r."QUERY PLAN"; end loop;
    raise notice '── library (no-RLS) ──';
    for r in execute 'explain (analyze, buffers, timing) '||lib_sql loop raise notice '  %', r."QUERY PLAN"; end loop;
  exception when others then
    raise notice '  [C] 측정 실패: %', sqlerrm;
  end;

  raise notice 'OK RLS 진단 출력 완료 (변경 0 · 위 [A][B][C] 로그로 2.2초 원인 판정).';
end $$;
