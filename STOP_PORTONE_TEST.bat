@echo off
setlocal
title Stop PortOne Test Server

echo ============================================
echo   Stop PortOne Test Server
echo ============================================
echo.
echo Stopping PortOne test server ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop_test.ps1"
echo.
echo   (Only the PortOne test server was targeted. Other apps were not touched.)
echo.
pause
exit /b 0
