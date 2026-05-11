-- ============================================================================
-- 별 트랙 #58 — 네비방 글쓰기 공지 폼 v0 진입 (2026-05-11)
-- 결재 A(c) = audience_target / responder_hint 신설 + 나머지 부재 필드는 content 흡수
-- 결재 B = DB 영문 ENUM / 화면 한글 라벨 분리 매핑
-- 결재 C = (b) 공지 폼 우선 — 4종 통째 금지
-- 실행 위치: Supabase Dashboard SQL Editor (신버전 onesecond-v1-restore-0420)
-- 실행 주체: 팀장님 (Code는 SQL 파일 신설만, 실행 X)
-- ============================================================================
--
-- 배경:
--   어제 2026-05-10 채팅에서 결정된 네비방 글쓰기 4종 폼 본진 중 공지 폼 v0 진입.
--   라이브 posts 테이블에는 audience_target / responder_hint 컬럼 부재 (db_v0_diagnosis_2026-05-10.md L114~117 박힘).
--   본 마이그레이션 = 컬럼 2건 신설 + CHECK ENUM 1건 박음.
--
-- 정합:
--   - 마스터 전략 § 13 결재 #1 "Step 8 진입 전 spec 박음" 정합
--   - navigation_write_overlay_v0_2026-05-11.md §3 신설 SQL 정합
--   - spec § 6-3 (네비방 INSERT) 정책 정합 (v0 가짜 연결 단계)
--
-- 본 박음 영향 범위:
--   - public.posts 테이블에 컬럼 2건 추가 (nullable, default NULL)
--   - 기존 row 영향 0 (모두 NULL 박힘)
--   - 기존 INSERT 영향 0 (컬럼 nullable)
--   - 기존 SELECT 영향 0 (RLS 정책 변경 X)
--
-- ============================================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │ [1] audience_target 컬럼 신설 (공지/기타 폼 우측 = 답변자 범위) │
-- └─────────────────────────────────────────────────────────┘
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS audience_target text;

COMMENT ON COLUMN public.posts.audience_target IS
  '답변자 범위 ENUM 5종 (공지/기타 폼 우측). 인수/상품 폼에서는 NULL. 어제 2026-05-10 결정 본진.';

-- ┌─────────────────────────────────────────────────────────┐
-- │ [2] responder_hint 컬럼 신설 (기타 폼 전용 = 답변자 힌트)         │
-- └─────────────────────────────────────────────────────────┘
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS responder_hint text;

COMMENT ON COLUMN public.posts.responder_hint IS
  '답변자 힌트 text (기타 폼 전용). 공지/인수/상품 폼에서는 NULL. 자유 입력 정합.';

-- ┌─────────────────────────────────────────────────────────┐
-- │ [3] audience_target CHECK ENUM 5종 박음                       │
-- └─────────────────────────────────────────────────────────┘
ALTER TABLE public.posts
  ADD CONSTRAINT posts_audience_target_check
  CHECK (
    audience_target IS NULL OR audience_target IN (
      'team_internal',      -- 화면 라벨: 팀 내부
      'branch',             -- 화면 라벨: 지점
      'navigation_all',     -- 화면 라벨: 전체 네비게이션방 (기본값)
      'insurer_specific',   -- 화면 라벨: 특정 보험사
      'admin_only'          -- 화면 라벨: 운영진만
    )
  );

-- ============================================================================
-- 검증 쿼리 (실행 후 결과 확인용 — 본 검증은 별도 실행 권장)
-- ============================================================================
--
-- [검증 1] 컬럼 2건 박힘 확인
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='posts'
--   AND column_name IN ('audience_target', 'responder_hint')
-- ORDER BY column_name;
--
-- expected: 2 rows
--   audience_target | text | YES
--   responder_hint  | text | YES
--
--
-- [검증 2] CHECK ENUM 박힘 확인
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid='public.posts'::regclass
--   AND conname = 'posts_audience_target_check';
--
-- expected: 1 row
--   posts_audience_target_check | CHECK (... IN ('team_internal', 'branch', ...))
--
--
-- [검증 3] 기존 row 영향 0 확인
-- SELECT COUNT(*) FROM public.posts WHERE audience_target IS NULL;
-- expected: 10
--   = archive_legacy 4건 (id 9,10,11,12, 2026-04-17~27)
--   + [샘플] 시드 6건 (id 17~23, 2026-05-10 #51 슬롯 4 박힘 — board_type 6종 커버리지)
-- 본 마이그레이션 후 모두 NULL = 영향 0
-- (2026-05-11 라이브 진단 결과 박음. db_v0_diagnosis L80은 시드 박기 전 4건 기준이었음)
--
-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
