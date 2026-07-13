/* tools-calc.js — 사칙연산 계산기 도구(독립 상태머신, eval 미사용). DB/인증 무관, DOM+window._calcState만.
   app.html 인라인 <script>에서 분리(파일 분리 Phase 2, 2026-07-08). 함수 본문 무변경.
   ⚠️ 인라인 <script>보다 먼저 로드해야 함: _TOOL_PAGE_MAP(app.html)이 빌드 시점에 renderCalcTool 참조를 캡처(호이스팅) → 외부 이동 시 인라인 실행 전 전역 정의 필요.
   전역 등록: window.renderCalcTool / _calcKey (그 외 _calcFmt·_calcLine·_calcRender·_calcEquals·_CALC_SYM = 파일 내부 전용).
   revert: 이 블록을 app.html 원위치(포인터 주석 자리)로 복원 + <script src="/js/tools-calc.js"> 제거. */

/* ════ 실제 계산기(사칙연산) — 독립 도구 허브. eval 미사용 상태머신. 2026-07-05 ════ */
/* 키보드 입력(2026-07-13 추가): 포커스 기반 활성화. 컨테이너(.calc-tool)에 tabindex 부여 →
   컨테이너 스코프 keydown 리스너 1개만 부착(버블링으로 내부 버튼/디스플레이 포커스 시에도 수신).
   렌더 때마다 slot.innerHTML로 컨테이너 자체가 새 DOM 노드로 교체되므로 이전 리스너는 이전 노드와 함께
   버려짐(누수/중복 없음, 별도 해제 플래그 불필요). 컨테이너 밖 이벤트는 애초에 도달하지 않으므로
   검색창 등 타 input/textarea에는 절대 간섭하지 않음. */
function renderCalcTool(slotId){
  var slot=document.getElementById(slotId||'qck-content-slot'); if(!slot) return;
  window._calcState={cur:'0',prev:null,op:null,fresh:true,expr:'',justEq:false,eqLine:''};
  var keys=[
    ['C','C','op'],['back','←','op'],['%','%','op'],['/','÷','opr'],
    ['7','7',''],['8','8',''],['9','9',''],['*','×','opr'],
    ['4','4',''],['5','5',''],['6','6',''],['-','−','opr'],
    ['1','1',''],['2','2',''],['3','3',''],['+','+','opr'],
    ['+/-','±','op'],['0','0',''],['.','.',''],['=','=','eq']
  ];
  var pad=keys.map(function(k){ return '<button type="button" class="calc-btn'+(k[2]?' '+k[2]:'')+'" data-k="'+k[0]+'" onclick="_calcKey(\''+k[0]+'\')">'+k[1]+'</button>'; }).join('');
  slot.innerHTML='<div class="calc-tool" tabindex="0" aria-label="계산기(키보드 입력 가능)"><input type="text" class="calc-disp" id="calcDisp" value="0" readonly aria-label="계산"><div class="calc-pad">'+pad+'</div></div>';
  _calcEnsureKbdStyle();
  var box=slot.querySelector('.calc-tool');
  if(box){
    box.addEventListener('keydown', _calcOnKeydown);
    box.focus({preventScroll:true});   /* 진입 즉시 키보드 입력 가능(자동 포커스). preventScroll=포커스로 화면 튐 방지. 다른 곳 클릭 시 포커스 빠져 무간섭 유지 (2026-07-13) */
  }
}
window.renderCalcTool=renderCalcTool;
/* 포커스 링(.calc-tool:focus) + 키 하이라이트(.calc-btn.kbd-active) 스타일 — app.html 미수정 위해 JS로 1회만 주입(id 가드) */
function _calcEnsureKbdStyle(){
  if(document.getElementById('calc-kbd-style')) return;
  var st=document.createElement('style');
  st.id='calc-kbd-style';
  st.textContent='.calc-tool{outline:none;border-radius:var(--radius-md,10px);}'
    +'.calc-tool:focus,.calc-tool:focus-visible{outline:2px solid var(--ac);outline-offset:2px;}'
    +'.calc-btn.kbd-active{box-shadow:0 0 0 2px var(--ac) inset;}';
  document.head.appendChild(st);
}
/* keydown → _calcKey 키값 매핑. 넘패드는 e.code로 판별(NumLock 꺼짐 시 e.key가 방향키 등으로 바뀌는 문제 방지),
   일반 키보드는 e.key로 판별. 매칭 없으면 null(=그 외 키는 무시, 계산기가 가로채지 않음). */
