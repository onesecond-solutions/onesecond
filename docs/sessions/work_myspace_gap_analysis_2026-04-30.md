# myspace.html 갭 분석 v2 — 3개 탭 전체 비교

**작성일:** 2026-04-30
**목적:** `pages/myspace.html` 라이브 승격 진입 전, 3개 탭 + 다중 뷰 + 모달 + Supabase 연동까지 **소실 위험 영역 전수 식별**.
**비교 대상:**
- 시안: `claude_code/design_test/myspace/v1-full.html` (317줄)
- 라이브: `pages/myspace.html` (1213줄)

**큰 그림 정합성:** ✅ `_INDEX.md` Phase 1 5번 `pages/myspace.html` 진입 전 사전 분석. 코드 변경 0건.

---

## 0. 한 줄 요약

> **시안 통째 승격 시 라이브 myspace의 약 85%가 소실된다.** 시안은 `scripts` 단일 탭의 더미 카드 4건 데모만 제공할 뿐, library/leader 탭 콘텐츠·작성/추가 뷰·리더 모달·검색·페이지네이션·빈 상태·Supabase 연동 일체가 비어 있다. **board/index/scripts 패턴의 "통째 승격"은 본 페이지에 부적합** — 부분 흡수(home 패턴) 또는 시안을 "참고만" 하고 라이브 보존하는 별도 트랙이 필요하다.

---

## 1. 탭별 비교

### 1-1. ① scripts (나의 스크립트) 탭

| 항목 | 시안 | 라이브 |
|---|---|---|
| 탭 존재 | O (active) | O (active 기본) |
| 헤더 영역 | `pg-page-header` (📁 MY SPACE · 나만의 도구 모음) | **없음** (탭바부터 바로 시작) |
| 안내 박스 | **없음** | O — `mys-card` + `mys-guide` ul 3줄 (📌 고민했던 순간의 멘트는 남겨두세요 / 📌 한 줄 핵심 멘트 / 📌 짧고 선명하게) |
| 검색 박스 | **없음** | O — `mys-search` 우측 (`oninput="filterScriptList(this.value)"`) |
| 콘텐츠 표현 | **카드 그리드** (`mys-grid` repeat auto-fill 280px) | **리스트** (`mys-list` + `mys-item` 행 단위) |
| 컬럼 수 | auto-fill (PC 3~4열) | 1열 |
| 카드 구성 | stage 배지 + 제목 + 본문 3줄 클램프 + 메타(수정일/사용회수★) | 번호(01~) + 제목 + sample 배지 + 60자 preview + 작성일 + 리더 토글(⭐) + 더보기(…) |
| 페이지네이션 | **없음** (4건 정적) | O — 10건/페이지 (`_PAGE_SIZE`, `_buildPaging`) |
| 빈 상태 UI | **없음** | O — ✍️ + "아직 저장된 스크립트가 없습니다" 안내 |
| CTA 버튼 | 우상단 "✏️ 새 멘트 작성" | 리스트 하단 가운데 "스크립트 작성하기" (380px) |
| 클릭 동작 | `alert('[TEST] 멘트 상세 열기')` | 더보기 → 삭제 / 본문은 클릭 미연결 (상세 모달 없음 — leader 탭만 있음) |

**라이브 추가 기능 (시안 0건):**
- ⭐ **샘플 스크립트 병합 표시** — `is_sample=true` 전체 + 본인 `owner_id` 결과 병렬 fetch, 중복 제거 후 결합
- ⭐ **리더 토글 버튼** — `role` ∈ {manager, branch_manager, admin} 일 때만 노출. 클릭 시 `is_leader_pick` PATCH
- 삭제 기능 (`deleteScript`)
- 검색 키워드는 title + script_text(태그 제거) 양쪽 매칭

---

### 1-2. ② library (나의 자료) 탭

| 항목 | 시안 | 라이브 |
|---|---|---|
| 탭 존재 | O (버튼만, 클릭 시 active 토글만) | O |
| 안내 박스 | **시안 콘텐츠 없음** — 클릭해도 화면 변화 없음 | O — `mys-guide` 3줄 (📌 설명이 길어질 때 대신 / 📌 한 번 쓴 자료 / 📌 지금 당장 써먹을 자료) |
| 검색 박스 | — | O — `filterLibraryList` |
| 콘텐츠 표현 | — | 리스트 (`mys-item` 동일 구조) |
| 카드 구성 | — | 번호 + 제목 + 첨부 태그(📎파일 🔗링크 📝메모 🖼이미지) + 60자 description preview + 작성일 + 더보기(…) |
| 페이지네이션 | — | O — 10건/페이지 |
| 빈 상태 UI | — | O — 📁 + "아직 저장된 자료가 없습니다" 안내 |
| CTA 버튼 | — | 리스트 하단 가운데 "나의 자료 추가하기" (`openLibraryAddView()`) |

