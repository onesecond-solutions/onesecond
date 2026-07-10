-- CI 사후 검증 (🟢 읽기전용) — 실비변천사(silson_generations) base+검색키워드 통합 생성 [경로②]
--   (db/migrations/2026-07-10_silson_generations_schema_with_search.sql) 적용 직후 실행.
--
-- 검증 목표:
--   1) silson_generations 테이블 존재.
--   2) search_keywords 컬럼 존재 + 타입 text[] (information_schema: data_type=ARRAY / udt_name=_text).
--   3) RLS enabled (pg_class.relrowsecurity = true).
--   4) 정책 2개 존재: silson_generations_select_gated · silson_generations_write_admin.
--
-- 방식: 카탈로그 조회(소유자 관점, RLS 무관). 조건 불충족 시 RAISE EXCEPTION
--   → psql(ON_ERROR_STOP=1) 종료코드!=0 → apply_and_verify.sh 가 FAIL 처리.
do $$
declare
  tbl_exists   boolean;
  sk_udt       text;
  rls_on       boolean;
  has_select   boolean;
  has_write    boolean;
begin
  -- ── 1) 테이블 존재 ───────────────────────────────────────────────────────
  select exists (
    select 1 from information_schema.tables
     where table_schema='public' and table_name='silson_generations'
  ) into tbl_exists;
  if not tbl_exists then
    raise exception 'FAIL silson_generations 테이블 미생성.';
  end if;

  -- ── 2) search_keywords 컬럼 + 타입(text[] = udt _text) ───────────────────
  select c.udt_name
    into sk_udt
    from information_schema.columns c
   where c.table_schema='public' and c.table_name='silson_generations'
     and c.column_name='search_keywords';
  if not found then
    raise exception 'FAIL silson_generations.search_keywords 컬럼 미존재(경로② 통합 반영 실패).';
  end if;
  if sk_udt is distinct from '_text' then
    raise exception 'FAIL silson_generations.search_keywords 타입 불일치(text[] 아님). udt_name=%', sk_udt;
  end if;

  -- ── 3) RLS enabled ───────────────────────────────────────────────────────
  select c.relrowsecurity
    into rls_on
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='silson_generations';
  if not found or not rls_on then
    raise exception 'FAIL silson_generations RLS 미활성(relrowsecurity=%).', rls_on;
  end if;

  -- ── 4) 정책 2개 존재 ─────────────────────────────────────────────────────
  select exists (
    select 1 from pg_policies
     where schemaname='public' and tablename='silson_generations'
       and policyname='silson_generations_select_gated'
  ) into has_select;
  select exists (
    select 1 from pg_policies
     where schemaname='public' and tablename='silson_generations'
       and policyname='silson_generations_write_admin'
  ) into has_write;
  if not has_select then
    raise exception 'FAIL silson_generations_select_gated 정책 미적재.';
  end if;
  if not has_write then
    raise exception 'FAIL silson_generations_write_admin 정책 미적재.';
  end if;

  raise notice 'POSTVERIFY PASS: silson_generations 생성 + search_keywords(text[]) + RLS on + 정책 2개(select_gated·write_admin) 정합.';
end $$;
