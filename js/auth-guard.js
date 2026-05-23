/*
  auth-guard.js — 클라이언트 인증 가드 (2026-05-23 신설)

  본질: 랜딩(/pages/landing.html) = 원세컨드 유일 공개 진입점.
        내부 서비스 페이지는 token (+ 필요 시 admin role) 검증 없이는
        URL 직접 접근 차단 → 랜딩으로 redirect.

  쓰임:
    <script src="/js/auth-guard.js"></script>
       → token 검증만 (일반 내부 페이지)

    <script src="/js/auth-guard.js" data-require="admin"></script>
       → token + os_user.role === 'admin' 검증 (관리자 페이지)

  동작:
    1. localStorage.os_token (또는 sessionStorage.os_token) 없음
       → /pages/landing.html redirect
    2. data-require="admin" 자료 + os_user.role !== 'admin'
       → /pages/landing.html redirect

  공개 페이지 (가드 적용 안 함):
    - /index.html (진입 라우터, 자체 분기 흐름)
    - /pages/landing.html (유일 공개 진입점)

  한계:
    - 클라이언트 측 가드라 View Source / 개발자 도구로 우회 가능.
    - 일반 사용자 차단에는 충분. 악의적 우회는 차단 X.
    - 추후 서버 측 가드(Netlify Edge Function)는 별 작업으로 분리.
*/
(function () {
  var LANDING = '/pages/landing.html';

  try {
    /* 2026-05-23 추가: ?dev=1 우회 자료 — 본인 작업 자리 + Chrome AI 검수 진입용.
       공사중 흐름 임시 자리. 공사중 해제 시 본 우회 자료도 같이 제거. */
    var params = new URLSearchParams(window.location.search);
    if (params.get('dev') === '1') {
      return;
    }

    var script = document.currentScript;
    var requireAdmin = script && script.getAttribute('data-require') === 'admin';

    var token = localStorage.getItem('os_token') || sessionStorage.getItem('os_token');
    if (!token) {
      window.location.replace(LANDING);
      return;
    }

    if (requireAdmin) {
      var raw = localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}';
      var user = {};
      try { user = JSON.parse(raw); } catch (e) {}
      if (!user || user.role !== 'admin') {
        window.location.replace(LANDING);
        return;
      }
    }
  } catch (e) {
    window.location.replace(LANDING);
  }
})();
