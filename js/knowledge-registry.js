/* js/knowledge-registry.js — 지식 문서 원장(단일 원천)
   PR-A(4단계 중 1단계): 원장 생성 + head 로드만. 소비처(js/home.js _HS2_TILES, app.html tools[]/
   _SHORTCUTS/showView/VALID_VIEWS, pages/*.html 사이드바) 전부 무접촉. 이 PR 머지 시 화면 무변화.
   근거: docs/specs/knowledge_registry_v1.md §2 필드표 · §2-1 updatedAt · §3 샘플레코드 · §4 함수 스케치

   ★ 새 자료 추가 = 아래 KNOWLEDGE_DOCS 배열에 객체 1개 추가
   ★ id = 기존 showView 뷰 키와 동일해야 함(?view= 딥링크·북마크가 이 값에 이미 묶여 있음).
     라벨 통일 명목으로 id를 바꾸지 말 것(§8-3, 대표 확정 — 의도된 불일치).
   ★ url = 실측값. 파일명 패턴 추정 금지. 특히 의료실비 경로는 /pages/silson-generations.html
     (silson-history.html 등으로 바꾸지 않는다 — 대표 지시, §1).
   ★ 음성지원(audioStatus/audioUrl/audioDuration)·읽는 시간 필드는 의도적으로 없음(§2 대표 지정
     필드 외 추가 금지). 별도 후속 트랙.
   ★ updatedAt은 원장을 세운 기준일이지 문서 본문의 실제 마지막 수정일이 아니다(§2-1, 대표 확정
     2026-07-23). 최초 3건은 git 최종 커밋이 전부 동일한 CSS 커밋이라 본문 변경일을 판정할 수
     없어 오늘 날짜로 통일했다. 화면에 "마지막 수정일"로 표기하지 말 것 — 표기하려면 "등록일"
     성격으로 쓰거나 생략한다. 앞으로 문서 본문을 고칠 때마다 수기로 갱신하면 그 이후 값부터는
     실제 수정일 의미를 갖는다.
   ⚠️ factGrades는 클라이언트 표시 필터일 뿐 접근 통제가 아니다(§9 R2). internal_only/
     customer_blocked 문서를 실제로 올릴 때는 페이지 레벨 가드 또는 서버 게이트가 선행되어야
     한다. 이 필드만으로 비공개 문서를 안전하게 숨길 수 있다고 오인하지 말 것. */

var KNOWLEDGE_DOCS = [
  { id:'silson', category:'의료실비', group:null,
    label:'의료실비 변천사', documentTitle:'실손의료비보험 세대별 변천사',
    description:'실손 1~5세대 보장·전환', url:'/pages/silson-generations.html',
    updatedAt:'2026-07-23',   /* 원장 기준일(§2-1). 실제 본문 수정일 아님 */
    lifecycleStatus:'published', factGrades:['customer_ok'] },

  { id:'cancer-treatment', category:'암', group:null,
    label:'암주요치료비 변천사', documentTitle:'암주요치료비 세대별 변천사',
    description:'세대별 암 치료비 보장 변화', url:'/pages/cancer-treatment-history.html',
    updatedAt:'2026-07-23',   /* 원장 기준일(§2-1). 실제 본문 수정일 아님 */
    lifecycleStatus:'published', factGrades:['customer_ok'] },

  { id:'caregiver-history', category:'간병', group:null,
    label:'간병보험 변천사', documentTitle:'대한민국 간병보험의 변천사',
    description:'장기간병~사용일당 · 지급기준이 다름', url:'/pages/caregiver-history.html',
    updatedAt:'2026-07-23',   /* 원장 기준일(§2-1). 실제 본문 수정일 아님 */
    lifecycleStatus:'published', factGrades:['customer_ok'] }
];

/* factGrades → 노출범위 계산. 이 함수 밖에서 factGrades를 직접 해석하는 코드를 만들지 않는다
   (§4 원칙 — 두 벌 관리 = 추적 불가). */
function knowledgeVisibility(doc){
  var g = (doc && doc.factGrades) || [];
  if(!g.length) return 'blocked';                           /* 미판정 = 안전측 비노출 */
  if(g.indexOf('customer_blocked') >= 0) return 'blocked';   /* 어떤 공개 화면에도 노출 금지 */
  if(g.indexOf('internal_only')    >= 0) return 'advisor';   /* 로그인 설계사만 */
  return 'public';                                           /* customer_ok만 → 전체 공개 */
}

/* 로그인 여부 판정. 새 인증 로직을 만들지 않고 앱 전역에서 기존에 쓰는 판정 경로
   (window.db.getToken()) 그대로 재사용한다 — app.html:8602/8677 등 여러 곳에서
   "!window.db.getToken()"을 비로그인 판정으로 쓰는 기존 패턴과 동일.
   ⚠️ "로그인 = 설계사"가 참인지는 확인되지 않았다(설계안 §8-5/§14-2, 일반 고객 계정 개념
   유무 미확인). 이 함수는 스케치(§4)대로 "로그인 여부"만 판정한다 — role 기반 판정 아님. */
function knowledgeIsAdvisor(){
  return !!(window.db && typeof window.db.getToken === 'function' && window.db.getToken());
}

/* lifecycleStatus(approved/published만 통과) → visibility 필터(blocked 제외, advisor는 로그인
   시만) → 옵션 필터(category/group/excludeId) 순으로 적용. */
function knowledgeVisibleDocs(opts){
  opts = opts || {};
  var out = [];
  for(var i=0; i<KNOWLEDGE_DOCS.length; i++){
    var doc = KNOWLEDGE_DOCS[i];
    if(doc.lifecycleStatus !== 'approved' && doc.lifecycleStatus !== 'published') continue;

    var vis = knowledgeVisibility(doc);
    if(vis === 'blocked') continue;
    if(vis === 'advisor' && !knowledgeIsAdvisor()) continue;

    if(opts.category && doc.category !== opts.category) continue;
    if(opts.group !== undefined && doc.group !== opts.group) continue;
    if(opts.excludeId && doc.id === opts.excludeId) continue;

    out.push(doc);
  }
  return out;
}

function knowledgeCount(opts){
  return knowledgeVisibleDocs(opts).length;
}

function knowledgeById(id){
  for(var i=0; i<KNOWLEDGE_DOCS.length; i++){
    if(KNOWLEDGE_DOCS[i].id === id) return KNOWLEDGE_DOCS[i];
  }
  return null;
}

function knowledgeIsAdvisorOnly(doc){
  return knowledgeVisibility(doc) === 'advisor';
}

window.KNOWLEDGE_DOCS = KNOWLEDGE_DOCS;
window.knowledgeVisibility = knowledgeVisibility;
window.knowledgeIsAdvisor = knowledgeIsAdvisor;
window.knowledgeVisibleDocs = knowledgeVisibleDocs;
window.knowledgeCount = knowledgeCount;
window.knowledgeById = knowledgeById;
window.knowledgeIsAdvisorOnly = knowledgeIsAdvisorOnly;
