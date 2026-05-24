# admin_v2 Phase D-9 Step 1.6 — Storage RLS 청산 트랜잭션 Chrome 위임 의뢰서

> **작성일:** 2026-05-05
> **작성자:** Claude Code
> **대상:** 팀장님 (Chrome 브라우저 + Supabase Dashboard SQL Editor 직접 실행)
> **선행 산출물:**
> - 작업지시서: `docs/specs/admin_v2_d9_workorder.md` (241줄, Q-1~Q-8 일괄 (a) 승인)
> - Step 1 의뢰서: `docs/specs/admin_v2_d9_step1_chrome_request_2026-05-05.md` (335줄, 회신 완료)
> - Step 1 capture: `docs/architecture/db_d9_step1_capture.md` (192줄, 발견 3건)
> - 후속 SQL 의뢰서: `docs/specs/admin_v2_d9_step1_followup_chrome_request_2026-05-05.md`
> - Q-10 결재 (2026-05-05): **(a) 채택** — Step 1.6 신설, admin 3정책 is_admin() 가드 추가 + 범용 정책 1apfxtf_0 폐기 (1 트랜잭션, DROP 4 + CREATE 3)
> **목적:** Storage objects RLS 정책 보안 부채 청산 — admin 3정책 `is_admin()` 가드 추가 + 범용 정책 폐기. D-pre.8 sweep Storage 누락 보강 (D-4 K-1 / D-6 admin_read_all_logs 패턴 정합).
> **소요 시간:** ~10분 (사전 검증 + 트랜잭션 실행 + 사후 검증)
> **위험도:** 🟡 중간 — RLS 정책 변경. 트랜잭션 + 사후 검증 + ROLLBACK 옵션으로 안전 확보.

---

## 0. 큰 그림 정합성 검증

본 의뢰서는 D-9 Step 1 capture § 2 발견 #3 + Q-10 (a) 결재 후 Storage RLS 청산을 Chrome 위임 형식으로 분리한 것입니다.

### 청산 대상

Step 1 capture § 1 ⑥ Storage objects RLS 정책 6개 raw:

| # | policyname | cmd | qual | with_check | 처리 |
|:--:|---|---|---|---|---|
| 1 | Allow public read 1apfxtf_0 | SELECT | true | NULL | **보존** (다른 버킷 영향 0) |
| 2 | Allow authenticated uploads 1apfxtf_0 | INSERT | NULL | true | 🔴 **DROP** (모든 버킷 INSERT 허용 — 보안 취약) |
| 3 | admin can delete banners | DELETE | bucket_id only | NULL | 🔴 **DROP + CREATE 새** (`is_admin()` 가드 추가) |
| 4 | admin can update banners | UPDATE | bucket_id only | NULL | 🔴 **DROP + CREATE 새** (`is_admin()` 가드 추가) |
| 5 | admin can upload banners | INSERT | NULL | bucket_id only | 🔴 **DROP + CREATE 새** (`is_admin()` 가드 추가) |
| 6 | public can view banners | SELECT | bucket_id only | NULL | **보존** (onesecond_banner 공개 read) |

→ **DROP 4 + CREATE 3** = 1 트랜잭션 (BEGIN ... COMMIT)

### 영향 범위

- **사용자 페이지 영향 0** — 9역할 일반 사용자는 onesecond_banner에 직접 업로드 경로 없음 (admin 화면설정 탭에서만 업로드)
- **admin 영향 0** — admin 본인은 `is_admin()` 통과로 INSERT/UPDATE/DELETE 그대로 가능
- **보안 청산** — 다른 9역할이 onesecond_banner 또는 다른 버킷에 임의 INSERT 차단

---

## 1. 🚨 진입 전 필수 확인 (CLAUDE.md 강제)

**Chrome 브라우저로 Supabase Dashboard 진입 직후, SQL 실행 전에 반드시 확인:**

### 1-1. 프로젝트 식별 확인

다음 중 **하나라도 일치**하면 신버전 DB 정합:

- ✅ Dashboard 왼쪽 상단 프로젝트명 표시 = **`onesecond-v1-restore-0420`**
- ✅ 브라우저 URL에 **`pdnwgzneooyygfejrvbg`** 포함

### 1-2. 구버전 진입 시 즉시 중단

