# 별 트랙 β — pages/*.html 9페이지 직접 URL 인증 게이트

> **작성:** Code (Claude Code) · **작성일:** 2026-05-03 · **트랙 상태:** ✅ 종료
> **방식:** pages/*.html 첫 줄 인라인 IIFE 게이트 (token 검증)
> **목적:** 미인증 방문자가 `pages/<page>.html` 직접 URL로 접근해 정적 디자인 뼈대 노출되는 것 차단

---

## 1. 배경 + 결정

### 발생 경위
- R3/R4 RLS sweep 후속 분석에서 발견 (직전 별 트랙 α 종료 후)
- 페이지 단 분류표 작성 시 `pages/*.html` 9개가 **자체 인증 게이트 없음** 확인 (`auth.js` include 0건)
- 직접 URL 접근 시 partial fragment 노출 위험

### 노출 위험 분석
| 항목 | 위험도 | 비고 |
|---|---|---|
| 정적 HTML(헤더/사이드바/디자인 뼈대) | ⚠️ 중 | DOCTYPE/html/head 없는 partial이지만 브라우저가 quirks mode 렌더 |
| 데이터 (DB row) | ✅ 안전 | 모든 fetch가 `window.db.fetch` (Bearer 헤더 필수) → 토큰 없으면 401 |
| 검색엔진 인덱싱 | ⚠️ 잠재 | robots.txt / `noindex` 메타 미확인 |

### 차단 옵션 비교 (3안 중 (다) 채택)
| 옵션 | 채택 | 근거 |
|---|---|---|
| (가) `auth.js` include + Auth.init() | ❌ | 큰 변경, 셸 환경 의존성 추가 위험 |
| (나) 동적 redirect 로직 (셸/직접 URL 자동 감지) | ❌ | 복잡, 셸 동작 메커니즘 불확실 |
| **(다) 인라인 IIFE 게이트 (pricing.html 패턴)** | ✅ | 단순, 셸 동작 영향 0 (셸이 inject 시 inline `<script>` 미실행 또는 토큰 통과) |

---

## 2. 게이트 패턴 (9페이지 동일)

각 페이지 첫 줄에 추가:

```html
<script>
(function(){
  var _t = localStorage.getItem('os_token') || sessionStorage.getItem('os_token');
  var _u = {}; try { _u = JSON.parse(localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}'); } catch(e) {}
  if (!_t || !_u.id) { window.location.href = '/login.html'; }
})();
</script>
```

**근거:** `pricing.html` 라인 237~239 인라인 게이트 패턴 (이미 검증된 패턴).
**차이점:** IIFE로 감싸 var 누수 방지 + try/catch JSON.parse 안전 + 절대 경로 `/login.html` (pages/ 폴더 상대 경로 회피).

---

## 3. 적용 범위 (9페이지)

| # | 페이지 | 첫 줄 매칭 패턴 |
|---|---|---|
| 1 | `pages/board.html` | `<style>` + `board.html 전용 스타일` |
| 2 | `pages/scripts.html` | `<style>` + `scripts.html — v2 시안 통째 승격` |
| 3 | `pages/myspace.html` | `<style>` + `로컬 변수 (tokens.css 변수 참조)` |
| 4 | `pages/quick.html` | `<style>` + `quick.html 전용 스타일` |
| 5 | `pages/home.html` | `<!-- ... pages/home.html ... 6각 다이어그램 홈` |
| 6 | `pages/together.html` | `<!-- ... pages/together.html ... 함께해요` |
| 7 | `pages/news.html` | `<!-- ... pages/news.html — 보험뉴스` |
| 8 | `pages/admin.html` | `<!-- ... pages/admin.html — admin_v2.html 진입 stub` |
| 9 | `pages/admin_v2.html` | `<!-- ... pages/admin_v2.html — 풀 스케일 관리자 콘솔 v2` |

**제외:** `_template.html`(템플릿) / `about.html`(공개 의도 가능, 별도 검토) / `pricing-content.html`(이미 셸 안 partial)

**잔존 검증:** `window.location.href = '/login.html'` 패턴 grep → 9개 파일 모두 매칭 ✅
**변경 통계:** 각 파일 +8줄 → 합 72줄 추가

---

## 4. 게이트 동작 시나리오

| # | 시나리오 | 동작 |
|---|---|---|
| 1 | 시크릿 창(미인증) → `/pages/board.html` 직접 URL | `<script>` 실행 → 토큰 없음 → `/login.html` 즉시 redirect ✅ |
| 2 | 인증 사용자 → 평소처럼 셸에서 board 메뉴 클릭 | 셸이 fetch + innerHTML로 inject 시 `<script>` 미실행 → 영향 0. 동적 script 실행 방식이라도 토큰 있어 게이트 통과 → 영향 0 |
| 3 | 인증 사용자 → `/pages/board.html` 직접 URL | 게이트 통과 → partial fragment 렌더 (window.db 미존재로 일부 깨지지만 보안 위반 아님 — 의도된 fallback) |
| 4 | API 직접 호출 (curl 등) | 게이트는 페이지 단이라 API에는 영향 없음. 그러나 RLS가 Bearer 헤더 강제 → 토큰 없으면 401 |

---

## 5. 영향 범위

| 영역 | 영향 |
|---|---|
| 사용자 화면 | 평소 사용 흐름(셸 → 메뉴 클릭) 영향 0 |
| 직접 URL 접근 (미인증) | 즉시 login.html 튕김 — **새 차단 효과 ✅** |
| 직접 URL 접근 (인증) | 게이트 통과 후 partial fragment (깨진 화면 가능, 보안 위반 X) |
| 셸 fetch+inject | inline `<script>`는 일반적으로 innerHTML 시 미실행 → 영향 0 |
| 검색엔진 인덱싱 | 직접 URL이 즉시 redirect → 인덱싱 위험 감소 (완전 차단은 별 트랙 noindex 메타 필요) |

---

## 6. 롤백 절차

```bash
git revert 2142ab1
git push origin main
```

또는 개별 페이지 롤백 시 각 파일 첫 8줄(인라인 IIFE 블록) 수동 제거.

---

## 7. 잔존 사항 / 후속 트랙

| # | 항목 | 처리 시점 |
|---|---|---|
| 1 | `admin.html` / `admin_v2.html` admin role 체크 | D-final 보안 검증 (현재 게이트는 token 검증만 — 일반 사용자도 통과) |
| 2 | noindex 메타 추가 | 별 트랙 (검색엔진 인덱싱 완전 차단) |
| 3 | `about.html` 공개/비공개 결정 | 사업 결정 (외부 소개 페이지 의도라면 게이트 X) |
| 4 | pages/*.html 단독 동작 보강 (인증된 사용자 직접 URL 시 깨진 화면) | 후순위 (실 사용 케이스 적음) |

---

## 8. 본 트랙 학습

- **partial fragment 인증 게이트는 `<script>` 인라인이 표준** — DOCTYPE/html/head 없어도 브라우저가 `<script>` 만나면 즉시 실행
- **셸 inject 방식이 `innerHTML`이면 인라인 `<script>` 미실행이 자연스러운 격리 효과** — 게이트가 셸 안 동작에 영향 0 (의도치 않은 부작용)
- **admin role 체크는 클라이언트 단 게이트로 부족** — 진짜 보안은 RLS (D-pre.7 SECURITY DEFINER 표준)
- **단순 패턴이 9페이지 일괄 적용에 안전** — pricing.html 검증된 패턴 재활용으로 회귀 위험 최소화

---

## 9. 별 트랙 β 종료 → 다음 트랙

```
🏁 별 트랙 β 종료 (커밋 2142ab1)
    ↓
🔵 STAGE 2 — 크롬 D-pre.8 진입 중 (Step A 완료, B+C 트랜잭션 의뢰 단계)
    ↓
D-pre.8 종료
    ↓
🟢 D-1 admin_v2 users 본 진입 (메인 트랙)
    ↓
... → 재오픈 (v1.1, 5/10ish)
```

---

*본 문서는 별 트랙 β 단건 종료 캡처. 다음 트랙 진입 시 본 문서 GitHub URL을 참조 인계 가능.*
