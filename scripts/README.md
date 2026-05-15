# 보험사 소식지 시드 스크립트

## 시범 5건 실행 안내

### 1. `.env.local` 파일 생성 (1회만)

루트(`C:\limtaesung\github\onesecond\.env.local`)에 다음 2줄 입력:

```
SUPABASE_URL=https://pdnwgzneooyygfejrvbg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=여기에_실제_키_붙여넣기
```

**service_role key 가져오는 곳:**
1. https://supabase.com/dashboard/project/pdnwgzneooyygfejrvbg/settings/api 진입
2. "Project API keys" 섹션에서 **`service_role` `secret`** 값 복사 (⚠️ `anon` 키 아님)
3. 위 `.env.local` 파일에 붙여넣기

⚠️ service_role key는 **모든 RLS 우회** — 절대 git 커밋·외부 공유 금지

### 2. 스크립트 실행

PowerShell에서:

```powershell
cd C:\limtaesung\github\onesecond
.\scripts\seed_newsletters_test5.ps1
```

### 3. 결과 확인

- 콘솔 출력에 "성공: 5 / 5" 보이면 OK
- https://onesecond.solutions 접속 → 📋 스마트 게시판 탭에서 5건 확인

### 시드 5건 명세

폴더: `sosiggi/2026년 5월 생명보험 소식지 모음/`

| # | 보험사 | 파일 | 용량 |
|---|---|---|---|
| 1 | 신한라이프 | 신한라이프 GA소식지 26.05.pdf | 4.1MB |
| 2 | 흥국생명 | 흥국생명 GA소식지 26.05.pdf | 2.4MB |
| 3 | 하나생명 | 하나생명 GA소식지 26.05.pdf | 2.9MB |
| 4 | 농협생명 | 농협생명 GA소식지 26.05.pdf | 4.0MB |
| 5 | ABL생명 | ABL생명 영업 Issue 소식지 26.05.pdf | 1.6MB |

각 시드 INSERT 명세:
- board_type = `qna` (스마트게시판)
- category = `소식지`
- title / content = `2026년 5월 {보험사명} 소식지`
- display_name = `원세컨드 시스템`
- audience_target = `navigation_all`
- source_type = `seed`
- attachments = Storage 업로드된 PDF 공개 URL
