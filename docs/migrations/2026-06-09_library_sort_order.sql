-- 라이브러리 좌측 카드 재정렬 — library.sort_order 추가 (2026-06-09, Phase B 옵션 1)
-- 🚨 실행 전 신버전 확인: onesecond-v1-restore-0420 / pdnwgzneooyygfejrvbg
-- 🚨 실행 = 팀장님 (Supabase SQL Editor). Code는 파일·PR만. 본 PR DB 변경 0.
-- 🟠 데이터 변경(DDL ALTER + INDEX). 실행 = 팀장님 결재 관문(Chrome).
--
-- 목적: 라이브러리 '마이 스페이스' 칩(자료·스크립트·메모) 좌측 카드 사용자 재정렬 영속화.
--
-- 접근 = 옵션 1 (칩별 sort_order, 팀장님 결재 2026-06-09):
--   · library 에 sort_order 1컬럼 추가 → '자료'·'메모' 공용(같은 테이블, badge 로 구분, 필터 뷰 내 상대순서 유지)
--   · scripts.sort_order 는 이미 존재 → 개인분(스크립트 칩) 활용. ALTER 불필요.
--   · '전체' 칩 = scripts+library 크로스 머지 뷰라 수동 재정렬 비적용(created_at recency 유지).
--   · 옵션 2(통합 order 테이블)는 미채택(조인 무겁고 가치<비용).
--
-- 정렬 규약(프론트, UX PR에서 구현):
--   · 조회: owner 기준, ORDER BY sort_order NULLS LAST, created_at DESC
--   · 재정렬: 해당 칩(필터) 항목들의 sort_order 를 0,1,2,… 재할당 (owner 본인 행만, RLS 방어)
--   · UX: PC 드래그 / 모바일 ▲▼, 좌 카드 = 우 내용 동반 이동(카드+내용 = 한 항목)

alter table public.library  add column if not exists sort_order integer;

-- 조회 최적화(owner + 정렬). 소규모 테이블이라 선택적이나 안전하게 추가.
create index if not exists idx_library_owner_sort on public.library (owner_id, sort_order);

-- 🟢 검증(실행 후, 읽기 전용):
-- select column_name, data_type
--   from information_schema.columns
--  where table_schema='public' and table_name='library' and column_name='sort_order';   -- 1행(integer) 기대
-- select indexname from pg_indexes where schemaname='public' and tablename='library' and indexname='idx_library_owner_sort';  -- 1행 기대
