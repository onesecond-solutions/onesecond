# D-pre.5 사양 분석 — users 신규 컬럼 (status / last_seen_at)

> **작업 분류:** Phase D-pre.5 사양 의견 의뢰 (D-1 진입 전 분리 마이그레이션)
> **상태:** 🟡 분석·의견 제시만. SQL 실행 / 코드 변경 0건. **팀장님 결정 대기.**
> **작성:** 2026-05-02 / Claude Code (실 코드베이스 직접 검증)
> **CLAUDE.md 절대 원칙 준수:** DB / admin_v2.html / app.html / auth.js 변경 모두 0건
> **선행 산출물:** `docs/specs/admin_v2_phase_d_pre.md` 438줄 / `docs/architecture/db_schema_20260501.md` 561줄 / `docs/architecture/db_pre_migration_capture_20260501.md` (마이그레이션 직전 raw)

---

## 0. 작업지시서 § 0번 정합성 검증 (통과 명문화)

| # | 검증 항목 | 결과 |
|:---:|---|:---:|
| 1 | `docs/sessions/_INDEX.md` 메인 트랙 = admin_v2 Phase D 진입 대기 | ✅ |
| 2 | `docs/sessions/2026-05-01_2257.md` D-pre 마이그레이션 Step A·B·C·D 전 구간 완수 | ✅ |
| 3 | 본 작업이 D-1 진입 전 "컬럼 추가 마이그레이션" 사양 결정용 분석임을 인지 | ✅ |
| 4 | 신버전 DB(`pdnwgzneooyygfejrvbg` / `onesecond-v1-restore-0420`) 기준 분석 | ✅ (5/2 팀장님 확인) |

**경미 사항:** 작업지시서 § 0-1 경로 표기는 `docs/_INDEX.md`였으나 실제는 `docs/sessions/_INDEX.md` (단일 인덱스). 본 분석은 후자 기준.

---

## 1. 분석 대상 요약 + AI(Claude 채팅) 추천 사양

| 컬럼명 | 타입 (AI) | 기본값 (AI) | 값 종류 (AI) | 기존 사용자 처리 (AI) |
|---|---|---|---|---|
| `status` | text | `'active'` | `'active'` / `'inactive'` (2종) | `'active'` 일괄 백필 |
| `last_seen_at` | timestamptz | NULL 허용 | — | NULL 그대로 |

**AI 부가 결정**:
- last_seen_at 업데이트 로직은 본 마이그레이션에서 제외, **D-1 작업 중 처리**
- status 값을 2종으로 단순화 (3종 / 4종 옵션 모두 거부)

**Code의 비교 의견은 § 4~7. 결론 요약은 § 9 통합 의견 표.**

---

## 2. 질문 1 — 현재 코드베이스 raw 분석

### 2.1 `public.users` 현재 컬럼 (10개 — ordinal 9 누락)

> 출처: `docs/architecture/db_schema_20260501.md` § 2.12 (5/1 팀장님 SQL Editor 직접 실행). information_schema 추가 SELECT 미실행 (어제 캡처본으로 충분).

| ordinal | column | type | nullable | default |
|:---:|---|---|:---:|---|
| 1 | `id` | uuid | NO | `gen_random_uuid()` |
| 2 | `created_at` | timestamptz | NO | `now()` |
| 3 | `name` | text | YES | — |
| 4 | `phone` | text | YES | — |
| 5 | `email` | text | YES | — |
| 6 | `company` | text | YES | — |
| 7 | `role` | text | YES | `'ga_member'` (Step C-2 후) |
| 8 | `team` | text | YES | — |
| 9 | **(누락 — DROP 흔적)** | — | — | — |
| 10 | `branch` | text | YES | — |
| 11 | `plan` | text | YES | — |

⚠️ **ordinal 9 DROP 흔적**: 컬럼명·타입·DROP 시기 미식별. **D-pre.5 ADD COLUMN 시점에 `pg_attribute` 검증 SELECT 1건 권장** (§ 11 후속 작업 R5 정합).

### 2.2 `public.users` 현재 행 수

**1행** (admin 1명):

