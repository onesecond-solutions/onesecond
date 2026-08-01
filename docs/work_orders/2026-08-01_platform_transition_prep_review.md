# 원세컨드 플랫폼 전환 준비 — 읽기 전용 조사 결과 (제출물 6종)

> 지시 근거: 대표 「원세컨드 플랫폼 전환 준비 범위 확인서」(읽기 전용 조사·구현 착수 금지).
> 조사일: 2026-08-01. 방식: 저장소·git 5갈래 병렬 실측(코드/DNS/배포/DB 변경 0). 라이브·외부 대시보드 항목은 §대표 확인 필요 목록으로 분리.
> 구상 도메인: `onesecond.solutions`(플랫폼 홈) / `insu.`(보험) / `dayfolder.`(데이폴더) / `theonespace.`(더원스페이스).

---

## ⚠️ 최우선 — 착수 전 반드시 결정할 근본 사안

실측 결과, **문서가 전제한 "3제품 분리"는 현재 코드·저장소·전략문서에 실체가 없다.**

- `dayfolder`/`데이폴더` = 전 저장소 검색 **매치 0건**(개념·설계·씨앗 흔적조차 없음).
- `theonespace`/`더원스페이스` 리터럴 = **0건**. 대신 `공동스페이스`·`매니저룸`(내부 조직 기능)만 존재하며, `team`(매니저룸) 뷰는 **이미 폐지**(2026-06-05 myspace로 흡수).
- 최신 전략 2건(`docs/decisions/2026-07-13_personal_sales_tool_pivot.md`, `docs/strategy/2026-07-13_kim_directive_personal_sales_os.md`)은 조직/스페이스 기능을 **"독립 제품 분사"가 아니라 "숨김·보존·축소"**로 규정 = 이번 전환 구상과 방향이 정면으로 갈린다.

→ **이건 기술 문제가 아니라 방향 결정 사안이다.** 아래 준비 범위는 "보험 앱을 insu로 이동 + 루트를 소개 홈으로" 부분에 한해 실측했고(이건 즉시 실행 가능), dayfolder·theonespace는 **아직 만들 대상이 없어 "이동 준비"가 아니라 "신규 착수 결정"**이다. §6에서 결정 항목으로 정리.

---

## 제출물 1 — 현재 구조도 (도메인 → 배포 → 저장소 → Supabase → 외부)

```
onesecond.solutions  (단일 Apex 도메인)
   │  DNS: 등록처 → GitHub Pages  (CNAME 파일 = 저장소 루트에 1개뿐, "onesecond.solutions")
   ▼
GitHub Pages  ─ 빌드 없음(정적) · main 브랜치 · 저장소 루트(.) 직접 서빙 · .nojekyll
   │  (.github/workflows 3개 = db-migrate/issues-daily/typo-guard, 전부 배포와 무관)
   ▼
repo: onesecond-solutions/onesecond  (단일 origin)
   │
   ├─ index.html  → JS로 전원 /app.html 강제 리다이렉트 (루트 진입 = 곧 보험 앱)
   ├─ app.html   → 보험 SPA 본체 (20,928줄 단일 파일 · 11개 뷰 · ?view= 라우팅)
   ├─ insurance/{9종}/  → 공개 지식 페이지(SEO 색인 대상, canonical 하드코딩)
   ├─ /css /js /assets  → 전부 루트 절대경로(/css, /js)로 참조
   ▼
Supabase 프로젝트  pdnwgzneooyygfejrvbg (onesecond-v1-restore-0420, 유일 프로젝트)
   ├─ 테이블 ~32개 · Storage 버킷 7 · Edge Function 16 · pg_cron 2~3
   ▼
외부 서비스
   ├─ 인증: Supabase Auth (구글 OAuth + 이메일 OTP)
   └─ 결제: PortOne V2 (KG이니시스, 빌링키 정기결제)
```

**한 줄 요약:** 단일 저장소·단일 CNAME·빌드 없는 GitHub Pages 위에, **루트 도메인이 곧 보험 앱**인 모놀리식 구조. 하위도메인은 어디에도 구성돼 있지 않다.

---

## 제출물 2 — 영향도 표 (변경 필요 / 불필요 / 대시보드 확인)

