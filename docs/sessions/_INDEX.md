# 세션 인덱스 — 현재 큰 그림 한눈에

> **마지막 갱신:** 2026-04-29 저녁
> **자동 갱신 도구:** `/session-end` 슬래시 커맨드 (5단계에서 본 파일 함께 갱신·커밋)
> **목적:** Claude Code가 작업 요청 진입 시 가장 먼저 읽고 큰 그림 정합성 검증.

---

## 🎯 현재 메인 트랙 — design_test 시안 라이브 승격

`claude_code/design_test/<page>/v1-full.html` 시안을 라이브 페이지(`pages/<page>.html` / `app.html` / `css/tokens.css`)에 승격하는 트랙.

승격 절차 (`claude_code/design_test/README.md` 명시): 팀장님 OK → 적용 버전 지정 → 별도 작업지시서 → 라이브 반영 → 시안 폴더는 레퍼런스로 유지.

### 승격 진행 현황 (2026-04-29 저녁 기준)

| 영역 | 상태 | 근거 커밋 |
|---|---|---|
| `css/tokens.css` (9 시안 :root 통합 + **공통 간격 토큰 5종 4/29 저녁 신규**) | ✅ 완료 | 통합: `71f08b0` (4/27) / 간격 토큰 5종: `2cd372e` (4/29 저녁 — `--pg-header-bottom`/`--pg-tab-bottom`/`--pg-content-gap`/`--pg-item-gap`/`--pg-side-padding`) |
| `app.html` (shell v1) | ✅ 완료 + 4/28 A1 라이트 톤 + **4/29 푸터 트랙 (4컬럼 → 카피라이트 단일 → 한 줄 미니 → 셸 최하단 정정)** | shell: `5592749` (4/27) → 헤더: `fd8b264` `1ab35c4` (4/28) → 푸터: `54cd148` `fa835d2` `ae669d0` `79c0052` (4/29) |
| `pages/board.html` | ✅ **시안 통째 적용** + **4/29 저녁 공통 간격 토큰 적용 + `.hub-notice` 톤 정정 (transparent + border:none)** | 통째: `ebb9b3b` (4/26) / 토큰: `e5b5afe` (4/29 저녁) |
| `index.html` | ✅ **시안 통째 승격 완료** + 헤더 라이트 톤 + 푸터 4컬럼 + 가입 폼 보강 (4/28) + **카피라이트 onesecond 단일 표기 동기화 (4/29)** | 승격: `83665c4` / 헤더: `001af79` / 푸터: `c2186a1` / 카드: `3342e9d` / 안내박스: `69f2678` / 카피라이트: `216ce9f` |
| `pages/home.html` | 🔄 **부분 흡수 (C) 트랙 진행 중** — C-1 + C-2(줄무늬) + hexagon 카드 완료, 라이브 검수 미완 | C-1: `b854878` (4/28) / **C-2 줄무늬 디바이더: `869510d` `c71db6d` (4/29 오후)** / **hexagon 시계 흰 원형 카드: `4071194` (4/29 오후, v2-full `.hex-center-inner` 패턴)**. C-3 카피 / C-4 도넛 / C-5 C영역(별 트랙) 대기 |
| `pages/admin.html` | ❌ 미진행 (4/28 standalone hex 8건 토큰화는 별건) | — |
| `pages/myspace.html` | ✅ **부분 흡수 (A) Phase 1 완주 — 4/29 저녁 7커밋, 라이브 검수 미완** | 갭 분석 v2: `978904c` / pg-page-header + 카드 토큰: `656aa99` / pg-outer board 정합: `9be9d3c` / 카드 그리드 + 그레이 푸터 + 공통 간격 토큰 5종: `2cd372e` / scripts fetch 400 회귀 수정 + 예시 카드 4건: `efeb1ad` / 4건 통합 정리(상대시간 / 안내박스 / library 시드 3건 / ★ brown): `6ede634` |
| `pages/scripts.html` | ✅ **v2-full 통째 승격 완료** + 폰트 위계 + C영역 ON (4/29 오후, 라이브 검수 미완) | D 영역: `6882753` (v2-full 통째: 세로 탭바 sc-vtab-* + 3열 + brand 단색, --stg-* 폐기, +161/-240) / 폰트 위계: `be40cc6` (vtab 19→20, detail-title 19→21) / C영역 ON: `c96d833` (admin만 숨김 유지, board와 동일 220px rightbar + 진행 상태 박스 추가) |
| `pages/news.html` | ❌ 미진행 + **표준 `.pg-outer` 구조 미준수 (별 트랙 마이그레이션 대기)** | — |
| `pages/quick.html` | 🔄 **공통 간격 토큰 적용 + 그레이 배경 제거 (4/29 저녁, 시안 승격 미진행)** | 토큰: `e5b5afe` (4/29 저녁 — gap 6→16, padding-bottom 24→40, 배경 제거) |
| `pages/together.html` | 🔄 **공통 간격 토큰 적용 + 그레이 배경 제거 (4/29 저녁, 시안 승격 미진행)** | 토큰: `e5b5afe` (4/29 저녁 — gap 8→16, padding 8→6, padding-bottom 24→40, 배경 제거) |

