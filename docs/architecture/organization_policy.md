---
title: 원세컨드 조직 정책 — organization_policy (규칙 원본)
date: 2026-06-07
작성자: Claude Code (팀장님 결재 확정분 명문화)
대상 DB: pdnwgzneooyygfejrvbg (onesecond-v1-restore-0420, 유일 진실 원천)
근거: docs/architecture/role_access_map.md §4 (조직 매핑 정합성) + 크롬 실측 2026-06-07
용도: company/branch/team 조직 매핑의 규칙 원본. role_access_map은 "현황", 본 문서는 "규칙"
---

# 원세컨드 조직 정책 (organization_policy)

> **본질 충돌 시 `docs/strategy/master_strategy_v1.md` 우선.**

> 본 문서는 **팀장님 결재 확정분만** 규칙으로 기록한다. §1~§6 외 새 규칙 창작 금지. 현황·차이 후보는
> `role_access_map.md` 소관, IA 판단은 `information_architecture.md`(별도) 소관. 본 문서는 **규칙 원본**.

---

## §1. 조직 계층 (확정)

- **`company → branch → team` 3계층 단일 모델.** 별도 본부 계층 없음.
- "마케팅본부" 등 **본부 조직도 `branch`의 하나로 취급**한다 (본부 = 지점 계층에 편입).
- **비표준 팀 표기(예: 11팀) 불허.** 발견 시 정리 대상.

---

## §2. team=NULL 규칙 (확정)

| role | team 값 | 비고 |
|---|---|---|
| `ga_branch_manager` | **NULL 허용** | 지점장은 팀 무소속 정상 |
| `ga_staff` | **NULL 허용** | 스태프는 팀 무소속 정상 |
| `ga_member` | **필수** | 팀 소속 필수 |
| `ga_manager` | **필수** | 실장은 팀 소속 필수 |
| `insurer_*` (4종) | **항상 NULL** | `approve_insurer_user`가 team_id 미세팅 = 정상 |

---

## §3. 보험사 조직 규칙

- insurer 계정의 `branch_id` = **보험사 자체 조직 단위**여야 한다.
- 🚨 **GA 지점 `branch_id` 매핑 금지.**
- **현행 상태 (미해결 등재):** 메리츠 테스트 계정 2건이 더원지점 `branch_id`(`306edf6a…`)를 보유.
  테스트 계정이라 무해하나, **실보험사 입점 전 `approve_insurer_user` 부여 로직 점검 필수.**
  (role_access_map §6 신규 의심 참조)

---

## §4. 외부·운영 계정

- 티솔루션 등 운영 계정 = **"운영 계정" 분류 명기** (정리 대상이 아니라 분류 대상).
- `company/branch/team` 전체 미입력 계정 = **백필 또는 정리 대상.**

---

## §5. 가입 입력 개선 (예약)

- **근본 원인:** 가입 폼이 `branch_id`/`team_id`를 메타데이터에 미전달 → `handle_new_user` 트리거가 NULL 기록.
- **처방:** 조직 선택지(id 매핑) 전환 + 기존 11건 백필.
- **시점:** **v2 대전환 이후 별도 결재.** (현재는 예약 상태)

---

## §6. 검색 범위 규칙 (확정)

- **`team=NULL` 사용자: 개인 + 지점 범위.** 팀 범위 제외.

---

## 부록 — 미해결 항목

| # | 항목 | 연결 |
|---|---|---|
| 1 | 메리츠 테스트 계정 2건 GA 지점 branch_id 보유 → `approve_insurer_user` 부여 로직 점검 (실보험사 입점 전) | §3 / role_access_map §6 |
| 2 | 가입 폼 branch_id/team_id 메타 미전달 → 조직 선택지 전환 + 기존 11건 백필 (v2 이후) | §5 |
| 3 | company/branch/team 전체 미입력 계정 백필 또는 정리 | §4 |

**END OF DOCUMENT**
