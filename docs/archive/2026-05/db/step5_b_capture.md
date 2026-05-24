# Phase 1 Step 5-B — 트랜잭션 캡처 raw

> **작성일:** 2026-05-09 오후
> **단계:** v2.0 원수사 입점 모델 Phase 1 / Step 5-B (RPC 2 + RLS 1 + 28사 도메인 UPDATE)
> **선행:** Step 5-A 사전 캡처 (`db_step5_pre_capture.md`) + 31사 도메인 raw (`db_step5_insurer_domains.md`)
> **실행자:** Claude in Chrome (Supabase Dashboard SQL Editor, 3 RUN 분리)
> **신버전 검증:** URL `pdnwgzneooyygfejrvbg` + 프로젝트명 `onesecond-v1-restore-0420` ✅
> **결과:** RUN 1 (Pre-flight) + RUN 2 (메인 트랜잭션 BEGIN~COMMIT) + RUN 3 (사후 검증) **모두 PASS**
> **사고 신호:** 0건. 라이브 사용자 무영향.

---

# § 1. RUN 1 — Pre-flight (SELECT only) ✅ 6/6 PASS

| # | 검증 항목 | 결과 | 기대값 |
|---|---|---|---|
| 1-1 | 신버전 진입 | `db=postgres, pg_user=postgres` | ✅ |
| 1-2 | 함수 부재 (`complete_signup`, `admin_approve_user`) | 0행 | ✅ |
| 1-3 | RLS 정책 anon 부재 | 0행 | ✅ |
| 1-4 | 31사 domain 분포 | `NULL=31` | ✅ |
| 1-5 | SECURITY DEFINER 함수 가동 (`is_admin` / `get_my_role` / `current_user_insurer_id`) | 3행 | ✅ |
| 1-6 | users 컬럼 (`insurer_id` / `branch_id` / `team_id` / `status`) | 4행 | ✅ |

→ Pre-flight 모두 PASS. RUN 2 진입 정합.

---

# § 2. RUN 2 — 메인 트랜잭션 (BEGIN~COMMIT 한 RUN) ✅ COMMIT 정합

## 2-1. 신설 단계 raw

| 단계 | SQL | 결과 |
|---|---|---|
| `CREATE FUNCTION complete_signup` | RPC #1 | ✅ |
| `GRANT/REVOKE complete_signup` | authenticated EXECUTE / anon REVOKE | ✅ |
| `CREATE FUNCTION admin_approve_user` | RPC #2 | ✅ |
| `GRANT/REVOKE admin_approve_user` | authenticated EXECUTE / anon REVOKE | ✅ |
| `CREATE POLICY insurers_select_anon_domain_check` | anon SELECT (`domain IS NOT NULL`) | ✅ |
| 28사 UPDATE | `insurers SET domain WHERE slug` | ✅ |

## 2-2. 트랜잭션 내 임시 검증 (COMMIT 전)

```
chk             | 결과
check_domains   | domain_set=28, domain_null=3, total=31 ✅
check_rpc       | rpc_count=2 ✅
check_policy    | policy_count=1 ✅
```

→ 모두 기대값 일치 → COMMIT 확정.

---

# § 3. RUN 3 — 사후 검증 (SELECT only) ✅ 6/6 PASS

## 3-1. 31사 domain 매트릭스 (5-1 raw)

### ✅ SET 28사

| slug | name | domain |
|---|---|---|
| abl | ABL생명 | `@abllife.co.kr` |
| aia | AIA생명 | `@aia.com` |
| aig-fire | AIG손해보험 | `@aig.com` |
| bnp-cardif | BNP파리바 카디프생명 | `@cardif.co.kr` |
| chubb | 처브라이프 | `@chubb.com` |
| db-fire | DB손해보험 | `@dbins.co.kr` |
| dongyang | 동양생명 | `@myangel.co.kr` |
| fubon-hyundai | 푸본현대생명 | `@fubonhyundai.com` |
| hanwha-fire | 한화손해보험 | `@hanwha.com` |
| hanwha-life | 한화생명 | `@hanwha.com` |
| heungkuk-elife | 흥국생명 (e-life) | `@heungkuklife.co.kr` |
| heungkuk-fire | 흥국화재 | `@heungkukfire.co.kr` |
| heungkuk-tlife | 흥국생명 (T-Life) | `@heungkuklife.co.kr` |
| ibk | IBK연금보험 | `@ibki.co.kr` |
| kb-fire | KB손해보험 | `@kbinsure.co.kr` |
| kdb | KDB생명 | `@kdblife.co.kr` |
| kyobo | 교보생명 | `@kyobo.com` |
| lina-fire | 라이나손해보험 | `@chubb.com` |
| lina-life | 라이나생명 | `@cigna.com` |
| lotte-fire | 롯데손해보험 | `@lotteins.co.kr` |
| meritz | 메리츠화재 | `@meritz.co.kr` |
| metlife | 메트라이프 | `@metlife.com` |
| miraeasset | 미래에셋생명 | `@miraeasset.com` |
| nh-fire | NH농협손해보험 | `@nonghyup.com` |
| nh-life | NH농협생명 | `@nonghyup.com` |
| samsung-fire | 삼성화재 | `@samsung.com` |
| samsung-life | 삼성생명 | `@samsunglife.com` |
| shinhan | 신한라이프 | `@shinhan.com` |

