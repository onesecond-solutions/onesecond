/**
 * js/notifications.js
 * 알림 시스템 Phase A v1.1 — 인앱 알림 인프라
 *
 * ▸ 의존: js/db.js (window.db) + js/auth.js (window.AppState)
 * ▸ 로드 시점: app.html에서 auth.js 다음에 박음
 * ▸ 진입: appstate:ready 이벤트 청취 → init() 박음
 *
 * 제공 API (window.Notifications):
 *   .init()              — 1회 초기화 (load + setup poll + 드롭다운 마운트)
 *   .load()              — 최근 50건 + 미열람 카운트 fetch
 *   .setBadge(n)         — PC + 모바일 헤더 뱃지 동기 갱신
 *   .markAsRead(id)      — 단건 is_read=true UPSERT
 *   .markAllAsRead()     — 미열람 전체 bulk UPDATE
 *   .toggleDropdown()    — onNotifyClick에서 호출 (열고/닫고)
 *   .closeDropdown()     — 외부 클릭/ESC 시 닫음
 *   .renderDropdown()    — 드롭다운 내용 다시 그림
 *   .renderCArea()       — C영역 c-home / c-board 카드 갱신
 *
 * v1.1 본진: 폴링 60초 (Supabase Realtime 박지 X — Phase A 위험 최소)
 * v1.2+ Phase B에서 Realtime 박을 자리 검토.
 */

