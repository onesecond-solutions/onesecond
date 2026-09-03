const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/insuwork.js', 'utf8');
const logic = source.slice(source.indexOf('  var adminUsersRefreshTimer'), source.indexOf('  function adminUsersHtml()'));
function fixture() {
  let id = 0, user = 'admin', auth = true, resolveRequest, renders = 0;
  const intervals = new Map(), timers = new Map(), listeners = {}, calls = [];
  const state = { section: 'admin-users', adminUsers: [{ id: 'old' }], adminUserQuery: '검색', adminUserStatus: 'active' };
  const document = { hidden: false, activeElement: null, addEventListener: (name, fn) => { listeners[name] = fn; }, getElementById: name => name === 'v-insuwork' ? { classList: { contains: () => true } } : null };
  const window = { setTimeout: fn => { timers.set(++id, fn); return id; }, clearTimeout: id => timers.delete(id), setInterval: (fn, ms) => { assert.equal(ms, 30000); intervals.set(++id, fn); return id; }, clearInterval: id => intervals.delete(id), addEventListener: (name, fn) => { listeners[name] = fn; }, db: { fetch: (url, options) => { calls.push({ url, options }); return new Promise(resolve => { resolveRequest = resolve; }); } } };
  const context = vm.createContext({ state, document, window, currentUserId: () => user, authenticated: () => auth, canSeeAdminUsers: () => auth, renderContent: () => { renders++; } });
  vm.runInContext(logic, context);
  return { context, state, document, calls, listeners, intervals, timers, renderCount: () => renders, logout: () => { user = 'other'; auth = false; }, resolve: rows => resolveRequest({ ok: true, json: async () => rows }), fail: () => resolveRequest({ ok: false, status: 503 }), tickEntry: () => { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
test('entry fetches once; polling deduplicates requests; hidden/leave stop; return fetches', async () => {
  const f = fixture(); f.context.syncAdminUsersRefresh(); f.context.syncAdminUsersRefresh(); f.tickEntry();
  assert.equal(f.calls.length, 1); assert.equal(f.intervals.size, 1);
  [...f.intervals.values()][0](); assert.equal(f.calls.length, 1);
  f.resolve([{ id: 'new' }]); await settle();
  assert.equal(f.state.adminUsers[0].id, 'new'); assert.equal(f.state.adminUserQuery, '검색'); assert.equal(f.state.adminUserStatus, 'active'); assert.equal(f.calls[0].options.cache, 'no-store');
  [...f.intervals.values()][0](); assert.equal(f.calls.length, 2); f.resolve([]); await settle();
  f.document.hidden = true; f.listeners.visibilitychange(); assert.equal(f.intervals.size, 0);
  f.document.hidden = false; f.listeners.visibilitychange(); f.tickEntry(); assert.equal(f.calls.length, 3); f.resolve([]); await settle();
  f.state.section = 'home'; f.context.syncAdminUsersRefresh(); assert.equal(f.intervals.size, 0);
  f.state.section = 'admin-users'; f.context.syncAdminUsersRefresh(); f.tickEntry(); assert.equal(f.calls.length, 4);
});
test('refresh failure preserves rows and next request recovers', async () => {
  const f = fixture(); const pending = f.context.loadAdminUsers(true); assert.equal(f.renderCount(), 0);
  f.fail(); await pending; assert.equal(f.state.adminUsers[0].id, 'old'); assert.ok(f.state.adminUsersError);
  const retry = f.context.loadAdminUsers(true); f.resolve([{ id: 'recovered' }]); await retry;
  assert.equal(f.state.adminUsers[0].id, 'recovered'); assert.equal(f.state.adminUsersError, '');
});
test('late response after account change is discarded', async () => {
  const f = fixture(); const pending = f.context.loadAdminUsers(true); f.logout(); f.resolve([{ id: 'private' }]); await pending;
  assert.equal(f.state.adminUsers, null); assert.equal(f.renderCount(), 0);
});
test('Korean composition is not interrupted by background refresh', async () => {
  const f = fixture(); f.state.adminUserComposing = true; const pending = f.context.loadAdminUsers(true); f.resolve([{ id: 'new' }]); await pending;
  assert.equal(f.renderCount(), 0); assert.equal(f.state.adminUsers[0].id, 'new');
});
