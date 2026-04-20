# 작업 지시서 — 함께해요 전체 개발

**작성일:** 2026-04-19
**배포 시점:** 2026-04-21 (월) 배포 전 완료 필요
**작업 범위:** 사이드바 메뉴 추가 + 신규 페이지 개발 + Supabase 연동 + 랜딩페이지 연결
**참조:** `../_context/00_MASTER.md`, `../_docs/design_guide.md`, `../_docs/supabase_schema.md`

---

## 🎯 작업 목표

원세컨드에 **"함께해요"** 라는 공동 제작 커뮤니티 공간을 신규 개설.
업무용 게시판(board.html)과 완전히 분리된 **사용자 참여 전용 공간**.

### 전략적 의미
- 설계사를 사용자가 아닌 **공동 제작자로 위치시키는 선언**
- "필요한 기능이 있나요? 만들어 드립니다" 실행 도구
- 가입 장벽을 가입 이유로 전환 (랜딩페이지에서 직행)

---

## 📋 작업 범위 (5가지)

### 1. Supabase 스키마 확장

### 2. 사이드바 메뉴 "함께해요" 추가

### 3. `together.html` 신규 페이지 개발

### 4. 글쓰기·읽기·댓글 기능

### 5. 랜딩페이지 연결 + 가입 완료 후 자동 이동

---

## 🔧 상세 작업

## [1] Supabase 스키마 확장

### 1-1. `posts` 테이블 활용
기존 `posts` 테이블에 새로운 `board_type` 값 추가.

**새 board_type 값:** `'together'`

**카테고리 매핑 (category 컬럼 활용):**
- `feature_request` — 기능 요청
- `review` — 사용 후기
- `free` — 자유 공유

### 1-2. 필요 시 실행할 SQL (대부분 기존 구조로 커버)

```sql
-- board_type 컬럼에 together 값이 들어갈 수 있도록 확인만
-- (기존 posts 테이블은 text 타입이라 별도 제약 없으면 그대로 사용 가능)

-- 샘플 데이터 삽입 (배포 전 최소 3개)
INSERT INTO posts (
  title, content, category, board_type, author_name, 
  is_notice, is_hidden, created_at
) VALUES
(
  '원세컨드에 바라는 점, 자유롭게 남겨주세요',
  '원세컨드는 여러분과 함께 만들어갑니다. 필요한 기능, 개선 아이디어, 사용하시면서 느낀 점 모두 환영합니다.',
  'free',
  'together',
  '운영자',
  true,
  false,
  NOW()
),
(
  '스크립트 "반론 대응" 더 많이 있으면 좋겠어요',
  '요즘 고객들이 반론하는 패턴이 다양해졌는데, 현재 스크립트보다 더 많은 예시가 있으면 좋겠습니다.',
  'feature_request',
  'together',
  '김설계사',
  false,
  false,
  NOW() - INTERVAL '1 day'
),
(
  '첫날 써봤는데 진짜 편해요',
  '통화 중에 멘트 찾을 필요 없이 바로 나와서 좋네요. 특히 "상황 확인" 단계 스크립트가 도움됐습니다.',
  'review',
  'together',
  '이팀장',
  false,
  false,
  NOW() - INTERVAL '2 days'
);
```

**주의:** SQL은 팀장님이 Supabase SQL Editor에서 직접 실행할 수도 있음. Claude Code는 SQL 스크립트를 별도 파일로 생성해서 제공.

---

## [2] 사이드바 메뉴 "함께해요" 추가

### 2-1. 수정 대상 파일
- `app.html` (사이드바 메뉴 구조)
- `auth.js` 또는 `app.js` (메뉴 표시 로직)
- `tokens.css` (주황색 변수 확인)

### 2-2. 메뉴 사양

| 항목 | 값 |
|------|-----|
| 메뉴 ID | `menu_together` |
| 표시 이름 | **함께해요** |
| 위치 | 사이드바 맨 아래 (`menu_quick` 바로 아래) |
| 아이콘 | **없음** (텍스트만) |
| 색상 | **주황** (`var(--color-accent)` = `#D4845A`) |
| 연결 페이지 | `pages/together.html` |
| 권한 | 모든 role 접근 가능 |

### 2-3. 시각 차별화 (중요)

**다른 메뉴들과 명확히 구분되어야 함.**

**옵션 A: 텍스트만 주황**
```css
.sidebar-menu[data-menu="together"] .menu-text {
  color: var(--color-accent);
  font-weight: 600;
}
```

