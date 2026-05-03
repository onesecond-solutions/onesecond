# admin_v2 Phase D-1 작업지시서 — users 섹션 실 데이터 연결

> **작성일:** 2026-05-03
> **작성자:** Claude Code
> **선행 산출물:** `docs/specs/admin_v2_phase_d_pre.md` (D-pre 항목 1~4 완료)
> **종속 학습:** D-pre.5/6/7/8 사고 학습 전건 반영
> **상태:** 🟢 즉시 진입 가능 — D-pre 시리즈 + 별 트랙 α/β 모두 종료

---

## 0. 큰 그림 정합성 검증 (먼저 수행)

1. `docs/sessions/_INDEX.md` 읽고 메인 트랙 확인 → admin_v2 Phase D 진입
2. 본 작업이 메인 트랙 정합 → ✅ D-pre.7+8 종료로 RLS·자기 참조 청산 완료
3. 차단 조건 없음 → 진입

**현재 잔존 별 트랙 (병렬 가능):**
- scripts 보강 4단계 (팀장님 100+ 드래프트 대기)
- 라이브 검수 부채 통합 (Chrome 결과 PASS 37 / 모바일 별도)

---

## 1. 작업 배경

### 1.1 목표
admin_v2.html `users` 섹션의 Phase C mock 데이터(10행 하드코딩)를 실 Supabase 데이터로 전환.

### 1.2 결정 11건 (D-pre 단계 확정)

| # | 결정 |
|:--:|---|
| **G-1** | ROLE_LABEL admin 라벨 = "어드민" (기존 "관리자" 정정) |
| **G-2** | 호환성 fallback = 옵션 B (Step A 일시 유지 → Step B 제거) |
| **G-3** | Step A·B 단일 커밋 묶음 |
| **G-4** | Step A·B → C·D 같은 세션 일괄 진행 |
| **H-1** | fetch 호출 표준 = `window.db.fetch()` 차용 (401 자동 갱신) |
| **H-2** | 페이징·검색·필터 = 20행 / 300ms 디바운스 / AND / PostgREST style / Prefer: count=exact |
| **H-3** | 에러 처리 = 401 자동 / 403 admExit / 500 토스트 / 네트워크 1회 재시도 / Sentry hook |
| **추-1** | js/admin_v2.js 신설 (admin_v2 전용 JS — 다른 페이지 영향 0) |
| **추-2** | mock 제거 시 KPI 3카드 + 칩 카운트 9개 + 테이블 10행 모두 실 연결 |
| **추-3** | 라이브 회귀 검증은 D-pre.6 학습 적용 (정의 raw + 실 동작 이중 검증) |
| **추-4** | RLS는 D-pre.7 학습 적용 (자기 참조 금지 + SECURITY DEFINER `is_admin()` 패턴 — 이미 청산됨, 회귀 검증만) |

---

## 2. 변경 범위 (4파일)

| 파일 | 변경 유형 | 라인 |
|---|---|---|
| `js/db.js` | UPDATE — ROLE_LABEL 9역할 + 5역할 fallback (Step 3) → 5역할 fallback 제거 (Step 7) | 라인 126~ (현재 어드민 라벨 정합 확인 필요) |
| `js/admin_v2.js` | **신설** — 전용 JS | 신규 ~300줄 예상 |
| `pages/admin_v2.html` | UPDATE — mock 제거 + js 연결 | 라인 1485~1700 (users 섹션) |
| Supabase DB | UPDATE — Phase 1 마이그레이션 (users.role 5→9역할) | users 테이블 |

**제외 (D-1 범위 외):**
- `js/auth.js` ROLE_LABEL fallback (라인 101~) — Step 7 정합 확인만, 변경 0 가능
- `js/scripts-page.js` — 사용처만, 변경 0
- `pricing.html` ROLE_LABEL 자체 정의 — 별 트랙 부채 (D-pre.6 잔존 부채 표 명시)

---

## 3. Step 분할 (7단계 — D-pre.6/7/8 학습 적용)

### Step 1 — 사전 검증 (DB·코드 변경 0건)

