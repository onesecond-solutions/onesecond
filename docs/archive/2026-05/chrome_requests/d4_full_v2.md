# Chrome 회귀 검증 의뢰서 v2 — 5/18 D-4 본진 전체 (8 commit)

> **작성일:** 2026-05-14
> **수신:** Claude in Chrome (또는 팀장님 직접 라이브 검증)
> **본진:** 5/18 4팀 오픈 D-4 본진 전체 (A+B+C + 본진 1~5) 라이브 회귀 검증
> **사이트:** https://onesecond.solutions
> **Supabase:** https://supabase.com/dashboard/project/pdnwgzneooyygfejrvbg

**누적 commit 8건:**
- `bada025` A 단톡방 입력바 → 풀폼 진입 전환
- `3c5a73e` B admin_v2 허브 게시판 admin 전용 보기
- `f1cc1e1` C 회귀 검증 의뢰서 v1 (본 문서로 흡수)
- `13d5651` 본진 1 Cache-Control meta http-equiv 박음
- `4df4926` 본진 2 v2 PART F 1단/2단 칩 + 핀 옵션 C
- `e0bb8bf` 본진 3 v2 PART D-4 메시지 버블 좌우 여백 축소
- `8c476e6` 본진 4 v2 PART C 축 1 맥락 태그
- `ed722ea` 본진 5 v2 PART C 축 5 길게 누르기 4단 액션

---

## § 0 사전 진입

### 0-1. 라이브 push 후 진입

본 의뢰서는 누적 8 commit 라이브 반영 박힘 후 가동. push 박지 X 박음 시 무효.

### 0-2. 캐시 우회 강제 (본진 1 박음 정합)

본진 1로 단독 HTML 7개에 meta http-equiv 박음. 다만 첫 진입 시 옛 캐시 잔존 가능성:

```
1. URL: https://onesecond.solutions/?v=20260514_d4_full
2. F12 DevTools 진입
3. Network 탭 → "Disable cache" 체크박스 ON
4. Ctrl+Shift+R (하드 새로고침)
5. board.html / admin_v2.html 응답의 Last-Modified 박힘 시각 확인
```

### 0-3. 로그인 계정 4건

| # | 계정 | 역할 | 본진 검증 시나리오 |
|---|---|---|---|
| 1 | `bylts0428@gmail.com` | admin | 본진 A·B 전체 + admin_v2 허브 게시판 + 모든 본진 1~5 |
| 2 | `jaisung78@gmail.com` | ga_manager (4팀 실장) | manager_notice 입력바 클릭 → 풀폼 진입 (RBAC PASS) |
| 3 | `bylts@naver.com` | ga_manager (4팀, alias) | navigation 4 카드 모달 + 본진 4 맥락 태그 + 본진 5 길게 누르기 |
| 4 | 4팀 ga_member 계정 1건 | ga_member | manager_notice 입력바 RBAC 차단 alert / navigation 풀폼 진입 |

---

## § 1 본진 1 — Cache-Control 격차 해소 검증 (commit `13d5651`)

| # | 검증 | 기대값 |
|---|---|---|
| 1 | DevTools "Disable cache" OFF 박은 채 진입 → 옛 버전 박혀 있는지? | meta http-equiv 박힘 → 매 진입 시 풀 fetch 박음 → 새 버전 즉시 박힘 |
| 2 | `app.html` head 안 meta tag 3건 (Cache-Control / Pragma / Expires) | DevTools Elements 탭 → `<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">` 박힘 확인 |
| 3 | `home_v2.html` 동일 검증 | 동일 박힘 확인 |

---

## § 2 본진 A — 단톡방 입력바 → 풀폼 진입 전환 (commit `bada025`)

### 2-1. 입력바 시각 변경

| # | 검증 | 기대값 |
|---|---|---|
| 4 | 4팀 단체방 입력바 placeholder | "✏️ 클릭하면 공지 작성 폼이 열립니다 (제목·범위·첨부 포함)" |
| 5 | 우측 버튼 라벨 | "✏️ 공지 작성" |
| 6 | 📎 첨부 버튼 노출 | 자리 제거 박힘 |
| 7 | textarea readonly | 커서 진입 X |

### 2-2. 풀폼 진입

| # | 검증 | 기대값 |
|---|---|---|
| 8 | manager_notice 탭 입력바 클릭 (admin/ga_branch_manager/ga_manager) | openManagerNoticeOverlay → 실장님 공지 풀폼 단독 진입 |
| 9 | navigation 탭 입력바 클릭 | openWriteOverlay → 4 카드 모달 (공지·인수·상품·기타) |
| 10 | ga_member manager_notice 입력바 클릭 | alert "실장님 공지는 관리자 또는 지점장·실장만 작성할 수 있습니다." |

