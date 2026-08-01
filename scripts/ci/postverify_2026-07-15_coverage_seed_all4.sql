-- CI 사후 검증 (🟢 읽기전용) — 보장분석 4축 공통 시드 적재
--   (db/migrations/2026-07-15_coverage_seed_all4.sql) 적용 직후 실행.
--
-- 검증 목표:
--   1) 마스터 4축(slug) 존재: cancer·brain_heart·surgery·medical.
--   2) 축별/테이블별 시드 행수 정합(원장 재배열 총 126 지식행 + 4 카테고리).
--   3) 전 지식행 status='reviewing' (고객 노출 게이트 유지 · approved/published 0).
--   4) 2축 exposure 매핑 정합: customer_ok=37 · internal_only=89 · customer_blocked=0.
--   5) result_level 전부 4값(부족/확인필요/점검필요/충분) 안 · 총 12행.
--   6) 의료실비(medical) 스캐폴딩: page_blocks≥4 · quiz≥1 · result_rule≥1.
--
-- 방식: coverage_* 조회(소유자 관점). 조건 불충족 시 RAISE EXCEPTION → psql ON_ERROR_STOP FAIL.
do $$
declare
  c_ok  int; c_int int; c_blk int; c_rev int; c_pub int;
  n     int;
begin
  -- ── 1) 마스터 4축 ─────────────────────────────────────────────────────────
  if (select count(*) from coverage_categories
        where slug in ('cancer','brain_heart','surgery','medical')) <> 4 then
    raise exception 'FAIL coverage_categories 4축 미적재.';
  end if;

  -- ── 2) 테이블별 행수 정합 ─────────────────────────────────────────────────
  if (select count(*) from coverage_facts)               <> 31 then raise exception 'FAIL coverage_facts != 31 (=%)',               (select count(*) from coverage_facts); end if;
  if (select count(*) from coverage_treatments)          <> 14 then raise exception 'FAIL coverage_treatments != 14 (=%)',          (select count(*) from coverage_treatments); end if;
  if (select count(*) from coverage_disease_tiers)       <> 6  then raise exception 'FAIL coverage_disease_tiers != 6 (=%)',        (select count(*) from coverage_disease_tiers); end if;
  if (select count(*) from coverage_special_care_rules)  <> 2  then raise exception 'FAIL coverage_special_care_rules != 2 (=%)',   (select count(*) from coverage_special_care_rules); end if;
  if (select count(*) from coverage_life_map)            <> 5  then raise exception 'FAIL coverage_life_map != 5 (=%)',            (select count(*) from coverage_life_map); end if;
  if (select count(*) from coverage_surgery_types)       <> 4  then raise exception 'FAIL coverage_surgery_types != 4 (=%)',        (select count(*) from coverage_surgery_types); end if;
  if (select count(*) from coverage_surgery_costs)       <> 6  then raise exception 'FAIL coverage_surgery_costs != 6 (=%)',        (select count(*) from coverage_surgery_costs); end if;
  if (select count(*) from coverage_insurance_gap_rules) <> 3  then raise exception 'FAIL coverage_insurance_gap_rules != 3 (=%)',  (select count(*) from coverage_insurance_gap_rules); end if;
  if (select count(*) from coverage_quiz_questions)      <> 10 then raise exception 'FAIL coverage_quiz_questions != 10 (=%)',      (select count(*) from coverage_quiz_questions); end if;
  if (select count(*) from coverage_result_rules)        <> 12 then raise exception 'FAIL coverage_result_rules != 12 (=%)',        (select count(*) from coverage_result_rules); end if;
  if (select count(*) from coverage_page_blocks)         <> 30 then raise exception 'FAIL coverage_page_blocks != 30 (=%)',         (select count(*) from coverage_page_blocks); end if;
  if (select count(*) from coverage_report_blocks)       <> 3  then raise exception 'FAIL coverage_report_blocks != 3 (=%)',        (select count(*) from coverage_report_blocks); end if;

  -- ── 3~4) 게이트 집계 (12 지식 테이블 UNION · status/exposure) ─────────────
  with g(status, exposure) as (
    select status, exposure from coverage_facts
    union all select status, exposure from coverage_treatments
    union all select status, exposure from coverage_disease_tiers
    union all select status, exposure from coverage_special_care_rules
    union all select status, exposure from coverage_life_map
    union all select status, exposure from coverage_surgery_types
    union all select status, exposure from coverage_surgery_costs
    union all select status, exposure from coverage_insurance_gap_rules
    union all select status, exposure from coverage_quiz_questions
    union all select status, exposure from coverage_result_rules
    union all select status, exposure from coverage_page_blocks
    union all select status, exposure from coverage_report_blocks
  )
  select
    count(*) filter (where exposure='customer_ok'),
    count(*) filter (where exposure='internal_only'),
    count(*) filter (where exposure='customer_blocked'),
    count(*) filter (where status='reviewing'),
    count(*) filter (where status in ('approved','published'))
  into c_ok, c_int, c_blk, c_rev, c_pub
  from g;

  -- 3) 전 지식행 reviewing · 고객노출 상태(approved/published) 0
  if c_pub <> 0 then
    raise exception 'FAIL 고객노출 status(approved/published) 존재: % (전 시드 reviewing 이어야 함)', c_pub;
  end if;
  if c_rev <> 126 then
    raise exception 'FAIL status=reviewing 지식행 != 126 (=%)', c_rev;
  end if;

  -- 4) exposure 매핑 정합
  if c_ok <> 37 then raise exception 'FAIL exposure customer_ok != 37 (=%)', c_ok; end if;
  if c_int <> 89 then raise exception 'FAIL exposure internal_only != 89 (=%)', c_int; end if;
  if c_blk <> 0  then raise exception 'FAIL exposure customer_blocked != 0 (=%)', c_blk; end if;

  -- ── 5) result_level 4값 안 · 12행 ────────────────────────────────────────
  select count(*) into n from coverage_result_rules
   where result_level not in ('부족','확인필요','점검필요','충분');
  if n <> 0 then
    raise exception 'FAIL result_level 4값 밖 행 존재: %', n;
  end if;

  -- ── 6) 의료실비 스캐폴딩 ─────────────────────────────────────────────────
  if (select count(*) from coverage_page_blocks    where category='medical') < 4 then raise exception 'FAIL medical page_blocks < 4.'; end if;
  if (select count(*) from coverage_quiz_questions where category='medical') < 1 then raise exception 'FAIL medical quiz < 1.'; end if;
  if (select count(*) from coverage_result_rules   where category='medical') < 1 then raise exception 'FAIL medical result_rule < 1.'; end if;

  raise notice 'POSTVERIFY PASS: 4축 시드 126지식행+4카테고리 · 전행 reviewing · exposure(ok=37/int=89/blk=0) · result_level 4값 · medical 스캐폴딩 정합.';
end $$;
