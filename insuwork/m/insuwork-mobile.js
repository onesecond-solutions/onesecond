/* insuwork/m/insuwork-mobile.js
   보험워크 모바일 "오늘" 화면 전용 렌더러 (Phase 1 MVP, 2026-08-22, feat/workstation-mobile-today).
   데이터/로직은 100% /js/insuwork.js 재사용(todaySummary/upcomingConsultPrep 읽기 전용 조회 + reload()로
   기존 loadData() 실행). 이 파일은 화면(뷰 셸)만 새로 그린다 — insuwork.js의 렌더 함수는 호출하지 않는다.
   네임스페이스 = OSInsuworkMobile (기존 iw-/_ci/sn- 네임스페이스와 충돌 없음). */
(function () {
  'use strict';

  // 2026-08-23 대표 승인 — 고정 17인 파일럿 허용목록 게이트 폐지, 인증된 사용자 전체로 오픈
  // (이관 동의 여부는 checkMigrationChoiceThenStart()가 별도로 확인한다).
  var ROOT_SELECTOR = '#iwm-root';
  // 데이터 로드/케어 갱신 완료 이벤트로 즉시 렌더한다.

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
  /* 게이트 = 기존 js/insuwork.js의 allowed()/authenticated()/currentUserId() 패턴을 그대로 복제.
     게이트를 그대로 상속하되 고정 허용목록은 2026-08-23 폐지됐다(인증된 사용자 전체 허용). */
  function allowed() {
    return localPreviewAllowed() || isLocalHost() || (authenticated() && !!currentUserId());
  }
  function authenticated() {
    return localPreviewAllowed() || !!(window.db && window.db.fetch && window.db.getToken && window.db.getToken() && currentUserId());
  }
  function localPreviewAllowed() {
    return isLocalHost() && new URLSearchParams(location.search).get('pwtest') === '1';
  }
  /* fix/workstation-mobile-bugs 버그6 대응 — 모바일 화면에 로그아웃 진입 경로가 없던 문제.
     새 로직을 만들지 않고 insubriefing/hub.js의 logoutAdvisor()·insuwork/insuwork.js의
     logout()이 지우는 storage key 4개를 그대로 지운 뒤 보험브리핑 홈으로 이동한다(같은 함수를 import할 수 없어
     동일 로직만 로컬 복제, 새 판단 없음). */
  function logout() {
    ['os_token', 'os_refresh_token', 'os_user', 'selected_menu'].forEach(function (key) {
      localStorage.removeItem(key); sessionStorage.removeItem(key);
    });
    window.location.replace('/insuwork/');
  }

  function root() { return document.querySelector(ROOT_SELECTOR); }

  function openBriefingAuth(mode) {
    if (window.InsuranceBriefingAuth && typeof window.InsuranceBriefingAuth.open === 'function') {
      window.InsuranceBriefingAuth.open(mode, { redirect: '/insuwork/m/' });
      return;
    }
    window.location.href = '/pages/landing.html?auth=' + encodeURIComponent(mode) + '&redirect=%2Finsuwork%2Fm%2F';
  }

  function renderLoginGate() {
    var view = root(); if (!view) return;
    view.innerHTML = '<div class="iwm-gate">'
      + '<strong>보험워크 로그인이 필요합니다.</strong>'
      + '<p>보험워크 계정으로 로그인하면 오늘 할 일을 확인할 수 있습니다.</p>'
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
      + '<strong>처음 설정을 완료해 주세요</strong>'
      + '<p>보험워크를 처음 이용할 때 한 번 설정이 필요합니다.</p>'
      + '<a class="iwm-link" href="./section.html?view=insuwork&section=user-guide">처음 설정하기</a>'
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
    view.innerHTML = '<div class="iwm-gate"><strong>오늘 화면을 준비하고 있습니다.</strong><p>잠시만 기다려 주세요.</p></div>';
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
    return '<div class="iwm-card">'
      + '<div class="iwm-card-title">' + esc(title) + '</div>'
      + (sub ? '<div class="iwm-card-sub">' + esc(sub) + '</div>' : '')
      + (meta ? '<div class="iwm-card-meta">' + esc(meta) + '</div>' : '')
      + '</div>';
  }

  function emptyHtml(message) {
    return '<div class="iwm-empty">' + esc(message) + '</div>';
  }

  function sectionHtml(title, bodyHtml) {
    return '<section class="iwm-section">'
      + '<h2 class="iwm-section-title">' + esc(title) + '</h2>'
      + bodyHtml
      + '</section>';
  }

  /* feat/workstation-mobile-agenda-scroll (2026-08-22) — "오늘 일정" 섹션을 양방향 무한스크롤 아젠다로 전환
     (대표 직접 요청). 데이터는 기존 js/insuwork.js의 eventsInRange(start,end)만 재사용(읽기 전용,
     새 export 없음). 이 블록만 새로 추가하고 케어/상령일/상담준비 섹션·게이트 로직은 전혀 건드리지 않는다. */
  var AGENDA_INITIAL_SPAN_DAYS = 7;
  var AGENDA_PAGE_DAYS = 7;
  var AGENDA_MAX_PAST_DAYS = 90;
  var AGENDA_MAX_FUTURE_DAYS = 90;
  var WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
  /* 로드된 범위 + 진행 플래그를 모듈 상태로 유지한다(렌더마다 새로 만들지 않음) — 폴링 재렌더가
     사용자가 이미 스크롤해 넓힌 범위를 초기화하지 않게 하기 위한 핵심 상태. */
  var agendaState = { minLoadedDate: null, maxLoadedDate: null, reachedPastLimit: false, reachedFutureLimit: false, loadingTop: false, loadingBottom: false };
  var agendaObserver = null;

  function pad2(n) { return n < 10 ? '0' + n : String(n); }
  function ymdLocal(date) { return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate()); }
  function parseYmdLocal(str) {
    var parts = String(str || '').split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }
  function addDaysStr(str, delta) {
    var d = parseYmdLocal(str);
    d.setDate(d.getDate() + delta);
    return ymdLocal(d);
  }
  function todayStr() { return ymdLocal(new Date()); }
  function dateHeadingLabel(dateStr, isToday) {
    var d = parseYmdLocal(dateStr);
    var label = (d.getMonth() + 1) + '/' + d.getDate() + ' (' + WEEKDAY_KO[d.getDay()] + ')';
    return isToday ? label + ' · 오늘' : label;
  }
  function limitNoteHtml(message) {
    return '<div class="iwm-agenda-limit">' + esc(message) + '</div>';
  }
  function computeExcludeIds() {
    var summary = (window.OSInsuwork && typeof window.OSInsuwork.todaySummary === 'function')
      ? window.OSInsuwork.todaySummary() : { care: [], insuranceAge: [] };
    var excludeIds = {};
    (summary.care || []).forEach(function (event) { excludeIds[String(event && event.id)] = true; });
    (summary.insuranceAge || []).forEach(function (event) { excludeIds[String(event && event.id)] = true; });
    return excludeIds;
  }
  /* startDate~endDate(포함) 구간의 일정을 eventsInRange()로 한 번에 불러와 날짜별로 그룹핑한다.
     여러 날에 걸친 일정(event_end_date)은 구간과 겹치는 모든 날짜에 표시(클리핑). */
  function buildAgendaRangeHtml(startDate, endDate, excludeIds) {
    if (!window.OSInsuwork || typeof window.OSInsuwork.eventsInRange !== 'function' || startDate > endDate) return '';
    var events = window.OSInsuwork.eventsInRange(startDate, endDate) || [];
    var byDate = {};
    events.forEach(function (event) {
      if (excludeIds[String(event && event.id)]) return;
      var evStart = String((event && event.event_date) || '').slice(0, 10);
      var evEnd = String((event && (event.event_end_date || event.event_date)) || '').slice(0, 10);
      var d = evStart < startDate ? startDate : evStart;
      var clipEnd = evEnd > endDate ? endDate : evEnd;
      var guard = 0;
      while (d <= clipEnd && guard < 400) {
        if (!byDate[d]) byDate[d] = [];
        byDate[d].push(event);
        d = addDaysStr(d, 1);
        guard += 1;
      }
    });
    var today = todayStr();
    var html = '';
    var cursor = startDate;
    var guardDays = 0;
    while (cursor <= endDate && guardDays < 400) {
      var dayEvents = byDate[cursor] || [];
      var isToday = cursor === today;
      var heading = '<h3 class="iwm-agenda-date' + (isToday ? ' is-today' : '') + '">' + esc(dateHeadingLabel(cursor, isToday)) + '</h3>';
      var body = dayEvents.length
        ? '<div class="iwm-list">' + dayEvents.map(function (event) {
            var time = event.builtin ? '' : eventTimeLabel(event.event_time);
            return cardHtml(event.title || '(제목 없음)', time, event.description || '');
          }).join('') + '</div>'
        : emptyHtml('일정 없음');
      html += '<div class="iwm-agenda-day" data-date="' + esc(cursor) + '">' + heading + body + '</div>';
      cursor = addDaysStr(cursor, 1);
      guardDays += 1;
    }
    return html;
  }
  function ensureAgendaRangeInitialized() {
    if (agendaState.minLoadedDate && agendaState.maxLoadedDate) return;
    var t = todayStr();
    agendaState.minLoadedDate = addDaysStr(t, -AGENDA_INITIAL_SPAN_DAYS);
    agendaState.maxLoadedDate = addDaysStr(t, AGENDA_INITIAL_SPAN_DAYS);
  }
  function agendaSectionHtml(excludeIds) {
    ensureAgendaRangeInitialized();
    var body = '<div class="iwm-agenda-scroll" id="iwm-agenda-scroll">'
      + '<div class="iwm-agenda-sentinel" id="iwm-agenda-top-sentinel"></div>'
      + '<div class="iwm-agenda-days" id="iwm-agenda-days">' + buildAgendaRangeHtml(agendaState.minLoadedDate, agendaState.maxLoadedDate, excludeIds) + '</div>'
      + '<div class="iwm-agenda-sentinel" id="iwm-agenda-bottom-sentinel"></div>'
      + '</div>';
    return sectionHtml('오늘 일정', body);
  }
  /* 위쪽(과거)에 이어붙이기 — 브라우저가 스크롤 컨테이너 맨 위에 콘텐츠를 추가하면 화면상 보이던 위치가
     아래로 밀리는 것을 막기 위해, 삽입 직후 늘어난 높이만큼 scrollTop을 그대로 더해 보정한다(핵심 UX 포인트). */
  function loadAgendaPast() {
    if (agendaState.loadingTop || agendaState.reachedPastLimit) return;
    agendaState.loadingTop = true;
    var pastLimit = addDaysStr(todayStr(), -AGENDA_MAX_PAST_DAYS);
    var addEnd = addDaysStr(agendaState.minLoadedDate, -1);
    var newMin = addDaysStr(agendaState.minLoadedDate, -AGENDA_PAGE_DAYS);
    var hitLimit = false;
    if (newMin <= pastLimit) { newMin = pastLimit; hitLimit = true; }
    if (newMin > addEnd) { agendaState.reachedPastLimit = true; agendaState.loadingTop = false; return; }
    var excludeIds = computeExcludeIds();
    var daysHtml = buildAgendaRangeHtml(newMin, addEnd, excludeIds);
    agendaState.minLoadedDate = newMin;
    if (hitLimit) agendaState.reachedPastLimit = true;
    var daysContainer = document.getElementById('iwm-agenda-days');
    var scrollBox = document.getElementById('iwm-agenda-scroll');
    if (daysContainer && scrollBox) {
      var combined = (hitLimit ? limitNoteHtml('이전 일정을 더 이상 불러오지 않습니다.') : '') + daysHtml;
      var beforeHeight = daysContainer.scrollHeight;
      daysContainer.insertAdjacentHTML('afterbegin', combined);
      var afterHeight = daysContainer.scrollHeight;
      scrollBox.scrollTop += (afterHeight - beforeHeight);
    }
    agendaState.loadingTop = false;
  }
  /* 아래쪽(미래)에 이어붙이기 — 일반적인 무한스크롤이라 스크롤 위치 보정이 필요 없다. */
  function loadAgendaFuture() {
    if (agendaState.loadingBottom || agendaState.reachedFutureLimit) return;
    agendaState.loadingBottom = true;
    var futureLimit = addDaysStr(todayStr(), AGENDA_MAX_FUTURE_DAYS);
    var addStart = addDaysStr(agendaState.maxLoadedDate, 1);
    var newMax = addDaysStr(agendaState.maxLoadedDate, AGENDA_PAGE_DAYS);
    var hitLimit = false;
    if (newMax >= futureLimit) { newMax = futureLimit; hitLimit = true; }
    if (addStart > newMax) { agendaState.reachedFutureLimit = true; agendaState.loadingBottom = false; return; }
    var excludeIds = computeExcludeIds();
    var daysHtml = buildAgendaRangeHtml(addStart, newMax, excludeIds);
    agendaState.maxLoadedDate = newMax;
    if (hitLimit) agendaState.reachedFutureLimit = true;
    var daysContainer = document.getElementById('iwm-agenda-days');
    if (daysContainer) {
      daysContainer.insertAdjacentHTML('beforeend', daysHtml + (hitLimit ? limitNoteHtml('이후 일정을 더 이상 불러오지 않습니다.') : ''));
    }
    agendaState.loadingBottom = false;
  }
  function teardownAgendaObserver() {
    if (agendaObserver) { agendaObserver.disconnect(); agendaObserver = null; }
  }
  /* 홈 화면의 중첩 컨테이너 느낌을 없애기 위해 아젠다 내부 스크롤 박스를 풀었다.
     그래서 IntersectionObserver도 페이지 뷰포트 기준(root:null)으로 감지한다. */
  function setupAgendaObserver() {
    teardownAgendaObserver();
    if (typeof IntersectionObserver !== 'function') return;
    var scrollBox = document.getElementById('iwm-agenda-scroll');
    var topSentinel = document.getElementById('iwm-agenda-top-sentinel');
    var bottomSentinel = document.getElementById('iwm-agenda-bottom-sentinel');
    if (!scrollBox || !topSentinel || !bottomSentinel) return;
    agendaObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        if (entry.target === topSentinel) loadAgendaPast();
        else if (entry.target === bottomSentinel) loadAgendaFuture();
      });
    }, { root: null, rootMargin: '160px 0px', threshold: 0 });
    agendaObserver.observe(topSentinel);
    agendaObserver.observe(bottomSentinel);
  }
  /* 최초 진입 시 "오늘" 블록이 스크롤 박스 상단 쪽에 오도록 자동 스크롤한다. */
  function scrollAgendaToToday(scrollBox) {
    var todayEl = scrollBox.querySelector('.iwm-agenda-day[data-date="' + todayStr() + '"]');
    if (!todayEl) return;
    if (getComputedStyle(scrollBox).overflowY === 'visible') {
      todayEl.scrollIntoView({ block: 'start' });
      window.scrollBy(0, -72);
      return;
    }
    var offset = todayEl.getBoundingClientRect().top - scrollBox.getBoundingClientRect().top + scrollBox.scrollTop;
    scrollBox.scrollTop = offset;
  }

  function careSectionHtml(care) {
    if (!care || !care.length) return sectionHtml('오늘 케어할 고객', emptyHtml('오늘 케어할 고객이 없습니다.'));
    var body = '<div class="iwm-list">' + care.map(function (event) {
      return cardHtml(event.title || '케어 알림', '', event.description || '');
    }).join('') + '</div>';
    return sectionHtml('오늘 케어할 고객', body);
  }

  function insuranceAgeSectionHtml(insuranceAge) {
    /* 매일 발생하지 않아 값이 없으면 섹션 자체를 숨긴다(스펙 지시) */
    if (!insuranceAge || !insuranceAge.length) return '';
    var body = '<div class="iwm-list">' + insuranceAge.map(function (event) {
      return cardHtml(event.title || '보험상령일', '', event.description || '');
    }).join('') + '</div>';
    return sectionHtml('오늘 상령일', body);
  }

  function consultPrepSectionHtml(list) {
    if (!list || !list.length) return sectionHtml('내일 상담 준비', emptyHtml('내일 예정된 상담이 없습니다.'));
    var body = '<div class="iwm-list">' + list.map(function (entry) {
      var files = entry.files && entry.files.length ? entry.files.join(', ') : '준비된 자료가 없습니다.';
      return cardHtml(entry.customerName || '고객', '', files);
    }).join('') + '</div>';
    return sectionHtml('내일 상담 준비', body);
  }

  /* feat/workstation-mobile-header-consistency (2026-08-22, 대표 직접 요청) — 헤더 부가버튼(PC로 보기/
     로그아웃)을 "⋯" 메뉴로 숨기고 보험브리핑 홈 복귀 링크를 추가한다. 바깥 클릭 닫기 리스너는 document에
     한 번만 등록한다(매 재렌더마다 새로 붙이면 리스너가 누적되므로, 클릭 시점에 getElementById로 최신
     DOM을 다시 조회하는 방식으로 재렌더에도 안전하게 동작). */
  var menuOutsideBound = false;
  function bindHeaderMenu() {
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

  var lastRenderedJson = '';
  function renderToday() {
    if (!window.OSInsuwork) return;
    var summary = typeof window.OSInsuwork.todaySummary === 'function'
      ? window.OSInsuwork.todaySummary() : { events: [], care: [], insuranceAge: [] };
    var prep = typeof window.OSInsuwork.upcomingConsultPrep === 'function'
      ? window.OSInsuwork.upcomingConsultPrep() : [];
    var json = JSON.stringify({ summary: summary, prep: prep });
    if (json === lastRenderedJson) return;
    lastRenderedJson = json;

    var excludeIds = {};
    (summary.care || []).forEach(function (event) { excludeIds[String(event && event.id)] = true; });
    (summary.insuranceAge || []).forEach(function (event) { excludeIds[String(event && event.id)] = true; });

    /* feat/workstation-mobile-agenda-scroll — 폴링 재렌더가 view.innerHTML을 통째로 다시 그리면 아젠다
       스크롤 박스 DOM도 새로 생겨 scrollTop이 0으로 초기화된다. 사용자가 이미 스크롤한 위치를 잃지 않도록
       교체 직전 값을 저장해뒀다가, 새 DOM이 만들어진 뒤 그대로 복원한다(로드된 범위 자체는 agendaState가
       DOM과 무관하게 계속 들고 있으므로 범위는 항상 유지됨 — 여기서는 "화면상 스크롤 위치"만 별도로 복원). */
    var prevAgendaScrollBox = document.getElementById('iwm-agenda-scroll');
    var savedAgendaScrollTop = prevAgendaScrollBox ? prevAgendaScrollBox.scrollTop : null;

    var view = root(); if (!view) return;
    /* feat/workstation-mobile-bottom-nav — 화면 이동 탭(캘린더/고객/자료)은 하단 고정 탭바로 옮겼다.
       feat/workstation-mobile-header-consistency — PC로 보기/로그아웃은 "⋯" 메뉴 안으로 숨기고,
       보험브리핑 홈으로 돌아가는 링크를 새로 추가했다(이전에는 "오늘" 화면에 이 진입로가 아예 없었다). */
    view.innerHTML = (window.OSInsuworkMobileNav ? window.OSInsuworkMobileNav.header('홈', 'today') : '<header class="iwm-header"><strong>보험워크</strong></header>')
      + '<main class="iwm-main">'
      + agendaSectionHtml(excludeIds)
      + careSectionHtml(summary.care)
      + insuranceAgeSectionHtml(summary.insuranceAge)
      + consultPrepSectionHtml(prep)
      + '</main>'
      + (window.OSInsuworkMobileNav ? window.OSInsuworkMobileNav.render('today') : '');
    if (window.OSInsuworkMobileNav && window.OSInsuworkMobileNav.bindHeader) window.OSInsuworkMobileNav.bindHeader();

    var logoutLink = document.getElementById('iwm-logout-link');
    if (logoutLink) logoutLink.addEventListener('click', function (event) { event.preventDefault(); logout(); });

    setupAgendaObserver();
    var nextAgendaScrollBox = document.getElementById('iwm-agenda-scroll');
    if (nextAgendaScrollBox) {
      if (savedAgendaScrollTop != null) nextAgendaScrollBox.scrollTop = savedAgendaScrollTop;
      else scrollAgendaToToday(nextAgendaScrollBox);
    }
  }

  document.addEventListener('insuwork:data-ready', function () { if (authenticated()) renderToday(); });

  function startDataFlow() {
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

  window.OSInsuworkMobile = { boot: boot };
  window.addEventListener('load', function () { window.setTimeout(boot, 50); });
})();
