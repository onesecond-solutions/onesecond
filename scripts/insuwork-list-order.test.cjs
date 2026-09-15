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
      consultationDate, upsertCustomer, upsertConsultation, customerListOrder, consultationListOrder, dataReadyForSection: dataReadyForSection, periodRange, periodRows, periodFilter, periodBarHtml, setListPeriod, loadPeriodCare, allEvents, applicationCalendarEventsForYear, selectAllKakaoBulk, kakaoBulkState };
    window.OSInsuwork = {`), ctx);
  return { ...window.test, ctx, requests, events };
}

const test=require('node:test');
test('editing an older consultation stays in place; reload and same-day ties are stable',()=>{
 const h=harness(async()=>[]), rows=[{id:'new',consulted_at:'2026-09-15',created_at:'2026-09-15'},{id:'old',consulted_at:'2026-09-07',created_at:'2026-09-07'},{id:'tie',consulted_at:'2026-09-07',created_at:'2026-09-07'}];
 h.state.data.consultations=rows.slice();h.upsertConsultation({...rows[1],content:'수정',updated_at:'2026-09-15'});
 assert.equal(h.state.data.consultations[1].id,'old');
 assert.equal(h.state.data.consultations.slice().reverse().sort(h.consultationListOrder).map(x=>x.id).join(','),'new,old,tie');
 h.upsertConsultation({id:'latest',consulted_at:'2026-09-16'});assert.equal(h.state.data.consultations.slice().sort(h.consultationListOrder)[0].id,'latest');
});
test('customer edits preserve position and application date ordering ignores update time',()=>{
 const h=harness(async()=>[]), rows=[{id:'new',profile:{contract_date:'2026-09-15'}},{id:'old',profile:{contract_date:'2026-09-07'}}];h.state.data.customers=rows.slice();h.upsertCustomer({...rows[1],name:'수정',updated_at:'2026-09-20'});
 assert.equal(h.state.data.customers[1].id,'old');assert.equal(h.state.data.customers.slice().reverse().sort(h.customerListOrder)[0].id,'new');
});

test('Korean registration date survives UTC save response and repeated edits',()=>{
 const h=harness(async()=>[]);
 for(const value of ['2026-09-10T15:00:00Z','2026-09-10T15:00:00+00:00','2026-09-11T00:00:00+09:00','2026-09-11'])assert.equal(h.consultationDate({consulted_at:value}),'2026-09-11');
 let date='2026-09-11';for(let i=0;i<3;i++){date=h.consultationDate({consulted_at:new Date(date+'T00:00:00+09:00').toISOString()});assert.equal(date,'2026-09-11');}
 assert.equal(h.consultationDate({consulted_at:'2026-09-10T14:59:59Z'}),'2026-09-10');
});
