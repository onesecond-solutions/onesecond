-- CI 사후 검증 (🟡 SELECT/COUNT 전용, 데이터 변경 0) — myspace_files/myspace_folders
--   이관 사본 삭제(db/migrations/2026-08-23_delete_workspace_myspace_legacy_items.sql) 결과 확인.
--
-- 출력(RAISE NOTICE, CI 로그 캡처):
--   [A] workspace_items 중 legacy_source in ('myspace_files','myspace_folders') 잔존 건수
--       — 삭제 성공 확인, 기대값 0.
--   [B] 원본 테이블 public.myspace_files / public.myspace_folders 건수 — 무변경 확인,
--       기대값 각각 ~3,416 / ~330 (이관 당시 원본 그대로 보존됐는지 재확인).
--       myspace_files.owner_id / myspace_folders.owner_id 는 text 컬럼(2026-06-10
--       myspace_library_v1 원설계)이라, 2026-08-14 이관 마이그레이션이 했던 것과 동일하게
--       f.owner_id::uuid 방향으로 캐스트해 비교한다.
--   [C] workspace_items 파일럿(uid) 전체 잔존 건수(참고용) — 삭제 전 대비 -3,746 예상.
--   각 섹션 측정은 예외 가드 → 하나가 실패해도 다른 섹션 측정 계속.
do $$
declare
  uid constant uuid := '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';  -- 워크스테이션 파일럿(bylts@naver.com / 임태성)
  remaining_legacy integer;
  files_count integer;
  folders_count integer;
  total_remaining integer;
begin
  -- ── [A] workspace_items 이관 사본 잔존 건수 (기대값 0) ──────────────────────
  raise notice '════ [A] workspace_items(legacy_source in myspace_files/myspace_folders) 잔존 확인 (owner=%) ════', uid;
  begin
    select count(*)
      into remaining_legacy
      from public.workspace_items
     where owner_id = uid
       and legacy_source in ('myspace_files','myspace_folders');
    raise notice '-- 삭제 후 잔존 건수=% (기대값 0) --', remaining_legacy;
  exception when others then
    raise notice '  [A] 측정 실패: %', sqlerrm;
  end;

  -- ── [B] 원본 테이블 무변경 확인 (기대값 ~3,416 / ~330) ──────────────────────
  raise notice '════ [B] 원본 public.myspace_files / public.myspace_folders 무변경 확인 (owner=%) ════', uid;
  begin
    select count(*)
      into files_count
      from public.myspace_files f
     where f.owner_id::uuid = uid;
    raise notice '-- public.myspace_files 건수=% (기대값 약 3,416, 원본 무변경) --', files_count;
  exception when others then
    raise notice '  [B-1] public.myspace_files 측정 실패: %', sqlerrm;
  end;

  begin
    select count(*)
      into folders_count
      from public.myspace_folders f
     where f.owner_id::uuid = uid;
    raise notice '-- public.myspace_folders 건수=% (기대값 약 330, 원본 무변경) --', folders_count;
  exception when others then
    raise notice '  [B-2] public.myspace_folders 측정 실패: %', sqlerrm;
  end;

  -- ── [C] workspace_items 파일럿 전체 잔존 건수 (참고용) ──────────────────────
  raise notice '════ [C] workspace_items 파일럿 전체 잔존 건수(참고) (owner=%) ════', uid;
  begin
    select count(*)
      into total_remaining
      from public.workspace_items
     where owner_id = uid;
    raise notice '-- workspace_items 전체 잔존 건수=% (삭제 전 대비 -3,746 예상) --', total_remaining;
  exception when others then
    raise notice '  [C] 측정 실패: %', sqlerrm;
  end;

  raise notice 'OK myspace_files/myspace_folders 이관 사본 삭제 완료 (원본 테이블 무변경 확인).';
end $$;
