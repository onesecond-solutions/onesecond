# admin_v2 Phase D-9 Step 1 capture — 사전 검증 SQL 6개 결과 raw + 발견 3건

> **작성일:** 2026-05-05
> **작성자:** Claude Code
> **선행 산출물:**
> - 작업지시서: `docs/specs/admin_v2_d9_workorder.md` (241줄, Q-1~Q-8 일괄 (a) 승인)
> - Chrome 위임 의뢰서: `docs/specs/admin_v2_d9_step1_chrome_request_2026-05-05.md` (335줄)
> **상태:** 🟡 핵심 발견 3건 — Q-9·Q-10 신규 결재 + Step 1.6 Storage RLS 보강 분기 결정 필요

---

## 0. 큰 그림 정합성 검증

본 capture는 D-9 Step 1 사전 검증 SQL 6개 결과 raw + 옛 v1 코드 정합 분석. **DB 변경 0건** (SELECT만). Step 2 진입 전 발견 3건 처리 필요.

---

## 1. SQL 결과 raw (Chrome 회신, 2026-05-05)

### ① current_database()

```
postgres
```

✅ 신버전 DB 정합 (CLAUDE.md 강제 통과)

### ② app_settings 컬럼 raw (6 rows)

| column_name | data_type                | is_nullable |
|---|---|---|
| id          | bigint                   | NO  |
| key         | text                     | NO  |
| value       | text                     | YES |
| label       | text                     | YES |
| group_name  | text                     | YES |
| updated_at  | timestamp with time zone | YES |

**옛 v1 코드 정합:**
- 옛 v1은 `group_name` + `key` + `value`만 사용 (admLoadSettings + admSave* 4종)
- `label` / `id` / `updated_at` 미사용 — D-9도 동일하게 미사용

### ② group_name 분포 (7 rows)

| group_name        | cnt |
|---|---|
| menu_b            | 7   |
| **page_banner**   | **6** ⚠️ |
| board_visibility  | 5   |
| board_tab         | 2   |
| banner            | 2   |
| gate              | 2   |
| feature_gate      | 1   |

**⚠️ 발견 #1:** 옛 v1 코드는 `group_name = 'banner_img'`로 저장하는데, 신버전 DB에는 **`banner_img` 0건 + `page_banner` 6건** 존재. 옛 v1 코드 그대로 포팅 시 배너 데이터 read 실패.

### ② 4그룹 key·value 전수 (11 rows)

| key                  | value |
|---|---|
| board_tab_company    | false |
| board_tab_hub        | false |
| gate_quick_a2        | true  |
| gate_search_a2       | true  |
| menu_board           | true  |
| **menu_home**        | **false** ⚠️ |
| menu_myspace         | true  |
| **menu_news**        | **false** (정합) |
| menu_quick           | true  |
| menu_scripts         | true  |
| menu_together        | true  |

**라이브 운영 raw:**
- menu_b 7행 정합 (home/scripts/board/myspace/news/quick/together)
- gate 2행 모두 PRO 전용 (true)
- board_tab 2행 모두 숨김 (false) — 1차 탭은 팀+지점만 표시 중

**⚠️ 발견 #2:** `menu_home = false` (홈 메뉴 숨김). 미해결 #17은 보험뉴스만 다뤘으나, 홈도 숨김 상태. 라이브 운영 의도(home 메뉴 미표시 — A1 영역에서 home 진입 다른 경로 활용?) 또는 잔재인지 확인 필요.

