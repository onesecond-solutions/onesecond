# admin_v2 Phase D-3 작업지시서 — board 섹션 실 데이터 연결

> **작성일:** 2026-05-04
> **작성자:** Claude Code
> **선행 산출물:**
> - 통합 작업지시서: `docs/specs/admin_v2_d3_to_dfinal_workorder_v1.md` § 2 (D-3 사전 분석 본문)
> - D-pre 시리즈: `docs/specs/admin_v2_phase_d_pre.md` + D-pre.5/6/7/8 capture 4건
> - D-1 작업지시서: `docs/specs/admin_v2_d1_workorder.md` (502줄, D-1 users 패턴)
> - D-2 작업지시서: `docs/specs/admin_v2_d2_workorder.md` (681줄, D-2 content 패턴)
> **결재 결과:** 2026-05-04 J-1~J-7 일괄 승인 (옵션 I 권장값 7건)
> **상태:** 🟢 Step 1 사전 검증 진입 즉시 가능

---

## 0. 큰 그림 정합성 검증 (D-pre.5/6/7/8 + D-1 + D-2 종료 시점)

1. `docs/sessions/_INDEX.md` 메인 트랙 = admin_v2 Phase D 진입 ✅
2. D-2 24/25 PASS 완전 종료 (`ace85d0`, P3 별 트랙 분리 처리 완료) ✅
3. 통합 작업지시서 v1 발행 완료 (`85ff4d2`) ✅
4. D-3 본 작업지시서 = 통합본 § 2 인용 + Step 분할 본문 ✅
5. 차단 조건 없음 → Step 1 사전 검증 진입

**현재 잔존 별 트랙 (병렬 가능, D-3 차단 0):**
- P3 PostgREST 분석 (Phase E 격상, `admin_v2_p3_postgrest_analysis.md`)
- scripts 보강 Step 1·3·4 Web 의뢰서 작성
- 자료 자산화 트랙 (저작권 보류)

---

## 1. 작업 배경

### 1.1 목표

admin_v2.html `board` 섹션의 Phase C mock(KPI 3카드 + 라인차트 + 신고 5행)을 실 Supabase 데이터로 전환 + 모더레이션 액션 3종(숨김 / 삭제 / 사용자 정지) 활성.

### 1.2 결재 결과 (J-1 ~ J-7, 2026-05-04 일괄 승인)

| # | 결정 | 채택 | 영향 |
|:--:|---|---|---|
| **J-1** | 모더레이션 액션 표준 | (a) 3종 — 숨김 + 삭제 + 정지 | js/admin_v2.js handle 함수 3종 |
| **J-2** ⭐ | post_reports 테이블 처리 | (b) v2.0 대기 + mock 라벨만 동적 | **DB 변경 0건** — 신고 5행 mock 보존 + `[Phase C mock]` → `[v2.0 대기]` 라벨 |
| **J-3** | 사용자 정지 액션 활성 | (a) D-3 직접 | `users.status='suspended'` UPDATE (D-pre.5 신설 컬럼 활용) |
| **J-4** | 보험사 게시판 v2.0 대기 표시 | (a) Phase C mock 보존 (회색 점선) | 라인차트 3계열 — 보험사 v2.0 회색 점선 보존 |
| **J-5** | 라인차트 데이터 소스 | (a) 클라이언트 GROUP BY 우선 | `posts?select=created_at,board_type&created_at=gte.{90일전}` + 클라이언트 GROUP BY |
| **J-6** | KPI 댓글 카운트 정의 | (a) comments 전체 count | `comments?select=id` Prefer count=exact 단순 |
| **J-7** | 신고 자동 알림 | (a) D-3 범위 외 | Phase E 또는 별 트랙 |

### 1.3 D-1·D-2 결정 승계 (전 단계 공통 — G-*/H-*)

| # | 결정 | 본 단계 적용 |
|:--:|---|---|
| **G-1** | ROLE_LABEL admin = "어드민" | 신고 행 작성자/모더레이션 대상 표시 적용 |
| **H-1** | fetch 호출 = `window.db.fetch()` (401 자동 갱신) | 모든 함수 적용 |
| **H-2** | 페이징 = 20행 / 300ms 디바운스 / AND / count=exact | 신고 행 페이징 시 적용 (D-3에서는 5행 표시만) |
| **H-3** | 401 자동 / 403 admExit / 500 토스트 / 1회 재시도 / Sentry hook | 모든 함수 적용 |
| **추-1** | js/admin_v2.js 확장 (D-2 패턴) | board 섹션 함수 6종 추가 (~250줄) |
| **추-2** | mock 제거 시 KPI + 차트 + 테이블 모두 실 연결 | KPI 3 + 라인차트 + 신고 5행 (라벨만 동적) |
| **추-3** | 라이브 회귀 의뢰서 발행 (Chrome 위임) | ~25항목 |
| **추-4** | RLS 회귀 검증 (D-pre.7/8 청산 결과) | posts 7건 / comments 4건 정합 |