**다음 후보 (우선순위 확정 — `claude_code/design_test/README.md` Phase 1 표)**:
1. ✅ `index.html` (시안 통째 승격 + 헤더/푸터/가입 폼 fix 완료)
2. 🔄 `pages/home.html` (부분 흡수 (C) 트랙 — C-1 + C-2 + hexagon 카드 완료, C-3 카피 / C-4 도넛 대기)
3. ✅ `pages/scripts.html` (v2-full 통째 승격 완료, 라이브 검수 대기)
4. ✅ `pages/board.html` (+ 공통 간격 토큰 적용)
5. ✅ `pages/myspace.html` (부분 흡수 (A) Phase 1 완주, 라이브 검수 대기)
6. `pages/news.html` ← **다음 우선순위** (표준 `.pg-outer` 마이그레이션 선행 필요)
7. `pages/quick.html` (공통 간격 토큰만 적용, 시안 승격 미진행)
8. `pages/together.html` (공통 간격 토큰만 적용, board 패턴 복제 시안 승격 미진행)
9. `pages/admin.html` (Make.com 2단 네비)

### index.html 승격 사전 결정 6건 (2026-04-28 확정)

작업지시서 발행 시 아래 결정에 따라 진행:

| # | 항목 | 결정 |
|:---:|---|---|
| 1 | 적용 방식 | **(A) 시안 통째 승격** (board 패턴) |
| 2 | `inaction-section` 카피 | **(b) 폐기** |
| 3 | `vs-section` BEFORE/AFTER | **(a) 폐기** |
| 4 | `#togetherIntroOverlay` | **(a) 보존** — 시안 `together` 섹션 클릭 트리거에 연결 |
| 5 | 가입 폼 패러다임 | **(a) 시안 인라인 채택** (모달 제거) |
| 6 | privacy/terms 외부 페이지 전환 | **OK** — 시안 폴더의 `privacy.html` / `terms.html`을 라이브 루트로 복사. 라이브 인라인 `#privacy-overlay` 본문 폐기. 가입 동의 체크박스 클릭 시 외부 페이지 새 탭 진입 동선 유지 |

근거 보고서: `docs/sessions/work_index_gap_analysis_2026-04-28.md` (커밋 `902dca0`)

---

## 🚧 미해결 이슈 (인계)

