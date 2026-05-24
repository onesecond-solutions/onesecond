---
title: navi_new.html 구조 reference — 디자인 v2 Phase B 자료
date: 2026-05-22
source: upgrade_20260521/navi_new.html (1.49 MB / 744 라인)
purpose: 매 세션마다 navi_new.html grep 재실행 회피 + Phase B 페이지 재작성 시 정합 자료
related_specs:
  - upgrade_20260521/01_디자인_시스템_spec_v1.md
  - upgrade_20260521/04_tokens_v2_spec.md
  - upgrade_20260521/05_dday_work_order.md
---

# navi_new.html 구조 reference (디자인 v2 Phase B 자료)

> **본 문서 목적:** navi_new.html이 1.49 MB minified inline 자료라 Read 통째·부분 다 토큰 한도 초과. 매 세션마다 grep 재실행 회피용으로 핵심 구조 자료를 본 문서에 정리. Phase B 페이지 재작성 시 본 문서가 정합 reference.
>
> **자료 출처:** 2026-05-22 Code가 grep으로 추출한 자료.

---

## §1. 파일 정보

- 자리: `upgrade_20260521/navi_new.html`
- 크기: 1,489,821 bytes (1.49 MB)
- 라인: 744 라인
- 형식: HTML 단일 파일 (CSS + JS inline, minified 라인 다수)
- 기본 자료: `<html data-theme="dark">` HTML 자료에 다크 박힘

## §2. 라인 구성

| 자리 | 자료 |
|---|---|
| 1~8 | head meta + Pretendard CDN + html2canvas CDN (카드 캡처용) |
| 9~300 | `<style>` 통째 CSS (line 10~11 = 토큰 자료) |
| 302~588 | `<body>` HTML 구조 |
| 589~743 | `<script>` JS 통째 inline |
| 744 | `</body>` |

## §3. 토큰 자료 (line 10~11)

본인 PR #12 tokens.css v2와 정확히 동일 자료:

```css
:root[data-theme="dark"] {
  --bg: #0B0C0E; --s1: #141518; --s2: #1C1D21; --sh: #222328; --bd: #26272B;
  --tp: #F4F4F5; --ts: #A1A1AA; --tf: #6B6D72; --bodytx: #D4D4D8;
  --ac: #6366F1; --ach: #7C7FF2;
  --t-uw: #22D3EE; --t-product: #6366F1; --t-event: #E879F9;
  --ok: #22C55E;
}
:root[data-theme="light"] {
  --bg: #FBFBFC; --s1: #FFFFFF; --s2: #F4F4F6; --sh: #EEEEF1; --bd: #E4E4E7;
  --tp: #18181B; --ts: #52525B; --tf: #A1A1AA; --bodytx: #3F3F46;
  --ac: #6366F1; --ach: #7C7FF2;
  --t-uw: #0891B2; --t-product: #6366F1; --t-event: #C026D3;
  --ok: #16A34A;
}
```

→ Code PR #12 `css/tokens.css` 자료와 일치 ✅ (Phase A 정합 검증 완료).

## §4. 레이아웃 구조 (.app grid 2열)

