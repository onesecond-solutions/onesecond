(function () {
  'use strict';
  function storedUser() { try { return JSON.parse(localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}'); } catch (_e) { return {}; } }
  function esc(value) { return String(value || '').replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function closeAccountMenu() { var menu = document.getElementById('ws-account-popover'), trigger = document.getElementById('ws-account-trigger'); if (menu) menu.hidden = true; if (trigger) trigger.setAttribute('aria-expanded', 'false'); }
  function currentBgMode() { try { return localStorage.getItem('ws_bg_mode') || 'image'; } catch (_e) { return 'image'; } }
  function applyBgMode(mode) {
    var body = document.body;
    body.classList.remove('ws-bg-flat', 'ws-bg-white', 'ws-bg-dark', 'ws-bg-namsan');
    if (mode === 'white') body.classList.add('ws-bg-flat', 'ws-bg-white');
    else if (mode === 'dark') body.classList.add('ws-bg-flat', 'ws-bg-dark');
    else if (mode === 'namsan') body.classList.add('ws-bg-namsan');
    document.documentElement.setAttribute('data-theme', mode === 'dark' ? 'dark' : 'light');
    try { localStorage.setItem('ws_bg_mode', mode); } catch (_e) {}
  }
  function bgModeButtonsHtml(active) {
    var modes = [['image', '기본이미지'], ['namsan', '남산'], ['white', '화이트'], ['dark', '다크']];
    return modes.map(function (m) { return '<button type="button" class="ws-bgmode-btn' + (m[0] === active ? ' on' : '') + '" data-bg="' + m[0] + '">' + m[1] + '</button>'; }).join('');
  }
  applyBgMode(currentBgMode());
  function logout() {
    ['os_token', 'os_refresh_token', 'os_user', 'selected_menu'].forEach(function (key) { localStorage.removeItem(key); sessionStorage.removeItem(key); });
    window.location.replace('/insubriefing/');
  }
  function openProfile() {
    closeAccountMenu();
    var dialog = document.getElementById('ws-profile-dialog'); if (!dialog) return;
    var user = storedUser(), state = window.AppState || {};
    document.getElementById('ws-profile-name').value = state.name || user.name || (user.user_metadata && user.user_metadata.name) || '';
    document.getElementById('ws-profile-phone').value = state.phone || user.phone || (user.user_metadata && user.user_metadata.phone) || '';
    document.getElementById('ws-profile-message').textContent = '';
    dialog.showModal();
  }
  function renderAccount() {
    var box = document.getElementById('ws-account'); if (!box) return;
    var user = storedUser();
    if (!user.id || !window.db || !window.db.getToken || !window.db.getToken()) {
      box.innerHTML = '<a href="/pages/landing.html?auth=login&amp;redirect=%2Finsubriefing%2Fworkstation%2F">로그인</a>'; return;
    }
    var name = (window.AppState && window.AppState.name) || user.name || '사용자';
    var email = (window.AppState && window.AppState.email) || user.email || '';
    box.innerHTML = '<button type="button" class="ws-account-trigger" id="ws-account-trigger" aria-haspopup="menu" aria-expanded="false">' + esc(name) + '</button><div class="ws-account-popover" id="ws-account-popover" role="menu" hidden><div class="ws-account-email" aria-label="로그인된 이메일 주소">' + esc(email || '이메일 정보 없음') + '</div><div class="ws-account-bgmode"><span>배경화면</span><div class="ws-bgmode-options" role="group" aria-label="배경화면 모드">' + bgModeButtonsHtml(currentBgMode()) + '</div></div><button type="button" id="ws-profile-open" role="menuitem">개인정보 수정</button><button type="button" id="ws-logout" role="menuitem">로그아웃</button></div>';
    document.getElementById('ws-account-trigger').addEventListener('click', function () { var menu = document.getElementById('ws-account-popover'), open = menu.hidden; closeAccountMenu(); menu.hidden = !open; this.setAttribute('aria-expanded', String(open)); });
    document.getElementById('ws-profile-open').addEventListener('click', openProfile);
    document.getElementById('ws-logout').addEventListener('click', logout);
    Array.prototype.forEach.call(box.querySelectorAll('.ws-bgmode-btn'), function (btn) {
      btn.addEventListener('click', function () {
        applyBgMode(btn.getAttribute('data-bg'));
        Array.prototype.forEach.call(box.querySelectorAll('.ws-bgmode-btn'), function (b) { b.classList.toggle('on', b === btn); });
      });
    });
  }
  document.addEventListener('click', function (event) { var box = document.getElementById('ws-account'); if (box && !box.contains(event.target)) closeAccountMenu(); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeAccountMenu(); });
  var profileDialog = document.getElementById('ws-profile-dialog');
  if (profileDialog) {
    profileDialog.querySelector('.ws-profile-close').addEventListener('click', function () { profileDialog.close(); });
    profileDialog.querySelector('.ws-profile-cancel').addEventListener('click', function () { profileDialog.close(); });
    document.getElementById('ws-profile-form').addEventListener('submit', function (event) {
      event.preventDefault();
      var name = document.getElementById('ws-profile-name').value.trim(), phone = document.getElementById('ws-profile-phone').value.trim(), message = document.getElementById('ws-profile-message');
      if (!name) { message.textContent = '이름을 입력해 주세요.'; return; }
      message.textContent = '저장 중입니다.';
      if (!window.Auth || !window.Auth.saveUser) { message.textContent = '사용자 정보를 불러온 뒤 다시 시도해 주세요.'; return; }
      window.Auth.saveUser({ name: name, phone: phone || null }).then(function (ok) {
        if (!ok) { message.textContent = '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'; return; }
        var user = storedUser(); user.name = name; user.phone = phone; user.user_metadata = Object.assign({}, user.user_metadata || {}, { name: name, phone: phone });
        localStorage.setItem('os_user', JSON.stringify(user)); sessionStorage.setItem('os_user', JSON.stringify(user));
        renderAccount(); profileDialog.close();
      });
    });
  }
  document.addEventListener('appstate:ready', renderAccount);
  renderAccount();
  var localPreview = (location.hostname === '127.0.0.1' || location.hostname === 'localhost') && new URLSearchParams(location.search).get('pwtest') === '1';
  if (!localPreview && window.db && window.db.getToken && window.db.getToken() && window.Auth && window.Auth.init) {
    window.Auth.init().catch(renderAccount);
  }
})();
