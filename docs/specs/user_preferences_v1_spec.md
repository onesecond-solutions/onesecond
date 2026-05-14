---
title: 사용자 본인 맞춤 설정 v1 spec — [⚙ 딸깍] + 개인화 테마
status: 결재 박힘 (2026-05-14 야간)
phase: 5/18 4팀 오픈 후 본진 진입 (Phase 1 ~3h)
owner: 팀장님 본진 + Claude Code 실행
related:
  - docs/core/onesecond_master_strategy_v1_20260510.md (§15 정체성 본진)
  - memory/accessibility_low_vision.md (노안 격차 본진)
  - public.user_preferences (DB 신설)
  - css/tokens.css (CSS 변수 본인 박힐 자리)
---

# 사용자 본인 맞춤 설정 v1 spec

## 1. 본질 (Why)

**팀장님 본인 명시 박힘 (2026-05-14 야간):**
> "채팅창 하단 글쓰기 옆에 딸깍 또는 설정창 이모지 필요해. 본인 눈에 맞는 구현 설정창 필요해, 연령별, 성별, 본인 취향별 배경 칼라 채팅 창 칼라 맞춤으로 해주고 싶네"

본 자리 본진 정합 박힘:
- **노안 격차 본진** ([[accessibility_low_vision]]) — 40~60대 사용자 본진 잠재 격차 해소
- **§15 정체성 본진** — 딸깍 한 번 본진 (개인화 = 본인 박힐 자리 본진 정합)
- **사용자 onboarding 본진** — 본인 자리 본인 박힐 자리 = 본진 만족 본진 정합

---

## 2. 본진 큰 그림

### 2-1. 시각 본진 (입력바)

```
┌─────────────────────────────────────────────────────┐
│  📎  💬 메시지 입력...      [⚙ 딸깍]  [글쓰기]      │
└─────────────────────────────────────────────────────┘
```

[⚙ 딸깍] 또는 [⚙] 단독 박힐 자리 — §15 정체성 본진 + 딸깍 패턴 정합.

### 2-2. 설정 오버레이 본진

```
┌─────────────────────────────────────────────────────┐
│  ⚙ 본인 맞춤 설정                         [✕]      │
├─────────────────────────────────────────────────────┤
│  📅 연령대 *                                          │
│   ○ 20대   ○ 30~40대   ○ 50~60대   ○ 70대+         │
│                                                       │
│  👤 성별 (선택)                                       │
│   ○ 남성   ○ 여성   ○ 선택 박지 X                    │
│                                                       │
│  🎨 배경 칼라                                         │
│   [⚪화이트] [🟫브라운(기본)] [⚫다크] [🌸핑크]      │
│                                                       │
│  💬 채팅 풍선 칼라                                    │
│   본인:   [🟫브라운] [🔵블루] [🟢그린] [🟡옐로우]    │
│   상대:   [⚪화이트] [⬜그레이] [🌸파스텔]            │
│                                                       │
│  🔤 폰트 사이즈                                       │
│   [소 13px] [중 15px (기본)] [대 17px] [특대 20px]   │
│                                                       │
│  🌗 테마 (라이트/다크 자동)                          │
│   ○ 시스템 자동   ○ 라이트 고정   ○ 다크 고정       │
│                                                       │
│              [기본값 박힘]    [저장 박힘]             │
└─────────────────────────────────────────────────────┘
```

---

## 3. 개인화 본진 항목

### 3-1. 인구 통계 본진

| 항목 | 옵션 | 본진 |
|---|---|---|
| 연령대 | 20대 / 30~40대 / 50~60대 / 70대+ | 폰트 사이즈 자동 추천 본진 |
| 성별 | 남성 / 여성 / 선택 박지 X | (UI 본진 박지 X, 자동 추천 자리만) |

### 3-2. 시각 본진

| 항목 | 옵션 | CSS 변수 |
|---|---|---|
| 배경 칼라 | 화이트 / 브라운(기본) / 다크 / 핑크 | `--user-bg-color` |
| 본인 풍선 칼라 | 브라운(기본) / 블루 / 그린 / 옐로우 | `--user-bubble-mine-color` |
| 상대 풍선 칼라 | 화이트(기본) / 그레이 / 파스텔 | `--user-bubble-other-color` |
| 폰트 사이즈 | 13px / 15px(기본) / 17px / 20px | `--user-font-size` |
| 테마 | 시스템 자동 / 라이트 / 다크 | `--user-theme-mode` |

### 3-3. 자동 추천 본진 (연령·성별 박힌 자리 박힐 자리)

| 조건 | 자동 추천 |
|---|---|
| 70대+ | 폰트 20px / 고대비 톤 / 다크 박지 X |
| 50~60대 | 폰트 17px / 브라운 기본 |
| 30~40대 | 기본값 통째 |
| 20대 | 폰트 13~15px / 다크 추천 / 모든 칼라 박힘 자리 |

본 자리 = 본인 명시 박힌 자리 본진 박지 X 박힌 자리 박힘 (옵트인 본진 정합).

---

## 4. DB 스키마

