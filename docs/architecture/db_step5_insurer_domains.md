# Phase 1 Step 5-A 보강 — 31사 공식 도메인 캡처 raw

> **작성일:** 2026-05-09 오후
> **단계:** v2.0 원수사 입점 모델 Phase 1 / Step 5-A 보강 (D2-bis 결재 (가) 후속)
> **선행:** Step 5-A 사전 캡처 (`db_step5_pre_capture.md`, 31사 domain 전부 NULL 발견)
> **실행자:** Claude in Chrome (각 보험사 공식 사이트 + 채용·IR·공시 + 구글 검색)
> **목적:** 4중 방어 #1 도메인 화이트리스트 검증 데이터 진실 원천 보존
> **다음 단계:** Step 5-B 트랜잭션에 31사 UPDATE 박음 (✅ 27사 + ⚠️ 3사는 NULL 유지)

---

# § 1. 31사 raw 명단 (Chrome 회신 정합)

| # | slug | name | domain | 신뢰도 | 출처 요약 |
|---|---|---|---|---|---|
| 1 | abl | ABL생명 | `@abllife.co.kr` | ✅ | 공식 사이트 + 채용 담당자 (Byeonghyun.choi@abllife.co.kr, privacy@abllife.co.kr) |
| 2 | aia | AIA생명 | `@aia.com` | ✅ | 공식 사이트 + 채용 (kr.webmaster@aia.com, YunHee.Jang@aia.com) — **글로벌 본사 도메인** |
| 3 | aig-fire | AIG손해보험 | `@aig.com` | ✅ | 공식 사이트 + 채용 (kr.recruiting@aig.com, PilSeop.Kim2@aig.com) — **글로벌 본사 도메인** |
| 4 | bnp-cardif | BNP파리바 카디프생명 | `@cardif.co.kr` | ✅ | BNP파리바 공식 프레스 + HR (yoonha.kim@cardif.co.kr, hr@cardif.co.kr) |
| 5 | db-life | DB생명 | `@dblife.co.kr` | ⚠️ | 보험금 청구 (claim@dblife.co.kr) / 공식 사이트 직접 접근 불가 |
| 6 | db-fire | DB손해보험 | `@dbins.co.kr` | ✅ | 공식 공지 (mhpark@dbins.co.kr) / 공식 사이트: idongbu.com |
| 7 | ibk | IBK연금보험 | `@ibki.co.kr` | ✅ | 공식 사이트 ARS (22701477@ibki.co.kr) |
| 8 | im-life | iM라이프 | `@imlife.co.kr` | ⚠️ | 보험금 청구 (claim@imlife.co.kr) / 공식 사이트 접근 어려움 |
| 9 | kb-life | KB라이프 | `@kblife.co.kr` | ⚠️ | 공식 사이트 확인 / 직원 이메일 직접 노출 미확인. KB금융그룹 `@kbfg.com` 가능성도 |
| 10 | kb-fire | KB손해보험 | `@kbinsure.co.kr` | ✅ | 고객·민원·보험금 (cscenter@, claim@, consumer@kbinsure.co.kr) |
| 11 | kdb | KDB생명 | `@kdblife.co.kr` | ✅ | 채용·계리사회 (oj0092@, honghardy@kdblife.co.kr) |
| 12 | nh-life | NH농협생명 | `@nonghyup.com` | ✅ | 공식 민원 + 메타버스 (nhlife8085-1@nonghyup.com, eunsil@nonghyup.com) — **농협그룹 공통** |
| 13 | nh-fire | NH농협손해보험 | `@nonghyup.com` | ✅ | 공식 민원 + 채용 (nhfire8160-1@nonghyup.com, dj800080@nonghyup.com) — **농협그룹 공통** |
| 14 | kyobo | 교보생명 | `@kyobo.com` | ✅ | 지속경영보고서 + 중기부 (daeun.chung@, chungks@, tips@kyobo.com) |
| 15 | dongyang | 동양생명 | `@myangel.co.kr` | ✅ | 공식 사이트(myangel.co.kr) 개인정보처리방침 (privacy@myangel.co.kr) |
| 16 | lina-life | 라이나생명 | `@cigna.com` | ✅ | 채용 (HR_Korea@cigna.com, yoohee.yang@cigna.com) — **Cigna 글로벌** / 사이트: lina.co.kr |
| 17 | lina-fire | 라이나손해보험 | `@chubb.com` | ✅ | Chubb 한국 연락처 (Inquiries.KR@chubb.com) — **Chubb 그룹** / ⚠️ slug 명칭과 운영사 불일치 |
| 18 | lotte-fire | 롯데손해보험 | `@lotteins.co.kr` | ✅ | 모바일 사이트 전자민원 (csmaster@lotteins.co.kr) |
| 19 | meritz | 메리츠화재 | `@meritz.co.kr` | ✅ | 개인정보처리방침 (lawchung@meritz.co.kr) — **사이트(meritzfire.com)와 이메일 도메인 불일치** |
| 20 | metlife | 메트라이프 | `@metlife.com` | ✅ | 지속경영 + 채용 (mkim19@, hyunsuk.lim@, jwoo@metlife.com) — **글로벌 본사** |
| 21 | miraeasset | 미래에셋생명 | `@miraeasset.com` | ✅ | 공식 사이트 + 계리사회 (privacy@, hojin83@miraeasset.com) |
| 22 | samsung-life | 삼성생명 | `@samsunglife.com` | ✅ | 채용 + FC 공식 (kjt0701@, pr7425@samsunglife.com) |
| 23 | samsung-fire | 삼성화재 | `@samsung.com` | ✅ | 공식 IR (ir.samsungfire@samsung.com) — **삼성그룹 공통** |
| 24 | shinhan | 신한라이프 | `@shinhan.com` | ✅ | 신한금융그룹 IR + 스튜어드십 (shfg@, rehyeon@shinhan.com) — **신한그룹 공통** / 사이트: shinhanlife.co.kr |
| 25 | chubb | 처브라이프 | `@chubb.com` | ✅ | PR Newswire + 채용 (yoonsung.kook@, jobinfo.krlife@chubb.com) — **Chubb 글로벌** / 사이트: chubblife.co.kr |
| 26 | fubon-hyundai | 푸본현대생명 | `@fubonhyundai.com` | ✅ | 계리사회 구인 (yun@fubonhyundai.com) |
| 27 | hanwha-life | 한화생명 | `@hanwha.com` | ✅ | 공식 IR (teamir@, dkpark73@, hanwhalifefs@hanwha.com) — **한화그룹 공통** / 사이트: hanwhalife.com |
| 28 | hanwha-fire | 한화손해보험 | `@hanwha.com` | ✅ | 비즈노 + 샌드박스 + ESG (jongchul.kim@, hwgi.esg@, seohee.kang@hanwha.com) — **한화그룹 공통** |
| 29 | heungkuk-elife | 흥국생명 (e-life) | `@heungkuklife.co.kr` | ✅ | 계리사회 + 채용 (9139947@, sunmmin.kang@heungkuklife.co.kr) |
| 30 | heungkuk-tlife | 흥국생명 (T-Life) | `@heungkuklife.co.kr` | ✅ | **e-life와 동일 법인·사이트·도메인** |
| 31 | heungkuk-fire | 흥국화재 | `@heungkukfire.co.kr` | ✅ | 샌드박스 + 공시 (hkssyfire@heungkukfire.co.kr) |

