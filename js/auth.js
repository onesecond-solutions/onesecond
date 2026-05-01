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
    role:    '',     // users.role (admin / ga_*·insurer_* 4종 = 9역할)
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

  // ── 5. 무료 혜택 / 매니저 이상 판별 헬퍼 (D-pre G-2·결정 C 정합) ─────────
  // CLAUDE.md "매니저 이상 무료 원칙" = admin + 각 소속의 branch_manager·manager (5종)
  function isFreeTier(role) {
    return [
      'admin',
      'ga_branch_manager', 'ga_manager',
      'insurer_branch_manager', 'insurer_manager'
    ].includes(role);
  }
  function isManagerOrAbove(role) {
    return isFreeTier(role); // 의미 alias
  }

  // ── 6. PRO 판단 ───────────────────────────────────────────────────────────
  // PRO = plan이 'pro' 이거나, role이 매니저 이상 (무료 혜택 대상)
  function isPro() {
    var s = window.AppState;
    return s.plan === 'pro' || isFreeTier(s.role);
  }

  // ── 7. Admin 판단 ─────────────────────────────────────────────────────────
  function isAdmin() {
    return window.AppState.role === 'admin';
  }

  // ── 8. role → 한글 직책명 ─────────────────────────────────────────────────
  function getRoleLabel(role) {
    var map = window.ROLE_LABEL || {
      admin: '어드민',
      ga_branch_manager: 'GA 지점장', ga_manager: 'GA 실장',
      ga_member: 'GA 설계사', ga_staff: 'GA 스텝',
      insurer_branch_manager: '원수사 지점장', insurer_manager: '원수사 매니저',
      insurer_member: '원수사 직원', insurer_staff: '원수사 스텝'
    };
    return map[role] || '';
  }

  // ── 9. DB에서 사용자 정보 fetch → AppState 갱신 ──────────────────────────
  async function loadUser() {
    if (!window.AppState.userId) return;

    // [2026-04-20] public.users row 누락 시 os_user에서 email만이라도 복구
    function _applyAuthFallback() {
      try {
        var raw = localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}';
        var u = JSON.parse(raw);
        var fbEmail = u.email || (u.user && u.user.email) || '';
        if (fbEmail && !window.AppState.email) window.AppState.email = fbEmail;
      } catch (e) { /* ignore */ }
    }

    try {
      var res = await window.db.fetch(
        '/rest/v1/users?id=eq.' + window.AppState.userId
        + '&select=name,role,phone,email,company,branch,team,plan'
      );
      if (!res.ok) {
        // fetch 실패해도 appstate:ready는 발화 (이름/이메일은 빈값 + email fallback)
        _applyAuthFallback();
        document.dispatchEvent(new CustomEvent('appstate:ready', {
          detail: { user: window.AppState }
        }));
        return;
      }
      var data = await res.json();
      if (!data || !data[0]) {
        // 데이터 없어도 appstate:ready 발화 (A1은 email fallback으로 표시)
        _applyAuthFallback();
        document.dispatchEvent(new CustomEvent('appstate:ready', {
          detail: { user: window.AppState }
        }));
        return;
      }
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

  // ── 10. 사용자 정보 저장 (내 정보 수정 모달용) ───────────────────────────
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

  // ── [2026-04-19] 미인증 시 redirect 파라미터 보존 헬퍼 ──────────────────
  // redirect 파라미터가 있으면 login.html?redirect=X로, 없으면 index.html로
  function _redirectToAuthPage() {
    try {
      var _r = new URLSearchParams(window.location.search).get('redirect');
      if (_r) {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(_r);
        return;
      }
    } catch (e) { /* URLSearchParams 미지원 환경 무시 */ }
    window.location.href = 'index.html';
  }

  // ── 11. 앱 진입 시 인증 체크 + 초기화 ───────────────────────────────────
  async function init() {
    var token  = window.db.getToken();
    var userId = resolveUserId();

    // 미인증 → 로그인 페이지 (redirect 파라미터 보존)
    if (!token || !userId) {
      _redirectToAuthPage();
      return;
    }

    window.AppState.userId = userId;
    window.AppState.token  = token;

    // 하위 호환: window._userToken / _userId 동기화
    window._userToken = token;
    window._userId    = userId;

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
        window._userToken     = newToken.access_token;
      } else {
        // 갱신 실패 → 로그인 페이지 (redirect 파라미터 보존)
        _redirectToAuthPage();
        return;
      }
    }

    // DB에서 사용자 정보 fetch
    await loadUser();
  }

  // ── 12. 공개 API: window.Auth ─────────────────────────────────────────────
  window.Auth = {
    init:             init,
    loadUser:         loadUser,
    saveUser:         saveUser,
    isPro:            isPro,
    isAdmin:          isAdmin,
    isFreeTier:       isFreeTier,
    isManagerOrAbove: isManagerOrAbove,
    getRoleLabel:     getRoleLabel,
    logout:           logout
  };

  // 하위 호환: 기존 app.html 함수명 유지 (Phase 2 완료 후 제거 예정)
  window.doLogout = logout;

})();
