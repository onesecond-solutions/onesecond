-- ============================================
-- scripts 테이블 보강 — SQL 템플릿 (구조 전용)
-- 2026-05-03 — 4/25 사양 기반
-- ============================================
-- ⚠️ 본 파일은 *템플릿*. 실제 본문은 Group A 결과 + 팀장님 100+ 드래프트 수신 후
--    step1/step2/step3/step4/ALL_STEPS_MASTER.sql 5개 파일에 작성.
-- ⚠️ 적용은 팀장님 명시 승인 후에만 (절대 자동 실행 X).
-- ============================================


-- ===========================================================
-- STEP 1 — 검색 최적화 (UPDATE — title / highlight_text 만)
-- 대상 컬럼: title, highlight_text
-- 절대 금지: script_text 본문 수정
-- ===========================================================

-- 패턴 (예시):
-- UPDATE public.scripts
-- SET
--   title          = '기존 제목 — 검색 키워드 추가',
--   highlight_text = '핵심 메시지 + 검색 키워드'
-- WHERE id = <id>;

-- 56(또는 100+)개 row 각각 별도 UPDATE 문 또는
-- CASE WHEN id = ... THEN ... 패턴 단일 UPDATE 둘 중 선택


-- ===========================================================
-- STEP 2 — 실명 익명화 (UPDATE — script_text)
-- 대상 id: 5, 13, 21 (+ Group A-3 LIKE 검색에서 추가 발견된 id)
-- 형식: '○○○ 씨', '한 연예인이'
-- ===========================================================

-- 패턴 (예시):
-- UPDATE public.scripts
-- SET script_text = REPLACE(REPLACE(REPLACE(REPLACE(
--   script_text,
--   '김철민', '○○○ 씨'),
--   '강원래', '한 연예인이'),
--   '이윤석', '○○○ 씨'),
--   '이병헌', '한 연예인이')
-- WHERE id IN (5, 13, 21, ...);

-- 또는 id별 개별 UPDATE (실명 패턴이 다양할 경우)


-- ===========================================================
-- STEP 3 — 사례·통계 보강 (UPDATE — script_text, 텍스트만)
-- 대상 id: 9, 19, 20, 28, 44, 58 (need_emphasis)
--          26, 31, 37, 43, 51 (need_emphasis_2)
-- 도표 일체 없음 (4/25 명시)
-- 출처 명기 필수: (국립암센터 2024), (통계청 2024) 등
-- ===========================================================

-- 패턴 (예시):
-- UPDATE public.scripts
-- SET script_text = $$기존 본문...
--
-- [사례] 한 연예인이 ○○ 진단을 받았을 때 ...
-- [통계] 국내 ○○ 발병률은 매년 ○% 증가 (출처 2024)
-- $$
-- WHERE id = <id>;

-- ⚠️ Dollar-quoted ($$...$$) 권장 — 작은따옴표 이스케이프 회피


-- ===========================================================
-- STEP 4 — 신규 스크립트 INSERT
-- 4/25 원안 10개 + 팀장님 100+ 확장 드래프트
-- 컬럼값 고정: scope='global', is_active=true, is_leader_pick=false,
--              is_sample=false, sort_order=999
-- ===========================================================

-- 패턴 (단일 INSERT, 권장):
-- INSERT INTO public.scripts (
--   title, top_category, stage, type,
--   script_text, highlight_text,
--   scope, is_active, is_leader_pick, is_sample, sort_order
--   -- + Group A-1에서 발견된 추가 컬럼 (예: is_recommended)
-- ) VALUES
--   ('갱신형 vs 비갱신형 — ...', '...', 'analysis', '...',
--    $$본문$$, $$하이라이트$$,
--    'global', true, false, false, 999),
--   ('보험 리모델링 — ...', '...', 'analysis', '...',
--    $$본문$$, $$하이라이트$$,
--    'global', true, false, false, 999),
--   -- ... 10 + N rows
-- ;


-- ===========================================================
-- 검증 쿼리 (ALL_STEPS_MASTER.sql 끝에 첨부)
-- ===========================================================

-- V-1: 전체 카운트 + stage 분포
-- SELECT COUNT(*) FROM public.scripts;
-- SELECT stage, COUNT(*) FROM public.scripts GROUP BY stage ORDER BY 2 DESC;

-- V-2: 키워드 검색 5건 이상
-- SELECT id, title FROM public.scripts WHERE title ILIKE '%갱신형%' OR highlight_text ILIKE '%갱신형%';
-- SELECT id, title FROM public.scripts WHERE title ILIKE '%산정특례%' OR highlight_text ILIKE '%산정특례%';
-- SELECT id, title FROM public.scripts WHERE title ILIKE '%종수술비%' OR highlight_text ILIKE '%종수술비%';
-- SELECT id, title FROM public.scripts WHERE title ILIKE '%리모델링%' OR highlight_text ILIKE '%리모델링%';
-- SELECT id, title FROM public.scripts WHERE title ILIKE '%4세대%' OR highlight_text ILIKE '%4세대%';

-- V-3: 실명 잔존 0건
-- SELECT COUNT(*) FROM public.scripts
-- WHERE script_text LIKE '%김철민%' OR script_text LIKE '%강원래%'
--    OR script_text LIKE '%이윤석%' OR script_text LIKE '%이병헌%';
-- 기대값: 0


-- ===========================================================
-- 트랜잭션 권장 (ALL_STEPS_MASTER.sql 적용 시)
-- ===========================================================
-- BEGIN;
--   -- Step 1
--   -- Step 2
--   -- Step 3
--   -- Step 4
--   -- 검증 SELECT (결과 확인)
-- COMMIT; -- 또는 ROLLBACK;
