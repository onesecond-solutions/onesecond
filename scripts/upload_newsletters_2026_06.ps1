# ============================================================
# Newsletter 2026-06 uploader - uuid(ASCII) key to bypass Korean filename (400 InvalidKey)
# 2026-06-12. Memory feedback_supabase_storage_ascii_key (key=uuid, korean original=source_filename).
# ASCII-only source (PS 5.1 reads Korean literals as mojibake). Korean values come from filesystem at runtime.
#
# Usage:
#   .\upload_newsletters_2026_06.ps1            # DRY-RUN (no upload, plan only) <- default
#   .\upload_newsletters_2026_06.ps1 -Execute   # real Storage upload + newsletters INSERT
#
# Target: C:\limtaesung\newsletter_2026_06\2026-06\{company}\{file}  (PDF/PPTX, JPG excluded)
# Bucket: newsletters (private). dedup: skip if source_filename already exists.
# ============================================================
param([switch]$Execute)
$ErrorActionPreference = "Stop"

# .env.local
$envPath = Join-Path $PSScriptRoot "..\.env.local"
if (-not (Test-Path $envPath)) { Write-Host "ERROR: .env.local not found" -ForegroundColor Red; exit 1 }
$envMap = @{}
Get-Content $envPath | ForEach-Object {
  if ($_ -match '^\s*([^#=]+?)\s*=\s*(.+?)\s*$') { $envMap[$Matches[1].Trim()] = $Matches[2].Trim() }
}
$SUPABASE_URL = $envMap['SUPABASE_URL']
$SERVICE_KEY  = $envMap['SUPABASE_SERVICE_ROLE_KEY']
if ([string]::IsNullOrWhiteSpace($SUPABASE_URL) -or [string]::IsNullOrWhiteSpace($SERVICE_KEY)) {
  Write-Host "ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY empty" -ForegroundColor Red; exit 1
}
# Guard: new project only
if ($SUPABASE_URL -notmatch 'pdnwgzneooyygfejrvbg') {
  Write-Host "ERROR: not new project (pdnwgzneooyygfejrvbg) -> abort. URL=$SUPABASE_URL" -ForegroundColor Red; exit 1
}

$BUCKET = "newsletters"
$SRC = "C:\limtaesung\newsletter_2026_06\2026-06"
if (-not (Test-Path $SRC)) { Write-Host "ERROR: source folder missing: $SRC" -ForegroundColor Red; exit 1 }

$readHeaders = @{ apikey = $SERVICE_KEY; Authorization = "Bearer $SERVICE_KEY" }

# Korean keywords built from char codes (ASCII-safe source)
$KW_LIFE = @( "$([char]0xC0DD)$([char]0xBA85)", "$([char]0xB77C)$([char]0xC774)$([char]0xD504)" )
$KW_FIRE = @( "$([char]0xC190)$([char]0xBCF4)", "$([char]0xD654)$([char]0xC7AC)", "$([char]0xD574)$([char]0xC0C1)", "$([char]0xC190)$([char]0xD574)" )
function Get-InsType([string]$name) {
  foreach ($k in $KW_LIFE) { if ($name.Contains($k)) { return 'life' } }
  foreach ($k in $KW_FIRE) { if ($name.Contains($k)) { return 'fire' } }
  if ($name -match 'AIA|IBK') { return 'life' }   # ASCII override: AIA, IBK(annuity) = life
  return 'etc'
}
function Get-Mime([string]$ext) {
  switch ($ext.ToLower()) {
    '.pdf'  { 'application/pdf' }
    '.pptx' { 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }
    default { 'application/octet-stream' }
  }
}

$mode = if ($Execute) { 'EXECUTE' } else { 'DRY-RUN' }
Write-Host "=== Newsletter 2026-06 upload [$mode] ===" -ForegroundColor Cyan
Write-Host "Project: $SUPABASE_URL (new verified)"
Write-Host "Bucket: $BUCKET (private) / Source: $SRC"
Write-Host ""

$files = Get-ChildItem $SRC -Recurse -File | Where-Object { $_.Extension -in '.pdf', '.pptx' } | Sort-Object FullName
Write-Host "Target files: $($files.Count) (PDF/PPTX, JPG excluded)" -ForegroundColor Yellow
Write-Host ""

$planCount = 0; $skip = 0; $done = 0; $fail = 0
foreach ($f in $files) {
  $company  = $f.Directory.Name
  $origName = $f.Name
  $instype  = Get-InsType $company
  $ext      = $f.Extension.ToLower()
  $uuid     = [guid]::NewGuid().ToString()
  $path     = "2026-06/$uuid$ext"

  # dedup
  $enc = [uri]::EscapeDataString($origName)
  $exist = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/newsletters?source_filename=eq.$enc&select=id&limit=1" -Headers $readHeaders
  if ($exist.Count -gt 0) { Write-Host ("  SKIP(dup)  [{0,-4}] {1}  {2}" -f $instype, $company, $origName) -ForegroundColor DarkGray; $skip++; continue }

  Write-Host ("  PLAN       [{0,-4}] {1}  {2}  ->  {3}" -f $instype, $company, $origName, $path)
  $planCount++

  if ($Execute) {
    try {
      $mime = Get-Mime $ext
      # 1) Storage upload (uuid key = ASCII)
      Invoke-RestMethod -Uri "$SUPABASE_URL/storage/v1/object/$BUCKET/$path" -Method Post `
        -Headers @{ apikey = $SERVICE_KEY; Authorization = "Bearer $SERVICE_KEY"; "Content-Type" = $mime } `
        -InFile $f.FullName | Out-Null
      # 2) newsletters INSERT (korean original preserved in source_filename)
      $obj = @{
        company = $company; insurance_type = $instype
        source_filename = $origName; source_path = $path
        publish_year = 2026; publish_month = 6
        ocr_status = 'pending'; ocr_needed = $true
      }
      $json  = $obj | ConvertTo-Json -Compress
      $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
      Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/newsletters" -Method Post `
        -Headers @{ apikey = $SERVICE_KEY; Authorization = "Bearer $SERVICE_KEY"; "Content-Type" = "application/json; charset=utf-8"; Prefer = "return=minimal" } `
        -Body $bytes | Out-Null
      $done++
    } catch {
      Write-Host "      FAIL: $($_.Exception.Message)" -ForegroundColor Red; $fail++
    }
  }
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Plan(new): $planCount / dup-skip: $skip"
if ($Execute) {
  $col = if ($fail -gt 0) { 'Yellow' } else { 'Green' }
  Write-Host "Uploaded+Inserted: $done / Failed: $fail" -ForegroundColor $col
} else {
  Write-Host "DRY-RUN - nothing written. Re-run with -Execute after review." -ForegroundColor Yellow
}
