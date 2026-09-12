const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const context = {window:{},document:{addEventListener(){}},crypto:webcrypto,console,fetch:async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('data/coverage_synonyms.json','utf8'))})};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/insuwork-coverage.js','utf8').replace('window.OSInsuworkCoverage = exposed;', 'window.OSInsuworkCoverage = exposed; window.testing = {normalize,mergeImportedRecord,loadCoverageSynonyms,coverageSynonym,mergedSpan};'),context);
const api=context.window.testing;
const row=(name,group='',values={})=>({id:'r',section:'실손',group,name,total:'1000만원',values});
test('normalization preserves unknown scope and separates generation columns',()=>{
 const original={products:[],rows:[row('질병실손의료비'),{...row('상해입원 의료비'),id:'r2'},{...row('비급여 주사료(실손)','3세대'),id:'r3'}]};
 const result=api.normalize(original);
 assert.equal(result.rows.find(r=>r.id==='r').name,'질병실손의료비');
 assert.equal(result.rows.find(r=>r.id==='r').group,'세대 확인');
 assert.equal(result.rows.find(r=>r.id==='r2').name,'상해 입원 의료비');
 assert.equal(result.rows.find(r=>r.id==='r3').group,'3세대 실손');
 assert.equal(original.rows[1].name,'상해입원 의료비');
 const html=context.window.OSInsuworkCoverage.html('test',original,{expanded:true});
 assert.ok(html.includes('iw-ca-group-cell')); assert.ok(!html.includes('colspan="2"'));
});
test('mixed generations split values without duplicating total; reload is stable',()=>{
 const input={products:[{id:'p',product:'3세대 실손'},{id:'q',product:'4세대 실손'}],rows:[row('질병입원 의료비','',{p:'100',q:'200'})]};
 const result=api.normalize(input); assert.equal(result.rows.length,2);
 assert.equal(result.rows[0].values.p,'100');assert.equal(result.rows[0].values.q,undefined);
 assert.equal(result.rows[1].values.q,'200');assert.equal(result.rows[0].total,'');assert.equal(result.rows[0].sourceTotal,'1000만원');
 assert.equal(JSON.stringify(api.normalize(result)),JSON.stringify(result));
});
test('imports do not merge different generations or infer combined coverage from ambiguous labels',async()=>{
 await api.loadCoverageSynonyms();
 assert.equal(api.coverageSynonym('질병실손의료비'),null);
 assert.equal(api.coverageSynonym('질병실손의료비(입원·통원)').canonical,'질병 의료비(입원·통원)');
 const base={products:[],rows:[row('질병 입원 의료비','3세대 실손')]};
 const incoming={products:[{id:'p',product:'4세대 실손'}],rows:[row('질병입원 의료비','4세대 실손',{p:'5000'})]};
 const result=api.mergeImportedRecord(base,incoming); assert.equal(result.rows.length,2); assert.equal(result.rows[0].group,'3세대 실손');assert.equal(result.rows[1].group,'4세대 실손');
});
