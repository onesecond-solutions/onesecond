-- ═══════════════════════════════════════════════════════════════════════════
-- 🟠 시드 INSERT — 보장분석 4축(암·뇌/심장·수술비·의료실비) 공통 원장 적재
--    표준 계약서 v1 §3 게이트대로 전 행 status='reviewing' 으로만 적재(고객 미노출).
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️⚠️⚠️ 초안(DRAFT) — 대표 승인 전 실행 금지. 이 파일은 검토용이며 아직 적용되지 않았다. ⚠️⚠️⚠️
--   실제 반영 = production-db Environment 대표 1클릭 승인(db-migrate.yml workflow_dispatch) 자리.
--   본 PR 머지만으로 DB 변경 없음. db-migrate.yml 트리거 금지. 파일 준비만.
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
--    구버전(qursjteiovcylqiepmlo)은 2026-06-19 삭제됨 — 절대 참조 금지.
--
-- 선행: db/migrations/2026-07-15_coverage_schema_all4.sql (16 테이블) 먼저 적용.
--
-- 진실 원천(원장 3종, 지어내기 0 · 원장 값만 재배열):
--   scratchpad/cov3/cancer_db_seed_draft_v0_2.json
--   scratchpad/cov3/brain_heart_db_seed_draft_v0_1.json
--   scratchpad/cov3/surgery_db_seed_draft_v0_1.json
--   (+ 각 축 *_page_blocks_v0_*.json → coverage_page_blocks)
--   의료실비(medical) = 원장 없음 → coverage_categories 1행 + 최소 스캐폴딩(silson_generations 세대 판정 흐름).
--
-- 2축 게이트 매핑(계약서 §3):
--   status = 'reviewing'  (전 행 · 대표 승인 전 게이트. 고객 조회 = approved/published + customer_ok 만 → 현재 전부 미노출).
--   exposure = review_status 매핑:
--     reviewed_official / reviewed_official_for_support_basis / customer_ok → customer_ok
--     needs_source_url_verification / internal_only / reviewing              → internal_only
--     blocked                                                               → customer_blocked
--     (그 외 · review_status 없음: quiz/result_rules/page_blocks/report_blocks) → internal_only
--
-- 판정 라벨 정규화(계약서 §6 · result_level 4값 CHECK = 부족/확인필요/점검필요/충분):
--   원장 소프트 표현을 4값으로 정규화하고, 원문 표현은 title 에 보존(재배열, 지어내기 아님):
--     '확인 필요'→확인필요 · '구조 확인'→확인필요
--     '부족 가능성'→부족 · '보완 검토'→부족
--     '점검 필요'→점검필요
--     '상대적으로 양호'→충분
--
-- 멱등성: 각 테이블 자연키 unique + on conflict do nothing (재실행 중복 0).
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ════════════════════════════════════════════════════════════════════════════
-- 0. 마스터 : coverage_categories (4축 · slug 자연키)
-- ════════════════════════════════════════════════════════════════════════════
insert into coverage_categories (slug, name, description, sort_order, status) values
  ('medical',     '의료실비',   '실손 세대(1~5세대) 판정 흐름. 기존 라이브 silson_generations 재사용(확장 테이블 신설 없음).', 1, 'reviewing'),
  ('cancer',      '암',         '암 발생·생존·치료비·산정특례 공백 기반 보장분석 축(treatments 중심, 확장 없음).', 2, 'reviewing'),
  ('brain_heart', '뇌·심장',    '뇌혈관·심장질환 발생·예후·담보 범위(3단)·산정특례 30일 공백 축.', 3, 'reviewing'),
  ('surgery',     '수술비',     '반복·고빈도·체감형 수술비 축. 수술 종류·지급 유형·실손 공백을 함께 봄.', 4, 'reviewing')
on conflict (slug) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- 1. coverage_facts
-- ════════════════════════════════════════════════════════════════════════════

-- ── 암(cancer) facts 8 ──────────────────────────────────────────────────────
insert into coverage_facts
  (category, fact_group, fact_key, label, value_num, value_text, unit, display_text, usage,
   source_name, publisher, source_url, as_of, review_status, exposure, status, display_order) values
  ('cancer','stats_incidence','new_cancer_patients_2023_total','2023년 신규 암환자',288613,null,'명','288,613명',
   '["page_stats","report_context"]','2023년 국가암등록통계','보건복지부·중앙암등록본부',
   'https://www.mohw.go.kr/board.es?act=view&bid=0027&list_no=1488742&mid=a10503010100&nPage=1&tag=','2026-01','reviewed_official','customer_ok','reviewing',1),
  ('cancer','stats_incidence','lifetime_cancer_probability_male','남자 평생 암 확률',44.6,null,'%','약 2명 중 1명',
   '["page_hero","quiz_result","report_summary"]','2023년 국가암등록통계','보건복지부·중앙암등록본부',
   'https://www.cancer.go.kr/download.do?uuid=60932fec-9b3c-48f8-aedc-7811aa3f1565.pdf','2026-01','reviewed_official','customer_ok','reviewing',2),
  ('cancer','stats_incidence','lifetime_cancer_probability_female','여자 평생 암 확률',38.2,null,'%','약 3명 중 1명',
   '["page_hero","quiz_result","report_summary"]','2023년 국가암등록통계','보건복지부·중앙암등록본부',
   'https://www.cancer.go.kr/download.do?uuid=60932fec-9b3c-48f8-aedc-7811aa3f1565.pdf','2026-01','reviewed_official','customer_ok','reviewing',3),
  ('cancer','stats_survival','five_year_survival_overall_2019_2023','전체 5년 상대생존율',73.7,null,'%','10명 중 7명 이상 5년 생존',
   '["page_survival","report_context"]','2023년 국가암등록통계','보건복지부·중앙암등록본부',
   'https://www.cancer.go.kr/download.do?uuid=60932fec-9b3c-48f8-aedc-7811aa3f1565.pdf','2026-01','reviewed_official','customer_ok','reviewing',4),
  ('cancer','stats_survival','five_year_survival_local_stage','조기 국한 병기 5년 상대생존율',92.7,null,'%','조기 발견 시 92.7%',
   '["page_survival","report_context"]','2023년 국가암등록통계','보건복지부·중앙암등록본부',
   'https://www.cancer.go.kr/download.do?uuid=60932fec-9b3c-48f8-aedc-7811aa3f1565.pdf','2026-01','reviewed_official','customer_ok','reviewing',5),
  ('cancer','stats_survival','five_year_survival_distant_stage','원격전이 병기 5년 상대생존율',27.8,null,'%','전이 후 발견 시 27.8%',
   '["page_survival","report_context"]','2023년 국가암등록통계','보건복지부·중앙암등록본부',
   'https://www.cancer.go.kr/download.do?uuid=60932fec-9b3c-48f8-aedc-7811aa3f1565.pdf','2026-01','reviewed_official','customer_ok','reviewing',6),
  ('cancer','public_support','special_calculation_cancer_copay_rate','암 산정특례 본인부담률',5,null,'%','건강보험 급여 항목은 산정특례 적용 시 본인부담 5%',
   '["page_public_support","report_disclaimer"]','본인일부부담금 산정특례 제도','국민건강보험공단',
   'https://www.nhis.or.kr/static/html/wbma/c/wbmac0215.html','current','reviewed_official','customer_ok','reviewing',7),
  ('cancer','public_support','special_calculation_exclusions','산정특례 제외 항목',null,'비급여, 100분의100 전액본인부담, 선별급여 등 제외 가능',null,'산정특례는 급여 부담을 낮추지만 비급여 공백까지 없애지는 않습니다.',
   '["page_gap","report_disclaimer"]','산정특례제도 안내','국민건강보험공단',
   'https://www.nhis.or.kr/static/alim/paper/oldpaper/202306/sub/section1_5.html','current','reviewed_official','customer_ok','reviewing',8)
