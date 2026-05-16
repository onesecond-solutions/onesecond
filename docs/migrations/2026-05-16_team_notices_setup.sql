-- ============================================================================
-- 4팀 단체방2 시연 본진 — team_notices 테이블 + RLS + 인덱스 + 샘플 7건
-- 작성: 2026-05-16 D-2 (5/18 D-Day 시연 본진)
-- 결재: Code 권장값 6건 통째 채택 (2026-05-16 23:08 팀장님 명시)
-- ============================================================================
--
-- 🚨 실행 전 신버전 확인:
--   - Dashboard 좌상단 = `onesecond-v1-restore-0420`
--   - URL ID = `pdnwgzneooyygfejrvbg`
--
-- 📌 본 SQL 본진:
--   - 신규 테이블 team_notices (공지 7유형 + 첨부 + 작성자/팀)
--   - RLS 4종 (SELECT/INSERT/UPDATE/DELETE)
--   - 인덱스 2종 (team+created / type+team+created)
--   - 샘플 7건 INSERT (공지유형별 1개씩, 한재성 실장 author)
--   - 시연 본진 = 시간 단축 (D안 통째 박지 X)
--
-- ============================================================================

BEGIN;

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [1] team_notices 테이블 신설                                          │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS public.team_notices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES public.teams(id),
  author_id       uuid NOT NULL REFERENCES public.users(id),
  notice_type     text NOT NULL CHECK (notice_type IN (
    'operation', 'urgent', 'product', 'underwriting',
    'education', 'event', 'etc'
  )),
  scope           text NOT NULL DEFAULT 'team_internal',
  title           text NOT NULL,
  content         text NOT NULL,
  attachments     jsonb DEFAULT '[]'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

COMMENT ON TABLE public.team_notices IS
  '4팀 단체방2 (team_feed) 공지 본진 — 공지 7유형 + 역시간순 피드. 2026-05-18 시연 본진.';

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [2] 인덱스 2종 — 역시간순 + 카테고리 필터 본진                          │
-- └─────────────────────────────────────────────────────────────────────┘

CREATE INDEX IF NOT EXISTS idx_team_notices_team_created
  ON public.team_notices (team_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_team_notices_type
  ON public.team_notices (team_id, notice_type, created_at DESC)
  WHERE deleted_at IS NULL;

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [3] RLS 활성화 + 정책 4종                                              │
-- └─────────────────────────────────────────────────────────────────────┘

ALTER TABLE public.team_notices ENABLE ROW LEVEL SECURITY;

-- SELECT: 같은 team_id 소속 + admin
CREATE POLICY team_notices_select
  ON public.team_notices
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      is_admin()
      OR team_id = my_team_id()
    )
  );

-- INSERT: admin + ga_branch_manager + ga_manager (실장 이상)
CREATE POLICY team_notices_insert
  ON public.team_notices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('ga_branch_manager', 'ga_manager')
        AND u.team_id = team_notices.team_id
    )
  );

-- UPDATE: 작성자 본인 + admin
CREATE POLICY team_notices_update
  ON public.team_notices
  FOR UPDATE
  TO authenticated
  USING (is_admin() OR author_id = auth.uid())
  WITH CHECK (is_admin() OR author_id = auth.uid());

-- DELETE: 작성자 본인 + admin (soft delete = UPDATE deleted_at 박는 자리)
CREATE POLICY team_notices_delete
  ON public.team_notices
  FOR DELETE
  TO authenticated
  USING (is_admin() OR author_id = auth.uid());

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [4] 샘플 7건 INSERT — 공지유형별 1개씩 (시연 본진)                      │
-- └─────────────────────────────────────────────────────────────────────┘

DO $$
DECLARE
  v_author_id  uuid;
  v_team_id    uuid;
