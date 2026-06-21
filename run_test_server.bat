@echo off
:: =====================================================================
:: run_test_server.bat
:: SMS 인증 검수 LAN 서버 실행 스크립트
::
:: 사용 방법:
::   1. 이 파일을 더블클릭하기 전에 TEST_ANON_KEY 환경변수를 설정하세요.
::      (Windows 환경변수 목록 또는 .env 미리 설정)
::   2. 이 BAT 파일을 더블클릭하세요.
::   3. 서버 실행 후 연린 화면이 나타납니다.
::   4. 휴대폰에서 동일한 와이파이로 접속하세요.
::
:: 보안 주의:
::   TEST_ANON_KEY 에 실제 키 값을 이 파일에 저장하지 마세요.
::   환경변수로만 설정하고 이 파일에는 플레이스홀더만 남기세요.
:: =====================================================================

:: 실행 시작 전 TEST_ANON_KEY 확인
if "%TEST_ANON_KEY%"=="" (
    echo.
    echo [ERROR] TEST_ANON_KEY 환경변수가 설정되지 않았습니다.
    echo.
    echo 설정 방법:
    echo   1. Windows 환경변수 설정 — 시스템 환경변수에서 TEST_ANON_KEY 입력
    echo   2. 또는 다음 명령어 후 실행:
    echo      set TEST_ANON_KEY=^<anon_key^> ^&^& run_test_server.bat
    echo.
    pause
    exit /b 1
)

:: Node.js 설치 확인
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js가 설치되지 않았습니다.
    echo https://nodejs.org 에서 다운로드 후 재실행하세요.
    pause
    exit /b 1
)

:: Windows 화면 헤더
echo.
echo =====================================================
echo  SMS 인증 검수 LAN 서버
echo  주소: http://192.168.0.8:8000
echo  검수 URL: http://192.168.0.8:8000/test/sms_auth_integration.html
echo =====================================================
echo.

:: 포트 8000 방화벽 허용 (사설 네트워크)
echo [1/3] 방화벽 설정 중...
netsh advfirewall firewall delete rule name="TestServerPort8000" >nul 2>&1
netsh advfirewall firewall add rule name="TestServerPort8000" dir=in action=allow protocol=TCP localport=8000 profile=private >nul 2>&1
echo [OK] 포트 8000 사설 네트워크 허용 완료

:: 서버 시작
echo [2/3] 서버 시작 중...

:: 검수 URL 브라우저 자동 오픈 (2초 대기 후)
echo [3/3] 브라우저 자동 오픈 중...
ping -n 3 127.0.0.1 >nul 2>&1
start "" "http://192.168.0.8:8000/test/sms_auth_integration.html"

:: 서버 실행 (블로킹)
node serve_lan.js

:: 서버 종료 후 방화벽 규칙 제거
echo.
echo [정리] 방화벽 규칙 제거 중...
netsh advfirewall firewall delete rule name="TestServerPort8000" >nul 2>&1
echo [정리] 완료
pause
