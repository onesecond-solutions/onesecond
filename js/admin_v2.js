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

  // ════════════════════════════════════════════════════════════════════════
  // D-2 content — scripts + library + stage 분포 (2026-05-04 신설)
  // 작업지시서: docs/specs/admin_v2_d2_workorder.md (commit 5f1261a)
  // 사전 검증: D-2 Step 1 (1)~(8) 8/8 클리어 — STAGE_LABELS_KO (i) + library scope filter
  // ════════════════════════════════════════════════════════════════════════

  // ── stage DB 영문 슬러그 → 한국어 번역 (F-1 청산, 결정 (i)) ────────────
  var STAGE_LABELS_KO = {
    opening:           '오프닝',
    opening_rejection: '도입 반론',
    situation_check:   '상황 확인',
    need_emphasis:     '니즈 강조',
    need_emphasis_2:   '니즈 강조 ②',
    analysis:          '보장 분석',
    product:           '상품 설명',
    objection:         '반론 대응',
    closing:           '클로징',
    closing_second:    '2차 클로징'
  };

  var STAGE_KEY_ORDER = [
    'opening', 'opening_rejection', 'situation_check',
    'need_emphasis', 'need_emphasis_2', 'analysis', 'product',
    'objection', 'closing', 'closing_second'
  ];

  var STAGE_COLORS = [
    '#D4845A', '#E89A6F', '#FBB08A', '#3B82F6', '#60A5FA',
    '#93C5FD', '#10B981', '#34D399', '#F59E0B', '#FCD34D'
  ];

  // ── 콘텐츠 KPI 3카드 (전체 스크립트 / 전체 자료 / 오늘 작성) ──────────
  async function fetchContentKPI() {
    // 오늘 자정 (Asia/Seoul) — UTC 기준 KST offset 적용
    var todayKstStart = new Date();
    todayKstStart.setUTCHours(15, 0, 0, 0); // KST 자정 = UTC 15:00 전날
    if (todayKstStart > new Date()) {
      todayKstStart.setUTCDate(todayKstStart.getUTCDate() - 1);
    }
    var sinceToday = todayKstStart.toISOString();

    try {
      var [scriptsAll, libraryAll, scriptsToday, libraryToday] = await Promise.all([
        window.db.fetch('/rest/v1/scripts?select=id', { headers: { 'Prefer': 'count=exact' } }),
        window.db.fetch('/rest/v1/library?select=id', { headers: { 'Prefer': 'count=exact' } }),
        window.db.fetch('/rest/v1/scripts?created_at=gte.' + sinceToday + '&select=id',
          { headers: { 'Prefer': 'count=exact' } }),
        window.db.fetch('/rest/v1/library?created_at=gte.' + sinceToday + '&select=id',
          { headers: { 'Prefer': 'count=exact' } })
      ]);

      function parseCount(r) {
        return parseInt((r.headers.get('Content-Range') || '0-0/0').split('/')[1], 10) || 0;
      }
      return {
        scriptsTotal: parseCount(scriptsAll),
        libraryTotal: parseCount(libraryAll),
        todayCount:   parseCount(scriptsToday) + parseCount(libraryToday)
      };
    } catch (e) {
      if (e.message !== 'TOKEN_EXPIRED' && window.Sentry) window.Sentry.captureException(e);
      return null;
    }
  }

  // ── stage 10단계 분포 (RPC — 별 트랙 #3 청산) ────────────────────────
  // 기존 1 fetch + 클라이언트 GROUP BY (243~1022ms) → RPC 서버 GROUP BY (~50ms 기대)
  // RPC: public.get_stage_distribution() — SECURITY DEFINER + is_admin() 가드 + authenticated EXECUTE only
  async function fetchStageDistribution() {
    try {
      var res = await window.db.fetch(
        '/rest/v1/rpc/get_stage_distribution',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        }
      );
      if (res.status === 403 && typeof window.admExit === 'function') window.admExit();
      if (!res.ok) {
        showAdminToast('stage 분포 로드 실패 (' + res.status + ')', 'danger');
        return null;
      }
      var data = await res.json();
      // RPC 반환 jsonb { total, counts } — renderStageDonut 호환 형식 유지
      return { total: data.total || 0, counts: data.counts || {} };
    } catch (e) {
      if (e.message !== 'TOKEN_EXPIRED' && window.Sentry) window.Sentry.captureException(e);
      return null;
    }
  }

  // ── 최근 콘텐츠 8행 (scripts + library 병렬 fetch + merge — I-1 결정) ─
  async function fetchRecentContent(limit) {
    limit = limit || 8;
    try {
      var [scriptsRes, libraryRes] = await Promise.all([
        window.db.fetch(
          '/rest/v1/scripts?select=id,title,stage,owner_email,use_count,created_at' +
          '&order=created_at.desc&limit=' + limit
        ),
        // scope=neq.private — admin 본 계정 테스트 데이터(별 트랙 #10) + 일반 사용자 private 차단
        window.db.fetch(
          '/rest/v1/library?scope=neq.private&select=id,title,owner_email,created_at' +
          '&order=created_at.desc&limit=' + limit
        )
      ]);

      if (!scriptsRes.ok || !libraryRes.ok) {
        var bad = !scriptsRes.ok ? scriptsRes : libraryRes;
        if (bad.status === 403 && typeof window.admExit === 'function') window.admExit();
        showAdminToast('콘텐츠 로드 실패 (' + bad.status + ')', 'danger');
        return null;
      }

      var scriptsRows = (await scriptsRes.json()).map(function (r) {
        return {
          type: 'script', id: r.id, title: r.title, stage: r.stage,
          owner_email: r.owner_email, use_count: r.use_count, save_count: null,
          created_at: r.created_at
        };
      });
      var libraryRows = (await libraryRes.json()).map(function (r) {
        return {
          type: 'library', id: r.id, title: r.title, stage: null,
          owner_email: r.owner_email, use_count: null, save_count: null,
          created_at: r.created_at
        };
      });

      return scriptsRows.concat(libraryRows).sort(function (a, b) {
        return new Date(b.created_at) - new Date(a.created_at);
      }).slice(0, limit);

    } catch (e) {
      if (e.message !== 'TOKEN_EXPIRED' && window.Sentry) window.Sentry.captureException(e);
      return null;
    }
  }

  // ── render: KPI 3카드 ─────────────────────────────────────────────────
  function renderContentKPI(kpi) {
    if (!kpi) return;
    var elScripts = document.getElementById('adm-content-kpi-scripts');
    var elLibrary = document.getElementById('adm-content-kpi-library');
    var elToday   = document.getElementById('adm-content-kpi-today');
    if (elScripts) elScripts.textContent = kpi.scriptsTotal.toLocaleString('ko-KR');
    if (elLibrary) elLibrary.textContent = kpi.libraryTotal.toLocaleString('ko-KR');
    if (elToday)   elToday.textContent   = kpi.todayCount.toLocaleString('ko-KR');
  }

  // ── render: stage 도넛 SVG + 단계별 비율 panel ────────────────────────
  function renderStageDonut(dist) {
    if (!dist) return;
    var donutHost  = document.getElementById('adm-content-stage-donut');
    var legendHost = document.getElementById('adm-content-stage-legend');
    var totalEl    = document.getElementById('adm-content-stage-total');
    var topEl      = document.getElementById('adm-content-stage-top');

    if (!donutHost || !legendHost) return;

    var total = dist.total || 1;
    if (totalEl) totalEl.textContent = total.toLocaleString('ko-KR');

    // panel-meta 부제목 갱신 (D-2 회귀 D2 FAIL fix — 5/4)
    var metaEl = document.getElementById('adm-content-stage-meta');
    if (metaEl) metaEl.textContent = '전체 ' + total.toLocaleString('ko-KR') + ' 스크립트 기준';

    // STAGE_KEY_ORDER 순서대로 DB 영문 키 → 한국어 라벨 매핑 (F-1 청산)
    var ordered = STAGE_KEY_ORDER.map(function (key, i) {
      var cnt = dist.counts[key] || 0;
      var label = STAGE_LABELS_KO[key] || key;
      return {
        key: key, label: label, count: cnt, color: STAGE_COLORS[i],
        pct: total ? (cnt / total) * 100 : 0
      };
    });

    // 도넛 SVG 재계산 (mock의 stroke-dasharray 패턴)
    var circumference = 2 * Math.PI * 80;
    var offset = 0;
    var circles = ordered.map(function (s) {
      var dash = (s.pct / 100) * circumference;
      var c = '<circle r="80" fill="none" stroke="' + s.color +
              '" stroke-width="32" stroke-dasharray="' + dash.toFixed(2) +
              ' ' + (circumference - dash).toFixed(2) +
              '" stroke-dashoffset="' + (-offset).toFixed(2) + '"/>';
      offset += dash;
      return c;
    }).join('');
    donutHost.innerHTML = circles;

    // 최다 stage 표시
    var max = ordered.reduce(function (a, b) { return b.count > a.count ? b : a; }, ordered[0]);
    if (topEl && max && max.count > 0) {
      topEl.textContent = '최다: ' + max.label + ' ' + max.pct.toFixed(0) + '%';
    } else if (topEl) {
      topEl.textContent = '데이터 없음';
    }

    // 단계별 비율 범례
    legendHost.innerHTML = ordered.map(function (s) {
      var pct = s.pct.toFixed(0);
      return '<div style="display:flex;align-items:center;gap:10px;">' +
        '<span style="width:10px;height:10px;background:' + s.color + ';border-radius:2px;flex-shrink:0;"></span>' +
        '<span style="flex:1;color:var(--admin-text-primary);">' + escapeHtml(s.label) + '</span>' +
        '<span style="color:var(--admin-text-secondary);font-weight:700;font-feature-settings:\'tnum\';">' +
        pct + '% · ' + s.count.toLocaleString('ko-KR') + '</span></div>';
    }).join('');
  }

  // ── render: 최근 콘텐츠 테이블 8행 ────────────────────────────────────
  function renderRecentContentTable(rows) {
    var tbody = document.getElementById('adm-content-recent-tbody');
    if (!tbody) return;
    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;' +
                        'color:var(--admin-text-tertiary);">콘텐츠가 없습니다.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(function (r) {
      var typeBadge = r.type === 'script'
        ? '<span class="adm-badge" style="background:var(--admin-info-bg);color:var(--color-info);">스크립트</span>'
        : '<span class="adm-badge" style="background:var(--admin-success-bg);color:var(--color-success);">자료</span>';
      var stageCell = r.stage
        ? '<span style="font-size:11px;color:var(--admin-text-secondary);">' +
          escapeHtml(STAGE_LABELS_KO[r.stage] || r.stage) + '</span>'
        : '<span style="font-size:11px;color:var(--admin-text-tertiary);">—</span>';
      var useCell  = r.use_count != null ? r.use_count.toLocaleString('ko-KR')
                                         : '<span style="color:var(--admin-text-tertiary);">—</span>';
      var saveCell = '<span style="color:var(--admin-text-tertiary);">—</span>'; // I-4
      return '<tr>' +
        '<td>' + typeBadge + '</td>' +
        '<td><strong>' + escapeHtml(r.title || '(제목 없음)') + '</strong></td>' +
        '<td>' + stageCell + '</td>' +
        '<td>' + escapeHtml(r.owner_email || '—') + '</td>' +
        '<td style="font-feature-settings:\'tnum\';">' + useCell + '</td>' +
        '<td style="font-feature-settings:\'tnum\';">' + saveCell + '</td>' +
        '<td>' + formatRelativeTime(r.created_at) + '</td>' +
        '<td><div class="row-actions">' +
          '<button title="상세" onclick="window.admContentView(\'' + r.type + '\',' + r.id + ')">👁️</button>' +
          '<button title="편집" onclick="window.admContentEdit(\'' + r.type + '\',' + r.id + ')">✏️</button>' +
        '</div></td></tr>';
    }).join('');
  }

  // ── 상대 시간 포맷 ────────────────────────────────────────────────────
  function formatRelativeTime(iso) {
    if (!iso) return '—';
    var diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60)        return '방금 전';
    if (diff < 3600)      return Math.floor(diff / 60) + '분 전';
    if (diff < 86400)     return Math.floor(diff / 3600) + '시간 전';
    if (diff < 86400 * 2) return '어제';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + '일 전';
    var d = new Date(iso);
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
  }

  // ── 진입점 (admin_v2 content 뷰 활성화 시 호출) ───────────────────────
  window.admLoadContent = async function () {
    var [kpi, dist, rows] = await Promise.all([
      fetchContentKPI(), fetchStageDistribution(), fetchRecentContent(8)
    ]);
    // race 안전장치 — 다른 view로 이동 후 응답 도착 시 무시
    if (!document.querySelector('.adm-view[data-view="content"].active')) return;
    if (kpi)  renderContentKPI(kpi);
    if (dist) renderStageDonut(dist);
    if (rows) renderRecentContentTable(rows);
  };

  // ── 행 액션 핸들러 (I-7: D-2 범위 외, mock UI 보존 — 토스트만) ──────
  window.admContentView = function (type, id) {
    showAdminToast('상세 보기 — Phase D 후 구현 (' + type + ' #' + id + ')', 'info');
  };
  window.admContentEdit = function (type, id) {
    showAdminToast('편집 — Phase D 후 구현 (' + type + ' #' + id + ')', 'info');
  };

  // ════════════════════════════════════════════════════════════════════════
  // D-3 board — posts + comments + 신고 mock + 모더레이션 액션 3종 (2026-05-04 신설)
  // 작업지시서: docs/specs/admin_v2_d3_workorder.md (commit a3aa439)
  // 결재: J-1(a) 모더레이션 3종 / J-2(b) post_reports v2.0 대기 / J-3(a) 정지 직접
  //       J-4(a) 보험사 회색 점선 / J-5(a) 클라 GROUP BY / J-6(a) comments 전체 / J-7(a) 알림 범위 외
  // 사전 검증: D-3 Step 1 9/9 PASS (5/4 raw)
  // ════════════════════════════════════════════════════════════════════════

  // ── J-2 (b) v2.0 대기 — 신고 5행 mock 보존 ──────────────────────────────
  var BOARD_REPORTS_MOCK = [
    { board: '함께해요', boardClass: 'role-ga-member',         title: '"○○생명 파트너 모집 제안" — 외부 영업 글', author: '이도윤', authorId: null, postId: null, reasonLabel: '광고·홍보',  reasonClass: 'status-suspended', count: 12, ago: '12분 전' },
    { board: '함께해요', boardClass: 'role-ga-member',         title: '"실적 1위 비결 — DM 환영" 글에 부정확 정보',   author: '최민지', authorId: null, postId: null, reasonLabel: '허위·부정확', reasonClass: 'status-pending',   count: 7,  ago: '1시간 전' },
    { board: '공지',     boardClass: 'role-ga-branch-manager', title: '"고객 정보 공유 요청" — 개인정보 노출 우려',    author: '김지훈', authorId: null, postId: null, reasonLabel: '개인정보',    reasonClass: 'status-suspended', count: 5,  ago: '3시간 전' },
    { board: '함께해요', boardClass: 'role-ga-member',         title: '"동료 비방성 발언" — 댓글 다툼 발생',            author: '정수아', authorId: null, postId: null, reasonLabel: '비방·다툼',   reasonClass: 'status-suspended', count: 4,  ago: '5시간 전' },
    { board: '함께해요', boardClass: 'role-ga-member',         title: '"중복 게시" — 동일 내용 3회 게시',              author: '박서연', authorId: null, postId: null, reasonLabel: '스팸·중복',   reasonClass: 'status-pending',   count: 2,  ago: '어제' }
  ];

  // ── KPI 3카드 (J-6 (a) comments 전체 count + reportsPending mock 5) ───
  async function fetchBoardKPI() {
    try {
      var [postsRes, commentsRes] = await Promise.all([
        window.db.fetch('/rest/v1/posts?select=id',    { headers: { 'Prefer': 'count=exact' } }),
        window.db.fetch('/rest/v1/comments?select=id', { headers: { 'Prefer': 'count=exact' } })
      ]);
      if (postsRes.status === 403 && typeof window.admExit === 'function') window.admExit();
      if (!postsRes.ok || !commentsRes.ok) {
        var bad = !postsRes.ok ? postsRes : commentsRes;
        showAdminToast('게시판 KPI 로드 실패 (' + bad.status + ')', 'danger');
        return null;
      }
      function parseCount(r) {
        return parseInt((r.headers.get('Content-Range') || '0-0/0').split('/')[1], 10) || 0;
      }
      return {
        posts:          parseCount(postsRes),
        comments:       parseCount(commentsRes),
        reportsPending: BOARD_REPORTS_MOCK.length
      };
    } catch (e) {
      if (e.message !== 'TOKEN_EXPIRED' && window.Sentry) window.Sentry.captureException(e);
      return null;
    }
  }

  // ── 90일 활동 분포 (J-5 (a) 클라이언트 GROUP BY, KST 자정 기준) ────────
  async function fetchBoardActivity90d() {
    try {
      var since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      var res = await window.db.fetch(
        '/rest/v1/posts?select=created_at,board_type&created_at=gte.' + since90d +
        '&order=created_at.asc&limit=10000'
      );
      if (res.status === 403 && typeof window.admExit === 'function') window.admExit();
      if (!res.ok) {
        showAdminToast('게시판 활동 로드 실패 (' + res.status + ')', 'danger');
        return null;
      }
      var rows = await res.json();
      var grouped = {};
      rows.forEach(function (r) {
        var kstDay = new Date(new Date(r.created_at).getTime() + 9 * 3600 * 1000)
          .toISOString().split('T')[0];
        var key = kstDay + '|' + (r.board_type || '(미지정)');
        grouped[key] = (grouped[key] || 0) + 1;
      });
      var result = [];
      Object.keys(grouped).forEach(function (k) {
        var parts = k.split('|');
        result.push({ day: parts[0], board_type: parts[1], cnt: grouped[k] });
      });
      return result.sort(function (a, b) { return a.day < b.day ? -1 : 1; });
    } catch (e) {
      if (e.message !== 'TOKEN_EXPIRED' && window.Sentry) window.Sentry.captureException(e);
      return null;
    }
  }

  // ── J-2 (b) 신고 5행 mock 그대로 반환 ─────────────────────────────────
  function fetchBoardReportsMock() {
    return Promise.resolve(BOARD_REPORTS_MOCK);
  }

  // ── J-1 (a) 숨김 액션 (posts.is_hidden = true) ────────────────────────
  async function handleHidePost(postId) {
    if (!postId) {
      showAdminToast('postId 없음 (J-2 (b) v2.0 대기 mock — 실 데이터 연결 후 작동)', 'warning');
      return false;
    }
    try {
      var res = await window.db.fetch('/rest/v1/posts?id=eq.' + encodeURIComponent(postId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ is_hidden: true })
      });
      if (res.status === 403 && typeof window.admExit === 'function') window.admExit();
      if (!res.ok) {
        showAdminToast('숨김 실패 (' + res.status + ')', 'danger');
        return false;
      }
      showAdminToast('게시글 숨김 완료', 'success');
      return true;
    } catch (e) {
      if (e.message !== 'TOKEN_EXPIRED' && window.Sentry) window.Sentry.captureException(e);
      return false;
    }
  }

  // ── J-1 (a) 삭제 액션 (DELETE FROM posts) ─────────────────────────────
  async function handleDeletePost(postId) {
    if (!postId) {
      showAdminToast('postId 없음 (J-2 (b) v2.0 대기 mock — 실 데이터 연결 후 작동)', 'warning');
      return false;
    }
    if (!confirm('게시글을 삭제하시겠습니까?\n(되돌릴 수 없습니다)')) return false;
    try {
      var res = await window.db.fetch('/rest/v1/posts?id=eq.' + encodeURIComponent(postId), {
        method: 'DELETE',
        headers: { 'Prefer': 'return=minimal' }
      });
      if (res.status === 403 && typeof window.admExit === 'function') window.admExit();
      if (!res.ok) {
        showAdminToast('삭제 실패 (' + res.status + ')', 'danger');
        return false;
      }
      showAdminToast('게시글 삭제 완료', 'success');
      return true;
    } catch (e) {
      if (e.message !== 'TOKEN_EXPIRED' && window.Sentry) window.Sentry.captureException(e);
      return false;
    }
  }

  // ── J-3 (a) 사용자 정지 액션 (D-pre.5 status='suspended') ─────────────
  async function handleSuspendUser(userId) {
    if (!userId) {
      showAdminToast('userId 없음 (J-2 (b) v2.0 대기 mock — 실 데이터 연결 후 작동)', 'warning');
      return false;
    }
    if (!confirm('사용자를 정지하시겠습니까?\n(status: active → suspended)')) return false;
    try {
      var res = await window.db.fetch('/rest/v1/users?id=eq.' + encodeURIComponent(userId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify({ status: 'suspended' })
      });
      if (res.status === 403 && typeof window.admExit === 'function') window.admExit();
      if (!res.ok) {
        showAdminToast('정지 실패 (' + res.status + ')', 'danger');
        return false;
      }
      showAdminToast('사용자 정지 완료', 'success');
      return true;
    } catch (e) {
      if (e.message !== 'TOKEN_EXPIRED' && window.Sentry) window.Sentry.captureException(e);
      return false;
    }
  }

  // ── render: KPI 3카드 ─────────────────────────────────────────────────
  function renderBoardKPI(kpi) {
    if (!kpi) return;
    var elPosts    = document.getElementById('adm-board-kpi-posts');
    var elComments = document.getElementById('adm-board-kpi-comments');
    var elReports  = document.getElementById('adm-board-kpi-reports');
    if (elPosts)    elPosts.textContent    = kpi.posts.toLocaleString('ko-KR');
    if (elComments) elComments.textContent = kpi.comments.toLocaleString('ko-KR');
    if (elReports)  elReports.textContent  = kpi.reportsPending.toLocaleString('ko-KR');
  }

  // ── render: 90일 활동 라인차트 SVG (J-4 (a) 보험사 v2.0 회색 점선 보존) ─
  function renderBoardActivityChart(rows) {
    var host = document.getElementById('adm-board-activity-chart');
    if (!host) return;
    if (!rows || rows.length === 0) {
      host.innerHTML = '<text x="300" y="110" text-anchor="middle" font-size="12" fill="rgba(255,255,255,0.4)">데이터 수집 중 (게시글 0건)</text>';
      return;
    }
    var byType = { team: [], together: [], insurer_board: [] };
    rows.forEach(function (r) { if (byType[r.board_type]) byType[r.board_type].push(r); });

    var dayMap = {};
    rows.forEach(function (r) { dayMap[r.day] = true; });
    var days = Object.keys(dayMap).sort();
    if (days.length < 2) days = days.length === 1 ? [days[0], days[0]] : ['2026-01-01', '2026-04-30'];
    var xStep = (560 - 40) / Math.max(days.length - 1, 1);
    var dayIdx = {};
    days.forEach(function (d, i) { dayIdx[d] = i; });

    var maxCnt = 1;
    rows.forEach(function (r) { if (r.cnt > maxCnt) maxCnt = r.cnt; });
    var yScale = function (cnt) { return 195 - (cnt / maxCnt) * 155; };

    function buildPoints(typeRows) {
      if (!typeRows || typeRows.length === 0) return '';
      return typeRows.map(function (r) {
        return (40 + dayIdx[r.day] * xStep) + ',' + yScale(r.cnt);
      }).join(' ');
    }

    var teamPoints     = buildPoints(byType.team);
    var togetherPoints = buildPoints(byType.together);

    var svg = ''
      + '<g stroke="rgba(255,255,255,0.06)" stroke-width="1">'
      +   '<line x1="0" y1="40"  x2="600" y2="40"/>'
      +   '<line x1="0" y1="90"  x2="600" y2="90"/>'
      +   '<line x1="0" y1="140" x2="600" y2="140"/>'
      +   '<line x1="0" y1="190" x2="600" y2="190"/>'
      + '</g>'
      + '<g font-size="10" fill="rgba(255,255,255,0.4)" font-family="DM Sans">'
      +   '<text x="5" y="44">' + maxCnt + '</text>'
      +   '<text x="5" y="194">0</text>'
      + '</g>';
    if (teamPoints)     svg += '<polyline fill="none" stroke="#D4845A" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="' + teamPoints + '"/>';
    if (togetherPoints) svg += '<polyline fill="none" stroke="#3B82F6" stroke-width="2"   stroke-linejoin="round" stroke-linecap="round" points="' + togetherPoints + '"/>';
    // J-4 (a) 보험사 v2.0 회색 점선 (정적 — 데이터 0)
    svg += '<polyline fill="none" stroke="var(--admin-text-tertiary)" stroke-width="1.5" stroke-dasharray="4,4" stroke-linejoin="round" points="40,195 580,195"/>';

    host.innerHTML = svg;
  }

  // ── render: 신고 5행 mock 테이블 (J-2 (b) 라벨만 동적) ────────────────
  function renderBoardReportsTable(rows) {
    var tbody = document.getElementById('adm-board-reports-tbody');
    if (!tbody || !rows) return;
    tbody.innerHTML = rows.map(function (r) {
      return ''
        + '<tr>'
        +   '<td><span class="adm-badge ' + r.boardClass + '">' + r.board + '</span></td>'
        +   '<td><strong>' + r.title + '</strong></td>'
        +   '<td>' + r.author + '</td>'
        +   '<td><span class="adm-badge ' + r.reasonClass + '">' + r.reasonLabel + '</span></td>'
        +   '<td style="font-feature-settings:\'tnum\'; font-weight:700;">' + r.count + '</td>'
        +   '<td>' + r.ago + '</td>'
        +   '<td><div class="row-actions">'
        +     '<button title="숨김" data-action="hide"    data-post-id="' + (r.postId || '') + '">👁️</button>'
        +     '<button title="삭제" data-action="delete"  data-post-id="' + (r.postId || '') + '">🗑️</button>'
        +     '<button title="정지" data-action="suspend" data-user-id="' + (r.authorId || '') + '">⛔</button>'
        +   '</div></td>'
        + '</tr>';
    }).join('');
  }

  // ── attach: 신고 행 액션 버튼 이벤트 위임 ─────────────────────────────
  function attachReportActions() {
    var tbody = document.getElementById('adm-board-reports-tbody');
    if (!tbody || tbody.dataset.actionsAttached) return;
    tbody.dataset.actionsAttached = '1';
    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-action]');
      if (!btn) return;
      var action = btn.dataset.action;
      var postId = btn.dataset.postId || null;
      var userId = btn.dataset.userId || null;
      if (action === 'hide')    handleHidePost(postId);
      if (action === 'delete')  handleDeletePost(postId);
      if (action === 'suspend') handleSuspendUser(userId);
    });
  }

  // ── 진입점 (admin_v2 board 뷰 활성화 시 호출) ─────────────────────────
  window.admLoadBoard = async function () {
    var [kpi, activity, reports] = await Promise.all([
      fetchBoardKPI(), fetchBoardActivity90d(), fetchBoardReportsMock()
    ]);
    if (!document.querySelector('.adm-view[data-view="board"].active')) return;
    if (kpi)      renderBoardKPI(kpi);
    if (activity) renderBoardActivityChart(activity);
    if (reports)  renderBoardReportsTable(reports);
    attachReportActions();
  };

  // ════════════════════════════════════════════════════════════════════════
  // D-4 notice — v2.0 대기 + mock 보존 (D-3 J-2 (b) 패턴 정합) (2026-05-04 신설)
  // 작업지시서: docs/specs/admin_v2_d4_workorder.md (commit 16cbdbc)
  // 결재: K-1(c) v2.0 대기 + mock 보존 (5/4 재결재 — app_settings 컬럼 부재 발견)
  //       K-2(b) 노출 1주 / K-3(b) role enum 5종 / K-4(a) 즉시 PATCH (v2.0 시점 적용)
  //       K-5(b) 작성 form Phase E / K-6(b) 조회수 별 트랙
  // 사전 검증: D-4 Step 1 5/6 PASS + ⑥ FAIL 청산 (app_settings RLS is_admin() 통일)
  // ════════════════════════════════════════════════════════════════════════

  // ── K-1 (c) v2.0 대기 — 활성 카드 4행 mock 보존 ────────────────────────
  var NOTICE_ACTIVE_MOCK = [
    { id: null, type: '공지', isActive: true,  isBanner: false, title: '2026 5월 정기 업데이트 안내 — 어드민 콘솔 v2 정식 오픈',         target: '전체 사용자',     period: '2026-05-01 ~ 05-15',     metric: '조회 847' },
    { id: null, type: '배너', isActive: true,  isBanner: true,  title: 'PRO 플랜 5월 한정 — 첫 달 50% 할인 (₩9,900 → ₩4,950)',           target: 'FREE 사용자',     period: '홈 / 마이스페이스 상단', metric: '전환 23명' },
    { id: null, type: '공지', isActive: true,  isBanner: false, title: '함께해요 게시판 가이드 — 광고·홍보 게시 금지 안내',                target: 'GA · 원수사',     period: '2026-04-20 ~ 상시',      metric: '조회 421' },
    { id: null, type: '배너', isActive: false, isBanner: true,  title: '[종료] 2026 4월 보장분석 표준 양식 v3.2 배포',                    target: 'GA 매니저 이상',  period: '노출 종료 2026-04-30',   metric: '조회 1,284' }
  ];

  // ── K-1 (c) v2.0 대기 — 작성 이력 5행 mock 보존 ────────────────────────
  var NOTICE_HISTORY_MOCK = [
    { id: null, isBanner: false, title: '2026 5월 정기 업데이트 — admin v2 정식 오픈', target: '전체',        author: '임태성', isActive: true,  status: '활성', period: '05-01 ~ 05-15' },
    { id: null, isBanner: true,  title: 'PRO 첫 달 50% 할인 캠페인',                  target: 'FREE 사용자', author: '임태성', isActive: true,  status: '활성', period: '05-01 ~ 05-31' },
    { id: null, isBanner: false, title: '함께해요 게시판 가이드 — 광고·홍보 금지',     target: 'GA · 원수사', author: '임태성', isActive: true,  status: '활성', period: '04-20 ~ 상시' },
    { id: null, isBanner: true,  title: '2026 4월 보장분석 표준 양식 v3.2 배포',       target: 'GA 매니저 이상', author: '김지훈', isActive: false, status: '종료', period: '04-15 ~ 04-30' },
    { id: null, isBanner: false, title: '2026 Q1 시스템 점검 사전 안내',              target: '전체',        author: '임태성', isActive: true,  status: '활성', period: '03-25 ~ 04-01' }
  ];

  // ── J-2 (b) 패턴 — mock 즉시 반환 ──────────────────────────────────────
  function fetchNoticeActiveMock()  { return Promise.resolve(NOTICE_ACTIVE_MOCK); }
  function fetchNoticeHistoryMock() { return Promise.resolve(NOTICE_HISTORY_MOCK); }

  // ── K-1 (c) v2.0 대기 — 토글/액션 핸들러 (id null이라 토스트 즉시) ─────
  function handleNoticeToggle(id, isActive) {
    if (!id) {
      showAdminToast('K-1 (c) v2.0 대기 mock — notices 테이블 신설 후 작동', 'warning');
      return Promise.resolve(false);
    }
    return Promise.resolve(false);
  }

  function handleNoticeAction(action, id) {
    if (!id) {
      showAdminToast(action + ' — K-1 (c) v2.0 대기 mock (notices 테이블 신설 후)', 'warning');
      return false;
    }
    return false;
  }

  // ── render: 활성 카드 4 (mock 그대로 + 토글 스위치) ───────────────────
  function renderNoticeActiveCards(cards) {
    var grid = document.querySelector('.adm-view[data-view="notice"] .adm-notice-grid');
    if (!grid || !cards) return;
    grid.innerHTML = cards.map(function (c) {
      var typeColor = c.isActive ? '🟢 활성' : '⚪ 비활성';
      var typeStyle = c.isActive ? '' : ' style="color: var(--admin-text-tertiary);"';
      return ''
        + '<div class="adm-notice-card' + (c.isActive ? '' : ' off') + '">'
        +   '<div class="head">'
        +     '<div class="type"' + typeStyle + '>' + typeColor + ' · ' + c.type + '</div>'
        +     '<div class="toggle"><input type="checkbox" data-notice-toggle="' + (c.id || '') + '"' + (c.isActive ? ' checked' : '') + '></div>'
        +   '</div>'
        +   '<div class="title">' + c.title + '</div>'
        +   '<div class="meta">'
        +     '<span>대상: <strong>' + c.target + '</strong></span>'
        +     '<span>노출: <strong>' + c.period + '</strong></span>'
        +     '<span>' + c.metric + '</span>'
        +   '</div>'
        + '</div>';
    }).join('');
  }

  // ── render: 작성 이력 테이블 5행 (mock 그대로) ─────────────────────────
  function renderNoticeHistory(rows) {
    var tbody = document.querySelector('.adm-view[data-view="notice"] .adm-table tbody');
    if (!tbody || !rows) return;
    tbody.innerHTML = rows.map(function (r) {
      var typeBg    = r.isBanner ? 'var(--admin-warning-bg)' : 'var(--admin-info-bg)';
      var typeFg    = r.isBanner ? 'var(--color-warning)'    : 'var(--color-info)';
      var typeLabel = r.isBanner ? '배너' : '공지';
      var statusCls = r.isActive ? 'status-active' : 'status-suspended';
      return ''
        + '<tr>'
        +   '<td><span class="adm-badge" style="background:' + typeBg + '; color:' + typeFg + ';">' + typeLabel + '</span></td>'
        +   '<td><strong>' + r.title + '</strong></td>'
        +   '<td>' + r.target + '</td>'
        +   '<td>' + r.author + '</td>'
        +   '<td><span class="adm-badge ' + statusCls + '">' + r.status + '</span></td>'
        +   '<td>' + r.period + '</td>'
        +   '<td><div class="row-actions">'
        +     '<button title="상세" data-notice-action="detail" data-notice-id="' + (r.id || '') + '">👁️</button>'
        +     '<button title="편집" data-notice-action="edit"   data-notice-id="' + (r.id || '') + '">✏️</button>'
        +   '</div></td>'
        + '</tr>';
    }).join('');
  }

  // ── attach: 토글 + 액션 버튼 이벤트 위임 ──────────────────────────────
  function attachNoticeActions() {
    var view = document.querySelector('.adm-view[data-view="notice"]');
    if (!view || view.dataset.noticeAttached) return;
    view.dataset.noticeAttached = '1';
    view.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-notice-action]');
      if (!btn) return;
      handleNoticeAction(btn.dataset.noticeAction, btn.dataset.noticeId || null);
    });
    view.addEventListener('change', function (e) {
      var input = e.target.closest('input[data-notice-toggle]');
      if (!input) return;
      handleNoticeToggle(input.dataset.noticeToggle || null, input.checked).then(function (ok) {
        if (!ok) input.checked = !input.checked;
      });
    });
  }

  // ── 진입점 (admin_v2 notice 뷰 활성화 시 호출) ────────────────────────
  window.admLoadNotice = async function () {
    var [active, history] = await Promise.all([
      fetchNoticeActiveMock(), fetchNoticeHistoryMock()
    ]);
    if (!document.querySelector('.adm-view[data-view="notice"].active')) return;
    if (active)  renderNoticeActiveCards(active);
    if (history) renderNoticeHistory(history);
    attachNoticeActions();
  };

  // ════════════════════════════════════════════════════════════════════════
  // D-6 logs — activity_logs 검색·4필터 + SYSTEM mock 합치기 (2026-05-05 신설)
  // 작업지시서: docs/specs/admin_v2_d6_workorder.md
  // 사전 검증: D-6 Step 1 6/6 + Step 1.5 admin read all logs is_admin() 통일
  // 결재: M-1 (b) 단순 LIKE / M-2 (c) SYSTEM mock 보존 / M-3 표준 / M-4 (a) 오늘 / M-5 (b) 영구 / M-6 (b) Phase E
  // 추가 결재: M-7 (c) result 컬럼 부재 → 모든 행 "성공" 통일 / M-8 (b) event_type select 라이브 2종 / M-9 (a) admin RLS is_admin() 청산 완료
  // ════════════════════════════════════════════════════════════════════════

  var LOGS_PAGE_SIZE = 12;

  // event_type → 한국어 라벨 (M-8 (b) 라이브 2종 — 분포 확장 시 별 트랙 #9에서 동적 채움)
  var EVENT_TYPE_LABEL = {
    login: '로그인',
    script_view: '스크립트 조회'
  };

  // SYSTEM_LOGS_MOCK — M-2 (c) admin_v2.html mock SYSTEM 2행 raw 보존
  var SYSTEM_LOGS_MOCK = [
    { id: 'sys_1', user_id: null, event_type: 'system_warn',
      target_type: 'api', target_id: '/api/scripts/search',
      created_at: null, _system: true, _label: 'API 응답 지연',
      _result: 'warn', _detail: 'avg_latency=2.4s' },
    { id: 'sys_2', user_id: null, event_type: 'system_error',
      target_type: 'db', target_id: 'supabase pdnwgzn...',
      created_at: null, _system: true, _label: 'DB connection timeout',
      _result: 'fail', _detail: '자동 재연결 → 정상' }
  ];

  var _logsState = {
    search: '', date: '', userId: 'all', eventType: 'all', result: 'all',
    total: 0, _userMap: null
  };

  // ── fetch — activity_logs 12행 ─────────────────────────────────────────
  async function fetchActivityLogs(opts) {
    opts = opts || {};
    Object.assign(_logsState, opts);

    var params = new URLSearchParams();
    params.set('select', 'id,user_id,event_type,target_type,target_id,created_at');
    params.set('order', 'created_at.desc');
    params.set('limit', String(LOGS_PAGE_SIZE));

    // M-3 #1 — 날짜 필터 (M-4 (a) today default)
    if (_logsState.date) {
      var d = _logsState.date;
      params.append('created_at', 'gte.' + d + 'T00:00:00');
      params.append('created_at', 'lt.'  + d + 'T23:59:59.999');
    }
    // M-3 #2 — 사용자 필터
    if (_logsState.userId && _logsState.userId !== 'all') {
      params.set('user_id', 'eq.' + _logsState.userId);
    }
    // M-3 #3 — 액션(event_type) 필터
    if (_logsState.eventType && _logsState.eventType !== 'all') {
      params.set('event_type', 'eq.' + _logsState.eventType);
    }
    // 검색 — M-1 (b) 단순 LIKE (event_type / target_type / target_id ilike)
    if (_logsState.search && _logsState.search.trim()) {
      var safe = _logsState.search.trim().replace(/[*,()]/g, '');
      params.set('or', '(event_type.ilike.*' + safe + '*,target_type.ilike.*' + safe + '*,target_id.ilike.*' + safe + '*)');
    }
    // M-3 #4 result는 컬럼 부재(M-7 (c)) → 필터 무관 (UI는 그대로, 모든 행 "성공" 통일)

    try {
      var res = await window.db.fetch('/rest/v1/activity_logs?' + params.toString(), {
        headers: { 'Prefer': 'count=exact' }
      });
      if (res.status === 403) {
        if (typeof window.admExit === 'function') window.admExit();
        throw new Error('관리자 권한 없음');
      }
      if (!res.ok) {
        showAdminToast('서버 오류 (' + res.status + '). 잠시 후 다시 시도해 주세요.', 'danger');
        if (window.Sentry) window.Sentry.captureMessage('[admin_v2 D-6] fetchActivityLogs HTTP ' + res.status);
        throw new Error('HTTP ' + res.status);
      }
      var rows = await res.json();
      _logsState.total = parseCount(res);
      return { rows: rows, total: _logsState.total };
    } catch (e) {
      if (e.name === 'TypeError' && /network|fetch|failed/i.test(e.message)) {
        await new Promise(function (r) { setTimeout(r, 3000); });
        return fetchActivityLogs(opts);
      }
      if (e.message !== 'TOKEN_EXPIRED' && e.message !== '관리자 권한 없음') {
        if (window.Sentry) window.Sentry.captureException(e);
      }
      return null;
    }
  }

  // ── fetch — 사용자 옵션 (admin SELECT 활용 — D-1 정합) ─────────────────
  async function fetchUsersForLogs() {
    if (_logsState._userMap) return _logsState._userMap;
    try {
      var res = await window.db.fetch('/rest/v1/users?select=id,name,role&order=name.asc');
      if (!res.ok) return null;
      var rows = await res.json();
      var map = {};
      rows.forEach(function (u) { map[u.id] = u; });
      _logsState._userMap = map;
      return map;
    } catch (e) { return null; }
  }

  // ── M-2 (c) — SYSTEM mock 합치기 (필터 활성 시 자동 제외) ───────────────
  function mergeSystemLogsMock(rows, opts) {
    opts = opts || {};
    if ((opts.userId && opts.userId !== 'all') ||
        (opts.eventType && opts.eventType !== 'all') ||
        (opts.search && opts.search.trim())) {
      return rows;
    }
    return rows.concat(SYSTEM_LOGS_MOCK).slice(0, LOGS_PAGE_SIZE);
  }

  // ── render — logs 테이블 ──────────────────────────────────────────────
  function renderLogsTable(rows) {
    var tbody = document.getElementById('adm-logs-tbody');
    if (!tbody) return;
    if (!rows || !rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--admin-text-tertiary);padding:24px;">로그가 없습니다.</td></tr>';
      return;
    }
    var userMap = _logsState._userMap || {};
    tbody.innerHTML = rows.map(function (r) {
      // 시각
      var time = '—';
      if (r.created_at) {
        var d = new Date(r.created_at);
        time = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0');
      }
      // 사용자
      var userCell;
      if (r._system) {
        var sysCls = r.event_type === 'system_error' ? 'rgba(239,68,68,0.18)' : 'var(--admin-warning-bg)';
        var sysClr = r.event_type === 'system_error' ? 'var(--color-danger)' : 'var(--color-warning)';
        var sysLbl = r.event_type === 'system_error' ? '오류' : '시스템';
        userCell = '<strong>SYSTEM</strong> <span class="adm-badge" style="background:' + sysCls + ';color:' + sysClr + ';margin-left:6px;">' + sysLbl + '</span>';
      } else if (r.user_id && userMap[r.user_id]) {
        var u = userMap[r.user_id];
        var roleClass = ROLE_BADGE_CLASS[u.role] || '';
        var roleLabel = (window.ROLE_LABEL && window.ROLE_LABEL[u.role]) || u.role || '—';
        userCell = '<strong>' + escapeHtml(u.name || '—') + '</strong> <span class="adm-badge ' + roleClass + '" style="margin-left:6px;">' + escapeHtml(roleLabel) + '</span>';
      } else {
        userCell = '<span style="color:var(--admin-text-tertiary);">—</span>';
      }
      // 액션
      var action = r._system ? r._label : (EVENT_TYPE_LABEL[r.event_type] || r.event_type || '—');
      // 대상
      var target;
      if (r._system) target = r.target_id;
      else if (r.target_type && r.target_id) target = r.target_type + '#' + r.target_id;
      else target = '—';
      // 결과 (M-7 (c) — 모든 행 "성공" 통일 / SYSTEM은 mock 결과)
      var resultBadge;
      if (r._system) {
        if (r._result === 'fail')      resultBadge = '<span class="adm-badge status-suspended">실패</span>';
        else if (r._result === 'warn') resultBadge = '<span class="adm-badge status-pending">경고</span>';
        else                           resultBadge = '<span class="adm-badge status-active">성공</span>';
      } else {
        resultBadge = '<span class="adm-badge status-active">성공</span>';
      }
      // 상세
      var detail = r._system ? r._detail : ('id=' + (r.id != null ? r.id : '—'));
      return '<tr>'
        + '<td style="font-feature-settings:\'tnum\';color:var(--admin-text-tertiary);">' + escapeHtml(time) + '</td>'
        + '<td>' + userCell + '</td>'
        + '<td>' + escapeHtml(action) + '</td>'
        + '<td>' + escapeHtml(target) + '</td>'
        + '<td>' + resultBadge + '</td>'
        + '<td style="color:var(--admin-text-tertiary);font-size:11px;">' + escapeHtml(detail) + '</td>'
        + '</tr>';
    }).join('');
  }

  // ── render — 패널 메타 ────────────────────────────────────────────────
  function renderLogsMeta(total) {
    var meta = document.getElementById('adm-logs-meta');
    if (meta) meta.textContent = '최근 ' + LOGS_PAGE_SIZE + '건 · 전체 ' + (total || 0).toLocaleString() + '건';
  }

  // ── render — 사용자 select 동적 채움 (D-1 admin SELECT 정합) ─────────
  function renderLogsUserSelect(userMap) {
    var sel = document.getElementById('adm-logs-user-filter');
    if (!sel || !userMap) return;
    var current = sel.value;
    var opts = ['<option value="all">모든 사용자</option>'];
    Object.keys(userMap).forEach(function (id) {
      var u = userMap[id];
      var label = (u.name || '—') + ' (' + ((window.ROLE_LABEL && window.ROLE_LABEL[u.role]) || u.role || '—') + ')';
      opts.push('<option value="' + escapeHtml(id) + '">' + escapeHtml(label) + '</option>');
    });
    sel.innerHTML = opts.join('');
    if (current) sel.value = current;
  }

  // ── 진입점 ────────────────────────────────────────────────────────────
  window.admLoadLogs = async function () {
    if (!window.db) return;
    var dateInput = document.getElementById('adm-logs-date');
    if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().slice(0, 10); // M-4 (a) today default
    }
    var userMap = await fetchUsersForLogs();
    if (userMap) renderLogsUserSelect(userMap);

    var result = await fetchActivityLogs({ date: dateInput ? dateInput.value : '' });
    if (!document.querySelector('.adm-view[data-view="logs"].active')) return; // race
    if (result) {
      var merged = mergeSystemLogsMock(result.rows, _logsState);
      renderLogsTable(merged);
      renderLogsMeta(result.total);
    }
  };

  // ── 핸들러 — 검색 (300ms 디바운스) ─────────────────────────────────────
  function _logsApply(r) {
    if (!r) return;
    var merged = mergeSystemLogsMock(r.rows, _logsState);
    renderLogsTable(merged);
    renderLogsMeta(r.total);
  }
  window.admLogsSearch = adm_debounce(function (val) {
    fetchActivityLogs({ search: val || '' }).then(_logsApply);
  }, DEBOUNCE_MS);

  // ── 핸들러 — 4필터 (M-3 표준 — 날짜 → 사용자 → 액션 → 결과) ────────────
  window.admLogsFilterDate = function (val) {
    fetchActivityLogs({ date: val || '' }).then(_logsApply);
  };
  window.admLogsFilterUser = function (val) {
    fetchActivityLogs({ userId: val || 'all' }).then(_logsApply);
  };
  window.admLogsFilterAction = function (val) {
    fetchActivityLogs({ eventType: val || 'all' }).then(_logsApply);
  };
  window.admLogsFilterResult = function (val) {
    // M-7 (c) — DB result 컬럼 부재로 필터 무관 (UI 그대로 / 'all' 외 선택 시 안내 토스트)
    if (val && val !== 'all') {
      showAdminToast('결과 필터: result 컬럼 부재(M-7 (c)) — 모든 행 "성공" 통일 표시', 'info');
    }
  };

  // ── 핸들러 — CSV / 새로고침 ───────────────────────────────────────────
  window.admLogsExportCSV = function () {
    showAdminToast('Phase E 대기 — CSV 내보내기 (M-6 (b))', 'info');
  };
  window.admLogsRefresh = function () {
    window.admLoadLogs();
  };

  // ════════════════════════════════════════════════════════════════════════
  // D-5 analytics — DAU/WAU/MAU/리텐션 + 6메뉴 막대 + RPC 4종 (2026-05-05 신설)
  // 작업지시서: docs/specs/admin_v2_d5_workorder.md
  // 사전 검증: D-5 Step 1 7/7 + Step 2 RPC 5종 등록 + Step 3 정합 검증 15/15 PASS
  // 결재: L-1 KST 자정 / L-2 cold-start / L-3 (a) 90일 default / L-4 (b) 6메뉴 매핑 / L-5 (b) 코호트 별 트랙
  //       L-6 "데이터 수집 중" 라벨 / L-7 B-1 grid 토큰 / L-8 정의 명문화 / L-9 SECURITY DEFINER 표준 / L-10 (a) mock 보존
  // RPC: get_dau / get_wau / get_mau / get_feature_usage / get_retention_d30
  // ════════════════════════════════════════════════════════════════════════

  // 6메뉴 매핑 (L-4 (b) — admin_v2.html 라인 1921~1926 정합)
  var FEATURE_LABELS = {
    script:   '스크립트 라이브러리',
    home:     '홈 (대시보드)',
    together: '함께해요 게시판',
    myspace:  '마이스페이스',
    library:  '자료실',
    notice:   '공지 게시판'
  };

  var FEATURE_COLORS = {
    script:   '#D4845A',
    home:     '#E89A6F',
    together: '#3B82F6',
    myspace:  '#60A5FA',
    library:  '#10B981',
    notice:   '#34D399'
  };

  var FEATURE_ORDER = ['script','home','together','myspace','library','notice'];

  var _analyticsState = { days: 90 };

  // ── KST today (L-1 — D-2 fetchContentKPI 패턴) ─────────────────────────
  function _kstToday() { return new Date().toISOString().slice(0, 10); }
  function _kstDaysAgo(days) {
    var d = new Date(); d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }

  // ── fetch — RPC 호출 표준 (POST /rest/v1/rpc/<name>) ────────────────────
  async function _callRpc(name, args) {
    try {
      var res = await window.db.fetch('/rest/v1/rpc/' + name, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args || {})
      });
      if (res.status === 403) {
        if (typeof window.admExit === 'function') window.admExit();
        throw new Error('관리자 권한 없음');
      }
      if (!res.ok) {
        showAdminToast('RPC ' + name + ' 오류 (' + res.status + ')', 'danger');
        if (window.Sentry) window.Sentry.captureMessage('[admin_v2 D-5] RPC ' + name + ' HTTP ' + res.status);
        throw new Error('HTTP ' + res.status);
      }
      return await res.json();
    } catch (e) {
      if (e.name === 'TypeError' && /network|fetch|failed/i.test(e.message)) {
        await new Promise(function (r) { setTimeout(r, 3000); });
        return _callRpc(name, args);
      }
      if (e.message !== 'TOKEN_EXPIRED' && e.message !== '관리자 권한 없음') {
        if (window.Sentry) window.Sentry.captureException(e);
      }
      return null;
    }
  }

  // ── fetch — KPI 4종 병렬 (Promise.all) ─────────────────────────────────
  async function fetchAnalyticsKPI() {
    var today = _kstToday();
    var [dauRows, wau, mau, retention] = await Promise.all([
      _callRpc('get_dau', { start_date: today, end_date: today }),
      _callRpc('get_wau', {}),
      _callRpc('get_mau', {}),
      _callRpc('get_retention_d30', {})
    ]);
    return {
      dau: (dauRows && dauRows.length > 0) ? Number(dauRows[0].dau) : 0,
      wau: wau != null ? Number(wau) : 0,
      mau: mau != null ? Number(mau) : 0,
      retention: retention != null ? Number(retention) : 0
    };
  }

  // ── fetch — DAU N일 라인차트 ────────────────────────────────────────────
  async function fetchDAU(days) {
    return _callRpc('get_dau', {
      start_date: _kstDaysAgo(days), end_date: _kstToday()
    });
  }

  // ── fetch — 6메뉴 사용량 ────────────────────────────────────────────────
  async function fetchFeatureUsage(days) {
    return _callRpc('get_feature_usage', {
      start_date: _kstDaysAgo(days), end_date: _kstToday()
    });
  }

  // ── render — KPI 4카드 ─────────────────────────────────────────────────
  function renderAnalyticsKPI(kpi) {
    var elDau = document.getElementById('adm-analytics-kpi-dau');
    var elWau = document.getElementById('adm-analytics-kpi-wau');
    var elMau = document.getElementById('adm-analytics-kpi-mau');
    var elRet = document.getElementById('adm-analytics-kpi-retention');
    if (elDau) elDau.textContent = (kpi.dau || 0).toLocaleString();
    if (elWau) elWau.textContent = (kpi.wau || 0).toLocaleString();
    if (elMau) elMau.textContent = (kpi.mau || 0).toLocaleString();
    if (elRet) {
      // L-6: last_seen_at 미기록 등으로 0% 표시 시 "데이터 수집 중" 라벨
      var r = kpi.retention || 0;
      elRet.textContent = (r > 0) ? r.toFixed(1) + '%' : '— %';
      var elRetTrend = document.getElementById('adm-analytics-kpi-retention-trend');
      if (elRetTrend) {
        elRetTrend.textContent = (r > 0) ? '집계 활성' : '데이터 수집 중';
        elRetTrend.className = 'adm-kpi-trend' + ((r > 0) ? ' up' : '');
      }
    }
  }

  // ── render — DAU 라인차트 (SVG 동적, viewBox 0 0 600 220) ──────────────
  function renderDAUChart(rows, days) {
    var svg = document.getElementById('adm-analytics-dau-chart');
    if (!svg) return;
    var meta = document.getElementById('adm-analytics-dau-meta');
    if (meta) {
      meta.textContent = _kstDaysAgo(days) + ' ~ ' + _kstToday() + ' · 일간 활성 사용자';
    }
    if (!rows || !rows.length) {
      svg.innerHTML = '<text x="300" y="110" text-anchor="middle" font-size="14" fill="var(--admin-text-tertiary)">데이터 수집 중 — 4팀 오픈 후 자동 누적</text>';
      return;
    }
    // 좌표 계산: x = 40 ~ 580 (440px) / y = 200 (max=0) ~ 20 (max=N)
    var maxDau = Math.max.apply(null, rows.map(function (r) { return Number(r.dau) || 0; }));
    if (maxDau < 4) maxDau = 4; // 최소 스케일
    var w = 540, x0 = 40, y0 = 200, h = 180;
    var step = (rows.length > 1) ? w / (rows.length - 1) : 0;
    var pts = rows.map(function (r, i) {
      var y = y0 - (Number(r.dau) || 0) * h / maxDau;
      return { x: x0 + i * step, y: y, dau: Number(r.dau) || 0, day: r.day };
    });
    var poly = pts.map(function (p) { return p.x + ',' + p.y; }).join(' ');
    var pathD = 'M' + pts[0].x + ',' + pts[0].y + ' '
      + pts.slice(1).map(function (p) { return 'L' + p.x + ',' + p.y; }).join(' ')
      + ' L' + pts[pts.length - 1].x + ',' + y0
      + ' L' + pts[0].x + ',' + y0 + ' Z';
    // y축 눈금 라벨 (4단계)
    var yTicks = [
      { v: maxDau,             y: 20  },
      { v: Math.round(maxDau * 0.75), y: 65 },
      { v: Math.round(maxDau * 0.5),  y: 110 },
      { v: Math.round(maxDau * 0.25), y: 155 }
    ];
    svg.innerHTML =
      '<defs>'
        + '<linearGradient id="admDauArea" x1="0" x2="0" y1="0" y2="1">'
          + '<stop offset="0%"   stop-color="#D4845A" stop-opacity="0.20"/>'
          + '<stop offset="100%" stop-color="#D4845A" stop-opacity="0"/>'
        + '</linearGradient>'
      + '</defs>'
      + '<g stroke="var(--admin-chart-grid)" stroke-width="1">'
        + '<line x1="0" y1="20"  x2="600" y2="20"/>'
        + '<line x1="0" y1="65"  x2="600" y2="65"/>'
        + '<line x1="0" y1="110" x2="600" y2="110"/>'
        + '<line x1="0" y1="155" x2="600" y2="155"/>'
        + '<line x1="0" y1="200" x2="600" y2="200"/>'
      + '</g>'
      + '<g font-size="10" fill="var(--admin-text-tertiary)" font-family="DM Sans">'
        + yTicks.map(function (t) { return '<text x="5" y="' + (t.y + 4) + '">' + t.v + '</text>'; }).join('')
      + '</g>'
      + '<path d="' + pathD + '" fill="url(#admDauArea)"/>'
      + '<polyline fill="none" stroke="#D4845A" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="' + poly + '"/>'
      + '<circle cx="' + pts[pts.length - 1].x + '" cy="' + pts[pts.length - 1].y
                  + '" r="5" fill="#D4845A" stroke="#fff" stroke-width="2"/>';
  }

  // ── render — 6메뉴 막대 (SVG 동적, viewBox 0 0 600 240) ────────────────
  function renderFeatureUsage(rows) {
    var svg = document.getElementById('adm-analytics-feature-usage');
    if (!svg) return;
    if (!rows || !rows.length) {
      svg.innerHTML = '<text x="300" y="120" text-anchor="middle" font-size="14" fill="var(--admin-text-tertiary)">데이터 수집 중</text>';
      return;
    }
    // 매핑: rows = [{feature: 'script', count: 580}, ...]
    var byFeat = {};
    rows.forEach(function (r) { byFeat[r.feature] = Number(r.count) || 0; });
    // 6종 강제 보장 + 정렬(desc)
    var ordered = FEATURE_ORDER.map(function (k) {
      return { feature: k, count: byFeat[k] || 0 };
    }).sort(function (a, b) { return b.count - a.count; });

    var maxCount = Math.max.apply(null, ordered.map(function (r) { return r.count; }));
    if (maxCount < 1) maxCount = 1;
    // 막대 그리드 + 라벨 + rect + 값
    var rows_y = [40, 72, 104, 136, 168, 200];
    var x0 = 120, w = 430;
    var bars = ordered.map(function (r, i) {
      var width = (r.count / maxCount) * w;
      var color = FEATURE_COLORS[r.feature];
      return '<rect x="' + x0 + '" y="' + (rows_y[i] - 14)
        + '" width="' + width + '" height="20" fill="' + color + '" rx="4"/>';
    }).join('');
    var labels = ordered.map(function (r, i) {
      return '<text x="115" y="' + rows_y[i] + '" text-anchor="end">' + FEATURE_LABELS[r.feature] + '</text>';
    }).join('');
    var values = ordered.map(function (r, i) {
      var x = x0 + (r.count / maxCount) * w + 8;
      return '<text x="' + x + '" y="' + rows_y[i] + '">' + r.count.toLocaleString() + '</text>';
    }).join('');
    // x축 5단계 (0/25/50/75/100%)
    var xAxis = [0, 0.25, 0.5, 0.75, 1].map(function (p) {
      var x = x0 + p * w;
      var label = (p === 0) ? '0' : (Math.round(maxCount * p)).toLocaleString();
      return '<line x1="' + x + '" y1="20" x2="' + x + '" y2="220" stroke="var(--admin-chart-grid)" stroke-width="1"/>'
        + '<text x="' + x + '" y="232" font-size="9" fill="var(--admin-text-tertiary)">' + label + '</text>';
    }).join('');
    svg.innerHTML =
      '<g>' + xAxis + '</g>'
      + '<g font-size="11" fill="var(--admin-text-secondary)" font-family="DM Sans">' + labels + '</g>'
      + '<g>' + bars + '</g>'
      + '<g font-size="11" font-weight="700" fill="var(--admin-text-primary)" font-family="DM Sans" font-feature-settings="tnum">' + values + '</g>';
  }

  // ── render — 시간축 토글 active 갱신 ──────────────────────────────────
  function _setTimeRangeActive(days) {
    document.querySelectorAll('[data-analytics-range]').forEach(function (btn) {
      btn.classList.toggle('active', Number(btn.dataset.analyticsRange) === days);
    });
  }

  // ── 진입점 ────────────────────────────────────────────────────────────
  window.admLoadAnalytics = async function () {
    if (!window.db) return;
    var [kpi, dau, feat] = await Promise.all([
      fetchAnalyticsKPI(),
      fetchDAU(_analyticsState.days),
      fetchFeatureUsage(_analyticsState.days)
    ]);
    if (!document.querySelector('.adm-view[data-view="analytics"].active')) return;
    if (kpi)  renderAnalyticsKPI(kpi);
    if (dau)  renderDAUChart(dau, _analyticsState.days);
    if (feat) renderFeatureUsage(feat);
    _setTimeRangeActive(_analyticsState.days);
  };

  // ── 핸들러 — 시간축 토글 (L-3 (a) 90일 default) ───────────────────────
  window.admAnalyticsTimeRange = function (days) {
    _analyticsState.days = Number(days) || 90;
    _setTimeRangeActive(_analyticsState.days);
    Promise.all([
      fetchDAU(_analyticsState.days),
      fetchFeatureUsage(_analyticsState.days)
    ]).then(function (r) {
      if (!document.querySelector('.adm-view[data-view="analytics"].active')) return;
      if (r[0]) renderDAUChart(r[0], _analyticsState.days);
      if (r[1]) renderFeatureUsage(r[1]);
    });
  };

  // ── 핸들러 — 기간 선택 / 리포트 PDF (L-10 (a) mock 보존) ──────────────
  window.admAnalyticsDateSelect = function () {
    showAdminToast('Phase E 대기 — 기간 선택 (L-10 (a) mock 보존)', 'info');
  };
  window.admAnalyticsExportPDF = function () {
    showAdminToast('Phase E 대기 — 리포트 PDF (L-10 (a) mock 보존)', 'info');
  };

  // ── race 안전장치 — admin_v2.js 로드 시점에 active view 즉시 로드 (D-1·D-2·D-3·D-4·D-5·D-6 통합)
  //   (예: #admin/users 또는 #admin/content 또는 #admin/board 또는 #admin/notice 또는 #admin/analytics 또는 #admin/logs 직접 hash 진입 시 inline script가 src script보다 먼저 admSwitchView 호출)
  if (document.querySelector('.adm-view[data-view="users"].active')) {
    window.admLoadUsers();
  } else if (document.querySelector('.adm-view[data-view="content"].active')) {
    window.admLoadContent();
  } else if (document.querySelector('.adm-view[data-view="board"].active')) {
    window.admLoadBoard();
  } else if (document.querySelector('.adm-view[data-view="notice"].active')) {
    window.admLoadNotice();
  } else if (document.querySelector('.adm-view[data-view="analytics"].active')) {
    window.admLoadAnalytics();
  } else if (document.querySelector('.adm-view[data-view="logs"].active')) {
    window.admLoadLogs();
  }

})();
