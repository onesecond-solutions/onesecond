import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { topics, kstDay } from './briefing-core.mjs';
import { collect, mergeEditorial } from './collector.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../data');
const now=new Date(), day=kstDay(now);
const result=await collect({now,clientId:process.env.NAVER_CLIENT_ID,clientSecret:process.env.NAVER_CLIENT_SECRET});
console.log(JSON.stringify(result.status,null,2));
if (process.argv.includes('--dry-run')) {
  console.log(result.items.map(i=>`${i.category}: ${i.title}`).join('\n'));
  process.exitCode=result.status.state==='failed'?1:0;
} else {
  async function atomic(name,value) {const target=resolve(root,name);await writeFile(target+'.tmp',JSON.stringify(value,null,2)+'\n');await rename(target+'.tmp',target);}
  await mkdir(resolve(root,'daily'),{recursive:true});
  await atomic('collection-status.json',result.status);
  if (result.status.state==='failed') throw Error('수집 실패: 기존 기사 유지. collection-status.json 확인');
  let previous;try {previous=JSON.parse(await readFile(resolve(root,`daily/${day}.json`),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  const items=mergeEditorial(previous,result.items,day);
  const payload={updatedAt:now.toISOString(),date:day,source:result.status.sources.join(' + '),collectionMode:'automatic+editorial',categories:topics.map(t=>t.category),items};
  await atomic(`daily/${day}.json`,payload);
  await atomic('content.json',payload);
  await atomic('briefing-latest.json',payload);
  let archive;try {archive=JSON.parse(await readFile(resolve(root,'briefing-archive.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;archive={dates:[]};}
  await atomic('briefing-archive.json',{dates:[day,...archive.dates.filter(d=>d!==day)].sort().reverse()});
  console.log(`뉴스 브리핑 ${day}: ${items.length}건 (${result.status.state})`);
}
