# ────────────────────────────────────────────────────────────
# 보험사 소식지 시드 460건 통째 박음 — 2026-05-15
# 본진: sosiggi/ 34 폴더 통째 → board_type='qna' INSERT + Storage 업로드
#
# 사용법:
#   .\seed_newsletters_all.ps1               # 그대로 박음 (5건 시범 + 455건 신박음)
#   .\seed_newsletters_all.ps1 -Cleanup      # 시드 5건 사전 박지 X + 460건 통째 박음 (재실행 안전)
#   .\seed_newsletters_all.ps1 -DryRun       # 실제 박지 X, 박을 자리만 list
# ────────────────────────────────────────────────────────────

param(
    [switch]$Cleanup,
    [switch]$DryRun
)

$ErrorActionPreference = "Continue"

# .env.local 로드
$envPath = "$PSScriptRoot\..\.env.local"
if (-not (Test-Path $envPath)) {
    Write-Host "ERROR: .env.local 없음" -ForegroundColor Red
    exit 1
}
Get-Content $envPath | ForEach-Object {
    if ($_ -match '^\s*([^#=]+?)\s*=\s*(.+?)\s*$') {
        Set-Item -Path "Env:$($Matches[1])" -Value $Matches[2]
    }
}

$SUPABASE_URL = $env:SUPABASE_URL
$SERVICE_KEY  = $env:SUPABASE_SERVICE_ROLE_KEY
$ADMIN_EMAIL  = "bylts0428@gmail.com"
$SOSIGGI_ROOT = "$PSScriptRoot\..\sosiggi"

if ([string]::IsNullOrWhiteSpace($SUPABASE_URL) -or [string]::IsNullOrWhiteSpace($SERVICE_KEY)) {
    Write-Host "ERROR: SUPABASE_URL 또는 SERVICE_KEY 비어 있음" -ForegroundColor Red
    exit 1
}

$headers = @{
    "apikey"        = $SERVICE_KEY
    "Authorization" = "Bearer $SERVICE_KEY"
    "Content-Type"  = "application/json"
}

Write-Host "=== 보험사 소식지 460건 시드 박음 ===" -ForegroundColor Cyan
Write-Host "Supabase: $SUPABASE_URL"
Write-Host "Cleanup: $Cleanup / DryRun: $DryRun"

# 1. admin lookup
Write-Host "`n[1] admin user_id 조회..." -ForegroundColor Yellow
$adminRes = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/users?email=eq.$ADMIN_EMAIL&select=id" -Headers $headers
if ($adminRes.Count -eq 0) {
    Write-Host "ERROR: admin user 조회 실패" -ForegroundColor Red
    exit 1
}
$ADMIN_UUID = $adminRes[0].id
Write-Host "admin: $ADMIN_UUID" -ForegroundColor Green

# 2. 사전 cleanup (옵션)
if ($Cleanup -and -not $DryRun) {
    Write-Host "`n[2] 사전 cleanup — 시드 5건 통째 박지 X..." -ForegroundColor Yellow
    Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/posts?board_type=eq.qna&source_type=eq.seed" -Method Delete -Headers $headers | Out-Null
    Write-Host "cleanup 박음" -ForegroundColor Green
}

# 3. 폴더 순회
Write-Host "`n[3] 폴더 순회..." -ForegroundColor Yellow
$folders = Get-ChildItem -Path $SOSIGGI_ROOT -Directory | Sort-Object Name

# 폴더명 → 년월 + 보험사 종류
function Parse-FolderName($name) {
    if ($name -match '^(\d{4})년\s*(\d{1,2})월\s*(생명|손해)보험') {
        $year = $matches[1]
        $month = "{0:D2}" -f [int]$matches[2]
        $type = if ($matches[3] -eq "생명") { "life" } else { "non_life" }
        return @{ year_month = "$year-$month"; year_num = [int]$year; month_num = [int]$matches[2]; insurer_type = $type }
    }
    return $null
}

# 파일명 → 보험사명 (첫 token)
function Parse-FileName($name) {
    if ($name -match '^([^\s]+)') {
        return $matches[1]
    }
    return $null
}

# 총 PDF 카운트
$totalFiles = 0
foreach ($folder in $folders) {
    $totalFiles += (Get-ChildItem -Path $folder.FullName -Filter "*.pdf" -ErrorAction SilentlyContinue).Count
}
Write-Host "총 PDF: $totalFiles" -ForegroundColor Yellow

if ($DryRun) {
    Write-Host "`n[DryRun] 실제 박지 X. 폴더별 카운트:" -ForegroundColor Cyan
    foreach ($folder in $folders) {
        $count = (Get-ChildItem -Path $folder.FullName -Filter "*.pdf" -ErrorAction SilentlyContinue).Count
        $info = Parse-FolderName $folder.Name
        $ymStr = if ($info) { $info.year_month + " " + $info.insurer_type } else { "<격차>" }
        Write-Host "  $count - $($folder.Name) [$ymStr]"
    }
    exit 0
}