**분포:**
- ✅ 확실: **28사** (도메인 INSERT 대상)
- ⚠️ 추정: **3사** (db-life / im-life / kb-life — NULL 유지, 사후 admin 보강)
- ❌ 미확인: 0사

---

# § 2. 위험 신호 매트릭스 (가입 흐름 영향)

## 2-1. 그룹사 공통 도메인 5사 (한 도메인 → 여러 회사)

| 도메인 | 매핑 보험사 | 처리 정책 |
|---|---|---|
| `@nonghyup.com` | nh-life + nh-fire | 그룹 직원 = 어느 자회사 선택해도 통과 |
| `@hanwha.com` | hanwha-life + hanwha-fire | 그룹 직원 = 어느 자회사 선택해도 통과 |
| `@samsung.com` | samsung-fire (samsung-life는 별도 `@samsunglife.com`) | 삼성화재 직원 = 그룹 공통, 삼성생명 직원 = 별도 |
| `@shinhan.com` | shinhan | 신한라이프 직원 = 그룹 공통 (사이트는 shinhanlife.co.kr) |
| `@chubb.com` | lina-fire (라이나손보) + chubb (처브라이프) | Chubb 그룹 직원 = 라이나손보 또는 처브라이프 선택 가능 |

**검증 정책 (Step 5-B RPC `complete_signup` 단계):**
- 사용자가 보험사 선택 → `WHERE id = $insurer_id AND domain = $email_domain` 매칭
- 같은 도메인 여러 row 허용 (insurers.domain 컬럼 = unique 제약 아님)
- 그룹 직원이 회사 선택 + 도메인 일치 시 통과

