-- =====================================================================
-- 증적: entry_comments / entry_likes / team_notices SELECT RLS 최종 적용 상태
-- 날짜: 2026-06-22 (v3 — 실 pg_policy/함수 정의 증적. 시드 동적검증 폐기)
-- 대상 DB: 신버전 onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
--
-- 확정 권한 분기:
--   개인 = 소유자 / 팀방 = 같은 팀 / 지점방 = 같은 지점 / admin = 전체
--   entry_comments·entry_likes = 원본 SELECT 권한 상속(EXISTS)
--   SECURITY DEFINER 함수 search_path = public 고정 완료
--
-- ▷ 가짜 팀/지점 시드 기반 동적 검증은 대표 지시로 폐기.
--   아래 [재현 쿼리]는 전부 읽기전용(pg_policy/pg_proc 조회) = 운영 변경 0.
--   [캡처 결과]는 라이브에서 확인한 실제 정의(증적).
-- =====================================================================

-- ── [재현 쿼리 A] 3개 SELECT 정책 USING 식 (읽기전용) ────────────────
select polname, polcmd, pg_get_expr(polqual, polrelid) as using_qual
from pg_policy
where polrelid in ('public.entry_comments'::regclass,
                   'public.entry_likes'::regclass,
                   'public.team_notices'::regclass)
  and polcmd in ('r', '*')
order by polrelid::regclass::text, polname;

-- ── [재현 쿼리 B] SECURITY DEFINER 헬퍼 search_path 고정 여부 (읽기전용)
select proname, prosecdef, proconfig
from pg_proc
where proname in ('my_team_id', 'my_branch_id',
                  'os_user_team_id', 'os_user_branch_id', 'is_admin')
order by proname;

-- =====================================================================
-- [캡처 결과 — 2026-06-22 라이브 확인]
--
-- [1] entry_comments_select (USING):
--   (is_admin() OR
--    CASE source_type
--      WHEN 'script'      THEN EXISTS(SELECT 1 FROM scripts s        WHERE s.id::text  = entry_comments.source_id)
--      WHEN 'memo'        THEN EXISTS(SELECT 1 FROM library l        WHERE l.id::text  = entry_comments.source_id)
--      WHEN 'library'     THEN EXISTS(SELECT 1 FROM library l        WHERE l.id::text  = entry_comments.source_id)
--      WHEN 'vault'       THEN EXISTS(SELECT 1 FROM myspace_files mf WHERE mf.id::text = entry_comments.source_id)
--      WHEN 'team_notice' THEN EXISTS(SELECT 1 FROM team_notices tn  WHERE tn.id::text = entry_comments.source_id)
--      ELSE false
--    END)
--   => 원본 SELECT RLS 상속 + admin 전체.  ★ 권한 분기 일치
--
-- [2] entry_likes_select (USING):
--   (is_admin() OR
--    CASE source_type
--      WHEN 'script'      THEN EXISTS(SELECT 1 FROM scripts s        WHERE s.id::text = entry_likes.source_id)
--      WHEN 'memo'        THEN EXISTS(SELECT 1 FROM library l        WHERE l.id::text = entry_likes.source_id)
--      WHEN 'library'     THEN EXISTS(SELECT 1 FROM library l        WHERE l.id::text = entry_likes.source_id)
--      WHEN 'vault'       THEN EXISTS(SELECT 1 FROM myspace_files f  WHERE f.id::text = entry_likes.source_id)
--      WHEN 'team_notice' THEN EXISTS(SELECT 1 FROM team_notices t   WHERE t.id::text = entry_likes.source_id)
--      ELSE false
--    END)
--   => entry_comments 와 동일 상속 구조.  ★ 권한 분기 일치
--
-- [3] team_notices_select (USING):
--   ((deleted_at IS NULL) AND
--    (is_admin()
--     OR ((scope = 'team_internal')   AND (team_id   = my_team_id()))
--     OR ((scope = 'branch_internal') AND (branch_id = my_branch_id()))))
--   => 팀방=같은 팀 / 지점방=같은 지점 / admin=전체.  ★ 권한 분기 일치
--
-- [4] SECURITY DEFINER 헬퍼:
--   my_team_id()      : prosecdef=true, proconfig={search_path=public}
--   my_branch_id()    : prosecdef=true, proconfig={search_path=public}
--   os_user_team_id() : prosecdef=true, SET search_path=public
--   os_user_branch_id(): prosecdef=true, SET search_path=public
--   => search_path 고정 완료.  ★ 일치
--
-- 결론: 3개 SELECT 정책 + 헬퍼 모두 확정 권한 분기와 일치.
--       entry_comments/entry_likes 는 원본 SELECT 권한을 그대로 상속.
-- =====================================================================
