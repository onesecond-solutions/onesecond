const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const context = {window:{},document:{addEventListener(){}},crypto:webcrypto,console,fetch:async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('data/coverage_synonyms.json','utf8'))})};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/insuwork-coverage.js','utf8').replace('window.OSInsuworkCoverage = exposed;', 'window.OSInsuworkCoverage = exposed; window.testing = {normalize};'),context);
const api=context.window.testing;
const row=(section,name,group='')=>({id:'r-'+name,section,group,name,total:'',values:{}});
test('legacy 운전 section rows are unified into 운전자 on normalize, keeping name/group intact',()=>{
 const original={products:[],rows:[
   row('운전','교통사고 벌금(대물)'),
   row('운전','교통사고 벌금(대인)'),
   row('운전','교통사고 벌금(스쿨존 추가보장)'),
   row('운전','교통사고 처리지원금'),
   row('운전','자동차사고 변호사선임비용'),
   row('운전','자동차사고부상치료비'),
   row('운전자','교통사고 처리 지원금(6주미만 중대)'),
   row('운전자','교통사고 처리 지원금(사망)'),
   row('운전자','변호사 선임 비용(경찰조사 미포함)'),
   row('운전자','운전자 벌금(스쿨존)')
 ]};
 const result = api.normalize(original);
 assert.equal(result.rows.filter(r => r.section === '운전').length, 0, 'no rows should remain labeled 운전');
 assert.equal(result.rows.filter(r => r.section === '운전자').length, 10, 'all 10 rows should be under 운전자');
 // names/conditions must be preserved verbatim, nothing merged or renamed
 var names = Array.from(result.rows, r => r.name).sort();
 var expected = ['교통사고 벌금(대물)','교통사고 벌금(대인)','교통사고 벌금(스쿨존 추가보장)','교통사고 처리 지원금(6주미만 중대)','교통사고 처리 지원금(사망)','교통사고 처리지원금','변호사 선임 비용(경찰조사 미포함)','운전자 벌금(스쿨존)','자동차사고 변호사선임비용','자동차사고부상치료비'].sort();
 assert.deepEqual(names, expected);
});