on conflict (category, fact_key) do nothing;

-- ── 뇌/심장(brain_heart) facts 14 ───────────────────────────────────────────
insert into coverage_facts
  (category, fact_group, fact_key, label, value_num, value_text, unit, display_text, usage,
   source_name, publisher, source_url, as_of, review_status, exposure, status, display_order) values
  ('brain_heart','stats_incidence','stroke_annual_cases_2023','뇌졸중 연간 발생',113098,null,'건','연 113,098건',
   '["page_incidence","report_summary"]','2023 심뇌혈관질환 발생통계','질병관리청',null,'2023','customer_ok','customer_ok','reviewing',1),
  ('brain_heart','stats_incidence','myocardial_infarction_annual_cases_2023','심근경색 연간 발생',34768,null,'건','연 34,768건',
   '["page_incidence","report_summary"]','2023 심뇌혈관질환 발생통계','질병관리청',null,'2023','customer_ok','customer_ok','reviewing',2),
  ('brain_heart','stats_incidence','myocardial_infarction_incidence_male_per_100k','남자 심근경색 발생률',102.0,null,'건/10만명','남자 102.0건/10만명',
   '["page_incidence","report_summary"]','2023 심뇌혈관질환 발생통계','질병관리청',null,'2023','customer_ok','customer_ok','reviewing',3),
  ('brain_heart','stats_incidence','myocardial_infarction_incidence_female_per_100k','여자 심근경색 발생률',34.2,null,'건/10만명','여자 34.2건/10만명',
   '["page_incidence","report_summary"]','2023 심뇌혈관질환 발생통계','질병관리청',null,'2023','customer_ok','customer_ok','reviewing',4),
  ('brain_heart','stats_incidence_age','stroke_incidence_50s_per_100k','50대 뇌졸중 발생률',178.3,null,'건/10만명','50대 178.3건/10만명',
   '["page_age_bars","report_summary"]','2023 심뇌혈관질환 발생통계','질병관리청',null,'2023','customer_ok','customer_ok','reviewing',5),
  ('brain_heart','stats_incidence_age','stroke_incidence_60s_per_100k','60대 뇌졸중 발생률',351.1,null,'건/10만명','60대 351.1건/10만명',
   '["page_age_bars","report_summary"]','2023 심뇌혈관질환 발생통계','질병관리청',null,'2023','customer_ok','customer_ok','reviewing',6),
  ('brain_heart','stats_incidence_age','stroke_incidence_70s_per_100k','70대 뇌졸중 발생률',729.5,null,'건/10만명','70대 729.5건/10만명',
   '["page_age_bars","report_summary"]','2023 심뇌혈관질환 발생통계','질병관리청',null,'2023','customer_ok','customer_ok','reviewing',7),
  ('brain_heart','stats_incidence_age','stroke_incidence_80plus_per_100k','80대 이상 뇌졸중 발생률',1507.5,null,'건/10만명','80대 이상 1,507.5건/10만명',
   '["page_age_bars","report_summary"]','2023 심뇌혈관질환 발생통계','질병관리청',null,'2023','customer_ok','customer_ok','reviewing',8),
  ('brain_heart','stats_outcome','stroke_30day_fatality_2023','뇌졸중 30일 치명률',7.5,null,'%','30일 치명률 7.5%',
   '["page_outcome","report_summary"]','2023 심뇌혈관질환 발생통계','질병관리청',null,'2023','customer_ok','customer_ok','reviewing',9),
  ('brain_heart','stats_outcome','stroke_1year_fatality_65plus_2023','65세 이상 뇌졸중 1년 치명률',31.2,null,'%','65세 이상 31.2%',
   '["page_outcome","report_summary"]','2023 심뇌혈관질환 발생통계','질병관리청',null,'2023','customer_ok','customer_ok','reviewing',10),
  ('brain_heart','stats_outcome','stroke_disability_registration_rate','뇌졸중 신규환자 장애등록률',28.3,null,'%','장애등록률 28.3%',
   '["page_outcome","report_aftercare"]','뇌졸중 신규환자의 10년간 의료이용 분석','보건복지부·국립재활원',null,'10년 추적 분석','customer_ok','customer_ok','reviewing',11),
  ('brain_heart','stats_outcome','stroke_neurological_impairment_after_survival','뇌졸중 생존 후 신경손상 잔존',60,null,'%+','생존 환자의 60% 이상',
   '["page_outcome_internal","report_aftercare_internal"]','기획팀장 기존 조사 자산','추가 원문 검증 필요',null,'unknown','internal_only','internal_only','reviewing',12),
  ('brain_heart','public_support','special_care_brain_heart_duration','뇌혈관·심장질환 산정특례 기간',30,null,'일','조건 충족 시 최대 30일',
   '["page_special_care","report_public_support"]','본인일부부담금 산정특례 제도','국민건강보험공단',null,'current','customer_ok','customer_ok','reviewing',13),
  ('brain_heart','public_support','special_care_cancer_duration_compare','암 산정특례 기간 비교',5,null,'년','암은 확진 등록 후 5년',
   '["page_special_care","report_public_support"]','본인일부부담금 산정특례 제도','국민건강보험공단',null,'current','customer_ok','customer_ok','reviewing',14)