#### 1-1. SELECT 검증 (Supabase Dashboard SQL Editor)

```sql
-- 신버전 재확인
SELECT current_database();

-- users 테이블 role 분포 (Phase 1 마이그레이션 필요 여부)
SELECT role, COUNT(*) AS row_count FROM public.users GROUP BY role ORDER BY 2 DESC;

-- 9역할 외 잔존 row 검증 (5역할 키 존재 여부)
SELECT role, COUNT(*) AS row_count FROM public.users
WHERE role NOT IN ('admin','ga_branch_manager','ga_manager','ga_member','ga_staff',
                   'insurer_branch_manager','insurer_manager','insurer_member','insurer_staff')
GROUP BY role;

-- 신컬럼(D-pre.5) 정합 — status / last_seen_at
SELECT
  COUNT(*) FILTER (WHERE status = 'active')    AS active_count,
  COUNT(*) FILTER (WHERE status = 'suspended') AS suspended_count,
  COUNT(*) FILTER (WHERE status = 'pending')   AS pending_count,
  COUNT(*) FILTER (WHERE last_seen_at IS NOT NULL) AS last_seen_set
FROM public.users;

-- RLS 정책 raw (D-pre.7/8 청산 회귀 점검)
SELECT policyname, cmd, roles, qual AS using_clause, with_check AS with_check_clause
FROM pg_policies WHERE schemaname='public' AND tablename='users'
ORDER BY cmd, policyname;

-- admin 본 계정 정합성
SELECT id, email, role, plan, name, status FROM public.users WHERE email='bylts0428@gmail.com';
```

#### 1-2. Code grep 검증

```bash
# ROLE_LABEL 영향 4곳 raw 확인
grep -rn "ROLE_LABEL" --include="*.html" --include="*.js"

# js/db.js 현재 ROLE_LABEL 정의 raw
grep -n "ROLE_LABEL" js/db.js

# admin_v2.html mock 영역 정합
grep -n "Phase C mock\|adm-role-chip\|role-admin\|role-ga-" pages/admin_v2.html
```

→ **검증 결과 보고 후 Step 2 진입 승인 대기**

---

### Step 2 — Phase 1 마이그레이션 SQL (DB UPDATE)

#### 2-1. 사전 백업
- Supabase Dashboard → Table Editor → users → Export to CSV

#### 2-2. UPDATE 실행 (Step 1-1 결과에 따라 분기)

**(A) Step 1-1 결과 5역할 잔존 0건 → SQL 실행 불필요, Step 3으로 직행**

**(B) Step 1-1 결과 5역할 잔존 ≥1건 → 다음 SQL 트랜잭션**

```sql
BEGIN;

-- 5역할 → 9역할 매핑 (CLAUDE.md role_system.md 참조)
UPDATE public.users SET role = 'ga_member'         WHERE role = 'member';
UPDATE public.users SET role = 'ga_manager'        WHERE role = 'manager';
UPDATE public.users SET role = 'ga_branch_manager' WHERE role = 'branch_manager';
UPDATE public.users SET role = 'ga_staff'          WHERE role = 'staff';

-- 검증 (커밋 전)
SELECT role, COUNT(*) FROM public.users GROUP BY role ORDER BY 2 DESC;
SELECT COUNT(*) AS legacy_role_count FROM public.users
WHERE role NOT IN ('admin','ga_branch_manager','ga_manager','ga_member','ga_staff',
                   'insurer_branch_manager','insurer_manager','insurer_member','insurer_staff');
-- 기대값: legacy_role_count = 0

COMMIT; -- 또는 ROLLBACK;
```

#### 2-3. 사후 검증 (D-pre.6 학습 적용)
- 정의 raw 검증: `users_role_check` 9역할 정합 raw 표시
- 실 동작 검증: admin 본 계정 라이브 진입 정상 (회귀 0)

---

### Step 3 — js/db.js Step A: ROLE_LABEL 9역할 + 5역할 fallback (Code, 단일 커밋)

