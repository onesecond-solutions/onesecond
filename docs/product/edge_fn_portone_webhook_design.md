# Edge Function 설계 — portone-webhook (트랙 A)

> 2026-06-21. **설계·코드 단계 — 배포·실행·운영 연결 금지.** 코드=`supabase/functions/portone-webhook/index.ts`, RPC=`docs/migrations/2026-06-21_apply_payment_event_rpc.sql`.

## 1. 입력·출력 계약
- 입력: PortOne 웹훅 POST(StandardWebhooks 헤더 webhook-id/signature/timestamp + body). body.data.paymentId / body.type.
- 출력: 200 `{ok,outcome}`(처리/멱등 무시) / 4xx(서명·필드·매칭 실패) / 5xx(재조회·RPC 실패 → PortOne 재발송).

## 2. 상태 전환표 (apply_payment_event RPC)
| event_type | subscriptions | users.plan |
|---|---|---|
| paid / billing_paid | active(retry=0) | **plan 부여** |
| failed / billing_failed | past_due(retry++) | **유지(즉시 free 금지)** |
| refunded(전액) | canceled | **즉시 free** |
| partial_refunded | 변경 없음 | **자동 강등 금지** |
| cancelled(결제취소) | 변경 없음 | 변경 없음 |
| subscription_canceled(일반 해지) | cancel_at_period_end=true | **만료일까지 유지** |
| expired(기간 만료) | expired | **free** |

## 3. DB 쓰기 순서 (한 트랜잭션)
payment_events 멱등 INSERT(event_id) → (중복이면 무동작 반환) → payments upsert(payment_id) → subscriptions 갱신 → users.plan 변경. **전부 RPC 안 한 트랜잭션.**

## 4. 원자성
`apply_payment_event` RPC(SECURITY DEFINER) 내 단일 트랜잭션 → 부분 반영 0(실패 시 전체 롤백). 함수가 RPC 1콜만 호출.

## 5. 멱등키
- 웹훅: `event_id`(webhook-id) → payment_events UNIQUE. 중복 웹훅 = `duplicate_ignored` 무동작.
- 결제: `payment_id` UNIQUE(payments). 순서 역전/재발송에도 최종 재조회 상태로 수렴(upsert).

## 6. 실패·재처리 정책 + 순서 역전 (보강)
- 서명 검증 실패 → 401(처리 0). / 재조회 실패 → 502. / RPC 실패 → 500 + 비식별 코드 → **PortOne 자동 재발송(재처리)**. 멱등이라 재처리 안전.
- **순서 역전(보강):** RPC가 **현재 구독 상태 조회 후 terminal(canceled/expired) 역행 차단** — 환불/취소 이후 늦게 온 paid/failed = **무시(이벤트 이력만 `ignored`)**. 과거 paid가 refunded를 못 되돌림. 재조회(p_verified.status)가 항상 진실.
- **payment_events.processing_status 4구분:** `received`(선기록)→`applied`(정상) / `ignored`(중복·역행) / `failed`(RPC 실패 시 Edge가 멱등 기록). 동일 상태 재수신=멱등 성공.

## 7. 보안 점검표
- [x] 웹훅 서명 검증 후에만 처리(본문 불신) — ★배포 전 `@portone/server-sdk Webhook.verify` 연결 필수
- [x] 결제 상태/금액/plan = **서버 재조회 결과만 신뢰**
- [x] users.plan 변경 = RPC(service_role)만. anon/authenticated revoke
- [x] API Secret·service_role = Edge env만(클라 노출 0)
- [x] 로그에 휴대폰/빌링키/payload 미출력(비식별 코드만)
- [x] 오류 응답 내부정보 비노출 / 요청 크기 제한(64KB)
- [x] 재시도 중복 DB 변경 0(멱등)

## 8. 테스트 시나리오 (배포 후 테스트 환경)
정상 결제 / 중복 웹훅(무동작) / 순서 역전(최신 수렴) / 금액 불일치(재조회로 차단) / 없는 payment_id(422) / 전액환불(즉시 free) / 부분환불(강등 X) / 청구 실패(past_due) / 재시도 성공(active 복귀).

## 9. 필요한 환경변수
`PORTONE_WEBHOOK_SECRET`(서명) · `PORTONE_V2_API_SECRET`(재조회) · `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY`. — ★실값 미설정(배포 시).

## 10. ★금지
배포 / 라이브 DB 실행 / 운영 채널 연결 / 실결제 / users.plan 운영 변경 / cron. 전부 대표 결재 후.
