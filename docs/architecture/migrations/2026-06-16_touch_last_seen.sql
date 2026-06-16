-- ============================================================================
-- 실시간 접속 표시(presence) — touch_last_seen RPC
-- 작성: 2026-06-16
-- ============================================================================
--
-- 🚨 실행 전 신버전 확인:
--   - Dashboard 좌상단 = `onesecond-v1-restore-0420`
--   - URL ID = `pdnwgzneooyygfejrvbg`
--
-- 📌 본질:
--   - users.last_seen_at 컬럼은 2026-05-02에 추가됐으나, 값을 기록하는 로직이
--     한 번도 구현되지 않아 전원 NULL → 매니저방 '로그인 불'(presence)이 항상 꺼짐.
--   - 본 RPC = 로그인한 본인의 last_seen_at = now() 갱신. 프론트가 앱 진입 시 +
--     2분마다(heartbeat) 호출 → '최근 10분 이내 접속 = 접속중(초록)' 판정의 소스.
--
--   ※ SECURITY DEFINER = RLS와 무관하게 본인 행만 갱신(auth.uid() 일치분).
--   ※ 신버전 users는 id = auth.users.id 단일 매핑(handle_new_user가 NEW.id를 id에 저장).
--     auth_user_id 컬럼 없음 → id = auth.uid() 만 사용.
--   ※ CREATE OR REPLACE — 멱등.
--
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.touch_last_seen()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  UPDATE public.users
     SET last_seen_at = now()
   WHERE id = auth.uid();
$function$;

GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;

COMMIT;

-- ┌───────────────────────────────────────────────────────────────────────┐
-- │ 검증 (COMMIT 후 별도 RUN)                                                │
-- └───────────────────────────────────────────────────────────────────────┘
-- 1) 함수 생성 확인
-- SELECT proname FROM pg_proc WHERE proname = 'touch_last_seen';
--
-- 2) 라이브 검증 — 실장/팀원 계정으로 로그인 후 1~2분 뒤:
-- SELECT name, role, last_seen_at FROM public.users
--  WHERE last_seen_at IS NOT NULL ORDER BY last_seen_at DESC;
--   → 접속한 계정의 last_seen_at 이 채워지면 정상. 매니저방에서 그 사람 초록불.
