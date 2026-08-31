/* insuwork/m/insuwork-mobile-consultations.js
   보험워크 모바일 "상담" 화면 전용 렌더러 (feat/workstation-mobile-consultations-list, 2026-08-22, 대표 직접 요청).
   지금까지 상담 이력은 고객 상세 화면 안에서 그 고객 것만 볼 수 있었다(customers.js). PC 데스크탑에는 전체
   고객을 가로지르는 "상담관리" 화면이 있는데 모바일엔 없어서 그 격차를 메우는 화면이다.
   데이터/로직은 100% /js/insuwork.js 재사용 — consultationsDirectory() 읽기 전용 조회(이번 작업에서
   새로 추가) + reload()로 기존 loadData() 실행. 이 파일은 화면(뷰 셸)만 새로 그린다 — insuwork.js의
   렌더/저장 함수 본문은 호출하지 않는다. 조회 전용이다(쓰기 기능 없음 — 상담 등록/수정/삭제는 범위 밖).
   네임스페이스 = OSInsuworkMobileConsultations (다른 OSInsuworkMobile* 네임스페이스와 충돌 없음).

   화면 구조: 전체 상담을 최신순으로 카드 나열 + 상태(channel) 필터 칩 + 카드 탭하면 같은 화면 안에서
   펼쳐 전체 메모를 보여주고(별도 페이지 이동 없음) "이 고객 상세로 이동" 링크로 customers.html 이동.
   customers.html이 특정 고객 id로 딥링크되는 기능은 없어서(이번 범위 밖) 목록 화면으로만 이동시킨다. */