# 4. 본 박음
Write-Host "`n[4] 시드 박음..." -ForegroundColor Yellow

$success = 0
$failed = @()
$skipped = @()
$current = 0
$startTime = Get-Date

foreach ($folder in $folders) {
    $folderInfo = Parse-FolderName $folder.Name
    if (-not $folderInfo) {
        Write-Host "SKIP 폴더 (패턴 격차): $($folder.Name)" -ForegroundColor Yellow
        continue
    }

    $pdfs = Get-ChildItem -Path $folder.FullName -Filter "*.pdf" -ErrorAction SilentlyContinue
    foreach ($pdf in $pdfs) {
        $current++
        $insurerName = Parse-FileName $pdf.Name
        $title = "$($folderInfo.year_num)년 $($folderInfo.month_num)월 $insurerName 소식지"
        $sizeMb = [Math]::Round($pdf.Length/1024/1024, 1)

        Write-Host "[$current/$totalFiles] $title (${sizeMb}MB)" -NoNewline

        # 50MB 초과 = skip
        if ($pdf.Length -gt 52428800) {
            Write-Host " — SKIP 50MB+" -ForegroundColor Yellow
            $skipped += "$($pdf.Name) (${sizeMb}MB)"
            continue
        }

        try {
            # Storage 업로드 (영문 hash path)
            $ts = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
            $md5 = [System.Security.Cryptography.MD5]::Create()
            $hashBytes = $md5.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($pdf.Name))
            $hash = [System.BitConverter]::ToString($hashBytes).Replace("-","").Substring(0,12).ToLower()
            $storagePath = "seed/$($folderInfo.year_month)/${ts}_${hash}.pdf"

            $fileBytes = [System.IO.File]::ReadAllBytes($pdf.FullName)
            $upHeaders = @{
                "apikey"        = $SERVICE_KEY
                "Authorization" = "Bearer $SERVICE_KEY"
                "Content-Type"  = "application/pdf"
                "x-upsert"      = "true"
            }
            Invoke-RestMethod -Uri "$SUPABASE_URL/storage/v1/object/board_attachments/$storagePath" -Method Post -Headers $upHeaders -Body $fileBytes | Out-Null
            $publicUrl = "$SUPABASE_URL/storage/v1/object/public/board_attachments/$storagePath"

            # posts INSERT
            $bodyObj = @{
                board_type      = "qna"
                category        = "소식지"
                title           = $title
                content         = "[공지유형:소식지]`n$title"
                author_id       = $ADMIN_UUID
                author_name     = "원세컨드 시스템"
                display_name    = "원세컨드 시스템"
                is_hub_visible  = $false
                is_anonymous    = $false
                view_count      = 0
                like_count      = 0
                comment_count   = 0
                audience_target = "navigation_all"
                source_type     = "seed"
                source_label    = (@{ source = "ga_newsletter"; year_month = $folderInfo.year_month; insurer_type = $folderInfo.insurer_type; insurer_name = $insurerName } | ConvertTo-Json -Compress)
                attachments     = '["' + $publicUrl + '"]'
            } | ConvertTo-Json -Compress

            $insHeaders = $headers.Clone()
            $insHeaders["Prefer"] = "return=representation"
            $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($bodyObj)
            $postRes = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/posts" -Method Post -Headers $insHeaders -Body $bodyBytes
            Write-Host " OK (id=$($postRes[0].id))" -ForegroundColor Green
            $success++
        }
        catch {
            Write-Host " ERROR: $($_.Exception.Message)" -ForegroundColor Red
            $failed += "$($pdf.Name): $($_.Exception.Message)"
        }
    }
}

$elapsed = (Get-Date) - $startTime

# 5. 결과 summary
Write-Host "`n=== 결과 ===" -ForegroundColor Cyan
Write-Host "총 박음: $success / $totalFiles" -ForegroundColor Green
Write-Host "실패:    $($failed.Count)" -ForegroundColor $(if($failed.Count -gt 0){'Red'}else{'Gray'})
Write-Host "Skip:    $($skipped.Count) (50MB+)" -ForegroundColor $(if($skipped.Count -gt 0){'Yellow'}else{'Gray'})
Write-Host "박은 시간: $([Math]::Round($elapsed.TotalMinutes,1))분"

if ($failed.Count -gt 0) {
    Write-Host "`n실패 목록 (처음 10건):" -ForegroundColor Red
    $failed | Select-Object -First 10 | ForEach-Object { Write-Host "  - $_" }
}
if ($skipped.Count -gt 0) {
    Write-Host "`nSkip 목록 (50MB+):" -ForegroundColor Yellow
    $skipped | ForEach-Object { Write-Host "  - $_" }
}

Write-Host "`n검증: https://onesecond.solutions → 스마트게시판 진입" -ForegroundColor Cyan
