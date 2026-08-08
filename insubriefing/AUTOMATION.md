# 인슈브리핑 자동 업데이트

`scripts/update-content.mjs`는 NAVER Cloud Platform의 NAVER API HUB 뉴스 검색 API에서 다음 검색어를 조회해 `data/content.json`을 갱신합니다.

- `보험 금융감독원` → 정책·제도
- `보험금 청구` → 보험금·청구
- `실손보험` → 보험뉴스
- `보험 상품 출시` → 상품소식

## 필요한 GitHub Actions Secrets

- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`

두 값은 NAVER Cloud Platform 콘솔의 NAVER API HUB Application에서 발급합니다. 2026년 7월 31일부터 검색 API 신규 신청은 기존 NAVER Developers가 아니라 NAVER API HUB에서만 가능합니다.

실행 명령은 `node insubriefing/scripts/update-content.mjs`입니다. 기사 본문을 복제하거나 AI로 요약하지 않고, 네이버 API가 반환한 제목·원문 링크·발행일만 저장합니다.

`.github/workflows/insubriefing-update.yml`이 매일 오전 5시 20분(KST)에 실행됩니다. GitHub Actions의 `Run workflow` 버튼으로 즉시 수동 실행할 수도 있습니다.
