/* js/knowledge-category.js — 지식 카테고리 화면(보장분석 6축 뷰 #v-axis-*) 렌더러
   근거: docs/specs/knowledge_category_layout_v2.md §9 화면규격 + 부록 B 폰트 확정값(원문 §8보다 우선)

   ★ 데이터 원천은 원장(js/knowledge-registry.js)뿐이다. 문서 제목·설명·URL·날짜를 여기에 다시
     하드코딩하지 말 것(§12 "화면 전에 원장" — 하드코딩하면 원장을 세운 의미가 사라진다).
     이 파일이 직접 들고 있는 값은 "카테고리 자체의 메타"(축 6개 라벨·갈고리 문장)뿐이며,
     이는 문서 메타가 아니라 화면 카피다(스펙 §2 원문 그대로).
   ★ 원장은 head에서 이 파일보다 먼저 로드된다(app.html head 스크립트 무리). 그래도 방어적으로
     window.knowledgeVisibleDocs 존재 여부를 확인하고, 없으면 조용히 return(빈 화면 유지).
     예외를 던지면 showView 뒤쪽 로직(history pushState 등)까지 죽는다.
   ★ 탭 클릭 = showView('axis-*') 재호출. 자체 라우팅을 만들지 않는다(딥링크·history 정합 유지).
   ★ 게이트(_canSeeCoverage)는 showView 인라인에 이미 있다. 이 파일은 게이트를 다시 구현하지 않는다
     (두 벌 관리 금지). showView를 거치지 않고 _kcShow를 직접 부르는 경로는 없다.
   ★ 읽는 시간 표시 금지(§7) · NEW 배지 이번 범위 제외 · 14.5px 금지(§13 폐기값). */

/* 뷰키 ↔ 원장 category 문자열. 원장의 category 값과 글자 단위로 일치해야 한다
   ('뇌 · 심장'은 가운뎃점 좌우 공백 포함 — 홈 타일 라벨(js/home.js)과도 동일 표기). */
var KC_AXES = [
  { key:'axis-medical',    category:'의료실비',
    hook:'같은 실손보험이라도 가입 시기에 따라 보장과 자기부담이 다릅니다.' },
  { key:'axis-cancer',     category:'암',
    hook:'일반암이라는 말에 회사마다 다른 범위가 들어 있습니다.' },
  { key:'axis-brainheart', category:'뇌 · 심장',
    hook:'뇌졸중 진단비가 있다고 뇌혈관질환 전체가 보장되는 것은 아닙니다.' },
  { key:'axis-surgery',    category:'수술비',
    hook:'수술비라는 이름이 같아도 지급 횟수와 인정 범위는 다릅니다.' },
  { key:'axis-caregiver',  category:'간병',
    hook:'간병보험은 누가 간병하느냐에 따라 지급 구조가 달라집니다.' },
  { key:'axis-etc',        category:'기타',
    hook:'위 다섯 영역에 담기지 않는 보장 주제를 모읍니다.' }
];

function _kcAxis(viewKey){
  for(var i=0;i<KC_AXES.length;i++){ if(KC_AXES[i].key===viewKey) return KC_AXES[i]; }
  return null;
}

