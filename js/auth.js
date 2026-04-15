/**
 * js/auth.js
 * 인증·role·plan 판단 및 AppState 단일 객체 제공
 *
 * ▸ 의존: js/db.js (window.db 사용)
 * ▸ app.html에서 db.js 다음에 로드
 *
 * 제공 API:
 *   window.AppState          — 현재 사용자 상태 객체 (읽기 전용으로 사용)
 *   window.Auth.init()       — 앱 진입 시 1회 호출 (인증 체크 + AppState 세팅)
 *   window.Auth.loadUser()   — DB에서 사용자 정보 fetch → AppState 갱신
 *   window.Auth.isPro()      — PRO 여부 반환 (boolean)
 *   window.Auth.isAdmin()    — admin 여부 반환 (boolean)
 *   window.Auth.logout()     — 로그아웃 처리
 *
 * pages/*.html 사용 예시:
 *   const { name, role, plan } = window.AppState;
 *   if (window.Auth.isPro()) { ... }
 */

(function () {
  'use strict';

  // ── 1. AppState 초기값 ────────────────────────────────────────────────────
  window.AppState = {
    userId:  null,   // Supabase auth.uid
    token:   null,   // 현재 access_token
    name:    '',     // users.name
    email:   '',     // users.email
    role:    '',     // users.role (member/manager/branch_manager/staff/admin)
    plan:    'free', // users.plan (free/pro)
    phone:   '',
    company: '',
    branch:  '',
    team:    '',
    ready:   false   // loadUser() 완료 여부
  };

  // ── 2. 세션 스토리지에서 userId 복원 ─────────────────────────────────────
  function resolveUserId() {
    var raw = localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}';
    try {
      var parsed = JSON.parse(raw);
      return parsed.id
        || parsed.sub
        || (parsed.user && (parsed.user.id || parsed.user.sub))
        || null;
    } catch (e) {
      return null;
    }
  }

  // ── 3. 토큰 만료 여부 확인 ───────────────────────────────────────────────
  function isTokenExpired(token) {
    try {
      var payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() / 1000 > payload.exp;
    } catch (e) {
      return false; // 파싱 실패 시 일단 사용 (fetchWithAuth가 처리)
    }
  }

  // ── 4. 로그아웃 ──────────────────────────────────────────────────────────
  function logout() {
    localStorage.removeItem('os_token');
    localStorage.removeItem('os_refresh_token');
    localStorage.removeItem('os_user');
    localStorage.removeItem('selected_menu');
    sessionStorage.removeItem('os_token');
    sessionStorage.removeItem('os_user');
    window.location.href = 'index.html';
  }

  // ── 5. PRO 판단 ───────────────────────────────────────────────────────────
  // PRO = plan이 'pro' 이거나, role이 manager/branch_manager/admin
  function isPro() {
    var s = window.AppState;
    return s.plan === 'pro'
      || ['manager', 'branch_manager', 'admin'].includes(s.role);
  }

  // ── 6. Admin 판단 ─────────────────────────────────────────────────────────
  function isAdmin() {
    return window.AppState.role === 'admin';
  }

  // ── 7. role → 한글 직책명 ─────────────────────────────────────────────────
  function getRoleLabel(role) {
    var map = window.ROLE_LABEL || {
      member: '팀장', manager: '실장',
      branch_manager: '지점장', staff: '스텝', admin: '관리자'
    };
    return map[role] || '';
  }

  // ── 8. DB에서 사용자 정보 fetch → AppState 갱신 ──────────────────────────
  async function loadUser() {
    if (!window.AppState.userId) return;
    try {
      var res = await window.db.fetch(
        '/rest/v1/users?id=eq.' + window.AppState.userId
        + '&select=name,role,phone,email,company,branch,team,plan'
      );
      if (!res.ok) return;
      var data = await res.json();
      if (!data || !data[0]) return;
      var u = data[0];

      // AppState 갱신
      window.AppState.name    = u.name    || '';
      window.AppState.email   = u.email   || '';
      window.AppState.role    = u.role    || '';
      window.AppState.plan    = u.plan    || 'free';
      window.AppState.phone   = u.phone   || '';
      window.AppState.company = u.company || '';
      window.AppState.branch  = u.branch  || '';
      window.AppState.team    = u.team    || '';
      window.AppState.ready   = true;

      // 접속 로그 (세션당 1회)
      if (!sessionStorage.getItem('_loginLogged')) {
        sessionStorage.setItem('_loginLogged', '1');
        window.db.fetch('/rest/v1/activity_logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            user_id:     window.AppState.userId,
            event_type:  'login',
            target_type: null,
            target_id:   null
          })
        }).catch(function () {});
      }

      // CustomEvent: AppState 준비 완료 알림
      // pages/*.html은 이 이벤트를 listen해서 초기화 진행
      document.dispatchEvent(new CustomEvent('appstate:ready', {
        detail: { user: window.AppState }
      }));

    } catch (e) {
      if (e.message === 'TOKEN_EXPIRED') return;
      console.error('auth.js loadUser error:', e);
    }
  }

  // ── 9. 사용자 정보 저장 (내 정보 수정 모달용) ────────────────────────────
  async function saveUser(fields) {
    // fields: { name, phone, company, branch, team }
    if (!window.AppState.userId) return false;
    try {
      var res = await window.db.fetch(
        '/rest/v1/users?id=eq.' + window.AppState.userId,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify(fields)
        }
      );
      if (res.ok) {
        // AppState 즉시 반영
        Object.assign(window.AppState, fields);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // ── 10. 앱 진입 시 인증 체크 + 초기화 ───────────────────────────────────
  async function init() {
    var token  = window.db.getToken();
    var userId = resolveUserId();

    // 미인증 → 로그인 페이지
    if (!token || !userId) {
      window.location.href = 'index.html';
      return;
    }

    window.AppState.userId = userId;
    window.AppState.token  = token;

    // 토큰 만료 시 갱신 시도
    if (isTokenExpired(token)) {
      var newToken = await window.db.fetch('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': window.db.key },
        body: JSON.stringify({
          refresh_token: localStorage.getItem('os_refresh_token') || ''
        })
      }).then(function (r) {
        return r.ok ? r.json() : null;
      }).catch(function () { return null; });

      if (newToken && newToken.access_token) {
        localStorage.setItem('os_token', newToken.access_token);
        localStorage.setItem('os_refresh_token', newToken.refresh_token);
        localStorage.setItem('os_user', JSON.stringify(newToken.user));
        sessionStorage.setItem('os_token', newToken.access_token);
        sessionStorage.setItem('os_user', JSON.stringify(newToken.user));
        window.AppState.token = newToken.access_token;
      } else {
        // 갱신 실패 → 로그인 페이지
        window.location.href = 'index.html';
        return;
      }
    }

    // DB에서 사용자 정보 fetch
    await loadUser();
  }

  // ── 11. 공개 API: window.Auth ─────────────────────────────────────────────
  window.Auth = {
    init:         init,
    loadUser:     loadUser,
    saveUser:     saveUser,
    isPro:        isPro,
    isAdmin:      isAdmin,
    getRoleLabel: getRoleLabel,
    logout:       logout
  };

  // 하위 호환: 기존 app.html 함수명 유지 (Phase 2 완료 후 제거 예정)
  window.doLogout = logout;

})();
