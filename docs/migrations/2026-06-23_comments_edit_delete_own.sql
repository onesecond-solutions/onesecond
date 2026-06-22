-- 댓글 본인 수정·삭제 RLS — STEP 0 실측 후 최소 적용판 (2026-06-23)
--
-- 🚨 실행 전 신버전 확인: 프로젝트명 onesecond-v1-restore-0420 / ID pdnwgzneooyygfejrvbg
-- 🚨 실행 = 대표님 (Supabase SQL Editor). Code는 파일·PR만. 본 PR DB 변경 0.
--
-- ════════════════════════════════════════════════════════════════
-- STEP 0 실측 결과 (2026-06-23 라이브 · 신버전) — 정책 현황
-- ════════════════════════════════════════════════════════════════
-- 컬럼: comments.author_id=text(null허용)·id=bigint·post_id=bigint
--       entry_comments.author_id=text(NOT NULL)·id=bigint·source_id/type=text
-- author_id NULL/empty = 두 테이블 모두 0 (데이터 정상).
--
-- 기존 정책(실측):
--   comments       UPDATE  "own comments update"   USING (auth.uid()::text = author_id)  [WITH CHECK 암묵=USING → author_id 변경 차단됨]
--   comments       DELETE  "own comments delete"   USING (auth.uid()::text = author_id)
--   comments       DELETE  "comments_admin_delete" USING is_admin()
--   entry_comments DELETE  "entry_comments_delete" USING (author_id = auth.uid()::text OR is_admin())
--   entry_comments UPDATE  ❌ 없음  ← 유일한 공백
--
-- 결론: 본인 수정·삭제에 필요한 정책은 entry_comments UPDATE 하나만 누락.
--       comments(UPDATE/DELETE)·entry_comments DELETE 는 이미 존재 → 추가 시 중복 정책만 쌓임.
--       → 본 마이그레이션은 entry_comments_update_own 하나만 추가한다.
--
-- (참고) comments "own comments update" 는 WITH CHECK 가 암묵(=USING)이라 author_id 변경 이미 차단.
--        명시화는 효과 동일 + 기존 정책 회귀 위험만 있어 미적용(원칙: 기존 정책 회귀 금지).

-- ════════════════════════════════════════════════════════════════
-- STEP 1 : entry_comments 본인 UPDATE 정책 (유일 추가)
--   ★ STEP 0 (a) relrowsecurity=true 확인 후 실행.
--     entry_comments 는 제약형 SELECT/INSERT 정책이 이미 작동 중(소속 격리)이라 RLS=ON 으로 판단됨.
--   author_id 는 text → 기존 entry_comments 정책 스타일과 동일하게 (auth.uid())::text 비교.
--   USING + WITH CHECK 둘 다 본인 → 타인 수정 불가 + author_id 를 타인으로 변경 불가.
-- ════════════════════════════════════════════════════════════════
drop policy if exists entry_comments_update_own on public.entry_comments;
create policy entry_comments_update_own on public.entry_comments
  for update to authenticated
  using (author_id = (auth.uid())::text)
  with check (author_id = (auth.uid())::text);

-- ════════════════════════════════════════════════════════════════
-- STEP 2 : 검증 (별도 RUN · 읽기전용)
-- ════════════════════════════════════════════════════════════════
-- (1) 정책 생성 확인
-- select policyname, cmd, qual as using_qual, with_check
--   from pg_policies
--  where schemaname='public' and tablename='entry_comments' and cmd='UPDATE';
--   → entry_comments_update_own (UPDATE, using+with_check = author_id 본인)
--
-- (2) (본인 세션) 본인 entry_comments 1건 content PATCH → 204 + 1행 반영 기대
-- (3) (타 세션) 타인 entry_comments id 로 PATCH → 0행(차단) 기대
-- (4) (본인 세션) PATCH 로 author_id 를 타인으로 변경 시도 → WITH CHECK 위반(차단) 기대
-- (5) comments 본인 수정·삭제 / entry_comments 본인 삭제 = 기존 정책으로 동작(추가 변경 없음) 회귀 확인

-- ════════════════════════════════════════════════════════════════
-- 롤백 (필요 시)
-- ════════════════════════════════════════════════════════════════
-- drop policy if exists entry_comments_update_own on public.entry_comments;
