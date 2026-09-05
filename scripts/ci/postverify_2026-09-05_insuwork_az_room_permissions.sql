-- CI 사후 검증 (SELECT 전용) — 에즈 시청방 권한 테이블·RPC 확인
do $$
declare
  table_count bigint;
  function_count bigint;
  owner_count bigint;
begin
  select count(*) into table_count
  from information_schema.tables
  where table_schema = 'public' and table_name = 'insuwork_az_room_members';
  if table_count <> 1 then raise exception 'insuwork_az_room_members table missing'; end if;

  select count(*) into function_count
  from pg_proc
  where pronamespace = 'public'::regnamespace
    and proname in ('can_access_insuwork_az_room', 'set_insuwork_az_room_access');
  if function_count <> 2 then raise exception 'AZ room permission RPC missing'; end if;

  select count(*) into owner_count
  from public.insuwork_az_room_members
  where user_id = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd'::uuid
    and can_read and can_write;
  if owner_count <> 1 then raise exception 'AZ room owner permission missing'; end if;

  raise notice 'OK: AZ room permission table, RPC and owner seed verified.';
end $$;
