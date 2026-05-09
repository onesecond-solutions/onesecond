---
세션 시각: 2026-05-10 00:37 KST
주요 마감 작업: 4팀 단톡방 자산화 트랙 — Claude AI(웹) 채팅 로그 진실 원천 보존 (Code 인계 직후 박음)
생성 도구: Claude Code (Code 받은 채팅 로그 통째 archive — AI 간 컨텍스트 격차 해소 목적)
---

# 4팀 단톡방 자산화 — Claude AI(웹) 채팅 로그 통째 보존

> **목적:** Claude AI(웹)와 진행한 4팀 단톡방 자산화 트랙 채팅 로그를 진실 원천(GitHub)에 박아 다음 세션의 어느 AI(Code/AI/Chrome)든 동일 컨텍스트 진입 가능하게 함.
> **본질:** 팀장님 직접 인지 — "클로드 AI(웹)은 단기기억상실증, 클로드만 사용하기엔 완전 부족". CLAUDE.md "Claude Code의 위치 (핵심 인지)" 정합 — Code = 진실 원천 관리자.
> **트랙 위치:** 메모리 `kakao_migration_strategy.md` (5/5 보류 → 5/9 부활 → 5/10 본 진행).

---

# § 1. 트랙 핵심 (요약)

| 영역 | 내용 |
|---|---|
| 트랙명 | 4팀 단톡방 → "현장의 소리" 이전 (10개월치, 2025-07-10 ~ 2026-05-08) |
| 데이터 인덱싱 (5/9~10) | **1,564건 PASS** — Phase 1 (이미지 1,310 + mp4 5) + Phase 2 (PDF 120 / PPTX 30 / DOCX 8 / XLSX 10 / TXT 6 / WAV 51 스킵 / HWP 12 스킵 등) |
| 4 카테고리 1차 결론 (Claude AI) | 매니저공지 / 스마트게시판 / 네비게이션방 / 보험사게시판 |
| 5 카테고리 + 다층 태그 (Claude AI 재분석) | ① 보험사 소식·이슈 37.5% / ② 상품·플랜 54.5% / ③ 인수·심사 25.5% / ④ 현장 대응·스크립트 12.7% / ⑤ 자료실 14.9% (평균 1.86 매칭) |
| UX 결론 | **작성 도우미 마법사 (Wizard)** — "무엇을 작성하시는 걸 도와드릴까요?" → 단계별 클릭 → 백엔드 메타 자동 채움. 카테고리 분류 메뉴가 아니라 글쓰기 안내 마법사. |
| 핵심 발견 | 30.7% (481건) 글이 어느 카테고리에도 매칭 안 됨 → "잘 모르겠음" 분기 + 자율 입력 + 허브 게시판 default 적재 필요 |

# § 2. spec v2 § 2-1 board_type 7종 정합

| board_type | 한국어 호칭 | 4팀 분해 매핑 | 기본값 |
|---|---|---|---|
| `manager_notice` | 매니저 공지 | Claude AI 4 카테고리 ①과 동일 | — |
| `qna` | 현장 Q&A | "스마트 게시판"의 ②③④ 카테고리 흡수 (호칭 마케팅 = 스마트 게시판) | — |
| `manager_lounge` | 매니저 라운지 (= 팀장님 호칭 "관리자 라운지" 동의어) | (Claude AI 4 카테고리에 없음) | admin 토글 #1 OFF |
| `navigation` | 네비게이션방 | Claude AI 4 카테고리와 동일 | — |
| `insurer` | 보험사 게시판 | Claude AI 4 카테고리 ⑤와 동일 | admin 토글 #2 OFF |
| `hub` | 허브 게시판 | **모든 지식의 저장소 (현재 미오픈)** ⭐ | admin 토글 #3 OFF (분류 안 된 글 default 적재처) |
| `archive_legacy` | 폐기 4 row 보존 | — | admin 격리 |

**팀장님 본질 인지 (5/10 새벽):**
> "허브게시판은 기본값이야 — 현재 오픈은 안 되지만 모든 지식의 저장소야"

→ spec v2 § 2-1 정합 ✅. "잠정 admin" + admin 토글 #3 OFF = 현재 미오픈 / "글로벌" = 모든 지식의 저장소.

# § 3. 작성 도우미 마법사 흐름 (Claude AI 결론 — Code 대기 상태)

