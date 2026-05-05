# admin_v2 Phase D-9 작업지시서 — ⚙️ 화면설정 섹션 신설 (옛 admin v1 포팅)

> **작성일:** 2026-05-05
> **작성자:** Claude Code
> **선행 산출물:**
> - 통합 작업지시서 v1.1: `docs/specs/admin_v2_d3_to_dfinal_workorder_v1.md` § 11.1 (D-9 진입 권장)
> - 옛 admin v1 raw: `claude_code/_archive/admin_v1_20260430.html` 라인 1290~1942 (4섹션 + 이벤트/저장 함수, ~650줄)
> - D-pre 시리즈: `admin_v2_phase_d_pre.md` + D-pre.5/6/7/8 capture 4건
> - D-1~D-6 작업지시서·의뢰서 패턴 정합
> **결재 결과:** 2026-05-05 Q-1 ~ Q-8 일괄 승인 (옵션 (a) Code 권장값 8건 일괄 채택)
> **상태:** 🟢 Step 1 사전 검증 진입 즉시 가능 (Chrome 위임 — Supabase Dashboard SQL Editor)

---

## 0. 큰 그림 정합성 검증 (D-6 종료 시점, 2026-05-05)

1. `docs/sessions/_INDEX.md` 메인 트랙 = admin_v2 Phase D 진행 중 ✅
2. D-1 17/17 / D-2 24/25 / D-3 25/25 / D-4 20/20 / D-5 29/30 / D-6 20/20 PASS 완전 종료 ✅
3. 통합 작업지시서 v1.1 § 11.1 권장 진입 순서: D-3 → D-4 → D-6 → D-5 → **D-9** → D-7(나) → D-8 → D-final ✅
4. D-9 본 작업지시서 = **옛 admin v1 화면설정 탭 raw 분석 + 4섹션 신설** + Step 분할 ✅
5. 차단 조건 없음 → §1.2 결재 8건 후 Step 1 사전 검증 진입

**현재 잔존 별 트랙 (병렬 가능, D-9 차단 0):**
- v1.1 안전장치 #A PITR 5/7 슬롯 (결재 #1 대기)
- v1.1 안전장치 #B Sentry 5/12 슬롯 (결재 #2 대기)
- v1.1 안전장치 #C Playwright 5/13~14 슬롯 (결재 #3 대기)
- 알림 시스템 v1.1~v3.0 통찰 문서 (5/11~12 분할 spec 작성)
- last_seen_at 갱신 메커니즘 (5/15 4팀 오픈 직전)
- P3 PostgREST 분석 (Phase E 격상)
- board / notice seed data (외부 시연 직전)

**D-9 특수성 — 다른 D 단계와 다른 점:**
- D-1~D-8은 **mock → 실 데이터 전환** (라인 -50 ~ +50 변동)
- **D-9는 신규 4섹션 추가** (~315줄 +) — 옛 admin v1 화면설정 탭 미포팅 상태에서 시작
- DB 변경 0건 (app_settings 그대로 사용)
- **Storage 분기 1건** (onesecond_banner 버킷 신설 — Q-4 결재 분기)

---

## 1. 작업 배경

### 1.1 목표

옛 admin v1 화면설정 탭 (`claude_code/_archive/admin_v1_20260430.html` 라인 1290~1942 ~315줄 raw)을 admin_v2.html `settings` 섹션으로 신규 포팅. 4섹션 풀 채움 + 5종 톤 정합 + Storage 분기 처리 + Q-1~Q-8 결재 후 본 진입.

### 1.2 결재 결과 (Q-1 ~ Q-8, 2026-05-05 일괄 승인)

> 옵션 (a) Code 권장값 8건 일괄 채택. 근거: D-1~D-6 패턴 정합 + 옛 v1 운영 정합 + 5종 톤 정합 + CLAUDE.md 정합.