```
.app#app                                     ← grid: 212px / 1fr (.collapsed 시 56px / 1fr)
├─ aside.side                                ← 좌 사이드바
│   ├─ .top                                  ← 로고 + 햄버거 행
│   │   ├─ .logo                             ← 인디고 30×30 사각, 흰색 글자
│   │   ├─ .bname                            ← 브랜드 이름 ("원세컨드")
│   │   └─ button.hamb                       ← 햄버거 (.app.collapsed 토글)
│   └─ .nav × 7건                            ← 메뉴 (현재 활성 = .on)
│       ├─ 홈
│       ├─ 네비게이션방 (활성)
│       ├─ 스크립트
│       ├─ Quick 메뉴
│       ├─ MY SPACE
│       ├─ 함께해요
│       ├─ 보험뉴스
│       └─ 팀원관리
└─ .main
    ├─ header.head                           ← 54px 헤더
    │   ├─ .search                           ← 검색바 (Ctrl K 단축키)
    │   ├─ button.hbtn.bell                  ← 알림 종 + .bdot (빨강 점)
    │   └─ .acct                             ← 사용자 영역
    │       ├─ button.acctbtn                ← .av (아바타) + .nm (이름)
    │       └─ .menu#m                       ← 드롭다운 메뉴
    │           ├─ .mi (사용자 정보)
    │           ├─ .mi (MY SPACE 진입)
    │           ├─ .mi (개인정보 수정 — openProfile)
    │           ├─ .mi (화면 모드 .seg — 라이트 / 다크)
    │           ├─ .mi (글자 크기 .seg — 90 / 100 / 110 / 125)
    │           └─ .mi (로그아웃)
    └─ .body > .wrap                         ← max-width 1500px
        ├─ .ttl + .sub                       ← 페이지 제목 + 서브
        ├─ .tabs                             ← 탭 4건
        │   ├─ "4팀 단체방"
        │   ├─ "네비게이션방" (.on)
        │   ├─ "스마트 게시판"
        │   └─ "지점 게시판"
        ├─ .chips                            ← 필터 5건
        │   ├─ "전체" (.on)
        │   ├─ "공지사항"
        │   ├─ "인수 같음"
        │   ├─ "상품 같음"
        │   └─ "기타"
        └─ .split#split                      ← grid: 330px / 1fr (1024px↓ = 단일 컬럼)
            ├─ .col.list-col
            │   ├─ .lhead                    ← 좌 헤더
            │   │   ├─ .cnt (전체 질문 N건)
            │   │   └─ .lacts
            │   │       ├─ button.lbtn2 (로컬 검색 토글)
            │   │       ├─ button.lbtn2.bell (알림 종)
            │   │       └─ button.newb (✏ 질문하기 — openAsk)
            │   ├─ .lsearch#lsearch          ← 이 방 안 검색 (토글)
            │   ├─ .list#qlist               ← 질문 목록
            │   │   └─ .item × N             ← 각 질문 (border-left: 3px solid var(--tc))
            │   │       ├─ .badge            ← 카테고리 뱃지 (이모지 + 텍스트)
            │   │       ├─ .it               ← 제목
            │   │       └─ .id               ← 메타 (날짜 + 답변 N)
            │   └─ button.morebtn            ← 더보기 (showMore)
            └─ .col.viewer                   ← 우 본문
                ├─ .vbadge                   ← 카테고리 뱃지
                ├─ .vttl                     ← 제목
                ├─ .vmeta                    ← 메타
                └─ .vbody                    ← 본문 + 답글
```

## §5. 카테고리 색 (3종 + 1)

| 카테고리 | 토큰 | 다크 | 라이트 |
|---|---|---|---|
| 인수 같음 | `--t-uw` | `#22D3EE` cyan | `#0891B2` 짙은 cyan |
| 상품 같음 | `--t-product` | `#6366F1` 인디고 | `#6366F1` 동일 |
| 기타 | `--t-event` | `#E879F9` magenta | `#C026D3` 짙은 magenta |
| 공지 ⭐ Code 추가 | `--t-notice` | `#F59E0B` amber | `#D97706` 짙은 amber |

`.item style="--tc:var(--t-uw)"` 자료 = `border-left: 3px solid var(--tc)` 표현.

## §6. 모달 8건

| 자리 | 자료 |
|---|---|
| `.so#so` | 검색 오버레이 (Ctrl K, .mback dim) |
| `.lb#lb` | 라이트박스 (이미지 풀스크린 + 줌·회전·네비) |
| `.ttakmenu#tm` | 딸깍 메뉴 (저장 / 복사 / 카드 만들기 3건) |
| `.cardmodal#cm` | 카드 만들기 (html2canvas 캡처 → 텍스트·이미지 복사·저장) |
| `.askmodal#askmodal` | 질문 작성 (4 카드 분기: 공지/인수/상품/기타) |
| `#profmodal` | 프로필 수정 |
| `.toast#toast` | 토스트 메시지 (1.8초 자동 사라짐) |
| `.fab` | 우하단 빠른 실행 ⚡ |

