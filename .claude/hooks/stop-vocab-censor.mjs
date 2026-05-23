#!/usr/bin/env node
// Stop hook — onesecond 어휘 검열
// 응답이 끝나기 직전 실행. 금지 어휘 감지 시 exit 2로 응답 정정 유도.
//
// 검열 대상 (메모리 feedback_avoid_bonjin_bakum + feedback_no_version_terms):
//   - "박" 시리즈 (박힘/박음/박는/박혀/박혔/박았/박힌/박은/박을 + 자리/박지 X)
//   - "본진" 단독 (강한 의미로 쓰는 경우)
//   - "구버전" / "신버전"
//
// 모드 (환경변수 ONESECOND_VOCAB_CENSOR로 제어):
//   "block" (기본): exit 2로 응답 정정 유도
//   "warn":         stderr 경고만, exit 0
//   "off":          검열 비활성

import { readFileSync } from 'node:fs';

const MODE = process.env.ONESECOND_VOCAB_CENSOR || 'block';

if (MODE === 'off') {
  process.exit(0);
}

// stdin 입력 파싱
let input;
try {
  input = JSON.parse(readFileSync(0, 'utf-8'));
} catch (e) {
  // 입력 파싱 실패 = 안전 fallback (pass)
  process.exit(0);
}

const transcriptPath = input.transcript_path;
if (!transcriptPath) {
  process.exit(0);
}

let transcript;
try {
  transcript = readFileSync(transcriptPath, 'utf-8');
} catch {
  process.exit(0);
}

// 마지막 assistant 메시지 추출
const lines = transcript.trim().split('\n');
let lastAssistantText = '';

for (let i = lines.length - 1; i >= 0; i--) {
  let entry;
  try {
    entry = JSON.parse(lines[i]);
  } catch {
    continue;
  }

  const isAssistant =
    entry.role === 'assistant' ||
    entry.type === 'assistant' ||
    entry.message?.role === 'assistant';

  if (!isAssistant) continue;

  const content = entry.content || entry.message?.content;
  if (Array.isArray(content)) {
    for (const item of content) {
      if (item.type === 'text' && typeof item.text === 'string') {
        lastAssistantText += item.text + '\n';
      }
    }
  } else if (typeof content === 'string') {
    lastAssistantText = content;
  }

  if (lastAssistantText) break;
}

if (!lastAssistantText) {
  process.exit(0);
}

// 검열 규칙
const RULES = [
  {
    name: '박-시리즈',
    pattern: /박(힘|음|는|혀|혔|았|아|힌|은\s+자리|을\s+자리|는\s+자리|힌\s+자리|지\s*X|아\s+있|아\s+박|음\s+박)/g,
    hint: '평이한 한국어로 — 예: "박힘" → "있음/들어감/추가됨", "박음" → "추가/작성/배치", "박는" → "넣는/적용하는/만드는"'
  },
  {
    name: '본진(단독)',
    pattern: /(^|[\s,.\(\[\{])본진([\s,.\)\]\}]|$)/g,
    hint: '"본진" 단독 사용 금지 — "핵심/본질/근본/주축" 같은 평이한 표현으로'
  },
  {
    name: 'version-terms',
    // 검열 자료:
    //   - 한자어: 구버전 / 신버전
    //   - 영문: old 버전 / new 버전 (대소문자 무시, 공백·하이픈 허용)
    //   - 숫자: v1 버전 / v2 버전 / v10 버전 등 (대소문자 무시)
    pattern: /(구|신)버전|\b(old|new)[\s\-]+버전|\bv\d+[\s\-]+버전/gi,
    hint: '버전 어휘 금지 (feedback_no_version_terms 메모리). 단일 버전 = "현재" 자체가 진실. 예외: 팀장님이 직접 그 어휘를 언급한 경우만. 향후 옛 자료 호명 시 폴더 이름(git tracked) 그대로 사용은 허용.'
  }
];

const findings = [];
for (const rule of RULES) {
  const matches = [...lastAssistantText.matchAll(rule.pattern)];
  if (matches.length === 0) continue;

  const samples = [...new Set(matches.map(m => m[0].trim()))].slice(0, 5);
  findings.push({
    rule: rule.name,
    count: matches.length,
    samples,
    hint: rule.hint
  });
}

if (findings.length === 0) {
  process.exit(0);
}

// 감지 결과 출력
const lines_out = ['[Stop hook · 어휘 검열] 본 응답에 금지 어휘 감지:'];
for (const f of findings) {
  lines_out.push(`  - ${f.rule}: ${f.count}회 — ${f.samples.join(' / ')}`);
  lines_out.push(`    → ${f.hint}`);
}
lines_out.push('');
lines_out.push('응답 정정: 평이한 한국어로 다시 작성해주세요.');

console.error(lines_out.join('\n'));

if (MODE === 'warn') {
  process.exit(0);
}

// MODE === 'block' (기본): exit 2로 Claude가 응답 정정하도록 유도
process.exit(2);
