# Supabase 배포 토큰 설정 안내서 (대표 직접 수행 · 2분)

> 이 작업은 AI가 대신 할 수 없습니다(토큰=비밀번호류라 안전규칙상 AI 입력 금지). 아래 2단계만 하시면 끝입니다.

## 1단계 — Supabase에서 토큰 발급

1. 브라우저에서 https://supabase.com/dashboard/account/tokens 접속(로그인 상태여야 함)
2. **Generate new token** 클릭
3. 이름 아무거나 입력(예: `github-functions-deploy`) → **Generate token**
4. 화면에 뜨는 토큰 문자열을 **복사**(이 화면을 벗어나면 다시 못 봄 — 꼭 이 단계에서 복사)

## 2단계 — GitHub에 그 토큰 등록

1. https://github.com/onesecond-solutions/onesecond/settings/environments/production-functions 접속
2. **Environment secrets** 섹션의 **Add secret** 클릭
3. Name: `SUPABASE_ACCESS_TOKEN`
4. Value: 방금 복사한 토큰 붙여넣기
5. **Add secret** 클릭

## 끝

여기까지 하시면 그대로 채팅에 "다 했어" 라고만 말씀해 주세요. 이후 배포·확인은 제가 진행합니다.

---
*작성: 총괄팀장 Code, 2026-08-19. 관련: `.github/workflows/functions-deploy.yml`(PR #1743), 고객등록 캡처 자동입력 기능(PR #1744).*