(function () {
  'use strict';

  // ── 1. 상태 캐시 ────────────────────────────────────────────────────────
  var state = {
    items: [],            // 최근 50건
    unreadCount: 0,
    pollTimer: null,
    pollIntervalMs: 60000,
    isDropdownOpen: false,
    isLoading: false
  };

  // ── 2. 유틸 ──────────────────────────────────────────────────────────────
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function timeAgo(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60)     return '방금';
    if (diff < 3600)   return Math.floor(diff / 60) + '분 전';
    if (diff < 86400)  return Math.floor(diff / 3600) + '시간 전';
    if (diff < 604800) return Math.floor(diff / 86400) + '일 전';
    return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
  }

  function getUserId() {
    return (window.AppState && window.AppState.userId) || null;
  }

  // ── 3. fetch 본진 ────────────────────────────────────────────────────────
  async function fetchNotifications() {
    var uid = getUserId();
    if (!uid) return { items: [], unread: 0 };

    try {
      var res = await window.db.fetch(
        '/rest/v1/notifications' +
        '?recipient_id=eq.' + uid +
        '&order=created_at.desc' +
        '&limit=50' +
        '&select=id,type,title,body,link_url,source_type,source_id,is_urgent,is_read,created_at,sender_id'
      );
      if (!res.ok) {
        console.warn('[notifications] fetch 격차 status=' + res.status);
        return { items: [], unread: 0 };
      }
      var rows = await res.json();
      var unread = 0;
      for (var i = 0; i < rows.length; i++) if (!rows[i].is_read) unread++;
      return { items: rows, unread: unread };
    } catch (e) {
      console.warn('[notifications] fetch 예외', e);
      return { items: [], unread: 0 };
    }
  }

  async function patchRead(id) {
    var uid = getUserId();
    if (!uid || !id) return false;
    try {
      var res = await window.db.fetch(
        '/rest/v1/notifications?id=eq.' + encodeURIComponent(id) + '&recipient_id=eq.' + uid,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ is_read: true, read_at: new Date().toISOString() })
        }
      );
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async function patchAllRead() {
    var uid = getUserId();
    if (!uid) return false;
    try {
      var res = await window.db.fetch(
        '/rest/v1/notifications?recipient_id=eq.' + uid + '&is_read=eq.false',
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ is_read: true, read_at: new Date().toISOString() })
        }
      );
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  // ── 4. 뱃지 갱신 (PC + 모바일 양쪽) ──────────────────────────────────────
  function setBadge(n) {
    var count = Math.max(0, parseInt(n, 10) || 0);
    state.unreadCount = count;

    var label = count > 99 ? '99+' : String(count);

    ['a1-notify-badge', 'mobile-header-notify-badge'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.textContent = label;
      el.setAttribute('data-count', label);
      if (count === 0) {
        el.classList.add('is-empty');
      } else {
        el.classList.remove('is-empty');
      }
    });

    // App Badge API (Phase D 본진이지만 매우 단순해서 박음 — 지원 브라우저만)
    try {
      if ('setAppBadge' in navigator) {
        if (count > 0) navigator.setAppBadge(count);
        else navigator.clearAppBadge && navigator.clearAppBadge();
      }
    } catch (e) { /* 미지원 브라우저 = 무시 */ }
  }

  // ── 5. 드롭다운 마운트 ──────────────────────────────────────────────────
  function ensureDropdownRoot() {
    var existing = document.getElementById('notify-dropdown-root');
    if (existing) return existing;

    var root = document.createElement('div');
    root.id = 'notify-dropdown-root';
    root.className = 'notify-dropdown is-closed';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = renderDropdownHTML([], true);
    document.body.appendChild(root);

    injectDropdownCSS();
    bindDropdownEvents(root);
    return root;
  }

  function injectDropdownCSS() {
    if (document.getElementById('notify-dropdown-style')) return;
    var st = document.createElement('style');
    st.id = 'notify-dropdown-style';
    st.textContent = [
      '.notify-dropdown {',
      '  position: fixed; z-index: 9999;',
      '  top: 56px; right: 16px;',
      '  width: 360px; max-width: calc(100vw - 32px);',
      '  max-height: 70vh; overflow-y: auto;',
      '  background: var(--color-bg, #FFFFFF);',
      '  border: 1px solid var(--color-border, #E5E0D8);',
      '  border-radius: var(--radius-md, 10px);',
      '  box-shadow: 0 10px 32px rgba(60, 40, 20, 0.18);',
      '  transition: opacity 0.18s ease, transform 0.18s ease;',
      '  opacity: 1; transform: translateY(0);',
      '}',
      '.notify-dropdown.is-closed { opacity: 0; transform: translateY(-6px); pointer-events: none; }',
      '@media (max-width: 768px) {',
      '  .notify-dropdown {',
      '    top: 0; right: 0; left: 0; bottom: 0;',
      '    width: 100%; max-width: 100%; max-height: 100%;',
      '    border-radius: 0; border: none;',
      '  }',
      '  .notify-dropdown.is-closed { transform: translateY(-100%); }',
      '}',
      '.notify-dropdown-head {',
      '  display: flex; align-items: center; justify-content: space-between;',
      '  padding: 14px 16px;',
      '  border-bottom: 1px solid var(--color-border, #E5E0D8);',
      '  background: var(--color-surface-2, #FBF8F3);',
      '  position: sticky; top: 0; z-index: 1;',
      '}',
      '.notify-dropdown-title { font-weight: 700; font-size: 0.95em; color: var(--color-text-primary, #2D2418); }',
      '.notify-dropdown-actions { display: flex; gap: 8px; }',
      '.notify-dropdown-actions button {',
      '  background: transparent; border: 1px solid var(--color-border, #E5E0D8);',
      '  border-radius: var(--radius-sm, 6px); padding: 5px 10px;',
      '  font-size: 0.75em; color: var(--color-text-secondary, #6B5D45);',
      '  cursor: pointer; transition: background 0.15s;',
      '}',
      '.notify-dropdown-actions button:hover { background: var(--brand-50, #FDF4EF); }',
      '.notify-dropdown-list { padding: 4px 0; }',
      '.notify-dropdown-item {',
      '  display: block; padding: 12px 16px; cursor: pointer;',
      '  border-left: 3px solid transparent;',
      '  border-bottom: 1px solid rgba(0,0,0,0.04);',
      '  transition: background 0.12s;',
      '}',
      '.notify-dropdown-item:hover { background: var(--brand-50, #FDF4EF); }',
      '.notify-dropdown-item.is-unread { border-left-color: var(--color-brand, #A0522D); background: rgba(160, 82, 45, 0.04); }',
      '.notify-dropdown-item.type-ops    { border-left-color: var(--color-warning, #F59E0B); }',
      '.notify-dropdown-item.type-system { border-left-color: #8B5CF6; }',
      '.notify-dropdown-item.type-staff  { border-left-color: #3B82F6; }',
      '.notify-dropdown-item.type-manager{ border-left-color: #F97316; }',
      '.notify-dropdown-item.type-insurer{ border-left-color: #10B981; }',
      '.notify-dropdown-item.type-team_lab{ border-left-color: #EAB308; }',
      '.notify-item-title { font-size: 0.875em; font-weight: 600; color: var(--color-text-primary, #2D2418); margin-bottom: 2px; }',
      '.notify-item-body  { font-size: 0.75em; color: var(--color-text-secondary, #6B5D45); line-height: 1.45; }',
      '.notify-item-meta  { font-size: 0.7em; color: var(--color-text-tertiary, #9B8B6E); margin-top: 4px; }',
      '.notify-dropdown-empty { padding: 40px 16px; text-align: center; color: var(--color-text-tertiary, #9B8B6E); font-size: 0.85em; }',
      '.notify-dropdown-foot { padding: 10px 16px; border-top: 1px solid var(--color-border, #E5E0D8); text-align: center; }',
      '.notify-dropdown-foot a { font-size: 0.8em; color: var(--color-brand, #A0522D); text-decoration: none; font-weight: 600; }'
    ].join('\n');
    document.head.appendChild(st);
  }

  function bindDropdownEvents(root) {
    // 외부 클릭 시 닫음
    document.addEventListener('click', function (ev) {
      if (!state.isDropdownOpen) return;
      var t = ev.target;
      if (root.contains(t)) return;
      if (t.closest && (t.closest('.a1-notify') || t.closest('.mobile-header-notify'))) return;
      closeDropdown();
    });

    // ESC 닫음
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && state.isDropdownOpen) closeDropdown();
    });
  }

  // ── 6. HTML 렌더 ────────────────────────────────────────────────────────
  function renderDropdownHTML(items, loading) {
    var listHtml;
    if (loading) {
      listHtml = '<div class="notify-dropdown-empty">불러오는 중…</div>';
    } else if (!items || items.length === 0) {
      listHtml = '<div class="notify-dropdown-empty">받은 알림 없음<br><span style="font-size:0.85em;opacity:0.7;">새 답변이 등록되면 여기에 표시됩니다.</span></div>';
    } else {
      // 최근 5건만 박음
      var top = items.slice(0, 5);
      listHtml = '<div class="notify-dropdown-list">' + top.map(function (n) {
        var unread = !n.is_read ? ' is-unread' : '';
        var typeCls = ' type-' + (n.type || '');
        return (
          '<div class="notify-dropdown-item' + unread + typeCls + '" ' +
          'data-id="' + escapeHtml(n.id) + '" ' +
          'data-url="' + escapeHtml(n.link_url || '') + '">' +
          '<div class="notify-item-title">' + escapeHtml(n.title) + '</div>' +
          (n.body ? '<div class="notify-item-body">' + escapeHtml(n.body) + '</div>' : '') +
          '<div class="notify-item-meta">' + timeAgo(n.created_at) + '</div>' +
          '</div>'
        );
      }).join('') + '</div>';
    }

    return (
      '<div class="notify-dropdown-head">' +
        '<div class="notify-dropdown-title">알림 ' + (state.unreadCount > 0 ? '(' + state.unreadCount + ')' : '') + '</div>' +
        '<div class="notify-dropdown-actions">' +
          '<button type="button" data-act="mark-all">모두 확인</button>' +
          '<button type="button" data-act="close" aria-label="닫기">✕</button>' +
        '</div>' +
      '</div>' +
      listHtml
    );
  }

  function renderDropdown() {
    var root = ensureDropdownRoot();
    root.innerHTML = renderDropdownHTML(state.items, state.isLoading);

    // 항목 클릭 바인딩
    var items = root.querySelectorAll('.notify-dropdown-item');
    for (var i = 0; i < items.length; i++) {
      items[i].addEventListener('click', function (ev) {
        ev.stopPropagation();
        var id = this.getAttribute('data-id');
        var url = this.getAttribute('data-url');
        markAsRead(id);
        if (url) {
          closeDropdown();
          // 이미 같은 페이지면 hash만 갱신
          window.location.href = url;
        } else {
          closeDropdown();
        }
      });
    }

    // 액션 바인딩
    var actBtns = root.querySelectorAll('[data-act]');
    for (var j = 0; j < actBtns.length; j++) {
      actBtns[j].addEventListener('click', function (ev) {
        ev.stopPropagation();
        var act = this.getAttribute('data-act');
        if (act === 'mark-all') {
          markAllAsRead();
        } else if (act === 'close') {
          closeDropdown();
        }
      });
    }
  }

  // ── 7. C영역 갱신 ───────────────────────────────────────────────────────
  function renderCArea() {
    // c-home / c-board에 mine type 최신 1건만 박음 (placeholder 자리 치환)
    var mineLatest = null;
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].type === 'mine' && !state.items[i].is_read) {
        mineLatest = state.items[i];
        break;
      }
    }

    ['c-home', 'c-board'].forEach(function (sectionId) {
      var section = document.getElementById(sectionId);
      if (!section) return;
      // 첫 .notify-card.notify-mine 박힌 자리만 갱신 (운영 신호·팀 흐름 카드는 유지)
      var card = section.querySelector('.notify-card.notify-mine');
      if (!card) return;

      var titleEl = card.querySelector('.notify-title');
      var descEl  = card.querySelector('.notify-desc');
      if (!titleEl || !descEl) return;

      if (mineLatest) {
        titleEl.textContent = mineLatest.title || '새 알림';
        descEl.textContent  = mineLatest.body || '';
        card.style.cursor = 'pointer';
        // data-link 자리 박음 + 1회 click 핸들러 (중복 박지 X)
        card.setAttribute('data-notify-id', mineLatest.id);
        card.setAttribute('data-notify-url', mineLatest.link_url || '');
        if (!card._notifyBound) {
          card._notifyBound = true;
          card.addEventListener('click', function () {
            var nid = this.getAttribute('data-notify-id');
            var nurl = this.getAttribute('data-notify-url');
            if (nid) markAsRead(nid);
            if (nurl) window.location.href = nurl;
          });
        }
      } else {
        titleEl.textContent = '받은 알림 없음';
        descEl.textContent  = '새 답변이 등록되면 여기에 표시됩니다.';
        card.removeAttribute('data-notify-id');
        card.removeAttribute('data-notify-url');
        card.style.cursor = 'default';
      }
    });
  }

  // ── 8. 본진 API ─────────────────────────────────────────────────────────
  async function load() {
    if (!getUserId()) return;
    state.isLoading = true;
    var data = await fetchNotifications();
    state.items = data.items;
    setBadge(data.unread);
    state.isLoading = false;
    renderCArea();
    if (state.isDropdownOpen) renderDropdown();
  }

  async function markAsRead(id) {
    if (!id) return;
    var ok = await patchRead(id);
    if (!ok) return;
    // local cache 동기
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].id === id && !state.items[i].is_read) {
        state.items[i].is_read = true;
        state.items[i].read_at = new Date().toISOString();
        setBadge(Math.max(0, state.unreadCount - 1));
        break;
      }
    }
    renderCArea();
    if (state.isDropdownOpen) renderDropdown();
  }

  async function markAllAsRead() {
    var ok = await patchAllRead();
    if (!ok) return;
    for (var i = 0; i < state.items.length; i++) state.items[i].is_read = true;
    setBadge(0);
    renderCArea();
    if (state.isDropdownOpen) renderDropdown();
  }

  function openDropdown() {
    var root = ensureDropdownRoot();
    state.isDropdownOpen = true;
    renderDropdown();
    root.classList.remove('is-closed');
    root.setAttribute('aria-hidden', 'false');
  }

  function closeDropdown() {
    var root = document.getElementById('notify-dropdown-root');
    if (!root) return;
    state.isDropdownOpen = false;
    root.classList.add('is-closed');
    root.setAttribute('aria-hidden', 'true');
  }

  function toggleDropdown() {
    if (state.isDropdownOpen) closeDropdown();
    else { load(); openDropdown(); }
  }

  function startPolling() {
    stopPolling();
    state.pollTimer = setInterval(function () {
      // 탭이 보이지 않는 자리 = 폴링 박지 X (배터리·네트워크 절약)
      if (document.hidden) return;
      load();
    }, state.pollIntervalMs);

    // 탭 visible 박을 때 즉시 1회 갱신
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) load();
    });
  }

  function stopPolling() {
    if (state.pollTimer) {
      clearInterval(state.pollTimer);
      state.pollTimer = null;
    }
  }

  // ── 9. 초기화 ───────────────────────────────────────────────────────────
  var initialized = false;
  async function init() {
    if (initialized) return;
    if (!getUserId()) return;
    initialized = true;

    ensureDropdownRoot();
    await load();
    startPolling();
  }

  // ── 10. 진입 자리: appstate:ready 청취 ──────────────────────────────────
  document.addEventListener('appstate:ready', function () {
    init();
  });

  // 이미 ready 박혀 있는 자리 (예: 늦은 로드)
  if (window.AppState && window.AppState.ready) {
    setTimeout(init, 0);
  }

  // ── 11. 공개 API ────────────────────────────────────────────────────────
  window.Notifications = {
    init: init,
    load: load,
    setBadge: setBadge,
    markAsRead: markAsRead,
    markAllAsRead: markAllAsRead,
    toggleDropdown: toggleDropdown,
    openDropdown: openDropdown,
    closeDropdown: closeDropdown,
    renderDropdown: renderDropdown,
    renderCArea: renderCArea,
    _state: state  // 디버그용
  };

})();