on conflict (category, fact_key) do nothing;

-- ── 수술비(surgery) facts 9 (rank→display_order · note→value_text) ───────────
insert into coverage_facts
  (category, fact_group, fact_key, label, value_num, value_text, unit, display_text, usage,
   source_name, publisher, source_url, as_of, review_status, exposure, status, display_order) values
  ('surgery','stats_volume','major_surgeries_2024_total','35개 주요수술 연간 건수',2054344,null,'건','연 205만 4,344건',
   '[]','2024년 주요수술 통계연보','국민건강보험공단',null,'2025-12 발표','customer_ok','customer_ok','reviewing',1),
  ('surgery','stats_volume','average_medical_cost_per_surgery','건당 평균 진료비',4530000,null,'원','건당 평균 453만 원',
   '[]','2024년 주요수술 통계연보','국민건강보험공단',null,'2025-12 발표','customer_ok','customer_ok','reviewing',2),
  ('surgery','stats_volume','total_medical_cost_major_surgeries','주요수술 진료비 총액',9307500000000,null,'원','9조 3,075억 원',
   '[]','2024년 주요수술 통계연보','국민건강보험공단',null,'2025-12 발표','customer_ok','customer_ok','reviewing',3),
  ('surgery','top_surgeries','cataract_rank_1','백내장',664306,'5년 연속 1위, 국민 수술의 대표 사례','건','66만 4,306건',
   '[]','2024년 주요수술 통계연보','국민건강보험공단',null,'2025-12 발표','customer_ok','customer_ok','reviewing',1),
  ('surgery','top_surgeries','spine_rank_2','일반척추',202099,'진료비 총액 1위 후보','건','20만 2,099건',
   '[]','2024년 주요수술 통계연보','국민건강보험공단',null,'2025-12 발표','customer_ok','customer_ok','reviewing',2),
  ('surgery','top_surgeries','cesarean_rank_3','제왕절개',160804,'출생아 반등 영향으로 증가','건','16만 804건',
   '[]','2024년 주요수술 통계연보','국민건강보험공단',null,'2025-12 발표','customer_ok','customer_ok','reviewing',3),
  ('surgery','age_volume','surgery_patients_60s_rank_1','60대 수술 인원',399000,'수술 인원 1위 연령대','명','39.9만 명',
   '[]','2024년 주요수술 통계연보','국민건강보험공단',null,'2025-12 발표','customer_ok','customer_ok','reviewing',1),
  ('surgery','age_volume','surgery_patients_70s_rank_2','70대 수술 인원',377000,'2위 연령대','명','37.7만 명',
   '[]','2024년 주요수술 통계연보','국민건강보험공단',null,'2025-12 발표','customer_ok','customer_ok','reviewing',2),
  ('surgery','age_volume','surgery_patients_50s_rank_3','50대 수술 인원',231000,'수술이 체감되기 시작하는 연령대','명','23.1만 명',
   '[]','2024년 주요수술 통계연보','국민건강보험공단',null,'2025-12 발표','customer_ok','customer_ok','reviewing',3)
on conflict (category, fact_key) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. coverage_treatments
-- ════════════════════════════════════════════════════════════════════════════

-- ── 암(cancer) treatments 6 (organ_group null) ──────────────────────────────
insert into coverage_treatments
  (category, organ_group, method, subtype, coverage_type, cost_min, cost_max, cost_unit, display_cost,
   insurance_gap_note, source_name, review_status, exposure, status, display_order) values
  ('cancer',null,'수술','개복·복강경 수술','급여',null,null,'급여 본인부담','산정특례 적용 시 급여 본인부담 5%',
   '표준 급여 수술은 산정특례로 부담이 낮아질 수 있음','산정특례 근거 fact: special_calculation_cancer_copay_rate','reviewed_official_for_support_basis','customer_ok','reviewing',1),
  ('cancer',null,'수술','로봇수술','비급여',10000000,14000000,'회당','회당 약 1,000만~1,400만 원',
   '비급여 수술은 산정특례·실손 보상 구조 확인 필요','보맵프렌즈 2026.2 조사 필요','needs_source_url_verification','internal_only','reviewing',2),
  ('cancer',null,'항암','표적항암 급여','급여',3000000,4000000,'연간 환자 부담 추정','급여 적용 시 연 300~400만 원 수준',
   '적응증 일치 여부가 핵심','뱅크샐러드 2025.12 조사 필요','needs_source_url_verification','internal_only','reviewing',3),
  ('cancer',null,'항암','표적항암 비급여','비급여',20000000,null,'총액','총 2,000만 원 이상 가능',
   '통원 치료가 많아 실손 통원 한도 공백 가능','뱅크샐러드 2025.12 조사 필요','needs_source_url_verification','internal_only','reviewing',4),
  ('cancer',null,'항암','면역항암 비급여','비급여',70000000,70000000,'연간','연 약 7,000만 원',
   '급여 적응증 불일치 시 전액 본인부담 가능','서울대보라매병원·뉴스타파 2026.4 조사 필요','needs_source_url_verification','internal_only','reviewing',5),
  ('cancer',null,'방사선','중입자치료','비급여',50000000,80000000,'총액','약 5,000만~8,000만 원',
   '대부분 통원 진행 시 실손 통원 한도 공백 가능','뱅크샐러드·교보생명 뉴스룸 2026 조사 필요','needs_source_url_verification','internal_only','reviewing',6)
on conflict (category, method, subtype) do nothing;

