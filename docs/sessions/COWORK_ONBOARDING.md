# Cowork 합류 가이드 — onesecond 본 트랙 통합

> 작성일: 2026-05-02
> 작성자: Claude Web (총괄 기획자)
> 대상: Cowork (자료 정리·자산화 작업자)
> 목적: Cowork이 onesecond 본 트랙에 안전하게 합류하기 위한 권한·제한·작업 프로토콜 정의

---

## 1. Cowork의 역할 정의

onesecond 프로젝트는 4역할 체계로 운영됩니다.

| 번호 | 역할 | 환경 | 주 임무 |
|---|---|---|---|
| ① | Claude Web | claude.ai | 총괄 기획자. 전략·작업지시서 |
| ② | Claude Code | VS Code 터미널 | 실행 개발자. 코드·DB |
| ③ | Claude Chrome | 브라우저 에이전트 | 라이브 검증·UI 확인 |
| ④ | **Cowork** | 데스크톱 도구 | **자료 정리·자산화 작업자** |

**Cowork의 강점:** 로컬 PC 대용량 자료 처리 (zip 해제·PDF/PPTX 추출·OCR·STT·인벤토리 작성)

**Cowork이 하지 않는 것:** 코드 작성·DB 마이그레이션·UI 디자인·기획 의사결정

---

## 2. 도메인 권한 (1단계 — 읽기 전용)

### Cowork Settings → Capabilities에 추가할 도메인

| 도메인 | 용도 | 위험도 |
|---|---|---|
| `onesecond.solutions` | 운영 사이트 공개 페이지 | 0 |
| `raw.githubusercontent.com` | GitHub raw 파일 fetch | 0 |
| `api.github.com` | GitHub repo 메타데이터 | 0 |

### 도메인 추가만으로 볼 수 있는 것 / 없는 것

**볼 수 있는 것**
- `index.html` (랜딩), `login.html`, `pricing.html`, `about.html` — 로그인 불필요
- GitHub Public repo의 모든 소스코드 (`app.html`, `tokens.css`, `auth.js`, `db.js` 등)
- Supabase 스키마 정의 (repo 안에 있다면)
- `scripts-data.js`의 54개 시드 데이터

**볼 수 없는 것**
- 로그인 후 화면 (`app.html` 동작 상태, `home.html` 데이터, `admin_v2.html` 등)
- Supabase DB 실제 데이터
- 사용자 인터랙션 흐름

→ **자료 자산화 매핑에는 소스코드만으로 90% 충분.** 나머지 10%는 팀장님이 스크린샷 첨부로 보완.

---

## 3. 1단계 권한 사용 시 제한조건

### 사전 약속 (Cowork이 새 세션 시작 시 따를 규칙)

```
GitHub repo와 onesecond.solutions 분석 시 다음을 지켜:

1. 발견한 보안 취약점은 채팅에만 보고하고,
   GitHub Issues나 PR로 공개 게시 금지

2. anon key, API key, 비밀번호 등 시크릿 발견 시
   전체 내용을 채팅에 그대로 출력하지 말고,
   "○○ 파일 ○○줄에 ○○ 종류의 시크릿 발견" 식으로만 보고

3. 분석 결과를 Cowork 메모리에 저장할 때,
   시크릿 값은 절대 포함 금지

4. 사이트의 폼·버튼·링크 등을 자동 클릭하지 말 것
   (예: 회원가입 시도, 결제 테스트 등)

5. onesecond.solutions에 트래픽 부담 주는 반복 요청 금지
   (1초에 여러 번 같은 페이지 새로고침 등)
```

---

## 4. GitHub MCP 커넥터 (2단계 — 쓰기 권한, 미실시)

> **현재는 1단계까지만 진행. 2단계는 1단계 효과 검증 후 별도 결정.**

### 2단계 진입 시 필수 사전 작업

#### (1) GitHub Branch Protection 설정 (필수)
GitHub 저장소 Settings → Branches → `main` 브랜치 보호 규칙:
- ✅ Require pull request before merging
- ✅ Require approvals: 1
- ✅ Restrict force pushes
- ✅ Block direct push to main