### 4-1. public.user_preferences 신설

```sql
CREATE TABLE public.user_preferences (
  user_id       uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  age_group     text CHECK (age_group IN ('20s','30s_40s','50s_60s','70s_plus')),
  gender        text CHECK (gender IN ('male','female','not_specified')),
  prefs         jsonb NOT NULL DEFAULT '{}'::jsonb,
  /* prefs JSONB 본진:
   * {
   *   "bg_color":             "brown",    // white / brown / dark / pink
   *   "bubble_mine_color":    "brown",    // brown / blue / green / yellow
   *   "bubble_other_color":   "white",    // white / gray / pastel
   *   "font_size":            "medium",   // small / medium / large / xlarge
   *   "theme_mode":           "auto"      // auto / light / dark
   * }
   */
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_user_preferences_age ON public.user_preferences(age_group);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
```

### 4-2. RLS 정책

```sql
-- 본인만 SELECT
CREATE POLICY user_prefs_select_own
ON public.user_preferences FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 본인만 INSERT / UPDATE / UPSERT
CREATE POLICY user_prefs_upsert_own
ON public.user_preferences FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY user_prefs_update_own
ON public.user_preferences FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- admin = 통째 박힘
CREATE POLICY user_prefs_admin_all
ON public.user_preferences FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
```

---

## 5. CSS 변수 본진

### 5-1. tokens.css 박힐 자리

```css
:root {
  /* 기본값 박힘 — 옛 본진 본인 박힐 자리 */
  --user-bg-color:            var(--color-bg, #FAF8F5);
  --user-bubble-mine-color:   var(--brand-500, #A0522D);
  --user-bubble-other-color:  #FFFFFF;
  --user-font-size:           15px;
  --user-theme-mode:          auto;
}

/* 사용자 본인 박힌 자리 본인 박힐 자리 — body.user-pref-* 클래스 박힘 자리 */
body.user-pref-bg-white  { --user-bg-color: #FFFFFF; }
body.user-pref-bg-dark   { --user-bg-color: #1F1B16; color-scheme: dark; }
body.user-pref-bg-pink   { --user-bg-color: #FFF1F5; }

body.user-pref-bubble-mine-blue    { --user-bubble-mine-color: #2563EB; }
body.user-pref-bubble-mine-green   { --user-bubble-mine-color: #16A34A; }
body.user-pref-bubble-mine-yellow  { --user-bubble-mine-color: #EAB308; }

body.user-pref-font-small   { --user-font-size: 13px; }
body.user-pref-font-large   { --user-font-size: 17px; }
body.user-pref-font-xlarge  { --user-font-size: 20px; }
```

### 5-2. 적용 본진 자리

본 자리 본인 박힐 자리 자리 = 옛 박힌 자리 본인 박힐 자리:
- `.notice-room-shell` 배경 = `var(--user-bg-color)`
- `.notice-msg-bubble.is-mine` 배경 = `var(--user-bubble-mine-color)`
- `.notice-msg-bubble.is-other` 배경 = `var(--user-bubble-other-color)`
- `.notice-msg-text` font-size = `var(--user-font-size)`

본 자리 박힐 자리 본인 박힐 자리 = 옛 자리 본인 박힐 자리. board.html 박힌 자리 본인 박힐 자리.

---

## 6. JS 본진

### 6-1. 사용자 진입 시 본인 박힐 자리

```js
async function loadUserPreferences() {
  try {
    const res = await window.db.fetch('/rest/v1/user_preferences?user_id=eq.' + auth.uid() + '&select=*&limit=1');
    if (!res.ok) return;
    const rows = await res.json();
    if (rows.length === 0) return;
    applyUserPreferences(rows[0]);
  } catch (e) {
    console.warn('[user-prefs] 로드 실패:', e);
  }
}

function applyUserPreferences(p) {
  const body = document.body;
  /* 옛 클래스 박지 X */
  body.className = body.className.replace(/user-pref-\S+/g, '').trim();
  /* 신 클래스 박음 */
  if (p.prefs.bg_color)            body.classList.add('user-pref-bg-' + p.prefs.bg_color);
  if (p.prefs.bubble_mine_color)   body.classList.add('user-pref-bubble-mine-' + p.prefs.bubble_mine_color);
  if (p.prefs.bubble_other_color)  body.classList.add('user-pref-bubble-other-' + p.prefs.bubble_other_color);
  if (p.prefs.font_size)           body.classList.add('user-pref-font-' + p.prefs.font_size);
  if (p.prefs.theme_mode)          body.classList.add('user-pref-theme-' + p.prefs.theme_mode);
}
```

### 6-2. 설정 오버레이 본진

```js
window.openUserPrefsOverlay = function() {
  /* 설정 오버레이 박음 */
};

window.saveUserPrefs = async function() {
  const prefs = collectFormValues();
  await window.db.fetch('/rest/v1/user_preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify({ user_id: auth.uid(), ...prefs })
  });
  applyUserPreferences({ prefs });
  closeUserPrefsOverlay();
};
```

---

