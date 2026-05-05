# 세션 인덱스 — 현재 큰 그림 한눈에

> **마지막 갱신:** 2026-05-05 후속 — **무료 회원 저장 공간 정책 검증 별 트랙 종료** (`docs/decisions/2026-05-05_free-tier-storage-validation.md` 신설, 정책 골격 ✅ + 후속 4건 ⚠️ 보류) + 게시판 이미지 원클릭 복사 백로그 신설 (`docs/product/backlog/2026-05-05_image-copy-feature.md`) + 미해결 #27 + 결정 대기 #10 등재. 메인 트랙 복귀. (직전 갱신 = 트랙 #A PITR 결제 직전 5/5 PASS / 결제 완료 후 사후 검증 의뢰서 발행 대기)
> **자동 갱신 도구:** `/session-end` 슬래시 커맨드 (5단계에서 본 파일 함께 갱신·커밋)
> **목적:** Claude Code가 작업 요청 진입 시 가장 먼저 읽고 큰 그림 정합성 검증.

---

## 🎯 현재 메인 트랙 — admin_v2.html Phase D 진입 대기 (2026-05-01 Phase C 확정)

`pages/admin_v2.html` 풀 스케일 관리자 콘솔. 시안 `claude_code/design_test/admin/v1-full.html` (1026줄, 4/25) 기반. **5종 톤 운영 확정** (light + warm + slate + black + navy). 외부 미팅·원수사 입점 영업·투자/제휴 시 결정적 무기.

