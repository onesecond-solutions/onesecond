(function () {
  'use strict';
  function storedUser() { try { return JSON.parse(localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}'); } catch (_e) { return {}; } }
  function esc(value) { return String(value || '').replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function renderAccount() {
    var box = document.getElementById('ws-account'); if (!box) return;
    var user = storedUser();
    if (!user.id || !window.db || !window.db.getToken || !window.db.getToken()) {
      box.innerHTML = '<a href="/pages/landing.html?auth=login&amp;redirect=%2Finsubriefing%2Fworkstation%2F">로그인</a>'; return;
    }
    var name = (window.AppState && window.AppState.name) || user.name || '사용자';
    box.innerHTML = '<span>' + esc(name) + '</span><button type="button" id="ws-logout">로그아웃</button>';
    document.getElementById('ws-logout').addEventListener('click', function () {
      ['os_token', 'os_refresh_token', 'os_user', 'selected_menu'].forEach(function (key) { localStorage.removeItem(key); sessionStorage.removeItem(key); });
      window.location.replace('/insubriefing/');
    });
  }
  document.addEventListener('appstate:ready', renderAccount);
  renderAccount();
  var localPreview = (location.hostname === '127.0.0.1' || location.hostname === 'localhost') && new URLSearchParams(location.search).get('pwtest') === '1';
  if (!localPreview && window.db && window.db.getToken && window.db.getToken() && window.Auth && window.Auth.init) {
    window.Auth.init().catch(renderAccount);
  }
})();
