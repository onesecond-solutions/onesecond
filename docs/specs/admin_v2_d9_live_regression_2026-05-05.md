# admin_v2 D-9 라이브 회귀 검증 의뢰서 (Step 5, ~27항목)

> **작성일:** 2026-05-05
> **선행 산출물:**
> - D-9 작업지시서: `docs/specs/admin_v2_d9_workorder.md` § 3 Step 5
> - D-9 Step 1·1.6·2~4 capture: `docs/architecture/db_d9_step1_capture.md` § 6·§ 7
> **선행 커밋:**
> - `aadc3e1` feat(admin_v2): D-9 Step 2~4 묶음 — settings 4섹션 신설 (3 files, +1107줄)
> - `a503680` docs(admin_v2): D-9 Step 1.6 트랜잭션 결과 raw + 영구 학습 #3 갱신 (Storage RLS admin 3정책 is_admin() 가드 청산 — onesecond_banner 한정)
> - `9af3c0b` docs(admin_v2): D-9 Step 1 후속 — Q-9·Q-10 일괄 결재 + Step 1.6 옵션 B 분기 + 별 트랙 #25 신설
> **검증 대상:** `pages/admin_v2.html` settings 섹션 (신규 +439줄) + `js/admin_v2.js` settings 13함수 (신규 +653줄) + `css/tokens.css` 신규 토큰 5종 (+15줄)
> **검증자:** 팀장님 Chrome (Code 환경 라이브 검증 불가)
> **상태:** 🟡 5/6 슬롯 진입 대기 (1일 shift 적용)

---

## 0. 검증 환경

- **URL:** https://onesecond.solutions
- **Login:** bylts0428@gmail.com (admin 본 계정)
- **Browser:** Chrome + DevTools(F12) 콘솔·네트워크 탭 + "Disable cache" ON
- **사전 필수:** Ctrl+Shift+R 강제 새로고침 (배포 캐시 무력화 — admin_v2.js / admin_v2.html 신본 보장)
- **DB 신버전 확인:** Dashboard 좌상단 `onesecond-v1-restore-0420` 또는 URL `pdnwgzneooyygfejrvbg`
- **D-9 진입 경로:** admin_v2 진입 → rail 좌측 ⚙️ (화면설정) 클릭 → settings 섹션 진입 (URL hash `#admin/settings`)

---

## 1. 정의 raw 검증 — 5항목

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| D1 | DevTools 콘솔: `typeof window.admLoadSettings` | `"function"` | ☐ |
| D2 | DevTools 콘솔: 13함수 일괄 검증<br>`['admStorageUpload','admLoadSettings','admBindSettingsEvents','admSyncMenuPreview','admSyncGatePreview','admSyncBoardPreview','admSaveMenuSettings','admSaveGateSettings','admSaveBoardTabs','admSaveBannerSettings','admBnSelect','admBannerFileSelected','admBannerClear'].every(f=>typeof window[f]==='function')` | `true` (13함수 모두 정의) | ☐ |
| D3 | view-source admin_v2.html settings 섹션 검색 — rail 9번째 버튼 + menu pane 9번째 + view 슬롯 9번째 | 모두 존재 (`data-section="settings"` 또는 `#adm-settings-content` 슬롯 ID) | ☐ |
| D4 | DevTools 콘솔: `getComputedStyle(document.documentElement).getPropertyValue('--admin-set-bg')` | 빈값 아님 (5종 토큰 정의 정합 — 현재 톤에 따라 light hex 또는 다크 rgba 표시) | ☐ |
| D5 | view-source admin_v2.html settings CSS — 신규 클래스 검색 | `.adm-set-card` / `.adm-set-row` / `.adm-pv` / `.adm-frame` / `.adm-mini-` / `.adm-a2-` / `.adm-bd-` / `.adm-bn-` 모두 존재 | ☐ |

---

