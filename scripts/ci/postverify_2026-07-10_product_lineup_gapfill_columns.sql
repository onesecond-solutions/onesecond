-- CI 사후 검증 (🟢 읽기전용) — 상품 라인업 갭보강 3컬럼 추가 마이그레이션
--   (db/migrations/2026-07-10_product_lineup_gapfill_columns.sql) 적용 직후 실행.
--
-- 검증 목표:
--   1) public.insurer_products.sort_order 컬럼 존재(타입 integer).
--   2) public.insurer_product_snapshots.simple_std 컬럼 존재(타입 text).
--   3) public.insurer_product_snapshots.note 컬럼 존재(타입 text).
--   4) simple_std CHECK 제약(insurer_product_snapshots_simple_std_chk) 존재.
--
-- 방식: information_schema.columns / pg_constraint 조회(읽기전용). 조건 불충족 시 RAISE EXCEPTION
--   → psql(ON_ERROR_STOP=1) 종료코드!=0 → CI 가 FAIL 처리. DML/DDL 없음.
do $$
declare
  v_sort_type   text;
  v_simple_type text;
  v_note_type   text;
  v_has_chk     boolean;
begin
  -- ── insurer_products.sort_order ─────────────────────────────────────────
  select c.data_type into v_sort_type
    from information_schema.columns c
   where c.table_schema='public' and c.table_name='insurer_products'
     and c.column_name='sort_order';
  if not found then
    raise exception 'FAIL insurer_products.sort_order 컬럼 미적재.';
  end if;
  if v_sort_type <> 'integer' then
    raise exception 'FAIL insurer_products.sort_order 타입이 integer 아님. data_type=%', v_sort_type;
  end if;

  -- ── insurer_product_snapshots.simple_std ────────────────────────────────
  select c.data_type into v_simple_type
    from information_schema.columns c
   where c.table_schema='public' and c.table_name='insurer_product_snapshots'
     and c.column_name='simple_std';
  if not found then
    raise exception 'FAIL insurer_product_snapshots.simple_std 컬럼 미적재.';
  end if;
  if v_simple_type <> 'text' then
    raise exception 'FAIL insurer_product_snapshots.simple_std 타입이 text 아님. data_type=%', v_simple_type;
  end if;

  -- ── insurer_product_snapshots.note ──────────────────────────────────────
  select c.data_type into v_note_type
    from information_schema.columns c
   where c.table_schema='public' and c.table_name='insurer_product_snapshots'
     and c.column_name='note';
  if not found then
    raise exception 'FAIL insurer_product_snapshots.note 컬럼 미적재.';
  end if;
  if v_note_type <> 'text' then
    raise exception 'FAIL insurer_product_snapshots.note 타입이 text 아님. data_type=%', v_note_type;
  end if;

  -- ── simple_std CHECK 제약 존재 ──────────────────────────────────────────
  select exists (
    select 1 from pg_constraint
     where conname='insurer_product_snapshots_simple_std_chk'
       and conrelid='public.insurer_product_snapshots'::regclass
       and contype='c'
  ) into v_has_chk;
  if not v_has_chk then
    raise exception 'FAIL insurer_product_snapshots_simple_std_chk CHECK 제약 미적재.';
  end if;

  raise notice 'POSTVERIFY PASS: insurer_products.sort_order(int) + insurer_product_snapshots.simple_std(text,CHECK)·note(text) 정합.';
end $$;
