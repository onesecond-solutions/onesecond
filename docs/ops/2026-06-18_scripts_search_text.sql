-- onesecond 스크립트 검색 정화 영구 마이그레이션 (2026-06-18)
-- 목적: script_text(HTML 렌더용)와 분리된 search_text(검색/미리보기 평문) 신설 + HTML strip 백필
-- 실행: 대표님 Supabase Dashboard (신버전 pdnwgzneooyygfejrvbg)
-- 방법: 블록 [1] [2] 순서 RUN -> [3] 별도 RUN 검증
-- 안전: DDL은 IF NOT EXISTS / 백필은 빈 search_text만 갱신 (멱등). 데이터 손실 없음(script_text 보존).

-- [1] DDL: search_text 컬럼 (없으면 추가)
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS search_text text;

-- [2] 백필: HTML 태그/엔티티 제거 -> search_text (빈 것만, 멱등)
UPDATE scripts
SET search_text = btrim(regexp_replace(
  regexp_replace(
    regexp_replace(
      coalesce(highlight_text,'') || ' ' || coalesce(script_text,''),
      '<[^>]*>', ' ', 'g'),
    '&[a-zA-Z#0-9]+;', ' ', 'g'),
  '\s+', ' ', 'g'))
WHERE search_text IS NULL OR btrim(search_text) = '';

-- [3] 검증 (별도 RUN): filled = 채워진 수 / still_html = 태그 잔존(0이어야 함)
SELECT count(*) AS total,
  count(*) FILTER (WHERE search_text IS NOT NULL AND btrim(search_text) <> '') AS filled,
  count(*) FILTER (WHERE search_text ~ '<[a-zA-Z/]') AS still_html
FROM scripts;
