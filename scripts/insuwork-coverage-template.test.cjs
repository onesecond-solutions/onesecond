const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), { webcrypto } = require('node:crypto');
const clone = value => JSON.parse(JSON.stringify(value));
function setup() {
  let permitted = true, writes = [], confirm = false, fail = false, pending = null;
  let stored = { customerInfo: { name: '개인 정보' }, source: { name: '원본.xlsx' }, products: [{ id: 'p' }], rows: [
    { id: 'a', section: '암', group: '진단비', name: '일반암 진단비', values: { p: '1000만' }, total: '1000만' },
    { id: 'b', section: '실손', group: '세대 확인', name: '질병 실손의료비', values: {} }
  ] };
  const status = { textContent: '' }, scroll = { scrollTop: 0 }, buttons = [{ disabled: false }];
  const box = { innerHTML: '', isConnected: true, open: false, setAttribute() {}, addEventListener() {}, showModal() { this.open = true; }, close() { this.open = false; }, remove() { this.isConnected = false; }, querySelector: selector => selector.includes('status') ? status : scroll, querySelectorAll: () => buttons };
  const context = { queueMicrotask() {}, crypto: webcrypto, document: { addEventListener() {}, querySelectorAll: () => [], getElementById: () => ({ appendChild() { box.isConnected = true; } }), createElement: () => box }, window: { confirm: () => confirm, OSInsuwork: {
    canEditCoverageTemplate: () => permitted, getCoverageBaseTemplate: () => clone(stored), coverageError: e => { throw Error(e); },
    saveCoverageWorkspaceAnalysis: async r => { writes.push(clone(r)); if (fail) throw Error('연결 실패'); if (pending) await pending; stored = clone(r); return r; }
  } } };
  vm.createContext(context); vm.runInContext(fs.readFileSync('js/insuwork-coverage.js', 'utf8'), context);
  return { ui: context.window.OSInsuworkCoverageTemplate, work: context.window.OSInsuworkCoverage, box, status, buttons, writes, stored: () => stored, permit: x => permitted = x, confirm: x => confirm = x, fail: x => fail = x, pending: x => pending = x };
}
test('only isolated reviewed form can save; customer work, source and amounts never enter template', async () => {
  const s = setup(), initial = clone(s.stored());
  s.work.reset('__coverage_workspace__', { customerInfo: { name: '작업 고객' }, products: [], rows: [{ id: 'work', name: '작업 전용 담보' }] });
  assert.doesNotMatch(s.work.workspaceHtml(), /기본 양식 저장/);
  s.ui.open(); s.ui.edit();
  assert.match(s.box.innerHTML, /일반암 진단비/); assert.doesNotMatch(s.box.innerHTML, /작업 전용 담보|개인 정보|1000만/);
  s.ui.set(0, 'name', '<새 담보>'); await s.ui.save(); assert.equal(s.writes.length, 0);
  s.ui.review(); assert.match(s.box.innerHTML, /수정/); assert.match(s.box.innerHTML, /&lt;새 담보&gt;/);
  s.ui.set(0, 'name', '검토 후 몰래 변경'); await s.ui.save();
  assert.equal(s.writes[0].rows[0].name, '<새 담보>');
  assert.equal(s.writes[0].customerInfo, undefined); assert.equal(s.writes[0].source, null);
  assert.deepEqual(s.writes[0].products, []); assert.deepEqual(s.writes[0].rows[0].values, {});
  assert.match(s.work.workspaceHtml(), /작업 전용 담보/); assert.equal(initial.rows[0].name, '일반암 진단비');
});
test('review tracks additions, deletions, visibility and order; closing requires discard decision', () => {
  const s = setup(); s.ui.edit(); s.ui.set(0, 'hidden', true); s.ui.move(0, 1); s.ui.add(1); s.ui.review();
  assert.match(s.box.innerHTML, /추가/); assert.match(s.box.innerHTML, /순서/); assert.match(s.box.innerHTML, /숨김/);
  s.ui.close(); assert.equal(s.box.open, true);
  s.ui.back(); s.ui.remove(0); s.ui.review(); assert.match(s.box.innerHTML, /삭제/);
  s.confirm(true); s.ui.close(); assert.equal(s.box.open, false); assert.equal(s.writes.length, 0);
});
test('permission, no-change, stale-template and double-save guards prevent accidental writes', async () => {
  const s = setup(); s.permit(false); s.ui.edit(); assert.equal(s.box.open, false);
  s.permit(true); s.ui.edit(); s.ui.review(); await s.ui.save(); assert.equal(s.writes.length, 0);
  s.ui.back(); s.ui.set(0, 'name', '변경'); s.ui.review(); s.stored().updatedAt = '다른 작업';
  await s.ui.save(); assert.equal(s.writes.length, 0); assert.match(s.status.textContent, /다른 작업/);
  s.confirm(true); s.ui.close(); s.ui.edit(); s.ui.set(0, 'name', '재변경'); s.ui.review();
  let resolve; s.pending(new Promise(r => resolve = r)); const saving = s.ui.save();
  await s.ui.save(); s.ui.close(); assert.equal(s.box.open, true); assert.equal(s.writes.length, 1);
  resolve(); await saving;
});
test('failed save preserves reviewed draft for retry and restores controls', async () => {
  const s = setup(); s.ui.edit(); s.ui.set(0, 'name', '재시도 담보'); s.ui.review(); s.fail(true);
  await s.ui.save(); assert.match(s.status.textContent, /연결 실패/); assert.equal(s.buttons[0].disabled, false);
  s.fail(false); await s.ui.save(); assert.equal(s.stored().rows[0].name, '재시도 담보');
});
