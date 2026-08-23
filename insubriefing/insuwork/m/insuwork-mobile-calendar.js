/* insubriefing/insuwork/m/insuwork-mobile-calendar.js
   보험워크 모바일 "캘린더" 화면 전용 렌더러 (Phase 2, 2026-08-22, feat/workstation-mobile-calendar).
   데이터/로직은 100% /js/insuwork.js 재사용(eventsFor/eventsInRange 읽기 전용 조회 + reload()로
   기존 loadData() 실행). 이 파일은 화면(뷰 셸)만 새로 그린다 — insuwork.js의 렌더 함수는 호출하지 않는다.
   네임스페이스 = OSInsuworkMobileCalendar (OSInsuworkMobile과 충돌 없음).
   코상무 확정 방향: 모바일 월간 그리드는 만들지 않는다. 오늘 / 이번 주 / 일정 목록(리스트형)이 주력이다. */
(function () {
  'use strict';

  var PILOT_ID = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';
  var ROOT_SELECTOR = '#wsm-root';
  var WEEK_DAYS = 7;
  var LIST_RANGE_DAYS = 30;
  var LIST_PAGE_SIZE = 20;
  var WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
  /* reload()가 Promise를 반환하지 않아(기존 export 시그니처 변경 없음) 완료 신호를 직접 받을 수 없다.
     대신 짧은 간격으로 재조회 → 직전 렌더와 동일하면 스킵하는 폴링으로 최종 일관성을 맞춘다(추가 API 호출 아님, 순수 재조회). */
  var POLL_DELAYS_MS = [400, 900, 1600, 2600, 4000];

  var state = { listRenderLimit: LIST_PAGE_SIZE };

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
  /* 게이트 = insuwork-mobile.js(Phase 1)의 allowed()/authenticated() 패턴을 그대로 복제.
     임태성 실장 전용 게이트(PILOT_ID)를 그대로 상속한다. */
  function allowed() {
    return isLocalHost() || currentUserId() === PILOT_ID;
  }
  function authenticated() {
    return !!(window.db && window.db.fetch && window.db.getToken && window.db.getToken() && currentUserId());
  }
  /* fix/workstation-mobile-bugs 버그6 대응 — 모바일 화면에 로그아웃 진입 경로가 없던 문제.
     새 로직을 만들지 않고 insubriefing/hub.js의 logoutAdvisor()·insubriefing/insuwork/insuwork.js의
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
      window.InsuranceBriefingAuth.open(mode, { redirect: '/insubriefing/insuwork/m/calendar.html' });
      return;
    }
    window.location.href = '/pages/landing.html?auth=' + encodeURIComponent(mode) + '&redirect=%2Finsubriefing%2Finsuwork%2Fm%2Fcalendar.html';
  }

  function renderLoginGate() {
    var view = root(); if (!view) return;
    view.innerHTML = '<div class="wsm-gate">'
      + '<strong>보험워크 로그인이 필요합니다.</strong>'
      + '<p>보험브리핑 계정으로 로그인하면 캘린더를 확인할 수 있습니다.</p>'
      + '<div class="wsm-gate-actions"><button type="button" class="wsm-btn primary" id="wsm-login-btn">로그인</button></div>'
      + '<a class="wsm-link" href="/insubriefing/">보험브리핑으로 돌아가기</a>'
      + '</div>';
    var btn = document.getElementById('wsm-login-btn');
    if (btn) btn.addEventListener('click', function () { openBriefingAuth('login'); });
  }

  function renderDeniedGate() {
    var view = root(); if (!view) return;
    view.innerHTML = '<div class="wsm-gate">'
      + '<strong>보험워크 준비 중</strong>'
      + '<p>현재 임태성 계정에서 먼저 완성하고 있습니다.</p>'
      + '<a class="wsm-link" href="/insubriefing/">보험브리핑으로 돌아가기</a>'
      + '</div>';
  }

  function renderLoading() {
    var view = root(); if (!view) return;
    view.innerHTML = '<div class="wsm-gate"><strong>캘린더를 준비하고 있습니다.</strong><p>잠시만 기다려 주세요.</p></div>';
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

  function pad2(n) { return String(n).padStart(2, '0'); }
  function ymd(date) { return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()); }
  function parseDate(value) { var p = String(value).slice(0, 10).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(value, count) { var d = parseDate(value); d.setDate(d.getDate() + count); return ymd(d); }
  function dayLabel(dateStr) {
    var d = parseDate(dateStr);
    return (d.getMonth() + 1) + '/' + d.getDate() + ' (' + WEEKDAY_LABELS[d.getDay()] + ')';
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

  function dayEventCardHtml(event) {
    var time = event.builtin ? '' : eventTimeLabel(event.event_time);
    return cardHtml(event.title || '(제목 없음)', time, event.description || '');
  }

  function listEventCardHtml(event) {
    var time = event.builtin ? '' : eventTimeLabel(event.event_time);
    var sub = dayLabel(String(event.event_date || '').slice(0, 10)) + (time ? ' · ' + time : '');
    return cardHtml(event.title || '(제목 없음)', sub, event.description || '');
  }

  function todaySectionHtml(todayDate) {
    var events = typeof window.OSInsuwork.eventsFor === 'function' ? window.OSInsuwork.eventsFor(todayDate) : [];
    if (!events.length) return sectionHtml('오늘', emptyHtml('오늘 일정이 없습니다.'));
    var body = '<div class="wsm-list">' + events.map(dayEventCardHtml).join('') + '</div>';
    return sectionHtml('오늘', body);
  }

  function weekSectionHtml(todayDate) {
    var days = [];
    for (var i = 0; i < WEEK_DAYS; i++) days.push(addDays(todayDate, i));
    var body = '<div class="wsm-week">' + days.map(function (dateStr) {
      var events = typeof window.OSInsuwork.eventsFor === 'function' ? window.OSInsuwork.eventsFor(dateStr) : [];
      var inner = events.length
        ? '<div class="wsm-list">' + events.map(dayEventCardHtml).join('') + '</div>'
        : '<div class="wsm-empty wsm-empty-compact">일정 없음</div>';
      return '<div class="wsm-week-day">'
        + '<h3 class="wsm-week-day-title">' + esc(dayLabel(dateStr)) + '</h3>'
        + inner
        + '</div>';
    }).join('') + '</div>';
    return sectionHtml('이번 주', body);
  }

  function upcomingSectionHtml(todayDate) {
    var listStart = addDays(todayDate, WEEK_DAYS);
    var listEnd = addDays(listStart, LIST_RANGE_DAYS - 1);
    var all = typeof window.OSInsuwork.eventsInRange === 'function'
      ? window.OSInsuwork.eventsInRange(listStart, listEnd) : [];
    if (!all.length) return sectionHtml('일정 목록', emptyHtml('이번 주 이후 예정된 일정이 없습니다.'));
    var visible = all.slice(0, state.listRenderLimit);
    var body = '<div class="wsm-list">' + visible.map(listEventCardHtml).join('')
      + (all.length > visible.length ? '<button type="button" class="wsm-btn wsm-loadmore" id="wsm-cal-more">더 보기 (' + (all.length - visible.length) + ')</button>' : '')
      + '</div>';
    return sectionHtml('일정 목록', body);
  }

  /* feat/workstation-mobile-header-consistency (2026-08-22, 대표 직접 요청) — 헤더 부가버튼(PC로 보기/
     로그아웃)을 "⋯" 메뉴로 숨기고 보험브리핑 홈 복귀 링크를 추가한다. 바깥 클릭 닫기 리스너는 document에
     한 번만 등록한다(매 재렌더마다 새로 붙이면 리스너가 누적되므로, 클릭 시점에 getElementById로 최신
     DOM을 다시 조회하는 방식으로 재렌더에도 안전하게 동작). */
  var menuOutsideBound = false;
  function bindHeaderMenu() {
    var menuBtn = document.getElementById('wsm-menu-btn');
    var menuPanel = document.getElementById('wsm-menu-panel');
    if (menuBtn && menuPanel) {
      menuBtn.addEventListener('click', function () {
        var willOpen = menuPanel.hidden;
        menuPanel.hidden = !willOpen;
        menuBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });
    }
    if (!menuOutsideBound) {
      menuOutsideBound = true;
      document.addEventListener('click', function (event) {
        var panel = document.getElementById('wsm-menu-panel');
        var btn = document.getElementById('wsm-menu-btn');
        if (!panel || panel.hidden) return;
        if (panel.contains(event.target) || (btn && btn.contains(event.target))) return;
        panel.hidden = true;
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }
  }

  var lastRenderedJson = '';
  function renderCalendar() {
    if (!window.OSInsuwork) return;
    var todayDate = ymd(new Date());
    /* 렌더 스킵 판정용 스냅샷: 오늘~+37일 범위 이벤트를 통째 직렬화(페이지네이션 상태는 별도 비교) */
    var snapshotEvents = typeof window.OSInsuwork.eventsInRange === 'function'
      ? window.OSInsuwork.eventsInRange(todayDate, addDays(todayDate, WEEK_DAYS + LIST_RANGE_DAYS)) : [];
    var json = JSON.stringify({ today: todayDate, limit: state.listRenderLimit, events: snapshotEvents });
    if (json === lastRenderedJson) return;
    lastRenderedJson = json;

    var view = root(); if (!view) return;
    /* feat/workstation-mobile-bottom-nav — 화면 이동 탭(오늘/고객/자료)은 하단 고정 탭바로 옮겼다.
       feat/workstation-mobile-header-consistency — PC로 보기/로그아웃은 "⋯" 메뉴 안으로 숨기고,
       보험브리핑 홈으로 돌아가는 링크를 추가했다. */
    view.innerHTML = '<header class="wsm-header"><strong>캘린더</strong>'
      + '<div class="wsm-header-actions">'
      + '<button type="button" class="wsm-menu-btn" id="wsm-menu-btn" aria-haspopup="true" aria-expanded="false" aria-label="메뉴">⋯</button>'
      + '</div>'
      + '<div class="wsm-menu-panel" id="wsm-menu-panel" hidden>'
      + '<a class="wsm-menu-item" href="/insubriefing/">보험브리핑 홈</a>'
      + '<a class="wsm-menu-item" href="/insubriefing/insuwork/?view=insuwork&section=calendar&mode=month">PC 버전으로 보기</a>'
      + '<a class="wsm-menu-item" href="#" id="wsm-logout-link">로그아웃</a>'
      + '</div>'
      + '</header>'
      + '<main class="wsm-main">'
      + todaySectionHtml(todayDate)
      + weekSectionHtml(todayDate)
      + upcomingSectionHtml(todayDate)
      + '</main>'
      + (window.OSInsuworkMobileNav ? window.OSInsuworkMobileNav.render('calendar') : '');

    var logoutLink = document.getElementById('wsm-logout-link');
    if (logoutLink) logoutLink.addEventListener('click', function (event) { event.preventDefault(); logout(); });
    bindHeaderMenu();

    var moreBtn = document.getElementById('wsm-cal-more');
    if (moreBtn) moreBtn.addEventListener('click', function () {
      state.listRenderLimit += LIST_PAGE_SIZE;
      lastRenderedJson = '';
      renderCalendar();
    });
  }

  function pollAndRender(index) {
    renderCalendar();
    if (index >= POLL_DELAYS_MS.length) return;
    window.setTimeout(function () { pollAndRender(index + 1); }, POLL_DELAYS_MS[index]);
  }

  function startDataFlow() {
    renderLoading();
    if (window.OSInsuwork && typeof window.OSInsuwork.reload === 'function') {
      window.OSInsuwork.reload();
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

  window.OSInsuworkMobileCalendar = { boot: boot };
  window.addEventListener('load', function () { window.setTimeout(boot, 50); });
})();
