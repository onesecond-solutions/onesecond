-- 🟠 데이터 변경 (write / DDL) — 신버전 DB(pdnwgzneooyygfejrvbg)에서 실행
-- 목적: 스크립트/메모/파일 "팀·지점 공유"가 team_notices 게시물을 만들 때
--       원본과의 연결(source_type / source_id)을 저장하기 위한 컬럼 추가.
--       보낸 공유함(shares.item_id) ↔ 팀방 게시물(team_notices.source_id) 연결 키.
--
-- 안전: ADD COLUMN IF NOT EXISTS = 멱등(여러 번 실행해도 안전). 기존 행 영향 0(값 NULL).
-- RLS 영향 없음(컬럼만 추가, 정책 미변경). 기존 team_notices 쓰기/읽기 경로 회귀 0.
--
-- 관련: app.html _osShareDo (shares + team_notices 동시 쓰기), PR fix/script-share-team-notices-dualwrite

ALTER TABLE public.team_notices
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id   text;

-- (확인용 🟢 읽기) 컬럼 추가 결과
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='team_notices'
--   AND column_name IN ('source_type','source_id');
