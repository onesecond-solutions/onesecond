-- CI 사후 검증 (DB 권한 계층만 · item 8). RLS·JWT 의존 데이터/행위 검증은 라이브 계정 게이트로 분리.
-- 감사센터 마이그레이션(2026-07-03_nlstd_audit_center.sql) 적용 직후 실행. 실패 시 RAISE → psql 종료코드 !=0.
do $$
declare n int;
begin
  -- 신규 테이블 3
  select count(*) into n from information_schema.tables
   where table_schema='public' and table_name in ('ac_nlstd_mapping','ac_nlstd_jobs','ac_nlstd_job_items');
  if n <> 3 then raise exception 'FAIL 테이블 3개 아님(%).', n; end if;

  -- RPC 4
  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
   where ns.nspname='public' and p.proname in ('ac_nlstd_prepare','ac_nlstd_approve_execute','ac_nlstd_rollback','ac_nlstd_get_job');
  if n <> 4 then raise exception 'FAIL RPC 4개 아님(%).', n; end if;

  -- RLS on (3 테이블)
  select count(*) into n from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
   where ns.nspname='public' and c.relname in ('ac_nlstd_mapping','ac_nlstd_jobs','ac_nlstd_job_items') and c.relrowsecurity;
  if n <> 3 then raise exception 'FAIL RLS 미활성(%/3).', n; end if;

  -- 직접 쓰기 정책 0 (SELECT 정책만)
  select count(*) into n from pg_policies
   where schemaname='public' and tablename in ('ac_nlstd_mapping','ac_nlstd_jobs','ac_nlstd_job_items') and cmd <> 'SELECT';
  if n <> 0 then raise exception 'FAIL 직접 쓰기 정책 존재(%).', n; end if;

  -- PUBLIC EXECUTE 회수 (4함수에 PUBLIC 실행권 없어야)
  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
   where ns.nspname='public' and p.proname like 'ac_nlstd_%'
     and has_function_privilege('public', p.oid, 'EXECUTE');
  if n <> 0 then raise exception 'FAIL PUBLIC EXECUTE 잔존(%).', n; end if;

  -- 함수 소유자 = ac_nlstd_fn_owner (최소권한 역할)
  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace join pg_roles r on r.oid=p.proowner
   where ns.nspname='public' and p.proname like 'ac_nlstd_%' and r.rolname <> 'ac_nlstd_fn_owner';
  if n <> 0 then raise exception 'FAIL 함수 소유자 불일치(%).', n; end if;

  -- ops.migration_history 일반 접근 차단(authenticated usage 0)
  if has_schema_privilege('authenticated','ops','USAGE') then raise exception 'FAIL authenticated ops usage 보유'; end if;

  raise notice 'POSTVERIFY PASS: 객체·RPC·RLS·PUBLIC회수·소유자·ops차단 전부 확인(DB 권한 계층).';
end $$;
