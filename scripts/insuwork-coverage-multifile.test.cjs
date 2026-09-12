const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
function setup() {
  const context = {window:{XLSX:{utils:{sheet_to_json:sheet=>sheet}}},document:{addEventListener(){},querySelector(){return null}},crypto:webcrypto,console,fetch:async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('data/coverage_synonyms.json','utf8'))})};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/insuwork-coverage.js','utf8').replace('window.OSInsuworkCoverage = exposed;','window.OSInsuworkCoverage = exposed; window.testing = {parseBanksaladWorkbook, normalize, mergeImportedRecord, loadCoverageSynonyms, recordFromStructured};'),context);
  return context.window.testing;
}
function workbook(rows){return {SheetNames:['안내','보장'],Sheets:{'안내':[['안내문']],'보장':rows}}}
const row=(name,values={},group='')=>({id:'r',section:'암',group,name,total:'',values});
test('KakaoPay headers below title are separate from BankSalad metadata above header',()=>{
  const api=setup();
  const kakao=api.parseBanksaladWorkbook(workbook([
    ['보장구분','주요특약','추천금액','상태','가입금액','차이','현대해상'],
    ['','','','','','','무배당실손의료비보장보험(갱신형)(Hi2307)기본플랜'],
    ['','','','','','','갱신형'],['','','','','','','17,210원\n(매월납/4년)'],
    ['','','','','','','추가 코멘트 :'],
    ['실손','질병실손의료비','1억','충분','5000만','','5000만']
  ]),'sample.xlsx');
  assert.equal(kakao.products[0].company,'현대해상');
  assert.equal(kakao.products[0].premium,'17,210원\n(매월납/4년)');
  assert.equal(kakao.products[0].renewal,'갱신형');assert.equal(kakao.rows.length,1);
  assert.equal(kakao.rows[0].recommended,'1억');assert.equal(kakao.rows[0].status,'충분');
  assert.equal(api.normalize(kakao).rows[0].group,'4세대 실손');
  const bank=api.parseBanksaladWorkbook(workbook([
    ['','','','','','','보험사A'],['','','','','','','월 50,000원 / 20년'],
    ['보장구분','주요특약','보장상태','연령대 평균','총 가입금액','금액차이','종합보험1108'],
    ['암진단비','고액암 진단','부족','3000만','2000만','-1000만','2000만']
  ]),'sample.xlsx');
  assert.equal(bank.products[0].company,'보험사A');assert.equal(bank.products[0].product,'종합보험1108');
  assert.equal(bank.rows[0].total,'2000만');assert.equal(api.normalize(bank).rows.length,1);
});
test('zero product cells do not introduce an unknown generation or duplicate template row',()=>{
  const api=setup();const incoming={products:[{id:'p',product:'무배당실손의료비보장보험(갱신형)(Hi2307)기본플랜'},{id:'q',product:'종합보험(Hi2306)'}],rows:[{...row('질병실손의료비',{p:'5000만',q:'0'}),section:'실손'}]};
  const base={products:[],rows:[{...row('질병실손의료비'),section:'실손'}]};
  const merged=api.mergeImportedRecord(base,incoming);assert.equal(merged.rows.length,1);assert.equal(merged.rows[0].group,'4세대 실손');
  assert.equal(api.normalize({products:[{id:'q',product:'종합보험(Hi2306)'}],rows:[{...row('질병실손의료비',{q:'5000만'}),section:'실손'}]}).rows[0].group,'세대 확인');
});
test('aliases connect to saved rows; unowned unmatched benefits do not create categories',async()=>{
  const api=setup();await api.loadCoverageSynonyms();
  const base={products:[],rows:[row('표적항암약물치료비',{},'치료비2'),{...row('항암중입자방사선치료비',{},'치료비2'),id:'second'}]};
  const result=api.mergeImportedRecord(base,{products:[],rows:[{...row('표적 항암치료비'),total:'7000만'},{...row('중입자 항암치료비'),id:'i2',total:'-'},{...row('기타 미가입 담보'),id:'i3',total:'-'}]});
  assert.equal(result.rows.length,2);assert.equal(result.rows.find(r=>r.id==='r').total,'7000만');assert.equal(result.rows[1].group,'치료비2');
});
test('same contract repeated in images is not summed and conflicts retain both source amounts',()=>{
  const api=setup();const first={source:{name:'sheet.xlsx'},products:[{id:'p',company:'보험사A',product:'무배당 종합보험',premium:'50000원'}],rows:[row('담보',{p:'1000만'})]};
  const base=api.mergeImportedRecord({products:[],rows:[]},first);
  const same={source:{name:'image.png'},products:[{id:'q',company:'보험사A',product:'(무)종합보험'}],rows:[row('담보',{q:'10,000,000원'})]};
  const again=api.mergeImportedRecord(base,same);assert.equal(again.products.length,1);assert.equal(again.rows.length,1);assert.equal(Object.values(again.rows[0].values)[0],'1000만');assert.equal(again.rows[0].importConflicts,undefined);
  same.rows[0].values.q='2000만';const different=api.mergeImportedRecord(again,same);assert.equal(Object.values(different.rows[0].values)[0],'1000만');assert.equal(different.rows[0].importConflicts[0].incoming,'2000만');assert.equal(different.rows[0].importConflicts[0].source,'image.png');
});
test('metadata-only images accepted, premium overview is not coverage',()=>{
  const api=setup();assert.equal(api.recordFromStructured({products:[{company:'보험사A',product:'종합보험',premium:'50000원'}]},'contracts.png','png').products.length,1);
  assert.equal(api.recordFromStructured({rows:[{name:'총 보험료',total:'1000만원'}]},'overview.png','png').rows.length,0);
});
test('browser crypto initializes before dependent modules without Node globals',()=>{
  const context={console,setTimeout,clearTimeout,crypto:webcrypto,Uint8Array,ArrayBuffer};context.window=context;vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/vendor/officecrypto.min.js','utf8'),context);
  assert.equal(typeof context.OSOfficeCrypto.decrypt,'function');assert.equal(typeof context.Buffer.from,'function');
});
