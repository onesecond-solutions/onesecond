(function () {
  'use strict';

  var PILOT_ID = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';
  var TEST_EMAIL = 'bylts0428+codex-workstation-20260815@gmail.com';
  var STANDALONE = document.documentElement.getAttribute('data-workstation') === 'true';
  var SECTIONS = ['home', 'assets', 'customers', 'consultations', 'calendar', 'archive'];
  var state = {
    section: 'home', assetFilter: 'all', assetView: localStorage.getItem('ws_asset_view') || 'list', assetFolder: null, query: '', composing: false, searchTimer: 0,
    calendarMode: 'month', selectedDate: ymd(new Date()), cursor: new Date(),
    status: 'idle', error: '', loadedFor: '', requestId: 0, loadPromise: null, fullLoaded: false,
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
    var items = [['home', '⌂', '홈'], ['assets', '▤', '자료'], ['customers', '♙', '고객'], ['consultations', '✎', '상담'], ['calendar', '▦', '캘린더']];
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
  function hydrateAssetThumbs() {
    if (!window.db || !window.db.url || !window.db.getToken) return;
    document.querySelectorAll('#v-personal-workspace img[data-storage-path]').forEach(function (img) {
      var path = img.getAttribute('data-storage-path'); if (!path) return;
      fetch(window.db.url('/storage/v1/object/sign/myspace/' + path.split('/').map(encodeURIComponent).join('/')), { method: 'POST', headers: { apikey: window.db.key, Authorization: 'Bearer ' + window.db.getToken(), 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 3600 }) }).then(function (response) { return response.ok ? response.json() : null; }).then(function (data) { if (data && data.signedURL) img.src = window.db.url('/storage/v1' + data.signedURL); }).catch(function () {});
    });
  }
  function customersHtml() {
    var rows = state.data.customers.filter(function (item) { return matches((item.name || '') + ' ' + (item.phone || item.phone_raw || '') + ' ' + (item.status || '')); });
    return statusHtml() + '<div class="pw-toolbar"><h2>고객</h2><button class="pw-btn primary" onclick="OSPersonalWorkspace.addCustomer()">+ 고객 등록</button></div><div class="pw-explorer"><table class="pw-table"><thead><tr><th>고객명</th><th>연락처</th><th>상태</th><th>등록일</th></tr></thead><tbody>' + rows.map(function (item) { return '<tr onclick="OSPersonalWorkspace.showCustomer(\'' + esc(item.id) + '\')"><td><b>' + esc(item.name || '(이름 없음)') + '</b></td><td>' + esc(item.phone || item.phone_raw || '') + '</td><td><span class="pw-badge">' + esc(item.status || '미분류') + '</span></td><td>' + formatDate(item.created_at) + '</td></tr>'; }).join('') + '</tbody></table>' + (rows.length ? '' : '<div class="pw-empty">등록된 고객이 없습니다.</div>') + '</div>';
  }
  function consultationsHtml() {
    var names = {}; state.data.customers.forEach(function (item) { names[item.id] = item.name; });
    var rows = state.data.consultations.filter(function (item) { return matches((names[item.customer_id] || '') + ' ' + (item.memo || '') + ' ' + (item.channel || '')); });
    return statusHtml() + '<div class="pw-toolbar"><h2>상담</h2><button class="pw-btn primary" onclick="OSPersonalWorkspace.addConsultation()">+ 상담 기록</button></div><div class="pw-explorer"><table class="pw-table"><thead><tr><th>고객</th><th>상담 내용</th><th>방식</th><th>상담일</th></tr></thead><tbody>' + rows.map(function (item) { return '<tr onclick="OSPersonalWorkspace.showCustomer(\'' + esc(item.customer_id) + '\')"><td><b>' + esc(names[item.customer_id] || '고객') + '</b></td><td>' + esc(item.memo || '') + '</td><td>' + esc(item.channel || '') + '</td><td>' + formatDate(item.consulted_at || item.created_at) + '</td></tr>'; }).join('') + '</tbody></table>' + (rows.length ? '' : '<div class="pw-empty">상담 기록이 없습니다.</div>') + '</div>';
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
    view.innerHTML = '<div class="pw-shell' + (STANDALONE ? ' pw-shell-compact' : '') + '">' + head + '<div class="pw-body">' + navHtml() + '<main class="pw-main" id="pw-main"></main></div></div><dialog class="pw-dialog" id="pw-dialog"><button class="pw-dialog-close" onclick="OSPersonalWorkspace.closeDialog()" aria-label="닫기">×</button><div id="pw-dialog-body"></div></dialog>';
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
    var allowed = ['B', 'STRONG', 'I', 'EM', 'U', 'S', 'H2', 'H3', 'P', 'DIV', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'BR', 'A'];
    Array.prototype.slice.call(doc.body.querySelectorAll('*')).forEach(function (node) {
      if (allowed.indexOf(node.tagName) < 0) { node.replaceWith(doc.createTextNode(node.textContent || '')); return; }
      var href = node.tagName === 'A' ? String(node.getAttribute('href') || '') : '';
      var align = String(node.style && node.style.textAlign || '');
      Array.prototype.slice.call(node.attributes).forEach(function (attr) { node.removeAttribute(attr.name); });
      if (node.tagName === 'A' && /^(https?:|mailto:|tel:)/i.test(href)) { node.setAttribute('href', href); node.setAttribute('target', '_blank'); node.setAttribute('rel', 'noopener'); }
      if (/^(left|center|right)$/.test(align)) node.style.textAlign = align;
    });
    var cleaned = doc.body.innerHTML;
    return doc.body.children.length ? cleaned : cleaned.replace(/\r?\n/g, '<br>');
  }
  function richEditorField(id, html) {
    var buttons = [['bold', '<b>B</b>', '굵게'], ['italic', '<i>I</i>', '기울임'], ['underline', '<u>U</u>', '밑줄'], ['strikeThrough', '<s>S</s>', '취소선'], ['formatBlock', '제목', '제목', 'h2'], ['insertUnorderedList', '• 목록', '글머리 목록'], ['insertOrderedList', '1. 목록', '번호 목록'], ['formatBlock', '인용', '인용문', 'blockquote'], ['justifyLeft', '왼쪽', '왼쪽 정렬'], ['justifyCenter', '가운데', '가운데 정렬'], ['justifyRight', '오른쪽', '오른쪽 정렬'], ['removeFormat', '서식 지우기', '서식 지우기']];
    return '<div class="pw-rich"><div class="pw-rich-toolbar" role="toolbar" aria-label="본문 서식">' + buttons.map(function (button) { return '<button type="button" title="' + button[2] + '" onmousedown="event.preventDefault();OSPersonalWorkspace.richCommand(\'' + button[0] + '\',\'' + (button[3] || '') + '\')">' + button[1] + '</button>'; }).join('') + '</div><div id="' + id + '" class="pw-rich-body" contenteditable="true" data-placeholder="내용을 입력하세요">' + sanitizeRich(html) + '</div></div>';
  }
  function richCommand(command, commandValue) { var editor = document.querySelector('#pw-dialog .pw-rich-body'); if (!editor) return; editor.focus(); document.execCommand(command, false, commandValue || null); }
  function richValue(id) { var editor = document.getElementById(id); return editor ? sanitizeRich(editor.innerHTML) : ''; }
  function richHasText(html) { var doc = new DOMParser().parseFromString(String(html || ''), 'text/html'); return !!String(doc.body.textContent || '').trim(); }
  function workspaceItem(id) { return state.data.items.find(function (entry) { return String(entry.id) === String(id); }); }
  function showAsset(source, id) {
    var list = source === 'scripts' ? state.data.scripts : state.data.library;
    var item = list.find(function (entry) { return String(entry.id) === String(id); }); if (!item) return;
    var body = source === 'scripts' ? item.script_text : item.memo_text || item.description || '';
    var link = item.file_url || item.image_url || item.link_url;
    var actions = (link ? '<a class="pw-btn primary" href="' + esc(link) + '" target="_blank" rel="noopener">파일 열기</a>' : '')
      + '<button type="button" class="pw-btn" onclick="OSPersonalWorkspace.editAsset(\'' + esc(id) + '\')">수정</button>'
      + '<button type="button" class="pw-btn danger" onclick="OSPersonalWorkspace.deleteAsset(\'' + esc(id) + '\')">삭제</button>';
    dialog('<div class="pw-detail"><span class="pw-badge">' + (source === 'scripts' ? '업무노트' : item.memo_text ? '메모' : '자료실') + '</span><h2>' + esc(item.title || '(제목 없음)') + '</h2><small>' + formatDate(item.created_at) + '</small><div class="pw-detail-body pw-rich-content">' + sanitizeRich(body) + '</div><div class="pw-detail-actions">' + actions + '</div></div>');
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
  function update(path, body) { return window.db.fetch('/rest/v1/' + path, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify(body) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return true; }); }
  function updateOne(path, body) { return window.db.fetch('/rest/v1/' + path, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(body) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return response.json(); }).then(function (rows) { if (!Array.isArray(rows) || rows.length !== 1) throw new Error('수정 권한을 확인하지 못했습니다. 다시 로그인한 뒤 시도해 주세요.'); return rows[0]; }); }
  function softDelete(path) { return window.db.fetch('/rest/v1/' + path, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify({ deleted_at: new Date().toISOString() }) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return response.json(); }).then(function (rows) { if (!Array.isArray(rows) || rows.length !== 1) throw new Error('삭제 권한을 확인하지 못했습니다. 다시 로그인한 뒤 시도해 주세요.'); return true; }); }
  function finishSave(message) { closeDialog(); state.query = ''; var input = document.getElementById('pw-search-input'); if (input) input.value = ''; loadData(true); if (typeof window.toast === 'function') window.toast(message); }
  function saveError(error) { alert('저장하지 못했습니다.\n' + (error && error.message ? error.message : error)); }
  function legacy(key) { if (STANDALONE) { window.location.href = '/insu/?view=' + encodeURIComponent(key); return; } if (window.showView) window.showView(key); }
  function addAsset() { var category = currentAssetCategory(), selected = category === 'memo' ? 'memo' : category === 'file' ? 'link' : 'note'; dialog(formShell('자료 추가', formField('종류', '<select id="pwf-asset-type"><option value="note"' + (selected === 'note' ? ' selected' : '') + '>업무노트</option><option value="memo"' + (selected === 'memo' ? ' selected' : '') + '>메모</option><option value="link"' + (selected === 'link' ? ' selected' : '') + '>링크 자료</option></select>') + formField('제목', '<input id="pwf-title" required autocomplete="off">') + formField('내용', richEditorField('pwf-body', '')) + formField('링크 (선택)', '<input id="pwf-link" type="url" placeholder="https://">') + formField('공개 범위', '<select id="pwf-visibility"><option value="private">나만 보기</option><option value="public">로그인 사용자 전체 공개</option></select>'), 'OSPersonalWorkspace.saveAsset()')); }
  function editAsset(id) {
    var item = workspaceItem(id); if (!item || item.item_type === 'folder') return;
    var fileOnly = item.item_type === 'file';
    var fields = formField('제목', '<input id="pwf-edit-title" required autocomplete="off" value="' + esc(item.title || '') + '">');
    if (fileOnly) fields += '<p class="pw-form-note">업로드 파일은 표시 이름을 수정할 수 있습니다.</p>';
    else fields += formField('내용', richEditorField('pwf-edit-body', item.body || ''))
      + formField('링크 (선택)', '<input id="pwf-edit-link" type="url" placeholder="https://" value="' + esc(item.url || '') + '">')
      + formField('공개 범위', '<select id="pwf-edit-visibility"><option value="private"' + (item.visibility !== 'public' ? ' selected' : '') + '>나만 보기</option><option value="public"' + (item.visibility === 'public' ? ' selected' : '') + '>로그인 사용자 전체 공개</option></select>');
    dialog(formShell('자료 수정', fields, 'OSPersonalWorkspace.saveAssetEdit(\'' + esc(id) + '\')'));
  }
  function saveAssetEdit(id) {
    var item = workspaceItem(id), title = value('pwf-edit-title'); if (!item || !title) return;
    var changes = { title: title };
    if (item.item_type !== 'file') {
      var body = richValue('pwf-edit-body'); if (!richHasText(body)) return;
      changes.body = body; changes.url = value('pwf-edit-link') || null; changes.visibility = value('pwf-edit-visibility') === 'public' ? 'public' : 'private';
    }
    updateOne('workspace_items?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()) + '&deleted_at=is.null', changes)
      .then(function () { finishSave('자료를 수정했습니다.'); }).catch(saveError);
  }
  function deleteAsset(id) {
    var item = workspaceItem(id); if (!item || item.item_type === 'folder') return;
    if (!window.confirm('“' + String(item.title || '제목 없음') + '” 자료를 삭제할까요?')) return;
    softDelete('workspace_items?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()) + '&deleted_at=is.null')
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
  function addConsultation(customerId) { if (!state.data.customers.length) { addCustomer(); return; } dialog(formShell('상담 기록', formField('고객', '<select id="pwf-consult-customer" required>' + customerOptions() + '</select>') + formField('상담 방식', '<select id="pwf-consult-channel"><option value="전화">전화</option><option value="대면">대면</option><option value="카카오톡">카카오톡</option><option value="문자">문자</option></select>') + formField('상담 내용', '<textarea id="pwf-consult-memo" rows="8" required></textarea>'), 'OSPersonalWorkspace.saveConsultation()')); var select = document.getElementById('pwf-consult-customer'); if (select && customerId) select.value = customerId; }
  function addEvent(date) { dialog(formShell('일정 추가', formField('날짜', '<input id="pwf-event-date" type="date" required value="' + esc(date || state.selectedDate) + '">') + formField('시간', '<input id="pwf-event-time" type="time">') + formField('제목', '<input id="pwf-event-title" required autocomplete="off">') + formField('설명', '<textarea id="pwf-event-desc" rows="5"></textarea>'), 'OSPersonalWorkspace.saveEvent()')); }
  function value(id) { var element = document.getElementById(id); return element ? String(element.value || '').trim() : ''; }
  function saveAsset() { var type = value('pwf-asset-type'), title = value('pwf-title'), body = richValue('pwf-body'), link = value('pwf-link'), category = type === 'note' ? 'note' : type === 'memo' ? 'memo' : 'file'; if (!title || !richHasText(body)) return; var parent = state.assetFolder && currentAssetCategory() === category ? state.assetFolder : null; write('workspace_items', { owner_id: currentUserId(), parent_id: parent, item_type: category === 'note' ? 'note' : category === 'memo' ? 'memo' : 'link', title: title, body: body, url: link || null, visibility: value('pwf-visibility') === 'public' ? 'public' : 'private', legacy_payload: { workspace_category: category } }).then(function () { state.assetFilter = category; state.assetFolder = parent; finishSave('자료를 저장했습니다.'); }).catch(saveError); }
  function saveCustomer() { var name = value('pwf-customer-name'), phone = value('pwf-customer-phone'), note = value('pwf-customer-note'); if (!name) return; write('workspace_customers', { owner_id: currentUserId(), name: name, phone: phone || null, status: value('pwf-customer-status') || '신규DB', profile: note ? { note: note } : {} }).then(function () { finishSave('고객을 등록했습니다.'); }).catch(saveError); }
  function saveConsultation() { var customerId = value('pwf-consult-customer'), memo = value('pwf-consult-memo'); if (!customerId || !memo) return; write('workspace_consultations', { customer_id: customerId, owner_id: currentUserId(), consulted_at: new Date().toISOString(), channel: value('pwf-consult-channel') || null, content: memo }).then(function () { finishSave('상담 기록을 저장했습니다.'); }).catch(saveError); }
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
  window.addEventListener('load', function () { window.setTimeout(boot, 350); });
  window.OSPersonalWorkspace = {
    boot: boot, go: go, legacy: legacy, reload: function () { loadData(true); },
    filterAssets: function (filter) { state.assetFilter = filter; state.assetFolder = null; renderContent(); },
    setAssetView: function (view) { if (['list', 'thumb', 'large'].indexOf(view) < 0) return; state.assetView = view; localStorage.setItem('ws_asset_view', view); renderContent(); },
    openAssetFolder: function (id) { var folder = state.data.library.find(function (item) { return String(item.id) === String(id) && item.item_type === 'folder'; }); state.assetFolder = id || null; state.assetFilter = folder ? assetCategory(folder) : 'file'; renderContent(); },
    openAssetRoot: function (category) { state.assetFolder = null; state.assetFilter = ['note', 'file', 'memo'].indexOf(category) >= 0 ? category : 'all'; renderContent(); },
    showAsset: showAsset, editAsset: editAsset, saveAssetEdit: saveAssetEdit, deleteAsset: deleteAsset, richCommand: richCommand, showCustomer: showCustomer, showEvent: showEvent,
    closeDialog: closeDialog, addAsset: function () { closeAssetMenu(); addAsset(); }, saveAsset: saveAsset, openVault: openVault, newFolder: newFolder, uploadFiles: uploadFiles, newAssetFolder: newAssetFolder, saveAssetFolder: saveAssetFolder, deleteAssetFolder: deleteAssetFolder, uploadAssetFiles: uploadAssetFiles, confirmAssetFileUpload: confirmAssetFileUpload,
    assetDragStart: assetDragStart, assetDragEnd: assetDragEnd, assetDragOver: assetDragOver, assetDragLeave: assetDragLeave, assetDrop: assetDrop,
    addCustomer: addCustomer, saveCustomer: saveCustomer, addConsultation: addConsultation, saveConsultation: saveConsultation, addEvent: addEvent, saveEvent: saveEvent,
    setCalendarMode: function (mode) { state.calendarMode = mode; renderContent(); setUrl(false); },
    moveCalendar: moveCalendar, calendarToday: function () { state.selectedDate = ymd(new Date()); state.cursor = new Date(); renderContent(); setUrl(false); }, selectDate: selectDate,
    __testLoad: function (data) { if (!isLocal()) return; state.data = data; state.status = 'ready'; state.loadedFor = 'local-test'; renderShell(); }
  };
})();
