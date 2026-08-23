-- 🟠 실제 DDL + RPC — 보험워크(insuwork) 자가서비스 레거시 데이터 이관 (v2, 재시도)
-- ═══════════════════════════════════════════════════════════════════════════
-- 2026-08-23_insuwork_self_service_migration.sql(원본)이 apply 단계에서 실패했다:
--   backfill 17명 중 '10a859ec-8dc6-43bd-bc7b-09e3f16c8248'가 auth.users에 존재하지
--   않는(탈퇴 또는 존재한 적 없는) 계정이라 외래키 제약 위반으로 트랜잭션 전체가
--   롤백됐다(단일 begin/commit이라 부분 반영 없음 — 테이블·함수·다른 16명 backfill
--   전부 미적용 상태로 원복). 원본 마이그레이션 파일은 불변 규칙에 따라 수정하지 않고
--   그대로 두며(이력 보존, 실제 DB에는 아무 영향도 안 남긴 채 실패했다는 사실 자체가
--   기록), 이 v2가 같은 내용을 안전하게 재적용한다.
--
-- 수정 사항 — 딱 하나: backfill을 하드코딩 VALUES에서 "auth.users에 실제로 존재하는
--   id만 골라 넣는" INSERT ... SELECT ... WHERE EXISTS 방식으로 바꿨다. 이러면 이번
--   17명 중 유령 계정 1명이 빠지는 것은 물론, 앞으로 이 파일을 다시 참고해 유사한
--   backfill을 만들 때도 같은 사고가 재발하지 않는다. 나머지(테이블·RLS·두 RPC
--   함수·7블록 이관 로직)는 원본과 완전히 동일 — CREATE TABLE IF NOT EXISTS /
--   CREATE OR REPLACE FUNCTION이라 원본이 실패했든 말든 이 v2 단독으로도 안전하게
--   전체를 처음부터 만든다.
--
-- ⚠️ 대상: onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. 이관 선택 기록 테이블 ─────────────────────────────────────────────
create table if not exists public.insuwork_migration_choices (
  user_id uuid primary key references auth.users(id) on delete cascade,
  choice text not null check (choice in ('accepted','declined')),
  decided_at timestamptz not null default now()
);

alter table public.insuwork_migration_choices enable row level security;

drop policy if exists insuwork_migration_choices_select_own on public.insuwork_migration_choices;
create policy insuwork_migration_choices_select_own
  on public.insuwork_migration_choices for select to authenticated
  using (user_id = auth.uid());

