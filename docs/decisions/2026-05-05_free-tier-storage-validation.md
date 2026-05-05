| | |
|---|---|
| 결정 문서 ID | FREE_TIER_STORAGE_VALIDATION_2026-05-05 |
| 결정 시각 | 2026-05-05 (별 트랙 검증 의뢰, Claude AI 정책 초안 → Claude Code 기술 타당성 검증) |
| 상태 | 🟢 검증 완료 / ⏸ 후속 4건 결정 보류 (메모리·content-policy.md 정식 반영 보류) |
| 진실 원천 | 본 문서 (정책 헌법 문서 `docs/product/content-policy.md`는 결정 완료 후 정식 반영) |
| 의뢰 형식 | 별 트랙 검증 의뢰 — 정책 타당성 검증만, 코드 작업·DB 스키마 변경 0건 |

# 무료 회원 저장 공간 정책 — 기술 타당성 검증 보고

## § 0. 큰 그림 정합성 검증 (의뢰 진입 시)

의뢰서 § 0에 적힌 "**현재 메인 트랙 = home.html C-2 라이브 검수**"는 `docs/sessions/_INDEX.md` 실제 상태와 다름:

| 구분 | 의뢰서 가정 | _INDEX.md 실제 상태 |
|---|---|---|
| 메인 트랙 | home.html C-2 라이브 검수 | **admin_v2 Phase D** (D-9 Step 5 라이브 회귀 + 트랙 #A PITR 사후 검증 진행 중) |
| home.html | (메인) | 보조 트랙 — 시안 승격 (사실상 흡수 완료, C-3·C-4 잔여만, 별 카운터) |

**본 별 트랙(저장 공간 정책 검증)이 메인 트랙과 충돌하는지:**
- 본 의뢰는 정책 타당성 검증만, 코드/DB 변경 0건 → 진행 중인 메인 트랙과 **충돌 0**
- 본 답변은 § 5 작업 범위 제한 정합 (코드 작성 금지 / DB 변경 금지 / 파일 생성 금지)

→ 의뢰서 § 0의 메인 트랙 명칭만 정정 보고. 본 의뢰는 **그대로 진행**.

---

## § 3-1. Supabase Storage 기술 검증

### 3-1-A. 100GB 한도 안에서 무료 회원 운영

**[검증 결과] ⚠️ 1,000명 OK / 5,000명은 한도 초과 (정책 한도와 산수가 충돌)**

**[이유]**
- 1인당 30MB × 1,000명 = **30GB** ✅ (100GB 안에 33배 여유) — 일반적 평균 사용량 30~50%로 가정 시 실제 ~10~15GB
- 1인당 30MB × 5,000명 = **150GB** ❌ (한도 초과 50%)
- 단 평균 실 사용량 30~50% 가정 시 5,000명 × 10MB = **50GB** ⚠️ (한도 안이지만 일부 사용자는 30MB 가까이 채움 → 운영 중 도달 위험)

**[권장 사항]**
- 4팀 40명 v1.1 출시 시점 = 1.2GB → 여유 매우 큼
- 1,000명 시점에 사용량 모니터링 시작 (`user_storage_usage` 테이블 합계)
- 5,000명 진입 전에 정책 재검토: ① 한도 축소 (30MB → 20MB) / ② Cloudflare R2 또는 외부 Storage 분리 / ③ 한도 초과 알림 + 정리 유도

### 3-1-B. 1인당 30MB 한도 DB/Storage 정책 강제

**[검증 결과] ⚠️ 가능하지만 단일 메커니즘으로는 부족 — 3중 방어 권장**

**[이유]**
- **클라이언트 검증만:** 우회 가능 (개발자 도구 fetch 직접) ❌
- **Storage RLS (with_check 서브쿼리):** 가능하지만 INSERT 시점에 SUM(size) 서브쿼리 실행 = 매 업로드마다 비용 + N행 동시 INSERT 시 race condition
- **DB Trigger AFTER INSERT:** SUM 합산 후 한도 초과 시 EXCEPTION → ROLLBACK 가능. **D-pre.7 학습 정합** (RLS 자기 참조 회피) 위반 안 함
- **Edge Function 검증:** 가장 확실하나 7개월 차 개발 환경엔 무거움

**[권장 사항]**
3중 방어 구조:
1. **클라이언트 사전 차단** (UX) — 업로드 직전 `user_storage_usage.total_bytes` fetch + 신파일 size 합산 + 초과 시 토스트 + 차단
2. **DB Trigger AFTER INSERT on storage.objects** — 합산 후 초과 시 RAISE EXCEPTION (ROLLBACK)
3. **별도 추적 테이블** `user_storage_usage (user_id PK, total_bytes BIGINT, files_count INT, updated_at)` — Trigger가 이 테이블도 함께 갱신

storage.objects metadata에서 `size` 가져오기: `(metadata->>'size')::bigint` 패턴 정합. SECURITY DEFINER 함수로 SUM 캡슐화 권장 (D-pre.7 표준).

### 3-1-C. 한도 초과 시 업로드 차단

**[검증 결과] ✅ Trigger + 클라이언트 이중 권장**

**[권장 사항]** § 3-1-B § 권장 사항 1·2 그대로. 클라이언트는 UX, Trigger는 보안.

---

## § 3-2. 클라이언트 압축 라이브러리

### 3-2-A. 권장 라이브러리

**[검증 결과] ✅ `browser-image-compression` 권장**

**[이유]**
- npm 주간 다운로드 ~150만 + 활발한 유지보수
- 경량 (~10KB gzip)
- iOS Safari / Chrome / Firefox 호환 정합
- `maxSizeMB` 옵션으로 200KB(0.2)/500KB(0.5) 자동 타겟 가능
- Web Worker 자동 사용 (UI 블로킹 0)

대안: `compressorjs` (canvas 기반, 더 빠름이지만 옵션 단순). 7개월 차에는 `browser-image-compression`이 더 직관적.

### 3-2-B. 200KB / 500KB 자동 압축 가능

**[검증 결과] ✅ 가능 + 추가 권장 옵션**

**[권장 사항]**
```js
{
  maxSizeMB: 0.2,                    // 또는 0.5
  maxWidthOrHeight: 1600,            // 4팀 모바일·태블릿 충분
  useWebWorker: true,
  initialQuality: 0.8,
  fileType: 'image/webp',            // JPEG 대비 30~40% 추가 절감
  alwaysKeepResolution: false
}
```

WebP 변환은 iOS 14+ 호환 (4팀 운영 환경 정합). 단 미리보기 표시 호환성 확인 필요.

### 3-2-C. 7개월 차 도입 난이도

**[검증 결과] ✅ 1~2점 (5점 만점)**

**[이유]**
- 7개월 차 = JavaScript / async/await / FormData / fetch 구사 가능 가정
- 라이브러리 호출 = 3~5 라인 (`imageCompression(file, options)` Promise)
- D-9 Step 4 배너 이미지 업로드 코드(`admStorageUpload`)에 곧바로 wrap 가능

**[주의]**
- HEIC(아이폰 기본) → 자동 변환 부재. 별도 변환 라이브러리 또는 사전 안내 필요
- 압축 실패 시 fallback 처리 (원본 거부 또는 무압축 업로드)

---

## § 3-3. 비용 시뮬레이션

### 3-3-A. 1,000명 × 평균 10MB 시 실제 Supabase 비용

**[검증 결과] ✅ 무료 한도 안 (4팀 40명·1,000명 모두)**

**[Pro 플랜 무료 한도 (capture § 1-2 정합):]**
- Storage: 100 GB 포함
- Egress: 250 GB/월 포함
- 초과 시: Storage $0.021/GB · Egress $0.09/GB

| 시점 | 사용자 | Storage | 추정 비용 |
|---|---|---|---|
| v1.1 4팀 40명 (5/15) | 40명 × 10MB | 0.4GB | $0 |
| 6개월 후 1,000명 | 1,000명 × 10MB | 10GB | $0 |
| 1,000명 × 30MB (한도 max) | 30GB | $0 |
| 5,000명 × 30MB | 150GB | (150-100) × $0.021 = **$1.05/월** |

→ Storage 자체는 한도 거의 안 닿음. 비용 위협은 **Egress (다음 항목)**.

### 3-3-B. Egress 비용 추정

**[검증 결과] ⚠️ Cloudflare CDN 미도입 시 1,000명 시점에 Egress 한도 도달 가능**

**[이유]**
- 게시판 이미지 노출 = 매 글 조회마다 Storage 다운로드 (브라우저 캐싱 무시 시)
- 가정: 1인당 1일 평균 30개 글 조회 + 글당 평균 1장 이미지 (300KB) = 9 MB/일/인
- 1,000명 × 9 MB × 30일 = **270 GB/월** → 250 GB 한도 초과 ⚠️
- 초과분 20GB × $0.09 = **$1.8/월** (소액이나 발생)

**[권장 사항]**
- **v1.5 Cloudflare CDN 도입은 정합** — 캐시 hit ratio 70~90% 시 Egress 30~80GB로 감소 (한도 안)
- 4팀 v1.1 시점에는 Egress 거의 없음 (40명 × 9MB × 30 = 10.8 GB/월)
- 4팀 → 1,000명 사이 시점이 실제 도입 골든타임 — **사용량 모니터링 표** 별 트랙 후보

### 3-3-C. 100GB Storage 한도 도달 시점 예측

**[검증 결과] ✅ 1,000명 시점 안전 / 5,000명 시점 도달 위험**

| 사용자 | 평균 30MB (한도) | 평균 10MB (현실) |
|---|---|---|
| 1,000명 | 30 GB | 10 GB |
| 3,000명 | 90 GB ⚠️ | 30 GB |
| **5,000명** | **150 GB ❌** | 50 GB ⚠️ |

→ 3,000명 도달 시 모니터링 강화 / 4,000명 도달 시 Cloudflare R2 분리 또는 한도 축소 검토.

---

## § 3-4. RBAC 연계 검증

### 3-4-A. 9역할 ↔ 무료 회원 한도 매칭

**[검증 결과] ✅ users.role + users.plan 분기 정합 (이미 구축된 체계 활용 가능)**

**[이유]**
- `users.role` 9개 + `users.plan` (CLAUDE.md "무료 혜택 대상: admin + 각 소속 branch_manager·manager") 이미 운영 중
- "매니저 이상 무료" 원칙은 **plan = 'free' 모두 동일 한도**가 아니라, **role 별 한도 분기** 필요 의미

**[권장 사항]**
정책 표 (별도 테이블 또는 app_settings):

| role | 매니저 이상 | 한도 |
|---|:-:|---|
| admin | ✓ | 무제한 (또는 1GB+) |
| ga_branch_manager / insurer_branch_manager | ✓ | 100MB (영업 자료 풍부) |
| ga_manager / insurer_manager | ✓ | 100MB |
| ga_member / insurer_member | — | **30MB (본 정책 적용 대상)** |
| ga_staff / insurer_staff | — | 30MB (또는 50MB?) |

### 3-4-B. 한도 분기 구현

**[검증 결과] ✅ SECURITY DEFINER 함수 표준 권장**

**[권장 사항]**
- `public.get_user_storage_quota(user_id uuid)` SECURITY DEFINER STABLE 함수 → role/plan 기반 한도 반환
- Trigger / RLS / 클라이언트 모두 이 함수 호출 (단일 진실 원천)
- D-pre.7 표준 정합 (자기 참조 회피, 함수 캡슐화)

---

## § 3-5. 향후 확장성

### 3-5-A. 유료 회원 정책 추가 시 같은 구조 확장 가능?

**[검증 결과] ✅ users.plan 컬럼 활용 시 확장성 좋음**

**[이유]**
- `get_user_storage_quota()` 함수에 plan 분기 추가만으로 확장 (`'free'` / `'pro'` / `'crm'` / `'insurer'` 4종)
- 정책 표 행 추가만 = 데이터 이전 0
- DB 스키마 변경 0 (이미 plan 컬럼 운영 중)

### 3-5-B. 무료 → 유료 전환 시 데이터 이전·한도 변경

**[검증 결과] ⚠️ 한도 축소 시 grandfathering 정책 필요**

**[이유]**
- 무료 → 유료 = `users.plan` UPDATE만으로 즉시 한도 변경 ✅ (데이터 이전 0)
- 유료 → 무료 (다운그레이드) 시 = 기존 사용량 30MB 초과 시 어떻게 처리?

**[권장 사항]**
다운그레이드 시 옵션:
- (a) 한도 초과 상태 허용 + 신규 업로드 차단 (사용자가 정리할 때까지)
- (b) 자동 정리 (가장 오래된 파일부터 삭제) — 데이터 손실 위험
- (c) 30일 grace period + 안내 메일 + 정리 유도 ⭐ **권장**

본 별 트랙 정책 헌법 문서 `docs/product/content-policy.md`에 다운그레이드 정책 별도 섹션 추가 권장.

---

## 📋 종합 판정

| § | 항목 | 결과 |
|:-:|---|:-:|
| 3-1-A | 100GB 한도 1,000~5,000명 | ⚠️ 1,000명 OK / 5,000명 위험 |
| 3-1-B | 30MB 한도 강제 | ⚠️ 3중 방어 (클라이언트 + Trigger + 추적 테이블) |
| 3-1-C | 초과 시 업로드 차단 | ✅ |
| 3-2-A | 압축 라이브러리 | ✅ `browser-image-compression` |
| 3-2-B | 200KB/500KB 자동 압축 | ✅ + WebP 변환 권장 |
| 3-2-C | 도입 난이도 | ✅ 1~2점 |
| 3-3-A | Storage 비용 | ✅ 무료 한도 안 |
| 3-3-B | Egress 비용 | ⚠️ Cloudflare CDN 필수 (1,000명 도달 전) |
| 3-3-C | 100GB 도달 시점 | ✅ 1,000명 안전 / 5,000명 위험 |
| 3-4-A | 9역할 매칭 | ✅ users.role + plan 활용 |
| 3-4-B | 한도 분기 구현 | ✅ SECURITY DEFINER 함수 표준 |
| 3-5-A | 유료 확장성 | ✅ plan 컬럼 활용 |
| 3-5-B | 다운그레이드 | ⚠️ grace period 정책 필요 |

**총평:** 정책 골격은 ✅ **그대로 진행 가능**. 단 4건 ⚠️ 보강 필요:
1. **5,000명 진입 전 한도 축소 또는 Cloudflare R2 분리 결정** (정책 헌법 문서에 트리거 명시)
2. **30MB 한도 강제 = 3중 방어 구조** (클라이언트 + Trigger + 추적 테이블)
3. **Cloudflare CDN 도입 골든타임 = 4팀 → 1,000명 사이** (Egress 한도 도달 전)
4. **다운그레이드 grace period 정책** 30일 + 정리 유도

---

## 🔗 본 답변 외 후속 (사용자 결정 필요)

본 답변은 § 5 작업 범위 제한 정합 — 코드/파일 생성 0. 다음 후속은 사용자 결정 후 별도 별 트랙으로:

- (선택) 정책 헌법 문서 `docs/product/content-policy.md` 보강 (사용자 작업 중 명시)
- (선택) `user_storage_usage` 추적 테이블 + Trigger + SECURITY DEFINER 함수 작업지시서
- (선택) Cloudflare CDN 도입 결정 트리거 (1,000명 도달 시점) 별 트랙 등록 후보

---

## 📌 본 결정 후속 결정 보류 4건 (2026-05-05 본 검증 종료 시 명문화)

| # | 보류 항목 | 트리거 | 결정 시점 |
|:--:|---|---|---|
| 1 | Cloudflare CDN 도입 시점 | **1,000명 도달** (Egress 한도 도달 전 골든타임) | 미정 (사용량 모니터링 표 별 트랙 후) |
| 2 | 30MB 한도 강제 3중 방어 구조 작업지시서 | 무료 회원 정책 정식 적용 시점 | 4팀 v1.1 출시 (5/15) 이후 |
| 3 | 다운그레이드 grace period 정책 | 유료 회원 정책 논의 시 함께 | 유료 정책 결정 시 |
| 4 | 5,000명 진입 전 한도 재검토 | **3,000명 도달 + 4,000명 도달** 2단계 모니터링 | 미정 |

본 보류 4건은 `docs/sessions/_INDEX.md` 결정 대기 항목에 등재. 메모리·`docs/product/content-policy.md` 정식 반영은 4건 결정 완료 후 별도 진행.

---

*본 결정 문서는 별 트랙 검증 의뢰 — 무료 회원 저장 공간 정책 기술 타당성 검증 결과 보존. 후속 4건 결정 보류 상태.*
