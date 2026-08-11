@echo off
setlocal enabledelayedexpansion
title PortOne Integration Test Launcher

set "REPO=C:\limtaesung\github\onesecond"
set "WT=C:\limtaesung\github\onesecond-portone-test"
set "BRANCH=feat/test-env-setup"
set "URL=http://localhost:8000/test/portone_test.html"

echo ============================================
echo   PortOne Integration Test Launcher
echo ============================================
echo.

where git >nul 2>&1
if errorlevel 1 goto err_git

netstat -ano | findstr ":8000 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 goto err_port

echo [1/5] Fetching latest test code ...
git -C "%REPO%" fetch origin %BRANCH%
if errorlevel 1 goto err_fetch

if exist "%WT%\.git" goto wt_update
echo [2/5] Creating test worktree ...
git -C "%REPO%" worktree add --force "%WT%" origin/%BRANCH%
if errorlevel 1 goto err_worktree
goto wt_done
:wt_update
echo [2/5] Updating test worktree ...
git -C "%WT%" reset --hard origin/%BRANCH%
if errorlevel 1 goto err_worktree
:wt_done

if not exist "%WT%\test\portone_test.html" goto err_html

echo [3/5] Selecting server runtime ...
set "SERVERCMD="
python -c "import sys" >nul 2>&1
if not errorlevel 1 set "SERVERCMD=python -m http.server 8000 --directory %WT%"
if defined SERVERCMD goto have_server
py -3 -c "import sys" >nul 2>&1
if not errorlevel 1 set "SERVERCMD=py -3 -m http.server 8000 --directory %WT%"
if defined SERVERCMD goto have_server
set "SERVERCMD=powershell -NoProfile -ExecutionPolicy Bypass -File %~dp0serve_test.ps1 %WT% 8000"
:have_server
echo       Using server: !SERVERCMD!

echo [4/5] Starting server in a separate window (kept open) ...
start "PortOne Test Server" cmd /k !SERVERCMD!

set "OK="
set "TRIES=0"
:waitloop
set /a TRIES+=1
timeout /t 1 /nobreak >nul
netstat -ano | findstr ":8000 " | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 goto served
if !TRIES! LSS 20 goto waitloop
goto err_server
:served

echo [5/5] Verifying HTTP 200 ...
powershell -NoProfile -Command "try{$r=Invoke-WebRequest 'http://localhost:8000/test/portone_test.html' -UseBasicParsing -TimeoutSec 5; if($r.StatusCode -eq 200){exit 0}else{exit 1}}catch{exit 1}"
if errorlevel 1 goto err_verify

echo       OK (HTTP 200). Opening browser ...
start "" "%URL%"
echo.
echo Done. The "PortOne Test Server" window stays open until you stop it.
echo When finished, double-click STOP_PORTONE_TEST.bat
echo.
pause
exit /b 0

:err_git
echo [ERROR] git not found. Please install Git.
goto hold
:err_port
echo [STOP] Port 8000 is already in use. Run STOP_PORTONE_TEST.bat first.
goto hold
:err_fetch
echo [ERROR] git fetch failed. Check network and repository.
goto hold
:err_worktree
echo [ERROR] Failed to prepare test worktree.
goto hold
:err_html
echo [ERROR] test\portone_test.html not found in worktree.
goto hold
:err_server
echo [ERROR] Server did not start on port 8000 within timeout.
echo         Browser was NOT opened. Check the "PortOne Test Server" window.
goto hold
:err_verify
echo [ERROR] Server is listening but HTTP 200 check failed. Browser NOT opened.
goto hold
:hold
echo.
pause
exit /b 1
