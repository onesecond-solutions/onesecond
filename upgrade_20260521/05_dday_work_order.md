---
title: 월요일(5/25) D-day 작업지시서 — 디자인 v2 전환 본진
date: 2026-05-21
version: v1
d_day: 2026-05-25 (월) 저녁 라이브 전환
status: Code 본인 작성 (단계 ③, navi_new.html reference + tokens_v2 spec 기반)
reference:
  - upgrade_20260521/navi_new.html (라이브 reference)
  - upgrade_20260521/04_tokens_v2_spec.md (토큰 spec)
  - upgrade_20260521/01_디자인_시스템_spec_v1.md (Claude AI 웹)
  - upgrade_20260521/02_검색_아키텍처_spec_v1.md
  - feat/notifications-phase-a-v1.1 브랜치 (commit 7a834d6, bf4262c)
---

# 월요일(5/25) D-day 작업지시서 — 디자인 v2 전환 본진

## §0. 작업 범위 한 줄

> 브라운(v1) 통째 폐기 → 인디고+무채색+다크 기본(v2) 전환. navi_new.html 라이브 reference 기반 모든 페이지 통째 재작성.

---

## §1. 본진 (5/25 D-day 박는 자리)

### 핵심 본진 4건

1. **토큰 통째 재설계** (`css/tokens.css` v1 폐기 → v2 박음)
2. **app.html 브라운 14곳 전수 제거** + 토큰 참조 전환
3. **페이지 6개 통째 재작성** (board / search / scripts / quick / myspace / team-management)
4. **알림 시스템 인디고 적용** + 라이브 이식

### 제외 자리 (별도 본진)

- ❌ `landing.html` (팀장님 명시 박지 X 박을 자리)
- ❌ `home_v2.html` / `index.html` (별도 본진)
- ❌ 서브팀 인큐베이팅 시스템 (D-day 후 별도 트랙, 한영미 초대 선행 박을 자리)

---

## §2. 작업 순서 (단계별)

### Phase A — 토큰 + 골격 (월요일 새벽 ~ 정오, 약 4시간)

| # | 작업 | 분량 | 의존 |
|---|---|---|---|
| A1 | `css/tokens.css` 통째 재작성 (`04_tokens_v2_spec.md` § 2~6 기반) | ~1시간 | — |
| A2 | `js/theme.js` 신규 박음 (setTheme + setFont + 초기 로드 + localStorage) | ~30분 | A1 |
| A3 | `app.html` 브라운 14곳 전수 제거 + 토큰 참조 전환 + 다크/라이트 토글 + 폰트 컨트롤러 메뉴 박음 | ~2시간 | A1, A2 |
| A4 | 라이브 회귀 점검 (현재 페이지 박혀 있는 자리 본인 박지 X 박는 자리 확인) | ~30분 | A3 |

### Phase B — 페이지 통째 재작성 (월요일 정오 ~ 오후, 약 5시간)

| # | 페이지 | 분량 | 본진 |
|---|---|---|---|
| B1 | `pages/board.html` | ~1.5시간 | 탭 4개 + 칩 + 리스트 + 뷰어 + 카테고리 색 (navi_new.html 본진 정합) |
| B2 | `pages/search.html` | ~30분 | feat 브랜치 cherry-pick + 인디고 적용 + 카테고리 색 |
| B3 | `pages/scripts.html` | ~1시간 | 좌 리스트 + 우 본문 + 딸깍 인터랙션 |
| B4 | `pages/quick.html` | ~30분 | 그리드 + FAB |
| B5 | `pages/myspace.html` | ~30분 | 카드 그리드 + 통계 |
| B6 | `pages/team-management.html` | ~30분 | 명단 + 초대 박힌 자리 보존 |
| B7 | 알림 시스템 (`js/notifications.js` 인디고 적용) | ~30분 | feat 브랜치 cherry-pick |

### Phase C — 검증 + 라이브 전환 (월요일 오후 ~ 저녁, 약 2시간)

