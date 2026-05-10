# 인덱스 상세 1 — Phase 1 (v2.0 원수사 입점 모델)

> **상위 인덱스:** [`_INDEX.md`](./_INDEX.md) (압축본 ~150줄)
> **본 파일 범위:** Phase 1 18단계 + Step 2-bis 누적 + 결정 통보 7건 + 4중 방어 + 버전 진화 + Phase 1 폐기 문서

---

## 🎯 v2.0 원수사 입점 모델 Phase 1 (2026-05-07 메인 트랙 전환)

**진실 원천 (OS 정의):** `docs/core/onesecond_os_definition_v2_2026-05-07.md` (540줄)
**통합 spec (현행 v2):** `docs/specs/v2_insurer_admission_phase1_v2.md` (~750줄, commit `bdc5c19`, 42건 결정 통합) ⭐
**통합 spec (폐기 v1):** `docs/specs/v2_insurer_admission_phase1_v1.md` (829줄, 폐기 헤더 박힘, 5/7 commit `f403b82`)
**진실 원천 (폐기 원본):** `docs/deprecated/onesecond_phase1_definition_20260507.md` (521줄, commit `c6359b4`)

**전환 사유:** 게시판·회원가입·보험사 페이지 전면 재정의. 4탭 → 2탭 / 9역할 차등 → 사이트 단위 단순화 / 보험사 게시판 = 공급 레이어 / 현장의 소리 = 소비 레이어.

---

## 결정 통보 7건 + 추가 검토 6건 (본 spec § 1)

| # | 결정 | 채택 |
|---|---|---|
| 1 | 6필드 직접 입력 (연령/성별/병력/진단시기/약복용/현재상태 자유 텍스트) | ✅ |
| 2 | 보험사 게시판 = 물리적으로 독립된 페이지 (`/insurer/{slug}` 동적 라우팅) | ✅ |
| 3 | 회원가입 진입 = (b) 일반 폼 첫 단계 분기 | ✅ |
| 4 | 본 의뢰 최우선 트랙 (admin_v2 Phase D 융합) | ✅ |
| A | Supabase Auth 이메일 인증 (4중 방어 격상) | ✅ |
| B | admin Phase D 잔여 융합 (D-1/D-7/D-8/D-9/D-10/D-final) | ✅ |
| C | Quick 메뉴 통합 B안 (Phase 1 §원전산 / Phase 2 §결제·연락처·BMI) | ✅ |

---

## Phase 1 작업 순서 (18단계, 종료 7건 + Step 2-bis ✅ + Phase 1.5 ✅ / 잔여 ~7.8세션)

> spec v2 § 9-1 정합. 본 표는 v2 작업 순서 그대로.

