-- ============================================================================
-- 알림 시스템 Phase A v1.1 — notifications 테이블 + RLS + 트리거 갱신
-- 작성: 2026-05-21
-- 본진: 답글 작성 시 게시글 작성자에 알림 자동 박음 (mine type)
-- ============================================================================
--
-- 🚨 실행 전 신버전 확인:
--   - Dashboard 좌상단 = `onesecond-v1-restore-0420`
--   - URL ID = `pdnwgzneooyygfejrvbg`
--
-- 📌 본 SQL 본진:
--   - notifications 테이블 신설 (type 7종, recipient_id 단일 alert)
--   - 인덱스 2종 (recipient_id + 미열람 필터)
--   - RLS 정책 4종 (SELECT 본인 / INSERT admin / UPDATE 본인 / DELETE 본인+admin)
--   - update_nav_question_activity() 함수 갱신
--     · 기존 활성도 갱신 본진 보존
--     · 알림 INSERT 합성 (SECURITY DEFINER로 RLS 우회)
--     · EXCEPTION 블록으로 알림 실패가 답변 작성 실패로 번지지 않게 격리
--
-- 📌 plan 변경 (사용자 결재 대기):
--   - plan에는 `notification_read_status` 별도 테이블 박혀 있으나
--     1:1 알림 본진 = `notifications.is_read + read_at` 단일 컬럼이 단순·정합
--   - 미래 broadcast(N:N) 알림 박힐 때 read_status 테이블 분리 본진
--
-- ============================================================================

