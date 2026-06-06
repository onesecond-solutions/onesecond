-- 보험 용어 사전 동의어 시드 9쌍 (약칭·이형)
-- 쌍별 목록 결재 = 게이트(knowledge_synonyms는 검수 큐 없음). 실행은 팀장님 결재 후.
-- 제외: 지정대리청구인(이미 적재됨, total 8에 포함) / 청약철회·품질보증해지(별개 제도, 상호 동의어 금지).
-- 신버전 pdnwgzneooyygfejrvbg SQL 에디터에서 실행.

insert into public.knowledge_synonyms (term, synonyms) values
('해약환급금',   array['해지환급금']),
('납입면제',     array['보험료납입면제']),
('고지의무',     array['계약전알릴의무']),
('통지의무',     array['계약후알릴의무']),
('실효',         array['효력상실']),
('언더라이팅',   array['인수심사']),
('CI보험',       array['중대질병보험']),
('실손의료보험', array['실손보험','실비보험']),
('약관대출',     array['보험계약대출']);

-- 검증 (별도 RUN, 읽기)
-- select count(*) as total from public.knowledge_synonyms;  -- 8 + 9 = 17 기대
-- select term, synonyms from public.knowledge_synonyms order by term;
