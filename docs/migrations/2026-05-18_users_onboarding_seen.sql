-- ════════════════════════════════════════════════════════════════════════════
--  2026-05-18 — public.users.onboarding_seen 컬럼 추가
-- ════════════════════════════════════════════════════════════════════════════
--
--  목적:
--    가입 직후 1회 풀스크린 환영 화면 표시 여부를 cross-device 기준으로 관리
--    (관련 결정: docs/decisions/2026-05-18_login_after_welcome_menu_decision.md)
--
--  안전성:
--    · ADD COLUMN IF NOT EXISTS — 멱등 (중복 실행 안전)
--    · DEFAULT FALSE — 기존 row 모두 자동으로 false 설정 (아직 환영 화면 안 본 상태)
--    · NOT NULL — null 가드, 표시 로직 단순화
--    · 옛 RLS 정책은 그대로 사용 (users 테이블 본인 row PATCH 권한이면 충분)
--
--  실행 환경:
--    · Supabase 신버전 = pdnwgzneooyygfejrvbg (onesecond-v1-restore-0420)
--    · ⚠️ 실행 전 좌상단 프로젝트가 onesecond-v1-restore-0420 인지 반드시 확인
--    · 구버전 qursjteiovcylqiepmlo 실행 절대 금지 (2026-04-22~23 데이터 소실 자리)
--
--  코드 정합:
--    · 본 컬럼 미존재 환경에서도 app.html 풀스크린 코드 동작 (localStorage fallback)
--    · 본 컬럼 추가 후에는 cross-device 정합 자동 가동
--
--  실행 순서 권장:
--    1) Supabase Dashboard SQL Editor 진입
--    2) 좌상단 프로젝트명 = onesecond-v1-restore-0420 확인
--    3) 본 파일 통째 복사 → New query → 실행
--    4) 결과 검증 (아래 SELECT 쿼리)
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 신버전 확인 (방어선)
SELECT current_database();

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_seen BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;

-- ── 결과 검증 (별도 RUN 권장) ───────────────────────────────────────────────
-- 컬럼 존재 확인
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'onboarding_seen';

-- 현 사용자 분포 (모두 false 이어야 함 — 환영 화면 아직 안 본 상태)
SELECT
  onboarding_seen,
  COUNT(*) AS user_count
FROM public.users
GROUP BY onboarding_seen
ORDER BY onboarding_seen;

-- 관리자 본인 onboarding_seen 강제 true (옛 사용자 = 환영 화면 안 보여줌)
-- ⚠️ 본 자리는 선택 사항. 옛 사용자도 환영 화면 1회 보여주려면 본 UPDATE 건너뜀.
-- UPDATE public.users SET onboarding_seen = TRUE WHERE created_at < '2026-05-18';
