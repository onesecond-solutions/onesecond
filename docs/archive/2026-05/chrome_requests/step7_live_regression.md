# Step 7 라이브 회귀 검수 의뢰서 (Chrome AI용)

> **일시:** 2026-05-10 (본 의뢰서 박음 시점)
> **본진:** Phase 1 Step 7 ✅ 종료 (board.html 4탭 → 7종 board_type 재구조화) commit `bf42874` + 핫픽스 `cb75988`
> **목적:** 라이브 회귀 9역할 × 7탭 노출 분기 검증 + RLS 정책 17건 정합 검증
> **검수자:** Claude in Chrome (라이브 사이트 로그인 시뮬레이션)
> **사이트:** https://onesecond.solutions

---

## 검수 배경

### Step 7 본진 박힘 (5/10 오후)
- board.html 4탭 (구) → 7종 board_type 재구조화
- 7종: `qna` / `manager_notice` / `manager_lounge` / `navigation` / `insurer` / `hub` / `archive_legacy`
- BOARD_LABEL / CATEGORIES / CAT_CLASS / `_boardTabVisible` 7종 정합 박힘
- question_type v1.x 박힘: 공지 / 상품 / 인수

### 5/10 오후 사고 학습 정합
- 라이브 사고 1: `*/` 토큰 multi-line 주석 조기 종료 → IIFE SyntaxError → window.* 30+ 함수 미등록
- 라이브 사고 2: "공개" 라벨 옛 4탭 잔재
- 처방: commit 직전 `node -e "new Function(scriptBlock)"` 표준 박음

### 본 의뢰서 박음 본질
- Step 7 라이브 회귀 격차 발견 위험 (사용자 영역 9역할 × 7탭 노출 분기 박힘 미검증)
- spec § 1-3 진입 동선 박힘 ↔ 라이브 `_boardTabVisible` 정합 검증
- 마스터 전략 §3 "보험사 게시판 존재 자체 모름" 박힘 ↔ spec § 1-3 insurer_* 노출 박힘 = 모순 박힘 (별도 결재 박스 박음 박힘)

---

## A. 9역할 × 7탭 노출 분기 매트릭스 (spec § 1-3 정합)

본 매트릭스 = **라이브 검수 기준값**. 라이브 결과 ↔ 본 매트릭스 차이 발견 시 사고 신호.

| role | 한국어 | 실장님 공지 | 매니저라운지 | 네비방 | 스마트 게시판 | 보험사게시판 | 허브 | archive_legacy |
|---|---|---|---|---|---|---|---|---|
| **admin** | 어드민 | ✅ | ✅ (토글 무관) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **ga_branch_manager** | 지점장/센터장 | ✅ | ✅ (토글 ON 시) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **ga_manager** | 실장 | ✅ | ✅ (토글 ON 시) | ✅ | ✅ | ❌ | ❌ | ❌ |
| **ga_member** | 설계사/팀장 | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **ga_staff** | 스텝/총무 | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **insurer_branch_manager** | 원수사 지점장 | ❌ | ❌ | ❌ | ✅ | ✅ ⚠️ | ❌ | ❌ |
| **insurer_manager** | 원수사 매니저 | ❌ | ❌ | ❌ | ✅ | ✅ ⚠️ | ❌ | ❌ |
| **insurer_member** | 원수사 일반 직원 | ❌ | ❌ | ❌ | ✅ | ✅ ⚠️ | ❌ | ❌ |
| **insurer_staff** | 원수사 스텝 | ❌ | ❌ | ❌ | ✅ | ✅ ⚠️ | ❌ | ❌ |

### ⚠️ 별 주의 박음 (insurer_* × 보험사게시판)

본 매트릭스 = **현 spec § 1-3 박힘** 기준.

마스터 전략 §3 박힘 = "보험사 게시판 존재 자체 모름" → insurer_* role도 보험사 게시판 비노출 본진 박힘.

