const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const key='__coverage_workspace__';
const base=()=>({preserveTemplateLayout:true,products:[],rows:[{id:'r',section:'암',group:'진단비',name:'일반암 진단비',values:{}}]});
function setup(allowed=true){
  const saved={},context={window:{},document:{addEventListener(){},querySelectorAll(){return[]},querySelector(){return null},getElementById(){return null}},crypto:webcrypto,queueMicrotask(){},requestAnimationFrame:fn=>fn()};
  const service={canEditCoverageTemplate:()=>allowed,getCoverageBaseTemplate:base,getCoverageWorkspaceRecord:()=>saved[ui.workspaceTabId()]||base(),rerenderCoverageWorkspace(){ui.workspaceHtml(service.getCoverageWorkspaceRecord());},saveCoverageWorkspaceDraft:async r=>{saved[ui.workspaceTabId()]=JSON.parse(JSON.stringify(r));return r;},coverageNotice(){},coverageError(e){throw Error(e)}};
  context.window.OSInsuwork=service;vm.createContext(context);vm.runInContext(fs.readFileSync('js/insuwork-coverage.js','utf8'),context);
  const ui=context.window.OSInsuworkCoverage;ui.workspaceHtml(base());return{ui,saved};
}
test('four source tabs preserve the legacy basic draft and isolate unsaved edits',async()=>{
  const {ui,saved}=setup();
  assert.equal(ui.workspaceTabId(),'basic');
  const markup=ui.workspaceHtml(base());
  for(const label of ['KB손해보험','뱅크샐러드','카카오페이','기본형'])assert.ok(markup.includes(label));
  assert.equal((markup.match(/role="tab"/g)||[]).length,4);
  ui.setRow(key,'r','name','기본형 수정');
  for(const id of ['kb','banksalad','kakaopay']){
    ui.switchWorkspaceTab(id);assert.match(ui.workspaceHtml(base()),/일반암 진단비/);assert.doesNotMatch(ui.workspaceHtml(base()),/기본형 수정/);
    ui.setRow(key,'r','name',id+' 수정');await ui.saveWorkspace();
  }
  ui.switchWorkspaceTab('basic');assert.match(ui.workspaceHtml(base()),/기본형 수정/);
  ui.switchWorkspaceTab('kb');assert.match(ui.workspaceHtml(base()),/kb 수정/);
  assert.equal(saved.banksalad.rows[0].name,'banksalad 수정');
  await ui.resetToBaseTemplate();assert.equal(saved.kb.rows[0].name,'일반암 진단비');assert.equal(saved.banksalad.rows[0].name,'banksalad 수정');
});
test('owner gate and keyboard tab navigation',()=>{
  const ordinary=setup(false).ui;assert.doesNotMatch(ordinary.workspaceHtml(base()),/role="tablist"/);ordinary.switchWorkspaceTab('kb');assert.equal(ordinary.workspaceTabId(),'basic');
  const ui=setup().ui;ui.workspaceTabKeydown({key:'Home',preventDefault(){}});assert.equal(ui.workspaceTabId(),'kb');ui.workspaceTabKeydown({key:'ArrowRight',preventDefault(){}});assert.equal(ui.workspaceTabId(),'banksalad');ui.switchWorkspaceTab('unknown');assert.equal(ui.workspaceTabId(),'banksalad');
});
test('private persistence matches exact tab and legacy records remain basic on reload',async()=>{
  let active='basic';const items=[{id:'legacy',legacy_payload:{workspace_category:'coverage_analysis',coverage_analysis_working:true,coverage_analysis:base()}},{id:'template',legacy_payload:{workspace_category:'coverage_analysis',coverage_analysis_workspace:true,coverage_analysis:base()}}];
  const app={state:{data:{items}},window:{OSInsuworkCoverage:{workspaceTabId:()=>active}},crypto:webcrypto,currentUserId:()=> 'owner',AZ_VIEWING_ROOM_OWNER_ID:'owner',localPreviewAllowed:()=>false,authenticated:()=>true,canUseCoverageAnalysis:()=>true,coverageAnalysisSummary:()=>'',writeOne:async(t,r)=>r,updateOne:async(q,r)=>({...r,id:q.match(/id=eq\.([^&]+)/)[1]}),upsertWorkspaceItem(r){const i=items.findIndex(x=>x.id===r.id);if(i<0)items.push(r);else items[i]=r;}};
  const source=fs.readFileSync('js/insuwork.js','utf8');vm.createContext(app);vm.runInContext(source.slice(source.indexOf('  function coverageWorkspaceItem()'),source.indexOf('  function saveCoverageWorkspaceToCustomer(')),app);
  assert.equal(app.coverageWorkingItem().id,'legacy');
  for(const id of ['kb','banksalad','kakaopay']){active=id;assert.equal(app.coverageWorkingItem(),undefined);const r=base();r.rows[0].name=id;await app.saveCoverageWorkspaceDraft(r,null);assert.equal(app.coverageWorkspaceRecord().rows[0].name,id);assert.equal(app.coverageWorkingItem().visibility,'private');assert.equal(app.coverageWorkingItem().owner_id,'owner');}
  active='basic';assert.equal(app.coverageWorkingItem().id,'legacy');assert.equal(app.coverageWorkspaceRecord().rows[0].name,'일반암 진단비');
});
