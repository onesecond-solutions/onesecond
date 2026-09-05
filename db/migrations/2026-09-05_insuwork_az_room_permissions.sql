-- 🟠 데이터변경(DDL) — 보험워크 에즈 시청방 멤버 권한
-- 대상: onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)

begin;

create table if not exists public.insuwork_az_room_members (
  user_id uuid primary key references public.users(id) on delete cascade,
  can_read boolean not null default true,
  can_write boolean not null default true,
  granted_by uuid references public.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.insuwork_az_room_members enable row level security;

drop policy if exists insuwork_az_room_members_select on public.insuwork_az_room_members;
create policy insuwork_az_room_members_select on public.insuwork_az_room_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or auth.uid() = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd'::uuid
  );

revoke insert, update, delete on public.insuwork_az_room_members from anon, authenticated;
grant select on public.insuwork_az_room_members to authenticated;

create or replace function public.can_access_insuwork_az_room()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.insuwork_az_room_members m
    where m.user_id = auth.uid()
      and m.can_read
      and m.can_write
  );
$$;

create or replace function public.set_insuwork_az_room_access(target_user_id uuid, enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd'::uuid then
    raise exception 'not authorized';
  end if;

  if not exists (select 1 from public.users u where u.id = target_user_id) then
    raise exception 'user not found';
  end if;

  if enabled then
    insert into public.insuwork_az_room_members (user_id, can_read, can_write, granted_by, granted_at, updated_at)
    values (target_user_id, true, true, auth.uid(), now(), now())
    on conflict (user_id) do update
      set can_read = true,
          can_write = true,
          granted_by = auth.uid(),
          updated_at = now();
  else
    delete from public.insuwork_az_room_members where user_id = target_user_id;
  end if;

  return enabled;
end;
$$;

revoke all on function public.can_access_insuwork_az_room() from public;
revoke all on function public.set_insuwork_az_room_access(uuid, boolean) from public;
grant execute on function public.can_access_insuwork_az_room() to authenticated;
grant execute on function public.set_insuwork_az_room_access(uuid, boolean) to authenticated;

insert into public.insuwork_az_room_members (user_id, can_read, can_write, granted_by)
select u.id, true, true, u.id
from public.users u
where u.id = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd'::uuid
on conflict (user_id) do update
  set can_read = true,
      can_write = true,
      updated_at = now();

commit;

-- DOWN / ROLLBACK (manual, reviewed):
--   begin;
--   drop function if exists public.set_insuwork_az_room_access(uuid, boolean);
--   drop function if exists public.can_access_insuwork_az_room();
--   drop table if exists public.insuwork_az_room_members;
--   commit;
