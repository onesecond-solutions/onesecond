# D-1 Step 1 사전 검증 캡처 — public.users 테이블

> **작성일:** 2026-05-03
> **선행 산출물:** `docs/specs/admin_v2_d1_workorder.md` (D-1 작업지시서 § Step 1)
> **목적:** D-1 진입 전 정합성 검증 raw 보존 (D-pre.6 학습: 정의 raw + 실 동작 이중 검증)
> **신버전 확인:** Supabase Dashboard `onesecond-v1-restore-0420` (`pdnwgzneooyygfejrvbg`) ✅

---

## 1. SQL 6블록 결과 raw

### S-0 신버전 재확인
```json
{ "db_name": "postgres" }
```
→ Supabase 표준 DB명. 별도로 Dashboard 표시 + URL ID 모두 신버전 확인 ✅

### S-1 users 테이블 role 분포
| role | row_count |
|---|---:|
| admin | 1 |

→ **총 1행만 존재** (admin 본 계정). 신버전 4/20 복원 후 새 시작점.

### S-2 9역할 외 잔존 row 검증
```
결과 없음 (0 row)
```
→ ✅ **레거시 5역할 잔존 0건** — Phase 1 마이그레이션 불필요.

### S-3 D-pre.5 신컬럼 정합
| active | suspended | pending | status_null | last_seen_set | last_seen_null |
|---:|---:|---:|---:|---:|---:|
| 1 | 0 | 0 | 0 | 0 | 1 |

→ ✅ status='active' 1건 / NULL 0건 (D-pre.5 마이그레이션 정합)
→ last_seen_at은 admin 미접속(또는 트리거 미실행)으로 NULL

### S-4 users 테이블 RLS 정책 raw
| policyname | cmd | roles | using_clause | with_check_clause |
|---|---|---|---|---|
| user insert own | INSERT | {authenticated} | NULL | (auth.uid() = id) |
| admin_select_all_users | SELECT | {public} | is_admin() | NULL |
| user read own | SELECT | {public} | (auth.uid() = id) | NULL |
| admin_update_all_users | UPDATE | {public} | is_admin() | is_admin() |
| user update own | UPDATE | {authenticated} | (auth.uid() = id) | NULL |

→ ✅ 5개 정책 정합. admin 정책 모두 `is_admin()` SECURITY DEFINER 패턴 (D-pre.7 학습)
→ ⚠️ DELETE 정책 부재 — D-1 무관, 차후 발견 사항 #2

### S-5 admin 본 계정
| 컬럼 | 값 |
|---|---|
| id | de7ba389-901a-426a-9828-6afb33a16ecc |
| email | bylts0428@gmail.com |
| role | admin |
| plan | free |
| name | 어드민 |
| company | 원세컨드 |
| branch | 더촛지점 |
| team | admin |
| status | active |
| created_at | 2026-04-07 05:40:36.95325+00 |
| last_seen_at | NULL |

→ ✅ D-pre.6 정정 결과 그대로 (name='어드민' 정합)

---

## 2. Code grep 결과

| 파일 | 라인 | ROLE_LABEL 상태 |
|---|---|---|
| `js/db.js` | 126~136 | 9역할만 정의 (5역할 fallback 부재) |
| `js/auth.js` | 100~104 | window.ROLE_LABEL fallback 9역할 정합 |
| `js/scripts-page.js` | 281~282 | 사용처만 (`window.ROLE_LABEL[u.role]`) |
| `pricing.html` | 225~ | 자체 정의 9역할 (별 트랙 부채) |

→ ✅ js/db.js와 DB 9역할 완전 정합 (5역할 잔존 0이므로 fallback 불필요)

### admin_v2.html mock 영역 raw

| 라인 | 내용 |
|:--:|---|
| 1496 | `[Phase C mock]` 라벨 |
| 1511 / 1519 / 1527 | KPI 3카드 mock 값 (1,284 / 487 / 47) |
| 1538~1548 | 9역할 칩 + 하드코딩 카운트 |
| 1562 | "전체 1,284명 · 1~10행 표시 · Phase C mock" 메타 |
| 1579~ | 테이블 10행 |

→ Step 5에서 mock 제거 + 동적 슬롯 ID 부여 대상 모두 확인

---

## 3. 정합성 판정

### ✅ 종합 판정: (가) 그대로 — Step 2·3·7 스킵, Step 4 즉시 진입

| Step | 갱신 |
|---|---|
| Step 1 사전 검증 | ✅ 완료 (본 캡처) |
| Step 2 Phase 1 마이그레이션 SQL | 🟢 **스킵** (S-2 결과 잔존 0) |
| Step 3 js/db.js Step A (fallback 추가) | 🟢 **스킵** (이미 9역할만) |
| **Step 4** js/admin_v2.js 신설 | 🟢 **즉시 진입 (다음 세션)** |
| Step 5 admin_v2.html mock 제거 + 연결 | 다음 세션 |
| Step 6 라이브 회귀 검증 17항목 | 다음 세션 |
| Step 7 js/db.js Step B (fallback 제거) | 🟢 **스킵** (Step 3 스킵 정합) |

### 검증 결과 핵심

| # | 항목 | 결과 |
|:--:|---|:--:|
| 1 | Phase 1 마이그레이션 필요성 | ❌ 불필요 |
| 2 | js/db.js 9역할 정합 | ✅ |
| 3 | RLS D-pre.7/8 청산 회귀 | ✅ |
| 4 | D-pre.5 신컬럼 정합 | ✅ |
| 5 | admin 본 계정 정합 | ✅ |
| 6 | RLS 정책 5개 정상 범위 | ✅ |

### ⚠️ 발견 사항 2건 (D-1 무관, 별 트랙)

| # | 항목 | 영향 | 권장 |
|:--:|---|---|---|
| 1 | users 테이블 1명만 (admin) | D-1 작업 영향 0, 시연 가치 ↓ | 별 트랙 — seed data 또는 테스트 사용자 추가 |
| 2 | DELETE 정책 부재 | D-1 영향 0 | D-final 또는 사용자 삭제 기능 추가 시 신설 |

---

## 4. 다음 세션 진입 시 첫 액션

1. 본 캡처 + `docs/specs/admin_v2_d1_workorder.md` 읽기
2. **Step 4 — `js/admin_v2.js` 신설** 즉시 진입 (작업지시서 § Step 4-2 코드 골격 채택)
3. Step 5 — admin_v2.html mock 제거 + js 연결
4. Step 6 — 라이브 회귀 검증 17항목

---

*본 캡처는 D-1 진입 전 baseline 보존. 라이브 회귀 검증 시 본 raw와 대조 사용.*
