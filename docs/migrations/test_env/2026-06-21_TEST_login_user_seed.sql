-- ▶ 실행 요청 — onesecond-test 전용 / 운영 프로젝트 실행 절대 금지
-- 로그인 SMS 검증용: 기존 사용자 1명에 휴대폰 매핑(complete-phone-login 매칭 대상).
--
-- ★전화번호 임의 고정 금지. test-login 계정의 phone_normalized 는
--   실제 PortOne/KCP 테스트 본인인증 완료 후 verify-identity(서버 재조회)가 반환한
--   정규화 번호와 정확히 같아야 매칭됨.
--
-- 절차(검수팀, 로컬에서 실제 번호로 실행 — 번호 원문은 커밋·로그·보고서에 남기지 않음):
--   1) 본인인증 테스트에 사용할 번호 확정
--   2) verify-identity / PortOne 재조회 결과의 phone_normalized 확인
--   3) 아래 <PHONE_NORMALIZED> 를 그 값으로 치환해 실행
--   4) 보고는 "일치 여부"만(번호 원문 X)
--
-- 선행: Dashboard → Authentication → Add user 로 test-login@example.com 생성
--   → handle_new_user 가 public.users 자동 생성.

update public.users
  set phone_normalized = '<PHONE_NORMALIZED>',   -- ★실제 재조회 반환값으로 치환(원문 커밋 금지)
      name = '로그인테스트'
  where email = 'test-login@example.com';

-- ✅ 검증(조회만, 원문 비노출): 매핑 채워짐 여부만
-- select (phone_normalized is not null) as mapped from public.users where email = 'test-login@example.com';