### ⚠️ NULL 유지 3사 (별 트랙 #44 사후 검증 대상)

| slug | name | domain |
|---|---|---|
| db-life | DB생명 | NULL |
| im-life | iM라이프 | NULL |
| kb-life | KB라이프 | NULL |

## 3-2. 그룹 공통 도메인 4건 (5-2 raw)

| domain | row 수 | 매핑 보험사 |
|---|---|---|
| `@heungkuklife.co.kr` | 2 | heungkuk-elife + heungkuk-tlife |
| `@chubb.com` | 2 | lina-fire + chubb |
| `@hanwha.com` | 2 | hanwha-life + hanwha-fire |
| `@nonghyup.com` | 2 | nh-life + nh-fire |

→ 4건 모두 의도된 그룹 공통 도메인 (기존 분석 정합). Step 5-C 단계에서 사용자 보험사 선택 + 도메인 매칭으로 검증.

## 3-3. RPC 본문 회귀 (5-3 raw)

| proname | has_auth_check | is_sec_def | 비고 |
|---|---|---|---|
| `admin_approve_user` | false | true | ⚠️ Chrome 메모: `auth.uid() null 체크 대신 is_admin() / insurer_branch_manager 역할 체크 사용`. 정합 ✅ |
| `complete_signup` | true | true | 본문 `auth.uid() IS NULL` 체크 정합 ✅ |

→ 둘 다 SECURITY DEFINER 정합. Chrome 메모 정상 — `admin_approve_user`는 본문 첫 줄에 `IF NOT (is_admin() OR caller_role = 'insurer_branch_manager') THEN RAISE EXCEPTION` 박혀 있음 = 비인증 anon이 호출해도 자동 차단 (둘 다 false 반환).

## 3-4. RPC 권한 raw (5-4 raw)

```
routine_name        | grantee        | privilege_type
admin_approve_user  | PUBLIC         | EXECUTE
admin_approve_user  | authenticated  | EXECUTE
admin_approve_user  | postgres       | EXECUTE
admin_approve_user  | service_role   | EXECUTE
complete_signup     | PUBLIC         | EXECUTE
complete_signup     | authenticated  | EXECUTE
complete_signup     | postgres       | EXECUTE
complete_signup     | service_role   | EXECUTE
(8행)
```

### ⚠️ 잠재 발견 — PUBLIC EXECUTE 잔존 (별 트랙 #45 신설 대상)

**관찰:**
- 의뢰서 SQL: `GRANT EXECUTE ... TO authenticated; REVOKE EXECUTE ... FROM anon;`
- PostgreSQL default: 함수 생성 시 `GRANT EXECUTE ... TO PUBLIC` 자동 부여
- 따라서 PUBLIC EXECUTE 잔존 = anon도 호출 가능 (REVOKE FROM anon는 PUBLIC GRANT를 덮지 못함, PostgreSQL 권한 모델)

**실질 영향:**
- `complete_signup` 본문 `auth.uid() IS NULL` 체크 → anon 호출 시 RAISE EXCEPTION → 차단 ✅
- `admin_approve_user` 본문 `is_admin() OR caller_role = 'insurer_branch_manager'` 체크 → anon 호출 시 둘 다 false → RAISE EXCEPTION → 차단 ✅
- 즉 본문 로직으로 실질 차단됨. **보안 위험은 0.**

**best practice 정합:**
- `REVOKE EXECUTE ... FROM PUBLIC` 추가 권장 (의뢰서 누락)
- → **별 트랙 #45 신설:** RPC 2종 PUBLIC EXECUTE 후속 정정 (Step 5-C 진입 후 30분, 보안 위험 0이라 시급성 낮음)

## 3-5. RLS 정책 raw (5-5 raw, 4정책 정합)

```
policyname                          | cmd    | roles            | qual
insurers_write_admin                | ALL    | {authenticated}  | is_admin()
insurers_select_admin               | SELECT | {authenticated}  | is_admin()
insurers_select_anon_domain_check   | SELECT | {anon}           | (domain IS NOT NULL)
insurers_select_authenticated       | SELECT | {authenticated}  | (is_active = true)
(4건 — 기존 3 + 신설 1) ✅
```

→ 신설 정책 1건 (`insurers_select_anon_domain_check`) 정합. anon이 도메인 화이트리스트 검증 시 SELECT 통과 (도메인 NULL인 ⚠️ 추정 3사는 감춰짐).

## 3-6. 사용자 무영향 (5-6 raw)

| role | status | count |
|---|---|---|
| admin | active | 1 |
| ga_member | active | 2 |

→ Step 5-A와 동일. **라이브 사용자 영향 0건** ✅.