-- ── 뇌/심장(brain_heart) treatments 8 (organ_group brain/heart) ─────────────
insert into coverage_treatments
  (category, organ_group, method, subtype, coverage_type, cost_min, cost_max, cost_unit, display_cost,
   insurance_gap_note, review_status, exposure, status, display_order) values
  ('brain_heart','brain','급성기 치료','혈전용해·혈전제거술','급여',null,null,'급여 본인부담','조건 충족 시 산정특례 급여 본인부담 5%',
   '골든타임 치료는 급여 축이지만 산정특례는 30일 기준이며 이후 재활·추적검사는 별도 부담 가능성이 있습니다.','customer_ok','customer_ok','reviewing',1),
  ('brain_heart','brain','뇌동맥류 치료','코일색전술','급여+비급여 혼재',10000000,null,'치료 과정','총 1,000만 원 이상 가능',
   '특례로 경감돼도 재료·추적검사·비급여 부담이 남을 수 있습니다.','internal_only','internal_only','reviewing',2),
  ('brain_heart','brain','뇌출혈 수술','개두술·결찰술','급여+비급여 혼재',4000000,5000000,'치료 과정','비급여 400~500만 원 잔존 가능',
   '산정특례를 받아도 비급여가 남을 수 있어 ‘특례=공짜’가 아닙니다.','internal_only','internal_only','reviewing',3),
  ('brain_heart','brain','입원·재활','뇌졸중 입원·재활','급여+비급여 혼재',15930000,15930000,'연간','1인당 연 1,593만 원',
   '후유증이 있으면 재활·간병·교통비·소득공백이 장기화될 수 있습니다.','internal_only','internal_only','reviewing',4),
  ('brain_heart','heart','관상동맥 시술','스텐트(관상동맥중재술)','급여+비급여 혼재',1000000,7000000,'치료 과정','본인부담 100~300만 + 비급여 가능',
   '협심증·심근경색 표준 치료지만 담보명이 급성심근경색만이면 협심증 단계는 진단비 공백 가능성이 있습니다.','internal_only','internal_only','reviewing',5),
  ('brain_heart','heart','심장 수술','관상동맥우회술','급여+비급여 혼재',26900000,26900000,'치료 과정','총 약 2,690만 원',
   '큰 수술비와 회복 기간을 고려하면 진단비뿐 아니라 수술비·입원비·생활비 점검이 필요합니다.','internal_only','internal_only','reviewing',6),
  ('brain_heart','heart','부정맥 시술','전극도자절제술','급여',null,null,'시술','비용 단정 금지, 재발·재시술 가능성 중심',
   '급성심근경색 진단비로는 부정맥 시술이 보장 공백일 수 있습니다. 확대형 담보 여부 확인이 필요합니다.','internal_only','internal_only','reviewing',7),
  ('brain_heart','heart','약물 관리','항혈전제 등 장기 관리','급여',50000,150000,'월','월 5~15만 원 지속 가능',
   '수술이 없으면 산정특례 대상이 아닐 수 있고, 장기 약물·검사 비용이 지속됩니다.','internal_only','internal_only','reviewing',8)
on conflict (category, method, subtype) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. 축별 확장 — 뇌/심장
-- ════════════════════════════════════════════════════════════════════════════

-- ── coverage_disease_tiers 6 ────────────────────────────────────────────────
insert into coverage_disease_tiers
  (category, organ_group, tier_level, tier_label, coverage_name, code_range, includes, excludes,
   share_note, customer_warning, review_status, exposure, status, display_order) values
  ('brain_heart','brain',1,'좁음','뇌출혈 진단비','I60~I62',
   array['지주막하출혈','뇌내출혈','기타 비외상성 두개내출혈'],array['뇌경색','미파열 뇌동맥류','뇌혈관질환 후유증'],
   '뇌졸중 중 출혈성 범위 중심','가장 흔한 뇌경색은 보장 공백 가능성이 있습니다.','reviewing','internal_only','reviewing',1),
  ('brain_heart','brain',2,'중간','뇌졸중 진단비','I60~I64',
   array['뇌출혈','뇌경색','출혈 또는 경색으로 명시되지 않은 뇌졸중'],array['미파열 뇌동맥류','기타 뇌혈관질환','후유증'],
   '뇌경색 포함으로 흔한 케이스를 넓게 커버','미파열 동맥류나 후유증까지는 상품별 확인이 필요합니다.','reviewing','internal_only','reviewing',2),
  ('brain_heart','brain',3,'넓음','뇌혈관질환 진단비','I60~I69',
   array['뇌출혈','뇌경색','기타 뇌혈관질환','후유증'],array[]::text[],
   '뇌 담보 3단 중 가장 넓은 축','보장명은 넓어도 지급 조건·면책·감액은 증권 확인이 필요합니다.','reviewing','internal_only','reviewing',3),
  ('brain_heart','heart',1,'좁음','급성심근경색 진단비','I21~I23',
   array['급성심근경색','후속심근경색','급성심근경색 합병증'],array['협심증','기타 허혈성심장질환','부정맥','심부전'],
   '심장 담보 중 가장 좁은 축','협심증·부정맥 시술은 보장 공백 가능성이 있습니다.','reviewing','internal_only','reviewing',4),
  ('brain_heart','heart',2,'중간','허혈성심장질환 진단비','I20,I21,I22,I23,I24,I25',
   array['협심증','급성심근경색','기타 허혈성심장질환'],array['부정맥','심부전','심근병증'],
   '협심증까지 포함하는 실전형 심장 담보','부정맥·심부전은 상품별 확대형 여부 확인이 필요합니다.','reviewing','internal_only','reviewing',5),
  ('brain_heart','heart',3,'넓음','심장질환 확대 진단비','I20~I25 + I42~I50 등',
   array['허혈성심장질환','부정맥 관련 일부','심부전','심근병증 등'],array[]::text[],
   '상품별 약관상 포함 범위 차이가 커서 원문 확인 필요','확대형 명칭이어도 약관상 코드 범위는 반드시 확인해야 합니다.','reviewing','internal_only','reviewing',6)
on conflict (category, organ_group, tier_level) do nothing;