---

## 2. 변경 범위 (3파일, J-2 (b) 채택으로 DB 0건)

| 파일 | 변경 유형 | 라인 |
|---|---|---|
| `js/admin_v2.js` | UPDATE — board 섹션 함수 6종 추가 | 끝부분 +250~300줄 |
| `pages/admin_v2.html` | UPDATE — board mock 제거 + 슬롯 ID 부여 + 신고 라벨 갱신 | 라인 1725~1872 (~150줄 영향) |
| Supabase DB | **변경 0건** — RLS 회귀 검증만 (D-pre.8 청산 결과 라이브 회귀) | 0 |
| 라이브 회귀 의뢰서 | 신설 — `docs/specs/admin_v2_d3_live_regression_<date>.md` | ~25항목 |

**제외 (D-3 범위 외):**
- post_reports 테이블 신설 — J-2 (b) v2.0 대기
- 신고 자동 알림 — J-7 (a) 범위 외
- 보험사 게시판 v2.0 차트 라인 — J-4 (a) 보존 (회색 점선)
- 별 트랙 B-1 차트 grid line 토큰 마이그레이션 — D-5와 묶음 (통합본 § 2.7 권장)

---

## 3. Step 분할 (5단계 — D-2 패턴, DB 변경 0건)

### Step 1 — 사전 검증 (DB·코드 변경 0건)

#### 1-1. SELECT 검증 (Supabase Dashboard SQL Editor — Chrome 위임)

```sql
-- ① 신버전 DB 확인 (CLAUDE.md 강제)
SELECT current_database();

-- ② posts 카운트 + board_type 분포 (KPI + 라인차트 데이터 시연 가치 확인)
SELECT COUNT(*) AS posts_total FROM public.posts;
SELECT board_type, COUNT(*) AS cnt FROM public.posts GROUP BY board_type ORDER BY cnt DESC;

-- ③ comments 카운트 (J-6 KPI 정의 raw)
SELECT COUNT(*) AS comments_total FROM public.comments;

-- ④ 90일 활동 분포 (J-5 라인차트 데이터 소스 시연 가치 확인)
SELECT
  DATE(created_at AT TIME ZONE 'Asia/Seoul') AS day,
  board_type,
  COUNT(*) AS cnt
FROM public.posts
WHERE created_at >= (now() - INTERVAL '90 days')
GROUP BY day, board_type
ORDER BY day DESC, board_type
LIMIT 30;

-- ⑤ users.status 컬럼 raw 분포 (J-3 사용자 정지 액션 사전 점검)
SELECT status, COUNT(*) AS cnt FROM public.users GROUP BY status ORDER BY cnt DESC;

-- ⑥ posts.is_hidden raw 분포 (J-1 모더레이션 숨김 액션 사전 점검)
SELECT is_hidden, COUNT(*) AS cnt FROM public.posts GROUP BY is_hidden ORDER BY cnt DESC;

-- ⑦ posts RLS 정책 raw (D-pre.8 청산 회귀 점검 — is_admin() 통일 + 인라인 admin EXISTS 0건)
SELECT policyname, cmd, roles, qual AS using_clause, with_check AS with_check_clause
FROM pg_policies WHERE schemaname='public' AND tablename='posts'
ORDER BY cmd, policyname;

-- ⑧ comments RLS 정책 raw (D-pre.8 anon 청산 회귀 점검)
SELECT policyname, cmd, roles, qual AS using_clause, with_check AS with_check_clause
FROM pg_policies WHERE schemaname='public' AND tablename='comments'
ORDER BY cmd, policyname;

-- ⑨ post_reports 테이블 미존재 재확인 (J-2 (b) 결정 정합)
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'post_reports'
) AS post_reports_exists;
```

#### 1-2. 검증 통과 기준

