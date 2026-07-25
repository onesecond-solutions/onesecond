---
세션 종료: 2026-07-25 (공개 전략 1차 대규모 진행)
주요 마감: PR #1404~#1429 — 로그인 전 공개 홈 + 정적 /insurance/ 6축 카테고리·문서 펼침 3종·공개 검색·WO-7 색인 / 고객관리 카드 개편·삭제 페이지 유지
생성: Claude Code (총괄팀장, 대표 세션, 데스크톱 앱)
---

# 세션 인계 노트 — 2026-07-25 · 원세컨드 공개 전략 1차

**총괄팀장 Code · 대표 세션 · 병합 전 head 검증·단독 PR·담당자 위임+총괄 직접검수 준수**
**main `6730c03`. 모든 PR 라이브 반영·검수 완료.**

## 이번 세션 한 줄
공개 전략 기준서/작업지시서(김실장→기획팀장→총괄 §8·§11 실측→대표 착수판단) 착수. **원세컨드 = 일반인이 로그인 없이 보험지식을 검색·열람하는 공개 서비스가 기본, 설계사 로그인 시 업무기능 추가.** 로그인 전 공개 흐름(홈→검색/카테고리→문서 펼침)을 라이브까지 완성.

## 완료 (PR #1404~#1429)
### 로그인 전 공개 홈 (app.html `is-guest`)
검색기 + 6축 카드만(`_hs2RenderHub` is-guest 분기) · 사이드메뉴·워크스페이스·딸깍·메모 숨김 · 검색기 좌측 시계로고(전 아이콘+onesecond/후 아이콘만) · 우측 '설계사 로그인 →' · 문구 '내 보험, 무엇이 궁금하신가요?'/placeholder '궁금한 보험이나 보장 내용을 검색해보세요' · 비로그인 공개검색 `_guestPublicSearch`(공개 원장 customer_ok만, `_runSearchV2`·내부DB 미경유=유출0) · 검색결과 카테고리식 레이아웃(`.gps-on`).

### 정적 공개 경로 `/insurance/` (대표 확정: 카테고리 최종=정적, app.html SPA는 로그인 내부용 잔존)
- 6축 카테고리: `silson/ cancer/ brain-heart/ surgery/ care-dementia/ other/`
- 문서 펼침 3종: `silson-history/ cancer-treatment-history/ caregiver-history/`
- **방식 = 기존 SPA 디자인 픽셀 복제**: knowledge-category.css + app-core.css + app-views.css 3링크 + `#v-axis-medical`·`kc-*` 동일 마크업, 검색기 `hs-*` 인라인 이식.
- **열고닫힘 착시**: 카테고리(접힘 `/insurance/silson/`) ↔ 문서(펼침 `/insurance/silson-history/`)가 공통 껍데기 동일 → 목록 클릭=문서로(펼침), 문서제목 '접기' 클릭=카테고리로(닫힘). 문서 우측 v3side 레일(목차·PDF·링크복사·관련자료).
- 설계사 전략 문구 제거(실손5·암3, 간병0). 홈 6축 카드 url→정적 카테고리 연결.
- WO-7 색인: robots `/insurance/` Allow + sitemap.xml(공개 9URL, `/pages/` 차단 유지) + OG/twitter/canonical/JSON-LD.

### 고객관리(salesnote) — 담당자 위임·care 무영향 diff 검수
카드=이름·생년월일·전화번호·삭제(삭제 외 클릭→상세) + 삭제 후 보던 페이지 유지(`_ciDelete` done()에 salesnote 가드로 현재 `_ciPage` 리로드·0건시 이전페이지). ⚠️`_ci*`는 상담관리(care) 공유 컴포넌트 → salesnote 분기에서만.

## 교훈(박제)
1. **롤백 대참사**: /insurance/를 임의 새 디자인으로 만들었다 대표 대노→전체 롤백(#1407). **대표 확정 디자인을 승인없이 바꾸는 건 월권. 기존 디자인 복제가 기본.**
2. **스크롤 검증**: overflow 차단(app-core body{overflow:hidden} 상속)을 scrollHeight로만 봐서 오판. **실제 `scrollTo` 동작 검증 필수**(#1422).
3. **화면 경로 혼동**: 대표가 `app.html?view=axis-medical`(SPA) 보고 정적 열고닫힘 못 봄→홈카드 정적 연결(#1420).
4. **담당자 위임 + 총괄 실검수**: 반복작업은 general-purpose 위임, 총괄이 preview 실렌더·diff·문구grep으로 검수 후 병합. worktree 격리 불가→담당자 순차.

## 남은 것 (대표 지정 대기)
- **WO-8 옛 변천사 홈 타일 3종 삭제** — 진입로 확보됐으나 "홈은 대표가 지시" 원칙이라 **확정 대기**.
- **WO-6 설계사 전용 자료 버튼** — 제거한 설계사문구(실손5·암3)를 로그인 설계사 `[설계사 전용 자료 보기]` 레이어로. ⚠️보호 저장 위치 없음, 1차는 UI만.
- **허브 `/insurance/index.html` 부재**(롤백 후 미재생성, sitemap서 제거). 대표 지정시 생성.
- 나머지 축(뇌심장·수술비) 문서 · '기타' 카드 성격 · 검색 keywords 원장 편입.

## 상태
- main `6730c03`. 워킹트리 clean. GitHub Pages 라이브.
- 관련 메모리: `project-knowledge-registry-track`(상세) · `feedback-daepyo-honorific`.
