-- CI 사후 검증 (🟢 읽기전용) — myspace_files admin 쓰기 정책 적재 확인.
--   (db/migrations/2026-07-15_myspace_files_admin_write.sql) 적용 직후 실행.
-- 검증: myspace_files 에 myspace_files_admin_write 정책이 존재하고 is_admin() 을 참조한다.
do $$
declare
  v_cnt int;
  v_using text;
begin
  select count(*) into v_cnt
    from pg_policies
   where schemaname='public' and tablename='myspace_files' and policyname='myspace_files_admin_write';
  if v_cnt <> 1 then
    raise exception 'FAIL myspace_files_admin_write 정책 없음. count=%', v_cnt;
  end if;

  select qual into v_using
    from pg_policies
   where schemaname='public' and tablename='myspace_files' and policyname='myspace_files_admin_write';
  if v_using is null or position('is_admin' in v_using) = 0 then
    raise exception 'FAIL myspace_files_admin_write USING 에 is_admin 없음. using=%', v_using;
  end if;

  raise notice 'POSTVERIFY OK: myspace_files_admin_write 존재 · is_admin 참조';
end $$;
