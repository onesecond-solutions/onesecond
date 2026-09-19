const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const code=fs.readFileSync('js/insuwork.js','utf8');
const fragment=code.slice(code.indexOf("  var welcomeCheckedFor = ''"),code.indexOf('  function maybeShowCustomerStatusNotice()'));
async function run({customers=[],consultations=[],rows=[],status='ready',reject=false,auth=true,switchOwner=false}={}) {
 let shown=0,queries=[],owner='user-a'; const memory=new Map();
 const state={status,loadedFor:owner,data:{customers,consultations},section:'home'};
 const ctx={state,currentUserId:()=>owner,authenticated:()=>auth,personalItemScope:()=> '&or=(legacy_source.is.null)',sessionStorage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},window:{OSInsuworkGuide:{openWelcome:()=>{shown++;return true;}}},api:q=>{queries.push(q);if(switchOwner)owner='user-b';return reject?Promise.reject(Error('offline')):Promise.resolve(rows);}};
 vm.createContext(ctx);vm.runInContext(fragment+';maybeShowEmptyWorkspaceGuide();',ctx);await new Promise(r=>setImmediate(r));return {shown,queries};
}
(async()=>{assert.equal((await run()).shown,1);assert.equal((await run({customers:[{}]})).shown,0);assert.equal((await run({consultations:[{}]})).shown,0);assert.equal((await run({rows:[{id:'file'}]})).shown,0);assert.equal((await run({status:'partial'})).shown,0);assert.equal((await run({reject:true})).shown,0);assert.equal((await run({auth:false})).shown,0);assert.equal((await run({switchOwner:true})).shown,0);const q=(await run()).queries[0];assert.match(q,/owner_id=eq.user-a/);assert.match(q,/workspace_category.neq.settings/);console.log('PASS: 8 onboarding eligibility cases, owner isolation and settings exclusion');})();