1. **admin standalone hex 8건 토큰화 (4/28 머지 완료)** — admin/v1-full.html 시안이 통째 교체 디자인이라 시안 승격 시 .adm-mini-side 등 토큰화한 클래스가 모두 사라짐. **현재 main에 머지된 상태(`a0bdfbf`)로 둘지 / revert할지 결정 대기**.
2. **B 사이드바 "함께해요" 활성 오작동** — home 진입 시 잘못된 메뉴 활성. home.html과 무관한 app.html 책임 영역. home 작업 트랙과 분리 (별 트랙 진단 대기).
3. **🔥 라이브 검수 부채 통합 누적 (4/29 오후~저녁 13커밋)** — home(줄무늬 + hexagon) + scripts(D영역 v2 + 폰트 위계 + C영역) + **myspace(부분 흡수 7커밋)** + **board/quick/together(공통 간격 토큰 1커밋)** 모두 라이브 검수 미완. C영역 ON으로 D 영역 폭 220px 줄어든 영향도 함께 검수. **통합 검수 시점 결정 시급**.
4. **logo03.jpg 라이트 헤더 사각형 경계** — 이미지 배경 옅은 그레이/아이보리(JPG, 투명 X). index/privacy/terms 헤더에서 경계 보이면 logo05.png 투명본 또는 이미지 편집 별 트랙 (라이브 검수 시점 결정).
5. **app 푸터 셸 최하단 정정 라이브 검수 미완** (`79c0052`, 4/29 오전) — 8페이지 첫 화면 D 작업 공간 회복(약 +196px) / body 스크롤 끝 푸터 등장 / A1·B·C sticky 동작 / 사업자 정보 모달 / 모바일 wrap — 실제 브라우저 검수 대기.
6. **terms/privacy 닫기 버튼 라이브 검수 미완** (`710d452`, 4/29 오전) — 새 탭 환경 `window.close()` + `index.html` fallback 동작 + 직접 URL 진입 fallback 확인 대기.
7. **scripts 동적 STEP 표시 별 트랙** — C영역 "진행 상태 / 단계 선택 중" 박스 현재 정적. STEP 1/2/3 진입 시 "현재 STEP X — Y 선택 중"으로 동적 갱신 미구현 (`c96d833` 후속).
8. **scripts v2 sticky 세로 탭바 미이식** — v2-full `.sc-vtab-wrap { position: sticky }` 미적용 (라이브 환경 보장 어려워 보수적 제외). 라이브 검수 후 필요 시 보강.
9. **scripts top_category 컬럼 활용 미정** — Supabase select 포함되었으나 화면 미렌더. sc-detail-tag에 title 대신 top_category 표시 등 작업지시서 의도 확인 시 별 트랙.
10. **(신규 4/29 저녁) news.html 표준 `.pg-outer` 구조 마이그레이션** — 현재 자체 `.news-outer`/`.news-header`/`.news-tab-bar` 사용. 공통 간격 토큰 적용 + 시안 승격 진입 전 표준 구조 정합 필요.
11. **(신규 4/29 저녁) 안내박스 글로벌 클래스 `.pg-guide` 정착** — myspace `.mys-guide` + board `.hub-notice` 통합. 현재 클래스 분리 + 톤만 정합.
12. **(신규 4/29 저녁) `.mys-card-stage` 클래스 JS 인라인 정리** — 클래스 정의는 추가됐으나 `renderScriptsList`/`renderLeaderList`에서 인라인 스타일 출력 중. JS 변경 0건 원칙으로 분리 보류.
13. **(신규 4/29 저녁) myspace 검색 모드 예시 카드 인터랙션 미정의** — 검색 결과 0건이어도 예시 카드 1페이지 노출.
14. **(신규 4/29 저녁) myspace view-write 폼 stage select 부재** — 예시 카드 클릭 시 stage 자동 입력 미적용. 폼 DOM 변경 결정 후 별 트랙.
15. **(신규 4/29 저녁) `_SAMPLE_LIBRARY` url/content 빈값** — BMI/연령표/보장분석 3건 url/content 빈값 상태. 팀장님 추후 실제 데이터 별 트랙.

---

## 📋 결정 대기 항목

