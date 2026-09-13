const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const editorSource = fs.readFileSync('js/insuwork-coverage.js', 'utf8');
const appSource = fs.readFileSync('js/insuwork.js', 'utf8');
const key = '__coverage_workspace__';
const clone = value => JSON.parse(JSON.stringify(value));
const base = { products: [], rows: [{ id: 'standard', section: '간병인', group: '지원일당', name: '간병인지원 질병입원일당', total: '', values: {} }], updatedAt: '2026-09-12T01:00:00Z' };
function editor(service) {
  const context = { window: { OSInsuwork: service }, document: { addEventListener() {}, querySelectorAll: () => [] }, crypto: webcrypto, console, queueMicrotask() {} };
  vm.createContext(context);
  vm.runInContext(editorSource, context);
  return context.window.OSInsuworkCoverage;
}
test('reset restores saved form and persists only working copy, without template-editor permission', async () => {
  let templateWrites = 0, working, notices = [];
  const template = clone(base);
  const ui = editor({ canEditCoverageTemplate: () => false, getCoverageBaseTemplate: () => clone(template), saveCoverageWorkspaceDraft: async r => { working = clone(r); return r; }, saveCoverageWorkspaceAnalysis: async () => { templateWrites++; }, rerenderCoverageWorkspace() {}, coverageError: e => notices.push(e) });
  ui.reset(key, { products: [{ id: 'p', company: '테스트' }], rows: [{ id: 'custom', section: '추가분류', name: '추가 담보', total: '500만', values: { p: '500만' } }] });
  await ui.resetToBaseTemplate();
  assert.equal(templateWrites, 0);
  assert.deepEqual(template, base);
  assert.equal(working.rows.length, 1);
  assert.equal(working.rows[0].name, base.rows[0].name);
  assert.equal(working.rows[0].total, '');
  assert.equal(working.products.length, 0);
  const markup = ui.workspaceHtml(working);
  assert.doesNotMatch(markup, />기본 양식 저장</);
  assert.match(markup, />작업표 저장</);
  assert.match(markup, /기본 양식으로 작업표 초기화 완료/);
  const fresh = editor({ canEditCoverageTemplate: () => false });
  assert.match(fresh.workspaceHtml(working), /간병인지원 질병입원일당/);
  assert.doesNotMatch(fresh.workspaceHtml(working), /추가 담보/);
  assert.deepEqual(notices, []);
});
test('reset failure keeps reset draft available for working-copy retry and never touches template', async () => {
  let fail = true, errors = [], stored;
  const ui = editor({ getCoverageBaseTemplate: () => clone(base), saveCoverageWorkspaceDraft: async r => { if (fail) throw Error('저장 연결 실패'); stored = clone(r); return r; }, rerenderCoverageWorkspace() {}, coverageError: e => errors.push(e) });
  await ui.resetToBaseTemplate();
  assert.match(ui.workspaceHtml(), /초기화 저장 실패/);
  fail = false;
  await ui.saveWorkspace();
  assert.equal(stored.rows[0].id, 'standard');
  assert.equal(errors.length, 1);
  assert.match(ui.workspaceHtml(), /작업표 저장 완료/);
});
function persistence(user = 'owner') {
  const items = [{ id: 'template', legacy_payload: { workspace_category: 'coverage_analysis', coverage_analysis_workspace: true, coverage_analysis_template: true, coverage_analysis: clone(base) } }];
  const context = { state: { data: { items } }, window: {}, crypto: webcrypto, currentUserId: () => user, AZ_VIEWING_ROOM_OWNER_ID: 'owner', localPreviewAllowed: () => false, authenticated: () => true, canUseCoverageAnalysis: () => true,
    coverageAnalysisSummary: r => 'rows ' + r.rows.length,
    writeOne: async (table, r) => clone(r), updateOne: async (query, body) => ({ ...clone(body), id: decodeURIComponent(query.match(/id=eq\.([^&]+)/)[1]) }),
    upsertWorkspaceItem(r) { const index = items.findIndex(x => x.id === r.id); if (index < 0) items.push(r); else items[index] = r; }
  };
  vm.createContext(context);
  const from = appSource.indexOf('  function coverageWorkspaceItem()');
  const to = appSource.indexOf('  function saveCoverageWorkspaceToCustomer(', from);
  vm.runInContext(appSource.slice(from, to), context);
  return { context, items };
}
test('working-copy persistence creates a separate private record and reload selects it', async () => {
  const { context: app, items } = persistence();
  const next = { ...clone(base), updatedAt: '2026-09-12T02:00:00Z' };
  next.rows[0].total = '20만';
  await app.saveCoverageWorkspaceDraft(next, null);
  assert.deepEqual(items.find(x => x.id === 'template').legacy_payload.coverage_analysis, base);
  const work = items.find(x => x.legacy_payload.coverage_analysis_working);
  assert.notEqual(work.id, 'template');
  assert.equal(work.visibility, 'private');
  assert.equal(work.owner_id, 'owner');
  assert.equal(work.legacy_payload.coverage_analysis_template, false);
  assert.equal(app.coverageWorkspaceRecord().rows[0].total, '20만');
  next.updatedAt = '2026-09-12T03:00:00Z'; next.rows[0].name = '수정 기본 담보';
  await app.saveCoverageWorkspaceAnalysis(next, null);
  assert.equal(app.coverageWorkspaceRecord().rows[0].name, base.rows[0].name);
});
test('non-editor cannot save template but working-copy persistence has no template permission dependency', async () => {
  const { context: app, items } = persistence('ordinary-user');
  await assert.rejects(app.saveCoverageWorkspaceAnalysis(clone(base), null), /임태성/);
  await app.saveCoverageWorkspaceDraft(clone(base), null);
  assert.equal(items.filter(x => x.legacy_payload.coverage_analysis_template).length, 1);
  assert.equal(items.find(x => x.legacy_payload.coverage_analysis_working).owner_id, 'ordinary-user');
});

