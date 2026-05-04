# admin_v2 Phase D-3 ~ D-final 통합 작업지시서 v1

> **작성일:** 2026-05-04
> **작성자:** Claude Code (Agent 사전 분석 raw 기반)
> **선행 산출물:**
> - `docs/specs/admin_v2_phase_d_pre.md` (438줄, D-pre 결정 27건)
> - `docs/specs/admin_v2_d1_workorder.md` (502줄, D-1 users 작업지시서)
> - `docs/specs/admin_v2_d2_workorder.md` (681줄, D-2 content 작업지시서)
> - `docs/architecture/db_pre_dpre7_capture.md` (RLS 자기 참조 회피 영구 학습 6건)
> - `docs/architecture/db_pre_dpre8_capture.md` (admin 인라인 EXISTS → is_admin() sweep 5항목 청산)
> **상태:** 🟢 D-2 25/25 PASS 회신 후 D-3 즉시 진입 가능

---

## 0. 본 통합본의 위치 + 큰 그림 정합성 검증

### 0.1 통합본 채택 배경 (옵션 B)

2026-05-04 D-2 종료 직후 결정:
- **단계별 작업지시서 발행 (현재 방식)** = ~14세션
- **통합 작업지시서 발행 (옵션 B 채택)** = ~12세션 (사전 분석 협의 시간 ~2세션 절감)
- ~~마지막 한 번만 회귀 (옵션 C)~~ ❌ 회귀 누적 폭발 위험으로 비채택

**옵션 B 정의:**
| 항목 | 통합? | 단계별? |
|---|:--:|:--:|
| 사전 분석 + 결정 항목 + 코드 패턴 | ✅ 본 통합본 1건 | — |
| 실 코드 작업 진행 | ❌ | ✅ D-3 → D-4 → ... 순차 |
| 라이브 회귀 검증 | ❌ | ✅ 단계마다 의뢰 필수 |
| D-final 종합 sanity check | ✅ 마지막 1회 | — |

### 0.2 큰 그림 정합 (D-2 종료 직후 시점)

