# PortOne 통합 테스트 검수 로그 (비식별)

> onesecond-test(`gelbgtfiuhqdpnlwxqrs`) 임시 프로젝트. 운영(`pdnwg…`) 미접촉. **개인정보·Secret·키 원문 0 — 결과 판정만 기록.**

## 1. 스모크 테스트 (Edge Function)
| 대상 | 케이스 | 결과 |
|---|---|---|
| verify-identity | OPTIONS | 200 + Access-Control-Allow-Origin = http://localhost:8000 |
| verify-identity | 잘못된 POST | 400 missing_fields (server_misconfig 아님) |
| portone-webhook | 서명 없는 POST | 400(서명검증 연결 전) → 이후 서명검증 보강 |

## 2. 본인인증 흐름 (NHN KCP 테스트, 실SMS 없음·임의 6자리)
| 단계 | 결과 |
|---|---|
| PortOne 본인인증창(통신사 선택) | 정상 호출 (콘솔 채널=본인인증으로 수정 후) |
| verify-identity 재조회 | HTTP 200 |
| ok | true |
| signup_token 발급 | present=true |
| phone_masked | 정상(마스킹) |
| expires_in | 600 |
| signup_tokens 행 | status=issued · vid 존재 · phone_normalized 존재 · not_expired=true · consumed=null |

## 3. 재사용 방어
| 케이스 | 기대 | 결과 |
|---|---|---|
| 동일 verificationId 재호출 | 409 verification_already_used · 토큰 증가 0 | (검수팀 기록 예정) |

## 4. 웹훅 서명 검증 (재배포 c185af4 후)
| 케이스 | 기대 | 결과 |
|---|---|---|
| 서명 없음 | 401 · DB write 0 | ✅ 401 invalid_signature |
| 잘못된 서명 | 401 · DB write 0 | ✅ 401 invalid_signature |
| 변조 body | 401 · DB write 0 | ✅ 401 invalid_signature |
| DB write 0 교차 | payment_events/payments/subscriptions/refunds = 0 | ✅ 네 테이블 0 |
| 응답 보안 | Secret·payload·stack 0 | ✅ invalid_signature만 |
| 정상 서명 | 처리 | (결제 흐름에서) |
| 중복 event | 멱등(duplicate_ignored) | (결제 흐름에서) |
| 순서 역전 | terminal 역행 ignored | (결제 흐름에서) |

## 5. 결제 흐름 (서명검증 통과 후에만 잠금 해제)
(예정)

---
보안: 휴대폰번호·verification_id·signup_token 원문·API/Webhook Secret·service_role = 기록·보고 0. 판정값만.