| 항목 | 판정 | 근거 / 조치 |
|---|---|---|
| **루트 index.html 리다이렉트** | 🔴 변경 필요 | `index.html:52–61`이 전원 `/app.html`로 강제 이동 → 루트를 소개 홈으로 바꾸려면 제거·재설계 |
| **CNAME (도메인 바인딩)** | 🔴 변경 필요 | 저장소 1개·루트 고정. GitHub Pages는 저장소당 커스텀도메인 1개 → insu 앱은 **별도 저장소/Pages 또는 다른 호스팅 분리** 필요(단일 저장소로 루트+하위 동시 서빙 불가) |
| **canonical/og/ld+json 절대 도메인 21건** | 🔴 변경 필요 | insurance 9종에 하드코딩. 이동 시 일괄 교체 |
| **sitemap.xml 9 loc + robots Sitemap 1** | 🔴 변경 필요 | 절대 도메인 하드코딩. insu용 robots 신설(`/app.html` 차단 이관) |
| **insurance→앱 로그인 링크 18건** | 🔴 변경 필요 | `/app.html?view=home` 루트 상대 → insurance와 앱이 도메인 갈리면 깨짐 → 절대경로화 |
| **앱→공개문서 게스트 리다이렉트 3건** | 🔴 변경 필요 | `app.html:6305` `/insurance/...` 루트 상대 → 절대경로화 |
| **옛 공유·북마크 URL** | 🔴 변경 필요 | `onesecond.solutions/app.html?view=*` → insu 301(쿼리 보존) |
| **PWA manifest/sw.js** | 🟡 재점검 | `scope/start_url="/"`, sw origin 종속 → insu용 재설정 |
| **구글 OAuth redirect** | 🟢 코드 무변경 / 🔵 대시보드 | `auth-modal.js:1057` `window.location.origin` **자동적응**. 단 **Supabase Redirect URLs 허용목록에 insu 추가 필수** |
| **이메일 인증** | 🟢 영향 없음 | 6자리 OTP 코드(매직링크 미사용). 단 이메일 템플릿이 `{{.SiteURL}}` 쓰면 Site URL 반영 |
| **PortOne 결제/빌링키** | 🟢 코드 무변경 / 🔵 확인 | storeId/channelKey는 도메인 무관, `requestIssueBillingKey`에 redirectUrl 없음. **PG/PortOne 콘솔 서비스 도메인 화이트리스트만 확인** |
| **charge-subscriptions Edge** | 🟢 영향 없음 | 도메인 참조 0 |
| **앱 내부 자산 경로(/css /js /assets)** | 🟢 대체로 무해 | 앱을 통째 이동하면 상대경로 유지. 문제는 도메인 간 교차 링크뿐 |
| **휴대폰 본인인증** | ⚪ 해당 없음 | 라이브 미배포(홀딩). 추후 활성화 시 새 도메인 기준 콜백 등록 |

범례: 🔴변경필요 · 🟡재점검 · 🟢영향없음/무변경 · 🔵대시보드·외부계정 확인 · ⚪현재 해당없음

---

## 제출물 3 — 준비 작업 범위 (시작점 → 종료점)

**시작점:** 대표가 §6 결정을 확정(특히 A: 3제품 범위 / B: insurance 문서 위치 / C: 앱 호스팅 분리 방식).

**종료점(= 전환 준비 완료 정의):**
1. 보험 앱을 insu로 옮길 때 손봐야 할 URL·인증·결제·검색 항목이 **전부 목록화**(본 문서 §2·5로 충족).
2. insu 앱을 담을 **호스팅 분리 방식 확정**(별도 저장소 vs 별도 Pages vs 타 호스팅).
3. 루트를 소개 홈으로 바꾸는 **최소 파일 변경 범위 확정**(index 리다이렉트 제거 + about/landing 재사용).
4. dayfolder·theonespace를 **기존 Supabase에 데이터 안 섞고 붙일 분리안**(서비스 구분 컬럼/버킷/RLS·함수 분기) 설계 — *단 §최우선 사안 결정 후.*
5. 무중단 순서 + 롤백 지점 문서화(§4).

**이번 단계에서 하지 않은 것(지시대로 전부 미실행):** DNS 변경·하위도메인 실연결·루트홈 교체·Supabase 스키마/버킷 생성·로그인/결제/콜백 수정·리다이렉트 적용·운영배포·Secrets 변경.

---

## 제출물 4 — 단계별 실행안 (순서 · 검수 · 롤백)

> 전제: 아래는 **승인 후 실제 착수 시**의 순서 초안. 각 단계는 게이트 전용 배포 정책(2026-06-28)과의 정합을 먼저 확인.

