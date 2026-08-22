/* insubriefing/workstation/m/workstation-mobile-customers.js
   워크스테이션 모바일 "고객" 화면 전용 렌더러 (Phase 3, 2026-08-22, feat/workstation-mobile-customers).
   데이터/로직은 100% /js/personal-workspace.js 재사용(customersDirectory() 읽기 전용 조회 + reload()로
   기존 loadData() 실행). 이 파일은 화면(뷰 셸)만 새로 그린다 — personal-workspace.js의 렌더 함수는 호출하지 않는다.
   네임스페이스 = OSWorkstationMobileCustomers (OSWorkstationMobile/OSWorkstationMobileCalendar와 충돌 없음).
   코상무 확정 방향: 모바일 고객관리는 표가 아니라 "고객 카드 리스트 → 고객 상세 → 전화/메모/일정추가 버튼" 구조.
   이번 Phase는 조회 전용이다 — 고객 등록/수정, 모바일 전용 메모·일정 작성 폼은 범위 밖(PC 안내 링크만 제공). */
(function () {
  'use strict';

  var PILOT_ID = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';
  var ROOT_SELECTOR = '#wsm-root';
  var RECENT_CONSULT_LIMIT = 5;
  /* reload()가 Promise를 반환하지 않아(기존 export 시그니처 변경 없음) 완료 신호를 직접 받을 수 없다.
     대신 짧은 간격으로 재조회 → 직전 렌더와 동일하면 스킵하는 폴링으로 최종 일관성을 맞춘다(추가 API 호출 아님, 순수 재조회). */
  var POLL_DELAYS_MS = [400, 900, 1600, 2600, 4000];

  var state = { view: 'list', query: '', selectedId: null, directory: [] };
  var lastRenderedJson = '';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function storedUser() {
    try { return JSON.parse(localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}'); }
    catch (_e) { return {}; }
  }
  function currentUserId() {
    return String((window.AppState && window.AppState.userId) || storedUser().id || '');
  }
  function isLocalHost() {
    return location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  }
  /* 게이트 = workstation-mobile.js(Phase 1)의 allowed()/authenticated() 패턴을 그대로 복제.
     임태성 실장 전용 게이트(PILOT_ID)를 그대로 상속한다. */
  function allowed() {
    return isLocalHost() || currentUserId() === PILOT_ID;
  }
  function authenticated() {
    return !!(window.db && window.db.fetch && window.db.getToken && window.db.getToken() && currentUserId());
  }

  function root() { return document.querySelector(ROOT_SELECTOR); }

  function openBriefingAuth(mode) {
    if (window.InsuranceBriefingAuth && typeof window.InsuranceBriefingAuth.open === 'function') {
      window.InsuranceBriefingAuth.open(mode, { redirect: '/insubriefing/workstation/m/customers.html' });
      return;
    }
    window.location.href = '/pages/landing.html?auth=' + encodeURIComponent(mode) + '&redirect=%2Finsubriefing%2Fworkstation%2Fm%2Fcustomers.html';
  }

  function renderLoginGate() {
    var view = root(); if (!view) return;
    view.innerHTML = '<div class="wsm-gate">'
      + '<strong>워크스테이션 로그인이 필요합니다.</strong>'
      + '<p>보험브리핑 계정으로 로그인하면 고객 목록을 확인할 수 있습니다.</p>'
      + '<div class="wsm-gate-actions"><button type="button" class="wsm-btn primary" id="wsm-login-btn">로그인</button></div>'
      + '<a class="wsm-link" href="/insubriefing/">보험브리핑으로 돌아가기</a>'
      + '</div>';
    var btn = document.getElementById('wsm-login-btn');
    if (btn) btn.addEventListener('click', function () { openBriefingAuth('login'); });
  }

  function renderDeniedGate() {
    var view = root(); if (!view) return;
    view.innerHTML = '<div class="wsm-gate">'
      + '<strong>워크스테이션 준비 중</strong>'
      + '<p>현재 임태성 계정에서 먼저 완성하고 있습니다.</p>'
      + '<a class="wsm-link" href="/insubriefing/">보험브리핑으로 돌아가기</a>'
      + '</div>';
  }

  function renderLoading() {
    var view = root(); if (!view) return;
    view.innerHTML = '<div class="wsm-gate"><strong>고객 목록을 준비하고 있습니다.</strong><p>잠시만 기다려 주세요.</p></div>';
  }

  function cardHtml(title, sub, meta) {
    return '<div class="wsm-card">'
      + '<div class="wsm-card-title">' + esc(title) + '</div>'
      + (sub ? '<div class="wsm-card-sub">' + esc(sub) + '</div>' : '')
      + (meta ? '<div class="wsm-card-meta">' + esc(meta) + '</div>' : '')
      + '</div>';
  }

  function emptyHtml(message) {
    return '<div class="wsm-empty">' + esc(message) + '</div>';
  }

  function sectionHtml(title, bodyHtml) {
    return '<section class="wsm-section">'
      + '<h2 class="wsm-section-title">' + esc(title) + '</h2>'
      + bodyHtml
      + '</section>';
  }

  function shortDate(dateStr) {
    var parts = String(dateStr || '').slice(0, 10).split('-');
    if (parts.length !== 3) return '';
    return Number(parts[1]) + '/' + Number(parts[2]);
  }

  /* 표시용 전화번호(고객 원본 값, 하이픈 등 서식 포함 가능)와 tel: 링크용 값(숫자만)을 분리한다.
     phoneText()류 서식 함수는 personal-workspace.js 비공개 클로저 안이라 재사용할 수 없어, 여기서는
     tel: 링크에 반드시 필요한 "숫자만 추출"만 자체 구현한다(표시는 원본 그대로, 새 포맷팅 로직 추가 안 함). */
  function phoneDigits(value) { return String(value || '').replace(/\D/g, ''); }

  function headerHtml() {
    return '<header class="wsm-header"><strong>고객</strong>'
      + '<div class="wsm-header-actions">'
      + '<a class="wsm-tab-link" href="./index.html">오늘</a>'
      + '<a class="wsm-tab-link" href="./calendar.html">캘린더</a>'
      + '<a class="wsm-pc-link" href="/insubriefing/workstation/?view=personal-workspace&section=customers">PC 버전으로 보기</a>'
      + '</div></header>';
  }

  function snapshotJson() {
    return JSON.stringify({ view: state.view, id: state.selectedId, q: state.query, dir: state.directory });
  }

  function refreshDirectory() {
    state.directory = (window.OSPersonalWorkspace && typeof window.OSPersonalWorkspace.customersDirectory === 'function')
      ? window.OSPersonalWorkspace.customersDirectory() : [];
  }

  function findCustomer(id) {
    return state.directory.find(function (customer) { return String(customer.id) === String(id); });
  }

  function filteredDirectory() {
    var list = state.directory.slice().sort(function (a, b) {
      var ad = (a.consultations[0] && a.consultations[0].date) || '';
      var bd = (b.consultations[0] && b.consultations[0].date) || '';
      return bd.localeCompare(ad) || String(a.name || '').localeCompare(String(b.name || ''), 'ko');
    });
    var q = state.query.trim();
    if (!q) return list;
    return list.filter(function (customer) { return String(customer.name || '').indexOf(q) >= 0; });
  }

  function customerCardHtml(customer) {
    var last = customer.consultations && customer.consultations[0];
    var sub = last ? ('최근 상담 ' + shortDate(last.date)) : '최근 상담 없음';
    var meta = customer.nextCareDate ? ('다음 케어 ' + shortDate(customer.nextCareDate) + (customer.nextCareTitle ? ' · ' + customer.nextCareTitle : '')) : '';
    return '<button type="button" class="wsm-card wsm-cust-card" data-id="' + esc(customer.id) + '">'
      + '<div class="wsm-card-title">' + esc(customer.name || '(이름 없음)') + '</div>'
      + '<div class="wsm-card-sub">' + esc(sub) + '</div>'
      + (meta ? '<div class="wsm-card-meta">' + esc(meta) + '</div>' : '')
      + '</button>';
  }

  function bindCardClicks(container) {
    var cards = container.querySelectorAll('.wsm-cust-card');
    Array.prototype.forEach.call(cards, function (card) {
      card.addEventListener('click', function () { openDetail(card.getAttribute('data-id')); });
    });
  }

  function renderListBody() {
    var container = document.getElementById('wsm-cust-list'); if (!container) return;
    var list = filteredDirectory();
    container.innerHTML = list.length
      ? list.map(customerCardHtml).join('')
      : emptyHtml(state.query ? '검색 결과가 없습니다.' : '등록된 고객이 없습니다.');
    bindCardClicks(container);
  }

  function renderListShell() {
    var view = root(); if (!view) return;
    view.innerHTML = headerHtml()
      + '<main class="wsm-main">'
      + '<div class="wsm-cust-search-wrap">'
      + '<input type="search" id="wsm-cust-search" class="wsm-cust-search" placeholder="이름으로 검색" autocomplete="off" inputmode="search">'
      + '</div>'
      + '<div class="wsm-list wsm-cust-list" id="wsm-cust-list"></div>'
      + '</main>';
    var input = document.getElementById('wsm-cust-search');
    if (input) {
      input.value = state.query;
      input.addEventListener('input', function () {
        state.query = input.value;
        renderListBody();
        /* 검색 결과 재조립은 목록 영역만 갈아끼우고(포커스 보존), 이후 폴링이 같은 스냅샷을 보고 전체 재렌더(포커스 소실)하지
           않도록 스냅샷 캐시도 함께 갱신한다. */
        lastRenderedJson = snapshotJson();
      });
    }
    renderListBody();
  }

  function renderDetailShell() {
    var view = root(); if (!view) return;
    var customer = findCustomer(state.selectedId);
    if (!customer) { state.view = 'list'; state.selectedId = null; renderListShell(); return; }

    var phoneDisplay = customer.phone || '';
    var tel = phoneDigits(phoneDisplay);
    var telAction = tel
      ? '<a class="wsm-cust-action-btn" href="tel:' + esc(tel) + '">전화</a>'
      : '<span class="wsm-cust-action-btn is-disabled">전화번호 없음</span>';

    var consultations = (customer.consultations || []).slice(0, RECENT_CONSULT_LIMIT);
    var consultHtml = consultations.length
      ? '<div class="wsm-list">' + consultations.map(function (entry) {
          return cardHtml(shortDate(entry.date) + ' 상담', '', entry.memo || '상담 내용이 없습니다.');
        }).join('') + '</div>'
      : emptyHtml('상담 이력이 없습니다.');

    var careHtml = customer.nextCareDate
      ? sectionHtml('다음 케어 예정', '<div class="wsm-list">' + cardHtml(customer.nextCareTitle || '케어 알림', shortDate(customer.nextCareDate), '') + '</div>')
      : '';

    view.innerHTML = headerHtml()
      + '<main class="wsm-main">'
      + '<button type="button" class="wsm-btn wsm-cust-back" id="wsm-cust-back">← 고객 목록</button>'
      + '<section class="wsm-cust-detail-head">'
      + '<div class="wsm-cust-detail-name">' + esc(customer.name || '(이름 없음)') + '</div>'
      + (phoneDisplay ? '<div class="wsm-cust-detail-phone">' + esc(phoneDisplay) + '</div>' : '')
      + (customer.status ? '<div class="wsm-cust-detail-status">' + esc(customer.status) + '</div>' : '')
      + '</section>'
      + '<div class="wsm-cust-actions">'
      + telAction
      + '<div class="wsm-cust-action">'
      + '<a class="wsm-cust-action-btn" href="/insubriefing/workstation/?view=personal-workspace&section=customers">메모</a>'
      + '<p class="wsm-cust-action-note">PC 버전에서 상담메모를 작성해 주세요.</p>'
      + '</div>'
      + '<div class="wsm-cust-action">'
      + '<a class="wsm-cust-action-btn" href="/insubriefing/workstation/?view=personal-workspace&section=calendar&mode=month">일정추가</a>'
      + '<p class="wsm-cust-action-note">PC 버전에서 일정을 등록해 주세요.</p>'
      + '</div>'
      + '</div>'
      + careHtml
      + sectionHtml('최근 상담', consultHtml)
      + '</main>';

    var back = document.getElementById('wsm-cust-back');
    if (back) back.addEventListener('click', function () {
      state.view = 'list'; state.selectedId = null; lastRenderedJson = '';
      renderCurrent();
    });
  }

  function openDetail(id) {
    if (!id) return;
    state.view = 'detail'; state.selectedId = id; lastRenderedJson = '';
    renderCurrent();
  }

  function renderCurrent() {
    refreshDirectory();
    var json = snapshotJson();
    if (json === lastRenderedJson) return;
    lastRenderedJson = json;
    if (state.view === 'detail' && state.selectedId) renderDetailShell();
    else renderListShell();
  }

  function pollAndRender(index) {
    renderCurrent();
    if (index >= POLL_DELAYS_MS.length) return;
    window.setTimeout(function () { pollAndRender(index + 1); }, POLL_DELAYS_MS[index]);
  }

  function startDataFlow() {
    renderLoading();
    if (window.OSPersonalWorkspace && typeof window.OSPersonalWorkspace.reload === 'function') {
      window.OSPersonalWorkspace.reload();
    }
    pollAndRender(0);
  }

  function boot() {
    var view = root(); if (!view) return;
    if (!authenticated()) { renderLoginGate(); return; }
    document.addEventListener('appstate:ready', function onReady() {
      document.removeEventListener('appstate:ready', onReady);
      if (!allowed()) { renderDeniedGate(); return; }
      startDataFlow();
    });
    if (window.Auth && typeof window.Auth.init === 'function') {
      window.Auth.init().catch(function () { renderLoginGate(); });
    } else {
      renderLoginGate();
    }
  }

  window.OSWorkstationMobileCustomers = { boot: boot };
  window.addEventListener('load', function () { window.setTimeout(boot, 50); });
})();
