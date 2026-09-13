const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), { webcrypto } = require('node:crypto');
const editor = fs.readFileSync('js/insuwork-coverage.js', 'utf8'), app = fs.readFileSync('js/insuwork.js', 'utf8');
const key = '__coverage_workspace__';
function setup() {
  let saved, picked = false;
  const context = { crypto: webcrypto, queueMicrotask() {}, document: { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] }, window: { OSInsuwork: {
    canEditCoverageTemplate: () => true, getCoverageCustomerInfo: id => ({ id, name: '선택 고객', birthDate: '1980-01-01' }),
    openCoverageCustomerPicker: save => picked = save, saveCoverageWorkspaceToCustomer: async r => saved = r, coverageError: e => { throw Error(e); }
  } } };
  vm.createContext(context); vm.runInContext(editor.replace('window.OSInsuworkCoverage = exposed;', 'window.OSInsuworkCoverage = exposed; window.getDraft = draft;'), context);
  return { ui: context.window.OSInsuworkCoverage, draft: context.window.getDraft, saved: () => saved, picked: () => picked };
}
test('workspace has one heading, source button below age, and no filename or empty-source placeholder', () => {
  const { ui } = setup();
  ui.reset(key, { source: { name: '원본.xlsx', files: [{ id: 'file' }] }, rows: [], products: [] });
  const html = ui.workspaceHtml();
  assert.equal((html.match(/<h2>/g) || []).length, 1);
  assert.doesNotMatch(html, /원본.xlsx|등록된 보장분석|iw-ca-page-guide/);
  assert.ok(html.indexOf('iw-ca-insurance-age') < html.indexOf('원본 파일 보기'));
  assert.match(html, /고객 선택/);
  ui.reset(key, { rows: [], products: [] }); assert.doesNotMatch(ui.workspaceHtml(), /원본 파일 보기/);
});
test('customer save prompts selection, carries selected identity and original references, manual edit unlinks identity', async () => {
  const s = setup(); s.ui.reset(key, { rows: [], products: [], sourceItemId: 'original', source: { files: [{ id: 'original' }] } });
  s.ui.saveWorkspaceToCustomer(); assert.equal(s.picked(), true); assert.equal(s.saved(), undefined);
  s.ui.selectHeaderCustomer('customer'); s.ui.saveWorkspaceToCustomer(); await new Promise(r => setImmediate(r));
  assert.equal(s.saved().customerInfo.id, 'customer'); assert.equal(s.saved().sourceItemId, 'original');
  s.ui.setCustomerInfo(key, 'name', '다른 고객'); assert.equal(s.draft(key).customerInfo.id, undefined);
});
test('source resolver supports legacy and multiple files, excluding foreign/deleted files', () => {
  let rendered, opened;
  const context = { state: { data: { items: [ { id: 'a', owner_id: 'owner', storage_path: 'a', title: '<원본>.png' }, { id: 'b', owner_id: 'owner', storage_path: 'b', title: '원본.pdf' }, { id: 'foreign', owner_id: 'other', storage_path: 'secret' }, { id: 'deleted', owner_id: 'owner', storage_path: 'gone', deleted_at: 'now' } ] } }, currentUserId: () => 'owner', canUseCoverageAnalysis: () => true, dialog: html => rendered = html, esc: x => String(x).replace(/</g, '&lt;').replace(/>/g, '&gt;'), forceCloseDialog() {}, previewType: () => 'image', openFilePreview: id => opened = id, coverageError: e => { throw Error(e); } };
  vm.createContext(context); const from = app.indexOf('  function coverageSourceFiles('); vm.runInContext(app.slice(from, app.indexOf('  function rerenderCoverageWorkspace()', from)), context);
  context.openCoverageSources({ sourceItemId: 'a' }); assert.equal(opened, 'a');
  context.openCoverageSources({ source: { files: ['a','b','foreign','deleted'].map(id => ({ id })) } });
  assert.match(rendered, /&lt;원본&gt;.png/); assert.match(rendered, /원본.pdf/); assert.doesNotMatch(rendered, /foreign|deleted/);
  assert.throws(() => context.openCoverageSource('foreign'), /찾을 수 없습니다/);
});
test('customer persistence uses record identity without requiring removed dropdown', async () => {
  let target;
  const context = { state: { data: { customers: [{ id: 'customer' }] } }, window: {}, canUseCoverageAnalysis: () => true, saveCoverageAnalysis: async (id, record) => { target = id; return record; }, openCustomerFromEvent() {} };
  vm.createContext(context); const from = app.indexOf('  function saveCoverageWorkspaceToCustomer('); vm.runInContext(app.slice(from, app.indexOf('  function coverageAnalysisSectionHtml(', from)), context);
  await context.saveCoverageWorkspaceToCustomer({ customerInfo: { id: 'customer' } }); assert.equal(target, 'customer');
  await assert.rejects(context.saveCoverageWorkspaceToCustomer({ customerInfo: { id: 'foreign' } }), /선택/);
});