| email | role | plan | name | created_at |
|---|---|---|---|---|
| `bylts0428@gmail.com` | `admin` | free | 어드민 | 2026-04-07 05:40:36+00 |

→ 백필 부담 0. DEFAULT 'active' 즉시 적용으로 1행 처리 완료.

### 2.3 `admin_v2.html` mock에서 status / last_seen_at 사용 위치

#### 2.3.1 D-1 users 섹션 (라인 1483~1696) — 가장 직접 정합

| 라인 | mock 값 | CSS 클래스 | 분류 |
|:---:|---|---|---|
| 1574 | "온라인" | `adm-badge online` | last_seen_at 파생 (활동 중) |
| 1587 | "온라인" | `adm-badge online` | last_seen_at 파생 |
| 1600 | "활성" | `adm-badge status-active` | status='active' |
| 1613 | "활성" | `adm-badge status-active` | status='active' |
| 1626 | "활성" | `adm-badge status-active` | status='active' |
| 1639 | **"정지"** | `adm-badge status-suspended` | **status='suspended'** |
| 1652 | "온라인" | `adm-badge online` | last_seen_at 파생 |
| 1665 | "활성" | `adm-badge status-active` | status='active' |
| 1678 | **"가입 대기"** | `adm-badge status-pending` | **status='pending'** |
| 1691 | "활성" | `adm-badge status-active` | status='active' |

**마지막 접속 컬럼 mock 값**: "지금" / "5분 전" / "1시간 전" / "어제" / "3시간 전" / "5일 전" / "30분 전" / "2시간 전" / **"—"** (가입 대기 = NULL) / "1일 전" — 라인 1576~1693.

**테이블 헤더** (라인 1562): `사용자 / 역할 / 플랜 / 소속 / **상태** / 가입일 / **마지막 접속**` — 7컬럼.

**정렬 옵션** (라인 1545): `<option>마지막 접속 순</option>`.

#### 2.3.2 CSS 토큰 정의 (라인 909~912) — **이미 라이브 정착**

```css
.adm-badge.status-active    { background: var(--admin-success-bg); color: var(--admin-success-text, #047857); }
.adm-badge.status-suspended { background: var(--admin-danger-bg);  color: var(--admin-danger-text, #B91C1C); }
.adm-badge.status-pending   { background: var(--admin-warning-bg); color: var(--admin-warning-text, #92400E); }
```

→ **`status-active` / `status-suspended` / `status-pending` 3종 토큰 5종 톤 AA 통과 (`e2d7a78` 커밋)**. AI 추천 2종(active/inactive) 채택 시 `status-suspended` / `status-pending` 클래스 의미가 어색해짐 (D-1 외 D-3·D-4·D-6·D-7 5섹션에서도 재사용 중 — 80셀 정착).

#### 2.3.3 D-1 외 섹션 status 클래스 재사용 raw (참고)

| 섹션 | 라인 범위 | 사용 패턴 |
|---|---|---|
| D-3 board 신고 | 2008~2044 | `status-suspended`(광고/개인정보/비방) / `status-pending`(허위/스팸) |
| D-4 notice | 2294~2330 | `status-active`(활성) / `status-suspended`(종료) |
| D-6 logs | 2408~2496 | `status-active`(성공) / `status-pending`(경고/대기) / `status-suspended`(실패) |
| D-7 billing | 2643~2706 | `status-active`(완료) / `status-suspended`(실패) / `status-pending`(환불 처리) |

→ **status 컬럼 의미는 users 전용이지만 CSS 토큰은 6섹션 80셀 공유.** 토큰 3종 정합이 라이브 진실 원천.

### 2.4 `js/auth.js` 현재 가입/로그인 플로우 영향

| 라인 | 코드 | status / last_seen_at 영향 |
|:---:|---|---|
| 25~37 | AppState 초기값 | status·last_seen_at 키 **0건** |
| 112~185 | `loadUser()` SELECT | `select=name,role,phone,email,company,branch,team,plan` (라인 128) — status·last_seen_at **fetch 안 함** |
| 161~173 | `activity_logs` INSERT (event_type='login', 세션당 1회) | last_seen_at 직접 갱신 **0건**, 단 활동 로그 자체는 기록 중 |
| 188~209 | `saveUser()` PATCH | `name/phone/company/branch/team`만 — status·last_seen_at **갱신 안 함** |

