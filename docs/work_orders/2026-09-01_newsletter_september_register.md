# 9월 소식지 적재 작업 기록 (2026-09-01)

## 원천과 범위
- 대표 제공 PDF 23건: 생명 16건, 손해 7건
- 총 528페이지, 222,287,634바이트
- 파일별 SHA-256 유일성 및 원본 일치 검증 완료
- 대상 프로젝트: `pdnwgzneooyygfejrvbg`

## 기존 방식 확인
기존 8월 파이프라인과 동일하게 Storage `newsletters/2026-09/<sha256>.pdf` 업로드 →
`newsletters` reviewing 등록 → 중복·경로·열람 검수 → published 승격 → `thumbs/<id>.jpg` 생성 순서로 진행한다.

## 완료 상태
- 운영 해시 중복 조회: 23건 전부 MISSING
- Storage 업로드: 23/23 성공
- DB reviewing 등록: 23/23 성공
- published 승격: 23/23 성공, postverify 실패 0
- 표지 썸네일: 23/23 생성, 실패 0
- 8월 기준 9월 미확인 회사명 자동 표시 UI 배포

## 실행 파일
- `scripts/data/newsletters_2026_09.json`: 회사명·보험유형·자료유형·해시·페이지 원장
- `scripts/newsletters_2026_09.py`: preflight/verify/upload/register/promote/postverify 멱등 실행기

## 검수 기준
- 정확히 23개 고정 해시만 접근한다.
- 동일 해시가 있으면 등록을 건너뛴다.
- 등록은 reviewing으로만 시작한다.
- source_path가 `2026-09/<sha256>.pdf`와 일치하고 PDF가 열릴 때만 published로 승격한다.
