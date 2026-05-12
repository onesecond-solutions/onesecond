# 작업지시서: 4팀 단톡방 → 실장님 공지 board_type INSERT 준비

> **생성:** 2026-05-12 (화) 본 웹 Claude 세션 산출
> **수신:** Claude Code (5/18 4팀 오픈 후 진입 권고)
> **선행 조건:** Step 7 board_type 7종 명칭 확정 + 결재 4건 통과
> **작업 분류:** 카톡 가공 결과 ↔ Drive 자료 짝 매칭 + INSERT 데이터 박음 (드라이런, 실 INSERT는 별도 결재)

---

## 0. 사전 정합 검증 (필수)

```bash
# 0-1. 신버전 Supabase 확인
echo "Supabase 프로젝트 ID = pdnwgzneooyygfejrvbg 인지 팀장님께 확인"

# 0-2. board_type 7종 명칭 확정 여부 (Step 7 결과)
# pages/board.html에서 board_type 정의 grep
grep -n "board_type" pages/board.html | head -20
# 또는 db.js / scripts.html
grep -rn "board_type" js/ pages/ | head -20

# 0-3. 결재 4건 통과 확인 (인계 문서 §6 Q1~Q4)
# Q1: 실장님 공지 board_type 명칭 확정 (예: notice_silver)
# Q2: write 권한 = ga_manager 단일?
# Q3: read 권한 = 4팀 사용자만?
# Q4: 5/18 후 진입 시점 정합?
```

→ **위 4건 미해결 시 본 작업 진입 차단.** 팀장님께 확인 후 진행.

---

## 1. 입력 데이터 수신

본 웹 Claude 세션에서 박은 산출물:

```
clusters_full.json    — 215건 본진 묶음 전문 (텍스트 본문 + 첨부 라벨)
clusters_summary.csv  — 215건 요약본 (Code 검수용)
```

추가로 Drive에서 받을 것:
```
file_index_phase2.csv   — 1316~1564 파일 인덱스 (filename, extension, size)
file_index.csv          — 1~1315 Phase 1 인덱스
file_content_phase2.csv — 본문 추출 결과 (PDF/PPTX/DOCX/XLSX/TXT)
file_content.csv        — Phase 1 본문
```

위 4 파일은 Google Drive `4팀 단톡방 작업 / _output / *` 안에 있음.

---

## 2. 짝 매칭 (filename ↔ 카톡 첨부 라벨)

```python
import json, pandas as pd

# 입력
with open('clusters_full.json', 'r', encoding='utf-8') as f:
    clusters = json.load(f)

# Drive 인덱스 통합 (Phase 1 + Phase 2)
idx1 = pd.read_csv('file_index.csv', encoding='utf-8-sig')
idx2 = pd.read_csv('file_index_phase2.csv', encoding='utf-8-sig')
idx = pd.concat([idx1, idx2], ignore_index=True)

# 본문 통합
ct1 = pd.read_csv('file_content.csv', encoding='utf-8-sig')
ct2 = pd.read_csv('file_content_phase2.csv', encoding='utf-8-sig')
ct = pd.concat([ct1, ct2], ignore_index=True)

# 인덱스 + 본문 조인
full = idx.merge(ct[['id', 'extracted_text', 'extraction_method', 'truncated']],
                 on='id', how='left')

# filename 기반 짝 매칭 함수
def find_match(label):
    # 카톡 라벨 = "2507교안_농협손보.pptx"
    # Drive filename = "2507교안_농협손보.pptx" or "2507교안_농협손보 (1).pptx"
    cand = full[full['filename'] == label]
    if len(cand) > 0:
        return cand.iloc[0].to_dict()
    # (1) 같은 중복본 처리
    base = label.replace('.', ' .')  # 확장자 분리
    cand = full[full['filename'].str.startswith(label.rsplit('.', 1)[0])]
    if len(cand) > 0:
        return cand.iloc[0].to_dict()
    return None

# 215건 묶음 각각에 Drive 매칭 결과 박음
for c in clusters:
    matches = []
    for fname in c.get('file_names', []):
        m = find_match(fname)
        if m:
            matches.append({
                'kakao_label': fname,
                'drive_id': m['id'],
                'drive_filename': m['filename'],
                'extension': m['extension'],
                'size_bytes': m['size_bytes'],
                'oversize_10mb': m['size_bytes'] > 10 * 1024 * 1024,  # ⚠️ 10MB 초과
                'has_extracted_text': pd.notna(m.get('extracted_text')) and len(str(m.get('extracted_text', ''))) >= 200,
                'extraction_method': m.get('extraction_method'),
            })
        else:
            matches.append({
                'kakao_label': fname,
                'drive_id': None,
                'unmatched': True,  # ⚠️ Drive에서 못 찾음
            })
    c['drive_matches'] = matches

# 산출물
with open('clusters_with_drive.json', 'w', encoding='utf-8') as f:
    json.dump(clusters, f, ensure_ascii=False, indent=2)

# 검수 통계
total_labels = sum(len(c.get('file_names', [])) for c in clusters)
matched = sum(1 for c in clusters for m in c['drive_matches'] if m.get('drive_id'))
unmatched = total_labels - matched
oversize = sum(1 for c in clusters for m in c['drive_matches'] if m.get('oversize_10mb'))

print(f"카톡 첨부 라벨: {total_labels}")
print(f"  Drive 매칭 성공: {matched} ({matched/total_labels*100:.1f}%)")
print(f"  Drive 매칭 실패: {unmatched}")
print(f"  10MB 초과: {oversize}")
```

