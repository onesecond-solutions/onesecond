# Phase 1.5 — Step P1.5-A 사전 회귀 캡처 raw

> **작성일:** 2026-05-09 저녁 (Phase 1.5 본진 진입 직전)
> **단계:** Phase 1.5 / Step P1.5-A 사전 분석 + 라이브 raw 캡처
> **선행:** 5/9 오후·저녁 종료 (Step 5-A/5-B/5-C + branches/teams RLS 비활성화) — `docs/sessions/2026-05-09_1757.md` 참조
> **실행자:** Claude in Chrome (Supabase Dashboard SQL Editor)
> **신버전 검증:** 좌측 상단 `onesecond-v1-restore-0420` ✅ 팀장님 시각 확인 완료
> **결과:** 4항 모두 PASS — **P1.5-B 본진 진입 OK**

---

# § 1. 라이브 코드 라인 캡처 (Read 분석)

| 파일 | 총 라인 | 핵심 섹션 |
|---|---|---|
| `pages/home_v2.html` | 797 | 전체 = home_v2 본진 (5/9 오후 신설 + 호버 강화) |
| `index.html` | 2529 | 가입 폼 마크업 1704~1956 / 가입 JS 2144~ / handle_new_user 주석 2338, 2437 |
| `login.html` | 485 | 로그인 카드 184~217 / 비밀번호 찾기 236~270 / showForgot/doForgot 함수 |

**진실 원천 정합:** 작업지시서 § 2-3 박힌 라인 정합 ✅.

---

# § 2. RUN 1 — 사전 회귀 4항 (SELECT 묶음) — Chrome PASS

의뢰서: `docs/architecture/db_phase15_pre_capture_request.md` § 2 참조.

## 2-1. ① branches/teams RLS 비활성화 회귀 ✅

| table_name | rls_enabled | rls_forced |
|------------|-------------|------------|
| branches   | **false**   | false      |
| insurers   | true        | false      |
| teams      | **false**   | false      |
| users      | true        | false      |

**판정:** branches/teams RLS 5/9 저녁 처방 그대로 유지 ✅. insurers/users 정상 활성 ✅.

## 2-2. ② 28사 도메인 활성 회귀 ✅

- `domain_filled` = **28** ✅
- NULL 3사 (마지막 위치): **db-life / im-life / kb-life** ✅

**31사 리스트 raw (slug · name · domain):**

| slug | name | domain |
|---|---|---|
| abl | ABL생명 | @abllife.co.kr |
| aia | AIA생명 | @aia.com |
| aig-fire | AIG손해보험 | @aig.com |
| bnp-cardif | BNP파리바 카디프생명 | @cardif.co.kr |
| db-fire | DB손해보험 | @dbins.co.kr |
| ibk | IBK연금보험 | @ibki.co.kr |
| kb-fire | KB손해보험 | @kbinsure.co.kr |
| kdb | KDB생명 | @kdblife.co.kr |
| nh-life | NH농협생명 | @nonghyup.com |
| nh-fire | NH농협손해보험 | @nonghyup.com |
| kyobo | 교보생명 | @kyobo.com |
| dongyang | 동양생명 | @myangel.co.kr |
| lina-life | 라이나생명 | @cigna.com |
| lina-fire | 라이나손해보험 | @chubb.com |
| lotte-fire | 롯데손해보험 | @lotteins.co.kr |
| meritz | 메리츠화재 | @meritz.co.kr |
| metlife | 메트라이프 | @metlife.com |
| miraeasset | 미래에셋생명 | @miraeasset.com |
| samsung-life | 삼성생명 | @samsunglife.com |
| samsung-fire | 삼성화재 | @samsung.com |
| shinhan | 신한라이프 | @shinhan.com |
| chubb | 처브라이프 | @chubb.com |
| fubon-hyundai | 푸본현대생명 | @fubonhyundai.com |
| hanwha-life | 한화생명 | @hanwha.com |
| hanwha-fire | 한화손해보험 | @hanwha.com |
| heungkuk-elife | 흥국생명 (e-life) | @heungkuklife.co.kr |
| heungkuk-tlife | 흥국생명 (T-Life) | @heungkuklife.co.kr |
| heungkuk-fire | 흥국화재 | @heungkukfire.co.kr |
| db-life | DB생명 | NULL |
| im-life | iM라이프 | NULL |
| kb-life | KB라이프 | NULL |