- **통합 방식:** (a)+(c) — admin.html을 admin_v2.html 호출 stub으로 교체, app.js 무변경, app.html 프레임 무변경
- **백업 보존:** `claude_code/_archive/admin_v1_20260430.html` (기존 admin.html 1969줄 / 100KB)
- **5종 톤 확정 (2026-05-01):** light(#FCFCFC, 눈 편의) / warm(#1A130E) / slate(#0F172A) / **black(#0A0A0A, 기본)** / navy(#0B1426). 영구 운영 토글 + localStorage 저장
- **라인 수 추이:** 902 (4/30 골격) → 1,484 (Phase B 마무리) → **2,855 (Phase C 확정)**
- **단계:** Phase A(분석·완료) → B(골격·완료) → **C(7섹션 mock·완료)** → D(실 데이터·진입 대기) → E(정밀화·대기)
- **viewport takeover:** 풀 화면 점유 + 4중 안전장치(🚪 rail + 🚪 헤더 / ESC / hashchange `#admin/*` 외 자동 admExit / MutationObserver)

### admin_v2 진행 현황 (2026-05-01 기준)

| 단계 | 상태 | 근거 커밋 / 비고 |
|---|---|---|
| Phase A 사전 분석 | ✅ 완료 (2026-04-30) | v1-full 1026줄 정독 + 영역 충돌 매핑 + 다크 토큰 설계 + 위험 8건 |
| Phase B 골격 | ✅ 완료 (2026-04-30) | `e8949f2` admin_v2.html 신규(902줄) + admin.html stub + tokens.css admin 토큰 + 4종 톤 토글 + 연결 상태 시각 구분 |
| Phase B-2 가독성 표준화 | ✅ 완료 (2026-05-01) | `fece099` `--admin-text-pending` 신규 토큰 (B영역 pending 메뉴 5종 톤 AA) |
| Phase B 마무리 결함 5건 | ✅ 완료 (2026-05-01) | `99f70e4` light menu-bg #FFFFFF / black setAttribute / `--admin-text-label` 토큰 / 헤더 🚪 admExit / hash 자동 닫기 |
| Phase C 7섹션 mock | ✅ 완료 (2026-05-01) | `5fb83bf` D-1~D-7 풀 채움 (+1,371줄) + status-bg 토큰 4종 5종 톤 정의 |
| Phase C 뱃지 AA 확보 | ✅ 완료 (2026-05-01) | `e2d7a78` `--admin-info-text/success-text/warning-text/danger-text` 4토큰 + 9역할 직급 그룹 재매핑 (admin=danger / 지점장=info / 매니저=success / member·staff=neutral) — 80셀 전부 AA |
| **Phase D 실 데이터** | 🟡 D-pre 진입 (2026-05-01) | 세부 단계 표 아래 참조. D-pre → D-1~D-8 → D-final 순. mock → 실 Supabase 연동 + 9역할 RBAC + RLS 정합 |
| Phase E 정밀화 | 대기 | SQL 콘솔 / Export 게이트 / 활동 로그 / 검색 인덱싱 |

### Phase D 세부 단계 (2026-05-01 D-pre 작업지시서 정의)

| 단계 | 상태 | 산출물 / 비고 |
|---|---|---|
| **D-pre** 사전 분석 | ✅ **완료 (2026-05-01)** | 산출물 3종·1,697줄 / 4개 항목 모두 승인 #1~#4 완료 / 결정 27건 명문화 (1·4·5·6·8 + A·B·C·D·E·F + G-1~G-4 + H-1~H-3) / DB·admin_v2.html·js/db.js 변경 0건 / 산출물: `docs/architecture/db_schema_20260501.md` (561줄, 12 테이블 + 30 RLS + role 분포 raw) / `docs/architecture/role_migration_plan.md` (698줄, 9역할 SQL 초안 + Step C-1.5 함수 정정 + 롤백) / `docs/specs/admin_v2_phase_d_pre.md` (438줄, ROLE_LABEL 9개 + fetch 패턴 + D-1 시범 코드) |
| **D-pre.5** users 신규 컬럼 (status / last_seen_at) | ✅ **완료 (2026-05-02)** | D-1 진입 전 분리 마이그레이션. Code 의견 전면 채택 (status 3종 active/suspended/pending + text + CHECK + NOT NULL DEFAULT 'active' / last_seen_at timestamptz NULL) / Step A 사전 캡처 5건 → Step B ALTER 2건 분할 실행 → Step C 사후 검증 4건 → Step D 라이브 검증 4건 모두 통과 (회귀 0). 발견 사항 1건: `users_role_check` 5역할 잔존 → **D-pre.6 트랙 이관**. 산출물: `docs/specs/d-pre5-spec-analysis.md` (커밋 `2be0dca`) + `docs/architecture/db_pre_dpre5_capture.md` (커밋 `c6373a5`/`8ad91ce` 누적) + `docs/specs/role-definition-audit-2026-05-02.md` (커밋 `1365c55`) |
| **D-pre.6** users_role_check 9역할 정합 + activity_logs RLS 2건 + board.html 라인 2213 | ✅ **완료 (2026-05-02)** | D-pre.5 Step C 발견(users_role_check 5역할 잔존) + role 감사(`role-definition-audit-2026-05-02.md` 커밋 `1365c55`) board.html 라인 2213 신규 발견 + Step A 추가 발견(activity_logs RLS 2건 — **어제 5/1 D-pre Step C-4 분할 재실행 "완주" 표시 vs 실제 미정착 사고 재발견**) (A) 범위 확장 처리. **5단계 17건 전건 통과**: Step A 사전 검증 5건 → B DB ALTER 4건 분할 (DROP CHECK + ADD CHECK 9키 + activity_logs 정책 2건 9역할 재작성) → C board.html 라인 2213 Code Edit (5키 9역할, 줄바꿈 4줄) → D 사후 검증 5건(D-3-A RLS 전수 5역할 잔존 0건 회귀 검증 핵심) → E 라이브 검증 5건 (E-5 admin이 보험사 게시판 작성→삭제 회귀 검증). 정의 raw 검증 표준 채택 (어제 사고 회피). 산출물: `docs/architecture/db_pre_dpre6_capture.md` (커밋 `54314c0`/`4fcaf93` 누적) / `pages/board.html` 라인 2213 정정 (커밋 `4fcaf93`). 잔존 부채 별 트랙: pricing.html 자체 ROLE_LABEL · app.html B-4 3곳 (admin_v2 Phase D 후). **D-pre + D-pre.5 + D-pre.6 모두 종료 → D-1 작업지시서 발행 가능** |
| **D-pre.7** Phase D 8테이블 admin SELECT 정책 점검 → users + library SELECT 2건 + admin_update_all_users 후속 정정 (1차 EXISTS 사고 + 2차 SECURITY DEFINER 재진입 + § 9 후속 정정) | ✅ **완료 (2026-05-02)** | D-1 Step 6 R6 검증 SQL로 발견된 admin SELECT 정책 부재 청산. **A 본문 정밀 검토로 6→2 정정**. **🚨 1차 EXISTS 자기 참조 패턴 → PostgreSQL 무한 재귀(42P17) 발생** → 비상 롤백 → **2차 SECURITY DEFINER 함수 패턴 재진입** (`is_admin()` STABLE) + 새 정책 2건 → 9건 전건 통과. **🚨 최종 회귀 점검 5건 중 점검 3에서 `admin_update_all_users` UPDATE 정책 EXISTS 자기 참조 잔존 사후 발견** → 옵션 A 채택(SECURITY DEFINER 패턴 교체) → § 9 후속 정정 7건 전건 통과 + users 자기 참조 영구 청산. **누적 검증 16건 (2차 9 + § 9 후속 7)**. 영구 학습 6건: (1) RLS USING/WITH CHECK 동일 테이블 SELECT 서브쿼리 절대 금지 (2) admin/role 검증은 SECURITY DEFINER 함수 표준 (3) DB 메타 통과 ≠ 라이브 안전 (4) `admin_update_all_users` 작동해도 같은 패턴 SELECT 추가 시 chain 형성 (5) Code "재귀 안전 ✅" 단정 결론 금지 (6) **같은 테이블 다른 cmd(UPDATE/INSERT/DELETE) 정책에도 동일 패턴 잔존 가능 — 사전 검증 단계 전수 sweep 필수** (점검 3 사후 발견 학습). 산출물: `docs/architecture/db_pre_dpre7_capture.md` (515줄+, 1차 사고 + 2차 재진입 + § 9 후속 정정). 잔존 부채: posts is_hidden + news 후순위 + RLS 자기 참조 회피 표준 메모리 등록. **D-pre 시리즈 모두 종료 → D-1 본 진입 100% 정합 보장** |
| **D-pre.8** R6 sweep 후속 5항목 일괄 청산 (B + ② + ⑤ + ⑤-2 + ⑦) | ✅ **완료 (2026-05-03)** | R6에서 발견된 추가 정합 부채 일괄 청산. (B) posts/scripts admin 인라인 EXISTS 5건 → `is_admin()` 통일 / (②) comments + posts(together) anon 2건 → `{authenticated}` 전용 / (⑤) script_usage_logs 정책명 구버전 네이밍 정합화 / (⑤-2) script_usage_logs 사용자 자기 row SELECT 신설 (quick.html 라인 336 일반 사용자 6역할 작동 보장) / (⑦) news_admin_all 인라인 EXISTS → `is_admin()`. **트랜잭션 1건 = DROP 9 + CREATE 10 + 사후 검증 SELECT 18행** 모두 정합 → COMMIT 확정. 자기참조/인라인 admin EXISTS 잔존 0건. 영구 학습 3건 추가 (D-pre.8 § 8). 산출물: `docs/architecture/db_pre_dpre8_capture.md`. **별 트랙 α/β + D-pre.8 모두 종료 → D-1 진입 즉시 가능** |
| D-1 users | 🟢 **즉시 진입 가능 — 작업지시서·결정 8건 확정, D-pre 시리즈 + α + β 전건 종료 (2026-05-03)** | admin_v2 D-1 mock 실 데이터 연결. 사전 정렬 결정 3건 + 결정 8건 확정 → D-pre.7 + D-pre.8 + 별 트랙 α + β 모두 종료 → **다음 세션 Step 1 즉시 진입 (`js/admin_v2.js` 신설)** |
| D-2 content | ✅ **완전 종료 (2026-05-04, 24/25 PASS)** | content 섹션 실 데이터 연결 (`0ca8e17` `7eff644`) + 별 트랙 #3 `get_stage_distribution()` RPC 신설 (`788b617`, SECURITY DEFINER + is_admin() 가드 + anon 명시 REVOKE). P3 라운드트립 <200ms 미달 (min 208ms / avg ~440ms — PostgREST overhead 본질) → 별 트랙 분리 (`admin_v2_p3_postgrest_analysis.md` Phase E). P4 PASS (<1초)로 사용자 영향 0 |
| D-3 board | ✅ **완전 종료 (2026-05-04, 25/25 PASS)** | board 섹션 실 데이터 연결 (`f5c6c5e` js +278 / html -67) + J-2 (b) post_reports v2.0 대기 + J-1 (a) 모더레이션 3종 (숨김/삭제/정지) + J-5 (a) 클라 GROUP BY. P1·P2 warm 250~544ms (PostgREST overhead 본질, J-5 (b) RPC 격상 불필요 청산). 의뢰서: `admin_v2_d3_live_regression_2026-05-04.md` |
| D-4 notice | ✅ **완전 종료 (2026-05-04, 20/20 PASS)** | K-1 (c) v2.0 대기 + mock 보존 채택 (D-3 J-2 (b) 패턴 정합) — admin_v2.html mock 4카드 + 5행 작성이력 → JS NOTICE_*_MOCK 이관 (`27f0688` js +131 / html -103). 토글/액션 id null 토스트 즉시 표기. P1·P2·P3 모두 <10ms (DB 호출 0건). 부수: app_settings RLS `admin write` 정책 인라인 EXISTS → `is_admin()` 청산 (D-pre.8 sweep 누락 보강). 의뢰서: `admin_v2_d4_live_regression_2026-05-04.md` |
| D-5 analytics | ✅ **완전 종료 (2026-05-05, 29/30 PASS — L7 UTC 조건부 포함 30/30)** | RPC 4종 신설 (`b6912f8` get_dau/wau/mau/feature_usage/retention_d30) + 코드 (`33df2f7` js +271 / html -61) + B-1 `--admin-chart-grid` 토큰 5종 톤 (light `rgba(0,0,0,0.08)` / dark `rgba(255,255,255,0.10)`). KPI 4 (라이브 2/2/2/—%) + DAU 19일 + 6메뉴 (script 580 + 5종 0). P1 521ms / P2~P3 ~210ms / P4 229ms / P5 196ms / P6 warm 475ms (모두 임계 통과, RPC 격상 불필요). 의뢰서: `admin_v2_d5_live_regression_2026-05-05.md` |
| D-6 logs | ✅ **완전 종료 (2026-05-05, 20/20 PASS)** | activity_logs 정합 (`33b3e24` js +255 / html -102) + M-2 (c) SYSTEM 2행 mock 합치기 + M-7 (c) result 컬럼 부재 → 모든 행 "성공" 통일 + M-8 (b) event_type 라이브 2종 (login/script_view) + admin_read_all_logs `is_admin()` 청산 (D-pre.8 sweep 누락 보강). P1 504ms / P2 cold 1293ms (PostgREST overhead 본질, RPC 격상 불필요 청산 — D-3 J-5 (b) 패턴 정합). 의뢰서: `admin_v2_d6_live_regression_2026-05-05.md` |
| D-7 billing | 대기 | payments + subscriptions + 4플랜 분포 |
| D-8 dashboard 종합 | 대기 | KPI 4 + timeline + 최근 가입자 + 시스템 상태 + Top 스크립트 모두 실 연결 + **별 트랙 B-2 dashboard 기본 뱃지 토큰 마이그레이션 묶음** |
| **D-9 ⚙️ 화면설정 (5/4 신규)** | 🟢 **Step 1.6 청산 COMMIT + Step 2~4 묶음 완료 (2026-05-05 09:30 후속, 1107줄)** — Step 5 라이브 회귀 5/7 슬롯 대기 | **옛 admin v1 화면설정 탭(`_archive/admin_v1_20260430.html` 라인 1290~1942 ~650줄) 포팅 완료** — 4섹션(메뉴 ON/OFF + PRO 게이트 + 게시판 탭 + 배너 이미지) + Q-5 (a) 5종 톤 토큰 25셀. Step 1 SQL 6개 capture (`db_d9_step1_capture.md` 192→327줄) + Step 1.6 옵션 B 청산 (admin 3정책 is_admin() 가드, 범용 정책 별 트랙 #25) + Step 2~4 묶음 (`tokens.css +15` / `admin_v2.html +439` / `admin_v2.js +653`, 13함수 — admStorageUpload + admLoadSettings + 4 Sync + 4 Save + 3 배너 헬퍼). Q-9 (a) page_banner group_name 1라인 변경 / Q-10 (a) → 옵션 B (영향 범위 발견 분기) / Q-7 board.html read 별 트랙 / Q-8 admin 본인 무시. Step 5 라이브 회귀 의뢰서는 5/7 슬롯 직전 발행 권장 |
| **D-final** 보안 검증 | 대기 | 9역할 RLS 정합 + admin 무접두어 vs ga_*/insurer_* + admin 진입 게이트 + 비-admin 진입 차단 검증 |

### 8섹션 ↔ 데이터 소스 매핑 (2026-05-01 Phase C 확정 기준)

| # | 섹션 | 라우팅 키 | 상태 | Phase D 순서 | Phase C mock 콘텐츠 |
|:---:|---|---|---|:---:|---|
| 1 | 대시보드 | dashboard | 🟢 Live (Phase B mock) | 8 (집계 종합) | KPI 4카드 / 차트 SVG / timeline 6건 / 최근 가입자 5행 / 하단 2-col |
| 2 | 사용자 관리 | users | 🟢 Live (Phase C mock) | 1 | KPI 3카드 + 9역할 칩 10개 + 사용자 테이블 10행 (9역할 모두 1행+) |
| 3 | 콘텐츠 관리 | content | 🟢 Live (Phase C mock) | 2 | KPI 3카드 + stage 10단계 도넛 SVG + 콘텐츠 테이블 8행 |
| 4 | 게시판 관리 | board | 🟢 Live (Phase C mock) | 3 | KPI 3카드 + 게시판별 활동 라인차트(3계열) + 신고 5행 (보험사 게시판 v2.0 대기) |
| 5 | 통계·분석 | analytics | 🟢 Live (Phase C mock) | 5 | KPI 4카드 + DAU 90일 라인 + 6메뉴 막대 |
| 6 | 공지·배너 | notice | 🟢 Live (Phase C mock) | 4 | 활성 카드 4개(toggle) + 작성 이력 5행 |
| 7 | 로그 | logs | 🟢 Live (Phase C mock) | 6 | 검색·필터바(날짜·사용자·액션·결과) + 로그 12행 |
| 8 | 결제·플랜 | billing | 🟢 Live (Phase C mock) | 7 | KPI 3카드 + 4플랜 도넛(무료/PRO 9,900/CRM 19,900/원수사 1,000,000) + 결제 8행 |

### admin_v2 신규 토큰 12종 (Phase B-2 → Phase C 확정 누적)

| 분류 | 토큰 | 5종 톤 정의 위치 | 도입 커밋 |
|---|---|---|---|
| 텍스트 | `--admin-text-pending` | tokens.css :root + light / admin_v2.html warm·slate·navy | `fece099` |
| 텍스트 | `--admin-text-label` | 동일 5종 | `99f70e4` |
| 배경 | `--admin-info-bg` / `--admin-success-bg` / `--admin-warning-bg` / `--admin-danger-bg` | 동일 5종 (light hex / 다크 rgba 18~22%) | `5fb83bf` |
| 텍스트 | `--admin-info-text` / `--admin-success-text` / `--admin-warning-text` / `--admin-danger-text` | 동일 5종 (light Tailwind 700~800 / 다크 Tailwind 300) | `e2d7a78` |
| menu-bg | `--admin-menu-bg` (light 명시 #FFFFFF — :root lazy eval 안전망) | tokens.css light | `99f70e4` |

### data-status 시각 구분 규칙 (2026-05-01 명문화)

- **rail 7섹션**: `data-status="pending"` 그대로 + opacity 0.55 (실 기능 미구현 표시)
- **메뉴 pane 항목**: `.pending` 클래스 + `.pending-mark` ("Phase D-X" 또는 "Phase v2.0") 그대로
- **섹션 타이틀 우측**: `[Phase C mock]` 라벨 (Phase C에서 신규 부착, accent 색)
- Phase D 진입 시: 섹션별 실 데이터 연결 후 위 마커 단계적 제거

---

## 🎯 보조 트랙 — design_test 시안 라이브 승격 (5/9 + 진행 중)

`claude_code/design_test/<page>/v1-full.html` 시안을 라이브 페이지(`pages/<page>.html` / `app.html` / `css/tokens.css`)에 승격하는 트랙. 메인 트랙 격상 후 **보조 트랙으로 강등** (2026-04-30).

### 승격 진행 현황 (2026-04-30 기준)

| 영역 | 상태 | 근거 커밋 |
|---|---|---|
| `css/tokens.css` (9 시안 :root 통합 + 공통 간격 토큰 5종 4/29 + **admin 다크 토큰 4/30 신설**) | ✅ 완료 | 통합: `71f08b0` (4/27) / 간격 토큰 5종: `2cd372e` (4/29 저녁) / **admin 다크 토큰 신설: Phase B 본 세션** |
| `app.html` (shell v1) | ✅ 완료 + 4/28 A1 라이트 톤 + 4/29 푸터 트랙 (4컬럼 → 카피라이트 단일 → 한 줄 미니 → 셸 최하단 정정) | shell: `5592749` (4/27) → 헤더: `fd8b264` `1ab35c4` (4/28) → 푸터: `54cd148` `fa835d2` `ae669d0` `79c0052` (4/29) |
| `pages/board.html` | ✅ 시안 통째 적용 + 공통 간격 토큰 적용 + `.hub-notice` 톤 정정 | 통째: `ebb9b3b` (4/26) / 토큰: `e5b5afe` (4/29 저녁) |
| `index.html` | ✅ 시안 통째 승격 완료 + 헤더 라이트 톤 + 푸터 4컬럼 + 가입 폼 보강 + 카피라이트 onesecond 단일 | 승격: `83665c4` / 헤더: `001af79` / 푸터: `c2186a1` / 카드: `3342e9d` / 안내박스: `69f2678` / 카피라이트: `216ce9f` |
| `pages/home.html` | 🟡 **사실상 흡수 완료** — 라이브 1116줄 vs 시안 1202줄 (-86). 잔여 = C-3 hero 서브 카피 1문장 + C-4 중앙 도넛 SVG `<defs>` 그라데이션 (둘 다 미세 조정). 라이브 검수만 미완 (별 카운터). | C-1: `b854878` (4/28) / C-2 줄무늬 디바이더: `869510d` `c71db6d` (4/29 오후) / hexagon 시계 흰 원형 카드: `4071194` (4/29 오후). C-3 카피 / C-4 도넛 SVG defs / C-5 C영역(별 트랙) 대기 |
| `pages/admin.html` | 🛑 **stub 90줄 교체 완료 (4/30 admin_v2 트랙 격상)** — 기존 1969줄은 `_archive/admin_v1_20260430.html` 보존 / admin_v2.html이 메인 트랙으로 진행 (Phase C 확정 5/1) | stub: `e8949f2` / 백업: `_archive/admin_v1_20260430.html` |
| `pages/myspace.html` | ✅ 부분 흡수 (A) Phase 1 완주 — 4/29 저녁 7커밋, 라이브 검수 미완 | 갭 분석 v2: `978904c` / pg-page-header + 카드 토큰: `656aa99` / pg-outer board 정합: `9be9d3c` / 카드 그리드 + 공통 간격 토큰: `2cd372e` / scripts fetch 400 회귀: `efeb1ad` / 4건 통합 정리: `6ede634` |
| `pages/scripts.html` | ✅ v2-full 통째 승격 완료 + 폰트 위계 + C영역 ON (4/29 오후, 라이브 검수 미완) | D 영역: `6882753` / 폰트 위계: `be40cc6` / C영역 ON: `c96d833` |
| `pages/news.html` | 🛑 **트랙 폐기·후순위** (2026-04-30 admin_v2 작업지시서 §4-2) | 헤더·푸터 board 통일만 진행: `ee64d9a` (4/30) / Phase A 분석 보존: `claude_code/_archive/news_migration_phaseA_20260430.md` |
| `pages/quick.html` | 🟢 **흡수 완료** — 라이브 396줄 ≥ 시안 302줄 (라이브가 시안 +94줄로 더 큼, 시안은 컨셉 무드보드). myspace 정합 5건 + 헤더 brown 통일 추가. 라이브 검수만 미완 (별 카운터). | 토큰: `e5b5afe` (4/29) / myspace 정합 5건: `3846dc2` (4/30) / 헤더 brown + 탭바 폭: `68b2cba` (4/30) |
| `pages/together.html` | 🟢 **흡수 완료** — 라이브 1088줄 ≥ 시안 373줄 (라이브가 시안의 약 3배, 시안은 컨셉 무드보드). MY SPACE 룩 통일 + 카드 그리드 반응형 추가. 라이브 검수만 미완 (별 카운터). | 토큰: `e5b5afe` (4/29) / 룩 통일: `86c9807` (4/30) |

### 다음 후보 (메인 트랙 격상 후 우선순위 변경 — 2026-04-30)

1. 🔴 **admin_v2.html 풀 스케일 (메인 트랙)** — 사업 전략 핵심 축
2. ✅ `index.html` (시안 통째 승격 완료)
3. 🟡 `pages/home.html` (사실상 흡수 완료 — 잔여 = C-3 카피 1문장 + C-4 SVG `<defs>`)
4. ✅ `pages/scripts.html` (v2-full 통째 승격 완료, 라이브 검수 대기)
5. ✅ `pages/board.html`
6. ✅ `pages/myspace.html` (부분 흡수 (A) Phase 1 완주, 라이브 검수 대기)
7. 🛑 ~~`pages/news.html`~~ → **후순위 폐기** (보험뉴스 엔진 가동 시점에 함께 처리)
8. 🟢 `pages/quick.html` (흡수 완료 — 라이브 396줄 ≥ 시안 302줄)
9. 🟢 `pages/together.html` (흡수 완료 — 라이브 1088줄 ≥ 시안 373줄)
10. 🛑 ~~`pages/admin.html`~~ → **admin_v2 메인 트랙으로 격상·이전**

### index.html 승격 사전 결정 6건 (2026-04-28 확정 — 참고용 보존)

| # | 항목 | 결정 |
|:---:|---|---|
| 1 | 적용 방식 | (A) 시안 통째 승격 (board 패턴) |
| 2 | `inaction-section` 카피 | (b) 폐기 |
| 3 | `vs-section` BEFORE/AFTER | (a) 폐기 |
| 4 | `#togetherIntroOverlay` | (a) 보존 |
| 5 | 가입 폼 패러다임 | (a) 시안 인라인 채택 (모달 제거) |
| 6 | privacy/terms 외부 페이지 전환 | OK — 시안 폴더의 `privacy.html` / `terms.html`을 라이브 루트로 복사 |

근거 보고서: `docs/sessions/work_index_gap_analysis_2026-04-28.md` (커밋 `902dca0`)

---

## 🚧 미해결 이슈 (인계)

1. **admin standalone hex 8건 토큰화 (4/28 머지 완료)** — admin/v1-full.html 시안이 통째 교체 디자인이라 시안 승격 시 .adm-mini-side 등 토큰화한 클래스가 모두 사라짐. **admin_v2 트랙 격상으로 사실상 무효화**(stub 교체로 이전 admin.html 콘텐츠 _archive 이동). main 머지된 상태(`a0bdfbf`)는 git 히스토리에만 잔존.
2. **B 사이드바 "함께해요" 활성 오작동** — home 진입 시 잘못된 메뉴 활성. home.html과 무관한 app.html 책임 영역. home 작업 트랙과 분리 (별 트랙 진단 대기).
3. **🟡 라이브 검수 부채 (별 카운터, 4/29 + 4/30 17커밋)** — **코드 자체는 완료**, 팀장님 Chrome 1회 PASS만 남은 상태. home(줄무늬 + hexagon) + scripts(D영역 v2 + 폰트 위계 + C영역) + myspace(부분 흡수 7커밋) + board/quick/together(공통 간격 토큰 1커밋) + 4/30 quick·together·news 4커밋. admin_v2 메인 트랙과 별 트랙 병렬 가능. **"미완료" 아님 — 화면 멀쩡히 작동, 검수 액션만 미수행** (2026-05-03 라벨 정합화).
4. **logo03.jpg 라이트 헤더 사각형 경계** — 이미지 배경 옅은 그레이/아이보리(JPG, 투명 X). index/privacy/terms 헤더에서 경계 보이면 logo05.png 투명본 또는 이미지 편집 별 트랙.
5. **app 푸터 셸 최하단 정정 라이브 검수 미완** (`79c0052`, 4/29 오전).
6. **terms/privacy 닫기 버튼 라이브 검수 미완** (`710d452`, 4/29 오전).
7. **scripts 동적 STEP 표시 별 트랙** — C영역 진행 상태 박스 동적 갱신 미구현.
8. **scripts v2 sticky 세로 탭바 미이식**.
9. **scripts top_category 컬럼 활용 미정**.
10. **(보류) news.html 표준 `.pg-outer` 구조 마이그레이션** — admin_v2 작업지시서 §4-2로 후순위 폐기. v1.5~v2.0 보험뉴스 엔진 가동 시점에 함께 처리. Phase A 분석 보존: `claude_code/_archive/news_migration_phaseA_20260430.md`.
11. **(4/29 저녁) 안내박스 글로벌 클래스 `.pg-guide` 정착** — myspace `.mys-guide` + board `.hub-notice` 통합.
12. **(4/29 저녁) `.mys-card-stage` 클래스 JS 인라인 정리**.
13. **(4/29 저녁) myspace 검색 모드 예시 카드 인터랙션 미정의**.
14. **(4/29 저녁) myspace view-write 폼 stage select 부재**.
15. **(4/29 저녁) `_SAMPLE_LIBRARY` url/content 빈값**.
16. ~~**(신규 4/30) admin_v2 다크 톤 4종 후보 결정**~~ → **✅ 해소 (2026-05-01)**: 4종 → **5종 운영 확정** (light 추가 — 눈 편의 목적). 영구 토글 5종 모두 토큰 분기, 기본값 black. 토글·토큰 모두 보존.
17. ~~**(신규 4/30) 보험뉴스 메뉴 숨김**~~ → **✅ 해소** (이미 화면설정 admin.html에서 숨김 처리됨, 별도 작업 불필요).
18. ~~**(신규 4/30) admin_v2 라이브 검수 통합 시점**~~ → **✅ 해소 (2026-05-01)**: Phase B 라이브 검수 + 결함 5건 일괄 수정 + Phase C 진입·확정 라이브 검수 모두 완료. 4중 안전장치(🚪 rail + 🚪 헤더 / ESC / hashchange / MutationObserver) + 5종 톤 + 8섹션 라우팅 작동 확인.
19. **(신규 5/1) admin_v2 Phase D 진입 — 9역할 RBAC 권한 검증 로직** — Phase D는 mock → 실 Supabase 연결. 9역할 체계 RLS 정책 검증 + admin 본 계정 정합성 확인 + D-1 사용자 테이블 우선. 다음 메인 트랙.
20. **(신규 5/5) team4_vault Phase 1 진입 시점 충돌 가능성** — _INDEX.md "🎨 3개 영역 디자인 정체성" = "admin 완료 후 별 트랙 (Phase D 이후)" / `docs/specs/2026-05-05_team4_vault_phase1.md` = "5/12 이후 진입" → 5/12 시점 admin Phase D 잔여 ~8.3세션 진행 중 가능성. 5/12 진입 직전 트랙 동시 진행 여부 결정 필요 (지금 인지만, 결정 불요).
21. **(신규 5/5) 메모리 #11 자료 자산화 본 트랙 격상이 _INDEX.md 미반영** — 두 5/5 작업지시서가 메모리 #11에 의존하나 _INDEX.md에는 "⏸️ 자료 자산화 트랙 (저작권 보류)"로 표기. 5/4 격상 결정 시점 명문화 필요 (Phase D 후 별 트랙 진행 시점에 _INDEX.md 갱신).
22. **(신규 5/5) v1.1 운영 안전장치 3종 (PITR / Sentry / Playwright)** — 결정 + 결재 (a/a/a) 완료. **트랙 #A PITR 결제 직전 Chrome 5/5 PASS (2026-05-05 후속)** — Step A 사전 검증 + B-prep 결제 화면 도달 raw 캡처. Capture: `docs/architecture/db_pitr_activation_capture.md`. 진행 순서 정정: **Compute Small 먼저** (PITR 전제 조건 — 화면 raw 안내 정합) → PITR 7 days 나중. 비용 raw 정정: 신규 청구 ~$130.15/월 (Pro $25 + PITR $100 + Compute 차액 +$5.15). PITR `"There are no immediate charges, prorated to the hour"` — 즉시 결제 X. ⏸ 결제 진행 + 사후 검증 의뢰서 별도 발행 대기. #B Sentry 5/11 + #C Playwright 5/12~13 + 종합 회귀 5/13 + 버퍼 5/14 + 오픈 5/15.
23. **(신규 5/5 후속) 알림 시스템 전면 재설계 v1.1~v3.0 통찰 문서 별 트랙 등록** — `docs/sessions/2026-05-05_dawn_notification_system.md` (443줄, Claude AI 새벽 통찰). 본문 §0 자체 검증으로 큰 그림 정합 OK (v1.1 5/15 4팀 오픈 일정 영향 0). v1.1 5개 항목(C영역 5배너 + 호버 프리뷰 + MY SPACE 알림 설정 + DND + A1 🔔)이 5/15 4팀 오픈 시점이라 admin Phase D 잔여 ~5.9세션과 **일정 충돌 가능성**. 7개 분할 spec(v1.1 C영역·v1.1 호버·v1.1 설정·v1.2 PC 토스트·v1.3 동기화·v1.5 PWA 푸시·v2.0 상담 모드) 작성 시점 = admin Phase D 마무리 후(5/11~12경) 권장 — 본 통찰 문서 §14 정직성 노트(코드 베이스 재검증 필요) 정합. 위치: docs/sessions 유지 (본문 §0/§13 명시 — 통찰 문서, spec 분할분만 docs/specs로 이동).
24. **(신규 5/5 후속 09:30) menu_home = false 라이브 의도 vs 잔재 확인 필요** — D-9 Step 1 capture § 1 ② 후속 SQL 회신에서 발견. 미해결 #17은 보험뉴스 메뉴 숨김만 다뤘으나, 홈 메뉴(`menu_home = false`)도 라이브 운영 시점에 숨김 상태. A1 영역에서 home 진입 다른 경로 활용 의도 vs 옛 admin 운영 잔재인지 확인 필요. **D-9 진행 차단 아님** — admin이 D-9 화면설정 완성 후 토글로 즉시 ON 가능. D-9 라이브 회귀 의뢰서 §S 시리즈에서 검증 위임 또는 별도 결재.
25. **(신규 5/5 후속 09:30) Storage RLS 전수 sweep 별 트랙 (작업지시서 신설)** — D-9 Step 1.6 옵션 B 채택 후 잔여 부채. Step A 회신으로 영향 범위 발견: 범용 정책 `Allow authenticated uploads 1apfxtf_0` (with_check=true)이 library_files / board_attachments의 **유일 INSERT 정책**. 폐기 시 두 버킷 업로드 차단 → 정책 신설 필수. 작업지시서: `docs/specs/storage_rls_full_sweep_workorder.md` (4 Step 분할: 옛 v1 코드 raw 검토 → 정책 결재 R-1~R-6 → 트랜잭션 → 라이브 회귀). 추정 진행량 ~0.6세션. **5/11 슬롯 진입 권장** (1일 shift 적용). 영구 학습 등록 후보 3건.
26. **(신규 5/5 10:30 후속) 카톡 → 원세컨드 마이그레이션 트랙 보류** — 5/5 D-9 Step 2~4 종료 직후 팀장님 보류 결정. "다시 방향 잡고 의논 중" 상태. 메모리 [kakao_migration_strategy.md]에 보류 명문화 (4/26 작성 전략 보존, 의논 결과 후 재가동 가능). **영향:** 5/6 슬롯 = 카톡 본 진입에서 D-9 Step 5 라이브 회귀로 전환 → **전체 일정 1일 shift, 5/14 = 1일 버퍼 확보** (4팀 오픈 5/15 직전 안전판). 메모리 §본질("4팀 옮겨오게 만들려면 평소 쓰던 자료가 게시판에 있어야 한다") 자체는 여전히 유효 가설 — 카톡 자료 없이 4팀 오픈 시 사용자 카톡 회귀 위험은 의논 시점에 별도 평가 필요.
27. **(신규 5/5 후속) 무료 회원 저장 공간 정책 검증 — 별 트랙 종료** — Claude AI 정책 초안(프로필 1장/200KB·게시판 글당 3장/장당 500KB·MY SPACE 20MB·1인 30MB·채팅 템플릿/PDF ❌) Code 기술 타당성 검증 5/5 완료. **결과:** 정책 골격 ✅ 그대로 진행 가능 + 4건 ⚠️ 보강 필요 (Cloudflare CDN 도입 시점 / 30MB 한도 강제 3중 방어 구조 / 다운그레이드 grace period / 5,000명 진입 전 한도 재검토). 결정 문서: `docs/decisions/2026-05-05_free-tier-storage-validation.md`. 메모리·`docs/product/content-policy.md` 정식 반영은 4건 결정 완료 후 별도 진행 (현재 "검증 완료 / 결정 보류" 상태). 부수: 게시판 이미지 원클릭 복사 백로그 신설(`docs/product/backlog/2026-05-05_image-copy-feature.md`, v1.1→v1.5→v2.0 로드맵, 메모리 모바일 채팅 템플릿 라이브러리 트랙과 통합 검토).

---

## 📋 결정 대기 항목

1. **GPT v1 트랙 폐기 명문화** — 4/28 사용자 발언으로 묵시적 폐기. 4/29 작업 디렉토리 GPT v1 잔재 (a) 폐기 결정 + design_test/README 원칙 #6 사례 추가(`c2e2d86`)로 묵시→명시 한 단계 진행. 명문 결정 문서(`docs/decisions/2026-04-29_gpt_v1_deprecation.md`) 신설 대기.
2. **admin standalone hex 8건 처리** — admin_v2 트랙 격상으로 사실상 무효화. 추가 결정 불필요.
3. **(4/29 저녁) 라이브 검수 통합 시점** — 4/29 + 4/30 17커밋 누적. admin_v2 작업과 별도 트랙 진행 가능.
4. ~~(4/29 저녁) news 작업 진행 순서~~ — **후순위 폐기로 무효화** (4/30 admin_v2 작업지시서 §4-2).
5. ~~**(신규 4/30) admin_v2 다크 톤 4종 비교 결정**~~ → **✅ 해소 (2026-05-01)**: 5종 운영 확정 (light + warm + slate + black + navy). 영구 토글 + localStorage 저장.
6. ~~**(신규 5/5) v1.1 운영 안전장치 3종 결재 3건**~~ → **✅ 해소 (2026-05-05 후속)**: PITR / Sentry / Playwright 모두 (a) 채택. 트랙 #A PITR 5/6 즉시 진입 가능 (Dashboard 결제 동반) / #B Sentry 5/11 / #C Playwright 5/12~13. 결정 문서 § 5 회신 박스 명문화 완료.
7. **(신규 5/5 후속) 알림 시스템 분할 작업지시서 7건 중 우선순위** — v1.1 C영역 / v1.1 호버 / v1.1 설정 / v1.2 PC 토스트 / v1.3 동기화 / v1.5 PWA 푸시 / v2.0 상담 모드. **Code 권장:** v1.1 C영역 → v1.1 호버 → v1.1 설정 순(5/15 4팀 오픈 시점 5개 항목 우선, 5/11~12 admin Phase D 마무리 후 분할 spec 작성).
8. **(신규 5/5 후속) 알림 시스템 v1.1 우선 5개 항목 작업 순서** — C영역 5배너 / 호버 프리뷰 / MY SPACE 알림 설정 / DND / A1 🔔. admin Phase D 잔여 ~5.9세션과 병렬 가능 여부 + 5/15 4팀 오픈 직전 작업 슬롯 분배 결정 필요.
9. **(신규 5/5 후속) 알림 시스템 빠진 후보 [필수] 10건 확정** — 시스템 공지 자리·매니저 공지 범위·푸시·모바일 동기화 DB(`read_status` 테이블)·"모두 확인"/"전체 보기" 동작·미확인 0개 빈 상태·추천 배너 위치 재정의·A1 검색창 영역 침범 금지·6각형 카피 vs 긴급 띠배너 충돌·호버 트리거 시간(0.3 vs 0.5초)·미확인 0개 호버 처리 (본 통찰 문서 §12).
10. **(신규 5/5 후속) 무료 회원 저장 공간 정책 후속 4건 보류** — 정책 검증 (`docs/decisions/2026-05-05_free-tier-storage-validation.md`) 종료 시 명문화. 메모리·`docs/product/content-policy.md` 정식 반영 보류 상태:
    - **#1 Cloudflare CDN 도입 시점** — 트리거 = 1,000명 도달 (Egress 한도 도달 전 골든타임). 사용량 모니터링 표 별 트랙 후 결정
    - **#2 30MB 한도 강제 3중 방어 구조 작업지시서** — 트리거 = 4팀 v1.1 출시(5/15) 이후 무료 회원 정책 정식 적용 시점
    - **#3 다운그레이드 grace period 정책** — 트리거 = 유료 회원 정책 논의 시 함께 결정 (Code 권장: 30일 grace + 정리 유도)
    - **#4 5,000명 진입 전 한도 재검토** — 트리거 = 3,000명 도달 + 4,000명 도달 2단계 모니터링

### 📝 4/28 결정 완료 (참고)
- ✅ design_test 트랙 활성 여부 — 메인 트랙 → 보조 트랙 강등 (4/30)
- ✅ 7페이지 승격 우선순위
- ✅ index.html 승격 사전 결정 6건
- ✅ home.html 부분 흡수 결정 10건

### 📝 4/30 결정 완료 (참고)
- ✅ **admin_v2 풀 스케일 구축 결정** — 사업 전략 핵심 축, 8개 섹션 전부, mock 시연 100%, 점진적 실 데이터
- ✅ **다크 테마 채택** — 사용자 페이지(밝은 톤)와 의도적 차별화
- ✅ **통합 방식 (a)+(c)** — admin.html을 admin_v2.html 호출 stub으로 교체, app.js 무변경
- ✅ **viewport (α) 풀 takeover** — 시연 임팩트 + 차별화 강함
- ✅ **다크 톤 임시 진입 → 라이브 비교 → 결정** — Phase B 진입 차단 없이 디자이너 위임 정합
- ✅ **news.html 후순위 폐기** — 보험뉴스 엔진 가동 시점에 함께 처리
- ✅ **_INDEX.md 즉시 갱신** — 큰 그림 변화는 즉시 반영 (GitHub = 진실 원천 원칙)

### 📝 5/1 결정 완료 (참고)
- ✅ **admin_v2 5종 톤 운영 확정** — light + warm + slate + black + navy. light는 "눈 편의" 목적 추가. 영구 토글 + localStorage 저장. 기본값 black
- ✅ **admin_v2 Phase B 마무리 결함 5건 일괄 처리** (`99f70e4`) — light menu-bg 누락 / black setAttribute 누락 / 그룹 라벨 저대비 / 헤더 admExit 미구현 / hash 자동 닫기 미구현
- ✅ **admin_v2 Phase C 7섹션 mock 풀 채움** (`5fb83bf`) — D-1~D-7 모든 섹션이 dashboard 수준 시연 가능. mock 데이터 한국 이름 10명 풀 + 9역할 + 보험 도메인 + 원화
- ✅ **admin_v2 9역할 직급 그룹 색계열 매핑 확정** (`e2d7a78`) — admin=danger / 지점장 2종=info / 매니저 2종=success / member·staff 4종=neutral·secondary. 소속(GA/원수사) 구분은 텍스트 prefix
- ✅ **admin_v2 모든 뱃지·메뉴 5종 톤 WCAG AA 통과** — 80셀(20셀 토큰 + 45셀 9역할 + 15셀 메뉴) 전부 ≥4.5:1
- ✅ **신규 토큰 12종 5종 톤 정의 완료** — admin-text-pending / text-label / info·success·warning·danger-bg / info·success·warning·danger-text / menu-bg(light)
- ✅ **3개 영역 디자인 정체성 분리 명문화** — 사용자 페이지(밝은 브라운·아이보리) / admin_v2(5종 톤) / 4팀 비밀의 공간(웜 다크 — admin 완료 후 별 트랙)

---

## 🗓️ 최신 세션 요약 (시간 역순)

- `docs/sessions/2026-05-05_1054.md` — 2026-05-05 오전 후속 (D-9 Step 1.6 옵션 B 청산 + Step 2~4 묶음 settings 4섹션 1107줄 신설 + 카톡 마이그레이션 보류 결정 + 일정 1일 shift 5/14 버퍼 확보 — push 7 commit / Q-9·Q-10 일괄 (a) 결재 (`9af3c0b`) + operations 정정 (`c6a38f6`) + Step 1.6 트랜잭션 결과 (`a503680`) + Step 2~4 묶음 (`aadc3e1` 1107줄) + capture § 7 + _INDEX 갱신 (`6d05e4c`) + 카톡 보류 일정 1일 shift (`90c44f7`) / 영구 학습 4건 / 잔여 견적 ~3.8~4.1세션 / 단일 일자 누적 22 commit + rebase 2 (5월 가장 큰 진행량 갱신))
- `docs/sessions/2026-05-05_0813.md` — 2026-05-05 오전 후속 (admin_v2 D-9 진입 + 알림 시스템 통찰 등록 — push 4 commit / D-9 작업지시서 (`6f0e665` 241줄) + Q-1~Q-8 일괄 (a) 승인 + Chrome 위임 의뢰서 (`cc6fdc7` 335줄) + Step 1 capture (`902e24e` 192줄) + 알림 통찰 별 트랙 (`d1e2133` _INDEX 갱신) / 발견 3건 — banner_img↔page_banner group_name 불일치 (Q-9 후보) / menu_home=false 라이브 (미해결 #24 후보) / Storage RLS admin 3종 is_admin() 가드 부재 (Q-10 후보 + Step 1.6 청산 분기) / 영구 학습 3건 / 잔여 견적 ~5.9 → ~6.1~6.3세션 / 단일 일자 누적 15 commit + rebase 2)
- `docs/sessions/2026-05-05_0659.md` — 2026-05-05 새벽 (admin_v2 Phase D-5·D-6 완전 종료 단일 세션 — push 11 commit + rebase 2 / D-6 logs 4건 (`7cda0b8` `33b3e24` `21968ac` `d72320a`) + 정리 (`ee53976` 두 5/5 작업지시서 docs/specs 이동) + 안전장치 결정 (`4cd4603` v1.1 PITR/Sentry/Playwright 일정) + D-5 4건 (`4957e53` `b6912f8` `33df2f7` `14f4aa2`) / 결재 22건 일괄 (M-1~M-9 + L-1~L-10 + 안전장치 3) / D-pre.8 sweep 누락 보강 (admin_read_all_logs 청산) / 영구 학습 6건 / 잔여 견적 ~9.1 → ~5.9세션 / D-9 ⚙️ 화면설정 즉시 진입 가능 + 별 트랙 #A PITR 5/7 진입 가능)
- `fe19b3d` 원격 업로드 (2026-05-05 04:48 KST, 팀장님 GitHub 웹 직접 업로드) — `docs/specs/2026-05-05_index_hero_headline_c_plus.md` (267줄, 별 트랙 — 5/12 이후 적용, 결정 6건 ⏸ 결재 대기) + `docs/specs/2026-05-05_team4_vault_phase1.md` (455줄, 자료 자산화 본 트랙 1차 실행 — 5/12 이후 진입, 결정 8건 + 11개 카테고리 확정 ⏸ 결재 대기) — D-6 종료 후 큰 그림 정합 검토 완료, D-5 진입 차단 0 (두 문서 모두 5/12 이후 적용으로 admin Phase D 진행과 병렬 정합) / 본 commit에서 `docs/sessions/` → `docs/specs/` 이동 정리
- `docs/sessions/2026-05-04_2032.md` — 2026-05-04 저녁 (admin_v2 Phase D-2 24/25 종료 + D-3·D-4 25/25·20/20 PASS — 단일 세션 13 commit / 5/4 누적 22 push: `788b617` RPC #3 청산 + `85ff4d2` 통합본 v1 발행 704줄 + `ace85d0` D-2 종료 + `a3aa439` D-3 작업지시서 + `f5c6c5e` D-3 코드 + `3bc7f84` D-3 의뢰서 + `23e1b2d` 통합본 v1.1 D-9 ⚙️ 화면설정 신규 + `1c55171` D-3 25/25 PASS + `8c79012` D-4 작업지시서 + `16cbdbc` D-4 K-1 재결재 (a)→(c) + `27f0688` D-4 코드 + `e5e64b7` D-4 의뢰서 + `70fb91c` D-4 20/20 PASS / 영구 학습 5건 (RPC PostgREST overhead 본질 / mock+v2.0 대기 패턴 표준화 / 결재 한계 발견 패턴 / D-pre.8 sweep 누락 발견 / 옛 admin v1 화면설정 누락) / 별 트랙 — app_settings RLS 청산 + P3 분석 Phase E 격상 + Q-7 사용자별 impersonation 보류 / 잔여 견적 ~9.1세션 / D-6 logs 즉시 진입 가능)
- `docs/sessions/2026-05-04_1630.md` — 2026-05-04 오후 (admin_v2 Phase D-1·D-2 완전 종료 — D-1 fix `3e08dc8` script src 절대경로화 후 17/17 PASS / D-2 content 실 데이터 연결 `0ca8e17` + D2 fix `7eff644` 후 21/23 PASS (P1·P2 별 트랙 #3 격상) + scripts 보강 Step 2 실명 익명화 5건 청산 `4f6b8c4` (보험업법 위험 0) + 로고 통일 (login A1 logo03.jpg + 원세컨드 / admin rail 최상단 logo05.png) / 5/4 푸시 9건: `3e08dc8` `4f6b8c4` `ad69a5b` `5f1261a` `10ea87f` `0ca8e17` `0d463fc` `1ebf44f` `7eff644` / 영구 학습 4건 (script src 절대경로화 / STAGE_LABELS 분류 차이 / n_tup_upd 진단 / 의뢰서 PASS 가정 단정 위험) / D-3 board 즉시 진입 가능)
- `docs/sessions/2026-05-03_1747.md` — 2026-05-03 오후 (admin_v2 D-1 Step 4·5 완료 — js/admin_v2.js 신설 342줄 + users 섹션 mock 제거 + 동적 슬롯 + .adm-toast 컴포넌트 + race 안전장치 / 5/3 저녁 푸시 3건: `8f1cd6e` _INDEX design_test 트랙 라벨 정합화 + `f65580a` D-1 users 실 데이터 연결 + `22ff008` 라이브 회귀 17항목 의뢰서 / design_test 트랙 사실상 종결 / 영구 학습 1건 메모리 통합 / 외부 인계 노트 1건 발견: `2026-05-03_handoff.md` 자료 자산화 트랙)
- `docs/sessions/2026-05-03_1534.md` — 2026-05-03 오후 (D-1 Step 1 사전 검증 완료 — Phase 1 마이그레이션 불필요 확정 (5역할 잔존 0). Step 2·3·7 스킵, Step 4 즉시 진입 가능 / 5/3 푸시 3건: `c1575de` 모바일 탭바 이모티콘+함께해요 합류 + `991f473` 7페이지 직접 URL → app.html shell redirect + `c0b0e07` news.html DOM 가드 / Chrome 라이브 검수 25 PASS / 산출물 4건: D-1 작업지시서 + DB capture + scripts spec/template)
- `docs/sessions/2026-05-03_*` — 2026-05-03 (재오픈 전 헬스 체크 R1~R6 + 별 트랙 α exception_diseases 검색 차단 UI+DB 이중 잠금 + 별 트랙 β pages/*.html 9페이지 인증 게이트 + D-pre.8 R6 sweep 후속 5항목 일괄 청산 — DROP 9건 + CREATE 10건 트랜잭션 / D-pre 시리즈 모두 종료 → D-1 진입 즉시 가능 / 산출물 3건: `docs/specs/exception_diseases_block_2026-05-03.md` + `docs/specs/pages_auth_gate_2026-05-03.md` + `docs/architecture/db_pre_dpre8_capture.md`)
- `docs/sessions/2026-05-02_2002.md` — 2026-05-02 저녁 (D-9 보류 결정 명문화 + D-pre.7 1차 EXISTS 사고 + 2차 SECURITY DEFINER 재진입 + § 9 admin_update_all_users 후속 정정 — users 자기 참조 영구 청산 + RLS 자기 참조 회피 표준 6건 영구 명문화)
- `docs/sessions/2026-05-02_1557.md` — 2026-05-02 오후 (D-pre.5 + D-pre.6 두 트랙 완수 — 검증 37건 + 산출물 5종 2,427줄)
- `docs/sessions/2026-05-01_2257.md` — 2026-05-01 저녁 (Phase D-pre 마이그레이션 첫 코드 변경 단계 완수 (Step A·B·C·D 전 구간))
- `docs/sessions/2026-05-01_1834.md` — 2026-05-01 저녁 (DB 변경 0건)
- `docs/sessions/2026-05-01_1044.md` — 2026-05-01 오전 (Quick "미러링 전 녹취 스크립트" 카드 1줄 2컬럼 + 오타 4건 통일 — DB-only / quick_contents id=7 row UPDATE 6 instances 치환 / 백업 row + RLS service_role 정책 적용 / 라이브 검수 부채 18건 누적)
- `docs/sessions/2026-05-01_1036.md` — 2026-05-01 오전 (admin_v2.html: 1,484 → 2,855줄 (+1,371))
- `docs/sessions/2026-05-01_<TBD>.md` — 5/1 (admin_v2 Phase B 마무리 + Phase C 진입·확정 단일 세션 / 4커밋 누적: `fece099` B-2 가독성 표준화 + `99f70e4` Phase B 마무리 결함 5건 + `5fb83bf` Phase C 7섹션 mock 풀 채움 + `e2d7a78` status·역할 badge 5종 톤 AA / 라인 수 1,484 → 2,855 (+1,371) / 신규 토큰 12종 / 5종 톤 운영 확정 / 80셀 WCAG AA 통과 / Chrome 라이브 재검수 완료)
- `docs/sessions/2026-04-30_<TBD>.md` — 4/30 (admin_v2 풀 스케일 트랙 진입: Phase A 분석 + Phase B 골격 — admin_v2.html 신규(902줄) + admin.html stub + tokens.css 다크 토큰 + 4종 토글 / 4/30 누적 4커밋 별 트랙 정리: news 헤더·푸터 board 통일 / quick myspace 정합 5건 + 헤더 brown / together MY SPACE 룩 통일)
- `claude_code/_archive/news_migration_phaseA_20260430.md` — 4/30 news 트랙 후순위 폐기 시 Phase A 분석 보존본
- `docs/sessions/2026-04-29_1932.md` — 4/29 저녁 (7커밋 + 5머지 / myspace Phase 1 단일 세션 완주)
- `docs/sessions/work_myspace_gap_analysis_2026-04-30.md` — 4/29 저녁 myspace 갭 분석 v2
- `docs/sessions/2026-04-29_1348.md` — 4/29 오후 (6커밋 + 6머지 / home C-2 줄무늬 + hexagon / scripts v2-full D영역 + 폰트 위계 + C영역 ON)
- `docs/sessions/2026-04-29_0657.md` — 4/29 오전 (푸터 트랙 4커밋 / 카피라이트 동기화 / terms/privacy 닫기 / design_test/README 갱신)
- `docs/sessions/2026-04-28_1929.md` — 4/28 저녁 (대규모 27 커밋: A1 라이트 톤 / sweep 4슬롯 / 컨텍스트 방어 인프라 / index 시안 통째 승격 + fix 다수 / home 갭 분석 v1·v2 + C-1)
- `docs/sessions/work_home_gap_analysis_2026-04-28_v2.md` — 4/28 home 갭 분석 v2
- `docs/sessions/work_home_gap_analysis_2026-04-28.md` — 4/28 home 갭 분석 v1
- `docs/sessions/work_index_header_a1_pattern_2026-04-28.md` — 4/28 index 헤더 A1 패턴 이식 분석
- `docs/sessions/work_index_mobile_review_2026-04-28.md` — 4/28 index 모바일 전면 재검토
- `docs/sessions/work_index_gap_analysis_2026-04-28.md` — 4/28 index.html 승격 진입 전 갭 분석
- `docs/sessions/2026-04-28_0004.md` — 4/28 심야 (home GPT v1 회귀)
- `docs/sessions/2026-04-27_pre_sweep_diagnosis.md` — 4/27 sweep 진입 전 시스템 안정성 진단
- `docs/sessions/2026-04-27_fallback_sweep_scan.md` — 4/27 fallback 부채 전수 스캔
- `docs/sessions/2026-04-27_1905.md` — 4/27 저녁
- `docs/sessions/2026-04-27_fallback_debt_finding.md` — 4/27 옛 브라운 fallback 발견
- `docs/sessions/2026-04-27_gap_analysis.md` — 4/27 9페이지 갭 분석

---

## 📌 폐기 / 보류된 트랙

- **`pages/news.html` 시안 승격 트랙** (4/30 admin_v2 작업지시서 §4-2로 후순위 폐기) — Phase A 분석 보존: `claude_code/_archive/news_migration_phaseA_20260430.md`. 보험뉴스 메뉴 숨김 결정으로 사용자 동선 단절 + 라이브 룩 통일 우선순위 0 + v1.5~v2.0 보험뉴스 엔진 가동 시점에 함께 처리.
- **`pages/admin.html` (1969줄 ver.)** (4/30 admin_v2 트랙 격상으로 stub 교체) — `claude_code/_archive/admin_v1_20260430.html` 보존. admin_v2.html 트랙 진행에 따라 단계적으로 새 콘텐츠로 대체.
- **`claude_code/design_test/gpt_v1/` 트랙** (4/27 도입, 4/28 묵시적 폐기, 4/29 한 단계 진행) — GPT 이미지 생성 PNG 시안 4종(home/board/myspace/scripts). 결정 문서 여전히 대기.
- **구버전 Supabase `qursjteiovcylqiepmlo`** (4/24 사고 후 폐기) — `pdnwgzneooyygfejrvbg`(신버전)이 유일 진실 원천.

---

## 🔄 진행 중·완료된 별건 트랙 (메인 트랙과 분리)

| 트랙 | 상태 | 근거 |
|---|---|---|
| **fallback sweep** (옛 브라운 6값 → 새 토큰 본체) | ✅ 4슬롯 완료 (4/28 누적 346건) | `70fd368` `2b9a4b0` `f2db460` `6587254` |
| **admin standalone hex 8건 토큰화** | 🛑 admin_v2 격상으로 무효화 | `a0bdfbf` (4/28, git 히스토리에만 잔존) |
| **A1 헤더 라이트 톤 + 모바일 반응형** | ✅ 완료 (4/28) | `fd8b264` `1ab35c4` |
| **빠른실행 v2 사양 메모리 등록** | ✅ 등록 완료 (코드 변경 없음) | `project_quick_overlay_v2_spec.md` |
| **app 푸터 트랙 (4컬럼 → 한 줄 미니 → 셸 최하단)** | ✅ 완료 (4/29 오전, 라이브 검수 대기 — 미해결 #5) | `54cd148` `fa835d2` `ae669d0` `79c0052` |
| **카피라이트 사이트 전체 onesecond 단일 표기** | ✅ 완료 (4/29 오전) | `216ce9f` |
| **terms/privacy 돌아가기 → 닫기 버튼** | ✅ 완료 (4/29 오전, 라이브 검수 대기 — 미해결 #6) | `710d452` |
| **design_test/README 갱신 (토큰 확장 절 + Phase 1 표 동기화 + 원칙 #6 사례 5건)** | ✅ 완료 (4/29 오전) | `c2e2d86` |
| **home hero 줄무늬 그라데이션 디바이더** | ✅ 완료 (4/29 오후, 라이브 검수 대기 — 미해결 #3) | `869510d` (5개 신설) `c71db6d` (480px 정정) |
| **home hexagon 시계 흰 원형 카드** | ✅ 완료 (4/29 오후, 라이브 검수 대기 — 미해결 #3) | `4071194` |
| **scripts D영역 v2-full 통째 승격** | ✅ 완료 (4/29 오후, 라이브 검수 대기 — 미해결 #3) | `6882753` |
| **scripts 컬럼 1·4 폰트 위계 회복** | ✅ 완료 (4/29 오후) | `be40cc6` |
| **scripts C영역 표시 ON + 진행 상태 박스** | ✅ 완료 (4/29 오후, 라이브 검수 대기 — 미해결 #3) | `c96d833` |
| **myspace 갭 분석 v2 (3개 탭 전체)** | ✅ 완료 (4/29 저녁) | `978904c` |
| **myspace 부분 흡수 — pg-page-header + 카드 토큰** | ✅ 완료 (4/29 저녁, 라이브 검수 대기 — 미해결 #3) | `656aa99` |
| **myspace `.pg-outer` board 정합 통일** | ✅ 완료 (4/29 저녁) | `9be9d3c` |
| **myspace 카드 그리드 + 그레이 푸터 + 공통 간격 토큰 5종 글로벌 등록** | ✅ 완료 (4/29 저녁, 라이브 검수 대기 — 미해결 #3) | `2cd372e` |
| **myspace scripts fetch 400 회귀 수정 + 예시 카드 4건** | ✅ 완료 (4/29 저녁, 라이브 검수 대기 — 미해결 #3) | `efeb1ad` |
| **myspace 4건 통합 정리** | ✅ 완료 (4/29 저녁, 라이브 검수 대기 — 미해결 #3) | `6ede634` |
| **3페이지 공통 간격 토큰 적용 + board `.hub-notice` 톤 정정** | ✅ 완료 (4/29 저녁, 라이브 검수 대기 — 미해결 #3) | `e5b5afe` |
| **news 헤더·푸터 board 룩 통일** | ✅ 완료 (4/30, 라이브 검수 대기 — 미해결 #3) | `ee64d9a` |
| **quick myspace 정합 5건 (헤더/패딩/푸터/C영역/D외곽선)** | ✅ 완료 (4/30, 라이브 검수 대기 — 미해결 #3) | `3846dc2` |
| **quick 헤더 타이틀 brown + 탭바 폭 콘텐츠 정합** | ✅ 완료 (4/30, 라이브 검수 대기 — 미해결 #3) | `68b2cba` |
| **together MY SPACE 룩 통일 + 카드 그리드 반응형** | ✅ 완료 (4/30, 라이브 검수 대기 — 미해결 #3) | `86c9807` |
| **🔴 admin_v2 풀 스케일 Phase B 골격 (메인 트랙)** | ✅ 완료 (2026-04-30) | `e8949f2` admin.html stub 교체 + admin_v2.html 신규(902줄) + tokens.css 다크 토큰 절 + 4종 토글 + 연결 상태 시각 구분 + 4중 안전장치 + _archive 백업(1969줄) |
| **🔴 admin_v2 Phase B-2 B영역 가독성 표준화** | ✅ 완료 (2026-05-01) | `fece099` `--admin-text-pending` 신규 토큰 5종 톤 정의 + `.adm-menu-item.pending` opacity 0.5 폐기 + `.pending-mark` 뱃지 토큰 자동 적응 |
| **🔴 admin_v2 Phase B 마무리 결함 5건 일괄** | ✅ 완료 (2026-05-01) | `99f70e4` light `--admin-menu-bg #FFFFFF` / black `setAttribute` 통일 / `--admin-text-label` 신규 토큰 / 헤더 우측 🚪 admExit 버튼 / hashchange `#admin/*` 외 자동 admExit |
| **🔴 admin_v2 Phase C 7섹션 mock 콘텐츠 풀 채움 (메인 트랙)** | ✅ 완료 (2026-05-01) | `5fb83bf` D-1 users(테이블 10행) / D-2 content(stage 10단계 도넛) / D-3 board(라인차트 + 신고 5행) / D-4 notice(활성 카드 4) / D-5 analytics(DAU 90일 + 막대) / D-6 logs(검색·필터 + 12행) / D-7 billing(4플랜 도넛 + 결제 8행). 라인 +1,371. status-bg 토큰 4종 5종 톤 정의 |
| **🔴 admin_v2 status·역할 badge 5종 톤 WCAG AA 확보** | ✅ 완료 (2026-05-01) | `e2d7a78` `--admin-info-text/success-text/warning-text/danger-text` 4토큰 5종 톤 정의 + 9역할 직급 그룹 재매핑(admin=danger / 지점장=info / 매니저=success / member·staff=neutral·secondary) + 80셀 WCAG AA 통과 + 폴백 안전장치 |
| **별 트랙 α — exception_diseases 검색 전면 차단 (UI + DB 이중 잠금)** | ✅ 완료 (2026-05-03) | `7ea9044` UI 차단 (app.html fetchSearchPreview/doSearch에서 fetch 2건 + 렌더 블록 2건 제거, 49줄 순감소) + DB 정책 admin only (USING `is_admin()`) + 산출물 `docs/specs/exception_diseases_block_2026-05-03.md` (`61545f9`). 데이터 23,463건 보존, 향후 표준화 재시도 시 admin 직접 SELECT 가능 |
| **별 트랙 β — pages/*.html 9페이지 직접 URL 인증 게이트** | ✅ 완료 (2026-05-03) | `2142ab1` 인라인 IIFE 게이트 9페이지 적용 (admin/admin_v2/board/home/myspace/news/quick/scripts/together) + `pricing.html` 라인 237 패턴 기반 + 산출물 `docs/specs/pages_auth_gate_2026-05-03.md` (`7096c6b`). 미인증 직접 URL 접근 시 `/login.html` 즉시 redirect / 셸 동작 영향 0 |
| **🔴 D-pre.8 — DB 정합 일괄 청산 5항목 (B + ② + ⑤ + ⑤-2 + ⑦)** | ✅ 완료 (2026-05-03) | 트랜잭션 1건: DROP 9 + CREATE 10 + 사후 검증 SELECT 18행 모두 정합 → COMMIT 확정. posts/scripts/news 인라인 EXISTS → `is_admin()` 통일 + comments/posts(together) anon 제거 + script_usage_logs 정책명 정합화 + 사용자 자기 row SELECT 신설 (quick.html 라인 336 일반 사용자 6역할 작동 보장). 산출물 `docs/architecture/db_pre_dpre8_capture.md`. 자기참조 0건 / 인라인 admin EXISTS 잔존 0건 |

---

## 🪧 별 트랙 후보 — admin_v2 Phase C 확정 외 (2026-05-01 신규 등록)

admin_v2 Phase D 진입과 별개로, Chrome 라이브 검수에서 발견된 잔여 결함 + Phase B 마무리 borderline:

| # | 트랙 | 대상 | 원인 / 상태 | 권장 처리 시점 |
|---|---|---|---|---|
| **B-1** | 차트 SVG grid line light 톤 무대비 | dashboard / D-3 board / D-5 analytics 차트 | `stroke="rgba(255,255,255,0.06)"` 하드코딩 — light bg #FCFCFC 위 무대비. 차트 자체 폴리라인은 정상 표시 | grid line stroke를 CSS 변수화 (예: `--admin-chart-grid`). dashboard·D-3·D-5 일관 처리. Phase D 진입 후 별 트랙 또는 5월 패키지에 묶음 |
| **B-2** | dashboard 기본 뱃지 light 톤 미달 | `.adm-badge.online` / `.pro` / `.branch` / `.manager` / `.admin` (라인 677~683) | Phase C에서 도입한 `--admin-info-text/success-text/warning-text/danger-text` 4토큰 미적용 — 구 `var(--color-*)` 잔존. Phase C 작업 §5 "dashboard 변경 금지" 준수로 보존 | dashboard 기본 뱃지 7종을 신규 텍스트 토큰으로 마이그레이션. Phase D 진입 시 D-8 대시보드 종합 단계에 묶음 |
| **B-3** | Phase B 마무리 borderline — light 액센트 #D4845A | B영역 카테고리 라벨 (`.adm-menu-category`) + C영역 활성 메뉴 | light bg vs accent ~3.7:1 (11px+bold+uppercase로 시각 가독 확보). AA 4.5:1 미달이지만 large text 기준(3:1) 통과 | 별 트랙 우선순위 낮음. Phase D 또는 5월 패키지에서 함께 검토 |
| **#A v1.1 PITR** | Supabase 백업 시스템 강화 | Daily 백업만 가용 → 분 단위 복구 부재 | 4/22~23 사고 시점에도 Daily 백업만 가용. 비용 결재 후 Dashboard 활성. 결정 문서 `docs/decisions/2026-05-05_v1_1_safety_3track_schedule.md` § 4-A | **5/6 (수)** D-9 Step 5 병렬 진입 (0.2세션, 1일 shift) — 결재 #1 승인 후 |
| **#B v1.1 Sentry** | 라이브 에러 추적 SDK 도입 | 코드 hook 준비됨 / 실 SDK 미도입 | DSN 발급 (Sentry.io 무료 플랜) + 초기화 코드 + 라이브 검증. 결정 문서 § 4-B | **5/11 (월)** 알림 v1.1 본 진입 + 별 트랙 #25 병렬 (0.5~0.8세션, 1일 shift) — 결재 #2 승인 후 |
| **#C v1.1 Playwright** | 라이브 회귀 자동화 1세트 | 코드·문서 0건 / Chrome 위임 사람 의존 | admin_v2 D-1~D-6+D-9 회귀 자동화 ~50 시나리오. 결정 문서 § 4-C | **5/12 (화)** D-final 보안 sweep 병렬 (1.0~1.5세션, 1일 shift) — 결재 #3 승인 후 |

---

## 🚀 다음 트랙 후보 (2026-05-01 admin_v2 Phase C 확정 직후)

| # | 트랙 | 분류 | 비고 |
|---|---|---|---|
| **(1)** | **admin_v2 Phase D 진입 — 실 Supabase 연동** | 🔴 메인 트랙 다음 단계 | mock → 실 데이터 전환. 9역할 RBAC 권한 검증 로직 + RLS 정책 정합. D-1 users 테이블 우선(실 사용자 데이터) |
| (2) | myspace 갭 분석 6항목 결정 | 🟡 별 트랙 | 2026-04-30 분석 보고(`work_myspace_gap_analysis_2026-04-30.md`) 기반 6항목 결정 후 부분 흡수 작업지시서 발행 |
| (3) | 5/9~10 주말 패키지 | 🟡 별 트랙 | UI 스케일 슬라이더(CSS zoom + localStorage 6단계) / Sticky Nav 메뉴 + 햄버거 / Safari `-webkit-backdrop-filter` 보강. 별 트랙 B-1·B-2·B-3 일부 묶음 가능 |
| (4) | 보험뉴스 → 스크립트 자동 증식 엔진 | 🟢 큰 별 트랙 | 5/6 후 본격 시작 예정. 자동수집 → Claude API 분류 → 매니저 검수 → 자동 추가. v1.5~v2.0 보험뉴스 엔진 가동 시점에 news.html 라이브 트랙 동시 재가동 |
| **(5)** | **알림 시스템 전면 재설계 v1.1~v3.0 (5/5 후속 신규)** | 🟢 큰 별 트랙 | 통찰 문서 (`docs/sessions/2026-05-05_dawn_notification_system.md` 443줄, Claude AI 새벽) 등록 완료. 7개 분할 spec 예정 (v1.1 C영역 5배너·v1.1 호버 프리뷰·v1.1 알림 설정·v1.2 PC 토스트·v1.3 모바일·PC 동기화·v1.5 PWA 푸시·v2.0 상담 모드 자동 감지). v1.1 5개 항목(C영역·호버·설정·DND·A1 🔔)이 5/15 4팀 오픈 시점 → admin Phase D 잔여 ~5.9세션과 일정 충돌 가능성. **분할 spec 작성 시점 = admin Phase D 마무리 후(5/11~12경)** — 본 통찰 문서 §14 정직성 노트(코드 베이스 재검증 필요) 정합 |

---

## 🎨 3개 영역 디자인 정체성 (2026-04-30 확정 / 2026-05-01 명문화)

| 영역 | 톤 / 정체성 | 토큰 prefix | 상태 |
|---|---|---|---|
| **사용자 페이지** (index / home / scripts / board / quick / together / myspace 등) | 밝은 브라운·아이보리 80%. 브라운 면적 40→20% 축소. shell v1 라이트 톤 (4/27~4/28 전환 완료) | (기본 — prefix 없음) | ✅ 라이브 운영 |
| **admin_v2** (관리자 콘솔 풀 스케일) | 5종 톤 영구 토글 (light + warm + slate + black + navy). 기본값 black `#0A0A0A`, light `#FCFCFC`. 외부 시연 컨텍스트별 자유 전환 | `--admin-*` | ✅ Phase C 확정 (2026-05-01) |
| **4팀 비밀의 공간** (AZ 더원 4팀 40명 전용) | 웜 다크 — 사용자 페이지(밝은 톤)와 admin(5종 토글) 양쪽 모두와 구분되는 제3의 정체성. 4팀 외부 노출 X | `--team4-*` (예정) | 🟡 admin 완료 후 별 트랙 (Phase D 이후) |

**3정체성 분리 원칙:** 토큰 prefix로 영역 격리 → 한 영역 토큰 변경이 다른 영역에 영향 0. 사용자 페이지는 기본, admin·4팀은 prefix로 명시 격리.

---

## 🔗 참고 문서

- `claude_code/design_test/README.md` — 디자인 테스트 워크스페이스 전역 규칙
- `docs/decisions/2026-04-25_holds_and_priorities.md` — 보류 항목·우선순위
- `docs/role_system.md` — 9개 role 체계
- `docs/work_order_template.md` — 작업지시서 표준 템플릿 (0번 정합성 검증 필수)
- `claude_code/_archive/admin_v1_20260430.html` — 기존 admin.html 1969줄 보존본 (admin_v2 트랙 격상 후 롤백용)
- `claude_code/_archive/news_migration_phaseA_20260430.md` — news.html 후순위 폐기 시 Phase A 분석 보존본

---

*본 인덱스는 `/session-end` 슬래시 커맨드 5단계에서 자동 갱신됩니다. 수동 편집 시 `마지막 갱신` 날짜를 함께 갱신하세요.*
