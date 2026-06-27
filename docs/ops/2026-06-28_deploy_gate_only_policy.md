# 배포 정책 — 당분간 "임태성 실장 게이트 전용 반영" (2026-06-28 대표 결재)

> **배경:** 사이트가 계속 수정 중이라 전체 일괄 배포가 의미 없음. 당분간 신기능은 **임태성 실장 계정에만 실시간 반영**해 대표님이 직접 확인. 일반 사용자·운영 전체에는 반영하지 않음. 대표 확인·승인한 기능만 추후 전체 배포.
> **상태:** 본 정책이 당분간 우선. CLAUDE.md "🚨 배포 프로세스 절대 규칙"(PR+Deploy Preview 흐름)은 전체배포 재개 시 복귀.

---

## 1. 실제 배포 구조 (2026-06-28 실측 — 추측 아님)

| 자리 | 실체 | 일반 사용자 영향 |
|---|---|---|
| **라이브(프로덕션)** | **GitHub Pages** (`cname: onesecond.solutions`, source=main, status=built, HTTPS 인증 onesecond.solutions·www) | main push → 자동 반영 |
| **Netlify** | `splendorous-bavarois` **미러 + PR Deploy Preview**. 저장소에 설정 0건(`netlify.toml` 없음). 콘솔에서만 관리 | onesecond.solutions와 **무관**(미러/프리뷰) |
| 심야 일괄 배포 | **없음**. workflows엔 `issues-daily.yml`(RSS 수집)뿐, 배포 워크플로 아님 | — |

**핵심:** 일반 사용자 프로덕션 = GitHub Pages이지 Netlify가 아니다. Netlify를 끊어도 일반 사용자 반영은 안 멈추고, 멈추지도 못한다. "일반 사용자 무영향 + 임태성만 반영"의 실제 메커니즘 = **user_id 게이트**.

---

## 2. 정책 (당분간)

1. **신규 작업 = 100% 임태성 실장 user_id `98c5f4f9-...` 게이트 안에서만** main 반영. (회사 검색 허브 #990~998·상품 로드맵 #981과 동일 패턴: 메뉴 가드 + showView 라우트 가드 + 로더 가드 3중, 어드민 포함 타계정 차단)
2. **게이트 밖(일반 사용자 노출) 코드 머지 금지** — 대표님이 기능별로 직접 확인·승인한 후에만 게이트 해제/전체 배포.
3. **GitHub Pages 자동배포(main→onesecond.solutions)는 유지** — 게이트로 일반 사용자 격리되므로 라이브는 살아 있고 임태성님만 신기능을 즉시 본다.
4. **Netlify 콘솔 미러/Deploy Preview = 일시중단** (대표님 콘솔 직접 토글, 아래 §3). 설정·이력 **삭제 금지·복구 가능**.

## 3. Netlify 콘솔 일시중단 절차 (대표님 직접 — 복구 가능, 삭제 아님)

> 제(Code) 접근 불가 = 대표님 Netlify 콘솔에서. 사이트 **삭제(Delete site) 절대 금지** = 그게 이력 보존.

- **권장(가장 안전):** 사이트 → **Deploys** 탭 → **"Stop auto publishing"** 클릭. 자동 게시 중단(현재 배포에 고정). 복구 = **"Start auto publishing"**.
- **빌드까지 멈춤:** Site configuration → Build & deploy → Continuous deployment → **"Stop builds"**. 복구 = **"Start builds"**.
- **PR 프리뷰만 끄기:** Site configuration → Build & deploy → **Deploy Previews → Disable**.
- 위 어느 것도 설정/이력 보존. 복구는 토글 한 번.

## 4. 복구 트리거 (전체배포 재개 시)

- 대표님이 "전체 배포 재개" 지시 → ① 해당 기능 게이트 해제(코드) ② Netlify "Start builds/auto publishing"(원하면) ③ CLAUDE.md PR+Preview 흐름 복귀.
