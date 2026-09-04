#!/usr/bin/env node
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const base = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_KEY || '';
const limit = Math.max(1, Math.min(Number(process.env.INDEX_LIMIT) || 8, 250));
const concurrency = Math.max(1, Math.min(Number(process.env.INDEX_CONCURRENCY) || 2, 4));

const headers = { apikey: key, Authorization: `Bearer ${key}` };
async function rest(path, options = {}) {
  const response = await fetch(`${base}/rest/v1/${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) }, signal: AbortSignal.timeout(180000) });
  if (!response.ok) throw new Error(`${path} ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return response.status === 204 ? null : response.json();
}
export function originalName(path) {
  const baseName = String(path || '').split('/').pop() || '';
  const encoded = baseName.split('--b64_')[1];
  if (!encoded) return baseName;
  try { return Buffer.from(encoded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'); }
  catch { return baseName; }
}
function publicUrl(path) { return `${base}/storage/v1/object/public/briefing-leaflets/${String(path).split('/').map(encodeURIComponent).join('/')}`; }
const insurers = ['DB손해보험','DB생명','KB손해보험','KB라이프','메리츠화재','현대해상','삼성화재','삼성생명','흥국화재','흥국생명','롯데손해보험','한화손해보험','한화생명','라이나손해보험','라이나생명','하나손해보험','하나생명','NH농협손해보험','NH농협생명','AIG손해보험','ABL생명','AIA생명','교보생명','동양생명','미래에셋생명','신한라이프','메트라이프','KDB생명','iM라이프','처브라이프'];
const aliases = { DB손해보험:['DB손보','DB화재','동부화재'], KB손해보험:['KB손보'], NH농협손해보험:['농협손보','농협손해보험'], NH농협생명:['농협생명'], 한화손해보험:['한화손보'], 하나손해보험:['하나손보'], 라이나손해보험:['라이나손보'], 롯데손해보험:['롯데손보'], 메리츠화재:['메리츠'], 신한라이프:['신한생명'], iM라이프:['DGB생명'] };
const tagWords = ['암','뇌','심장','치매','간병','실손','수술','입원','통원','치아','종신','연금','운전자','자동차','화재','배상책임','어린이','태아','유병자','건강체','갱신형','비갱신형','인수기준','보험료','면책','감액','고지','보상','청구','개정','판매중지','상품개정'];
export function classify(text) {
  const insurer = insurers.find((name) => [name, ...(aliases[name] || [])].some((term) => text.includes(term))) || '';
  let category = '기타 보험이슈';
  if (/인수기준|가입한도|심사|고지/.test(text)) category = '인수기준';
  else if (/상품개정|개정|판매중지|판매종료|출시/.test(text)) category = '상품개정';
  else if (/보상|보험금|청구|면책|분쟁/.test(text)) category = '보상·청구';
  else if (/암|뇌|심장|질병|치료|수술|건강/.test(text)) category = '질병·건강';
  else if (/영업|시상|프로모션|판매전략/.test(text)) category = '영업자료';
  return { insurer, category, tags: tagWords.filter((word) => text.includes(word)).slice(0, 24) };
}
async function patch(leafletId, body) {
  await rest(`briefing_leaflet_search?on_conflict=leaflet_id`, { method:'POST', headers:{ 'Content-Type':'application/json', Prefer:'resolution=merge-duplicates,return=minimal' }, body:JSON.stringify({ leaflet_id:leafletId, ...body, updated_at:new Date().toISOString() }) });
}
async function extract(row) {
  const title = originalName(row.storage_path) || `${row.received_date} 보험이슈 자료`;
  if (Number(row.file_size || 0) > 18 * 1024 * 1024) { await patch(row.id, { title, ocr_status:'oversize', indexed_at:new Date().toISOString() }); return 'oversize'; }
  await patch(row.id, { title, ocr_status:'processing', error_message:null });
  let text = '';
  try {
    if (/^text\//.test(row.mime_type || '')) {
      const response = await fetch(publicUrl(row.storage_path), { signal:AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`file ${response.status}`);
      text = await response.text();
    } else {
      const response = await fetch(`${base}/functions/v1/ocr-extract`, { method:'POST', headers:{ ...headers, 'Content-Type':'application/json' }, body:JSON.stringify({ fileUrl:publicUrl(row.storage_path) }), signal:AbortSignal.timeout(180000) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`ocr ${response.status}: ${String(result.error || '').slice(0, 180)}`);
      text = String(result.text || '');
    }
    const meta = classify(`${title}\n${text}`);
    await patch(row.id, { title, ...meta, extracted_text:text, ocr_status:text.trim() ? 'done' : 'empty', indexed_at:new Date().toISOString(), error_message:null });
    return text.trim() ? 'done' : 'empty';
  } catch (error) {
    await patch(row.id, { title, ocr_status:'error', error_message:String(error.message || error).slice(0, 500) });
    return 'error';
  }
}

export async function main() {
  assert(base && key, 'SUPABASE_URL / SUPABASE_SERVICE_KEY가 필요합니다.');
  const leaflets = await rest('briefing_leaflets?deleted_at=is.null&select=id,storage_path,mime_type,file_size,received_date&order=received_date.asc,sort_order.asc');
  const existing = await rest('briefing_leaflet_search?select=leaflet_id,ocr_status');
  const status = new Map(existing.map((row) => [row.leaflet_id, row.ocr_status]));
  const pending = leaflets.filter((row) => !status.has(row.id) || ['pending','error'].includes(status.get(row.id))).slice(0, limit);
  const counts = {};
  let cursor = 0;
  await Promise.all(Array.from({ length:Math.min(concurrency, pending.length) }, async () => {
    while (cursor < pending.length) {
      const row = pending[cursor++];
      const result = await extract(row);
      counts[result] = (counts[result] || 0) + 1;
    }
  }));
  console.log(JSON.stringify({ total:leaflets.length, picked:pending.length, remaining:Math.max(0, leaflets.length - existing.filter((x) => ['done','empty','skip','oversize'].includes(x.ocr_status)).length - pending.length), counts }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
