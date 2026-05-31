/**
 * js/maintenance-guard.js
 * 유지보수 모드 가드 (2026-05-28 갱신 — 화이트리스트 4 계정 / kcp.review 심사용 한정)
 *
 * 본질:
 *   - MAINTENANCE_MODE = true 자료 = 화이트리스트 4 계정 외 모든 진입 차단 (비로그인 포함)
 *   - 판정 단일 기준 = localStorage os_user.email ∈ OS_WHITELIST_EMAILS
 *   - 공개 페이지 6건 = 누구나 접근 (landing + PG 5 페이지) + 진입 라우터 + maintenance
 *   - ?dev=1 우회 자료 폐지 (최종 정책 명시)
 *
 * 정책 갱신 (2026-05-28):
 *   - PR #110 (reviewer 폐지) → kcp.review 심사용 한정 갱신
 *   - 근거: KG이니시스 심사 담당자 문자(5/28) — "테스트 로그인 계정 전달 필수" 공식 요구
 *   - kcp.review = 심사 전용. 비밀번호 로그인 (prompt) — 코드 평문 X
 *
 * 허용 계정 (공사중 우회 4 계정):
 *   1. bylts0428@gmail.com — admin (role='admin')
 *   2. bylts@naver.com — 내부 운영
 *   3. bylts@kakao.com — 내부 운영
 *   4. kcp.review@onesecond.solutions — KG이니시스 심사 전용 (비밀번호 로그인)
 *
 * 흐름:
 *   1. PUBLIC_PATHS 진입 = 통과 (진입 라우터 + landing + PG 5 페이지 + maintenance)
 *   2. localStorage os_user.email ∈ OS_WHITELIST_EMAILS = 통과
 *   3. 그 외 = 모든 인증 자료 제거 후 /maintenance.html redirect
 *
 * 해제:
 *   - 본 파일 line 28 `MAINTENANCE_MODE = false` 변경 + 재배포
 */
(function () {
  'use strict';

  var MAINTENANCE_MODE = true;  /* 2026-05-31: 재발동 (v1→v2 대개편 — 화이트리스트 외 전원 차단·강제 로그아웃). 해제 시 false. */
  var MAINTENANCE_PAGE = '/maintenance.html';

  /* 화이트리스트 4 계정 — auth-modal.js / auth.js에서 동일 자료 참조 (window.OS_WHITELIST_EMAILS).
     2026-05-28: kcp.review 심사용 한정 추가 (PR #110 갱신, KG이니시스 공식 요구). */
  var WHITELIST_EMAILS = [
    'bylts0428@gmail.com',
    'bylts@naver.com',
    'bylts@kakao.com',
    'kcp.review@onesecond.solutions',
    /* 2026-05-30 임시(검수용) — 원수사 자료실 단계 1 검수 후 제거 예정 */
    'test@meritz.co.kr',
    'test.meritz@meritz.co.kr'
  ];

  /* 공개 페이지 = 진입 라우터 + landing + PG 심사 5 페이지 + maintenance 본인
     - /index.html = 진입 라우터 (비로그인이면 자동 landing redirect)
     - / (루트) = GitHub Pages가 index.html 자동 서빙 = pathname '/' 자료
     - 본 자리 차단 시 = 사용자가 도메인 진입 자체 차단 = landing 진입 불가 격차 */
  var PUBLIC_PATHS = [
    '/',
    '/index.html',
    '/maintenance.html',
    '/pages/landing.html',
    '/pricing.html',
    '/about.html',
    '/terms.html',
    '/privacy.html',
    '/refund.html'
  ];

  function isWhitelistedEmail(email) {
    return WHITELIST_EMAILS.indexOf((email || '').toLowerCase().trim()) !== -1;
  }

  function isPublicPath(pathname) {
    var p = (pathname || '').toLowerCase();
    for (var i = 0; i < PUBLIC_PATHS.length; i++) {
      if (p === PUBLIC_PATHS[i].toLowerCase()) return true;
    }
    return false;
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

    /* 1. 공개 페이지 = 통과 (landing + PG 5 페이지 + maintenance) */
    if (isPublicPath(window.location.pathname)) return;

    /* 2. 화이트리스트 4 계정 = 통과 */
    if (isWhitelistedEmail(getCurrentEmail())) return;

    /* 3. 그 외 = 모든 인증 자료 제거 후 maintenance.html redirect */
    clearAllAuthStorage();
    window.location.replace(MAINTENANCE_PAGE);
  }

  checkAndGuard();

  window.addEventListener('pageshow', function (event) {
    if (event.persisted) checkAndGuard();
  });

  /* 다른 파일이 참조하는 단일 진실 자료 */
  window.OS_WHITELIST_EMAILS = WHITELIST_EMAILS;
  window.osIsWhitelistedEmail = isWhitelistedEmail;
  window.OS_MAINTENANCE = {
    mode: MAINTENANCE_MODE,
    whitelist: WHITELIST_EMAILS,
    publicPaths: PUBLIC_PATHS,
    check: checkAndGuard,
    clear: clearAllAuthStorage
  };

  /* ─────────────────────────────────────────────────────────────
     모달 안 차단 함수 (auth-modal.js doLogin / signInWithGoogle / doSubmit 호출)
     · 로그인 / 가입 / Google 시도 시 즉시 maintenance.html redirect
     ───────────────────────────────────────────────────────────── */
  window.osShowMaintenance = function () {
    if (!MAINTENANCE_MODE) return;
    try { clearAllAuthStorage(); } catch (e) {}
    window.location.replace(MAINTENANCE_PAGE);
  };
})();
