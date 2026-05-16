-- ============================================================================
-- 네비게이션방2 시연 본진 — nav_questions + nav_answers + 트리거 + RLS + 시드
-- 작성: 2026-05-16 D-2 (5/18 D-Day 시연 본진)
-- 결재: Code 권장값 4건 채택
-- ============================================================================
--
-- 🚨 실행 전 신버전 확인:
--   - Dashboard 좌상단 = `onesecond-v1-restore-0420`
--   - URL ID = `pdnwgzneooyygfejrvbg`
--
-- 📌 본 SQL 본진:
--   - 신규 테이블 2종 (nav_questions + nav_answers)
--   - 트리거 (답변 INSERT 시 질문 last_activity_at 자동 갱신)
--   - RLS 정책 (질문 SELECT/INSERT/UPDATE/DELETE × 2)
--   - 인덱스 3종
--   - 샘플 시드 6건 (4유형별 1~2건 + 답변 1~3개씩)
--
-- ============================================================================

BEGIN;

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [1] nav_questions 테이블 (질문)                                       │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS public.nav_questions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id           uuid NOT NULL REFERENCES public.teams(id),
  author_id         uuid NOT NULL REFERENCES public.users(id),
  question_type     text NOT NULL CHECK (question_type IN (
    'notice', 'underwriting', 'product', 'etc'
  )),
  title             text,
  content           text NOT NULL,
  attachments       jsonb DEFAULT '[]'::jsonb,
  answer_count      int NOT NULL DEFAULT 0,
  last_activity_at  timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);

COMMENT ON TABLE public.nav_questions IS
  '네비게이션방2 질문 — 4유형 (공지/인수/상품/기타). 활성 시간순(last_activity_at) 정렬. 2026-05-18 시연 본진.';

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [2] nav_answers 테이블 (답변)                                         │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS public.nav_answers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   uuid NOT NULL REFERENCES public.nav_questions(id) ON DELETE CASCADE,
  team_id       uuid NOT NULL REFERENCES public.teams(id),
  author_id     uuid NOT NULL REFERENCES public.users(id),
  insurer_code  text,
  content       text NOT NULL,
  attachments   jsonb DEFAULT '[]'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

COMMENT ON TABLE public.nav_answers IS
  '네비게이션방2 답변 — 질문 1개에 답변 N개. insurer_code = 답변 출처 (KB손보/메리츠/삼성 등). 시연 본진.';

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [3] 인덱스 3종                                                         │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE INDEX IF NOT EXISTS idx_nav_questions_team_activity
  ON public.nav_questions (team_id, last_activity_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_nav_questions_type
  ON public.nav_questions (team_id, question_type, last_activity_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_nav_answers_question_created
  ON public.nav_answers (question_id, created_at ASC)
  WHERE deleted_at IS NULL;

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [4] 트리거 — 답변 INSERT 시 질문 활성도 자동 갱신                       │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION public.update_nav_question_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.nav_questions
  SET
    answer_count = (
      SELECT COUNT(*) FROM public.nav_answers
      WHERE question_id = NEW.question_id AND deleted_at IS NULL
    ),
    last_activity_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.question_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nav_answer_activity ON public.nav_answers;
CREATE TRIGGER trg_nav_answer_activity
AFTER INSERT ON public.nav_answers
FOR EACH ROW EXECUTE FUNCTION public.update_nav_question_activity();

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [5] RLS 활성화 + 정책                                                  │
-- └─────────────────────────────────────────────────────────────────────┘

ALTER TABLE public.nav_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nav_answers   ENABLE ROW LEVEL SECURITY;

-- nav_questions: SELECT (같은 team + admin)
CREATE POLICY nav_questions_select ON public.nav_questions
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (is_admin() OR team_id = my_team_id()));

-- nav_questions: INSERT (모든 ga_* + admin)
CREATE POLICY nav_questions_insert ON public.nav_questions
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role LIKE 'ga_%'
        AND u.team_id = nav_questions.team_id
    )
  );

-- nav_questions: UPDATE/DELETE (작성자 + admin)
CREATE POLICY nav_questions_update ON public.nav_questions
  FOR UPDATE TO authenticated
  USING (is_admin() OR author_id = auth.uid())
  WITH CHECK (is_admin() OR author_id = auth.uid());

CREATE POLICY nav_questions_delete ON public.nav_questions
  FOR DELETE TO authenticated
  USING (is_admin() OR author_id = auth.uid());

-- nav_answers: SELECT (같은 team + admin)
CREATE POLICY nav_answers_select ON public.nav_answers
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND (is_admin() OR team_id = my_team_id()));

-- nav_answers: INSERT (ga_* + insurer_* + admin)
CREATE POLICY nav_answers_insert ON public.nav_answers
  FOR INSERT TO authenticated
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (u.role LIKE 'ga_%' OR u.role LIKE 'insurer_%')
    )
  );

