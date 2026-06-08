-- 소식지 private 버킷 RLS (2026-06-08) — §1
-- 🚨 실행 전 신버전 확인: onesecond-v1-restore-0420 / pdnwgzneooyygfejrvbg
-- 🚨 실행 = 팀장님. service_role 미사용. 게이트: §5-1(기존 첨부 회귀) 통과 후.
--
-- 버킷 생성은 Dashboard 권장(Storage → New bucket → name=newsletters, Public=OFF).
-- SQL로도 가능 시 아래 [0] 사용(이미 있으면 skip).

-- [0] 버킷 (private) — Dashboard로 만들었으면 생략
insert into storage.buckets (id, name, public)
values ('newsletters','newsletters', false)
on conflict (id) do nothing;

-- [1] RLS: 로그인 사용자(authenticated)만 select(읽기/서명) 허용
--     비로그인(anon) = 차단(=private). 비4팀 차단은 게시글(team_notices) team RLS가 담당.
drop policy if exists "newsletters_select_authenticated" on storage.objects;
create policy "newsletters_select_authenticated"
  on storage.objects for select to authenticated
  using ( bucket_id = 'newsletters' );

-- [2] 검증 (읽기)
-- select id, public from storage.buckets where id='newsletters';            -- public=false 기대
-- select policyname, cmd, roles from pg_policies
--   where schemaname='storage' and tablename='objects' and policyname like 'newsletters%';
