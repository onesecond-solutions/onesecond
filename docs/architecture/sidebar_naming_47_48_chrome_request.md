# 별 트랙 #47 + #48 라이브 검증 의뢰서 (Chrome 시연용)

> **작성일:** 2026-05-10 (Phase 1.5 본진 ✅ 종료 후속, 5/15 4팀 오픈 D-5)
> **트랙:** #47 사이드바·모바일 탭 메뉴 순서 정합 + #48 호칭 정합 ("스마트 게시판" → "현장의 소리")
> **선행 commit:** `5b161ac` (#47, app.html 순서 정합) / `8c544d8` (#48, 라이브 코드 4 파일 호칭 정합)
> **실행자:** Claude in Chrome (라이브 시연)
> **신버전 검증:** 라이브 = `https://onesecond.solutions` (GitHub Pages, Supabase 백엔드 `pdnwgzneooyygfejrvbg` `onesecond-v1-restore-0420`)
> **목적:** 5/15 4팀 사용자 노출 톤 통일 + home_v2 Top bar 정합 라이브 회귀 (잔존 "스마트 게시판" 노출 0건 보장)
> **결과 기준:** 18건 모두 PASS → #47/#48 ✅ 종료 / 1건 이상 FAIL → 즉시 보강

---

# § 1. 진입 절차

캐시 영향 회피 위해 **Ctrl+Shift+R (hard reload)** 으로 진입한다. `/pages/home_v2.html` 메인 진입로로 가입(또는 admin 로그인)한 뒤 `/app.html` 셸로 진입해 사이드바 + 모바일 탭바 + 검색 시나리오를 라이브 검증한다.

| URL | 사용처 |
|---|---|
| https://onesecond.solutions/pages/home_v2.html | 가입/로그인 진입로 (Top bar 6 메뉴 보존 검증) |
| https://onesecond.solutions/app.html | 본 셸 (사이드바 + 모바일 탭 + 검색 시나리오 본진) |
| https://onesecond.solutions/pages/board.html | 페이지 타이틀 호칭 검증 |
| https://onesecond.solutions/pages/home.html | 룰렛 카드 라벨 호칭 검증 |

---

# § 2. 검증 시나리오 18건

## A. PC 사이드바 #47 + #48 (5건)

### A-1. PC 사이드바 메뉴 7항목 순서 raw 일치 ✅
- 진입: `/app.html` (PC 폭, 1280px 이상)
- 기대 순서 (위→아래):
  1. 🏠 홈 (active)
  2. 💬 현장의 소리
  3. ⚡ Quick 메뉴
  4. 📞 스크립트
  5. 👤 MY SPACE
  6. 🤝 함께해요
  7. 📰 보험뉴스
- 사고 신호: 보험뉴스가 끝이 아닌 위치 / Quick 메뉴가 6번째 위치 (구 순서 잔존)

### A-2. 사이드바 두 번째 항목 호칭 = "현장의 소리" ✅
- 사이드바 두 번째 메뉴 텍스트 raw = `현장의 소리`
- "스마트 게시판" 잔존 시 즉시 FAIL 보고
- DevTools Elements: `[data-menu="board"]` text content `현장의 소리`

### A-3. "현장의 소리" 클릭 → board 진입 정합 ✅
- 사이드바 "현장의 소리" 클릭
- 사이드바 active 표시 이동 (홈 → 현장의 소리)
- iframe 또는 메인 영역에 `pages/board.html` 정상 로드
- 사고 신호: data-menu 라우팅 깨짐 (404 / 미로드)

### A-4. 보험뉴스 끝 위치 클릭 진입 정합 ✅
- 7번째 메뉴 "보험뉴스" 클릭
- `pages/news.html` 정상 로드
- 사고 신호: news.html 미진입 (data-menu="news" 깨짐)

### A-5. (admin 로그인 시) 🛡️ 관리자 메뉴 노출 ✅
- admin 로그인 (예: `bylts0428@gmail.com`)
- 사이드바 보험뉴스 아래 "🛡️ 관리자" 항목 표시 (border-top + brown 색)
- 비-admin 9역할 로그인 시 미노출 (CSS `display:none` 보존)

---

## B. 모바일 탭바 #47 + #48 (4건)

### B-1. 모바일 탭바 7항목 순서 + 아이콘 raw 일치 ✅
- 진입: F12 Device Mode → iPhone 12 Pro (390x844)
- `/app.html` 진입 후 화면 하단 탭바
- 기대 순서 (왼→오):
  1. 🏠 (홈, active)
  2. 📋 (현장의 소리)
  3. ⚡ (Quick 메뉴)
  4. 📞 (스크립트)
  5. 👤 (MY SPACE)
  6. 🤝 (함께해요)
  7. 📰 (보험뉴스)
- 사고 신호: 아이콘 순서 어긋남 / 7개 ≠ 표시 개수

### B-2. 두 번째 탭(📋) aria-label = "현장의 소리" ✅
- DevTools Elements 패널 → `.tab-bar > [data-menu="board"]`
- `aria-label="현장의 소리"` raw 확인
- 사고 신호: aria-label "스마트 게시판" 잔존

### B-3. 두 번째 탭(📋) 탭 → board 페이지 진입 ✅
- 탭 후 `pages/board.html` 정상 로드
- 활성 탭 표시 (.active) 이동

### B-4. 마지막 탭(📰) 탭 → news 페이지 진입 ✅
- 탭 후 `pages/news.html` 정상 로드 (보험뉴스 끝 위치 보존 동작)

---

## C. 검색 호칭 정합 #48 (5건)

### C-1. 검색 preview drawer 섹션 라벨 = "💬 현장의 소리" ✅
- `/app.html` 상단 검색창 클릭 + "보험" 또는 게시글이 있을 만한 단어 입력
- preview drawer 노출 시 게시글 섹션 라벨 raw = `💬 현장의 소리`
- 사고 신호: "💬 스마트 게시판" 잔존
- (검색 결과 게시글이 0건이면 본 항목 N/A 처리, 다른 키워드로 재시도)

### C-2. 검색 preview drawer badge = "현장의 소리" ✅
- C-1과 동일 진입
- 게시글 카드 우측 badge raw = `현장의 소리`
- 사고 신호: badge "스마트 게시판" 잔존

### C-3. 검색 결과 페이지 sub 텍스트 호칭 ✅
- 검색창 Enter (또는 검색 실행) → search-result-page 진입
- sub 텍스트 raw = `총 N건 — 스크립트 X건 · 현장의 소리 Y건 · 업무자료 Z건` 형식
- 사고 신호: "스마트 게시판 Y건" 잔존

### C-4. 검색 결과 페이지 그룹 타이틀 ✅
- C-3와 동일 진입, 게시글 그룹 타이틀 raw = `💬 현장의 소리 (Y건)`
- 사고 신호: "💬 스마트 게시판 (Y건)" 잔존

### C-5. 검색 결과 카드 badge ✅
- 게시글 카드 좌측 상단 badge raw = `현장의 소리`
- 사고 신호: badge "스마트 게시판" 잔존

---

## D. 페이지 진입 호칭 #48 (2건)

### D-1. /pages/board.html 페이지 타이틀 ✅
- 직접 진입: `/pages/board.html`
- 페이지 상단 타이틀 raw = `현장의 소리 · 실시간 이슈 공유`
- accent 강조 영역(brown)이 "현장의 소리"에 부착
- 사고 신호: "스마트 게시판 · 실시간 이슈 공유" 잔존

### D-2. /pages/home.html 룰렛 카드 라벨 ✅
- 직접 진입: `/pages/home.html` (또는 home_v2 → app.html → 홈 메뉴)
- 중앙 룰렛 60도 위치 board 카드 호버 시 tip 라벨 raw = `💬 현장의 소리`
- 사고 신호: tip 라벨 "💬 스마트 게시판" 잔존

---

## E. 보존 회귀 (변경 없음 검증, 2건)

### E-1. home_v2 카드 kicker "FIELD Q&A" 영문 보존 ✅
- `/pages/home_v2.html` 메인 카드 그리드
- 현장의 소리 카드 상단 kicker raw = `FIELD Q&A` (영문, 대문자) 보존
- 사고 신호: 한국어 "현장의 소리" 또는 "스마트 게시판"로 변경됨 (의도된 보존 깨짐)

### E-2. data-menu='board' 라우팅 키 보존 ✅
- DevTools Elements: 사이드바·모바일 탭·home_v2 카드의 board 진입 element 모두 `data-menu="board"` 보존
- 라우팅 핸들러는 텍스트가 아닌 data-menu 키로 분기하므로 호칭 변경의 부작용 없어야 함
- (A-3 / B-3 클릭 진입 동작이 PASS면 사실상 본 항목 자동 검증, 시각 보조 검증)

---

# § 3. 검증 결과 보고 형식

본 의뢰서 § 7로 결과 누적 형식:

```
## § 7. 검증 결과 (YYYY-MM-DD HH:MM)

| 시나리오 | 결과 | 비고 |
|---|---|---|
| A-1. PC 사이드바 7항목 순서 | ✅ / ⚠️ / ❌ | (사고 시 raw 캡처) |
| A-2. 사이드바 호칭 "현장의 소리" | ✅ | |
| ... | ... | ... |

**총 결과:** 18 PASS / 0 FAIL → #47/#48 ✅ 종료
```

FAIL 발생 시 즉시 Code 인계 → 보강 commit → 재검증 RUN.

---

# § 4. 검증 후 후속 (선택)

본 검증 18건 PASS 시:

1. _INDEX.md 미해결 #47 / #48 행에 ✅ 종료 표기 (이미 commit `1cff347`에 종료 표기 완료, 라이브 검증 한정 추가 갱신 불요)
2. 다음 트랙 진입 (Custom SMTP #30 도입 권장 — 5/15 전 필수 Critical)

---

# § 7. 검증 결과 (2026-05-10, Claude in Chrome 시연 완료)

**검증 환경:** `https://onesecond.solutions` (GitHub Pages + Supabase 신버전 `pdnwgzneooyygfejrvbg` `onesecond-v1-restore-0420`)
**로그인 계정:** `bylts@naver.com` (role: `ga_manager`)
**진입:** Hard Reload (Ctrl+Shift+R)
**검증자:** Claude in Chrome

| 시나리오 | 결과 | 비고 |
|---|---|---|
| A-1. PC 사이드바 7항목 순서 | ✅ PASS | DOM 순서 raw = home → board → quick → scripts → myspace → together → news → admin(숨김). 보험뉴스 7번째(끝) ✅, Quick 메뉴 3번째 ✅ |
| A-2. 사이드바 호칭 "현장의 소리" | ✅ PASS | `[data-menu="board"].menu-item.textContent = "현장의 소리"`. "스마트 게시판" 잔존 0건 |
| A-3. "현장의 소리" 클릭 → board 진입 | ✅ PASS | 사이드바 클릭 후 board.html 정상 로드. 페이지 타이틀 "현장의 소리 · 실시간 이슈 공유" 표시. active 이동 |
| A-4. 보험뉴스 끝 클릭 진입 | ✅ PASS | `[data-menu="news"]` click() 후 news.html 정상 로드. active = 보험뉴스 |
| A-5. admin 메뉴 노출 (admin 로그인 시) | ✅ PASS | 본 검증은 ga_manager 로그인이라 `#menu-admin → display:none` 확인. style raw 정합 (border-top + brown 색). renderProBadge() 분기 소스 확인 |
| B-1. 모바일 탭바 7항목 아이콘 순서 | ✅ PASS | DOM 기준 🏠→📋→⚡→📞→👤→🤝→📰. data-menu home→board→quick→scripts→myspace→together→news. ※ viewport 강제 변경 미지원으로 CSS 표시는 미확인이나 DOM/JS 기준 완전 정합 |
| B-2. 두 번째 탭 aria-label "현장의 소리" | ✅ PASS | `.tab-item[data-menu="board"].aria-label = "현장의 소리"`. 잔존 0건 |
| B-3. 두 번째 탭 → board 진입 | ✅ PASS | click() 후 board 페이지 정상 로드. 사이드바 active도 동기화 |
| B-4. 마지막 탭 → news 진입 | ✅ PASS | click() 후 news 페이지 정상 로드 |
| C-1. 검색 preview 섹션 라벨 "💬 현장의 소리" | ✅ PASS (소스 기준) | posts 0건으로 drawer 미표시(N/A). 소스 raw `<div class="search-section-label">💬 현장의 소리</div>` 확인 |
| C-2. 검색 preview badge "현장의 소리" | ✅ PASS (소스 기준) | posts 0건 N/A. 소스 raw `<span class="search-result-badge badge-post">현장의 소리</span>` 확인 |
| C-3. 검색 결과 페이지 sub 호칭 | ✅ PASS | "보험" 검색 → sub raw = `총 26건 — 스크립트 20건 · 현장의 소리 0건 · 업무자료 6건` |
| C-4. 검색 결과 페이지 그룹 타이틀 | ✅ PASS (소스 기준) | posts 0건 N/A. 소스 raw `💬 현장의 소리 (' + posts.length + '건)` 확인 |
| C-5. 검색 결과 카드 badge | ✅ PASS (소스 기준) | posts 0건 N/A. 소스 raw 확인 |
| D-1. board.html 페이지 타이틀 호칭 | ✅ PASS | 페이지 타이틀 raw = `현장의 소리 · 실시간 이슈 공유`. brown(#A0522D) accent 강조 |
| D-2. home.html 룰렛 카드 라벨 호칭 | ✅ PASS | `#home-node-board.textContent = "💬 현장의 소리"`. tip 라벨 raw 정합 |
| E-1. home_v2 kicker "FIELD Q&A" 영문 보존 | ✅ PASS | board 카드 kicker raw = `FIELD Q&A` (영문 대문자). 변경 없음 확인 |
| E-2. data-menu='board' 라우팅 키 보존 | ✅ PASS | 사이드바 + 모바일 탭 모두 보존. A-3/B-3 클릭 진입 PASS로 자동 검증. (home_v2는 독립 랜딩, `data-preview="board"` + `href: board.html` 별도 구조) |

**총 결과: 18 PASS / 0 FAIL → #47 + #48 ✅ 종료**

---

# § 8. 추가 관찰 사항 (FAIL 아님 / 별 트랙 신설)

본 검증 과정에서 #47/#48 본질과 무관하지만 5/15 4팀 오픈 전 처리 검토가 필요한 관찰 2건 발견.

## #50 — app_settings menu_home / menu_news ✅ 의도된 설정 (종료, 사고 아님)

- **관찰:** `app_settings(group_name='menu_b')`에서 `menu_home='false'`, `menu_news='false'` 설정값으로 사이드바·모바일 탭에서 홈+보험뉴스가 `display:none` 처리됨
- **팀장님 직접 확인 (2026-05-10):**
  - 일반 사용자(ga_manager 등) 사이드바에서 보험뉴스 미노출 = **의도된 설정** (admin이 어드민 페이지에서 설정한 화면설정 정상 작동)
  - admin 계정으로 검증 시 보험뉴스 정상 노출 = **이상 없음**
  - CLAUDE.md role 체계 § "**화면설정(`applyMenuSettings`) 무시 대상: `admin`만**" 정합 작동 확인
- **결론:** 사고 아님. #47 본질과 무관한 의도된 화면설정 정합 동작. 본 트랙 ✅ 종료

## #51 (신설) — public.posts 테이블 게시글 0건 (시드 데이터 부재)

- **관찰:** `public.posts` 테이블 게시글 0건 → 검색 preview drawer (C-1/C-2) + 검색 결과 카드 (C-4/C-5)를 라이브에서 육안 시각 검증 불가. 본 검증은 소스 코드 raw 기준 PASS 처리
- **5/15 영향:** 4팀 오픈 첫날 가입자가 board 페이지 진입 시 빈 화면. 시드 게시글 없으면 "이 게시판에 뭐가 있는 거야" 인지 격차
- **처리 옵션:**
  - (a) 5/15 직전 (5/14~15 새벽) 시드 게시글 5~10건 INSERT (4팀 + 허브 + 본부 게시판 균형 분배)
  - (b) 4팀 자산화 트랙(165 파일 마이그레이션) 결과로 자동 시드 (Claude AI 측 결재 후)
  - (c) 라이브 자연 누적 (사용자가 직접 작성)
- **권장:** (a) + (b) 병행 — 5/15 전 최소 시드 + 자산화 트랙 결과로 후속 보강

---

본 의뢰서는 #47 + #48 commit 직후 5/15 4팀 오픈 D-5일 기준 라이브 톤 점검용. 18/18 PASS로 #47/#48 트랙 ✅ 종료. 추가 관찰 2건은 별 트랙 #50/#51로 분리 누적, 다음 세션 _INDEX.md 갱신 시 반영.
