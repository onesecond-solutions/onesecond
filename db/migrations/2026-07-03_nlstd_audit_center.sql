-- ============================================================================
-- 운영 감사센터 1차 — 소식지(newsletters) 회사명 표준화 전용 제한형 실행 경로
-- 원칙: service_role 0 · 범용 SQL창 0 · company 컬럼만 · 검수 매핑 버전만 ·
--       작업별 백업/감사/롤백 · 서버 단일 트랜잭션 · 일반 사용자 차단(admin 전용)
-- ⚠️ 실행 금지(설계 검수용). 안전 실행 경로 확정 후 1회 배포. 실행 0.
-- 대상 확정 규칙: status='published' 행만 · 개인문서 2건 ID 추가 제외.
-- ============================================================================
begin;

-- ── 1) 테이블 3개 (감사 요약은 ac_nlstd_jobs 내부, 별도 범용 감사 테이블 없음) ──
create table if not exists public.ac_nlstd_mapping (
  version    text    not null,
  from_value text    not null,
  to_value   text    not null,
  active     boolean not null default true,
  primary key (version, from_value)
);

create table if not exists public.ac_nlstd_jobs (
  id             uuid primary key default gen_random_uuid(),
  mapping_version text not null,
  status         text not null default 'prepared'
                 check (status in ('prepared','executed','rolled_back','failed')),
  target_count   int  not null default 0,
  changed_count  int  not null default 0,
  prepared_by    uuid,
  prepared_at    timestamptz not null default now(),
  approved_by    uuid,
  approved_at    timestamptz,
  rolled_back_at timestamptz,
  result         text,
  fail_reason    text,
  before_summary jsonb,   -- 회사별 전 건수 요약
  after_summary  jsonb    -- 회사별 후 건수 요약  (개인정보·full_text·원문 미기록)
);

create table if not exists public.ac_nlstd_job_items (
  job_id      uuid not null references public.ac_nlstd_jobs(id) on delete cascade,
  row_id      uuid not null,          -- newsletters.id
  old_company text not null,
  new_company text not null,
  old_status  text not null,          -- prepare 당시 status(= 'published')
  primary key (job_id, row_id)
);

-- ── 2) RLS: admin SELECT만, 직접 쓰기 정책 0 (RPC로만 변경) ──
alter table public.ac_nlstd_mapping   enable row level security;
alter table public.ac_nlstd_jobs      enable row level security;
alter table public.ac_nlstd_job_items enable row level security;
create policy ac_nlstd_mapping_sel   on public.ac_nlstd_mapping   for select to authenticated using (is_admin());
create policy ac_nlstd_jobs_sel      on public.ac_nlstd_jobs      for select to authenticated using (is_admin());
create policy ac_nlstd_job_items_sel on public.ac_nlstd_job_items for select to authenticated using (is_admin());

-- ── 3) 최소권한 함수 소유자 역할 (슈퍼유저 아님, company 컬럼만 UPDATE 허용) ──
do $$ begin
  if not exists (select 1 from pg_roles where rolname='ac_nlstd_fn_owner') then
    create role ac_nlstd_fn_owner nologin;
  end if;
end $$;
grant usage on schema public to ac_nlstd_fn_owner;
grant select on public.newsletters         to ac_nlstd_fn_owner;
grant update (company) on public.newsletters to ac_nlstd_fn_owner;   -- ★ company 컬럼만
grant select, insert, update on public.ac_nlstd_jobs      to ac_nlstd_fn_owner;
grant select, insert         on public.ac_nlstd_job_items to ac_nlstd_fn_owner;
grant select on public.ac_nlstd_mapping    to ac_nlstd_fn_owner;
grant execute on function public.is_admin() to ac_nlstd_fn_owner;

-- ── 4) 상수: 개인문서 2건(1차 추가 방어). 핵심 방어는 status='published' ──
-- (함수 내부 배열로 하드코딩 유지)

