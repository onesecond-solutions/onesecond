#!/usr/bin/env node
/* CI 마이그레이션 사전검사 (Secret·DB 접근 없음).
 * 역할(item 7 한계 명시): 명백한 금지구문 탐지 + 파일/해시/경로 검증 + newsletters 데이터변경 차단
 *   + 기존 마이그레이션 수정 차단. 최종 문법·실행가능성은 psql ON_ERROR_STOP 트랜잭션이 판정.
 * 오탐 방지: 주석·달러인용($$…$$) 본문을 제거한 "탑레벨" SQL에서만 데이터변경 구문 탐지. */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const DIR = 'db/migrations/';
const FILE_RE = /^[A-Za-z0-9._-]+\.sql$/;   // 경로이탈·URL·공백·셸 조작 차단
const ev = process.env.EVENT_NAME || '';
function fail(m){ console.error('PRECHECK FAIL: ' + m); process.exit(1); }
function out(k,v){ if(process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); }

// ── 대상 파일 결정 ──────────────────────────────────────────────
let file;
if (ev === 'workflow_dispatch') {
  const raw = process.env.INPUT_FILE || '';
  if (raw !== raw.trim() || /\s/.test(raw)) fail('파일명 공백/조작');
  if (!FILE_RE.test(raw)) fail('파일명 형식 위반(경로이탈·URL·특수문자 불가): ' + raw);
  file = raw;
  if (!fs.existsSync(DIR + file)) fail('현재 커밋에 파일 없음: ' + DIR + file);
} else if (ev === 'push') {
  const before = process.env.BEFORE || '';
  const sha = process.env.SHA || '';
  if (!/^[0-9a-f]{40}$/.test(sha)) fail('SHA 형식 오류');
  // github.event.before ... github.sha 범위(item 2). before가 0…0(초기)면 diff 불가 → 수동 실행 요구.
  if (!/^[0-9a-f]{40}$/.test(before) || /^0{40}$/.test(before)) fail('push 범위 불명확 → 제한형 수동 실행(workflow_dispatch) 사용');
  const diff = execSync(`git diff --name-status ${before} ${sha} -- ${DIR}`, {encoding:'utf8'}).trim();
  const lines = diff ? diff.split('\n') : [];
  const added = [], touchedExisting = [];
  for (const ln of lines) {
    const [st, ...rest] = ln.split('\t');
    const path = rest[rest.length-1];
    if (!path || !path.startsWith(DIR)) continue;
    const base = path.slice(DIR.length);
    if (base.includes('/')) fail('하위 디렉터리 마이그레이션 불가: ' + path);
    if (st === 'A') added.push(base);
    else touchedExisting.push(st + ' ' + base);   // M/D/R 등 = 기존 수정
  }
  if (touchedExisting.length) fail('기존 마이그레이션은 불변(수정/삭제 금지). 위반: ' + touchedExisting.join(', '));
  if (added.length !== 1) fail('추가된 마이그레이션이 정확히 1개가 아님: ' + added.length);
  file = added[0];
} else {
  fail('허용되지 않은 트리거: ' + ev);
}

// ── 파일 로드 + 해시 ────────────────────────────────────────────
const full = DIR + file;
const src = fs.readFileSync(full, 'utf8');
const crypto = await import('node:crypto');
const hash = crypto.createHash('sha256').update(src).digest('hex');

// ── 주석·달러인용 본문 제거 후 탑레벨 SQL 스캔 ──────────────────
let top = src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')      // 블록주석
  .replace(/--[^\n]*/g, ' ')              // 라인주석
  .replace(/\$\$[\s\S]*?\$\$/g, ' ');      // 함수 본문 등 달러인용

// 금지구문(탑레벨): newsletters 데이터 변경 + 파괴적 구문
const banned = [
  // 데이터 UPDATE = "update <table> [alias] set" 형태만(권한부여 GRANT UPDATE … ON 은 제외)
  [/\bupdate\s+(?:public\.)?newsletters\b(?:\s+\w+)?\s+set\b/i, 'top-level UPDATE(data) on newsletters'],
  [/\bdelete\s+from\s+(?:public\.)?newsletters\b/i, 'top-level DELETE on newsletters'],
  [/\btruncate\b/i, 'TRUNCATE'],
  [/\bdrop\s+table\b/i, 'DROP TABLE (탑레벨)'],
  [/\bdrop\s+schema\b/i, 'DROP SCHEMA (탑레벨)'],
  [/\balter\s+table\s+[^;]*\bnewsletters\b/i, 'ALTER newsletters'],
  [/\bservice_role\b/i, 'service_role 참조'],
];
for (const [re, name] of banned) if (re.test(top)) fail('금지 구문 탐지: ' + name);

// begin/commit 균형(참고 수준) — 최종 판정은 psql
const nBegin = (top.match(/\bbegin\b/gi)||[]).length;
const nCommit = (top.match(/\bcommit\b/gi)||[]).length;
if (nBegin < 1 || nCommit < 1) fail('트랜잭션(begin/commit) 미포함');

console.log(`PRECHECK PASS: file=${file} sha256=${hash} (탑레벨 금지구문 0, newsletters 데이터변경 0)`);
out('file', file);
out('sha256', hash);
