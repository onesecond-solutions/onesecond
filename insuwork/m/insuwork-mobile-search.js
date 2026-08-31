/* insuwork/m/insuwork-mobile-search.js
   보험워크 모바일 공통 검색 화면. 상단 검색에서만 진입하는 보조 화면이라 하단 메뉴에는 추가하지 않는다. */
(function () {
  'use strict';

  var ROOT_SELECTOR = '#iwm-root';
  var state = { query: '', rendered: '' };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function norm(value) { return String(value || '').trim().toLowerCase(); }
  function root() { return document.querySelector(ROOT_SELECTOR); }
  function storedUser() {
    try { return JSON.parse(localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}'); }
    catch (_e) { return {}; }
  }
  function currentUserId() {
    return String((window.AppState && window.AppState.userId) || storedUser().id || '');
  }
  function authenticated() {
    return !!(window.db && window.db.fetch && window.db.getToken && window.db.getToken() && currentUserId());
  }
  function openBriefingAuth(mode) {
    if (window.InsuranceBriefingAuth && typeof window.InsuranceBriefingAuth.open === 'function') {
      window.InsuranceBriefingAuth.open(mode, { redirect: '/insuwork/m/search.html' });
      return;
    }
    window.location.href = '/pages/landing.html?auth=' + encodeURIComponent(mode) + '&redirect=%2Finsuwork%2Fm%2Fsearch.html';
  }
  function renderLoginGate() {
    var view = root(); if (!view) return;
    view.innerHTML = '<div class="iwm-gate">'
      + '<strong>보험워크 로그인이 필요합니다.</strong>'
      + '<p>보험워크 계정으로 로그인하면 고객과 자료를 검색할 수 있습니다.</p>'
      + '<div class="iwm-gate-actions"><button type="button" class="iwm-btn primary" id="iwm-login-btn">로그인</button></div>'
      + '<a class="iwm-link" href="/insuwork/">보험워크 홈으로 돌아가기</a>'
      + '</div>';
    var btn = document.getElementById('iwm-login-btn');
    if (btn) btn.addEventListener('click', function () { openBriefingAuth('login'); });
  }
  function renderLoading() {
    var view = root(); if (!view) return;
    view.innerHTML = '<div class="iwm-gate"><strong>검색을 준비하고 있습니다.</strong><p>잠시만 기다려 주세요.</p></div>';
  }
  function headerHtml() {
    return window.OSInsuworkMobileNav ? window.OSInsuworkMobileNav.header('검색', 'search', { searchValue: state.query }) : '<header class="iwm-header"><strong>검색</strong></header>';
  }
  function card(title, sub, href) {
    return '<a class="iwm-card iwm-search-card" href="' + esc(href) + '">'
      + '<div class="iwm-card-title">' + esc(title || '(제목 없음)') + '</div>'
      + (sub ? '<div class="iwm-card-sub">' + esc(sub) + '</div>' : '')
      + '</a>';
  }
  function emptyHtml(message) { return '<div class="iwm-empty">' + esc(message) + '</div>'; }
  function sectionHtml(title, body) {
    return '<section class="iwm-section"><h2 class="iwm-section-title">' + esc(title) + '</h2>' + body + '</section>';
  }
  function resultHtml() {
    var q = norm(state.query);
    if (!q) return emptyHtml('검색어를 입력해 주세요.');
    if (!window.OSInsuwork) return emptyHtml('검색 데이터를 불러오는 중입니다.');
    var customers = typeof window.OSInsuwork.customersDirectory === 'function' ? window.OSInsuwork.customersDirectory() : [];
    var consultations = typeof window.OSInsuwork.consultationsDirectory === 'function' ? window.OSInsuwork.consultationsDirectory() : [];
    var library = typeof window.OSInsuwork.libraryDirectory === 'function' ? window.OSInsuwork.libraryDirectory() : [];
    var customerRows = customers.filter(function (item) {
      return norm([item.name, item.phone, item.status].join(' ')).indexOf(q) >= 0;
    }).slice(0, 10);
    var consultationRows = consultations.filter(function (item) {
      return norm([item.customerName, item.memo, item.channel].join(' ')).indexOf(q) >= 0;
    }).slice(0, 10);
    var libraryRows = library.filter(function (item) {
      return norm([item.kind, item.title, item.searchText].join(' ')).indexOf(q) >= 0;
    }).slice(0, 10);
    var html = '';
    html += sectionHtml('고객', customerRows.length ? '<div class="iwm-list">' + customerRows.map(function (item) {
      return card(item.name, item.phone || item.status || '고객관리', './customers.html?q=' + encodeURIComponent(item.name || q));
    }).join('') + '</div>' : emptyHtml('일치하는 고객이 없습니다.'));
    html += sectionHtml('상담', consultationRows.length ? '<div class="iwm-list">' + consultationRows.map(function (item) {
      return card(item.customerName || '고객 상담', item.memo || item.channel || '상담관리', './consultations.html');
    }).join('') + '</div>' : emptyHtml('일치하는 상담이 없습니다.'));
    html += sectionHtml('자료', libraryRows.length ? '<div class="iwm-list">' + libraryRows.map(function (item) {
      return card((item.kind ? item.kind + ' · ' : '') + item.title, item.previewText || '자료', './library.html?q=' + encodeURIComponent(state.query));
    }).join('') + '</div>' : emptyHtml('일치하는 자료가 없습니다.'));
    return html;
  }
  function renderSearch() {
    var snapshot = state.query + '|' + (window.OSInsuwork && typeof window.OSInsuwork.isDataReady === 'function' ? window.OSInsuwork.isDataReady() : false);
    if (snapshot === state.rendered) return;
    state.rendered = snapshot;
    var view = root(); if (!view) return;
    view.innerHTML = headerHtml()
      + '<main class="iwm-main">' + resultHtml() + '</main>'
      + (window.OSInsuworkMobileNav ? window.OSInsuworkMobileNav.render('search') : '');
    if (window.OSInsuworkMobileNav && window.OSInsuworkMobileNav.bindHeader) window.OSInsuworkMobileNav.bindHeader();
    var input = document.querySelector('.iwm-global-search input[name="q"]');
    if (input) {
      input.value = state.query;
      input.addEventListener('input', function () { state.query = input.value; state.rendered = ''; renderSearch(); });
    }
  }
  document.addEventListener('insuwork:data-ready', function () { if (authenticated()) renderSearch(); });
  function boot() {
    try { state.query = new URLSearchParams(location.search || '').get('q') || ''; } catch (_e) {}
    if (!authenticated()) { renderLoginGate(); return; }
    renderLoading();
    if (window.OSInsuwork && typeof window.OSInsuwork.reload === 'function') window.OSInsuwork.reload();

  }

  window.OSInsuworkMobileSearch = { boot: boot };
  window.addEventListener('load', function () { window.setTimeout(boot, 50); });
})();
