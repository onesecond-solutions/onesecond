import test from 'node:test';import assert from 'node:assert/strict';
import {normalize,selectItems,topics,kstDay,canonicalUrl,isUsefulTitle} from '../insuwork/insubriefing/scripts/briefing-core.mjs';
const now=new Date('2026-08-31T00:00:00Z');
const article=(title,url='https://news.example/a')=>({title,originallink:url,pubDate:'Mon, 31 Aug 2026 08:00:00 +0900',description:'<b>기사 소개</b>'});
test('KST day crosses UTC midnight correctly',()=>assert.equal(kstDay(new Date('2026-08-30T21:00:00Z')),'2026-08-31'));
test('reject invalid URLs, dates, old content and financial PR',()=>{assert.equal(canonicalUrl('javascript:alert(1)'),null);assert.equal(normalize({...article('실손보험 개편'),pubDate:'invalid'},topics[0],now),null);assert.equal(normalize({...article('실손보험 개편'),pubDate:'2026-08-01'},topics[0],now),null);assert.equal(normalize(article('보험사 영업이익 증가'),topics[0],now),null);});
test('sensitive reports do not synthesize legal or medical summaries',()=>{const a=normalize(article('주차장법 개정 안내'),topics[3],now);assert.equal(a.description,'');assert.equal(a.verification,'원문 확인 필요');const b=normalize(article('암 치료제 승인'),topics[1],now);assert.equal(b.description,'');assert.equal(b.sourceType,'언론 보도');});
test('official source domain cannot be spoofed by suffix',()=>{assert.equal(normalize(article('건강보험 급여 확대','https://mohw.go.kr/article'),topics[1],now).sourceType,'공식기관 자료');assert.equal(normalize(article('건강보험 급여 확대','https://mohw.go.kr.evil.com/article'),topics[1],now).sourceType,'언론 보도');});
test('deduplicate across categories by URL and near-identical title',()=>{const a=normalize(article('실손보험 개편 가입자 보장 범위 변경'),topics[0],now);const b={...a,id:'b',url:a.url+'2',title:'실손보험 개편 가입자 보장 범위 변경 안내'};assert.equal(selectItems([a,b,{...a,category:topics[1].category}]).length,1);});
test('balanced first batch across six topics',()=>{const titles=['실손보험 보장 개편','암 치료 건강보험 급여','기초연금 개편','도로교통법 과태료 시행','소비자 피해 보상 법률 개정','의료비 세액공제 신청'];const rows=topics.flatMap((t,n)=>[0,1].map(i=>({category:t.category,title:`${titles[n]} ${i+1}차 안내`,url:`https://news.example/${n}/${i}`,publishedAt:now.toISOString(),priority:1})));assert.equal(new Set(selectItems(rows).slice(0,6).map(x=>x.category)).size,6);});
test('rejects today low-value investment, book, event and local parking noise',()=>{
  assert.equal(isUsefulTitle('금리 오르자 보험주도 뛰었다 한 달 새 17% 상승','보험·보상'),false);
  assert.equal(isUsefulTitle('정종채 변호사 조세법 대계 신간 펴내','가계·세금·지원제도'),false);
  assert.equal(isUsefulTitle('재단 가족돌봄청년 금융투자 특강 금융교육','노후·연금·돌봄'),false);
  assert.equal(isUsefulTitle('[사설] 기초연금 개편안 막판 진통','노후·연금·돌봄'),false);
  assert.equal(isUsefulTitle('가평 자라섬 장기 주차 차량 골치','교통·자동차·생활안전'),false);
  assert.equal(isUsefulTitle('농지에 신고만으로 화장실 주차장 설치 가능','교통·자동차·생활안전'),false);
});
test('keeps consultation-useful medical, pension and safety changes',()=>{
  assert.equal(isUsefulTitle('폴라이비 블린사이토 건강보험 급여 첫날','질병·치료·의료비'),true);
  assert.equal(isUsefulTitle('암 백신 치료비 낮출 수 있을까','질병·치료·의료비'),true);
  assert.equal(isUsefulTitle('월 468만원 벌어도 기초연금 개편안','노후·연금·돌봄'),true);
  assert.equal(isUsefulTitle('주차장 출입구 막으면 과태료 500만원 견인','교통·자동차·생활안전'),true);
});
test('keeps one representative per event and caps categories',()=>{
  const base={category:topics[3].category,publishedAt:now.toISOString(),priority:2};
  const parking=[
    {...base,title:'아파트 주차장 길막 최대 500만원 과태료',url:'https://news.example/p1'},
    {...base,title:'주차장 출입구 막으면 과태료 견인 가능',url:'https://news.example/p2'},
    {...base,title:'주차 방해 출입구 길막 처벌 강화',url:'https://news.example/p3'}
  ];
  assert.equal(selectItems(parking).length,1);
});
