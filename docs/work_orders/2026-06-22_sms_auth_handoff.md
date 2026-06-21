# SMS 인증 트랙 — 인수인계 (2026-06-22 홀딩)

> 실기기 검수 통과. **운영 반영은 새 세션에서 별도 진행.** 오늘 운영 프로젝트·운영 Edge·운영 채널키·운영 사용자 미접촉. 결제 트랙 홀딩.

## 1. 실기기 검수 결과 (전부 통과 ✅)
- 휴대폰 본인인증 **신규 가입 성공** — auth.users / public.users / 조직정보 생성 확인
- 휴대폰 본인인증 **로그인 성공** — 기존 **동일 user_id 세션** 생성
- `complete-phone-login` token_hash → `verifyOtp(type:email)` → **세션 수립 성공**
- 로그인으로 **불필요한 신규 auth 생성 0**
- 동일 번호 중복 가입 차단(phone_in_use) / signup_token·verificationId 재사용 차단 확인
- 테스트 환경 격리(gelbg만 호출, pdnwg 0) / 운영 미접촉 / 결제 홀딩

## 2. Git 상태
- 브랜치: **`feat/sms-auth`** / HEAD: **`d72e3be`**
- PR: **#887 OPEN · MERGEABLE** (오늘 머지 금지)
- 미커밋: **0** (clean)
- Secret·전화번호·token_hash·세션토큰 커밋 포함: **0** (auth-modal:1189는 base64url charset 문자열, 키 아님)
- 로컬 전용 파일(serve_lan.js·run_test_server.bat·login_test.local.js): **Git 미추적/제거됨** (검수 LAN 도구는 d72e3be에서 제거)
- 별도 브랜치: **`feat/verify-identity-fn`**(verify-identity Edge + signup_token RPC) — 운영 반영 시 함께 머지 필요

## 3. 테스트 환경 (onesecond-test = `gelbgtfiuhqdpnlwxqrs`)
- **유지** (운영 반영+회귀검증 후 삭제 — 비용)
- 배포된 Edge: verify-identity / complete-phone-login / complete-signup (JWT OFF). testmap·TEST_LOGIN_USER_ID는 이미 제거됨
- **ALLOWED_ORIGIN 임시값 = `http://192.168.0.8:8000`** (LAN 실기기 검수용 — 운영 반영 시 운영 도메인으로)
- 검수 사용자/데이터: test-login(로그인 검수용·phone 매핑은 정리SQL로 해제 가능) / 실기기 가입 user / signup-test-*(가입 검증) / seed(테스트금융·admin·user). 정리SQL: `docs/migrations/test_env/2026-06-22_TEST_cleanup_signup_verification.sql`
- **로컬 서버 종료됨**(node serve_lan PID 종료·포트8000 해제), 임시 `anon` 파일 삭제(미저장 원칙). **anon key 파일·로그 저장 0**

## 4. 이메일 OTP 판정
- 기존 코드 경로 보존(doLogin/verifyOtp 무수정): **통과**
- 실제 이메일 수신: **미검증**(onesecond-test SMTP 미설정)
- OTP 입력 후 기존 계정 세션 생성: **미검증**
- → **운영 반영 전 최종 스모크 게이트로 보류**

## 5. 다음 세션 시작 지점 (이 순서만)
```
① 운영 기존 이메일 OTP 실스모크 1건 (실수신→입력→기존 세션)
② 통과 후 운영 Edge 3종 배포 결재 (verify-identity·complete-phone-login·complete-signup → pdnwg)
③ 운영 본인인증 storeId/channelKey 및 환경 설정 (auth-modal OS_SMS prod 분기 placeholder → window.OS_IDENTITY 주입)
④ 운영 표본 가입 1건
⑤ 운영 표본 휴대폰 로그인 1건
⑥ 기존 이메일 OTP 회귀 1건
⑦ 이상 없을 때 PR 머지 (#887 + feat/verify-identity-fn)
⑧ 테스트 프로젝트 정리 및 삭제
⑨ Billing 복귀 확인
```

## 6. 계속 금지
오늘 운영 배포 · 오늘 PR 머지 · 운영 채널키 변경 · 테스트 프로젝트 삭제 · 결제 트랙 재개 · 기존 47명 일괄 변경 · 이메일 OTP 제거.

## 관련 PR/브랜치
- #887 feat/sms-auth (auth-modal SMS·complete-phone-login·complete-signup·used_verifications·환경분리·가드)
- feat/verify-identity-fn (verify-identity·signup_token RPC) / feat/portone-webhook-fn (결제 apply_payment_event — 홀딩)
- #882~#886 (결제 트랙 — 홀딩)
