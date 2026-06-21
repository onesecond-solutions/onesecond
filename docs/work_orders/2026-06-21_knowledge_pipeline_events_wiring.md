# 지식 생산라인 이벤트 원장 배선 (knowledge_pipeline_events) — 작업지시 박제

> 2026-06-21 대표님 결재(A 방향). 진실원천. 자동 approved·cron·대량 채굴 계속 금지.
> 이번 PR = **마이그레이션 + RPC 설계까지만**. DB 실행 전 다시 보고(대표님 §6).

## 큰 그림 — 하나의 생산라인이 4화면에 역할별 연결

```
mine-batch 실행
 → mined / held / hard_failed 이벤트
 → ai_draft 검수큐 노출
 → 지식창고 현황 자동 집계
 → 학습일지에 채굴·판정 이력 자동 기록
 → 사람 승인 (RPC)
 → approved 이벤트
 → 지식엔진 검색 자동 반영 (approved 만)
```

"채굴 즉시 4곳 동일 상태 공개"가 아니라, **각 화면이 역할별로 다른 것을 읽는다.**

## 테이블 분리 (대표님 §5)

| 테이블 | 역할 | 입도 | 이번 작업 |
|---|---|---|---|
| `knowledge_logs` | 과거 배치 요약 기록 | run 단위 | **보존**(손대지 않음) |
| `knowledge_pipeline_events` | 신규 생산라인 감사 원장(append-only) | 이벤트 단위 | **신설** |
| `knowledge_mining_state` | 원천 단위 멱등 마커(현재상태 upsert·재채굴 방지) | source 단위 | 유지(역할 다름) |

## 확정 자료형 (대표님 §1 — 실제 스키마 확인 완료)

| 컬럼 | 자료형 | 근거 |
|---|---|---|
| `knowledge_entry_id` | **bigint** + FK → knowledge_entries(entry_id) ON DELETE SET NULL | entry_id=bigserial |
| `source_id` | **text** (폴리모픽) | newsletters.id=uuid · posts.id=bigint → text 유일 정합 |
| `actor_id` | **uuid** = auth.uid() = public.users.id | shares.from_user 전례 · `profiles` 없음 |
| `from/to_status` | text, CHECK ai_draft/approved/hold/discarded | 2026-06-06_review CHECK와 통일 |

★ 단, 적용 전 Dashboard에서 STEP 0 검증 쿼리로 newsletters.id=uuid / posts.id=bigint 재확인.

## 4화면 실제 배선표 (현재 → 목표)