→ **결재 박스 박음** (`docs/strategy/master_strategy_v1_alignment_2026-05-10.md` 결재 4):
- (가) spec § 1-3 박음 = insurer_* Phase 1 v0 한정 비노출 박음
- (나) admin_v2 D-1 토글 UI 박음 = "자발 입점 시점" 박음 (마스터 §5 5단계 자발 입점 흐름 정합)

→ **결재 후 본 매트릭스 박음** (`insurer_* × 보험사게시판 = ❌`).

---

## B. 검수 시나리오 9건

각 시나리오 = role 시뮬레이션 로그인 → `/pages/board.html` 진입 → 노출 탭 확인 → 본 매트릭스와 비교.

### B-1. admin 시뮬레이션
- 로그인: `bylts0428@gmail.com` (admin 본 계정)
- 진입: https://onesecond.solutions/pages/board.html
- 검수: 7탭 모두 노출 ✅
- 추가 검수: archive_legacy 탭 = admin only 박힘 정합

### B-2. ga_branch_manager 시뮬레이션
- 로그인: ga_branch_manager 시드 계정 (없으면 ga_member로 대체)
- 진입: 동일
- 검수: 실장님 공지 + 네비방 + 스마트 게시판 3탭 노출 (매니저라운지 = `manager_lounge_enabled` 토글 OFF 시 비노출)

### B-3. ga_manager 시뮬레이션 (실장)
- 동일 (B-2와 동일 노출)

### B-4. ga_member 시뮬레이션 (설계사)
- 실장님 공지 + 네비방 + 스마트 게시판 3탭 노출
- 매니저라운지 = ❌ (role 분기 비노출)

### B-5. ga_staff 시뮬레이션
- B-4와 동일

### B-6~B-9. insurer_* 4종 시뮬레이션
- 스마트 게시판 + 보험사게시판 2탭 노출 (현 spec § 1-3 박힘)
- ⚠️ **결재 4 박음 후 = 보험사게시판 비노출 박음**

### 라이브 시드 계정 박힘 박음

라이브 신버전 DB(`pdnwgzneooyygfejrvbg`) `public.users` 시드 박힘 박음 후 검수 박음. 시드 계정 부재 시 = `#51 public.posts 시드` 의뢰서 박음 본진과 통합 박음 (별도 박음).

---

## C. RLS 정책 17건 라이브 검증 SQL

**Supabase Dashboard SQL Editor 박음 (신버전 `pdnwgzneooyygfejrvbg`):**

```sql
-- C-1. RLS 정책 17건 박힘 박음
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'posts'
ORDER BY cmd, policyname;
```

**기대 결과:**
- SELECT 7건: posts_select_qna_seed_or_branch / navigation / insurer_employee / manager_notice / manager_lounge / hub / admin
- INSERT 7건: posts_insert_manager_notice / manager_lounge / navigation / insurer / admin_seed / hub / qna_system
- UPDATE 1건 + DELETE 1건 + ETC = 17건

**스마트 게시판 admin write-only 박힘 검증 (마스터 §13 결재 1):**

```sql
-- C-2. qna board_type INSERT 정책 박힘
SELECT policyname, cmd, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'posts'
  AND cmd = 'INSERT'
  AND policyname LIKE '%qna%' OR policyname LIKE '%admin_seed%';
```

**기대 결과:** `posts_insert_admin_seed` (admin only + source_type IN ('navigation_distilled', 'seed')) 박힘 ✅

**일반 사용자 qna 직접 INSERT 박힘 박음 박힘 (회귀 검증):**

```sql
-- C-3. (sandbox 시뮬레이션) ga_member role로 qna 직접 INSERT 시도
-- 실 박음 X (사고 위험), 본 SQL 박힘만 박음 박음
INSERT INTO public.posts (board_type, title, content, ...) VALUES ('qna', ...);
-- 기대: RLS 박힘 박힘 → INSERT 박힘 박힘 (오류 박힘)
```

