/* home.js — 홈 검색 "자주 찾는 보험 자료" 타일 + 최근 검색 칩 렌더
   app.html 인라인 <script>에서 분리(파일 분리 Phase 2, 2026-07-08). 기능·로직 무변경.
   - 전역 등록: window._hs2RenderHub / _hs2RenderRecent / _hs2RecentSave / _hs2RecentRemove / _hs2RecentClear / _hs2RecentClick
   - 외부 의존(런타임만): window._canSeeRoadmap / window._canSeeNl / window._hsSearch / showView(onclick, 전역), document.body 클래스
   - app.html 내 호출부(_hs2*)는 typeof 가드 + 런타임(로그인/검색) 호출이라 로드 순서 무관.
   - revert: app.html에서 <script src="/js/home.js"></script> 제거 + 이 블록을 인라인으로 복원. */

/* 자주 찾는 보험 자료 타일 — 하드코딩 6개 고정이 아니라 각 타일이 링크하는 기능의 실제 공개 상태(게이트 함수/클래스)로 필터링해 생성.
   진입은 기존 showView 재사용(기능 로직 무변경). 전체 개방(is-uat-homesearch2 제거) 후에도 미공개 기능 타일(알릴의무 등)은 일반 홈에 안 생김.
   show() = 각 view의 showView 가드와 동일 조건: product-lineup·tool·scripts=전체개방 / goji=_canSeeRoadmap / newsletters=_canSeeNl / silson=전체개방(2026-07-21, cancer-treatment 전례). 2026-07-07 */
