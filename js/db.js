/**
 * js/db.js
 * Supabase 클라이언트 단일 관리 파일
 *
 * ▸ 이 파일에서만 SUPABASE_URL·KEY 선언
 * ▸ 모든 파일은 window.db.fetch() 또는 window.db.url() 사용
 * ▸ UI·인증·role 관련 코드 작성 금지
 *
 * 사용 예시 (pages/*.html, auth.js 등):
 *   const res = await window.db.fetch('/rest/v1/scripts?is_active=eq.true&select=id,title');
 *   const res = await window.db.fetch('/rest/v1/posts', { method: 'POST', body: JSON.stringify({...}) });
 */

(function () {
  'use strict';

  // ── 1. Supabase 설정 ──────────────────────────────────────────────────────
  var SUPABASE_URL = 'https://pdnwgzneooyygfejrvbg.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkbndnem5lb295eWdmZWpydmJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NDc5ODgsImV4cCI6MjA5MjQyMzk4OH0.I79w8Jk-pPgoLHNrcSLhem88jz6_azcDOqglBZjRjPs';

  // ── 2. 토큰 접근 헬퍼 ────────────────────────────────────────────────────
  function getToken() {
    return localStorage.getItem('os_token') || sessionStorage.getItem('os_token') || null;
  }

  function getRefreshToken() {
    return localStorage.getItem('os_refresh_token') || null;
  }

  // ── 3. 토큰 갱신 ─────────────────────────────────────────────────────────
  async function refreshToken() {
    var refreshTk = getRefreshToken();
    if (!refreshTk) return null;
    try {
      var res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ refresh_token: refreshTk })
      });
      if (!res.ok) return null;
      var data = await res.json();
      localStorage.setItem('os_token', data.access_token);
      localStorage.setItem('os_refresh_token', data.refresh_token);
      localStorage.setItem('os_user', JSON.stringify(data.user));
      sessionStorage.setItem('os_token', data.access_token);
      sessionStorage.setItem('os_user', JSON.stringify(data.user));
      return data.access_token;
    } catch (e) {
      return null;
    }
  }

  // ── 4. 토큰 만료 처리 ────────────────────────────────────────────────────
  function handleTokenExpired() {
    alert('로그인 세션이 만료됐습니다.\n다시 로그인해 주세요.');
    localStorage.removeItem('os_token');
    localStorage.removeItem('os_refresh_token');
    localStorage.removeItem('os_user');
    sessionStorage.removeItem('os_token');
    sessionStorage.removeItem('os_user');
    window.location.href = 'index.html';
  }

  // ── 5. 인증 포함 fetch (핵심 API) ────────────────────────────────────────
  /**
   * window.db.fetch(path, options)
   * @param {string} path  - '/rest/v1/테이블명?...' 형식 (앞에 / 포함)
   * @param {object} options - fetch options (method, headers, body 등)
   *
   * - apikey·Authorization 헤더 자동 주입
   * - 401 응답 시 토큰 갱신 후 1회 재시도
   * - 갱신 실패 시 handleTokenExpired() 호출
   */
  async function dbFetch(path, options) {
    options = options || {};
    options.headers = options.headers || {};
    options.headers['apikey'] = SUPABASE_KEY;
    options.headers['Authorization'] = 'Bearer ' + (getToken() || '');

    var res = await fetch(SUPABASE_URL + path, options);

    if (res.status === 401) {
      var newToken = await refreshToken();
      if (!newToken) {
        handleTokenExpired();
        throw new Error('TOKEN_EXPIRED');
      }
      options.headers['Authorization'] = 'Bearer ' + newToken;
      res = await fetch(SUPABASE_URL + path, options);
    }
    return res;
  }

  // ── 6. 인증 불필요 fetch (공개 API용) ────────────────────────────────────
  /**
   * window.db.fetchPublic(path, options)
   * Authorization 헤더 없이 apikey만 포함
   * 사용 예: quick_contents 공개 목록 조회
   */
  async function dbFetchPublic(path, options) {
    options = options || {};
    options.headers = options.headers || {};
    options.headers['apikey'] = SUPABASE_KEY;
    return await fetch(SUPABASE_URL + path, options);
  }

  // ── 7. URL 헬퍼 ──────────────────────────────────────────────────────────
  /** window.db.url(path) → 전체 URL 반환 (직접 fetch가 필요한 경우용) */
  function dbUrl(path) {
    return SUPABASE_URL + (path || '');
  }

  // ── 8. 공개 API: window.db ────────────────────────────────────────────────
  window.db = {
    fetch: dbFetch,           // 인증 포함 fetch (일반 사용)
    fetchPublic: dbFetchPublic, // 인증 없는 fetch (공개 데이터)
    url: dbUrl,               // 전체 URL 조합 헬퍼
    key: SUPABASE_KEY,        // apikey (직접 헤더 구성 필요 시)
    getToken: getToken        // 현재 토큰 반환
  };

  // ── 9. 하위 호환: 기존 app.html 코드가 참조하는 전역 변수 유지 ────────────
  // Phase 2(app.html 슬림화) 완료 후 제거 예정
  window.SUPABASE_URL = SUPABASE_URL;
  window.SUPABASE_KEY = SUPABASE_KEY;
  window.ROLE_LABEL = {
    admin:                  '어드민',
    ga_branch_manager:      'GA 지점장',
    ga_manager:             'GA 실장',
    ga_member:              'GA 설계사',
    ga_staff:               'GA 스텝',
    insurer_branch_manager: '원수사 지점장',
    insurer_manager:        '원수사 매니저',
    insurer_member:         '원수사 직원',
    insurer_staff:          '원수사 스텝'
  };

})();