| # | 기준 | 영향 |
|:--:|---|---|
| ① | `postgres` 1행 | 신버전 확인 |
| ② | posts_total ≥ 1 / board_type 분포 ≥ 1종 | KPI·차트 시연 가치 (0행이면 별 트랙 seed data 분기) |
| ③ | comments_total ≥ 0 (정수) | KPI 정합 |
| ④ | 90일 활동 raw — 행 수 0 가능 (있으면 라인차트 정합) | J-5 (a) 정합 검증 |
| ⑤ | status 컬럼 분포 — 'active' 1 이상 (D-pre.5 정합) | J-3 정합 |
| ⑥ | is_hidden 분포 — true/false 모두 가능 | J-1 정합 |
| ⑦ | posts RLS 7건 — 인라인 admin EXISTS 0건 / 자기 참조 0건 / `is_admin()` 패턴 통일 | D-pre.8 회귀 |
| ⑧ | comments RLS 4건 — anon 0건 | D-pre.8 회귀 |
| ⑨ | post_reports_exists = false | J-2 (b) 정합 |

→ ① ⑦ ⑧ ⑨ FAIL 시 D-3 진입 차단. ② ~ ⑥ FAIL 시 결정 분기 (예: ② 0행 = 별 트랙 seed data, ⑤ 분포 비정상 = D-pre.5 회귀).

### Step 2 — js/admin_v2.js 확장 (D-2 패턴, ~250줄)

#### 2-1. 추가 함수 6종

| 함수 | 시그니처 | 데이터 소스 |
|---|---|---|
| `fetchBoardKPI()` | `→ Promise<{posts, comments, reportsPending}>` | posts count + comments count + 신고 5건 mock 표시 ('5' 고정) |
| `fetchBoardActivity90d()` | `→ Promise<{day, board_type, cnt}[]>` | posts?select=created_at,board_type&created_at=gte.{90일전} + 클라이언트 GROUP BY |
| `fetchBoardReportsMock()` | `→ Promise<Array<5행 mock raw>>` | mock 그대로 반환 (J-2 (b)) |
| `handleHidePost(postId)` | `→ Promise<boolean>` | `posts?id=eq.{X}` PATCH `{is_hidden: true}` (admExit 시 토스트) |
| `handleDeletePost(postId)` | `→ Promise<boolean>` | `posts?id=eq.{X}` DELETE (admExit 시 토스트) |
| `handleSuspendUser(userId)` | `→ Promise<boolean>` | `users?id=eq.{X}` PATCH `{status: 'suspended'}` (admExit 시 토스트) |

#### 2-2. render 함수 4종

| 함수 | 슬롯 ID | 정합 |
|---|---|---|
| `renderBoardKPI(kpi)` | `adm-board-kpi-posts` / `adm-board-kpi-comments` / `adm-board-kpi-reports` | 한국어 천 단위 toLocaleString |
| `renderBoardActivityChart(rows)` | `adm-board-activity-chart` | SVG `<polyline>` 3계열 — 공지 #D4845A / 함께해요 #3B82F6 / 보험사 v2.0 회색 점선 stroke-dasharray="4,4" |
| `renderBoardReportsTable(rows)` | `adm-board-reports-tbody` | 5행 mock 그대로 + 액션 버튼 3종 (숨김 / 삭제 / 정지) |
| `attachReportActions()` | (이벤트 위임) | `data-action="hide|delete|suspend"` + `data-post-id` / `data-user-id` |

#### 2-3. 진입점

```js
window.admLoadBoard = async function () {
  var [kpi, activity, reports] = await Promise.all([
    fetchBoardKPI(), fetchBoardActivity90d(), fetchBoardReportsMock()
  ]);
  // race 안전장치 (D-1·D-2 표준)
  if (!document.querySelector('.adm-view[data-view="board"].active')) return;
  if (kpi)      renderBoardKPI(kpi);
  if (activity) renderBoardActivityChart(activity);
  if (reports)  renderBoardReportsTable(reports);
  attachReportActions();
};
```

### Step 3 — admin_v2.html mock 제거 + 슬롯 ID 부여

#### 3-1. 변경 라인 1725~1872

