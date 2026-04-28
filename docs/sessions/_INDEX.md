# 세션 인덱스 — 현재 큰 그림 한눈에

> **마지막 갱신:** 2026-04-28
> **자동 갱신 도구:** `/session-end` 슬래시 커맨드 (5단계에서 본 파일 함께 갱신·커밋)
> **목적:** Claude Code가 작업 요청 진입 시 가장 먼저 읽고 큰 그림 정합성 검증.

---

## 🎯 현재 메인 트랙 — design_test 시안 라이브 승격

`claude_code/design_test/<page>/v1-full.html` 시안을 라이브 페이지(`pages/<page>.html` / `app.html` / `css/tokens.css`)에 승격하는 트랙.

승격 절차 (`claude_code/design_test/README.md` 명시): 팀장님 OK → 적용 버전 지정 → 별도 작업지시서 → 라이브 반영 → 시안 폴더는 레퍼런스로 유지.

### 승격 진행 현황 (2026-04-28 기준)

| 영역 | 상태 | 근거 커밋 |
|---|---|---|
| `css/tokens.css` (9 시안 :root 통합) | ✅ 완료 | `71f08b0` (4/27) |
| `app.html` (shell v1) | ✅ 완료 + 4/28 A1 라이트 톤 후속 | `5592749` (4/27) → `fd8b264` `1ab35c4` (4/28) |
| `pages/board.html` | ✅ **시안 통째 적용** | `ebb9b3b` (4/26 — design_test/board/v1-full.html 기반) |
| `index.html` | ✅ **시안 통째 승격 완료** + 헤더 라이트 톤 + 푸터 4컬럼 + 가입 폼 보강 (2026-04-28) | 승격: `83665c4` / 헤더: `001af79` / 푸터: `c2186a1` / 카드: `3342e9d` / 안내박스: `69f2678` |
| `pages/home.html` | 🔄 **부분 흡수 (C) 트랙 진행 중** — C-1 완료, C-2 라이브 검수 후 진입 대기 | C-1 hero 통계 3카드: `b854878` (2026-04-28). C-2 배지 dot / C-3 카피 / C-4 도넛 / C-5 C영역(별 트랙) 대기 |
| `pages/admin.html` | ❌ 미진행 (4/28 standalone hex 8건 토큰화는 별건) | — |
| `pages/myspace.html` | ❌ 미진행 | — |
| `pages/scripts.html` | ❌ 미진행 | — |
| `pages/news.html` | ❌ 미진행 | — |
| `pages/quick.html` | ❌ 미진행 | — |
| `pages/together.html` | ❌ 미진행 | — |

**다음 후보 (우선순위 확정 — `claude_code/design_test/README.md` Phase 1 표)**:
1. ✅ `index.html` (시안 통째 승격 + 헤더/푸터/가입 폼 fix 완료)
2. 🔄 `pages/home.html` (부분 흡수 (C) 트랙 — C-1 완료, C-2 라이브 검수 후 진입)
3. `pages/scripts.html`
4. ✅ `pages/board.html`
5. `pages/myspace.html`
6. `pages/news.html`
7. `pages/quick.html`
8. `pages/together.html` (board 패턴 복제)
9. `pages/admin.html` (Make.com 2단 네비)

### index.html 승격 사전 결정 6건 (2026-04-28 확정)

작업지시서 발행 시 아래 결정에 따라 진행:

| # | 항목 | 결정 |
|:---:|---|---|
| 1 | 적용 방식 | **(A) 시안 통째 승격** (board 패턴) |
| 2 | `inaction-section` 카피 | **(b) 폐기** |
| 3 | `vs-section` BEFORE/AFTER | **(a) 폐기** |
| 4 | `#togetherIntroOverlay` | **(a) 보존** — 시안 `together` 섹션 클릭 트리거에 연결 |
| 5 | 가입 폼 패러다임 | **(a) 시안 인라인 채택** (모달 제거) |
| 6 | privacy/terms 외부 페이지 전환 | **OK** — 시안 폴더의 `privacy.html` / `terms.html`을 라이브 루트로 복사. 라이브 인라인 `#privacy-overlay` 본문 폐기. 가입 동의 체크박스 클릭 시 외부 페이지 새 탭 진입 동선 유지 |

근거 보고서: `docs/sessions/work_index_gap_analysis_2026-04-28.md` (커밋 `902dca0`)

---

## 🚧 미해결 이슈 (인계)

1. **admin standalone hex 8건 토큰화 (4/28 머지 완료)** — admin/v1-full.html 시안이 통째 교체 디자인이라 시안 승격 시 .adm-mini-side 등 토큰화한 클래스가 모두 사라짐. **현재 main에 머지된 상태(`a0bdfbf`)로 둘지 / revert할지 결정 대기**.
2. **B 사이드바 "함께해요" 활성 오작동** — home 진입 시 잘못된 메뉴 활성. home.html과 무관한 app.html 책임 영역. home 작업 트랙과 분리 (별 트랙 진단 대기).
3. **home 라이브 시각 검수 미완** — C-1 완료(`b854878`) 후 hero 통계 3카드 + 4/28 회귀 영역(hexagon·노드·도넛) 라이브 표시 상태 검수 대기. OK이면 C-2 진입.
4. **logo03.jpg 라이트 헤더 사각형 경계** — 이미지 배경 옅은 그레이/아이보리(JPG, 투명 X). index/privacy/terms 헤더에서 경계 보이면 logo05.png 투명본 또는 이미지 편집 별 트랙 (라이브 검수 시점 결정).

---

## 📋 결정 대기 항목