## 2. 실 동작 검증 — § 섹션 1 B영역 메뉴 ON/OFF (4항목)

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| S1-1 | admin 본 계정 로그인 → admin_v2 진입 → rail 좌측 ⚙️ (화면설정) 클릭 → settings 섹션 진입 | OK + URL hash `#admin/settings` + admLoadSettings 호출 + DB raw 채움 | ☐ |
| S1-2 | 섹션 1 진입 시 7개 토글 표시 (home / scripts / board / myspace / news / quick / together) | DB `app_settings` group_name=`menu_b` 7행 raw 정합 (Q-1 (a) 7개 그대로) — `menu_home=false` 라이브 잔재 표시 정합 (미해결 #24) | ☐ |
| S1-3 | 토글 1개 변경 (예: `menu_news` ON ↔ OFF) → admSyncMenuPreview 호출 | 미리보기 영역 즉시 반영 (B영역 7개 메뉴 시각적 변화) | ☐ |
| S1-4 | "저장" 버튼 클릭 → admSaveMenuSettings 호출 | 토스트 `"저장 완료. 사용자 페이지에서 새로고침하면 반영됩니다."` (Q-6 (a) 옛 v1 정합) + DB UPDATE 성공 + 콘솔 RLS 오류 0 | ☐ |

---

## 3. 실 동작 검증 — § 섹션 2 PRO 게이트 (3항목)

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| S2-1 | 섹션 2 진입 시 2개 게이트 표시 (`gate_quick_a2` / `gate_search_a2`) | DB `app_settings` group_name=`gate` 2행 raw 정합 (Q-2 (a) 2종 그대로) | ☐ |
| S2-2 | 게이트 1개 변경 → admSyncGatePreview 호출 | 미리보기 영역 PRO 잠금 표시 시각적 변화 | ☐ |
| S2-3 | "저장" 클릭 → admSaveGateSettings 호출 | 토스트 + DB UPDATE 성공 + 콘솔 RLS 오류 0 | ☐ |

---

## 4. 실 동작 검증 — § 섹션 3 게시판 1차 탭 (3항목)

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| S3-1 | 섹션 3 진입 시 2개 토글 표시 (`board_tab_hub` / `board_tab_company`) | DB `app_settings` group_name=`board_tab` 2행 raw 정합 (Q-3 (a) 2개 토글 그대로, team/branch lock) | ☐ |
| S3-2 | 토글 변경 → admSyncBoardPreview 호출 | 미리보기 영역 게시판 탭 시각적 변화 | ☐ |
| S3-3 | "저장" 클릭 → admSaveBoardTabs 호출 | 토스트 + DB UPDATE 성공 + 콘솔 RLS 오류 0<br>**※ Q-7 (a) 별 트랙: board.html에서 board_tab 값 read 미구현 → 사용자 페이지 시각 반영은 별도 작업 (D-9 범위 외)** | ☐ |

---

## 5. 실 동작 검증 — § 섹션 4 배너 이미지 (Storage 핵심, 6항목)

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| S4-1 | 섹션 4 진입 시 6개 페이지 배너 슬롯 표시 (Quick 제외 — home/scripts/board/myspace/news/together) | DB `app_settings` group_name=`page_banner` (Q-9 (a) 정합) + key=`banner_img_<page>` 패턴 6행 raw | ☐ |
| S4-2 | "이미지 선택" 클릭 → admBnSelect 호출 → 파일 input open | 파일 선택 다이얼로그 표시 (이미지만 필터) | ☐ |
| S4-3 | 이미지 파일 선택 → admBannerFileSelected 호출 → admStorageUpload 호출 | Storage `onesecond_banner` 버킷 INSERT 성공 (admin only, is_admin() 가드 정합) + 콘솔 200 OK + URL 미리보기 표시 | ☐ |
| S4-4 | "저장" 클릭 → admSaveBannerSettings 호출 | 토스트 + DB `app_settings` UPDATE 성공 (`banner_img_<page>` value = Storage URL) + 콘솔 RLS 오류 0 | ☐ |
| S4-5 | "삭제" 클릭 → admBannerClear 호출 | DB `app_settings` value 빈 문자열 또는 null UPDATE 성공 | ☐ |
| S4-6 | 다른 탭 또는 새 창에서 사용자 페이지(예: `https://onesecond.solutions/pages/home.html`) 진입 → 배너 이미지 표시 | app.html 라인 1146~1164 applyBannerSettings 적용 정합 (Q-6 (a) 새로고침 시 반영) | ☐ |

---

## 6. 5종 톤 정합 검증 — Q 시리즈 (3항목)

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| Q1 | 5종 톤 토글 — light → warm → slate → black → navy 순환 | settings 섹션 즉시 톤 전환 (CSS 트랜지션 0 회귀) + 토큰 5종 25셀 정합 (`--admin-set-bg`/`set-border`/`frame-bg`/`pv-tag-bg`/`bn-banner-bg` 5종 × 5톤) | ☐ |
| Q2 | light 톤 — 텍스트 가독성 AA 통과 (settings 4섹션 모두) | 라벨·토글·미리보기 카드 텍스트 WCAG AA ≥4.5:1 | ☐ |
| Q3 | black 기본 톤 — 5종 토큰 :root override 정합 | DevTools 색상 검사 결과 `--admin-set-bg`/`--admin-bn-banner-bg` 다크 rgba 표시 | ☐ |

---

## 7. RBAC 검증 — R 시리즈 (2항목)

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| R1 | 비-admin 또는 로그아웃 상태 → `https://onesecond.solutions/pages/admin_v2.html` 직접 진입 | 1초 내 `/login.html` redirect (별 트랙 β 인증 게이트) | ☐ |
| R2 | admin 본 계정 진입 → settings 섹션 — `app_settings` SELECT/UPDATE + Storage `onesecond_banner` INSERT 모두 정상<br>(D-pre.8 sweep + Step 1.6 청산 정합) | 콘솔 RLS 오류 0 / Network `/rest/v1/app_settings` 200 / `/storage/v1/object/onesecond_banner/...` 200 | ☐ |

---

## 8. 콘솔·네트워크 검증 — C 시리즈 (3항목)

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| C1 | F12 Console — settings 섹션 진입 후 Error 0건 | 0 | ☐ |
| C2 | F12 Network — settings 진입 시 fetch 1건 (`/rest/v1/app_settings?...&group_name=in.(menu_b,gate,board_tab,page_banner)`) 200 OK | 1건 / 200 OK / 17행 raw 응답 (7+2+2+6=17) | ☐ |
| C3 | D-1 users / D-2 content / D-3 board / D-4 notice / D-5 analytics / D-6 logs 회귀 0 — settings 진입 후 다른 섹션 재진입 시 정상 표시 | 회귀 0 | ☐ |

---

## 9. Storage 회귀 검증 — Storage 시리즈 (2항목, Step 1.6 청산 정합)

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| ST1 | admin 본 계정 — `onesecond_banner` 버킷 INSERT 성공 (S4-3 정합) | 200 OK + Storage Dashboard에서 파일 raw 확인 | ☐ |
| ST2 | admin 본 계정 — `onesecond_banner` 버킷 DELETE 성공 (S4-5 후속, 옵션) | 200 OK + Storage Dashboard에서 파일 부재 확인 | ☐ |

→ **별 트랙 #25 (Storage RLS 전수 sweep) 5/11 슬롯 진입 직전 본 의뢰서 ST1·ST2 PASS 회귀 필수.**

---

## 10. Q-1~Q-10 결재 정합 회귀 — S 시리즈 (3항목)

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| QA1 | Q-1 (a) 7개 메뉴 그대로 — `menu_news` 토글 ON 시 즉시 사용자 페이지 메뉴 표시 (admin 화면 새로고침 후) | OK + 미해결 #24 검증 (`menu_home=false` 라이브 의도 vs 잔재) — 토글 ON 후 home 메뉴 정상 표시 시 = 잔재 / OFF 유지 시 = 라이브 의도 | ☐ |
| QA2 | Q-8 (a) admin 본인 화면설정 무시 — admin이 `menu_news` OFF 변경·저장 후 admin 본인 화면 메뉴는 변동 0 (CLAUDE.md "applyMenuSettings 무시 대상 = admin만" 정합) | OK | ☐ |
| QA3 | Q-9 (a) page_banner group_name 정합 — DB `app_settings` group_name 분포 검증 (`page_banner` 6행 / `banner_img` 0행) | OK (옛 v1 시점 이후 group_name 변경 정합 — capture § 7-3) | ☐ |

---

## 11. 성능 검증 — P 시리즈 (1항목)

| # | 항목 | 기대값 | 결과 |
|:--:|---|---|:--:|
| P1 | settings 섹션 진입 → 4섹션 모두 표시까지 총 시간 (cold/warm) | cold < 1.5초 / warm < 800ms (D-1~D-6 패턴 정합 — fetch 1건 PostgREST overhead 본질) | ☐ |

→ 임계 미달성 시 D-2 P3 별 트랙(`admin_v2_p3_postgrest_analysis.md`) 격상 검토 (D-3 J-5·D-6 P2 본질 정합).

---

## 12. 종합 판정

- ☐ ✅ **27/27 PASS** (또는 26/27 + 환경 의존 1건 조건부 통과) — D-9 화면설정 완전 종료, D-7 billing 진입 가능 (5/7 슬롯)
- ☐ ⚠️ 부분 PASS — 결함 raw 보고 후 fix
- ☐ ❌ 결함 다수 — D-9 본 작업지시서 § 3 Step 분할 재검토

---

## 13. 결과 capture 위치

**갱신 대상 capture:** `docs/architecture/db_d9_step1_capture.md` § 8 신설 (Step 5 라이브 회귀 결과 raw)

기록 항목:
1. 본 의뢰서 진입 시각 raw + Chrome 환경 raw
2. § 1~§ 11 검증 결과 raw (PASS/FAIL + 발견 사항)
3. 결함 발견 시 fix raw + 재진입 결과
4. 영구 학습 후보 raw 누적 (학습 #5 이후)

---

## 14. 다음 액션 (5/6 슬롯)

1. **본 의뢰서 commit + push** (Chrome 위임 직전 산출물 명문화)
2. **팀장님 Chrome 검수** — § 1~§ 11 순차 진행
3. **결함 raw 보고 → Code fix → 재검수**
4. **27/27 PASS 후 D-7 billing 5/7 슬롯 진입** (1일 shift 정합)

### 후속 트랙 영향

- 별 트랙 #A PITR — 본 의뢰서와 코드 영역 다름, 5/6 병렬 가능 (작업지시서 `v1_1_safety_pitr_workorder.md` 정합)
- 별 트랙 #25 Storage RLS sweep — 5/11 슬롯 진입 직전 본 의뢰서 ST1·ST2 PASS 회귀 필수
- 미해결 #24 menu_home=false — § 10 QA1에서 검증 가능

---

**작성:** Code D-9 Step 5 라이브 회귀 의뢰서 (2026-05-05 후속, 1일 shift 적용)
**다음 액션:** 본 commit + push → 5/6 슬롯 팀장님 Chrome 검수 → capture § 8 신설 → D-7 billing 진입
