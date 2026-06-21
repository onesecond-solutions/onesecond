@echo off
chcp 65001 >nul
setlocal
title PortOne 통합 테스트 서버

set "REPO=C:\limtaesung\github\onesecond"
set "WT=C:\limtaesung\github\onesecond-portone-test"
set "BRANCH=feat/test-env-setup"

echo ============================================
echo   PortOne 통합 테스트 서버 시작
echo ============================================
echo.

REM --- git 확인 ---
where git >nul 2>&1
if errorlevel 1 (
  echo [오류] git 을 찾을 수 없습니다. Git 설치를 확인하세요.
  echo.
  pause
  exit /b 1
)

REM --- Python 확인 ---
where python >nul 2>&1
if errorlevel 1 (
  echo [오류] python 을 찾을 수 없습니다. Python 설치를 확인하세요.
  echo.
  pause
  exit /b 1
)

REM --- 포트 8000 사용 중 확인 ---
netstat -ano | findstr ":8000 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo [중지] 포트 8000 이 이미 사용 중입니다.
  echo   먼저 STOP_PORTONE_TEST.bat 을 더블클릭해 종료한 뒤 다시 실행하세요.
  echo.
  pause
  exit /b 1
)

REM --- 최신 코드 가져오기 (메인 저장소 브랜치/작업파일 무영향) ---
echo [1/4] 최신 테스트 코드 가져오는 중...
git -C "%REPO%" fetch origin %BRANCH%
if errorlevel 1 (
  echo [오류] git fetch 실패. 네트워크 또는 저장소 상태를 확인하세요.
  echo.
  pause
  exit /b 1
)

REM --- 별도 worktree 생성 또는 갱신 (현재 작업본과 분리) ---
if exist "%WT%\.git" (
  echo [2/4] 테스트 작업본 갱신 중...
  git -C "%WT%" reset --hard origin/%BRANCH%
) else (
  echo [2/4] 테스트 작업본 생성 중...
  git -C "%REPO%" worktree add --force "%WT%" origin/%BRANCH%
)
if errorlevel 1 (
  echo [오류] 테스트 작업본 준비에 실패했습니다.
  echo.
  pause
  exit /b 1
)

REM --- 테스트 페이지 존재 확인 ---
if not exist "%WT%\test\portone_test.html" (
  echo [오류] test\portone_test.html 을 찾을 수 없습니다.
  echo.
  pause
  exit /b 1
)

REM --- 브라우저 자동 열기 (서버가 곧 뜹니다. 안 보이면 새로고침 F5) ---
echo [3/4] 브라우저를 엽니다...
start "" "http://localhost:8000/test/portone_test.html"

REM --- 로컬 서버 실행 (이 창에서. 창을 닫으면 서버 종료) ---
echo [4/4] 로컬 서버 실행 (포트 8000)
echo.
echo   * 브라우저가 안 떴거나 "연결 거부"가 보이면 1~2초 뒤 F5(새로고침) 하세요.
echo   * 테스트가 끝나면 STOP_PORTONE_TEST.bat 을 더블클릭하세요.
echo   * (이 검은 창을 닫아도 서버가 종료됩니다.)
echo.
cd /d "%WT%"
python -m http.server 8000

echo.
echo 서버가 종료되었습니다.
pause
endlocal
