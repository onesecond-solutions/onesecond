const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function fixture(auth = true) {
  const listeners = {}, intervals = new Map(), calls = []; let now = 100000, sequence = 0, fail = false;
  const document = { hidden: false, addEventListener: (k, fn) => listeners[k] = fn };
  const window = { AppState: { ready: auth, userId: auth ? 'self' : '' }, db: { getToken: () => auth ? 'token' : '', fetch: async (url, options) => { calls.push({url, options}); return {ok: !fail}; } }, setInterval: (fn, ms) => { assert.equal(ms,120000); intervals.set(++sequence, fn); return sequence; }, clearInterval: id => intervals.delete(id), setTimeout: () => ++sequence, clearTimeout: () => {}, addEventListener: (k, fn) => listeners[k] = fn };
  vm.runInNewContext(fs.readFileSync('insuwork/presence.js', 'utf8'), { window, document, Date: {now: () => now}, AbortController, Promise });
  return {window, document, calls, listeners, intervals, advance: () => now += 120000, fail: value => fail = value};
}
const settle = () => new Promise(resolve => setImmediate(resolve));
test('authenticated entry and visible heartbeat record self through existing RPC', async () => {
  const f = fixture(); await settle(); assert.equal(f.calls.length,1);
  assert.equal(f.calls[0].url,'/rest/v1/rpc/touch_last_seen'); assert.equal(f.calls[0].options.body,'{}');
  f.listeners['appstate:ready'](); await settle(); assert.equal(f.calls.length,1);
  f.advance(); [...f.intervals.values()][0](); await settle(); assert.equal(f.calls.length,2);
  f.document.hidden=true; f.listeners.visibilitychange(); assert.equal(f.intervals.size,0);
  f.advance(); f.document.hidden=false; f.listeners.visibilitychange(); await settle(); assert.equal(f.calls.length,3);
  f.listeners.pagehide(); assert.equal(f.intervals.size,0);
});
test('anonymous visitor never records access', async () => {
  const f=fixture(false); f.listeners.pageshow(); await settle(); assert.equal(f.calls.length,0); assert.equal(f.intervals.size,0);
});
test('failed request retries and cleared authentication stops heartbeat', async () => {
  const f=fixture(); await settle(); f.fail(true); f.advance(); [...f.intervals.values()][0](); await settle();
  f.fail(false); f.advance(); [...f.intervals.values()][0](); await settle(); assert.equal(f.calls.length,3);
  f.window.AppState.userId=''; f.advance(); [...f.intervals.values()][0](); await settle(); assert.equal(f.calls.length,3); assert.equal(f.intervals.size,0);
});
