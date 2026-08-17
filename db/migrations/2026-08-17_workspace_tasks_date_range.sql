-- ═══════════════════════════════════════════════════════════════════════════
-- 🟢 스키마 확장(컬럼 추가만, 기존 데이터 무변경) — 캘린더 일정 기간(종료일/종료시간)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- 배경: 대표 지시(2026-08-17) — 캘린더 일정 등록을 구글 캘린더 스타일로
--   재설계하며 "여러 날짜에 걸친 기간" 저장을 지원해야 함. 현재
--   workspace_tasks에는 시작일(task_date)/시작시간(task_time)만 있고
--   종료일/종료시간 컬럼이 없어 기간을 저장할 수 없음.
--
-- 처리: workspace_tasks에 end_date(date, nullable), end_time(time, nullable)
--   컬럼만 추가한다. 기존 행은 NULL로 남고, 애플리케이션이 조회 시
--   end_date가 NULL이면 task_date(하루짜리 일정)로 취급한다(코드에서 처리,
--   이 마이그레이션은 데이터를 백필하지 않음).
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.workspace_tasks
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS end_time time;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK — 추가한 컬럼만 제거(다른 컬럼·행 데이터는 건드리지 않음).
-- ═══════════════════════════════════════════════════════════════════════════
-- BEGIN;
--   ALTER TABLE public.workspace_tasks DROP COLUMN IF EXISTS end_date;
--   ALTER TABLE public.workspace_tasks DROP COLUMN IF EXISTS end_time;
-- COMMIT;
