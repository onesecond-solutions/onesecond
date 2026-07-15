# 보장분석 인터랙티브 — 프로토타입 (2026-07-16)

원세컨드 핵심 영업제품 "보장분석"의 고객 발송용 프로토타입. 대표(임태성) 확정 방향으로 총괄 제작.
스펙 진실원천: 메모리 `project-bojang-analysis-product-spec` / 세션 `docs/sessions/2026-07-16_0634.md`.

## 컨셉
통화 후 상황에 맞는 자료를 골라 **공유 링크 → 고객 카톡 발송** → 고객이 열어보고 **먼저 연락** 오게 만드는 흐름.
디자인 = 다크 남색+골드 프리미엄, 모바일 최적화, **사진 없이 CSS·SVG**(이미지 추가는 대표 추후 결정).
전화 연결 = 010-9241-9375. 설계사 서명 = 임태성 보험전문가.

## 파일 (이 폴더)
- `bojang_hub.html` — 📤 발송 센터(설계사 입구). 6개 자료 골라 링크 복사→카톡. 앱 보장분석 화면 프로토타입.
- `bojang_share.html` — 🛡️ 종합 설명형(상태 모를 때·만능). 4대 보장 설명+30초 자가진단.
- `type_medical.html` — 🏥 의료실비(세대 설명)
- `type_cancer.html` — 🎗️ 암(진단·치료·비급여 3층)
- `type_brainheart.html` — 🫀 뇌·심장(좁은문vs넓은문 범위)
- `type_surgery.html` — 🩹 수술비(종수술·반복지급)

> ⚠️ **맞춤 결과형(`bojang_result.html`)은 고객 실데이터(최정숙 뱅크샐러드)라 repo 제외**(고객정보 격리). 라이브 링크만 유지. 앱 통합 시 샘플 데이터로 재템플릿.

## 라이브 아티팩트 URL (claude.ai · 발송 전 각 링크 '공유→공개' 전환 필요)
- 발송 센터: https://claude.ai/code/artifact/e9b8eb13-50dd-44ee-aec9-d2a0b2d0003e
- 종합 설명형: https://claude.ai/code/artifact/53bbcb8b-50fb-46eb-b599-47969ac5c325
- 의료실비: https://claude.ai/code/artifact/ec16495a-a0fb-4181-96c2-3d7d2c758685
- 암: https://claude.ai/code/artifact/067c0e2e-edbb-4122-b7dd-7547740401ab
- 뇌·심장: https://claude.ai/code/artifact/af44dc5b-d51a-45ab-be8f-176ef30ac90f
- 수술비: https://claude.ai/code/artifact/4c83ce86-7347-4317-835b-ba87665d8818
- 맞춤 결과형(최O숙 예시): https://claude.ai/code/artifact/9bc0dce7-bab6-4e2e-a937-9ebee3b2327e

## ⏰ 다음 (회사 출근해서 = 대표 로그인 필요)
1. **원세컨드 앱 홈에 "보장분석 카드" 정식 통합** → 클릭 시 이 화면. 임태성 게이트·os-builder 위임·대표 로그인 검증.
2. 맞춤 결과 **자동 생성**(설계사가 PDF/엑셀 업로드 → 결과 링크 생성. 현재는 총괄이 대표 자료 받아 생성 = 뱅크샐러드 복호화 파이프라인).
3. PDF·엑셀 산출물, 이미지 추가 여부.
4. 파일들은 Artifact 포맷(`<style>`+본문, doctype 없음) — 앱 편입 시 `#v-*` 뷰로 이식.
