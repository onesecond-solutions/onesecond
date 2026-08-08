# 인슈브리핑 자동 업데이트

`scripts/update-content.mjs`는 네이버 뉴스 검색 API에서 다음 검색어를 조회해 `data/content.json`을 갱신합니다.

- `보험 금융감독원` → 정책·제도
- `보험금 청구` → 보험금·청구
- `실손보험` → 보험뉴스
- `보험 상품 출시` → 상품소식

## 필요한 GitHub Actions Secrets

- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`

실행 명령은 `node insubriefing/scripts/update-content.mjs`입니다. 기사 본문을 복제하거나 AI로 요약하지 않고, 네이버 API가 반환한 제목·원문 링크·발행일만 저장합니다.

정기 실행 워크플로는 저장소 운영 정책상 총괄 검수 후 별도 적용합니다. 권장 시각은 매일 오전 5시 20분(KST)입니다.