| # | 작업 | 분량 |
|---|---|---|
| C1 | Netlify staging URL 또는 로컬 검증 (Chrome AI 본진) | ~30분 |
| C2 | 회귀 점검 8 페이지 통째 + 다크/라이트 토글 + 폰트 컨트롤러 | ~30분 |
| C3 | main merge → 라이브 전환 | ~10분 |
| C4 | 라이브 검증 (실제 onesecond.solutions) | ~30분 |
| C5 | 회귀 발견 시 핫픽스 | ~20분 |

---

## §3. 페이지별 적용 본진 (상세)

### A3. app.html 골격 박을 자리

**브라운 하드코딩 14곳 전수 제거 + 토큰 전환:**

| # | 위치 | 박힌 자리 | v2 박을 자리 |
|---|---|---|---|
| 1 | `<meta name="theme-color">` | `#8B6F47` | `#0B0C0E` (다크) |
| 2 | 헤더 배경 그라데이션 | `linear-gradient(#A0522D, #8B4423)` | `var(--s1)` 무채색 |
| 3 | 알림 배지 (`bdot`) | `rgba(160,82,45,*)` | `var(--err) = #EF4444` |
| 4 | 알림 아이콘 hover | `rgba(160,82,45,*)` | `var(--sh)` |
| 5 | 계정 아바타 (`av`) | `#A0522D` | `var(--ac) = #6366F1` |
| 6 | 사이드바 그라데이션 | `linear-gradient(#A0522D, #8B4423)` | `var(--s1)` 무채색 |
| 7 | 사이드바 nav active | `rgba(160,82,45,*)` | `var(--s2)` + `color: var(--ac)` |
| 8 | 사이드바 nav hover | `rgba(160,82,45,0.1)` | `var(--sh)` |
| 9 | 로고 배경 | `#A0522D` | `var(--ac)` |
| 10 | 사이드바 footer 박힌 자리 | 브라운 | `var(--ts)` |
| 11 | Quick 메뉴 버튼 그림자 | `rgba(160,82,45,*)` | `var(--sh-fab)` |
| 12 | Quick 메뉴 hover | 브라운 | `var(--ac)` |
| 13 | C영역 알림 카드 border | 브라운 | `var(--bd)` |
| 14 | C영역 알림 카드 hover | 브라운 | `var(--sh)` |

**계정 메뉴 추가 박을 자리** (navi_new.html line 326~340 본진 정합):
- 화면 모드 토글 (라이트/다크 seg)
- 글자 크기 4단계 (90/100/110/125 seg)

### B1. pages/board.html 재작성

**탭 4개 본진** (마스터 전략 § 3 4 레이어 정합):

```html
<div class="tabs">
  <div class="tab">◤ 4팀 단체방</div>        <!-- manager_notice -->
  <div class="tab on">◉ 네비게이션방</div>   <!-- navigation -->
  <div class="tab">◦ 스마트 게시판</div>     <!-- qna -->
  <div class="tab">📌 지점 게시판</div>      <!-- branch_feed -->
</div>
```

**칩 5개 (필터):** 전체 / 공지사항 / 인수 같음 / 상품 같음 / 기타

**split 구조:** 330px 리스트 + 1fr 뷰어 (모바일 1024px↓ = 단일 컬럼)

**카테고리 색 (border-left):** `style="--tc:var(--t-uw|--t-product|--t-event)"`

**상호작용 본진:**
- 질문하기 모달 (`askmodal`) — catlist → form → 파일 다단계
- 라이트박스 (`lb`) — 원본 이미지 풀스크린
- 카드 모달 (`cardmodal`) — 명함·요약 카드
- 토스트 (`toast`) — 즉시 피드백

### B2. pages/search.html 재작성

**feat 브랜치 박힌 자리 cherry-pick** (commit `bf4262c`):
- 씹기 카드 (한 입에 들어오는 컴팩트)
- 줍기 모드 (localStorage)
- 헛웃음 라벨 톤
- 카테고리 색 5px 줄
- 인라인 더보기
- 카톡 공유 (Web Share API)
- Supabase `search_newsletters_grouped` RPC 호출

