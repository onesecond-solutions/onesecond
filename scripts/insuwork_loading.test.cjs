// Network-free regression checks for the production loader. No credentials or live DB.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../js/insuwork.js'), 'utf8');
function harness(handler) {
  const requests = [], events = [];
  const storage = { getItem: () => null, setItem() {}, removeItem() {} };
  const document = { documentElement: { getAttribute: () => null }, addEventListener() {},
    dispatchEvent: e => events.push(e.type), getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] };
  const window = { AppState: { userId: 'fixture-owner' }, addEventListener() {}, clearTimeout() {}, setTimeout() {},
    db: { getToken: () => 'fixture-not-a-token', fetch: async (url, options = {}) => {
      const request = { url, method: options.method || 'GET', options }; requests.push(request);
      const body = await handler(request);
      return { ok: true, json: async () => body, text: async () => JSON.stringify(body) };
    } } };
  const ctx = { window, document, localStorage: storage, sessionStorage: storage, console, URLSearchParams,
    location: { hostname: 'localhost', pathname: '/insuwork/', search: '' }, CustomEvent: class { constructor(type) { this.type = type; } } };
  vm.createContext(ctx);
  vm.runInContext(source.replace('  window.OSInsuwork = {', `
    renderContent = function () {}; renderShell = function () {};
    window.test = { state: state, loadData: loadData, loadHomeDate: loadHomeDate,
      syncCareTasksForAll: syncCareTasksForAll, careTaskTargets: careTaskTargets,
      dataReadyForSection: dataReadyForSection };
    window.OSInsuwork = {`), ctx);
  return { ...window.test, ctx, requests, events };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  const h = harness(async ({url}) => url.includes('insuwork_tasks?') ? [{id:'new',task_date:'2026-09-01',title:'new'}] : []);
  h.state.fullLoaded = h.state.coreLoaded = true;
  h.state.loadedFor = 'fixture-owner'; h.state.status = 'ready'; h.state.homeDate = '2026-09-01';
  h.state.data.items = [{id:'keep',item_type:'note',body:'preserved'}];
  h.state.data.events = [{id:'old',task_date:'2026-09-01'}, {id:'other',task_date:'2026-08-31'}];
  await h.loadHomeDate();
  assert.equal(h.requests.length, 1);
  assert.match(h.requests[0].url, /owner_id=eq.fixture-owner/);
  assert.equal(h.state.fullLoaded, true); assert.equal(h.state.coreLoaded, true);
  assert.equal(h.state.data.items[0].body, 'preserved');
  assert.deepEqual(Array.from(h.state.data.events, e => e.id).sort(), ['new','other']);
  console.log('PASS date-only read retains complete cache and other dates');

  const pending = [];
  const race = harness(() => new Promise(resolve => pending.push(resolve)));
  race.state.homeDate = '2026-08-31'; const first = race.loadHomeDate(); await tick();
  race.state.homeDate = '2026-09-01'; const second = race.loadHomeDate(); await tick();
  pending[1]([{id:'latest',task_date:'2026-09-01'}]); await second;
  pending[0]([{id:'stale',task_date:'2026-08-31'}]); await first;
  assert.deepEqual(Array.from(race.state.data.events, e=>e.id), ['latest']);
  console.log('PASS out-of-order date responses cannot overwrite latest selection');

  const core = harness(async () => []); core.state.section = 'calendar';
  await core.loadData(true);
  assert.equal(core.state.coreLoaded, true); assert.equal(core.state.fullLoaded, false);
  assert.equal(core.dataReadyForSection(), true);
  assert.ok(core.requests.filter(r=>r.url.includes('insuwork_items?')).every(r=>r.url.includes('limit=30')));
  core.state.section = 'assets'; assert.equal(core.dataReadyForSection(), false);
  await core.loadData(true);
  assert.equal(core.state.fullLoaded, true);
  assert.ok(core.requests.some(r=>r.url.includes('insuwork_items?') && r.url.includes('limit=2000')));
  assert.ok(core.events.includes('insuwork:data-ready'));
  console.log('PASS calendar skips full documents; assets loads them when needed');

  const failed = harness(async ({url}) => { if(url.includes('insuwork_tasks?')) throw Error('offline'); return []; });
  await failed.loadData(true);
  assert.equal(failed.state.coreLoaded, false); assert.equal(failed.state.fullLoaded, false);
  assert.ok(failed.events.includes('insuwork:data-ready'));
  console.log('PASS failed core reads are not marked complete; completion event still emitted');

  let careRows = [];
  const care = harness(async ({url,method}) => {
    assert.equal(method, 'GET', 'existing care rows must not be rewritten');
    const q = new URL(url, 'https://fixture.invalid').searchParams;
    return careRows.slice(Number(q.get('offset')), Number(q.get('offset')) + Number(q.get('limit')));
  });
  const customer = {id:'c1',name:'Fixture',status:'청약완료',profile:{contract_date:'2026-01-01'}};
  care.state.data.customers = [customer];
  careRows = Array.from({length:1000}, (_,i)=>({id:'unused-'+i,customer_id:'other',legacy_id:'unused-'+i}));
  careRows.push(...care.careTaskTargets(customer, '2026-01-01').map((t,i)=>({id:'care-'+i,customer_id:'c1',legacy_id:t.legacyId,task_date:t.date,description:t.description})));
  await care.syncCareTasksForAll();
  assert.equal(care.requests.length, 2); assert.ok(care.state.careSyncKey);
  await care.syncCareTasksForAll(); assert.equal(care.requests.length, 2);
  console.log('PASS paginated care snapshot prevents duplicate writes and repeat sync');

  let existing = [];
  const writeCare = harness(async ({url,method,options}) => method === 'GET' ? existing : ({id:'created',...JSON.parse(options.body)}));
  writeCare.state.data.customers = [customer];
  const targets = writeCare.careTaskTargets(customer, '2026-01-01');
  existing = targets.slice(1).map((t,i)=>({id:'row-'+i,customer_id:'c1',legacy_id:t.legacyId,task_date:t.date,description:t.description}));
  existing[0].description = 'outdated';
  await writeCare.syncCareTasksForAll();
  assert.equal(writeCare.requests.filter(r=>r.method==='POST').length,1);
  assert.equal(writeCare.requests.filter(r=>r.method==='PATCH').length,1);
  console.log('PASS missing/changed care rows retain existing create/update behavior (mock only)');
})().catch(error => { console.error(error); process.exitCode = 1; });
