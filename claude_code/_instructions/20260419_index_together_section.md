# 작업 지시서 — index.html "함께 만들어가는 원세컨드" 섹션 추가

**작성일:** 2026-04-19
**배포 시점:** 2026-04-21 (월) 배포 전 완료
**작업 범위:** index.html 한 섹션 신규 추가
**참조:** `claude_code/_context/00_MASTER.md`, `design_guide.md`

---

## 🎯 작업 목표

원세컨드 랜딩페이지(`index.html`)의 F(대상별 CTA "당신의 위치에 맞게")와 G(요금제) 사이에 **"함께 만들어가는 원세컨드"** 섹션을 신규 추가.

### 전략적 의미
- 가입 동기 결정타 — F에서 정체성 인식한 후 마지막 푸시
- 경쟁사가 따라할 수 없는 차별화 포지셔닝 (사용자 공동 제작)
- 함께해요 페이지(`pages/together.html`)로 자연스러운 진입 동선 구축

---

## 📋 정확한 삽입 위치

**index.html 라인 1394 (target-cta-section 닫는 `</section>`) 와 라인 1396 (`<!-- PRICING -->`) 사이**

```html
... (기존 target-cta-section)
</section>
                              ← ★ 여기에 신규 섹션 삽입
<!-- PRICING -->
<section class="pricing">
...
```

---

## 🎨 섹션 콘텐츠 (확정)

### 카피 전체
```
[작은 라벨]
TOGETHER

[메인 타이틀]
함께 만들어가는 원세컨드

[질문 1]
그동안 불편한 기능이 있었나요?

[질문 2]
이런 게 있었으면 하는 메뉴가 있었나요?

[핵심 약속]
원세컨드가 해결해 드립니다

[CTA 버튼]
불편했던 거 말씀해주세요 →

[보조 메시지]
여러분의 한마디가 다음 업데이트가 됩니다
```

### 비주얼 무드 (디자이너 결정 사항)

| 요소 | 색상 | 설명 |
|------|------|------|
| 배경 | `#F9E4D5` | 옅은 주황 핑크 (포인트 섹션) |
| 라벨 (TOGETHER) | `var(--accent)` `#c8753a` | 12px, weight 800, letter-spacing 2px |
| 메인 타이틀 | `var(--brown-dark)` `#3d2b1f` | clamp(26px, 2.8vw, 40px), weight 900 |
| 질문 1, 2 | `var(--text-mid)` `#5a3e2b` | 17~19px, weight 500 |
| 핵심 약속 | `var(--accent)` `#c8753a` | 22~26px, weight 900, **주황 강조** |
| CTA 버튼 | 주황 그라디언트 | 기존 cta-main과 동일 패턴 |
| 보조 메시지 | `var(--text-light)` `#9a7a62` | 13px, 작게 |

---

## 🔧 HTML 구조 (참고용 — Claude Code가 최적화 가능)

```html
<!-- TOGETHER (함께 만들어가는 원세컨드) -->
<section class="together-section">
  <div class="together-inner">
    <div class="together-eyebrow">TOGETHER</div>
    <h2 class="together-title">함께 만들어가는 원세컨드</h2>
    
    <div class="together-questions">
      <p class="together-q">그동안 불편한 기능이 있었나요?</p>
      <p class="together-q">이런 게 있었으면 하는 메뉴가 있었나요?</p>
    </div>
    
    <p class="together-promise">원세컨드가 해결해 드립니다</p>
    
    <button class="together-cta" onclick="goToTogether()">
      불편했던 거 말씀해주세요 →
    </button>
    
    <p class="together-note">여러분의 한마디가 다음 업데이트가 됩니다</p>
  </div>
</section>
```

### CSS 가이드 (개발 자율 — 토큰 준수 필수)

```css
.together-section {
  padding: 100px 40px;
  background: #F9E4D5;
}

.together-inner {
  max-width: 760px;
  margin: 0 auto;
  text-align: center;
}

.together-eyebrow {
  color: var(--accent);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 2px;
  margin-bottom: 16px;
}

.together-title {
  font-size: clamp(28px, 3vw, 42px);
  font-weight: 900;
  color: var(--brown-dark);
  letter-spacing: -1.5px;
  margin-bottom: 36px;
  line-height: 1.3;
}

.together-questions {
  margin-bottom: 32px;
}

.together-q {
  font-size: clamp(16px, 1.6vw, 19px);
  color: var(--text-mid);
  font-weight: 500;
  line-height: 1.6;
  margin: 0 0 8px;
}

.together-promise {
  font-size: clamp(20px, 2.2vw, 26px);
  font-weight: 900;
  color: var(--accent);
  letter-spacing: -0.8px;
  margin-bottom: 36px;
}

.together-cta {
  /* 기존 .cta-main 패턴 따라가되 클래스 분리 */
  display: inline-block;
  background: linear-gradient(135deg, var(--accent), var(--accent-dark));
  color: white;
  font-size: 16px;
  font-weight: 800;
  padding: 18px 44px;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(200, 117, 58, 0.25);
  transition: all 0.28s;
  letter-spacing: -0.3px;
}

.together-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(200, 117, 58, 0.35);
}

.together-note {
  margin-top: 20px;
  font-size: 13px;
  color: var(--text-light);
  font-weight: 500;
}

/* 모바일 반응형 (기존 미디어쿼리 패턴 따름) */
@media (max-width: 768px) {
  .together-section {
    padding: 64px 24px;
  }
  .together-title {
    margin-bottom: 28px;
  }
  .together-questions {
    margin-bottom: 24px;
  }
  .together-promise {
    margin-bottom: 28px;
  }
  .together-cta {
    width: 100%;
    padding: 16px 24px;
  }
}
```

