@echo off
:: =====================================================================
:: run_test_server.bat
:: SMS 인증 검수 LAN 서버 실행 스크립트
::
:: 사용 방법:
::   1. 이 BAT 파일을 더블클릭하세요.
::   2. onesecond-TEST anon/public key를 붙여넣고 Enter
::      (service_role 키가 아닌 anon/public 키를 입력하세요)
::   3. 서버가 자동 실행되고 검수 URL이 브라우저에서 열립니다.
::   4. 휴대폰에서 동일한 와이파이로 접속하세요.
::
:: 보안 주의:
::   입력한 키는 이 BAT 프로세스가 종료되면 자동으로 사라집니다.
::   파일·레지스트리·Git에 저장되지 않습니다.
:: =====================================================================

:: Node.js 설치 확인
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Node.js가 설치되지 않았습니다.
    echo         https://nodejs.org 에서 다운로드 후 재실행하세요.
    echo.
    pause
    exit /b 1
)

:: 화면 헤더
cls
echo.
echo =====================================================
echo   SMS 인증 검수 LAN 서버
echo   검수 URL: http://192.168.0.8:8000/test/sms_auth_integration.html
echo =====================================================
echo.
echo [주의] onesecond-TEST 프로젝트의 anon/public key를 입력하세요.
echo        service_role 키를 입력하면 테스트가 즉시 중단됩니다.
echo        (Supabase Dashboard > onesecond-test > API Keys > anon public)
echo.

:: anon key 입력 (입력값 화면 재출력 없음)
set /p TEST_ANON_KEY=anon/public key 붙여넣기 후 Enter: 

:: 입력값 검증: 비어있으면 종료
if "%TEST_ANON_KEY%"=="" (
    echo.
    echo [ERROR] 키가 입력되지 않았습니다. BAT을 다시 실행하세요.
    echo.
    pause
    exit /b 1
)

:: 입력 후 화면 재출력 방지 (입력값이 화면에 남지 않도록 cls)
cls
echo.
echo =====================================================
echo   SMS 인증 검수 LAN 서버
echo   검수 URL: http://192.168.0.8:8000/test/sms_auth_integration.html
echo =====================================================
echo.
echo [OK] 키 입력 완료 (키 원문은 화면에 표시되지 않습니다)
echo.

:: 포트 8000 방화벽 허용 (사설 네트워크)
echo [1/3] 방화벽 설정 중...
netsh advfirewall firewall delete rule name="TestServerPort8000" >nul 2>&1
netsh advfirewall firewall add rule name="TestServerPort8000" dir=in action=allow protocol=TCP localport=8000 profile=private >nul 2>&1
echo [OK] 포트 8000 사설 네트워크 허용 완료
echo.

:: 서버 시작 & 브라우저 자동 오픈
echo [2/3] 서버 시작 중...
echo [3/3] 브라우저 자동 오픈 중... (2초 대기)
ping -n 3 127.0.0.1 >nul
start http://192.168.0.8:8000/test/sms_auth_integration.html

:: 서버 실행 (블로킹 - Ctrl+C 또는 창 닫으면 종료)
node serve_lan.js

:: 서버 종료 후 정리
echo.
echo [정리] 방화벽 규칙 제거 중...
netsh advfirewall firewall delete rule name="TestServerPort8000" >nul 2>&1
echo [정리] 완료 - 키와 임시 환경변수 자동 소멸
echo.

:: TEST_ANON_KEY 명시적 삭제
set TEST_ANON_KEY=

pause
