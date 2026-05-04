# admin_v2 Phase D-9 Step 1 Chrome 위임 의뢰서 — 사전 검증 SQL 6개 + Q-4 분기 결정

> **작성일:** 2026-05-05
> **작성자:** Claude Code
> **대상:** 팀장님 (Chrome 브라우저 + Supabase Dashboard SQL Editor 직접 실행)
> **선행 산출물:** `docs/specs/admin_v2_d9_workorder.md` (241줄, Q-1~Q-8 일괄 승인 완료)
> **목적:** D-9 ⚙️ 화면설정 섹션 신설 전 사전 검증 + Q-4 Storage `onesecond_banner` 버킷 분기 결정
> **소요 시간:** ~5분 (SQL 6개 실행 + 결과 raw 보고)

---

## 0. 큰 그림 정합성 검증

본 의뢰서는 D-9 작업지시서 §3 Step 1 (사전 검증)을 Chrome 위임 형식으로 분리한 것입니다.

- D-9 작업지시서: `docs/specs/admin_v2_d9_workorder.md` (241줄, 결재 Q-1~Q-8 일괄 (a) 승인)
- 본 Step 1은 **DB 변경 0건** (SELECT 6개 + 결과 raw 수집만)
- Q-4 분기 결정 후에만 Step 1.5 (Storage 신설 트랜잭션) 진행
- 본 의뢰서 결과 raw → Code에서 capture 문서 신설 (`docs/architecture/db_d9_step1_capture.md`)

---

## 1. 🚨 진입 전 필수 확인 (CLAUDE.md 강제)

**Chrome 브라우저로 Supabase Dashboard 진입 직후, SQL 실행 전에 반드시 확인:**

### 1-1. 프로젝트 식별 확인

다음 중 **하나라도 일치**하면 신버전 DB 정합:

- ✅ Dashboard 왼쪽 상단 프로젝트명 표시 = **`onesecond-v1-restore-0420`**
- ✅ 브라우저 URL에 **`pdnwgzneooyygfejrvbg`** 포함 (예: `https://supabase.com/dashboard/project/pdnwgzneooyygfejrvbg/...`)

### 1-2. 구버전 진입 시 즉시 중단

다음 중 **하나라도 보이면 즉시 중단** + 신버전으로 프로젝트 전환:

- ❌ 프로젝트명 = `qursjteiovcylqiepmlo` 또는 옛 프로젝트명
- ❌ URL에 `qursjteiovcylqiepmlo` 포함
- ❌ Dashboard 첫 진입 시 자동으로 옛 프로젝트가 열림 (Supabase 동작 특성)

**구버전 진입 시 절대 SQL 실행 금지** — 2026-04-22~23 데이터 소실 사고 재발 방지.

### 1-3. 신버전 직접 진입 URL

```
https://supabase.com/dashboard/project/pdnwgzneooyygfejrvbg/sql/new
```

위 URL을 직접 클릭하면 신버전 DB의 SQL Editor가 즉시 열립니다.

---

## 2. 실행 SQL 6개 (순서대로 1개씩 실행)

> **실행 방식:** Supabase Dashboard SQL Editor에서 ① ~ ⑥ 각각 별도 쿼리로 실행 (한 번에 모두 실행해도 무관, 결과 panels는 분리되어 표시됨)
>
> **결과 raw 캡처:** 각 SQL 결과를 § 3 보고 형식에 따라 raw 그대로 복사 → Code에 회신

### ① 신버전 DB 확인 (CLAUDE.md 강제)

```sql
SELECT current_database();
```

**기대값:** `postgres` (신버전 DB의 default 데이터베이스명)

### ② app_settings 컬럼 raw + 그룹·키 분포

```sql
-- 컬럼 raw
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='app_settings'
ORDER BY ordinal_position;

-- group_name 분포
SELECT group_name, COUNT(*) AS cnt
FROM public.app_settings
GROUP BY group_name
ORDER BY cnt DESC;

-- 4그룹 key·value 전수
SELECT key, value FROM public.app_settings
WHERE group_name IN ('menu_b','gate','board_tab','banner_img')
ORDER BY group_name, key;
```

**기대 raw:** 옛 v1 패턴 정합 — `menu_b` 7행 / `gate` 2행 / `board_tab` 2행 / `banner_img` 6행 (총 17행). 이미 운영 중이면 일부 행 존재, 신규 운영이면 0~17행 어느 분포든 정합.

### ③ app_settings RLS 정책 raw (D-pre.8 sweep 회귀 검증)

