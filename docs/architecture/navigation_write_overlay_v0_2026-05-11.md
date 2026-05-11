# 네비게이션방 글쓰기 팝업 오버레이 v0 — 영구 진실 원천

> **파일명:** `navigation_write_overlay_v0_2026-05-11.md`
> **작성일:** 2026-05-11 (어제 2026-05-10 Claude AI 웹 채팅 본문 영구 보존)
> **본질:** 글쓰기 버튼 → 2층 구조 팝업 오버레이 → 4종 폼 (공지/인수/상품/기타) v0 진입 spec
> **부착 경로:** _INDEX_3_stars 별 트랙 #58 + 마스터 전략 § 13 결재 #1 ("Step 8 진입 전 spec 박음") 정합
> **양면 진실 원천:**
> - 영업/사업 본질: `docs/core/onesecond_master_strategy_v1_20260510.md`
> - 시스템 본질: `docs/core/onesecond_os_definition_v2_2026-05-07.md`
> - DB 진단: `docs/architecture/db_v0_diagnosis_2026-05-10.md`
> - spec § 6-2 v0/v1 분기: `docs/specs/v2_insurer_admission_phase1_v2.md` (commit `a552923` + `ed3fbbf`)
> **인계 사유:** 2026-05-11 새벽~오전 진입 시 어제 5/10 채팅 본문이 진실 원천에 미박힘으로 발견. 본 raw가 사라지지 않도록 영구 보존.

---

## §0. 본 트랙 큰 그림 (어제 5/10 결정 본질)

### v0 본질
- **"질문 생성 UX 검증"** (Phase 1) 본진
- 보험사 미러링 = **가짜 연결** (RLS 분기 X)
- 인수 폼 = 라이브 6 컬럼 그대로 활용 (마이그레이션 0)
- 4 카테고리 = 공지(1) / 인수(2) / 상품(3) / 기타(4) 우선순위 박힘

### v0 → v5 5단계 Phase
```
Phase 1 → 질문 UX 완성       ← 본 트랙 본진
Phase 2 → 질문량 확인
Phase 3 → 보험사 라우팅 / RLS (v1 본격화)
Phase 4 → 자동 분류
Phase 5 → AI 구조화
```

### 두 차원 분기 본질
| 차원 | 적용 카테고리 | 본질 |
|---|---|---|
| `insurer_target` (보험사 분기) | 인수 / 상품 | "어느 보험사에 질문하나" |
| `audience_target` (답변자 범위) | 공지 / 기타 | "누구에게 보이나" |

한 row에는 한 차원만 박힘 (다른 차원은 NULL).

---

## §1. 글쓰기 팝업 UI 본문

### 진입 트리거
- 라이브 위치: `pages/board.html` L830 `<button class="write-btn" onclick="window.onClickWriteBtn()">✏️ 글쓰기</button>`
- 현재 라이브 = `.write-view` 페이지 전환 뷰
- **v0 변경:** 페이지 전환 → **팝업 오버레이 2층 구조**

### 팝업 2층 구조

```
┌─────────────────────────────────────────────┐
│  [상단 흰색 영역]                            │
│  "지금 어떤 질문인가요?"                     │
├─────────────────────────────────────────────┤
│  [하단 회색 영역]                            │
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │ 📢 공지사항      ← 1순위 (admin/매니저) │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ 🩺 인수 같음     ← 2순위              │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ 📦 상품 같음     ← 3순위              │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │ ❓ 기타 잘 모르겠음 ← 4순위            │  │
│  └──────────────────────────────────────┘  │
│                                              │
└─────────────────────────────────────────────┘
```

### 9역할 RBAC 분기 (공지 카드 노출 정책)
| 역할 | 노출 카테고리 |
|---|---|
| `admin` | 4 카테고리 모두 |
| `ga_branch_manager` | 4 카테고리 모두 |
| `ga_manager` | 4 카테고리 모두 |
| `ga_member` | 3 카테고리 (공지 숨김) |
| `ga_staff` | 3 카테고리 (공지 숨김) |
| `insurer_*` 4역할 | v0 단계 가입 0명 / Phase 3 결재 시점에 박음 |

### 팝업 width 추천
- **860px** (Code 자문 추천, 어제 5/10 박힘)
- 모바일 = 100vw 또는 max-width 95vw

---

## §2. 4종 폼 raw 본문

### §2-1. 공지사항 폼 ⭐ 1순위 (admin/매니저만)

