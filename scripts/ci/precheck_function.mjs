#!/usr/bin/env node
/* CI Edge Function 배포 사전검사 (Secret 접근 없음).
 * 역할: 함수명 형식(경로이탈·특수문자 차단) + 현재 커밋에 supabase/functions/<name>/index.ts 존재 +
 *   main 대상 확인. 실제 배포 가능성(문법 등)은 supabase CLI가 deploy 단계에서 판정. */
import fs from 'node:fs';

const DIR = 'supabase/functions/';
const NAME_RE = /^[A-Za-z0-9_-]+$/;   // 경로이탈(/, ..)·URL·공백·셸 조작 차단
function fail(m){ console.error('PRECHECK FAIL: ' + m); process.exit(1); }
function out(k,v){ if(process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); }

const raw = process.env.INPUT_FUNCTION || '';
if (raw !== raw.trim() || /\s/.test(raw)) fail('함수명 공백/조작');
if (!NAME_RE.test(raw)) fail('함수명 형식 위반(경로이탈·특수문자 불가): ' + raw);

const dir = DIR + raw;
const entry = dir + '/index.ts';
if (!fs.existsSync(dir)) fail('현재 커밋에 함수 디렉터리 없음: ' + dir);
if (!fs.existsSync(entry)) fail('현재 커밋에 진입점 없음: ' + entry);

if (process.env.GITHUB_REF && process.env.GITHUB_REF !== 'refs/heads/main') {
  fail(`배포 대상은 main만 허용(현재 ref=${process.env.GITHUB_REF})`);
}

console.log(`PRECHECK PASS: function=${raw} (${entry} 존재 확인)`);
out('function', raw);