| 단계 | 작업 | 검수 기준 | 롤백 |
|---|---|---|---|
| 0 | 대시보드 실측(§대표 확인 필요) — DNS·PortOne·Supabase Redirect 현황 확보 | 3개 외부설정 현황 캡처 | (읽기, 롤백 불필요) |
| 1 | **insu 호스팅 준비**(별도 저장소/Pages에 앱 복제, 아직 도메인 미연결) | insu 임시 URL에서 앱 정상 렌더·로그인 | 저장소 삭제 |
| 2 | 코드 교차링크 절대경로화(18+3건) + canonical/sitemap/robots 도메인 교체 (feature 브랜치·PR) | 로컬/미리보기서 링크·SEO 태그 검증 | PR revert |
| 3 | Supabase Redirect URLs·Site URL에 insu 추가 (기존 값 유지·추가만) | 구글 로그인 insu서 통과 | 추가분 제거 |
| 4 | **DNS: insu A/CNAME 추가**(기존 루트 레코드 무변경) | insu 접속·SSL 정상 | insu 레코드 제거 |
| 5 | 루트 index를 소개 홈으로 교체 + `/app.html*` → insu 301(쿼리 보존) | 루트=소개홈, 옛 북마크 리다이렉트 확인 | index.html 원복 |
| 6 | 사후: PWA manifest/sw, 검색 색인 재제출, 결제창 실도메인 테스트 | 홈스크린 실행·결제 1건·검색 노출 | — |

**핵심 안전장치:** 1~3단계는 **기존 라이브(onesecond.solutions)를 건드리지 않고** insu를 병행 구축 → 4~5단계에서만 실제 전환. 각 단계가 독립 롤백 지점.

---

## 제출물 5 — 위험 목록

1. **로그인 장애(최대 위험):** Supabase Redirect URLs에 insu 미등록 시 구글 OAuth 콜백 차단. → 4단계 전에 3단계 필수.
2. **결제 심사 URL 불일치:** PG/PortOne 콘솔이 서비스 도메인을 화이트리스트로 관리하면 새 도메인 결제창 차단·재심사. → 대시보드 확인 선행.
3. **공개문서 링크 단절:** insurance↔앱 교차링크 21건(18+3)이 도메인 갈리면 깨짐. → 2단계에서 절대경로화 없이 전환 금지.
4. **검색 노출 하락:** canonical/sitemap 도메인 교체 + 옛 URL 301 없이 이동하면 색인 유실. → 5·6단계 301 필수.
5. **데이터 혼선:** 3서비스가 한 Supabase 공유 시 `users` 테이블에 **서비스 구분 컬럼이 없어** 회원이 같은 행 공간 공유, cron(diary-push/notify_new_post)·Edge 함수가 원세컨드 테이블 고정 → 새 서비스 데이터가 의도치 않게 걸릴 수 있음.
6. **호스팅 구조 제약:** 단일 저장소·단일 CNAME이라 루트+insu 동시 서빙 불가 → 저장소/Pages 분리 필수(미결 시 전환 불가).
7. **게이트 배포 정책 충돌:** 현행 "임태성 게이트 전용 반영"(2026-06-28)과 루트 홈 교체(전체 노출)가 충돌 가능 → 착수 전 정책 정합 확인.
8. **stale 잔재:** `login.html:13` canonical(`/pages/home_v2.html`)·sw 프리캐시가 깨진 경로 의심 → 이동과 별개로 점검.

---

## 제출물 6 — 대표 결정 필요사항 (기술팀이 못 정하는 것만, 1회)

**A. (근본) 3제품 범위 확정** — dayfolder·theonespace는 코드·전략에 실체가 없고, 최신 전략은 조직기능 축소 방향. → ① 지금은 **보험 앱 insu 이동 + 루트 소개 홈만** 진행하고 dayfolder/theonespace는 별도 신규 트랙으로 미룰지, ② 세 제품 동시 설계로 갈지. (총괄 권고 = ①, 실체 있는 것부터)

**B. insurance 공개문서 위치** — 9개 지식 페이지를 (A)루트 소개 홈 쪽에 남길지 (B)앱과 함께 insu로 옮길지. SEO·교차링크 방향이 여기에 종속.

**C. 앱 호스팅 분리 방식** — 단일 저장소로는 불가. (a)별도 GitHub 저장소+Pages (b)기존 저장소 유지하고 다른 호스팅(Netlify 등) (c)기타. ※배포 플랫폼 변경은 총괄 임의결정 불가·위험 승인 사안.

**D. Supabase 공유 vs 신규** — "새 프로젝트 없이 공유"를 위해 `users`에 서비스 구분 컬럼 신설/버킷 분리/함수·RLS 분기를 감수할지, 아니면 서비스별 스키마 분리 수준을 어디까지 할지. (DDL·RLS = C등급 승인 대상)