**라이브 전용 (시안 완전 부재):**
- ⭐ **첨부 4종 동시 저장** (file/link/memo/image) — 한 자료 안에 복수 형식
- ⭐ **Storage 업로드** — `uploadFileToStorage`, bucket `library_files`, 10MB(파일)/5MB(이미지) 제한
- 삭제 기능 (`deleteLibrary`)

---

### 1-3. ③ leader (리더 추천) 탭

| 항목 | 시안 | 라이브 |
|---|---|---|
| 탭 존재 | O (버튼만) | O |
| 안내 박스 | **시안 콘텐츠 없음** | O — `mys-card` 본문 + `mys-guide` (리더 role일 때만 ul 3줄 노출, 일반은 desc 한 줄만) |
| 검색 박스 | — | O — `filterLeaderList` (title + script_text 매칭) |
| 콘텐츠 표현 | — | 리스트, 행 끝에 ▶ |
| 카드 구성 | — | 번호 + 제목 + stage 한글 라벨(brown pill) + 60자 preview + 작성일 + ▶ |
| 페이지네이션 | — | O |
| 빈 상태 UI | — | O — ⭐ + "아직 공유된 스크립트가 없습니다" |
| 클릭 동작 | — | 행 전체 클릭 → **리더 추천 상세 모달** (`openLeaderModal(id)`) |
| CTA 버튼 | — | **없음** (작성·추가는 scripts 탭에서) |

**라이브 전용 핵심:**
- ⭐ **리더 추천 상세 모달** (`leader-modal-overlay` + head/body/footer 3섹션)
  - head: brand 그라데이션 배경, 제목 + stage 라벨, ✕ 닫기
  - body: HTML 콘텐츠 분기 렌더 (`isHtml ? body : body.replace(/\n/g,'<br>')`), `body.style.overflow='hidden'` 잠금
  - footer: 닫기 버튼
- ⭐ role 분기 안내 — 리더(manager/branch_manager/admin)에게만 "⭐ 버튼으로 공유 안내" 가이드 노출

---

## 2. 공통 영역 비교

| 항목 | 시안 | 라이브 |
|---|---|---|
| 탭바 위치 | `pg-tab-block` 헤더 아래 | `pg-tab-block` 최상단 (헤더 없음) |
| D 영역 페이지 헤더 (`pg-page-header`) | **있음** — 📁 + "MY SPACE · 나만의 도구 모음" + 보조 카피 | **없음** |
| 푸터 띠 (`pg-bottom-bar`) | "- 내가 만든 한 줄이, 계약 한 건을 만듭니다 -" (시안: 회색 배경) | 동일 카피, **brand 단색 배경** + 흰 글씨 |
| 작성 뷰 (`view-write`) | **없음** | O — 3필드 (제목·스크립트·핵심 멘트, 모두 필수) + 작성 가이드 4줄 토글(`toggleGuide`) + "← MY SPACE로 돌아가기" 백버튼 |
| 자료 추가 뷰 (`view-library-add`) | **없음** | O — 제목·설명 + 첨부 4종 토글(`toggleAttachSection`) + 자료 추가 가이드 4줄 토글(`toggleLibraryGuide`) |
| 리더 추천 상세 모달 | **없음** | O (위 섹션 1-3 참조) |
| 작성 모드 시 푸터 숨김 (`setWriteModeVisual`) | **없음** | O — `view-write`/`view-library-add` 진입 시 `.pg-footer-block` display:none |
| Quick 드롭다운 + 오버레이 | **없음** | ⚠️ **dead code 의심** — `window.overlayContent` 5항목(`회사별 BMI 심사기준`/`보험연령표`/`보험회사 결제정보`/`미러링 전 녹취 스크립트`/`원전산 설계 바로가기`) + `toggleQuick`/`openOverlay`/`closeQuick`/`closeOverlay` 정의되어 있으나, myspace.html DOM에는 `#quick-dropdown`/`#quick-overlay` 엘리먼트가 없음. app.html shell은 다른 ID(`#quickDropdown` camelCase) 사용. **이식 전 사용처 검증 필요** |
| 외곽 컨테이너 | `.pg-outer` (gap: var(--space-4)) | `.pg-outer` (배경 surface-2, padding 6px, gap 6px, **min-height:100%**) — 카드형 시각 분리 |

