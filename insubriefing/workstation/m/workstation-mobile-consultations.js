/* insubriefing/workstation/m/workstation-mobile-consultations.js
   워크스테이션 모바일 "상담" 화면 전용 렌더러 (feat/workstation-mobile-consultations-list, 2026-08-22, 대표 직접 요청).
   지금까지 상담 이력은 고객 상세 화면 안에서 그 고객 것만 볼 수 있었다(customers.js). PC 데스크탑에는 전체
   고객을 가로지르는 "상담관리" 화면이 있는데 모바일엔 없어서 그 격차를 메우는 화면이다.
   데이터/로직은 100% /js/personal-workspace.js 재사용 — consultationsDirectory() 읽기 전용 조회(이번 작업에서
   새로 추가) + reload()로 기존 loadData() 실행. 이 파일은 화면(뷰 셸)만 새로 그린다 — personal-workspace.js의
   렌더/저장 함수 본문은 호출하지 않는다. 조회 전용이다(쓰기 기능 없음 — 상담 등록/수정/삭제는 범위 밖).
   네임스페이스 = OSWorkstationMobileConsultations (다른 OSWorkstationMobile* 네임스페이스와 충돌 없음).

   화면 구조: 전체 상담을 최신순으로 카드 나열 + 상태(channel) 필터 칩 + 카드 탭하면 같은 화면 안에서
   펼쳐 전체 메모를 보여주고(별도 페이지 이동 없음) "이 고객 상세로 이동" 링크로 customers.html 이동.
   customers.html이 특정 고객 id로 딥링크되는 기능은 없어서(이번 범위 밖) 목록 화면으로만 이동시킨다. */
