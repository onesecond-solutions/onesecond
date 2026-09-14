const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module');
function server(user) {
 let handler,calls=[];
 const ctx={Request,Response,console,Deno:{env:{get:n=>n==='SUPABASE_URL'?'https://pdnwgzneooyygfejrvbg.supabase.co':'test-only'},serve:f=>handler=f},fetch:async(url)=>{
 calls.push(url);
 if(url.endsWith('/auth/v1/user'))return user?Response.json(user):Response.json({}, {status:401});
 return Response.json([{legacy_payload:{coverage_analysis:{customerInfo:{name:'PRIVATE'},source:{name:'PRIVATE'},products:[{company:'PRIVATE'}],rows:[{id:'private-id',section:'암',group:'치료비3',name:'암주요 치료비',values:{p:'3000'},sourceDetails:['PRIVATE'],total:'3000'}]}}}]);
 }};
 vm.createContext(ctx);vm.runInContext(stripTypeScriptTypes(fs.readFileSync('supabase/functions/gemini-coverage-import/index.ts','utf8')),ctx);
 return {request:headers=>handler(new Request('https://test',{headers})),calls};
}
test('shared template requires a verified non-anonymous user, not a decoded JWT',async()=>{
 for(const user of [null,{id:'a',is_anonymous:true}]){const s=server(user);assert.equal((await s.request({authorization:'Bearer forged'})).status,401);assert.equal(s.calls.length,1);}
 const s=server({id:'normal'});assert.equal((await s.request({})).status,401);assert.equal(s.calls.length,0);
});
test('normal user receives structure only from exact owner template',async()=>{
 const s=server({id:'normal'}),r=await s.request({authorization:'Bearer verified'});assert.equal(r.status,200);const data=await r.json();
 assert.equal(data.rows[0].group,'치료비3');assert.equal(data.preserveTemplateLayout,true);
 assert.equal(JSON.stringify(data).includes('PRIVATE'),false);assert.deepEqual(data.products,[]);assert.deepEqual(data.rows[0].values,{});assert.equal(data.rows[0].total,'');
 assert.match(s.calls[1],/owner_id=eq.98c5f4f9-10c1-4ee1-a656-5c2ca63239fd/);assert.match(s.calls[1],/coverage_analysis_workspace=eq.true/);
});
test('all signed-in users enter analysis while template edit remains owner-only',()=>{
 const src=fs.readFileSync('js/insuwork.js','utf8'),ctx={logged:false,owner:'normal',localPreviewAllowed:()=>false,AZ_VIEWING_ROOM_OWNER_ID:'owner'};
 ctx.authenticated=()=>ctx.logged;ctx.currentUserId=()=>ctx.owner;vm.createContext(ctx);
 for(const name of ['canUseCoverageAnalysis','canEditCoverageTemplate'])vm.runInContext(src.match(new RegExp('  function '+name+'\\(\\) \\{[^\\n]+'))[0],ctx);
 assert.equal(ctx.canUseCoverageAnalysis(),false);ctx.logged=true;assert.equal(ctx.canUseCoverageAnalysis(),true);assert.equal(ctx.canEditCoverageTemplate(),false);ctx.owner='owner';assert.equal(ctx.canEditCoverageTemplate(),true);
});
