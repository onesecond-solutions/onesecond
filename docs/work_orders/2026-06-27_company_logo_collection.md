# 보험회사 로고 수집 — 작업지시서 + 총괄팀 처리 설계 (2026-06-27)

> 대표님 지시. **알바 = 수집·1차 정리까지** / **총괄팀 = Supabase 업로드·회사 마스터 연결·중복 검수**.
> 상품 로드맵 작업과 **병행**(독립 트랙). 외부 홈페이지 이미지 URL 직접 연결 금지.

---

## 1. 목적·범위
- 원세컨드가 다루는 **생명보험사·손해보험사 전체**의 공식 로고 수집.
- 회사 검색 허브·상품 로드맵·소식지 등에서 회사 식별 시각요소로 사용.

## 2. 역할 분담
| 단계 | 담당 | 내용 |
|---|---|---|
| 수집·1차 정리 | **알바** | 공식 로고 다운로드 + 파일명 규칙 정리 + 출처 기록 (아래 §5 양식) |
| 업로드·연결·검수 | **총괄팀** | Supabase Storage 업로드 · 회사 마스터(`normalized_company`·`logo_url`) 연결 · 중복/정규화 ID 매핑 · 최종 검수표 |

## 3. 회사 목록 (수집 대상 — 정규화 회사명 기준)

### 생명보험사
| 정규화 회사명 | 파일 slug |
|---|---|
| 삼성생명 | samsung_life |
| 한화생명 | hanwha_life |
| 교보생명 | kyobo_life |
| 신한라이프 | shinhan_life |
| NH농협생명 | nh_life |
| 미래에셋생명 | miraeasset_life |
| 동양생명 | dongyang_life |
| KB라이프생명 | kb_life |
| 흥국생명 | heungkuk_life |
| 하나생명 | hana_life |
| DB생명 | db_life |
| 메트라이프생명 | metlife |
| 푸본현대생명 | fubon_hyundai_life |
| KDB생명 | kdb_life |
| 처브라이프생명 | chubb_life |
| iM라이프 | im_life |
| ABL생명 | abl_life |
| IBK연금보험 | ibk_pension |
| AIA생명 | aia_life |
| 라이나생명 | lina_life |

### 손해보험사
| 정규화 회사명 | 파일 slug |
|---|---|
| 삼성화재 | samsung_fire |
| 현대해상 | hyundai_marine |
| DB손해보험 | db_insurance |
| KB손해보험 | kb_insurance |
| 메리츠화재 | meritz_fire |
| 한화손해보험 | hanwha_insurance |
| 롯데손해보험 | lotte_insurance |
| 흥국화재 | heungkuk_fire |
| NH농협손해보험 | nh_insurance |
| 하나손해보험 | hana_insurance |
| MG손해보험 | mg_insurance |
| AIG손해보험 | aig_insurance |
| 라이나손해보험 | lina_insurance |

> ※ 회사 목록은 정규화 매핑([2026-06-27 company 정규화](2026-06-27_newsletter_company_normalization_map.md))과 동기화. 총괄팀이 실제 `insurers` 마스터와 최종 대조.

## 4. 수집 원칙 (대표님 지시 10원칙)
1. 각 보험회사 **공식 홈페이지 또는 공식 배포자료**에서 로고 수집
2. 가능하면 **SVG 우선**, 없으면 **투명 배경 PNG**
3. 회사명·파일명 규칙 통일 (§3 slug + §5 규칙)
4. **원본 파일은 그대로 보존** (수정본 따로)
5. Supabase Storage **공용 로고 폴더**에 저장 (총괄팀)
6. 회사 마스터의 **`normalized_company`와 `logo_url` 연결** (총괄팀)
7. 약칭·오타·중복값은 **기존 회사명 정규화 매핑과 동일한 보험사 ID로 연결** (총괄팀)
8. **외부 홈페이지 이미지 URL 직접 연결 금지** (반드시 다운로드 후 자체 Storage)
9. 로고 없는 회사 = **기본 텍스트 로고로 임시 처리**
10. 최종 **회사명·공식 로고·저장경로·출처 URL 검수표** 보고

## 5. 알바 제출 규칙·양식 (수집·1차 정리)
- **파일명**: `{slug}.svg` (SVG 우선) 또는 `{slug}.png` (투명 PNG). 예: `samsung_fire.svg`
- **원본 보존**: 받은 원본은 `원본/` 폴더에 그대로, 정리본은 `정리/` 폴더에 slug 파일명으로 (원본 미수정)
- **여러 버전**: `{slug}_v1`, `{slug}_v2` (가로형/심볼형 등)
- **제출 시트** (회사당 1행):

| 정규화 회사명 | slug | 형식(SVG/PNG) | 원본 파일명 | 정리 파일명 | 출처 URL | 비고 |
|---|---|---|---|---|---|---|
| 삼성화재 | samsung_fire | SVG | (다운로드 원본명) | samsung_fire.svg | https://… 공식 | |

- 로고 못 찾은 회사 = "없음" + 비고에 사유 → 총괄팀이 기본 텍스트 로고 처리

## 6. 총괄팀 처리 설계 (업로드·연결·검수)
1. **Storage 폴더**: public 버킷 `company_logos/` → 경로 `company_logos/{slug}.svg`
2. **회사 마스터 DDL**(대표 실행): `insurers`에 `logo_url text`, `logo_kind text`(svg/png/text) 컬럼 추가 (없으면)
3. **연결**: `insurers.id` ↔ slug ↔ `logo_url`(Storage public URL). 정규화 ID 기준(약칭·오타는 같은 id)
4. **중복 검수**: 같은 회사 약칭/오타 → 한 보험사 ID로 수렴(정규화 매핑 재사용)
5. **기본 텍스트 로고**: 로고 없는 회사 = 회사명 첫 글자/약칭 텍스트 로고(코드 렌더), `logo_kind='text'`

## 7. 최종 검수표 양식 (총괄팀 보고 — 원칙 10)
| 정규화 회사명 | 보험사 ID | slug | 로고 형식 | 저장경로(Storage) | 출처 URL | 상태 |
|---|---|---|---|---|---|---|
| 삼성화재 | (insurers.id) | samsung_fire | SVG | company_logos/samsung_fire.svg | https://…공식 | 수집완료 |
| … | | | | | | 수집/기본텍스트/누락 |

## 8. 병행 원칙
- 본 로고 트랙은 **상품 로드맵 화면 작업을 멈추지 않는다**(독립 트랙). 알바 수집 결과가 도착하면 총괄팀이 후처리.
