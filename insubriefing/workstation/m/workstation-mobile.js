/* insubriefing/workstation/m/workstation-mobile.js
   워크스테이션 모바일 "오늘" 화면 전용 렌더러 (Phase 1 MVP, 2026-08-22, feat/workstation-mobile-today).
   데이터/로직은 100% /js/personal-workspace.js 재사용(todaySummary/upcomingConsultPrep 읽기 전용 조회 + reload()로
   기존 loadData() 실행). 이 파일은 화면(뷰 셸)만 새로 그린다 — personal-workspace.js의 렌더 함수는 호출하지 않는다.
   네임스페이스 = OSWorkstationMobile (기존 pw-/_ci/sn- 네임스페이스와 충돌 없음). */
(function () {
  'use strict';

  var PILOT_ID = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';
  var ROOT_SELECTOR = '#wsm-root';
  /* reload()가 Promise를 반환하지 않아(기존 export 시그니처 변경 없음) 완료 신호를 직접 받을 수 없다.
     대신 짧은 간격으로 재조회 → 직전 렌더와 동일하면 스킵하는 폴링으로 최종 일관성을 맞춘다(추가 API 호출 아님, 순수 재조회). */
  var POLL_DELAYS_MS = [400, 900, 1600, 2600, 4000];

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
  /* 게이트 = 기존 js/personal-workspace.js의 allowed()/authenticated()/currentUserId() 패턴을 그대로 복제.
     임태성 실장 전용 게이트(PILOT_ID)를 그대로 상속한다. */
  function allowed() {
    return isLocalHost() || currentUserId() === PILOT_ID;
  }
  function authenticated() {
    return !!(window.db && window.db.fetch && window.db.getToken && window.db.getToken() && currentUserId());
  }
  /* fix/workstation-mobile-bugs 버그6 대응 — 모바일 화면에 로그아웃 진입 경로가 없던 문제.
     새 로직을 만들지 않고 insubriefing/hub.js의 logoutAdvisor()·insubriefing/workstation/workstation.js의
     logout()이 지우는 storage key 4개를 그대로 지운 뒤 보험브리핑 홈으로 이동한다(같은 함수를 import할 수 없어
     동일 로직만 로컬 복제, 새 판단 없음). */
  function logout() {
    ['os_token', 'os_refresh_token', 'os_user', 'selected_menu'].forEach(function (key) {
      localStorage.removeItem(key); sessionStorage.removeItem(key);
    });
    window.location.replace('/insubriefing/');
  }

  function root() { return document.querySelector(ROOT_SELECTOR); }

  function openBriefingAuth(mode) {
    if (window.InsuranceBriefingAuth && typeof window.InsuranceBriefingAuth.open === 'function') {
      window.InsuranceBriefingAuth.open(mode, { redirect: '/insubriefing/workstation/m/' });
      return;
    }
    window.location.href = '/pages/landing.html?auth=' + encodeURIComponent(mode) + '&redirect=%2Finsubriefing%2Fworkstation%2Fm%2F';
  }

  function renderLoginGate() {
    var view = root(); if (!view) return;
    view.innerHTML = '<div class="wsm-gate">'
      + '<strong>워크스테이션 로그인이 필요합니다.</strong>'
      + '<p>보험브리핑 계정으로 로그인하면 오늘 할 일을 확인할 수 있습니다.</p>'
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
    view.innerHTML = '<div class="wsm-gate"><strong>오늘 화면을 준비하고 있습니다.</strong><p>잠시만 기다려 주세요.</p></div>';
  }

  function eventTimeLabel(timeStr) {
    if (!timeStr) return '';
    var parts = String(timeStr).slice(0, 5).split(':');
    var h = Number(parts[0]), m = parts[1];
    if (isNaN(h)) return '';
    var period = h < 12 ? '오전' : '오후';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return period + ' ' + h12 + ':' + m;
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

  function eventsSectionHtml(events, excludeIds) {
    var visible = (events || []).filter(function (event) { return !excludeIds[String(event && event.id)]; });
    if (!visible.length) return sectionHtml('오늘 일정', emptyHtml('오늘 일정이 없습니다.'));
    var body = '<div class="wsm-list">' + visible.map(function (event) {
      var time = event.builtin ? '' : eventTimeLabel(event.event_time);
      return cardHtml(event.title || '(제목 없음)', time, event.description || '');
    }).join('') + '</div>';
    return sectionHtml('오늘 일정', body);
  }

  function careSectionHtml(care) {
    if (!care || !care.length) return sectionHtml('오늘 케어할 고객', emptyHtml('오늘 케어할 고객이 없습니다.'));
    var body = '<div class="wsm-list">' + care.map(function (event) {
      return cardHtml(event.title || '케어 알림', '', event.description || '');
    }).join('') + '</div>';
    return sectionHtml('오늘 케어할 고객', body);
  }

  function insuranceAgeSectionHtml(insuranceAge) {
    /* 매일 발생하지 않아 값이 없으면 섹션 자체를 숨긴다(스펙 지시) */
    if (!insuranceAge || !insuranceAge.length) return '';
    var body = '<div class="wsm-list">' + insuranceAge.map(function (event) {
      return cardHtml(event.title || '보험상령일', '', event.description || '');
    }).join('') + '</div>';
    return sectionHtml('오늘 상령일', body);
  }

  function consultPrepSectionHtml(list) {
    if (!list || !list.length) return sectionHtml('내일 상담 준비', emptyHtml('내일 예정된 상담이 없습니다.'));
    var body = '<div class="wsm-list">' + list.map(function (entry) {
      var files = entry.files && entry.files.length ? entry.files.join(', ') : '준비된 자료가 없습니다.';
      return cardHtml(entry.customerName || '고객', '', files);
    }).join('') + '</div>';
    return sectionHtml('내일 상담 준비', body);
  }

  var lastRenderedJson = '';
  function renderToday() {
    if (!window.OSPersonalWorkspace) return;
    var summary = typeof window.OSPersonalWorkspace.todaySummary === 'function'
      ? window.OSPersonalWorkspace.todaySummary() : { events: [], care: [], insuranceAge: [] };
    var prep = typeof window.OSPersonalWorkspace.upcomingConsultPrep === 'function'
      ? window.OSPersonalWorkspace.upcomingConsultPrep() : [];
    var json = JSON.stringify({ summary: summary, prep: prep });
    if (json === lastRenderedJson) return;
    lastRenderedJson = json;

    var excludeIds = {};
    (summary.care || []).forEach(function (event) { excludeIds[String(event && event.id)] = true; });
    (summary.insuranceAge || []).forEach(function (event) { excludeIds[String(event && event.id)] = true; });

    var view = root(); if (!view) return;
    view.innerHTML = '<header class="wsm-header"><strong>오늘</strong>'
      + '<div class="wsm-header-actions">'
      + '<a class="wsm-tab-link" href="./calendar.html">캘린더</a>'
      + '<a class="wsm-tab-link" href="./customers.html">고객</a>'
      + '<a class="wsm-tab-link" href="./library.html">자료</a>'
      + '<a class="wsm-pc-link" href="/insubriefing/workstation/">PC로 보기</a>'
      + '<a class="wsm-tab-link" href="#" id="wsm-logout-link">로그아웃</a>'
      + '</div></header>'
      + '<main class="wsm-main">'
      + eventsSectionHtml(summary.events, excludeIds)
      + careSectionHtml(summary.care)
      + insuranceAgeSectionHtml(summary.insuranceAge)
      + consultPrepSectionHtml(prep)
      + '</main>';

    var logoutLink = document.getElementById('wsm-logout-link');
    if (logoutLink) logoutLink.addEventListener('click', function (event) { event.preventDefault(); logout(); });
  }

  function pollAndRender(index) {
    renderToday();
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

  window.OSWorkstationMobile = { boot: boot };
  window.addEventListener('load', function () { window.setTimeout(boot, 50); });
})();
