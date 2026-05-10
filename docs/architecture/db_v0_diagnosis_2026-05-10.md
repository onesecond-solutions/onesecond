# 원세컨드 라이브 DB 진단 결과 (2026-05-10)

> 본 문서는 v0 진입 전 라이브 DB 정합 진단 영구 진실 원천이다.
> 다음 세션 진입 시 D-2 (인수 폼 v0) 작업지시서 박음 시점에 본 문서 정합 검증 박음.

---

## 진단 메타

| 항목 | 값 |
|---|---|
| 진단 일시 | 2026-05-10 14:55 KST |
| 대상 프로젝트 | `pdnwgzneooyygfejrvbg` (onesecond-v1-restore-0420) |
| 실행 주체 | Claude in Chrome (read-only) |
| 사전 확인 | 좌측 상단 프로젝트 / URL / SQL Editor 캡처 3건 모두 충족 |
| 실행 본질 | SELECT만. DML/DDL 0건 |
| 신뢰성 | CLAUDE.md 3 조건 (신버전 / 2026-04-23 이후 / 팀장님 확인) 모두 충족 ✅ |

---

## 진단 결과 9건

### [1] posts 컬럼 전수 (37 컬럼)

```
column_name               | data_type                   | is_nullable | column_default
--------------------------+-----------------------------+-------------+----------------
id                        | bigint                      | NO          | NULL (serial)
created_at                | timestamp with time zone    | NO          | now()
board_type                | text                        | YES         | ''::text
category                  | text                        | YES         | ''::text
title                     | text                        | YES         | ''::text
content                   | text                        | YES         | NULL
author_id                 | text                        | YES         | NULL
author_name               | text                        | YES         | NULL
organization_id           | text                        | YES         | NULL
is_hub_visible            | boolean                     | YES         | false
view_count                | bigint                      | YES         | '0'::bigint
like_count                | bigint                      | YES         | '0'::bigint
comment_count             | bigint                      | YES         | '0'::bigint
is_anonymous              | boolean                     | YES         | false
display_name              | text                        | YES         | NULL
is_hidden                 | boolean                     | YES         | false
is_notice                 | boolean                     | YES         | false
attachments               | text                        | YES         | NULL
insurer_name              | text                        | YES         | NULL
product_category          | text                        | YES         | NULL
patient_age               | text                        | YES         | NULL
patient_gender            | text                        | YES         | NULL
disease_name              | text                        | YES         | NULL
diagnosis_timing          | text                        | YES         | NULL
current_status            | text                        | YES         | NULL
drug_usage                | text                        | YES         | NULL
question_type             | text                        | YES         | NULL
insurer_target            | text                        | YES         | NULL
keywords                  | ARRAY                       | YES         | NULL
status                    | text                        | YES         | '답변대기'::text
insurer_id                | uuid                        | YES         | NULL
branch_id                 | uuid                        | YES         | NULL
team_id                   | uuid                        | YES         | NULL
source_type               | text                        | YES         | NULL
display_author            | text                        | YES         | NULL
source_label              | text                        | YES         | NULL
parent_post_id            | bigint                      | YES         | NULL
(총 37 컬럼)
```

### [2] board_type CHECK + 분포

**CHECK:** 7종 ENUM
```
posts_board_type_check | CHECK ((board_type = ANY (ARRAY['qna'::text, 'manager_notice'::text, 'manager_lounge'::text, 'navigation'::text, 'insurer'::text, 'hub'::text, 'archive_legacy'::text])))
```

**라이브 분포:**
```
board_type       | row_count
-----------------+----------
archive_legacy   | 4
```
나머지 board_type 0행 (Step 7 본 세션 박힘 시점).

### [3] insurer_target

