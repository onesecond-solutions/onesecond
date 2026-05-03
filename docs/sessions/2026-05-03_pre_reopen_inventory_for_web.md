# 재오픈(v1.1, 5/10ish) 전까지 전수 작업 청사진 — Web 인계용

> **작성:** Code (Claude Code) · **작성일:** 2026-05-03 · **수신:** Web (Claude AI 웹 채팅)
> **목적:** 재오픈 전까지 남은 전수 작업 청사진 인계 + 웹과 상의할 결정·전략 항목 별도 정리
> **재오프 정의:** v1.1 출시 = 5/10(월)ish 4팀 40명 내부 오픈 (메모리 `priorities.md` 기준 — 다른 마일스톤이면 § 0 가정 정정 필요)

> 본 문서는 팀장님 요청으로 Code가 일정과 무관하게 **현재 살아있는 모든 작업 항목**을 펼친 보고서입니다.
> 웹은 본 문서를 기반으로 (1) 우선순위 재정렬, (2) 결정 대기 항목 의사 결정 보조, (3) 사업·전략 판단을 도와주시면 됩니다.
> 코드 작업(SQL·HTML·JS·CSS 변경)은 Code가 처리하니 본 문서는 **결정·전략 의논 위주**로 활용해 주세요.

---

## 0. 가정 + 진실 원천

| 항목 | 값 |
|---|---|
| 작성 시점 | 2026-05-03 |
| "재오프" 가정 | v1.1 출시 = 5/10(월)ish 4팀 40명 내부 오픈 (메모리 `priorities.md`) |
| 진실 원천 (Supabase) | `pdnwgzneooyygfejrvbg` (프로젝트명 `onesecond-v1-restore-0420`) — 신버전·유일 |
| GitHub 저장소 | https://github.com/onesecond-solutions/onesecond |
| 마지막 커밋 | `5516e4e` (2026-05-02 20:02 인계 노트) |
| 미커밋 변경 | 없음 (깨끗) |
| 직전 인계 노트 | `docs/sessions/2026-05-02_2002.md` |
| 큰 그림 인덱스 | `docs/sessions/_INDEX.md` |

---

## 1. 한눈에 완성도

```
🎯 메인 트랙 = admin_v2.html Phase D (관리자 콘솔 풀 스케일)

Phase A (분석)        ████████████████████ 100% ✅
Phase B (골격)        ████████████████████ 100% ✅
Phase B-2 (가독성)    ████████████████████ 100% ✅
Phase B 마무리 5건    ████████████████████ 100% ✅
Phase C (7섹션 mock)  ████████████████████ 100% ✅
Phase C 뱃지 AA       ████████████████████ 100% ✅
─────── D-pre 시리즈 (사전 정합 청산) ───────
D-pre  (사전 분석)    ████████████████████ 100% ✅ (5/1)
D-pre.5 (status 컬럼) ████████████████████ 100% ✅ (5/2)
D-pre.6 (role 정합)   ████████████████████ 100% ✅ (5/2)
D-pre.7 (RLS 청산)    ████████████████████ 100% ✅ (5/2 저녁)
─────── 본 진입 (실 데이터 연결) ───────
D-1 users             ░░░░░░░░░░░░░░░░░░░░  0% 🟡 작업지시서·결정 8건 ready
D-2 content           ░░░░░░░░░░░░░░░░░░░░  0% ⏳
D-3 board             ░░░░░░░░░░░░░░░░░░░░  0% ⏳
D-4 notice            ░░░░░░░░░░░░░░░░░░░░  0% ⏳
D-5 analytics         ░░░░░░░░░░░░░░░░░░░░  0% ⏳
D-6 logs              ░░░░░░░░░░░░░░░░░░░░  0% ⏳
D-7 billing           ░░░░░░░░░░░░░░░░░░░░  0% ⏳
D-8 dashboard 종합    ░░░░░░░░░░░░░░░░░░░░  0% ⏳
D-9 NH 원수사 유료화  ░░░░░░░░░░░░░░░░░░░░  0% 🛑 v1.1 후 재논의 보류
D-final 보안 검증     ░░░░░░░░░░░░░░░░░░░░  0% ⏳
```

**현재 위치 한 줄:**
DB·정합 청산은 100% 완료(D-pre 4단계). 본 데이터 연결(D-1~D-8 + D-final)은 0% 시작 — 다음 세션이 첫 코드 변경.

