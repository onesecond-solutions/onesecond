-- ════════════════════════════════════════════════════════════════
-- 지식엔진 — 검수 완료 채굴분 ai_draft → approved 일괄 승인
-- 작성: 2026-06-13 총괄팀장(Code) / 실행: 대표님(임태성) = 승인 결재 게이트(approved 승격 = 대표 결재)
-- 대상 DB: 신버전 onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg) — 대표 확인 완료(2026-06-13)
--
-- 【배경】 knowledge_entries 914건 중 ~792건이 status='ai_draft'(사용자 검색 미노출).
--   cycle1~3 채굴분 = 워크플로가 공식출처 대조 + 상/중/하 등급 완료. '하'는 적재 단계에서 이미 전량 제외(상·중만 적재).
--   → 적재된 cycle*_mined / cycle1_error_fix = 전부 상·중 = 승인 대상.
--   official_glossary(50)·newsletter(72)는 이미 approved → 대상 아님.
--   검수 근거: docs/knowledge/cycle3/review_summary.md · docs/knowledge/cycle2/review_summary*.md · docs/data/terms_draft/*
--
-- 【노출 영향】 현재 사용자 앱(app.html)에 지식검색 미연결(관리자 knowledge-search-test / knowledge-vault 페이지만 조회).
--   → 승인해도 즉시 사용자 노출 0. approved 승격 = 향후 검색 연결 시 노출 준비 + 검수 큐 정리.
--
-- 【실행 순서】 RUN 1(진단) → RUN 2(승인 트랜잭션) → RUN 3(검증). 각 RUN 별도 실행(세션 분리 표준).
-- ════════════════════════════════════════════════════════════════


-- ── [RUN 1] 진단 (읽기 전용) — 먼저 실행해 현재 분포 확인 ──
SELECT current_database();   -- 신버전 'postgres'/프로젝트 확인용

SELECT status, source_type, count(*) AS n
FROM public.knowledge_entries
GROUP BY status, source_type
ORDER BY status, source_type;
-- 기대(개략): ai_draft = cycle1_mined 92 + cycle1_error_fix 21 + cycle2_mined ~253 + cycle2_supp 178 + cycle3_mined 248 ≈ 792
--            approved = official_glossary 50 + newsletter 72 ≈ 122
-- ※ 위 5종 외 다른 source_type의 ai_draft가 보이면 알려주세요(그 건은 본 승인 대상 아님 → 별도 판단).


-- ── [RUN 2] 승인 UPDATE (트랜잭션 — 이 블록 한 번에 실행) ──
BEGIN;

UPDATE public.knowledge_entries
SET status      = 'approved',
    reviewed_at = now(),
    review_note = COALESCE(NULLIF(review_note,''),'') ||
                  CASE WHEN COALESCE(review_note,'')='' THEN '' ELSE ' / ' END ||
                  '2026-06-13 검수완료 채굴분 일괄승인(총괄팀장 준비·대표 결재)'
WHERE status = 'ai_draft'
  AND source_type IN ('cycle1_mined','cycle1_error_fix','cycle2_mined','cycle2_supp','cycle3_mined');
-- 영향 행수 ≈ 792 (RUN 1의 ai_draft 합계와 일치해야 함).
-- 멱등: status='ai_draft' 조건이라 재실행 시 0행(이미 approved는 미변경).

COMMIT;


-- ── [RUN 3] 사후 검증 (읽기 전용 — 별도 실행) ──
SELECT status, count(*) AS n
FROM public.knowledge_entries
GROUP BY status
ORDER BY n DESC;
-- 기대: approved ≈ 914(위 5종 ai_draft가 전부였다면 전건) / ai_draft = (5종 외 잔여만) / hold 0 / discarded 0