```
[글쓰기] 버튼 클릭
       ↓
"무엇을 작성하시는 걸 도와드릴까요?"
   ┌──────────┐ ┌──────────┐
   │ 상품 같음 │ │ 인수 같음 │
   └──────────┘ └──────────┘
   ┌──────────┐ ┌──────────┐
   │잘 모르겠음│ │   기타   │
   └──────────┘ └──────────┘
       ↓ (분기별 가이드 문구 등장)
       ↓ (단계별 선택)
[글쓰기 화면 (메타 자동 세팅 완료)]
- 게시판: 자동
- 카테고리: 자동
- 세부: 자동
- 가이드 문구: "이런 정보 포함하면 좋아요"
```

**핵심 단어 톤:** "상품 같음" / "잘 모르겠음" — 추측·자신없음 OK 카톡방 감각 유지.

**백엔드 자동 메타:**
- `post_board` (manager_notice / qna / navigation / insurer / hub)
- `post_category` (공지 / 상품 / 인수 / 현장대응 / 자료)
- `post_subcategory` (보장비교 / 보험료비교 / 특약설명 / 전환갈아타기 등)
- `ai_suggested_tags` (#보험사 / #보장영역 / #긴급도 등)
- `created_via` ('wizard' / 'free_input')

# § 4. 다음 단계 — Claude AI(웹) 측 결정 대기 3건

| # | 항목 | 상태 |
|---|---|---|
| 1 | 작성 도우미 마법사 흐름 결재 (A/B/C/D) | ⏸ Claude AI 측 대기 |
| 2 | 마법사 적용 범위 (3개 게시판 / 2개 / 1개) | ⏸ |
| 3 | 가이드 문구 도출 방식 (4팀 자료 / 온라인 / 하이브리드) | ⏸ |

→ 결정 후 Code에 작업지시서 넘어오면:
- 마법사 분기 트리 (전체 게시판 × 모든 분기)
- 각 분기별 가이드 문구
- UI 시안
- Supabase 스키마 + posts 컬럼 추가
- pages/board.html / app.html 글쓰기 마법사 본진 빌드

# § 5. 본 트랙 진입 시점 (CLAUDE.md 큰 그림 정합)

| 시점 | 가능성 |
|---|---|
| 5/10 ~ 5/14 (P1.5 종료 ~ 4팀 오픈) | Claude AI 측 마법사 결정 + Code 측 spec v2 갱신 + 메모리 갱신 (병행) |
| 5/15 4팀 오픈 | home_v2 메인 진입로 가동 (P1.5 산출물). 가입 흐름만 안정화 |
| 5/15 후 ~7.8세션 | Phase 1 잔여 (Step 6~16) + 4팀 자산화 본진 병행 |
| 5/15 후 ~ | 마법사 본진 + Supabase posts 적재 + 1,564건 검증 후 INSERT |

# § 6. 데이터 위치 (로컬, GitHub 푸시 X)

| 영역 | 경로 |
|---|---|
| 작업 디렉토리 | `C:\limtaesung\4team-archive` (onesecond 레포와 분리) |
| 인덱스 CSV (Phase 1) | `C:\limtaesung\4team-archive\_output\file_index.csv` |
| 본문 CSV (Phase 1) | `C:\limtaesung\4team-archive\_output\file_content.csv` |
| 인덱스 CSV (Phase 2) | `C:\limtaesung\4team-archive\_output\file_index_phase2.csv` |
| 본문 CSV (Phase 2) | `C:\limtaesung\4team-archive\_output\file_content_phase2.csv` |
| 빌드 요약 | `C:\limtaesung\4team-archive\_output\build_summary.md` / `build_summary_phase2.md` |

⚠️ **GitHub 푸시 금지** — 4팀 단톡방 자료 = 민감정보 (실명·연락처·실제 영업 자료). 로컬 보관만.

# § 7. 본 archive 사용 권한

본 파일은 **2026-05-10 새벽 시점 4팀 자산화 트랙 진실 원천 raw**. Claude AI(웹) 채팅 로그 + Claude Code(본 인스턴스) 받은 컨텍스트 통합.

**다음 세션 진입 시:**
- Code가 _INDEX.md 읽고 본 파일 인지
- Claude AI 측 결정(마법사 분기) 받으면 Code가 작업지시서 분해 후 진입
- Chrome 측 검증 트리거 (Supabase posts 적재 PASS / 마법사 UI 동작 등)

**진실 원천:**
- 본 파일 (4팀 자산화 트랙 컨텍스트)
- 메모리 `kakao_migration_strategy.md` (트랙 본질 + 갱신 누적)
- spec v2 § 2-1 board_type 7종
- 로컬 데이터 (`C:\limtaesung\4team-archive\_output\`)
