-- 사후검증: CI 이력 구조. RAISE 시 종료코드!=0.
do $$ begin
  if to_regclass('ops.migration_history') is null then raise exception 'ops.migration_history 없음'; end if;
  if has_schema_privilege('authenticated','ops','USAGE') then raise exception 'authenticated ops usage 보유(차단돼야)'; end if;
  raise notice 'POSTVERIFY OK: ops.migration_history 존재·일반 접근 차단.';
end $$;
