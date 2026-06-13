# OCR 정규 채용 — 배포 가이드 (대표/Chrome 1회 실행)

> 총괄팀장(Code) 작성. 코드/SQL은 준비 완료. **딱 한 번 배포+cron 실행만** 하시면 그 뒤로 상시 자동 가동(정규 채용).
> 엔진(ocr-extract/Gemini)·키(GEMINI_API_KEY·CRON_SECRET·SERVICE_ROLE)는 이미 다 있음. 새로 만들 것 없음.

## 구조 (한눈에)
```
pg_cron(*/5분) ──x-cron-secret──▶ ocr-batch(신규) ──▶ ocr-extract(기존 Gemini) ──▶ newsletters.full_text 적재
                                   └ 미처리 5건/틱 · 멱등 · 빈추출 마킹 · idle시 과금0
```

## 사전 확인 (이미 충족)
- [x] `ocr-extract` 배포됨 (Gemini)
- [x] secret: `GEMINI_API_KEY`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` (기존)
- [ ] 신규 `ocr-batch` 배포 + cron — 아래 진행

## STEP 1 — ocr-batch 배포
```
supabase functions deploy ocr-batch --no-verify-jwt
```
(`--no-verify-jwt`: cron이 `x-cron-secret`로 자체 인증하므로. ocr-extract 호출은 함수 내부에서 service_role Bearer 동봉.)

## STEP 2 — 스모크 테스트 (cron 걸기 전, 1~2건 확인)
```
curl -X POST "https://pdnwgzneooyygfejrvbg.supabase.co/functions/v1/ocr-batch" \
  -H "x-cron-secret: <현재 CRON_SECRET 값>" -H "Content-Type: application/json" -d '{}'
```
응답 예: `{"picked":5,"ok":4,"empty":0,"failed":1,"remaining":62}`
- **ok ≥ 1** → 정상. SQL로 `select title,char_length from newsletters where full_text is not null order by char_length desc limit 5;` 확인.
- **failed 가 picked 와 같음(전부 실패)** → 대개 `source_pdf_url`이 private/만료 URL. → **총괄팀장에게 알려주세요.** ocr-batch를 storage 서명URL 생성 방식으로 1줄 교체합니다(NOTE 참고).

## STEP 3 — 정규 cron 가동
`docs/migrations/2026-06-14_ocr_batch_cron.sql` 실행. **`__CRON_SECRET__`를 현재 라이브 값으로 교체**(채팅 비노출). 5분마다 자동 처리 시작.

## STEP 4 — 모니터 (선택)
```
select status, return_message, start_time from cron.job_run_details
  where jobid=(select jobid from cron.job where jobname='ocr-batch-5min') order by start_time desc limit 5;
select count(*) remaining from newsletters where full_text is null and source_pdf_url is not null and (text_quality is null or text_quality<>'비었음');
```
remaining 이 0으로 수렴 → 백로그 소진. **그대로 두면** 신규 업로드도 자동 OCR(정규 채용 완성). 멈추려면 `select cron.unschedule('ocr-batch-5min');`

## 효과
- 소식지 본문(full_text)이 차오르는 만큼 **통합검색 결과가 늘어남**(소식지 본문 = 검색 연료).
- 이후 `extract-knowledge`(기존)로 full_text → 지식엔진 ai_draft 추출까지 이어짐(별도).
