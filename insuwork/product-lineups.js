(function () {
  'use strict';
  var data = null, loading = null, pool = 'all', selected = '', query = '';
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function visible() {
    if (!data) return [];
    var q = query.trim().toLowerCase();
    return data.companies.filter(function (c) { return (pool === 'all' || c.type === pool) && (!q || c.company.toLowerCase().indexOf(q) >= 0); });
  }
  function countProducts(list) { return list.reduce(function (n, c) { return n + c.products.length; }, 0); }
  function poolButtons() {
    return [['all','전체'],['nonlife','손해'],['life','생명']].map(function (p) {
      return '<button type="button" class="' + (pool === p[0] ? 'on' : '') + '" data-iwpl-pool="' + p[0] + '">' + p[1] + '</button>';
    }).join('');
  }
  function companyList(list) {
    var sections = pool === 'all' ? [['손해보험','nonlife'],['생명보험','life']] : [[pool === 'life' ? '생명보험' : '손해보험', pool]];
    return sections.map(function (s) {
      var rows = list.filter(function (c) { return c.type === s[1]; });
      if (!rows.length) return '';
      return '<div class="iw-nl-grouplabel">' + s[0] + '</div>' + rows.map(function (c) {
        return '<button type="button" class="iw-nl-co' + (selected === c.company ? ' on' : '') + '" data-iwpl-company="' + esc(c.company) + '"><span class="dot"></span><span class="nm">' + esc(c.company) + '</span><span class="cnt">' + c.products.length + '</span></button>';
      }).join('');
    }).join('') || '<div class="iw-empty">검색 결과가 없습니다.</div>';
  }
  function summaryCards(list) {
    return '<div class="iwpl-company-grid">' + list.map(function (c) {
      var groups = []; c.products.forEach(function (p) { if (groups.indexOf(p.group) < 0) groups.push(p.group); });
      return '<button type="button" class="iwpl-company-card" data-iwpl-company="' + esc(c.company) + '"><span class="iw-nl-avatar ' + (c.type === 'life' ? 'l' : 's') + '">' + esc(c.company.replace(/\s/g,'').slice(0,2)) + '</span><span class="iwpl-company-info"><strong>' + esc(c.company) + '</strong><small>' + esc(groups.join(' · ')) + '</small></span><b>' + c.products.length + '개</b><span aria-hidden="true">›</span></button>';
    }).join('') + '</div>';
  }
  function detail(company) {
    var c = data.companies.find(function (x) { return x.company === company; });
    if (!c) return summaryCards(visible());
    return '<div class="iw-nl-cohead"><span class="iw-nl-avatar ' + (c.type === 'life' ? 'l' : 's') + '">' + esc(c.company.replace(/\s/g,'').slice(0,2)) + '</span><div class="info"><h3>' + esc(c.company) + '</h3><div class="sub">' + (c.type === 'life' ? '생명보험' : '손해보험') + ' · 2026년 9월 소식지 기준</div></div><span class="tot">총 <b>' + c.products.length + '</b>개</span></div>' +
      '<div class="iwpl-list">' + c.products.map(function (p) {
        return '<article class="iwpl-item"><span class="iwpl-group">' + esc(p.group) + '</span><div class="iwpl-copy"><h3>' + esc(p.name) + '</h3><p>' + esc(p.point) + '</p></div><div class="iwpl-source">' + esc(c.source) + '<b>p.' + Number(p.page || 1) + '</b></div></article>';
      }).join('') + '</div>';
  }
  function render() {
    var root = document.querySelector('[data-iwpl-root]'); if (!root) return;
    if (!data) { root.innerHTML = '<div class="iw-empty">상품라인업을 불러오는 중입니다…</div>'; return; }
    var list = visible();
    if (selected && !list.some(function (c) { return c.company === selected; })) selected = '';
    root.innerHTML = '<div class="iwpl-head"><div><h2>상품라인업</h2><p>2026년 9월 보험사 소식지에서 확인한 회사별 상품군입니다.</p></div><span>' + data.companies.length + '개사 · ' + countProducts(data.companies) + '개</span></div>' +
      '<div class="iwpl-notice"><b>검토용</b> 상품명과 분류는 첨부 소식지 기준입니다. 판매 여부·가입 조건·보장 내용은 최신 상품설명서와 가입설계로 다시 확인하세요.</div>' +
      '<div class="iw-nl-layout"><aside class="iw-nl-side"><div class="iw-nl-pool">' + poolButtons() + '</div><div class="iw-nl-search"><input data-iwpl-search type="search" placeholder="회사 검색" autocomplete="off" value="' + esc(query) + '"></div><div class="iw-nl-colist">' + companyList(list) + '</div></aside><main class="iw-nl-main"><div class="iwpl-viewbar"><button type="button" class="' + (!selected ? 'on' : '') + '" data-iwpl-all>전체 회사</button><span>' + list.length + '개사 · ' + countProducts(list) + '개 상품</span></div>' + detail(selected) + '</main></div>';
    bind(root);
  }
  function bind(root) {
    root.querySelectorAll('[data-iwpl-pool]').forEach(function (b) { b.onclick = function () { pool = b.getAttribute('data-iwpl-pool'); selected = ''; render(); }; });
    root.querySelectorAll('[data-iwpl-company]').forEach(function (b) { b.onclick = function () { selected = b.getAttribute('data-iwpl-company'); render(); }; });
    var all = root.querySelector('[data-iwpl-all]'); if (all) all.onclick = function () { selected = ''; render(); };
    var search = root.querySelector('[data-iwpl-search]'); if (search) search.oninput = function () { query = search.value; selected = ''; render(); var n = document.querySelector('[data-iwpl-search]'); if (n) { n.focus(); n.setSelectionRange(n.value.length,n.value.length); } };
  }
  function mount() {
    if (!document.querySelector('[data-iwpl-root]')) return;
    if (data) { render(); return; }
    if (!loading) loading = fetch('/insuwork/product-lineups/data/2026-09.json?v=20260901a').then(function (r) { if (!r.ok) throw new Error('상품라인업 데이터 오류'); return r.json(); }).then(function (v) { data = v; }).catch(function () { data = {companies:[]}; });
    loading.then(render);
  }
  window.OSInsuworkProductLineups = { sectionHtml: function () { return '<section class="iwpl" data-iwpl-root><div class="iw-empty">상품라인업을 불러오는 중입니다…</div></section>'; }, mount: mount };
})();
