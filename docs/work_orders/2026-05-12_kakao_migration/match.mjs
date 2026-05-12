#!/usr/bin/env node
// match.mjs — 4팀 단톡방 ↔ Drive 짝 매칭 + insert_dryrun.sql 박음
// 본 트랙: docs/work_orders/2026-05-12_kakao_migration/
// 의존성 0 (Node native), RFC 4180 CSV 파서 + NFC 정규화

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

// ─── RFC 4180 CSV 파서 (native) ──────────────────────────────────
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const rows = [];
  let row = [], field = '', inQuotes = false, i = 0;
  const len = text.length;
  while (i < len) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < len && text[i + 1] === '"') { field += '"'; i += 2; }
        else { inQuotes = false; i++; }
      } else { field += c; i++; }
    } else {
      if (c === '"') { inQuotes = true; i++; }
      else if (c === ',') { row.push(field); field = ''; i++; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; }
      else if (c === '\r') { i++; }
      else { field += c; i++; }
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function csvToObjects(rows) {
  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).filter(r => r.length === headers.length).map(r => {
    const obj = {};
    headers.forEach((h, idx) => obj[h] = r[idx]);
    return obj;
  });
}

// ─── 정규화 ─────────────────────────────────────────────────────
function normalize(s) {
  if (!s) return '';
  return s.normalize('NFC').trim().replace(/\s+/g, ' ');
}

function baseName(filename) {
  const idx = filename.lastIndexOf('.');
  return idx > 0 ? filename.slice(0, idx) : filename;
}

function stripDup(name) {
  return name.replace(/\s+\(\d+\)\s*$/, '').trim();
}

// ─── 매칭 3단 ────────────────────────────────────────────────────
function matchFile(label, driveIndex, normalizedIndex, baseIndex) {
  const exact = driveIndex.get(label);
  if (exact) return { ...exact, match_method: 'exact' };

  const nLabel = normalize(label);
  const normMatch = normalizedIndex.get(nLabel);
  if (normMatch) return { ...normMatch, match_method: 'normalized' };

  const labelBase = stripDup(baseName(nLabel));
  const baseMatch = baseIndex.get(labelBase);
  if (baseMatch) return { ...baseMatch, match_method: 'base_prefix' };

  return { match_method: 'unmatched' };
}

// ─── 라이센스 위험 키워드 ─────────────────────────────────────────
const INSURER_KEYWORDS = [
  '라이나', '메리츠', '한화', 'KB', 'DB', '삼성', '롯데',
  '농협', '흥국', '현대해상', '하나', 'ABL', '신한'
];

function detectLicenseRisk(text, fileNames) {
  const risks = new Set();
  const combined = (text || '') + ' ' + (fileNames || []).join(' ');
  for (const kw of INSURER_KEYWORDS) {
    if (combined.includes(kw)) risks.add(kw);
  }
  return [...risks];
}

// ─── 첨부 형식 화이트리스트 (Phase A 15형식 — Q8 임시) ──────────────
const SUPPORTED_EXT = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'pdf',
  'xls', 'xlsx', 'doc', 'docx', 'hwp',
  'mp4', 'mov', 'webm', 'mp3', 'wav'
]);

