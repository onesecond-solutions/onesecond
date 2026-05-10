# 별 트랙 #51 — public.posts 시드 Chrome AI 검수 결과

> **일시:** 2026-05-11 오후
> **본진:** 별 트랙 #51 종합 PASS (4팀 오픈 D-4 board.html 빈 화면 회피 정합)
> **수행:** Claude in Chrome (라이브 Supabase Dashboard SQL Editor + onesecond.solutions)
> **사이트:** https://onesecond.solutions / https://supabase.com/dashboard/project/pdnwgzneooyygfejrvbg
> **의뢰서:** `docs/architecture/star_51_posts_seed_chrome_request_2026-05-10.md`
> **시드 SQL 파일:** `docs/migrations/2026-05-11_seed_posts.sql` (commit `9751fb0`)

---

## 종합 결과

✅ **PASS** — 슬롯 3 (Step 7 라이브 회귀 검수) 진입 OK

| 섹션 | 결과 | 비고 |
|---|---|---|
| §A 사전 검증 (6 SELECT) | **PASS** | current_database / branches / teams / users / insurers / posts 카운트 정합 |
| §B 시드 INSERT (7건) | **6/6 Success** | B-7 archive_legacy SKIP 정합 |
| §C 박힘 검증 (6 SELECT) | **PASS** | 사고 신호 0건 |
| §E 라이브 board.html 7탭 | **PASS** | 콘솔 에러 0건 |
| public.posts 박힘 총 카운트 | **10건** | 기존 4 + 시드 6 |

---

## A. 발견 박음 2건 (메모리 정합 진단)

### 발견 1 — 스키마 정합 사고 (시드 SQL ↔ 실제 DB 차이)

| 영역 | 시드 SQL 본문 | 실제 DB |
|---|---|---|
| author 컬럼 | `created_by` | **`author_id` (text 타입)** |
| question_type 허용값 | '운영' / '안내' | **NULL / '공지' / '상품' / '인수'** |

**본질:** 메모리 별 트랙 #33/#36 박힘 정합
- #33: "posts.author_id text → uuid 마이그레이션 + orphan 3건 처리" (Step 2-bis 발견)
- #36: "posts PK bigint → uuid 마이그레이션" (Step 2-bis 발견)
- 양 건 트리거 = Phase 1 종료 후 묶음 처리

**사고 X** — 메모리 박힘 본진과 정합. 시드 INSERT는 실제 DB 스키마로 적응 박음 (Chrome AI 자체 박음).

**사후 처리:** 시드 SQL 파일 정합 갱신 → **별 트랙 #57** 등록 (Phase 1 종료 후 묶음 박음 권장).

---

### 발견 2 — 매니저 라운지 탭 오버플로우 UX

**현상:** 7탭 가로 폭 초과 박힘 — 매니저 라운지 탭이 다음 줄로 떨어지거나 잘림.

**영향:**
- 시드 노출 자체 = PASS (탭 클릭 가능)
- UI/UX 정합 부분 미달 (모바일 퍼스트 정합 회귀 신호 가능성)

**사후 처리:** **별 트랙 #56** 등록 — 슬롯 6 박음 후 별도 슬롯 진입.

---

## B. 박힘 시드 row 박음 (6 row)

`public.posts` 시드 박힘:

| board_type | source_type | title | 박힘 |
|---|---|---|---|
| `qna` | `seed` | [샘플] 4팀 자주 묻는 질문 — 갑상선 결절 인수 가능 회사 | ✅ |
| `manager_notice` | `user_post` | [샘플] 5/15 4팀 오픈 안내 | ✅ |
| `manager_lounge` | `user_post` | [샘플] 매니저 라운지 운영 의논 | ✅ |
| `navigation` | `user_post` | [샘플] 메리츠화재 갑상선 결절 인수 문의 | ✅ |
| `insurer` | `seed` | [샘플] 메리츠화재 5월 인수 변경사항 | ✅ |
| `hub` | `seed` | [샘플] 허브 게시판 — 모든 지식의 저장소 | ✅ |
| `archive_legacy` | `seed` | (B-7 SKIP — 의도) | — |

기존 4 row + 시드 6 row = **public.posts 총 10건 박힘**.

---

## C. 다음 진입

1. ✅ Code 박음 1 — 본 결과 MD commit/push
2. ✅ Code 박음 2 — `_INDEX_3_stars.md` #51 ✅ 종료 + #56/#57 신설 + commit/push
3. ⏭️ **슬롯 3 진입** — 별 트랙 #53 Step 7 라이브 회귀 검수
   - Chrome AI 의뢰서: `docs/architecture/step7_live_regression_chrome_request_2026-05-10.md`
   - 사전 의존성 (public.posts 시드) ✅ 충족 박힘
   - 슬롯 3 = 검수만 (DB 변경 X, 코드 변경 X)

---

**END OF RESULT**

> 본 박음 = Chrome AI 라이브 검수 결과 박음. Code 라이브 코드 변경 0.
> 검수 결과 PASS 박힘 → 슬롯 3 진입 결재 대기.
