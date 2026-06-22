-- 🟠 데이터 변경 (DDL) — 제안. 신버전 DB(pdnwgzneooyygfejrvbg). ⚠️ 실행 전 별도 보고/결재 자리.
-- 목적: WAV 등 브라우저가 직접 재생 못 하는 파일의 '재생용 MP3 파생본' Storage 경로 1개 저장.
--   · 원본 storage_path / original_name / 원본 WAV = 불변(이 컬럼은 추가 참조일 뿐).
--   · 파생본은 myspace_files 별도 행을 만들지 않고 이 컬럼으로만 참조(자료실 목록 중복 노출 방지).
--   · 재생 시: playback_path 있으면 그 MP3 우선, 없으면 기존 원본(또는 다운로드 안내).
--
-- 안전: nullable, 기본값 없음 → 기존 행 영향 0(전부 NULL). RLS·인덱스 변경 없음. 멱등.
--
-- ⚠️ 배포 순서 의존: 프론트(app.html)가 myspace_files SELECT에 playback_path를 요청하므로,
--    이 컬럼이 없으면 검색/자료실 조회가 400이 됩니다. → 반드시 이 DDL을 먼저 실행한 뒤
--    프론트 PR을 머지할 것. (DDL 먼저 → 머지)
--
-- 관련: app.html _searchOpen(검색 미리보기 오디오)·mysVaultPreview(자료실 오디오),
--       PR feat/audio-playback-path-sample

ALTER TABLE public.myspace_files
  ADD COLUMN IF NOT EXISTS playback_path text;

-- (확인용 🟢 읽기)
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='myspace_files' AND column_name='playback_path';