1. **GPT v1 트랙 폐기 명문화** — 4/28 사용자 발언("심야 결정 무시")으로 묵시적 폐기 추정. `docs/decisions/2026-04-28_gpt_v1_deprecation.md` 같은 명시 문서 신설 권장.
2. **admin standalone hex 8건 처리** — 위 미해결 이슈 #2 참조.

### 📝 4/28 결정 완료 (참고)
- ✅ **design_test 트랙 활성 여부** — 메인 트랙으로 명시 확정 (`design_test/README.md` 갱신 + 본 _INDEX.md)
- ✅ **7페이지 승격 우선순위** — README Phase 1 표 1~9번 순서 확정
- ✅ **index.html 승격 사전 결정 6건** — 시안 통째 승격 + 헤더/푸터/가입 폼 fix 모두 완료
- ✅ **home.html 부분 흡수 결정 10건** (2026-04-28, 갭 분석 v2 `d20cb05` 기반):
  · 적용 방식 (C) 부분 흡수 — 단계 분할 C-1→C-2→C-3→C-4 (C-5 별 트랙)
  · 우선순위: hero 통계(1) → 배지 dot(2) → 카피(3) → 도넛(4)
  · 옵션 B 회피: HTML 영역 별도 컨테이너 분리
  · 4/24 확정 레이아웃 절대 보존 + A2 미리보기 + 6방향 툴팁 보존
  · 클래스 체계 라이브 컨벤션 (`home-` 접두) 유지
  · B 사이드바 오작동·C 영역 콘텐츠는 별 트랙 (app.html 책임)
  · **각 단계 완료 후 라이브 검수 1회 → 다음 단계 진입** (단일 브랜치 / 단일 커밋 / `--no-ff` 머지)

---

## 🗓️ 최신 세션 요약 (시간 역순)

- `docs/sessions/2026-04-28_1929.md` — 4/28 저녁 (대규모 27 커밋: A1 라이트 톤 / sweep 4슬롯 / 컨텍스트 방어 인프라 / index 시안 통째 승격 + fix 다수 / home 갭 분석 v1·v2 + C-1)
- `docs/sessions/work_home_gap_analysis_2026-04-28_v2.md` — 4/28 home 갭 분석 v2 (결론 정정, 5개 영역 정확 비교, 결정 10건 도출)
- `docs/sessions/work_home_gap_analysis_2026-04-28.md` — 4/28 home 갭 분석 v1 (참조용 보존, 결론은 v2가 최종)
- `docs/sessions/work_index_header_a1_pattern_2026-04-28.md` — 4/28 index 헤더 A1 패턴 이식 분석
- `docs/sessions/work_index_mobile_review_2026-04-28.md` — 4/28 index 모바일 전면 재검토
- `docs/sessions/work_index_gap_analysis_2026-04-28.md` — 4/28 index.html 승격 진입 전 갭 분석 (사전 결정 6건 도출)
- `docs/sessions/2026-04-28_0004.md` — 4/28 심야 (home GPT v1 회귀, /session-end 중단)
- `docs/sessions/2026-04-27_pre_sweep_diagnosis.md` — 4/27 sweep 진입 전 시스템 안정성 진단
- `docs/sessions/2026-04-27_fallback_sweep_scan.md` — 4/27 fallback 부채 전수 스캔
- `docs/sessions/2026-04-27_1905.md` — 4/27 저녁
- `docs/sessions/2026-04-27_fallback_debt_finding.md` — 4/27 옛 브라운 fallback 발견
- `docs/sessions/2026-04-27_gap_analysis.md` — 4/27 9페이지 갭 분석

---

## 📌 폐기 / 보류된 트랙

- **`claude_code/design_test/gpt_v1/` 트랙** (4/27 도입, 4/28 묵시적 폐기) — GPT 이미지 생성 PNG 시안 4종(home/board/myspace/scripts). home 흡수 시도 → 회귀 → 사용자 "심야 결정 무시" 발언으로 폐기 해석. 명문 결정 문서 미작성.
- **구버전 Supabase `qursjteiovcylqiepmlo`** (4/24 사고 후 폐기) — `pdnwgzneooyygfejrvbg`(신버전)이 유일 진실 원천.

---

## 🔄 진행 중·완료된 별건 트랙 (메인 트랙과 분리)

| 트랙 | 상태 | 근거 |
|---|---|---|
| **fallback sweep** (옛 브라운 6값 → 새 토큰 본체) | ✅ 4슬롯 완료 (4/28 누적 346건) | `70fd368` `2b9a4b0` `f2db460` `6587254` |
| **admin standalone hex 8건 토큰화** | ⚠️ 머지 완료, 시안 승격 시 무효 가능 | `a0bdfbf` (4/28) |
| **A1 헤더 라이트 톤 + 모바일 반응형** | ✅ 완료 (4/28) | `fd8b264` `1ab35c4` |
| **빠른실행 v2 사양 메모리 등록** | ✅ 등록 완료 (코드 변경 없음, 향후 작업 대기) | `project_quick_overlay_v2_spec.md` |

---

## 🔗 참고 문서

- `claude_code/design_test/README.md` — 디자인 테스트 워크스페이스 전역 규칙
- `docs/decisions/2026-04-25_holds_and_priorities.md` — 보류 항목·우선순위
- `docs/role_system.md` — 9개 role 체계
- `docs/work_order_template.md` — 작업지시서 표준 템플릿 (0번 정합성 검증 필수)

---

*본 인덱스는 `/session-end` 슬래시 커맨드 5단계에서 자동 갱신됩니다. 수동 편집 시 `마지막 갱신` 날짜를 함께 갱신하세요.*