**옵션 B: 배경 은은한 주황 + 텍스트 주황 (추천)**
```css
.sidebar-menu[data-menu="together"] {
  background: rgba(212, 132, 90, 0.08);
  border-left: 3px solid var(--color-accent);
}
.sidebar-menu[data-menu="together"] .menu-text {
  color: var(--color-accent);
  font-weight: 600;
}
```

**옵션 B 채택 (팀장님 요청 반영).**

### 2-4. app_settings 연동
`menu_b` 그룹에 `menu_together` 키 추가 가능 (관리자 토글용).

```sql
INSERT INTO app_settings (group_name, key, value, label) VALUES
('menu_b', 'menu_together', 'true', '함께해요');
```

기본값 `true`. 관리자가 admin.html에서 ON/OFF 가능.

---

## [3] `together.html` 신규 페이지 개발

### 3-1. 파일 경로
`pages/together.html`

### 3-2. 페이지 구조

```
┌─────────────────────────────────────────┐
│  함께해요                                │ ← 타이틀
│  필요한 기능이 있나요? 만들어 드립니다.  │ ← 2차 타이틀
│  17년 현장 경험 위에, 여러분의 경험을   │
│  더합니다.                               │ ← 3차 보조
├─────────────────────────────────────────┤
│  [+ 글쓰기] 버튼 (주황)                  │
├─────────────────────────────────────────┤
│  [전체] [기능 요청] [사용 후기] [자유]   │ ← 탭
│   ━━━                                    │
├─────────────────────────────────────────┤
│  📌 [공지] 원세컨드에 바라는 점 공유    │
│      운영자 · 2026.04.21                 │
├─────────────────────────────────────────┤
│  ▶ [기능요청] 스크립트 "반론 대응"...   │
│      김설계사 · 2026.04.22 · 💬 3        │
│                                          │
│  ▶ [후기] 첫날 써봤는데 진짜 좋아요     │
│      이팀장 · 2026.04.21 · 💬 5          │
└─────────────────────────────────────────┘
```

### 3-3. 스타일 규칙 (design_guide.md 준수)

- CSS 변수만 사용, 하드코딩 금지
- 모든 컴포넌트 최소 `--radius-sm` (8px) 이상
- 폰트: Pretendard 우선 → Noto Sans KR 폴백
- 색상: 웜 브라운 팔레트 기준
- 주황색 강조 포인트: 타이틀·글쓰기 버튼·카테고리 태그

### 3-4. 반응형
- 모바일(640px 이하): 탭 가로 스크롤 또는 드롭다운
- 태블릿(960px 이하): 카드 세로 배치
- 데스크톱: 리스트형

### 3-5. app.html 연동 (중요)
- `app.html` IIFE 래핑 환경에서 동작
- 모든 함수는 `window.functionName` 전역 등록 필수
- `defer` 금지
- `appstate:ready` 이벤트 기반 부트
- 폰트 크기: app.html의 `_fontSizeMap`이 content-area에 px 주입 → child는 em 단위 사용

---

## [4] 글쓰기·읽기·댓글 기능

### 4-1. 글쓰기 폼

**진입:** `[+ 글쓰기]` 버튼 클릭 시 모달 또는 별도 화면

**폼 필드:**
```
┌─────────────────────────────────────┐
│  ← 뒤로                              │
│                                      │
│  카테고리 *                          │
│  [기능 요청 ▼]                       │
│    ├ 기능 요청                       │
│    ├ 사용 후기                       │
│    └ 자유 공유                       │
│                                      │
│  제목 *                              │
│  [_______________________________]   │
│                                      │
│  내용 *                              │
│  [_______________________________]   │
│  [_______________________________]   │
│  [_______________________________]   │
│                                      │
│  [취소]              [저장]          │
└─────────────────────────────────────┘
```

**검증:**
- 카테고리: 필수, 3개 중 택1
- 제목: 필수, 2~100자
- 내용: 필수, 10~5000자

**저장 로직:**
```javascript
async function saveTogetherPost(data) {
  const { title, content, category } = data;
  const user = window.AppState?.user || {};
  
  const payload = {
    title,
    content,
    category,
    board_type: 'together',
    author_name: user.nickname || user.name || '익명',
    user_id: user.id,
    is_notice: false,
    is_hidden: false,
    created_at: new Date().toISOString()
  };
  
  const { data: result, error } = await supabase
    .from('posts')
    .insert(payload)
    .select();
  
  if (error) {
    console.error('글 저장 실패:', error);
    alert('저장에 실패했습니다. 다시 시도해주세요.');
    return null;
  }
  
  return result[0];
}
```

