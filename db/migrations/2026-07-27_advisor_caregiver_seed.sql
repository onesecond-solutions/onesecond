-- ═══════════════════════════════════════════════════════════════════════════
-- 🟢 시드 — 설계사 전용 자료 3건 (advisor_contents, source_id='caregiver-history')
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⏳ DRAFT — 미적용. 실제 반영 = workflow_dispatch db-migrate.yml → production-db → AI팀 apply.
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
--
-- 목적(대표 지시 2026-07-27):
--   간병·치매 변천사(source_id='caregiver-history')에 설계사 전용 콘텐츠 3건을 published 로 시드한다.
--   → 임태성 실장 게이트(파일럿 유지)에서 "설계사 전용 자료" 버튼이 뜨고, 클릭 시 3섹션 펼침.
--   ※ 열람 정책은 파일럿(os_can_read_advisor_docs = 임태성 실장 + admin) 그대로. 정식 전환 무접촉.
--
-- 문구 출처: js/caregiver-history.js 원본 재료(상담 확인 포인트 중심 재구성, 창작 최소화).
--   · 3상품군 비교(COLS/ROWS 핵심확인·주요위험) · 확인 8가지(CHK) · 180일 한도·급여화(:160,173-174,182-194,201-206)
--   ⚠️ 간병 원본은 실손·암과 달리 "설계사 전략" 라벨이 없어, 본문의 상담 확인 포인트를 재료로 재구성했다.
--      배지가 이미 "설계사 전용"이므로 본문은 순수 내용만.
--
-- 블록 계약(advisor-doc.js): paragraph{text} / callout{label,text} / checklist{items[]} / script{text}.
--
-- 선행: 2026-07-26_advisor_contents_generic.sql (테이블·RLS) 적용 완료 전제.
-- 멱등성: (source_type, source_id, section_key) 중복이면 미삽입(on conflict do nothing) → 재실행 안전.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

insert into advisor_contents (source_type, source_id, section_key, title, content_blocks, status, sort_order)
values
  -- ① 상담 판단 기준 — 세 상품군부터 구분 -----------------------------------
  ('knowledge_doc', 'caregiver-history', 'consult-1',
   '상담 판단 기준 — 세 상품군부터 구분',
   jsonb_build_array(
     jsonb_build_object('type','paragraph','text',
       '간병보험은 성격이 다른 세 상품군(장기간병보험 · 간병인 지원형 · 간병인 사용일당형)이 얽혀 있습니다. 증권에 간병이라는 단어가 있어도 같은 담보가 아니니, 고객 증권이 어느 유형인지부터 구분하세요.'),
     jsonb_build_object('type','checklist','items', jsonb_build_array(
       '장기간병보험 → 등급·상태 판정 기준(치매·ADL·장기요양등급)',
       '간병인 지원형 → 지원 가능 지역·대체 지급 조건',
       '간병인 사용일당형 → 영수증·사용시간·인정 업체 기준')),
     jsonb_build_object('type','callout','label','유형별 주요 위험','text',
       '장기간병=판정 기준 미충족 / 지원형=간병인 공급 부족 / 사용일당형=증빙 누락·약관 불일치.')
   ),
   'published', 1),

  -- ② 내 보험에서 확인할 8가지 ----------------------------------------------
  ('knowledge_doc', 'caregiver-history', 'checklist-1',
   '내 보험에서 확인할 8가지',
   jsonb_build_array(
     jsonb_build_object('type','paragraph','text',
       '가입금액보다 지급 방식·조건을 함께 봐야 합니다. 상담 시 고객 증권에서 아래 8가지를 확인하세요.'),
     jsonb_build_object('type','checklist','items', jsonb_build_array(
       '지급 방식 — 간병인을 보험사가 보내주는지, 현금으로 주는지',
       '병원 구분 — 일반병원과 요양병원의 보장금액이 같은지',
       '사용 시간 — 하루 몇 시간 이상 사용해야 전액 지급인지',
       '가족간병 — 가족이 간병한 경우 인정되는지',
       '인정 기준 — 인정되는 간병업체·플랫폼 기준',
       '180일 이후 — 1~180일 이후에도 이어지는 보장이 있는지',
       '갱신 조건 — 갱신형인지, 갱신주기가 몇 년인지',
       '통합서비스 — 간호·간병통합서비스 이용 시 별도 일당이 나오는지'))
   ),
   'published', 2),

  -- ③ 180일 한도·급여화 흐름 체크 -------------------------------------------
  ('knowledge_doc', 'caregiver-history', 'trend-1',
   '180일 한도·급여화 흐름 체크',
   jsonb_build_array(
     jsonb_build_object('type','paragraph','text',
       '간병인 사용일당 담보 상당수는 1회 입원당 180일 한도가 있어, 넘기면 보장 공백이 생깁니다. 일부 보험사는 1~180일 담보와 181일 이상 담보를 별도 구성해 장기입원 공백을 보완합니다.'),
     jsonb_build_object('type','callout','label','주의','text',
       '181일 이상 담보 = 무제한 보장이 아닙니다. 보장 개시 시점·1회 입원 한도·연간 한도·요양병원 적용 여부·증빙 기준을 회사별로 다시 확인하세요.'),
     jsonb_build_object('type','paragraph','text',
       '국가 간병 급여화는 2026년 하반기부터 의료중심 요양병원의 의료필요도 높은 입원환자를 대상으로 추진(본인부담 30% 내외)입니다. 전국 일괄이 아니라 단계적이며, 확정 시행이 아닌 추진 계획입니다.'),
     jsonb_build_object('type','callout','label','상담 포인트','text',
       '국가가 곧 다 해준다는 기대도, 여전히 전부 본인 부담이라는 걱정도 모두 정확하지 않습니다 — 대상 병원이 단계적으로 느는 과도기임을 안내하세요.')
   ),
   'published', 3)
on conflict (source_type, source_id, section_key) do nothing;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK — 이번에 시드한 간병 3건만 제거(다른 소스·파일럿 무접촉)
-- ═══════════════════════════════════════════════════════════════════════════
-- begin;
--   delete from advisor_contents
--    where source_type='knowledge_doc' and source_id='caregiver-history'
--      and section_key in ('consult-1','checklist-1','trend-1');
-- commit;
