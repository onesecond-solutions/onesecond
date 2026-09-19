const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('lineup IME preserves search field while composition is active and updates only results',async()=>{
 let shellWrites=0,resultWrites=0,html='',input={value:'',selectionStart:0,selectionEnd:0};
 const results={set innerHTML(v){html=v;resultWrites++}};
 const root={set innerHTML(v){shellWrites++;},querySelectorAll(){return []},querySelector(sel){return sel==='[data-iwpl-search]'?input:sel==='[data-iwpl-results]'?results:null}};
 const c={window:{},document:{querySelector:()=>root},fetch:async()=>({ok:true,json:async()=>({companies:[{company:'삼성화재',type:'nonlife',products:[{name:'건강보험',purpose:'건강·질병'}]},{company:'현대해상',type:'nonlife',products:[{name:'종합보험'}]}]})})};vm.createContext(c);vm.runInContext(fs.readFileSync('insuwork/product-lineups.js','utf8'),c);c.window.OSInsuworkProductLineups.mount();await new Promise(setImmediate);
 const before=shellWrites;input.oncompositionstart();input.value='ㅅ';input.oninput({isComposing:true});input.value='삼';input.oninput({isComposing:false});assert.equal(resultWrites,0);assert.equal(shellWrites,before);
 input.value='삼성';input.selectionStart=input.selectionEnd=1;input.oncompositionend();assert.equal(resultWrites,1);assert.match(html,/삼성화재/);assert.doesNotMatch(html,/현대해상/);assert.equal(shellWrites,before);assert.equal(input.selectionStart,1);
 input.oninput({isComposing:false});assert.equal(resultWrites,1);input.value='';input.oninput({});assert.match(html,/현대해상/);assert.equal(shellWrites,before);
});
