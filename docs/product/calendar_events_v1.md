---
title: 운영 일정 v1 spec — 자동·반자동·수동 입력 통합 + 월별 navigation
status: 결재 박힘 (2026-05-14 21:xx)
phase: 5/18 4팀 오픈 후 본진 진입 (Phase 1 ~3h)
owner: 팀장님 본진 + Claude Code 실행
related:
  - pages/board.html (.pg-calendar-board 자리)
  - public.calendar_events (DB 신설 자리)
  - docs/role_system.md (9 role 매트릭스)
---

# 운영 일정 v1 spec

## 1. 본질 (Why)

"이번 달 운영 일정" = 보험 영업 운영 시간축 박힌 자리. 자동·반자동·수동 3 layer 입력 통합 박힌 한 자리에 시각화.

**팀장님 본진 명시 박힘 (2026-05-14):**
- 자동 & 반자동 입력 본진
- 실장 입력 + 보험사 임지원 입력 일정 반영
- 이번 달 운영 일정에 보여주기 통합
- 실장이 미반영된 부분 실제 입력 보강
- ◀ 2026년 5월 ▶ 위·아래 화살표로 과거 일정 검색 (월별 navigation)

**옛 격차:** pages/board.html:2973~3015 자리 = 하드코딩 정적 4건 (5/15 메리츠 인수 / 5/16 KB 신상품 / 5/18 전산 점검 / 5/20 녹취 변경). DB 자리 박지 X / 입력 자리 박지 X / 월별 nav 박지 X.

---

## 2. 입력 layer 3건 (큰 그림)

| Layer | 본진 | 입력자 (role) | Phase | 시각 본진 |
|---|---|---|---|---|
| **자동** | API/스크래핑으로 보험사 본사 공지 자동 수집 | (시스템) | Phase 4 (v2.0 후) | 🤖 자동 |
| **반자동** | 보험사 임지원이 본인 자체 박음 | insurer_branch_manager / insurer_manager / insurer_member | Phase 3 (v1.2) | 🏢 [보험사명] 임지원 |
| **수동** | 실장이 본인 일정 박음 + 보험사 임지원 박지 X 보강 | ga_branch_manager / ga_manager | Phase 2 (v1.1, 5/18 후) | 👤 [실장 이름] |

**큰 그림:**
```
보험사 본사 API ─┐
                  ├→ (자동 layer, Phase 4)
보험사 본사 공지 ─┘                          ┐
                                                ├→ public.calendar_events ─→ board.html 운영 일정 카드
보험사 임지원 본인 박음 (Phase 3) ────────────┤
                                                │
실장 본인 박음 + 보강 입력 (Phase 2) ──────────┘
```

---

## 3. DB 스키마 (Supabase 신버전 `pdnwgzneooyygfejrvbg`)

```sql
-- public.calendar_events 신설
CREATE TABLE public.calendar_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date      date NOT NULL,
  title           text NOT NULL,
  description     text,
  event_type      text NOT NULL CHECK (event_type IN ('acceptance','product','urgent','notice','operation','other')),
  source_type     text NOT NULL CHECK (source_type IN ('auto','semi_auto','manual')),
  audience_target text NOT NULL DEFAULT 'all' CHECK (audience_target IN ('all','team_internal','insurer_internal','manager_only')),
  team_id         uuid REFERENCES public.teams(id),     -- 수동 입력 시 박힘 (실장 본인 박은 팀)
  insurer_id      uuid REFERENCES public.insurers(id),  -- 반자동·자동 입력 시 박힘 (보험사)
  author_id       uuid REFERENCES public.users(id),     -- 입력자 (auto = NULL)
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_calendar_events_date ON public.calendar_events(event_date);
CREATE INDEX idx_calendar_events_team ON public.calendar_events(team_id);
CREATE INDEX idx_calendar_events_insurer ON public.calendar_events(insurer_id);
CREATE INDEX idx_calendar_events_source ON public.calendar_events(source_type);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
```

