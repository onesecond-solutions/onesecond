-- CI 사후 검증 (🟢 읽기전용) — sales_strategy anon published 읽기 정책 추가 마이그레이션
--   (db/migrations/2026-08-06_sales_strategy_anon_read.sql) 적용 직후 실행.
--
-- 검증 목표:
--   1) sales_strategy_select_anon_published 정책이 anon 롤·SELECT·(status='published') 조건으로 존재.
--   2) 기존 authenticated SELECT 정책도 그대로 유지(무변경).
--
-- 방식: pg_policies 조회(읽기전용). 조건 불충족 시 RAISE EXCEPTION → CI FAIL.
do $$
declare
  v_anon_ok boolean;
  v_auth_ok boolean;
begin
  select exists (
    select 1 from pg_policies
     where schemaname='public' and tablename='sales_strategy'
       and policyname='sales_strategy_select_anon_published'
       and cmd='SELECT' and 'anon' = ANY(roles)
       and coalesce(qual,'') like '%published%'
  ) into v_anon_ok;
  if not v_anon_ok then
    raise exception 'FAIL sales_strategy_select_anon_published(anon·SELECT·published) 정책 미적재.';
  end if;

  select exists (
    select 1 from pg_policies
     where schemaname='public' and tablename='sales_strategy'
       and policyname='sales_strategy_select_authenticated'
       and cmd='SELECT' and 'authenticated' = ANY(roles)
  ) into v_auth_ok;
  if not v_auth_ok then
    raise exception 'FAIL 기존 authenticated SELECT 정책이 사라짐(무변경 위반).';
  end if;

  raise notice 'POSTVERIFY PASS: sales_strategy anon(published) 읽기 정책 + authenticated 정책 유지 정합.';
end $$;