1. `docs/sessions/_INDEX.md` 메인 트랙 = admin_v2 Phase D 진입 (2026-05-01 결정)
2. D-pre 시리즈(D-pre / D-pre.5 / D-pre.6 / D-pre.7 / D-pre.8) 전건 종료 (2026-05-03)
3. D-1 users 종료 (17/17 PASS, 2026-05-04 fix 후)
4. D-2 content 종료 대기 (25/25 PASS Chrome 회신 대기, 별 트랙 #3 RPC 청산 push 직후)
5. **본 통합본 = D-3~D-final 잔여 7단계 통합 사전 분석** → D-3 진입 즉시 가능

### 0.3 외부 일정 컨텍스트

- 5/6 카톡 → 원세컨드 마이그레이션 본질 (메인 트랙 외 큰 작업)
- 5/9~10 주말 패키지 (UI 스케일 / Sticky Nav / Safari)
- 보험뉴스 자동 증식 엔진 (큰 별 트랙, 5/6 후 본격)

→ 본 통합본 작성은 **외부 마감일 약속 아님**. CLAUDE.md "외부 마감일 압박 금지" 메모리 준수.

---

## 1. 공통 패턴 + 결정 누적 (전 단계 공통)

### 1.1 D-1·D-2 표준 구조 비교

| 섹션 | D-1 (502줄) | D-2 (681줄) | D-3~D-final 권장 |
|---|---|---|---|
| § 0 큰 그림 정합성 | 17줄 | 21줄 | 본 통합본 § 0 그대로 |
| § 1 작업 배경 (목표 + 결정 N건) | 22줄 (11건) | 32줄 (7신규 + 5승계) | 단계별 6~10건 |
| § 2 변경 범위 (파일 표) | 12줄 (4파일) | 13줄 (3파일) | 단계별 3~4파일 |
| § 3 Step 분할 | 7단계 | 5단계 | **5단계 표준** (D-3·D-6은 DB 신설 분기 시 7단계 / D-5는 RPC 4종으로 6단계) |
| § 4 절대 원칙 | 10항목 | 12항목 (race + mock UI 보존 추가) | 본 통합본 § 9 누적 15항목 |
| § 5 보고 양식 | 5섹션 | 4섹션 | 단계별 정합 |
| § 6 산출물 위치 | 5파일 | 6파일 (라이브 회귀 의뢰서 추가) | 단계별 정합 |
| § 7 잔존 부채 | 7항목 | 10항목 (격상·청산 표기 도입) | 본 통합본 § 10 누적 표 |

### 1.2 결정 항목 명명 규칙 (의미 분류 + D-3~D-final 단계별 alphabet 부여)

| 접두 | 의미 | D-1·D-2 사례 | D-3~D-final 단계별 alphabet |
|---|---|---|---|
| **G-*** | Global — 전역 정합 (라벨·호환성·Step 단위) | G-1 admin라벨 / G-2 fallback 옵션B / G-3 단일 커밋 / G-4 같은 세션 일괄 | (전역 — 신규 G-5+ 추가 가능) |
| **H-*** | Handler — fetch 호출 + 페이징·검색·필터 + 에러 처리 | H-1 window.db.fetch() / H-2 20행·300ms·AND·count=exact / H-3 401자동·403admExit·500토스트 | (전역 — 그대로 승계) |
| **I-*** | D-2 신규 결정 (단계별 alphabet 시작) | I-1 분리 fetch / I-2 직접 GROUP BY / ... I-7 전체 보기 보존 | — |
| **J-*** | D-3 신규 결정 | — | 5~7건 예상 |
| **K-*** | D-4 신규 결정 | — | 4~6건 |
| **L-*** | D-5 신규 결정 | — | 8~10건 (가장 무거움) |
| **M-*** | D-6 신규 결정 | — | 4~6건 |
| **N-*** | D-7 신규 결정 | — | 4~6건 (분기 N-1이 핵심) |
| **O-*** | D-8 신규 결정 | — | 5~7건 |
| **P-*** | D-final 신규 결정 | — | 3~5건 |
| **추-*** | 추가 결정 (각 단계 변경 범위 보강) | 추-1 신설/확장 / 추-2 슬롯 ID / 추-3 회귀 의뢰서 / 추-4 RLS 회귀 | 단계별 동일 패턴 |

### 1.3 라이브 회귀 의뢰서 7섹션 항목 분류 (D-1·D-2 평균 + D-3~D-final 추정)

| 섹션 | D-1 (17) | D-2 (25) | D-3~D-final 추정 |
|---|---|---|---|
| § 1 정의 raw | 6 (D1~D6) | 4 (D1~D4) | **4~5** |
| § 2 실 동작 | 7 (L1~L7) | 9 (L1~L9) | **8~12** |
| § 3 라벨 매핑 | (§2 통합) | 1 (K1) | **0~1 (도메인 매핑 단계만)** |
| § 4 RBAC | 2 (R1~R2) | 3 (R1~R3) | **2~3** |
| § 5 콘솔·네트워크 | 2 (C1~C2) | 5 (C1~C5) | **3~5** |
| § 6 성능 | 0 | 4 (P1·P2 baseline + P3·P4 RPC) | **0~6 (RPC 신설 단계)** |
| § 7 종합 판정 | 헤더 1 | 헤더 1 | **헤더 1** |

### 1.4 절대 원칙 + 누적 학습 15건 (D-pre.5/6/7/8 + D-1 + D-2 + 별 트랙 #3)

본 통합본 § 9 절대 원칙 절에 그대로 명문화. 모든 단계 진입 시 첫 검증.

### 1.5 잔존 부채 누적 표 (D-1·D-2 후 D-3 진입 시점)

**D-1 잔존 7건 → D-3 진입 시점:**
| # | 항목 | 영향 단계 |
|:--:|---|---|
| 1 | pricing.html ROLE_LABEL 자체 정의 (D-pre.6 잔존) | D-final 회귀 검증 |
| 2 | app.html B-4 3곳 (D-pre.6 잔존) | D-final 회귀 검증 |
| 3 | RPC `get_role_counts` 신설 (9 query 1 round trip) | 별 트랙 (D-1 후) |
| 4 | js/scripts-page.js ROLE_LABEL 사용처 회귀 점검 | D-final |
| 5 | ✅ `.adm-toast` D-2 사용 청산 (D-3~D-8 승계) | (청산) |
| 6 | RPC `get_dau` 등 D-5 분석 RPC 신설 | **D-5 본 작업** |
| 7 | D-7 billing 제외 (테이블 0건) | **D-7 결정 N-1 분기** |

**D-2 잔존 10건 → D-3 진입 시점:**
| # | 항목 | 영향 단계 |
|:--:|---|---|
| 1 | scripts.save_count / saves 테이블 신설 | 별 트랙 (D-2 I-4) |
| 2 | "전체 보기" 풀 페이지 (페이징·검색·필터) | Phase E |
| 3 | ✅ get_stage_distribution RPC 신설 (5/4 청산) | (청산) |
| 4 | owner_id text → users join RPC | Phase E |
| 5 | KPI 추세 라벨 동적화 | Phase E |
| 6 | content 메뉴 pane .pending Phase E 정합 | Phase E |
| 7 | ✅ STAGE_LABELS 매핑 청산 (5/4) | (청산) |
| 8 | scripts.use_count 59건 모두 0 → script_usage_logs 집계 RPC | **D-5 본 작업** |
| 9 | ✅ library scope=private 필터 청산 | (청산) |
| 10 | library seed data 다양화 | 별 트랙 |

**누적 부채 잔존 = 총 12건** (D-1 4 + D-2 7 + 별 트랙 #3 1) → D-3 ~ D-final 진행 중 단계별 청산.

---

## 2. D-3 board 사전 분석 — posts + post_reports + 모더레이션 액션

### 2.1 작업 배경

| 항목 | 내용 |
|---|---|
| 목표 | admin_v2.html `board` 섹션 Phase C mock(KPI 3카드 + 라인차트 + 신고 5행)을 실 Supabase 데이터로 전환 + 모더레이션 액션 3종 활성 |
| 메인 트랙 정합 | _INDEX.md Phase D 표 D-3 = "posts + post_reports + 모더레이션 액션" |
| 진입 조건 | D-2 25/25 PASS 회신 + D-pre.8 RLS sweep 청산 (이미 종료) |

### 2.2 변경 범위 (3~4파일, 결정 J-2 분기)

| 파일 | 변경 유형 | 라인 |
|---|---|---|
| `js/admin_v2.js` | UPDATE — board 섹션 함수 6종 추가 | 끝부분 +250~300줄 |
| `pages/admin_v2.html` | UPDATE — board 섹션 mock 제거 + 슬롯 ID 부여 | 라인 1725~1872 (~150줄 영향) |
| Supabase DB | **결정 J-2 분기**: (a) post_reports 신설 / (b) v2.0 대기 + mock 보존 | 0건 또는 신규 1테이블 |
| 라이브 회귀 의뢰서 | 신설 — `docs/specs/admin_v2_d3_live_regression_<date>.md` | ~25항목 |

### 2.3 데이터 소스 raw

**posts 컬럼 (q2_columns.csv 검증):**
- id / created_at / **board_type** / category / title / content / **author_id** / author_name / organization_id / is_hub_visible / view_count / like_count / comment_count / is_anonymous / display_name / **is_hidden** (모더레이션 핵심) / is_notice / attachments / insurer_name / product_category / patient_age / patient_gender / disease_name / diagnosis_timing / current_status

**comments 컬럼:** id / created_at / post_id / author_id / author_name / content (단순 — 신고/모더레이션 컬럼 없음)

**post_reports 테이블:** **미존재** (q1_tables.csv 0행) → **결정 J-2 분기 필수**

**users.status 컬럼 (D-pre.5 신설):** 'active' / 'suspended' / 'pending' (CHECK + NOT NULL DEFAULT 'active') — D-3에서 사용자 정지 액션 활성 결정 J-3

**RLS 정합 (D-pre.8 청산 결과 — 회귀 검증만):**
- posts: 7건 (`is_admin()` 표준 통일 / 인라인 admin EXISTS 0건 / 자기 참조 0건 / anon 0건)
- comments: 4건 (D-pre.8 anon 청산 완료)

### 2.4 모더레이션 액션 종류

| 액션 | DB 변경 | RLS 통과 |
|---|---|---|
| **숨김** | `posts.is_hidden = true` | `is_admin()` UPDATE 통과 (D-pre.7 § 0 별 트랙 부채 #1: admin 숨김 게시물 SELECT는 사업 판단 별 트랙) |
| **삭제** | `DELETE FROM posts WHERE id = X` | `author or admin delete (is_admin())` 통과 |
| **사용자 정지** | `UPDATE users SET status='suspended' WHERE id=X` | `admin_update_all_users (is_admin())` 통과 (D-pre.7 § 9 정합) |
| **신고 처리** | post_reports 미존재 → 결정 J-2 분기 | (a) 신설 후 RLS 4건 추가 / (b) v2.0 대기 |

### 2.5 Phase C mock 콘텐츠 (admin_v2.html 라인 1725~1872)

- **라인 1730:** `[Phase C mock]` 라벨
- **라인 1739~1764:** KPI 3카드 (전체 게시글 2,847 / 댓글 11,428 / 신고 대기 5)
- **라인 1767~1803:** 게시판별 활동 라인차트 SVG (3계열: 공지 #D4845A 실선 + 함께해요 #3B82F6 실선 + 보험사 v2.0 대기 회색 점선) — grid line `stroke="rgba(255,255,255,0.06)"` 하드코딩 (별 트랙 B-1)
- **라인 1806~1870:** 신고 대기 테이블 5행 (한국어 이름 5명 + 게시판/제목/작성자/신고사유/신고수/접수/액션)
- **라인 1733:** `[Phase C 헤더 액션]` "📤 내보내기" / "＋ 새 공지 작성" 버튼 (D-3 범위 외 — mock 보존)

### 2.6 결정 항목 신규 후보 (5~7건 — J-1 ~ J-7)

| # | 결정 후보 | 옵션 | 권장 |
|:--:|---|---|---|
| **J-1** | 모더레이션 액션 표준 | (a) 3종(숨김/삭제/정지) / (b) 숨김+삭제만 / (c) 숨김만 | **(a)** D-pre.5 status 신설 활용 정합 |
| **J-2** | post_reports 테이블 처리 | (a) D-3 진입 시 신설 / (b) v2.0 대기 + mock 라벨만 동적 | **(b) 권장** — D-pre 항목 4 § 5.5 패턴 정합 (D-7 N-1과 동일 원칙) |
| **J-3** | 사용자 정지 액션 활성 | (a) D-3 직접 / (b) D-final 보안 검증으로 이관 | **(a)** D-pre.5 status 컬럼 활용 |
| **J-4** | 보험사 게시판 v2.0 대기 표시 | (a) Phase C mock 보존(회색 점선) / (b) 차트 라인 제거 | **(a)** _INDEX.md 정합 |
| **J-5** | 라인차트 데이터 소스 | (a) `posts?select=created_at,board_type&created_at=gte.{90일전}` 클라이언트 GROUP BY / (b) RPC `get_board_activity_90d` 신설 | **(a) 우선 + (b) P3·P4 FAIL 시 별 트랙 격상** (D-2 별 트랙 #3 패턴) |
| **J-6** | KPI 댓글 카운트 정의 | (a) comments 전체 count / (b) 활성 게시글(is_hidden=false)의 댓글만 | **(a)** 단순 + 빠름 |
| **J-7** | 신고 자동 알림 | (a) D-3 범위 외 / (b) Sentry/Slack hook | **(a)** D-3 범위 외 |

### 2.7 Step 분할 (5단계 표준 — D-2 패턴, J-2 (b) 권장 시 DB 변경 0건)

- **Step 1** 사전 검증 (DB raw — posts/comments 카운트 + RLS 회귀 + post_reports 존재 재확인)
- **Step 2** js/admin_v2.js 확장 (~250줄 — fetchBoardKPI / fetchBoardActivity90d / fetchPostReportsMock / handleHidePost / handleDeletePost / handleSuspendUser)
- **Step 3** admin_v2.html mock 제거 (라인 1725~1872 → 슬롯 ID 부여 + js 연결, J-4 회색 점선 보존)
- **Step 4** 라이브 회귀 검증 의뢰서 발행 (~25항목)
- **Step 5** 잔존 부채 등록 + _INDEX.md 갱신

### 2.8 라이브 회귀 항목 추정 (~25항목, D-2 패턴)

| 섹션 | 수 | 핵심 |
|---|:--:|---|
| § 1 정의 raw | 4 | typeof admLoadBoard / mock 잔존 0 / 신고 mock 작성자명 0 / RLS 회귀 |
| § 2 실 동작 | 9 | 진입 / KPI 3카드 / 라인차트 SVG 3계열 / 신고 테이블 / 모더레이션 액션 3종 / 사용자 정지 / 차트 시간축 |
| § 4 RBAC | 3 | 비-admin 차단 / admin SELECT / 모더레이션 액션 권한 |
| § 5 콘솔·네트워크 | 5 | Error 0 / 4xx 0 / 병렬 / D-1·D-2 회귀 / race |
| § 6 성능 | 4 | P1·P2 baseline + P3·P4 (J-5 (b) 격상 시) |
| **합계** | **25** | |

---

## 3. D-4 notice 사전 분석 — app_settings + 노출 기간 + role 분기

### 3.1 작업 배경

| 항목 | 내용 |
|---|---|
| 목표 | admin_v2.html `notice` 섹션 Phase C mock(활성 카드 4 + 작성 이력 5)을 실 Supabase 데이터로 전환 + role 분기 활성 |
| 메인 트랙 정합 | _INDEX.md D-4 = "app_settings(또는 notices/banners) + 노출 기간 + role 분기" |

### 3.2 변경 범위 (3파일, 결정 K-1 분기)

| 파일 | 변경 유형 | 라인 |
|---|---|---|
| `js/admin_v2.js` | UPDATE — notice 섹션 함수 4~5종 추가 | +150~200줄 |
| `pages/admin_v2.html` | UPDATE — notice mock 제거 | 라인 2025~2156 (~130줄 영향) |
| Supabase DB | **결정 K-1 분기**: (a) app_settings 통합 / (b) notices/banners 신설 | 0건 또는 1테이블 |

### 3.3 데이터 소스 raw

**app_settings 컬럼 (q2_columns.csv 검증):** id / **key** / **value** / label / **group_name** / updated_at

**기존 활용 패턴 (board.html 라인 1260):** `app_settings?group_name=eq.board_tab&select=key,value` — D-4에서 `group_name='notice'` 또는 `'banner'` 패턴 모방 가능

**notices / banners 테이블:** 미존재 (q1_tables.csv 0행) → 결정 K-1 분기

### 3.4 Phase C mock 콘텐츠 (admin_v2.html 라인 2025~2156)

- **라인 2030:** `[Phase C mock]` 라벨
- **라인 2039~2088:** 활성 카드 4개 (`adm-notice-grid` — 토글 4 — 활성 3 + 비활성 1)
- **라인 2091~2155:** 작성 이력 테이블 5행 (유형 / 제목 / 대상 role / 작성자 / 상태 / 노출 기간 / 액션)
- **role 분기 표시 raw:** "전체 사용자" / "FREE 사용자" / "GA · 원수사" / "GA 매니저 이상" — 자유 텍스트

### 3.5 결정 항목 신규 후보 (4~6건 — K-1 ~ K-6)

| # | 결정 후보 | 옵션 | 권장 |
|:--:|---|---|---|
| **K-1** | 데이터 테이블 결정 | (a) app_settings 통합 (`group_name='notice'/'banner'`) / (b) notices/banners 별도 테이블 신설 / (c) v2.0 대기 + mock 보존 | **(a) 권장** — board.html 패턴 정합 + DB 변경 0건 |
| **K-2** | 노출 기간 default | (a) 영구 / (b) 1주 / (c) 사용자 입력 필수 | (b) 1주 (default 안전) |
| **K-3** | role 분기 표시 | (a) 자유 텍스트 (현 mock) / (b) enum 5종 (전체/FREE/GA/원수사/매니저 이상) | (b) enum (검색·필터 정합) |
| **K-4** | 토글 즉시 반영 | (a) 즉시 PATCH / (b) 배치 (저장 버튼) | (a) 즉시 (admin UX 정합) |
| **K-5** | 신규 공지 작성 form | (a) D-4 범위 / (b) Phase E | (b) Phase E (D-4는 조회·토글만) |
| **K-6** | 조회수 표시 | (a) view_count 신설 / (b) D-4 범위 외 | (b) 별 트랙 |

### 3.6 Step 분할 (5단계 — K-1 (a) 채택 시 DB 변경 0건)
### 3.7 라이브 회귀 항목 추정 (~20항목 — D-3보다 가벼움)

| 섹션 | 수 | 핵심 |
|---|:--:|---|
| § 1 정의 raw | 3 | typeof admLoadNotice / mock 잔존 / app_settings group_name raw |
| § 2 실 동작 | 8 | 진입 / 카드 4 / 토글 즉시 반영 / 작성 이력 / role 분기 표시 / 노출 기간 / 활성 카운트 |
| § 4 RBAC | 2 | 비-admin 차단 / admin SELECT |
| § 5 콘솔·네트워크 | 4 | Error 0 / 4xx 0 / 토글 PATCH / D-1·D-2·D-3 회귀 |
| § 6 성능 | 3 | P1 KPI / P2 토글 PATCH / P3 진입 총 시간 |
| **합계** | **20** | |

---

## 4. D-5 analytics 사전 분석 — DAU/WAU/MAU + 6메뉴 막대 (가장 무거운 단계)

### 4.1 작업 배경

| 항목 | 내용 |
|---|---|
| 목표 | admin_v2.html `analytics` 섹션 Phase C mock(KPI 4 + DAU 90일 라인 + 6메뉴 막대)를 실 Supabase 데이터로 전환 + RPC 4종 신설 |
| 메인 트랙 정합 | _INDEX.md D-5 = "DAU/WAU/MAU RPC + 기능별 사용량" |
| 무거움 근거 | RPC 4종 신설 + 차트 데이터 변환 + cold-start 대비 + 별 트랙 B-1 grid 토큰 묶음 가능 |

### 4.2 변경 범위 (3파일 + RPC 4종)

| 파일 | 변경 유형 | 라인 |
|---|---|---|
| `js/admin_v2.js` | UPDATE — analytics 섹션 함수 + RPC 호출 8종 | +300~400줄 |
| `pages/admin_v2.html` | UPDATE — analytics mock 제거 | 라인 1877~2020 (~140줄 영향) |
| Supabase DB | **RPC 4종 신설** + 별 트랙 B-1 토큰 신설 | 함수 4건 + GRANT 12건 |

### 4.3 RPC 신설 4종 (D-pre 항목 4 § 5.5 명시: "현재 RPC 0건 → D-5에서 RPC 신설")

| RPC | 시그니처 | 데이터 원천 | 기대 효과 |
|---|---|---|---|
| `get_dau(start_date, end_date)` | `RETURNS TABLE(day date, dau bigint)` | activity_logs distinct user_id GROUP BY day | 90일 라인차트 1 round trip |
| `get_wau()` / `get_mau()` | `RETURNS bigint` | 지난 7일/30일 distinct user_id | KPI 카드 단순 |
| `get_feature_usage(start, end)` | `RETURNS TABLE(target_type text, count bigint)` | activity_logs.target_type GROUP BY | 6메뉴 막대 |
| `get_retention_d30()` | `RETURNS numeric` | users 가입 후 30일 이내 last_seen_at 갱신 비율 | KPI 추세 |

**모든 RPC 표준 (D-2 별 트랙 #3 학습):**
- `LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public`
- `IF NOT public.is_admin() THEN RAISE EXCEPTION ... USING ERRCODE = '42501'` 가드
- `REVOKE ALL ON FUNCTION ... FROM PUBLIC` + `GRANT EXECUTE ... TO authenticated` + `REVOKE EXECUTE ... FROM anon`

### 4.4 Phase C mock 콘텐츠 (admin_v2.html 라인 1877~2020)

- **라인 1882:** `[Phase C mock]` 라벨
- **KPI 4카드:** DAU 342 / WAU 1,028 / MAU 2,847 / 리텐션 D-30 47%
- **DAU 추이 라인 (90일):** `<defs><linearGradient id="admDauArea">` + area + line + grid line `stroke="rgba(255,255,255,0.06)"` (별 트랙 B-1) + 90일/30일/7일 토글 3개
- **6메뉴 막대 (라인 1986~2007):** 스크립트 라이브러리 8,472 / 홈 7,284 / 함께해요 게시판 5,521 / 마이스페이스 4,328 / 자료실 2,947 / 공지 게시판 1,768

### 4.5 데이터 소스 정합

**activity_logs (D-pre.6 capture):**
- id (bigint) / **user_id** (uuid FK) / **event_type** (text) / **target_type** (text) / target_id (text) / **created_at** (timestamptz)
- 인덱스: `idx_activity_user_time ON (user_id, created_at DESC)`
- RLS 6건 (D-pre.6 9역할 재작성 + D-pre.7 admin_select 1건) — admin SELECT 정합 ✅

**script_usage_logs (D-pre.8 § 5-2):** 사용자 자기 row SELECT 정책 신설됨 → admin이 admin_v2에서 집계 가능

### 4.6 결정 항목 신규 후보 (8~10건 — L-1 ~ L-10)

| # | 결정 후보 | 옵션 | 권장 |
|:--:|---|---|---|
| **L-1** | 집계 윈도우 (KST 자정 기준) | D-2 fetchContentKPI 패턴 (`setUTCHours(15,0,0,0)`) | **D-2 패턴 채택** |
| **L-2** | RPC cold-start 대비 | D-2 별 트랙 #3 학습 — RPC P3·P4 < 200ms 보장 | 대비 표준 채택 |
| **L-3** | 차트 시간축 default | (a) 90일 (현 mock) / (b) 30일 / (c) 7일 | **(a) 90일** mock 정합 |
| **L-4** | 6메뉴 표준 | (a) activity_logs.target_type raw GROUP BY desc / (b) mock 6종 매핑 (script/home/together/myspace/library/notice) | **(b) 매핑** UX 안정 + raw 부족 시 0 표시 |
| **L-5** | 신규 vs 기존 사용자 분리 | (a) D-5 범위 / (b) 코호트 분석 별 트랙 | **(b) 별 트랙** D-5 무거움 |
| **L-6** | 데이터 부족 표시 | "데이터 수집 중" 라벨 — 0행 시 mock 자리 표시 | 표준 채택 |
| **L-7** | 차트 grid line 토큰 | **별 트랙 B-1** — `--admin-chart-grid` 신규 + dashboard·D-3·D-5 일괄 마이그레이션 | **D-5와 묶음** (B-1 묶음) |
| **L-8** | DAU/WAU/MAU 정의 | DAU = 오늘 distinct user_id / WAU = 지난 7일 / MAU = 지난 30일 / 리텐션 D-30 = 가입 후 30일 이내 last_seen_at 갱신 비율 | 명문화 채택 |
| **L-9** | RPC SECURITY DEFINER 표준 | D-2 get_stage_distribution 패턴 (REVOKE PUBLIC + GRANT authenticated + REVOKE anon) | 표준 채택 |
| **L-10** | "📅 기간 선택" / "📤 리포트 PDF" 버튼 | (a) D-5 범위 외 mock 보존 / (b) PDF는 별 트랙 | **(a) mock 보존** |

### 4.7 Step 분할 (6단계 — RPC 4종으로 Step 2·3 분리)

- **Step 1** 사전 검증 (DB raw — activity_logs 카운트 + target_type 분포 + RLS 회귀 + RPC 충돌 확인)
- **Step 2** RPC 4종 SQL 본 작성 + 권한 정합 (Chrome 위임)
- **Step 3** RPC 정합 검증 3건 × 4 RPC = 12건 (Chrome 위임)
- **Step 4** js/admin_v2.js 확장 (~300줄 — fetchAnalyticsKPI / fetchDAU90d / fetchFeatureUsage / fetchRetentionD30 + render 함수 4종)
- **Step 5** admin_v2.html mock 제거 (라인 1877~2020 → 슬롯 ID + js 연결) + 별 트랙 B-1 grid line 토큰 마이그레이션
- **Step 6** 라이브 회귀 검증 의뢰서 발행 (~30항목) + 잔존 부채 등록 + _INDEX.md 갱신

### 4.8 라이브 회귀 항목 추정 (~30항목 — 차트 정합 검증 추가)

| 섹션 | 수 | 핵심 |
|---|:--:|---|
| § 1 정의 raw | 4 | typeof admLoadAnalytics / mock 잔존 / RPC 4종 시그니처 |
| § 2 실 동작 | 12 | KPI 4 + DAU 차트 90일 + 6메뉴 막대 6 + 시간축 토글 |
| § 4 RBAC | 3 | 비-admin 차단 / RPC anon 차단 / admin SELECT |
| § 5 콘솔·네트워크 | 5 | Error 0 / 4xx 0 / 병렬 / D-1·D-2·D-3·D-4 회귀 / race |
| § 6 성능 | 6 | RPC 4종 P1~P4 + P5 차트 렌더 + P6 총 시간 |
| **합계** | **30** | |

---

## 5. D-6 logs 사전 분석 — activity_logs 검색·필터

### 5.1 작업 배경

| 항목 | 내용 |
|---|---|
| 목표 | admin_v2.html `logs` 섹션 Phase C mock(검색·필터바 + 12행)을 실 activity_logs 데이터로 전환 |
| 메인 트랙 정합 | _INDEX.md D-6 = "activity_logs + system_logs (또는 Sentry 통합)" |

### 5.2 변경 범위 (2파일 + 결정 M-2 분기)

| 파일 | 변경 유형 | 라인 |
|---|---|---|
| `js/admin_v2.js` | UPDATE — logs 섹션 함수 + 검색·필터 디바운스 | +200줄 |
| `pages/admin_v2.html` | UPDATE — logs mock 제거 | 라인 2162~2322 (~160줄 영향) |
| Supabase DB | **변경 0건** — activity_logs 정합 (D-pre.6/7 청산 회귀만) | 0건 |

### 5.3 데이터 소스 정합

**activity_logs (D-pre.6 capture + 4.5 절 동일):**
- 6컬럼 + 인덱스 `(user_id, created_at DESC)` 활용 → 사용자별 검색 빠름
- RLS 6건 admin SELECT 정합 ✅

**system_logs:** 미존재 (q1_tables.csv 0행) → 결정 M-2 분기

### 5.4 Phase C mock 콘텐츠 (admin_v2.html 라인 2162~2322)

- **라인 2167:** `[Phase C mock]` 라벨
- **라인 2176~2202:** 검색·필터바 (검색 input + date input + 사용자 select + 액션 select 6종 + 결과 select 3종)
- **라인 2205~2320:** 로그 테이블 12행 (시각 / 사용자 / 액션 / 대상 / 결과 / 상세)

### 5.5 결정 항목 신규 후보 (4~6건 — M-1 ~ M-6)

| # | 결정 후보 | 옵션 | 권장 |
|:--:|---|---|---|
| **M-1** | 검색 인덱스 | (a) activity_logs.event_type GIN 인덱스 신설 / (b) 단순 LIKE | (b) (성능 raw 측정 후 격상 가능) |
| **M-2** | system_logs 처리 | (a) DB 신설 / (b) Sentry 통합 위임 / (c) mock 보존 | **(c) 우선 + 별 트랙** Sentry 위임 |
| **M-3** | 필터 우선순위 | 날짜 → 사용자 → 액션 → 결과 | UX 표준 채택 |
| **M-4** | 시간축 default | (a) 오늘 / (b) 7일 / (c) 사용자 입력 | (a) 오늘 (mock 정합) |
| **M-5** | 로그 보존 정책 | (a) 90일 자동 삭제 trigger / (b) 영구 보관 / (c) 1년 | **(b) 영구** D-6 범위 외 (별 트랙) |
| **M-6** | "📤 CSV" 내보내기 | (a) D-6 범위 / (b) Phase E | (b) Phase E |

### 5.6 Step 분할 (5단계 — D-2 패턴, RPC 0건)
### 5.7 라이브 회귀 항목 추정 (~20항목)

| 섹션 | 수 | 핵심 |
|---|:--:|---|
| § 1 정의 raw | 3 | typeof admLoadLogs / mock 잔존 / activity_logs raw |
| § 2 실 동작 | 9 | 진입 / 검색 디바운스 / 4필터 / 12행 표시 / 정렬 / 상세 |
| § 4 RBAC | 2 | 비-admin 차단 / admin SELECT |
| § 5 콘솔·네트워크 | 4 | Error 0 / 4xx 0 / 검색 PATCH / D-1~D-5 회귀 |
| § 6 성능 | 2 | P1 검색 1회 / P2 진입 총 시간 |
| **합계** | **20** | |

---

## 6. D-7 billing 사전 분석 — payments + 4플랜 (분기 N-1 핵심)

### 6.1 핵심 발견 (강조)

**payments / subscriptions / plans 테이블 모두 미존재** (q1_tables.csv 0행) → D-pre 항목 4 § 5.5 명시:
> "🛑 제외 — 테이블 0건 → Phase D 범위 제외"

**그러나 admin_v2.html Phase C mock은 풀 채워짐 (라인 2327~2532)** → D-7 진입 시 결정 N-1 분기 필수.

### 6.2 작업 배경

| 항목 | 내용 |
|---|---|
| 목표 | admin_v2.html `billing` 섹션 Phase C mock(KPI 3 + 4플랜 도넛 + 결제 8행)을 어떻게 처리할지 분기 결정 |
| 메인 트랙 정합 | _INDEX.md D-7 = "payments + subscriptions + 4플랜 분포" |

### 6.3 변경 범위 (3분기)

| 분기 | 변경 |
|---|---|
| **(가) 테이블 신설 + D-7 진입** | DB 3테이블 (payments / subscriptions / plans) + RLS 12건 + js/admin_v2.js +200줄 + admin_v2.html mock 제거 |
| **(나) v2.0 대기 + mock 보존** | 변경 0건 + admin_v2.html `[Phase C mock]` 라벨만 `[v2.0 대기]`로 갱신 + 별 트랙 등록 |
| **(다) Toss/PortOne SDK 통합 결정 후 진입** | 별 트랙 → Phase D 범위 외 |

### 6.4 4플랜 raw (pricing.html 검증 + admin_v2.html mock 정합)

| 플랜 | 가격 | 근거 |
|---|---|---|
| **무료 (FREE)** | ₩0 | pricing.html 라인 159 / admin_v2.html 라인 2407 |
| **PRO** | ₩9,900/월 | pricing.html 라인 175 / admin_v2.html 라인 2415 |
| **CRM** | ₩19,900/월 | admin_v2.html 라인 2423 (pricing.html 미정의 — admin_v2 mock 단독) |
| **원수사 (B2B)** | ₩1,000,000/월 | admin_v2.html 라인 2431 (pricing.html은 "맞춤 협의" 라인 191 — 차이) |

### 6.5 Phase C mock 콘텐츠 (admin_v2.html 라인 2327~2532)

- **라인 2332:** `[Phase C mock]` 라벨
- **라인 2341~2366:** KPI 3카드 (이번 달 매출 ₩48,720,000 / 활성 구독 487 / 결제 실패 7일 3)
- **라인 2369~2436:** 4플랜 도넛 + 라인업 panel (62.1%/28.0%/8.9%/1.0% + 색계열: FREE #71717A / PRO #10B981 / CRM #3B82F6 / 원수사 #D4845A)
- **라인 2438~2530:** 최근 결제 테이블 8행 (결제일/사용자/플랜/금액/방법/상태/비고)

### 6.6 결정 항목 신규 후보 (4~6건 — N-1 ~ N-6)

| # | 결정 후보 | 옵션 | 권장 |
|:--:|---|---|---|
| **N-1** | D-7 진입 분기 | (가) 테이블 신설 진입 / **(나) v2.0 대기 + mock 보존** / (다) SDK 통합 후 | **(나) 권장 ⭐** D-pre 정합 + 외부 마감일 압박 금지 정합 |
| **N-2** | 결제 상태 표준 | 완료 / 실패 / 환불 처리 / 자동 갱신 | (가) 채택 시만 의미 |
| **N-3** | 환불 액션 표시 | (a) D-7 범위 / (b) Phase E | (b) Phase E |
| **N-4** | 4플랜 색계열 | (a) D-2 status-bg 토큰 4종 재사용 / (b) mock 색계열 그대로 | (b) mock 보존 (도메인 특화) |
| **N-5** | CRM 플랜 정의 | pricing.html 미정의 — admin_v2 단독 | **별 트랙 결정 대기** |
| **N-6** | "📤 매출 리포트" 버튼 | (a) D-7 범위 외 / (b) Phase E | (a) 범위 외 |

### 6.7 Step 분할 ((나) 권장 시 1~2단계 — 매우 가벼움)

- **Step 1** admin_v2.html 라벨 갱신 (`[Phase C mock]` → `[v2.0 대기]`) + mock 보존
- **Step 2** _INDEX.md D-7 행 갱신 ("v2.0 대기 — Toss/PortOne SDK 통합 결정 후 진입") + 잔존 부채 등록

→ (가) 채택 시 D-3와 동일 5단계 + DB 3테이블 신설

### 6.8 라이브 회귀 항목 추정 ((나) 권장 시 ~5항목 / (가) 채택 시 ~20항목)

---

## 7. D-8 dashboard 종합 사전 분석 — 모든 섹션 KPI 통합 + 별 트랙 묶음

### 7.1 작업 배경

| 항목 | 내용 |
|---|---|
| 목표 | admin_v2.html `dashboard` 섹션 Phase B mock(KPI 4 + timeline + 최근 가입자 + 시스템 상태 + Top 스크립트)을 실 데이터로 전환 + 별 트랙 B-2 토큰 마이그레이션 묶음 |
| 메인 트랙 정합 | _INDEX.md D-8 = "KPI 4 + timeline + 최근 가입자 + 시스템 상태 + Top 스크립트 모두 실 연결" |
| 특징 | 다른 섹션 함수 재활용 가능 (D-1 fetchKPI / D-3 fetchBoardKPI / D-5 get_dau RPC) |

### 7.2 변경 범위 (2파일 + 별 트랙 B-2 묶음)

| 파일 | 변경 유형 | 라인 |
|---|---|---|
| `js/admin_v2.js` | UPDATE — dashboard 섹션 함수 (다른 섹션 재활용) | +250줄 |
| `pages/admin_v2.html` | UPDATE — dashboard mock 제거 + 별 트랙 B-2 토큰 마이그레이션 | 라인 1230~1524 (~290줄) + 라인 677~683 (토큰 4종) |
| Supabase DB | **변경 0~소수** — RPC 신설 가능 (`get_dashboard_kpi()` / `get_recent_users(limit)`) | 0~2건 |

### 7.3 dashboard mock 5섹션 (admin_v2.html 라인 1230~1524)

| 섹션 | mock raw | 데이터 소스 매핑 |
|---|---|---|
| **KPI 4카드** (라인 1244~1278) | 총 사용자 1,284 / 오늘 활성 342 / 오늘 스크립트 조회 2,847 / 미처리 신고 7 | D-1 fetchKPI() 재활용 + D-3 board KPI + D-5 DAU 재활용 |
| **사용자 활동 추이** (라인 1281~1331) | 30일 라인차트 — DAU + 스크립트 조회 area | D-5 get_dau RPC 재활용 (시간축 30일) |
| **실시간 timeline 6건** (라인 1333~1384) | 김설계 가입 / 박지점장 조회 / 강센터장 함께해요 / 신고 접수 / 이팀장 결제 / 최팀장 저장 | activity_logs 최근 6건 desc |
| **최근 가입자 5행** (라인 1387~1467) | 5명 (사용자/권한/플랜/소속/상태/가입일/최근접속) | D-1 fetchUsers(order=created_at.desc, limit=5) 재활용 |
| **🔥 Top 스크립트 5위** (라인 1471~1505) | 클로징 / 도입반론 / 필요성 ① / 반론 대응 / 2차 클로징 (use_count desc) | scripts?order=use_count.desc&limit=5 (단순) |
| **🧪 시스템 상태 5행** (라인 1507~1521) | Supabase API / 데이터베이스 / Auth / Storage / CDN | D-6 M-2 정합 (Sentry / 또는 헬스체크 endpoint) |

### 7.4 별 트랙 B-2 토큰 마이그레이션 (admin_v2.html 라인 677~683)

`.adm-badge.online` / `.pro` / `.branch` / `.manager` / `.admin` (구 `var(--color-*)` 잔존 → Phase C 도입 4토큰 `--admin-info-text` / `--admin-success-text` / `--admin-warning-text` / `--admin-danger-text`로 마이그레이션) — Phase C 작업 §5 "dashboard 변경 금지" 준수로 보존됨.

### 7.5 별 트랙 B-1 차트 grid line 토큰 (D-5와 묶기 가능)

`stroke="rgba(255,255,255,0.06)"` 하드코딩 — dashboard 라인 1310 / D-3 board 라인 1781 / D-5 analytics 라인 1947·1978. CSS 변수 `--admin-chart-grid` 신규 + 일괄 교체.

### 7.6 결정 항목 신규 후보 (5~7건 — O-1 ~ O-7)

| # | 결정 후보 | 옵션 | 권장 |
|:--:|---|---|---|
| **O-1** | timeline 6건 데이터 소스 | (a) activity_logs 단독 / (b) multi-source merge (가입+결제+신고) | **(a) 단독** 단순 |
| **O-2** | 시스템 상태 데이터 | (a) Sentry API / (b) Supabase 헬스체크 endpoint / (c) mock 보존 | **(c) 우선 + 별 트랙 (M-2 정합)** |
| **O-3** | Top 스크립트 정렬 기준 | (a) use_count desc / (b) script_usage_logs 7일 집계 | **(a) 우선 + (b) Phase E 격상** |
| **O-4** | 최근 가입자 행 수 | (a) 5 (현 mock) / (b) 7 / (c) 10 | (a) 5 mock 정합 |
| **O-5** | KPI 4카드 추세 라벨 동적화 | D-2 잔존 부채 #5와 동일 — Phase E | Phase E 격상 |
| **O-6** | 별 트랙 B-2 토큰 마이그레이션 시점 | (a) D-8 단일 커밋 / (b) D-8 끝 별 트랙 분리 | **(a) D-8 단일 커밋** |
| **O-7** | 별 트랙 B-1 차트 grid 토큰 시점 | (a) D-5와 묶음 / (b) D-8과 묶음 / (c) 단독 별 트랙 | **(a) D-5와 묶음** L-7 정합 |

### 7.7 Step 분할 (5단계 + 별 트랙 묶음)
### 7.8 라이브 회귀 항목 추정 (~25항목)

| 섹션 | 수 | 핵심 |
|---|:--:|---|
| § 1 정의 raw | 4 | typeof admLoadDashboard / mock 잔존 / 토큰 마이그레이션 검증 |
| § 2 실 동작 | 11 | 진입 / KPI 4 / DAU 차트 / timeline 6 / 최근 가입자 5 / Top 스크립트 5 / 시스템 상태 5 |
| § 4 RBAC | 2 | 비-admin 차단 / admin SELECT |
| § 5 콘솔·네트워크 | 4 | Error 0 / 4xx 0 / 병렬 / D-1~D-7 회귀 |
| § 6 성능 | 4 | P1 KPI 4 / P2 DAU 차트 / P3 timeline / P4 진입 총 시간 |
| **합계** | **25** | |

---

## 8. D-final 보안 검증 사전 분석 — 9역할 RLS 전수 sweep + 종합 sanity

### 8.1 작업 배경

| 항목 | 내용 |
|---|---|
| 목표 | D-1~D-8 모든 단계 종합 sanity check + 9역할 RLS 정합 라이브 검증 + admin/비-admin 진입 차단 검증 |
| 메인 트랙 정합 | _INDEX.md D-final = "9역할 RLS 정합 + admin 무접두어 vs ga_*/insurer_* + admin 진입 게이트 + 비-admin 진입 차단 검증" |

### 8.2 변경 범위 (검증 위주, 코드 변경 0~소수)

| 파일 | 변경 유형 |
|---|---|
| Supabase DB | **변경 0~소수** — RLS 9역할 sweep 회귀 검증 (D-pre.6/7/8 청산 결과 라이브 회귀) |
| `pages/admin_v2.html` | 변경 0건 — 검증만 |
| `pages/*.html` 9페이지 | 변경 0건 — 별 트랙 β 인증 게이트 회귀 검증 |
| `js/auth.js` / `js/db.js` | 변경 0~소수 — 토큰 만료 처리 회귀 |

### 8.3 9역할 RLS 정합 전수 sweep (검증 SQL)

| # | 검증 SQL | 기대값 | 근거 |
|:--:|---|---|---|
| 1 | `SELECT tablename, policyname, qual FROM pg_policies WHERE qual ILIKE '%FROM users me%' OR with_check ILIKE '%FROM users me%'` | **0행** | D-pre.7 § 9.9 영구 청산 |
| 2 | `SELECT policyname FROM pg_policies WHERE qual ILIKE '%role = ''admin''%' AND policyname NOT LIKE '%is_admin%'` | **0행** | D-pre.8 인라인 EXISTS 0건 |
| 3 | `SELECT policyname FROM pg_policies WHERE 'anon' = ANY(roles) AND tablename IN ('comments','posts','users','library','scripts')` | **0행** | D-pre.8 anon 청산 |
| 4 | `SELECT role, COUNT(*) FROM users GROUP BY role` | 9역할만 / 5역할 잔존 0건 | D-pre.6 청산 |
| 5 | `is_admin()` 함수 정의 | SECURITY DEFINER + STABLE + boolean | D-pre.7 § 3.3 |

### 8.4 admin 진입 게이트 (별 트랙 β 회귀 검증)

`pages/*.html` 9페이지 (admin / admin_v2 / board / home / myspace / news / quick / scripts / together) 모두 인라인 IIFE 게이트 — 미인증 직접 URL 접근 시 `/login.html` 즉시 redirect (별 트랙 β `2142ab1`).

### 8.5 비-admin 진입 차단 검증

- admin_v2.html 직접 URL → `/login.html` redirect (인증 게이트)
- 인증 후 비-admin role → admExit 자동 호출 (D-1~D-8 모든 함수에 적용된 `if (res.status === 403 && typeof window.admExit === 'function') window.admExit()`)

### 8.6 결정 항목 신규 후보 (3~5건 — P-1 ~ P-5)

| # | 결정 후보 | 옵션 | 권장 |
|:--:|---|---|---|
| **P-1** | 종합 회귀 검증 항목 수 | 7단계 누적 ~40항목 | 표준 채택 |
| **P-2** | 별 트랙 α exception_diseases 차단 회귀 | UI 차단 (`7ea9044`) + DB 정책 admin only (`is_admin()`) 회귀 검증 | 표준 채택 |
| **P-3** | 토큰 만료 처리 검증 | 401 → refreshToken → 재시도 1회 → 실패 시 handleTokenExpired 라이브 검증 | 표준 채택 |
| **P-4** | 종합 sanity 항목 우선순위 | RLS sweep > 인증 게이트 > 9역할 정합 > 토큰 만료 > Sentry hook | 표준 채택 |
| **P-5** | RLS 자기 참조 회피 표준 영구 명문화 | (a) 메모리 등록 / (b) CLAUDE.md 절 추가 / (c) 둘 다 | **(c) 둘 다** D-pre.7 § 7.3 학습 |

### 8.7 Step 분할 (3~4단계 — 검증 위주)

- **Step 1** DB raw 검증 SQL 5건 (Chrome 위임) → 5/5 PASS 확인
- **Step 2** 9페이지 인증 게이트 라이브 검증 (Chrome) → 9/9 PASS
- **Step 3** D-1~D-8 7단계 종합 회귀 의뢰서 발행 (~40항목) → Chrome 라이브 검증
- **Step 4** Phase D 종료 표기 (_INDEX.md + CLAUDE.md + 메모리)

### 8.8 라이브 회귀 항목 추정 (~40항목 — 7단계 종합 sanity)

| 섹션 | 수 | 핵심 |
|---|:--:|---|
| § 1 RLS sweep raw | 5 | 자기 참조 0 / 인라인 EXISTS 0 / anon 0 / 9역할 정합 / is_admin() 정의 |
| § 2 인증 게이트 | 9 | 9페이지 직접 URL → /login.html redirect |
| § 3 admin/비-admin 분기 | 4 | admin 진입 / 비-admin admExit / 403 처리 / 토큰 만료 |
| § 4 D-1~D-8 회귀 (단계별 핵심 항목 재실행) | 16 | 각 단계 2항목 (admLoad* 함수 + 핵심 KPI/액션) |
| § 5 별 트랙 회귀 | 4 | α exception_diseases / β 인증 게이트 / B-1 grid 토큰 / B-2 dashboard 뱃지 토큰 |
| § 6 콘솔·네트워크 | 2 | Error 0 / 4xx 0 |
| **합계** | **40** | |

---

## 9. 절대 원칙 + 누적 학습 15건

### 9.1 모든 단계 진입 시 첫 검증 (D-pre.5/6/7/8 + D-1 + D-2 + 별 트랙 #3 누적)

| # | 학습 | 출처 |
|:--:|---|---|
| 1 | CLAUDE.md 신버전 확인 절대 원칙 (`pdnwgzneooyygfejrvbg`) | CLAUDE.md |
| 2 | RLS USING/WITH CHECK 동일 테이블 SELECT 서브쿼리 절대 금지 | D-pre.7 § 7.1 |
| 3 | admin/role 검증 = SECURITY DEFINER 함수 `is_admin()` | D-pre.7 § 7.2 |
| 4 | DB 메타 통과 ≠ 라이브 안전 → 라이브 회귀 검증 필수 | D-pre.7 § 7.3 |
| 5 | 정의 raw + 실 동작 이중 검증 | D-pre.6 |
| 6 | 같은 테이블 다른 cmd 정책 sweep 사전 검증 | D-pre.7 § 9.11 |
| 7 | "재귀 안전 ✅" 단정 결론 금지 | D-pre.7 § 7.5 |
| 8 | Code SQL 직접 실행 불가 → 팀장님/Chrome Dashboard 협업 | D-1 |
| 9 | DB UPDATE 전 백업 (CSV Export) | D-pre.5 |
| 10 | 작업지시서 0번 정합성 검증 절대 프로토콜 | CLAUDE.md |
| 11 | race 안전장치 — fetch 응답 도착 시 active view 재확인 | D-1 |
| 12 | mock UI 보존 vs 동적화 분리 — 추세·페이징 별 트랙 | D-2 I-7 |
| 13 | 절대 경로 script src (`/js/...`) — 직접 URL 진입 회귀 차단 | 5/3 진단 |
| 14 | STAGE_LABELS 등 분류 매핑은 DB 진실 원천 + 한국어 번역만 | D-2 (i) |
| 15 | RPC 신설 시 SECURITY DEFINER + is_admin() 가드 + REVOKE PUBLIC + GRANT authenticated + REVOKE anon | D-2 별 트랙 #3 |

### 9.2 단계 진입 전 강제 체크리스트

- [ ] _INDEX.md 확인 → 본 통합본 § 0 정합 검증
- [ ] 직전 단계 라이브 회귀 PASS 확인 (D-3 진입 전 D-2 25/25 PASS)
- [ ] CLAUDE.md "Supabase 신버전 확인" 첫 질문
- [ ] 본 통합본 해당 § 정독 → 결정 항목 J-*/K-*/L-*/M-*/N-*/O-*/P-* 중 미결정 항목 팀장님 결재 의뢰
- [ ] 신규 RPC 시 § 9.1 #15 표준 적용

---

## 10. 진입 순서 + 일정 견적 + 부채 누적 표

### 10.1 권장 진입 순서

| 순서 | 단계 | 권장 사유 |
|:--:|---|---|
| 1 | **D-3 board** | mock 가장 풍부 + 모더레이션 액션 활성으로 admin_v2 시연 가치 ↑ |
| 2 | D-4 notice | K-1 (a) 채택 시 가벼움 (DB 변경 0건) |
| 3 | D-6 logs | activity_logs 정합 + RPC 0건 = 가벼움 + D-5 진입 전 데이터 raw 확인 가치 |
| 4 | **D-5 analytics** | 가장 무거운 단계 (RPC 4종) + B-1 grid 토큰 묶음 |
| 5 | D-7 billing | (나) v2.0 대기 권장 → 매우 가벼움 |
| 6 | D-8 dashboard 종합 | 다른 섹션 함수 재활용 + B-2 토큰 묶음 |
| 7 | **D-final 보안 sweep** | 7단계 종합 sanity |

→ 순서 변경 가능 (팀장님 결정).

### 10.2 일정 견적 (D-1·D-2 실측 패턴 기반, 옵션 B 적용)

| 단계 | 추정 세션 | 본 통합본 적용 효과 |
|---|:--:|---|
| D-3 board | 1.3 | 사전 분석 ~0.3세션 절감 |
| D-4 notice | 1.0 | (a) 채택 시 가벼움 |
| D-5 analytics | 1.8 | RPC 4종 본 작성·검증 무거움 |
| D-6 logs | 0.8 | RPC 0건 가벼움 |
| D-7 billing | 0.3 | (나) 채택 시 매우 가벼움 |
| D-8 dashboard 종합 | 1.3 | 함수 재활용 절감 + B-2 묶음 |
| D-final 보안 sweep | 1.0 | 검증 위주 |
| 회귀·fix 마진 (+30%) | 2.3 | D-1·D-2 실측 |
| **잔여 D 합계** | **~9.8세션** | (옵션 A 14세션 → 옵션 B 12세션 → 권장 진입 순서 적용 시 ~10세션) |

### 10.3 잔존 부채 누적 (본 통합본 작성 시점 12건 + D-3~D-final 진행 중 신규 발견)

본 통합본 § 1.5 표 그대로 + 단계별 신규 부채는 단계 진입 시 별 트랙·Phase E·v2.0 분류.

---

## 11. 참고

### 11.1 본 통합본 진실 원천

- `docs/specs/admin_v2_phase_d_pre.md` (D-pre 결정 27건)
- `docs/specs/admin_v2_d1_workorder.md` (D-1 패턴)
- `docs/specs/admin_v2_d2_workorder.md` (D-2 패턴 + 별 트랙 #3 격상)
- `docs/architecture/db_pre_dpre7_capture.md` (RLS 자기 참조 학습 6건)
- `docs/architecture/db_pre_dpre8_capture.md` (인라인 EXISTS sweep 5항목)
- `docs/sessions/_INDEX.md` (8섹션 ↔ 데이터 소스 매핑)
- `pages/admin_v2.html` (D-3~D-8 mock 라인 1230~2532)
- `js/admin_v2.js` (D-1·D-2 함수 25종 + race 안전장치 + showAdminToast)

### 11.2 단계 진입 시 발행 산출물 (단계별)

| 단계 | 작업지시서 | 라이브 회귀 의뢰서 | DB capture |
|---|---|---|---|
| D-3 | (본 통합본 § 2 인용 + Step 분할 본문) | `docs/specs/admin_v2_d3_live_regression_<date>.md` | (J-2 (a) 채택 시) `docs/architecture/db_d3_post_reports_capture.md` |
| D-4 | (본 통합본 § 3 인용 + Step 분할 본문) | `docs/specs/admin_v2_d4_live_regression_<date>.md` | (K-1 (b) 채택 시) `docs/architecture/db_d4_notices_capture.md` |
| D-5 | (본 통합본 § 4 인용 + Step 분할 본문 + RPC 4종 SQL) | `docs/specs/admin_v2_d5_live_regression_<date>.md` | `docs/architecture/db_d5_analytics_rpc_capture.md` (RPC 4종 raw) |
| D-6 | (본 통합본 § 5 인용 + Step 분할 본문) | `docs/specs/admin_v2_d6_live_regression_<date>.md` | — |
| D-7 | (본 통합본 § 6 인용 + 분기 N-1 결정) | (나) 채택 시 ~5항목 / (가) 채택 시 ~20항목 | (가) 채택 시 `docs/architecture/db_d7_billing_capture.md` |
| D-8 | (본 통합본 § 7 인용 + Step 분할 본문) | `docs/specs/admin_v2_d8_live_regression_<date>.md` | — |
| D-final | (본 통합본 § 8 인용 + 종합 sanity 본문) | `docs/specs/admin_v2_dfinal_live_regression_<date>.md` (~40항목) | `docs/architecture/db_dfinal_security_sweep_capture.md` |

### 11.3 본 통합본 갱신 정책

- D-3~D-final 단계별 진입 시점에서 결정 J-*/K-*/L-*/M-*/N-*/O-*/P-* 결재 raw 추가 → 본 통합본 § 2~§ 8 update commit
- 단계별 라이브 회귀 PASS 시점에서 § 1.5 잔존 부채 표 청산 표기 update commit
- D-final 종료 시점에서 본 통합본 → `_archive/admin_v2_d3_to_dfinal_workorder_v1_completed_<date>.md` 보존 + Phase E 진입 결정

---

*본 통합본은 admin_v2 Phase D 잔여 7단계의 사전 분석 진실 원천. 단계별 코드 작업·라이브 회귀 검증·Step 분할 본문은 단계 진입 시 별도 발행. D-final = 7단계 종합 sanity check 1회.*