test('template replacement first archives previous version and aborts if archive fails', async () => {
  const { context: app, items } = persistence();
  app.writeOne = async () => { throw Error('이력 저장 실패'); };
  const next = clone(base); next.rows[0].name = '새 기본 담보';
  await assert.rejects(app.saveCoverageWorkspaceAnalysis(next, null), /이력 저장 실패/);
  assert.deepEqual(items[0].legacy_payload.coverage_analysis, base);
  app.writeOne = async (table, row) => clone(row);
  await app.saveCoverageWorkspaceAnalysis(next, null);
  const history = items.find(x => x.legacy_payload.coverage_analysis_history);
  assert.equal(history.parent_id, 'template');
  assert.deepEqual(history.legacy_payload.coverage_analysis, base);
  assert.equal(items[0].legacy_payload.coverage_analysis.rows[0].name, '새 기본 담보');
});

test('history restore is owner scoped and opens isolated editor without writing either record', async () => {
  let rendered = '', restored = [], query = '', currentDraft;
  const historical = { id: 'before-import', owner_id: 'owner', legacy_payload: { coverage_analysis: clone(base), replaced_at: '2026-09-12T02:00:00Z' } };
  const status = { textContent: '' };
  const context = { canEditCoverageTemplate: () => true, currentUserId: () => 'owner', coverageWorkspaceItem: () => ({ id: 'template' }), api: async q => { query = q; return [historical]; }, dialog: html => rendered = html, esc: x => String(x || ''), coverageError: e => { throw Error(e); }, document: { getElementById: () => status }, saveCoverageWorkspaceAnalysis: async r => restored.push(['template', clone(r)]), saveCoverageWorkspaceDraft: async r => restored.push(['working', clone(r)]), window: { OSInsuworkCoverageTemplate: { edit: r => currentDraft = clone(r) } }, forceCloseDialog() {}, rerenderCoverageWorkspace() {}, coverageNotice() {} };
  vm.createContext(context);
  const from = appSource.indexOf('  var coverageTemplateHistory = []');
  vm.runInContext(appSource.slice(from, appSource.indexOf('  function coverageAnalysisPageHtml()', from)), context);
  await context.openCoverageTemplateHistory();
  assert.match(query, /owner_id=eq.owner/);
  assert.match(query, /parent_id=eq.template/);
  context.previewCoverageTemplateHistory('before-import');
  assert.match(rendered, /간병인지원 질병입원일당/);
  await context.restoreCoverageTemplateHistory('not-a-snapshot', {});
  assert.equal(restored.length, 0);
  await context.restoreCoverageTemplateHistory('before-import', {});
  assert.deepEqual(restored, []);
  assert.equal(currentDraft.rows[0].name, base.rows[0].name);
  assert.deepEqual(historical.legacy_payload.coverage_analysis, base);
});