function _calcMapKeyFromEvent(e){
  var code=e.code||'';
  if(code==='NumpadDecimal') return '.';
  if(code==='NumpadAdd') return '+';
  if(code==='NumpadSubtract') return '-';
  if(code==='NumpadMultiply') return '*';
  if(code==='NumpadDivide') return '/';
  if(code==='NumpadEnter') return '=';
  if(/^Numpad[0-9]$/.test(code)) return code.slice(6);
  var k=e.key;
  if(k==null) return null;
  if(k>='0'&&k<='9') return k;
  if(k==='.') return '.';
  if(k==='+'||k==='-'||k==='*'||k==='/') return k;
  if(k==='Enter'||k==='=') return '=';
  if(k==='Backspace') return 'back';
  if(k==='Escape') return 'C';
  if(k==='%') return '%';
  return null;
}
/* 컨테이너(.calc-tool) 스코프 keydown 핸들러 — 계산기 밖 이벤트는 애초에 도달하지 않음(버블링 범위=컨테이너 서브트리) */
function _calcOnKeydown(e){
  var k=_calcMapKeyFromEvent(e);
  if(k==null) return;   /* 매핑 없는 키는 그대로 통과(Tab 등 기본 동작 보존) */
  e.preventDefault();
  _calcKey(k);
  var box=e.currentTarget;
  var btn=box&&box.querySelector('[data-k="'+k+'"]');
  if(btn){
    btn.classList.add('kbd-active');
    setTimeout(function(){ btn.classList.remove('kbd-active'); }, 150);
  }
}
function _calcFmt(s){   /* 표시용 세자리 콤마 — 정수부만 콤마(소수부·부호·오류·입력중 '.' 보존). cur는 raw 유지 */
  if(s==null||s==='오류') return s||'0';
  var neg=(s.charAt(0)==='-'); if(neg) s=s.slice(1);
  var p=s.split('.'); if(!/^\d*$/.test(p[0])) return (neg?'-':'')+s;   /* 지수표기 등 예외는 그대로 */
  var intp=(p[0]||'0').replace(/\B(?=(\d{3})+(?!\d))/g,',');
  return (neg?'-':'')+intp+(p.length>1?('.'+p[1]):'');
}
var _CALC_SYM={'+':'+','-':'−','*':'×','/':'÷'};
/* 한 줄 표시 — 입력 중=수식 진행("20 + 30"), = 후=수식+결과 한 줄("20 + 30 = 50") */
function _calcLine(s){
  if(!s) return '0';
  if(s.cur==='오류') return '오류';
  if(s.justEq) return s.eqLine||_calcFmt(s.cur);
  var left=s.expr||'';
  if(s.fresh && left) return left.replace(/\s+$/,'');   /* 연산자 직후: "20 +" */
  return left+_calcFmt(s.cur);                          /* "20 + 30" 또는 "30" */
}
function _calcRender(){ var d=document.getElementById('calcDisp'); if(d) d.value=_calcLine(window._calcState); }
function _calcEquals(){
  var s=window._calcState; if(!s||s.op==null||s.prev==null) return;
  var a=s.prev, b=parseFloat(s.cur), r=0;
  if(s.op==='+')r=a+b; else if(s.op==='-')r=a-b; else if(s.op==='*')r=a*b; else if(s.op==='/')r=(b===0?NaN:a/b);
  if(isNaN(r)||!isFinite(r)){ s.cur='오류'; } else { r=Math.round(r*1e10)/1e10; s.cur=String(r); }
  s.prev=null; s.fresh=true;
}
function _calcKey(k){
  var s=window._calcState; if(!s){ window._calcState=s={cur:'0',prev:null,op:null,fresh:true,expr:'',justEq:false}; }
  if(s.cur==='오류' && k!=='C'){ return; }
  if(k==='C'){ s.cur='0'; s.prev=null; s.op=null; s.fresh=true; s.expr=''; s.justEq=false; }
  else if(k==='back'){ if(!s.fresh){ s.cur=(s.cur.length>1)?s.cur.slice(0,-1):'0'; if(s.cur==='-')s.cur='0'; } }
  else if(k==='.'){ if(s.justEq){ s.cur='0'; s.expr=''; s.justEq=false; s.fresh=false; s.cur='0.'; } else if(s.fresh){ s.cur='0.'; s.fresh=false; } else if(s.cur.indexOf('.')<0){ s.cur+='.'; } }
  else if('0123456789'.indexOf(k)>=0){ if(s.justEq){ s.expr=''; s.justEq=false; s.cur=k; s.fresh=false; } else if(s.fresh||s.cur==='0'){ s.cur=k; s.fresh=false; } else { s.cur+=k; } }
  else if(k==='+'||k==='-'||k==='*'||k==='/'){
    if(s.op!=null && !s.fresh){ _calcEquals(); }
    s.prev=parseFloat(s.cur); s.op=k; s.fresh=true; s.justEq=false;
    s.expr=_calcFmt(s.cur)+' '+_CALC_SYM[k]+' ';
  }
  else if(k==='='){
    if(s.op!=null && s.prev!=null){
      var _lft=_calcFmt(String(s.prev))+' '+_CALC_SYM[s.op]+' '+_calcFmt(s.cur);
      _calcEquals(); s.eqLine=_lft+' = '+_calcFmt(s.cur); s.op=null; s.justEq=true;
    }
  }
  else if(k==='%'){ s.cur=String(parseFloat(s.cur)/100); s.fresh=true; }
  else if(k==='+/-'){ if(s.cur!=='0'&&s.cur!=='오류') s.cur=(s.cur.charAt(0)==='-')?s.cur.slice(1):('-'+s.cur); }
  _calcRender();
}
window._calcKey=_calcKey;
