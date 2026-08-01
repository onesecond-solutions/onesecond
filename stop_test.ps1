# PortOne 테스트 서버만 종료 (다른 프로세스 무영향). 마커로 식별.
$me = $PID
# 1) PowerShell 정적 서버 (serve_test.ps1)
Get-CimInstance Win32_Process -Filter "name='powershell.exe'" |
  Where-Object { $_.CommandLine -like '*serve_test.ps1*' -and $_.ProcessId -ne $me } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
# 2) python http.server (있을 경우)
Get-CimInstance Win32_Process -Filter "name='python.exe'" |
  Where-Object { $_.CommandLine -like '*http.server*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
# 3) 서버 창 (title "PortOne Test Server")
Get-Process cmd -ErrorAction SilentlyContinue |
  Where-Object { $_.MainWindowTitle -like '*PortOne Test Server*' } |
  Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "  Test server stopped (if it was running)."
