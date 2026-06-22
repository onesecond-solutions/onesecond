-- =====================================================================
-- 검증: entry_comments / entry_likes SELECT RLS = 원본 권한 상속 확인
-- 날짜: 2026-06-22
-- 대상 DB: 신버전 onesecond-v1-restore-0420 (pdnwgzneooyygfejrvbg)
-- 방식: BEGIN ... ROLLBACK. 임시 데이터는 전부 트랜잭션 안에서만 생성·폐기.
--       운영 영속 데이터 변경 0 (커밋 없음).
-- 출력: 마지막 SELECT 한 표 = 항목별 PASS / FAIL.
-- 주의: UUID는 각각 한 줄, 줄바꿈/공백 들어가지 않게 작성됨.
-- =====================================================================

begin;

-- ── 임시 테이블 ──────────────────────────────────────────────────────
create temp table _scn(scn text, st text, sid text) on commit drop;
create temp table _exp(who text, scn text, exp int) on commit drop;
create temp table _res(kind text, who text, scn text, cnt int) on commit drop;
grant select on _scn to authenticated;
grant insert, select on _res to authenticated;

-- ── 픽스처 시드 (postgres 권한 = RLS 우회, 전부 ROLLBACK 됨) ─────────────
-- 개인 메모(library): 소유자 A = 임태성
insert into public.library(owner_id, title, memo_text, scope)
values(
 '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd',
 'RLSTEST_MEMO', 'm', 'personal');

-- 팀 공지: team_internal (팀 T / 지점 B)
insert into public.team_notices
 (id, team_id, branch_id, author_id, scope, notice_type, title, content)
values(
 'aaaaaaaa-0000-0000-0000-0000000000a1',
 '5fccd362-9ee3-4165-8960-7cb0b7ec72fa',
 '306edf6a-15db-4b69-a6b9-dae74b08cd33',
 '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd',
 'team_internal', 'operation', 'T', 't');

-- 지점 공지(같은 지점): branch_internal (지점 B)
insert into public.team_notices
 (id, team_id, branch_id, author_id, scope, notice_type, title, content)
values(
 'aaaaaaaa-0000-0000-0000-0000000000a2',
 '99999999-9999-9999-9999-999999999999',
 '306edf6a-15db-4b69-a6b9-dae74b08cd33',
 '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd',
 'branch_internal', 'operation', 'NBsame', 't');

-- 다른 팀/다른 지점 공지: foreign
insert into public.team_notices
 (id, team_id, branch_id, author_id, scope, notice_type, title, content)
values(
 'aaaaaaaa-0000-0000-0000-0000000000a3',
 '99999999-9999-9999-9999-999999999999',
 '88888888-8888-8888-8888-888888888888',
 '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd',
 'team_internal', 'operation', 'NF', 't');

-- 시나리오 5종: 개인메모 / 팀 / 지점(같음) / 다른팀·지점 / unknown
insert into _scn
 select '1_memo', 'memo', id::text
 from public.library where title = 'RLSTEST_MEMO';
insert into _scn values('2_team', 'team_notice',
 'aaaaaaaa-0000-0000-0000-0000000000a1');
insert into _scn values('3_branchSame', 'team_notice',
 'aaaaaaaa-0000-0000-0000-0000000000a2');
insert into _scn values('4_foreign', 'team_notice',
 'aaaaaaaa-0000-0000-0000-0000000000a3');
insert into _scn values('5_unknown', 'nonexistent',
 'aaaaaaaa-0000-0000-0000-0000000000a9');

-- 각 시나리오에 댓글 1건 + 좋아요 1건 (작성자 / 좋아요 = A)
insert into public.entry_comments
 (source_type, source_id, content, author_id, author_name)
 select st, sid, 'c',
 '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd', 't'
 from _scn;
insert into public.entry_likes(source_type, source_id, user_id)
 select st, sid,
 '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd'
 from _scn;

