import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const libraryPath = resolve(root, 'data/library.json');
const contentPath = resolve(root, 'data/content.json');

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

const library = await readJson(libraryPath, {});
const content = await readJson(contentPath, { items: [] });
const newsItems = Array.isArray(content.items) ? content.items : [];

const latest = (matcher) => newsItems.find((item) => matcher(item)) || null;
const referenceFrom = (item) => item
  ? {
      title: item.title,
      url: item.url,
      source: item.source,
      publishedAt: item.publishedAt
    }
  : null;

const policy = latest((item) => /제도|금융위|금감원|보험개혁|실손24/.test(`${item.category} ${item.title}`));
const claim = latest((item) => /보험금|청구|분쟁|지급|실손24/.test(`${item.category} ${item.title}`));
const material = latest((item) => /보험|실손|암|뇌|심장|간병|치매|수술|통계|자료/.test(`${item.category} ${item.title}`));
const healthStat = latest((item) => /암|뇌혈관|심장질환|질병통계|건강통계|KOSIS/.test(`${item.category} ${item.title}`));

library.updatedAt = new Date().toISOString();
library.automation = {
  mode: 'scheduled',
  source: 'NAVER API HUB news search + curated official/statistical references'
};

delete library.injectedMaterials;

if (Array.isArray(library.today)) {
  if (policy && library.today[0]) {
    library.today[0].caption = '공식 발표 중 고객 영향 중심';
    library.today[0].latestReference = referenceFrom(policy);
  }

  if (claim && library.today[1]) {
    library.today[1].caption = '청구·분쟁·지급 사례 중심';
    library.today[1].latestReference = referenceFrom(claim);
  }

  if (library.today[2]) {
    library.today[2].title = '오늘 확인할 보험자료';
    library.today[2].caption = '자동수집 · 상담 자료 후보';
    library.today[2].latestReference = referenceFrom(material);
  }
}

if (healthStat && Array.isArray(library.healthStats) && library.healthStats[0]) {
  library.healthStats[0].latestReference = referenceFrom(healthStat);
}

await writeFile(libraryPath, `${JSON.stringify(library, null, 2)}\n`, 'utf8');
console.log('보험브리핑 메뉴 원장 갱신 완료');
