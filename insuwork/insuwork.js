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

/* 모바일 자동 전환 (2026-08-22, fix/workstation-mobile-autoredirect — 대표 실사용 재지시로 Phase 1
   "클릭해야 이동" 배너를 자동 리다이렉트로 교체. 폭 768px 미만이면 기본은 즉시 /m/로 이동한다.
   무한 루프 방지: 모바일 화면(/insuwork/m/*)의 "PC로 보기" 링크를 눌러 일부러 이
   PC 화면으로 돌아온 로드는 referrer로 감지해 이번 로드에 한해 자동 이동을 건너뛴다 — 그 파일들은
   이번 작업 범위 밖(다른 작업자 병행 중)이라 대신 referrer만으로 판별한다(완벽한 방어 아님, 대표
   1인 게이트 전용 화면이라 과설계하지 않음). referrer로 건너뛴 예외 상황에서만 기존 수동 배너를
   보조 안내로 남겨 모바일로 다시 갈 수단을 제공한다. 기존 렌더 로직·CSS는 건드리지 않는 별도 IIFE. */
(function () {
  'use strict';
  var MOBILE_PATH = '/insuwork/m/';
  var FLAG_KEY = 'iw_mobile_banner_dismissed'; // Phase 1 배너 잔재 — 자동 전환이 기본이 된 지금은 참고용

  function cameFromMobile() {
    try { return /\/insuwork\/m\//.test(document.referrer); } catch (_e) { return false; }
  }
  function dismissed() {
    try { return localStorage.getItem(FLAG_KEY) === '1'; } catch (_e) { return false; }
  }
  function hasSignedInSession() {
    var user = storedUser();
    return !!(user.id && window.db && window.db.getToken && window.db.getToken());
  }
  function dismiss() {
    var banner = document.getElementById('iw-mobile-banner');
    if (banner) banner.remove();
    try { localStorage.setItem(FLAG_KEY, '1'); } catch (_e) {}
  }
  function showBanner() {
    if (dismissed() || document.getElementById('iw-mobile-banner')) return;
    var banner = document.createElement('div');
    banner.id = 'iw-mobile-banner';
    banner.className = 'iw-mobile-banner';
    banner.setAttribute('role', 'status');
    banner.innerHTML = '<span>모바일 화면으로 보시겠어요?</span><a href="' + MOBILE_PATH + '">모바일로 이동</a><button type="button" aria-label="닫기">×</button>';
    document.body.appendChild(banner);
    var closeBtn = banner.querySelector('button');
    if (closeBtn) closeBtn.addEventListener('click', dismiss);
  }
  function run() {
    if (window.innerWidth >= 768) return;
    if (!hasSignedInSession()) return;
    if (cameFromMobile()) { showBanner(); return; } // PC로 보기를 직접 선택한 로드 — 자동 이동 건너뜀
    window.location.replace(MOBILE_PATH); // 히스토리 안 쌓고 즉시 이동
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
