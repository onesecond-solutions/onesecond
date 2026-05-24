-- ============================================================================
-- D-2 진단 SQL — P0-4 시드 보험사명 격차 + P0-6 team_id + 4팀 실장 점검
-- 작성: 2026-05-16 D-2 (5/18 4팀 오픈 박는 자리)
-- 실행 위치: Supabase Dashboard SQL Editor (신버전 onesecond-v1-restore-0420)
-- 실행 주체: 팀장님
-- ============================================================================
--
-- 🚨 실행 전 필수 확인:
--   1. Dashboard 왼쪽 상단 프로젝트 = `onesecond-v1-restore-0420` 맞나?
--   2. URL 프로젝트 ID = `pdnwgzneooyygfejrvbg` 맞나?
--   둘 중 하나 X 박히면 즉시 중단.
--
-- 본 파일 본진:
--   - 모두 SELECT (READ-ONLY) — DB 변경 0건
--   - 격차 발견 시 후속 UPDATE/DELETE는 별도 마이그레이션 박음
--
-- ============================================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │ [0] 신버전 정합 확인 (필수 첫 쿼리)                          │
-- └─────────────────────────────────────────────────────────┘
SELECT current_database();
-- 박힌 결과 = 'postgres' (Supabase 기본). 다만 프로젝트 ID 확인은 Dashboard 좌상단 박음.

-- ============================================================================
-- 🔵 P0-4 시드 보험사명 격차 점검
-- ============================================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │ [1-A] 시드 462건 전체 카운트 + source_type 분포              │
-- └─────────────────────────────────────────────────────────┘
SELECT
  source_type,
  COUNT(*) AS n
FROM public.posts
GROUP BY source_type
ORDER BY 2 DESC;
-- 예상: source_type='seed' 박힌 자리 약 462건 박혀 있을 자리

-- ┌─────────────────────────────────────────────────────────┐
-- │ [1-B] 시드 462건 title 박힌 자리 보험사명 격차 점검             │
-- │       공백 X 박힌 파일 박혀 있을 자리 = title에 보험사명 박혀  │
-- │       있는데 raw 파일명 박혔을 가능 점검                      │
-- └─────────────────────────────────────────────────────────┘
SELECT
  COUNT(*) FILTER (WHERE title ~ '\s')   AS title_with_space,
  COUNT(*) FILTER (WHERE title !~ '\s')  AS title_without_space,
  COUNT(*) FILTER (WHERE title ~ '\.pdf$')  AS title_ending_with_pdf
FROM public.posts
WHERE source_type = 'seed';
-- 격차 신호: title_without_space > 0 또는 title_ending_with_pdf > 0
-- → 파일명 raw 박혀 있을 자리 (예: "신한라이프GA소식지26.05.pdf")
-- → 정정 박을 자리 = 파일명 → "신한라이프 5월 GA소식지" 정합 박음

-- ┌─────────────────────────────────────────────────────────┐
-- │ [1-C] title 박힌 자리 sample 30건 raw 박음 (보험사명 격차    │
-- │       시각 박힘 박을 자리)                                   │
-- └─────────────────────────────────────────────────────────┘
SELECT
  id,
  title,
  source_label
FROM public.posts
WHERE source_type = 'seed'
ORDER BY created_at DESC
LIMIT 30;
-- 박힌 자리 시각 박음 = 공백 박혀 있는지 / 보험사명 정합 박혀 있는지 점검

-- ┌─────────────────────────────────────────────────────────┐
-- │ [1-D] insurer_target 박힌 자리 분포 (NULL 박힌 자리 격차 점검) │
-- └─────────────────────────────────────────────────────────┘
SELECT
  COALESCE(insurer_target, '(NULL)') AS insurer_target,
  COUNT(*) AS n
FROM public.posts
WHERE source_type = 'seed'
GROUP BY insurer_target
ORDER BY 2 DESC;
-- 격차 신호: '(NULL)' 박힌 자리 박혀 있으면 → 보험사 라벨 박지 X 박은 자리

-- ============================================================================
-- 🟢 P0-6 전수 team_id + 4팀 실장 점검
-- ============================================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │ [2-A] 전수 team_id 박힌 자리 점검 (NULL + 격차 신호 점검)      │
-- └─────────────────────────────────────────────────────────┘
SELECT
  role,
  COALESCE(team_id::text, '(NULL)') AS team_id_str,
  COUNT(*) AS n
FROM public.users
WHERE deleted_at IS NULL
GROUP BY role, team_id
ORDER BY role, 3 DESC;
-- 격차 신호: ga_member / ga_manager 박힌 자리 team_id NULL 박혀 있으면 격차

-- ┌─────────────────────────────────────────────────────────┐
-- │ [2-B] 4팀 (5fccd362-...) 사용자 전수                       │
-- └─────────────────────────────────────────────────────────┘
SELECT
  u.id,
  u.email,
  u.name,
  u.role,
  u.plan,
  u.created_at
FROM public.users u
JOIN public.teams t ON t.id = u.team_id
WHERE t.name LIKE '%4팀%'
   OR t.id::text LIKE '5fccd362%'
ORDER BY u.role DESC, u.created_at;
-- 박힌 자리 박음 = 4팀 약 40~50명 명단 박음

-- ┌─────────────────────────────────────────────────────────┐
-- │ [2-C] 4팀 실장 박힌 자리 (ga_manager 박힌 자리 vs DB)         │
-- │       팀장님 인지 = 4팀 실장 3명 / DB = 박혀 있는 자리 점검    │
-- └─────────────────────────────────────────────────────────┘
SELECT
  u.id,
  u.email,
  u.name,
  u.role,
  u.created_at
FROM public.users u
JOIN public.teams t ON t.id = u.team_id
WHERE (t.name LIKE '%4팀%' OR t.id::text LIKE '5fccd362%')
  AND u.role IN ('ga_manager', 'ga_branch_manager')
  AND u.deleted_at IS NULL
ORDER BY u.role DESC, u.created_at;
-- 격차 신호: 박힌 자리 < 3건 박힘 → 누락 실장 1명 격차

-- ┌─────────────────────────────────────────────────────────┐
-- │ [2-D] 옛 5역할 잔존 점검 (Phase 1 9역할 마이그레이션 정합)     │
-- └─────────────────────────────────────────────────────────┘
SELECT role, COUNT(*) AS n
FROM public.users
WHERE deleted_at IS NULL
  AND role IN ('branch_manager', 'manager', 'member', 'staff', '')
GROUP BY role;
-- 정합: 0행 박힘 박혀야 함 (5/12 마이그레이션 완료 박힌 자리 정합)
-- 격차 신호: 행 박혀 있으면 옛 5역할 잔존 = 회귀 격차

-- ============================================================================
-- 📋 검증 후 박을 자리 안내
-- ============================================================================
-- [1-B] title_without_space > 0  → 파일명 raw 격차 박힘
--                                   → 후속 UPDATE 마이그레이션 박을 자리
-- [1-D] '(NULL)' 박힘             → insurer_target 박지 X 박은 자리
--                                   → 후속 UPDATE 박을 자리
-- [2-A] ga_* role + team_id NULL  → 박지 X 박힌 자리 격차
--                                   → 후속 UPDATE 박을 자리
-- [2-C] 실장 행 < 3건             → 누락 실장 1명 박을 자리
--                                   → admin이 직접 INSERT 박을 자리
-- [2-D] 옛 5역할 잔존             → 즉시 보고 (회귀 격차)
--
-- 박힌 결과 raw 통째 Code에 박은 후 후속 마이그레이션 박음.
-- ============================================================================
