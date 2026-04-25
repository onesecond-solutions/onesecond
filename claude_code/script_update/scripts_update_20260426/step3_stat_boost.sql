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