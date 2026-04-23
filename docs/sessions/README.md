# 세션 요약 아카이브

이 디렉토리는 Claude Code 세션이 끝날 때마다 자동 생성되는 변경사항 요약 MD 파일을 보관합니다.

## 파일명 규칙

YYYY-MM-DD_HHmm.md (예: 2026-04-23_1830.md)

## 생성 방법

Claude Code 터미널에서: /session-end

## 사용 방법

1. 세션 종료 시 /session-end 입력
2. 자동 생성된 MD에서 "팀장님이 직접 기입" 섹션 4곳 채우기
3. 다음 세션 시작 시 이 파일을 Claude AI 프로젝트에 업로드
4. Claude AI에게 "이 파일 기준으로 현재 상태 요약해" 요청

## 왜 이걸 하는가

Claude AI와 Claude Code는 매 세션 컨텍스트가 리셋됩니다. 진실 원천을 GitHub에 두기 위한 기록입니다.