1. **GPT v1 트랙 폐기 명문화** — 4/28 사용자 발언("심야 결정 무시")으로 묵시적 폐기. **4/29 작업 디렉토리 GPT v1 잔재(home.html 4/27 저녁 튜닝) (a) 폐기 결정 + design_test/README 원칙 #6 사례 추가(`c2e2d86`)로 묵시→명시 한 단계 진행.** 명문 결정 문서(`docs/decisions/2026-04-29_gpt_v1_deprecation.md`) 신설은 여전히 대기.
2. **admin standalone hex 8건 처리** — 위 미해결 이슈 #1 참조.
3. **(신규 4/29 저녁) 라이브 검수 통합 시점** — 4/29 오후~저녁 13커밋 누적. 다음 세션 시작 시 검수 단일 시점 진행 권장.
4. **(신규 4/29 저녁) news 작업 진행 순서** — (옵션 ①) 표준 `.pg-outer` 마이그레이션 선행 → 간격 토큰 적용 → 시안 승격 / (옵션 ②) 시안 승격 시 표준 구조 일괄 정합. 결정 필요.

### 📝 4/28 결정 완료 (참고)
- ✅ **design_test 트랙 활성 여부** — 메인 트랙으로 명시 확정 (`design_test/README.md` 갱신 + 본 _INDEX.md)
- ✅ **7페이지 승격 우선순위** — README Phase 1 표 1~9번 순서 확정
- ✅ **index.html 승격 사전 결정 6건** — 시안 통째 승격 + 헤더/푸터/가입 폼 fix 모두 완료
- ✅ **home.html 부분 흡수 결정 10건** (2026-04-28, 갭 분석 v2 `d20cb05` 기반):
  · 적용 방식 (C) 부분 흡수 — 단계 분할 C-1→C-2→C-3→C-4 (C-5 별 트랙)
  · 우선순위: hero 통계(1) → 배지 dot(2) → 카피(3) → 도넛(4)
  · 옵션 B 회피: HTML 영역 별도 컨테이너 분리
  · 4/24 확정 레이아웃 절대 보존 + A2 미리보기 + 6방향 툴팁 보존
  · 클래스 체계 라이브 컨벤션 (`home-` 접두) 유지
  · B 사이드바 오작동·C 영역 콘텐츠는 별 트랙 (app.html 책임)
  · **각 단계 완료 후 라이브 검수 1회 → 다음 단계 진입** (단일 브랜치 / 단일 커밋 / `--no-ff` 머지)

---

## 🗓️ 최신 세션 요약 (시간 역순)

