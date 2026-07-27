-- postverify — 2026-06-26 이관 레거시 삭제 검증 (2026-07-27_reset_customers_legacy_import.sql)
-- db-migrate.yml 이 apply 직후 실행. 실패(assert) 시 워크플로 빨간불.

do $$
declare
  remain_import  int;
  protected_rows int;
  orphan_consult int;
begin
  -- 1) 대상(imp 신규) 전부 삭제됐는지
  select count(*) into remain_import
    from sales_customers where source_ref like 'imp:%' and status = '신규';
  if remain_import <> 0 then
    raise exception 'postverify FAIL: imp 신규 잔존 %건 (전부 삭제 안 됨)', remain_import;
  end if;

  -- 2) 보호 대상(대표 추가분·상담관리 = status<>신규) 존재 확인
  select count(*) into protected_rows
    from sales_customers where status <> '신규';

  -- 3) 삭제한 고객을 가리키는 고아 상담기록이 남지 않았는지
  select count(*) into orphan_consult
    from sales_consultations sc
   where not exists (select 1 from sales_customers c where c.id = sc.customer_id);
  if orphan_consult <> 0 then
    raise exception 'postverify FAIL: 고아 상담기록 %건 잔존', orphan_consult;
  end if;

  raise notice 'postverify OK: imp 신규 0건(삭제완료) · 보호(status<>''신규'') %건 잔존 · 고아 상담기록 0', protected_rows;
end $$;