**좌측:**
- **공지 유형** (select 1개):
  - 운영 공지
  - 긴급 공지
  - 상품 공지
  - 인수 공지
  - 교육 안내
  - 이벤트/일정
  - 기타
- **공지 제목** (input)
- **공지 내용** (textarea)
  - placeholder: "전달하고 싶은 내용을 작성해 주세요."
- **첨부 자료 또는 이미지** (선택, file)

**우측:**
- **공지 범위** (`audience_target`):
  - 팀 내부
  - 지점
  - 전체 네비게이션방
  - 특정 보험사
  - 운영진만

**권한:** `admin` / `ga_branch_manager` / `ga_manager` 만 작성

---

### §2-2. 인수 질문 폼 (2순위)

**좌측 8필드 (어제 5/10 채팅 본문 raw):**
- 연령
- 성별
- 직업
- 병력
- 진단시기
- 약복용 유무
- 현재 상태
- 기타 적고 싶은 내용이 있으세요?

**우측 (`insurer_target` 4종):**
- 손해보험
- 생명보험
- 손/생보 전체
- 특정회사 선택

**라이브 6 컬럼 매핑 (D-2 진입 결재 항목):**

| 폼 필드 | 라이브 컬럼 | 상태 |
|---|---|---|
| 연령 | `patient_age` | ✅ 박힘 |
| 성별 | `patient_gender` | ✅ 박힘 |
| 진단시기 | `diagnosis_timing` | ✅ 박힘 |
| 약복용 유무 | `drug_usage` | ✅ 박힘 |
| 현재 상태 | `current_status` | ✅ 박힘 |
| 병력 | `disease_name` | ✅ 박힘 (의미 정정 가능성) |
| **직업** | `occupation` | ❌ 부재 |
| **기타 적고 싶은 내용** | `extra_note` | ❌ 부재 |

**D-2 진입 시점 결재 항목:**
- (a) 라이브 6 컬럼만 활용 (8필드 → 6필드 축소) — `db_v0_diagnosis_2026-05-10.md` L102 결정 정합
- (b) `occupation` / `extra_note` 신설 마이그레이션 (~10분)
- (c) `content` 자유 textarea 흡수 (직업/기타 = content 안에 박음)

**권한:** 일반 사용자 (ga_member / ga_staff) + 매니저 모두

---

### §2-3. 상품 질문 폼 (3순위)

**좌측:**
- **상품군** (select 11종):
  - 실손 / 암 / 2대·3대 / 간병 / 치매 / 운전자 / 치아 / 종신 / 정기 / 화재 / 기타
- **건강체** (select 3종):
  - 초건강체형(10년고지형)
  - 초유병자형(10년고지형)
  - 기타
- **확인하고 싶은 내용** (select 8종):
  - 보장내용 / 특약 / 보험료 / 가입조건 / 판매중지 / 비교 / 설계방법 / 기타
- **질문 제목** (input)
- **질문 내용** (textarea)
  - placeholder: "어떤 부분이 헷갈리셨나요?"
- **참고 자료 또는 이미지 첨부** (선택, file)

**우측 (`insurer_target` 4종):**
- 손해보험
- 생명보험
- 손/생보 전체
- 특정회사 선택

**라이브 컬럼 매핑:**

| 폼 필드 | 라이브 컬럼 | 상태 |
|---|---|---|
| 상품군 | `product_category` | ✅ 박힘 |
| 특정회사 선택 | `insurer_name` | ✅ 박힘 |
| **건강체** | `health_grade` | ❌ 부재 |
| **확인하고 싶은 내용** | `inquiry_focus` | ❌ 부재 |
| 보험 분류 (손해/생명) | `insurance_type` | ❌ 부재 |

**D-4/D-5 진입 시점 결재 항목 (B-2 마이그레이션 ~10분):**
- (a) 3 컬럼 신설 (`health_grade` / `inquiry_focus` / `insurance_type`)
- (b) `content` 자유 흡수

**권한:** 일반 사용자 + 매니저 모두

---

### §2-4. 기타 잘 모르겠음 폼 (4순위)

**좌측:**
- **질문 유형** (select 9종):
  - 녹취
  - 서류
  - 전산
  - 청약
  - 계약변경
  - 민원
  - 고객응대
  - 지급/보상
  - 기타
- **질문 제목** (input)
- **질문 내용** (textarea)
  - placeholder: "어떤 상황인지 편하게 작성해 주세요"
