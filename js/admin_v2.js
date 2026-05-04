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

  // ── race 안전장치 — admin_v2.js 로드 시점에 active view 즉시 로드 (D-1·D-2·D-3 통합)
  //   (예: #admin/users 또는 #admin/content 또는 #admin/board 직접 hash 진입 시 inline script가 src script보다 먼저 admSwitchView 호출)
  if (document.querySelector('.adm-view[data-view="users"].active')) {
    window.admLoadUsers();
  } else if (document.querySelector('.adm-view[data-view="content"].active')) {
    window.admLoadContent();
  } else if (document.querySelector('.adm-view[data-view="board"].active')) {
    window.admLoadBoard();
  }

})();
