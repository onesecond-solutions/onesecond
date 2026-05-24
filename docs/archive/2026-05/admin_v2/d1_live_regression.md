# admin_v2 D-1 라이브 회귀 검증 의뢰서 (Step 6-2)

> **작성일:** 2026-05-03
> **선행 산출물:** `docs/specs/admin_v2_d1_workorder.md` § Step 6
> **선행 커밋:** `f65580a` feat(admin_v2): D-1 users 섹션 실 데이터 연결
> **검증 대상:** `pages/admin_v2.html` users 섹션 + `js/admin_v2.js` + `pages/admin.html` stub
> **검증자:** 팀장님 Chrome (Code 환경 라이브 검증 불가)
> **상태:** 🟡 검증 대기

---

## 0. 검증 환경

- **URL:** https://onesecond.solutions
- **Login:** bylts0428@gmail.com (admin 본 계정)
- **Browser:** Chrome (또는 동등) + DevTools(F12) 콘솔·네트워크 탭 열기
- **DB 신버전 확인:** Supabase Dashboard 좌상단 `onesecond-v1-restore-0420` 또는 URL `pdnwgzneooyygfejrvbg`

---

## 1. 정의 raw 검증 — 6항목 (DevTools 콘솔 또는 Code grep)

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| D1 | DevTools 콘솔: `Object.keys(window.ROLE_LABEL).length` | `9` | ☐ |
| D2 | DevTools 콘솔: `window.ROLE_LABEL.admin` | `"어드민"` | ☐ |
| D3 | View source(admin 진입 후 `pages/admin_v2.html`): `1,284` 검색 | users 섹션 0건 (dashboard·billing 잔존은 D-8 범위, 정합) | ☐ |
| D4 | View source: `Phase C mock` 검색 | users 섹션 0건 (다른 6섹션 잔존은 D-2~D-7 범위, 정합) | ☐ |
| D5 | View source: `임태성` 하드코딩 검색 | users 섹션 0건 (notice/logs 잔존은 D-4/D-6 범위, 정합) | ☐ |
| D6 | Supabase Dashboard SQL: `SELECT role, COUNT(*) FROM public.users GROUP BY role` | 9역할 외 잔존 0건 (현재 admin 1행만) | ☐ |

---

## 2. 실 동작 검증 — 7항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| L1 | admin 본 계정 로그인 → B 사이드바 어드민 메뉴 진입 → 풀 viewport admin_v2 점유 + dashboard 표시 | OK | ☐ |
| L2 | rail 좌측 👥 사용자 관리 클릭 → users 섹션 진입 | OK | ☐ |
| L3 | KPI 3카드 (전체 가입자 / 활성 사용자 7일 / 신규 가입 7일) 실 데이터 표시 | 전체=1 / 활성=0 / 신규=0 (admin 본 계정만, last_seen_at NULL) | ☐ |
| L4 | 9역할 칩 카운트 표시 (전체 / 어드민 / GA 4종 / 원수사 4종) | 전체=1 / 어드민=1 / 나머지 8개=0 | ☐ |
| L5 | 검색 input "임" 입력 → 300ms 후 1건 (임태성 / 어드민) 노출 | OK | ☐ |
| L6 | "GA 지점장" 칩 클릭 → 빈 상태 ("조건에 맞는 사용자가 없습니다.") | OK | ☐ |
| L7 | "전체" 칩 다시 클릭 → admin 1행 복원 + 역할 라벨 "어드민" 표시 (구 "관리자" 잔존 0) | OK | ☐ |

---

## 3. RBAC 검증 — 2항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| R1 | 비-admin 계정(또는 로그아웃 상태)으로 `/pages/admin_v2.html` 직접 URL 진입 시도 | 1초 내 `/login.html` redirect 또는 admin_v2 진입 차단 (별 트랙 β 인증 게이트 작동) | ☐ |
| R2 | admin 본 계정으로 users 데이터 정상 SELECT (RLS 회귀 0) | KPI·칩·테이블 모두 데이터 정상 표시, 콘솔 RLS 오류 0 | ☐ |

---

## 4. 콘솔·네트워크 검증 — 2항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| C1 | F12 Console 탭 — admin_v2 진입·users 섹션 활성화 후 Error 0건 | 0 (warning은 무관) | ☐ |
| C2 | F12 Network 탭 — 4xx·5xx 응답 0건 (의도적 403 제외) | 0 | ☐ |

---

## 5. 종합 판정

- **17항목 PASS / FAIL 표기 후 본 의뢰서를 update commit 또는 별 노트로 인계**
- FAIL 발생 시: 항목 옆에 ❌ + 콘솔/네트워크 raw 첨부 → Claude Code에 회신 → 후속 fix 트랙 진입
- 전건 PASS 시: 본 의뢰서 종결 + D-1 완전 종료 → D-2 content 진입 가능

---

## 6. 발견 사항 인계 (D-1 완료 후 별 트랙 후보)

| # | 항목 | 권장 |
|:--:|---|---|
| 1 | users 테이블 1명만 (admin 본 계정) — 시연 가치 ↓ | seed data 또는 테스트 사용자 추가 별 트랙 |
| 2 | DELETE 정책 부재 | D-final 또는 사용자 삭제 기능 추가 시 신설 |
| 3 | RPC `get_role_counts` 신설 (현재 9 query 1 round trip 옵션 b 임시) | D-1 후 최적화 별 트랙 |
| 4 | `.adm-toast` D-2~D-8 적용 (D-1 5d 선제 처리됨) | D-2 진입 시점 |
| 5 | pricing.html ROLE_LABEL 자체 정의 정합화 | D-pre.6 잔존 부채 |
| 6 | app.html B-4 3곳 정합화 | D-pre.6 잔존 부채 |

---

*본 의뢰서는 D-1 메인 트랙의 실 동작 검증 진실 원천. 검증 완료 후 결과 update commit 또는 다음 세션 인계 노트에 반영.*
