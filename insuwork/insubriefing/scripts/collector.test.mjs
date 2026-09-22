import test from 'node:test';
import assert from 'node:assert/strict';
import {collect,requestNaver,parseDaumList,parseDaumMetadata,mergeEditorial} from './collector.mjs';
const now=new Date('2026-09-22T03:00:00Z'), sleep=async()=>{};
const title='폐암 진단 치료 선택지 확대', url='https://v.daum.net/v/20260922103127803';
const list=`<a href="${url}" data-title="${encodeURIComponent(title)}"><strong>${title}</strong></a>`;
const meta=`<meta property="og:title" content="${title}"><meta property="og:site_name" content="Daum | 매체"><meta property="og:regDate" content="20260922103127">`;
const response=(body,status=200)=>new Response(body,{status});
test('429 stops NAVER after one request and completes Daum fallback',async()=>{
  let naver=0,sections=0;
  const result=await collect({now,sleep,clientId:'test',clientSecret:'test',fetcher:async u=>{
    if(String(u).includes('ntruss')) {naver++;return response('{"error":{"errorCode":"429"}}',429);}
    if(String(u).includes('/news/')) {sections++;return response(list);}
    return response(meta);
  }});
  assert.equal(naver,1);assert.equal(sections,4);assert.equal(result.status.state,'degraded');
  assert.equal(result.items.length,1);assert.equal(result.items[0].source,'매체');assert.equal(result.items[0].description,'');
  assert.equal(result.items[0].publishedAt,'2026-09-22T01:31:27.000Z');
});
test('both sources failing never returns replacement articles',async()=>{
  const result=await collect({now,sleep,fetcher:async()=>response('unavailable',503)});
  assert.equal(result.status.state,'failed');assert.deepEqual(result.items,[]);
});
test('malformed listing and missing publication metadata fail closed',()=>{
  assert.throws(()=>parseDaumList('<html>changed</html>'));
  assert.throws(()=>parseDaumMetadata('<meta property="og:title" content="test">'));
  assert.equal(parseDaumList(list+list).length,1);
});
test('transient network and 503 retry, authentication failure does not',async()=>{
  let calls=0;
  const result=await requestNaver('test',{sleep,fetcher:async()=>{calls++;if(calls===1)throw Error('socket');if(calls===2)return response('',503);return response('{"items":[]}');}});
  assert.deepEqual(result,[]);assert.equal(calls,3);
  calls=0;
  await assert.rejects(requestNaver('test',{sleep,fetcher:async()=>{calls++;return response('',401);}}),/401/);
  assert.equal(calls,1);
});
test('all successful requests with no useful articles are a failure',async()=>{
  const unrelated=list.replace(encodeURIComponent(title),encodeURIComponent('정치 소식'));
  const result=await collect({now,sleep,clientId:'x',clientSecret:'x',fetcher:async u=>String(u).includes('ntruss')?response('{"items":[]}'):response(unrelated)});
  assert.equal(result.status.state,'failed');assert.deepEqual(result.items,[]);
});
test('manual articles survive recollection and keep their verified metadata',()=>{
  const manual={url,title:'직접 확인한 기사',verification:'기사 원문 직접 확인'};
  const prior={date:'2026-09-22',collectionMode:'editorial-direct',items:[manual]};
  assert.deepEqual(mergeEditorial(prior,[{url,title}],prior.date),[manual]);
  assert.deepEqual(mergeEditorial({...prior,collectionMode:'automatic+editorial'},[{url,title}],prior.date),[manual]);
  assert.deepEqual(mergeEditorial(prior,[{url,title}],'2026-09-23'),[{url,title}]);
});
