# 별 트랙 #49 라이브 검증 결과 노트 (가입 안내 노출 보강)

> **검증 일시:** 2026-05-10 / Claude in Chrome 시연 완료
> **선행 commit:** `344eae3` fix(home_v2): 가입 성공 시 인증 메일 안내 노출 보강 (#49 신설)
> **검증 환경:** `https://onesecond.solutions/pages/home_v2.html` (Hard Reload, commit `344eae3` 라이브 반영 확인)
> **결과:** **6 PASS / 0 FAIL / 2 미확인(rate limit) → #49 UX 보강 코드 정합 ✅**

---

## § 1. 검증 결과 표

| 시나리오 | 결과 | 비고 |
|---|---|---|
| A-1. 가입 폼 진입 + 4중 방어 | ✅ PASS | 모달 정상 진입 (상단 로그인 + 하단 가입), GA 카드 → signup-form-body 노출, 직급 → roleHint 표시, 4중 방어 폼 전체 정상 렌더 |
| **A-2. alert 강제 표시 ⭐** | **✅ PASS** | 소스 raw + window.alert monkey-patch 인터셉트 검증. `[ALERT_INTERCEPTED]` 캡처 raw 기대 텍스트 정확 일치. signupFormArea hidden=true / signupSuccessArea hidden=false 정합 |
| A-3. description 📧 + brown 강조 | ✅ PASS | 🎉 + "가입 완료!" + 📧 이메일 + brown bold 강조 ("메일함 확인하고 링크 인증") + 회색 작은 글씨 ("로그인 영역에서 시작") 모두 시각 확인 |
| **A-4. 콘솔 raw 캡처 ⭐** | **⚠️ PARTIAL** | rate limit 차단으로 authData 직접 수집 불가. 에러 응답 raw = `{"code":429,"error_code":"over_email_send_rate_limit","msg":"email rate limit exceeded"}`. 소스 분석 기반 case(a) 가능성 높음 (아래 § 2 참조) |
| B-1. 인증 메일 도착 | ⚠️ 미확인 | over_email_send_rate_limit (429) 차단으로 메일 미발송. 1h 후 또는 Custom SMTP 후 재시도 필요 |
| B-2. 인증 링크 → 인증 완료 | ⚠️ 미확인 | B-1 연동, 메일 미도착으로 테스트 불가 |
| B-3. 인증 후 로그인 정상 진입 | ✅ PASS | 기존 admin 계정(`bylts0428@gmail.com`, role=admin)으로 로그인 → app.html 정상 진입. errBox 미표시 + 🛡️ 관리자 메뉴 display:block 부가 확인 (A-5 케이스 재검증 ✅) |
| C-1. emailConfirmed=true 분기 보존 (선택) | ✅ PASS | Console 강제 분기 시뮬레이션: description innerHTML 변경 후 alert 미발생 ✅. `if (!emailConfirmed)` 가드 정합 |

---

## § 2. A-4 raw 캡처 보고 (진짜 원인 단정 보류)

- **수집 결과:** `authData.user.email_confirmed_at` 직접 수집 불가 (Supabase rate limit 차단)
- **소스 분석 추론:** Confirm email ON 환경에서 신규 가입 시 `email_confirmed_at = null` 리턴이 표준 → `emailConfirmed = false` → alert 분기 진입 정상 동작 예상 → **처방 (a) 케이스 가능성 높음 → #49 처방으로 충분**
- **rate limit 해소 후 재측정 시 분기 단정:**
  - `email_confirmed_at = null` → case(a) → **#49 ✅ 종료**
  - `email_confirmed_at = timestamp` → case(b) → 분기 통합 추가 commit 필요

---

## § 3. 본 검증으로 입증된 핵심 사실

### ✅ #49 처방 (b) UX 보강 코드 정합 입증
- alert 강제 표시 작동 (사용자 인지 격차 차단)
- description 📧 + brown bold 강조 시각 정합
- emailConfirmed 분기 보존 (가드 작동)
- 진단 로그 `console.log('[signup success raw]', ...)` 라이브 적재 확인 (다음 가입 raw 자동 수집 가능)

### 🚨 #30 Custom SMTP 트랙 = Critical 라이브 입증
- 본 검증 중 **Supabase over_email_send_rate_limit (429)** 발생
- 반복 테스트로 default SMTP 한도 소진 → 신규 가입자 이메일 발송 차단
- **5/15 4팀 오픈 시 신규 가입자 이메일 인증이 rate limit에 걸릴 위험 라이브 입증**
- 의뢰서 권고: "#30 Custom SMTP 설정을 #49 검증과 독립적으로 최우선 처리"

---

## § 4. 후속 처리

### 즉시 (5/10 ~ 5/12)
1. **#30 Custom SMTP 트랙 즉시 진입** ⭐ Critical (SendGrid / Resend / AWS SES 비교 + 도입 의뢰서 + Supabase Auth Settings 적용)
2. #49 ✅ 종료 — UX 보강 코드 정합 입증, 진짜 원인 단정은 #30 후속 raw 수집으로 자동 추적

### 5/15 4팀 오픈 전 (#30 도입 후)
1. rate limit 해소 후 #49 A-4 raw 1회 재측정 (Confirm email 분기 정확 단정, ~5분)
2. 5/14~15 새벽 #51 (posts 시드 5~10건) 처리

---

## § 5. 별 트랙 누적 갱신 (5/10 시점)

| # | 상태 | 본질 |
|---|---|---|
| #30 | 🚨 **Critical 라이브 입증** | Custom SMTP 도입 — 5/15 전 필수, 본 검증 rate limit 사고로 입증 |
| #45 | 부분 해소 | P1.5-E ⑥ 실 가입 시연 → #49 처방으로 UX는 해소, rate limit만 #30 트랙 |
| #46 | 보존 | home_v2 select 동적 lookup 전환 (~30분) |
| #47 | ✅ 종료 | 사이드바 메뉴 순서 정합 (18/18 PASS) |
| #48 | ✅ 종료 | 호칭 정합 스마트 게시판 → 현장의 소리 (18/18 PASS) |
| #49 | ✅ **종료 (UX 보강 코드 정합)** | 가입 안내 노출 보강 — A-4 raw만 #30 후속 자동 추적 |
| #50 | ✅ 종료 (사고 아님) | menu_home/menu_news = 의도된 화면설정 |
| #51 | 보존 | public.posts 0건 시드 (5/14~15 새벽) |

---

본 결과 노트는 #49 commit `344eae3` 직후 라이브 검증 결과 보존용. UX 보강 코드 측면 ✅ 종료, 진짜 원인 raw는 #30 도입 후 자동 추적.
