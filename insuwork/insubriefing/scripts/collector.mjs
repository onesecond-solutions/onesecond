import { topics, normalize, selectItems, kstDay, strip, canonicalUrl } from './briefing-core.mjs';
export const daumSections = ['life', 'economy', 'society', 'tech'];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
export function parseDaumList(html) {
  const found = new Map();
  for (const match of html.matchAll(/<a\b([^>]+)>([\s\S]*?)<\/a>/gi)) {
    const url = match[1].match(/\bhref="(https:\/\/v\.daum\.net\/v\/\d+)"/)?.[1];
    const encoded = match[1].match(/\bdata-title="([^"]+)"/)?.[1];
    if (!url || !encoded) continue;
    try { found.set(url, {url, title:strip(decodeURIComponent(encoded))}); } catch {}
  }
  if (!found.size) throw Error('다음 목록 형식 변경 또는 빈 목록');
  return [...found.values()];
}
export function parseDaumMetadata(html) {
  const meta = {};
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const key = tag[0].match(/\bproperty=["']([^"']+)["']/i)?.[1];
    const value = tag[0].match(/\bcontent="([^"]*)"/i)?.[1];
    if (key && value !== undefined) meta[key] = strip(value);
  }
  const date = meta['og:regDate'];
  if (!/^\d{14}$/.test(date || '') || !meta['og:title'] || !meta['og:site_name']) throw Error('다음 기사 메타데이터 누락');
  return {title:meta['og:title'], source:meta['og:site_name'].replace(/^Daum\s*\|\s*/, ''),
    pubDate:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T${date.slice(8,10)}:${date.slice(10,12)}:${date.slice(12,14)}+09:00`};
}
export async function requestNaver(query, {fetcher=fetch, sleep=pause, clientId, clientSecret}) {
  const endpoint = new URL('https://naverapihub.apigw.ntruss.com/search/v1/news');
  endpoint.searchParams.set('query', query); endpoint.searchParams.set('display', '30'); endpoint.searchParams.set('sort', 'date');
  for (let attempt=0; attempt<3; attempt++) {
    let response;
    try { response = await fetcher(endpoint, {signal:AbortSignal.timeout(20000), headers:{'X-NCP-APIGW-API-KEY-ID':clientId,'X-NCP-APIGW-API-KEY':clientSecret}}); }
    catch { if (attempt===2) throw Error('NAVER 연결 실패'); await sleep(3000); continue; }
    if (response.ok) { const body=await response.json(); if (!Array.isArray(body.items)) throw Error('NAVER 검색 결과 형식 오류'); return body.items; }
    if (response.status===429) {
      let body; try { body=await response.json(); } catch {}
      const code=String(body?.error?.errorCode || body?.errorCode || body?.code || 'unknown').replace(/[^\w-]/g,'').slice(0,30);
      throw Error(`NAVER HTTP 429 (code=${code}): 호출 제한, 추가 호출 중단`);
    }
    if (response.status<500 || attempt===2) throw Error(`NAVER HTTP ${response.status}`);
    await sleep(Math.min(60000, Math.max(3000, Number(response.headers.get('retry-after'))*1000 || 3000)));
  }
}
export async function collect({now=new Date(), fetcher=fetch, sleep=pause, clientId, clientSecret}={}) {
  const candidates=[], errors=[], sources=[];
  let naverComplete=false, daumComplete=false;
  try {
    if (!clientId || !clientSecret) throw Error('NAVER 인증 설정 누락');
    const rotation=Math.floor(Date.parse(kstDay(now))/86400000);
    for (const topic of topics) {
      const count=Math.min(topic.dailyQueries || 1, topic.queries.length);
      const queries=count===1 ? [topic.queries[rotation%topic.queries.length]] : topic.queries.slice(0,count);
      for (const query of queries) {
        const rows=await requestNaver(query,{fetcher,sleep,clientId,clientSecret});
        candidates.push(...rows.map(row=>normalize(row,topic,now)).filter(Boolean));
        await sleep(1000);
      }
    }
    naverComplete=true; sources.push('NAVER API HUB');
  } catch(e) { errors.push(e.message); }
  // 목록과 발행 메타데이터만 사용한다. 본문은 저장하거나 요약하지 않는다.
  try {
    const links=new Map();
    for (const section of daumSections) {
      const response=await fetcher(`https://news.daum.net/news/${section}`,{signal:AbortSignal.timeout(20000)});
      if (!response.ok) throw Error(`다음 ${section} HTTP ${response.status}`);
      for (const row of parseDaumList(await response.text())) links.set(row.url,row);
      await sleep(500);
    }
    const relevant=[...links.values()].filter(row=>topics.some(topic=>normalize({title:row.title,link:row.url,pubDate:now.toISOString()},topic,now))).slice(0,30);
    for (const row of relevant) {
      const response=await fetcher(row.url,{signal:AbortSignal.timeout(20000)});
      if (!response.ok) throw Error(`다음 기사 HTTP ${response.status}`);
      const meta=parseDaumMetadata(await response.text());
      for (const topic of topics) {
        const item=normalize({...meta,link:row.url,description:''},topic,now);
        if (item) candidates.push({...item,source:meta.source,verification:'원문 확인 필요'});
      }
      await sleep(500);
    }
    daumComplete=true; sources.push('다음뉴스 공개 목록');
  } catch(e) { errors.push(e.message); }
  const items=selectItems(candidates);
  const state=!(naverComplete || daumComplete) || !items.length ? 'failed' : errors.length ? 'degraded' : 'ok';
  return {items:state==='failed'?[]:items, status:{date:kstDay(now),checkedAt:now.toISOString(),state,sources,errors,articleCount:items.length}};
}
export function mergeEditorial(previous, items, day) {
  if (previous?.date!==day) return items;
  const editorial=(previous.items || []).filter(item=>previous.collectionMode?.startsWith('editorial') || /원문.*확인|원문 검수/.test(item.verification || '') && item.verification!=='원문 확인 필요');
  const urls=new Set(editorial.map(item=>canonicalUrl(item.url)));
  return [...editorial,...items.filter(item=>!urls.has(canonicalUrl(item.url)) && !editorial.some(e=>e.title===item.title))];
}
