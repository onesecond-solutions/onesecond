-- =====================================================================
-- B-1 제안 DDL : OCR 본문 원본/정제본 분리 (슬라이스3 Phase B)
-- 대상 프로젝트 : onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg) [신버전·유일 진실]
-- 실행 주체     : 대표님 Dashboard 직접 (Code 실행 금지)
-- 설계          : 원본 컬럼 그대로 보존 + 정제본(clean_text) 신설 / 검색=원본+정제본 합집합
-- 주의          : CREATE INDEX CONCURRENTLY 는 한 줄씩 실행 권장(트랜잭션 밖)
-- =====================================================================

-- [0] 신버전 재확인 (실행 전)
select current_database();

-- [1] 정제본 컬럼 추가 (원본 컬럼 search_text / full_text / body 는 그대로 보존)
alter table public.myspace_files     add column if not exists clean_text text;
alter table public.newsletters       add column if not exists clean_text text;
alter table public.knowledge_entries add column if not exists clean_text text;

-- [2] 정제본 trgm GIN 인덱스 (원본 인덱스는 #822 기존 / 합집합 검색용)
--     아래 세 줄은 가능하면 한 줄씩 따로 실행
create index concurrently if not exists idx_mf_ctext_trgm on public.myspace_files     using gin (clean_text gin_trgm_ops);
create index concurrently if not exists idx_nl_ctext_trgm on public.newsletters       using gin (clean_text gin_trgm_ops);
create index concurrently if not exists idx_ke_ctext_trgm on public.knowledge_entries using gin (clean_text gin_trgm_ops);

-- [3] 확인 (실행 후) : 컬럼 3개 생성 확인
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public' and column_name = 'clean_text'
order by table_name;

-- [4] 확인 (실행 후) : 정제본 인덱스 3개 생성 확인
select indexname, tablename
from pg_indexes
where schemaname = 'public' and indexname in ('idx_mf_ctext_trgm','idx_nl_ctext_trgm','idx_ke_ctext_trgm')
order by tablename;
