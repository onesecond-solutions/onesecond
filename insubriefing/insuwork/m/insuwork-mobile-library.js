/* insubriefing/insuwork/m/insuwork-mobile-library.js
   보험워크 모바일 "자료" 화면 전용 렌더러 (Phase 5, 2026-08-22, feat/workstation-mobile-library — 5단계 로드맵 마지막 단계).
   데이터/로직은 100% /js/insuwork.js 재사용 — libraryDirectory()/libraryFeedDirectory() 읽기 전용
   조회 + reload()로 기존 loadData() 실행. 이 파일은 화면(뷰 셸)만 새로 그린다 — insuwork.js의
   렌더/저장 함수 본문은 호출하지 않는다. 이번 Phase 5도 조회 전용이다(쓰기 기능 없음).
   네임스페이스 = OSInsuworkMobileLibrary (다른 OSInsuworkMobile* 네임스페이스와 충돌 없음).

   코상무 확정 방향: 모바일 자료실은 "정리"보다 "찾아서 보여주기"가 핵심 — 소식지·상품라인업·업무노트(구 "스크립트"
   표시명)·영업방향을 빠르게 검색·미리보기.

   실제 조사 결과(코드 확인, 2026-08-22) — 4개 자료가 데이터 구조상 완전히 다르다:
   1) 자료실(state.data.library, item_type=memo/file/link, 폴더 제외) · 업무노트(state.data.scripts,
      item_type='note') — loadData(true)가 한 번에 불러오는 insuwork_items 안 텍스트 콘텐츠. 본문이
      있어 통합 검색(제목+본문) + 화면 안 펼쳐보기가 가능하다. 이 화면의 핵심 기능.
   2) 소식지(newsletters 테이블) · 영업방향(sales_strategy 테이블) — PDF 원문 메타데이터만 있고 본문 텍스트가
      없다(회사/제목/발행월만). loadNewsletterData()/loadStrategyData()로 별도 지연 로드되며, 서명 URL이
      필요한 signStoragePath()는 비공개 클로저라 이 화면에서 재구현하지 않는다. 그래서 통합 검색 대상에서는
      제외하고 "최근 목록 + 원문 바로 URL(source_pdf_url/source_file_url)이 있을 때만 새 창 열기, 없으면
      PC 버전 링크"로만 노출한다.
   3) 상품라인업 — js/insuwork.js 소관이 아니라 완전히 별도 시스템(/insu/index.html,
      _svLoadProducts 계열이 /data/insurer_products_2608.json을 따로 fetch)이라 이번 Phase 범위에서
      제외하고 PC 버전 안내 카드만 둔다. */