## §7. JS 함수 자료 (line 589~743)

### §7-1. 라이트박스
- `render()` — 현재 이미지 + 줌·회전·메뉴 동기
- `openLb(i)` — i번째 이미지 열기
- `zoom(d)` — 0.5~3.0 범위 줌
- `rot()` — 90도 회전
- `navi(d)` — 이전/다음 (cur ± 1)
- `closeLb()` — 라이트박스 + 딸깍 메뉴 같이 닫음
- `syncMenu()` — 딸깍 메뉴 "지금 자료: ___" 갱신

### §7-2. 딸깍 메뉴
- `doSave()` — MY SPACE 「나의 자료」에 저장 (토스트)
- `doCopy()` — 텍스트 복사 (clipboard API + fallback)
- `copyTextFallback(txt)` — execCommand('copy') fallback
- `openCard()` — 카드 만들기 모달 열기

### §7-3. 카드 만들기
- `renderCard()` — 카드 HTML 렌더 (.ctop + .cbody)
- `renderCardCanvas()` — html2canvas로 canvas 생성
- `copyCardText()` — 카드 텍스트 평문 복사
- `copyCardImage()` — canvas → blob → clipboard
- `saveCardImage()` — canvas → blob → download
- `closeCard()` — 카드 모달 닫기

### §7-4. 검색 (전역)
- `openSearch()` — Ctrl K 오버레이 열기
- `closeSearch()` — 닫기
- `fill(q)` — 검색칩 클릭 시 input 채우기
- `doSearch(q)` — 검색 실행 (placeholder, 실제 검색 로직 없음 — 시안)

### §7-5. 로컬 검색 (방 안)
- `toggleLocalSearch()` — .lsearch 열기/닫기 토글
- `closeLocalSearch()` — 닫고 input 비움
- `filterLocal(q)` — 목록 필터링

### §7-6. 뷰어 분기 (모바일 1024px↓)
- `showViewer()` — .split.show-viewer 추가 (단일 컬럼 우 표시)
- `backToList()` — 좌 목록으로 돌아감

### §7-7. 사이드바
- `toggleMSide()` — .app.msidebar 토글 (모바일 슬라이드)

### §7-8. 테마·폰트 (PR #12 theme.js와 정합)
- `setTheme(t)` — html data-theme 설정 + .seg .on 동기
- `setFont(p)` — `--fscale` 설정 (90→0.9 / 100→1 / 110→1.1 / 125→1.25)

### §7-9. 질문 작성 (4 카드 분기)
- `openAsk()` — 모달 열기 + .askstep#step-pick 표시
- `closeAsk()` — 모달 닫기
- `showStep(id)` — `.askstep` 중 id 매칭만 .on
- `backToPick()` — 카드 선택 단계로 복귀 + 제목 초기화
- `goForm(cat)` — 선택된 카테고리(notice/uw/product/etc) 폼 표시
- `submitAsk()` — 제출 (토스트 — placeholder)

### §7-10. 프로필
- `openProfile() / closeProfile() / saveProfile()`

### §7-11. 기타
- `toast(msg)` — 1.8초 자동 사라짐 토스트
- `showMore()` — .list.expanded 클래스 추가 (.moreitem 표시)

## §8. 데이터 변수 (시안 placeholder)

- `var names = ["5세대 보험료표", "특약 비교", "주계약 비교"]` — 라이트박스 이미지 이름
- `var imgs = [...]` — 라이트박스 이미지 URL 배열
- `var cards = [{brand, name, rows: [[key, value], ...]}]` — 카드 만들기 데이터
- `var askForms = {notice:{t:'📢 공지사항 작성'}, uw:{t:'🦊 인수 질문 작성'}, product:{t:'📦 상품 질문 작성'}, etc:{t:'❓ 기타 질문 작성'}}` — 질문 작성 4 카드 자료
- `var cur, sc, rt` — 라이트박스 상태 (현재 인덱스, 스케일, 회전)
- `var tt` — 토스트 타이머
- `var defaultPanel` — 검색 오버레이 기본 자료

## §9. 모바일 분기 (1024px↓)

