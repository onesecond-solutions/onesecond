-- ═══════════════════════════════════════════════════════════════════════════
-- 🟠 시드 INSERT — 캘린더 예약 알림 마스터 스위치 기본 행(app_settings) 1행 적재
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠️ 대상 프로젝트(유일 진실 원천): onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
--    구버전(qursjteiovcylqiepmlo)은 2026-06-19 삭제됨 — 절대 참조 금지.
--
-- 목적:
--   어드민 콘솔 "설정" 섹션의 캘린더 예약 알림 ON/OFF 마스터 스위치(PR #1281)가
--   실제로 작동하려면 app_settings 에 기준 행이 있어야 한다.
--   행이 없으면 어드민 토글 저장(PATCH key=eq.calendar_reminder_enabled)이 0행이라
--   OFF 가 영속화되지 않는다(현재 "켜짐 고정"). 이 seed 로 기본 ON 행을 심는다.
--
-- 소비처:
--   · app.html  diaAlarmTick / _diaReminderEnabled (인앱 팝업 게이트)
--   · supabase/functions/diary-push (웹푸시 게이트)
--   · js/admin-console.js acLoadSettings (어드민 토글 렌더)
--
-- app_settings 컬럼(라이브 검증): id / key / value / label / group_name / updated_at
--   (id·updated_at 은 default. insert 대상 = group_name, key, value, label — 기존 배너/메뉴 토글 동일 패턴)
--
-- 멱등성: key 유일 제약을 가정하지 않고 where not exists 로 중복 삽입 0(재실행 안전).
--   이미 행이 있으면(수동 생성·재실행) 아무 것도 하지 않음 — 기존 value(on/off) 보존.

begin;

insert into public.app_settings (group_name, key, value, label)
select 'operations', 'calendar_reminder_enabled', 'on', '캘린더 예약 알림'
where not exists (
  select 1 from public.app_settings where key = 'calendar_reminder_enabled'
);

commit;

-- DOWN / ROLLBACK (롤백) — 아래 주석을 해제해 실행하면 seed 행이 제거된다.
-- delete from public.app_settings where key = 'calendar_reminder_enabled';
