@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title PortOne 테스트 서버 종료

echo ============================================
echo   PortOne 테스트 서버 종료 (포트 8000)
echo ============================================
echo.

set "FOUND=0"
REM --- 포트 8000 에서 LISTENING 중인 프로세스만 종료(다른 Python/서버는 건드리지 않음) ---
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 " ^| findstr "LISTENING"') do (
  set "FOUND=1"
  echo   포트 8000 서버(PID %%a) 종료 중...
  taskkill /F /PID %%a >nul 2>&1
)

if "!FOUND!"=="0" (
  echo   포트 8000 에서 실행 중인 테스트 서버가 없습니다.
) else (
  echo   완료: 포트 8000 테스트 서버를 종료했습니다.
)
echo.
echo   ( 다른 Python 프로세스나 다른 서버는 종료하지 않았습니다. )
echo.
pause
endlocal
