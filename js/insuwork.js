(function () {
  'use strict';

  // 2026-08-23 대표 승인 — 고정 17인 파일럿 허용목록 게이트 종료, 인증된 전체 사용자에게 오픈.
  // 대신 첫 로그인 시 기존 자료 이관 여부를 1회 물어보는 팝업(migrate-choice)이 붙는다 — 아래
  // proceedPastMigrationGate/renderMigrationChoiceGate 참고. 오늘 이미 이관된 17인은
  // insuwork_migration_choices에 accepted row가 백필되어 있어 팝업을 다시 보지 않는다.
  var TEST_EMAIL = 'bylts0428+codex-insuwork-20260815@gmail.com';
  var CONSULT_BASE_COLUMNS = [{ key: 'date', label: '등록일자', width: 86 }, { key: 'name', label: '이름', width: 88 }, { key: 'birth', label: '생년월일', width: 92 }, { key: 'genderAge', label: '성별(보험나이)', width: 104 }, { key: 'phone', label: '전화번호', width: 116 }, { key: 'summary', label: '상담내용', width: 360, flex: true }, { key: 'status', label: '상담상태', width: 102 }];
  var CONSULT_STAGES = [{ key: '예약', color: '#5f6368' }, { key: '진행중', color: '#1a73e8' }, { key: '제안서발송', color: '#8430ce' }, { key: '클로징', color: '#e8710a' }, { key: '청약완료', color: '#1e8e3e' }, { key: '보류', color: '#f9ab00' }, { key: '종결', color: '#80868b' }];
  var CUSTOMER_STAGES = [{ key: '청약완료', color: '#1e8e3e' }, { key: '철회', color: '#d93025' }, { key: '실효', color: '#5f6368' }, { key: '부활', color: '#1a73e8' }];
  var CUSTOMER_REVIEW_STAGE = { key: '상태 확인 필요', color: '#e8710a' };
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
  var STANDALONE = document.documentElement.getAttribute('data-insuwork') === 'true';
  /* 2026-08-25 대표 제보 — 클릭 없이 /insuwork로 들어와도 주소창이 즉시 ?view=insuwork&section=home으로
     바뀌는 문제 수정. 스크립트 로드 시점(=아직 아무 코드도 URL을 건드리기 전)의 원본 쿼리스트링을
     한 번만 기록해 둔다 — 최초 렌더(appstate:ready/boot())에서 "원래 쿼리가 없던 홈 진입"인지
     판단하는 데만 쓰고, 그 외 모든 경로(go(), popstate, 딥링크 새로고침)는 그대로 둔다. */
  var INITIAL_URL_HAD_VIEW_PARAMS = (function () {
    try { var p = new URLSearchParams(location.search); return p.has('view') || p.has('section'); }
    catch (_) { return !!location.search; }
  })();
  var SECTIONS = ['ledger', 'home', 'assets', 'customers', 'consultations', 'calendar', 'carriers', 'payments', 'scripts', 'newsletters', 'product-lineups', 'sales-strategy', 'insurance-age', 'tools', 'trash', 'archive', 'briefing', 'daily-briefing', 'public-library', 'notice-updates', 'user-guide', 'feedback', 'admin-users'];
  /* 2026-08-30 대표 확정 — 보험워크는 원세컨드와 별도 사이트다. 비로그인 첫 진입은 내부 업무 셸
     일부를 잠가 보여주는 방식이 아니라 보험워크 CI 기반 공개 랜딩만 렌더링한다. 로그인 후에는 기존
     업무 홈과 메뉴를 그대로 유지한다. */
  var PROTECTED_SECTIONS = ['calendar', 'customers', 'consultations', 'assets', 'public-library'];
  var LIST_PAGE_SIZE = 200;
  var state = {
    section: 'home', assetFilter: 'all', assetView: localStorage.getItem('ws_asset_view') || 'list', assetFolder: null, consultationStatusFilter: 'all', customerStatusFilter: 'all', query: '', composing: false, searchTimer: 0,
    consultNameQuery: '', consultNameComposing: false, consultNameTimer: 0, customerNameQuery: '', customerNameComposing: false, customerNameTimer: 0,
    calendarMode: 'month', selectedDate: ymd(new Date()), homeDate: ymd(new Date()), homeRequestId: 0, coreLoaded: false, careSyncKey: '', careSyncPromise: null, selectedConsultation: null, selectedCustomerDetail: null, cursor: new Date(),
    scriptsData: null, scriptsLoading: false, scriptsStage: 'opening', scriptsOpenId: null,
    newsData: null, newsLoading: false, newsPool: 'all', newsScope: 'all', newsCoSel: null, newsOpenMonths: {},
    newsCoNameQuery: '', newsCoNameComposing: false, newsCoNameTimer: 0,
    strategyData: null, strategyLoading: false, strategyPool: 'all', strategyScope: 'all', strategyCoSel: null, strategyOpenMonths: {},
    strategyCoNameQuery: '', strategyCoNameComposing: false, strategyCoNameTimer: 0, toolMode: 'calculator', toolFile: null, toolResult: null, toolPages: null,
    assetsRenderLimit: LIST_PAGE_SIZE, customersRenderLimit: LIST_PAGE_SIZE, consultationsRenderLimit: LIST_PAGE_SIZE, signedUrlCache: {}, insageRefreshTimer: 0,
    status: 'idle', error: '', loadedFor: '', requestId: 0, loadPromise: null, loadFull: false, fullLoaded: false, favorites: [], pendingRichFiles: [], pendingRichImages: [], carrierType: 'nonlife', carriersLoaded: false, carriersLoading: false, paymentType: 'nonlife', paymentData: null, paymentLoading: false, paymentError: '',
    migrationDecided: false, migrationCheck: null, draftTimer: 0, // 이번 페이지 로드에서 insuwork_migration_choices 확인/이관선택 완료 여부(중복 확인 방지)
    adminUsers: null, adminUsersLoading: false, adminUsersError: '', adminUserQuery: '', adminUserStatus: 'all', adminUserComposing: false, adminUserTimer: 0,
    publicLibraryData: null, publicLibraryLoading: false, publicLibNameQuery: '', publicLibNameComposing: false, publicLibNameTimer: 0, publicLibView: 'list',
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
    return String((window.AppState && (window.AppState.email || (window.AppState.user && window.AppState.user.email))) || storedUser().email || '').toLowerCase();
  }
  function canSeeAdminUsers() { return isLocal() || currentUserEmail() === 'bylts@naver.com'; }
  function consultColumnStorageKey() { return 'ws_consult_columns_' + (currentUserId() || currentUserEmail() || 'local'); }
  function favoriteStorageKey() { return 'ws_favorites_' + (currentUserId() || currentUserEmail() || 'local'); }
  function workDraftKey(kind, target) { return 'iw_work_draft_' + (currentUserId() || currentUserEmail() || 'local') + '_' + kind + '_' + (target || 'new'); }
  function readWorkDraft(key) { try { return JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (_) { return null; } }
  function clearWorkDraft(key) { if (!key) return; try { sessionStorage.removeItem(key); } catch (_) {} }
  function collectWorkDraft(root) {
    var draft = { fields: {}, radios: {}, checks: {}, rich: {}, contracts: {}, custom: {}, savedAt: new Date().toISOString() };
    root.querySelectorAll('input[id]:not([type="file"]),select[id],textarea[id]').forEach(function (field) { if (field.type !== 'radio' && field.type !== 'checkbox') draft.fields[field.id] = field.value; });
    root.querySelectorAll('input[type="radio"][name]:checked').forEach(function (field) { draft.radios[field.name] = field.value; });
    root.querySelectorAll('.iw-driving-panel[id]').forEach(function (panel) { draft.checks[panel.id] = Array.prototype.slice.call(panel.querySelectorAll('input[type="checkbox"]:checked')).map(function (field) { return field.value; }); });
    root.querySelectorAll('.iw-rich-body[id]').forEach(function (editor) { draft.rich[editor.id] = sanitizeRich(editor.innerHTML); });
    root.querySelectorAll('.iw-contract-dates-list[id]').forEach(function (list) { draft.contracts[list.id] = Array.prototype.slice.call(list.querySelectorAll('.iw-contract-date-input')).map(function (input) { return input.value; }); });
    root.querySelectorAll('[data-consult-custom]').forEach(function (field) { draft.custom[field.getAttribute('data-consult-custom')] = field.value; });
    return draft;
  }
  function restoreWorkDraft(root, draft) {
    if (!draft) return false;
    Object.keys(draft.contracts || {}).forEach(function (id) { var list = document.getElementById(id); if (!list) return; list.innerHTML = (draft.contracts[id] || []).map(function (date) { return contractDateRowHtml(date, list.getAttribute('data-age-context')); }).join('') || contractDateRowHtml('', list.getAttribute('data-age-context')); });
    Object.keys(draft.fields || {}).forEach(function (id) { var field = document.getElementById(id); if (field) field.value = draft.fields[id]; });
    Object.keys(draft.radios || {}).forEach(function (name) { root.querySelectorAll('input[type="radio"][name="' + name + '"]').forEach(function (field) { field.checked = field.value === draft.radios[name]; }); });
    Object.keys(draft.checks || {}).forEach(function (id) { var panel = document.getElementById(id); if (!panel) return; var selected = draft.checks[id] || []; panel.querySelectorAll('input[type="checkbox"]').forEach(function (field) { field.checked = selected.indexOf(field.value) >= 0; }); var first = panel.querySelector('input[type="checkbox"]'); if (first) drivingCheckChanged(first); });
    Object.keys(draft.rich || {}).forEach(function (id) { var editor = document.getElementById(id); if (editor) editor.innerHTML = sanitizeRich(draft.rich[id]); });
    Object.keys(draft.custom || {}).forEach(function (key) { root.querySelectorAll('[data-consult-custom]').forEach(function (field) { if (field.getAttribute('data-consult-custom') === key) field.value = draft.custom[key]; }); });
    return true;
  }
  function updateDraftStatus(root, restored) { var status = root && root.querySelector('[data-work-draft-status]'); if (!status) return; status.textContent = restored ? '임시 저장된 내용을 불러왔습니다.' : '임시 저장됨'; status.classList.toggle('is-restored', !!restored); }
  function saveBoundWorkDraft(root) { if (!root || !root.dataset.workDraftKey) return; try { sessionStorage.setItem(root.dataset.workDraftKey, JSON.stringify(collectWorkDraft(root))); updateDraftStatus(root, false); } catch (_) {} }
  function scheduleWorkDraft(root) { if (!root) return; window.clearTimeout(state.draftTimer); state.draftTimer = window.setTimeout(function () { saveBoundWorkDraft(root); }, 250); }
  function bindWorkDraft(root, key) { if (!root || !key) return; root.dataset.workDraftKey = key; if (!root.querySelector('[data-work-draft-status]')) { var marker = document.createElement('p'), actions = root.querySelector('.iw-consult-save,.iw-form-actions'); marker.className = 'iw-draft-status'; marker.setAttribute('data-work-draft-status', ''); marker.setAttribute('aria-live', 'polite'); marker.textContent = '작성 내용은 이 브라우저를 닫기 전까지 자동으로 임시 저장됩니다.'; if (actions) root.insertBefore(marker, actions); else root.appendChild(marker); } var restored = restoreWorkDraft(root, readWorkDraft(key)); root.addEventListener('input', function () { root.dataset.workDraftDirty = '1'; scheduleWorkDraft(root); }); root.addEventListener('change', function () { root.dataset.workDraftDirty = '1'; scheduleWorkDraft(root); }); if (restored) updateDraftStatus(root, true); }
  function consultColumns() { try { var saved = JSON.parse(localStorage.getItem(consultColumnStorageKey()) || '[]'); if (Array.isArray(saved) && saved.length) return saved; } catch (_) {} return CONSULT_BASE_COLUMNS.slice(); }
  function isConsultColumnSetting(item) { var payload = item && item.legacy_payload || {}; return item && item.item_type === 'memo' && payload.setting_key === 'consultation_columns'; }
  function isFavoriteSetting(item) { var payload = item && item.legacy_payload || {}; return item && item.item_type === 'memo' && payload.setting_key === 'favorites'; }
  function isWorkspaceSetting(item) { var payload = item && item.legacy_payload || {}; return item && item.item_type === 'memo' && payload.workspace_category === 'settings'; }
  function isConsultAttachmentItem(item) { var payload = item && item.legacy_payload || {}; return payload.workspace_category === 'consultation'; }
  /* 2026-08-25 대표 확정 — 고객 상세카드 "고객내용" 메모·첨부(saveCustomerRich, workspace_category:'customer')가
     상담 첨부(isConsultAttachmentItem)처럼 자료실 목록에서 걸러지지 않고 그대로 노출되던 버그 수정. */
  function isCustomerAttachmentItem(item) { var payload = item && item.legacy_payload || {}; return payload.workspace_category === 'customer'; }
  function saveConsultColumns(columns) { var serialized = JSON.stringify(columns); localStorage.setItem(consultColumnStorageKey(), serialized); if (!authenticated()) return; var existing = state.data.items.find(isConsultColumnSetting), body = { owner_id: currentUserId(), item_type: 'memo', title: 'consultation_columns', body: serialized, visibility: 'private', legacy_payload: { workspace_category: 'settings', setting_key: 'consultation_columns' } }; var request = existing ? updateOne('insuwork_items?id=eq.' + encodeURIComponent(existing.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), body) : writeOne('insuwork_items', body); request.then(function (saved) { if (!existing && saved) state.data.items.push(saved); }).catch(function (error) { console.warn('Consultation column preference save failed', error); if (typeof window.toast === 'function') window.toast('컬럼 설정은 이 브라우저에 저장했습니다. 서버 동기화는 잠시 후 다시 시도해 주세요.'); }); }
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
    var request = existing ? updateOne('insuwork_items?id=eq.' + encodeURIComponent(existing.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), body) : writeOne('insuwork_items', body);
    request.then(function (saved) { if (!existing && saved) state.data.items.push(saved); }).catch(function (error) { console.warn('Favorite save failed', error); if (typeof window.toast === 'function') window.toast('즐겨찾기는 이 브라우저에 저장했습니다. 서버 동기화는 잠시 후 다시 시도해 주세요.'); });
  }
  function consultGridTemplate(columns) { return columns.map(function (column) { return column.flex ? 'minmax(150px,1fr)' : 'minmax(0,' + Math.max(64, Number(column.width) || 96) + 'px)'; }).join(' '); }
  function consultCustomValue(profile, key) { return String((profile.custom_fields && profile.custom_fields[key]) || ''); }
  function consultCell(column, item, customer, profile, date, age, status) { var values = { date: date, name: customer.name || '(이름 없음)', birth: profile.birth_date || '', genderAge: (profile.gender || '-') + (age === '' ? '' : ' (' + age + '세)'), phone: phoneText(customer.phone || customer.phone_raw || ''), summary: stripHtml(item.memo || ''), status: status }; var value = Object.prototype.hasOwnProperty.call(values, column.key) ? values[column.key] : consultCustomValue(profile, column.key); if (column.key === 'name') return '<strong>' + esc(value) + '</strong>'; return '<span class="iw-consult-cell iw-consult-' + esc(column.key) + '">' + esc(value) + '</span>'; }
  function personalItemScope() {
    // insuwork_items.owner_id is the canonical account boundary (already applied
    // by the caller's owner_id=eq.<계정> filter). On top of that, every legacy
    // source (library/scripts/myspace_folders/myspace_files) must also be
    // personal-scope — team/branch/global bulk server material (including
    // admin-registered library/scripts entries) stays outside the workspace.
    // Missing scope (legacy rows with no scope value) counts as personal too,
    // matching the migration's own coalesce(scope,'personal') convention.
    return "&or=(legacy_source.is.null,and(legacy_source.in.(library,scripts,myspace_folders,myspace_files,scripts_attachment),or(legacy_payload->>scope.is.null,legacy_payload->>scope.eq.personal)))";
  }
  function isLocal() { return location.hostname === '127.0.0.1' || location.hostname === 'localhost'; }
  function localPreviewAllowed() { return isLocal() && new URLSearchParams(location.search).get('pwtest') === '1'; }
  function allowed() { return localPreviewAllowed() || (authenticated() && !!currentUserId()) || currentUserEmail() === TEST_EMAIL; }
  function authenticated() { return !!(window.db && window.db.fetch && window.db.getToken && window.db.getToken() && currentUserId()); }
  function openBriefingAuth(mode, redirect) {
    var target = redirect || (location.pathname + location.search);
    if (window.InsuranceBriefingAuth && typeof window.InsuranceBriefingAuth.open === 'function') {
      window.InsuranceBriefingAuth.open(mode, { redirect: target });
      return;
    }
    window.location.href = '/pages/landing.html?auth=' + encodeURIComponent(mode) + '&redirect=' + encodeURIComponent(target);
  }
  function canEnterSection(section) { if (section === 'ledger') return !!(window._canSeeInsuworkLedger && window._canSeeInsuworkLedger()); if (section === 'admin-users') return localPreviewAllowed() || (authenticated() && canSeeAdminUsers()); return PROTECTED_SECTIONS.indexOf(section) < 0 || allowed(); }
  /* 비로그인 상태에서 보호 메뉴(캘린더/고객관리/상담관리/자료) 클릭 시 호출 — 기존 보험브리핑
     로그인 모달(insubriefing/auth.js의 InsuranceBriefingAuth.open, 작업 C에서 이식한 것과 동일 흐름)을
     그대로 재사용해 로그인 유도. 현재 경로+쿼리를 redirect로 넘겨 로그인 후 원래 메뉴로 복귀시킨다. */
  function promptLoginRequired() {
    var message = '로그인이 필요한 메뉴입니다. 로그인 후 이용해 주세요.';
    var redirect = location.pathname + location.search;
    function startLogin() { openBriefingAuth('login', redirect); }
    if (window.InsuranceBriefingNotice && typeof window.InsuranceBriefingNotice.confirm === 'function') {
      window.InsuranceBriefingNotice.confirm({ title: '보험워크', message: message, confirmLabel: '로그인' }).then(function (confirmed) { if (confirmed) startLogin(); });
      return;
    }
    if (typeof window.toast === 'function') window.toast(message);
    startLogin();
  }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]; }); }
  function briefingAlert(message, title) {
    if (window.InsuranceBriefingNotice && typeof window.InsuranceBriefingNotice.alert === 'function') return window.InsuranceBriefingNotice.alert(message, { title: title || '보험워크' });
    if (typeof window.toast === 'function') { window.toast(message); return Promise.resolve(); }
    return Promise.resolve();
  }
  function briefingConfirm(message, title, confirmLabel, dangerous) {
    if (window.InsuranceBriefingNotice && typeof window.InsuranceBriefingNotice.confirm === 'function') return window.InsuranceBriefingNotice.confirm({ title: title || '보험워크', message: message, confirmLabel: confirmLabel || '확인', dangerous: !!dangerous });
    return Promise.resolve(false);
  }
  function briefingPrompt(message, title, defaultValue) {
    if (window.InsuranceBriefingNotice && typeof window.InsuranceBriefingNotice.prompt === 'function') return window.InsuranceBriefingNotice.prompt({ title: title || '보험워크', message: message, defaultValue: defaultValue || '' });
    return Promise.resolve('');
  }
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
  function isManagedCustomer(customer) { var profile = customerProfile(customer); return !!customer && (profile.customer_managed === true || isRealCustomerStage(customer.status) || customer.legacy_source === 'sales_customers'); }
  function customerNeedsStatusReview(customer) { return !!customer && !isRealCustomerStage(customer.status); }
  function customerDisplayStatus(customer) { return customerNeedsStatusReview(customer) ? CUSTOMER_REVIEW_STAGE.key : customer.status; }
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
  // migrate_my_legacy_data/decline_legacy_migration RPC 호출용 — write()/update()와 동일한 스타일
  // (window.db.fetch가 apikey/Authorization을 자동 주입, 실패 시 응답 본문을 에러 메시지로 사용).
  function rpc(name) {
    return window.db.fetch('/rest/v1/rpc/' + name, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(function (response) {
      if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); });
      return response.text().then(function (text) { try { return text ? JSON.parse(text) : null; } catch (_) { return null; } });
    });
  }
  function rebuildWorkspaceDerived() {
    var columnSetting = state.data.items.find(isConsultColumnSetting); if (columnSetting && columnSetting.body) localStorage.setItem(consultColumnStorageKey(), columnSetting.body);
    applyFavoriteSetting(state.data.items);
    state.data.scripts = state.data.items.filter(function (item) { return item.item_type === 'note' && !isConsultAttachmentItem(item); }).map(function (item) { return Object.assign({}, item, { script_text: item.body }); });
    state.data.library = state.data.items.filter(function (item) { return item.item_type !== 'note' && !isWorkspaceSetting(item) && !isConsultAttachmentItem(item) && !isCustomerAttachmentItem(item); }).map(function (item) { return Object.assign({}, item, { memo_text: item.item_type === 'memo' ? item.body : null, description: item.body, link_url: item.url, file_url: item.item_type === 'file' ? item.storage_path : null }); });
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
    document.body.classList.add('is-insuwork');
    if (STANDALONE) return !!document.getElementById('v-insuwork');
    var side = document.querySelector('.side');
    if (side && !document.getElementById('nav-insuwork')) {
      var nav = document.createElement('div');
      nav.className = 'nav'; nav.id = 'nav-insuwork';
      nav.innerHTML = '<span class="ic">▣</span><span class="lbl">내 업무</span>';
      nav.onclick = function () { openWorkspace('home'); };
      var home = document.getElementById('nav-home');
      side.insertBefore(nav, home ? home.nextSibling : side.firstChild);
    }
    var body = document.querySelector('.body');
    if (body && !document.getElementById('v-insuwork')) {
      var view = document.createElement('div');
      view.className = 'wrap view'; view.id = 'v-insuwork';
      body.appendChild(view);
    }
    return true;
  }

  function renderStandaloneGate(mode, next) {
    var view = document.getElementById('v-insuwork');
    if (!view) return;
    document.body.classList.remove('is-insuwork');
    if (mode === 'denied') {
      view.innerHTML = '<div class="iw-access"><strong>보험워크 준비 중</strong><p>이 계정은 아직 이용 대상이 아닙니다.</p><a class="iw-btn" href="/insuwork/insubriefing/">보험브리핑으로 돌아가기</a></div>';
      return;
    }
    if (mode === 'migrate-choice') {
      renderMigrationChoiceGate(view, next);
      return;
    }
    view.innerHTML = '<div class="iw-access"><strong>보험워크 로그인</strong><p>기존 원세컨드 계정은 같은 이메일로 로그인할 수 있고, 신규 가입은 이름·전화번호·이메일 인증만 확인합니다.</p><div class="iw-access-actions"><button class="iw-btn primary" type="button" data-ib-login>로그인</button><button class="iw-btn" type="button" data-ib-signup>회원가입</button></div><a class="iw-btn" href="/insuwork/insubriefing/">보험브리핑으로 돌아가기</a></div>';
    var loginBtn = view.querySelector('[data-ib-login]');
    var signupBtn = view.querySelector('[data-ib-signup]');
    function openBriefingAuth(mode) {
      if (window.InsuranceBriefingAuth && typeof window.InsuranceBriefingAuth.open === 'function') {
        window.InsuranceBriefingAuth.open(mode, { redirect: '/insuwork/' });
        return;
      }
      window.location.href = '/pages/landing.html?auth=' + encodeURIComponent(mode) + '&redirect=%2Finsuwork%2F';
    }
    if (loginBtn) loginBtn.addEventListener('click', function () { openBriefingAuth('login'); });
    if (signupBtn) signupBtn.addEventListener('click', function () { openBriefingAuth('signup'); });
  }

  /* 2026-08-23 대표 승인 — 고정 허용목록 게이트를 폐지하고 게이트를 오픈하며 함께 도입한 1회성 이관 동의 팝업.
     allowed()를 통과한(=인증된) 사용자가 실제 워크스페이스를 보기 직전, STANDALONE(데스크톱 셸)에서만
     insuwork_migration_choices에 본인 결정 row가 있는지 확인한다. 이미 결정했으면(오늘 백필된 17인 포함)
     바로 next()(=openWorkspace 계속 진행)로 넘어가고, 없으면 renderStandaloneGate('migrate-choice')로
     선택을 받는다. DB 쪽 테이블/RPC(별도 PR)가 아직 없어 조회 자체가 실패하는 경우는 fail-open —
     인증된 사용자를 워크스페이스 밖에 계속 세워두지 않고 next()로 진행한다(콘솔 경고만 남김). */
  function proceedPastMigrationGate(next) {
    if (!STANDALONE) { next(); return; }
    if (state.migrationDecided) { next(); return; }
    var id = currentUserId();
    if (!id) { next(); return; }
    if (!state.migrationCheck) state.migrationCheck = api('insuwork_migration_choices?user_id=eq.' + encodeURIComponent(id) + '&select=choice&limit=1').finally(function () { state.migrationCheck = null; });
    state.migrationCheck.then(function (rows) {
      if (Array.isArray(rows) && rows.length) { state.migrationDecided = true; next(); return; }
      renderStandaloneGate('migrate-choice', next);
    }).catch(function (error) {
      console.warn('Migration choice check failed (계속 진행)', error);
      next();
    });
  }
  function renderMigrationChoiceGate(view, next) {
    view.innerHTML = '<div class="iw-access"><strong>기존 자료를 가져올까요?</strong><p>원세컨드에 저장하신 기존 자료·고객·상담·일정을 보험워크로 가져올까요?</p><div class="iw-access-actions"><button class="iw-btn primary" type="button" data-iw-migrate-accept>가져오기</button><button class="iw-btn" type="button" data-iw-migrate-decline>새로 시작하기</button></div><p class="iw-migrate-status" id="iw-migrate-status" hidden></p></div>';
    var acceptBtn = view.querySelector('[data-iw-migrate-accept]');
    var declineBtn = view.querySelector('[data-iw-migrate-decline]');
    var statusEl = view.querySelector('#iw-migrate-status');
    function setStatus(message, isError) {
      if (!statusEl) return;
      statusEl.hidden = !message;
      statusEl.textContent = message || '';
      statusEl.style.color = isError ? 'var(--err)' : '';
    }
    function setBusy(busy) {
      if (acceptBtn) acceptBtn.disabled = busy;
      if (declineBtn) declineBtn.disabled = busy;
    }
    function runChoice(rpcName, busyMessage, failMessage) {
      setBusy(true);
      setStatus(busyMessage, false);
      rpc(rpcName).then(function () {
        state.migrationDecided = true;
        next();
      }).catch(function (error) {
        setBusy(false);
        setStatus(failMessage + (error && error.message ? ' (' + error.message + ')' : '') + ' 다시 시도해 주세요.', true);
      });
    }
    if (acceptBtn) acceptBtn.addEventListener('click', function () { runChoice('migrate_my_legacy_data', '가져오는 중입니다. 자료가 많으면 몇 초 정도 걸릴 수 있습니다.', '가져오기에 실패했습니다.'); });
    if (declineBtn) declineBtn.addEventListener('click', function () { runChoice('decline_legacy_migration', '설정을 저장하는 중입니다.', '저장하지 못했습니다.'); });
  }

  function needsFullItems() {
    return !!state.query.trim() || ['assets', 'customers', 'consultations', 'trash'].indexOf(state.section) >= 0 || /\/m\/(library|search|customers|consultations)\.html$/.test(location.pathname);
  }
  function dataReadyForSection() { return state.coreLoaded && (!needsFullItems() || state.fullLoaded); }
  function loadHomeDate() {
    if (!authenticated()) return Promise.resolve(false);
    var date = state.homeDate, userId = currentUserId(), requestId = ++state.homeRequestId;
    state.homeLoadingDate = date; state.homeErrorDate = '';
    if (state.section === 'home') renderContent();
    // 초기/전체 조회와 경쟁하지 않는다. 완료 후 최신 선택 날짜만 갱신한다.
    var pending = state.loadPromise || Promise.resolve();
    return pending.then(function () {
      if (requestId !== state.homeRequestId || userId !== currentUserId()) return false;
      return api('insuwork_tasks?owner_id=eq.' + encodeURIComponent(userId) + '&deleted_at=is.null&or=(and(task_date.lte.' + date + ',end_date.gte.' + date + '),and(task_date.eq.' + date + ',end_date.is.null))&order=task_time.asc&limit=2000&select=id,owner_id,customer_id,title,description,task_date,task_time,end_date,end_time,completed_at,legacy_source,legacy_id,created_at,deleted_at').then(function (rows) {
        if (requestId !== state.homeRequestId || userId !== currentUserId()) return false;
        var ids = {}; rows.forEach(function (row) { ids[row.id] = true; });
        state.data.events = state.data.events.filter(function (event) {
          var start = String(event.task_date || event.event_date || '').slice(0, 10), end = String(event.end_date || event.event_end_date || start).slice(0, 10);
          return !ids[event.id] && !(start <= date && end >= date);
        }).concat(rows);
        rebuildWorkspaceDerived();
        state.homeLoadingDate = '';
        if (state.section === 'home') renderContent();
        return true;
      });
    }).catch(function () {
      if (requestId === state.homeRequestId && userId === currentUserId()) {
        state.homeLoadingDate = ''; state.homeErrorDate = date;
        if (state.section === 'home') renderContent();
      }
      return false;
    });
  }
  function loadData(force, homeRefresh, allItems) {
    if (homeRefresh) return loadHomeDate();
    var userId = currentUserId();
    if (!authenticated()) {
      state.status = 'waiting-auth'; state.loadedFor = ''; renderContent();
      return Promise.resolve(false);
    }
    var full = !!force;
    var includeItems = full && (allItems || needsFullItems());
    if (state.loadPromise) {
      return state.loadPromise.then(function (ok) {
        if (full && (!state.coreLoaded || (includeItems && !state.fullLoaded))) return loadData(force, false, allItems);
        return ok;
      });
    }
    if (!homeRefresh && !force && state.fullLoaded && state.loadedFor === userId) return Promise.resolve(true);
    if (!homeRefresh && !force && state.status === 'ready' && state.loadedFor === userId) return Promise.resolve(true);
    var hasVisibleData = !!(state.data.items.length || state.data.events.length || state.data.customers.length || state.data.consultations.length);
    state.status = hasVisibleData ? 'refreshing' : 'loading'; state.error = ''; renderContent();
    var requestId = ++state.requestId;
    var id = encodeURIComponent(userId);
    var itemScope = personalItemScope();
    state.loadFull = full;
    var today = state.homeDate;
    var itemSelect = 'id,owner_id,parent_id,item_type,title,body,url,storage_path,mime_type,extension,file_size,visibility,legacy_payload,created_at,updated_at,deleted_at';
    var requests = full ? [
      includeItems ? api('insuwork_items?owner_id=eq.' + id + '&deleted_at=is.null' + itemScope + '&order=created_at.desc&limit=2000&select=' + itemSelect) : (state.data.items.length ? Promise.resolve(state.data.items) : api('insuwork_items?owner_id=eq.' + id + '&deleted_at=is.null' + itemScope + '&order=created_at.desc&limit=30&select=' + itemSelect)),
      api('insuwork_tasks?owner_id=eq.' + id + '&deleted_at=is.null&order=task_date.desc&limit=2000&select=id,owner_id,customer_id,title,description,task_date,task_time,end_date,end_time,completed_at,legacy_source,legacy_id,created_at,deleted_at'),
      api('insuwork_customers?owner_id=eq.' + id + '&deleted_at=is.null&order=created_at.desc&limit=2000&select=id,owner_id,name,phone,status,profile,legacy_source,created_at,updated_at,deleted_at'),
      api('insuwork_consultations?owner_id=eq.' + id + '&order=consulted_at.desc&limit=2000&select=id,owner_id,customer_id,content,channel,consulted_at,created_at,updated_at'),
      api('insuwork_customers?owner_id=eq.' + id + '&deleted_at=not.is.null&order=deleted_at.desc&limit=2000&select=id,owner_id,name,phone,status,profile,created_at,updated_at,deleted_at')
    ] : [
      api('insuwork_items?owner_id=eq.' + id + '&deleted_at=is.null' + itemScope + '&order=created_at.desc&limit=30&select=' + itemSelect),
      api('insuwork_tasks?owner_id=eq.' + id + '&deleted_at=is.null&or=(and(task_date.lte.' + today + ',end_date.gte.' + today + '),and(task_date.eq.' + today + ',end_date.is.null))&order=task_time.asc&limit=2000&select=id,owner_id,customer_id,title,description,task_date,task_time,end_date,end_time,completed_at,legacy_source,legacy_id,created_at,deleted_at'),
      api('insuwork_items?owner_id=eq.' + id + '&deleted_at=is.null&legacy_payload->>setting_key=eq.favorites&limit=1&select=' + itemSelect),
      api('insuwork_consultations?owner_id=eq.' + id + '&order=consulted_at.desc&limit=5&select=id,owner_id,customer_id,content,channel,consulted_at,created_at,updated_at,insuwork_customers(id,name,phone,status)'),
      api('insuwork_customers?owner_id=eq.' + id + '&deleted_at=is.null&order=updated_at.desc&limit=2000&select=id,owner_id,name,phone,status,profile,legacy_source,created_at,updated_at,deleted_at')
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
      state.coreLoaded = full && failed.indexOf('events') < 0 && failed.indexOf('customers') < 0 && failed.indexOf('consultations') < 0 && failed.indexOf('trashCustomers') < 0;
      state.fullLoaded = state.coreLoaded && (includeItems ? failed.indexOf('items') < 0 : state.fullLoaded);
      rebuildWorkspaceDerived();
      state.status = failed.length ? 'partial' : 'ready';
      state.error = failed.length ? failed.join(', ') + ' 자료를 불러오지 못했습니다.' : '';
      renderContent();
      document.dispatchEvent(new CustomEvent('insuwork:data-ready'));
      if (failed.indexOf('customers') < 0) window.setTimeout(maybeShowCustomerStatusNotice, 0);
      if (full && failed.indexOf('customers') < 0) syncCareTasksForAll();
      return failed.length === 0;
    }).finally(function () { if (requestId === state.requestId) { state.loadPromise = null; state.loadFull = false; } });
    return state.loadPromise;
  }

  function maybeShowCustomerStatusNotice() {
    var pending = state.data.customers.filter(customerNeedsStatusReview);
    if (!pending.length || !authenticated()) return;
    var key = 'iw_customer_status_notice_' + currentUserId();
    try { if (localStorage.getItem(key)) return; localStorage.setItem(key, 'shown'); } catch (_) {}
    briefingConfirm('기존 원세컨드 고객 정보 ' + pending.length + '건을 가져왔습니다. 이름·연락처·메모 등은 그대로 보존되어 있으며, 보험워크 기준에 맞게 고객상태만 확인해 주세요.', '기존 고객 상태 확인', '상태 확인 시작').then(function (start) {
      if (!start) return;
      state.customerStatusFilter = CUSTOMER_REVIEW_STAGE.key;
      go('customers');
    });
  }

  var CALC_TOOLS = [['calculator', '계산기'], ['bmi', 'BMI 계산기'], ['image-convert', '이미지 변환']];
  function navPlannedEntryHtml(entry) {
    var extra = entry[2];
    if (Array.isArray(extra)) {
      return '<details class="iw-nav-subgroup"><summary><span>' + entry[0] + '</span>' + entry[1] + '</summary>' + extra.map(function (sub) { return '<button type="button" onclick="OSInsuwork.openTool(\'' + sub[0] + '\')">' + sub[1] + '</button>'; }).join('') + '</details>';
    }
    if (typeof extra === 'string' && extra.indexOf('section:') === 0) {
      var sectionKey = extra.slice(8);
      return '<button type="button" class="iw-nav-link' + (state.section === sectionKey ? ' on' : '') + '" onclick="OSInsuwork.go(\'' + sectionKey + '\')"><span>' + entry[0] + '</span>' + entry[1] + '</button>';
    }
    /* 2026-08-25 회귀 수정 — 보험브리핑을 별도 페이지(/insuwork/insubriefing/)로 이동시키던
       'link:' 분기는 사이드바가 통째로 사라지는 문제(#1850 후속)가 있어 폐기했다. 이제
       '소식지·캘린더'는 참고자료/영업도구와 완전히 동일한 'section:briefing' 분기를 타고
       보험워크 SPA 내부 섹션으로 렌더된다(아래 briefingHtml()). 'link:' 분기 자체는 다른 향후
       외부 링크 메뉴를 위해 코드는 남겨두되 현재 briefingGroup에서는 더 이상 쓰지 않는다. */
    if (typeof extra === 'string' && extra.indexOf('link:') === 0) {
      var href = extra.slice(5);
      return '<button type="button" class="iw-nav-link" onclick="window.location.href=\'' + esc(jsString(href)) + '\'"><span>' + entry[0] + '</span>' + entry[1] + '</button>';
    }
    if (typeof extra === 'string') {
      return '<button type="button" class="iw-nav-link" onclick="OSInsuwork.openTool(\'' + extra + '\')"><span>' + entry[0] + '</span>' + entry[1] + '</button>';
    }
    return '<button type="button" disabled><span>' + entry[0] + '</span>' + entry[1] + '</button>';
  }
  function navPlannedGroupHtml(label, entries, tone) {
    return '<details class="iw-nav-group iw-nav-group-' + tone + '"><summary>' + label + '</summary>' + entries.map(navPlannedEntryHtml).join('') + '</details>';
  }
  function userGuideNavHtml() {
    var steps = [
      ['01', '홈', '오늘 일정과 최근 자료를 먼저 확인'],
      ['02', '상담관리', '예약부터 청약완료까지 단계 관리'],
      ['03', '고객관리', '계약일과 보험나이로 케어 기준 생성'],
      ['04', '자료', '업무노트와 파일을 상담 옆에 고정'],
      ['05', '도구', '소식지·스크립트·원전산을 현장에서 사용']
    ];
    return '<details class="iw-nav-guide"><summary>사용자 가이드</summary><div class="iw-nav-guide-body"><p>보험워크는 상담, 고객, 일정, 자료를 한 흐름으로 연결합니다.</p><ol>'
      + steps.map(function (step) { return '<li><span>' + step[0] + '</span><b>' + step[1] + '</b><em>' + step[2] + '</em></li>'; }).join('')
      + '</ol></div></details>';
  }
  function supportGroupHtml() {
    var entries = [
      ['notice-updates', '!', '공지·업데이트'],
      ['user-guide', '?', '사용자 가이드'],
      ['feedback', '✎', '의견 보내기']
    ];
    return '<details class="iw-nav-group iw-nav-group-support"><summary>지원</summary>' + entries.map(function (entry) {
      return '<button type="button" class="iw-nav-link' + (state.section === entry[0] ? ' on' : '') + '" onclick="OSInsuwork.go(\'' + entry[0] + '\')"><span>' + entry[1] + '</span>' + entry[2] + '</button>';
    }).join('') + '</details>';
  }
  function navHtml() {
    var items = [['home', '⌂', '홈'], ['calendar', '▦', '캘린더'], ['customers', '♙', '고객관리'], ['consultations', '✎', '상담관리'], ['assets', '▤', '자료'], ['public-library', '⇄', '공개자료실']];
    if (window._canSeeInsuworkLedger && window._canSeeInsuworkLedger()) items.push(['ledger', '₩', '가계부']);
    var briefingGroup = [['◫', '뉴스 브리핑', 'section:daily-briefing'], ['◫', '보험이슈', 'section:briefing']];
    var refGroup = [['◫', '소식지', 'section:newsletters'], ['↗', '영업방향', 'section:sales-strategy'], ['≡', '상품라인업', 'section:product-lineups'], ['✎', '스크립트', 'section:scripts']];
    var toolGroup = [['◷', '보험연령표', 'section:insurance-age'], ['⌗', '계산기·변환기', 'section:tools'], ['⇗', '원전산 바로가기', 'section:carriers'], ['₩', '보험회사 결제정보', 'section:payments']];
    return '<nav class="iw-nav" aria-label="내 업무 메뉴">' + items.map(function (item) {
      var locked = PROTECTED_SECTIONS.indexOf(item[0]) >= 0 && !allowed();
      return '<button type="button" class="' + (state.section === item[0] ? 'on' : '') + (locked ? ' iw-nav-locked' : '') + '" onclick="OSInsuwork.go(\'' + item[0] + '\')"' + (locked ? ' aria-label="' + esc(item[2]) + ' (로그인 필요)"' : '') + '><span>' + item[1] + '</span>' + item[2] + (locked ? '<span class="iw-nav-lock" aria-hidden="true">🔒</span>' : '') + '</button>';
    }).join('') + '<div class="iw-nav-planned" aria-label="부가 메뉴">' + navPlannedGroupHtml('보험브리핑', briefingGroup, 'briefing') + navPlannedGroupHtml('참고자료', refGroup, 'ref') + navPlannedGroupHtml('영업도구', toolGroup, 'tools') + supportGroupHtml() + '</div>' + '<div class="iw-nav-bottom"><button type="button" class="trash ' + (state.section === 'trash' ? 'on' : '') + '" onclick="OSInsuwork.go(\'trash\')"><span>♲</span>휴지통</button><button type="button" class="archive" onclick="window.open(\'/insu/?view=home\',\'_blank\',\'noopener,noreferrer\')">구)원세컨드</button></div></nav>';
  }
  function statusHtml() {
    if (state.status === 'waiting-auth') return '<div class="iw-state"><strong>로그인 정보를 확인하고 있습니다.</strong><span>인증이 완료되면 자료를 자동으로 불러옵니다.</span></div>';
    if (state.status === 'loading' || state.status === 'idle') return '<div class="iw-state"><strong>내 자료를 불러오는 중입니다.</strong><span>잠시만 기다려 주세요.</span></div>';
    if (state.status === 'refreshing') return '<div class="iw-sync-note">최신 자료를 동기화하고 있습니다.</div>';
    return state.error ? '<div class="iw-error" role="alert"><span>' + esc(state.error) + '</span><button class="iw-btn" onclick="OSInsuwork.reload()">다시 불러오기</button></div>' : '';
  }
  var COMPANY_SEARCH_TERMS = [
    ['DB손해보험', 'DB손보', 'DB화재', '디비손해보험', '디비손보', '디비손해', '디비화재', '동부화재', '동부손보', '동부손해보험'],
    ['DB생명', '디비생명', '동부생명'],
    ['KB손해보험', 'KB손보', '케이비손해보험', '케이비손보', '케비손해보험', '케비손보', '케비손해', '케비손'],
    ['KB라이프', 'KB라이프생명', 'KB생명', '케이비라이프', '케이비라이프생명', '케이비생명', '케비라이프', '케비생명'],
    ['메리츠화재', '메리츠', '메리츠손보', '메리츠손해보험'],
    ['현대해상', '현대', '현대손보', '현대손해보험', '하이카'],
    ['삼성화재', '삼성손보', '삼성손해보험', '삼성화재해상'],
    ['삼성생명', '삼성생명보험'],
    ['흥국화재', '흥국손보', '흥국손해보험', '흥국화재해상'],
    ['흥국생명', '흥국생명보험', '티라이프', '이라이프'],
    ['롯데손해보험', '롯데손보', '롯데손해', '롯데화재'],
    ['한화손해보험', '한화손보', '한화손해', '한화화재'],
    ['한화생명', '한화생명보험', '대한생명'],
    ['라이나손해보험', '라이나손보', '라이나손해'],
    ['라이나생명', '라이나생명보험'],
    ['하나손해보험', '하나손보', '하나손해', '더케이손해보험', '더케이손보'],
    ['하나생명', '하나생명보험'],
    ['NH농협손해보험', 'NH손해보험', 'NH손보', '농협손해보험', '농협손보', '농협손해', '엔에이치손보', '엔에이치농협손보'],
    ['NH농협생명', 'NH생명', '농협생명', '엔에이치생명', '엔에이치농협생명'],
    ['AIG손해보험', 'AIG손보', 'AIG손해', '에이아이지손해보험', '에이아이지손보'],
    ['ABL생명', 'ABL', '에이비엘', '에이비엘생명'],
    ['AIA생명', 'AIA', '에이아이에이', '에이아이에이생명'],
    ['교보생명', '교보', '교보생명보험'],
    ['동양생명', '동양', '동양생명보험'],
    ['미래에셋생명', '미래에셋', '미래에셋생명보험'],
    ['신한라이프', '신한생명', '신한', '신한라이프생명'],
    ['메트라이프', '메트라이프생명', '메트'],
    ['KDB생명', '케이디비생명', '케디비생명', '산업은행생명'],
    ['IBK연금보험', 'IBK연금', '기업은행연금보험', '아이비케이연금보험'],
    ['iM라이프', 'IM라이프', '아이엠라이프', 'DGB생명', '디지비생명'],
    ['처브라이프', '처브', 'CHUBB라이프', '라이나원']
  ];
  function searchNorm(value) {
    return String(value || '').toLocaleLowerCase('ko-KR').replace(/[\s·ㆍ\.\-_/(){}\[\],:;'"`~!@#$%^&*+=?<>|\\]/g, '');
  }
  function searchNeedles() {
    var q = searchNorm(state.query); if (!q) return [];
    var out = [q];
    COMPANY_SEARCH_TERMS.forEach(function (group) {
      var normalized = group.map(searchNorm).filter(Boolean);
      var hit = normalized.some(function (term) { return term === q || term.indexOf(q) >= 0 || q.indexOf(term) >= 0; });
      if (hit) normalized.forEach(function (term) { if (out.indexOf(term) < 0) out.push(term); });
    });
    return out;
  }
  function matches(value) {
    var q = searchNorm(state.query), target = searchNorm(value);
    if (!q) return true;
    if (target.indexOf(q) >= 0) return true;
    return searchNeedles().some(function (needle) { return target.indexOf(needle) >= 0; });
  }
  function statFilterBarHtml(opts) {
    var chips = opts.stages.map(function (stage) {
      var on = opts.activeStatus === stage.key;
      return '<button type="button" class="iw-consult-stat' + (on ? ' on' : '') + '" style="--stat-accent:' + stage.color + '" onclick="' + opts.onStage + '(\'' + esc(stage.key) + '\')" aria-pressed="' + on + '"><strong>' + (opts.counts[stage.key] || 0) + '</strong><span>' + esc(stage.key) + '</span></button>';
    }).join('');
    var allOn = opts.activeStatus === 'all';
    chips += '<button type="button" class="iw-consult-stat all' + (allOn ? ' on' : '') + '" onclick="' + opts.onStage + '(\'all\')" aria-pressed="' + allOn + '"><strong>' + (opts.counts.all || 0) + '</strong><span>전체</span></button>';
    var clearBtn = opts.nameQuery ? '<button type="button" class="iw-consult-name-clear" onclick="OSInsuwork.clearNameSearch(\'' + opts.kind + '\')" aria-label="검색어 지우기">×</button>' : '';
    var registerHtml = opts.registerHtml ? '<div class="iw-consult-register">' + opts.registerHtml + '</div>' : '';
    return '<div class="iw-consult-stats"><label class="iw-consult-name-search"><span aria-hidden="true">⌕</span><input id="' + opts.nameInputId + '" type="search" placeholder="' + esc(opts.namePlaceholder) + '" autocomplete="off" value="' + esc(opts.nameQuery) + '">' + clearBtn + '</label><div class="iw-consult-stat-chips" role="group" aria-label="진행 단계별 보기">' + chips + '</div>' + registerHtml + '</div>';
  }
  /* 2026-08-26 — 즐겨찾기 별을 등록 버튼 옆 세로 칸(iw-toolbar-actions)에서 분리해, 스크롤과 무관하게
     항상 같은 화면 위치에 떠 있는 고정 플로팅 버튼으로 뺐다(대표 확정: 옵션 a). 패널 토글 로직은
     toggleFavoritesPanel()/closeFavoritesPanel()이 id="iw-fav-panel"·class="iw-fav-toggle"로 그대로
     찾아 쓰므로 이 두 식별자는 유지한다. */
  function favoritesFabHtml() {
    return '<div class="iw-fav-fab-wrap"><button type="button" class="iw-btn iw-fav-toggle iw-fav-fab" onclick="OSInsuwork.toggleFavoritesPanel(event)" aria-haspopup="true" aria-expanded="false" title="즐겨찾기">★</button><div class="iw-fav-panel" id="iw-fav-panel" hidden></div></div>';
  }
  /* 2026-08-26 대표 확정 → 08-26 2·3차 수정(대표 "엉망이야, 제대로 수정해") — 커스텀 CSS 툴팁(형제
     span 하나 elements 위치를 아래·옆 어디로 옮겨도 높이가 배너·통계카드 줄과 겹쳐 화면이 뭉개졌다.
     원인은 툴팁 자체가 아니라 "제목+전체 문단"을 다 욱여넣어 박스가 커진 것 → 마우스 오버 미리보기는
     브라우저 네이티브 title 속성(겹침·위치 계산 버그 없음, OS가 알아서 화면 안에 배치)으로 전환하고,
     "전문 디자이너의 손길"이 필요한 자리(대표 표현)는 클릭 시 여는 iw-help-popup 하나로 집중한다. */
  var HELP_CONTENT = {
    calendar: { title: '캘린더 보여주기', preview: '같은 종류 일정이 2개 이상이면 +n개 더보기로 모아 보여줘요.', body: '상담 일정, 고객 케어, 보험상령일 등 동일한 종류의 일정이 2개 이상인 경우 <strong>+n개 더보기</strong>로 보여지며, 마우스를 올려두면 미리보기, 클릭하면 하루 일정 보기로 화면 전환 됩니다.' },
    customers: { title: '케어일정 자동 생성', preview: '청약완료로 등록하면 케어 일정이 자동으로 만들어져요.', body: '청약완료로 등록하면 청약일 기준 <strong>31·91·181·365일 케어 일정</strong>과, 이후 매년 청약 기념일이 캘린더에 자동으로 만들어집니다.<br>별도 설정은 필요 없습니다.' },
    consultations: { title: '상담 플로우 기능', preview: '상담상태별로 통계 카드에 자동 집계돼요.', body: '상담상태 결과값에 따라 통계 카드에 수치화되고, 카드 클릭하면 해당 고객리스트만 보여주며, 상담상태 결과값이 <strong>청약완료</strong>가 되면 고객관리 화면으로 자동 저장됩니다.' }
  };
  function helpBadgeHtml(key) {
    var info = HELP_CONTENT[key]; if (!info) return '';
    var tipText = info.title + ' — ' + info.preview + ' (클릭하면 자세히 보기)';
    return '<button type="button" class="iw-help-badge" title="' + esc(tipText) + '" aria-label="' + esc(info.title) + ' 도움말" onclick="event.stopPropagation();OSInsuwork.openHelp(\'' + key + '\')">?</button>';
  }
  function openHelp(key) {
    var info = HELP_CONTENT[key]; if (!info) return;
    dialog('<div class="iw-help-popup"><div class="iw-help-popup-icon">?</div><h2>' + esc(info.title) + '</h2><p>' + info.body + '</p></div>');
  }
  function scheduleNameSearch(kind, value) {
    var timerKey = kind + 'NameTimer', queryKey = kind + 'NameQuery', composingKey = kind + 'NameComposing', inputId = 'iw-' + kind + '-name-input';
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
    var input = document.getElementById('iw-' + kind + '-name-input'); if (input) input.focus();
  }
  function bindNameSearch(kind) {
    var inputId = 'iw-' + kind + '-name-input', composingKey = kind + 'NameComposing';
    var input = document.getElementById(inputId); if (!input) return;
    state[composingKey] = false;
    input.addEventListener('compositionstart', function () { state[composingKey] = true; });
    input.addEventListener('compositionend', function () { state[composingKey] = false; scheduleNameSearch(kind, input.value); });
    input.addEventListener('input', function () {
      if (state[composingKey]) return;
      if (/^[0-9-]+$/.test(input.value)) { var formatted = phoneText(input.value); if (formatted !== input.value) input.value = formatted; }
      scheduleNameSearch(kind, input.value);
    });
    input.addEventListener('search', function () { if (!state[composingKey]) scheduleNameSearch(kind, input.value); });
  }
  function searchHtml() {
    var q = state.query.trim(); if (!q) return '';
    var results = [];
    loadPaymentInfo();
    state.data.scripts.forEach(function (item) { if (matches((item.title || '') + ' ' + stripHtml(item.script_text))) results.push({ icon: '📝', kind: '업무노트', title: item.title, sub: formatDate(item.created_at), action: "OSInsuwork.showAsset('scripts','" + esc(item.id) + "')" }); });
    state.data.library.forEach(function (item) { if (matches((item.title || '') + ' ' + (item.description || '') + ' ' + (item.memo_text || ''))) results.push({ icon: '📄', kind: item.memo_text ? '메모' : '자료', title: item.title, sub: formatDate(item.created_at), action: "OSInsuwork.showAsset('library','" + esc(item.id) + "')" }); });
    state.data.customers.forEach(function (item) { if (matches((item.name || '') + ' ' + (item.phone || item.phone_raw || '') + ' ' + (item.status || ''))) results.push({ icon: '👤', kind: '고객', title: item.name, sub: item.phone || item.phone_raw || '', action: "OSInsuwork.openCustomerFromEvent('" + esc(item.id) + "')" }); });
    state.data.consultations.forEach(function (item) { var customer = state.data.customers.find(function (c) { return String(c.id) === String(item.customer_id); }) || {}; if (matches((customer.name || '') + ' ' + (item.memo || '') + ' ' + (item.channel || ''))) results.push({ icon: '✎', kind: '상담', title: customer.name || '고객 상담', sub: item.memo || '', action: "OSInsuwork.showCustomer('" + esc(item.customer_id) + "')" }); });
    allEvents().forEach(function (item) { if (matches((item.title || '') + ' ' + (item.description || ''))) results.push({ icon: '▦', kind: '일정', title: item.title, sub: String(item.event_date || '').slice(0, 10), action: "OSInsuwork.showEvent('" + esc(item.id) + "')" }); });
    carrierDirectory().forEach(function (item) { if (matches(item.name)) results.push({ icon: '↗', kind: '보험사 원전산', title: item.name, sub: item.systemUrl ? '원전산 열기' : '연결 정보 확인 중', action: "OSInsuwork.openCarrierSystem('" + esc(jsString(item.name)) + "')" }); });
    paymentSearchResults().forEach(function (item) { results.push(item); });
    return '<div class="iw-toolbar"><div><h2>‘' + esc(q) + '’ 검색 결과</h2><p class="iw-subtitle">자료, 고객, 상담, 일정, 원전산과 결제정보를 한 번에 검색했습니다.</p></div><span class="iw-result-count">' + results.length + '건</span></div><div class="iw-search-results">' + (results.length ? results.map(function (item) { return '<button type="button" onclick="' + item.action + '"><span class="iw-result-icon">' + item.icon + '</span><span><small>' + item.kind + '</small><b>' + esc(item.title || '(제목 없음)') + '</b><em>' + esc(item.sub) + '</em></span><span>›</span></button>'; }).join('') : '<div class="iw-empty"><strong>검색 결과가 없습니다.</strong><span>띄어쓰기나 검색어를 바꿔 보세요.</span></div>') + '</div>';
  }

  function carrierDirectory() { return Array.isArray(window.OS_INSUWORK_CARRIERS) ? window.OS_INSUWORK_CARRIERS : []; }
  function normalizeCarrierName(value) { return String(value || '').toLocaleLowerCase('ko-KR').replace(/주식회사|보험|손해|생명|화재|라이프|[^0-9a-z가-힣]/g, ''); }
  function loadCarrierDirectory() {
    if (state.carriersLoaded || state.carriersLoading || !window.db || !window.db.fetch) return;
    state.carriersLoading = true;
    window.db.fetch('/rest/v1/quick_contents?tab_title=eq.' + encodeURIComponent('원전산 설계 바로가기') + '&select=content_html&limit=1').then(function (response) { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); }).then(function (rows) {
      parseQuickLinks(rows && rows[0] && rows[0].content_html || '').forEach(function (group) { group.items.forEach(function (link) {
        var key = normalizeCarrierName(link.name), found = carrierDirectory().find(function (carrier) { var own = normalizeCarrierName(carrier.name); return own === key || own.indexOf(key) >= 0 || key.indexOf(own) >= 0; });
        if (found && link.href) found.systemUrl = link.href;
      }); });
      state.carriersLoaded = true;
    }).catch(function () {}).finally(function () { state.carriersLoading = false; if (state.section === 'carriers' || state.query.trim()) renderContent(); });
  }
  function carrierCardHtml(carrier) {
    var homepage = carrier.homepageUrl ? '<a class="iw-carrier-open home" href="' + esc(carrier.homepageUrl) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(carrier.name) + ' 홈페이지 새 창 열기" title="홈페이지">⌂</a>' : '';
    var system = carrier.systemUrl ? '<a class="iw-carrier-open" href="' + esc(carrier.systemUrl) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(carrier.name) + ' 원전산 새 창 열기" title="원전산 열기">↗</a>' : '<span class="iw-carrier-open disabled" title="원전산 연결 정보 확인 중">↗</span>';
    return '<article class="iw-carrier-card" data-carrier-name="' + esc(carrier.name) + '"><div class="iw-carrier-head"><img src="' + esc(carrier.logo) + '" alt="' + esc(carrier.name) + ' 로고"><span class="iw-carrier-actions">' + homepage + system + '</span></div><dl><div><dt>고객센터</dt><dd>' + esc(carrier.customer) + '</dd></div><div><dt>모니터링</dt><dd>' + esc(carrier.monitoring) + '</dd></div><div><dt>보험금청구</dt><dd>' + esc(carrier.claim) + '</dd></div></dl></article>';
  }
  function carriersHtml() {
    loadCarrierDirectory();
    var rows = carrierDirectory().filter(function (carrier) { return carrier.type === state.carrierType; });
    return '<div class="iw-toolbar iw-carrier-toolbar"><h2>원전산 바로가기</h2><div class="iw-carrier-tabs" role="tablist"><button type="button" class="' + (state.carrierType === 'nonlife' ? 'on' : '') + '" onclick="OSInsuwork.setCarrierType(\'nonlife\')">손해보험</button><button type="button" class="' + (state.carrierType === 'life' ? 'on' : '') + '" onclick="OSInsuwork.setCarrierType(\'life\')">생명보험</button></div></div><div class="iw-carrier-grid">' + rows.map(carrierCardHtml).join('') + '</div>';
  }
  function openCarrierSystem(name) {
    var carrier = carrierDirectory().find(function (item) { return item.name === name; });
    if (carrier && carrier.systemUrl) { window.open(carrier.systemUrl, '_blank', 'noopener,noreferrer'); return; }
    state.section = 'carriers'; state.query = ''; renderShell(); setUrl(true); loadCarrierDirectory();
  }
  function row(title, subtitle, right, action) {
    return '<button type="button" class="iw-row" onclick="' + action + '"><span><b>' + esc(title || '(제목 없음)') + '</b><small>' + esc(subtitle || '') + '</small></span><span>' + right + '</span></button>';
  }
  function todayTaskRow(item) {
    var done = item.type === 'event' && item.raw && item.raw.completed_at;
    var check = item.type === 'event' && item.id ? '<button type="button" class="iw-task-check' + (done ? ' done' : '') + '" aria-label="' + (done ? '완료 취소' : '완료 처리') + '" onclick="event.stopPropagation();OSInsuwork.toggleEventComplete(\'' + esc(item.id) + '\')">' + (done ? '✓' : '') + '</button>' : '<span class="iw-task-check passive"></span>';
    return '<div class="iw-task-row">' + check + '<button type="button" class="iw-task-open" onclick="' + item.action + '"><span><b>' + esc(item.title || '(제목 없음)') + '</b><small>' + esc(item.subtitle || '') + '</small></span><em>' + esc(item.badge || '') + '</em></button></div>';
  }
  function homeTodayKind(event) {
    if (event && event.event_type === 'insurance-age') return 'age';
    if (isCareTask(event)) return 'care';
    return 'schedule';
  }
  function homeTodayColumnIndex(event) {
    var kind = homeTodayKind(event);
    return kind === 'age' ? 2 : kind === 'care' ? 1 : 0;
  }
  function homeTodayChip(event) {
    var kind = homeTodayKind(event);
    var cls = kind === 'age' ? 'insurance-age' : kind === 'care' ? 'customer' : 'schedule';
    var done = event.completed_at ? ' done' : '';
    return '<button type="button" class="iw-agenda-chip iw-home-today-chip ' + cls + done + '" onclick="OSInsuwork.showEvent(\'' + esc(event.id) + '\')"><small>' + esc(String(event.event_time || '종일').slice(0, 5)) + '</small><b>' + esc(eventTitleLabel(event)) + '</b></button>';
  }
  function homeTodayBoard(todayEvents, emptyText) {
    if (state.homeLoadingDate === state.homeDate) return '<div class="iw-empty iw-home-today-empty" role="status">일정을 불러오는 중입니다.</div>';
    if (state.homeErrorDate === state.homeDate) return '<div class="iw-empty iw-home-today-empty" role="alert">일정을 불러오지 못했습니다. 날짜를 다시 선택해 주세요.</div>';
    var labels = [state.homeDate === ymd(new Date()) ? '오늘일정' : '일정', '고객케어', '상령일'];
    var columns = [[], [], []];
    todayEvents.slice().sort(function (a, b) {
      return (a.completed_at ? 1 : 0) - (b.completed_at ? 1 : 0) || eventPriority(a) - eventPriority(b) || String(a.event_time || '').localeCompare(String(b.event_time || '')) || String(a.title || '').localeCompare(String(b.title || ''), 'ko');
    }).forEach(function (event) { columns[homeTodayColumnIndex(event)].push(event); });
    var total = columns.reduce(function (sum, col) { return sum + col.length; }, 0);
    if (!total) return '<div class="iw-empty iw-home-today-empty">' + emptyText + '</div>';
    return '<div class="iw-home-today-board">' + labels.map(function (label, index) {
      return '<section class="iw-home-today-col"><div class="iw-home-today-col-head"><span>' + label + '</span><strong>' + columns[index].length + '건</strong></div><div class="iw-home-today-list">' + (columns[index].length ? columns[index].map(homeTodayChip).join('') : '<p>없음</p>') + '</div></section>';
    }).join('') + '</div>';
  }
  function favoriteKey(type, id) { return String(type) + ':' + String(id); }
  function isFavorited(type, id) { var key = favoriteKey(type, id); return state.favorites.some(function (entry) { return favoriteKey(entry.target_type, entry.target_id) === key; }); }
  function favoriteButton(type, id, title, subtitle) {
    var on = isFavorited(type, id), label = on ? '즐겨찾기 해제' : '즐겨찾기 추가';
    var action = "event.stopPropagation();OSInsuwork.toggleFavorite('" + esc(jsString(type)) + "','" + esc(jsString(id)) + "','" + esc(jsString(title || '')) + "','" + esc(jsString(subtitle || '')) + "')";
    return '<span role="button" tabindex="0" class="iw-fav' + (on ? ' on' : '') + '" aria-label="' + label + '" title="' + label + '" onclick="' + action + '" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){' + action + ';event.preventDefault();}">' + (on ? '★' : '☆') + '</span>';
  }
  function favoriteKind(type) { return type === 'customer' ? '고객' : type === 'consultation' ? '상담' : type === 'event' ? '일정' : '자료'; }
  function favoriteSubtitle(entry) { return entry.subtitle || favoriteKind(entry.target_type); }
  function favoriteRows() {
    var rows = state.favorites.slice(0, 8);
    return rows.length ? rows.map(function (entry) {
      var key = favoriteKey(entry.target_type, entry.target_id);
      return '<button type="button" class="iw-row iw-asset-draggable iw-folder-drop-target" draggable="true" ondragstart="OSInsuwork.favoriteDragStart(event,\'' + esc(key) + '\')" ondragover="OSInsuwork.favoriteDragOver(event,\'' + esc(key) + '\')" ondragleave="OSInsuwork.favoriteDragLeave(event)" ondrop="OSInsuwork.favoriteDrop(event,\'' + esc(key) + '\')" ondragend="OSInsuwork.favoriteDragEnd(event)" onclick="OSInsuwork.openFavorite(\'' + esc(entry.target_type) + '\',\'' + esc(entry.target_id) + '\')"><span><b>' + esc(entry.title || '(제목 없음)') + '</b><small>' + esc(favoriteSubtitle(entry)) + '</small></span><span>›</span></button>';
    }).join('') : '<div class="iw-empty"><strong>즐겨찾기가 없습니다.</strong><span>자료, 고객, 상담 옆 별표를 눌러 고정하세요.</span></div>';
  }
  function favoriteDragStart(event, key) {
    state.draggingFavorite = key;
    if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', key); }
    if (event.currentTarget) event.currentTarget.classList.add('is-dragging');
  }
  function favoriteDragEnd(event) {
    state.draggingFavorite = null;
    if (event && event.currentTarget) event.currentTarget.classList.remove('is-dragging');
    document.querySelectorAll('#v-insuwork .iw-favorites-panel .is-drag-over').forEach(function (el) { el.classList.remove('is-drag-over'); });
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
  /* 2026-08-25 대표 확정 — 고객관리/상담관리 상단(등록 버튼 크기와 동일한 .iw-btn)에서 여는 즐겨찾기
     플로팅 패널. renderContent()를 쓰지 않고 DOM을 직접 토글해, 고객/상담 작성 중 폼 값이 통째로
     다시 그려지며 사라지는 일이 없게 한다(홈 화면 정적 패널과 별개, favoriteRows()만 재사용). */
  function toggleFavoritesPanel(event) {
    if (event) event.stopPropagation();
    var panel = document.getElementById('iw-fav-panel'); if (!panel) return;
    var opening = panel.hidden;
    panel.hidden = !opening;
    if (opening) panel.innerHTML = '<div class="iw-fav-panel-head"><strong>즐겨찾기</strong></div><div class="iw-list">' + favoriteRows() + '</div>';
    var btn = event && event.currentTarget; if (btn) btn.setAttribute('aria-expanded', String(opening));
  }
  function closeFavoritesPanel() {
    var panel = document.getElementById('iw-fav-panel'); if (panel) panel.hidden = true;
    var btn = document.querySelector('.iw-fav-toggle[aria-expanded="true"]'); if (btn) btn.setAttribute('aria-expanded', 'false');
  }
  function openFavorite(type, id) {
    closeFavoritesPanel();
    var resolved = resolveFavorite(type, id);
    if (resolved) { resolved.action(); return; }
    loadData(true, false, true).then(function () { var next = resolveFavorite(type, id); if (next) next.action(); else if (typeof window.toast === 'function') window.toast('즐겨찾기 대상을 찾지 못했습니다.'); });
  }
  function toggleFavorite(type, id, title, subtitle) {
    var key = favoriteKey(type, id), index = state.favorites.findIndex(function (entry) { return favoriteKey(entry.target_type, entry.target_id) === key; });
    if (index >= 0) state.favorites.splice(index, 1);
    else state.favorites.unshift({ target_type: type, target_id: String(id), title: title || '(제목 없음)', subtitle: subtitle || favoriteKind(type), sort_order: 0, created_at: new Date().toISOString() });
    state.favorites = state.favorites.map(function (entry, order) { return Object.assign({}, entry, { sort_order: order }); });
    saveFavorites(); renderContent();
    if (typeof window.toast === 'function') window.toast(index >= 0 ? '즐겨찾기에서 제거했습니다.' : '즐겨찾기에 추가했습니다.');
  }
  function scopeBadge(item) { var global = String(item.visibility || 'private') === 'public'; return '<span class="iw-badge ' + (global ? 'public' : '') + '">' + (global ? '전체 공개' : '나만 보기') + '</span>'; }

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
  function syncCareTasksForCustomer(customer, knownRows) {
    var bases = contractDatesOf(customer).filter(function (base) { return /^\d{4}-\d{2}-\d{2}$/.test(base); });
    if (!bases.length || !customer || !customer.id) return Promise.resolve(true);
    var targets = bases.reduce(function (all, base) { return all.concat(careTaskTargets(customer, base)); }, []);
    var existingRows = Array.isArray(knownRows) ? Promise.resolve(knownRows) : api('insuwork_tasks?owner_id=eq.' + encodeURIComponent(currentUserId()) + '&legacy_source=eq.care_auto&customer_id=eq.' + encodeURIComponent(customer.id) + '&select=id,legacy_id,task_date,description');
    return existingRows.then(function (existing) {
      var have = {}; (existing || []).forEach(function (row) { have[row.legacy_id] = row; });
      var toCreate = targets.filter(function (t) { return !have[t.legacyId]; });
      var toUpdate = targets.filter(function (t) { var row = have[t.legacyId]; return row && (row.task_date !== t.date || row.description !== t.description); });
      var creates = toCreate.map(function (t) {
        return writeOne('insuwork_tasks', { owner_id: currentUserId(), customer_id: customer.id, title: t.title, description: t.description, task_date: t.date, legacy_source: 'care_auto', legacy_id: t.legacyId }).then(function (task) { upsertTask(task); return true; }).catch(function () { return false; });
      });
      var updates = toUpdate.map(function (t) {
        return updateOne('insuwork_tasks?id=eq.' + encodeURIComponent(have[t.legacyId].id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { task_date: t.date, description: t.description }).then(function (task) { upsertTask(task); return true; }).catch(function () { return false; });
      });
      return Promise.all(creates.concat(updates)).then(function (results) { return results.every(function (ok) { return ok; }); });
    }).catch(function () { return false; });
  }
  function syncCareTasksForAll() {
    var userId = currentUserId(), key = userId + ':' + new Date().getFullYear();
    if (state.careSyncKey === key) return Promise.resolve();
    if (state.careSyncPromise) return state.careSyncPromise;
    var customers = state.data.customers.filter(function (c) { return isRealCustomerStage(c.status); });
    if (!customers.length) return Promise.resolve();
    var rows = [], pageSize = 1000;
    function readPage(offset) {
      return api('insuwork_tasks?owner_id=eq.' + encodeURIComponent(userId) + '&legacy_source=eq.care_auto&order=id.asc&limit=' + pageSize + '&offset=' + offset + '&select=id,customer_id,legacy_id,task_date,description').then(function (page) {
        rows = rows.concat(page);
        if (page.length === pageSize) return readPage(offset + pageSize);
      });
    }
    state.careSyncPromise = readPage(0).then(function () {
      if (userId !== currentUserId()) return;
      var byCustomer = {}; rows.forEach(function (row) { (byCustomer[row.customer_id] || (byCustomer[row.customer_id] = [])).push(row); });
      return Promise.all(customers.map(function (customer) { return syncCareTasksForCustomer(customer, byCustomer[customer.id] || []); })).then(function (results) {
        if (userId !== currentUserId()) return;
        if (results.every(function (ok) { return ok; })) state.careSyncKey = key;
        rebuildWorkspaceDerived(); renderContent();
        document.dispatchEvent(new CustomEvent('insuwork:data-ready'));
      });
    }).catch(function () {}).finally(function () { state.careSyncPromise = null; });
    return state.careSyncPromise;
  }
  var LUNAR_HOLIDAYS = [[2020, '2020-01-25', '2020-04-30', '2020-10-01'], [2021, '2021-02-12', '2021-05-19', '2021-09-21'], [2022, '2022-02-01', '2022-05-08', '2022-09-10'], [2023, '2023-01-22', '2023-05-26', '2023-09-29'], [2024, '2024-02-10', '2024-05-15', '2024-09-17'], [2025, '2025-01-29', '2025-05-05', '2025-10-06'], [2026, '2026-02-17', '2026-05-24', '2026-09-25'], [2027, '2027-02-06', '2027-05-13', '2027-09-15'], [2028, '2028-01-26', '2028-05-02', '2028-10-03'], [2029, '2029-02-13', '2029-05-20', '2029-09-22'], [2030, '2030-02-03', '2030-05-09', '2030-09-12'], [2031, '2031-01-23', '2031-05-28', '2031-10-01'], [2032, '2032-02-11', '2032-05-16', '2032-09-19'], [2033, '2033-01-31', '2033-05-06', '2033-09-08'], [2034, '2034-02-19', '2034-05-25', '2034-09-27'], [2035, '2035-02-08', '2035-05-15', '2035-09-16']];
  var SOLAR_TERM_NAMES = ['소한', '대한', '입춘', '우수', '경칩', '춘분', '청명', '곡우', '입하', '소만', '망종', '하지', '소서', '대서', '입추', '처서', '백로', '추분', '한로', '상강', '입동', '소설', '대설', '동지'];
  var SOLAR_TERM_MINUTES = [0, 21208, 42467, 63836, 85337, 107014, 128867, 150921, 173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033, 353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758];
  var builtinCache = {};
  function builtinEvent(date, title, kind, description) { return { id: 'builtin-' + date + '-' + title, event_date: date, title: title, event_type: kind, description: description || '', builtin: true }; }
  function insuranceAgeEventDate(birth, birthdayYear) {
    var text = String(birth || '').slice(0, 10), parts = text.split('-').map(Number), born = parseDate(text);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || parts.length !== 3 || born.getFullYear() !== parts[0] || born.getMonth() !== parts[1] - 1 || born.getDate() !== parts[2]) return '';
    var birthday = new Date(birthdayYear, parts[1] - 1, parts[2]);
    if (birthday.getMonth() !== parts[1] - 1) birthday = new Date(birthdayYear, parts[1], 0);
    return ymd(addMonths(birthday, -6));
  }
  function insuranceAgeCalendarEventsForYear(year) {
    var out = [], seen = {};
    state.data.customers.forEach(function (customer) {
      var profile = customerProfile(customer), birth = String(profile.birth_date || '').slice(0, 10);
      if (!birth) return;
      [year, year + 1].forEach(function (birthdayYear) {
        var date = insuranceAgeEventDate(birth, birthdayYear);
        if (!date || date.slice(0, 4) !== String(year)) return;
        var id = 'insage-' + customer.id + '-' + birthdayYear;
        if (seen[id]) return; seen[id] = true;
        var phone = phoneText(customer.phone || customer.phone_raw || '');
        out.push({ id: id, customer_id: customer.id, event_date: date, event_end_date: date, title: (customer.name || '고객') + ' 보험상령일', event_type: 'insurance-age', description: (customer.name || '고객') + ' 고객 보험상령일입니다. 생년월일 ' + birth + (phone ? ' · 연락처: ' + phone : ''), builtin: true });
      });
    });
    return out;
  }
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
    years[parseDate(state.homeDate).getFullYear()] = true;
    [selected.getFullYear() - 1, selected.getFullYear(), selected.getFullYear() + 1, cursor.getFullYear() - 1, cursor.getFullYear(), cursor.getFullYear() + 1].forEach(function (year) { years[year] = true; });
    return Object.keys(years).reduce(function (rows, year) { year = Number(year); return rows.concat(builtinCalendarEvents(year), insuranceAgeCalendarEventsForYear(year)); }, []);
  }
  function allEvents() { return state.data.events.concat(builtInEventsAroundCalendar()); }

  function publicLandingHtml() {
    var concepts = [
      ['상담관리', '예약에서 청약완료까지 흐름을 놓치지 않습니다.'],
      ['고객관리', '계약일과 보험나이 기준으로 다음 케어가 이어집니다.'],
      ['자료·도구', '소식지, 스크립트, 결제정보를 상담 중 바로 꺼냅니다.']
    ];
    var keywords = ['상담 흐름', '고객 케어', '자료 재사용', '일정 연결', '현장 도구'];
    var flow = [
      ['01', '상담 등록', '예약', '상담 전 고객 정보를 정리합니다.'],
      ['02', '진행 단계', '클로징', '제안서와 후속 연락을 놓치지 않습니다.'],
      ['03', '고객 전환', '청약완료', '계약 후 관리 대상으로 이어집니다.'],
      ['04', '케어 일정', '31·91·181·365', '사후관리와 상령일이 캘린더에 남습니다.']
    ];
    return '<section class="iw-public-landing" aria-labelledby="iw-public-title">'
      + '<div class="iw-public-hero">'
      + '<div class="iw-public-copy">'
      + '<p class="iw-public-kicker">WORKFLOW / SYSTEM IDENTITY</p>'
      + '<h1 id="iw-public-title"><span>체계적인 워크플로우로</span><span>보험 업무를 연결하다</span></h1>'
      + '<p>보험워크는 흩어진 상담, 고객, 일정, 자료를 하나의 업무 흐름으로 묶어 오늘 해야 할 일과 다음 케어를 놓치지 않게 하는 스마트 보험 업무 플랫폼입니다.</p>'
      + '<ul class="iw-public-keywords" aria-label="보험워크 핵심 키워드">' + keywords.map(function (item) { return '<li>' + item + '</li>'; }).join('') + '</ul>'
      + '<div class="iw-public-actions"><button class="iw-public-primary" type="button" data-ib-login>로그인</button><button class="iw-public-secondary" type="button" data-ib-signup>회원가입</button></div>'
      + '</div>'
      + '<figure class="iw-public-brand iw-public-story" aria-label="보험워크 업무 흐름 미리보기">'
      + '<div class="iw-story-logo"><img src="/insuwork/assets/brand/insurance-work-logo-ci.png?v=20260830ci" alt="보험워크 Insurance Work 로고"></div>'
      + '<div class="iw-story-board" aria-hidden="true"><div class="iw-story-flash"></div><div class="iw-story-line"><span></span></div>'
      + flow.map(function (item, index) { return '<article class="iw-story-step s' + (index + 1) + '"><span>' + item[0] + '</span><strong>' + item[1] + '</strong><b>' + item[2] + '</b><p>' + item[3] + '</p></article>'; }).join('')
      + '<div class="iw-story-output"><strong>오늘의 업무판</strong><span>일정 · 고객 · 자료 · 도구가 한 화면으로 연결됩니다.</span></div><div class="iw-story-signal a"></div><div class="iw-story-signal b"></div></div>'
      + '<figcaption>보험 업무를 기억이 아니라 워크플로우로.</figcaption></figure>'
      + '</div>'
      + '<div class="iw-public-concepts" aria-label="보험워크 구성 개념">' + concepts.map(function (item, index) { return '<article><span>' + String(index + 1).padStart(2, '0') + '</span><strong>' + item[0] + '</strong><p>' + item[1] + '</p></article>'; }).join('') + '</div>'
      + '</section>';
  }

  function homeHtml() {
    var today = ymd(new Date());
    var date = state.homeDate, isToday = date === today, day = parseDate(date);
    var dateLabel = (day.getFullYear() !== new Date().getFullYear() ? day.getFullYear() + '년 ' : '') + (day.getMonth() + 1) + '월 ' + day.getDate() + '일 (' + '일월화수목금토'.charAt(day.getDay()) + ')';
    /* 2026-08-25 — 비로그인 방문자에게도 홈은 열려 있지만, 즐겨찾기/오늘 일정/최근 자료/최근 상담
       위젯은 임태성 실장 개인 고객 데이터(PII)를 담는다. loadData()가 이미 !authenticated()일 때
       fetch 자체를 시도하지 않아 state.data는 항상 비어있는 상태로 유지되지만(1차 방어), 여기서도
       loginHint로 안내 문구를 로그인 유도로 바꿔 "정말 자료가 없는 것"과 "로그인 안 해서 안 보이는 것"을
       구분해 준다(2차, UX 방어일 뿐 데이터 노출 방어는 loadData/RLS가 담당). */
    var loginHint = !allowed();
    var todayEvents = allEvents().filter(function (event) { var start = String(event.event_date || '').slice(0, 10), end = String(event.event_end_date || start).slice(0, 10); return start <= date && end >= date; });
    var recent = state.data.scripts.map(function (item) { return { kind: '업무노트', item: item }; })
      .concat(state.data.library.map(function (item) { return { kind: item.memo_text ? '메모' : '자료실', item: item }; }))
      .sort(function (a, b) { return String(b.item.created_at).localeCompare(String(a.item.created_at)); }).slice(0, 5);
    /* 2026-08-26 대표 확정 — "최근 고객" = 청약일자(profile.contract_date) 최근순이 원래 사양(1차
       수정에서 updated_at으로 잘못 바꿨다가 대표 지적으로 원복). 진짜 원인은 정렬 기준이 아니라
       홈 라이트 로드가 고객을 updated_at.desc 30건만 가져오던 것(loadData 366행) — 그 30건 안에서만
       청약일자로 재정렬하니 전체 고객 중 진짜 청약일자 상위 5명이 아니라 "최근에 DB가 손댄 30명
       중 상위 5명"이 나와 엉뚱해 보였다. 정렬은 원래대로, 원인은 loadData의 limit(아래에서 수정). */
    var recentCustomers = state.data.customers.filter(function (item) { return isRealCustomerStage(item.status); })
      .sort(function (a, b) { var ad = String(customerProfile(a).contract_date || a.created_at || '').slice(0, 10), bd = String(customerProfile(b).contract_date || b.created_at || '').slice(0, 10); return bd.localeCompare(ad); }).slice(0, 5);
    var favoritesEmpty = loginHint ? '<div class="iw-empty"><strong>로그인 후 확인할 수 있습니다.</strong><span>즐겨찾기는 로그인한 계정에만 저장됩니다.</span></div>' : favoriteRows();
    var favoritesPanel = '<section class="iw-panel iw-favorites-panel"><div class="iw-panel-head"><strong>즐겨찾기</strong></div><div class="iw-list">' + favoritesEmpty + '</div></section>';
    var todayEmptyText = loginHint ? '로그인 후 일정을 확인할 수 있습니다.' : (state.status === 'loading' || state.status === 'refreshing') ? '일정을 불러오는 중입니다.' : state.status === 'partial' ? '일정을 모두 불러오지 못했습니다. 다시 확인해 주세요.' : isToday ? '오늘 일정이 없습니다.' : '선택한 날짜에 일정이 없습니다.';
    var todayPanel = '<section class="iw-panel iw-today-work-panel"><div class="iw-panel-head"><div class="iw-home-date-nav" role="group" aria-label="할 일 날짜 이동"><button type="button" class="iw-btn iw-home-date-today" aria-label="오늘로 이동" onclick="OSInsuwork.homeToday()">오늘</button><span class="iw-month-switcher"><button type="button" aria-label="이전 날짜" onclick="OSInsuwork.moveHomeDate(-1)">‹</button><button type="button" aria-label="다음 날짜" onclick="OSInsuwork.moveHomeDate(1)">›</button></span><strong aria-live="polite">' + esc(dateLabel) + ' · ' + (isToday ? '오늘 할 일' : '할 일') + '</strong></div><button type="button" onclick="OSInsuwork.openHomeCalendar()">캘린더 보기</button></div>' + homeTodayBoard(todayEvents, todayEmptyText) + '</section>';
    var assetsEmptyText = loginHint ? '로그인 후 자료를 확인할 수 있습니다.' : '저장된 자료가 없습니다.';
    var assetsPanel = '<section class="iw-panel"><div class="iw-panel-head"><strong>최근 자료</strong><button onclick="OSInsuwork.go(\'assets\')">전체 보기</button></div><div class="iw-list">' + (recent.length ? recent.map(function (entry) { return row(entry.item.title, entry.kind + ' · ' + formatDate(entry.item.created_at), '›', 'OSInsuwork.showAsset(\'' + (entry.kind === '업무노트' ? 'scripts' : 'library') + '\',\'' + esc(entry.item.id) + '\')'); }).join('') : '<div class="iw-empty">' + assetsEmptyText + '</div>') + '</div></section>';
    var customersEmptyText = loginHint ? '로그인 후 고객 정보를 확인할 수 있습니다.' : '등록된 고객이 없습니다.';
    var customersPanel = '<section class="iw-panel"><div class="iw-panel-head"><strong>최근 고객</strong><button onclick="OSInsuwork.go(\'customers\')">전체 보기</button></div><div class="iw-list">' + (recentCustomers.length ? recentCustomers.map(function (item) { var profile = customerProfile(item); return row(item.name || '(이름 없음)', phoneText(item.phone || item.phone_raw || '') || (item.status || ''), esc(formatDate(profile.contract_date || item.created_at)), "OSInsuwork.openCustomerFromEvent('" + esc(item.id) + "')"); }).join('') : '<div class="iw-empty">' + customersEmptyText + '</div>') + '</div></section>';
    /* 비로그인 사용자는 state.status가 'waiting-auth'에서 영원히 벗어나지 못하므로(로그인 절차가
       진행 중인 게 아니라 애초에 로그인을 안 한 것) statusHtml()을 얹으면 "로그인 정보를 확인하고
       있습니다" 문구가 계속 떠 있는 것처럼 오해를 준다. 로그인된 사용자의 실제 개인 데이터 로딩
       중에는 기존처럼 문구를 유지한다. */
    return (allowed() ? statusHtml() : '') + '<div class="iw-home-grid"><div class="iw-home-row iw-home-row-focus">' + todayPanel + '</div>' + (window.OSCustomerBriefing ? window.OSCustomerBriefing.bannerHtml() : '') + '<div class="iw-home-row iw-home-row-quick">' + favoritesPanel + assetsPanel + customersPanel + '</div></div>';
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
    return '<div class="iw-load-more"><button type="button" class="iw-btn" onclick="' + action + '">더 보기 (' + visibleCount + ' / ' + totalCount + ')</button></div>';
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
    var tabsHtml = tabs.map(function (tab) { return '<button class="' + (state.assetFilter === tab[0] ? 'on' : '') + '" onclick="OSInsuwork.filterAssets(\'' + tab[0] + '\')">' + tab[1] + '</button>'; }).join('');
    var viewModes = [['list', '목록', '☷'], ['thumb', '썸네일', '▦'], ['large', '큰 이미지', '▣']];
    var viewHtml = viewModes.map(function (mode) { return '<button type="button" class="' + (state.assetView === mode[0] ? 'on' : '') + '" onclick="OSInsuwork.setAssetView(\'' + mode[0] + '\')" aria-label="' + mode[1] + ' 보기" title="' + mode[1] + '"><span aria-hidden="true">' + mode[2] + '</span>' + mode[1] + '</button>'; }).join('');
    var destination = currentAssetCategory();
    var destinationText = destination ? assetCategoryLabel(destination) + (state.assetFolder ? ' · 현재 폴더' : '') : '저장 위치를 선택합니다';
    var addMenu = '<details class="iw-add-menu"><summary>+ 자료 추가</summary><div class="iw-add-popover"><small class="iw-add-destination">' + esc(destinationText) + '</small><button type="button" onclick="OSInsuwork.newAssetFolder()">새 폴더</button><label>파일 업로드<input type="file" multiple hidden onchange="OSInsuwork.uploadAssetFiles(this.files);this.value=\'\'"></label><button type="button" onclick="OSInsuwork.addAsset()">업무노트·메모 작성</button></div></details>';
    var controls = STANDALONE
      ? '<div class="iw-assets-controls"><div class="iw-tabs">' + tabsHtml + addMenu + '</div><div class="iw-assets-actions"><div class="iw-view-switch" aria-label="보기 방식">' + viewHtml + '</div></div></div>'
      : '<div class="iw-toolbar"><div><h2>자료</h2><p class="iw-subtitle">노트, 메모, 링크와 사이트 파일을 한 화면에서 관리합니다.</p></div><div class="iw-actions"><button class="iw-btn" onclick="OSInsuwork.openVault()">📁 파일함 열기</button><button class="iw-btn primary" onclick="OSInsuwork.addAsset()">+ 자료 추가</button></div></div><div class="iw-system-note"><strong>사이트 파일함</strong><span>새 폴더 만들기와 여러 파일 업로드를 지원합니다.</span><small>PC 원본과 별개인 사이트 보관 공간이며, 사이트에서 작업해도 PC 원본은 변경되지 않습니다.</small></div><div class="iw-tabs">' + tabsHtml + '</div>';
    var breadcrumb = assetBreadcrumbHtml();
    var content = state.assetView === 'list'
      ? '<div class="iw-explorer"><table class="iw-table"><thead><tr><th>이름</th><th>종류</th><th>현재 분류</th><th>등록일</th></tr></thead><tbody>' + items.map(function (item) { return '<tr tabindex="0" class="' + (item.folder ? 'iw-folder-drop-target' : 'iw-asset-draggable') + '" ' + assetDragAttributes(item) + ' onclick="' + assetOpenAction(item) + '"><td><span class="iw-title-with-fav">' + (item.folder ? '' : favoriteButton('asset', item.raw.id, item.title || '(제목 없음)', item.kind + ' · ' + formatDate(item.created))) + '<b>' + (item.folder ? '📁 ' : '') + esc(item.title || '(제목 없음)') + '</b></span></td><td>' + item.kind + '</td><td>' + scopeBadge(item.raw) + '</td><td>' + formatDate(item.created) + '</td></tr>'; }).join('') + '</tbody></table>' + (items.length ? '' : '<div class="iw-empty">조건에 맞는 자료가 없습니다.</div>') + '</div>'
      : '<div class="iw-assets-grid ' + (state.assetView === 'large' ? 'large' : '') + '">' + items.map(assetCardHtml).join('') + (items.length ? '' : '<div class="iw-empty">조건에 맞는 자료가 없습니다.</div>') + '</div>';
    return statusHtml() + controls + breadcrumb + content + loadMoreHtml(totalItemCount, items.length, 'OSInsuwork.loadMoreAssets()');
  }
  function assetOpenAction(item) {
    if (item.folder) return "OSInsuwork.openAssetFolder('" + esc(item.raw.id) + "')";
    if (previewType(item.raw) && (item.raw.storage_path || item.raw.image_url)) return "OSInsuwork.openAssetPreview('" + item.source + "','" + esc(item.raw.id) + "')";
    return "OSInsuwork.showAsset('" + item.source + "','" + esc(item.raw.id) + "')";
  }
  function assetDragAttributes(item) {
    var id = esc(item.raw.id), category = esc(item.type), raw = item.raw || {};
    if (item.folder) return 'ondragover="OSInsuwork.assetDragOver(event,\'' + id + '\',\'' + category + '\')" ondragleave="OSInsuwork.assetDragLeave(event)" ondrop="OSInsuwork.assetDrop(event,\'' + id + '\',\'' + category + '\')"';
    return 'draggable="true" data-file-drag="true" data-file-title="' + esc(raw.title || item.title || '파일') + '" data-file-mime="' + esc(raw.mime_type || '') + '" data-storage-path="' + esc(raw.storage_path || '') + '" data-direct-url="' + esc(raw.image_url || raw.url || '') + '" ondragstart="OSInsuwork.assetDragStart(event,\'' + id + '\',\'' + category + '\')" ondragend="OSInsuwork.assetDragEnd(event)"';
  }
  function assetBreadcrumbHtml() {
    if (!state.assetFolder) return '';
    var parts = [], id = state.assetFolder;
    while (id) { var folder = state.data.library.find(function (item) { return String(item.id) === String(id) && item.item_type === 'folder'; }); if (!folder) break; parts.unshift(folder); id = folder.parent_id; }
    var category = currentAssetCategory();
    var current = parts.length ? parts[parts.length - 1] : null;
    return '<nav class="iw-folder-path" aria-label="폴더 경로"><span class="iw-folder-trail"><button type="button" onclick="OSInsuwork.openAssetRoot(\'' + esc(category) + '\')">' + esc(assetCategoryLabel(category)) + '</button>' + parts.map(function (folder) { return '<span>›</span><button type="button" onclick="OSInsuwork.openAssetFolder(\'' + esc(folder.id) + '\')">' + esc(folder.title) + '</button>'; }).join('') + '</span>' + (current ? '<button type="button" class="iw-folder-delete" onclick="OSInsuwork.deleteAssetFolder(\'' + esc(current.id) + '\')">현재 폴더 삭제</button>' : '') + '</nav>';
  }
  function assetCardHtml(item) {
    var raw = item.raw || {}, direct = raw.image_url || (/\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(raw.url || '') ? raw.url : '');
    var image = direct ? '<img src="' + esc(direct) + '" alt="">' : ((raw.storage_path && /^image\//.test(raw.mime_type || '')) ? '<img data-storage-path="' + esc(raw.storage_path) + '" alt="">' : '');
    var docBody = item.type === 'note' ? '<p class="iw-asset-ext">Note</p>' : item.type === 'memo' ? '<p class="iw-asset-ext">Memo</p>' : item.body ? '<p>' + esc(String(item.body).slice(0, 110)) + '</p>' : '<p class="iw-asset-ext">' + esc((fileExtension(raw) || item.kind || '파일').toUpperCase()) + '</p>';
    var preview = item.folder ? '<span class="iw-folder-icon">📁</span>' : image || '<div class="iw-asset-document"><span>' + (item.type === 'note' ? '업무노트' : item.type === 'memo' ? '메모' : item.kind) + '</span>' + docBody + '</div>';
    return '<button type="button" class="iw-asset-card ' + (item.folder ? 'iw-folder-drop-target' : 'iw-asset-draggable') + '" ' + assetDragAttributes(item) + ' onclick="' + assetOpenAction(item) + '">' + (item.folder ? '' : favoriteButton('asset', raw.id, item.title || '(제목 없음)', item.kind + ' · ' + formatDate(item.created))) + '<span class="iw-asset-preview">' + preview + '</span><b>' + esc(item.title || '(제목 없음)') + '</b><small>' + esc(item.kind) + ' · ' + formatDate(item.created) + '</small></button>';
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
    document.querySelectorAll('#v-insuwork img[data-storage-path]').forEach(function (img) {
      var path = img.getAttribute('data-storage-path'); if (!path) return;
      signStoragePath(path).then(function (url) { img.src = url; }).catch(function () {});
    });
  }
  function customerStageCounts(rows) {
    var counts = { all: rows.length }; CUSTOMER_STAGES.concat([CUSTOMER_REVIEW_STAGE]).forEach(function (stage) { counts[stage.key] = 0; });
    rows.forEach(function (item) { var status = customerDisplayStatus(item); if (counts.hasOwnProperty(status)) counts[status]++; });
    return counts;
  }
  function customersHtml() {
    var columns = [{ key: 'date', label: '청약일자', width: 86 }, { key: 'name', label: '이름', width: 88 }, { key: 'birth', label: '생년월일', width: 92 }, { key: 'genderAge', label: '성별(보험나이)', width: 104 }, { key: 'phone', label: '전화번호', width: 116 }, { key: 'summary', label: '고객내용', width: 360, flex: true }, { key: 'status', label: '고객상태', width: 102 }];
    var gridStyle = '--iw-consult-template:' + consultGridTemplate(columns);
    var nameQ = searchNorm(state.customerNameQuery);
    var baseRows = state.data.customers.filter(function (item) { if (!isManagedCustomer(item)) return false; if (nameQ && searchNorm((item.name || '') + ' ' + (item.phone || item.phone_raw || '')).indexOf(nameQ) < 0) return false; return true; });
    baseRows.sort(function (a, b) { var ad = String(customerProfile(a).contract_date || a.created_at || '').slice(0, 10), bd = String(customerProfile(b).contract_date || b.created_at || '').slice(0, 10); return bd.localeCompare(ad); });
    var counts = customerStageCounts(baseRows);
    var rows = baseRows.filter(function (item) { var profile = customerProfile(item), note = profile.note || '', status = customerDisplayStatus(item); return (state.customerStatusFilter === 'all' || status === state.customerStatusFilter) && matches((item.name || '') + ' ' + (item.phone || item.phone_raw || '') + ' ' + (profile.birth_date || '') + ' ' + note + ' ' + status); });
    var selected = rows.find(function (item) { return String(item.id) === String(state.selectedCustomerDetail); });
    if (!selected && state.selectedCustomerDetail) state.selectedCustomerDetail = null;
    var totalRowCount = rows.length;
    if (selected && rows.indexOf(selected) >= state.customersRenderLimit) rows = [selected].concat(rows.filter(function (item) { return item !== selected; }).slice(0, state.customersRenderLimit - 1));
    else rows = rows.slice(0, state.customersRenderLimit);
    var header = '<div class="iw-consult-columns" style="' + gridStyle + '">' + columns.map(function (column) { return '<span>' + column.label + '</span>'; }).join('') + '<span class="iw-consult-action-spacer" aria-hidden="true"></span></div>';
    var body = rows.map(function (item) { var profile = customerProfile(item), date = String(profile.contract_date || item.created_at || '').slice(0, 10), age = insuranceAge(profile.birth_date, ymd(new Date())), note = profile.note || '', status = customerDisplayStatus(item); var values = { date: date, name: item.name || '(이름 없음)', birth: profile.birth_date || '', genderAge: (profile.gender || '-') + (age === '' ? '' : ' (' + age + '세)'), phone: phoneText(item.phone || item.phone_raw || ''), summary: stripHtml(note), status: status }; return '<button type="button" role="listitem" class="iw-consult-row' + (String(item.id) === String(state.selectedCustomerDetail) ? ' on' : '') + '" style="' + gridStyle + '" onclick="OSInsuwork.selectCustomerDetail(\'' + esc(item.id) + '\')" onmouseenter="OSInsuwork.showRowHover(event)" onmouseleave="OSInsuwork.hideRowHover()" data-hover-text="' + esc(stripHtml(note || '고객내용이 없습니다.')) + '">' + columns.map(function (column) { if (column.key === 'name') return '<strong>' + favoriteButton('customer', item.id, values.name, (values.phone || status)) + '<span>' + esc(values[column.key]) + '</span></strong>'; return '<span class="iw-consult-cell iw-consult-' + esc(column.key) + '">' + esc(values[column.key]) + '</span>'; }).join('') + '<span class="iw-consult-action-spacer" aria-hidden="true"></span></button>'; }).join('');
    var detail = selected ? customerDetailHtml(selected) : '';
    var stats = statFilterBarHtml({ kind: 'customer', stages: CUSTOMER_STAGES.concat([CUSTOMER_REVIEW_STAGE]), activeStatus: state.customerStatusFilter, counts: counts, nameQuery: state.customerNameQuery, nameInputId: 'iw-customer-name-input', namePlaceholder: '고객명·전화번호 검색', onStage: 'OSInsuwork.filterCustomerStatus', registerHtml: '<button class="iw-btn primary" onclick="OSInsuwork.addCustomer()">+ 고객 등록</button>' });
    return '<div class="iw-consult-screen">' + statusHtml() + '<div class="iw-toolbar"><h2>고객관리' + helpBadgeHtml('customers') + '</h2></div>' + stats + favoritesFabHtml() + '<div class="iw-consult-layout' + (selected ? ' has-detail' : '') + '"><section class="iw-consult-master"><div class="iw-consult-list" role="list">' + header + '<div class="iw-consult-rows">' + body + (rows.length ? '' : '<div class="iw-empty">등록된 고객이 없습니다.</div>') + '</div>' + loadMoreHtml(totalRowCount, rows.length, 'OSInsuwork.loadMoreCustomers()') + '</div></section>' + detail + '</div></div>';
  }
  function customerDetailHtml(item) {
    var profile = customerProfile(item), date = String(profile.contract_date || item.created_at || '').slice(0, 10), age = insuranceAge(profile.birth_date, ymd(new Date())), needsReview = customerNeedsStatusReview(item), status = needsReview ? '' : item.status;
    var statuses = CUSTOMER_STAGES.map(function (stage) { return stage.key; });
    return '<article class="iw-consult-detail"><button type="button" class="iw-consult-detail-close" onclick="OSInsuwork.selectCustomerDetail()" aria-label="고객 상세 닫기">×</button><button type="button" class="iw-consult-back" onclick="OSInsuwork.selectCustomerDetail()">‹ 목록</button>'
      + '<div class="iw-inline-form-block">'
      + contractDatesField('iwd-customer', contractDatesOf(item), 'customerDetail')
      + '<div class="iw-inline-form-row">'
      + inlineField('이름', favoriteButton('customer', item.id, item.name || '고객', status + ' · ' + date) + '<input id="iwd-customer-name" value="' + esc(item.name || '') + '" aria-label="이름">')
      + inlineField('생년월일', '<div class="iw-birth-age">' + dateMaskInputHtml('iwd-customer-birth', profile.birth_date || '', 'customerDetail') + '<span id="iwd-customer-insurance-age">' + (age === '' ? '-' : age + '세') + '</span></div>')
      + '<div class="iw-gender" role="radiogroup" aria-label="성별"><label><input type="radio" name="iwd-customer-gender" value="남"' + (profile.gender === '남' ? ' checked' : '') + '>남</label><label><input type="radio" name="iwd-customer-gender" value="여"' + (profile.gender === '여' ? ' checked' : '') + '>여</label></div>'
      + '</div><div class="iw-inline-form-row">'
      + inlineField('전화번호', '<input id="iwd-customer-phone" inputmode="numeric" value="' + esc(phoneText(item.phone || item.phone_raw || '')) + '" oninput="OSInsuwork.formatConsultPhone(this)">')
      + inlineField('고객상태', '<select id="iwd-customer-status">' + (needsReview ? '<option value="" selected>상태를 선택하세요</option>' : '') + statuses.map(function (entry) { return '<option value="' + entry + '"' + (entry === status ? ' selected' : '') + '>' + entry + '</option>'; }).join('') + '</select>')
      + '</div></div>'
      + customerExtraFieldsHtml(profile, 'iwd-customer') + '<section><h3>고객내용</h3>' + richEditorField('iwd-customer-new', profile.note || '') + '<p class="iw-consult-editor-note">웹 주소를 붙여 넣으면 바로 열 수 있는 링크로 저장됩니다. 여러 파일을 한 번에 첨부할 수 있습니다.</p>' + customerExistingAttachments(item.id) + '</section><div class="iw-consult-save"><button type="button" class="iw-btn iw-consult-add-event" onclick="event.stopPropagation();OSInsuwork.addEventForCustomer(\'' + esc(item.id) + '\')">+ 일정 추가</button><button type="button" class="iw-btn danger" onclick="OSInsuwork.trashCustomer(\'' + esc(item.id) + '\')">삭제</button><button type="button" class="iw-btn" onclick="OSInsuwork.selectCustomerDetail()">닫기</button><button type="button" class="iw-btn primary" onclick="OSInsuwork.' + (needsReview ? 'saveLegacyCustomerStatus' : 'saveCustomerDetail') + '(\'' + esc(item.id) + '\')">' + (needsReview ? '고객상태 저장' : '저장') + '</button></div></article>';
  }
  function consultationStageCounts(rows, customers) {
    var counts = { all: rows.length }; CONSULT_STAGES.forEach(function (stage) { counts[stage.key] = 0; });
    rows.forEach(function (item) { var status = consultationStatus(item, customers[item.customer_id]); if (counts.hasOwnProperty(status)) counts[status]++; });
    return counts;
  }
  function consultationsHtml() {
    var customers = {}; state.data.customers.forEach(function (item) { customers[item.id] = item; });
    var configuredColumns = consultColumns(), gridStyle = '--iw-consult-template:' + consultGridTemplate(configuredColumns);
    var nameQ = searchNorm(state.consultNameQuery);
    var baseRows = state.data.consultations.filter(function (item) { var customer = customers[item.customer_id]; if (!customer) return false; if (nameQ && searchNorm((customer.name || '') + ' ' + (customer.phone || customer.phone_raw || '')).indexOf(nameQ) < 0) return false; return true; });
    var counts = consultationStageCounts(baseRows, customers);
    var rows = baseRows.filter(function (item) { var customer = customers[item.customer_id], profile = customerProfile(customer), status = consultationStatus(item, customer); return (state.consultationStatusFilter === 'all' || status === state.consultationStatusFilter) && matches((customer.name || '') + ' ' + (customer.phone || customer.phone_raw || '') + ' ' + (profile.birth_date || '') + ' ' + (item.memo || '') + ' ' + status); });
    var selected = rows.find(function (item) { return String(item.id) === String(state.selectedConsultation); });
    if (!selected && state.selectedConsultation) state.selectedConsultation = null;
    var totalRowCount = rows.length;
    if (selected && rows.indexOf(selected) >= state.consultationsRenderLimit) rows = [selected].concat(rows.filter(function (item) { return item !== selected; }).slice(0, state.consultationsRenderLimit - 1));
    else rows = rows.slice(0, state.consultationsRenderLimit);
    var columns = '<div class="iw-consult-columns" style="' + gridStyle + '">' + configuredColumns.map(function (column) { return '<span>' + esc(column.label) + '</span>'; }).join('') + '<button type="button" class="iw-consult-column-button" onclick="OSInsuwork.manageConsultColumns()">+ 컬럼</button></div>';
    var list = '<div class="iw-consult-list" role="list">' + columns + '<div class="iw-consult-rows">' + rows.map(function (item) {
      var customer = customers[item.customer_id] || {}, profile = customerProfile(customer), date = String(item.consulted_at || item.created_at || '').slice(0, 10), age = insuranceAge(profile.birth_date, date), status = consultationStatus(item, customer);
      return '<button type="button" role="listitem" class="iw-consult-row' + (String(item.id) === String(state.selectedConsultation) ? ' on' : '') + '" style="' + gridStyle + '" onclick="OSInsuwork.selectConsultation(\'' + esc(item.id) + '\')" onmouseenter="OSInsuwork.showRowHover(event)" onmouseleave="OSInsuwork.hideRowHover()" data-hover-text="' + esc(stripHtml(item.memo || '상담내용이 없습니다.')) + '">' + configuredColumns.map(function (column) { if (column.key === 'name') return '<strong>' + favoriteButton('consultation', item.id, customer.name || '고객 상담', status + ' · ' + date) + '<span>' + esc(customer.name || '(이름 없음)') + '</span></strong>'; return consultCell(column, item, customer, profile, date, age, status); }).join('') + '<span class="iw-consult-action-spacer" aria-hidden="true"></span></button>';
    }).join('') + (rows.length ? '' : '<div class="iw-empty">상담 기록이 없습니다.</div>') + '</div>' + loadMoreHtml(totalRowCount, rows.length, 'OSInsuwork.loadMoreConsultations()') + '</div>';
    var detail = selected ? consultationDetailHtml(selected, customers[selected.customer_id] || {}) : '';
    var stats = statFilterBarHtml({ kind: 'consult', stages: CONSULT_STAGES, activeStatus: state.consultationStatusFilter, counts: counts, nameQuery: state.consultNameQuery, nameInputId: 'iw-consult-name-input', namePlaceholder: '고객명·전화번호 검색', onStage: 'OSInsuwork.filterConsultationStatus', registerHtml: '<button class="iw-btn primary" onclick="OSInsuwork.addConsultation()">+ 상담 등록</button>' });
    return '<div class="iw-consult-screen">' + statusHtml() + '<div class="iw-toolbar"><h2>상담관리' + helpBadgeHtml('consultations') + '</h2></div>' + stats + favoritesFabHtml() + '<div class="iw-consult-layout' + (selected ? ' has-detail' : '') + '"><section class="iw-consult-master">' + list + '</section>' + detail + '</div></div>';
  }
  function manageConsultColumns() {
    var columns = consultColumns(), rows = columns.map(function (column, index) { return '<div class="iw-column-setting"><span>' + esc(column.label) + '</span><button type="button" onclick="OSInsuwork.moveConsultColumn(' + index + ',-1)"' + (index === 0 ? ' disabled' : '') + '>←</button><button type="button" onclick="OSInsuwork.moveConsultColumn(' + index + ',1)"' + (index === columns.length - 1 ? ' disabled' : '') + '>→</button>' + (column.custom ? '<button type="button" class="danger" onclick="OSInsuwork.deleteConsultColumn(\'' + esc(column.key) + '\')">삭제</button>' : '') + '</div>'; }).join('');
    dialog('<div class="iw-form"><h2>상담관리 컬럼</h2><p class="iw-column-help">화살표로 컬럼 위치를 옮길 수 있습니다. 추가 항목은 고객별로 입력해 저장합니다.</p><div class="iw-column-settings">' + rows + '</div><div class="iw-form-actions"><button type="button" class="iw-btn" onclick="OSInsuwork.closeDialog()">닫기</button><button type="button" class="iw-btn primary" onclick="OSInsuwork.addConsultColumn()">+ 컬럼 추가</button></div></div>');
  }
  function addConsultColumn() { briefingPrompt('추가할 컬럼 이름을 입력하세요.', '컬럼 추가').then(function (label) { if (!label || !String(label).trim()) return; var columns = consultColumns(); columns.push({ key: 'custom_' + Date.now().toString(36), label: String(label).trim().slice(0, 30), width: 120, custom: true }); saveConsultColumns(columns); closeDialog(); renderContent(); manageConsultColumns(); }); }
  function moveConsultColumn(index, direction) { var columns = consultColumns(), target = index + direction; if (target < 0 || target >= columns.length) return; var moved = columns.splice(index, 1)[0]; columns.splice(target, 0, moved); saveConsultColumns(columns); closeDialog(); renderContent(); manageConsultColumns(); }
  function deleteConsultColumn(key) { var columns = consultColumns(), column = columns.find(function (entry) { return entry.key === key && entry.custom; }); if (!column) return; briefingConfirm('“' + column.label + '” 컬럼을 목록에서 제거할까요? 기존 입력값은 보존됩니다.', '컬럼 삭제', '삭제', true).then(function (ok) { if (!ok) return; saveConsultColumns(columns.filter(function (entry) { return entry.key !== key; })); closeDialog(); renderContent(); manageConsultColumns(); }); }
  function consultationDetailHtml(item, customer) {
    var profile = customerProfile(customer), date = String(item.consulted_at || item.created_at || '').slice(0, 10), age = insuranceAge(profile.birth_date, date), status = consultationStatus(item, customer);
    var statuses = ['예약', '진행중', '제안서발송', '클로징', '청약완료', '보류', '종결'];
    return '<article class="iw-consult-detail"><button type="button" class="iw-consult-detail-close" onclick="OSInsuwork.selectConsultation()" aria-label="상담 상세 닫기">×</button><button type="button" class="iw-consult-back" onclick="OSInsuwork.selectConsultation()">‹ 목록</button>'
      + '<div class="iw-inline-form-block">'
      + '<div class="iw-inline-form-row">' + inlineField('등록일자', dateMaskInputHtml('iwd-consult-date', date, 'detail')) + '</div>'
      + '<div class="iw-inline-form-row">'
      + inlineField('이름', favoriteButton('consultation', item.id, customer.name || '고객 상담', status + ' · ' + date) + '<input id="iwd-consult-name" value="' + esc(customer.name || '') + '" aria-label="이름">')
      + inlineField('생년월일', '<div class="iw-birth-age">' + dateMaskInputHtml('iwd-consult-birth', profile.birth_date || '', 'detail') + '<span id="iwd-insurance-age">' + (age === '' ? '-' : age + '세') + '</span></div>')
      + '<div class="iw-gender" role="radiogroup" aria-label="성별"><label><input type="radio" name="iwd-consult-gender" value="남"' + (profile.gender === '남' ? ' checked' : '') + '>남</label><label><input type="radio" name="iwd-consult-gender" value="여"' + (profile.gender === '여' ? ' checked' : '') + '>여</label></div>'
      + '</div><div class="iw-inline-form-row">'
      + inlineField('전화번호', '<input id="iwd-consult-phone" inputmode="numeric" value="' + esc(phoneText(customer.phone || customer.phone_raw || '')) + '" oninput="OSInsuwork.formatConsultPhone(this)">')
      + inlineField('상담상태', '<select id="iwd-consult-status" onchange="OSInsuwork.consultationStatusChanged(this,\'detail\')">' + statuses.map(function (entry) { return '<option value="' + entry + '"' + (entry === status ? ' selected' : '') + '>' + entry + '</option>'; }).join('') + '</select>')
      + '</div></div>'
      + '<div class="iw-consult-care-fields"' + (status === '청약완료' ? '' : ' hidden') + ' id="iwd-consult-care-fields">' + customerExtraFieldsHtml(profile, 'iwd-consult-care') + '</div>' + '<section><h3>상담내용</h3>' + richEditorField('iwd-consult-new', item.memo || '') + '<p class="iw-consult-editor-note">웹 주소를 붙여 넣으면 바로 열 수 있는 링크로 저장됩니다. 여러 파일을 한 번에 첨부할 수 있습니다.</p>' + consultationExistingAttachments(item.id) + '</section><div class="iw-consult-save"><button type="button" class="iw-btn danger" onclick="OSInsuwork.deleteConsultation(\'' + esc(item.id) + '\')">상담 삭제</button><button type="button" class="iw-btn" onclick="OSInsuwork.selectConsultation()">닫기</button><button type="button" class="iw-btn primary" onclick="OSInsuwork.saveConsultationDetail(\'' + esc(item.id) + '\')">저장</button></div></article>';
  }

  function calendarTitle() {
    var selected = parseDate(state.selectedDate);
    if (state.calendarMode === 'day') return selected.getFullYear() + '년 ' + (selected.getMonth() + 1) + '월 ' + selected.getDate() + '일';
    if (state.calendarMode === 'week') { var start = new Date(selected); start.setDate(start.getDate() - start.getDay()); return (start.getMonth() + 1) + '월 ' + start.getDate() + '일 – ' + formatDate(addDays(start, 6)); }
    if (state.calendarMode === 'agenda') return '일정';
    return state.cursor.getFullYear() + '년 ' + (state.cursor.getMonth() + 1) + '월';
  }
  function isCareTask(event) { return !!event && event.legacy_source === 'care_auto'; }
  function eventPriority(event) { return event && event.event_type === 'holiday' ? 0 : event && event.event_type === 'term' ? 1 : event && event.event_type === 'memorial' ? 2 : event && event.event_type === 'insurance-age' ? 3 : isCareTask(event) ? 4 : 5; }
  function eventsFor(date) { return allEvents().filter(function (event) { var start = String(event.event_date || '').slice(0, 10); if (!start) return false; var end = String(event.event_end_date || event.event_date || '').slice(0, 10); return date >= start && date <= end; }).sort(function (a, b) { return eventPriority(a) - eventPriority(b) || String(a.event_time || '').localeCompare(String(b.event_time || '')) || String(a.title || '').localeCompare(String(b.title || ''), 'ko'); }); }
  function calendarEventKind(event) { return isCareTask(event) ? 'customer' : event && event.event_type === 'holiday' ? 'holiday' : event && event.event_type === 'term' ? 'term' : event && event.event_type === 'memorial' ? 'memorial' : event && event.event_type === 'insurance-age' ? 'insurance-age' : 'schedule'; }
  function calendarAllDay(event) { return !!(event && (event.builtin || !event.event_time || String(event.event_end_date || event.event_date || '').slice(0, 10) !== String(event.event_date || '').slice(0, 10))); }
  function builtinCalendarChip(event) {
    var action = event && event.event_type === 'insurance-age' && event.customer_id ? ' onclick="event.stopPropagation(); OSInsuwork.openCustomerFromEvent(\'' + esc(event.customer_id) + '\')"' : '';
    return '<i class="' + calendarEventKind(event) + '"' + action + '>' + esc(event.title) + '</i>';
  }
  function calendarSummaryPreview(events) {
    var titles = events.map(function (event) { return String(event.title || '일정').trim(); }).filter(Boolean);
    var shown = titles.slice(0, 8).map(function (title) { return '- ' + title; }).join('\n');
    return shown + (titles.length > 8 ? '\n외 ' + (titles.length - 8) + '건' : '');
  }
  function calendarSummaryAttrs(events) {
    return ' data-hover-text="' + esc(calendarSummaryPreview(events)) + '" onmouseenter="OSInsuwork.showRowHover(event)" onmouseleave="OSInsuwork.hideRowHover()"';
  }
  function insuranceAgeSummaryChip(events, date) {
    if (!events.length) return '';
    return '<i class="insurance-age insurance-age-more" role="button" tabindex="0" title="상령일 고객 전체 보기"' + calendarSummaryAttrs(events) + ' onclick="event.stopPropagation();OSInsuwork.openCalendarDay(\'' + esc(date) + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();OSInsuwork.openCalendarDay(\'' + esc(date) + '\')}">상령일 ' + events.length + '명</i>';
  }
  function careCalendarChip(event) {
    return '<i class="customer" onclick="event.stopPropagation();OSInsuwork.showEvent(\'' + esc(event.id) + '\')">' + esc(event.title || '케어 일정') + '</i>';
  }
  function careSummaryChip(events, date) {
    if (!events.length) return '';
    return '<i class="customer customer-more" role="button" tabindex="0" title="케어 일정 전체 보기"' + calendarSummaryAttrs(events) + ' onclick="event.stopPropagation();OSInsuwork.openCalendarDay(\'' + esc(date) + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();OSInsuwork.openCalendarDay(\'' + esc(date) + '\')}">케어 ' + events.length + '명</i>';
  }
  function scheduleCalendarChip(event) {
    return '<i class="schedule" onclick="event.stopPropagation();OSInsuwork.showEvent(\'' + esc(event.id) + '\')">' + esc(event.title || '일정') + '</i>';
  }
  function scheduleSummaryChip(events, date) {
    if (!events.length) return '';
    return '<i class="schedule schedule-more" role="button" tabindex="0" title="일정 전체 보기"' + calendarSummaryAttrs(events) + ' onclick="event.stopPropagation();OSInsuwork.openCalendarDay(\'' + esc(date) + '\')" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();OSInsuwork.openCalendarDay(\'' + esc(date) + '\')}">+' + events.length + '개 더보기</i>';
  }
  /* 2026-08-25 대표 확정 — 하루 안에서 공휴일/절기·케어·상령일·짧은(당일) 일정 4종을 각각 독립으로
     처리한다: 1개면 그대로, 2개 이상이면 요약(공휴일/절기는 한 줄로 이어붙이고, 나머지는 "+N개").
     예전엔 칩을 최대 2개로 잘라(chips.slice(0,2)) 세 번째 종류가 통째로 사라지는 버그가 있었다 —
     이제 종류마다 반드시 한 줄을 갖는다(장기간 일정은 아래 iw-cal-week-bars 막대로 별도 처리, 여기 포함 안 됨).
     여러 날에 걸친 장기 일정은 제외 대상이라 이 함수엔 안 들어온다(monthView()에서 s!==e만 spans로 분리). */
  function monthCalendarChips(events, date) {
    var builtIns = events.filter(function (event) { return event.builtin; });
    var insuranceAgeEvents = builtIns.filter(function (event) { return event.event_type === 'insurance-age'; });
    var otherBuiltIns = builtIns.filter(function (event) { return event.event_type !== 'insurance-age'; });
    var careEvents = events.filter(isCareTask);
    var shortEvents = events.filter(function (event) {
      if (event.builtin || isCareTask(event)) return false;
      var s = String(event.event_date || '').slice(0, 10), e = String(event.event_end_date || event.event_date || '').slice(0, 10);
      return s === e;
    });
    var chips = [];
    if (otherBuiltIns.length === 1) chips.push(builtinCalendarChip(otherBuiltIns[0]));
    else if (otherBuiltIns.length > 1) chips.push('<i class="' + calendarEventKind(otherBuiltIns[0]) + '">' + otherBuiltIns.map(function (event) { return esc(event.title); }).join(', ') + '</i>');
    if (careEvents.length === 1) chips.push(careCalendarChip(careEvents[0]));
    else if (careEvents.length > 1) chips.push(careSummaryChip(careEvents, date));
    if (insuranceAgeEvents.length === 1) chips.push(builtinCalendarChip(insuranceAgeEvents[0]));
    else if (insuranceAgeEvents.length > 1) chips.push(insuranceAgeSummaryChip(insuranceAgeEvents, date));
    if (shortEvents.length === 1) chips.push(scheduleCalendarChip(shortEvents[0]));
    else if (shortEvents.length > 1) chips.push(scheduleSummaryChip(shortEvents, date));
    return chips.join('');
  }
  function calendarSpanBars(days, events, maxLanes) {
    var rangeStart = days[0], rangeEnd = days[days.length - 1], seen = {}, spans = [];
    events.forEach(function (event) {
      if (seen[event.id]) return; seen[event.id] = true;
      var s = String(event.event_date || '').slice(0, 10), e = String(event.event_end_date || event.event_date || '').slice(0, 10);
      if (!s || e < rangeStart || s > rangeEnd) return;
      spans.push({ event: event, start: s < rangeStart ? rangeStart : s, end: e > rangeEnd ? rangeEnd : e });
    });
    spans.sort(function (a, b) { return a.start.localeCompare(b.start) || b.end.localeCompare(a.end) || eventPriority(a.event) - eventPriority(b.event); });
    var laneLastEnd = [];
    spans.forEach(function (sp) { var lane = 0; while (lane < laneLastEnd.length && laneLastEnd[lane] >= sp.start) lane++; sp.lane = lane; laneLastEnd[lane] = sp.end; });
    return { spans: spans.filter(function (sp) { return sp.lane < maxLanes; }), laneCount: Math.min(maxLanes, laneLastEnd.length) };
  }
  function monthView() {
    var first = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), 1), start = new Date(first); start.setDate(1 - first.getDay());
    var today = ymd(new Date()), days = [];
    for (var i = 0; i < 42; i++) { var day = new Date(start); day.setDate(start.getDate() + i); days.push(ymd(day)); }
    var gridStart = days[0], gridEnd = days[41];
    var seen = {}, spans = [];
    /* 2026-08-25 대표 확정 — 여러 날에 걸친 장기 일정(s!==e)만 막대(span)로 취급해 항상 그대로 다
       보인다. 당일 하루짜리 일정(s===e)은 여기 넣지 않고 monthCalendarChips()에서 하루 단위로
       세어 1개=그대로, 2개 이상="+N개 더보기"로 처리한다(위 함수 참고). */
    days.forEach(function (key) {
      eventsFor(key).forEach(function (event) {
        if (event.builtin || isCareTask(event) || seen[event.id]) return;
        var s = String(event.event_date || '').slice(0, 10), e = String(event.event_end_date || event.event_date || '').slice(0, 10);
        if (s === e) return;
        seen[event.id] = true;
        spans.push({ event: event, start: s < gridStart ? gridStart : s, end: e > gridEnd ? gridEnd : e });
      });
    });
    spans.sort(function (a, b) { return a.start.localeCompare(b.start) || eventPriority(a.event) - eventPriority(b.event) || b.end.localeCompare(a.end) || String(a.event.title || '').localeCompare(String(b.event.title || ''), 'ko'); });
    var laneLastEnd = [];
    spans.forEach(function (sp) { var lane = 0; while (lane < laneLastEnd.length && laneLastEnd[lane] >= sp.start) lane++; sp.lane = lane; laneLastEnd[lane] = sp.end; });
    var weeks = [];
    for (var w = 0; w < 6; w++) {
      var weekDays = days.slice(w * 7, w * 7 + 7), weekStart = weekDays[0], weekEnd = weekDays[6];
      // 장기 일정 막대는 상한 없이 전부 렌더한다(항상 그대로 다 보이기, 2026-08-25 대표 확정).
      var weekSpans = spans.filter(function (sp) { return sp.end >= weekStart && sp.start <= weekEnd; });
      var laneCount = weekSpans.reduce(function (m, sp) { return Math.max(m, sp.lane + 1); }, 0);
      var cells = weekDays.map(function (key) {
        var d = parseDate(key), events = eventsFor(key), outside = d.getMonth() !== first.getMonth();
        return '<button type="button" class="iw-day ' + (outside ? 'out ' : '') + (key === today ? 'today ' : '') + (key === state.selectedDate ? 'selected' : '') + '" data-date="' + key + '" onclick="OSInsuwork.openDayCreate(\'' + key + '\')" aria-label="' + esc((d.getMonth() + 1) + '월 ' + d.getDate() + '일, 일정 ' + events.length + '개') + '"><span class="iw-day-head"><strong>' + d.getDate() + '</strong><span class="iw-built-ins">' + monthCalendarChips(events, key) + '</span></span><span class="iw-day-lane-spacer" style="height:' + (laneCount * 24) + 'px"></span></button>';
      }).join('');
      var bars = weekSpans.map(function (sp) {
        var barStart = sp.start < weekStart ? weekStart : sp.start, barEnd = sp.end > weekEnd ? weekEnd : sp.end;
        var startIdx = weekDays.indexOf(barStart), endIdx = weekDays.indexOf(barEnd);
        var left = 'calc(' + (startIdx / 7 * 100) + '% + 3px)', width = 'calc(' + ((endIdx - startIdx + 1) / 7 * 100) + '% - 6px)';
        return '<span class="iw-event-bar ' + calendarEventKind(sp.event) + '" data-lane="' + sp.lane + '" data-start="' + barStart + '" data-end="' + barEnd + '" style="left:' + left + ';width:' + width + ';top:' + (sp.lane * 24) + 'px" role="button" tabindex="0" onclick="event.stopPropagation();OSInsuwork.showEvent(\'' + esc(sp.event.id) + '\')" onkeydown="if(event.key===\'Enter\'){event.stopPropagation();OSInsuwork.showEvent(\'' + esc(sp.event.id) + '\')}">' + esc(sp.event.title || '일정') + '</span>';
      }).join('');
      weeks.push('<div class="iw-cal-week"><div class="iw-cal-week-cells">' + cells + '</div><div class="iw-cal-week-bars" style="height:' + (laneCount * 24) + 'px">' + bars + '</div></div>');
    }
    return '<section class="iw-calendar-month"><div class="iw-cal"><div class="iw-cal-head">' + ['일', '월', '화', '수', '목', '금', '토'].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div><div class="iw-cal-grid">' + weeks.join('') + '</div></div></section>';
  }
  function timeView(days) {
    var hours = []; for (var h = 8; h <= 20; h++) hours.push(h);
    var allDayEvents = [], timedByDate = {};
    days.forEach(function (date) { timedByDate[date] = []; eventsFor(date).forEach(function (event) { if (calendarAllDay(event)) allDayEvents.push(event); else timedByDate[date].push(event); }); });
    var allDay = calendarSpanBars(days, allDayEvents, 999);
    var bars = allDay.spans.map(function (sp) {
      var startIdx = days.indexOf(sp.start), endIdx = days.indexOf(sp.end);
      var left = 'calc(' + (startIdx / days.length * 100) + '% + 4px)', width = 'calc(' + ((endIdx - startIdx + 1) / days.length * 100) + '% - 8px)';
      return '<button type="button" class="iw-time-bar ' + calendarEventKind(sp.event) + '" style="left:' + left + ';width:' + width + ';top:' + (sp.lane * 28) + 'px" onclick="OSInsuwork.showEvent(\'' + esc(sp.event.id) + '\')"><small>' + esc(String(sp.event.event_time || '종일').slice(0, 5)) + '</small><b>' + esc(eventTitleLabel(sp.event)) + '</b></button>';
    }).join('');
    var allDayRow = '<div class="iw-time-all-day" style="min-height:' + Math.max(42, allDay.laneCount * 28 + 10) + 'px"><span>종일</span><div class="iw-time-all-grid">' + days.map(function () { return '<i></i>'; }).join('') + '<div class="iw-time-bars">' + bars + '</div></div></div>';
    return '<div class="iw-time" style="--iw-days:' + days.length + '"><div class="iw-time-head"><span>GMT+09</span>' + days.map(function (date) { return '<button class="' + (date === ymd(new Date()) ? 'today' : '') + '" onclick="OSInsuwork.selectDate(\'' + date + '\')"><small>' + weekday(date) + '</small><strong>' + Number(date.slice(8)) + '</strong></button>'; }).join('') + '</div>' + allDayRow + '<div class="iw-time-body"><div class="iw-hours">' + hours.map(function (hour) { return '<span>' + (hour < 12 ? '오전 ' + hour : hour === 12 ? '오후 12' : '오후 ' + (hour - 12)) + '시</span>'; }).join('') + '</div>' + days.map(function (date) { return '<div class="iw-time-day">' + hours.map(function () { return '<i></i>'; }).join('') + '<div class="iw-time-events">' + timedByDate[date].map(function (event) { return '<button class="' + calendarEventKind(event) + '" onclick="OSInsuwork.showEvent(\'' + esc(event.id) + '\')"><small>' + esc(String(event.event_time || '').slice(0, 5)) + '</small><b>' + esc(eventTitleLabel(event)) + '</b></button>'; }).join('') + '</div></div>'; }).join('') + '</div></div>';
  }
  function agendaView() {
    var start = state.selectedDate, end = addDays(start, 365);
    var rows = allEvents().filter(function (event) { var date = String(event.event_date || '').slice(0, 10); return date >= start && date <= end; }).sort(function (a, b) { return String(a.event_date).localeCompare(String(b.event_date)) || String(a.event_time || '').localeCompare(String(b.event_time || '')); });
    /* 2026-08-25 대표 확정 — 같은 날짜 일정을 날짜별로 한 번만 묶어서 보여주고, 종류별 4개 컬럼
       (공휴일·절기·기념일 | 일정 | 케어 | 상령일)으로 나눠 나란히 배치. 일/주/월 화면과 같은
       calendarEventKind() 색상 클래스(.iw-agenda-chip.<kind>)를 그대로 재사용해 색을 통일한다.
       열 너비는 4등분이 아니라 내용 길이 기준으로 배분(일정만 사용자 자유 입력이라 더 길어질 수
       있어 1.6fr, 나머지 3개는 정형화된 짧은 문구라 1fr) — css/insuwork.css .iw-agenda-cols 참고. */
    var groups = [], byDate = {};
    rows.forEach(function (event) {
      var date = String(event.event_date).slice(0, 10);
      if (!byDate[date]) { byDate[date] = { date: date, cols: [[], [], [], []] }; groups.push(byDate[date]); }
      var kind = calendarEventKind(event);
      var colIndex = (kind === 'holiday' || kind === 'term' || kind === 'memorial') ? 0 : kind === 'customer' ? 2 : kind === 'insurance-age' ? 3 : 1;
      byDate[date].cols[colIndex].push(event);
    });
    var header = '<div class="iw-agenda-header"><span></span><div class="iw-agenda-cols"><span>공휴일·절기·기념일</span><span>일정</span><span>케어</span><span>상령일</span></div></div>';
    var body = groups.length ? groups.map(agendaGroupHtml).join('') : '<div class="iw-empty">예정된 일정이 없습니다.</div>';
    return '<div class="iw-agenda">' + (groups.length ? header : '') + body + '</div>';
  }
  function agendaEventChip(event) {
    return '<button type="button" class="iw-agenda-chip ' + calendarEventKind(event) + '" onclick="OSInsuwork.showEvent(\'' + esc(event.id) + '\')"><small>' + esc(String(event.event_time || '종일').slice(0, 5)) + '</small><b>' + esc(eventTitleLabel(event)) + '</b></button>';
  }
  function agendaGroupHtml(group) {
    var date = group.date;
    var cols = group.cols.map(function (col) { return '<div class="iw-agenda-col">' + col.map(agendaEventChip).join('') + '</div>'; }).join('');
    return '<div class="iw-agenda-row"><time><strong>' + Number(date.slice(8)) + '</strong><span>' + Number(date.slice(5, 7)) + '월 · ' + weekday(date) + '</span></time><div class="iw-agenda-cols">' + cols + '</div></div>';
  }
  function calendarHtml() {
    var modes = [['day', '일'], ['week', '주'], ['month', '월'], ['agenda', '일정']];
    var view = '';
    if (state.calendarMode === 'month') view = monthView();
    else if (state.calendarMode === 'agenda') view = agendaView();
    else if (state.calendarMode === 'day') view = timeView([state.selectedDate]);
    else { var selected = parseDate(state.selectedDate); selected.setDate(selected.getDate() - selected.getDay()); var week = []; for (var i = 0; i < 7; i++) week.push(addDays(selected, i)); view = timeView(week); }
    return statusHtml() + '<div class="iw-calendar-shell"><div class="iw-calendar-toolbar"><div class="iw-calendar-left"><button class="iw-btn iw-today" onclick="OSInsuwork.calendarToday()">오늘</button><span class="iw-month-switcher"><button type="button" aria-label="이전 보기" onclick="OSInsuwork.moveCalendar(-1)">‹</button><button type="button" aria-label="다음 보기" onclick="OSInsuwork.moveCalendar(1)">›</button></span><h2>' + calendarTitle() + helpBadgeHtml('calendar') + '</h2></div><div class="iw-actions iw-mode">' + modes.map(function (mode) { return '<button class="iw-btn ' + (state.calendarMode === mode[0] ? 'on' : '') + '" onclick="OSInsuwork.setCalendarMode(\'' + mode[0] + '\')">' + mode[1] + '</button>'; }).join('') + '<button class="iw-btn primary" onclick="OSInsuwork.addEvent()">+ 일정</button></div></div>' + view + '</div>';
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
    return '<div class="iw-script-attachments">' + list.map(function (a) { return '<img src="' + esc(a.url) + '" alt="' + esc(a.name || '첨부 이미지') + '" loading="lazy">'; }).join('') + '</div>';
  }
  function scriptAccordionHtml(sections, attachments) {
    return sections.map(function (sec, i) {
      var open = i === 0 ? ' open' : '';
      return '<div class="iw-script-acc' + open + '"><button type="button" class="iw-script-acc-head" onclick="OSInsuwork.toggleScriptSection(this)"><span class="iw-script-acc-num">' + (i + 1) + '</span><span class="iw-script-acc-ttl">' + esc(sec.title) + '</span><span class="iw-script-acc-arrow">▾</span></button><div class="iw-script-acc-body">'
        + (sec.subtitle ? '<div class="iw-script-acc-sub">' + esc(sec.subtitle) + '</div>' : '')
        + (sec.mainHtml ? '<div class="iw-script-acc-main">' + sec.mainHtml + '</div>' : '')
        + (sec.sub ? '<div class="iw-script-acc-sub2">' + sec.sub + '</div>' : '')
        + (sec.coach ? '<div class="iw-script-acc-coach">⚡ ' + esc(sec.coach) + '</div>' : '')
        + (i === 0 ? scriptAttachmentsHtml(attachments) : '')
        + '</div></div>';
    }).join('');
  }
  function scriptsHtml() {
    if (!state.scriptsData && !state.scriptsLoading) loadScriptsData();
    var chips = '<div class="iw-script-chips">' + SCRIPT_STAGES.map(function (g) {
      var on = g.stage === state.scriptsStage;
      return '<button type="button" class="iw-script-chip' + (on ? ' on' : '') + '" style="--sc:' + SCRIPT_GROUP_COLORS[g.group] + '" onclick="OSInsuwork.filterScriptsStage(\'' + g.stage + '\')">' + esc(g.label) + '</button>';
    }).join('') + '</div>';
    if (state.scriptsLoading || !state.scriptsData) {
      return '<div class="iw-toolbar"><h2>스크립트</h2></div>' + chips + '<div class="iw-empty">불러오는 중입니다…</div>';
    }
    var rows = state.scriptsData.filter(function (s) { return s.stage === state.scriptsStage; });
    var groupColor = SCRIPT_GROUP_COLORS[scriptStageGroup(state.scriptsStage)];
    var cards = rows.length ? rows.map(function (s) {
      var sections = parseScriptSections(s.script_text);
      var isEmpty = !sections || !sections.length;
      var openCls = String(s.id) === String(state.scriptsOpenId) ? ' open' : '';
      return '<div class="iw-script-card' + openCls + '" style="--sc:' + groupColor + '"><button type="button" class="iw-script-card-head" onclick="OSInsuwork.toggleScriptCard(\'' + esc(s.id) + '\')"><span class="iw-script-card-badge">' + esc(scriptStageLabel(s.stage)) + '</span><strong>' + esc(s.title || '제목 없음') + '</strong>'
        + (isEmpty ? '<span class="iw-script-card-summary">본문 준비 중입니다.</span>' : '<span class="iw-script-card-summary">' + esc(scriptCardSummary(sections, s.highlight_text)) + '</span>') + '</button>'
        + (!isEmpty ? '<div class="iw-script-card-full">' + scriptAccordionHtml(sections, s.attachments) + '</div>' : '') + '</div>';
    }).join('') : '<div class="iw-empty">해당 분류의 스크립트가 아직 없습니다.</div>';
    return '<div class="iw-toolbar"><h2>스크립트</h2></div>' + chips + '<div class="iw-script-grid">' + cards + '</div>';
  }
  function filterScriptsStage(stage) { state.scriptsStage = stage; state.scriptsOpenId = null; renderContent(); }
  function toggleScriptCard(id) { state.scriptsOpenId = String(state.scriptsOpenId) === String(id) ? null : id; renderContent(); }
  function toggleScriptSection(btn) { var item = btn.closest('.iw-script-acc'); if (item) item.classList.toggle('open'); }
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
    return '<button type="button" class="iw-news-card" onclick="OSInsuwork.openNewsletter(\'' + esc(row.id) + '\')"><div class="iw-news-thumb"><img data-storage-path="thumbs/' + esc(row.id) + '.jpg" alt="' + esc(company + ' ' + label) + '" loading="lazy"><div class="iw-news-overlay"><strong>' + esc(label) + '</strong><span>' + esc(company) + '</span></div></div></button>';
  }
  function newsPoolTabsHtml() {
    return '<div class="iw-nl-pool">' + [['all', '전체'], ['nonlife', '손해'], ['life', '생명']].map(function (p) {
      return '<button type="button" class="' + (state.newsPool === p[0] ? 'on' : '') + '" onclick="OSInsuwork.filterNewsPool(\'' + p[0] + '\')">' + p[1] + '</button>';
    }).join('') + '</div>';
  }
  function newsSidebarHtml() {
    var groups = state.newsPool === 'all' ? [['손해보험', 'nonlife'], ['생명보험', 'life']] : state.newsPool === 'nonlife' ? [['손해보험', 'nonlife']] : [['생명보험', 'life']];
    var stats = newsCompanyStats().filter(function (c) { return newsQueryHit(c.name); });
    var html = '';
    groups.forEach(function (g) {
      var arr = stats.filter(function (c) { return c.sec === g[1]; });
      if (!arr.length) return;
      html += '<div class="iw-nl-grouplabel">' + esc(g[0]) + '</div>';
      html += arr.map(function (c) {
        var on = state.newsScope === 'co' && state.newsCoSel === c.name;
        return '<button type="button" class="iw-nl-co' + (on ? ' on' : '') + '" style="--cl:' + (c.sec === 'life' ? 'var(--t-uw)' : 'var(--warn)') + '" onclick="OSInsuwork.selectNewsCompany(\'' + esc(jsString(c.name)) + '\')"><span class="dot"></span><span class="nm">' + esc(c.name) + '</span><span class="cnt">' + c.count + '</span></button>';
      }).join('');
    });
    return html || '<div class="iw-empty">검색 결과 없음</div>';
  }
  function newsScopeTabsHtml() {
    return '<div class="iw-nl-scope">' + [['all', '전체 조망'], ['co', '회사별']].map(function (s) {
      return '<button type="button" class="' + (state.newsScope === s[0] ? 'on' : '') + '" onclick="OSInsuwork.setNewsScope(\'' + s[0] + '\')">' + s[1] + '</button>';
    }).join('') + '</div><span class="iw-nl-hint">' + (state.newsScope === 'all' ? '회사를 클릭하면 발행월별 소식지로' : '좌측에서 다른 회사를 고를 수 있어요') + '</span>';
  }
  function newsCountHtml() {
    var cos = newsPoolCompanies();
    var total = cos.reduce(function (a, c) { return a + c.count; }, 0);
    return '<div class="iw-nl-cnt">회사 <b>' + cos.length + '곳</b> · 소식지 <b>' + total + '건</b></div>';
  }
  function newsPoolFilteredRows() {
    var wanted = {};
    newsPoolCompanies().forEach(function (c) { wanted[c.name] = true; });
    return (state.newsData || []).filter(function (r) { return wanted[String(r.company || '').trim() || '(회사 미상)']; });
  }
  function sortNewsletterRows(rows) {
    return rows.sort(function (a, b) {
      var sa = newsSecOf(a.company || ''), sb = newsSecOf(b.company || '');
      if (sa !== sb) return sa === 'nonlife' ? -1 : 1;
      return String(a.company || '').localeCompare(String(b.company || ''), 'ko-KR');
    });
  }
  function newsAllViewHtml() {
    var rows = newsPoolFilteredRows();
    if (!rows.length) return '<div class="iw-empty">소식지가 없습니다.</div>';
    var monthMap = {}, order = [];
    rows.forEach(function (r) {
      var y = Number(r.publish_year), m = Number(r.publish_month);
      var key = (y && m) ? (y + '|' + m) : 'unknown';
      if (!monthMap[key]) { monthMap[key] = { y: y, m: m, items: [] }; order.push(key); }
      monthMap[key].items.push(r);
    });
    Object.keys(monthMap).forEach(function (key) { sortNewsletterRows(monthMap[key].items); });
    order.sort(function (a, b) { if (a === 'unknown') return 1; if (b === 'unknown') return -1; return (monthMap[b].y * 12 + monthMap[b].m) - (monthMap[a].y * 12 + monthMap[a].m); });
    var now = new Date(), curKey = now.getFullYear() + '|' + (now.getMonth() + 1);
    var first = order[0], g0 = monthMap[first];
    var t0 = first === 'unknown' ? '발행월 미상' : (g0.y + '년 ' + g0.m + '월');
    var hk = first === curKey ? ('이번 달 · 새 소식지 ' + g0.items.length + '건') : ('최신 발행 · ' + g0.items.length + '건');
    var html = '<div class="iw-nl-hero"><div class="iw-nl-hero-hd"><h3>' + esc(t0) + '</h3><span class="k">' + esc(hk) + '</span></div><div class="iw-news-grid">' + g0.items.map(newsletterCardHtml).join('') + '</div></div>';
    if (order.length > 1) {
      html += '<div class="iw-nl-past"><div class="iw-nl-past-hd">이전 발행월 · 클릭하면 펼쳐집니다</div>';
      for (var i = 1; i < order.length; i++) {
        var key = order[i], g = monthMap[key];
        var title = key === 'unknown' ? '발행월 미상' : (g.y + '년 ' + g.m + '월');
        var open = !!state.newsOpenMonths[key];
        html += '<button type="button" class="iw-nl-mrow' + (open ? ' open' : '') + '" onclick="OSInsuwork.toggleNewsMonth(\'' + esc(key) + '\')"><span class="t">' + esc(title) + '</span><span class="badge">' + g.items.length + '건</span><span class="chev">›</span></button>';
        if (open) html += '<div class="iw-nl-mbody open"><div class="iw-news-grid">' + g.items.map(newsletterCardHtml).join('') + '</div></div>';
      }
      html += '</div>';
    }
    return html;
  }
  function newsCoViewHtml() {
    var companies = newsPoolCompanies();
    var sel = (state.newsCoSel && companies.some(function (c) { return c.name === state.newsCoSel; })) ? state.newsCoSel : (companies[0] && companies[0].name);
    if (!sel) return '<div class="iw-empty">회사가 없습니다.</div>';
    state.newsCoSel = sel;
    var rows = (state.newsData || []).filter(function (r) { return (String(r.company || '').trim() || '(회사 미상)') === sel; })
      .slice().sort(function (a, b) { return (Number(b.publish_year) * 12 + Number(b.publish_month || 0)) - (Number(a.publish_year) * 12 + Number(a.publish_month || 0)); });
    var sec = newsSecOf(sel), secLb = sec === 'life' ? '생명보험' : '손해보험';
    var latest = rows[0] ? (rows[0].publish_year + '.' + ('0' + rows[0].publish_month).slice(-2)) : '-';
    var avatar = esc(sel.replace(/\s+/g, '').slice(0, 2));
    var head = '<div class="iw-nl-cohead"><span class="iw-nl-avatar ' + (sec === 'life' ? 'l' : 's') + '">' + avatar + '</span><div class="info"><h3>' + esc(sel) + '</h3><div class="sub">' + secLb + ' · 최근 발행 ' + esc(latest) + '</div></div><span class="tot">총 <b>' + rows.length + '</b>건</span></div>';
    var grid = rows.length ? '<div class="iw-news-grid">' + rows.map(newsletterCardHtml).join('') + '</div>' : '<div class="iw-empty">소식지가 없습니다.</div>';
    return head + grid;
  }
  function newsletterMissingCompaniesHtml() {
    var now = new Date(), year = now.getFullYear(), month = now.getMonth() + 1;
    var prev = new Date(year, month - 2, 1), py = prev.getFullYear(), pm = prev.getMonth() + 1;
    var current = {}, baseline = {};
    (state.newsData || []).forEach(function (r) {
      var name = String(r.company || '').trim(); if (!name) return;
      if (Number(r.publish_year) === year && Number(r.publish_month) === month) current[name] = true;
      if (Number(r.publish_year) === py && Number(r.publish_month) === pm) baseline[name] = true;
    });
    if (!Object.keys(current).length || !Object.keys(baseline).length) return '';
    var missing = Object.keys(baseline).filter(function (name) { return !current[name]; }).sort(function (a, b) { return a.localeCompare(b, 'ko-KR'); });
    if (!missing.length) return '';
    return '<div class="iw-nl-missing"><span>' + month + '월 미확인</span><div>' + missing.map(function (name) { return '<b>' + esc(name) + '</b>'; }).join('') + '</div></div>';
  }
  function newslettersHtml() {
    if (!state.newsData && !state.newsLoading) loadNewsletterData();
    if (state.newsLoading || !state.newsData) {
      return '<div class="iw-toolbar"><h2>소식지</h2></div><div class="iw-empty">불러오는 중입니다…</div>';
    }
    var sidebar = '<aside class="iw-nl-side">' + newsPoolTabsHtml() + '<div class="iw-nl-search"><input id="iw-newsCo-name-input" type="text" placeholder="회사 검색" autocomplete="off" value="' + esc(state.newsCoNameQuery || '') + '"></div><div class="iw-nl-colist">' + newsSidebarHtml() + '</div></aside>';
    var main = '<div class="iw-nl-main"><div class="iw-nl-ctrl">' + newsScopeTabsHtml() + '</div>' + newsCountHtml() + (state.newsScope === 'all' ? newsAllViewHtml() : newsCoViewHtml()) + '</div>';
    return '<div class="iw-toolbar"><h2>소식지</h2></div>' + newsletterMissingCompaniesHtml() + '<div class="iw-nl-layout">' + sidebar + main + '</div>';
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
    document.querySelectorAll('#v-insuwork .iw-news-thumb img[data-storage-path]').forEach(function (img) {
      var path = img.getAttribute('data-storage-path'); if (!path) return;
      img.src = newslettersPublicUrl(path);
    });
  }
  function openNewsletter(id) {
    var row = (state.newsData || []).find(function (r) { return String(r.id) === String(id); }); if (!row) return;
    var name = (row.source_filename || (row.company || '소식지') + '_' + newsMonthLabel(row)) + '.pdf';
    var pdfUrl = String(row.source_pdf_url || '').trim();
    var ready = pdfUrl ? Promise.resolve(pdfUrl) : (row.source_path ? Promise.resolve(newslettersPublicUrl(row.source_path)) : Promise.reject(new Error('열람 가능한 파일이 없습니다.')));
    ready.then(function (url) { openPreviewUrl(url, name, 'application/pdf', { source: 'newsletter', id: id }); }).catch(saveError);
  }
  function loadStrategyData() {
    if (state.strategyData || state.strategyLoading) return;
    state.strategyLoading = true;
    api('sales_strategy?status=eq.published&select=id,company,insurance_type,publish_year,publish_month,category,title,source_file_url,source_path,preview_pdf_path,source_filename&order=publish_year.desc.nullslast,publish_month.desc.nullslast&limit=2000').then(function (rows) {
      state.strategyData = rows || []; state.strategyLoading = false;
      if (state.section === 'sales-strategy') renderContent();
    }).catch(function () { state.strategyLoading = false; state.strategyData = []; if (state.section === 'sales-strategy') renderContent(); });
  }
  function strategyCompanyStats() {
    var map = {};
    (state.strategyData || []).forEach(function (r) {
      var name = String(r.company || '').trim() || '(회사 미상)';
      if (!map[name]) map[name] = { name: name, sec: newsSecOf(r.insurance_type || name), count: 0 };
      map[name].count++;
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return a.name.localeCompare(b.name, 'ko-KR'); });
  }
  function strategyQueryHit(name) {
    var q = (state.strategyCoNameQuery || '').trim().toLowerCase();
    return !q || String(name).toLowerCase().indexOf(q) >= 0;
  }
  function strategyPoolCompanies() {
    var list = strategyCompanyStats().filter(function (c) { return strategyQueryHit(c.name); });
    if (state.strategyPool !== 'all') list = list.filter(function (c) { return c.sec === state.strategyPool; });
    return list;
  }
  function strategyRowsForPool() {
    var wanted = {};
    strategyPoolCompanies().forEach(function (c) { wanted[c.name] = true; });
    return (state.strategyData || []).filter(function (r) { return wanted[String(r.company || '').trim() || '(회사 미상)']; });
  }
  function strategyLabel(row) {
    return row.title || row.source_filename || '영업방향';
  }
  function strategyCardHtml(row) {
    var label = newsMonthLabel(row), company = row.company || '회사 미상', title = strategyLabel(row);
    return '<button type="button" class="iw-news-card" onclick="OSInsuwork.openStrategy(\'' + esc(row.id) + '\')"><div class="iw-news-thumb"><img data-strategy-thumb="thumbs/' + esc(row.id) + '.jpg" alt="' + esc(company + ' ' + label + ' ' + title) + '" loading="lazy"><div class="iw-news-overlay"><strong>' + esc(label) + '</strong><span>' + esc(company) + '</span></div></div></button>';
  }
  function strategyPoolTabsHtml() {
    return '<div class="iw-nl-pool">' + [['all', '전체'], ['nonlife', '손해'], ['life', '생명']].map(function (p) {
      return '<button type="button" class="' + (state.strategyPool === p[0] ? 'on' : '') + '" onclick="OSInsuwork.filterStrategyPool(\'' + p[0] + '\')">' + p[1] + '</button>';
    }).join('') + '</div>';
  }
  function strategySidebarHtml() {
    var groups = state.strategyPool === 'all' ? [['손해보험', 'nonlife'], ['생명보험', 'life']] : state.strategyPool === 'nonlife' ? [['손해보험', 'nonlife']] : [['생명보험', 'life']];
    var stats = strategyCompanyStats().filter(function (c) { return strategyQueryHit(c.name); });
    var html = '';
    groups.forEach(function (g) {
      var arr = stats.filter(function (c) { return c.sec === g[1]; });
      if (!arr.length) return;
      html += '<div class="iw-nl-grouplabel">' + esc(g[0]) + '</div>';
      html += arr.map(function (c) {
        var on = state.strategyScope === 'co' && state.strategyCoSel === c.name;
        return '<button type="button" class="iw-nl-co' + (on ? ' on' : '') + '" style="--cl:' + (c.sec === 'life' ? 'var(--t-uw)' : 'var(--warn)') + '" onclick="OSInsuwork.selectStrategyCompany(\'' + esc(jsString(c.name)) + '\')"><span class="dot"></span><span class="nm">' + esc(c.name) + '</span><span class="cnt">' + c.count + '</span></button>';
      }).join('');
    });
    return html || '<div class="iw-empty">검색 결과 없음</div>';
  }
  function strategyScopeTabsHtml() {
    return '<div class="iw-nl-scope">' + [['all', '전체 조망'], ['co', '회사별']].map(function (s) {
      return '<button type="button" class="' + (state.strategyScope === s[0] ? 'on' : '') + '" onclick="OSInsuwork.setStrategyScope(\'' + s[0] + '\')">' + s[1] + '</button>';
    }).join('') + '</div><span class="iw-nl-hint">' + (state.strategyScope === 'all' ? '회사를 클릭하면 발행월별 영업자료로' : '좌측에서 다른 회사를 고를 수 있어요') + '</span>';
  }
  function strategyCountHtml() {
    var cos = strategyPoolCompanies();
    var total = cos.reduce(function (a, c) { return a + c.count; }, 0);
    return '<div class="iw-nl-cnt">회사 <b>' + cos.length + '곳</b> · 영업자료 <b>' + total + '건</b></div>';
  }
  function strategyAllViewHtml() {
    var rows = strategyRowsForPool();
    if (!rows.length) return '<div class="iw-empty">영업방향 자료가 없습니다.</div>';
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
    var hk = first === curKey ? ('이번 달 · 새 영업자료 ' + g0.items.length + '건') : ('최신 발행 · ' + g0.items.length + '건');
    var html = '<div class="iw-nl-hero"><div class="iw-nl-hero-hd"><h3>' + esc(t0) + '</h3><span class="k">' + esc(hk) + '</span></div><div class="iw-news-grid">' + g0.items.map(strategyCardHtml).join('') + '</div></div>';
    if (order.length > 1) {
      html += '<div class="iw-nl-past"><div class="iw-nl-past-hd">이전 발행월 · 클릭하면 펼쳐집니다</div>';
      for (var i = 1; i < order.length; i++) {
        var key = order[i], g = monthMap[key];
        var title = key === 'unknown' ? '발행월 미상' : (g.y + '년 ' + g.m + '월');
        var open = !!state.strategyOpenMonths[key];
        html += '<button type="button" class="iw-nl-mrow' + (open ? ' open' : '') + '" onclick="OSInsuwork.toggleStrategyMonth(\'' + esc(key) + '\')"><span class="t">' + esc(title) + '</span><span class="badge">' + g.items.length + '건</span><span class="chev">›</span></button>';
        if (open) html += '<div class="iw-nl-mbody open"><div class="iw-news-grid">' + g.items.map(strategyCardHtml).join('') + '</div></div>';
      }
      html += '</div>';
    }
    return html;
  }
  function strategyCoViewHtml() {
    var companies = strategyPoolCompanies();
    var sel = (state.strategyCoSel && companies.some(function (c) { return c.name === state.strategyCoSel; })) ? state.strategyCoSel : (companies[0] && companies[0].name);
    if (!sel) return '<div class="iw-empty">회사가 없습니다.</div>';
    state.strategyCoSel = sel;
    var rows = (state.strategyData || []).filter(function (r) { return (String(r.company || '').trim() || '(회사 미상)') === sel; })
      .slice().sort(function (a, b) { return (Number(b.publish_year) * 12 + Number(b.publish_month || 0)) - (Number(a.publish_year) * 12 + Number(a.publish_month || 0)); });
    var sec = newsSecOf(rows[0] && rows[0].insurance_type || sel), secLb = sec === 'life' ? '생명보험' : '손해보험';
    var latest = rows[0] ? (rows[0].publish_year + '.' + ('0' + rows[0].publish_month).slice(-2)) : '-';
    var avatar = esc(sel.replace(/\s+/g, '').slice(0, 2));
    var head = '<div class="iw-nl-cohead"><span class="iw-nl-avatar ' + (sec === 'life' ? 'l' : 's') + '">' + avatar + '</span><div class="info"><h3>' + esc(sel) + '</h3><div class="sub">' + secLb + ' · 최근 발행 ' + esc(latest) + '</div></div><span class="tot">총 <b>' + rows.length + '</b>건</span></div>';
    var grid = rows.length ? '<div class="iw-news-grid">' + rows.map(strategyCardHtml).join('') + '</div>' : '<div class="iw-empty">영업방향 자료가 없습니다.</div>';
    return head + grid;
  }
  function strategyHtml() {
    if (!state.strategyData && !state.strategyLoading) loadStrategyData();
    if (state.strategyLoading || !state.strategyData) {
      return '<div class="iw-toolbar"><h2>영업방향</h2></div><div class="iw-empty">불러오는 중입니다…</div>';
    }
    var sidebar = '<aside class="iw-nl-side">' + strategyPoolTabsHtml() + '<div class="iw-nl-search"><input id="iw-strategyCo-name-input" type="text" placeholder="회사 검색" autocomplete="off" value="' + esc(state.strategyCoNameQuery || '') + '"></div><div class="iw-nl-colist">' + strategySidebarHtml() + '</div></aside>';
    var main = '<div class="iw-nl-main"><div class="iw-nl-ctrl">' + strategyScopeTabsHtml() + '</div>' + strategyCountHtml() + (state.strategyScope === 'all' ? strategyAllViewHtml() : strategyCoViewHtml()) + '</div>';
    return '<div class="iw-toolbar"><h2>영업방향</h2></div><div class="iw-nl-layout">' + sidebar + main + '</div>';
  }
  function filterStrategyPool(pool) {
    state.strategyPool = pool;
    if (state.strategyCoSel && pool !== 'all' && newsSecOf(state.strategyCoSel) !== pool) state.strategyCoSel = null;
    renderContent();
  }
  function setStrategyScope(scope) { state.strategyScope = scope; renderContent(); }
  function selectStrategyCompany(name) {
    state.strategyCoSel = name; state.strategyScope = 'co';
    var sec = newsSecOf(name);
    if (state.strategyPool !== 'all' && state.strategyPool !== sec) state.strategyPool = sec;
    renderContent();
  }
  function toggleStrategyMonth(key) { state.strategyOpenMonths[key] = !state.strategyOpenMonths[key]; renderContent(); }
  function hydrateStrategyThumbs() {
    document.querySelectorAll('#v-insuwork .iw-news-thumb img[data-strategy-thumb]').forEach(function (img) {
      var path = img.getAttribute('data-strategy-thumb'); if (!path) return;
      img.src = newslettersPublicUrl(path);
    });
  }
  function openStrategy(id) {
    var row = (state.strategyData || []).find(function (r) { return String(r.id) === String(id); }); if (!row) return;
    var name = row.source_filename || strategyLabel(row) || ((row.company || '영업방향') + '_' + newsMonthLabel(row) + '.pdf');
    var directUrl = String(row.source_file_url || '').trim();
    var previewPath = String(row.preview_pdf_path || row.source_path || '').trim();
    var ready = directUrl ? Promise.resolve(directUrl) : (previewPath ? Promise.resolve(newslettersPublicUrl(previewPath)) : Promise.reject(new Error('열람 가능한 파일이 없습니다.')));
    ready.then(function (url) { openPreviewUrl(url, name, 'application/pdf', { source: 'sales-strategy', id: id }); }).catch(saveError);
  }
  function archiveHtml() {
    var cards = [['home', '기존 원세컨드 홈', '보험 검색과 기존 홈 도구'], ['product-lineup', '상품 라인업', '원수사 상품 자료'], ['newsletters', '소식지', '원수사 GA 소식지'], ['bojang', '보장분석', '기존 보장분석 도구'], ['axis-medical', '보험 지식', '실손·암·뇌·심장 등'], ['namecard', '기타 도구', '명함과 기존 제작 도구']];
    return '<div class="iw-toolbar"><h2>기존 아카이브</h2></div><div class="iw-archive-grid">' + cards.map(function (card) { return '<button class="iw-archive-card" onclick="OSInsuwork.legacy(\'' + card[0] + '\')"><strong>' + card[1] + '</strong><span>' + card[2] + '</span></button>'; }).join('') + '</div>';
  }
  function trashHtml() {
    var rows = (state.data.trashCustomers || []).filter(function (item) { return matches((item.name || '') + ' ' + (item.phone || item.phone_raw || '')); });
    var total = (state.data.trashCustomers || []).length;
    return statusHtml() + '<div class="iw-toolbar"><h2>휴지통</h2>' + (total ? '<button type="button" class="iw-btn danger" onclick="OSInsuwork.emptyTrash()">휴지통 비우기</button>' : '') + '</div><div class="iw-trash-list">' + (rows.length ? rows.map(function (item) { return '<div class="iw-trash-row"><span><strong>' + esc(item.name || '(이름 없음)') + '</strong><small>' + esc(phoneText(item.phone || item.phone_raw || '')) + (item.deleted_at ? ' · ' + formatDate(item.deleted_at) + ' 삭제' : '') + '</small></span><button type="button" class="iw-btn" onclick="OSInsuwork.restoreCustomer(\'' + esc(item.id) + '\')">복원</button></div>'; }).join('') : '<div class="iw-empty">휴지통이 비어 있습니다.</div>') + '</div>';
  }
  /* 2026-08-25 대표 확정 — 로그인 사용자끼리 자료를 공유하는 공개자료실. 폴더 없이 평면 목록,
     화면 자체 검색창만 둔다(전역 검색과는 분리). 기존 '공개 범위' 체크(visibility=public)를 그대로
     재사용 — 새 '공개하기' 버튼 없이, 어떤 사용자든 자기 자료를 공개로 저장하면 자동으로 여기 모인다.
     owner_id 필터 없이 조회하는 이 앱의 첫 사례 — RLS(owner_id=auth.uid() OR visibility='public')가
     이미 인증 사용자에게 전체 공개 자료 읽기를 허용해서 DB 변경 없이 가능하다.
     2026-08-25 후속 — public.users.nickname 컬럼 + get_nicknames(uuid[]) RPC 배포 완료 후, 목록에 있는
     owner_id 집합에 대해 한 번만 조회해 닉네임을 채운다(설정 안 한 사용자는 계속 '익명'). */
  function loadPublicLibrary() {
    if (state.publicLibraryData || state.publicLibraryLoading) return;
    state.publicLibraryLoading = true;
    api('insuwork_items?visibility=eq.public&item_type=neq.folder&order=created_at.desc&limit=500&select=id,item_type,title,body,url,storage_path,mime_type,file_size,created_at,owner_id').then(function (rows) {
      state.publicLibraryData = rows || [];
      var ownerIds = (rows || []).filter(function (row) { return row.owner_id; }).map(function (row) { return row.owner_id; });
      ownerIds = ownerIds.filter(function (id, index) { return ownerIds.indexOf(id) === index; });
      if (!ownerIds.length) { state.publicLibraryLoading = false; if (state.section === 'public-library') renderContent(); return; }
      return window.db.fetch('/rest/v1/rpc/get_nicknames', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_ids: ownerIds }) })
        .then(function (response) { return response.ok ? response.json() : []; })
        .then(function (nickRows) {
          var map = {};
          (nickRows || []).forEach(function (row) { if (row.nickname) map[row.id] = row.nickname; });
          state.publicLibraryNicknames = map; state.publicLibraryLoading = false;
          if (state.section === 'public-library') renderContent();
        });
    }).catch(function () { state.publicLibraryLoading = false; state.publicLibraryData = []; if (state.section === 'public-library') renderContent(); });
  }
  function publicLibraryKind(item) { return item.item_type === 'file' ? '자료' : item.item_type === 'note' ? '업무노트' : item.item_type === 'link' ? '링크' : '메모'; }
  function publicLibraryAuthor(item) { return (state.publicLibraryNicknames && state.publicLibraryNicknames[item.owner_id]) || '익명'; }
  function publicLibraryMatches(item) {
    var q = (state.publicLibNameQuery || '').trim().toLowerCase(); if (!q) return true;
    return ((item.title || '') + ' ' + (item.body ? stripHtml(item.body) : '')).toLowerCase().indexOf(q) >= 0;
  }
  function publicLibraryRowHtml(item) {
    return '<tr tabindex="0" ' + publicLibraryDragAttributes(item) + ' onclick="OSInsuwork.openPublicLibraryItem(\'' + esc(item.id) + '\')"><td><b>' + esc(item.title || '(제목 없음)') + '</b></td><td>' + publicLibraryKind(item) + '</td><td>' + esc(publicLibraryAuthor(item)) + '</td><td>' + formatDate(item.created_at) + '</td></tr>';
  }
  function publicLibraryHtml() {
    var rows = (state.publicLibraryData || []).filter(publicLibraryMatches);
    var clearBtn = state.publicLibNameQuery ? '<button type="button" class="iw-consult-name-clear" onclick="OSInsuwork.clearNameSearch(\'publicLib\')" aria-label="검색어 지우기">×</button>' : '';
    var toolbar = '<div class="iw-toolbar"><h2>공개자료실</h2><label class="iw-consult-name-search"><span aria-hidden="true">⌕</span><input id="iw-publicLib-name-input" type="search" placeholder="공개자료 검색" autocomplete="off" value="' + esc(state.publicLibNameQuery || '') + '">' + clearBtn + '</label></div>';
    var viewModes = [['list', '목록', '☷'], ['thumb', '썸네일', '▦'], ['large', '큰 이미지', '▣']];
    var viewHtml = viewModes.map(function (mode) { return '<button type="button" class="' + (state.publicLibView === mode[0] ? 'on' : '') + '" onclick="OSInsuwork.setPublicLibView(\'' + mode[0] + '\')" aria-label="' + mode[1] + ' 보기" title="' + mode[1] + '"><span aria-hidden="true">' + mode[2] + '</span>' + mode[1] + '</button>'; }).join('');
    var notice = '<div class="iw-pl-notice"><span>함께 쓰는 공개 자료실입니다. 올리신 자료의 권리·내용은 본인 책임이며, 개인정보·저작권 침해·부적절한 콘텐츠는 통보 없이 삭제될 수 있습니다.</span><div class="iw-view-switch" aria-label="보기 방식">' + viewHtml + '</div></div>';
    var body;
    if (state.publicLibraryLoading) body = '<div class="iw-state"><strong>공개자료를 불러오는 중입니다.</strong></div>';
    else if (!rows.length) body = '<div class="iw-empty">' + (state.publicLibNameQuery ? '검색 결과가 없습니다.' : '아직 공개된 자료가 없습니다. 자료 화면에서 \'공개 범위\'를 전체 공개로 저장하면 여기에 나타납니다.') + '</div>';
    else if (state.publicLibView === 'list') body = '<div class="iw-explorer"><table class="iw-table"><thead><tr><th>이름</th><th>종류</th><th>작성자</th><th>등록일</th></tr></thead><tbody>' + rows.map(publicLibraryRowHtml).join('') + '</tbody></table></div>';
    else body = '<div class="iw-assets-grid ' + (state.publicLibView === 'large' ? 'large' : '') + '">' + rows.map(publicLibraryCardHtml).join('') + '</div>';
    return toolbar + notice + body;
  }
  function publicLibraryCardHtml(item) {
    var direct = /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(item.url || '') ? item.url : '';
    var image = direct ? '<img src="' + esc(direct) + '" alt="">' : ((item.storage_path && /^image\//.test(item.mime_type || '')) ? '<img data-storage-path="' + esc(item.storage_path) + '" alt="">' : '');
    var docBody = item.item_type === 'note' ? '<p class="iw-asset-ext">Note</p>' : item.item_type === 'memo' ? '<p class="iw-asset-ext">Memo</p>' : item.body ? '<p>' + esc(stripHtml(item.body).slice(0, 110)) + '</p>' : '<p class="iw-asset-ext">' + esc((fileExtension(item) || publicLibraryKind(item) || '파일').toUpperCase()) + '</p>';
    var preview = image || '<div class="iw-asset-document"><span>' + publicLibraryKind(item) + '</span>' + docBody + '</div>';
    return '<button type="button" class="iw-asset-card" ' + publicLibraryDragAttributes(item) + ' onclick="OSInsuwork.openPublicLibraryItem(\'' + esc(item.id) + '\')"><span class="iw-asset-preview">' + preview + '</span><b>' + esc(item.title || '(제목 없음)') + '</b><small>' + publicLibraryKind(item) + ' · ' + esc(publicLibraryAuthor(item)) + ' · ' + formatDate(item.created_at) + '</small></button>';
  }
  function publicLibraryDragAttributes(item) {
    if (!item || (!item.storage_path && !item.url)) return '';
    return 'draggable="true" data-file-drag="true" data-file-title="' + esc(item.title || '파일') + '" data-file-mime="' + esc(item.mime_type || '') + '" data-storage-path="' + esc(item.storage_path || '') + '" data-direct-url="' + esc(item.url || '') + '" ondragstart="OSInsuwork.externalFileDragStart(event)" ondragend="OSInsuwork.assetDragEnd(event)"';
  }
  function openPublicLibraryItem(id) {
    var item = (state.publicLibraryData || []).find(function (entry) { return String(entry.id) === String(id); }); if (!item) return;
    var bodyText = item.item_type === 'link' ? '' : stripHtml(item.body || '');
    var link = item.url;
    var actions = item.storage_path ? '<button type="button" class="iw-btn primary" onclick="OSInsuwork.openPublicLibraryFile(\'' + esc(item.id) + '\')">열기</button>' : (link ? '<a class="iw-btn primary" href="' + esc(link) + '" target="_blank" rel="noopener">파일 열기</a>' : '');
    dialog('<div class="iw-detail"><span class="iw-badge">' + publicLibraryKind(item) + ' · ' + esc(publicLibraryAuthor(item)) + '</span><h2 class="iw-detail-title"><span>' + esc(item.title || '(제목 없음)') + '</span></h2><p>' + formatDate(item.created_at) + '</p><div class="iw-detail-body">' + (item.item_type === 'note' ? (item.body || '') : esc(bodyText)) + '</div><div class="iw-detail-actions">' + actions + '</div></div>');
  }
  function openPublicLibraryFile(id) {
    var item = (state.publicLibraryData || []).find(function (entry) { return String(entry.id) === String(id); }); if (!item || !item.storage_path) return;
    signStoragePath(item.storage_path).then(function (url) { openPreviewUrl(url, item.title || '파일', item.mime_type || ''); }).catch(function () { if (typeof window.toast === 'function') window.toast('파일을 열지 못했습니다. 잠시 후 다시 시도해 주세요.'); });
  }
  function sectionHtml() { if (state.section === 'ledger') return canEnterSection('ledger') && window.OSInsuworkLedger ? window.OSInsuworkLedger.html() : '<p>임태성 전용 화면입니다.</p>';
    if (state.section === 'daily-briefing' && window.OSCustomerBriefing) return window.OSCustomerBriefing.sectionHtml();
    /* 2026-08-25 회귀 수정 — 이 가드는 원래 모든 섹션에 걸려 있었고, 비로그인 사용자는
       authenticated()가 영원히 false라 state.status가 'waiting-auth'에서 못 벗어나
       홈·보험브리핑·참고자료·영업도구까지 전부 "로그인 정보를 확인하고 있습니다" 화면에
       막혀 있었다(#1843 공개 구조 전환 라이브 회귀). PROTECTED_SECTIONS(캘린더/고객관리/
       상담관리/자료)만 개인 데이터 로딩 게이트를 유지하고, 나머지 공개 섹션은 각자의 render
       함수(homeHtml/newslettersHtml/scriptsHtml/carriersHtml/toolsPageHtml/
       insuranceAgePageHtml/paymentSectionHtml/strategyHtml)가 가진 자체 로더·빈 상태
       처리로 넘긴다. */
    var blockingStatus = state.status === 'idle' || state.status === 'waiting-auth' || (state.status === 'loading' && !(state.data.items.length || state.data.events.length || state.data.customers.length || state.data.consultations.length));
    if (blockingStatus && PROTECTED_SECTIONS.indexOf(state.section) >= 0) return statusHtml();
    if (state.query.trim()) return searchHtml();
    if (state.section === 'assets') return assetsHtml();
    if (state.section === 'customers') return customersHtml();
    if (state.section === 'consultations') return consultationsHtml();
    if (state.section === 'calendar') return calendarHtml();
    if (state.section === 'carriers') return carriersHtml();
    if (state.section === 'payments') return paymentSectionHtml();
    if (state.section === 'scripts') return scriptsHtml();
    if (state.section === 'newsletters') return newslettersHtml();
    if (state.section === 'product-lineups') return window.OSInsuworkProductLineups ? window.OSInsuworkProductLineups.sectionHtml() : '<div class="iw-empty">상품라인업을 불러올 수 없습니다.</div>';
    if (state.section === 'sales-strategy') return strategyHtml();
    if (state.section === 'insurance-age') return insuranceAgePageHtml();
    if (state.section === 'tools') return toolsPageHtml();
    if (state.section === 'trash') return trashHtml();
    if (state.section === 'archive') return archiveHtml();
    if (state.section === 'public-library') return publicLibraryHtml();
    if (state.section === 'notice-updates') return noticeUpdatesHtml();
    if (state.section === 'user-guide') return userGuidePageHtml();
    if (state.section === 'feedback') return feedbackHtml();
    if (state.section === 'briefing') return briefingHtml();
    if (state.section === 'admin-users') return adminUsersHtml();
    return homeHtml();
  }
  function adminUserDateTime(value) {
    if (!value) return '-';
    var date = new Date(value); if (isNaN(date.getTime())) return String(value).slice(0, 16).replace('T', ' ');
    var parts = {}; new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(date).forEach(function (part) { parts[part.type] = part.value; });
    return parts.year + '-' + parts.month + '-' + parts.day + ' ' + parts.hour + ':' + parts.minute;
  }
  function adminUserStatusLabel(status) {
    var value = String(status || 'active').toLowerCase();
    return { active: '정상', suspended: '정지', pending: '대기', inactive: '비활성', withdrawn: '탈퇴', deleted: '탈퇴' }[value] || status || '정상';
  }
  function loadAdminUsers(force) {
    if (!canSeeAdminUsers() || !authenticated() || state.adminUsersLoading || (!force && state.adminUsers)) return;
    state.adminUsersLoading = true; state.adminUsersError = ''; renderContent();
    window.db.fetch('/rest/v1/users?select=id,name,nickname,email,company,phone,status,created_at,last_seen_at&order=created_at.desc&limit=2000')
      .then(function (response) { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); })
      .then(function (rows) { state.adminUsers = Array.isArray(rows) ? rows : []; })
      .catch(function () { state.adminUsers = []; state.adminUsersError = '사용자 목록을 불러오지 못했습니다. 관리자 조회 권한을 확인해 주세요.'; })
      .finally(function () { state.adminUsersLoading = false; if (state.section === 'admin-users') renderContent(); });
  }
  function adminUsersHtml() {
    if (!canSeeAdminUsers()) return '<div class="iw-state"><strong>접근할 수 없는 화면입니다.</strong><span>보험워크 홈으로 이동합니다.</span></div>';
    if (state.adminUsersLoading || !state.adminUsers) return '<div class="iw-loading">사용자 목록을 불러오는 중입니다.</div>';
    var query = searchNorm(state.adminUserQuery), status = state.adminUserStatus;
    var rows = state.adminUsers.filter(function (user) {
      var matchesQuery = !query || searchNorm([user.name, user.nickname, user.email, user.company, user.phone].join(' ')).indexOf(query) >= 0;
      return matchesQuery && (status === 'all' || String(user.status || 'active').toLowerCase() === status);
    });
    var today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()), todayCount = state.adminUsers.filter(function (user) { var created = new Date(user.created_at); return !isNaN(created.getTime()) && new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(created) === today; }).length;
    var statusOptions = [['all', '전체 상태'], ['active', '정상'], ['pending', '대기'], ['suspended', '정지'], ['inactive', '비활성'], ['withdrawn', '탈퇴']];
    var body = rows.map(function (user) {
      var rawStatus = String(user.status || 'active').toLowerCase();
      return '<tr><td><strong>' + esc(user.name || '-') + '</strong></td><td>' + esc(user.nickname || '-') + '</td><td>' + esc(user.email || '-') + '</td><td>' + esc(user.company || '-') + '</td><td>' + esc(phoneText(user.phone || '') || '-') + '</td><td>' + esc(adminUserDateTime(user.created_at)) + '</td><td>' + esc(adminUserDateTime(user.last_seen_at)) + '</td><td><span class="iw-admin-status iw-admin-status-' + esc(rawStatus) + '">' + esc(adminUserStatusLabel(rawStatus)) + '</span></td></tr>';
    }).join('');
    return '<div class="iw-toolbar iw-admin-users-head"><div><h2>사용자 관리</h2><p class="iw-subtitle">보험워크 가입자 정보를 조회합니다.</p></div><button type="button" class="iw-btn" onclick="OSInsuwork.reloadAdminUsers()">새로고침</button></div>'
      + '<div class="iw-stats iw-admin-users-stats"><div class="iw-stat"><span>전체 사용자</span><strong>' + state.adminUsers.length + '</strong></div><div class="iw-stat"><span>오늘 가입</span><strong>' + todayCount + '</strong></div><div class="iw-stat"><span>검색 결과</span><strong>' + rows.length + '</strong></div></div>'
      + '<div class="iw-admin-users-tools"><label class="iw-admin-user-search">⌕<input id="iw-admin-user-search" type="search" value="' + esc(state.adminUserQuery) + '" placeholder="이름·닉네임·이메일·회사명 검색"></label><select aria-label="이용 상태" onchange="OSInsuwork.filterAdminUserStatus(this.value)">' + statusOptions.map(function (option) { return '<option value="' + option[0] + '"' + (status === option[0] ? ' selected' : '') + '>' + option[1] + '</option>'; }).join('') + '</select></div>'
      + (state.adminUsersError ? '<div class="iw-error" role="alert"><span>' + esc(state.adminUsersError) + '</span></div>' : '')
      + '<div class="iw-explorer iw-admin-users-table"><table><thead><tr><th>이름</th><th>닉네임</th><th>이메일</th><th>회사명</th><th>휴대전화</th><th>가입일</th><th>최근 로그인</th><th>이용 상태</th></tr></thead><tbody>' + (body || '<tr><td colspan="8" class="iw-admin-users-empty">조건에 맞는 사용자가 없습니다.</td></tr>') + '</tbody></table></div>';
  }
  function scheduleAdminUserSearch(value) {
    window.clearTimeout(state.adminUserTimer);
    state.adminUserTimer = window.setTimeout(function () {
      if (state.adminUserComposing) return;
      state.adminUserQuery = value || '';
      renderContent();
      var input = document.getElementById('iw-admin-user-search'); if (input) { input.focus(); try { input.setSelectionRange(input.value.length, input.value.length); } catch (_) {} }
    }, 180);
  }
  function bindAdminUserSearch() {
    var input = document.getElementById('iw-admin-user-search'); if (!input) return;
    state.adminUserComposing = false;
    input.addEventListener('compositionstart', function () { state.adminUserComposing = true; });
    input.addEventListener('compositionend', function () { state.adminUserComposing = false; scheduleAdminUserSearch(input.value); });
    input.addEventListener('input', function () { if (!state.adminUserComposing) scheduleAdminUserSearch(input.value); });
    input.addEventListener('search', function () { if (!state.adminUserComposing) scheduleAdminUserSearch(input.value); });
  }
  function supportHeroHtml(title, copy) {
    return '<div class="iw-support-page"><div class="iw-support-head"><p>SUPPORT</p><h2>' + esc(title) + '</h2><span>' + esc(copy) + '</span></div>';
  }
  function noticeUpdatesHtml() {
    var updates = [
      ['2026. 8. 30.', '모바일 고객·상담 리스트 PC 기준 통일', '고객관리와 상담관리의 포함 기준, 정렬 기준, 캐시 버전을 PC 화면과 맞췄습니다.'],
      ['2026. 8. 30.', '모바일 상단 헤더 정리', '보험워크 CI, 검색창, 햄버거 메뉴가 한 줄에 들어오도록 모바일 헤더 높이를 줄였습니다.'],
      ['2026. 8. 30.', '보험워크 CI 적용', '비로그인 랜딩, 로그인 팝업, 다크모드 화면에 보험워크 CI를 반영했습니다.']
    ];
    return supportHeroHtml('공지·업데이트', '보험워크의 주요 변경사항과 운영 안내를 확인합니다.')
      + '<div class="iw-support-list">' + updates.map(function (item) {
        return '<article class="iw-support-card"><time>' + esc(item[0]) + '</time><h3>' + esc(item[1]) + '</h3><p>' + esc(item[2]) + '</p></article>';
      }).join('') + '</div></div>';
  }
  function userGuidePageHtml() {
    var guides = [
      ['홈', '오늘 일정, 즐겨찾기, 최근 자료, 최근 고객을 먼저 확인합니다. 하루 업무를 시작하는 첫 화면입니다.'],
      ['상담관리', '예약, 진행중, 제안서발송, 클로징, 청약완료까지 상담 흐름을 단계별로 관리합니다.'],
      ['고객관리', '청약이 완료된 고객을 계약일과 보험나이 기준으로 관리하고 다음 케어 일정을 이어갑니다.'],
      ['캘린더', '상담 일정, 고객 케어, 보험상령일을 한 화면에서 확인합니다.'],
      ['자료', '업무노트, 자료실, 메모를 상담 중 바로 꺼내 쓸 수 있게 정리합니다.'],
      ['보험브리핑·참고자료·영업도구', '보험 이슈, 소식지, 영업방향, 스크립트, 원전산 바로가기를 업무 흐름 안에서 사용합니다.']
    ];
    return supportHeroHtml('사용자 가이드', '보험워크를 업무 흐름대로 사용하는 방법입니다.')
      + '<div class="iw-guide-grid">' + guides.map(function (item, index) {
        return '<article class="iw-support-card"><span class="iw-guide-step">' + String(index + 1).padStart(2, '0') + '</span><h3>' + esc(item[0]) + '</h3><p>' + esc(item[1]) + '</p></article>';
      }).join('') + '</div></div>';
  }
  function feedbackHtml() {
    if (!allowed()) return statusHtml();
    var types = ['불편사항', '기능건의', '오류제보', '자료요청', '기타'];
    return supportHeroHtml('의견 보내기', '사용 중 불편한 점이나 필요한 기능을 비공개로 전달합니다.')
      + '<form class="iw-support-form" onsubmit="event.preventDefault();OSInsuwork.saveFeedback()">'
      + formField('유형', '<select id="iwf-feedback-type">' + types.map(function (type) { return '<option value="' + esc(type) + '">' + esc(type) + '</option>'; }).join('') + '</select>')
      + formField('제목', '<input id="iwf-feedback-title" required autocomplete="off" placeholder="예: 모바일 고객 검색 개선 요청">')
      + formField('내용', '<textarea id="iwf-feedback-body" rows="8" required placeholder="어떤 화면에서 어떤 불편이 있었는지 적어주세요."></textarea>')
      + formField('연락 필요 여부', '<select id="iwf-feedback-contact"><option value="no">답변 없이 참고해 주세요</option><option value="yes">확인이 필요하면 연락 주세요</option></select>')
      + '<p class="iw-support-note">현재 화면 주소와 로그인 계정 기준으로 비공개 저장됩니다.</p>'
      + '<div class="iw-form-actions"><button type="button" class="iw-btn" onclick="OSInsuwork.go(\'home\')">취소</button><button type="submit" class="iw-btn primary">의견 보내기</button></div>'
      + '</form></div>';
  }
  function saveFeedback() {
    if (!allowed()) { promptLoginRequired(); return; }
    var type = value('iwf-feedback-type') || '기타', title = value('iwf-feedback-title'), body = value('iwf-feedback-body'), contact = value('iwf-feedback-contact') || 'no';
    if (!title || !body) { briefingAlert('제목과 내용을 입력해 주세요.', '의견 보내기'); return; }
    var html = '<p><strong>유형:</strong> ' + esc(type) + '</p><p><strong>연락 필요:</strong> ' + (contact === 'yes' ? '예' : '아니오') + '</p><p><strong>화면:</strong> ' + esc(location.href) + '</p><hr><p>' + esc(body).replace(/\n/g, '<br>') + '</p>';
    writeOne('insuwork_items', {
      owner_id: currentUserId(),
      parent_id: null,
      item_type: 'memo',
      title: '[의견] ' + type + ' · ' + title,
      body: sanitizeRich(html),
      visibility: 'private',
      legacy_payload: { workspace_category: 'feedback', feedback_type: type, contact_requested: contact === 'yes', page_url: location.href },
      created_at: new Date().toISOString()
    }).then(function (saved) {
      upsertWorkspaceItem(saved);
      state.section = 'notice-updates';
      setUrl(true);
      renderShell();
      if (typeof window.toast === 'function') window.toast('의견을 저장했습니다.');
    }).catch(saveError);
  }
  /* 2026-08-25 — 소식지·캘린더(보험브리핑) 섹션. insuwork/insubriefing/leaflets.js의 리플렛
     캘린더 엔진을 그대로 이식해 사이드바를 유지한 채 #iw-main 안에서 렌더한다(작업지시서
     "보험워크 SPA 내부 섹션으로 흡수" 대응). 이 섹션은 PROTECTED_SECTIONS에 없어 비로그인
     공개 유지 — 로그인 게이트를 걸지 않는다. 캘린더가 기대하는 DOM 구조는
     insuwork/insubriefing/index.html의 #leaflet-calendar 블록을 그대로 가져온 것이며,
     실제 초기화·이벤트 바인딩은 initBriefingCalendar()가 renderContent() 훅에서 담당한다. */
  function briefingHtml() {
    return '<div class="iw-toolbar"><h2>보험이슈</h2></div>'
      + '<div id="leaflet-calendar">'
      + '<div class="ib-leaflet-head">'
      + '<div class="ib-leaflet-nav">'
      + '<span id="ib-leaflet-nav-arrows">'
      + '<button type="button" id="ib-leaflet-prev" aria-label="이전">‹</button>'
      + '<span id="ib-leaflet-month-label"></span>'
      + '<button type="button" id="ib-leaflet-next" aria-label="다음">›</button>'
      + '</span>'
      + '<button type="button" id="ib-leaflet-today" class="ib-leaflet-today-btn">오늘</button>'
      + '</div>'
      + '<div class="ib-leaflet-modes" aria-label="캘린더 보기 방식">'
      + '<button type="button" class="ib-leaflet-mode" data-mode="month">월</button>'
      + '<button type="button" class="ib-leaflet-mode" data-mode="week">주</button>'
      + '<button type="button" class="ib-leaflet-mode on" data-mode="day">일</button>'
      + '<button type="button" class="ib-leaflet-mode" data-mode="agenda">목록</button>'
      + '</div>'
      + '</div>'
      + '<div class="ib-leaflet-grid" id="ib-leaflet-grid"></div>'
      + '</div>';
  }
  /* leaflets.js의 init()은 원래 페이지 로드 시 딱 한 번만 자동 실행되도록 설계됐다(DOMContentLoaded
     1회). 여기서는 '소식지·캘린더' 섹션에 들어올 때마다 #iw-main이 innerHTML로 통째 교체되어
     #ib-leaflet-grid/이전-다음/오늘/보기모드 버튼이 매번 새 DOM 노드로 다시 만들어지므로, 그
     새 버튼들에 클릭 리스너를 다시 걸어주려면 init()을 매번 다시 불러야 한다(그렇지 않으면 두
     번째 진입부터 캘린더가 빈 채로 버튼이 먹통이 된다).
     2026-08-25 후속 수정 — init() 재호출 시 document(붙여넣기)·window(리사이즈) 리스너가 누적되던
     문제를 leaflets.js에 state.globalListenersBound 가드를 추가해 해결했다(페이지 수명 동안 한 번만
     바인딩). 그리드 안쪽 버튼 리스너는 옛 DOM과 함께 자연 소멸하므로 그대로 매번 재바인딩된다. */
  function initBriefingCalendar() {
    if (window.OSBriefingLeaflets && typeof window.OSBriefingLeaflets.init === 'function') window.OSBriefingLeaflets.init();
  }

  function renderShell() {
    var view = document.getElementById('v-insuwork'); if (!view) return;
    document.body.classList.toggle('is-insuwork-public', STANDALONE && !allowed());
    if (STANDALONE && !allowed()) {
      view.innerHTML = publicLandingHtml();
      var loginBtn = view.querySelector('[data-ib-login]');
      var signupBtn = view.querySelector('[data-ib-signup]');
      if (loginBtn) loginBtn.addEventListener('click', function () { openBriefingAuth('login'); });
      if (signupBtn) signupBtn.addEventListener('click', function () { openBriefingAuth('signup'); });
      return;
    }
    loadCarrierDirectory();
    var head = STANDALONE ? '' : '<header class="iw-head"><div class="iw-title"><h1>내 업무</h1><p>자료, 고객, 상담과 일정을 한곳에서 관리합니다.</p></div><label class="iw-search">⌕<input id="iw-search-input" type="search" value="' + esc(state.query) + '" placeholder="내 자료와 고객 검색" autocomplete="off"></label></header>';
    view.innerHTML = '<div class="iw-shell' + (STANDALONE ? ' iw-shell-compact' : '') + '">' + head + '<div class="iw-body">' + navHtml() + '<main class="iw-main" id="iw-main"></main></div></div><dialog class="iw-dialog" id="iw-dialog"><button class="iw-dialog-close" onclick="OSInsuwork.closeDialog()" aria-label="닫기">×</button><div id="iw-dialog-body"></div></dialog>'
      + '<dialog class="iw-dialog iw-reservation-dialog" id="iw-reservation-dialog"><button class="iw-dialog-close" onclick="OSInsuwork.closeReservationPopup()" aria-label="닫기">×</button><div id="iw-reservation-body"></div></dialog>'
      + '<div class="iw-preview" id="iw-preview" aria-hidden="true" onclick="if(event.target===this)OSInsuwork.closePreview()"><button type="button" class="iw-preview-close" onclick="OSInsuwork.closePreview()" aria-label="미리보기 닫기">×</button><div class="iw-preview-thumbs" id="iw-preview-thumbs"></div><div class="iw-preview-stage" id="iw-preview-stage" onclick="if(event.target===this||(event.target.classList&&event.target.classList.contains(\'iw-preview-page-wrap\')))OSInsuwork.closePreview()"></div><div class="iw-preview-bar"><button type="button" onclick="OSInsuwork.previewZoom(-1)" title="축소">−</button><button type="button" onclick="OSInsuwork.previewZoom(1)" title="확대">＋</button><button type="button" onclick="OSInsuwork.previewRotate()" title="회전">↻</button><button type="button" class="iw-preview-pdf-only" onclick="OSInsuwork.previewPage(-1)" title="이전 페이지">‹</button><span id="iw-preview-page"></span><button type="button" class="iw-preview-pdf-only" onclick="OSInsuwork.previewPage(1)" title="다음 페이지">›</button><div class="iw-ddak-wrap"><button type="button" class="iw-preview-ddak" aria-haspopup="menu" aria-expanded="false" onclick="OSInsuwork.toggleDdakMenu(event)">⚡ 딸깍</button><div class="iw-ddak-menu" id="iw-preview-ddak-menu" role="menu" hidden><a id="iw-preview-download" href="#" target="_blank" rel="noopener" download role="menuitem" onclick="OSInsuwork.closeDdakMenu()">⬇ 다운로드 저장</a><button type="button" role="menuitem" onclick="OSInsuwork.previewCopy()">📋 복사</button></div></div><button type="button" class="iw-preview-asset-only" onclick="OSInsuwork.previewEditAsset()" title="수정">✎ 수정</button><button type="button" class="iw-preview-asset-only iw-preview-delete" onclick="OSInsuwork.previewDeleteAsset()" title="삭제">🗑 삭제</button></div></div>'
      + '<div class="iw-consult-hover" id="iw-row-hover" aria-hidden="true"></div><div class="iw-asset-drop-overlay" id="iw-asset-drop-overlay" aria-hidden="true"><div><strong>폴더와 파일을 여기에 놓으세요</strong><span>현재 자료 화면으로 복사 저장합니다.</span></div></div>';
    if (STANDALONE) { var globalInput = document.getElementById('iw-search-input'); if (globalInput) globalInput.value = state.query; }
    if (window.OSInsuworkMobileSection) window.OSInsuworkMobileSection.mount(view, state.section);
    bindSearch(); bindAssetWorkspaceDrop(); renderContent();
  }
  function renderConsultCustomFields() { var detail = document.querySelector('#v-insuwork .iw-consult-detail'), section = detail && detail.querySelector('section'); if (!detail || !section || detail.querySelector('.iw-custom-fields')) return; var item = state.data.consultations.find(function (entry) { return String(entry.id) === String(state.selectedConsultation); }), customer = item && state.data.customers.find(function (entry) { return String(entry.id) === String(item.customer_id); }), profile = customerProfile(customer || {}), columns = consultColumns().filter(function (column) { return column.custom; }); if (!columns.length) return; var box = document.createElement('div'); box.className = 'iw-custom-fields'; columns.forEach(function (column) { var label = document.createElement('label'), span = document.createElement('span'), input = document.createElement('input'); span.textContent = column.label; input.setAttribute('data-consult-custom', column.key); input.value = consultCustomValue(profile, column.key); label.className = 'iw-custom-field'; label.appendChild(span); label.appendChild(input); box.appendChild(label); }); detail.insertBefore(box, section); }
  function renderContent() { window.setTimeout(function () { if (window.OSCustomerBriefing) window.OSCustomerBriefing.mount(); if (window.OSInsuworkLedger) window.OSInsuworkLedger.mount(); if (window.OSInsuworkProductLineups) window.OSInsuworkProductLineups.mount(); }, 0); hideRowHover(); var activeAdminSearch = state.section === 'admin-users' && document.activeElement && document.activeElement.id === 'iw-admin-user-search', adminSearchSelection = activeAdminSearch ? document.activeElement.selectionStart : null; var main = document.getElementById('iw-main'); if (main) { main.innerHTML = sectionHtml(); hydrateFileDrags(); if (state.section === 'assets' && state.assetView !== 'list') hydrateAssetThumbs(); if (state.section === 'public-library' && state.publicLibView !== 'list') hydrateAssetThumbs(); if (state.section === 'consultations') { bindNameSearch('consult'); if (state.selectedConsultation) { renderConsultCustomFields(); hydrateRichStorage(); bindWorkDraft(main.querySelector('.iw-consult-detail'), workDraftKey('consultation-detail', state.selectedConsultation)); } } if (state.section === 'customers') { bindNameSearch('customer'); if (state.selectedCustomerDetail) { hydrateRichStorage(); bindWorkDraft(main.querySelector('.iw-consult-detail'), workDraftKey('customer-detail', state.selectedCustomerDetail)); } } if (state.section === 'newsletters') { hydrateNewsThumbs(); bindNameSearch('newsCo'); } if (state.section === 'sales-strategy') { hydrateStrategyThumbs(); bindNameSearch('strategyCo'); } if (state.section === 'insurance-age') { calcToolInsuranceAge(); scheduleInsuranceAgeAutoRefresh(); } else window.clearTimeout(state.insageRefreshTimer); if (state.section === 'tools') hydrateToolsPage(); if (state.section === 'public-library') { loadPublicLibrary(); bindNameSearch('publicLib'); } if (state.section === 'briefing') initBriefingCalendar(); if (state.section === 'admin-users') { loadAdminUsers(false); bindAdminUserSearch(); if (activeAdminSearch) { var adminInput = document.getElementById('iw-admin-user-search'); if (adminInput) { adminInput.focus(); try { adminInput.setSelectionRange(adminSearchSelection, adminSearchSelection); } catch (_) {} } } } } }
  function bindSearch() {
    var input = document.getElementById('iw-search-input'); if (!input) return;
    input.addEventListener('compositionstart', function () { state.composing = true; });
    input.addEventListener('compositionend', function () { state.composing = false; scheduleSearch(input.value); });
    input.addEventListener('input', function () { if (!state.composing) scheduleSearch(input.value); });
  }
  function scheduleSearch(value) { window.clearTimeout(state.searchTimer); state.searchTimer = window.setTimeout(function () { state.query = value; if (state.query.trim() && !state.fullLoaded) loadData(true); else renderContent(); }, 180); }
  function setUrl(push) { var url = '?view=insuwork&section=' + encodeURIComponent(state.section); if (state.section === 'daily-briefing') { var briefingParams = new URLSearchParams(location.search); ['article', 'briefingDate'].forEach(function (key) { if (briefingParams.get(key)) url += '&' + key + '=' + encodeURIComponent(briefingParams.get(key)); }); } if (state.section === 'calendar') url += '&mode=' + state.calendarMode + '&date=' + state.selectedDate; if (state.section === 'home') url += '&date=' + state.homeDate; if (state.section === 'tools') url += '&tool=' + encodeURIComponent(state.toolMode || 'calculator'); try { history[push ? 'pushState' : 'replaceState']({ view: 'insuwork', section: state.section }, '', url); } catch (_) {} }

  function openWorkspace(section, push) {
    if (!ensureShell()) { if (!STANDALONE && window.showView) window.showView('home'); return; }
    var target = SECTIONS.indexOf(section) >= 0 ? section : 'home';
    /* 초기 로드/뒤로가기 등 비클릭 진입에서 보호 메뉴로 바로 들어오면(예: 로그아웃 상태로 딥링크
       또는 popstate) 조용히 홈으로 대체한다 — 클릭 흐름(go())의 로그인 유도 모달과 달리 여기는
       사용자가 방금 누른 액션이 아니라서 확인 모달로 막지 않고 가벼운 토스트만 남긴다. */
    if (!canEnterSection(target)) { var deniedAdmin = target === 'admin-users'; target = 'home'; if (typeof window.toast === 'function') window.toast(deniedAdmin ? '관리자 전용 화면입니다.' : '로그인이 필요한 메뉴입니다. 로그인 후 이용해 주세요.'); }
    state.section = target;
    document.querySelectorAll('.body .view').forEach(function (view) { view.classList.remove('on'); });
    document.getElementById('v-insuwork').classList.add('on');
    renderShell(); if (push !== 'skip-url') setUrl(push !== false); if (state.section !== 'daily-briefing' && state.section !== 'ledger' && !dataReadyForSection()) loadData(state.section !== 'home');
  }
  function go(section) { if (window.OSInsuworkMobileSection && canEnterSection(section) && window.OSInsuworkMobileSection.navigate(section)) return; if (!canEnterSection(section)) { if (section === 'admin-users') { if (typeof window.toast === 'function') window.toast('관리자 전용 화면입니다.'); return; } promptLoginRequired(); return; } if (section === 'consultations' && state.section === 'consultations') state.selectedConsultation = null; if (section === 'customers' && state.section === 'customers') state.selectedCustomerDetail = null; window.clearTimeout(state.searchTimer); state.query = ''; state.section = section; renderShell(); setUrl(true); if (section !== 'home' && section !== 'daily-briefing' && section !== 'ledger' && !dataReadyForSection()) loadData(true); }
  function dialog(html) { var box = document.getElementById('iw-dialog'), body = document.getElementById('iw-dialog-body'); if (!box || !body) return; body.innerHTML = html; if (!box.open && box.showModal) box.showModal(); else if (!box.open) box.setAttribute('open', ''); }
  function forceCloseDialog() { var box = document.getElementById('iw-dialog'); if (box && box.close) box.close(); else if (box) box.removeAttribute('open'); }
  function closeDialog() { var box = document.getElementById('iw-dialog'), root = box && box.querySelector('[data-work-draft-key]'), key = root && root.dataset.workDraftKey, hasDraft = key && (readWorkDraft(key) || root.dataset.workDraftDirty === '1'); if (!hasDraft) { forceCloseDialog(); return; } saveBoundWorkDraft(root); briefingConfirm('작성 중인 임시 내용을 삭제하고 닫을까요?', '작성 취소', '삭제', true).then(function (ok) { if (!ok) return; clearWorkDraft(key); forceCloseDialog(); }); }
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
    var colorHtml = richColorPickerHtml(id, 'foreColor', '글자색', 'A', 'iw-rich-color-fg', ['#e03131', '#f08c00', '#2f9e44', '#1971c2', '#9c36b6'], 'inherit')
      + richColorPickerHtml(id, 'hiliteColor', '형광펜', 'A', 'iw-rich-color-hl', ['#ffec99', '#b2f2bb', '#a5d8ff', '#fcc2d7', '#ffd8a8'], 'transparent');
    return '<div class="iw-rich"><div class="iw-rich-toolbar" role="toolbar" aria-label="본문 서식">' + buttons.map(function (button) { return '<button type="button" tabindex="-1" title="' + button[2] + '" onmousedown="event.preventDefault();OSInsuwork.richCommand(\'' + button[0] + '\',\'' + (button[3] || '') + '\',\'' + id + '\')">' + button[1] + '</button>'; }).join('') + colorHtml + '<label class="iw-rich-upload">+ 이미지 삽입<input type="file" accept="image/*" multiple hidden onchange="OSInsuwork.addRichImages(this.files,\'' + id + '\');this.value=\'\'"></label><label class="iw-rich-upload">+ 파일 첨부<input type="file" multiple hidden onchange="OSInsuwork.addRichFiles(this.files,\'' + filesId + '\');this.value=\'\'"></label></div><div id="' + id + '" class="iw-rich-body" contenteditable="true" role="textbox" aria-multiline="true" aria-label="내용" tabindex="0" data-placeholder="내용을 입력하세요" onmousedown="OSInsuwork.prepareRichFocus(event,this)" onfocus="OSInsuwork.focusRichBody(event,this)" onclick="OSInsuwork.focusRichBody(event,this)" onpaste="OSInsuwork.richPaste(event)">' + sanitizeRich(html) + '</div><div class="iw-rich-files" id="' + filesId + '"></div></div>';
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
  function richCommand(command, commandValue, editorId) { var editor = editorId ? document.getElementById(editorId) : document.querySelector('#iw-dialog .iw-rich-body'); if (!editor) return; placeRichCaret(editor); document.execCommand(command, false, commandValue || null); }
  /* 글자색·형광펜(2026-08-20, 대표 확정) — 대표 색상 5개 + "없음"(제거) 프리셋 버튼 방식(네이티브
     색상 선택 팝업은 사용법이 어렵다는 대표 피드백으로 폐기). 다른 툴바 버튼과 동일하게
     mousedown+preventDefault로 에디터 선택 영역을 유지한 채 바로 적용.
     "없음" = foreColor는 'inherit'(기본 글자색으로 복귀), hiliteColor는 'transparent'
     (실측: hiliteColor는 transparent 적용 시 감싸던 span이 통째로 풀림 — 완전 제거). */
  function richColorCommand(command, value, editorId) {
    var editor = editorId ? document.getElementById(editorId) : document.querySelector('#iw-dialog .iw-rich-body');
    if (!editor) return;
    placeRichCaret(editor);
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(command, false, value);
  }
  function positionRichColorMenu(trigger, menu, align) {
    var rect = trigger.getBoundingClientRect();
    var containingBlock = menu.offsetParent;
    var containingRect = containingBlock ? containingBlock.getBoundingClientRect() : { left: 0, top: 0 };
    menu.style.right = 'auto';
    menu.style.top = (rect.bottom - containingRect.top + 4) + 'px';
    menu.style.left = (rect.left - containingRect.left) + 'px';
    var menuRect = menu.getBoundingClientRect();
    if (align === 'left') {
      menu.style.left = (rect.right - containingRect.left - menuRect.width) + 'px';
      menuRect = menu.getBoundingClientRect();
    }
    if (menuRect.right > window.innerWidth - 8) {
      menu.style.left = (parseFloat(menu.style.left) - (menuRect.right - window.innerWidth + 8)) + 'px';
      menuRect = menu.getBoundingClientRect();
    }
    if (menuRect.left < 8) menu.style.left = (parseFloat(menu.style.left) + 8 - menuRect.left) + 'px';
  }
  function richColorPickerHtml(id, command, label, icon, modifierClass, colors, clearValue) {
    var swatches = colors.map(function (color) {
      return '<button type="button" class="iw-rich-color-swatch" style="background:' + color + '" title="' + color + '" onmousedown="event.preventDefault();OSInsuwork.richColorCommand(\'' + command + '\',\'' + color + '\',\'' + id + '\');this.closest(\'details\').open=false"></button>';
    }).join('');
    /* 실측 버그 3건(2026-08-20, 대표 보고) — ① summary 클릭 시 포커스가 넘어가며 에디터
       선택영역이 풀림 → mousedown preventDefault로 막음. ② mousedown의 preventDefault는
       CLICK 시점의 네이티브 토글까지는 못 막아 열자마자 닫힘 → click에도 별도 preventDefault
       + 수동 토글. ③ 드롭다운(.iw-rich-color-menu)이 조상 .iw-rich의 overflow:hidden에
       잘려 "없음" 말고 나머지 색상이 안 보이던 문제("잘린거였구나") → position:fixed로
       바꾸고 열 때 summary의 실제 화면 좌표(getBoundingClientRect)로 top/left를 JS에서
       계산해 씀(overflow:hidden은 fixed 포지셔닝엔 안 걸림 — 컨테이닝 블록이 뷰포트라
       조상 박스 밖으로 자유롭게 나감). 뷰포트 오른쪽으로 넘치면 왼쪽으로 당겨 보정.
       ④ 실측 버그 4건째(2026-08-20, 자료 페이지 "먹통" 재보고 후 재현) — ③의 보정이
       "오른쪽 넘침"만 막고 "왼쪽 넘침"은 안 막아서, 툴바가 줄바꿈될 때 왼쪽 끝에
       붙는 형광펜 버튼처럼 summary가 뷰포트 왼쪽에 가까우면 고정폭 드롭다운이 대부분
       화면 밖(음수 left)으로 나가 안 보였음(대표 눈엔 "클릭해도 반응 없음"으로 보임,
       실제론 열리긴 열렸으나 안 보인 것 — .open은 true였음). 열고 나서 실제 렌더된
       메뉴의 left가 8px 미만이면 right 앵커를 버리고 left:8px로 강제 고정해 보정.
       ⑤ 실측 버그 5건째(2026-08-20, 글자색만 재차 "먹통" 재보고) — summary onclick과
       "바깥 클릭 시 닫기"용 document 클릭 리스너(④에서 추가)가 같은 클릭 이벤트의
       버블링 경로에서 함께 실행됨. 로직상 서로 안 부딪히는 걸 확인했지만, 재현이 하도
       안 잡혀 혹시 모를 상호작용 여지를 원천 차단하고자 summary 클릭에
       stopPropagation을 추가해 이 클릭이 document 리스너까지 아예 안 올라가게 함
       (버튼 자체의 열기/닫기 토글은 summary 안에서 완결). stopPropagation 때문에
       "다른 색상 팝업이 열려있을 때 이 버튼을 누르면 그쪽도 닫혀야" 하는 동작을
       더 이상 document 리스너가 대신 해줄 수 없어, 여기서 직접 다른 팝업을 먼저
       닫음. 겸사겸사 버튼이 열려있는 동안 배경을 눌린 상태로 표시(CSS)해 "눌렀는데
       반응이 있는지" 육안으로 바로 확인되게 함. */
    var menuAlign = command === 'foreColor' ? 'left' : 'below';
    return '<details class="iw-rich-color-pop"><summary class="iw-rich-color ' + modifierClass + '" title="' + label + '" onmousedown="event.preventDefault()" onclick="event.preventDefault();event.stopPropagation();var d=this.parentNode,m=d.querySelector(\'.iw-rich-color-menu\'),willOpen=!d.open;var others=document.querySelectorAll(\'.iw-rich-color-pop[open]\');for(var i=0;i<others.length;i++){if(others[i]!==d)others[i].open=false;}d.open=willOpen;if(willOpen)OSInsuwork.positionRichColorMenu(this,m,\'' + menuAlign + '\')"><span>' + icon + '</span></summary><div class="iw-rich-color-menu">'
      + '<button type="button" class="iw-rich-color-none" onmousedown="event.preventDefault();OSInsuwork.richColorCommand(\'' + command + '\',\'' + clearValue + '\',\'' + id + '\');this.closest(\'details\').open=false">없음</button>'
      + swatches + '</div></details>';
  }
  function focusRich(id) { placeRichCaret(document.getElementById(id)); }
  function richPaste(event) { var text = String(event && event.clipboardData && event.clipboardData.getData('text/plain') || '').trim(); if (!/^https?:\/\/\S+$/i.test(text)) return; event.preventDefault(); var safe = esc(text); document.execCommand('insertHTML', false, '<a href="' + safe + '" target="_blank" rel="noopener">' + safe + '</a>'); }
  function richValue(id) { var editor = document.getElementById(id); return editor ? sanitizeRich(editor.innerHTML) : ''; }
  function richHasText(html) { var doc = new DOMParser().parseFromString(String(html || ''), 'text/html'); return !!String(doc.body.textContent || '').trim() || !!doc.body.querySelector('img'); }
  function resetRichPending() { (state.pendingRichImages || []).forEach(function (entry) { if (entry.preview) URL.revokeObjectURL(entry.preview); }); state.pendingRichFiles = []; state.pendingRichImages = []; }
  function renderRichFiles(filesId) { var box = document.getElementById(filesId || 'iw-rich-files'); if (!box) return; var files = state.pendingRichFiles || []; box.innerHTML = files.length ? '<strong>첨부파일 ' + files.length + '개</strong>' + files.map(function (entry) { return '<span><b>' + esc(entry.file.name) + '</b><small>' + formatBytes(entry.file.size) + '</small><button type="button" onclick="OSInsuwork.removeRichFile(\'' + entry.id + '\',\'' + (filesId || 'iw-rich-files') + '\')" aria-label="' + esc(entry.file.name) + ' 제거">×</button></span>'; }).join('') : ''; }
  function addRichFiles(files, filesId) { Array.prototype.slice.call(files || []).forEach(function (file) { state.pendingRichFiles.push({ id: crypto.randomUUID(), file: file }); }); renderRichFiles(filesId); }
  function removeRichFile(id, filesId) { state.pendingRichFiles = state.pendingRichFiles.filter(function (entry) { return entry.id !== id; }); renderRichFiles(filesId); }
  function addRichImages(files, editorId) { var editor = editorId ? document.getElementById(editorId) : document.querySelector('#iw-dialog .iw-rich-body'); if (!editor) return; Array.prototype.slice.call(files || []).filter(function (file) { return /^image\//.test(file.type || ''); }).forEach(function (file) { var id = crypto.randomUUID(), preview = URL.createObjectURL(file); state.pendingRichImages.push({ id: id, file: file, preview: preview }); editor.insertAdjacentHTML('beforeend', '<p><img src="' + esc(preview) + '" data-pending-image="' + id + '" alt="' + esc(file.name) + '"></p>'); }); }
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
  function prepareFileDrag(node, url) {
    if (!node || !url) return;
    node.dataset.fileDragUrl = url;
    node.setAttribute('draggable', 'true');
    if (!node.hasAttribute('data-file-drag')) {
      node.setAttribute('data-file-drag', 'true');
      node.addEventListener('dragstart', externalFileDragStart);
      node.addEventListener('dragend', assetDragEnd);
    }
    node.title = node.title || '카카오톡으로 끌어서 파일 보내기';
  }
  function hydrateFileDrags() {
    document.querySelectorAll('#v-insuwork [data-storage-path], #v-insuwork [data-direct-url]').forEach(function (node) {
      var parent = node.parentElement && node.parentElement.closest('[data-file-drag]');
      if (parent && parent !== node) return;
      var direct = node.getAttribute('data-direct-url'), path = node.getAttribute('data-storage-path');
      if (direct) prepareFileDrag(node, direct);
      else if (path && window.db && window.db.getToken) signStoragePath(path).then(function (url) { prepareFileDrag(node, url); }).catch(function () {});
    });
  }
  function fileDragPayload(event, internalId) {
    var node = event && event.currentTarget, transfer = event && event.dataTransfer;
    if (!node || !transfer) return false;
    var url = node.dataset.fileDragUrl || node.getAttribute('data-direct-url') || '';
    if (!url && internalId) { transfer.effectAllowed = 'move'; transfer.setData('text/plain', String(internalId)); transfer.setData('application/x-insuwork-asset-id', String(internalId)); return true; }
    if (!url) { event.preventDefault(); if (typeof window.toast === 'function') window.toast('파일을 준비하는 중입니다. 잠시 후 다시 끌어 주세요.'); return false; }
    var name = String(node.getAttribute('data-file-title') || '파일').replace(/[\r\n:]/g, '_');
    var mime = node.getAttribute('data-file-mime') || 'application/octet-stream';
    transfer.effectAllowed = internalId ? 'copyMove' : 'copy';
    transfer.setData('DownloadURL', mime + ':' + name + ':' + url);
    transfer.setData('text/uri-list', url);
    transfer.setData('text/plain', url);
    if (internalId) transfer.setData('application/x-insuwork-asset-id', String(internalId));
    return true;
  }
  function externalFileDragStart(event) {
    if (fileDragPayload(event, '')) event.currentTarget.classList.add('is-dragging');
  }
  // newsletters 버킷은 storage.buckets.public=true(2026-08-25_newsletters_bucket_public.sql)로 전환되어
  // 서명(signed) URL 없이도 공개 URL로 즉시 접근 가능 — 비로그인 방문자도 소식지·영업방향 원본을 볼 수 있게 하기 위함.
  // signStoragePath 는 myspace 등 진짜 비공개 버킷에도 공용으로 쓰이므로 여기서는 건드리지 않고 별도 헬퍼로 분리한다.
  function newslettersPublicUrl(path) {
    return window.db.url('/storage/v1/object/public/newsletters/' + String(path).split('/').map(encodeURIComponent).join('/'));
  }
  function hydrateRichStorage() { var nodes = document.querySelectorAll('#v-insuwork [data-storage-path]'); Array.prototype.forEach.call(nodes, function (node) { var path = node.getAttribute('data-storage-path'), title = node.getAttribute('data-file-title') || node.getAttribute('alt') || '첨부파일', mime = node.getAttribute('data-file-mime') || ''; signStoragePath(path).then(function (url) { if (node.tagName === 'IMG') { node.src = url; node.classList.add('iw-previewable'); node.title = '클릭하면 크게 보기'; node.onclick = function () { openPreviewUrl(url, title, mime || 'image/*'); }; } else { node.href = url; node.onclick = function (event) { if (previewType({ title: title, mime_type: mime, storage_path: path })) { event.preventDefault(); openPreviewUrl(url, title, mime); } }; } }).catch(function () {}); }); }
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
    var overlay = document.getElementById('iw-preview'), page = document.getElementById('iw-preview-page'), download = document.getElementById('iw-preview-download');
    if (!overlay) return false;
    closeDialog();
    overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); overlay.classList.toggle('is-pdf', type === 'pdf'); overlay.classList.toggle('is-image', type === 'image'); overlay.classList.toggle('has-asset', !!assetRef);
    if (page) page.textContent = type === 'pdf' ? '불러오는 중…' : name;
    if (download) { download.href = url; download.download = name || ''; }
    document.body.classList.add('iw-preview-open');
    return true;
  }
  function openPreviewUrl(url, name, mime, assetRef) {
    var type = previewType({ title: name, mime_type: mime, storage_path: url });
    if (!type) { window.open(url, '_blank', 'noopener'); return; }
    if (!previewUi(type, name, url, assetRef)) return;
    var stage = document.getElementById('iw-preview-stage'), overlay = document.getElementById('iw-preview'), thumbs = document.getElementById('iw-preview-thumbs');
    if (stage) { stage.onscroll = handlePreviewScroll; stage.onwheel = handlePreviewWheel; stage.scrollTop = 0; stage.scrollLeft = 0; }
    if (thumbs) { thumbs.innerHTML = ''; thumbs.removeAttribute('data-rendered-for'); }
    if (overlay) overlay.classList.remove('has-pages');
    state.preview = { type: type, url: url, name: name || '파일', zoom: 1, rotate: 0, page: 1, pages: 1, doc: null, assetRef: assetRef || null };
    if (type === 'image') {
      stage.innerHTML = '<div class="iw-preview-page-wrap iw-preview-image-wrap"><img id="iw-preview-image" src="' + esc(url) + '" alt="' + esc(name || '') + '"></div>';
      var previewImage = document.getElementById('iw-preview-image');
      if (previewImage) previewImage.onload = renderPreviewTransform;
      renderPreviewTransform();
      return;
    }
    stage.innerHTML = '<div class="iw-preview-loading">PDF를 불러오는 중입니다.</div>';
    Promise.all([loadPdfJs(), fetch(url).then(function (response) { if (!response.ok) throw new Error('PDF를 불러오지 못했습니다.'); return response.arrayBuffer(); })])
      .then(function (values) { return values[0].getDocument({ data: values[1] }).promise; })
      .then(function (doc) { if (!state.preview || state.preview.url !== url) return; state.preview.doc = doc; state.preview.pages = doc.numPages; renderPdfPreview(); renderPdfThumbs(); })
      .catch(function (error) { if (stage) stage.innerHTML = '<div class="iw-preview-loading">' + esc(error.message || 'PDF 미리보기를 불러오지 못했습니다.') + '</div>'; });
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
  function renderPreviewTransform() {
    var p = state.preview, image = document.getElementById('iw-preview-image'), stage = document.getElementById('iw-preview-stage');
    if (!p || !image || !stage) return;
    var naturalW = image.naturalWidth || image.width || 1, naturalH = image.naturalHeight || image.height || 1;
    var rotated = p.rotate % 180 !== 0;
    var availW = Math.max(160, stage.clientWidth - 32), availH = Math.max(160, stage.clientHeight - 48);
    var fitW = rotated ? naturalH : naturalW, fitH = rotated ? naturalW : naturalH;
    var fitScale = Math.min(availW / fitW, availH / fitH, 1);
    var displayW = Math.max(1, Math.round(naturalW * fitScale * p.zoom));
    var displayH = Math.max(1, Math.round(naturalH * fitScale * p.zoom));
    image.style.width = displayW + 'px';
    image.style.height = displayH + 'px';
    image.style.transform = 'rotate(' + p.rotate + 'deg)';
    if (stage.scrollTop < 4) stage.scrollTop = 0;
  }
  function renderPdfPreview() {
    var p = state.preview, stage = document.getElementById('iw-preview-stage'); if (!p || !p.doc || !stage) return;
    var doc = p.doc, availW = Math.max(160, stage.clientWidth - 32), availH = Math.max(160, stage.clientHeight - 48);
    stage.innerHTML = '';
    var wraps = [];
    for (var n = 1; n <= p.pages; n++) {
      var wrap = document.createElement('div'); wrap.className = 'iw-preview-page-wrap'; wrap.setAttribute('data-page', String(n));
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
    var p = state.preview, stage = document.getElementById('iw-preview-stage'); if (!stage) return;
    var wrap = stage.querySelector('.iw-preview-page-wrap[data-page="' + pageNum + '"]'); if (!wrap) return;
    wrap.scrollIntoView({ behavior: 'auto', block: 'start' });
    if (!p) return;
    p.page = pageNum;
    var pageText = document.getElementById('iw-preview-page'); if (pageText) pageText.textContent = pageNum + ' / ' + p.pages;
    highlightPdfThumb();
  }
  function handlePreviewWheel(event) {
    if (!event.ctrlKey) return;
    event.preventDefault();
    previewZoom(event.deltaY < 0 ? 1 : -1);
  }
  function handlePreviewScroll() {
    var p = state.preview, stage = document.getElementById('iw-preview-stage');
    if (!p || p.type !== 'pdf' || !stage) return;
    var wraps = stage.querySelectorAll('.iw-preview-page-wrap'); if (!wraps.length) return;
    var stageTop = stage.getBoundingClientRect().top, closest = 1, closestDist = Infinity;
    Array.prototype.forEach.call(wraps, function (wrap) {
      var dist = Math.abs(wrap.getBoundingClientRect().top - stageTop);
      if (dist < closestDist) { closestDist = dist; closest = Number(wrap.getAttribute('data-page')); }
    });
    if (closest === p.page) return;
    p.page = closest;
    var pageText = document.getElementById('iw-preview-page'); if (pageText) pageText.textContent = p.page + ' / ' + p.pages;
    highlightPdfThumb();
  }
  function renderPdfThumbs() {
    var p = state.preview, box = document.getElementById('iw-preview-thumbs'), overlay = document.getElementById('iw-preview');
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
        btn.type = 'button'; btn.className = 'iw-preview-thumb'; btn.setAttribute('data-page', String(pageNum));
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
    var box = document.getElementById('iw-preview-thumbs'); if (!box) return;
    var page = state.preview && state.preview.page;
    Array.prototype.forEach.call(box.querySelectorAll('.iw-preview-thumb'), function (btn) { btn.classList.toggle('on', Number(btn.getAttribute('data-page')) === page); });
  }
  function closePreview() { var overlay = document.getElementById('iw-preview'), thumbs = document.getElementById('iw-preview-thumbs'); if (overlay) { overlay.classList.remove('open'); overlay.classList.remove('has-pages'); overlay.setAttribute('aria-hidden', 'true'); } if (thumbs) { thumbs.innerHTML = ''; thumbs.removeAttribute('data-rendered-for'); } state.preview = null; document.body.classList.remove('iw-preview-open'); }
  function previewZoom(direction) { var p = state.preview; if (!p) return; p.zoom = Math.min(4, Math.max(.5, p.zoom + direction * .25)); if (p.type === 'pdf') renderPdfPreview(); else renderPreviewTransform(); }
  function previewRotate() { var p = state.preview; if (!p) return; p.rotate = (p.rotate + 90) % 360; if (p.type === 'pdf') renderPdfPreview(); else renderPreviewTransform(); }
  function previewPage(direction) { var p = state.preview; if (!p || p.type !== 'pdf') return; var next = Math.min(p.pages, Math.max(1, p.page + direction)); if (next !== p.page) scrollToPreviewPage(next); }
  function canvasBlob(canvas) { return new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); }); }
  function closeDdakMenu() { var menu = document.getElementById('iw-preview-ddak-menu'), trigger = document.querySelector('.iw-ddak-wrap .iw-preview-ddak'); if (menu) menu.hidden = true; if (trigger) trigger.setAttribute('aria-expanded', 'false'); }
  function toggleDdakMenu(event) { if (event) event.stopPropagation(); var menu = document.getElementById('iw-preview-ddak-menu'), trigger = event && event.currentTarget; if (!menu) return; var open = menu.hidden; menu.hidden = !open; if (trigger) trigger.setAttribute('aria-expanded', String(open)); }
  function previewCopy() {
    var p = state.preview; if (!p) return;
    closeDdakMenu();
    var makeBlob = p.type === 'pdf' ? canvasBlob(document.querySelector('.iw-preview-page-wrap[data-page="' + p.page + '"] canvas')) : fetch(p.url).then(function (response) { return response.blob(); }).then(function (blob) { return createImageBitmap(blob); }).then(function (bitmap) { var canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height; canvas.getContext('2d').drawImage(bitmap, 0, 0); return canvasBlob(canvas); });
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
    var actions = (ownFile || item.image_url ? '<button type="button" class="iw-btn primary" onclick="OSInsuwork.openAssetPreview(\'' + esc(source) + '\',\'' + esc(id) + '\')">미리보기</button>' : (link ? '<a class="iw-btn primary" href="' + esc(link) + '" target="_blank" rel="noopener">파일 열기</a>' : ''))
      + '<button type="button" class="iw-btn" onclick="OSInsuwork.editAsset(\'' + esc(id) + '\')">수정</button>'
      + '<button type="button" class="iw-btn danger" onclick="OSInsuwork.deleteAsset(\'' + esc(id) + '\')">삭제</button>';
    var attachments = itemAttachments(id);
    var attachmentHtml = attachments.length ? '<div class="iw-detail-files"><strong>첨부파일 ' + attachments.length + '개</strong><div class="iw-detail-files-grid">' + attachments.map(function (file) {
      var type = previewType(file);
      if (type === 'image') {
        if (file.storage_path) return '<img class="iw-detail-thumb" data-storage-path="' + esc(file.storage_path) + '" data-file-title="' + esc(file.title) + '" data-file-mime="' + esc(file.mime_type || '') + '" alt="' + esc(file.title) + '">';
        return '<img class="iw-detail-thumb" src="' + esc(file.url) + '" alt="' + esc(file.title) + '" onclick="OSInsuwork.openUrlPreview(\'' + esc(jsString(file.url)) + '\',\'' + esc(jsString(file.title)) + '\',\'' + esc(jsString(file.mime_type || 'image/*')) + '\')">';
      }
      var href = file.storage_path ? '#' : esc(file.url || '#');
      return '<a href="' + href + '" data-storage-path="' + esc(file.storage_path || '') + '" data-file-title="' + esc(file.title) + '" data-file-mime="' + esc(file.mime_type || '') + '" target="_blank" rel="noopener"><span>' + (type === 'pdf' ? '▤' : '▣') + '</span><b>' + esc(file.title) + '</b><small>' + (type ? '미리보기 · ' : '') + formatBytes(file.file_size) + '</small></a>';
    }).join('') + '</div></div>' : '';
    var kind = source === 'scripts' ? '업무노트' : item.memo_text ? '메모' : '자료실';
    dialog('<div class="iw-detail"><span class="iw-badge">' + kind + '</span><h2 class="iw-detail-title">' + favoriteButton('asset', id, item.title || '(제목 없음)', kind + ' · ' + formatDate(item.created_at)) + '<span>' + esc(item.title || '(제목 없음)') + '</span></h2><small>' + formatDate(item.created_at) + '</small><div class="iw-detail-body iw-rich-content">' + linkifyRich(body) + '</div>' + attachmentHtml + '<div class="iw-detail-actions">' + actions + '</div></div>');
    hydrateRichStorage();
  }
  function showCustomer(id) {
    var customer = state.data.customers.find(function (entry) { return String(entry.id) === String(id); }); if (!customer) return;
    var history = state.data.consultations.filter(function (entry) { return String(entry.customer_id) === String(id); });
    dialog('<div class="iw-detail"><span class="iw-badge">고객</span><h2 class="iw-detail-title">' + favoriteButton('customer', id, customer.name || '(이름 없음)', phoneText(customer.phone || customer.phone_raw || '')) + '<span>' + esc(customer.name || '(이름 없음)') + '</span></h2><p>' + esc(customer.phone || customer.phone_raw || '') + '</p><h3>상담 기록</h3><div class="iw-list">' + (history.length ? history.map(function (entry) { return row(formatDate(entry.consulted_at || entry.created_at), entry.memo || '', esc(entry.channel || ''), ''); }).join('') : '<div class="iw-empty">상담 기록이 없습니다.</div>') + '</div></div>');
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
    if (event.event_type === 'insurance-age' && event.customer_id) { openCustomerFromEvent(event.customer_id); return; }
    var care = isCareTask(event);
    var kind = care ? '고객관리' : event.event_type === 'holiday' ? '공휴일' : event.event_type === 'term' ? '절기' : event.event_type === 'memorial' ? '기념일' : '일정';
    var sub = eventDateLabel(event.event_date, event.builtin ? '' : event.event_time, event.builtin ? '' : event.event_end_date, event.builtin ? '' : event.event_end_time);
    var editable = !event.builtin && !care;
    var done = !!event.completed_at;
    var actions = event.builtin ? '' : '<div class="iw-detail-actions"><button type="button" class="iw-btn danger" onclick="OSInsuwork.deleteEvent(\'' + esc(id) + '\')">삭제</button>' + (editable ? '<button type="button" class="iw-btn primary" onclick="OSInsuwork.editEvent(\'' + esc(id) + '\')">수정</button>' : '') + '<button type="button" class="iw-btn' + (done ? '' : ' primary') + '" onclick="OSInsuwork.toggleEventComplete(\'' + esc(id) + '\')">' + (done ? '완료 취소' : '완료 처리') + '</button></div>';
    var badge = care && event.customer_id ? '<button type="button" class="iw-badge iw-badge-link" onclick="OSInsuwork.openCustomerFromEvent(\'' + esc(event.customer_id) + '\')">' + kind + (done ? ' · 완료' : '') + '</button>' : '<span class="iw-badge">' + kind + (done ? ' · 완료' : '') + '</span>';
    dialog('<div class="iw-detail">' + badge + '<h2 class="iw-detail-title">' + (event.builtin ? '' : favoriteButton('event', id, event.title || '일정', sub)) + '<span>' + esc(event.title) + '</span></h2><p>' + esc(sub) + '</p><div class="iw-detail-body">' + esc(event.description || '') + '</div>' + actions + '</div>');
  }
  /* 2026-08-26 대표 확정 — 캘린더(월보기 상령일 단건 칩 직접클릭·이벤트 팝업 "고객관리" 배지)와
     통합검색 "고객" 결과가 전부 이 함수 하나로 수렴한다. 예전엔 customerNameQuery를 비워버려
     고객관리 리스트가 전체 121명 그대로 뜬 채 상세카드만 열렸다 — 이름을 채워 리스트도 그 1명으로
     좁혀지게(대표가 원한 "깔끔한 단일 결과" 화면) 한다. */
  function openCustomerFromEvent(customerId) {
    closeDialog();
    var customer = state.data.customers.find(function (entry) { return String(entry.id) === String(customerId); });
    state.customerStatusFilter = 'all'; state.customerNameQuery = customer ? (customer.name || '') : ''; state.selectedCustomerDetail = null;
    go('customers'); selectCustomerDetail(customerId);
  }

  function formField(label, input) { return '<label class="iw-field"><span>' + label + '</span>' + input + '</label>'; }
  /* 라벨-입력칸 한 줄 스타일(2026-08-20, 대표 확정) — 고객/상담 폼 전용. formField()는 다른 화면(자료실 등)에서도 쓰여서 그대로 두고, 여기서만 별도 헬퍼로 분리 */
  function inlineField(label, input) { return '<label class="iw-inline-field"><span>' + label + '</span>' + input + '</label>'; }
  function dateMaskInputHtml(id, value, context, extraAttrs) {
    return '<input' + (id ? ' id="' + id + '"' : '') + ' type="text" inputmode="numeric" maxlength="10" pattern="\\d{4}-\\d{2}-\\d{2}" placeholder="YYYY-MM-DD" autocomplete="off" value="' + esc(value || '') + '" oninput="OSInsuwork.formatBirthInput(this,\'' + esc(context || '') + '\')"' + (extraAttrs ? ' ' + extraAttrs : '') + '>';
  }
  /* 청약일자 다중 입력행(고객관리 전용, 2026-08-20) — DOM에서 직접 값을 수집/추가/삭제(별도 JS 배열 보관 없음). 좁은 폭(fit-content)으로 렌더되도록 CSS(.iw-contract-dates-*)가 잡아준다. */
  function contractDateRowHtml(date, ageContext) {
    return '<div class="iw-contract-date-row">' + dateMaskInputHtml('', date, ageContext, 'class="iw-contract-date-input" aria-label="청약일자"') + '<button type="button" class="iw-contract-date-del" aria-label="청약일자 삭제" onclick="OSInsuwork.removeContractDateRow(this)">×</button></div>';
  }
  function contractDatesField(prefix, dates, ageContext) {
    var list = dates && dates.length ? dates : [ymd(new Date())];
    var rows = list.map(function (date) { return contractDateRowHtml(date, ageContext); }).join('');
    return '<div class="iw-inline-row iw-contract-dates-field"><span class="iw-inline-row-label">청약일자</span><div class="iw-contract-dates-wrap"><div class="iw-contract-dates-list" id="' + prefix + '-appl-list" data-age-context="' + esc(ageContext || '') + '">' + rows + '</div><button type="button" class="iw-link-btn iw-contract-date-add" onclick="OSInsuwork.addContractDateRow(\'' + prefix + '\')">+ 청약추가</button></div></div>';
  }
  function addContractDateRow(prefix) {
    var box = document.getElementById(prefix + '-appl-list'); if (!box) return;
    box.insertAdjacentHTML('beforeend', contractDateRowHtml(ymd(new Date()), box.getAttribute('data-age-context'))); scheduleWorkDraft(box.closest('[data-work-draft-key]'));
  }
  function removeContractDateRow(button) {
    var row = button && button.closest ? button.closest('.iw-contract-date-row') : null; if (!row) return;
    var box = row.parentElement;
    row.remove();
    if (box && !box.children.length) box.insertAdjacentHTML('beforeend', contractDateRowHtml(ymd(new Date()), box.getAttribute('data-age-context'))); scheduleWorkDraft(box && box.closest('[data-work-draft-key]'));
  }
  function gatherContractDates(prefix) {
    var box = document.getElementById(prefix + '-appl-list'); if (!box) return [];
    var inputs = box.querySelectorAll('.iw-contract-date-input'), out = [];
    for (var i = 0; i < inputs.length; i++) { var v = String(inputs[i].value || '').trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(v)) out.push(v); }
    out = out.filter(function (d, i) { return out.indexOf(d) === i; });
    out.sort();
    return out;
  }
  function earliestContractDateValue(prefix) { var dates = gatherContractDates(prefix); return dates.length ? dates[0] : ''; }
  /* 2026-08-26 대표 확정 — 인수정보 "운전여부"를 자유입력에서 복수선택 드롭다운으로 전환.
     대표 지정 순서와 묶음(단독/승용차/화물차/이륜자동차/기타 장비)을 그대로 표시한다.
     저장값은 profile.driving_status에 문자열 배열로 저장(과거 자유입력 문자열이 남아 있어도
     drivingStatusArray()가 쉼표 분해로 흡수해 표시는 깨지지 않는다). */
  var DRIVING_OPTION_GROUPS = [['운전 안함'], ['자가용 승용차', '영업용 승용차'], ['자가용 화물차', '영업용 화물차'], ['자가용 이륜자동차', '영업용 이륜자동차'], ['건설기계', '농기계', '기타']];
  var DRIVING_OPTIONS = DRIVING_OPTION_GROUPS.reduce(function (out, group) { return out.concat(group); }, []);
  function drivingStatusArray(raw) {
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === 'string' && raw.trim()) return raw.split(',').map(function (entry) { return entry.trim(); }).filter(Boolean);
    return [];
  }
  function drivingFieldHtml(prefix, profile) {
    var selected = drivingStatusArray(profile.driving_status);
    var summary = selected.length ? selected.join(', ') : '선택하세요';
    var boxes = DRIVING_OPTION_GROUPS.map(function (group) {
      var separator = group.length > 2 ? ', ' : ' / ';
      var rowClass = group.length === 3 ? ' three' : group.length === 2 ? ' two' : ' one';
      return '<div class="iw-driving-row' + rowClass + '">' + group.map(function (option, index) {
        var sep = index ? '<span class="iw-driving-sep">' + esc(separator) + '</span>' : '';
        return sep + '<label class="iw-driving-option"><input type="checkbox" value="' + esc(option) + '"' + (selected.indexOf(option) >= 0 ? ' checked' : '') + ' onchange="OSInsuwork.drivingCheckChanged(this)"><span>' + esc(option) + '</span></label>';
      }).join('') + '</div>';
    }).join('');
    return '<div class="iw-driving-field">'
      + '<button type="button" class="iw-driving-toggle" onclick="OSInsuwork.toggleDrivingPanel(event,\'' + prefix + '\')" aria-haspopup="true" aria-expanded="false">' + esc(summary) + '</button>'
      + '<div class="iw-driving-panel" id="' + prefix + '-driving-panel" hidden>' + boxes + '</div>'
      + '</div>';
  }
  function toggleDrivingPanel(event, prefix) {
    if (event) event.stopPropagation();
    var panel = document.getElementById(prefix + '-driving-panel'); if (!panel) return;
    var opening = panel.hidden;
    document.querySelectorAll('.iw-driving-panel').forEach(function (p) { p.hidden = true; });
    panel.hidden = !opening;
    var btn = event && event.currentTarget; if (btn) btn.setAttribute('aria-expanded', String(opening));
  }
  function drivingCheckChanged(checkbox) {
    var panel = checkbox.closest('.iw-driving-panel'); if (!panel) return;
    var boxes = Array.prototype.slice.call(panel.querySelectorAll('input[type="checkbox"]'));
    var selected = boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
    var toggle = panel.parentElement && panel.parentElement.querySelector('.iw-driving-toggle');
    if (toggle) toggle.textContent = selected.length ? selected.join(', ') : '선택하세요';
  }
  function drivingStatusValues(prefix) {
    var panel = document.getElementById(prefix + '-driving-panel'); if (!panel) return [];
    return Array.prototype.slice.call(panel.querySelectorAll('input[type="checkbox"]:checked')).map(function (b) { return b.value; });
  }
  function customerExtraFieldsHtml(profile, prefix) {
    profile = profile || {};
    return '<div class="iw-customer-extra"><section><h3>주소 정보</h3>'
      + '<div class="iw-inline-row iw-customer-address-row"><span class="iw-inline-row-label">주소</span><div class="iw-customer-address">'
      + '<input id="' + prefix + '-zip" class="iw-customer-zip-input" placeholder="우편번호" value="' + esc(profile.zip || '') + '" readonly onclick="OSInsuwork.searchCustomerAddress(\'' + prefix + '\')">'
      + '<input id="' + prefix + '-address" class="iw-customer-address-input" placeholder="주소" value="' + esc(profile.address || '') + '" readonly onclick="OSInsuwork.searchCustomerAddress(\'' + prefix + '\')">'
      + '<button type="button" class="iw-link-btn" onclick="OSInsuwork.searchCustomerAddress(\'' + prefix + '\')">주소검색</button>'
      + '</div></div>'
      + '<div id="' + prefix + '-postcode-wrap" class="iw-postcode-wrap" hidden><div class="iw-postcode-head"><strong>도로명 주소 검색</strong><button type="button" class="iw-link-btn" onclick="OSInsuwork.closeCustomerAddress(\'' + prefix + '\')">닫기</button></div><div id="' + prefix + '-postcode" class="iw-postcode-embed"></div></div>'
      + inlineField('상세주소', '<input id="' + prefix + '-address-detail" placeholder="동·호수 등 상세 주소 (주소 선택 후 입력)" value="' + esc(profile.address_detail || '') + '">')
      + '</section><section><h3>인수 정보</h3><div class="iw-customer-underwriting">'
      + inlineField('직업', '<input id="' + prefix + '-job" value="' + esc(profile.job || '') + '" placeholder="예: 사무직 / 운전직 / 농업">')
      + inlineField('운전여부', drivingFieldHtml(prefix, profile))
      + inlineField('병력', '<input id="' + prefix + '-history" value="' + esc(profile.medical_history || '') + '" placeholder="예: 갑상선 결절 / 고혈압 / 당뇨">')
      + inlineField('약복용', '<select id="' + prefix + '-medication"><option value="">선택</option><option' + (profile.medication === '복용 중' ? ' selected' : '') + '>복용 중</option><option' + (profile.medication === '복용 안 함' ? ' selected' : '') + '>복용 안 함</option><option' + (profile.medication === '과거 복용' ? ' selected' : '') + '>과거 복용</option></select>')
      + inlineField('진단시기', '<input id="' + prefix + '-diagnosis" value="' + esc(profile.diagnosis_date || '') + '" placeholder="예: 2025년 3월">')
      + inlineField('현재상태', '<input id="' + prefix + '-current-status" value="' + esc(profile.current_condition || '') + '" placeholder="예: 추적관찰 중 / 수술 완료">')
      + '</div></section></div>';
  }
  function formShell(title, body, saveAction) { return '<form class="iw-form" onsubmit="event.preventDefault();' + saveAction + '"><h2>' + title + '</h2>' + body + '<div class="iw-form-actions"><button type="button" class="iw-btn" onclick="OSInsuwork.closeDialog()">취소</button><button type="submit" class="iw-btn primary">저장</button></div></form>'; }
  function write(path, body) { return window.db.fetch('/rest/v1/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify(body) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return true; }); }
  function writeOne(path, body) { return window.db.fetch('/rest/v1/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(body) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return response.json(); }).then(function (rows) { if (!Array.isArray(rows) || !rows[0]) throw new Error('저장 결과를 확인하지 못했습니다.'); return rows[0]; }); }
  function update(path, body) { return window.db.fetch('/rest/v1/' + path, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify(body) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return true; }); }
  function updateOne(path, body) { return window.db.fetch('/rest/v1/' + path, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify(body) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return response.json(); }).then(function (rows) { if (!Array.isArray(rows) || rows.length !== 1) throw new Error('수정 권한을 확인하지 못했습니다. 다시 로그인한 뒤 시도해 주세요.'); return rows[0]; }); }
  function softDelete(path) { return window.db.fetch('/rest/v1/' + path, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify({ deleted_at: new Date().toISOString() }) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return response.json(); }).then(function (rows) { if (!Array.isArray(rows) || rows.length !== 1) throw new Error('삭제 권한을 확인하지 못했습니다. 다시 로그인한 뒤 시도해 주세요.'); return true; }); }
  function deleteOne(path) { return window.db.fetch('/rest/v1/' + path, { method: 'DELETE', headers: { Prefer: 'return=representation' } }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return response.json(); }).then(function (rows) { if (!Array.isArray(rows) || rows.length !== 1) throw new Error('삭제 권한을 확인하지 못했습니다. 다시 로그인한 뒤 시도해 주세요.'); return rows[0]; }); }
  function softDeleteChildren(parentId) { return window.db.fetch('/rest/v1/insuwork_items?parent_id=eq.' + encodeURIComponent(parentId) + '&owner_id=eq.' + encodeURIComponent(currentUserId()) + '&deleted_at=is.null', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }, body: JSON.stringify({ deleted_at: new Date().toISOString() }) }).then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return true; }); }
  function finishSave(message) { var draftRoot = document.querySelector('#iw-dialog [data-work-draft-key]') || document.querySelector('.iw-consult-detail[data-work-draft-key]'); if (draftRoot) clearWorkDraft(draftRoot.dataset.workDraftKey); forceCloseDialog(); state.query = ''; var input = document.getElementById('iw-search-input'); if (input) input.value = ''; rebuildWorkspaceDerived(); renderContent(); if (typeof window.toast === 'function') window.toast(message); }
  function saveError(error) { briefingAlert('저장하지 못했습니다.\n' + (error && error.message ? error.message : error), '저장 실패'); }
  function legacy(key) { if (STANDALONE) { window.location.href = '/insu/?view=' + encodeURIComponent(key); return; } if (window.showView) window.showView(key); }
  function addAsset() { resetRichPending(); var category = currentAssetCategory(), selected = category === 'memo' ? 'memo' : category === 'file' ? 'link' : 'note'; dialog(formShell('자료 추가', formField('종류', '<select id="iwf-asset-type"><option value="note"' + (selected === 'note' ? ' selected' : '') + '>업무노트</option><option value="memo"' + (selected === 'memo' ? ' selected' : '') + '>메모</option><option value="link"' + (selected === 'link' ? ' selected' : '') + '>링크 자료</option></select>') + formField('제목', '<input id="iwf-title" required autocomplete="off" onkeydown="if(event.key===\'Enter\'||(event.key===\'Tab\'&&!event.shiftKey)){event.preventDefault();OSInsuwork.focusRich(\'iwf-body\')}">') + formField('내용', richEditorField('iwf-body', '')) + formField('링크 (선택)', '<input id="iwf-link" type="url" placeholder="https://">') + formField('공개 범위', '<select id="iwf-visibility"><option value="private">나만 보기</option><option value="public">로그인 사용자 전체 공개</option></select>'), 'OSInsuwork.saveAsset()')); var title = document.getElementById('iwf-title'); if (title) title.focus(); }
  function editAsset(id) {
    var item = workspaceItem(id); if (!item || item.item_type === 'folder') return;
    resetRichPending();
    var fileOnly = item.item_type === 'file';
    var fields = formField('제목', '<input id="iwf-edit-title" required autocomplete="off" value="' + esc(item.title || '') + '" onkeydown="if(event.key===\'Enter\'||(event.key===\'Tab\'&&!event.shiftKey)){if(document.getElementById(\'iwf-edit-body\')){event.preventDefault();OSInsuwork.focusRich(\'iwf-edit-body\')}}">');
    if (fileOnly) fields += '<p class="iw-form-note">업로드 파일은 표시 이름을 수정할 수 있습니다.</p>'
      + formField('공개 범위', '<select id="iwf-edit-visibility"><option value="private"' + (item.visibility !== 'public' ? ' selected' : '') + '>나만 보기</option><option value="public"' + (item.visibility === 'public' ? ' selected' : '') + '>로그인 사용자 전체 공개</option></select>');
    else fields += formField('내용', richEditorField('iwf-edit-body', item.body || ''))
      + formField('링크 (선택)', '<input id="iwf-edit-link" type="url" placeholder="https://" value="' + esc(item.url || '') + '">')
      + formField('공개 범위', '<select id="iwf-edit-visibility"><option value="private"' + (item.visibility !== 'public' ? ' selected' : '') + '>나만 보기</option><option value="public"' + (item.visibility === 'public' ? ' selected' : '') + '>로그인 사용자 전체 공개</option></select>');
    dialog(formShell('자료 수정', fields, 'OSInsuwork.saveAssetEdit(\'' + esc(id) + '\')'));
    var editTitle = document.getElementById('iwf-edit-title'); if (editTitle) { editTitle.focus(); editTitle.select(); }
    hydrateRichStorage();
  }
  function saveAssetEdit(id) {
    var item = workspaceItem(id), title = value('iwf-edit-title'); if (!item) return; if (!title) { briefingAlert('제목을 입력해 주세요.'); return; }
    var changes = { title: title };
    if (item.item_type !== 'file') {
      var body = richValue('iwf-edit-body'); if (!richHasText(body) && !(item.item_type === 'link' && value('iwf-edit-link'))) { briefingAlert('내용을 입력해 주세요.'); return; }
      var category = assetCategory(item);
      prepareRichUploads(id, body, category).then(function (prepared) {
        changes.body = prepared.body; changes.url = value('iwf-edit-link') || null; changes.visibility = value('iwf-edit-visibility') === 'public' ? 'public' : 'private';
        return updateOne('insuwork_items?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()) + '&deleted_at=is.null', changes)
          .then(function (updated) { return saveRichChildren(prepared.rows).then(function () { return updated; }); });
      }).then(function (updated) { upsertWorkspaceItem(updated); resetRichPending(); finishSave('자료를 수정했습니다.'); }).catch(saveError);
      return;
    }
    changes.visibility = value('iwf-edit-visibility') === 'public' ? 'public' : 'private';
    updateOne('insuwork_items?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()) + '&deleted_at=is.null', changes)
      .then(function (updated) { upsertWorkspaceItem(updated); finishSave('자료를 수정했습니다.'); }).catch(saveError);
  }
  function deleteAsset(id) {
    var item = workspaceItem(id); if (!item || item.item_type === 'folder') return;
    briefingConfirm('“' + String(item.title || '제목 없음') + '” 자료를 삭제할까요?', '자료 삭제', '삭제', true).then(function (ok) {
      if (!ok) return;
      var childIds = state.data.items.filter(function (entry) { return String(entry.parent_id || '') === String(id); }).map(function (entry) { return entry.id; });
      softDeleteChildren(id).then(function () { return softDelete('insuwork_items?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()) + '&deleted_at=is.null'); })
        .then(function () { closeDialog(); closePreview(); removeWorkspaceItemsLocal(childIds.concat([id])); renderContent(); if (typeof window.toast === 'function') window.toast('자료를 삭제했습니다.'); }).catch(saveError);
    });
  }
  function openVault() {
    dialog('<div class="iw-vault"><div class="iw-vault-head"><div><h2>내 파일함</h2><p>사이트에 저장된 파일과 폴더입니다. PC 원본은 변경하지 않습니다.</p></div><div class="iw-actions"><button class="iw-btn" onclick="OSInsuwork.newFolder()">+ 새 폴더</button><label class="iw-btn primary">+ 파일<input id="iw-vault-picker" type="file" multiple hidden onchange="OSInsuwork.uploadFiles(this.files)"></label></div></div><div id="iw-vault-content" class="iw-vault-content"><div class="iw-loading">파일함을 불러오는 중입니다.</div></div></div>');
    api('insuwork_items?owner_id=eq.' + encodeURIComponent(currentUserId()) + '&item_type=in.(folder,file)&deleted_at=is.null' + personalItemScope() + '&order=created_at.desc&limit=10000&select=*').then(function (items) { state.vaultFolders = items.filter(function (item) { return item.item_type === 'folder'; }); state.vaultFiles = items.filter(function (item) { return item.item_type === 'file'; }); renderVault(); }).catch(function () { var content = document.getElementById('iw-vault-content'); if (content) content.innerHTML = '<div class="iw-error">파일함을 불러오지 못했습니다.</div>'; });
  }
  function renderVault() { var content = document.getElementById('iw-vault-content'); if (!content) return; var folders = state.vaultFolders || [], files = state.vaultFiles || []; content.innerHTML = '<div class="iw-vault-grid">' + folders.map(function (folder) { return '<div class="iw-file-card folder"><span>📁</span><b>' + esc(folder.title) + '</b><small>폴더</small></div>'; }).concat(files.map(function (file) { return '<div class="iw-file-card"><span>📄</span><b>' + esc(file.title) + '</b><small>' + esc((file.extension || '파일').toUpperCase()) + ' · ' + formatDate(file.created_at) + '</small></div>'; })).join('') + '</div>' + ((!folders.length && !files.length) ? '<div class="iw-empty">저장된 파일이 없습니다.</div>' : ''); }
  function newFolder() { briefingPrompt('새 폴더 이름을 입력하세요.', '새 폴더').then(function (name) { if (name == null || !String(name).trim()) return; writeOne('insuwork_items', { owner_id: currentUserId(), parent_id: null, item_type: 'folder', title: String(name).trim(), visibility: 'private' }).then(function (created) { upsertWorkspaceItem(created); openVault(); }).catch(saveError); }); }
  function uploadFiles(files) { var list = Array.prototype.slice.call(files || []); if (!list.length) return; var token = window.db.getToken(), owner = currentUserId(); Promise.all(list.map(function (file) { var id = crypto.randomUUID(), dot = file.name.lastIndexOf('.'), ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : '', path = owner + '/root/' + id + (ext ? '.' + ext.replace(/[^a-z0-9]/g, '') : ''); var row = { id: id, owner_id: owner, item_type: 'file', title: file.name, storage_path: path, mime_type: file.type || null, extension: ext || null, file_size: file.size, visibility: 'private', created_at: new Date().toISOString() }; return fetch(window.db.url('/storage/v1/object/myspace/' + path.split('/').map(encodeURIComponent).join('/')), { method: 'POST', headers: { apikey: window.db.key, Authorization: 'Bearer ' + token, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' }, body: file }).then(function (response) { if (!response.ok) throw new Error(file.name + ' 업로드 실패'); return write('insuwork_items', row).then(function () { return row; }); }); })).then(function (rows) { rows.forEach(upsertWorkspaceItem); openVault(); }).catch(saveError); }
  function closeAssetMenu() { var menu = document.querySelector('#v-insuwork .iw-add-menu'); if (menu) menu.open = false; }
  function newAssetFolder() {
    closeAssetMenu();
    var category = currentAssetCategory();
    var categoryField = category
      ? '<input id="iwf-folder-category" type="hidden" value="' + esc(category) + '"><p class="iw-folder-destination">저장 위치 · ' + esc(assetCategoryLabel(category)) + (state.assetFolder ? ' / 현재 폴더' : '') + '</p>'
      : formField('저장 위치', '<select id="iwf-folder-category" required><option value="note">업무노트</option><option value="file">자료실</option><option value="memo">메모</option></select>');
    dialog(formShell('새 폴더', categoryField + formField('폴더 이름', '<input id="iwf-folder-name" required autocomplete="off">'), 'OSInsuwork.saveAssetFolder()'));
    window.setTimeout(function () { var input = document.getElementById('iwf-folder-name'); if (input) input.focus(); }, 0);
  }
  function saveAssetFolder() {
    var name = value('iwf-folder-name'), category = value('iwf-folder-category');
    if (!name || ['note', 'file', 'memo'].indexOf(category) < 0) return;
    var parent = state.assetFolder && currentAssetCategory() === category ? state.assetFolder : null;
    writeOne('insuwork_items', { owner_id: currentUserId(), parent_id: parent, item_type: 'folder', title: name, visibility: 'private', legacy_payload: { workspace_category: category } })
      .then(function (created) { upsertWorkspaceItem(created); closeDialog(); state.assetFilter = category; state.assetFolder = parent; renderContent(); if (typeof window.toast === 'function') window.toast(assetCategoryLabel(category) + '에 폴더를 만들었습니다.'); }).catch(saveError);
  }
  function deleteAssetFolder(id) {
    var folder = state.data.library.find(function (item) { return String(item.id) === String(id) && item.item_type === 'folder'; });
    if (!folder) return;
    var hasChildren = state.data.items.some(function (item) { return !item.deleted_at && String(item.parent_id || '') === String(id); });
    if (hasChildren) { briefingAlert('폴더 안의 자료와 하위 폴더를 먼저 비워주세요.'); return; }
    briefingConfirm('“' + String(folder.title || '폴더') + '” 폴더를 삭제할까요?', '폴더 삭제', '삭제', true).then(function (ok) {
      if (!ok) return;
      var category = assetCategory(folder);
      softDelete('insuwork_items?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()))
        .then(function () { removeWorkspaceItemsLocal([id]); state.assetFolder = null; state.assetFilter = category; renderContent(); if (typeof window.toast === 'function') window.toast('폴더를 삭제했습니다.'); }).catch(saveError);
    });
  }
  function externalFileDrag(event) { return !!(event.dataTransfer && event.dataTransfer.types && Array.prototype.indexOf.call(event.dataTransfer.types, 'Files') >= 0); }
  function setAssetDropOverlay(show, message) {
    var overlay = document.getElementById('iw-asset-drop-overlay');
    if (!overlay) return;
    overlay.classList.toggle('on', !!show); overlay.setAttribute('aria-hidden', String(!show));
    var strong = overlay.querySelector('strong'); if (strong && message) strong.textContent = message;
  }
  function bindAssetWorkspaceDrop() {
    var view = document.getElementById('v-insuwork'); if (!view || view._assetExternalDropBound) return;
    view._assetExternalDropBound = true;
    view.addEventListener('dragenter', function (event) {
      if (state.section !== 'assets' || !externalFileDrag(event)) return;
      event.preventDefault(); state.externalDragDepth = (state.externalDragDepth || 0) + 1; setAssetDropOverlay(true, '폴더와 파일을 여기에 놓으세요');
    });
    view.addEventListener('dragover', function (event) {
      if (state.section !== 'assets' || !externalFileDrag(event)) return;
      event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    });
    view.addEventListener('dragleave', function (event) {
      if (state.section !== 'assets' || !externalFileDrag(event)) return;
      state.externalDragDepth = Math.max(0, (state.externalDragDepth || 1) - 1); if (!state.externalDragDepth) setAssetDropOverlay(false);
    });
    view.addEventListener('drop', function (event) {
      if (state.section !== 'assets' || !externalFileDrag(event)) return;
      event.preventDefault(); state.externalDragDepth = 0; setAssetDropOverlay(false); importExternalAssetDrop(event.dataTransfer);
    });
  }
  function readAllDirectoryEntries(entry) {
    return new Promise(function (resolve, reject) {
      var reader = entry.createReader(), found = [];
      function next() { reader.readEntries(function (rows) { if (!rows.length) { resolve(found); return; } found = found.concat(Array.prototype.slice.call(rows)); next(); }, reject); }
      next();
    });
  }
  function collectDroppedEntry(entry, parents, folders, files) {
    if (entry.isFile) return new Promise(function (resolve, reject) { entry.file(function (file) { files.push({ file: file, parents: parents.slice() }); resolve(); }, reject); });
    if (!entry.isDirectory) return Promise.resolve();
    var nextParents = parents.concat([entry.name]); folders.push(nextParents);
    return readAllDirectoryEntries(entry).then(function (children) { return Promise.all(children.map(function (child) { return collectDroppedEntry(child, nextParents, folders, files); })); });
  }
  function droppedTree(dataTransfer) {
    var folders = [], files = [], items = Array.prototype.slice.call(dataTransfer && dataTransfer.items || []), entries = items.map(function (item) { return item.webkitGetAsEntry ? item.webkitGetAsEntry() : null; }).filter(Boolean);
    if (!entries.length) return Promise.resolve({ folders: folders, files: Array.prototype.slice.call(dataTransfer && dataTransfer.files || []).map(function (file) { return { file: file, parents: [] }; }) });
    return Promise.all(entries.map(function (entry) { return collectDroppedEntry(entry, [], folders, files); })).then(function () { return { folders: folders, files: files }; });
  }
  function uploadAssetFile(file, category, parent) {
    var token = window.db.getToken(), owner = currentUserId(), folderPath = parent || category;
    var id = crypto.randomUUID(), dot = file.name.lastIndexOf('.'), ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : '', path = owner + '/' + folderPath + '/' + id + (ext ? '.' + ext.replace(/[^a-z0-9]/g, '') : '');
    var row = { id: id, owner_id: owner, parent_id: parent, item_type: 'file', title: file.name, storage_path: path, mime_type: file.type || null, extension: ext || null, file_size: file.size, visibility: 'private', legacy_payload: { workspace_category: category }, created_at: new Date().toISOString() };
    return fetch(window.db.url('/storage/v1/object/myspace/' + path.split('/').map(encodeURIComponent).join('/')), { method: 'POST', headers: { apikey: window.db.key, Authorization: 'Bearer ' + token, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' }, body: file }).then(function (response) { if (!response.ok) throw new Error(file.name + ' 업로드 실패'); return write('insuwork_items', row).then(function () { return row; }); });
  }
  function importExternalAssetDrop(dataTransfer, categoryOverride, parentOverride) {
    if (state.externalImporting) return;
    var category = categoryOverride || currentAssetCategory() || 'file';
    var baseParent = parentOverride !== undefined ? parentOverride : (state.assetFolder && currentAssetCategory() === category ? state.assetFolder : null);
    state.externalImporting = true; setAssetDropOverlay(true, '폴더 구조를 복사하는 중입니다…');
    droppedTree(dataTransfer).then(function (tree) {
      if (!tree.folders.length && !tree.files.length) throw new Error('복사할 파일을 찾지 못했습니다.');
      var folderIds = {}, ordered = tree.folders.slice().sort(function (a, b) { return a.length - b.length; });
      return ordered.reduce(function (promise, parts) {
        return promise.then(function () {
          var key = parts.join('/'), parentKey = parts.slice(0, -1).join('/'), parent = parentKey ? folderIds[parentKey] : baseParent;
          return writeOne('insuwork_items', { owner_id: currentUserId(), parent_id: parent || null, item_type: 'folder', title: parts[parts.length - 1], visibility: 'private', legacy_payload: { workspace_category: category } }).then(function (created) { folderIds[key] = created.id; upsertWorkspaceItem(created); });
        });
      }, Promise.resolve()).then(function () {
        setAssetDropOverlay(true, '파일 ' + tree.files.length + '개를 복사하는 중입니다…');
        return Promise.all(tree.files.map(function (entry) { var parent = entry.parents.length ? folderIds[entry.parents.join('/')] : baseParent; return uploadAssetFile(entry.file, category, parent || null); }));
      }).then(function (rows) { rows.forEach(upsertWorkspaceItem); return { folders: ordered.length, files: rows.length }; });
    }).then(function (count) {
      state.assetFilter = category; state.assetFolder = baseParent || null; rebuildWorkspaceDerived(); renderContent();
      if (typeof window.toast === 'function') window.toast('폴더 ' + count.folders + '개와 파일 ' + count.files + '개를 복사했습니다.');
    }).catch(saveError).finally(function () { state.externalImporting = false; setAssetDropOverlay(false); });
  }
  function assetDragStart(event, id, category) {
    state.draggingAsset = { id: String(id), category: String(category) };
    if (fileDragPayload(event, id) && event.currentTarget) event.currentTarget.classList.add('is-dragging');
  }
  function assetDragEnd(event) {
    state.draggingAsset = null;
    if (event && event.currentTarget) event.currentTarget.classList.remove('is-dragging');
    document.querySelectorAll('#v-insuwork .is-drag-over').forEach(function (element) { element.classList.remove('is-drag-over'); });
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
    var droppedItems = Array.prototype.slice.call(event.dataTransfer && event.dataTransfer.items || []);
    var hasDirectory = droppedItems.some(function (item) { var entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null; return !!(entry && entry.isDirectory); });
    if (hasDirectory) { importExternalAssetDrop(event.dataTransfer, String(folderCategory), String(folderId)); return; }
    var files = event.dataTransfer && event.dataTransfer.files ? Array.prototype.slice.call(event.dataTransfer.files) : [];
    if (files.length) { performAssetFileUpload(files, String(folderCategory), String(folderId)); return; }
    var dragging = state.draggingAsset;
    state.draggingAsset = null;
    if (!dragging || dragging.id === String(folderId)) return;
    if (dragging.category !== String(folderCategory)) { if (typeof window.toast === 'function') window.toast('같은 분류의 폴더로만 이동할 수 있습니다.'); return; }
    window.db.fetch('/rest/v1/insuwork_items?id=eq.' + encodeURIComponent(dragging.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' }, body: JSON.stringify({ parent_id: String(folderId) }) })
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
      dialog(formShell('파일 업로드', formField('저장 위치', '<select id="iwf-upload-category" required><option value="note">업무노트</option><option value="file">자료실</option><option value="memo">메모</option></select>') + '<p class="iw-folder-destination">선택한 파일 ' + list.length + '개</p>', 'OSInsuwork.confirmAssetFileUpload()'));
      return;
    }
    performAssetFileUpload(list, category);
  }
  function confirmAssetFileUpload() {
    var category = value('iwf-upload-category'), list = state.pendingAssetFiles || [];
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
        return write('insuwork_items', row).then(function () { return row; });
      });
    })).then(function (rows) { rows.forEach(upsertWorkspaceItem); state.assetFilter = category; state.assetFolder = parent; renderContent(); if (typeof window.toast === 'function') window.toast(assetCategoryLabel(category) + '에 파일 ' + list.length + '개를 추가했습니다.'); }).catch(saveError);
  }
  function addCustomer() {
    var statuses = CUSTOMER_STAGES.map(function (stage) { return stage.key; });
    var form = '<div class="iw-consult-registration iw-customer-registration">'
      + customerOcrHtml()
      + '<div class="iw-inline-form-block">'
      + contractDatesField('iwf-customer', [ymd(new Date())], 'customer')
      + '<div class="iw-inline-form-row">'
      + inlineField('이름', '<input id="iwf-customer-name" required autocomplete="name">')
      + inlineField('생년월일', '<div class="iw-birth-age">' + dateMaskInputHtml('iwf-customer-birth', '', 'customer') + '<span id="iwf-customer-insurance-age">보험나이 -</span></div>')
      + '<div class="iw-gender" role="radiogroup" aria-label="성별"><label><input type="radio" name="iwf-customer-gender" value="남">남</label><label><input type="radio" name="iwf-customer-gender" value="여">여</label></div>'
      + '</div><div class="iw-inline-form-row">'
      + inlineField('전화번호', '<input id="iwf-customer-phone" inputmode="numeric" autocomplete="tel" oninput="OSInsuwork.formatConsultPhone(this)">')
      + inlineField('고객상태', '<select id="iwf-customer-status">' + statuses.map(function (entry) { return '<option>' + entry + '</option>'; }).join('') + '</select>')
      + '</div></div>'
      + customerExtraFieldsHtml({}, 'iwf-customer')
      + '<div class="iw-consult-editor">' + formField('고객내용', richEditorField('iwf-customer-note', '')) + '</div></div>';
    resetRichPending(); dialog(formShell('고객 등록', form, 'OSInsuwork.saveCustomer()')); refreshCustomerInsuranceAge(); bindCustomerOcr(); bindWorkDraft(document.querySelector('#iw-dialog .iw-form'), workDraftKey('customer', 'new')); refreshCustomerInsuranceAge();
  }
  var customerOcrPending = { base64: '', mime: '' };
  function customerOcrHtml() {
    return '<div class="iw-ocr"><div class="iw-ocr-hint">고객정보 캡처를 <b>Ctrl+V</b>로 붙여넣으면 자동 입력됩니다. <span class="iw-ocr-stat" id="iw-ocr-stat"></span></div></div>';
  }
  function bindCustomerOcr() {
    customerOcrPending = { base64: '', mime: '' };
    var box = document.getElementById('iw-dialog'); if (!box || box._ocrBound) return; box._ocrBound = true;
    box.addEventListener('paste', function (event) {
      if (!document.getElementById('iw-ocr-stat')) return;   /* 고객등록 폼이 열려 있을 때만 반응 */
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
    if (!customerOcrPending.base64) { briefingAlert('먼저 고객정보 화면 캡처를 붙여넣어 주세요 (Ctrl+V).'); return; }
    var stat = document.getElementById('iw-ocr-stat'); if (stat) stat.textContent = '읽는 중…';
    if (!window.db || !window.db.fetch) { if (stat) stat.textContent = '연결 오류'; return; }
    window.db.fetch('/functions/v1/gemini-customer-ocr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: customerOcrPending.base64, mimeType: customerOcrPending.mime }) })
      .then(function (response) { return response.json().then(function (body) { return { ok: response.ok, body: body }; }); })
      .then(function (result) {
        if (!result.ok) { if (stat) stat.textContent = (result.body && result.body.error) || '추출 실패'; return; }
        var d = result.body || {};
        if (d.name) setValue('iwf-customer-name', d.name);
        if (d.phone) setValue('iwf-customer-phone', phoneText(d.phone));
        if (d.birth_date) setValue('iwf-customer-birth', d.birth_date);
        if (d.gender) setCustomerRadio('iwf-customer-gender', d.gender);
        if (d.address) setValue('iwf-customer-address', d.address);
        if (d.job) setValue('iwf-customer-job', d.job);
        if (d.medication) setCustomerSelectExact('iwf-customer-medication', d.medication);
        if (d.medical_history) setValue('iwf-customer-history', d.medical_history);
        if (d.diagnosis_date) setValue('iwf-customer-diagnosis', d.diagnosis_date);
        if (d.current_status) setValue('iwf-customer-current-status', d.current_status);
        refreshCustomerInsuranceAge();
        if (stat) stat.textContent = '반영됨 — 확인·수정 후 저장하세요'; scheduleWorkDraft(document.querySelector('#iw-dialog [data-work-draft-key]'));
      })
      .catch(function (error) { if (stat) stat.textContent = '오류: ' + (error && error.message || error); });
  }
  function setValue(id, value) { var el = document.getElementById(id); if (el) el.value = value; }
  function customerOptions() { return state.data.customers.map(function (item) { return '<option value="' + esc(item.id) + '">' + esc(item.name || '이름 없음') + '</option>'; }).join(''); }
  function consultationForm(item, customer) {
    item = item || {}; customer = customer || {}; var profile = customerProfile(customer), date = String(item.consulted_at || ymd(new Date())).slice(0, 10), status = consultationStatus(item, customer);
    var statuses = ['예약', '진행중', '제안서발송', '클로징', '청약완료', '보류', '종결'];
    return '<div class="iw-consult-registration"><div class="iw-inline-form-block">'
      + '<div class="iw-inline-form-row">' + inlineField('등록일자', dateMaskInputHtml('iwf-consult-date', date, '', 'required')) + '</div>'
      + '<div class="iw-inline-form-row">'
      + inlineField('이름', '<input id="iwf-consult-name" required autocomplete="name" value="' + esc(customer.name || '') + '">')
      + inlineField('생년월일', '<div class="iw-birth-age">' + dateMaskInputHtml('iwf-consult-birth', profile.birth_date || '', 'form') + '<span id="iwf-insurance-age">보험나이 -</span></div>')
      + '<div class="iw-gender" role="radiogroup" aria-label="성별"><label><input type="radio" name="iwf-consult-gender" value="남"' + (profile.gender === '남' ? ' checked' : '') + '>남</label><label><input type="radio" name="iwf-consult-gender" value="여"' + (profile.gender === '여' ? ' checked' : '') + '>여</label></div>'
      + '</div><div class="iw-inline-form-row">'
      + inlineField('전화번호', '<input id="iwf-consult-phone" inputmode="numeric" autocomplete="tel" value="' + esc(phoneText(customer.phone || customer.phone_raw || '')) + '" oninput="OSInsuwork.formatConsultPhone(this)">')
      + inlineField('상담상태', '<select id="iwf-consult-status" onchange="OSInsuwork.consultationStatusChanged(this,\'form\')">' + statuses.map(function (entry) { return '<option value="' + entry + '"' + (entry === status ? ' selected' : '') + '>' + entry + '</option>'; }).join('') + '</select>')
      + '</div></div>'
      + '<div class="iw-consult-editor">' + formField('상담내용', richEditorField('iwf-consult-memo', item.memo || '')) + '<p class="iw-consult-editor-note">웹 주소를 붙여 넣으면 바로 열 수 있는 링크로 저장됩니다. 여러 파일을 한 번에 첨부할 수 있습니다.</p>' + consultationExistingAttachments(item.id) + '</div>'
      + '<input id="iwf-consult-customer-id" type="hidden" value="' + esc(customer.id || '') + '"><input id="iwf-consult-id" type="hidden" value="' + esc(item.id || '') + '"></div>';
  }
  function consultationAttachmentRoot(consultationId) { return (state.data.items || []).find(function (entry) { var payload = entry.legacy_payload || {}; return payload.workspace_category === 'consultation' && payload.attachment_root === true && String(payload.consultation_id || '') === String(consultationId || ''); }); }
  function customerAttachmentRoot(customerId) { return (state.data.items || []).find(function (entry) { var payload = entry.legacy_payload || {}; return payload.workspace_category === 'customer' && payload.attachment_root === true && String(payload.customer_id || '') === String(customerId || ''); }); }
  /* 첨부파일 목록 항목(2026-08-20, 대표 확정) — 이름수정·삭제 버튼 추가. 기존 자료실의
     editAsset/deleteAsset(insuwork_items 공용 함수)를 그대로 재사용 — 첨부파일도 같은
     insuwork_items 테이블 행이라 새 함수 없이 그대로 동작. */
  function attachmentItemHtml(file) {
    return '<span class="iw-att-item"><a href="#" data-storage-path="' + esc(file.storage_path || '') + '" data-file-title="' + esc(file.title || '첨부파일') + '" data-file-mime="' + esc(file.mime_type || '') + '">' + esc(file.title || '첨부파일') + '<small>' + formatBytes(file.file_size) + '</small></a>'
      + '<button type="button" class="iw-att-edit" title="이름 수정" onclick="OSInsuwork.editAsset(\'' + esc(file.id) + '\')">✎</button>'
      + '<button type="button" class="iw-att-del" title="삭제" onclick="OSInsuwork.deleteAsset(\'' + esc(file.id) + '\')">×</button></span>';
  }
  function customerExistingAttachments(customerId) { var root = customerAttachmentRoot(customerId); if (!root) return ''; var files = (state.data.items || []).filter(function (entry) { return String(entry.parent_id || '') === String(root.id); }); if (!files.length) return ''; return '<div class="iw-consult-existing"><strong>기존 첨부파일 ' + files.length + '개</strong>' + files.map(attachmentItemHtml).join('') + '</div>'; }
  function consultationExistingAttachments(consultationId) { var root = consultationAttachmentRoot(consultationId); if (!root) return ''; var files = (state.data.items || []).filter(function (entry) { return String(entry.parent_id || '') === String(root.id); }); if (!files.length) return ''; return '<div class="iw-consult-existing"><strong>기존 첨부파일 ' + files.length + '개</strong>' + files.map(attachmentItemHtml).join('') + '</div>'; }
  function addConsultation(customerId) { resetRichPending(); var customer = state.data.customers.find(function (entry) { return String(entry.id) === String(customerId || ''); }) || {}; dialog(formShell('상담 등록', consultationForm(null, customer), 'OSInsuwork.saveConsultation()')); refreshInsuranceAge(); bindWorkDraft(document.querySelector('#iw-dialog .iw-form'), workDraftKey('consultation', 'new-' + (customer.id || 'blank'))); refreshInsuranceAge(); }
  function editConsultation(id) { var item = state.data.consultations.find(function (entry) { return String(entry.id) === String(id); }); if (!item) return; resetRichPending(); var customer = state.data.customers.find(function (entry) { return String(entry.id) === String(item.customer_id); }) || {}; dialog(formShell('상담 수정', consultationForm(item, customer), 'OSInsuwork.saveConsultation()')); refreshInsuranceAge(); hydrateRichStorage(); bindWorkDraft(document.querySelector('#iw-dialog .iw-form'), workDraftKey('consultation', 'edit-' + id)); refreshInsuranceAge(); }
  function refreshInsuranceAge() { var target = document.getElementById('iwf-insurance-age'); if (!target) return; var age = insuranceAge(value('iwf-consult-birth'), value('iwf-consult-date')); target.textContent = '보험나이 ' + (age === '' ? '-' : age + '세'); }
  function refreshCustomerInsuranceAge() { var target = document.getElementById('iwf-customer-insurance-age'); if (!target) return; var age = insuranceAge(value('iwf-customer-birth'), earliestContractDateValue('iwf-customer')); target.textContent = '보험나이 ' + (age === '' ? '-' : age + '세'); }
  function closeCustomerAddress(idPrefix) {
    var wrap = document.getElementById((idPrefix || 'iwf-customer') + '-postcode-wrap');
    if (wrap) wrap.hidden = true;
  }
  function searchCustomerAddress(idPrefix) {
    var id = idPrefix || 'iwf-customer', prefix = id + '-', wrap = document.getElementById(prefix + 'postcode-wrap'), container = document.getElementById(prefix + 'postcode');
    if (!wrap || !container) return;
    if (!wrap.hidden) { closeCustomerAddress(id); return; }
    function showPostcode() {
      try {
        wrap.hidden = false;
        container.innerHTML = '';
        new window.daum.Postcode({
          width: '100%', height: '100%', autoClose: false,
          onresize: function (size) { if (size && size.height) container.style.height = Math.min(Math.max(size.height, 360), 520) + 'px'; },
          oncomplete: function (data) {
            var zip = document.getElementById(prefix + 'zip'), address = document.getElementById(prefix + 'address'), detail = document.getElementById(prefix + 'address-detail');
            if (zip) { zip.value = data.zonecode || data.postcode || ''; zip.dispatchEvent(new Event('input', { bubbles: true })); }
            if (address) { address.value = data.roadAddress || data.jibunAddress || data.address || ''; address.dispatchEvent(new Event('input', { bubbles: true })); }
            closeCustomerAddress(id);
            if (detail) detail.focus();
          }
        }).embed(container);
        wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (_) { closeCustomerAddress(id); if (typeof window.toast === 'function') window.toast('주소검색을 열지 못했습니다.'); }
    }
    if (window.daum && window.daum.Postcode) return showPostcode();
    var old = document.getElementById('daum-postcode-sdk');
    if (old) { old.addEventListener('load', showPostcode, { once: true }); return; }
    var script = document.createElement('script'); script.id = 'daum-postcode-sdk'; script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'; script.onload = showPostcode; script.onerror = function () { if (typeof window.toast === 'function') window.toast('주소검색을 불러오지 못했습니다.'); }; document.head.appendChild(script);
  }
  function formatBirthInput(input, context) {
    if (!input) return;
    var before = String(input.value || ''), cursor = typeof input.selectionStart === 'number' ? input.selectionStart : before.length;
    var digitsBeforeCursor = before.slice(0, cursor).replace(/\D/g, '').length;
    var raw = before.replace(/\D/g, '').slice(0, 8), formatted = raw;
    if (raw.length > 4) formatted = raw.slice(0, 4) + '-' + raw.slice(4);
    if (raw.length > 6) formatted = raw.slice(0, 4) + '-' + raw.slice(4, 6) + '-' + raw.slice(6);
    input.value = formatted;
    if (document.activeElement === input && typeof input.setSelectionRange === 'function') {
      var nextCursor = 0, seen = 0;
      while (nextCursor < formatted.length && seen < digitsBeforeCursor) {
        if (/\d/.test(formatted.charAt(nextCursor))) seen++;
        nextCursor++;
      }
      try { input.setSelectionRange(nextCursor, nextCursor); } catch (_) {}
    }
    if (context === 'detail') refreshDetailInsuranceAge(); else if (context === 'customerDetail') refreshCustomerDetailInsuranceAge(); else if (context === 'customer') refreshCustomerInsuranceAge(); else if (context === 'tool') calcToolInsuranceAge(); else refreshInsuranceAge();
  }
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
    var row = document.getElementById('iwf-event-timerow'), toggle = document.getElementById('iwf-event-time-toggle');
    if (!row || !row.hasAttribute('hidden')) return;
    row.removeAttribute('hidden'); if (toggle) toggle.style.display = 'none';
    var select = document.getElementById('iwf-event-time'); if (select) select.focus();
  }
  function eventFormHtml(event, customerId) {
    var hasTime = !!(event && event.task_time);
    var startDate = event ? String(event.task_date || '').slice(0, 10) : state.selectedDate;
    var endDate = event ? String(event.end_date || event.task_date || '').slice(0, 10) : state.selectedDate;
    return '<input id="iwf-event-title" class="iw-event-title-input" required autocomplete="off" placeholder="제목 추가" value="' + esc(event ? event.title || '' : '') + '">'
      + '<div class="iw-event-datebar"><input id="iwf-event-date" type="date" required value="' + esc(startDate) + '"><span class="iw-event-sep">–</span><input id="iwf-event-end-date" type="date" required value="' + esc(endDate) + '">' + (hasTime ? '' : '<button type="button" class="iw-event-time-toggle" id="iwf-event-time-toggle" onclick="OSInsuwork.toggleEventTime()">+ 시간 추가</button>') + '</div>'
      + '<div class="iw-event-timerow" id="iwf-event-timerow"' + (hasTime ? '' : ' hidden') + '><select id="iwf-event-time">' + timeOptionsHtml(hasTime ? String(event.task_time).slice(0, 5) : '') + '</select><span class="iw-event-sep">–</span><select id="iwf-event-end-time">' + timeOptionsHtml(event && event.end_time ? String(event.end_time).slice(0, 5) : '') + '</select></div>'
      + '<textarea id="iwf-event-desc" rows="4" class="iw-event-desc" placeholder="설명 추가">' + esc(event ? event.description || '' : '') + '</textarea>'
      + (event ? '<input id="iwf-event-id" type="hidden" value="' + esc(event.id) + '">' : '')
      + '<input id="iwf-event-customer" type="hidden" value="' + esc((event && event.customer_id) || customerId || '') + '">';
  }
  function addEvent(date) { state.selectedDate = date || state.selectedDate; dialog(formShell('일정 추가', eventFormHtml(null), 'OSInsuwork.saveEvent()')); var title = document.getElementById('iwf-event-title'); if (title) title.focus(); }
  /* 2026-08-25 대표 확정 — 고객 상세카드 "고객내용" 메모 입력창 바로 아래 "+ 일정 추가" 버튼에서 호출.
     오늘 날짜로 시작해 이 고객 id를 미리 채운 채 일정 폼을 연다(customerDetailHtml() 참고). */
  function addEventForCustomer(customerId) { state.selectedDate = ymd(new Date()); dialog(formShell('일정 추가', eventFormHtml(null, customerId), 'OSInsuwork.saveEvent()')); var title = document.getElementById('iwf-event-title'); if (title) title.focus(); }

  function openTool(key) {
    if (key === 'calculator') return openCalculatorTool();
    if (key === 'bmi') return openBmiTool();
    if (key === 'insurance-age') return go('insurance-age');
    if (key === 'image-convert') return openImageConvertTool();
    if (key === 'audio-convert') return openAudioConvertTool();
    if (key === 'system-links') { go('carriers'); return; }
    if (key === 'payment-info') { go('payments'); return; }
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
    var search = '<label class="iw-tool-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="회사명 검색" oninput="OSInsuwork.filterQuickLinks(this.value)"></label>';
    var body = groups.map(function (g) {
      return '<section class="iw-qlink-group"><h3>' + esc(g.label) + '</h3><div class="iw-qlink-grid">' + g.items.map(function (item) {
        var name = item.name || '(이름 없음)';
        if (!item.href) return '<div class="iw-qlink-card disabled" data-name="' + esc(name.toLowerCase()) + '"><span>' + esc(name) + '</span><small>URL 없음</small></div>';
        return '<a class="iw-qlink-card" data-name="' + esc(name.toLowerCase()) + '" href="' + esc(item.href) + '" target="_blank" rel="noopener noreferrer"><span>' + esc(name) + '</span><small>열기 →</small></a>';
      }).join('') + '</div></section>';
    }).join('');
    return search + '<div class="iw-quick-tool-body" id="iw-qlink-body">' + body + '</div>';
  }
  function filterQuickLinks(q) {
    q = q.trim().toLocaleLowerCase('ko-KR');
    Array.prototype.forEach.call(document.querySelectorAll('#iw-qlink-body [data-name]'), function (card) {
      card.style.display = (!q || (card.getAttribute('data-name') || '').indexOf(q) >= 0) ? '' : 'none';
    });
  }
  function paymentSearchResults() {
    var parsed = state.paymentData; if (!parsed || !parsed.groups) return [];
    var out = [];
    parsed.groups.forEach(function (group, groupIndex) {
      var type = groupIndex === 1 || /생명/.test(group.label || '') ? 'life' : 'nonlife';
      (group.cards || []).forEach(function (card) {
        var name = stripHtml(card.name || '').trim();
        var detail = stripHtml(card.detail || '').replace(/\s+/g, ' ').trim();
        if (!matches(name + ' ' + detail + ' ' + (group.label || ''))) return;
        out.push({ icon: '₩', kind: '보험회사 결제정보', title: name || '결제정보', sub: (group.label || '') + (detail ? ' · ' + detail : ''), action: "OSInsuwork.openPaymentSearchResult('" + type + "')" });
      });
    });
    return out;
  }
  function openPaymentSearchResult(type) {
    state.paymentType = type === 'life' ? 'life' : 'nonlife';
    go('payments');
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
    var search = '<label class="iw-tool-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="회사명 검색" oninput="OSInsuwork.filterQuickLinks(this.value)"></label>';
    var notice = parsed.noticeHtml ? '<div class="iw-payinfo-notice">' + parsed.noticeHtml + '</div>' : '';
    var groups = parsed.groups.map(function (g) {
      return '<section class="iw-qlink-group"><h3>' + esc(g.label) + '</h3><div class="iw-payinfo-grid">' + g.cards.map(function (c) {
        return '<div class="iw-payinfo-card" data-name="' + esc(stripHtml(c.name).toLowerCase()) + '"><strong>' + c.name + '</strong><div class="iw-payinfo-detail">' + c.detail + '</div></div>';
      }).join('') + '</div></section>';
    }).join('');
    var footer = parsed.footerHtml ? '<div class="iw-payinfo-footer">' + parsed.footerHtml + '</div>' : '';
    return search + notice + '<div class="iw-quick-tool-body iw-payinfo-body" id="iw-qlink-body">' + groups + '</div>' + footer;
  }
  function loadPaymentInfo() {
    if (state.paymentData || state.paymentLoading) return;
    state.paymentLoading = true; state.paymentError = '';
    api('quick_contents?tab_title=eq.' + encodeURIComponent('보험회사 결제정보') + '&select=content_html&limit=1').then(function (rows) {
      var html = rows && rows[0] && rows[0].content_html;
      state.paymentData = html ? parsePaymentInfo(html) : null;
      if (!state.paymentData) state.paymentError = '등록된 결제정보가 없습니다.';
    }).catch(function () { state.paymentError = '결제정보를 불러오지 못했습니다. 다시 시도해 주세요.'; }).finally(function () { state.paymentLoading = false; if (state.section === 'payments' || state.query.trim()) renderContent(); });
  }
  function paymentSectionHtml() {
    loadPaymentInfo();
    var head = '<div class="iw-toolbar iw-carrier-toolbar"><h2>보험회사 결제정보</h2><div class="iw-carrier-tabs" role="tablist"><button type="button" class="' + (state.paymentType === 'nonlife' ? 'on' : '') + '" onclick="OSInsuwork.setPaymentType(\'nonlife\')">손해보험</button><button type="button" class="' + (state.paymentType === 'life' ? 'on' : '') + '" onclick="OSInsuwork.setPaymentType(\'life\')">생명보험</button></div></div>';
    if (state.paymentLoading && !state.paymentData) return head + '<div class="iw-state"><strong>결제정보를 불러오는 중입니다.</strong></div>';
    if (!state.paymentData) return head + '<div class="iw-state"><strong>' + esc(state.paymentError || '결제정보가 없습니다.') + '</strong><button type="button" class="iw-btn" onclick="OSInsuwork.reloadPaymentInfo()">다시 불러오기</button></div>';
    var parsed = state.paymentData;
    var notice = parsed.noticeHtml ? '<div class="iw-payinfo-notice">' + parsed.noticeHtml + '</div>' : '';
    var activeIndex = state.paymentType === 'life' ? 1 : 0;
    var groups = parsed.groups.filter(function (group, index) { return index === activeIndex || (state.paymentType === 'life' ? /생명/.test(group.label) : /손해/.test(group.label)); }).slice(0, 1).map(function (group) {
      return '<section class="iw-payment-group"><h3>' + esc(group.label) + '</h3><div class="iw-payinfo-grid">' + group.cards.map(function (card) {
        return '<article class="iw-payinfo-card"><strong>' + card.name + '</strong><div class="iw-payinfo-detail">' + card.detail + '</div></article>';
      }).join('') + '</div></section>';
    }).join('');
    var footer = parsed.footerHtml ? '<div class="iw-payinfo-footer">' + parsed.footerHtml + '</div>' : '';
    return head + '<div class="iw-payment-page">' + notice + '<div class="iw-payment-groups">' + groups + '</div>' + footer + '</div>';
  }
  function openQuickContentTool(tabTitle, popupTitle, mode) {
    var toolClass = mode === 'payment' ? 'iw-quick-tool iw-payinfo-tool' : 'iw-quick-tool';
    dialog('<div class="' + toolClass + '"><h2>' + esc(popupTitle) + '</h2><div id="iw-quick-tool-slot"><div class="iw-quick-tool-loading">불러오는 중입니다…</div></div></div>');
    api('quick_contents?tab_title=eq.' + encodeURIComponent(tabTitle) + '&select=content_html&limit=1').then(function (rows) {
      var slot = document.getElementById('iw-quick-tool-slot'); if (!slot) return;
      var html = rows && rows[0] && rows[0].content_html;
      if (!html) { slot.innerHTML = '<div class="iw-quick-tool-empty">등록된 내용이 없습니다.</div>'; return; }
      if (mode === 'links') {
        var groups = parseQuickLinks(html);
        slot.innerHTML = groups.length ? quickLinksCardsHtml(groups) : '<div class="iw-quick-tool-raw">' + html + '</div>';
      } else if (mode === 'payment') {
        var parsed = parsePaymentInfo(html);
        slot.innerHTML = parsed ? paymentInfoHtml(parsed) : '<div class="iw-quick-tool-raw">' + html + '</div>';
      } else {
        slot.innerHTML = '<div class="iw-quick-tool-raw">' + html + '</div>';
      }
    }).catch(function () {
      var slot = document.getElementById('iw-quick-tool-slot'); if (slot) slot.innerHTML = '<div class="iw-quick-tool-empty">불러오지 못했습니다. 다시 시도해 주세요.</div>';
    });
  }
  function setToolMode(mode) { state.toolMode = ['calculator', 'bmi', 'image', 'audio'].indexOf(mode) >= 0 ? mode : 'calculator'; renderContent(); setUrl(false); }
  function openCalculatorTool() { state.toolMode = 'calculator'; go('tools'); }
  function openBmiTool() { state.toolMode = 'bmi'; go('tools'); }
  function openImageConvertTool() { state.toolMode = 'image'; go('tools'); }
  function openAudioConvertTool() { state.toolMode = 'audio'; go('tools'); }
  function fmtBytes(bytes) { var n = Number(bytes) || 0, units = ['B', 'KB', 'MB', 'GB']; var i = 0; while (n >= 1024 && i < units.length - 1) { n /= 1024; i += 1; } return (i ? n.toFixed(n >= 10 ? 1 : 2) : Math.round(n)) + units[i]; }
  function toolsPageHtml() {
    var cards = [['calculator', '계산기', '사칙연산 · 키보드 입력'], ['bmi', 'BMI 계산기', '키·몸무게로 BMI 산출'], ['image', '이미지 변환', 'PNG·JPG·PDF → JPG'], ['audio', '오디오 변환', 'MP3·MP4 → WAV']];
    var tabs = cards.map(function (card) { return '<button type="button" class="iw-tool-card' + (state.toolMode === card[0] ? ' on' : '') + '" onclick="OSInsuwork.setToolMode(\'' + card[0] + '\')"><strong>' + card[1] + '</strong><span>' + card[2] + '</span></button>'; }).join('');
    var body = state.toolMode === 'bmi' ? toolsBmiHtml() : state.toolMode === 'image' ? toolsImageHtml() : state.toolMode === 'audio' ? toolsAudioHtml() : toolsCalculatorHtml();
    /* 계산기·변환기는 비로그인도 열람 가능한 공개 섹션이라 homeHtml()과 동일하게 statusHtml()을
       로그인된 사용자의 실제 로딩 중에만 얹는다(2026-08-25 세션에서 새로 발견 — homeHtml만 지시됐으나
       같은 결함이 여기도 있었다). */
    return (allowed() ? statusHtml() : '') + '<div class="iw-tools-page"><div class="iw-toolbar iw-tools-toolbar"><div><h2>계산기 · 변환기</h2><p class="iw-subtitle">자주 쓰는 계산과 이미지 변환을 보험워크 안에서 바로 처리합니다.</p></div></div><div class="iw-tool-cards">' + tabs + '</div>' + body + '</div>';
  }
  function toolsCalculatorHtml() {
    var keys = [['C', 'C', 'fn'], ['back', '←', 'fn'], ['%', '%', 'fn'], ['/', '÷', 'op'], ['7', '7', ''], ['8', '8', ''], ['9', '9', ''], ['*', '×', 'op'], ['4', '4', ''], ['5', '5', ''], ['6', '6', ''], ['-', '−', 'op'], ['1', '1', ''], ['2', '2', ''], ['3', '3', ''], ['+', '+', 'op'], ['+/-', '±', 'fn'], ['0', '0', ''], ['.', '.', ''], ['=', '=', 'eq']];
    var buttons = keys.map(function (k) { return '<button type="button" class="' + k[2] + '" data-calc-key="' + k[0] + '" onclick="OSInsuwork.calcPress(\'' + k[0] + '\')">' + k[1] + '</button>'; }).join('');
    return '<section class="iw-tool-workspace iw-tool-calc-page"><div class="iw-tool-pane"><h3>입력</h3><div class="iw-calc-shell" id="iw-calc-shell" tabindex="0" aria-label="계산기 키보드 입력"><input class="iw-calc-display" id="iw-calc-display" value="0" readonly aria-label="계산식과 결과"><div class="iw-calc-grid">' + buttons + '</div></div></div><div class="iw-tool-pane"><h3>기록</h3><div class="iw-calc-help"><strong id="iw-calc-result">0</strong><span id="iw-calc-status">숫자와 연산자를 입력하세요. 키보드 입력도 가능합니다.</span></div></div></section>';
  }
  function resetCalc() { state.calc = { cur: '0', prev: null, op: null, fresh: true, expr: '', justEq: false, eqLine: '' }; }
  function calcFmt(text) { var s = String(text == null ? '0' : text); if (s === '오류') return s; var neg = s.charAt(0) === '-'; if (neg) s = s.slice(1); var p = s.split('.'); if (!/^\d*$/.test(p[0])) return (neg ? '-' : '') + s; return (neg ? '-' : '') + (p[0] || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (p.length > 1 ? '.' + p[1] : ''); }
  var CALC_SYMBOLS = { '+': '+', '-': '−', '*': '×', '/': '÷' };
  function calcLine(c) { if (!c) return '0'; if (c.cur === '오류') return '오류'; if (c.justEq) return c.eqLine || calcFmt(c.cur); if (c.fresh && c.expr) return c.expr.replace(/\s+$/, ''); return (c.expr || '') + calcFmt(c.cur); }
  function calcRenderDisplay() { var c = state.calc || (resetCalc(), state.calc), display = document.getElementById('iw-calc-display'), result = document.getElementById('iw-calc-result'), status = document.getElementById('iw-calc-status'); if (display) display.value = calcLine(c); if (result) result.textContent = calcFmt(c.cur); if (status) status.textContent = c.justEq ? '결과값' : (c.expr ? '계산 중' : '입력 대기'); }
  function calcEquals() { var c = state.calc; if (!c || c.op == null || c.prev == null) return; var a = c.prev, b = parseFloat(c.cur), r = c.op === '+' ? a + b : c.op === '-' ? a - b : c.op === '*' ? a * b : c.op === '/' ? (b === 0 ? NaN : a / b) : b; c.cur = (!isFinite(r) || isNaN(r)) ? '오류' : String(Math.round(r * 1e10) / 1e10); c.prev = null; c.fresh = true; }
  function calcPress(key) {
    var c = state.calc || (resetCalc(), state.calc);
    if (c.cur === '오류' && key !== 'C') return;
    if (key === 'C') resetCalc();
    else if (key === 'back') { if (!c.fresh) { c.cur = c.cur.length > 1 ? c.cur.slice(0, -1) : '0'; if (c.cur === '-') c.cur = '0'; } }
    else if (key === '.') { if (c.justEq) { c.cur = '0.'; c.expr = ''; c.justEq = false; c.fresh = false; } else if (c.fresh) { c.cur = '0.'; c.fresh = false; } else if (c.cur.indexOf('.') < 0) c.cur += '.'; }
    else if (/^[0-9]$/.test(key)) { if (c.justEq) { c.expr = ''; c.justEq = false; c.cur = key; c.fresh = false; } else if (c.fresh || c.cur === '0') { c.cur = key; c.fresh = false; } else if (c.cur.replace('-', '').replace('.', '').length < 16) c.cur += key; }
    else if (['+', '-', '*', '/'].indexOf(key) >= 0) { if (c.op != null && !c.fresh) calcEquals(); c.prev = parseFloat(c.cur); c.op = key; c.fresh = true; c.justEq = false; c.expr = calcFmt(c.cur) + ' ' + CALC_SYMBOLS[key] + ' '; }
    else if (key === '=') { if (c.op != null && c.prev != null) { var left = calcFmt(String(c.prev)) + ' ' + CALC_SYMBOLS[c.op] + ' ' + calcFmt(c.cur); calcEquals(); c.eqLine = left + ' = ' + calcFmt(c.cur); c.op = null; c.justEq = true; } }
    else if (key === '%') { c.cur = String(parseFloat(c.cur) / 100); c.fresh = true; }
    else if (key === '+/-') { if (c.cur !== '0' && c.cur !== '오류') c.cur = c.cur.charAt(0) === '-' ? c.cur.slice(1) : '-' + c.cur; }
    calcRenderDisplay();
  }
  function calcKeyFromEvent(event) {
    var code = event.code || '', key = event.key;
    if (/^Numpad[0-9]$/.test(code)) return code.slice(6);
    if (code === 'NumpadDecimal') return '.'; if (code === 'NumpadAdd') return '+'; if (code === 'NumpadSubtract') return '-'; if (code === 'NumpadMultiply') return '*'; if (code === 'NumpadDivide') return '/'; if (code === 'NumpadEnter') return '=';
    if (key >= '0' && key <= '9') return key; if (key === '.') return '.'; if (['+', '-', '*', '/'].indexOf(key) >= 0) return key; if (key === 'Enter' || key === '=') return '='; if (key === 'Backspace') return 'back'; if (key === 'Escape') return 'C'; if (key === '%') return '%'; return null;
  }
  function hydrateCalculator() {
    var shell = document.getElementById('iw-calc-shell'); if (!shell) return;
    resetCalc(); calcRenderDisplay(); shell.focus({ preventScroll: true });
    shell.addEventListener('keydown', function (event) { var key = calcKeyFromEvent(event); if (!key) return; event.preventDefault(); calcPress(key); var btn = shell.querySelector('[data-calc-key="' + key + '"]'); if (btn) { btn.classList.add('kbd'); window.setTimeout(function () { btn.classList.remove('kbd'); }, 120); } });
  }
  function toolsBmiHtml() {
    return '<section class="iw-tool-workspace iw-tool-bmi-page"><div class="iw-tool-pane"><h3>입력</h3><label class="iw-tool-field">키 (cm)<input id="iw-bmi-height" type="number" inputmode="decimal" placeholder="170" oninput="OSInsuwork.calcBmi()"></label><label class="iw-tool-field">몸무게 (kg)<input id="iw-bmi-weight" type="number" inputmode="decimal" placeholder="65" oninput="OSInsuwork.calcBmi()"></label></div><div class="iw-tool-pane"><h3>결과</h3><div class="iw-bmi-result" id="iw-bmi-result"><strong id="iw-bmi-value">-</strong><span id="iw-bmi-category">키와 몸무게를 입력하세요</span></div></div></section>';
  }
  function calcBmi() {
    var h = parseFloat(value('iw-bmi-height')), w = parseFloat(value('iw-bmi-weight'));
    var valueEl = document.getElementById('iw-bmi-value'), catEl = document.getElementById('iw-bmi-category'), resultEl = document.getElementById('iw-bmi-result');
    if (!valueEl || !catEl || !resultEl) return;
    if (!h || !w || h <= 0 || w <= 0) { valueEl.textContent = '-'; catEl.textContent = '키와 몸무게를 입력하세요'; resultEl.className = 'iw-bmi-result'; return; }
    var bmi = w / Math.pow(h / 100, 2);
    var cat = bmi < 18.5 ? '저체중' : bmi < 23 ? '정상' : bmi < 25 ? '과체중' : '비만';
    var tone = bmi < 18.5 ? 'low' : bmi < 23 ? 'ok' : bmi < 25 ? 'warn' : 'high';
    valueEl.textContent = bmi.toFixed(1);
    catEl.textContent = cat;
    resultEl.className = 'iw-bmi-result ' + tone;
  }
  function openInsuranceAgeTool() {
    go('insurance-age');
  }
  function insuranceAgePageHtml() {
    var today = new Date(), basis = ymd(today), year = today.getFullYear();
    /* 보험연령표도 비로그인 공개 섹션이라 homeHtml()과 동일 처리(2026-08-25 세션에서 새로 발견). */
    return (allowed() ? statusHtml() : '') + '<div class="iw-insage-page"><div class="iw-toolbar iw-insage-toolbar"><div><h2>보험연령표</h2><p class="iw-subtitle">출생연도 빠른 확인표와 생년월일 기준 보험나이 계산을 함께 봅니다.</p></div><span id="iw-insage-year">' + year + '년 기준</span></div>'
      + '<section class="iw-insage-calc"><div class="iw-insage-fields">'
      + '<label>생년월일<input id="iw-insage-birth" type="date" oninput="OSInsuwork.formatBirthInput(this,\'tool\')"></label>'
      + '<label>기준일<input id="iw-insage-date" type="date" value="' + basis + '" data-auto-date="1" onchange="this.dataset.autoDate=\'0\';OSInsuwork.calcToolInsuranceAge()"></label>'
      + '</div><div class="iw-insage-result"><strong id="iw-insage-value">-</strong><span id="iw-insage-caption">생년월일을 입력하세요</span></div></section>'
      + '<div class="iw-insage-note"><b>빠른 확인</b><span>표는 현재 연도에서 출생연도를 뺀 간편 기준입니다. 생일 전후 6개월을 반영한 실제 보험나이는 위 계산값을 사용하세요.</span></div>'
      + '<div class="iw-insage-legend"><span class="major">10세 단위</span><span class="minor">5세 단위</span><span class="youth">15~19세</span></div>'
      + '<div class="iw-insage-table-wrap">' + insuranceAgeTableHtml(year) + '</div></div>';
  }
  function insuranceAgeTableHtml(year) {
    var ranges = [[0, 20], [21, 40], [41, 60], [61, 80]];
    return ranges.map(function (range) {
      var rows = [];
      for (var age = range[0]; age <= range[1]; age += 1) {
        var cls = age >= 15 && age <= 19 ? ' youth' : age > 0 && age % 10 === 0 ? ' major' : age > 0 && age % 5 === 0 ? ' minor' : '';
        rows.push('<tr class="' + cls + '"><td>' + (year - age) + '</td><td>' + age + '세</td></tr>');
      }
      return '<section class="iw-insage-table"><h3>' + range[0] + ' ~ ' + range[1] + '세</h3><table><thead><tr><th>출생연도</th><th>보험나이</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></section>';
    }).join('');
  }
  function addMonths(date, months) {
    var result = new Date(date.getTime()), day = result.getDate();
    result.setMonth(result.getMonth() + months);
    if (result.getDate() !== day) result.setDate(0);
    return result;
  }
  function insuranceAgeInfo(birth, basis) {
    var text = String(birth || ''), parts = text.split('-').map(Number), born = parseDate(text), at = parseDate(basis || ymd(new Date()));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || parts.length !== 3 || born.getFullYear() !== parts[0] || born.getMonth() !== parts[1] - 1 || born.getDate() !== parts[2] || isNaN(at.getTime()) || born > at) return null;
    var age = at.getFullYear() - born.getFullYear();
    var birthday = new Date(at.getFullYear(), born.getMonth(), born.getDate());
    if (at < birthday) { age -= 1; birthday.setFullYear(at.getFullYear() - 1); }
    var nextBirthday = new Date(birthday); nextBirthday.setFullYear(birthday.getFullYear() + 1);
    var upperDate = addMonths(nextBirthday, -6);
    if (at >= upperDate) {
      age += 1;
      nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
      upperDate = addMonths(nextBirthday, -6);
    }
    return { age: Math.max(0, age), upperDate: ymd(upperDate), nextAge: Math.max(0, age + 1) };
  }
  function scheduleInsuranceAgeAutoRefresh() {
    window.clearTimeout(state.insageRefreshTimer);
    var now = new Date(), next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 1, 0);
    state.insageRefreshTimer = window.setTimeout(function () {
      var date = document.getElementById('iw-insage-date');
      if (date && date.dataset.autoDate !== '0') { date.value = ymd(new Date()); date.defaultValue = date.value; }
      calcToolInsuranceAge();
      var wrap = document.querySelector('.iw-insage-table-wrap'), year = document.getElementById('iw-insage-year'), currentYear = new Date().getFullYear();
      if (wrap) wrap.innerHTML = insuranceAgeTableHtml(currentYear);
      if (year) year.textContent = currentYear + '년 기준';
      scheduleInsuranceAgeAutoRefresh();
    }, Math.max(1000, next.getTime() - now.getTime()));
  }
  function calcToolInsuranceAge() {
    var el = document.getElementById('iw-insage-value'); if (!el) return;
    var caption = document.getElementById('iw-insage-caption');
    var info = insuranceAgeInfo(value('iw-insage-birth'), value('iw-insage-date'));
    if (!info) { el.textContent = '-'; if (caption) caption.textContent = '생년월일을 입력하세요'; return; }
    el.textContent = info.age + '세';
    if (caption) caption.textContent = '다음 상령일 ' + info.upperDate + ' · ' + info.nextAge + '세';
  }
  function toolsImageHtml() {
    return '<section class="iw-tool-workspace iw-tool-image-page"><div class="iw-tool-pane"><h3>입력</h3><label class="iw-imgconv-drop" id="iw-imgconv-drop"><input id="iw-imgconv-file" type="file" multiple accept="image/png,image/jpeg,application/pdf,.pdf" onchange="OSInsuwork.imgConvertLoad(this)"><span class="iw-imgconv-icon">▧</span><strong>PNG · JPG · PDF 파일 선택</strong><em>클릭 또는 드래그앤드롭 · PDF는 페이지별 JPG · 이미지 여러 장 선택 시 PDF로 합치기</em></label><div id="iw-imgconv-file-info"></div><button type="button" class="iw-btn primary iw-tool-fire" onclick="OSInsuwork.imgConvertRun()">변환</button></div><div class="iw-tool-pane"><h3>결과</h3><div id="iw-imgconv-result" class="iw-imgconv-result"><div class="iw-tool-empty">파일 선택 후 변환을 누르세요.</div></div></div></section>';
  }
  function toolsAudioHtml() {
    return '<section class="iw-tool-workspace iw-tool-audio-page"><div class="iw-tool-pane"><h3>입력</h3><label class="iw-imgconv-drop" id="iw-audioconv-drop"><input id="iw-audioconv-file" type="file" multiple accept="audio/*,video/mp4,.mp3,.mp4,.m4a,.aac,.wav,.ogg,.wma" onchange="OSInsuwork.audioConvertLoad(this)"><span class="iw-imgconv-icon">♪</span><strong>MP3 · MP4 · M4A 파일 선택</strong><em>클릭 또는 드래그앤드롭 · 여러 개 선택 시 한 번에 변환 · 브라우저 안에서만 처리(서버 전송 없음)</em></label><div id="iw-audioconv-file-info"></div><button type="button" class="iw-btn primary iw-tool-fire" onclick="OSInsuwork.audioConvertRun()">변환</button></div><div class="iw-tool-pane"><h3>결과</h3><div id="iw-audioconv-result" class="iw-audioconv-result"><div class="iw-tool-empty">파일 선택 후 변환을 누르세요.</div></div></div></section>';
  }
  function hydrateToolsPage() { if (state.toolMode === 'calculator') hydrateCalculator(); if (state.toolMode === 'bmi') calcBmi(); if (state.toolMode === 'image') hydrateImageConvert(); if (state.toolMode === 'audio') hydrateAudioConvert(); }
  function hydrateImageConvert() {
    var drop = document.getElementById('iw-imgconv-drop'); if (!drop || drop.dataset.bound === '1') return; drop.dataset.bound = '1';
    drop.addEventListener('dragover', function (event) { event.preventDefault(); drop.classList.add('drag'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('drag'); });
    drop.addEventListener('drop', function (event) { event.preventDefault(); drop.classList.remove('drag'); setImageConvertFiles(event.dataTransfer.files); });
    renderImageConvertFile();
  }
  function isImageFile(file) { return /image\/(png|jpeg)/i.test(file.type || '') || /\.(png|jpe?g)$/i.test(file.name || ''); }
  function setImageConvertFile(file) {
    if (!file) return;
    if (!/image\/(png|jpeg)|application\/pdf/i.test(file.type || '') && !/\.(png|jpe?g|pdf)$/i.test(file.name || '')) { briefingAlert('PNG · JPG · PDF 파일만 변환할 수 있습니다.'); return; }
    state.toolFile = file; state.toolImages = null; state.toolResult = null; state.toolPages = null; state.toolPdfResult = null; renderImageConvertFile(); renderImageConvertEmpty();
  }
  function setImageConvertFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    if (files.length === 1) { setImageConvertFile(files[0]); return; }
    if (!files.every(isImageFile)) { briefingAlert('여러 장을 한 번에 선택하면 PNG · JPG 이미지만 PDF로 합칠 수 있습니다.'); return; }
    state.toolFile = null; state.toolResult = null; state.toolPages = null; state.toolPdfResult = null;
    state.toolImages = files; renderImageConvertFile(); renderImageConvertEmpty();
  }
  function imgConvertLoad(input) {
    setImageConvertFiles(input && input.files);
  }
  function renderImageConvertFile() {
    var info = document.getElementById('iw-imgconv-file-info'); if (!info) return;
    if (state.toolImages && state.toolImages.length) {
      var totalSize = state.toolImages.reduce(function (sum, f) { return sum + f.size; }, 0);
      info.innerHTML = '<div class="iw-imgconv-file-info"><span>이미지 ' + state.toolImages.length + '장 · ' + fmtBytes(totalSize) + '</span><button type="button" onclick="OSInsuwork.imgConvertClear()" aria-label="파일 제거">×</button></div>';
      return;
    }
    if (!state.toolFile) { info.innerHTML = ''; return; }
    info.innerHTML = '<div class="iw-imgconv-file-info"><span>' + esc(state.toolFile.name) + ' · ' + fmtBytes(state.toolFile.size) + '</span><button type="button" onclick="OSInsuwork.imgConvertClear()" aria-label="파일 제거">×</button></div>';
  }
  function imgConvertClear() { state.toolFile = null; state.toolImages = null; state.toolResult = null; state.toolPages = null; state.toolPdfResult = null; var input = document.getElementById('iw-imgconv-file'); if (input) input.value = ''; renderImageConvertFile(); renderImageConvertEmpty(); }
  function renderImageConvertEmpty(text) { var result = document.getElementById('iw-imgconv-result'); if (result) result.innerHTML = '<div class="iw-tool-empty">' + esc(text || '파일 선택 후 변환을 누르세요.') + '</div>'; }
  function imgConvertRun() {
    if (state.toolImages && state.toolImages.length) return imgConvertMergePdf(state.toolImages);
    var file = state.toolFile; if (!file) { briefingAlert('파일을 먼저 선택해 주세요.'); return; }
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) return imgConvertPdf(file);
    var result = document.getElementById('iw-imgconv-result'); if (result) result.innerHTML = '<div class="iw-tool-empty">변환 중입니다.</div>';
    var reader = new FileReader();
    reader.onload = function (event) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        var ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0);
        canvas.toBlob(function (blob) {
          if (!blob) { renderImageConvertEmpty('변환 실패. 다시 시도해 주세요.'); return; }
          var url = URL.createObjectURL(blob), newName = file.name.replace(/\.(png|jpe?g)$/i, '') + '.jpg';
          state.toolResult = { blob: blob, url: url, newName: newName, origName: file.name, origSize: file.size, newSize: blob.size, width: canvas.width, height: canvas.height, origFormat: /jpe?g/i.test(file.type) || /\.jpe?g$/i.test(file.name) ? 'JPG' : 'PNG' };
          renderImageConvertResult();
        }, 'image/jpeg', 0.85);
      };
      img.onerror = function () { renderImageConvertEmpty('이미지 파일을 불러오지 못했습니다.'); };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
  function renderImageConvertResult() {
    var r = state.toolResult, result = document.getElementById('iw-imgconv-result'); if (!r || !result) return;
    var saved = r.origSize - r.newSize, reduction = r.origSize ? Math.round((1 - r.newSize / r.origSize) * 100) : 0;
    result.innerHTML = '<div class="iw-imgconv-compare"><div><small>원본</small><strong>' + esc(r.origFormat) + '</strong><span>' + fmtBytes(r.origSize) + '</span></div><b>→</b><div><small>결과</small><strong>JPG</strong><span>' + fmtBytes(r.newSize) + '</span></div></div><div class="iw-imgconv-summary"><span>용량 ' + (reduction > 0 ? reduction + '% 감소' : '변환 완료') + '</span><span>' + r.width + ' × ' + r.height + '</span><span>' + (saved > 0 ? fmtBytes(saved) + ' 절약' : esc(r.newName)) + '</span></div><div class="iw-imgconv-preview"><img src="' + r.url + '" alt="변환 결과"></div><div class="iw-imgconv-actions"><button type="button" class="iw-btn primary" onclick="OSInsuwork.imgConvertDownload()">다운로드</button><button type="button" class="iw-btn" onclick="OSInsuwork.imgConvertCopy()">복사</button></div>';
  }
  function imgConvertPdf(file) {
    var result = document.getElementById('iw-imgconv-result'); if (result) result.innerHTML = '<div class="iw-tool-empty">PDF 변환 중입니다.</div>';
    state.toolPages = [];
    loadPdfJs().then(function (pdfjs) { return file.arrayBuffer().then(function (buf) { return pdfjs.getDocument({ data: buf }).promise; }); }).then(function (pdf) {
      var total = pdf.numPages, count = Math.min(total, 20), base = file.name.replace(/\.pdf$/i, ''), chain = Promise.resolve();
      for (var i = 1; i <= count; i += 1) (function (pageNo) { chain = chain.then(function () { return pdf.getPage(pageNo).then(function (page) { var vp = page.getViewport({ scale: 2 }), canvas = document.createElement('canvas'); canvas.width = vp.width; canvas.height = vp.height; var ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); return page.render({ canvasContext: ctx, viewport: vp }).promise.then(function () { return new Promise(function (resolve) { canvas.toBlob(function (blob) { if (blob) state.toolPages.push({ page: pageNo, blob: blob, url: URL.createObjectURL(blob), name: base + '_p' + pageNo + '.jpg', size: blob.size }); resolve(); }, 'image/jpeg', 0.85); }); }); }); }); })(i);
      return chain.then(function () { renderImageConvertPdfResult(total); });
    }).catch(function () { renderImageConvertEmpty('PDF 변환 실패. 다시 시도해 주세요.'); });
  }
  function renderImageConvertPdfResult(total) {
    var pages = state.toolPages || [], result = document.getElementById('iw-imgconv-result'); if (!result) return;
    if (!pages.length) { renderImageConvertEmpty('변환된 페이지가 없습니다.'); return; }
    result.innerHTML = '<div class="iw-imgconv-pdf-grid">' + pages.map(function (p, i) { return '<article><img src="' + p.url + '" alt="' + p.page + '쪽"><strong>' + p.page + '쪽</strong><span>' + fmtBytes(p.size) + '</span><div><button type="button" class="iw-btn" onclick="OSInsuwork.imgConvertPdfDownload(' + i + ')">저장</button><button type="button" class="iw-btn" onclick="OSInsuwork.imgConvertPdfCopy(' + i + ')">복사</button></div></article>'; }).join('') + '</div>' + (total > pages.length ? '<p class="iw-imgconv-pdf-note">총 ' + total + '쪽 중 앞 ' + pages.length + '쪽만 변환했습니다.</p>' : '');
  }
  function downloadBlob(url, name) { var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); document.body.removeChild(a); }
  function imgConvertDownload() { var r = state.toolResult; if (r) downloadBlob(r.url, r.newName); }
  function imgConvertCopy() { var r = state.toolResult; if (!r || !navigator.clipboard || !window.ClipboardItem) return imgConvertDownload(); navigator.clipboard.write([new ClipboardItem({ 'image/jpeg': r.blob })]).then(function () { if (typeof window.toast === 'function') window.toast('변환 이미지를 복사했습니다.'); }).catch(imgConvertDownload); }
  function imgConvertPdfDownload(index) { var p = (state.toolPages || [])[index]; if (p) downloadBlob(p.url, p.name); }
  function imgConvertPdfCopy(index) { var p = (state.toolPages || [])[index]; if (!p || !navigator.clipboard || !window.ClipboardItem) return imgConvertPdfDownload(index); navigator.clipboard.write([new ClipboardItem({ 'image/jpeg': p.blob })]).then(function () { if (typeof window.toast === 'function') window.toast(p.page + '쪽을 복사했습니다.'); }).catch(function () { imgConvertPdfDownload(index); }); }

  // ── 오디오 → WAV 변환 ──────────────────────────────────────────────────
  var audioConvertCtx = null;
  function getAudioConvertCtx() { if (!audioConvertCtx) audioConvertCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioConvertCtx; }
  function isAudioLikeFile(file) { return /^(audio|video)\//i.test(file.type || '') || /\.(mp3|mp4|m4a|aac|wav|ogg|wma|flac|webm)$/i.test(file.name || ''); }
  function audioConvertLoad(input) { setAudioConvertFiles(input && input.files); }
  function setAudioConvertFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;
    if (!files.every(isAudioLikeFile)) { briefingAlert('오디오(또는 오디오가 포함된 동영상) 파일만 변환할 수 있습니다.'); return; }
    state.toolAudioFiles = files.map(function (file) { return { file: file, status: 'idle', wavBlob: null, url: null, error: '' }; });
    renderAudioConvertFile();
    renderAudioConvertEmpty();
  }
  function renderAudioConvertFile() {
    var info = document.getElementById('iw-audioconv-file-info'); if (!info) return;
    var files = state.toolAudioFiles || [];
    if (!files.length) { info.innerHTML = ''; return; }
    var totalSize = files.reduce(function (sum, e) { return sum + e.file.size; }, 0);
    info.innerHTML = '<div class="iw-imgconv-file-info"><span>오디오 ' + files.length + '개 · ' + fmtBytes(totalSize) + '</span><button type="button" onclick="OSInsuwork.audioConvertClear()" aria-label="파일 제거">×</button></div>';
  }
  function audioConvertClear() {
    state.toolAudioFiles = null;
    var input = document.getElementById('iw-audioconv-file'); if (input) input.value = '';
    renderAudioConvertFile();
    renderAudioConvertEmpty();
  }
  function renderAudioConvertEmpty(text) { var result = document.getElementById('iw-audioconv-result'); if (result) result.innerHTML = '<div class="iw-tool-empty">' + esc(text || '파일 선택 후 변환을 누르세요.') + '</div>'; }
  function audioConvertBaseName(name) { var i = name.lastIndexOf('.'); return i > 0 ? name.slice(0, i) : name; }
  function audioBufferToWav(abuffer) {
    var numChan = abuffer.numberOfChannels, sampleRate = abuffer.sampleRate, numFrames = abuffer.length;
    var blockAlign = numChan * 2, dataSize = numFrames * blockAlign;
    var buffer = new ArrayBuffer(44 + dataSize), view = new DataView(buffer), pos = 0;
    function ws(s) { for (var i = 0; i < s.length; i++) view.setUint8(pos++, s.charCodeAt(i)); }
    function u32(v) { view.setUint32(pos, v, true); pos += 4; }
    function u16(v) { view.setUint16(pos, v, true); pos += 2; }
    ws('RIFF'); u32(36 + dataSize); ws('WAVE'); ws('fmt '); u32(16); u16(1); u16(numChan);
    u32(sampleRate); u32(sampleRate * blockAlign); u16(blockAlign); u16(16); ws('data'); u32(dataSize);
    var channels = []; for (var c = 0; c < numChan; c++) channels.push(abuffer.getChannelData(c));
    for (var i = 0; i < numFrames; i++) {
      for (var ch = 0; ch < numChan; ch++) {
        var sample = Math.max(-1, Math.min(1, channels[ch][i]));
        sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(pos, sample, true); pos += 2;
      }
    }
    return buffer;
  }
  function renderAudioConvertResult() {
    var files = state.toolAudioFiles || [], result = document.getElementById('iw-audioconv-result'); if (!result) return;
    if (!files.length) { renderAudioConvertEmpty(); return; }
    var anyDone = files.some(function (e) { return e.status === 'done'; });
    result.innerHTML = '<div class="iw-audioconv-list">' + files.map(function (entry, i) {
      var statusText = entry.status === 'done' ? '완료 · ' + fmtBytes(entry.wavBlob.size)
        : entry.status === 'working' ? '변환 중…'
        : entry.status === 'error' ? '변환 실패: ' + esc(entry.error)
        : fmtBytes(entry.file.size) + ' · 대기 중';
      var statusClass = entry.status === 'done' ? 'ok' : entry.status === 'error' ? 'err' : '';
      var actionBtn = entry.status === 'done'
        ? '<button type="button" class="iw-btn primary" onclick="OSInsuwork.audioConvertDownload(' + i + ')">저장</button>'
        : '<button type="button" class="iw-btn"' + (entry.status === 'working' ? ' disabled' : '') + ' onclick="OSInsuwork.audioConvertRunOne(' + i + ')">' + (entry.status === 'error' ? '다시 시도' : '변환') + '</button>';
      return '<article class="iw-audioconv-row"><div class="iw-audioconv-meta"><strong>' + esc(entry.file.name) + '</strong><span class="' + statusClass + '">' + statusText + '</span></div><div class="iw-audioconv-actions">' + actionBtn + '</div></article>';
    }).join('') + '</div>' + (anyDone ? '<div class="iw-imgconv-actions"><button type="button" class="iw-btn" onclick="OSInsuwork.audioConvertDownloadAll()">완료된 파일 전체 저장</button></div>' : '');
  }
  function audioConvertRunOne(index) {
    var entry = (state.toolAudioFiles || [])[index]; if (!entry || entry.status === 'working' || entry.status === 'done') return Promise.resolve();
    entry.status = 'working'; renderAudioConvertResult();
    return entry.file.arrayBuffer().then(function (buf) {
      return getAudioConvertCtx().decodeAudioData(buf);
    }).then(function (audioBuffer) {
      var wavBuffer = audioBufferToWav(audioBuffer);
      entry.wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
      entry.url = URL.createObjectURL(entry.wavBlob);
      entry.status = 'done';
      renderAudioConvertResult();
    }).catch(function (err) {
      entry.status = 'error';
      entry.error = (err && err.message) || '알 수 없는 오류';
      renderAudioConvertResult();
    });
  }
  function audioConvertRun() {
    var files = state.toolAudioFiles;
    if (!files || !files.length) { briefingAlert('파일을 먼저 선택해 주세요.'); return; }
    var chain = Promise.resolve();
    files.forEach(function (entry, i) { chain = chain.then(function () { return audioConvertRunOne(i); }); });
  }
  function audioConvertDownload(index) { var entry = (state.toolAudioFiles || [])[index]; if (entry && entry.wavBlob) downloadBlob(entry.url, audioConvertBaseName(entry.file.name) + '.wav'); }
  function audioConvertDownloadAll() {
    var files = (state.toolAudioFiles || []).filter(function (e) { return e.status === 'done'; });
    files.forEach(function (entry, i) { window.setTimeout(function () { downloadBlob(entry.url, audioConvertBaseName(entry.file.name) + '.wav'); }, i * 250); });
  }
  function hydrateAudioConvert() {
    var drop = document.getElementById('iw-audioconv-drop'); if (!drop || drop.dataset.bound === '1') return; drop.dataset.bound = '1';
    drop.addEventListener('dragover', function (event) { event.preventDefault(); drop.classList.add('drag'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('drag'); });
    drop.addEventListener('drop', function (event) { event.preventDefault(); drop.classList.remove('drag'); setAudioConvertFiles(event.dataTransfer.files); });
    renderAudioConvertFile();
  }

  // ── 이미지 여러 장 → PDF 합치기 ──────────────────────────────────────────
  function loadPdfLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (state.pdfLibPromise) return state.pdfLibPromise;
    state.pdfLibPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js';
      script.onload = function () { if (!window.PDFLib) { reject(new Error('PDF 생성 모듈을 불러오지 못했습니다.')); return; } resolve(window.PDFLib); };
      script.onerror = function () { reject(new Error('PDF 생성 모듈을 불러오지 못했습니다.')); };
      document.head.appendChild(script);
    });
    return state.pdfLibPromise;
  }
  function fileToJpegBuffer(file) {
    return createImageBitmap(file).then(function (bitmap) {
      var canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
      var ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0);
      return new Promise(function (resolve) { canvas.toBlob(function (blob) { blob.arrayBuffer().then(resolve); }, 'image/jpeg', .92); });
    });
  }
  function imgConvertMergePdf(files) {
    var result = document.getElementById('iw-imgconv-result'); if (result) result.innerHTML = '<div class="iw-tool-empty">PDF로 합치는 중입니다.</div>';
    loadPdfLib().then(function (PDFLib) {
      return Promise.all(files.map(fileToJpegBuffer)).then(function (buffers) {
        return PDFLib.PDFDocument.create().then(function (pdfDoc) {
          return buffers.reduce(function (chain, buf) {
            return chain.then(function () {
              return pdfDoc.embedJpg(buf).then(function (img) {
                var page = pdfDoc.addPage([img.width, img.height]);
                page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
              });
            });
          }, Promise.resolve()).then(function () { return pdfDoc.save(); });
        });
      });
    }).then(function (bytes) {
      var blob = new Blob([bytes], { type: 'application/pdf' });
      var name = '이미지_' + files.length + '장_' + ymd(new Date()) + '.pdf';
      state.toolPdfResult = { blob: blob, url: URL.createObjectURL(blob), name: name, size: blob.size, pageCount: files.length };
      renderImageConvertPdfMergeResult();
    }).catch(function (err) { renderImageConvertEmpty((err && err.message) || 'PDF 합치기 실패. 다시 시도해 주세요.'); });
  }
  function renderImageConvertPdfMergeResult() {
    var r = state.toolPdfResult, result = document.getElementById('iw-imgconv-result'); if (!r || !result) return;
    result.innerHTML = '<div class="iw-imgconv-summary"><span>이미지 ' + r.pageCount + '장 → PDF 1개</span><span>' + fmtBytes(r.size) + '</span></div>'
      + '<label class="iw-field iw-imgconv-name-field"><span>파일명</span><div class="iw-imgconv-filename"><input id="iw-imgconv-pdf-name" type="text" value="' + esc(r.name.replace(/\.pdf$/i, '')) + '" oninput="OSInsuwork.imgConvertPdfNameInput(this)"><span>.pdf</span></div></label>'
      + '<div class="iw-imgconv-actions"><button type="button" class="iw-btn primary" onclick="OSInsuwork.imgConvertPdfMergeDownload()">다운로드 저장</button><button type="button" class="iw-btn" onclick="OSInsuwork.imgConvertPdfMergeSaveToInsuwork()">보험워크 저장</button></div>'
      + '<p class="iw-imgconv-pdf-note" id="iw-imgconv-pdf-save-status"></p>';
  }
  function imgConvertPdfNameInput(input) {
    var r = state.toolPdfResult; if (!r) return;
    var value = String(input.value || '').trim() || '파일';
    r.name = value.replace(/\.pdf$/i, '') + '.pdf';
  }
  function imgConvertPdfMergeDownload() { var r = state.toolPdfResult; if (r) downloadBlob(r.url, r.name); }
  function imgConvertPdfMergeSaveToInsuwork() {
    var r = state.toolPdfResult; if (!r) return;
    var status = document.getElementById('iw-imgconv-pdf-save-status');
    toolSaveFolderPicker(r.blob, r.name, 'application/pdf', status);
  }

  // ── 저장 위치 선택(내 파일함 폴더 탐색) — 도구 결과물 저장 공용 ─────────────
  function toolSaveFolderPicker(blob, filename, mime, statusEl) {
    var owner = currentUserId();
    if (!owner) { briefingAlert('로그인이 필요합니다.'); return; }
    if (statusEl) statusEl.textContent = '폴더 목록을 불러오는 중…';
    window.db.fetch('/rest/v1/insuwork_items?owner_id=eq.' + encodeURIComponent(owner) + '&item_type=eq.folder&deleted_at=is.null&order=title.asc&select=id,title,parent_id')
      .then(function (res) { if (!res.ok) throw new Error('폴더 목록을 불러오지 못했습니다.'); return res.json(); })
      .then(function (folders) {
        if (statusEl) statusEl.textContent = '';
        state.toolSavePicker = { folders: folders || [], path: [{ id: null, title: '내 파일함' }], blob: blob, filename: filename, mime: mime, owner: owner };
        renderToolSavePicker();
      })
      .catch(function (err) { if (statusEl) statusEl.textContent = err.message || '폴더 목록을 불러오지 못했습니다.'; });
  }
  function renderToolSavePicker() {
    var p = state.toolSavePicker; if (!p) return;
    var parentId = p.path[p.path.length - 1].id;
    var trail = p.path.map(function (crumb, i) { return (i > 0 ? '<span>›</span>' : '') + '<button type="button" onclick="OSInsuwork.toolSavePickerGo(' + i + ')">' + esc(crumb.title) + '</button>'; }).join('');
    var children = p.folders.filter(function (f) { return String(f.parent_id || '') === String(parentId || ''); });
    var list = children.length
      ? children.map(function (f) { return '<button type="button" class="iw-folder-row" onclick="OSInsuwork.toolSavePickerEnter(\'' + esc(f.id) + '\')">📁 ' + esc(f.title) + '</button>'; }).join('')
      : '<p class="iw-folder-empty">하위 폴더가 없습니다.</p>';
    dialog('<div class="iw-folder-dialog-body"><h2>보험워크에 저장</h2><nav class="iw-folder-trail">' + trail + '</nav><div class="iw-folder-list">' + list + '</div><button type="button" class="iw-folder-new-btn" onclick="OSInsuwork.toolSavePickerNewFolder()">+ 새 폴더</button><p class="iw-folder-status" id="iw-tool-save-status"></p><div class="iw-form-actions"><button type="button" class="iw-btn" onclick="OSInsuwork.closeDialog()">취소</button><button type="button" class="iw-btn primary" onclick="OSInsuwork.toolSavePickerConfirm()">이 폴더에 저장</button></div></div>');
  }
  function toolSavePickerGo(index) { var p = state.toolSavePicker; if (!p) return; p.path = p.path.slice(0, index + 1); renderToolSavePicker(); }
  function toolSavePickerEnter(id) {
    var p = state.toolSavePicker; if (!p) return;
    var folder = p.folders.find(function (f) { return String(f.id) === String(id); });
    if (folder) { p.path.push({ id: folder.id, title: folder.title }); renderToolSavePicker(); }
  }
  function toolSavePickerNewFolder() {
    var p = state.toolSavePicker; if (!p) return;
    briefingPrompt('새 폴더 이름을 입력하세요.', '새 폴더').then(function (name) {
      if (name == null || !String(name).trim()) return;
      var parentId = p.path[p.path.length - 1].id;
      writeOne('insuwork_items', { owner_id: p.owner, parent_id: parentId || null, item_type: 'folder', title: String(name).trim(), visibility: 'private' })
        .then(function (created) { upsertWorkspaceItem(created); p.folders.push(created); p.path.push({ id: created.id, title: created.title }); renderToolSavePicker(); })
        .catch(function (err) { briefingAlert(err.message || '폴더를 만들지 못했습니다.'); });
    });
  }
  function toolSavePickerConfirm() {
    var p = state.toolSavePicker; if (!p) return;
    var status = document.getElementById('iw-tool-save-status'); if (status) status.textContent = '저장하는 중…';
    var parentId = p.path[p.path.length - 1].id;
    var id = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    var ext = (p.filename.split('.').pop() || 'pdf').toLowerCase();
    var path = p.owner + '/root/' + id + '.' + ext;
    var token = window.db.getToken();
    var row = { id: id, owner_id: p.owner, parent_id: parentId || null, item_type: 'file', title: p.filename, storage_path: path, mime_type: p.mime, extension: ext, file_size: p.blob.size, visibility: 'private', created_at: new Date().toISOString() };
    fetch(window.db.url('/storage/v1/object/myspace/' + path.split('/').map(encodeURIComponent).join('/')), {
      method: 'POST', headers: { apikey: window.db.key, Authorization: 'Bearer ' + token, 'Content-Type': p.mime, 'x-upsert': 'false' }, body: p.blob
    }).then(function (res) { if (!res.ok) throw new Error('파일 저장에 실패했습니다.'); return true; })
      .then(function () { return write('insuwork_items', row); })
      .then(function () { upsertWorkspaceItem(row); closeDialog(); if (typeof window.toast === 'function') window.toast('보험워크 "' + p.path[p.path.length - 1].title + '"에 저장했습니다.'); })
      .catch(function (err) { if (status) status.textContent = err.message || '저장에 실패했습니다.'; });
  }
  function editEvent(id) { var event = state.data.events.find(function (entry) { return String(entry.id) === String(id); }); if (!event) return; closeDialog(); dialog(formShell('일정 수정', eventFormHtml(event), 'OSInsuwork.saveEvent()')); }
  function deleteEvent(id) {
    if (!id) return;
    briefingConfirm('이 일정을 삭제할까요?', '일정 삭제', '삭제', true).then(function (ok) {
      if (!ok) return;
      softDelete('insuwork_tasks?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()) + '&deleted_at=is.null').then(function () {
        state.data.events = state.data.events.filter(function (entry) { return String(entry.id) !== String(id); });
        closeDialog(); renderContent();
        if (typeof window.toast === 'function') window.toast('일정을 삭제했습니다.');
      }).catch(saveError);
    });
  }
  function openDayCreate(date) { state.selectedDate = date; renderContent(); setUrl(false); addEvent(date); }
  function toggleEventComplete(id) {
    var event = state.data.events.find(function (entry) { return String(entry.id) === String(id); }); if (!event) return;
    var completedAt = event.completed_at ? null : new Date().toISOString();
    updateOne('insuwork_tasks?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { completed_at: completedAt })
      .then(function (saved) { upsertTask(saved); rebuildWorkspaceDerived(); renderContent(); showEvent(id); if (typeof window.toast === 'function') window.toast(completedAt ? '완료 처리했습니다.' : '완료를 취소했습니다.'); }).catch(saveError);
  }
  function consultationStatusChanged(select, source) {
    if (!select) return;
    if (source === 'detail') { var careFields = document.getElementById('iwd-consult-care-fields'); if (careFields) careFields.hidden = select.value !== '청약완료'; }
    if (select.value !== '예약') return;
    var name = value(source === 'detail' ? 'iwd-consult-name' : 'iwf-consult-name'); openReservationPopup(name);
  }
  function openReservationPopup(name) {
    var box = document.getElementById('iw-reservation-dialog'), body = document.getElementById('iw-reservation-body'); if (!box || !body) return;
    body.innerHTML = formShell('캘린더 일정 추가', formField('날짜', '<input id="iwr-event-date" type="date" required value="' + ymd(new Date()) + '">') + formField('시간', '<input id="iwr-event-time" type="time">') + formField('일정 제목', '<input id="iwr-event-title" required autocomplete="off" value="' + esc((name || '고객') + ' 상담 예약') + '">') + formField('일정 내용', '<textarea id="iwr-event-desc" rows="5"></textarea>'), 'OSInsuwork.saveReservationEvent()');
    var cancel = body.querySelector('.iw-form-actions .iw-btn'); if (cancel) cancel.setAttribute('onclick', 'OSInsuwork.closeReservationPopup()');
    if (!box.open && box.showModal) box.showModal(); else if (!box.open) box.setAttribute('open', '');
  }
  function closeReservationPopup() { var box = document.getElementById('iw-reservation-dialog'); if (box && box.close) box.close(); else if (box) box.removeAttribute('open'); }
  function saveReservationEvent() { var date = value('iwr-event-date'), title = value('iwr-event-title'); if (!date || !title) return; writeOne('insuwork_tasks', { task_date: date, task_time: value('iwr-event-time') || null, title: title, description: value('iwr-event-desc') || null, owner_id: currentUserId() }).then(function (created) { upsertTask(created); state.selectedDate = date; state.cursor = parseDate(date); closeReservationPopup(); rebuildWorkspaceDerived(); renderContent(); if (typeof window.toast === 'function') window.toast('캘린더에 상담 예약을 추가했습니다.'); }).catch(saveError); }
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
  function saveRichChildren(rows) { return Promise.all((rows || []).map(function (rowBody) { var stamped = Object.assign({ created_at: new Date().toISOString() }, rowBody); return write('insuwork_items', stamped).then(function () { upsertWorkspaceItem(stamped); return stamped; }); })); }
  function saveAsset() {
    var type = value('iwf-asset-type'), title = value('iwf-title'), body = richValue('iwf-body'), link = value('iwf-link'), category = type === 'note' ? 'note' : type === 'memo' ? 'memo' : 'file';
    if (!title) { briefingAlert('제목을 입력해 주세요.'); return; }
    if (!richHasText(body) && !(type === 'link' && link)) { briefingAlert('내용을 입력해 주세요.'); return; }
    var parent = state.assetFolder && currentAssetCategory() === category ? state.assetFolder : null, itemId = crypto.randomUUID();
    prepareRichUploads(itemId, body, category).then(function (prepared) {
      var row = { id: itemId, owner_id: currentUserId(), parent_id: parent, item_type: type === 'note' ? 'note' : type === 'memo' ? 'memo' : 'link', title: title, body: prepared.body, url: link || null, visibility: value('iwf-visibility') === 'public' ? 'public' : 'private', legacy_payload: { workspace_category: category }, created_at: new Date().toISOString() };
      return write('insuwork_items', row).then(function () { return saveRichChildren(prepared.rows); }).then(function () { return row; });
    }).then(function (row) { state.assetFilter = category; state.assetFolder = parent; upsertWorkspaceItem(row); resetRichPending(); finishSave('자료를 저장했습니다.'); }).catch(saveError);
  }
  function saveCustomer() { var name = value('iwf-customer-name'), phone = phoneText(value('iwf-customer-phone')), note = richValue('iwf-customer-note'), contractDates = gatherContractDates('iwf-customer'), birth = value('iwf-customer-birth'), genderInput = document.querySelector('input[name="iwf-customer-gender"]:checked'), gender = genderInput ? genderInput.value : ''; if (!name || !contractDates.length) return; var profile = { customer_managed: true, contract_dates: contractDates, contract_date: contractDates[0], birth_date: birth || null, gender: gender || null, zip: value('iwf-customer-zip') || null, address: value('iwf-customer-address') || null, address_detail: value('iwf-customer-address-detail') || null, job: value('iwf-customer-job') || null, driving_status: drivingStatusValues('iwf-customer'), medication: value('iwf-customer-medication') || null, medical_history: value('iwf-customer-history') || null, diagnosis_date: value('iwf-customer-diagnosis') || null, current_condition: value('iwf-customer-current-status') || null, note: sanitizeRich(note) }; writeOne('insuwork_customers', { owner_id: currentUserId(), name: name, phone: phone || null, status: value('iwf-customer-status') || '청약완료', profile: profile }).then(function (customer) { return saveCustomerRich(customer, profile, note); }).then(function (customer) { upsertCustomer(customer); resetRichPending(); return syncCareTasksForCustomer(customer); }).then(function () { finishSave('고객을 등록했습니다.'); }).catch(saveError); }
  function saveCustomerRich(customer, profile, body) { var root = customerAttachmentRoot(customer.id), hasPending = state.pendingRichImages.length || state.pendingRichFiles.length; if (!root && !hasPending) return Promise.resolve(customer); var rootId = root ? root.id : crypto.randomUUID(), rootBody = { id: rootId, owner_id: currentUserId(), item_type: 'memo', title: '고객 첨부 · ' + customer.id, body: sanitizeRich(body), visibility: 'private', legacy_payload: { workspace_category: 'customer', customer_id: customer.id, attachment_root: true } }; var ready = root ? Promise.resolve(root) : writeOne('insuwork_items', rootBody).then(function (created) { upsertWorkspaceItem(created); return created; }); return ready.then(function () { return prepareRichUploads(rootId, body, 'customer'); }).then(function (prepared) { return updateOne('insuwork_items?id=eq.' + encodeURIComponent(rootId) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { body: prepared.body }).then(function (savedItem) { upsertWorkspaceItem(savedItem); return saveRichChildren(prepared.rows); }).then(function () { var updatedProfile = Object.assign({}, profile, { note: prepared.body }); return updateOne('insuwork_customers?id=eq.' + encodeURIComponent(customer.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { profile: updatedProfile }); }); }); }
  function saveConsultation() {
    var customerId = value('iwf-consult-customer-id'), consultationId = value('iwf-consult-id'), name = value('iwf-consult-name'), birth = value('iwf-consult-birth'), date = value('iwf-consult-date'), phone = phoneText(value('iwf-consult-phone')), status = value('iwf-consult-status'), memo = richValue('iwf-consult-memo');
    var genderInput = document.querySelector('input[name="iwf-consult-gender"]:checked'), gender = genderInput ? genderInput.value : '';
    if (!name || !date || !richHasText(memo)) return;
    var existing = state.data.customers.find(function (entry) { return String(entry.id) === String(customerId); }) || {}, promoted = status === '청약완료', profile = Object.assign({}, customerProfile(existing), { birth_date: birth || null, gender: gender || null });
    if (promoted) profile.customer_managed = true;
    var customerBody = { owner_id: currentUserId(), name: name, phone: phone || null, status: promoted ? '청약완료' : (existing.status || status || '예약'), profile: profile };
    var customerPromise = customerId ? updateOne('insuwork_customers?id=eq.' + encodeURIComponent(customerId) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), customerBody) : writeOne('insuwork_customers', customerBody);
    customerPromise.then(function (customer) {
      upsertCustomer(customer);
      var content = consultationId ? memo : '<p><strong>[' + esc(writtenAt()) + ']</strong></p>' + memo;
      var consultationBody = { customer_id: customer.id, owner_id: currentUserId(), consulted_at: date + 'T00:00:00+09:00', channel: status || '예약', content: content };
      return consultationId ? updateOne('insuwork_consultations?id=eq.' + encodeURIComponent(consultationId) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), consultationBody) : writeOne('insuwork_consultations', consultationBody);
    }).then(function (saved) { return saveConsultationRich(saved, saved.content || memo).then(function (content) { if (content === saved.content) return saved; return updateOne('insuwork_consultations?id=eq.' + encodeURIComponent(saved.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { content: content }); }); }).then(function (saved) { upsertConsultation(saved); state.selectedConsultation = saved.id; resetRichPending(); finishSave(consultationId ? '상담을 수정했습니다.' : '상담을 등록했습니다.'); }).catch(saveError);
  }
  function saveConsultationRich(consultation, body) { var root = consultationAttachmentRoot(consultation.id), hasPending = state.pendingRichImages.length || state.pendingRichFiles.length; if (!root && !hasPending) return Promise.resolve(body); var rootId = root ? root.id : crypto.randomUUID(), rootBody = { id: rootId, owner_id: currentUserId(), item_type: 'memo', title: '상담 첨부 · ' + consultation.id, body: sanitizeRich(body), visibility: 'private', legacy_payload: { workspace_category: 'consultation', consultation_id: consultation.id, attachment_root: true } }; var ready = root ? Promise.resolve(root) : writeOne('insuwork_items', rootBody).then(function (created) { upsertWorkspaceItem(created); return created; }); return ready.then(function () { return prepareRichUploads(rootId, body, 'consultation'); }).then(function (prepared) { return updateOne('insuwork_items?id=eq.' + encodeURIComponent(rootId) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { body: prepared.body }).then(function (savedItem) { upsertWorkspaceItem(savedItem); return saveRichChildren(prepared.rows); }).then(function () { return prepared.body; }); }); }
  function selectConsultation(id) { resetRichPending(); state.selectedConsultation = id && String(state.selectedConsultation) !== String(id) ? id : null; renderContent(); }
  function selectCustomerDetail(id) { resetRichPending(); state.selectedCustomerDetail = id && String(state.selectedCustomerDetail) !== String(id) ? id : null; renderContent(); }
  function showRowHover(event) {
    var row = event.currentTarget, tip = document.getElementById('iw-row-hover'), text = row && row.getAttribute('data-hover-text');
    if (!tip || !text || document.querySelector('#v-insuwork .iw-consult-layout.has-detail')) return;
    tip.textContent = text;
    tip.style.display = 'block';
    var rect = row.getBoundingClientRect(), width = tip.offsetWidth;
    tip.style.left = Math.max(8, rect.right - width) + 'px';
    tip.style.top = (rect.bottom + 4) + 'px';
  }
  function hideRowHover() { var tip = document.getElementById('iw-row-hover'); if (tip) tip.style.display = 'none'; }
  function trashCustomer(id) {
    if (!id) return;
    briefingConfirm('이 고객을 휴지통으로 이동할까요? 상담기록은 보존되며 복원하면 다시 표시됩니다.', '고객 삭제', '이동', true).then(function (ok) {
      if (!ok) return;
      softDelete('insuwork_customers?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()) + '&deleted_at=is.null').then(function () {
        moveCustomerToTrashLocal(id);
        state.selectedConsultation = null;
        closeDialog(); renderContent();
        if (typeof window.toast === 'function') window.toast('고객을 휴지통으로 이동했습니다.');
      }).catch(saveError);
    });
  }
  function restoreCustomer(id) {
    if (!id) return;
    updateOne('insuwork_customers?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { deleted_at: null }).then(function (restored) {
      restoreCustomerFromTrashLocal(restored);
      renderContent();
      if (typeof window.toast === 'function') window.toast('고객을 복원했습니다.');
    }).catch(saveError);
  }
  function emptyTrash() {
    var count = (state.data.trashCustomers || []).length;
    if (!count) return;
    briefingConfirm('휴지통의 고객 ' + count + '명을 영구 삭제할까요? 연결된 상담기록도 함께 삭제되며 복구할 수 없습니다.', '휴지통 비우기', '영구 삭제', true).then(function (ok) {
      if (!ok) return;
      window.db.fetch('/rest/v1/insuwork_customers?owner_id=eq.' + encodeURIComponent(currentUserId()) + '&deleted_at=not.is.null', { method: 'DELETE', headers: { Prefer: 'return=representation' } })
        .then(function (response) { if (!response.ok) return response.text().then(function (message) { throw new Error(message || ('HTTP ' + response.status)); }); return response.json(); })
        .then(function (deleted) {
          if (!Array.isArray(deleted) || !deleted.length) throw new Error('영구 삭제 결과를 확인하지 못했습니다.');
          var ids = {}; (deleted || []).forEach(function (customer) { ids[String(customer.id)] = true; });
          state.data.trashCustomers = (state.data.trashCustomers || []).filter(function (customer) { return !ids[String(customer.id)]; });
          state.data.consultations = state.data.consultations.filter(function (consultation) { return !ids[String(consultation.customer_id)]; });
          state.data.events = state.data.events.map(function (event) { return ids[String(event.customer_id)] ? Object.assign({}, event, { customer_id: null }) : event; });
          renderContent();
          if (typeof window.toast === 'function') window.toast('휴지통을 비웠습니다.');
        }).catch(saveError);
    });
  }
  function refreshDetailInsuranceAge() { var target = document.getElementById('iwd-insurance-age'); if (!target) return; var age = insuranceAge(value('iwd-consult-birth'), value('iwd-consult-date')); target.textContent = age === '' ? '-' : age + '세'; }
  function refreshCustomerDetailInsuranceAge() { var target = document.getElementById('iwd-customer-insurance-age'); if (!target) return; var age = insuranceAge(value('iwd-customer-birth'), ymd(new Date())); target.textContent = age === '' ? '-' : age + '세'; }
  function saveCustomerDetail(id) {
    var item = state.data.customers.find(function (entry) { return String(entry.id) === String(id); }); if (!item) return;
    var name = value('iwd-customer-name'), birth = value('iwd-customer-birth'), contractDates = gatherContractDates('iwd-customer'), phone = phoneText(value('iwd-customer-phone')), status = value('iwd-customer-status'), note = sanitizeRich(richValue('iwd-customer-new'));
    var genderInput = document.querySelector('input[name="iwd-customer-gender"]:checked'), gender = genderInput ? genderInput.value : '';
    if (!name || !contractDates.length) return;
    var existingProfile = customerProfile(item);
    var profile = Object.assign({}, existingProfile, {
      customer_managed: true, contract_dates: contractDates, contract_date: contractDates[0], birth_date: birth || null, gender: gender || null,
      zip: value('iwd-customer-zip') || null, address: value('iwd-customer-address') || null, address_detail: value('iwd-customer-address-detail') || null,
      job: value('iwd-customer-job') || null, driving_status: drivingStatusValues('iwd-customer'), medication: value('iwd-customer-medication') || null, medical_history: value('iwd-customer-history') || null,
      diagnosis_date: value('iwd-customer-diagnosis') || null, current_condition: value('iwd-customer-current-status') || null, note: note
    });
    updateOne('insuwork_customers?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { name: name, phone: phone || null, status: status || '청약완료', profile: profile })
      .then(function (saved) { return saveCustomerRich(saved, profile, note); })
      .then(function (saved) { upsertCustomer(saved); resetRichPending(); return syncCareTasksForCustomer(saved); }).then(function () { finishSave('고객을 저장했습니다.'); }).catch(saveError);
  }
  function saveLegacyCustomerStatus(id) {
    var item = state.data.customers.find(function (entry) { return String(entry.id) === String(id); }); if (!item || !customerNeedsStatusReview(item)) return;
    var status = value('iwd-customer-status');
    if (!isRealCustomerStage(status)) { briefingAlert('보험워크 고객상태를 선택해 주세요.', '고객상태 확인'); return; }
    var profile = Object.assign({}, customerProfile(item));
    if (!profile.legacy_customer_status) profile.legacy_customer_status = item.status || '미지정';
    updateOne('insuwork_customers?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { status: status, profile: profile })
      .then(function (saved) { upsertCustomer(saved); state.selectedCustomerDetail = null; renderContent(); if (typeof window.toast === 'function') window.toast('고객상태를 저장했습니다.'); }).catch(saveError);
  }
  function deleteConsultation(id) {
    var item = state.data.consultations.find(function (entry) { return String(entry.id) === String(id); }); if (!item) return;
    briefingConfirm('이 상담 기록을 삭제할까요? 고객정보는 삭제되지 않습니다.', '상담 삭제', '삭제', true).then(function (ok) {
      if (!ok) return;
      return deleteOne('insuwork_consultations?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId())).then(function () {
        state.data.consultations = state.data.consultations.filter(function (entry) { return String(entry.id) !== String(id); });
        state.selectedConsultation = null; rebuildWorkspaceDerived(); renderContent();
        if (typeof window.toast === 'function') window.toast('상담 기록을 삭제했습니다.');
      });
    }).catch(saveError);
  }
  function saveConsultationDetail(id) {
    var item = state.data.consultations.find(function (entry) { return String(entry.id) === String(id); }); if (!item) return;
    var customer = state.data.customers.find(function (entry) { return String(entry.id) === String(item.customer_id); }); if (!customer) return;
    var name = value('iwd-consult-name'), birth = value('iwd-consult-birth'), date = value('iwd-consult-date'), phone = phoneText(value('iwd-consult-phone')), status = value('iwd-consult-status');
    var genderInput = document.querySelector('input[name="iwd-consult-gender"]:checked'), gender = genderInput ? genderInput.value : '';
    if (!name || !date) return;
    var customValues = Object.assign({}, customerProfile(customer).custom_fields || {}); document.querySelectorAll('[data-consult-custom]').forEach(function (input) { customValues[input.getAttribute('data-consult-custom')] = String(input.value || '').trim(); });
    var promoted = status === '청약완료', profile = Object.assign({}, customerProfile(customer), {
      birth_date: birth || null, gender: gender || null, custom_fields: customValues,
      zip: value('iwd-consult-care-zip') || null, address: value('iwd-consult-care-address') || null, address_detail: value('iwd-consult-care-address-detail') || null,
      job: value('iwd-consult-care-job') || null, driving_status: drivingStatusValues('iwd-consult-care'), medication: value('iwd-consult-care-medication') || null, medical_history: value('iwd-consult-care-history') || null,
      diagnosis_date: value('iwd-consult-care-diagnosis') || null, current_condition: value('iwd-consult-care-current-status') || null
    });
    if (promoted) profile.customer_managed = true;
    var content = sanitizeRich(richValue('iwd-consult-new'));
    updateOne('insuwork_customers?id=eq.' + encodeURIComponent(customer.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { name: name, phone: phone || null, status: promoted ? '청약완료' : (customer.status || status || '예약'), profile: profile })
      .then(function (savedCustomer) { upsertCustomer(savedCustomer); return updateOne('insuwork_consultations?id=eq.' + encodeURIComponent(item.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { consulted_at: date + 'T00:00:00+09:00', channel: status || '예약', content: content }); })
      .then(function (saved) { return saveConsultationRich(saved, saved.content || content).then(function (resolvedContent) { if (resolvedContent === saved.content) return saved; return updateOne('insuwork_consultations?id=eq.' + encodeURIComponent(saved.id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), { content: resolvedContent }); }); })
      .then(function (saved) { upsertConsultation(saved); resetRichPending(); finishSave('상담을 저장했습니다.'); }).catch(saveError);
  }
  function saveEvent() {
    var date = value('iwf-event-date'), title = value('iwf-event-title'), id = value('iwf-event-id'); if (!date || !title) return;
    var endDate = value('iwf-event-end-date') || date; if (endDate < date) endDate = date;
    var endTime = value('iwf-event-end-time');
    var body = { task_date: date, task_time: value('iwf-event-time') || null, end_date: endDate, end_time: endTime || null, title: title, description: value('iwf-event-desc') || null, customer_id: value('iwf-event-customer') || null };
    var promise = id ? updateOne('insuwork_tasks?id=eq.' + encodeURIComponent(id) + '&owner_id=eq.' + encodeURIComponent(currentUserId()), body) : writeOne('insuwork_tasks', Object.assign({}, body, { owner_id: currentUserId() }));
    promise.then(function (saved) { upsertTask(saved); state.selectedDate = date; state.cursor = parseDate(date); finishSave(id ? '일정을 수정했습니다.' : '일정을 추가했습니다.'); }).catch(saveError);
  }
  function setHomeDate(date, focusLabel) {
    state.homeDate = date;
    renderContent();
    setUrl(false);
    var button = document.querySelector('#v-insuwork .iw-home-date-nav [aria-label="' + focusLabel + '"]');
    if (button) button.focus();
    // 날짜 조회는 읽기 전용 홈 로드만 사용한다. 전체 로드의 고객케어 자동 동기화는 실행하지 않는다.
    if (authenticated()) loadData(false, true);
  }
  function moveHomeDate(direction) { setHomeDate(addDays(state.homeDate, direction), direction < 0 ? '이전 날짜' : '다음 날짜'); }
  function homeToday() { setHomeDate(ymd(new Date()), '오늘로 이동'); }
  function openHomeCalendar() { state.selectedDate = state.homeDate; state.cursor = parseDate(state.homeDate); go('calendar'); }
  function moveCalendar(direction) {
    if (state.calendarMode === 'month') state.cursor = new Date(state.cursor.getFullYear(), state.cursor.getMonth() + direction, 1);
    else { var step = state.calendarMode === 'day' ? 1 : state.calendarMode === 'week' ? 7 : 365; state.selectedDate = addDays(state.selectedDate, direction * step); state.cursor = parseDate(state.selectedDate); }
    renderContent(); setUrl(false);
  }
  function selectDate(date) { state.selectedDate = date; renderContent(); setUrl(false); }
  function openCalendarDay(date) { state.selectedDate = date; state.cursor = parseDate(date); state.calendarMode = 'day'; renderContent(); setUrl(false); }
  function restoreFromUrl() { var p = new URLSearchParams(location.search); if (p.get('view') !== 'insuwork') return false; var section = p.get('section'); if (SECTIONS.indexOf(section) >= 0) state.section = section; var mode = p.get('mode'); if (['day', 'week', 'month', 'agenda'].indexOf(mode) >= 0) state.calendarMode = mode; var tool = p.get('tool'); if (['calculator', 'bmi', 'image'].indexOf(tool) >= 0) state.toolMode = tool; var date = p.get('date'); if (/^\d{4}-\d{2}-\d{2}$/.test(date || '')) { state.selectedDate = date; state.cursor = parseDate(date); if (state.section === 'home') state.homeDate = date; } else if (state.section === 'home') state.homeDate = ymd(new Date()); return true; }
  /* 최초 진입(boot()/appstate:ready) 전용 — 원래 쿼리스트링에 view/section이 전혀 없었고 결과 섹션도
     기본값인 home이면, 이번 openWorkspace() 호출은 setUrl()을 아예 건너뛰어 깨끗한 /insuwork 주소를
     그대로 둔다. 그 외(딥링크로 들어왔거나 보호 메뉴라 home으로 튕기는 경우가 아닌 등)는 기존처럼
     'skip-url'이 아닌 false(=replaceState)를 써서 지금까지의 동작을 유지한다. */
  function initialOpenPush() { return (!INITIAL_URL_HAD_VIEW_PARAMS && state.section === 'home') ? 'skip-url' : false; }
  function boot() { var localTest = isLocal() && new URLSearchParams(location.search).get('pwtest') === '1'; if (!ensureShell()) return; restoreFromUrl(); if (localTest) { state.data = { items: [], library: [{ id: 'l1', title: '고객 보장자료', description: '고객상담 자료', created_at: '2026-08-14', scope: 'personal' }], scripts: [{ id: 's1', title: '상담 업무노트', script_text: '<p>한글 검색 확인</p>', created_at: '2026-08-13', scope: 'personal' }], events: [{ id: 'e1', title: '김고객 상담', description: '갱신 상담', event_date: ymd(new Date()), event_time: '10:00' }], customers: [{ id: 'c1', name: '김고객', phone: '010-1234-5678', status: '상담중', created_at: '2026-08-10', profile: { customer_managed: true } }], consultations: [{ id: 'co1', customer_id: 'c1', memo: '보장 상담 완료', channel: '전화', consulted_at: '2026-08-13' }] }; state.adminUsers = [{ id: 'u1', name: '임태성', nickname: '임실장', email: 'bylts@naver.com', company: '에즈금융서비스', phone: '010-1234-5678', status: 'active', created_at: '2026-08-27T09:00:00+09:00', last_seen_at: '2026-08-27T13:30:00+09:00' }, { id: 'u2', name: '테스트 사용자', nickname: '', email: 'member@example.com', company: '원세컨드', phone: '010-0000-0000', status: 'pending', created_at: '2026-08-27T10:00:00+09:00', last_seen_at: null }]; readFavoritesFromStorage(); if (!state.favorites.length) state.favorites = [{ target_type: 'customer', target_id: 'c1', title: '김고객', subtitle: '010-1234-5678', sort_order: 0, created_at: new Date().toISOString() }]; state.status = 'ready'; state.loadedFor = 'local-test'; state.coreLoaded = true; state.fullLoaded = true; renderShell(); return; } proceedPastMigrationGate(function () { openWorkspace(state.section, initialOpenPush()); }); }

  restoreFromUrl();
  document.addEventListener('appstate:ready', function () { if (!document.getElementById('v-insuwork')) ensureShell(); restoreFromUrl(); proceedPastMigrationGate(function () { openWorkspace(state.section, initialOpenPush()); }); });
  window.addEventListener('popstate', function () { if (!restoreFromUrl()) return; openWorkspace(state.section, false); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && state.preview) closePreview(); else if (state.preview && state.preview.type === 'pdf' && event.key === 'ArrowRight') previewPage(1); else if (state.preview && state.preview.type === 'pdf' && event.key === 'ArrowLeft') previewPage(-1); });
  document.addEventListener('click', function (event) { var menu = document.getElementById('iw-preview-ddak-menu'); if (menu && !menu.hidden && !menu.contains(event.target) && !event.target.closest('.iw-preview-ddak')) closeDdakMenu(); });
  document.addEventListener('click', function (event) { var open = document.querySelectorAll('.iw-rich-color-pop[open]'); Array.prototype.forEach.call(open, function (pop) { if (!pop.contains(event.target)) pop.open = false; }); });
  document.addEventListener('click', function (event) { var panel = document.getElementById('iw-fav-panel'); if (panel && !panel.hidden && !panel.contains(event.target) && !event.target.closest('.iw-fav-toggle')) closeFavoritesPanel(); });
  document.addEventListener('click', function (event) { document.querySelectorAll('.iw-nav-guide[open]').forEach(function (guide) { if (!guide.contains(event.target)) guide.open = false; }); });
  document.addEventListener('click', function (event) { document.querySelectorAll('.iw-driving-panel').forEach(function (panel) { if (!panel.hidden && !panel.contains(event.target) && !event.target.closest('.iw-driving-toggle')) panel.hidden = true; }); });
  window.addEventListener('load', function () { window.setTimeout(boot, 350); });
  /* 모바일 "오늘" 화면 전용 읽기 전용 조회 함수 2종 (2026-08-22, Phase 1 — feat/workstation-mobile-today).
     기존 렌더 함수·로직은 그대로 두고 애디티브로만 추가. state.data는 읽기만 하고(변형 금지), 반환값은 얕은 복사만 넘긴다.
     새로운 API 호출 없음 — 이미 loadData()가 채워둔 state.data만 조회한다. */
  function todaySummary() {
    var today = ymd(new Date());
    var isToday = function (event) { return String((event && event.event_date) || '').slice(0, 10) === today; };
    var todaysEvents = allEvents().filter(isToday);
    var events = todaysEvents.map(function (event) { return Object.assign({}, event); });
    var care = todaysEvents.filter(isCareTask).map(function (event) { return Object.assign({}, event); });
    var insuranceAge = insuranceAgeCalendarEventsForYear(new Date().getFullYear()).filter(isToday).map(function (event) { return Object.assign({}, event); });
    return { events: events, care: care, insuranceAge: insuranceAge };
  }
  function upcomingConsultPrep() {
    var tomorrow = addDays(ymd(new Date()), 1);
    var customersById = {};
    (state.data.customers || []).forEach(function (customer) { customersById[customer.id] = customer; });
    var tomorrowConsults = (state.data.consultations || []).filter(function (entry) {
      return String((entry && entry.consulted_at) || '').slice(0, 10) === tomorrow;
    });
    return tomorrowConsults.map(function (consultation) {
      var customer = customersById[consultation.customer_id] || {};
      var customerRoot = customerAttachmentRoot(consultation.customer_id);
      var consultRoot = consultationAttachmentRoot(consultation.id);
      var files = [];
      if (customerRoot) files = files.concat((state.data.items || []).filter(function (entry) { return entry.parent_id === customerRoot.id; }));
      if (consultRoot) files = files.concat((state.data.items || []).filter(function (entry) { return entry.parent_id === consultRoot.id; }));
      var fileNames = files.map(function (entry) { return (entry && (entry.title || entry.storage_path)) || '(이름 없음)'; });
      return { customerId: consultation.customer_id, customerName: customer.name || '고객', consultationId: consultation.id, files: fileNames.slice() };
    });
  }
  /* 모바일 "캘린더" 화면 전용 읽기 전용 조회 함수 1종 (2026-08-22, Phase 2 — feat/workstation-mobile-calendar).
     eventsFor(date)와 같은 원칙(순수 함수, state.data 읽기만, 얕은 복사 반환) — 날짜 범위로 확장한 버전. */
  function eventsInRange(startDate, endDate) {
    return allEvents().filter(function (event) {
      var start = String((event && event.event_date) || '').slice(0, 10);
      if (!start) return false;
      var end = String((event && (event.event_end_date || event.event_date)) || '').slice(0, 10);
      return start <= endDate && end >= startDate;
    }).map(function (event) { return Object.assign({}, event); }).sort(function (a, b) {
      return String(a.event_date || '').localeCompare(String(b.event_date || ''))
        || eventPriority(a) - eventPriority(b)
        || String(a.event_time || '').localeCompare(String(b.event_time || ''))
        || String(a.title || '').localeCompare(String(b.title || ''), 'ko');
    });
  }
  /* 모바일 고객 목록도 PC 고객관리와 같은 기준을 쓴다: 관리 고객만, 청약일 최신순.
     모바일 화면은 카드 UI만 다르고 목록의 포함/정렬 기준은 PC와 맞춘다. */
  function customersDirectory() {
    var today = ymd(new Date());
    var consultsByCustomer = {};
    state.data.consultations.forEach(function (item) {
      var key = String(item.customer_id);
      if (!consultsByCustomer[key]) consultsByCustomer[key] = [];
      consultsByCustomer[key].push({ id: item.id, date: String(item.consulted_at || item.created_at || '').slice(0, 10), memo: stripHtml(item.memo || '') });
    });
    Object.keys(consultsByCustomer).forEach(function (key) { consultsByCustomer[key].sort(function (a, b) { return b.date.localeCompare(a.date); }); });
    var careByCustomer = {};
    allEvents().forEach(function (event) {
      if (!isCareTask(event) || !event.customer_id) return;
      var key = String(event.customer_id);
      var date = String(event.event_date || '').slice(0, 10);
      if (date < today) return;
      if (!careByCustomer[key] || date < careByCustomer[key].date) careByCustomer[key] = { date: date, title: event.title || '' };
    });
    return state.data.customers.filter(isManagedCustomer).sort(function (a, b) {
      var ad = String(customerProfile(a).contract_date || a.created_at || '').slice(0, 10);
      var bd = String(customerProfile(b).contract_date || b.created_at || '').slice(0, 10);
      return bd.localeCompare(ad);
    }).map(function (customer) {
      var key = String(customer.id);
      var care = careByCustomer[key];
      var profile = customerProfile(customer);
      return {
        id: customer.id, name: customer.name || '', phone: customer.phone || customer.phone_raw || '', status: customer.status || '',
        contractDate: String(profile.contract_date || customer.created_at || '').slice(0, 10),
        birthDate: profile.birth_date || '',
        displayStatus: customerDisplayStatus(customer),
        note: stripHtml(profile.note || ''),
        consultations: (consultsByCustomer[key] || []).slice(0, 5),
        nextCareDate: care ? care.date : '', nextCareTitle: care ? care.title : ''
      };
    });
  }
  /* 모바일 "상담관리" 화면 전용 읽기 전용 조회 함수 1종 (2026-08-22, feat/workstation-mobile-consultations-list).
     customersDirectory()는 고객별로 묶어 반환하지만, 이번 화면은 전체 고객을 가로지르는 상담 단위 평탄화 목록이
     필요하다(PC 데스크탑의 "상담관리" 화면과 같은 성격, 모바일엔 아직 없었음 — 대표 지적). state.data.consultations를
     그대로 순회해 고객명만 붙여 최신순으로 정렬한 새 배열을 반환하는 순수 함수만 추가한다(기존 함수·로직 변경
     없음, state 쓰기 없음, 새 API 호출 없음). memo는 customersDirectory()와 동일하게 stripHtml()로 평문화한다. */
  function consultationsDirectory() {
    var customersById = {};
    state.data.customers.forEach(function (customer) { customersById[String(customer.id)] = customer; });
    return state.data.consultations.filter(function (item) {
      return !!customersById[String(item.customer_id)];
    }).map(function (item) {
      var customer = customersById[String(item.customer_id)] || {};
      var profile = customerProfile(customer);
      var status = consultationStatus(item, customer);
      return {
        id: item.id,
        customerId: item.customer_id,
        customerName: customer.name || '(이름 없음)',
        customerPhone: customer.phone || customer.phone_raw || '',
        customerBirth: profile.birth_date || '',
        date: String(item.consulted_at || item.created_at || '').slice(0, 10),
        channel: item.channel || '',
        status: status,
        memo: stripHtml(item.memo || item.content || '')
      };
    }).sort(function (a, b) { return b.date.localeCompare(a.date); });
  }
  /* 모바일 "고객관리" 상세 화면 전용 쓰기 wrapper 1종 (2026-08-22, Phase 4 — feat/workstation-mobile-quicknote).
     새 REST 저장 로직을 만들지 않는다. 기존 상담 등록 함수 saveConsultation()(위 2641행)이 신규 상담을 저장할 때
     쓰는 insuwork_consultations 필드 조합(customer_id/owner_id/consulted_at/channel/content, 2651행)과
     writeOne() 저장 경로(1876행)를 그대로 재사용한다. saveConsultation()은 이름/생년월일/전화 등 DOM 폼 입력에
     묶여 있고 고객 프로필까지 함께 갱신(customerPromise, 2646~2648행)하므로, 이미 존재하는 고객에게 짧은 메모
     한 건만 남기는 이 화면에서 그대로 호출하면 이름/연락처가 빈 값으로 덮어써질 위험이 있어 고객 upsert 단계는
     생략하고 상담 저장 부분(writeOne + upsertConsultation + rebuildWorkspaceDerived)만 동일하게 가져온다.
     owner_id는 saveConsultation()과 동일하게 항상 currentUserId()로 고정하며, channel(상담 단계)은 임의로
     바꾸지 않고 고객의 현재 status를 그대로 보존한다(빠른 메모가 파이프라인 단계를 바꾸지 않도록). */
  function quickSaveConsultationNote(customerId, text) {
    var trimmed = String(text == null ? '' : text).trim();
    if (!customerId) return Promise.reject(new Error('고객 정보를 확인하지 못했습니다.'));
    if (!trimmed) return Promise.reject(new Error('메모 내용을 입력해 주세요.'));
    var allowedChannels = ['예약', '진행중', '제안서발송', '클로징', '청약완료', '보류', '종결'];
    var customer = state.data.customers.find(function (entry) { return String(entry.id) === String(customerId); });
    var channel = customer && allowedChannels.indexOf(customer.status) >= 0 ? customer.status : '예약';
    var content = '<p><strong>[' + esc(writtenAt()) + ']</strong></p><p>' + esc(trimmed).replace(/\n/g, '<br>') + '</p>';
    var consultationBody = { customer_id: customerId, owner_id: currentUserId(), consulted_at: new Date().toISOString(), channel: channel, content: content };
    return writeOne('insuwork_consultations', consultationBody).then(function (saved) {
      upsertConsultation(saved);
      rebuildWorkspaceDerived();
      return saved;
    });
  }
  /* 모바일 "자료" 통합 검색·미리보기 화면 전용 읽기전용 조회 2종 (2026-08-22, Phase 5 — feat/workstation-mobile-library).
     새 REST 로직을 만들지 않는다. libraryDirectory()는 이미 loadData(true)/rebuildWorkspaceDerived()가 채워둔
     state.data.scripts(업무노트, item_type='note')·state.data.library(자료실 — 메모/파일/링크, 폴더 제외)를
     그대로 읽어 평문 검색 텍스트와 화면 표시용 안전한 본문 HTML을 만든다. 본문 HTML은 데스크탑 showAsset()
     (위 1794행 부근)이 상세 화면을 그릴 때와 똑같이 linkifyRich(body)를 거친다 — linkifyRich 내부에서
     sanitizeRich를 다시 실행하므로, 저장 시점에 이미 sanitizeRich를 거친 값이라도 표시 시점에 한 번 더
     정화한다(데스크탑과 동일한 이중 방어를 그대로 재사용, 새로 판단하지 않음). 여기서 다루는 "업무노트"는
     사용자가 직접 쓰는 insuwork_items 메모이며, 원세컨드가 제공하는 별도 "스크립트 카드"(state.scriptsData,
     scriptsHtml())와는 다른 데이터라 포함하지 않는다.
     libraryFeedDirectory()는 소식지·영업방향 화면에서 이미 쓰는 loadNewsletterData()/loadStrategyData()
     (각각 위 1070·1220행 부근)를 그대로 호출해 캐시된 state.newsData/state.strategyData를 돌려준다 — 이 두
     로더는 자체적으로 중복 호출을 막아(state.newsLoading/state.strategyLoading) 여러 번 불러도 안전하다.
     두 데이터셋은 PDF 원문이라 본문 텍스트가 없어(회사·제목·발행월만 있음) 통합 검색 대상에서는 제외하고,
     최근 목록 열람 + 원문 열기(직접 URL이 있을 때만)로만 모바일에 노출한다. */
  function libraryDirectory() {
    var scripts = state.data.scripts.map(function (item) {
      var body = item.script_text || '';
      return {
        id: item.id, source: 'scripts', kind: '업무노트', title: item.title || '', createdAt: item.created_at,
        searchText: ((item.title || '') + ' ' + stripHtml(body)).toLowerCase(),
        previewText: stripHtml(body).slice(0, 100),
        bodyHtml: linkifyRich(body), linkUrl: ''
      };
    });
    var library = state.data.library.filter(function (item) { return item.item_type !== 'folder'; }).map(function (item) {
      var body = item.body || '';
      var kind = item.item_type === 'memo' ? '메모' : item.item_type === 'link' ? '링크' : '자료';
      return {
        id: item.id, source: 'library', kind: kind, title: item.title || '', createdAt: item.created_at,
        searchText: ((item.title || '') + ' ' + stripHtml(body) + ' ' + (item.url || '')).toLowerCase(),
        previewText: stripHtml(body).slice(0, 100),
        bodyHtml: body ? linkifyRich(body) : '', linkUrl: item.url || ''
      };
    });
    return scripts.concat(library);
  }
  function libraryFeedDirectory() {
    loadNewsletterData();
    loadStrategyData();
    return {
      newsletters: (state.newsData || []).map(function (row) {
        return {
          id: row.id, kind: '소식지', title: (row.company ? row.company + ' · ' : '') + newsMonthLabel(row),
          sortKey: (Number(row.publish_year) || 0) * 12 + (Number(row.publish_month) || 0),
          openUrl: String(row.source_pdf_url || '').trim()
        };
      }),
      strategies: (state.strategyData || []).map(function (row) {
        return {
          id: row.id, kind: '영업방향', title: (row.company ? row.company + ' · ' : '') + strategyLabel(row),
          sortKey: (Number(row.publish_year) || 0) * 12 + (Number(row.publish_month) || 0),
          openUrl: String(row.source_file_url || '').trim()
        };
      }),
      newsletterLoading: !!state.newsLoading,
      strategyLoading: !!state.strategyLoading
    };
  }
  window.OSInsuwork = {
    saveLegacyCustomerStatus: saveLegacyCustomerStatus,
    boot: boot, go: go, legacy: legacy, reload: function () { return loadData(true); }, reloadAdminUsers: function () { loadAdminUsers(true); }, filterAdminUserStatus: function (status) { state.adminUserStatus = status || 'all'; renderContent(); },
    /* 보험워크 모바일 전용 읽기 전용 조회 함수 (2026-08-22, fix/workstation-mobile-bugs 버그1).
       화면에 필요한 데이터가 준비됐는지 반환한다. 홈·캘린더는 전체 자료 본문을 기다리지 않고
       true가 된다(위 277행). 모바일 고객/자료 화면이 "빈 상태" 문구와 "로딩 중" 문구를 구분하는 데 쓴다. */
    isDataReady: function () { return dataReadyForSection(); },
    syncSavedWorkspaceItem: function (item) { upsertWorkspaceItem(item); if (state.section === 'assets') renderContent(); },
    loadMoreAssets: function () { state.assetsRenderLimit += LIST_PAGE_SIZE; renderContent(); },
    loadMoreCustomers: function () { state.customersRenderLimit += LIST_PAGE_SIZE; renderContent(); },
    loadMoreConsultations: function () { state.consultationsRenderLimit += LIST_PAGE_SIZE; renderContent(); },
    filterAssets: function (filter) { state.assetFilter = filter; state.assetFolder = null; state.assetsRenderLimit = LIST_PAGE_SIZE; renderContent(); },
    setAssetView: function (view) { if (['list', 'thumb', 'large'].indexOf(view) < 0) return; state.assetView = view; localStorage.setItem('ws_asset_view', view); renderContent(); },
    setPublicLibView: function (view) { if (['list', 'thumb', 'large'].indexOf(view) < 0) return; state.publicLibView = view; renderContent(); },
    openAssetFolder: function (id) { var folder = state.data.library.find(function (item) { return String(item.id) === String(id) && item.item_type === 'folder'; }); state.assetFolder = id || null; state.assetFilter = folder ? assetCategory(folder) : 'file'; state.assetsRenderLimit = LIST_PAGE_SIZE; renderContent(); },
    openAssetRoot: function (category) { state.assetFolder = null; state.assetFilter = ['note', 'file', 'memo'].indexOf(category) >= 0 ? category : 'all'; state.assetsRenderLimit = LIST_PAGE_SIZE; renderContent(); },
    showAsset: showAsset, openFilePreview: openFilePreview, openAssetPreview: openAssetPreview, openUrlPreview: openPreviewUrl, closePreview: closePreview, previewZoom: previewZoom, previewRotate: previewRotate, previewPage: previewPage, toggleDdakMenu: toggleDdakMenu, closeDdakMenu: closeDdakMenu, previewCopy: previewCopy, previewEditAsset: previewEditAsset, previewDeleteAsset: previewDeleteAsset, editAsset: editAsset, saveAssetEdit: saveAssetEdit, deleteAsset: deleteAsset, richCommand: richCommand, richColorCommand: richColorCommand, positionRichColorMenu: positionRichColorMenu, focusRich: focusRich, focusRichBody: focusRichBody, prepareRichFocus: prepareRichFocus, addRichImages: addRichImages, addRichFiles: addRichFiles, removeRichFile: removeRichFile, showCustomer: showCustomer, showEvent: showEvent, toggleFavorite: toggleFavorite, openFavorite: openFavorite, toggleFavoritesPanel: toggleFavoritesPanel, closeFavoritesPanel: closeFavoritesPanel, toggleDrivingPanel: toggleDrivingPanel, drivingCheckChanged: drivingCheckChanged, openPublicLibraryItem: openPublicLibraryItem, openPublicLibraryFile: openPublicLibraryFile, favoriteDragStart: favoriteDragStart, favoriteDragOver: favoriteDragOver, favoriteDragLeave: favoriteDragLeave, favoriteDrop: favoriteDrop, favoriteDragEnd: favoriteDragEnd,
    closeDialog: closeDialog, openHelp: openHelp, saveFeedback: saveFeedback, addAsset: function () { closeAssetMenu(); addAsset(); }, saveAsset: saveAsset, openVault: openVault, newFolder: newFolder, uploadFiles: uploadFiles, newAssetFolder: newAssetFolder, saveAssetFolder: saveAssetFolder, deleteAssetFolder: deleteAssetFolder, uploadAssetFiles: uploadAssetFiles, confirmAssetFileUpload: confirmAssetFileUpload,
    assetDragStart: assetDragStart, externalFileDragStart: externalFileDragStart, assetDragEnd: assetDragEnd, assetDragOver: assetDragOver, assetDragLeave: assetDragLeave, assetDrop: assetDrop,
    addCustomer: addCustomer, saveCustomer: saveCustomer, runCustomerOcr: runCustomerOcr, searchCustomerAddress: searchCustomerAddress, closeCustomerAddress: closeCustomerAddress, addContractDateRow: addContractDateRow, removeContractDateRow: removeContractDateRow, clearNameSearch: clearNameSearch, filterCustomerStatus: function (status) { state.customerStatusFilter = status || 'all'; state.selectedCustomerDetail = null; state.customersRenderLimit = LIST_PAGE_SIZE; renderContent(); }, selectCustomerDetail: selectCustomerDetail, saveCustomerDetail: saveCustomerDetail, showRowHover: showRowHover, hideRowHover: hideRowHover, refreshCustomerDetailInsuranceAge: refreshCustomerDetailInsuranceAge, refreshCustomerInsuranceAge: refreshCustomerInsuranceAge, addConsultation: addConsultation, editConsultation: editConsultation, saveConsultation: saveConsultation, selectConsultation: selectConsultation, deleteConsultation: deleteConsultation, filterConsultationStatus: function (status) { state.consultationStatusFilter = status || 'all'; state.selectedConsultation = null; state.consultationsRenderLimit = LIST_PAGE_SIZE; renderContent(); }, manageConsultColumns: manageConsultColumns, addConsultColumn: addConsultColumn, moveConsultColumn: moveConsultColumn, deleteConsultColumn: deleteConsultColumn, saveConsultationDetail: saveConsultationDetail, trashCustomer: trashCustomer, restoreCustomer: restoreCustomer, emptyTrash: emptyTrash, refreshInsuranceAge: refreshInsuranceAge, refreshDetailInsuranceAge: refreshDetailInsuranceAge, formatBirthInput: formatBirthInput, formatConsultPhone: formatConsultPhone, consultationStatusChanged: consultationStatusChanged, closeReservationPopup: closeReservationPopup, saveReservationEvent: saveReservationEvent, addEvent: addEvent, addEventForCustomer: addEventForCustomer, editEvent: editEvent, deleteEvent: deleteEvent, saveEvent: saveEvent, toggleEventTime: toggleEventTime, toggleEventComplete: toggleEventComplete, openCustomerFromEvent: openCustomerFromEvent, openDayCreate: openDayCreate, richPaste: richPaste,
    openTool: openTool, setToolMode: setToolMode, openCarrierSystem: openCarrierSystem, openPaymentSearchResult: openPaymentSearchResult, setCarrierType: function (type) { state.carrierType = type === 'life' ? 'life' : 'nonlife'; renderContent(); }, setPaymentType: function (type) { state.paymentType = type === 'life' ? 'life' : 'nonlife'; renderContent(); }, reloadPaymentInfo: function () { state.paymentData = null; state.paymentError = ''; loadPaymentInfo(); renderContent(); }, calcPress: calcPress, calcBmi: calcBmi, calcToolInsuranceAge: calcToolInsuranceAge, imgConvertLoad: imgConvertLoad, imgConvertRun: imgConvertRun, imgConvertClear: imgConvertClear, imgConvertDownload: imgConvertDownload, imgConvertCopy: imgConvertCopy, imgConvertPdfDownload: imgConvertPdfDownload, imgConvertPdfCopy: imgConvertPdfCopy, imgConvertPdfNameInput: imgConvertPdfNameInput, imgConvertPdfMergeDownload: imgConvertPdfMergeDownload, imgConvertPdfMergeSaveToInsuwork: imgConvertPdfMergeSaveToInsuwork, audioConvertLoad: audioConvertLoad, audioConvertRun: audioConvertRun, audioConvertRunOne: audioConvertRunOne, audioConvertClear: audioConvertClear, audioConvertDownload: audioConvertDownload, audioConvertDownloadAll: audioConvertDownloadAll, toolSavePickerGo: toolSavePickerGo, toolSavePickerEnter: toolSavePickerEnter, toolSavePickerNewFolder: toolSavePickerNewFolder, toolSavePickerConfirm: toolSavePickerConfirm, filterQuickLinks: filterQuickLinks,
    filterScriptsStage: filterScriptsStage, toggleScriptCard: toggleScriptCard, toggleScriptSection: toggleScriptSection,
    filterNewsPool: filterNewsPool, setNewsScope: setNewsScope, selectNewsCompany: selectNewsCompany, toggleNewsMonth: toggleNewsMonth, openNewsletter: openNewsletter,
    filterStrategyPool: filterStrategyPool, setStrategyScope: setStrategyScope, selectStrategyCompany: selectStrategyCompany, toggleStrategyMonth: toggleStrategyMonth, openStrategy: openStrategy,
    setCalendarMode: function (mode) { state.calendarMode = mode; renderContent(); setUrl(false); },
    moveHomeDate: moveHomeDate, homeToday: homeToday, openHomeCalendar: openHomeCalendar,
    moveCalendar: moveCalendar, calendarToday: function () { state.selectedDate = ymd(new Date()); state.cursor = new Date(); renderContent(); setUrl(false); }, selectDate: selectDate, openCalendarDay: openCalendarDay,
    todaySummary: todaySummary, upcomingConsultPrep: upcomingConsultPrep, eventsFor: eventsFor, eventsInRange: eventsInRange, customersDirectory: customersDirectory, consultationsDirectory: consultationsDirectory, quickSaveConsultationNote: quickSaveConsultationNote,
    libraryDirectory: libraryDirectory, libraryFeedDirectory: libraryFeedDirectory,
    __testLoad: function (data) { if (!isLocal()) return; state.data = data; state.status = 'ready'; state.loadedFor = 'local-test'; state.coreLoaded = true; state.fullLoaded = true; rebuildWorkspaceDerived(); renderShell(); }
  };
})();
