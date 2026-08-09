import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientId = process.env.NAVER_CLIENT_ID;
const clientSecret = process.env.NAVER_CLIENT_SECRET;
if (!clientId || !clientSecret) throw new Error('NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET이 필요합니다.');

const queries = [
  { query: '보험 금융감독원 보도자료', category: '정책·제도', include: /(보험|금융감독원|금융위원회)/, context: /(정책|제도|감독|발표|개정|시행|개선|보도)/ },
  { query: '보험금 청구 제도', category: '보험금·청구', include: /(보험금|보험료|보험 청구|청구)/, context: /(청구|지급|제도|개선|절차|서류|심사)/ },
  { query: '실손보험 금융위원회', category: '보험뉴스', include: /(실손|실비|보험)/, context: /(보험|보장|의료|금융|개편|개정)/ },
  { query: '보험 신상품 출시', category: '상품소식', include: /(보험|보장)/, context: /(신상품|출시|상품|개정|판매|특약)/ }
];
const strip = (value = '') => value.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const host = (value) => { try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return ''; } };
const excluded = /(방화|살인|폭행|마약|도박|실형|징역|구속|횡령|성폭행|사망사고|보험금 노리고)/;
const seen = new Set();
const items = [];

for (const entry of queries) {
  const endpoint = new URL('https://naverapihub.apigw.ntruss.com/search/v1/news');
  endpoint.searchParams.set('query', entry.query);
  endpoint.searchParams.set('display', '20');
  endpoint.searchParams.set('sort', 'date');
  const response = await fetch(endpoint, { headers: { 'X-NCP-APIGW-API-KEY-ID': clientId, 'X-NCP-APIGW-API-KEY': clientSecret } });
  if (!response.ok) throw new Error(`네이버 API 오류: ${response.status}`);
  const data = await response.json();
  let categoryCount = 0;
  for (const article of data.items || []) {
    const url = article.originallink || article.link;
    const title = strip(article.title);
    const key = title.toLowerCase();
    if (!url || seen.has(key) || excluded.test(title) || !entry.include.test(title) || !entry.context.test(title)) continue;
    seen.add(key);
    items.push({ category: entry.category, title, source: host(url), url, publishedAt: new Date(article.pubDate).toISOString() });
    categoryCount += 1;
    if (categoryCount >= 8) break;
  }
}

items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
const output = resolve(dirname(fileURLToPath(import.meta.url)), '../data/content.json');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({ updatedAt: new Date().toISOString(), items: items.slice(0, 32) }, null, 2)}\n`, 'utf8');
console.log(`인슈브리핑 ${Math.min(items.length, 32)}건 저장`);
