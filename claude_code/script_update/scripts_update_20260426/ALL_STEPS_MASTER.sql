-- ════════════════════════════════════════════════════════════════
-- 원세컨드 스크립트 보강 작업 — 마스터 SQL
-- 작업일: 2026-04-25
-- 작성: Claude AI
-- 적용 환경: Supabase 신버전 프로젝트 (pdnwgzneooyygfejrvbg)
-- ════════════════════════════════════════════════════════════════

-- 작업 범위
-- Step 1: 검색 최적화 (59개 전체 title + highlight_text)
-- Step 2: 실명 익명화 (id 5, 13, 21)
-- Step 3: 통계 박스 추가 (need_emphasis 단계 9개)
-- Step 4: 신규 스크립트 10개 추가

-- ⚠️ 적용 전 반드시 백업
-- Supabase Dashboard → Table Editor → scripts → ... → Export to CSV

-- ════════════════════════════════════════════════════════════════
-- 0. 적용 전 백업 확인 (실행해서 결과 저장)
-- ════════════════════════════════════════════════════════════════

-- 백업 쿼리 (결과를 CSV로 다운로드 후 보관)
-- SELECT id, stage, title, highlight_text, script_text, is_active FROM scripts ORDER BY id;

-- 현재 상태 카운트
SELECT 
  stage, 
  COUNT(*) AS cnt,
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END) AS active_cnt
FROM scripts 
GROUP BY stage 
ORDER BY stage;

-- ════════════════════════════════════════════════════════════════
-- ⬇️ Step 1: 검색 최적화 (59개 전체)
-- ════════════════════════════════════════════════════════════════

-- Step 1: 검색 최적화 (56개 전체 title + highlight_text)
-- 작업일: 2026-04-25
-- script_text 본문은 건드리지 않음

UPDATE scripts SET title = '운전자보험 설명형 — 자동차보험 외 형사합의금·벌금·변호사비', highlight_text = '교통사고 형사합의금 5천만+벌금+변호사비 — 운전자보험으로 커버' WHERE id = 3;
UPDATE scripts SET title = '주택화재보험 설명형 — 화재·누수·임차인 배상책임', highlight_text = '화재·누수 수리비 수백~수천만 — 임차인 배상책임 특약 필수' WHERE id = 4;
UPDATE scripts SET title = '3대질환(암·뇌·심장) 설명형 — 진단비 합산 1억 권장', highlight_text = '암·뇌·심장 합산 1억 권장 — 사망 원인 1·2·4위 통합 보장' WHERE id = 5;
UPDATE scripts SET title = '최근 점검 여부 확인형 — 점검 시점만 확인', highlight_text = '보험 점검 마지막 시점만 알아도 현재 상태 가늠 가능' WHERE id = 6;
UPDATE scripts SET title = '기존 보험 비교형 클로징 — 해지 없이 부족분만 추가', highlight_text = '지금 보험 유지하면서 부족한 보장만 월 ○만원 추가' WHERE id = 7;
UPDATE scripts SET title = '간병보험 설명형 — 요양원·간병인 비용·치매 대비', highlight_text = '전문 간병인 월 200~300만 — 치료비보다 간병비가 더 큰 경우' WHERE id = 8;
UPDATE scripts SET title = '간단 확인 안내형 — 3가지(실비·3대질환·누락)만 점검', highlight_text = '결정 압박 없습니다 — 실비·3대질환·누락 3가지만 5분 확인' WHERE id = 9;
UPDATE scripts SET title = '시간 회피형 반론 — 30초 안내', highlight_text = '바쁘셔도 30초 — 보험 가입 권유 아닌 확인 안내' WHERE id = 10;
UPDATE scripts SET title = '상담 거부형 반론 — 이미 있어요/비싸요/생각해볼게요 대응', highlight_text = '기존 보험 있으셔도 점검 필요 — 중복·누락 확인' WHERE id = 11;
UPDATE scripts SET title = '정기보험 설명형 — 자녀 독립·대출 상환 기간 집중 보장', highlight_text = '종신 대비 보험료 5~10배 저렴 — 대출·자녀 교육 기간 집중 커버' WHERE id = 12;
UPDATE scripts SET title = '암보험 설명형 — 진단비·면역항암제·소득 공백', highlight_text = '면역항암제 월 1천만 — 치료비+생활비 이중 부담, 진단비 5천만 권장' WHERE id = 13;
UPDATE scripts SET title = '배우자 상의형 반론 — 상의용 요약 멘트 제공', highlight_text = '배우자 상의 OK — 핵심 한 줄+예상 보험료 문자 제공' WHERE id = 14;
UPDATE scripts SET title = '보험료 구조 점검형 — 갱신형/비갱신형 비중 확인', highlight_text = '갱신형 비중 높으면 나이 들수록 보험료 급증 — 구조 먼저 확인' WHERE id = 15;
UPDATE scripts SET title = '다음 상담 연결형 클로징 — 재연락 약속·문자 요약', highlight_text = '오늘 결정 안 하셔도 OK — 문자 요약+재연락 약속' WHERE id = 16;
UPDATE scripts SET title = '태아보험 설명형 — 임신 16~22주 가입 타이밍', highlight_text = '임신 16~22주 가입 필수 — 인큐베이터·선천성 이상 보장' WHERE id = 17;
UPDATE scripts SET title = '종신보험 설명형 — 가족 보호·상속·노후 재원', highlight_text = '사망보험금 3억 = 대출+교육비+배우자 10년 생활비' WHERE id = 18;
UPDATE scripts SET title = '보장 누락 안내형 — 소액암·뇌출혈 한정 사례', highlight_text = '암·뇌·심장 진단비 빠지면 있어도 보장 안 될 수 있음' WHERE id = 19;
UPDATE scripts SET title = '위험 인식 안내형 — 건강 조건 변화·보험료 인상 타이밍', highlight_text = '지금 건강할 때가 부담보·거절 없이 가입 가능한 시점' WHERE id = 20;
UPDATE scripts SET title = '2대질환(뇌·심장) 설명형 — 뇌출혈·뇌졸중·허혈성심장질환 범위', highlight_text = '뇌출혈만은 뇌졸중의 20% — 뇌혈관 전체 범위 보장 권장' WHERE id = 21;
UPDATE scripts SET title = '치매보험 설명형 — 경증·중증·월 생활비 장기 지급', highlight_text = '치매 8~10년 평균 — 경증부터 보장되는 상품이 실제 수령 가능성 높음' WHERE id = 22;
UPDATE scripts SET title = '중복 정리형 — 실비/진단비/특약 겹침 확인', highlight_text = '실비는 중복 가입해도 한 곳에서만 지급 — 정리하면 보험료 절감' WHERE id = 23;
UPDATE scripts SET title = '누락 확인형 — 실비·3대질환·생활비 3축 점검', highlight_text = '실비·3대질환·생활비 중 빠진 항목만 찾아도 현재 상태 보임' WHERE id = 24;
UPDATE scripts SET title = '확인 제안형 2차 클로징 — 결정 아닌 기억만', highlight_text = '오늘 결정 압박 X — 부족 보장 한 가지만 기억하시도록' WHERE id = 25;
UPDATE scripts SET title = '지금이 최적 시점형 — 건강 조건·나이 보험료 인상', highlight_text = '지금 건강할 때가 부담보 없이 가장 낮은 보험료로 가입 가능' WHERE id = 26;
UPDATE scripts SET title = '보험료 부담형 반론 — 구조 정리로 절감 가능', highlight_text = '더 내는 게 아니라 정리 — 월 3~5만원 절감 후 보강' WHERE id = 27;
UPDATE scripts SET title = '보험 점검 안내형 — 가입 vs 점검 차이·기준 변경', highlight_text = '가입은 됐어도 약관이 안 맞으면 보장 안 될 수 있음' WHERE id = 28;
UPDATE scripts SET title = '다음에 할게요형 반론 — 보험료·건강 조건 변화 안내', highlight_text = '다음에 하면 보험료↑·건강 조건↑·공백 3가지 변화' WHERE id = 29;
UPDATE scripts SET title = '치아보험 설명형 — 임플란트·신경치료·대기기간', highlight_text = '임플란트 1개 100~150만 — 실비는 치과 비급여 거의 안 됨' WHERE id = 30;
UPDATE scripts SET title = '보험료 대비 가치형 — 하루 커피값 vs 수천만원 리스크', highlight_text = '월 보험료가 하루 커피 한 잔 — 수천만원 치료비 커버' WHERE id = 31;
UPDATE scripts SET title = '비교 확인형 2차 클로징 — 유지/보강 이분법', highlight_text = '유지 OR 보강 둘 중 하나 — 짧고 강한 마무리' WHERE id = 32;
UPDATE scripts SET title = '재상담 연결형 2차 클로징 — 날짜 구체적으로 잡기', highlight_text = '재연락 날짜 ○요일 오전/오후 선택 — 흐지부지 방지' WHERE id = 33;
UPDATE scripts SET title = '부담 완화형 클로징 — 결정 압박 제거·핵심 한 가지만', highlight_text = '오늘 가장 취약한 한 가지만 기억 — 결정은 고객님이' WHERE id = 34;
UPDATE scripts SET title = '종합보험 설명형 — 실비·진단비·생활비 통합 구조', highlight_text = '여러 보험 따로 가입보다 종합보험 정리로 보험료 절감 가능' WHERE id = 35;
UPDATE scripts SET title = '보험료 확인형 — 월 보험료 수준만 확인', highlight_text = '월 보험료 수준만 알아도 구조 점검 방향 보임' WHERE id = 36;
UPDATE scripts SET title = '결정 미루면 손해형 — 건강·보험료·공백 3가지 변화', highlight_text = '미루면 건강 조건 변화·보험료 인상·보장 공백 3가지 손해' WHERE id = 37;
UPDATE scripts SET title = '생각해볼게요형 반론 — 판단 기준 제공', highlight_text = '위험 시 어떻게 되는지 한 가지만 자문 — 답이 곧 결정' WHERE id = 38;
UPDATE scripts SET title = '간단 점검형 2차 클로징 — 한 가지만 결정·침묵 대응', highlight_text = '오늘 한 가지만 결정 — 침묵 시 먼저 말하지 말 것' WHERE id = 39;
UPDATE scripts SET title = '보험 점검형 — 가입 시점 기반 기준 변경 안내', highlight_text = '보험 가입 권유 아닙니다 — 가입 시점만 알아도 점검 필요 여부 확인' WHERE id = 40;
UPDATE scripts SET title = '실비보험 설명형 — 1·2·3·4세대 차이·본인부담률', highlight_text = '실비 세대별 본인부담 차이 — MRI 50~80만 본인부담 방지' WHERE id = 41;
UPDATE scripts SET title = '보장 우선순위 정리 — 암·뇌·심장 순서 분석', highlight_text = '발생 가능성·치료 비용·현재 공백 3가지 기준으로 보강 순서 정리' WHERE id = 42;
UPDATE scripts SET title = '가족 보호 환기형 — 사망/투병 시 가족 생활 시뮬레이션', highlight_text = '내가 아프거나 없을 때 — 대출·교육비·생활비 가족 부담' WHERE id = 43;
UPDATE scripts SET title = '보험료 점검 안내형 — 갱신형/중복/공백 3가지 구조 확인', highlight_text = '갱신형 비중·중복·공백 3가지 보면 보험료 줄이고 보장 강화 가능' WHERE id = 44;
UPDATE scripts SET title = '가입 여부 확인형 — 있다/없다만 확인', highlight_text = '보험 있다/없다만 알아도 다음 단계 확인 가능' WHERE id = 45;
UPDATE scripts SET title = '확인 후 결정형 클로징 — 생각할 시간 제공·재연락', highlight_text = '충분히 생각하시고 결정 — 보험료는 시간 지나면 인상' WHERE id = 46;
UPDATE scripts SET title = '관심 보장 확인형 — 병원비 vs 큰 질병 선택', highlight_text = '병원비(실비) vs 암·뇌·심장 큰 질병 중 신경 쓰는 쪽부터 확인' WHERE id = 47;
UPDATE scripts SET title = '통화 차단형 반론 — 잘못 눌렀어요/번호 출처 대응', highlight_text = '10초 안내 — 보험 가입 권유 아닌 조회 안내' WHERE id = 48;
UPDATE scripts SET title = '가입 개수 확인형 — 보험 몇 개인지만 확인', highlight_text = '보험 개수만 알아도 중복·누락 확인 방향 보임' WHERE id = 49;
UPDATE scripts SET title = '전체 점검형 — 실비·3대질환·생활비 통합 분석', highlight_text = '실비 세대·3대질환 합산·생활비 보장 한 번에 확인' WHERE id = 50;
UPDATE scripts SET title = '실제 비용 체감형 — 항암제·MRI·간병비 구체 금액', highlight_text = '면역항암제 월 1천만·간병 10년 2~3억 — 미가입 시 직접 부담' WHERE id = 51;
UPDATE scripts SET title = '어린이보험 설명형 — 골절·소아암·성인 전환 보장', highlight_text = '어릴 때 가입할수록 유리 — 성인 전환 후에도 보장 유지' WHERE id = 52;
UPDATE scripts SET title = '보험 조회 안내형 — 검색 키워드 기반 현황 확인', highlight_text = '인터넷으로 ○○보험 조회하셨던 분 — 현재 준비 상태만 확인' WHERE id = 53;
UPDATE scripts SET title = '이미 있어서 괜찮아요형 반론 — 소액암·뇌출혈 한정 사례', highlight_text = '보험 있어도 약관 안 맞으면 못 받음 — 확인만 한번' WHERE id = 54;
UPDATE scripts SET title = '상담 진행형 클로징 — 절차 간소화·한 가지 결정 유도', highlight_text = '건강 고지+15분이면 처리 완료 — 한 가지만 결정' WHERE id = 55;
UPDATE scripts SET title = '보장 분석 안내형 — 3대질환(암·뇌·심장) 누락 점검', highlight_text = '보험료는 내시는데 빠진 보장 있는지 — 3대질환 기준 분석' WHERE id = 56;
UPDATE scripts SET title = '시간 회피형 반론 멘트 — 1분 핵심 안내', highlight_text = '딱 1분만 — 결정 아닌 들어보시기만' WHERE id = 57;
UPDATE scripts SET title = '좋은 보험 3가지 구성 안내 — 질병·가성비·유지', highlight_text = '내가 걸릴 질병 보장·보험료 대비 보장·장기 유지 가능 3가지' WHERE id = 58;
UPDATE scripts SET title = '보험 점검형 오프닝 — 판매 아닌 보장 점검', highlight_text = '판매 목적 아닙니다 — 3분 보장 점검 안내' WHERE id = 59;
UPDATE scripts SET title = '통화 차단형 반론 대응 — 문자 우선 안내', highlight_text = '전화 불편하시면 문자로 안내 — 30초만' WHERE id = 60;
UPDATE scripts SET title = '보장 분석 무료 안내형 — 증권 기반 분석', highlight_text = '보험증권으로 무료 분석 — 중복·누락 항목 확인' WHERE id = 61;