## 2-2. 외국계 글로벌 본사 도메인 5사

| slug | 글로벌 도메인 | 한국 사이트 |
|---|---|---|
| aia | `@aia.com` | aia.co.kr |
| aig-fire | `@aig.com` | aig.co.kr |
| lina-life | `@cigna.com` | lina.co.kr |
| lina-fire | `@chubb.com` | chubb.com/kr |
| chubb | `@chubb.com` | chubblife.co.kr |
| metlife | `@metlife.com` | metlife.co.kr |

**관찰:** 한국 지사별 별도 도메인 없음. 한국 직원도 글로벌 본사 도메인 사용.

## 2-3. 사이트 도메인 ↔ 이메일 도메인 불일치

| slug | 사이트 도메인 | 이메일 도메인 | 위험 |
|---|---|---|---|
| meritz | meritzfire.com | `@meritz.co.kr` | DB INSERT는 **이메일 도메인** (`@meritz.co.kr`) |
| shinhan | shinhanlife.co.kr | `@shinhan.com` | DB INSERT는 그룹 공통 (`@shinhan.com`) |
| nh-life | nhlife.co.kr | `@nonghyup.com` | DB INSERT는 그룹 공통 (`@nonghyup.com`) |
| nh-fire | nhfire.co.kr | `@nonghyup.com` | DB INSERT는 그룹 공통 (`@nonghyup.com`) |
| hanwha-life | hanwhalife.com | `@hanwha.com` | DB INSERT는 그룹 공통 (`@hanwha.com`) |
| hanwha-fire | hwgeneralins.com | `@hanwha.com` | DB INSERT는 그룹 공통 (`@hanwha.com`) |
| db-fire | idongbu.com | `@dbins.co.kr` | DB INSERT는 이메일 도메인 (`@dbins.co.kr`) |

→ **원칙:** DB의 `insurers.domain`은 **이메일 도메인**을 저장 (사이트 도메인 ≠ 이메일 도메인 가능).

## 2-4. 흥국생명 e-life ↔ T-Life 통합

- 두 slug = 동일 법인 (흥국생명보험㈜) + 동일 사이트 + 동일 도메인 (`@heungkuklife.co.kr`)
- Step 5-B 트랜잭션 = 둘 다 동일 도메인 UPDATE
- **별 트랙 #43 (신설):** 흥국 e-life / T-Life slug 통합 결재 — Phase 2 진입 시 `insurers` row 통합 또는 그대로 유지 결정

## 2-5. ⚠️ 추정 3사 NULL 처리 (Step 5-B에서 INSERT 안 함)

| slug | 추정 도메인 | 사유 |
|---|---|---|
| db-life | `@dblife.co.kr` (추정) | 보험금 청구 이메일만 노출, 직원 이메일 미확인 |
| im-life | `@imlife.co.kr` (추정) | 보험금 청구 이메일만 노출, 직원 이메일 포맷 미확인 |
| kb-life | `@kblife.co.kr` (추정) | 직원 이메일 미확인. KB금융그룹 `@kbfg.com` 가능성 |

→ **처리:** Step 5-B UPDATE 트랜잭션에서 **제외** (domain NULL 유지). 보험사 임직원 가입 시점에 admin이 사후 보강.
→ **별 트랙 #44 (신설):** 추정 3사 도메인 사후 검증 (영업·보험사 첫 입점 시점 raw 확인 후 admin이 UPDATE)

---

# § 3. Step 5-B 트랜잭션 영향 정리

## 3-1. 31사 UPDATE 분기 (Step 5-B SQL 박음)

