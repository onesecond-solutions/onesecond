# 실손 세대 DB화 파일럿 — 화면 전환 방식 설계 + 검수 항목

> **작성일:** 2026-07-07 (작업팀 / Claude Code)
> **성격:** 데이터 유기체 전환 **첫 파일럿**의 설계 문서. **구현 아님 — 방식 설계만.**
> **범위:** DB 실행 전(설계·원장) 단계. 화면(pages/silson·app.html) **무접촉.**
> **진실 원천:** `docs/strategy/organism_architecture_v1.md` · `docs/work_orders/2026-07-07_silson_generation_db_pilot.md`
> **동반 산출:** `docs/work_orders/2026-07-07_silson_generations_ledger.json`(5 row 원장) · `db/migrations/2026-07-07_silson_generations_schema.sql`(DDL DRAFT)

---

## 0. 지금까지 나온 것 (이번 세션 산출)

| 항목 | 파일 | 상태 |
|---|---|---|
| JSON 원장 (5 row) | `docs/work_orders/2026-07-07_silson_generations_ledger.json` | 완료 · 전 항목 `review_status='reviewing'` |
| DB 스키마 초안 | `db/migrations/2026-07-07_silson_generations_schema.sql` | 완료 · 상단 ⚠️ 실행 금지(DRAFT) |
| 화면 전환 설계 | 본 문서 | 완료 · 구현 X |

→ **다음 단계(별도 세션): 검수 → 신버전 프로젝트 확인 → DB DDL 실행 → 시드 → 화면 배선.** 이번 범위 아님.

---

## 1. 현재 하드코딩 위치 (전환 대상 확정)

| 위치 | 내용 | 라인 |
|---|---|---|
| `pages/silson-generations.html` | ① 변천사 표(8행×5세대) + ② 설명 + ③ 세대 카드 5장 + 세대별 심층 패널 5개 + 4vs5 비급여 비교표. **전량 하드코딩(약 250줄), fetch 0.** JS는 `sel(g)` 토글뿐. | 91-142(표), 156-250(카드·패널) |
| `app.html` | `#v-silson`이 위 파일을 **iframe으로 로드만** (`silson-frame`). 홈 카드 정의(6732), 사이드바 정의(5069), `VALID_VIEWS`(7108). | 3630-3631 |
| `app.html` | 5세대 실손 **mock 브로슈어 카드**(브랜드·월보험료 예시). 변천사 화면과 **별개의 홈 회전 mock**. 이번 파일럿과 직접 대상 아님 — 중복 정리 시 별도 확인. | 6479-6481 |

**핵심:** 실손 세대 화면은 iframe 격리(`pages/silson-generations.html`)라 **전환 표면이 이 한 파일에 고립**. 회귀 반경이 매우 좁음(파일럿 최적).

---

## 2. JSON 원장 구조 (요약 — 상세는 ledger.json)

- 5 row(gen 1~5). 지어내기 0 — 하드코딩 표·카드 값만 필드로 재배열.
- 판정용 경계일 `from`/`to`를 표시 텍스트(`range`)에서 명시 날짜로 정규화:
  - 1세대 `from:null`~`2009-09-30`, 2세대 `2009-10-01`~`2017-03-31`, 3세대 `2017-04-01`~`2021-06-30`, 4세대 `2021-07-01`~`2026-05-05`, 5세대 `2026-05-06`~`to:null`.
  - **경계 무겹침·무공백 검증됨**(각 세대 to+1일 = 다음 세대 from).
- 세대 축: 재가입주기·갱신주기·입원자기부담·통원공제·통원한도1일·입원한도연간·비급여구조·보험료할증·한줄정리 + notes(심층)·boundary_note·source.
- 2세대 `boundary_note`에 **2013-04-01 내부 분기**(재가입 유무) 유지 — 세대 판정과 별개의 하위 축.

---

## 3. DB 스키마 초안 (요약 — 상세는 schema.sql)

- 테이블 `silson_generations`. 원장 필드 1:1 매핑 + 게이트/메타.
- 게이트 컬럼 `status ∈ (draft/reviewing/approved/published)` + `published_at`. **approved/published만 화면·검색·스마트 설계서 노출.**
- 인덱스 2: `(status, sort_order)` 게이트 조회 / `(valid_from, valid_to)` 판정 범위 조회.
- RLS 초안: 읽기 = 게이트 통과분(비게이트분은 admin만) · 쓰기 = admin만. (goji·lineup 검수 게이트와 동일 원칙, `is_admin()` 재사용.)
- **시드 INSERT 미포함** — 스키마 초안만. 시드도 별도 검수 PR·실행 게이트.

---

## 4. 화면 조회 전환 방식 설계 (구현 X — 방식만)

### 4-1. 목표
`pages/silson-generations.html`의 하드코딩 표·카드를 **DB(`silson_generations`) 조회 → 동적 렌더**로 전환. **회귀 0**을 위해 조회 실패 시 기존 정적 HTML 폴백.

### 4-2. 전환 방식 (2단 안전 구조)

```
[정적 HTML(현행)]  ──보존──▶  기본 마크업으로 그대로 남김 (폴백 = 이것)
        │
        ├─ DOMContentLoaded 시 loadGenerations() 시도
        │     1) Supabase에서 status in (approved,published) row 조회
        │        select ... from silson_generations
        │        order by sort_order
        │     2) 성공(5 row) → 표 tbody / 카드 / 패널을 DB 값으로 재렌더(치환)
        │     3) 실패·0 row·타임아웃 → 아무것도 안 함(정적 HTML 그대로 노출) = 폴백
        │
        └─ 정렬 = sort_order ASC (1→5세대)
```

