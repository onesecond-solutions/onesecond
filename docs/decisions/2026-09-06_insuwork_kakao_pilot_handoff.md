# 보험워크 카카오톡 연동 파일럿 인수인계

Date: 2026-09-06

## 대표 확정 원칙

- 카카오톡은 새 고객관리 메뉴가 아니라 보험워크 안의 공통 통신수단이다.
- 계약관리는 기존 고객, 상담관리는 신규 상담 진행 고객으로 계속 구분한다.
- 기존 고객이 카카오톡으로 문의해도 상담관리로 고객을 옮기지 않는다.
- 신규 상담 고객이 카카오톡으로 문의해도 계약관리 고객으로 임의 전환하지 않는다.
- 보험워크가 먼저 보낸 메시지의 답장은 발송기록 기준으로 원래 영역에 연결한다.
- 고객이 카카오톡 채널로 먼저 문의한 경우에만 별도 매칭 절차가 필요하다.

## 이번 구현 범위

- 임태성 게이트에서만 카카오톡 보내기 버튼을 노출한다.
- 계약관리 고객 상세에 카카오톡 보내기 버튼을 추가했다.
- 상담관리 상담 상세에 카카오톡 보내기 버튼을 추가했다.
- 버튼을 누르면 안부톡, 보험금 청구 안내, 보험 상담 안내 템플릿을 선택할 수 있다.
- 실제 카카오 API 발송은 하지 않는다.
- 대신 `insuwork_items`에 발송 준비 기록을 저장한다.
- 카카오 발송 준비 기록은 자료 목록에는 노출하지 않고 각 상세 화면 이력에서만 보여준다.
- 계약관리 상세는 `target_area=customer` 기록만 보여준다.
- 상담관리 상세는 `target_area=consultation` 기록만 보여준다.

## 게이트

현재 게이트는 `js/insuwork.js`의 `canUseKakaoPilot()`에 있다.

- email: `bylts@naver.com`
- owner id: `98c5f4f9-10c1-4ee1-a656-5c2ca63239fd`
- local preview: `localhost` 또는 `127.0.0.1` + `pwtest=1`

## 저장 방식

새 테이블을 만들지 않고 기존 `insuwork_items`를 사용한다.

```txt
item_type: memo
visibility: private
legacy_payload.workspace_category: kakao_message_pilot
legacy_payload.target_area: customer | consultation
legacy_payload.target_id: 계약관리 고객 ID 또는 상담 ID
legacy_payload.customer_id: 연결 고객 ID
legacy_payload.consultation_id: 상담관리에서 보낸 경우 상담 ID, 계약관리에서 보낸 경우 null
legacy_payload.template_key: care_check | claim_help | consult_invite
legacy_payload.send_status: draft
legacy_payload.provider_status: not_connected
legacy_payload.direction: outbound
```

`target_area`가 핵심이다. 이 값으로 기존 고객과 신규 상담 고객의 소속을 유지한다.

## 다음 구현 순서

1. 공식 딜러사 또는 메시징 공급자를 정한다. 현재 후보는 SOLAPI, NHN Cloud, 인포뱅크 Bizgo다.
2. 알림톡 템플릿 3개를 실제 승인 문안으로 확정한다.
3. Supabase Edge Function을 만든다. API 키는 프론트에 두지 않는다.
4. `insuwork_items` 임시 기록을 정식 테이블로 옮긴다.
5. 상담톡 수신 웹훅을 연결한다.
6. 답장 수신 시 `target_area`와 발송 세션 기준으로 계약관리/상담관리 원래 영역에 이력을 붙인다.

## 열어둔 결정

- 정식 테이블을 바로 만들지, 공급자 확정 뒤 만들지 결정 필요.
- 알림톡 버튼은 웹 링크, 상담톡 전환, 봇 키워드 중 어느 것을 기본으로 할지 결정 필요.
- 카카오톡 채널로 고객이 먼저 문의한 경우의 매칭 UX가 필요하다.
- 보험금 청구 문의는 계약관리 기존 고객 안의 문의 이력으로 둘지, 별도 청구 탭을 만들지 결정 필요.