// ─── SQL escape ──────────────────────────────────────────────────
function sqlStr(s) {
  if (s === null || s === undefined) return 'NULL';
  return "'" + String(s).replace(/'/g, "''") + "'";
}

// ─── 메인 ────────────────────────────────────────────────────────
console.log('[1/7] Loading clusters_full.json...');
const clusters = JSON.parse(readFileSync(join(ROOT, 'clusters_full.json'), 'utf-8'));
console.log(`  → ${clusters.length} clusters`);

console.log('[2/7] Loading file_index (Phase 1 + Phase 2)...');
const idx1 = csvToObjects(parseCSV(readFileSync(join(ROOT, 'file_index.csv'), 'utf-8')));
const idx2 = csvToObjects(parseCSV(readFileSync(join(ROOT, 'file_index_phase2.csv'), 'utf-8')));
const idx = [...idx1, ...idx2];
console.log(`  → Phase 1: ${idx1.length} / Phase 2: ${idx2.length} / Total: ${idx.length}`);

console.log('[3/7] Loading file_content (extraction metadata)...');
const ct1 = csvToObjects(parseCSV(readFileSync(join(ROOT, 'file_content.csv'), 'utf-8')));
const ct2 = csvToObjects(parseCSV(readFileSync(join(ROOT, 'file_content_phase2.csv'), 'utf-8')));
const ct = [...ct1, ...ct2];
console.log(`  → Total content rows: ${ct.length}`);

const contentMap = new Map();
for (const c of ct) {
  const len = (c.extracted_text || '').length;
  contentMap.set(c.id, {
    extraction_method: c.extraction_method || null,
    has_extracted_text: len >= 200
  });
}

console.log('[4/7] Building drive index maps...');
const driveIndex = new Map();
const normalizedIndex = new Map();
const baseIndex = new Map();
for (const f of idx) {
  const size = parseInt(f.size_bytes, 10) || 0;
  const content = contentMap.get(f.id) || {};
  const info = {
    drive_id: f.id,
    drive_filename: f.filename,
    extension: (f.extension || '').toLowerCase(),
    size_bytes: size,
    oversize_10mb: size > 10485760,
    has_extracted_text: content.has_extracted_text || false,
    extraction_method: content.extraction_method,
    source_zip: f.source_zip
  };
  driveIndex.set(f.filename, info);
  normalizedIndex.set(normalize(f.filename), info);
  const b = stripDup(baseName(normalize(f.filename)));
  if (!baseIndex.has(b)) baseIndex.set(b, info);
}
console.log(`  → ${driveIndex.size} unique filenames / ${baseIndex.size} base keys`);

console.log('[5/7] Matching clusters...');
let totalLabels = 0;
let matchedExact = 0, matchedNorm = 0, matchedBase = 0, unmatched = 0;
let oversize = 0, unsupported = 0;
const licenseHits = new Set();

for (const c of clusters) {
  const fileNames = c.file_names || [];
  const matches = [];
  for (const label of fileNames) {
    totalLabels++;
    const m = matchFile(label, driveIndex, normalizedIndex, baseIndex);
    if (m.match_method === 'exact') matchedExact++;
    else if (m.match_method === 'normalized') matchedNorm++;
    else if (m.match_method === 'base_prefix') matchedBase++;
    else unmatched++;

    if (m.drive_id) {
      m.kakao_label = label;
      if (m.oversize_10mb) oversize++;
      if (!SUPPORTED_EXT.has(m.extension)) { m.unsupported_ext = true; unsupported++; }
      matches.push(m);
    } else {
      matches.push({ kakao_label: label, unmatched: true });
    }
  }
  c.drive_matches = matches;

  const risks = detectLicenseRisk(c.text_body || '', fileNames);
  c.license_risks = risks;
  risks.forEach(r => licenseHits.add(r));
}

console.log('[6/7] Stats:');
const matched = matchedExact + matchedNorm + matchedBase;
console.log(`  Total kakao file labels: ${totalLabels}`);
console.log(`  Matched: ${matched} (${(matched/totalLabels*100).toFixed(1)}%)`);
console.log(`    exact:        ${matchedExact}`);
console.log(`    normalized:   ${matchedNorm}`);
console.log(`    base_prefix:  ${matchedBase}`);
console.log(`  Unmatched: ${unmatched}`);
console.log(`  Oversize 10MB: ${oversize}`);
console.log(`  Unsupported ext: ${unsupported}`);
console.log(`  License risk insurers: ${[...licenseHits].join(', ') || 'none'}`);

// 출력 1: clusters_with_drive.json
writeFileSync(
  join(ROOT, 'clusters_with_drive.json'),
  JSON.stringify(clusters, null, 2),
  'utf-8'
);

// 출력 2: match_stats.txt
const statsLines = [];
statsLines.push('=== 4팀 단톡방 ↔ Drive 매칭 통계 ===');
statsLines.push(`생성: ${new Date().toISOString()}`);
statsLines.push('');
statsLines.push(`[입력]`);
statsLines.push(`  clusters_full.json: ${clusters.length}건`);
statsLines.push(`  file_index 통합: ${idx.length} 파일`);
statsLines.push(`  file_content 통합: ${ct.length}건`);
statsLines.push('');
statsLines.push(`[짝 매칭] 총 카톡 라벨: ${totalLabels}건`);
statsLines.push(`  매칭 성공: ${matched} (${(matched/totalLabels*100).toFixed(1)}%)`);
statsLines.push(`    exact:        ${matchedExact}`);
statsLines.push(`    normalized:   ${matchedNorm}`);
statsLines.push(`    base_prefix:  ${matchedBase}`);
statsLines.push(`  매칭 실패: ${unmatched}`);
statsLines.push('');
statsLines.push(`[자동 정제]`);
statsLines.push(`  10MB 초과: ${oversize}건 (Drive link 본문에만 박음, attachments_json 제외)`);
statsLines.push(`  형식 외 (pptx/ppt 등): ${unsupported}건 (Drive link 본문에만 박음 — Q8 임시)`);
statsLines.push('');
statsLines.push(`[라이센스 위험 키워드 검출]`);
statsLines.push(`  검출 보험사: ${[...licenseHits].join(', ') || '없음'}`);
statsLines.push(`  Q4 RLS 4팀 한정으로 보호`);
writeFileSync(join(ROOT, 'match_stats.txt'), statsLines.join('\n'), 'utf-8');

console.log('[7/7] Building insert_dryrun.sql (전체 215건)...');

const sqlLines = [];
sqlLines.push('-- ============================================');
sqlLines.push('-- 4팀 단톡방 → manager_notice INSERT 드라이런');
sqlLines.push('-- 본 SQL = 검수용. 실 실행 X (BEGIN/ROLLBACK 흐름).');
sqlLines.push(`-- 생성: ${new Date().toISOString()}`);
sqlLines.push(`-- 대상: 전체 ${clusters.length}건 (Q9 = C 결재 정합)`);
sqlLines.push('-- author_id = 6f5aaa10-be20-4274-a190-53ce38ed3850 (한재성 실장, jaisung78@gmail.com)');
sqlLines.push('-- team_id = 5fccd362-9ee3-4165-8960-7cb0b7ec72fa (4팀)');
sqlLines.push('-- 첨부 정책: 15형식 + ≤10MB + ≤10개 → attachments (text JSON) / 외 → 본문 link');
sqlLines.push('-- source_label = JSON (cluster_rank / n_attach / license_risks) — Q18 A 결재 정합');
sqlLines.push('-- ============================================');
sqlLines.push('');
sqlLines.push('BEGIN;');
sqlLines.push('');

for (const c of clusters) {
  const titleRaw = (c.text_body || '').slice(0, 60).replace(/\n/g, ' ').trim();
  const title = titleRaw || `[${c.date} ${c.time}] 4팀 단톡방 묶음 #${c.rank}`;

  const bodyLines = [c.text_body || ''];
  const supportedAttach = [];
  const linkOnly = [];

  for (const m of (c.drive_matches || [])) {
    if (m.unmatched) {
      linkOnly.push(`[매칭 실패] ${m.kakao_label}`);
    } else if (m.oversize_10mb || m.unsupported_ext) {
      const sizeStr = (m.size_bytes / 1024 / 1024).toFixed(1) + 'MB';
      const tag = m.unsupported_ext ? `${m.extension}, ${sizeStr}` : sizeStr;
      linkOnly.push(`[Drive] ${m.drive_filename} (id=${m.drive_id}, ${tag})`);
    } else if (supportedAttach.length < 10) {
      supportedAttach.push({
        drive_id: m.drive_id,
        filename: m.drive_filename,
        size_bytes: m.size_bytes,
        extension: m.extension
      });
    } else {
      linkOnly.push(`[10개 초과] ${m.drive_filename} (id=${m.drive_id})`);
    }
  }

  if (linkOnly.length > 0) {
    bodyLines.push('');
    bodyLines.push('---');
    bodyLines.push('[첨부 외 자료]');
    linkOnly.forEach(l => bodyLines.push(l));
  }

  const content = bodyLines.join('\n');
  const attachmentsStr = JSON.stringify(supportedAttach);  // text 컬럼 박음 (JSONB X)
  const sourceLabel = JSON.stringify({                      // Q18 A: source_label에 JSON 박음
    cluster_rank: c.rank,
    n_attach_supported: supportedAttach.length,
    n_attach_link_only: linkOnly.length,
    license_risks: c.license_risks || []
  });

  sqlLines.push(`-- Cluster #${c.rank} | ${c.date} ${c.time} | text ${c.text_len}자 | files ${(c.drive_matches || []).length}건 (지원 ${supportedAttach.length} / link ${linkOnly.length})`);
  sqlLines.push(`INSERT INTO public.posts (`);
  sqlLines.push(`  board_type, title, content,`);
  sqlLines.push(`  author_id, author_name, team_id,`);
  sqlLines.push(`  attachments, source_type, source_label, display_author,`);
  sqlLines.push(`  is_notice, audience_target, created_at`);
  sqlLines.push(`) VALUES (`);
  sqlLines.push(`  'manager_notice',`);
  sqlLines.push(`  ${sqlStr(title)},`);
  sqlLines.push(`  ${sqlStr(content)},`);
  sqlLines.push(`  '6f5aaa10-be20-4274-a190-53ce38ed3850',`);  // 한재성 실장 UUID (jaisung78@gmail.com)
  sqlLines.push(`  '한재성',`);
  sqlLines.push(`  '5fccd362-9ee3-4165-8960-7cb0b7ec72fa',`);  // 4팀 team_id UUID
  sqlLines.push(`  ${sqlStr(attachmentsStr)},`);                // attachments (text)
  sqlLines.push(`  'kakao_4team',`);                            // source_type
  sqlLines.push(`  ${sqlStr(sourceLabel)},`);                   // source_label (Q18 A: JSON 박음)
  sqlLines.push(`  '한재성',`);                                  // display_author
  sqlLines.push(`  true,`);                                     // is_notice
  sqlLines.push(`  'team_internal',`);                          // audience_target
  sqlLines.push(`  ${sqlStr(c.ts_start)}::timestamptz`);
  sqlLines.push(`);`);
  sqlLines.push('');
}

sqlLines.push('-- ============================================');
sqlLines.push('-- 명시적 COMMIT — Q20 A 결재 정합 (자동 commit 흐름)');
sqlLines.push('-- 회귀 시 별도 SQL: DELETE FROM public.posts WHERE source_type = ' + "'kakao_4team';");
sqlLines.push('-- ============================================');
sqlLines.push('COMMIT;');

writeFileSync(join(ROOT, 'insert_dryrun.sql'), sqlLines.join('\n'), 'utf-8');

console.log('[DONE] 산출물 박힘:');
console.log('  - clusters_with_drive.json');
console.log('  - match_stats.txt');
console.log('  - insert_dryrun.sql');
