/**
 * js/maintenance-guard.js
 * 유지보수 모드 가드 (2026-05-27 통째 재작성 — 이메일 화이트리스트 폐지)
 *
 * 본질:
 *   - MAINTENANCE_MODE = true 자료 = role === 'admin' 외 모든 진입 차단 (비로그인 포함)
 *   - 판정 단일 기준 = public.users.role === 'admin' (시스템 권한)
 *   - 이메일 화이트리스트 / 테스트 계정 예외 흐름 통째 폐지
 *   - PG 심사 5 페이지 (pricing / about / terms / privacy / refund) = 공개 유지
 *
 * 흐름:
 *   1. ?dev=1 자리 = 가드 통과 (admin 본인 진입 자리)
 *   2. PUBLIC_PATHS = 가드 통과 (PG 심사용 + maintenance 본인)
 *   3. role === 'admin' = 통과 (localStorage os_user 안 role)
 *   4. 그 외 = 모든 인증 자료 제거 후 /maintenance.html redirect
 *
 * 적용:
 *   - 모든 진입 .html `<head>` 최상단에 `<script src="/js/maintenance-guard.js"></script>` 1줄
 *   - maintenance.html 자체에는 적용 X (loop 방지)
 *
 * 해제:
 *   - 본 파일 line 28 `MAINTENANCE_MODE = false` 변경 + 재배포
 *
 * 우회 (admin 본인 진입 자리):
 *   - URL에 `?dev=1` 추가 = 가드 통과
 *
 * 격차 차단:
 *   - bfcache (뒤로가기) 재진입 시 = pageshow 이벤트 = 가드 재가동
 *   - 비로그인 사용자도 차단 (옛 흐름과 분리)
 */
(function () {
  'use strict';

  var MAINTENANCE_MODE = true;
  var MAINTENANCE_PAGE = '/maintenance.html';

  /* PG 심사용 공개 페이지 + maintenance 본인 = 가드 통과 */
  var PUBLIC_PATHS = [
    '/maintenance.html',
    '/pricing.html',
    '/about.html',
    '/terms.html',
    '/privacy.html',
    '/refund.html'
  ];

  function isPublicPath(pathname) {
    var p = (pathname || '').toLowerCase();
    for (var i = 0; i < PUBLIC_PATHS.length; i++) {
      if (p === PUBLIC_PATHS[i] || p === PUBLIC_PATHS[i].toLowerCase()) return true;
    }
    return false;
  }

  function getCurrentRole() {
    try {
      var raw = localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}';
      var u = JSON.parse(raw);
      return (u.role || (u.user && u.user.role) || '').toString();
    } catch (e) {
      return '';
    }
  }

  function isAdminRole() {
    return getCurrentRole() === 'admin';
  }

  function clearAllAuthStorage() {
    var known = [
      'os_token', 'os_refresh_token', 'os_user',
      'selected_menu', 'remember-me', 'rememberMe',
      '_loginLogged'
    ];
    try {
      known.forEach(function (k) {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      });
      var lsKeys = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && (k.indexOf('sb-') === 0 || k.indexOf('supabase') !== -1 || k.indexOf('os_') === 0)) {
          lsKeys.push(k);
        }
      }
      lsKeys.forEach(function (k) { localStorage.removeItem(k); });

      var ssKeys = [];
      for (var j = 0; j < sessionStorage.length; j++) {
        var k2 = sessionStorage.key(j);
        if (k2 && (k2.indexOf('sb-') === 0 || k2.indexOf('supabase') !== -1 || k2.indexOf('os_') === 0)) {
          ssKeys.push(k2);
        }
      }
      ssKeys.forEach(function (k) { sessionStorage.removeItem(k); });
    } catch (e) {}

    try {
      var cookies = document.cookie.split(';');
      cookies.forEach(function (c) {
        var name = c.split('=')[0].trim();
        if (name.indexOf('sb-') === 0 || name.indexOf('supabase') !== -1 || name === 'remember-me') {
          document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        }
      });
    } catch (e) {}
  }

  function checkAndGuard() {
    if (!MAINTENANCE_MODE) return;

    /* 1. ?dev=1 자리 = admin 본인 진입 자리 */
    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get('dev') === '1') return;
    } catch (e) {}

    /* 2. PG 심사용 공개 페이지 + maintenance 본인 = 통과 */
    if (isPublicPath(window.location.pathname)) return;

    /* 3. role === 'admin' = 통과 */
    if (isAdminRole()) return;

    /* 4. 그 외 = 모든 인증 자료 제거 후 maintenance.html redirect */
    clearAllAuthStorage();
    window.location.replace(MAINTENANCE_PAGE);
  }

  checkAndGuard();

  window.addEventListener('pageshow', function (event) {
    if (event.persisted) checkAndGuard();
  });

  window.OS_MAINTENANCE = {
    mode: MAINTENANCE_MODE,
    publicPaths: PUBLIC_PATHS,
    check: checkAndGuard,
    clear: clearAllAuthStorage
  };

  /* ─────────────────────────────────────────────────────────────
     모달 안 차단 함수 (auth-modal.js doLogin / doSubmit / signInWithGoogle 호출)
     · 로그인 / 가입 / Google 시도 시 즉시 maintenance.html redirect
     · 이메일 검사 흐름 폐지 — 모든 진입은 본 함수가 차단
     ───────────────────────────────────────────────────────────── */
  window.osShowMaintenance = function () {
    if (!MAINTENANCE_MODE) return;
    try { clearAllAuthStorage(); } catch (e) {}
    window.location.replace(MAINTENANCE_PAGE);
  };
})();
