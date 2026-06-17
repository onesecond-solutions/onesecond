# 검색 결과 디테일 → 라이브 통합검색 이식 (예정: 2026-06-18)

> 작성: 2026-06-17 총괄팀장(Code). 결재: 임태성 대표님 — **내일(6/18) 이식 트랙으로 예정**.
> 출발점: 검색 결과를 디테일하게(카테고리별·더보기·구글처럼) 보여달라는 대표님 지시(`docs/sessions/2026-05-21_0818.md`) + 김실장(전략실장) 방향. 사양 구현: `docs/sessions/2026-06-05_1811.md`(#428~431).
> 본질: `space_track_layout_principle_v1.md §7.2 "검색 홈(D영역) 본진 트랙"` (§7의 8할).

## 현 상태 (왜 이식인가)
- ✅ 디테일 검색결과(정답박스·집계박스·5/7섹션 뷰·유사어·티어랭킹·스니펫·더보기) = **어드민 테스트 페이지 `pages/knowledge-search-test.html`(388줄, 자족 IIFE)에 구현 완료**. 단 **knowledge_entries 단일 소스** 기준(클라 전량 로드).
- ❌ 실사용자 검색 `app.html`(`openSearch` 9196 / `_runSearch` 9225) = **6개 이질 소스 + 서버 ilike + RLS + 평면 목록 + AI 답변바**. 디테일 거의 없음.

## 이식 갭 (실화면에 없는 것 = 할 일)
1. 정답박스(제목 정확→핵심요약 승격)
2. 집계박스(N건+카테고리 count+키워드칩)
3. 5/7섹션 구조 뷰(핵심요약·관련상품·보험사별기준·실무·용어·보험사·원문보기)
4. 상위5 + 더보기 fold
5. 유사어 배지 + 동의어 확장(knowledge_synonyms `buildSyn`/`expand`)
6. 티어 랭킹(제목정확>제목부분>카테고리/회사>본문, 유사어=tier−1, 동점 최신)
7. 내부/정리자료/보험사별기준 배지 · disclaimer/confidence/출처 푸터 · 전체비교 딥링크
8. shortcut 카드(knowledge_entries shortcut row 기반)

## 추천 이식 방식 (저위험 — 범위 한정)
지식엔진(knowledge_entries)을 **"리치 소스"로 특별 취급**:
```
검색 결과
 ├─ AI 답변바        (위에 유지)
 ├─ 지식엔진 그룹    → 디테일 뷰 이식(정답박스·5섹션·유사어·티어랭킹, 승인분 전량 클라 로드)
 └─ 나머지 5개 소스   → 기존 평면 .sores 그룹 그대로
```
→ 이질성 문제를 가두고, 다소스 전면 통합(대공사)을 피함.

## 선행 블로커 (착수 전 확인 — 싸지만 필수)
1. `knowledge_synonyms` 일반 사용자(JWT) SELECT RLS 가능한지 확인 (안 되면 유사어 무효 — 어드민만 되던 knowledge_entries 사례 재발 주의, [[feedback_search_source_rls_check_not_admin_only]])
2. 실화면 `knowledge_entries` select 컬럼 확대 — 현재 4개(entry_id,title,body,category) → tags·source_company·canonical_company_name·source_type·entry_type·disclaimer·confidence·source_title·source_date·source_id·link_url·status 추가. 없으면 디테일 절반 빈칸.
3. **제품 결정: AI 답변바 vs 정답박스 공존** (둘 다 / 하나로 통합) — 대표님 결재 필요(코드 블로커 아님, 설계 충돌).

## 규모
**중간(medium).** 알고리즘(랭킹·동의어·정답/집계박스·5섹션·더보기)은 테스트페이지에 작성·검증됨 = 함수 단위 재사용 가능. 일의 대부분 = 다소스 파이프라인에 리치 뷰 끼우기 + 컬럼 확대 + RLS 확인 + 바텀시트 검색 패널(#sobody) 7섹션 레이아웃 조정. 복붙 아님, 백지 아님.

## 핵심 파일 레퍼런스
- 리치 렌더러: `pages/knowledge-search-test.html:199~337`
- 라이브 검색: `app.html:9217~9288`(_runSearch), 헬퍼 9138~9195, 상세열기 9357~9398
- 별개 모듈(혼동 주의): `LocalFind` 인슈어러 별칭 검색 `app.html:8960~8996` = 통합검색 아님(현재 페이지 내 찾기)

관련: [[space_track_search_first]] · [[project_admin_control_tower_track]]
