// 홈 배너 별 레이어 SVG 자동 생성
// 가동: node scripts/generate-banner-stars.mjs > assets/images/home_banner/stars.svg
//
// 본질: 실제 밤하늘처럼 무작위 + 군집 + 비움 + 3종 크기 + 블러 점 혼합
// 매번 다른 패턴 가동. 한 번 생성 + 결과 SVG commit (정적 자료).

const W = 1200;
const H = 800;

// 군집 영역 3개 (자연 별 모임 시뮬레이션)
const clusters = [
  { cx: 160, cy: 140, r: 200 },   // 좌상단
  { cx: 1050, cy: 220, r: 220 },  // 우상단
  { cx: 580, cy: 720, r: 260 },   // 하단 중앙
];

// 비움 영역 (배너 카드 자리 + 헤드라인 자리)
function inSkipZone(x, y) {
  // 중앙 우측 카드 자리
  if (x >= 720 && x <= 1100 && y >= 280 && y <= 620) return true;
  // 좌중앙 헤드라인 자리
  if (x >= 60 && x <= 620 && y >= 320 && y <= 520) return true;
  return false;
}

const stars = [];
const TOTAL_SMALL = 90;
const CLUSTER_RATIO = 0.6;
let attempts = 0;

while (stars.length < TOTAL_SMALL && attempts < 2000) {
  attempts++;
  let x, y;
  if (Math.random() < CLUSTER_RATIO) {
    // 60% = 군집 자체
    const c = clusters[Math.floor(Math.random() * clusters.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.pow(Math.random(), 0.6) * c.r; // 중심 농도 가중치
    x = c.cx + Math.cos(angle) * dist;
    y = c.cy + Math.sin(angle) * dist;
  } else {
    // 40% = 균등 자체
    x = Math.random() * W;
    y = Math.random() * H;
  }
  if (x < 0 || x > W || y < 0 || y > H) continue;
  if (inSkipZone(x, y)) continue;
  const sizeRoll = Math.random();
  let r;
  if (sizeRoll < 0.55) r = 0.5 + Math.random() * 0.3;       // 작은 자리 (55%)
  else if (sizeRoll < 0.88) r = 0.9 + Math.random() * 0.4;  // 중간 (33%)
  else r = 1.5 + Math.random() * 0.6;                       // 큰 자리 (12%)
  const op = 0.28 + Math.random() * 0.7;
  // 인디고 보라 색 = 15% / 흰색 = 85%
  const purple = Math.random() < 0.15;
  stars.push({ x, y, r, op, purple });
}

// 블러 점 10개 (성운 자체)
const blurs = [];
let blurAttempts = 0;
while (blurs.length < 10 && blurAttempts < 200) {
  blurAttempts++;
  const x = Math.random() * W;
  const y = Math.random() * H;
  if (inSkipZone(x, y)) continue;
  const r = 2 + Math.random() * 2.5;
  const op = 0.35 + Math.random() * 0.4;
  blurs.push({ x, y, r, op });
}

// SVG 출력
const lines = [];
lines.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">`);
lines.push(`  <defs>`);
lines.push(`    <filter id="b" x="-50%" y="-50%" width="200%" height="200%">`);
lines.push(`      <feGaussianBlur stdDeviation="1.4"/>`);
lines.push(`    </filter>`);
lines.push(`  </defs>`);
// 블러 점 (먼저 = 뒤로 들어감)
for (const b of blurs) {
  lines.push(`  <circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="${b.r.toFixed(2)}" fill="#A78BFA" opacity="${b.op.toFixed(2)}" filter="url(#b)"/>`);
}
// 별
for (const s of stars) {
  const color = s.purple ? '#C4B5FD' : '#FFFFFF';
  lines.push(`  <circle cx="${s.x.toFixed(1)}" cy="${s.y.toFixed(1)}" r="${s.r.toFixed(2)}" fill="${color}" opacity="${s.op.toFixed(2)}"/>`);
}
lines.push(`</svg>`);

process.stdout.write(lines.join('\n') + '\n');
