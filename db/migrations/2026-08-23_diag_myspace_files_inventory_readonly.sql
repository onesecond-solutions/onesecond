-- 🟢 읽기전용 진단 — myspace_files 이관분 파일 인벤토리(확장자·용량·업로드일) 확인 (변경 0)
-- ═══════════════════════════════════════════════════════════════════════════
-- 대표 지시(2026-08-23): 워크스테이션 파일럿 계정(bylts@naver.com / 임태성)의
--   workspace_items 중 legacy_source='myspace_files' (구버전 myspace_files 테이블
--   이관분, 3,416건)에서 실제 파일명·용량·업로드일을 확인한다. 대표가 2019년부터
--   써온 엑셀 기반 고객리스트(이미 삭제 후 수기 재입력하기로 결정)를 찾아내려는
--   목적 — 삭제/이관 실행이 아니라 식별을 위한 인벤토리 조사다.
--
-- ⚠️ no-op 마이그레이션(select 1). 실제 진단은 동반 postverify가 RAISE NOTICE 로 출력:
--   [A] 전체 확장자별 분포(건수·최초/최근 업로드일·합계 용량) — "2019년부터"라는
--       기억이 실제 날짜 범위와 맞는지 교차 확인.
--   [B] 스프레드시트류(xlsx/xls/csv 또는 관련 mime_type)만 골라 파일명·용량·
--       업로드일·활성/휴지통 상태를 개별 나열(최대 300건, 총 건수는 별도 표기).
--   title/extension/file_size/created_at/deleted_at 만 조회 — body·legacy_payload
--   전체 덤프 등 추가 개인정보 노출 없음. 모두 SELECT 뿐 — 데이터·스키마 변경 0.
--
-- ⚠️ 대상: onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
-- ═══════════════════════════════════════════════════════════════════════════

begin;
select 1;  -- no-op
commit;

-- DOWN / ROLLBACK: 되돌릴 변경 없음(no-op).
