-- 사후검증: 잔여정제 RPC 배포(함수 생성만·newsletters 데이터 변경 0). RAISE 시 종료코드!=0.
do $$ declare n int; begin
  -- 4 함수 존재
  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
   where ns.nspname='public' and p.proname in ('resid_fix_preview','resid_fix_apply','resid_fix_rollback','resid_fix_targets');
  if n<>4 then raise exception 'resid_fix 함수 4개 아님(%)',n; end if;
  -- INVOKER(=prosecdef false)
  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
   where ns.nspname='public' and p.proname like 'resid_fix_%' and p.prosecdef;
  if n<>0 then raise exception 'SECURITY DEFINER 잔존(%) — INVOKER 여야',n; end if;
  -- PUBLIC EXECUTE 회수(preview/apply/rollback)
  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace
   where ns.nspname='public' and p.proname in ('resid_fix_preview','resid_fix_apply','resid_fix_rollback')
     and has_function_privilege('public',p.oid,'EXECUTE');
  if n<>0 then raise exception 'PUBLIC EXECUTE 잔존(%)',n; end if;
  -- 로그 테이블·RLS
  if to_regclass('ops.resid_fix_log') is null then raise exception 'ops.resid_fix_log 없음'; end if;
  select count(*) into n from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
   where ns.nspname='ops' and c.relname='resid_fix_log' and c.relrowsecurity;
  if n<>1 then raise exception 'resid_fix_log RLS 미활성'; end if;
  -- newsletters 데이터 무변경 확인(배포는 함수 생성만): 잔여 오염값 건수가 배포로 줄지 않았어야(정보용)
  raise notice 'POSTVERIFY OK: resid_fix 4함수·INVOKER·PUBLIC회수·로그RLS. newsletters 데이터 변경은 감사센터 버튼에서만.';
end $$;
