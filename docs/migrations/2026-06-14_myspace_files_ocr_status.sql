-- 자료실 파일 OCR — 멱등 마커 컬럼 (2026-06-14, Phase A)
-- 🚨 실행 = 대표님/Chrome. 신버전 pdnwgzneooyygfejrvbg 확인 후. 작은 ALTER(데이터 무손실).
-- ocr_status: null=미처리 / 'done'=OCR 적재 / 'empty'=빈 추출(재시도 방지) / 'skip'=비대상.
-- (search_text는 업로드 시 파일명이 들어가 있어 'is null'로 미처리 판별 불가 → 별도 상태 컬럼 필요)

alter table public.myspace_files add column if not exists ocr_status text;
create index if not exists idx_myspace_files_ocr on public.myspace_files (ocr_status) where ocr_status is null;

-- 검증(별도 RUN):
-- select ocr_status, count(*) from public.myspace_files group by ocr_status;
