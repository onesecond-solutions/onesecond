# 원세컨드(OneSecond) 디자인 가이드

> 이 파일은 Claude가 모든 작업 세션에서 반드시 참조해야 하는 디자인 규칙입니다.
> 어떤 작업 지시가 내려와도, 아래 규칙을 먼저 확인하고 적용하세요.

---

## 1. 기본 원칙

- 프레임 구조(A1 / A2 / B / C / D 영역)는 **절대 변경 금지**
- 색상·폰트·간격·라운드는 반드시 `css/tokens.css` 변수만 사용
- 하드코딩 색상값(`#3d2b1f` 등), 하드코딩 radius(`border-radius: 0px` 등) **절대 금지**
- 직각 디자인 금지 — 모든 컴포넌트는 최소 `--radius-sm(8px)` 이상 적용

---

## 2. 색상 시스템 (tokens.css 변수)

| 변수명 | 값 | 용도 |
|--------|----|------|
| `--color-brand` | `#A0522D` | 주색 — 사이드바·헤더·버튼 기준색 (웜 테라코타 브라운) |
| `--color-brand-light` | `#C4733A` | 주색 hover / 강조 배경 |
| `--color-accent` | `#D4845A` | 강조색 — 탭 언더라인·뱃지·아이콘 포인트 (밝은 샌드 오렌지) |
| `--color-bg` | `#FAF8F5` | 전체 앱 배경 — 크림 아이보리 |
| `--color-surface` | `#FFFFFF` | 카드·패널·모달 표면 |
| `--color-surface-2` | `#F3EFE9` | 2단계 배경 — 사이드바·입력창 배경 |
| `--color-border` | `#E4DBCE` | 구분선·테두리 — 웜 베이지 톤 |
| `--color-text-primary` | `#3D2C1E` | 주요 텍스트 — 소프트 다크브라운 |
| `--color-text-secondary` | `#7A5C44` | 보조 텍스트 — 미디엄 브라운 |
| `--color-text-tertiary` | `#B89880` | 비활성·힌트·플레이스홀더 |

### 헤더 그라데이션
```css
background: linear-gradient(135deg, #A0522D 0%, #C4733A 100%);
```
> 기존 `#3d2b1f → #6b4226` 진한 다크브라운에서 밝은 웜 브라운으로 전환. 전체 밝은 톤 일관성 유지.

---

## 3. 폰트 시스템

| 변수명 | 폰트 | 용도 |
|--------|------|------|
| `--font-sans` | `'DM Sans', 'Pretendard', sans-serif` | 전체 본문 — 영문 DM Sans + 한글 Pretendard 페어링 |
| `--font-mono` | `'JetBrains Mono', monospace` | 코드·ID·수치 표시 |

### CDN 로드 방법
```html
<!-- DM Sans (Google Fonts) -->
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<!-- JetBrains Mono (Google Fonts) -->
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<!-- Pretendard (jsdelivr — 기존 유지) -->
<link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet">
```

### 폰트 사이즈 규칙
- 단위는 반드시 `em` 사용 — `px` 고정 금지
- 기준: 중(19px) 기본값
- 탭버튼: `0.895em` / 본문: `0.842em` / 라벨: `0.790em`

---

## 4. Border-radius 시스템

| 변수명 | 값 | 용도 |
|--------|----|------|
| `--radius-xs` | `6px` | 뱃지·태그·작은 칩 |
| `--radius-sm` | `8px` | 버튼·입력창·작은 카드 |
| `--radius-md` | `12px` | 카드·패널·드롭다운 |
| `--radius-lg` | `16px` | 모달·시트·큰 카드 |
| `--radius-xl` | `20px` | 사이드바·전체 컨테이너 |
| `--radius-full` | `9999px` | 알림·토글·완전 원형 버튼 |

> **라운드 원칙**: 직각(`0px`, `2px`) 사용 금지. 구분선도 라운드 컨테이너 안에 담는 방식 선호.

---

## 5. 적용 범위

아래 모든 파일에 동일하게 적용:
- `app.html` — A1/A2/B/C 영역 프레임
- `pages/*.html` — 모든 D영역 콘텐츠 파일
- `index.html` — 랜딩 페이지
- `login.html` — 로그인 화면

`tokens.css` 변수 변경 시 전체 자동 반영 (하드코딩 금지 덕분).

---

## 6. Claude 작업 시 체크리스트

파일 납품 전 반드시 확인:

- [ ] 하드코딩 색상값 없음 (`tokens.css` 변수 사용)
- [ ] `border-radius` 하드코딩 없음 (`--radius-*` 변수 사용)
- [ ] `px` 고정 폰트 없음 (`em` 단위 사용)
- [ ] 직각(`0px`) 컴포넌트 없음 (최소 `--radius-sm` 이상)
- [ ] 헤더 그라데이션 밝은 웜 브라운 적용 확인
- [ ] 전체 배경색 `--color-bg(#FAF8F5)` 크림 아이보리 확인

---

## 7. 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-04-15 | 초안 확정 — 밝은 웜 브라운 계열 / DM Sans + Pretendard / 라운드 우선 정책 |
