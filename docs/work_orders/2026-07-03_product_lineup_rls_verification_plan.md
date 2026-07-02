# 원수사 상품 라인업 — RLS 권한 검증 계획 (실데이터 전 증명)

> **작성:** 2026-07-03 · 총괄팀장(Code) · 대표 지시 확정
> **목표:** DDL 실행 후 **RLS 권한을 실데이터 적재 전에 먼저 증명**. 데이터 적재·화면·검색 수정은 계속 금지.
> **전제:** DDL = `db/migrations/2026-07-03_product_lineup_schema.sql`(main). 실행은 프로젝트 `pdnwgzneooyygfejrvbg` 확인 후.
> **검증 시드 원칙:** 모든 시드는 `__RLS_TEST_*__` 식별자 사용. **검증 완료 후 전량 삭제**(검증용 published 월도 유지 안 함).
> **service_role 원칙:** SQL Editor 관리자 권한 성공만으로 판정하지 않음. **실제 service_role 자격을 쓰는 임시 서버 스크립트/승인 API 경로**로 UPDATE 성공 확인. 자격정보는 출력·커밋·문서화 0(로컬 `.env.local`, gitignore).

---

## 검증 순서 (대표 지정 10단계)

| # | 단계 | 주체 | 기대 |
|---|---|---|---|
| 1 | 테스트 시드 생성 | service_role | published/draft 각 1월 + 회사·상품·스냅샷·테마 |
| 2 | 일반 authenticated published 조회 | 일반 | **성공(반환)** |
| 3 | 일반 authenticated draft 직접 조회 | 일반 | **0건** |
| 4 | 일반 authenticated draft RPC 조회 | 일반 | **0건** |
| 5 | 일반 authenticated UPDATE | 일반 | **거부/0행** |
| 6 | admin 브라우저 UPDATE | admin | **거부/0행** |
| 7 | 실제 service_role 경로 UPDATE | service_role(실자격) | **성공** |
| 8 | 상태 원복 | service_role | draft로 원복 |
| 9 | 테스트 시드 전량 삭제 | service_role | 삭제 |
| 10 | 삭제 후 식별자 잔존 확인 | any | **0건** |

---

## STEP 0. 대상 프로젝트 확인 (실행 첫 게이트)
```sql
select current_database();   -- pdnwgzneooyygfejrvbg(onesecond-v1-restore-0420) 확인. 불일치 시 즉시 중단.
```

## STEP 1. 테스트 시드 (service_role 실행)
```sql
-- 발행월: published 1 + draft 1 (식별자는 note)
insert into insurer_lineup_months(base_month, status, note) values
  ('2026-07-01','published','__RLS_TEST_MONTH__'),
  ('2026-08-01','draft','__RLS_TEST_MONTH__');

-- 회사(식별자 name)
insert into insurer_companies(name, section) values ('__RLS_TEST_CO__','life');

-- 상품
insert into insurer_products(company_id, name, product_group)
  select id, '__RLS_TEST_PROD__', '건강' from insurer_companies where name='__RLS_TEST_CO__';

-- 스냅샷: published월 + draft월 각 1
insert into insurer_product_snapshots(product_id, base_month, age, features)
  select p.id, '2026-07-01', '15~70', '__RLS_TEST_SNAP_PUB__' from insurer_products p where p.name='__RLS_TEST_PROD__';
insert into insurer_product_snapshots(product_id, base_month, age, features)
  select p.id, '2026-08-01', '15~70', '__RLS_TEST_SNAP_DRAFT__' from insurer_products p where p.name='__RLS_TEST_PROD__';

-- 테마 마스터(없으면) + 연결(published 스냅샷)
insert into insurer_themes(key,label) values ('건강체','건강체') on conflict do nothing;
insert into insurer_product_snapshot_themes(snapshot_id, theme_key)
  select s.id, '건강체' from insurer_product_snapshots s
   where s.features='__RLS_TEST_SNAP_PUB__';
```

## STEP 2~6. authenticated 검증 (일반 GA 계정 · admin 계정)
> 방법 A(권장): Chrome 검수팀이 **실 브라우저 계정**(일반 GA, admin)으로 supabase-js SELECT/UPDATE.
> 방법 B: SQL Editor에서 `set local role authenticated; set local request.jwt.claims to '{"sub":"<uid>","role":"authenticated"}';` 후 쿼리, `reset role;`.

```sql
-- (2) published 조회 성공
select count(*) from insurer_products_current;                     -- ≥1
select count(*) from insurer_products_for_month('2026-07-01');     -- ≥1
-- (3) draft 직접 조회 0건
select count(*) from insurer_product_snapshots where base_month='2026-08-01';  -- 0
select count(*) from insurer_lineup_months where status='draft';               -- 0
-- (4) draft RPC 조회 0건
select count(*) from insurer_products_for_month('2026-08-01');    -- 0
-- (5) 일반 UPDATE 거부
update insurer_lineup_months set status='published' where base_month='2026-08-01';  -- 0행/권한거부
-- (6) admin 브라우저 UPDATE 거부 (admin 계정으로 (5) 동일 실행) -- 0행/권한거부
```

## STEP 7. 실제 service_role 경로 UPDATE 성공 (SQL Editor 아님)
- 임시 스크립트(예: `scripts/_rls_test_service.mjs`, gitignore) — supabase-js `service_role` key로:
```
// 자격: process.env.SUPABASE_URL / process.env.SUPABASE_SERVICE_ROLE_KEY (.env.local, 커밋·출력 금지)
// update insurer_lineup_months set status='published' where base_month='2026-08-01' and note='__RLS_TEST_MONTH__'
// → 성공(1행) 확인만 출력. 키·URL 값은 출력 금지.
```
- 승인 API/Edge Function 경로가 이미 있으면 그 경로로 대체 가능.

## STEP 8. 상태 원복 (service_role)
```sql
update insurer_lineup_months set status='draft' where base_month='2026-08-01' and note='__RLS_TEST_MONTH__';
```

## STEP 9. 테스트 시드 전량 삭제 (service_role, 역순 FK)
```sql
delete from insurer_product_snapshot_themes
  where snapshot_id in (select id from insurer_product_snapshots
    where features like '__RLS_TEST_SNAP_%');
delete from insurer_product_snapshots where features like '__RLS_TEST_SNAP_%';
delete from insurer_products  where name='__RLS_TEST_PROD__';
delete from insurer_companies where name='__RLS_TEST_CO__';
delete from insurer_lineup_months where note='__RLS_TEST_MONTH__';
-- 테마 마스터 '건강체'는 통제 어휘라 유지(테스트 전용 아님). 필요 시 별도 판단.
```

## STEP 10. 삭제 후 잔존 0건 확인
```sql
select
  (select count(*) from insurer_companies             where name like '\_\_RLS\_TEST%') as co,
  (select count(*) from insurer_products              where name like '\_\_RLS\_TEST%') as prod,
  (select count(*) from insurer_product_snapshots     where features like '\_\_RLS\_TEST%') as snap,
  (select count(*) from insurer_lineup_months         where note like '\_\_RLS\_TEST%') as mon;
-- 전부 0 이어야 완료.
```

---

## 결과 보고 양식
| # | 단계 | 결과(성공/거부/0건) | 비고 |
| 1~10 | | | |
+ 시드 전량 삭제·잔존 0 확인.

## 금지 (이번 단계)
- 실데이터 20사 적재 X · app.html 화면 연결 X · 통합검색 수정 X.
- service_role 자격(URL/key) 출력·커밋·문서화 X.
- 검증용 published 월 유지 X (STEP 9에서 삭제).