| 자리 | 동작 |
|---|---|
| `.app` | sidebar 56px 자동 (모바일 햄버거로 펼침) |
| `.app.msidebar` | 모바일 사이드바 슬라이드 펼침 |
| `.split` | grid 단일 컬럼 (좌·우 동시 X) |
| `.split.show-viewer` | 우 뷰어만 표시 (좌 숨김) |
| `backToList()` | 우→좌 복귀 |

## §10. 현재 app.html과 본질 격차 8건

| # | 자리 | 현재 app.html | navi_new.html |
|---|---|---|---|
| 1 | 사이드바 | 12px 가는 세로 + dropdown | grid 212px / collapsed 56px |
| 2 | 헤더 높이 | `--header-a1 = 64px` | 54px |
| 3 | 사용자 메뉴 | 토글 X | 화면 모드 .seg + 글자 크기 .seg (PR #12 theme.js와 정합) |
| 4 | 본문 구조 | `.main grid 3컬럼 (12px / 1fr / 220px)` | `.wrap > .tabs > .chips > .split` |
| 5 | 게시판 | board.html 별도 | navi_new.html 본문 자체가 게시판 |
| 6 | 딸깍 인터랙션 | 없음 | 저장 / 복사 / 카드 만들기 3건 통합 |
| 7 | 로컬 검색 | 없음 | .lsearch (방 안 검색) |
| 8 | 질문 작성 | 단순 모달 | 4 카드 분기 (메모리 `project_navv2_4cards_intent` 정합) |

## §11. Code PR #12 자료 정합 평가

| 자료 | navi_new.html 정합 |
|---|---|
| `css/tokens.css` v2 (토큰) | ✅ 완전 정합 (§3 자료 그대로 추출 + 호환 별칭 117건) |
| `js/theme.js` setTheme + setFontSize | ✅ 정합 (§7-8 자료 동일 본질, 본인이 더 확장) |
| `app.html` 14곳 브라운 제거 | ✅ 정합 (인디고+무채색 갈아끼움) |
| `app.html` HTML 구조 | ❌ Phase B에서 통째 갈아끼움 (현재 PR #12 대상 X) |

→ PR #12 = navi_new.html 정합 ✅. Phase A 작업 완성도 검증.

## §12. Phase B 진입 시 사용 자료

다음 페이지 재작성 시 본 문서의 §4 + §6 + §7 자료 통째 정합:

| 페이지 | 분량 | navi_new.html 자료 활용 |
|---|---|---|
| `app.html` 골격 통째 재작성 (Phase A2) | ~2h | §4 통째 (.app/.side/.head/.main 구조) + §3 토큰 |
| `pages/board.html` | ~1.5h | §4 .body 자료 통째 (.tabs/.chips/.split) + §6 모달 통째 + §7 함수 |
| `pages/search.html` | ~30분 | §6 .so 검색 오버레이 + §7-4 검색 함수 |
| `pages/scripts.html` | ~1h | §6 딸깍 메뉴 + §7-2 함수 |
| `pages/quick.html` | ~30분 | §6 .fab |
| `pages/myspace.html` | ~30분 | §7-2 doSave 자료 (저장 목록) |
| `pages/team-management.html` | ~30분 (+ 4팀 명단 조회 동시) | navi_new.html에 자료 없음 = 별도 신설 |

## §13. 미해결 / 후속

- §8 데이터 변수는 시안 placeholder → 실제 데이터는 Supabase 연동 필요 (Phase B 진입 시 결재)
- §7-4 doSearch는 placeholder → Supabase `search_newsletters_grouped` RPC + 일반 검색 RPC 연동
- §7-9 submitAsk는 placeholder → Supabase `posts` INSERT 연동
- html2canvas CDN 의존 → 본 자료를 라이브 자료에 통째 도입 시 캐시·offline 검토

---

**END OF STRUCTURE REFERENCE**

> 본 문서 = 2026-05-22 Code grep 추출 자료. 향후 navi_new.html 자료 변경 시 본 문서 갱신.
> Phase B 진입 시 본 문서 § 4 + § 6 + § 7 자료 정합 reference.
