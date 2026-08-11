# 트랙 A — PortOne 정기구독 결제 설계서

> 2026-06-21 대표님 작업지시서 기반. 진실원천. **설계 단계 — DB 실행·실과금·cron·users.plan 변경 금지.**
> DDL = `docs/migrations/2026-06-21_payment_track_a.sql`. 결제 PG=KG이니시스(기존 V2 빌링키 재사용).

## 재사용 (보안 수준 유지, V1 회귀 금지)
PortOne V2 Browser SDK / 빌링키 발급 화면·코드(`app.html:3819~3916`) / `charge-subscriptions` Edge Function / 서버 고정 금액맵 / 멱등 `paymentId` / `x-cron-secret` 인증.

## 라이브 현황 → 보강
실측: `subscriptions`만 존재. **plans·payments·payment_events·refunds 없음 / user_id active UNIQUE 없음 / 결제→users.plan 루프 없음 / 웹훅 없음 / cron 미가동.** → DDL로 신설·보강.

## 신규 DB 객체 (DDL 참조)
| 테이블 | 역할 | 멱등 키 |
|---|---|---|
| `plans` | 요금·기능 단일 진실원천(하드코딩 제거) | code UNIQUE |
| `payments` | 결제 시도·결과 원장 | payment_id UNIQUE |
| `payment_events` | 웹훅·상태변경 이벤트 원장(원문 미저장, 해시만) | event_id UNIQUE |
| `refunds` | 환불 이력 | refund_id UNIQUE |
| `subscriptions`(보강) | cancel_at_period_end·canceled_at·기간·retry_count 등 + **user_id partial UNIQUE(pending/active/past_due만)** | |
| `plans_public`(view) | 공개 항목만. 원본 plans=admin만 | |

**partial UNIQUE 상태(보강):** `pending·active·past_due` 만 1개 제한. **canceled·expired는 새 구독 생성 허용.**

**RLS(보강 §3·§4):** plans 원본=admin만(내부 PG설정·테스트값 비공개) + 공개는 `plans_public` view(상품명·표시가격·주기·판매여부·공개기능) / payment_events=**admin·service 전용**(일반 SELECT 금지·원문 미저장) / payments·refunds=본인+admin 정제 조회 / 쓰기는 service_role(서버)만.

## 결제 상태 전환표

**구독 상태:** `pending → active → past_due → canceled / expired`

| from | 이벤트 | to | users.plan |
|---|---|---|---|
| (없음) | 빌링키+첫 결제 검증 성공 | active | free→plus/pro |
| active | 청구 실패 | past_due | **유지(즉시 free 금지)** |
| past_due | 재청구 성공 | active | 유지 |
| past_due | 재시도 최종 실패 | expired(또는 기간종료) | 기간 만료 시 →free |
| active | 일반 해지(cancel_at_period_end) | canceled | **만료일까지 유지** → 만료 시 free |
| active/canceled | **전액 환불** | canceled | **즉시 free 회수** |
| active | 부분 환불 | (유지) | **자동 회수 금지**(관리자 정책) |

**권한 원칙:** 결제 검증 성공 + 구독 active → plus/pro. 일반 해지=만료일까지 유지·다음 청구만 중단. 전액환불=즉시 회수. 부분환불=자동 회수 X. 청구 실패=past_due(즉시 강등 X)+재시도.

## 서버 검증 원칙 (A-5)
프론트 성공 응답만으로 권한 부여 **금지.** 서버가 PortOne API로 **재조회**(결제상태·paymentId·주문번호·금액·통화·결제자·plan·기처리 여부) → 통과 후에만 `payments 기록 → subscriptions 갱신 → users.plan 변경 → payment_events 기록`을 **일관 흐름**으로. 금액은 항상 `plans` 기준(프론트/DB 금액 불신).

## 웹훅 (A-6) — 신규 Edge Function `portone-webhook`
PortOne 웹훅 수신 → **이벤트 멱등(event_id)** → **서버 재조회**(본문만 신뢰 X) → 결제완료/실패/취소/환불/정기청구 결과 반영 → 처리 실패 시 재시도 가능 상태(processing_status=failed). 

## 정기청구 cron (A-7)
`charge-subscriptions` cron 활성화 = (plans 적용 + payments 원장 + 웹훅 + 서버 재검증 + 권한 루프 + 멱등 테스트 + 테스트 결제) **전부 통과 후** + **대표 별도 결재.**

## 관리자 화면 (A-8)
운영센터 결제관리: 구독자·plan·상태·다음 결제일·최근 결제·실패/연체·해지예정·환불·이벤트 이력. **임의 plan 변경은 기본 기능 아님** — 수동 변경 시 사유+감사 로그.

## 완료 보고 매핑(10형식) — 이 PR 범위
1. 변경 파일: 마이그레이션 SQL + 본 설계서 / 2. 신규 DB 객체: plans·payments·payment_events·refunds + subscriptions 보강 / 3. 기존 영향: subscriptions ALTER(추가 컬럼·partial UNIQUE), 데이터 무변경 / 4. RLS: plans 공개읽기·결제원장 본인+admin 읽기·쓰기 service_role / 5. 상태전환표: 위 / 6~7. (트랙 B) / 8. 테스트: 다음 단계 / 9. 개인정보: 결제대행 PortOne 위탁(처리방침) / 10. 결재: DB 적용·웹훅 함수·cron 활성화.

## ★금지(이 단계)
DB 실행 / 실결제 / cron 활성화 / users.plan 운영 변경 / 실운영 웹훅 등록. — 전부 대표 결재 후.