```sql
-- Step 5-B 안에 박힐 28사 UPDATE 분기 (✅ 확실 + ⚠️ 추정 제외)
UPDATE insurers SET domain = '@abllife.co.kr'      WHERE slug = 'abl';
UPDATE insurers SET domain = '@aia.com'            WHERE slug = 'aia';
UPDATE insurers SET domain = '@aig.com'            WHERE slug = 'aig-fire';
UPDATE insurers SET domain = '@cardif.co.kr'       WHERE slug = 'bnp-cardif';
-- db-life: NULL 유지 (⚠️ 추정)
UPDATE insurers SET domain = '@dbins.co.kr'        WHERE slug = 'db-fire';
UPDATE insurers SET domain = '@ibki.co.kr'         WHERE slug = 'ibk';
-- im-life: NULL 유지 (⚠️ 추정)
-- kb-life: NULL 유지 (⚠️ 추정)
UPDATE insurers SET domain = '@kbinsure.co.kr'     WHERE slug = 'kb-fire';
UPDATE insurers SET domain = '@kdblife.co.kr'      WHERE slug = 'kdb';
UPDATE insurers SET domain = '@nonghyup.com'       WHERE slug = 'nh-life';
UPDATE insurers SET domain = '@nonghyup.com'       WHERE slug = 'nh-fire';
UPDATE insurers SET domain = '@kyobo.com'          WHERE slug = 'kyobo';
UPDATE insurers SET domain = '@myangel.co.kr'      WHERE slug = 'dongyang';
UPDATE insurers SET domain = '@cigna.com'          WHERE slug = 'lina-life';
UPDATE insurers SET domain = '@chubb.com'          WHERE slug = 'lina-fire';
UPDATE insurers SET domain = '@lotteins.co.kr'     WHERE slug = 'lotte-fire';
UPDATE insurers SET domain = '@meritz.co.kr'       WHERE slug = 'meritz';
UPDATE insurers SET domain = '@metlife.com'        WHERE slug = 'metlife';
UPDATE insurers SET domain = '@miraeasset.com'     WHERE slug = 'miraeasset';
UPDATE insurers SET domain = '@samsunglife.com'    WHERE slug = 'samsung-life';
UPDATE insurers SET domain = '@samsung.com'        WHERE slug = 'samsung-fire';
UPDATE insurers SET domain = '@shinhan.com'        WHERE slug = 'shinhan';
UPDATE insurers SET domain = '@chubb.com'          WHERE slug = 'chubb';
UPDATE insurers SET domain = '@fubonhyundai.com'   WHERE slug = 'fubon-hyundai';
UPDATE insurers SET domain = '@hanwha.com'         WHERE slug = 'hanwha-life';
UPDATE insurers SET domain = '@hanwha.com'         WHERE slug = 'hanwha-fire';
UPDATE insurers SET domain = '@heungkuklife.co.kr' WHERE slug = 'heungkuk-elife';
UPDATE insurers SET domain = '@heungkuklife.co.kr' WHERE slug = 'heungkuk-tlife';
UPDATE insurers SET domain = '@heungkukfire.co.kr' WHERE slug = 'heungkuk-fire';
```

**예상 결과:** 28 UPDATE 성공, 3 row (`db-life` / `im-life` / `kb-life`) NULL 유지.

## 3-2. 도메인별 row 수 (사후 검증용)

| 도메인 | row 수 | 매핑 보험사 |
|---|---|---|
| `@nonghyup.com` | 2 | nh-life + nh-fire |
| `@hanwha.com` | 2 | hanwha-life + hanwha-fire |
| `@chubb.com` | 2 | lina-fire + chubb |
| `@heungkuklife.co.kr` | 2 | heungkuk-elife + heungkuk-tlife |
| 그 외 21개 도메인 | 각 1 | 단일 매핑 |
| (NULL) | 3 | db-life + im-life + kb-life |

**총 31 row = 28 SET + 3 NULL ✅**

---

# § 4. 별 트랙 신설 (_INDEX.md 미해결 추가)

| 별 트랙 # | 후보 | 분리 사유 |
|---|---|---|
| **#43** | 흥국 e-life / T-Life slug 통합 (insurers row 통합 결재) | Phase 2 진입 시점 결재 |
| **#44** | ⚠️ 추정 3사 도메인 사후 검증 (db-life / im-life / kb-life) | 영업 트랙, 첫 입점 시점 raw 확인 |

---

# § 5. 본 캡처 사용 권한

본 파일은 **2026-05-09 오후 시점 31사 도메인 진실 원천 raw**. Chrome 회신 raw 그대로 보존 + Code 분석. Step 5-B 트랜잭션 진입 시 § 3-1 SQL 박음. 사후 도메인 변경 발견 시 admin이 직접 UPDATE + 본 파일 갱신.

진실 원천:
- `docs/architecture/db_step5_pre_capture.md` (Step 5-A 사전 캡처)
- `docs/specs/v2_step5_signup_form_workorder.md` (작업지시서, § 7-A D2-bis 결재 (가))
- `docs/specs/v2_insurer_admission_phase1_v2.md` (메인 spec § 1 + § 7-1)
- 메모리 `supabase_sql_editor_session_isolation.md`
