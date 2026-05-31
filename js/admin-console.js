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
    delete_comment:'댓글을 삭제했습니다', update_menu:'메뉴 설정을 변경했습니다',
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
    if(s>0) items.push(['critical','CRITICAL','24시간 초과 미처리 승인 '+s+'건']);
    if(u>0) items.push(['high','HIGH','지점 미배정 사용자 '+u+'명']);
    if(p>0) items.push(['medium','MEDIUM','승인 대기 '+p+'건']);
    if(!items.length){ el.innerHTML='<div class="ac-card-empty"><i data-lucide="shield-check"></i>현재 위험 신호 없음</div>'; return; }
    el.innerHTML=items.map(function(i){
      return '<div class="ac-risk-row"><span class="ac-badge '+i[0]+'">'+i[1]+'</span><span>'+esc(i[2])+'</span></div>';
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
  function _stat(l,v){ return '<div class="ac-stat"><div class="ac-stat-label">'+l+'</div>'+
    '<div class="ac-stat-value">'+(v==null?'—':Number(v).toLocaleString())+'</div></div>'; }
  function renderService(total,active,nt,posts,scripts,lib){
    var el=document.getElementById('ac-service-overview'); if(!el) return;
    el.classList.remove('ac-card-empty');
    el.innerHTML='<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">'+
      _stat('총 사용자',total)+_stat('활성',active)+_stat('오늘 신규',nt)+
      _stat('게시글',posts)+_stat('스크립트',scripts)+_stat('자료',lib)+'</div>';
  }
  function renderBranches(branches,users,unassigned){
    var el=document.getElementById('ac-branch-overview'); if(!el) return;
    el.classList.remove('ac-card-empty');
    var cnt={}; (users||[]).forEach(function(u){ if(u.branch_id) cnt[u.branch_id]=(cnt[u.branch_id]||0)+1; });
    var rows=(branches||[]).map(function(b){
      var n=cnt[b.id]||0;
      var badge=(n===0)?' <span class="ac-badge high">인원 0</span>':'';
      return '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--bd);">'+
        '<span>'+esc(b.name)+' <span style="color:var(--tf);font-size:12px;">'+esc(b.ga_org_name||'')+'</span></span>'+
        '<span>'+n+'명'+badge+'</span></div>';
    }).join('');
    el.innerHTML='<div style="margin-bottom:8px;color:var(--tf);font-size:12px;">전체 '+
      (branches?branches.length:0)+'개 지점 · 미배정 '+(unassigned==null?'—':unassigned)+'명</div>'+
      (rows || '<div class="ac-card-empty">지점 없음</div>');
  }

  // ── 사용자 view (role 배지 + 칩 필터 + 카드 그리드) ──
  var _usersAll=[], _usersFilter='all';
  function _rgrp(r){ return r==='admin' ? 'admin' : ((r && r.indexOf('insurer_')===0) ? 'insurer' : 'ga'); }
  window.acLoadUsers = async function(){
    var area=document.getElementById('ac-users-list'); if(!area) return;
    area.innerHTML='<div class="ac-skel-wrap"><div class="ac-skel"></div><div class="ac-skel"></div><div class="ac-skel"></div></div>';
    _usersAll = await _rows('users?select=id,name,email,role,company,status,created_at&order=created_at.desc&limit=300');
    var cnt=document.getElementById('ac-users-count'); if(cnt) cnt.textContent=_usersAll.length+'명';
    renderUserChips(); renderUserCards();
  };
  function renderUserChips(){
    var el=document.getElementById('ac-users-chips'); if(!el) return;
    var defs=[['all','전체'],['admin','어드민'],['ga','GA'],['insurer','원수사'],['pending','승인대기']];
    el.innerHTML=defs.map(function(d){ return '<button class="ac-chip'+(_usersFilter===d[0]?' active':'')+'" data-uf="'+d[0]+'">'+d[1]+'</button>'; }).join('');
    el.querySelectorAll('[data-uf]').forEach(function(b){ b.addEventListener('click',function(){ _usersFilter=b.getAttribute('data-uf'); renderUserChips(); renderUserCards(); }); });
  }
  function renderUserCards(){
    var area=document.getElementById('ac-users-list'); if(!area) return;
    var RL=window.ROLE_LABEL||{};
    var list=_usersAll.filter(function(u){
      if(_usersFilter==='all') return true;
      if(_usersFilter==='pending') return u.status==='pending';
      return _rgrp(u.role)===_usersFilter;
    });
    if(!list.length){ area.innerHTML='<div class="ac-card-empty"><i data-lucide="users"></i>해당 사용자가 없습니다</div>'; if(window.lucide) window.lucide.createIcons(); return; }
    area.innerHTML=list.map(function(u){
      var g=_rgrp(u.role); var st=(u.status==='pending')?'pending':'active';
      return '<div class="ac-entity r-'+g+'">'+
        '<span class="ac-badge r-'+g+'">'+esc(RL[u.role]||u.role||'')+'</span> '+
        '<span class="ac-badge st-'+st+'">'+(st==='pending'?'승인대기':'활성')+'</span>'+
        '<div class="ac-entity-name">'+esc(u.name||'(이름 없음)')+'</div>'+
        '<div class="ac-entity-meta">'+esc(u.company||'-')+' · '+esc(u.email||'')+'</div>'+
        '<div class="ac-entity-sub">가입 '+esc(_fmtDate(u.created_at))+'</div></div>';
    }).join('');
  }

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
  window.acLoadPosts = async function(){
    var area=document.getElementById('ac-posts-list'); if(!area) return;
    area.innerHTML='<div class="ac-skel-wrap"><div class="ac-skel"></div><div class="ac-skel"></div><div class="ac-skel"></div></div>';
    var rows=await _rows('posts?select=id,title,board_type,created_at&order=created_at.desc&limit=100');
    var c=document.getElementById('ac-posts-count'); if(c) c.textContent=rows.length+'건';
    if(!rows.length){ area.innerHTML='<div class="ac-card-empty"><i data-lucide="file-text"></i>게시글 없음</div>'; if(window.lucide) window.lucide.createIcons(); return; }
    area.innerHTML=rows.map(function(p){
      return '<div class="ac-entity"><span class="ac-badge medium">'+esc(BOARD_LABEL[p.board_type]||p.board_type||'')+'</span>'+
        '<div class="ac-entity-name">'+esc(p.title||'(제목 없음)')+'</div>'+
        '<div class="ac-entity-sub">'+esc(_fmtDate(p.created_at))+'</div></div>';
    }).join('');
  };
  // 댓글: 본문 컬럼 미확인 → 최소 구성(후속 본문 보강)
  window.acLoadComments = async function(){
    var area=document.getElementById('ac-comments-list'); if(!area) return;
    area.innerHTML='<div class="ac-skel-wrap"><div class="ac-skel"></div><div class="ac-skel"></div><div class="ac-skel"></div></div>';
    var rows=await _rows('comments?select=id,created_at&order=created_at.desc&limit=100');
    var c=document.getElementById('ac-comments-count'); if(c) c.textContent=rows.length+'건';
    if(!rows.length){ area.innerHTML='<div class="ac-card-empty"><i data-lucide="message-square"></i>댓글 없음</div>'; if(window.lucide) window.lucide.createIcons(); return; }
    area.innerHTML=rows.map(function(cm){
      return '<div class="ac-entity"><span class="ac-badge normal">댓글</span>'+
        '<div class="ac-entity-meta">댓글 #'+esc(cm.id)+'</div>'+
        '<div class="ac-entity-sub">'+esc(_fmtDate(cm.created_at))+'</div></div>';
    }).join('');
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
    dashboard:{}, logs:{},
    ops:    { secs:[['approvals','가입 승인'],['users','사용자'],['branches','지점']] },
    content:{ secs:[['posts','게시글'],['comments','댓글'],['library','자료실']] },
    system: { secs:[['menu','메뉴'],['notice','공지·배너'],['settings','설정']] }
  };
  var AC_SEC_GROUP = { dashboard:'dashboard', logs:'logs',
    approvals:'ops', users:'ops', branches:'ops',
    posts:'content', comments:'content', library:'content',
    menu:'system', notice:'system', settings:'system' };
  var AC_LOAD = { dashboard:'acLoadDashboard', approvals:'acLoadApprovals', users:'acLoadUsers',
    branches:'acLoadBranches', posts:'acLoadPosts', comments:'acLoadComments', library:'acLoadLibrary' };
  var AC_TAB_ORDER = ['dashboard','ops','content','system','logs'];

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
})();
