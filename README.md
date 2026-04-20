# 원세컨드 (OneSecond)

> 보험 TM 설계사용 상담 실행 도구
> "통화 중 멈추는 순간, 원세컨드가 이어갑니다"

**배포 URL:** https://onesecond.solutions
**버전:** v1.1 (개발 중)
**첫 배포:** 2026-04-20 배포 연기 → DB 재설계 후 재배포 예정

---

## 프로젝트 소개

17년 보험 TM 현장 경험을 바탕으로 만든 SaaS. 설계사가 고객 상담 중 멈추지 않도록, 상담 흐름(도입 → 필요성 → 상황확인 → 보장분석 → 상품설명 → 클로징 → 반론대응)을 디지털화한 실시간 멘트 실행 도구.

### 핵심 정체성
- 상담 중 멈추지 않는 도구
- 고객정보 저장 안 함, 내부 상담 도구
- 교육 플랫폼 아님, CRM 아님

### 4축 구조
- **스크립트** — 상담 중 참조
- **퀵메뉴** — 긴급 접근
- **게시판** — KakaoTalk 그룹채팅 대체
- **MY SPACE** — 개인 자산 공간
- **함께해요** — 사용자 참여 커뮤니티 (v1.1 신규)

---

## 폴더 구조

```
onesecond/
│
├── [사이트 배포 파일]
│   ├── app.html              # SPA 메인 프레임 (A1/A2/B/C/D)
│   ├── index.html            # 랜딩 페이지
│   ├── login.html            # 로그인
│   ├── admin.html            # 관리자
│   ├── pricing.html          # 요금제
│   ├── about.html            # 소개
│   ├── pricing-content.html  # 요금제 콘텐츠
│   ├── _template.html        # 템플릿
│   ├── auth.js, db.js, font-scale.js
│   ├── CNAME
│   ├── pages/                # D영역에 로드되는 콘텐츠
│   │   ├── home.html, myspace.html, news.html
│   │   ├── scripts.html, quick.html
│   │   ├── board.html, together.html
│   ├── css/
│   └── js/
│
├── claude_code/              # Claude Code 작업 공간 (배포 영향 없음)
│   ├── _context/             # 맥락 문서
│   │   ├── 00_MASTER.md      # 불변 원칙 (필독)
│   │   └── 99_ARCHIVE.md     # 과거 세션 기록 누적
│   ├── _docs/                # 참조 문서
│   │   ├── design_guide.md   # 디자인 규칙
│   │   └── supabase_schema.md # DB 구조
│   └── _instructions/        # 작업 지시서
│       └── YYYYMMDD_주제.md
│
├── .gitignore                # Git 제외 규칙
└── README.md                 # 이 문서
```

---

## 기술 스택

| 레이어 | 기술 |
|---|---|
| 호스팅 | GitHub Pages |
| 프론트엔드 | HTML / CSS / JS (SPA 구조) |
| DB·인증 | Supabase (PostgreSQL, Auth) |
| 이메일 | Resend (SMTP) |
| AI | Claude API (Haiku) |
| 도메인 | onesecond.solutions |

---

## 개발 환경

### 로컬 작업 경로
```
C:\limtaesung\github\onesecond
```

### 필수 도구
- Node.js v24.15+ (Claude Code 실행)
- Git 2.53+ (Git Bash 포함)
- GitHub Desktop (커밋·Push용)
- Claude Code (`npm install -g @anthropic-ai/claude-code`)
- VS Code (권장 에디터)

### 집 PC / 회사 PC 작업 시작 루틴
```
1. VS Code 열기 (또는 cmd)
2. cd C:\limtaesung\github\onesecond
3. 터미널에서 claude 입력
4. 한국어로 대화 시작
```

### 배포 루틴
```
1. Claude Code로 파일 수정
2. GitHub Desktop → 변경 파일 확인
3. Summary 입력 → Commit to main → Push origin
4. 1~2분 대기 (GitHub Pages 자동 배포)
5. 브라우저 Ctrl+Shift+R (강력 새로고침)
```

---

## Claude 3도구 협업 구조

| 도구 | 역할 | 보는 범위 |
|---|---|---|
| Claude.ai (웹) | 기획·설계·지시서 작성 | 업로드 파일 + 프로젝트 지식 |
| Claude Code | 코드 직접 수정 | 로컬 폴더 |
| Claude in Chrome | 브라우저 조작 | 현재 보는 웹페이지 |

3도구는 **완전히 독립**. 연결 고리는 **md 파일**.

### Claude AI 한계 인지
긴 세션에서는 오류 증가. 사실 기반 판단은 Claude Code에 위임 (파일 직접 읽기 때문).

---

## Claude Code 사용법

### 기본 호출 패턴
```
claude_code/_context/00_MASTER.md의 원칙을 지키면서,
claude_code/_instructions/YYYYMMDD_주제.md 의 작업을 수행해줘.

완료 후 변경 내역 요약 보고.
```

### 작업 원칙 (반드시 지킬 것)
1. 실행 전 계획 제시 → 확인 → 실행
2. 파일 삭제 전 반드시 확인
3. "완료"·"완벽" 선언 금지 (팀장님 확인 전까지)
4. 파일 없이 추측 수정 금지
5. `app.html` / `app.js` 는 명시 요청 없이 수정 금지
6. child pages 함수는 `window.functionName` 전역 등록
7. CSS는 `tokens.css` 변수만 사용 (하드코딩 금지)
8. 직각 border-radius 금지 (최소 `--radius-sm` 8px)

---

## 권한 구조

| 현장 호칭 | role |
|---|---|
| 설계사, 팀장 | `member` |
| 실장 | `manager` |
| 지점장, 센터장 | `branch_manager` |
| 스텝, 총무 | `staff` |
| 보험사 담당자 | `insurer` |
| 운영자 | `admin` |

**PRO 접근:** `plan === 'pro'` OR role이 `manager` 이상

---

## 버전 로드맵

| 버전 | 목표 | 주요 내용 |
|---|---|---|
| v1.1 | 사용자 기반 확보 | 스크립트 + 게시판 + 함께해요 |
| v1.5 | 제휴 섹션 | 광고 배너 도입 |
| v2.0 | 원수사 유입 | 원수사별 전용 게시판 |
| v3.0 | CRM 탑재 | 설계사용 CRM 추가 |
| v4.0 | AI 접목 | Call Assistant, 보험판 구글 |

---

## 현재 상태 (2026-04-20)

### ✅ 완료
- 인프라: Resend SMTP + 도메인 인증 완료
- 디자인 시스템 확정 (tokens.css)
- SPA 프레임 + 10개 페이지
- 54개 상담 스크립트 업로드
- 게시판 4종 + 함께해요 섹션
- 모바일 반응형

### 🔴 진행 중
**Supabase DB 전면 재설계**
- 초기 설계 우회 흔적 발견
- Claude Code + Claude in Chrome 협업으로 정석 재점검
- 재설계 완료 후 재배포

### 📋 대기
- AZ금융서비스 더원지점 4팀 40명 첫 배포 (DB 재설계 후)
- 해피톡 응대 템플릿
- 광고 배너 메뉴 (v1.5~v2.0)

---

## 개발팀

**Owner:** 임태성 팀장
- AZ금융서비스 더원지점 4팀 팀장
- 보험 TM 17년 경력 (2010년 ING생명 대면 영업 시작 → TM)
- 개발 경력 약 7개월 차
- bylts0428@gmail.com

**AI 파트너**
- Claude (실행·코드) — Opus 4.7 Max
- GPT (아이디어·공감) — GPT Plus

---

## 라이선스

© 2026 OneSecond. All rights reserved.
