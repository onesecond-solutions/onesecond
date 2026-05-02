# 세션 인덱스 — 현재 큰 그림 한눈에

> **마지막 갱신:** 2026-05-01 저녁
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
| **D-pre.6** users_role_check 9역할 정합 + D-pre 누락 영역 전수 | 🟡 **작업지시서 대기 (2026-05-02)** | D-pre.5 Step C에서 발견된 `users_role_check` 5역할 잔존 + 본 감사에서 신규 발견 `pages/board.html` 라인 2213 `['admin','insurer']` 5역할/insurer 잔존 처리. 골격: DB ALTER 2건 (DROP + ADD CONSTRAINT 9키) + board.html 라인 2213 1줄 정정 + 추가 SELECT 4건 (다른 CHECK / RLS / 함수 / 트리거 전수) + 신규 가입 INSERT 시뮬레이션 1건. 사양: `docs/specs/role-definition-audit-2026-05-02.md` § 6.2~§ 6.5 |
| D-1 users | 🟡 **작업지시서 대기 (2026-05-01)** | D-pre + D-pre.5 + D-pre.6 종료 → admin_v2 D-1 mock 실 데이터 연결 / 작업지시서 발행 전 사전 정렬: 마이그레이션 + D-1 묶음 vs 분리 결정 |
| D-2 content | 대기 | scripts·자료실 테이블 + stage 10단계 분포 RPC |
| D-3 board | 대기 | posts + post_reports + 모더레이션 액션 |
| D-4 notice | 대기 | app_settings(또는 notices/banners) + 노출 기간 + role 분기 |
| D-5 analytics | 대기 | DAU/WAU/MAU RPC + 기능별 사용량 |
| D-6 logs | 대기 | activity_logs + system_logs (또는 Sentry 통합) |
| D-7 billing | 대기 | payments + subscriptions + 4플랜 분포 |
| D-8 dashboard 종합 | 대기 | KPI 4 + timeline + 최근 가입자 + 시스템 상태 + Top 스크립트 모두 실 연결 + **별 트랙 B-2 dashboard 기본 뱃지 토큰 마이그레이션 묶음** |
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
| `pages/home.html` | 🔄 부분 흡수 (C) 트랙 진행 중 — C-1 + C-2(줄무늬) + hexagon 카드 완료, 라이브 검수 미완 | C-1: `b854878` (4/28) / C-2 줄무늬 디바이더: `869510d` `c71db6d` (4/29 오후) / hexagon 시계 흰 원형 카드: `4071194` (4/29 오후). C-3 카피 / C-4 도넛 / C-5 C영역(별 트랙) 대기 |
| `pages/admin.html` | 🛑 **stub 90줄 교체 완료 (4/30 admin_v2 트랙 격상)** — 기존 1969줄은 `_archive/admin_v1_20260430.html` 보존 / admin_v2.html이 메인 트랙으로 진행 (Phase C 확정 5/1) | stub: `e8949f2` / 백업: `_archive/admin_v1_20260430.html` |
| `pages/myspace.html` | ✅ 부분 흡수 (A) Phase 1 완주 — 4/29 저녁 7커밋, 라이브 검수 미완 | 갭 분석 v2: `978904c` / pg-page-header + 카드 토큰: `656aa99` / pg-outer board 정합: `9be9d3c` / 카드 그리드 + 공통 간격 토큰: `2cd372e` / scripts fetch 400 회귀: `efeb1ad` / 4건 통합 정리: `6ede634` |
| `pages/scripts.html` | ✅ v2-full 통째 승격 완료 + 폰트 위계 + C영역 ON (4/29 오후, 라이브 검수 미완) | D 영역: `6882753` / 폰트 위계: `be40cc6` / C영역 ON: `c96d833` |
| `pages/news.html` | 🛑 **트랙 폐기·후순위** (2026-04-30 admin_v2 작업지시서 §4-2) | 헤더·푸터 board 통일만 진행: `ee64d9a` (4/30) / Phase A 분석 보존: `claude_code/_archive/news_migration_phaseA_20260430.md` |
| `pages/quick.html` | 🔄 myspace 정합 5건 + 헤더 brown 통일 (4/30 신규) | 토큰: `e5b5afe` (4/29) / myspace 정합 5건: `3846dc2` (4/30) / 헤더 brown + 탭바 폭: `68b2cba` (4/30) |
| `pages/together.html` | 🔄 MY SPACE 룩 통일 + 카드 그리드 반응형 (4/30 신규) | 토큰: `e5b5afe` (4/29) / 룩 통일: `86c9807` (4/30) |

### 다음 후보 (메인 트랙 격상 후 우선순위 변경 — 2026-04-30)

