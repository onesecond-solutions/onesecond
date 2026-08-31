import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { topics, normalize, selectItems, kstDay } from './briefing-core.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../data');
const now = new Date(), day = kstDay(now);
const clientId = process.env.NAVER_CLIENT_ID, clientSecret = process.env.NAVER_CLIENT_SECRET;
if (!clientId || !clientSecret) throw new Error('기존 NAVER API HUB 인증 설정을 확인해 주세요.');
async function request(query) {
  const endpoint = new URL('https://naverapihub.apigw.ntruss.com/search/v1/news');
  endpoint.searchParams.set('query', query); endpoint.searchParams.set('display', '30'); endpoint.searchParams.set('sort', 'date');
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(endpoint, {signal: AbortSignal.timeout(20000), headers: {'X-NCP-APIGW-API-KEY-ID':clientId,'X-NCP-APIGW-API-KEY':clientSecret}});
    if (response.ok) return response.json();
    console.warn(`검색 재시도 ${attempt+1}: HTTP ${response.status}, 대기 ${response.headers.get('retry-after') || '30'}초`);
    if (response.status !== 429 && response.status < 500) throw new Error(`뉴스 API 응답 ${response.status}`);
    await new Promise(r => setTimeout(r, Math.min(60000, Math.max(30000, Number(response.headers.get('retry-after') || 0) * 1000))));
  }
  throw new Error('뉴스 API 재시도 한도 초과');
}
await mkdir(resolve(root, 'daily'), {recursive:true});
const candidates = [], errors = []; let successes = 0;
for (const topic of topics) for (const query of topic.queries) {
  await new Promise(r => setTimeout(r, 7000));
  try { const data = await request(query); if (!Array.isArray(data.items)) throw new Error('검색 결과 형식 오류'); successes++;
    candidates.push(...data.items.map(a => normalize(a, topic, now)).filter(Boolean));
  } catch (e) { errors.push({category:topic.category, query, error:e.message}); }
}
const items = selectItems(candidates);
// 일부 실패로 완전한 기존 자료를 덮어쓰지 않는다. 다음 예약 실행에서 재시도한다.
if (errors.length || !items.length) throw new Error(`수집 미완료: 성공 ${successes}, 실패 ${errors.length}, 기사 ${items.length}. 기존 자료 유지. ${JSON.stringify(errors)}`);
const payload = {updatedAt:now.toISOString(), date:day, source:'NAVER API HUB 뉴스 검색', categories:topics.map(t=>t.category), items};
async function atomic(name, value) {const target=resolve(root,name); await writeFile(target+'.tmp',JSON.stringify(value,null,2)+'\n'); await rename(target+'.tmp',target);}
await atomic(`daily/${day}.json`,payload);
await atomic('content.json',payload);
await atomic('briefing-latest.json',payload);
let archive; try {archive=JSON.parse(await readFile(resolve(root,'briefing-archive.json'),'utf8'));} catch {archive={dates:[]};}
await atomic('briefing-archive.json',{dates:[day,...archive.dates.filter(d=>d!==day)].sort().reverse()});
console.log(`고객 브리핑 ${day}: ${items.length}건, ${new Set(items.map(i=>i.category)).size}개 분야, ${successes}개 검색 완료`);