| 변경 | 라인 | 내용 |
|---|---|---|
| § 헤더 라벨 | 1730 | `[Phase C mock]` → `[v1.1 라이브 + v2.0 대기]` |
| KPI 3카드 | 1739~1764 | mock 숫자 → `<span id="adm-board-kpi-*">`로 슬롯 |
| 라인차트 SVG | 1767~1803 | 정적 polyline 3개 → `<g id="adm-board-activity-chart">` 빈 호스트 (J-4 회색 점선 보존: 보험사 polyline은 정적 `<line stroke-dasharray="4,4">` 잔존) |
| 신고 테이블 | 1806~1870 | mock 5행 정적 `<tr>` → `<tbody id="adm-board-reports-tbody">` 빈 호스트 + 액션 버튼 3종 (👁️ / 🗑️ / ⛔) |

#### 3-2. mock 라벨 갱신 ([J-2 (b)] 정합)

신고 5행은 mock 보존 + `[Phase C mock]` → `[v2.0 대기]` 라벨 추가 (panel-header 우측 라벨로):

```html
<span class="adm-panel-meta">[v2.0 대기 — post_reports 테이블 신설 후 본 작업]</span>
```

### Step 4 — 라이브 회귀 검증 의뢰서 발행

#### 4-1. 의뢰서 신설 — `docs/specs/admin_v2_d3_live_regression_2026-05-04.md` (~25항목)

| 섹션 | 수 | 핵심 |
|---|:--:|---|
| § 1 정의 raw (D1~D4) | 4 | typeof admLoadBoard / mock 잔존 0 / 신고 mock 작성자명 (J-2 (b) 정합 — 5행 보존) / RLS 회귀 |
| § 2 실 동작 (L1~L9) | 9 | 진입 / KPI 3 / 라인차트 SVG 3계열 / 신고 5행 / 모더레이션 액션 3종 작동 / 사용자 정지 / 차트 시간축 / [v2.0 대기] 라벨 / J-4 회색 점선 |
| § 4 RBAC (R1~R3) | 3 | 비-admin 차단 / admin SELECT / 모더레이션 액션 권한 (admin 전용) |
| § 5 콘솔·네트워크 (C1~C5) | 5 | Error 0 / 4xx 0 / 병렬 / D-1·D-2 회귀 / race |
| § 6 성능 (P1~P4) | 4 | P1 KPI 라운드트립 / P2 활동차트 / P3 모더레이션 액션 PATCH / P4 진입 총 시간 |
| **합계** | **25** | |

#### 4-2. P3·P4 측정 (J-5 (a) 정합 검증)