---

## 3. Supabase 데이터 연동 비교

### 3-1. 라이브 함수·테이블·컬럼 매핑

| 함수 | 테이블 | 컬럼 (select) | 비고 |
|---|---|---|---|
| `loadScriptsList` | `scripts` | id, title, script_text, highlight_text, **stage**, **is_leader_pick**, **is_sample**, created_at | `owner_id=eq.${userId}` + `is_sample=eq.true&is_active=eq.true` 병렬 |
| `loadLibraryList` | `library` | (select 없음 — 전체) | `owner_id=eq.${userId}` |
| `loadLeaderScripts` | `scripts` | id, title, **stage**, script_text, highlight_text, owner_id, created_at | `is_leader_pick=eq.true&is_active=eq.true` |
| `toggleLeaderPick` | `scripts` | PATCH `{ is_leader_pick: bool }` | role 가드: manager/branch_manager/admin |
| `saveScriptToSupabase` | `scripts` | POST | title/script_text/highlight_text/owner_id |
| `saveLibraryToSupabase` | `library` | POST | title/description/file_url/link_url/memo_text/image_url |
| `uploadFileToStorage` | Storage `library_files` | — | 파일·이미지 업로드, public URL 반환 |
| `deleteScript` / `deleteLibrary` | `scripts` / `library` | DELETE `id=eq.${id}` | confirm 후 실행 |

**stage 한글 라벨 매핑 (`_STAGE_LABEL`)** — 라이브에서만 정의:
```
opening: 도입 인사 / opening_rejection: 도입 반론 / need_emphasis: 필요성 강조
need_emphasis_2: 필요성 강조 2차 / situation_check: 상황 확인 / analysis: 보장 분석
product: 상품 설명 / objection: 반론 대응 / closing: 클로징 / closing_second: 2차 클로징
```

### 3-2. 시안이 가정하는 데이터 형태

시안 카드에 표시된 정보:
- **stage 배지** (4종: 도입반론 / 필요성 강조 / 클로징 / 반론 대응) → 라이브 `stage` enum과 **부분 매핑 가능** (`opening_rejection`/`need_emphasis`/`closing`/`objection`)
- **수정일 메타** ("수정: 2일 전") → 라이브에 **`updated_at`** 컬럼 사용 추정. 라이브 select에는 `updated_at` 미포함, `created_at`만 표시 (`YYYY.MM.DD` 포맷)
- **사용 회수 메타** ("사용: 12회 ★") → 라이브 `scripts` 테이블에 **`usage_count` 컬럼 부재** ★ 표시(34회)는 인기 표식 추정
- **본문 3줄 미리보기** → 라이브는 `highlight_text || script_text` 60자 잘라 1줄

### 3-3. 신규 컬럼 필요 여부

시안 카드 표현을 그대로 재현하려면:

| 컬럼 | 현재 상태 | 추가 필요 여부 | 코멘트 |
|---|---|---|---|
| `usage_count` (int) | 부재 | △ — 카드 메타 표시용. 시안의 ★ 표식은 hot pick 의미. **PoC 단계에서는 카드 표시만 폐기하고 추가 보류 권장** |
| `updated_at` (timestamp) | 부재 추정 (확인 필요) | △ — `created_at` 만 라이브 select에 사용. "수정: N일 전" 표현은 별도 컬럼 + 상대시간 포맷터 필요 |
| `stage` enum | **존재** | — | 시안 4종 배지를 라이브 10단계 enum에 매핑하여 한글 라벨 출력하면 무손실 흡수 가능 |

**결론:** 시안 카드 그리드를 채택할 경우 `usage_count`/`updated_at` 추가가 필요하나, 카드 그리드 자체가 라이브의 리스트 패러다임(번호/검색/페이지/모달)과 호환되지 않아 **카드 그리드 자체 도입을 보류하면 신규 컬럼은 필요 없다.**

---

## 4. 갭 분석 결론

### 4-1. 시안 통째 승격 시 소실 위험 영역 (전수)

**구조 단위:**
1. ❌ **library 탭 콘텐츠 일체** (안내 + 검색 + 리스트 + CTA + 빈 상태 + 페이지네이션)
2. ❌ **leader 탭 콘텐츠 일체** (위 + ▶ 클릭 → 모달)
3. ❌ **`view-write` 작성 뷰** (3필드 폼 + 가이드 토글 + 백버튼 + setWriteModeVisual)
4. ❌ **`view-library-add` 자료 추가 뷰** (제목·설명 + 첨부 4종 토글 + Storage 업로드)
5. ❌ **리더 추천 상세 모달** (`leader-modal-overlay` head/body/footer + body 스크롤 잠금)