- ❌ 프로젝트명 = `qursjteiovcylqiepmlo` 또는 옛 프로젝트명
- ❌ URL에 `qursjteiovcylqiepmlo` 포함

**구버전 진입 시 절대 SQL 실행 금지** — 2026-04-22~23 데이터 소실 사고 재발 방지.

### 1-3. 신버전 직접 진입 URL

```
https://supabase.com/dashboard/project/pdnwgzneooyygfejrvbg/sql/new
```

---

## 2. Step A — 사전 검증 SQL 2건 (DB 변경 0건)

> 트랜잭션 진입 전 다른 버킷·정책 영향 raw 확인. SELECT만 실행.

### A-1. 모든 Storage 버킷 raw

```sql
SELECT id, name, public, created_at
FROM storage.buckets
ORDER BY created_at;
```

**기대 raw:** Step 1 capture에서 `onesecond_banner` 1행 확인. 다른 버킷이 있으면 본 정책 변경의 영향 범위 검토 필요.

**분기 protocol:**
- `onesecond_banner` 1개만 → 트랜잭션 안전 진입 가능
- 다른 버킷 N개 추가 → 회신 후 Code가 영향 범위 재분석 (예: 다른 버킷이 범용 정책 1apfxtf_0에 의존 중이면 별도 정책 신설 필요)

### A-2. storage.objects RLS 정책 raw 재확인 (Step 1 capture § 1 ⑥ 정합 회귀)

```sql
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='storage' AND tablename='objects'
ORDER BY policyname;
```

**기대값 (Step 1 capture 정합):** 6행. 위 § 0 표 6개 정책 그대로.

**분기 protocol:**
- 6행 정합 → 트랜잭션 안전 진입 가능
- 6행 외 추가/누락 → 회신 후 Code가 트랜잭션 SQL 갱신

---

## 3. Step B — 트랜잭션 실행 (DROP 4 + CREATE 3, 1 BEGIN ... COMMIT)

> **주의:** 본 트랜잭션은 BEGIN ... 사후 검증 ... COMMIT 패턴. 사후 검증 결과 비정합 시 **COMMIT 대신 ROLLBACK** 가능.

### B-1. 트랜잭션 SQL

```sql
BEGIN;

-- ========================================
-- DROP 4: 보안 부채 정책 + 재생성 대상 정책
-- ========================================

-- 1) 범용 정책 폐기 (모든 버킷 INSERT 허용 부채)
DROP POLICY IF EXISTS "Allow authenticated uploads 1apfxtf_0" ON storage.objects;

-- 2~4) admin 3정책 폐기 (is_admin() 가드 부재)
DROP POLICY IF EXISTS "admin can delete banners" ON storage.objects;
DROP POLICY IF EXISTS "admin can update banners" ON storage.objects;
DROP POLICY IF EXISTS "admin can upload banners" ON storage.objects;

-- ========================================
-- CREATE 3: admin 3정책 재생성 (is_admin() 가드 추가)
-- ========================================

-- 1) admin DELETE
CREATE POLICY "admin can delete banners" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'onesecond_banner'
  AND public.is_admin()
);

-- 2) admin UPDATE
CREATE POLICY "admin can update banners" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'onesecond_banner'
  AND public.is_admin()
)
WITH CHECK (
  bucket_id = 'onesecond_banner'
  AND public.is_admin()
);

-- 3) admin INSERT
CREATE POLICY "admin can upload banners" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'onesecond_banner'
  AND public.is_admin()
);

-- ========================================
-- 사후 검증 SELECT (트랜잭션 안에서 실행)
-- ========================================

-- 검증 1: 정책 5건 정합 (DROP 4 + CREATE 3 → 6 - 4 + 3 = 5건)
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='storage' AND tablename='objects'
ORDER BY policyname;

-- 검증 2: admin 3정책 모두 is_admin() 가드 정합
SELECT policyname, cmd,
  (qual ILIKE '%is_admin()%' OR with_check ILIKE '%is_admin()%') AS has_is_admin_guard
FROM pg_policies
WHERE schemaname='storage' AND tablename='objects'
  AND policyname LIKE 'admin can %'
ORDER BY policyname;

-- 검증 3: 범용 정책 1apfxtf_0 폐기 회귀 (0행 기대)
SELECT policyname FROM pg_policies
WHERE schemaname='storage' AND tablename='objects'
  AND policyname = 'Allow authenticated uploads 1apfxtf_0';

-- ========================================
-- COMMIT 또는 ROLLBACK (사후 검증 결과에 따라 분기)
-- ========================================

-- 모든 검증 정합 시:
COMMIT;

-- 비정합 발견 시 (위 COMMIT 대신):
-- ROLLBACK;
```

