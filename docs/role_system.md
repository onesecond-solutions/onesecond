# 원세컨드 role 체계 정의

> **작성일:** 2026-04-24
> **상태:** Phase 1 설계 확정 / 실제 마이그레이션 팀장님 승인 대기
> **목적:** v2.0 원수사 입점 대비 role 체계 확장. 소속(GA vs 원수사)을 role 이름에 접두어로 박아 코드·RLS·영업 설명 모두 직관화.

---

## 1. 최종 role 전체 맵

### 플랫폼 최상위 — 접두어 없음

| role | 현장 호칭 | 권한 성격 |
|---|---|---|
| `admin` | 어드민 | 플랫폼 전체 관리자 (팀장님 본인 전용, 전역 권한) |

### GA 소속 — `ga_` 접두어

| role | 현장 호칭 | 권한 성격 |
|---|---|---|
| `ga_branch_manager` | 지점장/센터장 | GA 지점 단위 관리자 |
| `ga_manager` | 실장 | GA 중간 관리자 |
| `ga_member` | 설계사/팀장 | GA 일반 사용자 (팀장은 직책일 뿐 role은 member) |
| `ga_staff` | 스텝/총무 | GA 지점 행정 지원 |

### 원수사 소속 — `insurer_` 접두어

| role | 현장 호칭 | 권한 성격 |
|---|---|---|
| `insurer_branch_manager` | 원수사 지점장 | 원수사 전용 게시판 관리자 · 소속 설계사 관리·공지 게시 |
| `insurer_manager` | 원수사 매니저 | 원수사 본사/영업 지원 담당 · 전용 게시판 쓰기 + 리포트 열람 |
| `insurer_member` | 원수사 일반 직원 | 원수사 내부 일반 사용자 · 전용 게시판 읽기 중심 |
| `insurer_staff` | 원수사 스텝 | 원수사 행정 지원 · 게시판 읽기 + 자료 업로드 |

**총 9개** (admin 1 + GA 4 + insurer 4)

---

## 2. 접두어 설계 원칙

- **`admin`**: 접두어 없음. 플랫폼 운영자(원세컨드 운영)가 GA·원수사 위에 위치하는 최상위 역할이므로 조직 소속을 표시하지 않음.
- **`ga_`**: GA(General Agency=보험대리점) 소속. 현재 AZ금융 더원지점 4팀이 해당. 향후 타 GA 입점 시에도 `ga_` 접두어 공유.
- **`insurer_`**: 원수사(보험회사 본사/지점) 소속. 삼성생명, 교보, 메리츠화재, 흥국화재 등. v2.0 월 100만원 입점 영업 대상.

---

## 3. 기존 5개 role에서의 마이그레이션

현재 신버전 DB(`pdnwgzneooyygfejrvbg`) `public.users` 21건 기준:

| 기존 role | 신규 role |
|---|---|
| `admin` | `admin` (변경 없음) |
| `branch_manager` | `ga_branch_manager` (2건: 브랜치테스트, 브랜치테스트02) |
| `manager` | `ga_manager` |
| `member` | `ga_member` (대부분의 row) |
| `staff` | `ga_staff` |

### 마이그레이션 SQL 초안 (실행 전 팀장님 승인 필수)

```sql
UPDATE public.users SET role = 'ga_branch_manager' WHERE role = 'branch_manager';
UPDATE public.users SET role = 'ga_manager'        WHERE role = 'manager';
UPDATE public.users SET role = 'ga_member'         WHERE role = 'member';
UPDATE public.users SET role = 'ga_staff'          WHERE role = 'staff';
-- admin은 변경 없음
```

---

## 4. `admin` vs `ga_branch_manager` — 절대 혼동 금지

### `admin` — 플랫폼 최상위
- 팀장님 본인 1명 (`bylts0428@gmail.com`)
- 모든 화면·모든 기능·모든 소속(GA/원수사) 데이터 접근
- `applyMenuSettings` 화면설정 **"무시 대상"**

