-- CI 사후 검증 (🟢 읽기전용) — 실비변천사(silson_generations) 시드 5행 적재
--   (db/migrations/2026-07-13_silson_generations_seed.sql) 적용 직후 실행.
--
-- 검증 목표:
--   1) 총 5행 적재.
--   2) gen 중복 없음(1~5 각 1행).
--   3) search_keywords 누락 없음(전 행 배열 존재 + 길이 1 이상).
--   4) 전 행 status='reviewing' (대표 승인 전 게이트 유지).
--
-- 방식: silson_generations 테이블 조회(읽기전용). 조건 불충족 시 RAISE EXCEPTION
--   → psql(ON_ERROR_STOP=1) 종료코드!=0 → apply_and_verify.sh 가 FAIL 처리. DML/DDL 없음.
do $$
begin
  -- ── 1) 총 5행 ────────────────────────────────────────────────────────────
  if (select count(*) from silson_generations) <> 5 then
    raise exception 'FAIL silson_generations 행수 5 아님. count=%', (select count(*) from silson_generations);
  end if;

  -- ── 2) gen 중복 없음 ─────────────────────────────────────────────────────
  if (select count(distinct gen) from silson_generations) <> 5 then
    raise exception 'FAIL silson_generations.gen 중복 존재. distinct count=%', (select count(distinct gen) from silson_generations);
  end if;

  -- ── 3) search_keywords 누락 없음 ─────────────────────────────────────────
  if exists (
    select 1 from silson_generations
     where search_keywords is null or array_length(search_keywords, 1) is null
  ) then
    raise exception 'FAIL silson_generations.search_keywords 누락 행 존재.';
  end if;

  -- ── 4) 전 행 status='reviewing' ──────────────────────────────────────────
  if (select count(*) from silson_generations where status='reviewing') <> 5 then
    raise exception 'FAIL silson_generations.status 전부 reviewing 아님. reviewing count=%', (select count(*) from silson_generations where status='reviewing');
  end if;

  raise notice 'POSTVERIFY OK: silson 시드 5행·gen무중복·검색키워드有·reviewing';
end $$;
