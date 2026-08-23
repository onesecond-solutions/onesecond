-- CI 사후 진단 (🟢 읽기전용, 데이터·스키마 변경 0) — 워크스테이션 파일럿 데이터 실사
--   (db/migrations/2026-08-23_diag_workspace_pilot_data_readonly.sql no-op 동반).
--
-- 출력(RAISE NOTICE, CI 로그 캡처):
--   [1] workspace_items      — legacy_source × item_type 별 active/trashed 분해 + 격리 확인.
--   [2] workspace_customers  — legacy_source 별 active/trashed 분해 + 격리 확인.
--   [3] workspace_consultations — legacy_source 별 건수(deleted_at 컬럼 없음) + 격리 확인.
--   [4] workspace_tasks      — legacy_source 별 active/trashed 분해 + 격리 확인.
--   격리 확인 = 파일럿(uid) 외 owner_id 로 남은 행이 있는지(다른 사용자 데이터 혼입 여부).
--     기대값 = 0/0 (다른 owner 없음). 0이 아니면 혼입 의심 → 즉시 보고 대상.
--   각 테이블 측정은 예외 가드 → 하나가 실패해도 다른 테이블 측정 계속.
do $$
declare
  r record;
  uid constant uuid := '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';  -- 워크스테이션 파일럿(bylts@naver.com / 임태성)
  other_owners integer;
  other_rows integer;
begin
  -- ── [1] workspace_items — legacy_source × item_type 분해 + 격리 확인 ────────
  raise notice '════ [1] workspace_items (owner=%) ════', uid;
  begin
    raise notice '-- legacy_source × item_type 별 active/trashed --';
    for r in
      select coalesce(legacy_source,'(직접작성)') as src, item_type,
             count(*) filter (where deleted_at is null) as active,
             count(*) filter (where deleted_at is not null) as trashed
        from public.workspace_items
       where owner_id = uid
       group by 1,2
       order by 1,2
    loop
      raise notice '  source=% | type=% | active=% | trashed=%', r.src, r.item_type, r.active, r.trashed;
    end loop;

    select count(distinct owner_id) filter (where owner_id <> uid),
           count(*) filter (where owner_id <> uid)
      into other_owners, other_rows
      from public.workspace_items;
    raise notice '-- 격리 확인: 파일럿 외 owner 수=% / 그 owner들의 행 수=% (기대값 0/0) --', other_owners, other_rows;
  exception when others then
    raise notice '  [1] workspace_items 측정 실패: %', sqlerrm;
  end;

  -- ── [2] workspace_customers — legacy_source 분해 + 격리 확인 ────────────────
  raise notice '════ [2] workspace_customers (owner=%) ════', uid;
  begin
    raise notice '-- legacy_source 별 active/trashed --';
    for r in
      select coalesce(legacy_source,'(직접작성)') as src,
             count(*) filter (where deleted_at is null) as active,
             count(*) filter (where deleted_at is not null) as trashed
        from public.workspace_customers
       where owner_id = uid
       group by 1
       order by 1
    loop
      raise notice '  source=% | active=% | trashed=%', r.src, r.active, r.trashed;
    end loop;

    select count(distinct owner_id) filter (where owner_id <> uid),
           count(*) filter (where owner_id <> uid)
      into other_owners, other_rows
      from public.workspace_customers;
    raise notice '-- 격리 확인: 파일럿 외 owner 수=% / 그 owner들의 행 수=% (기대값 0/0) --', other_owners, other_rows;
  exception when others then
    raise notice '  [2] workspace_customers 측정 실패: %', sqlerrm;
  end;

  -- ── [3] workspace_consultations — legacy_source 분해(건수만, deleted_at 없음) + 격리 확인 ──
  raise notice '════ [3] workspace_consultations (owner=%) ════', uid;
  begin
    raise notice '-- legacy_source 별 건수 --';
    for r in
      select coalesce(legacy_source,'(직접작성)') as src,
             count(*) as cnt
        from public.workspace_consultations
       where owner_id = uid
       group by 1
       order by 1
    loop
      raise notice '  source=% | count=%', r.src, r.cnt;
    end loop;

    select count(distinct owner_id) filter (where owner_id <> uid),
           count(*) filter (where owner_id <> uid)
      into other_owners, other_rows
      from public.workspace_consultations;
    raise notice '-- 격리 확인: 파일럿 외 owner 수=% / 그 owner들의 행 수=% (기대값 0/0) --', other_owners, other_rows;
  exception when others then
    raise notice '  [3] workspace_consultations 측정 실패: %', sqlerrm;
  end;

  -- ── [4] workspace_tasks — legacy_source 분해 + 격리 확인 ────────────────────
  raise notice '════ [4] workspace_tasks (owner=%) ════', uid;
  begin
    raise notice '-- legacy_source 별 active/trashed --';
    for r in
      select coalesce(legacy_source,'(직접작성)') as src,
             count(*) filter (where deleted_at is null) as active,
             count(*) filter (where deleted_at is not null) as trashed
        from public.workspace_tasks
       where owner_id = uid
       group by 1
       order by 1
    loop
      raise notice '  source=% | active=% | trashed=%', r.src, r.active, r.trashed;
    end loop;

    select count(distinct owner_id) filter (where owner_id <> uid),
           count(*) filter (where owner_id <> uid)
      into other_owners, other_rows
      from public.workspace_tasks;
    raise notice '-- 격리 확인: 파일럿 외 owner 수=% / 그 owner들의 행 수=% (기대값 0/0) --', other_owners, other_rows;
  exception when others then
    raise notice '  [4] workspace_tasks 측정 실패: %', sqlerrm;
  end;

  raise notice 'OK 워크스테이션 파일럿 데이터 실사 완료 (변경 0).';
end $$;
