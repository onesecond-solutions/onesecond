/**
 * js/admin-config.js
 * admin 단일 진실 (2026-05-27 정정 — 이메일 화이트리스트 폐지)
 *
 * 본질:
 *   모든 권한 체크는 본 함수 1개만 참조한다.
 *   판정 단일 기준 = public.users.role === 'admin' (시스템 권한)
 *
 * 정책 변경 (2026-05-27):
 *   - 옛 OS_ADMIN_EMAILS 이메일 화이트리스트 폐지
 *   - 이메일 기반 admin 판정 자리 통째 제거
 *   - 시스템 권한 단일 기준 (role) 정합
 *
 * 사용:
 *   <script src="/js/admin-config.js"></script>
 *   (auth-guard.js / auth.js 보다 먼저 로드)
 *
 *   if (window.osIsAdmin({ role: user.role })) { ... }
 */
(function () {
  'use strict';

  /**
   * admin 판정 단일 함수
   * @param {object} user - { role } role === 'admin'만 통과
   * @returns {boolean}
   */
  window.osIsAdmin = function (user) {
    if (!user) return false;
    return user.role === 'admin';
  };
})();
