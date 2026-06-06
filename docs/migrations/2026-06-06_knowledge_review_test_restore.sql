-- 검수 큐 검증 테스트 4건 ai_draft 복구 (2026-06-06)
-- 크롬 검수에서 테스트로 판정된 4건을 ai_draft로 되돌려 깨끗한 49건으로 본 검수 시작.
--   보험료(보류 테스트) / 보험금(폐기 테스트) / 보험가입금액·계약자(확인창 없이 일괄 처리분)
-- 보험계약 1건(개별 승인, 정상)은 approved 유지 -> WHERE 에서 제외.
-- 신버전 pdnwgzneooyygfejrvbg SQL 에디터에서 실행. 실행은 팀장님 결재 후.

update public.knowledge_entries
set status='ai_draft', reviewed_at=null, reviewed_by=null, review_note=null, updated_at=now()
where source_type='official_glossary'
  and title in ('보험료','보험금','보험가입금액','계약자');

-- 검증 (별도 RUN, 읽기)
-- select status, count(*) from public.knowledge_entries group by status;
-- 기대: ai_draft 49 / approved 73 / hold 0 / discarded 0
