-- ============================================================
-- 공유하기 — shares 테이블 (Phase 1)
-- 작성: 2026-06-14 (총괄팀장 Code) / 신버전 pdnwgzneooyygfejrvbg (onesecond-v1-restore-0420)
-- 결재: 대표님 — 마이 스페이스(스크립트·메모·자료)를 팀/지점에 공유 → 공유함 → 받기(복사)
--
-- 모델: 공유 1건 = 1행(메타만). 원본(scripts/myspace_files)은 마이스페이스에 그대로.
--   공유함(받은 공유) = scope_id가 내 팀/지점인 shares. 보낸 공유 = from_user=나.
--   받기(Phase 3) = 원본 스냅샷을 받는 사람 owner로 복사 + 출처 메타.
-- ⚠️ 실행 = 대표님/Chrome (SQL 게이트). 한 RUN = BEGIN~COMMIT, 검증 SELECT는 별도 RUN.
-- 전제: os_user_team_id()/os_user_branch_id()(SECURITY DEFINER, vault_shared_scope에서 생성) + is_admin() 존재.
-- ============================================================

begin;

create table if not exists public.shares (
  id         uuid primary key default gen_random_uuid(),
  item_type  text not null check (item_type in ('script','memo','file')),
  item_id    uuid not null,                       -- 원본 scripts.id 또는 myspace_files.id
  from_user  uuid not null default auth.uid(),    -- 보낸 사람(users.id=auth.uid)
  from_name  text,                                -- 보낸 사람 이름 스냅샷(목록 표시용)
  scope      text not null check (scope in ('team','branch')),
  scope_id   uuid not null,                       -- 내 team_id / branch_id
  title      text,                                -- 항목 제목 스냅샷(원본 삭제 대비)
  payload    jsonb,                               -- 내용 스냅샷: script={script_text,keywords,attachments} / memo={memo_text,description} / file={original_name,ext,mime_type,file_size}
  created_at timestamptz not null default now()
);
create index if not exists idx_shares_scope on public.shares(scope, scope_id, created_at desc);
create index if not exists idx_shares_from  on public.shares(from_user, created_at desc);

alter table public.shares enable row level security;

-- SELECT: 받은(내 팀/지점) + 보낸(나) + admin
drop policy if exists shares_select on public.shares;
create policy shares_select on public.shares for select to authenticated using (
       (scope = 'team'   and scope_id = public.os_user_team_id())
    or (scope = 'branch' and scope_id = public.os_user_branch_id())
    or from_user = auth.uid()
    or is_admin()
);

-- INSERT: 본인이, 자기 팀/지점으로만 공유
drop policy if exists shares_insert on public.shares;
create policy shares_insert on public.shares for insert to authenticated with check (
  from_user = auth.uid()
  and (
       (scope = 'team'   and scope_id = public.os_user_team_id())
    or (scope = 'branch' and scope_id = public.os_user_branch_id())
  )
);

-- DELETE: 보낸 사람 본인 + admin (공유 취소)
drop policy if exists shares_delete on public.shares;
create policy shares_delete on public.shares for delete to authenticated using (
  from_user = auth.uid() or is_admin()
);

commit;

-- ============================================================
-- 검증 SELECT (커밋 후 별도 RUN)
-- ============================================================
-- select policyname, cmd from pg_policies where tablename='shares';
-- select column_name from information_schema.columns where table_schema='public' and table_name='shares' order by ordinal_position;