| # | 항목 | 옵션 | 채택 | 근거 |
|:--:|---|---|---|---|
| **Q-1** | B영역 메뉴 매핑 개수 | (a) 옛 v1 7개 그대로(home/scripts/board/myspace/news/quick/together) / (b) 보험뉴스 제외 6개로 축소 / (c) Quick·News 모두 제외 5개 | **(a) 7개 그대로** | 미해결 #17 정합("보험뉴스 메뉴 숨김은 이미 옛 admin.html 화면설정에서 숨김 처리됨") — 토글 옵션은 7개 유지하되 기본값 false로 설정해 정합 보장. 사용자가 향후 noticnews 트랙 재가동 시 admin이 즉시 ON 가능 |
| **Q-2** | PRO 게이트 종류 | (a) 옛 v1 2종 그대로(quick_a2 / search_a2) / (b) news_pro / together_pro 등 추가 / (c) 게이트 섹션 자체 보류 (Phase E) | **(a) 2종 그대로** | 옛 v1 운영 정합 + app.html 라인 1001~1019 적용 로직 그대로 유효. 추가 게이트는 v1.1 출시 후 별 트랙 |
| **Q-3** | 게시판 1차 탭 토글 | (a) 옛 v1 hub/company 2개 토글 + team/branch lock 그대로 / (b) v2.0 보험사게시판 mock 보존 (D-3 J-2 (b) 패턴, company 비활성+v2.0 라벨 고정) / (c) 모두 토글 (4탭) | **(a) 그대로** | 옛 v1 운영 정합 + admin이 v2.0 출시 시 즉시 ON 가능 (mock 보존보다 운영성 우선). 단, **board.html이 아직 board_tab 값 read 미구현** → Q-7로 분기 |
| **Q-4** ⭐ | Supabase Storage `onesecond_banner` 버킷 | (a) 신버전 DB에 신설 (Public 읽기 + admin only 쓰기 RLS 정책) / (b) 버킷 신설은 별 트랙으로 분리, D-9는 섹션 4 mock 보존 / (c) 옛 v1 구버전 버킷 가정으로 그대로 (위험) | **(a) 신설** | Step 1 사전 검증에서 신버전 DB 버킷 raw 확인 → 없으면 Step 2-A에서 신설 (1 트랜잭션, RLS 2건). 옛 v1 admStorageUpload 함수는 버킷명 그대로 정합. 5/15 4팀 오픈 시점까지 admin이 배너 운영 가능 |
| **Q-5** | 5종 톤 정합 | (a) 옛 v1 light 하드코딩(`#fff`/`#6B3A2A` 등) → 5종 톤 토큰화 모두 / (b) 핵심만 토큰화 (`adm-set-row` / `adm-frame` / `adm-pv-tag`) / (c) 옛 v1 light 그대로 (5종 토글 시 부조화) | **(a) 모두 토큰화** | 외부 시연 5종 톤 정합 보장. 도입 토큰: `--admin-set-bg` / `--admin-set-border` / `--admin-frame-bg` / `--admin-pv-tag-bg` / `--admin-bn-banner-bg` 5종 5톤 (총 25셀). D-pre 시리즈 패턴 정합 |
| **Q-6** | 저장 후 사용자 페이지 반영 | (a) 옛 v1 alert + 사용자가 페이지 새로고침 (수동) / (b) 즉시 반영 (postMessage + applyMenuSettings 재호출) / (c) admin 본인 미리보기만 즉시 + 사용자 페이지는 새로고침 시 | **(a) 옛 v1 그대로 (alert 새로고침 권장)** | 옛 v1 운영 정합 + 즉시 반영은 cross-tab 동기화 복잡도 높음 (별 트랙). 토스트 표기는 admin_v2 패턴(`.adm-toast`)으로 통일 |
| **Q-7** | board.html board_tab read 미구현 | (a) D-9 범위 외 (admin_v2 범위 한정), board.html 패치는 별 트랙 / (b) D-9 Step 6에서 board.html 패치 함께 (라인 +20~30) / (c) board_tab 토글 자체 보류 | **(a) 별 트랙** | D-9는 admin_v2.html settings 섹션 신설에 집중. board.html read 패치는 D-3 후속 별 트랙으로 분리 (옛 v1 alert 본문 "board.html에서 이 값을 읽는 작업이 추가로 필요" 명시 정합). 별 트랙 작업지시서 신규 발행 |
| **Q-8** | admin 본인 화면설정 적용 | (a) admin은 무시 (CLAUDE.md "admin 무접두어 무시 대상" 정합) / (b) admin도 적용 (테스트 편의) / (c) admin은 미리보기만 적용, 실 변경은 다른 9역할만 | **(a) 무시 (옛 v1 정합)** | CLAUDE.md "applyMenuSettings 무시 대상 = admin만" 정합. admin이 토글 변경 시 다른 9역할만 영향 받음. admin 본인 화면은 변경 0 (운영 안전성) |

### 1.3 D-1·D-2·D-3·D-4·D-5·D-6 결정 승계 (전 단계 공통)