**잠재 별 트랙 회귀:**
- `samsung.com` — 삼성그룹 공통 도메인. 삼성SDI/삼성전자 직원 가입 시도 시 매핑 충돌 가능성. (별 트랙 #43 후속)
- `chubb.com` — `lina-fire`(라이나손해보험)와 `chubb`(처브라이프) 동일 도메인. anon SELECT 시 어느 보험사로 매핑되나 결정 필요.
- `nonghyup.com` — `nh-life`/`nh-fire` 양쪽 동일. 직원이 생명/손해 중 어디 소속인지 클라가 명시 필요.
- `cardif.co.kr` (@cardif.co.kr) — 정합. 단 BNP파리바 카디프생명 1사만 사용 = 1:1.
- `hanwha.com` — `hanwha-life`/`hanwha-fire` 양쪽 동일. 한화생명/한화손해 양쪽 매핑.

→ 위 4건은 별 트랙 #43으로 누적 (작업지시서 § 4-B 도메인 화이트리스트 검증 시 추가 분기 필요할 수 있음).

## 2-3. ③ handle_new_user fingerprint 6건 회귀 ✅

| has_ga_member | has_insurer_bm | has_insurer_id_col | has_branch_id_col | has_team_id_col | has_status_col |
|---|---|---|---|---|---|
| true | true | true | true | true | true |

**판정:** 6/6 PASS ✅. 5/9 오후 Step 5-C 정정 본문 그대로 유지 = 4컬럼 추가 + 9역할 IN 절 보존.

## 2-4. ④ 사용자 분포 무영향 회귀 ✅

| role | status | cnt |
|---|---|---|
| ga_member | active | 2 |
| admin | active | 1 |

**판정:** 5/9 저녁 마감 분포 정합 ✅. 라이브 사용자 영향 0건.

---

# § 3. 종합 판정

| 항목 | 결과 |
|---|---|
| ① RLS 회귀 (branches/teams=false, insurers/users=true) | ✅ |
| ② 28사 도메인 활성 (28/31, NULL 3사 정합) | ✅ |
| ③ handle_new_user fingerprint 6/6 | ✅ |
| ④ 사용자 분포 (admin=1, ga_member=2) | ✅ |
| 사고 신호 | 0건 |
| **P1.5-B 본진 진입** | **OK** ✅ |

---

# § 4. 후속 별 트랙 누적 (사후 결재 후보)

| # | 영역 | 본질 |
|---|---|---|
| #43 (5/9 오후 누적) | 도메인 충돌 도메인 4건 | samsung.com/chubb.com/nonghyup.com/hanwha.com — 1 도메인 ↔ 다 보험사 매핑 시 클라가 어느 보험사 선택할지 분기 필요. Phase 1.5 가입 폼 흡수 시 검증 |
| #43 (5/9 저녁 갱신) | NULL 3사 도메인 | db-life/im-life/kb-life — 사후 검증 후 UPDATE |

---

# § 5. 본 캡처 사용 권한

본 파일은 **2026-05-09 저녁 시점 Phase 1.5 본진 진입 직전 진실 원천 raw**. Chrome RUN 회신 + 의뢰서 § 2 정합. 사후 라이브 변경 발견 시 본 파일 갱신 + 라이브 정합 회귀.

**진실 원천:**
- `docs/architecture/db_phase15_pre_capture_request.md` (의뢰서, RUN 1 SQL 원본)
- `docs/sessions/2026-05-09_1757.md` (5/9 저녁 마감 인계 노트)
- `docs/specs/v2_phase15_home_signup_workorder.md` § 4-A + § 5-1 (P1.5-A 사양)
- `docs/architecture/db_step5_handle_new_user_capture.md` § 3-4 (fingerprint 6건 정의 원천)
- `docs/architecture/db_phase15_branches_rls_fix.md` (RLS 처방 캡처)
- `docs/architecture/db_step5_b_capture.md` (28사 도메인 UPDATE 원천)
