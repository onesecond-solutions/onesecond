param([string]$Root, [int]$Port = 8000)
# Windows 기본 PowerShell 정적 파일 서버 (Python 불필요). PortOne 테스트 페이지 서빙용.
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try { $listener.Start() } catch { Write-Host "[ERROR] Cannot start server on port $Port. $_"; exit 1 }
Write-Host "Serving $Root at http://localhost:$Port/  (close this window to stop)"
while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $rel = [Uri]::UnescapeDataString($ctx.Request.Url.LocalPath).TrimStart('/')
    if ([string]::IsNullOrEmpty($rel)) { $rel = "index.html" }
    $path = Join-Path $Root $rel
    if (Test-Path $path -PathType Leaf) {
      $bytes = [IO.File]::ReadAllBytes($path)
      switch ([IO.Path]::GetExtension($path).ToLower()) {
        ".html" { $ctx.Response.ContentType = "text/html; charset=utf-8" }
        ".js"   { $ctx.Response.ContentType = "text/javascript; charset=utf-8" }
        ".css"  { $ctx.Response.ContentType = "text/css; charset=utf-8" }
        ".json" { $ctx.Response.ContentType = "application/json; charset=utf-8" }
        default { $ctx.Response.ContentType = "application/octet-stream" }
      }
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
    $ctx.Response.Close()
  } catch { }
}
