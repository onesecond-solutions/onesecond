-- CI 사후 검증 (🟢 읽기전용) — briefing_leaflets 쓰기 RLS에 파일럿 계정 허용 추가 마이그레이션
--   (db/migrations/2026-08-19_briefing_leaflets_pilot_write.sql) 적용 직후 실행.
--
-- 검증 목표:
--   1) briefing_leaflets INSERT/UPDATE/DELETE 정책 3개가 여전히 존재(개수 불변).
--   2) 세 정책의 정의(qual 또는 with_check)에 PILOT_ID(98c5f4f9...) uuid 리터럴이 포함됨
--      = OR 조건이 실제로 반영됐는지 확인.
--   3) storage.objects의 briefing_leaflets_storage_admin_* 정책 3개도 동일하게 확인.
--   4) select 계열 정책(anon/authenticated)은 이 마이그레이션이 건드리지 않았으므로 그대로 2개.
--
-- 방식: 카탈로그 조회(읽기전용). 조건 불충족 시 RAISE EXCEPTION
--   → psql(ON_ERROR_STOP=1) 종료코드!=0 → CI 가 FAIL 처리. DML/DDL 없음.
do $$
declare
  v_pilot_id text := '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';
  v_ntable_admin_pol int;
  v_ntable_pilot_pol int;
  v_nstorage_admin_pol int;
  v_nstorage_pilot_pol int;
  v_nselect_pol int;
begin
  -- ── briefing_leaflets INSERT/UPDATE/DELETE 정책 3개 존재 ───────────
  select count(*) into v_ntable_admin_pol from pg_policies
   where schemaname='public' and tablename='briefing_leaflets'
     and policyname in ('briefing_leaflets_admin_insert','briefing_leaflets_admin_update','briefing_leaflets_admin_delete');
  if v_ntable_admin_pol <> 3 then
    raise exception 'FAIL briefing_leaflets admin insert/update/delete 정책 개수=% (3 필요).', v_ntable_admin_pol;
  end if;

  -- ── 위 3개 정책 정의에 PILOT_ID 리터럴 포함 ─────────────────────────
  select count(*) into v_ntable_pilot_pol from pg_policies
   where schemaname='public' and tablename='briefing_leaflets'
     and policyname in ('briefing_leaflets_admin_insert','briefing_leaflets_admin_update','briefing_leaflets_admin_delete')
     and (coalesce(qual,'') like '%' || v_pilot_id || '%' or coalesce(with_check,'') like '%' || v_pilot_id || '%');
  if v_ntable_pilot_pol <> 3 then
    raise exception 'FAIL briefing_leaflets 정책 중 PILOT_ID 조건 포함=% (3 필요) — OR 조건 미반영.', v_ntable_pilot_pol;
  end if;

  -- ── storage.objects admin insert/update/delete 정책 3개 존재 ───────
  select count(*) into v_nstorage_admin_pol from pg_policies
   where schemaname='storage' and tablename='objects'
     and policyname in ('briefing_leaflets_storage_admin_insert','briefing_leaflets_storage_admin_update','briefing_leaflets_storage_admin_delete');
  if v_nstorage_admin_pol <> 3 then
    raise exception 'FAIL briefing_leaflets_storage_admin_* 정책 개수=% (3 필요).', v_nstorage_admin_pol;
  end if;

  select count(*) into v_nstorage_pilot_pol from pg_policies
   where schemaname='storage' and tablename='objects'
     and policyname in ('briefing_leaflets_storage_admin_insert','briefing_leaflets_storage_admin_update','briefing_leaflets_storage_admin_delete')
     and (coalesce(qual,'') like '%' || v_pilot_id || '%' or coalesce(with_check,'') like '%' || v_pilot_id || '%');
  if v_nstorage_pilot_pol <> 3 then
    raise exception 'FAIL briefing_leaflets_storage_admin_* 정책 중 PILOT_ID 조건 포함=% (3 필요) — OR 조건 미반영.', v_nstorage_pilot_pol;
  end if;

  -- ── select 계열 정책은 이 마이그레이션 범위 밖 — 그대로 2개인지만 확인 ──
  select count(*) into v_nselect_pol from pg_policies
   where schemaname='public' and tablename='briefing_leaflets'
     and policyname in ('briefing_leaflets_select_authenticated','briefing_leaflets_select_anon');
  if v_nselect_pol <> 2 then
    raise exception 'FAIL briefing_leaflets select 정책 개수=% (2 필요, 이번 마이그레이션이 건드리면 안 됨).', v_nselect_pol;
  end if;

  raise notice 'POSTVERIFY PASS: briefing_leaflets + storage.objects 쓰기 정책 6개 모두 PILOT_ID OR 조건 반영, select 정책 불변.';
end $$;