- `docs/sessions/2026-04-29_1932.md` — 4/29 저녁 (7커밋 + 5머지 / **myspace Phase 1 단일 세션 완주: 갭 분석 v2 → 부분 흡수 → pg-outer board 정합 → 카드 그리드 + 그레이 푸터 + 공통 간격 토큰 5종 글로벌 등록 → scripts fetch 400 회귀 수정 + 예시 카드 4건 → 4건 통합 정리(상대시간 / 안내박스 / library 시드 3건 / ★ brown)** / **3페이지 공통 간격 토큰 적용(board/quick/together) + board hub-notice 톤 정정** / 신규 부채 6건)
- `docs/sessions/work_myspace_gap_analysis_2026-04-30.md` — 4/29 저녁 myspace 갭 분석 v2 (3개 탭 전체 비교, 권장안 (A) 부분 흡수)
- `docs/sessions/2026-04-29_1348.md` — 4/29 오후 (6커밋 + 6머지 / home C-2 줄무늬 디바이더 신설+정정 / home hexagon 흰 원형 카드 / scripts v2-full D영역 통째 승격 / scripts 폰트 위계 / scripts C영역 ON+진행 상태 박스 / 정합성 사고 2회 즉시 보고)
- `docs/sessions/2026-04-29_0657.md` — 4/29 오전 (푸터 트랙 4커밋: 4컬럼 → 카피라이트 단일 → 한 줄 미니+모달 → 셸 최하단 정정 / index/privacy/terms 카피라이트 동기화 / terms/privacy 돌아가기→닫기 / design_test/README 갱신 3건)
- `docs/sessions/2026-04-28_1929.md` — 4/28 저녁 (대규모 27 커밋: A1 라이트 톤 / sweep 4슬롯 / 컨텍스트 방어 인프라 / index 시안 통째 승격 + fix 다수 / home 갭 분석 v1·v2 + C-1)
- `docs/sessions/work_home_gap_analysis_2026-04-28_v2.md` — 4/28 home 갭 분석 v2 (결론 정정, 5개 영역 정확 비교, 결정 10건 도출)
- `docs/sessions/work_home_gap_analysis_2026-04-28.md` — 4/28 home 갭 분석 v1 (참조용 보존, 결론은 v2가 최종)
- `docs/sessions/work_index_header_a1_pattern_2026-04-28.md` — 4/28 index 헤더 A1 패턴 이식 분석
- `docs/sessions/work_index_mobile_review_2026-04-28.md` — 4/28 index 모바일 전면 재검토
- `docs/sessions/work_index_gap_analysis_2026-04-28.md` — 4/28 index.html 승격 진입 전 갭 분석 (사전 결정 6건 도출)
- `docs/sessions/2026-04-28_0004.md` — 4/28 심야 (home GPT v1 회귀, /session-end 중단)
- `docs/sessions/2026-04-27_pre_sweep_diagnosis.md` — 4/27 sweep 진입 전 시스템 안정성 진단
- `docs/sessions/2026-04-27_fallback_sweep_scan.md` — 4/27 fallback 부채 전수 스캔
- `docs/sessions/2026-04-27_1905.md` — 4/27 저녁
- `docs/sessions/2026-04-27_fallback_debt_finding.md` — 4/27 옛 브라운 fallback 발견
- `docs/sessions/2026-04-27_gap_analysis.md` — 4/27 9페이지 갭 분석

---

## 📌 폐기 / 보류된 트랙

- **`claude_code/design_test/gpt_v1/` 트랙** (4/27 도입, 4/28 묵시적 폐기, **4/29 한 단계 진행**) — GPT 이미지 생성 PNG 시안 4종(home/board/myspace/scripts). home 흡수 시도 → 회귀 → 사용자 "심야 결정 무시" 발언으로 폐기 해석. **4/29 작업 디렉토리 home.html GPT v1 잔재 (a) 폐기 결정 + design_test/README 원칙 #6 사례 명문화(`c2e2d86`)** — 묵시→명시 한 단계 진행. 결정 문서는 여전히 대기.
- **구버전 Supabase `qursjteiovcylqiepmlo`** (4/24 사고 후 폐기) — `pdnwgzneooyygfejrvbg`(신버전)이 유일 진실 원천.

---

## 🔄 진행 중·완료된 별건 트랙 (메인 트랙과 분리)