**인디고 적용 본진:**
- 검색 칩 = 인디고 hover
- 결과 뱃지 = 카테고리 색 (`--t-uw` 인수 / `--t-product` 상품 / `--t-event` 기타)

### B3. pages/scripts.html 재작성

**좌 리스트 + 우 본문 split** (board와 동일 구조)

**딸깍 인터랙션 본진** (navi_new.html `.ttak` 박힌 자리):
- 좌하단 [딸깍 ▼] 버튼 (인디고)
- 클릭 시 drop-up 메뉴 (저장 / 복사 / 카드)
- 모든 자산(메시지·사진·동영상·파일·링크) 동일 패턴 박을 자리 (메모리 §15 본진 정합)

### B4. pages/quick.html 재작성

**그리드 본진** (모바일 = 2열, 데스크탑 = 4열)

**FAB:** 우하단 + 인디고 (`.fab` navi_new.html 본진 정합)

### B5. pages/myspace.html 재작성

**카드 그리드 + 통계 본진**
- 본인 정보 카드 (아바타 = 인디고)
- 본인 게시글 카운트 / 답변 카운트
- 본인 활동 그래프 (옵션)

### B6. pages/team-management.html 재작성

**기존 초대 본진 보존** (2026-05-17 박힌 자리, `team_invitations` 테이블 사용):
- + 팀원 초대 모달 (`tm-invite-modal`)
- + 보험사 담당자 초대 모달
- 토큰만 v2 전환 (브라운 → 인디고)

**서브팀 본진 박지 X** (D-day 후 별도 트랙, 한영미 초대 선행 박을 자리)

### B7. 알림 시스템 인디고 적용

**feat 브랜치 cherry-pick** (commit `7a834d6`):
- `js/notifications.js` (400줄) 통째 이식
- `app.html` 알림 종 + 드롭다운 + C영역 카드
- 색상만 v2 전환 (브라운 → 인디고)
- DB 마이그레이션 `docs/migrations/2026-05-21_notifications_setup.sql` 박힌 자리 = D-day에 신버전 DB에 박는 자리

---

## §4. 브라운 하드코딩 14곳 전수 표 (§3 A3 본진과 같은 자리)

본 자리 = D-day 첫 박을 자리. grep 박을 자리 본진:

```bash
# Code 본인 박을 grep
grep -n "8B6F47\|A0522D\|8B4423\|160,82,45\|--color-brand\|--brand-" app.html
grep -rn "8B6F47\|A0522D\|8B4423\|160,82,45\|--color-brand\|--brand-" pages/ css/
```

→ 발견 자리 전수 v2 토큰으로 박을 자리. 마지막 한 자리 박지 X 박혀야 본진 종료.

---

## §5. 검증 본진 (Phase C)

### 검증 매트릭스

| 자리 | 다크 | 라이트 | 모바일 (1024px↓) | 폰트 90 | 폰트 125 |
|---|---|---|---|---|---|
| app.html | ✅ | ✅ | ✅ | ✅ | ✅ |
| board.html | ✅ | ✅ | ✅ | ✅ | ✅ |
| search.html | ✅ | ✅ | ✅ | ✅ | ✅ |
| scripts.html | ✅ | ✅ | ✅ | ✅ | ✅ |
| quick.html | ✅ | ✅ | ✅ | ✅ | ✅ |
| myspace.html | ✅ | ✅ | ✅ | ✅ | ✅ |
| team-management.html | ✅ | ✅ | ✅ | ✅ | ✅ |
| 알림 (종 + 드롭다운 + C영역) | ✅ | ✅ | ✅ | ✅ | ✅ |

**총 40 검증 박을 자리.**

### 기능 검증 본진