**기능 단위:**
6. ❌ **검색 박스** 3개 (각 탭마다)
7. ❌ **안내 박스 📌** 3개 (각 탭 상단 ul 3~4줄)
8. ❌ **페이지네이션** (10건/페이지, prev/next/숫자)
9. ❌ **빈 상태 UI** 3개 (각 탭 ✍️/📁/⭐ + 안내 카피)
10. ❌ **샘플 스크립트 병합 표시** (`is_sample=true` 병렬 fetch + 중복 제거)
11. ❌ **리더 토글 ⭐ 버튼** + role 가드 (manager/branch_manager/admin)
12. ❌ **stage 한글 라벨 매핑** (`_STAGE_LABEL` 10단계)
13. ❌ **삭제 기능** (deleteScript / deleteLibrary)

**Supabase 연동:**
14. ❌ `loadScriptsList` / `loadLibraryList` / `loadLeaderScripts`
15. ❌ `saveScriptToSupabase` / `saveLibraryToSupabase`
16. ❌ `uploadFileToStorage` (Storage `library_files` bucket)
17. ❌ `toggleLeaderPick` PATCH

**부수 자산:**
18. ⚠️ `window.overlayContent` 5항목 (BMI/연령표/결제정보/녹취/원전산) — **dead code 의심, 별 트랙 검증 후 처리**

### 4-2. 라이브 보존 필수 요소 (시안에 없지만 사용자 가치 기준 유지)

| 우선순위 | 요소 | 사유 |
|---|---|---|
| 🔴 필수 | library 탭 + 자료 추가 뷰 + Storage 업로드 | 본 페이지의 핵심 가치 절반. 시안은 단어조차 빠짐 |
| 🔴 필수 | leader 탭 + 상세 모달 + ⭐ 토글 + role 가드 | 리더 → 팀원 공유 동선의 유일한 진입점 |
| 🔴 필수 | 작성 뷰(view-write) + 가이드 토글 | 빈 카드를 누르고 어디로 가나? 시안은 alert 만 |
| 🟡 보존 | 안내 박스 📌 (3탭 모두) | 첫 진입 사용자 가이드. 라이브 카피는 검증된 톤 |
| 🟡 보존 | 검색 박스 (3탭) | 누적되면 필수. 시안은 카드 그리드라 우회했을 가능성 |
| 🟡 보존 | 페이지네이션 + 빈 상태 | 데이터 없는 첫 사용자 / 데이터 많은 시니어 양 끝 케이스 |
| 🟡 보존 | 샘플 스크립트 병합 | 신규 가입자 데모용. 빈 페이지 경험 회피 장치 |
| 🟢 가능 | stage 한글 라벨 매핑 | 시안 brown 배지를 흡수해도 라이브 _STAGE_LABEL 그대로 활용 |

### 4-3. 시안에서 흡수 가치가 있는 요소 (부분 흡수 권장 후보)

라이브 통째 보존 + 시안 일부만 흡수 시 후보:

| 요소 | 흡수 가치 | 위험 |
|---|---|---|
| ✅ **`pg-page-header`** (📁 MY SPACE · 나만의 도구 모음 + 보조 카피) | **높음** — 라이브에 헤더 카드가 없어 진입 시 페이지 정체성이 약함 | 낮음 (블록 추가만) |
| ✅ **A1 슬림 헤더 + 사스브라운 그라데이션 통일감** | 중간 — app.html shell 책임이라 myspace.html 변경 불필요 | — |
| △ **mys-card 카드 그리드 디자인 토큰** (radius/shadow/transform hover) | 중간 — 리스트 행 단위에 일부 적용 가능 (예: `mys-list-shell` hover) | 낮음 |
| ❌ **카드 그리드 패러다임 자체** | 낮음 | **높음** — 검색·페이지·모달과 충돌, 데이터 누적 시 UX 붕괴 |
| ❌ **stage 4종 brown 배지** | 낮음 — 라이브 _STAGE_LABEL 10단계 + brown pill 로 이미 구현됨 | — |

---

## 5. 적용 방식 권고

### 권고 (A): 부분 흡수 (home 패턴) — **강력 권장**

