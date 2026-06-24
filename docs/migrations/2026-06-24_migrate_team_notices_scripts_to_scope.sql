-- ============================================================
-- 공지게시판 정리 — team_notices 스크립트 공유 → scripts scope='team' 이식 + 스크립트/메모 제거
-- 작성: 2026-06-24 (총괄팀장 Code) / 신버전 pdnwgzneooyygfejrvbg (onesecond-v1-restore-0420)
-- 결재: 대표님 — 공지게시판에 옛 스크립트/메모 공유(#918 dual-write 잔재)가 섞여 보이는 문제 정리.
--
-- 배경:
--   · #918(2026-06-22)에서 파일/스크립트 팀 공유를 team_notices(source_type 포함)에 같이 기록.
--   · #931로 파일만 제거. 스크립트·메모는 team_notices에 잔존 → 공지게시판(cospRenderNotices)이
--     source_type 필터 없이 전부 표시 → 공지 + 스크립트/메모 섞여 보임.
--
-- 진단(2026-06-24, deleted_at is null):
--   · (순수공지) team_internal 14 / branch_internal 4
--   · script team_internal 12   ← scripts scope='team' 로 이식
--   · memo   team_internal 2    ← 메모=마이 전용(작업지시서) → 이식 X, 제거만
--   · 표본: team_id=5fccd362(4팀)·author_id=임태성·content=스크립트 본문(rich HTML)·attachments 보유.
--     → 원본 scripts 조회 불필요, team_notices 자체 데이터로 이식.
--
-- 이식 매핑(team_notices → scripts):
--   owner_id=author_id, title=title, script_text=content, scope='team',
--   scope_id=team_id::text(= os_user_team_id() 와 정합 → 같은 팀에 표시), attachments/keywords 보존, is_active=true
--
-- ⚠️ 실행 = 대표님/검수팀(SQL 게이트, service_role = RLS 우회). 한 RUN = BEGIN~COMMIT. 검증/롤백 별도 RUN.
-- 관련: app.html cospRenderNotices 에 source_type=is.null 필터 추가(공지게시판=순수 공지만). _snScopeScripts 가 이식분 표시.
-- ============================================================


-- ───────────────────────────────────────────────────────────
-- [RUN 1] 검증용 — 이식+제거 후 결과 확인하고 ROLLBACK (운영 미반영)
-- ───────────────────────────────────────────────────────────
begin;

-- (1) 스크립트 12건 이식 → scripts scope='team'
insert into public.scripts (owner_id, title, script_text, scope, scope_id, attachments, keywords, is_active)
select author_id, title, content, 'team', team_id::text, attachments, keywords, true
from public.team_notices
where source_type = 'script' and scope = 'team_internal' and deleted_at is null;

-- 확인 A: 이식된 team 스크립트 수(=12 기대) + scope_id 분포
select scope_id, count(*) as n from public.scripts where scope='team' group by scope_id order by n desc;

-- (2) 스크립트·메모 공유 team_notices 소프트삭제(공지게시판에서 제거)
update public.team_notices set deleted_at = now()
where source_type in ('script','memo') and deleted_at is null;

-- 확인 B: 남은 team_notices = 순수 공지만(team 14 / branch 4 기대)
select coalesce(source_type,'(순수공지)') as source_type, scope, count(*) as n
from public.team_notices where deleted_at is null
group by 1,2 order by n desc;

rollback;


-- ───────────────────────────────────────────────────────────
-- [RUN 2] 운영 반영 — 위 검증 통과 후에만 (주석 해제)
-- ───────────────────────────────────────────────────────────
-- begin;
--
-- insert into public.scripts (owner_id, title, script_text, scope, scope_id, attachments, keywords, is_active)
-- select author_id, title, content, 'team', team_id::text, attachments, keywords, true
-- from public.team_notices
-- where source_type = 'script' and scope = 'team_internal' and deleted_at is null;
--
-- update public.team_notices set deleted_at = now()
-- where source_type in ('script','memo') and deleted_at is null;
--
-- commit;
