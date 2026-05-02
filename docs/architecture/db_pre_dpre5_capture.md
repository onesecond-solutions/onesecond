# D-pre.5 마이그레이션 캡처본 — 2026-05-02

> **목적:** Phase D-pre.5 (`users.status` / `users.last_seen_at` 컬럼 추가) 마이그레이션의 사전 검증 + 실행 기록 + 사후 검증 + 라이브 검증 + 롤백 SQL을 단일 파일에 raw 텍스트로 누적 보존.
>
> **신버전 DB 검증:** 프로젝트 ID `pdnwgzneooyygfejrvbg` (`onesecond-v1-restore-0420`) ✅
>
> **확정 사양:** `docs/specs/d-pre5-spec-analysis.md` § 8 통합 의견 표 6행 + 작업지시서 § 1 (Code 의견 전면 채택)
>
> **캡처 출처:** Claude in Chrome agent SQL Editor 직접 실행 결과 (Supabase Dashboard).
>
> **선행 산출물:** `docs/architecture/db_pre_migration_capture_20260501.md` (5/1 D-pre Step C 직전 raw) / `docs/architecture/db_schema_20260501.md` (5/1 스키마 전수)
>
> **CLAUDE.md 절대 원칙 준수:** admin_v2.html / app.html / auth.js / db.js 변경 모두 0건 (DB ALTER만).

---

## 1. Step A — 사전 검증 SELECT 5건 raw 캡처 (DB 변경 전)

### 1.0 신버전 DB 재확인 (A-0)

| db | usr |
|---|---|
| `postgres` | `postgres` |

✅ 신버전(`pdnwgzneooyygfejrvbg`) 진입 확인.

### 1.1 users 테이블 현재 컬럼 목록 (A-1)

```sql
SELECT ordinal_position, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;
```

| ordinal | column_name | data_type | is_nullable | column_default |
|:---:|---|---|:---:|---|
| 1 | `id` | uuid | NO | `gen_random_uuid()` |
| 2 | `created_at` | timestamp with time zone | NO | `now()` |
| 3 | `name` | text | YES | NULL |
| 4 | `phone` | text | YES | NULL |
| 5 | `email` | text | YES | NULL |
| 6 | `company` | text | YES | NULL |
| 7 | `role` | text | YES | `'ga_member'::text` |
| 8 | `team` | text | YES | NULL |
| **10** | `branch` | text | YES | NULL |
| 11 | `plan` | text | YES | NULL |

⚠️ **ordinal 9 누락 (8 → 10 점프).** A-4에서 정체 식별.

**어제 D-pre 캡처본 § 2.12와 100% 일치** + Step C-2 직후 `role` default 변경(`'member'` → `'ga_member'`) 적용 확인 ✅.

### 1.2 users 행 수 (A-2)

```sql
SELECT COUNT(*) AS user_count FROM public.users;
```

| user_count |
|:---:|
| **1** |

✅ admin 1명 — 어제 D-pre Step C-3 직후 보존(D-pre § 2.3 손실 데이터 검증 통과 정합).

### 1.3 users role 분포 (A-3)

```sql
SELECT role, COUNT(*) FROM public.users GROUP BY role ORDER BY role;
```

| role | count |
|---|---:|
| `admin` | 1 |

✅ 9역할 마이그레이션 후 잔존 row 0건. admin 1명 외 다른 role 0건 — 데이터 변환 부담 0.

### 1.4 ordinal 9 DROP 흔적 검증 (A-4 / R5 대응)

```sql
SELECT attnum, attname, attisdropped, atttypid::regtype
FROM pg_attribute
WHERE attrelid = 'public.users'::regclass AND attnum > 0
ORDER BY attnum;
```

