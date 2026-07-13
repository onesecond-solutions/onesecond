-- ═══════════════════════════════════════════════════════════════════════════
-- 🟠 시드 INSERT — 실비변천사(silson_generations) 1~5세대 원장 5행 적재
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️⚠️⚠️ 대표 승인 전 실행 금지. 이 파일은 검토용이며 아직 적용되지 않았다. ⚠️⚠️⚠️
--   실제 반영 = production-db Environment 대표 1클릭 승인(workflow_dispatch) 자리. 본 PR 머지만으로 DB 변경 없음.
--   db-migrate.yml 트리거 금지. 파일 준비만.
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
--    구버전(qursjteiovcylqiepmlo)은 2026-06-19 삭제됨 — 절대 참조 금지.
--
-- 목적:
--   db/migrations/2026-07-10_silson_generations_schema_with_search.sql 로 생성된
--   silson_generations 테이블에, 원장 5행(1~5세대)을 status='reviewing' 으로 적재한다.
--   (해당 스키마 파일 하단 안내: "시드는 별도 PR로 분리(검수 후) … 시드 INSERT도 실행 금지 게이트 적용" 이행.)
--
-- 진실 원천(유일):
--   docs/work_orders/2026-07-09_silson_generations_ledger_v2.json (5 row · 지어내기 0)
--
-- 컬럼 매핑(원장 필드 → 스키마 컬럼):
--   gen→gen, name→name, range→range_label, from→valid_from, to→valid_to,
--   재가입주기→rejoin_cycle, 갱신주기→renewal_cycle, 입원자기부담→copay_inpatient,
--   통원공제→copay_outpatient, 통원한도1일→outpatient_limit, 입원한도연간→inpatient_limit,
--   비급여구조→nonpayment_struct, 보험료할증→premium_surcharge, 한줄정리→one_liner,
--   검색키워드→search_keywords(text[]), notes→notes, boundary_note→boundary_note,
--   source→source, sort_order→sort_order.
--   status = 'reviewing'(원장 review_status). published_at 세팅 안 함(null).
--   gen1: from null → valid_from null. gen5: to null → valid_to null.
--
-- 멱등성: gen unique 제약 활용 → on conflict (gen) do nothing (재실행 시 중복 삽입 0).
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── gen 1 : 1세대 실손 (구실손) ──────────────────────────────────────────────
insert into silson_generations (
  gen, name, range_label, valid_from, valid_to,
  rejoin_cycle, renewal_cycle, copay_inpatient, copay_outpatient,
  outpatient_limit, inpatient_limit, nonpayment_struct, premium_surcharge, one_liner,
  search_keywords, notes, boundary_note, source, sort_order, status
) values (
  1, '1세대 실손 (구실손)', '~2009.9', null, '2009-09-30',
  '없음 (80~100세 유지)', '3년 또는 5년', '없음(100% 보장) · 생보사 가입분은 20%', '없음 (5~10만)',
  '25만', '5천만~1억', '급여+비급여 통합 보장', '없음', '자기부담 없는 최강 보장',
  array['1세대', '1세대 실손', '구실손', '2009년 이전', '자기부담 없음', '100% 보장'],
  '자기부담 거의 없어 보장 최강. 절대 유지 1순위. 2026.11부터 선택형 할인 특약(일부 보장 제외)으로 약 40% 할인 가능 — 유지하며 부담 낮추는 카드.',
  '2009년 9월까지 가입분. 하한 경계 없음(가장 오래된 세대).',
  '금융감독원·손해보험협회 실손 세대 구분', 1, 'reviewing'
)
on conflict (gen) do nothing;

-- ── gen 2 : 2세대 실손 (표준화실손) ──────────────────────────────────────────
insert into silson_generations (
  gen, name, range_label, valid_from, valid_to,
  rejoin_cycle, renewal_cycle, copay_inpatient, copay_outpatient,
  outpatient_limit, inpatient_limit, nonpayment_struct, premium_surcharge, one_liner,
  search_keywords, notes, boundary_note, source, sort_order, status
) values (
  2, '2세대 실손 (표준화실손)', '2009.10~2017.3', '2009-10-01', '2017-03-31',
  '초기(~2013.3) 없음 / 후기(2013.4~) 15년 재가입', '1년 또는 3년', '표준형 20% / 선택형 10%',
  '의원 1만 · 병원 1.5만 · 종합·상급 2만',
  '25만', '5천만', '급여+비급여 통합 보장', '없음', '표준약관 통일 · 본인부담 시작',
  array['2세대', '2세대 실손', '표준화실손', '표준약관', '2009년 10월', '2017년 3월', '본인부담 시작', '2013 재가입'],
  '표준약관 통일 세대. 2013.4.1 기준 초기(재가입 없음·100세 유지)/후기(15년 재가입) 갈림. 초기는 선택형 할인 특약 약 30% 할인, 후기는 15년 뒤 당시 판매 상품(5세대 등)으로 재가입.',
  '판정 시 세대 경계는 2009-10-01~2017-03-31. 단 2013-04-01 내부 분기(재가입 유무)는 세대 내 하위 판정 축 — 원장 유지 필요.',
  '금융감독원·손해보험협회 실손 세대 구분', 2, 'reviewing'
)
on conflict (gen) do nothing;

