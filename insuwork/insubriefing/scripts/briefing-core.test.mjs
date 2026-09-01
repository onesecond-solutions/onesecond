import assert from 'node:assert/strict';
import { isUsefulTitle, topics } from './briefing-core.mjs';

assert.equal(topics.reduce((sum, topic) => sum + Math.min(topic.dailyQueries || 1, topic.queries.length), 0), 10, '일일 API 호출 수 10회 유지');
assert.equal(new Set(topics.map(topic => topic.category)).size, 7, '화면 카테고리 7개 유지');

const treatment = '질병·검사·치료';
const medicine = '신약·건강보험·의료비';
[
  '여수축산농협 ‘혈관튼튼NH건강보험’ 1호가입',
  "부산축산농협, '혈관튼튼NH건강보험' 부산지역 1호 가입",
  '새 건강보험 출시 기념 가입 행사',
  "상조회사 폐업하면 낸 돈은… 선수금 지키는 '소비자피해보상보험'"
].forEach(title => assert.equal(isUsefulTitle(title, medicine), false, `홍보기사 차단: ${title}`));

[
  '급성 백혈병 신약 건강보험 급여 적용…환자 본인부담 완화',
  '뇌졸중 치료제 식약처 허가…치료 선택지 확대',
  '심근경색 수술 치료비 건강보험 급여 확대'
].forEach(title => assert.equal(isUsefulTitle(title, medicine), true, `의료·비용 변화 통과: ${title}`));

[
  '머릿속 시한폭탄 뇌동맥류, 코일 색전술로 고령층도 안전하게 치료',
  '유방·갑상선암 치료는 시간 싸움…빠른 진단·수술로 불안 덜어',
  "혈관 청소부 HDL, 대사증후군에서 심근경색 연결 위험 낮춘다"
].forEach(title => assert.equal(isUsefulTitle(title, treatment), true, `고객용 질병·치료 정보 통과: ${title}`));

[
  '유명인의 암 투병 고백',
  '채소 듬뿍인데 뱃살 찐다? 이 반찬 뭐길래',
  '관절염약 먹었더니 빠진 머리가 자란다?',
  '혈관튼튼NH건강보험 부산지역 1호 가입'
].forEach(title => assert.equal(isUsefulTitle(title, treatment), false, `가십·광고·낚시 차단: ${title}`));
console.log('briefing-core editorial tests passed');
