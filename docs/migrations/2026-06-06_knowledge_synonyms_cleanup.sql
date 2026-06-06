-- knowledge_synonyms 정리 (2026-06-06)
-- 결재 전 적재된 동의어 8쌍을 삭제하고 기존 7행(어제 시드)만 남긴다.
-- A안 결재. 신버전 pdnwgzneooyygfejrvbg SQL 에디터에서 실행. 실행 전후 count 보고.

-- STEP 0 (읽기, 별도 RUN): 실행 전 분포 확인 -> 15 기대
-- select count(*) from public.knowledge_synonyms;

-- STEP 1 (삭제): 결재 전 적재 8쌍만 제거 (기존 7행 보존)
delete from public.knowledge_synonyms
where term in ('해약환급금','납입면제','고지의무','통지의무','실효','지정대리청구인','언더라이팅','청약철회');

-- STEP 2 (읽기, 별도 RUN): 실행 후 확인 -> 7 기대
-- select count(*) as total, array_agg(term order by term) as terms from public.knowledge_synonyms;