→ 라이브 박음 박힘 박음 (실 박음 X). RLS 박힘 박음 = ✅ 박힘.

---

## D. board_type CHECK 박힘 검증

```sql
-- D-1. posts.board_type CHECK 박힘
SELECT
  con.conname,
  pg_get_constraintdef(con.oid) AS def
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'posts'
  AND con.conname LIKE '%board_type%';
```

**기대 결과:** CHECK ((board_type = ANY (ARRAY['qna', 'manager_notice', 'manager_lounge', 'navigation', 'insurer', 'hub', 'archive_legacy'])))

→ 7종 정합 박힘 (5/10 오후 라이브 진단 박힘 박힘 정합).

---

## E. board.html `_boardTabVisible` 박힘 검증

라이브 board.html L1271~ 박힘 박음:

```javascript
var _boardTabVisible = {
  qna:             true,
  manager_notice:  true,
  manager_lounge:  false,  // 토글 ON 시 true
  navigation:      true,
  insurer:         false,  // role 분기 (insurer_* 만 true)
  hub:             false,  // 토글 ON 시 true
  archive_legacy:  false   // admin only
};
```

**검수:**
- 9역할 × 7탭 박음 박힘 박음 후 = 본 매트릭스 박힘 정합 박음
- role 분기 박힘 = `setBoardTabsForRole` 함수 박힘 박음 박음 박음 (board.html grep 박음)

---

## F. 사고 신호 박음 (즉시 보고)

다음 박힘 발견 시 검수 중단 + 즉시 보고:

1. **9역할 × 7탭 노출 박힘 ↔ 본 매트릭스 차이 박힘**
2. **insurer_* role에 실장님 공지 / 매니저라운지 / 네비방 / 허브 / archive_legacy 노출 박힘**
3. **ga_* role에 보험사게시판 / 허브 / archive_legacy 노출 박힘**
4. **board_type CHECK 7종 ↔ 라이브 SELECT 결과 차이**
5. **RLS 정책 17건 ↔ 라이브 결과 차이 박힘**
6. **window.switchBoard / window.\* 함수 미등록 박힘** (5/10 오후 syntax 사고 패턴 정합 — 회귀 박힘)

---

## G. 검수 결과 박힘 박음 (Chrome AI 박음 박힘)

본 의뢰서 박음 박힘 후 박음 = `docs/architecture/step7_live_regression_chrome_result_2026-05-10.md` 신설 박음.

박음 본진:
- 9 시나리오 × 7탭 박힘 박음 박힘 결과 표
- RLS 정책 17건 SELECT 결과 raw 박음
- board_type CHECK 박음 raw 박음
- `_boardTabVisible` 박음 박음 결과 박음
- 사고 신호 박음 박힘 박음 (있으면)
- PASS / FAIL / WARN 박음

---

## H. 본 의뢰서 박힘 박음

- **신설:** `docs/architecture/step7_live_regression_chrome_request_2026-05-10.md` (본 박음)
- **결과 박음 박힘 박음:** `docs/architecture/step7_live_regression_chrome_result_2026-05-10.md` (Chrome AI 박음)
- **연관 박음 박힘:**
  - `docs/strategy/master_strategy_v1_alignment_2026-05-10.md` (결재 4 박힘 박음 박힘)
  - `docs/sessions/_INDEX.md` 박힘 (Step 7 박힘 박음)
  - `docs/specs/v2_insurer_admission_phase1_v2.md` § 1-3 + § 6-2 박힘

---

**END OF REQUEST**

> 본 박음 = Chrome AI 라이브 검수 의뢰서. Code 박음 박힘 0 (라이브 코드 변경 0).
> 검수 결과 박힘 박음 후 = Code 박힘 박음 박힘 박음 (사고 박음 박힘 발견 시 핫픽스 박음).