### `ga_branch_manager` — GA 지점장
- AZ금융 지점장/센터장
- 본인 소속 GA 데이터만 접근. 원수사 데이터 접근 불가
- `applyMenuSettings` 화면설정 **"일반 설계사와 동일 적용"**
- 무료 혜택 대상 (매니저 이상 무료)

### `insurer_branch_manager` — 원수사 지점장
- 해당 원수사 전용 게시판 관리자
- 타 원수사·GA 데이터 접근 불가
- 원수사 계약(월 100만원) 기반 입점

> 세 role은 "지점장" 호칭이 겹칠 수 있지만 완전히 다른 권한군. 코드·설명에서 **절대 "지점장" "관리자"로 뭉뚱그리지 말 것.**

---

## 5. RLS 정책 작성 패턴 (접두어 활용)

### 예시 1: 원수사 전용 게시판은 원수사 계정만 접근

```sql
CREATE POLICY insurer_board_access ON public.posts
FOR SELECT USING (
  board_type = 'insurer'
  AND auth.jwt() ->> 'role' LIKE 'insurer_%'
);
```

### 예시 2: GA 전용 자료실은 GA 계정과 admin만 접근

```sql
CREATE POLICY ga_library_access ON public.library
FOR SELECT USING (
  auth.jwt() ->> 'role' LIKE 'ga_%'
  OR auth.jwt() ->> 'role' = 'admin'
);
```

### 예시 3: 관리자급(지점장·매니저) 쓰기 권한

```sql
USING (
  auth.jwt() ->> 'role' IN (
    'admin',
    'ga_branch_manager', 'ga_manager',
    'insurer_branch_manager', 'insurer_manager'
  )
)
```

---

## 6. 화면설정(`applyMenuSettings`) 무시 대상

- **무시 대상**: `admin` 만
- **적용 대상**: 나머지 role 전부 (`ga_*`, `insurer_*`)

> **주의 (2026-04-23 정정):** "admin + branch_manager 둘 다 무시"는 오기록이었음. 현재 코드는 `admin`만 예외. 신규 role 확장 시에도 동일 원칙.

---

## 7. 무료 혜택 대상 (월 9,900원 면제)

- **무료 혜택**: `admin`, `ga_branch_manager`, `ga_manager`, `insurer_branch_manager`, `insurer_manager`
- **유료 대상**: `ga_member`, `ga_staff`, `insurer_member`, `insurer_staff`

**원칙:** "매니저 이상 무료". `ga_staff`/`insurer_staff`는 직급상 매니저 미만이므로 유료 대상. 필요 시 원수사 계약으로 면제 가능(v2.0 교차 보조).

---

## 8. 구현 순서 제안

### Phase 1 (즉시): `ga_` 접두어 마이그레이션
1. `public.users` 21건 `role` 컬럼 UPDATE
2. `js/auth.js`·`app.html`·`applyMenuSettings` 등 role 체크 코드 `ga_` 접두어 반영
3. 기존 RLS 정책의 role 문자열 업데이트
4. 검증: 팀장님 admin 계정 정상 동작 + 테스트 계정별 권한 확인

### Phase 2 (주말 C 작업 이후): `insurer_` role 추가
1. `insurer_branch_manager`, `insurer_manager`, `insurer_member`, `insurer_staff` 4개 role ENUM 추가
2. 원수사별 `organization_id` 컬럼 추가
3. 원수사 전용 게시판 RLS 정책 작성
4. 첫 원수사 입점 파일럿 시 실계정 생성

---

## 9. 팀장님 승인 필요 항목 (진행 전 확인)

- [ ] Phase 1 마이그레이션 SQL 실제 실행 시점 (주말 C 작업과 병합 여부)
- [ ] `ga_` 접두어 반영 시 기존 코드에서 하드코딩된 role 문자열 전체 grep 결과 공유
- [ ] Phase 2 `insurer_` 4개 role은 DB에 ENUM으로 정의할지, text 컬럼 + CHECK 제약으로 둘지 결정

---

*본 문서는 2026-04-24 팀장님 지시로 확정된 role 체계의 단일 진실 원천이다. 변경 필요 시 반드시 팀장님 승인 후 이 문서와 `CLAUDE.md`를 동시에 업데이트한다.*
