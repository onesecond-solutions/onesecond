# admin_v2 Phase E 작업지시서 — 9 role × 8 menu 메뉴 가시성 매트릭스

> **MD 파일 박음:** 2026-05-12 (Code D 트랙, Step E-1 박음 후 사후 정식화)
> **출처 정정 (2026-05-12):** 본 spec MD는 **Code 재구성 산출물**입니다. Claude AI 인계 spec 본문은 **부재** — 직전 세션(2026-05-12_1602) 인계는 "Step E-2~E-5 새 세션 진입 대기" 한 줄까지였고, c426542 commit body의 "Claude AI 작성, 2026-05-11" 단언은 부정확.
> **재구성 출처:** c426542 commit body + `docs/migrations/2026-05-11_phase_e_menu_settings_by_role.sql` 헤더 + `docs/sessions/2026-05-12_1602.md` + 본 세션 Step E-1 검증 결과 4건
> **메인 트랙:** admin_v2 Phase E (운영 토글 8종 = Phase A 완료 후 별 트랙)
> **선행 종료:** Phase 1.5 (5/10) + Phase A 운영 토글 8종 (5/12, 20 commit) + Phase 1 9역할 마이그레이션 (검증 0건 잔존)
> **본 작업지시서 본질:** admin이 사이드바 메뉴 가시성을 9 role × 8 menu 매트릭스로 직접 제어 + 사용자 실제 화면 미러링.
> **분량 추정:** Step E-1 ~30분 (완료) / Step E-2~E-5 ~4h (대기)
> **진실 원천:**
> - DB: `pdnwgzneooyygfejrvbg` (신버전, onesecond-v1-restore-0420)
> - 마이그레이션 SQL: `docs/migrations/2026-05-11_phase_e_menu_settings_by_role.sql` (182줄, 박힘 c426542)
> - 박힘 commit: `c426542` (Step E-1 SQL 박음) → `d05b046` (CLAUDE.md 정합 정정)

---

# § 1. 진입 컨텍스트

## 1-1. Phase E 본질 — Phase A와의 분기

| 레이어 | Phase A (운영 토글) | Phase E (메뉴 가시성) |
|---|---|---|
| **본질** | 전역 운영 기능 ON/OFF | role별 사이드바 메뉴 가시성 |
| **DB** | `app_settings` (key/value 패턴) | `menu_settings_by_role` (9 role × 8 menu 매트릭스) |
| **scope** | 8 keys 전역 토글 | 9 role × 8 menu = 72 row |
| **admin UI** | 운영 레이어 8 토글 (Phase A 박힘) | 9 row × 8 col 매트릭스 (Phase E Step E-3) |
| **사용자 영향** | 페이지 분기 (`_loadOpsLayerToggles`) | 사이드바 메뉴 노출/숨김 (`applyMenuSettingsByRole`) |
| **본 작업지시서 범위** | ❌ (Phase A 완결) | ✅ |

→ **두 레이어가 다름** — 작업지시서 § 1 정정 1건(2026-05-12, C 트랙) 박힘.

## 1-2. 9 role × 8 menu 매트릭스 구성

**9 role (admin + GA 4 + 원수사 4):**
- `admin`
- `ga_branch_manager` / `ga_manager` / `ga_member` / `ga_staff`
- `insurer_branch_manager` / `insurer_manager` / `insurer_member` / `insurer_staff`

**8 menu (사이드바 메뉴):**
- `menu_home` / `menu_scripts` / `menu_board` / `menu_myspace`
- `menu_news` / `menu_quick` / `menu_together` / `menu_team_mgmt`

**seed 정책 (admin 화면 복제):**
- 기본값: 모든 role × 모든 menu = `is_visible = true`
- 예외: `menu_team_mgmt` = 매니저 이상 5종(admin / ga_branch_manager / ga_manager / insurer_branch_manager / insurer_manager)만 `true`, 나머지 4종(`ga_member` / `ga_staff` / `insurer_member` / `insurer_staff`)은 `false`

## 1-3. 5/18 4팀 오픈일 정합

