# Claude Code 호출 프롬프트 (복사해서 사용)

---

## 🚀 방법 1: 표준 호출 (추천)

```
claude_code/_context/00_MASTER.md의 원칙을 지키면서,
claude_code/_instructions/20260419_together_complete.md의 
작업을 수행해줘.

추가 참고:
- claude_code/_context/onesecond_context_update_20260419.md 
  (오늘 세션 전체 맥락)
- claude_code/_docs/design_guide.md (디자인 규칙)
- claude_code/_docs/supabase_schema.md (DB 구조)

작업 우선순위:
1순위 (반드시 완성): Supabase 확인 + 사이드바 메뉴 + together.html 
기본 페이지 + 글쓰기/읽기
2순위 (시간 되면): 댓글 기능 + 랜딩페이지 연결

각 파일 수정 후 변경 사항 보고.
완료 후 검증 체크리스트 결과 제출.
배포는 내일(4/21 월) 오전.
```

---

## 🎯 방법 2: 단계별 호출 (안전)

### 1단계: 작업 시작 전 확인

```
claude_code/_instructions/20260419_together_complete.md 
읽고 작업 계획 제시해줘.

- 수정할 파일 목록
- 작업 순서
- 예상 소요 시간
- 의심되는 부분 또는 추가 질문

내가 승인한 후에 작업 시작해.
```

### 2단계: 작업 실행

```
계획 승인. 작업 시작.
1순위 작업부터 진행하고, 각 파일 수정 완료할 때마다 
요약 보고해줘.
```

### 3단계: 완료 후 검증

```
작업 완료되면 다음 형식으로 보고:

1. 수정·생성 파일 목록 (파일명 + 변경 요약)
2. 검증 체크리스트 결과 (지시서의 체크리스트 각 항목 O/X)
3. SQL 스크립트 경로 (팀장님이 실행할 것)
4. GitHub 업로드 대상 파일 목록
5. 의심 구간 or 추가 검증 필요한 부분
```

---

## 💬 방법 3: 미니멀 호출 (Claude Code에 많이 맡김)

```
claude_code/_instructions/20260419_together_complete.md 
작업 수행. 00_MASTER.md 원칙 준수. 완료 후 보고.
```

---

## ⚠️ 주의사항

### 반드시 Claude Code에 전달할 파일 (.md 3개)

```
claude_code/
├── _context/
│   ├── 00_MASTER.md                            (기존)
│   ├── 99_ARCHIVE.md                           (기존)
│   └── onesecond_context_update_20260419.md   ← 오늘 세션 전체 맥락 (신규)
└── _instructions/
    └── 20260419_together_complete.md          ← 작업 지시서 (신규)
```

### 파일 저장 위치 (팀장님 로컬 경로)

```
C:\limtaesung\github\onesecond\claude_code\_context\
  └── onesecond_context_update_20260419.md

C:\limtaesung\github\onesecond\claude_code\_instructions\
  └── 20260419_together_complete.md
```

---

## 📋 Claude Code 작업 후 팀장님 확인 사항

### 1. SQL 실행
Claude Code가 생성한 SQL 파일을 Supabase SQL Editor에서 직접 실행.
파일 경로: `/mnt/user-data/outputs/20260419_together_setup.sql` 
또는 Claude Code가 생성한 경로.

### 2. GitHub 업로드
수정된 파일들을 GitHub Desktop으로 커밋·푸시.
커밋 메시지 예시: 
`함께해요 메뉴 + 페이지 신규 개발 (v1.2)`

### 3. 배포 전 테스트
- 로컬에서 `together.html` 로드 확인
- 글쓰기 테스트
- 카테고리 필터 작동 확인
- 가입 → 리다이렉트 작동 확인

### 4. 랜딩페이지 확인
`onesecond.solutions` 접속 → 신규 섹션 보이는지 → 
"지금 요청하기" 버튼 → 가입 폼 스크롤 → 
가입 완료 후 `함께해요` 페이지로 자동 이동 확인

---

## 🆘 문제 발생 시

Claude Code 작업 중 막히거나 이상하면:

1. **Claude Code에 "계속 진행해" 또는 "이 부분 다시 확인"** 지시
2. **심각하면 Claude AI(이 창) 다시 열어서 도움 요청**
3. **Claude Chrome 활용 — Supabase 대시보드에서 실시간 확인**

---

## 🏁 예상 완료 시간

- 1순위 (메뉴 + 페이지 + 기본 기능): **2~3시간**
- 2순위 (댓글 + 랜딩페이지 연결): **+1~2시간**
- 총: **3~5시간**

**배포(4/21 월 오전) 전 여유 있음.**
