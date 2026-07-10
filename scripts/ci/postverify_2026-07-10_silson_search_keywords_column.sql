-- CI 사후 검증 (🟢 읽기전용) — 실비변천사 검색키워드 컬럼 추가 마이그레이션
--   (db/migrations/2026-07-10_silson_search_keywords_column.sql) 적용 직후 실행.
--
-- 검증 목표:
--   1) public.silson_generations.search_keywords 컬럼이 존재한다.
--   2) 데이터타입이 배열(text[]) 이다 — information_schema 기준 data_type='ARRAY' 이고 udt_name='_text'.
--
-- 방식: information_schema.columns 조회(읽기전용). 조건 불충족 시 RAISE EXCEPTION
--   → psql(ON_ERROR_STOP=1) 종료코드!=0 → CI 가 FAIL 처리. DML/DDL 없음.
do $$
declare
  v_data_type text;
  v_udt_name  text;
begin
  -- ── 컬럼 존재 + 타입 로드 ─────────────────────────────────────────────────
  select c.data_type, c.udt_name
    into v_data_type, v_udt_name
    from information_schema.columns c
   where c.table_schema='public'
     and c.table_name='silson_generations'
     and c.column_name='search_keywords';
  if not found then
    raise exception 'FAIL silson_generations.search_keywords 컬럼 미적재.';
  end if;

  -- ── 배열 타입(text[]) 확인 ───────────────────────────────────────────────
  if v_data_type <> 'ARRAY' or v_udt_name <> '_text' then
    raise exception 'FAIL silson_generations.search_keywords 타입이 text[] 아님. data_type=%, udt_name=%',
      v_data_type, v_udt_name;
  end if;

  raise notice 'POSTVERIFY PASS: silson_generations.search_keywords 존재 + 타입 text[](ARRAY/_text) 정합.';
end $$;
