# Storage RLS 전수 sweep 작업지시서 (별 트랙 #25)

> **작성일:** 2026-05-05 (D-9 Step 1.6 옵션 B 분기로 신설)
> **작성자:** Claude Code
> **선행 산출물:**
> - D-9 Step 1 capture: `docs/architecture/db_d9_step1_capture.md` (§ 2 발견 #3 후속 + § 5 영구 학습 #1)
> - D-pre.8 sweep capture: `docs/architecture/db_pre_dpre8_capture.md`
> - D-9 Step 1.6 의뢰서 ③ Step A 회신 (3개 버킷 + 6 정책 raw)
> **상태:** 🟡 별 트랙 등록 + 5/12 슬롯 권장 (admin Phase D 잔여 ~5.9세션과 병렬 가능)
> **우선순위:** 중간 — 5/15 4팀 오픈 직전 보안 부채 청산 필수

---

## 0. 큰 그림 정합성 검증

### 배경

D-pre.8 sweep (2026-05-03) = public schema 인라인 EXISTS 청산 표준화. 그러나 **storage.objects RLS는 sweep 범위 밖** — 옛 v1 시점 정책이 그대로 잔존:

1. `Allow authenticated uploads 1apfxtf_0` (INSERT, with_check=true) — 모든 버킷 INSERT 허용 (모든 9역할이 어느 버킷에든 업로드 가능)
2. `Allow public read 1apfxtf_0` (SELECT, qual=true) — 모든 버킷 SELECT 허용 (anon 읽기)
3. ~~admin can delete/update/upload banners~~ — D-9 Step 1.6 (DROP 3 + CREATE 3, is_admin() 가드 추가) 후 정합

### D-9 Step 1.6 옵션 B 채택 후 잔여 부채

D-9 Step 1.6 = onesecond_banner admin 3정책만 청산. 본 작업지시서 = **나머지 2버킷 INSERT 정책 + 범용 정책 폐기** 청산.

### 영향 범위 (Step 1.6 의뢰서 ③ Step A 회신, 2026-05-05)

| 버킷 | public | created_at | INSERT 의존 정책 | 신설 필요 정책 |
|---|---|---|---|---|
| `library_files` | false | 2026-04-07 18:40 | 범용 정책 (with_check=true) — 유일 INSERT | 사용자 자기 폴더 INSERT 정책 1건 + admin 전체 INSERT 정책 1건 |
| `onesecond_banner` | true | 2026-04-16 05:06 | admin 3정책 (D-9 Step 1.6 청산 완료) | — |
| `board_attachments` | true | 2026-04-16 09:47 | 범용 정책 (with_check=true) — 유일 INSERT | 사용자 자기 폴더 INSERT 정책 1건 + admin 전체 INSERT 정책 1건 |

**범용 정책 폐기 = 두 버킷 업로드 차단 → 정책 신설 필수.**

---

## 1. 작업 범위 (4 Step)

### Step 1 — 옛 v1 코드 raw 검토 (~0.3세션)

**목적:** library_files / board_attachments 업로드 코드의 폴더 패턴 raw 확인 → 신설 정책 설계 정합

**검토 대상:**
- `pages/myspace.html` 또는 `js/myspace.js` — library_files 업로드 코드 (자료 자산화 관련)
- `pages/board.html` 또는 `js/board.js` — board_attachments 업로드 코드 (게시판 첨부)
- `_archive/admin_v1_20260430.html` — 옛 v1 업로드 함수 라인

**확인 항목:**
1. 업로드 시점 폴더 path 패턴 (예: `<bucket>/<user_id>/<filename>` vs `<bucket>/<post_id>/<filename>` vs `<bucket>/<filename>` 평면)
2. 사용자 권한 — 9역할 모두 가능 vs 특정 role만 가능
3. 옛 v1 운영 시점 실제 업로드된 파일 raw (Storage Dashboard SELECT)

### Step 2 — 정책 결재 (~0.1세션)

**결재 항목:**

| # | 항목 | 옵션 | Code 권장 |
|:--:|---|---|---|
| **R-1** | library_files INSERT 권한 | (a) authenticated 9역할 모두, 자기 user_id 폴더만 / (b) 특정 role만 / (c) admin only | (a) — 일반 사용자 자료 업로드 표준 패턴 |
| **R-2** | board_attachments INSERT 권한 | (a) authenticated 9역할 모두, 자기 user_id 폴더만 / (b) 게시판 작성 권한 있는 role만 / (c) authenticated 모두 평면 폴더 | (a) — 게시판 첨부 표준 패턴 |
| **R-3** | library_files SELECT 권한 (private 버킷) | (a) 본인 자료만 read / (b) admin + 본인 / (c) signed URL 통한 일시 read | (b) — admin 운영 + 본인 권한 |
| **R-4** | board_attachments SELECT 권한 (public 버킷) | (a) Public read 그대로 / (b) authenticated only / (c) 본인 + admin | (a) — public read 의도된 운영 |
| **R-5** | UPDATE / DELETE 권한 | (a) 본인 + admin / (b) admin only | (a) — 본인 자료 관리 자유도 |
| **R-6** | 폴더 path 표준 | (a) `<user_id>/<filename>` / (b) `<user_id>/<timestamp>_<filename>` / (c) 옛 v1 패턴 그대로 | Step 1 raw 검토 후 결정 |

### Step 3 — 트랜잭션 신설 (~0.1세션, Chrome 위임)

**SQL preview (Step 1·2 후 확정):**

```sql
BEGIN;

-- DROP 1: 범용 정책 폐기
DROP POLICY IF EXISTS "Allow authenticated uploads 1apfxtf_0" ON storage.objects;

-- CREATE 4 (R-1 ~ R-5 결재 결과 기반, 추정):
-- 1) library_files 사용자 자기 폴더 INSERT
CREATE POLICY "library_files user upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'library_files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2) library_files 본인 SELECT/UPDATE/DELETE + admin
CREATE POLICY "library_files user manage" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'library_files'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
)
WITH CHECK (
  bucket_id = 'library_files'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
);

-- 3) board_attachments 사용자 자기 폴더 INSERT
CREATE POLICY "board_attachments user upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'board_attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4) board_attachments 본인 UPDATE/DELETE + admin (SELECT는 public 보존)
CREATE POLICY "board_attachments user manage" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'board_attachments'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
)
WITH CHECK (
  bucket_id = 'board_attachments'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
);

-- 사후 검증: 정책 N건 정합
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname='storage' AND tablename='objects'
ORDER BY policyname;

-- 정합 시 COMMIT, 비정합 시 ROLLBACK
COMMIT;
```

### Step 4 — 라이브 회귀 검증 (~0.1세션)

**Chrome 위임 검증 항목:**
- myspace 자료 업로드 (사용자 9역할 1명 — 자기 user_id 폴더 → INSERT 통과)
- 다른 user_id 폴더 시도 (RLS 거부 → INSERT 실패)
- 게시판 첨부 업로드 동일 패턴
- admin 본인 모든 버킷 INSERT/UPDATE/DELETE 통과
- public can view banners + Allow public read 보존 회귀

---

## 2. 슬롯 / 스케줄

### 권장 슬롯: 5/12 (화) — alarm system v1.1 작업 슬롯과 병렬 가능 검토

| 일자 | 본 트랙 진입 가능성 | 비고 |
|---|---|---|
| 5/6 (수) | ❌ | 카톡 → 원세컨드 마이그레이션 본질 (4팀 165 파일) |
| 5/7 (목) | 🟡 | D-9 Step 1.6 + 별 트랙 #A PITR 병렬 진입 슬롯 — 본 트랙 후순위 |
| 5/8 (금) | 🟡 | D-9 Step 2~5 마무리 — 본 트랙 후순위 |
| 5/9~10 (주말) | 🟡 | UI 스케일 / Sticky Nav / Safari backdrop-filter — 본 트랙 후순위 |
| 5/11 (월) | 🟡 | 버퍼 / D-9 마무리 또는 별 트랙 정리 + 알림 시스템 v1.1 분할 spec 작성 |
| **5/12 (화)** | ⭐ **본 트랙 진입 권장** | v1.1 출시 안정화 골든타임 / index hero / team4 vault Phase 1 + 별 트랙 #B Sentry — 병렬 가능 |
| 5/13~14 (수목) | 🟡 | D-7 + D-8 + 별 트랙 #C Playwright — 병렬 후순위 |
| 5/15 (금) | 🛑 | 4팀 오픈 — 본 트랙 진입 차단 |

### 추정 진행량

| Step | 추정 | 비고 |
|---|---|---|
| Step 1 옛 v1 코드 raw 검토 | 0.3세션 | myspace + board 업로드 코드 raw + Storage Dashboard 실 파일 패턴 |
| Step 2 정책 결재 (R-1 ~ R-6) | 0.1세션 | 6항목 결재 |
| Step 3 트랜잭션 (Chrome 위임) | 0.1세션 | 의뢰서 신설 + 회신 |
| Step 4 라이브 회귀 검증 | 0.1세션 | 회귀 의뢰서 신설 + Chrome 위임 |
| **합계** | **~0.6세션** | 5/12 단일 일자 진행 가능 |

---

## 3. 진입 차단 조건

본 트랙 5/12 진입 직전 다음 중 하나라도 발견 시 **즉시 차단** + 우선순위 격상:

- 라이브 운영에서 myspace 자료 업로드 또는 게시판 첨부 회귀 발견 (admin 외 사용자 업로드 불가 등)
- D-9 Step 1.6 청산 후 onesecond_banner 운영 회귀 발견
- 5/12 시점 admin Phase D 잔여 견적 1세션 미만으로 줄어들면 본 트랙 5/11 진입으로 앞당기기

---

## 4. 영구 학습 영구 등록 후보

본 트랙 완료 후 메모리 등록 후보:

### 등록 #1 (D-pre.8 sweep 영구 표준 갱신)

D-pre.8 sweep 표준 = public schema 인라인 EXISTS만 → **public schema + storage.objects 두 영역 모두** 갱신.

→ 메모리 `rls_self_reference_avoidance.md` 보강 + `storage_rls_standard.md` 신규 등록.

### 등록 #2 (Storage RLS 표준 패턴)

| 케이스 | 표준 패턴 |
|---|---|
| admin only 버킷 | `bucket_id = '<bucket>' AND public.is_admin()` |
| public read + admin write 버킷 | SELECT public + admin INSERT/UPDATE/DELETE |
| 사용자 자기 폴더 + admin | `(storage.foldername(name))[1] = auth.uid()::text OR public.is_admin()` |
| 평면 사용자 업로드 | 권장 X — 폴더 패턴 강제 |

→ 새 버킷 신설 시 표준 패턴 강제 (작업지시서 보일러플레이트 등록).

### 등록 #3 (트랜잭션 사전 검증 표준)

Storage RLS 트랜잭션은 항상 § Step A 사전 검증 = 모든 버킷 raw + 모든 storage 정책 raw 1쌍 필수.

→ Step 1.6 의뢰서 패턴 정합 (사전 검증 → 영향 범위 → 트랜잭션 → 사후 검증 → ROLLBACK 옵션).

---

## 5. 산출물 위치

### 신설 (5/12 진입 시)

- `docs/architecture/storage_rls_pre_sweep_capture.md` (Step 1 옛 v1 코드 raw 검토 결과)
- `docs/specs/storage_rls_full_sweep_chrome_request_<날짜>.md` (Step 3 Chrome 위임 트랜잭션 의뢰서)
- `docs/specs/storage_rls_full_sweep_live_regression_<날짜>.md` (Step 4 라이브 회귀 의뢰서)
- `docs/architecture/storage_rls_full_sweep_capture.md` (전체 결과 raw 누적)

### 갱신

- `docs/sessions/_INDEX.md` 미해결 #25 → 완료 처리
- `CLAUDE.md` Supabase DB 작업 규칙 § 보강 (Storage RLS 표준 패턴 추가)

---

*본 작업지시서는 D-9 Step 1.6 옵션 B 채택 후 잔여 보안 부채 청산을 별 트랙으로 분리. 5/12 슬롯 진입 권장. 진입 직전 Step 1 코드 raw 검토 + Step 2 결재 후 본 진입.*