-- ── coverage_special_care_rules 2 ───────────────────────────────────────────
insert into coverage_special_care_rules
  (category, rule_key, label, compare_with, duration_text, applies_when, exclusions, warning_message,
   review_status, exposure, status, display_order) values
  ('brain_heart','brain_heart_special_care_30days','뇌혈관·심장질환 산정특례 30일','cancer','조건 충족 시 최대 30일',
   '입원 및 고시된 수술·약제투여 등 요건 충족 시',
   array['비급여','전액본인부담','간병비','상급병실료','조건 미충족 약물치료'],
   '암과 달리 뇌·심장은 30일 이후 재활·추적검사·간병 부담이 길게 남을 수 있습니다.','customer_ok','customer_ok','reviewing',1),
  ('brain_heart','no_procedure_no_special_care','수술·약제투여 등 조건 미충족 시 특례 공백',null,'적용 없음 가능',
   '약물 보존치료, 조건 미충족 외래·검사 등',
   array['협심증 약물치료','부정맥 약물관리','수술 없는 뇌경색 관리'],
   '수술이 없으면 산정특례가 없을 수 있으므로 진단비와 생활비 대비가 더 중요합니다.','reviewing','internal_only','reviewing',2)
on conflict (category, rule_key) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. 축별 확장 — 수술비
-- ════════════════════════════════════════════════════════════════════════════

-- ── coverage_life_map 5 ─────────────────────────────────────────────────────
insert into coverage_life_map
  (category, age_band, label, top_surgeries, message, review_status, exposure, status, display_order) values
  ('surgery','10s_20s','10~20대',array['편도절제','충수절제','제왕절개 일부'],'젊은 연령대도 갑작스러운 수술은 발생한다.','internal_only','internal_only','reviewing',1),
  ('surgery','30s','30대',array['제왕절개','충수절제','치핵'],'출산·생활습관 관련 수술이 체감된다.','internal_only','internal_only','reviewing',2),
  ('surgery','40s','40대',array['치핵','담낭절제','척추 관련 수술'],'생활형 수술과 누적 질환 수술이 나타난다.','internal_only','internal_only','reviewing',3),
  ('surgery','50s','50대',array['백내장','일반척추','하지정맥류·담낭절제'],'50대부터 백내장이 급증하고 척추 수술이 체감된다.','customer_ok','customer_ok','reviewing',4),
  ('surgery','60plus','60대 이상',array['백내장','일반척추','슬관절치환'],'수술 인원 1위 구간. 반복 수술·긴 입원 가능성까지 함께 봐야 한다.','customer_ok','customer_ok','reviewing',5)
on conflict (category, age_band) do nothing;

-- ── coverage_surgery_types 4 ────────────────────────────────────────────────
insert into coverage_surgery_types
  (category, type_key, type_name, payment_rule, coverage_style, strength, caution, review_status, exposure, status, display_order) values
  ('surgery','disease_injury_surgery','질병·상해 수술비','수술 종류 불문 회당 정액','가장 넓은 기본기','반복 지급과 폭넓은 수술 대응',
   '난이도와 관계없이 동일액인 경우가 많아 고난도 수술에는 금액 체감이 약할 수 있다.','internal_only','internal_only','reviewing',1),
  ('surgery','graded_surgery','종수술비','수술 난이도별 1~5종 등 차등 정액','난이도 반영형','고난도 수술에 큰 금액이 붙을 수 있다.',
   '보험사·상품·가입시기별 분류표가 달라 특정 수술의 종수 단정 금지.','internal_only','internal_only','reviewing',2),
  ('surgery','listed_major_surgery','N대 수술비','약관에 열거된 특정 수술만 지급','중대수술 집중형','해당 수술에는 강하게 작동할 수 있다.',
   '열거 밖이면 보장 공백 가능성. 이름보다 약관 분류표 확인이 우선.','internal_only','internal_only','reviewing',3),
  ('surgery','repeat_payment_principle','반복 지급 원칙','재수술·다른 부위 수술에도 반복 지급 가능','수술비의 정체성','진단비 1회성과 다른 핵심 가치',
   '동시 수술은 최고액 1건만 지급되는 경우가 많아 약관 확인 필요.','internal_only','internal_only','reviewing',4)
on conflict (category, type_key) do nothing;

-- ── coverage_surgery_costs 6 ────────────────────────────────────────────────
insert into coverage_surgery_costs
  (category, surgery_key, surgery_name, coverage_type, cost_min, cost_max, cost_unit, display_cost, gap_note,
   review_status, exposure, status, display_order) values
  ('surgery','cataract_monofocal','백내장 단초점렌즈','급여',200000,300000,null,'눈당 20~30만 원 수준',
   '국민 수술 1위의 기본형. 급여 수술 자체는 감당 가능한 축이다.','internal_only','internal_only','reviewing',1),
  ('surgery','cataract_multifocal','백내장 다초점렌즈','비급여',2000000,5000000,null,'눈당 200~500만 원 흔함',
   '노안 교정 목적 선택이 붙으면 비급여가 커진다. 병원별 가격차가 매우 크다.','internal_only','internal_only','reviewing',2),
  ('surgery','cataract_multifocal_both_eyes','백내장 다초점 양안','비급여',4000000,10000000,null,'양안 400~1,000만 원+ 가능',
   '국민 수술 1위에 붙는 국민 비급여. 고객 체감도가 크다.','internal_only','internal_only','reviewing',3),
  ('surgery','varicose_vein','하지정맥류 수술','급여+비급여 혼재',300000,1600000,null,'중간 30~160만 원',
   '수술법별·기관별 가격차가 크고 비급여가 섞일 수 있다.','internal_only','internal_only','reviewing',4),
  ('surgery','knee_replacement','슬관절치환','급여+비급여 혼재',null,null,null,'급여 중심 + 긴 입원',
   '입원일수 19.4일로 긴 편. 치료비보다 입원·간병·생활비 체감이 커질 수 있다.','customer_ok','customer_ok','reviewing',5),
  ('surgery','hemorrhoid','치핵 수술','급여',1190000,1190000,null,'건당 119만 원',
   '건당 진료비 기준. 본인부담은 건강보험 적용 후 일부다.','customer_ok','customer_ok','reviewing',6)
on conflict (category, surgery_key) do nothing;

