-- ▶ 실행 요청 — onesecond-test 전용 / 운영 프로젝트(pdnwg) 실행 절대 금지
-- 가입 검수 재가능하도록: 이전 가입 검증 user 삭제 + test-login 전화번호 매핑 해제 + 토큰 흔적 정리.
-- ★실유저(운영)는 onesecond-test에 없음. 여기 대상 = 테스트 검증 흔적만.

begin;

-- 1) 이전 가입 검증 사용자(signup_test.html이 만든 signup-test-*@example.com) — public+auth 둘 다 삭제(고아 방지)
delete from public.users where email like 'signup-test-%@example.com';
delete from auth.users  where email like 'signup-test-%@example.com';

-- 2) test-login 계정은 로그인 검수 위해 유지하되, 전화번호 매핑만 해제(중복 차단 풀기)
update public.users
   set phone_normalized = null, phone = null, verification_id = null,
       phone_verified_at = null, phone_verification_provider = null
 where email = 'test-login@example.com';

-- 3) signup_token·재사용 차단 흔적 정리(테스트 토큰)
truncate public.signup_tokens;
truncate public.used_verifications;

commit;

-- ════════════════════════════════════════════════════════════════
-- ✅ 검증용(조회만) — 고아 0 + 매핑 해제 확인
-- (a) auth에 있으나 public 없는 고아: 0 기대
-- select count(*) as auth_orphans from auth.users a left join public.users p on p.id = a.id where p.id is null;
-- (b) public에 있으나 auth 없는 고아: 0 기대
-- select count(*) as public_orphans from public.users p left join auth.users a on a.id = p.id where a.id is null;
-- (c) test-login 전화번호 비워졌는지: phone_normalized null 기대
-- select email, (phone_normalized is null) as phone_cleared from public.users where email='test-login@example.com';
-- (d) 남은 signup-test-* 0 기대
-- select count(*) from public.users where email like 'signup-test-%@example.com';
-- ════════════════════════════════════════════════════════════════