var _HS2_TILES=[
  {v:'product-lineup', ic:'i-box',      t:'상품 라인업',       d:'원수사 상품 한눈에 비교',   show:function(){return true;}},
  {v:'goji',           ic:'i-check',    t:'알릴의무',          d:'회사별 고지유형·간편고지',  show:function(){return typeof window._canSeeRoadmap==='function'&&window._canSeeRoadmap();}},
  {v:'newsletters',    ic:'i-building', t:'소식지',            d:'원수사·GA 월별 모음',       show:function(){return typeof window._canSeeNl==='function'&&window._canSeeNl();}},
  /* 실비 변천사 = 전체 개방(2026-07-21 대표 승인, cancer-treatment 전례) — show:true(게이트 없음). 비로그인 포함 누구나 노출 */
  {v:'silson',         ic:'i-file',     t:'실비 변천사',       d:'실손 1~5세대 보장·전환',    show:function(){return true;}},
  /* 암주요치료비 변천사 = 전체 개방(2026-07-20 대표 승인, 상품 라인업·도구 페이지 전례) — show:true(게이트 없음). 비로그인 포함 누구나 노출 */
  {v:'cancer-treatment', ic:'i-file',   t:'암주요치료비 변천사', d:'세대별 암 치료비 보장 변화', show:function(){return true;}},
  /* 간병보험 변천사 = 전체공개(2026-07-21 대표 승인, cancer-treatment 전례) — show:true(게이트 없음). 비로그인 포함 누구나 노출. order_hint=변천사 인접 */
  {v:'caregiver-history', ic:'i-file',  t:'간병보험 변천사', d:'장기간병~사용일당 · 지급기준이 다름', show:function(){return true;}},
  {v:'bojang', ic:'i-file', t:'보장분석', d:'의료실비·암·뇌심장·수술비 종합 · 고객 발송', show:function(){return typeof window._canSeeCoverage==='function'&&window._canSeeCoverage();}},
  /* X-FILE = 임태성 게이트 전용 빈 페이지(#v-xfile) 골격. cls = 이 타일에만 붙는 붉은 계열 스코프 클래스(다른 타일 무영향). 게이트는 _canSeeXfile(app.html 인라인) — _canSeeCoverage와 조건은 같으나 독립 함수라 개방 시점을 따로 제어. (2026-07-17) */
  {v:'xfile', ic:'i-file', t:'X-FILE', d:'내 보험 어때? · 4가지 자가 검진', cls:'hs2-hub-tile--xfile', show:function(){return typeof window._canSeeXfile==='function'&&window._canSeeXfile();}},
  {v:'scripts',        ic:'i-msg',      t:'스크립트',          d:'상담 멘트·화법',            show:function(){return true;}},
  {v:'tool',           ic:'i-folder',   t:'계산기 · 변환기',   d:'BMI·보험연령·이미지 변환',  show:function(){return true;}}
  /* 스마트 설계서 = 기능 준비 중, 준비되면 여기 같은 패턴(show:_canSeeXXX)으로 추가 */
];
function _hs2RenderHub(){
  var grid=document.querySelector('.hs2-hub .hs2-hub-grid'); if(!grid) return;
  var h='';
  for(var i=0;i<_HS2_TILES.length;i++){ var t=_HS2_TILES[i]; if(typeof t.show==='function'&&!t.show()) continue;
    h+='<button type="button" class="hs2-hub-tile'+(t.cls?' '+t.cls:'')+'" onclick="showView(\''+t.v+'\')"><span class="hs2-hub-ic"><svg class="sp-ico"><use href="#'+t.ic+'"/></svg></span><span class="hs2-hub-tx"><b>'+t.t+'</b><em>'+t.d+'</em></span></button>';
  }
  grid.innerHTML=h;
}
window._hs2RenderHub=_hs2RenderHub;
/* 최근 검색(is-uat-homesearch2) — 그 기기 기준 localStorage. 검색 실행 시 _hsSearch에서 _hs2RecentSave 훅으로 적재, 홈 진입/검색 후 _hs2RenderRecent로 실제 칩 렌더. 검색 함수 로직 무접촉. 2026-07-07 */
var _HS2_RECENT_KEY='onesecond_recent_search', _HS2_RECENT_MAX=8;
function _hs2RecentLoad(){ try{ var a=JSON.parse(localStorage.getItem(_HS2_RECENT_KEY)||'[]'); return Array.isArray(a)?a.filter(function(x){return typeof x==='string'&&x.trim();}):[]; }catch(e){ return []; } }
function _hs2RecentSave(q){ try{ q=(q||'').trim(); if(!q) return; var a=_hs2RecentLoad().filter(function(x){return x!==q;}); a.unshift(q); if(a.length>_HS2_RECENT_MAX) a=a.slice(0,_HS2_RECENT_MAX); localStorage.setItem(_HS2_RECENT_KEY, JSON.stringify(a)); }catch(e){} try{ _hs2RenderRecent(); }catch(e){} }
function _hs2RecentRemove(q){ try{ var a=_hs2RecentLoad().filter(function(x){return x!==q;}); localStorage.setItem(_HS2_RECENT_KEY, JSON.stringify(a)); }catch(e){} try{ _hs2RenderRecent(); }catch(e){} }
function _hs2RecentClear(){ try{ localStorage.removeItem(_HS2_RECENT_KEY); }catch(e){} try{ _hs2RenderRecent(); }catch(e){} }
function _hs2RecentEsc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function _hs2RecentClick(q){ var i=document.getElementById('hsInput'); if(i) i.value=q; if(typeof window._hsSearch==='function') window._hsSearch(q); }
window._hs2RecentSave=_hs2RecentSave; window._hs2RecentRemove=_hs2RecentRemove; window._hs2RecentClear=_hs2RecentClear; window._hs2RecentClick=_hs2RecentClick;
function _hs2RenderRecent(){
  var aux=document.querySelector('#homeSearch .hs2-aux'); if(!aux) return;
  var wrap=aux.querySelector('.hs2-recent'); if(!wrap) return;
  var a=_hs2RecentLoad();
  if(!a.length){ aux.style.display='none'; wrap.innerHTML=''; return; }
  var h='';
  for(var i=0;i<a.length;i++){ var q=_hs2RecentEsc(a[i]);
    h+='<span class="hs2-recent-chip" role="button" tabindex="0" data-q="'+q+'" onclick="_hs2RecentClick(this.getAttribute(\'data-q\'))" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();_hs2RecentClick(this.getAttribute(\'data-q\'));}">'+q+'<button type="button" class="hs2-recent-x" aria-label="최근 검색에서 삭제" onclick="event.stopPropagation();_hs2RecentRemove(this.parentNode.getAttribute(\'data-q\'))">&#10005;</button></span>';
  }
  wrap.innerHTML=h;
  aux.style.display='';   /* '' = CSS 게이트에 위임(게이트 계정만 block, 검색 중엔 .searching 규칙이 숨김). 'block' 인라인 금지(검색 중 숨김 규칙을 덮어씀) */
}
window._hs2RenderRecent=_hs2RenderRecent;
