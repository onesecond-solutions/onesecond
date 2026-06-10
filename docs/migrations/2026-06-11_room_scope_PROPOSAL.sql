-- [제안·미실행] 공동 스페이스 가상 방(room) 스코프 — Phase 1 DDL 제안 (2026-06-11)
-- 🚨 제안서. 대표 결재 전 실행 금지. 실행 = 대표 단독 (신버전 onesecond-v1-restore-0420 / pdnwgzneooyygfejrvbg).
-- 모델: rooms 테이블 신설 X (대표 승인). (room_type, scope_id) 파생 가상 방. 전부 추가만·nullable·데이터 보존·하드코딩 0.
-- 설계서: docs/product/space_ia_v1.md

-- ─────────────────────────────────────────────
-- [1] scripts에 방 스코프 추가 (공유 스크립트 + 채팅 = 둘 다 scripts 저장)
--     room_type IS NULL = 기존 global/personal 스크립트·채팅 (현행 동작 불변)
-- ─────────────────────────────────────────────
alter table public.scripts add column if not exists room_type text;   -- 'team' | 'branch'
alter table public.scripts add column if not exists scope_id  text;   -- team_id/branch_id(uuid) → text
create index if not exists idx_scripts_room on public.scripts (room_type, scope_id) where room_type is not null;
comment on column public.scripts.room_type is '공동 스페이스 방 유형(team/branch). null=기존 global/personal.';
comment on column public.scripts.scope_id  is '방 식별자(team_id/branch_id를 text로). room_type과 함께 가상 방.';

-- ─────────────────────────────────────────────
-- [2] 공지 = team_notices (기존 scope team_internal/branch_internal 그대로) → DDL 0
--     보험사별 자료실 공지·자료 = posts(board_type='insurer', insurer_id) → DDL 0
-- [3] 보험Q&A = posts(board_type='qna') flat → DDL 0
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- [4] 공유 자료 — 택1 (결재 필요)
--   (A·추천) DDL 0: 팀방/지점방 공유자료 = team_notices(첨부 있는 글)을 '자료' 탭으로 노출.
--   (B) library 방 스코프 신설 (A 부족 시):
-- alter table public.library add column if not exists room_type text;
-- alter table public.library add column if not exists scope_id  text;
-- create index if not exists idx_library_room on public.library (room_type, scope_id) where room_type is not null;
-- ─────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- [5] RLS (제안 — 결재 후 기존 헬퍼 점검하여 정책문 확정. 자기참조 회피=SECURITY DEFINER)
--   원칙: room_type IS NULL → 기존 정책 그대로. room_type='team' → 본인 team_id=scope_id.
--         room_type='branch' → 본인 branch_id=scope_id (지점장은 산하 팀 포함은 별도 함수).
--   ※ 실제 CREATE POLICY는 is_admin()/team 매칭 헬퍼 확정 후 별도 제출.
-- ─────────────────────────────────────────────

-- 검증 (실행 후 별도 RUN):
-- select column_name, data_type, is_nullable from information_schema.columns
--   where table_schema='public' and table_name='scripts' and column_name in ('room_type','scope_id');
-- select count(*) from public.scripts where room_type is not null;  -- 적용 직후 0 (기존 데이터 영향 0)