- **참고 자료 또는 이미지 첨부** (선택, file)

**우측 영역:**
- **확인하고 싶은 범위** (`audience_target` 5종):
  - 팀 내부
  - 지점
  - 전체 네비게이션방
  - 특정 보험사
  - 운영진만
- **누가 답해주길 원하세요?** (`responder_hint`, 선택 또는 자유 입력):
  - 예시: 전산 → 운영진
  - 예시: 녹취 → 관리자
  - 예시: 고객응대 → 현장 설계사
  - 예시: 민원 → 팀장

**라이브 컬럼 매핑:**

| 폼 필드 | 라이브 컬럼 | 상태 |
|---|---|---|
| 질문 유형 | `question_type` (확장) | ⚠️ 현재 CHECK 3종 (`공지/상품/인수`) — 9종 ENUM 확장 또는 별도 컬럼 |
| **확인하고 싶은 범위** | `audience_target` | ❌ 부재 |
| **누가 답해주길 원하세요?** | `responder_hint` | ❌ 부재 |

**권한:** 일반 사용자 + 매니저 모두

---

## §3. 두 차원 분기 ENUM 본문

### `insurer_target` ENUM (인수/상품 폼 우측)

```sql
-- Phase 3 진입 시 CHECK 박음 (v0 단계는 CHECK 부재 OK)
CHECK (insurer_target IS NULL OR insurer_target IN (
  '전체',
  '손보전체',
  '생보전체',
  '회사지정'
))
```

**라벨 정합 결재 (D-2 시점):**
- 어제 채팅 raw: "손해보험 / 생명보험 / 손/생보 전체 / 특정회사 선택"
- spec § 6-3 ENUM: '전체' / '손보전체' / '생보전체' / '회사지정'
- → 라벨 통일 결재 필요 (UX 표기 vs DB ENUM 정합)

### `audience_target` ENUM (공지/기타 폼 우측, 신설 필요)

```sql
-- 신설 마이그레이션 (~5분)
ALTER TABLE public.posts ADD COLUMN audience_target text;
ALTER TABLE public.posts ADD CONSTRAINT posts_audience_target_check
  CHECK (audience_target IS NULL OR audience_target IN (
    'team_internal',      -- 팀 내부
    'branch',             -- 지점
    'navigation_all',     -- 전체 네비게이션방 (기본값)
    'insurer_specific',   -- 특정 보험사
    'admin_only'          -- 운영진만
  ));
```

### `responder_hint` (기타 폼만, 신설 필요)

```sql
-- 신설 마이그레이션 (~3분)
ALTER TABLE public.posts ADD COLUMN responder_hint text;
-- ENUM CHECK 미박음 (자유 입력 정합)
```

---

## §4. v0 단순 INSERT 흐름 (가짜 연결)

### 본질
사용자가 4종 폼 중 하나 작성 → 저장 버튼 → posts INSERT.
v0 단계 RLS = `policy_navigation_select_insurer_employee_v0` (모든 보험사 임직원이 모든 row SELECT). 다중 보험사 분기 = **가짜 연결** (row에는 `insurer_target` 박히지만 실제 분기 X).

### INSERT 컬럼 매핑 (v0)
```
board_type      = 'navigation'    (4종 폼 모두)
question_type   = '공지' / '상품' / '인수' / '기타'
title           = 폼 제목
content         = 폼 내용 (+ v0 흡수 시 부재 컬럼들도 content에 박음)
author_id       = auth.uid()
author_name     = users.name
display_name    = (이후 결재)
attachments     = file URL 박음

-- 인수 폼 (라이브 6 컬럼)
patient_age / patient_gender / disease_name /
diagnosis_timing / current_status / drug_usage

-- 상품 폼 (라이브 2 컬럼 + 3 컬럼 신설 결재)
product_category / insurer_name
[+ health_grade / inquiry_focus / insurance_type 결재 후]

-- 인수/상품 폼 우측
insurer_target  = '전체' / '손보전체' / '생보전체' / '회사지정'
insurer_id      = NULL  (네비방은 NULL — spec § 6-3 정책 3 정합)

-- 공지/기타 폼 우측 (신설 결재 후)
audience_target = ENUM 5종
responder_hint  = text (기타 폼만)
```

---

## §5. 분량 추정 (어제 Code 자문 5/10 박힘)

