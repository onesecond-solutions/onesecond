-- CI 사후 검증 (🟢 읽기전용) — 성능 인덱스 scripts/library
--   (db/migrations/2026-07-27_perf_index_scripts_library_owner.sql) 적용 직후 실행.
--
-- 검증 목표:
--   1) idx_scripts_owner_active_created 존재 + 정의에 owner_id·is_active·created_at 포함.
--   2) idx_library_owner_created 존재 + 정의에 owner_id·created_at 포함.
--   3) 참고 로그: scripts/library 테이블의 전체 인덱스 목록(중복 인덱스 육안 확인용).
do $$
declare
  scr_def text;
  lib_def text;
  r record;
begin
  -- 1) scripts 인덱스
  select indexdef into scr_def from pg_indexes
   where schemaname='public' and tablename='scripts' and indexname='idx_scripts_owner_active_created';
  if scr_def is null then
    raise exception 'FAIL idx_scripts_owner_active_created 미생성.';
  end if;
  if scr_def not ilike '%owner_id%' or scr_def not ilike '%is_active%' or scr_def not ilike '%created_at%' then
    raise exception 'FAIL scripts 인덱스 정의에 기대 컬럼 누락: %', scr_def;
  end if;

  -- 2) library 인덱스
  select indexdef into lib_def from pg_indexes
   where schemaname='public' and tablename='library' and indexname='idx_library_owner_created';
  if lib_def is null then
    raise exception 'FAIL idx_library_owner_created 미생성.';
  end if;
  if lib_def not ilike '%owner_id%' or lib_def not ilike '%created_at%' then
    raise exception 'FAIL library 인덱스 정의에 기대 컬럼 누락: %', lib_def;
  end if;

  -- 3) 참고 로그: 전체 인덱스(중복 육안 확인)
  raise notice '── scripts 인덱스 목록 ──';
  for r in select indexname, indexdef from pg_indexes
            where schemaname='public' and tablename='scripts' order by indexname loop
    raise notice '  % : %', r.indexname, r.indexdef;
  end loop;
  raise notice '── library 인덱스 목록 ──';
  for r in select indexname, indexdef from pg_indexes
            where schemaname='public' and tablename='library' order by indexname loop
    raise notice '  % : %', r.indexname, r.indexdef;
  end loop;

  raise notice 'OK 성능 인덱스 검증 통과 (idx_scripts_owner_active_created · idx_library_owner_created 존재·정의 정합).';
end $$;
