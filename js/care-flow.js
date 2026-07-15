/* ════════════════════════════════════════════════════════════════════════
   고객관리 "고객 케어 플로우" — 상담관리(#ci-wrap) 위(top)만 교체하는 헬퍼 (2026-07-15 재작성)
   - 화면 전체를 갈아엎지 않는다. 아래(좌 카드리스트 #ci-list + 우 미리보기 #ci-preview)는 상담관리와 동일하게 그대로 둔다.
   - salesnote 모드에서만: 위 '오늘의 할 일'→'오늘의 케어', '상담 플로우'(8단계 band)→'고객 케어 플로우'(계약일 자동배치) 로 교체 + 초록(teal) 테마로 상담관리와 시각 구분.
   - 미리보기(#ci-preview)에 선택 고객 '케어 관리'(증권/약관 수령일·청구·소개 편집 = profile jsonb, + 일정추가 = 개인 캘린더 인서트) 이식. DDL 0.
   - 대상 집계 = _ciData 중 status='청약완료'. 필터 없을 땐 카드리스트는 기존대로 전체 표시(회귀 0).
   - _ciRender(app.html)가 salesnote일 때 window._cfSalesnoteTop() 호출. _ciListHtml은 window._ciCareF 있으면 window._cfMatch로 필터.
   - 상담관리(care)·_ci* 로직 무변경. 롤백: 파일 삭제 + _ciRender/_ciListHtml의 salesnote 분기 제거.
   ════════════════════════════════════════════════════════════════════════ */
