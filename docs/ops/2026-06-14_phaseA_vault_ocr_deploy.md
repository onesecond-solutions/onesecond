# Phase A — 자료실 파일 OCR → 통합검색 (대표/Chrome 실행분)

> 총괄팀장(Code) 작성 2026-06-14. 승인: "고지 한 줄 + PDF/이미지 + cron으로 진행".
> 목표: 자료실에 PDF·이미지만 올려도 자동 OCR → 통합검색에 합류. 스코프(개인/팀/지점)는 RLS 자동 격리.
> **기존 cron(`ocr-batch-5min`)이 그대로 호출** — 새 cron 불필요. 재배포 + DDL 한 번이면 가동.

## 코드(이미 준비됨)
- `supabase/functions/ocr-batch/index.ts` — 소식지에 더해 **myspace_files도 처리**(PDF/이미지 → 'myspace' 버킷 서명URL → ocr-extract → search_text 적재 + ocr_status 마킹).
- `app.html` — 통합검색에 **자료실** 소스 추가(사용자 토큰 RLS=스코프 자동) + 결과 클릭=원본 열기 + 자료함 고지 한 줄. → PR 머지(완료 시 라이브).

## STEP 1 — DDL (멱등 마커 컬럼)
`docs/migrations/2026-06-14_myspace_files_ocr_status.sql` 실행. (신버전 pdnwgzneooyygfejrvbg 확인 후)
```
alter table public.myspace_files add column if not exists ocr_status text;
```
데이터 무손실 ALTER. ocr_status: null=미처리 / done / empty / skip(비대상 타입).

## STEP 2 — ocr-batch 재배포
```
supabase functions deploy ocr-batch --no-verify-jwt
```
(기존 cron이 이미 이 함수를 5분마다 호출 → 자동으로 자료실도 처리 시작)

## STEP 3 — 스모크(선택)
PDF 1개를 자료실에 올린 뒤 다음 틱(또는 수동 호출) 후:
```
select ocr_status, count(*) from public.myspace_files group by ocr_status;
-- done 행의 search_text 확인:
select original_name, left(search_text,120) from public.myspace_files where ocr_status='done' order by updated_at desc limit 5;
```
`done` + search_text에 본문 일부 들어오면 정상. 그 파일을 통합검색에서 본문 키워드로 검색 → 잡히면 끝.

## 동작 요약
```
자료실 업로드(PDF/이미지) → (다음 5분 틱) ocr-batch → 서명URL → ocr-extract(Gemini)
   → search_text 적재(파일명+본문) + ocr_status='done'
통합검색: 사용자 토큰으로 myspace_files 조회 → RLS가 개인=본인/팀=내팀/지점=내지점만 반환
```
- 비용: 처리분만 Gemini 과금. 미처리 0이면 0. BATCH=5/틱 스로틀.
- office류(docx/xlsx/pptx)=현재 skip(후순위). PDF/이미지만.
- 빈 추출=empty 마킹(재시도 방지).