### B-2. 사후 검증 기대값

#### 검증 1 — 정책 5건 정합

```
policyname                              | cmd    | roles            | qual                                           | with_check
────────────────────────────────────────┼────────┼──────────────────┼────────────────────────────────────────────────┼────────────────────────────────────────────────
Allow public read 1apfxtf_0             | SELECT | {public}         | true                                           | NULL
admin can delete banners                | DELETE | {authenticated}  | (bucket_id = 'onesecond_banner' AND is_admin()) | NULL
admin can update banners                | UPDATE | {authenticated}  | (bucket_id = 'onesecond_banner' AND is_admin()) | (bucket_id = 'onesecond_banner' AND is_admin())
admin can upload banners                | INSERT | {authenticated}  | NULL                                           | (bucket_id = 'onesecond_banner' AND is_admin())
public can view banners                 | SELECT | {public}         | (bucket_id = 'onesecond_banner')               | NULL
```

총 5행. `Allow authenticated uploads 1apfxtf_0` 부재.

#### 검증 2 — admin 3정책 is_admin() 가드 정합

```
policyname                | cmd    | has_is_admin_guard
──────────────────────────┼────────┼────────────────────
admin can delete banners  | DELETE | t
admin can update banners  | UPDATE | t
admin can upload banners  | INSERT | t
```

총 3행, `has_is_admin_guard` 모두 `t` (true).

#### 검증 3 — 범용 정책 폐기 회귀

```
(0 rows)
```

폐기 정합.

---

## 4. Step C — 라이브 회귀 검증 (트랜잭션 COMMIT 후, 별도 SQL)

> **주의:** 본 검증은 트랜잭션 밖. COMMIT 완료 후 별도 SQL Editor 세션에서 실행.

### C-1. 정책 5건 안정 회귀

```sql
SELECT COUNT(*) AS total_policies,
  SUM(CASE WHEN policyname LIKE 'admin can %' THEN 1 ELSE 0 END) AS admin_policies,
  SUM(CASE WHEN policyname LIKE 'Allow authenticated uploads%' THEN 1 ELSE 0 END) AS legacy_remnant
FROM pg_policies
WHERE schemaname='storage' AND tablename='objects';
```

**기대값:** total_policies = 5, admin_policies = 3, legacy_remnant = 0

### C-2. is_admin() 함수 회귀 검증 (D-pre.7 SECURITY DEFINER 정합)

```sql
SELECT proname, prosecdef AS security_definer, provolatile
FROM pg_proc
WHERE proname = 'is_admin' AND pronamespace = 'public'::regnamespace;
```

**기대값:** `prosecdef = t` (SECURITY DEFINER), `provolatile = 's'` (STABLE) — D-pre.7 정합.

---

## 5. 결과 raw 보고 형식

각 Step 결과 raw 채팅 회신:

### Step A 결과

**A-1. 모든 버킷 raw:**
```
id               | name             | public | created_at
─────────────────┼──────────────────┼────────┼─────────────────────
onesecond_banner | onesecond_banner | true   | 2026-04-16 ...
... (있다면 추가 raw)
```

**A-2. storage.objects RLS 정책 6개 raw:**
```
(Step 1 capture § 1 ⑥과 정합 또는 차이 raw 그대로)
```

### Step B 결과 (트랜잭션 안 사후 검증 3건)

**검증 1 — 정책 5건:**
```
(raw 그대로)
```

**검증 2 — admin 3정책 is_admin() 가드:**
```
(raw 그대로)
```

**검증 3 — 범용 정책 폐기 회귀:**
```
(0 rows 또는 raw)
```

→ **COMMIT 결정: ✅ COMMIT 실행 / ❌ ROLLBACK 실행 (이유 명시)**

### Step C 결과 (COMMIT 후 별도 회귀)

**C-1. 정책 카운트:**
```
total_policies | admin_policies | legacy_remnant
───────────────┼────────────────┼────────────────
5              | 3              | 0
```

