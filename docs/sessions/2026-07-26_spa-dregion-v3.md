---
세션 종료: 2026-07-26 (로그인 후 SPA D영역 지식문서 + WO-6 설계사 전용 + V3 타이포)
주요 마감: PR #1431~#1450 — 공개본 문구 감사·표기통일 / WO-6 설계사 전용(DB+공용UI) / 로그인 후 SPA D영역 인라인(A안 공용모듈, 변천사 3종) / V3 타이포 통일 착수
생성: Claude Code (총괄팀장, 대표 세션, 데스크톱 앱)
---

# 세션 인계 노트 — 2026-07-26 · 로그인 후 SPA D영역 + 설계사 전용 + V3 타이포

**main `730e70d`. 모든 PR 라이브 반영·검수 완료.** DB apply 3건(advisor_doc_contents·seed·advisor_contents_generic) production-db workflow_dispatch로 AI팀 종결(대표 클릭 불요).

## 이번 세션 한 줄
공개본 3종 문구 감사·표기통일 → WO-6 설계사 전용 자료(DB advisor_contents + 우측레일 섹션·슬라이드인 공용 UI) → **로그인 후 SPA D영역에서 지식문서 인라인 열고닫힘(A안 공용모듈·변천사 3종)** → V3 타이포 통일(tokens-v3.css + 변천사 본문·레일·패널·스크립트).

## 완료 (PR #1431~#1450)

### 공개 지식(변천사 3종) 문구·표기
- #1431 공개 카테고리 표기 통일: `간병`→`간병·치매`, `기타`→`그 외`(홈카드·정적 9문서, slug/데이터키 무변경).
- #1432 공개본 문구 소비자 관점(김실장 판정): 실손 유지·암 판매자시점 2곳 수정+내부검증메모 삭제(4세대 비례형중단 웹 재검증)·간병 3인칭 제거·보장금액 유지.

### WO-6 설계사 전용 자료 (열람정책: 파일럿=임실장+admin → 정식=설계사 전체, 함수 교체 전환)
- #1433 `advisor_doc_contents`(구) 스키마 [DB apply]. 독립검수 반영(search_path 고정·anon revoke·published게이트).
- #1436 실손 파일럿 시드 1건 [DB apply].
- #1439 **`advisor_contents`(범용, 안 B)** [DB apply]: source_type/source_id/section_key + content_blocks jsonb(paragraph/callout/checklist/script) + UNIQUE. 파일럿 1건 이관. 구 테이블은 롤백자산 유지.
- #1434 프런트 초안(구 테이블) → #1441 **공용 UI 개편**: 우측 레일 "설계사 전용" 섹션 + 슬라이드인 패널(딤·PC460/모바일전체·내부스크롤·닫기·ESC). `advisorPanelInit({sourceType,sourceId,mount})` 일반화.
- #1445 레일 버튼 네이밍 "설계사 전략 보기"→"**설계사 전용 자료**". #1444 패널 타이포 V3.
- ⚠️ **RLS/게이트 = 표시통제 아닌 서버 보호.** anon REST 차단 실측 확인(permission denied).

### 로그인 후 SPA D영역 인라인 (A안 = 공개본 무접촉 공용모듈, 대표 확정)
- #1442 **실손 파일럿**: `js/silson-history.js`(데이터+렌더러 공용, `renderInto`/`renderRailInto`) + `css/silson-history.css`. `knowledge-category.js` `KC_INLINE` 레지스트리로 문서 클릭→D영역 인라인 펼침/접힘+레일+슬라이드인. `app.html:showView('silson')` 로그인=`axis-medical{expandDoc}`(pages 바운스 폐지), 비로그인=정적. `scripts/verify_silson_shared.mjs` 공개본↔SPA 자동 대조.
- #1448 **암·간병 확장**: `cancer-treatment.js`·`caregiver-history.js`(+css)·verify 2종. `KC_INLINE`로 3문서 일반화(실손 무회귀).
- 홈카드 라우팅: #1437 로그인=SPA 시도→#1438 원복(정적 인라인 유지). 최종 = 홈카드는 로그인·비로그인 모두 정적 진입로 유지하되, 문서 클릭 시 로그인은 SPA D영역 인라인(app.html showView 분기). **공개 정적 경로(/insurance/)는 외부 검색·AI 수집 담당으로 무접촉.**
- #1435 로그인시 '설계사 로그인' 숨김 → 근본원인(홈카드 라우팅) 오판, revert.

