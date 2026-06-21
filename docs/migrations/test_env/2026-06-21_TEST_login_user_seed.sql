-- ▶ 실행 요청 — onesecond-test 전용 / 운영 프로젝트 실행 절대 금지
-- 로그인 SMS 검증용: 휴대폰 등록된 기존 사용자 1명 준비(complete-phone-login 매칭 대상).
--
-- 선행(대표/검수팀): Supabase Dashboard → Authentication → Add user 로
--   email = test-login@example.com (비번 아무거나) 생성 → handle_new_user가 public.users 자동 생성.
-- 그 뒤 아래 실행으로 휴대폰 번호 등록.
--   ★검증 시 PortOne 테스트 본인인증창에 반드시 이 번호(01012345678)를 입력해야 매칭됨.

update public.users
  set phone_normalized = '01012345678', phone = '010-1234-5678', name = '로그인테스트'
  where email = 'test-login@example.com';

-- ✅ 검증용(조회만): 1행, phone_normalized 채워졌는지
-- select id, email, phone_normalized from public.users where email = 'test-login@example.com';
