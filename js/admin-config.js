/**
 * js/admin-config.js
 * admin 단일 진실 (2026-05-26 신설)
 *
 * 본질:
 *   모든 권한 체크는 본 함수 1개만 참조한다.
 *   - public.users.role === 'admin' 통과
 *   - 또는 OS_ADMIN_EMAILS 이메일 통과 (DB fetch 못 한 자리 안전망)
 *
 * 격차 해소:
 *   - auth-guard.js 격차 = os_user(Supabase auth user)에는 role 컬럼 없음
 *     → 페이지 진입 가드가 admin도 차단하던 격차
 *   - 본 단일 진실 자료 추가로 admin은 role 또는 이메일 어느 한쪽으로도 통과
 *
 * 사용:
 *   <script src="/js/admin-config.js"></script>
 *   (auth-guard.js / auth.js 보다 먼저 로드)
 *
 *   if (window.osIsAdmin({ role: user.role, email: user.email })) { ... }
 *
 * 향후:
 *   - 별도 roles 테이블 또는 user_roles 자료 전환 시 본 파일 1곳만 정정
 *   - OS_ADMIN_EMAILS 이메일 자료는 임시 안전망 (DB role 단일 진실 정착 후 폐기 가능)
 */
(function () {
  'use strict';

  /** admin 이메일 화이트리스트 (DB role 보강 안전망) */
  window.OS_ADMIN_EMAILS = [
    'bylts0428@gmail.com'
  ];

  /**
   * admin 판정 단일 함수
   * @param {object} user - { role, email } 둘 중 하나라도 통과하면 admin
   * @returns {boolean}
   */
  window.osIsAdmin = function (user) {
    if (!user) return false;
    if (user.role === 'admin') return true;
    var email = (user.email || '').toLowerCase().trim();
    return window.OS_ADMIN_EMAILS.indexOf(email) !== -1;
  };
})();