#### 3-1. 변경 (G-1·G-2 적용)

`js/db.js` 라인 126~ ROLE_LABEL 정의 갱신:

```js
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

  // ⚠️ 5역할 호환 — Step 7 (Step B)에서 제거 예정
  member:                 'GA 설계사',
  manager:                'GA 실장',
  branch_manager:         'GA 지점장',
  staff:                  'GA 스텝'
};
```

#### 3-2. js/auth.js fallback 정합 (변경 0 또는 동일 갱신)
- 라인 101~ `var map = window.ROLE_LABEL || { ... }` fallback이 9역할 포함하는지 raw 확인
- 불일치 시 Step 3 같은 커밋에 묶음

#### 3-3. 커밋 (G-3 단일 커밋 묶음)

---

### Step 4 — js/admin_v2.js 신설 (Code 신규)

#### 4-1. 파일 신설
`js/admin_v2.js` (신규, ~300줄 예상)

#### 4-2. 핵심 함수 (D-pre 항목 4 시범 코드 § 5.4 채택)

```js
// ════════════════════════════════════════════════════════════════════════
// admin_v2 D-1 users — 사용자 목록 fetch + render + 검색/필터/페이징
// ════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── 상수 ──────────────────────────────────────────────────────────────
  var PAGE_SIZE = 20;        // H-2
  var DEBOUNCE_MS = 300;     // H-2
  var ROLE_KEYS = [
    'admin', 'ga_branch_manager', 'ga_manager', 'ga_member', 'ga_staff',
    'insurer_branch_manager', 'insurer_manager', 'insurer_member', 'insurer_staff'
  ];

  // ── 상태 ──────────────────────────────────────────────────────────────
  var _state = {
    page: 1, search: '', roleFilter: 'all', planFilter: 'all',
    sort: 'created_at.desc', total: 0
  };

  // ── 디바운스 헬퍼 ─────────────────────────────────────────────────────
  function adm_debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }

  // ── fetchUsers (H-1·H-2·H-3 적용) ─────────────────────────────────────
  async function fetchUsers(opts) {
    opts = opts || {};
    Object.assign(_state, opts);

    var params = new URLSearchParams();
    params.set('select', 'id,name,email,role,plan,company,branch,team,status,last_seen_at,created_at');
    params.set('order', _state.sort);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String((_state.page - 1) * PAGE_SIZE));

    if (_state.search && _state.search.trim()) {
      var safe = _state.search.trim().replace(/[*,()]/g, '');
      params.set('or', '(name.ilike.*' + safe + '*,email.ilike.*' + safe + '*,company.ilike.*' + safe + '*)');
    }
    if (_state.roleFilter && _state.roleFilter !== 'all') {
      params.set('role', 'eq.' + _state.roleFilter);
    }
    if (_state.planFilter && _state.planFilter !== 'all') {
      params.set('plan', 'eq.' + _state.planFilter);
    }

    try {
      var res = await window.db.fetch('/rest/v1/users?' + params.toString(), {
        headers: { 'Prefer': 'count=exact' }
      });

      // H-3: 403 → admExit
      if (res.status === 403) {
        if (typeof window.admExit === 'function') window.admExit();
        throw new Error('관리자 권한 없음');
      }

      // H-3: 500/502/503 → 토스트
      if (!res.ok) {
        showAdminToast('서버 오류 (' + res.status + '). 잠시 후 다시 시도해 주세요.', 'danger');
        if (window.Sentry) window.Sentry.captureMessage('[admin_v2 D-1] HTTP ' + res.status);
        throw new Error('HTTP ' + res.status);
      }

      var rows = await res.json();
      var totalRange = res.headers.get('Content-Range') || '0-0/0';
      _state.total = parseInt(totalRange.split('/')[1], 10) || 0;

      return { rows: rows, total: _state.total };

    } catch (e) {
      // H-3: 네트워크 오류 1회 재시도
      if (e.name === 'TypeError' && /network|fetch/i.test(e.message)) {
        await new Promise(function (r) { setTimeout(r, 3000); });
        return fetchUsers(opts);
      }
      if (e.message !== 'TOKEN_EXPIRED') {
        if (window.Sentry) window.Sentry.captureException(e);
      }
      return null;
    }
  }

  // ── fetchRoleCounts (9개 칩 카운트) ──────────────────────────────────
  async function fetchRoleCounts() {
    // 옵션 (a) RPC 신설 (권장 — 9 query 1 round trip)
    // 옵션 (b) 9개 fetch 병렬 (Promise.all) — 임시
    // → 본 작업은 (b)로 진입, RPC는 별 트랙 등록
    var fetches = ROLE_KEYS.map(function (role) {
      return window.db.fetch('/rest/v1/users?role=eq.' + role + '&select=id', {
        headers: { 'Prefer': 'count=exact' }
      }).then(function (res) {
        var range = res.headers.get('Content-Range') || '0-0/0';
        return { role: role, count: parseInt(range.split('/')[1], 10) || 0 };
      });
    });
    var totalP = window.db.fetch('/rest/v1/users?select=id', {
      headers: { 'Prefer': 'count=exact' }
    }).then(function (res) {
      var range = res.headers.get('Content-Range') || '0-0/0';
      return parseInt(range.split('/')[1], 10) || 0;
    });

    var results = await Promise.all([totalP].concat(fetches));
    return { total: results[0], byRole: results.slice(1) };
  }

  // ── fetchKPI (KPI 3카드) ─────────────────────────────────────────────
  async function fetchKPI() {
    // 1. 전체 가입자 (= role counts total)
    // 2. 활성 사용자 (7일 — last_seen_at >= now - 7d)
    // 3. 신규 가입 (7일 — created_at >= now - 7d)
    var since7 = new Date(Date.now() - 7*86400_000).toISOString();
    var [allRes, activeRes, newRes] = await Promise.all([
      window.db.fetch('/rest/v1/users?select=id', { headers: { 'Prefer': 'count=exact' } }),
      window.db.fetch('/rest/v1/users?last_seen_at=gte.' + since7 + '&select=id', { headers: { 'Prefer': 'count=exact' } }),
      window.db.fetch('/rest/v1/users?created_at=gte.' + since7 + '&select=id', { headers: { 'Prefer': 'count=exact' } })
    ]);
    function parseCount(r) { return parseInt((r.headers.get('Content-Range')||'0-0/0').split('/')[1],10)||0; }
    return { all: parseCount(allRes), active7: parseCount(activeRes), new7: parseCount(newRes) };
  }

  // ── renderUsersTable / renderKPI / renderRoleChips ────────────────────
  // ── (구체 DOM 조작은 admin_v2.html 라인 1490~1700 정합 필요) ──────────
  function renderUsersTable(result) { /* ... DOM 갱신 ... */ }
  function renderKPI(kpi) { /* ... DOM 갱신 ... */ }
  function renderRoleChips(counts) { /* ... DOM 갱신 ... */ }

  // ── showAdminToast (admin_v2.html에 .adm-toast 컴포넌트 신규) ────────
  function showAdminToast(msg, type) { /* ... */ }

  // ── 진입점 (admin_v2 users 뷰 활성화 시 호출) ────────────────────────
  window.admLoadUsers = async function () {
    var [usersResult, kpi, counts] = await Promise.all([
      fetchUsers(), fetchKPI(), fetchRoleCounts()
    ]);
    if (usersResult) renderUsersTable(usersResult);
    if (kpi) renderKPI(kpi);
    if (counts) renderRoleChips(counts);
  };

  // ── 검색/필터/페이지 변경 핸들러 ─────────────────────────────────────
  window.admUsersSearch = adm_debounce(function (val) {
    fetchUsers({ search: val, page: 1 }).then(function (r) { if (r) renderUsersTable(r); });
  }, DEBOUNCE_MS);

  window.admUsersFilterRole = function (role) {
    fetchUsers({ roleFilter: role, page: 1 }).then(function (r) { if (r) renderUsersTable(r); });
  };

  // ... admUsersFilterPlan / admUsersGoToPage / admUsersChangeSort 동일 패턴

})();
```

