-- 댓글 본인 UPDATE / DELETE 허용 RLS (2026-06-23) — 두 테이블
-- 대상 1) entry_comments (폴리모픽: source_type+source_id)
--        = 바텀시트 마이/팀/지점 스페이스 콘텐츠 댓글
--          (개인/팀/지점 자료실=vault · 스크립트=script · 메모=memo/library · 팀방/지점방=team_notice)
-- 대상 2) comments (post_id 기반)
--        = 게시판 posts 댓글/답변 (보험Q&A=qna · 원수사(보험사) 자료실=insurer 등)
--
-- 🚨 실행 전 신버전 확인: 프로젝트명 onesecond-v1-restore-0420 / ID pdnwgzneooyygfejrvbg
--    Dashboard 좌상단 프로젝트 표시 또는 URL의 프로젝트 ID가 위와 같은지 먼저 확인 후 실행.
-- 🚨 실행 = 대표님 (Supabase SQL Editor). Code는 파일·PR만. 본 PR DB 변경 0.
-- 🟠 데이터 정책 생성(권한). STEP 0(읽기전용) → 결과 확인 → STEP 1(적용) 순서.
--
-- 설계(두 테이블 공통):
--   * UPDATE: author_id = 본인(auth.uid) 만. USING + WITH CHECK 둘 다 본인 조건
--     → 타인 댓글 수정 불가 + 수정으로 author_id 를 타인으로 바꾸기 불가(WITH CHECK).
--   * DELETE: author_id = 본인(auth.uid) 만.
--   * 익명(비로그인) = authenticated 롤 아님 → 정책 대상 외 = 차단.
--   * 관리자 예외는 본 정책에 넣지 않음(작업지시 원칙). 기존 admin ALL 정책이 있으면 그대로 별도 유지.
--   * 타입 안전: author_id 가 text/uuid 어느 쪽이어도 동작하도록 양변 ::text 캐스트.
--     (대상 행은 PostgREST 가 id=eq 로 이미 좁히므로 RLS 술어의 캐스트는 성능 영향 무시 가능)

-- ════════════════════════════════════════════════════════════════
-- STEP 0 : 현황 점검 (★별도 RUN · 전부 읽기전용 · 운영 변경 0)
-- ════════════════════════════════════════════════════════════════
-- (a) RLS 활성 여부 — relrowsecurity = true 이어야 정책이 효력. false면 STEP 1 전 enable 필요.
-- select relname, relrowsecurity
--   from pg_class
--  where oid in ('public.entry_comments'::regclass, 'public.comments'::regclass);

-- (b) author_id / id 실제 타입 확인 (스키마 추정 금지)
-- select table_name, column_name, data_type, is_nullable
--   from information_schema.columns
--  where table_schema='public' and table_name in ('entry_comments','comments')
--    and column_name in ('id','author_id','source_type','source_id','post_id','content','created_at')
--  order by table_name, column_name;

-- (c) 현재 정책 전체 — 동일 목적(UPDATE/DELETE own) 중복 + admin ALL 존재 여부
-- select tablename, policyname, cmd, roles, qual as using_qual, with_check
--   from pg_policies
--  where schemaname='public' and tablename in ('entry_comments','comments')
--  order by tablename, cmd, policyname;

-- ════════════════════════════════════════════════════════════════
-- STEP 1 : 본인 UPDATE / DELETE 정책 적용
--   ★ STEP 0 (a) relrowsecurity = true 확인 후 실행.
--     false 이면 먼저: alter table public.<테이블> enable row level security;
--     (단, enable 시 기존 SELECT/INSERT 정책이 있어야 댓글 조회·작성 회귀 없음 — STEP 0 (c)로 확인)
-- ════════════════════════════════════════════════════════════════

-- ── entry_comments ────────────────────────────────────────────
drop policy if exists entry_comments_update_own on public.entry_comments;
create policy entry_comments_update_own on public.entry_comments
  for update to authenticated
  using ((author_id)::text = (auth.uid())::text)
  with check ((author_id)::text = (auth.uid())::text);

drop policy if exists entry_comments_delete_own on public.entry_comments;
create policy entry_comments_delete_own on public.entry_comments
  for delete to authenticated
  using ((author_id)::text = (auth.uid())::text);

-- ── comments (게시판 posts) ───────────────────────────────────
drop policy if exists comments_update_own on public.comments;
create policy comments_update_own on public.comments
  for update to authenticated
  using ((author_id)::text = (auth.uid())::text)
  with check ((author_id)::text = (auth.uid())::text);

drop policy if exists comments_delete_own on public.comments;
create policy comments_delete_own on public.comments
  for delete to authenticated
  using ((author_id)::text = (auth.uid())::text);

-- ════════════════════════════════════════════════════════════════
-- STEP 2 : 검증 (별도 RUN · 읽기전용)
-- ════════════════════════════════════════════════════════════════
-- (1) 정책 4건 생성 확인
-- select tablename, policyname, cmd, qual as using_qual, with_check
--   from pg_policies
--  where schemaname='public' and tablename in ('entry_comments','comments') and cmd in ('UPDATE','DELETE')
--  order by tablename, cmd;
--   → 테이블별 *_update_own(UPDATE, using+with_check 본인) / *_delete_own(DELETE, using 본인)
--
-- (2) (본인 계정 세션) 본인 댓글 1건 content 수정 → 200/204 + 1행 반영 기대
-- (3) (타 계정 세션) 타인 댓글 id 로 PATCH/DELETE → 0행(차단) 기대
-- (4) (본인 계정 세션) PATCH 로 author_id 를 타인으로 변경 시도 → WITH CHECK 위반(차단) 기대

-- ════════════════════════════════════════════════════════════════
-- 롤백 (필요 시)
-- ════════════════════════════════════════════════════════════════
-- drop policy if exists entry_comments_update_own on public.entry_comments;
-- drop policy if exists entry_comments_delete_own on public.entry_comments;
-- drop policy if exists comments_update_own on public.comments;
-- drop policy if exists comments_delete_own on public.comments;
