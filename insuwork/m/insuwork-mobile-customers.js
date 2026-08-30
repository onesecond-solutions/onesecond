/* insuwork/m/insuwork-mobile-customers.js
   보험워크 모바일 "고객" 화면 전용 렌더러 (Phase 3, 2026-08-22, feat/workstation-mobile-customers /
   Phase 4, 2026-08-22, feat/workstation-mobile-quicknote).
   데이터/로직은 100% /js/insuwork.js 재사용(customersDirectory() 읽기 전용 조회 + reload()로
   기존 loadData() 실행, quickSaveConsultationNote()로 쓰기). 이 파일은 화면(뷰 셸)만 새로 그린다 —
   insuwork.js의 렌더/저장 함수 본문은 호출하지 않는다(쓰기는 export된 wrapper 1개만 호출).
   네임스페이스 = OSInsuworkMobileCustomers (OSInsuworkMobile/OSInsuworkMobileCalendar와 충돌 없음).
   코상무 확정 방향: 모바일 고객관리는 표가 아니라 "고객 카드 리스트 → 고객 상세 → 전화/메모/일정추가 버튼" 구조.
   Phase 3은 조회 전용이었다. Phase 4에서 "메모" 버튼에 화면 이동 없는 인라인 빠른 메모 입력을 추가했다 —
   저장은 js/insuwork.js의 quickSaveConsultationNote(customerId, text)만 호출한다(새 REST 로직 없음).
   사진 첨부·일정추가는 여전히 범위 밖(PC 안내 링크만 제공). */