- 4팀 오픈일: **2026-05-18 (월)** (2026-05-12 결재, CLAUDE.md § 4팀 오픈일 박힘)
- D-6일 안전마진 = Phase E Step E-2~E-5 본진(~4h) + 본 세션 20 commit 라이브 검증(~1세션) + 회귀 패치 여유

---

# § 2. 본진 5 Step 흐름

> ⚠️ **본 § 2 Step E-2~E-5 본문은 Code 재구성 추정안입니다.**
> - Step E-1 박힘 결과(2026-05-12 검증 4건 100%)는 사실 기반.
> - Step E-2~E-5 흐름은 Code가 raw 재료(c426542 commit body + SQL 헤더 + 세션 노트)로 추정 재구성.
> - **Claude AI 신규 spec 본문 회신 시 § 2 통째 교체 예정.** Step E-2 박음 진입 전 결재 필수.

## Step E-1 — DB 마이그레이션 (완료, 2026-05-12)

**박힘 commit:** `c426542`

**박힘 내용:**
- 테이블 `public.menu_settings_by_role` 신설 (id / role / menu_key / is_visible / display_order / updated_at / updated_by)
- CHECK 제약 2건 (role 9종 + menu_key 8종) + UNIQUE (role, menu_key)
- RLS 정책 2건
  - `admin_full_access_menu_settings_by_role` (ALL, admin only)
  - `user_read_own_role_menu_settings` (SELECT, 본인 role)
- 인덱스 2건 (role 단독 + role+menu_key 복합)
- 72 row seed (9 role × 8 menu, admin 화면 복제 정책)

**검증 결과 (2026-05-12 16:30 박힘):**

| 검증 | 결과 | 기대값 |
|---|---|---|
| #1 total_rows | 72 ✅ | 72 |
| #2 피벗 매트릭스 9 row × 8 col | 완벽 일치 ✅ | 매니저 이상 5종 all 1 / 나머지 4종 team_mgmt=0 |
| #3 menu_team_mgmt 권한 | 정합 ✅ | 매니저 이상 TRUE / 나머지 FALSE |
| #4 RLS 정책 2건 | 정합 ✅ | admin_full_access ALL / user_read_own SELECT |

## Step E-2 — `applyMenuSettingsByRole` 함수 신설 (~1h, 대기)

**본질:** 사이드바 메뉴 노출/숨김을 `menu_settings_by_role` SELECT 결과 기준으로 적용.

**신설 위치 후보:** `js/db.js` 또는 `app.html` 내부 (Phase A `_loadOpsLayerToggles` 패턴 정합)

**흐름:**
1. 로그인 사용자 role 파악 (`public.users.role`)
2. `SELECT menu_key, is_visible FROM menu_settings_by_role WHERE role = $1`
3. 결과 기준 사이드바 DOM `data-menu-key` 속성 가진 요소 `display: none` 적용 (또는 visibility 패턴 — 메모리 [[feedback_fouc_visibility_pattern]] 정합)
4. admin 본인은 skip (admin은 모든 메뉴 노출 + 관리 권한)
5. FOUC 가드: visibility:hidden → data-ready="1" 후 visibility:visible

**의존성:**
- 기존 `applyMenuSettings` (운영 토글 화면설정) 정합 — `applyMenuSettings`는 전역 토글, `applyMenuSettingsByRole`은 role별 매트릭스. 둘 다 적용 (AND 조건)
- `admin` role은 두 함수 모두 skip (메모리 [[project_role_bypass_policy]] 정합)

## Step E-3 — admin UI 신설 (~1.5h, 대기)

**본질:** `pages/admin_v2.html`에 9 role × 8 menu 매트릭스 토글 UI 박음.

**UI 후보:**
- 9 row × 8 col 표 + 각 셀에 체크박스
- 좌측 첫 열: role 라벨 (ROLE_LABEL 9종 한국어)
- 상단 첫 행: menu_key 라벨 (한국어 매핑 필요 — 추후 결재)
- 셀 클릭 시 → DB UPSERT (UPDATE updated_at + updated_by)
- admin 본인 row는 readonly (admin은 항상 all-visible)

