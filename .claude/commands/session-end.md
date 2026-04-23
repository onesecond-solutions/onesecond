---
description: 이번 세션 변경사항을 요약한 MD 파일을 생성하고 GitHub에 커밋·푸시합니다.
---

# 세션 종료 요약 생성

## 절차

### 1단계: 현재 시간 확인

현재 날짜·시간을 확인해서 파일명 생성 기준으로 사용한다.

- 파일명 형식: YYYY-MM-DD_HHmm.md (예: 2026-04-23_1830.md)
- 타이틀용 시간대 판단:
  - 05:00~11:59 → "오전"
  - 12:00~17:59 → "오후"
  - 18:00~23:59 → "저녁"
  - 00:00~04:59 → "심야"

### 2단계: Git 정보 수집

다음 명령을 순차 실행:

- git log --since="midnight" --pretty=format:"- %h %s (%an, %ar)" --no-merges
- git status --short
- git log --since="midnight" --name-only --pretty=format:"" | sort -u | grep -v "^$"
- git log -1 --pretty=format:"%h %s"
- git branch --show-current

각 결과를 변수로 기억. 비어있으면 "없음"으로 기재.

### 3단계: MD 템플릿 작성

아래 템플릿대로 파일 생성. {중괄호} 부분은 실제 값으로 채운다.

# 세션 요약 — {YYYY-MM-DD} {오전/오후/저녁/심야}

> **생성 시각:** {ISO 8601 형식}
> **생성 도구:** Claude Code /session-end 커맨드
> **작업 디렉토리:** onesecond

---

## 📌 진실 원천 (Source of Truth)

- **최신 커밋:** {git log -1 결과}
- **현재 브랜치:** {git branch --show-current 결과}
- **라이브 사이트:** https://onesecond.solutions
- **미커밋 변경:** {git status --short 결과 있으면 "있음", 없으면 "없음"}

---

## ✅ 이번 세션 커밋 히스토리

{git log --since="midnight" 결과}

커밋 없으면: "이번 세션에 커밋 없음."

---

## 📂 변경된 파일 목록

{파일 목록 불릿}

변경 없으면: "변경된 파일 없음."

---

## 🔧 미커밋 변경 (커밋 필요)

{git status --short 결과}

깨끗하면: "작업 디렉토리 깨끗함."

---

## 📝 이번 세션에서 한 일 (사람 판단 필요)

> ⚠️ Claude Code가 직접 알 수 없는 영역. 팀장님이 대화 맥락에서 보강할 것.

- [ ] 팀장님이 직접 기입

---

## 🚧 미해결 이슈 (다음 세션으로 인계)

> ⚠️ Claude Code가 직접 알 수 없는 영역. 팀장님이 대화 맥락에서 보강할 것.

- [ ] 팀장님이 직접 기입

---

## 🎯 다음 세션 시작 시 할 일

> ⚠️ Claude Code가 직접 알 수 없는 영역. 팀장님이 대화 맥락에서 보강할 것.

1. 이 파일(docs/sessions/{파일명})을 Claude AI 프로젝트 파일에 업로드
2. Claude AI에게 "이 파일 기준으로 현재 상태 요약해" 요청
3. [ ] 추가 작업 기입

---

## 💡 Claude AI 메모리에 반영할 핵심 1~3개

> ⚠️ 팀장님이 직접 판단 후 기입.

- [ ] 팀장님이 직접 기입

---

*이 문서는 /session-end 슬래시 커맨드로 자동 생성되었습니다.*

### 4단계: 파일 저장

docs/sessions/{YYYY-MM-DD}_{HHmm}.md 경로에 UTF-8로 저장.
디렉토리 없으면 먼저 생성.

### 5단계: Git 커밋 & 푸시

- git add docs/sessions/{생성한_파일명}
- git commit -m "docs: 세션 요약 {YYYY-MM-DD} {시간대}"
- git push origin main

### 6단계: 결과 보고

팀장님께 다음 출력:

- 생성 파일 경로
- 커밋 해시
- GitHub 링크
- 팀장님이 채워야 할 섹션 4곳 안내
