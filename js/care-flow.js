/* ════════════════════════════════════════════════════════════════════════
   고객관리 "고객 케어 플로우 v1" — Phase 1 (2026-07-15)
   - 대상: status='청약완료' 고객만 (옛 대량 '신규' 레거시 제외 → 1000행 상한 회피)
   - 계약일 = profile.appl_date · 생일/상령일 = birth_date (계산, DB 무변경)
   - 좌 '오늘의 케어' + 우 '고객 케어 플로우'(계약일 기준 자동 배치) + 하단 카드리스트(행/스테이지 클릭 필터)
   - 증권/약관 수령 · 청구 = 데이터 없음 → "준비중"(자리). 점선 2(청구지원·소개확장)=수동축.
   - ⚠️ 상담관리(care, _ci*) 함수·#ci-wrap·_SN_STAGES 무접촉. salesnote 진입(_snCiShow)만 이 렌더 사용.
   - window._cfShow(hostId) 전역 등록. 롤백=_snCiShow를 _ciShow('sn-ci-host')로 되돌리고 스크립트 태그 제거.
   ════════════════════════════════════════════════════════════════════════ */
(function(){
  var CF={ data:[], filter:null, loaded:false };

  function esc(s){ return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function pad(n){ return ('0'+n).slice(-2); }
  function ymd(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function parseD(s){ if(!s) return null; var d=new Date(String(s).slice(0,10)+'T00:00:00'); return isNaN(d.getTime())?null:d; }
  function today0(){ var t=new Date(); return new Date(t.getFullYear(),t.getMonth(),t.getDate()); }
  function applDate(c){ return (c && c.profile && c.profile.appl_date)?String(c.profile.appl_date).slice(0,10):''; }
  function daysSince(c){ var ad=parseD(applDate(c)); if(!ad) return null; return Math.floor((today0()-ad)/86400000); }

  /* 상령일 = 다음 생일 6개월 전(보험나이 +1 시점)까지 남은 일수. null=생년월일 없음/계산불가 */
  function sangDday(c){
    var b=parseD(c && c.birth_date); if(!b) return null;
    var t0=today0(), best=null;
    for(var y=t0.getFullYear()-1; y<=t0.getFullYear()+1; y++){
      var bd=new Date(y, b.getMonth(), b.getDate());
      var sr=new Date(bd.getTime()); sr.setMonth(sr.getMonth()-6);
      var diff=Math.round((sr-t0)/86400000);
      if(diff>=0 && diff<=366 && (best===null || diff<best)) best=diff;
    }
    return best;
  }
  function bdayThisWeek(c){
    var b=parseD(c && c.birth_date); if(!b) return false;
    var t0=today0();
    for(var i=0;i<7;i++){ var d=new Date(t0.getTime()); d.setDate(d.getDate()+i);
      if(d.getMonth()===b.getMonth() && d.getDate()===b.getDate()) return true; }
    return false;
  }
  function newContractThisMonth(c){
    if((c && c.status||'')!=='청약완료') return false;
    var ad=parseD(applDate(c))||parseD(c && c.created_at); if(!ad) return false;
    var t=new Date(); return ad.getFullYear()===t.getFullYear() && ad.getMonth()===t.getMonth();
  }
  /* 케어콜: 계약 후 91/181/365일 도래(±7일 이내) */
  function careCall(c){ var d=daysSince(c); if(d===null) return false;
    return d>=84 && ( (d>=84&&d<=98) || (d>=174&&d<=188) || (d>=358&&d<=372) ); }

  /* 계약일 기준 시간축 스테이지 버킷 */
  function stageOf(c){
    var d=daysSince(c);
    if(d===null) return 'need_date';   /* 계약일 확인 필요 */
    if(d<91)  return 'appl';           /* 청약완료 */
    if(d<181) return 'care91';         /* 91일 케어 */
    if(d<365) return 'care181';        /* 181일 케어 */
    return 'anniv';                    /* 1주년 리뷰 */
  }

  function match(c, f){
    if(!f) return true;
    if(f.t==='care'){
      if(f.k==='call')  return careCall(c);
      if(f.k==='sang')  { var s=sangDday(c); return s!==null && s<=7; }
      if(f.k==='bday')  return bdayThisWeek(c);
      if(f.k==='claim') return false;                 /* 청구=준비중 */
      if(f.k==='newc')  return newContractThisMonth(c);
    }
    if(f.t==='stage'){
      if(f.k==='doc')   return false;                 /* 증권/약관 수령=준비중 */
      if(f.k==='sang')  { var s2=sangDday(c); return s2!==null && s2<=30; }
      return stageOf(c)===f.k;
    }
    return true;
  }
  function count(pred){ var n=0, d=CF.data; for(var i=0;i<d.length;i++){ if(pred(d[i])) n++; } return n; }

  /* ── 스타일 1회 주입 ── */
  function ensureStyle(){
    if(document.getElementById('cf-style')) return;
    var css=''
      +'.cf-wrap{display:flex;flex-direction:column;gap:14px;padding:2px 0 24px}'
      +'.cf-top{display:flex;gap:14px;flex-wrap:wrap;align-items:stretch}'
      +'.cf-today{flex:0 0 300px;min-width:260px;border:1px solid var(--bd,#e5e7eb);border-radius:var(--radius-md,14px);padding:14px 16px;background:var(--s2,#f8fafc)}'
      +'.cf-today-h{display:flex;justify-content:space-between;align-items:baseline;font-weight:700;font-size:15px;margin-bottom:10px}'
      +'.cf-today-h .cf-date{font-weight:400;color:var(--ts,#71717a);font-size:12px}'
      +'.cf-row{display:flex;justify-content:space-between;align-items:center;padding:11px 12px;border-radius:var(--radius-sm,8px);cursor:pointer;transition:background .12s}'
      +'.cf-row:hover{background:var(--s3,#eef2f7)}'
      +'.cf-row.on{background:var(--ac-soft,#e0e7ff);box-shadow:inset 0 0 0 1px var(--ac,#6366f1)}'
      +'.cf-row.dim{cursor:default;opacity:.55}.cf-row.dim:hover{background:transparent}'
      +'.cf-row span{font-size:13px;color:var(--tf,#3f3f46)}.cf-row b{font-size:15px}'
      +'.cf-row .cf-soon{font-size:11px;color:var(--ac,#6366f1);margin-left:6px}'
      +'.cf-note{font-size:11px;color:var(--ts,#71717a);margin-top:8px;line-height:1.5}'
      +'.cf-flow{flex:1 1 420px;min-width:320px;border:1px solid var(--bd,#e5e7eb);border-radius:var(--radius-md,14px);padding:14px 16px}'
      +'.cf-flow-h{display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:15px;margin-bottom:12px}'
      +'.cf-flow-h .cf-total{font-size:12px;font-weight:600;color:#fff;background:var(--ac,#6366f1);border-radius:999px;padding:3px 11px}'
      +'.cf-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}'
      +'.cf-card{border:1px solid var(--bd,#e5e7eb);border-radius:var(--radius-sm,8px);padding:10px 10px 9px;cursor:pointer;text-align:left;background:#fff;transition:box-shadow .12s,border-color .12s}'
      +'.cf-card:hover{box-shadow:0 2px 8px rgba(0,0,0,.07)}'
      +'.cf-card.on{border-color:var(--ac,#6366f1);box-shadow:inset 0 0 0 1px var(--ac,#6366f1)}'
      +'.cf-card.dash{border-style:dashed;background:var(--s2,#f8fafc)}'
      +'.cf-card.soon{opacity:.7;cursor:default}.cf-card.soon:hover{box-shadow:none}'
      +'.cf-c-t{font-size:12px;font-weight:600;color:var(--tf,#3f3f46);display:block;margin-bottom:5px;line-height:1.3}'
      +'.cf-c-n{font-size:19px;font-weight:700;color:var(--ac,#6366f1)}.cf-c-u{font-size:11px;color:var(--ts,#71717a);margin-left:2px}'
      +'.cf-c-d{font-size:10px;color:var(--ts,#71717a);display:block;margin-top:3px}'
      +'.cf-axis{display:flex;justify-content:space-between;font-size:10px;color:var(--ts,#71717a);margin-top:8px;padding:0 2px}'
      +'.cf-foot{font-size:11px;color:var(--ts,#71717a);margin-top:10px;line-height:1.5}'
      +'.cf-list{display:flex;flex-direction:column;gap:7px}'
      +'.cf-list-h{font-weight:700;font-size:14px;margin:4px 0 2px}'
      +'.cf-item{display:flex;align-items:center;gap:10px;border:1px solid var(--bd,#e5e7eb);border-radius:var(--radius-sm,8px);padding:10px 12px}'
      +'.cf-item .cf-nm{font-weight:600;font-size:14px;min-width:70px}'
      +'.cf-item .cf-meta{font-size:12px;color:var(--ts,#71717a);flex:1;display:flex;gap:12px;flex-wrap:wrap}'
      +'.cf-badge{font-size:11px;font-weight:600;color:var(--ac,#6366f1);background:var(--ac-soft,#eef0ff);border-radius:999px;padding:2px 9px;white-space:nowrap}'
      +'.cf-empty{color:var(--ts,#71717a);font-size:13px;padding:18px;text-align:center;border:1px dashed var(--bd,#e5e7eb);border-radius:var(--radius-sm,8px)}'
      +'@media(max-width:640px){.cf-cards{grid-template-columns:repeat(2,1fr)}.cf-today{flex-basis:100%}}';
    var st=document.createElement('style'); st.id='cf-style'; st.textContent=css;
    document.head.appendChild(st);
  }

  function todayHtml(){
    var f=CF.filter, isC=function(k){ return f&&f.t==='care'&&f.k===k?' on':''; };
    var rows=[
      ['call','오늘 케어 콜 (91·181·365)', count(careCall), false],
      ['sang','상령일 D-7', count(function(c){ var s=sangDday(c); return s!==null&&s<=7; }), false],
      ['bday','이번 주 생일', count(bdayThisWeek), false],
      ['claim','청구 진행 중', 0, true],
      ['newc','이번 달 신규 계약', count(newContractThisMonth), false]
    ];
    var body=rows.map(function(r){
      if(r[3]) return '<div class="cf-row dim"><span>'+esc(r[1])+' <span class="cf-soon">준비중</span></span><b>'+r[2]+'</b></div>';
      return '<div class="cf-row'+isC(r[0])+'" onclick="window._cfSetFilter(\'care\',\''+r[0]+'\')"><span>'+esc(r[1])+'</span><b>'+r[2]+'명</b></div>';
    }).join('');
    return '<div class="cf-today"><div class="cf-today-h">오늘의 케어 <span class="cf-date">'+ymd(new Date())+'</span></div>'
      +body+'<div class="cf-note">행을 클릭하면 아래 카드리스트에 해당 고객만 표시됩니다.<br>케어 항목 캘린더 연동은 준비 중입니다.</div></div>';
  }

  function flowHtml(){
    var f=CF.filter, total=CF.data.length;
    var isS=function(k){ return f&&f.t==='stage'&&f.k===k?' on':''; };
    var solid=[
      ['appl','청약완료','심사·성립', count(function(c){return stageOf(c)==='appl';}), false],
      ['doc','증권·약관 수령','수령 확인', 0, true],
      ['care91','91일 케어','보장개시 안심콜', count(function(c){return stageOf(c)==='care91';}), false],
      ['care181','181일 케어','6개월 관리', count(function(c){return stageOf(c)==='care181';}), false],
      ['anniv','1주년 리뷰','보험생일', count(function(c){return stageOf(c)==='anniv';}), false],
      ['sang','상령일','상령 D-30 임박', count(function(c){ var s=sangDday(c); return s!==null&&s<=30; }), false]
    ];
    var solidH=solid.map(function(s){
      if(s[4]) return '<button type="button" class="cf-card soon" disabled><span class="cf-c-t">'+esc(s[1])+'</span><span class="cf-c-n">준비중</span><span class="cf-c-d">'+esc(s[2])+'</span></button>';
      return '<button type="button" class="cf-card'+isS(s[0])+'" onclick="window._cfSetFilter(\'stage\',\''+s[0]+'\')"><span class="cf-c-t">'+esc(s[1])+'</span><span class="cf-c-n">'+s[3]+'</span><span class="cf-c-u">명</span><span class="cf-c-d">'+esc(s[2])+'</span></button>';
    }).join('');
    var dashed=[['claim2','청구지원','수시'],['intro','소개·확장','수확']];
    var dashH=dashed.map(function(s){
      return '<button type="button" class="cf-card dash soon" disabled><span class="cf-c-t">'+esc(s[0])+'</span><span class="cf-c-n">준비중</span><span class="cf-c-d">'+esc(s[1])+' · 수동</span></button>';
    }).join('');
    var needN=count(function(c){return stageOf(c)==='need_date';});
    var needH=needN>0 ? '<div class="cf-foot">⚠️ 계약일(청약완료일) 미입력 <b>'+needN+'명</b> — 계약일 수동입력은 Phase 2 예정. <span style="cursor:pointer;color:var(--ac,#6366f1)" onclick="window._cfSetFilter(\'stage\',\'need_date\')">보기</span></div>' : '';
    return '<div class="cf-flow"><div class="cf-flow-h">고객 케어 플로우 <span style="font-weight:400;color:var(--ts,#71717a);font-size:12px;margin-left:6px">계약일 기준 자동 배치</span><span class="cf-total">전체 '+total+'</span></div>'
      +'<div class="cf-cards">'+solidH+'</div>'
      +'<div class="cf-axis"><span>◀ 시간축 (계약일 기준 자동)</span><span>이벤트축 (수동) ▶</span></div>'
      +'<div class="cf-cards" style="grid-template-columns:repeat(2,1fr);margin-top:8px">'+dashH+'</div>'
      +'<div class="cf-foot">실선 6 = 시간축(계약일 기준 91·181·365일 경과 시 자동 이동) · 점선 2 = 이벤트축(청구·소개 시 수동 지정)</div>'
      +needH+'</div>';
  }

  function listHtml(){
    var f=CF.filter, rows=CF.data.filter(function(c){ return match(c,f); });
    var label='';
    if(f){ var m={call:'오늘 케어 콜',sang:'상령일',bday:'이번 주 생일',claim:'청구 진행 중',newc:'이번 달 신규 계약',appl:'청약완료',doc:'증권·약관 수령',care91:'91일 케어',care181:'181일 케어',anniv:'1주년 리뷰',need_date:'계약일 확인 필요'}; label=m[f.k]||''; }
    var head='<div class="cf-list-h">'+(f?('필터: '+esc(label)+' · '+rows.length+'명'):('전체 고객 · '+rows.length+'명'))
      +(f?' <span style="font-weight:400;font-size:12px;cursor:pointer;color:var(--ac,#6366f1)" onclick="window._cfSetFilter(null,null)">✕ 필터 해제</span>':'')+'</div>';
    if(!rows.length) return head+'<div class="cf-empty">'+(CF.data.length===0?'청약완료(계약 후) 고객이 아직 없습니다. 상담관리에서 청약완료로 전환하면 여기에 케어 대상으로 나타납니다.':'해당 조건의 고객이 없습니다.')+'</div>';
    var items=rows.slice(0,200).map(function(c){
      var d=daysSince(c), sm={appl:'청약완료',care91:'91일 케어',care181:'181일 케어',anniv:'1주년 리뷰',need_date:'계약일 미입력'}[stageOf(c)];
      var ad=applDate(c)||'—';
      return '<div class="cf-item"><span class="cf-nm">'+esc(c.name||'(무명)')+'</span>'
        +'<span class="cf-meta"><span>계약일 '+esc(ad)+(d!==null?(' · D+'+d):'')+'</span>'+(c.phone?('<span>'+esc(c.phone)+'</span>'):'')+'</span>'
        +'<span class="cf-badge">'+esc(sm)+'</span></div>';
    }).join('');
    var more=rows.length>200?'<div class="cf-note">상위 200명만 표시(전체 '+rows.length+'명).</div>':'';
    return head+'<div class="cf-list">'+items+'</div>'+more;
  }

  function render(){
    var host=document.getElementById(CF.hostId); if(!host) return;
    host.innerHTML='<div class="cf-wrap"><div class="cf-top">'+todayHtml()+flowHtml()+'</div>'+listHtml()+'</div>';
  }
  CF.render=render;

  window._cfSetFilter=function(t,k){
    if(!t){ CF.filter=null; }
    else if(CF.filter && CF.filter.t===t && CF.filter.k===k){ CF.filter=null; }  /* 토글 해제 */
    else{ CF.filter={t:t,k:k}; }
    render();
  };

  function load(){
    CF.loaded=true; CF.data=[]; CF.filter=null;
    var tok=window.db && window.db.getToken && window.db.getToken();
    if(!tok || !window.db || !window.db.fetch){ render(); return; }  /* 비로그인=owner RLS로 0 */
    /* 대상=청약완료만 → 소량 로드(1000행 상한 회피). DB write 없음(순수 조회). */
    var q='/rest/v1/sales_customers?deleted_at=is.null&status=eq.'+encodeURIComponent('청약완료')
      +'&select=id,name,phone,birth_date,status,created_at,profile&order=created_at.desc&limit=2000';
    window.db.fetch(q)
      .then(function(r){ return r.ok?r.json():[]; })
      .then(function(rows){ CF.data=Array.isArray(rows)?rows:[]; render(); })
      .catch(function(){ render(); });
  }

  /* 진입점 — _snCiShow가 호출. 상담관리(_ci*)와 완전 분리. */
  window._cfShow=function(hostId){
    ensureStyle();
    CF.hostId=hostId||'sn-ci-host';
    var host=document.getElementById(CF.hostId);
    if(host && !CF.loaded){ host.innerHTML='<div class="cf-empty">고객 케어 플로우 불러오는 중…</div>'; }
    load();
    try{ if(typeof window._ciScrollIntoView==='function') window._ciScrollIntoView(); }catch(e){}
  };
})();
