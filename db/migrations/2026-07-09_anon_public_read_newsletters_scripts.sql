-- ═══════════════════════════════════════════════════════════════════════════
-- 🟠 데이터변경(RLS 정책 추가) — 비로그인(anon) 공개 읽기: 소식지 · 스크립트만
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️⚠️⚠️ 초안(DRAFT) — 대표 승인 전 실행 금지. 이 파일은 검토용이며 아직 적용되지 않았다. ⚠️⚠️⚠️
--
-- 목적: onesecond.solutions 첫 화면(비로그인 검색 홈)에서 방문자가 로그인 없이
--       "상품 라인업 · 소식지 · 실비 세대별 변천사 · 스크립트 · 계산기·변환기" 5개 페이지를
--       열람할 수 있게 한다. 5개 중 DB 소스는 소식지(newsletters)·스크립트(scripts) 둘뿐이므로
--       이 둘에만 anon SELECT 정책을 부여한다.
--
--   · 상품 라인업(product-lineup) = 정적 JSON 파일(/data/insurer_products_2607.json). DB 무관 → anon 정책 불필요.
--   · 실비 세대별 변천사(silson)   = 정적 HTML iframe(pages/silson-generations.html). DB 무관 → anon 정책 불필요.
--   · 계산기·변환기(#v-tool)        = 클라이언트 계산. DB 무관 → anon 정책 불필요.
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
--    구버전(qursjteiovcylqiepmlo)은 2026-06-19 삭제됨 — 절대 참조 금지.
--    실행 전 Supabase Dashboard 좌상단 프로젝트명이 onesecond-v1-restore-0420 인지 반드시 확인.
--
-- ⚠️ 화이트리스트 원칙(절대 준수): anon 읽기 개방은 이 두 테이블(newsletters·scripts)로만 한정한다.
--    posts · myspace_files · calendar_events · team_notices · comments · sales_* · library ·
--    script_usage · 원수사 자료실 · 보험 Q&A 내부답변 등 그 외 모든 테이블은
--    authenticated 전용 RLS 그대로 두어 anon 요청이 자동 차단되게 한다.
--    → 이 파일에 다른 테이블 anon 정책을 절대 추가하지 마라.
--
-- ⚠️ 노출 범위 제한(공개 조건):
--    · newsletters = status='published' 행만(검수중 reviewing 초안 숨김).
--    · scripts     = scope='global' AND is_active=true AND is_sample=false 행만
--                    (개인/팀/지점 스크립트·비활성·샘플 제외).
--
-- ⚠️ 기존 authenticated 정책은 무변경. INSERT/UPDATE/DELETE 정책도 무변경(anon 쓰기 정책 없음 = 쓰기 자동 차단).
--    이 스크립트는 SELECT anon 정책만 추가한다.
--
-- 프론트 정합(이미 반영/PR): 소식지 로더·통합검색 소식지 소스에 status=eq.published 필터 추가됨.
--    스크립트 로더는 scope=eq.global&is_active=eq.true&is_sample=eq.false + anon 키 폴백으로 이미 준비됨.
--    이 정책 적용 전에는 비로그인 세션에서 소식지·스크립트가 빈 목록으로 보인다(RLS 차단). 적용 후 노출된다.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1) 소식지(newsletters): anon SELECT = published 행만 ───────────────────────
--    (기존 newsletters_select_authenticated = authenticated 전용 정책은 그대로 유지)
DROP POLICY IF EXISTS newsletters_select_anon_published ON public.newsletters;
CREATE POLICY newsletters_select_anon_published
  ON public.newsletters
  FOR SELECT
  TO anon
  USING (status = 'published');

-- ── 2) 스크립트(scripts): anon SELECT = 공용·활성·비샘플만 ────────────────────
--    (기존 authenticated 정책은 그대로 유지 — scope='global' 포함되어 있음)
DROP POLICY IF EXISTS scripts_select_anon_public ON public.scripts;
CREATE POLICY scripts_select_anon_public
  ON public.scripts
  FOR SELECT
  TO anon
  USING (scope = 'global' AND is_active = true AND is_sample = false);

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK (되돌리기) — 이 마이그레이션을 취소하려면 아래를 실행한다.
--   두 anon SELECT 정책만 제거하면 소식지·스크립트가 다시 authenticated 전용(비로그인 차단)으로 복귀한다.
--   다른 테이블·기존 authenticated 정책은 무변경이므로 롤백 부작용 없음.
-- ═══════════════════════════════════════════════════════════════════════════
-- BEGIN;
--   DROP POLICY IF EXISTS newsletters_select_anon_published ON public.newsletters;
--   DROP POLICY IF EXISTS scripts_select_anon_public ON public.scripts;
-- COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- 검증(🟢 읽기전용) — 적용 후 실행. anon 롤 관점 노출 범위 확인.
-- ═══════════════════════════════════════════════════════════════════════════
-- -- 정책 적재 확인
-- SELECT schemaname, tablename, policyname, roles, cmd, qual
--   FROM pg_policies
--  WHERE tablename IN ('newsletters','scripts') AND 'anon' = ANY(roles)
--  ORDER BY tablename, policyname;
--
-- -- anon 관점 노출 건수(설정 후 SET ROLE로 실측 권장)
-- --   SET LOCAL ROLE anon;
-- --   SELECT count(*) FROM public.newsletters;                                  -- = published 건수와 일치해야 함
-- --   SELECT count(*) FROM public.scripts WHERE scope='global' AND is_active AND NOT is_sample;
-- --   SELECT count(*) FROM public.posts;                                        -- ★ 0 이어야 함(anon 정책 없음 = 자동 차단)
-- --   SELECT count(*) FROM public.myspace_files;                               -- ★ 0
-- --   RESET ROLE;
--
-- -- 검수중 초안이 anon에 새지 않는지(0 이어야 함)
-- --   SET LOCAL ROLE anon; SELECT count(*) FROM public.newsletters WHERE status <> 'published'; RESET ROLE;
