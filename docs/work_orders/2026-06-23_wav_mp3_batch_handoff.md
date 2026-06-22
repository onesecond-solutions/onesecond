# WAV → MP3 파생본 일괄 변환 — 회사 PC 재개 가이드 (2026-06-23 박제)

> 집 PC(ffmpeg·인증 없음)에서는 **변환 실행 안 함**. 1단계 조사 완료 + 준비물만 박제.
> 회사 PC(PoC 때 ffmpeg 직접 설치한 환경)에서 이 문서를 기준으로 이어간다.
> 진실원천. 신버전 DB `pdnwgzneooyygfejrvbg` / 버킷 `myspace`.

## 0. 1단계 조사 결과 (2026-06-23 라이브 실측 — 확정)

| 항목 | 값 |
|---|---|
| WAV 총 건수 | **114** (대표 "70/90"은 부분기억, 실측 114) |
| playback_path 없음(변환 후보) | **113** |
| playback_path 있음(PoC 검증분) | 1 (제외) |
| 0바이트 / 원본 누락 / 중복 | 0 / 0 / 0 |
| 원본 Storage 실존 | 114/114 |
| 소유자 / scope | 전부 임태성 `98c5f4f9-10c1-4ee1-a656-5c2ca63239fd` / 전부 branch |
| MIME / 확장자 | 전부 `audio/wav` / `.wav` |
| 크기 | <1MB 52 · 1–5MB 59 · 5–18MB 3 (총 166.4MB, 18MB+ 없음) |

**미확정(헤더 필요·인증 후):** PCM(재생가능, 변환 제외) vs 비-PCM(GSM 등, 변환 대상) 분류 → 회사 PC에서 `classify.sh`로 확정.

## 1. 회사 PC 재개 지점 (순서대로)

```
1) git fetch && git checkout main && git pull         # 이 가이드·스크립트 최신화
2) ffmpeg 존재 확인:  ffmpeg -version                  # PoC 때 설치돼 있어야 함
3) service_role key를 터미널 환경변수에만 설정(파일·커밋 금지):
   export SB_SERVICE_ROLE_KEY=...(Dashboard > Settings > API > service_role)
4) 헤더 분류:        bash scripts/wav_mp3/classify.sh   # 읽기전용, _work/classify.csv 생성
5) 실행 전 스냅샷:   아래 §5 SQL (before)
6) 표본 5건 계획:    bash scripts/wav_mp3/convert.sh sample            # write 0(계획만)
7) 표본 5건 변환:    bash scripts/wav_mp3/convert.sh sample --write    # ★대표 승인 후
8) 표본 검수(§6) + 실행 후 스냅샷 → 대표 승인
9) 전체 변환:        bash scripts/wav_mp3/convert.sh all --write       # ★표본 검수·승인 후에만
```

⚠️ `SB_SERVICE_ROLE_KEY`는 화면·로그·커밋에 절대 노출 금지. `_work/`는 .gitignore 처리됨.

## 2. 스크립트·파일 경로

| 파일 | 역할 |
|---|---|
| `scripts/wav_mp3/classify.sh` | 113건 헤더 64B Range GET → audioFormat 분류 → `_work/classify.csv`. 읽기전용 |
| `scripts/wav_mp3/convert.sh` | 비-PCM만 변환·업로드·playback_path 연결. `--write` 없으면 계획만 |
| `scripts/wav_mp3/_work/` | 임시 산출물(목록·헤더·MP3·CSV). git 제외 |

**코드 변경 불요:** `playback_path` 컬럼·프론트 우선재생(`_wavPlaybackEnabled`)·다운로드(원본 유지) 전부 라이브 반영됨(이전 세션). 이 작업은 **데이터 작업**.

## 3. 114건 헤더 분류 절차 (classify.sh 내부)

1. service_role로 미변환 WAV(playback_path null·deleted_at null) 전수 조회
2. 각 객체 `storage/v1/object/myspace/{storage_path}` 를 `Range: bytes=0-63`로 헤더만 GET
3. `RIFF`/`WAVE` 검증 후 offset 20–21(LE 2바이트) = audioFormat 코드 파싱
4. 코드맵: 1=PCM(재생가능·**제외**) / 2=MS-ADPCM · 6=A-law · 7=µ-law · 17=IMA-ADPCM · 49=GSM6.10 · 85=MP3 · 65534=EXTENSIBLE(**비-PCM=변환대상**)
5. `_work/classify.csv`(id,file_size,fmt_code,fmt_name,storage_path) + 집계 출력

## 4. 5건 표본 선정 규칙 (convert.sh sample)

- **비-PCM만** 대상(PCM·헤더이상·download_fail 제외)
- 크기 구간 다양: **<1MB 2건 · 1–5MB 2건 · 5–18MB 1건** (부족 시 있는 것에서 보충)
- 변환식(PoC 검증): `ffmpeg -ac 1 -c:a libmp3lame -b:a 48k`
- MP3 키 = 원본 `storage_path`의 `.wav`→`.play.mp3` (같은 폴더, ASCII)
- 성공 시에만 `playback_path` 기록. 실패 시 DB write 0. 원본 불변

## 5. 실행 전·후 DB·Storage 스냅샷 (읽기전용 — before/after 비교)

```sql
select count(*) total,
  count(*) filter (where playback_path is not null and btrim(playback_path)<>'') has_pb,
  count(*) filter (where deleted_at is not null) deleted_rows
from public.myspace_files
where (lower(coalesce(ext,'')) in ('wav','wave') or lower(original_name) like '%.wav' or mime_type ilike '%wav%');
```
```sql
select
  count(*) filter (where name like '%.wav')      wav_objects,
  count(*) filter (where name like '%.play.mp3') mp3_objects
from storage.objects where bucket_id = 'myspace';
```
**판정:** after에서 `has_pb` 증가 = 변환 성공분 / `total`·`deleted_rows` 불변 = 원본 보존(삭제 0) / `mp3_objects` 증가 = 업로드분. WAV 원본 행수·`wav_objects` 불변이어야 정상.

## 6. write 직전 승인 게이트 (강제)

- `convert.sh sample`(계획만) → 5건 목록 보고 → **대표 승인** → `sample --write`
- 표본 변환 후 **중단**, 검수: 브라우저 재생 / 재생시간 정상 / 끊김·속도 이상 없음 / 파일크기 정상 / 다운로드=원본 WAV 유지 / 재생=MP3 우선 / 타 사용자 권한 변화 0
- 검수 통과 + **대표 승인** → `all --write` (소량 배치·멱등·연속실패 시 중단)
- ⛔ 금지: 원본 삭제, 전체 사용자 개방(`_wavPlaybackEnabled` 확대), 자동 변환 cron 생성, `dry_run` 개념 무시한 무검증 대량

## 7. 완료보고 항목 (전체 변환 후)

조사 WAV 실건수 / 대상·제외·성공·실패 / 생성 MP3 용량 / 갱신 playback_path 건수 / 원본 손실 0 확인 / 표본·배치 재생 검수 / 실패 목록·원인 / 재실행 안전성(멱등) / 자동 cron 미생성 확인.
