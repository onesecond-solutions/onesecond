-- 인앱 알림 Phase 3 — 새 글 자동 푸시 트리거 (2026-06-04)
-- posts(board_type in qna/insurer, 소식지 제외) + team_notices(team_internal) INSERT 시
-- send-push Edge Function 을 pg_net 으로 비동기 호출 → 구독자에게 웹푸시.
-- 신버전(pdnwgzneooyygfejrvbg)에서 실행.

-- 1) pg_net 확장 (HTTP 호출)
create extension if not exists pg_net;

-- 2) 트리거 함수
create or replace function public.notify_new_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_url   text;
  v_body  text;
begin
  if tg_table_name = 'team_notices' then
    v_title := '현장의 소리 새 공지';
    v_url   := '/app.html?view=voice';
  elsif tg_table_name = 'posts' and new.board_type = 'insurer' then
    v_title := '보험사 자료실 새 글';
    v_url   := '/app.html?view=insurer-vault';
  else  -- posts qna
    v_title := '새 보험Q&A';
    v_url   := '/app.html?view=voice';
  end if;

  v_body := left(coalesce(new.title, ''), 80);

  perform net.http_post(
    url     := 'https://pdnwgzneooyygfejrvbg.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', 'onesecond-cron-2026-newkey-abc123'
               ),
    body    := jsonb_build_object('title', v_title, 'body', v_body, 'url', v_url)
  );
  return new;
exception when others then
  return new;  -- 알림 실패해도 글 저장은 정상
end;
$$;

-- 3) 트리거 부착 (알림 대상 글만)
drop trigger if exists trg_notify_post on public.posts;
create trigger trg_notify_post
  after insert on public.posts
  for each row
  when (new.board_type in ('qna','insurer') and coalesce(new.title,'') not ilike '%소식지%')
  execute function public.notify_new_post();

drop trigger if exists trg_notify_team_notice on public.team_notices;
create trigger trg_notify_team_notice
  after insert on public.team_notices
  for each row
  when (new.scope = 'team_internal')
  execute function public.notify_new_post();