#### (2) GitHub OAuth 권한 범위 (Fine-grained)
| 권한 | 허용? | 이유 |
|---|---|---|
| Contents: Read | ✅ | 파일 읽기 (필수) |
| Contents: Write | ✅ | 커밋·푸시 (필수) |
| Pull requests: Read & Write | ✅ | PR 생성 |
| Issues: Read & Write | ⚠️ 선택 | 작업 추적용 |
| Administration | ❌ | 저장소 설정 변경 차단 |
| Delete | ❌ | 저장소 삭제 차단 |
| Workflows | ❌ | GitHub Actions 변경 차단 |

#### (3) 저장소 범위
- ❌ "All repositories" — 절대 금지
- ✅ "Only select repositories" → `onesecond-solutions/onesecond` 단독 선택

---

## 5. 2단계 진입 시 행동 규칙 (COWORK_RULES)

### 절대 금지 (Hard Rules)

```
❌ main 브랜치 직접 push 금지 (Branch Protection이 차단하지만 시도도 금지)
❌ force push 금지
❌ 기존 파일 삭제 금지 (rename·이동 포함, 명시 지시 시만)
❌ docs/sessions/ 폴더 수정 금지 (Code 전용)
❌ docs/architecture/ 폴더 수정 금지 (Web 전용)
❌ supabase/ 폴더 수정 금지 (Code 전용)
❌ app.html, app.js, index.html 수정 금지 (Web/Code 전용)
❌ tokens.css 수정 금지 (Web 전용)
❌ pages/*.html 수정 금지 (Web/Code 전용)
❌ .github/workflows/ 수정 금지
❌ package.json, *.config.* 수정 금지
❌ Issues·PR에 자동 코멘트 작성 금지 (사전 승인 시만)
```

### 허용 영역 (Allowlist 방식)

```
✅ docs/knowledge/raw/         — 원본 인벤토리·통계
✅ docs/knowledge/processed/   — 추출·OCR·STT 결과
✅ docs/knowledge/governance/  — 가이드라인 (Web 작성 후 승인 시만)
✅ docs/knowledge/handoffs/    — Cowork 인수인계 문서
✅ docs/knowledge/cowork_memory/ — Cowork 자체 메모리 사본
```

**원칙: `docs/knowledge/` 안에서만 자유롭게, 그 외는 다 금지.**

### 작업 절차

```
1. 모든 작업은 새 브랜치에서 수행
   브랜치명: cowork/YYYY-MM-DD_작업내용
   예: cowork/2026-05-02_kakao-inventory-push

2. 커밋 메시지 형식
   feat(knowledge): [작업 요약]
   - 변경 파일 목록
   - 관련 인벤토리 ID 또는 자료 출처
   Co-Authored-By: Cowork <noreply@anthropic.com>

3. 작업 완료 시 main 직접 머지 금지
   → Pull Request 생성 후 팀장님 승인 대기

4. 작업 시작 전 반드시 다음 파일 읽기
   - 이 파일 (COWORK_ONBOARDING.md)
   - docs/knowledge/handoffs/ 최신 파일
   - 관련 _INDEX.md

5. 결정이 필요한 순간 즉시 작업 멈추고 보고
   - 폴더 구조 변경
   - 새 파일 형식 도입
   - 권한 등급 분류
   - 12분류 매핑 모호한 자료
```

### 보존 규칙

```
✅ 원본 자료(.txt, .zip 등)는 절대 수정·삭제 금지
✅ 처리 결과는 별도 파일로 생성 (원본 덮어쓰기 금지)
✅ 같은 자료 재처리 시 새 파일명 + _v2, _v3 suffix
✅ 삭제가 필요해 보이면 일단 _archive/ 폴더로 이동 제안만
```

### PR 본문 필수 항목

```
- 작업 범위 (한 줄)
- 변경 파일 수·종류
- 자가 검증 결과 (행수·합계 일치 등)
- 보류·결정 대기 항목
- 다음 권장 작업
```

---

## 6. 작업 프로토콜 (팀장님 매번 확인)

### Cowork 새 세션 시작 시 첫 메시지 템플릿

```
다음 4개 파일을 읽고 시작해줘:
1. https://github.com/onesecond-solutions/onesecond/blob/main/docs/knowledge/COWORK_ONBOARDING.md
2. https://github.com/onesecond-solutions/onesecond/blob/main/CLAUDE.md
3. docs/knowledge/handoffs/ 폴더의 가장 최신 파일
4. docs/sessions/ 폴더의 가장 최신 파일

읽고 나서 현재 상황 한 줄로 요약하고 대기해.
지시 없이 절대 파일을 만들거나 푸시하지 마.
```

