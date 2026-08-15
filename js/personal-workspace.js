(function () {
  'use strict';

  var PILOT_ID = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';
  var TEST_EMAIL = 'bylts0428+codex-workstation-20260815@gmail.com';
  var STANDALONE = document.documentElement.getAttribute('data-workstation') === 'true';
  var SECTIONS = ['home', 'assets', 'customers', 'consultations', 'calendar', 'archive'];
  var state = {
    section: 'home', assetFilter: 'all', assetView: localStorage.getItem('ws_asset_view') || 'list', assetFolder: null, query: '', composing: false, searchTimer: 0,
    calendarMode: 'month', selectedDate: ymd(new Date()), selectedConsultation: null, cursor: new Date(),
    status: 'idle', error: '', loadedFor: '', requestId: 0, loadPromise: null, fullLoaded: false, pendingRichFiles: [], pendingRichImages: [],
    data: { items: [], library: [], scripts: [], events: [], customers: [], consultations: [] }
  };

  function storedUser() {
    try { return JSON.parse(localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}'); }
    catch (_) { return {}; }
  }
  function currentUserId() {
    return String((window.AppState && window.AppState.userId) || storedUser().id || '');
  }
  function currentUserEmail() {
    return String((window.AppState && window.AppState.user && window.AppState.user.email) || storedUser().email || '').toLowerCase();
  }
  function personalItemScope() {
    // workspace_items.owner_id is the canonical account boundary. The legacy
    // payloads do not consistently contain owner_email. Authored notes are kept,
    // and only personal-scope vault rows are imported; team/branch/global bulk
    // server material stays outside the Insurance Briefing workspace.
    return '&or=(legacy_source.is.null,legacy_source.in.(library,scripts),and(legacy_source.in.(myspace_folders,myspace_files),legacy_payload->>scope.eq.personal))';
  }
  function isLocal() { return location.hostname === '127.0.0.1' || location.hostname === 'localhost'; }
  function allowed() { return isLocal() || currentUserId() === PILOT_ID || currentUserEmail() === TEST_EMAIL; }
  function authenticated() { return !!(window.db && window.db.fetch && window.db.getToken && window.db.getToken() && currentUserId()); }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]; }); }
  function stripHtml(value) { var node = document.createElement('div'); node.innerHTML = String(value || ''); return (node.textContent || '').trim(); }
  function formatDate(value) { if (!value) return ''; var d = new Date(value); return isNaN(d.getTime()) ? String(value).slice(0, 10) : d.toLocaleDateString('ko-KR'); }
  function ymd(date) { return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0'); }
  function parseDate(value) { var p = String(value).slice(0, 10).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(value, count) { var d = typeof value === 'string' ? parseDate(value) : new Date(value); d.setDate(d.getDate() + count); return ymd(d); }
  function consultationStatus(item, customer) { var allowed = ['예약', '진행중', '제안서발송', '클로징', '청약완료', '보류', '종결']; return allowed.indexOf(item && item.channel) >= 0 ? item.channel : allowed.indexOf(customer && customer.status) >= 0 ? customer.status : '예약'; }
  function customerProfile(customer) { return customer && customer.profile && typeof customer.profile === 'object' ? customer.profile : {}; }
  function digits(value) { return String(value || '').replace(/\D/g, '').slice(0, 11); }
  function phoneText(value) { var number = digits(value); if (number.length <= 3) return number; if (number.length <= 7) return number.slice(0, 3) + '-' + number.slice(3); if (number.length === 10) return number.slice(0, 3) + '-' + number.slice(3, 6) + '-' + number.slice(6); return number.slice(0, 3) + '-' + number.slice(3, 7) + '-' + number.slice(7); }
  function writtenAt() { var now = new Date(); return ymd(now) + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'); }
  function insuranceAge(birth, basis) { var born = parseDate(birth), at = parseDate(basis || ymd(new Date())); if (isNaN(born.getTime()) || isNaN(at.getTime()) || born > at) return ''; var age = at.getFullYear() - born.getFullYear(); var birthday = new Date(at.getFullYear(), born.getMonth(), born.getDate()); if (at < birthday) { age -= 1; birthday.setFullYear(at.getFullYear() - 1); } var next = new Date(birthday); next.setFullYear(birthday.getFullYear() + 1); if ((at - birthday) >= (next - birthday) / 2) age += 1; return Math.max(0, age); }
  function weekday(value) { return ['일', '월', '화', '수', '목', '금', '토'][parseDate(value).getDay()]; }
  function api(path) {
    return window.db.fetch('/rest/v1/' + path).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    });
  }

  function ensureShell() {
    if (!allowed()) { if (STANDALONE) renderStandaloneGate(authenticated() ? 'denied' : 'login'); return false; }
    document.body.classList.add('is-personal-workspace');
    if (STANDALONE) return !!document.getElementById('v-personal-workspace');
    var side = document.querySelector('.side');
    if (side && !document.getElementById('nav-personal-workspace')) {
      var nav = document.createElement('div');
      nav.className = 'nav'; nav.id = 'nav-personal-workspace';
      nav.innerHTML = '<span class="ic">▣</span><span class="lbl">내 업무</span>';
      nav.onclick = function () { openWorkspace('home'); };
      var home = document.getElementById('nav-home');
      side.insertBefore(nav, home ? home.nextSibling : side.firstChild);
    }
    var body = document.querySelector('.body');
    if (body && !document.getElementById('v-personal-workspace')) {
      var view = document.createElement('div');
      view.className = 'wrap view'; view.id = 'v-personal-workspace';
      body.appendChild(view);
    }
    return true;
  }

  function renderStandaloneGate(mode) {
    var view = document.getElementById('v-personal-workspace');
    if (!view) return;
    document.body.classList.remove('is-personal-workspace');
    if (mode === 'denied') {
      view.innerHTML = '<div class="pw-access"><strong>워크스테이션 준비 중</strong><p>현재 임태성 계정에서 먼저 완성하고 있습니다.</p><a class="pw-btn" href="/insubriefing/">보험브리핑으로 돌아가기</a></div>';
      return;
    }
    view.innerHTML = '<div class="pw-access"><strong>워크스테이션 로그인</strong><p>기존 원세컨드 계정으로 로그인하면 자료, 고객, 상담과 일정을 불러옵니다.</p><a class="pw-btn primary" href="/pages/landing.html?auth=login&amp;redirect=%2Finsubriefing%2Fworkstation%2F">원세컨드 로그인</a><a class="pw-btn" href="/insubriefing/">보험브리핑으로 돌아가기</a></div>';
  }

  function loadData(force) {
    var userId = currentUserId();
    if (!authenticated()) {
      state.status = 'waiting-auth'; state.loadedFor = ''; renderContent();
      return Promise.resolve(false);
    }
    if (state.loadPromise) return state.loadPromise;
    if (!force && state.fullLoaded && state.loadedFor === userId) return Promise.resolve(true);
    if (!force && state.status === 'ready' && state.loadedFor === userId) return Promise.resolve(true);
    state.status = 'loading'; state.error = ''; renderContent();
    var requestId = ++state.requestId;
    var id = encodeURIComponent(userId);
    var itemScope = personalItemScope();
    var full = !!force;
    var today = ymd(new Date());
    var requests = full ? [
      api('workspace_items?owner_id=eq.' + id + '&deleted_at=is.null' + itemScope + '&order=created_at.desc&limit=2000&select=*'),
      api('workspace_tasks?owner_id=eq.' + id + '&deleted_at=is.null&order=task_date.desc&limit=2000&select=*'),
      api('workspace_customers?owner_id=eq.' + id + '&deleted_at=is.null&order=created_at.desc&limit=2000&select=*'),
      api('workspace_consultations?owner_id=eq.' + id + '&order=consulted_at.desc&limit=2000&select=*')
    ] : [
      api('workspace_items?owner_id=eq.' + id + '&deleted_at=is.null' + itemScope + '&order=created_at.desc&limit=6&select=*'),
      api('workspace_tasks?owner_id=eq.' + id + '&deleted_at=is.null&task_date=eq.' + today + '&order=task_time.asc&limit=20&select=*')
    ];
    state.loadPromise = Promise.allSettled(requests).then(function (results) {
      if (requestId !== state.requestId) return false;
      var names = full ? ['items', 'events', 'customers', 'consultations'] : ['items', 'events'];
      var failed = [];
      results.forEach(function (result, index) {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) state.data[names[index]] = result.value;
        else failed.push(names[index]);
      });
      state.data.scripts = state.data.items.filter(function (item) { return item.item_type === 'note'; }).map(function (item) { return Object.assign({}, item, { script_text: item.body }); });
      state.data.library = state.data.items.filter(function (item) { return item.item_type !== 'note'; }).map(function (item) { return Object.assign({}, item, { memo_text: item.item_type === 'memo' ? item.body : null, description: item.body, link_url: item.url, file_url: item.item_type === 'file' ? item.storage_path : null }); });
      state.data.events = state.data.events.map(function (item) { return Object.assign({}, item, { event_date: item.task_date, event_time: item.task_time }); });
      state.data.consultations = state.data.consultations.map(function (item) { return Object.assign({}, item, { memo: item.content }); });
      state.loadedFor = userId;
      state.fullLoaded = full;
      state.status = failed.length ? 'partial' : 'ready';
      state.error = failed.length ? failed.join(', ') + ' 자료를 불러오지 못했습니다.' : '';
      renderContent();
      return failed.length === 0;
    }).finally(function () { if (requestId === state.requestId) state.loadPromise = null; });
    return state.loadPromise;
  }

  function navHtml() {
    var items = [['home', '⌂', '홈'], ['assets', '▤', '자료'], ['customers', '♙', '고객관리'], ['consultations', '✎', '상담관리'], ['calendar', '▦', '캘린더']];
    return '<nav class="pw-nav" aria-label="내 업무 메뉴">' + items.map(function (item) {
      return '<button type="button" class="' + (state.section === item[0] ? 'on' : '') + '" onclick="OSPersonalWorkspace.go(\'' + item[0] + '\')"><span>' + item[1] + '</span>' + item[2] + '</button>';
    }).join('') + '<button type="button" class="archive ' + (state.section === 'archive' ? 'on' : '') + '" onclick="OSPersonalWorkspace.go(\'archive\')">기존 아카이브</button></nav>';
  }
  function statusHtml() {
    if (state.status === 'waiting-auth') return '<div class="pw-state"><strong>로그인 정보를 확인하고 있습니다.</strong><span>인증이 완료되면 자료를 자동으로 불러옵니다.</span></div>';
    if (state.status === 'loading' || state.status === 'idle') return '<div class="pw-state"><strong>내 자료를 불러오는 중입니다.</strong><span>잠시만 기다려 주세요.</span></div>';
    return state.error ? '<div class="pw-error" role="alert"><span>' + esc(state.error) + '</span><button class="pw-btn" onclick="OSPersonalWorkspace.reload()">다시 불러오기</button></div>' : '';
  }
  function matches(value) { var q = state.query.trim().toLocaleLowerCase('ko-KR'); return !q || String(value || '').toLocaleLowerCase('ko-KR').indexOf(q) >= 0; }
  function searchHtml() {
    var q = state.query.trim(); if (!q) return '';
    var results = [];
    state.data.scripts.forEach(function (item) { if (matches((item.title || '') + ' ' + stripHtml(item.script_text))) results.push({ icon: '📝', kind: '업무노트', title: item.title, sub: formatDate(item.created_at), action: "OSPersonalWorkspace.showAsset('scripts','" + esc(item.id) + "')" }); });
    state.data.library.forEach(function (item) { if (matches((item.title || '') + ' ' + (item.description || '') + ' ' + (item.memo_text || ''))) results.push({ icon: '📄', kind: item.memo_text ? '메모' : '자료', title: item.title, sub: formatDate(item.created_at), action: "OSPersonalWorkspace.showAsset('library','" + esc(item.id) + "')" }); });
    state.data.customers.forEach(function (item) { if (matches((item.name || '') + ' ' + (item.phone || item.phone_raw || '') + ' ' + (item.status || ''))) results.push({ icon: '👤', kind: '고객', title: item.name, sub: item.phone || item.phone_raw || '', action: "OSPersonalWorkspace.showCustomer('" + esc(item.id) + "')" }); });
    state.data.consultations.forEach(function (item) { var customer = state.data.customers.find(function (c) { return String(c.id) === String(item.customer_id); }) || {}; if (matches((customer.name || '') + ' ' + (item.memo || '') + ' ' + (item.channel || ''))) results.push({ icon: '✎', kind: '상담', title: customer.name || '고객 상담', sub: item.memo || '', action: "OSPersonalWorkspace.showCustomer('" + esc(item.customer_id) + "')" }); });
    allEvents().forEach(function (item) { if (matches((item.title || '') + ' ' + (item.description || ''))) results.push({ icon: '▦', kind: '일정', title: item.title, sub: String(item.event_date || '').slice(0, 10), action: "OSPersonalWorkspace.showEvent('" + esc(item.id) + "')" }); });
    return '<div class="pw-toolbar"><div><h2>‘' + esc(q) + '’ 검색 결과</h2><p class="pw-subtitle">자료, 고객, 상담, 일정을 한 번에 검색했습니다.</p></div><span class="pw-result-count">' + results.length + '건</span></div><div class="pw-search-results">' + (results.length ? results.map(function (item) { return '<button type="button" onclick="' + item.action + '"><span class="pw-result-icon">' + item.icon + '</span><span><small>' + item.kind + '</small><b>' + esc(item.title || '(제목 없음)') + '</b><em>' + esc(item.sub) + '</em></span><span>›</span></button>'; }).join('') : '<div class="pw-empty"><strong>검색 결과가 없습니다.</strong><span>띄어쓰기나 검색어를 바꿔 보세요.</span></div>') + '</div>';
  }
  function row(title, subtitle, right, action) {
    return '<button type="button" class="pw-row" onclick="' + action + '"><span><b>' + esc(title || '(제목 없음)') + '</b><small>' + esc(subtitle || '') + '</small></span><span>' + right + '</span></button>';
  }
  function scopeBadge(item) { var global = String(item.visibility || 'private') === 'public'; return '<span class="pw-badge ' + (global ? 'public' : '') + '">' + (global ? '전체 공개' : '나만 보기') + '</span>'; }

  function careEvents() {
    var result = [];
    state.data.customers.forEach(function (customer) {
      var profile = customer.profile && typeof customer.profile === 'object' ? customer.profile : {};
      var base = String(profile.appl_date || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) return;
      [[31, '청약 +31일'], [91, '청약 +91일'], [181, '청약 +181일'], [365, '청약 +365일']].forEach(function (step) {
        result.push({ id: 'care-' + customer.id + '-' + step[0], event_date: addDays(base, step[0]), title: (customer.name || '고객') + ' · ' + step[1], event_type: 'customer', customer_id: customer.id });
      });
    });
    return result;
  }
  function allEvents() { return state.data.events.concat(careEvents()); }

  function homeHtml() {
    var today = ymd(new Date());
    var todayEvents = allEvents().filter(function (event) { return String(event.event_date || '').slice(0, 10) === today; });
    var recent = state.data.scripts.map(function (item) { return { kind: '업무노트', item: item }; })
      .concat(state.data.library.map(function (item) { return { kind: item.memo_text ? '메모' : '자료실', item: item }; }))
      .sort(function (a, b) { return String(b.item.created_at).localeCompare(String(a.item.created_at)); }).slice(0, 6);
    return statusHtml() + '<div class="pw-grid"><section class="pw-panel"><div class="pw-panel-head"><strong>오늘 일정</strong><button onclick="OSPersonalWorkspace.go(\'calendar\')">전체 보기</button></div><div class="pw-list">' + (todayEvents.length ? todayEvents.slice(0, 6).map(function (event) { return row(event.title, event.description || '일정', esc(String(event.event_time || '').slice(0, 5)), 'OSPersonalWorkspace.showEvent(\'' + esc(event.id) + '\')'); }).join('') : '<div class="pw-empty">오늘 일정이 없습니다.</div>') + '</div></section>'
      + '<section class="pw-panel"><div class="pw-panel-head"><strong>최근 자료</strong><button onclick="OSPersonalWorkspace.go(\'assets\')">전체 보기</button></div><div class="pw-list">' + (recent.length ? recent.map(function (entry) { return row(entry.item.title, entry.kind + ' · ' + formatDate(entry.item.created_at), '›', 'OSPersonalWorkspace.showAsset(\'' + (entry.kind === '업무노트' ? 'scripts' : 'library') + '\',\'' + esc(entry.item.id) + '\')'); }).join('') : '<div class="pw-empty">저장된 자료가 없습니다.</div>') + '</div></section></div>';
  }

  function assetCategory(item) {
    var payload = item && item.legacy_payload;
    if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch (_) { payload = {}; } }
    if (payload && ['note', 'file', 'memo'].indexOf(payload.workspace_category) >= 0) return payload.workspace_category;
    if (item && item.item_type === 'note') return 'note';
    if (item && item.item_type === 'memo') return 'memo';
    return 'file';
  }
  function currentAssetCategory() {
    if (state.assetFolder) {
      var folder = state.data.library.find(function (item) { return String(item.id) === String(state.assetFolder) && item.item_type === 'folder'; });
      if (folder) return assetCategory(folder);
    }
    return ['note', 'file', 'memo'].indexOf(state.assetFilter) >= 0 ? state.assetFilter : '';
  }
  function assetCategoryLabel(category) { return category === 'note' ? '업무노트' : category === 'memo' ? '메모' : '자료실'; }

  function assetsHtml() {
    var items = [];
    state.data.scripts.forEach(function (item) { items.push({ source: 'scripts', type: 'note', kind: '업무노트', title: item.title, body: stripHtml(item.script_text), created: item.created_at, raw: item }); });
    state.data.library.forEach(function (item) { var memo = item.item_type === 'memo', folder = item.item_type === 'folder', file = item.item_type === 'file', category = assetCategory(item); items.push({ source: 'library', type: category, folder: folder, kind: folder ? '폴더' : file ? '파일' : memo ? '메모' : item.item_type === 'link' ? '링크' : '자료', title: item.title, body: item.body || item.url || item.storage_path || '', created: item.created_at, raw: item }); });
    items = items.filter(function (item) {
      if (state.assetFilter !== 'all' && item.type !== state.assetFilter) return false;
      if (String(item.raw.parent_id || '') !== String(state.assetFolder || '')) return false;
      return matches(item.title + ' ' + item.body + ' ' + item.kind);
    }).sort(function (a, b) { return Number(!!b.folder) - Number(!!a.folder); });
    var tabs = [['all', '전체'], ['note', '업무노트'], ['file', '자료실'], ['memo', '메모']];
    var tabsHtml = tabs.map(function (tab) { return '<button class="' + (state.assetFilter === tab[0] ? 'on' : '') + '" onclick="OSPersonalWorkspace.filterAssets(\'' + tab[0] + '\')">' + tab[1] + '</button>'; }).join('');
    var viewModes = [['list', '목록', '☷'], ['thumb', '썸네일', '▦'], ['large', '큰 이미지', '▣']];
    var viewHtml = viewModes.map(function (mode) { return '<button type="button" class="' + (state.assetView === mode[0] ? 'on' : '') + '" onclick="OSPersonalWorkspace.setAssetView(\'' + mode[0] + '\')" aria-label="' + mode[1] + ' 보기" title="' + mode[1] + '"><span aria-hidden="true">' + mode[2] + '</span>' + mode[1] + '</button>'; }).join('');
    var destination = currentAssetCategory();
    var destinationText = destination ? assetCategoryLabel(destination) + (state.assetFolder ? ' · 현재 폴더' : '') : '저장 위치를 선택합니다';
    var addMenu = '<details class="pw-add-menu"><summary>+ 자료 추가</summary><div class="pw-add-popover"><small class="pw-add-destination">' + esc(destinationText) + '</small><button type="button" onclick="OSPersonalWorkspace.newAssetFolder()">새 폴더</button><label>파일 업로드<input type="file" multiple hidden onchange="OSPersonalWorkspace.uploadAssetFiles(this.files);this.value=\'\'"></label><button type="button" onclick="OSPersonalWorkspace.addAsset()">업무노트·메모 작성</button></div></details>';
    var controls = STANDALONE
      ? '<div class="pw-assets-controls"><div class="pw-tabs">' + tabsHtml + addMenu + '</div><div class="pw-assets-actions"><div class="pw-view-switch" aria-label="보기 방식">' + viewHtml + '</div></div></div>'
      : '<div class="pw-toolbar"><div><h2>자료</h2><p class="pw-subtitle">노트, 메모, 링크와 사이트 파일을 한 화면에서 관리합니다.</p></div><div class="pw-actions"><button class="pw-btn" onclick="OSPersonalWorkspace.openVault()">📁 파일함 열기</button><button class="pw-btn primary" onclick="OSPersonalWorkspace.addAsset()">+ 자료 추가</button></div></div><div class="pw-system-note"><strong>사이트 파일함</strong><span>새 폴더 만들기와 여러 파일 업로드를 지원합니다.</span><small>PC 원본과 별개인 사이트 보관 공간이며, 사이트에서 작업해도 PC 원본은 변경되지 않습니다.</small></div><div class="pw-tabs">' + tabsHtml + '</div>';
    var breadcrumb = assetBreadcrumbHtml();
    var content = state.assetView === 'list'
      ? '<div class="pw-explorer"><table class="pw-table"><thead><tr><th>이름</th><th>종류</th><th>현재 분류</th><th>등록일</th></tr></thead><tbody>' + items.map(function (item) { return '<tr tabindex="0" class="' + (item.folder ? 'pw-folder-drop-target' : 'pw-asset-draggable') + '" ' + assetDragAttributes(item) + ' onclick="' + assetOpenAction(item) + '"><td><b>' + (item.folder ? '📁 ' : '') + esc(item.title || '(제목 없음)') + '</b></td><td>' + item.kind + '</td><td>' + scopeBadge(item.raw) + '</td><td>' + formatDate(item.created) + '</td></tr>'; }).join('') + '</tbody></table>' + (items.length ? '' : '<div class="pw-empty">조건에 맞는 자료가 없습니다.</div>') + '</div>'
      : '<div class="pw-assets-grid ' + (state.assetView === 'large' ? 'large' : '') + '">' + items.map(assetCardHtml).join('') + (items.length ? '' : '<div class="pw-empty">조건에 맞는 자료가 없습니다.</div>') + '</div>';
    return statusHtml() + controls + breadcrumb + content;
  }
  function assetOpenAction(item) { return item.folder ? "OSPersonalWorkspace.openAssetFolder('" + esc(item.raw.id) + "')" : "OSPersonalWorkspace.showAsset('" + item.source + "','" + esc(item.raw.id) + "')"; }
  function assetDragAttributes(item) {
    var id = esc(item.raw.id), category = esc(item.type);
    if (item.folder) return 'ondragover="OSPersonalWorkspace.assetDragOver(event,\'' + id + '\',\'' + category + '\')" ondragleave="OSPersonalWorkspace.assetDragLeave(event)" ondrop="OSPersonalWorkspace.assetDrop(event,\'' + id + '\',\'' + category + '\')"';
    return 'draggable="true" ondragstart="OSPersonalWorkspace.assetDragStart(event,\'' + id + '\',\'' + category + '\')" ondragend="OSPersonalWorkspace.assetDragEnd(event)"';
  }
  function assetBreadcrumbHtml() {
    if (!state.assetFolder) return '';
    var parts = [], id = state.assetFolder;
    while (id) { var folder = state.data.library.find(function (item) { return String(item.id) === String(id) && item.item_type === 'folder'; }); if (!folder) break; parts.unshift(folder); id = folder.parent_id; }
    var category = currentAssetCategory();
    var current = parts.length ? parts[parts.length - 1] : null;
    return '<nav class="pw-folder-path" aria-label="폴더 경로"><span class="pw-folder-trail"><button type="button" onclick="OSPersonalWorkspace.openAssetRoot(\'' + esc(category) + '\')">' + esc(assetCategoryLabel(category)) + '</button>' + parts.map(function (folder) { return '<span>›</span><button type="button" onclick="OSPersonalWorkspace.openAssetFolder(\'' + esc(folder.id) + '\')">' + esc(folder.title) + '</button>'; }).join('') + '</span>' + (current ? '<button type="button" class="pw-folder-delete" onclick="OSPersonalWorkspace.deleteAssetFolder(\'' + esc(current.id) + '\')">현재 폴더 삭제</button>' : '') + '</nav>';
  }
  function assetCardHtml(item) {
    var raw = item.raw || {}, direct = raw.image_url || (/\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(raw.url || '') ? raw.url : '');
    var image = direct ? '<img src="' + esc(direct) + '" alt="">' : ((raw.storage_path && /^image\//.test(raw.mime_type || '')) ? '<img data-storage-path="' + esc(raw.storage_path) + '" alt="">' : '');
    var preview = item.folder ? '<span class="pw-folder-icon">📁</span>' : image || '<div class="pw-asset-document"><span>' + (item.type === 'note' ? '업무노트' : item.type === 'memo' ? '메모' : item.kind) + '</span><p>' + esc(String(item.body || '').slice(0, 110)) + '</p></div>';
    return '<button type="button" class="pw-asset-card ' + (item.folder ? 'pw-folder-drop-target' : 'pw-asset-draggable') + '" ' + assetDragAttributes(item) + ' onclick="' + assetOpenAction(item) + '"><span class="pw-asset-preview">' + preview + '</span><b>' + esc(item.title || '(제목 없음)') + '</b><small>' + esc(item.kind) + ' · ' + formatDate(item.created) + '</small></button>';
  }
  function fileExtension(item) {
    var name = String((item && (item.extension || item.title || item.storage_path)) || '').split('?')[0];
    return String((item && item.extension) || (name.indexOf('.') >= 0 ? name.split('.').pop() : '')).toLowerCase();
  }
  function previewType(item) {
    var mime = String((item && item.mime_type) || '').toLowerCase(), ext = fileExtension(item);
    if (/^image\//.test(mime) || /^(png|jpe?g|gif|webp|bmp|svg|avif)$/.test(ext)) return 'image';
    if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
    return '';
  }
  function hydrateAssetThumbs() {
    if (!window.db || !window.db.url || !window.db.getToken) return;
    document.querySelectorAll('#v-personal-workspace img[data-storage-path]').forEach(function (img) {
      var path = img.getAttribute('data-storage-path'); if (!path) return;
      fetch(window.db.url('/storage/v1/object/sign/myspace/' + path.split('/').map(encodeURIComponent).join('/')), { method: 'POST', headers: { apikey: window.db.key, Authorization: 'Bearer ' + window.db.getToken(), 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 3600 }) }).then(function (response) { return response.ok ? response.json() : null; }).then(function (data) { if (data && data.signedURL) img.src = window.db.url('/storage/v1' + data.signedURL); }).catch(function () {});
    });
  }
  function customersHtml() {
    var rows = state.data.customers.filter(function (item) { return matches((item.name || '') + ' ' + (item.phone || item.phone_raw || '') + ' ' + (item.status || '')); });
    return statusHtml() + '<div class="pw-toolbar"><h2>고객관리</h2><button class="pw-btn primary" onclick="OSPersonalWorkspace.addCustomer()">+ 고객 등록</button></div><div class="pw-explorer"><table class="pw-table"><thead><tr><th>고객명</th><th>연락처</th><th>상태</th><th>등록일</th></tr></thead><tbody>' + rows.map(function (item) { return '<tr onclick="OSPersonalWorkspace.showCustomer(\'' + esc(item.id) + '\')"><td><b>' + esc(item.name || '(이름 없음)') + '</b></td><td>' + esc(item.phone || item.phone_raw || '') + '</td><td><span class="pw-badge">' + esc(item.status || '미분류') + '</span></td><td>' + formatDate(item.created_at) + '</td></tr>'; }).join('') + '</tbody></table>' + (rows.length ? '' : '<div class="pw-empty">등록된 고객이 없습니다.</div>') + '</div>';
  }
  function consultationsHtml() {
    var customers = {}; state.data.customers.forEach(function (item) { customers[item.id] = item; });
    var rows = state.data.consultations.filter(function (item) { var customer = customers[item.customer_id] || {}, profile = customerProfile(customer); return matches((customer.name || '') + ' ' + (customer.phone || customer.phone_raw || '') + ' ' + (profile.birth_date || '') + ' ' + (item.memo || '') + ' ' + consultationStatus(item, customer)); });
    var selected = rows.find(function (item) { return String(item.id) === String(state.selectedConsultation); });
    if (!selected && state.selectedConsultation) state.selectedConsultation = null;
    var columns = '<div class="pw-consult-columns" aria-hidden="true"><span>등록일자</span><span>이름</span><span>생년월일</span><span>성별(보험나이)</span><span>전화번호</span><span>상담내용</span><span>상담상태</span></div>';
    var list = '<div class="pw-consult-list" role="list">' + columns + rows.map(function (item) {
      var customer = customers[item.customer_id] || {}, profile = customerProfile(customer), date = String(item.consulted_at || item.created_at || '').slice(0, 10), age = insuranceAge(profile.birth_date, date), status = consultationStatus(item, customer);
      return '<button type="button" role="listitem" class="pw-consult-row' + (String(item.id) === String(state.selectedConsultation) ? ' on' : '') + '" onclick="OSPersonalWorkspace.selectConsultation(\'' + esc(item.id) + '\')"><span class="pw-consult-date">' + esc(date) + '</span><strong>' + esc(customer.name || '(이름 없음)') + '</strong><span class="pw-consult-birth">' + esc(profile.birth_date || '') + '</span><span class="pw-consult-gender-age">' + esc(profile.gender || '-') + (age === '' ? '' : ' (' + age + '세)') + '</span><span class="pw-consult-phone">' + esc(phoneText(customer.phone || customer.phone_raw || '')) + '</span><span class="pw-consult-summary">' + esc(stripHtml(item.memo || '')) + '</span><span class="pw-consult-status" data-status="' + esc(status) + '">' + esc(status) + '</span><span class="pw-consult-hover">' + esc(stripHtml(item.memo || '상담내용이 없습니다.')) + '</span></button>';
    }).join('') + (rows.length ? '' : '<div class="pw-empty">상담 기록이 없습니다.</div>') + '</div>';
    var detail = selected ? consultationDetailHtml(selected, customers[selected.customer_id] || {}) : '';
    return statusHtml() + '<div class="pw-toolbar"><h2>상담관리</h2><button class="pw-btn primary" onclick="OSPersonalWorkspace.addConsultation()">+ 상담 등록</button></div><div class="pw-consult-layout' + (selected ? ' has-detail' : '') + '"><section class="pw-consult-master">' + list + '</section>' + detail + '</div>';
  }
  function consultationDetailHtml(item, customer) {
    var profile = customerProfile(customer), date = String(item.consulted_at || item.created_at || '').slice(0, 10), age = insuranceAge(profile.birth_date, date), status = consultationStatus(item, customer);
    var statuses = ['예약', '진행중', '제안서발송', '클로징', '청약완료', '보류', '종결'];
    return '<article class="pw-consult-detail"><button type="button" class="pw-consult-back" onclick="OSPersonalWorkspace.selectConsultation()">‹ 목록</button><div class="pw-consult-detail-head"><div><input id="pwd-consult-date" type="date" value="' + esc(date) + '" onchange="OSPersonalWorkspace.refreshDetailInsuranceAge()"><div class="pw-detail-name"><input id="pwd-consult-name" value="' + esc(customer.name || '') + '" aria-label="이름"><div class="pw-gender"><label><input type="radio" name="pwd-consult-gender" value="남"' + (profile.gender === '남' ? ' checked' : '') + '>남</label><label><input type="radio" name="pwd-consult-gender" value="여"' + (profile.gender === '여' ? ' checked' : '') + '>여</label></div></div></div></div><dl><div><dt>생년월일</dt><dd><input id="pwd-consult-birth" type="date" value="' + esc(profile.birth_date || '') + '" onchange="OSPersonalWorkspace.refreshDetailInsuranceAge()"></dd></div><div><dt>보험나이</dt><dd id="pwd-insurance-age">' + (age === '' ? '-' : age + '세') + '</dd></div><div><dt>전화번호</dt><dd><input id="pwd-consult-phone" inputmode="numeric" value="' + esc(phoneText(customer.phone || customer.phone_raw || '')) + '" oninput="OSPersonalWorkspace.formatConsultPhone(this)"></dd></div><div><dt>상담상태</dt><dd><select id="pwd-consult-status">' + statuses.map(function (entry) { return '<option value="' + entry + '"' + (entry === status ? ' selected' : '') + '>' + entry + '</option>'; }).join('') + '</select></dd></div></dl><section><h3>상담내용</h3><div class="pw-consult-content">' + esc(item.memo || '').replace(/\n/g, '<br>') + '</div><textarea id="pwd-consult-new" rows="5" placeholder="새 상담내용을 입력하세요"></textarea></section><div class="pw-consult-save"><button type="button" class="pw-btn primary" onclick="OSPersonalWorkspace.saveConsultationDetail(\'' + esc(item.id) + '\')">저장</button></div></article>';
  }

  function calendarTitle() {
    var selected = parseDate(state.selectedDate);
    if (state.calendarMode === 'day') return selected.getFullYear() + '년 ' + (selected.getMonth() + 1) + '월 ' + selected.getDate() + '일';
    if (state.calendarMode === 'week') { var start = new Date(selected); start.setDate(start.getDate() - start.getDay()); return (start.getMonth() + 1) + '월 ' + start.getDate() + '일 – ' + formatDate(addDays(start, 6)); }
    if (state.calendarMode === 'agenda') return '일정';
    return state.cursor.getFullYear() + '년 ' + (state.cursor.getMonth() + 1) + '월';
  }
  function eventsFor(date) { return allEvents().filter(function (event) { return String(event.event_date || '').slice(0, 10) === date; }).sort(function (a, b) { return String(a.event_time || '').localeCompare(String(b.event_time || '')); }); }
  function monthView() {
    var first = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), 1), start = new Date(first); start.setDate(1 - first.getDay());
    var today = ymd(new Date()), cells = [];
    for (var i = 0; i < 42; i++) { var day = new Date(start); day.setDate(start.getDate() + i); var key = ymd(day), events = eventsFor(key); cells.push('<button type="button" class="pw-day ' + (day.getMonth() !== first.getMonth() ? 'out ' : '') + (key === today ? 'today ' : '') + (key === state.selectedDate ? 'selected' : '') + '" onclick="OSPersonalWorkspace.selectDate(\'' + key + '\')"><strong>' + day.getDate() + '</strong>' + events.slice(0, 3).map(function (event) { return '<span class="pw-event ' + (event.event_type === 'customer' ? 'customer' : '') + '">' + esc(event.title) + '</span>'; }).join('') + (events.length > 3 ? '<span class="pw-more">+' + (events.length - 3) + '</span>' : '') + '</button>'); }
    return '<div class="pw-cal"><div class="pw-cal-head">' + ['일', '월', '화', '수', '목', '금', '토'].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div><div class="pw-cal-grid">' + cells.join('') + '</div></div>';
  }
  function timeView(days) {
    var hours = []; for (var h = 8; h <= 20; h++) hours.push(h);
    return '<div class="pw-time" style="--pw-days:' + days.length + '"><div class="pw-time-head"><span>GMT+09</span>' + days.map(function (date) { return '<button class="' + (date === ymd(new Date()) ? 'today' : '') + '" onclick="OSPersonalWorkspace.selectDate(\'' + date + '\')"><small>' + weekday(date) + '</small><strong>' + Number(date.slice(8)) + '</strong></button>'; }).join('') + '</div><div class="pw-time-body"><div class="pw-hours">' + hours.map(function (hour) { return '<span>' + (hour < 12 ? '오전 ' + hour : hour === 12 ? '오후 12' : '오후 ' + (hour - 12)) + '시</span>'; }).join('') + '</div>' + days.map(function (date) { var events = eventsFor(date); return '<div class="pw-time-day">' + hours.map(function () { return '<i></i>'; }).join('') + '<div class="pw-time-events">' + events.map(function (event) { return '<button onclick="OSPersonalWorkspace.showEvent(\'' + esc(event.id) + '\')"><small>' + esc(String(event.event_time || '종일').slice(0, 5)) + '</small><b>' + esc(event.title) + '</b></button>'; }).join('') + '</div></div>'; }).join('') + '</div></div>';
  }
  function agendaView() {
    var start = state.selectedDate, end = addDays(start, 365);
    var rows = allEvents().filter(function (event) { var date = String(event.event_date || '').slice(0, 10); return date >= start && date <= end; }).sort(function (a, b) { return String(a.event_date).localeCompare(String(b.event_date)) || String(a.event_time || '').localeCompare(String(b.event_time || '')); });
    return '<div class="pw-agenda">' + (rows.length ? rows.map(function (event) { var date = String(event.event_date).slice(0, 10); return '<button onclick="OSPersonalWorkspace.showEvent(\'' + esc(event.id) + '\')"><time><strong>' + Number(date.slice(8)) + '</strong><span>' + Number(date.slice(5, 7)) + '월 · ' + weekday(date) + '</span></time><span><small>' + esc(String(event.event_time || '종일').slice(0, 5)) + '</small><b>' + esc(event.title) + '</b></span></button>'; }).join('') : '<div class="pw-empty">예정된 일정이 없습니다.</div>') + '</div>';
  }
  function calendarHtml() {
    var modes = [['day', '일'], ['week', '주'], ['month', '월'], ['agenda', '일정']];
    var view = '';
    if (state.calendarMode === 'month') view = monthView();
    else if (state.calendarMode === 'agenda') view = agendaView();
    else if (state.calendarMode === 'day') view = timeView([state.selectedDate]);
    else { var selected = parseDate(state.selectedDate); selected.setDate(selected.getDate() - selected.getDay()); var week = []; for (var i = 0; i < 7; i++) week.push(addDays(selected, i)); view = timeView(week); }
    return statusHtml() + '<div class="pw-calendar-toolbar"><div class="pw-actions"><button class="pw-btn" onclick="OSPersonalWorkspace.calendarToday()">오늘</button><button class="pw-btn icon" aria-label="이전 보기" onclick="OSPersonalWorkspace.moveCalendar(-1)">‹</button><button class="pw-btn icon" aria-label="다음 보기" onclick="OSPersonalWorkspace.moveCalendar(1)">›</button></div><h2>' + calendarTitle() + '</h2><div class="pw-actions pw-mode">' + modes.map(function (mode) { return '<button class="pw-btn ' + (state.calendarMode === mode[0] ? 'on' : '') + '" onclick="OSPersonalWorkspace.setCalendarMode(\'' + mode[0] + '\')">' + mode[1] + '</button>'; }).join('') + '<button class="pw-btn primary" onclick="OSPersonalWorkspace.addEvent()">+ 일정</button></div></div>' + view;
  }
  function archiveHtml() {
    var cards = [['home', '기존 원세컨드 홈', '보험 검색과 기존 홈 도구'], ['product-lineup', '상품 라인업', '원수사 상품 자료'], ['newsletters', '소식지', '원수사 GA 소식지'], ['bojang', '보장분석', '기존 보장분석 도구'], ['axis-medical', '보험 지식', '실손·암·뇌·심장 등'], ['namecard', '기타 도구', '명함과 기존 제작 도구']];
    return '<div class="pw-toolbar"><h2>기존 아카이브</h2></div><div class="pw-archive-grid">' + cards.map(function (card) { return '<button class="pw-archive-card" onclick="OSPersonalWorkspace.legacy(\'' + card[0] + '\')"><strong>' + card[1] + '</strong><span>' + card[2] + '</span></button>'; }).join('') + '</div>';
  }
  function sectionHtml() {
    if (state.status === 'idle' || state.status === 'waiting-auth' || state.status === 'loading') return statusHtml();
    if (state.query.trim()) return searchHtml();
    if (state.section === 'assets') return assetsHtml();
    if (state.section === 'customers') return customersHtml();
    if (state.section === 'consultations') return consultationsHtml();
    if (state.section === 'calendar') return calendarHtml();
    if (state.section === 'archive') return archiveHtml();
    return homeHtml();
  }

  function renderShell() {
    var view = document.getElementById('v-personal-workspace'); if (!view) return;
    var head = STANDALONE ? '' : '<header class="pw-head"><div class="pw-title"><h1>내 업무</h1><p>자료, 고객, 상담과 일정을 한곳에서 관리합니다.</p></div><label class="pw-search">⌕<input id="pw-search-input" type="search" value="' + esc(state.query) + '" placeholder="내 자료와 고객 검색" autocomplete="off"></label></header>';
    view.innerHTML = '<div class="pw-shell' + (STANDALONE ? ' pw-shell-compact' : '') + '">' + head + '<div class="pw-body">' + navHtml() + '<main class="pw-main" id="pw-main"></main></div></div><dialog class="pw-dialog" id="pw-dialog"><button class="pw-dialog-close" onclick="OSPersonalWorkspace.closeDialog()" aria-label="닫기">×</button><div id="pw-dialog-body"></div></dialog>'
      + '<div class="pw-preview" id="pw-preview" aria-hidden="true"><button type="button" class="pw-preview-close" onclick="OSPersonalWorkspace.closePreview()" aria-label="미리보기 닫기">×</button><div class="pw-preview-stage" id="pw-preview-stage"></div><div class="pw-preview-bar"><button type="button" onclick="OSPersonalWorkspace.previewZoom(-1)" title="축소">−</button><button type="button" onclick="OSPersonalWorkspace.previewZoom(1)" title="확대">＋</button><button type="button" onclick="OSPersonalWorkspace.previewRotate()" title="회전">↻</button><button type="button" class="pw-preview-pdf-only" onclick="OSPersonalWorkspace.previewPage(-1)" title="이전 페이지">‹</button><span id="pw-preview-page"></span><button type="button" class="pw-preview-pdf-only" onclick="OSPersonalWorkspace.previewPage(1)" title="다음 페이지">›</button><button type="button" class="pw-preview-ddak" onclick="OSPersonalWorkspace.previewDdak()">⚡ 딸깍</button><a id="pw-preview-download" href="#" target="_blank" rel="noopener" download>⬇ 다운로드</a></div></div>';
    if (STANDALONE) { var globalInput = document.getElementById('pw-search-input'); if (globalInput) globalInput.value = state.query; }
    bindSearch(); renderContent();
  }
  function renderContent() { var main = document.getElementById('pw-main'); if (main) { main.innerHTML = sectionHtml(); if (state.section === 'assets' && state.assetView !== 'list') hydrateAssetThumbs(); } }
  function bindSearch() {
    var input = document.getElementById('pw-search-input'); if (!input) return;
    input.addEventListener('compositionstart', function () { state.composing = true; });
    input.addEventListener('compositionend', function () { state.composing = false; scheduleSearch(input.value); });
    input.addEventListener('input', function () { if (!state.composing) scheduleSearch(input.value); });
  }
  function scheduleSearch(value) { window.clearTimeout(state.searchTimer); state.searchTimer = window.setTimeout(function () { state.query = value; if (state.query.trim() && !state.fullLoaded) loadData(true); else renderContent(); }, 180); }
  function setUrl(push) { var url = '?view=personal-workspace&section=' + encodeURIComponent(state.section); if (state.section === 'calendar') url += '&mode=' + state.calendarMode + '&date=' + state.selectedDate; try { history[push ? 'pushState' : 'replaceState']({ view: 'personal-workspace', section: state.section }, '', url); } catch (_) {} }

  function openWorkspace(section, push) {
    if (!ensureShell()) { if (!STANDALONE && window.showView) window.showView('home'); return; }
    state.section = SECTIONS.indexOf(section) >= 0 ? section : 'home';
    document.querySelectorAll('.body .view').forEach(function (view) { view.classList.remove('on'); });
    document.getElementById('v-personal-workspace').classList.add('on');
    renderShell(); setUrl(push !== false); loadData(state.section !== 'home');
  }
  function go(section) { state.section = section; renderShell(); setUrl(true); if (section !== 'home' && !state.fullLoaded) loadData(true); }
  function dialog(html) { var box = document.getElementById('pw-dialog'), body = document.getElementById('pw-dialog-body'); if (!box || !body) return; body.innerHTML = html; if (!box.open && box.showModal) box.showModal(); else if (!box.open) box.setAttribute('open', ''); }
  function closeDialog() { var box = document.getElementById('pw-dialog'); if (box && box.close) box.close(); else if (box) box.removeAttribute('open'); }
  function sanitizeRich(html) {
    var doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    var allowed = ['B', 'STRONG', 'I', 'EM', 'U', 'S', 'H2', 'H3', 'P', 'DIV', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'BR', 'A', 'IMG'];
    Array.prototype.slice.call(doc.body.querySelectorAll('*')).forEach(function (node) {
      if (allowed.indexOf(node.tagName) < 0) { node.replaceWith(doc.createTextNode(node.textContent || '')); return; }
      var href = node.tagName === 'A' ? String(node.getAttribute('href') || '') : '';
      var align = String(node.style && node.style.textAlign || '');
      var storagePath = node.tagName === 'IMG' ? String(node.getAttribute('data-storage-path') || '') : '';
      var pendingImage = node.tagName === 'IMG' ? String(node.getAttribute('data-pending-image') || '') : '';
      var alt = node.tagName === 'IMG' ? String(node.getAttribute('alt') || '') : '';
      Array.prototype.slice.call(node.attributes).forEach(function (attr) { node.removeAttribute(attr.name); });
      if (node.tagName === 'A' && /^(https?:|mailto:|tel:)/i.test(href)) { node.setAttribute('href', href); node.setAttribute('target', '_blank'); node.setAttribute('rel', 'noopener'); }
      if (/^(left|center|right)$/.test(align)) node.style.textAlign = align;
      if (node.tagName === 'IMG') {
        if (storagePath) node.setAttribute('data-storage-path', storagePath);
        if (/^[0-9a-f-]{36}$/i.test(pendingImage)) node.setAttribute('data-pending-image', pendingImage);
        node.setAttribute('alt', alt);
        if (!storagePath && !pendingImage) node.remove();
      }
    });
    var cleaned = doc.body.innerHTML;
    return doc.body.children.length ? cleaned : cleaned.replace(/\r?\n/g, '<br>');
  }
  function richEditorField(id, html) {
    var buttons = [['bold', '<b>B</b>', '굵게'], ['italic', '<i>I</i>', '기울임'], ['underline', '<u>U</u>', '밑줄'], ['strikeThrough', '<s>S</s>', '취소선'], ['formatBlock', '제목', '제목', 'h2'], ['insertUnorderedList', '• 목록', '글머리 목록'], ['insertOrderedList', '1. 목록', '번호 목록'], ['formatBlock', '인용', '인용문', 'blockquote'], ['justifyLeft', '왼쪽', '왼쪽 정렬'], ['justifyCenter', '가운데', '가운데 정렬'], ['justifyRight', '오른쪽', '오른쪽 정렬'], ['removeFormat', '서식 지우기', '서식 지우기']];
    return '<div class="pw-rich"><div class="pw-rich-toolbar" role="toolbar" aria-label="본문 서식">' + buttons.map(function (button) { return '<button type="button" tabindex="-1" title="' + button[2] + '" onmousedown="event.preventDefault();OSPersonalWorkspace.richCommand(\'' + button[0] + '\',\'' + (button[3] || '') + '\')">' + button[1] + '</button>'; }).join('') + '<label class="pw-rich-upload">+ 이미지 삽입<input type="file" accept="image/*" multiple hidden onchange="OSPersonalWorkspace.addRichImages(this.files);this.value=\'\'"></label><label class="pw-rich-upload">+ 파일 첨부<input type="file" multiple hidden onchange="OSPersonalWorkspace.addRichFiles(this.files);this.value=\'\'"></label></div><div id="' + id + '" class="pw-rich-body" contenteditable="true" role="textbox" aria-multiline="true" aria-label="내용" data-placeholder="내용을 입력하세요">' + sanitizeRich(html) + '</div><div class="pw-rich-files" id="pw-rich-files"></div></div>';
  }
  function richCommand(command, commandValue) { var editor = document.querySelector('#pw-dialog .pw-rich-body'); if (!editor) return; editor.focus(); document.execCommand(command, false, commandValue || null); }
  function focusRich(id) { var editor = document.getElementById(id); if (editor) editor.focus(); }
  function richValue(id) { var editor = document.getElementById(id); return editor ? sanitizeRich(editor.innerHTML) : ''; }
  function richHasText(html) { var doc = new DOMParser().parseFromString(String(html || ''), 'text/html'); return !!String(doc.body.textContent || '').trim() || !!doc.body.querySelector('img'); }
  function resetRichPending() { (state.pendingRichImages || []).forEach(function (entry) { if (entry.preview) URL.revokeObjectURL(entry.preview); }); state.pendingRichFiles = []; state.pendingRichImages = []; }
  function renderRichFiles() { var box = document.getElementById('pw-rich-files'); if (!box) return; var files = state.pendingRichFiles || []; box.innerHTML = files.length ? '<strong>첨부파일 ' + files.length + '개</strong>' + files.map(function (entry) { return '<span><b>' + esc(entry.file.name) + '</b><small>' + formatBytes(entry.file.size) + '</small><button type="button" onclick="OSPersonalWorkspace.removeRichFile(\'' + entry.id + '\')" aria-label="' + esc(entry.file.name) + ' 제거">×</button></span>'; }).join('') : ''; }
  function addRichFiles(files) { Array.prototype.slice.call(files || []).forEach(function (file) { state.pendingRichFiles.push({ id: crypto.randomUUID(), file: file }); }); renderRichFiles(); }
  function removeRichFile(id) { state.pendingRichFiles = state.pendingRichFiles.filter(function (entry) { return entry.id !== id; }); renderRichFiles(); }
  function addRichImages(files) { var editor = document.querySelector('#pw-dialog .pw-rich-body'); if (!editor) return; Array.prototype.slice.call(files || []).filter(function (file) { return /^image\//.test(file.type || ''); }).forEach(function (file) { var id = crypto.randomUUID(), preview = URL.createObjectURL(file); state.pendingRichImages.push({ id: id, file: file, preview: preview }); editor.insertAdjacentHTML('beforeend', '<p><img src="' + esc(preview) + '" data-pending-image="' + id + '" alt="' + esc(file.name) + '"></p>'); }); }
  function formatBytes(bytes) { var value = Number(bytes || 0); if (value < 1024) return value + ' B'; if (value < 1048576) return (value / 1024).toFixed(1) + ' KB'; return (value / 1048576).toFixed(1) + ' MB'; }
  function signStoragePath(path) { return fetch(window.db.url('/storage/v1/object/sign/myspace/' + String(path).split('/').map(encodeURIComponent).join('/')), { method: 'POST', headers: { apikey: window.db.key, Authorization: 'Bearer ' + window.db.getToken(), 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 3600 }) }).then(function (response) { if (!response.ok) throw new Error('첨부파일을 열지 못했습니다.'); return response.json(); }).then(function (data) { return window.db.url('/storage/v1' + data.signedURL); }); }
  function hydrateRichStorage() { var nodes = document.querySelectorAll('#pw-dialog [data-storage-path]'); Array.prototype.forEach.call(nodes, function (node) { var path = node.getAttribute('data-storage-path'), title = node.getAttribute('data-file-title') || node.getAttribute('alt') || '첨부파일', mime = node.getAttribute('data-file-mime') || ''; signStoragePath(path).then(function (url) { if (node.tagName === 'IMG') { node.src = url; node.classList.add('pw-previewable'); node.title = '클릭하면 크게 보기'; node.onclick = function () { openPreviewUrl(url, title, mime || 'image/*'); }; } else { node.href = url; node.onclick = function (event) { if (previewType({ title: title, mime_type: mime, storage_path: path })) { event.preventDefault(); openPreviewUrl(url, title, mime); } }; } }).catch(function () {}); }); }
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (state.pdfJsPromise) return state.pdfJsPromise;
    state.pdfJsPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = function () { if (!window.pdfjsLib) { reject(new Error('PDF 미리보기 모듈을 불러오지 못했습니다.')); return; } window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; resolve(window.pdfjsLib); };
      script.onerror = function () { reject(new Error('PDF 미리보기 모듈을 불러오지 못했습니다.')); };
      document.head.appendChild(script);
    });
    return state.pdfJsPromise;
  }
  function previewUi(type, name, url) {
    var overlay = document.getElementById('pw-preview'), page = document.getElementById('pw-preview-page'), download = document.getElementById('pw-preview-download');
    if (!overlay) return false;
    closeDialog();
    overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); overlay.classList.toggle('is-pdf', type === 'pdf');
    if (page) page.textContent = type === 'pdf' ? '불러오는 중…' : name;
    if (download) { download.href = url; download.download = name || ''; }
    document.body.classList.add('pw-preview-open');
    return true;
  }
  function openPreviewUrl(url, name, mime) {
    var type = previewType({ title: name, mime_type: mime, storage_path: url });
    if (!type) { window.open(url, '_blank', 'noopener'); return; }
    if (!previewUi(type, name, url)) return;
    var stage = document.getElementById('pw-preview-stage');
    state.preview = { type: type, url: url, name: name || '파일', zoom: 1, rotate: 0, page: 1, pages: 1, doc: null };
    if (type === 'image') { stage.innerHTML = '<img id="pw-preview-image" src="' + esc(url) + '" alt="' + esc(name || '') + '">'; renderPreviewTransform(); return; }
    stage.innerHTML = '<div class="pw-preview-loading">PDF를 불러오는 중입니다.</div>';
    Promise.all([loadPdfJs(), fetch(url).then(function (response) { if (!response.ok) throw new Error('PDF를 불러오지 못했습니다.'); return response.arrayBuffer(); })])
      .then(function (values) { return values[0].getDocument({ data: values[1] }).promise; })
      .then(function (doc) { if (!state.preview || state.preview.url !== url) return; state.preview.doc = doc; state.preview.pages = doc.numPages; renderPdfPreview(); })
      .catch(function (error) { if (stage) stage.innerHTML = '<div class="pw-preview-loading">' + esc(error.message || 'PDF 미리보기를 불러오지 못했습니다.') + '</div>'; });
  }
  function openFilePreview(id) {
    var item = workspaceItem(id); if (!item || !item.storage_path) return;
    signStoragePath(item.storage_path).then(function (url) { openPreviewUrl(url, item.title || '파일', item.mime_type || ''); }).catch(saveError);
  }
  function openAssetPreview(source, id) {
    var list = source === 'scripts' ? state.data.scripts : state.data.library;
    var item = list.find(function (entry) { return String(entry.id) === String(id); }); if (!item) return;
    if (item.storage_path) { openFilePreview(id); return; }
    var url = item.image_url || item.file_url || item.link_url;
    if (url) openPreviewUrl(url, item.title || '파일', item.mime_type || (item.image_url ? 'image/*' : ''));
  }
  function renderPreviewTransform() { var p = state.preview, image = document.getElementById('pw-preview-image'); if (p && image) image.style.transform = 'scale(' + p.zoom + ') rotate(' + p.rotate + 'deg)'; }
  function renderPdfPreview() {
    var p = state.preview, stage = document.getElementById('pw-preview-stage'), pageText = document.getElementById('pw-preview-page'); if (!p || !p.doc || !stage) return;
    p.doc.getPage(p.page).then(function (page) {
      if (!state.preview || state.preview !== p) return;
      var viewport = page.getViewport({ scale: 1.35 * p.zoom, rotation: p.rotate }), canvas = document.createElement('canvas');
      canvas.id = 'pw-preview-canvas'; canvas.width = viewport.width; canvas.height = viewport.height; stage.innerHTML = ''; stage.appendChild(canvas);
      return page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
    }).then(function () { if (pageText && state.preview === p) pageText.textContent = p.page + ' / ' + p.pages; });
  }
  function closePreview() { var overlay = document.getElementById('pw-preview'); if (overlay) { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); } state.preview = null; document.body.classList.remove('pw-preview-open'); }
  function previewZoom(direction) { var p = state.preview; if (!p) return; p.zoom = Math.min(4, Math.max(.5, p.zoom + direction * .25)); if (p.type === 'pdf') renderPdfPreview(); else renderPreviewTransform(); }
  function previewRotate() { var p = state.preview; if (!p) return; p.rotate = (p.rotate + 90) % 360; if (p.type === 'pdf') renderPdfPreview(); else renderPreviewTransform(); }
  function previewPage(direction) { var p = state.preview; if (!p || p.type !== 'pdf') return; var next = Math.min(p.pages, Math.max(1, p.page + direction)); if (next !== p.page) { p.page = next; renderPdfPreview(); } }
  function canvasBlob(canvas) { return new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); }); }
  function previewDdak() {
    var p = state.preview; if (!p) return;
    var makeBlob = p.type === 'pdf' ? canvasBlob(document.getElementById('pw-preview-canvas')) : fetch(p.url).then(function (response) { return response.blob(); }).then(function (blob) { return createImageBitmap(blob); }).then(function (bitmap) { var canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height; canvas.getContext('2d').drawImage(bitmap, 0, 0); return canvasBlob(canvas); });
    makeBlob.then(function (blob) { if (!blob) throw new Error('이미지를 만들지 못했습니다.'); if (!navigator.clipboard || !window.ClipboardItem) throw new Error('clipboard'); return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); })
      .then(function () { if (typeof window.toast === 'function') window.toast('복사했습니다. 카카오톡에 붙여넣으세요.'); })
      .catch(function () { var link = document.getElementById('pw-preview-download'); if (link) link.click(); if (typeof window.toast === 'function') window.toast('브라우저 복사가 제한되어 파일로 저장했습니다.'); });
  }
  function workspaceItem(id) { return state.data.items.find(function (entry) { return String(entry.id) === String(id); }); }
  function itemAttachments(id) { return state.data.items.filter(function (entry) { var payload = entry.legacy_payload || {}; return entry.item_type === 'file' && String(entry.parent_id || '') === String(id) && payload.attachment_role !== 'inline-image'; }); }
  function showAsset(source, id) {
    var list = source === 'scripts' ? state.data.scripts : state.data.library;
    var item = list.find(function (entry) { return String(entry.id) === String(id); }); if (!item) return;
    var body = source === 'scripts' ? item.script_text : item.memo_text || item.description || '';
    var link = item.image_url || item.link_url;
    var ownFile = item.item_type === 'file' && item.storage_path;
    var actions = (ownFile || item.image_url ? '<button type="button" class="pw-btn primary" onclick="OSPersonalWorkspace.openAssetPreview(\'' + esc(source) + '\',\'' + esc(id) + '\')">미리보기</button>' : (link ? '<a class="pw-btn primary" href="' + esc(link) + '" target="_blank" rel="noopener">파일 열기</a>' : ''))
      + '<button type="button" class="pw-btn" onclick="OSPersonalWorkspace.editAsset(\'' + esc(id) + '\')">수정</button>'
      + '<button type="button" class="pw-btn danger" onclick="OSPersonalWorkspace.deleteAsset(\'' + esc(id) + '\')">삭제</button>';
    var attachments = itemAttachments(id);
    var attachmentHtml = attachments.length ? '<div class="pw-detail-files"><strong>첨부파일 ' + attachments.length + '개</strong>' + attachments.map(function (file) { return '<a href="#" data-storage-path="' + esc(file.storage_path) + '" data-file-title="' + esc(file.title) + '" data-file-mime="' + esc(file.mime_type || '') + '" target="_blank" rel="noopener"><span>' + (previewType(file) === 'image' ? '▧' : previewType(file) === 'pdf' ? '▤' : '▣') + '</span><b>' + esc(file.title) + '</b><small>' + (previewType(file) ? '미리보기 · ' : '') + formatBytes(file.file_size) + '</small></a>'; }).join('') + '</div>' : '';
    dialog('<div class="pw-detail"><span class="pw-badge">' + (source === 'scripts' ? '업무노트' : item.memo_text ? '메모' : '자료실') + '</span><h2>' + esc(item.title || '(제목 없음)') + '</h2><small>' + formatDate(item.created_at) + '</small><div class="pw-detail-body pw-rich-content">' + sanitizeRich(body) + '</div>' + attachmentHtml + '<div class="pw-detail-actions">' + actions + '</div></div>');
    hydrateRichStorage();
  }
  function showCustomer(id) {
    var customer = state.data.customers.find(function (entry) { return String(entry.id) === String(id); }); if (!customer) return;
    var history = state.data.consultations.filter(function (entry) { return String(entry.customer_id) === String(id); });
    dialog('<div class="pw-detail"><span class="pw-badge">고객</span><h2>' + esc(customer.name || '(이름 없음)') + '</h2><p>' + esc(customer.phone || customer.phone_raw || '') + '</p><h3>상담 기록</h3><div class="pw-list">' + (history.length ? history.map(function (entry) { return row(formatDate(entry.consulted_at || entry.created_at), entry.memo || '', esc(entry.channel || ''), ''); }).join('') : '<div class="pw-empty">상담 기록이 없습니다.</div>') + '</div></div>');
  }
  function showEvent(id) { var event = allEvents().find(function (entry) { return String(entry.id) === String(id); }); if (!event) return; dialog('<div class="pw-detail"><span class="pw-badge">' + (event.event_type === 'customer' ? '고객관리' : '일정') + '</span><h2>' + esc(event.title) + '</h2><p>' + esc(String(event.event_date || '').slice(0, 10)) + ' ' + esc(String(event.event_time || '').slice(0, 5)) + '</p><div class="pw-detail-body">' + esc(event.description || '') + '</div></div>'); }

  function formField(label, input) { return '<label class="pw-field"><span>' + label + '</span>' + input + '</label>'; }
  function formShell(title, body, saveAction) { return '<form class="pw-form" onsubmit="event.preventDefault();' + saveAction + '"><h2>' + title + '</h2>' + body + '<div class="pw-form-actions"><button type="button" class="pw-btn" onclick="OSPersonalWorkspace.closeDialog()">취소</button><button type="submit" class="pw-btn primary">저장</button></div></form>'; }
  function write(path, body) { return window.db.fetch('/rest/v1/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify(body) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return true; }); }
  function writeOne(path, body) { return window.db.fetch('/rest/v1/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(body) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return response.json(); }).then(function (rows) { if (!Array.isArray(rows) || !rows[0]) throw new Error('저장 결과를 확인하지 못했습니다.'); return rows[0]; }); }
  function update(path, body) { return window.db.fetch('/rest/v1/' + path, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify(body) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return true; }); }
  function updateOne(path, body) { return window.db.fetch('/rest/v1/' + path, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(body) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return response.json(); }).then(function (rows) { if (!Array.isArray(rows) || rows.length !== 1) throw new Error('수정 권한을 확인하지 못했습니다. 다시 로그인한 뒤 시도해 주세요.'); return rows[0]; }); }
  function softDelete(path) { return window.db.fetch('/rest/v1/' + path, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify({ deleted_at: new Date().toISOString() }) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return response.json(); }).then(function (rows) { if (!Array.isArray(rows) || rows.length !== 1) throw new Error('삭제 권한을 확인하지 못했습니다. 다시 로그인한 뒤 시도해 주세요.'); return true; }); }
  function softDeleteChildren(parentId) { return window.db.fetch('/rest/v1/workspace_items?parent_id=eq.' + encodeURIComponent(parentId) + '&owner_id=eq.' + encodeURIComponent(currentUserId()) + '&deleted_at=is.null', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify({ deleted_at: new Date().toISOString() }) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return true; }); }
  function finishSave(message) { closeDialog(); state.query = ''; var input = document.getElementById('pw-search-input'); if (input) input.value = ''; loadData(true); if (typeof window.toast === 'function') window.toast(message); }
  function saveError(error) { alert('저장하지 못했습니다.\n' + (error && error.message ? error.message : error)); }
  function legacy(key) { if (STANDALONE) { window.location.href = '/insu/?view=' + encodeURIComponent(key); return; } if (window.showView) window.showView(key); }
  function addAsset() { resetRichPending(); var category = currentAssetCategory(), selected = category === 'memo' ? 'memo' : category === 'file' ? 'link' : 'note'; dialog(formShell('자료 추가', formField('종류', '<select id="pwf-asset-type"><option value="note"' + (selected === 'note' ? ' selected' : '') + '>업무노트</option><option value="memo"' + (selected === 'memo' ? ' selected' : '') + '>메모</option><option value="link"' + (selected === 'link' ? ' selected' : '') + '>링크 자료</option></select>') + formField('제목', '<input id="pwf-title" required autocomplete="off" onkeydown="if(event.key===\'Enter\'||(event.key===\'Tab\'&&!event.shiftKey)){event.preventDefault();OSPersonalWorkspace.focusRich(\'pwf-body\')}">') + formField('내용', richEditorField('pwf-body', '')) + formField('링크 (선택)', '<input id="pwf-link" type="url" placeholder="https://">') + formField('공개 범위', '<select id="pwf-visibility"><option value="private">나만 보기</option><option value="public">로그인 사용자 전체 공개</option></select>'), 'OSPersonalWorkspace.saveAsset()')); var title = document.getElementById('pwf-title'); if (title) title.focus(); }
  function editAsset(id) {
    var item = workspaceItem(id); if (!item || item.item_type === 'folder') return;
    resetRichPending();
    var fileOnly = item.item_type === 'file';
    var fields = formField('제목', '<input id="pwf-edit-title" required autocomplete="off" value="' + esc(item.title || '') + '" onkeydown="if(event.key===\'Enter\'||(event.key===\'Tab\'&&!event.shiftKey)){event.preventDefault();OSPersonalWorkspace.focusRich(\'pwf-edit-body\')}">');
    if (fileOnly) fields += '<p class="pw-form-note">업로드 파일은 표시 이름을 수정할 수 있습니다.</p>';
    else fields += formField('내용', richEditorField('pwf-edit-body', item.body || ''))
      + formField('링크 (선택)', '<input id="pwf-edit-link" type="url" placeholder="https://" value="' + esc(item.url || '') + '">')
      + formField('공개 범위', '<select id="pwf-edit-visibility"><option value="private"' + (item.visibility !== 'public' ? ' selected' : '') + '>나만 보기</option><option value="public"' + (item.visibility === 'public' ? ' selected' : '') + '>로그인 사용자 전체 공개</option></select>');
    dialog(formShell('자료 수정', fields, 'OSPersonalWorkspace.saveAssetEdit(\'' + esc(id) + '\')'));
    var editTitle = document.getElementById('pwf-edit-title'); if (editTitle) { editTitle.focus(); editTitle.select(); }
    hydrateRichStorage();
  }
  function saveAssetEdit(id) {
    var item = workspaceItem(id), title = value('pwf-edit-title'); if (!item || !title) return;
    var changes = { title: title };
    if (item.item_type !== 'file') {
      var body = richValue('pwf-edit-body'); if (!richHasText(body)) return;
      var category = assetCategory(item);
      prepareRichUploads(id, body, category).then(function (prepared) {
        changes.body = prepared.body; changes.url = value('pwf-edit-link') || null; changes.visibility = value('pwf-edit-visibility') === 'public' ? 'public' : 'private';
        return updateOne('workspace_items?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()) + '&deleted_at=is.null', changes)
          .then(function () { return saveRichChildren(prepared.rows); });
      }).then(function () { resetRichPending(); finishSave('자료를 수정했습니다.'); }).catch(saveError);
      return;
    }
    updateOne('workspace_items?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()) + '&deleted_at=is.null', changes)
      .then(function () { finishSave('자료를 수정했습니다.'); }).catch(saveError);
  }
  function deleteAsset(id) {
    var item = workspaceItem(id); if (!item || item.item_type === 'folder') return;
    if (!window.confirm('“' + String(item.title || '제목 없음') + '” 자료를 삭제할까요?')) return;
    softDeleteChildren(id).then(function () { return softDelete('workspace_items?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()) + '&deleted_at=is.null'); })
      .then(function () { closeDialog(); return loadData(true); })
      .then(function () { if (typeof window.toast === 'function') window.toast('자료를 삭제했습니다.'); }).catch(saveError);
  }
  function openVault() {
    dialog('<div class="pw-vault"><div class="pw-vault-head"><div><h2>내 파일함</h2><p>사이트에 저장된 파일과 폴더입니다. PC 원본은 변경하지 않습니다.</p></div><div class="pw-actions"><button class="pw-btn" onclick="OSPersonalWorkspace.newFolder()">+ 새 폴더</button><label class="pw-btn primary">+ 파일<input id="pw-vault-picker" type="file" multiple hidden onchange="OSPersonalWorkspace.uploadFiles(this.files)"></label></div></div><div id="pw-vault-content" class="pw-vault-content"><div class="pw-loading">파일함을 불러오는 중입니다.</div></div></div>');
    api('workspace_items?owner_id=eq.' + encodeURIComponent(currentUserId()) + '&item_type=in.(folder,file)&deleted_at=is.null' + personalItemScope() + '&order=created_at.desc&limit=10000&select=*').then(function (items) { state.vaultFolders = items.filter(function (item) { return item.item_type === 'folder'; }); state.vaultFiles = items.filter(function (item) { return item.item_type === 'file'; }); renderVault(); }).catch(function () { var content = document.getElementById('pw-vault-content'); if (content) content.innerHTML = '<div class="pw-error">파일함을 불러오지 못했습니다.</div>'; });
  }
  function renderVault() { var content = document.getElementById('pw-vault-content'); if (!content) return; var folders = state.vaultFolders || [], files = state.vaultFiles || []; content.innerHTML = '<div class="pw-vault-grid">' + folders.map(function (folder) { return '<div class="pw-file-card folder"><span>📁</span><b>' + esc(folder.title) + '</b><small>폴더</small></div>'; }).concat(files.map(function (file) { return '<div class="pw-file-card"><span>📄</span><b>' + esc(file.title) + '</b><small>' + esc((file.extension || '파일').toUpperCase()) + ' · ' + formatDate(file.created_at) + '</small></div>'; })).join('') + '</div>' + ((!folders.length && !files.length) ? '<div class="pw-empty">저장된 파일이 없습니다.</div>' : ''); }
  function newFolder() { var name = prompt('새 폴더 이름'); if (name == null || !String(name).trim()) return; write('workspace_items', { owner_id: currentUserId(), parent_id: null, item_type: 'folder', title: String(name).trim(), visibility: 'private' }).then(function () { openVault(); loadData(true); }).catch(saveError); }
  function uploadFiles(files) { var list = Array.prototype.slice.call(files || []); if (!list.length) return; var token = window.db.getToken(), owner = currentUserId(); Promise.all(list.map(function (file) { var id = crypto.randomUUID(), dot = file.name.lastIndexOf('.'), ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : '', path = owner + '/root/' + id + (ext ? '.' + ext.replace(/[^a-z0-9]/g, '') : ''); return fetch(window.db.url('/storage/v1/object/myspace/' + path.split('/').map(encodeURIComponent).join('/')), { method: 'POST', headers: { apikey: window.db.key, Authorization: 'Bearer ' + token, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' }, body: file }).then(function (response) { if (!response.ok) throw new Error(file.name + ' 업로드 실패'); return write('workspace_items', { id: id, owner_id: owner, item_type: 'file', title: file.name, storage_path: path, mime_type: file.type || null, extension: ext || null, file_size: file.size, visibility: 'private' }); }); })).then(function () { openVault(); loadData(true); }).catch(saveError); }
  function closeAssetMenu() { var menu = document.querySelector('#v-personal-workspace .pw-add-menu'); if (menu) menu.open = false; }
  function newAssetFolder() {
    closeAssetMenu();
    var category = currentAssetCategory();
    var categoryField = category
      ? '<input id="pwf-folder-category" type="hidden" value="' + esc(category) + '"><p class="pw-folder-destination">저장 위치 · ' + esc(assetCategoryLabel(category)) + (state.assetFolder ? ' / 현재 폴더' : '') + '</p>'
      : formField('저장 위치', '<select id="pwf-folder-category" required><option value="note">업무노트</option><option value="file">자료실</option><option value="memo">메모</option></select>');
    dialog(formShell('새 폴더', categoryField + formField('폴더 이름', '<input id="pwf-folder-name" required autocomplete="off">'), 'OSPersonalWorkspace.saveAssetFolder()'));
    window.setTimeout(function () { var input = document.getElementById('pwf-folder-name'); if (input) input.focus(); }, 0);
  }
  function saveAssetFolder() {
    var name = value('pwf-folder-name'), category = value('pwf-folder-category');
    if (!name || ['note', 'file', 'memo'].indexOf(category) < 0) return;
    var parent = state.assetFolder && currentAssetCategory() === category ? state.assetFolder : null;
    write('workspace_items', { owner_id: currentUserId(), parent_id: parent, item_type: 'folder', title: name, visibility: 'private', legacy_payload: { workspace_category: category } })
      .then(function () { closeDialog(); state.assetFilter = category; state.assetFolder = parent; return loadData(true); })
      .then(function () { if (typeof window.toast === 'function') window.toast(assetCategoryLabel(category) + '에 폴더를 만들었습니다.'); }).catch(saveError);
  }
  function deleteAssetFolder(id) {
    var folder = state.data.library.find(function (item) { return String(item.id) === String(id) && item.item_type === 'folder'; });
    if (!folder) return;
    var hasChildren = state.data.items.some(function (item) { return !item.deleted_at && String(item.parent_id || '') === String(id); });
    if (hasChildren) { alert('폴더 안의 자료와 하위 폴더를 먼저 비워주세요.'); return; }
    if (!window.confirm('“' + String(folder.title || '폴더') + '” 폴더를 삭제할까요?')) return;
    var category = assetCategory(folder);
    softDelete('workspace_items?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()))
      .then(function () { state.assetFolder = null; state.assetFilter = category; return loadData(true); })
      .then(function () { if (typeof window.toast === 'function') window.toast('폴더를 삭제했습니다.'); }).catch(saveError);
  }
  function assetDragStart(event, id, category) {
    state.draggingAsset = { id: String(id), category: String(category) };
    if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(id)); }
    if (event.currentTarget) event.currentTarget.classList.add('is-dragging');
  }
  function assetDragEnd(event) {
    state.draggingAsset = null;
    if (event && event.currentTarget) event.currentTarget.classList.remove('is-dragging');
    document.querySelectorAll('#v-personal-workspace .is-drag-over').forEach(function (element) { element.classList.remove('is-drag-over'); });
  }
  function assetDragOver(event, folderId, folderCategory) {
    var hasFiles = event.dataTransfer && event.dataTransfer.types && Array.prototype.indexOf.call(event.dataTransfer.types, 'Files') >= 0;
    var canMove = state.draggingAsset && state.draggingAsset.category === String(folderCategory) && state.draggingAsset.id !== String(folderId);
    if (!hasFiles && !canMove) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = hasFiles ? 'copy' : 'move';
    if (event.currentTarget) event.currentTarget.classList.add('is-drag-over');
  }
  function assetDragLeave(event) {
    if (!event.currentTarget || (event.relatedTarget && event.currentTarget.contains(event.relatedTarget))) return;
    event.currentTarget.classList.remove('is-drag-over');
  }
  function assetDrop(event, folderId, folderCategory) {
    event.preventDefault(); event.stopPropagation();
    if (event.currentTarget) event.currentTarget.classList.remove('is-drag-over');
    var files = event.dataTransfer && event.dataTransfer.files ? Array.prototype.slice.call(event.dataTransfer.files) : [];
    if (files.length) { performAssetFileUpload(files, String(folderCategory), String(folderId)); return; }
    var dragging = state.draggingAsset;
    state.draggingAsset = null;
    if (!dragging || dragging.id === String(folderId)) return;
    if (dragging.category !== String(folderCategory)) { if (typeof window.toast === 'function') window.toast('같은 분류의 폴더로만 이동할 수 있습니다.'); return; }
    window.db.fetch('/rest/v1/workspace_items?id=eq.' + encodeURIComponent(dragging.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify({ parent_id: String(folderId) }) })
      .then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return response.json(); })
      .then(function (rows) {
        if (!Array.isArray(rows) || rows.length !== 1) throw new Error('이동할 자료를 확인하지 못했습니다.');
        state.data.items.concat(state.data.scripts, state.data.library).forEach(function (item) { if (String(item.id) === dragging.id) item.parent_id = String(folderId); });
        renderContent(); return loadData(true);
      })
      .then(function () { if (typeof window.toast === 'function') window.toast('폴더로 이동했습니다.'); }).catch(saveError);
  }
  function uploadAssetFiles(files) {
    closeAssetMenu(); var list = Array.prototype.slice.call(files || []); if (!list.length) return;
    var category = currentAssetCategory();
    if (!category) {
      state.pendingAssetFiles = list;
      dialog(formShell('파일 업로드', formField('저장 위치', '<select id="pwf-upload-category" required><option value="note">업무노트</option><option value="file">자료실</option><option value="memo">메모</option></select>') + '<p class="pw-folder-destination">선택한 파일 ' + list.length + '개</p>', 'OSPersonalWorkspace.confirmAssetFileUpload()'));
      return;
    }
    performAssetFileUpload(list, category);
  }
  function confirmAssetFileUpload() {
    var category = value('pwf-upload-category'), list = state.pendingAssetFiles || [];
    if (!list.length || ['note', 'file', 'memo'].indexOf(category) < 0) return;
    state.pendingAssetFiles = null; closeDialog(); performAssetFileUpload(list, category);
  }
  function performAssetFileUpload(list, category, parentOverride) {
    var token = window.db.getToken(), owner = currentUserId(), parent = parentOverride !== undefined ? parentOverride : (state.assetFolder && currentAssetCategory() === category ? state.assetFolder : null), folderPath = parent || category;
    Promise.all(list.map(function (file) {
      var id = crypto.randomUUID(), dot = file.name.lastIndexOf('.'), ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : '', path = owner + '/' + folderPath + '/' + id + (ext ? '.' + ext.replace(/[^a-z0-9]/g, '') : '');
      return fetch(window.db.url('/storage/v1/object/myspace/' + path.split('/').map(encodeURIComponent).join('/')), { method: 'POST', headers: { apikey: window.db.key, Authorization: 'Bearer ' + token, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' }, body: file }).then(function (response) {
        if (!response.ok) throw new Error(file.name + ' 업로드 실패');
        return write('workspace_items', { id: id, owner_id: owner, parent_id: parent, item_type: 'file', title: file.name, storage_path: path, mime_type: file.type || null, extension: ext || null, file_size: file.size, visibility: 'private', legacy_payload: { workspace_category: category } });
      });
    })).then(function () { state.assetFilter = category; state.assetFolder = parent; return loadData(true); }).then(function () { if (typeof window.toast === 'function') window.toast(assetCategoryLabel(category) + '에 파일 ' + list.length + '개를 추가했습니다.'); }).catch(saveError);
  }
  function addCustomer() { dialog(formShell('고객 등록', formField('고객명', '<input id="pwf-customer-name" required autocomplete="name">') + formField('연락처', '<input id="pwf-customer-phone" inputmode="tel" autocomplete="tel">') + formField('상태', '<select id="pwf-customer-status"><option>신규DB</option><option>상담중</option><option>청약완료</option><option>보류</option></select>') + formField('메모', '<textarea id="pwf-customer-note" rows="5"></textarea>'), 'OSPersonalWorkspace.saveCustomer()')); }
  function customerOptions() { return state.data.customers.map(function (item) { return '<option value="' + esc(item.id) + '">' + esc(item.name || '이름 없음') + '</option>'; }).join(''); }
  function consultationForm(item, customer) {
    item = item || {}; customer = customer || {}; var profile = customerProfile(customer), date = String(item.consulted_at || ymd(new Date())).slice(0, 10), status = consultationStatus(item, customer);
    var statuses = ['예약', '진행중', '제안서발송', '클로징', '청약완료', '보류', '종결'];
    return '<div class="pw-consult-form-grid">' + formField('등록일자', '<input id="pwf-consult-date" type="date" required value="' + esc(date) + '" onchange="OSPersonalWorkspace.refreshInsuranceAge()">')
      + formField('이름', '<div class="pw-name-gender"><input id="pwf-consult-name" required autocomplete="name" value="' + esc(customer.name || '') + '"><div class="pw-gender"><label><input type="radio" name="pwf-consult-gender" value="남"' + (profile.gender === '남' ? ' checked' : '') + '>남</label><label><input type="radio" name="pwf-consult-gender" value="여"' + (profile.gender === '여' ? ' checked' : '') + '>여</label></div></div>')
      + formField('생년월일', '<div class="pw-birth-age"><input id="pwf-consult-birth" type="date" value="' + esc(profile.birth_date || '') + '" onchange="OSPersonalWorkspace.refreshInsuranceAge()"><span id="pwf-insurance-age">보험나이 -</span></div>')
      + formField('전화번호', '<input id="pwf-consult-phone" inputmode="numeric" autocomplete="tel" value="' + esc(phoneText(customer.phone || customer.phone_raw || '')) + '" oninput="OSPersonalWorkspace.formatConsultPhone(this)">')
      + formField('상담상태', '<select id="pwf-consult-status">' + statuses.map(function (entry) { return '<option value="' + entry + '"' + (entry === status ? ' selected' : '') + '>' + entry + '</option>'; }).join('') + '</select>') + '</div>'
      + formField('상담내용', '<textarea id="pwf-consult-memo" rows="12" required>' + esc(item.memo || '') + '</textarea>')
      + '<input id="pwf-consult-customer-id" type="hidden" value="' + esc(customer.id || '') + '"><input id="pwf-consult-id" type="hidden" value="' + esc(item.id || '') + '">';
  }
  function addConsultation(customerId) { var customer = state.data.customers.find(function (entry) { return String(entry.id) === String(customerId || ''); }) || {}; dialog(formShell('상담 등록', consultationForm(null, customer), 'OSPersonalWorkspace.saveConsultation()')); refreshInsuranceAge(); }
  function editConsultation(id) { var item = state.data.consultations.find(function (entry) { return String(entry.id) === String(id); }); if (!item) return; var customer = state.data.customers.find(function (entry) { return String(entry.id) === String(item.customer_id); }) || {}; dialog(formShell('상담 수정', consultationForm(item, customer), 'OSPersonalWorkspace.saveConsultation()')); refreshInsuranceAge(); }
  function refreshInsuranceAge() { var target = document.getElementById('pwf-insurance-age'); if (!target) return; var age = insuranceAge(value('pwf-consult-birth'), value('pwf-consult-date')); target.textContent = '보험나이 ' + (age === '' ? '-' : age + '세'); }
  function formatConsultPhone(input) { if (input) input.value = phoneText(input.value); }
  function addEvent(date) { dialog(formShell('일정 추가', formField('날짜', '<input id="pwf-event-date" type="date" required value="' + esc(date || state.selectedDate) + '">') + formField('시간', '<input id="pwf-event-time" type="time">') + formField('제목', '<input id="pwf-event-title" required autocomplete="off">') + formField('설명', '<textarea id="pwf-event-desc" rows="5"></textarea>'), 'OSPersonalWorkspace.saveEvent()')); }
  function value(id) { var element = document.getElementById(id); return element ? String(element.value || '').trim() : ''; }
  function prepareRichUploads(itemId, body, category) {
    var owner = currentUserId(), token = window.db.getToken(), images = state.pendingRichImages || [], files = state.pendingRichFiles || [], all = images.map(function (entry) { return { entry: entry, role: 'inline-image' }; }).concat(files.map(function (entry) { return { entry: entry, role: 'attachment' }; }));
    if (!all.length) return Promise.resolve({ body: body, rows: [] });
    return Promise.all(all.map(function (wrapped) {
      var entry = wrapped.entry, file = entry.file, dot = file.name.lastIndexOf('.'), ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '', path = owner + '/attachments/' + itemId + '/' + entry.id + (ext ? '.' + ext : '');
      return fetch(window.db.url('/storage/v1/object/myspace/' + path.split('/').map(encodeURIComponent).join('/')), { method: 'POST', headers: { apikey: window.db.key, Authorization: 'Bearer ' + token, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' }, body: file }).then(function (response) {
        if (!response.ok) throw new Error(file.name + ' 업로드 실패');
        return { pendingId: entry.id, path: path, row: { id: entry.id, owner_id: owner, parent_id: itemId, item_type: 'file', title: file.name, storage_path: path, mime_type: file.type || null, extension: ext || null, file_size: file.size, visibility: 'private', legacy_payload: { workspace_category: category, attachment_role: wrapped.role } } };
      });
    })).then(function (uploaded) {
      var doc = new DOMParser().parseFromString(String(body || ''), 'text/html');
      uploaded.forEach(function (file) { var image = doc.body.querySelector('img[data-pending-image="' + file.pendingId + '"]'); if (image) { image.removeAttribute('data-pending-image'); image.removeAttribute('src'); image.setAttribute('data-storage-path', file.path); } });
      return { body: sanitizeRich(doc.body.innerHTML), rows: uploaded.map(function (entry) { return entry.row; }) };
    });
  }
  function saveRichChildren(rows) { return Promise.all((rows || []).map(function (rowBody) { return write('workspace_items', rowBody); })); }
  function saveAsset() {
    var type = value('pwf-asset-type'), title = value('pwf-title'), body = richValue('pwf-body'), link = value('pwf-link'), category = type === 'note' ? 'note' : type === 'memo' ? 'memo' : 'file'; if (!title || !richHasText(body)) return;
    var parent = state.assetFolder && currentAssetCategory() === category ? state.assetFolder : null, itemId = crypto.randomUUID();
    prepareRichUploads(itemId, body, category).then(function (prepared) { return write('workspace_items', { id: itemId, owner_id: currentUserId(), parent_id: parent, item_type: category === 'note' ? 'note' : category === 'memo' ? 'memo' : 'link', title: title, body: prepared.body, url: link || null, visibility: value('pwf-visibility') === 'public' ? 'public' : 'private', legacy_payload: { workspace_category: category } }).then(function () { return saveRichChildren(prepared.rows); }); }).then(function () { state.assetFilter = category; state.assetFolder = parent; resetRichPending(); finishSave('자료를 저장했습니다.'); }).catch(saveError);
  }
  function saveCustomer() { var name = value('pwf-customer-name'), phone = value('pwf-customer-phone'), note = value('pwf-customer-note'); if (!name) return; write('workspace_customers', { owner_id: currentUserId(), name: name, phone: phone || null, status: value('pwf-customer-status') || '신규DB', profile: note ? { note: note } : {} }).then(function () { finishSave('고객을 등록했습니다.'); }).catch(saveError); }
  function saveConsultation() {
    var customerId = value('pwf-consult-customer-id'), consultationId = value('pwf-consult-id'), name = value('pwf-consult-name'), birth = value('pwf-consult-birth'), date = value('pwf-consult-date'), phone = phoneText(value('pwf-consult-phone')), status = value('pwf-consult-status'), memo = value('pwf-consult-memo');
    var genderInput = document.querySelector('input[name="pwf-consult-gender"]:checked'), gender = genderInput ? genderInput.value : '';
    if (!name || !date || !memo) return;
    var existing = state.data.customers.find(function (entry) { return String(entry.id) === String(customerId); }) || {}, profile = Object.assign({}, customerProfile(existing), { birth_date: birth || null, gender: gender || null });
    var customerBody = { owner_id: currentUserId(), name: name, phone: phone || null, status: status || '예약', profile: profile };
    var customerPromise = customerId ? updateOne('workspace_customers?id=eq.' + encodeURIComponent(customerId) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), customerBody) : writeOne('workspace_customers', customerBody);
    customerPromise.then(function (customer) {
      var content = consultationId ? memo : '[' + writtenAt() + '] ' + memo;
      var consultationBody = { customer_id: customer.id, owner_id: currentUserId(), consulted_at: date + 'T00:00:00+09:00', channel: status || '예약', content: content };
      return consultationId ? updateOne('workspace_consultations?id=eq.' + encodeURIComponent(consultationId) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), consultationBody) : writeOne('workspace_consultations', consultationBody);
    }).then(function (saved) { state.selectedConsultation = saved.id; finishSave(consultationId ? '상담을 수정했습니다.' : '상담을 등록했습니다.'); }).catch(saveError);
  }
  function selectConsultation(id) { state.selectedConsultation = id && String(state.selectedConsultation) !== String(id) ? id : null; renderContent(); }
  function refreshDetailInsuranceAge() { var target = document.getElementById('pwd-insurance-age'); if (!target) return; var age = insuranceAge(value('pwd-consult-birth'), value('pwd-consult-date')); target.textContent = age === '' ? '-' : age + '세'; }
  function saveConsultationDetail(id) {
    var item = state.data.consultations.find(function (entry) { return String(entry.id) === String(id); }); if (!item) return;
    var customer = state.data.customers.find(function (entry) { return String(entry.id) === String(item.customer_id); }); if (!customer) return;
    var name = value('pwd-consult-name'), birth = value('pwd-consult-birth'), date = value('pwd-consult-date'), phone = phoneText(value('pwd-consult-phone')), status = value('pwd-consult-status'), addition = value('pwd-consult-new');
    var genderInput = document.querySelector('input[name="pwd-consult-gender"]:checked'), gender = genderInput ? genderInput.value : '';
    if (!name || !date) return;
    var profile = Object.assign({}, customerProfile(customer), { birth_date: birth || null, gender: gender || null });
    var content = String(item.memo || ''); if (addition) content += (content ? '\n' : '') + '[' + writtenAt() + '] ' + addition;
    Promise.all([
      updateOne('workspace_customers?id=eq.' + encodeURIComponent(customer.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { name: name, phone: phone || null, status: status || '예약', profile: profile }),
      updateOne('workspace_consultations?id=eq.' + encodeURIComponent(item.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { consulted_at: date + 'T00:00:00+09:00', channel: status || '예약', content: content })
    ]).then(function () { finishSave('상담을 저장했습니다.'); }).catch(saveError);
  }
  function saveEvent() { var date = value('pwf-event-date'), title = value('pwf-event-title'); if (!date || !title) return; write('workspace_tasks', { task_date: date, task_time: value('pwf-event-time') || null, title: title, description: value('pwf-event-desc') || null, owner_id: currentUserId() }).then(function () { state.selectedDate = date; state.cursor = parseDate(date); finishSave('일정을 추가했습니다.'); }).catch(saveError); }
  function moveCalendar(direction) {
    if (state.calendarMode === 'month') state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + direction, 1);
    else { var step = state.calendarMode === 'day' ? 1 : state.calendarMode === 'week' ? 7 : 365; state.selectedDate = addDays(state.selectedDate, direction * step); state.cursor = parseDate(state.selectedDate); }
    renderContent(); setUrl(false);
  }
  function selectDate(date) { state.selectedDate = date; if (state.calendarMode === 'month') { var events = eventsFor(date); if (events.length) showEvent(events[0].id); } renderContent(); setUrl(false); }
  function restoreFromUrl() { var p = new URLSearchParams(location.search); if (p.get('view') !== 'personal-workspace') return false; var section = p.get('section'); if (SECTIONS.indexOf(section) >= 0) state.section = section; var mode = p.get('mode'); if (['day', 'week', 'month', 'agenda'].indexOf(mode) >= 0) state.calendarMode = mode; var date = p.get('date'); if (/^\d{4}-\d{2}-\d{2}$/.test(date || '')) { state.selectedDate = date; state.cursor = parseDate(date); } return true; }
  function boot() { var localTest = isLocal() && new URLSearchParams(location.search).get('pwtest') === '1'; if (STANDALONE && !authenticated() && !localTest) { renderStandaloneGate('login'); return; } if (!ensureShell()) return; restoreFromUrl(); if (localTest) { state.data = { library: [{ id: 'l1', title: '고객 보장자료', description: '고객상담 자료', created_at: '2026-08-14', scope: 'personal' }], scripts: [{ id: 's1', title: '상담 업무노트', script_text: '<p>한글 검색 확인</p>', created_at: '2026-08-13', scope: 'personal' }], events: [{ id: 'e1', title: '김고객 상담', description: '갱신 상담', event_date: ymd(new Date()), event_time: '10:00' }], customers: [{ id: 'c1', name: '김고객', phone: '010-1234-5678', status: '상담중', created_at: '2026-08-10', profile: {} }], consultations: [{ id: 'co1', customer_id: 'c1', memo: '보장 상담 완료', channel: '전화', consulted_at: '2026-08-13' }] }; state.status = 'ready'; state.loadedFor = 'local-test'; state.fullLoaded = true; renderShell(); return; } openWorkspace(state.section, false); }

  restoreFromUrl();
  document.addEventListener('appstate:ready', function () { if (!allowed()) { if (STANDALONE) renderStandaloneGate('denied'); return; } if (!document.getElementById('v-personal-workspace')) ensureShell(); restoreFromUrl(); openWorkspace(state.section, false); });
  window.addEventListener('popstate', function () { if (!allowed() || !restoreFromUrl()) return; openWorkspace(state.section, false); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && state.preview) closePreview(); else if (state.preview && state.preview.type === 'pdf' && event.key === 'ArrowRight') previewPage(1); else if (state.preview && state.preview.type === 'pdf' && event.key === 'ArrowLeft') previewPage(-1); });
  window.addEventListener('load', function () { window.setTimeout(boot, 350); });
  window.OSPersonalWorkspace = {
    boot: boot, go: go, legacy: legacy, reload: function () { loadData(true); },
    filterAssets: function (filter) { state.assetFilter = filter; state.assetFolder = null; renderContent(); },
    setAssetView: function (view) { if (['list', 'thumb', 'large'].indexOf(view) < 0) return; state.assetView = view; localStorage.setItem('ws_asset_view', view); renderContent(); },
    openAssetFolder: function (id) { var folder = state.data.library.find(function (item) { return String(item.id) === String(id) && item.item_type === 'folder'; }); state.assetFolder = id || null; state.assetFilter = folder ? assetCategory(folder) : 'file'; renderContent(); },
    openAssetRoot: function (category) { state.assetFolder = null; state.assetFilter = ['note', 'file', 'memo'].indexOf(category) >= 0 ? category : 'all'; renderContent(); },
    showAsset: showAsset, openFilePreview: openFilePreview, openAssetPreview: openAssetPreview, openUrlPreview: openPreviewUrl, closePreview: closePreview, previewZoom: previewZoom, previewRotate: previewRotate, previewPage: previewPage, previewDdak: previewDdak, editAsset: editAsset, saveAssetEdit: saveAssetEdit, deleteAsset: deleteAsset, richCommand: richCommand, focusRich: focusRich, addRichImages: addRichImages, addRichFiles: addRichFiles, removeRichFile: removeRichFile, showCustomer: showCustomer, showEvent: showEvent,
    closeDialog: closeDialog, addAsset: function () { closeAssetMenu(); addAsset(); }, saveAsset: saveAsset, openVault: openVault, newFolder: newFolder, uploadFiles: uploadFiles, newAssetFolder: newAssetFolder, saveAssetFolder: saveAssetFolder, deleteAssetFolder: deleteAssetFolder, uploadAssetFiles: uploadAssetFiles, confirmAssetFileUpload: confirmAssetFileUpload,
    assetDragStart: assetDragStart, assetDragEnd: assetDragEnd, assetDragOver: assetDragOver, assetDragLeave: assetDragLeave, assetDrop: assetDrop,
    addCustomer: addCustomer, saveCustomer: saveCustomer, addConsultation: addConsultation, editConsultation: editConsultation, saveConsultation: saveConsultation, selectConsultation: selectConsultation, saveConsultationDetail: saveConsultationDetail, refreshInsuranceAge: refreshInsuranceAge, refreshDetailInsuranceAge: refreshDetailInsuranceAge, formatConsultPhone: formatConsultPhone, addEvent: addEvent, saveEvent: saveEvent,
    setCalendarMode: function (mode) { state.calendarMode = mode; renderContent(); setUrl(false); },
    moveCalendar: moveCalendar, calendarToday: function () { state.selectedDate = ymd(new Date()); state.cursor = new Date(); renderContent(); setUrl(false); }, selectDate: selectDate,
    __testLoad: function (data) { if (!isLocal()) return; state.data = data; state.status = 'ready'; state.loadedFor = 'local-test'; renderShell(); }
  };
})();
