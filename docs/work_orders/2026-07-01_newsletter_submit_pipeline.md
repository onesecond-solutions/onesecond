# 소식지 데이터베이스화 파이프라인 — 김실장·기획팀장 등록 통로 (2026-07-01)

> **전략(대표 확정 2026-07-01):** Code의 PDF 데이터베이스화(추출)는 실패 → **PDF 읽기·구조 분석은 김실장(GPT)·기획팀장(Web)** 이 담당하고, **Code는 좁은 등록 통로(API)를 구현 + 시스템 검수**한다. 검색 데이터를 빨리 만드는 게 목적.
> 메모리 정합: [[project_official_material_submission_pipeline]] (좁은 통로 + service_role 은닉 + 검수 게이트).

## 역할 분담
| 주체 | 역할 |
|---|---|
| 김실장(GPT)·기획팀장(Web) | 소식지 PDF 읽기 → 구조 분석(회사·타입·발행월·카테고리·본문 텍스트·키워드) → **등록 API로 reviewing 초안 제출** |
| 총괄팀장(Code) | ① Storage 업로드(PDF) ② 등록 API 구현 ③ 시스템 검수(중복·검색작동·미리보기·권한) → **published 승격** |
| 대표 | 예외(공개범위 등)만 |

## 구성 요소 (본 PR 산출물)
1. **등록 API** `supabase/functions/newsletter-submit/index.ts`
   - 인증 = 전용 등록키 `x-submit-key`(= env `NEWSLETTER_SUBMIT_KEY`). **service_role은 함수 내부에만**(외부 AI 노출 0).
   - 액션 3종:
     - `check_duplicate` — 회사+발행년월(+파일명) 중복 확인
     - `create_draft` — 구조 JSON → newsletters INSERT. **서버 강제**: `status='reviewing'`, `submitted_by='ai:gpt|ai:web'`, `extracted_at`, `ocr_status='done'`. 외부는 published 못 만듦(게이트).
     - `get_status` — 제출분 상태 조회
   - 방어: 필수 검증, 카테고리 화이트리스트, 개인정보(주민번호·휴대폰) 차단, source_filename 멱등(중복 재등록 차단).
2. **DDL** `db/newsletters/2026-07-01_submit_gate_columns.sql`
   - newsletters에 `status`/`submitted_by` 추가 + **기존 4월/6월분 published 백필**(검색 노출 유지) + DEFAULT reviewing.

## 김실장·기획팀장 제출 JSON 스키마 (create_draft)
```json
{
  "action": "create_draft",
  "submitter": "gpt",                     // gpt(김실장) | web(기획팀장)
  "company": "삼성생명",
  "insurance_type": "생명",               // 생명 | 손해
  "publish_year": 2026,
  "publish_month": 7,
  "category": "소식지",                   // 소식지|영업방향|세일즈가이드|매거진|요약|리플렛|강의안
  "title": "삼성생명 GA소식지 26.07",
  "full_text": "...PDF 본문 구조화 텍스트(30자 이상)...",
  "keywords": ["건강보험", "간편심사"],   // 선택
  "source_filename": "삼성생명 GA소식지 26.07.pdf",
  "page_count": 16                        // 선택
}
```
- 호출: `POST /functions/v1/newsletter-submit`, 헤더 `x-submit-key: <등록키>`.
- 먼저 `check_duplicate`로 중복 확인 후 `create_draft` 권장.

## 흐름 (7월 소식지 23건)
1. **[Code] Storage 업로드** — 로컬 `upgrade_20260521/소식지/` 7월 PDF 23건 → `newsletters` 버킷(private, 기존 6월분과 동일). ⚠️한글 파일명=Storage 키 ASCII 전용 → uuid 키, 원본명은 `source_filename`. 업로드 후 `source_path` 확보.
2. **[김실장·기획팀장] 구조 분석·등록** — 각 PDF 읽고 JSON → `create_draft`. status=reviewing.
3. **[Code] source_path 연결** — source_filename ↔ 업로드 source_path 매핑으로 UPDATE(미리보기 PDF).
4. **[Code] 시스템 검수** — 중복 0·검색작동·PDF 미리보기·권한 확인 → `status='published'` 승격.
5. **[Code] 검색 노출 필터** — app.html newsletters fetch에 `status=eq.published`(후속 PR, 전체 사용자 → 대표 검수·머지).

## 결정 필요 (대표)
1. **프로젝트 확인(규칙):** Supabase = `onesecond-v1-restore-0420`(`pdnwgzneooyygfejrvbg`) 맞는지 → YES 전 배포·DDL·업로드 실행 안 함.
2. **배포/업로드 주체:** Edge Function 배포 + Storage 업로드 = (a) Chrome 검수팀 위임 (b) 대표 대시보드. Code는 코드·SQL·업로드 매핑 준비.
3. **검수 게이트 수위:** 본 설계 = reviewing→(Code 검수)→published. "공식자료라 바로 노출"을 원하면 등록 API 기본을 published로 1줄 변경 가능.
4. **등록키 전달:** `NEWSLETTER_SUBMIT_KEY` 생성 후 김실장·기획팀장에게만 공유(대표 채널).

## 미포함(후속)
- keywords 전용 컬럼(현재 title/full_text 검색 흡수)
- 연결방식(ChatGPT 직접·에이전트·관리자 화면) — 메모리대로 API 먼저, 연결은 나중