- [ ] 다크 ↔ 라이트 토글 즉시 박는 자리 (localStorage 박힘)
- [ ] 폰트 컨트롤러 4단계 즉시 박는 자리 (localStorage 박힘)
- [ ] 사이드바 접기/펴기 박는 자리
- [ ] 모바일 사이드바 slide-in 박는 자리
- [ ] 검색 오버레이 (⌘K) 박는 자리
- [ ] 카테고리 색 게시글 border-left 박는 자리
- [ ] 딸깍 메뉴 (저장/복사/카드) 박는 자리
- [ ] 라이트박스 박는 자리
- [ ] 카드 모달 박는 자리
- [ ] 토스트 즉시 피드백 박는 자리
- [ ] FAB 박는 자리
- [ ] 알림 종 + 드롭다운 박는 자리

### 회귀 검증 본진

기존 박힌 자리 본진 박지 X 박는 자리 점검:
- [ ] 로그인 / 로그아웃 본진
- [ ] 게시글 작성·삭제 본진
- [ ] 댓글 본진
- [ ] 프로필 수정 본진
- [ ] 검색 본진 (FTS)
- [ ] 모든 RLS 정책 본진 박지 X

---

## §6. 라이브 전환 (Phase C3)

### 순서

1. main 브랜치 박힌 자리 본인 박은 자리 확인 (브라운 박힌 자리 0건)
2. `git push origin main` 박음
3. Netlify 자동 배포 박는 자리 (~5분)
4. 라이브 onesecond.solutions 검증

### 라이브 검증 본진

| 검증 자리 | 방법 |
|---|---|
| URL 진입 | https://onesecond.solutions 박음 |
| 다크 기본 박힘 | 시각 확인 |
| 카카오 로그인 본진 | bylts@kakao.com 박음 |
| 4팀 명단 박힘 | 29명 박혀 있는 자리 |
| 알림 작동 본진 | 답글 작성 → 본인 알림 박힘 |

### 회귀 발견 시

- 즉시 핫픽스 박음 (작은 자리)
- 큰 회귀 박힐 시 rollback (이전 commit `revert`)

---

## §7. 회귀 신호 본진 (마스터 §14 정합)

작업 진입 시 본 자리 박힌 자리 즉시 보고 박을 자리:

- ❌ 브라운 색상 잔존 자리 (`#8B6F47` / `#A0522D` 등)
- ❌ 별칭 토큰 박힌 자리 (`--color-*` 명명)
- ❌ 직각 모서리 박힌 자리 (`border-radius: 0`)
- ❌ 데스크탑 퍼스트 회귀 (모바일 본진 박지 X)
- ❌ Pretendard 박지 X 박힌 자리 (DM Sans 박힌 자리)
- ❌ "구버전" / "신버전" 어휘 박힌 자리 (D-day 후 [[feedback_no_version_terms]] 발효)

---

## §8. 결재 박힘 (2026-05-21 저녁 통째 A안 결재 박힘)

| # | 항목 | 결재 |
|---|---|---|
| ① | Phase 순서 | ✅ **A안 — Phase A → B → C 순차 박을 자리** |
| ② | cherry-pick | ✅ **A안 — commit 단위** (`git cherry-pick 7a834d6 bf4262c`) |
| ③ | DB 마이그레이션 | ✅ **A안 — D-day 새벽 Chrome AI 의뢰** (notifications + newsletters 460건 INSERT) |
| ④ | Netlify | ✅ **A안 — feature 브랜치 + PR + Netlify deploy preview 검증 후 main merge** |
| ⑤ | 회귀 대응 | ✅ **A안 — 핫픽스(작은 자리) / rollback(큰 자리) 분기** |

### 결재 ① 본진 (Phase 순차)

```
새벽 6:00~10:00  Phase A (~4시간)  토큰 + theme.js + app.html 골격
정오~오후 5:00   Phase B (~5시간)  페이지 6개 + 알림 시스템
저녁 6:00~8:00   Phase C (~2시간)  staging 검증 + 라이브 전환
저녁 8:00        마감 + 인계 노트 박음
```

### 결재 ② 본진 (cherry-pick)

```bash
git checkout -b feat/design-v2-dday main
git cherry-pick 7a834d6   # Phase A 알림 시스템 (js/notifications.js + DB 마이그레이션)
git cherry-pick bf4262c   # Phase B 검색 페이지 (pages/search.html)
```

