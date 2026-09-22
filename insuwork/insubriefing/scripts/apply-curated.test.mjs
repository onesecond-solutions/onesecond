import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
const root=new URL('../data/',import.meta.url);
const read=async name=>JSON.parse(await readFile(new URL(name,root),'utf8'));
test('과거 검수 기사는 해당 날짜 기록에 보존된다',async()=>{
  const curated=await read('curated/2026-09-04.json'), daily=await read(`daily/${curated.date}.json`);
  assert.equal(daily.date,curated.date);
  for(const expected of curated.items) {
    const matches=daily.items.filter(item=>item.url===expected.url);
    assert.equal(matches.length,1);assert.equal(matches[0].verification,'원문 검수');assert.equal(matches[0].description,'');
  }
});
test('현재 브리핑 원장 세 곳은 같은 날짜와 중복 없는 기사를 유지한다',async()=>{
  const latest=await read('briefing-latest.json');
  for(const payload of [latest,await read('content.json'),await read(`daily/${latest.date}.json`)]) {
    assert.equal(payload.date,latest.date);assert.deepEqual(payload.items,latest.items);
    assert.equal(new Set(payload.items.map(item=>item.url)).size,payload.items.length);
  }
});
