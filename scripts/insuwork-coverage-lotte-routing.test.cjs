const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const workspace = '__coverage_workspace__';
const base = () => ({preserveTemplateLayout:true, products:[], rows:[{id:'basic-row', section:'암', name:'기본 담보', values:{}}]});
function report(contract='contract-a', suffix='1', amount='1000만') {
  const id = 'product-' + suffix;
  return {source:{provider:'lotte-detail',name:'sample.pdf'},customerInfo:{name:'테스트고객',birthDate:'1980-01-01'},products:[{id,company:'테스트보험',product:'테스트상품',contractKey:contract}],rows:[{id:'row-'+suffix,section:'암',name:'원문 담보',total:'',totalReview:'조건 확인',values:{[id]:amount},sourceDetails:[{provider:'lotte-detail',contractKey:contract,companyName:'원문 담보',amount,page:7}]}]};
}
function setup(allowed=true, saveFails=false) {
  const saved={}, errors=[];
  const context={window:{},document:{addEventListener(){},querySelectorAll(){return[]},querySelector(){return null},getElementById(){return null}},crypto:webcrypto,queueMicrotask(){},requestAnimationFrame:fn=>fn()};
  let ui;
  const service={canEditCoverageTemplate:()=>allowed,getCoverageBaseTemplate:base,getCoverageWorkspaceRecord:()=>saved[ui.workspaceTabId()]||base(),rerenderCoverageWorkspace(){ui.workspaceHtml(service.getCoverageWorkspaceRecord());},saveCoverageWorkspaceDraft:async r=>{if(saveFails)throw Error('저장 실패');saved[ui.workspaceTabId()]=JSON.parse(JSON.stringify(r));return r;},coverageNotice(){},coverageError:e=>errors.push(e)};
  context.window.OSInsuwork=service;
  const injection='window.OSInsuworkCoverage = exposed; window.testing = {routeImportedRecords,mergeImportedRecord,lotteSourceHtml,draft,stubImport(record){parseImportFile=async()=>record;loadCoverageSynonyms=async()=>{};showImportProgress=()=>{};hideImportProgress=()=>{};}};';
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/insuwork-coverage.js','utf8').replace('window.OSInsuworkCoverage = exposed;',injection),context);
  ui=context.window.OSInsuworkCoverage;ui.workspaceHtml(base());
  return {ui,api:context.window.testing,saved,errors};
}
test('owner import routes to Lotte while preserving unsaved basic edits',()=>{
  const {ui,api}=setup();ui.setRow(workspace,'basic-row','name','저장 전 기본 수정');
  api.routeImportedRecords(workspace,[report()]);assert.equal(ui.workspaceTabId(),'lotte');
  ui.switchWorkspaceTab('basic');assert.equal(api.draft(workspace).rows[0].name,'저장 전 기본 수정');
});
test('ordinary users and customer-specific panels do not route into owner tabs',()=>{
  const ordinary=setup(false);ordinary.api.routeImportedRecords(workspace,[report()]);assert.equal(ordinary.ui.workspaceTabId(),'basic');
  const owner=setup();owner.api.routeImportedRecords('customer-id',[report()]);assert.equal(owner.ui.workspaceTabId(),'basic');
});
test('mixed sources reject without moving tabs or altering the existing draft',()=>{
  const {ui,api}=setup();ui.setRow(workspace,'basic-row','name','보존할 내용');const before=JSON.stringify(api.draft(workspace));
  assert.throws(()=>api.routeImportedRecords(workspace,[report(),{source:{provider:'kb-detail'}}]),/나누어/);
  assert.equal(ui.workspaceTabId(),'basic');assert.equal(JSON.stringify(api.draft(workspace)),before);
});
test('reimport replaces the exact contract once and preserves another contract',()=>{
  const {api}=setup();let merged=api.mergeImportedRecord(base(),report());
  merged=api.mergeImportedRecord(merged,report('contract-b','2','2000만'));
  merged=api.mergeImportedRecord(merged,report('contract-a','3','1500만'));
  assert.equal(merged.products.length,2);assert.equal(merged.rows.length,2);
  assert.equal(merged.products.filter(p=>p.contractKey==='contract-a').length,1);
  assert.ok(merged.rows.some(r=>r.values['product-2']==='2000만'));
  assert.ok(merged.rows.some(r=>r.values['product-3']==='1500만'));
  assert.ok(merged.rows.every(r=>!Object.hasOwn(r.values,'product-1')));
});
test('different customers reject without mutating either report',()=>{
  const {api}=setup();const first=report(),other=report('contract-b','2');other.customerInfo.name='다른고객';
  const before=JSON.stringify(first);assert.throws(()=>api.mergeImportedRecord(first,other),/서로 다른 고객/);assert.equal(JSON.stringify(first),before);
});
test('source details escape original text and review labels',()=>{
  const {api}=setup();const payload='<img src=x onerror=alert(1)>';
  const html=api.lotteSourceHtml({totalReview:payload,sourceDetails:[{provider:'lotte-detail',companyName:payload,amount:payload,page:payload,creditName:payload}]});
  assert.doesNotMatch(html,/<img/);assert.ok(html.includes('&lt;img'));assert.match(html,/<details/);
});
test('failed import save restores originating tab and its unsaved content',async()=>{
  const {ui,api,errors,saved}=setup(true,true);ui.setRow(workspace,'basic-row','name','저장 전 내용');api.stubImport(report());
  const input={files:[{name:'sample.pdf'}],value:'selected'};
  await ui.importFile(workspace,input);
  assert.equal(ui.workspaceTabId(),'basic');assert.equal(api.draft(workspace).rows[0].name,'저장 전 내용');
  assert.equal(errors.length,1);assert.match(errors[0],/저장 실패/);assert.equal(Object.keys(saved).length,0);assert.equal(input.value,'');
});
