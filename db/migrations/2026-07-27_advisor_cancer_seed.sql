-- ═══════════════════════════════════════════════════════════════════════════
-- 🟢 시드 — 설계사 전용 자료 3건 (advisor_contents, source_id='cancer-treatment')
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⏳ DRAFT — 미적용. 실제 반영 = workflow_dispatch db-migrate.yml → production-db → AI팀 apply.
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
--
-- 목적(대표 지시 2026-07-27):
--   암주요치료비 변천사(source_id='cancer-treatment')에 설계사 전용 콘텐츠 3건을 published 로 시드한다.
--   → 임태성 실장 게이트(파일럿 유지)에서 "설계사 전용 자료" 버튼이 뜨고, 클릭 시 3섹션 펼침.
--   비로그인·무권한 로그인 = RLS(advisor_contents_select)로 0행 → 버튼 미표출.
--   ※ 열람 정책은 파일럿(os_can_read_advisor_docs = 임태성 실장 + admin) 그대로. 정식 전환(설계사 전체) 무접촉.
--
-- 문구 출처: pages/cancer-treatment-history.html 기존 자산 재사용(창작 0).
--   · ① 상담 판단 기준        : :244-246
--   · ② 보장금액 산정 가이드라인 : :249-250
--   · ③ 단독 가입             : :375-377
--   배지가 이미 "설계사 전용"이므로 본문은 순수 내용만.
--
-- 블록 계약(앱 렌더 advisor-doc.js): paragraph{text} / callout{label,text} / checklist{items[]} / script{text}.
--
-- 선행: 2026-07-26_advisor_contents_generic.sql (테이블·RLS·파일럿 이관) 적용 완료 전제.
-- 멱등성: (source_type, source_id, section_key) 중복이면 미삽입(on conflict do nothing) → 재실행 안전.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

insert into advisor_contents (source_type, source_id, section_key, title, content_blocks, status, sort_order)
values
  -- ① 상담 판단 기준 --------------------------------------------------------
  ('knowledge_doc', 'cancer-treatment', 'consult-1',
   '상담 판단 기준 — 가입 시기부터 확인',
   jsonb_build_array(
     jsonb_build_object('type','paragraph','text',
       '고객 계약 시기를 먼저 확인하세요. 담보명이 같아도 약관상 ''주요 치료''의 정의가 회사마다 다릅니다.'),
     jsonb_build_object('type','checklist','items', jsonb_build_array(
       '2020~2023년 가입 → 표적항암 한정 여부',
       '2024년 가입 → 정액형·비례형 여부',
       '2025년 이후 가입 → 급여 표준치료 구간이 비어 있는지')),
     jsonb_build_object('type','callout','label','주의','text',
       '비례형 암주요치료비는 2024년 11월부터 판매중단. 그 이전 계약은 정액/비례 확인이 특히 중요합니다.')
   ),
   'published', 1),

  -- ② 보장금액 산정 가이드라인 ----------------------------------------------
  ('knowledge_doc', 'cancer-treatment', 'guideline-1',
   '보장금액 산정 가이드라인 — 규제 흐름 체크',
   jsonb_build_array(
     jsonb_build_object('type','paragraph','text',
       '보장금액 산정 가이드라인은 2025년 1월 경증 담보부터 적용됐고, 2026년 중증질환까지 확대가 추진 중입니다.'),
     jsonb_build_object('type','paragraph','text',
       '담보를 잘게 쪼개 보험금 규모를 키우는 설계 관행에도 제동이 예고돼 있습니다.'),
     jsonb_build_object('type','callout','label','확인','text',
       '시행 시기는 미정이며 최종 약관으로 확인하세요.')
   ),
   'published', 2),

  -- ③ 단독 가입 ------------------------------------------------------------
  ('knowledge_doc', 'cancer-treatment', 'standalone-1',
   '단독 가입 — 연계 없이 열린 사례',
   jsonb_build_array(
     jsonb_build_object('type','paragraph','text',
       '암주요치료비(3세대, 2024.1~)는 통상 비례보상 특약과 연계가 필요한 구조입니다.'),
     jsonb_build_object('type','paragraph','text',
       'DB손보·메리츠·롯데는 비례보상 특약 연계 없이 단독 가입을 허용했습니다. 연계 구조를 개방한 사례로, 고객 상황에 따라 설계 폭을 넓힐 수 있습니다.'),
     jsonb_build_object('type','callout','label','탑재사(2024.3 기준)','text',
       '현대해상·DB손보·메리츠화재·롯데손보. 삼성화재·한화손보는 ''암진단후암특정치료비''라는 유사 담보.')
   ),
   'published', 3)
on conflict (source_type, source_id, section_key) do nothing;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK — 이번에 시드한 암 3건만 제거(다른 소스·파일럿 무접촉)
-- ═══════════════════════════════════════════════════════════════════════════
-- begin;
--   delete from advisor_contents
--    where source_type='knowledge_doc' and source_id='cancer-treatment'
--      and section_key in ('consult-1','guideline-1','standalone-1');
-- commit;
