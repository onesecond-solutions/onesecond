# 작업 지시서 — 게시판 1차 탭 표시 버그 수정

**작성일:** 2026-04-18
**대상 파일:** `admin.html`, `board.html`
**배포 시점:** 2026-04-21 (월) 배포 전 완료 필요
**참조:** `../_context/00_MASTER.md`, `../_docs/design_guide.md`, `../_docs/supabase_schema.md`

---

## 🎯 버그 증상

관리자가 `admin.html` → 화면설정 → 게시판 1차 탭에서 **"허브게시판"과 "보험사게시판" 숨김**으로 저장하면, **관리자 본인의 게시판 페이지에서도** 해당 탭이 사라짐.

정상 동작: 관리자는 본인이 숨긴 탭도 관리·복구를 위해 계속 보여야 함.

---

## 🧭 수정 원칙 (`00_MASTER.md` 5-4항)

> **관리자(`admin`·`branch_manager`)는 자신이 설정한 숨김·제한을 본인에게 적용하지 않음.**
>
> 이유: 관리자는 설정을 하는 주체이므로, 본인이 숨긴 항목도 관리·복구를 위해 보여야 함.

---

## 📐 수정 로직

### 탭 표시 판단
```
현재 사용자의 role이 'admin' 또는 'branch_manager'이면
  → 4개 탭 모두 표시 (설정 무시)
그 외 role (member, manager, staff, insurer)
  → app_settings의 board_tab 그룹 값 따름
```

### 1차 탭 고정 정책
- **팀게시판 / 지점게시판**: 항상 표시 (관리자도 설정 불가)
- **허브게시판**: 관리자 토글 가능, 기본 표시
- **보험사게시판**: 관리자 토글 가능, 기본 숨김 (v2.0)

---

## 🔧 작업 범위

### 1. `board.html` 수정 (핵심)

#### 1-1. 부팅 시 설정 로드
`_boot()` 함수 안에서 `_switchBoard('hub')` 호출 **이전에** app_settings에서 `board_tab` 그룹을 fetch.

#### 1-2. 관리자 예외 처리
```javascript
var role = (window.AppState && window.AppState.role) || '';
var isAdmin = (role === 'admin' || role === 'branch_manager');

if (isAdmin) {
  // 모든 탭 표시, 설정 무시
  showHub = true;
  showInsurer = true;
} else {
  // app_settings 조회 결과 적용
  // row 없으면 기본값: showHub=true, showInsurer=false
}
```

#### 1-3. 탭 숨김 구현
```javascript
var hubTab     = document.querySelector('#board-tab-bar .pg-tab-btn[data-board="hub"]');
var insurerTab = document.querySelector('#board-tab-bar .pg-tab-btn[data-board="insurer"]');

if (!showHub)     hubTab.style.display     = 'none';
if (!showInsurer) insurerTab.style.display = 'none';
```

**중요:** DOM 제거 금지. `display:none`만 사용.

#### 1-4. 초기 활성 탭 처리
```javascript
var firstVisibleBoard = 'team';  // 기본 (항상 표시되므로 안전)
if (isAdmin || showHub) firstVisibleBoard = 'hub';
_switchBoard(firstVisibleBoard);
```

---

### 2. `admin.html` 수정 확인

**이미 v5 세션에서 구현된 것 확인 필요:**
- 화면설정 탭 → 게시판 1차 탭 섹션 (4개 토글 UI)
- `admSaveBoardTabs()` 함수 — DELETE → INSERT 패턴
- 저장 대상: `group_name='board_tab'`, keys=`board_tab_hub`, `board_tab_company`

**만약 이미 있다면 수정 없음. 동작 테스트만.**

---

## 🗃️ Supabase (변경 없음)

기존 `app_settings` 테이블 재사용. DDL 작업 없음.

**저장 예시:**
```sql
-- 기본 상태 (row 없음 → hub 표시, insurer 숨김)

-- 관리자가 허브 숨김 + 보험사 표시 저장:
group_name='board_tab', key='board_tab_hub',     value='false'
group_name='board_tab', key='board_tab_company', value='true'
```

---

## ✅ 검증 체크리스트

### 관리자 시나리오
- [ ] admin 계정 로그인 → 게시판 페이지에서 4개 탭 모두 표시
- [ ] admin이 허브·보험사 모두 숨김으로 저장
- [ ] admin 페이지 새로고침 → **4개 탭 모두 표시** (버그 수정 핵심)
- [ ] admin 게시판 페이지 새로고침 → **4개 탭 모두 표시**

### 일반 사용자 시나리오
- [ ] member 로그인 (관리자가 허브 숨김 + 보험사 숨김으로 저장한 상태)
- [ ] member 화면: 팀·지점 탭만 2개 표시
- [ ] member 첫 진입 시 팀게시판이 활성 탭
- [ ] 관리자가 허브 표시로 변경 → member 새로고침 → 허브 복구

### 기본값 시나리오
- [ ] `app_settings`에 `board_tab` row 전혀 없는 상태
- [ ] member 화면: 허브·팀·지점 3개 표시 (보험사 숨김)
- [ ] admin 화면: 4개 모두 표시

---

## 🚫 하지 말 것

1. **`app.html`, `app.js` 수정 금지** — board.html / admin.html만
2. **`scripts-data.js`, `scripts-page.js` 참조 금지** — 삭제 대상 파일
3. **탭 DOM 제거 금지** — `display:none`만 사용
4. **설정 테이블 새로 만들기 금지** — 기존 `app_settings` 재사용
5. **"완료"·"완벽" 선언 금지** — 팀장님 확인 전까지

---

## 📝 작업 후 보고 형식

작업 완료 시 다음을 보고:

1. `admin.html` 변경 요약 (추가/수정된 함수, UI 위치) — 변경 없으면 "기존 구조 유지"
2. `board.html` 변경 요약 (수정된 함수, 추가 로직, 라인 수)
3. 검증 체크리스트 결과 (각 항목 O/X/N/A)
4. 예상 엣지 케이스 또는 의심 구간

---

## 🔗 참조 문서

- `../_context/00_MASTER.md` §5-4 "관리자 예외 원칙"
- `../_context/00_MASTER.md` §5-5 "1차 탭 고정 정책"
- `../_context/99_ARCHIVE.md` §3 "v5 세션 — 게시판 1차 탭 설정 UI 구현"
- `../_context/99_ARCHIVE.md` §4 "v6 세션 — board 실제 적용 (폴백 안전장치 포함)"
- `../_docs/design_guide.md` — CSS 토큰 규칙
- `../_docs/supabase_schema.md` §app_settings — 저장 구조
