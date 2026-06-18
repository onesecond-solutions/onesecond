-- onesecond 검색 속도 — pg_trgm GIN 인덱스 (2026-06-18)
-- 목적: ILIKE 부분일치 Seq Scan(전체 훑기) → Bitmap Index Scan 가속. 쿼리 재작성 0.
-- 실행: 대표님 Supabase Dashboard (신버전 pdnwgzneooyygfejrvbg)
-- 주의: CREATE INDEX CONCURRENTLY 는 트랜잭션 밖에서만 됨 = 한 문장씩 RUN.
-- 위험: 낮음(데이터 변경 0·가산형·라이브 락 없음). rollback = 맨 아래 DROP 참고.
-- 대상: 큰 텍스트 4테이블 9컬럼. 스크립트(81)·공지(18)는 행 적어 제외.

-- [0] 확장 (없으면)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- [1] 지식 (914)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ke_title_trgm ON knowledge_entries USING gin (title gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ke_body_trgm  ON knowledge_entries USING gin (body  gin_trgm_ops);

-- [2] 소식지 (534)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nl_title_trgm   ON newsletters USING gin (title    gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nl_company_trgm ON newsletters USING gin (company  gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nl_ftext_trgm   ON newsletters USING gin (full_text gin_trgm_ops);

-- [3] 보험Q&A posts (462)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_title_trgm   ON posts USING gin (title   gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_content_trgm ON posts USING gin (content gin_trgm_ops);

-- [4] 자료 myspace_files (3562 — 가장 큰 효과)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mf_name_trgm   ON myspace_files USING gin (original_name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mf_stext_trgm  ON myspace_files USING gin (search_text   gin_trgm_ops);

-- 검증(별도 RUN): STEP 1 [C] EXPLAIN ANALYZE 재측정 → Seq Scan 이 Bitmap Index Scan 으로 바뀌고 ms 단축 확인.

-- rollback(필요 시, 한 문장씩):
-- DROP INDEX CONCURRENTLY IF EXISTS idx_ke_title_trgm;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_ke_body_trgm;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_nl_title_trgm;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_nl_company_trgm;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_nl_ftext_trgm;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_posts_title_trgm;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_posts_content_trgm;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_mf_name_trgm;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_mf_stext_trgm;
