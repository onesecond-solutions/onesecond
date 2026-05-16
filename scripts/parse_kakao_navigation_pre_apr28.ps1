# ============================================================================
# 4/28 이전 카톡 자동 파싱 → SQL INSERT 자동 생성
# 작성: 2026-05-16 D-2 (자리 비움 동안 Code 본인 박음)
# 본진: 2025-07-10 ~ 2026-04-27 박힌 자리 통째 navigation 시드 INSERT
# ============================================================================
#
# 사용법:
#   PowerShell 실행:
#     powershell -ExecutionPolicy Bypass -File scripts/parse_kakao_navigation_pre_apr28.ps1
#
# 출력:
#   docs/migrations/2026-05-16_kakao_navigation_pre_apr28_seed.sql
#
# 익명화 정책 (B+C 하이브리드, 직전 130건 + 5/6 23건 박은 자리 정합):
#   - 발신자 박힌 자리 회사명 추출 → display_name = 회사명, kind = 'answer'
#   - 회사명 박지 X → display_name = '팀장님', kind = 'question'
#
# ============================================================================

$ErrorActionPreference = "Stop"

$ScriptRoot = $PSScriptRoot
$RepoRoot   = Split-Path -Parent $ScriptRoot
$InputFile  = Join-Path $RepoRoot "docs\work_orders\KakaoTalk_20260516_1837_11_378_group.txt"
$OutputSql  = Join-Path $RepoRoot "docs\migrations\2026-05-16_kakao_navigation_pre_apr28_seed.sql"

if (-not (Test-Path $InputFile)) {
    Write-Host "ERROR: 입력 파일 박지 X — $InputFile" -ForegroundColor Red
    exit 1
}

# ──────────────────────────────────────────────────────────────────────────
# 회사명 매핑 (긴 자리 우선 매칭 — 충돌 회피)
# ──────────────────────────────────────────────────────────────────────────
$Companies = @(
    "한화손보", "한화생명",
    "흥국화재", "흥국생명",
    "라이나손보", "라이나손해", "라이나생명",
    "신한라이프",
    "삼성화재", "삼성생명",
    "현대해상",
    "미래에셋",
    "메리츠",
    "DB손보", "디비손보",
    "KB라이프", "KB손보", "KB생명",
    "농협손보", "농협생명",
    "KDB생명",
    "롯데손보",
    "ABL",
    "교보생명",
    "동양생명",
    "MG손해", "MG손보"
)

# ──────────────────────────────────────────────────────────────────────────
# 시스템 메시지 / 첨부 제외 패턴
# ──────────────────────────────────────────────────────────────────────────
$SystemPatterns = @(
    "^메시지가 삭제되었습니다",
    "님이 .+님을 초대했습니다",
    "님이 나갔습니다",
    "^사진$",
    "^사진 \d+장$",
    "^파일:",
    "^동영상$",
    "^이모티콘$",
    "^\.$",  # 단일 점
    "^☎"
)

# 짧은 인사 (길이 15자 미만 + 인사 키워드)
$GreetingKeywords = @(
    "^감사",
    "^넵",
    "^네네",
    "^네 감사",
    "^아 네",
    "^넹",
    "^넹$",
    "^감사해요",
    "^감사드립",
    "^^^",
    "^확인",
    "^넵 감사",
    "^예",
    "^예 감사"
)

# ──────────────────────────────────────────────────────────────────────────
# 파싱 시작
# ──────────────────────────────────────────────────────────────────────────
Write-Host "=== 카톡 원문 파싱 시작 ===" -ForegroundColor Cyan
Write-Host "입력: $InputFile"

# 4/28 이전 기준일
$Apr28 = Get-Date -Year 2026 -Month 4 -Day 28 -Hour 0 -Minute 0 -Second 0

$Messages = New-Object System.Collections.ArrayList
$CurrentDate = $null
$CurrentMsg = $null
$SkipRest = $false
$LineNumber = 0

$Lines = Get-Content $InputFile -Encoding UTF8
$TotalLines = $Lines.Count
Write-Host "총 라인 수: $TotalLines"