| # | 결정 | D-9 적용 |
|:--:|---|---|
| **G-1** | ROLE_LABEL admin = "어드민" | D-9 무직접 영향 (settings는 role 라벨 미사용) |
| **H-1** | fetch 호출 = `window.db.fetch()` (401 자동 갱신) | 모든 admLoad/Save 함수 적용 (옛 v1 admFetch → admin_v2 패턴) |
| **H-2** | 페이징 = 20행 / 300ms 디바운스 / count=exact | D-9 무관 (settings 페이징 미적용) |
| **H-3** | 401 자동 / 403 admExit / 500 토스트 / 1회 재시도 | 모든 함수 적용 |
| **추-1** | js/admin_v2.js 확장 (D-1~D-6 패턴) | settings 섹션 함수 ~12종 추가 (~480~520줄) |
| **추-2** | mock 제거 시 실 데이터 합치기 | D-9는 mock 0건 → 실 app_settings + Storage 직접 |
| **추-3** | 라이브 회귀 의뢰서 발행 (Chrome 위임) | ~25항목 (4섹션 × 6~8 검증) |
| **추-4** | RLS 회귀 검증 | app_settings RLS admin write `is_admin()` 청산 회귀 (D-pre.8 sweep 정합 — D-4 K-1 보강 누적) + Storage RLS 신설 시 회귀 |

---

## 2. 변경 범위 (2~3파일 + Storage 분기 1건)

| 파일 | 변경 유형 | 라인 |
|---|---|---|
| `js/admin_v2.js` | UPDATE — settings 섹션 12함수 신설 (admLoadSettings + admBindSettingsEvents + admSyncMenuPreview + admSyncGatePreview + admSyncBoardPreview + admSaveMenuSettings + admSaveGateSettings + admSaveBoardTabs + admBnSelect + admBannerFileSelected + admBannerClear + admSaveBannerSettings + admStorageUpload). race 안전장치 + 토스트 통일 | 끝부분 +480~520줄 |
| `pages/admin_v2.html` | UPDATE — settings 섹션 신설 (Phase C 미작성 — D-9에서 처음 추가). HTML 슬롯 + CSS adm-set-* / adm-pv / adm-frame / adm-mini-* / adm-bn-* / adm-cb-wrap 클래스 + 5종 톤 토큰화 (Q-5 (a)) | 라인 ~2200 부근 +280~320줄 |
| `css/tokens.css` | UPDATE — Q-5 (a) 신규 토큰 5종 5톤 정의 (`--admin-set-bg`/`set-border`/`frame-bg`/`pv-tag-bg`/`bn-banner-bg`) | +30~40줄 |
| Supabase Storage | **Q-4 (a) 분기** — `onesecond_banner` 버킷 신설 분기 (신버전 DB raw 확인 → 없으면 신설). RLS 2건 (Public read + admin write) | 1 트랜잭션 (Step 2-A 또는 Step 1 분기) |
| Supabase DB | **변경 0건** — app_settings 그대로 사용. RLS 회귀 검증만 | 0 |
| 라이브 회귀 의뢰서 | 신설 — `docs/specs/admin_v2_d9_live_regression_2026-05-05.md` (또는 진행 시점 날짜) | ~25항목 |

**제외 (D-9 범위 외):**
- board.html `board_tab_*` read 패치 (Q-7 (a) — 별 트랙 분리)
- 즉시 반영 (postMessage + cross-tab) (Q-6 (a) — 별 트랙)
- 추가 PRO 게이트 (news_pro / together_pro 등) (Q-2 (a) — Phase E 별 트랙)
- v2.0 보험사게시판 mock 보존 (Q-3 (a) — admin이 v2.0 출시 시 즉시 ON 가능)
- admin 본인 적용 (Q-8 (a) — CLAUDE.md 정합)
- Storage 사용량 모니터링 (Phase E)
- 배너 이미지 자동 리사이즈 (Phase E — 옛 v1 권장 1200×120~200 사용자 책임)

---

## 3. Step 분할 (5단계 — D-1~D-6 패턴 정합, Storage 분기 1건)

> Q-1 ~ Q-8 일괄 승인 (2026-05-05) 후 본 §3 진입. Code 권장값 8건 (a) 채택 가정 기반 작성.

### Step 1 — 사전 검증 + Storage 분기 (DB 변경 0건, Storage 분기 가능)

#### 1-1. SELECT 검증 (Supabase Dashboard SQL Editor — Chrome 위임)