**근거:**
- 시안의 **15% 미만 (단일 탭 카드 그리드 데모)** 이 라이브의 **85% 이상 (3탭 + 다중 뷰 + 모달 + Supabase)** 을 가린다
- 시안은 **데모 목적의 정적 mockup**이며, 라이브의 데이터 모델·플로우를 알지 못한다
- board/index/scripts 패턴(통째 승격)은 **시안 콘텐츠가 라이브의 80%+ 면적을 커버**할 때만 안전했다 — myspace는 정반대

**흡수 단계 (제안, 작업지시서 발행 시 별도 결정):**
- M-1: `pg-page-header` 추가 (📁 + 카피) — 페이지 정체성 회복
- M-2: 안내 박스/리스트 행에 시안 token (radius/shadow/hover) 일부 흡수 (선택적)
- M-3: A1 헤더는 app.html shell 트랙으로 분리 (myspace 별 책임 아님)

### 권고 (B): 시안 폐기 + 라이브 유지 (대체안)

`pages/myspace.html`은 라이브가 이미 가장 진화된 상태. design_test 시안은 "초기 디자인 탐색용 참고 자료"로 보존하고, 본 페이지 승격 트랙을 **Phase 1에서 제외**하거나 **별 트랙 디자인 리프레시**로 분리할 수 있다.

### 비권장: (C) 시안 통째 승격 (board 패턴)

- 시안 통째 승격 시 위 4-1의 18개 항목 모두 소실
- 데이터(`scripts`/`library`/Storage) 손상은 없지만 UI는 백지 상태로 회귀
- 사용자 입장에서 **자료 작성/저장 불가능**한 상태가 됨 — 즉시 사용 불가

---

## 6. 작업지시서 발행 전 결정 대기 항목

승격 진입 시 팀장님 결정이 필요한 항목:

1. **적용 방식** — (A) 부분 흡수 / (B) 시안 폐기 / (C) 통째 승격 중 선택
2. **`pg-page-header` 흡수 여부** — 라이브 페이지 정체성 강화 차원
3. **dead code 의심 `overlayContent` 처리** — 사용처 검증 후 (a) 폐기 / (b) app.html 빠른실행으로 이관 / (c) 보존
4. **카드 그리드 디자인 토큰 일부 흡수 여부** — `mys-list-shell` 등 컨테이너에 hover/shadow 추가
5. **`pg-bottom-bar` 배경색** — 시안 회색 vs 라이브 brand 단색 (현재 라이브 우세)
6. **Phase 1 우선순위 재검토** — myspace.html을 Phase 1에서 제외/연기/별 트랙 분리할지

---

## 7. 부록 — 라이브 함수 인벤토리 (이식 보존 체크리스트)

라이브 myspace.html이 정의하는 `window.*` 함수 (총 27개):

**뷰 전환:**
- `openWriteView` / `closeWriteView` / `openLibraryAddView` / `closeLibraryAddView`
- `setWriteModeVisual` / `renderMySpaceView` / `switchMySpaceTab`
- `saveAndReturnToMySpace` / `saveAndReturnToLibrary`

**가이드 토글:**
- `toggleGuide` / `toggleLibraryGuide` / `toggleAttachSection`

**Supabase CRUD:**
- `saveScriptToSupabase` / `saveLibraryToSupabase`
- `loadScriptsList` / `loadLibraryList` / `loadLeaderScripts`
- `deleteScript` / `deleteLibrary`
- `toggleLeaderPick` / `uploadFileToStorage`

**렌더링·페이지·검색:**
- `renderScriptsList` / `renderLibraryList` / `renderLeaderList`
- `goScriptPage` / `goLibraryPage` / `goLeaderPage`
- `filterScriptList` / `filterLibraryList` / `filterLeaderList`
- `_buildPaging` (공통 헬퍼)

**파일 입력:**
- `handleFileSelect` / `handleImageSelect`

**모달:**
- `openLeaderModal` / `closeLeaderModal` / `closeLeaderModalBtn` / `_closeLeaderModalOverlay`

**Quick 오버레이 (dead code 의심):**
- `toggleQuick` / `openOverlay` / `closeQuick` / `closeOverlay`

**부트:**
- `initMySpace` + `_boot()` (appstate:ready 패턴)

**전역 상태:**
- `_allScripts` / `_allLibrary` / `_allLeaderScripts`
- `_PAGE_SIZE` (10) / `_scriptPage` / `_libraryPage` / `_leaderPage`
- `mySpaceViews` (3탭 템플릿 객체) / `overlayContent` (5항목)

---

*본 보고서는 시안·라이브 양측 코드 직접 비교(2026-04-30 기준) 기반이며, 추정·기억은 사용하지 않았다.*
