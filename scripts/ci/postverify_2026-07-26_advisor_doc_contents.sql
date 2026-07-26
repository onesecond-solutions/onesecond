-- CI 사후 검증 (🟢 읽기전용) — 설계사 전용 자료(advisor_doc_contents) [WO-6 1차 파일럿]
--   (db/migrations/2026-07-26_advisor_doc_contents.sql) 적용 직후 실행.
--
-- 검증 목표:
--   1) advisor_doc_contents 테이블 존재.
--   2) 필수 컬럼 존재: doc_id · status · section_key · sort_order.
--   3) RLS enabled (pg_class.relrowsecurity = true).
--   4) 정책 2개 존재: advisor_doc_contents_select · advisor_doc_contents_write.
--   5) 열람 자격 격리 함수 os_can_read_advisor_docs() 존재.
--   6) ⭐ 비로그인 차단 보증: select 정책의 대상 역할에 anon 이 없어야 한다
--      (to authenticated 로만 부여 → anon 정책 미생성 확인).
--
-- 방식: 카탈로그 조회(소유자 관점, RLS 무관). 조건 불충족 시 RAISE EXCEPTION
--   → psql(ON_ERROR_STOP=1) 종료코드!=0 → apply_and_verify.sh 가 FAIL 처리.
do $$
declare
  tbl_exists    boolean;
  col_doc       boolean;
  col_status    boolean;
  col_section   boolean;
  col_sort      boolean;
  rls_on        boolean;
  has_select    boolean;
  has_write     boolean;
  fn_gate       boolean;
  anon_roles    int;
begin
  -- ── 1) 테이블 존재 ───────────────────────────────────────────────────────
  select exists (
    select 1 from information_schema.tables
     where table_schema='public' and table_name='advisor_doc_contents'
  ) into tbl_exists;
  if not tbl_exists then
    raise exception 'FAIL advisor_doc_contents 테이블 미생성.';
  end if;

  -- ── 2) 필수 컬럼 ─────────────────────────────────────────────────────────
  select
    bool_or(column_name='doc_id'),
    bool_or(column_name='status'),
    bool_or(column_name='section_key'),
    bool_or(column_name='sort_order')
    into col_doc, col_status, col_section, col_sort
    from information_schema.columns
   where table_schema='public' and table_name='advisor_doc_contents';
  if not (col_doc and col_status and col_section and col_sort) then
    raise exception 'FAIL 필수 컬럼 누락: doc_id=% status=% section_key=% sort_order=%',
      col_doc, col_status, col_section, col_sort;
  end if;

  -- ── 3) RLS enabled ───────────────────────────────────────────────────────
  select c.relrowsecurity
    into rls_on
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='advisor_doc_contents';
  if not coalesce(rls_on,false) then
    raise exception 'FAIL advisor_doc_contents RLS 미활성.';
  end if;

  -- ── 4) 정책 2개 ──────────────────────────────────────────────────────────
  select
    bool_or(policyname='advisor_doc_contents_select'),
    bool_or(policyname='advisor_doc_contents_write')
    into has_select, has_write
    from pg_policies
   where schemaname='public' and tablename='advisor_doc_contents';
  if not (coalesce(has_select,false) and coalesce(has_write,false)) then
    raise exception 'FAIL 정책 누락: select=% write=%', has_select, has_write;
  end if;

  -- ── 5) 열람 자격 격리 함수 존재 ──────────────────────────────────────────
  select exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname='os_can_read_advisor_docs'
  ) into fn_gate;
  if not fn_gate then
    raise exception 'FAIL os_can_read_advisor_docs() 함수 미생성(열람 전환 스위치 부재).';
  end if;

  -- ── 6) 비로그인(anon) 차단 보증 ──────────────────────────────────────────
  --   정책 roles 에 anon 또는 public(anon 이 PUBLIC 멤버라 to public = 비로그인 노출) 이 있으면 FAIL.
  --   ⚠️ 'anon'만 검사하면 to public 정책을 놓친다(pg_policies.roles가 {public}으로 저장) → public 포함.
  select count(*)
    into anon_roles
    from pg_policies
   where schemaname='public' and tablename='advisor_doc_contents'
     and ('anon' = any(roles) or 'public' = any(roles));
  if anon_roles > 0 then
    raise exception 'FAIL advisor_doc_contents 정책에 anon/public 역할 존재(비로그인 노출 위험). 건수=%', anon_roles;
  end if;

  -- ── 7) select 정책의 published 게이트 실재(과다노출 회귀 방지) ────────────
  perform 1 from pg_policies
   where schemaname='public' and tablename='advisor_doc_contents'
     and policyname='advisor_doc_contents_select' and qual ilike '%published%';
  if not found then
    raise exception 'FAIL select 정책에 status=published 게이트 부재(과다노출 위험).';
  end if;

  -- ── 8) 게이트 함수 search_path 고정(하드닝 회귀 방지) ────────────────────
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
     where n.nspname='public' and p.proname='os_can_read_advisor_docs'
       and p.proconfig is not null
       and exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%')
  ) then
    raise exception 'FAIL os_can_read_advisor_docs() search_path 미고정(함수 하이재킹 표면).';
  end if;

  raise notice 'OK advisor_doc_contents 검증 통과 (테이블·컬럼·RLS·정책2·게이트함수·anon/public차단·published게이트·search_path고정).';
end $$;