---

### Step 5 — admin_v2.html mock 제거 + js 연결 (Code)

#### 5-1. js/admin_v2.js 로드 추가
- admin_v2.html `<head>` 또는 `<body>` 끝에 `<script src="../js/admin_v2.js"></script>`

#### 5-2. mock 제거 (라인 1485~1700)
- KPI 3카드 — 하드코딩 1,284 / 487 / 47 → 동적 ID 부여 (`id="adm-kpi-all" / "adm-kpi-active7" / "adm-kpi-new7"`)
- 9역할 칩 — 하드코딩 카운트 → `data-role="ga_member"` 속성 + 동적 카운트 슬롯
- 테이블 10행 — 하드코딩 tr 10개 제거 → `<tbody id="adm-users-tbody"></tbody>` 빈 슬롯
- 검색 input → `oninput="window.admUsersSearch(this.value)"` 연결
- 칩 onclick → `onclick="window.admUsersFilterRole('ga_member')"` 연결
- "Phase C mock" 라벨 제거

#### 5-3. .adm-toast 컴포넌트 신설 (CSS + 함수)
- `<style>` 절에 `.adm-toast` 신규 (헤더 우측 하단 fixed, 5초 자동 사라짐)

#### 5-4. admSwitchView('users') 시 admLoadUsers() 호출
- `window.admSwitchView` 함수에서 view='users' 분기 추가