-- ── 기대값 (comments = likes 동일) ───────────────────────────────────
-- A_owner   : memo1 team1 branch1 foreign0 unknown0
-- B_sameteam: memo0 team1 branch1 foreign0 unknown0
-- outsider  : 전부 0
-- admin     : 전부 1 (is_admin 우회)
insert into _exp values
 ('A_owner','1_memo',1),('A_owner','2_team',1),('A_owner','3_branchSame',1),('A_owner','4_foreign',0),('A_owner','5_unknown',0),
 ('B_sameteam','1_memo',0),('B_sameteam','2_team',1),('B_sameteam','3_branchSame',1),('B_sameteam','4_foreign',0),('B_sameteam','5_unknown',0),
 ('outsider','1_memo',0),('outsider','2_team',0),('outsider','3_branchSame',0),('outsider','4_foreign',0),('outsider','5_unknown',0),
 ('admin','1_memo',1),('admin','2_team',1),('admin','3_branchSame',1),('admin','4_foreign',1),('admin','5_unknown',1);

-- ── 사용자 시점별 RLS 가시성 측정 (comments + likes) ──────────────────
-- A_owner (소유자 / 팀 T / 지점 B)
select set_config('request.jwt.claims',
 '{"sub":"98c5f4f9-10c1-4ee1-a656-5c2ca63239fd","role":"authenticated"}',
 true);
set local role authenticated;
insert into _res
 select 'comment', 'A_owner', s.scn, count(c.*)
 from _scn s left join public.entry_comments c
 on c.source_type = s.st and c.source_id = s.sid
 group by s.scn;
insert into _res
 select 'like', 'A_owner', s.scn, count(l.*)
 from _scn s left join public.entry_likes l
 on l.source_type = s.st and l.source_id = s.sid
 group by s.scn;
reset role;

-- B_sameteam (같은 팀/지점, 타인 = ga_member)
select set_config('request.jwt.claims',
 '{"sub":"7c49f633-4695-4a22-bb77-4388cab2e517","role":"authenticated"}',
 true);
set local role authenticated;
insert into _res
 select 'comment', 'B_sameteam', s.scn, count(c.*)
 from _scn s left join public.entry_comments c
 on c.source_type = s.st and c.source_id = s.sid
 group by s.scn;
insert into _res
 select 'like', 'B_sameteam', s.scn, count(l.*)
 from _scn s left join public.entry_likes l
 on l.source_type = s.st and l.source_id = s.sid
 group by s.scn;
reset role;

-- outsider (미소속 = 존재하지 않는 sub)
select set_config('request.jwt.claims',
 '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}',
 true);
set local role authenticated;
insert into _res
 select 'comment', 'outsider', s.scn, count(c.*)
 from _scn s left join public.entry_comments c
 on c.source_type = s.st and c.source_id = s.sid
 group by s.scn;
insert into _res
 select 'like', 'outsider', s.scn, count(l.*)
 from _scn s left join public.entry_likes l
 on l.source_type = s.st and l.source_id = s.sid
 group by s.scn;
reset role;

-- admin
select set_config('request.jwt.claims',
 (select json_build_object('sub', id, 'role', 'authenticated')::text
  from public.users where role = 'admin' limit 1),
 true);
set local role authenticated;
insert into _res
 select 'comment', 'admin', s.scn, count(c.*)
 from _scn s left join public.entry_comments c
 on c.source_type = s.st and c.source_id = s.sid
 group by s.scn;
insert into _res
 select 'like', 'admin', s.scn, count(l.*)
 from _scn s left join public.entry_likes l
 on l.source_type = s.st and l.source_id = s.sid
 group by s.scn;
reset role;

-- ── 최종 출력: 항목별 PASS / FAIL 한 표 ───────────────────────────────
select
 r.kind,
 r.who,
 r.scn,
 e.exp    as expected,
 r.cnt    as actual,
 case when r.cnt = e.exp then 'PASS' else 'FAIL' end as result
from _res r
join _exp e on e.who = r.who and e.scn = r.scn
order by r.kind, r.who, r.scn;

-- ★ 절대 COMMIT 하지 말 것. 전부 폐기.
rollback;
