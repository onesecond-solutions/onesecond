-- ═══════════════════════════════════════════════════════════════════════════
-- 🟢 인덱스 추가(데이터 변경 없음) — workspace_items 정렬 인덱스 불일치 해소
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 배경: 대표 지시로 보험브리핑 워크스테이션(/insubriefing/workstation/) 로딩 지연 진단.
--   js/personal-workspace.js의 workspace_items 조회는 `order=created_at.desc`로 정렬하지만,
--   기존 인덱스는 workspace_items_owner_idx(owner_id, updated_at DESC) 하나뿐이라
--   정렬에 쓰이지 못하고 owner 소유 행 전체를 매번 다시 정렬해야 했다.
--   실제 응답 재조회 폭주(쓰기마다 loadData(true))는 PR #1649로 이미 제거했고,
--   본 마이그레이션은 그 2순위 원인(정렬-인덱스 불일치)만 별도로 해소한다.
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
--    구버전(qursjteiovcylqiepmlo)은 2026-06-19 삭제됨 — 절대 참조 금지.
--
-- 영향: 순수 인덱스 추가(데이터 UPDATE/DELETE 없음). CONCURRENTLY 미사용
--   (단일 트랜잭션 강제 규약상 사용 불가하나, 대상 테이블이 파일럿 1계정 기준
--   수천 행 규모라 짧은 쓰기 잠금으로도 즉시 완료됨 — 운영 영향 무시 가능).
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE INDEX IF NOT EXISTS workspace_items_owner_created_idx
  ON public.workspace_items (owner_id, created_at DESC);

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK (되돌리기) — 이 마이그레이션을 취소하려면 아래를 실행한다.
--   인덱스 하나만 제거하면 이전 상태로 완전히 복귀한다(데이터 변경 없었으므로 부작용 없음).
-- ═══════════════════════════════════════════════════════════════════════════
-- BEGIN;
--   DROP INDEX IF EXISTS public.workspace_items_owner_created_idx;
-- COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- 검증(🟢 읽기전용) — 적용 후 참고용 수동 확인 쿼리(자동 postverify는 별도 파일).
-- ═══════════════════════════════════════════════════════════════════════════
-- SELECT indexname, indexdef FROM pg_indexes
--  WHERE schemaname='public' AND tablename='workspace_items' ORDER BY indexname;
--
-- EXPLAIN (ANALYZE, BUFFERS)
--   SELECT id FROM public.workspace_items
--    WHERE owner_id = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd' AND deleted_at IS NULL
--    ORDER BY created_at DESC LIMIT 2000;
--   -- workspace_items_owner_created_idx 사용 확인(Index Scan/Only Scan, 별도 Sort 노드 없어야 함)
