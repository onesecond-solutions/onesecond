# 서버형 채굴팀 아키텍처 작업안 (검토·추천 — 구현 전)

> **작성:** 2026-07-07 총괄팀장(Code) · **성격:** 검토·추천. 바로 구현 안 함.
> **정합:** `docs/strategy/organism_architecture_v1.md`(유기체 대원칙·동적 채굴 트랙) + 채굴 헌장 7조건.

## 목표
대표 PC·로컬 Claude 세션에 의존하지 않고, **원수사 자료실·소식지·보험 Q&A의 신규 데이터를 주기적으로 채굴해 ai_draft로 적재하는 서버형 구조.**

## 필수 조건 (대표 지시)
PC 꺼져도 작동 · 개인/팀/지점 격리 유지 · 공개 가능 자료만 공용 후보 · 원문 보존 · ai_draft로만 · approved 전 미노출 · 실패 로그+재시도 · 트리거 직접 폭주 금지 · 대량은 큐/배치.

---

## 3방식 비교

| 항목 | ① Supabase Cron + Edge | ② GitHub Actions 배치 | ③ 별도 Worker 서버 |
|---|---|---|---|
| PC 무관 | ✅ (서버) | ✅ | ✅ |
| DB 접근 | **내부**(service_role, RLS 자연) | 외부(secret·PGPASSWORD) | 외부 |
| 신규 인프라 | **거의 0**(mine-batch Edge 이미 있음) | workflow 신설 | 서버 신설·비용·관리 |
| 최소 주기 | 분 단위(pg_cron) | ~5분(스케줄 지연 있음) | 자유 |
| 현재 구조 정합 | ✅ **ocr-batch가 이미 이 방식으로 24시간 가동 중** | CI에서 **PGPASSWORD 인증 3연속 실패 이력**(7/3~7/4) | 없음 |
| 위험 | 낮음(검증된 패턴) | 중(외부 인증·IPv4↔IPv6 미도달 이력) | 높음(과투자·관리 부담) |

---

## ★ 추천 = ① Supabase Cron + Edge Function (1차)

**이유:**
1. **이미 검증됨** — `ocr-batch`가 pg_cron(`*/5`) + Edge Function으로 **PC 무관 24시간 가동 중**. 같은 패턴을 채굴에 재사용.
2. **신규 인프라 0** — 채굴 함수 `mine-batch`(v1d)가 이미 존재하고 **안전장치 완비**(CRON_ENABLED=false·dry_run 기본·자동 approved 0·MINE_SECRET·internal_only discard). pg_cron 등록만 하면 됨.
3. **내부 DB 접근** — service_role로 RLS·격리를 서버 안에서 자연 처리. GitHub Actions는 외부에서 DB 인증이 필요한데, **7/3~7/4 CI가 PGPASSWORD 인증에 반복 실패**한 이력(러너 IPv4↔Supabase IPv6 미도달 의심)이 있어 위험.
4. **트리거 폭주 회피** — 과거 "알람 폭탄"은 posts INSERT 트리거가 Edge를 직접 호출해 폭주한 것. 채굴은 **트리거가 아니라 cron이 주기적으로 mine-batch를 pull** → 입력량과 무관하게 배치 처리라 폭주 구조가 원천 차단.

GitHub Actions는 "Supabase가 다운됐을 때 외부 백업 실행" 같은 보조로는 가치 있으나, **1차 채굴 실행 경로로는 인증 리스크가 커서 비추천.** 별도 Worker는 현 단계 과투자.

---

## 안전 설계 (필수 조건 매핑)

- **PC 무관** → pg_cron(서버). ✅
- **격리·공개만** → `mine-batch`의 `evaluateSourceEligibility`에 **공개 판별 추가**: posts는 `branch_id IS NULL`(전사 공개) + `author_type='platform'`(공식)만 `eligible_public`, 개인/팀/지점 제한글은 `internal_only`→discard 유지. newsletter는 published만. (scope 상속 = 공개글만 공용 후보.)
- **원문 보존** → 채굴은 메타(태그·요약·후보)만 생성. 원본 무수정.
- **ai_draft만·approved 전 미노출** → `mine-batch` 기존 규칙(status='ai_draft', 자동 approved 0). 검색은 `knowledge_entries status=approved`만 노출.
- **실패 로그+재시도** → `net._http_response` 로깅 + `knowledge_mining_state` 멱등(재실행 시 중복 0) + 실패 항목 다음 배치 재시도.
- **트리거 폭주 금지** → cron pull 방식(위). 트리거→Edge 직접 호출 안 씀.
- **큐/배치** → 배치 크기 상한(예: 회당 N건)·일일 상한(mine-batch 기존 50) + `knowledge_mining_state` 커서.

## 소스별
- **소식지(newsletters)** — `extract-knowledge`(이미 newsletter 대상) cron 등록.
- **원수사 자료실·Q&A(posts)** — `mine-batch`에 공개 판별 추가 후 대상 개방(현재는 전부 discard).

---

## 단계 (Phase — 각 별도 승인·검증)

- **Phase 0** — 현황·안전 재확인(mine-batch·cron 상태, CRON_SECRET). *DB 실행 0.*
- **Phase 1** — **dry_run cron 등록**(`*/N`): 실제 적재 없이 "무엇을 채굴할지"만 로그. 헌장 준수(공개만·격리·미승격) 관찰.
- **Phase 2** — 공개 판별 로직 검증 → **ai_draft 소량 실적재**(소식지 먼저) → 검수 큐 확인.
- **Phase 3** — 검수(approved) → 검색 반영. posts(공개글) 소스 개방.
- **Phase 4** — 주기·배치 크기 조정, 소스 확대.

## 미해결 결재 (대표)
1. 1차 방식 = ① Supabase Cron + Edge (추천) 채택?
2. dry_run cron 등록 착수 승인?
3. cron 등록·CRON_SECRET 처리 = service_role/Edge 경로 vs 대표 콘솔 1회(권한 확인 필요).

**관련:** `organism_two_track_mining_charter` · `self_growth_search_system` · `2026-06-21_knowledge_pipeline_events_wiring.md`(자동채굴 재개 보류건) · `cron_secret_rotation`.