### 매 PR 받았을 때 팀장님 체크리스트

GitHub Desktop / 웹에서 확인:
- [ ] 변경된 파일이 `docs/knowledge/` 안에만 있는가?
- [ ] 금지 폴더(sessions / architecture / supabase / app.* 등) 수정 없는가?
- [ ] 삭제된 파일은 없는가? (있으면 일단 거절)
- [ ] PR 본문에 자가 검증 결과가 있는가?
- [ ] 결정 대기 항목이 명확한가?

### 위험 신호 (즉시 PR 거절)

```
🚨 main에 직접 푸시 시도 흔적
🚨 파일 삭제 (Renamed가 아닌 진짜 Deleted)
🚨 변경 파일 수가 100개 초과
🚨 .yml, .json, .config 파일 변경
🚨 commit 메시지가 비어있거나 의미 불명
🚨 Co-Authored-By 라인 누락
```

---

## 7. 단계별 진행 순서

### 1단계 (현재 진행) — 도메인 추가, 읽기 전용
1. Cowork Settings → Capabilities에 도메인 3개 추가
2. 사전 약속 5개 전달
3. Cowork이 사이트·repo 1차 스캔
4. 메모리 보강 + 자료 자산화 매핑 정확화
5. **위험도 0**

### 2단계 (1단계 효과 검증 후 별도 결정) — GitHub MCP 커넥터, 쓰기 권한
1. GitHub Branch Protection 먼저 설정
2. Cowork-GitHub MCP 커넥터 연결 (저장소 단일 선택, 권한 최소화)
3. 이 파일을 `docs/knowledge/COWORK_ONBOARDING.md`로 푸시
4. 테스트 PR 1개로 검증 (현재 보유한 인벤토리 5개 파일 푸시)
5. 정상 동작 확인 후 본격 운영

---

## 8. 자료 자산화 트랙 — Cowork 1차 산출물 (확보 완료)

### 산출물 5개 (현재 팀장님 PC에 있음)

| 파일 | 행 수 | 상태 |
|---|---:|---|
| `01_인벤토리.csv` | 165 | ✅ 검증 완료 |
| `02_자료종류통계.md` | — | ✅ 검증 완료 |
| `03_카톡로그_원문.md` | — | ⚠️ 셸만 (본문 변환 보류) |
| `04_공유제한_검출.csv` | 5 | ✅ severity 비움 (등급 부여 후속) |
| `README.md` | — | ✅ |

### Cowork이 자체 생성한 메모리·인수인계 (Cowork 환경 안에만 존재)

- 메모리 7개 + MEMORY.md 인덱스 (Cowork 자체 메모리 시스템)
- `_HANDOFF.md` (워크스페이스 안 인수인계 문서)
- 파이썬 스크립트 2종 (zip 해제·PDF 추출 / 카톡 로그 마크다운 변환)

### 향후 GitHub 푸시 대상 폴더 (2단계 진입 시)

```
docs/knowledge/
├── raw/
│   └── 2026-05-01_kakao_4team_inventory/
│       ├── 01_인벤토리.csv
│       ├── 02_자료종류통계.md
│       ├── 03_카톡로그_원문.md
│       ├── 04_공유제한_검출.csv
│       └── README.md
├── processed/      # 추출·OCR·STT 결과
├── governance/     # 권한 5등급·12분류 가이드라인 (Web 작성)
├── handoffs/       # 세션 인수인계 문서
└── cowork_memory/  # Cowork 메모리 7개 사본
```

---

## 9. 주요 발견 사항 (인벤토리 165건 분석 결과)

### 권한 5등급 매핑 1차 후보 (공유 제한 5건)

| ID | 자료 | 권한 등급 후보 |
|---|---|---|
| 1·2 | ABL THE더블 종신 (임태성 분석) | **4팀공용** |
| 3 | 흥국생명 [대외비] 메디컬언더라이팅 가이드 | **관리자전용** |
| 4·5 | 4팀 노션 공유폴더 | **4팀비밀** |

### 공급자 편중 (기본 신뢰 등급 정책 정당화)

