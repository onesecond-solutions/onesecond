-- CI 사후 검증 (🟢 읽기전용) — 보장분석 4축 공통 스키마(coverage_*) 생성
--   (db/migrations/2026-07-15_coverage_schema_all4.sql) 적용 직후 실행.
--
-- 검증 목표:
--   1) 신규 16 테이블 전부 존재.
--   2) 16 테이블 전부 RLS enabled.
--   3) result_level CHECK 4값(부족/확인필요/점검필요/충분) 이 result_rules·customer_results·lead 에 적용.
--   4) 공용 지식 대표 테이블(coverage_facts)에 게이트 컬럼 status·exposure 존재.
--   5) 대표 정책 존재: 공용(select_gated+write_admin) · 개인(owner).
--
-- 방식: 카탈로그 조회(소유자 관점, RLS 무관). 조건 불충족 시 RAISE EXCEPTION
--   → psql(ON_ERROR_STOP=1) 종료코드!=0 → apply_and_verify.sh 가 FAIL 처리. DML/DDL 없음.
do $$
declare
  tbls text[] := array[
    'coverage_categories','coverage_facts','coverage_treatments','coverage_quiz_questions',
    'coverage_result_rules','coverage_page_blocks','coverage_report_blocks',
    'coverage_disease_tiers','coverage_special_care_rules','coverage_life_map',
    'coverage_surgery_types','coverage_surgery_costs','coverage_insurance_gap_rules',
    'customer_coverage_holdings','coverage_customer_results','coverage_lead'
  ];
  t          text;
  cnt        int;
  rls_on     boolean;
  chk_def    text;
begin
  -- ── 1) 16 테이블 존재 + 2) RLS enabled ───────────────────────────────────
  foreach t in array tbls loop
    select exists (
      select 1 from information_schema.tables
       where table_schema='public' and table_name=t
    ) into rls_on;
    if not rls_on then
      raise exception 'FAIL 테이블 미생성: %', t;
    end if;

    select c.relrowsecurity into rls_on
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relname=t;
    if not coalesce(rls_on,false) then
      raise exception 'FAIL RLS 미활성: %', t;
    end if;
  end loop;

  -- ── 3) result_level CHECK 4값 적용(coverage_result_rules 기준) ────────────
  select pg_get_constraintdef(con.oid) into chk_def
    from pg_constraint con
    join pg_class c on c.oid=con.conrelid
    join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='coverage_result_rules'
     and con.contype='c'
     and pg_get_constraintdef(con.oid) ilike '%result_level%'
   limit 1;
  if chk_def is null then
    raise exception 'FAIL coverage_result_rules.result_level CHECK 제약 미존재.';
  end if;
  if chk_def not like '%부족%' or chk_def not like '%확인필요%'
     or chk_def not like '%점검필요%' or chk_def not like '%충분%' then
    raise exception 'FAIL result_level CHECK 4값 불일치: %', chk_def;
  end if;

  -- ── 4) 게이트 컬럼(status·exposure) 존재 — coverage_facts ─────────────────
  select count(*) into cnt
    from information_schema.columns
   where table_schema='public' and table_name='coverage_facts'
     and column_name in ('status','exposure','published_at');
  if cnt <> 3 then
    raise exception 'FAIL coverage_facts 게이트 컬럼(status/exposure/published_at) 누락. found=%', cnt;
  end if;

  -- ── 5) 대표 정책 존재 ────────────────────────────────────────────────────
  -- 공용: coverage_facts (select_gated + write_admin)
  select count(*) into cnt from pg_policies
   where schemaname='public' and tablename='coverage_facts'
     and policyname in ('coverage_facts_select_gated','coverage_facts_write_admin');
  if cnt <> 2 then
    raise exception 'FAIL coverage_facts 공용 정책 2개 미적재. found=%', cnt;
  end if;
  -- 개인: coverage_lead (owner)
  select count(*) into cnt from pg_policies
   where schemaname='public' and tablename='coverage_lead'
     and policyname='coverage_lead_owner';
  if cnt <> 1 then
    raise exception 'FAIL coverage_lead owner 격리 정책 미적재. found=%', cnt;
  end if;

  raise notice 'POSTVERIFY PASS: coverage_* 16테이블 생성 + RLS on + result_level 4값 CHECK + 게이트 컬럼 + 공용/개인 정책 정합.';
end $$;