- 컬럼 ✅ (`text`, nullable, default NULL)
- CHECK ❌ (자유 텍스트 INSERT 가능)
- → Phase 3 진입 전 CHECK 박음 필수 (사고 신호 #2)

### [4] target_insurer_ids

❌ **부재**
→ Phase 3 진입 시 신설 (UUID[] 배열). v0 단계 부재 OK.

### [5] 인수 폼 → 라이브 6 컬럼

✅ 박힘:
- `patient_age` / `patient_gender` / `disease_name` / `diagnosis_timing` / `current_status` / `drug_usage`

❌ 부재 (조회 대상 13개 중 7개):
- `patient_age_range` / `occupation` / `medical_history` / `medication` / `current_state` / `extra_note` / `coverage_type`

**의뢰 결정:** 추가 신설 X. 라이브 6 컬럼 그대로 활용.

### [6] 상품 폼 → 라이브 컬럼

✅ 박힘:
- `insurer_name` / `product_category`

❌ 부재 (조회 대상 5개 중 3개):
- `insurance_type` / `health_grade` / `inquiry_focus`

→ 상품 폼 v0 진입 시 결정 필요 (B-2 마이그레이션 ~10분).

### [7] audience_target / responder_hint

❌ **둘 다 부재**
→ 공지/기타 폼 v0 진입 시 신설 (B-3 마이그레이션 ~30~40분).

### [8] question_type / notice_type

- `question_type` ✅ (text, CHECK 3종)
  ```
  posts_question_type_check | CHECK (((question_type IS NULL) OR (question_type = ANY (ARRAY['공지'::text, '상품'::text, '인수'::text]))))
  ```
- `notice_type` ❌ 컬럼 부재

→ "기타" 추가 시 question_type CHECK 확장 또는 별도 컬럼 신설.

### [9] insurers 31사

✅ **31사 정합** (생명보험 21 + 손해보험 10)
- 컬럼명 = `type` (`category` 아님)
- CHECK 부재 (데이터로 검증 OK)
- → spec § 6-2 v1 SQL 정정 push 완료 (commit `ed3fbbf`)

#### [9-b] insurers by type
```
type      | cnt
----------+-----
생명보험   | 21
손해보험   | 10
```

#### [9-c] insurers 전수 31사

**생명보험 21사:**
```
ABL생명               | 생명보험 | abl              | b2d664e2-d938-40fc-a0d2-6e98e884222e
AIA생명               | 생명보험 | aia              | 886e15b2-aac2-4604-affc-83aab8d94995
BNP파리바 카디프생명   | 생명보험 | bnp-cardif       | 20640c22-1ae2-4e63-b2e7-684917b4de8e
DB생명                | 생명보험 | db-life          | 4ba7ac69-0966-4c19-b9c8-080450e7fd7f
IBK연금보험            | 생명보험 | ibk              | a3ab934c-b7b8-4048-a62a-2f774e9bd190
iM라이프              | 생명보험 | im-life          | 2b399d8e-e793-4cf9-8afc-f271d5dc662a
KB라이프              | 생명보험 | kb-life          | 04a1bac8-96de-46c2-a28d-0e881170c537
KDB생명               | 생명보험 | kdb              | e7b0527b-a905-4c01-8384-42a72569ec11
NH농협생명             | 생명보험 | nh-life          | f9781722-0096-4d0b-8ab8-a062388cd444
교보생명              | 생명보험 | kyobo            | f70b4cd7-2da0-4eb9-8c6f-a1afbed80280
동양생명              | 생명보험 | dongyang         | 7bcc3b1c-af7e-45b0-81bf-7d25f04d829d
라이나생명             | 생명보험 | lina-life        | 061675af-d6c9-4d9a-a64d-03452f2c7b38
메트라이프             | 생명보험 | metlife          | df9768b9-e2b9-4cd4-ad34-4a466d9d4050
미래에셋생명           | 생명보험 | miraeasset       | e4786770-0897-4d8c-89e4-56d6071eccf2
삼성생명              | 생명보험 | samsung-life     | 42c5c6b9-6de5-45e9-ad6b-6780e9396d30
신한라이프             | 생명보험 | shinhan          | 650e5cf4-98e4-46f1-bcf5-14204ed392a4
처브라이프             | 생명보험 | chubb            | 1980e2cc-12c3-4d21-a7bd-e4e055a9fbef
푸본현대생명           | 생명보험 | fubon-hyundai    | 9b2b4e8a-520a-4b0c-bab0-3521f7ba187c
한화생명              | 생명보험 | hanwha-life      | 41023330-0a3e-4fcc-950e-a49db4a856da
흥국생명 (e-life)     | 생명보험 | heungkuk-elife   | 08deae32-0b12-40c1-a0eb-e2a4b3a68c4a
흥국생명 (T-Life)     | 생명보험 | heungkuk-tlife   | 6adb888b-350c-4a25-8064-fa323482b996
```

**손해보험 10사:**
```
AIG손해보험   | 손해보험 | aig-fire      | 626adde3-0272-4ba9-9c32-5ec1d26d11c6
DB손해보험    | 손해보험 | db-fire       | 68d211e6-4498-48d5-932e-5d60a53ccab6
KB손해보험    | 손해보험 | kb-fire       | 98e87010-2b2d-407d-aec3-f8a15ba5603d
NH농협손해보험 | 손해보험 | nh-fire       | ae588274-f231-4abe-b50a-d9c6ea761544
라이나손해보험 | 손해보험 | lina-fire     | 2890db85-8f59-4860-931c-2a91502128ff
롯데손해보험   | 손해보험 | lotte-fire    | 5d41215d-d02e-46b5-8bd4-92ddb68419fc
메리츠화재    | 손해보험 | meritz        | 6183a50f-48ee-4903-968d-ad0c25c2cf33
삼성화재      | 손해보험 | samsung-fire  | 77a5ddb6-2e25-4188-b886-bb45e817513b
한화손해보험   | 손해보험 | hanwha-fire   | b77f3d17-ba35-480b-88a5-9cb98be9fe35
흥국화재      | 손해보험 | heungkuk-fire | b575ab56-f50b-41ba-bc07-293aa91ed626
```

#### [9-d] insurers CHECK
0건 — type ENUM CHECK 부재 (데이터로 검증 OK).

---

## Code 판단 4건

### A. v0 진입 가능 여부

| 폼 | 진입 가능 | 사유 |
|---|---|---|
| **인수 폼** | ✅ 즉시 | 라이브 6 컬럼 그대로 활용. 마이그레이션 0 |
| **상품 폼** | 🟡 부분 | 3 컬럼 부재. content 자유 흡수 또는 신설 결재 |
| **공지 폼** | 🟡 신설 | audience_target / notice_type 부재 |
| **기타 폼** | 🟡 신설 | audience_target / responder_hint / notice_type 부재 |

### B. Step 2-bis 마이그레이션 분량

| 옵션 | 본질 | 분량 |
|---|---|---|
| **B-1 인수만 v0** | 0 | **즉시** |
| **B-2 인수 + 상품 v0** | insurance_type / health_grade / inquiry_focus 3 컬럼 신설 | ~10분 |
| **B-3 4종 폼 통째 v0** | + audience_target / responder_hint / notice_type + question_type CHECK 확장 ('기타') + insurer_target CHECK 4종 | ~30~40분 |
| **B-4 B-3 + Phase 3 대비** | + target_insurer_ids UUID[] | ~45~50분 |

### C. 사고 위험 분류

| # | 신호 | 강도 | 회피 |
|---|---|---|---|
| 1 | 인수 폼 라이브 6 컬럼 활용 | 🟢 낮음 | 사고 0 |
| 2 | `insurer_target` CHECK 부재 | 🟡 중간 | v0 RLS 가짜 연결로 영향 0. Phase 3 전 박음 필수 |
| 3 | `target_insurer_ids` 부재 | 🟢 v0 / 🔴 Phase 3 | Phase 3 진입 결재 항목 박힘 ✅ |
| 4 | 상품/공지/기타 부재 컬럼 | 🟡 중간 | B-2/B-3 마이그레이션 또는 content 흡수 |
| 5 | 옛 organization_id / is_hub_visible 잔존 | 🟢 낮음 | 호환 보존. 본 트랙 무관 |
| 6 | `notice_type` 부재 | 🟡 중간 | question_type 확장 또는 별도 신설 결재 |

### D. v0 진입 권장 순서 (Code 추천)

| 순서 | 행동 | 분량 |
|---|---|---|
| **D-1** ✅ | spec § 6-2 v1 SQL 컬럼명 정정 | 완료 (`ed3fbbf`) |
| **D-2** | **인수 폼 v0 진입** (단독) | ~1세션 |
| **D-3** | 인수 폼 라이브 검증 후 → 상품/공지/기타 폼 결재 | — |
| **D-4** | B-2 또는 B-3 마이그레이션 | 0.3~0.7세션 |
| **D-5** | 상품/공지/기타 폼 v0 진입 | ~2세션 |
| **D-6** ✅ | 본 진단 raw 영구 보존 | ~10분 (본 문서) |

→ Code 추천 본질: **D-2 (인수 폼만 v0 진입)** 부터 시작.

---

## Phase 3 진입 결재 항목 (영구 박힘)

다음 트리거 3건 모두 충족 시 Phase 3 진입 결재:

1. Phase 2 (질문량 확인) 결과 = 본 트랙 본질 검증 완료
2. 보험사 임직원 가입자 발생 (`insurer_*` 역할 user 1명 이상)
3. 팀장님 결재 완료

**진입 시 박을 본질:**
- [ ] § 6-2 정책 3 v0 → v1 전환 (`insurer_target` 매칭)
- [ ] `target_insurer_ids` UUID[] 컬럼 신설 마이그레이션
- [ ] `insurer_target` CHECK ENUM 4종 박음
- [ ] `insurers.type` 라이브 컬럼명 정합 (`category` 아님 박힘)
- [ ] UI 라벨 "이 질문이 [N개 보험사]에 보입니다" 가짜 → 실 연결 전환

---

## 본 세션 결정 박힘 (정합)

| # | 결정 | 박힘 |
|---|---|---|
| 1 | v0 본질 = "질문 생성 UX 검증" | 본 세션 결정 |
| 2 | 보험사 미러링 = 가짜 연결 (RLS 분기 X) | 본 세션 결정 |
| 3 | spec § 6-2 정책 3 = v0 비활성화 / Phase 3 본격화 | spec push (`a552923` / `ed3fbbf`) |
| 4 | 인수 폼 = 라이브 6 컬럼 그대로 활용 | 본 세션 결정 |
| 5 | 4종 폼 우선순위 = 공지(1) / 인수(2) / 상품(3) / 기타(4) | 본 세션 결정 |
| 6 | 두 차원 분기 = `insurer_target` / `audience_target` | 본 세션 결정 |

---

*본 문서는 영구 진실 원천. 다음 세션 진입 시 D-2 작업지시서 박음 시점에 정합 검증.*
*수정 시 본 문서 헤더 last-updated 박음.*
