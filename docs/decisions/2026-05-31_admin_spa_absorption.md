# 운영센터(어드민) → SPA D영역 흡수 결정

> **결정일:** 2026-05-31
> **결재:** 팀장님 (plan 승인 + "마지막 라이브까지 진행" 지시)
> **상태:** 채택 · 라이브 반영 (Phase 1~3)

## 배경

오늘 작업한 `pages/admin-console.html`(운영센터)은 기능은 늘었으나, app.html SPA의 다른 D영역 페이지(보험사자료실·홈·현장의 소리)에 비해 디자인 품질이 낮았다. 원인은 **디자인 시스템과의 단절**:

- app.html의 디자인 시스템(토큰 + `.side/.body/.wrap/.view/.ttl/.chip/.tabs` 컴포넌트)은 app.html `<style>` 블록에 **인라인**으로만 존재(외부 공유 css·tokens.css 미링크).
- admin-console.html은 `#ac-root` 안에 토큰·사이드바·뷰를 별도 복제 → 글자크기(접근성)·hover/모션·빈상태·그라데이션 단절(정량: transition 40→2, hover 71→5, gradient 18→0, keyframes 4→0).

## 결정

운영센터를 **별도 풀스크린 페이지에서 app.html SPA의 D영역 view(`#v-admin`)로 흡수**한다. 좌측 사이드바 `[어드민]` 클릭 → D영역에 운영센터, 11개 메뉴를 **현장의 소리(voice)식 2단 탭/칩** 구조로 전환. SPA 디자인 시스템을 그대로 상속.

이는 과거 "어드민을 app.html에서 분리(admin_v2 → admin-console)"한 방향을 **되돌리는** 결정이다. 되돌리는 근거:

- **용량 우려 해소(실측):** app.html 1.77MB 중 ~1.43MB(81%)가 인라인 base64 이미지(어드민과 무관한 기존 무게). 어드민 흡수 추가분은 마크업 ~+30KB(~2%), JS는 외부 분리 + lazy-load로 일반 사용자 다운로드 0.
- **분리 이유였던 것들 대체:** ① 코드 분리 → `js/admin-console.js` 외부 파일 + lazy-load로 유지 ② 보안 격리(auth-guard 파일 차단) → SPA 내 `_canSeeAdmin()` UI 게이팅 + RLS 1차 방어로 전환.

## 구조

| 탭(그룹) | 칩(항목) |
|---|---|
| 대시보드 | (단일) |
| 운영 | 가입승인 · 사용자 · 지점 |
| 콘텐츠 | 게시글 · 댓글 · 자료실 |
| 시스템 | 메뉴 · 공지·배너 · 설정 |
| 로그 | (단일, 예정 골격) |

## 구현 (PR 3단계)

- **Phase 1 (#207):** `js/admin-console.js` 외부 분리 (인라인 byte-동일 추출).
- **Phase 2 (#208):** `#v-admin` view + 2단 탭/칩(`acTab`/`acGoSec`/`acInitAdmin`) + showView 확장(`VALID_VIEWS`+admin, `_canSeeAdmin` 게이팅) + lucide/JS lazy-load + 딥링크 `?view=admin&sec=`.
- **Phase 3:** hover·모션·스켈레톤 디자인 회복 + 사이드바 미처리 가입승인 배지 + `admin-console.html` stub redirect.

## 게이팅 (보안)

- `#v-admin`은 전 role 수신 파일(app.html)에 위치 → `_canSeeAdmin()`(role==='admin') 가드로 비-admin 접근 시 home 전환 + `#app:not(.is-admin) #v-admin{display:none}` + 사이드바 nav 숨김(`applyRoleClass`).
- 데이터는 Supabase RLS가 1차 방어(기존). `approve_insurer_user` RPC = 기능 동등 이관(로직 변경 0).

## 후속 / 범위 밖

- app.html 인라인 base64 이미지 1.43MB → `/assets/` 외부화(별도 다이어트 트랙, 미실행).
- 시스템 섹션(메뉴/공지·배너/설정) + 로그 실데이터 연결(현재 "예정" 골격).
- 가입승인 칩 단위 배지(현재 사이드바 배지 + 대시보드 task queue로 신호 충분, 칩 배지는 후속).
