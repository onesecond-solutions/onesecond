/*
  js/admin-console.js — 운영센터(Admin) 콘솔 로직 (2026-05-31 외부 분리)
  ─────────────────────────────────────────────────────────────────────
  · pages/admin-console.html 인라인 스크립트에서 추출 (기능 동등, Phase 1)
  · 의존: db.js(window.db, window.ROLE_LABEL), auth.js(window.Auth)
  · 데이터: 신버전 pdnwgzneooyygfejrvbg, db.js 경유
  · Phase 2에서 app.html SPA #v-admin 2단 탭/칩 라우터로 확장 예정
*/
(function(){
  var VIEW_TITLES = {
    dashboard:'대시보드', approvals:'가입 승인', users:'사용자', branches:'지점',
    posts:'게시글', comments:'댓글', library:'자료실',
    menu:'메뉴', notice:'공지·배너', settings:'설정', logs:'로그'
  };

  // 라우터
  window.acSwitchView = function(key){
    var root = document.getElementById('ac-root');
    if(!root){ if(window.acGoSec) window.acGoSec(key); return; }  /* SPA(app.html #v-admin): 2단 탭/칩 라우터로 위임 */
    root.querySelectorAll('.ac-view').forEach(function(v){
      v.classList.toggle('active', v.getAttribute('data-view')===key);
    });
    root.querySelectorAll('.ac-nav-item[data-view]').forEach(function(n){
      n.classList.toggle('active', n.getAttribute('data-view')===key);
    });
    var t = document.getElementById('ac-view-title');
    if(t && VIEW_TITLES[key]) t.textContent = VIEW_TITLES[key];
    if(key==='dashboard' && window.acLoadDashboard) window.acLoadDashboard();
    if(key==='approvals' && window.acLoadApprovals) window.acLoadApprovals();
    if(key==='users' && window.acLoadUsers) window.acLoadUsers();
    if(key==='branches' && window.acLoadBranches) window.acLoadBranches();
    if(key==='posts' && window.acLoadPosts) window.acLoadPosts();
    if(key==='comments' && window.acLoadComments) window.acLoadComments();
    if(key==='library' && window.acLoadLibrary) window.acLoadLibrary();
    var _r=document.getElementById('ac-root'); if(_r) _r.classList.remove('msidebar'); // 모바일 nav 닫기
    if(window.lucide) window.lucide.createIcons();
  };

  // 이탈 경로 (로고·상단 버튼·관리자 종료·ESC 공통)
  window.acGoService = function(){ window.location.href = '/app.html'; };

  // 모바일 사이드바 토글 (햄버거·백드롭)
  window.acToggleSidebar = function(){ var r=document.getElementById('ac-root'); if(r) r.classList.toggle('msidebar'); };

  // 로그아웃 (세션 종료 — app.html과 동일하게 Auth.logout)
  window.acLogout = function(){
    if(!confirm('로그아웃 하시겠습니까?')) return;
    if(window.Auth && typeof window.Auth.logout === 'function'){ window.Auth.logout(); }
    else { try{ localStorage.clear(); sessionStorage.clear(); }catch(e){} window.location.href='/pages/landing.html'; }
  };

  // 테마 토글
  window.acToggleTheme = function(){
    var root = document.getElementById('ac-root'); if(!root) return;
    var cur = root.getAttribute('data-theme')==='light' ? 'dark' : 'light';
    root.setAttribute('data-theme', cur);
    try{ localStorage.setItem('ac_theme', cur); }catch(e){}
  };

  // 안전장치: ESC → 모달 열려 있으면 모달만 닫음.
  // 별도 페이지(ac-root)에서만 서비스 복귀까지. SPA(app.html)에선 모달만 닫고
  // 페이지 이탈 안 함 (SPA 자체 ESC 핸들러가 검색/모달 등 처리).
  document.addEventListener('keydown', function(e){
    if(e.key!=='Escape') return;
    var mo=document.getElementById('ac-modal-overlay');
    if(mo && mo.classList.contains('on')){ acCloseApproval(); return; }
    if(document.getElementById('ac-root')) window.acGoService();
  });

  // ════════════════════════════════════════════════════════════════════
  //  대시보드 데이터 연결 (신버전 pdnwgzneooyygfejrvbg, db.js 경유)
  //  · 활성 = status=active 기준 (last_seen_at 미집계 회피)
  //  · 집계 가능 항목만 실데이터 / 운영 액션 로깅 확대는 후속
  // ════════════════════════════════════════════════════════════════════
  var INSURER_ROLES = 'insurer_branch_manager,insurer_manager,insurer_member,insurer_staff';
  // 운영 피드 문장 변환 카탈로그 (raw event_type 노출 금지 — 설계서 §5/§8)
  var EVENT_FEED = {
    approve_user:'가입을 승인했습니다', assign_branch:'지점에 배정했습니다',
    suspend_user:'사용자를 정지했습니다', activate_user:'정지를 해제했습니다',
    change_role:'권한을 변경했습니다', create_notice:'공지를 등록했습니다',
    update_notice:'공지를 수정했습니다', update_setting:'시스템 설정을 변경했습니다',
    hide_post:'게시글을 숨김 처리했습니다', delete_post:'게시글을 삭제했습니다',
    delete_comment:'댓글을 삭제했습니다', delete_user:'사용자를 삭제했습니다', update_menu:'메뉴 설정을 변경했습니다',
    create_branch:'지점을 생성했습니다', update_branch:'지점 정보를 수정했습니다',
    delete_branch:'지점을 삭제했습니다', login:'로그인했습니다',
    script_view:'스크립트를 조회했습니다'
  };

  function _isoAgo(ms){ return new Date(Date.now()-ms).toISOString(); }
  function _kstMidnightISO(){
    var k = new Date(Date.now()+9*3600000);
    return new Date(Date.UTC(k.getUTCFullYear(),k.getUTCMonth(),k.getUTCDate())-9*3600000).toISOString();
  }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function _rel(iso){ if(!iso) return '-'; var m=(Date.now()-new Date(iso).getTime())/60000;
    if(m<1) return '방금'; if(m<60) return Math.floor(m)+'분 전'; if(m<1440) return Math.floor(m/60)+'시간 전'; return Math.floor(m/1440)+'일 전'; }

  async function _count(q){
    try{ var r=await window.db.fetch('/rest/v1/'+q,{headers:{'Prefer':'count=exact'}});
      return parseInt((r.headers.get('Content-Range')||'0-0/0').split('/')[1],10)||0; }
    catch(e){ return null; }
  }
  async function _rows(q){
    try{ var r=await window.db.fetch('/rest/v1/'+q); return r.ok ? await r.json() : []; }
    catch(e){ return []; }
  }

  function _task(tag,cls,label,value,unit,view,btn){
    return '<div class="ac-task '+cls+'"><div class="ac-task-meta">'+
      '<span class="ac-badge '+cls+'">'+tag+'</span>'+
      '<div class="ac-task-label">'+label+'</div>'+
      '<div class="ac-task-value">'+(value==null?'—':value)+unit+'</div></div>'+
      '<button class="ac-btn" onclick="acSwitchView(\''+view+'\')">'+esc(btn)+'</button></div>';
  }
  function renderTaskQueue(p,u,s){
    var el=document.getElementById('ac-task-queue'); if(!el) return;
    el.innerHTML =
      _task(p>0?'CRITICAL':'NORMAL', p>0?'critical':'normal', '승인 대기', p, '건', 'approvals', '승인하러 가기')+
      _task(u>0?'HIGH':'NORMAL', u>0?'high':'normal', '지점 미배정', u, '명', 'users', '사용자 관리')+
      _task(s>0?'CRITICAL':'NORMAL', s>0?'critical':'normal', '장기 미처리(24h+)', s, '건', 'approvals', '확인');
  }
  function renderRisk(p,u,s){
    var el=document.getElementById('ac-risk-alerts'); if(!el) return;
    el.classList.remove('ac-card-empty');
    var items=[];
    if(s>0) items.push(['critical','CRITICAL','24시간 초과 미처리 승인 '+s+'건','approvals']);
    if(u>0) items.push(['high','HIGH','지점 미배정 사용자 '+u+'명','users']);
    if(p>0) items.push(['medium','MEDIUM','승인 대기 '+p+'건','approvals']);
    if(!items.length){ el.innerHTML='<div class="ac-card-empty"><i data-lucide="shield-check"></i>현재 위험 신호 없음</div>'; return; }
    el.innerHTML=items.map(function(i){
      return '<div class="ac-risk-row ac-clk" onclick="acGoSec(\''+i[3]+'\')"><span class="ac-badge '+i[0]+'">'+i[1]+'</span><span>'+esc(i[2])+'</span></div>';
    }).join('');
  }
  function _hhmm(iso){ var t=new Date(iso); if(isNaN(t.getTime())) return '--:--';
    var h=t.getHours(), m=t.getMinutes(); return (h<10?'0':'')+h+':'+(m<10?'0':'')+m; }
  // 운영 피드 = 시각 + severity 배지 + 변환 문장 (actor는 user_id→name JOIN)
  async function renderActivity(logs){
    var el=document.getElementById('ac-recent-activity'); if(!el) return;
    el.classList.remove('ac-card-empty');
    if(!logs || !logs.length){ el.innerHTML='<div class="ac-card-empty"><i data-lucide="clock"></i>최근 활동 없음</div>'; return; }
    // actor 이름 일괄 조회 (id-only 로그 → 표시 시 변환)
    var ids=[]; logs.forEach(function(l){ if(l.user_id && ids.indexOf(l.user_id)<0) ids.push(l.user_id); });
    var nameMap={};
    if(ids.length){
      var us=await _rows('users?id=in.('+ids.join(',')+')&select=id,name');
      us.forEach(function(u){ nameMap[u.id]=u.name; });
    }
    el.innerHTML=logs.map(function(l){
      var sev=l.severity||'normal';
      var actor=esc(nameMap[l.user_id]||'사용자');
      var phrase=EVENT_FEED[l.event_type];
      var sentence = (l.event_type==='login_admin') ? '어드민이 로그인했습니다'
        : (phrase ? (actor+'님이 '+phrase) : esc(l.event_type||'활동'));
      return '<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--bd);">'+
        '<span style="color:var(--tf);font-size:12px;min-width:40px;">'+_hhmm(l.created_at)+'</span>'+
        '<span class="ac-badge '+sev+'">'+sev.toUpperCase()+'</span>'+
        '<span>'+sentence+'</span></div>';
    }).join('');
  }
  function _stat(l,v,sec){
    var attr = sec ? 'class="ac-stat ac-clk" onclick="acGoSec(\''+sec+'\')"' : 'class="ac-stat"';
    return '<div '+attr+'><div class="ac-stat-label">'+l+'</div>'+
      '<div class="ac-stat-value">'+(v==null?'—':Number(v).toLocaleString())+'</div></div>'; }
  function renderService(total,active,nt,posts,scripts,lib){
    var el=document.getElementById('ac-service-overview'); if(!el) return;
    el.classList.remove('ac-card-empty');
    el.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">'+
      _stat('총 사용자',total,'users')+_stat('활성',active,'users')+_stat('오늘 신규',nt,'users')+
      _stat('게시글',posts,'posts')+_stat('스크립트',scripts,'library')+_stat('자료',lib,'library')+'</div>';
  }
  function renderBranches(branches,users,unassigned){
    var el=document.getElementById('ac-branch-overview'); if(!el) return;
    el.classList.remove('ac-card-empty');
    var cnt={}; (users||[]).forEach(function(u){ if(u.branch_id) cnt[u.branch_id]=(cnt[u.branch_id]||0)+1; });
    var rows=(branches||[]).map(function(b){
      var n=cnt[b.id]||0;
      var badge=(n===0)?' <span class="ac-badge high">인원 0</span>':'';
      return '<div class="ac-brow" onclick="acGoSec(\'branches\')" style="display:flex;justify-content:space-between;padding:7px 8px;border-bottom:1px solid var(--bd);">'+
        '<span>'+esc(b.name)+' <span style="color:var(--tf);font-size:12px;">'+esc(b.ga_org_name||'')+'</span></span>'+
        '<span>'+n+'명'+badge+'</span></div>';
    }).join('');
    el.innerHTML='<div style="margin-bottom:8px;color:var(--tf);font-size:12px;">전체 '+
      (branches?branches.length:0)+'개 지점 · 미배정 '+(unassigned==null?'—':unassigned)+'명</div>'+
      (rows || '<div class="ac-card-empty">지점 없음</div>');
  }

  // ── 사용자 view — 칩 필터 + 검색 + 페이지네이션 + 액션(권한 변경·정지/해제) ──
  var _usersAll=[], _usersFilter='all', _uq='', _uPage=0;
  var ROLE_KEYS=['admin','ga_branch_manager','ga_manager','ga_member','ga_staff','insurer_branch_manager','insurer_manager','insurer_member','insurer_staff'];
  function _rgrp(r){ return r==='admin' ? 'admin' : ((r && r.indexOf('insurer_')===0) ? 'insurer' : 'ga'); }
  window.acLoadUsers = async function(reload){
    var area=document.getElementById('ac-users-list'); if(!area) return;
    renderUserChips(); renderUserSearch();
    if(!_usersAll.length || reload){
      area.innerHTML='<div class="ac-skel-wrap"><div class="ac-skel"></div><div class="ac-skel"></div><div class="ac-skel"></div></div>';
      _usersAll = await _rows('users?select=id,name,email,role,company,status,created_at&order=created_at.desc&limit=300');
    }
    renderUserCards();
  };
  function renderUserChips(){
    var el=document.getElementById('ac-users-chips'); if(!el) return;
    var defs=[['all','전체'],['admin','어드민'],['ga','GA'],['insurer','원수사'],['pending','승인대기']];
    el.innerHTML=defs.map(function(d){ return '<button class="ac-chip'+(_usersFilter===d[0]?' active':'')+'" data-uf="'+d[0]+'">'+d[1]+'</button>'; }).join('');
    el.querySelectorAll('[data-uf]').forEach(function(b){ b.addEventListener('click',function(){ _usersFilter=b.getAttribute('data-uf'); _uPage=0; renderUserChips(); renderUserCards(); }); });
  }
  function renderUserSearch(){
    var el=document.getElementById('ac-users-search'); if(!el) return;
    el.innerHTML='<input class="ac-post-search" placeholder="이름·이메일·회사 검색" value="'+esc(_uq)+'" oninput="acUserSearch(this.value)">';
  }
  window.acUserSearch=function(v){ _uq=v; _uPage=0; renderUserCards(); };
  function _usersFiltered(){
    var list=_usersAll.filter(function(u){
      if(_usersFilter==='all') return true;
      if(_usersFilter==='pending') return u.status==='pending';
      return _rgrp(u.role)===_usersFilter;
    });
    var q=_uq.trim().toLowerCase();
    if(q) list=list.filter(function(u){ return ((u.name||'')+' '+(u.email||'')+' '+(u.company||'')).toLowerCase().indexOf(q)>=0; });
    return list;
  }
  function renderUserCards(){
    var area=document.getElementById('ac-users-list'); if(!area) return;
    var RL=window.ROLE_LABEL||{};
    var list=_usersFiltered();
    var cnt=document.getElementById('ac-users-count'); if(cnt) cnt.textContent=list.length+'명';
    if(!list.length){ area.innerHTML='<div class="ac-card-empty"><i data-lucide="users"></i>해당 사용자가 없습니다</div>'; _renderUserPager(0); if(window.lucide) window.lucide.createIcons(); return; }
    var per=50, pages=Math.ceil(list.length/per), page=Math.min(_uPage,pages-1); if(page<0)page=0; _uPage=page;
    var slice=list.slice(page*per,(page+1)*per);
    var body=slice.map(function(u){
      var st=u.status||'active';
      var stBadge = (st==='pending')?'<span class="ac-badge st-pending">승인대기</span>'
        : (st==='suspended')?'<span class="ac-badge high">정지</span>'
        : '<span class="ac-badge st-active">활성</span>';
      var isStd = ROLE_KEYS.indexOf(u.role)>=0;
      var sel='<select class="ac-user-role" onclick="event.stopPropagation()" onchange="acUserRole(\''+esc(u.id)+'\',this.value,\''+esc(u.role||'')+'\',this)">'
        +(isStd?'':'<option value="'+esc(u.role||'')+'" selected>미분류</option>')
        +ROLE_KEYS.map(function(rk){ return '<option value="'+rk+'"'+(rk===u.role?' selected':'')+'>'+esc(RL[rk]||rk)+'</option>'; }).join('')+'</select>';
      var suspBtn = (st==='suspended')
        ? '<button class="ac-btn ac-btn-sm" onclick="event.stopPropagation();acUserSuspend(\''+esc(u.id)+'\',false)">해제</button>'
        : '<button class="ac-btn ac-btn-sm" style="border-color:var(--warn);color:var(--warn)" onclick="event.stopPropagation();acUserSuspend(\''+esc(u.id)+'\',true)">정지</button>';
      var delBtn = (u.role==='admin') ? '' : ' <button class="ac-btn ac-btn-sm" style="border-color:var(--err);color:var(--err)" onclick="event.stopPropagation();acUserDelete(\''+esc(u.id)+'\')">삭제</button>';  /* 어드민 계정은 삭제 버튼 숨김(보호) */
      return '<tr class="ac-tr-clk" onclick="acUserDetail(\''+esc(u.id)+'\')"><td class="ac-td-name">'+esc(u.name||'(이름 없음)')+'</td><td>'+sel+'</td><td>'+stBadge+'</td><td class="ac-td-sub">'+esc(u.company||'-')+'</td><td class="ac-td-sub">'+esc(u.email||'')+'</td><td class="ac-td-date">'+esc(_fmtDate(u.created_at))+'</td><td class="ac-td-acts">'+suspBtn+delBtn+'</td></tr>';
    }).join('');
    area.innerHTML='<div class="ac-tbl-wrap"><table class="ac-tbl"><thead><tr><th>이름</th><th>권한</th><th>상태</th><th>소속</th><th>이메일</th><th>가입</th><th>관리</th></tr></thead><tbody>'+body+'</tbody></table></div>';
    _renderUserPager(pages);
    if(window.lucide) window.lucide.createIcons();
  }
  function _renderUserPager(pages){
    var el=document.getElementById('ac-users-pager'); if(!el) return;
    if(pages<=1){ el.innerHTML=''; return; }
    var p=_uPage, html='<button class="ac-pager-btn" '+(p<=0?'disabled':'')+' onclick="acUserPage('+(p-1)+')">‹</button>';
    for(var i=0;i<pages;i++){ if(i<2||i>pages-3||Math.abs(i-p)<=1){ html+='<button class="ac-pager-btn'+(i===p?' on':'')+'" onclick="acUserPage('+i+')">'+(i+1)+'</button>'; } else if(i===2||i===pages-3){ html+='<span style="padding:0 5px;color:var(--tf)">…</span>'; } }
    html+='<button class="ac-pager-btn" '+(p>=pages-1?'disabled':'')+' onclick="acUserPage('+(p+1)+')">›</button>';
    el.innerHTML=html;
  }
  window.acUserPage=function(i){ _uPage=i; renderUserCards(); };
  // 액션 — 권한 변경(민감, 확인+로깅) / 정지·해제. users PATCH RLS가 is_admin 허용 전제, 403이면 정책 보강 필요
  window.acUserRole=async function(id, newRole, oldRole, sel){
    if(newRole===oldRole) return;
    var RL=window.ROLE_LABEL||{};
    if(!confirm('이 사용자의 권한을\n['+(RL[oldRole]||oldRole||'미분류')+'] → ['+(RL[newRole]||newRole)+']\n로 변경하시겠습니까? 권한이 즉시 바뀝니다.')){ if(sel) sel.value=oldRole; return; }
    try{
      var res=await window.db.fetch('/rest/v1/users?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({role:newRole})});
      if(!res.ok){ acToast('권한 변경 실패 ('+res.status+') — RLS 정책 확인', true); if(sel) sel.value=oldRole; return; }
      if(window.db.logActivity) window.db.logActivity('change_role','user',id,{from:oldRole,to:newRole});
      acToast('권한을 변경했습니다');
      window.acLoadUsers(true);
    }catch(e){ acToast('네트워크 오류',true); if(sel) sel.value=oldRole; }
  };
  window.acUserSuspend=async function(id, suspend){
    if(!confirm(suspend?'이 사용자를 정지하시겠습니까?\n로그인·이용이 차단됩니다.':'정지를 해제하시겠습니까?')) return;
    try{
      var res=await window.db.fetch('/rest/v1/users?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({status:suspend?'suspended':'active'})});
      if(!res.ok){ acToast((suspend?'정지':'해제')+' 실패 ('+res.status+') — RLS 정책 확인', true); return; }
      if(window.db.logActivity) window.db.logActivity(suspend?'suspend_user':'activate_user','user',id,{});
      acToast(suspend?'사용자를 정지했습니다':'정지를 해제했습니다');
      window.acLoadUsers(true);
    }catch(e){ acToast('네트워크 오류',true); }
  };
  window.acUserDelete=async function(id){
    var u=null; for(var i=0;i<_usersAll.length;i++){ if(_usersAll[i].id===id){ u=_usersAll[i]; break; } }
    var nm=(u&&u.name)||'이 사용자';
    if(u&&u.role==='admin'){ acToast('어드민 계정은 삭제할 수 없습니다',true); return; }
    if(!confirm('"'+nm+'" 계정을 삭제하시겠습니까?\n\n되돌릴 수 없습니다. 이 사용자의 글·댓글 등 연관 데이터에 영향이 갈 수 있습니다.\n(로그인 인증(auth)은 별도로 남을 수 있어, 완전 삭제는 Supabase에서 확인이 필요합니다.)')) return;
    try{
      var res=await window.db.fetch('/rest/v1/users?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:{'Prefer':'return=minimal'}});
      if(!res.ok){ var msg='삭제 실패 ('+res.status+')'; if(res.status===409) msg+=' — 연관 데이터(FK) 있음'; else if(res.status===403||res.status===401) msg+=' — RLS 정책 확인'; acToast(msg,true); return; }
      if(window.db.logActivity) window.db.logActivity('delete_user','user',id,{name:nm});
      acToast('계정을 삭제했습니다');
      window.acLoadUsers(true);
    }catch(e){ acToast('네트워크 오류',true); }
  };
  // 행 클릭 → 사용자 상세 (전체 컬럼 + 지점 이름 매핑). 모달
  var _UFIELD={ name:'이름', role:'권한', status:'상태', email:'이메일', company:'소속/회사', phone:'전화', branch_id:'지점', team_id:'팀', created_at:'가입일', id:'ID' };
  window.acUserDetail=async function(id){
    var ov=document.getElementById('ac-udetail-ov');
    if(!ov){ ov=document.createElement('div'); ov.id='ac-udetail-ov'; ov.className='ac-udetail-ov'; ov.onclick=function(e){ if(e.target===ov) acUserDetailClose(); }; document.body.appendChild(ov); }
    ov.innerHTML='<div class="ac-udetail-box"><button class="ac-udetail-x" onclick="acUserDetailClose()">✕</button><div id="ac-udetail-body"><div class="ac-card-empty">불러오는 중…</div></div></div>';
    ov.classList.add('on');
    var u=null; try{ var rs=await _rows('users?id=eq.'+encodeURIComponent(id)+'&select=*'); u=rs&&rs[0]; }catch(e){}
    var body=document.getElementById('ac-udetail-body'); if(!body) return;
    if(!u){ body.innerHTML='<div class="ac-card-empty">사용자를 찾을 수 없습니다.</div>'; return; }
    var RL=window.ROLE_LABEL||{};
    var brName=''; if(u.branch_id){ try{ var b=await _rows('branches?id=eq.'+encodeURIComponent(u.branch_id)+'&select=name,ga_org_name'); if(b&&b[0]) brName=(b[0].name||'')+(b[0].ga_org_name?(' ('+b[0].ga_org_name+')'):''); }catch(e){} }
    function row(k,v){ return (v==null||v==='')?'':'<div class="ac-ud-row"><span class="ac-ud-k">'+esc(k)+'</span><span class="ac-ud-v">'+esc(String(v))+'</span></div>'; }
    var h='<div class="ac-ud-title">'+esc(u.name||'(이름 없음)')+'</div>';
    h+=row('권한',RL[u.role]||u.role||'미분류');
    h+=row('상태',u.status==='suspended'?'정지':(u.status==='pending'?'승인대기':(u.status||'활성')));
    h+=row('이메일',u.email);
    h+=row('소속/회사',u.company);
    h+=row('전화',u.phone);
    h+=row('지점',brName||u.branch_id);
    h+=row('팀',u.team_id);
    h+=row('가입일',_fmtDate(u.created_at));
    h+=row('ID',u.id);
    // 위에 없는 기타 컬럼 자동 표시(민감 제외)
    var shown={name:1,role:1,status:1,email:1,company:1,phone:1,branch_id:1,team_id:1,created_at:1,id:1,auth_user_id:1,updated_at:1};
    Object.keys(u).forEach(function(k){ if(!shown[k] && u[k]!=null && u[k]!==''){ var v=(typeof u[k]==='object')?JSON.stringify(u[k]):u[k]; h+=row(_UFIELD[k]||k,v); } });
    body.innerHTML=h;
  };
  window.acUserDetailClose=function(){ var ov=document.getElementById('ac-udetail-ov'); if(ov) ov.classList.remove('on'); };

  // ── 지점 view (지점 카드 + 소속 인원) ──
  window.acLoadBranches = async function(){
    var area=document.getElementById('ac-branches-list'); if(!area) return;
    area.innerHTML='<div class="ac-skel-wrap"><div class="ac-skel"></div><div class="ac-skel"></div><div class="ac-skel"></div></div>';
    var bs=await _rows('branches?select=id,name,ga_org_name,is_active&order=name.asc');
    var us=await _rows('users?select=branch_id&status=eq.active');
    var cnt={}; us.forEach(function(u){ if(u.branch_id) cnt[u.branch_id]=(cnt[u.branch_id]||0)+1; });
    var c=document.getElementById('ac-branches-count'); if(c) c.textContent=bs.length+'개';
    if(!bs.length){ area.innerHTML='<div class="ac-card-empty"><i data-lucide="building-2"></i>등록된 지점이 없습니다</div>'; if(window.lucide) window.lucide.createIcons(); return; }
    area.innerHTML=bs.map(function(b){
      var n=cnt[b.id]||0; var zero=(n===0)?' <span class="ac-badge high">인원 0</span>':'';
      return '<div class="ac-entity">'+
        '<span class="ac-badge medium">'+esc(b.ga_org_name||'GA')+'</span>'+zero+
        '<div class="ac-entity-name">'+esc(b.name)+'</div>'+
        '<div class="ac-entity-meta">소속 인원 '+n+'명</div></div>';
    }).join('');
  };

  // ── 콘텐츠 view (게시글 / 댓글 / 자료실) ──
  var BOARD_LABEL={ qna:'스마트 게시판', insurer:'보험사', navigation:'네비방', hub:'허브',
    manager_notice:'공지', manager_lounge:'매니저 라운지', archive_legacy:'아카이브' };
  // 게시글 — 필터(게시판)·검색(제목·본문)·본문 미리보기·작성자·페이지네이션. 300건 캐시 후 클라이언트 필터
  var _pState = { cache:null, filter:'all', q:'', page:0, per:20 };
  window.acLoadPosts = async function(reload){
    var list=document.getElementById('ac-posts-list'); if(!list) return;
    _renderPostTools();
    if(!_pState.cache || reload){
      list.innerHTML='<div class="ac-skel-wrap"><div class="ac-skel"></div><div class="ac-skel"></div><div class="ac-skel"></div></div>';
      _pState.cache = await _rows('posts?select=id,title,content,board_type,author_name,author_id,created_at,is_hidden&order=created_at.desc&limit=300');
    }
    _renderPostList();
  };
  function _renderPostTools(){
    var t=document.getElementById('ac-posts-tools'); if(!t) return;
    var boards=['all','qna','insurer','navigation','hub','manager_notice','manager_lounge','archive_legacy'];
    var chips=boards.map(function(b){ var lbl=(b==='all'?'전체':(BOARD_LABEL[b]||b)); return '<button class="ac-chip'+(_pState.filter===b?' active':'')+'" onclick="acPostFilter(\''+b+'\')">'+lbl+'</button>'; }).join('');
    t.innerHTML='<div class="ac-post-tools">'+chips+'<input class="ac-post-search" id="ac-post-q" placeholder="제목·본문 검색" value="'+esc(_pState.q)+'" oninput="acPostSearch(this.value)"></div>';
  }
  window.acPostFilter=function(b){ _pState.filter=b; _pState.page=0; _renderPostTools(); _renderPostList(); };
  window.acPostSearch=function(v){ _pState.q=v; _pState.page=0; _renderPostList(); };  /* tools 재렌더 안 함 — 입력 포커스 유지 */
  function _postFiltered(){
    var rows=_pState.cache||[];
    if(_pState.filter!=='all') rows=rows.filter(function(p){ return p.board_type===_pState.filter; });
    var q=_pState.q.trim().toLowerCase();
    if(q) rows=rows.filter(function(p){ return ((p.title||'')+' '+(p.content||'')).toLowerCase().indexOf(q)>=0; });
    return rows;
  }
  function _renderPostList(){
    var list=document.getElementById('ac-posts-list'); if(!list) return;
    var rows=_postFiltered();
    var c=document.getElementById('ac-posts-count'); if(c) c.textContent=rows.length+'건';
    if(!rows.length){ list.innerHTML='<div class="ac-card-empty"><i data-lucide="file-text"></i>해당 게시글이 없습니다</div>'; _renderPostPager(0); if(window.lucide) window.lucide.createIcons(); return; }
    var per=_pState.per, pages=Math.ceil(rows.length/per), page=Math.min(_pState.page, pages-1); if(page<0) page=0;
    _pState.page=page;
    var slice=rows.slice(page*per, (page+1)*per);
    list.innerHTML=slice.map(function(p){
      var hid=p.is_hidden?' <span class="ac-badge high">숨김</span>':'';
      var who=p.author_name||(p.author_id?('ID '+String(p.author_id).slice(0,8)):'작성자 미상');
      var body=esc(p.content||'').replace(/\n/g,'<br>');
      return '<div class="ac-entity"><span class="ac-badge medium">'+esc(BOARD_LABEL[p.board_type]||p.board_type||'')+'</span>'+hid+
        '<div class="ac-entity-name">'+esc(p.title||'(제목 없음)')+'</div>'+
        '<div class="ac-post-meta">'+esc(who)+' · '+esc(_fmtDate(p.created_at))+'</div>'+
        (p.content?'<div class="ac-post-body" id="pb-'+esc(p.id)+'">'+body+'</div><button class="ac-linkbtn" onclick="acPostToggleBody(\''+esc(p.id)+'\',this)">전체 보기</button>':'<div class="ac-post-meta" style="font-style:italic">본문 없음</div>')+
        '<div style="display:flex;gap:8px;margin-top:10px">'+
          '<button class="ac-btn" onclick="acHidePost(\''+esc(p.id)+'\','+(p.is_hidden?'false':'true')+')">'+(p.is_hidden?'숨김 해제':'숨기기')+'</button>'+
          '<button class="ac-btn" style="border-color:var(--err);color:var(--err)" onclick="acDeletePost(\''+esc(p.id)+'\')">삭제</button>'+
        '</div></div>';
    }).join('');
    _renderPostPager(pages);
    if(window.lucide) window.lucide.createIcons();
  }
  window.acPostToggleBody=function(id, btn){ var b=document.getElementById('pb-'+id); if(!b) return; var full=b.classList.toggle('full'); if(btn) btn.textContent=full?'접기':'전체 보기'; };
  function _renderPostPager(pages){
    var el=document.getElementById('ac-posts-pager'); if(!el) return;
    if(pages<=1){ el.innerHTML=''; return; }
    var p=_pState.page, html='<button class="ac-pager-btn" '+(p<=0?'disabled':'')+' onclick="acPostPage('+(p-1)+')">‹</button>';
    for(var i=0;i<pages;i++){
      if(i<2 || i>pages-3 || Math.abs(i-p)<=1){ html+='<button class="ac-pager-btn'+(i===p?' on':'')+'" onclick="acPostPage('+i+')">'+(i+1)+'</button>'; }
      else if(i===2 || i===pages-3){ html+='<span style="padding:0 5px;color:var(--tf)">…</span>'; }
    }
    html+='<button class="ac-pager-btn" '+(p>=pages-1?'disabled':'')+' onclick="acPostPage('+(p+1)+')">›</button>';
    el.innerHTML=html;
  }
  window.acPostPage=function(i){ _pState.page=i; _renderPostList(); };
  // 댓글 — 본문·작성자·소속 게시글·검색·페이지네이션 (comments={post_id,content,author_id,author_name,created_at})
  var _cState = { cache:null, q:'', page:0, per:20 };
  window.acLoadComments = async function(reload){
    var list=document.getElementById('ac-comments-list'); if(!list) return;
    _renderCmtTools();
    if(!_cState.cache || reload){
      list.innerHTML='<div class="ac-skel-wrap"><div class="ac-skel"></div><div class="ac-skel"></div><div class="ac-skel"></div></div>';
      var rows=await _rows('comments?select=id,post_id,content,author_id,author_name,created_at&order=created_at.desc&limit=200');
      var ids=[]; rows.forEach(function(c){ if(c.post_id && ids.indexOf(c.post_id)<0) ids.push(c.post_id); });
      var tmap={};
      if(ids.length){ try{ var ps=await _rows('posts?id=in.('+ids.join(',')+')&select=id,title'); ps.forEach(function(p){ tmap[p.id]=p.title; }); }catch(e){} }
      rows.forEach(function(c){ c._pt=tmap[c.post_id]||''; });
      _cState.cache=rows;
    }
    _renderCmtList();
  };
  function _renderCmtTools(){
    var t=document.getElementById('ac-comments-tools'); if(!t) return;
    t.innerHTML='<div class="ac-post-tools"><input class="ac-post-search" id="ac-cmt-q" placeholder="본문·작성자 검색" value="'+esc(_cState.q)+'" oninput="acCmtSearch(this.value)"></div>';
  }
  window.acCmtSearch=function(v){ _cState.q=v; _cState.page=0; _renderCmtList(); };
  function _cmtFiltered(){
    var rows=_cState.cache||[]; var q=_cState.q.trim().toLowerCase();
    if(q) rows=rows.filter(function(c){ return ((c.content||'')+' '+(c.author_name||'')).toLowerCase().indexOf(q)>=0; });
    return rows;
  }
  function _renderCmtList(){
    var list=document.getElementById('ac-comments-list'); if(!list) return;
    var rows=_cmtFiltered();
    var c=document.getElementById('ac-comments-count'); if(c) c.textContent=rows.length+'건';
    if(!rows.length){ list.innerHTML='<div class="ac-card-empty"><i data-lucide="message-square"></i>해당 댓글이 없습니다</div>'; _renderCmtPager(0); if(window.lucide) window.lucide.createIcons(); return; }
    var per=_cState.per, pages=Math.ceil(rows.length/per), page=Math.min(_cState.page,pages-1); if(page<0)page=0; _cState.page=page;
    var slice=rows.slice(page*per,(page+1)*per);
    list.innerHTML=slice.map(function(cm){
      var who=cm.author_name||(cm.author_id?('ID '+String(cm.author_id).slice(0,8)):'작성자 미상');
      var body=esc(cm.content||'(내용 없음)').replace(/\n/g,'<br>');
      var pt=cm._pt?'<div class="ac-post-meta">↳ 소속글: '+esc(cm._pt)+'</div>':'';
      return '<div class="ac-entity"><span class="ac-badge normal">댓글</span>'+
        '<div class="ac-post-meta">'+esc(who)+' · '+esc(_fmtDate(cm.created_at))+'</div>'+
        '<div class="ac-post-body full">'+body+'</div>'+pt+
        '<div style="margin-top:10px"><button class="ac-btn" style="border-color:var(--err);color:var(--err)" onclick="acDeleteComment(\''+esc(cm.id)+'\')">삭제</button></div></div>';
    }).join('');
    _renderCmtPager(pages);
    if(window.lucide) window.lucide.createIcons();
  }
  function _renderCmtPager(pages){
    var el=document.getElementById('ac-comments-pager'); if(!el) return;
    if(pages<=1){ el.innerHTML=''; return; }
    var p=_cState.page, html='<button class="ac-pager-btn" '+(p<=0?'disabled':'')+' onclick="acCmtPage('+(p-1)+')">‹</button>';
    for(var i=0;i<pages;i++){ if(i<2||i>pages-3||Math.abs(i-p)<=1){ html+='<button class="ac-pager-btn'+(i===p?' on':'')+'" onclick="acCmtPage('+i+')">'+(i+1)+'</button>'; } else if(i===2||i===pages-3){ html+='<span style="padding:0 5px;color:var(--tf)">…</span>'; } }
    html+='<button class="ac-pager-btn" '+(p>=pages-1?'disabled':'')+' onclick="acCmtPage('+(p+1)+')">›</button>';
    el.innerHTML=html;
  }
  window.acCmtPage=function(i){ _cState.page=i; _renderCmtList(); };
  // ── 긴급 모더레이션 (admin 슈퍼유저) — 게시글 숨김/삭제 · 댓글 삭제 (2026-05-31 P1)
  //    admin_v2.js handleHidePost/handleDeletePost 패턴 이식. RLS가 admin PATCH/DELETE 허용 전제.
  //    403이면 posts/comments RLS에 is_admin() 정책 보강 필요(SQL 별도). 운영 액션 로깅.
  window.acHidePost = async function(id, hide){
    try{
      var res=await window.db.fetch('/rest/v1/posts?id=eq.'+encodeURIComponent(id),{
        method:'PATCH', headers:{'Content-Type':'application/json','Prefer':'return=minimal'},
        body:JSON.stringify({is_hidden:hide}) });
      if(!res.ok){ acToast('숨김 처리 실패 ('+res.status+')',true); return; }
      if(window.db.logActivity) window.db.logActivity(hide?'hide_post':'unhide_post','post',id,{});
      acToast(hide?'게시글을 숨겼습니다':'숨김을 해제했습니다');
      if(window.acLoadPosts) window.acLoadPosts(true);
    }catch(e){ acToast('네트워크 오류',true); }
  };
  window.acDeletePost = async function(id){
    if(!confirm('게시글을 삭제하시겠습니까?\n(되돌릴 수 없습니다)')) return;
    try{
      var res=await window.db.fetch('/rest/v1/posts?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:{'Prefer':'return=minimal'}});
      if(!res.ok){ acToast('삭제 실패 ('+res.status+')',true); return; }
      if(window.db.logActivity) window.db.logActivity('delete_post','post',id,{});
      acToast('게시글을 삭제했습니다');
      if(window.acLoadPosts) window.acLoadPosts(true);
    }catch(e){ acToast('네트워크 오류',true); }
  };
  window.acDeleteComment = async function(id){
    if(!confirm('댓글을 삭제하시겠습니까?\n(되돌릴 수 없습니다)')) return;
    try{
      var res=await window.db.fetch('/rest/v1/comments?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:{'Prefer':'return=minimal'}});
      if(!res.ok){ acToast('삭제 실패 ('+res.status+')',true); return; }
      if(window.db.logActivity) window.db.logActivity('delete_comment','comment',id,{});
      acToast('댓글을 삭제했습니다');
      if(window.acLoadComments) window.acLoadComments(true);
    }catch(e){ acToast('네트워크 오류',true); }
  };

  var _libFilter='library';
  window.acLoadLibrary = function(){ renderLibChips(); loadLibList(); };
  function renderLibChips(){
    var el=document.getElementById('ac-library-chips'); if(!el) return;
    var defs=[['library','자료'],['scripts','스크립트']];
    el.innerHTML=defs.map(function(d){ return '<button class="ac-chip'+(_libFilter===d[0]?' active':'')+'" data-lf="'+d[0]+'">'+d[1]+'</button>'; }).join('');
    el.querySelectorAll('[data-lf]').forEach(function(b){ b.addEventListener('click',function(){ _libFilter=b.getAttribute('data-lf'); renderLibChips(); loadLibList(); }); });
  }
  async function loadLibList(){
    var area=document.getElementById('ac-library-list'); if(!area) return;
    area.innerHTML='<div class="ac-skel-wrap"><div class="ac-skel"></div><div class="ac-skel"></div><div class="ac-skel"></div></div>';
    var rows, label;
    if(_libFilter==='scripts'){ rows=await _rows('scripts?select=id,title,stage,created_at&order=created_at.desc&limit=100'); label='스크립트'; }
    else { rows=await _rows('library?select=id,title,created_at&order=created_at.desc&limit=100'); label='자료'; }
    var c=document.getElementById('ac-library-count'); if(c) c.textContent=rows.length+'건';
    if(!rows.length){ area.innerHTML='<div class="ac-card-empty"><i data-lucide="folder-kanban"></i>'+label+' 없음</div>'; if(window.lucide) window.lucide.createIcons(); return; }
    area.innerHTML=rows.map(function(r){
      var sub=(r.stage?('스테이지 '+esc(r.stage)+' · '):'')+esc(_fmtDate(r.created_at));
      return '<div class="ac-entity"><span class="ac-badge medium">'+label+'</span>'+
        '<div class="ac-entity-name">'+esc(r.title||'(제목 없음)')+'</div>'+
        '<div class="ac-entity-sub">'+sub+'</div></div>';
    }).join('');
  }

  // ── 가입 승인 (admin-approvals 흡수 + approve_user/assign_branch 로깅) ──
  var _appr = { pending:[], branches:[], sel:null };
  function _fmtDate(iso){ if(!iso) return ''; var d=new Date(iso); if(isNaN(d.getTime())) return '';
    var p=function(n){return (n<10?'0':'')+n;};
    return d.getFullYear()+'.'+p(d.getMonth()+1)+'.'+p(d.getDate())+' '+p(d.getHours())+':'+p(d.getMinutes()); }
  var _toastTimer=null;
  function acToast(msg,isErr){ var el=document.getElementById('ac-toast'); if(!el) return;
    el.textContent=msg; el.className='ac-toast on'+(isErr?' err':'');
    clearTimeout(_toastTimer); _toastTimer=setTimeout(function(){ el.className='ac-toast'; },2600); }

  window.acLoadApprovals = async function(){
    var area=document.getElementById('ac-approvals-list'); if(!area) return;
    area.innerHTML='<div class="ac-skel-wrap"><div class="ac-skel"></div><div class="ac-skel"></div><div class="ac-skel"></div></div>';
    _appr.branches = await _rows('branches?select=id,name,ga_org_name&order=name.asc');
    var rows = await _rows('users?status=eq.pending&role=like.insurer_*&select=id,name,company,role,email,created_at&order=created_at.asc');
    _appr.pending = rows;
    var cnt=document.getElementById('ac-appr-count'); if(cnt) cnt.textContent=rows.length+'건 대기';
    if(!rows.length){ area.innerHTML='<div class="ac-card-empty">대기 중인 가입 신청이 없습니다</div>'; return; }
    var RL=(window.ROLE_LABEL||{});
    area.innerHTML=rows.map(function(u){
      return '<div class="ac-approval-card"><div>'+
        '<div style="font-weight:700;">'+esc(u.name||'(이름 없음)')+' <span class="ac-badge medium">'+esc(RL[u.role]||u.role||'')+'</span></div>'+
        '<div style="font-size:13px;color:var(--ts);margin-top:4px;">'+esc(u.company||'-')+' · '+esc(u.email||'')+'</div>'+
        '<div style="font-size:12px;color:var(--tf);margin-top:3px;">신청 '+esc(_fmtDate(u.created_at))+'</div></div>'+
        '<button class="ac-btn ac-btn-primary" data-appr="'+esc(u.id)+'">승인</button></div>';
    }).join('');
    area.querySelectorAll('[data-appr]').forEach(function(b){
      b.addEventListener('click',function(){ acOpenApproval(b.getAttribute('data-appr')); });
    });
  };

  window.acOpenApproval = function(uid){
    var u=_appr.pending.find(function(x){ return String(x.id)===String(uid); }); if(!u) return;
    _appr.sel=u;
    var RL=(window.ROLE_LABEL||{});
    document.getElementById('ac-modal-sub').innerHTML='<b>'+esc(u.name||'')+'</b> · '+esc(u.company||'')+' · '+esc(RL[u.role]||u.role||'');
    var bl=document.getElementById('ac-branch-list');
    if(!_appr.branches.length){ bl.innerHTML='<div style="font-size:13px;color:var(--tf);">등록된 지점이 없습니다. 먼저 지점을 등록해 주세요.</div>'; }
    else{
      bl.innerHTML=_appr.branches.map(function(b){
        return '<label class="ac-branch-opt"><input type="checkbox" value="'+esc(b.id)+'">'+
          '<span><b>'+esc(b.name)+'</b> <span style="color:var(--ts);font-size:12px;">'+esc(b.ga_org_name||'')+'</span></span></label>';
      }).join('');
      bl.querySelectorAll('.ac-branch-opt input').forEach(function(cb){
        cb.addEventListener('change',function(){ cb.closest('.ac-branch-opt').classList.toggle('checked',cb.checked); });
      });
    }
    var err=document.getElementById('ac-modal-err'); err.className='ac-modal-err';
    var cf=document.getElementById('ac-modal-confirm'); cf.disabled=false; cf.textContent='승인 확정';
    document.getElementById('ac-modal-overlay').classList.add('on');
  };
  function acCloseApproval(){ document.getElementById('ac-modal-overlay').classList.remove('on'); _appr.sel=null; }

  async function acConfirmApproval(){
    var u=_appr.sel; if(!u) return;
    var ids=Array.prototype.slice.call(document.querySelectorAll('#ac-branch-list input:checked')).map(function(c){return c.value;});
    var err=document.getElementById('ac-modal-err');
    if(!ids.length){ err.textContent='담당 지점을 하나 이상 선택해 주세요.'; err.className='ac-modal-err on'; return; }
    var btn=document.getElementById('ac-modal-confirm'); btn.disabled=true; btn.textContent='승인 중…';
    try{
      var res=await window.db.fetch('/rest/v1/rpc/approve_insurer_user',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ p_user_id:u.id, p_branch_ids:ids })
      });
      if(!res.ok){ var m='승인 실패 ('+res.status+')';
        try{ var j=await res.json(); if(j&&(j.message||j.hint)) m=j.message||j.hint; }catch(e){}
        err.textContent=m; err.className='ac-modal-err on'; btn.disabled=false; btn.textContent='승인 확정'; return; }
      // 운영 액션 로깅 (1차 카탈로그: approve_user + assign_branch)
      if(window.db.logActivity){
        window.db.logActivity('approve_user','user',u.id,{ role:u.role, branch_ids:ids });
        window.db.logActivity('assign_branch','branch',ids[0],{ user_id:u.id, branch_ids:ids });
      }
      _appr.pending=_appr.pending.filter(function(x){ return x.id!==u.id; });
      acCloseApproval();
      window.acLoadApprovals();
      if(window.acLoadDashboard) window.acLoadDashboard();
      if(window._refreshAdminBadge) window._refreshAdminBadge();  /* 승인 후 사이드바 배지 즉시 갱신 */
      acToast((u.name||'')+' 승인 완료');
    }catch(e){ err.textContent='네트워크 오류'; err.className='ac-modal-err on'; btn.disabled=false; btn.textContent='승인 확정'; }
  }

  window.acLoadDashboard = async function(){
    var [pending, unassigned, stale] = await Promise.all([
      _count('users?status=eq.pending&role=in.('+INSURER_ROLES+')&select=id'),
      _count('users?status=eq.active&branch_id=is.null&select=id'),
      _count('users?status=eq.pending&created_at=lt.'+_isoAgo(86400000)+'&select=id')
    ]);
    renderTaskQueue(pending, unassigned, stale);
    renderRisk(pending, unassigned, stale);
    var nb=document.getElementById('ac-nav-badge-approvals');
    if(nb){ nb.textContent=pending||0; nb.style.display=(pending>0)?'inline-flex':'none'; }
    if(window._refreshAdminBadge) window._refreshAdminBadge(pending);  /* SPA 사이드바 배지 동기화 */

    var [total, active, newToday, posts, scripts, lib] = await Promise.all([
      _count('users?select=id'),
      _count('users?status=eq.active&select=id'),
      _count('users?created_at=gte.'+_kstMidnightISO()+'&select=id'),
      _count('posts?select=id'),
      _count('scripts?select=id'),
      _count('library?select=id')
    ]);
    renderService(total, active, newToday, posts, scripts, lib);

    await renderActivity(await _rows('activity_logs?select=id,user_id,event_type,severity,created_at&order=created_at.desc&limit=12'));

    var [branches, ubranch] = await Promise.all([
      _rows('branches?select=id,name,ga_org_name,is_active'),
      _rows('users?select=branch_id&status=eq.active')
    ]);
    renderBranches(branches, ubranch, unassigned);
    if(window.lucide) window.lucide.createIcons();
  };

  // 초기화
  // ── 별도 페이지(admin-console.html) 전용 초기화 — #ac-root 있을 때만 ──
  if(document.getElementById('ac-root')){
    try{
      var saved = localStorage.getItem('ac_theme');
      if(saved){ var r=document.getElementById('ac-root'); if(r) r.setAttribute('data-theme', saved); }
    }catch(e){}
    var _mc=document.getElementById('ac-modal-cancel'); if(_mc) _mc.addEventListener('click',acCloseApproval);
    var _mf=document.getElementById('ac-modal-confirm'); if(_mf) _mf.addEventListener('click',acConfirmApproval);
    var _mo=document.getElementById('ac-modal-overlay'); if(_mo) _mo.addEventListener('click',function(e){ if(e.target===_mo) acCloseApproval(); });
    if(window.lucide) window.lucide.createIcons();
    // 딥링크 ?view= 초기 진입 (admin-approvals 리다이렉트 등) / 없으면 대시보드
    var _qv=null; try{ _qv=new URLSearchParams(location.search).get('view'); }catch(e){}
    if(_qv && document.querySelector('.ac-nav-item[data-view="'+_qv+'"]')){ window.acSwitchView(_qv); }
    else if(window.acLoadDashboard){ window.acLoadDashboard(); }
  }

  // ════════════════════════════════════════════════════════════════════
  //  SPA 흡수 (app.html #v-admin) — 2단 탭/칩 라우터 (2026-05-31 Phase 2)
  //  · 탭 = 그룹(대시보드/운영/콘텐츠/시스템/로그) · 칩 = 항목
  //  · 데이터 로딩(acLoad*)·승인 모달은 위 standalone 로직 그대로 재사용
  // ════════════════════════════════════════════════════════════════════
  var AC_GROUPS = {
    dashboard:{}, logs:{}, knowledge:{},
    ops:    { secs:[['approvals','가입 승인'],['users','사용자'],['branches','지점']] },
    content:{ secs:[['posts','게시글'],['comments','댓글'],['library','자료실']] },
    validation:{ secs:[['visibility','화면 가시성'],['rls','데이터 권한(RLS)']] },
    system: { secs:[['menu','메뉴'],['notice','공지·배너'],['settings','설정']] }
  };
  var AC_SEC_GROUP = { dashboard:'dashboard', logs:'logs', knowledge:'knowledge',
    approvals:'ops', users:'ops', branches:'ops',
    posts:'content', comments:'content', library:'content',
    visibility:'validation', rls:'validation',
    menu:'system', notice:'system', settings:'system' };
  var AC_LOAD = { dashboard:'acLoadDashboard', approvals:'acLoadApprovals', users:'acLoadUsers',
    branches:'acLoadBranches', posts:'acLoadPosts', comments:'acLoadComments', library:'acLoadLibrary',
    visibility:'acLoadVisibility', rls:'acLoadRlsOverview', logs:'acLoadLogs' };
  var AC_TAB_ORDER = ['dashboard','ops','content','knowledge','validation','system','logs'];

  function _acSpaRoot(){ return document.getElementById('v-admin'); }

  // 섹션 표시 + 탭/칩 동기화 + 데이터 로드 + URL 갱신 (단일 소스)
  window.acGoSec = function(sec){
    var root=_acSpaRoot(); if(!root) return;
    sec = sec || 'dashboard';
    var group = AC_SEC_GROUP[sec] || 'dashboard';
    var g = AC_GROUPS[group];
    // 탭 활성 (그룹 순서 기준)
    var tabs = root.querySelectorAll('#ac-tabs .tab');
    var gi = AC_TAB_ORDER.indexOf(group);
    for(var i=0;i<tabs.length;i++) tabs[i].classList.toggle('on', i===gi);
    // 칩 렌더 (그룹에 항목 있을 때만 — 없으면 비움 → :empty 숨김)
    var chips = document.getElementById('ac-chips');
    if(chips){
      if(g && g.secs){
        chips.innerHTML = g.secs.map(function(s){
          return '<div class="chip'+(s[0]===sec?' on':'')+'" data-sec="'+s[0]+'" onclick="acGoSec(\''+s[0]+'\')">'+s[1]+'</div>';
        }).join('');
      } else { chips.innerHTML=''; }
    }
    // 섹션 표시
    root.querySelectorAll('.ac-sec').forEach(function(s){ s.classList.toggle('on', s.getAttribute('data-sec')===sec); });
    // 데이터 로드 (해당 섹션 로더 있으면)
    var fn = AC_LOAD[sec]; if(fn && typeof window[fn]==='function') window[fn]();
    // URL 갱신 (딥링크/새로고침/뒤로가기 정합)
    try{ if(window.history && window.history.replaceState) window.history.replaceState({view:'admin'}, '', '?view=admin&sec='+encodeURIComponent(sec)); }catch(e){}
    if(window.lucide) window.lucide.createIcons();
  };

  // 탭 클릭 → 그룹의 첫 섹션으로 (single 탭은 탭키=섹션키)
  window.acTab = function(group){
    var g = AC_GROUPS[group];
    var first = (g && g.secs) ? g.secs[0][0] : group;
    window.acGoSec(first);
  };

  // 지식엔진 카드 = 카드 아래 iframe 인라인 토글 (페이지 이동 X). 정식 SPA 내장은 Phase 3 백로그.
  window.acKnToggle = function(which, el){
    var embed = document.getElementById('kn-embed');
    var frame = document.getElementById('kn-frame');
    if(!embed || !frame || !el) return;
    var cards = document.querySelectorAll('#v-admin .kn-card');
    var url = which==='search' ? '/pages/knowledge-search-test.html' : '/pages/knowledge-vault.html';
    // 열린 카드 다시 클릭 = 접기
    if(el.classList.contains('open')){
      el.classList.remove('open');
      embed.style.display='none';
      frame.src='about:blank';   // iframe 정지
      return;
    }
    // 다른 카드 닫고 해당 카드 펼침
    for(var i=0;i<cards.length;i++) cards[i].classList.remove('open');
    el.classList.add('open');
    frame.src = url;
    embed.style.display='';
    if(embed.scrollIntoView) embed.scrollIntoView({behavior:'smooth', block:'nearest'});
  };

  // SPA 진입점 (app.html showView('admin') → _acLazy → 여기) — sec 딥링크 반영
  window.acInitAdmin = function(sec){
    var root=_acSpaRoot(); if(!root) return;
    if(!window._acWired){
      var c=document.getElementById('ac-modal-cancel'); if(c) c.addEventListener('click',acCloseApproval);
      var f=document.getElementById('ac-modal-confirm'); if(f) f.addEventListener('click',acConfirmApproval);
      var o=document.getElementById('ac-modal-overlay'); if(o) o.addEventListener('click',function(e){ if(e.target===o) acCloseApproval(); });
      window._acWired = true;
    }
    if(window.lucide) window.lucide.createIcons();
    window.acGoSec((sec && AC_SEC_GROUP[sec]) ? sec : 'dashboard');
  };

  // ════════════════════════════════════════════════════════════════════
  //  권한 검증 — 화면 가시성 매트릭스 (9 role × 영역)
  //  · 실제 코드 게이팅(_canSee* 직접 실행, role override) vs 정답(role_access_map §1-2)
  //  · ✓ 보임(정상) / · 숨김(정상) / ✕ 불일치(수정 필요)
  // ════════════════════════════════════════════════════════════════════
  var AC_ROLES = [
    ['admin','어드민'],
    ['ga_branch_manager','지점장 · GA'], ['ga_manager','실장 · GA'],
    ['ga_member','설계사 · GA'], ['ga_staff','스텝 · GA'],
    ['insurer_branch_manager','지점장 · 원수사'], ['insurer_manager','매니저 · 원수사'],
    ['insurer_member','직원 · 원수사'], ['insurer_staff','스텝 · 원수사'],
    ['etc','기타 · 미분류']  /* 9 role에 안 맞는 가입자(예: 민인환). 현재 코드는 GA처럼 취급→GA 메뉴 노출이 ✕로 드러남 */
  ];
  function _isGA(r){ return r.indexOf('ga_')===0; }
  function _isIns(r){ return r.indexOf('insurer_')===0; }
  var _STD9 = {admin:1,ga_branch_manager:1,ga_manager:1,ga_member:1,ga_staff:1,insurer_branch_manager:1,insurer_manager:1,insurer_member:1,insurer_staff:1};
  // 영역: label + exp(정답 role_access_map §1-2)
  var AC_AREAS = [
    {key:'home',label:'홈',exp:function(r){return r==='admin'||_isGA(r);}},
    {key:'myspace',label:'MY SPACE',exp:function(r){return r==='admin'||_isGA(r);}},
    {key:'scripts',label:'스크립트',exp:function(r){return r==='admin'||_isGA(r);}},
    {key:'quick',label:'Quick',exp:function(r){return r==='admin'||_isGA(r);}},
    {key:'news',label:'보험이슈',exp:function(r){return r==='admin'||_isGA(r);}},
    {key:'voice',label:'현장의 소리',exp:function(r){return r==='admin'||_isGA(r);}},
    {key:'together',label:'함께해요',exp:function(r){return !!_STD9[r];}},  /* 표준 9 role만. 미분류=승인대기=전부 X */
    {key:'pricing',label:'요금제',exp:function(r){return r==='admin'||_isGA(r);}},
    {key:'insurer-vault',label:'보험사 자료실',exp:function(r){return r==='admin'||_isIns(r);}},
    {key:'admin',label:'어드민',exp:function(r){return r==='admin';}},
    {key:'search',label:'통합 검색',exp:function(r){return r==='admin';}},
    {key:'teamMembers',label:'팀원관리',exp:function(r){return r==='admin'||r==='ga_branch_manager'||r==='ga_manager';}}
  ];
  // 실제 코드 게이팅 — _canSee* 직접 실행(role override) + CSS/applyRoleClass 규칙 (app.html:3258-3278 정합)
  function _gateActual(role, key){
    if(!_STD9[role]) return false;  /* 미분류(승인 대기) = 전체 차단 — applyRoleClass is-pending 게이트 정합 */
    window._roleSimOverride = role;
    var isIns = role.indexOf('insurer_')===0, isAdmin = role==='admin', v;
    switch(key){
      case 'voice': v = !!(window._canSeeVoice && window._canSeeVoice()); break;
      case 'insurer-vault': v = !!(window._canSeeVault && window._canSeeVault()); break;
      case 'admin': v = !!(window._canSeeAdmin && window._canSeeAdmin()); break;
      case 'search': v = isAdmin; break;
      case 'teamMembers': v = (role==='admin'||role==='ga_branch_manager'||role==='ga_manager'); break;
      case 'together': v = true; break;
      default: v = !isIns;  /* home/myspace/scripts/quick/news/pricing — CSS is-insurer 숨김 */
    }
    window._roleSimOverride = null;  /* 복원 — 실사용 게이팅 영향 0 */
    return v;
  }
  window._acVisAreaRow = true;  /* 기본=영역행·role열(영역이 계속 늘어나므로 세로 확장). 전환 시 role행·영역열 */
  window.acVisOrient = function(){ window._acVisAreaRow = !window._acVisAreaRow; window.acLoadVisibility(); };
  window.acLoadVisibility = function(){
    var host = document.getElementById('ac-visibility-list'); if(!host) return;
    var bad = 0, total = 0;
    function cell(role, a){
      var act = _gateActual(role, a.key), exp = a.exp(role), ok = (act===exp);
      total++; if(!ok) bad++;
      var cls = !ok ? 'bad' : (act ? 'ok-show' : 'ok-hide');
      var sym = !ok ? '✕' : (act ? '✓' : '·');
      return '<td><div class="ac-vis-cell '+cls+'" onclick="acVisDetail(\''+role+'\',\''+a.key+'\')" title="'+role+' · '+a.label+'">'+sym+'</div></td>';
    }
    var head, body;
    if(!window._acVisAreaRow){
      head = '<tr><th class="ac-vis-rolehead">role \\ 영역</th>'+AC_AREAS.map(function(a){return '<th>'+a.label+'</th>';}).join('')+'</tr>';
      body = AC_ROLES.map(function(rr){ return '<tr><td class="ac-vis-rolecell">'+rr[1]+'<span class="rc">'+rr[0]+'</span></td>'+AC_AREAS.map(function(a){return cell(rr[0],a);}).join('')+'</tr>'; }).join('');
    } else {
      head = '<tr><th class="ac-vis-rolehead">영역 \\ role</th>'+AC_ROLES.map(function(rr){return '<th title="'+rr[0]+'">'+rr[1]+'</th>';}).join('')+'</tr>';
      body = AC_AREAS.map(function(a){ return '<tr><td class="ac-vis-rolecell">'+a.label+'<span class="rc">'+a.key+'</span></td>'+AC_ROLES.map(function(rr){return cell(rr[0],a);}).join('')+'</tr>'; }).join('');
    }
    var cnt = document.getElementById('ac-vis-count'); if(cnt) cnt.textContent = (bad===0?('정합 '+total+'/'+total):('불일치 '+bad+'건'));
    host.innerHTML =
      '<div class="ac-vis-toolbar">'
      +'<span class="ac-vis-summary">검사 '+total+'칸 · <span class="ok">일치 '+(total-bad)+'</span> · <span class="bad">불일치 '+bad+'</span></span>'
      +'<button class="ac-vis-filter" onclick="acVisOrient()" style="background:transparent;cursor:pointer;font-family:inherit">⇄ 가로·세로 전환</button>'
      +'<label class="ac-vis-filter"><input type="checkbox" onchange="acVisToggleHideOk(this)"> 불일치(✕)만 강조</label>'
      +'<button class="ac-vis-rerun" onclick="acLoadVisibility()">다시 검사</button>'
      +'</div>'
      +'<div class="ac-vis-main">'
      +'<div class="ac-vis-wrap"><table class="ac-vis-table" id="ac-vis-tbl"><thead>'+head+'</thead><tbody>'+body+'</tbody></table></div>'
      +'<div class="ac-vis-detail on" id="ac-vis-detail"><div class="ac-vis-detail-ph">셀을 클릭하면 여기에 상세(정답 vs 실제)가 표시됩니다.</div></div>'
      +'</div>'
      +'<div class="ac-vis-legend"><span><i style="background:color-mix(in srgb,var(--ok) 16%,transparent)"></i>✓ 보임(정상)</span><span><i style="background:var(--s2)"></i>· 숨김(정상)</span><span><i style="background:color-mix(in srgb,var(--err) 24%,transparent)"></i>✕ 불일치(수정 필요)</span></div>';
  };
  window.acVisToggleHideOk = function(el){ var t=document.getElementById('ac-vis-tbl'); if(t) t.classList.toggle('hide-ok', el.checked); };
  window.acVisDetail = function(role, key){
    var a=null; for(var i=0;i<AC_AREAS.length;i++){ if(AC_AREAS[i].key===key){ a=AC_AREAS[i]; break; } }
    if(!a) return;
    var act=_gateActual(role,key), exp=a.exp(role), ok=(act===exp);
    var box=document.getElementById('ac-vis-detail'); if(!box) return;
    var rl=''; for(var j=0;j<AC_ROLES.length;j++){ if(AC_ROLES[j][0]===role){ rl=AC_ROLES[j][1]; break; } }
    box.className='ac-vis-detail on';
    box.innerHTML='<b>'+rl+'</b> ('+role+') · <b>'+a.label+'</b><br>'
      +'정답(role_access_map): <b>'+(exp?'보여야 함':'숨겨야 함')+'</b> · 실제 코드 게이팅: <b>'+(act?'보임':'숨김')+'</b> → '
      +(ok?'<span style="color:var(--ok);font-weight:700">일치 ✓</span>':'<span class="vd-bad">불일치 ✕ — 게이팅 코드 수정 필요</span>');
  };

  // ════════════════════════════════════════════════════════════════════
  //  데이터 권한 (RLS) — 테이블별 RLS 활성·정책 현황 (rls_overview RPC, 읽기 전용)
  //  · OFF/정책없음 = 데이터 보호 공백 가능 → 즉시 발견. 실제 실행 검증(글쓰기 되나)은 다음 단계
  // ════════════════════════════════════════════════════════════════════
  // 보호 공백 시 강조할 핵심 테이블(오늘 트랙 정합)
  var AC_RLS_KEY = ['team_notices','scripts','library','posts','users','myspace_folders','myspace_files'];
  window.acLoadRlsOverview = function(){
    var host = document.getElementById('ac-rls-list'); if(!host) return;
    host.innerHTML = '<div class="ac-card-empty">조회 중…</div>';
    if(!window.db || !window.db.fetch){ host.innerHTML = '<div class="ac-card-empty">로그인이 필요합니다.</div>'; return; }
    window.db.fetch('/rest/v1/rpc/rls_overview', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' })
      .then(function(r){
        if(r.status===404){ host.innerHTML = '<div class="ac-card-empty">RLS 점검 함수(rls_overview)가 아직 설치되지 않았습니다.<br><code>docs/migrations/2026-06-12_rls_overview.sql</code> 을 Supabase에서 실행하면 표시됩니다.</div>'; return null; }
        if(!r.ok){ host.innerHTML = '<div class="ac-card-empty">조회 실패 ('+r.status+') — 어드민 권한·함수 설치 확인</div>'; return null; }
        return r.json();
      })
      .then(function(rows){
        if(!rows) return;
        if(!Array.isArray(rows)) rows = [];
        var off=0, nopol=0;
        // 핵심 테이블 먼저, 그 안에서 문제(off/정책없음) 우선
        rows.sort(function(a,b){
          var ka=AC_RLS_KEY.indexOf(a.table_name)>=0?0:1, kb=AC_RLS_KEY.indexOf(b.table_name)>=0?0:1;
          if(ka!==kb) return ka-kb;
          return a.table_name<b.table_name?-1:1;
        });
        var body = rows.map(function(t){
          var bad = !t.rls_enabled;
          var warn = t.rls_enabled && (t.policy_count===0);
          if(bad) off++; if(warn) nopol++;
          var key = AC_RLS_KEY.indexOf(t.table_name)>=0;
          var uniq={}; (t.policies||[]).forEach(function(p){ uniq[p.cmd]=1; });
          var cmdtxt = Object.keys(uniq).join(', ') || '—';
          var st = bad ? '<span style="color:var(--err);font-weight:800">RLS OFF</span>'
                 : warn ? '<span style="color:var(--warn);font-weight:700">정책 없음</span>'
                 : '<span style="color:var(--ok);font-weight:700">ON</span>';
          return '<tr class="'+((bad||warn)?'rls-bad':'')+'"><td class="ac-vis-rolecell">'+(key?'★ ':'')+t.table_name+'</td><td>'+st+'</td><td>'+(t.policy_count||0)+'</td><td style="text-align:left;padding:6px 10px;font-size:0.72rem;color:var(--ts)">'+cmdtxt+'</td></tr>';
        }).join('');
        var cnt = document.getElementById('ac-rls-count'); if(cnt) cnt.textContent = rows.length+'개 테이블 · OFF '+off+' · 정책없음 '+nopol;
        host.innerHTML =
          '<div class="ac-vis-toolbar"><span class="ac-vis-summary">테이블 '+rows.length+' · <span class="'+(off?'bad':'ok')+'">RLS OFF '+off+'</span> · <span class="'+(nopol?'bad':'ok')+'">정책 없음 '+nopol+'</span></span>'
          +'<button class="ac-vis-rerun" onclick="acLoadRlsOverview()">다시 조회</button></div>'
          +'<div class="ac-vis-wrap"><table class="ac-vis-table"><thead><tr><th class="ac-vis-rolehead">테이블 (★=핵심)</th><th>RLS</th><th>정책 수</th><th style="text-align:left;padding:8px 10px">동작(cmd)</th></tr></thead><tbody>'+body+'</tbody></table></div>'
          +'<p style="font-size:0.74rem;color:var(--ts);margin-top:10px"><b style="color:var(--err)">RLS OFF</b>·<b style="color:var(--warn)">정책 없음</b> = 데이터 보호 공백 가능(검토 필요). 정책별 상세 조건(어떤 role·격리)과 실제 실행 검증(글쓰기 되나)은 다음 단계.</p>';
      })
      .catch(function(){ host.innerHTML = '<div class="ac-card-empty">조회 중 오류가 발생했습니다.</div>'; });
  };

  // ════ 활동 로그 — activity_logs 전체 + severity 필터 + 검색 + 페이지네이션 ════
  var _lState = { cache:null, sev:'all', q:'', page:0, per:30 };
  window.acLoadLogs = async function(reload){
    var list=document.getElementById('ac-logs-list'); if(!list) return;
    _renderLogTools();
    if(!_lState.cache || reload){
      list.innerHTML='<div class="ac-skel-wrap"><div class="ac-skel"></div><div class="ac-skel"></div><div class="ac-skel"></div></div>';
      var rows=await _rows('activity_logs?select=id,user_id,event_type,severity,created_at&order=created_at.desc&limit=300');
      var ids=[]; rows.forEach(function(l){ if(l.user_id && ids.indexOf(l.user_id)<0) ids.push(l.user_id); });
      var nm={}; if(ids.length){ try{ var us=await _rows('users?id=in.('+ids.join(',')+')&select=id,name'); us.forEach(function(u){ nm[u.id]=u.name; }); }catch(e){} }
      rows.forEach(function(l){ l._actor=nm[l.user_id]||'사용자'; });
      _lState.cache=rows;
    }
    _renderLogList();
  };
  function _renderLogTools(){
    var t=document.getElementById('ac-logs-tools'); if(!t) return;
    var sevs=[['all','전체'],['critical','CRITICAL'],['high','HIGH'],['normal','NORMAL']];
    var chips=sevs.map(function(s){ return '<button class="ac-chip'+(_lState.sev===s[0]?' active':'')+'" onclick="acLogSev(\''+s[0]+'\')">'+s[1]+'</button>'; }).join('');
    t.innerHTML='<div class="ac-post-tools">'+chips+'<input class="ac-post-search" placeholder="이벤트·사용자 검색" value="'+esc(_lState.q)+'" oninput="acLogSearch(this.value)"></div>';
  }
  window.acLogSev=function(s){ _lState.sev=s; _lState.page=0; _renderLogTools(); _renderLogList(); };
  window.acLogSearch=function(v){ _lState.q=v; _lState.page=0; _renderLogList(); };
  function _logFiltered(){
    var rows=_lState.cache||[];
    if(_lState.sev!=='all') rows=rows.filter(function(l){ return (l.severity||'normal')===_lState.sev; });
    var q=_lState.q.trim().toLowerCase();
    if(q) rows=rows.filter(function(l){ var ph=EVENT_FEED[l.event_type]||l.event_type||''; return (ph+' '+(l._actor||'')+' '+(l.event_type||'')).toLowerCase().indexOf(q)>=0; });
    return rows;
  }
  function _renderLogList(){
    var list=document.getElementById('ac-logs-list'); if(!list) return;
    var rows=_logFiltered();
    var c=document.getElementById('ac-logs-count'); if(c) c.textContent=rows.length+'건';
    if(!rows.length){ list.innerHTML='<div class="ac-card-empty"><i data-lucide="scroll-text"></i>해당 로그가 없습니다</div>'; _renderLogPager(0); if(window.lucide) window.lucide.createIcons(); return; }
    var per=_lState.per, pages=Math.ceil(rows.length/per), page=Math.min(_lState.page,pages-1); if(page<0)page=0; _lState.page=page;
    var slice=rows.slice(page*per,(page+1)*per);
    list.innerHTML='<div class="ac-log-wrap">'+slice.map(function(l){
      var sev=l.severity||'normal';
      var ph=EVENT_FEED[l.event_type];
      var sentence=(l.event_type==='login_admin')?'어드민이 로그인했습니다':(ph?(esc(l._actor)+'님이 '+ph):esc(l.event_type||'활동'));
      return '<div class="ac-log-row"><span class="ac-log-time">'+esc(_fmtDate(l.created_at))+'</span><span class="ac-badge '+sev+'">'+sev.toUpperCase()+'</span><span class="ac-log-msg">'+sentence+'</span></div>';
    }).join('')+'</div>';
    _renderLogPager(pages);
    if(window.lucide) window.lucide.createIcons();
  }
  function _renderLogPager(pages){
    var el=document.getElementById('ac-logs-pager'); if(!el) return;
    if(pages<=1){ el.innerHTML=''; return; }
    var p=_lState.page, html='<button class="ac-pager-btn" '+(p<=0?'disabled':'')+' onclick="acLogPage('+(p-1)+')">‹</button>';
    for(var i=0;i<pages;i++){ if(i<2||i>pages-3||Math.abs(i-p)<=1){ html+='<button class="ac-pager-btn'+(i===p?' on':'')+'" onclick="acLogPage('+i+')">'+(i+1)+'</button>'; } else if(i===2||i===pages-3){ html+='<span style="padding:0 5px;color:var(--tf)">…</span>'; } }
    html+='<button class="ac-pager-btn" '+(p>=pages-1?'disabled':'')+' onclick="acLogPage('+(p+1)+')">›</button>';
    el.innerHTML=html;
  }
  window.acLogPage=function(i){ _lState.page=i; _renderLogList(); };
})();
