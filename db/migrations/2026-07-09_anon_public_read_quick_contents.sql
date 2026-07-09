-- ═══════════════════════════════════════════════════════════════════════════
-- 🟠 데이터변경(RLS 정책 추가) — 비로그인(anon) 공개 읽기: 딸깍 오버레이(quick_contents)만
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️⚠️⚠️ 초안(DRAFT) — 대표 승인 전 실행 금지. 이 파일은 검토용이며 아직 적용되지 않았다. ⚠️⚠️⚠️
--
-- 목적: onesecond.solutions 첫 화면(비로그인)에서 방문자가 로그인 없이 ⚡ 딸깍(FAB 오버레이)의
--       3개 그룹(녹취·스크립트 / 기준·정보 / 바로가기·연락처)을 로그인 후와 동일하게 열람하게 한다.
--       이 3그룹의 목록·본문 데이터 소스는 quick_contents 한 테이블뿐이므로 여기에만 anon SELECT 정책을 부여한다.
--       (외부검색 = 네이버/구글/다음 새 탭은 이미 비로그인 열림 · DB 무관.)
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
--    구버전(qursjteiovcylqiepmlo)은 2026-06-19 삭제됨 — 절대 참조 금지.
--    실행 전 Supabase Dashboard 좌상단 프로젝트명이 onesecond-v1-restore-0420 인지 반드시 확인.
--
-- ⚠️ 전체 공개 근거: quick_contents = owner(개인/팀/지점) 없는 전역 운영자료(딸깍 콘텐츠 원장).
--    개인정보·권한 격리 대상이 아니며, 전체 공개는 대표 승인(2026-07-09) 사항이다.
--    저장·업로드 액션은 오버레이에 없고, content_html 내 저장류 onclick 은 각 함수 자체 _osLoginGate 로
--    로그인이 유지되므로 anon 개방해도 쓰기·개인데이터 누출 위험 0(조사 확인).
--
-- ⚠️ 화이트리스트 원칙(절대 준수): anon 읽기 개방은 이 테이블(quick_contents)로만 한정한다.
--    posts · myspace_files · calendar_events · team_notices · comments · sales_* · library ·
--    원수사 자료실 · 보험 Q&A 내부답변 등 그 외 모든 테이블은 authenticated 전용 RLS 그대로 두어
--    anon 요청이 자동 차단되게 한다. → 이 파일에 다른 테이블 anon 정책을 절대 추가하지 마라.
--
-- ⚠️ 기존 authenticated 정책은 무변경. INSERT/UPDATE/DELETE 정책도 무변경(anon 쓰기 정책 없음 = 쓰기 자동 차단).
--    이 스크립트는 SELECT anon 정책 하나만 추가한다.
--
-- 프론트 정합(이미 반영/PR): loadQuickOverlayItems·openQuickOverlay 의 토큰 사전 점검을 완화(제거)해
--    비로그인도 window.db.fetch 로 quick_contents 를 조회·렌더한다. window.db.fetch 는 토큰 없으면
--    apikey(anon)만 전송(Authorization 생략) = anon RLS 조회.
--    이 정책 적용 전에는 비로그인 세션에서 딸깍 3그룹이 빈 목록/열람 불가로 보인다(RLS 차단). 적용 후 노출된다.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 딸깍 오버레이(quick_contents): anon SELECT = 전체 공개 ─────────────────────
--    (기존 authenticated 전용 정책은 그대로 유지 — SELECT anon 정책만 신규 추가)
--    전역 운영자료 · owner 없음 · 대표 전체 공개 승인(2026-07-09) → USING(true).
DROP POLICY IF EXISTS quick_contents_select_anon ON public.quick_contents;
CREATE POLICY quick_contents_select_anon
  ON public.quick_contents
  FOR SELECT
  TO anon
  USING (true);

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOWN / ROLLBACK (되돌리기) — 이 마이그레이션을 취소하려면 아래를 실행한다.
--   anon SELECT 정책만 제거하면 딸깍 오버레이가 다시 authenticated 전용(비로그인 차단)으로 복귀한다.
--   다른 테이블·기존 authenticated 정책은 무변경이므로 롤백 부작용 없음.
-- ═══════════════════════════════════════════════════════════════════════════
-- BEGIN;
--   DROP POLICY IF EXISTS quick_contents_select_anon ON public.quick_contents;
-- COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════
-- 검증(🟢 읽기전용) — 적용 후 실행. anon 롤 관점 노출 범위 확인.
-- ═══════════════════════════════════════════════════════════════════════════
-- -- 정책 적재 확인
-- SELECT schemaname, tablename, policyname, roles, cmd, qual
--   FROM pg_policies
--  WHERE tablename = 'quick_contents' AND 'anon' = ANY(roles)
--  ORDER BY policyname;
--
-- -- anon 관점 노출 건수(설정 후 SET ROLE로 실측 권장)
-- --   SET LOCAL ROLE anon;
-- --   SELECT count(*) FROM public.quick_contents;      -- = 전체 건수와 일치해야 함(전체 공개)
-- --   SELECT count(*) FROM public.posts;               -- ★ 0 이어야 함(anon 정책 없음 = 자동 차단)
-- --   SELECT count(*) FROM public.myspace_files;        -- ★ 0
-- --   RESET ROLE;
