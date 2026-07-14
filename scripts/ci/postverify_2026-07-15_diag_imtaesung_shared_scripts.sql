-- 🟢 읽기전용 진단 출력 — 임태성(대표) 공유 스크립트 사본 잔존을 개수·스코프·상태로 출력.
--   ⚠️ 제목·본문 미출력(민감내용 보호). RAISE EXCEPTION 없음(진단 성공 처리).
do $$
declare
  v_owner text := '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';
  r record;
  n_total int; n_active int;
begin
  begin
    select count(*), count(*) filter (where is_active is not false)
      into n_total, n_active
      from public.scripts
     where owner_id = v_owner and scope in ('team','branch');
    raise notice '=== 임태성 공유 스크립트(team/branch) 총 %건 · 활성 %건 ===', n_total, n_active;

    raise notice '--- 스코프×상태 분포 ---';
    for r in
      select scope, scope_id, is_active, count(*) as c, max(created_at) as last_at
        from public.scripts
       where owner_id = v_owner and scope in ('team','branch')
       group by scope, scope_id, is_active
       order by scope, is_active
    loop
      raise notice 'SCOPE %/% active=% count=% last=%', r.scope, r.scope_id, r.is_active, r.c, r.last_at;
    end loop;

    raise notice '--- 개별(id·스코프·상태·생성시각만, 제목 미출력) ---';
    for r in
      select id, scope, is_active, created_at
        from public.scripts
       where owner_id = v_owner and scope in ('team','branch')
       order by created_at desc
       limit 30
    loop
      raise notice 'SCR id=% scope=% active=% at=%', r.id, r.scope, r.is_active, r.created_at;
    end loop;
  exception when others then
    raise notice '스크립트 조회 불가: %', sqlerrm;
  end;

  raise notice 'DIAG DONE (읽기전용 · 변경 0 · 제목 미기록)';
end $$;