**E. 게이트 배포 정책** — 루트 홈 전체 노출이 현행 "임태성 게이트 전용" 정책과 충돌. 전환 시점에 전체배포 재개할지.

---

## 대표 확인 필요 목록 (→ 2026-08-01 실측 완료로 대체됨, 아래 §7 참조)

---

## 제출물 7 — 대시보드/DNS 4건 실측 결과 (2026-08-01, 대표 Chrome, 읽기 전용·변경 0)

> 김실장 결정 반영해 **안1(기존 저장소=보험 insu 유지 + 루트 소개홈은 새 저장소) 확정**. 아래는 착수 전 외부 설정 실측.

### ① DNS — 관리업체 = **uhost.co.kr**
- 네임서버 `ns1/ns2.uhost.co.kr` → 도메인·DNS를 uhost.co.kr에서 관리. **insu 레코드 추가는 여기서.**
- 루트 A레코드: `185.199.108.153`(GitHub Pages 공식 IP ✓) + `210.220.163.82`(비-GitHub, uhost 계열 추정 — **잔재 의심, 정리 검토**).
- `www` = CNAME → `onesecond-solutions.github.io` (GitHub Pages 정상).
- `insu.onesecond.solutions` = 현재 `210.220.163.82` 응답(GitHub 미연결·와일드카드 추정) → **uhost에서 insu CNAME → 보험 저장소 `github.io` 설정** 필요.

### ② Supabase Auth URL Configuration
- Site URL: `https://onesecond.solutions`
- Redirect URLs 5개: `onesecond.solutions/**` · `/login.html` · `/index.html` · netlify deploy-preview 2개(옛 흔적, 정리 후보)
- ⇒ **insu 이동 필수:** `https://insu.onesecond.solutions/**` 추가 + Site URL 처리. **현재 insu 미등록 = insu에서 구글 로그인 차단됨(확인)**. (코드는 `window.location.origin` 자동적응이라 무수정, 대시보드 등록만 필요 — 총괄 대행 가능)

### ③ Supabase 실 스키마·RLS (프로젝트 pdnwgzneooyygfejrvbg)
- **public 66개 테이블**(본 문서 §Supabase의 "약 32개"는 stale 스냅샷 기준, 실측 66).
- RLS: **거의 전부 ON.** ⚠️ **RLS OFF 2건(점검 권장):**
  - `salesimport_staging`(~2,400행) — 카카오 이관 스테이징 추정, RLS 없어 노출 주의.
  - `_bak_users_team_20260623`(백업 테이블) — 정리 후보.
- 주요 규모: posts ~14.7k · comments ~13.7k · exception_diseases ~23.5k · myspace_files ~3.5k · newsletters ~557 · users ~52 · sales_customers ~92.
- **cron 활성 상태 = 미확정**(자동화 환경 SQL 에디터 불안정). 문서상 잡 = `diary-push-5min`·`ocr-batch-5min`. 도메인 무관이라 전환엔 비영향 → 대표 세션 재확인 권장.

### ④ PortOne 등록 도메인 — 총괄 접근 차단
- `admin.portone.io`가 **브라우징 정책상 차단**되어 총괄이 못 봄. → **대표 직접** 콘솔에서 등록 서비스 도메인·웹훅 확인.
- 코드 실측상 결제 = PortOne V2 빌링키(redirectUrl 없음·서버간)라 **도메인 의존 낮음** → insu 이동 시 결제 차단 위험 낮게 평가. KG이니시스 가맹점 도메인 화이트리스트만 확인.

### insu 이동 "외부 설정" 체크리스트 (실측 확정)
| # | 조치 | 어디서 |
|---|---|---|
| 1 | insu CNAME → 보험 저장소 `github.io` (+루트 `210.220.163.82` 잔재 A레코드 정리 검토) | **uhost.co.kr** |
| 2 | Auth에 `insu.onesecond.solutions/**` redirect + Site URL | Supabase (총괄 대행 가능) |
| 3 | 결제 서비스 도메인·웹훅 확인 | **PortOne/KG이니시스 (대표 직접)** |
| 4 | (위생·별건) RLS off 2건 점검 · 백업테이블 · netlify redirect 정리 | Supabase |

---

*본 문서는 읽기 전용 조사 산출물이며 어떤 운영 변경도 수반하지 않음. 안1 확정·4건 실측 완료. 실제 이동 구현은 별도 승인 사안.*
