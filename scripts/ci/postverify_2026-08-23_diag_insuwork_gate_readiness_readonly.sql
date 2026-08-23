-- CI 사후 진단 (🟢 읽기전용, 데이터·스키마 변경 0) — 보험워크 게이트 전체 개방 준비도 실사
--   (db/migrations/2026-08-23_diag_insuwork_gate_readiness_readonly.sql no-op 동반).
--
-- 출력(RAISE NOTICE, CI 로그 캡처):
--   [0] public.users 컬럼 구조 확인 (컬럼명을 가정하지 않고 information_schema로 확인).
--   [1] public.users 전체 role별 분포 + 총 사용자 수 (auth.users 총 사용자 수 참고 대조).
--   [2] 레거시 7개 테이블 각각 distinct owner(또는 author) 수(유효 UUID 기준) + 총 행 수.
--       — library/scripts/myspace_folders/myspace_files/sales_customers/
--         sales_consultations 는 owner_id, calendar_events 는 author_id 사용
--         (2026-08-14_workspace_unified_schema.sql 원본 이관 로직 기준).
--   [3] 레거시 테이블별 owner단위 legacy_count(레거시 테이블 내 행 수) vs
--       migrated_count(대응 insuwork_* 테이블 중 legacy_source='<table>' AND
--       owner_id 일치 행 수) 비교. gap = legacy_count - migrated_count.
--       gap≠0 = 그 owner의 이관 누락(2026-08-14 일괄 이관 이후 생성됐거나 아직
--       이관 안 된 데이터) 의심. 테이블당 상위 50명(gap desc)만 표시하되,
--       먼저 총 distinct owner 수를 raise notice해 50이 충분한지 확인 가능하게 함.
--   [4] insuwork_items/insuwork_customers/insuwork_consultations/insuwork_tasks
--       각각 총 distinct owner_id 수 + owner별 직접작성(legacy_source IS NULL,
--       현재는 파일럿만 UI 접근 가능하므로 파일럿 외에는 존재할 수 없음) vs
--       이관(legacy_source IS NOT NULL) 행 수 분해(상위 50명, 총 행 수 desc).
--   [5] insuwork_items 중 파일럿(98c5f4f9...) 외 owner 행의 visibility
--       (public/private) 분해 — public은 격리 위반이 아니라 게이트 개방 시
--       의도적으로 전체 공개될 행, private은 해당 owner 본인에게만 노출돼야 함.
--
--   각 구간(및 구간 내 테이블 단위) 측정은 예외 가드로 독립 — 하나가 실패해도
--   다른 측정은 계속 진행.
do $$
declare
  r record;
  col_list text;
  uid constant uuid := '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';  -- 보험워크 파일럿(bylts@naver.com / 임태성)
  v_distinct integer;
  v_rows integer;
  v_owners integer;
  v_pub integer;
  v_priv integer;
