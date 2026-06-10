# 마이 스페이스 '자료함' v1 — 개인 폴더형 자료함 골조 (P1 스펙)

> **상태:** P1 = 구조만 연다. 정책(티어·AI·공유·코퍼스·요금제)은 후순위.
> **작성:** 2026-06-10 (총괄팀장 Code, 대표님 작업지시서 박제)
> **PR 범위(이번):** 본 스펙 + DB 실측 SELECT + DDL/Storage **제안 SQL까지만.** 프론트 구현은 DB 결재·적용 후 별도 PR.
> **DB 실행 금지:** 제안까지. 실행은 대표님이 Supabase Dashboard(신버전 `onesecond-v1-restore-0420` / `pdnwgzneooyygfejrvbg`)에서 직접.

---

## §0. 명칭 확정

- 라이브러리 > 마이 스페이스 > **'자료함'** (구 '자료' 칩).
- ⚠️ **'자료실' 사용 금지** — 좌측 '보험사 자료실'과 충돌.
- 영문/식별자: `myspace_library` / `myspace_*` 테이블 계열.

---

## §1. 정합성 점검 결과 (작업지시서 가정 대비 정정 3건)

작업 전 실측(`app.html`, 코드 grep)으로 확인한 현 구조:

1. **경로 정정:** 작업지시서가 가정한 `pages/myspace.html`은 **존재하지 않는다.** 라이브러리·마이 스페이스는 `app.html`의 `#v-myspace` 뷰에 구현됨. → 프론트 PR(별도)은 `app.html` 대상.
2. **현 '자료' 칩(`app.html:1716` `filterMys(this,'자료')`):** 기존 `library` 테이블(평면 목록 — 자료/스크립트/메모/즐겨찾기, `MYS_COLOR` 매핑)을 필터하는 **평면 구조. 폴더형 아님.** P1 '자료함'은 이를 **폴더형 파일 보관함으로 신설/승격**하는 것.
3. **신설 레이어 확인:** `myspace_folders` / `myspace_files` / `myspace_usage` 테이블은 코드·DB에 **없음** → 신설 맞음.

→ posts·library 어느 쪽에도 끼워넣지 않는 **독립 개인 레이어**로 설계한다.

### 기존 `library` 테이블과의 관계 (P1 미확정 — 정책 후순위)
- 현 `library` = 메모/스크립트/링크/이미지 평면 보관(`memo_text`·`file_url`·`image_url`·`link_url`·`keywords`·`sort_order`).
- P1 자료함 = **폴더형 파일 보관**(트리·드래그 업로드·썸네일).
- **통합 여부는 P1에서 결정하지 않는다.** 별 테이블로 신설하고, 향후 통합/마이그레이션은 정책 확정 후 별 트랙.

---

## §2. P1 범위

### 포함
- 개인 폴더형 자료함 **골조**: 폴더 트리(자기참조 self-parent), 파일 메타, 사용량 골조.
- Storage 버킷 `myspace`, owner 격리 RLS.
- 확장 여지만 비워둠: `search_text`(검색/AI 인덱싱), `status`(인덱싱 파이프라인), `quota_limit`(용량 정책) = **NULL/미확정**.

### 금지 (P1에서 하지 말 것)
- FREE/PLUS 용량 GB 확정
- AI·OCR 구현
- 팀·지점 공유 구현
- 코퍼스·공개 전환
- 요금제 확정
- posts에 끼워넣기

---

## §3. DB 설계 (제안 — DDL 실행 금지, 결재 관문)

### 실측 SELECT (제안 SQL 적용 전, 대표님 신버전에서 직접 실행 → 결과 보고)
- 현재 `myspace_*` 테이블 존재 여부
- Storage 버킷 `myspace` 존재 여부
- 기존 `library` 테이블 컬럼(참고)

→ 실제 쿼리는 `docs/migrations/2026-06-10_myspace_library_v1_PROPOSAL.sql` STEP 0 참조.

### 제안 테이블

**`myspace_folders`** — 폴더 트리(자기참조)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK (gen_random_uuid) | |
| owner_id | uuid not null | = auth.uid(), 개인 격리 |
| parent_id | uuid null (self FK) | null = 루트 |
| name | text not null | |
| path | text | 표시용 경로(예 `/영업자산/2026`) |
| depth | int default 0 | |
| sort_order | int default 0 | |
| is_pinned | bool default false | |
| created_at / updated_at | timestamptz default now() | |
| deleted_at | timestamptz null | soft delete |

