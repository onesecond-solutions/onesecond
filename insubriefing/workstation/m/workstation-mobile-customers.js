/* insubriefing/workstation/m/workstation-mobile-customers.js
   워크스테이션 모바일 "고객" 화면 전용 렌더러 (Phase 3, 2026-08-22, feat/workstation-mobile-customers /
   Phase 4, 2026-08-22, feat/workstation-mobile-quicknote).
   데이터/로직은 100% /js/personal-workspace.js 재사용(customersDirectory() 읽기 전용 조회 + reload()로
   기존 loadData() 실행, quickSaveConsultationNote()로 쓰기). 이 파일은 화면(뷰 셸)만 새로 그린다 —
   personal-workspace.js의 렌더/저장 함수 본문은 호출하지 않는다(쓰기는 export된 wrapper 1개만 호출).
   네임스페이스 = OSWorkstationMobileCustomers (OSWorkstationMobile/OSWorkstationMobileCalendar와 충돌 없음).
   코상무 확정 방향: 모바일 고객관리는 표가 아니라 "고객 카드 리스트 → 고객 상세 → 전화/메모/일정추가 버튼" 구조.
   Phase 3은 조회 전용이었다. Phase 4에서 "메모" 버튼에 화면 이동 없는 인라인 빠른 메모 입력을 추가했다 —
   저장은 js/personal-workspace.js의 quickSaveConsultationNote(customerId, text)만 호출한다(새 REST 로직 없음).
   사진 첨부·일정추가는 여전히 범위 밖(PC 안내 링크만 제공). */
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
  /* 게이트 = workstation-mobile.js(Phase 1)의 allowed()/authenticated() 패턴을 그대로 복제.
     임태성 실장 전용 게이트(PILOT_ID)를 그대로 상속한다. */
  function allowed() {
    return isLocalHost() || currentUserId() === PILOT_ID;
  }
  function authenticated() {
    return !!(window.db && window.db.fetch && window.db.getToken && window.db.getToken() && currentUserId());
  }
  /* fix/workstation-mobile-bugs 버그1 대응 — js/personal-workspace.js의 isDataReady() 읽기 전용 조회를 그대로
     노출한다. loadData(true)가 완료되기 전(fullLoaded=false)에는 directory가 빈 배열이라 "등록된 고객이
     없습니다"가 먼저 그려지고 이후 폴링에서 실제 데이터로 뒤늦게 바뀌는 문제 — 로드 완료 여부로 문구를 분기한다. */
  function isDataReady() {
    return !!(window.OSPersonalWorkspace && typeof window.OSPersonalWorkspace.isDataReady === 'function' && window.OSPersonalWorkspace.isDataReady());
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

  /* feat/workstation-mobile-bottom-nav — 화면 이동 탭(오늘/캘린더/자료)은 하단 고정 탭바로 옮겼다.
     상단 헤더에는 화면 제목 + PC로 보기 + 로그아웃만 남긴다(중복 제거, 훨씬 가볍게). */
  function headerHtml() {
    return '<header class="wsm-header"><strong>고객</strong>'
      + '<div class="wsm-header-actions">'
      + '<a class="wsm-pc-link" href="/insubriefing/workstation/?view=personal-workspace&section=customers">PC로 보기</a>'
      + '<a class="wsm-tab-link" href="#" id="wsm-logout-link">로그아웃</a>'
      + '</div></header>';
  }

  function bindHeaderEvents() {
    var logoutLink = document.getElementById('wsm-logout-link');
    if (logoutLink) logoutLink.addEventListener('click', function (event) { event.preventDefault(); logout(); });
  }

  /* 목록 화면과 상세 화면 둘 다에서 하단 탭바를 유지한다(대표 지시 — 판단은 빌더에 위임). 상세 화면에는
     이미 "← 고객 목록" 뒤로가기 버튼이 본문 상단에 있어 하단 탭바(다른 화면으로 이동)와 역할이 겹치지
     않는다 — 뒤로가기는 "목록으로", 하단 탭바는 "다른 화면으로"라 혼란 없다. */
  function bottomNavHtml() {
    return window.OSWorkstationMobileNav ? window.OSWorkstationMobileNav.render('customers') : '';
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
      : (!isDataReady() ? emptyHtml('고객 목록을 불러오는 중입니다.') : emptyHtml(state.query ? '검색 결과가 없습니다.' : '등록된 고객이 없습니다.'));
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
      + '</main>'
      + bottomNavHtml();
    bindHeaderEvents();
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
    if (!customer) { resetNoteUi(); state.view = 'list'; state.selectedId = null; renderListShell(); return; }

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
      + noteSectionHtml(customer)
      + '<div class="wsm-cust-action">'
      + '<a class="wsm-cust-action-btn" href="/insubriefing/workstation/?view=personal-workspace&section=calendar&mode=month">일정추가</a>'
      + '<p class="wsm-cust-action-note">PC 버전에서 일정을 등록해 주세요.</p>'
      + '</div>'
      + '</div>'
      + careHtml
      + sectionHtml('최근 상담', consultHtml)
      + '</main>'
      + bottomNavHtml();
    bindHeaderEvents();

    var back = document.getElementById('wsm-cust-back');
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
    var pcLink = '<a class="wsm-cust-note-pc-link" href="/insubriefing/workstation/?view=personal-workspace&section=customers">PC 버전 열기</a>';
    if (noteUi.open) {
      var errorHtml = noteUi.error ? '<p class="wsm-cust-note-error">' + esc(noteUi.error) + '</p>' : '';
      return '<div class="wsm-cust-action wsm-cust-note-open">'
        + '<textarea id="wsm-cust-note-input" class="wsm-cust-note-textarea" rows="4" placeholder="상담 내용을 입력하세요. 링크는 그대로 붙여넣으면 됩니다."' + (noteUi.saving ? ' disabled' : '') + '>' + esc(noteUi.draft) + '</textarea>'
        + '<p class="wsm-cust-action-note">사진 첨부는 PC 버전에서 해주세요. ' + pcLink + '</p>'
        + errorHtml
        + '<div class="wsm-cust-note-actions">'
        + '<button type="button" class="wsm-btn" id="wsm-cust-note-cancel"' + (noteUi.saving ? ' disabled' : '') + '>취소</button>'
        + '<button type="button" class="wsm-btn primary" id="wsm-cust-note-save"' + (noteUi.saving ? ' disabled' : '') + '>' + (noteUi.saving ? '저장 중…' : '저장') + '</button>'
        + '</div>'
        + '</div>';
    }
    if (noteUi.justSaved) {
      return '<div class="wsm-cust-action">'
        + '<span class="wsm-cust-action-btn is-disabled wsm-cust-note-saved">저장됐습니다</span>'
        + '</div>';
    }
    return '<div class="wsm-cust-action">'
      + '<button type="button" class="wsm-cust-action-btn" id="wsm-cust-note-toggle">메모</button>'
      + '<p class="wsm-cust-action-note">사진 첨부는 PC 버전에서 해주세요. ' + pcLink + '</p>'
      + '</div>';
  }

  function bindNoteEvents(customer) {
    var toggle = document.getElementById('wsm-cust-note-toggle');
    if (toggle) toggle.addEventListener('click', function () {
      noteUi = { open: true, saving: false, error: '', draft: '', justSaved: false };
      renderDetailShell();
      var input = document.getElementById('wsm-cust-note-input');
      if (input) input.focus();
    });
    var cancel = document.getElementById('wsm-cust-note-cancel');
    if (cancel) cancel.addEventListener('click', function () {
      resetNoteUi();
      renderDetailShell();
    });
    var input = document.getElementById('wsm-cust-note-input');
    if (input) input.addEventListener('input', function () { noteUi.draft = input.value; });
    var save = document.getElementById('wsm-cust-note-save');
    if (save) save.addEventListener('click', function () { submitQuickNote(customer); });
  }

  /* 저장은 js/personal-workspace.js의 quickSaveConsultationNote(customerId, text) 하나만 호출한다.
     이 화면은 REST 필드 조합·owner_id 처리를 새로 만들지 않는다 — 그 함수가 이미 처리한다.
     실패 시 입력한 텍스트(noteUi.draft)를 유지해 다시 시도할 수 있게 한다. */
  function submitQuickNote(customer) {
    var input = document.getElementById('wsm-cust-note-input');
    var text = input ? input.value : noteUi.draft;
    var trimmed = String(text || '').trim();
    if (!trimmed) {
      noteUi.draft = text; noteUi.error = '메모 내용을 입력해 주세요.';
      renderDetailShell();
      var focusEmpty = document.getElementById('wsm-cust-note-input'); if (focusEmpty) focusEmpty.focus();
      return;
    }
    if (!window.OSPersonalWorkspace || typeof window.OSPersonalWorkspace.quickSaveConsultationNote !== 'function') {
      noteUi.draft = text; noteUi.error = '저장 기능을 사용할 수 없습니다. 페이지를 새로고침해 주세요.';
      renderDetailShell();
      return;
    }
    noteUi.draft = text; noteUi.saving = true; noteUi.error = '';
    renderDetailShell();
    window.OSPersonalWorkspace.quickSaveConsultationNote(customer.id, text).then(function () {
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
      var retry = document.getElementById('wsm-cust-note-input'); if (retry) retry.focus();
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
