# admin_v2 Phase D-2 작업지시서 — content 섹션 실 데이터 연결

> **작성일:** 2026-05-04
> **작성자:** Claude Code
> **선행 산출물:** `docs/specs/admin_v2_d1_workorder.md` (D-1 완료 — js/admin_v2.js 신설 + users 섹션 실 연결)
> **종속 학습:** D-pre.5/6/7/8 사고 학습 + D-1 라이브 회귀 검증 17항목 학습 전건 반영
> **상태:** 🟢 즉시 진입 가능 — D-pre 시리즈 + D-1 코드 단계 완료 / 라이브 회귀 검증 결과와 병렬 진행

---

## 0. 큰 그림 정합성 검증 (먼저 수행)

1. `docs/sessions/_INDEX.md` 읽고 메인 트랙 확인 → admin_v2 Phase D 진입 (D-1 완료, D-2 다음 순서)
2. 본 작업이 메인 트랙 정합 → ✅ D-pre.7+8 RLS 청산 완료 + D-1 fetch 패턴 검증 완료
3. 차단 조건: D-1 라이브 회귀 17항목 결과가 **FAIL이면 D-1 정정 우선**, **PASS 또는 미회신이면 D-2 코드 진입 가능** (라이브 회귀와 코드 작업은 직교)

**현재 잔존 별 트랙 (병렬 가능):**
- D-1 라이브 회귀 검증 17항목 (팀장님 Chrome 결과 대기)
- pricing.html ROLE_LABEL 자체 정의 (D-pre.6 잔존)
- app.html B-4 3곳 (D-pre.6 잔존)

---

## 1. 작업 배경

### 1.1 목표

admin_v2.html `content` 섹션 (라인 1620~1818) Phase C mock 데이터를 실 Supabase 데이터로 전환:
- KPI 3카드 (전체 스크립트 / 전체 자료 / 오늘 작성)
- stage 10단계 분포 도넛 SVG + 단계별 비율 panel
- 최근 작성 콘텐츠 테이블 8행 (스크립트 + 자료 통합)

### 1.2 결정 7건 (2026-05-04 결재 완료)

| # | 결정 | 채택안 |
|:--:|---|---|
| **I-1** | scripts + library fetch 패턴 | **(가) 분리 fetch 병렬** (`Promise.all`) — D-pre §5.5 명시 패턴 |
| **I-2** | stage 10단계 분포 | **(가) 직접 GROUP BY 쿼리 1회** — RPC 미신설, 별 트랙 분리 |
| **I-3** | "조회" 컬럼 의도 | **(가) `scripts.use_count` 매핑** — library는 "—" 표시 |
| **I-4** | "저장" 컬럼 부재 | **(가) D-2 범위에서 "—" 표시** + 별 트랙 등록 (saves 테이블 검토) |
| **I-5** | 작성자 표시 | **(가) `owner_email` 그대로** — users join은 별 트랙 (text↔uuid 매칭 부담) |
| **I-6** | library stage 부재 | **(가) 도넛은 scripts 단독** — 전체 기준 정합 + 자료는 stage "—" |
| **I-7** | "전체 보기" 버튼 | **(가) D-2 범위 외, mock UI 보존** (이벤트 미연결, 별 트랙) |

### 1.3 결정 5건 (D-1 적용 전건 승계)

| # | 결정 | D-2 적용 |
|:--:|---|---|
| **H-1** | fetch 호출 = `window.db.fetch()` 차용 | ✅ 그대로 적용 |
| **H-2** | 페이징·검색·필터 = 20행 / 300ms / AND / Prefer count=exact | D-2는 KPI + 도넛 + 8행 표 (페이징 X) → KPI는 count=exact만, 표는 limit 8 |
| **H-3** | 에러 처리 = 401 자동 / 403 admExit / 500 토스트 / 네트워크 1회 | ✅ 그대로 적용 |
| **추-1** | js/admin_v2.js 확장 (D-1 신설본에 함수 추가) | ✅ 적용 |
| **추-3** | 라이브 회귀 검증 = 정의 raw + 실 동작 이중 검증 | ✅ 적용 |

---

## 2. 변경 범위 (3파일)

| 파일 | 변경 유형 | 라인 |
|---|---|---|
| `js/admin_v2.js` | UPDATE — content 섹션 함수 추가 (D-1 신설본 확장) | 끝부분에 ~250줄 추가 예상 |
| `pages/admin_v2.html` | UPDATE — content 섹션 mock 제거 + 슬롯 ID 부여 + js 연결 | 라인 1635~1816 (~180줄 영향) |
| Supabase DB | **변경 0건** | scripts/library 정책 D-pre.8/D-pre.7 청산 완료 — 회귀 검증만 |