### V3 타이포 (V2 색상 유지 + V3 타이포, 본문 16px 확정. 토큰정의≠화면변경 분리)
- #1449 **`css/tokens-v3.css` 신설**(--text-* 8단·--fw-*(800금지)·색 v2별칭, app-core 직전 로드, 시각변화 0) + **변천사 3종 본문 V3**(섹션18/700·본문16·표14/700·800→700, 공개본↔SPA 동일, additive override, SEO 무접촉). 실측 완료.
- #1446 실손 레일 V3 → #1450 암·간병 레일 V3(라벨 12/700·14·13). #1447 레일 라벨 `.lb` 표시 복구(app.html 전역 `.lb` 오버레이 충돌 → override). #1440 스크립트 페이지 타이포 확대.

## 설계사 전용 콘텐츠 현황 (시드 대기)
- DB `advisor_contents` published = **실손 파일럿 1건뿐.** 암·간병 = 0건(버튼 미생성).
- 담을 후보: **암 3건**(원본 `pages/cancer-treatment-history.html` 상담판단·산정가이드·단독가입), **간병 0건**(노골 전략 없음). → 대표 문구 확정 후 시드.

## 교훈(박제)
1. **로그인 후 = SPA D영역만 교체.** 정적 공개문서 개념을 로그인 동선에 끌고오지 말 것. 로그인 동선 외부(/insurance·/pages) 이동 금지. 표면(버튼)이 아닌 흐름(라우팅)을 고칠 것. → 메모리 `feedback-login-after-spa-dregion`. (07-26 작업↔원복 반복으로 대표 격노 "토큰 낭비 전략이냐")
2. **소스 대조 ≠ 화면 대조.** "동일"이라 보고할 때 소스인지 실제 렌더인지 구분. 화면 대조는 실제 렌더 확인 후에만. (axis-* 전체공개라 총괄이 비로그인으로 SPA D영역 실측 가능 — 회피 말 것.)
3. **공개본 SEO 우선.** 공개 HTML 본문·구조·메타 무접촉(타이포 CSS 값만 허용). 공용모듈은 "완전 단일원천"이 아니라 자동 대조로 동일성 보장(빌드 없음).
4. **DB DDL/RLS = C등급.** workflow_dispatch → production-db → gh api로 AI팀 승인 실행(current_user_can_approve=true, 대표 클릭 불요). 독립 보안검수(search_path·anon·published게이트) 후 apply.

## 남은 것
- **설계사 전용 콘텐츠 시드**: 암 3건 후보 대표 확정 → advisor_contents 시드. 간병 콘텐츠 없음.
- **2차 정식 전환**: 파일럿 검수 후 `os_can_read_advisor_docs()` 함수 교체(임실장→설계사 전체). 마이그레이션 하단 블록 준비됨.
- **V3 타이포 순차 확대**: `.ttl`/`.sub`(app-views.css:905, 94곳 공용·800·21px) 등 공용 클래스·기존 전체 화면은 화면 단위 순차 전환(이번 미착수, 대표 지시). 800 굵기 라이브 ≈254곳.
- 변천사 확장: 뇌·심장/수술비 문서(현재 카테고리만, 문서 없음), '기타(그 외)' 카드 성격.
- 구 `advisor_doc_contents` 폐기(전체 전환 확인 후 별도).

## 상태
- main `730e70d`. 워킹트리 clean(추적). 루트 tmp-insurance-factory-*.png 미추적 다수(정리 보류).
- 관련 메모리: `feedback-login-after-spa-dregion`(신규) · `feedback-goal-proven-stop-fighting-tools` · `feedback-keep-it-simple-not-overthink`.