/* 동적 문자열은 전부 escape. 원장은 사내 파일이지만 렌더 경로를 안전한 기본값으로 둔다. */
function _kcEsc(s){
  if(typeof window._escHtml==='function') return window._escHtml(s);
  return String(s==null?'':s).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

/* updatedAt은 원장 기준일이지 본문 수정일이 아니다(원장 §2-1 주석). "마지막 수정일"로 표기하지
   않고 YYYY-MM 까지만 잘라 날짜만 보여준다(스펙 §9-1 화면규격). */
function _kcYM(iso){
  var s = String(iso||'');
  return (s.length>=7) ? s.slice(0,7) : s;
}

/* 그룹 칩. 현재 원장은 3건 전부 group:null 이라 항상 빈 배열 → 칩 줄이 :empty로 감춰진다(§4-2).
   그룹이 생기면 여기서 자동으로 나타난다 — 칩 라벨을 따로 하드코딩하지 않는다. */
function _kcGroups(category){
  var docs = window.knowledgeVisibleDocs({category:category});
  var seen = {}, out = [];
  for(var i=0;i<docs.length;i++){
    var g = docs[i].group;
    if(!g || seen[g]) continue;
    seen[g] = 1; out.push(g);
  }
  return out;
}

/* 탭 6개 — 카운트 0인 축도 전부 표시한다(건수 숫자만 생략). 카운트는 원장의 노출 기준
   카운트(knowledgeCount)라 로그인 전후로 값이 달라진다(§5). */
function _kcTabsHtml(currentKey){
  var html = '';
  for(var i=0;i<KC_AXES.length;i++){
    var ax = KC_AXES[i];
    var n  = window.knowledgeCount({category:ax.category});
    html += '<div class="tab'+(ax.key===currentKey?' on':'')+'" '
          + 'onclick="showView(\''+ax.key+'\')">'
          + _kcEsc(ax.category)
          + (n>0 ? '<span class="kc-n">'+n+'</span>' : '')
          + '</div>';
  }
  return html;
}

function _kcChipsHtml(category){
  var groups = _kcGroups(category);
  if(!groups.length) return '';   /* 빈 문자열 → #v-axis-* .chips:empty{display:none} (§4-2) */
  var all = window.knowledgeCount({category:category});
  var html = '<div class="chip on">전체<span class="kc-n">'+all+'</span></div>';
  for(var i=0;i<groups.length;i++){
    var n = window.knowledgeCount({category:category, group:groups[i]});
    html += '<div class="chip">'+_kcEsc(groups[i])+'<span class="kc-n">'+n+'</span></div>';
  }
  return html;
}

/* 문서 목록 = 행 + 얇은 구분선. 카드 박스 금지(§9-2). 링크는 <a href>로 같은 탭 이동 —
   문서는 SPA 뷰가 아니라 독립 URL 페이지다(§11). */
function _kcDocsHtml(category){
  var docs = window.knowledgeVisibleDocs({category:category});
  if(!docs.length){
    /* 빈 카테고리 문구는 스펙 §9-3 원문 그대로. "준비 중" 한 줄로 끝내지 않는다. */
    return '<div class="kc-empty">'
         +   '<div class="kc-empty-t">아직 등록된 자료가 없습니다</div>'
         +   '<div class="kc-empty-d">준비되는 대로 이곳에 올라옵니다.<br>다른 영역의 자료는 지금 보실 수 있습니다.</div>'
         + '</div>';
  }
  var html = '';
  for(var i=0;i<docs.length;i++){
    var d = docs[i];
    var advisorOnly = (typeof window.knowledgeIsAdvisorOnly==='function') && window.knowledgeIsAdvisorOnly(d);
    html += '<a class="kc-doc" href="'+_kcEsc(d.url)+'">'
          /* 제목 = label(정본 라벨). documentTitle은 페이지 h1 실텍스트 대조·검증용이라
             "표시용 아님"으로 원장 설계(docs/specs/knowledge_registry_v1.md §2 필드표)에 못박혀 있다. */
          +   '<div class="kc-doc-t">'+_kcEsc(d.label||'')
          +     (advisorOnly ? '<span class="kc-badge">설계사 전용</span>' : '')
          +   '</div>'
          +   '<div class="kc-doc-d">'+_kcEsc(d.description||'')+'</div>'
          +   '<div class="kc-doc-m">'+_kcEsc(_kcYM(d.updatedAt))+'</div>'
          + '</a>';
  }
  return html;
}

/* showView 렌더 디스패치에서 호출된다: showView('axis-cancer') → _kcShow('axis-cancer').
   진입할 때마다 전체를 다시 그린다(상태 없음 = 로그인 전후 카운트 stale 없음). */
function _kcShow(viewKey){
  var ax = _kcAxis(viewKey);
  if(!ax) return;
  var root = document.getElementById('v-'+viewKey);
  if(!root) return;
  /* 원장 미로드 = 조용히 종료(빈 화면 유지). 예외를 던지면 showView 뒤쪽이 죽는다. */
  if(typeof window.knowledgeVisibleDocs!=='function' || typeof window.knowledgeCount!=='function') return;

  var chips = _kcChipsHtml(ax.category);
  var total = window.knowledgeCount({category:ax.category});

  /* ⚠️ 버그수정(2026-07-24): 아래 root.innerHTML 재생성은 이 root 안에 들어와 있던 #homeSearch를
     통째로 파괴(detach)한다. 부팅/재렌더로 _kcShow가 이 축에 두 번 이상 불리면(딥링크 진입 등)
     슬롯 안 검색기가 파괴되거나 홈에 남아 '검색기가 홈 모양으로 뜨는' 회귀가 났다.
     → 렌더 직전에 #homeSearch가 이 root 안에 있으면 홈으로 먼저 대피시켜 파괴를 막는다.
     (아래 렌더 끝에서 _kcHomeSearchMove로 새 슬롯에 다시 넣는다.) */
  try{
    var _hsSafe=document.getElementById('homeSearch');
    if(_hsSafe && root.contains(_hsSafe) && typeof window._kcHomeSearchRestore==='function'){
      window._kcHomeSearchRestore();
    }
  }catch(e){}

  root.innerHTML =
    /* 상단 검색 슬롯 — 홈 #homeSearch를 그대로 이동시켜 넣을 빈 컨테이너(대표 지시, 2026-07-24: 새 검색기 금지, 재사용만).
       id를 두지 않고 class만 둔다 — 6개 축 뷰가 각자 렌더될 때마다 슬롯이 새로 생기므로, id를 공유하면
       이전에 방문했던 다른 축 뷰에 남아있는 슬롯과 겹쳐 document.getElementById가 엉뚱한(비활성) 슬롯을
       찾는 사고가 난다. 이동/복귀는 _kcHomeSearchMove/_kcHomeSearchRestore(아래)가 '#v-'+key 스코프로 조회한다. */
    /* 홈 버튼('홈')을 검색 슬롯 좌측에 둔다(대표 지시 2026-07-24: "홈으로"→"홈", 검색기 좌측).
       #homeSearch가 이 슬롯에 appendChild되므로 홈 버튼은 슬롯 안 좌측 absolute로 띄우고
       검색 박스는 그대로 640 중앙(css/knowledge-category.css). 별도 kc-top 줄은 폐지. */
    '<div class="kc-searchslot"><button class="kc-back" type="button" onclick="showView(\'home\')">홈</button></div>' +
    '<div class="tabs kc-tabs">'+_kcTabsHtml(viewKey)+'</div>' +
    '<div class="chips kc-chips">'+chips+'</div>' +
    '<div class="kc-scroll"><div class="kc-body">' +
      '<div class="kc-kicker">보장 영역</div>' +
      '<h1 class="kc-h1">'+_kcEsc(ax.category)+'</h1>' +
      '<div class="kc-hook">'+_kcEsc(ax.hook)+'</div>' +
      '<div class="kc-count">자료 '+total+'건</div>' +
      '<div class="kc-rule"></div>' +
      '<div class="kc-list">'+_kcDocsHtml(ax.category)+'</div>' +
    '</div></div>';

  /* 렌더 끝 — 이 뷰가 활성 축이면 #homeSearch를 새로 만든 슬롯으로 이동시킨다(2026-07-24 버그수정).
     showView가 axis 진입 시 별도로 _kcHomeSearchMove를 부르지만, 부팅 타이밍/재렌더로 순서가 어긋나도
     _kcShow가 스스로 이동을 완결해 '검색기가 홈 모양으로 남는' 회귀를 원천 차단한다(멱등이라 중복 호출 무해). */
  try{ if(typeof window._kcHomeSearchMove==='function') window._kcHomeSearchMove(viewKey); }catch(e){}
}

/* ════ 카테고리 상단 검색기 = 홈 #homeSearch 재사용(슬롯 이동 방식, 대표 지시 2026-07-24) ════
   대표 명시: "별도 검색 기능 새로 만들지 말 것". #homeSearch/hsInput/hsSuggest/hsResults는 문서에
   하나뿐이고 _hsInput/_hsSearch/_hsClear/_ac 계열/_runSearchV2가 그 id에 결합돼 있다 — 복제하면 id 중복으로
   홈 검색이 깨진다. 그래서 노드를 복제하지 않고 이동(appendChild)만 한다. 이동 대상 슬롯은 항상
   '#v-'+viewKey 스코프로 조회 — 6개 축 뷰 중 이미 렌더된 다른 축의 슬롯과 절대 안 섞인다(위 _kcShow 주석 참고).
   showView(app.html)가 axis-* 렌더 직후 _kcHomeSearchMove(key)를, 그 외 키로 갈 때 _kcHomeSearchRestore()를 호출한다. */
function _kcHomeSearchMove(viewKey){
  var hs = document.getElementById('homeSearch');
  if(!hs) return;
  var slot = document.querySelector('#v-'+viewKey+' .kc-searchslot');
  if(!slot) return;
  if(hs.parentNode !== slot) slot.appendChild(hs);
  hs.classList.add('kc-search-mode');
  var hi = document.getElementById('hsInput');
  if(hi) hi.placeholder = '원세컨드 전체에서 검색하세요';
}
window._kcHomeSearchMove = _kcHomeSearchMove;

/* 카테고리 이탈 시 #homeSearch를 #v-home 원위치(.home-greeting 바로 다음)로 복귀.
   복귀시키지 않으면 홈 검색이 화면에서 사라지는 회귀(대표 금지 사항 1순위) — showView가 axis-* 아닌
   모든 키로 이동할 때마다(홈 포함) 호출한다. 이미 원위치면 아무 것도 하지 않는다(멱등). */
function _kcHomeSearchRestore(){
  var hs = document.getElementById('homeSearch');
  if(!hs) return;
  var hg = document.querySelector('#v-home .home-greeting');
  if(hg && hg.parentNode && hs.parentNode !== hg.parentNode){
    hg.parentNode.insertBefore(hs, hg.nextSibling);
  }
  hs.classList.remove('kc-search-mode');
  var hi = document.getElementById('hsInput');
  if(hi) hi.placeholder = '상품·인수기준·질병명·자료 검색';
}
window._kcHomeSearchRestore = _kcHomeSearchRestore;

window.KC_AXES = KC_AXES;
window._kcShow = _kcShow;