BEGIN;

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [1] notifications 테이블                                              │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS public.notifications (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type          text NOT NULL CHECK (type IN (
    'system',    -- 시스템 공지 (전산장애·점검·업데이트)
    'staff',     -- 회사 스텝 공지 (본사·지점 운영)
    'manager',   -- 매니저 공지 (실장님 공지, 팀/지점)
    'insurer',   -- 원수사 공지 (v2.0 본진)
    'team_lab',  -- 4팀 Lab 알림
    'mine',      -- 내 답글 알림 (자동 trigger)
    'ops'        -- 운영 신호 (ops_notify 토글)
  )),
  recipient_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  title         text NOT NULL,
  body          text,
  link_url      text,
  source_type   text,        -- 'nav_answer' / 'nav_question' / 'team_notice' / ...
  source_id     uuid,        -- source 테이블의 PK
  is_urgent     boolean NOT NULL DEFAULT false,
  is_read       boolean NOT NULL DEFAULT false,
  read_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS
  '알림 v1.1 — 본인(recipient_id) 1:1 단일 알림. type 7종. trigger 자동 박음 본진. 2026-05-21 작성.';

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [2] 인덱스                                                           │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON public.notifications (recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON public.notifications (recipient_id, created_at DESC)
  WHERE is_read = false;

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [3] RLS                                                              │
-- └─────────────────────────────────────────────────────────────────────┘

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- SELECT: 본인만 (recipient_id = auth.uid())
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

-- INSERT: admin만 직접 (trigger는 SECURITY DEFINER로 RLS 우회)
CREATE POLICY notifications_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- UPDATE: 본인만 (is_read·read_at 토글 자리)
CREATE POLICY notifications_update ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- DELETE: 본인 + admin
CREATE POLICY notifications_delete ON public.notifications
  FOR DELETE TO authenticated
  USING (is_admin() OR recipient_id = auth.uid());

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [4] 트리거 함수 갱신                                                  │
-- │     기존: nav_v2_setup.sql:86~100의 update_nav_question_activity()    │
-- │     본진: 활성도 갱신 본진 보존 + 알림 INSERT 합성 + EXCEPTION 격리    │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION public.update_nav_question_activity()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question_author_id uuid;
  v_question_title     text;
  v_answer_author_name text;
  v_notification_title text;
BEGIN
  -- ─── (a) 기존 본진: 질문 활성도 갱신 ─────────────────────
  UPDATE public.nav_questions
  SET
    answer_count = (
      SELECT COUNT(*) FROM public.nav_answers
      WHERE question_id = NEW.question_id AND deleted_at IS NULL
    ),
    last_activity_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.question_id;

  -- ─── (b) 알림 INSERT (실패 격리) ─────────────────────────
  BEGIN
    -- 질문 작성자 + 제목 lookup
    SELECT q.author_id, q.title
      INTO v_question_author_id, v_question_title
      FROM public.nav_questions q
      WHERE q.id = NEW.question_id;

    -- 본인이 본인 글에 답글 박은 자리 = 알림 박지 X
    IF v_question_author_id IS NOT NULL
       AND v_question_author_id <> NEW.author_id THEN

      -- 답글 작성자 이름 lookup
      SELECT u.name INTO v_answer_author_name
        FROM public.users u
        WHERE u.id = NEW.author_id;

      -- 알림 제목 본진 ("OOO님의 답변 — 질문 제목 일부")
      v_notification_title := COALESCE(v_answer_author_name, '누군가') || '님의 답변';

      INSERT INTO public.notifications (
        type,
        recipient_id,
        sender_id,
        title,
        body,
        link_url,
        source_type,
        source_id,
        is_urgent
      )
      VALUES (
        'mine',
        v_question_author_id,
        NEW.author_id,
        v_notification_title,
        LEFT(COALESCE(NEW.content, ''), 80),
        '/pages/board.html?tab=nav_v2&question_id=' || NEW.question_id::text,
        'nav_answer',
        NEW.id,
        false
      );
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- 알림 INSERT 실패해도 답변 작성은 그대로 진행
    RAISE NOTICE '알림 INSERT 격차 (격리됨): %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거는 nav_v2_setup.sql:102~105의 `trg_nav_answer_activity` 그대로 사용.
-- 본 마이그레이션은 함수 본문만 CREATE OR REPLACE 박음.

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [5] 검증                                                             │
-- └─────────────────────────────────────────────────────────────────────┘

-- (1) 신버전 확인
SELECT current_database();

-- (2) 빈 테이블 인지
SELECT COUNT(*) AS notifications_count FROM public.notifications;

-- (3) RLS 4건 박힘 인지 (SELECT/INSERT/UPDATE/DELETE)
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'notifications'
ORDER BY cmd;

-- (4) 트리거 함수 SECURITY DEFINER 박힘 인지
SELECT proname, prosecdef AS is_security_definer
FROM pg_proc
WHERE proname = 'update_nav_question_activity';
-- prosecdef = true 박힘 인지

-- (5) 트리거 정상 박힘 인지
SELECT tgname, tgrelid::regclass AS table_name
FROM pg_trigger
WHERE tgname = 'trg_nav_answer_activity';

COMMIT;

-- 격차 시: ROLLBACK;

-- ============================================================================
-- 예상 결과:
-- - notifications_count: 0
-- - RLS 4건 (DELETE / INSERT / SELECT / UPDATE)
-- - is_security_definer: true
-- - trigger: trg_nav_answer_activity on public.nav_answers
-- ============================================================================
--
-- ▶ 라이브 검증 시나리오:
--   (1) 4팀 멤버 A가 네비방2에 질문 작성
--   (2) admin이 답글 작성
--   (3) 4팀 멤버 A 헤더 🔔 뱃지 0 → 1 박힘 (Phase A-2 완성 후)
--   (4) C영역 c-home 카드에 "admin님의 답변" 박힘
--   (5) 카드/드롭다운 클릭 → 해당 질문 진입 + read 처리
--
-- ▶ 격차 시나리오 검증 (트리거 격리 본진):
--   (a) 일부러 notifications RLS 위배 상황 (예: recipient_id NULL)
--   (b) 답변 INSERT 실 행 → 트리거 RAISE NOTICE만 박음 + 답변은 정상 박힘
-- ============================================================================
