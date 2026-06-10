# [작업지시서] 자료함 미리보기 = 문서 뷰어 (작업8 확장)

> 발신: 대표(임태성) 지시 / 구현: 총괄팀장(Code) / 2026-06-10 / PR #526
> 원칙: 자료함 우측 = 단순 정보패널이 아니라 **Viewer**. "보관"이 아니라 **즉시 열람**. 다운로드 없이 onesecond 안에서 바로 확인.

## 절대 금지
- 파일명만 표시 + 빈 화면을 미리보기라 부르기
- 깨진 이미지 아이콘 노출
- "다운로드만 가능"을 기본 동작으로

## 지원 범위 (구현)
| 형식 | 렌더 | 구현 |
|---|---|---|
| JPG/JPEG/PNG/WEBP/GIF/BMP/SVG | 원본 이미지 `<img>` | onerror 폴백(깨진 아이콘 차단), 클릭=딸깍 라이트박스 |
| PDF | PDF.js 문서 뷰어 + 페이지 이동(‹ ›) | 기존 `loadPdfJs` 재사용, canvas 렌더 |
| TXT/MD/LOG/JSON | 본문 텍스트 | fetch→`<pre>` (5만자) |
| CSV | 표 | 클라 파싱→table |
| DOCX | 텍스트/서식 추출 본문 | lazy `mammoth.js`(CDN) |
| XLSX/XLS | 시트 표 | lazy `SheetJS`(CDN), 첫 시트 |
| PPTX | 슬라이드 텍스트 뷰 | lazy `JSZip`(CDN), slideN.xml `<a:t>` 추출 |
| 영상 MP4/WEBM/OGG/MOV | `<video controls>` | 인라인 |
| 음성 MP3/WAV/M4A/AAC | `<audio controls>` | 인라인 |
| 그 외(렌더 불가) | 아이콘 + 파일정보 + 다운로드 | 깨진 아이콘 금지 |

## Storage 접근
- private 버킷 `myspace` → `createSignedUrl`(POST sign, expiresIn 3600) 서명 URL을 src/fetch에 사용. `db.url=SUPABASE_URL+path` 확인(다운로드와 동일 URL).
- §4: 미리보기 = 클라이언트 렌더만. 추가 서버 저장·로깅 0.

## 딸깍 적용
- 뷰어 헤더 "⚡ 딸깍" + 이미지 클릭 → 전역 `openLb`(이미지 라이트박스 **4줄**: 다운로드/MY SPACE/복사/카드만들기) 재사용 = 딸깍 스킬 정합.
- 비이미지 = 새 창 열람(딸깍 4줄은 이미지 한정 스킬 정합).

## 라이브러리 (lazy CDN, on-demand)
- pdf.js 3.11.174(기존) / mammoth 1.6.0 / xlsx 0.18.5 / jszip 3.10.1 — 해당 형식 선택 시에만 로드(초기 로드 영향 0).

## AC (라이브 실계정)
- 이미지·PDF·영상·음성·txt/csv = 실제 렌더(깨진 아이콘 0).
- docx/xlsx/pptx = 본문/표/슬라이드 텍스트 표시(lazy 로드 확인).
- 미지원 = 아이콘+다운로드(빈 화면·깨진 아이콘 0).
- 콘솔 403/404/CORS 0.