→ **auth.js 어디에도 status·last_seen_at 참조 0건.** 컬럼 추가만으로 auth.js 코드 변경 부담 0. last_seen_at PATCH 추가는 D-1에서 자연스러운 위치(라인 161 직전·직후) 존재.

### 2.5 `handle_new_user` 트리거 함수 raw (Step C-1.5 정정 후)

> 출처: `docs/architecture/role_migration_plan.md` Step C-1.5 + `db_pre_migration_capture_20260501.md` § 1 (5/1 22:57 마이그레이션 적용 완료).

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role text := meta->>'role';
BEGIN
  IF v_role IS NULL OR v_role NOT IN (
    'ga_branch_manager','ga_manager','ga_member','ga_staff',
    'insurer_branch_manager','insurer_manager','insurer_member','insurer_staff'
  ) THEN
    v_role := 'ga_member';
  END IF;

  INSERT INTO public.users (
    id, email, name, phone, company, branch, role, team, plan, created_at
  ) VALUES (
    NEW.id, NEW.email, NULLIF(meta->>'name',''), NULLIF(meta->>'phone',''),
    NULLIF(meta->>'company',''), NULLIF(meta->>'branch',''),
    v_role, NULLIF(meta->>'team',''), 'free', NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$function$
```

**status / last_seen_at 처리:**
- INSERT 절 컬럼 목록에 `status` / `last_seen_at` **미포함** (현재 컬럼 자체 없음)
- D-pre.5 ADD COLUMN 시 옵션:
  - **(a) DEFAULT 의존** (트리거 INSERT 절 변경 0건) — DEFAULT 'active'가 자동 적용 ⭐
  - (b) INSERT 절에 `status` 명시 — 트리거 함수 추가 정정 필요 (Step C-1.5 같은 마이그레이션 1건 더)

→ **(a) DEFAULT 의존 추천.** Step C-1.5 직후 트리거 추가 변경 회피. last_seen_at은 NULL 허용이라 INSERT 시 자동 NULL.

---

## 3. 질문 2 — status 값 종류 의견 (Code: ❌ AI 추천 반대)

### 3.1 결론

**AI 추천(2종 active/inactive) 반대. Code 추천: 3종 `'active'` / `'suspended'` / `'pending'`.**

### 3.2 근거 4건

| # | 근거 | 출처 |
|:---:|---|---|
| **3.2.a** | **mock 정합 위반** — admin_v2 D-1 mock(라인 1574~1693)에 `inactive` 0건. 실 사용 4값: 온라인/활성/**정지**/**가입 대기** | § 2.3.1 |
| **3.2.b** | **CSS 토큰 정합 위반** — `status-active` / `-suspended` / `-pending` 3종 5종 톤 AA(`e2d7a78`) 정착. 6섹션 80셀 재사용 중. 2종 채택 시 `suspended`·`pending` 클래스 의미 모호 | § 2.3.2 + § 2.3.3 |
| **3.2.c** | **`'inactive'` 의미 모호** — 운영 실무에서 "탈퇴" / "휴면(장기 미접속)" / "정지(약관 위반)" 3가지 사유가 다 들어감. 단일 키로 운영팀이 구분 불가 | 운영 실무 |
| **3.2.d** | **온라인은 status 아닌 last_seen_at 파생 표시** — mock "지금"·"5분 전"·"30분 전"이 `online`, "1시간 전"부터 `status-active`. 즉 **DB status 컬럼은 3종, "온라인"은 UI 표시 파생** | § 2.3.1 |

### 3.3 4종(active/inactive/suspended/pending) 옵션 평가

- 'inactive'와 'suspended'는 의미 중복(둘 다 "활동 안 함") → 운영 분기 시 혼동
- → 4종도 거부. 3종이 최적

### 3.4 추천 정의

| 키 | 한국어 | 의미 | 진입 경로 |
|---|---|---|---|
| `active` | 활성 | 정상 사용 가능. 온라인/오프라인은 last_seen_at 파생 | 가입 즉시 (DEFAULT) |
| `suspended` | 정지 | 약관 위반·결제 미납·악성 활동 | admin이 명시 변경 |
| `pending` | 가입 대기 | 매니저/admin 승인 대기 (insurer 입점·신규 GA 가입 등 미래 흐름) | 미래 가입 폼 분기 (현재 미구현) |

### 3.5 v1.1 이후 확장 여지

- 'archived' (탈퇴) — 행 삭제 vs soft delete 결정 시 추가
- 'dormant' (휴면, 장기 미접속) — 활성 사용자 정의 명문화 후 추가
- → 모두 D-pre.5 범위 외 (text + CHECK constraint로 자유 확장 가능, § 8.4 D-3 정합)

---

## 4. 질문 3 — status 기본값 의견 (Code: ✅ AI 동의 + 단서)

### 4.1 결론

**AI 추천(`'active'` 기본값) 동의.** 단 단서 부착 — 매니저 승인 흐름 도입 시점에 트리거 분기 별 트랙 권장.

### 4.2 근거 3건

| # | 근거 | 출처 |
|:---:|---|---|
| **4.2.a** | **현재 가입 플로우 정합** — `handle_new_user`(§ 2.5)는 즉시 INSERT, 승인 단계 0. 가입 즉시 사용 시작 가능 = active가 자연스러움 | § 2.5 |
| **4.2.b** | **트리거 함수 추가 변경 0건** — DEFAULT 'active' 적용 시 트리거 INSERT 절에 status 미포함(§ 2.5-a) → Step C-1.5 같은 함수 정정 0건 | § 2.5 |
| **4.2.c** | **'pending' 진입 정책 결정 미완** — 매니저 승인 흐름은 CLAUDE.md 9역할 체계 + 원수사 입점 영업 정합으로 v1.1 또는 원수사 입점 시점에 도입 예정. 본 D-pre.5 범위 외 | CLAUDE.md role 체계 |

### 4.3 'pending' 시작 흐름 도입 시 회귀 영향 (별 트랙 명시)

매니저 승인 흐름 도입 시점(v1.1 또는 원수사 입점):
- `handle_new_user` 함수 v_status 분기 추가 — 예: insurer_* 4종 + ga_branch_manager는 'pending'으로 시작, 나머지는 'active'
- auth.js loadUser에 status='pending' 사용자는 admin_v2 진입 차단 처리 추가
- admin_v2 D-1에 "승인 대기" 액션 버튼 추가

→ 본 D-pre.5는 **DEFAULT 'active' 단순 적용**. 매니저 승인 흐름은 별 트랙으로 분리. mock의 라인 1678 "가입 대기" 1행은 **시연용**이고 실 가입 플로우 변경은 별 결정.

---

## 5. 질문 4 — last_seen_at 업데이트 로직 분리 (Code: ✅ AI 동의)

### 5.1 결론

**AI 추천(컬럼만 추가, 업데이트 로직은 D-1) 동의.**

### 5.2 근거 3건

| # | 근거 | 출처 |
|:---:|---|---|
| **5.2.a** | **단계 분리 정합** — D-pre.5 = DB ALTER만 / D-1 = admin_v2 코드 + auth.js 변경. last_seen_at PATCH는 코드 변경 → D-1이 자연스러운 위치 | 작업지시서 § 1 |
| **5.2.b** | **PATCH 위치 이미 식별됨** — auth.js loadUser() 라인 161~173 활동 로그 INSERT 직전·직후가 자연 위치. 별도 hook 신설 불요 | § 2.4 |
| **5.2.c** | **현재 admin 1명 + 일 트래픽 0~수십** — 어떤 방식이든 부하 무관. D-1 결정 시점에 자유 선택 가능 | § 2.2 |

### 5.3 D-1 결정 시점에 검토할 옵션 3종

| 옵션 | 동작 | 트래픽 | 정확도 | 추천 |
|---|---|:---:|:---:|:---:|
| (a) loadUser() 진입 시 PATCH 1회 (세션당) | sessionStorage `_loginLogged` 패턴 차용 | 낮음 | 분 단위 | ⭐ |
| (b) 매 페이지 진입마다 PATCH | 모든 pages/*.html init에 hook | 중간 | 초 단위 | ❌ (오버킬) |
| (c) DB 트리거 (auth.users login 이벤트) | Supabase auth → public.users 트리거 | 0 (DB 내부) | DB 시각 정확 | ❌ (Supabase auth.users 트리거 권한 제약) |

→ **D-1에서 (a) 채택 권장.** 활동 로그 INSERT(라인 163~172) 직전에 `users` PATCH 추가. 단일 fetch 추가 + sessionStorage로 세션당 1회 제한.

### 5.4 활동 로그 기반 자동 도출 RPC (참고)

`activity_logs`에 이미 login 이벤트 기록 중 → 다음 RPC로 last_seen_at 자동 도출 가능:

```sql
CREATE OR REPLACE FUNCTION public.refresh_last_seen_at() RETURNS void
LANGUAGE sql AS $$
  UPDATE users u SET last_seen_at = (
    SELECT MAX(al.created_at) FROM activity_logs al
    WHERE al.user_id = u.id AND al.event_type = 'login'
  );
$$;
```

→ 본 D-pre.5에는 **미포함** (AI 단순화 정합). v1.1 또는 D-1 별 트랙에서 채택 결정.

### 5.5 admin_v2 D-1 페이징 성능 단상

활동 로그 집계 매번(LATERAL JOIN)은 N+1 부담. **users.last_seen_at 직접 컬럼 보유 + 단순 ORDER BY**가 페이징 성능 우수 → 컬럼 추가 자체는 강 추천.

---

## 6. 질문 5 — 기존 사용자 백필 (Code: ✅ AI 동의)

### 6.1 결론

**AI 추천(`status='active'` 일괄 + `last_seen_at` NULL 그대로) 동의.**

### 6.2 근거 4건

| # | 근거 | 출처 |
|:---:|---|---|
| **6.2.a** | **행 수 1행** — admin 1명. 백필 부담 0 | § 2.2 |
| **6.2.b** | **PostgreSQL 11+ DEFAULT 즉시 적용** — `ALTER TABLE ADD COLUMN ... DEFAULT 'active'` 메타데이터 기반 즉시 적용. 행 재작성 0. Supabase는 PG15+ → 안전 | PG release notes |
| **6.2.c** | **admin = active 정합** — admin은 mock에서도 "온라인"(active 파생) 표시. 'active' 백필이 의미 정합 | § 2.3.1 (라인 1574 임태성) |
| **6.2.d** | **last_seen_at NULL 표시 정합** — mock 라인 1680 "—"(가입 대기)가 NULL 표시. NULL 처리 정합 이미 마크업에 반영 | § 2.3.1 |

### 6.3 last_seen_at 백필 옵션 비교

| 옵션 | 동작 | 비용 | 정확도 | 추천 |
|---|---|:---:|:---:|:---:|
| (i) NULL 그대로 | 다음 admin 로그인 시 PATCH로 자연 채움 | 0 | — | ⭐ |
| (ii) created_at으로 백필 | `UPDATE users SET last_seen_at = created_at` | 낮음 | 부정확 (가입일 ≠ 마지막 접속) | ❌ |
| (iii) activity_logs MAX(created_at) 회복 | `UPDATE ... SET last_seen_at = (SELECT MAX(al.created_at) ...)` | 중간 | 정확 | △ (1회 정확도 vs 단순성 트레이드) |

→ **(i) NULL 그대로 추천.** admin 1명 + 다음 로그인이 곧 발생 → 자연 채움이 가장 단순.

---

## 7. § 5 추가 발견 사항 (Code 자유 보고)

### 7.1 AI가 놓친 컬럼 추가 후보

#### 7.1.a `users.suspended_reason` (text, NULL) — D-pre.5 미포함 추천

- 의미: status='suspended' 시 사유 메모 (관리자 액션 추적)
- mock 미사용 → 시각 시연 영향 0
- 운영 실무: status='suspended' row를 admin이 검토할 때 **왜 정지됐는지** 알아야 처리 가능
- **D-pre.5 미포함**, v1.1 또는 D-1 admin_v2 편집 모달 도입 시 별 트랙

#### 7.1.b `users.suspended_at` (timestamptz, NULL) — D-pre.5 미포함 추천

- 의미: status 변경 timestamp 추적 (감사 로그)
- 7.1.a와 묶음 도입 권장. 본 D-pre.5는 단순화 우선

#### 7.1.c `users.deleted_at` (timestamptz, NULL) — soft delete 결정 시 추가

- 행 삭제 vs soft delete는 v1.1 또는 admin_v2 D-1 액션 결정에 위임. 본 D-pre.5 미포함

### 7.2 AI 추천 사양 채택 시 예상되는 부작용

| # | 항목 | 영향 |
|:---:|---|---|
| **7.2.a** | **AI 2종 채택 시 부채** | 곧 'suspended'·'pending' 추가 필요(mock·CSS 토큰 정합) → D-pre.5 직후 D-pre.6 또는 컬럼 마이그레이션 1건 더. **3종 채택으로 회피** |
| **7.2.b** | **DEFAULT 의존 시 트리거 변경 0건 ⭐** | `handle_new_user` INSERT 절 status 미포함 그대로. 어제 Step C-1.5 직후 함수 추가 정정 0 |
| **7.2.c** | **RLS 정책 변경 0건 ⭐** | 현 30개 정책 어디에도 status·last_seen_at 참조 0건(§ 8.3) → RLS SQL 변경 0 |

### 7.3 RLS 정책 영향 분석

| 정책 | status·last_seen_at 참조 | D-pre.5 영향 |
|---|:---:|:---:|
| `users.admin update all` → `admin_update_all_users` (Step C-5 정정 후) | ❌ | ✅ 영향 0 |
| activity_logs · posts · scripts · library 등 30개 정책 | ❌ | ✅ 영향 0 |

**향후 영향 (별 트랙):**
- 'suspended' 사용자 차단 정책 추가 시 RLS 변경 발생 — D-pre.5 범위 외
- admin_v2 D-1 SELECT 시 비-admin 차단 정합은 **`pg_policies WHERE tablename='users'` 추가 SELECT 권장** (§ 11 R6) — 본 D-pre.5 ALTER 자체와 무관, D-1 진입 전 별도 검증

### 7.4 기타 우려 사항

#### 7.4.a PostgreSQL 11+ DEFAULT 즉시 적용 안전성 ⭐

- `ALTER TABLE ADD COLUMN status text NOT NULL DEFAULT 'active'` — PG11+ 메타데이터 기반 즉시 적용 (행 재작성 0)
- Supabase는 PG15+ → 1행이든 1만 행이든 동일 안전
- **NOT NULL vs NULL 허용:**
  - NOT NULL DEFAULT 'active' — 무결성 강함, 단 롤백 시 DROP 단순
  - NULL 허용 + DEFAULT 'active' — 유연, 향후 NULL 처리 분기 여지
  - **추천: NOT NULL DEFAULT 'active'** (status는 항상 값 있어야 의미 명확)

#### 7.4.b admin_v2 D-1 UI "온라인" 임계값 결정 권장

- mock의 "온라인" 뱃지(라인 1574·1587·1652)는 last_seen_at < now() - **N분**에서 파생
- mock 패턴 추정: "지금"·"5분 전"·"30분 전" → 온라인 / "1시간 전"~ → 활성
- **D-1 작업지시서에 임계값 결정 명세 권장** — 5분 / 10분 / 30분 / 1시간 중 택일
- 본 D-pre.5 범위 외 (DB는 last_seen_at만 보유, "온라인" 라벨링은 UI 파생)

#### 7.4.c text vs ENUM 결정 ⭐

| 옵션 | 장단점 | 추천 |
|---|---|:---:|
| (가) `text` 단독 | 자유 확장, ALTER TABLE 재실행 0건. **단점**: 타입 안전성 ↓ (오타 INSERT 가능) | △ |
| (나) **`text` + CHECK constraint** ⭐ | 타입 안전 + 자유 확장 + 무효 값 즉시 거부 + DROP 자유 | ⭐⭐ |
| (다) PostgreSQL ENUM | 타입 안전 강. **단점**: 새 값 추가 시 `ALTER TYPE` 필요, 삭제 어려움 | ❌ |

```sql
ALTER TABLE public.users ADD COLUMN status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'suspended', 'pending'));
```

→ **(나) text + CHECK 추천.** users.role도 text → 일관성. v1.1에 'archived' 추가 시 CHECK constraint만 재작성(`ALTER TABLE DROP CONSTRAINT ... ADD CONSTRAINT ...`).

#### 7.4.d users.ordinal 9 DROP 흔적 검증

- 캡처본 § 2.12 ordinal 9 누락 (DROP 흔적). 컬럼명·DROP 시기 미식별
- D-pre.5 ADD COLUMN 시점에 검증 권장 — 같은 이름 재추가 시 PostgreSQL 동작 확인용
- PostgreSQL은 dropped 컬럼 자리에 같은 이름 재추가 가능(다른 attnum) → 충돌 위험은 낮음
- **검증 SELECT 1건**:
  ```sql
  SELECT attname, attnotnull, atttypid::regtype, attisdropped, attnum
  FROM pg_attribute
  WHERE attrelid = 'public.users'::regclass AND attnum > 0
  ORDER BY attnum;
  ```
- → § 11 R5 정합. D-pre.5 실행 작업지시서에 추가 권장

---

## 8. 통합 의견 표 (5질문 + Code 추가 1건 = 6행)

| # | 항목 | AI 추천 | Code 의견 | 일치 | 핵심 근거 |
|:---:|---|---|---|:---:|---|
| **1** | status 값 종류 | 2종 (active/inactive) | **3종 (active/suspended/pending)** | ❌ | mock 4값 + CSS 토큰 3종 + 'inactive' 의미 모호 |
| **2** | status 기본값 | `'active'` | `'active'` (동의) | ✅ | 현재 가입 플로우 정합 + 트리거 변경 0건 |
| **3** | last_seen_at 업데이트 로직 | 컬럼만 + D-1 | 컬럼만 + D-1 (동의, (a) loadUser PATCH 권장) | ✅ | 단계 분리 정합 + auth.js 라인 161 자연 위치 |
| **4** | 기존 사용자 백필 | active 일괄 + last_seen_at NULL | 동일 (동의) | ✅ | admin 1행 + PG11+ 즉시 적용 |
| **5** | (Code 추가) status 타입 | (미언급, text 가정) | **text + CHECK constraint** | — | users.role 일관성 + 타입 안전 + 확장 자유 |
| **6** | (Code 추가) status NOT NULL | (미언급) | **NOT NULL DEFAULT 'active'** | — | status는 항상 값 있어야 의미 명확 |

---

## 9. 리스크 섹션

| # | 리스크 | 영향 | 완화 방안 | 본 D-pre.5 범위 |
|:---:|---|---|---|:---:|
| **R1** | status 2종 채택 시 곧 'suspended'·'pending' 추가 → 2번째 마이그레이션 부채 | D-pre.5 직후 D-pre.6 추가 | **3종 채택**으로 회피 | ✅ 본 결정으로 회피 |
| **R2** | `'inactive'` 의미 모호 (탈퇴/휴면/정지 혼재) | 운영팀 status 사유 구분 불가 | **3종 분기** ('inactive' 미사용) | ✅ 본 결정으로 회피 |
| **R3** | DEFAULT 'active' + 가입 즉시 active → 매니저 승인 흐름 도입 시 회귀 | v1.1 또는 원수사 입점 시점 회귀 | 트리거 함수에 v_status 분기 도입 (§ 4.3) | ❌ 별 트랙 |
| **R4** | last_seen_at NULL 백필 → admin_v2 D-1 정렬 시 NULL 처리 부담 | "마지막 접속 순" 정렬 시 NULL 처리 명세 필요 | NULLS LAST 옵션 + UI "—" 표시 | ❌ D-1 작업지시서 |
| **R5** | users.ordinal 9 DROP 흔적 정체 미식별 | 같은 이름 재추가 충돌 가능성 (낮음) | `pg_attribute` 검증 SELECT 1건 추가 | ✅ D-pre.5 실행 작업지시서 보강 |
| **R6** | RLS users SELECT 정책 미확인 | admin_v2 D-1 fetch 시 비-admin 차단 정합 검증 부재 | `pg_policies WHERE tablename='users'` 추가 SELECT (D-1 진입 전) | ❌ D-1 진입 전 |
| **R7** | text 타입 + CHECK constraint 미적용 시 오타 INSERT 가능 | `'activ'` 같은 무효 값 진입 가능 | **CHECK constraint 추가** | ✅ § 7.4.c 추천 채택 시 회피 |

---

## 10. 후속 작업 (D-pre.5 실행 작업지시서 발행 시 반영)

본 분석이 팀장님 승인 완료 시, 다음 항목으로 D-pre.5 실행 작업지시서 발행:

### 10.1 ALTER TABLE 2건 (DB 변경)

```sql
-- 신버전 DB 검증 (필수 선행)
SELECT current_database();  -- 'postgres' (Supabase 신버전)

