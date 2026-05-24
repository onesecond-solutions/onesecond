# Chrome 회귀 검증 의뢰서 — D영역 단톡방 셸 라이브 본진 (5/18 4팀 오픈)

> **작성일:** 2026-05-13
> **수신:** Claude in Chrome
> **본진:** 본 의뢰서 = 5/18 4팀 오픈 D-5 시점 라이브 회귀 검증 본진
> **사이트:** https://onesecond.solutions
> **Supabase:** https://supabase.com/dashboard/project/pdnwgzneooyygfejrvbg
> **commit 본진 3건:** `175e832` (mockup) / `2daac17` (personal_memos) / `0d2819a` (board) / `e0a4a0b` (Drive link)

---

## § 0 사전 진입

### 0-1. Dashboard PASS 박힘 확인

Step 3 `docs/migrations/2026-05-13_personal_memos.sql` 실행 결과 검증:
- 테이블 박힘 / RLS / 인덱스 / 트리거 박힘 정합

→ Dashboard 실행 박지 X = 본 검증 박음 본진 박지 X. 실행 박힘 후 진입.

### 0-2. 로그인 계정 4건 (역할별 시나리오)

| # | 계정 | 역할 | 본진 |
|---|---|---|---|
| 1 | `bylts0428@gmail.com` | admin | 전역 권한 + 4팀 단체방 본인 메시지 |
| 2 | `jaisung78@gmail.com` | ga_manager (4팀) | 4팀 실장 본인 (215건 author) |
| 3 | `bylts@naver.com` | ga_manager (4팀, alias) | 4팀 매니저 본인 |
| 4 | `gatest@example.com` | ga_member (4팀) | 일반 설계사 본인 |

각 계정 진입 후 board 본진 검증.

---

## § 1 회귀 검증 시나리오 18건

### A. 라이브 진입 + 탭 본진

| # | 검증 | 기대값 |
|---|---|---|
| 1 | board 첫 진입 시 활성 탭 | 📢 **4팀 단체방** (옛 📋 스마트 게시판 X) |
| 2 | 탭바 표시 탭 수 | 데스크탑 2탭만 (📢 4팀 단체방 + 🧭 네비게이션방). qna / manager_lounge / insurer / hub / archive_legacy hide |
| 3 | 보조 3탭 row | 통째 hide (insurer / hub / archive_legacy) |
| 4 | `_currentBoard` 박힘 | DevTools console: `_currentBoard` = `'manager_notice'` |

### B. D영역 단톡방 셸 본진

| # | 검증 | 기대값 |
|---|---|---|
| 5 | `#notice-room-shell` 표시 | display 박힘 (manager_notice 박힘 시) |
| 6 | `#post-list` hide | display:none (단톡방 셸 박힘 시) |
| 7 | `.board-filter-bar` hide | display:none |
| 8 | 좌측 채팅 + 우측 자산 grid | 1fr 1024px+ / 1024px 미만 = 1fr (자산 hide) |

### C. 215건 manager_notice 메시지 변환

