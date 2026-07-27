---
세션 종료: 2026-07-27 (상담관리 엑셀식 표 뷰 + 설계사 전용 콘텐츠 + WO-8 마감 + 고객관리 리셋)
주요 마감: PR #1452~#1465 — 카테고리 화면·설계사 전용 시드·WO-8(유출차단+C안)·검색기 정렬·고객관리 리셋·상담관리 표 뷰(엑셀식)
생성: Claude Code (총괄팀장, 대표 세션, 데스크톱 앱)
---

# 세션 인계 노트 — 2026-07-27

**main 최신. 모든 PR 라이브 반영·검수 완료.** 대표 실사용 확인만 일부 대기(로그인/게이트 화면은 총괄 대행 불가).

## 이번 세션 완료 (PR #1452~#1465)

### 지식·공개경로
- **#1452** 로그인 SPA 카테고리(#v-axis-*): 전체 화면 스크롤 + 탭 표기 통일(간병→간병 · 치매·기타→그 외, 공개 정적본과 정합). `KC_AXES.category`=원장 매칭키 불변, 표시 `label` 분리.
- **#1453** 암 설계사 전용 자료 3건 시드(`advisor_contents` source_id=cancer-treatment, published, 임태성 게이트). 문구=`pages/cancer-treatment-history.html` 기존자산 재사용.
- **#1454** 간병·치매 설계사 전용 자료 3건 시드(source_id=caregiver-history). 원본에 전략라벨 없어 상담 확인포인트 재구성(창작 최소). production-db apply·postverify OK·anon permission denied.
- **advisor-doc.js는 소스 무관 범용**(published ≥1건이면 자동 버튼). 현재 published=실손1+암3+간병3. 뇌심장/수술비/그외=공개문서 자체 미생성.

### WO-8 마감
- **#1455** 유출 차단: 원장 url 3종 `/pages/*` → `/insurance/<slug>/`, showView 비로그인 분기·insurance _relurl 폴백 교체, **옛 /pages/ 3파일 삭제**(설계사 전략문구 잔존→비로그인 검색 유출원이었음). 라이브 옛/pages 404·검색결과 /insurance/·공개본 문구0.
- **#1456** C안: 홈 6축 카드 `show:_canSeeCoverage`→`true`(일반 설계사 노출, 클릭=비로그인 /insurance·로그인 showView SPA) + 옛 변천사 홈 카드 3종 삭제. 3모드 실측(비로그인·일반설계사·임태성) 후 삭제.
- **색인 실측(추정 금지):** robots.txt=/insurance/ Allow·/pages/·app.html Disallow. **app.html에 `<meta name=robots noindex,nofollow>` 이미 존재.** /insurance/=색인허용(canonical 있음). sitemap=/insurance/ 9URL만(app.html·/pages/ 주석에만). 옛/pages/ 3종 404. → "robots 때문에 전체 차단"은 오판, 실제 색인통제=meta robots.
- **#1457** 비로그인 홈 검색기 라인(시계로고·원세컨드·검색창·버튼) 가로 센터 정렬 + "onesecond"→"원세컨드". is-guest+≥1121px 스코프, 로그인 무회귀.

### 고객관리 리셋 (C등급, 완전삭제)
- 대표 지시(백업 불요·완전삭제·이관분만). 조건=`sales_customers WHERE source_ref LIKE 'imp:%' AND status='신규'`(손 안 댄 2026-06-26 이관 레거시). 안전캡 2700초과 abort·postverify. **삭제 2,583건**(이관 SQL 기대치 정확 일치)·보호 80건(status≠신규=대표 추가분·상담관리) 잔존·고아상담0.

### 상담관리 엑셀식 표 뷰 (#1459~#1465)
- 별도 메모리 `project-sangdam-sheet-view` 참조. 카드/표 토글·상담내용 표시·CSV·인라인 편집(자동저장)·새행(맨위·입력일자 오늘/직접입력)·페이지네이션(30/50/100)·자동포맷(생년월일 19760108→1976-01-08·전화 01012345678→010-1234-5678)·멀티라인(상담내용/비고 textarea)·컬럼폭(입력일자/인입유형/이름/전화/상담상태 각140·생년월일172)·전체폭(우측폼 숨김). care 전용, salesnote·카드 무접촉.
- **최대 교훈:** UI 폭/레이아웃은 그림(목업) 반복 금지 → 실제 코드+로컬 브라우저 실측(input에 실제값 넣고 offsetWidth/rect 측정)으로 확인. 대표 격노 반복.

## 남은 것 (다음 세션)
- **상담관리 표 뷰 3차 잔여 = 다중선택 일괄 삭제**(오래된 항목 체크→한 번에). 미착수.
- 설계사 전용: 뇌심장/수술비 공개문서 제작 후 콘텐츠 · 정식 전환(임실장→설계사 전체, `os_can_read_advisor_docs` 함수 교체).
- '그 외' 카드 성격 결정(대표 지정).

## 상태
- main 최신·워킹트리 clean(추적). 관련 메모리: `project-sangdam-sheet-view`(신규)·`project-knowledge-registry-track`·`project-onesecond-pending`.
