-- ============================================================================
-- 잔여 회사명 정제 — 감사센터 내 1회성 제한 admin RPC (INVOKER·is_admin·service_role 0)
-- 이번 작업 키(RESID_FIX_20260703)만 인식. 범용 편집 아님. company·insurance_type만.
-- 미리보기(읽기)→적용(현재값 재검증·스냅샷·id 롤백)→검증. 완료 후 DOWN으로 제거.
-- ⚠️ 미실행. 개인문서 2건 강제 제외. 임의 값 입력 불가(수정값 코드 고정).
-- ============================================================================
begin;
create schema if not exists ops;
create table if not exists ops.resid_fix_log (
  job text not null, id uuid not null, source_filename text,
  old_company text, old_type text, new_company text, new_type text,
  applied_at timestamptz not null default now(), primary key (job, id)
);
alter table ops.resid_fix_log enable row level security;
revoke all on schema ops from public;
create policy resid_log_adm on ops.resid_fix_log for all to authenticated using (is_admin()) with check (is_admin());
grant usage on schema ops to authenticated;
grant select, insert, update on ops.resid_fix_log to authenticated;

-- 판정(코드 고정): 대상 행 + 변경전후 + 근거 + fix/hold. 개인문서 제외. 라이나·소식지·파일명·근거불명=hold.
create or replace function public.resid_fix_targets()
returns table(id uuid, source_filename text, cur_company text, cur_type text,
              new_company text, new_type text, evidence text, action text)
language sql stable security invoker set search_path = public as $$
  select n.id, n.source_filename, n.company, n.insurance_type,
    case
      when n.company in ('MG손보','MG손해보험','MG손해보험GA소식지') then 'MG손해보험'
      when n.company='미상' and n.source_filename ilike '%IBK%' then 'IBK연금보험'
      when n.company='미상' and n.source_filename ilike '%상품별알릴의무%' and coalesce(n.full_text,'') ilike '%신한라이프%' then '신한라이프'
    end,
    case
      when n.company in ('MG손보','MG손해보험','MG손해보험GA소식지') then '손해'
      when n.company='미상' and n.source_filename ilike '%IBK%' then '생명'
      when n.company='미상' and n.source_filename ilike '%상품별알릴의무%' and coalesce(n.full_text,'') ilike '%신한라이프%' then '생명'
    end,
    case
      when n.company in ('MG손보','MG손해보험','MG손해보험GA소식지') then 'company=MG* 잔여값'
      when n.company='미상' and n.source_filename ilike '%IBK%' then '파일태그 [IBK]'
      when n.company='미상' and n.source_filename ilike '%상품별알릴의무%' and coalesce(n.full_text,'') ilike '%신한라이프%' then '본문 신한라이프(직접근거)'
      when n.company='미상' and n.source_filename ilike '%상품별알릴의무%' then 'HOLD: 신한라이프 본문근거 없음'
      else 'HOLD: 자동수정 제외값'
    end,
    case
      -- MG: 표준명이어도 type 미확정 시만 대상(company만 표준이고 type 이미 손해면 hold)
      when n.company in ('MG손보','MG손해보험','MG손해보험GA소식지')
           and not (n.company='MG손해보험' and n.insurance_type='손해') then 'fix'
      when n.company='미상' and n.source_filename ilike '%IBK%' then 'fix'
      when n.company='미상' and n.source_filename ilike '%상품별알릴의무%' and coalesce(n.full_text,'') ilike '%신한라이프%' then 'fix'
      else 'hold'
    end
  from public.newsletters n
  where n.id <> all(array['28b9c9b7-6403-419c-b73d-c081ddac4903','856d7bda-f6ff-41a3-8e4c-9eb168632600']::uuid[])
    and ( n.company in ('MG손보','MG손해보험','MG손해보험GA소식지')
       or (n.company='미상' and (n.source_filename ilike '%IBK%' or n.source_filename ilike '%상품별알릴의무%'))
       or n.company in ('라이나','소식지') or n.company ilike '%.pdf' )
$$;

-- 미리보기(읽기): admin만. fix/hold 전건.
create or replace function public.resid_fix_preview()
returns jsonb language plpgsql stable security invoker set search_path = public as $$
begin
  if auth.uid() is null or not is_admin() then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(t) order by t.action, t.new_company),'[]'::jsonb) from public.resid_fix_targets() t);
end $$;

-- 적용: admin만. fix 행만. 실행 직전 현재값 재검증(달라졌으면 그 행 skip). 스냅샷 저장.
create or replace function public.resid_fix_apply()
returns jsonb language plpgsql security invoker set search_path = public as $$
declare r record; ap int:=0; sk int:=0;
begin
  if auth.uid() is null or not is_admin() then raise exception 'forbidden'; end if;
  for r in select * from public.resid_fix_targets() where action='fix' loop
    -- 실행 직전 현재값 재검증: company가 preview 시점(cur_company) 그대로일 때만 적용(변경분 자동 skip)
    if exists (select 1 from public.newsletters n where n.id=r.id and n.company=r.cur_company) then
      insert into ops.resid_fix_log(job,id,source_filename,old_company,old_type,new_company,new_type)
        values ('RESID_FIX_20260703', r.id, r.source_filename, r.cur_company, r.cur_type, r.new_company, r.new_type)
        on conflict (job,id) do nothing;
      update public.newsletters set company=r.new_company, insurance_type=r.new_type where id=r.id and company=r.cur_company;
      ap:=ap+1;
    else sk:=sk+1; end if;
  end loop;
  return jsonb_build_object('applied',ap,'skipped',sk);
end $$;

-- 롤백: admin만. 스냅샷 id 기반 복원.
create or replace function public.resid_fix_rollback()
returns jsonb language plpgsql security invoker set search_path = public as $$
declare rb int:=0;
begin
  if auth.uid() is null or not is_admin() then raise exception 'forbidden'; end if;
  update public.newsletters n set company=l.old_company, insurance_type=l.old_type
    from ops.resid_fix_log l where l.job='RESID_FIX_20260703' and n.id=l.id;
  get diagnostics rb = row_count;
  return jsonb_build_object('rolled_back',rb);
end $$;

revoke execute on function public.resid_fix_preview(), public.resid_fix_apply(), public.resid_fix_rollback(), public.resid_fix_targets() from public;
grant execute on function public.resid_fix_preview(), public.resid_fix_apply(), public.resid_fix_rollback(), public.resid_fix_targets() to authenticated;
commit;

-- DOWN (작업 완료 후 기능 제거):
-- begin;
--   drop function if exists public.resid_fix_rollback(); drop function if exists public.resid_fix_apply();
--   drop function if exists public.resid_fix_preview(); drop function if exists public.resid_fix_targets();
--   -- 로그 보존 원하면 유지, 아니면: drop table if exists ops.resid_fix_log;
-- commit;