-- ── gen 3 : 3세대 실손 (착한실손) ────────────────────────────────────────────
insert into silson_generations (
  gen, name, range_label, valid_from, valid_to,
  rejoin_cycle, renewal_cycle, copay_inpatient, copay_outpatient,
  outpatient_limit, inpatient_limit, nonpayment_struct, premium_surcharge, one_liner,
  search_keywords, notes, boundary_note, source, sort_order, status
) values (
  3, '3세대 실손 (착한실손)', '2017.4~2021.6', '2017-04-01', '2021-06-30',
  '15년 재가입', '1년', '급여 10~20% · 비급여 20% · 3대비급여 특약 30%',
  '의원 1만 · 병원 1.5만 · 종합·상급 2만 · 3대비급여 별도',
  '급여+비급여 합산 30만 (3대비급여 별도)', '5천만', '도수·주사·MRI 3대 비급여 특약 분리', '없음', '도수·주사·MRI 따로 떼어냄',
  array['3세대', '3세대 실손', '착한실손', '2017년 4월', '2021년 6월', '도수치료', '비급여주사', 'MRI', '3대비급여'],
  '손해율 높은 3대 비급여(도수·비급여주사·MRI)를 특약 분리해 보험료 낮춘 세대. 비급여 자주 쓰는 고객은 유지 유리(5세대는 비중증 50%·한도 축소).',
  '2017-04-01~2021-06-30 가입분.',
  '금융감독원·손해보험협회 실손 세대 구분', 3, 'reviewing'
)
on conflict (gen) do nothing;

-- ── gen 4 : 4세대 실손 ───────────────────────────────────────────────────────
insert into silson_generations (
  gen, name, range_label, valid_from, valid_to,
  rejoin_cycle, renewal_cycle, copay_inpatient, copay_outpatient,
  outpatient_limit, inpatient_limit, nonpayment_struct, premium_surcharge, one_liner,
  search_keywords, notes, boundary_note, source, sort_order, status
) values (
  4, '4세대 실손', '2021.7~2026.5', '2021-07-01', '2026-05-05',
  '5년 재가입', '1년', '급여 20% · 비급여 30%',
  '급여 1·2만 / 비급여 3만 (또는 20~30% 중 큰 금액)',
  '급여 20만 · 비급여 20만 (별도)', '5천만', '비급여 전체 특약 분리 (할인·할증)',
  '비급여 청구액 100만↑ 시 다음 해 최대 300% 할증 · 무사고 시 할인', '싼 대신 비급여 쓸수록 할증',
  array['4세대', '4세대 실손', '2021년 7월', '2026년 5월', '비급여 할증', '비급여 특약 분리', '최대 300% 할증'],
  '비급여 전체 특약 분리 + 비급여 할증 도입해 보험료 최저. 2026.5.6 신규가입 종료. 5세대 전환 시 보험료↓ vs 비중증 보장↓ 저울질.',
  '2021-07-01~2026-05-05 가입분. 상한 경계 = 5세대 출시(2026-05-06) 전날.',
  '금융감독원·손해보험협회 실손 세대 구분 · 금융위·보건복지부 5세대 개편안', 4, 'reviewing'
)
on conflict (gen) do nothing;

-- ── gen 5 : 5세대 실손 ───────────────────────────────────────────────────────
insert into silson_generations (
  gen, name, range_label, valid_from, valid_to,
  rejoin_cycle, renewal_cycle, copay_inpatient, copay_outpatient,
  outpatient_limit, inpatient_limit, nonpayment_struct, premium_surcharge, one_liner,
  search_keywords, notes, boundary_note, source, sort_order, status
) values (
  5, '5세대 실손', '2026.5.6~', '2026-05-06', null,
  '5년 재가입', '1년', '급여 20% 유지 · 중증 30% / 비중증 50%',
  '급여 20%(1·2만) · 중증 30% / 비중증 50%',
  '비중증 20만 (합산 한도)', '중증 5천만 · 비중증 1천만', '중증·비중증 차등 (비중증 축소)',
  '비급여 사용량 따라 갱신료 2~4배 상승 가능 (비급여 차등 강화)', '큰 병 두껍게, 가벼운 건 얇게',
  array['5세대', '5세대 실손', '2026년 5월', '중증 비중증', '중증·비중증 차등', '비중증 축소', '관리급여', '5세대 개편'],
  '비급여를 중증·비중증 분리가 핵심. 4세대 대비 약 30%·1·2세대 대비 50%+ 저렴. 중증(암·뇌혈관·심장·희귀난치성): 자기부담 30% 유지·한도 5천만·연 자기부담 상한 500만 신설. 비중증(도수·체외충격파·주사·MRI): 30→50%·한도 5천만→1천만·통원 1일 최대 20만·일부 면책. 신규 보장: 임신·출산·발달장애 급여 의료비. 1·2세대 전환·유지 제도(2026.11 시행): 선택형 할인 특약(1세대 40%/2세대 30%), 계약전환 할인(1·2세대→5세대 3년간 50% 할인, 2026.11부터 6개월 한시), 전환 후 6개월 이내 철회. 관리급여(도수·영양제 주사 가격 통제) 2026.11 시행 예정.',
  '2026-05-06~ 가입분. 하한 경계 = 4세대 종료 다음 날.',
  '금융위·보건복지부 5세대 개편안 · KB손해보험 GA소식지 2026.07 · 보험연구원 「5세대 실손 상생방안」(2025.12)', 5, 'reviewing'
)
on conflict (gen) do nothing;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK (되돌리기) — 아래 블록의 주석을 해제해 실행하면 시드 5행이 제거된다.
-- ═══════════════════════════════════════════════════════════════════════════
-- begin;
--   delete from silson_generations where gen in (1,2,3,4,5) and status='reviewing';
-- commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- 검증(🟢 읽기전용) — 적용 후 실행.
--   (동반 사후검증: scripts/ci/postverify_2026-07-13_silson_generations_seed.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- select gen, name, status from silson_generations order by gen;
--   PASS 기대: 5행, gen 1~5, status 전부 'reviewing'