-- ── 5) RPC prepare: 변경안·대상행 생성 (원본 변경 0) ──
create or replace function public.ac_nlstd_prepare(p_version text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_job uuid; v_cnt int;
  v_personal uuid[] := array['28b9c9b7-6403-419c-b73d-c081ddac4903',
                             '856d7bda-f6ff-41a3-8e4c-9eb168632600']::uuid[];
begin
  if auth.uid() is null or not is_admin() then raise exception 'forbidden'; end if;
  if not exists (select 1 from ac_nlstd_mapping where version=p_version and active) then
    raise exception 'unknown or inactive mapping version: %', p_version;
  end if;

  create temporary table _nlstd_tmp on commit drop as
  select n.id as row_id, n.company as old_company, m.to_value as new_company, n.status as old_status
  from public.newsletters n
  join public.ac_nlstd_mapping m
    on m.version=p_version and m.active and n.company = m.from_value
  where n.status = 'published'                 -- ★ published 행만
    and n.id <> all(v_personal)                -- 개인문서 추가 제외
    and n.company is distinct from m.to_value;  -- 실제 변경분만

  select count(*) into v_cnt from _nlstd_tmp;
  if v_cnt = 0    then raise exception 'no target rows for version %', p_version; end if;
  if v_cnt > 1000 then raise exception 'target rows % exceed limit 1000', v_cnt; end if;

  insert into ac_nlstd_jobs(mapping_version,status,target_count,prepared_by,before_summary)
  values (p_version,'prepared',v_cnt,auth.uid(),
          (select jsonb_object_agg(old_company,c) from
             (select old_company,count(*) c from _nlstd_tmp group by old_company) s))
  returning id into v_job;

  insert into ac_nlstd_job_items(job_id,row_id,old_company,new_company,old_status)
  select v_job,row_id,old_company,new_company,old_status from _nlstd_tmp;

  return v_job;
end $$;

-- ── 6) RPC approve_execute: admin 승인+실행 단일 트랜잭션 ──
--   불변성 검증(company·status=published) → 불일치 1건이라도 있으면 변경 0 + failed 기록(정상 반환)
--   전부 일치 → company만 UPDATE → 변경수<>대상수면 예외(전체 롤백, job은 prepared 유지)
create or replace function public.ac_nlstd_approve_execute(p_job_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_status text; v_target int; v_mismatch int; v_changed int;
  v_personal uuid[] := array['28b9c9b7-6403-419c-b73d-c081ddac4903',
                             '856d7bda-f6ff-41a3-8e4c-9eb168632600']::uuid[];
begin
  if auth.uid() is null or not is_admin() then raise exception 'forbidden'; end if;
  select status,target_count into v_status,v_target from ac_nlstd_jobs where id=p_job_id for update;
  if v_status is null      then raise exception 'job not found'; end if;
  if v_status <> 'prepared' then raise exception 'job not in prepared state (%)', v_status; end if;

  -- 불변성 검증 (UPDATE 전) : old_company·old_status·현재 published·개인문서 아님
  select count(*) into v_mismatch
  from ac_nlstd_job_items ji
  left join public.newsletters n
    on n.id=ji.row_id and n.company=ji.old_company
   and n.status=ji.old_status and n.status='published'
  where ji.job_id=p_job_id and (n.id is null or ji.row_id = any(v_personal));

  if v_mismatch > 0 then
    -- 예상 가능한 검증 실패: 원본 변경 없이 failed 기록 후 정상 반환(커밋)
    update ac_nlstd_jobs set status='failed', approved_by=auth.uid(), approved_at=now(),
      changed_count=0, result='aborted',
      fail_reason=format('%s row(s) changed since preview', v_mismatch)
     where id=p_job_id;
    return jsonb_build_object('status','failed','mismatches',v_mismatch);
  end if;

  update public.newsletters n set company=ji.new_company
  from ac_nlstd_job_items ji
  where ji.job_id=p_job_id and n.id=ji.row_id
    and n.company=ji.old_company and n.status=ji.old_status and n.status='published';
  get diagnostics v_changed = row_count;

  if v_changed <> v_target then
    raise exception 'partial change (%/%) — abort', v_changed, v_target;  -- 전체 롤백
  end if;

  update ac_nlstd_jobs set status='executed', approved_by=auth.uid(), approved_at=now(),
    changed_count=v_changed, result='executed',
    after_summary=(select jsonb_object_agg(new_company,c) from
      (select new_company,count(*) c from ac_nlstd_job_items where job_id=p_job_id group by new_company) s)
   where id=p_job_id;

  return jsonb_build_object('status','executed','changed',v_changed);
end $$;

-- ── 7) RPC rollback: admin만 · executed만 · 전부 일치 시 전체 롤백/한 건이라도 불일치면 중단 ──
create or replace function public.ac_nlstd_rollback(p_job_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_status text; v_target int; v_mismatch int; v_changed int;
begin
  if auth.uid() is null or not is_admin() then raise exception 'forbidden'; end if;
  select status,target_count into v_status,v_target from ac_nlstd_jobs where id=p_job_id for update;
  if v_status is null       then raise exception 'job not found'; end if;
  if v_status <> 'executed' then raise exception 'job not executed (%)', v_status; end if;

  select count(*) into v_mismatch
  from ac_nlstd_job_items ji
  left join public.newsletters n on n.id=ji.row_id and n.company=ji.new_company
  where ji.job_id=p_job_id and n.id is null;

  if v_mismatch > 0 then   -- 이후 다른 작업이 바꾼 값 덮어쓰기 금지 → 전체 중단
    return jsonb_build_object('status','rollback_aborted','mismatches',v_mismatch,
      'changed_rows',(select jsonb_agg(ji.row_id) from ac_nlstd_job_items ji
        join public.newsletters n on n.id=ji.row_id
        where ji.job_id=p_job_id and n.company<>ji.new_company));
  end if;

  update public.newsletters n set company=ji.old_company
  from ac_nlstd_job_items ji
  where ji.job_id=p_job_id and n.id=ji.row_id and n.company=ji.new_company;
  get diagnostics v_changed = row_count;
  if v_changed <> v_target then raise exception 'partial rollback (%/%)', v_changed, v_target; end if;

  update ac_nlstd_jobs set status='rolled_back', rolled_back_at=now(), result='rolled_back'
   where id=p_job_id;
  return jsonb_build_object('status','rolled_back','changed',v_changed);
end $$;

-- ── 8) RPC get_job: 미리보기·결과·감사 조회(읽기). null이면 최근 목록 ──
create or replace function public.ac_nlstd_get_job(p_job_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if auth.uid() is null or not is_admin() then raise exception 'forbidden'; end if;
  if p_job_id is null then
    select coalesce(jsonb_agg(to_jsonb(j)),'[]'::jsonb) into v
    from (select * from ac_nlstd_jobs order by prepared_at desc limit 50) j;
    return v;
  end if;
  select jsonb_build_object('job',to_jsonb(j),
    'items',(select coalesce(jsonb_agg(jsonb_build_object(
        'row_id',ji.row_id,'old',ji.old_company,'new',ji.new_company)),'[]'::jsonb)
      from ac_nlstd_job_items ji where ji.job_id=p_job_id)) into v
  from ac_nlstd_jobs j where j.id=p_job_id;
  return coalesce(v,'null'::jsonb);
end $$;

-- ── 9) 함수 소유자·실행 권한 (PUBLIC 회수 → authenticated에만 부여, 내부 is_admin 재검증) ──
alter function public.ac_nlstd_prepare(text)        owner to ac_nlstd_fn_owner;
alter function public.ac_nlstd_approve_execute(uuid) owner to ac_nlstd_fn_owner;
alter function public.ac_nlstd_rollback(uuid)        owner to ac_nlstd_fn_owner;
alter function public.ac_nlstd_get_job(uuid)         owner to ac_nlstd_fn_owner;
revoke execute on function public.ac_nlstd_prepare(text)         from public;
revoke execute on function public.ac_nlstd_approve_execute(uuid) from public;
revoke execute on function public.ac_nlstd_rollback(uuid)        from public;
revoke execute on function public.ac_nlstd_get_job(uuid)         from public;
grant  execute on function public.ac_nlstd_prepare(text)         to authenticated;
grant  execute on function public.ac_nlstd_approve_execute(uuid) to authenticated;
grant  execute on function public.ac_nlstd_rollback(uuid)        to authenticated;
grant  execute on function public.ac_nlstd_get_job(uuid)         to authenticated;

