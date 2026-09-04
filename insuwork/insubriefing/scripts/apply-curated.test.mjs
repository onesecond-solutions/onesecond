import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../data/', import.meta.url);
const curated = JSON.parse(await readFile(new URL('curated/2026-09-04.json', root), 'utf8'));
const targets = await Promise.all([
  'briefing-latest.json',
  'content.json',
  'daily/2026-09-04.json'
].map(async (name) => JSON.parse(await readFile(new URL(name, root), 'utf8'))));

test('검수 기사가 오늘 브리핑 원장 세 곳에 중복 없이 동일하게 반영된다', () => {
  const expectedUrls = curated.items.map((item) => item.url);

  for (const payload of targets) {
    const urls = payload.items.map((item) => item.url);
    assert.equal(payload.date, curated.date);
    assert.equal(new Set(urls).size, urls.length);
    assert.deepEqual(urls.slice(0, expectedUrls.length), expectedUrls);

    for (const item of payload.items.slice(0, expectedUrls.length)) {
      assert.equal(item.verification, '원문 검수');
      assert.equal(item.description, '');
    }
  }

  assert.deepEqual(targets[0].items, targets[1].items);
  assert.deepEqual(targets[1].items, targets[2].items);
});
