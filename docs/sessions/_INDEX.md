# 세션 인덱스 — 현재 큰 그림 한눈에

> **마지막 갱신:** 2026-04-30 (admin_v2 풀 스케일 트랙 신규 등록)
> **자동 갱신 도구:** `/session-end` 슬래시 커맨드 (5단계에서 본 파일 함께 갱신·커밋)
> **목적:** Claude Code가 작업 요청 진입 시 가장 먼저 읽고 큰 그림 정합성 검증.

---

## 🎯 현재 메인 트랙 — admin_v2.html 풀 스케일 구축 (사업 전략 핵심 축)

`pages/admin_v2.html` 신규 생성 트랙. 시안 `claude_code/design_test/admin/v1-full.html` (1026줄, 4/25) 기반 8섹션 풀 스케일 관리자 콘솔. **다크 테마 채택** (사용자 페이지와 의도적 차별화). 외부 미팅·원수사 입점 영업·투자/제휴 시 결정적 무기.

- **통합 방식:** (a)+(c) 조합 — admin.html을 admin_v2.html 호출 stub으로 교체, app.js 무변경, app.html 프레임 무변경
- **백업 보존:** `claude_code/_archive/admin_v1_20260430.html` (기존 admin.html 1969줄 / 100KB)
- **다크 톤:** Phase B 골격 완성 후 라이브 4종 비교 결정 (TEMP 웜 다크 #1A130E 임시 적용 / 4종 토글 기능 부착)
- **단계:** Phase A(분석·완료) → B(골격) → C(7섹션 mock 채우기) → D(실 데이터) → E(정밀화)
- **추정:** 14~21세션
- **viewport takeover:** 풀 화면 점유 (position:fixed inset:0 z-index:9000) + 4중 안전장치(🚪/ESC/hash/MutationObserver)

### admin_v2 진행 현황 (2026-04-30 기준)

| 단계 | 상태 | 비고 |
|---|---|---|
| Phase A 사전 분석 | ✅ 완료 (2026-04-30) | v1-full 1026줄 정독 + 영역 충돌 매핑 + tokens.css 다크 토큰 설계 + 8섹션 라우팅 + 위험 8건 |
| Phase B 골격 | 🔄 **본 세션 진행** | admin_v2.html 신규 + admin.html stub + tokens.css 다크 토큰 + 4종 토글 + 연결 상태 시각 구분 |
| Phase C 7섹션 외곽 | 대기 | mock 데이터 시연 완성도 100% |
| Phase D 실 데이터 | 대기 | 8개 섹션 우선순위순 (D-1 사용자 → D-2 콘텐츠 → D-3 게시판 → D-4 공지 → D-5 통계 → D-6 로그 → D-7 결제 → D-8 대시보드 종합) |
| Phase E 정밀화 | 대기 | SQL 콘솔 / Export 게이트 / 활동 로그 / 검색 인덱싱 |

### 8섹션 ↔ 데이터 소스 매핑

| # | 섹션 | 라우팅 키 | 상태 | Phase D 순서 |
|:---:|---|---|---|:---:|
| 1 | 대시보드 | dashboard | 🟢 Live (Phase B mock) | 8 (집계 종합) |
| 2 | 사용자 관리 | users | ⏸️ Pending | 1 |
| 3 | 콘텐츠 관리 | content | ⏸️ Pending | 2 |
| 4 | 게시판 관리 | board | ⏸️ Pending | 3 |
| 5 | 통계·분석 | analytics | ⏸️ Pending | 5 |
| 6 | 공지·배너 | notice | ⏸️ Pending | 4 |
| 7 | 로그 | logs | ⏸️ Pending | 6 |
| 8 | 결제·플랜 | billing | ⏸️ Pending | 7 |

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
| `pages/admin.html` | 🛑 **stub 교체 (4/30 admin_v2 트랙 격상)** — 기존 1969줄은 `_archive/admin_v1_20260430.html` 보존 | stub: 본 세션 / 백업: `_archive/admin_v1_20260430.html` |
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
16. **(신규 4/30) admin_v2 다크 톤 4종 후보 결정** — (가) 슬레이트 / (나) 웜 다크(TEMP 임시) / (다) 블랙·그레이 / (라) 다크 네이비. **Phase B 골격 완성 후 라이브 4종 비교 결정** (Phase B 진입 차단 아님). admin_v2 헤더 우측 톤 토글 부착됨, 결정 후 토글 + 미선택 3종 토큰 절 제거.
17. **(신규 4/30) 보험뉴스 메뉴 숨김** — 현재 화면설정 admin.html에서 이미 숨김 처리 확인. 별도 작업 불필요.
18. **(신규 4/30) admin_v2 라이브 검수 통합 시점** — Phase B 완료 후 4종 톤 비교 + viewport takeover 4중 안전장치(🚪/ESC/hash/MutationObserver) 작동 확인 + 8섹션 라우팅 작동 확인 일괄 진행.

---

## 📋 결정 대기 항목

1. **GPT v1 트랙 폐기 명문화** — 4/28 사용자 발언으로 묵시적 폐기. 4/29 작업 디렉토리 GPT v1 잔재 (a) 폐기 결정 + design_test/README 원칙 #6 사례 추가(`c2e2d86`)로 묵시→명시 한 단계 진행. 명문 결정 문서(`docs/decisions/2026-04-29_gpt_v1_deprecation.md`) 신설 대기.
2. **admin standalone hex 8건 처리** — admin_v2 트랙 격상으로 사실상 무효화. 추가 결정 불필요.
3. **(4/29 저녁) 라이브 검수 통합 시점** — 4/29 + 4/30 17커밋 누적. admin_v2 작업과 별도 트랙 진행 가능.
4. ~~(4/29 저녁) news 작업 진행 순서~~ — **후순위 폐기로 무효화** (4/30 admin_v2 작업지시서 §4-2).
5. **(신규 4/30) admin_v2 다크 톤 4종 비교 결정** — Phase B 골격 라이브 검수 시 4종 토글로 비교 → 결정 → 토큰 일괄 교체.

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

---

## 🗓️ 최신 세션 요약 (시간 역순)

- `docs/sessions/2026-04-30_<TBD>.md` — 4/30 (admin_v2 풀 스케일 트랙 진입: Phase A 분석 + Phase B 골격 진행 중 — admin_v2.html 신규 + admin.html stub + tokens.css 다크 토큰 + 4종 토글 / 4/30 누적 4커밋 별 트랙 정리: news 헤더·푸터 board 통일 / quick myspace 정합 5건 + 헤더 brown / together MY SPACE 룩 통일)
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
| **🔴 admin_v2 풀 스케일 Phase B 골격 (메인 트랙)** | 🔄 본 세션 진행 | admin.html stub 교체 + admin_v2.html 신규(902줄) + tokens.css 다크 토큰 절(33줄) + 4종 토글 + 연결 상태 시각 구분 + 4중 안전장치 + _archive 백업(1969줄) + _INDEX 갱신 |

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
