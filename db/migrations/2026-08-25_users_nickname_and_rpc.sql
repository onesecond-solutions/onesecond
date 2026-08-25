-- 🟠 실제 DDL + RPC — public.users에 닉네임 컬럼 추가 + 공개자료실용 닉네임 조회 RPC
-- ═══════════════════════════════════════════════════════════════════════════
-- 배경: 보험워크 "공개자료실"(js/insuwork.js, 2026-08-25 PR #1866)이 작성자를 전부 "익명"으로
--   고정 표시 중이다. 대표 확정(2026-08-25): 계정정보 수정 화면에 닉네임을 선택 입력으로
--   추가하고, 설정하면 공개자료실에 닉네임으로 표시, 비워두면 계속 "익명" 표시. 중복 닉네임은
--   허용(고유 제약 없음, 검증도 없음) — 대표 확정, 구조를 단순하게 유지하기 위함.
--
-- 본 마이그레이션이 만드는 것:
--   1. public.users.nickname text — nullable, 기본값 없음, 고유 제약 없음.
--   2. public.get_nicknames(uuid[]) — 주어진 user id 목록에 대해 {id, nickname}만 반환하는
--      SECURITY DEFINER RPC. public.users 테이블 전체 SELECT 권한을 새로 여는 대신, 이 함수로만
--      최소 노출(다른 계정의 email/phone/company 등은 절대 반환하지 않음). 공개자료실이 목록에
--      표시된 항목들의 owner_id 집합을 모아 이 RPC 한 번으로 닉네임을 채운다
--      (js/insuwork.js loadPublicLibrary(), 이번 마이그레이션과 별도 앱 코드 PR로 연결 예정).
--
-- ⚠️ 대상: onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
-- ═══════════════════════════════════════════════════════════════════════════

begin;

alter table public.users add column if not exists nickname text;

create or replace function public.get_nicknames(user_ids uuid[])
returns table(id uuid, nickname text)
language sql
security definer
set search_path = public
as $$
  select u.id, u.nickname from public.users u where u.id = any(user_ids);
$$;
revoke all on function public.get_nicknames(uuid[]) from public;
grant execute on function public.get_nicknames(uuid[]) to authenticated;

commit;

-- DOWN / ROLLBACK (manual, reviewed):
--   DROP FUNCTION public.get_nicknames(uuid[]);
--   ALTER TABLE public.users DROP COLUMN nickname;
