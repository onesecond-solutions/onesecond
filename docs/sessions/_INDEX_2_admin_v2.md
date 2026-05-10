# 인덱스 상세 2 — admin_v2 Phase D (융합 트랙)

> **상위 인덱스:** [`_INDEX.md`](./_INDEX.md) (압축본 ~150줄)
> **본 파일 범위:** admin_v2 Phase A~E + D-pre 시리즈 + D-1~D-final + 8섹션 매핑 + 토큰 12종 + data-status 규칙 + 5/1 결정 완료
> **현재 위치:** Phase 1 메인 트랙 전환(2026-05-07)으로 **융합 트랙으로 격하** (Step 10~15)

---

## 🎯 admin_v2.html 풀 스케일 관리자 콘솔

`pages/admin_v2.html` 풀 스케일 관리자 콘솔. 시안 `claude_code/design_test/admin/v1-full.html` (1026줄, 4/25) 기반. **5종 톤 운영 확정** (light + warm + slate + black + navy). 외부 미팅·원수사 입점 영업·투자/제휴 시 결정적 무기.

- **통합 방식:** (a)+(c) — admin.html을 admin_v2.html 호출 stub으로 교체, app.js 무변경, app.html 프레임 무변경
- **백업 보존:** `claude_code/_archive/admin_v1_20260430.html` (기존 admin.html 1969줄 / 100KB)
- **5종 톤 확정 (2026-05-01):** light(#FCFCFC) / warm(#1A130E) / slate(#0F172A) / **black(#0A0A0A, 기본)** / navy(#0B1426). 영구 운영 토글 + localStorage
- **라인 수 추이:** 902 (4/30 골격) → 1,484 (Phase B 마무리) → **2,855 (Phase C 확정)**
- **단계:** Phase A(분석·완료) → B(골격·완료) → **C(7섹션 mock·완료)** → D(실 데이터·진입 대기) → E(정밀화·대기)
- **viewport takeover:** 풀 화면 점유 + 4중 안전장치(🚪 rail + 🚪 헤더 / ESC / hashchange `#admin/*` 외 자동 admExit / MutationObserver)

---

## Phase A~E 진행 현황

| 단계 | 상태 | 근거 커밋 / 비고 |
|---|---|---|
| Phase A 사전 분석 | ✅ 완료 (2026-04-30) | v1-full 1026줄 정독 + 영역 충돌 매핑 + 다크 토큰 설계 + 위험 8건 |
| Phase B 골격 | ✅ 완료 (2026-04-30) | `e8949f2` admin_v2.html 신규(902줄) + admin.html stub + tokens.css admin 토큰 + 4종 톤 토글 |
| Phase B-2 가독성 표준화 | ✅ 완료 (2026-05-01) | `fece099` `--admin-text-pending` 신규 토큰 (B영역 pending 메뉴 5종 톤 AA) |
| Phase B 마무리 결함 5건 | ✅ 완료 (2026-05-01) | `99f70e4` light menu-bg #FFFFFF / black setAttribute / `--admin-text-label` / 헤더 🚪 admExit / hash 자동 닫기 |
| Phase C 7섹션 mock | ✅ 완료 (2026-05-01) | `5fb83bf` D-1~D-7 풀 채움 (+1,371줄) + status-bg 토큰 4종 5종 톤 정의 |
| Phase C 뱃지 AA 확보 | ✅ 완료 (2026-05-01) | `e2d7a78` `--admin-info/success/warning/danger-text` 4토큰 + 9역할 직급 그룹 재매핑 |
| Phase D 실 데이터 | 🟡 D-pre 종료 + D-1~D-6 ✅ + D-9 부분 종료 (2026-05-05) | 세부 단계 표 아래 참조 |
| Phase E 정밀화 | 대기 | SQL 콘솔 / Export 게이트 / 활동 로그 / 검색 인덱싱 |

---

## Phase D 세부 단계 (2026-05-01 D-pre 작업지시서 정의)

| 단계 | 상태 | 산출물 / 비고 |
|---|---|---|
| **D-pre** 사전 분석 | ✅ 완료 (2026-05-01) | 산출물 3종·1,697줄 / 4개 항목 모두 승인 #1~#4 완료 / 결정 27건 명문화 |
| **D-pre.5** users 신규 컬럼 (status / last_seen_at) | ✅ 완료 (2026-05-02) | D-1 진입 전 분리 마이그레이션. Code 의견 전면 채택 + Step A~D 4단계 17건 통과 |
| **D-pre.6** users_role_check 9역할 정합 + activity_logs RLS 2건 + board.html 라인 2213 | ✅ 완료 (2026-05-02) | 5단계 17건 전건 통과. 정의 raw 검증 표준 채택 |
| **D-pre.7** Phase D 8테이블 admin SELECT 정책 점검 | ✅ 완료 (2026-05-02) | A 본문 정밀 검토로 6→2 정정. 🚨 1차 EXISTS 자기 참조 패턴 → PostgreSQL 무한 재귀(42P17) 발생 → 비상 롤백 → SECURITY DEFINER 함수 패턴 재진입. 영구 학습 6건 |
| **D-pre.8** R6 sweep 후속 5항목 일괄 청산 (B + ② + ⑤ + ⑤-2 + ⑦) | ✅ 완료 (2026-05-03) | 트랜잭션 1건 = DROP 9 + CREATE 10 + 사후 검증 SELECT 18행 모두 정합 → COMMIT |
| D-1 users | ✅ 완료 (2026-05-03~04, 17/17 PASS) | js/admin_v2.js 신설 342줄 + users 섹션 mock 제거 + 동적 슬롯 + .adm-toast |
| D-2 content | ✅ 완료 (2026-05-04, 24/25 PASS) | 별 트랙 #3 `get_stage_distribution()` RPC 신설. P3 PostgREST overhead Phase E |
| D-3 board | ✅ 완료 (2026-05-04, 25/25 PASS) | J-2 (b) post_reports v2.0 대기 + J-1 (a) 모더레이션 3종 + J-5 (a) 클라 GROUP BY |
| D-4 notice | ✅ 완료 (2026-05-04, 20/20 PASS) | K-1 (c) v2.0 대기 + mock 보존 채택. app_settings RLS `admin write` → `is_admin()` 청산 |
| D-5 analytics | ✅ 완료 (2026-05-05, 29/30 PASS) | RPC 4종 신설 + B-1 `--admin-chart-grid` 토큰 5종 톤 |
| D-6 logs | ✅ 완료 (2026-05-05, 20/20 PASS) | activity_logs 정합 + admin_read_all_logs `is_admin()` 청산 |
| D-7 billing | 대기 | payments + subscriptions + 4플랜 분포 |
| D-8 dashboard 종합 | 대기 | KPI 4 + timeline + 최근 가입자 + 시스템 상태 + Top 스크립트 모두 실 연결 |
| **D-9 ⚙️ 화면설정** | 🟢 Step 1.6 청산 + Step 2~4 묶음 완료 (2026-05-05 09:30, 1107줄) — Step 5 라이브 회귀 5/7 슬롯 대기 | 옛 admin v1 화면설정 탭 포팅 완료 — 4섹션(메뉴 ON/OFF + PRO 게이트 + 게시판 탭 + 배너 이미지) + Q-5 (a) 5종 톤 토큰 25셀 |
| **D-final** 보안 검증 | 대기 | 9역할 RLS 정합 + admin 무접두어 vs ga_*/insurer_* + admin 진입 게이트 |

---

## 8섹션 ↔ 데이터 소스 매핑 (2026-05-01 Phase C 확정)

| # | 섹션 | 라우팅 키 | 상태 | Phase D 순서 | Phase C mock 콘텐츠 |
|:---:|---|---|---|:---:|---|
| 1 | 대시보드 | dashboard | 🟢 Live (Phase B mock) | 8 (집계 종합) | KPI 4카드 / 차트 SVG / timeline 6건 / 최근 가입자 5행 / 하단 2-col |
| 2 | 사용자 관리 | users | 🟢 Live (Phase D ✅) | 1 ✅ | KPI 3카드 + 9역할 칩 10개 + 사용자 테이블 10행 |
| 3 | 콘텐츠 관리 | content | 🟢 Live (Phase D ✅) | 2 ✅ | KPI 3카드 + stage 10단계 도넛 SVG + 콘텐츠 테이블 8행 |
| 4 | 게시판 관리 | board | 🟢 Live (Phase D ✅) | 3 ✅ | KPI 3카드 + 게시판별 활동 라인차트(3계열) + 신고 5행 |
| 5 | 통계·분석 | analytics | 🟢 Live (Phase D ✅) | 5 ✅ | KPI 4카드 + DAU 90일 라인 + 6메뉴 막대 |
| 6 | 공지·배너 | notice | 🟢 Live (Phase D ✅) | 4 ✅ | 활성 카드 4개(toggle) + 작성 이력 5행 |
| 7 | 로그 | logs | 🟢 Live (Phase D ✅) | 6 ✅ | 검색·필터바 + 로그 12행 |
| 8 | 결제·플랜 | billing | 🟢 Live (Phase C mock) | 7 (대기) | KPI 3카드 + 4플랜 도넛 + 결제 8행 |

---

## admin_v2 신규 토큰 12종 (Phase B-2 → Phase C 확정 누적)

| 분류 | 토큰 | 5종 톤 정의 위치 | 도입 커밋 |
|---|---|---|---|
| 텍스트 | `--admin-text-pending` | tokens.css :root + light / admin_v2.html warm·slate·navy | `fece099` |
| 텍스트 | `--admin-text-label` | 동일 5종 | `99f70e4` |
| 배경 | `--admin-info-bg` / `--admin-success-bg` / `--admin-warning-bg` / `--admin-danger-bg` | 동일 5종 (light hex / 다크 rgba 18~22%) | `5fb83bf` |
| 텍스트 | `--admin-info-text` / `--admin-success-text` / `--admin-warning-text` / `--admin-danger-text` | 동일 5종 (light Tailwind 700~800 / 다크 Tailwind 300) | `e2d7a78` |
| menu-bg | `--admin-menu-bg` (light 명시 #FFFFFF — :root lazy eval 안전망) | tokens.css light | `99f70e4` |

---

## data-status 시각 구분 규칙 (2026-05-01 명문화)

- **rail 7섹션:** `data-status="pending"` 그대로 + opacity 0.55 (실 기능 미구현 표시)
- **메뉴 pane 항목:** `.pending` 클래스 + `.pending-mark` ("Phase D-X" 또는 "Phase v2.0") 그대로
- **섹션 타이틀 우측:** `[Phase C mock]` 라벨 (Phase C에서 신규 부착, accent 색)
- Phase D 진입 시: 섹션별 실 데이터 연결 후 위 마커 단계적 제거

---

## 5/1 결정 완료 (참고)

- ✅ admin_v2 5종 톤 운영 확정 — light + warm + slate + black + navy
- ✅ admin_v2 Phase B 마무리 결함 5건 일괄 처리 (`99f70e4`)
- ✅ admin_v2 Phase C 7섹션 mock 풀 채움 (`5fb83bf`)
- ✅ admin_v2 9역할 직급 그룹 색계열 매핑 확정 (`e2d7a78`)
- ✅ admin_v2 모든 뱃지·메뉴 5종 톤 WCAG AA 통과 (80셀)
- ✅ 신규 토큰 12종 5종 톤 정의 완료
- ✅ 3개 영역 디자인 정체성 분리 명문화

---

*상위 인덱스 [`_INDEX.md`](./_INDEX.md) | 이전: [`_INDEX_1_phase1.md`](./_INDEX_1_phase1.md) | 다음: [`_INDEX_3_stars.md`](./_INDEX_3_stars.md) 별 트랙 + 미해결*
