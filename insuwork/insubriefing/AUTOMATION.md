# 뉴스 브리핑 자동 수집

- 실행: `node insuwork/insubriefing/scripts/update-content.mjs`
- 읽기 전용 실제 수집 검사: 위 명령에 `--dry-run` 추가. 로컬에 NAVER 키가 없으면 다음뉴스 대체 수집만 검증한다.
- NAVER API HUB 7분야 10개 검색 + 다음뉴스 생활/경제/사회/IT과학 목록 보완. 429는 첫 응답에서 추가 NAVER 호출 중단. 네트워크/5xx만 최대 3회 시도.
- GitHub Secrets: 기존 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`. 변경·출력하지 않는다.
- 기사 전문/AI 요약 없음. 기존 필터·72시간·중복 제거 적용. 당일 수동 검수 기사 보존.
- `collection-status.json`: ok=모두 정상, degraded=일부 수집원 장애이나 대체 수집 게시, failed=기존 기사 유지. 수동 기사만으로 자동 수집 성공을 판단하지 않는다.
- KST 05:17/06:17/07:17 예약(실행 지연 가능). 당일 수집 게시 후 중복 호출 생략. `force_recollect`로 재수집 가능. 실패/부분 장애는 Actions 오류와 뉴스 브리핑 갱신 안내에 표시한다.
- 원본 저장 후 이전 Pages 호환 배포 요청. 전용 사이트는 insuwork-site 변경 감지가 배포하며 최대 30분 안에 전용 도메인의 기사·상태 일치를 확인하지 못하면 실패한다. 제품 수정 작업 종료 시에는 `gh workflow run deploy.yml --repo onesecond-solutions/insuwork-site`를 명시 실행하고 `/deployment.json` source를 확인한다.
- 테스트: `node --test scripts/insuwork_briefing.test.mjs insuwork/insubriefing/scripts/*.test.mjs`
- 운영 결정: `docs/decisions/2026-09-22_briefing_collector_recovery.md`
