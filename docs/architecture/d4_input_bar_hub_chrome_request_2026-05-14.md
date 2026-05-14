# Chrome 회귀 검증 의뢰서 — 5/18 D-4 본진 A+B (입력바 풀폼 전환 + 허브 게시판 admin 전용)

> **작성일:** 2026-05-14
> **수신:** Claude in Chrome (또는 팀장님 직접 라이브 검증)
> **본진:** 5/18 4팀 오픈 D-4 시점 본진 A·B 라이브 회귀 검증
> **사이트:** https://onesecond.solutions
> **Supabase:** https://supabase.com/dashboard/project/pdnwgzneooyygfejrvbg
> **commit 본진 2건:** `bada025` (A board 입력바 → 풀폼 전환) / `3c5a73e` (B admin_v2 허브 게시판)

---

## § 0 사전 진입

### 0-1. 라이브 push 후 진입

본 의뢰서는 commit `bada025` + `3c5a73e` 라이브 반영(push) 박힌 후 가동. push 전 진입 무효.

### 0-2. 로그인 계정 4건 (역할별 시나리오)

| # | 계정 | 역할 | 본진 |
|---|---|---|---|
| 1 | `bylts0428@gmail.com` | admin | A 단톡방 입력바 풀폼 진입 + B admin_v2 허브 게시판 admin 전용 보기 |
| 2 | `jaisung78@gmail.com` | ga_manager (4팀 실장) | A manager_notice 탭 입력바 → openManagerNoticeOverlay 풀폼 진입 (RBAC PASS) |
| 3 | `bylts@naver.com` | ga_manager (4팀, alias) | A 동일 + navigation 탭 입력바 → openWriteOverlay 4 카드 진입 |
| 4 | `gatest@example.com` (또는 4팀 ga_member 1건) | ga_member | A manager_notice 입력바 클릭 시 RBAC alert 박음 (PASS) / navigation 입력바 클릭 시 풀폼 진입 (PASS) |

---

## § 1 회귀 검증 시나리오

### A. board.html 단톡방 입력바 → 풀폼 진입 전환 (commit `bada025`)

#### A-1. 입력바 시각 변경 (모든 계정 공통)

