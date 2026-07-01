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

## ⚠️ 본 스키마 = 1단계 구조 (소식지 원본 + 검색용 본문)
현재 등록 스키마는 **소식지 원본(PDF)과 검색용 본문(full_text)을 적재하는 1단계**입니다.
**상품 라인업·보험료·인수(언더라이팅)·담보 구조화는 후속 확장**으로, 별도 컬럼/테이블·별도 등록 필드로 뒤에 붙입니다(본 PR 범위 밖).

## 허용값 제한 (자유입력 불가)
- `insurance_type` ∈ **{생명, 손해}** — 그 외 값은 400 거부
- `category` ∈ **{소식지, 영업방향, 세일즈가이드, 매거진, 요약, 리플렛, 강의안}** — 그 외 값은 400 거부(정규화 fallback 없음)

## 중복 판단 = 회사·발행월·자료유형·파일해시 (파일명 아님)
- **완전 일치**(회사+발행월+category+`file_hash` 동일) → 멱등 차단(409).
- **같은 회사·발행월·자료유형 + 다른 해시** → `is_revision=true` **수정본 후보**로 등록(응답 `revisionCandidate`, `existingSameGroup` 반환) → 총괄팀장 검수 시 세대/개정 판단.
- `file_hash` = PDF sha256(64 hex). **Code가 Storage 업로드 시 파일별 sha256 산출표를 김실장·기획팀장에 제공** → 그들이 JSON에 넣음.

## 김실장·기획팀장 제출 JSON 스키마 (create_draft)
```json
{
  "action": "create_draft",
  "submitter": "gpt",                     // gpt(김실장) | web(기획팀장)
  "company": "삼성생명",
  "insurance_type": "생명",               // 허용값: 생명 | 손해
  "publish_year": 2026,
  "publish_month": 7,
  "category": "소식지",                   // 허용값: 소식지|영업방향|세일즈가이드|매거진|요약|리플렛|강의안
  "title": "삼성생명 GA소식지 26.07",
  "full_text": "...PDF 본문 구조화 텍스트(30자 이상)...",
  "keywords": ["건강보험", "간편심사"],   // 선택
  "source_filename": "삼성생명 GA소식지 26.07.pdf",
  "file_hash": "<PDF sha256 64자리 hex>", // 필수 — Code 제공 산출표 사용
  "page_count": 16                        // 선택
}
```
- 호출: `POST /functions/v1/newsletter-submit`, 헤더 `x-submit-key: <등록키(비밀)>`.
- 먼저 `check_duplicate`(회사·발행월·자료유형·해시)로 확인 후 `create_draft` 권장.

## 흐름 (7월 소식지 23건)
1. **[Code] Storage 업로드 + 해시 산출** — 로컬 `upgrade_20260521/소식지/` 7월 PDF 23건 → `newsletters` 버킷(private, 기존 6월분과 동일). ⚠️한글 파일명=Storage 키 ASCII 전용 → uuid 키, 원본명은 `source_filename`. 업로드 후 `source_path` + **파일별 sha256 산출표**(source_filename ↔ file_hash) 확보 → 김실장·기획팀장에 제공.
2. **[김실장·기획팀장] 구조 분석·등록** — 각 PDF 읽고 JSON → `create_draft`. status=reviewing.
3. **[Code] source_path 연결** — source_filename ↔ 업로드 source_path 매핑으로 UPDATE(미리보기 PDF).
4. **[Code] 시스템 검수** — 중복 0·검색작동·PDF 미리보기·권한 확인 → `status='published'` 승격.
5. **[Code] 검색 노출 필터** — app.html newsletters fetch에 `status=eq.published`(후속 PR, 전체 사용자 → 대표 검수·머지).

## 확정 사항 (대표 2026-07-01)
1. **프로젝트:** `onesecond-v1-restore-0420`(`pdnwgzneooyygfejrvbg`) 기준.
2. **배포·DDL·Storage 업로드 = Chrome 검수팀 위임.** Code는 코드·SQL·업로드 매핑·파일해시 산출표 준비.
3. **검수 게이트 = reviewing 유지, 검수 후에만 published 승격.** (바로 노출 안 함)
4. **등록키(`NEWSLETTER_SUBMIT_KEY`) = 비밀값으로만 관리.** 코드·문서·로그·브라우저에 값 노출 0.
   - 생성·저장 = Supabase Function Secrets(대시보드/Chrome). 김실장·기획팀장에겐 값만 대표 채널로 별도 전달(리포지토리·PR·로그에 기록 금지).

## 배포 체크리스트 (Chrome 검수팀)
1. `NEWSLETTER_SUBMIT_KEY` = Supabase secret 설정(임의 난수, 값 비공개).
2. `db/newsletters/2026-07-01_submit_gate_columns.sql` 실행(프로젝트 `pdnwgzneooyygfejrvbg` 확인 후) → 기존분 published 백필 검증.
3. `supabase functions deploy newsletter-submit` (Verify JWT는 사용 안 함 — 자체 x-submit-key 인증) → `deno check` EXIT 0 확인.
4. 스모크: 무키 401 / 잘못 submitter 400 / 필수누락 400 / 정상 create_draft → reviewing 1건.

## 미포함(후속)
- keywords 전용 컬럼(현재 title/full_text 검색 흡수)
- 연결방식(ChatGPT 직접·에이전트·관리자 화면) — 메모리대로 API 먼저, 연결은 나중