### 4-2. 읽기 (리스트)

**기본 정렬:** 공지 먼저 → 최신순

**쿼리:**
```javascript
async function loadTogetherPosts(category = 'all') {
  let query = supabase
    .from('posts')
    .select('*')
    .eq('board_type', 'together')
    .eq('is_hidden', false)
    .order('is_notice', { ascending: false })
    .order('created_at', { ascending: false });
  
  if (category !== 'all') {
    query = query.eq('category', category);
  }
  
  const { data, error } = await query;
  if (error) {
    console.error('글 로드 실패:', error);
    return [];
  }
  return data;
}
```

### 4-3. 상세 보기

**진입:** 리스트에서 제목 클릭

**구성:**
- 제목
- 카테고리 태그 + 작성자 + 작성일
- 본문
- 댓글 리스트
- 댓글 작성 폼
- [목록으로] 버튼

### 4-4. 댓글 (replies 테이블 활용)

기존 `replies` 테이블 그대로 사용.

**댓글 저장:**
```javascript
async function saveReply(postId, content) {
  const user = window.AppState?.user || {};
  
  const payload = {
    post_id: postId,
    content,
    user_id: user.id,
    author_name: user.nickname || user.name || '익명',
    created_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('replies')
    .insert(payload)
    .select();
  
  return error ? null : data[0];
}
```

---

## [5] 랜딩페이지 연결 + 가입 완료 후 자동 이동

### 5-1. index.html 신규 섹션 추가

**위치:** E 영역(target-cta-section)과 F 영역(pricing) 사이

**섹션 구조:**
```html
<section class="together-intro-section">
  <div class="container">
    <h2 class="together-title">함께 만들어가는 원세컨드</h2>
    <p class="together-sub">필요한 기능이 있나요? 만들어 드립니다.</p>
    <p class="together-desc">17년 현장 경험 위에, 여러분의 경험을 더합니다.</p>
    <button class="together-cta" onclick="scrollToSignup()">지금 요청하기</button>
  </div>
</section>

<!-- 가입 폼 영역 (섹션 바로 아래 상시 노출) -->
<section class="signup-inline-section" id="signupSection">
  <div class="container">
    <h3>30일 체험부터 시작해보시죠?</h3>
    <p class="signup-notice">회원가입 완료 후 "함께해요" 게시판에서 요청하실 수 있습니다.</p>
    <!-- 기존 가입 폼과 동일한 필드 -->
    <form id="inlineSignupForm">
      <input type="email" placeholder="이메일" required>
      <input type="password" placeholder="비밀번호" required>
      <input type="text" placeholder="이름" required>
      <button type="submit">가입하고 요청하기</button>
    </form>
  </div>
</section>
```

### 5-2. 스타일 규칙
- `together-intro-section`: 배경 약한 주황 (`rgba(212,132,90,0.05)`)
- `together-title`: 큰 제목, 웜 브라운
- `together-sub`: 2차 제목, 주황 강조
- `together-desc`: 보조 문구, 회색
- `together-cta`: 주황 버튼, Shimmer 효과 (기존 B 히어로 cta-main과 동일)

### 5-3. 가입 완료 후 자동 이동 로직

**기존 signup 함수에 redirect 추가:**
```javascript
async function handleInlineSignup(event) {
  event.preventDefault();
  
  const email = form.email.value;
  const password = form.password.value;
  const name = form.name.value;
  
  // Supabase Auth 회원가입
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role: 'member' }
    }
  });
  
  if (error) {
    alert('가입 실패: ' + error.message);
    return;
  }
  
  // 가입 성공 시 자동 로그인 + together 페이지로 이동
  // ?redirect 파라미터로 목적지 지정
  window.location.href = '/app.html?redirect=together';
}
```

**app.html 부팅 시 redirect 파라미터 처리:**
```javascript
// appstate:ready 이벤트 리스너 내부
const params = new URLSearchParams(window.location.search);
const redirect = params.get('redirect');
if (redirect === 'together') {
  // together 메뉴 자동 클릭
  setTimeout(() => {
    document.querySelector('[data-menu="together"]')?.click();
  }, 500);
}
```

---

## 🗃️ 파일 수정 목록

| 파일 | 작업 |
|------|------|
| `app.html` | 사이드바 메뉴 "함께해요" 추가, redirect 로직 |
| `pages/together.html` | 신규 생성 |
| `index.html` | 신규 섹션 추가 + 가입 폼 인라인 + 리다이렉트 |
| `tokens.css` | 필요 시 주황 변수 확인/추가 |
| `auth.js` | 가입 완료 후 redirect 처리 (있는 경우) |
| `db.js` | together 관련 쿼리 함수 추가 |
| `admin.html` | (선택) menu_together ON/OFF 토글 추가 |