| 단계 | 본질 | 분량 |
|---|---|---|
| (1) 글쓰기 트리거 alert 제거 + 3 카드 (공지/인수/상품) UI | UI ~80줄 | 0.3세션 |
| (2) "인수" 클릭 → 8필드 입력폼 (좌측) | UI ~120줄 + 검증 ~40줄 | 0.5세션 |
| (3) "상품" / "기타" 입력폼 | UI ~80줄 | 0.3세션 |
| (4) 보험사 선택 우측 컬럼 (4 옵션 + 검색형) | UI ~120줄 + autocomplete 로직 ~80줄 | 0.5세션 |
| (5) 정규식 차단 + 안내 박스 + 토스트 (spec § 11-1 #1 4중 방어) | 로직 ~100줄 | 0.4세션 |
| (6) Supabase INSERT (네비방 row + insurer_target/insurer_id 배열) | ~60줄 + DB 신설 컬럼 + ALTER | 0.4세션 |
| (7) RLS 정책 3 갱신 (insurer_target 매칭) + 라이브 검증 | RLS SQL + Step 2-bis 추가 | 0.6세션 |
| (8) "공지" 카테고리 흐름 (별도 분기) | UI ~50줄 | 0.2세션 |
| (9) 라이브 회귀 + 9역할 검수 | Chrome 검증 ~12 시나리오 | 0.5세션 |
| **합계** | | **~3.7세션** |

**spec § 9-1 Step 8(1.8) + Step 9(1.3) = 3.1세션 정합 ± 19% 격차** (DB 신설 컬럼 3종 + RLS 정정 + 검색형 autocomplete 추가 신설로 인한 +0.6세션).

### 분량 v0 vs v1 분리 (어제 5/10 결정 정합)
- **v0 분량 = ~2.0세션** (Phase 1: 1/2/3/8/9 단계 + 부분 6)
- **Phase 3 진입 시 추가 = ~1.7세션** (4/5/7 단계 + 6 잔여)

---

## §6. 사고 위험 6건 (어제 Code 자문 박힘)

| # | 사고 신호 | 회피 |
|---|---|---|
| 1 | 실 환자 정보 입력 (이름·주민번호·전화) | spec § 11-1 위험 #1 = 정규식 차단 + 안내 박스 + 토스트 + 가이드 모달 (4중 방어) |
| 2 | RLS 자기참조 EXISTS | spec § 6-5 D-pre.7~.8 + § 11-2 영구 학습 박힘 → SECURITY DEFINER 함수 표준 |
| 3 | `insurer_target` ENUM CHECK 라이브 부재 | DB 진단 결과 = CHECK 부재 확정 / Phase 3 진입 전 박음 필수 |
| 4 | 인수 8필드 → posts 컬럼 매핑 격차 (`occupation`/`medical_history`/`extra_note`) | D-2 진입 시 결재 (a/b/c) |
| 5 | 양방향 미러링 사용자 인지 부담 ("이 질문이 어디 보일지" 불명확) | UI에 "이 질문이 [N개 보험사]에 보입니다" 라벨 (v0 단계 가짜 연결) |
| 6 | ⭐ spec § 6-2 정책 3 ↔ § 6-3 정책 3 자체 모순 | 어제 5/10 정정 결재 박음 (commit `a552923` + `ed3fbbf`) |

---

## §7. D-2 진입 결재 항목 (다음 슬롯 결재 대기)

### 진입 본질
- 메인 트랙 2 Step 8 본진의 첫 단계
- 분량 ~1세션 (인수 폼 단독 v0)
- 마스터 전략 § 13 결재 #1 "Step 8 진입 전 spec 박음" 정합

### D-2 진입 시 결재 4건
- **결재 (1)** 인수 폼 8필드 ↔ 라이브 6 컬럼 격차 박음 방향:
  - (a) 6필드 축소 (직업/기타 미박음)
  - (b) `occupation` / `extra_note` 신설 마이그레이션 (~10분)
  - (c) content 자유 흡수
- **결재 (2)** 우측 `insurer_target` 라벨 정합:
  - (a) "손해보험/생명보험/손생보 전체/특정회사 선택" (UX raw)
  - (b) "전체/손보전체/생보전체/회사지정" (DB ENUM)
- **결재 (3)** 팝업 UI 패러다임:
  - (a) `pages/board.html` `.write-view` 페이지 전환 → 팝업 오버레이로 변경 (라이브 회귀 ⚠️)
  - (b) 신규 `.write-overlay` 오버레이 추가 + 기존 `.write-view` 보존 (병행)
- **결재 (4)** 진입 순서:
  - (a) 인수 폼만 v0 (D-2) → 라이브 검증 → 상품/공지/기타 (D-3~D-5)
  - (b) 4종 폼 통째 v0 (B-3 마이그레이션 ~30~40분 포함)

---

## §8. Phase 3 진입 결재 항목 (영구 박힘)

다음 트리거 3건 모두 충족 시 Phase 3 진입:
1. Phase 2 (질문량 확인) 결과 = 본 트랙 본질 검증 완료
2. 보험사 임직원 가입자 발생 (`insurer_*` 역할 user 1명 이상)
3. 팀장님 결재 완료

**진입 시 박을 본질:**
- [ ] § 6-2 정책 3 v0 → v1 전환 (`insurer_target` 매칭)
- [ ] `target_insurer_ids` UUID[] 컬럼 신설 마이그레이션
- [ ] `insurer_target` CHECK ENUM 4종 박음
- [ ] `audience_target` CHECK ENUM 5종 박음
- [ ] `responder_hint` 컬럼 박음
- [ ] `notice_type` 컬럼 또는 `question_type` CHECK 확장
- [ ] UI 라벨 "이 질문이 [N개 보험사]에 보입니다" 가짜 → 실 연결 전환

---

## §9. 본 트랙 결정 6건 (어제 5/10 영구 박힘)

| # | 결정 | 박힘 |
|---|---|---|
| 1 | v0 본질 = "질문 생성 UX 검증" | 어제 5/10 결정 |
| 2 | 보험사 미러링 = 가짜 연결 (RLS 분기 X) | 어제 5/10 결정 |
| 3 | spec § 6-2 정책 3 = v0 비활성화 / Phase 3 본격화 | commit `a552923` + `ed3fbbf` |
| 4 | 인수 폼 = 라이브 6 컬럼 그대로 활용 (마이그레이션 0) | `db_v0_diagnosis_2026-05-10.md` L102 |
| 5 | 4종 폼 우선순위 = 공지(1) / 인수(2) / 상품(3) / 기타(4) | 어제 5/10 결정 |
| 6 | 두 차원 분기 = `insurer_target` (인수/상품) / `audience_target` (공지/기타) | 어제 5/10 결정 |

---

## §10. 본 문서 운영 원칙

### 진실 원천 우선
- 본 문서 ↔ 메모·코드 충돌 시 본 문서 우선 (네비방 글쓰기 v0 한정)
- 본 문서 ↔ 마스터 전략 v1 충돌 시 = 마스터 전략 v1 우선 (영업/사업 본질)
- 본 문서 ↔ OS 정의 v2 충돌 시 = OS 정의 v2 우선 (시스템 본질)
- 본 문서 ↔ db_v0_diagnosis 충돌 시 = 라이브 DB 본질 우선 (db_v0_diagnosis)

### 갱신 정책
- D-2 진입 시 = 결재 4건 박음 본문 갱신
- Phase 3 진입 시 = §8 항목 박음 박힌 결과 갱신
- 4종 폼 raw 본문 갱신 시 = 어제 5/10 채팅 본문 raw 보존

### 다음 AI에게
본 문서는 어제 2026-05-10 Claude AI 웹 채팅 본문이 sessions MD에는 1줄 요약만 박힌 상태로 본문이 잃어버릴 위험을 인지한 후 영구 보존 목적으로 신설됨.

**작업 진입 시 무조건:**
1. 본 문서 + 마스터 전략 v1 + `db_v0_diagnosis_2026-05-10.md` 통째 읽기
2. D-2 진입 결재 4건 박음 본질 인지
3. v0 vs Phase 3 분기 본질 정합 검증

**절대 하지 말 것:**
- 본 문서 §6 사고 위험 발견 시 회피 미박힘
- v0 단계 `insurer_target` 매칭 RLS 박음 (Phase 3 본질, v0 가짜 연결 박힌 본진 위반)
- 4종 폼 raw 본문 임의 변경 (어제 팀장님 결정 박힘)

---

**END OF DOCUMENT**

> 본 v0 문서는 네비게이션방 글쓰기 팝업 오버레이 본진 영구 진실 원천.
> 어제 2026-05-10 Claude AI 웹 채팅 본문 raw 박음 본질 보존.
> 마스터 전략 v1 § 13 결재 #1 ("Step 8 진입 전 spec 박음") 정합.
