# [검수팀 재배포 의뢰] ocr-batch — OCR 정제본(clean_text) 백필 추가 (Phase B-2)

- 의뢰: 총괄팀장(Code) → 검수팀(Chrome) / 일자: 2026-06-19
- 대상 프로젝트: onesecond-v1-restore-0420 (`pdnwgzneooyygfejrvbg`) [신버전·유일 진실]
- 배경: 슬라이스3 Phase B. B-1(clean_text 컬럼·인덱스)=대표님 Dashboard 실행 완료. B-4(패널 [정제본|원본] 탭)=머지(#834). 본 건=B-2 OCR 정제 파이프라인.

## 무엇이 바뀌나
- `ocr-extract`(raw 추출) = **변경 없음** (원본 그대로 보존)
- `ocr-batch`에 **정제 백필 단계 추가**: `clean_text`가 비어 있고 raw가 있는 행을 3소스에서 꺼내 → Gemini 정제(띄어쓰기·줄바꿈만 복원, 내용 불변) → `clean_text` 적재
  - 소식지 `newsletters.full_text` → `clean_text`
  - 자료실 `myspace_files.search_text` → `clean_text`
  - 지식 `knowledge_entries.body` → `clean_text`
- 이미지 재OCR 없음(이미 적재된 raw 텍스트만 입력) = 저렴·빠름
- 시간 보호: OCR 바쁘면 정제 소스당 1건 / OCR idle이면 소스당 4건 (150초 한도)

## 재배포 (검수팀 / 대표님)
```
supabase functions deploy ocr-batch
```
- cron(`ocr-batch-5min`, jobid=5)·시크릿(CRON_SECRET/SERVICE_ROLE/GEMINI_API_KEY)은 **기존 그대로** — 추가 등록 불필요
- 신규 secret 없음. 함수 코드만 교체

## 배포 후 검증
1. **1틱 수동 호출**(검수팀) → 응답 JSON에 `refine` 키 + 각 소스 `picked/ok/failed/remaining` 확인
2. **정제본 품질 육안 검수 (★보험 정보 정확성 — 최우선 게이트)**: 백필된 샘플 몇 건을 raw와 대조
   ```sql
   -- 신버전 확인
   select current_database();
   -- 자료실 정제 샘플 (raw vs clean 대조)
   select id, left(search_text,200) as raw, left(clean_text,200) as clean
   from public.myspace_files where clean_text is not null order by id desc limit 5;
   -- 소식지
   select id, left(full_text,200) as raw, left(clean_text,200) as clean
   from public.newsletters where clean_text is not null order by id desc limit 5;
   -- 지식
   select entry_id, left(body,200) as raw, left(clean_text,200) as clean
   from public.knowledge_entries where clean_text is not null limit 5;
   ```
   → **숫자·금액·보험사명·담보명·고유명사 왜곡 0** 확인. 하나라도 변형되면 즉시 보고(프롬프트 강화).
3. 라이브 검색 우측 패널: 자료/소식지/지식 결과 클릭 → [정제본] 탭에 띄어쓰기 복원된 본문 표시

## 밤샘 집중 백필 (선택)
- 백필 대상이 많으면(소식지~461·자료실 수천·지식~914) cron 주기를 `*/5 → */1`로 임시 상향(대표님 `alter_job`), 끝나면 원복. 과금=처리 건수 비례(주기 무관).

## 롤백
- 문제 시 직전 ocr-batch로 재배포. `clean_text`는 추가 컬럼이라 raw·검색·표시 모두 영향 0(패널은 clean 비면 원본 fallback).
