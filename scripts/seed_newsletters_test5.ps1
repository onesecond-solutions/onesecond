# ────────────────────────────────────────────────────────────
# 보험사 소식지 시드 (시범 5건) - 2026-05-15
# 본진: sosiggi/2026년 5월 생명보험 소식지 모음/ 안전 5건만
#       Supabase Storage 업로드 + posts INSERT 자동
# ────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

# .env.local 로드
$envPath = "$PSScriptRoot\..\.env.local"
if (-not (Test-Path $envPath)) {
    Write-Host "ERROR: .env.local 파일이 없습니다. scripts/README.md 참고하여 생성하세요." -ForegroundColor Red
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

if ([string]::IsNullOrWhiteSpace($SUPABASE_URL) -or [string]::IsNullOrWhiteSpace($SERVICE_KEY)) {
    Write-Host "ERROR: SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 비어 있음" -ForegroundColor Red
    exit 1
}

Write-Host "=== 시드 5건 시작 ===" -ForegroundColor Cyan
Write-Host "Supabase: $SUPABASE_URL"

# 1. admin user_id 조회
$headers = @{
    "apikey"        = $SERVICE_KEY
    "Authorization" = "Bearer $SERVICE_KEY"
    "Content-Type"  = "application/json"
}

Write-Host "`n[1/4] admin user_id 조회..." -ForegroundColor Yellow
$adminRes = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/users?email=eq.$ADMIN_EMAIL&select=id" -Headers $headers
if ($adminRes.Count -eq 0) {
    Write-Host "ERROR: admin user 조회 실패 ($ADMIN_EMAIL)" -ForegroundColor Red
    exit 1
}
$ADMIN_UUID = $adminRes[0].id
Write-Host "admin UUID: $ADMIN_UUID" -ForegroundColor Green

# 2. 시드 5건 명세
$folder = "$PSScriptRoot\..\sosiggi\2026년 5월 생명보험 소식지 모음"
$seeds = @(
    @{ file = "신한라이프 GA소식지 26.05.pdf";          insurer = "신한라이프";  slug = "shinhan_life" }
    @{ file = "흥국생명 GA소식지 26.05.pdf";            insurer = "흥국생명";    slug = "heungkuk_life" }
    @{ file = "하나생명 GA소식지 26.05.pdf";            insurer = "하나생명";    slug = "hana_life" }
    @{ file = "농협생명 GA소식지 26.05.pdf";            insurer = "농협생명";    slug = "nh_life" }
    @{ file = "ABL생명 영업 Issue 소식지 26.05.pdf";    insurer = "ABL생명";     slug = "abl_life" }
)

# 3. 각 시드 처리
$success = 0
$failed  = @()

foreach ($seed in $seeds) {
    $filePath = Join-Path $folder $seed.file
    if (-not (Test-Path $filePath)) {
        Write-Host "SKIP: 파일 없음 - $($seed.file)" -ForegroundColor Yellow
        $failed += $seed.file
        continue
    }

    Write-Host "`n[2/4] 처리: $($seed.insurer)..." -ForegroundColor Yellow

    # Storage 업로드 (영문 path - 한글 encode 격차 회피)
    $ts = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    $storagePath = "seed/2026-05/$($ts)_$($seed.slug).pdf"
    $storageUrl  = "$SUPABASE_URL/storage/v1/object/board_attachments/$storagePath"

    try {
        $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
        $upHeaders = @{
            "apikey"        = $SERVICE_KEY
            "Authorization" = "Bearer $SERVICE_KEY"
            "Content-Type"  = "application/pdf"
            "x-upsert"      = "true"
        }
        Invoke-RestMethod -Uri $storageUrl -Method Post -Headers $upHeaders -Body $fileBytes | Out-Null
        $publicUrl = "$SUPABASE_URL/storage/v1/object/public/board_attachments/$storagePath"
        Write-Host "  Storage 업로드 OK" -ForegroundColor Green

        # posts INSERT
        $title = "2026년 5월 $($seed.insurer) 소식지"
        $body = @{
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
            source_label    = (@{ source = "ga_newsletter"; year_month = "2026-05"; insurer_type = "life" } | ConvertTo-Json -Compress)
            attachments     = '["' + $publicUrl + '"]'
        } | ConvertTo-Json -Compress

        $insHeaders = $headers.Clone()
        $insHeaders["Prefer"] = "return=representation"
        # 한글 깨짐 격차 회피 — body를 UTF-8 byte로 변환 후 전송
        $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
        $postRes = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/posts" -Method Post -Headers $insHeaders -Body $bodyBytes
        Write-Host "  posts INSERT OK (id=$($postRes[0].id))" -ForegroundColor Green
        $success++
    }
    catch {
        Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $failed += $seed.file
    }
}

# 4. 결과 summary
Write-Host "`n=== 결과 ===" -ForegroundColor Cyan
Write-Host "성공: $success / 5"
if ($failed.Count -gt 0) {
    Write-Host "실패: $($failed -join ', ')" -ForegroundColor Red
}
Write-Host "`n검증: https://onesecond.solutions 진입 → 스마트게시판 탭 확인"
