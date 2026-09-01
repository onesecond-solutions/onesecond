import { createHash } from 'node:crypto';
export const topics = [
  { category: '보험·보상', queries: ['실손보험 개편', '보험금 지급 분쟁', '보험료 보장 변경'], match: /보험|실손|보장|보험금/ },
  { category: '질병·치료·의료비', queries: ['암 신약 건강보험 급여', '뇌 심장 치료 건강보험', '치료제 승인 의료비'], match: /암|뇌혈관|뇌졸중|뇌출혈|심장|심혈관|심근|치료|신약|의료비|건강보험|급여/ },
  { category: '노후·연금·돌봄', queries: ['기초연금 변경', '장기요양 치매 지원', '간병 돌봄 제도'], match: /연금|요양|치매|간병|돌봄/ },
  { category: '교통·자동차·생활안전', queries: ['주차장법 개정', '도로교통법 시행', '자동차 화재 안전'], match: /주차|도로교통|운전자|자동차|화재|안전/ },
  { category: '생활법률·소비자보호', queries: ['생활 법령 개정', '소비자 피해 보상', '보이스피싱 예방'], match: /법령|개정|소비자|피해|보이스피싱/ },
  { category: '가계·세금·지원제도', queries: ['상속 증여 세법 개정', '의료비 세액공제', '지원금 신청 마감'], match: /상속|증여|세법|의료비|공제|지원금|신청/ }
];
export const strip = (v = '') => String(v).replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
export const kstDay = (d = new Date()) => new Date(+d + 9 * 3600000).toISOString().slice(0, 10);
export function canonicalUrl(value) {
  try { const u = new URL(value); if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) return null;
    u.hash = ''; for (const key of [...u.searchParams.keys()]) if (/^utm_|^(fbclid|gclid)$/i.test(key)) u.searchParams.delete(key);
    return u.href;
  } catch { return null; }
}
const exclude = /\[(사설|칼럼|기고)\]|수 있을까|전문가에게 묻다|전망|가능성|주가|목표주가|영업이익|순이익|배당|주식시장|보험주|증시|시가총액|연예|보험사기단|보험금 노린|살해|이벤트|협찬|특가|프로모션|신간|출간|펴내|출판|특강|금융교육|캠페인|봉사활동|지역 축제/;
const requiredByCategory = {
  '보험·보상': /실손|보험금|보험료|보장|약관|보험업법|보험 개편|보험가입|보험소비자|금융감독원/,
  '질병·치료·의료비': /암|뇌혈관|뇌졸중|뇌출혈|심장|심혈관|심근|질병|치료|신약|치료제|수술|건강보험|급여|의료비/,
  '노후·연금·돌봄': /연금|장기요양|치매|간병|돌봄|노인 지원/,
  '교통·자동차·생활안전': /도로교통|운전자|자동차|교통사고|화재|안전사고|과태료|벌금|견인|주차장법|주차.{0,12}(출입구|길막|방해)/,
  '생활법률·소비자보호': /법령|법률|시행|개정|과태료|벌금|소비자.{0,12}(피해|보상|환불)|보이스피싱/,
  '가계·세금·지원제도': /상속|증여|세액공제|소득공제|지원금|지원제도|신청.{0,12}(마감|대상|자격)|세법.{0,12}(개정|시행)/
};
export function isUsefulTitle(title, category) {
  const text = strip(title);
  if (!text || exclude.test(text)) return false;
  if (!(requiredByCategory[category]?.test(text) ?? false)) return false;
  const customerImpact = {
    '보험·보상': /개편|변경|보험료|보험금|보장|약관|청구|지급|분쟁|가입|소비자/,
    '질병·치료·의료비': /건강보험|급여|본인부담|치료비|의료비|승인|허가|환자|수술비|보험/,
    '노후·연금·돌봄': /개편|변경|수급|지급|소득|지원|신청|대상|보험료|본인부담/,
    '교통·자동차·생활안전': /법|시행|개정|과태료|벌금|견인|예방|안전수칙|보상/,
    '생활법률·소비자보호': /시행|개정|과태료|벌금|피해|보상|환불|예방|구제/,
    '가계·세금·지원제도': /시행|개정|공제|지원|신청|마감|대상|자격|지급/
  };
  return customerImpact[category]?.test(text) ?? false;
}
export function normalize(article, topic, now = new Date()) {
  const url = canonicalUrl(article.originallink || article.link), title = strip(article.title), time = Date.parse(article.pubDate);
  if (!url || !title || !Number.isFinite(time) || time > +now + 3600000 || time < +now - 72 * 3600000 || !topic.match.test(title) || !isUsefulTitle(title, topic.category)) return null;
  const source = new URL(url).hostname.replace(/^www\./, '');
  const official = /(^|\.)(go\.kr|nhis\.or\.kr|hira\.or\.kr|nps\.or\.kr|fss\.or\.kr|kca\.go\.kr)$/.test(source);
  const sensitive = /법|개정|시행|과태료|벌금|신약|치료제|승인|임상|치료비|급여/.test(title) || topic.category === '질병·치료·의료비';
  // 검색 결과만으로 시행/승인 상태나 의료 효과를 확정하지 않는다. 민감한 내용은 요약하지 않고 원문 확인으로 안내한다.
  return { id: createHash('sha256').update(url).digest('hex').slice(0, 20), category: topic.category, title, source, url,
    publishedAt: new Date(time).toISOString(), description: sensitive ? '' : strip(article.description).slice(0, 240),
    sourceType: official ? '공식기관 자료' : '언론 보도', verification: sensitive ? '원문 확인 필요' : '검색 제공문', shareUse: '고객 안내·상담 참고',
    priority: /시행|신청|마감|개편|급여|지원/.test(title) ? 2 : 1 };
}
function tokens(title) { return new Set(title.replace(/\[[^\]]*\]/g, '').replace(/[^가-힣a-zA-Z0-9\s]/g, ' ').toLowerCase().split(/\s+/).filter(w => w.length > 1)); }
function eventKey(title) {
  if (/주차/.test(title) && /(출입구|길막|막으|방해)/.test(title)) return 'parking-entrance-blocking';
  if (/농지/.test(title) && /주차장/.test(title)) return 'farmland-parking';
  if (/기초연금/.test(title) && /개편|소득|선정기준/.test(title)) return 'basic-pension-reform';
  return '';
}
export function selectItems(candidates, perCategory = 2, totalLimit = 10) {
  const selected = [], seen = new Set(), counts = {};
  for (const item of candidates.sort((a, b) => b.priority - a.priority || Date.parse(b.publishedAt) - Date.parse(a.publishedAt))) {
    if (!isUsefulTitle(item.title, item.category) || seen.has(item.url) || (counts[item.category] || 0) >= perCategory) continue;
    const words = tokens(item.title);
    const key = eventKey(item.title);
    const duplicate = selected.some(other => { const b = tokens(other.title), intersection = [...words].filter(w => b.has(w)).length; return item.title === other.title || (key && key === eventKey(other.title)) || (intersection >= 3 && intersection / Math.min(words.size, b.size) >= .6); });
    if (duplicate) continue;
    selected.push(item); seen.add(item.url); counts[item.category] = (counts[item.category] || 0) + 1;
  }
  // 첫 화면/배너는 한 분야가 독점하지 않도록 분야별 첫 기사부터 배치한다.
  return Array.from({length:perCategory}, (_, n) => topics.map(t => selected.filter(x => x.category === t.category)[n]).filter(Boolean)).flat().slice(0, totalLimit);
}
