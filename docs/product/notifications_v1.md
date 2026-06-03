# 인앱 알림 / 신규글 읽음 추적 — 설계·진행 (2026-06-04)

> 목표: 사이트 전역 신규글 → 헤더 알람벨 숫자 + 영역별 신규 표시 + 사용자 인지 + (최종) 모바일 푸시.
> 대상 영역: **현장의 소리**(단체방·보험Q&A·스마트) + **보험사 자료실**(자료·보험Q&A). **함께해요·보험이슈 제외**(팀장님 지시 2026-06-04).

---

## Phase 1 — 신규글 읽음 추적 (✅ 완료·라이브, PR #394)

- 헤더 알람벨: 신규글 수 **숫자+빨간 점**, 클릭 → 영역별 신규 드롭다운 → 이동+읽음.
- 사이드바 nav 신규 배지(N): 현장의 소리 / 보험사 자료실.
- 영역 진입 시 읽음 처리(`showView` 훅 `_notifOnView`), 60초 폴링.
- 기준 = **localStorage** `os_lastread_<userId>` (영역별 마지막 읽은 시각). **DB 불필요·즉시 동작·모바일 웹 동일**.
- 첫 진입 = 지금부터 기준(과거 글 폭탄 방지). 전부 try/catch.
- 코드: `app.html` 내 `NOTIF_FEEDS` / `notifRefresh` / `notifBellToggle` / `_notifOnView` 등.

### Phase 1의 한계 (→ Phase 2에서 해소)
- **기기별**: localStorage라 PC/모바일 따로 카운트(동기화 X).
- **"읽음 N개"** 정밀 집계 없음(현재 = 안읽음=신규 N만). 전체 읽음/안읽음 분리는 DB 필요.

---

## Phase 2 — 크로스기기 동기화 + 실시간 (서버 조작 필요)

### 2-1. DB 테이블 (신버전 SQL 에디터)
```sql
create table if not exists public.board_reads (
  user_id text not null,
  board_key text not null,
  last_read_at timestamptz not null default now(),
  primary key (user_id, board_key)
);
alter table public.board_reads enable row level security;
drop policy if exists board_reads_own_select on public.board_reads;
create policy board_reads_own_select on public.board_reads for select to authenticated using ((auth.uid())::text = user_id);
drop policy if exists board_reads_own_upsert on public.board_reads;
create policy board_reads_own_upsert on public.board_reads for insert to authenticated with check ((auth.uid())::text = user_id);
drop policy if exists board_reads_own_update on public.board_reads;
create policy board_reads_own_update on public.board_reads for update to authenticated using ((auth.uid())::text = user_id) with check ((auth.uid())::text = user_id);
```

### 2-2. 코드 변경 (app.html)
- `_notifReads/_notifSaveReads`를 localStorage → `board_reads` upsert/select로 교체(읽기 시 fetch, 읽음 처리 시 PATCH/POST `Prefer: resolution=merge-duplicates`). 테이블 없으면 localStorage 폴백 유지(점진 전환).
- 읽음 처리 = `POST /rest/v1/board_reads` (upsert) `{user_id, board_key, last_read_at:now}`.

### 2-3. 실시간 (선택, Supabase Realtime)
- supabase-js 또는 Realtime 웹소켓 구독 → `posts`/`team_notices` INSERT 이벤트 시 `notifRefresh()` 즉시 호출.
- 실패 시 60초 폴링 폴백 유지(현재 동작).
- Realtime publication 활성 필요: `alter publication supabase_realtime add table public.posts, public.team_notices;`

---

## Phase 3 — 웹 푸시 (앱 닫혀도 알림) — 대시보드 조작 필요, 라이브 강행 금지

> ⚠️ 서비스워커는 사이트 전체 fetch를 가로채므로, **검증 안 된 채 라이브 배포 금지**. 아래 순서로 검증 후 적용.

### 3-1. VAPID 키 발급 (1회)
- `npx web-push generate-vapid-keys` → publicKey/privateKey. privateKey는 Edge Function secret(`VAPID_PRIVATE_KEY`), publicKey는 클라이언트에.

### 3-2. DB
```sql
create table if not exists public.push_subscriptions (
  id bigserial primary key,
  user_id text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists push_sub_own on public.push_subscriptions;
create policy push_sub_own on public.push_subscriptions for all to authenticated using ((auth.uid())::text = user_id) with check ((auth.uid())::text = user_id);
```

### 3-3. 서비스워커 (`/sw-push.js`, 신규 파일)
```js
self.addEventListener('push', function(e){
  var d={}; try{ d=e.data.json(); }catch(_){}
  e.waitUntil(self.registration.showNotification(d.title||'원세컨드 새 글', {
    body:d.body||'', icon:'/assets/icon-192.png', data:{url:d.url||'/app.html'}
  }));
});
self.addEventListener('notificationclick', function(e){ e.notification.close(); e.waitUntil(clients.openWindow(e.notification.data.url||'/app.html')); });
```
(※ 캐싱 fetch 가로채기 코드는 넣지 말 것 — push만.)

### 3-4. 구독 등록 (app.html, 알림 허용 버튼)
```js
async function notifEnablePush(){
  if(!('serviceWorker' in navigator)||!('PushManager' in window)){ alert('이 브라우저는 푸시를 지원하지 않습니다.'); return; }
  var reg=await navigator.serviceWorker.register('/sw-push.js');
  var perm=await Notification.requestPermission(); if(perm!=='granted') return;
  var sub=await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey: <VAPID_PUBLIC_KEY를 Uint8Array로>});
  var j=sub.toJSON();
  await window.db.fetch('/rest/v1/push_subscriptions',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'resolution=merge-duplicates'},body:JSON.stringify({user_id:window.AppState.userId, endpoint:j.endpoint, p256dh:j.keys.p256dh, auth:j.keys.auth})});
}
```

### 3-5. 발송 Edge Function (`send-push`) + 트리거
- 새 글(posts/team_notices INSERT) 시 → DB 트리거가 `send-push` 호출(pg_net) 또는 cron이 주기 폴링 → 대상 사용자 구독으로 web-push 발송.
- web-push 라이브러리(Deno) + VAPID로 각 endpoint에 POST.

### 3-6. PWA (선택)
- `manifest.json` + `<link rel="manifest">` (홈화면 추가·푸시 신뢰성↑).

---

## 진행 순서 권장
1. (완료) Phase 1 라이브 검수.
2. Phase 2-1 SQL 실행 → 2-2 코드 전환(크로스기기). → 검수.
3. Phase 2-3 실시간(선택).
4. Phase 3 푸시: VAPID 발급 → SQL → 서비스워커/구독/Edge → **스테이징/소수 검증 후** 라이브.
