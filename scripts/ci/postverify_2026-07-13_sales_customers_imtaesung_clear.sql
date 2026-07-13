-- CI 사후 검증 (🟢 읽기전용) — 임태성 실장 상담관리 고객 전체 소프트삭제(제로 베이스)
--   (db/migrations/2026-07-13_sales_customers_imtaesung_clear.sql) 적용 직후 실행.
--
-- 검증 목표:
--   1) owner=임태성 살아있는(deleted_at null) 고객 = 0명 (상담관리 목록 제로 베이스).
--   2) 소프트삭제만 됐는지 확인: 휴지통(deleted_at 有) 행이 존재(하드 DELETE 아님 → 데이터 보존·복구 가능).
--
-- 방식: sales_customers 조회(읽기전용). 조건 불충족 시 RAISE EXCEPTION
--   → psql(ON_ERROR_STOP=1) 종료코드!=0 → apply_and_verify.sh 가 FAIL 처리. DML/DDL 없음.
do $$
declare
  v_alive int;
  v_trash int;
begin
  select count(*) into v_alive
    from sales_customers
   where owner_id = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd' and deleted_at is null;

  select count(*) into v_trash
    from sales_customers
   where owner_id = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd' and deleted_at is not null;

  -- ── 1) 살아있는 고객 0명 ──────────────────────────────────────────────────
  if v_alive <> 0 then
    raise exception 'FAIL 임태성 살아있는 고객이 남아있음(제로 베이스 아님). alive=%', v_alive;
  end if;

  -- ── 2) 소프트삭제 보존 확인(하드 DELETE가 아님을 확인 · 데이터 복구 가능) ──
  if v_trash < 1 then
    raise exception 'FAIL 휴지통 행 0 — 소프트삭제 데이터가 보존되지 않음(하드 삭제 의심).';
  end if;

  raise notice 'POSTVERIFY OK: 임태성 상담관리 제로 베이스(alive=0) · 휴지통 보존(trash=% · 복구 가능)', v_trash;
end $$;