-- ════════════════════════════════════════════════════════════════
-- ⬇️ Step 2: 실명 익명화 (3개)
-- ════════════════════════════════════════════════════════════════

-- Step 2: 실명 익명화 (id 5, 13, 21)
-- script_text 본문에서 실명 부분만 익명화 (REPLACE 함수 사용)
-- 보험업법·퍼블리시티권 위험 차단 목적

-- id 5: 3대질환 설명형 (김철민·강원래·이윤석 익명화)
UPDATE scripts SET script_text = REPLACE(script_text, '암: 김철민 씨 폐암 → 면역항암제 월 1,000만 원 이상<br>뇌: 강원래 씨 뇌출혈 → 수년간 재활, 가족 전체 생활 변화<br>심장: 이윤석 씨 심근경색 → 갑작스러운 응급 시술<br>이분들이 공개하셨기 때문에 우리가 알고 있는 거고요.', '암: 50대 중반 톱가수 한 분이 폐암 진단 후 면역항암제 월 1,000만 원 이상 부담 (언론 공개 사례, 2023~2024)<br>뇌: 한창 활동하시던 댄스 가수 한 분이 뇌출혈 후 수년간 재활, 가족 전체 생활 변화 (공개 사례)<br>심장: 40대 후반 방송인 한 분이 심근경색으로 갑작스러운 응급 시술 (공개 사례)<br>이분들 공개 사례를 통해 알게 된 것이고요.') WHERE id = 5;

-- id 13: 암보험 설명형 (김철민 익명화)
UPDATE scripts SET script_text = REPLACE(script_text, '방송에서도 나왔던 얘기인데요,<br>김철민 씨 같은 경우 폐암 진단 받으시고<br>키트루다라는 면역항암제 치료를 받으셨는데<br>한 달에 천만 원 넘게 들었다고 공개하셨잖아요.<br>그분은 다행히 방송인이라 후원도 있었지만<br>일반 분들은 그게 안 되거든요.', '공개 보도된 사례인데요,<br>50대 중반 톱가수 한 분이 폐암 진단 후<br>면역항암제 치료(키트루다 계열)를 받으셨는데<br>한 달에 천만 원 넘게 들었다고 공개하셨거든요.<br>그분은 방송인이라 후원도 있었지만<br>일반 분들은 그게 안 되거든요.') WHERE id = 13;

