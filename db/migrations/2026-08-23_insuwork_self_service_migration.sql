-- 🟠 실제 DDL + RPC — 보험워크(insuwork) 자가서비스(self-service) 레거시 데이터 이관
-- ═══════════════════════════════════════════════════════════════════════════
-- 배경: 오늘까지 보험워크는 사전 지정된 17명(2026-08-14_workspace_unified_schema.sql로
--   전원 일괄 이관 완료)만 접근했다. 이제 전체 가입 사용자에게 보험워크를 오픈한다.
--   신규/기존 사용자는 최초 로그인 시 클라이언트 팝업(별도 작업, 본 마이그레이션 범위 아님)으로
--   "레거시 자료를 보험워크로 옮길지" 묻고, 그 응답에 따라 본 마이그레이션이 만드는 RPC
--   함수를 Supabase REST rpc()로 호출한다.
--
-- 본 마이그레이션이 만드는 것:
--   1. public.insuwork_migration_choices — 사용자별 이관 선택(수락/거절) 기록 테이블.
--   2. public.migrate_my_legacy_data() — 호출자 본인 소유 레거시 데이터 7종을
--      insuwork_items/insuwork_customers/insuwork_consultations/insuwork_tasks로
--      이관하는 SECURITY DEFINER RPC. 멱등(idempotent) — 여러 번 호출해도 안전.
--   3. public.decline_legacy_migration() — "거절" 선택만 기록하는 RPC.
--   4. 이미 이관 완료된 17명 backfill — 'accepted'로 소급 기록해 팝업 재노출 방지.
--
-- ⚠️ 7블록 이관 로직(coalesce·CASE·legacy_source·legacy_id·legacy_payload 등)은
--   db/migrations/2026-08-14_workspace_unified_schema.sql(원본, 전 사용자 대상 일괄
--   이관)의 INSERT...SELECT 블록을 파일에서 직접 읽어 그대로 전사(transcribe)했다.
--   기억이나 요약이 아니라 원본 파일 원문 대조. 바뀐 부분은 정확히 3가지뿐:
--     (a) 대상 테이블명 workspace_* → insuwork_*
--         (db/migrations/2026-08-23_rename_workspace_tables_to_insuwork.sql로 이미 rename됨)
--     (b) 각 SELECT에 "AND <owner 컬럼>::text = v_uid::text" 스코핑 추가 — 호출자 본인
--         행만 대상. 원본의 소스 컬럼 타입(text/uuid 혼재 가능성)에 안전하도록 양쪽을
--         텍스트로 캐스팅해 비교한다(원본처럼 owner 컬럼을 곧장 ::uuid로 캐스팅해 비교하면,
--         같은 테이블 안 다른 행에 형식이 깨진 legacy owner 값이 있을 때 WHERE 평가 중
--         캐스팅 에러로 함수 전체가 죽을 수 있어 회피).
--     (c) 원본의 "owner_id::text ~* '^[0-9a-f-]{36}$'" 형식 검증 WHERE절은 제거 —
--         v_uid는 auth.uid()가 반환한 이미 유효한 uuid라 (b)의 owner 스코핑 비교
--         자체가 형식이 깨진 값을 자연히 걸러낸다(값이 다르면 그냥 매치 안 됨).
--   원본의 ON CONFLICT (legacy_source,legacy_id) DO NOTHING은 모든 INSERT 블록에서
--   그대로 보존 — 동일 사용자가 이 RPC를 여러 번 호출해도 중복 없이 안전(멱등).
--
-- ⚠️ insuwork_migration_choices는 클라이언트 직접 INSERT/UPDATE 경로를 열지 않는다
--   (RLS에 SELECT 정책만 부여). 실제 쓰기는 아래 두 SECURITY DEFINER RPC만 수행 —
--   임의 클라이언트가 이 테이블에 직접 쓰기 요청을 보낼 길이 없어 더 안전하다.
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
insert into public.insuwork_migration_choices (user_id, choice, decided_at)
values
  ('98c5f4f9-10c1-4ee1-a656-5c2ca63239fd','accepted',now()),
  ('ce381ed4-05e3-41cf-8546-9115abe89ec9','accepted',now()),
  ('fee71d85-adc4-4db6-81b0-152f07add62a','accepted',now()),
  ('583cbad5-f248-4fd9-8693-5c3a79ba9487','accepted',now()),
  ('6f5aaa10-be20-4274-a190-53ce38ed3850','accepted',now()),
  ('12c8551b-4622-4fe4-9dba-d77fef8504bf','accepted',now()),
  ('efe26e96-de4e-4613-9625-7c8193d39a49','accepted',now()),
  ('d19dcb63-3e28-4559-b498-56b19f9c94f2','accepted',now()),
  ('e10f9713-a199-47ac-9040-eb8007824cda','accepted',now()),
  ('8028a0e9-ec19-408b-8a82-007732fbed2b','accepted',now()),
  ('bb49f5b9-e620-41d2-bee5-89329cbc5d7d','accepted',now()),
  ('10a859ec-8dc6-43bd-bc7b-09e3f16c8248','accepted',now()),
  ('49343788-b3e1-4666-b95f-211ac6b3f878','accepted',now()),
  ('de7ba389-901a-426a-9828-6afb33a16ecc','accepted',now()),
  ('64d0e07f-ec84-430b-b2ea-b7213e857ace','accepted',now()),
  ('6f7fbad3-fe3f-416c-a077-9e36be425d5c','accepted',now()),
  ('ba679086-dc1e-4a99-9245-9f4cf8222455','accepted',now())
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
