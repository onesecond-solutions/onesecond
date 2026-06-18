# 크롬 의뢰서 — 스크립트 검색 정화 마이그레이션 실행 (2026-06-18)

> 대상: 검수팀(Claude Chrome). 대표님이 이 문서를 Chrome에 전달.
> 실행 SQL 원본: `docs/ops/2026-06-18_scripts_search_text.sql`
> raw URL: https://raw.githubusercontent.com/onesecond-solutions/onesecond/main/docs/ops/2026-06-18_scripts_search_text.sql

아래 절차를 순서대로 수행하고, 각 단계 결과를 대표님께 보고 후 승인받고 진행한다.

## 0단계 — DB 프로젝트 확인 (필수, 다른 모든 행동에 앞서)
Supabase Dashboard 왼쪽 상단 프로젝트가 **`onesecond-v1-restore-0420`** 인지, 또는 URL 프로젝트 ID가 **`pdnwgzneooyygfejrvbg`** 로 시작하는지 확인.
→ 아니면 즉시 중단하고 대표님께 보고. (첫 진입 시 구버전이 먼저 열리는 함정 주의)

## 1단계 — SQL 원문 가져오기 (GitHub raw)
위 raw URL 내용을 그대로 가져와 화면에 전문 표시.

## 2단계 — 내용 확인 + 대표님 승인
가져온 SQL 전문을 대표님께 보여주고 다음을 명시:
- 블록 `[1]` = `ALTER TABLE scripts ADD COLUMN IF NOT EXISTS search_text text;` (DDL, 멱등)
- 블록 `[2]` = `UPDATE`: script_text/highlight_text의 HTML 태그·엔티티 제거 → search_text 백필 (빈 것만, 멱등)
- 블록 `[3]` = 검증 SELECT (total / filled / still_html)
- 데이터 손실 없음(script_text 원본 보존). 활성 스크립트 81건 중 67건 HTML 대상.

→ 대표님 **"실행 승인"** 받기 전 실행 금지.

## 3단계 — 실행 (승인 후, SQL Editor)
- 블록 `[1]` RUN → 성공 확인
- 블록 `[2]` RUN → 갱신 행 수 확인
- 블록 `[3]`을 **별도 RUN**(트랜잭션 분리)으로 검증 실행

## 4단계 — 결과 보고
블록 `[3]` 결과(total / filled / still_html)를 대표님·총괄팀장께 보고.
- 기대값: **filled ≈ 81**(전건 채워짐), **still_html = 0**(태그 잔존 0)
- still_html > 0 이면 보고만 하고 추가 조치는 총괄팀장 대기 (억지 재실행 금지)

## 주의
- 위 4단계 외 임의 SQL 실행 금지. DDL/UPDATE는 이 파일 내용만.
- 변경 후 app.html 검색이 search_text를 읽도록 전환하는 작업은 총괄팀장(Code)이 별도 PR로 진행.
