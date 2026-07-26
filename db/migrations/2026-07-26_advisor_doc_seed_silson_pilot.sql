-- ═══════════════════════════════════════════════════════════════════════════
-- 🟢 시드 — 설계사 전용 자료 파일럿 콘텐츠 1건 (advisor_doc_contents, doc_id=silson)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⏳ DRAFT — 미적용. 실제 반영 = workflow_dispatch db-migrate.yml → production-db → AI팀 apply.
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
--
-- 목적(대표 지시 2026-07-26):
--   실손 변천사(doc_id='silson')에 파일럿 검수용 설계사 전용 콘텐츠 1건을 published 로 시드한다.
--   → 임태성 실장 게이트에서 "설계사 전용 자료 보기" 버튼이 실제로 뜨고, 클릭 시 펼침·닫힘 검수.
--   비로그인·무권한 로그인 = RLS(advisor_doc_contents_select)로 0행 → 버튼 미표출.
--
-- 문구 출처: pages/silson-generations.html:236 "설계사 전략" 원문(기존 자산 재사용, 창작 0).
--   배지가 이미 "설계사 전용"이므로 body 는 순수 내용만(접두 "설계사 전략 ·" 제외).
--
-- 선행: 2026-07-26_advisor_doc_contents.sql (테이블·RLS) 이미 적용 완료.
-- 멱등성: (doc_id, section_key) 중복이면 미삽입(where not exists) → 재실행 안전.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

insert into advisor_doc_contents (doc_id, section_key, title, body, status, sort_order)
select 'silson', 'pilot-1',
       '실손 유지·전환 설계사 전략',
       '보험료 인상이 커도 해지·전환 방어 최우선. 2026.11부터 선택형 할인 특약(일부 보장 제외)으로 약 40% 할인 가능 — 유지하면서 부담을 낮추는 카드로 제안.',
       'published', 1
where not exists (
  select 1 from advisor_doc_contents where doc_id = 'silson' and section_key = 'pilot-1'
);

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK
-- ═══════════════════════════════════════════════════════════════════════════
-- begin;
--   delete from advisor_doc_contents where doc_id='silson' and section_key='pilot-1';
-- commit;
