(function () {
  'use strict';
  function storedUser() { try { return JSON.parse(localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}'); } catch (_e) { return {}; } }
  function esc(value) { return String(value || '').replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }
  function closeAccountMenu() { var menu = document.getElementById('iw-account-popover'), trigger = document.getElementById('iw-account-trigger'); if (menu) menu.hidden = true; if (trigger) trigger.setAttribute('aria-expanded', 'false'); }
  function currentBgMode() { try { return localStorage.getItem('iw_bg_mode') || 'white'; } catch (_e) { return 'white'; } }
  function applyBgMode(mode) {
    var body = document.body;
    body.classList.remove('iw-bg-flat', 'iw-bg-white', 'iw-bg-dark', 'iw-bg-namsan', 'iw-bg-window');
    if (mode === 'white') body.classList.add('iw-bg-flat', 'iw-bg-white');
    else if (mode === 'dark') body.classList.add('iw-bg-flat', 'iw-bg-dark');
    else if (mode === 'namsan') body.classList.add('iw-bg-namsan');
    else if (mode === 'window') body.classList.add('iw-bg-flat', 'iw-bg-window');
    document.documentElement.setAttribute('data-theme', mode === 'dark' ? 'dark' : 'light');
    try { localStorage.setItem('iw_bg_mode', mode); } catch (_e) {}
    if (window.OSInsuworkWindow) window.OSInsuworkWindow.boot(mode === 'window');
  }
  function bgModeButtonsHtml(active) {
    var modes = [
      ['white', '화이트', null],
      ['dark', '다크', null],
      ['image', '이미지', '/insuwork/insubriefing/assets/generated/briefing-toss-hero.webp'],
      ['namsan', '남산', '/insuwork/insubriefing/assets/generated/namsan-sunny.webp'],
      ['window', '창문', null]
    ];
    return modes.map(function (m) {
      var swatchStyle = m[2] ? ' style="background-image:url(&quot;' + m[2] + '&quot;)"' : '';
      return '<button type="button" class="iw-bgmode-btn' + (m[0] === active ? ' on' : '') + '" data-bg="' + m[0] + '" aria-pressed="' + (m[0] === active) + '"><span class="iw-bgmode-swatch iw-bgmode-swatch-' + m[0] + '"' + swatchStyle + '></span><span class="iw-bgmode-lbl">' + m[1] + '</span></button>';
    }).join('');
  }
  applyBgMode(currentBgMode());
  function logout() {
    ['os_token', 'os_refresh_token', 'os_user', 'selected_menu'].forEach(function (key) { localStorage.removeItem(key); sessionStorage.removeItem(key); });
    window.location.replace('/insuwork/insubriefing/');
  }
  function openProfile() {
    closeAccountMenu();
    var dialog = document.getElementById('iw-profile-dialog'); if (!dialog) return;
    var user = storedUser(), state = window.AppState || {};
    document.getElementById('iw-profile-name').value = state.name || user.name || (user.user_metadata && user.user_metadata.name) || '';
    document.getElementById('iw-profile-phone').value = state.phone || user.phone || (user.user_metadata && user.user_metadata.phone) || '';
    document.getElementById('iw-profile-nickname').value = state.nickname || user.nickname || (user.user_metadata && user.user_metadata.nickname) || '';
    document.getElementById('iw-profile-message').textContent = '';
    dialog.showModal();
  }
  /* 2026-08-25 대표 승인 — 비로그인 우측 상단 버튼: 기존 /pages/landing.html 이동 대신 보험브리핑의
     기존 Google 로그인 흐름(insubriefing/auth.js의 InsuranceBriefingAuth.open, signInWithGoogle())을
     그대로 재사용한다. 새 OAuth 클라이언트를 만들지 않고 기존 Supabase Auth/Google OAuth 설정을 그대로
     쓴다. auth.js가 아직 로드되지 않은 극히 짧은 순간(스크립트 defer 로딩 중)을 대비해 fallback으로
     기존 /pages/landing.html 링크를 유지한다. */
  function openLogin() {
    var redirect = location.pathname + location.search;
    if (window.InsuranceBriefingAuth && typeof window.InsuranceBriefingAuth.open === 'function') { window.InsuranceBriefingAuth.open('login', { redirect: redirect }); return; }
    window.location.href = '/pages/landing.html?auth=login&redirect=' + encodeURIComponent(redirect);
  }
  function renderAccount() {
    var box = document.getElementById('iw-account'); if (!box) return;
    var user = storedUser();
    if (!user.id || !window.db || !window.db.getToken || !window.db.getToken()) {
      box.innerHTML = '<button type="button" class="iw-account-trigger" id="iw-account-login">로그인</button>';
      var loginBtn = document.getElementById('iw-account-login');
      if (loginBtn) loginBtn.addEventListener('click', openLogin);
      return;
    }
    var name = (window.AppState && window.AppState.name) || user.name || '사용자';
    var email = (window.AppState && window.AppState.email) || user.email || (user.user_metadata && user.user_metadata.email) || '';
    var nickname = (window.AppState && window.AppState.nickname) || user.nickname || '';
    var emailLine = esc(email || '이메일 정보 없음') + (nickname ? ' | ' + esc(nickname) : '');
    var adminMenu = String(email || '').toLowerCase() === 'bylts@naver.com' ? '<div class="iw-account-group"><button type="button" id="iw-admin-users-open" role="menuitem">사용자 관리</button></div>' : '';
    box.innerHTML = '<button type="button" class="iw-account-trigger" id="iw-account-trigger" aria-haspopup="menu" aria-expanded="false">' + esc(name) + '</button><div class="iw-account-popover" id="iw-account-popover" role="menu" hidden><div class="iw-account-email" aria-label="로그인된 이메일 주소"><span>' + emailLine + '</span><a class="iw-account-legal" href="/insuwork/business-info.html" target="_blank" rel="noopener">사업자정보</a></div><div class="iw-account-group"><div class="iw-account-bgmode"><span>배경화면</span><div class="iw-bgmode-options" role="group" aria-label="배경화면 모드">' + bgModeButtonsHtml(currentBgMode()) + '</div></div></div>' + adminMenu + '<div class="iw-account-group"><button type="button" id="iw-profile-open" role="menuitem">개인정보 수정</button></div><div class="iw-account-group"><button type="button" id="iw-logout" role="menuitem">로그아웃</button></div></div>';
    document.getElementById('iw-account-trigger').addEventListener('click', function () { var menu = document.getElementById('iw-account-popover'), open = menu.hidden; closeAccountMenu(); menu.hidden = !open; this.setAttribute('aria-expanded', String(open)); });
    var adminUsersBtn = document.getElementById('iw-admin-users-open'); if (adminUsersBtn) adminUsersBtn.addEventListener('click', function () { closeAccountMenu(); if (window.OSInsuwork && window.OSInsuwork.go) window.OSInsuwork.go('admin-users'); });
    document.getElementById('iw-profile-open').addEventListener('click', openProfile);
    document.getElementById('iw-logout').addEventListener('click', logout);
    Array.prototype.forEach.call(box.querySelectorAll('.iw-bgmode-btn'), function (btn) {
      btn.addEventListener('click', function () {
        applyBgMode(btn.getAttribute('data-bg'));
        Array.prototype.forEach.call(box.querySelectorAll('.iw-bgmode-btn'), function (b) { b.classList.toggle('on', b === btn); });
      });
    });
  }
  document.addEventListener('click', function (event) { var box = document.getElementById('iw-account'); if (box && !box.contains(event.target)) closeAccountMenu(); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeAccountMenu(); });
  var profileDialog = document.getElementById('iw-profile-dialog');
  if (profileDialog) {
    profileDialog.querySelector('.iw-profile-close').addEventListener('click', function () { profileDialog.close(); });
    profileDialog.querySelector('.iw-profile-cancel').addEventListener('click', function () { profileDialog.close(); });
    document.getElementById('iw-profile-form').addEventListener('submit', function (event) {
      event.preventDefault();
      var name = document.getElementById('iw-profile-name').value.trim(), phone = document.getElementById('iw-profile-phone').value.trim(), nickname = document.getElementById('iw-profile-nickname').value.trim(), message = document.getElementById('iw-profile-message');
      if (!name) { message.textContent = '이름을 입력해 주세요.'; return; }
      message.textContent = '저장 중입니다.';
      if (!window.Auth || !window.Auth.saveUser) { message.textContent = '사용자 정보를 불러온 뒤 다시 시도해 주세요.'; return; }
      window.Auth.saveUser({ name: name, phone: phone || null, nickname: nickname || null }).then(function (ok) {
        if (!ok) { message.textContent = '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'; return; }
        var user = storedUser(); user.name = name; user.phone = phone; user.nickname = nickname; user.user_metadata = Object.assign({}, user.user_metadata || {}, { name: name, phone: phone, nickname: nickname });
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

