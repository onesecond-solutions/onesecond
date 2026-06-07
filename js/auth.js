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
    window.location.href = '/index.html';
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
  // 2026-05-26: admin-config.js 단일 진실(window.osIsAdmin) 위임.
  // role 컬럼 또는 이메일 화이트리스트 어느 한쪽으로 통과.
  function isAdmin() {
    if (typeof window.osIsAdmin === 'function') {
      return window.osIsAdmin({
        role:  window.AppState.role,
        email: window.AppState.email
      });
    }
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
        + '&select=name,role,phone,email,company,branch,team,plan,insurer_id'
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
      window.AppState.insurer_id = u.insurer_id || '';  /* 2026-05-30 PR-B2: 보험사 자료 insert insurer_id 확보 */
      window.AppState.ready   = true;

      /* 2026-05-28: os_user 동기화 — DB select 전 필드 통째 머지.
         (격차: loadUser가 AppState만 갱신하고 os_user 자체 자체 자체 X →
          새로고침마다 os_user.phone 등 유실 → 결제 시 customer.phoneNumber 빈 값.)
         정합: DB 자료 우선 + 기존 os_user 자료 (id/email/aud 등 auth 자료) 보존. */
      try {
        var _raw = localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}';
        var _existing = JSON.parse(_raw);
        var _merged = Object.assign({}, _existing, u);  // DB select 결과 (name/role/phone/email/company/branch/team/plan) 우선
        localStorage.setItem('os_user', JSON.stringify(_merged));
        sessionStorage.setItem('os_user', JSON.stringify(_merged));
      } catch (_e) { /* 무시: AppState 갱신은 이미 완료 */ }

      // 접속 로그 (세션당 1회) — logActivity 헬퍼 통일 + admin 분기(감사)
      if (!sessionStorage.getItem('_loginLogged')) {
        sessionStorage.setItem('_loginLogged', '1');
        var _isAdmin = false;
        try { _isAdmin = (JSON.parse(localStorage.getItem('os_user') || '{}').role === 'admin'); } catch (_e) {}
        if (window.db && window.db.logActivity) {
          window.db.logActivity(_isAdmin ? 'login_admin' : 'login', null, null, null);
        }
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
        window.location.href = '/login.html?redirect=' + encodeURIComponent(_r);
        return;
      }
    } catch (e) { /* URLSearchParams 미지원 환경 무시 */ }
    window.location.href = '/index.html';
  }

  // ── 10-bis. OAuth 콜백 처리 (2026-05-18 Google OAuth 본진 추가) ──────────
  //   Supabase OAuth 본진 = 인증 성공 후 redirect_to URL에 토큰 URL fragment 박힘
  //   예: app.html#access_token=...&refresh_token=...&token_type=bearer&expires_in=3600
  //   → fragment 파싱해서 localStorage 박음 + URL 정리
  async function _handleOAuthCallback() {
    var hash = window.location.hash || '';

    /* 2026-06-07: OAuth 에러 표면화 — Supabase가 redirect_to에 ?error=/#error= 를 붙여 되돌리는 경우
       (대표 사례: 어드민 동일 이메일 충돌 = 이메일 OTP identity + Google identity, "Allow manual linking" OFF).
       이전엔 error 미처리 → 토큰 못 받고 조용히 로그인 페이지로 되돌아 "원인 모를 에러"로 보였음.
       여기서 실제 error_code/description 를 콘솔에 남겨(근본 확정용) + 사용자에게 이메일 코드 로그인 유도. */
    try {
      var _q = new URLSearchParams(window.location.search || '');
      var _h = new URLSearchParams(hash.substring(1));
      var _err = _q.get('error') || _h.get('error');
      if (_err) {
        var _ed = _q.get('error_description') || _h.get('error_description') || '';
        var _ec = _q.get('error_code') || _h.get('error_code') || '';
        console.error('[oauth error]', _err, _ec, _ed);
        try { history.replaceState(null, '', window.location.pathname); } catch (e) {}
        /* access_denied = 사용자가 Google 동의 취소 → 안내 없이 조용히 로그인 페이지로. 그 외(충돌 등)만 안내. */
        if (_err !== 'access_denied') {
          alert('Google 로그인에 실패했습니다.\n\n이 이메일이 \'이메일 코드 로그인\'으로 이미 가입돼 있으면 Google 연결이 막힐 수 있어요.\n로그인 화면에서 이메일 코드 로그인을 이용해 주세요.');
        }
        return;  /* 토큰 없음 → init()이 로그인 페이지로 처리 */
      }
    } catch (e) { /* 파싱 실패 무시 */ }

    /* 2026-06-04: PKCE 콜백 — ?code 를 code_verifier 로 토큰 교환 (signInWithGoogle이 PKCE로 시작). */
    var _code = null;
    try { _code = new URLSearchParams(window.location.search || '').get('code'); } catch (e) {}
    if (_code && hash.indexOf('access_token=') === -1) {
      var _verifier = '';
      try { _verifier = localStorage.getItem('os_pkce_verifier') || sessionStorage.getItem('os_pkce_verifier') || ''; } catch (e) {}
      if (!_verifier) return;  /* 우리가 시작한 PKCE 아님 → 무시 */
      try {
        var pres = await fetch(window.db.url('/auth/v1/token?grant_type=pkce'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': window.db.key },
          body: JSON.stringify({ auth_code: _code, code_verifier: _verifier })
        });
        if (!pres.ok) { console.error('[pkce exchange]', pres.status); return; }
        var pdata = await pres.json();
        var pUser = pdata.user || {};
        var pUserObj = { id: pUser.id, email: pUser.email || '', user_metadata: pUser.user_metadata || {} };
        localStorage.setItem('os_token', pdata.access_token);
        localStorage.setItem('os_refresh_token', pdata.refresh_token || '');
        localStorage.setItem('os_user', JSON.stringify(pUserObj));
        sessionStorage.setItem('os_token', pdata.access_token);
        sessionStorage.setItem('os_user', JSON.stringify(pUserObj));
        try { localStorage.removeItem('os_pkce_verifier'); sessionStorage.removeItem('os_pkce_verifier'); } catch (e) {}
        try { history.replaceState(null, '', window.location.pathname); } catch (e) {}
        try {
          if (window.db && typeof window.db.mergeUserProfile === 'function') {
            pUserObj = await window.db.mergeUserProfile(pUserObj, pdata.access_token);
            localStorage.setItem('os_user', JSON.stringify(pUserObj));
            sessionStorage.setItem('os_user', JSON.stringify(pUserObj));
          }
        } catch (_e) {}
      } catch (e) { console.error('[pkce exchange err]', e); }
      return;
    }

    if (hash.indexOf('access_token=') === -1) return;

    try {
      var params = new URLSearchParams(hash.substring(1));  // '#' 제거
      var accessToken = params.get('access_token');
      var refreshToken = params.get('refresh_token') || '';
      if (!accessToken) return;

      // 토큰 페이로드에서 사용자 ID + 이메일 추출
      var payload = JSON.parse(atob(accessToken.split('.')[1]));
      var userObj = {
        id: payload.sub,
        email: payload.email || '',
        user_metadata: payload.user_metadata || {}
      };

      /* 2026-05-27 최종 정책: Google OAuth 콜백 자리에서 4 화이트리스트 검사.
         - 클릭 시점에는 이메일 X = Google 인증 후 콜백에서만 검사 가능
         - 화이트리스트 X = 모든 인증 자료 제거 + maintenance.html redirect */
      if (window.OS_MAINTENANCE && window.OS_MAINTENANCE.mode === true) {
        var allowed = (typeof window.osIsWhitelistedEmail === 'function')
          ? window.osIsWhitelistedEmail(userObj.email)
          : false;
        if (!allowed) {
          // URL fragment 먼저 정리 (다음 진입 시 잔존 X)
          try { history.replaceState(null, '', window.location.pathname); } catch (_e) {}
          if (window.OS_MAINTENANCE && typeof window.OS_MAINTENANCE.clear === 'function') {
            window.OS_MAINTENANCE.clear();
          }
          window.location.replace('/maintenance.html');
          return;
        }
      }

      /* 2026-06-04 레이스 수정: 토큰+기본 사용자를 role fetch(async) 전에 즉시 저장.
         이전엔 mergeUserProfile await 후 저장 → 그 사이 loadHomeRecent가 토큰 없이 호출 → 401 "세션 만료". */
      localStorage.setItem('os_token', accessToken);
      localStorage.setItem('os_refresh_token', refreshToken);
      localStorage.setItem('os_user', JSON.stringify(userObj));
      sessionStorage.setItem('os_token', accessToken);
      sessionStorage.setItem('os_user', JSON.stringify(userObj));

      // URL fragment 즉시 정리 (토큰 저장 직후 — 잔존 fragment로 인한 재처리 방지)
      try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (_e) {}

      /* role/name/plan 보강 (실패해도 인증은 유지) — 보강 후 os_user 갱신 */
      try {
        if (window.db && typeof window.db.mergeUserProfile === 'function') {
          userObj = await window.db.mergeUserProfile(userObj, accessToken);
          localStorage.setItem('os_user', JSON.stringify(userObj));
          sessionStorage.setItem('os_user', JSON.stringify(userObj));
        }
      } catch (_e) { /* role 안 박혀도 인증은 계속 */ }
    } catch (e) {
      console.error('[oauth callback parse error]', e);
    }
  }

  // ── 11. 앱 진입 시 인증 체크 + 초기화 ───────────────────────────────────
  async function init() {
    /* 2026-05-18: OAuth 콜백 본진 = URL fragment 토큰 처리 (Google 로그인 진입 자리)
       2026-05-27: public.users role 박는 fetch가 안에 박혀 await 처리 */
    await _handleOAuthCallback();

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
        /* 2026-05-27: refresh 후에도 public.users role 박음 (admin 통과 정합) */
        var refreshedUser = newToken.user || {};
        try {
          if (window.db && typeof window.db.mergeUserProfile === 'function') {
            refreshedUser = await window.db.mergeUserProfile(refreshedUser, newToken.access_token);
          }
        } catch (_e) {}
        localStorage.setItem('os_token', newToken.access_token);
        localStorage.setItem('os_refresh_token', newToken.refresh_token);
        localStorage.setItem('os_user', JSON.stringify(refreshedUser));
        sessionStorage.setItem('os_token', newToken.access_token);
        sessionStorage.setItem('os_user', JSON.stringify(refreshedUser));
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
