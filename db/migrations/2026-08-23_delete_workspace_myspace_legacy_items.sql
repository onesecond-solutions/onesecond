-- 🔴 실제 DELETE — 워크스테이션 파일럿 workspace_items 중 myspace_files/myspace_folders 이관 사본 물리 삭제
-- ═══════════════════════════════════════════════════════════════════════════
-- 대표 승인(2026-08-23): "자료(myspace_files/folders 3,746건) 삭제 건은 그대로 진행, 승인한다."
--
-- 배경: 2026-08-14_workspace_unified_schema.sql(원본 이관 마이그레이션)이 워크스테이션
--   파일럿 계정(owner_id 98c5f4f9-10c1-4ee1-a656-5c2ca63239fd / bylts@naver.com / 임태성)의
--   원본 테이블 public.myspace_files(3,416건) · public.myspace_folders(330건) 데이터를
--   workspace_items 테이블로 "복사"했다(legacy_source='myspace_files'/'myspace_folders',
--   legacy_id=원본 id). 그 복사 당시 원본 테이블은 전혀 수정·삭제되지 않고 그대로 보존됐다.
--
-- 확인된 사실: 이 3,746건(2026-06-16 일괄 업로드된 참고자료 덤프)은 보험브리핑/워크스테이션
--   화면에서 더 이상 필요 없다고 대표가 확인 → workspace_items 안의 "사본"만 물리 삭제한다.
--
-- ⚠️ 원본 테이블(public.myspace_files / public.myspace_folders)은 이 마이그레이션이
--   전혀 건드리지 않는다 — DELETE 대상은 workspace_items 뿐이다. 레거시 `/insu/` 구버전
--   화면은 원본 테이블을 직접 읽으므로(`insu/index.html`에 workspace_items/
--   personal-workspace.js 참조 0건 확인) 이 마이그레이션의 영향을 받지 않는다.
--
-- 구조 참고: workspace_items.parent_id는 workspace_items(id) ON DELETE SET NULL 참조.
--   삭제 대상 폴더(legacy_source='myspace_folders') 안에 직접작성 항목(legacy_source
--   IS NULL)이 들어있었다면, 그 항목들은 parent_id가 NULL로 바뀌어 최상위로 올라갈 뿐
--   유실되지 않는다 — FK ON DELETE SET NULL의 정상 자동 동작이며 별도 처리 불필요.
--
-- ⚠️ 대상: onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
-- ═══════════════════════════════════════════════════════════════════════════

begin;

delete from public.workspace_items
 where owner_id = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd'::uuid
   and legacy_source in ('myspace_files','myspace_folders');

commit;

-- DOWN / ROLLBACK:
--   DELETE는 비가역이라 SQL로 즉시 복구할 수 없다. 다만 원본 public.myspace_files /
--   public.myspace_folders는 이 마이그레이션으로 전혀 변경되지 않았으므로(원본 보존),
--   필요 시 2026-08-14_workspace_unified_schema.sql에 있는 동일한
--   workspace_legacy_uuid('myspace_folders'|'myspace_files', id::text) 기반
--   INSERT ... SELECT ... ON CONFLICT (legacy_source,legacy_id) DO NOTHING 이관 로직을
--   그대로 재실행하면, 결정론적 UUID(workspace_legacy_uuid) 덕분에 동일한 id로 동일한
--   사본이 다시 만들어진다 — 완전한 데이터 복구 경로가 존재한다(단, 즉시 자동 실행은
--   아니며 별도 마이그레이션으로 수동 재실행 필요).