(function () {
  'use strict';

  var PILOT_ID = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';
  var ROOT_SELECTOR = '#wsm-root';
  var PAGE_SIZE = 20;
  var PREVIEW_LEN = 60;
  /* reload()가 Promise를 반환하지 않아(기존 export 시그니처 변경 없음) 완료 신호를 직접 받을 수 없다.
     대신 짧은 간격으로 재조회 → 직전 렌더와 동일하면 스킵하는 폴링으로 최종 일관성을 맞춘다(추가 API 호출 아님, 순수 재조회). */
  var POLL_DELAYS_MS = [400, 900, 1600, 2600, 4000];

  var state = { channel: 'all', expandedId: null, limit: PAGE_SIZE, directory: [] };
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
  /* 게이트 = workstation-mobile.js(Phase 1)/customers.js의 allowed()/authenticated() 패턴을 그대로 복제.
     임태성 실장 전용 게이트(PILOT_ID)를 그대로 상속한다. */
  function allowed() {
    return isLocalHost() || currentUserId() === PILOT_ID;
  }
  function authenticated() {
    return !!(window.db && window.db.fetch && window.db.getToken && window.db.getToken() && currentUserId());
  }
  /* customers.js/library.js와 동일 패턴 — js/personal-workspace.js의 isDataReady() 읽기 전용 조회를 그대로
     노출한다. loadData(true)가 완료되기 전(fullLoaded=false)에는 directory가 빈 배열이라 "상담 기록이
     없습니다"가 먼저 그려지고 이후 폴링에서 실제 데이터로 뒤늦게 바뀌는 문제 — 로드 완료 여부로 문구를 분기한다. */
  function isDataReady() {
    return !!(window.OSPersonalWorkspace && typeof window.OSPersonalWorkspace.isDataReady === 'function' && window.OSPersonalWorkspace.isDataReady());
  }
  /* customers.js/library.js와 동일 로직 복제(모바일 화면 로그아웃 진입 경로). insubriefing/hub.js의
     logoutAdvisor()·insubriefing/workstation/workstation.js의 logout()이 지우는 storage key 4개를 그대로
     지운 뒤 보험브리핑 홈으로 이동한다(같은 함수를 import할 수 없어 동일 로직만 로컬 복제, 새 판단 없음). */
  function logout() {
    ['os_token', 'os_refresh_token', 'os_user', 'selected_menu'].forEach(function (key) {
      localStorage.removeItem(key); sessionStorage.removeItem(key);
    });
    window.location.replace('/insubriefing/');
  }

  function root() { return document.querySelector(ROOT_SELECTOR); }

  function openBriefingAuth(mode) {
    if (window.InsuranceBriefingAuth && typeof window.InsuranceBriefingAuth.open === 'function') {
      window.InsuranceBriefingAuth.open(mode, { redirect: '/insubriefing/workstation/m/consultations.html' });
      return;
    }
    window.location.href = '/pages/landing.html?auth=' + encodeURIComponent(mode) + '&redirect=%2Finsubriefing%2Fworkstation%2Fm%2Fconsultations.html';
  }

  function renderLoginGate() {
    var view = root(); if (!view) return;
    view.innerHTML = '<div class="wsm-gate">'
      + '<strong>워크스테이션 로그인이 필요합니다.</strong>'
      + '<p>보험브리핑 계정으로 로그인하면 상담 목록을 확인할 수 있습니다.</p>'
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
    view.innerHTML = '<div class="wsm-gate"><strong>상담 목록을 준비하고 있습니다.</strong><p>잠시만 기다려 주세요.</p></div>';
  }

  /* 화면 이동 탭(오늘/캘린더/고객/자료)은 하단 고정 탭바로 처리한다. 상단 헤더에는 화면 제목 + PC로 보기 +
     로그아웃만 남긴다(다른 화면들과 동일한 구조). */
  function headerHtml() {
    return '<header class="wsm-header"><strong>상담관리</strong>'
      + '<div class="wsm-header-actions">'
      + '<a class="wsm-pc-link" href="/insubriefing/workstation/?view=personal-workspace&section=consultations">PC로 보기</a>'
      + '<a class="wsm-tab-link" href="#" id="wsm-logout-link">로그아웃</a>'
      + '</div></header>';
  }

  function bindHeaderEvents() {
    var logoutLink = document.getElementById('wsm-logout-link');
    if (logoutLink) logoutLink.addEventListener('click', function (event) { event.preventDefault(); logout(); });
  }

  function bottomNavHtml() {
    return window.OSWorkstationMobileNav ? window.OSWorkstationMobileNav.render('consultations') : '';
  }

  function emptyHtml(message) {
    return '<div class="wsm-empty">' + esc(message) + '</div>';
  }

  function shortDate(dateStr) {
    var parts = String(dateStr || '').slice(0, 10).split('-');
    if (parts.length !== 3) return '';
    return Number(parts[1]) + '/' + Number(parts[2]);
  }

  /* 상태(channel) 필터 칩 — 대표 지시대로 과하게 복잡한 필터 UI를 만들지 않는다. "전체" +
     현재 목록에 실제로 존재하는 channel 값만 등장 순서(최신 상담 기준)대로 칩으로 보여준다. */
  function channelOptions(list) {
    var seen = {};
    var ordered = [];
    list.forEach(function (entry) {
      var ch = entry.channel || '';
      if (!ch || seen[ch]) return;
      seen[ch] = true;
      ordered.push(ch);
    });
    return ordered;
  }

  function filterChipsHtml(list) {
    var options = channelOptions(list);
    if (!options.length) return '';
    var chips = ['<button type="button" class="wsm-consult-chip' + (state.channel === 'all' ? ' is-active' : '') + '" data-channel="all">전체</button>']
      .concat(options.map(function (ch) {
        return '<button type="button" class="wsm-consult-chip' + (state.channel === ch ? ' is-active' : '') + '" data-channel="' + esc(ch) + '">' + esc(ch) + '</button>';
      }));
    return '<div class="wsm-consult-chips" id="wsm-consult-chips">' + chips.join('') + '</div>';
  }

  function filteredList() {
    if (state.channel === 'all') return state.directory;
    return state.directory.filter(function (entry) { return entry.channel === state.channel; });
  }

  /* 카드를 탭하면 같은 화면 안에서 펼쳐 전체 메모를 보여준다(별도 페이지 이동 없음). "이 고객 상세로 이동"
     링크는 customers.html로만 보낸다 — 고객 id 딥링크 기능은 이번 범위 밖이라 새로 만들지 않는다. */
  function consultationCardHtml(entry) {
    var expanded = state.expandedId === entry.id;
    var memo = entry.memo || '';
    var preview = memo.length > PREVIEW_LEN ? memo.slice(0, PREVIEW_LEN) + '…' : memo;
    var metaBits = [shortDate(entry.date) || '날짜 없음'];
    if (entry.channel) metaBits.push(entry.channel);
    var html = '<div class="wsm-consult-item' + (expanded ? ' is-open' : '') + '">'
      + '<button type="button" class="wsm-card wsm-consult-card" data-id="' + esc(entry.id) + '" aria-expanded="' + (expanded ? 'true' : 'false') + '">'
      + '<div class="wsm-card-title">' + esc(entry.customerName) + '</div>'
      + '<div class="wsm-card-sub">' + esc(metaBits.join(' · ')) + '</div>'
      + (preview ? '<div class="wsm-card-meta">' + esc(preview) + '</div>' : '')
      + '</button>';
    if (expanded) {
      html += '<div class="wsm-consult-detail">'
        + (memo ? '<p class="wsm-consult-detail-memo">' + esc(memo) + '</p>' : '<p class="wsm-consult-detail-memo wsm-consult-detail-empty">상담 메모가 없습니다.</p>')
        + '<a class="wsm-consult-detail-link" href="./customers.html">이 고객 상세로 이동 →</a>'
        + '</div>';
    }
    html += '</div>';
    return html;
  }

  function loadMoreButtonHtml(remaining) {
    return '<button type="button" class="wsm-btn wsm-loadmore" id="wsm-consult-more">더 보기 (' + remaining + ')</button>';
  }

  function listBodyHtml() {
    var ready = isDataReady();
    var list = filteredList();
    if (!list.length) {
      return emptyHtml(!ready ? '상담 목록을 불러오는 중입니다.' : (state.channel === 'all' ? '상담 기록이 없습니다.' : '해당 상태의 상담 기록이 없습니다.'));
    }
    var visible = list.slice(0, state.limit);
    return '<div class="wsm-list">' + visible.map(consultationCardHtml).join('')
      + (list.length > visible.length ? loadMoreButtonHtml(list.length - visible.length) : '')
      + '</div>';
  }

  function bindBodyEvents(container) {
    var chipWrap = document.getElementById('wsm-consult-chips');
    if (chipWrap) {
      Array.prototype.forEach.call(chipWrap.querySelectorAll('.wsm-consult-chip'), function (chip) {
        chip.addEventListener('click', function () {
          state.channel = chip.getAttribute('data-channel');
          state.limit = PAGE_SIZE;
          state.expandedId = null;
          renderBody();
          lastRenderedJson = snapshotJson();
        });
      });
    }
    var cards = container.querySelectorAll('.wsm-consult-card');
    Array.prototype.forEach.call(cards, function (card) {
      card.addEventListener('click', function () {
        var id = card.getAttribute('data-id');
        state.expandedId = state.expandedId === id ? null : id;
        renderBody();
        lastRenderedJson = snapshotJson();
      });
    });
    var more = document.getElementById('wsm-consult-more');
    if (more) more.addEventListener('click', function () {
      state.limit += PAGE_SIZE;
      renderBody();
      lastRenderedJson = snapshotJson();
    });
  }

  function renderBody() {
    var container = document.getElementById('wsm-consult-body'); if (!container) return;
    container.innerHTML = filterChipsHtml(state.directory) + listBodyHtml();
    bindBodyEvents(container);
  }

  function renderShell() {
    var view = root(); if (!view) return;
    view.innerHTML = headerHtml()
      + '<main class="wsm-main"><div id="wsm-consult-body"></div></main>'
      + bottomNavHtml();
    bindHeaderEvents();
    renderBody();
  }

  function snapshotJson() {
    return JSON.stringify({ ch: state.channel, exp: state.expandedId, limit: state.limit, dir: state.directory });
  }

  function refreshDirectory() {
    state.directory = (window.OSPersonalWorkspace && typeof window.OSPersonalWorkspace.consultationsDirectory === 'function')
      ? window.OSPersonalWorkspace.consultationsDirectory() : [];
  }

  function renderCurrent() {
    refreshDirectory();
    var json = snapshotJson();
    if (json === lastRenderedJson) return;
    lastRenderedJson = json;
    renderShell();
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

  window.OSWorkstationMobileConsultations = { boot: boot };
  window.addEventListener('load', function () { window.setTimeout(boot, 50); });
})();
