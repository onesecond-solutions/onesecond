-- 다이어리 스케줄 푸시 — 발송 중복방지 로그 (작업2 PWA 푸시, 2026-06-11)
-- 🚨 실행 = 대표님 (Supabase SQL Editor). 신버전 onesecond-v1-restore-0420 / pdnwgzneooyygfejrvbg 확인 후.
-- 🟠 데이터 변경(신규 테이블). 추가만 — 기존 테이블·데이터 영향 0.
-- 용도: diary-push Edge Function 이 (event_id, reminder_min, fire_date) 단위로 1회만 발송하도록 원자적 중복방지.

begin;

create table if not exists public.push_sent_log (
  id           bigserial primary key,
  event_id     text not null,        -- calendar_events.id (타입 무관 text 저장)
  reminder_min int  not null,        -- 0=정시 / 10·30·60=N분전 / 1440=전날
  fire_date    date not null,        -- 발송 기준 일정 날짜(occurrence 식별)
  created_at   timestamptz not null default now(),
  constraint push_sent_log_uniq unique (event_id, reminder_min, fire_date)
);

-- 일반 사용자 접근 불필요 → RLS on + 정책 0 = 일반 차단. Edge Function은 service_role로 우회.
alter table public.push_sent_log enable row level security;

commit;

-- ── 검증 (별도 RUN 권장) ──
-- select to_regclass('public.push_sent_log');                  -- not null = 생성됨
-- select conname, pg_get_constraintdef(oid) from pg_constraint
--   where conrelid='public.push_sent_log'::regclass and contype='u';  -- UNIQUE 1건