- **폴백 원칙:** DB 렌더는 기존 DOM을 **덮어쓰는 방식**이 아니라, 성공 시에만 교체. 실패 시 손대지 않음 → 화면이 비는 회귀 불가능.
- **iframe 격리 유지:** 전환 표면은 `pages/silson-generations.html` 내부 한정. `app.html`은 iframe src만 로드 → **app.html 무수정** 가능(파일럿 회귀 반경 최소).
- **Supabase 클라이언트:** iframe 문서에 anon 키로 읽기 전용 조회(RLS가 게이트 강제). 게이트 미통과 row는 애초에 안 내려옴.

### 4-3. 렌더 매핑 (DB 필드 → 현재 DOM)

| 현재 DOM | DB 필드 |
|---|---|
| 표 `thead` 세대 헤더 | `name` / `range_label` |
| 표 8개 `<tr>` (재가입주기…한줄정리) | 동명 8개 축 컬럼 |
| 세대 카드 `.gen` 5장 | `gen`·`name`·`range_label`·`one_liner`(요지) |
| 세대별 심층 패널 `.panel` | `notes`(심층) + 축 컬럼 조합 |

- 표는 **행(축) 기준 반복** — DB 5 row를 열로 펼침. 렌더 함수는 축 배열을 순회.
- 심층 패널의 세부 문구(설계사 전략 tip 등)는 `notes`에 문장으로 보존 → 초기엔 `notes` 통째 렌더, 이후 세분 필드화는 별도 세션.

### 4-4. 스마트 설계서 재사용 접점 (`judgeGen`)

- 홈 검색 보장분석/스마트 설계서가 **고객 실손 가입일 → 세대 판정**할 때 같은 원장 재사용:
  ```
  judgeGen(joinDate):
    row 중 (valid_from is null or joinDate >= valid_from)
        and (valid_to is null or joinDate <= valid_to) 인 세대 반환
  ```
- 판정 로직이 화면 표와 **동일 `valid_from/valid_to`를 참조** → 표와 판정이 영원히 일치(하드코딩 이중관리 제거). 이것이 유기체 §7 "같은 row, 6개 화면"의 실체.
- 참고: 현재 리포엔 `judgeGen`/`GEN_DEF` 미존재(별도 보장분석 시안 자료). 세대 DB가 서면 그 시안도 이 원장을 조회하도록 배선 = 별도 트랙.

### 4-5. 롤백 방법 (회귀 0 보증)
1. **조회 실패 시 자동 폴백** — 정적 HTML 그대로(설계상 기본값).
2. **게이트 플래그 off** — row `status`를 approved 미만으로 내리면 화면에서 사라지고 폴백.
3. **테이블 drop** — 신규 테이블·신규 조회 경로라 기존 화면 무영향(iframe src 불변).

---

## 5. 검수 항목 (다음 단계 = DB 실행 전 게이트)

### 5-1. 원장 5 row 정확성 (하드코딩 대조)
- [ ] 세대 경계일 `valid_from/valid_to` 5쌍 — 표 헤더 기간과 일치 + 세대 간 무겹침·무공백(to+1=다음 from)
- [ ] 입원 자기부담률 수치(20%/30%/50% 등) 세대별 정확
- [ ] 통원 공제·통원 한도·입원 한도 수치 세대별 정확
- [ ] 비급여 구조(통합/3대분리/전체분리/중증·비중증) 세대별 정확
- [ ] 보험료 할증(4세대 최대 300%, 5세대 차등강화) 정확
- [ ] 2세대 `boundary_note` 2013-04-01 내부 분기 유지 확인
- [ ] 출처(`source`) 문구 보존

### 5-2. 화면 렌더 정합 (DB 렌더 = 현행 정적)
- [ ] 표 8행×5열 값이 현행 하드코딩과 1:1 일치
- [ ] 세대 카드 5장·심층 패널 5개 텍스트 정합
- [ ] 4세대 vs 5세대 비급여 비교표 정합
- [ ] `sel(g)` 토글·초기 5세대 펼침 동작 유지

### 5-3. 세대 판정(`judgeGen`) 경계 케이스
- [ ] 2009-09-30(1세대) / 2009-10-01(2세대) 경계
- [ ] 2017-03-31(2세대) / 2017-04-01(3세대) 경계
- [ ] 2021-06-30(3세대) / 2021-07-01(4세대) 경계
- [ ] 2026-05-05(4세대) / 2026-05-06(5세대) 경계 ← 핵심 분기
- [ ] 하한 null(아주 오래된 가입일 → 1세대) / 상한 null(오늘 → 5세대)

### 5-4. 게이트·권한
- [ ] approved/published 아닌 row는 화면·검색에 미노출 확인
- [ ] 쓰기 RLS = admin만
- [ ] 조회 실패 시 정적 HTML 폴백 실동작(회귀 0)

---

## 6. 다음 단계 (이번 범위 밖 — 순서)

1. **검수** — 위 §5 체크리스트로 5 row·경계·게이트 확인 (대표/검수팀)
2. **신버전 프로젝트 확인** — `pdnwgzneooyygfejrvbg`(onesecond-v1-restore-0420) 확인 후에만 DB 작업
3. **DDL 실행** — `db/migrations/2026-07-07_silson_generations_schema.sql` PR 검수 후 실행
4. **시드 INSERT** — 원장 5 row를 `status='reviewing'`로 적재 → 검수 → approved/published 승격 (별도 PR·실행 게이트)
5. **화면 배선** — `pages/silson-generations.html`에 §4 조회 렌더 + 폴백 구현 (별도 PR·Deploy Preview 검수)
6. **스마트 설계서 접점** — 보장분석 시안 `judgeGen`이 같은 원장 조회하도록 배선 (별도 트랙)

> 이번 세션은 1~6 **착수 전 설계·원장**까지. DB 실행·화면 수정은 **하지 않음.**