---

### Step 6 — 라이브 회귀 검증 (변경 0건, D-pre.6 학습 적용)

#### 6-1. 정의 raw 검증
- `js/db.js` ROLE_LABEL 14키 (9 + 4 fallback + admin) raw 표시
- admin_v2.html mock 잔존 0 (grep "1,284\|Phase C mock" 결과 0건)
- DB users role 9역할 정합 (Step 1-1 SELECT 재실행)

#### 6-2. 실 동작 검증 (Chrome 또는 팀장님 직접)
- [ ] admin 본 계정 admin_v2 진입 → users 섹션 진입 → 사용자 표시
- [ ] KPI 3카드 실 데이터 표시
- [ ] 9역할 칩 카운트 실 데이터 표시
- [ ] 검색 input "임태성" → 1건 노출
- [ ] 역할 칩 "GA 지점장" 클릭 → 필터 적용
- [ ] 페이지 2 클릭 → offset 20 fetch + 표시
- [ ] 역할 라벨 "어드민" 표시 (구 "관리자" 잔존 0)

#### 6-3. RBAC 검증 (D-pre.7 학습)
- [ ] 비-admin 계정으로 admin_v2 직접 URL 진입 시도 → 403 → admExit 자동 호출
- [ ] admin 본 계정으로 users 데이터 정상 SELECT (RLS 자기 참조 회귀 0)

#### 6-4. 콘솔·네트워크 검증
- [ ] F12 콘솔 Error 0건
- [ ] Network 4xx/5xx 0건 (의도적 403 제외)

---

### Step 7 — js/db.js Step B: 5역할 fallback 제거 (Code, 단일 커밋)

**전제:** Step 6 라이브 회귀 검증 전건 PASS

#### 7-1. 변경
`js/db.js` 라인 126~ — fallback 4키 제거 (admin 포함 9키만 잔존)

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

#### 7-2. 사후 검증
- 5역할 키 사용처 grep 0건 (`grep -rn "'member'\|'manager'\|'branch_manager'\|'staff'" --include="*.html" --include="*.js"`)
- 라이브 라벨 표시 회귀 0

---

## 4. 절대 원칙 (D-pre 학습 누적)

