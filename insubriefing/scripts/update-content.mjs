import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientId = process.env.NAVER_CLIENT_ID;
const clientSecret = process.env.NAVER_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  throw new Error('NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET이 필요합니다.');
}

const queries = [
  {
    query: '보험 금융감독원 금융위원회 보도자료',
    category: '제도·정책',
    include: /(보험|실손|금융감독원|금융위원회|소비자|제도|개정)/,
    context: /(보도|발표|제도|정책|개정|시행|개선|감독|소비자)/
  },
  {
    query: '보험금 청구 실손24 보험금 지급 분쟁',
    category: '보험금 청구',
    include: /(보험금|청구|실손24|지급|분쟁|서류)/,
    context: /(청구|지급|분쟁|서류|접수|심사|민원|소비자)/
  },
  {
    query: '실손보험 암보험 뇌혈관 허혈성심장 수술비 보험',
    category: '보장 이슈',
    include: /(실손|실비|암|뇌혈관|허혈성|심장|수술비|간병|치매|보험)/,
    context: /(보장|진단|치료|수술|보험료|갱신|가입|특약)/
  },
  {
    query: '보험 상품 출시 개정 특약 보장',
    category: '상품 소식',
    include: /(보험|보장|특약|상품|출시|개정)/,
    context: /(출시|개정|상품|특약|판매|보장|보험료)/
  },
  {
    query: '암 발생 통계 건강보험 진료비 통계 뇌심장질환',
    category: '의학·건강 통계',
    include: /(암|뇌|심장|질환|건강보험|진료비|통계|환자)/,
    context: /(통계|발생|진료비|환자|유병|사망|건강보험|질병)/
  }
];

const strip = (value = '') =>
  value
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();

const host = (value) => {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

const excluded =
  /(방화|연예|마약|도박|구속|폭행|정치 공방|보험사기단|보험사기 혐의|보험금 노린|살해|사망사고)/;

const seen = new Set();
const items = [];

for (const entry of queries) {
  const endpoint = new URL('https://naverapihub.apigw.ntruss.com/search/v1/news');
  endpoint.searchParams.set('query', entry.query);
  endpoint.searchParams.set('display', '20');
  endpoint.searchParams.set('sort', 'date');

  const response = await fetch(endpoint, {
    headers: {
      'X-NCP-APIGW-API-KEY-ID': clientId,
      'X-NCP-APIGW-API-KEY': clientSecret
    }
  });

  if (!response.ok) {
    throw new Error(`네이버 API 오류: ${response.status}`);
  }

  const data = await response.json();
  let categoryCount = 0;

  for (const article of data.items || []) {
    const url = article.originallink || article.link;
    const title = strip(article.title);
    const key = `${entry.category}:${title.toLowerCase()}`;
    if (
      !url ||
      seen.has(key) ||
      excluded.test(title) ||
      !entry.include.test(title) ||
      !entry.context.test(title)
    ) {
      continue;
    }

    seen.add(key);
    items.push({
      category: entry.category,
      title,
      source: host(url),
      url,
      publishedAt: new Date(article.pubDate).toISOString()
    });
    categoryCount += 1;
    if (categoryCount >= 8) break;
  }
}

items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

const output = resolve(dirname(fileURLToPath(import.meta.url)), '../data/content.json');
await mkdir(dirname(output), { recursive: true });
await writeFile(
  output,
  `${JSON.stringify({ updatedAt: new Date().toISOString(), items: items.slice(0, 40) }, null, 2)}\n`,
  'utf8'
);

console.log(`보험브리핑 ${Math.min(items.length, 40)}건 저장`);