| 트랙 | 상태 | 근거 |
|---|---|---|
| **fallback sweep** (옛 브라운 6값 → 새 토큰 본체) | ✅ 4슬롯 완료 (4/28 누적 346건) | `70fd368` `2b9a4b0` `f2db460` `6587254` |
| **admin standalone hex 8건 토큰화** | ⚠️ 머지 완료, 시안 승격 시 무효 가능 | `a0bdfbf` (4/28) |
| **A1 헤더 라이트 톤 + 모바일 반응형** | ✅ 완료 (4/28) | `fd8b264` `1ab35c4` |
| **빠른실행 v2 사양 메모리 등록** | ✅ 등록 완료 (코드 변경 없음, 향후 작업 대기) | `project_quick_overlay_v2_spec.md` |
| **app 푸터 트랙 (4컬럼 → 한 줄 미니 → 셸 최하단)** | ✅ 완료 (4/29 오전, 라이브 검수 대기 — 미해결 #5) | `54cd148` `fa835d2` `ae669d0` `79c0052` |
| **카피라이트 사이트 전체 onesecond 단일 표기** | ✅ 완료 (4/29 오전) | `216ce9f` (index/privacy/terms 동기화) |
| **terms/privacy 돌아가기 → 닫기 버튼** | ✅ 완료 (4/29 오전, 라이브 검수 대기 — 미해결 #6) | `710d452` |
| **design_test/README 갱신 (토큰 확장 절 + Phase 1 표 동기화 + 원칙 #6 사례 5건)** | ✅ 완료 (4/29 오전) | `c2e2d86` |
| **home hero 줄무늬 그라데이션 디바이더** | ✅ 완료 (4/29 오후, 라이브 검수 대기 — 미해결 #3) | `869510d` (5개 신설) `c71db6d` (480px 정정) |
| **home hexagon 시계 흰 원형 카드** (v2-full `.hex-center-inner` 패턴) | ✅ 완료 (4/29 오후, 라이브 검수 대기 — 미해결 #3) | `4071194` (DOM 무변경, CSS만) |
| **scripts D영역 v2-full 통째 승격** | ✅ 완료 (4/29 오후, 라이브 검수 대기 — 미해결 #3) | `6882753` (+161/-240, 세로 탭바 + 3열 + brand 단색) |
| **scripts 컬럼 1·4 폰트 위계 회복** | ✅ 완료 (4/29 오후) | `be40cc6` (vtab 19/20 + detail-title 21) |
| **scripts C영역 표시 ON + 진행 상태 박스** | ✅ 완료 (4/29 오후, 라이브 검수 대기 — 미해결 #3) | `c96d833` (admin만 숨김 유지, board 동일 220px) |
| **myspace 갭 분석 v2 (3개 탭 전체)** | ✅ 완료 (4/29 저녁) | `978904c` (work_myspace_gap_analysis_2026-04-30.md, 권장안 (A) 부분 흡수) |
| **myspace 부분 흡수 — pg-page-header + 카드 토큰** | ✅ 완료 (4/29 저녁, 라이브 검수 대기 — 미해결 #3) | `656aa99` |
| **myspace `.pg-outer` board 정합 통일** | ✅ 완료 (4/29 저녁) | `9be9d3c` (그레이 배경 제거 → 흰색 비침) |
| **myspace 카드 그리드 + 그레이 푸터 + 공통 간격 토큰 5종 글로벌 등록** | ✅ 완료 (4/29 저녁, 라이브 검수 대기 — 미해결 #3) | `2cd372e` (tokens.css `--pg-header-bottom`/`--pg-tab-bottom`/`--pg-content-gap`/`--pg-item-gap`/`--pg-side-padding`) |
| **myspace scripts fetch 400 회귀 수정 + 예시 카드 4건** | ✅ 완료 (4/29 저녁, 라이브 검수 대기 — 미해결 #3) | `efeb1ad` (`,updated_at` 제거 + `_SAMPLE_CARDS` + dismiss/restore + localStorage `os_myspace_dismissed_samples`) |
| **myspace 4건 통합 정리** | ✅ 완료 (4/29 저녁, 라이브 검수 대기 — 미해결 #3) | `6ede634` (① 상대시간 7~30일 'N주 전' / ② `.mys-guide` 톤 / ③ library 시드 3건 + `os_myspace_dismissed_library_samples` / ④ ⭐→★ brown 통일) |
| **3페이지 공통 간격 토큰 적용 + board `.hub-notice` 톤 정정** | ✅ 완료 (4/29 저녁, 라이브 검수 대기 — 미해결 #3) | `e5b5afe` (board/quick/together — quick·together 그레이 배경 제거 / hub-notice transparent + border:none) |

---

## 🔗 참고 문서

- `claude_code/design_test/README.md` — 디자인 테스트 워크스페이스 전역 규칙
- `docs/decisions/2026-04-25_holds_and_priorities.md` — 보류 항목·우선순위
- `docs/role_system.md` — 9개 role 체계
- `docs/work_order_template.md` — 작업지시서 표준 템플릿 (0번 정합성 검증 필수)

---

*본 인덱스는 `/session-end` 슬래시 커맨드 5단계에서 자동 갱신됩니다. 수동 편집 시 `마지막 갱신` 날짜를 함께 갱신하세요.*
