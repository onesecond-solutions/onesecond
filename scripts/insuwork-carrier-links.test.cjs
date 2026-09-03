const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/insuwork.js', 'utf8');
const ctx = vm.createContext({window:{}});
vm.runInContext(fs.readFileSync('js/insuwork-carriers.js','utf8'),ctx);
vm.runInContext(source.slice(source.indexOf('  var COMPANY_SEARCH_TERMS'),source.indexOf('  function searchNorm')),ctx);
vm.runInContext(source.slice(source.indexOf('  function carrierDirectory()'),source.indexOf('  function loadCarrierDirectory()')),ctx);
test('every directory company resolves to itself, never a similarly named insurer',()=>{
  for(const c of ctx.window.OS_INSUWORK_CARRIERS) assert.equal(ctx.carrierLinkMatch(c.name,c.type==='life'?'생명보험':'손해보험').name,c.name);
});
test('DB and KDB, nonlife and life remain distinct',()=>{
  for(const name of ['DB손해보험','DB생명','KDB생명','삼성화재','삼성생명','KB손해보험','KB라이프','한화손해보험','한화생명','하나손해보험','하나생명','흥국화재','흥국생명','NH농협손해보험','NH농협생명']) assert.equal(ctx.carrierLinkMatch(name,'').name,name);
  for(const name of ['', 'DB', '삼성', 'KB', '없는회사']) assert.equal(ctx.carrierLinkMatch(name,''),null);
  assert.equal(ctx.carrierLinkMatch('DB생명','손해보험'),null);
});
test('verified aliases and system qualifiers resolve exactly',()=>{
  for(const [alias, name] of [['iM라이프','DGB생명'],['메트라이프','MetLife'],['처브라이프','CHUBB라이프'],['흥국생명(T-Life)','흥국생명'],['흥국생명(e-life)','흥국생명'],['라이나손보','CHUBB 에이스손해보험']]) assert.equal(ctx.carrierLinkMatch(alias,'').name,name);
});
