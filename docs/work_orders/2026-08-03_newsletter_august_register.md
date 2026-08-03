# 8월 소식지 적재 완료 기록 (2026-08-03)

> 지시: 대표 "원세컨드 안 소식지 안에 8월 소식지 작업 정리해" → 승인 "진행" → 노출 "A".
> 방식: 7월 파이프라인(`docs/work_orders/2026-07-01_newsletter_submit_pipeline.md`) 복제.
> 프로젝트: 신버전 `pdnwgzneooyygfejrvbg`. 로컬 service_role REST(데이터 INSERT/UPDATE·DDL 아님).

## 원천
노주영 실장 배포 카톡 zip 2종 (발행 2026.08):
- `26년 8월 손해보험사 소식지.zip` — 9건
- `26년 8월 생명보험사 소식지.zip` — 14건
- 소스 PDF = 로컬 `upgrade_20260521/소식지/2026년 8월 {생명|손해}보험 소식지 모음/` (gitignore, 저장소 커밋 0)

## 적재 결과 (23건, 전부 published)
| 유형 | 회사(정규화) |
|---|---|
| 손해(9) | DB손해보험 · KB손해보험 · NH농협손해보험 · 롯데손해보험 · 삼성화재 · 하나손해보험 · 한화손해보험 · 현대해상 · 흥국화재 |
| 생명(14) | NH농협생명 · 동양생명 · 라이나생명 · ABL생명 · AIA생명 · DB생명 · KB라이프 · KDB생명 · 메트라이프 · 삼성생명 · 신한라이프 · 하나생명 · 한화생명 · 흥국생명 |

- 분류(category) = 전부 **소식지** (파일명 단서 없음·zip 자체 "소식지"). 필요 시 내용 기반 세분류는 후속.
- 제목 = `{회사} GA소식지 26.08` (손보는 약칭 유지: DB손보/KB손보/NH농협손보/롯데손보/하나손보/한화손보).
- 검색본문(full_text) = 최소 등록(제목·회사명 검색 + PDF 미리보기). 본문 채굴은 후속 별도 트랙(7월과 동일 수준).

## 파이프라인 실행 (스크립트 `scripts/newsletters_2026_08.sh`)
1. `upload` — Storage `newsletters` 버킷 `2026-08/<sha256>.pdf` 23건 (x-upsert 멱등). 결과 up=23 fail=0.
2. `register` — newsletters 23행 INSERT `status=reviewing`. ins=23.
3. 시스템 검수 — Storage 객체 23·source_path 전원 채움·중복 해시 0·서명URL PDF HTTP 200·유형 생명14/손해9.
4. `promote` — reviewing→published 23행. (대표 A 승인)

## 검증 (증거)
- 8월 published = **23** / reviewing 잔여 = **0**.
- 전체 published 총계 **537 → 560** (정확히 +23).
- app.html 소식지 조회는 `status=eq.published` 필터라 8월분 자동 노출 (앱 코드 변경 0).

## 롤백
`bash scripts/newsletters_2026_08.sh rollback` (23행 DELETE) + Storage `2026-08/` 객체 수동 삭제. file_hash 기준이라 다른 월 무영향.

---

## 추가 등록 4건 (2026-08-03 후속, 대표 지시)
스크립트 `scripts/newsletters_add_2026_0708.sh` (upload/register/promote/rollback, 4행 내장).
- 메리츠화재 GA소식지 26.07 (손해·2026.07 백필 — 7월 배치 누락분)
- 메리츠화재 GA소식지 26.08 (손해·신규 회사)
- 라이나손보 GA소식지 26.08 → 라이나손해보험 (손해·신규 회사)
- 하나손보 GA소식지 26.08(펼침면) → 하나손해보험 (손해·기존 8월과 다른 변형=별도 행, 7월 단면+일반 2행 전례)

결과: 2026-08 published **23→26**, 2026-07 published **23→24**, 전체 published **560→564**.

## S1 수정 — 소식지 종료월 하드코딩 제거 (대표 승인)
검수에서 발견: `_nlCardAll`(전체조망)·`_nlRenderCo`(회사별)의 `END=2026*12+(7-1)`가 **2026.07 고정**이라, 회사별 뷰에서 8월이 루프 밖으로 누락(실측: 삼성생명 첫 그룹이 7월, 8월 미표시).
- 수정: `END = new Date() 기준 현재월`(`getFullYear()*12+getMonth()`)로 동적화. 2곳(insu/index.html).
- 검증(로컬 렌더): 삼성생명 회사별 첫 그룹 "2026년 8월 · 1건", 하나손해보험 "2026년 8월 · 2건"(일반+펼침면) 노출 확인. 매달 코드 수정 없이 새 발행월 자동 노출.
- ⚠️ 앱 본체는 플랫폼 전환 후 `insu/index.html`(app.html은 stub). 향후 소식지 코드 수정은 insu/index.html 대상.
