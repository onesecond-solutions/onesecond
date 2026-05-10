# Phase 1.5 작업지시서 — home_v2 가입/로그인 통합 + index.html 흡수

> **작성일:** 2026-05-09 저녁 (5/9 저녁 옵션 Y' 채택 후)
> **메인 트랙:** Phase 1.5 즉시 흡수 (5/9 저녁 결정)
> **선행 종료:** Step 5-A (사전 캡처) + 5-B (DB 신설 RPC 2 + RLS 1 + 28사 도메인) + 5-C (handle_new_user trigger 정정 + index.html 가입 폼)
> **본 작업지시서 본질:** index.html에 박힌 가입 폼 코드(434줄)를 home_v2.html로 위치 이전 + login.html 흡수 + index.html → home_v2 redirect.
> **분량 추정:** ~3.5세션 (5/9 저녁 ~ 5/15 안에 완성 가능).
> **진실 원천 보강:** 메모리 [phase_1_5_index_home_absorption.md] + _INDEX.md 메인 트랙 + spec v2 § 9-1-bis.

---

# § 1. 진입 컨텍스트

## 1-1. 5/9 저녁 결정 흐름

| 시점 | 사건 |
|---|---|
| 5/9 점심 | Step 2-bis 본질 종료 (8/18) — Step 5 다음 메인 트랙 |
| 5/9 오후 | Step 5 작업지시서 발행 + 결재 9건 + Step 5-A/5-B 종료 |
| 5/9 저녁 (Step 5-C 본 빌드) | index.html 가입 폼 +434줄 + handle_new_user trigger 정정 |
| 5/9 저녁 (라이브 테스트) | branches RLS FK 위반 23503 발견 |
| 5/9 저녁 (팀장님 지적) | "인덱스 안 쓸 건데 시간지체할 필요 있냐?" |
| 5/9 저녁 (Code 분석) | 옵션 X / Y' / Z 분석 → Code 추천 = Y' |
| 5/9 저녁 (팀장님 결재) | **(Y') Phase 1.5 즉시 흡수 채택** ⭐ |

## 1-2. 본질 정합 — Sunk Cost 0

| Step 5 박힌 작업 | Phase 1.5 활용 |
|---|---|
| 5-B DB 신설 (RPC 2 + RLS 1 + 28사 도메인 UPDATE) | **100% 재사용** (DB 레벨, 위치 무관) |
| 5-C handle_new_user trigger 4컬럼 추가 | **100% 재사용** (DB 레벨) |
| 5-C index.html 가입 폼 (사이트 분기 + 4중 방어 + 9역할 매핑, 434줄) | **로직 100% 재사용 + UI는 home_v2로 이전** |

→ **폐기 0건. 위치 이전만.**

## 1-3. Phase 1.5 본질 (strategy_overview § 8-4 + § 6-12 정합)

- **index.html 단순 랜딩 약화 → home.html이 index 역할 흡수**
- **비로그인 미리보기 + hover preview reveal UX**
- **폴더형 메뉴 + 슬라이드/페이드**
- **5/15 4팀 약 40~50명 오픈 = home_v2.html이 메인 진입로**

## 1-4. 5/15 일정 정합

- 5/15까지 6일 = ~3.5세션 분량 home_v2 가입/로그인 통합 가능
- Phase 1 잔여 (Step 6~16, ~7.8세션) = 5/15 후 진행 (4팀 오픈 후 가입 흐름만 우선 사용)

---

# § 2. 라이브 raw

## 2-1. 현재 라이브 진입 동선

```
사용자 첫 진입 → index.html (랜딩 + #signup 인라인 가입 폼, Step 5-C +434줄)
                  ↓
  로그인 클릭 → login.html (485줄, 로그인 폼 + 비밀번호 찾기)
                  ↓
  로그인 성공 → app.html (인증 후 메인 SPA 셸, B 사이드바 + D 콘텐츠)
                  ↓
  pages/home.html (6각 다이어그램 홈, app.html이 D영역에 주입)
```

## 2-2. Phase 1.5 후 진입 동선 (목표)

```
사용자 첫 진입 → home_v2.html (랜딩 + 비로그인 미리보기 + hover preview reveal + 가입/로그인 인라인 또는 모달)
                  ↓
  가입 또는 로그인 → 같은 페이지 안에서 처리 (별도 페이지 이동 X)
                  ↓
  로그인 성공 → app.html (인증 후 메인 SPA 셸)
                  ↓
  pages/home.html (6각 다이어그램 홈, 보존 또는 home_v2로 흡수 — 별 결재)
```

## 2-3. 파일 라인 수 raw

| 파일 | 라인 수 | 본질 |
|---|---|---|
| `index.html` | 2,529 (Step 5-C +434 후) | 랜딩 + 가입 폼 — Phase 1.5에서 redirect 또는 폐기 |
| `login.html` | 485 | 로그인 폼 + 비밀번호 찾기 — Phase 1.5에서 home_v2 흡수 |
| `pages/home_v2.html` | 797 (5/9 신설, 단독 디자인 미리보기) | Phase 1.5 메인 진입로 — 가입/로그인 통합 본 빌드 진입 |
| `pages/home.html` | 1,116 | 인증 후 사용자 홈 (6각 다이어그램) — 별 결재 (보존 vs home_v2 흡수) |

## 2-4. login.html 흡수 핵심 로직 (라인 350~389)

- POST /auth/v1/token?grant_type=password
- 성공 → localStorage `os_token` + `os_user` + redirect to app.html
- 실패 → 에러 메시지 4종 (이메일 미인증 / 잘못된 자격 / rate limit / 일반)

→ home_v2에 동일 로직 이전 가능.

---

# § 3. 결재 박스 8건 (DH1 ~ DH8) ✅ **결재 완료 (2026-05-09 저녁 / 야간 후속 갱신)**

> 1차 결재 (5/9 저녁): DH1=(a) / DH2=(a) / DH3=(a) / DH4=(a) / DH5=(a) / DH6=(a) / DH7=(a)
> 2차 결재 (5/9 야간):
>   - DH4 (a) → **(α) 구조 교체 수용** (GPT 신버전 home_v2 흡수, commit `01fd701`)
>   - **DH8 신설 — 통합 모달** (DH1 인라인 + DH2 별 모달 → 한 오버레이 통합으로 재정의)
> 본 § 3 진입 = § 4 작업 단위 진입 권한 확정.

## 3-DH1. home_v2 가입 폼 위치

| 옵션 | 설명 |
|---|---|
| (a) **Hero 아래 인라인 신설 섹션** ⭐ Code 추천 | 시안 정합 (Hero + Feed + 가입 인라인). 시각적 흐름 자연스러움. 모바일에서도 스크롤 자연. |
| (b) Hero에 모달 트리거 + 가입 모달 | UX 클린, 단 모바일 시 풀스크린 모달 부담 |
| (c) 별도 `/signup` URL (home_v2와 분리) | Phase 1.5 본질(index 흡수) 위배 — 부적합 |

**결재:** ✅ **(a) 채택** (2026-05-09 저녁)

## 3-DH2. 로그인 흡수 방식

| 옵션 | 설명 |
|---|---|
| (a) **home_v2에 로그인 모달 통합 + login.html → home_v2 redirect** ⭐ Code 추천 | 단일 진입로. 모달 = 가입 폼과 동일 패러다임. login.html 폐기 (또는 redirect 보존). |
| (b) login.html 그대로 보존 + home_v2의 "로그인" 링크는 login.html로 | 분리 보존. 단 Phase 1.5 본질 (단일 진입로) 약함 |
| (c) home_v2 인라인 로그인 폼 (모달 X) | 한 페이지에 가입+로그인 두 폼 = 시각 혼잡 |

**결재:** ✅ **(a) 채택** (2026-05-09 저녁)

## 3-DH3. index.html 처리

| 옵션 | 설명 |
|---|---|
| (a) **index.html → home_v2.html redirect (1줄 JS 또는 meta refresh)** ⭐ Code 추천 | URL 정합 (기존 link, SEO, 직접 입력 모두 호환). index.html 폐기는 commit 1건 분리 |
| (b) index.html 폐기 (404) | URL 끊김 — 이전 모바일 책갈피, 외부 link 등 깨짐. 부적합 |
| (c) index.html 단순 랜딩 (가입 폼 없음, home_v2로 이동 버튼만) | 트랜지션 페이지. 단 단일 진입로 본질 약함 |

**결재:** ✅ **(a) 채택** (2026-05-09 저녁)

## 3-DH4. hover preview reveal UX

| 옵션 | 설명 |
|---|---|
| (a) ~~현재 home_v2 시안 그대로 (카테고리 탭 + Hero preview 패널)~~ | 5/9 저녁 1차 채택 → 야간 (α)로 갱신 |
| (b) 시안 + 디테일 강화 (preview 풀 콘텐츠 미리보기 등) | 분량 +1~2세션 추가 |
| (c) hover preview 폐기 + 단순 카테고리 탭 | 시안 의도 약함 |
| **(α)** ⭐ **5/9 야간 후속 결재 = 구조 교체 수용** | GPT 신버전 home_v2 흡수 (Top bar 6 메뉴 + Hero 안 preview 패널 + 카드 그리드 3종 + 4 카테고리 image preview + Read more = 페이지 진입). commit `01fd701` 정합. 기존 시안의 카테고리 탭/Feed 카드 시스템은 폐기, hover preview 철학은 보존. |

**결재:** ✅ **(α) 채택** (2026-05-09 야간 후속, 1차 (a) 갱신)

## 3-DH5. 4중 방어 + 9역할 매핑 코드 이전

| 옵션 | 설명 |
|---|---|
| (a) **Step 5-C index.html 코드 100% 이전 (사이트 분기 + 도메인 화이트리스트 + status pending + 직급 매핑)** ⭐ Code 추천 | 작업 폐기 0. 위치 변경만. branches RLS 처방 적용 후 작동. |
| (b) Step 5-C 코드 일부 단순화 후 이전 | 분량 절약, 단 sunk cost 발생 |
| (c) 새로 작성 | sunk cost + 시간 낭비 |

**결재:** ✅ **(a) 채택** (2026-05-09 저녁)

## 3-DH6. 모바일 가입 폼 UX

| 옵션 | 설명 |
|---|---|
| (a) **인라인 폼 (PC와 동일, 반응형 단일 컬럼)** ⭐ Code 추천 | 단순. 시안 home_v2 모바일 패턴 정합 |
| (b) 모바일 시 풀스크린 시트 (iOS 패턴) | 모바일 UX 강화. 단 분량 +0.3세션 |
| (c) 모바일 시 별도 `/signup-mobile` 경로 | 분리 — Phase 1.5 본질 위배 |

**결재:** ✅ **(a) 채택** (2026-05-09 저녁)

## 3-DH7. pages/home.html (인증 후 6각 홈) 처리

| 옵션 | 설명 |
|---|---|
| (a) **보존** ⭐ Code 추천 | 인증 후 home은 별도 컨셉. home_v2 = 비로그인 진입로 / pages/home.html = 인증 후 사용자 홈. 둘 다 보존. |
| (b) home_v2 흡수 (인증 후도 home_v2가 처리) | 분량 +2세션 추가. 6각 다이어그램 트랙 폐기. Phase 2 이후 검토 |
| (c) home_v2 → 인증 후 home.html redirect만 | 단순. 단 home_v2 본질 (랜딩) 한정 |

**결재:** ✅ **(a) 채택** (2026-05-09 저녁)

## 3-DH8. (5/9 야간 후속 결재) DH1 + DH2 통합 모달 — 한 오버레이 안 로그인 + 가입

> **본질:** DH1 (a) Hero 아래 인라인 가입 + DH2 (a) 별 로그인 모달 → 단일 통합 모달로 재정의. 진입점 일원화 + 시각 분리(화이트/그레이) + Top bar "로그인" / "무료 시작하기" 두 버튼 모두 같은 모달 진입.

| 옵션 | 설명 |
|---|---|
| (a) ~~DH1 인라인 + DH2 별 모달~~ | 5/9 저녁 1차 채택 → 야간 갱신 (UX 재고: hover preview UX와 인라인 가입 폼 시각 충돌, home_v2 ~1050줄 부담) |
| **(b)** ⭐ **통합 모달 (상단 로그인 화이트 + 하단 가입 그레이)** | 한 오버레이 + 화이트/그레이 톤 분리. 진입 시 자동 스크롤 분기: "로그인" 클릭=상단 포커스 / "무료 시작하기" 클릭=하단 자동 스크롤. ESC/외부클릭 닫기. 모바일 풀스크린. **Code 자율 결정 항목 (팀장님 위임)**: 모바일 분기(우선 풀스크린, 분량 부담 시 탭 토글), Hero "Read more" 가입 진입 미연결(Read more 철학 보존). |
| (c) 별 페이지 `/signup` + 별 모달 로그인 | UX 단절, 이중 진입로 = 부적합 |

**결재:** ✅ **(b) 채택** (2026-05-09 야간 후속) — DH1 + DH2 (a) 흡수 갱신

**기술 메모:**
- 가입 영역: Step 5-C `index.html` 1704~1956 + JS 2144~ → home_v2 모달 하단으로 이전 (DH5 (a) 정합)
- 로그인 영역: `login.html` 184~270 (로그인 카드 + 비밀번호찾기) + JS 281~423 (`doLogin/doForgot/showLogin/showForgot/togglePw/validate`) → home_v2 모달 상단으로 이전 (DH2 (a) 정합)
- Auth 흐름: POST `/auth/v1/token?grant_type=password` + localStorage `os_token/os_refresh_token/os_user` + redirect to `app.html` (redirect param 지원)
- DH3 (a) `index.html → home_v2.html redirect` 후속 진입 시 단일 진입로 본질 정합

---

# § 4. 작업 분할 (5단계) — ✅ 전 단계 종료 (2026-05-10 새벽 마감)

> 결재 후 진입. 각 단계는 독립 commit + 검증.
>
> | Step | 결과 | commit |
> |---|---|---|
> | 4-A | ✅ | `2b41101` |
> | 4-B+C | ✅ | `9db69c4` (본진) + `d859b9c` (Google UI) |
> | 4-D | ✅ | `0aa50e1` |
> | 4-E | ✅ | `c17c82c` (⑤ 보강) + `fb1c48e` (캡처 의뢰) + `ae04a8e` (UUID 1글자 수정) + `30e7a1f` (브랜드 강조) |
>
> 라이브 회귀 13+2건 = 14 PASS / 1 ⚠️ (⑥ Supabase rate limit, 코드 무관) → 별 트랙 #44 Custom SMTP로 누적.

## 4-A. Step P1.5-A: 사전 분석 + 라이브 raw 캡처 (~30분) ✅

**산출물:**
- `docs/architecture/db_phase15_pre_capture.md`
  - 현재 home_v2.html / index.html / login.html raw 라인 (이미 § 2-3 박힘)
  - branches RLS 처방 결과 캡처 (Chrome 회신 후)
  - 라이브 사용자 분포 회귀

**도구:** Read 분석.

## 4-B. Step P1.5-B: home_v2.html 가입 폼 통합 (Step 5-C 코드 이전, ~2시간) ✅

**작업:**
- index.html 라인 1671~2087 가입 폼 마크업 (사이트 분기 카드 + 보험사/GA 분기 + JS) → home_v2.html에 이전
- DH1 (a) 채택 시 = home_v2 Hero 아래 신설 섹션
- DH5 (a) 채택 시 = 4중 방어 + 9역할 매핑 100% 이전
- DH6 (a) 채택 시 = 인라인 반응형
- 추정 분량: home_v2.html 797 → ~1,100줄 (+300줄)

**라이브 검증:**
- 가입 시도 → success 화면
- 사이트 분기 카드 작동
- 도메인 화이트리스트 검증

## 4-C. Step P1.5-C: home_v2.html 로그인 통합 (~1시간) ✅

**작업:**
- DH2 (a) 채택 시 = home_v2에 로그인 모달 신설 + login.html 핵심 로직 이전
- 라인 1,100 → ~1,250줄 (+150줄)

**기능:**
- 모달 트리거 (Top bar "로그인" 버튼)
- 이메일 + 비밀번호 입력
- POST /auth/v1/token + os_token / os_user localStorage
- 비밀번호 찾기 모달 분기
- 성공 → app.html redirect

## 4-D. Step P1.5-D: index.html → home_v2 redirect (~10분) ✅

**작업:**
- DH3 (a) 채택 시 = index.html 본문 = `<meta http-equiv="refresh" content="0; url=/pages/home_v2.html">` + 1줄 JS fallback
- 또는 index.html 통째 폐기 + GitHub Pages가 404 시 home_v2로 redirect 설정
- 가장 단순: meta refresh + JS

**라이브 검증:**
- index.html 진입 → home_v2.html 즉시 이동
- 외부 link / 책갈피 호환

## 4-E. Step P1.5-E: Chrome 라이브 회귀 + 종료 commit (~30분) ✅

**라이브 회귀 시나리오 9건:**
1. home_v2 진입 (랜딩 + Hero + Feed)
2. hover preview reveal 작동
3. 가입 폼 펼침 → GA 분기 + 더원지점 + 1팀 + 설계사 → success
4. 가입 폼 → 보험사 분기 + 메리츠 + 도메인 일치 + 지점장 → pending
5. 가입 폼 → 보험사 + 도메인 불일치 → 차단
6. 로그인 모달 → 정상 로그인 → app.html redirect
7. 로그인 모달 → 잘못된 자격 → 한국어 에러
8. 비밀번호 찾기 모달 → 메일 발송
9. index.html 진입 → home_v2 즉시 redirect

**종료 commit:**
- home_v2.html 가입/로그인 통합 본 빌드
- index.html redirect
- 작업지시서 § 4-A~E ✅ 갱신
- 인계 노트

---

# § 5. 검증 매트릭스 (9역할 × 4중 방어)

## 5-1. 사전 검증 (Step P1.5-A)

| 항목 | SQL/Code 검증 | 통과 조건 |
|---|---|---|
| branches RLS 비활성화 | `pg_class.relrowsecurity` | branches/teams = false |
| 28사 도메인 활성 | `SELECT COUNT(*) FROM insurers WHERE domain IS NOT NULL` | ≥ 28 |
| handle_new_user 본문 | `pg_get_functiondef` fingerprint 6건 | 모두 true |
| 사용자 분포 무영향 | `users` 분포 raw | admin/active=1, ga_member/active=2 |

## 5-2. 라이브 회귀 (Step P1.5-E, 9건)

§ 4-E 표 정합.

---

# § 6. 위험·롤백

## 6-1. 위험 매트릭스

| # | 위험 | 완화 |
|---|---|---|
| 1 | 5/15 일정 위협 | Phase 1 잔여 5/15 후 분리 + Phase 1.5 본진만 우선 |
| 2 | home_v2 통합 시 코드 중복 (가입+로그인+랜딩) | 작업지시서 § 4 분할 + 단계별 commit |
| 3 | login.html 흡수 후 외부 link 끊김 | login.html 보존 + redirect (DH2 결재 시 분기) |
| 4 | 6각 home.html과 home_v2 의미 충돌 | DH7 결재 (보존 권장) |
| 5 | 모바일 UX 누락 | DH6 결재 (인라인 반응형 권장) |

## 6-2. 롤백

- Step P1.5-B/C 롤백: `git revert <commit>` (home_v2.html 단일 파일)
- index.html redirect 롤백: 단순 commit revert
- DB 롤백: branches RLS 재활성화 (`ALTER TABLE branches ENABLE ROW LEVEL SECURITY`)

---

# § 7. 다음 단계 (Phase 1.5 종료 후)

| 시점 | 단계 |
|---|---|
| 5/15 4팀 약 40~50명 오픈 | home_v2 메인 진입로 가동 |
| 5/15 후 1주 | Phase 1 잔여 Step 6 (보험사 독립 페이지) |
| 5/15 후 2주 | Step 7 (게시판 7메뉴) + Step 8 (6필드 검색) |
| 5/15 후 3주 | Step 9 + Step 10~16 (admin 융합 + 회귀) |

---

# § 8. 결재 후 진입 절차

1. 팀장님이 § 3 결재 7건 입력 (각 박스 ✅ 또는 의견)
2. Code가 결재 결과 본 MD 갱신 + commit (`docs(specs): Phase 1.5 작업지시서 발행 + 결재 7건 확정`)
3. Step P1.5-A 진입 (사전 캡처)
4. Step P1.5-B (home_v2 가입 통합, ~2h)
5. Step P1.5-C (home_v2 로그인 통합, ~1h)
6. Step P1.5-D (index.html redirect, ~10분)
7. Step P1.5-E (Chrome 라이브 회귀 + 종료 commit, ~30분)

**예상 총 분량:** ~3.5세션 (5/15 일정 정합).

---

본 작업지시서는 Code 발행. 팀장님 § 3 결재 7건 입력 후 § 4 진입.

진실 원천:
- 메모리 [phase_1_5_index_home_absorption.md] (Phase 1.5 즉시 흡수 결정)
- `docs/sessions/_INDEX.md` 메인 트랙 (5/9 저녁 갱신)
- `docs/specs/v2_insurer_admission_phase1_v2.md` § 9-1-bis (Step 5 재정의)
- `docs/strategy/onesecond_strategy_overview_2026-05-07.md` § 8-4 + § 6-12