(function () {
  'use strict';

  // 2026-08-23 대표 승인 — js/insuwork.js의 ALLOWED_IDS와 동일 목록(실제 자료가 있는 사용자만)
  var ALLOWED_IDS = [
    '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd', 'ce381ed4-05e3-41cf-8546-9115abe89ec9',
    'fee71d85-adc4-4db6-81b0-152f07add62a', '583cbad5-f248-4fd9-8693-5c3a79ba9487',
    '6f5aaa10-be20-4274-a190-53ce38ed3850', '12c8551b-4622-4fe4-9dba-d77fef8504bf',
    'efe26e96-de4e-4613-9625-7c8193d39a49', 'd19dcb63-3e28-4559-b498-56b19f9c94f2',
    'e10f9713-a199-47ac-9040-eb8007824cda', '8028a0e9-ec19-408b-8a82-007732fbed2b',
    'bb49f5b9-e620-41d2-bee5-89329cbc5d7d', '10a859ec-8dc6-43bd-bc7b-09e3f16c8248',
    '49343788-b3e1-4666-b95f-211ac6b3f878', 'de7ba389-901a-426a-9828-6afb33a16ecc',
    '64d0e07f-ec84-430b-b2ea-b7213e857ace', '6f7fbad3-fe3f-416c-a077-9e36be425d5c',
    'ba679086-dc1e-4a99-9245-9f4cf8222455'
  ];
  var ROOT_SELECTOR = '#iwm-root';
  var RECENT_PAGE_SIZE = 6;
  /* reload()가 Promise를 반환하지 않아(기존 export 시그니처 변경 없음) 완료 신호를 직접 받을 수 없다.
     대신 짧은 간격으로 재조회 → 직전 렌더와 동일하면 스킵하는 폴링으로 최종 일관성을 맞춘다(추가 API 호출 아님, 순수 재조회). */
  var POLL_DELAYS_MS = [400, 900, 1600, 2600, 4000];

  var PC_LINKS = {
    assets: '/insubriefing/insuwork/?view=insuwork&section=assets',
    newsletters: '/insubriefing/insuwork/?view=insuwork&section=newsletters',
    strategy: '/insubriefing/insuwork/?view=insuwork&section=sales-strategy',
    productLineup: '/insu/?view=product-lineup'
  };

  /* feat/workstation-mobile-header-consistency (2026-08-22, 대표 직접 요청) — 카드 안에서 본문(bodyHtml)이
     펼쳐지던 아코디언 방식(expandedKey)을 customers.js와 동일한 리스트→풀스크린 상세 전환 구조로 바꿨다.
     view='list'|'detail' + selectedKey로 상세 화면을 관리한다. query(검색어)·각 섹션 limit(더 보기)은
     상세 화면을 오가도 유지된다(리스트 쪽 상태라 건드리지 않음). sanitize/linkify 로직(entry.bodyHtml)
     자체는 전혀 손대지 않는다 — 그 안전한 HTML을 어느 화면(카드 안 vs 풀스크린)에 꽂을지만 바뀐다. */
  var state = {
    view: 'list', query: '', selectedKey: null,
    libraryLimit: RECENT_PAGE_SIZE, scriptsLimit: RECENT_PAGE_SIZE, newsLimit: RECENT_PAGE_SIZE, strategyLimit: RECENT_PAGE_SIZE,
    directory: [], feed: { newsletters: [], strategies: [], newsletterLoading: false, strategyLoading: false }
  };
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
  /* 게이트 = insuwork-mobile.js(Phase 1)의 allowed()/authenticated() 패턴을 그대로 복제.
     게이트(ALLOWED_IDS, 실제 자료가 있는 사용자만)를 그대로 상속한다. */
  function allowed() {
    return isLocalHost() || ALLOWED_IDS.indexOf(currentUserId()) >= 0;
  }
  function authenticated() {
    return !!(window.db && window.db.fetch && window.db.getToken && window.db.getToken() && currentUserId());
  }
  /* fix/workstation-mobile-bugs 버그1 대응 — js/insuwork.js의 isDataReady() 읽기 전용 조회를 그대로
     노출한다. loadData(true)가 완료되기 전(fullLoaded=false)에는 directory가 빈 배열이라 "지정된 자료가
     없습니다"류 문구가 먼저 그려지고 이후 폴링에서 실제 데이터로 뒤늦게 바뀌는 문제 — 로드 완료 여부로
     문구를 분기한다. */
  function isDataReady() {
    return !!(window.OSInsuwork && typeof window.OSInsuwork.isDataReady === 'function' && window.OSInsuwork.isDataReady());
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
      window.InsuranceBriefingAuth.open(mode, { redirect: '/insubriefing/insuwork/m/library.html' });
      return;
    }
    window.location.href = '/pages/landing.html?auth=' + encodeURIComponent(mode) + '&redirect=%2Finsubriefing%2Finsuwork%2Fm%2Flibrary.html';
  }

  function renderLoginGate() {
    var view = root(); if (!view) return;
    view.innerHTML = '<div class="iwm-gate">'
      + '<strong>보험워크 로그인이 필요합니다.</strong>'
      + '<p>보험브리핑 계정으로 로그인하면 자료를 확인할 수 있습니다.</p>'
      + '<div class="iwm-gate-actions"><button type="button" class="iwm-btn primary" id="iwm-login-btn">로그인</button></div>'
      + '<a class="iwm-link" href="/insubriefing/">보험브리핑으로 돌아가기</a>'
      + '</div>';
    var btn = document.getElementById('iwm-login-btn');
    if (btn) btn.addEventListener('click', function () { openBriefingAuth('login'); });
  }

  function renderDeniedGate() {
    var view = root(); if (!view) return;
    view.innerHTML = '<div class="iwm-gate">'
      + '<strong>보험워크 준비 중</strong>'
      + '<p>현재 임태성 계정에서 먼저 완성하고 있습니다.</p>'
      + '<a class="iwm-link" href="/insubriefing/">보험브리핑으로 돌아가기</a>'
      + '</div>';
  }

  function renderLoading() {
    var view = root(); if (!view) return;
    view.innerHTML = '<div class="iwm-gate"><strong>자료를 준비하고 있습니다.</strong><p>잠시만 기다려 주세요.</p></div>';
  }

  /* feat/workstation-mobile-bottom-nav — 화면 이동 탭(오늘/캘린더/고객)은 하단 고정 탭바로 옮겼다.
     feat/workstation-mobile-header-consistency (2026-08-22, 대표 직접 요청) — PC로 보기/로그아웃은
     "⋯" 메뉴 안으로 숨기고, 보험브리핑 홈으로 돌아가는 링크를 추가했다. */
  function headerHtml() {
    return '<header class="iwm-header"><strong>자료</strong>'
      + '<div class="iwm-header-actions">'
      + '<button type="button" class="iwm-menu-btn" id="iwm-menu-btn" aria-haspopup="true" aria-expanded="false" aria-label="메뉴">⋯</button>'
      + '</div>'
      + '<div class="iwm-menu-panel" id="iwm-menu-panel" hidden>'
      + '<a class="iwm-menu-item" href="/insubriefing/">보험브리핑 홈</a>'
      + '<a class="iwm-menu-item" href="' + esc(PC_LINKS.assets) + '">PC 버전으로 보기</a>'
      + '<a class="iwm-menu-item" href="#" id="iwm-logout-link">로그아웃</a>'
      + '</div>'
      + '</header>';
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

  function emptyHtml(message) {
    return '<div class="iwm-empty">' + esc(message) + '</div>';
  }

  function sectionHtml(title, bodyHtmlStr) {
    return '<section class="iwm-section">'
      + '<h2 class="iwm-section-title">' + esc(title) + '</h2>'
      + bodyHtmlStr
      + '</section>';
  }

  function shortDate(dateStr) {
    var parts = String(dateStr || '').slice(0, 10).split('-');
    if (parts.length !== 3) return '';
    return Number(parts[1]) + '/' + Number(parts[2]);
  }

  function byCreatedDesc(a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); }

  /* 검색·미리보기 대상 통합 목록(자료실+업무노트) 카드. feat/workstation-mobile-header-consistency
     (2026-08-22) — 카드 안 인라인 펼침(아코디언)을 없애고, 탭하면 openDetail()로 풀스크린 상세 화면으로
     전환한다(customers.js와 동일 패턴). entry.bodyHtml은 js/insuwork.js의 libraryDirectory()가
     데스크탑 showAsset()과 동일하게 linkifyRich()(내부적으로 sanitizeRich() 재실행)를 거쳐 돌려준 안전한
     HTML 문자열이다 — expandBodyHtml()에서 그대로 innerHTML에 꽂는 처리는 그대로 유지한다(데스크탑과 동일
     처리, sanitize/linkify 로직 자체는 손대지 않음 — 화면 전환 방식만 바뀜). 제목·미리보기 스니펫은 평문이라
     esc()로 이스케이프한다. */
  function entryCardHtml(entry) {
    var key = entry.source + ':' + entry.id;
    var snippet = entry.previewText ? esc(entry.previewText) + (entry.previewText.length >= 100 ? '…' : '') : '';
    return '<button type="button" class="iwm-card iwm-lib-card" data-key="' + esc(key) + '">'
      + '<span class="iwm-lib-kind">' + esc(entry.kind) + '</span>'
      + '<div class="iwm-card-title">' + esc(entry.title || '(제목 없음)') + '</div>'
      + (snippet ? '<div class="iwm-card-sub">' + snippet + '</div>' : '')
      + (entry.createdAt ? '<div class="iwm-card-meta">' + esc(shortDate(entry.createdAt)) + '</div>' : '')
      + '</button>';
  }

  function expandBodyHtml(entry) {
    if (entry.bodyHtml && String(entry.bodyHtml).trim()) {
      return '<div class="iwm-lib-body-rich">' + entry.bodyHtml + '</div>';
    }
    if (entry.linkUrl) {
      return '<a class="iwm-lib-open-link" href="' + esc(entry.linkUrl) + '" target="_blank" rel="noopener noreferrer">원본 링크 열기 ↗</a>';
    }
    return '<p class="iwm-lib-empty-note">미리보기할 내용이 없습니다. PC 버전에서 확인해 주세요.</p>';
  }

  function searchResultsHtml(query) {
    var q = query.toLowerCase();
    var matches = state.directory.filter(function (entry) { return entry.searchText.indexOf(q) >= 0; }).sort(byCreatedDesc);
    if (!matches.length) return sectionHtml('검색 결과', emptyHtml(isDataReady() ? '일치하는 자료·업무노트가 없습니다.' : '자료를 불러오는 중입니다…'));
    return sectionHtml('검색 결과 ' + matches.length + '건', '<div class="iwm-list">' + matches.map(entryCardHtml).join('') + '</div>');
  }

  function loadMoreButtonHtml(id, remaining) {
    return '<button type="button" class="iwm-btn iwm-loadmore" id="' + id + '">더 보기 (' + remaining + ')</button>';
  }

  /* fix/workstation-mobile-bugs 버그1 — ready=false(loadData(true) 완료 전)면 "저장된 자료가 없습니다" 같은
     빈 상태 문구 대신 로딩 문구를 보여준다. allRows 자체가 아직 채워지기 전이라 항상 length 0인 시점이라
     empty-state 판정에 로드 완료 여부를 추가한 것뿐, 목록 조립 로직은 그대로다. */
  function recentSectionHtml(title, allRows, limit, moreId, emptyMessage, ready) {
    var sorted = allRows.slice().sort(byCreatedDesc);
    if (!sorted.length) return sectionHtml(title, emptyHtml(ready ? emptyMessage : '불러오는 중입니다…'));
    var visible = sorted.slice(0, limit);
    var body = '<div class="iwm-list">' + visible.map(entryCardHtml).join('')
      + (sorted.length > visible.length ? loadMoreButtonHtml(moreId, sorted.length - visible.length) : '')
      + '</div>';
    return sectionHtml(title, body);
  }

  /* 소식지·영업방향 카드 — 본문 텍스트가 없어(PDF 메타데이터만) 미리보기 펼치기 대신 원문 열기 링크만 제공.
     source_pdf_url/source_file_url(직접 URL)이 있으면 새 창으로 바로 열고, 없으면(서명 URL이 필요한 경우)
     서명 로직을 이 화면에서 새로 구현하지 않고 PC 버전 링크로 안내한다. */
  function feedCardHtml(entry, pcHref) {
    var href = entry.openUrl || pcHref;
    var subLabel = entry.openUrl ? (entry.kind + ' · 새 창에서 열기 ↗') : (entry.kind + ' · PC 버전에서 열기');
    var target = entry.openUrl ? ' target="_blank" rel="noopener noreferrer"' : '';
    return '<a class="iwm-card iwm-lib-feed-card" href="' + esc(href) + '"' + target + '>'
      + '<div class="iwm-card-title">' + esc(entry.title || '(제목 없음)') + '</div>'
      + '<div class="iwm-card-sub">' + esc(subLabel) + '</div>'
      + '</a>';
  }

  function feedSectionHtml(title, rows, loading, limit, moreId, pcHref, emptyMessage) {
    if (loading && !rows.length) return sectionHtml(title, emptyHtml('불러오는 중입니다…'));
    var sorted = rows.slice().sort(function (a, b) { return (b.sortKey || 0) - (a.sortKey || 0); });
    if (!sorted.length) return sectionHtml(title, emptyHtml(emptyMessage));
    var visible = sorted.slice(0, limit);
    var body = '<div class="iwm-list">' + visible.map(function (entry) { return feedCardHtml(entry, pcHref); }).join('')
      + (sorted.length > visible.length ? loadMoreButtonHtml(moreId, sorted.length - visible.length) : '')
      + '</div>';
    return sectionHtml(title, body);
  }

  /* 상품라인업 = js/insuwork.js 소관이 아닌 완전히 별도 시스템(/insu/index.html)이라
     이번 Phase 범위에서 제외하고 PC 버전 안내 카드만 둔다(억지로 통합하지 않음). */
  function productLineupSectionHtml() {
    return sectionHtml('상품 라인업', '<a class="iwm-card iwm-lib-feed-card" href="' + esc(PC_LINKS.productLineup) + '">'
      + '<div class="iwm-card-title">상품 라인업은 PC 버전에서 확인해 주세요</div>'
      + '<div class="iwm-card-sub">원수사 상품 자료는 별도 화면에서 관리됩니다.</div>'
      + '</a>');
  }

  function browseHtml() {
    var ready = isDataReady();
    var library = state.directory.filter(function (entry) { return entry.source === 'library'; });
    var scripts = state.directory.filter(function (entry) { return entry.source === 'scripts'; });
    return recentSectionHtml('최근 자료실', library, state.libraryLimit, 'iwm-lib-more-library', '저장된 자료가 없습니다.', ready)
      + recentSectionHtml('최근 업무노트', scripts, state.scriptsLimit, 'iwm-lib-more-scripts', '작성된 업무노트가 없습니다.', ready)
      + feedSectionHtml('소식지', state.feed.newsletters || [], state.feed.newsletterLoading, state.newsLimit, 'iwm-lib-more-news', PC_LINKS.newsletters, '소식지가 없습니다.')
      + feedSectionHtml('영업방향', state.feed.strategies || [], state.feed.strategyLoading, state.strategyLimit, 'iwm-lib-more-strategy', PC_LINKS.strategy, '영업방향 자료가 없습니다.')
      + productLineupSectionHtml();
  }

  function bodyHtml() {
    var q = state.query.trim();
    return q ? searchResultsHtml(q) : browseHtml();
  }

  function findEntry(key) {
    return state.directory.find(function (entry) { return (entry.source + ':' + entry.id) === key; });
  }

  function openDetail(key) {
    if (!key) return;
    state.view = 'detail'; state.selectedKey = key; lastRenderedJson = '';
    renderCurrent();
  }

  function bindListBodyEvents(container) {
    var cards = container.querySelectorAll('.iwm-lib-card');
    Array.prototype.forEach.call(cards, function (btn) {
      btn.addEventListener('click', function () { openDetail(btn.getAttribute('data-key')); });
    });
    bindMoreButton(container, 'iwm-lib-more-library', function () { state.libraryLimit += RECENT_PAGE_SIZE; });
    bindMoreButton(container, 'iwm-lib-more-scripts', function () { state.scriptsLimit += RECENT_PAGE_SIZE; });
    bindMoreButton(container, 'iwm-lib-more-news', function () { state.newsLimit += RECENT_PAGE_SIZE; });
    bindMoreButton(container, 'iwm-lib-more-strategy', function () { state.strategyLimit += RECENT_PAGE_SIZE; });
  }

  function bindMoreButton(container, id, apply) {
    var btn = container.querySelector('#' + id); if (!btn) return;
    btn.addEventListener('click', function () {
      apply();
      renderListBody();
      lastRenderedJson = snapshotJson();
    });
  }

  function renderListBody() {
    var container = document.getElementById('iwm-lib-body'); if (!container) return;
    container.innerHTML = bodyHtml();
    bindListBodyEvents(container);
  }

  function renderListShell() {
    var view = root(); if (!view) return;
    view.innerHTML = headerHtml()
      + '<main class="iwm-main">'
      + '<div class="iwm-lib-search-wrap"><input type="search" id="iwm-lib-search" class="iwm-lib-search" placeholder="소식지·업무노트·영업방향 통합 검색" autocomplete="off" inputmode="search"></div>'
      + '<div id="iwm-lib-body"></div>'
      + '</main>'
      + (window.OSInsuworkMobileNav ? window.OSInsuworkMobileNav.render('library') : '');
    bindHeaderEvents();
    var input = document.getElementById('iwm-lib-search');
    if (input) {
      input.value = state.query;
      input.addEventListener('input', function () {
        state.query = input.value;
        renderListBody();
        /* 검색어 갱신은 검색창 자체를 다시 그리지 않는 부분 업데이트(renderListBody)로 처리해 포커스를 보존한다.
           이후 폴링이 같은 스냅샷을 보고 전체 재렌더(포커스 소실)하지 않도록 스냅샷 캐시도 함께 갱신한다. */
        lastRenderedJson = snapshotJson();
      });
    }
    renderListBody();
  }

  /* 대표 지시(2026-08-22) — 카드 탭하면 본문이 카드 안에서 펼쳐지던 방식을 customers.js와 동일한
     "리스트→풀스크린 상세" 구조로 통일한다. "← 목록" 뒤로가기 버튼 + 하단 탭바를 유지한다(customers.js가
     이미 하는 그대로). expandBodyHtml()이 그대로 반환하는 신뢰된 HTML(entry.bodyHtml)을 그대로 꽂는다 —
     sanitize/linkify 로직은 건드리지 않는다. 검색어(query)·각 섹션 limit은 상세 화면을 다녀와도 유지된다. */
  function renderDetailShell() {
    var view = root(); if (!view) return;
    var entry = findEntry(state.selectedKey);
    if (!entry) { state.view = 'list'; state.selectedKey = null; renderListShell(); return; }

    view.innerHTML = headerHtml()
      + '<main class="iwm-main">'
      + '<button type="button" class="iwm-btn iwm-lib-back" id="iwm-lib-back">← 목록</button>'
      + '<section class="iwm-lib-detail-head">'
      + '<span class="iwm-lib-kind">' + esc(entry.kind) + '</span>'
      + '<div class="iwm-lib-detail-title">' + esc(entry.title || '(제목 없음)') + '</div>'
      + (entry.createdAt ? '<div class="iwm-lib-detail-date">' + esc(shortDate(entry.createdAt)) + '</div>' : '')
      + '</section>'
      + '<div class="iwm-lib-detail-full">' + expandBodyHtml(entry) + '</div>'
      + '</main>'
      + (window.OSInsuworkMobileNav ? window.OSInsuworkMobileNav.render('library') : '');
    bindHeaderEvents();

    var back = document.getElementById('iwm-lib-back');
    if (back) back.addEventListener('click', function () {
      state.view = 'list'; state.selectedKey = null; lastRenderedJson = '';
      renderCurrent();
    });
  }

  function snapshotJson() {
    return JSON.stringify({
      view: state.view, key: state.selectedKey, q: state.query,
      ll: state.libraryLimit, sl: state.scriptsLimit, nl: state.newsLimit, stl: state.strategyLimit,
      dir: state.directory, feed: state.feed
    });
  }

  function refreshData() {
    state.directory = (window.OSInsuwork && typeof window.OSInsuwork.libraryDirectory === 'function')
      ? window.OSInsuwork.libraryDirectory() : [];
    state.feed = (window.OSInsuwork && typeof window.OSInsuwork.libraryFeedDirectory === 'function')
      ? window.OSInsuwork.libraryFeedDirectory() : { newsletters: [], strategies: [], newsletterLoading: false, strategyLoading: false };
  }

  function renderCurrent() {
    refreshData();
    var json = snapshotJson();
    if (json === lastRenderedJson) return;
    lastRenderedJson = json;
    if (state.view === 'detail' && state.selectedKey) renderDetailShell();
    else renderListShell();
  }

  function pollAndRender(index) {
    renderCurrent();
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

  window.OSInsuworkMobileLibrary = { boot: boot };
  window.addEventListener('load', function () { window.setTimeout(boot, 50); });
})();