| # | 검증 | 기대값 |
|---|---|---|
| 9 | 메시지 풍선 표시 | 215건 posts → 채팅 풍선 (날짜 구분선 + 시간 박힘) |
| 10 | 본인 풍선 (한재성 로그인 시) | 우 정렬 + brand-50 (#FDF4EF) 배경 + brand-100 보더 |
| 11 | 타인 풍선 | 좌 정렬 + 아바타 (이름 첫 글자) + 회색 배경 |
| 12 | 공지 펼침 (is_notice=true 박힘 posts) | 📌 펼침 표시 + 클릭 → 접힘/펼침 토글 |

### D. 입력바 4차 보강

| # | 검증 | 기대값 |
|---|---|---|
| 13 | textarea 높이 | min-height 80px (옛 input 40px의 2배) |
| 14 | 파일 추가 📎 버튼 | 클릭 → 파일 선택창 박힘 + 첨부 미리보기 chip (이름·크기·✕ 제거) |
| 15 | 메시지 전송 | textarea 박힘 + Enter (Shift+Enter = 줄바꿈) → posts INSERT → 채팅 즉시 재로드 |

### E. 본인 메시지 액션 (Q12-D①+③)

| # | 검증 | 기대값 |
|---|---|---|
| 16 | 본인 풍선 클릭 → 액션 메뉴 | ✏️ 수정 / 📎 파일 추가 / 🗑️ 삭제 박힘 |
| 17 | 외부 클릭 → 메뉴 닫음 | 다른 영역 클릭 시 메뉴 자동 닫음 |
| 18 | 수정 동작 | inline textarea + Ctrl+Enter 저장 (PATCH) / Esc 취소 / blur 저장 |
| 19 | 삭제 동작 | confirm → DELETE → DOM 제거 |
| 20 | 파일 추가 동작 | Drive URL prompt → 파일명 prompt → attachments PATCH → 자산 패널 + 메시지 chip 자동 갱신 |
| 21 | 5분 제한 | 5분 지난 메시지 액션 시 alert ("5분 지난 메시지는 X") |

### F. 자산 패널 + 메모

| # | 검증 | 기대값 |
|---|---|---|
| 22 | 헤더 명명 (manager_notice) | "더원4팀 단체방 · 40명" |
| 23 | 헤더 명명 (navigation) | "더원4팀 네비게이션방 · 40명" |
| 24 | 사진/동영상 분류 | 확장자 jpg/jpeg/png/gif/webp/heic/mp4/mov/webm → 사진 섹션 |
| 25 | 파일 분류 | 나머지 확장자 (pdf/pptx/xlsx 등) → 파일 섹션 + Drive view link |
| 26 | 링크 분류 | http(s):// 박힘 → 링크 섹션 |
| 27 | 메모 fetch | `personal_memos?scope=eq.notice_room` → 본인 메모 1건 박힘 시 textarea 박음 |
| 28 | 메모 저장 | 텍스트 박음 + 💾 저장 → PATCH (기존 박힘) / INSERT (사전 부재) → alert 박힘 |
| 29 | 마이스페이스 진입 | 📂 클릭 → switchMenu('myspace') 박힘 |

### G. navigation 탭 분기

| # | 검증 | 기대값 |
|---|---|---|
| 30 | navigation 탭 클릭 | 헤더 "더원4팀 네비게이션방" + 5/13 시드 5건 메시지 박힘 (트랙 3 SQL 박힘 후) |

### H. 모바일 회귀 (768px 미만)

| # | 검증 | 기대값 |
|---|---|---|
| 31 | DevTools → Toggle Device → 375px | 자산 패널 hide + 좌측 채팅 fullwidth |

### I. 다른 페이지 회귀 0

| # | 검증 | 기대값 |
|---|---|---|
| 32 | home / scripts / quick / myspace / together / news 진입 | 영향 0 (콘솔 에러 0) |
| 33 | admin_v2 진입 | Phase E Step E-3 매트릭스 박힘 그대로 (commit 14f7322 회귀 0) |
| 34 | 보험사 게시판 (insurer) 사용자가 hide 박힘 | 메뉴 자체 노출 X (보조 row hide 박힘) |

---

## § 2 사고 신호 시 즉시 정지

| 신호 | 본진 |
|---|---|
| 215건 메시지 박지 X | board_type='manager_notice' SELECT 직접 박음 검증 + author_id 박힘 확인 |
| 본인 풍선 우 정렬 X | `window.AppState.userId` 박힘 + posts.author_id 박힘 검증 |
| 메모 저장 실패 | personal_memos 박힘 + RLS 정책 박힘 검증 |
| 5탭 노출 박힘 | `data-hidden-5-18="1"` attribute 박힘 + style:display:none 박힘 검증 |
| 콘솔 에러 | 메시지 raw 스크린샷 + Network 탭 응답 박음 |

---

## § 3 보고 형식

```
[A. 라이브 진입]
  #1 PASS / FAIL (상세)
  ...
[B. D영역 셸] ...
[C. 메시지 변환] ...
[D. 입력바] ...
[E. 본인 액션] ...
[F. 자산+메모] ...
[G. navigation] ...
[H. 모바일] ...
[I. 회귀 0] ...

[총 PASS / FAIL 카운트]
[발견 사고 신호 N건]
[스크린샷 N장]
[콘솔 에러 N건]
```

---

## § 4 금지 사항

- 215건 manager_notice 박힘 임의 변경 X (5/12 본진 박힘 보존)
- admin_v2 매트릭스 임의 토글 X (Phase E 별 검증)
- 5분 지난 메시지 강제 수정 시도 X (RLS 검증만)
- 본인 외 다른 사용자 메시지 수정 시도 → RLS 거부 확인 박음

---

**END OF CHROME REQUEST**

> 본 의뢰서 = 5/18 4팀 오픈 D-5 본진 라이브 회귀 검증 baseline.
> Dashboard PASS + Chrome PASS 박힘 박은 후 5/18 오픈 진입 안전마진 박힘.
> FAIL 박힘 시 Code 즉시 패치 박음.