-- nav_answers: UPDATE/DELETE (작성자 + admin)
CREATE POLICY nav_answers_update ON public.nav_answers
  FOR UPDATE TO authenticated
  USING (is_admin() OR author_id = auth.uid())
  WITH CHECK (is_admin() OR author_id = auth.uid());

CREATE POLICY nav_answers_delete ON public.nav_answers
  FOR DELETE TO authenticated
  USING (is_admin() OR author_id = auth.uid());

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [6] 샘플 시드 — 4유형별 1~2건 + 답변 1~3개씩                            │
-- └─────────────────────────────────────────────────────────────────────┘

DO $$
DECLARE
  v_author_id  uuid;
  v_team_id    uuid;
  v_q1 uuid; v_q2 uuid; v_q3 uuid; v_q4 uuid; v_q5 uuid; v_q6 uuid;
BEGIN
  SELECT id INTO v_author_id FROM public.users WHERE email = 'jaisung78@gmail.com' LIMIT 1;
  IF v_author_id IS NULL THEN RAISE EXCEPTION '한재성 lookup 실패'; END IF;

  SELECT id INTO v_team_id FROM public.teams
  WHERE name LIKE '%4팀%' OR id::text LIKE '5fccd362%'
  ORDER BY created_at LIMIT 1;
  IF v_team_id IS NULL THEN RAISE EXCEPTION '4팀 lookup 실패'; END IF;

  -- ─────────────────────────────────────────────────────────
  -- 질문 1: 📢 공지사항
  -- ─────────────────────────────────────────────────────────
  INSERT INTO public.nav_questions (id, team_id, author_id, question_type, title, content, created_at, last_activity_at)
  VALUES (gen_random_uuid(), v_team_id, v_author_id, 'notice',
    'DB손보 송미정 매니저 휴무 (대직자 안내)',
    E'DB손보 송미정 매니저 오늘 휴무입니다. 대직자 공지드립니다.\n\n- 정지윤M 010-4862-3707\n- 고명선M 010-7715-5470\n\n급한 인수 문의는 위 대직자분께 부탁드립니다.',
    NOW() - INTERVAL '8 hours', NOW() - INTERVAL '7 hours 30 minutes')
  RETURNING id INTO v_q1;

  INSERT INTO public.nav_answers (question_id, team_id, author_id, insurer_code, content, created_at)
  VALUES (v_q1, v_team_id, v_author_id, 'DB손보',
    '안내 감사합니다. 진행 중 건 있으신 분들 정지윤 M쪽으로 연결 부탁드려요.',
    NOW() - INTERVAL '7 hours 30 minutes');

  -- ─────────────────────────────────────────────────────────
  -- 질문 2: 🩺 인수 같음 (#1)
  -- ─────────────────────────────────────────────────────────
  INSERT INTO public.nav_questions (id, team_id, author_id, question_type, title, content, created_at, last_activity_at)
  VALUES (gen_random_uuid(), v_team_id, v_author_id, 'underwriting',
    '60대 남 협심증 / 신장결석 종수술+간호간병 가능 회사',
    E'68세 남자. 2년전 협심증진단, 1년전 신장결석제거.\n종수술이랑 간호간병통합서비스 들어갈 수 있는 회사 있을까요?',
    NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours 30 minutes')
  RETURNING id INTO v_q2;

  INSERT INTO public.nav_answers (question_id, team_id, author_id, insurer_code, content, created_at)
  VALUES
    (v_q2, v_team_id, v_author_id, '라이나생명', '라이나생명 제한 없습니다',
      NOW() - INTERVAL '5 hours 45 minutes'),
    (v_q2, v_team_id, v_author_id, '메리츠', '31간편으로 가능하고 간호간병통합 담보 가능합니다.',
      NOW() - INTERVAL '5 hours 40 minutes'),
    (v_q2, v_team_id, v_author_id, '현대해상', '현대해상 3333플랜으로 진행 가능합니다',
      NOW() - INTERVAL '5 hours 30 minutes');

  -- ─────────────────────────────────────────────────────────
  -- 질문 3: 🩺 인수 같음 (#2)
  -- ─────────────────────────────────────────────────────────
  INSERT INTO public.nav_questions (id, team_id, author_id, question_type, title, content, created_at, last_activity_at)
  VALUES (gen_random_uuid(), v_team_id, v_author_id, 'underwriting',
    '46세 여 갑상선암 수술 / 비갱신 3대진단비',
    E'46세 여성. 2023-04 갑상선암수술, 2024-11 담석증 4일 입원, 2024-12 담석증 수술 4일 입원, 2024-06 대장용종 수술.\n비갱신 3대진단비 가능한 곳 있을까요?',
    NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours 50 minutes')
  RETURNING id INTO v_q3;

  INSERT INTO public.nav_answers (question_id, team_id, author_id, insurer_code, content, created_at)
  VALUES
    (v_q3, v_team_id, v_author_id, '흥국화재', '흥국화재 3.10.5간편으로 심사 가능합니다',
      NOW() - INTERVAL '3 hours 55 minutes'),
    (v_q3, v_team_id, v_author_id, '메리츠', '갑상선암 완치 후 5년 경과시 표준체 / 미경과시 305간편 가능합니다',
      NOW() - INTERVAL '3 hours 50 minutes');

  -- ─────────────────────────────────────────────────────────
  -- 질문 4: 📦 상품 같음
  -- ─────────────────────────────────────────────────────────
  INSERT INTO public.nav_questions (id, team_id, author_id, question_type, title, content, created_at, last_activity_at)
  VALUES (gen_random_uuid(), v_team_id, v_author_id, 'product',
    '치아보험 충치치료 한도 높은 회사',
    E'레진, 인레이, 온레이 충치치료 한도 많이 들어가는 치아보험 회사 어딘가요?',
    NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 50 minutes')
  RETURNING id INTO v_q4;

  INSERT INTO public.nav_answers (question_id, team_id, author_id, insurer_code, content, created_at)
  VALUES
    (v_q4, v_team_id, v_author_id, '라이나생명',
      '라이나생명 인레이 8만원, 인레이/온레이 30만원, 크라운 50만원으로 들어갈 수 있습니다',
      NOW() - INTERVAL '2 hours 55 minutes'),
    (v_q4, v_team_id, v_author_id, '라이나손보',
      '라이나손보 레진 10만, 인/온레이 20만, 크라운 40만 입니다',
      NOW() - INTERVAL '2 hours 50 minutes');

  -- ─────────────────────────────────────────────────────────
  -- 질문 5: 📦 상품 같음 (#2)
  -- ─────────────────────────────────────────────────────────
  INSERT INTO public.nav_questions (id, team_id, author_id, question_type, title, content, created_at, last_activity_at)
  VALUES (gen_random_uuid(), v_team_id, v_author_id, 'product',
    '한화생명 시그니처H 암보험 보험료',
    E'한화생명 시그니처H 암보험 최저보험료 / 연령별 보험료 알려주실 수 있나요?',
    NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 50 minutes')
  RETURNING id INTO v_q5;

  INSERT INTO public.nav_answers (question_id, team_id, author_id, insurer_code, content, created_at)
  VALUES (v_q5, v_team_id, v_author_id, '한화생명',
    E'한화생명 시그니처H 암보험\n최저보험료 2만원\n20년납 100세만기\n20세: 20,965원 / 30세: 26,087원 / 40세: 29,541원',
    NOW() - INTERVAL '1 hour 50 minutes');

  -- ─────────────────────────────────────────────────────────
  -- 질문 6: ❓ 기타 잘 모르겠음
  -- ─────────────────────────────────────────────────────────
  INSERT INTO public.nav_questions (id, team_id, author_id, question_type, title, content, created_at, last_activity_at)
  VALUES (gen_random_uuid(), v_team_id, v_author_id, 'etc',
    '5세대 실손 단독 가입 가능한 원수사',
    E'안녕하세요. 5세대 실손 현재 단독으로 가입 가능한 원수사 있을까요?',
    NOW() - INTERVAL '1 hour', NOW() - INTERVAL '50 minutes')
  RETURNING id INTO v_q6;

  INSERT INTO public.nav_answers (question_id, team_id, author_id, insurer_code, content, created_at)
  VALUES (v_q6, v_team_id, v_author_id, '한화손보',
    E'한화손보 5세대 실손 5/6 14:00부터 판매 개시했습니다.\n종합보험 상해사망 1억으로 방진 없이 실비 가입 가능.\n다만 61세 이상은 종합연계 무관 방진입니다.',
    NOW() - INTERVAL '50 minutes');

  RAISE NOTICE '네비게이션방2 시드 = 질문 6건 + 답변 12건 INSERT 완료 (4유형 통째)';
END $$;

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [7] 검증 SELECT                                                        │
-- └─────────────────────────────────────────────────────────────────────┘

SELECT COUNT(*) AS questions FROM public.nav_questions WHERE deleted_at IS NULL;
SELECT COUNT(*) AS answers   FROM public.nav_answers WHERE deleted_at IS NULL;

SELECT question_type, COUNT(*) AS n, SUM(answer_count) AS total_answers
FROM public.nav_questions
WHERE deleted_at IS NULL
GROUP BY question_type
ORDER BY
  CASE question_type
    WHEN 'notice' THEN 1
    WHEN 'underwriting' THEN 2
    WHEN 'product' THEN 3
    WHEN 'etc' THEN 4
  END;

SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('nav_questions', 'nav_answers')
ORDER BY tablename, cmd;

COMMIT;

-- 격차 시: ROLLBACK;

-- ============================================================================
-- 예상 결과:
-- - questions: 6 / answers: 12
-- - 분포: notice 1 (답변 1) / underwriting 2 (답변 5) / product 2 (답변 3) / etc 1 (답변 1)
-- - RLS 8건 (질문 4 + 답변 4)
-- ============================================================================