-- id 21: 2대질환 설명형 (이병헌 익명화)
UPDATE scripts SET script_text = REPLACE(script_text, '이병헌 씨 부친분이나, 운동선수 분들이<br>갑자기 쓰러지셨다는 뉴스 보신 적 있으시잖아요.', '유명 배우 부친 한 분이나, 운동선수 분들이<br>갑자기 쓰러지셨다는 뉴스 보신 적 있으시잖아요.') WHERE id = 21;

-- 검증: 익명화 후 실명 잔존 여부 확인
SELECT id, title FROM scripts WHERE script_text LIKE '%김철민%' OR script_text LIKE '%강원래%' OR script_text LIKE '%이윤석%' OR script_text LIKE '%이병헌%';

-- ════════════════════════════════════════════════════════════════
-- ⬇️ Step 3: 통계 박스 추가 (9개)
-- ════════════════════════════════════════════════════════════════

-- Step 3: need_emphasis / need_emphasis_2 본문 사례·통계 보강
-- 작업일: 2026-04-25
-- 기존 본문 유지 + 통계 박스 추가 (REPLACE 함수)
-- 도표 없이 텍스트만, 출처 명기 필수

-- id 19: 보장 누락 안내 (통계 박스 추가)
UPDATE scripts SET script_text = REPLACE(script_text, '뇌경색인데 뇌출혈 보장만 있어서 못 받으신 분들도 있습니다.</div>', '뇌경색인데 뇌출혈 보장만 있어서 못 받으신 분들도 있습니다.
<div style="margin-top:10px;padding:10px 12px;background:#F0F4FA;border-left:3px solid #4A6FA5;border-radius:4px;font-size:13px;color:#2C4A7C;line-height:1.7;"><strong>📊 통계 — 뇌졸중 구성 비율</strong><br>전체 뇌졸중 환자 100명 중 뇌경색 76명 / 뇌출혈 15명 / 지주막하출혈 9명. 뇌출혈만 보장되는 보험은 전체 뇌졸중 환자 4명 중 3명에게 보장이 안 됨.<div style="font-size:11px;color:#6B7C99;font-weight:500;margin-top:4px;">출처: 대한뇌졸중학회 뇌졸중 역학보고서, 2018</div></div></div>') WHERE id = 19;

-- id 20: 위험 인식 안내 (통계 박스 추가)
UPDATE scripts SET script_text = REPLACE(script_text, '당뇨 진단 후에 실비 가입이 거절됐다는 분들이<br>생각보다 많습니다.</div>', '당뇨 진단 후에 실비 가입이 거절됐다는 분들이<br>생각보다 많습니다.
<div style="margin-top:10px;padding:10px 12px;background:#F0F4FA;border-left:3px solid #4A6FA5;border-radius:4px;font-size:13px;color:#2C4A7C;line-height:1.7;"><strong>📊 통계 — 한국인 평생 암 발병률</strong><br>기대수명까지 생존할 경우 남자는 약 2명 중 1명(44.6%), 여자는 약 3명 중 1명(38.2%)이 암 진단을 받게 됨. 2024년 기준 암유병자 273만 명, 매년 신규 28만 명 발생.<div style="font-size:11px;color:#6B7C99;font-weight:500;margin-top:4px;">출처: 국립암센터·보건복지부 국가암등록통계, 2024</div></div></div>') WHERE id = 20;

-- id 28: 보험 점검 안내 (통계 박스 추가)
UPDATE scripts SET script_text = REPLACE(script_text, '보험이 있어도 보장이 안 되는 상황이 생기는 거거든요.</div>', '보험이 있어도 보장이 안 되는 상황이 생기는 거거든요.
<div style="margin-top:10px;padding:10px 12px;background:#FFF8F0;border-left:3px solid #C8793A;border-radius:4px;font-size:13px;color:#5C3A1A;line-height:1.7;"><strong>💬 현장 사례</strong><br>5년 전 가입한 실비로 도수치료 받으러 가셨다가 4세대 약관 차이로 본인부담 50%로 바뀐 줄 모르셨던 분, 암 진단비는 있는데 갑상선암이 일반암 1/10만 지급되는 약관이라 절망하신 분 — 가입은 됐어도 약관 변경·소액암 한정으로 못 받는 사례 빈번.</div></div>') WHERE id = 28;

-- id 44: 보험료 점검 안내 (통계 박스 추가)
UPDATE scripts SET script_text = REPLACE(script_text, '실제로 중복된 항목을 정리하면<br>월 3~5만 원 절감이 되는 경우가 있고,<br>그 금액으로 더 중요한 보장을 채우실 수 있거든요.</div>', '실제로 중복된 항목을 정리하면<br>월 3~5만 원 절감이 되는 경우가 있고,<br>그 금액으로 더 중요한 보장을 채우실 수 있거든요.
<div style="margin-top:10px;padding:10px 12px;background:#F0F4FA;border-left:3px solid #4A6FA5;border-radius:4px;font-size:13px;color:#2C4A7C;line-height:1.7;"><strong>📊 통계 — 갱신형 보험료 인상 구조</strong><br>갱신형 보험은 5년·10년 단위로 보험료 재산정. 50대 가입자 기준 10년 후 보험료 2~3배 인상되는 경우 흔함. 비갱신형은 가입 시점 보험료 만기까지 동결.<div style="font-size:11px;color:#6B7C99;font-weight:500;margin-top:4px;">참고: 보험업계 일반 인수 기준</div></div></div>') WHERE id = 44;

-- id 26: 지금이 최적 시점형 (통계 박스 추가)
UPDATE scripts SET script_text = REPLACE(script_text, '예를 들어 월 3만 원짜리 상품이<br>1년 뒤엔 3만 3천 원,<br>10년이면 누적으로 36만 원을 더 내시는 겁니다.<br>지금 결정하시는 게 장기적으로 훨씬 유리합니다.</div>', '예를 들어 월 3만 원짜리 상품이<br>1년 뒤엔 3만 3천 원,<br>10년이면 누적으로 36만 원을 더 내시는 겁니다.<br>지금 결정하시는 게 장기적으로 훨씬 유리합니다.
<div style="margin-top:10px;padding:10px 12px;background:#F0F4FA;border-left:3px solid #4A6FA5;border-radius:4px;font-size:13px;color:#2C4A7C;line-height:1.7;"><strong>📊 통계 — 만성질환 유병률 변화</strong><br>40대 고혈압 유병률 약 25%, 50대 약 40%, 60대 약 60%. 한 번 진단받으면 부담보·거절 위험. 지금 건강할 때가 부담보 없이 가입 가능한 시점.<div style="font-size:11px;color:#6B7C99;font-weight:500;margin-top:4px;">출처: 질병관리청 국민건강영양조사</div></div></div>') WHERE id = 26;

-- id 31: 보험료 대비 가치형 (통계 박스 추가)
UPDATE scripts SET script_text = REPLACE(script_text, '커피 한 잔 값으로<br>수천만 원 리스크를 커버하는 구조입니다.<br>이게 보험의 본질이거든요.</div>', '커피 한 잔 값으로<br>수천만 원 리스크를 커버하는 구조입니다.<br>이게 보험의 본질이거든요.
<div style="margin-top:10px;padding:10px 12px;background:#F0F4FA;border-left:3px solid #4A6FA5;border-radius:4px;font-size:13px;color:#2C4A7C;line-height:1.7;"><strong>📊 통계 — 뇌졸중 1인당 입원 진료비</strong><br>2022년 기준 뇌졸중 입원 환자 1인당 연간 진료비 약 1,593만 원. 입원일수 평균 70.5일. 실비·진단비 없으면 전액 본인 부담.<div style="font-size:11px;color:#6B7C99;font-weight:500;margin-top:4px;">출처: 건강보험심사평가원, 2023</div></div></div>') WHERE id = 31;

-- id 37: 결정 미루면 손해형 (통계 박스 추가)
UPDATE scripts SET script_text = REPLACE(script_text, '한 달을 미루시면 한 달,<br>1년을 미루시면 1년 동안<br>보장 없이 지내시는 겁니다.</div>', '한 달을 미루시면 한 달,<br>1년을 미루시면 1년 동안<br>보장 없이 지내시는 겁니다.
<div style="margin-top:10px;padding:10px 12px;background:#F0F4FA;border-left:3px solid #4A6FA5;border-radius:4px;font-size:13px;color:#2C4A7C;line-height:1.7;"><strong>📊 통계 — 심근경색 발생 규모</strong><br>2023년 한 해 심근경색 신규 발생 34,768건. 남자가 여자의 약 3배. 1년 이내 사망률 16.1% (65세 이상은 더 높음). 골든타임 120분 내 치료 못 받으면 위험.<div style="font-size:11px;color:#6B7C99;font-weight:500;margin-top:4px;">출처: 질병관리청 심뇌혈관질환 발생통계, 2023</div></div></div>') WHERE id = 37;

-- id 43: 가족 보호 환기형 (통계 박스 추가)
UPDATE scripts SET script_text = REPLACE(script_text, '사망보험금 3억 원이 있으면<br>대출 갚고, 교육비 내고, 10년 생활비가 나옵니다.<br>없으면 남은 가족이 전부 감당해야 하는 거거든요.<br>보험은 나를 위한 것이기도 하지만<br>결국 가족을 위한 준비입니다.</div>', '사망보험금 3억 원이 있으면<br>대출 갚고, 교육비 내고, 10년 생활비가 나옵니다.<br>없으면 남은 가족이 전부 감당해야 하는 거거든요.<br>보험은 나를 위한 것이기도 하지만<br>결국 가족을 위한 준비입니다.
<div style="margin-top:10px;padding:10px 12px;background:#F0F4FA;border-left:3px solid #4A6FA5;border-radius:4px;font-size:13px;color:#2C4A7C;line-height:1.7;"><strong>📊 통계 — 한국 사망원인 1·2·3·4위</strong><br>1위 암, 2위 심장질환, 3위 폐렴, 4위 뇌혈관질환 (2023년). 40~50대 남성 사망원인 1위는 암(35%) > 심장(15%) > 자살 > 간질환 순. 가장이 갑자기 없어지는 경우의 통계적 현실.<div style="font-size:11px;color:#6B7C99;font-weight:500;margin-top:4px;">출처: 통계청 사망원인통계</div></div></div>') WHERE id = 43;

-- id 51: 실제 비용 체감형 (통계 박스 추가)
UPDATE scripts SET script_text = REPLACE(script_text, '[간병보험 없을 때]<br>전문 간병인 월 200~300만 원,<br>10년이면 2억~3억 원이 나옵니다.</div>', '[간병보험 없을 때]<br>전문 간병인 월 200~300만 원,<br>10년이면 2억~3억 원이 나옵니다.
<div style="margin-top:10px;padding:10px 12px;background:#F0F4FA;border-left:3px solid #4A6FA5;border-radius:4px;font-size:13px;color:#2C4A7C;line-height:1.7;"><strong>📊 통계 — 치매 환자 연간 관리비용</strong><br>치매 환자 1인당 연간 관리비용: 지역사회 1,734만 원, 요양병원·시설 3,138만 원. 평균 돌봄 기간 27.3개월(요양시설 입소 전 가족 돌봄). 치매 환자 가족의 45.8%가 경제적 부담을 호소.<div style="font-size:11px;color:#6B7C99;font-weight:500;margin-top:4px;">출처: 보건복지부 2023년 치매역학·실태조사</div></div></div>') WHERE id = 51;

-- 검증
SELECT id, title, LENGTH(script_text) AS len FROM scripts WHERE id IN (19, 20, 28, 44, 26, 31, 37, 43, 51) ORDER BY id;

-- ════════════════════════════════════════════════════════════════
-- ⬇️ Step 4: 신규 스크립트 10개 추가
-- ════════════════════════════════════════════════════════════════

-- Step 4: 신규 스크립트 10개 추가
-- 작업일: 2026-04-25
-- 현장 용어 6개 (갱신형/리모델링/산정특례/뇌혈관/허혈성/종수술비) + 추가 4개 (4세대 암·실비 세대·유병자·만기환급)
-- 모두 is_active=true, scope=global, is_sample=false, is_leader_pick=false

-- 신규: [analysis] 갱신형/비갱신형 비교 분석
INSERT INTO scripts (title, top_category, stage, type, script_text, highlight_text, scope, is_active, is_leader_pick, is_sample, sort_order)
VALUES (
  '갱신형/비갱신형 비교 분석',
  '보장분석',
  'analysis',
  '갱신형비갱신형비교',
  '<div style="font-family:''Apple SD Gothic Neo'',''Noto Sans KR'',sans-serif;width:100%;max-width:100%;box-sizing:border-box;padding:4px 16px 16px 16px;"><div style="display:inline-block;font-size:13px;font-weight:600;padding:4px 12px;border-radius:20px;background:#E6F1FB;color:#185FA5;margin-bottom:14px;">보장 분석: 갱신형 vs 비갱신형</div><div style="background:#EFEFEF;border-left:4px solid #185FA5;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:18px;"><div style="font-size:13px;font-weight:700;color:#222;margin-bottom:8px;">핵심 포인트</div><div style="font-size:14px;color:#222;line-height:1.75;">갱신형은 보험료가 올라가고 비갱신형은 만기까지 동결입니다<br>지금 가입된 보장이 갱신형/비갱신형 중 어느 쪽인지부터 확인합니다<br>장기적으로 어느 쪽이 유리한지는 나이·건강 상태에 따라 다릅니다</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#185FA5;margin-bottom:5px;">① 갱신형/비갱신형 차이 설명</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">두 구조의 핵심 차이 인식</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">고객님, 보험료가 시간 지나면서 올라가는지<br>아니면 그대로 유지되는지 알고 계세요?<br>이게 갱신형이냐 비갱신형이냐의 차이입니다.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">갱신형은 5년·10년·15년 단위로 보험료를 다시 계산합니다.<br>나이가 올라가니까 보험료도 같이 올라가는 구조거든요.<br>비갱신형은 가입할 때 정해진 보험료가 만기까지 그대로입니다.<br>지금은 비갱신형이 비싸 보여도 장기적으로 유리한 경우가 많습니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 갱신형/비갱신형 차이 모르고 가입하신 분 절반 이상</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#185FA5;margin-bottom:5px;">② 현재 가입 보험 갱신형 비중 확인</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">지금 보장의 구조 점검</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">고객님 지금 가입된 보험에서<br>갱신형 비중이 얼마나 되시는지 확인해드릴게요.<br>증권 보시면 [갱신형] 또는 [비갱신형]으로 표시되어 있거든요.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">[갱신형 비중 50% 이상]: 10년 후 보험료 부담 커질 가능성 높음<br>[갱신형 30~50%]: 일부 항목 비갱신형 전환 검토<br>[갱신형 30% 이하]: 안정적 구조<br>오래된 보험일수록 갱신형 비중이 높은 경우가 많습니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 갱신 시점에 보험료가 2~3배 오르는 경우 흔함</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#185FA5;margin-bottom:5px;">③ 보장별 권장 구조 안내</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">어느 보장은 어느 쪽이 유리한지</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">보장별로 유리한 구조가 다릅니다.<br>실비: 갱신형이 일반적 (4세대 실비도 갱신형)<br>3대질환 진단비: 비갱신형 권장<br>사망보장: 정기형은 갱신형, 종신형은 비갱신형</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">특히 암·뇌·심장 진단비는 비갱신형으로 가입하시면<br>나이 들어도 보험료 인상 없이<br>같은 금액으로 만기까지 보장받으실 수 있습니다.<br>지금 갱신형으로 잡혀 있는 항목이 있으면 비갱신형 전환 검토가 가능합니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 진단비 = 비갱신형 — 핵심 원칙</div></div></div>',
  '갱신형은 보험료 인상·비갱신형은 만기까지 동결 — 구조 차이로 장기 부담 결정',
  'global',
  true,
  false,
  false,
  999
);

-- 신규: [analysis] 보험 리모델링 — 유지·정리·보강 3분류
INSERT INTO scripts (title, top_category, stage, type, script_text, highlight_text, scope, is_active, is_leader_pick, is_sample, sort_order)
VALUES (
  '보험 리모델링 — 유지·정리·보강 3분류',
  '보장분석',
  'analysis',
  '보험리모델링',
  '<div style="font-family:''Apple SD Gothic Neo'',''Noto Sans KR'',sans-serif;width:100%;max-width:100%;box-sizing:border-box;padding:4px 16px 16px 16px;"><div style="display:inline-block;font-size:13px;font-weight:600;padding:4px 12px;border-radius:20px;background:#E6F1FB;color:#185FA5;margin-bottom:14px;">보장 분석: 보험 리모델링</div><div style="background:#EFEFEF;border-left:4px solid #185FA5;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:18px;"><div style="font-size:13px;font-weight:700;color:#222;margin-bottom:8px;">핵심 포인트</div><div style="font-size:14px;color:#222;line-height:1.75;">보험 리모델링은 해지 아닌 구조 재정비입니다<br>유지·정리·보강 3가지로 분류해서 효율 극대화<br>보험료 그대로 또는 줄이면서 보장은 강화 가능합니다</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#185FA5;margin-bottom:5px;">① 리모델링 개념 설명</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">해지·교체 아님을 명확히</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">고객님, ''보험 리모델링''이라고 하면<br>다 해지하고 새로 가입하는 걸로 오해하시는 분들이 많은데요.<br>그게 아닙니다.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">리모델링은 집 인테리어 다시 하는 것처럼<br>지금 보험 구조에서 좋은 건 살리고,<br>불필요한 건 정리하고,<br>부족한 건 채우는 작업입니다.<br>해지 손해 없이 효율을 올리는 방법이거든요.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 리모델링 = 해지 아님, 재정비</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#185FA5;margin-bottom:5px;">② 3분류 진단 — 유지/정리/보강</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">현재 보험을 3가지로 분류</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">리모델링하실 때 모든 보험을 3가지로 분류합니다.<br>[유지]: 지금 좋은 조건이고 그대로 두는 게 유리한 보험<br>[정리]: 중복이거나 효율이 낮아서 정리하는 게 나은 보험<br>[보강]: 빠진 보장이라 추가가 필요한 영역</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">예를 들어 5년 전 가입한 좋은 1세대 실비 — [유지]<br>최근에 똑같이 가입한 진단비 중복 — [정리]<br>치매 보장 0원 — [보강]<br>이런 식으로 분류하면 어느 쪽이든 손해가 없는 방향이 나옵니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 유지·정리·보강 — 한 번에 다 하는 게 아니라 하나씩</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#185FA5;margin-bottom:5px;">③ 리모델링 진행 흐름</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">실제 작업 순서 안내</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">리모델링 진행은 이렇게 됩니다.<br>1단계: 가입된 보험 전체 조회<br>2단계: 유지/정리/보강 3분류<br>3단계: 정리 항목 해지 검토 (해지 손익 계산)<br>4단계: 보강 항목 신규 가입</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">해지 항목은 환급금·해지 시 손해를 먼저 계산해드리고,<br>해지보다 유지가 나으면 그대로 두는 게 맞고요,<br>정리하는 게 더 나으면 그때 결정하시면 됩니다.<br>전체 작업은 보통 1~2주 안에 마무리됩니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 해지 손익 계산 후 결정 — 강요 없음</div></div></div>',
  '리모델링은 해지 아닌 재정비 — 유지/정리/보강 3분류로 효율 극대화',
  'global',
  true,
  false,
  false,
  999
);

-- 신규: [need_emphasis] 산정특례 안내형 — 급여만 5%, 비급여는 별도
INSERT INTO scripts (title, top_category, stage, type, script_text, highlight_text, scope, is_active, is_leader_pick, is_sample, sort_order)
VALUES (
  '산정특례 안내형 — 급여만 5%, 비급여는 별도',
  '필요성강조',
  'need_emphasis',
  '산정특례안내',
  '<div style="font-family:''Apple SD Gothic Neo'',''Noto Sans KR'',sans-serif;width:100%;max-width:100%;box-sizing:border-box;padding:4px 16px 16px 16px;"><div style="display:inline-block;font-size:13px;font-weight:600;padding:4px 12px;border-radius:20px;background:#EEEDFE;color:#3A2FA0;margin-bottom:14px;">필요성 강조: 산정특례 안내형</div><div style="background:#EFEFEF;border-left:4px solid #3A2FA0;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:18px;"><div style="font-size:13px;font-weight:700;color:#222;margin-bottom:8px;">핵심 포인트</div><div style="font-size:14px;color:#222;line-height:1.75;">산정특례는 4대 중증질환 본인부담을 5%로 낮춰주는 제도입니다<br>산정특례가 있어도 비급여·간병비·소득 공백은 본인 부담입니다<br>산정특례 = 충분한 보장이라는 오해를 푸는 게 핵심입니다</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3A2FA0;margin-bottom:5px;">① 산정특례 제도 설명</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">고객이 모르는 제도부터 안내</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">고객님, ''산정특례''라는 제도 들어보신 적 있으세요?<br>암·뇌혈관·심장·희귀난치질환 진단받으면<br>치료비 본인부담률을 5%로 낮춰주는 국가 제도입니다.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">원래 입원 본인부담이 20%인데,<br>산정특례 등록되면 5년간 5%만 내시면 되거든요.<br>그래서 이 제도 있다고<br>''보험 굳이 필요 있나'' 생각하시는 분들이 많습니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 산정특례 모르고 보험 가입한 분도, 알고 안 가입한 분도 많음</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3A2FA0;margin-bottom:5px;">② 산정특례의 한계 — 비급여는 별도</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">오해 풀어주기</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">그런데 한 가지 중요한 점이 있습니다.<br>산정특례는 급여 항목만 5%인 거고,<br>비급여 항목은 그대로 본인 부담입니다.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">예를 들어 면역항암제(키트루다 등)는 비급여라<br>월 500~1,000만 원이 그대로 나오고,<br>로봇수술·고가 MRI도 비급여입니다.<br>산정특례 있어도 비급여 빼면 일반 의료비와 큰 차이 없는 경우가 많거든요.<br>실비·진단비가 그래서 필요한 겁니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 산정특례 = 급여만, 비급여는 별도 — 핵심 차이</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3A2FA0;margin-bottom:5px;">③ 산정특례+보험 = 안전망</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">두 가지 모두 필요한 이유</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">산정특례는 의료비 부담을 낮춰주고,<br>실비·진단비는 비급여+생활비+간병비를 커버합니다.<br>두 가지가 합쳐져야 진짜 안전망이 되는 거거든요.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">특히 진단비는 한 번에 목돈으로 받는 거라<br>치료 기간 소득 공백을 막을 수 있고,<br>실비는 비급여 의료비를 돌려받습니다.<br>산정특례 있다고 보험 안 챙기시면<br>오히려 가장 위험한 순간에 막막해지실 수 있습니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 두 제도는 보완 관계 — 함께 있어야 안전</div></div></div>',
  '산정특례 = 급여 본인부담 5% — 비급여·간병비는 그대로 본인 부담',
  'global',
  true,
  false,
  false,
  999
);

-- 신규: [product] 종수술비 1~5종 vs 1~7종 차이
INSERT INTO scripts (title, top_category, stage, type, script_text, highlight_text, scope, is_active, is_leader_pick, is_sample, sort_order)
VALUES (
  '종수술비 1~5종 vs 1~7종 차이',
  '상품설명',
  'product',
  '종수술비',
  '<div style="font-family:''Apple SD Gothic Neo'',''Noto Sans KR'',sans-serif;width:100%;max-width:100%;box-sizing:border-box;padding:4px 16px 16px 16px;"><div style="display:inline-block;font-size:13px;font-weight:600;padding:4px 12px;border-radius:20px;background:#EAF3DE;color:#3B6D11;margin-bottom:14px;">상품 설명: 종수술비</div><div style="background:#EFEFEF;border-left:4px solid #3B6D11;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:18px;"><div style="font-size:13px;font-weight:700;color:#222;margin-bottom:8px;">핵심 포인트</div><div style="font-size:14px;color:#222;line-height:1.75;">종수술비는 수술 종류에 따라 1종~7종으로 등급 나눠 지급합니다<br>1~5종 상품과 1~7종 상품은 보장 범위와 금액 차이가 큽니다<br>수술 한 번에 수십만~수백만 원까지 지급 가능합니다</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3B6D11;margin-bottom:5px;">① 종수술비 개념</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">종(種) 분류 시스템 설명</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">고객님, 수술비 보장이라고 하면<br>그냥 똑같이 나오는 줄 아시는데 그게 아닙니다.<br>수술 종류에 따라 1종~7종으로 등급이 나뉘거든요.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">1종은 가벼운 수술 (예: 백내장, 치질)<br>3~4종은 중간 단계 (예: 충수돌기 절제, 자궁근종)<br>5~7종은 큰 수술 (예: 개복수술, 뇌수술, 심장수술)<br>등급이 높을수록 보험금도 커집니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 수술 등급 분류 — 약관에 명시</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3B6D11;margin-bottom:5px;">② 1~5종 vs 1~7종 차이</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">두 상품 구조의 결정적 차이</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">여기서 중요한 게 1~5종 보장이냐 1~7종 보장이냐입니다.<br>1~5종 상품은 6·7종(가장 큰 수술)에 보장이 안 됩니다.<br>1~7종 상품은 모든 등급 보장됩니다.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">예시 금액 (상품마다 다름):<br>1종: 10~30만 원<br>3종: 50~100만 원<br>5종: 100~200만 원<br>7종: 300~500만 원<br>가장 큰 수술인 7종이 가장 비싼데, 1~5종 상품은 이게 빠져 있는 셈입니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 5종 vs 7종 — 큰 수술일수록 차이 결정적</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3B6D11;margin-bottom:5px;">③ 현재 종수술비 확인 및 제안</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">1~5종/1~7종 여부 확인</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">고객님 지금 가입된 수술비 특약을 확인하면<br>1~5종인지 1~7종인지 바로 보입니다.<br>증권에 ''○종수술비'' 형식으로 명시되어 있거든요.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">1~5종으로 가입되어 계시면<br>큰 수술 시 보장 공백이 생길 수 있어서<br>1~7종으로 보강 검토가 필요합니다.<br>월 보험료 차이가 1~3만 원 정도인데<br>큰 수술 한 번이면 보장 차이가 수백만 원이거든요.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 1~7종으로 보강 — 큰 수술 대비</div></div></div>',
  '종수술비 1~5종은 6·7종(큰 수술) 보장 안 됨 — 1~7종 가입 권장',
  'global',
  true,
  false,
  false,
  999
);

-- 신규: [product] 4세대 암치료 보장 — 면역항암·표적·양성자
INSERT INTO scripts (title, top_category, stage, type, script_text, highlight_text, scope, is_active, is_leader_pick, is_sample, sort_order)
VALUES (
  '4세대 암치료 보장 — 면역항암·표적·양성자',
  '상품설명',
  'product',
  '4세대암치료',
  '<div style="font-family:''Apple SD Gothic Neo'',''Noto Sans KR'',sans-serif;width:100%;max-width:100%;box-sizing:border-box;padding:4px 16px 16px 16px;"><div style="display:inline-block;font-size:13px;font-weight:600;padding:4px 12px;border-radius:20px;background:#EAF3DE;color:#3B6D11;margin-bottom:14px;">상품 설명: 4세대 암치료 보장</div><div style="background:#EFEFEF;border-left:4px solid #3B6D11;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:18px;"><div style="font-size:13px;font-weight:700;color:#222;margin-bottom:8px;">핵심 포인트</div><div style="font-size:14px;color:#222;line-height:1.75;">4세대 암치료는 면역항암·표적항암·양성자치료 등 신기술 치료입니다<br>기존 항암보다 효과는 좋지만 비용이 월 500~1,000만 원 수준입니다<br>건강보험 적용 안 되는 비급여가 많아 별도 보장이 필요합니다</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3B6D11;margin-bottom:5px;">① 4세대 암치료가 뭔지 설명</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">전통 항암과의 차이</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">고객님, 요즘 암치료는 예전과 많이 달라졌습니다.<br>1세대(수술)·2세대(방사선)·3세대(항암제)에서<br>4세대로 들어왔거든요.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">4세대 암치료는 면역항암제, 표적항암제, 양성자/중입자 치료 등입니다.<br>암세포만 골라서 공격하거나 면역세포를 활성화시키는 방식이라<br>기존 항암보다 부작용 적고 효과 큰 경우가 많습니다.<br>최근 5년 사이 임상 결과가 크게 개선됐습니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 4세대 = 표적·면역·양성자 — 차세대 치료법</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3B6D11;margin-bottom:5px;">② 비용이 큰 이유</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">왜 4세대는 비싼가</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">그런데 문제는 비용입니다.<br>면역항암제 키트루다·옵디보 계열: 월 500~1,000만 원<br>양성자치료 1회 코스: 2,500~5,000만 원<br>표적항암제: 월 200~500만 원</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">이 중 일부는 건강보험 적용되지만<br>여전히 비급여로 본인 부담인 경우가 많습니다.<br>예를 들어 폐암에 효과 좋은 약이라도<br>특정 조건 만족 안 하면 비급여로 처리되어<br>월 천만 원이 그대로 본인 부담이 됩니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 효과 좋은 약일수록 비싸고 비급여 비율 높음</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3B6D11;margin-bottom:5px;">③ 4세대 암치료 보장 확인</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">지금 보험으로 커버되는지 확인</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">고객님 지금 암보험 약관을 보시면<br>''표적항암제 보장'' ''면역항암제 보장'' 같은 특약이<br>들어가 있는지 확인됩니다.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">오래된 암보험은 4세대 치료 자체가 약관에 없거나<br>일반암 진단비로만 처리되어 부족할 수 있거든요.<br>2020년 이후 출시된 상품은 4세대 보장이 들어 있는 경우가 많고,<br>없으시면 ''항암방사선치료비 특약'' 추가만으로도 보강 가능합니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 오래된 암보험 — 4세대 보장 추가 검토</div></div></div>',
  '면역항암제 월 500~1천만 — 4세대 치료 보장 약관 확인 필수',
  'global',
  true,
  false,
  false,
  999
);

-- 신규: [product] 뇌혈관질환 보장 범위 — 뇌출혈/뇌졸중/뇌혈관 전체
INSERT INTO scripts (title, top_category, stage, type, script_text, highlight_text, scope, is_active, is_leader_pick, is_sample, sort_order)
VALUES (
  '뇌혈관질환 보장 범위 — 뇌출혈/뇌졸중/뇌혈관 전체',
  '상품설명',
  'product',
  '뇌혈관질환범위',
  '<div style="font-family:''Apple SD Gothic Neo'',''Noto Sans KR'',sans-serif;width:100%;max-width:100%;box-sizing:border-box;padding:4px 16px 16px 16px;"><div style="display:inline-block;font-size:13px;font-weight:600;padding:4px 12px;border-radius:20px;background:#EAF3DE;color:#3B6D11;margin-bottom:14px;">상품 설명: 뇌혈관질환 보장 범위</div><div style="background:#EFEFEF;border-left:4px solid #3B6D11;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:18px;"><div style="font-size:13px;font-weight:700;color:#222;margin-bottom:8px;">핵심 포인트</div><div style="font-size:14px;color:#222;line-height:1.75;">뇌혈관질환은 뇌출혈만/뇌졸중까지/뇌혈관 전체 3가지 범위가 있습니다<br>뇌출혈만 보장은 전체 뇌졸중의 15%만 해당되는 좁은 범위입니다<br>넓은 범위(뇌혈관 전체)로 가입하시는 게 현실적으로 유리합니다</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3B6D11;margin-bottom:5px;">① 뇌혈관질환 보장 범위 3단계</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">범위별 차이 설명</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">고객님, 뇌 보장이라고 다 같은 게 아닙니다.<br>가장 좁은 게 뇌출혈만, 그다음이 뇌졸중까지, 가장 넓은 게 뇌혈관 전체입니다.<br>이 차이를 모르고 가입하신 분들이 많거든요.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">[좁음] 뇌출혈 — 뇌혈관이 터지는 경우만 (전체 뇌졸중의 약 15%)<br>[중간] 뇌졸중 — 뇌출혈 + 뇌경색 포함 (전체 뇌졸중의 약 91%)<br>[넓음] 뇌혈관질환 — 뇌졸중 + 일과성 허혈발작 등 모든 뇌혈관 질환<br>아래로 갈수록 보장 범위가 넓어집니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 범위 차이 — 보험금 받을 가능성 결정</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3B6D11;margin-bottom:5px;">② 뇌출혈만 보장의 위험성</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">구체적 통계로 위험 설명</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">특히 뇌출혈만 보장된 보험이 위험합니다.<br>전체 뇌졸중 환자 중 뇌출혈은 15%, 뇌경색이 76%, 지주막하출혈이 9%이거든요.<br>뇌출혈만 보장이면 4명 중 3명은 진단비를 못 받는 셈입니다.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">예전 보험(2010년 이전)은 뇌출혈만 보장하는 경우가 많고,<br>그게 그대로 유지되고 있는 분들이 많습니다.<br>실제로 뇌경색 진단받으셨는데 보험금 못 받으신 분들이<br>현장에서 종종 나오거든요.<br>(출처: 대한뇌졸중학회 뇌졸중 역학보고서, 2018)</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 뇌출혈만 ≠ 뇌졸중 보장 — 가장 흔한 함정</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3B6D11;margin-bottom:5px;">③ 현재 뇌 보장 범위 확인 및 제안</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">지금 가입된 보장 점검</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">고객님 지금 뇌 보장 진단비를 확인하면<br>약관에 어느 범위까지 보장되는지 명시되어 있습니다.<br>''뇌출혈진단비'' ''뇌졸중진단비'' ''뇌혈관질환진단비'' 중 어느 항목인지 보시면 됩니다.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">뇌출혈만이시면 뇌졸중 또는 뇌혈관질환으로 보강하시는 게 유리하고,<br>뇌졸중 보장이시면 충분한 수준이지만 금액이 적으면 추가 검토,<br>뇌혈관질환 보장이시면 가장 넓은 범위라 그대로 유지하시면 됩니다.<br>금액 권장은 최소 3천만 원 이상입니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 보장 범위 + 금액 둘 다 확인 필수</div></div></div>',
  '뇌출혈만 보장 = 전체 뇌졸중의 15% — 뇌혈관 전체 범위 권장',
  'global',
  true,
  false,
  false,
  999
);

-- 신규: [product] 허혈성심장질환 보장 범위 — 급성심근경색만 vs 허혈성 전체
INSERT INTO scripts (title, top_category, stage, type, script_text, highlight_text, scope, is_active, is_leader_pick, is_sample, sort_order)
VALUES (
  '허혈성심장질환 보장 범위 — 급성심근경색만 vs 허혈성 전체',
  '상품설명',
  'product',
  '허혈성심장범위',
  '<div style="font-family:''Apple SD Gothic Neo'',''Noto Sans KR'',sans-serif;width:100%;max-width:100%;box-sizing:border-box;padding:4px 16px 16px 16px;"><div style="display:inline-block;font-size:13px;font-weight:600;padding:4px 12px;border-radius:20px;background:#EAF3DE;color:#3B6D11;margin-bottom:14px;">상품 설명: 허혈성심장질환 보장 범위</div><div style="background:#EFEFEF;border-left:4px solid #3B6D11;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:18px;"><div style="font-size:13px;font-weight:700;color:#222;margin-bottom:8px;">핵심 포인트</div><div style="font-size:14px;color:#222;line-height:1.75;">심장 보장은 급성심근경색만/허혈성심장질환까지 2가지 범위가 있습니다<br>급성심근경색만 보장은 협심증 등 다른 심장질환에 보장이 안 됩니다<br>허혈성심장질환 범위로 가입하시는 게 보장 범위가 훨씬 넓습니다</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3B6D11;margin-bottom:5px;">① 심장 보장 범위 2단계</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">급성심근경색 vs 허혈성심장질환</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">고객님, 심장 보장도 뇌처럼 범위가 다릅니다.<br>가장 좁은 게 급성심근경색만, 넓은 게 허혈성심장질환 전체입니다.<br>이게 결정적인 차이거든요.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">[좁음] 급성심근경색 — 심장 혈관이 갑자기 막혀 심장근육이 죽는 경우만<br>[넓음] 허혈성심장질환 — 급성심근경색 + 협심증 + 만성허혈성심장질환 포함<br>심장 질환 중 협심증이 가장 흔하고, 급성심근경색은 일부거든요.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 협심증 ≠ 급성심근경색 — 약관 차이 결정적</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3B6D11;margin-bottom:5px;">② 급성심근경색만 보장의 한계</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">왜 좁은 범위가 위험한지</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">급성심근경색만 보장이면 협심증·만성허혈성심장질환은 보장이 안 됩니다.<br>그런데 실제로 심장 문제로 병원 가시는 분들 중 협심증 비중이 가장 높거든요.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">협심증으로 스텐트 시술 받으시면<br>한 번에 200~400만 원 나오고,<br>이후 약값만 한 달에 10~20만 원씩 평생인 경우도 있습니다.<br>급성심근경색만 보장된 보험으로는 이게 보장이 안 되는 거죠.<br>(2023년 심근경색 발생 34,768건, 출처: 질병관리청)</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 협심증 = 보장 사각지대 (급성심근경색만 보장 시)</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3B6D11;margin-bottom:5px;">③ 현재 심장 보장 확인 및 제안</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">지금 가입된 보장 점검</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">고객님 심장 보장 진단비 확인하시면<br>약관에 ''급성심근경색'' 또는 ''허혈성심장질환'' 중 어느 쪽인지 명시되어 있습니다.<br>급성심근경색만이시면 보강 검토가 필요합니다.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">허혈성심장질환 진단비 추가는 월 5천 원~1만 원 수준으로 가능하고,<br>한 번 큰 일이 생기면 보장 차이가 수천만 원이 되거든요.<br>금액은 최소 3천만 원 이상을 권장드리고,<br>뇌 보장과 묶어서 같이 보강하시는 게 일반적입니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 허혈성심장질환 + 뇌혈관질환 = 묶음 보강 권장</div></div></div>',
  '급성심근경색만 = 협심증 보장 안 됨 — 허혈성심장질환 범위 권장',
  'global',
  true,
  false,
  false,
  999
);

-- 신규: [product] 실비 세대별 차이 — 1·2·3·4세대 본인부담률
INSERT INTO scripts (title, top_category, stage, type, script_text, highlight_text, scope, is_active, is_leader_pick, is_sample, sort_order)
VALUES (
  '실비 세대별 차이 — 1·2·3·4세대 본인부담률',
  '상품설명',
  'product',
  '실비세대별',
  '<div style="font-family:''Apple SD Gothic Neo'',''Noto Sans KR'',sans-serif;width:100%;max-width:100%;box-sizing:border-box;padding:4px 16px 16px 16px;"><div style="display:inline-block;font-size:13px;font-weight:600;padding:4px 12px;border-radius:20px;background:#EAF3DE;color:#3B6D11;margin-bottom:14px;">상품 설명: 실비 세대별 차이</div><div style="background:#EFEFEF;border-left:4px solid #3B6D11;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:18px;"><div style="font-size:13px;font-weight:700;color:#222;margin-bottom:8px;">핵심 포인트</div><div style="font-size:14px;color:#222;line-height:1.75;">실비는 1~4세대로 나뉘며 본인부담률·갱신·할증이 다릅니다<br>1·2세대는 보장 좋지만 보험료 인상 폭이 큽니다<br>4세대는 보험료 안정적이지만 비급여 본인부담이 큽니다</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3B6D11;margin-bottom:5px;">① 실비 4세대 차이 한눈에</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">세대별 핵심 차이</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">고객님, 실비는 가입하신 시점에 따라 1~4세대로 나뉩니다.<br>각 세대마다 본인부담률·갱신 주기·할증이 다르거든요.<br>본인 실비가 어느 세대인지부터 확인하셔야 합니다.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">1세대 (~2009년): 본인부담 0~10%, 보험료 가장 높음<br>2세대 (2009~2017년): 본인부담 10~20%, 갱신 시 인상 큼<br>3세대 (2017~2021년): 본인부담 일부 제한, 비급여 분리<br>4세대 (2021년~): 비급여 30~50%, 보험료 가장 안정적<br>아래로 갈수록 보험료는 안정되지만 본인부담이 커집니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 실비 세대 = 가입 시점 — 본인부담 결정</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3B6D11;margin-bottom:5px;">② 세대별 유불리 판단</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">어느 세대가 유리한지는 상황별</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">1·2세대는 보장이 좋지만 보험료가 매년 큰 폭으로 오르고요,<br>4세대는 보험료 안정적이지만 비급여 본인부담이 30~50%입니다.<br>3세대가 그 중간이고요.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">병원 자주 가시는 분이면 1·2세대 유지가 유리하고,<br>병원 거의 안 가시는 분이면 4세대로 전환이 유리할 수 있습니다.<br>다만 한 번 4세대로 가시면 1·2세대로 못 돌아가니<br>전환 결정은 신중하셔야 합니다.<br>(2022년 뇌졸중 입원 1인당 진료비 평균 1,593만 원, 출처: 건강보험심사평가원)</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 1·2세대 = 병원 자주 / 4세대 = 거의 안 감</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3B6D11;margin-bottom:5px;">③ 현재 실비 세대 확인 및 제안</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">본인 실비 확인 방법</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">고객님 실비 가입하신 연도만 알아도 어느 세대인지 바로 보입니다.<br>2009년 이전 = 1세대 / 2009~2017 = 2세대<br>2017~2021 = 3세대 / 2021년 이후 = 4세대</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">현재 세대가 어느 쪽인지에 따라<br>유지/전환/추가 가입 여부가 결정됩니다.<br>1·2세대 가지고 계시면 보험료 부담 크지만 보장 좋아서 유지 권장,<br>3세대는 균형 좋아서 그대로 두시는 게 일반적,<br>4세대는 추가 진단비 보강이 필요할 수 있습니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 전환은 신중 — 한 번 가면 못 돌아옴</div></div></div>',
  '1·2세대 보장 좋고 비쌈 / 4세대 안정적이지만 비급여 본인부담 큼',
  'global',
  true,
  false,
  false,
  999
);

-- 신규: [product] 유병자·간편심사 보험 — 표준체부터 단계적 시도
INSERT INTO scripts (title, top_category, stage, type, script_text, highlight_text, scope, is_active, is_leader_pick, is_sample, sort_order)
VALUES (
  '유병자·간편심사 보험 — 표준체부터 단계적 시도',
  '상품설명',
  'product',
  '유병자보험',
  '<div style="font-family:''Apple SD Gothic Neo'',''Noto Sans KR'',sans-serif;width:100%;max-width:100%;box-sizing:border-box;padding:4px 16px 16px 16px;"><div style="display:inline-block;font-size:13px;font-weight:600;padding:4px 12px;border-radius:20px;background:#EAF3DE;color:#3B6D11;margin-bottom:14px;">상품 설명: 유병자·간편심사 보험</div><div style="background:#EFEFEF;border-left:4px solid #3B6D11;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:18px;"><div style="font-size:13px;font-weight:700;color:#222;margin-bottom:8px;">핵심 포인트</div><div style="font-size:14px;color:#222;line-height:1.75;">유병자 보험은 일반 보험 가입이 어려운 분들 위한 상품입니다<br>간편심사·유병자 상품은 가입은 쉽지만 보험료가 더 비쌉니다<br>건강 조건에 따라 표준체·간편심사·유병자 중 선택이 달라집니다</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3B6D11;margin-bottom:5px;">① 표준체 vs 간편심사 vs 유병자 차이</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">3가지 가입 경로 설명</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">고객님, 보험 가입에는 3가지 경로가 있습니다.<br>표준체(일반)·간편심사(2~3개 질문)·유병자(1~2개 질문) 순서로<br>심사가 간편해지지만 보험료는 비싸집니다.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">표준체: 모든 질문 통과해야 함, 보험료 가장 저렴<br>간편심사 (3·5·1형): 최근 2~3년 입원·수술 여부만 확인<br>유병자 보험: 최근 1년 이내 약 복용·입원 여부만 확인<br>지금 건강하신 분은 표준체로,<br>약 드시는 분은 간편심사·유병자로 가입 가능합니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 건강 상태에 따라 가입 경로가 다름</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3B6D11;margin-bottom:5px;">② 보험료 차이와 보장 차이</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">왜 비싸고 무엇이 다른가</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">보험료 차이가 큽니다.<br>같은 진단비 5천만 원 기준,<br>표준체 월 3만 원이면 / 간편심사 월 5만 원 / 유병자 월 7~8만 원 수준입니다.<br>심사가 간편할수록 보험사 입장에서 위험이 크니까 보험료가 비싸지는 거죠.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">보장 내용 자체는 큰 차이 없지만,<br>일부 질환은 면책 기간이 있거나(가입 후 1~2년)<br>일부 보장은 50% 감액 기간이 있을 수 있습니다.<br>약관 잘 보셔야 합니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 유병자 = 비싸지만 가입 가능 — 트레이드오프</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#3B6D11;margin-bottom:5px;">③ 현재 상황 확인 및 추천</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">고객 상태별 가입 추천</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">고객님 건강 상태에 따라 어떤 경로가 맞는지 확인해드릴 수 있습니다.<br>최근 5년 이내 큰 병 없으셨다면 → 표준체 가입 도전<br>약 드시거나 입원 이력 있으시면 → 간편심사<br>여러 질환 있으시거나 고령이시면 → 유병자</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">표준체로 도전했다가 거절되면 그때 간편심사로 가시면 되고요,<br>처음부터 비싼 유병자로 가실 필요 없습니다.<br>표준체 → 간편심사 → 유병자 순서로 시도하시는 게 일반적입니다.<br>지금 건강하시면 표준체로 가입해두시는 게 가장 유리합니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 표준체 → 간편 → 유병자 순서로 시도</div></div></div>',
  '표준체 → 간편심사 → 유병자 순서 — 보험료 차이 크니 단계적 시도',
  'global',
  true,
  false,
  false,
  999
);

-- 신규: [analysis] 만기환급 vs 순수보장 — 차액 저축 비교
INSERT INTO scripts (title, top_category, stage, type, script_text, highlight_text, scope, is_active, is_leader_pick, is_sample, sort_order)
VALUES (
  '만기환급 vs 순수보장 — 차액 저축 비교',
  '보장분석',
  'analysis',
  '만기환급순수보장',
  '<div style="font-family:''Apple SD Gothic Neo'',''Noto Sans KR'',sans-serif;width:100%;max-width:100%;box-sizing:border-box;padding:4px 16px 16px 16px;"><div style="display:inline-block;font-size:13px;font-weight:600;padding:4px 12px;border-radius:20px;background:#E6F1FB;color:#185FA5;margin-bottom:14px;">보장 분석: 만기환급 vs 순수보장</div><div style="background:#EFEFEF;border-left:4px solid #185FA5;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:18px;"><div style="font-size:13px;font-weight:700;color:#222;margin-bottom:8px;">핵심 포인트</div><div style="font-size:14px;color:#222;line-height:1.75;">만기환급형은 만기 시 보험료 일부 돌려받지만 보험료가 비쌉니다<br>순수보장형은 환급금 없지만 같은 보장 기준 보험료가 훨씬 저렴합니다<br>차액을 저축하시는 게 더 유리한 경우가 많습니다</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#185FA5;margin-bottom:5px;">① 두 구조의 핵심 차이</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">환급 vs 비환급 비교</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">고객님, 보험에는 만기환급형과 순수보장형 두 가지가 있습니다.<br>만기환급형은 만기 시 보험료 일부를 돌려받고요,<br>순수보장형은 환급은 없지만 보험료가 훨씬 쌉니다.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">예를 들어 같은 보장 기준,<br>만기환급형: 월 10만 원, 만기 시 50% 환급<br>순수보장형: 월 4~5만 원, 환급 없음<br>만기환급은 ''저축 기능'' 같은 느낌이지만<br>실제로는 보험료에 저축이 포함된 구조거든요.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 환급금 ≠ 공짜 — 보험료에 포함된 저축</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;margin-bottom:12px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#185FA5;margin-bottom:5px;">② 차액 저축 비교</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">어느 쪽이 진짜 유리한지</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">이게 핵심인데요,<br>만기환급형 월 10만 원 vs 순수보장형 월 4만 원이면<br>차액 6만 원이 매달 발생합니다.<br>이걸 적금에 넣으면 어떻게 되는지 비교해보세요.</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">20년 만기 기준,<br>만기환급형: 환급금 약 1,200만 원<br>순수보장형 + 차액 적금(연 3%): 약 1,950만 원<br>저축 운용만 잘하시면 순수보장형이 약 750만 원 더 유리합니다.<br>다만 그 차액을 정말 저축하셔야 의미 있고,<br>안 하시면 만기환급형이 강제 저축 효과로 나을 수 있습니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 차액 저축 가능하면 순수보장 유리</div></div><div style="border:1.5px solid #DCDCDC;border-radius:10px;padding:14px;background:#fff;"><div style="font-size:13px;font-weight:700;color:#185FA5;margin-bottom:5px;">③ 결정 기준 — 본인 성향 따라</div><div style="font-size:13px;color:#444;font-weight:600;margin-bottom:12px;">어떤 분에게 어느 쪽 권장</div><div style="font-size:15px;font-weight:700;color:#111;line-height:1.85;">만기환급형 추천: 저축 못 하는 성격, 강제 저축 효과 원하시는 분<br>순수보장형 추천: 차액 운용 가능, 보험료 부담 줄이고 싶으신 분</div><div style="margin-top:12px;padding-top:12px;border-top:1.5px solid #E8E8E8;font-size:14px;color:#333;line-height:1.75;">지금 가입된 보험이 만기환급형이시면<br>그대로 유지하셔도 큰 손해는 아니고요,<br>새로 가입하실 때는 순수보장형 + 차액 저축 조합을<br>한번 검토해보시는 게 좋습니다.<br>특히 진단비·실비는 순수보장형이 일반적입니다.</div><div style="margin-top:10px;padding:8px 10px;background:#FFF3DC;border-radius:6px;font-size:13px;color:#7A4400;font-weight:700;">⚡ 신규 가입 = 순수보장형 우선 검토</div></div></div>',
  '만기환급은 강제 저축 효과 / 순수보장+차액 저축이 운용 잘하면 더 유리',
  'global',
  true,
  false,
  false,
  999
);

-- 검증
SELECT id, stage, title FROM scripts WHERE created_at >= NOW() - INTERVAL '1 hour' ORDER BY id;

-- ════════════════════════════════════════════════════════════════
-- 최종 검증
-- ════════════════════════════════════════════════════════════════

-- 전체 스크립트 카운트 (적용 후 69개여야 정상: 기존 59 + 신규 10)
SELECT 
  stage, 
  COUNT(*) AS cnt
FROM scripts 
WHERE is_active = true
GROUP BY stage 
ORDER BY stage;

-- 검색 키워드 박힘 확인 (5개 샘플)
SELECT id, title, highlight_text 
FROM scripts 
WHERE 
  title LIKE '%갱신형%' OR 
  title LIKE '%산정특례%' OR
  title LIKE '%종수술비%' OR
  title LIKE '%리모델링%' OR
  title LIKE '%4세대%'
ORDER BY id;

-- 실명 잔존 여부 (결과 0건이어야 정상)
SELECT id, title 
FROM scripts 
WHERE 
  script_text LIKE '%김철민%' OR 
  script_text LIKE '%강원래%' OR 
  script_text LIKE '%이윤석%' OR 
  script_text LIKE '%이병헌%';
