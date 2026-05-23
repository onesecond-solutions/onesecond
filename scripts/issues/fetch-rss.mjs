// 원세컨드 보험이슈 자동 카드 — korea.kr RSS → Supabase
// 매일 7시 KST GitHub Actions cron 자료 자동 실행
// 의존성: rss-parser, @supabase/supabase-js
// 자료 자료: docs/architecture/issues_ddl_2026-05-23.md

import Parser from 'rss-parser';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_URL 또는 SUPABASE_SERVICE_KEY 환경 변수 자료 없음');
  process.exit(1);
}

// RSS 자료 자리 (korea.kr 정책브리핑 3곳)
const FEEDS = [
  { url: 'https://www.korea.kr/rss/dept_fsc.xml',  source: '금융위', category: '금융' },
  { url: 'https://www.korea.kr/rss/dept_kdca.xml', source: '질병청', category: '건강' },
  { url: 'https://www.korea.kr/rss/dept_ftc.xml',  source: '공정위', category: '소비자' }
];

// summary 자료 정정 (HTML 태그 제거 + 앞 200자 자르기)
function summarize(text) {
  if (!text) return null;
  const clean = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  if (clean.length <= 200) return clean;
  return clean.slice(0, 200) + '...';
}

// pub_date 자료 정정 (ISO 8601 자료 자리)
function toIsoDate(item) {
  if (item.isoDate) return item.isoDate;
  if (item.pubDate) {
    const d = new Date(item.pubDate);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

async function run() {
  const parser = new Parser({
    timeout: 15000,
    headers: { 'User-Agent': 'onesecond-issues-fetcher/1.0' }
  });
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const feed of FEEDS) {
    console.log(`자료 진입: ${feed.source} (${feed.url})`);

    let parsed;
    try {
      parsed = await parser.parseURL(feed.url);
    } catch (err) {
      console.error(`  ${feed.source} 자료 진입 격차:`, err.message);
      totalErrors++;
      continue;
    }

    console.log(`  ${parsed.items.length}건 자료`);

    for (const item of parsed.items) {
      if (!item.title || !item.link) continue;

      const row = {
        title: item.title.trim(),
        summary: summarize(item.contentSnippet || item.content || item.description),
        url: item.link,
        pub_date: toIsoDate(item),
        source: feed.source,
        category: feed.category
      };

      // url UNIQUE 자료라 중복 자료 시 자동 스킵
      const { error } = await supabase
        .from('issues')
        .upsert(row, { onConflict: 'url', ignoreDuplicates: true });

      if (error) {
        console.error(`  INSERT 격차 (${row.url}):`, error.message);
        totalErrors++;
      } else {
        totalInserted++;
      }
    }
  }

  console.log(`\n자료 완료 — 자료 ${totalInserted}건 / 격차 ${totalErrors}건`);

  if (totalErrors > 0 && totalInserted === 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('자료 격차:', err);
  process.exit(1);
});
