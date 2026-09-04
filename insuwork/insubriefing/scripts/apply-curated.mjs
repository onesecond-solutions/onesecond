import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalUrl } from './briefing-core.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../data');
const updatedAt = new Date().toISOString();
const curatedPath = process.argv[2];
if (!curatedPath) throw new Error('curated JSON path is required');
const curated = JSON.parse(await readFile(resolve(curatedPath), 'utf8'));
if (!/^\d{4}-\d{2}-\d{2}$/.test(curated.date) || !Array.isArray(curated.items) || !curated.items.length) throw new Error('invalid curated briefing');
const additions = curated.items.map((item) => {
  const url = canonicalUrl(item.url);
  if (!url || !item.title || !item.source || !Number.isFinite(Date.parse(item.publishedAt))) throw new Error(`invalid curated item: ${item.title || item.url}`);
  return { id:createHash('sha256').update(url).digest('hex').slice(0,20), category:item.category, title:item.title, source:item.source, url,
    publishedAt:new Date(item.publishedAt).toISOString(), description:'', sourceType:'언론 보도', verification:'원문 검수', shareUse:'고객 안내·상담 참고', priority:5 };
});
async function merge(path) {
  const payload=JSON.parse(await readFile(path,'utf8'));
  if (payload.date !== curated.date) throw new Error(`date mismatch: ${path}`);
  const urls=new Set(additions.map(item=>item.url));
  payload.items=[...additions,...payload.items.filter(item=>!urls.has(canonicalUrl(item.url)))];
  payload.updatedAt=updatedAt;
  payload.collectionMode='automatic+editorial';
  await writeFile(path,`${JSON.stringify(payload,null,2)}\n`,'utf8');
}
const daily=resolve(root,'daily',`${curated.date}.json`);
await merge(daily);
for (const name of ['content.json','briefing-latest.json']) await merge(resolve(root,name));
console.log(`검수 기사 ${additions.length}건 추가: ${curated.date}`);