-- 컬럼 추가 2건
ALTER TABLE public.users
  ADD COLUMN status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'suspended', 'pending'));

ALTER TABLE public.users
  ADD COLUMN last_seen_at timestamp with time zone;

-- 검증 SELECT 3건
-- 1) 컬럼 추가 확인
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='users'
ORDER BY ordinal_position;

-- 2) CHECK constraint 확인
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid='public.users'::regclass AND contype='c';

-- 3) DROP 흔적 검증 (R5)
SELECT attname, atttypid::regtype, attisdropped, attnum
FROM pg_attribute WHERE attrelid='public.users'::regclass AND attnum > 0
ORDER BY attnum;
```

### 10.2 백필 SQL 0건 (DEFAULT 즉시 적용 + last_seen_at NULL 그대로)

### 10.3 코드 변경 0건

| 파일 | D-pre.5 변경 | 사유 |
|---|:---:|---|
| `handle_new_user` 함수 | 0건 | DEFAULT 의존 (§ 7.2.b) |
| RLS 정책 30개 | 0건 | status·last_seen_at 참조 0 (§ 7.3) |
| `admin_v2.html` | 0건 | mock 그대로 (D-1에서 실 데이터 연결) |
| `js/auth.js` | 0건 | last_seen_at PATCH는 D-1 |
| `js/db.js` | 0건 | — |
| `app.html` | 0건 | — |

### 10.4 D-1 작업지시서에 반영할 항목 (D-pre.5 범위 외, D-1 진입 시 함께 처리)

1. auth.js loadUser() 라인 161 직전에 `users.last_seen_at` PATCH 1회 추가 (sessionStorage `_lastSeenLogged` 패턴)
2. admin_v2 D-1 "온라인" 라벨링 임계값 결정 (5/10/30분 중 택일)
3. admin_v2 D-1 fetchUsers() select에 `status,last_seen_at` 추가
4. `pg_policies WHERE tablename='users'` 추가 SELECT (R6)
5. "마지막 접속 순" 정렬 NULLS LAST 처리 명세

### 10.5 별 트랙 후보 (v1.1 또는 원수사 입점 시점)

- 매니저 승인 흐름 도입 (R3)
- `users.suspended_reason` / `suspended_at` 컬럼 추가 (§ 7.1.a/b)
- `users.deleted_at` soft delete 컬럼 (§ 7.1.c)
- 'archived' / 'dormant' status 키 추가 (§ 3.5)
- `refresh_last_seen_at()` RPC 도입 (§ 5.4)

---

## 11. 변경 이력

| 시각 | 변경 |
|---|---|
| 2026-05-02 (오전) | 신설 — D-pre.5 사양 의견 의뢰 분석. 5질문 답변 + 6행 통합 의견 표 + 7개 리스크 + 후속 작업 정리. 팀장님 결정 대기. |

---

*본 산출물은 admin_v2.html / app.html / auth.js / DB 변경 모두 0건. information_schema SELECT도 미실행(어제 캡처본만 활용). 분석·의견 제시만.*