| # | 원칙 | 학습 출처 |
|:--:|---|---|
| 1 | 신버전(`pdnwgzneooyygfejrvbg`) 확인 후 SQL | CLAUDE.md 절대 규칙 |
| 2 | RLS USING/WITH CHECK 동일 테이블 SELECT 서브쿼리 절대 금지 | D-pre.7 사고 |
| 3 | admin/role 검증은 SECURITY DEFINER 함수 (`is_admin()`) 사용 | D-pre.7 학습 |
| 4 | DB 메타 통과 ≠ 라이브 안전 → 라이브 회귀 검증 필수 | D-pre.7 학습 |
| 5 | 정의 raw + 실 동작 이중 검증 (분할 재실행 미정착 회피) | D-pre.6 사고 |
| 6 | 같은 테이블 다른 cmd(UPDATE/INSERT/DELETE) 정책에도 동일 패턴 잔존 가능 — 사전 sweep 필수 | D-pre.7 § 9 학습 |
| 7 | "재귀 안전 ✅" 단정 결론 금지 — 모든 검증은 SELECT raw | D-pre.7 학습 |
| 8 | Code는 SQL 직접 실행 불가 → 팀장님 Dashboard 실행 + 결과 paste 협업 | 본 세션 확정 |
| 9 | DB UPDATE 전 백업 (Table Editor → Export to CSV) | scripts 보강 정합 학습 |
| 10 | 작업지시서 0번 정합성 검증 → 메인 트랙 차단 시 즉시 멈춤 | CLAUDE.md 절대 프로토콜 |

---

## 5. 보고 양식

### A. Step 1 사전 검증 보고서
- DB SELECT 6건 결과 (current_database / role 분포 / legacy 잔존 / 신컬럼 / RLS / admin)
- Code grep 3건 결과 (ROLE_LABEL 4곳 raw)
- 권장 진행 방안: (가) 그대로 / (나) 일부 수정 / (다) 전면 재작성

### B. Step 2 SQL 적용 보고
- 백업 CSV 파일명·크기
- UPDATE 행 수 (5역할별)
- 사후 검증 SELECT 결과 (legacy_role_count = 0)

### C. Step 3·7 Code 변경 보고
- 변경 파일·라인 수
- diff 요약
- 커밋 해시

### D. Step 4·5 신설·연결 보고
- js/admin_v2.js 라인 수
- admin_v2.html mock 제거 라인 수
- 신규 슬롯 ID 목록

### E. Step 6 라이브 회귀 검증 결과
- 정의 raw 6항목 / 실 동작 7항목 / RBAC 2항목 / 콘솔·네트워크 2항목 = **17항목 PASS / FAIL**

---

## 6. 산출물 위치

```
docs/specs/admin_v2_d1_workorder.md            ← 본 문서
docs/architecture/db_d1_users_capture.md       ← Step 1·2·6 검증 캡처 (작업 시 신설)
js/admin_v2.js                                 ← Step 4 신설 (코드)
js/db.js                                       ← Step 3·7 갱신
pages/admin_v2.html                            ← Step 5 갱신
```

---

## 7. 잔존 부채 (D-1 후 별 트랙 처리)

| # | 항목 | 등록 |
|:--:|---|---|
| 1 | `pricing.html` ROLE_LABEL 자체 정의 (별 트랙) | D-pre.6 잔존 부채 표 |
| 2 | `app.html` B-4 3곳 (별 트랙) | D-pre.6 잔존 부채 표 |
| 3 | RPC `get_role_counts` 신설 (9 query 1 round trip 최적화) | D-1 Step 4 옵션 (b) 임시 |
| 4 | `js/scripts-page.js` ROLE_LABEL 사용처 회귀 점검 | D-1 Step 6에서 실 동작 검증 |
| 5 | `.adm-toast` 컴포넌트 admin_v2 8섹션 공통 사용 (D-2~D-8 적용) | D-2 시점 |
| 6 | RPC `get_dau` 등 D-5 분석 RPC 신설 | D-pre 항목 4 § 5.5 명시 |
| 7 | D-7 billing 제외 (테이블 0건 — payments/subscriptions/plans 미존재) | D-pre 항목 4 § 5.5 명시 |

---

*본 작업지시서는 D-pre.5/6/7/8 학습 전건 반영. 적용 시 Step 1 사전 검증 결과에 따라 Step 2 분기. 팀장님 승인 없이 Code 단독 진행 금지.*
