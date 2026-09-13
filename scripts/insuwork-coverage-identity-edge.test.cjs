const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{stripTypeScriptTypes}=require('node:module');
test('OCR response schema requests and returns customer identity with existing product and row data',async()=>{
 let handler,requestBody;const output={customerInfo:{name:'테스트 고객',birthDate:'1987-12-26'},products:[],rows:[]};
 const context={Response,Request,atob,console,Deno:{env:{get:()=> 'test-only'},serve:fn=>handler=fn},fetch:async(url,options)=>{requestBody=JSON.parse(options.body);return Response.json({candidates:[{content:{parts:[{text:JSON.stringify(output)}]}}]});}};
 vm.createContext(context);vm.runInContext(stripTypeScriptTypes(fs.readFileSync('supabase/functions/gemini-coverage-import/index.ts','utf8')),context);
 const token='x.'+Buffer.from(JSON.stringify({sub:'98c5f4f9-10c1-4ee1-a656-5c2ca63239fd'})).toString('base64')+'.x';
 const response=await handler(new Request('http://localhost',{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify({data:'aGVsbG8=',mimeType:'image/png'})}));
 assert.equal(response.status,200);assert.deepEqual(await response.json(),output);
 assert.ok(requestBody.generationConfig.responseSchema.required.includes('customerInfo'));
 assert.match(requestBody.systemInstruction.parts[0].text,/생년월일이 없거나 일부가 가려졌으면 빈 문자열/);
});
