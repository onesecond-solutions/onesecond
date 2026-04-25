# 스크립트 보강 SQL — 보류 중 (작성 2026-04-25)

> ⚠️ **이 폴더의 SQL은 아직 적용되지 않았습니다.**
> 5/6 베타 재출시 + 테이블 재작업 안정화 이후에 적용 예정.

## 작업 범위

| 파일 | 내용 | 연산 |
|---|---|---|
| `step1_search_optimization.sql` | 59개 전체 `title` + `highlight_text` 검색 최적화 | UPDATE |
| `step2_anonymize.sql` | 실명 익명화 3개 (id 5, 13, 21 — 김철민·강원래·이윤석·이병헌) | UPDATE (REPLACE) |
| `step3_stat_boost.sql` | `need_emphasis` 단계에 통계 박스 9개 추가 (출처 명기) | UPDATE (REPLACE) |
| `step4_new_scripts.sql` | 신규 스크립트 10개 (갱신형/리모델링/산정특례/종수술비/4세대 암치료/뇌혈관/허혈성심장/실비 세대/유병자/만기환급) | INSERT |
| `ALL_STEPS_MASTER.sql` | 위 4개 통합본 (한 번에 실행 시 사용) | 위 모두 |

대상 테이블: **`scripts`** (단일 테이블, 다른 테이블 의존 없음)
대상 컬럼: `id`, `title`, `highlight_text`, `script_text`, `top_category`, `stage`, `type`, `scope`, `is_active`, `is_leader_pick`, `is_sample`, `sort_order`

## 보류 사유

1. **테이블 컬럼 재작업 진행 중** — 컬럼 구조가 변경될 가능성. 작성된 SQL이 5/6 후 컬럼과 미스매치될 수 있음.
2. **5/6 베타 재출시 일정 우선** — 라이브 DB는 안정화 우선.
3. **사고 재발 방지** — DB 작업은 5/6 압박 없는 시점에 실행.

## 재개 시 체크리스트 (시간 순)

### 0단계 — 신버전 확인 (CLAUDE.md 최우선 규칙)
- [ ] Supabase Dashboard 좌상단 프로젝트명이 **`onesecond-v1-restore-0420`** 인지
- [ ] 또는 URL의 프로젝트 ID가 **`pdnwgzneooyygfejrvbg`** 로 시작하는지
- [ ] 둘 다 맞을 때만 다음 단계 진행

### 1단계 — 컬럼 구조 변경 여부 확인
- [ ] 5/6 베타 작업 동안 `scripts` 테이블 컬럼이 변경됐는지 확인
- [ ] `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'scripts' ORDER BY ordinal_position;`
- [ ] 위 12개 컬럼이 모두 존재하는지 + 추가/제거된 컬럼이 있는지
- [ ] **변경 있으면 SQL 재작성 후 진행. 강행 금지.**

### 2단계 — 영향받을 row 사전 검증 (precheck)
- [ ] Step 1·2·3 영향: `SELECT id, title, LEFT(highlight_text, 80) FROM scripts WHERE id IN (3,4,5,6,7,8,9,10,11,12,...);` (각 SQL의 WHERE id 모두 모아 한 번에 SELECT)
- [ ] 결과를 별도 CSV로 저장 (롤백 시 사용)

### 3단계 — 백업 (롤백 안전망)
- [ ] Supabase Dashboard → Table Editor → `scripts` → Export to CSV
- [ ] CSV를 본 폴더 같은 위치에 `backup_YYYYMMDD.csv`로 보관

### 4단계 — 실행
- [ ] `BEGIN;` 트랜잭션 안에서 한 Step씩 실행
- [ ] 각 Step 실행 후 영향 row 수 확인
- [ ] 모두 정상이면 `COMMIT;`, 이상하면 `ROLLBACK;`
- [ ] 권장 순서: `step1` → 검증 → `step2` → 검증 → `step3` → 검증 → `step4` → 최종 검증

### 5단계 — 사후 검증
- [ ] Step 1: title·highlight_text 변경 row 수 = 59
- [ ] Step 2: `SELECT id FROM scripts WHERE script_text LIKE '%김철민%' OR script_text LIKE '%강원래%' OR script_text LIKE '%이윤석%' OR script_text LIKE '%이병헌%';` → 0건이어야 함
- [ ] Step 3: `script_text LIKE '%📊 통계%'` 추가된 9개 row 확인
- [ ] Step 4: 신규 INSERT 10건 확인 (`SELECT COUNT(*) FROM scripts WHERE sort_order = 999;`)

## 5/6 이후 추가로 작성할 파일 (지금은 미작성)

- `00_precheck.sql` — 영향받을 row 한 번에 SELECT (위 2단계 자동화)
- `99_rollback.sql` — Step별 롤백 SQL (Step 1·2·3은 원본 값 복구, Step 4는 DELETE)

> 위 두 파일은 **컬럼 구조 변경 여부 확인 후 작성**해야 의미가 있음. 지금 미리 만들면 헛수고 가능성.

## 관련 문서

- 전체 보류 항목·우선순위: `docs/decisions/2026-04-25_holds_and_priorities.md` (보류 항목 #1)
- DB 작업 사고 방지 규칙: `CLAUDE.md` 최상단 "Supabase DB 작업 규칙"
