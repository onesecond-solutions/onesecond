const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('insuwork/mobile-routing.js', 'utf8');
function setup({ phone = true, user = true, token = true, pathname = '/insuwork/', search = '', narrow = false } = {}) {
  const moved = [], listeners = {};
  const context = { URLSearchParams, Date, navigator: { userAgent: phone ? 'Android Mobile' : 'Windows NT', maxTouchPoints: 0 },
    location: { pathname, search, replace: value => moved.push(value) },
    localStorage: { getItem: () => user ? '{"id":"test-user"}' : null }, sessionStorage: { getItem: () => null },
    document: { addEventListener: (event, handler) => { listeners[event] = handler; } } };
  context.window = { innerWidth: narrow ? 390 : 1200, db: { getToken: () => token ? 'fake-test-token' : null },
    matchMedia: () => ({ matches: false }), addEventListener: (event, handler) => { listeners[event] = handler; } };
  vm.runInNewContext(source, context);
  return { context, moved, listeners, route: context.window.OSInsuworkMobileRouting.destination };
}
test('signed-in phone goes to dedicated home even in landscape', () => assert.deepEqual(setup().moved, ['/insuwork/m/index.html']));
test('anonymous phone keeps public landing; incomplete session does not redirect', () => { assert.equal(setup({user:false}).moved.length,0); assert.equal(setup({token:false}).moved.length,0); });
test('desktop including narrow window stays desktop', () => assert.equal(setup({phone:false,narrow:true}).moved.length,0));
test('dedicated mobile path cannot redirect into a loop', () => assert.equal(setup({pathname:'/insuwork/m/section.html'}).moved.length,0));
test('login completion rechecks route', () => { const s=setup({user:false}); s.context.localStorage.getItem=()=>'{"id":"test-user"}'; s.listeners['appstate:ready'](); assert.equal(s.moved.length,1); });
test('calendar date and customer/consultation detail query survive routing', () => {
  const {route}=setup();
  assert.equal(route('?section=calendar&date=2026-09-03&mode=day'),'/insuwork/m/calendar.html?date=2026-09-03&mode=day');
  for(const section of ['customers','consultations']) assert.equal(route('?section='+section+'&id=abc&q=test'),'/insuwork/m/'+section+'.html?id=abc&q=test');
});
test('auxiliary menus remain in mobile shell and unsafe sections cannot become external URLs', () => {
  const {route}=setup();
  for(const section of ['briefing','newsletters','product-lineups','sales-strategy','notice-updates','user-guide','feedback']) assert.equal(route('?section='+section),'/insuwork/m/section.html?view=insuwork&section='+section);
  assert.equal(route('?section=https://evil.example'),'/insuwork/m/index.html');
});
test('historical home date opens mobile schedule for same date', () => assert.equal(setup().route('?section=home&date=2020-01-01'),'/insuwork/m/calendar.html?date=2020-01-01'));
