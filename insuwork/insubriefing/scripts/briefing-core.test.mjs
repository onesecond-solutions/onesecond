import assert from 'node:assert/strict';
import { isUsefulTitle } from './briefing-core.mjs';

const medical = '질병·치료·의료비';
[
  '여수축산농협 ‘혈관튼튼NH건강보험’ 1호가입',
  "부산축산농협, '혈관튼튼NH건강보험' 부산지역 1호 가입",
  '새 건강보험 출시 기념 가입 행사',
  "상조회사 폐업하면 낸 돈은… 선수금 지키는 '소비자피해보상보험'"
].forEach(title => assert.equal(isUsefulTitle(title, medical), false, `홍보기사 차단: ${title}`));

[
  '급성 백혈병 신약 건강보험 급여 적용…환자 본인부담 완화',
  '뇌졸중 치료제 식약처 허가…치료 선택지 확대',
  '심근경색 수술 치료비 건강보험 급여 확대'
].forEach(title => assert.equal(isUsefulTitle(title, medical), true, `의료·비용 변화 통과: ${title}`));

assert.equal(isUsefulTitle('유명인의 암 투병 고백', medical), false, '비용·제도 변화 없는 화제성 의료기사 차단');
console.log('briefing-core editorial tests passed');