**C-2. is_admin() 함수 회귀:**
```
proname  | security_definer | provolatile
─────────┼──────────────────┼─────────────
is_admin | t                | s
```

---

## 6. 분기 결정 protocol

### Case 1 — 모든 검증 정합 → COMMIT

→ Step 2 진입 (`js/admin_v2.js` settings 섹션 12함수 신설)
→ Code가 본 의뢰서 결과 raw → capture 갱신 (`docs/architecture/db_d9_step1_capture.md` § 2 발견 #3 청산 명시 + 영구 학습 #1 갱신)
→ Code가 D-pre.8 sweep Storage 보강 학습 영구 메모리 등록 후보 (Storage RLS 전수 sweep 표준화)

### Case 2 — Step A 비정합 (다른 버킷 추가 발견 등)

→ ROLLBACK 또는 트랜잭션 미진입
→ 결과 raw 회신 후 Code가 트랜잭션 SQL 갱신 + 영향 범위 재분석
→ 갱신 의뢰서 재발행

### Case 3 — Step B 사후 검증 비정합

→ **ROLLBACK 즉시 실행** (BEGIN 안에 있으므로 변경사항 모두 무효)
→ 결과 raw 회신 후 Code가 원인 분석
→ 갱신 트랜잭션 SQL 재발행

### Case 4 — Step C 사후 회귀 비정합 (드물게)

→ 즉시 보고 + Step 2 진입 차단
→ Code가 후속 트랜잭션 SQL 재발행

---

## 7. 안전 protocol

### 7-1. 트랜잭션 실행 중 오류 발생 시

- BEGIN 안에서 어느 SQL이든 오류 → 자동 롤백 상태 (PostgreSQL 트랜잭션 특성)
- 오류 메시지 raw 복사 + 어떤 단계에서 오류인지 명시 → 회신
- DB 상태 변경 0건 (자동 롤백) — 추가 작업 불필요

### 7-2. 사후 검증 비정합 발견 시

- COMMIT 대신 **ROLLBACK** 즉시 실행 (위 SQL 마지막 주석 참조)
- 검증 결과 raw 회신 → Code가 원인 분석

### 7-3. 신버전 진입 확인 의심 시

→ 즉시 § 1 재실행. 90% 확률로 구버전 진입 가능성.

### 7-4. 트랜잭션 실행 중 다른 admin/사용자 동시 접근 시

- D-9는 admin 본인 운영 트랙 → 동시 접근 가능성 거의 0
- 만일 충돌 발생 시 PostgreSQL row lock으로 자연 직렬화. 안전.

---

## 8. 영구 학습 후보 (트랜잭션 COMMIT 후 누적)

> Step C 회귀 통과 후 본 § 8에 학습 raw 누적.

### 학습 #1 (예상) — Storage RLS sweep 표준화 (D-pre.8 누락 보강)

D-pre.8 sweep은 public schema 인라인 EXISTS만 청산. **storage.objects RLS는 sweep 범위 밖**이라 옛 v1 시점 admin 3정책 (`bucket_id` 체크만, is_admin() 가드 부재) 잔존. Step 1.6 청산으로 onesecond_banner 정합. 다른 버킷 신설 시 동일 패턴 발생 가능.

→ **D-final P-* 시점 또는 별 트랙 Storage RLS 전수 sweep 1회 추가** 필수. is_admin() 가드 패턴을 Storage 정책 표준으로 채택.

---

## 9. 다음 단계 (회신 후 Code 진행)

1. Code가 본 결과 raw → capture 갱신 (§ 2 발견 #3 청산 명시 + § 영구 학습 갱신)
2. (Q-9 추가 SQL 회신 후) Step 2 진입 — `js/admin_v2.js` settings 섹션 12함수 신설 (~480~520줄)
3. Step 3 — `pages/admin_v2.html` settings 섹션 HTML/CSS 신설
4. Step 4 — `css/tokens.css` 신규 토큰 5종 5톤 추가
5. Step 5 — 라이브 회귀 의뢰서 발행 (Chrome 위임)

---

*본 의뢰서는 D-9 Step 1 capture § 2 발견 #3 + Q-10 (a) 결재 후 Storage RLS 청산을 Chrome 위임 형식으로 분리. 회신 후 Code가 capture 갱신 + Step 2 진입 즉시 결정.*
