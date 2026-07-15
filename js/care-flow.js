/* ════════════════════════════════════════════════════════════════════════
   고객관리 "고객 케어 플로우" — Phase 1+2+3 (2026-07-15)
   - 대상: status='청약완료' (옛 '신규' 레거시 제외 → 1000행 상한 회피)
   - Phase1: 좌 '오늘의 케어' + 우 '케어 플로우'(계약일 자동배치) + 카드리스트(필터)
   - Phase2: 고객별 편집(계약일·증권/약관 수령일·청구상태·소개) = profile(jsonb) 저장(owner RLS PATCH·DDL 0).
             증권수령·청구·소개 카드 활성화(준비중 해제).
   - Phase3: 고객별 '케어 일정 캘린더 추가' = calendar_events 개인 일정 인서트(owner RLS, source_type/audience_target='personal',
             reminders 없음 → 푸시(알림 cron) 무관). 계약일 기준 91/181/365 + 상령일 + 생일 미래분만.
   - ⚠️ 상담관리(care, _ci*)·#ci-wrap·_SN_STAGES 무접촉. DB 스키마(DDL/RLS) 변경 0. 저장은 앱 정상 owner 쓰기.
   - window._cfShow(hostId) 진입. 롤백: 파일 삭제 + _snCiShow를 _ciShow('sn-ci-host')로 복원.
   ════════════════════════════════════════════════════════════════════════ */
