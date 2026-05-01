# admin_v2 Phase D-pre 항목 3·4 종합 — 2026-05-01

> **선행 산출물:** `docs/architecture/db_schema_20260501.md` (항목 1, 승인 #1) / `docs/architecture/role_migration_plan.md` (항목 2, 승인 #2)
> **본 산출물:** 항목 3 ROLE_LABEL 9역할 한국어 라벨 + 호환성 처리 + admin_v2 칩 정합 검증 + Step A·B 시점·순서. 항목 4(fetch 패턴)는 **별도 작업지시서로 이월** (본 파일 추후 보강).
> **상태:** **🟡 텍스트 초안 — 코드 변경 0건.** 팀장님 승인 #3 받기 전까지 텍스트로만 존재.
> **CLAUDE.md 절대 원칙 준수:** DB / admin_v2.html / js/db.js 변경 모두 0건 (D-pre 단계 전체)

---

## 1. ROLE_LABEL 9역할 한국어 라벨 확정안

### 1.1 admin_v2.html raw 칩 라벨 (라인 1531~1540)

| admin_v2 칩 (테이블 셀 정합 검증됨) | role 키 |
|---|---|
| 어드민 | `admin` |
| GA 지점장 | `ga_branch_manager` |
| GA 실장 | `ga_manager` |
| GA 설계사 | `ga_member` |
| GA 스텝 | `ga_staff` |
| 원수사 지점장 | `insurer_branch_manager` |
| 원수사 매니저 | `insurer_manager` |
| 원수사 직원 | `insurer_member` |
| 원수사 스텝 | `insurer_staff` |

### 1.2 ROLE_LABEL 9역할 1:1 매핑 (확정안)

```js
window.ROLE_LABEL = {
  admin:                  '어드민',
  ga_branch_manager:      'GA 지점장',
  ga_manager:             'GA 실장',
  ga_member:              'GA 설계사',
  ga_staff:               'GA 스텝',
  insurer_branch_manager: '원수사 지점장',
  insurer_manager:        '원수사 매니저',
  insurer_member:         '원수사 직원',
  insurer_staff:          '원수사 스텝'
};
```

### 1.3 admin = "어드민" vs "관리자" 결정 근거

| 후보 | 근거 | 선택 |
|---|---|:---:|
| "어드민" | admin_v2 칩(라인 1532) + 테이블 셀(라인 1571) + CLAUDE.md role 체계 호칭표 ("admin → 어드민 (팀장님 본인, 전역 권한)") | ⭐ **채택** |
| "관리자" | `js/db.js` 라인 127 기존 ROLE_LABEL.admin (정정 대상) | ❌ |

→ **`js/db.js`의 기존 `admin: '관리자'`는 정정 필요.** Step A에서 9역할 확장 + 동시에 admin 라벨 "관리자" → "어드민" 변경.

### 1.4 옵션 B 정합 (admin SQL 전용 생성)

- ROLE_LABEL에 `admin: '어드민'` 키 **유지** (라벨 표시용)
- `handle_new_user` 함수 IN 절에는 `'admin'` **제외** (메타 가입 차단, Step C-1.5 정합)
- → 라벨 표시와 가입 정책 분리: admin 사용자는 라벨 정상 표시, 신규 admin 생성은 SQL 전용

---

## 2. 호환성 처리 방안

### 2.1 결정 분기: 구 5역할 키 fallback

| 옵션 | 마이그레이션 직후 | 단점 | 권장 |
|---|---|---|:---:|
| (A) 5역할 fallback 영구 유지 | 안전, 구 데이터 라벨 표시 가능 | 코드 복잡, 마이그레이션 누락 시점 발견 어려움 | ❌ |
| (B) Step A에서 일시 유지 → Step B에서 제거 | 마이그레이션 직후 안전 + 코드 정리 깔끔 | 1단계 추가 | ⭐ **채택** |
| (C) 처음부터 9역할만 (fallback 없음) | 가장 깔끔 | Step A·B 비원자적 시 라이브 회귀 위험 | ❌ |

### 2.2 권장안 (옵션 B) 상세

**Step A: 9역할 키 추가 + 5역할 키 일시 유지** (`js/db.js`):

```js
// Step A 직후 일시 상태 — 9 + 5 = 14키
window.ROLE_LABEL = {
  // 9역할 신규
  admin:                  '어드민',
  ga_branch_manager:      'GA 지점장',
  ga_manager:             'GA 실장',
  ga_member:              'GA 설계사',
  ga_staff:               'GA 스텝',
  insurer_branch_manager: '원수사 지점장',
  insurer_manager:        '원수사 매니저',
  insurer_member:         '원수사 직원',
  insurer_staff:          '원수사 스텝',

  // ⚠️ 5역할 호환 — Step B 완료 후 제거 예정
  member:                 'GA 설계사',     // = ga_member 라벨
  manager:                'GA 실장',        // = ga_manager 라벨
  branch_manager:         'GA 지점장',     // = ga_branch_manager 라벨
  staff:                  'GA 스텝'         // = ga_staff 라벨
  // (admin은 9역할에 그대로 — 구 라벨 '관리자'에서 '어드민'으로 변경)
};
```

**Step B: 영향 14곳 9역할로 일괄 변경 + 5역할 fallback 제거** (한 커밋):

```js
// Step B 직후 최종 상태 — 9키만
window.ROLE_LABEL = {
  admin: '어드민',
  ga_branch_manager: 'GA 지점장', ga_manager: 'GA 실장',
  ga_member: 'GA 설계사', ga_staff: 'GA 스텝',
  insurer_branch_manager: '원수사 지점장', insurer_manager: '원수사 매니저',
  insurer_member: '원수사 직원', insurer_staff: '원수사 스텝'
};
```

**제거 시점:** Step B 완료 시점 = 영향 14곳 `isFreeTier()` / `isManagerOrAbove()` 헬퍼 또는 9역할 명시로 변경 + 자체 ROLE_LABEL 통합 완료 직후.

### 2.3 5역할 사용자 0건 정합

`db_schema_20260501.md` 절 4: 현재 admin 1명만 존재. 5역할 사용자 0건 → fallback이 실제 사용될 데이터 0건. **옵션 B는 안전망 의미만 있고 실 영향 0건.**

→ Step A·B 묶음 실행이라면 옵션 (C) 처음부터 9역할만도 안전. 단 분리 실행 시 회귀 위험 → 옵션 B 권장 유지.

---

## 3. admin_v2.html 칩 라벨 정합 검증

### 3.1 라인별 raw 추출 + ROLE_LABEL 비교

| admin_v2.html 위치 | raw 라벨 | ROLE_LABEL 라벨 | 정합 |
|---|---|---|:---:|
| 라인 1532 칩 | "어드민" | "어드민" | ✅ |
| 라인 1533 칩 | "GA 지점장" | "GA 지점장" | ✅ |
| 라인 1534 칩 | "GA 실장" | "GA 실장" | ✅ |
| 라인 1535 칩 | "GA 설계사" | "GA 설계사" | ✅ |
| 라인 1536 칩 | "GA 스텝" | "GA 스텝" | ✅ |
| 라인 1537 칩 | "원수사 지점장" | "원수사 지점장" | ✅ |
| 라인 1538 칩 | "원수사 매니저" | "원수사 매니저" | ✅ |
| 라인 1539 칩 | "원수사 직원" | "원수사 직원" | ✅ |
| 라인 1540 칩 | "원수사 스텝" | "원수사 스텝" | ✅ |

→ **9개 모두 정합 확인 ✅.** admin_v2 칩 라벨이 본 ROLE_LABEL 확정안의 진실 원천.

### 3.2 D-1 테이블 셀 라벨 정합 검증 (admin_v2.html 라인 1571~1688)

| 테이블 행 라인 | 셀 raw 라벨 | ROLE_LABEL | 정합 |
|---|---|---|:---:|
| 1571 (임태성) | "어드민" | admin → "어드민" | ✅ |
| 1584 (김지훈) | "GA 지점장" | ga_branch_manager → "GA 지점장" | ✅ |
| 1597 (박서연) | "GA 실장" | ga_manager → "GA 실장" | ✅ |
| 1610·1623 (이도윤·최민지) | "GA 설계사" | ga_member → "GA 설계사" | ✅ |
| 1636 (정수아) | "GA 스텝" | ga_staff → "GA 스텝" | ✅ |
| 1649 (강현우) | "원수사 지점장" | insurer_branch_manager → "원수사 지점장" | ✅ |
| 1662 (윤다은) | "원수사 매니저" | insurer_manager → "원수사 매니저" | ✅ |
| 1675 (한지우) | "원수사 직원" | insurer_member → "원수사 직원" | ✅ |
| 1688 (송예린) | "원수사 스텝" | insurer_staff → "원수사 스텝" | ✅ |

→ **9개 모두 정합 ✅.** D-3·D-6 섹션의 role 뱃지 라벨도 동일 패턴 사용 (이미 admin_v2 마크업 자체가 진실 원천).

### 3.3 불일치 발견 정정 사항 (`js/db.js` 외)

| 위치 | 현재 | 변경 (Step A) |
|---|---|---|
| `js/db.js` 라인 127 | `admin: '관리자'` | `admin: '어드민'` |
| `js/auth.js` 라인 90~91 (인라인 fallback) | `admin: '관리자'` | `admin: '어드민'` |
| `js/scripts-page.js` 라인 270~273 (자체 ROLE_LABEL) | admin 키 없음, 5역할 라벨 일부 다름 | 폐기 → window.ROLE_LABEL 참조 (결정 B 정합) |
| `pages/pricing-content.html` 라인 225 (자체 ROLE_LABEL) | `member:'팀장' ...` admin 누락 | 폐기 → window.ROLE_LABEL 참조 (결정 B 정합) |

⚠️ **`js/scripts-page.js` 라인 270~273의 `member: '팀장'`** 라벨도 발견:
- 현재: `member: '팀장'`
- 신 ROLE_LABEL: `ga_member: 'GA 설계사'`
- → "팀장" 라벨은 admin_v2 mock·CLAUDE.md 어디에도 없음. **scripts-page.js 자체 ROLE_LABEL은 옛 정의.** 폐기 시점에 라벨 회귀 0건 (admin_v2가 진실 원천).

---

## 4. Step A·B 실행 시점·순서 재확인

### 4.1 의존성 분석

| Step | 변경 영역 | DB 영향 | Step B 의존 |
|---|---|:---:|:---:|
| **A** | `js/db.js` ROLE_LABEL 확장 + `js/auth.js` fallback 인라인 동기화 + `isFreeTier()` / `isManagerOrAbove()` 헬퍼 신설 | 없음 | 단독 실행 가능 (5역할 fallback 일시 유지로 라이브 무영향) |
| **B** | 영향 14곳 일괄 수정 (`js/scripts-page.js` 자체 폐기 / `pages/pricing-content.html` 자체 폐기 / `pages/myspace.html`·`pages/board.html` 5역할 비교 → 헬퍼) + Step A의 5역할 fallback 제거 | 없음 | Step A 선행 필수 (헬퍼 함수 정의가 Step A에 있어야 Step B에서 사용 가능) |

### 4.2 권장 실행 패턴

**옵션 (가) 단일 커밋 묶음 (⭐ 권장)**:
- Step A + Step B를 한 커밋으로 묶음
- 라이브 일관성 보장 (영향 14곳이 모두 동시 변경 → 회귀 0건)
- 커밋 메시지: `feat(role): 9역할 마이그레이션 Step A+B — ROLE_LABEL 확장 + 영향 14곳 헬퍼 통합`
- ⚠️ 단점: 큰 커밋. 회귀 발견 시 롤백 단위 큼

**옵션 (나) 2 커밋 분리**:
- Commit 1: Step A (ROLE_LABEL 확장 + fallback 일시 유지 + 헬퍼 신설). 라이브 무영향.
- Commit 2: Step B (영향 14곳 수정 + fallback 제거). Commit 1 직후 즉시 진행 권장.
- 장점: 롤백 단위 작음, 진행 추적 명확
- ⚠️ 주의: Commit 1·2 사이 시간차 최소화 (다른 커밋 끼지 않게)

→ **옵션 (가) 단일 커밋 묶음 권장** (현재 사용자 admin 1명, 회귀 영향 작음, 일관성 우선).

### 4.3 Step A·B → C·D 순서

```
Step A (ROLE_LABEL 확장 + 헬퍼 신설)         ┐ 코드 (DB 무영향)
                                             │
Step B (영향 14곳 수정 + fallback 제거)      ┘ 같은 커밋 권장 (옵션 가)
                                             │
                                             ▼
Step C (DB 마이그레이션 SQL 실행)            ─ 별도 PR 또는 별도 커밋
  ├─ C-1 트리거 본문 재검증 SELECT
  ├─ C-1.5 함수 정정 (handle_new_user)
  ├─ C-2 users.role default 변경
  ├─ C-3 UPDATE 매핑 (현재 0건)
  ├─ C-4 RLS 정책 4개 재작성
  ├─ C-5 users 정책 정정
  └─ C-6 library/news RLS 활성화
                                             │
                                             ▼
Step D (라이브 검증 F-1~F-5)                ─ Chrome + DevTools + Sentry
```

**원자성 권장:**
- Step A·B는 코드 단위 (DB 무관) — 한 커밋 또는 한 PR 묶음
- Step C는 DB 변경 — 별도 단계. Supabase Dashboard SQL Editor 직접 실행
- Step D는 검증 — 코드/DB 변경 0건

**Step A·B 우선 실행 가능성 검토:**
- Step A·B 적용 후 Step C 미실행 상태 = ROLE_LABEL은 9역할이지만 users.role은 `member` (구 default) 또는 `admin` (1명) 그대로
- 신규 가입자가 트리거에 의해 `member` 생성 → ROLE_LABEL[`member`] = "GA 설계사" (Step A fallback) 또는 키 미존재 (Step B 후) → 라벨 표시 회귀
- → **Step A·B와 Step C 사이 시간차 최소화 필수.** 권장: 같은 작업 세션에 A·B → C → D 일괄 진행.

### 4.4 결정 4건 명문화 (항목 3 단계 확정)

| # | 결정 | 옵션 |
|:---:|---|---|
| **G-1** | ROLE_LABEL admin 라벨 | **"어드민"** (admin_v2 칩 + CLAUDE.md 정합, 기존 db.js "관리자" 정정) |
| **G-2** | 호환성 fallback 처리 | **옵션 B** (Step A 일시 유지 → Step B 제거) |
| **G-3** | Step A·B 실행 단위 | **옵션 (가) 단일 커밋 묶음** |
| **G-4** | Step A·B → C·D 시간차 | **같은 세션에 일괄 진행** (라이브 회귀 회피) |

---

## 5. 항목 4 — admin_v2 fetch 패턴 표준 (2026-05-01 보강)

### 5.1 fetch 호출 표준 — `window.db.fetch()` 차용 (확정 H-1)

| 후보 | 장단점 | 결정 |
|---|---|:---:|
| **(가) `window.db.fetch()` 차용** | 401 자동 갱신 + 인증 헤더 자동 + 갱신 실패 시 handleTokenExpired() 자동 + 단일 인프라 | ⭐ **채택** |
| (나) 직접 `fetch(SUPABASE_URL + path, {...})` | scripts-page.js 라인 282 옛 패턴, 토큰 갱신 수동 구현 필요 | ❌ |

**근거:**
- `js/db.js` 라인 74~92: `dbFetch()`가 401 응답 시 `refreshToken()` → 1회 재시도 → 실패 시 `handleTokenExpired()` 자동 호출
- admin_v2 8섹션이 동일 인프라 차용 → 토큰 만료 처리 일관성 + 코드 중복 0
- `scripts-page.js` 옛 직접 fetch는 별 트랙으로 `window.db.fetch()`로 마이그레이션 권장 (작업지시서 §외)

### 5.2 페이징·검색·필터 표준 (확정 H-2)

| 항목 | 표준 | 근거 |
|---|---|---|
| **페이지 크기** | **20행** | admin_v2 mock 10행은 시연용. 실 운영 = 20 (한 화면 + 헤더 + KPI 적정). 50은 모바일·차트 페이지에서 무거움 |
| **검색 디바운스** | **300ms** | 일반 검색 UX 표준. 100ms는 키 입력마다 호출 = API 부하, 500ms는 사용자 답답 |
| **필터 조합** | **AND (모든 필터 동시 만족)** | 관리자 의도 직관적. PostgREST 기본 동작 정합 |
| **URL 파라미터 형식** | **PostgREST style** (`?role=eq.admin&plan=eq.PRO`) | Supabase REST API 표준 |
| **검색 OR 패턴** | **PostgREST `or` 연산자** (`?or=(name.ilike.*X*,email.ilike.*X*)`) | 단일 검색창 → 다중 컬럼 검색 |
| **총 개수** | **`Prefer: count=exact` 헤더 + Content-Range 파싱** | 페이징 UI에 총 페이지 표시 필수 |

### 5.3 에러 처리 표준 (확정 H-3)

| HTTP | 의미 | 처리 |
|:---:|---|---|
| 401 | 토큰 만료 | **window.db.fetch 자동 처리** (refreshToken → 재시도 1회 → 실패 시 handleTokenExpired). admin_v2 측 코드 0 |
| **403** | RBAC 거부 (비-admin 진입) | **`window.admExit()` 호출** + 본 앱으로 리다이렉트. admin_v2 진입 게이트 |
| **500/502/503** | 서버 오류 | **에러 토스트 표시** ("일시적 서버 오류. 잠시 후 다시 시도해 주세요.") + console.error |
| **네트워크 오류** | offline / DNS / CORS | **재시도 1회 자동** (3초 후) → 실패 시 토스트. 다회 재시도는 사용자 답답 |
| **Sentry 연동** | v1.1 직전 도입 예정 | **현재 미도입 — hook만 준비** (`if (window.Sentry) Sentry.captureException(e)`) |

**에러 토스트 컴포넌트:**
- admin_v2.html `<style>` 절에 `.adm-toast` 신규 컴포넌트 (Phase D-1 작업 시 신설)
- 위치: 헤더 우측 하단 fixed
- 자동 사라짐: 5초

### 5.4 D-1 users 시범 fetch 호출 코드 (텍스트 — 실행 금지)

```js
// ════════════════════════════════════════════════════════════════════════
// admin_v2 D-1 users — 사용자 목록 fetch 시범 (Phase D-1 작업 시 채택)
// ⚠️ 본 코드는 텍스트 초안 — admin_v2.html 또는 별도 js 파일 미반영
// ════════════════════════════════════════════════════════════════════════

async function fetchUsers({
  page = 1,
  pageSize = 20,
  search = '',
  roleFilter = 'all',
  planFilter = 'all',
  sort = 'created_at.desc'
} = {}) {

  // 1. URL 파라미터 (PostgREST style)
  var params = new URLSearchParams();
  params.set('select', 'id,name,email,role,plan,company,branch,team,created_at');
  params.set('order', sort);
  params.set('limit', String(pageSize));
  params.set('offset', String((page - 1) * pageSize));

  // 2. 검색 (이름·이메일·소속 OR)
  if (search && search.trim()) {
    var safe = search.trim().replace(/[*,()]/g, '');
    params.set('or', '(name.ilike.*' + safe + '*,email.ilike.*' + safe + '*,company.ilike.*' + safe + '*)');
  }

  // 3. 역할 필터 (9역할)
  if (roleFilter && roleFilter !== 'all') {
    params.set('role', 'eq.' + roleFilter);
  }

  // 4. 플랜 필터
  if (planFilter && planFilter !== 'all') {
    params.set('plan', 'eq.' + planFilter);
  }

  // 5. fetch 호출 (window.db.fetch 차용 — 401 자동 갱신)
  try {
    var res = await window.db.fetch('/rest/v1/users?' + params.toString(), {
      headers: { 'Prefer': 'count=exact' }
    });

    // 6. RBAC 거부 → admin_v2 탈출
    if (res.status === 403) {
      console.warn('[admin_v2 D-1] 403 RBAC 거부 — admExit 호출');
      if (typeof window.admExit === 'function') window.admExit();
      throw new Error('관리자 권한 없음');
    }

    // 7. 서버 오류
    if (!res.ok) {
      var msg = '서버 오류 (' + res.status + ')';
      showAdminToast(msg, 'danger');
      if (window.Sentry) window.Sentry.captureMessage('[admin_v2 D-1] ' + msg);
      throw new Error(msg);
    }

    // 8. 결과 + 총 개수 (Content-Range 헤더 파싱)
    var rows = await res.json();
    var totalRange = res.headers.get('Content-Range') || '0-0/0';
    var total = parseInt(totalRange.split('/')[1], 10) || 0;

    return { rows: rows, total: total, page: page, pageSize: pageSize };

  } catch (e) {
    // 9. 네트워크 오류 — 1회 재시도
    if (e.name === 'TypeError' && /network/i.test(e.message)) {
      console.warn('[admin_v2 D-1] 네트워크 오류 — 3초 후 재시도');
      await new Promise(function (r) { setTimeout(r, 3000); });
      return fetchUsers(arguments[0]); // 1회만
    }

    // 10. 기타 오류 (TOKEN_EXPIRED는 window.db.fetch가 이미 처리)
    if (e.message !== 'TOKEN_EXPIRED') {
      console.error('[admin_v2 D-1] fetchUsers failed:', e);
      if (window.Sentry) window.Sentry.captureException(e);
    }
    return null;
  }
}

// ── 검색 디바운스 헬퍼 (D-1·D-3·D-6 공통) ──────────────────────────
function adm_debounce(fn, wait) {
  var t;
  return function () {
    var args = arguments;
    clearTimeout(t);
    t = setTimeout(function () { fn.apply(null, args); }, wait);
  };
}

// 사용 예
var onSearchInput = adm_debounce(function (e) {
  fetchUsers({ search: e.target.value, page: 1 })
    .then(function (result) { if (result) renderUsersTable(result); });
}, 300);
```

### 5.5 8섹션 적용 가이드

| 섹션 | fetch 패턴 차용 | 변형 / 주의 |
|---|:---:|---|
| **D-1 users** | ✅ 표준 그대로 | § 5.4 시범 코드가 표준 케이스 |
| **D-2 content** | ⚠️ **변형 필요** | scripts + library 분리 → 두 fetch 병렬(`Promise.all`) 또는 UNION RPC 신설. stage 도넛은 RPC 권장 (Phase D-2 시점) |
| **D-3 board** | ✅ 표준 그대로 | `posts.comment_count` 사용 (자체 컬럼) — 별도 join 불요. 신고 메커니즘 신규 (post_reports 테이블 또는 posts 컬럼 추가, db_schema_20260501.md § 5.3 정합) |
| **D-4 notice** | ⚠️ **변형 필요** | `?group_name=eq.notice&order=updated_at.desc` 패턴 (key-value app_settings 통합) |
| **D-5 analytics** | ⚠️ **RPC 의존** | `POST /rest/v1/rpc/get_dau` 등. **현재 RPC 0건 → D-5 작업지시서에서 RPC 신설** (handle_new_user 외 RPC 미존재, 쿼리 6 raw 정합) |
| **D-6 logs** | ✅ 표준 그대로 | `activity_logs` 표준 + 검색·필터·날짜 페이징 |
| **D-7 billing** | 🛑 **제외** | 테이블 0건 (payments/subscriptions/plans 미존재). Phase D 범위 제외 (결정 1) |
| **D-8 dashboard** | ✅ **다중 병렬** | `Promise.all([fetchKPI, fetchTimeline, fetchRecentUsers, fetchTopScripts])` — 4종 병렬. 부분 실패 허용 (KPI 1개 실패 시 나머지 표시) |

### 5.6 결정 3건 명문화 (항목 4 단계 확정)

| # | 결정 | 옵션 |
|:---:|---|---|
| **H-1** | fetch 호출 표준 | **`window.db.fetch()` 차용** (401 자동 갱신 + 인프라 단일화) |
| **H-2** | 페이징·검색·필터 표준 | **20행 / 300ms 디바운스 / AND 조합 / PostgREST style / Prefer: count=exact** |
| **H-3** | 에러 처리 표준 | **401 자동 / 403 admExit / 500 토스트 / 네트워크 1회 재시도 / Sentry hook 준비 (v1.1 도입)** |

---

## 6. 항목 3 보고 + 팀장님 승인 #3 요청

### 6.1 산출물 요약

| 절 | 내용 |
|---|---|
| 1 | ROLE_LABEL 9역할 한국어 라벨 확정 + admin = "어드민" 결정 근거 + 옵션 B 정합 |
| 2 | 호환성 처리 — 옵션 B (Step A 일시 fallback → Step B 제거) |
| 3 | admin_v2.html 칩 라벨 정합 검증 (9개 모두 ✅) + D-1 테이블 셀 정합 (9개 모두 ✅) + 불일치 정정 4곳 |
| 4 | Step A·B 실행 시점·순서 + 옵션 (가) 단일 커밋 묶음 권장 + Step A·B → C·D 같은 세션 일괄 |
| 5 | 항목 4 (fetch 패턴) 별도 작업지시서 이월 명시 |
| 6 | 본 보고 + 승인 #3 요청 |

### 6.2 결정 4건 (G-1 ~ G-4)

| # | 결정 | 권장 |
|:---:|---|---|
| G-1 | admin 라벨 "어드민" 채택 | ⭐ |
| G-2 | fallback 옵션 B (Step A 일시 → Step B 제거) | ⭐ |
| G-3 | Step A·B 단일 커밋 묶음 | ⭐ |
| G-4 | Step A·B → C·D 같은 세션 일괄 | ⭐ |

### 6.3 승인 #3 시 진입 가능 항목

- **항목 4 진입** — 본 파일 § 5 보강 (fetch 패턴 표준 + D-1 시범 코드) ✅ **2026-05-01 보강 완료**
- 항목 4 승인 #4 후 → **D-1 작업지시서 발행** (Phase D 본격 진입)

### 6.4 항목 4 보강 완료 — 결정 H-1·H-2·H-3 추가

| # | 결정 | 권장 |
|:---:|---|---|
| H-1 | fetch 표준 | window.db.fetch() 차용 |
| H-2 | 페이징·검색·필터 표준 | 20행 / 300ms / AND / PostgREST |
| H-3 | 에러 처리 표준 | 401 자동 / 403 admExit / 500 토스트 / 네트워크 1회 / Sentry hook |

---

*본 산출물은 admin_v2.html / js/db.js / DB 변경 모두 0건. 라벨 텍스트 + 정합성 검증 + 시점 결정만.*
