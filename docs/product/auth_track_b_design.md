# 트랙 B — 휴대폰 SMS 본인인증 설계서

> 2026-06-21 대표님 작업지시서 기반. 진실원천. **설계 단계 — 실문자 발송·이메일 인증 제거·강제 재인증 금지.**
> DDL = `docs/migrations/2026-06-21_auth_track_b.sql`. 본인인증 PG = **NHN KCP SMS**(PortOne 경유), 결제(KG이니시스)와 분리.

## 인증 방식 확정 (B-1)
- 이메일 인증 → 휴대폰 **SMS 본인인증**으로 교체. 신규 가입자 SMS 본인인증 필수.
- 이메일 = 로그인 ID/연락처로 유지 가능.
- 단순 자체 OTP 아님 = **PortOne 본인인증 연동**. **SMS 인증번호 방식 = NHN KCP SMS 본인인증** 1순위.
- ⚠️ KG이니시스 통합간편앱(40원)·신용카드(45원)는 **SMS 본인인증 아님**(SMS 칸 `-`). SMS는 NHN KCP.

**NHN KCP SMS 본인인증 비용**(PortOne 비용표): 절약형 9,900/200건 · 최소형 25,000/500 · 소형 49,000/1,000 · 중형 120,000/2,500 · 대형 240,000/5,000 · 초과 인증성공 건당 50원. (월정액제 — 초기엔 절약형, 실제 콘솔 계약조건 대표 확인 자리)

## 신규 가입 흐름 (B-2) — 인증 완료 후에만 계정 생성(고아 방지)
```
1. 휴대폰 본인인증 시작 (PortOne.requestIdentityVerification, NHN KCP SMS 채널)
2. SMS 인증번호 입력
3. PortOne 인증 완료
4. ★서버에서 인증 결과 재조회 (verify-identity Edge Function, GET /identity-verifications/{id})
5. 인증 성공·중복(phone_normalized/DI) 확인
6. 가입 정보 입력
7. auth.users + public.users 생성  ← 인증 통과 후에만
8. 회사·지점·팀 자동배정(handle_new_user)
9. 소속 확인 상태(status) 적용
10. 가입 완료
```
**기존**: 이메일 OTP 발송 시점(`create_user:true`)에 auth.users 즉시 생성 → 고아 위험. **변경**: 본인인증 완료 후 생성으로 고아 방지.

## 저장 정보 (B-3) — 최소 저장
| 저장 | phone · phone_normalized · phone_verified_at · phone_verification_provider('nhn_kcp') · verification_id · verification_status · provider_identity_key(DI 해시, 법적근거 검토 후) |
|---|---|
| **저장 금지/최소화** | 인증 응답 원문 전체 · 주민등록번호 · 불필요 생년월일 원문 · 통신사 상세 · 전체 payload · **CI**(전 사이트 공통 식별, 비저장) |

번호 변경 시 → `phone_verified_at=null` + 재인증 요구.

## 기존 사용자 정책 (B-4) — 강제 차단 금지
신규 가입자부터 문자 인증 필수. **기존 47명 즉시 차단 X, 계정 유지.** 추후 대표 결재로 (순차 / 다음 로그인 / 중요 기능 진입 / 전원 일괄) 중 택1. 현 단계 강제 차단 없음.

## 중복 가입 방지 (B-5)
`phone_normalized` UNIQUE(1인 1계정). 동일 번호 타계정 존재 시 → 자동 가입 금지 + 관리자 검토 상태 + 기존 계정 찾기/복구 경로 안내. 인증 1건 다계정 재사용 차단(verification_id 1회). ★기존 중복은 STEP 0 확인 후 적용.

## 보안 (B-6) — 서버 확정
클라 인증 결과만 신뢰 X. **서버(verify-identity)가 PortOne API로 재조회**: verificationId 유효성·인증 상태·완료 여부·전화번호·요청-결과 일치·기사용 여부·만료. 통과 후에만 DB 기록. API Secret은 서버에서만.

## 개인정보 처리방침 (B-7) — 실가동 전 반영
수탁사: **PortOne**(본인인증 대행) + **NHN KCP**(본인확인기관). 처리항목=휴대폰번호·본인인증, 위탁목적=본인확인·중복가입 방지. 보유기간·재위탁·인증기관 정보 기재. **정책 개정·고지 완료 전 라이브 본인인증 강제 전환 금지.**

## verify-identity Edge Function (신규)
입력 identityVerificationId → PortOne `GET /identity-verifications/{id}` (V2 Secret, 서버) → status='VERIFIED' 검증 → DI 해시·phone 추출 → 중복 확인 → 결과만 클라/가입 흐름에 반환. (Secret 클라 노출 0)

## 보험사 경로 영향
메모리 `feedback_insurer_signup_field_test`(보험사=실보험사 이메일 OTP 필요)는 이메일을 자격 단서로 쓴 것. 문자 전환 시 본인 폰 검수 가능 = 제약 완화. 단 소속 검증은 카카오 수동 승인(status=pending) 그대로. **보험사 경로에서 이메일 OTP 유지 vs 대체는 결재 항목.**

## ★금지(이 단계)
실문자 발송 / 이메일 인증 제거 배포 / 기존 사용자 강제 재인증 / 본인인증 채널 운영 신청 / 처리방침 미개정 상태 강제 적용. — 전부 대표 결재 후.