**`myspace_files`** — 파일 메타
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| owner_id | uuid not null | 개인 격리 |
| folder_id | uuid null (FK folders) | null = 루트 |
| original_name | text not null | 원본 파일명만(PC 절대경로 저장 금지) |
| storage_path | text not null | `myspace/{owner_id}/{folder_id}/{file_id}_{sanitized}` |
| mime_type | text | |
| ext | text | |
| file_size | bigint | |
| thumbnail_path | text null | |
| search_text | text null | **비워둠** — 검색/AI 인덱싱 확장 여지 |
| tags | text[] default '{}' | |
| source | text | 업로드 출처(예 `drag`/`picker`) |
| status | text default 'pending' | `pending`/`indexed`/`failed` — **파이프라인 미구현, 골조만** |
| is_pinned | bool default false | |
| created_at / updated_at | timestamptz default now() | |
| deleted_at | timestamptz null | soft delete |

**`myspace_usage`** — 사용량(숫자 미확정, 구조만)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| owner_id | uuid PK | |
| quota_limit | bigint null | **NULL = 미확정** (요금제 후순위) |
| used_bytes | bigint default 0 | |
| updated_at | timestamptz default now() | |

### Storage
- 버킷 `myspace` (private), 경로 규약 = `myspace/{owner_id}/{folder_id}/{file_id}_{sanitized_name}`.
- 원본 PC 경로 저장 금지(`original_name`만 메타로 보관).

### RLS / 보안 (검수 전 적용 금지)
- 3 테이블 + Storage objects: **`owner_id = auth.uid()`** 격리(select/insert/update/delete).
- SECURITY DEFINER 함수 = P1 불필요(자기참조 트리는 owner 단일 격리라 재귀 RLS 회피 대상 아님).
- **RLS·정책 적용은 대표님 검수 후.** DDL은 "생성"까지, 실행은 결재 후 직접.

### 결재 관문
1. 대표님 신버전 확인 → 실측 SELECT 실행 → 결과 보고
2. 결과 보고 후 DDL/버킷 제안 검토 → 결재 → 대표님 직접 실행
3. DB 적용 후 → 프론트 §4 별 PR 진입

---

## §4. 프론트 (별 PR — 본 PR 범위 아님, 참고용 골조)

> DB 결재·적용 후 별도 PR. 여기엔 방향만 박제.

- 영역 D(중앙) 3분할: 좌(폴더 트리 + "여기로 폴더 끌어다 놓기" 드롭존) / 중(파일 썸네일 그리드) / 우(미리보기 상세).
- 드래그 폴더 업로드: `DataTransferItem.webkitGetAsEntry()` 재귀 + `<input webkitdirectory>` 폴백 + 진행률.
- 안전 `storage_path`: `myspace/{owner_id}/{folder_id}/{file_id}_{sanitized_name}` (원본 PC 경로 저장 금지).
- 폴더 트리 / 파일 목록 / 미리보기(이미지·PDF·텍스트) + 파일명·폴더명 검색(1단계).
- **개인정보 고지(방어선):** 업로드 화면 상단 "고객 식별정보 파일 업로드 금지 — 본인 영업 자산 보관용" + 업로드 전 확인 체크 1클릭.
- owner_id 개인 격리, 4팀 하드코딩 0.
- 구현 위치 = `app.html #v-myspace`(전산 정정 §1-1).

---

## §5. 산출물 / 금지

### 산출 (이번 PR)
- 본 스펙(`docs/specs/myspace_library_v1.md`)
- DDL/Storage 제안 SQL(`docs/migrations/2026-06-10_myspace_library_v1_PROPOSAL.sql`)
- 변경 파일 목록 + 커밋 해시(PR 본문)

### 금지
- main 직접 push 금지 → origin/main 분기 → PR + Deploy Preview
- DB DDL/버킷 실행 금지(결재 관문) — 제안 SQL까지
- 프론트 구현 이번 PR에 포함 금지

### 운영 메모
- 채굴팀 현재 🔴(자동 채굴 없음). '상시 가동' 표현 폐기 — 수동 채굴만.
