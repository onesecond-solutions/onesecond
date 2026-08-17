(function () {
  'use strict';

  var PILOT_ID = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';
  var TEST_EMAIL = 'bylts0428+codex-workstation-20260815@gmail.com';
  var CONSULT_BASE_COLUMNS = [{ key: 'date', label: '등록일자', width: 86 }, { key: 'name', label: '이름', width: 88 }, { key: 'birth', label: '생년월일', width: 92 }, { key: 'genderAge', label: '성별(보험나이)', width: 104 }, { key: 'phone', label: '전화번호', width: 116 }, { key: 'summary', label: '상담내용', width: 360, flex: true }, { key: 'status', label: '상담상태', width: 102 }];
  var STANDALONE = document.documentElement.getAttribute('data-workstation') === 'true';
  var SECTIONS = ['home', 'assets', 'customers', 'consultations', 'calendar', 'trash', 'archive'];
  var LIST_PAGE_SIZE = 200;
  var state = {
    section: 'home', assetFilter: 'all', assetView: localStorage.getItem('ws_asset_view') || 'list', assetFolder: null, consultationStatusFilter: 'all', customerStatusFilter: 'all', query: '', composing: false, searchTimer: 0,
    calendarMode: 'month', selectedDate: ymd(new Date()), selectedConsultation: null, cursor: new Date(),
    assetsRenderLimit: LIST_PAGE_SIZE, customersRenderLimit: LIST_PAGE_SIZE, consultationsRenderLimit: LIST_PAGE_SIZE, signedUrlCache: {},
    status: 'idle', error: '', loadedFor: '', requestId: 0, loadPromise: null, loadFull: false, fullLoaded: false, favorites: [], pendingRichFiles: [], pendingRichImages: [],
    data: { items: [], library: [], scripts: [], events: [], customers: [], consultations: [], trashCustomers: [] }
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
  function consultColumnStorageKey() { return 'ws_consult_columns_' + (currentUserId() || currentUserEmail() || 'local'); }
  function favoriteStorageKey() { return 'ws_favorites_' + (currentUserId() || currentUserEmail() || 'local'); }
  function consultColumns() { try { var saved = JSON.parse(localStorage.getItem(consultColumnStorageKey()) || '[]'); if (Array.isArray(saved) && saved.length) return saved; } catch (_) {} return CONSULT_BASE_COLUMNS.slice(); }
  function isConsultColumnSetting(item) { var payload = item && item.legacy_payload || {}; return item && item.item_type === 'memo' && payload.setting_key === 'consultation_columns'; }
  function isFavoriteSetting(item) { var payload = item && item.legacy_payload || {}; return item && item.item_type === 'memo' && payload.setting_key === 'favorites'; }
  function isWorkspaceSetting(item) { var payload = item && item.legacy_payload || {}; return item && item.item_type === 'memo' && payload.workspace_category === 'settings'; }
  function isConsultAttachmentItem(item) { var payload = item && item.legacy_payload || {}; return payload.workspace_category === 'consultation'; }
  function saveConsultColumns(columns) { var serialized = JSON.stringify(columns); localStorage.setItem(consultColumnStorageKey(), serialized); if (!authenticated()) return; var existing = state.data.items.find(isConsultColumnSetting), body = { owner_id: currentUserId(), item_type: 'memo', title: 'consultation_columns', body: serialized, visibility: 'private', legacy_payload: { workspace_category: 'settings', setting_key: 'consultation_columns' } }; var request = existing ? updateOne('workspace_items?id=eq.' + encodeURIComponent(existing.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), body) : writeOne('workspace_items', body); request.then(function (saved) { if (!existing && saved) state.data.items.push(saved); }).catch(function (error) { console.warn('Consultation column preference save failed', error); if (typeof window.toast === 'function') window.toast('컬럼 설정은 이 브라우저에 저장했습니다. 서버 동기화는 잠시 후 다시 시도해 주세요.'); }); }
  function normalizeFavorites(value) {
    var rows = Array.isArray(value) ? value : [];
    return rows.filter(function (entry) { return entry && entry.target_type && entry.target_id; }).map(function (entry, index) {
      return { target_type: String(entry.target_type), target_id: String(entry.target_id), title: String(entry.title || entry.title_snapshot || ''), subtitle: String(entry.subtitle || entry.subtitle_snapshot || ''), sort_order: Number(entry.sort_order) || index, created_at: entry.created_at || new Date().toISOString() };
    }).sort(function (a, b) { return a.sort_order - b.sort_order || String(b.created_at).localeCompare(String(a.created_at)); });
  }
  function readFavoritesFromStorage() {
    try { state.favorites = normalizeFavorites(JSON.parse(localStorage.getItem(favoriteStorageKey()) || '[]')); }
    catch (_) { state.favorites = []; }
  }
  function applyFavoriteSetting(items) {
    var setting = (items || []).find(isFavoriteSetting);
    if (!setting || !setting.body) { readFavoritesFromStorage(); return; }
    try { state.favorites = normalizeFavorites(JSON.parse(setting.body)); localStorage.setItem(favoriteStorageKey(), JSON.stringify(state.favorites)); }
    catch (_) { readFavoritesFromStorage(); }
  }
  function saveFavorites() {
    var serialized = JSON.stringify(state.favorites);
    localStorage.setItem(favoriteStorageKey(), serialized);
    if (!authenticated()) return;
    var existing = state.data.items.find(isFavoriteSetting);
    var body = { owner_id: currentUserId(), item_type: 'memo', title: 'favorites', body: serialized, visibility: 'private', legacy_payload: { workspace_category: 'settings', setting_key: 'favorites' } };
    var request = existing ? updateOne('workspace_items?id=eq.' + encodeURIComponent(existing.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), body) : writeOne('workspace_items', body);
    request.then(function (saved) { if (!existing && saved) state.data.items.push(saved); }).catch(function (error) { console.warn('Favorite save failed', error); if (typeof window.toast === 'function') window.toast('즐겨찾기는 이 브라우저에 저장했습니다. 서버 동기화는 잠시 후 다시 시도해 주세요.'); });
  }
  function consultGridTemplate(columns) { return columns.map(function (column) { return column.flex ? 'minmax(150px,1fr)' : 'minmax(0,' + Math.max(64, Number(column.width) || 96) + 'px)'; }).join(' '); }
  function consultCustomValue(profile, key) { return String((profile.custom_fields && profile.custom_fields[key]) || ''); }
  function consultCell(column, item, customer, profile, date, age, status) { var values = { date: date, name: customer.name || '(이름 없음)', birth: profile.birth_date || '', genderAge: (profile.gender || '-') + (age === '' ? '' : ' (' + age + '세)'), phone: phoneText(customer.phone || customer.phone_raw || ''), summary: stripHtml(item.memo || ''), status: status }; var value = Object.prototype.hasOwnProperty.call(values, column.key) ? values[column.key] : consultCustomValue(profile, column.key); if (column.key === 'name') return '<strong>' + esc(value) + '</strong>'; return '<span class="pw-consult-cell pw-consult-' + esc(column.key) + '">' + esc(value) + '</span>'; }
  function personalItemScope() {
    // workspace_items.owner_id is the canonical account boundary (already applied
    // by the caller's owner_id=eq.<계정> filter). On top of that, every legacy
    // source (library/scripts/myspace_folders/myspace_files) must also be
    // personal-scope — team/branch/global bulk server material (including
    // admin-registered library/scripts entries) stays outside the workspace.
    // Missing scope (legacy rows with no scope value) counts as personal too,
    // matching the migration's own coalesce(scope,'personal') convention.
    return "&or=(legacy_source.is.null,and(legacy_source.in.(library,scripts,myspace_folders,myspace_files),or(legacy_payload->>scope.is.null,legacy_payload->>scope.eq.personal)))";
  }
  function isLocal() { return location.hostname === '127.0.0.1' || location.hostname === 'localhost'; }
  function allowed() { return isLocal() || currentUserId() === PILOT_ID || currentUserEmail() === TEST_EMAIL; }
  function authenticated() { return !!(window.db && window.db.fetch && window.db.getToken && window.db.getToken() && currentUserId()); }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]; }); }
  function jsString(value) { return String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' '); }
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
  function insuranceAge(birth, basis) { var text = String(birth || ''), parts = text.split('-').map(Number), born = parseDate(text), at = parseDate(basis || ymd(new Date())); if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || parts.length !== 3 || born.getFullYear() !== parts[0] || born.getMonth() !== parts[1] - 1 || born.getDate() !== parts[2] || isNaN(at.getTime()) || born > at) return ''; var age = at.getFullYear() - born.getFullYear(); var birthday = new Date(at.getFullYear(), born.getMonth(), born.getDate()); if (at < birthday) { age -= 1; birthday.setFullYear(at.getFullYear() - 1); } var next = new Date(birthday); next.setFullYear(birthday.getFullYear() + 1); if ((at - birthday) >= (next - birthday) / 2) age += 1; return Math.max(0, age); }
  function weekday(value) { return ['일', '월', '화', '수', '목', '금', '토'][parseDate(value).getDay()]; }
  function api(path) {
    return window.db.fetch('/rest/v1/' + path).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    });
  }
  function rebuildWorkspaceDerived() {
    var columnSetting = state.data.items.find(isConsultColumnSetting); if (columnSetting && columnSetting.body) localStorage.setItem(consultColumnStorageKey(), columnSetting.body);
    applyFavoriteSetting(state.data.items);
    state.data.scripts = state.data.items.filter(function (item) { return item.item_type === 'note' && !isConsultAttachmentItem(item); }).map(function (item) { return Object.assign({}, item, { script_text: item.body }); });
    state.data.library = state.data.items.filter(function (item) { return item.item_type !== 'note' && !isWorkspaceSetting(item) && !isConsultAttachmentItem(item); }).map(function (item) { return Object.assign({}, item, { memo_text: item.item_type === 'memo' ? item.body : null, description: item.body, link_url: item.url, file_url: item.item_type === 'file' ? item.storage_path : null }); });
    state.data.events = state.data.events.map(function (item) { return Object.assign({}, item, { event_date: item.task_date, event_time: item.task_time }); });
    state.data.consultations = state.data.consultations.map(function (item) { return Object.assign({}, item, { memo: item.content }); });
  }
  function upsertWorkspaceItem(item) {
    if (!item || !item.id) return;
    state.data.items = [item].concat(state.data.items.filter(function (entry) { return String(entry.id) !== String(item.id); }));
    rebuildWorkspaceDerived();
  }
  function removeWorkspaceItemsLocal(ids) {
    var idSet = {}; (ids || []).forEach(function (id) { idSet[String(id)] = true; });
    if (!Object.keys(idSet).length) return;
    state.data.items = state.data.items.filter(function (entry) { return !idSet[String(entry.id)]; });
    rebuildWorkspaceDerived();
  }
  function upsertCustomer(customer) {
    if (!customer || !customer.id) return;
    state.data.customers = [customer].concat(state.data.customers.filter(function (entry) { return String(entry.id) !== String(customer.id); }));
  }
  function moveCustomerToTrashLocal(id) {
    var index = state.data.customers.findIndex(function (entry) { return String(entry.id) === String(id); });
    if (index < 0) return;
    var removed = state.data.customers.splice(index, 1)[0];
    removed = Object.assign({}, removed, { deleted_at: new Date().toISOString() });
    state.data.trashCustomers = [removed].concat(state.data.trashCustomers || []);
  }
  function restoreCustomerFromTrashLocal(customer) {
    if (!customer || !customer.id) return;
    state.data.trashCustomers = (state.data.trashCustomers || []).filter(function (entry) { return String(entry.id) !== String(customer.id); });
    upsertCustomer(customer);
  }
  function upsertConsultation(consultation) {
    if (!consultation || !consultation.id) return;
    state.data.consultations = [consultation].concat(state.data.consultations.filter(function (entry) { return String(entry.id) !== String(consultation.id); }));
  }
  function upsertTask(task) {
    if (!task || !task.id) return;
    state.data.events = [task].concat(state.data.events.filter(function (entry) { return String(entry.id) !== String(task.id); }));
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
    var full = !!force;
    if (state.loadPromise && (!full || state.loadFull)) return state.loadPromise;
    if (!force && state.fullLoaded && state.loadedFor === userId) return Promise.resolve(true);
    if (!force && state.status === 'ready' && state.loadedFor === userId) return Promise.resolve(true);
    var hasVisibleData = !!(state.data.items.length || state.data.events.length || state.data.customers.length || state.data.consultations.length);
    state.status = hasVisibleData ? 'refreshing' : 'loading'; state.error = ''; renderContent();
    var requestId = ++state.requestId;
    var id = encodeURIComponent(userId);
    var itemScope = personalItemScope();
    state.loadFull = full;
    var today = ymd(new Date());
    var itemSelect = 'id,owner_id,parent_id,item_type,title,body,url,storage_path,mime_type,extension,file_size,visibility,legacy_payload,created_at,updated_at,deleted_at';
    var requests = full ? [
      api('workspace_items?owner_id=eq.' + id + '&deleted_at=is.null' + itemScope + '&order=created_at.desc&limit=2000&select=' + itemSelect),
      api('workspace_tasks?owner_id=eq.' + id + '&deleted_at=is.null&order=task_date.desc&limit=2000&select=id,owner_id,title,description,task_date,task_time,created_at,deleted_at'),
      api('workspace_customers?owner_id=eq.' + id + '&deleted_at=is.null&order=created_at.desc&limit=2000&select=id,owner_id,name,phone,status,profile,created_at,updated_at,deleted_at'),
      api('workspace_consultations?owner_id=eq.' + id + '&order=consulted_at.desc&limit=2000&select=id,owner_id,customer_id,content,channel,consulted_at,created_at,updated_at'),
      api('workspace_customers?owner_id=eq.' + id + '&deleted_at=not.is.null&order=deleted_at.desc&limit=2000&select=id,owner_id,name,phone,status,profile,created_at,updated_at,deleted_at')
    ] : [
      api('workspace_items?owner_id=eq.' + id + '&deleted_at=is.null' + itemScope + '&order=created_at.desc&limit=6&select=' + itemSelect),
      api('workspace_tasks?owner_id=eq.' + id + '&deleted_at=is.null&task_date=eq.' + today + '&order=task_time.asc&limit=20&select=id,owner_id,title,description,task_date,task_time,created_at,deleted_at'),
      api('workspace_items?owner_id=eq.' + id + '&deleted_at=is.null&legacy_payload->>setting_key=eq.favorites&limit=1&select=' + itemSelect)
    ];
    state.loadPromise = Promise.allSettled(requests).then(function (results) {
      if (requestId !== state.requestId) return false;
      var names = full ? ['items', 'events', 'customers', 'consultations', 'trashCustomers'] : ['items', 'events', 'favoriteSettings'];
      var failed = [];
      results.forEach(function (result, index) {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          if (names[index] === 'favoriteSettings') state.data.items = state.data.items.concat(result.value.filter(function (setting) { return !state.data.items.some(function (item) { return String(item.id) === String(setting.id); }); }));
          else state.data[names[index]] = result.value;
        }
        else failed.push(names[index]);
      });
      rebuildWorkspaceDerived();
      state.loadedFor = userId;
      state.fullLoaded = full;
      state.status = failed.length ? 'partial' : 'ready';
      state.error = failed.length ? failed.join(', ') + ' 자료를 불러오지 못했습니다.' : '';
      renderContent();
      return failed.length === 0;
    }).finally(function () { if (requestId === state.requestId) { state.loadPromise = null; state.loadFull = false; } });
    return state.loadPromise;
  }

  function navHtml() {
    var items = [['home', '⌂', '홈'], ['assets', '▤', '자료'], ['customers', '♙', '고객관리'], ['consultations', '✎', '상담관리'], ['calendar', '▦', '캘린더']];
    return '<nav class="pw-nav" aria-label="내 업무 메뉴">' + items.map(function (item) {
      return '<button type="button" class="' + (state.section === item[0] ? 'on' : '') + '" onclick="OSPersonalWorkspace.go(\'' + item[0] + '\')"><span>' + item[1] + '</span>' + item[2] + '</button>';
    }).join('') + '<div class="pw-nav-planned" aria-label="준비 중인 메뉴"><button type="button" disabled><span>◫</span>소식지</button><button type="button" disabled><span>↗</span>영업방향</button><button type="button" disabled><span>≡</span>상품라인업</button></div><div class="pw-nav-bottom"><button type="button" class="trash ' + (state.section === 'trash' ? 'on' : '') + '" onclick="OSPersonalWorkspace.go(\'trash\')"><span>♲</span>휴지통</button><button type="button" class="archive ' + (state.section === 'archive' ? 'on' : '') + '" onclick="OSPersonalWorkspace.go(\'archive\')">구)원세컨드</button></div></nav>';
  }
  function statusHtml() {
    if (state.status === 'waiting-auth') return '<div class="pw-state"><strong>로그인 정보를 확인하고 있습니다.</strong><span>인증이 완료되면 자료를 자동으로 불러옵니다.</span></div>';
    if (state.status === 'loading' || state.status === 'idle') return '<div class="pw-state"><strong>내 자료를 불러오는 중입니다.</strong><span>잠시만 기다려 주세요.</span></div>';
    if (state.status === 'refreshing') return '<div class="pw-sync-note">최신 자료를 동기화하고 있습니다.</div>';
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
  function favoriteKey(type, id) { return String(type) + ':' + String(id); }
  function isFavorited(type, id) { var key = favoriteKey(type, id); return state.favorites.some(function (entry) { return favoriteKey(entry.target_type, entry.target_id) === key; }); }
  function favoriteButton(type, id, title, subtitle) {
    var on = isFavorited(type, id), label = on ? '즐겨찾기 해제' : '즐겨찾기 추가';
    var action = "event.stopPropagation();OSPersonalWorkspace.toggleFavorite('" + esc(jsString(type)) + "','" + esc(jsString(id)) + "','" + esc(jsString(title || '')) + "','" + esc(jsString(subtitle || '')) + "')";
    return '<span role="button" tabindex="0" class="pw-fav' + (on ? ' on' : '') + '" aria-label="' + label + '" title="' + label + '" onclick="' + action + '" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){' + action + ';event.preventDefault();}">' + (on ? '★' : '☆') + '</span>';
  }
  function favoriteKind(type) { return type === 'customer' ? '고객' : type === 'consultation' ? '상담' : type === 'event' ? '일정' : '자료'; }
  function favoriteSubtitle(entry) { return entry.subtitle || favoriteKind(entry.target_type); }
  function favoriteRows() {
    var rows = state.favorites.slice(0, 8);
    return rows.length ? rows.map(function (entry) {
      return row(entry.title || '(제목 없음)', favoriteSubtitle(entry), '›', 'OSPersonalWorkspace.openFavorite(\'' + esc(entry.target_type) + '\',\'' + esc(entry.target_id) + '\')');
    }).join('') : '<div class="pw-empty"><strong>즐겨찾기가 없습니다.</strong><span>자료, 고객, 상담 옆 별표를 눌러 고정하세요.</span></div>';
  }
  function resolveFavorite(type, id) {
    if (type === 'asset') {
      var script = state.data.scripts.find(function (entry) { return String(entry.id) === String(id); });
      if (script) return { action: function () { showAsset('scripts', id); } };
      var asset = state.data.library.find(function (entry) { return String(entry.id) === String(id); });
      if (asset) return { action: function () { showAsset('library', id); } };
    }
    if (type === 'customer' && state.data.customers.some(function (entry) { return String(entry.id) === String(id); })) return { action: function () { showCustomer(id); } };
    if (type === 'consultation' && state.data.consultations.some(function (entry) { return String(entry.id) === String(id); })) return { action: function () { state.section = 'consultations'; state.selectedConsultation = id; renderContent(); setUrl(false); } };
    if (type === 'event' && allEvents().some(function (entry) { return String(entry.id) === String(id); })) return { action: function () { showEvent(id); } };
    return null;
  }
  function openFavorite(type, id) {
    var resolved = resolveFavorite(type, id);
    if (resolved) { resolved.action(); return; }
    loadData(true).then(function () { var next = resolveFavorite(type, id); if (next) next.action(); else if (typeof window.toast === 'function') window.toast('즐겨찾기 대상을 찾지 못했습니다.'); });
  }
  function toggleFavorite(type, id, title, subtitle) {
    var key = favoriteKey(type, id), index = state.favorites.findIndex(function (entry) { return favoriteKey(entry.target_type, entry.target_id) === key; });
    if (index >= 0) state.favorites.splice(index, 1);
    else state.favorites.unshift({ target_type: type, target_id: String(id), title: title || '(제목 없음)', subtitle: subtitle || favoriteKind(type), sort_order: 0, created_at: new Date().toISOString() });
    state.favorites = state.favorites.map(function (entry, order) { return Object.assign({}, entry, { sort_order: order }); });
    saveFavorites(); renderContent();
    if (typeof window.toast === 'function') window.toast(index >= 0 ? '즐겨찾기에서 제거했습니다.' : '즐겨찾기에 추가했습니다.');
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
  var LUNAR_HOLIDAYS = [[2020, '2020-01-25', '2020-04-30', '2020-10-01'], [2021, '2021-02-12', '2021-05-19', '2021-09-21'], [2022, '2022-02-01', '2022-05-08', '2022-09-10'], [2023, '2023-01-22', '2023-05-26', '2023-09-29'], [2024, '2024-02-10', '2024-05-15', '2024-09-17'], [2025, '2025-01-29', '2025-05-05', '2025-10-06'], [2026, '2026-02-17', '2026-05-24', '2026-09-25'], [2027, '2027-02-06', '2027-05-13', '2027-09-15'], [2028, '2028-01-26', '2028-05-02', '2028-10-03'], [2029, '2029-02-13', '2029-05-20', '2029-09-22'], [2030, '2030-02-03', '2030-05-09', '2030-09-12'], [2031, '2031-01-23', '2031-05-28', '2031-10-01'], [2032, '2032-02-11', '2032-05-16', '2032-09-19'], [2033, '2033-01-31', '2033-05-06', '2033-09-08'], [2034, '2034-02-19', '2034-05-25', '2034-09-27'], [2035, '2035-02-08', '2035-05-15', '2035-09-16']];
  var SOLAR_TERM_NAMES = ['소한', '대한', '입춘', '우수', '경칩', '춘분', '청명', '곡우', '입하', '소만', '망종', '하지', '소서', '대서', '입추', '처서', '백로', '추분', '한로', '상강', '입동', '소설', '대설', '동지'];
  var SOLAR_TERM_MINUTES = [0, 21208, 42467, 63836, 85337, 107014, 128867, 150921, 173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033, 353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758];
  var builtinCache = {};
  function builtinEvent(date, title, kind, description) { return { id: 'builtin-' + date + '-' + title, event_date: date, title: title, event_type: kind, description: description || '', builtin: true }; }
  function utcKey(date) { return date.getUTCFullYear() + '-' + String(date.getUTCMonth() + 1).padStart(2, '0') + '-' + String(date.getUTCDate()).padStart(2, '0'); }
  function solarTermsForYear(year) {
    return SOLAR_TERM_NAMES.map(function (name, index) {
      var instant = new Date(Date.UTC(1900, 0, 6, 2, 5) + 31556925974.7 * (year - 1900) + SOLAR_TERM_MINUTES[index] * 60000);
      return builtinEvent(utcKey(instant), name, 'term', '대한민국 24절기');
    });
  }
  function weekdayNumber(date) { return parseDate(date).getDay(); }
  function nextSubstituteDate(date, occupied) {
    var next = date;
    do { next = addDays(next, 1); } while (weekdayNumber(next) === 0 || weekdayNumber(next) === 6 || occupied[next]);
    return next;
  }
  function builtinCalendarEvents(year) {
    if (builtinCache[year]) return builtinCache[year].slice();
    var list = [], substitutes = [], occupied = {};
    [[1, 1, '신정', true, false], [3, 1, '삼일절', true, true], [5, 5, '어린이날', true, true], [6, 6, '현충일', true, false], [7, 17, '제헌절', false, false], [8, 15, '광복절', true, true], [10, 3, '개천절', true, true], [10, 9, '한글날', true, true], [12, 25, '크리스마스', true, true]].forEach(function (entry) {
      var date = year + '-' + String(entry[0]).padStart(2, '0') + '-' + String(entry[1]).padStart(2, '0');
      list.push(builtinEvent(date, entry[2], entry[3] ? 'holiday' : 'memorial', entry[3] ? '대한민국 법정 공휴일' : '대한민국 국가기념일'));
      if (entry[3]) occupied[date] = true;
      if (entry[3] && entry[4]) substitutes.push({ title: entry[2], dates: [date], trigger: 'weekend' });
    });
    (LUNAR_HOLIDAYS.find(function (row) { return row[0] === year; }) || []).slice(1).forEach(function (date, index) {
      var title = index === 0 ? '설날' : index === 1 ? '부처님오신날' : '추석', offsets = index === 1 ? [0] : [-1, 0, 1], dates = offsets.map(function (offset) { return addDays(date, offset); });
      dates.forEach(function (target, offsetIndex) { var suffix = offsets[offsetIndex] === 0 ? '' : ' 연휴'; list.push(builtinEvent(target, title + suffix, 'holiday', title + ' 음력 공휴일')); occupied[target] = true; });
      substitutes.push({ title: title, dates: dates, trigger: index === 1 ? 'weekend' : 'sunday' });
    });
    substitutes.forEach(function (target) {
      var needs = target.dates.some(function (date) { var day = weekdayNumber(date); return target.trigger === 'weekend' ? day === 0 || day === 6 : day === 0; });
      if (!needs) return;
      var substitute = nextSubstituteDate(target.dates[target.dates.length - 1], occupied);
      occupied[substitute] = true;
      list.push(builtinEvent(substitute, target.title + ' 대체공휴일', 'holiday', target.title + ' 대체공휴일'));
    });
    list = list.concat(solarTermsForYear(year)).sort(function (a, b) { return String(a.event_date).localeCompare(String(b.event_date)) || (a.event_type === 'holiday' ? -1 : 1) || String(a.title).localeCompare(String(b.title), 'ko'); });
    builtinCache[year] = list;
    return list.slice();
  }
  function builtInEventsAroundCalendar() {
    var years = {}, selected = parseDate(state.selectedDate), cursor = state.cursor || selected;
    [selected.getFullYear() - 1, selected.getFullYear(), selected.getFullYear() + 1, cursor.getFullYear() - 1, cursor.getFullYear(), cursor.getFullYear() + 1].forEach(function (year) { years[year] = true; });
    return Object.keys(years).reduce(function (rows, year) { return rows.concat(builtinCalendarEvents(Number(year))); }, []);
  }
  function allEvents() { return state.data.events.concat(careEvents()).concat(builtInEventsAroundCalendar()); }

  function homeHtml() {
    var today = ymd(new Date());
    var todayEvents = allEvents().filter(function (event) { return String(event.event_date || '').slice(0, 10) === today; });
    var recent = state.data.scripts.map(function (item) { return { kind: '업무노트', item: item }; })
      .concat(state.data.library.map(function (item) { return { kind: item.memo_text ? '메모' : '자료실', item: item }; }))
      .sort(function (a, b) { return String(b.item.created_at).localeCompare(String(a.item.created_at)); }).slice(0, 6);
    var customersById = {}; state.data.customers.forEach(function (customer) { customersById[customer.id] = customer; });
    var recentConsultations = state.data.consultations.slice()
      .sort(function (a, b) { return String(b.consulted_at || b.created_at).localeCompare(String(a.consulted_at || a.created_at)); }).slice(0, 6);
    var favoritesPanel = '<section class="pw-panel pw-favorites-panel"><div class="pw-panel-head"><strong>즐겨찾기</strong></div><div class="pw-list">' + favoriteRows() + '</div></section>';
    var todayPanel = '<section class="pw-panel"><div class="pw-panel-head"><strong>오늘 일정</strong><button onclick="OSPersonalWorkspace.go(\'calendar\')">전체 보기</button></div><div class="pw-list">' + (todayEvents.length ? todayEvents.slice(0, 6).map(function (event) { return row(event.title, event.description || '일정', esc(String(event.event_time || '').slice(0, 5)), 'OSPersonalWorkspace.showEvent(\'' + esc(event.id) + '\')'); }).join('') : '<div class="pw-empty">오늘 일정이 없습니다.</div>') + '</div></section>';
    var assetsPanel = '<section class="pw-panel"><div class="pw-panel-head"><strong>최근 자료</strong><button onclick="OSPersonalWorkspace.go(\'assets\')">전체 보기</button></div><div class="pw-list">' + (recent.length ? recent.map(function (entry) { return row(entry.item.title, entry.kind + ' · ' + formatDate(entry.item.created_at), '›', 'OSPersonalWorkspace.showAsset(\'' + (entry.kind === '업무노트' ? 'scripts' : 'library') + '\',\'' + esc(entry.item.id) + '\')'); }).join('') : '<div class="pw-empty">저장된 자료가 없습니다.</div>') + '</div></section>';
    var consultPanel = '<section class="pw-panel"><div class="pw-panel-head"><strong>최근 상담</strong><button onclick="OSPersonalWorkspace.go(\'consultations\')">전체 보기</button></div><div class="pw-list">' + (recentConsultations.length ? recentConsultations.map(function (item) { var customer = customersById[item.customer_id]; return row(customer ? customer.name || '(이름 없음)' : '(고객 없음)', stripHtml(item.memo || '') || '상담내용이 없습니다.', esc(formatDate(item.consulted_at || item.created_at)), "OSPersonalWorkspace.go('consultations');OSPersonalWorkspace.selectConsultation('" + esc(item.id) + "')"); }).join('') : '<div class="pw-empty">상담 기록이 없습니다.</div>') + '</div></section>';
    return statusHtml() + '<div class="pw-home-grid"><div class="pw-home-row pw-home-row-top">' + favoritesPanel + todayPanel + '</div><div class="pw-home-row pw-home-row-bottom">' + assetsPanel + consultPanel + '</div></div>';
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
  function loadMoreHtml(totalCount, visibleCount, action) {
    if (totalCount <= visibleCount) return '';
    return '<div class="pw-load-more"><button type="button" class="pw-btn" onclick="' + action + '">더 보기 (' + visibleCount + ' / ' + totalCount + ')</button></div>';
  }

  function assetsHtml() {
    var items = [];
    state.data.scripts.forEach(function (item) { items.push({ source: 'scripts', type: 'note', kind: '업무노트', title: item.title, body: stripHtml(item.script_text), created: item.created_at, raw: item }); });
    state.data.library.forEach(function (item) { var memo = item.item_type === 'memo', folder = item.item_type === 'folder', file = item.item_type === 'file', category = assetCategory(item); items.push({ source: 'library', type: category, folder: folder, kind: folder ? '폴더' : file ? '파일' : memo ? '메모' : item.item_type === 'link' ? '링크' : item.item_type === 'note' ? '업무노트' : '자료', title: item.title, body: item.body || item.url || item.storage_path || '', created: item.created_at, raw: item }); });
    items = items.filter(function (item) {
      if (state.assetFilter !== 'all' && item.type !== state.assetFilter) return false;
      if (String(item.raw.parent_id || '') !== String(state.assetFolder || '')) return false;
      return matches(item.title + ' ' + item.body + ' ' + item.kind);
    }).sort(function (a, b) { return Number(!!b.folder) - Number(!!a.folder); });
    var totalItemCount = items.length;
    items = items.slice(0, state.assetsRenderLimit);
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
      ? '<div class="pw-explorer"><table class="pw-table"><thead><tr><th>이름</th><th>종류</th><th>현재 분류</th><th>등록일</th></tr></thead><tbody>' + items.map(function (item) { return '<tr tabindex="0" class="' + (item.folder ? 'pw-folder-drop-target' : 'pw-asset-draggable') + '" ' + assetDragAttributes(item) + ' onclick="' + assetOpenAction(item) + '"><td><span class="pw-title-with-fav">' + (item.folder ? '' : favoriteButton('asset', item.raw.id, item.title || '(제목 없음)', item.kind + ' · ' + formatDate(item.created))) + '<b>' + (item.folder ? '📁 ' : '') + esc(item.title || '(제목 없음)') + '</b></span></td><td>' + item.kind + '</td><td>' + scopeBadge(item.raw) + '</td><td>' + formatDate(item.created) + '</td></tr>'; }).join('') + '</tbody></table>' + (items.length ? '' : '<div class="pw-empty">조건에 맞는 자료가 없습니다.</div>') + '</div>'
      : '<div class="pw-assets-grid ' + (state.assetView === 'large' ? 'large' : '') + '">' + items.map(assetCardHtml).join('') + (items.length ? '' : '<div class="pw-empty">조건에 맞는 자료가 없습니다.</div>') + '</div>';
    return statusHtml() + controls + breadcrumb + content + loadMoreHtml(totalItemCount, items.length, 'OSPersonalWorkspace.loadMoreAssets()');
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
    return '<button type="button" class="pw-asset-card ' + (item.folder ? 'pw-folder-drop-target' : 'pw-asset-draggable') + '" ' + assetDragAttributes(item) + ' onclick="' + assetOpenAction(item) + '">' + (item.folder ? '' : favoriteButton('asset', raw.id, item.title || '(제목 없음)', item.kind + ' · ' + formatDate(item.created))) + '<span class="pw-asset-preview">' + preview + '</span><b>' + esc(item.title || '(제목 없음)') + '</b><small>' + esc(item.kind) + ' · ' + formatDate(item.created) + '</small></button>';
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
      signStoragePath(path).then(function (url) { img.src = url; }).catch(function () {});
    });
  }
  function customersHtml() {
    var columns = [{ key: 'date', label: '청약일자', width: 86 }, { key: 'name', label: '이름', width: 88 }, { key: 'birth', label: '생년월일', width: 92 }, { key: 'genderAge', label: '성별(보험나이)', width: 104 }, { key: 'phone', label: '전화번호', width: 116 }, { key: 'summary', label: '고객내용', width: 360, flex: true }, { key: 'status', label: '고객상태', width: 102 }];
    var statuses = ['신규DB', '상담중', '청약완료', '유지', '변경', '보험금청구', '보류', '종결'], gridStyle = '--pw-consult-template:' + consultGridTemplate(columns);
    var latest = {}; state.data.consultations.forEach(function (entry) { var old = latest[entry.customer_id]; if (!old || String(entry.consulted_at || entry.created_at || '') > String(old.consulted_at || old.created_at || '')) latest[entry.customer_id] = entry; });
    var rows = state.data.customers.filter(function (item) { var profile = customerProfile(item); if (profile.customer_managed !== true && String(item.name || '').trim() !== '정나겸') return false; var note = profile.note || '', status = item.status || '신규'; return (state.customerStatusFilter === 'all' || status === state.customerStatusFilter) && matches((item.name || '') + ' ' + (item.phone || item.phone_raw || '') + ' ' + (profile.birth_date || '') + ' ' + note + ' ' + status); });
    var totalRowCount = rows.length;
    rows = rows.slice(0, state.customersRenderLimit);
    var header = '<div class="pw-consult-columns" style="' + gridStyle + '">' + columns.map(function (column) { if (column.key !== 'status') return '<span>' + column.label + '</span>'; return '<label class="pw-consult-status-filter"><span class="sr-only">고객상태별 보기</span><select aria-label="고객상태별 보기" onchange="OSPersonalWorkspace.filterCustomerStatus(this.value)"><option value="all">고객상태 전체</option>' + statuses.map(function (entry) { return '<option value="' + entry + '"' + (state.customerStatusFilter === entry ? ' selected' : '') + '>' + entry + '</option>'; }).join('') + '</select></label>'; }).join('') + '<span class="pw-consult-action-spacer" aria-hidden="true"></span></div>';
    var body = rows.map(function (item) { var profile = customerProfile(item), date = String(profile.contract_date || item.created_at || '').slice(0, 10), age = insuranceAge(profile.birth_date, date || ymd(new Date())), note = profile.note || (latest[item.id] && latest[item.id].memo) || '', status = item.status || '신규'; var values = { date: date, name: item.name || '(이름 없음)', birth: profile.birth_date || '', genderAge: (profile.gender || '-') + (age === '' ? '' : ' (' + age + '세)'), phone: phoneText(item.phone || item.phone_raw || ''), summary: stripHtml(note), status: status }; return '<button type="button" role="listitem" class="pw-consult-row" style="' + gridStyle + '" onclick="OSPersonalWorkspace.showCustomer(\'' + esc(item.id) + '\')">' + columns.map(function (column) { if (column.key === 'name') return '<strong>' + favoriteButton('customer', item.id, values.name, (values.phone || status)) + '<span>' + esc(values[column.key]) + '</span></strong>'; return '<span class="pw-consult-cell pw-consult-' + esc(column.key) + '">' + esc(values[column.key]) + '</span>'; }).join('') + '<span class="pw-consult-action-spacer" aria-hidden="true"></span><span class="pw-consult-hover">' + esc(stripHtml(note || '고객내용이 없습니다.')) + '</span></button>'; }).join('');
    return '<div class="pw-consult-screen">' + statusHtml() + '<div class="pw-toolbar"><h2>고객관리</h2><button class="pw-btn primary" onclick="OSPersonalWorkspace.addCustomer()">+ 고객 등록</button></div><div class="pw-consult-layout"><section class="pw-consult-master"><div class="pw-consult-list" role="list">' + header + '<div class="pw-consult-rows">' + body + (rows.length ? '' : '<div class="pw-empty">등록된 고객이 없습니다.</div>') + '</div>' + loadMoreHtml(totalRowCount, rows.length, 'OSPersonalWorkspace.loadMoreCustomers()') + '</div></section></div></div>';
  }
  function consultationsHtml() {
    var customers = {}; state.data.customers.forEach(function (item) { customers[item.id] = item; });
    var statuses = ['예약', '진행중', '제안서발송', '클로징', '청약완료', '보류', '종결'];
    var configuredColumns = consultColumns(), gridStyle = '--pw-consult-template:' + consultGridTemplate(configuredColumns);
    var rows = state.data.consultations.filter(function (item) { var customer = customers[item.customer_id]; if (!customer) return false; var profile = customerProfile(customer), status = consultationStatus(item, customer); return (state.consultationStatusFilter === 'all' || status === state.consultationStatusFilter) && matches((customer.name || '') + ' ' + (customer.phone || customer.phone_raw || '') + ' ' + (profile.birth_date || '') + ' ' + (item.memo || '') + ' ' + status); });
    var selected = rows.find(function (item) { return String(item.id) === String(state.selectedConsultation); });
    if (!selected && state.selectedConsultation) state.selectedConsultation = null;
    var totalRowCount = rows.length;
    if (selected && rows.indexOf(selected) >= state.consultationsRenderLimit) rows = [selected].concat(rows.filter(function (item) { return item !== selected; }).slice(0, state.consultationsRenderLimit - 1));
    else rows = rows.slice(0, state.consultationsRenderLimit);
    var columns = '<div class="pw-consult-columns" style="' + gridStyle + '">' + configuredColumns.map(function (column) { if (column.key !== 'status') return '<span>' + esc(column.label) + '</span>'; return '<label class="pw-consult-status-filter"><span class="sr-only">상담상태별 보기</span><select aria-label="상담상태별 보기" onchange="OSPersonalWorkspace.filterConsultationStatus(this.value)"><option value="all">상담상태 전체</option>' + statuses.map(function (entry) { return '<option value="' + entry + '"' + (state.consultationStatusFilter === entry ? ' selected' : '') + '>' + entry + '</option>'; }).join('') + '</select></label>'; }).join('') + '<button type="button" class="pw-consult-column-button" onclick="OSPersonalWorkspace.manageConsultColumns()">+ 컬럼</button></div>';
    var list = '<div class="pw-consult-list" role="list">' + columns + '<div class="pw-consult-rows">' + rows.map(function (item) {
      var customer = customers[item.customer_id] || {}, profile = customerProfile(customer), date = String(item.consulted_at || item.created_at || '').slice(0, 10), age = insuranceAge(profile.birth_date, date), status = consultationStatus(item, customer);
      return '<button type="button" role="listitem" class="pw-consult-row' + (String(item.id) === String(state.selectedConsultation) ? ' on' : '') + '" style="' + gridStyle + '" onclick="OSPersonalWorkspace.selectConsultation(\'' + esc(item.id) + '\')">' + configuredColumns.map(function (column) { if (column.key === 'name') return '<strong>' + favoriteButton('consultation', item.id, customer.name || '고객 상담', status + ' · ' + date) + '<span>' + esc(customer.name || '(이름 없음)') + '</span></strong>'; return consultCell(column, item, customer, profile, date, age, status); }).join('') + '<span class="pw-consult-action-spacer" aria-hidden="true"></span><span class="pw-consult-hover">' + esc(stripHtml(item.memo || '상담내용이 없습니다.')) + '</span></button>';
    }).join('') + (rows.length ? '' : '<div class="pw-empty">상담 기록이 없습니다.</div>') + '</div>' + loadMoreHtml(totalRowCount, rows.length, 'OSPersonalWorkspace.loadMoreConsultations()') + '</div>';
    var detail = selected ? consultationDetailHtml(selected, customers[selected.customer_id] || {}) : '';
    return '<div class="pw-consult-screen">' + statusHtml() + '<div class="pw-toolbar"><h2>상담관리</h2><button class="pw-btn primary" onclick="OSPersonalWorkspace.addConsultation()">+ 상담 등록</button></div><div class="pw-consult-layout' + (selected ? ' has-detail' : '') + '"><section class="pw-consult-master">' + list + '</section>' + detail + '</div></div>';
  }
  function manageConsultColumns() {
    var columns = consultColumns(), rows = columns.map(function (column, index) { return '<div class="pw-column-setting"><span>' + esc(column.label) + '</span><button type="button" onclick="OSPersonalWorkspace.moveConsultColumn(' + index + ',-1)"' + (index === 0 ? ' disabled' : '') + '>←</button><button type="button" onclick="OSPersonalWorkspace.moveConsultColumn(' + index + ',1)"' + (index === columns.length - 1 ? ' disabled' : '') + '>→</button>' + (column.custom ? '<button type="button" class="danger" onclick="OSPersonalWorkspace.deleteConsultColumn(\'' + esc(column.key) + '\')">삭제</button>' : '') + '</div>'; }).join('');
    dialog('<div class="pw-form"><h2>상담관리 컬럼</h2><p class="pw-column-help">화살표로 컬럼 위치를 옮길 수 있습니다. 추가 항목은 고객별로 입력해 저장합니다.</p><div class="pw-column-settings">' + rows + '</div><div class="pw-form-actions"><button type="button" class="pw-btn" onclick="OSPersonalWorkspace.closeDialog()">닫기</button><button type="button" class="pw-btn primary" onclick="OSPersonalWorkspace.addConsultColumn()">+ 컬럼 추가</button></div></div>');
  }
  function addConsultColumn() { var label = window.prompt('추가할 컬럼 이름을 입력하세요.'); if (!label || !String(label).trim()) return; var columns = consultColumns(); columns.push({ key: 'custom_' + Date.now().toString(36), label: String(label).trim().slice(0, 30), width: 120, custom: true }); saveConsultColumns(columns); closeDialog(); renderContent(); manageConsultColumns(); }
  function moveConsultColumn(index, direction) { var columns = consultColumns(), target = index + direction; if (target < 0 || target >= columns.length) return; var moved = columns.splice(index, 1)[0]; columns.splice(target, 0, moved); saveConsultColumns(columns); closeDialog(); renderContent(); manageConsultColumns(); }
  function deleteConsultColumn(key) { var columns = consultColumns(), column = columns.find(function (entry) { return entry.key === key && entry.custom; }); if (!column || !window.confirm('“' + column.label + '” 컬럼을 목록에서 제거할까요? 기존 입력값은 보존됩니다.')) return; saveConsultColumns(columns.filter(function (entry) { return entry.key !== key; })); closeDialog(); renderContent(); manageConsultColumns(); }
  function consultationDetailHtml(item, customer) {
    var profile = customerProfile(customer), date = String(item.consulted_at || item.created_at || '').slice(0, 10), age = insuranceAge(profile.birth_date, date), status = consultationStatus(item, customer);
    var statuses = ['예약', '진행중', '제안서발송', '클로징', '청약완료', '보류', '종결'];
    return '<article class="pw-consult-detail"><button type="button" class="pw-consult-detail-close" onclick="OSPersonalWorkspace.selectConsultation()" aria-label="상담 상세 닫기">×</button><button type="button" class="pw-consult-back" onclick="OSPersonalWorkspace.selectConsultation()">‹ 목록</button><div class="pw-consult-detail-head"><div><input id="pwd-consult-date" type="date" value="' + esc(date) + '" onchange="OSPersonalWorkspace.refreshDetailInsuranceAge()"><div class="pw-detail-name">' + favoriteButton('consultation', item.id, customer.name || '고객 상담', status + ' · ' + date) + '<input id="pwd-consult-name" value="' + esc(customer.name || '') + '" aria-label="이름"><div class="pw-gender"><label><input type="radio" name="pwd-consult-gender" value="남"' + (profile.gender === '남' ? ' checked' : '') + '>남</label><label><input type="radio" name="pwd-consult-gender" value="여"' + (profile.gender === '여' ? ' checked' : '') + '>여</label></div></div></div></div><dl><div><dt>생년월일</dt><dd><input id="pwd-consult-birth" type="text" inputmode="numeric" maxlength="10" placeholder="YYYY-MM-DD" value="' + esc(profile.birth_date || '') + '" oninput="OSPersonalWorkspace.formatBirthInput(this,\'detail\')"></dd></div><div><dt>보험나이</dt><dd id="pwd-insurance-age">' + (age === '' ? '-' : age + '세') + '</dd></div><div><dt>전화번호</dt><dd><input id="pwd-consult-phone" inputmode="numeric" value="' + esc(phoneText(customer.phone || customer.phone_raw || '')) + '" oninput="OSPersonalWorkspace.formatConsultPhone(this)"></dd></div><div><dt>상담상태</dt><dd><select id="pwd-consult-status" onchange="OSPersonalWorkspace.consultationStatusChanged(this,\'detail\')">' + statuses.map(function (entry) { return '<option value="' + entry + '"' + (entry === status ? ' selected' : '') + '>' + entry + '</option>'; }).join('') + '</select></dd></div></dl><section><h3>상담내용</h3><div class="pw-consult-content pw-rich-content">' + linkifyRich(item.memo || '') + '</div>' + consultationExistingAttachments(item.id) + '<textarea id="pwd-consult-new" rows="5" placeholder="새 상담내용을 입력하세요"></textarea></section><div class="pw-consult-save"><button type="button" class="pw-btn danger" onclick="OSPersonalWorkspace.trashCustomer(\'' + esc(customer.id) + '\')">삭제</button><button type="button" class="pw-btn" onclick="OSPersonalWorkspace.selectConsultation()">닫기</button><button type="button" class="pw-btn primary" onclick="OSPersonalWorkspace.saveConsultationDetail(\'' + esc(item.id) + '\')">저장</button></div></article>';
  }

  function calendarTitle() {
    var selected = parseDate(state.selectedDate);
    if (state.calendarMode === 'day') return selected.getFullYear() + '년 ' + (selected.getMonth() + 1) + '월 ' + selected.getDate() + '일';
    if (state.calendarMode === 'week') { var start = new Date(selected); start.setDate(start.getDate() - start.getDay()); return (start.getMonth() + 1) + '월 ' + start.getDate() + '일 – ' + formatDate(addDays(start, 6)); }
    if (state.calendarMode === 'agenda') return '일정';
    return state.cursor.getFullYear() + '년 ' + (state.cursor.getMonth() + 1) + '월';
  }
  function eventPriority(event) { return event && event.event_type === 'holiday' ? 0 : event && event.event_type === 'term' ? 1 : event && event.event_type === 'memorial' ? 2 : event && event.event_type === 'customer' ? 3 : 4; }
  function eventsFor(date) { return allEvents().filter(function (event) { return String(event.event_date || '').slice(0, 10) === date; }).sort(function (a, b) { return eventPriority(a) - eventPriority(b) || String(a.event_time || '').localeCompare(String(b.event_time || '')) || String(a.title || '').localeCompare(String(b.title || ''), 'ko'); }); }
  function calendarEventKind(event) { return event && event.event_type === 'customer' ? 'customer' : event && event.event_type === 'holiday' ? 'holiday' : event && event.event_type === 'term' ? 'term' : event && event.event_type === 'memorial' ? 'memorial' : 'schedule'; }
  function monthView() {
    var first = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), 1), start = new Date(first); start.setDate(1 - first.getDay());
    var today = ymd(new Date()), cells = [];
    for (var i = 0; i < 42; i++) {
      var day = new Date(start); day.setDate(start.getDate() + i);
      var key = ymd(day), events = eventsFor(key), builtIns = events.filter(function (event) { return event.builtin; }), personal = events.filter(function (event) { return !event.builtin; }), outside = day.getMonth() !== first.getMonth();
      cells.push('<button type="button" class="pw-day ' + (outside ? 'out ' : '') + (key === today ? 'today ' : '') + (key === state.selectedDate ? 'selected' : '') + '" onclick="OSPersonalWorkspace.selectDate(\'' + key + '\')" aria-label="' + esc((day.getMonth() + 1) + '월 ' + day.getDate() + '일, 일정 ' + events.length + '개') + '"><span class="pw-day-head"><strong>' + day.getDate() + '</strong><span class="pw-built-ins">' + builtIns.slice(0, 2).map(function (event) { return '<i class="' + calendarEventKind(event) + '">' + esc(event.title) + '</i>'; }).join('') + '</span></span><span class="pw-day-items">' + personal.slice(0, 3).map(function (event) { return '<span class="pw-event ' + calendarEventKind(event) + '">' + esc(event.title || '일정') + '</span>'; }).join('') + (events.length > builtIns.slice(0, 2).length + personal.slice(0, 3).length ? '<small class="pw-more">+' + (events.length - builtIns.slice(0, 2).length - personal.slice(0, 3).length) + '개 더보기</small>' : '') + '</span></button>');
    }
    return '<section class="pw-calendar-month"><div class="pw-cal"><div class="pw-cal-head">' + ['일', '월', '화', '수', '목', '금', '토'].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div><div class="pw-cal-grid">' + cells.join('') + '</div></div></section>';
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
    return statusHtml() + '<div class="pw-calendar-shell"><div class="pw-calendar-toolbar"><div class="pw-calendar-left"><button class="pw-btn pw-today" onclick="OSPersonalWorkspace.calendarToday()">오늘</button><span class="pw-month-switcher"><button type="button" aria-label="이전 보기" onclick="OSPersonalWorkspace.moveCalendar(-1)">‹</button><button type="button" aria-label="다음 보기" onclick="OSPersonalWorkspace.moveCalendar(1)">›</button></span><h2>' + calendarTitle() + '</h2></div><div class="pw-actions pw-mode">' + modes.map(function (mode) { return '<button class="pw-btn ' + (state.calendarMode === mode[0] ? 'on' : '') + '" onclick="OSPersonalWorkspace.setCalendarMode(\'' + mode[0] + '\')">' + mode[1] + '</button>'; }).join('') + '<button class="pw-btn primary" onclick="OSPersonalWorkspace.addEvent()">+ 일정</button></div></div>' + view + '</div>';
  }
  function archiveHtml() {
    var cards = [['home', '기존 원세컨드 홈', '보험 검색과 기존 홈 도구'], ['product-lineup', '상품 라인업', '원수사 상품 자료'], ['newsletters', '소식지', '원수사 GA 소식지'], ['bojang', '보장분석', '기존 보장분석 도구'], ['axis-medical', '보험 지식', '실손·암·뇌·심장 등'], ['namecard', '기타 도구', '명함과 기존 제작 도구']];
    return '<div class="pw-toolbar"><h2>기존 아카이브</h2></div><div class="pw-archive-grid">' + cards.map(function (card) { return '<button class="pw-archive-card" onclick="OSPersonalWorkspace.legacy(\'' + card[0] + '\')"><strong>' + card[1] + '</strong><span>' + card[2] + '</span></button>'; }).join('') + '</div>';
  }
  function trashHtml() {
    var rows = (state.data.trashCustomers || []).filter(function (item) { return matches((item.name || '') + ' ' + (item.phone || item.phone_raw || '')); });
    return statusHtml() + '<div class="pw-toolbar"><h2>휴지통</h2></div><div class="pw-trash-list">' + (rows.length ? rows.map(function (item) { return '<div class="pw-trash-row"><span><strong>' + esc(item.name || '(이름 없음)') + '</strong><small>' + esc(phoneText(item.phone || item.phone_raw || '')) + (item.deleted_at ? ' · ' + formatDate(item.deleted_at) + ' 삭제' : '') + '</small></span><button type="button" class="pw-btn" onclick="OSPersonalWorkspace.restoreCustomer(\'' + esc(item.id) + '\')">복원</button></div>'; }).join('') : '<div class="pw-empty">휴지통이 비어 있습니다.</div>') + '</div>';
  }
  function sectionHtml() {
    if (state.status === 'idle' || state.status === 'waiting-auth' || (state.status === 'loading' && !(state.data.items.length || state.data.events.length || state.data.customers.length || state.data.consultations.length))) return statusHtml();
    if (state.query.trim()) return searchHtml();
    if (state.section === 'assets') return assetsHtml();
    if (state.section === 'customers') return customersHtml();
    if (state.section === 'consultations') return consultationsHtml();
    if (state.section === 'calendar') return calendarHtml();
    if (state.section === 'trash') return trashHtml();
    if (state.section === 'archive') return archiveHtml();
    return homeHtml();
  }

  function renderShell() {
    var view = document.getElementById('v-personal-workspace'); if (!view) return;
    var head = STANDALONE ? '' : '<header class="pw-head"><div class="pw-title"><h1>내 업무</h1><p>자료, 고객, 상담과 일정을 한곳에서 관리합니다.</p></div><label class="pw-search">⌕<input id="pw-search-input" type="search" value="' + esc(state.query) + '" placeholder="내 자료와 고객 검색" autocomplete="off"></label></header>';
    view.innerHTML = '<div class="pw-shell' + (STANDALONE ? ' pw-shell-compact' : '') + '">' + head + '<div class="pw-body">' + navHtml() + '<main class="pw-main" id="pw-main"></main></div></div><dialog class="pw-dialog" id="pw-dialog"><button class="pw-dialog-close" onclick="OSPersonalWorkspace.closeDialog()" aria-label="닫기">×</button><div id="pw-dialog-body"></div></dialog>'
      + '<dialog class="pw-dialog pw-reservation-dialog" id="pw-reservation-dialog"><button class="pw-dialog-close" onclick="OSPersonalWorkspace.closeReservationPopup()" aria-label="닫기">×</button><div id="pw-reservation-body"></div></dialog>'
      + '<div class="pw-preview" id="pw-preview" aria-hidden="true" onclick="if(event.target===this)OSPersonalWorkspace.closePreview()"><button type="button" class="pw-preview-close" onclick="OSPersonalWorkspace.closePreview()" aria-label="미리보기 닫기">×</button><div class="pw-preview-stage" id="pw-preview-stage" onclick="if(event.target===this)OSPersonalWorkspace.closePreview()"></div><div class="pw-preview-bar"><button type="button" onclick="OSPersonalWorkspace.previewZoom(-1)" title="축소">−</button><button type="button" onclick="OSPersonalWorkspace.previewZoom(1)" title="확대">＋</button><button type="button" onclick="OSPersonalWorkspace.previewRotate()" title="회전">↻</button><button type="button" class="pw-preview-pdf-only" onclick="OSPersonalWorkspace.previewPage(-1)" title="이전 페이지">‹</button><span id="pw-preview-page"></span><button type="button" class="pw-preview-pdf-only" onclick="OSPersonalWorkspace.previewPage(1)" title="다음 페이지">›</button><div class="pw-ddak-wrap"><button type="button" class="pw-preview-ddak" aria-haspopup="menu" aria-expanded="false" onclick="OSPersonalWorkspace.toggleDdakMenu(event)">⚡ 딸깍</button><div class="pw-ddak-menu" id="pw-preview-ddak-menu" role="menu" hidden><a id="pw-preview-download" href="#" target="_blank" rel="noopener" download role="menuitem" onclick="OSPersonalWorkspace.closeDdakMenu()">⬇ 다운로드 저장</a><button type="button" role="menuitem" onclick="OSPersonalWorkspace.previewCopy()">📋 복사</button></div></div></div></div>';
    if (STANDALONE) { var globalInput = document.getElementById('pw-search-input'); if (globalInput) globalInput.value = state.query; }
    bindSearch(); renderContent();
  }
  function renderConsultCustomFields() { var detail = document.querySelector('#v-personal-workspace .pw-consult-detail'), section = detail && detail.querySelector('section'); if (!detail || !section || detail.querySelector('.pw-custom-fields')) return; var item = state.data.consultations.find(function (entry) { return String(entry.id) === String(state.selectedConsultation); }), customer = item && state.data.customers.find(function (entry) { return String(entry.id) === String(item.customer_id); }), profile = customerProfile(customer || {}), columns = consultColumns().filter(function (column) { return column.custom; }); if (!columns.length) return; var box = document.createElement('div'); box.className = 'pw-custom-fields'; columns.forEach(function (column) { var label = document.createElement('label'), span = document.createElement('span'), input = document.createElement('input'); span.textContent = column.label; input.setAttribute('data-consult-custom', column.key); input.value = consultCustomValue(profile, column.key); label.className = 'pw-custom-field'; label.appendChild(span); label.appendChild(input); box.appendChild(label); }); detail.insertBefore(box, section); }
  function renderContent() { var main = document.getElementById('pw-main'); if (main) { main.innerHTML = sectionHtml(); if (state.section === 'assets' && state.assetView !== 'list') hydrateAssetThumbs(); if (state.section === 'consultations' && state.selectedConsultation) { renderConsultCustomFields(); hydrateRichStorage(); } } }
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
  function go(section) { if (section === 'consultations' && state.section === 'consultations') state.selectedConsultation = null; state.section = section; renderShell(); setUrl(true); if (section !== 'home' && !state.fullLoaded) loadData(true); }
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
  function linkifyRich(html) {
    var safe = sanitizeRich(html), doc = new DOMParser().parseFromString(safe, 'text/html');
    var walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentNode;
        while (parent && parent !== doc.body) {
          if (parent.nodeType === 1 && /^(A|SCRIPT|STYLE|TEXTAREA)$/i.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
          parent = parent.parentNode;
        }
        return /https?:\/\/\S+/i.test(node.nodeValue || '') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    var nodes = [], node;
    while ((node = walker.nextNode())) nodes.push(node);
    nodes.forEach(function (textNode) {
      var text = textNode.nodeValue || '', fragment = doc.createDocumentFragment(), last = 0, match, re = /https?:\/\/[^\s<>"']+/ig;
      while ((match = re.exec(text))) {
        var raw = match[0], href = raw.replace(/[.,;:!?)]*$/g, ''), trailing = raw.slice(href.length);
        if (match.index > last) fragment.appendChild(doc.createTextNode(text.slice(last, match.index)));
        var link = doc.createElement('a');
        link.href = href;
        link.textContent = href;
        link.target = '_blank';
        link.rel = 'noopener';
        fragment.appendChild(link);
        if (trailing) fragment.appendChild(doc.createTextNode(trailing));
        last = match.index + raw.length;
      }
      if (last < text.length) fragment.appendChild(doc.createTextNode(text.slice(last)));
      textNode.parentNode.replaceChild(fragment, textNode);
    });
    return doc.body.innerHTML;
  }
  function richEditorField(id, html) {
    var buttons = [['bold', '<b>B</b>', '굵게'], ['italic', '<i>I</i>', '기울임'], ['underline', '<u>U</u>', '밑줄'], ['strikeThrough', '<s>S</s>', '취소선'], ['formatBlock', '제목', '제목', 'h2'], ['insertUnorderedList', '• 목록', '글머리 목록'], ['insertOrderedList', '1. 목록', '번호 목록'], ['formatBlock', '인용', '인용문', 'blockquote'], ['justifyLeft', '왼쪽', '왼쪽 정렬'], ['justifyCenter', '가운데', '가운데 정렬'], ['justifyRight', '오른쪽', '오른쪽 정렬'], ['removeFormat', '서식 지우기', '서식 지우기']];
    return '<div class="pw-rich"><div class="pw-rich-toolbar" role="toolbar" aria-label="본문 서식">' + buttons.map(function (button) { return '<button type="button" tabindex="-1" title="' + button[2] + '" onmousedown="event.preventDefault();OSPersonalWorkspace.richCommand(\'' + button[0] + '\',\'' + (button[3] || '') + '\')">' + button[1] + '</button>'; }).join('') + '<label class="pw-rich-upload">+ 이미지 삽입<input type="file" accept="image/*" multiple hidden onchange="OSPersonalWorkspace.addRichImages(this.files);this.value=\'\'"></label><label class="pw-rich-upload">+ 파일 첨부<input type="file" multiple hidden onchange="OSPersonalWorkspace.addRichFiles(this.files);this.value=\'\'"></label></div><div id="' + id + '" class="pw-rich-body" contenteditable="true" role="textbox" aria-multiline="true" aria-label="내용" tabindex="0" data-placeholder="내용을 입력하세요" onmousedown="OSPersonalWorkspace.prepareRichFocus(event,this)" onfocus="OSPersonalWorkspace.focusRichBody(this)" onclick="OSPersonalWorkspace.focusRichBody(this)" onpaste="OSPersonalWorkspace.richPaste(event)">' + sanitizeRich(html) + '</div><div class="pw-rich-files" id="pw-rich-files"></div></div>';
  }
  function richEditorEmpty(editor) { return !!editor && !String(editor.textContent || '').trim() && !editor.querySelector('img,[data-storage-path],[data-pending-image]'); }
  function placeRichCaret(editor) {
    if (!editor) return;
    try { editor.focus({ preventScroll: true }); } catch (_) { editor.focus(); }
    if (!richEditorEmpty(editor) || !window.getSelection || !document.createRange) return;
    var selection = window.getSelection(), range = document.createRange();
    if (!selection || !range) return;
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  function focusRichBody(editor) { if (editor) window.setTimeout(function () { placeRichCaret(editor); }, 0); }
  function prepareRichFocus(event, editor) { if (editor && richEditorEmpty(editor)) window.setTimeout(function () { placeRichCaret(editor); }, 0); }
  function richCommand(command, commandValue) { var editor = document.querySelector('#pw-dialog .pw-rich-body'); if (!editor) return; placeRichCaret(editor); document.execCommand(command, false, commandValue || null); }
  function focusRich(id) { placeRichCaret(document.getElementById(id)); }
  function richPaste(event) { var text = String(event && event.clipboardData && event.clipboardData.getData('text/plain') || '').trim(); if (!/^https?:\/\/\S+$/i.test(text)) return; event.preventDefault(); var safe = esc(text); document.execCommand('insertHTML', false, '<a href="' + safe + '" target="_blank" rel="noopener">' + safe + '</a>'); }
  function richValue(id) { var editor = document.getElementById(id); return editor ? sanitizeRich(editor.innerHTML) : ''; }
  function richHasText(html) { var doc = new DOMParser().parseFromString(String(html || ''), 'text/html'); return !!String(doc.body.textContent || '').trim() || !!doc.body.querySelector('img'); }
  function resetRichPending() { (state.pendingRichImages || []).forEach(function (entry) { if (entry.preview) URL.revokeObjectURL(entry.preview); }); state.pendingRichFiles = []; state.pendingRichImages = []; }
  function renderRichFiles() { var box = document.getElementById('pw-rich-files'); if (!box) return; var files = state.pendingRichFiles || []; box.innerHTML = files.length ? '<strong>첨부파일 ' + files.length + '개</strong>' + files.map(function (entry) { return '<span><b>' + esc(entry.file.name) + '</b><small>' + formatBytes(entry.file.size) + '</small><button type="button" onclick="OSPersonalWorkspace.removeRichFile(\'' + entry.id + '\')" aria-label="' + esc(entry.file.name) + ' 제거">×</button></span>'; }).join('') : ''; }
  function addRichFiles(files) { Array.prototype.slice.call(files || []).forEach(function (file) { state.pendingRichFiles.push({ id: crypto.randomUUID(), file: file }); }); renderRichFiles(); }
  function removeRichFile(id) { state.pendingRichFiles = state.pendingRichFiles.filter(function (entry) { return entry.id !== id; }); renderRichFiles(); }
  function addRichImages(files) { var editor = document.querySelector('#pw-dialog .pw-rich-body'); if (!editor) return; Array.prototype.slice.call(files || []).filter(function (file) { return /^image\//.test(file.type || ''); }).forEach(function (file) { var id = crypto.randomUUID(), preview = URL.createObjectURL(file); state.pendingRichImages.push({ id: id, file: file, preview: preview }); editor.insertAdjacentHTML('beforeend', '<p><img src="' + esc(preview) + '" data-pending-image="' + id + '" alt="' + esc(file.name) + '"></p>'); }); }
  function formatBytes(bytes) { var value = Number(bytes || 0); if (value < 1024) return value + ' B'; if (value < 1048576) return (value / 1024).toFixed(1) + ' KB'; return (value / 1048576).toFixed(1) + ' MB'; }
  function signStoragePath(path) {
    var cached = state.signedUrlCache[path];
    if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.url);
    return fetch(window.db.url('/storage/v1/object/sign/myspace/' + String(path).split('/').map(encodeURIComponent).join('/')), { method: 'POST', headers: { apikey: window.db.key, Authorization: 'Bearer ' + window.db.getToken(), 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 3600 }) })
      .then(function (response) { if (!response.ok) throw new Error('첨부파일을 열지 못했습니다.'); return response.json(); })
      .then(function (data) { var url = window.db.url('/storage/v1' + data.signedURL); state.signedUrlCache[path] = { url: url, expiresAt: Date.now() + 55 * 60000 }; return url; });
  }
  function hydrateRichStorage() { var nodes = document.querySelectorAll('#v-personal-workspace [data-storage-path]'); Array.prototype.forEach.call(nodes, function (node) { var path = node.getAttribute('data-storage-path'), title = node.getAttribute('data-file-title') || node.getAttribute('alt') || '첨부파일', mime = node.getAttribute('data-file-mime') || ''; signStoragePath(path).then(function (url) { if (node.tagName === 'IMG') { node.src = url; node.classList.add('pw-previewable'); node.title = '클릭하면 크게 보기'; node.onclick = function () { openPreviewUrl(url, title, mime || 'image/*'); }; } else { node.href = url; node.onclick = function (event) { if (previewType({ title: title, mime_type: mime, storage_path: path })) { event.preventDefault(); openPreviewUrl(url, title, mime); } }; } }).catch(function () {}); }); }
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
  function closeDdakMenu() { var menu = document.getElementById('pw-preview-ddak-menu'), trigger = document.querySelector('.pw-ddak-wrap .pw-preview-ddak'); if (menu) menu.hidden = true; if (trigger) trigger.setAttribute('aria-expanded', 'false'); }
  function toggleDdakMenu(event) { if (event) event.stopPropagation(); var menu = document.getElementById('pw-preview-ddak-menu'), trigger = event && event.currentTarget; if (!menu) return; var open = menu.hidden; menu.hidden = !open; if (trigger) trigger.setAttribute('aria-expanded', String(open)); }
  function previewCopy() {
    var p = state.preview; if (!p) return;
    closeDdakMenu();
    var makeBlob = p.type === 'pdf' ? canvasBlob(document.getElementById('pw-preview-canvas')) : fetch(p.url).then(function (response) { return response.blob(); }).then(function (blob) { return createImageBitmap(blob); }).then(function (bitmap) { var canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height; canvas.getContext('2d').drawImage(bitmap, 0, 0); return canvasBlob(canvas); });
    makeBlob.then(function (blob) { if (!blob) throw new Error('이미지를 만들지 못했습니다.'); if (!navigator.clipboard || !window.ClipboardItem) throw new Error('clipboard'); return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); })
      .then(function () { if (typeof window.toast === 'function') window.toast('복사했습니다. 카카오톡에 붙여넣으세요.'); })
      .catch(function () { if (typeof window.toast === 'function') window.toast('이 브라우저에서는 복사를 지원하지 않습니다. 다운로드를 이용해 주세요.'); });
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
    var kind = source === 'scripts' ? '업무노트' : item.memo_text ? '메모' : '자료실';
    dialog('<div class="pw-detail"><span class="pw-badge">' + kind + '</span><h2 class="pw-detail-title">' + favoriteButton('asset', id, item.title || '(제목 없음)', kind + ' · ' + formatDate(item.created_at)) + '<span>' + esc(item.title || '(제목 없음)') + '</span></h2><small>' + formatDate(item.created_at) + '</small><div class="pw-detail-body pw-rich-content">' + linkifyRich(body) + '</div>' + attachmentHtml + '<div class="pw-detail-actions">' + actions + '</div></div>');
    hydrateRichStorage();
  }
  function showCustomer(id) {
    var customer = state.data.customers.find(function (entry) { return String(entry.id) === String(id); }); if (!customer) return;
    var history = state.data.consultations.filter(function (entry) { return String(entry.customer_id) === String(id); });
    dialog('<div class="pw-detail"><span class="pw-badge">고객</span><h2 class="pw-detail-title">' + favoriteButton('customer', id, customer.name || '(이름 없음)', phoneText(customer.phone || customer.phone_raw || '')) + '<span>' + esc(customer.name || '(이름 없음)') + '</span></h2><p>' + esc(customer.phone || customer.phone_raw || '') + '</p><h3>상담 기록</h3><div class="pw-list">' + (history.length ? history.map(function (entry) { return row(formatDate(entry.consulted_at || entry.created_at), entry.memo || '', esc(entry.channel || ''), ''); }).join('') : '<div class="pw-empty">상담 기록이 없습니다.</div>') + '</div></div>');
  }
  function showEvent(id) { var event = allEvents().find(function (entry) { return String(entry.id) === String(id); }); if (!event) return; var kind = event.event_type === 'customer' ? '고객관리' : event.event_type === 'holiday' ? '공휴일' : event.event_type === 'term' ? '절기' : event.event_type === 'memorial' ? '기념일' : '일정', sub = String(event.event_date || '').slice(0, 10) + (event.builtin ? '' : ' ' + String(event.event_time || '').slice(0, 5)); dialog('<div class="pw-detail"><span class="pw-badge">' + kind + '</span><h2 class="pw-detail-title">' + (event.builtin ? '' : favoriteButton('event', id, event.title || '일정', sub)) + '<span>' + esc(event.title) + '</span></h2><p>' + esc(sub) + '</p><div class="pw-detail-body">' + esc(event.description || '') + '</div></div>'); }

  function formField(label, input) { return '<label class="pw-field"><span>' + label + '</span>' + input + '</label>'; }
  function formShell(title, body, saveAction) { return '<form class="pw-form" onsubmit="event.preventDefault();' + saveAction + '"><h2>' + title + '</h2>' + body + '<div class="pw-form-actions"><button type="button" class="pw-btn" onclick="OSPersonalWorkspace.closeDialog()">취소</button><button type="submit" class="pw-btn primary">저장</button></div></form>'; }
  function write(path, body) { return window.db.fetch('/rest/v1/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify(body) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return true; }); }
  function writeOne(path, body) { return window.db.fetch('/rest/v1/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(body) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return response.json(); }).then(function (rows) { if (!Array.isArray(rows) || !rows[0]) throw new Error('저장 결과를 확인하지 못했습니다.'); return rows[0]; }); }
  function update(path, body) { return window.db.fetch('/rest/v1/' + path, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify(body) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return true; }); }
  function updateOne(path, body) { return window.db.fetch('/rest/v1/' + path, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(body) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return response.json(); }).then(function (rows) { if (!Array.isArray(rows) || rows.length !== 1) throw new Error('수정 권한을 확인하지 못했습니다. 다시 로그인한 뒤 시도해 주세요.'); return rows[0]; }); }
  function softDelete(path) { return window.db.fetch('/rest/v1/' + path, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify({ deleted_at: new Date().toISOString() }) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return response.json(); }).then(function (rows) { if (!Array.isArray(rows) || rows.length !== 1) throw new Error('삭제 권한을 확인하지 못했습니다. 다시 로그인한 뒤 시도해 주세요.'); return true; }); }
  function softDeleteChildren(parentId) { return window.db.fetch('/rest/v1/workspace_items?parent_id=eq.' + encodeURIComponent(parentId) + '&owner_id=eq.' + encodeURIComponent(currentUserId()) + '&deleted_at=is.null', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify({ deleted_at: new Date().toISOString() }) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return true; }); }
  function finishSave(message) { closeDialog(); state.query = ''; var input = document.getElementById('pw-search-input'); if (input) input.value = ''; rebuildWorkspaceDerived(); renderContent(); if (typeof window.toast === 'function') window.toast(message); }
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
    var item = workspaceItem(id), title = value('pwf-edit-title'); if (!item) return; if (!title) { alert('제목을 입력해 주세요.'); return; }
    var changes = { title: title };
    if (item.item_type !== 'file') {
      var body = richValue('pwf-edit-body'); if (!richHasText(body) && !(item.item_type === 'link' && value('pwf-edit-link'))) { alert('내용을 입력해 주세요.'); return; }
      var category = assetCategory(item);
      prepareRichUploads(id, body, category).then(function (prepared) {
        changes.body = prepared.body; changes.url = value('pwf-edit-link') || null; changes.visibility = value('pwf-edit-visibility') === 'public' ? 'public' : 'private';
        return updateOne('workspace_items?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()) + '&deleted_at=is.null', changes)
          .then(function (updated) { return saveRichChildren(prepared.rows).then(function () { return updated; }); });
      }).then(function (updated) { upsertWorkspaceItem(updated); resetRichPending(); finishSave('자료를 수정했습니다.'); }).catch(saveError);
      return;
    }
    updateOne('workspace_items?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()) + '&deleted_at=is.null', changes)
      .then(function (updated) { upsertWorkspaceItem(updated); finishSave('자료를 수정했습니다.'); }).catch(saveError);
  }
  function deleteAsset(id) {
    var item = workspaceItem(id); if (!item || item.item_type === 'folder') return;
    if (!window.confirm('“' + String(item.title || '제목 없음') + '” 자료를 삭제할까요?')) return;
    var childIds = state.data.items.filter(function (entry) { return String(entry.parent_id || '') === String(id); }).map(function (entry) { return entry.id; });
    softDeleteChildren(id).then(function () { return softDelete('workspace_items?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()) + '&deleted_at=is.null'); })
      .then(function () { closeDialog(); removeWorkspaceItemsLocal(childIds.concat([id])); renderContent(); if (typeof window.toast === 'function') window.toast('자료를 삭제했습니다.'); }).catch(saveError);
  }
  function openVault() {
    dialog('<div class="pw-vault"><div class="pw-vault-head"><div><h2>내 파일함</h2><p>사이트에 저장된 파일과 폴더입니다. PC 원본은 변경하지 않습니다.</p></div><div class="pw-actions"><button class="pw-btn" onclick="OSPersonalWorkspace.newFolder()">+ 새 폴더</button><label class="pw-btn primary">+ 파일<input id="pw-vault-picker" type="file" multiple hidden onchange="OSPersonalWorkspace.uploadFiles(this.files)"></label></div></div><div id="pw-vault-content" class="pw-vault-content"><div class="pw-loading">파일함을 불러오는 중입니다.</div></div></div>');
    api('workspace_items?owner_id=eq.' + encodeURIComponent(currentUserId()) + '&item_type=in.(folder,file)&deleted_at=is.null' + personalItemScope() + '&order=created_at.desc&limit=10000&select=*').then(function (items) { state.vaultFolders = items.filter(function (item) { return item.item_type === 'folder'; }); state.vaultFiles = items.filter(function (item) { return item.item_type === 'file'; }); renderVault(); }).catch(function () { var content = document.getElementById('pw-vault-content'); if (content) content.innerHTML = '<div class="pw-error">파일함을 불러오지 못했습니다.</div>'; });
  }
  function renderVault() { var content = document.getElementById('pw-vault-content'); if (!content) return; var folders = state.vaultFolders || [], files = state.vaultFiles || []; content.innerHTML = '<div class="pw-vault-grid">' + folders.map(function (folder) { return '<div class="pw-file-card folder"><span>📁</span><b>' + esc(folder.title) + '</b><small>폴더</small></div>'; }).concat(files.map(function (file) { return '<div class="pw-file-card"><span>📄</span><b>' + esc(file.title) + '</b><small>' + esc((file.extension || '파일').toUpperCase()) + ' · ' + formatDate(file.created_at) + '</small></div>'; })).join('') + '</div>' + ((!folders.length && !files.length) ? '<div class="pw-empty">저장된 파일이 없습니다.</div>' : ''); }
  function newFolder() { var name = prompt('새 폴더 이름'); if (name == null || !String(name).trim()) return; writeOne('workspace_items', { owner_id: currentUserId(), parent_id: null, item_type: 'folder', title: String(name).trim(), visibility: 'private' }).then(function (created) { upsertWorkspaceItem(created); openVault(); }).catch(saveError); }
  function uploadFiles(files) { var list = Array.prototype.slice.call(files || []); if (!list.length) return; var token = window.db.getToken(), owner = currentUserId(); Promise.all(list.map(function (file) { var id = crypto.randomUUID(), dot = file.name.lastIndexOf('.'), ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : '', path = owner + '/root/' + id + (ext ? '.' + ext.replace(/[^a-z0-9]/g, '') : ''); var row = { id: id, owner_id: owner, item_type: 'file', title: file.name, storage_path: path, mime_type: file.type || null, extension: ext || null, file_size: file.size, visibility: 'private', created_at: new Date().toISOString() }; return fetch(window.db.url('/storage/v1/object/myspace/' + path.split('/').map(encodeURIComponent).join('/')), { method: 'POST', headers: { apikey: window.db.key, Authorization: 'Bearer ' + token, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' }, body: file }).then(function (response) { if (!response.ok) throw new Error(file.name + ' 업로드 실패'); return write('workspace_items', row).then(function () { return row; }); }); })).then(function (rows) { rows.forEach(upsertWorkspaceItem); openVault(); }).catch(saveError); }
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
    writeOne('workspace_items', { owner_id: currentUserId(), parent_id: parent, item_type: 'folder', title: name, visibility: 'private', legacy_payload: { workspace_category: category } })
      .then(function (created) { upsertWorkspaceItem(created); closeDialog(); state.assetFilter = category; state.assetFolder = parent; renderContent(); if (typeof window.toast === 'function') window.toast(assetCategoryLabel(category) + '에 폴더를 만들었습니다.'); }).catch(saveError);
  }
  function deleteAssetFolder(id) {
    var folder = state.data.library.find(function (item) { return String(item.id) === String(id) && item.item_type === 'folder'; });
    if (!folder) return;
    var hasChildren = state.data.items.some(function (item) { return !item.deleted_at && String(item.parent_id || '') === String(id); });
    if (hasChildren) { alert('폴더 안의 자료와 하위 폴더를 먼저 비워주세요.'); return; }
    if (!window.confirm('“' + String(folder.title || '폴더') + '” 폴더를 삭제할까요?')) return;
    var category = assetCategory(folder);
    softDelete('workspace_items?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()))
      .then(function () { removeWorkspaceItemsLocal([id]); state.assetFolder = null; state.assetFilter = category; renderContent(); if (typeof window.toast === 'function') window.toast('폴더를 삭제했습니다.'); }).catch(saveError);
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
        state.data.items.forEach(function (item) { if (String(item.id) === dragging.id) item.parent_id = String(folderId); });
        rebuildWorkspaceDerived(); renderContent();
        if (typeof window.toast === 'function') window.toast('폴더로 이동했습니다.');
      }).catch(saveError);
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
      var row = { id: id, owner_id: owner, parent_id: parent, item_type: 'file', title: file.name, storage_path: path, mime_type: file.type || null, extension: ext || null, file_size: file.size, visibility: 'private', legacy_payload: { workspace_category: category }, created_at: new Date().toISOString() };
      return fetch(window.db.url('/storage/v1/object/myspace/' + path.split('/').map(encodeURIComponent).join('/')), { method: 'POST', headers: { apikey: window.db.key, Authorization: 'Bearer ' + token, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' }, body: file }).then(function (response) {
        if (!response.ok) throw new Error(file.name + ' 업로드 실패');
        return write('workspace_items', row).then(function () { return row; });
      });
    })).then(function (rows) { rows.forEach(upsertWorkspaceItem); state.assetFilter = category; state.assetFolder = parent; renderContent(); if (typeof window.toast === 'function') window.toast(assetCategoryLabel(category) + '에 파일 ' + list.length + '개를 추가했습니다.'); }).catch(saveError);
  }
  function addCustomer() {
    var statuses = ['신규DB', '상담중', '청약완료', '유지', '변경', '보험금청구', '보류', '종결'];
    var form = '<div class="pw-consult-registration pw-customer-registration"><div class="pw-consult-form-grid">'
      + formField('청약일자', '<input id="pwf-customer-date" type="date" required value="' + ymd(new Date()) + '" onchange="OSPersonalWorkspace.refreshCustomerInsuranceAge()">')
      + formField('이름', '<input id="pwf-customer-name" required autocomplete="name">')
      + formField('성별', '<div class="pw-gender"><label><input type="radio" name="pwf-customer-gender" value="남">남</label><label><input type="radio" name="pwf-customer-gender" value="여">여</label></div>')
      + formField('생년월일', '<div class="pw-birth-age"><input id="pwf-customer-birth" type="text" inputmode="numeric" maxlength="10" placeholder="YYYY-MM-DD" oninput="OSPersonalWorkspace.formatBirthInput(this,\'customer\')"><span id="pwf-customer-insurance-age">보험나이 -</span></div>')
      + formField('전화번호', '<input id="pwf-customer-phone" inputmode="numeric" autocomplete="tel" oninput="OSPersonalWorkspace.formatConsultPhone(this)">')
      + formField('고객상태', '<select id="pwf-customer-status">' + statuses.map(function (entry) { return '<option>' + entry + '</option>'; }).join('') + '</select>') + '</div>'
      + '<div class="pw-customer-extra"><section><h3>주소 정보</h3><div class="pw-customer-address"><input id="pwf-customer-zip" placeholder="우편번호" readonly><input id="pwf-customer-address" placeholder="주소" readonly><button type="button" class="pw-btn" onclick="OSPersonalWorkspace.searchCustomerAddress()">주소검색</button></div><input id="pwf-customer-address-detail" placeholder="동·호수 등 상세 주소 (주소 선택 후 입력)"></section><section><h3>인수 정보</h3><div class="pw-customer-underwriting">' + formField('직업', '<input id="pwf-customer-job" placeholder="예: 사무직 / 운전직 / 농업">') + formField('약복용', '<select id="pwf-customer-medication"><option value="">선택</option><option>복용 중</option><option>복용 안 함</option><option>과거 복용</option></select>') + formField('병력', '<input id="pwf-customer-history" placeholder="예: 갑상선 결절 / 고혈압 / 당뇨">') + formField('진단시기', '<input id="pwf-customer-diagnosis" placeholder="예: 2025년 3월">') + formField('현재상태', '<input id="pwf-customer-current-status" placeholder="예: 추적관찰 중 / 수술 완료">') + '</div></section></div>'
      + '<div class="pw-consult-editor">' + formField('고객내용', richEditorField('pwf-customer-note', '')) + '</div></div>';
    resetRichPending(); dialog(formShell('고객 등록', form, 'OSPersonalWorkspace.saveCustomer()')); refreshCustomerInsuranceAge();
  }
  function customerOptions() { return state.data.customers.map(function (item) { return '<option value="' + esc(item.id) + '">' + esc(item.name || '이름 없음') + '</option>'; }).join(''); }
  function consultationForm(item, customer) {
    item = item || {}; customer = customer || {}; var profile = customerProfile(customer), date = String(item.consulted_at || ymd(new Date())).slice(0, 10), status = consultationStatus(item, customer);
    var statuses = ['예약', '진행중', '제안서발송', '클로징', '청약완료', '보류', '종결'];
    return '<div class="pw-consult-registration"><div class="pw-consult-form-grid">' + formField('등록일자', '<input id="pwf-consult-date" type="date" required value="' + esc(date) + '" onchange="OSPersonalWorkspace.refreshInsuranceAge()">')
      + formField('이름', '<input id="pwf-consult-name" required autocomplete="name" value="' + esc(customer.name || '') + '">')
      + formField('성별', '<div class="pw-gender"><label><input type="radio" name="pwf-consult-gender" value="남"' + (profile.gender === '남' ? ' checked' : '') + '>남</label><label><input type="radio" name="pwf-consult-gender" value="여"' + (profile.gender === '여' ? ' checked' : '') + '>여</label></div>')
      + formField('생년월일', '<div class="pw-birth-age"><input id="pwf-consult-birth" type="text" inputmode="numeric" maxlength="10" placeholder="YYYY-MM-DD" value="' + esc(profile.birth_date || '') + '" oninput="OSPersonalWorkspace.formatBirthInput(this,\'form\')"><span id="pwf-insurance-age">보험나이 -</span></div>')
      + formField('전화번호', '<input id="pwf-consult-phone" inputmode="numeric" autocomplete="tel" value="' + esc(phoneText(customer.phone || customer.phone_raw || '')) + '" oninput="OSPersonalWorkspace.formatConsultPhone(this)">')
      + formField('상담상태', '<select id="pwf-consult-status" onchange="OSPersonalWorkspace.consultationStatusChanged(this,\'form\')">' + statuses.map(function (entry) { return '<option value="' + entry + '"' + (entry === status ? ' selected' : '') + '>' + entry + '</option>'; }).join('') + '</select>') + '</div>'
      + '<div class="pw-consult-editor">' + formField('상담내용', richEditorField('pwf-consult-memo', item.memo || '')) + '<p class="pw-consult-editor-note">웹 주소를 붙여 넣으면 바로 열 수 있는 링크로 저장됩니다. 여러 파일을 한 번에 첨부할 수 있습니다.</p>' + consultationExistingAttachments(item.id) + '</div>'
      + '<input id="pwf-consult-customer-id" type="hidden" value="' + esc(customer.id || '') + '"><input id="pwf-consult-id" type="hidden" value="' + esc(item.id || '') + '"></div>';
  }
  function consultationAttachmentRoot(consultationId) { return (state.data.items || []).find(function (entry) { var payload = entry.legacy_payload || {}; return payload.workspace_category === 'consultation' && payload.attachment_root === true && String(payload.consultation_id || '') === String(consultationId || ''); }); }
  function consultationExistingAttachments(consultationId) { var root = consultationAttachmentRoot(consultationId); if (!root) return ''; var files = (state.data.items || []).filter(function (entry) { return String(entry.parent_id || '') === String(root.id); }); if (!files.length) return ''; return '<div class="pw-consult-existing"><strong>기존 첨부파일 ' + files.length + '개</strong>' + files.map(function (file) { return '<a href="#" data-storage-path="' + esc(file.storage_path || '') + '" data-file-title="' + esc(file.title || '첨부파일') + '" data-file-mime="' + esc(file.mime_type || '') + '">' + esc(file.title || '첨부파일') + '<small>' + formatBytes(file.file_size) + '</small></a>'; }).join('') + '</div>'; }
  function addConsultation(customerId) { resetRichPending(); var customer = state.data.customers.find(function (entry) { return String(entry.id) === String(customerId || ''); }) || {}; dialog(formShell('상담 등록', consultationForm(null, customer), 'OSPersonalWorkspace.saveConsultation()')); refreshInsuranceAge(); }
  function editConsultation(id) { var item = state.data.consultations.find(function (entry) { return String(entry.id) === String(id); }); if (!item) return; resetRichPending(); var customer = state.data.customers.find(function (entry) { return String(entry.id) === String(item.customer_id); }) || {}; dialog(formShell('상담 수정', consultationForm(item, customer), 'OSPersonalWorkspace.saveConsultation()')); refreshInsuranceAge(); hydrateRichStorage(); }
  function refreshInsuranceAge() { var target = document.getElementById('pwf-insurance-age'); if (!target) return; var age = insuranceAge(value('pwf-consult-birth'), value('pwf-consult-date')); target.textContent = '보험나이 ' + (age === '' ? '-' : age + '세'); }
  function refreshCustomerInsuranceAge() { var target = document.getElementById('pwf-customer-insurance-age'); if (!target) return; var age = insuranceAge(value('pwf-customer-birth'), value('pwf-customer-date')); target.textContent = '보험나이 ' + (age === '' ? '-' : age + '세'); }
  function searchCustomerAddress() { function openPostcode() { try { new window.daum.Postcode({ oncomplete: function (data) { var zip = document.getElementById('pwf-customer-zip'), address = document.getElementById('pwf-customer-address'), detail = document.getElementById('pwf-customer-address-detail'); if (zip) zip.value = data.zonecode || data.postcode || ''; if (address) address.value = data.roadAddress || data.jibunAddress || data.address || ''; if (detail) detail.focus(); } }).open(); } catch (_) { if (typeof window.toast === 'function') window.toast('주소검색을 열지 못했습니다.'); } } if (window.daum && window.daum.Postcode) return openPostcode(); var old = document.getElementById('daum-postcode-sdk'); if (old) return; var script = document.createElement('script'); script.id = 'daum-postcode-sdk'; script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'; script.onload = openPostcode; script.onerror = function () { if (typeof window.toast === 'function') window.toast('주소검색을 불러오지 못했습니다.'); }; document.head.appendChild(script); }
  function formatBirthInput(input, context) { if (!input) return; var raw = String(input.value || '').replace(/\D/g, '').slice(0, 8), formatted = raw; if (raw.length > 4) formatted = raw.slice(0, 4) + '-' + raw.slice(4); if (raw.length > 6) formatted = raw.slice(0, 4) + '-' + raw.slice(4, 6) + '-' + raw.slice(6); input.value = formatted; if (context === 'detail') refreshDetailInsuranceAge(); else if (context === 'customer') refreshCustomerInsuranceAge(); else refreshInsuranceAge(); }
  function formatConsultPhone(input) { if (input) input.value = phoneText(input.value); }
  function addEvent(date) { dialog(formShell('일정 추가', formField('날짜', '<input id="pwf-event-date" type="date" required value="' + esc(date || state.selectedDate) + '">') + formField('시간', '<input id="pwf-event-time" type="time">') + formField('제목', '<input id="pwf-event-title" required autocomplete="off">') + formField('설명', '<textarea id="pwf-event-desc" rows="5"></textarea>'), 'OSPersonalWorkspace.saveEvent()')); }
  function consultationStatusChanged(select, source) { if (!select || select.value !== '예약') return; var name = value(source === 'detail' ? 'pwd-consult-name' : 'pwf-consult-name'); openReservationPopup(name); }
  function openReservationPopup(name) {
    var box = document.getElementById('pw-reservation-dialog'), body = document.getElementById('pw-reservation-body'); if (!box || !body) return;
    body.innerHTML = formShell('캘린더 일정 추가', formField('날짜', '<input id="pwr-event-date" type="date" required value="' + ymd(new Date()) + '">') + formField('시간', '<input id="pwr-event-time" type="time">') + formField('일정 제목', '<input id="pwr-event-title" required autocomplete="off" value="' + esc((name || '고객') + ' 상담 예약') + '">') + formField('일정 내용', '<textarea id="pwr-event-desc" rows="5"></textarea>'), 'OSPersonalWorkspace.saveReservationEvent()');
    var cancel = body.querySelector('.pw-form-actions .pw-btn'); if (cancel) cancel.setAttribute('onclick', 'OSPersonalWorkspace.closeReservationPopup()');
    if (!box.open && box.showModal) box.showModal(); else if (!box.open) box.setAttribute('open', '');
  }
  function closeReservationPopup() { var box = document.getElementById('pw-reservation-dialog'); if (box && box.close) box.close(); else if (box) box.removeAttribute('open'); }
  function saveReservationEvent() { var date = value('pwr-event-date'), title = value('pwr-event-title'); if (!date || !title) return; writeOne('workspace_tasks', { task_date: date, task_time: value('pwr-event-time') || null, title: title, description: value('pwr-event-desc') || null, owner_id: currentUserId() }).then(function (created) { upsertTask(created); state.selectedDate = date; state.cursor = parseDate(date); closeReservationPopup(); rebuildWorkspaceDerived(); renderContent(); if (typeof window.toast === 'function') window.toast('캘린더에 상담 예약을 추가했습니다.'); }).catch(saveError); }
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
  function saveRichChildren(rows) { return Promise.all((rows || []).map(function (rowBody) { var stamped = Object.assign({ created_at: new Date().toISOString() }, rowBody); return write('workspace_items', stamped).then(function () { upsertWorkspaceItem(stamped); return stamped; }); })); }
  function saveAsset() {
    var type = value('pwf-asset-type'), title = value('pwf-title'), body = richValue('pwf-body'), link = value('pwf-link'), category = type === 'note' ? 'note' : type === 'memo' ? 'memo' : 'file';
    if (!title) { alert('제목을 입력해 주세요.'); return; }
    if (!richHasText(body) && !(type === 'link' && link)) { alert('내용을 입력해 주세요.'); return; }
    var parent = state.assetFolder && currentAssetCategory() === category ? state.assetFolder : null, itemId = crypto.randomUUID();
    prepareRichUploads(itemId, body, category).then(function (prepared) {
      var row = { id: itemId, owner_id: currentUserId(), parent_id: parent, item_type: type === 'note' ? 'note' : type === 'memo' ? 'memo' : 'link', title: title, body: prepared.body, url: link || null, visibility: value('pwf-visibility') === 'public' ? 'public' : 'private', legacy_payload: { workspace_category: category }, created_at: new Date().toISOString() };
      return write('workspace_items', row).then(function () { return saveRichChildren(prepared.rows); }).then(function () { return row; });
    }).then(function (row) { state.assetFilter = category; state.assetFolder = parent; upsertWorkspaceItem(row); resetRichPending(); finishSave('자료를 저장했습니다.'); }).catch(saveError);
  }
  function saveCustomer() { var name = value('pwf-customer-name'), phone = phoneText(value('pwf-customer-phone')), note = richValue('pwf-customer-note'), contractDate = value('pwf-customer-date'), birth = value('pwf-customer-birth'), genderInput = document.querySelector('input[name="pwf-customer-gender"]:checked'), gender = genderInput ? genderInput.value : ''; if (!name || !contractDate) return; var profile = { customer_managed: true, contract_date: contractDate, birth_date: birth || null, gender: gender || null, zip: value('pwf-customer-zip') || null, address: value('pwf-customer-address') || null, address_detail: value('pwf-customer-address-detail') || null, job: value('pwf-customer-job') || null, medication: value('pwf-customer-medication') || null, medical_history: value('pwf-customer-history') || null, diagnosis_date: value('pwf-customer-diagnosis') || null, current_condition: value('pwf-customer-current-status') || null, note: sanitizeRich(note) }; writeOne('workspace_customers', { owner_id: currentUserId(), name: name, phone: phone || null, status: value('pwf-customer-status') || '청약완료', profile: profile }).then(function (customer) { return saveCustomerRich(customer, profile, note); }).then(function (customer) { upsertCustomer(customer); resetRichPending(); finishSave('고객을 등록했습니다.'); }).catch(saveError); }
  function saveCustomerRich(customer, profile, body) { var hasPending = state.pendingRichImages.length || state.pendingRichFiles.length; if (!hasPending) return Promise.resolve(customer); var rootId = crypto.randomUUID(), rootBody = { id: rootId, owner_id: currentUserId(), item_type: 'memo', title: '고객 첨부 · ' + customer.id, body: sanitizeRich(body), visibility: 'private', legacy_payload: { workspace_category: 'customer', customer_id: customer.id, attachment_root: true } }; return writeOne('workspace_items', rootBody).then(function () { return prepareRichUploads(rootId, body, 'customer'); }).then(function (prepared) { return saveRichChildren(prepared.rows).then(function () { var updatedProfile = Object.assign({}, profile, { note: prepared.body }); return updateOne('workspace_customers?id=eq.' + encodeURIComponent(customer.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { profile: updatedProfile }); }); }); }
  function saveConsultation() {
    var customerId = value('pwf-consult-customer-id'), consultationId = value('pwf-consult-id'), name = value('pwf-consult-name'), birth = value('pwf-consult-birth'), date = value('pwf-consult-date'), phone = phoneText(value('pwf-consult-phone')), status = value('pwf-consult-status'), memo = richValue('pwf-consult-memo');
    var genderInput = document.querySelector('input[name="pwf-consult-gender"]:checked'), gender = genderInput ? genderInput.value : '';
    if (!name || !date || !richHasText(memo)) return;
    var existing = state.data.customers.find(function (entry) { return String(entry.id) === String(customerId); }) || {}, profile = Object.assign({}, customerProfile(existing), { birth_date: birth || null, gender: gender || null });
    var customerBody = { owner_id: currentUserId(), name: name, phone: phone || null, status: status || '예약', profile: profile };
    var customerPromise = customerId ? updateOne('workspace_customers?id=eq.' + encodeURIComponent(customerId) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), customerBody) : writeOne('workspace_customers', customerBody);
    customerPromise.then(function (customer) {
      upsertCustomer(customer);
      var content = consultationId ? memo : '<p><strong>[' + esc(writtenAt()) + ']</strong></p>' + memo;
      var consultationBody = { customer_id: customer.id, owner_id: currentUserId(), consulted_at: date + 'T00:00:00+09:00', channel: status || '예약', content: content };
      return consultationId ? updateOne('workspace_consultations?id=eq.' + encodeURIComponent(consultationId) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), consultationBody) : writeOne('workspace_consultations', consultationBody);
    }).then(function (saved) { return saveConsultationRich(saved, saved.content || memo).then(function (content) { if (content === saved.content) return saved; return updateOne('workspace_consultations?id=eq.' + encodeURIComponent(saved.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { content: content }); }); }).then(function (saved) { upsertConsultation(saved); state.selectedConsultation = saved.id; resetRichPending(); finishSave(consultationId ? '상담을 수정했습니다.' : '상담을 등록했습니다.'); }).catch(saveError);
  }
  function saveConsultationRich(consultation, body) { var root = consultationAttachmentRoot(consultation.id), hasPending = state.pendingRichImages.length || state.pendingRichFiles.length; if (!root && !hasPending) return Promise.resolve(body); var rootId = root ? root.id : crypto.randomUUID(), rootBody = { id: rootId, owner_id: currentUserId(), item_type: 'memo', title: '상담 첨부 · ' + consultation.id, body: sanitizeRich(body), visibility: 'private', legacy_payload: { workspace_category: 'consultation', consultation_id: consultation.id, attachment_root: true } }; var ready = root ? Promise.resolve(root) : writeOne('workspace_items', rootBody); return ready.then(function () { return prepareRichUploads(rootId, body, 'consultation'); }).then(function (prepared) { return updateOne('workspace_items?id=eq.' + encodeURIComponent(rootId) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { body: prepared.body }).then(function () { return saveRichChildren(prepared.rows); }).then(function () { return prepared.body; }); }); }
  function selectConsultation(id) { state.selectedConsultation = id && String(state.selectedConsultation) !== String(id) ? id : null; renderContent(); }
  function trashCustomer(id) {
    if (!id || !window.confirm('이 고객을 휴지통으로 이동할까요? 상담기록은 보존되며 복원하면 다시 표시됩니다.')) return;
    softDelete('workspace_customers?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()) + '&deleted_at=is.null').then(function () {
      moveCustomerToTrashLocal(id);
      state.selectedConsultation = null;
      closeDialog(); renderContent();
      if (typeof window.toast === 'function') window.toast('고객을 휴지통으로 이동했습니다.');
    }).catch(saveError);
  }
  function restoreCustomer(id) {
    if (!id) return;
    updateOne('workspace_customers?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { deleted_at: null }).then(function (restored) {
      restoreCustomerFromTrashLocal(restored);
      renderContent();
      if (typeof window.toast === 'function') window.toast('고객을 복원했습니다.');
    }).catch(saveError);
  }
  function refreshDetailInsuranceAge() { var target = document.getElementById('pwd-insurance-age'); if (!target) return; var age = insuranceAge(value('pwd-consult-birth'), value('pwd-consult-date')); target.textContent = age === '' ? '-' : age + '세'; }
  function saveConsultationDetail(id) {
    var item = state.data.consultations.find(function (entry) { return String(entry.id) === String(id); }); if (!item) return;
    var customer = state.data.customers.find(function (entry) { return String(entry.id) === String(item.customer_id); }); if (!customer) return;
    var name = value('pwd-consult-name'), birth = value('pwd-consult-birth'), date = value('pwd-consult-date'), phone = phoneText(value('pwd-consult-phone')), status = value('pwd-consult-status'), addition = value('pwd-consult-new');
    var genderInput = document.querySelector('input[name="pwd-consult-gender"]:checked'), gender = genderInput ? genderInput.value : '';
    if (!name || !date) return;
    var customValues = Object.assign({}, customerProfile(customer).custom_fields || {}); document.querySelectorAll('[data-consult-custom]').forEach(function (input) { customValues[input.getAttribute('data-consult-custom')] = String(input.value || '').trim(); });
    var profile = Object.assign({}, customerProfile(customer), { birth_date: birth || null, gender: gender || null, custom_fields: customValues });
    var content = sanitizeRich(item.memo || ''); if (addition) content += '<p><strong>[' + esc(writtenAt()) + ']</strong> ' + esc(addition).replace(/\n/g, '<br>') + '</p>';
    Promise.all([
      updateOne('workspace_customers?id=eq.' + encodeURIComponent(customer.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { name: name, phone: phone || null, status: status || '예약', profile: profile }),
      updateOne('workspace_consultations?id=eq.' + encodeURIComponent(item.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { consulted_at: date + 'T00:00:00+09:00', channel: status || '예약', content: content })
    ]).then(function (results) { upsertCustomer(results[0]); upsertConsultation(results[1]); finishSave('상담을 저장했습니다.'); }).catch(saveError);
  }
  function saveEvent() { var date = value('pwf-event-date'), title = value('pwf-event-title'); if (!date || !title) return; writeOne('workspace_tasks', { task_date: date, task_time: value('pwf-event-time') || null, title: title, description: value('pwf-event-desc') || null, owner_id: currentUserId() }).then(function (created) { upsertTask(created); state.selectedDate = date; state.cursor = parseDate(date); finishSave('일정을 추가했습니다.'); }).catch(saveError); }
  function moveCalendar(direction) {
    if (state.calendarMode === 'month') state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + direction, 1);
    else { var step = state.calendarMode === 'day' ? 1 : state.calendarMode === 'week' ? 7 : 365; state.selectedDate = addDays(state.selectedDate, direction * step); state.cursor = parseDate(state.selectedDate); }
    renderContent(); setUrl(false);
  }
  function selectDate(date) { state.selectedDate = date; renderContent(); setUrl(false); }
  function restoreFromUrl() { var p = new URLSearchParams(location.search); if (p.get('view') !== 'personal-workspace') return false; var section = p.get('section'); if (SECTIONS.indexOf(section) >= 0) state.section = section; var mode = p.get('mode'); if (['day', 'week', 'month', 'agenda'].indexOf(mode) >= 0) state.calendarMode = mode; var date = p.get('date'); if (/^\d{4}-\d{2}-\d{2}$/.test(date || '')) { state.selectedDate = date; state.cursor = parseDate(date); } return true; }
  function boot() { var localTest = isLocal() && new URLSearchParams(location.search).get('pwtest') === '1'; if (STANDALONE && !authenticated() && !localTest) { renderStandaloneGate('login'); return; } if (!ensureShell()) return; restoreFromUrl(); if (localTest) { state.data = { items: [], library: [{ id: 'l1', title: '고객 보장자료', description: '고객상담 자료', created_at: '2026-08-14', scope: 'personal' }], scripts: [{ id: 's1', title: '상담 업무노트', script_text: '<p>한글 검색 확인</p>', created_at: '2026-08-13', scope: 'personal' }], events: [{ id: 'e1', title: '김고객 상담', description: '갱신 상담', event_date: ymd(new Date()), event_time: '10:00' }], customers: [{ id: 'c1', name: '김고객', phone: '010-1234-5678', status: '상담중', created_at: '2026-08-10', profile: { customer_managed: true } }], consultations: [{ id: 'co1', customer_id: 'c1', memo: '보장 상담 완료', channel: '전화', consulted_at: '2026-08-13' }] }; readFavoritesFromStorage(); if (!state.favorites.length) state.favorites = [{ target_type: 'customer', target_id: 'c1', title: '김고객', subtitle: '010-1234-5678', sort_order: 0, created_at: new Date().toISOString() }]; state.status = 'ready'; state.loadedFor = 'local-test'; state.fullLoaded = true; renderShell(); return; } openWorkspace(state.section, false); }

  restoreFromUrl();
  document.addEventListener('appstate:ready', function () { if (!allowed()) { if (STANDALONE) renderStandaloneGate('denied'); return; } if (!document.getElementById('v-personal-workspace')) ensureShell(); restoreFromUrl(); openWorkspace(state.section, false); });
  window.addEventListener('popstate', function () { if (!allowed() || !restoreFromUrl()) return; openWorkspace(state.section, false); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && state.preview) closePreview(); else if (state.preview && state.preview.type === 'pdf' && event.key === 'ArrowRight') previewPage(1); else if (state.preview && state.preview.type === 'pdf' && event.key === 'ArrowLeft') previewPage(-1); });
  document.addEventListener('click', function (event) { var menu = document.getElementById('pw-preview-ddak-menu'); if (menu && !menu.hidden && !menu.contains(event.target) && !event.target.closest('.pw-preview-ddak')) closeDdakMenu(); });
  window.addEventListener('load', function () { window.setTimeout(boot, 350); });
  window.OSPersonalWorkspace = {
    boot: boot, go: go, legacy: legacy, reload: function () { loadData(true); },
    loadMoreAssets: function () { state.assetsRenderLimit += LIST_PAGE_SIZE; renderContent(); },
    loadMoreCustomers: function () { state.customersRenderLimit += LIST_PAGE_SIZE; renderContent(); },
    loadMoreConsultations: function () { state.consultationsRenderLimit += LIST_PAGE_SIZE; renderContent(); },
    filterAssets: function (filter) { state.assetFilter = filter; state.assetFolder = null; state.assetsRenderLimit = LIST_PAGE_SIZE; renderContent(); },
    setAssetView: function (view) { if (['list', 'thumb', 'large'].indexOf(view) < 0) return; state.assetView = view; localStorage.setItem('ws_asset_view', view); renderContent(); },
    openAssetFolder: function (id) { var folder = state.data.library.find(function (item) { return String(item.id) === String(id) && item.item_type === 'folder'; }); state.assetFolder = id || null; state.assetFilter = folder ? assetCategory(folder) : 'file'; state.assetsRenderLimit = LIST_PAGE_SIZE; renderContent(); },
    openAssetRoot: function (category) { state.assetFolder = null; state.assetFilter = ['note', 'file', 'memo'].indexOf(category) >= 0 ? category : 'all'; state.assetsRenderLimit = LIST_PAGE_SIZE; renderContent(); },
    showAsset: showAsset, openFilePreview: openFilePreview, openAssetPreview: openAssetPreview, openUrlPreview: openPreviewUrl, closePreview: closePreview, previewZoom: previewZoom, previewRotate: previewRotate, previewPage: previewPage, toggleDdakMenu: toggleDdakMenu, closeDdakMenu: closeDdakMenu, previewCopy: previewCopy, editAsset: editAsset, saveAssetEdit: saveAssetEdit, deleteAsset: deleteAsset, richCommand: richCommand, focusRich: focusRich, focusRichBody: focusRichBody, prepareRichFocus: prepareRichFocus, addRichImages: addRichImages, addRichFiles: addRichFiles, removeRichFile: removeRichFile, showCustomer: showCustomer, showEvent: showEvent, toggleFavorite: toggleFavorite, openFavorite: openFavorite,
    closeDialog: closeDialog, addAsset: function () { closeAssetMenu(); addAsset(); }, saveAsset: saveAsset, openVault: openVault, newFolder: newFolder, uploadFiles: uploadFiles, newAssetFolder: newAssetFolder, saveAssetFolder: saveAssetFolder, deleteAssetFolder: deleteAssetFolder, uploadAssetFiles: uploadAssetFiles, confirmAssetFileUpload: confirmAssetFileUpload,
    assetDragStart: assetDragStart, assetDragEnd: assetDragEnd, assetDragOver: assetDragOver, assetDragLeave: assetDragLeave, assetDrop: assetDrop,
    addCustomer: addCustomer, saveCustomer: saveCustomer, searchCustomerAddress: searchCustomerAddress, filterCustomerStatus: function (status) { state.customerStatusFilter = status || 'all'; state.customersRenderLimit = LIST_PAGE_SIZE; renderContent(); }, refreshCustomerInsuranceAge: refreshCustomerInsuranceAge, addConsultation: addConsultation, editConsultation: editConsultation, saveConsultation: saveConsultation, selectConsultation: selectConsultation, filterConsultationStatus: function (status) { state.consultationStatusFilter = status || 'all'; state.selectedConsultation = null; state.consultationsRenderLimit = LIST_PAGE_SIZE; renderContent(); }, manageConsultColumns: manageConsultColumns, addConsultColumn: addConsultColumn, moveConsultColumn: moveConsultColumn, deleteConsultColumn: deleteConsultColumn, saveConsultationDetail: saveConsultationDetail, trashCustomer: trashCustomer, restoreCustomer: restoreCustomer, refreshInsuranceAge: refreshInsuranceAge, refreshDetailInsuranceAge: refreshDetailInsuranceAge, formatBirthInput: formatBirthInput, formatConsultPhone: formatConsultPhone, consultationStatusChanged: consultationStatusChanged, closeReservationPopup: closeReservationPopup, saveReservationEvent: saveReservationEvent, addEvent: addEvent, saveEvent: saveEvent, richPaste: richPaste,
    setCalendarMode: function (mode) { state.calendarMode = mode; renderContent(); setUrl(false); },
    moveCalendar: moveCalendar, calendarToday: function () { state.selectedDate = ymd(new Date()); state.cursor = new Date(); renderContent(); setUrl(false); }, selectDate: selectDate,
    __testLoad: function (data) { if (!isLocal()) return; state.data = data; state.status = 'ready'; state.loadedFor = 'local-test'; renderShell(); }
  };
})();
