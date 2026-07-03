-- ============================================================================
-- 감사센터 최초 1회 보안 부트스트랩 (elevated 관리자 실행 · CI 아님) — INVOKER 모델
-- 함수=SECURITY INVOKER(호출자 admin 권한). fn_owner 역할 없음. bypassrls·service_role 0.
-- newsletters 기존 RLS 무변경(기존 admin 정책 그대로 통과). ops 테이블은 RLS admin 정책으로 일반 차단.
-- 단일 트랜잭션·오류 시 전체 롤백·비밀번호/연결문자열 불필요.
-- ⚠️ 실행 금지(독립 재검수 전). 대표 승인 1회 후 대시보드 SQL Editor에서 1회 실행.
-- 포함 X: newsletters 실제 UPDATE·status/RLS 변경·CI 역할·GitHub Actions·커스텀 역할.
-- ============================================================================
begin;

create extension if not exists pgcrypto;
create schema if not exists ops;

-- 설치 표시·버전
create table if not exists ops.audit_install (
  component text primary key, version text not null, installed_at timestamptz not null default now()
);

-- 데이터 테이블(ops)
create table if not exists ops.ac_nlstd_mapping (
  version text not null, from_value text not null, to_value text not null, active boolean not null default true,
  primary key (version, from_value)
);
create table if not exists ops.ac_nlstd_jobs (
  id uuid primary key default gen_random_uuid(), mapping_version text not null,
  status text not null default 'prepared' check (status in ('prepared','executed','rolled_back','failed')),
  target_count int not null default 0, changed_count int not null default 0,
  prepared_by uuid, prepared_at timestamptz not null default now(),
  approved_by uuid, approved_at timestamptz, rolled_back_at timestamptz,
  result text, fail_reason text, before_summary jsonb, after_summary jsonb
);
create table if not exists ops.ac_nlstd_job_items (
  job_id uuid not null references ops.ac_nlstd_jobs(id) on delete cascade,
  row_id uuid not null, old_company text not null, new_company text not null, old_status text not null,
  primary key (job_id, row_id)
);

-- RLS: 일반 사용자 차단(admin만). INSERT/UPDATE엔 WITH CHECK도 is_admin().
alter table ops.ac_nlstd_mapping   enable row level security;
alter table ops.ac_nlstd_jobs      enable row level security;
alter table ops.ac_nlstd_job_items enable row level security;
create policy ac_nlstd_mapping_adm   on ops.ac_nlstd_mapping   for all to authenticated using (is_admin()) with check (is_admin());
create policy ac_nlstd_jobs_adm      on ops.ac_nlstd_jobs      for all to authenticated using (is_admin()) with check (is_admin());
create policy ac_nlstd_job_items_adm on ops.ac_nlstd_job_items for all to authenticated using (is_admin()) with check (is_admin());

-- 스키마·테이블 최소 GRANT (INVOKER = 호출자 권한 필요). anon 차단, RLS가 admin 게이트.
revoke all on schema ops from public;
grant usage on schema ops to authenticated;
grant select on ops.ac_nlstd_mapping to authenticated;
grant select, insert, update on ops.ac_nlstd_jobs to authenticated;
grant select, insert on ops.ac_nlstd_job_items to authenticated;
-- ops.audit_install: authenticated GRANT 없음(RLS+미노출). ops 미노출(PostgREST exposed schemas에 ops 없음).

-- RPC 4개 = public · SECURITY INVOKER · search_path 고정 · 진입부 is_admin() 재검증
create or replace function public.ac_nlstd_prepare(p_version text)
returns uuid language plpgsql security invoker set search_path = public, ops as $$
declare v_job uuid; v_cnt int;
  v_personal uuid[] := array['28b9c9b7-6403-419c-b73d-c081ddac4903','856d7bda-f6ff-41a3-8e4c-9eb168632600']::uuid[];
begin
  if auth.uid() is null or not is_admin() then raise exception 'forbidden'; end if;
  if not exists (select 1 from ops.ac_nlstd_mapping where version=p_version and active) then raise exception 'unknown/inactive version: %', p_version; end if;
  create temporary table _nlstd_tmp on commit drop as
    select n.id row_id, n.company old_company, m.to_value new_company, n.status old_status
    from public.newsletters n join ops.ac_nlstd_mapping m on m.version=p_version and m.active and n.company=m.from_value
    where n.status='published' and n.id <> all(v_personal) and n.company is distinct from m.to_value;
  select count(*) into v_cnt from _nlstd_tmp;
  if v_cnt=0 then raise exception 'no target rows'; end if;
  if v_cnt>1000 then raise exception 'target % > 1000', v_cnt; end if;
  insert into ops.ac_nlstd_jobs(mapping_version,status,target_count,prepared_by,before_summary)
    values (p_version,'prepared',v_cnt,auth.uid(),
      (select jsonb_object_agg(old_company,c) from (select old_company,count(*) c from _nlstd_tmp group by old_company) s))
    returning id into v_job;
  insert into ops.ac_nlstd_job_items(job_id,row_id,old_company,new_company,old_status)
    select v_job,row_id,old_company,new_company,old_status from _nlstd_tmp;
  return v_job;