---

## 🔄 동선 구현 (중요)

### CTA 클릭 시 동작
**함께해요 페이지로 직접 이동** (로그인 안 해도 OK).

### 구현 함수
```javascript
function goToTogether() {
  // app.html로 이동하면서 redirect 파라미터로 together 메뉴 자동 선택
  window.location.href = 'app.html?redirect=together';
}
```

### app.html 측 처리 (이미 구현되어 있는지 확인)
```javascript
// appstate:ready 이벤트 안에서
const params = new URLSearchParams(window.location.search);
const redirect = params.get('redirect');
if (redirect === 'together') {
  setTimeout(() => {
    document.querySelector('[data-menu="together"]')?.click();
  }, 500);
}
```

**이 redirect 처리 로직이 app.html에 없으면 추가 필요.** 있으면 그대로 사용.

---

## ✅ 검증 체크리스트

### 시각
- [ ] F 섹션 끝나고 바로 옅은 주황 핑크 배경 섹션 등장
- [ ] 라벨 "TOGETHER" 주황색으로 보임
- [ ] 타이틀 큰 글씨 + 진한 갈색
- [ ] 질문 2줄 가운데 정렬
- [ ] "원세컨드가 해결해 드립니다" 주황 강조 (다른 텍스트 대비 명확)
- [ ] CTA 버튼 주황 그라디언트 + hover 효과
- [ ] 보조 메시지 작고 회색
- [ ] G(요금제) 섹션과 자연스럽게 이어짐

### 반응형
- [ ] 데스크톱 (1024px+): 가운데 정렬, 여백 넉넉
- [ ] 태블릿 (768px): 폰트 살짝 줄어듦
- [ ] 모바일 (480px): 패딩 줄어듦, 버튼 풀너비

### 동선
- [ ] CTA 버튼 클릭 시 `app.html?redirect=together`로 이동
- [ ] app.html 진입 후 자동으로 함께해요 메뉴 활성화
- [ ] 함께해요 페이지가 정상 로드 (단, 별도 진행 중인 글 로드 버그는 별개)

### 코드 품질
- [ ] CSS 변수만 사용 (하드코딩 색상 0건, 단 #F9E4D5는 신규 변수 추가 또는 인라인 허용)
- [ ] 직각 border-radius 0건
- [ ] 기존 인덱스 코드 패턴 따름
- [ ] 의도치 않은 다른 섹션 변경 0건

---

## 🚫 하지 말 것

1. **F 섹션과 G 섹션 자체 수정 금지** — 신규 섹션만 그 사이에 삽입
2. **기존 CSS 클래스 덮어쓰기 금지** — 신규 클래스 `.together-*` 만 추가
3. **시각 요소(이미지·일러스트) 추가 금지** — 카피만으로 진행 (디자이너 결정)
4. **사회적 증거 카운터 추가 금지** — 빈 상태에서 거짓 표현 위험
5. **모달·팝업 사용 금지** — 직접 페이지 이동만
6. **"완료" 선언 금지** — 팀장님 확인 전까지

---

## 📝 작업 후 보고 형식

### 1. 수정 파일
- `index.html`: +N 라인 추가 (라인 1394~1395 사이)
- (필요 시) `app.html`: redirect 처리 로직 추가 여부

### 2. 검증 체크리스트 결과
위 체크리스트 각 항목 O / X / N/A

### 3. 변경 전/후 미리보기
- 인덱스 흐름 그림 (F → NEW → G 순서)

### 4. 의심 구간
- F 섹션과 색감 충돌 여부
- 모바일에서 깨지는 부분 확인
- redirect 동작 검증 결과

### 5. 배포 절차 제안
GitHub push 후 라이브 사이트 캐시 새로고침 안내

---

## 🔗 참조 문서

- `claude_code/_context/00_MASTER.md` — 불변 원칙
- `claude_code/_docs/design_guide.md` — CSS 토큰 규칙
- `index.html` 라인 502~570 (target-cta-section CSS) — 참고용 스타일 패턴
- `index.html` 라인 1360~1394 (target-cta-section HTML) — 참고용 구조

---

**기획 검토 완료. 카피·디자인·동선 모두 확정. 코드만 작성하면 됩니다.**