---

## 2. 카테고리별 전수 작업 (총 52건)

### 2.1 메인 트랙 — admin_v2 Phase D

| # | 작업 | 상태 | 비고 |
|---|---|---|---|
| 1 | **D-1 users 실 데이터 연결** | 🟡 진입 대기 | Step 1: `js/admin_v2.js` 신설 / Step 5: `auth.js` 라인 174 PATCH / Step 7: 라이브 검증 |
| 2 | D-2 content (scripts/자료실 + stage 10단계 RPC) | ⏳ 대기 | |
| 3 | D-3 board (posts + post_reports + 모더레이션) | ⏳ 대기 | |
| 4 | D-4 notice (app_settings + 노출 기간 + role 분기) | ⏳ 대기 | |
| 5 | D-5 analytics (DAU/WAU/MAU RPC + 기능별) | ⏳ 대기 | |
| 6 | D-6 logs (activity_logs + system_logs) | ⏳ 대기 | |
| 7 | D-7 billing (payments + subscriptions + 4플랜) | ⏳ 대기 | |
| 8 | D-8 dashboard 종합 (KPI 4 + timeline 실 연결 + B-2 뱃지 토큰 묶음) | ⏳ 대기 | |
| 9 | D-final 보안 검증 (9역할 RLS + admin 게이트) | ⏳ 대기 | |

### 2.2 카톡 → 원세컨드 마이그레이션 (재오프의 본질)

> 출처: 메모리 `kakao_migration_strategy.md` / `priorities.md`
> 4팀 단톡방 9.5개월간 첨부파일 165개. 평월 17파일 안정 리듬.

| # | 작업 | 상태 |
|---|---|---|
| 10 | 5계층 파이프라인 인프라 구축 (Storage 버킷 + RLS + file_uploads/posts/categories/tags 테이블 + admin 단일 업로드 폼 + 다운로드 미리보기 + 검색) | ⏳ 미착수 |
| 11 | 카톡 export 방식 결정 (Android webhook / PC 매크로 / 수동) | ⏳ 결정 대기 |
| 12 | Make.com 시나리오 + AI 모델(Claude/OpenAI/Gemini) 통일 | ⏳ 결정 대기 |
| 13 | WAV 29개 용량 측정 → Supabase Storage 1GB 초과 여부 + 외부 CDN 결정 | ⏳ 결정 대기 |
| 14 | 카톡 165 파일 정제·업로드 (메타 박제) | ⏳ 미착수 |
| 15 | "한재성 실장" 정체 확정 (admin 본 계정 vs 별도 ga_manager) | ⏳ 결정 대기 |
| 16 | 체감 Top 5 자료(팀원이 자주 다시 찾는 것) 답변 | ⏳ 답변 대기 |

### 2.3 라이브 검수 부채 — 4/29~4/30 누적 17커밋 (미해결 #3)