(function(){
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
  function find(id){ var d=window._ciData||[]; for(var i=0;i<d.length;i++){ if(String(d[i].id)===String(id)) return d[i]; } return null; }
  function pool(){ return (window._ciData||[]).filter(function(c){ return (c&&c.status||'')==='청약완료'; }); }
  function count(pred){ var d=pool(),n=0; for(var i=0;i<d.length;i++){ if(pred(d[i])) n++; } return n; }

  function sangDate(c){ var b=parseD(c&&c.birth_date); if(!b) return null; var t0=today0(),best=null;
    for(var y=t0.getFullYear()-1;y<=t0.getFullYear()+1;y++){ var bd=new Date(y,b.getMonth(),b.getDate()); var sr=new Date(bd.getTime()); sr.setMonth(sr.getMonth()-6);
      if(sr>=t0 && Math.round((sr-t0)/86400000)<=366 && (best===null||sr<best)) best=sr; } return best; }
  function sangDday(c){ var d=sangDate(c); return d===null?null:Math.round((d-today0())/86400000); }
  function nextBirthday(c){ var b=parseD(c&&c.birth_date); if(!b) return null; var t0=today0(); var d=new Date(t0.getFullYear(),b.getMonth(),b.getDate()); if(d<t0) d=new Date(t0.getFullYear()+1,b.getMonth(),b.getDate()); return d; }
  function bdayThisWeek(c){ var b=parseD(c&&c.birth_date); if(!b) return false; var t0=today0(); for(var i=0;i<7;i++){ var d=new Date(t0.getTime()); d.setDate(d.getDate()+i); if(d.getMonth()===b.getMonth()&&d.getDate()===b.getDate()) return true; } return false; }
  function newContractThisMonth(c){ if((c&&c.status||'')!=='청약완료') return false; var ad=parseD(applDate(c))||parseD(c&&c.created_at); if(!ad) return false; var t=new Date(); return ad.getFullYear()===t.getFullYear()&&ad.getMonth()===t.getMonth(); }
  function careCall(c){ var d=daysSince(c); if(d===null) return false; return (d>=84&&d<=98)||(d>=174&&d<=188)||(d>=358&&d<=372); }
  function claimActive(c){ return prof(c).claim_status==='진행중'; }
  function docNeeded(c){ var d=daysSince(c); return !prof(c).policy_date && d!==null && d<=45; }
  function referral(c){ return prof(c).referral==='y'; }
  function stageOf(c){ var d=daysSince(c); if(d===null) return 'need_date'; if(d<91) return 'appl'; if(d<181) return 'care91'; if(d<365) return 'care181'; return 'anniv'; }

  function match(c){
    var f=window._ciCareF; if(!f) return true;
    if(f.t==='care'){ if(f.k==='call') return careCall(c); if(f.k==='sang'){ var s=sangDday(c); return s!==null&&s<=7; } if(f.k==='bday') return bdayThisWeek(c); if(f.k==='claim') return claimActive(c); if(f.k==='newc') return newContractThisMonth(c); }
    if(f.t==='stage'){ if(f.k==='doc') return docNeeded(c); if(f.k==='sang'){ var s2=sangDday(c); return s2!==null&&s2<=30; } if(f.k==='claim2') return claimActive(c); if(f.k==='intro') return referral(c); return stageOf(c)===f.k; }
    return true;
  }
  window._cfMatch=match;

  window._cfSetCare=function(t,k){ var f=window._ciCareF; if(!t){ window._ciCareF=null; } else if(f&&f.t===t&&f.k===k){ window._ciCareF=null; } else{ window._ciCareF={t:t,k:k}; } if(typeof window._ciRender==='function') window._ciRender(); };

  /* ── 초록(teal) 테마 + salesnote 스코프 ── */
  function ensureStyle(){
    if(document.getElementById('cf-style')) return;
    var css=''
      +'#ci-wrap.ci-salesnote{--cf:#0d9488;--cf-soft:#ccfbf1;--cf-bg:#f0fdfa}'
      +'.ci-salesnote .ci-flow-head{display:none}'
      +'.cf-today-h{display:flex;justify-content:space-between;align-items:baseline;font-weight:700;font-size:var(--ts-list-title);margin-bottom:8px;color:#0f766e}'
      +'.cf-today-h .cf-date{font-weight:400;color:var(--ts,#71717a);font-size:var(--ts-badge)}'
      +'.cf-row{display:flex;justify-content:space-between;align-items:center;padding:10px 11px;border-radius:var(--radius-sm,8px);cursor:pointer;transition:background .12s}'
      +'.cf-row:hover{background:var(--cf-bg,#f0fdfa)}.cf-row.on{background:var(--cf-soft,#ccfbf1);box-shadow:inset 0 0 0 1px var(--cf,#0d9488)}'
      +'.cf-row span{font-size:var(--ts-meta);color:var(--tf,#3f3f46)}.cf-row b{font-size:var(--ts-list-title);color:#0f766e}'
      +'.cf-note{font-size:var(--ts-badge);color:var(--ts,#71717a);margin-top:8px;line-height:1.5}'
      +'.cf-fhead{display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:var(--ts-list-title);margin-bottom:10px;color:#0f766e}'
      +'.cf-total{font-size:var(--ts-badge);font-weight:600;color:#fff;background:var(--cf,#0d9488);border-radius:999px;padding:3px 11px}'
      +'.cf-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}'
      +'.cf-card{border:1px solid var(--bd,#e5e7eb);border-radius:var(--radius-sm,8px);padding:9px 10px;cursor:pointer;text-align:left;background:#fff;transition:box-shadow .12s,border-color .12s}'
      +'.cf-card:hover{box-shadow:0 2px 8px rgba(13,148,136,.12)}.cf-card.on{border-color:var(--cf,#0d9488);box-shadow:inset 0 0 0 1px var(--cf,#0d9488)}'
      +'.cf-card.dash{border-style:dashed;background:var(--cf-bg,#f0fdfa)}'
      +'.cf-c-t{font-size:var(--ts-badge);font-weight:600;color:var(--tf,#3f3f46);display:block;margin-bottom:4px;line-height:1.3}'
      +'.cf-c-n{font-size:var(--ts-viewer-title);font-weight:700;color:var(--cf,#0d9488)}.cf-c-u{font-size:var(--ts-badge);color:var(--ts,#71717a);margin-left:2px}'
      +'.cf-c-d{font-size:var(--ts-badge);color:var(--ts,#71717a);display:block;margin-top:3px}'
      +'.cf-axis{display:flex;justify-content:space-between;font-size:var(--ts-badge);color:var(--ts,#71717a);margin-top:8px;padding:0 2px}'
      +'.cf-foot{font-size:var(--ts-badge);color:var(--ts,#71717a);margin-top:9px;line-height:1.5}'
      +'.cf-care{margin-top:12px;border-top:2px solid var(--cf-soft,#ccfbf1);padding-top:10px}'
      +'.cf-care-h{font-weight:700;font-size:var(--ts-meta);color:#0f766e;margin-bottom:8px}'
      +'.cf-care-sum{font-size:var(--ts-badge);color:var(--tf,#3f3f46);display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px}'
      +'.cf-badge{font-size:var(--ts-badge);font-weight:600;color:var(--cf,#0d9488);background:var(--cf-soft,#ccfbf1);border-radius:999px;padding:2px 9px;white-space:nowrap}'
      +'.cf-badge.warn{color:#b45309;background:#fef3c7}'
      +'.cf-btn{font-size:var(--ts-badge);border:1px solid var(--cf,#0d9488);background:#fff;border-radius:var(--radius-sm,8px);padding:6px 12px;cursor:pointer;color:var(--cf,#0d9488);font-weight:600}'
      +'.cf-btn:hover{background:var(--cf-bg,#f0fdfa)}.cf-btn.plain{border-color:var(--bd,#e5e7eb);color:var(--tf,#3f3f46);font-weight:400}.cf-btn[disabled]{opacity:.5;cursor:default}'
      +'.cf-edit{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}'
      +'.cf-fld{display:flex;flex-direction:column;gap:3px}.cf-fld label{font-size:var(--ts-badge);color:var(--ts,#71717a)}'
      +'.cf-fld input,.cf-fld select{font-size:var(--ts-meta);padding:6px 8px;border:1px solid var(--bd,#e5e7eb);border-radius:var(--radius-sm,8px);background:#fff}'
      +'.cf-chk{display:flex;align-items:center;gap:5px;font-size:var(--ts-badge);color:var(--tf,#3f3f46)}';
    var st=document.createElement('style'); st.id='cf-style'; st.textContent=css; document.head.appendChild(st);
  }

  function todayPanel(){
    var f=window._ciCareF, isC=function(k){ return f&&f.t==='care'&&f.k===k?' on':''; };
    var rows=[
      ['call','오늘 케어 콜 (91·181·365)', count(careCall)],
      ['sang','상령일 D-7', count(function(c){ var s=sangDday(c); return s!==null&&s<=7; })],
      ['bday','이번 주 생일', count(bdayThisWeek)],
      ['claim','청구 진행 중', count(claimActive)],
      ['newc','이번 달 신규 계약', count(newContractThisMonth)]
    ];
    var body=rows.map(function(r){ return '<div class="cf-row'+isC(r[0])+'" onclick="window._cfSetCare(\'care\',\''+r[0]+'\')"><span>'+esc(r[1])+'</span><b>'+r[2]+'명</b></div>'; }).join('');
    return '<div class="cf-today-h">오늘의 케어 <span class="cf-date">'+ymd(new Date())+'</span></div>'+body
      +'<div class="cf-note">행을 클릭하면 아래 카드리스트에 해당 고객만 표시됩니다.<br>케어 항목은 캘린더와 연동됩니다.</div>';
  }

  function flowPanel(){
    var f=window._ciCareF, total=pool().length, isS=function(k){ return f&&f.t==='stage'&&f.k===k?' on':''; };
    var solid=[
      ['appl','청약완료','심사·성립', count(function(c){return stageOf(c)==='appl';})],
      ['doc','증권·약관 수령','수령 확인 필요', count(docNeeded)],
      ['care91','91일 케어','보장개시 안심콜', count(function(c){return stageOf(c)==='care91';})],
      ['care181','181일 케어','6개월 관리', count(function(c){return stageOf(c)==='care181';})],
      ['anniv','1주년 리뷰','보험생일', count(function(c){return stageOf(c)==='anniv';})],
      ['sang','상령일','상령 D-30 임박', count(function(c){ var s=sangDday(c); return s!==null&&s<=30; })]
    ];
    var solidH=solid.map(function(s){ return '<button type="button" class="cf-card'+isS(s[0])+'" onclick="window._cfSetCare(\'stage\',\''+s[0]+'\')"><span class="cf-c-t">'+esc(s[1])+'</span><span class="cf-c-n">'+s[3]+'</span><span class="cf-c-u">명</span><span class="cf-c-d">'+esc(s[2])+'</span></button>'; }).join('');
    var dashed=[['claim2','청구지원','수시', count(claimActive)],['intro','소개·확장','수확', count(referral)]];
    var dashH=dashed.map(function(s){ return '<button type="button" class="cf-card dash'+isS(s[0])+'" onclick="window._cfSetCare(\'stage\',\''+s[0]+'\')"><span class="cf-c-t">'+esc(s[1])+'</span><span class="cf-c-n">'+s[3]+'</span><span class="cf-c-u">명</span><span class="cf-c-d">'+esc(s[2])+' · 수동</span></button>'; }).join('');
    var needN=count(function(c){return stageOf(c)==='need_date';});
    var needH=needN>0?'<div class="cf-foot">⚠️ 계약일 미입력 <b>'+needN+'명</b> — 오른쪽 미리보기에서 계약일을 넣으면 자동 배치됩니다.</div>':'';
    var clr=f?' <span style="font-weight:400;font-size:var(--ts-badge);cursor:pointer;color:var(--cf,#0d9488)" onclick="window._cfSetCare(null,null)">✕ 필터 해제</span>':'';
    return '<div class="cf-fhead"><span>고객 케어 플로우 <span style="font-weight:400;color:var(--ts,#71717a);font-size:var(--ts-badge)">계약일 기준 자동 배치</span>'+clr+'</span><span class="cf-total">전체 '+total+'</span></div>'
      +'<div class="cf-cards">'+solidH+'</div>'
      +'<div class="cf-axis"><span>◀ 시간축 (계약일 기준 자동)</span><span>이벤트축 (수동) ▶</span></div>'
      +'<div class="cf-cards" style="grid-template-columns:repeat(2,1fr);margin-top:8px">'+dashH+'</div>'
      +'<div class="cf-foot">실선 6 = 시간축(91·181·365일 자동) · 점선 2 = 이벤트축(청구·소개 = 미리보기 케어 편집으로 지정)</div>'+needH;
  }
  window._cfTodayPanelHtml=todayPanel;
  window._cfFlowPanelHtml=flowPanel;

  /* 미리보기(#ci-preview)에 붙는 선택 고객 '케어 관리' 블록 (Phase2/3) */
  function careActions(id){
    var c=find(id); if(!c) return '';
    var p=prof(c), editing=(String(window._cfEditId)===String(id));
    if(editing){
      return '<div class="cf-care"><div class="cf-care-h">케어 관리 · 편집</div><div class="cf-edit">'
        +'<div class="cf-fld"><label>계약일(청약완료일)</label><input type="date" id="cf-e-appl" value="'+esc(applDate(c))+'"></div>'
        +'<div class="cf-fld"><label>증권·약관 수령일</label><input type="date" id="cf-e-policy" value="'+esc(p.policy_date||'')+'"></div>'
        +'<div class="cf-fld"><label>청구 상태</label><select id="cf-e-claim"><option value="none"'+(p.claim_status==='진행중'||p.claim_status==='완료'?'':' selected')+'>없음</option><option value="진행중"'+(p.claim_status==='진행중'?' selected':'')+'>진행 중</option><option value="완료"'+(p.claim_status==='완료'?' selected':'')+'>완료</option></select></div>'
        +'<label class="cf-chk"><input type="checkbox" id="cf-e-ref"'+(p.referral==='y'?' checked':'')+'> 소개·확장 대상</label>'
        +'<button type="button" class="cf-btn" onclick="window._cfSave(\''+esc(c.id)+'\')">저장</button>'
        +'<button type="button" class="cf-btn plain" onclick="window._cfEditCancel()">취소</button></div></div>';
    }
    var sum=[]; sum.push('계약일 '+(applDate(c)||'미입력'));
    if(p.policy_date) sum.push('<span class="cf-badge">증권 수령</span>'); if(claimActive(c)) sum.push('<span class="cf-badge warn">청구 진행중</span>'); if(p.claim_status==='완료') sum.push('<span class="cf-badge">청구 완료</span>'); if(referral(c)) sum.push('<span class="cf-badge">소개 대상</span>');
    var add=p.care_cal_added?'<button type="button" class="cf-btn plain" disabled>일정 추가됨</button>':'<button type="button" class="cf-btn" onclick="window._cfAddCal(\''+esc(c.id)+'\')">일정추가</button>';
    return '<div class="cf-care"><div class="cf-care-h">케어 관리</div><div class="cf-care-sum">'+sum.join(' ')+'</div>'
      +'<button type="button" class="cf-btn" onclick="window._cfEdit(\''+esc(c.id)+'\')">케어 편집</button> '+add+'</div>';
  }
  window._cfCareActionsHtml=careActions;
  window._cfEdit=function(id){ window._cfEditId=id; if(typeof window._ciRender==='function') window._ciRender(); };
  window._cfEditCancel=function(){ window._cfEditId=null; if(typeof window._ciRender==='function') window._ciRender(); };

  window._cfSave=function(id){
    if(window._cfBusy) return; var c=find(id); if(!c) return;
    var g=function(i){ var e=document.getElementById(i); return e?e.value:''; }, refEl=document.getElementById('cf-e-ref');
    var appl=g('cf-e-appl'), policy=g('cf-e-policy'), claim=g('cf-e-claim'), ref=(refEl&&refEl.checked)?'y':'';
    if(!window.db||!window.db.fetch){ toast('로그인이 필요합니다.'); return; }
    window._cfBusy=true;
    window.db.fetch('/rest/v1/sales_customers?id=eq.'+encodeURIComponent(id)+'&select=profile&limit=1')
      .then(function(r){ return r.ok?r.json():[]; })
      .then(function(rows){ var p=(rows[0]&&rows[0].profile)||{}; p.appl_date=appl||null; p.policy_date=policy||null; p.claim_status=claim||'none'; p.referral=ref;
        return window.db.fetch('/rest/v1/sales_customers?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({profile:p})}); })
      .then(function(res){ window._cfBusy=false; if(res&&(res.ok||res.status===204)){ window._cfEditId=null; toast('저장됐습니다.'); window._ciLoaded=false; if(window._ciLoad) window._ciLoad(); } else toast('저장 실패'); })
      .catch(function(){ window._cfBusy=false; toast('네트워크 오류'); });
  };

  window._cfAddCal=function(id){
    if(window._cfBusy) return; var c=find(id); if(!c) return;
    if(!window.db||!window.db.fetch){ toast('로그인이 필요합니다.'); return; }
    var u=cfUser(), me=u.id||null, ad=parseD(applDate(c)), t0=today0(), evs=[];
    if(ad){ [[91,'91일 안심콜'],[181,'181일 관리'],[365,'1주년 리뷰']].forEach(function(x){ var d=new Date(ad.getTime()); d.setDate(d.getDate()+x[0]); if(d>=t0) evs.push([ymd(d),x[1]]); }); }
    var sd=sangDate(c); if(sd) evs.push([ymd(sd),'상령일']); var bd=nextBirthday(c); if(bd) evs.push([ymd(bd),'생일']);
    if(!evs.length){ toast('추가할 미래 케어 일정이 없습니다. 계약일/생년월일을 확인하세요.'); return; }
    if(!confirm('['+(c.name||'고객')+'] 케어 일정 '+evs.length+'건을 캘린더에 추가할까요?\n('+evs.map(function(e){return e[1];}).join(', ')+')')) return;
    window._cfBusy=true;
    Promise.all(evs.map(function(e){ var body={ event_date:e[0], event_time:null, title:'[케어] '+(c.name||'고객')+' · '+e[1], description:'고객관리 케어 일정 (자동 생성)', event_type:'operation', source_type:'personal', audience_target:'personal', team_id:null, branch_id:null, author_id:me };
      return window.db.fetch('/rest/v1/calendar_events',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(body)}).then(function(r){ return r&&(r.ok||r.status===201); }); }))
      .then(function(res){ var okN=res.filter(Boolean).length; var p=prof(c); p.care_cal_added=true;
        return window.db.fetch('/rest/v1/sales_customers?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({profile:p})}).then(function(){ return okN; }); })
      .then(function(okN){ window._cfBusy=false; toast('캘린더에 케어 일정 '+okN+'건을 추가했습니다.'); window._ciLoaded=false; if(window._ciLoad) window._ciLoad(); })
      .catch(function(){ window._cfBusy=false; toast('일정 추가 중 오류'); });
  };

  /* _ciRender(app.html)가 salesnote 모드일 때 호출 — 위(top)만 케어 플로우로 교체 + 미리보기 케어 관리 이식 */
  window._cfSalesnoteTop=function(){
    ensureStyle();
    var w=document.getElementById('ci-wrap'); if(w) w.classList.add('ci-salesnote');
    var td=document.getElementById('ci-today'); if(td) td.innerHTML=todayPanel();
    var bd=document.getElementById('ci-band'); if(bd) bd.innerHTML=flowPanel();
    var pv=document.getElementById('ci-preview');
    if(pv){ var ca=document.getElementById('cf-care-actions'); if(window._ciSel!=null){ if(!ca){ ca=document.createElement('div'); ca.id='cf-care-actions'; pv.appendChild(ca); } ca.innerHTML=careActions(window._ciSel); } else if(ca){ ca.parentNode.removeChild(ca); } }
  };
})();