| # | 검증 | 기대값 |
|---|---|---|
| 1 | board 진입 (manager_notice 탭 = 활성) → 입력바 시각 | textarea readonly + placeholder "✏️ 클릭하면 공지 작성 폼이 열립니다 (제목·범위·첨부 포함)" |
| 2 | 입력바 우측 버튼 라벨 | "✏️ 공지 작성" (옛 "전송" X) |
| 3 | 📎 첨부 버튼 노출 | 자리 제거 박힘 (입력바 안 X) |
| 4 | 입력바 hover 시각 | `.notice-input-bar:hover` background = brand-50 (#FDF4EF), cursor:pointer |
| 5 | DevTools `#notice-input` element | `readonly` attribute + `tabindex="-1"` |

#### A-2. 입력바 클릭 → 풀폼 진입 (admin / ga_manager 시나리오)

| # | 검증 | 기대값 |
|---|---|---|
| 6 | manager_notice 탭에서 입력바 클릭 (admin / ga_manager / ga_branch_manager) | `openManagerNoticeOverlay()` 호출 → 4 카드 skip + 실장님 공지 풀폼 단독 진입 (write-overlay active) |
| 7 | 풀폼 진입 시 헤더 | "📌 실장님 공지 작성" |
| 8 | 풀폼 audience_target 기본값 | "팀 내부" (`team_internal`) |
| 9 | 풀폼 `insurer_specific` 옵션 | hidden (manager_notice 본진 = 팀·지점·네비방·운영진 4종만) |
| 10 | navigation 탭으로 전환 후 입력바 클릭 | `openWriteOverlay()` 호출 → 2층 구조 4 카드 모달 (공지·인수·상품·기타) |

#### A-3. RBAC 분기 (ga_member 시나리오)

| # | 검증 | 기대값 |
|---|---|---|
| 11 | ga_member 로그인 + manager_notice 탭 입력바 클릭 | alert "실장님 공지는 관리자 또는 지점장·실장만 작성할 수 있습니다." 박음 → 풀폼 진입 X |
| 12 | ga_member + navigation 탭 입력바 클릭 | 4 카드 모달 진입 (네비게이션방 = 지점 전체 + 보험사 임직원 사용처) |
| 13 | insurer_member 로그인 시 navigation 탭 | 입력바 클릭 → 4 카드 모달 진입 PASS (admin 제외 8 역할 정합) |

#### A-4. 키보드 진입 (접근성)

| # | 검증 | 기대값 |
|---|---|---|
| 14 | 입력바 Tab focus | role="button" + tabindex=0 박힘 → focus outline 박음 (brand-400) |
| 15 | focus 상태 Enter / Space | `onClickWriteBtn()` 호출 → 풀폼 진입 |

#### A-5. 옛 빠른 메시지 함수 보존 (5/19 후 복귀 안전망)

| # | 검증 | 기대값 |
|---|---|---|
| 16 | DevTools console: `typeof window.sendNoticeMsg` | `"function"` (코드 보존, 호출 자리만 제거) |
| 17 | DevTools console: `typeof window.openNoticeFilePicker` | `"function"` |
| 18 | DevTools console: `typeof window.onNoticeFileSelected` | `"function"` |

---

### B. admin_v2 허브 게시판 admin 전용 보기 (commit `3c5a73e`)

#### B-1. admin 진입 (bylts0428@gmail.com)

| # | 검증 | 기대값 |
|---|---|---|
| 19 | admin_v2 진입 → 좌측 rail "💬 게시판" 클릭 (data-view="board") | board section 활성 + `admLoadBoard` 호출 |
| 20 | board section 하단 panel 시각 | "🌐 허브 게시판 (admin 전용 보기)" 제목 + "admin 전용" 배지 (info 톤) |
| 21 | panel 안내 텍스트 | "팀·지점 우수 글이 승인된 공개 게시판. 미래 100만 설계사 진입로. posts board_type='hub' 조회." + [v1.1 라이브 + v1.2 승인·반려 대기] 라벨 |
| 22 | tbody#adm-hub-posts-tbody 초기 상태 | "불러오는 중..." → 1~2초 후 fetch 결과 표시 |
| 23 | DB 0건 시 표시 | "허브 게시글 없음 (board_type=hub 0건 — 승인 흐름 v1.2 가동 후 채워질 예정)" |
| 24 | DB 1건 이상 시 표시 | 5열 테이블 (제목 / 작성자 / 카테고리 / 작성일 / 액션) |
| 25 | 행 액션 버튼 | 👁️ (숨김) / 🗑️ (삭제) 박음 |
| 26 | 사이드바 board pane 안 "🌐 허브 게시판 (admin 전용)" 섹션 | section title 박음 + "전체 게시글 LIVE" 가동 메뉴 + "승인 대기 [v1.2]" / "반려 게시글 [v1.2]" pending |

#### B-2. admin 액션 검증

| # | 검증 | 기대값 |
|---|---|---|
| 27 | 허브 게시글 1건 이상 시 👁️ 숨김 클릭 | `handleHidePost(postId)` 호출 → PATCH posts `is_hidden=true` → 토스트 "게시글 숨김 완료" → 다음 admLoadBoard 호출 시 "숨김" 배지 박음 |
| 28 | 🗑️ 삭제 클릭 | confirm 박음 → DELETE posts → 토스트 "게시글 삭제 완료" |
| 29 | DevTools console: `typeof window.admLoadBoard` | `"function"` |
| 30 | DevTools console fetch 결과 | `await fetch('/rest/v1/posts?board_type=eq.hub&limit=5', { headers: { apikey: ..., authorization: ... } })` → 200 OK |

#### B-3. RLS 검증 (admin role posts board_type=hub 조회)

| # | 검증 | 기대값 |
|---|---|---|
| 31 | admin 로그인 + Supabase Dashboard SQL editor: `SELECT COUNT(*) FROM posts WHERE board_type='hub';` | 0 이상 (RLS 통과 확인) |
| 32 | DevTools Network 탭: posts?board_type=eq.hub 요청 | 200 OK + 응답 body = 배열 |

---

### C. 비-admin 진입 시 회귀 0 (admin_v2 진입 자체 차단)

| # | 검증 | 기대값 |
|---|---|---|
| 33 | ga_manager (jaisung78@gmail.com) admin_v2 직접 URL 진입 시도 | 인증 게이트 박혀 진입 차단 (기존 본진, 회귀 0) |
| 34 | ga_member admin_v2 직접 URL 진입 시도 | 동일하게 차단 |

---

### D. 다른 페이지 회귀 0 검증

| # | 검증 | 기대값 |
|---|---|---|
| 35 | scripts.html 진입 | 변경 0, 정상 가동 |
| 36 | quick.html / together.html / myspace.html 진입 | 변경 0, 정상 가동 |
| 37 | home_v2.html 진입 | 변경 0, 정상 가동 |
| 38 | admin_v2 다른 section (dashboard / operations / content / settings / users / analytics / notice) | 변경 0, 정상 가동 |
| 39 | board.html 다른 탭 (현재는 manager_notice + navigation 2탭만 활성, 5/19 후 자동 복귀 분기 박혀 있음) | 변경 0 |
| 40 | board.html 모바일 768px 진입 | A 입력바 시각 + 클릭 핸들러 정합 (모바일에서도 풀폼 진입) |

---

## § 2 사고 신호 시 즉시 정지

다음 신호 발견 시 모든 검증 중단하고 즉시 보고:

1. **단톡방 입력바 클릭 시 풀폼 진입 X** — onClickWriteBtn 호출 실패 또는 RBAC 분기 회귀
2. **풀폼 진입 후 등록 시 INSERT 실패** — 옛 글쓰기 흐름 회귀 (별 본진, 본 A 범위 외 가능성)
3. **admin_v2 허브 게시판 panel 시각 부재** — HTML 박힘 실패 또는 css class 충돌
4. **fetchHubPosts 403** — admin RLS 부재 (별 본진 — Supabase posts table policy admin role 추가 필요)
5. **fetchHubPosts 500** — board_type='hub' enum 부재 또는 컬럼 격차
6. **기존 board section KPI / 활동 차트 / 신고 대기 회귀** — admLoadBoard Promise.all 4건 박힘 후 회귀 가능성

→ 90% 확률로 Supabase RLS 격차 또는 commit push 누락. 

---

## § 3 보고 형식

```
[A 회귀 검증 결과]
- 5번 textarea readonly: PASS/FAIL
- 6번 admin manager_notice 입력바 클릭: PASS/FAIL
- ... (1~18번 항목별)

[B 회귀 검증 결과]
- 19번 admin admin_v2 진입: PASS/FAIL
- ... (19~32번)

[C 비-admin 회귀]
- 33~34번: PASS/FAIL

[D 다른 페이지 회귀 0]
- 35~40번: PASS/FAIL

[발견 격차 / 사고 신호]
- (있으면 § 2 신호 번호 + 상세)
- (없으면 "회귀 신호 0")
```

---

## § 4 금지 사항

- **로컬 dev server 검증 X** — 본 의뢰서는 라이브 (https://onesecond.solutions) 검증 본진
- **DB 직접 수정 X** — 본 의뢰서 진입 시 SQL 실행 0
- **다른 commit 박음 X** — 본 의뢰서는 검증 본진, 코드 수정은 별 본진

---

**END OF REQUEST**

> 본 의뢰서 = 5/18 4팀 오픈 D-4 시점 본진 A·B 라이브 회귀 검증 본진. 검증 PASS 박힘 시 5/18 D-3 진입 안전마진 박음. FAIL 박힘 시 Code 패치 본진 진입.