(function () {
  'use strict';

  // 2026-08-23 대표 승인 — 고정 17인 파일럿 허용목록 게이트 폐지, 인증된 사용자 전체로 오픈
  // (이관 동의 여부는 checkMigrationChoiceThenStart()가 별도로 확인한다).
  var ROOT_SELECTOR = '#iwm-root';
  var PAGE_SIZE = 20;
  var PREVIEW_LEN = 60;
  // 데이터 로드/케어 갱신 완료 이벤트로 즉시 렌더한다.

  /* feat/workstation-mobile-header-consistency (2026-08-22, 대표 직접 요청) — 카드 안에 인라인으로 펼쳐지는
     아코디언 방식(expandedId)을 customers.js와 동일한 리스트→풀스크린 상세 전환 구조로 바꿨다.
     view='list'|'detail' + selectedId로 상세 화면을 관리한다. channel(필터)·limit(더 보기)은 상세 화면을
     오가도 유지된다(리스트 쪽 상태라 건드리지 않음 — customers.js의 검색어 유지 패턴과 동일). */
  var state = { view: 'list', channel: 'all', selectedId: null, limit: PAGE_SIZE, directory: [] };
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
  /* 게이트 = insuwork-mobile.js(Phase 1)/customers.js의 allowed()/authenticated() 패턴을 그대로 복제.
     게이트를 그대로 상속하되 고정 허용목록은 2026-08-23 폐지됐다(인증된 사용자 전체 허용). */
  function allowed() {
    return isLocalHost() || (authenticated() && !!currentUserId());
  }
  function authenticated() {
    return !!(window.db && window.db.fetch && window.db.getToken && window.db.getToken() && currentUserId());
  }
  /* customers.js/library.js와 동일 패턴 — js/insuwork.js의 isDataReady() 읽기 전용 조회를 그대로
     노출한다. loadData(true)가 완료되기 전(fullLoaded=false)에는 directory가 빈 배열이라 "상담 기록이
     없습니다"가 먼저 그려지고 이후 폴링에서 실제 데이터로 뒤늦게 바뀌는 문제 — 로드 완료 여부로 문구를 분기한다. */
  function isDataReady() {
    return !!(window.OSInsuwork && typeof window.OSInsuwork.isDataReady === 'function' && window.OSInsuwork.isDataReady());
  }
  /* customers.js/library.js와 동일 로직 복제(모바일 화면 로그아웃 진입 경로). insubriefing/hub.js의
     logoutAdvisor()·insuwork/insuwork.js의 logout()이 지우는 storage key 4개를 그대로
     지운 뒤 보험브리핑 홈으로 이동한다(같은 함수를 import할 수 없어 동일 로직만 로컬 복제, 새 판단 없음). */
  function logout() {
    ['os_token', 'os_refresh_token', 'os_user', 'selected_menu'].forEach(function (key) {
      localStorage.removeItem(key); sessionStorage.removeItem(key);
    });
    window.location.replace('/insuwork/');
  }

  function root() { return document.querySelector(ROOT_SELECTOR); }

  function openBriefingAuth(mode) {
    if (window.InsuranceBriefingAuth && typeof window.InsuranceBriefingAuth.open === 'function') {
      window.InsuranceBriefingAuth.open(mode, { redirect: '/insuwork/m/consultations.html' });
      return;
    }
    window.location.href = '/pages/landing.html?auth=' + encodeURIComponent(mode) + '&redirect=%2Finsuwork%2Fm%2Fconsultations.html';
  }

  function renderLoginGate() {
    var view = root(); if (!view) return;
    view.innerHTML = '<div class="iwm-gate">'
      + '<strong>보험워크 로그인이 필요합니다.</strong>'
      + '<p>보험워크 계정으로 로그인하면 상담 목록을 확인할 수 있습니다.</p>'
      + '<div class="iwm-gate-actions"><button type="button" class="iwm-btn primary" id="iwm-login-btn">로그인</button></div>'
      + '<a class="iwm-link" href="/insuwork/">보험워크 홈으로 돌아가기</a>'
      + '</div>';
    var btn = document.getElementById('iwm-login-btn');
    if (btn) btn.addEventListener('click', function () { openBriefingAuth('login'); });
  }

  function renderDeniedGate() {
    var view = root(); if (!view) return;
    view.innerHTML = '<div class="iwm-gate">'
      + '<strong>보험워크 준비 중</strong>'
      + '<p>이 계정은 아직 이용 대상이 아닙니다.</p>'
      + '<a class="iwm-link" href="/insuwork/">보험워크 홈으로 돌아가기</a>'
      + '</div>';
  }

  /* 2026-08-23 대표 승인 — 데스크톱(js/insuwork.js STANDALONE 경로)에만 이관 동의 팝업(migrate-choice)이
     뜬다. 모바일 페이지도 data-insuwork="true"라 STANDALONE 자체는 true지만, 팝업 로직이 붙어 있는
     #v-insuwork 컨테이너가 모바일 HTML에는 없어(#iwm-root만 있음) 그 경로는 조용히 no-op된다. 그래서
     모바일 5개 파일에 각각 팝업/RPC 흐름을 통째로 복제하는 대신, 가벼운 안내만 둔다: allowed() 통과 후
     insuwork_migration_choices에 본인 row가 있는지만 확인하고, 없으면(=아직 PC에서 결정 안 함) 데스크톱
     안내 화면만 보여준다(가져오기/새로 시작하기 버튼은 만들지 않음 — PC에서 한 번 결정하면 그 다음부터는
     모바일에서도 row가 조회되어 정상 진행). 조회 자체가 실패(DB PR 미반영 등)하면 fail-open으로 진행한다. */
  function renderMigrationPendingGate() {
    var view = root(); if (!view) return;
    view.innerHTML = '<div class="iwm-gate">'
      + '<strong>PC에서 먼저 설정해 주세요</strong>'
      + '<p>PC(보험워크)에서 먼저 한 번 설정을 완료해 주세요.</p>'
      + '<a class="iwm-link" href="/insuwork/">PC(보험워크) 열기</a>'
      + '</div>';
  }
  function checkMigrationChoiceThenStart() {
    var id = currentUserId();
    if (!id || !window.db || !window.db.fetch) { startDataFlow(); return; }
    window.db.fetch('/rest/v1/insuwork_migration_choices?user_id=eq.' + encodeURIComponent(id) + '&select=choice&limit=1').then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }).then(function (rows) {
      if (Array.isArray(rows) && rows.length) { startDataFlow(); return; }
      renderMigrationPendingGate();
    }).catch(function (error) {
      console.warn('Migration choice check failed (계속 진행)', error);
      startDataFlow();
    });
  }

  function renderLoading() {
    var view = root(); if (!view) return;
    view.innerHTML = '<div class="iwm-gate"><strong>상담 목록을 준비하고 있습니다.</strong><p>잠시만 기다려 주세요.</p></div>';
  }

  /* 화면 이동 탭(오늘/캘린더/고객/자료)은 하단 고정 탭바로 처리한다. feat/workstation-mobile-header-consistency
     (2026-08-22, 대표 직접 요청) — PC로 보기/로그아웃은 "⋯" 메뉴 안으로 숨기고, 보험브리핑 홈으로 돌아가는
     링크를 추가했다(다른 화면들과 동일한 구조). */
  function headerHtml() {
    return window.OSInsuworkMobileNav ? window.OSInsuworkMobileNav.header('상담', 'consultations') : '<header class="iwm-header"><strong>상담</strong></header>';
  }

  /* 바깥 클릭 닫기 리스너는 document에 한 번만 등록한다(매 재렌더마다 새로 붙이면 리스너가 누적되므로,
     클릭 시점에 getElementById로 최신 DOM을 다시 조회하는 방식으로 재렌더에도 안전하게 동작). */
  var menuOutsideBound = false;
  function bindHeaderEvents() {
    var logoutLink = document.getElementById('iwm-logout-link');
    if (logoutLink) logoutLink.addEventListener('click', function (event) { event.preventDefault(); logout(); });
    var menuBtn = document.getElementById('iwm-menu-btn');
    var menuPanel = document.getElementById('iwm-menu-panel');
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
        var panel = document.getElementById('iwm-menu-panel');
        var btn = document.getElementById('iwm-menu-btn');
        if (!panel || panel.hidden) return;
        if (panel.contains(event.target) || (btn && btn.contains(event.target))) return;
        panel.hidden = true;
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }
  }

  function bottomNavHtml() {
    return window.OSInsuworkMobileNav ? window.OSInsuworkMobileNav.render('consultations') : '';
  }

  function emptyHtml(message) {
    return '<div class="iwm-empty">' + esc(message) + '</div>';
  }

  function shortDate(dateStr) {
    var parts = String(dateStr || '').slice(0, 10).split('-');
    if (parts.length !== 3) return '';
    return Number(parts[1]) + '/' + Number(parts[2]);
  }

  /* PC 상담관리 기준과 맞춰 상담상태를 기준으로 필터링한다. */
  function channelOptions(list) {
    var seen = {};
    var ordered = [];
    list.forEach(function (entry) {
      var ch = entry.status || entry.channel || '';
      if (!ch || seen[ch]) return;
      seen[ch] = true;
      ordered.push(ch);
    });
    return ordered;
  }

  function filterChipsHtml(list) {
    var options = channelOptions(list);
    if (!options.length) return '';
    var chips = ['<button type="button" class="iwm-consult-chip' + (state.channel === 'all' ? ' is-active' : '') + '" data-channel="all">전체</button>']
      .concat(options.map(function (ch) {
        return '<button type="button" class="iwm-consult-chip' + (state.channel === ch ? ' is-active' : '') + '" data-channel="' + esc(ch) + '">' + esc(ch) + '</button>';
      }));
    return '<div class="iwm-consult-chips" id="iwm-consult-chips">' + chips.join('') + '</div>';
  }

  function filteredList() {
    if (state.channel === 'all') return state.directory;
    return state.directory.filter(function (entry) { return (entry.status || entry.channel || '') === state.channel; });
  }

  /* feat/workstation-mobile-header-consistency (2026-08-22) — 카드는 목록 화면에서 미리보기만 보여주고,
     탭하면 openDetail()로 풀스크린 상세 화면으로 전환한다(customers.js와 동일 패턴, 카드 안 인라인 펼침 없음). */
  function consultationCardHtml(entry) {
    var memo = entry.memo || '';
    var preview = memo.length > PREVIEW_LEN ? memo.slice(0, PREVIEW_LEN) + '…' : memo;
    var metaBits = [shortDate(entry.date) || '날짜 없음'];
    if (entry.status || entry.channel) metaBits.push(entry.status || entry.channel);
    return '<button type="button" class="iwm-card iwm-consult-card" data-id="' + esc(entry.id) + '">'
      + '<div class="iwm-card-title">' + esc(entry.customerName) + '</div>'
      + '<div class="iwm-card-sub">' + esc(metaBits.join(' · ')) + '</div>'
      + (preview ? '<div class="iwm-card-meta">' + esc(preview) + '</div>' : '')
      + '</button>';
  }

  function loadMoreButtonHtml(remaining) {
    return '<button type="button" class="iwm-btn iwm-loadmore" id="iwm-consult-more">더 보기 (' + remaining + ')</button>';
  }

  function listBodyHtml() {
    var ready = isDataReady();
    var list = filteredList();
    if (!list.length) {
      return emptyHtml(!ready ? '상담 목록을 불러오는 중입니다.' : (state.channel === 'all' ? '상담 기록이 없습니다.' : '해당 상태의 상담 기록이 없습니다.'));
    }
    var visible = list.slice(0, state.limit);
    return '<div class="iwm-list">' + visible.map(consultationCardHtml).join('')
      + (list.length > visible.length ? loadMoreButtonHtml(list.length - visible.length) : '')
      + '</div>';
  }

  function findConsultation(id) {
    return state.directory.find(function (entry) { return String(entry.id) === String(id); });
  }

  function openDetail(id) {
    if (!id) return;
    state.view = 'detail'; state.selectedId = id; lastRenderedJson = '';
    renderCurrent();
  }

  function bindListBodyEvents(container) {
    var chipWrap = document.getElementById('iwm-consult-chips');
    if (chipWrap) {
      Array.prototype.forEach.call(chipWrap.querySelectorAll('.iwm-consult-chip'), function (chip) {
        chip.addEventListener('click', function () {
          state.channel = chip.getAttribute('data-channel');
          state.limit = PAGE_SIZE;
          renderListBody();
          lastRenderedJson = snapshotJson();
        });
      });
    }
    var cards = container.querySelectorAll('.iwm-consult-card');
    Array.prototype.forEach.call(cards, function (card) {
      card.addEventListener('click', function () { openDetail(card.getAttribute('data-id')); });
    });
    var more = document.getElementById('iwm-consult-more');
    if (more) more.addEventListener('click', function () {
      state.limit += PAGE_SIZE;
      renderListBody();
      lastRenderedJson = snapshotJson();
    });
  }

  function renderListBody() {
    var container = document.getElementById('iwm-consult-body'); if (!container) return;
    container.innerHTML = filterChipsHtml(state.directory) + listBodyHtml();
    bindListBodyEvents(container);
  }

  function renderListShell() {
    var view = root(); if (!view) return;
    view.innerHTML = headerHtml()
      + '<main class="iwm-main"><div id="iwm-consult-body"></div></main>'
      + bottomNavHtml();
    if (window.OSInsuworkMobileNav && window.OSInsuworkMobileNav.bindHeader) window.OSInsuworkMobileNav.bindHeader();
    renderListBody();
  }

  /* 대표 지시(2026-08-22) — 카드 안 인라인 펼침을 customers.js와 동일한 "리스트→풀스크린 상세" 구조로
     통일한다. "← 목록" 뒤로가기 버튼 + 하단 탭바를 유지한다(customers.js가 이미 하는 그대로). 필터(channel)·
     더보기(limit)는 state에 그대로 남아 있어 상세 화면을 다녀와도 유지된다. */
  function renderDetailShell() {
    var view = root(); if (!view) return;
    var entry = findConsultation(state.selectedId);
    if (!entry) { state.view = 'list'; state.selectedId = null; renderListShell(); return; }

    var memo = entry.memo || '';
    var metaBits = [shortDate(entry.date) || '날짜 없음'];
    if (entry.status || entry.channel) metaBits.push(entry.status || entry.channel);

    view.innerHTML = headerHtml()
      + '<main class="iwm-main">'
      + '<button type="button" class="iwm-btn iwm-consult-back" id="iwm-consult-back">← 목록</button>'
      + '<section class="iwm-consult-detail-head">'
      + '<div class="iwm-consult-detail-name">' + esc(entry.customerName || '(이름 없음)') + '</div>'
      + '<div class="iwm-consult-detail-meta">' + esc(metaBits.join(' · ')) + '</div>'
      + '</section>'
      + '<div class="iwm-consult-detail-body">'
      + (memo ? '<p class="iwm-consult-detail-memo">' + esc(memo) + '</p>' : '<p class="iwm-consult-detail-memo iwm-consult-detail-empty">상담 메모가 없습니다.</p>')
      + '<a class="iwm-consult-detail-link" href="./customers.html">이 고객 상세로 이동 →</a>'
      + '</div>'
      + '</main>'
      + bottomNavHtml();
    if (window.OSInsuworkMobileNav && window.OSInsuworkMobileNav.bindHeader) window.OSInsuworkMobileNav.bindHeader();

    var back = document.getElementById('iwm-consult-back');
    if (back) back.addEventListener('click', function () {
      state.view = 'list'; state.selectedId = null; lastRenderedJson = '';
      renderCurrent();
    });
  }

  function snapshotJson() {
    return JSON.stringify({ view: state.view, id: state.selectedId, ch: state.channel, limit: state.limit, dir: state.directory });
  }

  function refreshDirectory() {
    state.directory = (window.OSInsuwork && typeof window.OSInsuwork.consultationsDirectory === 'function')
      ? window.OSInsuwork.consultationsDirectory() : [];
  }

  function renderCurrent() {
    refreshDirectory();
    var json = snapshotJson();
    if (json === lastRenderedJson) return;
    lastRenderedJson = json;
    if (state.view === 'detail' && state.selectedId) renderDetailShell();
    else renderListShell();
  }

  document.addEventListener('insuwork:data-ready', function () { if (authenticated()) renderCurrent(); });

  function startDataFlow() {
    var detailId = new URLSearchParams(location.search).get("id");
    if (detailId) { state.view = "detail"; state.selectedId = detailId; }
    renderLoading();
    if (window.OSInsuwork && typeof window.OSInsuwork.reload === 'function') {
      window.OSInsuwork.reload();
    }

  }

  function boot() {
    var view = root(); if (!view) return;
    if (!authenticated()) { renderLoginGate(); return; }
    document.addEventListener('appstate:ready', function onReady() {
      document.removeEventListener('appstate:ready', onReady);
      if (!allowed()) { renderDeniedGate(); return; }
      checkMigrationChoiceThenStart();
    });
    if (window.Auth && typeof window.Auth.init === 'function') {
      window.Auth.init().catch(function () { renderLoginGate(); });
    } else {
      renderLoginGate();
    }
  }

  window.OSInsuworkMobileConsultations = { boot: boot };
  window.addEventListener('load', function () { window.setTimeout(boot, 50); });
})();
