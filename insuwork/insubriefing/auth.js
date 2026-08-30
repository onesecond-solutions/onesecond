(function () {
  'use strict';

  var state = {
    mode: 'login',
    step: 'form',
    email: '',
    signup: null,
    redirect: '/insuwork/',
    busy: false
  };

  var PKCE_KEY = 'ib_pkce_verifier';
  var OAUTH_REDIRECT_KEY = 'ib_oauth_redirect';
  var companyTimer = 0;
  var companyController = null;

  function dbUrl(path) {
    if (window.db && typeof window.db.url === 'function') return window.db.url(path);
    return (window.SUPABASE_URL || '') + path;
  }

  function dbKey() {
    return (window.db && window.db.key) || window.SUPABASE_KEY || '';
  }

  function safeRedirect(value) {
    if (!value) return '/insuwork/';
    try {
      var url = new URL(value, window.location.origin);
      if (url.origin !== window.location.origin) return '/insuwork/';
      return url.pathname + url.search + url.hash;
    } catch (_e) {
      return value.charAt(0) === '/' ? value : '/insuwork/';
    }
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  var noticeQueue = Promise.resolve();

  function noticeTask(task) {
    noticeQueue = noticeQueue.then(task, task);
    return noticeQueue;
  }

  function noticeDialog(options) {
    options = options || {};
    return noticeTask(function () {
      return new Promise(function (resolve) {
        var dialog = document.createElement('dialog');
        var type = options.type || 'alert';
        var title = options.title || '보험워크';
        var message = options.message || '';
        var confirmLabel = options.confirmLabel || '확인';
        var cancelLabel = options.cancelLabel || '취소';
        dialog.className = 'ib-notice-dialog' + (options.dangerous ? ' is-danger' : '') + (options.compact ? ' is-compact' : '');
        dialog.setAttribute('aria-label', title);
        dialog.innerHTML = ''
          + '<form class="ib-notice-card" method="dialog">'
          + '<span class="ib-notice-brand">보험워크</span>'
          + '<h2></h2>'
          + '<p></p>'
          + (type === 'prompt' ? '<input class="ib-notice-input" autocomplete="off" maxlength="60">' : '')
          + '<div class="ib-notice-actions">'
          + (type === 'alert' ? '' : '<button type="submit" value="cancel" class="ib-notice-secondary"></button>')
          + '<button type="submit" value="confirm" class="ib-notice-primary"></button>'
          + '</div></form>';
        dialog.querySelector('h2').textContent = title;
        dialog.querySelector('p').textContent = message;
        var secondary = dialog.querySelector('.ib-notice-secondary');
        var primary = dialog.querySelector('.ib-notice-primary');
        if (secondary) secondary.textContent = cancelLabel;
        primary.textContent = confirmLabel;
        document.body.appendChild(dialog);
        dialog.addEventListener('cancel', function (event) { event.preventDefault(); dialog.close('cancel'); });
        dialog.addEventListener('click', function (event) { if (event.target === dialog) dialog.close(type === 'alert' ? 'confirm' : 'cancel'); });
        dialog.addEventListener('close', function () {
          var input = dialog.querySelector('.ib-notice-input');
          var value = dialog.returnValue === 'confirm' ? (type === 'prompt' ? input.value : true) : false;
          dialog.remove();
          resolve(value);
        }, { once: true });
        dialog.showModal();
        var input = dialog.querySelector('.ib-notice-input');
        if (input) {
          input.value = options.defaultValue || '';
          window.setTimeout(function () { input.focus(); input.select(); }, 0);
        } else {
          window.setTimeout(function () { primary.focus(); }, 0);
        }
      });
    });
  }

  function noticeAlert(message, options) {
    options = options || {};
    return noticeDialog(Object.assign({}, options, { type: 'alert', title: options.title || '보험워크', message: message }));
  }

  function noticeConfirm(options) {
    return noticeDialog(Object.assign({ type: 'confirm', title: '보험워크', message: '', confirmLabel: '확인' }, options || {}));
  }

  function noticePrompt(options) {
    return noticeDialog(Object.assign({ type: 'prompt', title: '보험워크', message: '', confirmLabel: '확인' }, options || {}));
  }

  function noticeToast(message) {
    return noticeAlert(message, { compact: true });
  }

  function redirectFromUrl() {
    try {
      return safeRedirect(new URLSearchParams(window.location.search).get('redirect'));
    } catch (_e) {
      return '/insuwork/';
    }
  }

  function pkceVerifier() {
    var bytes = new Uint8Array(64);
    (window.crypto || window.msCrypto).getRandomValues(bytes);
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    var value = '';
    for (var i = 0; i < bytes.length; i += 1) value += chars[bytes[i] % chars.length];
    return value;
  }

  async function pkceChallenge(verifier) {
    var data = new TextEncoder().encode(verifier);
    var digest = await window.crypto.subtle.digest('SHA-256', data);
    var bytes = new Uint8Array(digest);
    var binary = '';
    for (var i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async function signInWithGoogle() {
    if (state.busy) return;
    setBusy(true);
    setStatus('Google 로그인으로 이동합니다.', '');
    try {
      var verifier = pkceVerifier();
      try {
        localStorage.setItem(PKCE_KEY, verifier);
        sessionStorage.setItem(PKCE_KEY, verifier);
        localStorage.setItem(OAUTH_REDIRECT_KEY, state.redirect || '/insuwork/');
      } catch (_e) {}
      var challenge = await pkceChallenge(verifier);
      var redirectTo = window.location.origin + window.location.pathname;
      var url = dbUrl('/auth/v1/authorize')
        + '?provider=google'
        + '&code_challenge=' + encodeURIComponent(challenge)
        + '&code_challenge_method=S256'
        + '&redirect_to=' + encodeURIComponent(redirectTo);
      window.location.href = url;
    } catch (_err) {
      setStatus('Google 로그인 시작 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', 'error');
      setBusy(false);
    }
  }

  async function handleOAuthCallback() {
    var hash = window.location.hash || '';
    try {
      var query = new URLSearchParams(window.location.search || '');
      var hashParams = new URLSearchParams(hash.substring(1));
      var error = query.get('error') || hashParams.get('error');
      if (error) {
        try { history.replaceState(null, '', window.location.pathname); } catch (_e) {}
        if (error !== 'access_denied') {
          noticeAlert('Google 로그인에 실패했습니다.\n\n같은 이메일이 이메일 코드 로그인으로 이미 가입돼 있으면 이메일 인증번호 로그인을 이용해 주세요.', { title: 'Google 로그인 실패' });
        }
        return;
      }
    } catch (_e) {}

    var code = '';
    try { code = new URLSearchParams(window.location.search || '').get('code') || ''; } catch (_e) {}
    if (code && hash.indexOf('access_token=') === -1) {
      var verifier = '';
      try { verifier = localStorage.getItem(PKCE_KEY) || sessionStorage.getItem(PKCE_KEY) || ''; } catch (_e) {}
      if (!verifier) return;
      try {
        var res = await fetch(dbUrl('/auth/v1/token?grant_type=pkce'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': dbKey() },
          body: JSON.stringify({ auth_code: code, code_verifier: verifier })
        });
        if (!res.ok) return;
        var data = await res.json();
        await storeSession(data);
        try {
          localStorage.removeItem(PKCE_KEY);
          sessionStorage.removeItem(PKCE_KEY);
        } catch (_e) {}
        var next = '/insuwork/';
        try { next = safeRedirect(localStorage.getItem(OAUTH_REDIRECT_KEY) || next); localStorage.removeItem(OAUTH_REDIRECT_KEY); } catch (_e) {}
        try { history.replaceState(null, '', window.location.pathname); } catch (_e) {}
        window.location.href = next;
      } catch (_err) {}
      return;
    }

    if (hash.indexOf('access_token=') === -1) return;
    try {
      var params = new URLSearchParams(hash.substring(1));
      var accessToken = params.get('access_token');
      if (!accessToken) return;
      var payload = JSON.parse(atob(accessToken.split('.')[1]));
      await storeSession({
        access_token: accessToken,
        refresh_token: params.get('refresh_token') || '',
        user: {
          id: payload.sub,
          email: payload.email || '',
          user_metadata: payload.user_metadata || {}
        }
      });
      var fallback = '/insuwork/';
      try { fallback = safeRedirect(localStorage.getItem(OAUTH_REDIRECT_KEY) || fallback); localStorage.removeItem(OAUTH_REDIRECT_KEY); } catch (_e) {}
      try { history.replaceState(null, '', window.location.pathname); } catch (_e) {}
      window.location.href = fallback;
    } catch (_err) {}
  }

  function ensureDialog() {
    var dialog = document.getElementById('ib-auth-dialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'ib-auth-dialog';
    dialog.id = 'ib-auth-dialog';
    dialog.setAttribute('aria-labelledby', 'ib-auth-title');
    dialog.innerHTML = ''
      + '<form class="ib-auth-card" method="dialog" id="ib-auth-form" novalidate>'
      + '<div class="ib-auth-head"><div>'
      + '<img src="/insuwork/assets/brand/insurance-work-logo-ci.png?v=20260830ci" alt="보험워크">'
      + '<h2 id="ib-auth-title">보험워크 시작하기</h2>'
      + '<p id="ib-auth-desc"></p></div>'
      + '<button type="button" class="ib-auth-close" aria-label="닫기">×</button></div>'
      + '<div class="ib-auth-tabs" role="tablist" aria-label="인증 방식">'
      + '<button type="button" data-ib-auth-mode="login">로그인</button>'
      + '<button type="button" data-ib-auth-mode="signup">회원가입</button></div>'
      + '<div class="ib-auth-form" id="ib-auth-fields"></div>'
      + '<p class="ib-auth-status" id="ib-auth-status" role="status"></p>'
      + '<div class="ib-auth-actions" id="ib-auth-actions"></div>'
      + '</form>';
    document.body.appendChild(dialog);
    dialog.querySelector('.ib-auth-close').addEventListener('click', close);
    dialog.addEventListener('cancel', function () { state.busy = false; });
    dialog.querySelector('#ib-auth-form').addEventListener('submit', function (event) {
      event.preventDefault();
      if (state.step === 'otp') verifyOtp();
      else sendOtp();
    });
    dialog.addEventListener('click', function (event) {
      var modeButton = event.target.closest('[data-ib-auth-mode]');
      if (modeButton) {
        setMode(modeButton.getAttribute('data-ib-auth-mode'));
        return;
      }
      if (event.target.closest('[data-ib-auth-send]')) sendOtp();
      if (event.target.closest('[data-ib-auth-verify]')) verifyOtp();
      if (event.target.closest('[data-ib-auth-resend]')) resendOtp();
      if (event.target.closest('[data-ib-auth-google]')) signInWithGoogle();
      if (event.target.closest('[data-ib-company-pick]')) pickCompany(event.target.closest('[data-ib-company-pick]'));
      if (event.target.closest('[data-ib-auth-back]')) {
        state.step = 'form';
        state.busy = false;
        render();
      }
    });
    return dialog;
  }

  function setStatus(message, tone) {
    var status = document.getElementById('ib-auth-status');
    if (!status) return;
    status.textContent = message || '';
    status.classList.toggle('is-error', tone === 'error');
    status.classList.toggle('is-success', tone === 'success');
  }

  function setBusy(nextBusy) {
    state.busy = !!nextBusy;
    Array.prototype.forEach.call(document.querySelectorAll('#ib-auth-dialog button'), function (button) {
      if (button.classList.contains('ib-auth-close') || button.hasAttribute('data-ib-auth-mode')) return;
      button.disabled = state.busy;
    });
    Array.prototype.forEach.call(document.querySelectorAll('#ib-auth-dialog input'), function (input) {
      input.disabled = state.busy;
    });
    syncAgreementState();
  }

  function agreementsAccepted() {
    if (state.mode !== 'signup' || state.step !== 'form') return true;
    var terms = document.getElementById('ib-auth-agree-terms');
    var privacy = document.getElementById('ib-auth-agree-privacy');
    return !!(terms && terms.checked && privacy && privacy.checked);
  }

  function syncAgreementState() {
    var send = document.querySelector('[data-ib-auth-send]');
    if (send && state.mode === 'signup' && state.step === 'form') send.disabled = state.busy || !agreementsAccepted();
    var all = document.getElementById('ib-auth-agree-all');
    var terms = document.getElementById('ib-auth-agree-terms');
    var privacy = document.getElementById('ib-auth-agree-privacy');
    if (all && terms && privacy) {
      all.checked = terms.checked && privacy.checked;
      all.indeterminate = !all.checked && (terms.checked || privacy.checked);
    }
  }

  function clearCompanyList() {
    var list = document.getElementById('ib-auth-company-list');
    if (!list) return;
    list.hidden = true;
    list.innerHTML = '';
  }

  function companyListItem(row) {
    return '<button type="button" class="ib-auth-company-item" data-ib-company-pick data-company-id="' + esc(row.id || '') + '" data-company-name="' + esc(row.name || '') + '">' + esc(row.name || '') + '</button>';
  }

  async function fetchCompanySuggestions(query) {
    if (companyController) {
      try { companyController.abort(); } catch (_e) {}
    }
    companyController = new AbortController();
    var list = document.getElementById('ib-auth-company-list');
    if (!list) return;
    try {
      var res = await fetch(dbUrl('/rest/v1/companies?select=id,name&search_text=ilike.*' + encodeURIComponent(query) + '*&order=agent_count.desc.nullslast&limit=10'), {
        headers: { 'apikey': dbKey() },
        signal: companyController.signal
      });
      if (!res.ok) { clearCompanyList(); return; }
      var rows = await res.json();
      if (!Array.isArray(rows) || !rows.length) { clearCompanyList(); return; }
      list.innerHTML = rows.map(companyListItem).join('');
      list.hidden = false;
    } catch (error) {
      if (!error || error.name !== 'AbortError') clearCompanyList();
    }
  }

  function companyInputChanged() {
    var input = document.getElementById('ib-auth-company');
    var id = document.getElementById('ib-auth-company-id');
    if (id) id.value = '';
    if (companyTimer) clearTimeout(companyTimer);
    var query = input ? input.value.trim() : '';
    if (query.length < 2) { clearCompanyList(); return; }
    companyTimer = setTimeout(function () { fetchCompanySuggestions(query); }, 180);
  }

  function pickCompany(button) {
    if (!button) return;
    var input = document.getElementById('ib-auth-company');
    var id = document.getElementById('ib-auth-company-id');
    if (input) input.value = button.getAttribute('data-company-name') || '';
    if (id) id.value = button.getAttribute('data-company-id') || '';
    clearCompanyList();
  }

  function companyKeydown(event) {
    var list = document.getElementById('ib-auth-company-list');
    if (!list || list.hidden) return;
    var items = Array.prototype.slice.call(list.querySelectorAll('.ib-auth-company-item'));
    if (!items.length) return;
    var current = items.findIndex(function (item) { return item.classList.contains('active'); });
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      items.forEach(function (item) { item.classList.remove('active'); });
      items[(current + 1) % items.length].classList.add('active');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      items.forEach(function (item) { item.classList.remove('active'); });
      items[current <= 0 ? items.length - 1 : current - 1].classList.add('active');
    } else if (event.key === 'Enter') {
      event.preventDefault();
      pickCompany(items[current >= 0 ? current : 0]);
    } else if (event.key === 'Escape') {
      clearCompanyList();
    }
  }

  function setMode(mode) {
    state.mode = mode === 'signup' ? 'signup' : 'login';
    state.step = 'form';
    state.busy = false;
    state.email = '';
    state.signup = null;
    render();
  }

  function render() {
    ensureDialog();
    Array.prototype.forEach.call(document.querySelectorAll('[data-ib-auth-mode]'), function (button) {
      button.classList.toggle('on', button.getAttribute('data-ib-auth-mode') === state.mode);
    });
    var desc = document.getElementById('ib-auth-desc');
    var fields = document.getElementById('ib-auth-fields');
    var actions = document.getElementById('ib-auth-actions');
    var title = document.getElementById('ib-auth-title');
    var googleButton = '<div class="ib-auth-google-wrap"><button class="ib-auth-google" type="button" data-ib-auth-google>'
      + '<svg class="ib-auth-google-icon" viewBox="0 0 18 18" aria-hidden="true" focusable="false">'
      + '<path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.24-.16-1.82H9v3.44h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.6Z"/>'
      + '<path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z"/>'
      + '<path fill="#FBBC05" d="M3.95 10.68A5.41 5.41 0 0 1 3.67 9c0-.58.1-1.15.28-1.68V4.99H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.01l2.99-2.33Z"/>'
      + '<path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.43 1.34L15 2.35A8.96 8.96 0 0 0 9 0 9 9 0 0 0 .96 4.99l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z"/>'
      + '</svg><span>Google로 시작하기</span></button><p>구글 계정으로 한 번에 로그인</p></div>';
    if (state.step === 'otp') {
      title.textContent = '이메일 인증';
      desc.innerHTML = '<strong>' + esc(state.email) + '</strong> 주소로 보낸 이메일 6자리 인증번호를 입력하세요.';
      fields.innerHTML = '<label class="ib-auth-field">인증번호<input class="ib-auth-otp" id="ib-auth-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></label>';
      actions.innerHTML = '<button class="ib-auth-primary" type="submit" data-ib-auth-verify>이메일 인증번호 확인</button>'
        + '<button class="ib-auth-secondary" type="button" data-ib-auth-resend>이메일 인증번호 재전송</button>'
        + '<button class="ib-auth-secondary" type="button" data-ib-auth-back>이메일 다시 입력</button>';
      setStatus('', '');
      setTimeout(function () {
        var code = document.getElementById('ib-auth-code');
        if (code) code.focus();
      }, 50);
      return;
    }
    if (state.mode === 'signup') {
      title.textContent = '보험워크 회원가입';
      desc.textContent = '이름, 연락처, 이메일, 소속회사명 확인 후 바로 가입됩니다.';
      fields.innerHTML = '<label class="ib-auth-field">이름<input id="ib-auth-name" type="text" autocomplete="name" maxlength="30" required></label>'
        + '<label class="ib-auth-field">전화번호<input id="ib-auth-phone" type="tel" autocomplete="tel" maxlength="20" placeholder="010-0000-0000" required></label>'
        + '<label class="ib-auth-field">이메일<input id="ib-auth-email" type="email" autocomplete="email" required></label>'
        + '<label class="ib-auth-field ib-auth-company-wrap">소속회사명<input id="ib-auth-company" type="text" autocomplete="organization" maxlength="50" placeholder="회사명을 입력하세요" required><input id="ib-auth-company-id" type="hidden"><span class="ib-auth-company-list" id="ib-auth-company-list" hidden></span></label>'
        + '<div class="ib-auth-agreements" aria-label="회원가입 필수 동의">'
        + '<label class="ib-auth-agree-all"><input id="ib-auth-agree-all" type="checkbox"><span>전체 동의</span></label>'
        + '<div class="ib-auth-agree-items">'
        + '<label><input id="ib-auth-agree-terms" type="checkbox" required><span>[필수] 이용약관 동의</span><a href="/insuwork/terms.html" target="_blank" rel="noopener">내용 보기</a></label>'
        + '<label><input id="ib-auth-agree-privacy" type="checkbox" required><span>[필수] 개인정보 수집·이용 동의</span><a href="/insuwork/privacy.html" target="_blank" rel="noopener">내용 보기</a></label>'
        + '</div></div>';
      actions.innerHTML = '<button class="ib-auth-primary" type="submit" data-ib-auth-send disabled>이메일 인증번호 받기</button>';
    } else {
      title.textContent = '보험워크 로그인';
      desc.textContent = '기존 원세컨드 가입자는 같은 이메일로 로그인할 수 있습니다.';
      fields.innerHTML = '<label class="ib-auth-field">이메일<input id="ib-auth-email" type="email" autocomplete="email" required></label>';
      actions.innerHTML = googleButton
        + '<div class="ib-auth-divider"><span>또는</span></div>'
        + '<button class="ib-auth-primary" type="submit" data-ib-auth-send>이메일 인증번호 받기</button>';
    }
    setStatus('', '');
    setTimeout(function () {
      var first = document.querySelector('#ib-auth-fields input');
      if (first) first.focus();
      var company = document.getElementById('ib-auth-company');
      if (company) {
        company.addEventListener('input', companyInputChanged);
        company.addEventListener('keydown', companyKeydown);
        company.addEventListener('blur', function () { setTimeout(clearCompanyList, 160); });
      }
      var agreeAll = document.getElementById('ib-auth-agree-all');
      var agreeTerms = document.getElementById('ib-auth-agree-terms');
      var agreePrivacy = document.getElementById('ib-auth-agree-privacy');
      if (agreeAll) agreeAll.addEventListener('change', function () {
        agreeTerms.checked = agreeAll.checked;
        agreePrivacy.checked = agreeAll.checked;
        syncAgreementState();
      });
      if (agreeTerms) agreeTerms.addEventListener('change', syncAgreementState);
      if (agreePrivacy) agreePrivacy.addEventListener('change', syncAgreementState);
      syncAgreementState();
    }, 50);
  }

  function open(mode, options) {
    state.redirect = safeRedirect((options && options.redirect) || redirectFromUrl());
    state.mode = mode === 'signup' ? 'signup' : 'login';
    state.step = 'form';
    state.busy = false;
    render();
    var dialog = ensureDialog();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function close() {
    var dialog = document.getElementById('ib-auth-dialog');
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function readForm() {
    var emailEl = document.getElementById('ib-auth-email');
    var email = emailEl ? emailEl.value.trim() : '';
    var result = { email: email };
    if (state.mode === 'signup') {
      var nameEl = document.getElementById('ib-auth-name');
      var phoneEl = document.getElementById('ib-auth-phone');
      var companyEl = document.getElementById('ib-auth-company');
      var companyIdEl = document.getElementById('ib-auth-company-id');
      result.name = nameEl ? nameEl.value.trim() : '';
      result.phone = phoneEl ? phoneEl.value.trim() : '';
      result.company = companyEl ? companyEl.value.trim() : '';
      result.companyId = companyIdEl ? companyIdEl.value.trim() : '';
    }
    return result;
  }

  function otpBody() {
    if (state.mode !== 'signup') return { email: state.email, create_user: false };
    return {
      email: state.email,
      create_user: true,
      data: {
        email: state.email,
        name: state.signup.name,
        phone: state.signup.phone,
        company: state.signup.company,
        company_id: state.signup.companyId,
        terms_agreed_at: new Date().toISOString(),
        terms_version: '2026-08-27',
        privacy_agreed_at: new Date().toISOString(),
        privacy_version: '2026-08-27',
        role: 'ga_member',
        status: 'active',
        site: 'insuwork',
        service_name: '보험워크'
      }
    };
  }

  async function sendOtp() {
    if (state.busy) return;
    var form = readForm();
    if (!validEmail(form.email)) {
      setStatus('이메일 주소를 정확히 입력해 주세요.', 'error');
      return;
    }
    if (state.mode === 'signup') {
      if (!agreementsAccepted()) {
        setStatus('이용약관과 개인정보 수집·이용에 모두 동의해 주세요.', 'error');
        return;
      }
      if (!form.name) {
        setStatus('이름을 입력해 주세요.', 'error');
        return;
      }
      if (form.phone.replace(/\D/g, '').length < 9) {
        setStatus('전화번호를 정확히 입력해 주세요.', 'error');
        return;
      }
      if (!form.company) {
        setStatus('소속회사명을 입력해 주세요.', 'error');
        return;
      }
      state.signup = { name: form.name, phone: form.phone, company: form.company, companyId: form.companyId };
    } else {
      state.signup = null;
    }
    state.email = form.email;
    setBusy(true);
    setStatus('이메일 인증번호를 발송하고 있습니다.', '');
    try {
      var res = await fetch(dbUrl('/auth/v1/otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': dbKey() },
        body: JSON.stringify(otpBody())
      });
      if (!res.ok) {
        var data = {};
        try { data = await res.json(); } catch (_e) {}
        var msg = String(data.error_description || data.msg || data.error || '').toLowerCase();
        if (res.status === 429 || msg.indexOf('too many') !== -1) {
          setStatus('요청이 많습니다. 잠시 후 다시 시도해 주세요.', 'error');
        } else if (state.mode === 'login' && (msg.indexOf('not found') !== -1 || msg.indexOf('signup') !== -1 || res.status === 400)) {
          setStatus('가입되지 않은 이메일이면 회원가입 탭에서 진행해 주세요.', 'error');
        } else {
          setStatus('인증번호 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.', 'error');
        }
        setBusy(false);
        return;
      }
      state.step = 'otp';
      state.busy = false;
      render();
    } catch (_e) {
      setStatus('네트워크 오류가 발생했습니다. 연결을 확인해 주세요.', 'error');
      setBusy(false);
    }
  }

  async function resendOtp() {
    if (state.busy || !state.email) return;
    setBusy(true);
    setStatus('이메일 인증번호를 다시 발송하고 있습니다.', '');
    try {
      var res = await fetch(dbUrl('/auth/v1/otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': dbKey() },
        body: JSON.stringify(otpBody())
      });
      setStatus(res.ok ? '이메일 인증번호를 다시 보냈습니다.' : '재전송하지 못했습니다. 잠시 후 다시 시도해 주세요.', res.ok ? 'success' : 'error');
    } catch (_e) {
      setStatus('네트워크 오류가 발생했습니다.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function patchProfile(accessToken, userObj) {
    if (!accessToken || !userObj || !userObj.id || !state.signup) return userObj || {};
    var fields = {
      name: state.signup.name,
      phone: state.signup.phone,
      email: state.email,
      company: state.signup.company,
      role: 'ga_member',
      status: 'active'
    };
    try {
      await fetch(dbUrl('/rest/v1/users?id=eq.' + encodeURIComponent(userObj.id)), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
          'apikey': dbKey(),
          'Authorization': 'Bearer ' + accessToken
        },
        body: JSON.stringify(fields)
      });
    } catch (_e) {}
    return Object.assign({}, userObj, fields);
  }

  async function storeSession(data) {
    var userObj = data.user || {};
    userObj.email = userObj.email || state.email;
    if (window.db && typeof window.db.mergeUserProfile === 'function') {
      try { userObj = await window.db.mergeUserProfile(userObj, data.access_token); } catch (_e) {}
    }
    userObj = await patchProfile(data.access_token, userObj);
    localStorage.setItem('os_token', data.access_token);
    localStorage.setItem('os_refresh_token', data.refresh_token || '');
    localStorage.setItem('os_user', JSON.stringify(userObj));
    sessionStorage.setItem('os_token', data.access_token);
    sessionStorage.setItem('os_user', JSON.stringify(userObj));
  }

  async function verifyOtp() {
    if (state.busy) return;
    var codeEl = document.getElementById('ib-auth-code');
    var code = codeEl ? codeEl.value.trim() : '';
    if (!/^\d{6}$/.test(code)) {
      setStatus('이메일로 받은 6자리 인증번호를 입력해 주세요.', 'error');
      if (codeEl) codeEl.focus();
      return;
    }
    setBusy(true);
    setStatus('이메일 인증번호를 확인하고 있습니다.', '');
    try {
      var res = await fetch(dbUrl('/auth/v1/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': dbKey() },
        body: JSON.stringify({ email: state.email, token: code, type: 'email' })
      });
      var data = {};
      try { data = await res.json(); } catch (_e) {}
      if (!res.ok || !data.access_token) {
        setStatus(res.status === 429 ? '요청이 많습니다. 잠시 후 다시 시도해 주세요.' : '인증번호가 일치하지 않거나 만료됐습니다.', 'error');
        setBusy(false);
        if (codeEl) {
          codeEl.focus();
          codeEl.select();
        }
        return;
      }
      await storeSession(data);
      setStatus('인증이 완료됐습니다. 보험워크로 이동합니다.', 'success');
      setTimeout(function () {
        window.location.href = state.redirect || '/insuwork/';
      }, 700);
    } catch (_e) {
      setStatus('네트워크 오류가 발생했습니다.', 'error');
      setBusy(false);
    }
  }

  window.InsuranceBriefingAuth = {
    open: open,
    close: close,
    signInWithGoogle: signInWithGoogle,
    sendOtp: sendOtp,
    verifyOtp: verifyOtp
  };
  window.InsuranceBriefingNotice = {
    alert: noticeAlert,
    confirm: noticeConfirm,
    prompt: noticePrompt,
    toast: noticeToast
  };
  window.toast = noticeToast;

  handleOAuthCallback();
})();
