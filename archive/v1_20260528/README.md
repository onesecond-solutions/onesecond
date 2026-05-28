# v1 라이브 자료 보존 (2026-05-28 v1 → v2 전환 시점 스냅샷)

## 본질

본 폴더는 2026-05-28 v1 → v2 전환 시점에 라이브에 가동되던 v1 자료를 보존한 자리입니다.

**폐기 X — 자료 보존 + 회귀 분석 + 격차 진단용.** Git 히스토리도 자동 보존 (git mv = rename 자료 따라감).

## 보존 자료 (12건)

| 파일 | 크기 | 본질 |
|---|---|---|
| `app.html` | 3,697 line | v1 SPA 본체 (switchMenu + D영역 fetch + IIFE 동적 실행 패턴) |
| `pages/home.html` | 44KB | v1 홈 (5층 재구성, 어제 PR #50~#55 자료) |
| `pages/home_v2.html` | 1.5KB | v1 home_v2 (placeholder) |
| `pages/myspace.html` | 210KB | v1 MY SPACE (어제 PR #67 ⚡ 딸깍 + 카드 만들기) |
| `pages/scripts.html` | 46KB | v1 스크립트 (10 stage) |
| `pages/quick.html` | 14KB | v1 Quick 메뉴 |
| `pages/together.html` | 53KB | v1 함께해요 |
| `pages/news.html` | 9KB | v1 보험뉴스 (issues Supabase fetch) |
| `pages/board.html` | 458KB | v1 현장의 소리 (7탭: qna / manager_notice / navigation / insurer / archive_legacy + manager_lounge / hub) |
| `pages/team-management.html` | 25KB | v1 팀원관리 |
| `pages/voice.html` | 1.5MB | v1 voice (redirect stub + base64 PNG 5건 자료 보존) |
| `pages/team_chat.html` | 1.5MB | v1 team_chat (redirect stub + base64 PNG 자료 보존) |

## v2가 보존 자료 (이동 X — 그대로 가동)

- `pages/admin.html` (admin 진입 stub)
- `pages/admin_v2.html` (admin 본문, 184KB)
- `pages/about.html`
- `pages/_template.html`
- `pages/pricing-content.html` (어제 PR #126)
- `pages/landing.html` (랜딩, v1/v2 동일)

## 복원 방법 (회귀 발생 시)

본 자료 통째 복원:
```bash
git mv archive/v1_20260528/app.html app.html
git mv archive/v1_20260528/pages/*.html pages/
git commit -m "revert(v1-to-v2): v1 자료 통째 복원 (회귀 자체 자체 자체)"
```

부분 복원 (예: v1 board.html만):
```bash
git mv archive/v1_20260528/pages/board.html pages/board.html
```

## 관련 자료

- 전환 PR: `feat/v1-to-v2-migration` (2026-05-28)
- Plan 파일: `C:\Users\az\.claude\plans\federated-growing-corbato.md`
- 어제 마감 자료: PR #105~#126 (어제 5/27)
- 시안 출처: 옛 `_new/` 폴더 자료 (PR #16~#125 누적, 2026-05-22 갈아엎기 결재)
