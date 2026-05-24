---
name: ddalggak
description: 원세컨드 공용 액션 허브 ⚡ 딸깍 — 카드/콘텐츠 우측 상단 작은 팝오버 메뉴. 공통 3건 (MY SPACE 저장 / 복사 / 카드 만들기) + 콘텐츠 유형별 추가. 새 콘텐츠에 딸깍을 적용하거나 메뉴 항목을 추가/정정할 때 사용.
---

# ⚡ 딸깍 — 원세컨드 공용 액션 허브

## 본질

**딸깍은 기능이 아니라 액션 허브.**

- 클릭 = 작은 팝오버 메뉴 표시
- 콘텐츠 종류마다 메뉴 구성이 다름
- 복사는 메뉴 항목 중 하나일 뿐

## 원칙 3건

### 1. 공통 메뉴 3건 (모든 콘텐츠)

| 항목 | 본질 |
|---|---|
| MY SPACE 저장 | 본인 자료함에 저장 |
| 복사 | 본문 → 클립보드 (카카오톡 붙여넣기용) |
| 카드 만들기 | 고객 전달용 카드 생성 (간결 자체) |

### 2. 콘텐츠 유형별 추가 메뉴

| 콘텐츠 | 추가 항목 |
|---|---|
| 결제정보 (`payment`) | 상담용 문구 생성 |
| 연락처 (`contact`) | 상담용 연락처 문구 |
| 보험이슈 (`news`) | 기사 요약 |
| 녹취록 (`recording`) | 상담요약 |
| 스크립트 (`script`) | 전체 스크립트 복사 |

**메뉴 항목 = 최대 5개까지** (공통 3 + 추가 1~2).

### 3. UI = 작은 팝오버

- 위치: 버튼 아래 또는 옆 (`ddalggak.png` 본질)
- 다크 모드 + V2 토큰 (`var(--s1)` 배경 / `var(--bd)` 테두리)
- 외부 클릭 또는 ESC = 닫기

## 적용 자리 (HTML 패턴)

### 카드/콘텐츠 자체 자체

```html
<div class="pay-card" style="...; position:relative;">
  <button class="pay-copy-btn"
          onclick="showDdalggakMenu(this, '<contentType>')"
          style="position:absolute; top:8px; right:8px; ...">
    ⚡ 딸깍
  </button>
  <!-- 본문 -->
</div>
```

`contentType` 값:
- `payment` — 결제정보
- `contact` — 연락처
- `news` — 보험이슈
- `recording` — 녹취록
- `script` — 스크립트
- `general` — 추가 콘텐츠 없음 (공통 3건만)

## JS 함수 (`_new/app.html`)

### 가동 자체

- `showDdalggakMenu(btn, contentType)` — 메뉴 팝오버 표시
- `closeDdalggakMenu()` — 팝오버 닫기 (외부 클릭/ESC)
- `ddalggakAction(action, btn)` — 메뉴 항목 클릭 핸들러
  - `'copy'` — 복사 (실제 가동)
  - `'mySpace'` — MY SPACE 저장 (플레이스홀더)
  - `'makeCard'` — 카드 만들기 (플레이스홀더)
  - `'counsel'` — 상담용 문구 (플레이스홀더)
  - `'contactCopy'` — 상담용 연락처 문구 (플레이스홀더)
  - `'newsSummary'` — 기사 요약 (플레이스홀더)
  - `'recordingSummary'` — 상담요약 (플레이스홀더)
  - `'scriptFull'` — 전체 스크립트 복사 (플레이스홀더)

### 본인 자체 = 실제 기능 가동 자체 자체

현재 = **복사 자체만 실제 가동**. 나머지 = `alert('XXX — 준비 중입니다.')` 플레이스홀더.

## 카드 만들기 본질 (팀장님 명시)

결과물 최하단 = **가로 1줄 형식**:

```
임태성 | 010-1234-5678
```

또는

```
임태성 · 010-1234-5678
```

### 금지 사항

- ❌ 세로 2줄 형식
- ❌ 서비스명, 고객센터, 이메일, 홍보문구 출력
- ❌ 5개 이상 항목 추가

본질: **고객 전달용 = 최대한 간결**.

## 새 콘텐츠에 딸깍 적용 흐름

1. **HTML 패턴 적용**: 카드/콘텐츠 wrapper에 `class="pay-card"` + `position:relative` + `<button class="pay-copy-btn" onclick="showDdalggakMenu(this, '<type>')">⚡ 딸깍</button>` 추가
2. **contentType 결정**: 공통만 = `'general'` / 추가 메뉴 자체 = `'payment'/'contact'/'news'/...`
3. **새 contentType 추가 자체**: `_new/app.html` `DDALGGAK_MENUS` 자체 자체 자체 자체 = 추가 항목 박기 (5개 이하 자체)
4. **검수**: 클릭 시 팝오버 표시 + 공통 3건 + 추가 항목 + 복사 가동 확인

## 회귀 신호

- ❌ "딸깍 = 즉시 복사" 추정 자체 (직전 2026-05-24 격차 자체)
- ❌ 메뉴 없이 단일 동작만 가동
- ❌ 메뉴 항목 5개 이상
- ❌ 카드 만들기 결과 세로 2줄 또는 홍보문구 포함