| # | 페이지 | 작업 |
|---|---|---|
| 17 | home | 줄무늬 디바이더 + hexagon 시계 |
| 18 | scripts | D영역 v2-full + 폰트 위계 + C영역 ON |
| 19 | myspace | Phase 1 완주 7커밋 |
| 20 | board / quick / together | 공통 간격 토큰 |
| 21 | quick / together / news | 4/30 4커밋 (헤더 brown / MY SPACE 룩 / 헤더·푸터 통일) |
| 22 | app 푸터 셸 최하단 정정 (#5) | |
| 23 | terms / privacy 닫기 버튼 (#6) | |

### 2.4 design_test 시안 승격 — 미완 페이지

| # | 페이지 | 상태 |
|---|---|---|
| 24 | `pages/home.html` | C-3 카피 / C-4 도넛 / C-5 C영역 대기 |
| 25 | `pages/quick.html` | 시안 승격 미진행 |
| 26 | `pages/together.html` | 시안 승격 미진행 |

### 2.5 미해결 이슈 (자잘한 결함·미정착)

| # | 이슈 |
|---|---|
| 27 | B 사이드바 "함께해요" 활성 오작동 (home 진입 시) |
| 28 | logo03.jpg 라이트 헤더 사각형 경계 (logo05.png 투명본 또는 편집) |
| 29 | scripts 동적 STEP 표시 별 트랙 |
| 30 | scripts v2 sticky 세로 탭바 미이식 |
| 31 | scripts top_category 컬럼 활용 미정 |
| 32 | 안내박스 글로벌 클래스 `.pg-guide` 정착 (myspace `.mys-guide` + board `.hub-notice` 통합) |
| 33 | `.mys-card-stage` 클래스 JS 인라인 정리 |
| 34 | myspace 검색 모드 예시 카드 인터랙션 미정의 |
| 35 | myspace view-write 폼 stage select 부재 |
| 36 | `_SAMPLE_LIBRARY` url/content 빈값 |

### 2.6 별 트랙 후보 (admin_v2 Phase C 확정 후 발견)

| # | 트랙 | 설명 |
|---|---|---|
| 37 | B-1 차트 SVG grid line 토큰화 | dashboard / D-3 / D-5 일관 |
| 38 | B-2 dashboard 기본 뱃지 7종 토큰 마이그레이션 | D-8 진입 시 묶음 |
| 39 | B-3 light 액센트 #D4845A borderline 검토 | 우선순위 낮음 |

### 2.7 잔존 부채 (D-pre.7 인계 § 4.3)

| # | 부채 |
|---|---|
| 40 | `posts` 숨김 게시물 admin SELECT 정책 (사업 판단 필요) |
| 41 | CLAUDE.md § 9역할 표 동기화 ("원수사 일반 직원" → "원수사 직원") |
| 42 | KPI 추세 통계 함수 신설 (D-8 진입 시) |
| 43 | `window.db.patch()` 메서드 신설 (Phase D 완료 후) |

### 2.8 결정 대기 항목

| # | 항목 |
|---|---|
| 44 | GPT v1 트랙 폐기 명문 결정 문서 신설 (`docs/decisions/2026-04-29_gpt_v1_deprecation.md`) |
| 45 | 라이브 검수 통합 시점 |
| 46 | myspace 갭 분석 6항목 결정 (`work_myspace_gap_analysis_2026-04-30.md` 기반) |
| 47 | v1.1 시나리오 최종 결정 (E 5/10 / D 5/6 / 기타) |

### 2.9 별건 큰 트랙 (재오프 후로 보류 명시 — 참고용)

| # | 트랙 | 보류 사유 |
|---|---|---|
| 48 | 보험뉴스 자동 증식 시스템 | 4~6주 큰 프로젝트, 9개 미답변 (`news_system.md`) |
| 49 | 9개 role 가입 폼 분리 | 비즈니스 로직(가입 경로·결제·매핑) 선행 필요 (`role_signup_holds.md`) |
| 50 | D-9 NH 원수사 유료화 | v1.1 출시 + 1~2주 안정화 후 (`nh_insurer_paid_track.md`, 결정 문서 ✅) |
| 51 | 4팀 비밀의 공간 (웜 다크 토큰 prefix `--team4-*`) | admin_v2 완료 후 별 트랙 |
| 52 | 5/9~10 주말 패키지 (UI 스케일 슬라이더 / Sticky Nav / Safari backdrop) | 별 트랙 |

---

## 3. 🤝 웹과 상의할 항목 — 우선순위별

> Code 작업(코드 변경)은 Code가 처리하니, 웹은 아래 항목을 중심으로 의사 결정·전략·우선순위 조언을 부탁드립니다.

### 3.1 🔴 최우선 — 재오프 일정·시나리오 결정

| # | 안건 | 의논 포인트 |
|---|---|---|
| A | **v1.1 시나리오 최종 확정 (E / D / 기타)** | 메모리 `priorities.md` 기준 시나리오 E(5/10 오픈, 13일 일정)가 권장이지만 미확정. **재오프까지 일주일** 시점에 Code/웹 모두 어떤 시나리오 기준으로 일하는지 정렬 필요 |
| B | **우선순위 재정렬** | 현재 ① 메인 트랙(admin_v2 D-1~D-8) 9건, ② 카톡 마이그레이션 인프라+165 파일 7건, ③ 라이브 검수 17커밋이 동시에 살아있음. 재오프 일주일 안에 다 못함. **무엇을 자를지/늦출지 결정** 필요 |
| C | **메인 트랙 vs 카톡 마이그 우선순위** | `priorities.md`에서는 "디자인보다 콘텐츠가 더 급" → 카톡 우선 권장. 그러나 현 진행 상태는 admin_v2 메인 트랙이 90% / 카톡 0%. **이 갭을 어떻게 다룰지** 결정 |

### 3.2 🟡 카톡 마이그레이션 결정 5건 (재오프의 본질)

> 메모리 `kakao_migration_strategy.md` § "시작점에 확정 필요 정보"

| # | 결정 | 후보 |
|---|---|---|
| D | 카톡 export 방식 | (a) Android 공유 webhook / (b) PC 매크로 / (c) 수동 .txt |
| E | Make.com 운영 시나리오 | 현재 운영 중인 시나리오 위에 얹는지 / 신규 |
| F | AI 모델 통일 | Claude / OpenAI / Gemini |
| G | WAV 29개 용량 정책 | Supabase Storage 1GB 무료 초과 시 → 외부 CDN / 유료 업그레이드 |
| H | "한재성 실장" 정체 | admin `bylts0428` 본인 호칭 / 별도 ga_manager 계정 신설 |
| I | 체감 Top 5 자료 | 팀원이 자주 다시 찾는 자료 5종 (단톡방 빈도와 별개) |

### 3.3 🟢 사업·전략 판단 (Code가 결정 못 함)

| # | 안건 | 비고 |
|---|---|---|
| J | `posts` 숨김 게시물 admin SELECT 정책 | 모더레이션 권한 범위 — admin이 숨김 게시물도 볼지 결정 (잔존 부채 #40) |
| K | 보험뉴스 시스템 9개 미답변 | 4~6주 큰 프로젝트 — 재오프 후로 미루는 게 정합인지 재확인 |
| L | 9개 role 가입 폼 분리 | 가입 경로·결제·매핑 비즈니스 로직 선행 필요 — 사업 그림 명문화 시점 결정 |
| M | NH 원수사 유료화 (D-9) | 결정 문서는 ✅ 완료 (`docs/decisions/2026-05-02_insurer_paid_strategy.md`). v1.1 후 재논의 트리거 명확화 |

### 3.4 🔵 운영·문서 정합

| # | 안건 |
|---|---|
| N | GPT v1 트랙 폐기 명문 결정 문서 신설 (4/29부터 묵시→명시 한 단계 진행, 결정 문서만 대기) |
| O | 라이브 검수 통합 시점 (4/29~4/30 누적 17커밋, 메인 트랙과 별 트랙으로 병행 가능) |
| P | myspace 갭 분석 6항목 결정 (`work_myspace_gap_analysis_2026-04-30.md` 기반 부분 흡수 작업지시서 발행 트리거) |

---

## 4. Code가 다음 세션 진입 시 기본 행동 (참고)

웹이 우선순위 재정렬 결정 전이라면, Code는 아래 기본 흐름으로 진입합니다:

1. `_INDEX.md` + 본 문서 정합성 검증
2. **D-1 admin_v2 users 실 데이터 연결 Step 1 진입** (작업지시서 + 결정 8건 확정 완료, 진입 안전 확정 ✅)
3. Step 1 완료 → Step 5 (`auth.js` last_seen_at PATCH) → Step 7 (라이브 검증)

**웹이 다른 트랙(카톡 마이그 / 라이브 검수 / 사업 판단) 우선 지시를 내리면 즉시 전환** 가능합니다.

---

## 5. 참고 인계 문서

- `docs/sessions/_INDEX.md` — 큰 그림 마스터 인덱스
- `docs/sessions/2026-05-02_2002.md` — 직전 세션 인계 노트 (D-pre.7 사고 + 청산 + § 9 후속 정정)
- `docs/decisions/2026-05-02_insurer_paid_strategy.md` — D-9 NH 원수사 유료화 보류 결정
- `docs/architecture/db_pre_dpre7_capture.md` — D-pre.7 RLS 자기 참조 청산 학습
- `docs/specs/admin_v2_phase_d_pre.md` — D-pre 사전 분석 + D-1 시범 코드
- `docs/architecture/role_migration_plan.md` — 9역할 SQL 초안 + 롤백
- 메모리 `priorities.md` / `kakao_migration_strategy.md` / `nh_insurer_paid_track.md` / `news_system.md` / `role_signup_holds.md`

---

*본 문서는 Code(Claude Code)가 2026-05-03 팀장님 요청으로 일회성 인계용으로 작성. 결정·전략 의논 결과는 별도 결정 문서(`docs/decisions/`) 또는 `_INDEX.md`로 명문화 권장.*