---

# § 4. 종합 판정

| 영역 | 결과 |
|---|---|
| RUN 1 Pre-flight | 6/6 PASS ✅ |
| RUN 2 메인 트랜잭션 | BEGIN~COMMIT 에러 없이 완료, 임시 검증 3/3 PASS ✅ |
| RUN 3 사후 검증 | 6/6 PASS ✅ |
| 사고 신호 | **0건** |
| 라이브 사용자 영향 | **0건** |

## 4-1. Step 5-B 종료 매트릭스

| 산출물 | 상태 |
|---|---|
| RPC `complete_signup(insurer_id, branch_id, team_id, status)` SECURITY DEFINER | ✅ 신설 |
| RPC `admin_approve_user(user_id)` SECURITY DEFINER | ✅ 신설 |
| RLS `insurers_select_anon_domain_check` (anon SELECT) | ✅ 신설 |
| 28사 도메인 UPDATE | ✅ 완료 |
| 3사 NULL 유지 (db-life / im-life / kb-life) | ✅ 의도 정합 |
| 그룹 공통 도메인 4건 (`@heungkuklife.co.kr` / `@chubb.com` / `@hanwha.com` / `@nonghyup.com`) | ✅ 의도 정합 |

## 4-2. Step 5 전체 진행 매트릭스

| Step | 상태 |
|---|---|
| 5-A 사전 분석 | ✅ 종료 (5/9 오후) |
| **5-B DB 신설** | ✅ **종료 (5/9 오후)** ⭐ |
| 5-C 라이브 코드 (index.html 폼 분기 + JS) | ⏸ 다음 진입 |
| 5-D 라이브 회귀 (Chrome 시나리오 9건) | ⏸ |
| 5-E 종료 + commit + 인계 | ⏸ |

---

# § 5. 별 트랙 #45 신설 (잠재 발견)

| 별 트랙 # | 후보 | 분리 사유 | 시급성 |
|---|---|---|---|
| **#45** | `complete_signup` / `admin_approve_user` PUBLIC EXECUTE 후속 정정 (`REVOKE EXECUTE ... FROM PUBLIC`) | 의뢰서 누락 (PostgreSQL default GRANT TO PUBLIC). 본문 로직으로 실질 차단되지만 best practice 정합. | 🟢 낮음 (보안 위험 0) |

**처리:** Step 5-C 진입 후 ~30분 SQL 1줄 추가 또는 Step 5 종료 후 별 트랙 단독 처리.

---

# § 6. 다음 단계 인계 (Step 5-C 진입)

**산출물 확정:**
- `complete_signup(p_insurer_id, p_branch_id, p_team_id, p_status)` 호출 패턴
- `admin_approve_user(p_user_id)` 호출 패턴 (Step 10~15 admin_v2 D-1 융합 시점에 UI 부착)
- `insurers` anon SELECT 가능 (`WHERE domain IS NOT NULL` 통과 row만)
- 28사 도메인 화이트리스트 가동

**Step 5-C 진입 SQL/JS 의존:**
```javascript
// 1. 도메인 화이트리스트 검증 (anon 권한, 클라 1차)
const { data, error } = await supabase
  .from('insurers')
  .select('id, slug, name, domain')
  .eq('id', selectedInsurerId)
  .single();
if (data.domain && !email.endsWith(data.domain)) {
  alert('이메일이 ' + data.name + ' 공식 도메인과 일치하지 않습니다.');
  return;
}

// 2. Auth 가입 후 RPC 호출 (D5 결재 (b) 정합)
await supabase.auth.signUp({ email, password, options: { data: meta }});
// trigger handle_new_user가 public.users INSERT (status='active' default)
// 직후 본인 메타 보강
await supabase.rpc('complete_signup', {
  p_insurer_id: selectedInsurerId,  // 보험사 분기 시 매핑된 ID
  p_branch_id:  selectedBranchId,   // GA 분기 시 매핑된 ID
  p_team_id:    selectedTeamId,
  p_status:     intent === 'insurer' ? 'pending' : 'active'  // D3 결재 (a)
});
```

---

# § 7. 본 캡처 사용 권한

본 파일은 **2026-05-09 오후 시점 Step 5-B 라이브 진실 원천 raw**. Chrome RUN 회신 + Code 분석 정합. Step 5-C 진입 시 § 6 의존 패턴 활용. 사후 도메인 변경·RPC 본문 변경 발견 시 Code가 본 파일 갱신 + 라이브 정합 회귀.

진실 원천:
- `docs/architecture/db_step5_pre_capture.md` (Step 5-A)
- `docs/architecture/db_step5_insurer_domains.md` (31사 도메인 raw)
- `docs/specs/v2_step5_signup_form_workorder.md` (작업지시서 § 4-B 진입)
- `docs/specs/v2_insurer_admission_phase1_v2.md` (메인 spec § 6 RPC 골격 + § 7 마이그레이션)
- 메모리 `supabase_sql_editor_session_isolation.md` (RUN 분리 학습 정합)
