(function () {
  'use strict';

  var PILOT_ID = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';
  var TEST_EMAIL = 'bylts0428+codex-workstation-20260815@gmail.com';
  var CONSULT_BASE_COLUMNS = [{ key: 'date', label: '등록일자', width: 86 }, { key: 'name', label: '이름', width: 88 }, { key: 'birth', label: '생년월일', width: 92 }, { key: 'genderAge', label: '성별(보험나이)', width: 104 }, { key: 'phone', label: '전화번호', width: 116 }, { key: 'summary', label: '상담내용', width: 360, flex: true }, { key: 'status', label: '상담상태', width: 102 }];
  var CONSULT_STAGES = [{ key: '예약', color: '#5f6368' }, { key: '진행중', color: '#1a73e8' }, { key: '제안서발송', color: '#8430ce' }, { key: '클로징', color: '#e8710a' }, { key: '청약완료', color: '#1e8e3e' }, { key: '보류', color: '#f9ab00' }, { key: '종결', color: '#80868b' }];
  var CUSTOMER_STAGES = [{ key: '청약완료', color: '#1e8e3e' }, { key: '철회', color: '#d93025' }, { key: '실효', color: '#5f6368' }, { key: '부활', color: '#1a73e8' }];
  var SCRIPT_STAGES = [
    { label: '도입 인사', stage: 'opening', group: 'open' },
    { label: '도입 반론', stage: 'opening_rejection', group: 'open' },
    { label: '필요성 ①', stage: 'need_emphasis', group: 'mid' },
    { label: '상황 확인', stage: 'situation_check', group: 'mid' },
    { label: '보장 분석', stage: 'analysis', group: 'mid' },
    { label: '상품 설명', stage: 'product', group: 'mid' },
    { label: '필요성 ②', stage: 'need_emphasis_2', group: 'mid' },
    { label: '클로징', stage: 'closing', group: 'close' },
    { label: '반론 대응', stage: 'objection', group: 'close' },
    { label: '2차 클로징', stage: 'closing_second', group: 'close' }
  ];
  var SCRIPT_GROUP_COLORS = { open: '#6366F1', mid: '#4F8DDA', close: '#E89A3C' };
  var STANDALONE = document.documentElement.getAttribute('data-workstation') === 'true';
  var SECTIONS = ['home', 'assets', 'customers', 'consultations', 'calendar', 'scripts', 'newsletters', 'trash', 'archive'];
  var LIST_PAGE_SIZE = 200;
  var state = {
    section: 'home', assetFilter: 'all', assetView: localStorage.getItem('ws_asset_view') || 'list', assetFolder: null, consultationStatusFilter: 'all', customerStatusFilter: 'all', query: '', composing: false, searchTimer: 0,
    consultNameQuery: '', consultNameComposing: false, consultNameTimer: 0, customerNameQuery: '', customerNameComposing: false, customerNameTimer: 0,
    calendarMode: 'month', selectedDate: ymd(new Date()), selectedConsultation: null, selectedCustomerDetail: null, cursor: new Date(),
    scriptsData: null, scriptsLoading: false, scriptsStage: 'opening', scriptsOpenId: null,
    newsData: null, newsLoading: false, newsPool: 'all', newsScope: 'all', newsCoSel: null, newsOpenMonths: {},
    newsCoNameQuery: '', newsCoNameComposing: false, newsCoNameTimer: 0,
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
    return "&or=(legacy_source.is.null,and(legacy_source.in.(library,scripts,myspace_folders,myspace_files,scripts_attachment),or(legacy_payload->>scope.is.null,legacy_payload->>scope.eq.personal)))";
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
  function latestConsultationMemo(customerId) {
    var latest = null;
    state.data.consultations.forEach(function (entry) {
      if (String(entry.customer_id) !== String(customerId)) return;
      if (!latest || String(entry.consulted_at || entry.created_at || '') > String(latest.consulted_at || latest.created_at || '')) latest = entry;
    });
    return latest ? (latest.memo || '') : '';
  }
  function isRealCustomerStage(status) { return CUSTOMER_STAGES.some(function (stage) { return stage.key === status; }); }
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
    state.data.events = state.data.events.map(function (item) { return Object.assign({}, item, { event_date: item.task_date, event_time: item.task_time, event_end_date: item.end_date || item.task_date, event_end_time: item.end_time || null }); });
    state.data.consultations = state.data.consultations.map(function (item) { return Object.assign({}, item, { memo: item.content }); });
    if (state.fullLoaded) pruneFavorites();
  }
  function pruneFavorites() {
    if (!state.favorites.length) return;
    var kept = state.favorites.filter(function (entry) { return !!resolveFavorite(entry.target_type, entry.target_id); });
    if (kept.length !== state.favorites.length) { state.favorites = kept; saveFavorites(); }
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
      api('workspace_tasks?owner_id=eq.' + id + '&deleted_at=is.null&order=task_date.desc&limit=2000&select=id,owner_id,customer_id,title,description,task_date,task_time,end_date,end_time,completed_at,legacy_source,legacy_id,created_at,deleted_at'),
      api('workspace_customers?owner_id=eq.' + id + '&deleted_at=is.null&order=created_at.desc&limit=2000&select=id,owner_id,name,phone,status,profile,created_at,updated_at,deleted_at'),
      api('workspace_consultations?owner_id=eq.' + id + '&order=consulted_at.desc&limit=2000&select=id,owner_id,customer_id,content,channel,consulted_at,created_at,updated_at'),
      api('workspace_customers?owner_id=eq.' + id + '&deleted_at=not.is.null&order=deleted_at.desc&limit=2000&select=id,owner_id,name,phone,status,profile,created_at,updated_at,deleted_at')
    ] : [
      api('workspace_items?owner_id=eq.' + id + '&deleted_at=is.null' + itemScope + '&order=created_at.desc&limit=5&select=' + itemSelect),
      api('workspace_tasks?owner_id=eq.' + id + '&deleted_at=is.null&or=(and(task_date.lte.' + today + ',end_date.gte.' + today + '),and(task_date.eq.' + today + ',end_date.is.null))&order=task_time.asc&limit=20&select=id,owner_id,customer_id,title,description,task_date,task_time,end_date,end_time,completed_at,legacy_source,legacy_id,created_at,deleted_at'),
      api('workspace_items?owner_id=eq.' + id + '&deleted_at=is.null&legacy_payload->>setting_key=eq.favorites&limit=1&select=' + itemSelect),
      api('workspace_consultations?owner_id=eq.' + id + '&order=consulted_at.desc&limit=5&select=id,owner_id,customer_id,content,channel,consulted_at,created_at,updated_at,workspace_customers(id,name,phone,status)'),
      api('workspace_customers?owner_id=eq.' + id + '&deleted_at=is.null&order=updated_at.desc&limit=30&select=id,owner_id,name,phone,status,profile,created_at,updated_at,deleted_at')
    ];
    state.loadPromise = Promise.allSettled(requests).then(function (results) {
      if (requestId !== state.requestId) return false;
      var names = full ? ['items', 'events', 'customers', 'consultations', 'trashCustomers'] : ['items', 'events', 'favoriteSettings', 'consultations', 'customers'];
      var failed = [];
      results.forEach(function (result, index) {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          if (names[index] === 'favoriteSettings') state.data.items = state.data.items.concat(result.value.filter(function (setting) { return !state.data.items.some(function (item) { return String(item.id) === String(setting.id); }); }));
          else state.data[names[index]] = result.value;
        }
        else failed.push(names[index]);
      });
      state.loadedFor = userId;
      state.fullLoaded = full;
      rebuildWorkspaceDerived();
      state.status = failed.length ? 'partial' : 'ready';
      state.error = failed.length ? failed.join(', ') + ' 자료를 불러오지 못했습니다.' : '';
      renderContent();
      if (full && failed.indexOf('customers') < 0) syncCareTasksForAll();
      return failed.length === 0;
    }).finally(function () { if (requestId === state.requestId) { state.loadPromise = null; state.loadFull = false; } });
    return state.loadPromise;
  }

  var CALC_TOOLS = [['calculator', '계산기'], ['bmi', 'BMI 계산기'], ['insurance-age', '보험연령 계산기'], ['image-convert', '이미지 변환']];
  function navPlannedEntryHtml(entry) {
    var extra = entry[2];
    if (Array.isArray(extra)) {
      return '<details class="pw-nav-subgroup"><summary><span>' + entry[0] + '</span>' + entry[1] + '</summary>' + extra.map(function (sub) { return '<button type="button" onclick="OSPersonalWorkspace.openTool(\'' + sub[0] + '\')">' + sub[1] + '</button>'; }).join('') + '</details>';
    }
    if (typeof extra === 'string' && extra.indexOf('section:') === 0) {
      var sectionKey = extra.slice(8);
      return '<button type="button" class="pw-nav-link' + (state.section === sectionKey ? ' on' : '') + '" onclick="OSPersonalWorkspace.go(\'' + sectionKey + '\')"><span>' + entry[0] + '</span>' + entry[1] + '</button>';
    }
    if (typeof extra === 'string') {
      return '<button type="button" class="pw-nav-link" onclick="OSPersonalWorkspace.openTool(\'' + extra + '\')"><span>' + entry[0] + '</span>' + entry[1] + '</button>';
    }
    return '<button type="button" disabled><span>' + entry[0] + '</span>' + entry[1] + '</button>';
  }
  function navPlannedGroupHtml(label, entries, tone) {
    return '<details class="pw-nav-group pw-nav-group-' + tone + '"><summary>' + label + '</summary>' + entries.map(navPlannedEntryHtml).join('') + '</details>';
  }
  function navHtml() {
    var items = [['home', '⌂', '홈'], ['assets', '▤', '자료'], ['customers', '♙', '고객관리'], ['consultations', '✎', '상담관리'], ['calendar', '▦', '캘린더']];
    var refGroup = [['◫', '소식지', 'section:newsletters'], ['≡', '상품라인업'], ['✎', '스크립트', 'section:scripts'], ['↗', '영업방향']];
    var toolGroup = [['◷', '보험연령표'], ['⌗', '계산기·변환기', CALC_TOOLS], ['⇗', '원전산 바로가기', 'system-links'], ['₩', '보험회사 결제정보', 'payment-info']];
    return '<nav class="pw-nav" aria-label="내 업무 메뉴">' + items.map(function (item) {
      return '<button type="button" class="' + (state.section === item[0] ? 'on' : '') + '" onclick="OSPersonalWorkspace.go(\'' + item[0] + '\')"><span>' + item[1] + '</span>' + item[2] + '</button>';
    }).join('') + '<div class="pw-nav-planned" aria-label="준비 중인 메뉴">' + navPlannedGroupHtml('참고자료', refGroup, 'ref') + navPlannedGroupHtml('영업도구', toolGroup, 'tools') + '</div><div class="pw-nav-bottom"><button type="button" class="trash ' + (state.section === 'trash' ? 'on' : '') + '" onclick="OSPersonalWorkspace.go(\'trash\')"><span>♲</span>휴지통</button><button type="button" class="archive ' + (state.section === 'archive' ? 'on' : '') + '" onclick="OSPersonalWorkspace.go(\'archive\')">구)원세컨드</button></div></nav>';
  }
  function statusHtml() {
    if (state.status === 'waiting-auth') return '<div class="pw-state"><strong>로그인 정보를 확인하고 있습니다.</strong><span>인증이 완료되면 자료를 자동으로 불러옵니다.</span></div>';
    if (state.status === 'loading' || state.status === 'idle') return '<div class="pw-state"><strong>내 자료를 불러오는 중입니다.</strong><span>잠시만 기다려 주세요.</span></div>';
    if (state.status === 'refreshing') return '<div class="pw-sync-note">최신 자료를 동기화하고 있습니다.</div>';
    return state.error ? '<div class="pw-error" role="alert"><span>' + esc(state.error) + '</span><button class="pw-btn" onclick="OSPersonalWorkspace.reload()">다시 불러오기</button></div>' : '';
  }
  function matches(value) { var q = state.query.trim().toLocaleLowerCase('ko-KR'); return !q || String(value || '').toLocaleLowerCase('ko-KR').indexOf(q) >= 0; }
  function statFilterBarHtml(opts) {
    var chips = opts.stages.map(function (stage) {
      var on = opts.activeStatus === stage.key;
      return '<button type="button" class="pw-consult-stat' + (on ? ' on' : '') + '" style="--stat-accent:' + stage.color + '" onclick="' + opts.onStage + '(\'' + esc(stage.key) + '\')" aria-pressed="' + on + '"><strong>' + (opts.counts[stage.key] || 0) + '</strong><span>' + esc(stage.key) + '</span></button>';
    }).join('');
    var allOn = opts.activeStatus === 'all';
    chips += '<button type="button" class="pw-consult-stat all' + (allOn ? ' on' : '') + '" onclick="' + opts.onStage + '(\'all\')" aria-pressed="' + allOn + '"><strong>' + (opts.counts.all || 0) + '</strong><span>전체</span></button>';
    var clearBtn = opts.nameQuery ? '<button type="button" class="pw-consult-name-clear" onclick="OSPersonalWorkspace.clearNameSearch(\'' + opts.kind + '\')" aria-label="검색어 지우기">×</button>' : '';
    return '<div class="pw-consult-stats"><label class="pw-consult-name-search"><span aria-hidden="true">⌕</span><input id="' + opts.nameInputId + '" type="search" placeholder="' + esc(opts.namePlaceholder) + '" autocomplete="off" value="' + esc(opts.nameQuery) + '">' + clearBtn + '</label><div class="pw-consult-stat-chips" role="group" aria-label="진행 단계별 보기">' + chips + '</div></div>';
  }
  function scheduleNameSearch(kind, value) {
    var timerKey = kind + 'NameTimer', queryKey = kind + 'NameQuery', composingKey = kind + 'NameComposing', inputId = 'pw-' + kind + '-name-input';
    window.clearTimeout(state[timerKey]);
    state[timerKey] = window.setTimeout(function () {
      if (state[composingKey]) return;
      state[queryKey] = value;
      var active = document.activeElement, hadFocus = active && active.id === inputId, selStart = hadFocus ? active.selectionStart : null;
      renderContent();
      if (hadFocus) { var input = document.getElementById(inputId); if (input) { input.focus(); try { input.setSelectionRange(selStart, selStart); } catch (_) {} } }
    }, 180);
  }
  function clearNameSearch(kind) {
    window.clearTimeout(state[kind + 'NameTimer']);
    state[kind + 'NameQuery'] = '';
    renderContent();
    var input = document.getElementById('pw-' + kind + '-name-input'); if (input) input.focus();
  }
  function bindNameSearch(kind) {
    var inputId = 'pw-' + kind + '-name-input', composingKey = kind + 'NameComposing';
    var input = document.getElementById(inputId); if (!input) return;
    state[composingKey] = false;
    input.addEventListener('compositionstart', function () { state[composingKey] = true; });
    input.addEventListener('compositionend', function () { state[composingKey] = false; scheduleNameSearch(kind, input.value); });
    input.addEventListener('input', function () { if (!state[composingKey]) scheduleNameSearch(kind, input.value); });
    input.addEventListener('search', function () { if (!state[composingKey]) scheduleNameSearch(kind, input.value); });
  }
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
      var key = favoriteKey(entry.target_type, entry.target_id);
      return '<button type="button" class="pw-row pw-asset-draggable pw-folder-drop-target" draggable="true" ondragstart="OSPersonalWorkspace.favoriteDragStart(event,\'' + esc(key) + '\')" ondragover="OSPersonalWorkspace.favoriteDragOver(event,\'' + esc(key) + '\')" ondragleave="OSPersonalWorkspace.favoriteDragLeave(event)" ondrop="OSPersonalWorkspace.favoriteDrop(event,\'' + esc(key) + '\')" ondragend="OSPersonalWorkspace.favoriteDragEnd(event)" onclick="OSPersonalWorkspace.openFavorite(\'' + esc(entry.target_type) + '\',\'' + esc(entry.target_id) + '\')"><span><b>' + esc(entry.title || '(제목 없음)') + '</b><small>' + esc(favoriteSubtitle(entry)) + '</small></span><span>›</span></button>';
    }).join('') : '<div class="pw-empty"><strong>즐겨찾기가 없습니다.</strong><span>자료, 고객, 상담 옆 별표를 눌러 고정하세요.</span></div>';
  }
  function favoriteDragStart(event, key) {
    state.draggingFavorite = key;
    if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', key); }
    if (event.currentTarget) event.currentTarget.classList.add('is-dragging');
  }
  function favoriteDragEnd(event) {
    state.draggingFavorite = null;
    if (event && event.currentTarget) event.currentTarget.classList.remove('is-dragging');
    document.querySelectorAll('#v-personal-workspace .pw-favorites-panel .is-drag-over').forEach(function (el) { el.classList.remove('is-drag-over'); });
  }
  function favoriteDragOver(event, key) {
    if (!state.draggingFavorite || state.draggingFavorite === key) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    if (event.currentTarget) event.currentTarget.classList.add('is-drag-over');
  }
  function favoriteDragLeave(event) {
    if (!event.currentTarget || (event.relatedTarget && event.currentTarget.contains(event.relatedTarget))) return;
    event.currentTarget.classList.remove('is-drag-over');
  }
  function favoriteDrop(event, targetKey) {
    event.preventDefault(); event.stopPropagation();
    if (event.currentTarget) event.currentTarget.classList.remove('is-drag-over');
    var draggingKey = state.draggingFavorite; state.draggingFavorite = null;
    if (!draggingKey || draggingKey === targetKey) return;
    var fromIndex = state.favorites.findIndex(function (entry) { return favoriteKey(entry.target_type, entry.target_id) === draggingKey; });
    var toIndex = state.favorites.findIndex(function (entry) { return favoriteKey(entry.target_type, entry.target_id) === targetKey; });
    if (fromIndex < 0 || toIndex < 0) return;
    var moved = state.favorites.splice(fromIndex, 1)[0];
    state.favorites.splice(toIndex, 0, moved);
    state.favorites = state.favorites.map(function (entry, order) { return Object.assign({}, entry, { sort_order: order }); });
    saveFavorites(); renderContent();
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

  var CARE_STEPS = [[31, '+31일'], [91, '+91일'], [181, '+181일'], [365, '+365일']];
  /* 계약일 다중화(2026-08-20, 대표 확정) — profile.contract_dates(배열) 신규, profile.contract_date(단일)는 배열의 최이른 날짜와 계속 동기화(고객 목록 컬럼 등 기존 단일값 소비처는 무변경 보존).
     contractDatesOf(customer)=순수 헬퍼: contract_dates 있으면 그대로(정렬·중복제거), 없고 contract_date만 있는 기존 고객은 [contract_date]로 그 자리에서 승격(하위호환, 데이터 손실 없음). */
  function contractDatesOf(customer) {
    var profile = customerProfile(customer), arr;
    if (profile.contract_dates && Array.isArray(profile.contract_dates)) arr = profile.contract_dates.slice();
    else if (profile.contract_date) arr = [profile.contract_date];
    else arr = [];
    arr = arr.filter(function (d) { return !!d; }).map(function (d) { return String(d).slice(0, 10); });
    arr = arr.filter(function (d, i) { return arr.indexOf(d) === i; });
    arr.sort();
    return arr;
  }
  function careAnniversaryDate(base, year) {
    var source = parseDate(base), month = source.getMonth(), day = source.getDate();
    var date = new Date(year, month, day);
    if (date.getMonth() !== month) date = new Date(year, month + 1, 0);
    return ymd(date);
  }
  function careTaskTargets(customer, base) {
    var name = customer.name || '고객', phone = phoneText(customer.phone || customer.phone_raw || ''), applyLabel = '청약일자 ' + base;
    /* legacyId 충돌 방지 — 가장 이른(=customerProfile(customer).contract_date와 같은) 계약일만 옛 legacyId 포맷을 유지(기존 케어 완료·생성 이력 보존), 그 외 계약일은 '@날짜'를 붙여 유니크화 */
    var legacyBase = String(customerProfile(customer).contract_date || '').slice(0, 10);
    var suffix = base === legacyBase ? '' : '@' + base;
    var titleSuffix = suffix ? ' (청약 ' + base + ')' : '';
    var targets = [], offsetDates = {};
    CARE_STEPS.forEach(function (step) {
      var date = addDays(base, step[0]);
      offsetDates[date] = true;
      targets.push({ legacyId: customer.id + ':' + step[0] + suffix, date: date, title: name + ' 청약 ' + step[1] + ' 케어' + titleSuffix, description: name + ' 고객 ' + applyLabel + ' 기준 ' + step[1] + ' 확인 일정입니다.' + (phone ? ' 연락처: ' + phone : '') });
    });
    var contractYear = parseDate(base).getFullYear(), currentYear = new Date().getFullYear();
    for (var year = contractYear + 1; year <= currentYear + 2; year++) {
      var annivDate = careAnniversaryDate(base, year);
      if (offsetDates[annivDate]) continue;
      targets.push({ legacyId: customer.id + ':anniversary:' + year + suffix, date: annivDate, title: name + ' 청약 기념일' + titleSuffix, description: name + ' 고객 청약 기념일입니다. (' + applyLabel + ')' + (phone ? ' 연락처: ' + phone : '') });
    }
    return targets;
  }
  function syncCareTasksForCustomer(customer) {
    var bases = contractDatesOf(customer).filter(function (base) { return /^\d{4}-\d{2}-\d{2}$/.test(base); });
    if (!bases.length || !customer || !customer.id) return Promise.resolve();
    var targets = bases.reduce(function (all, base) { return all.concat(careTaskTargets(customer, base)); }, []);
    return api('workspace_tasks?owner_id=eq.' + encodeURIComponent(currentUserId()) + '&legacy_source=eq.care_auto&customer_id=eq.' + encodeURIComponent(customer.id) + '&select=id,legacy_id,task_date,description').then(function (existing) {
      var have = {}; (existing || []).forEach(function (row) { have[row.legacy_id] = row; });
      var toCreate = targets.filter(function (t) { return !have[t.legacyId]; });
      var toUpdate = targets.filter(function (t) { var row = have[t.legacyId]; return row && (row.task_date !== t.date || row.description !== t.description); });
      var creates = toCreate.map(function (t) {
        return writeOne('workspace_tasks', { owner_id: currentUserId(), customer_id: customer.id, title: t.title, description: t.description, task_date: t.date, legacy_source: 'care_auto', legacy_id: t.legacyId }).then(upsertTask).catch(function () {});
      });
      var updates = toUpdate.map(function (t) {
        return updateOne('workspace_tasks?id=eq.' + encodeURIComponent(have[t.legacyId].id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { task_date: t.date, description: t.description }).then(upsertTask).catch(function () {});
      });
      return Promise.all(creates.concat(updates));
    }).catch(function () {});
  }
  function syncCareTasksForAll() {
    var customers = state.data.customers.filter(function (c) { return isRealCustomerStage(c.status); });
    return Promise.all(customers.map(syncCareTasksForCustomer)).then(function () { rebuildWorkspaceDerived(); renderContent(); }).catch(function () {});
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
  function allEvents() { return state.data.events.concat(builtInEventsAroundCalendar()); }

  function homeHtml() {
    var today = ymd(new Date());
    var todayEvents = allEvents().filter(function (event) { return String(event.event_date || '').slice(0, 10) === today; });
    var recent = state.data.scripts.map(function (item) { return { kind: '업무노트', item: item }; })
      .concat(state.data.library.map(function (item) { return { kind: item.memo_text ? '메모' : '자료실', item: item }; }))
      .sort(function (a, b) { return String(b.item.created_at).localeCompare(String(a.item.created_at)); }).slice(0, 5);
    var customersById = {}; state.data.customers.forEach(function (customer) { customersById[customer.id] = customer; });
    var recentConsultations = state.data.consultations.filter(function (item) { return !!customersById[item.customer_id]; })
      .sort(function (a, b) { return String(b.consulted_at || b.created_at).localeCompare(String(a.consulted_at || a.created_at)); }).slice(0, 5);
    var favoritesPanel = '<section class="pw-panel pw-favorites-panel"><div class="pw-panel-head"><strong>즐겨찾기</strong></div><div class="pw-list">' + favoriteRows() + '</div></section>';
    var todayPanel = '<section class="pw-panel"><div class="pw-panel-head"><strong>오늘 일정</strong><button onclick="OSPersonalWorkspace.go(\'calendar\')">전체 보기</button></div><div class="pw-list">' + (todayEvents.length ? todayEvents.slice(0, 6).map(function (event) { return row(eventTitleLabel(event), event.description || '일정', esc(String(event.event_time || '').slice(0, 5)), 'OSPersonalWorkspace.showEvent(\'' + esc(event.id) + '\')'); }).join('') : '<div class="pw-empty">오늘 일정이 없습니다.</div>') + '</div></section>';
    var assetsPanel = '<section class="pw-panel"><div class="pw-panel-head"><strong>최근 자료</strong><button onclick="OSPersonalWorkspace.go(\'assets\')">전체 보기</button></div><div class="pw-list">' + (recent.length ? recent.map(function (entry) { return row(entry.item.title, entry.kind + ' · ' + formatDate(entry.item.created_at), '›', 'OSPersonalWorkspace.showAsset(\'' + (entry.kind === '업무노트' ? 'scripts' : 'library') + '\',\'' + esc(entry.item.id) + '\')'); }).join('') : '<div class="pw-empty">저장된 자료가 없습니다.</div>') + '</div></section>';
    var consultPanel = '<section class="pw-panel"><div class="pw-panel-head"><strong>최근 상담</strong><button onclick="OSPersonalWorkspace.go(\'consultations\')">전체 보기</button></div><div class="pw-list">' + (recentConsultations.length ? recentConsultations.map(function (item) { var customer = customersById[item.customer_id] || item.workspace_customers; return row(customer ? customer.name || '(이름 없음)' : '(고객 없음)', stripHtml(item.memo || '') || '상담내용이 없습니다.', esc(formatDate(item.consulted_at || item.created_at)), "OSPersonalWorkspace.go('consultations');OSPersonalWorkspace.selectConsultation('" + esc(item.id) + "')"); }).join('') : '<div class="pw-empty">상담 기록이 없습니다.</div>') + '</div></section>';
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
    state.data.library.forEach(function (item) { var memo = item.item_type === 'memo', folder = item.item_type === 'folder', file = item.item_type === 'file', category = assetCategory(item); items.push({ source: 'library', type: category, folder: folder, kind: folder ? '폴더' : file ? '파일' : memo ? '메모' : item.item_type === 'link' ? '링크' : item.item_type === 'note' ? '업무노트' : '자료', title: item.title, body: item.body || item.url || '', created: item.created_at, raw: item }); });
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
  function assetOpenAction(item) {
    if (item.folder) return "OSPersonalWorkspace.openAssetFolder('" + esc(item.raw.id) + "')";
    if (previewType(item.raw) && (item.raw.storage_path || item.raw.image_url)) return "OSPersonalWorkspace.openAssetPreview('" + item.source + "','" + esc(item.raw.id) + "')";
    return "OSPersonalWorkspace.showAsset('" + item.source + "','" + esc(item.raw.id) + "')";
  }
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
    var docBody = item.type === 'note' ? '<p class="pw-asset-ext">Note</p>' : item.type === 'memo' ? '<p class="pw-asset-ext">Memo</p>' : item.body ? '<p>' + esc(String(item.body).slice(0, 110)) + '</p>' : '<p class="pw-asset-ext">' + esc((fileExtension(raw) || item.kind || '파일').toUpperCase()) + '</p>';
    var preview = item.folder ? '<span class="pw-folder-icon">📁</span>' : image || '<div class="pw-asset-document"><span>' + (item.type === 'note' ? '업무노트' : item.type === 'memo' ? '메모' : item.kind) + '</span>' + docBody + '</div>';
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
  function customerStageCounts(rows) {
    var counts = { all: rows.length }; CUSTOMER_STAGES.forEach(function (stage) { counts[stage.key] = 0; });
    rows.forEach(function (item) { var status = item.status || ''; if (counts.hasOwnProperty(status)) counts[status]++; });
    return counts;
  }
  function customersHtml() {
    var columns = [{ key: 'date', label: '청약일자', width: 86 }, { key: 'name', label: '이름', width: 88 }, { key: 'birth', label: '생년월일', width: 92 }, { key: 'genderAge', label: '성별(보험나이)', width: 104 }, { key: 'phone', label: '전화번호', width: 116 }, { key: 'summary', label: '고객내용', width: 360, flex: true }, { key: 'status', label: '고객상태', width: 102 }];
    var gridStyle = '--pw-consult-template:' + consultGridTemplate(columns);
    var latest = {}; state.data.consultations.forEach(function (entry) { var old = latest[entry.customer_id]; if (!old || String(entry.consulted_at || entry.created_at || '') > String(old.consulted_at || old.created_at || '')) latest[entry.customer_id] = entry; });
    var nameQ = state.customerNameQuery.trim().toLocaleLowerCase('ko-KR');
    var baseRows = state.data.customers.filter(function (item) { if (!isRealCustomerStage(item.status)) return false; if (nameQ && String(item.name || '').toLocaleLowerCase('ko-KR').indexOf(nameQ) < 0) return false; return true; });
    baseRows.sort(function (a, b) { var ad = String(customerProfile(a).contract_date || a.created_at || '').slice(0, 10), bd = String(customerProfile(b).contract_date || b.created_at || '').slice(0, 10); return bd.localeCompare(ad); });
    var counts = customerStageCounts(baseRows);
    var rows = baseRows.filter(function (item) { var profile = customerProfile(item), note = profile.note || '', status = item.status || '청약완료'; return (state.customerStatusFilter === 'all' || status === state.customerStatusFilter) && matches((item.name || '') + ' ' + (item.phone || item.phone_raw || '') + ' ' + (profile.birth_date || '') + ' ' + note + ' ' + status); });
    var selected = rows.find(function (item) { return String(item.id) === String(state.selectedCustomerDetail); });
    if (!selected && state.selectedCustomerDetail) state.selectedCustomerDetail = null;
    var totalRowCount = rows.length;
    if (selected && rows.indexOf(selected) >= state.customersRenderLimit) rows = [selected].concat(rows.filter(function (item) { return item !== selected; }).slice(0, state.customersRenderLimit - 1));
    else rows = rows.slice(0, state.customersRenderLimit);
    var header = '<div class="pw-consult-columns" style="' + gridStyle + '">' + columns.map(function (column) { return '<span>' + column.label + '</span>'; }).join('') + '<span class="pw-consult-action-spacer" aria-hidden="true"></span></div>';
    var body = rows.map(function (item) { var profile = customerProfile(item), date = String(profile.contract_date || item.created_at || '').slice(0, 10), age = insuranceAge(profile.birth_date, ymd(new Date())), note = profile.note || (latest[item.id] && latest[item.id].memo) || '', status = item.status || '청약완료'; var values = { date: date, name: item.name || '(이름 없음)', birth: profile.birth_date || '', genderAge: (profile.gender || '-') + (age === '' ? '' : ' (' + age + '세)'), phone: phoneText(item.phone || item.phone_raw || ''), summary: stripHtml(note), status: status }; return '<button type="button" role="listitem" class="pw-consult-row' + (String(item.id) === String(state.selectedCustomerDetail) ? ' on' : '') + '" style="' + gridStyle + '" onclick="OSPersonalWorkspace.selectCustomerDetail(\'' + esc(item.id) + '\')" onmouseenter="OSPersonalWorkspace.showRowHover(event)" onmouseleave="OSPersonalWorkspace.hideRowHover()" data-hover-text="' + esc(stripHtml(note || '고객내용이 없습니다.')) + '">' + columns.map(function (column) { if (column.key === 'name') return '<strong>' + favoriteButton('customer', item.id, values.name, (values.phone || status)) + '<span>' + esc(values[column.key]) + '</span></strong>'; return '<span class="pw-consult-cell pw-consult-' + esc(column.key) + '">' + esc(values[column.key]) + '</span>'; }).join('') + '<span class="pw-consult-action-spacer" aria-hidden="true"></span></button>'; }).join('');
    var detail = selected ? customerDetailHtml(selected) : '';
    var stats = statFilterBarHtml({ kind: 'customer', stages: CUSTOMER_STAGES, activeStatus: state.customerStatusFilter, counts: counts, nameQuery: state.customerNameQuery, nameInputId: 'pw-customer-name-input', namePlaceholder: '고객명 검색', onStage: 'OSPersonalWorkspace.filterCustomerStatus' });
    return '<div class="pw-consult-screen">' + statusHtml() + '<div class="pw-toolbar"><h2>고객관리</h2><button class="pw-btn primary" onclick="OSPersonalWorkspace.addCustomer()">+ 고객 등록</button></div>' + stats + '<div class="pw-consult-layout' + (selected ? ' has-detail' : '') + '"><section class="pw-consult-master"><div class="pw-consult-list" role="list">' + header + '<div class="pw-consult-rows">' + body + (rows.length ? '' : '<div class="pw-empty">등록된 고객이 없습니다.</div>') + '</div>' + loadMoreHtml(totalRowCount, rows.length, 'OSPersonalWorkspace.loadMoreCustomers()') + '</div></section>' + detail + '</div></div>';
  }
  function customerDetailHtml(item) {
    var profile = customerProfile(item), date = String(profile.contract_date || item.created_at || '').slice(0, 10), age = insuranceAge(profile.birth_date, ymd(new Date())), status = item.status || '청약완료';
    var statuses = CUSTOMER_STAGES.map(function (stage) { return stage.key; });
    return '<article class="pw-consult-detail"><button type="button" class="pw-consult-detail-close" onclick="OSPersonalWorkspace.selectCustomerDetail()" aria-label="고객 상세 닫기">×</button><button type="button" class="pw-consult-back" onclick="OSPersonalWorkspace.selectCustomerDetail()">‹ 목록</button>'
      + '<div class="pw-inline-form-block">'
      + contractDatesField('pwd-customer', contractDatesOf(item), 'customerDetail')
      + '<div class="pw-inline-form-row">'
      + inlineField('이름', favoriteButton('customer', item.id, item.name || '고객', status + ' · ' + date) + '<input id="pwd-customer-name" value="' + esc(item.name || '') + '" aria-label="이름">')
      + inlineField('생년월일', '<div class="pw-birth-age"><input id="pwd-customer-birth" type="text" inputmode="numeric" maxlength="10" placeholder="YYYY-MM-DD" value="' + esc(profile.birth_date || '') + '" oninput="OSPersonalWorkspace.formatBirthInput(this,\'customerDetail\')"><span id="pwd-customer-insurance-age">' + (age === '' ? '-' : age + '세') + '</span></div>')
      + '<div class="pw-gender" role="radiogroup" aria-label="성별"><label><input type="radio" name="pwd-customer-gender" value="남"' + (profile.gender === '남' ? ' checked' : '') + '>남</label><label><input type="radio" name="pwd-customer-gender" value="여"' + (profile.gender === '여' ? ' checked' : '') + '>여</label></div>'
      + '</div><div class="pw-inline-form-row">'
      + inlineField('전화번호', '<input id="pwd-customer-phone" inputmode="numeric" value="' + esc(phoneText(item.phone || item.phone_raw || '')) + '" oninput="OSPersonalWorkspace.formatConsultPhone(this)">')
      + inlineField('고객상태', '<select id="pwd-customer-status">' + statuses.map(function (entry) { return '<option value="' + entry + '"' + (entry === status ? ' selected' : '') + '>' + entry + '</option>'; }).join('') + '</select>')
      + '</div></div>'
      + customerExtraFieldsHtml(profile, 'pwd-customer') + '<section><h3>고객내용</h3>' + richEditorField('pwd-customer-new', profile.note || latestConsultationMemo(item.id)) + '<p class="pw-consult-editor-note">웹 주소를 붙여 넣으면 바로 열 수 있는 링크로 저장됩니다. 여러 파일을 한 번에 첨부할 수 있습니다.</p>' + customerExistingAttachments(item.id) + '</section><div class="pw-consult-save"><button type="button" class="pw-btn danger" onclick="OSPersonalWorkspace.trashCustomer(\'' + esc(item.id) + '\')">삭제</button><button type="button" class="pw-btn" onclick="OSPersonalWorkspace.selectCustomerDetail()">닫기</button><button type="button" class="pw-btn primary" onclick="OSPersonalWorkspace.saveCustomerDetail(\'' + esc(item.id) + '\')">저장</button></div></article>';
  }
  function consultationStageCounts(rows, customers) {
    var counts = { all: rows.length }; CONSULT_STAGES.forEach(function (stage) { counts[stage.key] = 0; });
    rows.forEach(function (item) { var status = consultationStatus(item, customers[item.customer_id]); if (counts.hasOwnProperty(status)) counts[status]++; });
    return counts;
  }
  function consultationsHtml() {
    var customers = {}; state.data.customers.forEach(function (item) { customers[item.id] = item; });
    var configuredColumns = consultColumns(), gridStyle = '--pw-consult-template:' + consultGridTemplate(configuredColumns);
    var nameQ = state.consultNameQuery.trim().toLocaleLowerCase('ko-KR');
    var baseRows = state.data.consultations.filter(function (item) { var customer = customers[item.customer_id]; if (!customer) return false; if (nameQ && String(customer.name || '').toLocaleLowerCase('ko-KR').indexOf(nameQ) < 0) return false; return true; });
    var counts = consultationStageCounts(baseRows, customers);
    var rows = baseRows.filter(function (item) { var customer = customers[item.customer_id], profile = customerProfile(customer), status = consultationStatus(item, customer); return (state.consultationStatusFilter === 'all' || status === state.consultationStatusFilter) && matches((customer.name || '') + ' ' + (customer.phone || customer.phone_raw || '') + ' ' + (profile.birth_date || '') + ' ' + (item.memo || '') + ' ' + status); });
    var selected = rows.find(function (item) { return String(item.id) === String(state.selectedConsultation); });
    if (!selected && state.selectedConsultation) state.selectedConsultation = null;
    var totalRowCount = rows.length;
    if (selected && rows.indexOf(selected) >= state.consultationsRenderLimit) rows = [selected].concat(rows.filter(function (item) { return item !== selected; }).slice(0, state.consultationsRenderLimit - 1));
    else rows = rows.slice(0, state.consultationsRenderLimit);
    var columns = '<div class="pw-consult-columns" style="' + gridStyle + '">' + configuredColumns.map(function (column) { return '<span>' + esc(column.label) + '</span>'; }).join('') + '<button type="button" class="pw-consult-column-button" onclick="OSPersonalWorkspace.manageConsultColumns()">+ 컬럼</button></div>';
    var list = '<div class="pw-consult-list" role="list">' + columns + '<div class="pw-consult-rows">' + rows.map(function (item) {
      var customer = customers[item.customer_id] || {}, profile = customerProfile(customer), date = String(item.consulted_at || item.created_at || '').slice(0, 10), age = insuranceAge(profile.birth_date, date), status = consultationStatus(item, customer);
      return '<button type="button" role="listitem" class="pw-consult-row' + (String(item.id) === String(state.selectedConsultation) ? ' on' : '') + '" style="' + gridStyle + '" onclick="OSPersonalWorkspace.selectConsultation(\'' + esc(item.id) + '\')" onmouseenter="OSPersonalWorkspace.showRowHover(event)" onmouseleave="OSPersonalWorkspace.hideRowHover()" data-hover-text="' + esc(stripHtml(item.memo || '상담내용이 없습니다.')) + '">' + configuredColumns.map(function (column) { if (column.key === 'name') return '<strong>' + favoriteButton('consultation', item.id, customer.name || '고객 상담', status + ' · ' + date) + '<span>' + esc(customer.name || '(이름 없음)') + '</span></strong>'; return consultCell(column, item, customer, profile, date, age, status); }).join('') + '<span class="pw-consult-action-spacer" aria-hidden="true"></span></button>';
    }).join('') + (rows.length ? '' : '<div class="pw-empty">상담 기록이 없습니다.</div>') + '</div>' + loadMoreHtml(totalRowCount, rows.length, 'OSPersonalWorkspace.loadMoreConsultations()') + '</div>';
    var detail = selected ? consultationDetailHtml(selected, customers[selected.customer_id] || {}) : '';
    var stats = statFilterBarHtml({ kind: 'consult', stages: CONSULT_STAGES, activeStatus: state.consultationStatusFilter, counts: counts, nameQuery: state.consultNameQuery, nameInputId: 'pw-consult-name-input', namePlaceholder: '고객명 검색', onStage: 'OSPersonalWorkspace.filterConsultationStatus' });
    return '<div class="pw-consult-screen">' + statusHtml() + '<div class="pw-toolbar"><h2>상담관리</h2><button class="pw-btn primary" onclick="OSPersonalWorkspace.addConsultation()">+ 상담 등록</button></div>' + stats + '<div class="pw-consult-layout' + (selected ? ' has-detail' : '') + '"><section class="pw-consult-master">' + list + '</section>' + detail + '</div></div>';
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
    return '<article class="pw-consult-detail"><button type="button" class="pw-consult-detail-close" onclick="OSPersonalWorkspace.selectConsultation()" aria-label="상담 상세 닫기">×</button><button type="button" class="pw-consult-back" onclick="OSPersonalWorkspace.selectConsultation()">‹ 목록</button>'
      + '<div class="pw-inline-form-block">'
      + '<div class="pw-inline-form-row">' + inlineField('등록일자', '<input id="pwd-consult-date" type="text" inputmode="numeric" maxlength="10" placeholder="YYYY-MM-DD" value="' + esc(date) + '" oninput="OSPersonalWorkspace.formatBirthInput(this,\'detail\')">') + '</div>'
      + '<div class="pw-inline-form-row">'
      + inlineField('이름', favoriteButton('consultation', item.id, customer.name || '고객 상담', status + ' · ' + date) + '<input id="pwd-consult-name" value="' + esc(customer.name || '') + '" aria-label="이름">')
      + inlineField('생년월일', '<div class="pw-birth-age"><input id="pwd-consult-birth" type="text" inputmode="numeric" maxlength="10" placeholder="YYYY-MM-DD" value="' + esc(profile.birth_date || '') + '" oninput="OSPersonalWorkspace.formatBirthInput(this,\'detail\')"><span id="pwd-insurance-age">' + (age === '' ? '-' : age + '세') + '</span></div>')
      + '<div class="pw-gender" role="radiogroup" aria-label="성별"><label><input type="radio" name="pwd-consult-gender" value="남"' + (profile.gender === '남' ? ' checked' : '') + '>남</label><label><input type="radio" name="pwd-consult-gender" value="여"' + (profile.gender === '여' ? ' checked' : '') + '>여</label></div>'
      + '</div><div class="pw-inline-form-row">'
      + inlineField('전화번호', '<input id="pwd-consult-phone" inputmode="numeric" value="' + esc(phoneText(customer.phone || customer.phone_raw || '')) + '" oninput="OSPersonalWorkspace.formatConsultPhone(this)">')
      + inlineField('상담상태', '<select id="pwd-consult-status" onchange="OSPersonalWorkspace.consultationStatusChanged(this,\'detail\')">' + statuses.map(function (entry) { return '<option value="' + entry + '"' + (entry === status ? ' selected' : '') + '>' + entry + '</option>'; }).join('') + '</select>')
      + '</div></div>'
      + '<div class="pw-consult-care-fields"' + (status === '청약완료' ? '' : ' hidden') + ' id="pwd-consult-care-fields">' + customerExtraFieldsHtml(profile, 'pwd-consult-care') + '</div>' + '<section><h3>상담내용</h3>' + richEditorField('pwd-consult-new', item.memo || '') + '<p class="pw-consult-editor-note">웹 주소를 붙여 넣으면 바로 열 수 있는 링크로 저장됩니다. 여러 파일을 한 번에 첨부할 수 있습니다.</p>' + consultationExistingAttachments(item.id) + '</section><div class="pw-consult-save"><button type="button" class="pw-btn danger" onclick="OSPersonalWorkspace.trashCustomer(\'' + esc(customer.id) + '\')">삭제</button><button type="button" class="pw-btn" onclick="OSPersonalWorkspace.selectConsultation()">닫기</button><button type="button" class="pw-btn primary" onclick="OSPersonalWorkspace.saveConsultationDetail(\'' + esc(item.id) + '\')">저장</button></div></article>';
  }

  function calendarTitle() {
    var selected = parseDate(state.selectedDate);
    if (state.calendarMode === 'day') return selected.getFullYear() + '년 ' + (selected.getMonth() + 1) + '월 ' + selected.getDate() + '일';
    if (state.calendarMode === 'week') { var start = new Date(selected); start.setDate(start.getDate() - start.getDay()); return (start.getMonth() + 1) + '월 ' + start.getDate() + '일 – ' + formatDate(addDays(start, 6)); }
    if (state.calendarMode === 'agenda') return '일정';
    return state.cursor.getFullYear() + '년 ' + (state.cursor.getMonth() + 1) + '월';
  }
  function isCareTask(event) { return !!event && event.legacy_source === 'care_auto'; }
  function eventPriority(event) { return event && event.event_type === 'holiday' ? 0 : event && event.event_type === 'term' ? 1 : event && event.event_type === 'memorial' ? 2 : isCareTask(event) ? 3 : 4; }
  function eventsFor(date) { return allEvents().filter(function (event) { var start = String(event.event_date || '').slice(0, 10); if (!start) return false; var end = String(event.event_end_date || event.event_date || '').slice(0, 10); return date >= start && date <= end; }).sort(function (a, b) { return eventPriority(a) - eventPriority(b) || String(a.event_time || '').localeCompare(String(b.event_time || '')) || String(a.title || '').localeCompare(String(b.title || ''), 'ko'); }); }
  function calendarEventKind(event) { return isCareTask(event) ? 'customer' : event && event.event_type === 'holiday' ? 'holiday' : event && event.event_type === 'term' ? 'term' : event && event.event_type === 'memorial' ? 'memorial' : 'schedule'; }
  function monthView() {
    var first = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), 1), start = new Date(first); start.setDate(1 - first.getDay());
    var today = ymd(new Date()), days = [];
    for (var i = 0; i < 42; i++) { var day = new Date(start); day.setDate(start.getDate() + i); days.push(ymd(day)); }
    var gridStart = days[0], gridEnd = days[41];
    var seen = {}, spans = [];
    days.forEach(function (key) {
      eventsFor(key).forEach(function (event) {
        if (event.builtin || seen[event.id]) return;
        seen[event.id] = true;
        var s = String(event.event_date || '').slice(0, 10), e = String(event.event_end_date || event.event_date || '').slice(0, 10);
        spans.push({ event: event, start: s < gridStart ? gridStart : s, end: e > gridEnd ? gridEnd : e });
      });
    });
    spans.sort(function (a, b) { return a.start.localeCompare(b.start) || b.end.localeCompare(a.end); });
    var laneLastEnd = [];
    spans.forEach(function (sp) { var lane = 0; while (lane < laneLastEnd.length && laneLastEnd[lane] >= sp.start) lane++; sp.lane = lane; laneLastEnd[lane] = sp.end; });
    var MAX_LANES = 3, weeks = [];
    for (var w = 0; w < 6; w++) {
      var weekDays = days.slice(w * 7, w * 7 + 7), weekStart = weekDays[0], weekEnd = weekDays[6];
      var weekSpans = spans.filter(function (sp) { return sp.lane < MAX_LANES && sp.end >= weekStart && sp.start <= weekEnd; });
      var overflow = {}; weekDays.forEach(function (d) { overflow[d] = 0; });
      spans.forEach(function (sp) { if (sp.lane >= MAX_LANES && sp.end >= weekStart && sp.start <= weekEnd) weekDays.forEach(function (d) { if (d >= sp.start && d <= sp.end) overflow[d]++; }); });
      var laneCount = weekSpans.reduce(function (m, sp) { return Math.max(m, sp.lane + 1); }, 0);
      var cells = weekDays.map(function (key) {
        var d = parseDate(key), events = eventsFor(key), builtIns = events.filter(function (event) { return event.builtin; }), outside = d.getMonth() !== first.getMonth(), more = overflow[key];
        return '<button type="button" class="pw-day ' + (outside ? 'out ' : '') + (key === today ? 'today ' : '') + (key === state.selectedDate ? 'selected' : '') + '" onclick="OSPersonalWorkspace.openDayCreate(\'' + key + '\')" aria-label="' + esc((d.getMonth() + 1) + '월 ' + d.getDate() + '일, 일정 ' + events.length + '개') + '"><span class="pw-day-head"><strong>' + d.getDate() + '</strong><span class="pw-built-ins">' + builtIns.slice(0, 2).map(function (event) { return '<i class="' + calendarEventKind(event) + '">' + esc(event.title) + '</i>'; }).join('') + '</span></span><span class="pw-day-lane-spacer" style="height:' + (laneCount * 24) + 'px"></span>' + (more ? '<small class="pw-more">+' + more + '개 더보기</small>' : '') + '</button>';
      }).join('');
      var bars = weekSpans.map(function (sp) {
        var barStart = sp.start < weekStart ? weekStart : sp.start, barEnd = sp.end > weekEnd ? weekEnd : sp.end;
        var startIdx = weekDays.indexOf(barStart), endIdx = weekDays.indexOf(barEnd);
        var left = 'calc(' + (startIdx / 7 * 100) + '% + 3px)', width = 'calc(' + ((endIdx - startIdx + 1) / 7 * 100) + '% - 6px)';
        return '<span class="pw-event-bar ' + calendarEventKind(sp.event) + '" style="left:' + left + ';width:' + width + ';top:' + (sp.lane * 24) + 'px" role="button" tabindex="0" onclick="event.stopPropagation();OSPersonalWorkspace.showEvent(\'' + esc(sp.event.id) + '\')" onkeydown="if(event.key===\'Enter\'){event.stopPropagation();OSPersonalWorkspace.showEvent(\'' + esc(sp.event.id) + '\')}">' + esc(sp.event.title || '일정') + '</span>';
      }).join('');
      weeks.push('<div class="pw-cal-week"><div class="pw-cal-week-cells">' + cells + '</div><div class="pw-cal-week-bars" style="height:' + (laneCount * 24) + 'px">' + bars + '</div></div>');
    }
    return '<section class="pw-calendar-month"><div class="pw-cal"><div class="pw-cal-head">' + ['일', '월', '화', '수', '목', '금', '토'].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div><div class="pw-cal-grid">' + weeks.join('') + '</div></div></section>';
  }
  function timeView(days) {
    var hours = []; for (var h = 8; h <= 20; h++) hours.push(h);
    return '<div class="pw-time" style="--pw-days:' + days.length + '"><div class="pw-time-head"><span>GMT+09</span>' + days.map(function (date) { return '<button class="' + (date === ymd(new Date()) ? 'today' : '') + '" onclick="OSPersonalWorkspace.selectDate(\'' + date + '\')"><small>' + weekday(date) + '</small><strong>' + Number(date.slice(8)) + '</strong></button>'; }).join('') + '</div><div class="pw-time-body"><div class="pw-hours">' + hours.map(function (hour) { return '<span>' + (hour < 12 ? '오전 ' + hour : hour === 12 ? '오후 12' : '오후 ' + (hour - 12)) + '시</span>'; }).join('') + '</div>' + days.map(function (date) { var events = eventsFor(date); return '<div class="pw-time-day">' + hours.map(function () { return '<i></i>'; }).join('') + '<div class="pw-time-events">' + events.map(function (event) { return '<button onclick="OSPersonalWorkspace.showEvent(\'' + esc(event.id) + '\')"><small>' + esc(String(event.event_time || '종일').slice(0, 5)) + '</small><b>' + esc(eventTitleLabel(event)) + '</b></button>'; }).join('') + '</div></div>'; }).join('') + '</div></div>';
  }
  function agendaView() {
    var start = state.selectedDate, end = addDays(start, 365);
    var rows = allEvents().filter(function (event) { var date = String(event.event_date || '').slice(0, 10); return date >= start && date <= end; }).sort(function (a, b) { return String(a.event_date).localeCompare(String(b.event_date)) || String(a.event_time || '').localeCompare(String(b.event_time || '')); });
    return '<div class="pw-agenda">' + (rows.length ? rows.map(function (event) { var date = String(event.event_date).slice(0, 10); return '<button onclick="OSPersonalWorkspace.showEvent(\'' + esc(event.id) + '\')"><time><strong>' + Number(date.slice(8)) + '</strong><span>' + Number(date.slice(5, 7)) + '월 · ' + weekday(date) + '</span></time><span><small>' + esc(String(event.event_time || '종일').slice(0, 5)) + '</small><b>' + esc(eventTitleLabel(event)) + '</b></span></button>'; }).join('') : '<div class="pw-empty">예정된 일정이 없습니다.</div>') + '</div>';
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
  function scriptStageLabel(stage) { for (var i = 0; i < SCRIPT_STAGES.length; i++) if (SCRIPT_STAGES[i].stage === stage) return SCRIPT_STAGES[i].label; return stage || ''; }
  function scriptStageGroup(stage) { for (var i = 0; i < SCRIPT_STAGES.length; i++) if (SCRIPT_STAGES[i].stage === stage) return SCRIPT_STAGES[i].group; return 'mid'; }
  function loadScriptsData() {
    if (state.scriptsData || state.scriptsLoading) return;
    state.scriptsLoading = true;
    api('scripts?is_active=eq.true&scope=eq.global&is_sample=eq.false&order=stage.asc,sort_order.asc&select=id,title,stage,top_category,highlight_text,script_text,attachments').then(function (rows) {
      state.scriptsData = rows || []; state.scriptsLoading = false;
      if (state.section === 'scripts') renderContent();
    }).catch(function () { state.scriptsLoading = false; state.scriptsData = []; if (state.section === 'scripts') renderContent(); });
  }
  function parseScriptSections(html) {
    if (!html) return null;
    var wrap = document.createElement('div'); wrap.innerHTML = html;
    var boxes = wrap.querySelectorAll('div[style*="border:1.5px solid #DCDCDC"]');
    if (!boxes.length) {
      var text = (wrap.textContent || '').trim();
      if (!text) return null;
      return [{ title: '내용', subtitle: '', mainHtml: esc(text).replace(/\n/g, '<br>'), sub: '', coach: '' }];
    }
    var sections = [];
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      var titleEl = box.querySelector('div[style*="color:#185FA5"]');
      var subEl = box.querySelector('div[style*="font-weight:600"]');
      var mainEl = box.querySelector('div[style*="font-size:15px"]');
      var subBodyEl = box.querySelector('div[style*="border-top"]');
      var coachEl = box.querySelector('div[style*="background:#FFF3DC"]');
      sections.push({
        title: titleEl ? titleEl.textContent.trim() : '',
        subtitle: subEl ? subEl.textContent.trim() : '',
        mainText: mainEl ? mainEl.textContent.trim().replace(/\s+/g, ' ') : '',
        mainHtml: mainEl ? mainEl.innerHTML : '',
        sub: subBodyEl ? subBodyEl.innerHTML : '',
        coach: coachEl ? coachEl.textContent.trim().replace(/^⚡\s*/, '') : ''
      });
    }
    return sections;
  }
  function scriptCardSummary(sections, fallback) {
    if (sections && sections.length) { var first = sections[0]; if (first.mainText) return first.mainText.length > 140 ? first.mainText.slice(0, 140) + '…' : first.mainText; if (first.subtitle) return first.subtitle; }
    return String(fallback || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 140);
  }
  function scriptAttachmentsHtml(attachments) {
    var list = Array.isArray(attachments) ? attachments.filter(function (a) { return a && a.url; }) : [];
    if (!list.length) return '';
    return '<div class="pw-script-attachments">' + list.map(function (a) { return '<img src="' + esc(a.url) + '" alt="' + esc(a.name || '첨부 이미지') + '" loading="lazy">'; }).join('') + '</div>';
  }
  function scriptAccordionHtml(sections, attachments) {
    return sections.map(function (sec, i) {
      var open = i === 0 ? ' open' : '';
      return '<div class="pw-script-acc' + open + '"><button type="button" class="pw-script-acc-head" onclick="OSPersonalWorkspace.toggleScriptSection(this)"><span class="pw-script-acc-num">' + (i + 1) + '</span><span class="pw-script-acc-ttl">' + esc(sec.title) + '</span><span class="pw-script-acc-arrow">▾</span></button><div class="pw-script-acc-body">'
        + (sec.subtitle ? '<div class="pw-script-acc-sub">' + esc(sec.subtitle) + '</div>' : '')
        + (sec.mainHtml ? '<div class="pw-script-acc-main">' + sec.mainHtml + '</div>' : '')
        + (sec.sub ? '<div class="pw-script-acc-sub2">' + sec.sub + '</div>' : '')
        + (sec.coach ? '<div class="pw-script-acc-coach">⚡ ' + esc(sec.coach) + '</div>' : '')
        + (i === 0 ? scriptAttachmentsHtml(attachments) : '')
        + '</div></div>';
    }).join('');
  }
  function scriptsHtml() {
    if (!state.scriptsData && !state.scriptsLoading) loadScriptsData();
    var chips = '<div class="pw-script-chips">' + SCRIPT_STAGES.map(function (g) {
      var on = g.stage === state.scriptsStage;
      return '<button type="button" class="pw-script-chip' + (on ? ' on' : '') + '" style="--sc:' + SCRIPT_GROUP_COLORS[g.group] + '" onclick="OSPersonalWorkspace.filterScriptsStage(\'' + g.stage + '\')">' + esc(g.label) + '</button>';
    }).join('') + '</div>';
    if (state.scriptsLoading || !state.scriptsData) {
      return '<div class="pw-toolbar"><h2>스크립트</h2></div>' + chips + '<div class="pw-empty">불러오는 중입니다…</div>';
    }
    var rows = state.scriptsData.filter(function (s) { return s.stage === state.scriptsStage; });
    var groupColor = SCRIPT_GROUP_COLORS[scriptStageGroup(state.scriptsStage)];
    var cards = rows.length ? rows.map(function (s) {
      var sections = parseScriptSections(s.script_text);
      var isEmpty = !sections || !sections.length;
      var openCls = String(s.id) === String(state.scriptsOpenId) ? ' open' : '';
      return '<div class="pw-script-card' + openCls + '" style="--sc:' + groupColor + '"><button type="button" class="pw-script-card-head" onclick="OSPersonalWorkspace.toggleScriptCard(\'' + esc(s.id) + '\')"><span class="pw-script-card-badge">' + esc(scriptStageLabel(s.stage)) + '</span><strong>' + esc(s.title || '제목 없음') + '</strong>'
        + (isEmpty ? '<span class="pw-script-card-summary">본문 준비 중입니다.</span>' : '<span class="pw-script-card-summary">' + esc(scriptCardSummary(sections, s.highlight_text)) + '</span>') + '</button>'
        + (!isEmpty ? '<div class="pw-script-card-full">' + scriptAccordionHtml(sections, s.attachments) + '</div>' : '') + '</div>';
    }).join('') : '<div class="pw-empty">해당 분류의 스크립트가 아직 없습니다.</div>';
    return '<div class="pw-toolbar"><h2>스크립트</h2></div>' + chips + '<div class="pw-script-grid">' + cards + '</div>';
  }
  function filterScriptsStage(stage) { state.scriptsStage = stage; state.scriptsOpenId = null; renderContent(); }
  function toggleScriptCard(id) { state.scriptsOpenId = String(state.scriptsOpenId) === String(id) ? null : id; renderContent(); }
  function toggleScriptSection(btn) { var item = btn.closest('.pw-script-acc'); if (item) item.classList.toggle('open'); }
  function loadNewsletterData() {
    if (state.newsData || state.newsLoading) return;
    state.newsLoading = true;
    api('newsletters?status=eq.published&select=id,company,publish_year,publish_month,source_pdf_url,source_path,source_filename&order=publish_year.desc.nullslast,publish_month.desc.nullslast&limit=2000').then(function (rows) {
      state.newsData = rows || []; state.newsLoading = false;
      if (state.section === 'newsletters') renderContent();
    }).catch(function () { state.newsLoading = false; state.newsData = []; if (state.section === 'newsletters') renderContent(); });
  }
  function newsMonthLabel(row) { var y = row.publish_year, m = row.publish_month; if (!y) return '발행일 미상'; return y + '년' + (m ? ' ' + m + '월' : ''); }
  function newsSecOf(company) {
    var t = String(company || '');
    if (/손해|손보|화재|해상/.test(t)) return 'nonlife';
    if (/생명|생보|라이프|life|연금/i.test(t)) return 'life';
    return 'nonlife';
  }
  function newsCompanyStats() {
    var map = {};
    (state.newsData || []).forEach(function (r) {
      var name = String(r.company || '').trim() || '(회사 미상)';
      if (!map[name]) map[name] = { name: name, sec: newsSecOf(name), count: 0 };
      map[name].count++;
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return a.name.localeCompare(b.name, 'ko-KR'); });
  }
  function newsQueryHit(name) {
    var q = (state.newsCoNameQuery || '').trim().toLowerCase();
    return !q || String(name).toLowerCase().indexOf(q) >= 0;
  }
  function newsPoolCompanies() {
    var list = newsCompanyStats().filter(function (c) { return newsQueryHit(c.name); });
    if (state.newsPool !== 'all') list = list.filter(function (c) { return c.sec === state.newsPool; });
    return list;
  }
  function newsletterCardHtml(row) {
    var label = newsMonthLabel(row), company = row.company || '회사 미상';
    return '<button type="button" class="pw-news-card" onclick="OSPersonalWorkspace.openNewsletter(\'' + esc(row.id) + '\')"><div class="pw-news-thumb"><img data-storage-path="thumbs/' + esc(row.id) + '.jpg" alt="' + esc(company + ' ' + label) + '" loading="lazy"><div class="pw-news-overlay"><strong>' + esc(label) + '</strong><span>' + esc(company) + '</span></div></div></button>';
  }
  function newsPoolTabsHtml() {
    return '<div class="pw-nl-pool">' + [['all', '전체'], ['nonlife', '손해'], ['life', '생명']].map(function (p) {
      return '<button type="button" class="' + (state.newsPool === p[0] ? 'on' : '') + '" onclick="OSPersonalWorkspace.filterNewsPool(\'' + p[0] + '\')">' + p[1] + '</button>';
    }).join('') + '</div>';
  }
  function newsSidebarHtml() {
    var groups = state.newsPool === 'all' ? [['손해보험', 'nonlife'], ['생명보험', 'life']] : state.newsPool === 'nonlife' ? [['손해보험', 'nonlife']] : [['생명보험', 'life']];
    var stats = newsCompanyStats().filter(function (c) { return newsQueryHit(c.name); });
    var html = '';
    groups.forEach(function (g) {
      var arr = stats.filter(function (c) { return c.sec === g[1]; });
      if (!arr.length) return;
      html += '<div class="pw-nl-grouplabel">' + esc(g[0]) + '</div>';
      html += arr.map(function (c) {
        var on = state.newsScope === 'co' && state.newsCoSel === c.name;
        return '<button type="button" class="pw-nl-co' + (on ? ' on' : '') + '" style="--cl:' + (c.sec === 'life' ? 'var(--t-uw)' : 'var(--warn)') + '" onclick="OSPersonalWorkspace.selectNewsCompany(\'' + esc(jsString(c.name)) + '\')"><span class="dot"></span><span class="nm">' + esc(c.name) + '</span><span class="cnt">' + c.count + '</span></button>';
      }).join('');
    });
    return html || '<div class="pw-empty">검색 결과 없음</div>';
  }
  function newsScopeTabsHtml() {
    return '<div class="pw-nl-scope">' + [['all', '전체 조망'], ['co', '회사별']].map(function (s) {
      return '<button type="button" class="' + (state.newsScope === s[0] ? 'on' : '') + '" onclick="OSPersonalWorkspace.setNewsScope(\'' + s[0] + '\')">' + s[1] + '</button>';
    }).join('') + '</div><span class="pw-nl-hint">' + (state.newsScope === 'all' ? '회사를 클릭하면 발행월별 소식지로' : '좌측에서 다른 회사를 고를 수 있어요') + '</span>';
  }
  function newsCountHtml() {
    var cos = newsPoolCompanies();
    var total = cos.reduce(function (a, c) { return a + c.count; }, 0);
    return '<div class="pw-nl-cnt">회사 <b>' + cos.length + '곳</b> · 소식지 <b>' + total + '건</b></div>';
  }
  function newsPoolFilteredRows() {
    var wanted = {};
    newsPoolCompanies().forEach(function (c) { wanted[c.name] = true; });
    return (state.newsData || []).filter(function (r) { return wanted[String(r.company || '').trim() || '(회사 미상)']; });
  }
  function newsAllViewHtml() {
    var rows = newsPoolFilteredRows();
    if (!rows.length) return '<div class="pw-empty">소식지가 없습니다.</div>';
    var monthMap = {}, order = [];
    rows.forEach(function (r) {
      var y = Number(r.publish_year), m = Number(r.publish_month);
      var key = (y && m) ? (y + '|' + m) : 'unknown';
      if (!monthMap[key]) { monthMap[key] = { y: y, m: m, items: [] }; order.push(key); }
      monthMap[key].items.push(r);
    });
    order.sort(function (a, b) { if (a === 'unknown') return 1; if (b === 'unknown') return -1; return (monthMap[b].y * 12 + monthMap[b].m) - (monthMap[a].y * 12 + monthMap[a].m); });
    var now = new Date(), curKey = now.getFullYear() + '|' + (now.getMonth() + 1);
    var first = order[0], g0 = monthMap[first];
    var t0 = first === 'unknown' ? '발행월 미상' : (g0.y + '년 ' + g0.m + '월');
    var hk = first === curKey ? ('이번 달 · 새 소식지 ' + g0.items.length + '건') : ('최신 발행 · ' + g0.items.length + '건');
    var html = '<div class="pw-nl-hero"><div class="pw-nl-hero-hd"><h3>' + esc(t0) + '</h3><span class="k">' + esc(hk) + '</span></div><div class="pw-news-grid">' + g0.items.map(newsletterCardHtml).join('') + '</div></div>';
    if (order.length > 1) {
      html += '<div class="pw-nl-past"><div class="pw-nl-past-hd">이전 발행월 · 클릭하면 펼쳐집니다</div>';
      for (var i = 1; i < order.length; i++) {
        var key = order[i], g = monthMap[key];
        var title = key === 'unknown' ? '발행월 미상' : (g.y + '년 ' + g.m + '월');
        var open = !!state.newsOpenMonths[key];
        html += '<button type="button" class="pw-nl-mrow' + (open ? ' open' : '') + '" onclick="OSPersonalWorkspace.toggleNewsMonth(\'' + esc(key) + '\')"><span class="t">' + esc(title) + '</span><span class="badge">' + g.items.length + '건</span><span class="chev">›</span></button>';
        if (open) html += '<div class="pw-nl-mbody open"><div class="pw-news-grid">' + g.items.map(newsletterCardHtml).join('') + '</div></div>';
      }
      html += '</div>';
    }
    return html;
  }
  function newsCoViewHtml() {
    var companies = newsPoolCompanies();
    var sel = (state.newsCoSel && companies.some(function (c) { return c.name === state.newsCoSel; })) ? state.newsCoSel : (companies[0] && companies[0].name);
    if (!sel) return '<div class="pw-empty">회사가 없습니다.</div>';
    state.newsCoSel = sel;
    var rows = (state.newsData || []).filter(function (r) { return (String(r.company || '').trim() || '(회사 미상)') === sel; })
      .slice().sort(function (a, b) { return (Number(b.publish_year) * 12 + Number(b.publish_month || 0)) - (Number(a.publish_year) * 12 + Number(a.publish_month || 0)); });
    var sec = newsSecOf(sel), secLb = sec === 'life' ? '생명보험' : '손해보험';
    var latest = rows[0] ? (rows[0].publish_year + '.' + ('0' + rows[0].publish_month).slice(-2)) : '-';
    var avatar = esc(sel.replace(/\s+/g, '').slice(0, 2));
    var head = '<div class="pw-nl-cohead"><span class="pw-nl-avatar ' + (sec === 'life' ? 'l' : 's') + '">' + avatar + '</span><div class="info"><h3>' + esc(sel) + '</h3><div class="sub">' + secLb + ' · 최근 발행 ' + esc(latest) + '</div></div><span class="tot">총 <b>' + rows.length + '</b>건</span></div>';
    var grid = rows.length ? '<div class="pw-news-grid">' + rows.map(newsletterCardHtml).join('') + '</div>' : '<div class="pw-empty">소식지가 없습니다.</div>';
    return head + grid;
  }
  function newslettersHtml() {
    if (!state.newsData && !state.newsLoading) loadNewsletterData();
    if (state.newsLoading || !state.newsData) {
      return '<div class="pw-toolbar"><h2>소식지</h2></div><div class="pw-empty">불러오는 중입니다…</div>';
    }
    var sidebar = '<aside class="pw-nl-side">' + newsPoolTabsHtml() + '<div class="pw-nl-search"><input id="pw-newsCo-name-input" type="text" placeholder="회사 검색" autocomplete="off" value="' + esc(state.newsCoNameQuery || '') + '"></div><div class="pw-nl-colist">' + newsSidebarHtml() + '</div></aside>';
    var main = '<div class="pw-nl-main"><div class="pw-nl-ctrl">' + newsScopeTabsHtml() + '</div>' + newsCountHtml() + (state.newsScope === 'all' ? newsAllViewHtml() : newsCoViewHtml()) + '</div>';
    return '<div class="pw-toolbar"><h2>소식지</h2></div><div class="pw-nl-layout">' + sidebar + main + '</div>';
  }
  function filterNewsPool(pool) {
    state.newsPool = pool;
    if (state.newsCoSel && pool !== 'all' && newsSecOf(state.newsCoSel) !== pool) state.newsCoSel = null;
    renderContent();
  }
  function setNewsScope(scope) { state.newsScope = scope; renderContent(); }
  function selectNewsCompany(name) {
    state.newsCoSel = name; state.newsScope = 'co';
    var sec = newsSecOf(name);
    if (state.newsPool !== 'all' && state.newsPool !== sec) state.newsPool = sec;
    renderContent();
  }
  function toggleNewsMonth(key) { state.newsOpenMonths[key] = !state.newsOpenMonths[key]; renderContent(); }
  function hydrateNewsThumbs() {
    document.querySelectorAll('#v-personal-workspace .pw-news-thumb img[data-storage-path]').forEach(function (img) {
      var path = img.getAttribute('data-storage-path'); if (!path) return;
      signStoragePath(path, 'newsletters').then(function (url) { img.src = url; }).catch(function () {});
    });
  }
  function openNewsletter(id) {
    var row = (state.newsData || []).find(function (r) { return String(r.id) === String(id); }); if (!row) return;
    var name = (row.source_filename || (row.company || '소식지') + '_' + newsMonthLabel(row)) + '.pdf';
    var pdfUrl = String(row.source_pdf_url || '').trim();
    var ready = pdfUrl ? Promise.resolve(pdfUrl) : (row.source_path ? signStoragePath(row.source_path, 'newsletters') : Promise.reject(new Error('열람 가능한 파일이 없습니다.')));
    ready.then(function (url) { openPreviewUrl(url, name, 'application/pdf', { source: 'newsletter', id: id }); }).catch(saveError);
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
    if (state.section === 'scripts') return scriptsHtml();
    if (state.section === 'newsletters') return newslettersHtml();
    if (state.section === 'trash') return trashHtml();
    if (state.section === 'archive') return archiveHtml();
    return homeHtml();
  }

  function renderShell() {
    var view = document.getElementById('v-personal-workspace'); if (!view) return;
    var head = STANDALONE ? '' : '<header class="pw-head"><div class="pw-title"><h1>내 업무</h1><p>자료, 고객, 상담과 일정을 한곳에서 관리합니다.</p></div><label class="pw-search">⌕<input id="pw-search-input" type="search" value="' + esc(state.query) + '" placeholder="내 자료와 고객 검색" autocomplete="off"></label></header>';
    view.innerHTML = '<div class="pw-shell' + (STANDALONE ? ' pw-shell-compact' : '') + '">' + head + '<div class="pw-body">' + navHtml() + '<main class="pw-main" id="pw-main"></main></div></div><dialog class="pw-dialog" id="pw-dialog"><button class="pw-dialog-close" onclick="OSPersonalWorkspace.closeDialog()" aria-label="닫기">×</button><div id="pw-dialog-body"></div></dialog>'
      + '<dialog class="pw-dialog pw-reservation-dialog" id="pw-reservation-dialog"><button class="pw-dialog-close" onclick="OSPersonalWorkspace.closeReservationPopup()" aria-label="닫기">×</button><div id="pw-reservation-body"></div></dialog>'
      + '<div class="pw-preview" id="pw-preview" aria-hidden="true" onclick="if(event.target===this)OSPersonalWorkspace.closePreview()"><button type="button" class="pw-preview-close" onclick="OSPersonalWorkspace.closePreview()" aria-label="미리보기 닫기">×</button><div class="pw-preview-thumbs" id="pw-preview-thumbs"></div><div class="pw-preview-stage" id="pw-preview-stage" onclick="if(event.target===this||(event.target.classList&&event.target.classList.contains(\'pw-preview-page-wrap\')))OSPersonalWorkspace.closePreview()"></div><div class="pw-preview-bar"><button type="button" onclick="OSPersonalWorkspace.previewZoom(-1)" title="축소">−</button><button type="button" onclick="OSPersonalWorkspace.previewZoom(1)" title="확대">＋</button><button type="button" onclick="OSPersonalWorkspace.previewRotate()" title="회전">↻</button><button type="button" class="pw-preview-pdf-only" onclick="OSPersonalWorkspace.previewPage(-1)" title="이전 페이지">‹</button><span id="pw-preview-page"></span><button type="button" class="pw-preview-pdf-only" onclick="OSPersonalWorkspace.previewPage(1)" title="다음 페이지">›</button><div class="pw-ddak-wrap"><button type="button" class="pw-preview-ddak" aria-haspopup="menu" aria-expanded="false" onclick="OSPersonalWorkspace.toggleDdakMenu(event)">⚡ 딸깍</button><div class="pw-ddak-menu" id="pw-preview-ddak-menu" role="menu" hidden><a id="pw-preview-download" href="#" target="_blank" rel="noopener" download role="menuitem" onclick="OSPersonalWorkspace.closeDdakMenu()">⬇ 다운로드 저장</a><button type="button" role="menuitem" onclick="OSPersonalWorkspace.previewCopy()">📋 복사</button></div></div><button type="button" class="pw-preview-asset-only" onclick="OSPersonalWorkspace.previewEditAsset()" title="수정">✎ 수정</button><button type="button" class="pw-preview-asset-only pw-preview-delete" onclick="OSPersonalWorkspace.previewDeleteAsset()" title="삭제">🗑 삭제</button></div></div>'
      + '<div class="pw-consult-hover" id="pw-row-hover" aria-hidden="true"></div>';
    if (STANDALONE) { var globalInput = document.getElementById('pw-search-input'); if (globalInput) globalInput.value = state.query; }
    bindSearch(); renderContent();
  }
  function renderConsultCustomFields() { var detail = document.querySelector('#v-personal-workspace .pw-consult-detail'), section = detail && detail.querySelector('section'); if (!detail || !section || detail.querySelector('.pw-custom-fields')) return; var item = state.data.consultations.find(function (entry) { return String(entry.id) === String(state.selectedConsultation); }), customer = item && state.data.customers.find(function (entry) { return String(entry.id) === String(item.customer_id); }), profile = customerProfile(customer || {}), columns = consultColumns().filter(function (column) { return column.custom; }); if (!columns.length) return; var box = document.createElement('div'); box.className = 'pw-custom-fields'; columns.forEach(function (column) { var label = document.createElement('label'), span = document.createElement('span'), input = document.createElement('input'); span.textContent = column.label; input.setAttribute('data-consult-custom', column.key); input.value = consultCustomValue(profile, column.key); label.className = 'pw-custom-field'; label.appendChild(span); label.appendChild(input); box.appendChild(label); }); detail.insertBefore(box, section); }
  function renderContent() { hideRowHover(); var main = document.getElementById('pw-main'); if (main) { main.innerHTML = sectionHtml(); if (state.section === 'assets' && state.assetView !== 'list') hydrateAssetThumbs(); if (state.section === 'consultations') { bindNameSearch('consult'); if (state.selectedConsultation) { renderConsultCustomFields(); hydrateRichStorage(); } } if (state.section === 'customers') { bindNameSearch('customer'); if (state.selectedCustomerDetail) hydrateRichStorage(); } if (state.section === 'newsletters') { hydrateNewsThumbs(); bindNameSearch('newsCo'); } } }
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
  function go(section) { if (section === 'consultations' && state.section === 'consultations') state.selectedConsultation = null; if (section === 'customers' && state.section === 'customers') state.selectedCustomerDetail = null; window.clearTimeout(state.searchTimer); state.query = ''; state.section = section; renderShell(); setUrl(true); if (section !== 'home' && !state.fullLoaded) loadData(true); }
  function dialog(html) { var box = document.getElementById('pw-dialog'), body = document.getElementById('pw-dialog-body'); if (!box || !body) return; body.innerHTML = html; if (!box.open && box.showModal) box.showModal(); else if (!box.open) box.setAttribute('open', ''); }
  function closeDialog() { var box = document.getElementById('pw-dialog'); if (box && box.close) box.close(); else if (box) box.removeAttribute('open'); }
  function sanitizeRich(html) {
    var doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    var allowed = ['B', 'STRONG', 'I', 'EM', 'U', 'S', 'H2', 'H3', 'P', 'DIV', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'BR', 'A', 'IMG', 'SPAN', 'FONT'];
    var colorRe = /^(#[0-9a-f]{3,8}|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)|rgba\([^;()]+\))$/i;
    Array.prototype.slice.call(doc.body.querySelectorAll('*')).forEach(function (node) {
      if (allowed.indexOf(node.tagName) < 0) { node.replaceWith(doc.createTextNode(node.textContent || '')); return; }
      var href = node.tagName === 'A' ? String(node.getAttribute('href') || '') : '';
      var align = String(node.style && node.style.textAlign || '');
      /* 글자색·형광펜(2026-08-20, 대표 확정) — execCommand(styleWithCSS)가 만드는 SPAN의
         color/background-color만 화이트리스트로 허용(그 외 style 속성은 전부 제거해 CSS 주입 방지).
         구형 <font color> 태그(다른 브라우저·붙여넣기 유입 대비)도 같은 방식으로 흡수. */
      var color = String((node.style && node.style.color) || node.getAttribute('color') || '');
      var bgColor = String((node.style && node.style.backgroundColor) || '');
      var storagePath = node.tagName === 'IMG' ? String(node.getAttribute('data-storage-path') || '') : '';
      var pendingImage = node.tagName === 'IMG' ? String(node.getAttribute('data-pending-image') || '') : '';
      var alt = node.tagName === 'IMG' ? String(node.getAttribute('alt') || '') : '';
      Array.prototype.slice.call(node.attributes).forEach(function (attr) { node.removeAttribute(attr.name); });
      if (node.tagName === 'A' && /^(https?:|mailto:|tel:)/i.test(href)) { node.setAttribute('href', href); node.setAttribute('target', '_blank'); node.setAttribute('rel', 'noopener'); }
      if (/^(left|center|right)$/.test(align)) node.style.textAlign = align;
      if ((node.tagName === 'SPAN' || node.tagName === 'FONT') && colorRe.test(color)) node.style.color = color;
      if (node.tagName === 'SPAN' && colorRe.test(bgColor)) node.style.backgroundColor = bgColor;
      if ((node.tagName === 'SPAN' || node.tagName === 'FONT') && !node.style.color && !node.style.backgroundColor) node.replaceWith(doc.createTextNode(node.textContent || ''));
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
    var filesId = id + '-files';
    var colorHtml = richColorPickerHtml(id, 'foreColor', '글자색', 'A', 'pw-rich-color-fg', ['#e03131', '#f08c00', '#2f9e44', '#1971c2', '#9c36b6'], 'inherit')
      + richColorPickerHtml(id, 'hiliteColor', '형광펜', 'A', 'pw-rich-color-hl', ['#ffec99', '#b2f2bb', '#a5d8ff', '#fcc2d7', '#ffd8a8'], 'transparent');
    return '<div class="pw-rich"><div class="pw-rich-toolbar" role="toolbar" aria-label="본문 서식">' + buttons.map(function (button) { return '<button type="button" tabindex="-1" title="' + button[2] + '" onmousedown="event.preventDefault();OSPersonalWorkspace.richCommand(\'' + button[0] + '\',\'' + (button[3] || '') + '\',\'' + id + '\')">' + button[1] + '</button>'; }).join('') + colorHtml + '<label class="pw-rich-upload">+ 이미지 삽입<input type="file" accept="image/*" multiple hidden onchange="OSPersonalWorkspace.addRichImages(this.files,\'' + id + '\');this.value=\'\'"></label><label class="pw-rich-upload">+ 파일 첨부<input type="file" multiple hidden onchange="OSPersonalWorkspace.addRichFiles(this.files,\'' + filesId + '\');this.value=\'\'"></label></div><div id="' + id + '" class="pw-rich-body" contenteditable="true" role="textbox" aria-multiline="true" aria-label="내용" tabindex="0" data-placeholder="내용을 입력하세요" onmousedown="OSPersonalWorkspace.prepareRichFocus(event,this)" onfocus="OSPersonalWorkspace.focusRichBody(event,this)" onclick="OSPersonalWorkspace.focusRichBody(event,this)" onpaste="OSPersonalWorkspace.richPaste(event)">' + sanitizeRich(html) + '</div><div class="pw-rich-files" id="' + filesId + '"></div></div>';
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
  function focusRichBody(event, editor) {
    var link = event && event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (link && editor && editor.contains(link)) { event.preventDefault(); window.open(link.href, '_blank', 'noopener'); return; }
    if (editor) window.setTimeout(function () { placeRichCaret(editor); }, 0);
  }
  function prepareRichFocus(event, editor) { if (editor && richEditorEmpty(editor)) window.setTimeout(function () { placeRichCaret(editor); }, 0); }
  function richCommand(command, commandValue, editorId) { var editor = editorId ? document.getElementById(editorId) : document.querySelector('#pw-dialog .pw-rich-body'); if (!editor) return; placeRichCaret(editor); document.execCommand(command, false, commandValue || null); }
  /* 글자색·형광펜(2026-08-20, 대표 확정) — 대표 색상 5개 + "없음"(제거) 프리셋 버튼 방식(네이티브
     색상 선택 팝업은 사용법이 어렵다는 대표 피드백으로 폐기). 다른 툴바 버튼과 동일하게
     mousedown+preventDefault로 에디터 선택 영역을 유지한 채 바로 적용.
     "없음" = foreColor는 'inherit'(기본 글자색으로 복귀), hiliteColor는 'transparent'
     (실측: hiliteColor는 transparent 적용 시 감싸던 span이 통째로 풀림 — 완전 제거). */
  function richColorCommand(command, value, editorId) {
    var editor = editorId ? document.getElementById(editorId) : document.querySelector('#pw-dialog .pw-rich-body');
    if (!editor) return;
    placeRichCaret(editor);
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(command, false, value);
  }
  function richColorPickerHtml(id, command, label, icon, modifierClass, colors, clearValue) {
    var swatches = colors.map(function (color) {
      return '<button type="button" class="pw-rich-color-swatch" style="background:' + color + '" title="' + color + '" onmousedown="event.preventDefault();OSPersonalWorkspace.richColorCommand(\'' + command + '\',\'' + color + '\',\'' + id + '\');this.closest(\'details\').open=false"></button>';
    }).join('');
    return '<details class="pw-rich-color-pop"><summary class="pw-rich-color ' + modifierClass + '" title="' + label + '"><span>' + icon + '</span></summary><div class="pw-rich-color-menu">'
      + '<button type="button" class="pw-rich-color-none" onmousedown="event.preventDefault();OSPersonalWorkspace.richColorCommand(\'' + command + '\',\'' + clearValue + '\',\'' + id + '\');this.closest(\'details\').open=false">없음</button>'
      + swatches + '</div></details>';
  }
  function focusRich(id) { placeRichCaret(document.getElementById(id)); }
  function richPaste(event) { var text = String(event && event.clipboardData && event.clipboardData.getData('text/plain') || '').trim(); if (!/^https?:\/\/\S+$/i.test(text)) return; event.preventDefault(); var safe = esc(text); document.execCommand('insertHTML', false, '<a href="' + safe + '" target="_blank" rel="noopener">' + safe + '</a>'); }
  function richValue(id) { var editor = document.getElementById(id); return editor ? sanitizeRich(editor.innerHTML) : ''; }
  function richHasText(html) { var doc = new DOMParser().parseFromString(String(html || ''), 'text/html'); return !!String(doc.body.textContent || '').trim() || !!doc.body.querySelector('img'); }
  function resetRichPending() { (state.pendingRichImages || []).forEach(function (entry) { if (entry.preview) URL.revokeObjectURL(entry.preview); }); state.pendingRichFiles = []; state.pendingRichImages = []; }
  function renderRichFiles(filesId) { var box = document.getElementById(filesId || 'pw-rich-files'); if (!box) return; var files = state.pendingRichFiles || []; box.innerHTML = files.length ? '<strong>첨부파일 ' + files.length + '개</strong>' + files.map(function (entry) { return '<span><b>' + esc(entry.file.name) + '</b><small>' + formatBytes(entry.file.size) + '</small><button type="button" onclick="OSPersonalWorkspace.removeRichFile(\'' + entry.id + '\',\'' + (filesId || 'pw-rich-files') + '\')" aria-label="' + esc(entry.file.name) + ' 제거">×</button></span>'; }).join('') : ''; }
  function addRichFiles(files, filesId) { Array.prototype.slice.call(files || []).forEach(function (file) { state.pendingRichFiles.push({ id: crypto.randomUUID(), file: file }); }); renderRichFiles(filesId); }
  function removeRichFile(id, filesId) { state.pendingRichFiles = state.pendingRichFiles.filter(function (entry) { return entry.id !== id; }); renderRichFiles(filesId); }
  function addRichImages(files, editorId) { var editor = editorId ? document.getElementById(editorId) : document.querySelector('#pw-dialog .pw-rich-body'); if (!editor) return; Array.prototype.slice.call(files || []).filter(function (file) { return /^image\//.test(file.type || ''); }).forEach(function (file) { var id = crypto.randomUUID(), preview = URL.createObjectURL(file); state.pendingRichImages.push({ id: id, file: file, preview: preview }); editor.insertAdjacentHTML('beforeend', '<p><img src="' + esc(preview) + '" data-pending-image="' + id + '" alt="' + esc(file.name) + '"></p>'); }); }
  function formatBytes(bytes) { var value = Number(bytes || 0); if (value < 1024) return value + ' B'; if (value < 1048576) return (value / 1024).toFixed(1) + ' KB'; return (value / 1048576).toFixed(1) + ' MB'; }
  function signStoragePath(path, bucket) {
    bucket = bucket || 'myspace';
    var cacheKey = bucket + '/' + path;
    var cached = state.signedUrlCache[cacheKey];
    if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.url);
    return fetch(window.db.url('/storage/v1/object/sign/' + bucket + '/' + String(path).split('/').map(encodeURIComponent).join('/')), { method: 'POST', headers: { apikey: window.db.key, Authorization: 'Bearer ' + window.db.getToken(), 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 3600 }) })
      .then(function (response) { if (!response.ok) throw new Error('첨부파일을 열지 못했습니다.'); return response.json(); })
      .then(function (data) { var url = window.db.url('/storage/v1' + data.signedURL); state.signedUrlCache[cacheKey] = { url: url, expiresAt: Date.now() + 55 * 60000 }; return url; });
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
  function previewUi(type, name, url, assetRef) {
    var overlay = document.getElementById('pw-preview'), page = document.getElementById('pw-preview-page'), download = document.getElementById('pw-preview-download');
    if (!overlay) return false;
    closeDialog();
    overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); overlay.classList.toggle('is-pdf', type === 'pdf'); overlay.classList.toggle('has-asset', !!assetRef);
    if (page) page.textContent = type === 'pdf' ? '불러오는 중…' : name;
    if (download) { download.href = url; download.download = name || ''; }
    document.body.classList.add('pw-preview-open');
    return true;
  }
  function openPreviewUrl(url, name, mime, assetRef) {
    var type = previewType({ title: name, mime_type: mime, storage_path: url });
    if (!type) { window.open(url, '_blank', 'noopener'); return; }
    if (!previewUi(type, name, url, assetRef)) return;
    var stage = document.getElementById('pw-preview-stage'), overlay = document.getElementById('pw-preview'), thumbs = document.getElementById('pw-preview-thumbs');
    if (stage) { stage.onscroll = handlePreviewScroll; stage.onwheel = handlePreviewWheel; }
    if (thumbs) { thumbs.innerHTML = ''; thumbs.removeAttribute('data-rendered-for'); }
    if (overlay) overlay.classList.remove('has-pages');
    state.preview = { type: type, url: url, name: name || '파일', zoom: 1, rotate: 0, page: 1, pages: 1, doc: null, assetRef: assetRef || null };
    if (type === 'image') { stage.innerHTML = '<img id="pw-preview-image" src="' + esc(url) + '" alt="' + esc(name || '') + '">'; renderPreviewTransform(); return; }
    stage.innerHTML = '<div class="pw-preview-loading">PDF를 불러오는 중입니다.</div>';
    Promise.all([loadPdfJs(), fetch(url).then(function (response) { if (!response.ok) throw new Error('PDF를 불러오지 못했습니다.'); return response.arrayBuffer(); })])
      .then(function (values) { return values[0].getDocument({ data: values[1] }).promise; })
      .then(function (doc) { if (!state.preview || state.preview.url !== url) return; state.preview.doc = doc; state.preview.pages = doc.numPages; renderPdfPreview(); renderPdfThumbs(); })
      .catch(function (error) { if (stage) stage.innerHTML = '<div class="pw-preview-loading">' + esc(error.message || 'PDF 미리보기를 불러오지 못했습니다.') + '</div>'; });
  }
  function openFilePreview(id, assetRef) {
    var item = workspaceItem(id); if (!item || !item.storage_path) return;
    signStoragePath(item.storage_path).then(function (url) { openPreviewUrl(url, item.title || '파일', item.mime_type || '', assetRef || { source: 'library', id: id }); }).catch(saveError);
  }
  function openAssetPreview(source, id) {
    var list = source === 'scripts' ? state.data.scripts : state.data.library;
    var item = list.find(function (entry) { return String(entry.id) === String(id); }); if (!item) return;
    var assetRef = { source: source, id: id };
    if (item.storage_path) { openFilePreview(id, assetRef); return; }
    var url = item.image_url || item.file_url || item.link_url;
    if (url) openPreviewUrl(url, item.title || '파일', item.mime_type || (item.image_url ? 'image/*' : ''), assetRef);
  }
  function renderPreviewTransform() { var p = state.preview, image = document.getElementById('pw-preview-image'); if (p && image) image.style.transform = 'scale(' + p.zoom + ') rotate(' + p.rotate + 'deg)'; }
  function renderPdfPreview() {
    var p = state.preview, stage = document.getElementById('pw-preview-stage'); if (!p || !p.doc || !stage) return;
    var doc = p.doc, availW = Math.max(160, stage.clientWidth - 32), availH = Math.max(160, stage.clientHeight - 48);
    stage.innerHTML = '';
    var wraps = [];
    for (var n = 1; n <= p.pages; n++) {
      var wrap = document.createElement('div'); wrap.className = 'pw-preview-page-wrap'; wrap.setAttribute('data-page', String(n));
      stage.appendChild(wrap); wraps.push(wrap);
    }
    scrollToPreviewPage(p.page);
    wraps.forEach(function (wrap, idx) {
      doc.getPage(idx + 1).then(function (page) {
        if (!state.preview || state.preview !== p) return;
        var base = page.getViewport({ scale: 1, rotation: p.rotate });
        var fitScale = Math.min(availW / base.width, availH / base.height, 2);
        var renderMultiplier = Math.max(2, window.devicePixelRatio || 1);
        var displayViewport = page.getViewport({ scale: fitScale * p.zoom, rotation: p.rotate });
        var viewport = page.getViewport({ scale: fitScale * p.zoom * renderMultiplier, rotation: p.rotate }), canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        canvas.style.width = displayViewport.width + 'px'; canvas.style.height = displayViewport.height + 'px';
        wrap.appendChild(canvas);
        return page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
      }).catch(function () {});
    });
  }
  function scrollToPreviewPage(pageNum) {
    var p = state.preview, stage = document.getElementById('pw-preview-stage'); if (!stage) return;
    var wrap = stage.querySelector('.pw-preview-page-wrap[data-page="' + pageNum + '"]'); if (!wrap) return;
    wrap.scrollIntoView({ behavior: 'auto', block: 'start' });
    if (!p) return;
    p.page = pageNum;
    var pageText = document.getElementById('pw-preview-page'); if (pageText) pageText.textContent = pageNum + ' / ' + p.pages;
    highlightPdfThumb();
  }
  function handlePreviewWheel(event) {
    if (!event.ctrlKey) return;
    event.preventDefault();
    previewZoom(event.deltaY < 0 ? 1 : -1);
  }
  function handlePreviewScroll() {
    var p = state.preview, stage = document.getElementById('pw-preview-stage');
    if (!p || p.type !== 'pdf' || !stage) return;
    var wraps = stage.querySelectorAll('.pw-preview-page-wrap'); if (!wraps.length) return;
    var stageTop = stage.getBoundingClientRect().top, closest = 1, closestDist = Infinity;
    Array.prototype.forEach.call(wraps, function (wrap) {
      var dist = Math.abs(wrap.getBoundingClientRect().top - stageTop);
      if (dist < closestDist) { closestDist = dist; closest = Number(wrap.getAttribute('data-page')); }
    });
    if (closest === p.page) return;
    p.page = closest;
    var pageText = document.getElementById('pw-preview-page'); if (pageText) pageText.textContent = p.page + ' / ' + p.pages;
    highlightPdfThumb();
  }
  function renderPdfThumbs() {
    var p = state.preview, box = document.getElementById('pw-preview-thumbs'), overlay = document.getElementById('pw-preview');
    if (!p || !box || !overlay) return;
    var show = p.type === 'pdf' && p.doc && p.pages > 1;
    overlay.classList.toggle('has-pages', show);
    if (!show) { box.innerHTML = ''; box.removeAttribute('data-rendered-for'); return; }
    if (box.getAttribute('data-rendered-for') === p.url) { highlightPdfThumb(); return; }
    box.setAttribute('data-rendered-for', p.url);
    box.innerHTML = '';
    var doc = p.doc;
    for (var n = 1; n <= p.pages; n++) {
      (function (pageNum) {
        var btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'pw-preview-thumb'; btn.setAttribute('data-page', String(pageNum));
        btn.innerHTML = '<span>' + pageNum + '</span>';
        btn.onclick = function () { if (!state.preview || state.preview.url !== p.url) return; scrollToPreviewPage(pageNum); };
        box.appendChild(btn);
        doc.getPage(pageNum).then(function (page) {
          var viewport = page.getViewport({ scale: .18 }), canvas = document.createElement('canvas');
          canvas.width = viewport.width; canvas.height = viewport.height;
          return page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise.then(function () { btn.insertBefore(canvas, btn.firstChild); });
        }).catch(function () {});
      })(n);
    }
    highlightPdfThumb();
  }
  function highlightPdfThumb() {
    var box = document.getElementById('pw-preview-thumbs'); if (!box) return;
    var page = state.preview && state.preview.page;
    Array.prototype.forEach.call(box.querySelectorAll('.pw-preview-thumb'), function (btn) { btn.classList.toggle('on', Number(btn.getAttribute('data-page')) === page); });
  }
  function closePreview() { var overlay = document.getElementById('pw-preview'), thumbs = document.getElementById('pw-preview-thumbs'); if (overlay) { overlay.classList.remove('open'); overlay.classList.remove('has-pages'); overlay.setAttribute('aria-hidden', 'true'); } if (thumbs) { thumbs.innerHTML = ''; thumbs.removeAttribute('data-rendered-for'); } state.preview = null; document.body.classList.remove('pw-preview-open'); }
  function previewZoom(direction) { var p = state.preview; if (!p) return; p.zoom = Math.min(4, Math.max(.5, p.zoom + direction * .25)); if (p.type === 'pdf') renderPdfPreview(); else renderPreviewTransform(); }
  function previewRotate() { var p = state.preview; if (!p) return; p.rotate = (p.rotate + 90) % 360; if (p.type === 'pdf') renderPdfPreview(); else renderPreviewTransform(); }
  function previewPage(direction) { var p = state.preview; if (!p || p.type !== 'pdf') return; var next = Math.min(p.pages, Math.max(1, p.page + direction)); if (next !== p.page) scrollToPreviewPage(next); }
  function canvasBlob(canvas) { return new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); }); }
  function closeDdakMenu() { var menu = document.getElementById('pw-preview-ddak-menu'), trigger = document.querySelector('.pw-ddak-wrap .pw-preview-ddak'); if (menu) menu.hidden = true; if (trigger) trigger.setAttribute('aria-expanded', 'false'); }
  function toggleDdakMenu(event) { if (event) event.stopPropagation(); var menu = document.getElementById('pw-preview-ddak-menu'), trigger = event && event.currentTarget; if (!menu) return; var open = menu.hidden; menu.hidden = !open; if (trigger) trigger.setAttribute('aria-expanded', String(open)); }
  function previewCopy() {
    var p = state.preview; if (!p) return;
    closeDdakMenu();
    var makeBlob = p.type === 'pdf' ? canvasBlob(document.querySelector('.pw-preview-page-wrap[data-page="' + p.page + '"] canvas')) : fetch(p.url).then(function (response) { return response.blob(); }).then(function (blob) { return createImageBitmap(blob); }).then(function (bitmap) { var canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height; canvas.getContext('2d').drawImage(bitmap, 0, 0); return canvasBlob(canvas); });
    makeBlob.then(function (blob) { if (!blob) throw new Error('이미지를 만들지 못했습니다.'); if (!navigator.clipboard || !window.ClipboardItem) throw new Error('clipboard'); return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); })
      .then(function () { if (typeof window.toast === 'function') window.toast('복사했습니다. 카카오톡에 붙여넣으세요.'); })
      .catch(function () { if (typeof window.toast === 'function') window.toast('이 브라우저에서는 복사를 지원하지 않습니다. 다운로드를 이용해 주세요.'); });
  }
  function previewEditAsset() { var ref = state.preview && state.preview.assetRef; if (!ref) return; closePreview(); editAsset(ref.id); }
  function previewDeleteAsset() { var ref = state.preview && state.preview.assetRef; if (!ref) return; deleteAsset(ref.id); }
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
    var attachmentHtml = attachments.length ? '<div class="pw-detail-files"><strong>첨부파일 ' + attachments.length + '개</strong><div class="pw-detail-files-grid">' + attachments.map(function (file) {
      var type = previewType(file);
      if (type === 'image') {
        if (file.storage_path) return '<img class="pw-detail-thumb" data-storage-path="' + esc(file.storage_path) + '" data-file-title="' + esc(file.title) + '" data-file-mime="' + esc(file.mime_type || '') + '" alt="' + esc(file.title) + '">';
        return '<img class="pw-detail-thumb" src="' + esc(file.url) + '" alt="' + esc(file.title) + '" onclick="OSPersonalWorkspace.openUrlPreview(\'' + esc(jsString(file.url)) + '\',\'' + esc(jsString(file.title)) + '\',\'' + esc(jsString(file.mime_type || 'image/*')) + '\')">';
      }
      var href = file.storage_path ? '#' : esc(file.url || '#');
      return '<a href="' + href + '" data-storage-path="' + esc(file.storage_path || '') + '" data-file-title="' + esc(file.title) + '" data-file-mime="' + esc(file.mime_type || '') + '" target="_blank" rel="noopener"><span>' + (type === 'pdf' ? '▤' : '▣') + '</span><b>' + esc(file.title) + '</b><small>' + (type ? '미리보기 · ' : '') + formatBytes(file.file_size) + '</small></a>';
    }).join('') + '</div></div>' : '';
    var kind = source === 'scripts' ? '업무노트' : item.memo_text ? '메모' : '자료실';
    dialog('<div class="pw-detail"><span class="pw-badge">' + kind + '</span><h2 class="pw-detail-title">' + favoriteButton('asset', id, item.title || '(제목 없음)', kind + ' · ' + formatDate(item.created_at)) + '<span>' + esc(item.title || '(제목 없음)') + '</span></h2><small>' + formatDate(item.created_at) + '</small><div class="pw-detail-body pw-rich-content">' + linkifyRich(body) + '</div>' + attachmentHtml + '<div class="pw-detail-actions">' + actions + '</div></div>');
    hydrateRichStorage();
  }
  function showCustomer(id) {
    var customer = state.data.customers.find(function (entry) { return String(entry.id) === String(id); }); if (!customer) return;
    var history = state.data.consultations.filter(function (entry) { return String(entry.customer_id) === String(id); });
    dialog('<div class="pw-detail"><span class="pw-badge">고객</span><h2 class="pw-detail-title">' + favoriteButton('customer', id, customer.name || '(이름 없음)', phoneText(customer.phone || customer.phone_raw || '')) + '<span>' + esc(customer.name || '(이름 없음)') + '</span></h2><p>' + esc(customer.phone || customer.phone_raw || '') + '</p><h3>상담 기록</h3><div class="pw-list">' + (history.length ? history.map(function (entry) { return row(formatDate(entry.consulted_at || entry.created_at), entry.memo || '', esc(entry.channel || ''), ''); }).join('') : '<div class="pw-empty">상담 기록이 없습니다.</div>') + '</div></div>');
  }
  function eventTitleLabel(event) { return (event && event.completed_at ? '✓ ' : '') + (event && event.title || ''); }
  function eventTimeLabel(timeStr) { if (!timeStr) return ''; var parts = String(timeStr).slice(0, 5).split(':'), h = Number(parts[0]), m = parts[1], period = h < 12 ? '오전' : '오후', h12 = h % 12 === 0 ? 12 : h % 12; return period + ' ' + h12 + ':' + m; }
  function eventDateLabel(dateStr, timeStr, endDateStr, endTimeStr) {
    if (!dateStr) return '';
    var d = parseDate(dateStr), label = (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + weekday(dateStr) + ')';
    if (endDateStr && endDateStr !== dateStr) { var e = parseDate(endDateStr); label += ' – ' + (e.getMonth() + 1) + '월 ' + e.getDate() + '일 (' + weekday(endDateStr) + ')'; }
    if (timeStr) { label += ' · ' + eventTimeLabel(timeStr); if (endTimeStr) label += '~' + eventTimeLabel(endTimeStr); }
    return label;
  }
  function showEvent(id) {
    var event = allEvents().find(function (entry) { return String(entry.id) === String(id); }); if (!event) return;
    var care = isCareTask(event);
    var kind = care ? '고객관리' : event.event_type === 'holiday' ? '공휴일' : event.event_type === 'term' ? '절기' : event.event_type === 'memorial' ? '기념일' : '일정';
    var sub = eventDateLabel(event.event_date, event.builtin ? '' : event.event_time, event.builtin ? '' : event.event_end_date, event.builtin ? '' : event.event_end_time);
    var editable = !event.builtin && !care;
    var done = !!event.completed_at;
    var actions = event.builtin ? '' : '<div class="pw-detail-actions"><button type="button" class="pw-btn danger" onclick="OSPersonalWorkspace.deleteEvent(\'' + esc(id) + '\')">삭제</button>' + (editable ? '<button type="button" class="pw-btn primary" onclick="OSPersonalWorkspace.editEvent(\'' + esc(id) + '\')">수정</button>' : '') + '<button type="button" class="pw-btn' + (done ? '' : ' primary') + '" onclick="OSPersonalWorkspace.toggleEventComplete(\'' + esc(id) + '\')">' + (done ? '완료 취소' : '완료 처리') + '</button></div>';
    var badge = care && event.customer_id ? '<button type="button" class="pw-badge pw-badge-link" onclick="OSPersonalWorkspace.openCustomerFromEvent(\'' + esc(event.customer_id) + '\')">' + kind + (done ? ' · 완료' : '') + '</button>' : '<span class="pw-badge">' + kind + (done ? ' · 완료' : '') + '</span>';
    dialog('<div class="pw-detail">' + badge + '<h2 class="pw-detail-title">' + (event.builtin ? '' : favoriteButton('event', id, event.title || '일정', sub)) + '<span>' + esc(event.title) + '</span></h2><p>' + esc(sub) + '</p><div class="pw-detail-body">' + esc(event.description || '') + '</div>' + actions + '</div>');
  }
  function openCustomerFromEvent(customerId) { closeDialog(); state.customerStatusFilter = 'all'; state.customerNameQuery = ''; go('customers'); selectCustomerDetail(customerId); }

  function formField(label, input) { return '<label class="pw-field"><span>' + label + '</span>' + input + '</label>'; }
  /* 라벨-입력칸 한 줄 스타일(2026-08-20, 대표 확정) — 고객/상담 폼 전용. formField()는 다른 화면(자료실 등)에서도 쓰여서 그대로 두고, 여기서만 별도 헬퍼로 분리 */
  function inlineField(label, input) { return '<label class="pw-inline-field"><span>' + label + '</span>' + input + '</label>'; }
  /* 청약일자 다중 입력행(고객관리 전용, 2026-08-20) — DOM에서 직접 값을 수집/추가/삭제(별도 JS 배열 보관 없음). 좁은 폭(fit-content)으로 렌더되도록 CSS(.pw-contract-dates-*)가 잡아준다. */
  function contractDateRowHtml(date, ageContext) {
    return '<div class="pw-contract-date-row"><input type="text" class="pw-contract-date-input" inputmode="numeric" maxlength="10" placeholder="YYYY-MM-DD" value="' + esc(date || '') + '" oninput="OSPersonalWorkspace.formatBirthInput(this,\'' + (ageContext || '') + '\')"><button type="button" class="pw-contract-date-del" aria-label="청약일자 삭제" onclick="OSPersonalWorkspace.removeContractDateRow(this)">×</button></div>';
  }
  function contractDatesField(prefix, dates, ageContext) {
    var list = dates && dates.length ? dates : [ymd(new Date())];
    var rows = list.map(function (date) { return contractDateRowHtml(date, ageContext); }).join('');
    return '<div class="pw-inline-row pw-contract-dates-field"><span class="pw-inline-row-label">청약일자</span><div class="pw-contract-dates-wrap"><div class="pw-contract-dates-list" id="' + prefix + '-appl-list" data-age-context="' + esc(ageContext || '') + '">' + rows + '</div><button type="button" class="pw-link-btn pw-contract-date-add" onclick="OSPersonalWorkspace.addContractDateRow(\'' + prefix + '\')">+ 청약추가</button></div></div>';
  }
  function addContractDateRow(prefix) {
    var box = document.getElementById(prefix + '-appl-list'); if (!box) return;
    box.insertAdjacentHTML('beforeend', contractDateRowHtml(ymd(new Date()), box.getAttribute('data-age-context')));
  }
  function removeContractDateRow(button) {
    var row = button && button.closest ? button.closest('.pw-contract-date-row') : null; if (!row) return;
    var box = row.parentElement;
    row.remove();
    if (box && !box.children.length) box.insertAdjacentHTML('beforeend', contractDateRowHtml(ymd(new Date()), box.getAttribute('data-age-context')));
  }
  function gatherContractDates(prefix) {
    var box = document.getElementById(prefix + '-appl-list'); if (!box) return [];
    var inputs = box.querySelectorAll('.pw-contract-date-input'), out = [];
    for (var i = 0; i < inputs.length; i++) { var v = String(inputs[i].value || '').trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(v)) out.push(v); }
    out = out.filter(function (d, i) { return out.indexOf(d) === i; });
    out.sort();
    return out;
  }
  function earliestContractDateValue(prefix) { var dates = gatherContractDates(prefix); return dates.length ? dates[0] : ''; }
  function customerExtraFieldsHtml(profile, prefix) {
    profile = profile || {};
    return '<div class="pw-customer-extra"><section><h3>주소 정보</h3>'
      + '<div class="pw-inline-row pw-customer-address-row"><span class="pw-inline-row-label">주소</span><div class="pw-customer-address">'
      + '<input id="' + prefix + '-zip" class="pw-customer-zip-input" placeholder="우편번호" value="' + esc(profile.zip || '') + '" readonly onclick="OSPersonalWorkspace.searchCustomerAddress(\'' + prefix + '\')">'
      + '<input id="' + prefix + '-address" class="pw-customer-address-input" placeholder="주소" value="' + esc(profile.address || '') + '" readonly onclick="OSPersonalWorkspace.searchCustomerAddress(\'' + prefix + '\')">'
      + '<button type="button" class="pw-link-btn" onclick="OSPersonalWorkspace.searchCustomerAddress(\'' + prefix + '\')">주소검색</button>'
      + '</div></div>'
      + inlineField('상세주소', '<input id="' + prefix + '-address-detail" placeholder="동·호수 등 상세 주소 (주소 선택 후 입력)" value="' + esc(profile.address_detail || '') + '">')
      + '</section><section><h3>인수 정보</h3><div class="pw-customer-underwriting">'
      + inlineField('직업', '<input id="' + prefix + '-job" value="' + esc(profile.job || '') + '" placeholder="예: 사무직 / 운전직 / 농업">')
      + inlineField('운전여부', '<input id="' + prefix + '-driving" value="' + esc(profile.driving_status || '') + '" placeholder="예: 자가운전 / 대중교통 / 없음">')
      + inlineField('병력', '<input id="' + prefix + '-history" value="' + esc(profile.medical_history || '') + '" placeholder="예: 갑상선 결절 / 고혈압 / 당뇨">')
      + inlineField('약복용', '<select id="' + prefix + '-medication"><option value="">선택</option><option' + (profile.medication === '복용 중' ? ' selected' : '') + '>복용 중</option><option' + (profile.medication === '복용 안 함' ? ' selected' : '') + '>복용 안 함</option><option' + (profile.medication === '과거 복용' ? ' selected' : '') + '>과거 복용</option></select>')
      + inlineField('진단시기', '<input id="' + prefix + '-diagnosis" value="' + esc(profile.diagnosis_date || '') + '" placeholder="예: 2025년 3월">')
      + inlineField('현재상태', '<input id="' + prefix + '-current-status" value="' + esc(profile.current_condition || '') + '" placeholder="예: 추적관찰 중 / 수술 완료">')
      + '</div></section></div>';
  }
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
      .then(function () { closeDialog(); closePreview(); removeWorkspaceItemsLocal(childIds.concat([id])); renderContent(); if (typeof window.toast === 'function') window.toast('자료를 삭제했습니다.'); }).catch(saveError);
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
    var statuses = CUSTOMER_STAGES.map(function (stage) { return stage.key; });
    var form = '<div class="pw-consult-registration pw-customer-registration">'
      + customerOcrHtml()
      + '<div class="pw-inline-form-block">'
      + contractDatesField('pwf-customer', [ymd(new Date())], 'customer')
      + '<div class="pw-inline-form-row">'
      + inlineField('이름', '<input id="pwf-customer-name" required autocomplete="name">')
      + inlineField('생년월일', '<div class="pw-birth-age"><input id="pwf-customer-birth" type="text" inputmode="numeric" maxlength="10" placeholder="YYYY-MM-DD" oninput="OSPersonalWorkspace.formatBirthInput(this,\'customer\')"><span id="pwf-customer-insurance-age">보험나이 -</span></div>')
      + '<div class="pw-gender" role="radiogroup" aria-label="성별"><label><input type="radio" name="pwf-customer-gender" value="남">남</label><label><input type="radio" name="pwf-customer-gender" value="여">여</label></div>'
      + '</div><div class="pw-inline-form-row">'
      + inlineField('전화번호', '<input id="pwf-customer-phone" inputmode="numeric" autocomplete="tel" oninput="OSPersonalWorkspace.formatConsultPhone(this)">')
      + inlineField('고객상태', '<select id="pwf-customer-status">' + statuses.map(function (entry) { return '<option>' + entry + '</option>'; }).join('') + '</select>')
      + '</div></div>'
      + customerExtraFieldsHtml({}, 'pwf-customer')
      + '<div class="pw-consult-editor">' + formField('고객내용', richEditorField('pwf-customer-note', '')) + '</div></div>';
    resetRichPending(); dialog(formShell('고객 등록', form, 'OSPersonalWorkspace.saveCustomer()')); refreshCustomerInsuranceAge(); bindCustomerOcr();
  }
  var customerOcrPending = { base64: '', mime: '' };
  function customerOcrHtml() {
    return '<div class="pw-ocr"><div class="pw-ocr-hint">고객정보 캡처를 <b>Ctrl+V</b>로 붙여넣으면 자동 입력됩니다. <span class="pw-ocr-stat" id="pw-ocr-stat"></span></div></div>';
  }
  function bindCustomerOcr() {
    customerOcrPending = { base64: '', mime: '' };
    var box = document.getElementById('pw-dialog'); if (!box || box._ocrBound) return; box._ocrBound = true;
    box.addEventListener('paste', function (event) {
      if (!document.getElementById('pw-ocr-stat')) return;   /* 고객등록 폼이 열려 있을 때만 반응 */
      try {
        var clipboard = event.clipboardData; if (!clipboard || !clipboard.items) return;
        for (var i = 0; i < clipboard.items.length; i++) {
          var item = clipboard.items[i];
          if (item.kind === 'file' && /^image\//.test(item.type || '')) {
            var file = item.getAsFile(); if (!file) continue; event.preventDefault();
            var reader = new FileReader();
            reader.onload = function (e) {
              var url = String(e.target.result || '');
              customerOcrPending.base64 = url.split(',')[1] || '';
              customerOcrPending.mime = (url.match(/^data:([^;]+);/) || [])[1] || 'image/png';
              runCustomerOcr();
            };
            reader.readAsDataURL(file); return;
          }
        }
      } catch (e) { /* 붙여넣기 무시 */ }
    });
  }
  function setCustomerRadio(name, value) {
    if (!value) return;
    var input = document.querySelector('input[name="' + name + '"][value="' + value + '"]');
    if (input) input.checked = true;
  }
  function setCustomerSelectExact(id, value) {
    var el = document.getElementById(id); if (!el || !value) return;
    for (var i = 0; i < el.options.length; i++) { if (el.options[i].value === value || el.options[i].text === value) { el.selectedIndex = i; return; } }
  }
  function runCustomerOcr() {
    if (!customerOcrPending.base64) { alert('먼저 고객정보 화면 캡처를 붙여넣어 주세요 (Ctrl+V).'); return; }
    var stat = document.getElementById('pw-ocr-stat'); if (stat) stat.textContent = '읽는 중…';
    if (!window.db || !window.db.fetch) { if (stat) stat.textContent = '연결 오류'; return; }
    window.db.fetch('/functions/v1/gemini-customer-ocr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: customerOcrPending.base64, mimeType: customerOcrPending.mime }) })
      .then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
      .then(function (result) {
        if (!result.ok) { if (stat) stat.textContent = (result.body && result.body.error) || '추출 실패'; return; }
        var d = result.body || {};
        if (d.name) setValue('pwf-customer-name', d.name);
        if (d.phone) setValue('pwf-customer-phone', phoneText(d.phone));
        if (d.birth_date) setValue('pwf-customer-birth', d.birth_date);
        if (d.gender) setCustomerRadio('pwf-customer-gender', d.gender);
        if (d.address) setValue('pwf-customer-address', d.address);
        if (d.job) setValue('pwf-customer-job', d.job);
        if (d.medication) setCustomerSelectExact('pwf-customer-medication', d.medication);
        if (d.medical_history) setValue('pwf-customer-history', d.medical_history);
        if (d.diagnosis_date) setValue('pwf-customer-diagnosis', d.diagnosis_date);
        if (d.current_status) setValue('pwf-customer-current-status', d.current_status);
        refreshCustomerInsuranceAge();
        if (stat) stat.textContent = '반영됨 — 확인·수정 후 저장하세요';
      })
      .catch(function (error) { if (stat) stat.textContent = '오류: ' + (error && error.message || error); });
  }
  function setValue(id, value) { var el = document.getElementById(id); if (el) el.value = value; }
  function customerOptions() { return state.data.customers.map(function (item) { return '<option value="' + esc(item.id) + '">' + esc(item.name || '이름 없음') + '</option>'; }).join(''); }
  function consultationForm(item, customer) {
    item = item || {}; customer = customer || {}; var profile = customerProfile(customer), date = String(item.consulted_at || ymd(new Date())).slice(0, 10), status = consultationStatus(item, customer);
    var statuses = ['예약', '진행중', '제안서발송', '클로징', '청약완료', '보류', '종결'];
    return '<div class="pw-consult-registration"><div class="pw-inline-form-block">'
      + '<div class="pw-inline-form-row">' + inlineField('등록일자', '<input id="pwf-consult-date" type="text" inputmode="numeric" maxlength="10" placeholder="YYYY-MM-DD" required value="' + esc(date) + '" oninput="OSPersonalWorkspace.formatBirthInput(this)">') + '</div>'
      + '<div class="pw-inline-form-row">'
      + inlineField('이름', '<input id="pwf-consult-name" required autocomplete="name" value="' + esc(customer.name || '') + '">')
      + inlineField('생년월일', '<div class="pw-birth-age"><input id="pwf-consult-birth" type="text" inputmode="numeric" maxlength="10" placeholder="YYYY-MM-DD" value="' + esc(profile.birth_date || '') + '" oninput="OSPersonalWorkspace.formatBirthInput(this,\'form\')"><span id="pwf-insurance-age">보험나이 -</span></div>')
      + '<div class="pw-gender" role="radiogroup" aria-label="성별"><label><input type="radio" name="pwf-consult-gender" value="남"' + (profile.gender === '남' ? ' checked' : '') + '>남</label><label><input type="radio" name="pwf-consult-gender" value="여"' + (profile.gender === '여' ? ' checked' : '') + '>여</label></div>'
      + '</div><div class="pw-inline-form-row">'
      + inlineField('전화번호', '<input id="pwf-consult-phone" inputmode="numeric" autocomplete="tel" value="' + esc(phoneText(customer.phone || customer.phone_raw || '')) + '" oninput="OSPersonalWorkspace.formatConsultPhone(this)">')
      + inlineField('상담상태', '<select id="pwf-consult-status" onchange="OSPersonalWorkspace.consultationStatusChanged(this,\'form\')">' + statuses.map(function (entry) { return '<option value="' + entry + '"' + (entry === status ? ' selected' : '') + '>' + entry + '</option>'; }).join('') + '</select>')
      + '</div></div>'
      + '<div class="pw-consult-editor">' + formField('상담내용', richEditorField('pwf-consult-memo', item.memo || '')) + '<p class="pw-consult-editor-note">웹 주소를 붙여 넣으면 바로 열 수 있는 링크로 저장됩니다. 여러 파일을 한 번에 첨부할 수 있습니다.</p>' + consultationExistingAttachments(item.id) + '</div>'
      + '<input id="pwf-consult-customer-id" type="hidden" value="' + esc(customer.id || '') + '"><input id="pwf-consult-id" type="hidden" value="' + esc(item.id || '') + '"></div>';
  }
  function consultationAttachmentRoot(consultationId) { return (state.data.items || []).find(function (entry) { var payload = entry.legacy_payload || {}; return payload.workspace_category === 'consultation' && payload.attachment_root === true && String(payload.consultation_id || '') === String(consultationId || ''); }); }
  function customerAttachmentRoot(customerId) { return (state.data.items || []).find(function (entry) { var payload = entry.legacy_payload || {}; return payload.workspace_category === 'customer' && payload.attachment_root === true && String(payload.customer_id || '') === String(customerId || ''); }); }
  /* 첨부파일 목록 항목(2026-08-20, 대표 확정) — 이름수정·삭제 버튼 추가. 기존 자료실의
     editAsset/deleteAsset(workspace_items 공용 함수)를 그대로 재사용 — 첨부파일도 같은
     workspace_items 테이블 행이라 새 함수 없이 그대로 동작. */
  function attachmentItemHtml(file) {
    return '<span class="pw-att-item"><a href="#" data-storage-path="' + esc(file.storage_path || '') + '" data-file-title="' + esc(file.title || '첨부파일') + '" data-file-mime="' + esc(file.mime_type || '') + '">' + esc(file.title || '첨부파일') + '<small>' + formatBytes(file.file_size) + '</small></a>'
      + '<button type="button" class="pw-att-edit" title="이름 수정" onclick="OSPersonalWorkspace.editAsset(\'' + esc(file.id) + '\')">✎</button>'
      + '<button type="button" class="pw-att-del" title="삭제" onclick="OSPersonalWorkspace.deleteAsset(\'' + esc(file.id) + '\')">×</button></span>';
  }
  function customerExistingAttachments(customerId) { var root = customerAttachmentRoot(customerId); if (!root) return ''; var files = (state.data.items || []).filter(function (entry) { return String(entry.parent_id || '') === String(root.id); }); if (!files.length) return ''; return '<div class="pw-consult-existing"><strong>기존 첨부파일 ' + files.length + '개</strong>' + files.map(attachmentItemHtml).join('') + '</div>'; }
  function consultationExistingAttachments(consultationId) { var root = consultationAttachmentRoot(consultationId); if (!root) return ''; var files = (state.data.items || []).filter(function (entry) { return String(entry.parent_id || '') === String(root.id); }); if (!files.length) return ''; return '<div class="pw-consult-existing"><strong>기존 첨부파일 ' + files.length + '개</strong>' + files.map(attachmentItemHtml).join('') + '</div>'; }
  function addConsultation(customerId) { resetRichPending(); var customer = state.data.customers.find(function (entry) { return String(entry.id) === String(customerId || ''); }) || {}; dialog(formShell('상담 등록', consultationForm(null, customer), 'OSPersonalWorkspace.saveConsultation()')); refreshInsuranceAge(); }
  function editConsultation(id) { var item = state.data.consultations.find(function (entry) { return String(entry.id) === String(id); }); if (!item) return; resetRichPending(); var customer = state.data.customers.find(function (entry) { return String(entry.id) === String(item.customer_id); }) || {}; dialog(formShell('상담 수정', consultationForm(item, customer), 'OSPersonalWorkspace.saveConsultation()')); refreshInsuranceAge(); hydrateRichStorage(); }
  function refreshInsuranceAge() { var target = document.getElementById('pwf-insurance-age'); if (!target) return; var age = insuranceAge(value('pwf-consult-birth'), value('pwf-consult-date')); target.textContent = '보험나이 ' + (age === '' ? '-' : age + '세'); }
  function refreshCustomerInsuranceAge() { var target = document.getElementById('pwf-customer-insurance-age'); if (!target) return; var age = insuranceAge(value('pwf-customer-birth'), earliestContractDateValue('pwf-customer')); target.textContent = '보험나이 ' + (age === '' ? '-' : age + '세'); }
  function searchCustomerAddress(idPrefix) { var prefix = (idPrefix || 'pwf-customer') + '-'; function openPostcode() { try { new window.daum.Postcode({ oncomplete: function (data) { var zip = document.getElementById(prefix + 'zip'), address = document.getElementById(prefix + 'address'), detail = document.getElementById(prefix + 'address-detail'); if (zip) zip.value = data.zonecode || data.postcode || ''; if (address) address.value = data.roadAddress || data.jibunAddress || data.address || ''; if (detail) detail.focus(); } }).open(); } catch (_) { if (typeof window.toast === 'function') window.toast('주소검색을 열지 못했습니다.'); } } if (window.daum && window.daum.Postcode) return openPostcode(); var old = document.getElementById('daum-postcode-sdk'); if (old) return; var script = document.createElement('script'); script.id = 'daum-postcode-sdk'; script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'; script.onload = openPostcode; script.onerror = function () { if (typeof window.toast === 'function') window.toast('주소검색을 불러오지 못했습니다.'); }; document.head.appendChild(script); }
  function formatBirthInput(input, context) { if (!input) return; var raw = String(input.value || '').replace(/\D/g, '').slice(0, 8), formatted = raw; if (raw.length > 4) formatted = raw.slice(0, 4) + '-' + raw.slice(4); if (raw.length > 6) formatted = raw.slice(0, 4) + '-' + raw.slice(4, 6) + '-' + raw.slice(6); input.value = formatted; if (context === 'detail') refreshDetailInsuranceAge(); else if (context === 'customerDetail') refreshCustomerDetailInsuranceAge(); else if (context === 'customer') refreshCustomerInsuranceAge(); else if (context === 'tool') calcToolInsuranceAge(); else refreshInsuranceAge(); }
  function formatConsultPhone(input) { if (input) input.value = phoneText(input.value); }
  function timeOptionsHtml(selected) {
    var out = ['<option value="">시간 선택</option>'];
    for (var h = 0; h < 24; h++) {
      for (var m = 0; m < 60; m += 15) {
        var value = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'), period = h < 12 ? '오전' : '오후', h12 = h % 12 === 0 ? 12 : h % 12;
        out.push('<option value="' + value + '"' + (value === selected ? ' selected' : '') + '>' + period + ' ' + h12 + ':' + String(m).padStart(2, '0') + '</option>');
      }
    }
    return out.join('');
  }
  function toggleEventTime() {
    var row = document.getElementById('pwf-event-timerow'), toggle = document.getElementById('pwf-event-time-toggle');
    if (!row || !row.hasAttribute('hidden')) return;
    row.removeAttribute('hidden'); if (toggle) toggle.style.display = 'none';
    var select = document.getElementById('pwf-event-time'); if (select) select.focus();
  }
  function eventFormHtml(event) {
    var hasTime = !!(event && event.task_time);
    var startDate = event ? String(event.task_date || '').slice(0, 10) : state.selectedDate;
    var endDate = event ? String(event.end_date || event.task_date || '').slice(0, 10) : state.selectedDate;
    return '<input id="pwf-event-title" class="pw-event-title-input" required autocomplete="off" placeholder="제목 추가" value="' + esc(event ? event.title || '' : '') + '">'
      + '<div class="pw-event-datebar"><input id="pwf-event-date" type="date" required value="' + esc(startDate) + '"><span class="pw-event-sep">–</span><input id="pwf-event-end-date" type="date" required value="' + esc(endDate) + '">' + (hasTime ? '' : '<button type="button" class="pw-event-time-toggle" id="pwf-event-time-toggle" onclick="OSPersonalWorkspace.toggleEventTime()">+ 시간 추가</button>') + '</div>'
      + '<div class="pw-event-timerow" id="pwf-event-timerow"' + (hasTime ? '' : ' hidden') + '><select id="pwf-event-time">' + timeOptionsHtml(hasTime ? String(event.task_time).slice(0, 5) : '') + '</select><span class="pw-event-sep">–</span><select id="pwf-event-end-time">' + timeOptionsHtml(event && event.end_time ? String(event.end_time).slice(0, 5) : '') + '</select></div>'
      + '<textarea id="pwf-event-desc" rows="4" class="pw-event-desc" placeholder="설명 추가">' + esc(event ? event.description || '' : '') + '</textarea>'
      + (event ? '<input id="pwf-event-id" type="hidden" value="' + esc(event.id) + '">' : '');
  }
  function addEvent(date) { state.selectedDate = date || state.selectedDate; dialog(formShell('일정 추가', eventFormHtml(null), 'OSPersonalWorkspace.saveEvent()')); var title = document.getElementById('pwf-event-title'); if (title) title.focus(); }

  function openTool(key) {
    if (key === 'calculator') return openCalculatorTool();
    if (key === 'bmi') return openBmiTool();
    if (key === 'insurance-age') return openInsuranceAgeTool();
    if (key === 'image-convert') return openImageConvertTool();
    if (key === 'system-links') return openQuickContentTool('원전산 설계 바로가기', '원전산 바로가기', 'links');
    if (key === 'payment-info') return openQuickContentTool('보험회사 결제정보', '보험회사 결제정보', 'payment');
  }
  function parseQuickLinks(html) {
    var wrapper = document.createElement('div'); wrapper.innerHTML = html;
    var grid = wrapper.querySelector('div[style*="grid-template-columns:1fr 1fr"]');
    var columns = grid ? Array.prototype.filter.call(grid.children, function (c) { return c.tagName === 'DIV'; }) : [];
    return columns.map(function (col) {
      var header = col.children[0], linksBox = col.children[1];
      var label = header ? header.textContent.trim() : '';
      var items = linksBox ? Array.prototype.map.call(linksBox.children, function (child) {
        var isLink = child.tagName === 'A';
        var card = isLink ? child.firstElementChild : child;
        var nameDiv = card ? card.firstElementChild : null;
        var name = (nameDiv ? nameDiv.textContent : (card || child).textContent || '').trim();
        return { name: name, href: isLink ? child.getAttribute('href') : null };
      }) : [];
      return { label: label, items: items };
    }).filter(function (g) { return g.items.length; });
  }
  function quickLinksCardsHtml(groups) {
    var search = '<label class="pw-tool-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="회사명 검색" oninput="OSPersonalWorkspace.filterQuickLinks(this.value)"></label>';
    var body = groups.map(function (g) {
      return '<section class="pw-qlink-group"><h3>' + esc(g.label) + '</h3><div class="pw-qlink-grid">' + g.items.map(function (item) {
        var name = item.name || '(이름 없음)';
        if (!item.href) return '<div class="pw-qlink-card disabled" data-name="' + esc(name.toLowerCase()) + '"><span>' + esc(name) + '</span><small>URL 없음</small></div>';
        return '<a class="pw-qlink-card" data-name="' + esc(name.toLowerCase()) + '" href="' + esc(item.href) + '" target="_blank" rel="noopener noreferrer"><span>' + esc(name) + '</span><small>열기 →</small></a>';
      }).join('') + '</div></section>';
    }).join('');
    return search + '<div class="pw-quick-tool-body" id="pw-qlink-body">' + body + '</div>';
  }
  function filterQuickLinks(q) {
    q = q.trim().toLocaleLowerCase('ko-KR');
    Array.prototype.forEach.call(document.querySelectorAll('#pw-qlink-body [data-name]'), function (card) {
      card.style.display = (!q || (card.getAttribute('data-name') || '').indexOf(q) >= 0) ? '' : 'none';
    });
  }
  function parsePaymentInfo(html) {
    var wrapper = document.createElement('div'); wrapper.innerHTML = html;
    var outer = wrapper.children[0];
    var kids = outer ? Array.prototype.filter.call(outer.children, function (c) { return c.tagName === 'DIV'; }) : [];
    if (kids.length < 7 || kids.length % 2 !== 1) return null;
    var noticeBox = kids[1], footerBox = kids[kids.length - 1];
    var groups = [];
    for (var i = 2; i < kids.length - 1; i += 2) {
      var label = kids[i].textContent.trim();
      var cards = Array.prototype.map.call(kids[i + 1].children, function (card) {
        var divKids = Array.prototype.filter.call(card.children, function (c) { return c.tagName === 'DIV'; });
        var nameDiv = divKids[0], detailDiv = divKids[1];
        return { name: nameDiv ? nameDiv.innerHTML : '', detail: detailDiv ? detailDiv.innerHTML : '' };
      });
      groups.push({ label: label, cards: cards });
    }
    return { noticeHtml: noticeBox ? noticeBox.innerHTML : '', footerHtml: footerBox ? footerBox.innerHTML : '', groups: groups };
  }
  function paymentInfoHtml(parsed) {
    var search = '<label class="pw-tool-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="회사명 검색" oninput="OSPersonalWorkspace.filterQuickLinks(this.value)"></label>';
    var notice = parsed.noticeHtml ? '<div class="pw-payinfo-notice">' + parsed.noticeHtml + '</div>' : '';
    var groups = parsed.groups.map(function (g) {
      return '<section class="pw-qlink-group"><h3>' + esc(g.label) + '</h3><div class="pw-payinfo-grid">' + g.cards.map(function (c) {
        return '<div class="pw-payinfo-card" data-name="' + esc(stripHtml(c.name).toLowerCase()) + '"><strong>' + c.name + '</strong><div class="pw-payinfo-detail">' + c.detail + '</div></div>';
      }).join('') + '</div></section>';
    }).join('');
    var footer = parsed.footerHtml ? '<div class="pw-payinfo-footer">' + parsed.footerHtml + '</div>' : '';
    return search + notice + '<div class="pw-quick-tool-body pw-payinfo-body" id="pw-qlink-body">' + groups + '</div>' + footer;
  }
  function openQuickContentTool(tabTitle, popupTitle, mode) {
    var toolClass = mode === 'payment' ? 'pw-quick-tool pw-payinfo-tool' : 'pw-quick-tool';
    dialog('<div class="' + toolClass + '"><h2>' + esc(popupTitle) + '</h2><div id="pw-quick-tool-slot"><div class="pw-quick-tool-loading">불러오는 중입니다…</div></div></div>');
    api('quick_contents?tab_title=eq.' + encodeURIComponent(tabTitle) + '&select=content_html&limit=1').then(function (rows) {
      var slot = document.getElementById('pw-quick-tool-slot'); if (!slot) return;
      var html = rows && rows[0] && rows[0].content_html;
      if (!html) { slot.innerHTML = '<div class="pw-quick-tool-empty">등록된 내용이 없습니다.</div>'; return; }
      if (mode === 'links') {
        var groups = parseQuickLinks(html);
        slot.innerHTML = groups.length ? quickLinksCardsHtml(groups) : '<div class="pw-quick-tool-raw">' + html + '</div>';
      } else if (mode === 'payment') {
        var parsed = parsePaymentInfo(html);
        slot.innerHTML = parsed ? paymentInfoHtml(parsed) : '<div class="pw-quick-tool-raw">' + html + '</div>';
      } else {
        slot.innerHTML = '<div class="pw-quick-tool-raw">' + html + '</div>';
      }
    }).catch(function () {
      var slot = document.getElementById('pw-quick-tool-slot'); if (slot) slot.innerHTML = '<div class="pw-quick-tool-empty">불러오지 못했습니다. 다시 시도해 주세요.</div>';
    });
  }
  function resetCalc() { state.calc = { display: '0', stored: null, operator: null, waiting: false }; }
  function calcRenderDisplay() { var el = document.getElementById('pw-calc-display'); if (el) el.textContent = state.calc.display; }
  function calcApply(a, b, op) { var r = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : op === '÷' ? (b === 0 ? NaN : a / b) : b; return isNaN(r) ? 0 : Math.round(r * 1e8) / 1e8; }
  function calcPress(key) {
    var c = state.calc;
    if (/^[0-9]$/.test(key)) {
      if (c.waiting || c.display === '0') { c.display = key; c.waiting = false; }
      else if (c.display.replace('-', '').replace('.', '').length < 12) c.display += key;
    } else if (key === '.') {
      if (c.waiting) { c.display = '0.'; c.waiting = false; }
      else if (c.display.indexOf('.') < 0) c.display += '.';
    } else if (key === 'C') {
      resetCalc();
    } else if (key === '±') {
      c.display = c.display.charAt(0) === '-' ? c.display.slice(1) : (c.display === '0' ? '0' : '-' + c.display);
    } else if (key === '%') {
      c.display = String(parseFloat(c.display) / 100);
    } else if (['+', '−', '×', '÷'].indexOf(key) >= 0) {
      if (c.stored !== null && !c.waiting) c.display = String(calcApply(c.stored, parseFloat(c.display), c.operator));
      c.stored = parseFloat(c.display); c.operator = key; c.waiting = true;
    } else if (key === '=') {
      if (c.stored !== null && c.operator) { c.display = String(calcApply(c.stored, parseFloat(c.display), c.operator)); c.stored = null; c.operator = null; c.waiting = true; }
    }
    calcRenderDisplay();
  }
  function openCalculatorTool() {
    resetCalc();
    var fnKeys = ['C', '±', '%', '÷'], numRows = ['7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+'];
    function keyClass(k) { return k === '÷' || k === '×' || k === '−' || k === '+' ? 'op' : (k === 'C' || k === '±' || k === '%') ? 'fn' : ''; }
    var keys = fnKeys.concat(numRows).map(function (k) { return '<button type="button" class="' + keyClass(k) + '" onclick="OSPersonalWorkspace.calcPress(\'' + k + '\')">' + k + '</button>'; }).join('')
      + '<button type="button" class="wide" onclick="OSPersonalWorkspace.calcPress(\'0\')">0</button><button type="button" onclick="OSPersonalWorkspace.calcPress(\'.\')">.</button><button type="button" class="eq" onclick="OSPersonalWorkspace.calcPress(\'=\')">=</button>';
    dialog('<div class="pw-tool-panel pw-calc-tool"><h2>계산기</h2><div class="pw-calc-display" id="pw-calc-display">0</div><div class="pw-calc-grid">' + keys + '</div></div>');
  }
  function openBmiTool() {
    dialog('<div class="pw-tool-panel pw-bmi-tool"><h2>BMI 계산기</h2>'
      + '<label>키 (cm)<input id="pw-bmi-height" type="number" inputmode="decimal" placeholder="170" oninput="OSPersonalWorkspace.calcBmi()"></label>'
      + '<label>몸무게 (kg)<input id="pw-bmi-weight" type="number" inputmode="decimal" placeholder="65" oninput="OSPersonalWorkspace.calcBmi()"></label>'
      + '<div class="pw-bmi-result" id="pw-bmi-result"><strong id="pw-bmi-value">-</strong><span id="pw-bmi-category">키와 몸무게를 입력하세요</span></div></div>');
  }
  function calcBmi() {
    var h = parseFloat(value('pw-bmi-height')), w = parseFloat(value('pw-bmi-weight'));
    var valueEl = document.getElementById('pw-bmi-value'), catEl = document.getElementById('pw-bmi-category'), resultEl = document.getElementById('pw-bmi-result');
    if (!valueEl || !catEl || !resultEl) return;
    if (!h || !w || h <= 0 || w <= 0) { valueEl.textContent = '-'; catEl.textContent = '키와 몸무게를 입력하세요'; resultEl.className = 'pw-bmi-result'; return; }
    var bmi = w / Math.pow(h / 100, 2);
    var cat = bmi < 18.5 ? '저체중' : bmi < 23 ? '정상' : bmi < 25 ? '과체중' : '비만';
    var tone = bmi < 18.5 ? 'low' : bmi < 23 ? 'ok' : bmi < 25 ? 'warn' : 'high';
    valueEl.textContent = bmi.toFixed(1);
    catEl.textContent = cat;
    resultEl.className = 'pw-bmi-result ' + tone;
  }
  function openInsuranceAgeTool() {
    dialog('<div class="pw-tool-panel pw-insage-tool"><h2>보험연령 계산기</h2>'
      + '<label>생년월일<input id="pw-insage-birth" type="text" inputmode="numeric" maxlength="10" placeholder="YYYY-MM-DD" oninput="OSPersonalWorkspace.formatBirthInput(this,\'tool\')"></label>'
      + '<label>기준일<input id="pw-insage-date" type="date" value="' + ymd(new Date()) + '" onchange="OSPersonalWorkspace.calcToolInsuranceAge()"></label>'
      + '<div class="pw-insage-result"><strong id="pw-insage-value">-</strong><span>보험나이</span></div></div>');
  }
  function calcToolInsuranceAge() {
    var el = document.getElementById('pw-insage-value'); if (!el) return;
    var age = insuranceAge(value('pw-insage-birth'), value('pw-insage-date'));
    el.textContent = age === '' ? '-' : age + '세';
  }
  function openImageConvertTool() {
    dialog('<div class="pw-tool-panel pw-imgconv-tool"><h2>이미지 변환</h2><p class="pw-tool-desc">사진을 JPG 또는 PNG로 변환해서 저장합니다.</p>'
      + '<label class="pw-imgconv-drop"><input id="pw-imgconv-file" type="file" accept="image/*" onchange="OSPersonalWorkspace.imgConvertLoad(this)"><span>이미지 선택</span></label>'
      + '<div class="pw-imgconv-preview" id="pw-imgconv-preview" hidden><img id="pw-imgconv-img" alt="미리보기"><div class="pw-imgconv-options"><select id="pw-imgconv-format"><option value="image/jpeg">JPG</option><option value="image/png">PNG</option></select><button type="button" class="pw-btn primary" onclick="OSPersonalWorkspace.imgConvertDownload()">변환 · 다운로드</button></div></div></div>');
  }
  function imgConvertLoad(input) {
    var file = input.files && input.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var img = document.getElementById('pw-imgconv-img'), preview = document.getElementById('pw-imgconv-preview');
      if (!img || !preview) return;
      img.src = reader.result; img.dataset.name = file.name.replace(/\.[^.]+$/, ''); preview.hidden = false;
    };
    reader.readAsDataURL(file);
  }
  function imgConvertDownload() {
    var img = document.getElementById('pw-imgconv-img'), format = value('pw-imgconv-format');
    if (!img || !img.src) return;
    var canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    var ctx = canvas.getContext('2d');
    if (format === 'image/jpeg') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.drawImage(img, 0, 0);
    canvas.toBlob(function (blob) {
      if (!blob) return;
      var ext = format === 'image/jpeg' ? 'jpg' : 'png', url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = (img.dataset.name || 'image') + '.' + ext; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, format, 0.92);
  }
  function editEvent(id) { var event = state.data.events.find(function (entry) { return String(entry.id) === String(id); }); if (!event) return; closeDialog(); dialog(formShell('일정 수정', eventFormHtml(event), 'OSPersonalWorkspace.saveEvent()')); }
  function deleteEvent(id) {
    if (!id || !window.confirm('이 일정을 삭제할까요?')) return;
    softDelete('workspace_tasks?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()) + '&deleted_at=is.null').then(function () {
      state.data.events = state.data.events.filter(function (entry) { return String(entry.id) !== String(id); });
      closeDialog(); renderContent();
      if (typeof window.toast === 'function') window.toast('일정을 삭제했습니다.');
    }).catch(saveError);
  }
  function openDayCreate(date) { state.selectedDate = date; renderContent(); setUrl(false); addEvent(date); }
  function toggleEventComplete(id) {
    var event = state.data.events.find(function (entry) { return String(entry.id) === String(id); }); if (!event) return;
    var completedAt = event.completed_at ? null : new Date().toISOString();
    updateOne('workspace_tasks?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { completed_at: completedAt })
      .then(function (saved) { upsertTask(saved); rebuildWorkspaceDerived(); renderContent(); showEvent(id); if (typeof window.toast === 'function') window.toast(completedAt ? '완료 처리했습니다.' : '완료를 취소했습니다.'); }).catch(saveError);
  }
  function consultationStatusChanged(select, source) {
    if (!select) return;
    if (source === 'detail') { var careFields = document.getElementById('pwd-consult-care-fields'); if (careFields) careFields.hidden = select.value !== '청약완료'; }
    if (select.value !== '예약') return;
    var name = value(source === 'detail' ? 'pwd-consult-name' : 'pwf-consult-name'); openReservationPopup(name);
  }
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
  function saveCustomer() { var name = value('pwf-customer-name'), phone = phoneText(value('pwf-customer-phone')), note = richValue('pwf-customer-note'), contractDates = gatherContractDates('pwf-customer'), birth = value('pwf-customer-birth'), genderInput = document.querySelector('input[name="pwf-customer-gender"]:checked'), gender = genderInput ? genderInput.value : ''; if (!name || !contractDates.length) return; var profile = { customer_managed: true, contract_dates: contractDates, contract_date: contractDates[0], birth_date: birth || null, gender: gender || null, zip: value('pwf-customer-zip') || null, address: value('pwf-customer-address') || null, address_detail: value('pwf-customer-address-detail') || null, job: value('pwf-customer-job') || null, driving_status: value('pwf-customer-driving') || null, medication: value('pwf-customer-medication') || null, medical_history: value('pwf-customer-history') || null, diagnosis_date: value('pwf-customer-diagnosis') || null, current_condition: value('pwf-customer-current-status') || null, note: sanitizeRich(note) }; writeOne('workspace_customers', { owner_id: currentUserId(), name: name, phone: phone || null, status: value('pwf-customer-status') || '청약완료', profile: profile }).then(function (customer) { return saveCustomerRich(customer, profile, note); }).then(function (customer) { upsertCustomer(customer); resetRichPending(); return syncCareTasksForCustomer(customer); }).then(function () { finishSave('고객을 등록했습니다.'); }).catch(saveError); }
  function saveCustomerRich(customer, profile, body) { var root = customerAttachmentRoot(customer.id), hasPending = state.pendingRichImages.length || state.pendingRichFiles.length; if (!root && !hasPending) return Promise.resolve(customer); var rootId = root ? root.id : crypto.randomUUID(), rootBody = { id: rootId, owner_id: currentUserId(), item_type: 'memo', title: '고객 첨부 · ' + customer.id, body: sanitizeRich(body), visibility: 'private', legacy_payload: { workspace_category: 'customer', customer_id: customer.id, attachment_root: true } }; var ready = root ? Promise.resolve(root) : writeOne('workspace_items', rootBody).then(function (created) { upsertWorkspaceItem(created); return created; }); return ready.then(function () { return prepareRichUploads(rootId, body, 'customer'); }).then(function (prepared) { return updateOne('workspace_items?id=eq.' + encodeURIComponent(rootId) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { body: prepared.body }).then(function (savedItem) { upsertWorkspaceItem(savedItem); return saveRichChildren(prepared.rows); }).then(function () { var updatedProfile = Object.assign({}, profile, { note: prepared.body }); return updateOne('workspace_customers?id=eq.' + encodeURIComponent(customer.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { profile: updatedProfile }); }); }); }
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
  function saveConsultationRich(consultation, body) { var root = consultationAttachmentRoot(consultation.id), hasPending = state.pendingRichImages.length || state.pendingRichFiles.length; if (!root && !hasPending) return Promise.resolve(body); var rootId = root ? root.id : crypto.randomUUID(), rootBody = { id: rootId, owner_id: currentUserId(), item_type: 'memo', title: '상담 첨부 · ' + consultation.id, body: sanitizeRich(body), visibility: 'private', legacy_payload: { workspace_category: 'consultation', consultation_id: consultation.id, attachment_root: true } }; var ready = root ? Promise.resolve(root) : writeOne('workspace_items', rootBody).then(function (created) { upsertWorkspaceItem(created); return created; }); return ready.then(function () { return prepareRichUploads(rootId, body, 'consultation'); }).then(function (prepared) { return updateOne('workspace_items?id=eq.' + encodeURIComponent(rootId) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { body: prepared.body }).then(function (savedItem) { upsertWorkspaceItem(savedItem); return saveRichChildren(prepared.rows); }).then(function () { return prepared.body; }); }); }
  function selectConsultation(id) { resetRichPending(); state.selectedConsultation = id && String(state.selectedConsultation) !== String(id) ? id : null; renderContent(); }
  function selectCustomerDetail(id) { resetRichPending(); state.selectedCustomerDetail = id && String(state.selectedCustomerDetail) !== String(id) ? id : null; renderContent(); }
  function showRowHover(event) {
    var row = event.currentTarget, tip = document.getElementById('pw-row-hover'), text = row && row.getAttribute('data-hover-text');
    if (!tip || !text || document.querySelector('#v-personal-workspace .pw-consult-layout.has-detail')) return;
    tip.textContent = text;
    tip.style.display = 'block';
    var rect = row.getBoundingClientRect(), width = tip.offsetWidth;
    tip.style.left = Math.max(8, rect.right - width) + 'px';
    tip.style.top = (rect.bottom + 4) + 'px';
  }
  function hideRowHover() { var tip = document.getElementById('pw-row-hover'); if (tip) tip.style.display = 'none'; }
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
  function refreshCustomerDetailInsuranceAge() { var target = document.getElementById('pwd-customer-insurance-age'); if (!target) return; var age = insuranceAge(value('pwd-customer-birth'), ymd(new Date())); target.textContent = age === '' ? '-' : age + '세'; }
  function saveCustomerDetail(id) {
    var item = state.data.customers.find(function (entry) { return String(entry.id) === String(id); }); if (!item) return;
    var name = value('pwd-customer-name'), birth = value('pwd-customer-birth'), contractDates = gatherContractDates('pwd-customer'), phone = phoneText(value('pwd-customer-phone')), status = value('pwd-customer-status'), note = sanitizeRich(richValue('pwd-customer-new'));
    var genderInput = document.querySelector('input[name="pwd-customer-gender"]:checked'), gender = genderInput ? genderInput.value : '';
    if (!name || !contractDates.length) return;
    var existingProfile = customerProfile(item);
    var profile = Object.assign({}, existingProfile, {
      customer_managed: true, contract_dates: contractDates, contract_date: contractDates[0], birth_date: birth || null, gender: gender || null,
      zip: value('pwd-customer-zip') || null, address: value('pwd-customer-address') || null, address_detail: value('pwd-customer-address-detail') || null,
      job: value('pwd-customer-job') || null, driving_status: value('pwd-customer-driving') || null, medication: value('pwd-customer-medication') || null, medical_history: value('pwd-customer-history') || null,
      diagnosis_date: value('pwd-customer-diagnosis') || null, current_condition: value('pwd-customer-current-status') || null, note: note
    });
    updateOne('workspace_customers?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { name: name, phone: phone || null, status: status || '청약완료', profile: profile })
      .then(function (saved) { return saveCustomerRich(saved, profile, note); })
      .then(function (saved) { upsertCustomer(saved); resetRichPending(); return syncCareTasksForCustomer(saved); }).then(function () { finishSave('고객을 저장했습니다.'); }).catch(saveError);
  }
  function saveConsultationDetail(id) {
    var item = state.data.consultations.find(function (entry) { return String(entry.id) === String(id); }); if (!item) return;
    var customer = state.data.customers.find(function (entry) { return String(entry.id) === String(item.customer_id); }); if (!customer) return;
    var name = value('pwd-consult-name'), birth = value('pwd-consult-birth'), date = value('pwd-consult-date'), phone = phoneText(value('pwd-consult-phone')), status = value('pwd-consult-status');
    var genderInput = document.querySelector('input[name="pwd-consult-gender"]:checked'), gender = genderInput ? genderInput.value : '';
    if (!name || !date) return;
    var customValues = Object.assign({}, customerProfile(customer).custom_fields || {}); document.querySelectorAll('[data-consult-custom]').forEach(function (input) { customValues[input.getAttribute('data-consult-custom')] = String(input.value || '').trim(); });
    var profile = Object.assign({}, customerProfile(customer), {
      birth_date: birth || null, gender: gender || null, custom_fields: customValues,
      zip: value('pwd-consult-care-zip') || null, address: value('pwd-consult-care-address') || null, address_detail: value('pwd-consult-care-address-detail') || null,
      job: value('pwd-consult-care-job') || null, driving_status: value('pwd-consult-care-driving') || null, medication: value('pwd-consult-care-medication') || null, medical_history: value('pwd-consult-care-history') || null,
      diagnosis_date: value('pwd-consult-care-diagnosis') || null, current_condition: value('pwd-consult-care-current-status') || null
    });
    var content = sanitizeRich(richValue('pwd-consult-new'));
    updateOne('workspace_customers?id=eq.' + encodeURIComponent(customer.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { name: name, phone: phone || null, status: status || '예약', profile: profile })
      .then(function (savedCustomer) { upsertCustomer(savedCustomer); return updateOne('workspace_consultations?id=eq.' + encodeURIComponent(item.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { consulted_at: date + 'T00:00:00+09:00', channel: status || '예약', content: content }); })
      .then(function (saved) { return saveConsultationRich(saved, saved.content || content).then(function (resolvedContent) { if (resolvedContent === saved.content) return saved; return updateOne('workspace_consultations?id=eq.' + encodeURIComponent(saved.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { content: resolvedContent }); }); })
      .then(function (saved) { upsertConsultation(saved); resetRichPending(); finishSave('상담을 저장했습니다.'); }).catch(saveError);
  }
  function saveEvent() {
    var date = value('pwf-event-date'), title = value('pwf-event-title'), id = value('pwf-event-id'); if (!date || !title) return;
    var endDate = value('pwf-event-end-date') || date; if (endDate < date) endDate = date;
    var endTime = value('pwf-event-end-time');
    var body = { task_date: date, task_time: value('pwf-event-time') || null, end_date: endDate, end_time: endTime || null, title: title, description: value('pwf-event-desc') || null };
    var promise = id ? updateOne('workspace_tasks?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), body) : writeOne('workspace_tasks', Object.assign({}, body, { owner_id: currentUserId() }));
    promise.then(function (saved) { upsertTask(saved); state.selectedDate = date; state.cursor = parseDate(date); finishSave(id ? '일정을 수정했습니다.' : '일정을 추가했습니다.'); }).catch(saveError);
  }
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
    showAsset: showAsset, openFilePreview: openFilePreview, openAssetPreview: openAssetPreview, openUrlPreview: openPreviewUrl, closePreview: closePreview, previewZoom: previewZoom, previewRotate: previewRotate, previewPage: previewPage, toggleDdakMenu: toggleDdakMenu, closeDdakMenu: closeDdakMenu, previewCopy: previewCopy, previewEditAsset: previewEditAsset, previewDeleteAsset: previewDeleteAsset, editAsset: editAsset, saveAssetEdit: saveAssetEdit, deleteAsset: deleteAsset, richCommand: richCommand, richColorCommand: richColorCommand, focusRich: focusRich, focusRichBody: focusRichBody, prepareRichFocus: prepareRichFocus, addRichImages: addRichImages, addRichFiles: addRichFiles, removeRichFile: removeRichFile, showCustomer: showCustomer, showEvent: showEvent, toggleFavorite: toggleFavorite, openFavorite: openFavorite, favoriteDragStart: favoriteDragStart, favoriteDragOver: favoriteDragOver, favoriteDragLeave: favoriteDragLeave, favoriteDrop: favoriteDrop, favoriteDragEnd: favoriteDragEnd,
    closeDialog: closeDialog, addAsset: function () { closeAssetMenu(); addAsset(); }, saveAsset: saveAsset, openVault: openVault, newFolder: newFolder, uploadFiles: uploadFiles, newAssetFolder: newAssetFolder, saveAssetFolder: saveAssetFolder, deleteAssetFolder: deleteAssetFolder, uploadAssetFiles: uploadAssetFiles, confirmAssetFileUpload: confirmAssetFileUpload,
    assetDragStart: assetDragStart, assetDragEnd: assetDragEnd, assetDragOver: assetDragOver, assetDragLeave: assetDragLeave, assetDrop: assetDrop,
    addCustomer: addCustomer, saveCustomer: saveCustomer, runCustomerOcr: runCustomerOcr, searchCustomerAddress: searchCustomerAddress, addContractDateRow: addContractDateRow, removeContractDateRow: removeContractDateRow, clearNameSearch: clearNameSearch, filterCustomerStatus: function (status) { state.customerStatusFilter = status || 'all'; state.selectedCustomerDetail = null; state.customersRenderLimit = LIST_PAGE_SIZE; renderContent(); }, selectCustomerDetail: selectCustomerDetail, saveCustomerDetail: saveCustomerDetail, showRowHover: showRowHover, hideRowHover: hideRowHover, refreshCustomerDetailInsuranceAge: refreshCustomerDetailInsuranceAge, refreshCustomerInsuranceAge: refreshCustomerInsuranceAge, addConsultation: addConsultation, editConsultation: editConsultation, saveConsultation: saveConsultation, selectConsultation: selectConsultation, filterConsultationStatus: function (status) { state.consultationStatusFilter = status || 'all'; state.selectedConsultation = null; state.consultationsRenderLimit = LIST_PAGE_SIZE; renderContent(); }, manageConsultColumns: manageConsultColumns, addConsultColumn: addConsultColumn, moveConsultColumn: moveConsultColumn, deleteConsultColumn: deleteConsultColumn, saveConsultationDetail: saveConsultationDetail, trashCustomer: trashCustomer, restoreCustomer: restoreCustomer, refreshInsuranceAge: refreshInsuranceAge, refreshDetailInsuranceAge: refreshDetailInsuranceAge, formatBirthInput: formatBirthInput, formatConsultPhone: formatConsultPhone, consultationStatusChanged: consultationStatusChanged, closeReservationPopup: closeReservationPopup, saveReservationEvent: saveReservationEvent, addEvent: addEvent, editEvent: editEvent, deleteEvent: deleteEvent, saveEvent: saveEvent, toggleEventTime: toggleEventTime, toggleEventComplete: toggleEventComplete, openCustomerFromEvent: openCustomerFromEvent, openDayCreate: openDayCreate, richPaste: richPaste,
    openTool: openTool, calcPress: calcPress, calcBmi: calcBmi, calcToolInsuranceAge: calcToolInsuranceAge, imgConvertLoad: imgConvertLoad, imgConvertDownload: imgConvertDownload, filterQuickLinks: filterQuickLinks,
    filterScriptsStage: filterScriptsStage, toggleScriptCard: toggleScriptCard, toggleScriptSection: toggleScriptSection,
    filterNewsPool: filterNewsPool, setNewsScope: setNewsScope, selectNewsCompany: selectNewsCompany, toggleNewsMonth: toggleNewsMonth, openNewsletter: openNewsletter,
    setCalendarMode: function (mode) { state.calendarMode = mode; renderContent(); setUrl(false); },
    moveCalendar: moveCalendar, calendarToday: function () { state.selectedDate = ymd(new Date()); state.cursor = new Date(); renderContent(); setUrl(false); }, selectDate: selectDate,
    __testLoad: function (data) { if (!isLocal()) return; state.data = data; state.status = 'ready'; state.loadedFor = 'local-test'; renderShell(); }
  };
})();