| 화면 | 읽는 대상 | 상태 |
|---|---|---|
| 지식창고 | knowledge_entries **status별 count** (ai_draft/hold/discarded/approved) | 완료(#867) |
| 검수큐 | knowledge_entries **status** = ai_draft/approved/hold/discarded | 유지 |
| 학습일지 | (현재)knowledge_logs → (목표)**2영역**: 신규=knowledge_pipeline_events / 과거=knowledge_logs | 배선 대상 |
| 지식엔진 검색 | knowledge_entries **status='approved'** (app.html:9412·9531) | 유지(안전장치) |

보충: 검색 게이트는 현재 `status=approved` 단일. `lifecycle_status`(current/archive)는 저장되나 검색 필터 미사용 → 향후 `approved AND lifecycle_status='current'` 좁히기 별도 제안(이번 범위 아님).

## 이벤트 타입 (대표님 §3)

`mined · held · hard_failed · skipped · approved · review_held · discarded · reprocessed`
- DB 상태명 = `ai_draft · hold · approved · discarded` (코드와 통일)
- `hard_failed` = 적재 차단 결과 → `knowledge_entry_id=null`, `source_id`+`batch_id`로 추적

## 복합 사유 보존 (대표님 §1 — 2차 결재)

`reason_code text`(단일) → **`reason_codes text[] not null default '{}'`**.
- mine-batch 복합 사유를 단일 대표코드로 축소하지 않고 **배열로 전체 보존**. 예: `['diff_warning','numeric_ambiguity']`, `['pii_warning','source_missing']`, `['admin_hold','numeric_ambiguity']`.
- 배열 모든 원소가 화이트리스트만 허용: `CHECK (reason_codes <@ array[...]::text[])`.
- 화면은 대표 사유 1개만 표시할 수 있으나, 원장에는 전체 보존.
- mine-batch writer(3단계)가 현재 복합 문자열(`"uncertainty:source_missing"` 등)을 깨끗한 코드 배열로 매핑.

## 이벤트 멱등성 (대표님 §2 — 2차 결재)

`idempotency_key text not null` + `UNIQUE`. 재시도 시 중복 INSERT 0.
- mine: `mine:{batch_id}:{source_type}:{source_id}:{event_type}`
- review: `review:{entry_id}:{from_status}:{to_status}`
- reprocess: `reprocess:{entry_id}:{batch_id}`
- writer/RPC = `on conflict (idempotency_key) do nothing`.

## 검수 원자성 (대표님 §2·§3)

`review_knowledge_entry(p_entry_id, p_action, p_note, p_reason_codes[])` RPC 1콜:
- knowledge_entries 상태 변경 + 이벤트 INSERT = **같은 트랜잭션** 성공/실패
- `actor_type='admin'`, `actor_id=auth.uid()` RPC 내부 강제 (클라이언트 임의 입력 불가)
- `SECURITY DEFINER` + `SET search_path=public` + `is_admin()` 가드 + `for update` 행 잠금
- `revoke all from public` + `grant execute to authenticated`(내부 is_admin로 admin만 통과)
- 멱등: 이미 목표 상태면 무동작 / 이벤트 `on conflict do nothing`
- 자유서술 사유(p_note) → `knowledge_entries.review_note`에만. 원장엔 `reason_codes`(코드 배열)만.

## 상태 전환표 (대표님 §4) — RPC 내부 제한

| from \ to | approved | hold | discarded |
|---|---|---|---|
| **ai_draft** | ✓ | ✓ | ✓ |
| **hold** | ✓ | — | ✓ |
| **approved** | (역전 금지) | (역전 금지) | (역전 금지) |
| **discarded** | (역전 금지) | (역전 금지) | (역전 금지) |

- approved 역전 = 일반 검수 RPC **금지**. 재검수·재처리는 **별도 명시 액션(reprocessed)** 으로만.
- 허용 외 전환 = `raise exception 'illegal_transition'`.

## 직접 PATCH 차단 (대표님 §5 — 1·2차)

현재 knowledge_entries RLS = `kentries_admin FOR ALL is_admin` → **admin이 이벤트 없이 status 직접 UPDATE 가능(우회 경로)**.

**방어선 2겹:**
1. **1차(주)** = authenticated 의 `knowledge_entries.status` 직접 UPDATE 권한 제거 + UPDATE RLS 정책 점검.
2. **2차(최종)** = `kpe_guard_status_change()` BEFORE UPDATE 트리거.

**트리거 허용 조건 = 다음 2가지 모두 충족(세션 플래그 단독 신뢰 금지):**
- `current_setting('app.kpe_via_rpc', true) = 'on'` (RPC가 세션-로컬 설정)
- `current_user = review_knowledge_entry 함수의 실제 소유자` (SECURITY DEFINER 함수 본문의 UPDATE만 소유자로 실행됨 / 소유자명은 런타임 `pg_proc` 조회, 추정 금지)
- 트리거는 **SECURITY INVOKER**(definer면 current_user가 트리거 소유자로 고정돼 조건2 무력화).

**STEP 0 확정값(2026-06-21):** 테이블·함수 소유자 = **postgres**(트리거 `current_user=소유자` 비교 기준). 자료형 4/4 일치. ⚠️ **anon·authenticated 둘 다 knowledge_entries UPDATE 권한 보유**(현재 RLS is_admin로 차단 중이나 6단계 제거 대상). status=914 approved 불변.

**배선 6단계에서 함께 점검(우회 경로 0 확인):**
- **authenticated + anon** 의 knowledge_entries(특히 status) 직접 UPDATE 권한 제거
- 기존 RLS UPDATE 정책에서 직접 상태 변경 가능 여부
- 다른 프론트·RPC·Edge Function 의 직접 PATCH 경로
- 이벤트 없이 status만 바뀌는 우회 경로 0

**★활성화 시점 = 6단계.** 지금 켜면 현재 직접 PATCH 검수가 깨짐 → 마이그레이션엔 함수만 정의, `create trigger`는 주석(미적용).

## 이벤트 충돌 처리 (대표님 §2 — 2차)

RPC 처리 순서:
1. 이미 목표 상태면 **UPDATE 전 무동작 반환**(정상 재시도 흡수)
2. 유효 신규 전환이면 상태 UPDATE + 이벤트 INSERT를 **같은 트랜잭션**에서
3. 예상치 못한 멱등 충돌(`on conflict do nothing` 후 `row_count=0`)이면 → **`raise exception`으로 트랜잭션 전체 롤백** = 상태만 바뀌고 이벤트 없는 상황 0.

## FK 삭제 정책 (대표님 §6)

`knowledge_entry_id bigint references knowledge_entries(entry_id) **ON DELETE SET NULL**` — entry 삭제돼도 감사 이력 보존(링크만 null).

## 개인정보 차단 (대표님 §4)

원장 저장 금지: raw 본문 / clean_text 전체 / 고객정보 / 개인정보 / 자유서술 오류메시지 / Gemini 전체 출력.
→ 원장에 위 자료 담는 컬럼 자체가 없음. `reason_codes` = 화이트리스트 CHECK(자유서술 차단).

## 4b — 후보+이벤트 원자화 (record_mined_entry RPC)

> 진실원천 SQL = `docs/migrations/2026-06-21_record_mined_entry_rpc.sql`. #869 부분 실패(후보만·이벤트 없음) 취약 해소.

**후보 생성/비생성 전환표:**

| 판정 | knowledge_entry | 경로 | event_type | reason_codes |
|---|---|---|---|---|
| ai_draft | 생성 | record_mined_entry RPC(원자) | mined | ['pass'] |
| hold | 생성 | record_mined_entry RPC(원자) | held | 복합 코드 |
| 중복(source_id+pv 존재) | 생성 안 함 | RPC 내부 dedup | skipped | ['duplicate'] |
| hard_failed | 생성 안 함 | writeEvent 단독 | hard_failed | ['diff_hard_fail'] |
| 자동 discard(지식없음/PII분리불가/소스부적격/내부) | 생성 안 함 | writeEvent 단독 | skipped | 해당 코드 |
| 이미 채굴됨(재실행) | 생성 안 함 | writeEvent 단독 | skipped | ['already_mined'] |

**mining_state 확정 순서(§3):**
1. (선택)처리 시작 표시 → 2. Gemini·diff·PII 판정 → 3. RPC(후보+이벤트 원자) 또는 writeEvent(이벤트 단독) → **4. 성공 확인 → 5. 그 후에만** mining_state 최종(done/skipped/failed).
- RPC/이벤트 **실패 시**: 함수 성공 반환 금지 · `failed_count++` · `last_error_code`=비식별 코드 · mining_state=**failed**(done/skipped로 끝내지 않음) → 같은 source_hash+pipeline_version 재실행 가능.

**동시 실행 방어(§5·2차):** 앱 사전조회 의존 X. (가) `pg_advisory_xact_lock`(같은 `type:sid:hash:pv` 직렬화·64bit) + (나) **partial UNIQUE index** `uq_ke_mine_identity (source_type,source_id,source_hash,pipeline_version) WHERE source_type in (mine_*)`. 기존 914(non-mine) 영향 0. **source_id 단독 UNIQUE 금지**(원문/pv 변경 후 정상 재채굴 허용).

**멱등키(§4):** `mine:{pipeline_version}:{source_type}:{source_id}:{source_hash}:{event_type}` — batch 무관 결정적. 동일 재시도 = 후보 0·이벤트 0·기존 변경 0.

**RPC 반환 계약(§3·2차):** `jsonb {entry_id, outcome}` — `inserted`(신규 후보+이벤트) / `already_exists`(중복 후보 존재, duplicate 이벤트) / `idempotent_replay`(이벤트 멱등 충돌=이전 부분기록 재시도). mine-batch는 이 셋 중 하나면 mining_state=done, **RPC 예외/예상밖이면 done 금지 → failed + 비식별 last_error_code + failed_count++ + 재실행 가능**.

**#869에서 제거·교체되는 부분(리팩터 — 결재 후):**
- ai_draft/hold: `writeCandidate`(단독 INSERT) + `writeEvent`(분리) → **`record_mined_entry` RPC 1콜**로 대체.
- 이벤트 멱등키: batch 기반 → **pipeline_version+source_hash 기반**으로 통일(writeEvent/already_mined 포함).
- `writeMiningState` 호출: 이벤트/RPC **성공 후로 이동**, 실패 시 `failed`.
- skipped/hard_failed/already_mined: `writeEvent` 유지(이벤트 단독)하되 성공 확인 후 mining_state 확정.

★ 이 단계 = **SQL+설계 PR 보고까지만.** DB 실행·Edge Function 배포·mine-batch 리팩터 코드는 결재 후.

## 배선 순서 (대표님 최종 — 8단계)

0. **[이 PR #868] 마이그레이션 SQL + RPC 설계** ← 머지 완료 자리
1. Dashboard **STEP 0** 자료형·소유자·권한 확인
2. **STEP 1·2** DB 적용
3. 적용 결과 검증
4. **mine-batch writer** (mined/held/hard_failed/skipped 이벤트 기록)
5. **검수큐 RPC 배선** (knowledge-vault.html patchStatus → review_knowledge_entry 호출로 교체)
6. **직접 PATCH 차단 트리거 활성화** (+ authenticated 직접 UPDATE 권한 제거, 우회 0 점검)
7. **학습일지 이벤트 피드** (2영역: 신규 events / 과거 logs)
8. **5건 제한 실적재**로 전체 흐름 검증 (dry_run=false, limit=5)

## 완료 검증 (대표님 §7) — 첫 5건 실적재에서 확인

- mine-batch → mined/held/hard_failed 이벤트 생성
- → ai_draft 검수큐 노출
- → 관리자 승인(RPC) → approved 이벤트
- → 지식엔진 검색 노출(approved)
- 동일 자료 재실행 → skipped 또는 reprocessed 이벤트 + **중복 knowledge_entry 생성 0**

자동 approved · cron · 대량 채굴 = 계속 금지.