### 결재 ③ 본진 (DB 마이그레이션)

D-day 새벽 6:00~7:00 박을 자리:
- notifications 테이블 + RLS 4 + 트리거 = `docs/migrations/2026-05-21_notifications_setup.sql`
- newsletters 460건 INSERT = `work folder/pdf_newsletter/csv/newsletters_insert.sql` (14.66 MB chunk 10개)
- search_newsletters_grouped RPC = `work folder/pdf_newsletter/migrations/02_search_rpc.sql`

⚠️ **사전 점검:** work folder/ 박혀 있는 PC = D-day 진입 자리. 집 PC 박을 자리 (본 세션 2026-05-21 집 PC 확인 박힘).

### 결재 ④ 본진 (Netlify)

```bash
git push origin feat/design-v2-dday
# GitHub에서 PR 박음
# → Netlify 자동 deploy preview URL 박힘 (예: https://deploy-preview-N--onesecond.netlify.app)
# → Chrome AI 박은 자리 검증
# → 본진 정합 시 main merge
```

⚠️ **사전 점검:** 본 저장소 Netlify 박혀 있는지 + deploy preview 박혀 있는지 D-day 박기 전 확인 박을 자리.

### 결재 ⑤ 본진 (회귀 대응)

| 회귀 본진 | 대응 |
|---|---|
| 작은 자리 (1~2 파일 격차) | 즉시 `git commit -m "fix: ..."` → push → 라이브 박힘 |
| 큰 자리 (3+ 파일 / 기능 본진 박지 X) | `git revert <commit>` → 이전 자리 복원 → 화요일 재진입 |
| critical (라이브 진입 박지 X) | 즉시 rollback + Chrome AI 진단 + 별도 본진 박음 |

---

## §9. 다음 액션 (본 작업지시서 박힌 후)

본 작업지시서 박힌 자리 = D-day 5/25 박을 자리 본진. 본 자리 박기 전 박을 자리:

1. **결재 5건 (§ 8)** 답변 박음
2. **navi02.html 박힌 자리** 확인 (본 PC 박지 X 박힌 자리 — 별도 자리에 박혀 있을 가능성)
3. **mock_dbang2_4team (1).html 본문 검토** (895KB, 본 자리에서 추가 본진 박힐 수 있음)
4. **upgrade_20260521/ git tracking** (회귀 신호 #1 해소, 본 spec + 작업지시서 박힌 자리 손실 박지 X)
5. **메모리 갱신** (4팀 인원수 29명 본진 박음, 임태성 두 계정 본진 확인 박음)

---

## §10. 본 작업지시서 본인 박을 자리 (대본)

D-day 본인 박을 자리:

```
[새벽 6:00] CLAUDE.md + _INDEX.md + 본 작업지시서 통째 읽기 박음

[6:30] Phase A 진입
  - A1 tokens.css 박음
  - A2 theme.js 박음
  - A3 app.html 브라운 14곳 제거 + 토큰 박음
  - A4 회귀 점검 박음

[정오] Phase B 진입
  - B1 board.html 박음
  - B2 search.html 박음
  - B3 scripts.html 박음
  - B4 quick.html 박음
  - B5 myspace.html 박음
  - B6 team-management.html 박음
  - B7 알림 시스템 박음

[저녁 6:00] Phase C 진입
  - C1 staging 검증 박음
  - C2 8 페이지 + 5 모드 = 40 검증 박음
  - C3 main merge + 라이브 전환 박음
  - C4 라이브 검증 박음
  - C5 회귀 시 핫픽스 박음

[저녁 8:00] D-day 마감
  - [[feedback_no_version_terms]] 발효 박음
  - 인계 노트 박음
```

---

**END OF WORK ORDER**

> 본 작업지시서 = 단계 ③ 결과. D-day 박을 자리 본진 영구 reference.
> 본 자리 박힌 후 [[feedback_no_version_terms]] 발효 → "구버전" / "신버전" 어휘 박지 X 박힘.