**제외 (D-2 범위 외):**
- `js/scripts-page.js` — D-2 영향 0 (사용자 페이지 fetch 패턴은 별 트랙 마이그레이션)
- saves 테이블 신설 — 별 트랙 (잔존 부채 #1)
- "전체 보기" 페이징 진입 — 별 트랙 (잔존 부채 #2)
- stage 분포 RPC 신설 — 별 트랙 (잔존 부채 #3)

---

## 3. Step 분할 (5단계 — D-1보다 가벼움 / DB UPDATE·ROLE_LABEL 변경 없음)

### Step 1 — 사전 검증 (DB·코드 변경 0건)

#### 1-1. SELECT 검증 (Supabase Dashboard SQL Editor — 신버전 `pdnwgzneooyygfejrvbg`)

```sql
-- (1) 신버전 재확인 (CLAUDE.md 절대 원칙 #1)
SELECT current_database();

-- (2) scripts 테이블 raw 카운트 + 오늘 작성 정의
SELECT COUNT(*) AS scripts_total FROM public.scripts;
SELECT COUNT(*) AS scripts_today
FROM public.scripts
WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Seoul');

-- (3) library 테이블 raw 카운트 + 오늘 작성
SELECT COUNT(*) AS library_total FROM public.library;
SELECT COUNT(*) AS library_today
FROM public.library
WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Seoul');

-- (4) scripts.stage raw 키 분포 (도넛 매핑 결정에 핵심)
SELECT stage, COUNT(*) AS row_count
FROM public.scripts
GROUP BY stage
ORDER BY row_count DESC;

-- (5) scripts use_count 분포 (NULL/0/양수 정합)
SELECT
  COUNT(*) FILTER (WHERE use_count IS NULL) AS null_count,
  COUNT(*) FILTER (WHERE use_count = 0)     AS zero_count,
  COUNT(*) FILTER (WHERE use_count > 0)     AS positive_count,
  MAX(use_count) AS max_use,
  AVG(use_count)::int AS avg_use
FROM public.scripts;

-- (6) RLS 회귀 점검 — D-pre.8 청산 결과 정합
SELECT policyname, cmd, roles, qual AS using_clause, with_check AS with_check_clause
FROM pg_policies WHERE schemaname='public' AND tablename='scripts'
ORDER BY cmd, policyname;

-- (7) RLS 회귀 점검 — library D-pre.7 청산 결과 정합
SELECT policyname, cmd, roles, qual AS using_clause, with_check AS with_check_clause
FROM pg_policies WHERE schemaname='public' AND tablename='library'
ORDER BY cmd, policyname;

-- (8) 자기 참조 회귀 sweep (D-pre.7 영구 학습 #4)
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname='public'
  AND tablename IN ('scripts','library')
  AND (qual ILIKE '%FROM scripts%' OR qual ILIKE '%FROM library%'
       OR with_check ILIKE '%FROM scripts%' OR with_check ILIKE '%FROM library%');
-- 기대값: 0건 (D-pre.7 청산 후)
```

#### 1-2. Code grep 검증

```bash
# admin_v2.html content 섹션 mock 영역 정합
grep -n "Phase C mock\|3,847\|628\|adm-content-grid\|stage 10단계" pages/admin_v2.html

# js/admin_v2.js 현재 함수 목록 (D-1 신설본 raw)
grep -n "^  async function\|^  function\|^  window\." js/admin_v2.js

# scripts-page.js 사용처 회귀 검증 (D-2 영향 0 확인)
grep -n "/scripts?\|/library?" js/scripts-page.js
```

#### 1-3. 보고 양식 (Step 2 진입 승인 대기)

| 항목 | 결과 raw |
|---|---|
| current_database | (paste) |
| scripts_total / scripts_today | (paste) |
| library_total / library_today | (paste) |
| stage 키 raw 분포 | (paste — 한국어 "1. 인사·라포" vs 영문 vs 숫자만) |
| use_count NULL/0/양수 | (paste) |
| scripts 정책 raw | 2건 (`admin manage scripts` ALL `is_admin()` + `authenticated read scripts` USING true) 정합 ✅ |
| library 정책 raw | 2건 (`library_select_own_or_shared` + `admin_select_all_library` `is_admin()`) 정합 ✅ |
| 자기 참조 sweep | 0건 ✅ |
| Code grep 결과 | (paste) |
| 권장 진행 방안 | (가) 그대로 / (나) 일부 수정 / (다) 전면 재작성 |

→ **검증 결과 보고 후 Step 2 진입 승인 대기.** stage 키 raw 분포가 mock의 한국어 라벨("1. 인사·라포" 등)과 다르면 라벨 매핑 테이블 추가 필요.

---

### Step 2 — js/admin_v2.js 확장 (Code, content 섹션 함수 추가)

#### 2-1. 추가 함수 8종

D-1에서 신설된 IIFE 내부에 다음 함수들을 추가 (배포 패턴은 D-1과 동일 — `window.admLoad*` 진입점 + 내부 fetch/render 분리):

```js
// ════════════════════════════════════════════════════════════════════════
// admin_v2 D-2 content — scripts + library + stage 10단계 분포
// ════════════════════════════════════════════════════════════════════════

// ── stage 10단계 라벨 (admin_v2.html 라인 1701~1710 정합) ─────────────
//   ⚠️ Step 1-1 (4) 결과에 따라 키가 달라짐:
//   - DB raw가 한국어 "1. 인사·라포"이면 그대로 사용 (mock과 1:1)
//   - DB raw가 영문/숫자이면 매핑 테이블 신설 필요
var STAGE_LABELS = [
  '1. 인사·라포',  '2. 도입',       '3. 니즈 발굴',  '4. 보장 분석',
  '5. 솔루션 제시', '6. 클로징',     '7. 반론 대응',  '8. 계약',
  '9. 인계',        '10. 사후 관리'
];
var STAGE_COLORS = [
  '#D4845A', '#E89A6F', '#FBB08A', '#3B82F6', '#60A5FA',
  '#93C5FD', '#10B981', '#34D399', '#F59E0B', '#FCD34D'
];

// ── 콘텐츠 KPI 3카드 (전체 스크립트 / 전체 자료 / 오늘 작성) ──────────
async function fetchContentKPI() {
  // 오늘 자정 (Asia/Seoul) — JS는 UTC 기준이라 KST offset 적용
  var todayKstStart = new Date();
  todayKstStart.setUTCHours(15, 0, 0, 0); // KST 자정 = UTC 15:00 전날
  if (todayKstStart > new Date()) {
    todayKstStart.setUTCDate(todayKstStart.getUTCDate() - 1);
  }
  var sinceToday = todayKstStart.toISOString();

  var [scriptsAll, libraryAll, scriptsToday, libraryToday] = await Promise.all([
    window.db.fetch('/rest/v1/scripts?select=id', { headers: { 'Prefer': 'count=exact' } }),
    window.db.fetch('/rest/v1/library?select=id', { headers: { 'Prefer': 'count=exact' } }),
    window.db.fetch('/rest/v1/scripts?created_at=gte.' + sinceToday + '&select=id',
      { headers: { 'Prefer': 'count=exact' } }),
    window.db.fetch('/rest/v1/library?created_at=gte.' + sinceToday + '&select=id',
      { headers: { 'Prefer': 'count=exact' } })
  ]);

  function parseCount(r) {
    return parseInt((r.headers.get('Content-Range') || '0-0/0').split('/')[1], 10) || 0;
  }
  return {
    scriptsTotal: parseCount(scriptsAll),
    libraryTotal: parseCount(libraryAll),
    todayCount:   parseCount(scriptsToday) + parseCount(libraryToday)
  };
}

// ── stage 10단계 분포 (scripts 단독, library 제외 — I-6 결정) ─────────
async function fetchStageDistribution() {
  // 옵션 (a) PostgREST aggregate (Postgres 12+ 지원, 환경 검증 필요)
  // 옵션 (b) 전체 fetch + 클라이언트 GROUP BY — 안정적, 3,847행 부담 적음
  // → 옵션 (b) 채택 (I-2 결정)
  var res = await window.db.fetch(
    '/rest/v1/scripts?select=stage&limit=10000',
    { headers: { 'Prefer': 'count=exact' } }
  );
  if (!res.ok) {
    if (res.status === 403 && typeof window.admExit === 'function') window.admExit();
    showAdminToast('stage 분포 로드 실패 (' + res.status + ')', 'danger');
    return null;
  }
  var rows = await res.json();
  var totalRange = res.headers.get('Content-Range') || '0-0/0';
  var total = parseInt(totalRange.split('/')[1], 10) || rows.length;

  // 클라이언트 GROUP BY
  var counts = {};
  rows.forEach(function (r) {
    var k = r.stage || '(미지정)';
    counts[k] = (counts[k] || 0) + 1;
  });
  return { total: total, counts: counts };
}

// ── 최근 콘텐츠 8행 (scripts + library 분리 fetch → merge — I-1 결정) ─
async function fetchRecentContent(limit) {
  limit = limit || 8;
  // 각 테이블에서 최근 limit개씩 fetch → merge → 다시 limit개 (created_at desc)
  var [scriptsRes, libraryRes] = await Promise.all([
    window.db.fetch(
      '/rest/v1/scripts?select=id,title,stage,owner_email,use_count,created_at' +
      '&order=created_at.desc&limit=' + limit
    ),
    window.db.fetch(
      '/rest/v1/library?select=id,title,owner_email,created_at' +
      '&order=created_at.desc&limit=' + limit
    )
  ]);

  if (!scriptsRes.ok || !libraryRes.ok) {
    var bad = !scriptsRes.ok ? scriptsRes : libraryRes;
    if (bad.status === 403 && typeof window.admExit === 'function') window.admExit();
    showAdminToast('콘텐츠 로드 실패 (' + bad.status + ')', 'danger');
    return null;
  }

  var scriptsRows = (await scriptsRes.json()).map(function (r) {
    return { type: 'script', id: r.id, title: r.title, stage: r.stage,
             owner_email: r.owner_email, use_count: r.use_count, save_count: null,
             created_at: r.created_at };
  });
  var libraryRows = (await libraryRes.json()).map(function (r) {
    return { type: 'library', id: r.id, title: r.title, stage: null,
             owner_email: r.owner_email, use_count: null, save_count: null,
             created_at: r.created_at };
  });

  // merge + sort by created_at desc + slice(0, limit)
  var merged = scriptsRows.concat(libraryRows).sort(function (a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  }).slice(0, limit);

  return merged;
}

// ── render: KPI 3카드 ─────────────────────────────────────────────────
function renderContentKPI(kpi) {
  if (!kpi) return;
  var elScripts = document.getElementById('adm-content-kpi-scripts');
  var elLibrary = document.getElementById('adm-content-kpi-library');
  var elToday   = document.getElementById('adm-content-kpi-today');
  if (elScripts) elScripts.textContent = kpi.scriptsTotal.toLocaleString('ko-KR');
  if (elLibrary) elLibrary.textContent = kpi.libraryTotal.toLocaleString('ko-KR');
  if (elToday)   elToday.textContent   = kpi.todayCount.toLocaleString('ko-KR');
}

// ── render: stage 도넛 SVG + 범례 ─────────────────────────────────────
function renderStageDonut(dist) {
  if (!dist) return;
  var donutHost = document.getElementById('adm-content-stage-donut');
  var legendHost = document.getElementById('adm-content-stage-legend');
  var totalEl = document.getElementById('adm-content-stage-total');
  var topEl = document.getElementById('adm-content-stage-top');

  if (!donutHost || !legendHost) return;

  var total = dist.total || 1;
  if (totalEl) totalEl.textContent = total.toLocaleString('ko-KR');

  // STAGE_LABELS 순서대로 카운트 추출 (DB raw 키가 일치한다는 전제 — Step 1-1 (4) 검증)
  var ordered = STAGE_LABELS.map(function (label, i) {
    var cnt = dist.counts[label] || 0;
    return { label: label, count: cnt, color: STAGE_COLORS[i], pct: total ? (cnt / total) * 100 : 0 };
  });

  // 도넛 SVG 재계산 (mock의 stroke-dasharray 패턴)
  var circumference = 2 * Math.PI * 80; // ≈ 502.65
  var offset = 0;
  var circles = ordered.map(function (s) {
    var dash = (s.pct / 100) * circumference;
    var c = '<circle r="80" fill="none" stroke="' + s.color +
            '" stroke-width="32" stroke-dasharray="' + dash.toFixed(2) +
            ' ' + (circumference - dash).toFixed(2) +
            '" stroke-dashoffset="' + (-offset).toFixed(2) + '"/>';
    offset += dash;
    return c;
  }).join('');
  donutHost.innerHTML = circles;

  // 범례 + 최다 stage 표시
  var max = ordered.reduce(function (a, b) { return b.count > a.count ? b : a; }, ordered[0]);
  if (topEl) topEl.textContent = '최다: ' + (max.label.replace(/^\d+\.\s*/, '')) +
                                 ' ' + max.pct.toFixed(0) + '%';

  legendHost.innerHTML = ordered.map(function (s) {
    var pct = s.pct.toFixed(0);
    return '<div style="display:flex;align-items:center;gap:10px;">' +
      '<span style="width:10px;height:10px;background:' + s.color + ';border-radius:2px;"></span>' +
      '<span style="flex:1;color:var(--admin-text-primary);">' + escapeHtml(s.label) + '</span>' +
      '<span style="color:var(--admin-text-secondary);font-weight:700;">' +
      pct + '% · ' + s.count.toLocaleString('ko-KR') + '</span></div>';
  }).join('');
}

// ── render: 최근 콘텐츠 테이블 8행 ────────────────────────────────────
function renderRecentContentTable(rows) {
  var tbody = document.getElementById('adm-content-recent-tbody');
  if (!tbody) return;
  if (!rows || rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;' +
                      'color:var(--admin-text-tertiary);">콘텐츠가 없습니다.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(function (r) {
    var typeBadge = r.type === 'script'
      ? '<span class="adm-badge" style="background:var(--admin-info-bg);color:var(--color-info);">스크립트</span>'
      : '<span class="adm-badge" style="background:var(--admin-success-bg);color:var(--color-success);">자료</span>';
    var stageCell = r.stage
      ? '<span style="font-size:11px;color:var(--admin-text-secondary);">' + escapeHtml(r.stage) + '</span>'
      : '<span style="font-size:11px;color:var(--admin-text-tertiary);">—</span>';
    var useCell  = r.use_count != null ? r.use_count.toLocaleString('ko-KR')
                                       : '<span style="color:var(--admin-text-tertiary);">—</span>';
    var saveCell = '<span style="color:var(--admin-text-tertiary);">—</span>'; // I-4 결정
    return '<tr>' +
      '<td>' + typeBadge + '</td>' +
      '<td><strong>' + escapeHtml(r.title || '(제목 없음)') + '</strong></td>' +
      '<td>' + stageCell + '</td>' +
      '<td>' + escapeHtml(r.owner_email || '—') + '</td>' +
      '<td style="font-feature-settings:\'tnum\';">' + useCell + '</td>' +
      '<td style="font-feature-settings:\'tnum\';">' + saveCell + '</td>' +
      '<td>' + formatRelativeTime(r.created_at) + '</td>' +
      '<td><div class="row-actions">' +
        '<button title="상세" onclick="window.admContentView(\'' + r.type + '\',' + r.id + ')">👁️</button>' +
        '<button title="편집" onclick="window.admContentEdit(\'' + r.type + '\',' + r.id + ')">✏️</button>' +
      '</div></td></tr>';
  }).join('');
}

// ── 상대 시간 포맷 ("3시간 전" / "어제" / "2일 전" / "2026-04-15") ──
function formatRelativeTime(iso) {
  if (!iso) return '—';
  var diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)        return '방금 전';
  if (diff < 3600)      return Math.floor(diff / 60) + '분 전';
  if (diff < 86400)     return Math.floor(diff / 3600) + '시간 전';
  if (diff < 86400 * 2) return '어제';
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + '일 전';
  // 7일 초과 → 절대 날짜
  var d = new Date(iso);
  return d.getFullYear() + '-' +
         String(d.getMonth() + 1).padStart(2, '0') + '-' +
         String(d.getDate()).padStart(2, '0');
}

// ── 진입점 (admin_v2 content 뷰 활성화 시 호출) ───────────────────────
window.admLoadContent = async function () {
  var [kpi, dist, rows] = await Promise.all([
    fetchContentKPI(), fetchStageDistribution(), fetchRecentContent(8)
  ]);
  // race 안전장치 (D-1 패턴 — 다른 view로 이동 후 응답 도착 시 무시)
  if (!isViewActive('content')) return;
  if (kpi)  renderContentKPI(kpi);
  if (dist) renderStageDonut(dist);
  if (rows) renderRecentContentTable(rows);
};

// ── 행 액션 핸들러 (I-7 결정: D-2 범위 외, mock UI 보존 — 토스트만) ──
window.admContentView = function (type, id) {
  showAdminToast('상세 보기 — Phase D 후 구현 (' + type + ' #' + id + ')', 'info');
};
window.admContentEdit = function (type, id) {
  showAdminToast('편집 — Phase D 후 구현 (' + type + ' #' + id + ')', 'info');
};
```

#### 2-2. 의존 함수 정합

`isViewActive()`, `escapeHtml()`, `showAdminToast()` 모두 D-1 신설본에 이미 존재 — 재사용. 신규 헬퍼는 `formatRelativeTime` 1개.

#### 2-3. 커밋 단위

Step 2·3 단일 커밋 묶음 권장 (D-1 Step 4·5 패턴 정합 — 코드와 마크업이 슬롯 ID로 강결합).

---

### Step 3 — admin_v2.html mock 제거 + 슬롯 ID 부여 + js 연결 (Code)

#### 3-1. KPI 3카드 슬롯화 (라인 1636~1661)

mock 하드코딩 `3,847` / `628` / `23` → 동적 슬롯 ID 부여 + 추세 메타("▲ 184건") 제거 (D-2 범위 외, 별 트랙):

```html
<!-- 라인 1642 변경 -->
<div class="adm-kpi-value" id="adm-content-kpi-scripts">—</div>
<!-- "▲ 184건 vs 지난 달" 라인은 그대로 둠 (mock 라벨 — Phase E 추세 RPC 신설 시점에 동적화) -->

<!-- 라인 1650 변경 -->
<div class="adm-kpi-value" id="adm-content-kpi-library">—</div>

<!-- 라인 1658 변경 -->
<div class="adm-kpi-value" id="adm-content-kpi-today">—</div>
```

⚠️ **추세 라벨 처리 결정:** mock "▲ 184건" 류는 **그대로 보존** (별 트랙 — Phase E 추세 비교 RPC 신설 시 동적화). I-7 결정 정합 (mock UI 보존 + 라벨 별 트랙).

#### 3-2. stage 도넛 슬롯화 (라인 1673~1689)

mock SVG 10개 `<circle>` 하드코딩 → 동적 갱신 슬롯:

```html
<svg viewBox="0 0 220 220" style="width: 220px; height: 220px;">
  <g transform="translate(110, 110) rotate(-90)">
    <circle r="80" fill="none" stroke="var(--admin-surface-2)" stroke-width="32"/>
    <g id="adm-content-stage-donut"></g>
  </g>
  <text x="110" y="105" text-anchor="middle" font-size="32" font-weight="900"
        fill="var(--admin-text-primary)" font-family="DM Sans" id="adm-content-stage-total">—</text>
  <text x="110" y="128" text-anchor="middle" font-size="11" font-weight="700"
        fill="var(--admin-text-tertiary)" font-family="DM Sans" letter-spacing="0.5">총 스크립트</text>
</svg>
```

#### 3-3. 단계별 비율 panel 슬롯화 (라인 1700~1711)

10개 `<div>` 행 하드코딩 → 동적 슬롯:

```html
<div class="adm-panel-meta" id="adm-content-stage-top">—</div>
<!-- ... -->
<div class="adm-panel-body">
  <div id="adm-content-stage-legend" style="display:flex;flex-direction:column;gap:8px;font-size:12px;"></div>
</div>
```

#### 3-4. 최근 콘텐츠 테이블 슬롯화 (라인 1732~1813)

mock 8행 `<tr>` 하드코딩 → 동적 tbody:

```html
<tbody id="adm-content-recent-tbody">
  <tr><td colspan="8" style="text-align:center;padding:24px;color:var(--admin-text-tertiary);">
    로드 중...
  </td></tr>
</tbody>
```

#### 3-5. "Phase C mock" 라벨 제거 (라인 1627)

```html
<!-- 변경 전 -->
<div class="adm-section-desc">스크립트 라이브러리 · 자료실 · 10단계 stage 분포 · 게시 관리.
  <span style="color:var(--color-accent);font-weight:700;">[Phase C mock]</span></div>

<!-- 변경 후 -->
<div class="adm-section-desc">스크립트 라이브러리 · 자료실 · 10단계 stage 분포 · 게시 관리.</div>
```

#### 3-6. admSwitchView('content') → admLoadContent() 호출 분기 추가

D-1에서 `admSwitchView` 함수에 `if (view === 'users') admLoadUsers();` 분기가 있을 것 → `else if (view === 'content') admLoadContent();` 추가.

#### 3-7. data-status="pending" 제거 (라인 1066 rail)

```html
<!-- 변경 전 -->
<button class="adm-rail-btn" data-tooltip="콘텐츠" data-view="content" data-status="pending" ...>📋<span class="adm-rail-status"></span></button>

<!-- 변경 후 (Phase D 진입 표식) -->
<button class="adm-rail-btn" data-tooltip="콘텐츠" data-view="content" ...>📋<span class="adm-rail-status"></span></button>
```

⚠️ **메뉴 pane (라인 1127~) `.pending` 클래스 처리:** content 메뉴 항목 중 D-2 범위인 "스크립트 라이브러리" / "자료실 관리" 만 .pending 제거. 나머지(예: 카테고리 관리·태그 관리)는 .pending 유지 (Phase E 범위).

→ Step 1-2 grep 결과 raw에 따라 정확한 라인 결정.

---

### Step 4 — 라이브 회귀 검증 (변경 0건, D-pre.6 학습 적용)

#### 4-1. 정의 raw 검증 (Code 직접)

- [ ] `js/admin_v2.js` 신규 함수 8종 정의 raw 표시 (`fetchContentKPI` / `fetchStageDistribution` / `fetchRecentContent` / `renderContentKPI` / `renderStageDonut` / `renderRecentContentTable` / `formatRelativeTime` / `admLoadContent`)
- [ ] `pages/admin_v2.html` mock 잔존 0 (`grep "3,847\|628\|Phase C mock\|stroke-dasharray=\"40.21" pages/admin_v2.html` content 섹션 결과 0건)
- [ ] DB raw 회귀: scripts/library 정책 D-pre.7+8 청산 결과 정합 (Step 1-1 (6)(7)(8) 재실행)
- [ ] STAGE_LABELS 키가 Step 1-1 (4) DB raw와 1:1 정합 (한국어 매칭 확인)

#### 4-2. 실 동작 검증 (팀장님 Chrome 또는 Code 보고서)

- [ ] admin 본 계정 admin_v2 진입 → content rail 클릭 → 섹션 진입 → KPI 3카드 실 데이터 표시
- [ ] stage 도넛 SVG 동적 렌더링 (`<g id="adm-content-stage-donut">` 내부 10개 `<circle>` 생성)
- [ ] 단계별 비율 범례 10개 행 표시 (`최다: ...` 라벨 동적)
- [ ] 최근 콘텐츠 테이블 8행 표시 (스크립트 + 자료 혼합 + created_at desc 정렬)
- [ ] 타입 뱃지 색 분기 (스크립트=info / 자료=success)
- [ ] 자료 행은 stage / use_count / save_count 모두 "—" 표시
- [ ] 작성자 = `owner_email` 표시 (I-5 결정 정합)
- [ ] 작성일 상대 시간 ("3시간 전" / "어제" / "2일 전") 표시
- [ ] 행 액션 버튼 클릭 시 토스트 노출 (I-7 결정)

#### 4-3. RBAC 검증 (D-pre.7 학습)

- [ ] 비-admin 계정으로 admin_v2 직접 URL 진입 시도 → 401/403 → admExit 자동 호출
- [ ] admin 본 계정으로 scripts·library 데이터 정상 SELECT (RLS 자기 참조 회귀 0)
- [ ] (옵션) 별 트랙 β `pages/*.html` 인증 게이트와 충돌 없음 검증

#### 4-4. 콘솔·네트워크 검증

- [ ] F12 콘솔 Error 0건
- [ ] Network 4xx/5xx 0건 (의도적 403 제외)
- [ ] scripts fetch + library fetch 병렬 (Network 타임라인에서 동시 시작 확인)
- [ ] D-1 users 섹션 회귀 0 (content 진입 후 users 재진입 시 정상 표시)
- [ ] race 안전장치: content 진입 → 즉시 dashboard로 이동 → content 응답 도착 시 무시 (race 조건 검증)

#### 4-5. 성능 검증 (옵션)

- [ ] stage 분포 fetch 라운드트립 1회 (옵션 b 채택 — 3,847행 클라이언트 GROUP BY 부담 < 200ms 기대)
- [ ] 옵션 b가 라이브에서 1초 이상 소요 시 → 별 트랙 RPC 신설 (잔존 부채 #3 우선순위 격상)

---

### Step 5 — 잔존 부채 등록 + 별 트랙 분리 (문서 작업)

#### 5-1. `_INDEX.md` Phase D 표 갱신

Phase D 세부 단계 표에서 D-2 row를 "✅ 완료"로 표시 + 8섹션 매핑 표에서 content를 "Live (D-2)" 로 갱신.

#### 5-2. 잔존 부채 등록 (별 트랙 표)

| # | 부채 | 결정 근거 |
|:--:|---|---|
| 1 | `scripts.save_count` 또는 `saves` 테이블 신설 — 사용자 북마크 도메인 | I-4 |
| 2 | "전체 보기" 버튼 → content 풀 페이지 (페이징 진입) | I-7 |
| 3 | `get_stage_distribution` RPC 신설 (옵션 b 클라이언트 GROUP BY → 라운드트립 0회 최적화) | I-2 |
| 4 | `owner_id` (text) → `users` join RPC (작성자 이름·역할 표시) | I-5 |
| 5 | KPI 카드 추세 라벨 "▲ 184건 vs 지난 달" 동적화 — 기간 비교 RPC | Step 3-1 |
| 6 | content 메뉴 pane 잔여 항목(.pending 유지) Phase E 범위 정합 | Step 3-7 |

#### 5-3. session 종료 시 `/session-end` 슬래시 커맨드

- 본 작업지시서 + 사후 검증 캡처 + admin_v2.js 변경 + admin_v2.html 변경 = 1 커밋
- `_INDEX.md` 갱신 = 1 커밋
- 라이브 회귀 검증 의뢰서 신설 (D-1 패턴 그대로) = 1 커밋

---

## 4. 절대 원칙 (D-pre + D-1 학습 누적)

| # | 원칙 | 학습 출처 |
|:--:|---|---|
| 1 | 신버전(`pdnwgzneooyygfejrvbg`) 확인 후 SQL | CLAUDE.md 절대 규칙 |
| 2 | RLS USING/WITH CHECK 동일 테이블 SELECT 서브쿼리 절대 금지 | D-pre.7 사고 |
| 3 | admin/role 검증은 SECURITY DEFINER 함수 (`is_admin()`) 사용 | D-pre.7 학습 |
| 4 | DB 메타 통과 ≠ 라이브 안전 → 라이브 회귀 검증 필수 | D-pre.7 학습 |
| 5 | 정의 raw + 실 동작 이중 검증 (분할 재실행 미정착 회피) | D-pre.6 사고 |
| 6 | 같은 테이블 다른 cmd 정책에도 동일 패턴 잔존 가능 — 사전 sweep 필수 | D-pre.7 § 9 학습 |
| 7 | "재귀 안전 ✅" 단정 결론 금지 — 모든 검증은 SELECT raw | D-pre.7 학습 |
| 8 | Code는 SQL 직접 실행 불가 → 팀장님 Dashboard 실행 + 결과 paste 협업 | D-1 확정 |
| 9 | DB UPDATE 전 백업 (Table Editor → Export to CSV) | scripts 보강 정합 학습 |
| 10 | 작업지시서 0번 정합성 검증 → 메인 트랙 차단 시 즉시 멈춤 | CLAUDE.md 절대 프로토콜 |
| 11 | race 안전장치 — fetch 응답 도착 시 active view 재확인 후 render | D-1 학습 |
| 12 | mock UI 보존 vs 동적화 분리 — 추세·페이징 등 별 트랙 분리 | I-7 결정 |

---

## 5. 보고 양식

### A. Step 1 사전 검증 보고서

- DB SELECT 8건 결과 (current_database / scripts·library 카운트 / stage raw / use_count 분포 / scripts·library 정책 raw / 자기 참조 sweep)
- Code grep 3건 결과 (mock 영역 / admin_v2.js 함수 목록 / scripts-page.js)
- STAGE_LABELS DB 키 정합 여부 (한국어 매칭)
- 권장 진행 방안: (가) 그대로 / (나) 일부 수정 / (다) 전면 재작성

### B. Step 2·3 Code 변경 보고

- `js/admin_v2.js` 라인 수 (D-1 342 → ~600 예상)
- `admin_v2.html` mock 제거 라인 수 (~180줄 영향)
- 신규 슬롯 ID 목록 (8개 신규)
- 커밋 해시

### C. Step 4 라이브 회귀 검증 결과

- 정의 raw 4항목 / 실 동작 9항목 / RBAC 3항목 / 콘솔·네트워크 5항목 + 성능 2항목 = **총 23항목 PASS / FAIL**

### D. Step 5 잔존 부채 등록

- `_INDEX.md` 갱신 diff
- 잔존 부채 6건 별 트랙 표 등록
- 세션 종료 노트

---

## 6. 산출물 위치

```
docs/specs/admin_v2_d2_workorder.md            ← 본 문서
docs/architecture/db_d2_content_capture.md     ← Step 1·4 검증 캡처 (작업 시 신설)
docs/specs/admin_v2_d2_live_regression_2026-05-XX.md  ← Step 4 라이브 회귀 의뢰서 (D-1 패턴 정합)
js/admin_v2.js                                 ← Step 2 확장 (D-1 신설본 끝부분에 ~250줄 추가)
pages/admin_v2.html                            ← Step 3 갱신 (라인 1620~1818 mock 제거)
docs/sessions/_INDEX.md                        ← Step 5 갱신 (Phase D 표 + 8섹션 매핑)
```

---

## 7. 잔존 부채 (D-2 후 별 트랙 처리)

| # | 항목 | 등록 시점 |
|:--:|---|---|
| 1 | `scripts.save_count` 또는 `saves` 테이블 신설 (사용자 북마크) | I-4 |
| 2 | "전체 보기" 버튼 → content 풀 페이지 (페이징·검색·필터·정렬) | I-7 |
| 3 | `get_stage_distribution` RPC 신설 (옵션 b 라운드트립 최적화) | I-2 |
| 4 | `owner_id` (text) ↔ `users` join 패턴 RPC (작성자 이름·역할 표시) | I-5 |
| 5 | KPI 카드 추세 라벨 "▲ 184건 vs 지난 달" 동적화 (기간 비교 RPC) | Step 3-1 |
| 6 | content 메뉴 pane 잔여 항목(.pending 유지) Phase E 범위 정합 | Step 3-7 |
| 7 | `.adm-toast` D-3~D-8 적용 (D-1에서 신설, D-2도 사용) | D-1 누적 |
| 8 | **STAGE_LABELS 매핑 테이블 신설 — DB raw 영문 슬러그(`opening`/`opening_rejection`/`situation_check`/`analysis`/`need_emphasis`/`need_emphasis_2`/`product`/`objection`/`closing`/`closing_second` 10종) ↔ admin_v2.html 한국어 라벨 1:1 매핑** — § 2-1 STAGE_LABELS 한국어 배열 그대로 사용 시 도넛 0% 회귀. Step 1-1 (4) 결과 paste 단계에서 매핑 결정 (예: `opening`→"1. 인사·라포" / `closing`→"6. 클로징" 등) 후 § 2-1 코드에 const 객체로 명문화 | scripts 보강 트랙 5/4 사전 검증 (F-1 발견) |

---

*본 작업지시서는 D-pre.5/6/7/8 + D-1 학습 전건 반영. 적용 시 Step 1 사전 검증 결과에 따라 Step 2 stage 라벨 매핑 분기. 팀장님 승인 없이 Code 단독 진행 금지 (Step 1 결과 보고 → Step 2 진입 승인 대기).*
