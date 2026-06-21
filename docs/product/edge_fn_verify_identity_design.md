# Edge Function 설계 — verify-identity (트랙 B)

> 2026-06-21. **설계·코드 단계 — 배포·실문자·운영 채널 금지.** 코드=`supabase/functions/verify-identity/index.ts`, RPC=`docs/migrations/2026-06-21_signup_token_rpc.sql`. 본인인증 PG=NHN KCP SMS.

## 1. 입력·출력 계약
- 입력: POST `{verificationId, state}` (클라가 PortOne 본인인증 완료 후 전송).
- 출력: 200 `{ok, signup_token, phone_masked, expires_in}` / 4xx·5xx(미인증·중복·재조회·발급 실패).
- 가입 함수: `{signup_token, verificationId, phone, 가입정보}` → consume_signup_token 검증 후에만 auth/public.users 생성.

## 2. 인증 상태 처리
| iv.status | 처리 |
|---|---|
| VERIFIED | 통과 → 토큰 발급 |
| (그 외: READY/FAILED/취소) | 409 not_verified (구분 반환) |
| state 불일치 | 401 state_mismatch(위조 의심) |
| 재조회 실패 | 502 |

## 3. DB 쓰기 순서
재조회(VERIFIED) → 전화번호 정규화 → **활성 중복 확인(SELECT)** → `issue_signup_token`(verificationId 재사용 차단 + signup_tokens INSERT 해시). users 생성은 **이 함수가 안 함**(가입 함수가 토큰 consume 후).

## 4. 원자성
issue_signup_token = 단일 INSERT(verificationId 재사용 시 예외). consume_signup_token = `for update` + 검증 + consumed 한 트랜잭션. 가입 함수는 consume 성공 시에만 계정 생성.

## 5. 멱등키
- `verification_id` = signup_tokens에서 1회만(재사용 차단). 동일 인증건 토큰 1개.
- `token_hash` UNIQUE. consumed_at으로 1회 사용 보장.

## 6. 실패·재처리
미인증/취소/만료 = 구분 4xx(재인증 유도). 토큰 발급 실패(verification_already_used) = 409. 토큰 만료/재사용/바인딩 불일치 = consume 시 예외(가입 차단). 모두 계정 생성 0.

## 7. 보안 점검표
- [x] 클라 결과 불신 → **PortOne REST 재조회**로 확정
- [x] verificationId 1회·활성 동일번호 중복 차단
- [x] 토큰 = **해시 저장**·짧은 만료(10분)·1회·verification_id+phone+state 바인딩
- [x] auth/public.users = **유효 토큰 consume 성공 시에만** 생성(고아 방지)
- [x] API Secret·service_role = 서버 전용 / RPC anon·authenticated revoke
- [x] CORS = 우리 도메인만 / 요청 크기 제한(16KB) / 로그에 휴대폰·payload 미출력
- [x] 최소 저장(CI·주민번호·생년월일 미저장)

## 8. 테스트 시나리오 (배포 후 테스트 환경)
정상 인증 / 잘못된 state(401) / 만료 인증 / 취소 인증(409) / verificationId 재사용(409) / 동일번호 중복(409 recover) / 토큰 만료(consume 예외) / 토큰 재사용(예외) / 인증 후 가입 중단(토큰 만료로 무효) / 다른 이메일로 토큰 재사용 시도(바인딩 불일치 차단).

## 9. 필요한 환경변수
`PORTONE_V2_API_SECRET`(재조회) · `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY`. — ★실값 미설정(배포 시).

## 10. 가입 함수 연결 — 2단계 소비 (보강 §1: 토큰 유실·중복 계정 방지)
Auth와 public DB가 한 트랜잭션으로 안 묶이는 점을 고려한 **reserve → 생성 → finalize**:
```
complete-signup (service_role):
 1. reserve_signup_token(token_hash, verificationId, phone)   ← 검증 + processing 선점
      · proceed=false + created_user_id → 이미 가입됨 → 기존 계정 수렴(새 계정 X)
      · proceed=true → 2
 2. auth.admin.createUser(metadata: phone·phone_verified_at)  ← ★멱등(already exists면 기존 user)
 3. public.users + 조직 연결(handle_new_user)
 4. 전체 가입 완료 확인
 5. finalize_signup_token(token_hash, user_id)               ← 마지막에 consumed + created_user_id
```
**중간 실패 보상·재시도:** 토큰은 `processing`으로 남아 **유실 0**. 재시도 → reserve가 (계정 있으면)수렴/(없으면)재진행, createUser 멱등 → **중복 auth.users 0**, 이미 생성됐으면 **기존 수렴**. 토큰 없이는 createUser 시작 안 됨(고아 0). `token_hash`=idempotency key.

## ★금지
배포 / 실문자 인증 / 운영 채널 연결 / 이메일 인증 제거 / 라이브 DB 실행. 전부 대표 결재 후.
