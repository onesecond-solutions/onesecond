-- ============================================================================
-- 잔여 회사명 정제 — 1회 고정 작업 (감사센터 방식 재사용 · admin 실행 · 완료 후 제거)
-- 대상: 근거 확정 문서만(MG*·미상 IBK·미상 신한라이프). company·insurance_type 2컬럼만.
-- 정상 데이터 무접촉(잔여값 가드). 미리보기→적용→검증→롤백. service_role 불필요.
-- 라이나·소식지·파일명형 값 = 이번 미포함(hold, 라이브 원문 확정 시 별도).
-- ⚠️ 미실행. 개인문서 2건 제외.
-- ============================================================================

-- ── STEP 0: 롤백 스냅샷 로그(1회 작업 전용, 완료 후 drop) + 대상 확정 ──────────
begin;
create schema if not exists ops;
create table if not exists ops.resid_fix_20260703 (
  id uuid primary key, source_filename text,
  old_company text, old_type text, new_company text, new_type text, applied boolean not null default false
);
insert into ops.resid_fix_20260703(id,source_filename,old_company,old_type,new_company,new_type)
select n.id, n.source_filename, n.company, n.insurance_type,
  case
    when n.company in ('MG손보','MG손해보험','MG손해보험GA소식지') then 'MG손해보험'
    when n.company='미상' and n.source_filename ilike '%IBK%'          then 'IBK연금보험'
    when n.company='미상' and n.source_filename ilike '%상품별알릴의무%' then '신한라이프'
  end,
  case
    when n.company in ('MG손보','MG손해보험','MG손해보험GA소식지') then '손해'
    when n.company='미상' and n.source_filename ilike '%IBK%'          then '생명'
    when n.company='미상' and n.source_filename ilike '%상품별알릴의무%' then '생명'
  end
from public.newsletters n
where n.id <> all(array['28b9c9b7-6403-419c-b73d-c081ddac4903','856d7bda-f6ff-41a3-8e4c-9eb168632600']::uuid[])
  and ( n.company in ('MG손보','MG손해보험','MG손해보험GA소식지')
     or (n.company='미상' and (n.source_filename ilike '%IBK%' or n.source_filename ilike '%상품별알릴의무%')) )
on conflict (id) do nothing;
-- 근거 확정 안 된 행 제거(new_company null = hold)
delete from ops.resid_fix_20260703 where new_company is null;
commit;

-- ── STEP 1: 미리보기 (읽기 · admin이 눈으로 확인) ──────────────────────────────
-- select source_filename, old_company||'/'||coalesce(old_type,'∅') as 현재, new_company||'/'||new_type as 변경후 from ops.resid_fix_20260703 order by new_company;
-- select new_company, new_type, count(*) from ops.resid_fix_20260703 group by 1,2 order by 1;   -- 예상: MG손해보험/손해 5, IBK연금보험/생명 4, 신한라이프/생명 1

-- ── STEP 2: 적용 (승인 후 · 잔여값 가드 · id 스코프) ───────────────────────────
-- begin;
--   update public.newsletters n set company=l.new_company, insurance_type=l.new_type
--   from ops.resid_fix_20260703 l
--   where n.id=l.id and n.company in ('MG손보','MG손해보험','MG손해보험GA소식지','미상');  -- 정상데이터면 매치 0
--   update ops.resid_fix_20260703 set applied=true;
-- commit;

-- ── STEP 3: 검증 ──────────────────────────────────────────────────────────────
-- select n.company, n.insurance_type, count(*) from public.newsletters n join ops.resid_fix_20260703 l on l.id=n.id group by 1,2;
-- select count(*) from public.newsletters where company in ('MG손보','MG손해보험','MG손해보험GA소식지') or (company='미상' and (source_filename ilike '%IBK%' or source_filename ilike '%상품별알릴의무%'));  -- 0 이어야

-- ── ROLLBACK (문제 시) ────────────────────────────────────────────────────────
-- begin;
--   update public.newsletters n set company=l.old_company, insurance_type=l.old_type
--   from ops.resid_fix_20260703 l where n.id=l.id;
-- commit;

-- ── DOWN (작업 완료 후 신규 흔적 제거) ────────────────────────────────────────
-- drop table if exists ops.resid_fix_20260703;  -- ops 스키마에 다른 객체 없으면: drop schema if exists ops;