---

## ✅ 검증 체크리스트

### 메뉴
- [ ] 사이드바 맨 아래에 "함께해요" 표시
- [ ] 주황색 텍스트 + 은은한 주황 배경
- [ ] 다른 메뉴와 시각적으로 구분됨
- [ ] 클릭 시 `together.html` 로드

### 페이지
- [ ] 타이틀 3개 (타이틀·2차·3차) 정확히 표시
- [ ] 탭 4개 (전체/기능요청/후기/자유) 작동
- [ ] 전체 탭이 기본 활성
- [ ] 샘플 게시글 3개 이상 표시

### 글쓰기
- [ ] [+ 글쓰기] 버튼 작동
- [ ] 카테고리 3개 드롭다운
- [ ] 제목·내용 검증
- [ ] 저장 시 DB에 insert 성공
- [ ] 저장 후 리스트에 즉시 반영

### 읽기·댓글
- [ ] 제목 클릭 시 상세 보기
- [ ] 댓글 작성 작동
- [ ] 댓글 리스트 표시

### 랜딩페이지 연결
- [ ] 신규 섹션 (E와 F 사이) 표시
- [ ] "지금 요청하기" 버튼 클릭 시 가입 폼으로 스크롤
- [ ] 가입 완료 시 `app.html?redirect=together`로 이동
- [ ] app.html 부팅 시 together 메뉴 자동 선택

### 반응형
- [ ] 모바일(640px) 정상 표시
- [ ] 태블릿(960px) 정상 표시
- [ ] 데스크톱 정상 표시

### 권한
- [ ] 모든 role에서 접근 가능
- [ ] 로그인하지 않은 사용자는 읽기만 가능, 쓰기 차단
- [ ] admin은 모든 글 숨김/삭제 가능

---

## 🚫 하지 말 것

1. **app.html / app.js의 핵심 구조 수정 금지** — 사이드바 메뉴 추가·redirect 로직만
2. **`scripts-data.js`, `scripts-page.js` 참조 금지** — 삭제 대상 파일
3. **CSS 하드코딩 금지** — 반드시 `var(--color-*)` 사용
4. **직각 border-radius 금지** — 최소 `--radius-sm` (8px)
5. **`defer` 금지** — `appstate:ready` 이벤트 사용
6. **IIFE 래핑 해제 금지** — 모든 함수는 `window.` 전역 등록
7. **"완료" 선언 금지** — 팀장님 확인 전까지

---

## 📝 작업 후 보고 형식

작업 완료 시 다음을 보고:

### 1. 수정·생성 파일 목록
각 파일별 변경 요약 (추가/수정된 함수, 라인 수)

### 2. 검증 체크리스트 결과
위 체크리스트 각 항목 O / X / N/A

### 3. SQL 스크립트
팀장님이 Supabase SQL Editor에서 실행할 스크립트 별도 파일 제공
- `/mnt/user-data/outputs/20260419_together_setup.sql`

### 4. 예상 엣지 케이스
의심 구간, 추가 검증 필요한 부분

### 5. 배포 전 팀장님 확인 요청 사항
- Supabase SQL 실행 여부
- GitHub 업로드 대상 파일 목록

---

## 🔗 참조 문서

- `../_context/00_MASTER.md` — 불변 원칙
- `../_context/99_ARCHIVE.md` — 과거 세션 기록
- `../_docs/design_guide.md` — CSS 토큰 규칙
- `../_docs/supabase_schema.md` — DB 구조 (posts, replies, app_settings)
- `onesecond_context_update_20260419.md` — 오늘 세션 전체 맥락

---

## 🎯 작업 우선순위

### 1순위 (반드시 완성)
- [1] Supabase 스키마 확인 + 샘플 데이터 3개
- [2] 사이드바 메뉴 "함께해요" 추가
- [3] together.html 기본 페이지 (타이틀·탭·리스트)
- [4] 글쓰기·읽기 기능

### 2순위 (시간 되면)
- [4] 댓글 기능
- [5] 랜딩페이지 신규 섹션 + 가입 폼 + 리다이렉트

### 3순위 (Phase 2로 이월 가능)
- admin.html의 menu_together 토글 UI
- 고급 필터·검색

---

**배포 D-2. 차분히, 체크리스트대로 가면 됩니다.**