(function(){
  var CF={ data:[], filter:null, loaded:false, editId:null, busy:false };

  function esc(s){ return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function pad(n){ return ('0'+n).slice(-2); }
  function ymd(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function parseD(s){ if(!s) return null; var d=new Date(String(s).slice(0,10)+'T00:00:00'); return isNaN(d.getTime())?null:d; }
  function today0(){ var t=new Date(); return new Date(t.getFullYear(),t.getMonth(),t.getDate()); }
  function prof(c){ return (c && c.profile) || {}; }
  function applDate(c){ var p=prof(c); return p.appl_date?String(p.appl_date).slice(0,10):''; }
  function daysSince(c){ var ad=parseD(applDate(c)); if(!ad) return null; return Math.floor((today0()-ad)/86400000); }
  function toast(m){ try{ if(typeof window.toast==='function'){ window.toast(m); return; } }catch(e){} alert(m); }
  function cfUser(){ try{ return JSON.parse(localStorage.getItem('os_user')||sessionStorage.getItem('os_user')||'{}'); }catch(e){ return {}; } }
  function find(id){ for(var i=0;i<CF.data.length;i++){ if(String(CF.data[i].id)===String(id)) return CF.data[i]; } return null; }

  /* 상령일 = 다음 생일 6개월 전(보험나이 +1 시점) */
  function sangDate(c){
    var b=parseD(c && c.birth_date); if(!b) return null;
    var t0=today0(), best=null;
    for(var y=t0.getFullYear()-1; y<=t0.getFullYear()+1; y++){
      var bd=new Date(y, b.getMonth(), b.getDate());
      var sr=new Date(bd.getTime()); sr.setMonth(sr.getMonth()-6);
      if(sr>=t0 && Math.round((sr-t0)/86400000)<=366 && (best===null || sr<best)) best=sr;
    }
    return best;
  }
  function sangDday(c){ var d=sangDate(c); return d===null?null:Math.round((d-today0())/86400000); }
  function nextBirthday(c){ var b=parseD(c && c.birth_date); if(!b) return null; var t0=today0();
    var d=new Date(t0.getFullYear(), b.getMonth(), b.getDate()); if(d<t0) d=new Date(t0.getFullYear()+1, b.getMonth(), b.getDate()); return d; }
  function bdayThisWeek(c){ var b=parseD(c && c.birth_date); if(!b) return false; var t0=today0();
    for(var i=0;i<7;i++){ var d=new Date(t0.getTime()); d.setDate(d.getDate()+i); if(d.getMonth()===b.getMonth()&&d.getDate()===b.getDate()) return true; } return false; }
  function newContractThisMonth(c){ if((c&&c.status||'')!=='청약완료') return false; var ad=parseD(applDate(c))||parseD(c&&c.created_at); if(!ad) return false; var t=new Date(); return ad.getFullYear()===t.getFullYear()&&ad.getMonth()===t.getMonth(); }
  function careCall(c){ var d=daysSince(c); if(d===null) return false; return (d>=84&&d<=98)||(d>=174&&d<=188)||(d>=358&&d<=372); }
  /* Phase2 활성 지표 (profile 기반) */
  function claimActive(c){ return prof(c).claim_status==='진행중'; }
  function docNeeded(c){ var d=daysSince(c); return !prof(c).policy_date && d!==null && d<=45; }  /* 증권/약관 수령 미확인 & 계약 45일 내 */
  function referral(c){ return prof(c).referral==='y'; }

  function stageOf(c){ var d=daysSince(c); if(d===null) return 'need_date'; if(d<91) return 'appl'; if(d<181) return 'care91'; if(d<365) return 'care181'; return 'anniv'; }

  function match(c, f){
    if(!f) return true;
    if(f.t==='care'){
      if(f.k==='call')  return careCall(c);
      if(f.k==='sang')  { var s=sangDday(c); return s!==null && s<=7; }
      if(f.k==='bday')  return bdayThisWeek(c);
      if(f.k==='claim') return claimActive(c);
      if(f.k==='newc')  return newContractThisMonth(c);
    }
    if(f.t==='stage'){
      if(f.k==='doc')    return docNeeded(c);
      if(f.k==='sang')   { var s2=sangDday(c); return s2!==null && s2<=30; }
      if(f.k==='claim2') return claimActive(c);
      if(f.k==='intro')  return referral(c);
      return stageOf(c)===f.k;
    }
    return true;
  }
  function count(pred){ var n=0,d=CF.data; for(var i=0;i<d.length;i++){ if(pred(d[i])) n++; } return n; }

  function ensureStyle(){
    if(document.getElementById('cf-style')) return;
    var css=''
      +'.cf-wrap{display:flex;flex-direction:column;gap:14px;padding:2px 0 24px}'
      +'.cf-top{display:flex;gap:14px;flex-wrap:wrap;align-items:stretch}'
      +'.cf-today{flex:0 0 300px;min-width:260px;border:1px solid var(--bd,#e5e7eb);border-radius:var(--radius-md,14px);padding:14px 16px;background:var(--s2,#f8fafc)}'
      +'.cf-today-h{display:flex;justify-content:space-between;align-items:baseline;font-weight:700;font-size:15px;margin-bottom:10px}'
      +'.cf-today-h .cf-date{font-weight:400;color:var(--ts,#71717a);font-size:12px}'
      +'.cf-row{display:flex;justify-content:space-between;align-items:center;padding:11px 12px;border-radius:var(--radius-sm,8px);cursor:pointer;transition:background .12s}'
      +'.cf-row:hover{background:var(--s3,#eef2f7)}.cf-row.on{background:var(--ac-soft,#e0e7ff);box-shadow:inset 0 0 0 1px var(--ac,#6366f1)}'
      +'.cf-row span{font-size:13px;color:var(--tf,#3f3f46)}.cf-row b{font-size:15px}'
      +'.cf-note{font-size:11px;color:var(--ts,#71717a);margin-top:8px;line-height:1.5}'
      +'.cf-flow{flex:1 1 420px;min-width:320px;border:1px solid var(--bd,#e5e7eb);border-radius:var(--radius-md,14px);padding:14px 16px}'
      +'.cf-flow-h{display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:15px;margin-bottom:12px}'
      +'.cf-flow-h .cf-total{font-size:12px;font-weight:600;color:#fff;background:var(--ac,#6366f1);border-radius:999px;padding:3px 11px}'
      +'.cf-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}'
      +'.cf-card{border:1px solid var(--bd,#e5e7eb);border-radius:var(--radius-sm,8px);padding:10px;cursor:pointer;text-align:left;background:#fff;transition:box-shadow .12s,border-color .12s}'
      +'.cf-card:hover{box-shadow:0 2px 8px rgba(0,0,0,.07)}.cf-card.on{border-color:var(--ac,#6366f1);box-shadow:inset 0 0 0 1px var(--ac,#6366f1)}'
      +'.cf-card.dash{border-style:dashed;background:var(--s2,#f8fafc)}'
      +'.cf-c-t{font-size:12px;font-weight:600;color:var(--tf,#3f3f46);display:block;margin-bottom:5px;line-height:1.3}'
      +'.cf-c-n{font-size:19px;font-weight:700;color:var(--ac,#6366f1)}.cf-c-u{font-size:11px;color:var(--ts,#71717a);margin-left:2px}'
      +'.cf-c-d{font-size:10px;color:var(--ts,#71717a);display:block;margin-top:3px}'
      +'.cf-axis{display:flex;justify-content:space-between;font-size:10px;color:var(--ts,#71717a);margin-top:8px;padding:0 2px}'
      +'.cf-foot{font-size:11px;color:var(--ts,#71717a);margin-top:10px;line-height:1.5}'
      +'.cf-list{display:flex;flex-direction:column;gap:7px}.cf-list-h{font-weight:700;font-size:14px;margin:4px 0 2px}'
      +'.cf-item{display:flex;align-items:center;gap:10px;border:1px solid var(--bd,#e5e7eb);border-radius:var(--radius-sm,8px);padding:10px 12px;flex-wrap:wrap}'
      +'.cf-item .cf-nm{font-weight:600;font-size:14px;min-width:64px}'
      +'.cf-item .cf-meta{font-size:12px;color:var(--ts,#71717a);flex:1;display:flex;gap:12px;flex-wrap:wrap;min-width:140px}'
      +'.cf-badge{font-size:11px;font-weight:600;color:var(--ac,#6366f1);background:var(--ac-soft,#eef0ff);border-radius:999px;padding:2px 9px;white-space:nowrap}'
      +'.cf-badge.warn{color:var(--warn,#d97706);background:#fef3c7}.cf-badge.ok{color:#059669;background:#d1fae5}'
      +'.cf-btn{font-size:12px;border:1px solid var(--bd,#e5e7eb);background:#fff;border-radius:var(--radius-sm,8px);padding:5px 10px;cursor:pointer;color:var(--tf,#3f3f46)}'
      +'.cf-btn:hover{background:var(--s2,#f8fafc)}.cf-btn.pri{border-color:var(--ac,#6366f1);color:var(--ac,#6366f1)}'
      +'.cf-btn[disabled]{opacity:.5;cursor:default}'
      +'.cf-edit{flex:1 1 100%;display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin-top:8px;padding-top:10px;border-top:1px dashed var(--bd,#e5e7eb)}'
      +'.cf-fld{display:flex;flex-direction:column;gap:3px}.cf-fld label{font-size:11px;color:var(--ts,#71717a)}'
      +'.cf-fld input,.cf-fld select{font-size:13px;padding:6px 8px;border:1px solid var(--bd,#e5e7eb);border-radius:var(--radius-sm,8px);background:#fff}'
      +'.cf-chk{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--tf,#3f3f46)}'
      +'.cf-empty{color:var(--ts,#71717a);font-size:13px;padding:18px;text-align:center;border:1px dashed var(--bd,#e5e7eb);border-radius:var(--radius-sm,8px)}'
      +'@media(max-width:640px){.cf-cards{grid-template-columns:repeat(2,1fr)}.cf-today{flex-basis:100%}}';
    var st=document.createElement('style'); st.id='cf-style'; st.textContent=css; document.head.appendChild(st);
  }

  function todayHtml(){
    var f=CF.filter, isC=function(k){ return f&&f.t==='care'&&f.k===k?' on':''; };
    var rows=[
      ['call','오늘 케어 콜 (91·181·365)', count(careCall)],
      ['sang','상령일 D-7', count(function(c){ var s=sangDday(c); return s!==null&&s<=7; })],
      ['bday','이번 주 생일', count(bdayThisWeek)],
      ['claim','청구 진행 중', count(claimActive)],
      ['newc','이번 달 신규 계약', count(newContractThisMonth)]
    ];
    var body=rows.map(function(r){ return '<div class="cf-row'+isC(r[0])+'" onclick="window._cfSetFilter(\'care\',\''+r[0]+'\')"><span>'+esc(r[1])+'</span><b>'+r[2]+'명</b></div>'; }).join('');
    return '<div class="cf-today"><div class="cf-today-h">오늘의 케어 <span class="cf-date">'+ymd(new Date())+'</span></div>'
      +body+'<div class="cf-note">행을 클릭하면 아래 카드리스트에 해당 고객만 표시됩니다.<br>고객별 <b>일정추가</b>로 케어 일정을 캘린더에 넣을 수 있습니다.</div></div>';
  }

  function flowHtml(){
    var f=CF.filter, total=CF.data.length, isS=function(k){ return f&&f.t==='stage'&&f.k===k?' on':''; };
    var solid=[
      ['appl','청약완료','심사·성립', count(function(c){return stageOf(c)==='appl';})],
      ['doc','증권·약관 수령','수령 확인 필요', count(docNeeded)],
      ['care91','91일 케어','보장개시 안심콜', count(function(c){return stageOf(c)==='care91';})],
      ['care181','181일 케어','6개월 관리', count(function(c){return stageOf(c)==='care181';})],
      ['anniv','1주년 리뷰','보험생일', count(function(c){return stageOf(c)==='anniv';})],
      ['sang','상령일','상령 D-30 임박', count(function(c){ var s=sangDday(c); return s!==null&&s<=30; })]
    ];
    var solidH=solid.map(function(s){ return '<button type="button" class="cf-card'+isS(s[0])+'" onclick="window._cfSetFilter(\'stage\',\''+s[0]+'\')"><span class="cf-c-t">'+esc(s[1])+'</span><span class="cf-c-n">'+s[3]+'</span><span class="cf-c-u">명</span><span class="cf-c-d">'+esc(s[2])+'</span></button>'; }).join('');
    var dashed=[['claim2','청구지원','수시', count(claimActive)],['intro','소개·확장','수확', count(referral)]];
    var dashH=dashed.map(function(s){ return '<button type="button" class="cf-card dash'+isS(s[0])+'" onclick="window._cfSetFilter(\'stage\',\''+s[0]+'\')"><span class="cf-c-t">'+esc(s[1])+'</span><span class="cf-c-n">'+s[3]+'</span><span class="cf-c-u">명</span><span class="cf-c-d">'+esc(s[2])+' · 수동</span></button>'; }).join('');
    var needN=count(function(c){return stageOf(c)==='need_date';});
    var needH=needN>0 ? '<div class="cf-foot">⚠️ 계약일 미입력 <b>'+needN+'명</b> — 아래 리스트에서 <b>편집</b>으로 계약일을 넣으면 자동 배치됩니다. <span style="cursor:pointer;color:var(--ac,#6366f1)" onclick="window._cfSetFilter(\'stage\',\'need_date\')">보기</span></div>' : '';
    return '<div class="cf-flow"><div class="cf-flow-h">고객 케어 플로우 <span style="font-weight:400;color:var(--ts,#71717a);font-size:12px;margin-left:6px">계약일 기준 자동 배치</span><span class="cf-total">전체 '+total+'</span></div>'
      +'<div class="cf-cards">'+solidH+'</div>'
      +'<div class="cf-axis"><span>◀ 시간축 (계약일 기준 자동)</span><span>이벤트축 (수동) ▶</span></div>'
      +'<div class="cf-cards" style="grid-template-columns:repeat(2,1fr);margin-top:8px">'+dashH+'</div>'
      +'<div class="cf-foot">실선 6 = 시간축(계약일 기준 91·181·365일 자동) · 점선 2 = 이벤트축(청구·소개 = 편집으로 지정)</div>'
      +needH+'</div>';
  }

  function editHtml(c){
    var p=prof(c);
    return '<div class="cf-edit">'
      +'<div class="cf-fld"><label>계약일(청약완료일)</label><input type="date" id="cf-e-appl" value="'+esc(applDate(c))+'"></div>'
      +'<div class="cf-fld"><label>증권·약관 수령일</label><input type="date" id="cf-e-policy" value="'+esc(p.policy_date||'')+'"></div>'
      +'<div class="cf-fld"><label>청구 상태</label><select id="cf-e-claim">'
        +'<option value="none"'+(p.claim_status==='진행중'||p.claim_status==='완료'?'':' selected')+'>없음</option>'
        +'<option value="진행중"'+(p.claim_status==='진행중'?' selected':'')+'>진행 중</option>'
        +'<option value="완료"'+(p.claim_status==='완료'?' selected':'')+'>완료</option></select></div>'
      +'<label class="cf-chk"><input type="checkbox" id="cf-e-ref"'+(p.referral==='y'?' checked':'')+'> 소개·확장 대상</label>'
      +'<button type="button" class="cf-btn pri" onclick="window._cfSave(\''+esc(c.id)+'\')">저장</button>'
      +'<button type="button" class="cf-btn" onclick="window._cfEditCancel()">취소</button></div>';
  }

  function listHtml(){
    var f=CF.filter, rows=CF.data.filter(function(c){ return match(c,f); }), label='';
    if(f){ var m={call:'오늘 케어 콜',sang:'상령일',bday:'이번 주 생일',claim:'청구 진행 중',newc:'이번 달 신규 계약',appl:'청약완료',doc:'증권·약관 수령',care91:'91일 케어',care181:'181일 케어',anniv:'1주년 리뷰',need_date:'계약일 확인 필요',claim2:'청구지원',intro:'소개·확장'}; label=m[f.k]||''; }
    var head='<div class="cf-list-h">'+(f?('필터: '+esc(label)+' · '+rows.length+'명'):('전체 고객 · '+rows.length+'명'))
      +(f?' <span style="font-weight:400;font-size:12px;cursor:pointer;color:var(--ac,#6366f1)" onclick="window._cfSetFilter(null,null)">✕ 필터 해제</span>':'')+'</div>';
    if(!rows.length) return head+'<div class="cf-empty">'+(CF.data.length===0?'청약완료(계약 후) 고객이 아직 없습니다. 상담관리에서 청약완료로 전환하면 여기에 케어 대상으로 나타납니다.':'해당 조건의 고객이 없습니다.')+'</div>';
    var items=rows.slice(0,200).map(function(c){
      var p=prof(c), d=daysSince(c), sm={appl:'청약완료',care91:'91일 케어',care181:'181일 케어',anniv:'1주년 리뷰',need_date:'계약일 미입력'}[stageOf(c)];
      var tags=''; if(claimActive(c)) tags+='<span class="cf-badge warn">청구 진행중</span>'; if(referral(c)) tags+='<span class="cf-badge">소개대상</span>'; if(p.policy_date) tags+='<span class="cf-badge ok">증권 수령</span>';
      var editing=(String(CF.editId)===String(c.id));
      var addBtn=p.care_cal_added
        ? '<button type="button" class="cf-btn" disabled>일정 추가됨</button>'
        : '<button type="button" class="cf-btn pri" onclick="window._cfAddCal(\''+esc(c.id)+'\')">일정추가</button>';
      return '<div class="cf-item"><span class="cf-nm">'+esc(c.name||'(무명)')+'</span>'
        +'<span class="cf-meta"><span>계약일 '+esc(applDate(c)||'—')+(d!==null?(' · D+'+d):'')+'</span>'+(c.phone?('<span>'+esc(c.phone)+'</span>'):'')+tags+'</span>'
        +'<span class="cf-badge">'+esc(sm)+'</span>'
        +'<button type="button" class="cf-btn" onclick="window._cfEdit(\''+esc(c.id)+'\')">편집</button>'+addBtn
        +(editing?editHtml(c):'')+'</div>';
    }).join('');
    var more=rows.length>200?'<div class="cf-note">상위 200명만 표시(전체 '+rows.length+'명).</div>':'';
    return head+'<div class="cf-list">'+items+'</div>'+more;
  }

  function render(){ var host=document.getElementById(CF.hostId); if(!host) return;
    host.innerHTML='<div class="cf-wrap"><div class="cf-top">'+todayHtml()+flowHtml()+'</div>'+listHtml()+'</div>'; }
  CF.render=render;

  window._cfSetFilter=function(t,k){ if(!t){ CF.filter=null; } else if(CF.filter&&CF.filter.t===t&&CF.filter.k===k){ CF.filter=null; } else{ CF.filter={t:t,k:k}; } render(); };
  window._cfEdit=function(id){ CF.editId=id; render(); };
  window._cfEditCancel=function(){ CF.editId=null; render(); };

  /* Phase2 저장 — profile(jsonb) 병합 PATCH(owner RLS). DDL 없음. */
  window._cfSave=function(id){
    if(CF.busy) return; var c=find(id); if(!c) return;
    var g=function(i){ var e=document.getElementById(i); return e?e.value:''; };
    var refEl=document.getElementById('cf-e-ref');
    var appl=g('cf-e-appl'), policy=g('cf-e-policy'), claim=g('cf-e-claim'), ref=(refEl&&refEl.checked)?'y':'';
    if(!window.db||!window.db.fetch){ toast('로그인이 필요합니다.'); return; }
    CF.busy=true;
    window.db.fetch('/rest/v1/sales_customers?id=eq.'+encodeURIComponent(id)+'&select=profile&limit=1')
      .then(function(r){ return r.ok?r.json():[]; })
      .then(function(rows){
        var p=(rows[0]&&rows[0].profile)||{};
        p.appl_date=appl||null; p.policy_date=policy||null; p.claim_status=claim||'none'; p.referral=ref;
        return window.db.fetch('/rest/v1/sales_customers?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({profile:p})});
      })
      .then(function(res){ CF.busy=false; if(res&&(res.ok||res.status===204)){ CF.editId=null; toast('저장됐습니다.'); load(); } else { toast('저장 실패'); } })
      .catch(function(){ CF.busy=false; toast('네트워크 오류'); });
  };

  /* Phase3 케어 일정 캘린더 추가 — 계약일 기준 91/181/365 + 상령일 + 생일(미래분만) 개인 일정 인서트.
     source_type/audience_target='personal', reminders 미포함 → 알림 푸시(cron) 무관. owner RLS. */
  window._cfAddCal=function(id){
    if(CF.busy) return; var c=find(id); if(!c){ return; }
    if(!window.db||!window.db.fetch){ toast('로그인이 필요합니다.'); return; }
    var u=cfUser(), me=u.id||null;
    var ad=parseD(applDate(c)), t0=today0(), evs=[];
    if(ad){ [[91,'91일 안심콜'],[181,'181일 관리'],[365,'1주년 리뷰']].forEach(function(x){ var d=new Date(ad.getTime()); d.setDate(d.getDate()+x[0]); if(d>=t0) evs.push([ymd(d),x[1]]); }); }
    var sd=sangDate(c); if(sd) evs.push([ymd(sd),'상령일']);
    var bd=nextBirthday(c); if(bd) evs.push([ymd(bd),'생일']);
    if(!evs.length){ toast('추가할 미래 케어 일정이 없습니다. 계약일/생년월일을 확인하세요.'); return; }
    if(!confirm('['+(c.name||'고객')+'] 케어 일정 '+evs.length+'건을 캘린더에 추가할까요?\n('+evs.map(function(e){return e[1];}).join(', ')+')')) return;
    CF.busy=true;
    Promise.all(evs.map(function(e){
      var body={ event_date:e[0], event_time:null, title:'[케어] '+(c.name||'고객')+' · '+e[1], description:'고객관리 케어 일정 (자동 생성)', event_type:'operation', source_type:'personal', audience_target:'personal', team_id:null, branch_id:null, author_id:me };
      return window.db.fetch('/rest/v1/calendar_events',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(body)}).then(function(r){ return r&&(r.ok||r.status===201); });
    })).then(function(res){
      var okN=res.filter(Boolean).length;
      /* care_cal_added 플래그 저장(재추가 방지) */
      var p=prof(c); p.care_cal_added=true;
      return window.db.fetch('/rest/v1/sales_customers?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({profile:p})}).then(function(){ return okN; });
    }).then(function(okN){ CF.busy=false; toast('캘린더에 케어 일정 '+okN+'건을 추가했습니다.'); load(); })
      .catch(function(){ CF.busy=false; toast('일정 추가 중 오류'); load(); });
  };

  function load(){
    CF.loaded=true; CF.data=[];
    var tok=window.db && window.db.getToken && window.db.getToken();
    if(!tok || !window.db || !window.db.fetch){ render(); return; }  /* 비로그인=owner RLS로 0 */
    var q='/rest/v1/sales_customers?deleted_at=is.null&status=eq.'+encodeURIComponent('청약완료')
      +'&select=id,name,phone,birth_date,status,created_at,profile&order=created_at.desc&limit=2000';
    window.db.fetch(q).then(function(r){ return r.ok?r.json():[]; })
      .then(function(rows){ CF.data=Array.isArray(rows)?rows:[]; render(); })
      .catch(function(){ render(); });
  }

  window._cfShow=function(hostId){
    ensureStyle(); CF.hostId=hostId||'sn-ci-host'; CF.filter=null; CF.editId=null;
    var host=document.getElementById(CF.hostId);
    if(host && !CF.loaded){ host.innerHTML='<div class="cf-empty">고객 케어 플로우 불러오는 중…</div>'; }
    load();
    try{ if(typeof window._ciScrollIntoView==='function') window._ciScrollIntoView(); }catch(e){}
  };
})();