| attnum | attname | attisdropped | atttypid |
|:---:|---|:---:|---|
| 1 | `id` | false | uuid |
| 2 | `created_at` | false | timestamp with time zone |
| 3 | `name` | false | text |
| 4 | `phone` | false | text |
| 5 | `email` | false | text |
| 6 | `company` | false | text |
| 7 | `role` | false | text |
| 8 | `team` | false | text |
| **9** | **`........pg.dropped.9........`** | **true** | — |
| 10 | `branch` | false | text |
| 11 | `plan` | false | text |

✅ **R5 식별 완료** — `attnum=9 / attisdropped=true / attname=........pg.dropped.9........` (PostgreSQL 표준 익명화 슬롯). DROP된 컬럼명은 PostgreSQL이 익명화하므로 정체 추적 불가. **재사용 안 됨 — 신규 컬럼은 attnum=12, 13에 부여 예상.**

→ status / last_seen_at 추가 시 충돌 위험 0. R5 리스크 해소.

### 1.5 status / last_seen_at 사전 존재 검증 (A-5)

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
  AND column_name IN ('status', 'last_seen_at');
```

**Success. No rows returned (0 rows)** ✅

→ 사전 존재 0행 — Step B 진입 가능.

### 1.6 종합 판정 (Step A → Step B 진입 게이트)

| 검증 항목 | 결과 | 판정 |
|---|---|:---:|
| A-0 신버전 DB | `postgres` / `postgres` | ✅ |
| A-1 컬럼 목록 | 10개 (ordinal 9 누락) | ✅ 어제 캡처본 일치 |
| A-2 행 수 | 1명 (admin) | ✅ |
| A-3 role 분포 | admin 1명 | ✅ 어제 D-pre 보존 |
| A-4 DROP 흔적 | attnum=9 dropped=true | ✅ R5 식별 완료 |
| A-5 사전 존재 | 0 rows | ✅ 통과 |

**결론: Step B 진입 가능.**

---

## 2. Step B — 마이그레이션 실행 기록 (DB 변경)

> 🟡 **실행 대기.** Chrome 에이전트가 Step B SQL 패키지 (B-1 / B-2 분할 + 각 검증 SELECT) 실행 후 raw 결과로 본 절 채움.

### 2.1 B-1. status 컬럼 추가

```sql
ALTER TABLE public.users
ADD COLUMN status text NOT NULL DEFAULT 'active'
CHECK (status IN ('active', 'suspended', 'pending'));
```

**실행 시각:** _(대기 중)_
**결과:** _(대기 중)_

### 2.2 B-1 직후 검증 SELECT

_(대기 중 — Step B 패키지에 정의된 즉시 반영 확인 SELECT)_

### 2.3 B-2. last_seen_at 컬럼 추가

```sql
ALTER TABLE public.users
ADD COLUMN last_seen_at timestamptz;
```

**실행 시각:** _(대기 중)_
**결과:** _(대기 중)_

### 2.4 B-2 직후 검증 SELECT

_(대기 중)_

---

## 3. Step C — 사후 검증 SELECT 4건 raw 캡처 (DB 변경 후)

> 🟡 **실행 대기.** Step B 통과 후 Step C 패키지 실행하고 본 절 채움.

### 3.1 C-1. 신규 컬럼 2종 존재 + 사양 검증

_(대기 중)_

### 3.2 C-2. CHECK constraint 존재 검증

_(대기 중)_

### 3.3 C-3. status 백필 검증 (전 사용자가 'active'인지)

_(대기 중 — 기댓값: active = 1, 그 외 0건)_

### 3.4 C-4. last_seen_at NULL 검증

_(대기 중 — 기댓값: 1)_

---

## 4. Step D — 라이브 검증 (회귀 0 확인)

> 🟡 **실행 대기.** Step C 통과 후 팀장님이 Chrome 직접 검증.

| F | 검증 항목 | 결과 |
|:---:|---|:---:|
| D-1 | https://onesecond.solutions/login 정상 진입 | _(대기)_ |
| D-2 | 로그인 후 admin AppState 5건 (role/name/email/plan/ready) 정상 출력 | _(대기)_ |
| D-3 | admin_v2 풀스크린 진입 (`bylts0428@gmail.com` 계정) | _(대기)_ |
| D-4 | admin_v2 5종 톤 토글 정상 동작 (light/warm/slate/black/navy) | _(대기)_ |

**1건이라도 회귀 발견 시 Step E 롤백 SQL 실행 + 즉시 보고.**

---

## 5. Step E — 롤백 SQL 보관 (비상시만 실행, 평시 자동 실행 금지)

> ⚠️ **자동 실행 금지.** Step D 회귀 발견 시 또는 사용자 명시 지시 시에만 실행.
>
> 실행 순서: E-1 (last_seen_at 제거) → E-2 (status 제거). status부터 제거해도 무방하나 작업지시서 § 7 명시 순서 준수.

### 5.1 E-1. last_seen_at 제거

```sql
ALTER TABLE public.users DROP COLUMN IF EXISTS last_seen_at;
```

### 5.2 E-2. status 제거 (CHECK constraint 자동 제거됨)

```sql
ALTER TABLE public.users DROP COLUMN IF EXISTS status;
```

### 5.3 롤백 후 검증 SELECT

```sql
-- 신규 컬럼 2종 부재 확인
SELECT column_name
FROM information_schema.columns
WHERE table_schema='public' AND table_name='users'
  AND column_name IN ('status','last_seen_at');