-- ── 2. 본인 레거시 데이터 이관 RPC (수락) ────────────────────────────────
create or replace function public.migrate_my_legacy_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- [library] -> insuwork_items (memo/link/document)
  insert into public.insuwork_items(id,owner_id,item_type,title,body,url,visibility,legacy_source,legacy_id,legacy_payload,created_at,updated_at)
  select public.workspace_legacy_uuid('library',l.id::text),l.owner_id::uuid,
    case when nullif(l.memo_text,'') is not null then 'memo' when nullif(l.link_url,'') is not null then 'link' else 'document' end,
    coalesce(l.title,''),coalesce(l.memo_text,l.description),coalesce(l.link_url,l.file_url,l.image_url),
    case when coalesce(l.scope,'personal')='global' then 'public' else 'private' end,
    'library',l.id::text,to_jsonb(l),coalesce(l.created_at,now()),coalesce(l.created_at,now())
  from public.library l where l.owner_id::text = v_uid::text on conflict (legacy_source,legacy_id) do nothing;

  -- [scripts] -> insuwork_items (note)
  insert into public.insuwork_items(id,owner_id,item_type,title,body,visibility,legacy_source,legacy_id,legacy_payload,created_at,updated_at)
  select public.workspace_legacy_uuid('scripts',s.id::text),s.owner_id::uuid,'note',coalesce(s.title,''),s.script_text,
    case when coalesce(s.scope,'personal')='global' then 'public' else 'private' end,
    'scripts',s.id::text,to_jsonb(s),coalesce(s.created_at,now()),coalesce(s.updated_at,s.created_at,now())
  from public.scripts s where s.owner_id::text = v_uid::text on conflict (legacy_source,legacy_id) do nothing;

  -- [myspace_folders] -> insuwork_items (folder)
  insert into public.insuwork_items(id,owner_id,item_type,title,visibility,legacy_source,legacy_id,legacy_payload,created_at,updated_at,deleted_at)
  select public.workspace_legacy_uuid('myspace_folders',f.id::text),f.owner_id::uuid,'folder',coalesce(f.name,''),
    case when coalesce(f.scope,'personal')='global' then 'public' else 'private' end,
    'myspace_folders',f.id::text,to_jsonb(f),coalesce(f.created_at,now()),coalesce(f.updated_at,f.created_at,now()),f.deleted_at
  from public.myspace_folders f where f.owner_id::text = v_uid::text on conflict (legacy_source,legacy_id) do nothing;

  -- [myspace_folders] parent_id 재연결 (본인 소유 폴더 이관분만)
  update public.insuwork_items wi set parent_id=public.workspace_legacy_uuid('myspace_folders',f.parent_id::text)
  from public.myspace_folders f
  where wi.legacy_source='myspace_folders' and wi.legacy_id=f.id::text and f.parent_id is not null
    and wi.owner_id = v_uid and f.owner_id::text = v_uid::text;

  -- [myspace_files] -> insuwork_items (file)
  insert into public.insuwork_items(id,owner_id,parent_id,item_type,title,storage_path,mime_type,extension,file_size,visibility,legacy_source,legacy_id,legacy_payload,created_at,updated_at,deleted_at)
  select public.workspace_legacy_uuid('myspace_files',f.id::text),f.owner_id::uuid,
    case when f.folder_id is null then null else public.workspace_legacy_uuid('myspace_folders',f.folder_id::text) end,
    'file',coalesce(f.original_name,''),f.storage_path,f.mime_type,f.ext,f.file_size,
    case when coalesce(f.scope,'personal')='global' then 'public' else 'private' end,
    'myspace_files',f.id::text,to_jsonb(f),coalesce(f.created_at,now()),coalesce(f.updated_at,f.created_at,now()),f.deleted_at
  from public.myspace_files f where f.owner_id::text = v_uid::text on conflict (legacy_source,legacy_id) do nothing;

  -- [sales_customers] -> insuwork_customers
  insert into public.insuwork_customers(id,owner_id,name,phone,status,profile,legacy_source,legacy_id,legacy_payload,created_at,updated_at,deleted_at)
  select public.workspace_legacy_uuid('sales_customers',c.id::text),c.owner_id::uuid,coalesce(c.name,''),coalesce(c.phone,c.phone_raw),c.status,coalesce(c.profile,'{}'::jsonb),
    'sales_customers',c.id::text,to_jsonb(c),coalesce(c.created_at,now()),coalesce(c.updated_at,c.created_at,now()),c.deleted_at
  from public.sales_customers c where c.owner_id::text = v_uid::text on conflict (legacy_source,legacy_id) do nothing;

  -- [sales_consultations] -> insuwork_consultations (이미 이관된 고객 행에만 JOIN)
  insert into public.insuwork_consultations(id,owner_id,customer_id,channel,content,consulted_at,legacy_source,legacy_id,legacy_payload,created_at,updated_at)
  select public.workspace_legacy_uuid('sales_consultations',c.id::text),c.owner_id::uuid,public.workspace_legacy_uuid('sales_customers',c.customer_id::text),c.channel,coalesce(c.memo,''),coalesce(c.consulted_at,c.created_at,now()),
    'sales_consultations',c.id::text,to_jsonb(c),coalesce(c.created_at,now()),coalesce(c.created_at,now())
  from public.sales_consultations c
  join public.insuwork_customers wc on wc.id=public.workspace_legacy_uuid('sales_customers',c.customer_id::text)
  where c.owner_id::text = v_uid::text on conflict (legacy_source,legacy_id) do nothing;

  -- [calendar_events] -> insuwork_tasks
  insert into public.insuwork_tasks(id,owner_id,title,description,task_date,task_time,legacy_source,legacy_id,legacy_payload,created_at,updated_at)
  select public.workspace_legacy_uuid('calendar_events',e.id::text),e.author_id::uuid,e.title,e.description,e.event_date,nullif(e.event_time::text,'')::time,
    'calendar_events',e.id::text,to_jsonb(e),coalesce(e.created_at,now()),coalesce(e.created_at,now())
  from public.calendar_events e where e.author_id::text = v_uid::text on conflict (legacy_source,legacy_id) do nothing;

  insert into public.insuwork_migration_choices (user_id, choice, decided_at)
  values (v_uid, 'accepted', now())
  on conflict (user_id) do update set choice = 'accepted', decided_at = now();
