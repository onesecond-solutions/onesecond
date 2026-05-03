/**
 * js/admin_v2.js
 * admin_v2 D-1 — users 섹션 실 데이터 연결 (Phase D 진입)
 *
 * 작업지시서: docs/specs/admin_v2_d1_workorder.md
 * 사전 검증:  docs/architecture/db_d1_users_capture.md
 *
 * ▸ 적용 범위: pages/admin_v2.html users 섹션 (KPI 3 + 9역할 칩 + 테이블)
 * ▸ fetch 표준: window.db.fetch (401 자동 갱신, H-1)
 * ▸ 페이징·검색: 20행 / 300ms 디바운스 / AND / count=exact (H-2)
 * ▸ 에러 처리: 401 자동 / 403 admExit / 500 토스트 / 네트워크 1회 재시도 (H-3)
 * ▸ 다른 페이지 영향 0 (admin_v2 진입 시에만 로드)
 */

(function () {
  'use strict';

  // ── 상수 ────────────────────────────────────────────────────────────────
  var PAGE_SIZE = 20;
  var DEBOUNCE_MS = 300;

  var ROLE_KEYS = [
    'admin', 'ga_branch_manager', 'ga_manager', 'ga_member', 'ga_staff',
    'insurer_branch_manager', 'insurer_manager', 'insurer_member', 'insurer_staff'
  ];

  // role → badge class (admin_v2.html 라인 907~915 정합)
  var ROLE_BADGE_CLASS = {
    admin: 'role-admin',
    ga_branch_manager: 'role-ga-branch-manager',
    ga_manager: 'role-ga-manager',
    ga_member: 'role-ga-member',
    ga_staff: 'role-ga-staff',
    insurer_branch_manager: 'role-insurer-branch-manager',
    insurer_manager: 'role-insurer-manager',
    insurer_member: 'role-insurer-member',
    insurer_staff: 'role-insurer-staff'
  };

  var STATUS_LABEL = { active: '활성', suspended: '정지', pending: '가입 대기' };
  var STATUS_BADGE_CLASS = {
    active: 'status-active',
    suspended: 'status-suspended',
    pending: 'status-pending'
  };

  var PLAN_LABEL = { free: 'FREE', pro: 'PRO', crm: 'CRM', enterprise: 'ENT' };
  var PLAN_BADGE_CLASS = {
    free: 'free', pro: 'pro', crm: 'pro', enterprise: 'pro'
  };

  // 아바타 그라데이션 팔레트 (이름 hash 기반 균일 분배)
  var AVATAR_GRADIENTS = [
    'linear-gradient(135deg,#D4845A,#A0522D)',
    'linear-gradient(135deg,#3B82F6,#1E40AF)',
    'linear-gradient(135deg,#8B5CF6,#5B21B6)',
    'linear-gradient(135deg,#10B981,#047857)',
    'linear-gradient(135deg,#F59E0B,#B45309)',
    'linear-gradient(135deg,#71717A,#3F3F46)',
    'linear-gradient(135deg,#10B981,#065F46)',
    'linear-gradient(135deg,#7C3AED,#4C1D95)'
  ];

  // ── 상태 ────────────────────────────────────────────────────────────────
  var _state = {
    page: 1, search: '', roleFilter: 'all', planFilter: 'all',
    sort: 'created_at.desc', total: 0
  };

  // ── 유틸 ────────────────────────────────────────────────────────────────
  function adm_debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function avatarGradientFor(name) {
    var s = String(name || '?');
    var hash = 0;
    for (var i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) & 0xFFFFFFFF;
    return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
  }

  function relativeTime(iso) {
    if (!iso) return '—';
    var t = new Date(iso).getTime();
    if (isNaN(t)) return '—';
    var diff = Date.now() - t;
    if (diff < 60_000) return '지금';
    if (diff < 3_600_000) return Math.floor(diff / 60_000) + '분 전';
    if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + '시간 전';
    if (diff < 7 * 86_400_000) return Math.floor(diff / 86_400_000) + '일 전';
    return new Date(iso).toISOString().slice(0, 10);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return String(iso).slice(0, 10);
  }

  function parseCount(res) {
    var range = (res.headers.get('Content-Range') || '0-0/0').split('/')[1];
    return parseInt(range, 10) || 0;
  }

  // ── fetch — users 목록 ─────────────────────────────────────────────────
  async function fetchUsers(opts) {
    opts = opts || {};
    Object.assign(_state, opts);

    var params = new URLSearchParams();
    params.set('select', 'id,name,email,role,plan,company,branch,team,status,last_seen_at,created_at');
    params.set('order', _state.sort);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String((_state.page - 1) * PAGE_SIZE));

    if (_state.search && _state.search.trim()) {
      var safe = _state.search.trim().replace(/[*,()]/g, '');
      params.set('or', '(name.ilike.*' + safe + '*,email.ilike.*' + safe + '*,company.ilike.*' + safe + '*)');
    }
    if (_state.roleFilter && _state.roleFilter !== 'all') {
      params.set('role', 'eq.' + _state.roleFilter);
    }
    if (_state.planFilter && _state.planFilter !== 'all') {
      params.set('plan', 'eq.' + _state.planFilter);
    }

    try {
      var res = await window.db.fetch('/rest/v1/users?' + params.toString(), {
        headers: { 'Prefer': 'count=exact' }
      });

      if (res.status === 403) {
        if (typeof window.admExit === 'function') window.admExit();
        throw new Error('관리자 권한 없음');
      }
      if (!res.ok) {
        showAdminToast('서버 오류 (' + res.status + '). 잠시 후 다시 시도해 주세요.', 'danger');
        if (window.Sentry) window.Sentry.captureMessage('[admin_v2 D-1] fetchUsers HTTP ' + res.status);
        throw new Error('HTTP ' + res.status);
      }

      var rows = await res.json();
      _state.total = parseCount(res);
      return { rows: rows, total: _state.total };

    } catch (e) {
      if (e.name === 'TypeError' && /network|fetch|failed/i.test(e.message)) {
        await new Promise(function (r) { setTimeout(r, 3000); });
        return fetchUsers(opts);
      }
      if (e.message !== 'TOKEN_EXPIRED' && e.message !== '관리자 권한 없음') {
        if (window.Sentry) window.Sentry.captureException(e);
      }
      return null;
    }
  }

  // ── fetch — 9역할 칩 카운트 (병렬 9 + 전체 1, 옵션 b 임시) ────────────
  async function fetchRoleCounts() {
    try {
      var fetches = ROLE_KEYS.map(function (role) {
        return window.db.fetch('/rest/v1/users?role=eq.' + role + '&select=id', {
          headers: { 'Prefer': 'count=exact' }
        }).then(function (res) {
          return { role: role, count: parseCount(res) };
        });
      });
      var totalP = window.db.fetch('/rest/v1/users?select=id', {
        headers: { 'Prefer': 'count=exact' }
      }).then(parseCount);

      var results = await Promise.all([totalP].concat(fetches));
      return { total: results[0], byRole: results.slice(1) };
    } catch (e) {
      if (window.Sentry) window.Sentry.captureException(e);
      return null;
    }
  }

  // ── fetch — KPI 3카드 (병렬 3) ─────────────────────────────────────────
  async function fetchKPI() {
    try {
      var since7 = new Date(Date.now() - 7 * 86_400_000).toISOString();
      var [allRes, activeRes, newRes] = await Promise.all([
        window.db.fetch('/rest/v1/users?select=id', { headers: { 'Prefer': 'count=exact' } }),
        window.db.fetch('/rest/v1/users?last_seen_at=gte.' + since7 + '&select=id', { headers: { 'Prefer': 'count=exact' } }),
        window.db.fetch('/rest/v1/users?created_at=gte.' + since7 + '&select=id', { headers: { 'Prefer': 'count=exact' } })
      ]);
      return { all: parseCount(allRes), active7: parseCount(activeRes), new7: parseCount(newRes) };
    } catch (e) {
      if (window.Sentry) window.Sentry.captureException(e);
      return null;
    }
  }

  // ── render — 사용자 테이블 ─────────────────────────────────────────────
  function renderUsersTable(result) {
    var tbody = document.getElementById('adm-users-tbody');
    var meta = document.getElementById('adm-users-meta');
    if (!tbody) return;

    var rows = result.rows || [];
    if (rows.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="8" style="text-align:center;padding:40px 0;color:var(--admin-text-tertiary);">' +
        '조건에 맞는 사용자가 없습니다.</td></tr>';
    } else {
      tbody.innerHTML = rows.map(function (u) {
        var name = escapeHtml(u.name || '(이름 없음)');
        var firstChar = (u.name || '?').slice(0, 1);
        var roleBadgeCls = ROLE_BADGE_CLASS[u.role] || 'role-ga-member';
        var roleLabel = (window.ROLE_LABEL && window.ROLE_LABEL[u.role]) || u.role || '-';
        var planKey = (u.plan || 'free').toLowerCase();
        var planBadgeCls = PLAN_BADGE_CLASS[planKey] || 'free';
        var planLabel = PLAN_LABEL[planKey] || (u.plan || 'FREE').toUpperCase();
        var statusKey = (u.status || 'active').toLowerCase();
        var statusBadgeCls = STATUS_BADGE_CLASS[statusKey] || 'status-active';
        var statusLabel = STATUS_LABEL[statusKey] || statusKey;
        var affiliation = [u.company, u.branch, u.team].filter(Boolean).map(escapeHtml).join(' · ') || '—';

        return (
          '<tr>' +
            '<td><div class="user-cell">' +
              '<div class="avatar" style="background:' + avatarGradientFor(u.name) + '">' + escapeHtml(firstChar) + '</div>' +
              '<div class="user-info"><div class="name">' + name + '</div><div class="email">' + escapeHtml(u.email || '') + '</div></div>' +
            '</div></td>' +
            '<td><span class="adm-badge ' + roleBadgeCls + '">' + escapeHtml(roleLabel) + '</span></td>' +
            '<td><span class="adm-badge ' + planBadgeCls + '">' + escapeHtml(planLabel) + '</span></td>' +
            '<td>' + affiliation + '</td>' +
            '<td><span class="adm-badge ' + statusBadgeCls + '">' + escapeHtml(statusLabel) + '</span></td>' +
            '<td>' + escapeHtml(formatDate(u.created_at)) + '</td>' +
            '<td>' + escapeHtml(relativeTime(u.last_seen_at)) + '</td>' +
            '<td><div class="row-actions"><button title="상세">👁️</button><button title="편집">✏️</button></div></td>' +
          '</tr>'
        );
      }).join('');
    }

    if (meta) {
      var total = result.total || 0;
      var from = total === 0 ? 0 : (_state.page - 1) * PAGE_SIZE + 1;
      var to = Math.min(_state.page * PAGE_SIZE, total);
      meta.textContent = '전체 ' + total.toLocaleString() + '명 · ' + from + '~' + to + '행 표시';
    }
  }

  // ── render — KPI 3카드 ─────────────────────────────────────────────────
  function renderKPI(kpi) {
    var setText = function (id, v) {
      var el = document.getElementById(id);
      if (el) el.textContent = (v || 0).toLocaleString();
    };
    setText('adm-kpi-all', kpi.all);
    setText('adm-kpi-active7', kpi.active7);
    setText('adm-kpi-new7', kpi.new7);
  }

  // ── render — 9역할 칩 카운트 ──────────────────────────────────────────
  function renderRoleChips(counts) {
    var setChip = function (role, n) {
      var el = document.querySelector('.adm-role-chip[data-role="' + role + '"] .count');
      if (el) el.textContent = (n || 0).toLocaleString();
    };
    setChip('all', counts.total);
    counts.byRole.forEach(function (item) { setChip(item.role, item.count); });
  }

  // ── 토스트 (D-2~D-8 공통, .adm-toast 컴포넌트) ────────────────────────
  function showAdminToast(msg, type) {
    var host = document.getElementById('adm-toast-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'adm-toast-host';
      document.body.appendChild(host);
    }
    var t = document.createElement('div');
    t.className = 'adm-toast ' + (type || 'info');
    t.textContent = msg;
    host.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, 5000);
  }

  // ── 진입점 — admSwitchView('users') 시 호출 ───────────────────────────
  window.admLoadUsers = async function () {
    var [usersResult, kpi, counts] = await Promise.all([
      fetchUsers(), fetchKPI(), fetchRoleCounts()
    ]);
    if (usersResult) renderUsersTable(usersResult);
    if (kpi) renderKPI(kpi);
    if (counts) renderRoleChips(counts);
  };

  // ── 핸들러 — 검색 (300ms 디바운스) ─────────────────────────────────────
  window.admUsersSearch = adm_debounce(function (val) {
    fetchUsers({ search: val, page: 1 }).then(function (r) { if (r) renderUsersTable(r); });
  }, DEBOUNCE_MS);

  // ── 핸들러 — 역할 칩 필터 ──────────────────────────────────────────────
  window.admUsersFilterRole = function (role) {
    document.querySelectorAll('.adm-role-chip').forEach(function (chip) {
      chip.classList.toggle('active', chip.dataset.role === role);
    });
    fetchUsers({ roleFilter: role, page: 1 }).then(function (r) { if (r) renderUsersTable(r); });
  };

  // ── 핸들러 — 정렬 ──────────────────────────────────────────────────────
  window.admUsersChangeSort = function (sort) {
    fetchUsers({ sort: sort, page: 1 }).then(function (r) { if (r) renderUsersTable(r); });
  };

  // ── 핸들러 — 플랜 필터 ────────────────────────────────────────────────
  window.admUsersFilterPlan = function (plan) {
    fetchUsers({ planFilter: plan, page: 1 }).then(function (r) { if (r) renderUsersTable(r); });
  };

  // ── 핸들러 — 페이지 이동 ──────────────────────────────────────────────
  window.admUsersGoToPage = function (page) {
    fetchUsers({ page: page }).then(function (r) { if (r) renderUsersTable(r); });
  };

  // ── race 안전장치 — admin_v2.js 로드 시점에 users view가 이미 active면 즉시 로드
  //   (예: #admin/users 직접 hash 진입 시 inline script가 src script보다 먼저 admSwitchView 호출)
  if (document.querySelector('.adm-view[data-view="users"].active')) {
    window.admLoadUsers();
  }

})();
