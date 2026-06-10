-- 다이어리 알람 타이밍 저장 컬럼 (2026-06-10, 대표님 신버전 직접 실행 완료)
-- 신버전 pdnwgzneooyygfejrvbg. 추가만(기존 일정 데이터 보존). RLS=기존 calendar_events 정책 상속.
-- 값: 0=정시 / 10·30·60=N분전 / 1440=전날. 빈 배열={}=알람 없음(기본).
alter table public.calendar_events add column if not exists reminders int[] default '{}';
