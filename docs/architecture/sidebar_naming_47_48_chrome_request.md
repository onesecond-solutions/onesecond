# 별 트랙 #47 + #48 라이브 검증 의뢰서 (Chrome 시연용)

> **작성일:** 2026-05-10 (Phase 1.5 본진 ✅ 종료 후속, 5/15 4팀 오픈 D-5)
> **트랙:** #47 사이드바·모바일 탭 메뉴 순서 정합 + #48 호칭 정합 ("현장 Q&A" → "현장의 소리")
> **선행 commit:** `5b161ac` (#47, app.html 순서 정합) / `8c544d8` (#48, 라이브 코드 4 파일 호칭 정합)
> **실행자:** Claude in Chrome (라이브 시연)
> **신버전 검증:** 라이브 = `https://onesecond.solutions` (GitHub Pages, Supabase 백엔드 `pdnwgzneooyygfejrvbg` `onesecond-v1-restore-0420`)
> **목적:** 5/15 4팀 사용자 노출 톤 통일 + home_v2 Top bar 정합 라이브 회귀 (잔존 "현장 Q&A" 노출 0건 보장)
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
- "현장 Q&A" 잔존 시 즉시 FAIL 보고
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
- 사고 신호: aria-label "현장 Q&A" 잔존

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
- 사고 신호: "💬 현장 Q&A" 잔존
- (검색 결과 게시글이 0건이면 본 항목 N/A 처리, 다른 키워드로 재시도)

### C-2. 검색 preview drawer badge = "현장의 소리" ✅
- C-1과 동일 진입
- 게시글 카드 우측 badge raw = `현장의 소리`
- 사고 신호: badge "현장 Q&A" 잔존

### C-3. 검색 결과 페이지 sub 텍스트 호칭 ✅
- 검색창 Enter (또는 검색 실행) → search-result-page 진입
- sub 텍스트 raw = `총 N건 — 스크립트 X건 · 현장의 소리 Y건 · 업무자료 Z건` 형식
- 사고 신호: "현장 Q&A Y건" 잔존

### C-4. 검색 결과 페이지 그룹 타이틀 ✅
- C-3와 동일 진입, 게시글 그룹 타이틀 raw = `💬 현장의 소리 (Y건)`
- 사고 신호: "💬 현장 Q&A (Y건)" 잔존

### C-5. 검색 결과 카드 badge ✅
- 게시글 카드 좌측 상단 badge raw = `현장의 소리`
- 사고 신호: badge "현장 Q&A" 잔존

---

## D. 페이지 진입 호칭 #48 (2건)

### D-1. /pages/board.html 페이지 타이틀 ✅
- 직접 진입: `/pages/board.html`
- 페이지 상단 타이틀 raw = `현장의 소리 · 실시간 이슈 공유`
- accent 강조 영역(brown)이 "현장의 소리"에 부착
- 사고 신호: "현장 Q&A · 실시간 이슈 공유" 잔존

### D-2. /pages/home.html 룰렛 카드 라벨 ✅
- 직접 진입: `/pages/home.html` (또는 home_v2 → app.html → 홈 메뉴)
- 중앙 룰렛 60도 위치 board 카드 호버 시 tip 라벨 raw = `💬 현장의 소리`
- 사고 신호: tip 라벨 "💬 현장 Q&A" 잔존

---

## E. 보존 회귀 (변경 없음 검증, 2건)

### E-1. home_v2 카드 kicker "FIELD Q&A" 영문 보존 ✅
- `/pages/home_v2.html` 메인 카드 그리드
- 현장의 소리 카드 상단 kicker raw = `FIELD Q&A` (영문, 대문자) 보존
- 사고 신호: 한국어 "현장의 소리" 또는 "현장 Q&A"로 변경됨 (의도된 보존 깨짐)

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

본 의뢰서는 #47 + #48 commit 직후 5/15 4팀 오픈 D-5일 기준 라이브 톤 점검용. P1.5-E ⑥ rate limit (별 트랙 #45) 처럼 의도된 외부 영향이 없으므로 18/18 PASS 기대.