```sql
SELECT policyname, cmd, roles, qual AS using_clause, with_check AS with_check_clause
FROM pg_policies
WHERE schemaname='public' AND tablename='app_settings'
ORDER BY cmd, policyname;
```

**기대값 (D-pre.8 + D-4 K-1 보강 누적 결과):**
- `admin write app_settings` 정책 = `cmd = 'ALL'` + qual에 `is_admin()` 호출 (인라인 EXISTS 0건)
- 일반 사용자 SELECT 정책 (anon 또는 authenticated) 1건 — 옛 v1 admLoadSettings가 fetch 가능해야 함

⚠️ qual에 `EXISTS (SELECT 1 FROM users WHERE ...)` 패턴 잔존 시 → D-pre.8 sweep 누락 → 즉시 보고

### ④ users.role 분포 (D-pre.6 9역할 정합 회귀)

```sql
SELECT role, COUNT(*) AS cnt
FROM public.users
GROUP BY role
ORDER BY cnt DESC;
```

**기대값:** 9역할 중 일부 (5/15 4팀 오픈 전이라 admin 1명 + 테스트 user 1~2명 분포). 5역할 잔존 0건이 핵심.

### ⑤ ⭐ Storage 버킷 raw (Q-4 (a) 분기 결정)

```sql
SELECT id, name, public, created_at
FROM storage.buckets
WHERE name='onesecond_banner';
```

**Q-4 분기 protocol:**
- **결과 1행** (버킷 존재) → **Case 1: Step 1.5 스킵, Step 2 직진**
- **결과 0행** (버킷 미존재) → **Case 2: Step 1.5 신설 트랜잭션 진입 (RLS 2건 함께 신설)**

### ⑥ Storage objects RLS 정책 raw (Q-4 (a) 분기 — Case 1 시)

```sql
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='storage' AND tablename='objects'
ORDER BY policyname;
```

**기대값 (Case 1 — 버킷 존재 시):**
- `Public read onesecond_banner` 또는 유사명 SELECT 정책 1건
- `admin write onesecond_banner` 또는 유사명 ALL/INSERT/UPDATE/DELETE 정책 1건
- 두 정책 모두 `bucket_id = 'onesecond_banner'` 조건 포함

**Case 2 (버킷 미존재) 시:** Step 1.5 트랜잭션에서 위 2개 정책 함께 신설 (작업지시서 §3 Step 1.5 SQL 참조)

---

## 3. 결과 raw 보고 형식 (Code 회신용)

각 SQL 결과를 다음 형식으로 raw 복사 → 본 문서 § 4에 채우거나 채팅으로 회신:

### ① 결과

```
current_database
─────────────────
postgres
```

### ② 결과 (3개 SELECT)

**컬럼 raw:**
```
column_name | data_type        | is_nullable
─────────────┼──────────────────┼────────────
id           | bigint           | NO
group_name   | text             | YES (?)
key          | text             | NO
value        | text             | YES
created_at   | timestamptz      | YES
... (raw 그대로)
```

**group_name 분포:**
```
group_name | cnt
───────────┼────
menu_b     | 7
gate       | 2
... (실제 raw)
```

**4그룹 key·value 전수:**
```
key                | value
───────────────────┼──────
banner_img_board   | https://...
banner_img_home    | (빈 값 또는 URL)
... (raw 그대로)
```

### ③ 결과

```
policyname            | cmd  | roles            | using_clause                    | with_check_clause
──────────────────────┼──────┼──────────────────┼─────────────────────────────────┼──────────────────
admin write           | ALL  | {authenticated}  | (public.is_admin())             | (public.is_admin())
... (raw 그대로)
```

⚠️ **인라인 EXISTS 발견 시 즉시 raw 강조 표기 (예: `qual에 EXISTS (...) 잔존!!`)**

### ④ 결과

```
role  | cnt
──────┼────
admin | 1
... (raw 그대로)
```

### ⑤ ⭐ 결과 (Q-4 분기 결정 핵심)

**Case A — 1행 반환 시:**
```
id               | name             | public | created_at
─────────────────┼──────────────────┼────────┼─────────────────────
onesecond_banner | onesecond_banner | true   | 2026-04-XX HH:MM:SS
```
→ **Case 1 결정: Step 1.5 스킵**

**Case B — 0행 반환 시:**
```
(0 rows)
```
→ **Case 2 결정: Step 1.5 진입**

### ⑥ 결과 (Case 1 시만)