end $$;

create or replace function public.ac_nlstd_approve_execute(p_job_id uuid)
returns jsonb language plpgsql security invoker set search_path = public, ops as $$
declare v_status text; v_target int; v_mismatch int; v_changed int;
  v_personal uuid[] := array['28b9c9b7-6403-419c-b73d-c081ddac4903','856d7bda-f6ff-41a3-8e4c-9eb168632600']::uuid[];
begin
  if auth.uid() is null or not is_admin() then raise exception 'forbidden'; end if;
  select status,target_count into v_status,v_target from ops.ac_nlstd_jobs where id=p_job_id for update;
  if v_status is null then raise exception 'job not found'; end if;
  if v_status <> 'prepared' then raise exception 'not prepared (%)', v_status; end if;
  select count(*) into v_mismatch from ops.ac_nlstd_job_items ji
    left join public.newsletters n on n.id=ji.row_id and n.company=ji.old_company and n.status=ji.old_status and n.status='published'
    where ji.job_id=p_job_id and (n.id is null or ji.row_id = any(v_personal));
  if v_mismatch>0 then
    update ops.ac_nlstd_jobs set status='failed', approved_by=auth.uid(), approved_at=now(), changed_count=0,
      result='aborted', fail_reason=format('%s row(s) changed since preview', v_mismatch) where id=p_job_id;
    return jsonb_build_object('status','failed','mismatches',v_mismatch);
  end if;
  -- company 컬럼만 변경. 다른 컬럼 미접촉(본문 보장).
  update public.newsletters n set company=ji.new_company from ops.ac_nlstd_job_items ji
    where ji.job_id=p_job_id and n.id=ji.row_id and n.company=ji.old_company and n.status=ji.old_status and n.status='published';
  get diagnostics v_changed = row_count;
  if v_changed <> v_target then raise exception 'partial change (%/%)', v_changed, v_target; end if;
  update ops.ac_nlstd_jobs set status='executed', approved_by=auth.uid(), approved_at=now(), changed_count=v_changed, result='executed',
    after_summary=(select jsonb_object_agg(new_company,c) from (select new_company,count(*) c from ops.ac_nlstd_job_items where job_id=p_job_id group by new_company) s) where id=p_job_id;
  return jsonb_build_object('status','executed','changed',v_changed);
end $$;

create or replace function public.ac_nlstd_rollback(p_job_id uuid)
returns jsonb language plpgsql security invoker set search_path = public, ops as $$
declare v_status text; v_target int; v_mismatch int; v_changed int;
begin
  if auth.uid() is null or not is_admin() then raise exception 'forbidden'; end if;
  select status,target_count into v_status,v_target from ops.ac_nlstd_jobs where id=p_job_id for update;
  if v_status is null then raise exception 'job not found'; end if;
  if v_status <> 'executed' then raise exception 'not executed (%)', v_status; end if;
  select count(*) into v_mismatch from ops.ac_nlstd_job_items ji
    left join public.newsletters n on n.id=ji.row_id and n.company=ji.new_company where ji.job_id=p_job_id and n.id is null;
  if v_mismatch>0 then
    return jsonb_build_object('status','rollback_aborted','mismatches',v_mismatch,
      'changed_rows',(select jsonb_agg(ji.row_id) from ops.ac_nlstd_job_items ji join public.newsletters n on n.id=ji.row_id where ji.job_id=p_job_id and n.company<>ji.new_company));
  end if;
  update public.newsletters n set company=ji.old_company from ops.ac_nlstd_job_items ji
    where ji.job_id=p_job_id and n.id=ji.row_id and n.company=ji.new_company;
  get diagnostics v_changed = row_count;
  if v_changed <> v_target then raise exception 'partial rollback (%/%)', v_changed, v_target; end if;
  update ops.ac_nlstd_jobs set status='rolled_back', rolled_back_at=now(), result='rolled_back' where id=p_job_id;
  return jsonb_build_object('status','rolled_back','changed',v_changed);
end $$;

create or replace function public.ac_nlstd_get_job(p_job_id uuid default null)
returns jsonb language plpgsql security invoker set search_path = public, ops as $$
declare v jsonb;
begin
  if auth.uid() is null or not is_admin() then raise exception 'forbidden'; end if;
  if p_job_id is null then
    select coalesce(jsonb_agg(to_jsonb(j)),'[]'::jsonb) into v from (select * from ops.ac_nlstd_jobs order by prepared_at desc limit 50) j;
    return v;
  end if;
  select jsonb_build_object('job',to_jsonb(j),
    'items',(select coalesce(jsonb_agg(jsonb_build_object('row_id',ji.row_id,'old',ji.old_company,'new',ji.new_company)),'[]'::jsonb)
             from ops.ac_nlstd_job_items ji where ji.job_id=p_job_id)) into v
  from ops.ac_nlstd_jobs j where j.id=p_job_id;
  return coalesce(v,'null'::jsonb);
end $$;