- P3 모더레이션 액션 PATCH 라운드트립 — < 200ms 기대
- P4 board 섹션 진입 → 표시 총 시간 — < 1초 기대
- **P3 또는 P4 FAIL 시:** J-5 (b) RPC `get_board_activity_90d` 신설 별 트랙 격상 (D-2 별 트랙 #3 패턴)

### Step 5 — 잔존 부채 등록 + _INDEX.md 갱신

#### 5-1. D-3 잔존 부채 후보

| # | 항목 | 권장 처리 |
|:--:|---|---|
| 1 | post_reports 테이블 신설 (J-2 (b) v2.0 대기) | v2.0 (보험사 입점 시점) |
| 2 | 신고 자동 알림 (J-7 (a) 범위 외) | Phase E 또는 별 트랙 |
| 3 | 보험사 게시판 v2.0 차트 라인 활성 (J-4 (a) 회색 점선 보존 후) | v2.0 |
| 4 | J-5 (b) `get_board_activity_90d` RPC 신설 (P3·P4 FAIL 시 격상) | 별 트랙 (P3·P4 결과에 따라) |
| 5 | 모더레이션 액션 토스트 메시지 표준화 (D-1 `.adm-toast` 재활용) | D-1 누적 |

#### 5-2. _INDEX.md 갱신

- 헤더 마지막 갱신 시점
- Phase D 표 D-3 행 → "✅ 완전 종료 (라이브 회귀 NN/25 PASS)"
- 다음 세션 인계 노트에 D-4 진입 가능 표기

#### 5-3. 라이브 회귀 PASS 후 commit + push

- D-3 본 작업 commit (Step 2 + 3) + 의뢰서 commit (Step 4) + _INDEX.md commit (Step 5)
- 단일 commit 묶음 가능 (G-3 단일 커밋 정합)

---

## 4. 절대 원칙 (통합본 § 9.1 인용)

15건 모두 D-3 진입 시 적용:
1. CLAUDE.md 신버전 확인 절대 원칙 (Step 1 ① 강제)
2. RLS USING/WITH CHECK 동일 테이블 SELECT 서브쿼리 절대 금지 (D-3 변경 0건이라 직접 적용 0)
3. admin/role 검증 = SECURITY DEFINER 함수 `is_admin()` (회귀 검증)
4. DB 메타 통과 ≠ 라이브 안전 → 라이브 회귀 의뢰서 필수 (Step 4)
5. 정의 raw + 실 동작 이중 검증 (의뢰서 § 1 + § 2)
6. 같은 테이블 다른 cmd 정책 sweep 사전 검증 (Step 1 ⑦ ⑧)
7. "재귀 안전 ✅" 단정 결론 금지 (Step 1 결과 raw 회신만)
8. Code SQL 직접 실행 불가 → Chrome 위임 (Step 1 SQL 9건)
9. DB UPDATE 전 백업 (D-3는 DB 변경 0건이라 적용 0)
10. 작업지시서 0번 정합성 검증 절대 프로토콜 (본 § 0)
11. race 안전장치 — fetch 응답 도착 시 active view 재확인 (Step 2-3 admLoadBoard)
12. mock UI 보존 vs 동적화 분리 — J-2 (b) 라벨만 동적
13. 절대 경로 script src (`/js/...`) — 변경 0
14. STAGE_LABELS 등 분류 매핑은 DB 진실 원천 (D-3는 stage 없음)
15. RPC 신설 시 SECURITY DEFINER + is_admin() 가드 (J-5 (b) 격상 시만 적용)

---

## 5. 보고 양식 (Step 1 → 5 진행 중)

### 5.1 Step 1 사전 검증 결과 보고 (Chrome → Code)

각 SQL ① ~ ⑨ 결과 raw + 통과/실패 표 (D-2 5/4 사전 검증 8/8 패턴 그대로)

### 5.2 Step 2·3 코드 변경 보고 (Code → 팀장님)

- diff stat
- 신규 함수 6종 + render 4종 + 진입점 1
- admin_v2.html mock 제거 + 슬롯 ID 부여 + 라벨 갱신

### 5.3 Step 4 라이브 회귀 의뢰서 발행 + Chrome 위임

### 5.4 Step 4 라이브 회귀 결과 (Chrome → Code)

NN/25 PASS + FAIL raw

### 5.5 Step 5 _INDEX.md 갱신 + 다음 세션 인계 노트

---

## 6. 산출물 위치

| 산출물 | 경로 | 시점 |
|---|---|---|
| 본 작업지시서 | `docs/specs/admin_v2_d3_workorder.md` | 2026-05-04 |
| 사전 검증 SQL 9건 결과 raw | (이 화면 / Chrome 회신) | Step 1 |
| js/admin_v2.js 확장본 | `js/admin_v2.js` | Step 2 |
| admin_v2.html mock 제거본 | `pages/admin_v2.html` | Step 3 |
| 라이브 회귀 의뢰서 | `docs/specs/admin_v2_d3_live_regression_2026-05-04.md` | Step 4 |
| _INDEX.md 갱신 | `docs/sessions/_INDEX.md` | Step 5 |

---

## 7. 잔존 부채 (D-3 후 별 트랙 처리)

본 작업지시서 § 3.5.1 표 그대로 + D-1·D-2 잔존 누적 (통합본 § 1.5 표 참조).

---

## 8. 참고

- 통합 작업지시서: `docs/specs/admin_v2_d3_to_dfinal_workorder_v1.md` § 2 (D-3 사전 분석)
- D-1 작업지시서·회귀 의뢰서: `admin_v2_d1_workorder.md` + `admin_v2_d1_live_regression_2026-05-03.md`
- D-2 작업지시서·회귀 의뢰서: `admin_v2_d2_workorder.md` + `admin_v2_d2_live_regression_2026-05-04.md`
- D-pre 시리즈 capture: `docs/architecture/db_pre_dpre7_capture.md` + `db_pre_dpre8_capture.md`
- posts·comments 컬럼 raw: `claude_code/_docs/supabase_dumps/q2_columns.csv`
- posts·comments RLS raw: `db_pre_dpre8_capture.md`

---

*본 작업지시서는 D-pre.5/6/7/8 + D-1 + D-2 + 별 트랙 #3 학습 전건 반영. 적용 시 Step 1 사전 검증 결과에 따라 Step 2 진입 결정. 팀장님 승인 없이 Code 단독 진행 금지 (Step 1 결과 보고 → Step 2 진입 승인 대기).*