```sql
-- ① 신버전 DB 확인 (CLAUDE.md 강제)
SELECT current_database();

-- ② app_settings 컬럼 raw + 그룹·키 분포 (옛 v1 group_name 패턴 정합 검증)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='app_settings'
ORDER BY ordinal_position;

SELECT group_name, COUNT(*) AS cnt
FROM public.app_settings
GROUP BY group_name
ORDER BY cnt DESC;

SELECT key, value FROM public.app_settings
WHERE group_name IN ('menu_b','gate','board_tab','banner_img')
ORDER BY group_name, key;

-- ③ app_settings RLS 정책 raw (D-pre.8 sweep + D-4 K-1 보강 회귀 검증)
SELECT policyname, cmd, roles, qual AS using_clause, with_check AS with_check_clause
FROM pg_policies
WHERE schemaname='public' AND tablename='app_settings'
ORDER BY cmd, policyname;

-- ④ users.role 분포 (D-pre.6 9역할 정합 회귀)
SELECT role, COUNT(*) AS cnt FROM public.users GROUP BY role ORDER BY cnt DESC;

-- ⑤ Storage 버킷 raw (Q-4 (a) 분기 — onesecond_banner 존재 여부)
SELECT id, name, public, created_at FROM storage.buckets WHERE name='onesecond_banner';

-- ⑥ Storage RLS 정책 raw (Q-4 (a) 분기 — 버킷 존재 시)
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='storage' AND tablename='objects';
```

#### 1-2. 옛 admin v1 raw 정합 회귀 (코드 변경 0건)

옛 v1 라인 1290~1942 4섹션 + 이벤트·저장 함수 매핑 raw — 본 작업지시서 §1.4 부록 참조.

#### 1-3. Storage 분기 결정 (Q-4 (a) 채택 시)

- **Case 1 — 신버전 DB에 `onesecond_banner` 버킷 존재** → Step 2 진입 (DB 변경 0건)
- **Case 2 — 버킷 미존재** → Step 1.5 신설 트랜잭션 (Public read + admin write RLS 2건) 후 Step 2 진입

### Step 1.5 (분기) — Storage 버킷 신설 (Case 2 시 1 트랜잭션)

```sql
-- 1 트랜잭션 (BEGIN ... COMMIT)
BEGIN;

-- 1) 버킷 신설
INSERT INTO storage.buckets (id, name, public)
VALUES ('onesecond_banner', 'onesecond_banner', true);

-- 2) RLS 정책 — Public read (모든 사용자 읽기 허용)
CREATE POLICY "Public read onesecond_banner" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'onesecond_banner');

-- 3) RLS 정책 — admin only write (is_admin() 가드)
CREATE POLICY "admin write onesecond_banner" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'onesecond_banner' AND public.is_admin())
WITH CHECK (bucket_id = 'onesecond_banner' AND public.is_admin());

-- 사후 검증
SELECT id, name, public FROM storage.buckets WHERE name='onesecond_banner';
SELECT policyname, cmd FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE '%onesecond_banner%';

COMMIT;
```

### Step 2 — js/admin_v2.js settings 섹션 12함수 신설 (~480~520줄)

옛 v1 라인 1290~1942 raw → admin_v2 패턴 정합 변환:
- `admFetch` → `window.db.fetch` (H-1 정합)
- `admContent` → admin_v2 슬롯 ID 직접 주입
- `admStorageUpload` → admin_v2 신설 (window.db Storage REST API 정합)
- `alert` → `.adm-toast` 통일 (D-1~D-6 패턴)
- 5종 톤 토큰 클래스 부착 (Q-5 (a))

### Step 3 — pages/admin_v2.html settings 섹션 HTML/CSS 신설 (~280~320줄)

- settings 섹션 라우팅 추가 (이미 D-1~D-6 라우팅 패턴 정합)
- HTML 슬롯 + CSS 클래스 정의
- 5종 톤 토큰화 (Q-5 (a))

### Step 4 — css/tokens.css 신규 토큰 5종 5톤 추가 (~30~40줄)

- `--admin-set-bg` / `--admin-set-border` / `--admin-frame-bg` / `--admin-pv-tag-bg` / `--admin-bn-banner-bg`
- 5종 톤 (light + warm + slate + black + navy) 정의

### Step 5 — 라이브 회귀 의뢰서 발행 (~25항목)

`docs/specs/admin_v2_d9_live_regression_<날짜>.md` 신설:
- 4섹션 × 5~7항목 검증 (P 시리즈)
- 5종 톤 정합 회귀 (Q 시리즈)
- Storage 업로드·읽기 정합 (R 시리즈)
- Q-1~Q-8 결재 정합 회귀 (S 시리즈)

