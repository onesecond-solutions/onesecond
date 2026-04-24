# 원세컨드 디자인 테스트 워크스페이스

> ⚠️ **이 폴더의 모든 파일은 디자인 실험용입니다.**
> 원세컨드 제품(`pages/*.html`, `css/tokens.css`, `js/*.js`, `app.html`)에 자동으로 반영되지 않습니다.
> 테스트 결과를 제품에 적용하려면 팀장님의 명시적 승인 + 별도 반영 작업이 필요합니다.

---

## 📂 구조

```
claude_code/design_test/
  README.md                  ← 전역 규칙 (이 파일)
  <page-name>/
    v1.html                  ← 독립 실행 가능한 테스트 페이지
    v2.html, v3.html ...     ← 후속 버전
    notes.md                 ← 해당 페이지의 변경 조건·의도 기록
```

## 👀 미리보기 방법

1. 파일 탐색기 경로 이동:
   ```
   C:\limtaesung\github\onesecond\claude_code\design_test\<page>\
   ```
2. `v1.html` 더블클릭 → 기본 브라우저에서 열림

서버 불필요. 색상·여백·폰트·SVG 전부 정상 동작. `switchMenu`, `doSearch` 등 외부 함수는 alert 스텁으로 대체됨.

## 🛡️ 작업 원칙 (절대 규칙)

1. **원본 금지** — `pages/*.html`, `css/tokens.css`, `js/*.js`, `app.html`은 한 줄도 수정하지 않는다.
2. **독립 실행** — 각 `v*.html`은 파일 더블클릭만으로 렌더링되어야 한다.
3. **토큰 오버라이드** — `tokens.css`는 `../../../css/tokens.css`로 참조만 하고, 값은 테스트 HTML 내부 `<style>`의 `:root { }` 재정의로만 변경한다.
4. **원본 구조 복제** — 테스트 대상 페이지의 HTML/CSS/JS 구조는 원본과 동일하게 복사한다(로고 등 상대 경로만 조정).
5. **변경 기록** — 각 페이지 폴더의 `notes.md`에 "무엇을·왜·어떻게"를 남긴다.

## 🎨 v1 디자인 원칙 (2026-04-25 확정)

### A. 색상 — 브라운 95% → 5%

**중성 전환 (브라운 제거)**

| 토큰 | 기존 | v1 |
|---|---|---|
| `--color-bg` | `#FAF8F5` (크림) | `#FFFFFF` (순백) |
| `--color-surface-2` | `#F3EFE9` (웜 베이지) | `#F6F7F9` (쿨 오프화이트) |
| `--color-border` | `#E4DBCE` (웜 베이지) | `#E5E7EB` (뉴트럴 그레이) |
| `--color-text-primary` | `#3D2C1E` (다크 브라운) | `#1F2937` (차콜) |
| `--color-text-secondary` | `#7A5C44` (미디엄 브라운) | `#6B7280` (그레이) |
| `--color-text-tertiary` | `#B89880` (라이트 브라운) | `#9CA3AF` (라이트 그레이) |
| `--gradient-header` | 브라운 그라 | `transparent` (제거) |
| 그림자 톤 | 웜 브라운 | 뉴트럴 차콜 |

**브라운 유지 (강조 포인트만)**

`--color-brand #A0522D` / `--color-accent #D4845A` 값 그대로 유지, 아래 지점에서만 사용:

1. Primary CTA 버튼 채움
2. 강조 배지 (`.badge-pro`, `.home-intro-badge`)
3. 탭 언더라인·포커스 링
4. 툴팁 헤더·꼬리 (대화·유도 포인트)
5. 호버·액티브 하이라이트 (fill에 옅은 `#FFF8F3` 허용)

### B. 여백 — 촘촘함 해소 (⚠️ 홈 제외)

**원칙**: 팀장님이 지적하신 "홈을 제외한 다른 페이지들이 촘촘" 문제 해결.
- 홈(`home/*.html`)은 2026-04-24에 확정된 레이아웃(좌측 30px 카피 패딩·hex -160px 수직 상승) **그대로 유지**. 색상만 중성화.
- 아래 여백 규칙은 **about / admin / board / myspace / news / quick / scripts / together** 페이지 테스트에 적용 예정.

| 요소 | 기존 | v1 | 변화 |
|---|---|---|---|
| 카드 내부 패딩 | `--space-6` (24px) | 32px | +33% |
| 카드 간 간격 | `--space-5` (20px) | 40px | +100% |
| 섹션 타이틀 아래 | `--space-2` (8px) | 16px | +100% |
| 본문 line-height | 1.55 | 1.75 | +13% |
| 컨텐츠 좌우 여백 | ~16px | 32px | +100% |
| 컨텐츠 max-width | 없음 | 900px | 신규 |

## 🧪 테스트 페이지 리스트

| 페이지 | 상태 | 최신 버전 |
|---|---|---|
| home | 진행 중 | `home/v2-full.html` (2026-04-25, **프리미엄 리뉴얼** · 확장 토큰 · A2 제거 · 6각 그라·aura) · `home/v1-full.html` (초기) |
| **index** (랜딩) | 진행 중 | `index/v1-full.html` (2026-04-25, 프리미엄 네비 + 듀얼 모니터 + 병합 섹션 + 인라인 가입) |
| about | — | — |
| admin | 진행 중 | `admin/v1-full.html` (2026-04-25, Make.com 2단 네비 + 분석 대시보드) |
| board | 진행 중 | `board/v1-full.html` (2026-04-25) |
| myspace | 진행 중 | `myspace/v1-full.html` (2026-04-25) |
| news | — | — |
| quick | 진행 중 | `quick/v1-full.html` (2026-04-25) |
| scripts | 진행 중 | `scripts/v2-full.html` (2026-04-25, 세로 탭바) · `scripts/v1-full.html` (원본 구조) |
| together | 진행 중 | `together/v1-full.html` (2026-04-25) |

## 🔄 제품 반영 절차

1. 팀장님이 테스트 결과 확인 → OK 판단
2. 적용할 버전 지정 (v1/v2/…)
3. 별도 작업지시서 → `tokens.css` 및 해당 `pages/*.html`에 반영
4. 이 폴더는 레퍼런스로 유지
