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

## 직접 PATCH 차단 (대표님 §5)

현재 knowledge_entries RLS = `kentries_admin FOR ALL is_admin` → **admin이 이벤트 없이 status 직접 UPDATE 가능(우회 경로)**.
- 차단 방안: `kpe_guard_status_change()` BEFORE UPDATE 트리거 — 세션 플래그 `app.kpe_via_rpc='on'`(RPC가 설정) 없이 status 변경 시 거부.
- **★활성화 시점 = 배선 4단계(검수큐 프론트 RPC 완전 전환) 검증 후.** 지금 켜면 현재 직접 PATCH 검수가 깨짐 → 마이그레이션엔 함수만 정의, `create trigger`는 주석(미적용).

## FK 삭제 정책 (대표님 §6)

`knowledge_entry_id bigint references knowledge_entries(entry_id) **ON DELETE SET NULL**` — entry 삭제돼도 감사 이력 보존(링크만 null).

## 개인정보 차단 (대표님 §4)

원장 저장 금지: raw 본문 / clean_text 전체 / 고객정보 / 개인정보 / 자유서술 오류메시지 / Gemini 전체 출력.
→ 원장에 위 자료 담는 컬럼 자체가 없음. `reason_codes` = 화이트리스트 CHECK(자유서술 차단).

## 배선 순서 (대표님 §6)

1. **[이 PR] 마이그레이션 SQL + RPC 설계** ← 지금
2. 대표 결재 후 DB 적용 (Dashboard, STEP 0 검증 먼저)
3. mine-batch 이벤트 writer (mined/held/hard_failed/skipped 기록)
4. 검수큐 원자적 RPC 배선 (knowledge-vault.html patchStatus → review_knowledge_entry 호출로 교체)
5. 학습일지 이벤트 피드 (2영역: 신규 events / 과거 logs)
6. 5건 제한 실적재로 전체 흐름 검증 (dry_run=false, limit=5)

## 완료 검증 (대표님 §7) — 첫 5건 실적재에서 확인

- mine-batch → mined/held/hard_failed 이벤트 생성
- → ai_draft 검수큐 노출
- → 관리자 승인(RPC) → approved 이벤트
- → 지식엔진 검색 노출(approved)
- 동일 자료 재실행 → skipped 또는 reprocessed 이벤트 + **중복 knowledge_entry 생성 0**

자동 approved · cron · 대량 채굴 = 계속 금지.
