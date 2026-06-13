# 검색 데이터 확장 계획 — 전체 업로드 자료 OCR → 통합검색 합류

> 작성: 2026-06-14 총괄팀장(Code). 성격: 계획(착수 전). 소식지 OCR 정규 채용 완료 후 다음 트랙.
> 목표: 사이트에 올라오는 **모든 자료**가 검색에 잡히게 — 단 **각 자료의 권한/스코프(RLS)는 그대로 지키며**.

## 현황 (2026-06-14)
- ✅ **소식지(newsletters.full_text)** = 적재 완료 + cron(ocr-batch)으로 신규 자동. 통합검색 v0.5-a에 합류됨.
- ❌ **자료실 파일·첨부·보험사 자료실** = OCR/검색 미포함.

## Phase A — 자료실 파일(myspace_files) ⭐ 1순위 (가장 준비됨)
- **이미 있음:** `myspace_files.search_text` 컬럼(비어 있음, 대표님이 인덱싱용으로 미리 준비). storage 경로·scope(personal/team/branch) 보유.
- **할 일:**
  1. ocr-batch 확장(또는 ocr-batch-files 신규): `myspace_files` 중 search_text 비고 PDF/이미지인 행 → 서명URL → ocr-extract → `search_text` 적재. 멱등.
  2. 통합검색 소스에 `myspace_files` 추가 — **사용자 토큰으로 조회 = RLS가 자동으로 personal=본인/team=내팀/branch=내지점만 반환** → 스코프 격리 자동 보장(별도 권한코드 불필요).
  3. 결과 클릭 = 자료실 미리보기로 딥링크.
- **파일 타입:** PDF·이미지 = ocr-extract(Gemini) 그대로. **docx/xlsx/pptx = Gemini 직접 한계** → 별도 추출(후순위).
- ⚠️ **프라이버시 결재 포인트(대표님):** 개인 자료실 파일을 OCR(Gemini=구글 전송)해 search_text에 넣는 것. 자료함 고지("고객 식별정보 금지")가 이미 있으나, "개인 파일이 OCR 처리됨"을 사용자에게 알릴지/동의 받을지 결정 필요. (검색 노출은 본인만 = RLS, 그러나 처리 자체는 외부 API 전송)

## Phase B — 게시판·공지 첨부 (posts/team_notices attachments)
- 첨부 = JSON {url,name} 배열, 추출텍스트 저장 위치 없음 → **첨부 텍스트 컬럼/테이블 설계 선행**.
- 추출(PDF/이미지=ocr-extract) → 저장 → 통합검색 소스 추가(스코프=원 게시물 RLS 상속).

## Phase C — 보험사 자료실 (posts board_type=insurer)
- B와 유사. insurer 자료 = admin/insurer 스코프 유지.

## 의존·순서
1. **Phase A 먼저** (search_text 컬럼 이미 존재 = 최소 작업). PDF/이미지부터.
2. 프라이버시 결재(개인 자료실 OCR 고지) → A 착수 전 확정.
3. B/C는 첨부 텍스트 저장 설계 후.
4. 정식 검색기(v1, D영역)와 함께 랭킹·동의어(knowledge_synonyms) 통합.

## 비용
- ocr-extract(Gemini) 사용한 만큼 과금. cron 스로틀(N/틱)로 제어. idle=0.

관련: [[d_area_search_stopgap]] · [[vault_shared_scope_track]] · [[codex_dualtrack]]
