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
    renderContent = function () {}; renderShell = function () {}; canEditCoverageTemplate = function () { return true; }; canUseKakaoPilot = function () { return true; };
    window.test = { state: state, loadData: loadData, loadHomeDate: loadHomeDate,
      syncCareTasksForAll: syncCareTasksForAll, careTaskTargets: careTaskTargets,
      dataReadyForSection: dataReadyForSection, periodRange, periodRows, periodFilter, periodBarHtml, setListPeriod, loadPeriodCare, allEvents, applicationCalendarEventsForYear, selectAllKakaoBulk, kakaoBulkState };
    window.OSInsuwork = {`), ctx);
  return { ...window.test, ctx, requests, events };
}
const test = require('node:test');
test('application appears once, legacy annual tasks hidden, care/user events retained', () => {
  const h = harness(async () => []), c = {id:'c',name:'고객',profile:{contract_dates:['2020-01-01','2021-01-01']}};
  h.state.data.customers=[c];
  assert.equal(h.applicationCalendarEventsForYear(2020).length,1);
  assert.equal(h.applicationCalendarEventsForYear(2021).length,0);
  assert.equal(h.careTaskTargets(c,'2020-01-01').length,4);
  h.state.data.events=[{id:'old',legacy_source:'care_auto',legacy_id:'c:anniversary:2026'}, {id:'care',legacy_source:'care_auto',legacy_id:'c:365'}, {id:'manual',title:'청약 기념일',legacy_id:'c:anniversary:2026'}];
  const ids=h.allEvents().map(x=>x.id);
  assert.ok(!ids.includes('old')); assert.ok(ids.includes('care')); assert.ok(ids.includes('manual'));
});
test('inclusive date ranges, consultation registration only, full result selection and reset', () => {
  const h=harness(async()=>[]), f=h.periodFilter('consultation');
  f.preset='custom';f.start='2026-01-01';f.end='2026-01-31';
  const rows=Array.from({length:85},(_,i)=>({id:String(i),consulted_at:'2026-01-31'}));
  assert.equal(h.periodRows('consultation',rows.concat([{id:'out',consulted_at:'2026-02-01'}])).length,85);
  h.selectAllKakaoBulk('consultation');assert.equal(h.kakaoBulkState('consultation').length,85);
  h.state.consultNameQuery='다른 이름';h.periodRows('consultation',rows);assert.equal(h.kakaoBulkState('consultation').length,0);
  assert.ok(!h.periodBarHtml('consultation',85).includes('케어 예정일'));
  f.start='2026-02-01';assert.equal(h.periodRows('consultation',rows).length,0);
});
test('care pagination, completed/legacy exclusions and customer deduplication', async () => {
  const events=Array.from({length:501},(_,i)=>({id:String(i),customer_id:'c',task_date:'2026-09-15',legacy_source:'care_auto',legacy_id:'c:31'}));
  events.push({id:'done',customer_id:'d',task_date:'2026-09-15',completed_at:'2026-09-15'});
  events.push({id:'annual',customer_id:'a',task_date:'2026-09-15',legacy_source:'care_auto',legacy_id:'a:anniversary:2026'});
  const h=harness(async ({url})=>{const q=new URL(url,'https://fixture.invalid').searchParams;return events.slice(+q.get('offset'),+q.get('offset')+500);});
  await h.loadPeriodCare();h.periodFilter('customer').basis='care';
  assert.equal(h.requests.length,2);
  assert.equal(h.periodRows('customer',[{id:'c'},{id:'d'},{id:'a'}]).length,1);
});
test('failed care read cannot select stale recipients', async () => {
  const h=harness(async()=>{throw Error('offline');});await h.loadPeriodCare();h.periodFilter('customer').basis='care';
  assert.equal(h.periodRows('customer',[{id:'c'}]).length,0);
});