BEGIN
  -- 한재성 실장 (실장 본진)
  SELECT id INTO v_author_id FROM public.users
  WHERE email = 'jaisung78@gmail.com' LIMIT 1;
  IF v_author_id IS NULL THEN RAISE EXCEPTION '한재성 lookup 실패'; END IF;

  -- 4팀
  SELECT id INTO v_team_id FROM public.teams
  WHERE name LIKE '%4팀%' OR id::text LIKE '5fccd362%'
  ORDER BY created_at LIMIT 1;
  IF v_team_id IS NULL THEN RAISE EXCEPTION '4팀 lookup 실패'; END IF;

  -- 1. 운영 공지 (operation)
  INSERT INTO public.team_notices (team_id, author_id, notice_type, title, content, created_at)
  VALUES (v_team_id, v_author_id, 'operation',
    '5월 18일 월요일 회식 일정 안내',
    E'안녕하세요 4팀 가족 여러분.\n\n5월 18일 (월) 저녁 7시, 시청팀 전체 회식 진행됩니다.\n장소: 회사 뒷편 서울고깃집 (김치찌개집)\n\n재택 근무 분들도 가능하시면 꼭 참석 부탁드립니다.\n오랜만에 다 같이 얼굴 뵙고 좋은 시간 보내요. ^^',
    NOW() - INTERVAL '6 hours');

  -- 2. 긴급 공지 (urgent)
  INSERT INTO public.team_notices (team_id, author_id, notice_type, title, content, created_at)
  VALUES (v_team_id, v_author_id, 'urgent',
    '🚨 DB손보 간병인일당 20만 한도 5/25 이후 축소',
    E'DB손보 전상품에서 5/25 이후 간병인일당 20만원 가입금액이 축소됩니다.\n\n■ 대상: DB손보 전상품 + 5/25 이후\n■ 영향: 타사는 안 되는 20만 플랜 → 한도 축소\n\n간병인 + 수술비 / 순환계 플랜 추천 케이스는 5/24까지 마감 부탁드립니다.\n\n진행 중인 고객 계신 분들은 일정 꼭 챙겨주세요.',
    NOW() - INTERVAL '5 hours');

  -- 3. 상품 공지 (product)
  INSERT INTO public.team_notices (team_id, author_id, notice_type, title, content, created_at)
  VALUES (v_team_id, v_author_id, 'product',
    '한화생명 시그니처H 암보험 보험료 안내',
    E'한화생명 시그니처H 암보험 보험료 정보 공유드립니다.\n\n■ 최저보험료: 2만원\n■ 20년납 100세만기\n\n■ 연령별 예상 보험료:\n  - 20세: 20,965원\n  - 30세: 26,087원\n  - 40세: 29,541원\n\n상담 시 참고해주세요.',
    NOW() - INTERVAL '4 hours');

  -- 4. 인수 공지 (underwriting)
  INSERT INTO public.team_notices (team_id, author_id, notice_type, title, content, created_at)
  VALUES (v_team_id, v_author_id, 'underwriting',
    '흥국화재 0550건강 — B형 간염보균 인수 안내',
    E'흥국화재 인수 가이드 공유드립니다.\n\n■ 0550건강보험\n  - 비활동성 한해 E항원 검사결과지 첨부(6개월내) → 승인 (전기간부담보)\n\n■ 3N5간편\n  - 치료력 있다면 설계 가능\n  - 고지의무 미해당시 → 승인\n  - 최근 3개월 이내 고지有 → 가입 불가\n\n해당 케이스 상담 시 참고 부탁드립니다.',
    NOW() - INTERVAL '3 hours');

  -- 5. 교육 안내 (education)
  INSERT INTO public.team_notices (team_id, author_id, notice_type, title, content, created_at)
  VALUES (v_team_id, v_author_id, 'education',
    '5월 19일 화요일 한화생명 추가 교육 안내',
    E'5월 19일 (화) 한화생명 추가 교육이 잡혔습니다.\n\n■ 일시: 5/19 (화) 오전 10시\n■ 장소: 시청팀 회의실\n■ 자료: 한화생명 5월 교안 (사전 배포 예정)\n\n참석 가능하신 분들은 미리 일정 비워주세요.\n재택 근무 분들은 자료만이라도 꼭 검토 부탁드립니다.',
    NOW() - INTERVAL '2 hours');

  -- 6. 이벤트/일정 (event)
  INSERT INTO public.team_notices (team_id, author_id, notice_type, title, content, created_at)
  VALUES (v_team_id, v_author_id, 'event',
    '5월 보험사 마감일정 정리',
    E'5월 마감 일정 정리 공유드립니다.\n\n■ 한화손보\n  - 언더심사 최초심사: 16:00\n  - QA 최초심사: 16:00 / 보완심사: 17:00\n  - 청약서 발행 및 전자서명: 17:30\n  - 수납마감: 18:15 (연장 없음)\n\n■ KB손보 QA\n  - 매월 마지막 2영업일\n  - 신규: 20시 / 보완: 20시 30분\n  - UW 마감: 17:30\n\n■ 메리츠화재 5월 마감\n  - 실손의료비 외: 5/30 청약서 회수\n\n마감 임박 건은 미리 챙겨주세요!',
    NOW() - INTERVAL '1 hour');

  -- 7. 기타 (etc)
  INSERT INTO public.team_notices (team_id, author_id, notice_type, title, content, created_at)
  VALUES (v_team_id, v_author_id, 'etc',
    '메리츠 이주라 매니저 휴가 (대직자 안내)',
    E'메리츠 이주라 매니저 금일 휴가입니다.\n\n■ 대직자: 에즈더원 시청 조안나 매니저\n■ 연락처: 010-3905-2691\n\n급한 인수 문의나 상품 문의는 위 대직자에게 부탁드립니다.\n감사합니다.',
    NOW() - INTERVAL '30 minutes');

  RAISE NOTICE '4팀 단체방2 시연 본진 = 7 샘플 INSERT 완료 (운영/긴급/상품/인수/교육/이벤트/기타)';
END $$;

-- ┌─────────────────────────────────────────────────────────────────────┐
-- │ [5] 검증 SELECT                                                        │
-- └─────────────────────────────────────────────────────────────────────┘

-- 카운트
SELECT COUNT(*) AS total FROM public.team_notices WHERE deleted_at IS NULL;

-- 공지유형별 분포
SELECT notice_type, COUNT(*) AS n
FROM public.team_notices
WHERE deleted_at IS NULL
GROUP BY notice_type
ORDER BY
  CASE notice_type
    WHEN 'operation' THEN 1
    WHEN 'urgent' THEN 2
    WHEN 'product' THEN 3
    WHEN 'underwriting' THEN 4
    WHEN 'education' THEN 5
    WHEN 'event' THEN 6
    WHEN 'etc' THEN 7
  END;

-- RLS 정책 확인
SELECT policyname, cmd, qual FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'team_notices'
ORDER BY cmd;

COMMIT;

-- 격차 시: ROLLBACK;

-- ============================================================================
-- 예상 결과:
-- - total: 7
-- - 공지유형별: operation/urgent/product/underwriting/education/event/etc 각 1건
-- - RLS 정책 4종: SELECT/INSERT/UPDATE/DELETE
-- ============================================================================