-- 함수 실행 권한: PUBLIC 회수 → authenticated (내부 is_admin() 재검증이 실게이트)
revoke execute on function public.ac_nlstd_prepare(text)         from public;
revoke execute on function public.ac_nlstd_approve_execute(uuid) from public;
revoke execute on function public.ac_nlstd_rollback(uuid)        from public;
revoke execute on function public.ac_nlstd_get_job(uuid)         from public;
grant  execute on function public.ac_nlstd_prepare(text)         to authenticated;
grant  execute on function public.ac_nlstd_approve_execute(uuid) to authenticated;
grant  execute on function public.ac_nlstd_rollback(uuid)        to authenticated;
grant  execute on function public.ac_nlstd_get_job(uuid)         to authenticated;

-- 매핑 v1(검수 PASS 33)
insert into ops.ac_nlstd_mapping(version,from_value,to_value) values
 ('v1_2026_07','농협생명','NH농협생명'),('v1_2026_07','농협손보','NH농협손해보험'),('v1_2026_07','NH농협손보','NH농협손해보험'),
 ('v1_2026_07','DB손보','DB손해보험'),('v1_2026_07','KB손보','KB손해보험'),('v1_2026_07','라이나손보','라이나손해보험'),
 ('v1_2026_07','한화손보','한화손해보험'),('v1_2026_07','롯데손보','롯데손해보험'),('v1_2026_07','AIG손보','AIG손해보험'),
 ('v1_2026_07','메트라이프생명','메트라이프'),('v1_2026_07','IM라이프','iM라이프'),('v1_2026_07','IM','iM라이프'),
 ('v1_2026_07','iM라이프생명','iM라이프'),('v1_2026_07','아이엠','iM라이프'),('v1_2026_07','아이엠생명','iM라이프'),
 ('v1_2026_07','KB라이프생명','KB라이프'),('v1_2026_07','메리츠','메리츠화재'),('v1_2026_07','미래에셋','미래에셋생명'),
 ('v1_2026_07','미애에셋생명','미래에셋생명'),('v1_2026_07','KDB','KDB생명'),('v1_2026_07','KDB생명※','KDB생명'),
 ('v1_2026_07','ABL','ABL생명'),('v1_2026_07','AIA','AIA생명'),('v1_2026_07','교보','교보생명'),
 ('v1_2026_07','★_25.7월','DB손해보험'),('v1_2026_07','KB라이프소식지','KB라이프'),('v1_2026_07','KB손보_GA','KB손해보험'),
 ('v1_2026_07','농협손보2507GA소식지_심의필','NH농협손해보험'),('v1_2026_07','GA2505_메리츠GA5월소식지_작업중.pdf','메리츠화재'),
 ('v1_2026_07','미래에셋생명_상품_언더라이팅','미래에셋생명'),('v1_2026_07','미래에셋생명GA소식지2502.pdf','미래에셋생명'),
 ('v1_2026_07','흥국화재_2507_소식지.pdf','흥국화재'),('v1_2026_07','흥국화재상품판','흥국화재')
on conflict (version,from_value) do nothing;

insert into ops.audit_install(component,version) values ('nlstd_audit_center','v1_2026_07') on conflict (component) do update set version=excluded.version, installed_at=now();

commit;

-- 실행 후 자동 검증(읽기, RAISE 시 종료코드!=0):
do $$ declare n int; begin
  select count(*) into n from information_schema.tables where table_schema='ops' and table_name in ('ac_nlstd_mapping','ac_nlstd_jobs','ac_nlstd_job_items','audit_install'); if n<>4 then raise exception 'ops 테이블 4 아님(%)',n; end if;
  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='public' and p.proname like 'ac_nlstd_%'; if n<>4 then raise exception 'RPC 4 아님(%)',n; end if;
  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='public' and p.proname like 'ac_nlstd_%' and p.prosecdef; if n<>0 then raise exception 'SECURITY DEFINER 잔존(%) — INVOKER 여야',n; end if;
  select count(*) into n from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace where ns.nspname='public' and p.proname like 'ac_nlstd_%' and has_function_privilege('public',p.oid,'EXECUTE'); if n<>0 then raise exception 'PUBLIC EXECUTE 잔존(%)',n; end if;
  select count(*) into n from pg_class c join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='ops' and c.relname like 'ac_nlstd_%' and c.relrowsecurity; if n<>3 then raise exception 'ops RLS 미활성(%/3)',n; end if;
  select count(*) into n from pg_policies where schemaname='ops' and tablename like 'ac_nlstd_%' and (qual is null or with_check is null); if n<>0 then raise exception 'ops 정책 using/with_check 누락(%)',n; end if;
  select count(*) into n from ops.ac_nlstd_mapping where version='v1_2026_07' and active; if n<>33 then raise exception '매핑 33 아님(%)',n; end if;
  if not exists (select 1 from pg_roles where rolname='ac_nlstd_fn_owner') then raise notice 'fn_owner 부재 확인(정상)'; else raise exception 'ac_nlstd_fn_owner 잔존(제거돼야)'; end if;
  raise notice 'BOOTSTRAP VERIFY PASS: ops4·RPC4·INVOKER·PUBLIC회수·RLS+withcheck·매핑33·fn_owner없음.';
end $$;
