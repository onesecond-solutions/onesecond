---
description: 새 Claude AI 창에 인계할 현재 상태 보고서를 화면에 출력합니다 (파일 저장·푸시 안 함).
---

# 새 창 인계 보고서 생성

## 목적

팀장님이 Claude AI 새 창을 열 때, 옛날 메모리 기반이 아닌 현재 GitHub 상태 기반으로 답변할 수 있도록 인계 자료 생성.

## 절차

### 1단계: 정보 수집 (모두 읽기 전용)

다음 명령 순차 실행:

- `date +"%Y-%m-%d %H:%M (%Z)"`
- `git log -5 --pretty=format:"- %h %ai %s" --no-merges`
- `git status --short`
- `git branch --show-current`
- `ls -t docs/sessions/*.md 2>/dev/null | head -1`
- 위 명령 결과로 나온 파일 cat (전체 내용)
- `ls docs/*.md 2>/dev/null`
- `cat docs/index_section_map.md` (영역 매핑 진실 원천 문서)
- 다른 `docs/*_section_map.md` 또는 `docs/*_structure.md` 파일이 있으면 모두 cat

### 2단계: 출력 형식

화면에 다음 형식으로 출력 (파일 저장 안 함, git 작업 안 함):

```
=== 원세컨드 현재 상태 인계 ===

생성 시각: {date 결과}
현재 브랜치: {branch 결과}

## 1. 최근 커밋 5개

{git log 결과}

## 2. 현재 작업 디렉토리

{git status 결과 - 깨끗하면 "깨끗함 (미커밋 변경 없음)"}

## 3. 가장 최근 세션 요약

파일명: {파일명}

{파일 내용 전체}

## 4. 진실 원천 문서 — index.html 영역 매핑

{docs/index_section_map.md 내용 전체}

## 5. 기타 진실 원천 문서

{docs/ 내 다른 *_map.md / *_structure.md 파일 내용, 없으면 "없음"}

## 6. 진행 중 작업 (이번 세션 맥락에서 파악한 것)

{Claude Code가 이번 세션에서 인지한 진행 중 작업, 없으면 "없음"}

=== 끝 ===
```

[안내]

위 `=== 원세컨드 현재 상태 인계 ===` 부터 `=== 끝 ===` 까지 그대로 복사해서 새 Claude AI 창 첫 메시지로 붙여넣으세요.

첫 메시지 형식:

```
원세컨드 작업 이어서 할게. 아래는 Claude Code가 정리한 현재 상태 인계 자료야.
이 기준으로만 답해주고, 옛날 메모리나 추측으로 답하지 마.

=== 원세컨드 현재 상태 인계 ===
(붙여넣기)
=== 끝 ===

오늘 작업 목표: (한 줄로 기입)
```

### 3단계: 파일 저장 안 함, git 작업 안 함

- 이 커맨드는 어떤 파일도 저장하지 않음
- `git add` / `commit` / `push` 일체 없음
- 화면 출력만 하고 종료
