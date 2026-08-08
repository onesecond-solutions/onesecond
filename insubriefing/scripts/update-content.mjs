import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientId = process.env.NAVER_CLIENT_ID;
const clientSecret = process.env.NAVER_CLIENT_SECRET;
if (!clientId || !clientSecret) throw new Error('NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET이 필요합니다.');

const queries = [
  { query: '보험 금융감독원', category: '정책·제도' },
  { query: '보험금 청구', category: '보험금·청구' },
  { query: '실손보험', category: '보험뉴스' },
  { query: '보험 상품 출시', category: '상품소식' }
];
const strip = (value = '') => value.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const host = (value) => { try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return ''; } };
const seen = new Set();
const items = [];

for (const entry of queries) {
  const endpoint = new URL('https://openapi.naver.com/v1/search/news.json');
  endpoint.searchParams.set('query', entry.query);
  endpoint.searchParams.set('display', '20');
  endpoint.searchParams.set('sort', 'date');
  const response = await fetch(endpoint, { headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret } });
  if (!response.ok) throw new Error(`네이버 API 오류: ${response.status}`);
  const data = await response.json();
  for (const article of data.items || []) {
    const url = article.originallink || article.link;
    const key = strip(article.title).toLowerCase();
    if (!url || seen.has(key)) continue;
    seen.add(key);
    items.push({ category: entry.category, title: strip(article.title), source: host(url), url, publishedAt: new Date(article.pubDate).toISOString() });
  }
}

items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
const output = resolve(dirname(fileURLToPath(import.meta.url)), '../data/content.json');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({ updatedAt: new Date().toISOString(), items: items.slice(0, 60) }, null, 2)}\n`, 'utf8');
console.log(`인슈브리핑 ${Math.min(items.length, 60)}건 저장`);