-- ── coverage_insurance_gap_rules 3 ──────────────────────────────────────────
insert into coverage_insurance_gap_rules
  (category, rule_key, label, condition_text, warning_message, report_message, review_status, exposure, status, display_order) values
  ('surgery','cataract_outpatient_limit_gap','백내장 통원 한도 공백','입원으로 인정되지 않고 당일 통원 처리되는 경우',
   '실손은 통원 한도만 적용될 수 있어 다초점렌즈 비용 앞에서는 공백이 생길 수 있다.',
   '실손은 영수증 일부를 보상하는 구조이고, 정액 수술비는 수술 사실에 반응하는 별도 구조다.','internal_only','internal_only','reviewing',1),
  ('surgery','graded_surgery_table_gap','종수술비 분류표 차이','보험사·상품·가입시기에 따라 종수 분류가 다른 경우',
   '같은 수술도 상품별 분류표에 따라 지급 종수와 금액이 달라질 수 있다.',
   '수술명만 보고 단정하지 말고 약관 분류표를 확인해야 한다.','internal_only','internal_only','reviewing',2),
  ('surgery','listed_surgery_exclusion_gap','N대 수술비 열거 공백','약관에 열거되지 않은 수술인 경우',
   '중대수술 집중형은 열거된 수술에 강하지만, 열거 밖이면 보장 공백 가능성이 있다.',
   'N대 수술비는 이름이 아니라 약관의 열거 목록이 지급을 결정한다.','internal_only','internal_only','reviewing',3)
on conflict (category, rule_key) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. coverage_quiz_questions (exposure=internal_only · review_status 없음)
-- ════════════════════════════════════════════════════════════════════════════
insert into coverage_quiz_questions
  (category, question_key, step, question_text, sub_text, options, exposure, status, display_order) values
  -- 암
  ('cancer','gender',1,'성별을 선택해 주세요',null,
   '[{"label":"남자","value":"male"},{"label":"여자","value":"female"}]','internal_only','reviewing',1),
  ('cancer','age_band',2,'연령대를 선택해 주세요',null,
   '[{"label":"30대 이하"},{"label":"40대"},{"label":"50대"},{"label":"60대 이상"}]','internal_only','reviewing',2),
  ('cancer','cancer_diagnosis_amount',3,'암진단비, 얼마나 가입돼 있나요?',null,
   '[{"label":"없음 / 모름","value_num":0,"score":0},{"label":"3,000만 이하","value_num":30000000,"score":1},{"label":"3,000~5,000만","value_num":50000000,"score":2},{"label":"5,000만 이상","value_num":70000000,"score":3}]','internal_only','reviewing',3),
  -- 뇌/심장
  ('brain_heart','gender',1,'성별을 선택해 주세요',null,
   '[{"label":"남자","value":"male"},{"label":"여자","value":"female"}]','internal_only','reviewing',1),
  ('brain_heart','brain_coverage_name',2,'뇌 관련 진단비, 어떤 이름인가요?','증권·보장분석의 담보 이름 그대로 골라주세요',
   '[{"label":"없음 / 모름","value":"unknown_or_none","tier_level":0},{"label":"뇌출혈 진단비","value":"brain_hemorrhage","tier_level":1},{"label":"뇌졸중 진단비","value":"stroke","tier_level":2},{"label":"뇌혈관질환 진단비","value":"cerebrovascular","tier_level":3}]','internal_only','reviewing',2),
  ('brain_heart','heart_coverage_name',3,'심장 관련 진단비는요?',null,
   '[{"label":"없음 / 모름","value":"unknown_or_none","tier_level":0},{"label":"급성심근경색 진단비","value":"acute_mi","tier_level":1},{"label":"허혈성심장질환 진단비","value":"ischemic_heart","tier_level":2},{"label":"심장질환 확대 진단비","value":"expanded_heart","tier_level":3}]','internal_only','reviewing',3),
  -- 수술비
  ('surgery','age_band',1,'연령대를 선택해 주세요',null,
   '[{"label":"10~20대","value":"10s_20s"},{"label":"30대","value":"30s"},{"label":"40대","value":"40s"},{"label":"50대","value":"50s"},{"label":"60대 이상","value":"60plus"}]','internal_only','reviewing',1),
  ('surgery','base_surgery_coverage',2,'질병·상해 수술비가 있나요?',null,
   '[{"label":"없음 / 모름","value":"unknown_or_none","score":0},{"label":"있음","value":"yes","score":1}]','internal_only','reviewing',2),
  ('surgery','graded_or_listed_coverage',3,'종수술비 또는 N대 수술비가 있나요?',null,
   '[{"label":"없음 / 모름","value":"unknown_or_none","score":0},{"label":"종수술비 있음","value":"graded","score":1},{"label":"N대 수술비 있음","value":"listed","score":1},{"label":"둘 다 있음","value":"both","score":2}]','internal_only','reviewing',3),
  -- 의료실비(스캐폴딩 · silson_generations 세대 판정 흐름)
  ('medical','silson_join_period',1,'실손보험, 언제 가입하셨나요?','가입 시기로 실손 세대(1~5세대)를 판정합니다',
   '[{"label":"~2009.9 (1세대)","value":"gen1"},{"label":"2009.10~2017.3 (2세대)","value":"gen2"},{"label":"2017.4~2021.6 (3세대)","value":"gen3"},{"label":"2021.7~2026.5 (4세대)","value":"gen4"},{"label":"2026.5.6~ (5세대)","value":"gen5"},{"label":"모름","value":"unknown"}]','internal_only','reviewing',1)
