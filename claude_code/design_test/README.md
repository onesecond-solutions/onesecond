# 원세컨드 디자인 테스트 워크스페이스

> 🚀 **이 폴더는 라이브 페이지 전면 교체용 시안 워크스페이스입니다.**
> 시안 OK 받으면 `pages/<page>.html` / `app.html` / `tokens.css`에 **승격 적용**합니다.
> 자동 승격되지 않으며, 페이지별로 명시 승인 + 별도 작업지시서가 필요합니다.

---

## 📂 구조

```
claude_code/design_test/
  README.md                  ← 전역 규칙 (이 파일)
  <page-name>/
    v1.html                  ← 독립 실행 가능한 테스트 페이지
    v2.html, v3.html ...     ← 후속 버전
    notes.md                 ← 해당 페이지의 변경 조건·의도 기록
```

## 👀 미리보기 방법

1. 파일 탐색기 경로 이동:
   ```
   C:\limtaesung\github\onesecond\claude_code\design_test\<page>\
   ```
2. `v1.html` 더블클릭 → 기본 브라우저에서 열림

서버 불필요. 색상·여백·폰트·SVG 전부 정상 동작. `switchMenu`, `doSearch` 등 외부 함수는 alert 스텁으로 대체됨.

## 🛡️ 작업 원칙 (절대 규칙)

1. **원본 금지** — `pages/*.html`, `css/tokens.css`, `js/*.js`, `app.html`은 한 줄도 수정하지 않는다.
2. **독립 실행** — 각 `v*.html`은 파일 더블클릭만으로 렌더링되어야 한다.
3. **토큰 오버라이드** — `tokens.css`는 `../../../css/tokens.css`로 참조만 하고, 값은 테스트 HTML 내부 `<style>`의 `:root { }` 재정의로만 변경한다.
4. **원본 구조 복제** — 테스트 대상 페이지의 HTML/CSS/JS 구조는 원본과 동일하게 복사한다(로고 등 상대 경로만 조정).
5. **변경 기록** — 각 페이지 폴더의 `notes.md`에 "무엇을·왜·어떻게"를 남긴다.
6. **부수 사항 분리** — 전면 교체 진행 중 발견되는 부수적 사항(미세 색상 / 잔여 갭 / 인접 영역 정비 등)은 **별도 메모로 저장만 해두고**, 전면 교체 완료 후 별도 트랙으로 진행한다. 중간에 부수 작업으로 빠지지 않는다.
   _4/28~29 사례 (라이브 검수 1회 후 다음 단계 진입 원칙 재강조):_
   - 4/28 index 헤더 라이트 톤 회귀 → A1 패턴 이식 정정 (`001af79`)
   - 4/28 index 푸터 4컬럼 보강 (`c2186a1`)
   - 4/29 app 푸터 4컬럼 → 한 줄 미니 정정 — D 영역 130~170px 압박 발견 (`54cd148`/`fa835d2`)
   - 4/29 app 푸터 D 영역 안 → 셸 최하단 정정 — 위치 어색 라이브 검수 (`79c0052`)
   - 4/29 terms/privacy 돌아가기 → 닫기 — 새 탭 환경 `history.back()` 미작동 (`710d452`)

## 🎨 v1 디자인 원칙 (2026-04-25 확정)

### A. 색상 — 브라운 95% → 5%

**중성 전환 (브라운 제거)**

| 토큰 | 기존 | v1 |
|---|---|---|
| `--color-bg` | `#FAF8F5` (크림) | `#FFFFFF` (순백) |
| `--color-surface-2` | `#F3EFE9` (웜 베이지) | `#F6F7F9` (쿨 오프화이트) |
| `--color-border` | `#E4DBCE` (웜 베이지) | `#E5E7EB` (뉴트럴 그레이) |
| `--color-text-primary` | `#3D2C1E` (다크 브라운) | `#1F2937` (차콜) |
| `--color-text-secondary` | `#7A5C44` (미디엄 브라운) | `#6B7280` (그레이) |
| `--color-text-tertiary` | `#B89880` (라이트 브라운) | `#9CA3AF` (라이트 그레이) |
| `--gradient-header` | 브라운 그라 | `transparent` (제거) |
| 그림자 톤 | 웜 브라운 | 뉴트럴 차콜 |

**브라운 유지 (강조 포인트만)**

`--color-brand #A0522D` / `--color-accent #D4845A` 값 그대로 유지, 아래 지점에서만 사용:

1. Primary CTA 버튼 채움
2. 강조 배지 (`.badge-pro`, `.home-intro-badge`)
3. 탭 언더라인·포커스 링
4. 툴팁 헤더·꼬리 (대화·유도 포인트)
5. 호버·액티브 하이라이트 (fill에 옅은 `#FFF8F3` 허용)

### B. 여백 — 촘촘함 해소 (⚠️ 홈 제외)