end;
$$;
revoke all on function public.migrate_my_legacy_data() from public;
grant execute on function public.migrate_my_legacy_data() to authenticated;

-- ── 3. 이관 거절 기록 RPC ────────────────────────────────────────────────
create or replace function public.decline_legacy_migration()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  insert into public.insuwork_migration_choices (user_id, choice, decided_at)
  values (v_uid, 'declined', now())
  on conflict (user_id) do update set choice = 'declined', decided_at = now();
end;
$$;
revoke all on function public.decline_legacy_migration() from public;
grant execute on function public.decline_legacy_migration() to authenticated;

-- ── 4. 기존 17명(2026-08-14 일괄 이관 완료) 소급 backfill ────────────────
-- (수정) auth.users에 실제로 존재하는 id만 골라 넣는다 — 존재하지 않는 id는
--   외래키 위반으로 트랜잭션 전체를 죽이는 대신 조용히 건너뛴다(WHERE EXISTS).
insert into public.insuwork_migration_choices (user_id, choice, decided_at)
select candidate_id, 'accepted', now()
from (
  values
    ('98c5f4f9-10c1-4ee1-a656-5c2ca63239fd'::uuid),
    ('ce381ed4-05e3-41cf-8546-9115abe89ec9'::uuid),
    ('fee71d85-adc4-4db6-81b0-152f07add62a'::uuid),
    ('583cbad5-f248-4fd9-8693-5c3a79ba9487'::uuid),
    ('6f5aaa10-be20-4274-a190-53ce38ed3850'::uuid),
    ('12c8551b-4622-4fe4-9dba-d77fef8504bf'::uuid),
    ('efe26e96-de4e-4613-9625-7c8193d39a49'::uuid),
    ('d19dcb63-3e28-4559-b498-56b19f9c94f2'::uuid),
    ('e10f9713-a199-47ac-9040-eb8007824cda'::uuid),
    ('8028a0e9-ec19-408b-8a82-007732fbed2b'::uuid),
    ('bb49f5b9-e620-41d2-bee5-89329cbc5d7d'::uuid),
    ('10a859ec-8dc6-43bd-bc7b-09e3f16c8248'::uuid),
    ('49343788-b3e1-4666-b95f-211ac6b3f878'::uuid),
    ('de7ba389-901a-426a-9828-6afb33a16ecc'::uuid),
    ('64d0e07f-ec84-430b-b2ea-b7213e857ace'::uuid),
    ('6f7fbad3-fe3f-416c-a077-9e36be425d5c'::uuid),
    ('ba679086-dc1e-4a99-9245-9f4cf8222455'::uuid)
) as candidates(candidate_id)
where exists (select 1 from auth.users u where u.id = candidates.candidate_id)
on conflict (user_id) do nothing;

commit;

-- DOWN / ROLLBACK (manual, reviewed):
--   DROP FUNCTION public.decline_legacy_migration();
--   DROP FUNCTION public.migrate_my_legacy_data();
--   DROP TABLE public.insuwork_migration_choices;
-- (workspace_legacy_uuid(text,text)는 여기서 재정의하지 않았으므로 롤백 대상 아님 —
--  db/migrations/2026-08-14_workspace_unified_schema.sql 소유. 이 마이그레이션이 이관한
--  insuwork_items/customers/consultations/tasks 행은 ON CONFLICT DO NOTHING으로 삽입된
--  것이라 되돌리려면 legacy_source in ('library','scripts','myspace_folders',
--  'myspace_files','sales_customers','sales_consultations','calendar_events') AND
--  owner_id = 해당 user_id 조건으로 개별 DELETE 필요 — 자동 포함하지 않음, 별도 승인 후
--  수동 마이그레이션으로 처리.)
