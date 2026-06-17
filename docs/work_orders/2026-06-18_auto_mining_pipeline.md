# 자동 채굴 파이프라인 (코덱스 없이 자체 서버) — 설계 박제

> 작성: 2026-06-17 총괄팀장(Code). 결재: 임태성 대표님 — "병목 풀렸으니 코덱스 없이 자동 채굴".
> 방식: **ocr-batch와 동일 패턴** = Supabase Edge Function + pg_cron. 외부 구독·세팅 0. 코덱스 트랙 폐기(병목 해소로 불요).
> 순서: 내일 1순위 = 검색 디테일 이식([[project_search_detail_migration_pending]]). 본 트랙은 그 다음(검색이 풀려야 채굴분이 검색에 보임).

## 원천 (대표님 결정)
1. **소식지** `newsletters.full_text` — 보험사 공식 자료(공용화 안전, 익명화 부담 낮음)
2. **바텀시트 게시판** — `posts`(board_type: qna 보험Q&A / insurer 원수사자료실 / navigation 네비) + `team_notices`(공지). ⚠️ 격리 자료 → 익명화 필수.

## 🚨 핵심 원칙 — 격리 자료의 공용화 = 익명화·일반화 강제
게시판 글은 지점/회사 격리(RLS). 채굴해 knowledge_entries(공용)로 올리면 격리가 깨짐. 그러므로:
- 채굴 = 원본 복사 X. **보험 "지식"만 추출 + 작성자·소속·지점·개인정보 제거.**
- **고객 식별정보(주민번호·연락처·고객명) 발견 시 그 항목 채굴 SKIP** (절대 공용화 금지). 자료함 고지 "고객 식별정보 금지"와 정합.
- 일반화된 보험 지식만 남김(누가/어디서 → 무엇을).

## 흐름 (mine-batch Edge Function + pg_cron)
```
pg_cron(서버 24시간, PC 무관)
 → mine-batch
   ① 미채굴 원천 N건 (newsletters / posts / team_notices, '채굴됨' 마커 없는 것)
   ② Gemini(2.5-flash): 보험 지식 항목으로 구조화 + 익명화
      출력 = 제목 / 카테고리 / 회사(있으면) / 본문(지식) / 태그
      가드: 보험 지식 없으면 skip(잡음), 개인/고객정보 있으면 해당부 제거 or skip
   ③ dedup: 기존 914건과 제목/내용 중복 차단
   ④ knowledge_entries INSERT (status='ai_draft', source_type=출처표시)
   ⑤ 원천에 '채굴됨' 마커(멱등, 재채굴 방지)
 → 어드민 승인 큐 → 대표님 'approved' → 검색 노출(RLS 정합, 오늘 복구)
```

## 재사용 자산 (신규 도입 0)
| 필요 | 이미 있음 |
|---|---|
| 서버 스케줄러 | pg_cron(ocr-batch-5min 가동중) |
| Gemini 호출 | ocr-extract/gemini-card/search-answer(키 존재) |
| 멱등 배치 | ocr-batch 마커 패턴 복제 |
| 승인 게이트 | knowledge_entries status='approved' RLS(2026-06-17 복구) |
| 비용 제어 | 틱당 N건 스로틀, idle=0 |

## 품질 트레이드오프
기존 사이클(워크플로 18에이전트 다단계 교차검증)보다 Edge Function 1패스는 거칠 수 있음. 보완:
1. ai_draft + 어드민 승인 게이트(무검증 노출 0)
2. dedup(중복 차단)
3. 필요 시 2패스(추출 → 자기검증 프롬프트, Gemini 2배지만 저렴)

## 선행 결정/확인
1. 원천별 '채굴됨' 마커 컬럼 (newsletters.mined_at / posts.mined_at / team_notices.mined_at) DDL — 멱등용
2. knowledge_entries 적재 스키마 컬럼 확정(제목/카테고리/회사/본문/태그/source_type/status) — 검색 디테일이 키로 쓰는 컬럼과 정합
3. 채굴 board_type 범위 확정 (qna/insurer/navigation/team_notices 중 보험지식 담긴 것만, community/hub 제외)

## 규모
중간. ocr-batch 패턴 복제 + Gemini 채굴/익명화 프롬프트 설계가 핵심. 검색 이식 다음 트랙.

관련: [[project_search_detail_migration_pending]] · [[feedback_search_source_rls_check_not_admin_only]] · [[project_ai_pipeline_v0]]