---

## 3. 라이센스 위험 자동 플래그

```python
# 보험사 자료 = "무단 전재 및 복사 금지" 라이센스 위험
INSURER_KEYWORDS = ['라이나', '메리츠', '한화', 'KB', 'DB', '삼성', '롯데', '농협', '흥국', '현대해상', '하나', 'ABL', '신한']

for c in clusters:
    risks = []
    body = c['text_body']
    
    # 본문에서 보험사 키워드 검출
    for kw in INSURER_KEYWORDS:
        if kw in body or any(kw in fn for fn in c.get('file_names', [])):
            risks.append(f'insurer_material:{kw}')
            break
    
    # 본문 추출 결과에서도 라이센스 명시 검색
    for m in c.get('drive_matches', []):
        if m.get('drive_id'):
            # extracted_text에서 라이센스 명시 검색은 별도 처리
            pass
    
    c['license_risks'] = risks
```

---

## 4. INSERT SQL 드라이런 (실행 X, 검수용)

```python
# Supabase posts 테이블 INSERT SQL 박음 (드라이런)
# 실제 INSERT는 팀장님 결재 후 별도 명령

sql_lines = []
sql_lines.append("-- 4팀 단톡방 → 실장님 공지 board_type INSERT 드라이런")
sql_lines.append("-- 생성: 2026-05-XX")
sql_lines.append("-- 검수 후 팀장님 결재 통과 N건만 실 실행")
sql_lines.append("BEGIN;")

for c in clusters[:5]:  # 우선 상위 5건만
    title = c['text_body'][:60].replace('\n', ' ').replace("'", "''")
    body = c['text_body'].replace("'", "''")
    files_json = json.dumps([m for m in c['drive_matches'] if m.get('drive_id')], ensure_ascii=False).replace("'", "''")
    
    sql_lines.append(f"""
-- Cluster #{c['rank']} | {c['date']} {c['time']} | text {c['text_len']}자 + 첨부 {c['n_attach']}건
INSERT INTO public.posts (
  board_type, title, content, attachments_json, author_user_id, 
  created_at, source_meta
) VALUES (
  'notice_silver',  -- ⚠️ Step 7 board_type 명칭 확정 후 갱신
  '{title}',
  '{body}',
  '{files_json}'::jsonb,
  (SELECT id FROM public.users WHERE role='ga_manager' LIMIT 1),  -- 한재성 실장
  '{c['ts_start']}'::timestamptz,
  '{{"source": "kakao_4team", "cluster_rank": {c['rank']}, "n_attach": {c['n_attach']}}}'::jsonb
);""")

sql_lines.append("\n-- COMMIT 또는 ROLLBACK은 검수 후 별도 결정")
sql_lines.append("-- ROLLBACK;")

with open('insert_dryrun.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))
```

---

## 5. Code 검수 보고 권장 형식

본 작업 종료 시 팀장님께 다음 보고:

```
=== 4팀 단톡방 INSERT 준비 검수 ===
[입력]
- clusters_full.json: 215건
- Drive 인덱스: 1,565 파일
- Drive 본문: 1,565 추출 (1,565건 - 71 추출 실패 = 1,494건 본문 보유)

[짝 매칭]
- 카톡 첨부 라벨: 100건 (파일만, 사진/영상 제외)
- Drive 매칭 성공: NN건 (XX%)
- Drive 매칭 실패: NN건 (수동 매칭 필요)
- 10MB 초과: NN건 (Drive 링크로 처리 권고)

[라이센스 위험]
- 보험사 자료 포함 묶음: NN건
- 라이센스 명시 PDF: NN건 (라이나/메리츠/KB 등)

[INSERT 드라이런]
- insert_dryrun.sql 생성 (상위 5건)
- 실 INSERT 결재 대기

[권고]
- 결재 통과 시 상위 N건만 INSERT
- 라이센스 명시 자료는 4팀 read 권한 확정 후 진입
- 매칭 실패 NN건은 팀장님 수동 확인
```

---

## 6. 절대 금지

- ⛔ 결재 4건 통과 전 실 INSERT 실행
- ⛔ Drive ↔ 카톡 매칭 실패 건 임의로 박음
- ⛔ 10MB 초과 파일 폼 직접 업로드 (별도 처리 결정 후)
- ⛔ 라이센스 명시 자료 외부 read 권한으로 박음
- ⛔ 215건 일괄 INSERT (단계별 분할 권고)

---

## 7. 본 작업의 단계 분류

| 단계 | 누가 | 산출 |
|---|---|---|
| 1 | 본 웹 Claude (2026-05-12) | clusters_full.json + 본 작업지시서 |
| 2 | Code | Drive 매칭 + 라이센스 플래그 + insert_dryrun.sql |
| 3 | 팀장님 | 강 보수 검수 (전건 확인) + 결재 4건 |
| 4 | Code | 결재 통과 N건만 실 INSERT |
| 5 | Chrome / 팀장님 | 라이브 회귀 (실장님 공지 board_type 안 N건 표시 확인) |

본 작업은 **단계 2까지**가 본 작업지시서 범위. 단계 3~5는 별도 결재·작업.
