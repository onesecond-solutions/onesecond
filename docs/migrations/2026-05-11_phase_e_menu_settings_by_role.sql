-- =========================================================================
-- admin_v2 Phase E Step 1: menu_settings_by_role 테이블 신설 + 72 row seed
-- =========================================================================
-- 진실 원천: pdnwgzneooyygfejrvbg (신버전, onesecond-v1-restore-0420)
-- 작성일: 2026-05-11 (작업지시서 작성)
-- 실행일: 2026-05-12 (Code Step E-1 박음)
-- 작업지시서: docs/specs/admin_v2_phase_e_role_based_menu_control.md
--
-- 본질: 9 role × 8 menu = 72 row 매트릭스로 admin이 사이드바 메뉴 가시성 직접 제어
-- 기본값: admin이 보는 화면 그대로 복제 (모든 role × 모든 menu = visible)
-- 예외: menu_team_mgmt = admin / ga_branch_manager / ga_manager /
--                       insurer_branch_manager / insurer_manager 5종만 visible
--
-- 9역할 정합 검증 완료 (2026-05-12):
--   옛 5역할(branch_manager/manager/member/staff) 잔존 0건 ✅
--   9역할 접두어 체계 정합 (admin / ga_* / insurer_*) ✅
-- =========================================================================

-- =========================================
-- 1. 테이블 생성
-- =========================================

CREATE TABLE IF NOT EXISTS public.menu_settings_by_role (
  id BIGSERIAL PRIMARY KEY,
  role TEXT NOT NULL,
  menu_key TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id),

  CONSTRAINT chk_role CHECK (role IN (
    'admin',
    'ga_branch_manager', 'ga_manager', 'ga_member', 'ga_staff',
    'insurer_branch_manager', 'insurer_manager', 'insurer_member', 'insurer_staff'
  )),

  CONSTRAINT chk_menu_key CHECK (menu_key IN (
    'menu_home', 'menu_scripts', 'menu_board', 'menu_myspace',
    'menu_news', 'menu_quick', 'menu_together', 'menu_team_mgmt'
  )),

  UNIQUE (role, menu_key)
);

-- =========================================
-- 2. RLS 정책 (2건)
-- =========================================

ALTER TABLE public.menu_settings_by_role ENABLE ROW LEVEL SECURITY;

-- 정책 #1: admin 풀 액세스 (CRUD)
CREATE POLICY "admin_full_access_menu_settings_by_role"
ON public.menu_settings_by_role
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 정책 #2: 사용자 본인 role의 설정만 READ
CREATE POLICY "user_read_own_role_menu_settings"
ON public.menu_settings_by_role
FOR SELECT
TO authenticated
USING (
  role = (SELECT role FROM public.users WHERE id = auth.uid())
);

-- =========================================
-- 3. 인덱스 (2건)
-- =========================================

CREATE INDEX IF NOT EXISTS idx_menu_settings_by_role_role
ON public.menu_settings_by_role(role);

CREATE INDEX IF NOT EXISTS idx_menu_settings_by_role_role_menu
ON public.menu_settings_by_role(role, menu_key);

-- =========================================
-- 4. 9역할 × 8메뉴 = 72 row seed
-- =========================================
-- 기본값 = admin 화면 복제 (모든 메뉴 visible)
-- 예외: menu_team_mgmt = 매니저 이상 5종만 visible

INSERT INTO public.menu_settings_by_role (role, menu_key, is_visible, display_order)
SELECT
  r.role,
  m.menu_key,
  CASE
    WHEN m.menu_key = 'menu_team_mgmt' AND r.role NOT IN (
      'admin', 'ga_branch_manager', 'ga_manager',
      'insurer_branch_manager', 'insurer_manager'
    ) THEN false
    ELSE true
  END AS is_visible,
  m.display_order
FROM (
  VALUES
    ('admin'),
    ('ga_branch_manager'), ('ga_manager'), ('ga_member'), ('ga_staff'),
    ('insurer_branch_manager'), ('insurer_manager'), ('insurer_member'), ('insurer_staff')
) AS r(role)
CROSS JOIN (
  VALUES
    ('menu_home',      1),
    ('menu_scripts',   2),
    ('menu_board',     3),
    ('menu_myspace',   4),
    ('menu_news',      5),
    ('menu_quick',     6),
    ('menu_together',  7),
    ('menu_team_mgmt', 8)
) AS m(menu_key, display_order)
ON CONFLICT (role, menu_key) DO NOTHING;

-- =========================================
-- 5. 검증 SQL (3건) — 실행 후 결과 캡처 권장
-- =========================================

-- 검증 #1: 72 row 정합
SELECT COUNT(*) AS total_rows
FROM public.menu_settings_by_role;
-- 기대값: 72

-- 검증 #2: role별 매트릭스 (9 role × 8 menu = 9 row, 각 8건)
SELECT
  role,
  SUM(CASE WHEN is_visible THEN 1 ELSE 0 END) AS visible_count,
  SUM(CASE WHEN NOT is_visible THEN 1 ELSE 0 END) AS hidden_count,
  COUNT(*) AS total
FROM public.menu_settings_by_role
GROUP BY role
ORDER BY role;
-- 기대값:
--   admin:                  visible 8, hidden 0
--   ga_branch_manager:      visible 8, hidden 0
--   ga_manager:             visible 8, hidden 0
--   ga_member:              visible 7, hidden 1 (menu_team_mgmt false)
--   ga_staff:               visible 7, hidden 1 (menu_team_mgmt false)
--   insurer_branch_manager: visible 8, hidden 0
--   insurer_manager:        visible 8, hidden 0
--   insurer_member:         visible 7, hidden 1 (menu_team_mgmt false)
--   insurer_staff:          visible 7, hidden 1 (menu_team_mgmt false)

-- 검증 #3: 팀원관리 권한 정합
SELECT role, is_visible
FROM public.menu_settings_by_role
WHERE menu_key = 'menu_team_mgmt'
ORDER BY role;
-- 기대값:
--   admin:                  true
--   ga_branch_manager:      true
--   ga_manager:             true
--   ga_member:              false
--   ga_staff:               false
--   insurer_branch_manager: true
--   insurer_manager:        true
--   insurer_member:         false
--   insurer_staff:          false

-- 검증 #4 (보너스): RLS 정책 2건 정합
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'menu_settings_by_role'
ORDER BY policyname;
-- 기대값:
--   admin_full_access_menu_settings_by_role | ALL
--   user_read_own_role_menu_settings        | SELECT

-- =========================================
-- END OF MIGRATION
-- =========================================
