import assert from 'node:assert/strict';
import test from 'node:test';
import { classify, originalName } from './insuwork-index-briefing-leaflets.mjs';

test('업로드 경로에 보존된 한글 파일명을 복원한다', () => {
  const name = 'DB손해보험 암보험 상품개정.pdf';
  const encoded = Buffer.from(name).toString('base64url');
  assert.equal(originalName(`owner/2026-09-04/id--b64_${encoded}`), name);
});

test('회사·주제·검색 태그를 본문에서 분류한다', () => {
  const result = classify('DB손보 유병자 암보험 상품개정 및 인수기준 안내');
  assert.equal(result.insurer, 'DB손해보험');
  assert.equal(result.category, '인수기준');
  assert.ok(result.tags.includes('암'));
  assert.ok(result.tags.includes('유병자'));
});
