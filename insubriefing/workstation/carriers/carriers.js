(function () {
  'use strict';
  var PILOT_ID = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';
  var TEST_EMAIL = 'bylts0428+codex-workstation-20260815@gmail.com';
  var FAVORITES_KEY = 'ws_carrier_favorites';
  var state = { tab: localStorage.getItem('ws_carrier_tab') || 'nonlife', query: '', carriers: [], favorites: readFavorites() };

  function storedUser() { try { return JSON.parse(localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}'); } catch (_e) { return {}; } }
  function isLocal() { return location.hostname === '127.0.0.1' || location.hostname === 'localhost'; }
  function allowed() { var user = storedUser(), email = String(user.email || '').toLowerCase(); return isLocal() || String(user.id || '') === PILOT_ID || email === TEST_EMAIL; }
  function authenticated() { return !!(window.db && window.db.getToken && window.db.getToken() && storedUser().id); }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]; }); }
  function normalize(value) { return String(value || '').toLocaleLowerCase('ko-KR').replace(/\(주\)|주식회사|보험|손해|생명|[^0-9a-z가-힣]/g, ''); }
  function safeUrl(value) { try { var url = new URL(value, location.origin); return /^https?:$/.test(url.protocol) ? url.href : ''; } catch (_e) { return ''; } }
  function readFavorites() { try { var rows = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); return Array.isArray(rows) ? rows.map(String) : []; } catch (_e) { return []; } }
  function saveFavorites() { localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites)); }

  function parseLinkGroups(root) {
    var grid = root.querySelector('div[style*="grid-template-columns:1fr 1fr"]');
    if (!grid) return [];
    return Array.prototype.map.call(grid.children, function (column, index) {
      var heading = column.children[0], list = column.children[1];
      var type = /생명/.test(heading ? heading.textContent : '') || index === 1 ? 'life' : 'nonlife';
      return Array.prototype.map.call(list ? list.children : [], function (child) {
        var link = child.tagName === 'A' ? child : child.querySelector('a');
        var card = link ? (link.firstElementChild || link) : child;
        var nameNode = card ? card.firstElementChild : null;
        return { name: String(nameNode ? nameNode.textContent : child.textContent || '').trim(), type: type, systemUrl: link ? safeUrl(link.getAttribute('href')) : '' };
      });
    }).reduce(function (all, rows) { return all.concat(rows); }, []).filter(function (row) { return row.name; });
  }

  function parseContacts(root) {
    var result = {};
    Array.prototype.forEach.call(root.querySelectorAll('div[style*="border-radius:18px"]'), function (card) {
      var nameNode = card.firstElementChild;
      if (!nameNode || !card.children[1]) return;
      var name = String(nameNode.textContent || '').trim();
      if (!name || name.length > 40) return;
      var info = { name: name, contacts: {}, homepageUrl: '' };
      Array.prototype.forEach.call(card.children[1].children, function (row) {
        var labelNode = row.querySelector('b'), label = labelNode ? String(labelNode.textContent || '').trim() : '';
        var clone = row.cloneNode(true);
        Array.prototype.forEach.call(clone.querySelectorAll('b,a,span'), function (node) { node.remove(); });
        var value = String(clone.textContent || '').replace(/^\s+|\s+$/g, '').replace(/\/$/, '').trim();
        if (label && value) info.contacts[label] = value;
        Array.prototype.forEach.call(row.querySelectorAll('a'), function (link) {
          if (/홈페이지/.test(link.textContent || '')) info.homepageUrl = safeUrl(link.getAttribute('href'));
        });
      });
      result[normalize(name)] = info;
    });
    return result;
  }

  function mergeSource(html) {
    var root = document.createElement('div'); root.innerHTML = String(html || '');
    var links = parseLinkGroups(root), contacts = parseContacts(root);
    return links.map(function (row) {
      var key = normalize(row.name), match = contacts[key];
      if (!match) Object.keys(contacts).some(function (contactKey) { if (contactKey.indexOf(key) >= 0 || key.indexOf(contactKey) >= 0) { match = contacts[contactKey]; return true; } return false; });
      return { id: key || row.name, name: row.name, type: row.type, systemUrl: row.systemUrl, homepageUrl: match ? match.homepageUrl : '', contacts: match ? match.contacts : {} };
    });
  }

  function mark(name) { var clean = String(name || '').replace(/보험|손해|생명|주식회사|\(주\)/g, '').trim(); return clean.slice(0, 2) || '보험'; }
  function infoRows(carrier) {
    var preferred = ['고객센터', '인콜 모니터링', '모니터링', '전산 헬프데스크', '보험금 청구팩스', '보상청구'];
    var seen = {}, rows = [];
    preferred.forEach(function (label) { if (carrier.contacts[label] && !seen[label]) { seen[label] = true; rows.push([label, carrier.contacts[label]]); } });
    Object.keys(carrier.contacts).forEach(function (label) { if (!seen[label] && rows.length < 4) rows.push([label, carrier.contacts[label]]); });
    if (!rows.length) {
      var host = '';
      try { host = new URL(carrier.systemUrl).hostname.replace(/^www\./, ''); } catch (_e) {}
      return '<div class="carrier-info-row"><span>업무 구분</span><strong>원전산 설계</strong></div>' + (host ? '<div class="carrier-info-row"><span>접속 주소</span><strong>' + esc(host) + '</strong></div>' : '<p class="carrier-info-empty">등록된 연결 주소가 없습니다.</p>');
    }
    return rows.slice(0, 4).map(function (row) { return '<div class="carrier-info-row"><span>' + esc(row[0]) + '</span><strong>' + esc(row[1]) + '</strong></div>'; }).join('');
  }
  function cardHtml(carrier) {
    var favorite = state.favorites.indexOf(carrier.id) >= 0;
    var actions = (carrier.systemUrl ? '<a class="primary" href="' + esc(carrier.systemUrl) + '" target="_blank" rel="noopener noreferrer">원전산 열기 ↗</a>' : '') + (carrier.homepageUrl ? '<a href="' + esc(carrier.homepageUrl) + '" target="_blank" rel="noopener noreferrer">홈페이지 ↗</a>' : '');
    return '<article class="carrier-card"><button type="button" class="carrier-favorite' + (favorite ? ' on' : '') + '" data-favorite="' + esc(carrier.id) + '" aria-label="' + esc(carrier.name) + ' 즐겨찾기" aria-pressed="' + String(favorite) + '">' + (favorite ? '★' : '☆') + '</button><div class="carrier-card-head"><span class="carrier-mark">' + esc(mark(carrier.name)) + '</span><h2>' + esc(carrier.name) + '</h2></div><div class="carrier-info">' + infoRows(carrier) + '</div><div class="carrier-actions">' + (actions || '<span class="carrier-info-empty">연결 URL 확인 중</span>') + '</div></article>';
  }
  function render() {
    var query = state.query.trim().toLocaleLowerCase('ko-KR');
    var rows = state.carriers.filter(function (carrier) { return carrier.type === state.tab && (!query || carrier.name.toLocaleLowerCase('ko-KR').indexOf(query) >= 0); });
    rows.sort(function (a, b) { var af = state.favorites.indexOf(a.id) >= 0 ? 0 : 1, bf = state.favorites.indexOf(b.id) >= 0 ? 0 : 1; return af - bf || a.name.localeCompare(b.name, 'ko'); });
    document.getElementById('carrier-grid').innerHTML = rows.length ? rows.map(cardHtml).join('') : '<div class="carrier-empty">조건에 맞는 보험사가 없습니다.</div>';
    document.getElementById('carrier-count-nonlife').textContent = state.carriers.filter(function (c) { return c.type === 'nonlife'; }).length;
    document.getElementById('carrier-count-life').textContent = state.carriers.filter(function (c) { return c.type === 'life'; }).length;
    document.getElementById('carrier-status').textContent = state.carriers.length ? '' : '등록된 원전산 정보를 찾지 못했습니다.';
    Array.prototype.forEach.call(document.querySelectorAll('[data-carrier-tab]'), function (button) { button.setAttribute('aria-selected', String(button.getAttribute('data-carrier-tab') === state.tab)); });
  }
  function bind() {
    document.getElementById('carrier-search').addEventListener('input', function () { state.query = this.value; render(); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-carrier-tab]'), function (button) { button.addEventListener('click', function () { state.tab = button.getAttribute('data-carrier-tab'); localStorage.setItem('ws_carrier_tab', state.tab); render(); }); });
    document.getElementById('carrier-grid').addEventListener('click', function (event) { var button = event.target.closest('[data-favorite]'); if (!button) return; var id = button.getAttribute('data-favorite'), index = state.favorites.indexOf(id); if (index >= 0) state.favorites.splice(index, 1); else state.favorites.push(id); saveFavorites(); render(); });
  }
  function load() {
    return window.db.fetch('/rest/v1/quick_contents?tab_title=eq.' + encodeURIComponent('원전산 설계 바로가기') + '&select=content_html&limit=1').then(function (response) { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); }).then(function (rows) { state.carriers = mergeSource(rows && rows[0] && rows[0].content_html); render(); }).catch(function () { document.getElementById('carrier-status').textContent = '보험사 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'; });
  }
  function init() {
    if (!authenticated() && !isLocal()) { location.replace('/pages/landing.html?auth=login&redirect=%2Finsubriefing%2Fworkstation%2Fcarriers%2F'); return; }
    if (!allowed()) { location.replace('/insubriefing/workstation/'); return; }
    bind(); load();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
