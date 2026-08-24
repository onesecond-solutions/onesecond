-- CI 사후 검증 (🟢 읽기전용) — 소식지(newsletters) Storage 버킷 읽기 공개 전환 마이그레이션
--   (db/migrations/2026-08-25_newsletters_bucket_public.sql) 적용 직후 실행.
--
-- 검증 목표:
--   1) storage.buckets 'newsletters' 존재 + public=true.
--   2) storage.objects 정책 2개(newsletters_storage_select_anon·newsletters_storage_select_authenticated) 존재,
--      각각 cmd='SELECT' 이고 roles 에 해당 role 포함.
--   3) newsletters_storage_% 이름의 정책 중 SELECT 외(cmd<>'SELECT') 정책은 0개 — 쓰기 정책 신규 생성 없음 확인.
--
-- 방식: 카탈로그 조회(읽기전용). 조건 불충족 시 RAISE EXCEPTION
--   → psql(ON_ERROR_STOP=1) 종료코드!=0 → CI 가 FAIL 처리. DML/DDL 없음.
do $$
declare
  v_bucket_pub  boolean;
  v_nselectpol  int;
  v_nwritepol   int;
begin
  -- ── Storage 버킷: public=true ───────────────────────────────────
  select public into v_bucket_pub from storage.buckets where id='newsletters';
  if v_bucket_pub is null then
    raise exception 'FAIL storage.buckets newsletters 미생성.';
  end if;
  if not v_bucket_pub then
    raise exception 'FAIL storage.buckets newsletters public=false(공개 버킷이어야 함).';
  end if;

  -- ── Storage 정책: SELECT 2개(anon·authenticated) ─────────────────
  if not exists (
    select 1 from pg_policies
     where schemaname='storage' and tablename='objects'
       and policyname='newsletters_storage_select_anon'
       and cmd='SELECT' and 'anon' = ANY(roles)
  ) then
    raise exception 'FAIL newsletters_storage_select_anon(anon·SELECT) 정책 미적재.';
  end if;

  if not exists (
    select 1 from pg_policies
     where schemaname='storage' and tablename='objects'
       and policyname='newsletters_storage_select_authenticated'
       and cmd='SELECT' and 'authenticated' = ANY(roles)
  ) then
    raise exception 'FAIL newsletters_storage_select_authenticated(authenticated·SELECT) 정책 미적재.';
  end if;

  select count(*) into v_nselectpol from pg_policies
   where schemaname='storage' and tablename='objects'
     and policyname like 'newsletters_storage_%';
  if v_nselectpol <> 2 then
    raise exception 'FAIL newsletters_storage_% 정책 개수=% (2 필요).', v_nselectpol;
  end if;

  -- ── 방어: SELECT 외(쓰기) 정책이 이 이름 패턴으로 신규 생성되지 않았는지 ──
  select count(*) into v_nwritepol from pg_policies
   where schemaname='storage' and tablename='objects'
     and policyname like 'newsletters_storage_%' and cmd <> 'SELECT';
  if v_nwritepol <> 0 then
    raise exception 'FAIL newsletters_storage_% 쓰기 정책 존재(%). 이 마이그레이션은 SELECT만 추가해야 함.', v_nwritepol;
  end if;

  raise notice 'POSTVERIFY PASS: newsletters 버킷 public=true + storage SELECT 정책2(anon·authenticated) + 쓰기 정책 신규 생성 0.';
end $$;
