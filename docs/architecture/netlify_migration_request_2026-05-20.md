# Netlify 이전 GUI 작업 의뢰서 v1 — onesecond

> **작성일:** 2026-05-20 (D-day 4팀 오픈)
> **수신:** Claude in Chrome (또는 팀장님 직접 GUI 진행)
> **본진:** GitHub Pages → Netlify 호스팅 이전 + staging 미러링 구조 진입 (PR preview 자동화)
> **현 호스팅:** GitHub Pages (CNAME = `onesecond.solutions`)
> **이전 후 호스팅:** Netlify (Auto Deploy from `main` + PR마다 자동 preview URL 생성)
> **DB:** Supabase 신버전 그대로 유지 (`pdnwgzneooyygfejrvbg`)
> **사이트:** https://onesecond.solutions
> **Netlify 팀:** https://app.netlify.com/teams/bylts0428/projects

---

## § 0 사전 조건

- [x] Netlify 계정 로그인 완료 (`bylts0428` 팀, 2026-05-20 08:30 KST 확인)
- [ ] GitHub `onesecond-solutions/onesecond` repo OAuth 권한 (§ 1에서 진행)
- [ ] 도메인 등록처(가비아/후이즈/Namecheap 등) 관리 페이지 접근 (§ 2 DNS 변경용)
- [ ] 4팀 D-day 시연 종료 확인 (§ 2 DNS 이전 전 필수)

### 0-1. 진행 순서 (필수 정합)

```
§ 1 (라이브 영향 0)   → 시연 진행 중에도 안전, 즉시 진입 가능
§ 2 (라이브 영향 大)  → ⚠️ 시연 끝 결재 후만 진입
§ 3 (라이브 영향 0)   → § 2 완료 + 안정성 검증 후 진입
```

---

## § 1 본진 1 — GitHub repo import + 첫 배포 (~5분, 라이브 영향 0) ⭐

### 1-1. 새 사이트 추가

| # | 단계 | 기대값 |
|---|---|---|
| 1 | https://app.netlify.com/teams/bylts0428/projects 진입 | 본인 팀 대시보드 노출 |
| 2 | 화면 우상단 또는 가운데 [Add new site] 또는 [Add new project] 클릭 | 드롭다운 메뉴 노출 |
| 3 | [Import an existing project] 클릭 | 깃 제공자 3종 화면 (GitHub / GitLab / Bitbucket) |
| 4 | [Deploy with GitHub] 클릭 | GitHub OAuth 팝업 |
| 5 | "Authorize Netlify" 클릭 | 권한 범위 선택 화면 |
| 6 | "Only select repositories" → `onesecond` 선택 → [Install] | repo 목록 화면 노출 |
| 7 | [onesecond] 클릭 | 빌드 설정 화면 |

### 1-2. 빌드 설정 (정적 사이트 = 빌드 없음)

| 항목 | 값 |
|---|---|
| Branch to deploy | `main` |
| Base directory | (비워둠) |
| **Build command** | **(비워둠) ⭐ 중요** |
| **Publish directory** | **`.` (점 하나) ⭐ 중요** |
| Functions directory | (비워둠) |

→ [Deploy onesecond] 버튼 클릭 → 첫 배포 시작 (~1분)

### 1-3. 임시 URL 라이브 검증

| # | 검증 | 기대값 |
|---|---|---|
| 8 | 자동 생성된 임시 URL 노출 | `https://[random-name]-[hash].netlify.app/` |
| 9 | 임시 URL 진입 | 현재 `onesecond.solutions`와 동일한 랜딩 5컷 |
| 10 | 5컷 스크롤 정상 fade-in | scene 1~5 모두 PASS |
| 11 | 헤더 [로그인] + [가입하기] 버튼 둘 다 노출 | § 5 사전 정정 정합 |
| 12 | [가입하기] 클릭 | `/index.html?auth=signup` 진입 → 통합 모달 가입 폼 |
| 13 | [로그인] 클릭 | `/index.html?auth=login` 진입 → 통합 모달 로그인 폼 |
| 14 | DevTools Console 에러 0건 | 빨간 에러 X (회색 warning 무관) |

### 1-4. § 1 보고 항목

- 임시 URL 1건 (캡처 권장)
- 빌드 로그 (실패 시 에러 메시지 전체)
- # 9~14 OK / FAIL 표시
- 화면 캡처 1건 (랜딩 5컷 첫 화면)

---

## § 2 본진 2 — DNS 도메인 이전 (~10분, ⚠️ 시연 끝 후만)

### 2-1. 사전 조건 확인

- [ ] § 1 임시 URL 라이브 검증 PASS
- [ ] 4팀 D-day 시연 종료 확인 (팀장님 결재)
- [ ] 도메인 등록처 로그인 정보 준비

### 2-2. Netlify 쪽 도메인 추가

| # | 단계 | 기대값 |
|---|---|---|
| 15 | Netlify 사이트 대시보드 진입 | Site overview |
| 16 | [Site settings] → [Domain management] → [Add custom domain] | 도메인 입력 화면 |
| 17 | `onesecond.solutions` 입력 → [Verify] → [Yes, add domain] | DNS 레코드 안내 화면 |
| 18 | Netlify가 표시하는 DNS 레코드 캡처 | A record 또는 ALIAS/ANAME 안내 |

### 2-3. 도메인 등록처 DNS 변경