---

## § 3 본진 2 — v2 PART F 1단/2단 칩 + 핀 옵션 C (commit `4df4926`)

### 3-1. 칩 영역 시각

| # | 검증 | 기대값 |
|---|---|---|
| 11 | 4팀 단체방 진입 → 채팅 영역 상단에 칩 박힘 | 1단 + 2단 두 줄 가로 스크롤 칩 박힘 |
| 12 | 1단 첫 칩 | `[📌 N]` 카운터 칩 (N = 핀 박힌 메시지 수) |
| 13 | 1단 칩 본진 | `[전체][🔴 긴급][📢 공지][내 글][📎 첨부][➕]` |
| 14 | 2단 칩 본진 | `[메리츠][DB][한화][삼성][현대해상][KB][➕]` |
| 15 | 활성 칩 시각 | 흰 배경 검은 글자 (선명) — 카톡 디자인 디테일 2 |
| 16 | 비활성 칩 시각 | 회색 배경 회색 글자 |
| 17 | 칩 모양 | 알약 풀라운드 (border-radius: 9999px) |
| 18 | 가로 스크롤 우측 fade | mask-image 박힘 — 더 있다는 신호 |

### 3-2. 칩 가동 검증

| # | 검증 | 기대값 |
|---|---|---|
| 19 | `[🔴 긴급]` 클릭 | "긴급" 키워드 박힌 메시지만 표시 (1단 active 박힘) |
| 20 | `[메리츠]` 클릭 | "메리츠" 키워드 박힌 메시지만 표시 (2단 active 박힘) |
| 21 | `[메리츠]` 재클릭 | 토글 해제 → 2단 active 풀림 |
| 22 | `[📌 N]` 카운터 클릭 | 핀 공지 펼침 (notice-pin-list display 박힘) |
| 23 | 핀 펼침 후 `[📌 N]` 재클릭 또는 ✕ 클릭 | 펼침 접힘 |
| 24 | `[➕]` 클릭 | "v1.2 박을 예정" alert 박음 |

---

## § 4 본진 3 — 메시지 버블 좌우 여백 축소 (commit `e0bb8bf`)

| # | 검증 | 기대값 |
|---|---|---|
| 25 | 메시지 풍선 좌우 padding | 8px 11px (옛 10px 14px) — DevTools Computed 탭 확인 |
| 26 | 메시지 풍선 max-width | 78% (옛 70%) |
| 27 | 한 줄당 글자수 | ~15~20% 증가 (옛 끊김 해소) |
| 28 | 아바타 크기 | 32px (옛 36px) |
| 29 | 시간 라벨 크기 | font-size 0.625em (옛 0.6875em) |
| 30 | 모바일 768px 박은 채 진입 | row padding 6px / bubble max-width calc(100vw - 52px) |

---

## § 5 본진 4 — 맥락 태그 (commit `8c476e6`)

| # | 검증 | 기대값 |
|---|---|---|
| 31 | "긴급 메리츠 실손" 키워드 박힌 메시지 진입 | 풍선 상단 `[🔴 긴급][메리츠][실손]` 박힘 |
| 32 | 공지 메시지(`is_notice=true`) | 풍선 상단 `[📢 공지]` 박힘 |
| 33 | 첨부 박힌 메시지 + 본진 2 `[📎 첨부]` 칩 클릭 | 첨부 박힌 메시지만 표시 |
| 34 | DevTools Elements → `.notice-msg-row` data-* attribute 박힘 | data-urgent / data-notice / data-attach / data-mine / data-insurer 박힘 |
| 35 | 태그 시각 | 알약 풀라운드 (radius 4px) + 톤 분리 (danger/brand/neutral/info) |

---

## § 6 본진 5 — 길게 누르기 4단 액션 (commit `ed722ea`)

| # | 검증 | 기대값 |
|---|---|---|
| 36 | 메시지 풍선 마우스 길게 누르기 (500ms+) | 4단 액션 메뉴 박음: ⭐ 채택 답변 / 📋 스크립트로 / 🔖 북마크 / 📤 고객 공유 |
| 37 | 모바일 터치 길게 누르기 (500ms+) | 동일 메뉴 박음 |
| 38 | 본인 풍선 짧은 클릭 (500ms 미만) | openMyMsgMenu (수정/파일추가/핀/삭제) 박음 — 길게 누르기 본진과 양립 |
| 39 | 다른 풍선 ⭐ 버튼 클릭 | MY SPACE 저장 박힘 — 길게 누르기 본진과 양립 |
| 40 | 4단 액션 클릭 | placeholder alert 박힘 ("v1.2 박을 예정 — 본진 본진") |
| 41 | 메뉴 박힘 후 외부 클릭 | 메뉴 자동 닫힘 |
| 42 | 메뉴 시각 | 흰 배경 + box-shadow + animation pop |

