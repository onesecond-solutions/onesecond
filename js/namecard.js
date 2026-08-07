/* 명함 만들기 도구 (#v-namecard) — 임태성 게이트(_canSeeNamecard, index.html 인라인) 전용.
   입력폼(이름·직함·핸드폰·업무폰·팩스·주소) → canvas 미리보기 → 이미지 저장(PNG).
   핸드폰 칸을 비우면 업무폰이 '휴대폰'으로 가운데 자동 배치. DB/fetch/write 0(순수 클라이언트).
   자산(템플릿+아이콘 base64)은 js/namecard-assets.js 지연로드(_ncLazy) — 부팅 부담 0. 2026-08-07 */
(function(){
  var DEF={name:"임태성",title:"팀장",phone:"010.9241.9375",work:"010.7603.6287",
    fax:"0504.046.9104",addr:"서울시 중구 소월로10 · 단암빌딩 18층 |에즈금융 더원지점"};
  var FONT="'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif";
  var built=false, assetsLoading=false, assetsCb=[], tpl=null, ic={};

  function _ncLazy(cb){
    if(window._NC_ASSETS){cb();return;}
    assetsCb.push(cb);
    if(assetsLoading)return;
    assetsLoading=true;
    var s=document.createElement('script');
    s.src='/js/namecard-assets.js?v=20260807';
    s.onload=function(){ var q=assetsCb.slice();assetsCb=[];q.forEach(function(f){try{f();}catch(e){}}); };
    s.onerror=function(){ assetsLoading=false; };
    document.head.appendChild(s);
  }

  function injectStyle(){
    if(document.getElementById('nc-style'))return;
    var css=[
      "#v-namecard .nc-wrap{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:18px;padding:8px 0 40px;}",
      "#v-namecard .nc-back{align-self:flex-start;background:none;border:0;color:var(--tp,#334);font-size:14px;font-weight:700;cursor:pointer;padding:6px 2px;}",
      "#v-namecard .nc-preview{background:#fff;border:1px solid var(--bd,#e2e7ee);border-radius:var(--radius-md,12px);padding:12px;}",
      "#v-namecard canvas{width:100%;height:auto;display:block;border-radius:var(--radius-sm,8px);}",
      "#v-namecard .nc-form{background:var(--s1,#fff);border:1px solid var(--bd,#e2e7ee);border-radius:var(--radius-md,12px);padding:20px 18px 22px;display:flex;flex-direction:column;gap:14px;}",
      "#v-namecard .nc-row{display:flex;flex-direction:column;gap:6px;}",
      "#v-namecard .nc-row label{font-size:12.5px;font-weight:700;color:var(--ts,#5b616e);}",
      "#v-namecard .nc-row label .nc-tag{color:#b0851b;font-weight:700;}",
      "#v-namecard .nc-row input{border:1.6px solid var(--bd,#dfe2e8);border-radius:var(--radius-sm,10px);padding:13px 14px;font-size:16px;font-family:inherit;font-weight:600;color:var(--tp,#191600);background:var(--s0,#fff);width:100%;}",
      "#v-namecard .nc-row input:focus{outline:none;border-color:#F6C000;}",
      "#v-namecard .nc-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}",
      "#v-namecard .nc-btns{display:flex;gap:10px;margin-top:4px;}",
      "#v-namecard .nc-btns button{flex:1;border:0;border-radius:var(--radius-sm,11px);padding:15px;font-size:15.5px;font-weight:800;font-family:inherit;cursor:pointer;}",
      "#v-namecard .nc-save{background:#FFE300;color:#191600;}",
      "#v-namecard .nc-reset{background:var(--s2,#eceef2);color:var(--ts,#5b616e);flex:0 0 auto;padding:15px 20px;}",
      "#v-namecard .nc-hint{font-size:12px;color:var(--ts,#9297a1);line-height:1.6;text-align:center;}",
      "@media(max-width:520px){#v-namecard .nc-grid2{grid-template-columns:1fr;}}"
    ].join('');
    var st=document.createElement('style');st.id='nc-style';st.textContent=css;document.head.appendChild(st);
  }

  function buildUI(){
    if(built)return;
    injectStyle();
    var host=document.getElementById('v-namecard');
    if(!host)return;
    host.innerHTML=''
      +'<div class="nc-wrap">'
      +'<button type="button" class="nc-back" onclick="showView(\'home\')">‹ 홈으로</button>'
      +'<div class="nc-preview"><canvas id="nc-cv" width="1536" height="1024"></canvas></div>'
      +'<div class="nc-form">'
        +'<div class="nc-grid2">'
          +'<div class="nc-row"><label>이름</label><input id="nc-name" type="text" maxlength="12" autocomplete="off"></div>'
          +'<div class="nc-row"><label>직함 <span class="nc-tag">(비워도 됨)</span></label><input id="nc-title" type="text" maxlength="12" autocomplete="off" placeholder="예: 팀장 / 실장"></div>'
        +'</div>'
        +'<div class="nc-row"><label>핸드폰 <span class="nc-tag">(비우면 명함에서 숨겨집니다)</span></label><input id="nc-phone" type="text" inputmode="tel" autocomplete="off" placeholder="비우면 아래 업무폰만 「휴대폰」으로 표시"></div>'
        +'<div class="nc-grid2">'
          +'<div class="nc-row"><label>업무폰</label><input id="nc-work" type="text" inputmode="tel" autocomplete="off"></div>'
          +'<div class="nc-row"><label>팩스</label><input id="nc-fax" type="text" inputmode="tel" autocomplete="off"></div>'
        +'</div>'
        +'<div class="nc-row"><label>주소</label><input id="nc-addr" type="text" autocomplete="off"></div>'
        +'<div class="nc-btns"><button type="button" class="nc-save" id="nc-save">📷 이미지 저장</button><button type="button" class="nc-reset" id="nc-reset">되돌리기</button></div>'
        +'<div class="nc-hint">로고·회사명·홈페이지 등 나머지는 고정입니다. 저장한 이미지를 카카오톡·문자로 그대로 보내세요.<br>핸드폰 번호를 숨기려면 핸드폰 칸을 비우세요 — 업무폰이 「휴대폰」으로 가운데에 표시됩니다.</div>'
      +'</div></div>';
    ['name','title','phone','work','fax','addr'].forEach(function(k){ var e=document.getElementById('nc-'+k); if(e){e.value=DEF[k]; e.addEventListener('input',render);} });
    document.getElementById('nc-save').addEventListener('click',save);
    document.getElementById('nc-reset').addEventListener('click',function(){ ['name','title','phone','work','fax','addr'].forEach(function(k){var e=document.getElementById('nc-'+k);if(e)e.value=DEF[k];}); render(); });
    built=true;
  }

  function val(k){ var e=document.getElementById('nc-'+k); return e?e.value.trim():''; }

  function render(){
    var cv=document.getElementById('nc-cv'); if(!cv||!tpl)return;
    var ctx=cv.getContext('2d');
    function sf(w,s){ctx.font=w+" "+s+"px "+FONT;}
    function fit(t,x,base,maxW,w,s){var z=s;sf(w,z);while(ctx.measureText(t).width>maxW&&z>10){z-=1;sf(w,z);}ctx.fillText(t,x,base);return ctx.measureText(t).width;}
    ctx.clearRect(0,0,1536,1024);
    ctx.drawImage(tpl,0,0,1536,1024);
    ctx.fillStyle="#0a0a08";ctx.textAlign="left";ctx.textBaseline="alphabetic";
    var name=val('name')||DEF.name, title=val('title'), phone=val('phone'),
        work=val('work')||DEF.work, fax=val('fax')||DEF.fax, addr=val('addr')||DEF.addr;
    var nw=fit(name,88,177,250,"900",99);
    if(title){ctx.fillStyle="#0a0a08";sf("800",34);ctx.fillText(title,88+nw+20,168);}
    var rows=[];
    if(phone)rows.push({ic:'phone',label:'핸드폰',num:phone});
    rows.push({ic:'work',label:phone?'업무폰':'휴대폰',num:work});
    rows.push({ic:'fax',label:'팩스',num:fax});
    var tops=rows.length===3?[525,610,695]:[567,652];
    rows.forEach(function(r,i){var t=tops[i];if(ic[r.ic])ctx.drawImage(ic[r.ic],84,t-5);ctx.fillStyle="#0a0a08";fit(r.label,174,t+38,120,"800",29);fit(r.num,311,t+41,290,"800",44);});
    ctx.fillStyle="#1a1a08";fit(addr,154,838,548,"700",30);
  }

  function ensureAssets(cb){
    if(tpl){cb();return;}
    _ncLazy(function(){
      var A=window._NC_ASSETS; if(!A){return;}
      var need=4,done=0,ok=function(){if(++done===need)cb();};
      tpl=new Image();tpl.onload=ok;tpl.src="data:image/png;base64,"+A.tpl;
      ['phone','work','fax'].forEach(function(k){ic[k]=new Image();ic[k].onload=ok;ic[k].src="data:image/png;base64,"+A.icons[k];});
    });
  }

  function save(){
    render();
    var cv=document.getElementById('nc-cv'); if(!cv)return;
    var name=val('name')||DEF.name;
    cv.toBlob(function(b){var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download="명함_"+name+".png";document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},1500);},'image/png');
  }

  window._namecardShow=function(){
    buildUI();
    ensureAssets(function(){ (document.fonts?document.fonts.ready:Promise.resolve()).then(render); });
  };
})();
