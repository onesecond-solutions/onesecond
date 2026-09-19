const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = process.argv[2] || 'dist/insuwork-site';
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.match(html, /data-insuwork="true"/);
assert.ok(!html.includes('<base'), 'A base tag would change query-only navigation');
for (const m of html.matchAll(/(?:src|href)="(\/[^"?#]+)[^"]*"/g)) {
  assert.ok(fs.existsSync(path.join(root, m[1])), 'Missing root asset: ' + m[1]);
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'insuwork/manifest.json')));
assert.equal(manifest.start_url, '/');
assert.equal(manifest.scope, '/');
assert.equal(fs.readFileSync(path.join(root, 'CNAME'), 'utf8').trim(), 'insuwork.onesecond.solutions');
for (const privatePath of ['.git', '.github', 'docs', 'supabase', '.env']) assert.ok(!fs.existsSync(path.join(root, privatePath)));
const routing = fs.readFileSync('insuwork/mobile-routing.js', 'utf8');
for (const [hostname, pathname, phone, expected] of [
  ['insuwork.onesecond.solutions', '/', true, '/insuwork/m/customers.html'],
  ['insuwork.onesecond.solutions', '/', false, null],
  ['onesecond.solutions', '/', true, null],
  ['onesecond.solutions', '/insuwork/', true, '/insuwork/m/customers.html'],
  ['insuwork.onesecond.solutions', '/insuwork/m/index.html', true, null]
]) {
  let actual = null;
  const location = { hostname, pathname, search: '?section=customers', replace: v => actual = v };
  const window = { innerWidth: phone ? 390 : 1920, db: {getToken: () => 'fixture'}, addEventListener() {}, matchMedia: () => ({ matches: phone }) };
  vm.runInNewContext(routing, {window, location, navigator: {userAgent: phone ? 'iPhone' : 'desktop'}, localStorage: {getItem: () => '{"id":"fixture"}'}, document: {addEventListener() {}}, URLSearchParams, Date});
  assert.equal(actual, expected);
}
const domainRouting = fs.readFileSync('insuwork/domain-routing.js', 'utf8');
for (const [hostname, pathname, search, hash, expected] of [
  ['onesecond.solutions', '/insuwork/', '?section=assets', '#note', 'https://insuwork.onesecond.solutions/?section=assets#note'],
  ['www.onesecond.solutions', '/insuwork/m/calendar.html', '?date=2026-09-19', '', 'https://insuwork.onesecond.solutions/insuwork/m/calendar.html?date=2026-09-19'],
  ['onesecond.solutions', '/', '', '', null],
  ['onesecond.solutions', '/insuwork/', '?code=fixture', '', null],
  ['onesecond.solutions', '/insuwork/', '', '#access_token=fixture', null],
  ['onesecond.solutions', '/insuwork/', '?error=access_denied', '', null],
  ['insuwork.onesecond.solutions', '/insuwork/', '?section=assets', '', '/?section=assets'],
  ['insuwork.onesecond.solutions', '/', '?section=assets', '', null],
  ['localhost', '/insuwork/', '', '', null]
]) {
  let actual = null;
  vm.runInNewContext(domainRouting, {location: {hostname, pathname, search, hash, replace: value => actual = value}, URLSearchParams});
  assert.equal(actual, expected);
}
console.log('Domain root, assets, manifest, publication boundary, mobile and migration routing checks passed');