**event_type 본진:**
- `acceptance` = 인수 (보험사 인수 조건 변경)
- `product` = 신상품 (보험사 신상품 출시)
- `urgent` = 긴급 (전산 점검, 시스템 장애)
- `notice` = 공지 (실장 박은 일반 공지)
- `operation` = 운영 (회식, 미팅, 영업 일정)
- `other` = 기타

---

## 4. RLS 정책

| 정책 | 본진 | SQL |
|---|---|---|
| SELECT (전 사용자) | 전 사용자 박힘 자리 (4팀 오픈 본진 정합) | `USING (true)` |
| INSERT (auth + role) | admin / ga_branch_manager / ga_manager / insurer_* | `WITH CHECK (auth.uid() IS NOT NULL AND public.get_user_role() IN ('admin','ga_branch_manager','ga_manager','insurer_branch_manager','insurer_manager','insurer_member'))` |
| UPDATE (본인 + admin) | author_id = auth.uid() OR is_admin() | `USING (author_id = auth.uid() OR public.is_admin())` |
| DELETE (본인 + admin) | author_id = auth.uid() OR is_admin() | `USING (author_id = auth.uid() OR public.is_admin())` |

⚠️ **RLS 자기 참조 회피 표준** ([[rls_self_reference_avoidance]] 메모리 정합) — 본 자리 USING/WITH CHECK 안 `public.users` SELECT 서브쿼리 박지 X. 본인 박은 `get_user_role()` / `is_admin()` SECURITY DEFINER 함수 표준 박음.

---

## 5. UI 본진