foreach ($Line in $Lines) {
    $LineNumber++

    # 날짜 박힘
    if ($Line -match "^-+\s*(\d{4})년\s*(\d+)월\s*(\d+)일") {
        # 이전 메시지 박혀 있으면 add
        if ($null -ne $CurrentMsg -and -not $SkipRest) {
            [void]$Messages.Add($CurrentMsg)
        }
        $CurrentMsg = $null

        $Year = [int]$matches[1]
        $Month = [int]$matches[2]
        $Day = [int]$matches[3]
        $CurrentDate = Get-Date -Year $Year -Month $Month -Day $Day -Hour 0 -Minute 0 -Second 0

        # 4/28 이후 박힘 → 박지 X
        if ($CurrentDate -ge $Apr28) {
            Write-Host "[STOP] $($CurrentDate.ToString('yyyy-MM-dd')) 박힘 — 4/28 이후 박지 X 박음" -ForegroundColor Yellow
            $SkipRest = $true
        }
        continue
    }

    if ($SkipRest) { continue }
    if ($null -eq $CurrentDate) { continue }

    # 메시지 시작 박힘: [발신자] [오전/오후 H:MM] 본문
    if ($Line -match "^\[([^\]]+)\]\s+\[(오전|오후)\s+(\d+):(\d+)\]\s*(.*)$") {
        if ($null -ne $CurrentMsg) {
            [void]$Messages.Add($CurrentMsg)
        }

        $Sender = $matches[1].Trim()
        $AmPm = $matches[2]
        $Hour = [int]$matches[3]
        $Min = [int]$matches[4]
        $Text = $matches[5]

        if ($AmPm -eq "오후" -and $Hour -lt 12) { $Hour += 12 }
        if ($AmPm -eq "오전" -and $Hour -eq 12) { $Hour = 0 }

        $CurrentMsg = @{
            Date = $CurrentDate
            Hour = $Hour
            Min = $Min
            Sender = $Sender
            Lines = @($Text)
        }
        continue
    }

    # 후속 줄 (메시지 본문 multi-line)
    if ($null -ne $CurrentMsg) {
        $Trimmed = $Line.Trim()
        if ($Trimmed -ne "") {
            $CurrentMsg.Lines += $Line
        }
    }
}
if ($null -ne $CurrentMsg -and -not $SkipRest) {
    [void]$Messages.Add($CurrentMsg)
}

Write-Host "파싱 메시지 수: $($Messages.Count)" -ForegroundColor Green

# ──────────────────────────────────────────────────────────────────────────
# 필터링 + 익명화 + 분류
# ──────────────────────────────────────────────────────────────────────────
Write-Host "`n=== 필터링 + 익명화 시작 ===" -ForegroundColor Cyan

$Filtered = New-Object System.Collections.ArrayList
$Stats = @{
    Total = $Messages.Count
    System = 0
    Greeting = 0
    Empty = 0
    Question = 0
    Answer = 0
    ByCompany = @{}
}

foreach ($Msg in $Messages) {
    $Body = ($Msg.Lines -join "`n").Trim()

    # 빈 박힘
    if ($Body -eq "") {
        $Stats.Empty++
        continue
    }

    # 시스템 메시지 제외
    $IsSystem = $false
    foreach ($Pat in $SystemPatterns) {
        if ($Body -match $Pat) { $IsSystem = $true; break }
    }
    if ($IsSystem) {
        $Stats.System++
        continue
    }

    # 짧은 인사 제외
    if ($Body.Length -lt 15) {
        $IsGreeting = $false
        foreach ($Pat in $GreetingKeywords) {
            if ($Body -match $Pat) { $IsGreeting = $true; break }
        }
        if ($IsGreeting) {
            $Stats.Greeting++
            continue
        }
    }

    # 회사명 추출
    $Company = $null
    $Sender = $Msg.Sender
    $FirstLine = $Msg.Lines[0]
    $SearchText = "$Sender $FirstLine"

    foreach ($C in $Companies) {
        if ($SearchText -like "*$C*") {
            $Company = $C
            break
        }
    }

    # display_name + kind 박음
    if ($null -ne $Company) {
        $DisplayName = $Company
        $Kind = "answer"
        $Stats.Answer++
        if (-not $Stats.ByCompany.ContainsKey($Company)) {
            $Stats.ByCompany[$Company] = 0
        }
        $Stats.ByCompany[$Company]++
    } else {
        $DisplayName = "팀장님"
        $Kind = "question"
        $Stats.Question++
    }

    # title 박음 (첫 줄 또는 60자)
    $Title = $Body -replace "`n", " "
    if ($Title.Length -gt 60) {
        $Title = $Title.Substring(0, 60) + "..."
    }

    # PostgreSQL escape (single quote)
    $BodyEsc = $Body -replace "'", "''"
    $TitleEsc = $Title -replace "'", "''"
    $DisplayNameEsc = $DisplayName -replace "'", "''"

    # 타임스탬프
    $Ts = "{0}-{1:D2}-{2:D2} {3:D2}:{4:D2}:00+09" -f $Msg.Date.Year, $Msg.Date.Month, $Msg.Date.Day, $Msg.Hour, $Msg.Min
    $IsoDate = "{0}-{1:D2}-{2:D2}" -f $Msg.Date.Year, $Msg.Date.Month, $Msg.Date.Day

    [void]$Filtered.Add(@{
        DisplayName = $DisplayNameEsc
        Title = $TitleEsc
        Body = $BodyEsc
        Kind = $Kind
        Timestamp = $Ts
        IsoDate = $IsoDate
    })
}

Write-Host "필터링 결과 (INSERT 박을 자리):" -ForegroundColor Green
Write-Host "  총 메시지: $($Stats.Total)"
Write-Host "  시스템 제외: $($Stats.System)"
Write-Host "  짧은 인사 제외: $($Stats.Greeting)"
Write-Host "  빈 박힘 제외: $($Stats.Empty)"
Write-Host "  INSERT 박을 자리: $($Filtered.Count)"
Write-Host "    - 질문 (팀장님): $($Stats.Question)"
Write-Host "    - 답변 (회사): $($Stats.Answer)"
Write-Host "  회사별 답변 분포:"
$Stats.ByCompany.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
    Write-Host "    $($_.Key): $($_.Value)"
}

