-- CI 사후 진단 (🟢 읽기전용, 데이터·스키마 변경 0) — myspace_files 이관분 파일 인벤토리
--   (db/migrations/2026-08-23_diag_myspace_files_inventory_readonly.sql no-op 동반).
--
-- 출력(RAISE NOTICE, CI 로그 캡처):
--   [A] 확장자별 전체 분포 — 건수 / 최초·최근 업로드일 / 합계 용량.
--       이미지·문서·스프레드시트 등 구성비와 "2019년부터"라는 날짜 범위 주장을
--       실제 created_at 범위로 교차 확인.
--   [B] 스프레드시트류(xlsx/xls/csv 또는 관련 mime_type)만 골라 개별 나열 —
--       title(원본 파일명)·extension·용량·업로드일·활성/휴지통 상태.
--       총 건수를 먼저 별도로 raise notice 한 뒤 최대 300건만 나열(로그 폭주 방지).
--   title/extension/file_size/created_at/deleted_at 외 컬럼(body, legacy_payload
--   전체 등)은 조회하지 않음 — 파일명 자체 외 추가 개인정보 노출 없음.
--   각 섹션 측정은 예외 가드 → 하나가 실패해도 다른 섹션 측정 계속.
do $$
declare
  r record;
  uid constant uuid := '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';  -- 워크스테이션 파일럿(bylts@naver.com / 임태성)
  total_spreadsheets integer;
begin
  -- ── [A] 확장자별 전체 분포 (건수 / 최초·최근 업로드일 / 합계 용량) ──────────
  raise notice '════ [A] workspace_items(legacy_source=myspace_files) 확장자별 분포 (owner=%) ════', uid;
  begin
    for r in
      select coalesce(lower(extension),'(no-ext)') as ext,
             count(*) as cnt,
             min(created_at) as first_uploaded,
             max(created_at) as last_uploaded,
             pg_size_pretty(sum(coalesce(file_size,0))) as total_size
        from public.workspace_items
       where owner_id = uid
         and legacy_source = 'myspace_files'
       group by 1
       order by cnt desc
    loop
      raise notice '  ext=% | count=% | first=% | last=% | total_size=%',
        r.ext, r.cnt, r.first_uploaded, r.last_uploaded, r.total_size;
    end loop;
  exception when others then
    raise notice '  [A] 측정 실패: %', sqlerrm;
  end;

  -- ── [B] 스프레드시트류 개별 나열 (title·extension·용량·업로드일·상태) ───────
  raise notice '════ [B] 스프레드시트류(xlsx/xls/csv) 개별 목록 (owner=%) ════', uid;
  begin
    select count(*)
      into total_spreadsheets
      from public.workspace_items
     where owner_id = uid
       and legacy_source = 'myspace_files'
       and (
             lower(extension) in ('xlsx','xls','csv')
          or mime_type ilike '%spreadsheet%'
          or mime_type ilike '%excel%'
          or mime_type = 'text/csv'
       );
    raise notice '-- 스프레드시트류 총 건수=% (아래는 created_at 오름차순 최대 300건만 나열) --', total_spreadsheets;

    for r in
      select title,
             extension,
             pg_size_pretty(coalesce(file_size,0)) as size_pretty,
             created_at,
             (deleted_at is null) as is_active
        from public.workspace_items
       where owner_id = uid
         and legacy_source = 'myspace_files'
         and (
               lower(extension) in ('xlsx','xls','csv')
            or mime_type ilike '%spreadsheet%'
            or mime_type ilike '%excel%'
            or mime_type = 'text/csv'
         )
       order by created_at
       limit 300
    loop
      raise notice '  title=% | ext=% | size=% | created_at=% | status=%',
        r.title, r.extension, r.size_pretty, r.created_at,
        case when r.is_active then 'active' else 'trashed' end;
    end loop;
  exception when others then
    raise notice '  [B] 측정 실패: %', sqlerrm;
  end;

  raise notice 'OK myspace_files 인벤토리 확인 완료 (변경 0).';
end $$;
