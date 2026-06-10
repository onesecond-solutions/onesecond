# 상단 탭 IA 재편 — 마이/공동 스페이스 + 현장의 소리 폐지 (설계서 v1)

> 발신: 총괄팀장(Code) / 승인 대기: 대표(임태성) / 일자: 2026-06-11
> 작업지시서: `docs/workorders/2026-06-10_space_ia.md` (기획실장 Web) / 진실 원천 DB: `pdnwgzneooyygfejrvbg`
> 상태: **Phase 1 — 실측 + DDL 제안. 선실행 금지(대표 결재 후 DDL).**

## 명칭 통일 (대표 확정 2026-06-11)
- 공동 스페이스 하위 = **팀방 / 지점방 / 보험사별 자료실 / 보험Q&A**.
- "보험사룸" 표기 금지 → **보험사별 자료실**. (단, 레이어 논의 시 수요 레이어임을 명시)

## §0 실측 결론 (현행 데이터 모델)

| 콘텐츠 | 저장 테이블 | 식별/스코프 컬럼 | 방 귀속 |
|---|---|---|---|
| 단체방/지점 공지 | `team_notices` | scope(team_internal/branch_internal)·team_id·branch_id·attachments(text)·deleted_at | ✅ 이미 됨 |
| 보험Q&A | `posts` board_type='qna' | (없음 — flat 보드) | flat |
| 보험사 자료 | `posts` board_type='insurer' | insurer_id(uuid)·attachments | insurer_id |
| 공유 스크립트 | `scripts` | scope(personal/global)·stage | ❌ 없음 |
| 채팅 | `scripts` | stage='chat'·scope='global' | ❌ 없음 |
| 자료함(개인) | `myspace_folders/files` | owner_id | 개인 |

### 🔑 레이어 분리 (작업지시서 불변 가드 — 대표 point 5)
- **`insurer_posts` 테이블 미존재.** 보험사 글 전부 `posts(board_type='insurer', insurer_id)`.
- 즉 현행은 **수요/공급 물리 분리 없음** — posts(insurer) 한 곳. "보험사별 자료실"(공동 스페이스) = posts(insurer)를 회사(insurer_id)별 필터한 **수요 뷰**.
- 진짜 공급 레이어(원수사 임직원 전용 비공개, `master_strategy §4-D`) 물리 분리 = **본 트랙 범위 밖, 별도 결재**.
- 본 재편: **수요 레이어 내 방 구성까지만.** posts ≠ (가상의) insurer_posts 혼입 자체가 불가(테이블 1개).

### 현장의 소리(voice) — 폐지 확정
- voice는 독립 데이터 0 = `team_notices`·`posts(qna/insurer)`를 재노출하는 admin 전용 뷰. (대표 SQL 확인: team 21·branch 5·qna 3·insurer 5 전부 공유 테이블)
- **폐지 = nav/뷰 제거만. 데이터 마이그레이션 불요**(타 화면에서 그대로 접근, 유실 0). 제거 직전 voice 전용 데이터 0 read-only 재확인.

## §1 DDL 제안 (가상 방 모델 — 대표 승인 = rooms 테이블 신설 X)

전부 **추가만·nullable·데이터 보존·하드코딩 0**. 가상 방 = `(room_type, scope_id)` 파생.

| 방 탭 | 매핑 | DDL |
|---|---|---|
| 공지 | 팀방/지점방=team_notices(기존 scope) · 보험사별 자료실=posts(insurer,insurer_id) | **0** |
| 보험Q&A | posts(qna) flat — 공동 스페이스 상위 탭 | **0** |
| 공유 스크립트 | scripts + 방 스코프 | **scripts에 room_type·scope_id 추가** |
| 채팅 | scripts(stage='chat') + 방 스코프 (스크립트와 동일 테이블) | **위 컬럼 공용** |
| 공유 자료 | 택1 (아래 결재) | A=0 / B=library 컬럼 |

**제안 SQL 파일:** `docs/migrations/2026-06-11_room_scope_PROPOSAL.sql` (미실행).

### 공유 자료 — 결재 1건
- **(A·추천) DDL 0**: 팀방/지점방 공유자료 = `team_notices` 중 첨부 있는 글을 '자료' 탭으로 노출(만들기 최소·감추기>만들기 정합).
- **(B) 신규 스코프**: `library`에 room_type·scope_id 추가 → 방 공유 라이브러리(자료 전용 객체). A로 부족하면 승격.

### scope_id 타입
- `text` 권장 — team_id/branch_id(uuid)를 text로 저장, room_type으로 의미 구분(통일·하드코딩 0).

### RLS (결재 후 확정)
- 방 콘텐츠 읽기 = 본인 소속 매칭(room_type='team'→본인 team_id, 'branch'→본인 branch_id/산하). 기존 row(room_type IS NULL)는 현행 정책 그대로.
- 자기참조 회피 = SECURITY DEFINER 헬퍼 재사용(`rls_self_reference_avoidance` 표준). 정확한 정책문은 기존 is_admin()/team 헬퍼 점검 후 확정.

## §2 단계 계획 (작업지시서 staging 정합 — "공동 스페이스 안정화 후 탭 묶기")
- **Phase 0**: 실측+설계+결재 ✅(직전)
- **Phase 1**: 본 DDL 제안 → 대표 결재 → DDL 실행(대표 단독) ← **여기**
- **Phase 2**: 공동 스페이스 뷰 신설(팀방/지점방/보험사별 자료실/보험Q&A) + 방 내부 4탭, 기존 데이터 그대로 매핑 → 안정화 검수
- **Phase 3**: 현장의 소리 nav/뷰 제거(데이터 보존, 제거 전 voice 전용 0 재확인)
- **Phase 4**: 상단 탭 2분할(마이 스페이스 / 공동 스페이스) + 팀원관리 매니저 RBAC 게이팅(ga_manager·ga_branch_manager 노출, ga_member 비노출)
- **Phase 5 (별 PR)**: 보험사별 자료 시드(author_type='platform', 임태성 admin과 구분, status seed→published, 출처·면책, 전 회사 균등)

## §3 결재 요청
1. **공유 자료**: (A) team_notices 재사용 / (B) library 방 스코프 신설 — 어느 쪽?
2. **DDL 제안(scripts room_type·scope_id 추가)** 승인 → 대표님 실행?
3. **레이어 범위**: 이번 재편 = 수요 레이어 내 방 구성까지(공급 물리분리 별도 트랙) — 동의?