## 7. UI 본진 — [⚙ 딸깍] 버튼

### 7-1. 박힐 자리

`pages/board.html` 박힌 자리 `.notice-input-bar` 박힌 자리 본인 박힐 자리:
- 옛 박힘 자리: `[📎] [textarea] [전송]`
- 신 박힘 자리: `[📎] [textarea] [⚙ 딸깍] [전송]`

### 7-2. HTML 박힐 자리

```html
<button class="notice-prefs-btn" type="button"
        onclick="window.openUserPrefsOverlay()"
        title="본인 맞춤 설정">⚙ 딸깍</button>
```

### 7-3. CSS 박힐 자리

```css
.notice-prefs-btn {
  /* §15 정체성 본진 정합 — 딸깍 패턴 */
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--brand-300, #DAA67B);
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.96);
  color: var(--brand-700, #66331A);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms, color 120ms, transform 120ms;
}
.notice-prefs-btn:hover, .notice-prefs-btn:active {
  background: var(--brand-500, #A0522D);
  color: #FFFFFF;
  transform: scale(1.04);
}
```

---

## 8. Phase 본진

| Phase | 본진 | 분량 | 시점 |
|---|---|---|---|
| **Phase 1 (v1.0)** | DB 신설 + RLS + 기본 설정 오버레이 (폰트만) | ~1.5h | 5/18 후 즉시 |
| **Phase 2 (v1.1)** | 칼라 본진 박힘 (배경 + 풍선) + CSS 변수 박힘 | ~2h | 5/18 + 1주 |
| **Phase 3 (v1.2)** | 연령·성별 자동 추천 본진 + 본인 박힐 자리 onboarding | ~1.5h | 5/18 + 2주 |
| **Phase 4 (v2.0)** | 테마 자체 박힘 자리 (라이트/다크 자동) + 본인 디자인 자유 박힐 자리 | 큰 본진 | 6~7월 |

---

## 9. 5/18 4팀 오픈 시 본진 자리

**결재 박힘: spec MD + 5/18 후 진입**

5/18 = 기본 테마 (브라운 / 15px / 라이트) 통째 박힘. 사용자 박힌 자리 본인 박힐 자리 = 5/18 후 진입 박힌 자리 본인 박힐 자리.

---

## 10. 미해결 / 후속 결재

1. **버튼 본진** — [⚙ 딸깍] vs [⚙] 단독 본진 결재 (현재 박힘 [⚙ 딸깍] 본진)
2. **자동 추천 본진** — 연령 박힌 자리 박힐 자리 = 옵트인 vs 옵트아웃 본진 결재
3. **본인 톤 자유 본진** — 7~8 옵션 박힘 자리 외 본인 톤 자유 박힐 자리 (color picker 박힐지)
4. **다크 모드 본진** — 다크 박힌 자리 본진 본인 박힐 자리 본진 시스템 자동 본진 결재
5. **알림 본진** — 본인 박힐 자리 본진 박힐 자리 (푸시 알림 옵션 박힐 자리, 알림 v1.1 spec 결합)
6. **다른 페이지 박힐 자리** — board.html 박힌 자리 본진 박힘 자리 본진 = 다른 페이지(myspace, scripts 등) 본진 박힐 자리 결재

---

## 11. §15 정체성 본진 + 노안 본진 정합

### §15 정체성 본진
- ✅ [⚙ 딸깍] 박힘 = 딸깍 패턴 정합
- ✅ 1초 안 박힘 = 본인 톤 본인 박힘 자리 즉시 본진 박힘
- ✅ 반복 학습 = 본 자리 박힌 [⚙] 박힘 자리 본진 동일 패턴 정합
- ✅ 자기 발견 = 본인 박힘 자리 박힌 [⚙] 박힘 본인 박힘

### 노안 본진 (accessibility_low_vision.md)
- ✅ 폰트 사이즈 본인 박힐 자리 = 노안 격차 해소 본진
- ✅ 본인 톤 본인 박힐 자리 = 콘트라스트 본인 박힐 자리 정합
- ✅ hit target 44x44px+ 박힘 자리 정합 (본인 [⚙] 36px 박힌 자리 본인 박힐 자리)

---

## 12. 회귀 신호 (작업 진입 시 점검)

- ✅ §0 중립 독립 SaaS 정합 (다른 GA·사용자 본인 박힐 자리 정합)
- ✅ §4 고객정보 저장 X (개인화 = 본인 시각 본진, 고객정보 X)
- ✅ Supabase 신버전 정합 (`pdnwgzneooyygfejrvbg`)
- ✅ RLS 본인만 박힘 자리 정합 (보안 본진)
- ✅ §15 정체성 + 학습·중독 본진 정합
- ✅ 노안 본진 정합

---

**END OF SPEC v1**

> 본 v1 = 사용자 본인 맞춤 설정 영구 spec. 5/18 후 진입 시 본 spec 통째 본인 박힐 자리.
> 본인 박힐 자리 본진 정합 박힘 = §15 + 노안 본진 = 본인 박힐 자리 본진 본진 정합.