on conflict (category, question_key) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- 6. coverage_result_rules (result_level 4값 정규화 · 원문은 title 보존)
-- ════════════════════════════════════════════════════════════════════════════
insert into coverage_result_rules
  (category, rule_key, condition, result_level, title, message, cta_label, priority, exposure, status) values
  -- 암 (원장 result_level → 정규화 · title=원문)
  ('cancer','cancer_dx_unknown_or_none','{"cancer_diagnosis_amount_lte":0}','확인필요','확인 필요',
   '암진단비 가입 여부와 금액 확인이 필요합니다.',null,1,'internal_only','reviewing'),
  ('cancer','cancer_dx_under_30m','{"cancer_diagnosis_amount_lte":30000000}','부족','부족 가능성',
   '고액 비급여 치료 시 진단비만으로 공백이 생길 수 있습니다.',null,1,'internal_only','reviewing'),
  ('cancer','cancer_dx_30m_to_50m','{"cancer_diagnosis_amount_lte":50000000}','점검필요','점검 필요',
   '기본 진단비는 있으나 비급여 치료비·소득공백 대비는 별도 점검이 필요합니다.',null,2,'internal_only','reviewing'),
  ('cancer','cancer_dx_over_50m','{"cancer_diagnosis_amount_gte":50000000}','충분','상대적으로 양호',
   '암진단비 준비액은 상대적으로 양호하나 치료비 담보와 유사암·재진단암 구조 확인이 필요합니다.',null,3,'internal_only','reviewing'),
  -- 뇌/심장 (title=원장 title · result_level 정규화)
  ('brain_heart','both_unknown','{"brain_tier_lte":0,"heart_tier_lte":0}','확인필요','뇌·심장 담보명 확인이 필요합니다',
   '담보명만 달라져도 지급 범위가 크게 달라집니다. 보장분석표나 증권에서 뇌·심장 진단비 이름을 먼저 확인해 보세요.','내 뇌·심장 보장 확인받기',1,'internal_only','reviewing'),
  ('brain_heart','brain_scope_gap','{"brain_tier_lte":1}','부족','뇌 담보 범위가 좁을 수 있습니다',
   '뇌출혈 중심 담보만 있으면 가장 흔한 뇌경색이나 미파열 동맥류는 보장 공백 가능성이 있습니다.','뇌 담보 범위 점검받기',2,'internal_only','reviewing'),
  ('brain_heart','heart_scope_gap','{"heart_tier_lte":1}','부족','심장 담보 범위가 좁을 수 있습니다',
   '급성심근경색 중심 담보만 있으면 협심증, 부정맥, 심부전 등에서 보장 공백 가능성이 있습니다.','심장 담보 범위 점검받기',3,'internal_only','reviewing'),
  ('brain_heart','scope_good_amount_check_needed','{"brain_tier_gte":2,"heart_tier_gte":2}','점검필요','담보 범위는 기본 이상이나 금액 점검이 필요합니다',
   '뇌·심장 담보 범위는 기본 이상입니다. 다만 진단비 금액, 수술비, 입원·재활·간병 대비는 별도로 확인해야 합니다.','내 보장 구조 점검받기',4,'internal_only','reviewing'),
  -- 수술비
  ('surgery','no_surgery_coverage_known','{"base_score_lte":0,"extra_score_lte":0}','확인필요','수술비 담보 확인이 필요합니다',
   '수술은 진단비와 달리 반복·고빈도 보장 축입니다. 증권에서 질병·상해 수술비, 종수술비, N대 수술비 여부를 먼저 확인하세요.','내 수술비 보장 확인받기',1,'internal_only','reviewing'),
  ('surgery','base_only','{"base_score_gte":1,"extra_score_lte":0}','점검필요','기본 수술비는 있으나 고난도·선택 수술 대비는 점검이 필요합니다',
   '질병·상해 수술비는 넓은 기본기지만 수술 난이도와 비급여 선택 비용을 충분히 반영하지 못할 수 있습니다.','내 수술비 구조 점검받기',2,'internal_only','reviewing'),
  ('surgery','extra_present','{"extra_score_gte":1}','확인필요','수술비 구조가 있으나 약관 분류표 확인이 필요합니다',
   '종수술비나 N대 수술비는 분류표·열거 목록이 지급을 결정합니다. 가입 상품 기준으로 실제 지급 범위를 확인해야 합니다.','내 약관 기준으로 확인받기',3,'internal_only','reviewing'),
  -- 의료실비(스캐폴딩)
  ('medical','silson_gen_check','{}','확인필요','실손 세대 확인 후 보장 점검',
   '가입 시기에 따라 실손 세대(1~5세대)와 보장이 크게 다릅니다. 세대를 먼저 확인하고 보장 공백을 점검하세요.','내 실손 세대 확인받기',1,'internal_only','reviewing')