---

## 4. 영구 학습 후보 (D-9 진행 중 누적)

> Step 5 완료 후 본 §4에 학습 raw 누적. 본 시점 미작성.

---

## 5. 다음 단계 — 1일 shift 일정 (2026-05-05 카톡 보류 결정 반영)

**카톡 마이그레이션 트랙 보류 결정으로 5/6 슬롯 가용 → 전체 일정 1일 shift, 5/14 = 1일 버퍼 확보:**

| 일자 | 작업 | 추정 |
|---|---|:--:|
| **5/6 (수)** | **D-9 Step 5 라이브 회귀** (의뢰서 발행 + Chrome 검수) + 별 트랙 #A PITR 결재 #1 + 진입 | 0.2 + 0.2세션 |
| 5/7 (목) | D-7 billing 진입 ((나) v2.0 mock 보존 권장) | 0.3세션 |
| 5/8 (금) | D-8 dashboard 종합 진입 (함수 재활용 + B-2 묶음) | 1.3세션 |
| 5/9~10 (주말) | 알림 시스템 v1.1 분할 spec 7건 작성 + 주말 패키지 (UI 스케일 / Sticky Nav / Safari) 병렬 | 1.0세션 |
| 5/11 (월) | 알림 v1.1 5개 항목 본 진입 + 별 트랙 #B Sentry + #25 Storage RLS sweep 병렬 | 1.5~2.0세션 |
| 5/12 (화) | D-final 보안 sweep + 별 트랙 #C Playwright | 2.0~2.5세션 |
| 5/13 (수) | 안전장치 3종 (PITR/Sentry/Playwright) 종합 회귀 검증 + index_hero / team4_vault Phase 1 | 0.8세션 |
| **5/14 (목)** | 🟢 **1일 버퍼** — 잔여 fix / 회귀 재실행 / 4팀 오픈 직전 마지막 점검 | 0~0.5세션 |
| **5/15 (금)** | 🎯 **4팀 오픈** | — |

**카톡 트랙 의논 결과:**
- 의논 결과 카톡 마이그레이션 본 진입 결정 시 → 5/14 버퍼 슬롯 또는 5/15 이후로 진입
- 4팀 오픈 자체 재검토 필요 가능성 (메모리 §본질 "카톡 자료 없이 4팀 오픈 시 사용자 회귀 위험"은 의논 시점 별도 평가)

---

## 부록 A — 옛 admin v1 화면설정 raw 매핑 (라인 1290~1942)

| 섹션 | 옛 v1 라인 | 함수 | app_settings group_name | 키 패턴 | 라이브 적용 위치 |
|---|---|---|---|---|---|
| 섹션 1: B영역 메뉴 | 1324~1384 | admLoadSettings 내 + admSaveMenuSettings (1830~1858) + admSyncMenuPreview (1622~1655) | `menu_b` | `menu_<page>` (7개) | app.html 라인 976~983 (applyMenuSettings) |
| 섹션 2: PRO 게이트 | 1386~1445 | admLoadSettings 내 + admSaveGateSettings (1771~1799) + admSyncGatePreview (1657~1675) | `gate` | `gate_quick_a2` / `gate_search_a2` | app.html 라인 1001~1019 |
| 섹션 3: 게시판 1차 탭 | 1447~1520 | admLoadSettings 내 + admSaveBoardTabs (1801~1828) + admSyncBoardPreview (1677~1703) | `board_tab` | `board_tab_hub` / `board_tab_company` | ⚠️ 미구현 (Q-7 별 트랙) |
| 섹션 4: 배너 이미지 | 1522~1597 | admLoadSettings 내 + admSaveBannerSettings (1860~1942) + admBnSelect (1706~1733) + admBannerFileSelected (1736~1757) + admBannerClear (1760~1769) | `banner_img` | `banner_img_<page>` (6개, Quick 제외) | app.html 라인 1146~1164 |

**Storage 의존:** 섹션 4 admStorageUpload — 버킷 `onesecond_banner` (신버전 DB Q-4 분기 결정)

**부트:** _boot 함수 (1944~1959) — `s.role !== 'admin'` 가드 + admLoadUsers 디폴트 진입 (admin_v2는 D-1 users → settings 라우팅 패턴 정합)

---

*본 작업지시서는 옛 admin v1 라인 1290~1942 raw 분석 기반. 결재 Q-1 ~ Q-8 후 §3~§5 본 발행 + 본 진입.*