1. 🔴 **admin_v2.html 풀 스케일 (메인 트랙)** — 사업 전략 핵심 축
2. ✅ `index.html` (시안 통째 승격 완료)
3. 🔄 `pages/home.html` (부분 흡수 (C) 트랙 — C-3 카피 / C-4 도넛 대기)
4. ✅ `pages/scripts.html` (v2-full 통째 승격 완료, 라이브 검수 대기)
5. ✅ `pages/board.html`
6. ✅ `pages/myspace.html` (부분 흡수 (A) Phase 1 완주, 라이브 검수 대기)
7. 🛑 ~~`pages/news.html`~~ → **후순위 폐기** (보험뉴스 엔진 가동 시점에 함께 처리)
8. `pages/quick.html` (myspace 정합 + 시안 승격 미진행)
9. `pages/together.html` (MY SPACE 룩 통일 + 시안 승격 미진행)
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
3. **🔥 라이브 검수 부채 통합 누적 (4/29 + 4/30 17커밋)** — home(줄무늬 + hexagon) + scripts(D영역 v2 + 폰트 위계 + C영역) + myspace(부분 흡수 7커밋) + board/quick/together(공통 간격 토큰 1커밋) + **4/30 quick·together·news 4커밋 추가** 모두 라이브 검수 미완. **통합 검수 시점 결정 시급**. admin_v2 메인 트랙 진행 중에도 검수 별 트랙 가능.
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

---

## 📋 결정 대기 항목

1. **GPT v1 트랙 폐기 명문화** — 4/28 사용자 발언으로 묵시적 폐기. 4/29 작업 디렉토리 GPT v1 잔재 (a) 폐기 결정 + design_test/README 원칙 #6 사례 추가(`c2e2d86`)로 묵시→명시 한 단계 진행. 명문 결정 문서(`docs/decisions/2026-04-29_gpt_v1_deprecation.md`) 신설 대기.
2. **admin standalone hex 8건 처리** — admin_v2 트랙 격상으로 사실상 무효화. 추가 결정 불필요.
3. **(4/29 저녁) 라이브 검수 통합 시점** — 4/29 + 4/30 17커밋 누적. admin_v2 작업과 별도 트랙 진행 가능.
4. ~~(4/29 저녁) news 작업 진행 순서~~ — **후순위 폐기로 무효화** (4/30 admin_v2 작업지시서 §4-2).
5. ~~**(신규 4/30) admin_v2 다크 톤 4종 비교 결정**~~ → **✅ 해소 (2026-05-01)**: 5종 운영 확정 (light + warm + slate + black + navy). 영구 토글 + localStorage 저장.

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

---

## 🪧 별 트랙 후보 — admin_v2 Phase C 확정 외 (2026-05-01 신규 등록)

admin_v2 Phase D 진입과 별개로, Chrome 라이브 검수에서 발견된 잔여 결함 + Phase B 마무리 borderline:

| # | 트랙 | 대상 | 원인 / 상태 | 권장 처리 시점 |
|---|---|---|---|---|
| **B-1** | 차트 SVG grid line light 톤 무대비 | dashboard / D-3 board / D-5 analytics 차트 | `stroke="rgba(255,255,255,0.06)"` 하드코딩 — light bg #FCFCFC 위 무대비. 차트 자체 폴리라인은 정상 표시 | grid line stroke를 CSS 변수화 (예: `--admin-chart-grid`). dashboard·D-3·D-5 일관 처리. Phase D 진입 후 별 트랙 또는 5월 패키지에 묶음 |
| **B-2** | dashboard 기본 뱃지 light 톤 미달 | `.adm-badge.online` / `.pro` / `.branch` / `.manager` / `.admin` (라인 677~683) | Phase C에서 도입한 `--admin-info-text/success-text/warning-text/danger-text` 4토큰 미적용 — 구 `var(--color-*)` 잔존. Phase C 작업 §5 "dashboard 변경 금지" 준수로 보존 | dashboard 기본 뱃지 7종을 신규 텍스트 토큰으로 마이그레이션. Phase D 진입 시 D-8 대시보드 종합 단계에 묶음 |
| **B-3** | Phase B 마무리 borderline — light 액센트 #D4845A | B영역 카테고리 라벨 (`.adm-menu-category`) + C영역 활성 메뉴 | light bg vs accent ~3.7:1 (11px+bold+uppercase로 시각 가독 확보). AA 4.5:1 미달이지만 large text 기준(3:1) 통과 | 별 트랙 우선순위 낮음. Phase D 또는 5월 패키지에서 함께 검토 |

---

## 🚀 다음 트랙 후보 (2026-05-01 admin_v2 Phase C 확정 직후)

| # | 트랙 | 분류 | 비고 |
|---|---|---|---|
| **(1)** | **admin_v2 Phase D 진입 — 실 Supabase 연동** | 🔴 메인 트랙 다음 단계 | mock → 실 데이터 전환. 9역할 RBAC 권한 검증 로직 + RLS 정책 정합. D-1 users 테이블 우선(실 사용자 데이터) |
| (2) | myspace 갭 분석 6항목 결정 | 🟡 별 트랙 | 2026-04-30 분석 보고(`work_myspace_gap_analysis_2026-04-30.md`) 기반 6항목 결정 후 부분 흡수 작업지시서 발행 |
| (3) | 5/9~10 주말 패키지 | 🟡 별 트랙 | UI 스케일 슬라이더(CSS zoom + localStorage 6단계) / Sticky Nav 메뉴 + 햄버거 / Safari `-webkit-backdrop-filter` 보강. 별 트랙 B-1·B-2·B-3 일부 묶음 가능 |
| (4) | 보험뉴스 → 스크립트 자동 증식 엔진 | 🟢 큰 별 트랙 | 5/6 후 본격 시작 예정. 자동수집 → Claude API 분류 → 매니저 검수 → 자동 추가. v1.5~v2.0 보험뉴스 엔진 가동 시점에 news.html 라이브 트랙 동시 재가동 |

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