| # | 단계 | 세션 / 상태 |
|---|---|---|
| 0 | spec 명문화 (v1) + _INDEX.md 메인 트랙 재정의 | ✅ 완료 (5/7 오후) |
| 0-bis | spec v2 재작성 (42건 결정 통합 + v1 폐기 헤더) | ✅ 완료 (5/8 오전, commit `bdc5c19`) |
| 0-tris | README.md 9역할 정합 + 5축 + 4팀 표기 정리 | ✅ 완료 (5/8 오전, commit `bdc5c19`) |
| 1 | (병행) D-9 Step 5 라이브 회귀 회신 마무리 | 별도 30분 |
| 2 | DB 마이그레이션 (insurers + posts ALTER + users.insurer_id + RLS sweep) | ✅ 완료 (5/7 오후) |
| **2-bis** | DB 보강 마이그레이션 (branches/teams/IEB + 컬럼 +5 + parent_post_id + RLS sweep) | ✅ **완료 (5/9 새벽 + 점심, commit 5건 / 라이브 트랜잭션 5건)** |
| 3 | Quick 메뉴 §원전산 전환 (옵션 a 단순 채택) | ✅ 완료 (5/8 새벽) |
| 4 | Supabase Auth 이메일 인증 ON (사실상 검증 단계) | ✅ 완료 (5/8 새벽) |
| 5 | 보험사 회원가입 폼 (4중 방어 + 직급→9역할 매핑) | ⚠️ Phase 1.5로 격상 흡수 (5/9 저녁 결정 옵션 Y') |
| **1.5** | **Phase 1.5 본진 (home_v2 통합 가입+로그인 모달)** | ✅ **완료 (5/10 새벽, P1.5-A~E 14/15 PASS)** ⭐ |
| 6 | 보험사 독립 페이지 (insurer.html 동적 라우팅) | 0.5세션 (5/15 후) |
| **7** | **게시판 7메뉴 재구조화 (board.html, 4탭 → 7종 board_type)** | **1.3세션 (5/15 본질 격상 검토)** ⭐ |
| **8** | **6필드 + 검색창 큼지막 UI (구글 느낌 + 정규식 차단)** | **1.8세션 (5/15 본질 격상 검토)** ⭐ |
| **9** | **양방향 미러링 + 시드 자동 분기 + 통합 view 1차 준비** | **1.3세션** |
| 10~15 | admin_v2 D-1/D-9/D-10/D-7/D-8/D-final 융합 | 2.4세션 (5/15 후) |
| 16 | 라이브 회귀 + 9역할 종합 검수 | 0.5세션 |
| | **종료** | **9건 (Step 0/0-bis/0-tris/2/2-bis/3/4/Phase 1.5)** |
| | **잔여 소계** | **~7.8세션** |

---

## 4중 방어 (가짜 보험사 임직원 가입 방지)

```
1. 도메인 화이트리스트 (insurers.domain)
2. Supabase Auth 이메일 인증 ⭐ Phase 1 Step 4 ON 확정
3. status='pending' (D-pre.5 활용)
4. 매니저 승인 (insurer_branch_manager 또는 admin)
```

---

## 버전 진화

| 버전 | 진입 시점 | 범위 |
|---|---|---|
| **v1.0 (본 spec)** | 즉시 | insurers 단순 컬럼 + admin_url + Phase 1 16단계 |
| v1.5 (Phase 2) | 4팀 안정화 후 (5/22 이후 권장) | metadata JSONB + Quick §결제·연락처·BMI 마이그레이션 (2.7세션) |
| v2.0 | admin_v2 D-10 본격 가동 시 | metadata JSONB → 별도 3 테이블 분리 (1.5세션) |

---

## 🚨 Phase 1.5 즉시 흡수 결정 (옵션 Y' 채택, 2026-05-09 저녁) ⭐⭐

**5/9 오후 결정 ("Phase 1 동안 index 그대로, Phase 1.5는 5/15 후") 재고:**
- Step 5-C 본 빌드 + 라이브 테스트 → branches RLS FK 위반 발견
- 팀장님 지적 "시간지체할 필요 있냐"
- Code 큰 그림 재정독 + 옵션 X/Y'/Z 분석 → 옵션 Y' Code 추천 + 팀장님 채택

**변경 본질:**
- Step 5 (index.html 인라인 가입 폼) 마무리 보류 + Phase 1.5 home_v2 가입/로그인 통합 즉시 진입
- index.html 폐기 (redirect 페이지로 교체)
- 5/15 4팀 165명 오픈 = home_v2.html이 메인 진입로

**Sunk cost = 0:**
- Step 5-B (DB 신설) + Step 5-C (trigger 정정 + 4중 방어 로직 + 9역할 매핑)는 100% 재사용
- index.html 가입 폼 코드(434줄)도 home_v2.html로 이전

---

## 🗑️ Phase 1 폐기 / 재정의 대상 문서 (2026-05-07 메인 트랙 전환 동반)

| 문서 | 위치 | 사유 | 처리 |
|---|---|---|---|
| `20260418_board_tab_visibility.md` | `docs/deprecated/` | 4탭 구조 기반 (허브/팀/지점/보험사) → 2탭 전환 | 헤더 표시 + 폴더 이전 |
| `20260419_index_together_section.md` | `docs/deprecated/` | 구 권한 모델 가능성 | 헤더 표시 + 폴더 이전 |
| `supabase_schema.md` | `docs/deprecated/` | Phase 1 신규 컬럼 미반영 | 헤더 표시 + 폴더 이전 |
| `onesecond_phase1_definition_20260507.md` | `docs/deprecated/` | OS 정의 v2로 대체 | 헤더 표시 + 폴더 이전 |
| `00_MASTER.md` | `docs/deprecated/` | 4/20 작성본, MASTER 역할 = OS 정의 v2로 이전 | ✅ 폐기 헤더 + 폴더 이전 |
| `onesecond_context_update_20260419_evening.md` | `docs/deprecated/` | 4/19 세션 원본 — 명확한 구 컨텍스트 | ✅ 폐기 헤더 + 폴더 이전 |

**부재 문서:** `01_RULES_AND_STANDARDS.md` (진실 원천 명시 항목이나 본 PC + GitHub 부재)

**보존 대상:** `docs/sessions/` 인계 노트 5건 (4/25 / 4/28 / 5/4 / 5/5 / COWORK_ONBOARDING) — 이력 보존 대상

---

*상위 인덱스 [`_INDEX.md`](./_INDEX.md) | 다음: [`_INDEX_2_admin_v2.md`](./_INDEX_2_admin_v2.md) admin_v2 Phase A~E*
