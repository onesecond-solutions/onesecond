-- ============================================================
-- 마이 스페이스 '자료함' v1 (P1) — DB 제안 SQL  ※ 제안/미실행 ※
-- ------------------------------------------------------------
-- 신버전 pdnwgzneooyygfejrvbg (onesecond-v1-restore-0420) 전용.
-- 본 파일은 "제안"이다. Code 실행 안 함. 대표님이 결재 후 Dashboard에서 직접 실행.
-- 순서: STEP 0(실측 SELECT, 읽기) → 결과 보고 → 결재 → STEP 1~3(생성) → STEP 4(RLS, 검수 후).
-- 명칭: '자료함'(구 '자료' 칩). '자료실' 금지(좌측 보험사 자료실 충돌).
-- 비끼워넣음: posts·library 무관, 독립 개인 레이어.
-- ============================================================


-- ============================================================
-- 🟢 STEP 0. 실측 SELECT (읽기 전용 — 제안 적용 전 먼저 실행, 결과 보고)
-- ============================================================

-- 0-1. 신버전 확인
select current_database();

-- 0-2. myspace_* 테이블이 이미 있는지 (없어야 정상)
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('myspace_folders','myspace_files','myspace_usage')
order by table_name;

-- 0-3. Storage 버킷 'myspace' 존재 여부 (없어야 정상)
select id, name, public, created_at
from storage.buckets
where id = 'myspace';

-- 0-4. (참고) 기존 library 테이블 컬럼 — 자료함과 별개임을 확인용
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'library'
order by ordinal_position;


-- ============================================================
-- 🟠 STEP 1~4. 아래는 결재 후 실행 (지금 실행 금지)
-- STEP 0 결과 = 테이블·버킷 모두 '없음' 확인된 뒤에만 진행.
-- ============================================================

-- ---- 🟠 STEP 1. myspace_folders (폴더 트리, 자기참조) ----
create table if not exists public.myspace_folders (
  id          uuid primary key default gen_random_uuid(),
  owner_id    text not null,   -- = window.AppState.userId (auth.uid()::text). library/scripts 정합
  parent_id   uuid references public.myspace_folders(id) on delete cascade,  -- null = 루트
  name        text not null,
  path        text,
  depth       int  not null default 0,
  sort_order  int  not null default 0,
  is_pinned   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index if not exists idx_myspace_folders_owner  on public.myspace_folders(owner_id);
create index if not exists idx_myspace_folders_parent on public.myspace_folders(parent_id);

-- ---- 🟠 STEP 2. myspace_files (파일 메타) ----
create table if not exists public.myspace_files (
  id             uuid primary key default gen_random_uuid(),
  owner_id       text not null,   -- = auth.uid()::text. library/scripts 정합
  folder_id      uuid references public.myspace_folders(id) on delete set null,  -- null = 루트
  original_name  text not null,            -- 원본 파일명만(PC 절대경로 저장 금지)
  storage_path   text not null,            -- myspace/{owner_id}/{folder_id}/{file_id}_{sanitized}
  mime_type      text,
  ext            text,
  file_size      bigint,
  thumbnail_path text,
  search_text    text,                     -- 비워둠: 검색/AI 인덱싱 확장 여지
  tags           text[] not null default '{}',
  source         text,                     -- 'drag' / 'picker' 등
  status         text not null default 'pending',  -- pending/indexed/failed (파이프라인 미구현, 골조만)
  is_pinned      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index if not exists idx_myspace_files_owner  on public.myspace_files(owner_id);
create index if not exists idx_myspace_files_folder on public.myspace_files(folder_id);

-- ---- 🟠 STEP 3. myspace_usage (사용량 골조, 숫자 미확정) ----
create table if not exists public.myspace_usage (
  owner_id     text primary key,   -- = auth.uid()::text. library/scripts 정합
  quota_limit  bigint,                     -- NULL = 미확정 (요금제 후순위)
  used_bytes   bigint not null default 0,
  updated_at   timestamptz not null default now()
);

-- ---- 🟠 STEP 3b. Storage 버킷 'myspace' (private) ----
-- Dashboard > Storage > New bucket(private)로 만들어도 되고, 아래 SQL로도 가능.
insert into storage.buckets (id, name, public)
values ('myspace','myspace', false)
on conflict (id) do nothing;


-- ============================================================
-- 🟠 STEP 4. RLS / 정책 — ※ 검수 후 적용 ※ (개인 격리: (auth.uid())::text = owner_id)
-- 위 STEP 1~3 생성·검수 통과 후에만 실행. 적용 전엔 주석 유지 권장.
-- 패턴 출처: scripts_delete_own_rls.sql ( (auth.uid())::text = owner_id ).
-- ============================================================

-- alter table public.myspace_folders enable row level security;
-- alter table public.myspace_files   enable row level security;
-- alter table public.myspace_usage   enable row level security;

-- create policy myspace_folders_own on public.myspace_folders
--   for all using ((auth.uid())::text = owner_id) with check ((auth.uid())::text = owner_id);
-- create policy myspace_files_own on public.myspace_files
--   for all using ((auth.uid())::text = owner_id) with check ((auth.uid())::text = owner_id);
-- create policy myspace_usage_own on public.myspace_usage
--   for all using ((auth.uid())::text = owner_id) with check ((auth.uid())::text = owner_id);

-- Storage objects 격리 (경로 1번째 세그먼트 = owner_id):
-- ※ 주의: storage.objects.name = 버킷 '내부' 경로라 버킷 접두('myspace/')는 빠진다.
--   즉 메타 컬럼 storage_path는 'myspace/{owner_id}/...'(표시용 풀경로)지만,
--   실제 업로드 object name은 '{owner_id}/{folder_id}/{file_id}_{name}'여야 아래 정책의
--   (storage.foldername(name))[1] = owner_id 가 성립한다. 프론트 업로드 시 이 규약 일치 필수.
-- create policy myspace_obj_own on storage.objects
--   for all
--   using (bucket_id = 'myspace' and (storage.foldername(name))[1] = auth.uid()::text)
--   with check (bucket_id = 'myspace' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- (확인) 적용 후 검증
-- select table_name from information_schema.tables
--   where table_schema='public' and table_name like 'myspace_%';
-- select id, public from storage.buckets where id='myspace';
-- ============================================================
