-- CI 사후 검증 (🟢 읽기전용) — 리플렛 캘린더 원장 테이블 + 공개 Storage 버킷 신설 마이그레이션
--   (db/migrations/2026-08-18_briefing_leaflets_schema.sql) 적용 직후 실행.
--
-- 검증 목표:
--   1) public.briefing_leaflets 테이블 존재.
--   2) 핵심 컬럼(owner_id·file_type·storage_path·received_date·deleted_at) 존재.
--   3) RLS 활성.
--   4) 정책 5개(select_authenticated·select_anon + admin insert/update/delete) 존재.
--   5) storage.buckets 'briefing-leaflets' 존재 + public=true.
--   6) storage.objects 정책 5개(briefing_leaflets_storage_%) 존재.
--
-- 방식: 카탈로그 조회(읽기전용). 조건 불충족 시 RAISE EXCEPTION
--   → psql(ON_ERROR_STOP=1) 종료코드!=0 → CI 가 FAIL 처리. DML/DDL 없음.
do $$
declare
  v_cols       text[] := array['owner_id','file_type','storage_path','received_date','deleted_at'];
  v_col        text;
  v_rls        boolean;
  v_npol       int;
  v_bucket_pub boolean;
  v_nstoragepol int;
begin
  -- ── 테이블 존재 ─────────────────────────────────────────────────
  if to_regclass('public.briefing_leaflets') is null then
    raise exception 'FAIL public.briefing_leaflets 테이블 미생성.';
  end if;

  -- ── 핵심 컬럼 존재 ──────────────────────────────────────────────
  foreach v_col in array v_cols loop
    if not exists (
      select 1 from information_schema.columns c
       where c.table_schema='public' and c.table_name='briefing_leaflets'
         and c.column_name=v_col
    ) then
      raise exception 'FAIL briefing_leaflets.% 컬럼 미적재.', v_col;
    end if;
  end loop;

  -- ── RLS 활성 ────────────────────────────────────────────────────
  select relrowsecurity into v_rls from pg_class where oid='public.briefing_leaflets'::regclass;
  if not v_rls then
    raise exception 'FAIL briefing_leaflets RLS 미활성.';
  end if;

  -- ── 정책 5개(select_authenticated·select_anon·admin insert/update/delete) ──
  select count(*) into v_npol from pg_policies
   where schemaname='public' and tablename='briefing_leaflets';
  if v_npol <> 5 then
    raise exception 'FAIL briefing_leaflets 정책 개수=% (5 필요).', v_npol;
  end if;

  if not exists (
    select 1 from pg_policies
     where schemaname='public' and tablename='briefing_leaflets'
       and policyname='briefing_leaflets_select_anon'
       and cmd='SELECT' and 'anon' = ANY(roles)
  ) then
    raise exception 'FAIL briefing_leaflets_select_anon(anon·SELECT) 정책 미적재.';
  end if;

  -- ── Storage 버킷: public=true ───────────────────────────────────
  select public into v_bucket_pub from storage.buckets where id='briefing-leaflets';
  if v_bucket_pub is null then
    raise exception 'FAIL storage.buckets briefing-leaflets 미생성.';
  end if;
  if not v_bucket_pub then
    raise exception 'FAIL storage.buckets briefing-leaflets public=false(공개 버킷이어야 함).';
  end if;

  -- ── Storage 정책 5개 ────────────────────────────────────────────
  select count(*) into v_nstoragepol from pg_policies
   where schemaname='storage' and tablename='objects'
     and policyname like 'briefing_leaflets_storage_%';
  if v_nstoragepol <> 5 then
    raise exception 'FAIL briefing_leaflets_storage_* 정책 개수=% (5 필요).', v_nstoragepol;
  end if;

  raise notice 'POSTVERIFY PASS: briefing_leaflets 테이블 + 핵심컬럼5 + RLS on + 정책5 + 공개버킷 + storage정책5 정합.';
end $$;