(function () {
  'use strict';

  // 2026-08-23 대표 승인 — 고정 17인 파일럿 허용목록 게이트 폐지, 인증된 사용자 전체로 오픈
  // (이관 동의 여부는 checkMigrationChoiceThenStart()가 별도로 확인한다).
  var ROOT_SELECTOR = '#iwm-root';
  var RECENT_CONSULT_LIMIT = 5;
  /* reload()가 Promise를 반환하지 않아(기존 export 시그니처 변경 없음) 완료 신호를 직접 받을 수 없다.
     대신 짧은 간격으로 재조회 → 직전 렌더와 동일하면 스킵하는 폴링으로 최종 일관성을 맞춘다(추가 API 호출 아님, 순수 재조회). */
  var POLL_DELAYS_MS = [400, 900, 1600, 2600, 4000];

  var state = { view: 'list', query: '', selectedId: null, directory: [] };
  var lastRenderedJson = '';
  /* 빠른 메모 입력창의 UI 상태(펼침/저장중/에러/입력중 텍스트/저장 직후 배지). 폴링 diff 대상인 state에는 넣지
     않는다 — snapshotJson()에 포함되면 저장 성공 전까지는 directory가 그대로라 재렌더가 스킵돼 문제없지만,
     혼선을 피하려 완전히 분리된 로컬 변수로 둔다. 고객 상세를 벗어나거나 다른 고객으로 이동하면 초기화한다. */
  var noteUi = { open: false, saving: false, error: '', draft: '', justSaved: false };
  function resetNoteUi() { noteUi = { open: false, saving: false, error: '', draft: '', justSaved: false }; }

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
     게이트를 그대로 상속하되 고정 허용목록은 2026-08-23 폐지됐다(인증된 사용자 전체 허용). */
  function allowed() {
    return isLocalHost() || (authenticated() && !!currentUserId());
  }
  function authenticated() {
    return !!(window.db && window.db.fetch && window.db.getToken && window.db.getToken() && currentUserId());
  }
  /* fix/workstation-mobile-bugs 버그1 대응 — js/insuwork.js의 isDataReady() 읽기 전용 조회를 그대로
     노출한다. loadData(true)가 완료되기 전(fullLoaded=false)에는 directory가 빈 배열이라 "등록된 고객이
     없습니다"가 먼저 그려지고 이후 폴링에서 실제 데이터로 뒤늦게 바뀌는 문제 — 로드 완료 여부로 문구를 분기한다. */
  function isDataReady() {
    return !!(window.OSInsuwork && typeof window.OSInsuwork.isDataReady === 'function' && window.OSInsuwork.isDataReady());
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
      window.InsuranceBriefingAuth.open(mode, { redirect: '/insuwork/m/customers.html' });
      return;
    }
    window.location.href = '/pages/landing.html?auth=' + encodeURIComponent(mode) + '&redirect=%2Finsuwork%2Fm%2Fcustomers.html';
  }

  function renderLoginGate() {
    var view = root(); if (!view) return;
    view.innerHTML = '<div class="iwm-gate">'
      + '<strong>보험워크 로그인이 필요합니다.</strong>'
      + '<p>보험워크 계정으로 로그인하면 고객 목록을 확인할 수 있습니다.</p>'
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
    view.innerHTML = '<div class="iwm-gate"><strong>고객 목록을 준비하고 있습니다.</strong><p>잠시만 기다려 주세요.</p></div>';
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

  function shortDate(dateStr) {
    var parts = String(dateStr || '').slice(0, 10).split('-');
    if (parts.length !== 3) return '';
    return Number(parts[1]) + '/' + Number(parts[2]);
  }

  /* 표시용 전화번호(고객 원본 값, 하이픈 등 서식 포함 가능)와 tel: 링크용 값(숫자만)을 분리한다.
     phoneText()류 서식 함수는 insuwork.js 비공개 클로저 안이라 재사용할 수 없어, 여기서는
     tel: 링크에 반드시 필요한 "숫자만 추출"만 자체 구현한다(표시는 원본 그대로, 새 포맷팅 로직 추가 안 함). */
  function phoneDigits(value) { return String(value || '').replace(/\D/g, ''); }

  /* feat/workstation-mobile-bottom-nav — 화면 이동 탭(오늘/캘린더/자료)은 하단 고정 탭바로 옮겼다.
     feat/workstation-mobile-header-consistency (2026-08-22, 대표 직접 요청) — PC로 보기/로그아웃은
     "⋯" 메뉴 안으로 숨기고, 보험브리핑 홈으로 돌아가는 링크를 추가했다. */
  function headerHtml() {
    return window.OSInsuworkMobileNav ? window.OSInsuworkMobileNav.header('고객', 'customers', { searchValue: state.query, searchAction: './customers.html' }) : '<header class="iwm-header"><strong>고객</strong></header>';
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

  /* 목록 화면과 상세 화면 둘 다에서 하단 탭바를 유지한다(대표 지시 — 판단은 빌더에 위임). 상세 화면에는
     이미 "← 고객 목록" 뒤로가기 버튼이 본문 상단에 있어 하단 탭바(다른 화면으로 이동)와 역할이 겹치지
     않는다 — 뒤로가기는 "목록으로", 하단 탭바는 "다른 화면으로"라 혼란 없다. */
  function bottomNavHtml() {
    return window.OSInsuworkMobileNav ? window.OSInsuworkMobileNav.render('customers') : '';
  }

  function snapshotJson() {
    return JSON.stringify({ view: state.view, id: state.selectedId, q: state.query, dir: state.directory });
  }

  function refreshDirectory() {
    state.directory = (window.OSInsuwork && typeof window.OSInsuwork.customersDirectory === 'function')
      ? window.OSInsuwork.customersDirectory() : [];
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
    return '<button type="button" class="iwm-card iwm-cust-card" data-id="' + esc(customer.id) + '">'
      + '<div class="iwm-card-title">' + esc(customer.name || '(이름 없음)') + '</div>'
      + '<div class="iwm-card-sub">' + esc(sub) + '</div>'
      + (meta ? '<div class="iwm-card-meta">' + esc(meta) + '</div>' : '')
      + '</button>';
  }

  function bindCardClicks(container) {
    var cards = container.querySelectorAll('.iwm-cust-card');
    Array.prototype.forEach.call(cards, function (card) {
      card.addEventListener('click', function () { openDetail(card.getAttribute('data-id')); });
    });
  }

  function renderListBody() {
    var container = document.getElementById('iwm-cust-list'); if (!container) return;
    var list = filteredDirectory();
    container.innerHTML = list.length
      ? list.map(customerCardHtml).join('')
      : (!isDataReady() ? emptyHtml('고객 목록을 불러오는 중입니다.') : emptyHtml(state.query ? '검색 결과가 없습니다.' : '등록된 고객이 없습니다.'));
    bindCardClicks(container);
  }

  function renderListShell() {
    var view = root(); if (!view) return;
    view.innerHTML = headerHtml()
      + '<main class="iwm-main">'
      + '<div class="iwm-cust-search-wrap">'
      + '<input type="search" id="iwm-cust-search" class="iwm-cust-search" placeholder="이름으로 검색" autocomplete="off" inputmode="search">'
      + '</div>'
      + '<div class="iwm-list iwm-cust-list" id="iwm-cust-list"></div>'
      + '</main>'
      + bottomNavHtml();
    if (window.OSInsuworkMobileNav && window.OSInsuworkMobileNav.bindHeader) window.OSInsuworkMobileNav.bindHeader();
    var input = document.getElementById('iwm-cust-search');
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
    if (!customer) { resetNoteUi(); state.view = 'list'; state.selectedId = null; renderListShell(); return; }

    var phoneDisplay = customer.phone || '';
    var tel = phoneDigits(phoneDisplay);
    var telAction = tel
      ? '<a class="iwm-cust-action-btn" href="tel:' + esc(tel) + '">전화</a>'
      : '<span class="iwm-cust-action-btn is-disabled">전화번호 없음</span>';

    var consultations = (customer.consultations || []).slice(0, RECENT_CONSULT_LIMIT);
    var consultHtml = consultations.length
      ? '<div class="iwm-list">' + consultations.map(function (entry) {
          return cardHtml(shortDate(entry.date) + ' 상담', '', entry.memo || '상담 내용이 없습니다.');
        }).join('') + '</div>'
      : emptyHtml('상담 이력이 없습니다.');

    var careHtml = customer.nextCareDate
      ? sectionHtml('다음 케어 예정', '<div class="iwm-list">' + cardHtml(customer.nextCareTitle || '케어 알림', shortDate(customer.nextCareDate), '') + '</div>')
      : '';

    view.innerHTML = headerHtml()
      + '<main class="iwm-main">'
      + '<button type="button" class="iwm-btn iwm-cust-back" id="iwm-cust-back">← 고객 목록</button>'
      + '<section class="iwm-cust-detail-head">'
      + '<div class="iwm-cust-detail-name">' + esc(customer.name || '(이름 없음)') + '</div>'
      + (phoneDisplay ? '<div class="iwm-cust-detail-phone">' + esc(phoneDisplay) + '</div>' : '')
      + (customer.status ? '<div class="iwm-cust-detail-status">' + esc(customer.status) + '</div>' : '')
      + '</section>'
      + '<div class="iwm-cust-actions">'
      + telAction
      + noteSectionHtml(customer)
      + '<div class="iwm-cust-action">'
      + '<a class="iwm-cust-action-btn" href="/insuwork/?view=insuwork&section=calendar&mode=month">일정추가</a>'
      + '<p class="iwm-cust-action-note">PC 버전에서 일정을 등록해 주세요.</p>'
      + '</div>'
      + '</div>'
      + careHtml
      + sectionHtml('최근 상담', consultHtml)
      + '</main>'
      + bottomNavHtml();
    if (window.OSInsuworkMobileNav && window.OSInsuworkMobileNav.bindHeader) window.OSInsuworkMobileNav.bindHeader();

    var back = document.getElementById('iwm-cust-back');
    if (back) back.addEventListener('click', function () {
      resetNoteUi();
      state.view = 'list'; state.selectedId = null; lastRenderedJson = '';
      renderCurrent();
    });
    bindNoteEvents(customer);
  }

  /* 빠른 메모 액션 영역 HTML. 세 가지 상태를 그린다: (1) 평소 — "메모" 버튼 + PC 안내,
     (2) 펼침 — textarea + 저장/취소, (3) 저장 직후 — 짧게 "저장됐습니다" 배지만 보여주고 자동으로 (1)로 복귀.
     사진 첨부는 이번 Phase 범위 밖이라 PC 링크 안내 문구만 둔다(별도 업로드 UI 없음). */
  function noteSectionHtml(customer) {
    var pcLink = '<a class="iwm-cust-note-pc-link" href="/insuwork/?view=insuwork&section=customers">PC 버전 열기</a>';
    if (noteUi.open) {
      var errorHtml = noteUi.error ? '<p class="iwm-cust-note-error">' + esc(noteUi.error) + '</p>' : '';
      return '<div class="iwm-cust-action iwm-cust-note-open">'
        + '<textarea id="iwm-cust-note-input" class="iwm-cust-note-textarea" rows="4" placeholder="상담 내용을 입력하세요. 링크는 그대로 붙여넣으면 됩니다."' + (noteUi.saving ? ' disabled' : '') + '>' + esc(noteUi.draft) + '</textarea>'
        + '<p class="iwm-cust-action-note">사진 첨부는 PC 버전에서 해주세요. ' + pcLink + '</p>'
        + errorHtml
        + '<div class="iwm-cust-note-actions">'
        + '<button type="button" class="iwm-btn" id="iwm-cust-note-cancel"' + (noteUi.saving ? ' disabled' : '') + '>취소</button>'
        + '<button type="button" class="iwm-btn primary" id="iwm-cust-note-save"' + (noteUi.saving ? ' disabled' : '') + '>' + (noteUi.saving ? '저장 중…' : '저장') + '</button>'
        + '</div>'
        + '</div>';
    }
    if (noteUi.justSaved) {
      return '<div class="iwm-cust-action">'
        + '<span class="iwm-cust-action-btn is-disabled iwm-cust-note-saved">저장됐습니다</span>'
        + '</div>';
    }
    return '<div class="iwm-cust-action">'
      + '<button type="button" class="iwm-cust-action-btn" id="iwm-cust-note-toggle">메모</button>'
      + '<p class="iwm-cust-action-note">사진 첨부는 PC 버전에서 해주세요. ' + pcLink + '</p>'
      + '</div>';
  }

  function bindNoteEvents(customer) {
    var toggle = document.getElementById('iwm-cust-note-toggle');
    if (toggle) toggle.addEventListener('click', function () {
      noteUi = { open: true, saving: false, error: '', draft: '', justSaved: false };
      renderDetailShell();
      var input = document.getElementById('iwm-cust-note-input');
      if (input) input.focus();
    });
    var cancel = document.getElementById('iwm-cust-note-cancel');
    if (cancel) cancel.addEventListener('click', function () {
      resetNoteUi();
      renderDetailShell();
    });
    var input = document.getElementById('iwm-cust-note-input');
    if (input) input.addEventListener('input', function () { noteUi.draft = input.value; });
    var save = document.getElementById('iwm-cust-note-save');
    if (save) save.addEventListener('click', function () { submitQuickNote(customer); });
  }

  /* 저장은 js/insuwork.js의 quickSaveConsultationNote(customerId, text) 하나만 호출한다.
     이 화면은 REST 필드 조합·owner_id 처리를 새로 만들지 않는다 — 그 함수가 이미 처리한다.
     실패 시 입력한 텍스트(noteUi.draft)를 유지해 다시 시도할 수 있게 한다. */
  function submitQuickNote(customer) {
    var input = document.getElementById('iwm-cust-note-input');
    var text = input ? input.value : noteUi.draft;
    var trimmed = String(text || '').trim();
    if (!trimmed) {
      noteUi.draft = text; noteUi.error = '메모 내용을 입력해 주세요.';
      renderDetailShell();
      var focusEmpty = document.getElementById('iwm-cust-note-input'); if (focusEmpty) focusEmpty.focus();
      return;
    }
    if (!window.OSInsuwork || typeof window.OSInsuwork.quickSaveConsultationNote !== 'function') {
      noteUi.draft = text; noteUi.error = '저장 기능을 사용할 수 없습니다. 페이지를 새로고침해 주세요.';
      renderDetailShell();
      return;
    }
    noteUi.draft = text; noteUi.saving = true; noteUi.error = '';
    renderDetailShell();
    window.OSInsuwork.quickSaveConsultationNote(customer.id, text).then(function () {
      noteUi = { open: false, saving: false, error: '', draft: '', justSaved: true };
      lastRenderedJson = '';
      renderCurrent();
      window.setTimeout(function () {
        if (!noteUi.justSaved) return;
        noteUi.justSaved = false;
        if (state.view === 'detail' && String(state.selectedId) === String(customer.id)) renderDetailShell();
      }, 2600);
    }).catch(function (err) {
      noteUi.saving = false;
      noteUi.error = (err && err.message) ? err.message : '저장하지 못했습니다. 다시 시도해 주세요.';
      renderDetailShell();
      var retry = document.getElementById('iwm-cust-note-input'); if (retry) retry.focus();
    });
  }

  function openDetail(id) {
    if (!id) return;
    resetNoteUi();
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
    try {
      state.query = new URLSearchParams(location.search || '').get('q') || state.query || '';
    } catch (_e) {}
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
      checkMigrationChoiceThenStart();
    });
    if (window.Auth && typeof window.Auth.init === 'function') {
      window.Auth.init().catch(function () { renderLoginGate(); });
    } else {
      renderLoginGate();
    }
  }

  window.OSInsuworkMobileCustomers = { boot: boot };
  window.addEventListener('load', function () { window.setTimeout(boot, 50); });
})();