`menu_news = false` ✅ 정합 (미해결 #17 보험뉴스 메뉴 숨김 옛 admin.html 처리 결과)

### ③ app_settings RLS 정책 (2 rows)

| policyname                    | cmd    | roles            | using_clause | with_check_clause |
|---|---|---|---|---|
| admin write app_settings       | ALL    | {authenticated}  | is_admin()   | is_admin()        |
| authenticated read app_settings | SELECT | {authenticated} | true         | NULL              |

✅ D-pre.8 sweep 정상 — EXISTS (SELECT ... FROM users ...) 패턴 잔존 0건. is_admin() 통일.

⚠️ SELECT 정책이 `{authenticated}` only — anon 차단. app.html applyMenuSettings는 인증 후 호출이라 정합.

### ④ users.role 분포 (2 rows)

| role      | cnt |
|---|---|
| ga_member | 1   |
| admin     | 1   |

✅ 9역할 정합 회귀 — 5역할 잔존 0건 (D-pre.6 청산 정합). restore DB라 테스트 유저만, 실서버는 별도.

### ⑤ ⭐ Storage 버킷 (Q-4 분기 결정)

| id               | name             | public | created_at                     |
|---|---|---|---|
| onesecond_banner | onesecond_banner | true   | 2026-04-16 05:06:21.978349+00  |

✅ **Case 1 — 1행 반환 → Step 1.5 스킵, Step 2 직진 가능**

### ⑥ Storage objects RLS 정책 (6 rows)

| policyname                              | cmd    | roles            | qual                                      | with_check                              |
|---|---|---|---|---|
| Allow authenticated uploads 1apfxtf_0   | INSERT | {authenticated}  | NULL                                      | true                                    |
| Allow public read 1apfxtf_0             | SELECT | {public}         | true                                      | NULL                                    |
| **admin can delete banners**            | DELETE | {authenticated}  | (bucket_id = 'onesecond_banner'::text)    | NULL                                    |
| **admin can update banners**            | UPDATE | {authenticated}  | (bucket_id = 'onesecond_banner'::text)    | NULL                                    |
| **admin can upload banners**            | INSERT | {authenticated}  | NULL                                      | (bucket_id = 'onesecond_banner'::text)  |
| public can view banners                 | SELECT | {public}         | (bucket_id = 'onesecond_banner'::text)    | NULL                                    |

**⚠️ 발견 #3:** "admin can ..." 3정책 모두 **`is_admin()` 가드 부재**. authenticated 모든 9역할이 onesecond_banner 버킷에 INSERT/UPDATE/DELETE 가능 상태. D-pre.8 sweep 표준(`is_admin()` 가드) 위반.

또 범용 정책 `Allow authenticated uploads 1apfxtf_0`은 bucket_id 필터 없이 모든 버킷 INSERT 허용 → 모든 9역할이 어느 버킷에든 업로드 가능. 보안 취약.

---

## 2. 핵심 발견 3건 (분기 결정 필요)

### 발견 #1 — banner_img vs page_banner group_name 불일치 (Q-9 신규 결재 후보)

| 출처 | group_name | 행 수 |
|---|---|---|
| 옛 v1 admSaveBannerSettings (라인 1860~1942) | `banner_img` | 0행 (DB) |
| 신버전 DB 운영 중 | `page_banner` | 6행 |

**Q-9 옵션:**
- (a) D-9 코드는 `page_banner` group_name 사용 (실 DB 정합) + 옛 v1 `banner_img` 코드 포팅 시 group_name만 변경
- (b) 옛 v1 코드 그대로 `banner_img` 사용 + 기존 page_banner 6행 마이그레이션 (DELETE + INSERT 트랜잭션)
- (c) `banner_img` + `page_banner` 두 그룹 모두 read (병행 운영)

**Code 권장:** (a) — 라이브 운영 영향 0 + 코드 변경 최소. 단 page_banner 그룹의 정확한 key 패턴(`banner_<page>` vs `banner_img_<page>` vs 기타) 추가 SQL 확인 필요.

### 발견 #2 — menu_home = false (홈 메뉴 숨김 라이브 상태)

라이브 운영 시점에 홈 메뉴가 숨김 상태. 의도된 운영 vs 잔재 확인 필요.

**Code 권장:** D-9 진행 차단 아님 — admin이 D-9 화면설정 완성 후 토글로 즉시 ON 가능. 본 capture에 명시 후 D-9 라이브 회귀 의뢰서 §S 시리즈에서 검증.

### 발견 #3 ⭐ — Storage objects RLS admin 3종 is_admin() 가드 부재 (Step 1.6 청산 분기)

옛 v1 시점에 RLS는 `bucket_id` 필터만 있고 admin 가드 부재. authenticated 9역할 모두가 onesecond_banner 버킷에 INSERT/UPDATE/DELETE 가능 + 범용 정책으로 모든 버킷 업로드 가능.

D-pre.8 sweep 누락 보강 (D-4 K-1 / D-6 admin_read_all_logs 패턴 정합).

**Q-10 옵션:**
- (a) ⭐ Step 1.6 신설 — admin 3정책 `is_admin()` 가드 추가 + 범용 정책 1apfxtf_0 폐기 (1 트랜잭션, DROP 4 + CREATE 3) — 보안 우선
- (b) D-9 범위 외 별 트랙 (보안 부채 누적) — admin_v2 운영 영향 0이지만 다른 9역할 업로드 위험 잔존
- (c) 범용 정책 1apfxtf_0만 폐기 (admin 3정책 그대로) — 부분 청산

**Code 권장:** (a) Step 1.6 청산 — 5/15 4팀 오픈 직전이라 보안 우선 + D-pre.8 sweep 표준 정합 (별 트랙 누적은 유지보수 부채)

---

## 3. 추가 SQL 1건 (Q-9 분기 결정 정밀화)

발견 #1 정밀 분석을 위해 page_banner / board_visibility / banner / feature_gate 그룹의 key·value 전수 추가 확인 필요:

```sql
SELECT group_name, key, value
FROM public.app_settings
WHERE group_name IN ('page_banner', 'board_visibility', 'banner', 'feature_gate')
ORDER BY group_name, key;
```

본 결과로 Q-9 채택 시 group_name 단순 변경 vs 더 큰 마이그레이션 필요한지 판정.

---

## 4. 다음 단계 결정 (팀장님)

| 결정 | 내용 |
|:--:|---|
| **D1** | Q-9 채택 (a / b / c 중 하나) — 추가 SQL 결과 raw 후 결정 가능 |
| **D2** | Q-10 채택 (a / b / c 중 하나) — Step 1.6 Storage RLS 보강 분기 |
| **D3** | 추가 SQL 1건 (§ 3) Chrome 위임 즉시 실행 vs 다음 세션 |
| **D4** | 발견 #2 menu_home=false 별도 미해결 이슈 등록 vs 라이브 회귀 의뢰서로 위임 |

**Code 일괄 권장:** D1 (a) + D2 (a) + D3 즉시 실행 + D4 미해결 이슈 #24 등록

---

*본 capture는 D-9 Step 1 사전 검증 SQL 6개 결과 raw + 발견 3건 raw 정리. Q-9·Q-10 결재 + 추가 SQL 결과 후 D-9 작업지시서 §1.2 갱신 + Step 분기 결정.*