# ──────────────────────────────────────────────────────────────────────────
# SQL 생성
# ──────────────────────────────────────────────────────────────────────────
Write-Host "`n=== SQL 박는 자리 시작 ===" -ForegroundColor Cyan

$Header = @"
-- ============================================================================
-- 🤖 4/28 이전 카톡 자동 파싱 시드 (2025-07-10 ~ 2026-04-27)
-- 자동 생성: 2026-05-16 D-2 (PowerShell parse_kakao_navigation_pre_apr28.ps1)
-- 출처: docs/work_orders/KakaoTalk_20260516_1837_11_378_group.txt
-- 박을 자리: $($Filtered.Count) 행
-- ============================================================================
--
-- 🚨 실행 전 신버전 확인:
--   - Dashboard 좌상단 = `onesecond-v1-restore-0420`
--   - URL ID = `pdnwgzneooyygfejrvbg`
--
-- 📌 본 SQL 본진:
--   - 직전 commit `e806a71` (130건 4/28~5/15) + `a778d2e` (5/6 23건) 박은 자리 보존
--   - 4/28 이전 박은 자리 = 시간 역순 박혀 있음 (시간순 정합)
--   - 익명화: 질문자=팀장님 / 답변자=보험사명
--   - 짧은 인사 / 시스템 메시지 / 첨부 박지 X 박은 자리
--
-- ============================================================================

BEGIN;

DO `$`$
DECLARE
  v_author_id  uuid;
  v_team_id    uuid;
  v_inserted   int := 0;
BEGIN
  SELECT id INTO v_author_id FROM public.users WHERE email = 'jaisung78@gmail.com' LIMIT 1;
  IF v_author_id IS NULL THEN RAISE EXCEPTION '한재성 실장 UUID lookup 실패'; END IF;

  SELECT id INTO v_team_id FROM public.teams
  WHERE name LIKE '%4팀%' OR id::text LIKE '5fccd362%'
  ORDER BY created_at LIMIT 1;
  IF v_team_id IS NULL THEN RAISE EXCEPTION '4팀 UUID lookup 실패'; END IF;

  INSERT INTO public.posts (
    author_id, author_name, display_name, display_author,
    team_id, board_type, audience_target, is_notice,
    title, content, category,
    source_type, source_label, created_at
  ) VALUES
"@

$ValueLines = @()
foreach ($F in $Filtered) {
    $Json = "{`"source`":`"kakao_navigation`",`"date`":`"$($F.IsoDate)`",`"kind`":`"$($F.Kind)`"}"
    $ValueLines += "  (v_author_id::text, '$($F.DisplayName)', '$($F.DisplayName)', '$($F.DisplayName)', v_team_id, 'navigation', 'team_internal', false, '$($F.Title)', E'$($F.Body)', '인수', 'seed', '$Json'::jsonb, '$($F.Timestamp)')"
}

$Footer = @"
;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RAISE NOTICE 'INSERT 완료 — % row (4/28 이전 카톡 자동 파싱 시드)', v_inserted;
END `$`$;

-- 검증 SELECT
SELECT COUNT(*) AS pre_apr28_count
FROM public.posts
WHERE source_type = 'seed'
  AND source_label::jsonb->>'source' = 'kakao_navigation'
  AND created_at < '2026-04-28';

SELECT
  DATE_TRUNC('month', created_at)::date AS month,
  COUNT(*) AS n
FROM public.posts
WHERE source_type = 'seed'
  AND source_label::jsonb->>'source' = 'kakao_navigation'
  AND created_at < '2026-04-28'
GROUP BY month ORDER BY month;

SELECT
  display_name,
  COUNT(*) AS n
FROM public.posts
WHERE source_type = 'seed'
  AND source_label::jsonb->>'source' = 'kakao_navigation'
  AND created_at < '2026-04-28'
GROUP BY display_name ORDER BY 2 DESC LIMIT 25;

COMMIT;

-- 격차 시: ROLLBACK;

-- ============================================================================
-- 검증 기준:
-- - pre_apr28_count: 약 $($Filtered.Count) 행
-- - 월별 분포: 2025-07 ~ 2026-04 (10개월)
-- - 발신자 분포: 팀장님 + 약 $($Stats.ByCompany.Count)개 보험사
-- ============================================================================
"@

$Sql = $Header + ($ValueLines -join ",`n") + $Footer

# UTF-8 BOM 박지 X 박음 (Supabase SQL Editor 정합)
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($OutputSql, $Sql, $Utf8NoBom)

Write-Host "`nSQL 파일 박음 ✅: $OutputSql" -ForegroundColor Green
Write-Host "  파일 크기: $((Get-Item $OutputSql).Length / 1KB) KB"
Write-Host "  총 INSERT 행: $($Filtered.Count)"

Write-Host "`n=== 박는 자리 완료 ===" -ForegroundColor Cyan
