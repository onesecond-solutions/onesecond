-- CI 사후 검증 (🟢 읽기전용) — 상담관리 인수정보 5컬럼 추가 마이그레이션
--   (db/migrations/2026-07-10_sales_customers_underwriting_columns.sql) 적용 직후 실행.
--
-- 검증 목표:
--   1) public.sales_customers 의 5컬럼(job·medication·history·dx_date·uw_status) 존재.
--   2) 5컬럼 전부 타입 text.
--   3) medication CHECK 제약(sales_customers_medication_chk) 존재.
--
-- 방식: information_schema.columns / pg_constraint 조회(읽기전용). 조건 불충족 시 RAISE EXCEPTION
--   → psql(ON_ERROR_STOP=1) 종료코드!=0 → CI 가 FAIL 처리. DML/DDL 없음.
do $$
declare
  v_cols    text[] := array['job','medication','history','dx_date','uw_status'];
  v_col     text;
  v_type    text;
  v_has_chk boolean;
begin
  -- ── 5컬럼 존재 + text 타입 확인 ─────────────────────────────────────────
  foreach v_col in array v_cols loop
    select c.data_type into v_type
      from information_schema.columns c
     where c.table_schema='public' and c.table_name='sales_customers'
       and c.column_name=v_col;
    if not found then
      raise exception 'FAIL sales_customers.% 컬럼 미적재.', v_col;
    end if;
    if v_type <> 'text' then
      raise exception 'FAIL sales_customers.% 타입이 text 아님. data_type=%', v_col, v_type;
    end if;
  end loop;

  -- ── medication CHECK 제약 존재 ──────────────────────────────────────────
  select exists (
    select 1 from pg_constraint
     where conname='sales_customers_medication_chk'
       and conrelid='public.sales_customers'::regclass
       and contype='c'
  ) into v_has_chk;
  if not v_has_chk then
    raise exception 'FAIL sales_customers_medication_chk CHECK 제약 미적재.';
  end if;

  raise notice 'POSTVERIFY PASS: sales_customers 인수정보 5컬럼(job·medication·history·dx_date·uw_status, text) + medication CHECK 정합.';
end $$;