**위치:** admin_v2 rail "운영 레이어" 다음 신규 탭 또는 운영 레이어 내 별 섹션

**의존성:**
- Phase A admin rail 4 컴팩트(`d7e34ab`) 다음 자리
- RLS 정책 #1(admin_full_access) 정합 — admin UI에서 UPSERT 정상 동작

## Step E-4 — 미러링 + postMessage (~1h, 대기)

**본질:** admin UI에서 토글 변경 시 → 사용자 미러링 iframe(`?_preview=role`)에 postMessage → 즉시 사이드바 재렌더.

**흐름:**
1. admin 토글 변경 → DB UPSERT 완료
2. parent window → iframe contentWindow에 `postMessage({type: 'menu_settings_changed', role: <role>})`
3. iframe 내부 `window.addEventListener('message', ...)` 수신 → `applyMenuSettingsByRole(role)` 재실행
4. 사이드바 즉시 재렌더 (페이지 리로드 X)

**의존성:**
- Phase A 미러링 iframe (`b7be248` PC scale 강제) 정합
- `?_preview=` query 감지 패턴 (`ba986d8` admin 본인 영향 0) 정합

## Step E-5 — 회귀 검증 18건 (~1h, 대기)

**검증 분류:**

| # | 분류 | 항목 |
|---|---|---|
| 1~9 | 9 role 각각 진입 | 매니저 이상 5종은 8 menu 노출 / 나머지 4종은 7 menu 노출(team_mgmt 숨김) |
| 10~13 | admin 토글 변경 | 각 menu_key 토글 OFF → 해당 role 사용자 즉시 사이드바 반영 |
| 14 | admin 본인 영향 0 | admin은 모든 토글 OFF에도 본인 사이드바 정상 |
| 15 | RLS 정책 | non-admin이 UPDATE 시도 → 거부 |
| 16 | FOUC | 페이지 로드 시 사이드바 깜빡임 0 |
| 17 | 미러링 postMessage | admin 변경 → iframe 즉시 반영 |
| 18 | 라이브 회귀 | 본 세션 20 commit + Phase 1.5 + admin_v2 Phase A~D 회귀 0 |

---

# § 3. 절대 금지

- DB 마이그레이션 재실행 X (Step E-1 박힘 후 동일 SQL 재실행 시 unique 충돌)
- `admin` role 사용자에게 메뉴 숨김 적용 X (메모리 [[project_role_bypass_policy]] 정합)
- 옛 5역할(`branch_manager`/`manager`/`member`/`staff`/무접두어) 잔존 row 신규 추가 X
- `menu_settings_by_role.role` CHECK 제약 우회 X
- Phase A `app_settings` 패턴과 혼동 X (별 레이어)
- "완료" 단정 X — 팀장님 라이브 검증 받기 전까지 "박힘 보고만"

---

# § 4. 다음 단계 연결

D 트랙(본 spec MD 파일 박음) 완결 후:
→ A 트랙 진입 (Step E-2~E-5 본진, ~4h)
→ 라이브 검증 후 Phase E 완결
→ `docs/sessions/_INDEX.md` Phase E 본진 박힘 표기 갱신 (/session-end 자동 갱신 위탁)

---

# § 5. 참고

- Phase A 박힘 본진: `docs/sessions/2026-05-12_1602.md` (~20 commit 본질)
- 9역할 체계: `docs/role_system.md` + CLAUDE.md § role 체계
- 마이그레이션 SQL 본문: `docs/migrations/2026-05-11_phase_e_menu_settings_by_role.sql`
- 디자인 정체성: admin_v2 = `--admin-*` 토큰 prefix (5종 톤 영구 토글)
- 메모리 정합 키:
  - [[project_role_bypass_policy]] — admin 화면설정 무시 정책
  - [[feedback_fouc_visibility_pattern]] — FOUC 가드 visibility 패턴
  - [[feedback_ui_operations_tool_tone]] — 빠릿한 운영툴 톤 (transition 최소)