begin
  -- ── [0] public.users 컬럼 구조 확인 ──────────────────────────────────────
  raise notice '════ [0] public.users 컬럼 구조 확인 ════';
  begin
    select string_agg(column_name || ':' || data_type, ', ' order by ordinal_position)
      into col_list
      from information_schema.columns
     where table_schema = 'public' and table_name = 'users';
    raise notice '  public.users 컬럼 = %', coalesce(col_list, '(테이블 없음 또는 컬럼 조회 실패)');
  exception when others then
    raise notice '  [0] public.users 컬럼 introspection 실패: %', sqlerrm;
  end;

  -- ── [1] public.users 전체 role별 분포 + 총 사용자 수 ─────────────────────
  raise notice '════ [1] public.users 전체 role별 분포 ════';
  begin
    for r in
      select role, count(*) as cnt
        from public.users
       group by role
       order by 2 desc
    loop
      raise notice '  role=% | count=%', r.role, r.cnt;
    end loop;

    select count(*) into v_owners from public.users;
    raise notice '-- public.users 총 사용자 수 = % --', v_owners;
  exception when others then
    raise notice '  [1] public.users role 분포 측정 실패: %', sqlerrm;
  end;

  begin
    select count(*) into v_owners from auth.users;
    raise notice '-- auth.users 총 사용자 수 = % (참고, public.users 대조용) --', v_owners;
  exception when others then
    raise notice '  [1] auth.users 카운트 실패(권한 등): %', sqlerrm;
  end;

  -- ── [2] 레거시 테이블별 distinct owner/author 수 + 총 행 수 ──────────────
  raise notice '════ [2] 레거시 테이블별 distinct owner/author 수(유효 UUID) + 총 행 수 ════';
  begin
    select count(distinct owner_id) filter (where owner_id::text ~* '^[0-9a-f-]{36}$'), count(*)
      into v_distinct, v_rows from public.library;
    raise notice '  library (owner_id) | distinct owner=% | 총 행=%', v_distinct, v_rows;
  exception when others then
    raise notice '  [2] library 측정 실패: %', sqlerrm;
  end;

  begin
    select count(distinct owner_id) filter (where owner_id::text ~* '^[0-9a-f-]{36}$'), count(*)
      into v_distinct, v_rows from public.scripts;
    raise notice '  scripts (owner_id) | distinct owner=% | 총 행=%', v_distinct, v_rows;
  exception when others then
    raise notice '  [2] scripts 측정 실패: %', sqlerrm;
  end;

  begin
    select count(distinct owner_id) filter (where owner_id::text ~* '^[0-9a-f-]{36}$'), count(*)
      into v_distinct, v_rows from public.myspace_folders;
    raise notice '  myspace_folders (owner_id) | distinct owner=% | 총 행=%', v_distinct, v_rows;
  exception when others then
    raise notice '  [2] myspace_folders 측정 실패: %', sqlerrm;
  end;

  begin
    select count(distinct owner_id) filter (where owner_id::text ~* '^[0-9a-f-]{36}$'), count(*)
      into v_distinct, v_rows from public.myspace_files;
    raise notice '  myspace_files (owner_id) | distinct owner=% | 총 행=%', v_distinct, v_rows;
  exception when others then
    raise notice '  [2] myspace_files 측정 실패: %', sqlerrm;
  end;

  begin
    select count(distinct owner_id) filter (where owner_id::text ~* '^[0-9a-f-]{36}$'), count(*)
      into v_distinct, v_rows from public.sales_customers;
    raise notice '  sales_customers (owner_id) | distinct owner=% | 총 행=%', v_distinct, v_rows;
  exception when others then
    raise notice '  [2] sales_customers 측정 실패: %', sqlerrm;
  end;

  begin
    select count(distinct owner_id) filter (where owner_id::text ~* '^[0-9a-f-]{36}$'), count(*)
      into v_distinct, v_rows from public.sales_consultations;
    raise notice '  sales_consultations (owner_id) | distinct owner=% | 총 행=%', v_distinct, v_rows;
  exception when others then
    raise notice '  [2] sales_consultations 측정 실패: %', sqlerrm;
  end;

  begin
    select count(distinct author_id) filter (where author_id::text ~* '^[0-9a-f-]{36}$'), count(*)
      into v_distinct, v_rows from public.calendar_events;
    raise notice '  calendar_events (author_id) | distinct owner=% | 총 행=%', v_distinct, v_rows;
  exception when others then
    raise notice '  [2] calendar_events 측정 실패: %', sqlerrm;
  end;

  -- ── [3] 레거시 테이블별 owner단위 legacy_count vs migrated_count(insuwork_*) ──
  raise notice '════ [3] 레거시 테이블별 owner단위 이관 격차(gap = legacy - migrated, gap desc 상위 50) ════';

  begin
    select count(distinct owner_id) filter (where owner_id::text ~* '^[0-9a-f-]{36}$')
      into v_owners from public.library;
    raise notice '-- library 대상 distinct owner 총 %명 (상위 50명만 아래 표시) --', v_owners;
    for r in
      select g.who, g.owner_id, g.legacy_count, coalesce(m.migrated_count,0) as migrated_count,
             g.legacy_count - coalesce(m.migrated_count,0) as gap
        from (
          select coalesce(u.name, u.email, l.owner_id::text) as who, l.owner_id::uuid as owner_id, count(*) as legacy_count
            from public.library l
            left join public.users u on u.id = l.owner_id::uuid
           where l.owner_id::text ~* '^[0-9a-f-]{36}$'
           group by 1,2
        ) g
        left join (
          select owner_id, count(*) as migrated_count
            from public.insuwork_items
           where legacy_source = 'library'
           group by owner_id
        ) m on m.owner_id = g.owner_id
       order by gap desc
       limit 50
    loop
      raise notice '  library | owner=% (%) | legacy=% | migrated=% | gap=%', r.who, r.owner_id, r.legacy_count, r.migrated_count, r.gap;
    end loop;
  exception when others then
    raise notice '  [3] library 이관 격차 측정 실패: %', sqlerrm;
  end;

  begin
    select count(distinct owner_id) filter (where owner_id::text ~* '^[0-9a-f-]{36}$')
      into v_owners from public.scripts;
    raise notice '-- scripts 대상 distinct owner 총 %명 (상위 50명만 아래 표시) --', v_owners;
    for r in
      select g.who, g.owner_id, g.legacy_count, coalesce(m.migrated_count,0) as migrated_count,
             g.legacy_count - coalesce(m.migrated_count,0) as gap
        from (
          select coalesce(u.name, u.email, s.owner_id::text) as who, s.owner_id::uuid as owner_id, count(*) as legacy_count
            from public.scripts s
            left join public.users u on u.id = s.owner_id::uuid
           where s.owner_id::text ~* '^[0-9a-f-]{36}$'
           group by 1,2
        ) g
        left join (
          select owner_id, count(*) as migrated_count
            from public.insuwork_items
           where legacy_source = 'scripts'
           group by owner_id
        ) m on m.owner_id = g.owner_id
       order by gap desc
       limit 50
    loop
      raise notice '  scripts | owner=% (%) | legacy=% | migrated=% | gap=%', r.who, r.owner_id, r.legacy_count, r.migrated_count, r.gap;
    end loop;
  exception when others then
    raise notice '  [3] scripts 이관 격차 측정 실패: %', sqlerrm;
  end;

  begin
    select count(distinct owner_id) filter (where owner_id::text ~* '^[0-9a-f-]{36}$')
      into v_owners from public.myspace_folders;
    raise notice '-- myspace_folders 대상 distinct owner 총 %명 (상위 50명만 아래 표시) --', v_owners;
    for r in
      select g.who, g.owner_id, g.legacy_count, coalesce(m.migrated_count,0) as migrated_count,
             g.legacy_count - coalesce(m.migrated_count,0) as gap
        from (
          select coalesce(u.name, u.email, f.owner_id::text) as who, f.owner_id::uuid as owner_id, count(*) as legacy_count
            from public.myspace_folders f
            left join public.users u on u.id = f.owner_id::uuid
           where f.owner_id::text ~* '^[0-9a-f-]{36}$'
           group by 1,2
        ) g
        left join (
          select owner_id, count(*) as migrated_count
            from public.insuwork_items
           where legacy_source = 'myspace_folders'
           group by owner_id
        ) m on m.owner_id = g.owner_id
       order by gap desc
       limit 50
    loop
      raise notice '  myspace_folders | owner=% (%) | legacy=% | migrated=% | gap=%', r.who, r.owner_id, r.legacy_count, r.migrated_count, r.gap;
    end loop;
  exception when others then
    raise notice '  [3] myspace_folders 이관 격차 측정 실패: %', sqlerrm;
  end;

  begin
    select count(distinct owner_id) filter (where owner_id::text ~* '^[0-9a-f-]{36}$')
      into v_owners from public.myspace_files;
    raise notice '-- myspace_files 대상 distinct owner 총 %명 (상위 50명만 아래 표시) --', v_owners;
    for r in
      select g.who, g.owner_id, g.legacy_count, coalesce(m.migrated_count,0) as migrated_count,
             g.legacy_count - coalesce(m.migrated_count,0) as gap
        from (
          select coalesce(u.name, u.email, f.owner_id::text) as who, f.owner_id::uuid as owner_id, count(*) as legacy_count
            from public.myspace_files f
            left join public.users u on u.id = f.owner_id::uuid
           where f.owner_id::text ~* '^[0-9a-f-]{36}$'
           group by 1,2
        ) g
        left join (
          select owner_id, count(*) as migrated_count
            from public.insuwork_items
           where legacy_source = 'myspace_files'
           group by owner_id
        ) m on m.owner_id = g.owner_id
       order by gap desc
       limit 50
    loop
      raise notice '  myspace_files | owner=% (%) | legacy=% | migrated=% | gap=%', r.who, r.owner_id, r.legacy_count, r.migrated_count, r.gap;
    end loop;
  exception when others then
    raise notice '  [3] myspace_files 이관 격차 측정 실패: %', sqlerrm;
  end;

  begin
    select count(distinct owner_id) filter (where owner_id::text ~* '^[0-9a-f-]{36}$')
      into v_owners from public.sales_customers;
    raise notice '-- sales_customers 대상 distinct owner 총 %명 (상위 50명만 아래 표시) --', v_owners;
    for r in
      select g.who, g.owner_id, g.legacy_count, coalesce(m.migrated_count,0) as migrated_count,
             g.legacy_count - coalesce(m.migrated_count,0) as gap
        from (
          select coalesce(u.name, u.email, c.owner_id::text) as who, c.owner_id::uuid as owner_id, count(*) as legacy_count
            from public.sales_customers c
            left join public.users u on u.id = c.owner_id::uuid
           where c.owner_id::text ~* '^[0-9a-f-]{36}$'
           group by 1,2
        ) g
        left join (
          select owner_id, count(*) as migrated_count
            from public.insuwork_customers
           where legacy_source = 'sales_customers'
           group by owner_id
        ) m on m.owner_id = g.owner_id
       order by gap desc
       limit 50
    loop
      raise notice '  sales_customers | owner=% (%) | legacy=% | migrated=% | gap=%', r.who, r.owner_id, r.legacy_count, r.migrated_count, r.gap;
    end loop;
  exception when others then
    raise notice '  [3] sales_customers 이관 격차 측정 실패: %', sqlerrm;
  end;

  begin
    select count(distinct owner_id) filter (where owner_id::text ~* '^[0-9a-f-]{36}$')
      into v_owners from public.sales_consultations;
    raise notice '-- sales_consultations 대상 distinct owner 총 %명 (상위 50명만 아래 표시) --', v_owners;
    for r in
      select g.who, g.owner_id, g.legacy_count, coalesce(m.migrated_count,0) as migrated_count,
             g.legacy_count - coalesce(m.migrated_count,0) as gap
        from (
          select coalesce(u.name, u.email, c.owner_id::text) as who, c.owner_id::uuid as owner_id, count(*) as legacy_count
            from public.sales_consultations c
            left join public.users u on u.id = c.owner_id::uuid
           where c.owner_id::text ~* '^[0-9a-f-]{36}$'
           group by 1,2
        ) g
        left join (
          select owner_id, count(*) as migrated_count
            from public.insuwork_consultations
           where legacy_source = 'sales_consultations'
           group by owner_id
        ) m on m.owner_id = g.owner_id
       order by gap desc
       limit 50
    loop
      raise notice '  sales_consultations | owner=% (%) | legacy=% | migrated=% | gap=%', r.who, r.owner_id, r.legacy_count, r.migrated_count, r.gap;
    end loop;
  exception when others then
    raise notice '  [3] sales_consultations 이관 격차 측정 실패: %', sqlerrm;
  end;

  begin
    select count(distinct author_id) filter (where author_id::text ~* '^[0-9a-f-]{36}$')
      into v_owners from public.calendar_events;
    raise notice '-- calendar_events 대상 distinct author 총 %명 (상위 50명만 아래 표시) --', v_owners;
    for r in
      select g.who, g.owner_id, g.legacy_count, coalesce(m.migrated_count,0) as migrated_count,
             g.legacy_count - coalesce(m.migrated_count,0) as gap
        from (
          select coalesce(u.name, u.email, e.author_id::text) as who, e.author_id::uuid as owner_id, count(*) as legacy_count
            from public.calendar_events e
            left join public.users u on u.id = e.author_id::uuid
           where e.author_id::text ~* '^[0-9a-f-]{36}$'
           group by 1,2
        ) g
        left join (
          select owner_id, count(*) as migrated_count
            from public.insuwork_tasks
           where legacy_source = 'calendar_events'
           group by owner_id
        ) m on m.owner_id = g.owner_id
       order by gap desc
       limit 50
    loop
      raise notice '  calendar_events | owner=% (%) | legacy=% | migrated=% | gap=%', r.who, r.owner_id, r.legacy_count, r.migrated_count, r.gap;
    end loop;
  exception when others then
    raise notice '  [3] calendar_events 이관 격차 측정 실패: %', sqlerrm;
  end;

  -- ── [4] insuwork_* 테이블별 총 distinct owner 수 + owner별 직접작성/이관 분해 ──
  raise notice '════ [4] insuwork_* 테이블별 owner 수 + owner별 직접작성/이관 분해(상위 50, 총행 desc) ════';

  begin
    select count(distinct owner_id) into v_owners from public.insuwork_items;
    raise notice '-- insuwork_items 총 distinct owner=% --', v_owners;
    for r in
      select coalesce(u.name, u.email, ii.owner_id::text) as who, ii.owner_id,
             count(*) as total_rows,
             count(*) filter (where ii.legacy_source is null) as direct_rows,
             count(*) filter (where ii.legacy_source is not null) as migrated_rows
        from public.insuwork_items ii
        left join public.users u on u.id = ii.owner_id
       group by 1,2
       order by total_rows desc
       limit 50
    loop
      raise notice '  insuwork_items | owner=% (%) | 총=% | 직접작성=% | 이관=%', r.who, r.owner_id, r.total_rows, r.direct_rows, r.migrated_rows;
    end loop;
  exception when others then
    raise notice '  [4] insuwork_items 측정 실패: %', sqlerrm;
  end;

  begin
    select count(distinct owner_id) into v_owners from public.insuwork_customers;
    raise notice '-- insuwork_customers 총 distinct owner=% --', v_owners;
    for r in
      select coalesce(u.name, u.email, ic.owner_id::text) as who, ic.owner_id,
             count(*) as total_rows,
             count(*) filter (where ic.legacy_source is null) as direct_rows,
             count(*) filter (where ic.legacy_source is not null) as migrated_rows
        from public.insuwork_customers ic
        left join public.users u on u.id = ic.owner_id
       group by 1,2
       order by total_rows desc
       limit 50
    loop
      raise notice '  insuwork_customers | owner=% (%) | 총=% | 직접작성=% | 이관=%', r.who, r.owner_id, r.total_rows, r.direct_rows, r.migrated_rows;
    end loop;
  exception when others then
    raise notice '  [4] insuwork_customers 측정 실패: %', sqlerrm;
  end;

  begin
    select count(distinct owner_id) into v_owners from public.insuwork_consultations;
    raise notice '-- insuwork_consultations 총 distinct owner=% --', v_owners;
    for r in
      select coalesce(u.name, u.email, icn.owner_id::text) as who, icn.owner_id,
             count(*) as total_rows,
             count(*) filter (where icn.legacy_source is null) as direct_rows,
             count(*) filter (where icn.legacy_source is not null) as migrated_rows
        from public.insuwork_consultations icn
        left join public.users u on u.id = icn.owner_id
       group by 1,2
       order by total_rows desc
       limit 50
    loop
      raise notice '  insuwork_consultations | owner=% (%) | 총=% | 직접작성=% | 이관=%', r.who, r.owner_id, r.total_rows, r.direct_rows, r.migrated_rows;
    end loop;
  exception when others then
    raise notice '  [4] insuwork_consultations 측정 실패: %', sqlerrm;
  end;

  begin
    select count(distinct owner_id) into v_owners from public.insuwork_tasks;
    raise notice '-- insuwork_tasks 총 distinct owner=% --', v_owners;
    for r in
      select coalesce(u.name, u.email, it.owner_id::text) as who, it.owner_id,
             count(*) as total_rows,
             count(*) filter (where it.legacy_source is null) as direct_rows,
             count(*) filter (where it.legacy_source is not null) as migrated_rows
        from public.insuwork_tasks it
        left join public.users u on u.id = it.owner_id
       group by 1,2
       order by total_rows desc
       limit 50
    loop
      raise notice '  insuwork_tasks | owner=% (%) | 총=% | 직접작성=% | 이관=%', r.who, r.owner_id, r.total_rows, r.direct_rows, r.migrated_rows;
    end loop;
  exception when others then
    raise notice '  [4] insuwork_tasks 측정 실패: %', sqlerrm;
  end;

  -- ── [5] insuwork_items 파일럿 외 owner — visibility(public/private) 분해 ──
  raise notice '════ [5] insuwork_items 파일럿 외 owner — visibility 분해 ════';
  begin
    select count(*) filter (where visibility = 'public'), count(*) filter (where visibility = 'private')
      into v_pub, v_priv
      from public.insuwork_items
     where owner_id <> uid;
    raise notice '-- 파일럿(%) 외 owner insuwork_items | public=% | private=% (public=게이트 개방 시 의도적 공개, private=본인만 노출돼야 함) --', uid, v_pub, v_priv;
  exception when others then
    raise notice '  [5] insuwork_items visibility 분해 측정 실패: %', sqlerrm;
  end;

  raise notice 'OK 보험워크 게이트 개방 준비도 진단 완료 (변경 0).';
end $$;
