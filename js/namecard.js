/* 명함 만들기 도구 (#v-namecard) — 임태성 게이트(_canSeeNamecard, index.html 인라인) 전용.
   가로형/세로형 선택 + 입력폼(이름·직함·핸드폰·업무폰·팩스·주소) → canvas 미리보기 → 이미지 저장(PNG).
   핸드폰 칸을 비우면 업무폰이 '휴대폰'으로 가운데 자동 배치. DB/fetch/write 0(순수 클라이언트).
   자산(가로+세로 템플릿·아이콘 base64)은 js/namecard-assets.js 지연로드(_ncLazy) — 부팅 부담 0. 2026-08-07 v2 */
(function(){
  var DEF={name:"임태성",title:"팀장",phone:"010.9241.9375",work:"010.7603.6287",
    fax:"0504.046.9104",addr:"서울시 중구 소월로10 · 단암빌딩 18층 | 에즈금융 더원지점"};
  var FONT="'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif";
  var CFG={
    h:{W:1536,H:1024,
       name:{x:88,base:177,font:99,w:"900",maxW:250},
       title:{font:34,w:"800",dx:20,base:168},
       rows:{tops3:[525,610,695],tops2:[567,652],icon:function(T){return [84,T-5,66,66];},
             label:{x:174,dy:38,font:29,maxW:120},divider:null,num:{x:311,dy:41,font:44,maxW:290}},
       addr:{x:154,base:838,font:30,maxW:548}},
    v:{W:1080,H:1920,
       name:{x:82,base:400,font:128,w:"900",maxW:460},
       title:{font:44,w:"800",dx:22,base:388},
       rows:{tops3:[1088,1240,1392],tops2:[1164,1316],icon:function(T){return [82,T,98,92];},
             label:{x:213,dy:62,font:33,maxW:150},divider:{x:410,y1:32,y2:62,width:3},num:{x:438,dy:74,font:75,maxW:560}},
       addr:{x:130,base:1617,font:52,maxW:860}}
  };
  var built=false, assetsLoading=false, assetsCb=[], mode='h', cache={};
  var cv=null, ctx=null;

  function _ncLazy(cb){
    if(window._NC_ASSETS){cb();return;}
    assetsCb.push(cb);
    if(assetsLoading)return;
    assetsLoading=true;
    var s=document.createElement('script');
    s.src='/js/namecard-assets.js?v=20260807b';
    s.onload=function(){ var q=assetsCb.slice();assetsCb=[];q.forEach(function(f){try{f();}catch(e){}}); };
    s.onerror=function(){ assetsLoading=false; };
    document.head.appendChild(s);
  }

  function injectStyle(){
    if(document.getElementById('nc-style'))return;
    var css=[
      "#v-namecard .nc-wrap{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:16px;padding:8px 0 40px;}",
      "#v-namecard .nc-back{align-self:flex-start;background:none;border:0;color:var(--tp,#334);font-size:14px;font-weight:700;cursor:pointer;padding:6px 2px;}",
      "#v-namecard .nc-seg{display:flex;background:var(--s2,#e7eaef);border-radius:var(--radius-sm,12px);padding:4px;max-width:320px;margin:0 auto;width:100%;}",
      "#v-namecard .nc-seg button{flex:1;border:0;background:none;padding:11px;font-size:14.5px;font-weight:800;font-family:inherit;color:var(--ts,#6b7280);border-radius:9px;cursor:pointer;transition:all .15s;}",
      "#v-namecard .nc-seg button.on{background:var(--s0,#fff);color:var(--tp,#191600);box-shadow:0 1px 4px rgba(0,0,0,.12);}",
      "#v-namecard .nc-preview{background:#fff;border:1px solid var(--bd,#e2e7ee);border-radius:var(--radius-md,12px);padding:12px;display:flex;justify-content:center;}",
      "#v-namecard canvas{max-width:100%;height:auto;display:block;border-radius:var(--radius-sm,8px);}",
      "#v-namecard.nc-v .nc-preview canvas{max-width:360px;}",
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
      +'<div class="nc-seg"><button type="button" id="nc-seg-h" class="on">가로형</button><button type="button" id="nc-seg-v">세로형</button></div>'
      +'<div class="nc-preview"><canvas id="nc-cv" width="1536" height="1024"></canvas></div>'
      +'<div class="nc-form">'
        +'<div class="nc-grid2">'
          +'<div class="nc-row"><label>이름</label><input id="nc-name" type="text" maxlength="12" autocomplete="off"></div>'
          +'<div class="nc-row"><label>직함 <span class="nc-tag">(비워도 됨)</span></label><input id="nc-title" type="text" maxlength="12" autocomplete="off" placeholder="예: 팀장 / 실장"></div>'
        +'</div>'
        +'<div class="nc-row"><label>핸드폰 <span class="nc-tag">(비우면 숨겨집니다)</span></label><input id="nc-phone" type="text" inputmode="tel" autocomplete="off" placeholder="비우면 업무폰만 「휴대폰」으로 표시"></div>'
        +'<div class="nc-grid2">'
          +'<div class="nc-row"><label>업무폰</label><input id="nc-work" type="text" inputmode="tel" autocomplete="off"></div>'
          +'<div class="nc-row"><label>팩스</label><input id="nc-fax" type="text" inputmode="tel" autocomplete="off"></div>'
        +'</div>'
        +'<div class="nc-row"><label>주소</label><input id="nc-addr" type="text" autocomplete="off"></div>'
        +'<div class="nc-btns"><button type="button" class="nc-save" id="nc-save">📷 이미지 저장</button><button type="button" class="nc-reset" id="nc-reset">되돌리기</button></div>'
        +'<div class="nc-hint">로고·회사명 등 나머지는 고정입니다. 위에서 가로형/세로형을 고르고 저장하세요.<br>핸드폰을 숨기려면 핸드폰 칸을 비우면 업무폰이 「휴대폰」으로 가운데에 표시됩니다.</div>'
      +'</div></div>';
    ['name','title','phone','work','fax','addr'].forEach(function(k){ var e=document.getElementById('nc-'+k); if(e){e.value=DEF[k]; e.addEventListener('input',render);} });
    document.getElementById('nc-seg-h').addEventListener('click',function(){setMode('h');});
    document.getElementById('nc-seg-v').addEventListener('click',function(){setMode('v');});
    document.getElementById('nc-save').addEventListener('click',save);
    document.getElementById('nc-reset').addEventListener('click',function(){ ['name','title','phone','work','fax','addr'].forEach(function(k){var e=document.getElementById('nc-'+k);if(e)e.value=DEF[k];}); render(); });
    cv=document.getElementById('nc-cv'); ctx=cv.getContext('2d');
    built=true;
  }

  function val(k){ var e=document.getElementById('nc-'+k); return e?e.value.trim():''; }
  function sf(w,s){ctx.font=w+" "+s+"px "+FONT;}
  function fit(t,x,base,maxW,w,s){var z=s;sf(w,z);while(ctx.measureText(t).width>maxW&&z>10){z-=1;sf(w,z);}ctx.fillText(t,x,base);return ctx.measureText(t).width;}

  function render(){
    if(!cv||!ctx)return;
    var C=CFG[mode], as=cache[mode]; if(!as||!as.tpl)return;
    cv.width=C.W; cv.height=C.H;
    ctx.clearRect(0,0,C.W,C.H);
    ctx.drawImage(as.tpl,0,0,C.W,C.H);
    ctx.fillStyle="#0a0a08"; ctx.textAlign="left"; ctx.textBaseline="alphabetic";
    var name=val('name')||DEF.name, title=val('title'), phone=val('phone'),
        work=val('work')||DEF.work, fax=val('fax')||DEF.fax, addr=val('addr')||DEF.addr;
    var nw=fit(name,C.name.x,C.name.base,C.name.maxW,C.name.w,C.name.font);
    if(title){ctx.fillStyle="#0a0a08";sf(C.title.w,C.title.font);ctx.fillText(title,C.name.x+nw+C.title.dx,C.title.base);}
    var rows=[];
    if(phone) rows.push({ic:'phone',label:'핸드폰',num:phone});
    rows.push({ic:'work',label:phone?'업무폰':'휴대폰',num:work});
    rows.push({ic:'fax',label:'팩스',num:fax});
    var R=C.rows, tops = rows.length===3?R.tops3:R.tops2;
    rows.forEach(function(r,i){
      var T=tops[i], ir=R.icon(T);
      if(as.ic[r.ic]) ctx.drawImage(as.ic[r.ic],ir[0],ir[1],ir[2],ir[3]);
      ctx.fillStyle="#0a0a08";
      fit(r.label,R.label.x,T+R.label.dy,R.label.maxW,"800",R.label.font);
      if(R.divider){ctx.strokeStyle="rgba(20,20,14,.82)";ctx.lineWidth=R.divider.width;ctx.beginPath();ctx.moveTo(R.divider.x,T+R.divider.y1);ctx.lineTo(R.divider.x,T+R.divider.y2);ctx.stroke();}
      ctx.fillStyle="#0a0a08";
      fit(r.num,R.num.x,T+R.num.dy,R.num.maxW,"800",R.num.font);
    });
    ctx.fillStyle="#1a1a08";
    fit(addr,C.addr.x,C.addr.base,C.addr.maxW,"700",C.addr.font);
  }

  function loadMode(m,cb){
    if(cache[m]&&cache[m].tpl){cb();return;}
    _ncLazy(function(){
      var A=window._NC_ASSETS; if(!A||!A[m]){return;}
      cache[m]={tpl:null,ic:{}};
      var src=A[m], need=4,done=0,ok=function(){if(++done===need)cb();};
      var t=new Image();t.onload=function(){cache[m].tpl=t;ok();};t.src="data:image/png;base64,"+src.tpl;
      ['phone','work','fax'].forEach(function(k){var im=new Image();im.onload=function(){cache[m].ic[k]=im;ok();};im.src="data:image/png;base64,"+src.icons[k];});
    });
  }

  function setMode(m){
    mode=m;
    var host=document.getElementById('v-namecard');
    if(host){host.classList.toggle('nc-v',m==='v');host.classList.toggle('nc-h',m==='h');}
    var bh=document.getElementById('nc-seg-h'),bv=document.getElementById('nc-seg-v');
    if(bh)bh.classList.toggle('on',m==='h'); if(bv)bv.classList.toggle('on',m==='v');
    loadMode(m,function(){ (document.fonts?document.fonts.ready:Promise.resolve()).then(render); });
  }

  function save(){
    render();
    if(!cv)return;
    var name=val('name')||DEF.name;
    cv.toBlob(function(b){var a=document.createElement('a');a.href=URL.createObjectURL(b);
      a.download="명함_"+name+"_"+(mode==='v'?"세로":"가로")+".png";
      document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},1500);},'image/png');
  }

  window._namecardShow=function(){
    buildUI();
    setMode(mode||'h');
  };
})();
