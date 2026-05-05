# admin_v2 Phase D-9 Step 1 capture — 사전 검증 SQL 6개 결과 raw + 발견 3건 + 후속 갱신

> **작성일:** 2026-05-05 (오전 0813 신설 → 오전 후속 09:30 갱신)
> **작성자:** Claude Code
> **선행 산출물:**
> - 작업지시서: `docs/specs/admin_v2_d9_workorder.md` (241줄, Q-1~Q-8 일괄 (a) 승인)
> - Chrome 위임 의뢰서 ①: `docs/specs/admin_v2_d9_step1_chrome_request_2026-05-05.md` (335줄, 회신 완료)
> - Chrome 위임 의뢰서 ② (후속 SQL): `docs/specs/admin_v2_d9_step1_followup_chrome_request_2026-05-05.md`
> - Chrome 위임 의뢰서 ③ (Step 1.6 트랜잭션 — 갱신 대기): `docs/specs/admin_v2_d9_step1_6_chrome_request_2026-05-05.md` (옵션 B 채택으로 갱신)
> **상태:** 🟢 Q-9·Q-10 결재 (a)(a) 승인 + 후속 SQL 회신 완료 + Step 1.6 옵션 B 채택 (admin 3정책만 청산, 범용 정책 + library_files/board_attachments 정책 = 별 트랙 #25 분리)

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

### ② 4그룹 key·value 전수 (11 rows — menu_b/gate/board_tab/banner_img)

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
- banner_img 0행 (옛 v1 코드 group_name 부재) — 발견 #1 분기

**⚠️ 발견 #2:** `menu_home = false` (홈 메뉴 숨김). 미해결 #17은 보험뉴스만 다뤘으나, 홈도 숨김 상태. 라이브 운영 의도(home 메뉴 미표시 — A1 영역에서 home 진입 다른 경로 활용?) 또는 잔재인지 확인 필요. **미해결 #24로 등록 (2026-05-05 후속).**

`menu_news = false` ✅ 정합 (미해결 #17 보험뉴스 메뉴 숨김 옛 admin.html 처리 결과)

### ② 후속 SQL — 4그룹 key·value 전수 (14 rows — page_banner / board_visibility / banner / feature_gate, 2026-05-05 후속 회신)

| group_name        | key                    | value |
|---|---|---|
| banner            | banner_text            |       |
| banner            | banner_visible         | off   |
| board_visibility  | board_company          | false |
| board_visibility  | board_hub              | false |
| board_visibility  | board_notice           | true  |
| board_visibility  | board_qa_product       | true  |
| board_visibility  | board_qa_underwriting  | true  |
| feature_gate      | feature_quickaction    | false |
| **page_banner**   | **banner_img_board**   |       |
| **page_banner**   | **banner_img_home**    |       |
| **page_banner**   | **banner_img_myspace** |       |
| **page_banner**   | **banner_img_news**    |       |
| **page_banner**   | **banner_img_quick**   |       |
| **page_banner**   | **banner_img_scripts** |       |

**Q-9 (a) 정밀화 결론 (좋은 소식):**
- `page_banner` 그룹의 key 패턴 = `banner_img_<page>` (board / home / myspace / news / quick / scripts 6개) → **옛 v1 admSaveBannerSettings 코드 패턴 그대로**
- → **Step 2 코드 정합: group_name 1라인만 `banner_img` → `page_banner` 변경**, key 패턴·키명·로직 코드 그대로 사용 가능 (변경 최소)

**신규 그룹 분기 (D-9 범위 외 별 트랙):**
- `banner` 2행 (`banner_text`/`banner_visible=off`) — 텍스트 띠배너 추정. `page_banner`(이미지)와 의미 분리. → 별 트랙 (Phase E 또는 v1.1 띠배너 운영 트랙)
- `feature_gate` 1행 (`feature_quickaction=false`) — `gate` 그룹과 분리 운영. → Q-2 (a) `gate` 사용 그대로 + `feature_gate`는 별 트랙
- `board_visibility` 5행 (`board_company`/`board_hub`/`board_notice`/`board_qa_product`/`board_qa_underwriting`) — 개별 게시판 노출. `board_tab`(2행, 1차 탭)과 의미 다름. → Q-3 (a) `board_tab` 사용 그대로 + `board_visibility`는 별 트랙 (게시판 개별 토글)

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

**Code 권장 1차:** (a) Step 1.6 청산 — 5/15 4팀 오픈 직전이라 보안 우선 + D-pre.8 sweep 표준 정합

### 발견 #3 후속 (2026-05-05 Step A 회신) — 옵션 B 채택 분기 결정

Step 1.6 의뢰서 ③ Step A 회신으로 **3개 버킷 + 범용 정책 영향 범위 발견**:

| 버킷 | public | INSERT 의존 정책 | 신설 필요 |
|---|---|---|---|
| `onesecond_banner` | true | admin 3정책 (is_admin() 가드 부재 — 본 청산 대상) | DROP 3 + CREATE 3 |
| `library_files` | false | **`Allow authenticated uploads 1apfxtf_0` (범용, with_check=true) — 유일 INSERT 정책** | 별 트랙 #25 (myspace 업로드 폴더 패턴 raw 검토 후) |
| `board_attachments` | true | **동일 범용 정책 — 유일 INSERT 정책** | 별 트랙 #25 (게시판 첨부 폴더 패턴 raw 검토 후) |

**범용 정책 폐기는 library_files / board_attachments INSERT 정책 신설과 반드시 묶여야 안전.** 본 시점 단독 폐기 시 두 버킷 업로드 차단 → myspace 자료 업로드 / 게시판 첨부 회귀 발생.

**옵션 B 채택 (2026-05-05 09:30 일괄 결재):**
- 본 트랜잭션 = onesecond_banner admin 3정책만 청산 (DROP 3 + CREATE 3, 범용 정책 보존)
- 범용 정책 폐기 + library_files / board_attachments INSERT 정책 신설 = **별 트랙 #25 = Storage RLS 전수 sweep 작업지시서** (5/12 슬롯, `docs/specs/storage_rls_full_sweep_workorder.md`)
- 본 시점 청산 정도: onesecond_banner 정합화 즉시 (~80%) + 범용 부채는 5/12 별 트랙 청산

**Code 권장 2차 (분기 후):** 옵션 B + 별 트랙 #25 신설 + 미해결 #25 등록

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

## 4. 다음 단계 결정 (팀장님 — 2026-05-05 09:30 일괄 결재 완료)

| 결정 | 내용 | 결재 결과 |
|:--:|---|---|
| **D1** | Q-9 채택 (a / b / c 중 하나) | **(a) ⭐** — page_banner group_name 사용. 후속 SQL raw 정밀화 결과 = key 패턴 옛 v1 그대로 (`banner_img_<page>`) → 코드 변경 최소 (group_name 1라인) |
| **D2** | Q-10 채택 (a / b / c 중 하나) — Step 1.6 분기 | **(a) → 옵션 B 변형** — Step A 회신으로 영향 범위 재분석 후 옵션 B 채택 (admin 3정책만 청산, 범용 정책 + library_files / board_attachments 정책 = 별 트랙 #25) |
| **D3** | 추가 SQL 1건 즉시 실행 | **즉시 실행 완료 (2026-05-05 09:30)** — 후속 SQL 의뢰서 회신 raw § 1 ② 후속 갱신 |
| **D4** | 발견 #2 menu_home=false 미해결 이슈 등록 | **YES** — 미해결 #24 등록 |
| **D5** (신규) | 별 트랙 #25 = Storage RLS 전수 sweep 작업지시서 신설 | **YES** — `docs/specs/storage_rls_full_sweep_workorder.md` 신설 (5/12 슬롯) |

---

## 5. 영구 학습 후보 (2026-05-05 후속 누적)

### 학습 #1 (D-pre.8 sweep Storage 누락 영구 학습) — Step A 회신으로 강화

D-pre.8 sweep은 public schema 인라인 EXISTS만 청산. **storage.objects RLS는 sweep 범위 밖**이라:
- 옛 v1 시점 admin 3정책 (`bucket_id` 체크만, is_admin() 가드 부재) 잔존
- **추가 발견:** 범용 정책 `Allow authenticated uploads 1apfxtf_0` (with_check=true)이 library_files / board_attachments의 **유일 INSERT 정책**으로 잔존 — 폐기 시 두 버킷 업로드 회귀

→ **D-final P-* 시점 또는 별 트랙 #25 Storage RLS 전수 sweep 1회 추가** 필수. Storage 정책 표준 = `bucket_id` + `is_admin()` 또는 `(storage.foldername(name))[1] = auth.uid()::text` 패턴 채택.

### 학습 #2 (그룹 명명 분기 — 옛 v1 코드 vs 신버전 DB 운영) — Q-9 정밀화로 부분 해소

옛 v1 admin.html 화면설정 4섹션 코드는 `banner_img` group_name + `banner_img_<page>` key 패턴을 사용. 신버전 DB는 `page_banner` group_name + `banner_img_<page>` key 패턴을 사용.

→ **차이는 group_name 1단어만**. 즉 옛 v1 시점 이후 누군가가 group_name을 바꿨지만 key 패턴은 보존. D-9 코드 정합 = group_name 1라인 변경.

추가로 신버전 DB에 신규 그룹 3종 (`banner` / `feature_gate` / `board_visibility`) 운영 중 → D-9 범위 외 별 트랙으로 분리 (Phase E 또는 별 트랙).

### 학습 #3 (트랜잭션 사전 검증 가치) — Step A 회신 핵심 가치

Step 1.6 의뢰서가 BEGIN ... 사후 검증 ... COMMIT/ROLLBACK 패턴이었음에도, **사전 검증 (Step A) 단계에서 영향 범위 발견 → 트랜잭션 미진입**이 핵심 가치 발휘.

→ Step A 미실행 채 BEGIN 진입 시: 사후 검증 검증 1 (5행 정합)은 통과했을 것 (onesecond_banner 정합 한정 검증). library_files / board_attachments 영향은 사후 라이브 회귀에서야 발견 → ROLLBACK 시점 늦어짐.

**표준화:** Storage RLS 트랜잭션 의뢰서는 항상 § Step A 사전 검증 = 모든 버킷 raw + 모든 storage 정책 raw 1쌍 필수. 트랜잭션 진입 전 영향 범위 명문화.

---

## 6. Step 1.6 트랜잭션 결과 raw (2026-05-05 09:30 후속, COMMIT 완전 정합)

### 6-1. 실행 방식

Supabase Management API autocommit (DROP 3 → CREATE 3 순차 적용). 사후 검증 정합 확인 후 자동 COMMIT.

### 6-2. Step B 검증 1 — 정책 6건 정합

| policyname | cmd | roles | qual | with_check |
|---|---|---|---|---|
| Allow authenticated uploads 1apfxtf_0 | INSERT | {authenticated} | null | true |
| Allow public read 1apfxtf_0 | SELECT | {public} | true | null |
| **admin can delete banners** | DELETE | {authenticated} | `((bucket_id = 'onesecond_banner'::text) AND is_admin())` | null |
| **admin can update banners** | UPDATE | {authenticated} | `((bucket_id = 'onesecond_banner'::text) AND is_admin())` | `((bucket_id = 'onesecond_banner'::text) AND is_admin())` |
| **admin can upload banners** | INSERT | {authenticated} | null | `((bucket_id = 'onesecond_banner'::text) AND is_admin())` |
| public can view banners | SELECT | {public} | `(bucket_id = 'onesecond_banner'::text)` | null |

✅ 6행 정합 (admin 3정책에 `is_admin()` 가드 추가, 범용 정책 보존)

### 6-3. Step B 검증 2 — admin 3정책 is_admin() 가드 정합

| policyname | cmd | has_is_admin_guard |
|---|---|---|
| admin can delete banners | DELETE | true |
| admin can update banners | UPDATE | true |
| admin can upload banners | INSERT | true |

✅ 3행, 모두 `true`

### 6-4. Step C-1 — 정책 카운트 라이브 회귀

```
total_policies=6, admin_policies=3, legacy_remnant=1
```

✅ 옵션 B 정합 — `legacy_remnant=1` (`Allow authenticated uploads 1apfxtf_0`, 별 트랙 #25에서 청산 예정).

### 6-5. Step C-2 — is_admin() 함수 회귀

```
proname=is_admin, security_definer=true, provolatile=s
```

✅ D-pre.7 SECURITY DEFINER + STABLE 정합 (사고 학습 정합).

### 6-6. 영구 학습 학습 #3 갱신 (트랜잭션 사전 검증 가치 강화)

본 트랜잭션은 BEGIN ... COMMIT 형식이 아닌 **Supabase Management API autocommit** 방식으로 실행됨. 즉 DROP 3 → CREATE 3 사이에 짧은 시간 admin 정책 부재 구간 발생 가능. 사후 검증 1·2가 모두 정합이면 운영 영향 0이지만, 만약 CREATE 1건이 실패하면 admin 정책 부분 부재 상태 잔존 가능.

→ **영구 학습:** Supabase Management API autocommit 환경에서 RLS 정책 청산은 **사후 검증 1·2 모두 정합 확인 후 즉시 다음 단계 진입**. 검증 비정합 시 즉시 재청산 트랜잭션 신설 (롤백 불가, 재실행이 표준).

본 사례에서는 검증 1·2 모두 정합 → 운영 영향 0. 표준 정합.

### 6-7. D-9 Step 1.6 청산 종료 + Step 2 즉시 진입 가능

- onesecond_banner admin 3정책 정합화 완료 (~80% 청산)
- 범용 정책 1apfxtf_0 보존 (별 트랙 #25에서 라이브러리·게시판 첨부 정책 신설과 함께 청산 예정, 5/12 슬롯)
- D-pre.8 sweep Storage 영역 누락 보강 (admin 3정책 한정)
- **D-9 Step 2 진입 차단 0건** — `js/admin_v2.js` settings 섹션 12함수 신설 즉시 가능

---

*본 capture는 D-9 Step 1 사전 검증 SQL 6개 결과 raw + 발견 3건 + 후속 SQL raw + 옵션 B 채택 분기 + Step 1.6 트랜잭션 결과 raw + 영구 학습 3건 누적. Step 2 진입 즉시 가능.*