---

## § 7 본진 B — admin_v2 허브 게시판 admin 전용 보기 (commit `3c5a73e`)

| # | 검증 | 기대값 |
|---|---|---|
| 43 | admin 어드민 콘솔 진입 + 좌측 rail "💬 게시판" 클릭 | board view 활성 |
| 44 | 사이드바 "🌐 허브 게시판 (admin 전용)" 섹션 박힘 | "전체 게시글 LIVE" 가동 메뉴 + "승인 대기 [v1.2]" / "반려 게시글 [v1.2]" pending |
| 45 | 메인 패널 하단 "🌐 허브 게시판 (admin 전용 보기)" panel | admin 전용 배지 + 5열 테이블 (제목 / 작성자 / 카테고리 / 작성일 / 액션) |
| 46 | DevTools Network: `/rest/v1/posts?board_type=eq.hub` 요청 | 200 OK + 응답 배열 |

---

## § 8 회귀 0 검증

| # | 검증 | 기대값 |
|---|---|---|
| 47 | scripts.html / quick.html / together.html / myspace.html 진입 | 변경 0, 정상 가동 |
| 48 | home_v2.html 진입 | 변경 0, 정상 가동 |
| 49 | admin_v2 다른 section (dashboard / operations / content / settings) | 변경 0 |
| 50 | board.html 5/19 후 자동 복귀 분기 (`data-hidden-5-18="1"`) | 박힘 정합, 5/18 본진 흔들지 X |
| 51 | 215건 카톡 시드 메시지 표시 | 데이트 구분선 + 풍선 + 맥락 태그 + 칩 필터 정합 |
| 52 | DevTools Console 에러 0건 | 빨간색 에러 박지 X |

---

## § 9 사고 신호 시 즉시 정지

1. **칩 영역 박지 X** — 본진 2 박힘 실패 (CSS class 충돌 또는 HTML 박힘 실패)
2. **칩 클릭 시 필터 가동 X** — data-* attribute 박지 X (본진 4 박힘 실패)
3. **버블 padding 옛 박힘** — 본진 3 박힘 실패 (CSS specificity 충돌)
4. **맥락 태그 0건** — _extractNoticeContext 가동 실패 또는 _renderNoticeContextTags 빈 박음
5. **길게 누르기 가동 X** — _attachLongpressAll 호출 실패 또는 이벤트 리스너 충돌
6. **admin_v2 허브 panel 박지 X** — fetchHubPosts 403 (RLS 격차) 또는 admLoadBoard Promise.all 박힘 실패
7. **다른 페이지 회귀** — 본진 변경 외 영역 영향 박힘
8. **Console 빨간 에러** — 함수 호출 격차

→ § 9 신호 발견 시 모든 검증 중단 + 즉시 보고 (commit hash + 격차 본문).

---

## § 10 보고 형식

```
[§ 1 캐시] 본진 1: PASS/FAIL
[§ 2 입력바] 본진 A: 4·5·6·7·8·9·10 → PASS/FAIL
[§ 3 칩] 본진 2: 11~24 → PASS/FAIL
[§ 4 버블] 본진 3: 25~30 → PASS/FAIL
[§ 5 맥락 태그] 본진 4: 31~35 → PASS/FAIL
[§ 6 길게 누르기] 본진 5: 36~42 → PASS/FAIL
[§ 7 허브] 본진 B: 43~46 → PASS/FAIL
[§ 8 회귀 0] 47~52 → PASS/FAIL

[종합 판단]
- 5/18 D-4 본진 박힘: PASS/FAIL
- 회귀 신호: 없음 / (있으면 § 9 신호 번호)
- 다음 본진 권고: ____
```

---

## § 11 금지 사항

- 코드 수정 X (본 의뢰서는 진단만)
- DB 작업 X (Supabase Dashboard 진입 X)
- git commit / push X
- 패치 박을 자리 = Code 본진

---

**END OF REQUEST v2**

> 본 의뢰서 = 5/18 4팀 오픈 D-4 본진 전체 라이브 회귀 검증. PASS 박힘 시 5/18 D-3 진입 안전마진 박음. FAIL 박힘 시 Code 패치 본진 진입.
