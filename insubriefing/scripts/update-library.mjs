import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const libraryPath = resolve(root, 'data/library.json');
const contentPath = resolve(root, 'data/content.json');
const injectedPath = resolve(root, 'data/injected-materials.json');

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
const injected = await readJson(injectedPath, { updatedAt: null, items: [] });

const newsItems = Array.isArray(content.items) ? content.items : [];
const injectedItems = Array.isArray(injected.items) ? injected.items : [];

const latest = (matcher) => newsItems.find((item) => matcher(item)) || null;
const sourceFrom = (item) =>
  item
    ? [
        {
          label: item.source || '원문',
          url: item.url
        }
      ]
    : [];

const policy = latest((item) => /제도|정책|금융감독원|금융위원회|실손24/.test(`${item.category} ${item.title}`));
const claim = latest((item) => /보험금|청구|지급|분쟁|실손24/.test(`${item.category} ${item.title}`));
const material = injectedItems[0] || latest((item) => /보장|실손|암|뇌|심장|수술|간병|치매|통계/.test(`${item.category} ${item.title}`));

library.updatedAt = new Date().toISOString();
library.automation = {
  mode: 'scheduled',
  source: 'NAVER API HUB news search + curated official references + injected materials',
  injectedMaterialCount: injectedItems.length
};

if (Array.isArray(library.today)) {
  if (policy && library.today[0]) {
    library.today[0].caption = '자동수집 · 공식 발표 우선 확인';
    library.today[0].latestReference = {
      title: policy.title,
      url: policy.url,
      source: policy.source,
      publishedAt: policy.publishedAt
    };
  }

  if (claim && library.today[1]) {
    library.today[1].caption = '자동수집 · 청구와 분쟁 사례';
    library.today[1].latestReference = {
      title: claim.title,
      url: claim.url,
      source: claim.source,
      publishedAt: claim.publishedAt
    };
  }

  if (material && library.today[2]) {
    library.today[2].title = injectedItems[0] ? '오늘 주입된 보험자료' : '오늘의 보험자료';
    library.today[2].caption = injectedItems[0] ? '데이폴더·대표 주입 자료' : '자동수집 · 자료 후보';
    library.today[2].latestReference = {
      title: material.title || material.summary || '자료 제목 없음',
      url: material.url,
      source: material.source || material.category || '자료함',
      publishedAt: material.publishedAt || material.date
    };
  }
}

library.injectedMaterials = injectedItems;

await writeFile(libraryPath, `${JSON.stringify(library, null, 2)}\n`, 'utf8');
console.log(`보험브리핑 메뉴 원장 갱신: 주입자료 ${injectedItems.length}건`);