on conflict (category, rule_key) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- 7. coverage_page_blocks (exposure=internal_only · review_status 없음)
-- ════════════════════════════════════════════════════════════════════════════
insert into coverage_page_blocks
  (category, block_key, ui_type, title, data_dependencies, exposure, status, display_order) values
  -- 암 (cancer_page_blocks_v0_2)
  ('cancer','hero','hero','암, 숫자로 보기','["lifetime_cancer_probability_male","lifetime_cancer_probability_female"]','internal_only','reviewing',1),
  ('cancer','incidence_stats','stat_cards','① 얼마나 걸리나','["new_cancer_patients_2023_total","lifetime_cancer_probability_male","lifetime_cancer_probability_female"]','internal_only','reviewing',2),
  ('cancer','survival','bar_compare','② 걸리면 어떻게 되나 — 이제 사는 병','["five_year_survival_overall_2019_2023","five_year_survival_local_stage","five_year_survival_distant_stage"]','internal_only','reviewing',3),
  ('cancer','treatment_matrix','tabs_expandable_rows','③ 치료비는 얼마나 드나','["treatments"]','internal_only','reviewing',4),
  ('cancer','insurance_gap','gap_bars','④ 실비 있는데요? — 구조를 보세요','["treatments","special_calculation_exclusions"]','internal_only','reviewing',5),
  ('cancer','quiz','interactive_quiz','⑤ 그럼 나는? — 30초 확인','["quiz_questions","result_rules"]','internal_only','reviewing',6),
  ('cancer','lead_cta','cta_form','내 상황에 맞는 보완 플랜 추천받기','["lead_payload_contract"]','internal_only','reviewing',7),
  -- 뇌/심장 (brain_heart_page_blocks_v0_1)
  ('brain_heart','hero',null,'뇌·심장은 순식간에 오고, 살아도 길게 남습니다','["coverage_facts.stats_incidence","coverage_special_care_rules"]','internal_only','reviewing',1),
  ('brain_heart','incidence_stats',null,'얼마나, 누구에게 오나','["coverage_facts.stats_incidence","coverage_facts.stats_incidence_age"]','internal_only','reviewing',2),
  ('brain_heart','outcome_aftercare',null,'살아도 끝이 아닙니다','["coverage_facts.stats_outcome"]','internal_only','reviewing',3),
  ('brain_heart','disease_tiers',null,'담보 이름이 운명을 가릅니다','["coverage_disease_tiers"]','internal_only','reviewing',4),
  ('brain_heart','treatment_matrix',null,'치료비는 얼마나 드나','["coverage_treatments"]','internal_only','reviewing',5),
  ('brain_heart','special_care_gap',null,'나라의 지원, 암과 하늘땅 차이','["coverage_special_care_rules","coverage_facts.public_support"]','internal_only','reviewing',6),
  ('brain_heart','coverage_checklist',null,'내 뇌·심장 보장에서 확인할 4가지','["coverage_disease_tiers","coverage_quiz_questions"]','internal_only','reviewing',7),
  ('brain_heart','quiz',null,'내 담보는 어디까지 덮나 — 30초 확인','["coverage_quiz_questions","coverage_result_rules"]','internal_only','reviewing',8),
  ('brain_heart','result',null,'결과 화면','["coverage_result_rules","coverage_disease_tiers","coverage_report_blocks"]','internal_only','reviewing',9),
  ('brain_heart','lead_cta',null,'내 증권 기준으로 정확히 확인받기','["lead_payload_contract"]','internal_only','reviewing',10),
  -- 수술비 (surgery_page_blocks_v0_1)
  ('surgery','hero',null,'수술은 확률이 아니라 순서의 문제입니다','["coverage_facts.stats_volume"]','internal_only','reviewing',1),
  ('surgery','stats_volume',null,'수술, 얼마나 흔한가','["coverage_facts.stats_volume","coverage_facts.top_surgeries"]','internal_only','reviewing',2),
  ('surgery','life_map',null,'생애 수술 지도 — 내 나이를 눌러보세요','["coverage_life_map"]','internal_only','reviewing',3),
  ('surgery','surgery_types',null,'수술비 담보 3형제','["coverage_surgery_types"]','internal_only','reviewing',4),
  ('surgery','cost_matrix',null,'급여는 싸고, 선택은 비쌉니다','["coverage_surgery_costs"]','internal_only','reviewing',5),
  ('surgery','insurance_gap',null,'실비 있는데요? — 백내장이 교과서입니다','["coverage_insurance_gap_rules","coverage_surgery_costs.cataract"]','internal_only','reviewing',6),
  ('surgery','checklist',null,'내 수술비 보장에서 확인할 4가지','[]','internal_only','reviewing',7),
  ('surgery','quiz',null,'내 나이대 수술, 내 담보로 되나 — 30초 확인','["coverage_quiz_questions","coverage_result_rules"]','internal_only','reviewing',8),
  ('surgery','lead_cta',null,'내 약관 기준으로 확인받기','["lead_payload_contract"]','internal_only','reviewing',9),
  -- 의료실비(스캐폴딩 · silson_generations 재사용)
  ('medical','hero',null,'실손보험, 내 세대는 몇 세대?','["silson_generations"]','internal_only','reviewing',1),
  ('medical','generation_judge',null,'가입 시기로 내 실손 세대 확인','["silson_generations","coverage_quiz_questions"]','internal_only','reviewing',2),
  ('medical','result',null,'세대별 보장 차이 · 유지 vs 전환','["silson_generations","coverage_result_rules"]','internal_only','reviewing',3),
  ('medical','lead_cta',null,'내 실손 점검받기','["lead_payload_contract"]','internal_only','reviewing',4)
on conflict (category, block_key) do nothing;

-- ════════════════════════════════════════════════════════════════════════════
-- 8. coverage_report_blocks (뇌/심장 원장만 보유 · usage jsonb)
-- ════════════════════════════════════════════════════════════════════════════
insert into coverage_report_blocks
  (category, block_key, title, template, usage, exposure, status, display_order) values
  ('brain_heart','scope_gap_summary','담보 범위 공백 요약',
   '현재 선택된 담보 기준으로 {gap_items} 영역에서 보장 공백 가능성이 있습니다.',
   '["customer_report","advisor_summary"]','internal_only','reviewing',1),
  ('brain_heart','special_care_warning','산정특례 기간 주의',
   '뇌혈관·심장질환 산정특례는 암과 달리 조건 충족 시 30일 중심이므로, 재활·추적검사·간병 부담은 별도 점검이 필요합니다.',
   '["customer_report","page_special_care"]','internal_only','reviewing',2),
  ('brain_heart','aftercare_message','후유장해·생활비 주의',
   '뇌·심장 질환은 급성기 치료 이후 후유장해, 약물관리, 재활, 소득공백이 길어질 수 있습니다.',
   '["customer_report","page_outcome"]','internal_only','reviewing',3)
on conflict (category, block_key) do nothing;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK — 아래 블록의 주석을 해제해 실행하면 본 시드가 제거된다(status 하향 대안도 가능).
--   개인 원장(holdings/results/lead)은 시드 없음(런타임 생성) → 여기서 안 건드림.
-- ═══════════════════════════════════════════════════════════════════════════
-- begin;
--   delete from coverage_report_blocks       where status='reviewing';
--   delete from coverage_page_blocks         where status='reviewing';
--   delete from coverage_result_rules        where status='reviewing';
--   delete from coverage_quiz_questions      where status='reviewing';
--   delete from coverage_insurance_gap_rules where status='reviewing';
--   delete from coverage_surgery_costs       where status='reviewing';
--   delete from coverage_surgery_types       where status='reviewing';
--   delete from coverage_life_map            where status='reviewing';
--   delete from coverage_special_care_rules  where status='reviewing';
--   delete from coverage_disease_tiers       where status='reviewing';
--   delete from coverage_treatments          where status='reviewing';
--   delete from coverage_facts               where status='reviewing';
--   delete from coverage_categories          where slug in ('cancer','brain_heart','surgery','medical') and status='reviewing';
-- commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- 검증(🟢 읽기전용) 동반: scripts/ci/postverify_2026-07-15_coverage_seed_all4.sql
-- ═══════════════════════════════════════════════════════════════════════════
