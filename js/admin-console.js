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

  /* 옛 Task Queue·Risk Alert 위젯 렌더 제거 — 관제센터 상황판으로 대체 (2026-06-15) */
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
  /* 옛 Service·Branch Overview 위젯 렌더 제거 — 관제센터 상황판·조직트리로 대체 (2026-06-15) */

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
      return '<tr class="ac-tr-clk" onclick="acUserDetail(\''+esc(u.id)+'\')"><td class="ac-td-name">'+esc(u.name||'(이름 없음)')+'</td><td>'+sel+'</td><td>'+stBadge+'</td><td class="ac-td-sub">'+esc(u.company||'-')+'</td><td class="ac-td-sub">'+esc(u.email||'')+'</td><td class="ac-td-date">'+esc(_fmtDate(u.created_at))+'</td><td class="ac-td-acts">'+'<button class="ac-btn ac-btn-sm" onclick="event.stopPropagation();acUserForm(\''+esc(u.id)+'\')">수정</button> '+suspBtn+delBtn+'</td></tr>';
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
    /* 발견→처리: 상세에서 바로 조치 (어드민 계정은 정지 버튼 숨김·보호) */
    var _st=u.status||'active';
    var _acts='<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--bd);padding-top:14px;">'+
      '<button class="ac-btn ac-btn-sm" onclick="acUserForm(\''+esc(u.id)+'\')">수정 · 지점/팀 배정</button>'+
      (u.role==='admin' ? '' :
        (_st==='suspended'
          ? '<button class="ac-btn ac-btn-sm" onclick="acUserSuspend(\''+esc(u.id)+'\',false).then(_acDetailAfter)">정지 해제</button>'
          : '<button class="ac-btn ac-btn-sm" style="border-color:var(--warn);color:var(--warn)" onclick="acUserSuspend(\''+esc(u.id)+'\',true).then(_acDetailAfter)">정지</button>'))+
      '</div>';
    body.innerHTML=h+_acts;
  };
  window.acUserDetailClose=function(){ var ov=document.getElementById('ac-udetail-ov'); if(ov) ov.classList.remove('on'); };
  /* 상세 모달 액션 후 대시보드 갱신 (정지/해제 → 트리·KPI 즉시 반영) */
  window._acDetailAfter=function(){ acUserDetailClose(); if(window.acLoadDashboard) window.acLoadDashboard(); };

  // ── 지점 view — 테이블 + 행클릭 상세 + 활성토글/삭제(인원0) ──
  var _brCache={ list:[], cnt:{} };
  window.acLoadBranches = async function(){
    var area=document.getElementById('ac-branches-list'); if(!area) return;
    area.innerHTML='<div class="ac-skel-wrap"><div class="ac-skel"></div><div class="ac-skel"></div><div class="ac-skel"></div></div>';
    var bs=await _rows('branches?select=id,name,ga_org_name,is_active&order=name.asc');
    var us=await _rows('users?select=branch_id&status=eq.active');
    var cnt={}; us.forEach(function(u){ if(u.branch_id) cnt[u.branch_id]=(cnt[u.branch_id]||0)+1; });
    _brCache={ list:bs, cnt:cnt };
    var c=document.getElementById('ac-branches-count'); if(c) c.textContent=bs.length+'개';
    if(!bs.length){ area.innerHTML='<div class="ac-card-empty"><i data-lucide="building-2"></i>등록된 지점이 없습니다</div>'; if(window.lucide) window.lucide.createIcons(); return; }
    var body=bs.map(function(b){
      var n=cnt[b.id]||0;
      var stBadge=(b.is_active===false)?'<span class="ac-badge high">비활성</span>':'<span class="ac-badge st-active">활성</span>';
      var nCell=(n===0)?'<span style="color:var(--err);font-weight:700">0</span>':('<b>'+n+'</b>');
      var toggleBtn='<button class="ac-btn ac-btn-sm" onclick="event.stopPropagation();acBranchToggle(\''+esc(b.id)+'\','+(b.is_active===false?'true':'false')+')">'+(b.is_active===false?'활성화':'비활성')+'</button>';
      var delBtn=(n===0)?' <button class="ac-btn ac-btn-sm" style="border-color:var(--err);color:var(--err)" onclick="event.stopPropagation();acBranchDelete(\''+esc(b.id)+'\')">삭제</button>':'';
      return '<tr class="ac-tr-clk" onclick="acBranchDetail(\''+esc(b.id)+'\')"><td class="ac-td-name">'+esc(b.name)+'</td><td class="ac-td-sub">'+esc(b.ga_org_name||'-')+'</td><td style="text-align:center">'+nCell+'</td><td>'+stBadge+'</td><td class="ac-td-acts">'+'<button class="ac-btn ac-btn-sm" onclick="event.stopPropagation();acBranchForm(\''+esc(b.id)+'\')">수정</button> '+toggleBtn+delBtn+'</td></tr>';
    }).join('');
    area.innerHTML='<div class="ac-tbl-wrap"><table class="ac-tbl"><thead><tr><th>지점명</th><th>GA 조직</th><th>인원</th><th>상태</th><th>관리</th></tr></thead><tbody>'+body+'</tbody></table></div>';
    if(window.lucide) window.lucide.createIcons();
  };
  window.acBranchDetail=function(id){
    var L=_brCache.list||[], b=null; for(var i=0;i<L.length;i++){ if(String(L[i].id)===String(id)){ b=L[i]; break; } }
    if(!b) return;
    var n=_brCache.cnt[id]||0;
    var ov=document.getElementById('ac-udetail-ov');
    if(!ov){ ov=document.createElement('div'); ov.id='ac-udetail-ov'; ov.className='ac-udetail-ov'; document.body.appendChild(ov); }
    ov.innerHTML='<div class="ac-udetail-box"><button class="ac-udetail-x" onclick="acUserDetailClose()">✕</button>'
      +'<div class="ac-ud-title">'+esc(b.name)+'</div>'
      +'<div class="ac-ud-row"><span class="ac-ud-k">GA 조직</span><span class="ac-ud-v">'+esc(b.ga_org_name||'-')+'</span></div>'
      +'<div class="ac-ud-row"><span class="ac-ud-k">소속 인원</span><span class="ac-ud-v">'+n+'명</span></div>'
      +'<div class="ac-ud-row"><span class="ac-ud-k">상태</span><span class="ac-ud-v">'+(b.is_active===false?'비활성':'활성')+'</span></div>'
      +'<div class="ac-ud-row"><span class="ac-ud-k">ID</span><span class="ac-ud-v">'+esc(b.id)+'</span></div></div>';
    ov.onclick=function(e){ if(e.target===ov) acUserDetailClose(); };
    ov.classList.add('on');
  };
  window.acBranchToggle=async function(id, activate){
    try{
      var res=await window.db.fetch('/rest/v1/branches?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({is_active:!!activate})});
      if(!res.ok){ acToast((activate?'활성화':'비활성')+' 실패 ('+res.status+') — RLS 확인',true); return; }
      if(window.db.logActivity) window.db.logActivity('update_branch','branch',id,{is_active:!!activate});
      acToast(activate?'지점을 활성화했습니다':'지점을 비활성화했습니다');
      window.acLoadBranches();
    }catch(e){ acToast('네트워크 오류',true); }
  };
  window.acBranchDelete=async function(id){
    var L=_brCache.list||[], b=null; for(var i=0;i<L.length;i++){ if(String(L[i].id)===String(id)){ b=L[i]; break; } }
    var n=_brCache.cnt[id]||0;
    if(n>0){ acToast('소속 인원이 있는 지점은 삭제할 수 없습니다',true); return; }
    if(!confirm('"'+((b&&b.name)||'이 지점')+'"을(를) 삭제하시겠습니까?\n되돌릴 수 없습니다.')) return;
    try{
      var res=await window.db.fetch('/rest/v1/branches?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:{'Prefer':'return=minimal'}});
      if(!res.ok){ var m='삭제 실패 ('+res.status+')'; if(res.status===409) m+=' — 연관 데이터(FK)'; else if(res.status===403||res.status===401) m+=' — RLS 확인'; acToast(m,true); return; }
      if(window.db.logActivity) window.db.logActivity('delete_branch','branch',id,{name:(b&&b.name)||''});
      acToast('지점을 삭제했습니다');
      window.acLoadBranches();
    }catch(e){ acToast('네트워크 오류',true); }
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
      /* 댓글수 집계 — comments.post_id 전체 로드 후 게시글별 카운트 (조회수는 기록 컬럼 부재로 별도 트랙) */
      try{
        var _cms=await _rows('comments?select=post_id&limit=3000');
        var _cmap={}; _cms.forEach(function(c){ if(c.post_id) _cmap[c.post_id]=(_cmap[c.post_id]||0)+1; });
        _pState.cache.forEach(function(p){ p._cmt=_cmap[p.id]||0; });
      }catch(e){}
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
    var bodyHtml=slice.map(function(p){
      var hid=p.is_hidden?'<span class="ac-badge high">숨김</span>':'<span class="ac-badge st-active">표시</span>';
      var who=p.author_name||(p.author_id?('ID '+String(p.author_id).slice(0,8)):'작성자 미상');
      var hideBtn='<button class="ac-btn ac-btn-sm" onclick="event.stopPropagation();acHidePost(\''+esc(p.id)+'\','+(p.is_hidden?'false':'true')+')">'+(p.is_hidden?'해제':'숨김')+'</button>';
      var delBtn=' <button class="ac-btn ac-btn-sm" style="border-color:var(--err);color:var(--err)" onclick="event.stopPropagation();acDeletePost(\''+esc(p.id)+'\')">삭제</button>';
      var cmt=(p._cmt||0); var cmtCell=cmt>0?('<b>'+cmt+'</b>'):'<span style="color:var(--tf)">0</span>';
      return '<tr class="ac-tr-clk" onclick="acPostDetail(\''+esc(p.id)+'\')"><td class="ac-td-name">'+esc(p.title||'(제목 없음)')+'</td><td><span class="ac-badge medium">'+esc(BOARD_LABEL[p.board_type]||p.board_type||'')+'</span></td><td class="ac-td-sub">'+esc(who)+'</td><td style="text-align:center">'+cmtCell+'</td><td class="ac-td-date">'+esc(_fmtDate(p.created_at))+'</td><td>'+hid+'</td><td class="ac-td-acts">'+hideBtn+delBtn+'</td></tr>';
    }).join('');
    list.innerHTML='<div class="ac-tbl-wrap"><table class="ac-tbl"><thead><tr><th>제목</th><th>게시판</th><th>작성자</th><th>댓글</th><th>날짜</th><th>상태</th><th>관리</th></tr></thead><tbody>'+bodyHtml+'</tbody></table></div>';
    _renderPostPager(pages);
    if(window.lucide) window.lucide.createIcons();
  }
  // 행 클릭 → 게시글 상세(본문 전체). 공용 상세 모달(ac-udetail-ov) 재사용
  window.acPostDetail=function(id){
    var cc=_pState.cache||[], p=null; for(var i=0;i<cc.length;i++){ if(String(cc[i].id)===String(id)){ p=cc[i]; break; } }
    if(!p) return;
    var ov=document.getElementById('ac-udetail-ov');
    if(!ov){ ov=document.createElement('div'); ov.id='ac-udetail-ov'; ov.className='ac-udetail-ov'; document.body.appendChild(ov); }
    var who=p.author_name||(p.author_id?('ID '+String(p.author_id).slice(0,8)):'작성자 미상');
    var board=BOARD_LABEL[p.board_type]||p.board_type||'';
    var bodyTxt=esc(p.content||'(본문 없음)').replace(/\n/g,'<br>');
    ov.innerHTML='<div class="ac-udetail-box"><button class="ac-udetail-x" onclick="acUserDetailClose()">✕</button>'
      +'<div class="ac-ud-title">'+esc(p.title||'(제목 없음)')+'</div>'
      +'<div class="ac-ud-row"><span class="ac-ud-k">게시판</span><span class="ac-ud-v">'+esc(board)+'</span></div>'
      +'<div class="ac-ud-row"><span class="ac-ud-k">작성자</span><span class="ac-ud-v">'+esc(who)+'</span></div>'
      +'<div class="ac-ud-row"><span class="ac-ud-k">작성일</span><span class="ac-ud-v">'+esc(_fmtDate(p.created_at))+'</span></div>'
      +'<div class="ac-ud-row"><span class="ac-ud-k">상태</span><span class="ac-ud-v">'+(p.is_hidden?'숨김':'표시')+'</span></div>'
      +'<div class="ac-ud-row"><span class="ac-ud-k">댓글</span><span class="ac-ud-v">'+(p._cmt||0)+'개</span></div>'
      +'<div class="ac-pd-body">'+bodyTxt+'</div></div>';
    ov.onclick=function(e){ if(e.target===ov) acUserDetailClose(); };
    ov.classList.add('on');
  };
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
    var bodyHtml=slice.map(function(cm){
      var who=cm.author_name||(cm.author_id?('ID '+String(cm.author_id).slice(0,8)):'작성자 미상');
      var preview=esc((cm.content||'(내용 없음)').replace(/\s+/g,' ').slice(0,50));
      var pt=cm._pt?esc(cm._pt):'-';
      var delBtn='<button class="ac-btn ac-btn-sm" style="border-color:var(--err);color:var(--err)" onclick="event.stopPropagation();acDeleteComment(\''+esc(cm.id)+'\')">삭제</button>';
      return '<tr class="ac-tr-clk" onclick="acCmtDetail(\''+esc(cm.id)+'\')"><td class="ac-td-name">'+esc(who)+'</td><td class="ac-td-sub">'+preview+'</td><td class="ac-td-sub">'+pt+'</td><td class="ac-td-date">'+esc(_fmtDate(cm.created_at))+'</td><td class="ac-td-acts">'+delBtn+'</td></tr>';
    }).join('');
    list.innerHTML='<div class="ac-tbl-wrap"><table class="ac-tbl"><thead><tr><th>작성자</th><th>내용</th><th>소속글</th><th>날짜</th><th>관리</th></tr></thead><tbody>'+bodyHtml+'</tbody></table></div>';
    _renderCmtPager(pages);
    if(window.lucide) window.lucide.createIcons();
  }
  // 행 클릭 → 댓글 상세(본문 전체). 공용 모달 재사용
  window.acCmtDetail=function(id){
    var cc=_cState.cache||[], cm=null; for(var i=0;i<cc.length;i++){ if(String(cc[i].id)===String(id)){ cm=cc[i]; break; } }
    if(!cm) return;
    var ov=document.getElementById('ac-udetail-ov');
    if(!ov){ ov=document.createElement('div'); ov.id='ac-udetail-ov'; ov.className='ac-udetail-ov'; document.body.appendChild(ov); }
    var who=cm.author_name||(cm.author_id?('ID '+String(cm.author_id).slice(0,8)):'작성자 미상');
    var bodyTxt=esc(cm.content||'(내용 없음)').replace(/\n/g,'<br>');
    ov.innerHTML='<div class="ac-udetail-box"><button class="ac-udetail-x" onclick="acUserDetailClose()">✕</button>'
      +'<div class="ac-ud-title">댓글</div>'
      +'<div class="ac-ud-row"><span class="ac-ud-k">작성자</span><span class="ac-ud-v">'+esc(who)+'</span></div>'
      +'<div class="ac-ud-row"><span class="ac-ud-k">소속글</span><span class="ac-ud-v">'+esc(cm._pt||'-')+'</span></div>'
      +'<div class="ac-ud-row"><span class="ac-ud-k">작성일</span><span class="ac-ud-v">'+esc(_fmtDate(cm.created_at))+'</span></div>'
      +'<div class="ac-pd-body">'+bodyTxt+'</div></div>';
    ov.onclick=function(e){ if(e.target===ov) acUserDetailClose(); };
    ov.classList.add('on');
  };
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
    var isScr=(_libFilter==='scripts');
    var body=rows.map(function(r){
      return '<tr class="ac-tr-clk" onclick="acLibDetail(\''+esc(r.id)+'\')"><td class="ac-td-name">'+esc(r.title||'(제목 없음)')+'</td>'+(isScr?'<td class="ac-td-sub">'+esc(r.stage||'-')+'</td>':'')+'<td class="ac-td-date">'+esc(_fmtDate(r.created_at))+'</td></tr>';
    }).join('');
    area.innerHTML='<div class="ac-tbl-wrap"><table class="ac-tbl"><thead><tr><th>제목</th>'+(isScr?'<th>스테이지</th>':'')+'<th>날짜</th></tr></thead><tbody>'+body+'</tbody></table></div>';
    if(window.lucide) window.lucide.createIcons();
  }
  // 행 클릭 → 자료/스크립트 상세 (개별 select * + 본문). 공용 모달 재사용
  window.acLibDetail=async function(id){
    var isScr=(_libFilter==='scripts'), tbl=isScr?'scripts':'library';
    var ov=document.getElementById('ac-udetail-ov');
    if(!ov){ ov=document.createElement('div'); ov.id='ac-udetail-ov'; ov.className='ac-udetail-ov'; document.body.appendChild(ov); }
    ov.innerHTML='<div class="ac-udetail-box"><button class="ac-udetail-x" onclick="acUserDetailClose()">✕</button><div id="ac-udetail-body"><div class="ac-card-empty">불러오는 중…</div></div></div>';
    ov.onclick=function(e){ if(e.target===ov) acUserDetailClose(); };
    ov.classList.add('on');
    var r=null; try{ var rs=await _rows(tbl+'?id=eq.'+encodeURIComponent(id)+'&select=*'); r=rs&&rs[0]; }catch(e){}
    var b=document.getElementById('ac-udetail-body'); if(!b) return;
    if(!r){ b.innerHTML='<div class="ac-card-empty">찾을 수 없습니다.</div>'; return; }
    function row(k,v){ return (v==null||v==='')?'':'<div class="ac-ud-row"><span class="ac-ud-k">'+esc(k)+'</span><span class="ac-ud-v">'+esc(String(v))+'</span></div>'; }
    var bodyTxt=isScr?esc(r.script_text||'').replace(/\n/g,'<br>'):esc(r.memo_text||r.description||'').replace(/\n/g,'<br>');
    var h='<div class="ac-ud-title">'+esc(r.title||'(제목 없음)')+'</div>';
    if(isScr){ h+=row('스테이지',r.stage); }
    else { h+=row('설명',r.description); h+=row('링크',r.link_url); h+=row('파일',r.file_url); }
    h+=row('키워드',(r.keywords&&r.keywords.join)?r.keywords.join(', '):r.keywords);
    h+=row('작성일',_fmtDate(r.created_at));
    if(bodyTxt) h+='<div class="ac-pd-body">'+bodyTxt+'</div>';
    b.innerHTML=h;
  };

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

  // ════ 운영 관제센터 (전국 상황판 + 조직 트리 + 드릴다운) — 2026-06-15 ════
  //  · 전부 실데이터(users·branches·activity_logs). 추측 없음. RLS상 admin 전체 조회.
  //  · 건강도 색 = 인원수 기준 1차(0=빨강·<3=노랑·그외 녹색). 활동 가중 건강도는 후속.
  var _CT = { branches:[], byBranch:{}, usersAll:[], lastSeen:{} };
  function _ctMc(l,v){ return '<div class="act-mc"><div class="l">'+l+'</div><div class="v">'+(v==null?'—':Number(v).toLocaleString())+'</div></div>'; }
  function _ctHealth(n){ if(!n) return 'r'; if(n<3) return 'y'; return 'g'; }
  function _ctDate(iso){ if(typeof _fmtDate==='function') return _fmtDate(iso); return iso?String(iso).slice(0,10):'-'; }

  function renderBoard(d){
    var el=document.getElementById('ac-board'); if(!el) return;
    el.classList.remove('ac-card-empty');
    function kpi(cls,lab,num,unit,delta,sec){
      var on = sec ? ' onclick="acGoSec(\''+sec+'\')" style="cursor:pointer"' : '';
      return '<div class="act-kpi '+cls+'"'+on+'><div class="l">'+esc(lab)+'</div>'+
        '<div class="n">'+(num==null?'—':Number(num).toLocaleString())+(unit?'<small>'+unit+'</small>':'')+'</div>'+
        (delta?'<div class="d">'+esc(delta)+'</div>':'')+'</div>';
    }
    var actPct = (d.total>0) ? Math.round((d.today/d.total)*100)+'% 활성' : '';
    el.innerHTML =
      kpi('', '총 사용자', d.total, '명', d.newToday>0?('▲ '+d.newToday+' 오늘 신규'):'', 'users') +
      kpi('', '오늘 접속', d.today, '명', actPct, 'logs') +
      kpi('', '활성 지점', d.activeBr, '개', d.totalBr?('전체 '+d.totalBr):'', 'branches') +
      kpi(d.riskBr>0?'alert':'', '위험 지점', d.riskBr, '개', '인원 0', 'branches') +
      kpi((d.unassigned>0||d.unclassified>0)?'warn':'', '미배정', d.unassigned, '명', (d.unclassified>0?('지점없음 · 역할 미분류 '+d.unclassified):'지점 없음'), 'users') +
      kpi(d.pending>0?'warn':'', '승인 대기', d.pending, '건', (d.pendingOther>0?('원수사 '+d.pendingIns+' · 기타 '+d.pendingOther):''), 'approvals');
  }

  function _ctTeams(arr){  // 지점 인원 → 팀(text) 그룹 (빈 팀명 제외)
    var m={}; (arr||[]).forEach(function(u){ var t=(u.team||'').trim(); if(t){ (m[t]=m[t]||[]).push(u); } }); return m;
  }
  function renderOrgTree(branches, byBranch){
    var el=document.getElementById('ac-org-tree'); if(!el) return;
    el.classList.remove('ac-card-empty');
    var html='<div class="act-node" data-bid="_all" onclick="acOrgPick(this.getAttribute(\'data-bid\'))"><span class="act-caret act-caret-hide"></span><span class="nm">원세컨드 전체</span><span class="sm">'+_CT.usersAll.length+'</span></div>';
    branches.forEach(function(b){
      var arr=byBranch[b.id]||[]; var hc=(b.is_active===false)?'o':_ctHealth(arr.length);
      var tmap=_ctTeams(arr); var tnames=Object.keys(tmap).sort(); var hasT=tnames.length>0;
      html+='<div class="act-node" data-bid="'+esc(b.id)+'" onclick="acOrgPick(this.getAttribute(\'data-bid\'))">'+
        '<span class="act-caret'+(hasT?'':' act-caret-hide')+'">&#9654;</span>'+
        '<span class="hp act-hp-'+hc+'"></span><span class="nm">'+esc(b.name||'(이름 없음)')+'</span><span class="sm">'+arr.length+'</span></div>';
      if(hasT){
        html+='<div class="act-children" data-parent="'+esc(b.id)+'">';
        tnames.forEach(function(t){
          html+='<div class="act-node child" data-bid="T|'+esc(b.id)+'|'+esc(t)+'" onclick="acOrgPick(this.getAttribute(\'data-bid\'))">'+
            '<span class="act-caret act-caret-hide"></span><span class="nm">'+esc(t)+'</span><span class="sm">'+tmap[t].length+'</span></div>';
        });
        html+='</div>';
      }
    });
    var un=byBranch['_none']||[];
    if(un.length) html+='<div class="act-node" data-bid="_none" onclick="acOrgPick(this.getAttribute(\'data-bid\'))"><span class="act-caret act-caret-hide"></span><span class="hp act-hp-o"></span><span class="nm">미배정</span><span class="sm">'+un.length+'</span></div>';
    el.innerHTML=html;
    var cnt=document.getElementById('ac-tree-cnt'); if(cnt) cnt.textContent='지점 '+branches.length;
  }

  window.acOrgPick = function(bid){
    var el=document.getElementById('ac-org-detail'); if(!el) return; el.classList.remove('ac-card-empty');
    var arr, name, crumb, isTeam=false;
    if(bid==='_all'){ arr=_CT.usersAll; name='원세컨드 전체'; crumb='전체 조직'; }
    else if(bid==='_none'){ arr=_CT.byBranch['_none']||[]; name='미배정 사용자'; crumb='지점 배정 필요'; }
    else if(bid.indexOf('T|')===0){
      isTeam=true; var ps=bid.split('|'); var brId=ps[1]; var tnm=ps.slice(2).join('|');
      var bb=_CT.branches.filter(function(x){return x.id===brId;})[0];
      arr=(_CT.byBranch[brId]||[]).filter(function(u){ return (u.team||'').trim()===tnm; });
      name=tnm; crumb=((bb&&bb.name)||'지점')+' · 팀';
    } else {
      var b=_CT.branches.filter(function(x){return x.id===bid;})[0];
      arr=_CT.byBranch[bid]||[]; name=(b&&b.name)||'지점'; crumb=(b&&b.ga_org_name)||'지점';
      var ch=document.querySelector('.act-children[data-parent="'+bid+'"]');  /* 지점 클릭 = 팀 펼침 토글 */
      if(ch){
        ch.classList.toggle('show');
        var nodes=document.querySelectorAll('#ac-org-tree .act-node');
        for(var z=0;z<nodes.length;z++){ if(nodes[z].getAttribute('data-bid')===bid){ nodes[z].classList.toggle('open', ch.classList.contains('show')); break; } }
      }
    }
    var ns=document.querySelectorAll('#ac-org-tree .act-node');
    for(var i=0;i<ns.length;i++) ns[i].classList.toggle('sel', ns[i].getAttribute('data-bid')===bid);

    var roleCnt={}; arr.forEach(function(u){ roleCnt[u.role]=(roleCnt[u.role]||0)+1; });
    var teamCnt=Object.keys(_ctTeams(arr)).length;
    var RL=window.ROLE_LABEL||{};
    var ls=_CT.lastSeen||{}, _now=Date.now(), _wk=7*86400000;
    var act7=0; arr.forEach(function(u){ var t=ls[u.id]; if(t && (_now-new Date(t).getTime())<_wk) act7++; });
    var rows=arr.slice(0,300).map(function(u){
      var ini=esc((u.name||'?').slice(0,2));
      var lsv=ls[u.id]; var stale=(!lsv)||((_now-new Date(lsv).getTime())>=_wk);
      var seen=lsv?_rel(lsv):'기록 없음';
      return '<tr class="ac-tr-clk" onclick="acUserDetail(\''+esc(u.id)+'\')"><td><span class="act-av">'+ini+'</span>'+esc(u.name||'(이름 없음)')+'</td>'+
        '<td><span class="act-role">'+esc(RL[u.role]||u.role||'-')+'</span></td>'+
        '<td>'+esc(u.team||'-')+'</td>'+
        '<td style="color:'+(stale?'var(--warn)':'var(--ts)')+'">'+esc(seen)+'</td>'+
        '<td style="color:var(--tf)">'+esc(_ctDate(u.created_at))+'</td></tr>';
    }).join('');
    var metaTeam = isTeam ? '' : '<span>팀 <b>'+teamCnt+'</b></span>';
    el.innerHTML =
      '<div class="act-p-hd"><div class="act-crumb">'+esc(crumb)+'</div><h2>'+esc(name)+'</h2>'+
        '<div class="act-meta"><span>인원 <b>'+arr.length+'</b></span>'+metaTeam+
        '<span>7일 활성 <b>'+act7+'</b></span>'+
        '<span>설계사 <b>'+(roleCnt['ga_member']||0)+'</b></span></div></div>'+
      '<div class="act-mini">'+
        _ctMc('인원', arr.length)+_ctMc('7일 활성', act7)+
        _ctMc('실장', roleCnt['ga_manager']||0)+_ctMc('지점장', roleCnt['ga_branch_manager']||0)+
      '</div>'+
      '<div style="padding:2px 20px 22px"><table class="act-tbl"><thead><tr><th>구성원</th><th>직책</th><th>팀</th><th>마지막 접속</th><th>가입</th></tr></thead><tbody>'+
        (rows||'<tr><td colspan="5" style="color:var(--tf);text-align:center;padding:24px">구성원이 없습니다</td></tr>')+
      '</tbody></table></div>';
  };

  window.acLoadDashboard = async function(){
    var [total, pendingAll, pendingIns, unassigned, newToday, unclassified, branches, users] = await Promise.all([
      _count('users?select=id'),
      _count('users?status=eq.pending&select=id'),
      _count('users?status=eq.pending&role=in.('+INSURER_ROLES+')&select=id'),
      _count('users?status=eq.active&branch_id=is.null&select=id'),
      _count('users?created_at=gte.'+_kstMidnightISO()+'&select=id'),
      _count('users?status=eq.active&role=not.in.('+ROLE_KEYS.join(',')+')&select=id'),
      _rows('branches?select=id,name,ga_org_name,is_active&order=name.asc'),
      _rows('users?select=id,name,role,status,branch_id,team,created_at&status=eq.active&order=created_at.desc&limit=2000')
    ]);
    var pendingOther = Math.max(0, (pendingAll||0) - (pendingIns||0));  /* 원수사 외 pending = GA·기타(승인 화면 미노출, 사용자 탭 처리) */
    // 최근 30일 로그인 → user별 마지막 접속(lastSeen) + 오늘 접속(distinct)
    var loginLogs=[];
    try{ loginLogs=await _rows('activity_logs?event_type=in.(login,login_admin)&created_at=gte.'+new Date(Date.now()-30*86400000).toISOString()+'&select=user_id,created_at&order=created_at.desc&limit=8000'); }catch(e){}
    var lastSeen={}, ts={}, _mid=_kstMidnightISO();
    loginLogs.forEach(function(l){
      if(!l.user_id) return;
      if(!lastSeen[l.user_id]) lastSeen[l.user_id]=l.created_at;  /* desc 정렬 → 첫 등장 = 최근 접속 */
      if(l.created_at>=_mid) ts[l.user_id]=1;
    });

    var byBranch={}; users.forEach(function(u){ var k=u.branch_id||'_none'; (byBranch[k]=byBranch[k]||[]).push(u); });
    _CT.branches=branches; _CT.byBranch=byBranch; _CT.usersAll=users; _CT.lastSeen=lastSeen;
    var activeBr=branches.filter(function(b){ return b.is_active!==false; }).length;
    var riskBr=branches.filter(function(b){ return !((byBranch[b.id]||[]).length); }).length;

    renderBoard({ total:total, today:Object.keys(ts).length, newToday:newToday,
      activeBr:activeBr, totalBr:branches.length, riskBr:riskBr, unassigned:unassigned,
      pending:pendingAll, pendingIns:pendingIns, pendingOther:pendingOther, unclassified:unclassified });
    renderOrgTree(branches, byBranch);
    acOrgPick('_all');

    // 보존 위젯
    await renderActivity(await _rows('activity_logs?select=id,user_id,event_type,severity,created_at&order=created_at.desc&limit=5'));
    if(window.acLoadSearchData) window.acLoadSearchData();

    // 승인 배지 동기화 (기존 의미 = 보험사 가입 승인)
    var nb=document.getElementById('ac-nav-badge-approvals');
    if(nb){ nb.textContent=pendingIns||0; nb.style.display=(pendingIns>0)?'inline-flex':'none'; }
    if(window._refreshAdminBadge) window._refreshAdminBadge(pendingIns);
    if(window.lucide) window.lucide.createIcons();
  };

  // ── 검색 데이터 현황 (OCR·통합검색·지식엔진 진행률을 눈으로) — 2026-06-14 ──
  function _nz(x){ return (x==null)?'—':Number(x).toLocaleString(); }
  function _sdStat(label, valStr, sub){
    return '<div class="ac-stat"><div class="ac-stat-label">'+label+'</div>'+
      '<div class="ac-stat-value">'+valStr+'</div>'+
      (sub?'<div style="font-size:11px;color:var(--tf);margin-top:3px;line-height:1.4;">'+sub+'</div>':'')+'</div>';
  }
  function renderSearchData(d){
    var el=document.getElementById('ac-search-data'); if(!el) return;
    el.classList.remove('ac-card-empty');
    var mined = d.lastMined ? String(d.lastMined).slice(0,10) : '기록 없음';
    var minedBadge = d.lastMined ? '' : ' <span class="ac-badge high">정지</span>';
    var nlSub = [ (d.nlPending? d.nlPending+'건 분석 대기':''), (d.nlFail? d.nlFail+'건 실패':'') ].filter(Boolean).join(' · ');
    var fSub  = [ (d.fPending? d.fPending+'건 분석 대기':''), (d.fSkip? d.fSkip+'건 제외(office)':'') ].filter(Boolean).join(' · ');
    var kSub  = (d.kQueue? d.kQueue+'건 검수 대기':'검수 대기 0');
    el.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;">'+
      _sdStat('소식지 본문화', _nz(d.nlText)+' / '+_nz(d.nlTotal), nlSub)+
      _sdStat('자료실 색인',   _nz(d.fDone)+' / '+_nz(d.fTotal),  fSub)+
      _sdStat('지식엔진 승인', _nz(d.kApproved), kSub)+'</div>'+
      '<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--bd);font-size:12px;color:var(--tf);">'+
        '마지막 채굴: <b style="color:var(--ts);">'+mined+'</b>'+minedBadge+'</div>';
  }
  window.acLoadSearchData = async function(){
    var T=encodeURIComponent('텍스트'), E=encodeURIComponent('비었음');
    var c = await Promise.all([
      _count('newsletters?select=id'),                                                  /* 0 nlTotal */
      _count('newsletters?text_quality=eq.'+T+'&select=id'),                            /* 1 nlText */
      _count('newsletters?text_quality=eq.'+E+'&select=id'),                            /* 2 nlFail */
      _count('newsletters?full_text=is.null&source_path=not.is.null&select=id'),        /* 3 nlPending(원본있음 대기) */
      _count('myspace_files?deleted_at=is.null&select=id'),                             /* 4 fTotal */
      _count('myspace_files?ocr_status=eq.done&deleted_at=is.null&select=id'),          /* 5 fDone */
      _count('myspace_files?ocr_status=is.null&deleted_at=is.null&select=id'),          /* 6 fPending */
      _count('myspace_files?ocr_status=eq.skip&deleted_at=is.null&select=id'),          /* 7 fSkip */
      _count('knowledge_entries?status=eq.approved&select=id'),                         /* 8 kApproved */
      _count('knowledge_entries?status=eq.ai_draft&select=id')                          /* 9 kQueue */
    ]);
    var runs=[]; try{ runs=await _rows('knowledge_extract_runs?select=created_at&order=created_at.desc&limit=1'); }catch(e){}
    renderSearchData({
      nlTotal:c[0], nlText:c[1], nlFail:c[2], nlPending:c[3],
      fTotal:c[4], fDone:c[5], fPending:c[6], fSkip:c[7],
      kApproved:c[8], kQueue:c[9],
      lastMined:(runs&&runs[0])?runs[0].created_at:null
    });
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
    visibility:'acLoadVisibility', rls:'acLoadRlsOverview', logs:'acLoadLogs',
    menu:'acLoadMenu', notice:'acLoadNotice', settings:'acLoadSettings' };
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

  // ════════════════════════════════════════════════════════════════════
  //  시스템 — 메뉴(role 매트릭스) · 공지·배너 · 설정 (2026-06-12)
  //  · 어드민 도구: app_settings / menu_settings_by_role 읽기·편집·저장(라운드트립)
  //  · 라이브 SPA(app.html) 홈배너·사이드바 메뉴 소비처 배선은 별도 트랙(백로그).
  //  · 가드1: 값 표기법(on/off vs true/false)은 키별 원형 보존 — 임의 통일 금지.
  //  · 가드2: app_settings.menu_b(전역 메뉴)와 menu_settings_by_role(role 매트릭스)는 별개 — 섹션 분리.
  // ════════════════════════════════════════════════════════════════════
  var _SYS_NOTE='<div class="ac-sys-note">⚙️ 어드민 제어값입니다. 저장 시 즉시 반영되고 콘솔 재진입 시 유지됩니다. (라이브 홈/메뉴 화면 자동 반영은 추후 소비처 연결 트랙)</div>';
  var MENU_KEY_LABELS={ menu_home:'홈', menu_scripts:'스크립트', menu_board:'게시판', menu_myspace:'MY SPACE', menu_news:'보험이슈', menu_quick:'Quick', menu_together:'함께해요', menu_team_mgmt:'팀원관리' };
  var APP_SETTING_LABELS={
    banner_text:'홈 배너 문구', banner_visible:'홈 배너 표시',
    banner_img_home:'홈 배너 이미지', banner_img_board:'게시판 배너 이미지', banner_img_myspace:'MY SPACE 배너 이미지',
    banner_img_news:'보험이슈 배너 이미지', banner_img_scripts:'스크립트 배너 이미지', banner_img_together:'함께해요 배너 이미지',
    board_company:'보험사 게시판', board_hub:'허브 게시판', board_notice:'공지 게시판', board_qa_product:'상품 Q&A', board_qa_underwriting:'인수 Q&A',
    board_tab_company:'보험사 탭', board_tab_hub:'허브 탭',
    feature_quickaction:'빠른 실행 기능', gate_quick_a2:'Quick 게이트(A2)', gate_search_a2:'검색 게이트(A2)',
    menu_home:'메뉴: 홈', menu_board:'메뉴: 게시판', menu_myspace:'메뉴: MY SPACE', menu_news:'메뉴: 보험이슈', menu_quick:'메뉴: Quick', menu_scripts:'메뉴: 스크립트', menu_together:'메뉴: 함께해요',
    hub_public:'허브 공개', insurer_unified_view:'보험사 통합 뷰', manager_lounge_enabled:'매니저 라운지', ops_calendar:'운영 캘린더', qna_visible:'Q&A 노출', ops_console:'운영 콘솔'
  };
  var APP_GROUP_LABELS={
    banner:'홈 배너', page_banner:'페이지별 배너 이미지',
    board_visibility:'게시판 노출', board_tab:'게시판 탭', feature_gate:'기능 게이트', gate:'게이트(A2)',
    operations:'운영', menu_b:'전역 메뉴 (구 시스템 · role 매트릭스와 별개)', '':'기타'
  };
  function _setIsBool(v){ return v==='true'||v==='false'||v==='on'||v==='off'; }
  function _setOn(v){ return v==='true'||v==='on'; }
  function _setWrite(oldVal,on){ if(oldVal==='on'||oldVal==='off') return on?'on':'off'; return on?'true':'false'; }  /* 가드1: 표기법 보존 */
  function _nowIso(){ return new Date().toISOString(); }

  // ── 메뉴 — role × menu_key 가시성 매트릭스 (menu_settings_by_role) ──
  var _menuMatrix=null, _menuKeys=[];
  var _MENU_ROLES=['admin','ga_branch_manager','ga_manager','ga_member','ga_staff','insurer_branch_manager','insurer_manager','insurer_member','insurer_staff'];
  window.acLoadMenu = async function(){
    var area=document.getElementById('ac-sec-menu-body'); if(!area) return;
    area.innerHTML='<div class="ac-skel-wrap"><div class="ac-skel"></div><div class="ac-skel"></div></div>';
    var rows=await _rows('menu_settings_by_role?select=role,menu_key,is_visible,display_order&order=display_order.asc,role.asc');
    var m={}, ord={};
    rows.forEach(function(r){ if(!m[r.role]) m[r.role]={}; m[r.role][r.menu_key]={v:r.is_visible===true}; if(ord[r.menu_key]==null) ord[r.menu_key]=(r.display_order==null?99:r.display_order); });
    _menuKeys=Object.keys(ord).sort(function(a,b){ return ord[a]-ord[b]; });
    _menuMatrix=m;
    _renderMenuMatrix();
  };
  function _renderMenuMatrix(){
    var area=document.getElementById('ac-sec-menu-body'); if(!area) return;
    if(!_menuKeys.length){ area.innerHTML=_SYS_NOTE+'<div class="ac-card-empty">메뉴 설정 행이 없습니다.</div>'; return; }
    var RL=window.ROLE_LABEL||{};
    var head='<th>역할 \\ 메뉴</th>'+_menuKeys.map(function(k){ return '<th style="text-align:center">'+esc(MENU_KEY_LABELS[k]||k)+'</th>'; }).join('');
    var body=_MENU_ROLES.map(function(role){
      var cells=_menuKeys.map(function(k){
        var cell=_menuMatrix[role]&&_menuMatrix[role][k];
        if(!cell) return '<td style="text-align:center;color:var(--tf)">—</td>';
        var on=cell.v;
        return '<td style="text-align:center"><button class="ac-mtog'+(on?' on':'')+'" onclick="acMenuToggle(\''+role+'\',\''+k+'\','+(on?'false':'true')+',this)">'+(on?'✓':'·')+'</button></td>';
      }).join('');
      return '<tr><td class="ac-td-name" style="color:var(--tp)">'+esc(RL[role]||role)+'</td>'+cells+'</tr>';
    }).join('');
    area.innerHTML=_SYS_NOTE
      +'<p style="font-size:12px;color:var(--ts);margin-bottom:10px">칸 클릭 = 즉시 저장. 9역할 × '+_menuKeys.length+'메뉴 · <b>menu_settings_by_role</b>.</p>'
      +'<div class="ac-tbl-wrap"><table class="ac-tbl ac-mtx"><thead><tr>'+head+'</tr></thead><tbody>'+body+'</tbody></table></div>';
  }
  window.acMenuToggle=async function(role,menuKey,toOn,btn){
    var nv=(String(toOn)==='true');
    try{
      var res=await window.db.fetch('/rest/v1/menu_settings_by_role?role=eq.'+encodeURIComponent(role)+'&menu_key=eq.'+encodeURIComponent(menuKey),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({is_visible:nv,updated_at:_nowIso()})});
      if(!res.ok){ acToast('저장 실패 ('+res.status+') — menu_settings_by_role RLS 확인',true); return; }
      if(_menuMatrix[role]&&_menuMatrix[role][menuKey]) _menuMatrix[role][menuKey].v=nv;
      if(btn){ btn.classList.toggle('on',nv); btn.textContent=nv?'✓':'·'; btn.setAttribute('onclick','acMenuToggle(\''+role+'\',\''+menuKey+'\','+(nv?'false':'true')+',this)'); }
      if(window.db.logActivity) window.db.logActivity('update_menu_visibility','menu',role+'/'+menuKey,{is_visible:nv});
      acToast('저장했습니다');
    }catch(e){ acToast('네트워크 오류',true); }
  };

  // ── 공지·배너 — app_settings (banner + page_banner) ──
  window.acLoadNotice = async function(){
    var area=document.getElementById('ac-sec-notice-body'); if(!area) return;
    area.innerHTML='<div class="ac-skel-wrap"><div class="ac-skel"></div><div class="ac-skel"></div></div>';
    var rows=await _rows("app_settings?select=group_name,key,label,value&or=(group_name.eq.banner,group_name.eq.page_banner)&order=group_name.desc,key.asc");
    area.innerHTML=_SYS_NOTE+_renderSettingRows(rows,{banner_visible:'bool'});  /* banner_text·banner_img_*=text(자동), banner_visible=bool */
    if(window.lucide) window.lucide.createIcons();
  };

  // ── 설정 — app_settings (운영 토글群). menu_b(전역 메뉴)는 role 매트릭스와 별개로 별도 그룹 표시(가드2) ──
  var _SETTINGS_GROUPS=['board_visibility','board_tab','feature_gate','gate','operations','menu_b'];
  window.acLoadSettings = async function(){
    var area=document.getElementById('ac-sec-settings-body'); if(!area) return;
    area.innerHTML='<div class="ac-skel-wrap"><div class="ac-skel"></div><div class="ac-skel"></div></div>';
    var orFilter='or=('+_SETTINGS_GROUPS.map(function(g){ return 'group_name.eq.'+g; }).join(',')+',key.eq.ops_console)';
    var rows=await _rows("app_settings?select=group_name,key,label,value&"+orFilter+"&order=group_name.asc,key.asc");
    area.innerHTML=_SYS_NOTE+_renderSettingRows(rows,{});  /* 전부 bool 자동 판별 */
    if(window.lucide) window.lucide.createIcons();
  };

  // 공통 렌더 — group_name별 묶음, 키별 타입(bool 토글 / text 입력). typeHint로 강제 가능
  function _renderSettingRows(rows, typeHint){
    if(!rows||!rows.length) return '<div class="ac-card-empty">설정 항목이 없습니다.</div>';
    var groups={}, order=[];
    rows.forEach(function(r){ var g=r.group_name||''; if(!groups[g]){ groups[g]=[]; order.push(g); } groups[g].push(r); });
    return order.map(function(g){
      var inner=groups[g].map(function(r){
        var lbl=APP_SETTING_LABELS[r.key]||r.label||r.key;
        var t=typeHint[r.key]||(_setIsBool(r.value)?'bool':'text');
        if(t==='bool'){
          var on=_setOn(r.value);
          return '<div class="ac-set-row"><span class="ac-set-lbl">'+esc(lbl)+'</span>'
            +'<button class="ac-mtog'+(on?' on':'')+'" onclick="acSettingToggle(\''+esc(r.key)+'\',\''+esc(r.value)+'\','+(on?'false':'true')+',this)">'+(on?'ON':'OFF')+'</button></div>';
        }
        return '<div class="ac-set-row"><span class="ac-set-lbl">'+esc(lbl)+'</span>'
          +'<span class="ac-set-edit"><input class="ac-set-input" id="set-in-'+esc(r.key)+'" value="'+esc(r.value==null?'':r.value)+'" placeholder="(비어 있음)">'
          +'<button class="ac-btn ac-btn-sm" onclick="acSettingSaveText(\''+esc(r.key)+'\')">저장</button></span></div>';
      }).join('');
      return '<div class="ac-set-grp"><div class="ac-set-grp-h">'+esc(APP_GROUP_LABELS[g]||g)+'</div>'+inner+'</div>';
    }).join('');
  }
  window.acSettingToggle=async function(key, oldVal, toOn, btn){
    var nv=(String(toOn)==='true'), writeVal=_setWrite(oldVal,nv);
    try{
      var res=await window.db.fetch('/rest/v1/app_settings?key=eq.'+encodeURIComponent(key),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({value:writeVal,updated_at:_nowIso()})});
      if(!res.ok){ acToast('저장 실패 ('+res.status+') — app_settings RLS 확인',true); return; }
      if(btn){ btn.classList.toggle('on',nv); btn.textContent=nv?'ON':'OFF'; btn.setAttribute('onclick','acSettingToggle(\''+key+'\',\''+writeVal+'\','+(nv?'false':'true')+',this)'); }
      if(window.db.logActivity) window.db.logActivity('update_setting','app_settings',key,{value:writeVal});
      acToast('저장했습니다');
    }catch(e){ acToast('네트워크 오류',true); }
  };
  window.acSettingSaveText=async function(key){
    var inp=document.getElementById('set-in-'+key); if(!inp) return;
    var val=inp.value;
    try{
      var res=await window.db.fetch('/rest/v1/app_settings?key=eq.'+encodeURIComponent(key),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify({value:val,updated_at:_nowIso()})});
      if(!res.ok){ acToast('저장 실패 ('+res.status+') — app_settings RLS 확인',true); return; }
      if(window.db.logActivity) window.db.logActivity('update_setting','app_settings',key,{});
      acToast('저장했습니다');
    }catch(e){ acToast('네트워크 오류',true); }
  };

  // ════════════════════════════════════════════════════════════════════
  //  지점·사용자 입력폼 (2026-06-12) — STEP 3/4
  //  · 지점: 추가(C)+수정(U). 삭제는 별도 가드 트랙.
  //  · 사용자: 수정(U)만. 추가(C)=초대+회원가입 위저드 별도 트랙(유령계정 방지) → 추가 버튼 미노출.
  //  · 컬럼: branches(name,ga_org_name,is_active) / users 프로필(name,phone,company,branch_id) — 코드 실측 기준.
  //  · 하드코딩 0: placeholder에 특정 지점·보험사명 금지.
  // ════════════════════════════════════════════════════════════════════
  function _acFormOv(){
    var ov=document.getElementById('ac-form-ov');
    if(!ov){ ov=document.createElement('div'); ov.id='ac-form-ov'; ov.className='ac-udetail-ov'; ov.onclick=function(e){ if(e.target===ov) acFormClose(); }; document.body.appendChild(ov); }
    return ov;
  }
  window.acFormClose=function(){ var ov=document.getElementById('ac-form-ov'); if(ov) ov.classList.remove('on'); };
  function _field(id,label,val,opts){
    opts=opts||{};
    var req=opts.req?' <span class="ac-form-req">*</span>':'';
    if(opts.select){
      var o=opts.select.map(function(x){ return '<option value="'+esc(x.v)+'"'+(String(x.v)===String(val==null?'':val)?' selected':'')+'>'+esc(x.t)+'</option>'; }).join('');
      return '<div class="ac-form-field"><label>'+esc(label)+req+'</label><select id="'+id+'">'+o+'</select></div>';
    }
    var ph=opts.ph?(' placeholder="'+esc(opts.ph)+'"'):'';
    return '<div class="ac-form-field"><label>'+esc(label)+req+'</label><input id="'+id+'" value="'+esc(val==null?'':val)+'"'+ph+'></div>';
  }

  // ── 지점 추가/수정 ──
  window.acBranchForm=function(id){
    var isEdit=(id!=null), b=null;
    if(isEdit){ var L=_brCache.list||[]; for(var i=0;i<L.length;i++){ if(String(L[i].id)===String(id)){ b=L[i]; break; } } if(!b){ acToast('지점을 찾을 수 없습니다',true); return; } }
    var ov=_acFormOv();
    ov.innerHTML='<div class="ac-udetail-box"><button class="ac-udetail-x" onclick="acFormClose()">✕</button>'
      +'<div class="ac-ud-title">'+(isEdit?'지점 수정':'지점 추가')+'</div>'
      +_field('bf-name','지점명',b?b.name:'',{req:true,ph:'지점 이름'})
      +_field('bf-org','GA 조직',b?b.ga_org_name:'',{ph:'소속 GA 조직명'})
      +(isEdit?_field('bf-active','활성 상태',(b.is_active===false?'false':'true'),{select:[{v:'true',t:'활성'},{v:'false',t:'비활성'}]}):'')
      +'<div class="ac-form-err" id="bf-err"></div>'
      +'<div class="ac-form-actions"><button class="ac-btn" onclick="acFormClose()">취소</button>'
      +'<button class="ac-btn ac-btn-primary" onclick="acBranchSave('+(isEdit?("'"+esc(String(id))+"'"):'null')+')">'+(isEdit?'저장':'추가')+'</button></div></div>';
    ov.classList.add('on');
    var nm=document.getElementById('bf-name'); if(nm) nm.focus();
  };
  window.acBranchSave=async function(id){
    var isEdit=(id!=null);
    var name=((document.getElementById('bf-name')||{}).value||'').trim();
    var org=((document.getElementById('bf-org')||{}).value||'').trim();
    var err=document.getElementById('bf-err');
    if(!name){ if(err) err.textContent='지점명을 입력해주세요.'; return; }
    var payload={ name:name, ga_org_name:org||null };
    try{
      var res;
      if(isEdit){
        var actEl=document.getElementById('bf-active'); if(actEl) payload.is_active=(actEl.value==='true');
        res=await window.db.fetch('/rest/v1/branches?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(payload)});
      } else {
        payload.is_active=true;
        res=await window.db.fetch('/rest/v1/branches',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(payload)});
      }
      if(!res.ok){ var m='저장 실패 ('+res.status+')'; if(res.status===403||res.status===401) m+=' — branches RLS 확인'; else if(res.status===400) m+=' — 필수 컬럼/형식 확인'; if(err) err.textContent=m; return; }
      if(window.db.logActivity) window.db.logActivity(isEdit?'update_branch':'create_branch','branch',id||name,{name:name});
      acToast(isEdit?'지점을 수정했습니다':'지점을 추가했습니다');
      acFormClose();
      if(window.acLoadBranches) window.acLoadBranches();
    }catch(e){ if(err) err.textContent='네트워크 오류'; }
  };

  // ── 사용자 수정 (Update only — 추가는 별도 트랙). 권한·상태·이메일은 여기서 변경 안 함(전용 컨트롤·auth 연결) ──
  window.acUserForm=async function(id){
    var ov=_acFormOv();
    ov.innerHTML='<div class="ac-udetail-box"><div class="ac-card-empty">불러오는 중…</div></div>'; ov.classList.add('on');
    var u=null; try{ var rs=await _rows('users?id=eq.'+encodeURIComponent(id)+'&select=id,name,phone,company,branch_id,role,email'); u=rs&&rs[0]; }catch(e){}
    if(!u){ ov.innerHTML='<div class="ac-udetail-box"><button class="ac-udetail-x" onclick="acFormClose()">✕</button><div class="ac-card-empty">사용자를 찾을 수 없습니다.</div></div>'; return; }
    var brOpts=[{v:'',t:'(미지정)'}];
    try{ var bs=await _rows('branches?select=id,name,ga_org_name&order=name.asc'); (bs||[]).forEach(function(b){ brOpts.push({v:b.id,t:(b.name||'')+(b.ga_org_name?(' · '+b.ga_org_name):'')}); }); }catch(e){}
    var RL=window.ROLE_LABEL||{};
    ov.innerHTML='<div class="ac-udetail-box"><button class="ac-udetail-x" onclick="acFormClose()">✕</button>'
      +'<div class="ac-ud-title">사용자 수정</div>'
      +'<p style="font-size:12px;color:var(--tf);margin:-6px 0 12px">'+esc(u.email||'')+' · '+esc(RL[u.role]||u.role||'미분류')+' <span style="color:var(--tf)">(권한·상태·이메일은 여기서 변경 안 함)</span></p>'
      +_field('uf-name','이름',u.name,{req:true})
      +_field('uf-phone','전화',u.phone,{ph:'연락처'})
      +_field('uf-company','소속/회사',u.company,{ph:'소속 회사명'})
      +_field('uf-branch','지점',u.branch_id,{select:brOpts})
      +'<div class="ac-form-err" id="uf-err"></div>'
      +'<div class="ac-form-actions"><button class="ac-btn" onclick="acFormClose()">취소</button>'
      +'<button class="ac-btn ac-btn-primary" onclick="acUserSave(\''+esc(String(id))+'\')">저장</button></div></div>';
    var nm=document.getElementById('uf-name'); if(nm) nm.focus();
  };
  window.acUserSave=async function(id){
    var g=function(x){ var el=document.getElementById(x); return el?el.value:''; };
    var name=(g('uf-name')||'').trim();
    var err=document.getElementById('uf-err');
    if(!name){ if(err) err.textContent='이름을 입력해주세요.'; return; }
    var payload={ name:name, phone:(g('uf-phone')||'').trim()||null, company:(g('uf-company')||'').trim()||null, branch_id:g('uf-branch')||null };
    try{
      var res=await window.db.fetch('/rest/v1/users?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(payload)});
      if(!res.ok){ var m='저장 실패 ('+res.status+')'; if(res.status===403||res.status===401) m+=' — users RLS 확인'; else if(res.status===400) m+=' — 형식 확인(지점)'; if(err) err.textContent=m; return; }
      if(window.db.logActivity) window.db.logActivity('update_user_profile','user',id,{name:name});
      acToast('사용자 정보를 수정했습니다');
      acFormClose();
      if(window.acLoadUsers) window.acLoadUsers(true);
    }catch(e){ if(err) err.textContent='네트워크 오류'; }
  };
})();
