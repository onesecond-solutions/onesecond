# 결제 결과 반영 = apply_payment_event 단일 경로 (2026-06-21 결재)

> 대표님 결재. 과거 cron-only(webhook 없음, subscriptions 직접 갱신) → 이번 구조로 전환. **운영 cron 바로 수정 금지 — 테스트 프로젝트에서 먼저 증명 후 운영 적용.**

## 결정
**결제 결과 반영은 `apply_payment_event` 단일 경로로 일원화한다.**
- **webhook(portone-webhook) = 주 경로**: 서명검증 → 서버 재조회 → apply_payment_event → payment_events·payments·subscriptions·users.plan·next_billing_at
- **정합성 복구(reconcile) = 보조 경로**: 오래된 pending 조회 → PortOne 재조회 → **동일 apply_payment_event 호출**(subscriptions 직접 수정 금지)
- **cron(charge-subscriptions) = 청구 요청 + 시도 기록까지만**: 대상 조회 → PortOne 정기결제 API 호출 → paymentId/pending 기록 + (어느 구독·요청시각·API 호출 성공여부·API 실패사유·재시도횟수). **subscriptions/users.plan/결제성공 상태 직접 변경 안 함.**

## 역할 분리 (책임)
| 주체 | 한다 | 안 한다 |
|---|---|---|
| cron | 청구 요청, paymentId/pending 기록, API 호출 성패 로그, 재시도 카운트 | 결제 성공 상태·subscriptions·users.plan 확정 |
| webhook | 서명검증·재조회·apply_payment_event(결과 확정) | 청구 트리거 |
| reconcile | 오래된 pending 재조회 → apply_payment_event | subscriptions 직접 수정 |

→ **청구 요청(cron) ↔ 결제 결과 확정(apply_payment_event)** 책임 분리. 멱등(paymentId·event_id)으로 webhook·reconcile 동시 실행도 안전.

## 검증 2층 (서명 우회/백도어 금지)
- **A. 외부 보안 게이트** (실제 portone-webhook URL): 서명없음/잘못된/변조 → 401 · DB write 0 — **✅ 완료**(위조 3종 통과)
- **B. 내부 상태 전이** (apply_payment_event RPC 직접 호출, 테스트 DB): paid→active/plan/next+1m·중복→0·역전→ignored·실패→past_due·환불→canceled+free — 하네스 `test_env/2026-06-21_TEST_B_state_transition.sql`

## 운영 적용 전 테스트 증명 항목
단일 결과 반영 경로 · 중복 이벤트 멱등 · 순서 역전 방어 · **웹훅 유실 복구(reconcile)** · 청구 실패와 결제 실패 구분 · 운영 미접촉.

## 미완(다음)
- charge-subscriptions를 "청구+시도기록만"으로 수정(테스트용 설계 — 운영 cron 미수정)
- reconcile 작업 신설(pending 재조회 → apply_payment_event)
- apply_payment_event next_billing_at 전진 = 반영 완료(커밋 1b4e0ad)