-- 기댓값: 0 rows
```

### 5.4 롤백 부수 효과

- **CHECK constraint 자동 제거** — `users_status_check` (또는 PostgreSQL 자동 명명) 제거
- **DEFAULT 'active' 자동 제거** — column 자체와 함께 사라짐
- **데이터 손실 0** — admin row의 다른 컬럼(id/email/role/plan/...) 보존
- **attnum 변화** — DROP 시 status·last_seen_at도 attisdropped=true로 익명화 슬롯에 보존 (재사용 안 됨)

---

## 6. 안전망 조합 (3중 방어)

| 단계 | 안전망 | 회복 시간 |
|:---:|---|---|
| 🛡️ 1차 | § 5 Step E 롤백 SQL (단계별 명시) | 즉시 (DROP COLUMN 2건) |
| 🛡️ 2차 | 본 캡처본 (§ 1·§ 2·§ 3 raw) | ~5분 (수동 SQL 재작성) |
| 🛡️ 3차 | Daily 백업 (5/2 02:14 추정 시점) | ~30분 (Dashboard 복원) |

**비용:** $0 (PITR $111/월 회피, 어제 D-pre 결정 정합).

---

## 7. 완료 후 후속 작업 (D-1 작업지시서 발행 시 반영)

본 캡처본 § 1~§ 4 모두 채워지고 라이브 검증 4건 통과 시:

1. `_INDEX.md` Phase D 세부 단계 표 D-pre.5 행 → ✅ 완료 (2026-05-02) 갱신
2. D-1 작업지시서 발행 시 다음 항목 반영:
   - `auth.js` loadUser() 라인 161 직전에 `users.last_seen_at` PATCH 1회 추가 (sessionStorage `_lastSeenLogged` 패턴)
   - `admin_v2` D-1 fetchUsers() select에 `status,last_seen_at` 추가
   - "온라인" 라벨링 임계값 결정 (5/10/30분 중 택일)
   - "마지막 접속 순" 정렬 NULLS LAST 처리 명세
   - `pg_policies WHERE tablename='users'` 추가 SELECT (R6 — admin_v2 D-1 fetch 정합 검증)
3. `db_schema_20260501.md` 갱신은 D-1 작업지시서 종료 시 일괄 반영 (절대 원칙 § 8.3)

---

*본 캡처본은 D-pre.5 마이그레이션 단일 진실 원천. 본 파일에 § 1~§ 4 모두 raw로 누적 후 D-1 진입.*