**원칙**: 팀장님이 지적하신 "홈을 제외한 다른 페이지들이 촘촘" 문제 해결.
- 홈(`home/*.html`)은 2026-04-24에 확정된 레이아웃(좌측 30px 카피 패딩·hex -160px 수직 상승) **그대로 유지**. 색상만 중성화.
- 아래 여백 규칙은 **about / admin / board / myspace / news / quick / scripts / together** 페이지 테스트에 적용 예정.

| 요소 | 기존 | v1 | 변화 |
|---|---|---|---|
| 카드 내부 패딩 | `--space-6` (24px) | 32px | +33% |
| 카드 간 간격 | `--space-5` (20px) | 40px | +100% |
| 섹션 타이틀 아래 | `--space-2` (8px) | 16px | +100% |
| 본문 line-height | 1.55 | 1.75 | +13% |
| 컨텐츠 좌우 여백 | ~16px | 32px | +100% |
| 컨텐츠 max-width | 없음 | 900px | 신규 |

### C. 토큰 확장 — 9 시안 :root 통합 (2026-04-27 `71f08b0` main 머지 완료)

**배경**: 9개 시안(`home/index/scripts/board/myspace/news/quick/together/admin`)이 각자 `<style>` 내부 `:root { }` override로 신규 토큰을 임시 정의 → 본체 통합 필요.

**적용 결과** (`tokens.css` 본체):
- 신규 **~94개 토큰** 추가 (기존 토큰 절대 보존, 신규만 추가)
- Shadow 토큰 톤 갱신: 브라운 → **차콜** (`--shadow-sm/md/lg`. `--shadow-xl`은 보존)
- Neutral 10단계 / Brand 10단계 / Accent 7단계 + Elevation·Ring·Leading·Tracking·Ease·Duration·Space 확장·Radius 확장·Z-index·Layout 확장
- 9개 시안의 `:root override` → `tokens.css` 단일 진실 원천으로 통합

**향후 시안 :root override 처리 기준**:
- **신규 토큰** (본체에 없는 변수): 시안 단계 `:root override`로 임시 정의 → 시안 OK 후 본체로 승격
- **기존 토큰 값 변경**: 시안 단계에서만 override로 검증 → 본체 변경은 별도 작업지시서로 별 트랙 (시안과 본체 변경 분리)
- **다음 페이지 승격 시**: 시안의 `:root override`를 본체로 통합 여부 결정 + 신규 토큰 우선 사용

근거: `docs/sessions/2026-04-27_gap_analysis.md`

## 🚀 승격 진행 순서 (Phase 1)

아래 순서대로 라이브 페이지에 시안을 승격한다. 각 페이지는 별도 작업지시서로 진행하며, 한 페이지 승격 완료 후 다음 페이지로 이동.

| 순서 | 페이지 | 시안 파일 | 승격 상태 | 비고 |
|:---:|---|---|:---:|---|
| 1 | `index.html` | `index/v1-full.html` | ✅ 승격 완료 | 4/28 시안 통째 승격 (`83665c4`) + 헤더 라이트 톤(`001af79`)·푸터 4컬럼(`c2186a1`)·가입 폼 fix |
| 2 | `pages/home.html` | `home/v2-full.html` (`v1-full.html` 보조) | 🔄 부분 흡수 (C) 트랙 | C-1 hero 통계 3카드 완료 (4/28 `b854878`), C-2 배지 dot 라이브 검수 후 진입 |
| 3 | `pages/scripts.html` | `scripts/v2-full.html` (`v1-full.html` 보조) | 🔄 시안 대기 | 영향 범위 최대 (54개 데이터) |
| 4 | `pages/board.html` | `board/v1-full.html` | ✅ 승격 완료 | 4/26 `ebb9b3b` |
| 5 | `pages/myspace.html` | `myspace/v1-full.html` | 🔄 시안 대기 | |
| 6 | `pages/news.html` | `news/v1-full.html` | 🔄 시안 대기 | |
| 7 | `pages/quick.html` | `quick/v1-full.html` | 🔄 시안 대기 | |
| 8 | `pages/together.html` | `together/v1-full.html` | 🔄 시안 대기 | board 패턴 복제 |
| 9 | `pages/admin.html` | `admin/v1-full.html` | 🔄 시안 대기 | Make.com 2단 네비 + 분석 대시보드 |

**범례**: ✅ 승격 완료 / 🔄 시안 대기 / ❌ 보류

## 🧩 추가 수정 사항 (전면 교체와 병행 또는 후속)

전면 교체 트랙 외에 별도로 처리할 사항. 각 항목은 별도 작업지시서로 진행:

- **C영역 빠른실행 버튼 → D영역 중앙 상단 오버레이 작업** — 상세 사양은 `~/.claude/projects/.../memory/project_quick_overlay_v2_spec.md` 참조 (4그룹 구조 + ④검색·조회 + 모바일 시트)

## 🔄 제품 반영 절차

1. 팀장님이 테스트 결과 확인 → OK 판단
2. 적용할 버전 지정 (v1/v2/…)
3. 별도 작업지시서 → `tokens.css` 및 해당 `pages/*.html`에 반영
4. 이 폴더는 레퍼런스로 유지
