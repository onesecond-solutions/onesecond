/**
 * js/maintenance-guard.js
 * 유지보수 모드 가드 (2026-05-26 신설)
 *
 * 본질:
 *   - MAINTENANCE_MODE = true 자료 = 화이트리스트 외 모든 로그인 사용자 차단
 *   - 화이트리스트 X = 모든 인증 자료 (localStorage / sessionStorage / sb-* / remember-me) 제거 + /maintenance.html redirect
 *   - 토큰 0건 = 비로그인 = 그대로 통과 (공개 페이지 정상 가동)
 *   - 화이트리스트 O = 통과
 *
 * 적용:
 *   - 모든 진입 .html `<head>` 최상단에 `<script src="/js/maintenance-guard.js"></script>` 1줄 추가
 *   - maintenance.html 자체에는 적용 X (직접 접근 가능)
 *
 * 해제:
 *   - 본 파일 line 24 `MAINTENANCE_MODE = false` 변경 + redeploy
 *   - 해제 즉시 정상 가동 (회원 데이터 / DB 변경 0건)
 *
 * 우회 (본인 검수용):
 *   - URL에 `?dev=1` 자료 = 가드 우회 (가드 통과)
 *
 * 격차 차단:
 *   - bfcache (뒤로가기) 재진입 시 = pageshow 이벤트 = 가드 재가동
 *   - 화이트리스트 X 사용자 = 다음 페이지 진입 즉시 signOut + redirect
 */
(function () {
  'use strict';

  var MAINTENANCE_MODE = true;
  var ALLOWED_EMAILS = [
    'bylts0428@gmail.com',
    'bylts@naver.com',
    'bylts@kakao.com'
  ];
  var MAINTENANCE_PAGE = '/maintenance.html';

  function isAllowedEmail(email) {
    return ALLOWED_EMAILS.indexOf((email || '').toLowerCase().trim()) !== -1;
  }

  function getCurrentEmail() {
    try {
      var raw = localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}';
      var u = JSON.parse(raw);
      return u.email || (u.user && u.user.email) || '';
    } catch (e) {
      return '';
    }
  }

  function hasAnyToken() {
    if (localStorage.getItem('os_token') || sessionStorage.getItem('os_token')) return true;
    if (localStorage.getItem('os_user') || sessionStorage.getItem('os_user')) return true;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && (k.indexOf('sb-') === 0 || k.indexOf('supabase') !== -1)) return true;
      }
      for (var j = 0; j < sessionStorage.length; j++) {
        var k2 = sessionStorage.key(j);
        if (k2 && (k2.indexOf('sb-') === 0 || k2.indexOf('supabase') !== -1)) return true;
      }
    } catch (e) {}
    return false;
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

    try {
      var params = new URLSearchParams(window.location.search);
      if (params.get('dev') === '1') return;
    } catch (e) {}

    if (window.location.pathname.indexOf('/maintenance.html') !== -1) return;

    if (!hasAnyToken()) return;

    var email = getCurrentEmail();
    if (isAllowedEmail(email)) return;

    clearAllAuthStorage();
    window.location.replace(MAINTENANCE_PAGE);
  }

  checkAndGuard();

  window.addEventListener('pageshow', function (event) {
    if (event.persisted) checkAndGuard();
  });

  window.OS_MAINTENANCE = {
    mode: MAINTENANCE_MODE,
    allowed: ALLOWED_EMAILS,
    check: checkAndGuard,
    clear: clearAllAuthStorage
  };
})();