| # | 단계 | 기대값 |
|---|---|---|
| 19 | 도메인 등록처 관리 페이지 진입 | onesecond.solutions DNS 설정 화면 |
| 20 | 옛 GitHub Pages A record 4건 확인 | `185.199.108.153` / `185.199.109.153` / `185.199.110.153` / `185.199.111.153` |
| 21 | 옛 A record 4건 삭제 + Netlify 안내 신규 레코드 입력 | DNS 변경 저장 |
| 22 | DNS 전파 대기 5~30분 (최대 24시간) | DNS checker(`dnschecker.org`)로 확인 |
| 23 | `https://onesecond.solutions/` 진입 | Netlify 배포 화면 노출 (옛 GitHub Pages 화면 X) |
| 24 | Netlify Domain management 화면 | "Awaiting External DNS" → "✅ Netlify DNS" 박힘 |

### 2-4. HTTPS 자동 설정

Netlify가 Let's Encrypt 인증서 자동 발급 (~10분).

| # | 검증 | 기대값 |
|---|---|---|
| 25 | `https://onesecond.solutions/` HTTPS 정상 | 자물쇠 아이콘 + "Let's Encrypt" 인증서 |
| 26 | `http://onesecond.solutions/` 진입 | 자동 https로 redirect |

### 2-5. § 2 보고 항목

- DNS 변경 시각 / 전파 완료 시각
- HTTPS 자동 설정 OK / FAIL
- 라이브 = Netlify 배포 화면 OK / FAIL
- 화면 캡처 1건 (자물쇠 아이콘 보이는 상태)

---

## § 3 본진 3 — PR preview 자동 활성 확인 (~5분, 라이브 영향 0)

### 3-1. 테스트 PR 만들기

```bash
# 로컬에서 (팀장님 또는 Code가 진행)
git checkout -b test/pr-preview-check
echo "<!-- PR preview test 2026-05-20 -->" >> README.md
git add README.md
git commit -m "test: PR preview 자동 박힘 검증"
git push origin test/pr-preview-check
# → GitHub 진입 → "Compare & pull request" 클릭 → PR 만들기
```

### 3-2. PR preview URL 자동 생성 확인

| # | 검증 | 기대값 |
|---|---|---|
| 27 | PR 만든 직후 GitHub PR 화면 하단 | Netlify Bot 코멘트 박힘 + "Deploy Preview ready!" |
| 28 | Netlify 봇 코멘트의 임시 URL 클릭 | `https://deploy-preview-N--[site-name].netlify.app/` |
| 29 | 임시 URL 진입 | PR 변경사항 반영된 화면 노출 |
| 30 | `main` 브랜치 라이브 = `onesecond.solutions` 변경 없음 | ✅ 라이브 격리 |

### 3-3. PR 정리

```bash
# GitHub에서 PR close (Don't merge)
# 로컬에서
git checkout main
git branch -D test/pr-preview-check
git push origin --delete test/pr-preview-check
```

### 3-4. § 3 보고 항목

- PR preview URL 자동 박힘 OK / FAIL
- main 라이브 영향 0 OK / FAIL

---

## § 4 통합 결과 보고 항목

| # | 항목 | 결과 |
|---|---|---|
| 1 | Netlify 임시 URL | ___ |
| 2 | 첫 배포 OK | OK / FAIL |
| 3 | 5컷 + 모달 진입 정합 | OK / FAIL |
| 4 | DNS 이전 완료 시각 | ___ |
| 5 | HTTPS 자동 설정 | OK / FAIL |
| 6 | PR preview 자동 박힘 | OK / FAIL |
| 7 | `onesecond.solutions` 라이브 = Netlify 배포 | OK / FAIL |
| 8 | Console 에러 0건 | OK / FAIL |

---

## § 5 추가 컨텍스트 — 본 의뢰 직전 사전 정정

본 의뢰서 가동 직전 본진 1건 정정 박힘 (commit 대기):

- `pages/landing.html` 상단 헤더 = [로그인 톤다운] + **[가입하기 브라운 강조]** 박음
- `sw.js` 캐시 v122 → v123 갱신
- **본진:** 4팀 D-day 신규 사용자 진입로 헤더 노출 (옛 = 헤더 [로그인] 단 1개 = 가입자 진입로 빈 자리 격차)
- 본 의뢰서 § 1-3 #11~13에서 자동 검증 정합

---

## § 6 회귀 신호 (발견 시 작업 중단·즉시 보고)

| # | 신호 | 처방 |
|---|---|---|
| 1 | 임시 URL 진입 시 404 또는 빈 화면 | 빌드 실패 → 빌드 로그 캡처 → Code에 보고 |
| 2 | DNS 변경 24시간 지나도 옛 GitHub Pages 화면 박힘 | DNS 레코드 잘못 → 등록처 설정 재확인 |
| 3 | HTTPS 자물쇠 아이콘 X | Let's Encrypt 발급 실패 → Netlify Support 또는 24시간 대기 |
| 4 | PR preview URL 안 박힘 | Netlify build & deploy 설정 확인 |
| 5 | Supabase 인증/DB 에러 박힘 | ⚠️ CORS 격차 가능 → Supabase Dashboard → Authentication → URL Configuration에 신 도메인 추가 필요 |

---

## § 7 추가 본진 (선택)

§ 1~3 완료 후 다음 단계 추후 박힘 가능:

- **netlify.toml 박음** = repo에 빌드 설정 파일 박음 (현재는 Netlify UI 설정 의존)
- **`_headers` / `_redirects` 파일 박음** = 보안 헤더 + redirect 룰
- **branch_deploy 박음** = `staging` 브랜치 자동 = staging.onesecond.solutions 서브도메인
- **환경 변수 박음** = Supabase URL 등 비밀 키 (현재는 코드에 인라인)

---

**Code(Opus 4.7 1M) 작성. 2026-05-20 D-day 오전 진입 직후 박음.**
**§ 1 = 시연 진행 중 안전. § 2 (DNS) = 시연 끝 결재 후만. § 3 = § 2 완료 후 안정성 검증.**
