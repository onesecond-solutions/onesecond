-- CI 사후 검증 (🟢 읽기전용) — 영업방향·전략 원장 테이블 신설 마이그레이션
--   (db/migrations/2026-08-06_sales_strategy_schema.sql) 적용 직후 실행.
--
-- 검증 목표:
--   1) public.sales_strategy 테이블 존재.
--   2) 핵심 컬럼(source_filename·source_path·preview_pdf_path·company·status·file_hash) 존재.
--   3) RLS 활성.
--   4) 정책 4개(select_authenticated + admin insert/update/delete) 존재.
--   5) updated_at 트리거 존재.
--
-- 방식: 카탈로그 조회(읽기전용). 조건 불충족 시 RAISE EXCEPTION
--   → psql(ON_ERROR_STOP=1) 종료코드!=0 → CI 가 FAIL 처리. DML/DDL 없음.
do $$
declare
  v_cols    text[] := array['source_filename','source_path','preview_pdf_path','company','status','file_hash'];
  v_col     text;
  v_rls     boolean;
  v_npol    int;
  v_has_trg boolean;
begin
  -- ── 테이블 존재 ─────────────────────────────────────────────────
  if to_regclass('public.sales_strategy') is null then
    raise exception 'FAIL public.sales_strategy 테이블 미생성.';
  end if;

  -- ── 핵심 컬럼 존재 ──────────────────────────────────────────────
  foreach v_col in array v_cols loop
    if not exists (
      select 1 from information_schema.columns c
       where c.table_schema='public' and c.table_name='sales_strategy'
         and c.column_name=v_col
    ) then
      raise exception 'FAIL sales_strategy.% 컬럼 미적재.', v_col;
    end if;
  end loop;

  -- ── RLS 활성 ────────────────────────────────────────────────────
  select relrowsecurity into v_rls from pg_class where oid='public.sales_strategy'::regclass;
  if not v_rls then
    raise exception 'FAIL sales_strategy RLS 미활성.';
  end if;

  -- ── 정책 4개 ────────────────────────────────────────────────────
  select count(*) into v_npol from pg_policies
   where schemaname='public' and tablename='sales_strategy';
  if v_npol <> 4 then
    raise exception 'FAIL sales_strategy 정책 개수=% (4 필요).', v_npol;
  end if;

  -- ── updated_at 트리거 ───────────────────────────────────────────
  select exists (
    select 1 from pg_trigger
     where tgrelid='public.sales_strategy'::regclass
       and tgname='trg_sales_strategy_updated_at'
       and not tgisinternal
  ) into v_has_trg;
  if not v_has_trg then
    raise exception 'FAIL trg_sales_strategy_updated_at 트리거 미적재.';
  end if;

  raise notice 'POSTVERIFY PASS: sales_strategy 테이블 + 핵심컬럼6 + RLS on + 정책4 + updated_at 트리거 정합.';
end $$;