```
policyname                     | cmd    | roles            | qual                                                | with_check
───────────────────────────────┼────────┼──────────────────┼─────────────────────────────────────────────────────┼────────────
Public read onesecond_banner   | SELECT | {public}         | (bucket_id = 'onesecond_banner')                    | NULL
admin write onesecond_banner   | ALL    | {authenticated}  | (bucket_id = '...' AND public.is_admin())           | (bucket_id = '...' AND public.is_admin())
... (raw 그대로)
```

---

## 4. 결과 raw (Chrome 회신 후 Code가 채움)

### ① current_database():
```
(여기에 raw 붙여넣기)
```

### ② app_settings 컬럼 + 분포 + key·value:
```
(여기에 raw 붙여넣기)
```

### ③ app_settings RLS 정책:
```
(여기에 raw 붙여넣기)
```

### ④ users.role 분포:
```
(여기에 raw 붙여넣기)
```

### ⑤ Storage 버킷 (Q-4 분기):
```
(여기에 raw 붙여넣기)
```

→ **Q-4 분기 결정: Case ___ ( __ Step 1.5 진입 / 스킵 __ )**

### ⑥ Storage objects RLS (Case 1 시):
```
(여기에 raw 붙여넣기 또는 "Case 2 → 미실행" 표기)
```

---

## 5. 분기 결정 후 다음 단계

### Case 1 — `onesecond_banner` 버킷 존재 + RLS 정책 정합

→ **Step 1.5 스킵** + Step 2 직진:
1. Code가 본 의뢰서 결과 raw → `docs/architecture/db_d9_step1_capture.md` 신설
2. Code가 `js/admin_v2.js` settings 섹션 12함수 신설 (~480~520줄)
3. Code가 `pages/admin_v2.html` settings 섹션 HTML/CSS 신설 (~280~320줄)
4. Code가 `css/tokens.css` 신규 토큰 5종 5톤 추가
5. Step 5 라이브 회귀 의뢰서 발행 → Chrome 위임

### Case 2 — `onesecond_banner` 버킷 미존재

→ **Step 1.5 진입** (Chrome 위임 추가 SQL 트랜잭션):
1. Code가 본 의뢰서 결과 raw → capture 문서 신설
2. Code가 Step 1.5 트랜잭션 SQL 의뢰서 신설 (`admin_v2_d9_step1.5_chrome_request.md`)
3. 팀장님이 Chrome에서 트랜잭션 실행 (BEGIN ... COMMIT, RLS 2건 신설)
4. 결과 raw 회신 후 Step 2 진입

### Case 3 (예외) — RLS 정책 인라인 EXISTS 잔존 또는 다른 정합 깨짐

→ **즉시 보고** + Step 진입 차단:
1. D-pre.8 sweep 누락 추가 보강 트랙 분기
2. D-4 K-1 보강 패턴 정합으로 즉시 청산 트랜잭션 신설
3. 청산 후 Step 1 재실행 (회귀 검증)

---

## 6. 보고 채널

Chrome에서 SQL 실행 후 결과 raw를:

- **(권장) 채팅으로 회신** — Code가 본 § 4에 raw 추가 + capture 문서 신설 + Step 분기 결정 즉시 진행
- **본 문서 § 4 직접 편집 후 GitHub 커밋** — 팀장님이 GitHub 웹에서 직접 편집 가능, Code가 본 변경 감지 후 진행

---

## 7. 안전 protocol

### 7-1. SQL 실행 중 오류 발생 시

- 즉시 SQL Editor에서 중단 (다른 SQL 추가 실행 X)
- 오류 메시지 raw 복사 + 어떤 SQL ① ~ ⑥ 중 어디서 오류 발생인지 명시 → 회신
- DB 상태 변경 0건 (SELECT만 실행) — 롤백 불필요

### 7-2. SQL 실행 결과가 기대값과 크게 다를 시

- "분명히 row가 있어야 하는데 없다" / "없어야 하는데 있다"
- 컬럼 구성·테이블 목록·RLS 정책 개수가 메모리·CLAUDE.md와 다름

→ **90% 확률로 구버전을 보고 있을 가능성** — 즉시 § 1 신버전 진입 확인 재실행

### 7-3. 신버전 진입은 정합한데 결과가 의심스러울 시

- 결과 raw 그대로 회신 + "기대값과 다름" 표기
- Code가 D-pre.8 sweep 누락 또는 다른 정합 깨짐 판정
- 청산 후 재실행

---

*본 의뢰서는 D-9 작업지시서 §3 Step 1을 Chrome 위임 형식으로 분리. 회신 후 Code가 capture 신설 + Step 분기 결정 즉시 진행.*