-- ── 10) v1 매핑 시드 (검수 완료·PASS 분만. 미상 by-ID·하나/현대/MG·보류 제외) ──
insert into public.ac_nlstd_mapping(version,from_value,to_value) values
 ('v1_2026_07','농협생명','NH농협생명'),
 ('v1_2026_07','농협손보','NH농협손해보험'),
 ('v1_2026_07','NH농협손보','NH농협손해보험'),
 ('v1_2026_07','DB손보','DB손해보험'),
 ('v1_2026_07','KB손보','KB손해보험'),
 ('v1_2026_07','라이나손보','라이나손해보험'),
 ('v1_2026_07','한화손보','한화손해보험'),
 ('v1_2026_07','롯데손보','롯데손해보험'),
 ('v1_2026_07','AIG손보','AIG손해보험'),
 ('v1_2026_07','메트라이프생명','메트라이프'),
 ('v1_2026_07','IM라이프','iM라이프'),
 ('v1_2026_07','IM','iM라이프'),
 ('v1_2026_07','iM라이프생명','iM라이프'),
 ('v1_2026_07','아이엠','iM라이프'),
 ('v1_2026_07','아이엠생명','iM라이프'),
 ('v1_2026_07','KB라이프생명','KB라이프'),
 ('v1_2026_07','메리츠','메리츠화재'),
 ('v1_2026_07','미래에셋','미래에셋생명'),
 ('v1_2026_07','미애에셋생명','미래에셋생명'),
 ('v1_2026_07','KDB','KDB생명'),
 ('v1_2026_07','KDB생명※','KDB생명'),
 ('v1_2026_07','ABL','ABL생명'),
 ('v1_2026_07','AIA','AIA생명'),
 ('v1_2026_07','교보','교보생명'),
 ('v1_2026_07','★_25.7월','DB손해보험'),
 ('v1_2026_07','KB라이프소식지','KB라이프'),
 ('v1_2026_07','KB손보_GA','KB손해보험'),
 ('v1_2026_07','농협손보2507GA소식지_심의필','NH농협손해보험'),
 ('v1_2026_07','GA2505_메리츠GA5월소식지_작업중.pdf','메리츠화재'),
 ('v1_2026_07','미래에셋생명_상품_언더라이팅','미래에셋생명'),
 ('v1_2026_07','미래에셋생명GA소식지2502.pdf','미래에셋생명'),
 ('v1_2026_07','흥국화재_2507_소식지.pdf','흥국화재'),
 ('v1_2026_07','흥국화재상품판','흥국화재')
on conflict (version,from_value) do nothing;

commit;

-- 배포 후 셀프검증(읽기, admin 세션): select public.ac_nlstd_prepare('v1_2026_07');  -- job_id
--   → get_job(job_id)로 대상·건수 확인 → 콘솔에서 [승인하고 실행].
--
-- ============================================================================
-- ROLLBACK (down) — 배포 실패/철회 시. newsletters 데이터 무변경(인프라+매핑시드만) → 데이터 손실 0.
--   begin;
--   drop function if exists public.ac_nlstd_prepare(text);
--   drop function if exists public.ac_nlstd_approve_execute(uuid);
--   drop function if exists public.ac_nlstd_rollback(uuid);
--   drop function if exists public.ac_nlstd_get_job(uuid);
--   drop table if exists public.ac_nlstd_job_items;
--   drop table if exists public.ac_nlstd_jobs;
--   drop table if exists public.ac_nlstd_mapping;
--   revoke all on public.newsletters from ac_nlstd_fn_owner;
--   revoke all on schema public from ac_nlstd_fn_owner;
--   drop role if exists ac_nlstd_fn_owner;
--   commit;
-- ============================================================================