- 한재성 실장: 138건 (84%)
- 임태성 팀장: 17건 (10%)
- 그 외 6명: 10건 (6%)

→ 두 분 자료는 **검수 자동 통과** 또는 **기본 신뢰 등급**으로 시작 가능.

### 12분류 매핑 시드 (메모리의 12분류 정의에 그대로 활용 가능)

| 추정 카테고리 | 건수 | 12분류 매핑 후보 |
|---|---:|---|
| 교안(보험사 월별) | ~30 | 1. 보험사 월별 교안 |
| 보험사 변경/개정 공지 | ~10 | 2. 상품 변경·공지 |
| 인수·UW Q&A | ~10 | 3. 인수지침·예외질환 |
| 상품비교 가이드북 | ~10 | 4. 상품비교·시책 |
| 콜녹음(도입/상담/굿콜) | ~29 | 5. 콜녹음 → scripts 직결 |
| 스크립트 | ~10 | 6. 스크립트 라이브러리 |
| 약관·질병·알려줘시리즈 | ~7 | 7. 약관·질병자료 |
| 미러링·전산 매뉴얼 | ~7 | 8. 전산·미러링 매뉴얼 |
| 보험료표/실손 | ~7 | 9. 보험료표 |
| 단기납종신/연금/생명 | ~6 | 10. 종신·연금·생명 |
| 간병 자료 | ~7 | 11. 간병 자료 |
| 고객 발송용/DM | ~3 | 12. 고객 발송용 |

### 재게시 6건 (최신본 우선 정책 필요)

- 상품비교 가이드북 (생손보 01.19).pdf
- 간병 정리.ods
- 가족간병 유의사항.txt
- KB손보_2월 영업방향 교육자료
- AZ_보험사별 개정사항_26.04
- 3대질병진단비 보험료(26.03.04).pdf

→ DB 컬럼 `is_latest_version` 한 개로 처리.

---

## 10. 다음 작업 (Cowork 도메인 추가 완료 후 즉시)

1. **사이트·repo 1차 스캔** — onesecond.solutions + GitHub repo 구조 파악
2. **메모리 갱신** — Cowork 자체 메모리 `project_onesecond_platform.md`에 실제 관찰 내용 반영
3. **자료 자산화 매핑 명확화**
   - 인벤토리 컬럼 ↔ `library` 테이블 컬럼
   - 카톡 로그 마크다운 ↔ `knowledge_chunks` (pgvector)
   - 공유 제한 ↔ `library.access_level` 또는 별도 권한 매트릭스
   - 콜녹음 ↔ 기존 `scripts` 테이블 (54개 시드와 통합)
4. **자산화 파이프라인 설계 보고** — Make + Claude Haiku + Supabase 적재 흐름도

---

## 11. 절대 원칙 (Cowork이 항상 지켜야 할 것)

```
✅ 자료 보존 절대 규칙: 지시 전 삭제·수정 금지
✅ 결정 시점 즉시 멈춤+보고
✅ 모든 산출물은 docs/knowledge/ 안에서만 (2단계 진입 시)
✅ GitHub를 진실 원천으로
✅ 보수적 회피 점검: 결정 전 "보수적 회피인지 진짜 분석인지" 점검
✅ 일정 압박 단어 사용 금지
```

---

## 12. 환경 한계 (재확인 필요)

| 항목 | 상태 (2026-05-02 기준) | 영향 |
|---|---|---|
| Cowork 리눅스 샌드박스 | ❌ 미기동 | bash·python·unzip·pdftotext·libreoffice 사용 불가 |
| Read/Write/Edit/Grep | ✅ 정상 | 텍스트 파일 처리 가능 |
| 인터넷 (도메인 추가 전) | △ 일부 | onesecond.solutions·raw.githubusercontent.com·api.github.com 차단 |
| 인터넷 (도메인 추가 후) | ✅ | 위 3개 도메인 접근 가능 |

다음 세션 Cowork은 **메모리만 믿지 말고 실제 환경을 한 번 더 확인**할 것.

---

*이 파일은 Claude Web (총괄 기획자)이 작성하여 팀장님이 Cowork에 전달하는 합류 가이드입니다.*
*수정·갱신은 Web에서 진행하며, Cowork은 이 파일을 읽기만 합니다.*
