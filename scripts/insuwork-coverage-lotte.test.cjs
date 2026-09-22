const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/insuwork-coverage-lotte.js');
const parse = globalThis.OSInsuworkCoverageLotte.parse;
const item = (str,x,y) => ({str,transform:[1,0,0,1,x,y]});
function page(riders, options={}) {
  return {width:842,height:595,items:[
    item('상품별보장내용',16,567),item('인스밸리',780,567),item('(단위 : 만원)',780,460),
    item('가상손보',31,489),item(options.product || '시험보험',92,489),item('2026.01.01~2046.01.01',295,489),
    item('테스트',490,495),item(options.premium || '0',650,489),item('20년',540,489),
    ...riders.flatMap((r,n)=>{const o=r.right?411.2:0;return [item(r.name,23+o,408-n*19),item(r.amount,234+o,408-n*19),item(r.label||'원문분류',310+o,408-n*19)];})
  ]};
}
test('landscape two-column details preserve exact names, source pages and units; summary is ignored',()=>{
  const p=page([{name:'암진단비(갱신형)',amount:'1,000'},{name:'암수술비(1회한)',amount:'200',right:true}]);
  const r=parse([{width:842,height:595,items:[item('가입현황 추천금액 99999',20,400)]},p],'anonymous.pdf');
  assert.equal(r.products.length,1);assert.equal(r.rows.length,2);assert.equal(r.rows[0].name,'암진단비(갱신형)');
  assert.equal(Object.values(r.rows[0].values)[0],'1,000만원');assert.equal(r.rows[0].sourceDetails[0].page,2);
  assert.equal(r.rows[0].total,'1,000만원');assert.equal(r.rows[1].total,'');
  assert.equal(r.rows[1].sourceDetails[0].column,2);assert.equal(r.rows[1].totalReview,'조건 확인');
  assert.equal(r.products[0].premium,'0원');assert.equal(r.products[0].premiumNeedsReview,true);assert.equal(r.preserveTemplateLayout,true);
});
test('customer birth date is extracted only from customer heading and conflicts fail',()=>{
  const p=page([{name:'암진단비',amount:'100'}]);p.items.push(item('테스트 고객님(여) 1980년 02월 03일',20,550));
  assert.equal(parse([p],'anonymous.pdf').customerInfo.birthDate,'1980-02-03');
  p.items.push(item('다른고객 고객님(여) 1981년 02월 03일',20,555));
  assert.throws(()=>parse([p],'anonymous.pdf'),/생년월일/);
});
test('unsupported portrait shape fails instead of partially parsing rotated coordinates',()=>{
  const p=page([{name:'암진단비',amount:'100'}]);p.width=595;p.height=842;
  assert.throws(()=>parse([p],'anonymous.pdf'),/읽지 못했습니다/);
});
test('continuation pages merge contracts and flag aggregate riders without dropping source rows',()=>{
  const r=parse([page([{name:'4대유사암진단비(갑상선암)(간편,갱신형)',amount:'200'}]),page([{name:'4대유사암진단비(간편,갱신형)',amount:'800'}])],'anonymous.pdf');
  assert.equal(r.products.length,1);assert.equal(r.rows.length,2);assert.equal(r.rows[1].excludeFromTotal,true);assert.equal(r.rows[1].total,'');
});
test('different contracts never collapse original riders into an assumed equivalent',()=>{
  const r=parse([page([{name:'암진단금',amount:'500'}]),page([{name:'암진단금',amount:'700'}],{product:'다른시험보험'})],'anonymous.pdf');
  assert.equal(r.products.length,2);assert.equal(r.rows.length,2);assert.notEqual(r.rows[0].sourceKey,r.rows[1].sourceKey);
});
test('malformed amounts and missing units fail atomically; unrelated forms return null',()=>{
  assert.throws(()=>parse([page([{name:'암진단비',amount:'?'}])],'anonymous.pdf'),/읽지 못했습니다/);
  const p=page([{name:'암진단비',amount:'100'}]);p.items=p.items.filter(i=>!i.str.includes('단위'));
  assert.throws(()=>parse([p],'anonymous.pdf'),/읽지 못했습니다/);
  assert.equal(parse([{width:842,height:595,items:[item('KB 상품별 가입담보상세',20,400)]}],'anonymous.pdf'),null);
});
test('same source row cannot silently change amount and truncation stays visible',()=>{
  assert.throws(()=>parse([page([{name:'암진단비',amount:'100'}]),page([{name:'암진단비',amount:'200'}])],'anonymous.pdf'),/읽지 못했습니다/);
  const r=parse([page([{name:'특정치료비(진단후',amount:'100'}])],'anonymous.pdf');
  assert.match(r.rows[0].totalReview,/잘림/);assert.equal(r.rows[0].sourceDetails[0].truncated,true);
});