### 5-1. 시각 본문 (pages/board.html 우측 컬럼)

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 이번 달 운영 일정              ◀  2026년 5월  ▶    [+]      │
├─────────────────────────────────────────────────────────────────┤
│  5/15 [인수]   메리츠 인수 변경    [🏢 메리츠 임지원]              │
│  5/16 [신상품] KB 신상품 출시      [🏢 KB 임지원]                  │
│  5/17 [공지]   4팀 회식 7시        [👤 한재성 실장]                │
│  5/18 [긴급]   전산 점검           [🤖 자동]                        │
│  5/20 [공지]   녹취 변경           [🏢 메리츠 임지원]              │
│  5/22 [운영]   영업 미팅           [👤 한재성 실장]                │
└─────────────────────────────────────────────────────────────────┘
```

### 5-2. 월별 navigation (◀ 2026년 5월 ▶)

| 구성 | 본진 |
|---|---|
| ◀ 화살표 | 이전 달 (-1 month). hit target 44x44px+ |
| 본문 "2026년 5월" | 현 진입 월 박힘. 클릭 시 캘린더 picker (12개월 그리드, 별 본진) |
| ▶ 화살표 | 다음 달 (+1 month). hit target 44x44px+ |
| 기본 진입 | 이번 달 박힘 |
| URL 자리 | `?ym=2026-05` 쿼리 박을 자리 (북마크 정합) |

### 5-3. 출처 표시 (입력 layer 시각 분기)

| Layer | 아이콘 | 톤 | 본문 |
|---|---|---|---|
| 자동 | 🤖 | brand-300 | "자동" |
| 반자동 (보험사) | 🏢 | brand-500 | "[메리츠] 임지원" |
| 수동 (실장) | 👤 | brand-700 | "[한재성] 실장" |

### 5-4. 입력 진입 [+] 버튼

| role | 본진 |
|---|---|
| admin | 모든 layer 입력 박힘 (자동·반자동·수동 강제) |
| ga_branch_manager / ga_manager | 수동 입력 박힘 (본인 팀 일정) |
| insurer_branch_manager / insurer_manager / insurer_member | 반자동 입력 박힘 (본인 보험사 일정) |
| ga_member / ga_staff / insurer_staff | 박지 X (시각만 박힘) |

클릭 시 입력 모달:
```
┌─────────────────────────────────────────┐
│  📅 일정 박음                  [✕]      │
├─────────────────────────────────────────┤
│  날짜:     [2026-05-22         ]        │
│  제목:     [                      ]      │
│  설명:     [                      ]      │
│  타입:     [▼ 공지 ]                    │
│  대상:     [▼ 전체 ]                    │
│                                          │
│            [취소]    [박음]              │
└─────────────────────────────────────────┘
```

---

## 6. Phase 본진

| Phase | 본진 | 분량 | 시점 | 결과 |
|---|---|---|---|---|
| **Phase 1 (v1.0)** | DB 신설 + RLS + 시드 4건 동적 박힘 + 월별 nav + admin 입력 UI | ~3h | 5/18 후 즉시 | 정적 4건 옛 자리 박지 X / admin 박힌 자리만 입력 |
| **Phase 2 (v1.1)** | 실장 입력 UI + RLS 매트릭스 + 보강 입력 본진 | ~1세션 | 5/18 후 1주 | 실장 본인 박음 박힘 + 보험사 박지 X 보강 |
| **Phase 3 (v1.2)** | 보험사 임지원 가입 + 본인 입력 UI | ~2세션 | 5/18 후 2~3주 | 반자동 layer 박힘 |
| **Phase 4 (v2.0)** | 자동 입력 (API/스크래핑 또는 Make.com 백본) | 큰 본진 | 6~7월 | 자동 layer 박힘 |

---

## 7. 5/18 4팀 오픈 시 본 카드 자리

**결재 박힘: 현 정적 4건 그대로 유지** (5/15 메리츠 인수 / 5/16 KB 신상품 / 5/18 전산 점검 / 5/20 녹취 변경).

Phase 1 진입 시:
1. DB 신설 + 시드 4건 박음 (정적 4건 그대로 DB로 박힘)
2. board.html .pg-calendar-board 자리 → JS fetch 본진으로 교체
3. 옛 하드코딩 4건 박지 X 박음

→ 라이브 시각 변경 0건 (사용자 입장 본진 정합) + 동적 자리 박힘.

---

## 8. 미해결 / 후속 결재

1. **자동 입력 layer (Phase 4)** = API 자리 vs 스크래핑 자리 vs Make.com 자리 본진 결재
2. **insurers 테이블 박힘 자리** = 보험사 마스터 본진 spec 박을 자리 (insurer_id FK 대상)
3. **캘린더 picker (별 본진)** = ◀ ▶ 외 12개월 그리드 박힘 자리 본진 결재
4. **알림 본진** = 새 일정 박힘 시 푸시·뱃지 본진 (v1.2 알림 시스템 결합)
5. **검색 본진** = 월별 nav 외 텍스트 검색 박힘 자리 (별 본진)

---

## 9. 작업 진입 시 순서 (5/18 후)

| Step | 본진 | 분량 |
|---|---|---|
| Step 1 | DB SQL 박음 (Supabase Dashboard) + RLS 정책 박음 | ~30분 |
| Step 2 | 시드 4건 INSERT (정적 옛 자리 동기) | ~10분 |
| Step 3 | pages/board.html .pg-calendar-board → JS fetch 박음 + 월별 nav HTML/CSS/JS 박음 | ~1.5h |
| Step 4 | admin 입력 모달 박음 (admin_v2 자리 또는 별 자리) | ~1h |
| Step 5 | 라이브 검증 + 회귀 테스트 | ~30분 |

---

## 10. 회귀 신호 (작업 진입 시 점검)

- ✅ §0 중립 독립 SaaS 정합 (insurers 다수 박힘 자리 정합)
- ✅ §4 고객정보 저장 X (운영 일정 = 영업 정보, 고객정보 X)
- ✅ Supabase 신버전 정합 (`pdnwgzneooyygfejrvbg`)
- ✅ RLS 자기 참조 회피 표준 (SECURITY DEFINER 함수 박음)
- ✅ DB 시드 ↔ UI 정합 (시드 4건 ID 박힌 자리 ↔ UI fetch 박힘 자리 정합)

---

**END OF SPEC v1**
