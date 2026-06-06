-- 보험 용어 기초 사전 1차 50개 (계약전알릴의무는 고지의무 동의어로 처리, 품질보증해지 독립 추가)
-- 전건 status=ai_draft -> 검수 큐 경유. source_type=official_glossary. 전건 재서술(원문 복제 0).
-- 신버전 pdnwgzneooyygfejrvbg SQL 에디터에서 실행. 실행은 팀장님 결재 후.
-- 출처표시: source_title 병기. 약관 직결 수치/기간은 "약관에 따른다"로 일반화(정확성 우선).
-- 청약철회 / 품질보증해지 = 각각 독립 용어(상호 동의어 아님, 본문에서 차이 설명).

insert into public.knowledge_entries
  (type, title, body, category, tags, source_type, source_id, source_title, status, confidence, created_by)
values
('term','보험계약','계약자가 보험료를 내고, 보험사가 약관에서 정한 보험사고가 생기면 보험금을 지급하기로 하는 계약.','계약',array['보험계약','계약'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','보험료','계약자가 보장을 받기 위해 보험사에 내는 돈.','계약',array['보험료','납입'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','보험금','보험사고가 발생했을 때 보험사가 수익자에게 지급하는 돈.','계약',array['보험금','지급'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','보험가입금액','보장의 기준이 되는 금액으로, 보험금 산정의 바탕이 되는 약정 금액.','계약',array['보험가입금액','가입금액','보장금액'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','계약자','보험사와 계약을 맺고 보험료 납입 의무를 지는 사람.','계약',array['계약자'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','피보험자','그 사람의 생명·신체·건강이 보험의 대상이 되는 사람.','계약',array['피보험자'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','수익자','보험금을 받을 권리를 가진 사람.','계약',array['수익자'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','청약','계약자가 보험에 가입하겠다고 보험사에 신청하는 의사표시.','계약',array['청약'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','승낙','보험사가 청약을 심사해 계약을 받아들이는 것. 승낙으로 계약이 성립한다.','계약',array['승낙','계약성립'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','청약철회','계약자가 청약 후 약관에서 정한 기간 안에 별도의 사유 없이 청약을 거둬들이고 낸 보험료를 돌려받는 제도. 모집 과정의 하자를 따지지 않는 점에서 품질보증해지와 다르다.','계약',array['청약철회','철회'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','품질보증해지','보험 모집 과정에서 약관·청약서 부본 미교부, 자필서명 누락, 중요내용 설명의무 위반 등 하자가 있을 때 계약자가 약관에서 정한 기간 안에 계약을 취소하고 낸 보험료를 돌려받는 제도. 모집 하자를 사유로 한다는 점에서 청약철회와 다르다.','계약',array['품질보증해지','불완전판매'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','고지의무','계약 체결 전 계약자·피보험자가 건강상태 등 보험사가 묻는 중요한 사항을 사실대로 알려야 하는 의무. 계약전알릴의무라고도 한다.','의무',array['고지의무','계약전알릴의무'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','통지의무','계약 후 직업 변경 등 위험이 크게 바뀌는 사실이 생기면 계약자·피보험자가 보험사에 알려야 하는 의무. 계약후알릴의무라고도 한다.','의무',array['통지의무','계약후알릴의무'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','면책사항','보험사고가 나도 보험금을 지급하지 않는, 약관에서 정한 사유.','의무',array['면책사항','면책'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','종신보험','피보험자가 사망할 때 보험금을 지급하며 보장이 평생(종신) 이어지는 보험.','상품',array['종신보험','사망보장','평생보장'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','정기보험','정해진 보험기간 동안에만 사망 등을 보장하고, 기간이 끝나면 보장이 종료되는 보험.','상품',array['정기보험','기간보장'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','변액보험','낸 보험료의 일부를 펀드에 투자해 그 운용 실적에 따라 보험금·해약환급금이 변동되는 보험.','상품',array['변액보험','투자','펀드'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','CI보험','암·뇌졸중·급성심근경색 등 중대한 질병(Critical Illness)이 발생하면 사망보험금의 일부를 미리 지급하는 보험. 중대질병보험이라고도 한다.','상품',array['CI보험','중대질병보험'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','연금보험','낸 보험료를 적립해 일정 시점부터 연금 형태로 나눠 받는 보험.','상품',array['연금보험','노후','적립'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','실손의료보험','질병·상해로 실제 부담한 의료비를 약관 한도 안에서 보상하는 보험. 실손보험·실비보험이라고도 한다.','상품',array['실손의료보험','실손보험','실비보험'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','변액유니버셜보험','변액보험의 투자 기능과 보험료 납입·인출의 자유로움(유니버셜)을 합친 보험.','상품',array['변액유니버셜보험','VUL','투자'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','정기특약','주계약에 덧붙여 일정 기간 사망 등을 추가로 보장하는 특약.','상품',array['정기특약','특약'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','진단비','약관에서 정한 질병으로 진단확정되면 지급하는 보험금.','보장',array['진단비','진단확정'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','입원비','질병·상해로 입원했을 때 입원 일수 등에 따라 지급하는 보험금.','보장',array['입원비','입원'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','수술비','약관에서 정한 수술을 받았을 때 지급하는 보험금.','보장',array['수술비','수술'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','납입면제','약관에서 정한 사유(예: 일정 수준 이상의 장해, 특정 중대질병 진단 등)가 생기면 그 이후 보험료 납입을 면제하되 보장은 그대로 유지하는 제도. 구체적 사유·범위는 상품 약관에 따른다.','보장',array['납입면제','보험료납입면제'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','선지급','약관에서 정한 사유(예: 여명 진단 등)가 있을 때 사망보험금의 일부를 미리 지급하는 것.','보장',array['선지급','선지급서비스'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','중도인출','계약 유지 중 해약환급금의 일부를 약관 범위 안에서 미리 찾아 쓰는 것.','보장',array['중도인출','인출'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','약관대출','해약환급금 범위 안에서 보험사로부터 대출받는 것. 보험계약대출이라고도 한다.','보장',array['약관대출','보험계약대출'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','사망보험금','피보험자가 사망했을 때 지급하는 보험금.','보장',array['사망보험금','사망'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','실효','보험료를 납입기일까지 내지 못하고 약관상 유예기간도 지나면 계약의 효력이 상실되는 것. 효력상실이라고도 한다.','유지',array['실효','효력상실'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','부활','실효된 계약을 약관에서 정한 기간 안에 밀린 보험료와 약정 이자를 내고(필요 시 고지의무를 다시 이행) 효력을 되살리는 것.','유지',array['부활','계약부활'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','감액','보험가입금액(보장금액)을 줄이는 것. 그만큼 이후 보험료도 줄어든다.','유지',array['감액','보장금액축소'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','감액완납','보험료 납입을 중단하는 대신 그때까지 쌓인 해약환급금을 재원으로 보험기간은 그대로 두고 보장금액을 줄여 더 이상 보험료를 내지 않는 완납 상태로 바꾸는 것.','유지',array['감액완납','완납'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','해약환급금','계약을 중도에 해지할 때 계약자에게 돌려주는 금액. 해지환급금이라고도 한다.','유지',array['해약환급금','해지환급금'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','연장정기보험','보험료 납입을 중단하고 해약환급금을 재원으로 보장금액은 그대로 두되 보험기간을 줄여 정기보험 형태로 유지하는 제도.','유지',array['연장정기보험','납입중단유지'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','자동대출납입','보험료를 내지 못할 때 해약환급금 범위 안에서 자동으로 약관대출을 받아 보험료를 대신 내 계약을 유지하는 제도.','유지',array['자동대출납입','APL'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','납입유예','보험료를 정해진 기일에 내지 못해도 일정 기간 계약의 효력을 유지해 주는 유예 기간.','유지',array['납입유예','유예기간'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','언더라이팅','보험사가 청약을 심사해 인수 여부와 조건을 결정하는 과정. 인수심사라고도 한다.','인수',array['언더라이팅','인수심사'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','표준체','건강상태 등이 보험사 기준에 부합해 추가 조건 없이 표준 보험료로 가입하는 피보험자.','인수',array['표준체'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','표준미달체','건강상태 등이 표준에 못 미쳐 보험료 할증·부담보 등 조건이 붙어 가입하는 피보험자.','인수',array['표준미달체','할증','부담보'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','할증','위험이 표준보다 높을 때 보험료를 표준보다 더 올려 받는 것.','인수',array['할증','보험료할증'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','부담보','특정 질병·부위를 일정 기간 또는 전 기간 동안 보장에서 제외하는 조건부 인수.','인수',array['부담보','부담보조건'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','지정대리청구인','피보험자가 보험금을 직접 청구하기 어려운 사정(예: 의식불명 등)에 대비해 계약자가 미리 정해 두어 대신 보험금을 청구할 수 있게 한 사람.','청구',array['지정대리청구인','대리청구인','지정대리청구'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','보험금청구권','보험사고가 발생했을 때 수익자가 보험금을 청구할 수 있는 권리.','청구',array['보험금청구권','청구권'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','소멸시효','보험금청구권 등 권리를 일정 기간 행사하지 않으면 소멸되는 것. 그 기간은 약관·법률에 따른다.','청구',array['소멸시효','시효'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','면책기간','계약 후 일정 기간 동안 보험사고가 나도 보험금을 지급하지 않는, 약관에서 정한 기간.','청구',array['면책기간','면책'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','대기기간','보장이 시작되기까지 기다려야 하는, 약관에서 정한 기간. 면책기간과 비슷한 뜻으로 쓰인다.','청구',array['대기기간'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','비과세','약관에서 정한 요건을 갖춘 보험차익 등에 세금을 매기지 않는 것. 그 요건은 세법에 따른다.','세제',array['비과세','세제혜택'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin'),
('term','보험차익','만기·해지 시 받는 금액에서 그동안 낸 보험료를 뺀 차익. 세제 적용은 세법에 따른다.','세제',array['보험차익','차익'],'official_glossary','fss_finedic','금융감독원 금융용어사전','ai_draft','high','admin');

-- 검증 (별도 RUN, 읽기)
-- select count(*) from public.knowledge_entries where source_type='official_glossary';  -- 50 기대
-- select status, count(*) from public.knowledge_entries group by status;  -- approved 72 + ai_draft 50
