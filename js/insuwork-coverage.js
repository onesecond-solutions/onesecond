(function () {
  'use strict';

  var drafts = {};
  var coverageFilters = {};
  function coverageFilter(customerId) {
    return coverageFilters[customerId] || (coverageFilters[customerId] = { open: false, sections: [] });
  }
  function filterHtml(customerId, record) {
    var filter = coverageFilter(customerId);
    if (!filter.open) return '';
    var sections = Array.from(new Set(record.rows.map(function (row) { return row.section || ''; })));
    return '<div class="iw-ca-filters" role="group" aria-label="담보 대분류 현황">' + [null].concat(sections).map(function (section) {
      return '<button type="button" class="iw-btn' + ((section === null ? !filter.sections.length : filter.sections.indexOf(section) >= 0) ? ' primary' : '') + '" aria-pressed="' + ((section === null ? !filter.sections.length : filter.sections.indexOf(section) >= 0)) + '" data-section="' + esc(section || '') + '" onclick="OSInsuworkCoverage.filterSection(\'' + esc(customerId) + '\',' + (section === null ? 'null' : 'this.dataset.section') + ')">' + esc(section === null ? '전체현황' : section || '미분류') + '</button>';
    }).join('') + '</div>';
  }
  var saveStates = {};
  var importBusy = false;
  function showImportProgress(message) {
    var root = document.querySelector('#v-insuwork');
    if (!root) return;
    var dialog = root.querySelector('.iw-ca-import-progress');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'iw-ca-import-progress';
      dialog.setAttribute('aria-labelledby', 'iw-ca-import-title');
      dialog.innerHTML = '<div class="iw-ca-import-spinner" aria-hidden="true"></div><h3 id="iw-ca-import-title">보장분석 중</h3><p role="status" aria-live="polite"></p><small>파일 크기에 따라 시간이 걸릴 수 있습니다. 잠시만 기다려 주세요.</small>';
      dialog.addEventListener('cancel', function (event) { event.preventDefault(); });
      root.appendChild(dialog);
      dialog.showModal();
    }
    dialog.querySelector('p').textContent = message;
  }
  function hideImportProgress() {
    var dialog = document.querySelector('#v-insuwork .iw-ca-import-progress');
    if (dialog) { dialog.close(); dialog.remove(); }
  }
  var workspaceExpanded = false;
  function syncWorkspaceExpanded() {
    var panel = panelFor(WORKSPACE_KEY), section = panel && panel.closest('.iw-coverage-analysis');
    if (!section) return;
    section.classList.toggle('iw-ca-fullscreen', workspaceExpanded);
    var button = section.querySelector('.iw-ca-fullscreen-toggle');
    if (button) { button.textContent = workspaceExpanded ? '원래 화면으로' : '전체 화면 보기'; button.setAttribute('aria-pressed', String(workspaceExpanded)); }
    if (section.showPopover) {
      if (workspaceExpanded) { section.setAttribute('popover', 'manual'); if (!section.matches(':popover-open')) section.showPopover(); }
      else { if (section.matches(':popover-open')) section.hidePopover(); section.removeAttribute('popover'); }
    }
  }
  function toggleWorkspaceExpanded() {
    var view = captureView(WORKSPACE_KEY);
    workspaceExpanded = !workspaceExpanded;
    syncWorkspaceExpanded();
    restoreView(WORKSPACE_KEY, view);
    var panel = panelFor(WORKSPACE_KEY), button = panel && panel.closest('.iw-coverage-analysis').querySelector('.iw-ca-fullscreen-toggle');
    if (button) button.focus({ preventScroll: true });
  }
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && importBusy) { event.preventDefault(); event.stopImmediatePropagation(); return; }
    if (event.key === 'Escape' && workspaceExpanded && panelFor(WORKSPACE_KEY)) { event.preventDefault(); event.stopImmediatePropagation(); toggleWorkspaceExpanded(); }
  }, true);
  var sheetJsPromise = null;
  var pdfJsPromise = null;
  var officeCryptoPromise = null;
  var coverageSynonymsPromise = null;
  var coverageSynonymExactIndex = {};

  function esc(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]; }); }
  function uid(prefix) { return (prefix || 'id') + '-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)); }
  function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
  function blankRecord() { return { version: 1, source: null, showSummary: false, showHiddenProducts: false, products: [], rows: [], updatedAt: '' }; }
  function workspaceStarter() {
    var rows = ['실손', '암', '뇌', '심장', '수술비', '배상책임', '운전자'].map(function (section) { return { id: uid('coverage'), section: section, group: '', name: '', recommended: '', status: '', total: '', difference: '', values: {}, hidden: false, selected: false }; });
    rows.splice(1, 1,
      { id: uid('coverage'), section: '암', group: '진단비', name: '일반암 진단비', values: {}, hidden: false, selected: false },
      { id: uid('coverage'), section: '암', group: '치료비1', name: '항암방사선약물치료비', values: {}, hidden: false, selected: false },
      { id: uid('coverage'), section: '암', group: '치료비1', name: '암수술비', values: {}, hidden: false, selected: false },
      { id: uid('coverage'), section: '암', group: '치료비2', name: '로봇암수술비', values: {}, hidden: false, selected: false },
      { id: uid('coverage'), section: '암', group: '치료비3', name: '암주요 치료비(급여 비급여 포함)', values: {}, hidden: false, selected: false }
    );
    return { version: 1, source: null, showSummary: false, showHiddenProducts: false, products: [], rows: rows, updatedAt: '', _starter: true };
  }
  function cancerMiddleGroup(name) {
    var text = String(name || '').replace(/\s+/g, '');
    if (!text) return '';
    if (/암주요치료비/.test(text)) return '치료비3';
    if (/로봇암수술비|표적항암약물치료비|양성자방사선치료비|세기조절방사선치료비|카티.*항암약물치료비|중입자방사선치료비/.test(text)) return '치료비2';
    if (/항암(?:방사선.*약물|약물.*방사선)치료비|암수술비/.test(text)) return '치료비1';
    if (/암.*진단|유사암.*진단/.test(text)) return '진단비';
    return '';
  }
  function isSilson(section) { return /실손|실비/.test(String(section || '')); }
  function flatSection() { return false; }
  function silsonGeneration(value) {
    // Verified standalone Hyundai Hi2307 policy; general insurance version codes are not evidence.
    if (/실손의료비보장보험.*Hi2307/i.test(String(value || ''))) return '4세대 실손';
    var matches = String(value || '').match(/[1-5]\s*세대/g) || [];
    var numbers = Array.from(new Set(matches.map(function (v) { return v.replace(/\s/g, ''); })));
    return numbers.length === 1 ? numbers[0] + ' 실손' : '세대 확인';
  }
  function silsonName(value) {
    var name = String(value || ''), key = name.replace(/\s/g, '');
    var names = {
      '질병실손비': '질병실손의료비', '상해실손비': '상해실손의료비',
      '질병입원의료비': '질병 입원 의료비', '상해입원의료비': '상해 입원 의료비',
      '질병통원의료비': '질병 통원 의료비', '상해통원의료비': '상해 통원 의료비',
      '비급여도수,체외충격파,증식치료(실손)': '비급여 도수·체외충격파·증식치료',
      '비급여도수·체외충격파·증식치료': '비급여 도수·체외충격파·증식치료',
      '비급여주사료(실손)': '비급여 주사료', '비급여주사료': '비급여 주사료',
      '비급여MRI,MRA(실손)': '비급여 MRI·MRA', '비급여MRI·MRA': '비급여 MRI·MRA'
    };
    if (names[key]) return names[key];
    var combined = key.match(/^(질병|상해)(?:실손)?의료비\(입원[·ㆍ,\/]통원\)$/);
    if (combined) return combined[1] + ' 의료비(입원·통원)';
    var benefit = key.match(/^(질병|상해)(급여|비급여|중증비급여|비중증비급여)(?:실손)?의료비$/);
    if (benefit) return benefit[1] + ' ' + benefit[2].replace('중증비급여', '중증 비급여') + ' 의료비';
    return name;
  }
  function normalizeSilsonRows(rows, products) {
    return rows.flatMap(function (row) {
      if (!isSilson(row.section)) return [row];
      var original = row.name, standard = silsonName(original);
      if (standard !== original) { row.sourceNames = Array.from(new Set((row.sourceNames || []).concat(original))); row.name = standard; }
      var generation = silsonGeneration(row.group);
      if (generation === '세대 확인') generation = silsonGeneration(row.section + ' ' + row.name);
      row.section = '실손';
      var buckets = {};
      products.forEach(function (product) {
        var value = row.values[product.id];
        if (!hasEnrolledAmount(value)) return;
        var productGeneration = silsonGeneration(product.generation || product.product);
        var group = productGeneration !== '세대 확인' ? productGeneration : generation;
        if (!buckets[group]) buckets[group] = {};
        buckets[group][product.id] = value;
      });
      var groups = Object.keys(buckets);
      if (groups.length <= 1) { row.group = groups[0] || generation; return [row]; }
      return groups.map(function (group, index) {
        var split = clone(row); split.id = index ? row.id + '-silson-' + group.charAt(0) : row.id;
        split.group = group; split.values = buckets[group]; split.sourceTotal = row.total; split.total = ''; return split;
      });
    });
  }
  function sectionOrder(section) {
    var text = String(section || '').replace(/\s+/g, '');
    var patterns = [/실손/, /^암$/, /뇌/, /심장/, /수술/, /배상책임/, /운전자/];
    for (var i = 0; i < patterns.length; i++) if (patterns[i].test(text)) return i;
    return patterns.length;
  }
  function normalize(record) {
    var next = Object.assign(blankRecord(), clone(record));
    next.products = (next.products || []).map(function (p) { return Object.assign({ id: uid('product'), company: '', product: '', renewal: '', premium: '', payment: '', hidden: false }, p); });
    next.rows = (next.rows || []).map(function (r) { var row = Object.assign({ id: uid('coverage'), section: '', group: '', name: '', recommended: '', status: '', total: '', difference: '', values: {}, hidden: false, selected: false }, r); if (row.section === '운전') row.section = '운전자'; if (row.section === '암') { var cancerGroup = cancerMiddleGroup(row.name); if (cancerGroup) row.group = cancerGroup; else if (/^치료비\s*[123]$/.test(row.group)) row.group = row.group.replace(/\s+/g, ''); } return row; });
    next.rows = normalizeSilsonRows(next.rows, next.products);
    var cancerPositions = [], cancerRows = [], cancerOrder = { '진단비': 0, '치료비1': 1, '치료비2': 2, '치료비3': 3 };
    next.rows.forEach(function (row, index) { if (row.section === '암') { cancerPositions.push(index); cancerRows.push(row); } });
    cancerRows.sort(function (a, b) { return (Object.prototype.hasOwnProperty.call(cancerOrder, a.group) ? cancerOrder[a.group] : 99) - (Object.prototype.hasOwnProperty.call(cancerOrder, b.group) ? cancerOrder[b.group] : 99); });
    cancerPositions.forEach(function (position, index) { next.rows[position] = cancerRows[index]; });
    next.rows = next.rows.map(function (row, index) { return { row: row, index: index }; }).sort(function (a, b) { return sectionOrder(a.row.section) - sectionOrder(b.row.section) || (isSilson(a.row.section) && isSilson(b.row.section) ? (parseInt(a.row.group, 10) || 9) - (parseInt(b.row.group, 10) || 9) : 0) || a.index - b.index; }).map(function (item) { return item.row; });
    return next;
  }
  function draft(customerId, record) {
    var key = String(customerId || '');
    if (!drafts[key]) drafts[key] = normalize(record);
    else if (record && (drafts[key]._starter || drafts[key]._templateSeed) && !record._starter) drafts[key] = normalize(record);
    return drafts[key];
  }
  function reset(customerId, record) { drafts[String(customerId || '')] = normalize(record); }
  function api() { return window.OSInsuwork || {}; }
  function panelFor(customerId) { return Array.from(document.querySelectorAll('#v-insuwork .iw-ca-panel')).find(function (panel) { return String(panel.getAttribute('data-customer-id') || '') === String(customerId || ''); }) || null; }
  function captureView(customerId) { var main = document.querySelector('#v-insuwork .iw-main'), panel = panelFor(customerId), wrap = panel && panel.querySelector('.iw-ca-table-wrap'); return { mainTop: main ? main.scrollTop : 0, mainLeft: main ? main.scrollLeft : 0, tableTop: wrap ? wrap.scrollTop : 0, tableLeft: wrap ? wrap.scrollLeft : 0 }; }
  function restoreView(customerId, view, revealIndex) { requestAnimationFrame(function () { var main = document.querySelector('#v-insuwork .iw-main'), panel = panelFor(customerId), wrap = panel && panel.querySelector('.iw-ca-table-wrap'); if (main) { main.scrollTop = view.mainTop; main.scrollLeft = view.mainLeft; } if (wrap) { wrap.scrollTop = view.tableTop; wrap.scrollLeft = view.tableLeft; } if (wrap && revealIndex != null) { var row = wrap.querySelectorAll('tbody tr')[revealIndex]; if (row) { var top = row.offsetTop, bottom = top + row.offsetHeight; if (top < wrap.scrollTop) wrap.scrollTop = top; else if (bottom > wrap.scrollTop + wrap.clientHeight) wrap.scrollTop = bottom - wrap.clientHeight; var input = row.querySelector('.iw-ca-name-cell textarea'); if (input) try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); } } } }); }
  function rerender(customerId, revealIndex) { var view = captureView(customerId); if (customerId === WORKSPACE_KEY && api().rerenderCoverageWorkspace) api().rerenderCoverageWorkspace(); else if (api().rerenderCoverageAnalysis) api().rerenderCoverageAnalysis(customerId); restoreView(customerId, view, revealIndex); }
  var WORKSPACE_KEY = '__coverage_workspace__';
  function rerenderTarget(customerId) { if (customerId === WORKSPACE_KEY && api().rerenderCoverageWorkspace) api().rerenderCoverageWorkspace(); else rerender(customerId); }
  function saveTarget(customerId, record, file) { return customerId === WORKSPACE_KEY ? api().saveCoverageWorkspaceDraft(record, file) : api().saveCoverageAnalysis(customerId, record, file); }
  function setSaveState(customerId, tone, message) {
    var key = String(customerId || '');
    saveStates[key] = { tone: tone || '', message: message || '' };
    var panel = panelFor(customerId);
    if (!panel) return;
    var status = panel.querySelector('.iw-ca-save-status');
    if (status) { status.className = 'iw-ca-save-status' + (tone ? ' is-' + tone : ''); status.textContent = message || ''; }
    panel.querySelectorAll('[data-ca-save]').forEach(function (button) {
      button.disabled = tone === 'saving';
      if (!button.dataset.defaultLabel) button.dataset.defaultLabel = button.textContent;
      button.textContent = tone === 'saving' && button.dataset.caSave === 'template' ? '저장 중…' : button.dataset.defaultLabel;
    });
  }
  function saveStatusHtml(customerId) {
    var state = saveStates[String(customerId || '')] || {};
    return '<span class="iw-ca-save-status' + (state.tone ? ' is-' + esc(state.tone) : '') + '" role="status" aria-live="polite">' + esc(state.message || '') + '</span>';
  }
  function setPath(customerId, kind, id, key, value) {
    var d = draft(customerId), rows = kind === 'product' ? d.products : d.rows;
    var target = rows.find(function (entry) { return String(entry.id) === String(id); });
    if (target) target[key] = value;
  }
  function loadScript(src, ready) {
    if (ready()) return Promise.resolve();
    return new Promise(function (resolve, reject) { var s = document.createElement('script'); s.src = src; s.onload = resolve; s.onerror = function () { reject(new Error('분석 모듈을 불러오지 못했습니다.')); }; document.head.appendChild(s); });
  }
  function loadSheetJs() { if (!sheetJsPromise) sheetJsPromise = loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', function () { return !!window.XLSX; }); return sheetJsPromise; }
  function loadOfficeCrypto() { if (!officeCryptoPromise) officeCryptoPromise = loadScript('/js/vendor/officecrypto.min.js?v=20260912multifile1', function () { return !!window.OSOfficeCrypto; }); return officeCryptoPromise; }
  function synonymExactKey(value) { return String(value || '').toLowerCase().replace(/[\s·ㆍ,._()\-\/]/g, ''); }
  function loadCoverageSynonyms() {
    if (!coverageSynonymsPromise) coverageSynonymsPromise = fetch('/data/coverage_synonyms.json?v=20260912multifile1', { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('담보명 동의어 사전을 불러오지 못했습니다.');
      return response.json();
    }).then(function (data) {
      var exactIndex = {};
      (data.entries || []).forEach(function (entry) {
        [entry.canonical].concat(entry.aliases || []).forEach(function (name) {
          var exactKey = synonymExactKey(name);
          if (exactKey && !exactIndex[exactKey]) exactIndex[exactKey] = entry;
        });
      });
      coverageSynonymExactIndex = exactIndex;
      return data;
    }).catch(function (error) {
      coverageSynonymExactIndex = {};
      console.warn('[coverage-synonyms]', error);
      return null;
    });
    return coverageSynonymsPromise;
  }
  // Parentheses contain benefit scope (대인/대물, 지급률, 지급일수), not decoration.
  function coverageSynonym(value) { return coverageSynonymExactIndex[synonymExactKey(value)] || null; }
  function coverageMatchKey(value) {
    var entry = coverageSynonym(value), name = entry ? entry.canonical : silsonName(value);
    return synonymExactKey(name).replace(/진단$/, '진단비').replace(/사망보험금$/, '사망');
  }
  function loadPdfJs() {
    if (!pdfJsPromise) pdfJsPromise = loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', function () { return !!window.pdfjsLib; }).then(function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; });
    return pdfJsPromise;
  }
  function cellText(value) { if (value == null) return ''; if (value instanceof Date) return value.toISOString().slice(0, 10); return String(value).trim(); }
  function sectionName(value) {
    var raw = cellText(value).replace(/\n/g, ' ').trim(), key = raw.replace(/\s+/g, '');
    if (!key) return '';
    if (/실손|실비/.test(key)) return '실손';
    if (/^암|암진단/.test(key)) return '암';
    if (/뇌/.test(key)) return '뇌';
    if (/심장|허혈|급성심근/.test(key)) return '심장';
    if (/입원/.test(key)) return '입원';
    if (/수술/.test(key)) return '수술비';
    if (/배상|화재생활/.test(key)) return '배상책임';
    if (/운전|교통사고/.test(key)) return '운전자';
    return raw;
  }
  function makeProduct(company, product, premium, renewal, sourceColumn) { return { id: uid('product'), company: cellText(company), product: cellText(product), renewal: cellText(renewal), premium: cellText(premium), payment: '', hidden: false, sourceColumn: sourceColumn }; }
  function makeRecord(fileName, type, products, rows) { products.forEach(function (p) { delete p.sourceColumn; }); return { version: 1, source: { name: fileName, type: type, importedAt: new Date().toISOString(), needsReview: true }, showSummary: false, showHiddenProducts: false, products: products, rows: rows, updatedAt: new Date().toISOString() }; }
  function hasEnrolledAmount(value) { return !/^(?:|[-–—]|없음|미가입|미보유|0+(?:\.0+)?(?:원|만원|만)?)$/.test(cellText(value).replace(/[\s,]/g, '')); }
  function parseBanksaladWorkbook(workbook, fileName) {
    for (var si = 0; si < workbook.SheetNames.length; si++) {
      var grid = window.XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[si]], { header: 1, defval: '', raw: false });
      var headerIndex = grid.findIndex(function (row) { return cellText(row[0]) === '보장구분' && /주요특약/.test(cellText(row[1])); });
      if (headerIndex < 0) continue;
      var header = grid[headerIndex].map(function (v) { return cellText(v).replace(/\s/g, ''); });
      var kakao = header[2] === '추천금액' && header[3] === '상태';
      if (!kakao && !(header[2] === '보장상태' && headerIndex >= 2)) continue;
      var products = [], width = Math.max.apply(null, grid.map(function (row) { return row.length; }));
      for (var c = 6; c < width; c++) {
        var company = cellText((grid[kakao ? headerIndex : headerIndex - 2] || [])[c]);
        var product = cellText((grid[kakao ? headerIndex + 1 : headerIndex] || [])[c]);
        var premium = cellText((grid[kakao ? headerIndex + 3 : headerIndex - 1] || [])[c]);
        var renewal = kakao ? cellText((grid[headerIndex + 2] || [])[c]) : '';
        if (company || product) products.push(makeProduct(company, product, premium, renewal, c));
      }
      var currentSection = '', rows = [];
      for (var r = headerIndex + (kakao ? 4 : 1); r < grid.length; r++) {
        var source = grid[r] || [], suppliedSection = cellText(source[0]), name = cellText(source[1]);
        if (suppliedSection) currentSection = sectionName(suppliedSection);
        if (!name || /^(보험료|합계|안내|추가 코멘트)/.test(name)) continue;
        var values = {}; products.forEach(function (p) { values[p.id] = cellText(source[p.sourceColumn]); });
        rows.push({ id: uid('coverage'), section: currentSection, group: '', name: name, recommended: cellText(source[kakao ? 2 : 3]), status: cellText(source[kakao ? 3 : 2]), total: cellText(source[4]), difference: cellText(source[5]), values: values, hidden: false, selected: false });
      }
      return makeRecord(fileName, 'xlsx', products, rows);
    }
    return null;
  }
  function parseBomappWorkbook(workbook, fileName) {
    var sheetName = workbook.SheetNames.find(function (name) { return /상품별.*보장/.test(name); });
    if (!sheetName) return null;
    var grid = window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', raw: false });
    var headerIndex = grid.findIndex(function (row) { return cellText(row[0]) === '구분' && /보장명/.test(cellText(row[1])); });
    var productRow = grid.findIndex(function (row) { return /보험사.*상품/.test(cellText(row[1])); });
    if (headerIndex < 0 || productRow < 0) return null;
    var detailName = workbook.SheetNames.find(function (name) { return /보험.*현황/.test(name); }), companyByProduct = {};
    if (detailName) {
      var detail = window.XLSX.utils.sheet_to_json(workbook.Sheets[detailName], { header: 1, defval: '', raw: false }), detailHeader = detail.findIndex(function (row) { return cellText(row[0]) === '보험사' && cellText(row[1]) === '상품명'; });
      if (detailHeader >= 0) for (var di = detailHeader + 1; di < detail.length; di++) if (cellText(detail[di][1])) companyByProduct[matchKey(detail[di][1])] = cellText(detail[di][0]);
    }
    var products = [];
    for (var c = 4; c < (grid[productRow] || []).length; c++) { var product = cellText(grid[productRow][c]); if (product) products.push(makeProduct(companyByProduct[matchKey(product)] || '', product, cellText(grid[productRow + 4] && grid[productRow + 4][c]), '', c)); }
    var rows = [], currentSection = '';
    for (var r = headerIndex + 1; r < grid.length; r++) {
      var source = grid[r] || [], suppliedSection = cellText(source[0]), name = cellText(source[1]);
      if (suppliedSection) currentSection = sectionName(suppliedSection);
      if (!name || /^\*/.test(name)) continue;
      var values = {}; products.forEach(function (p) { values[p.id] = cellText(source[p.sourceColumn]); });
      rows.push({ id: uid('coverage'), section: currentSection, group: '', name: name, recommended: '', status: '', total: cellText(source[2]), difference: '', values: values, hidden: false, selected: false });
    }
    return makeRecord(fileName, 'xlsx', products, rows);
  }
  function parseWorkbook(buffer, fileName) {
    var workbook = window.XLSX.read(buffer, { type: 'array', cellDates: true });
    var specialized = parseBanksaladWorkbook(workbook, fileName) || parseBomappWorkbook(workbook, fileName);
    if (specialized) return specialized;
    var sheet = workbook.Sheets[workbook.SheetNames[0]];
    var grid = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    var headerIndex = grid.findIndex(function (row) { var joined = row.map(cellText).join('|'); return (joined.indexOf('보장구분') >= 0 || joined.indexOf('대분류') >= 0) && (joined.indexOf('주요특약') >= 0 || joined.indexOf('담보') >= 0); });
    if (headerIndex < 0) throw new Error('대분류와 담보 열을 찾지 못했습니다. 보장분석 엑셀 형식을 확인해 주세요.');
    var header = grid[headerIndex].map(cellText), known = ['보장구분', '대분류', '중분류', '주요특약', '담보', '추천금액', '상태', '가입금액', '총가입금액', '합계금액', '차이'];
    var sectionColumn = header.findIndex(function (value) { return value === '대분류' || value === '보장구분'; });
    var groupColumn = header.indexOf('중분류');
    var nameColumn = header.findIndex(function (value) { return value === '담보' || value === '주요특약'; });
    var totalColumn = header.findIndex(function (value) { return value === '합계금액' || value === '총가입금액' || value === '가입금액'; });
    var productStart = header.findIndex(function (value, index) { return index > nameColumn && known.indexOf(value) < 0 && value !== ''; });
    if (productStart < 0) productStart = Math.min(6, header.length);
    var products = [];
    for (var c = productStart; c < header.length; c++) {
      var company = cellText(grid[headerIndex] && grid[headerIndex][c]), product = cellText(grid[headerIndex + 1] && grid[headerIndex + 1][c]);
      var renewal = cellText(grid[headerIndex + 2] && grid[headerIndex + 2][c]), premium = cellText(grid[headerIndex + 3] && grid[headerIndex + 3][c]);
      var hasValues = grid.slice(headerIndex + 1).some(function (row) { return cellText(row[c]) !== ''; });
      if (company || product || hasValues) products.push({ id: uid('product'), company: company, product: product, renewal: renewal, premium: premium, payment: '', hidden: false, sourceColumn: c });
    }
    var section = '', rows = [];
    for (var r = headerIndex + 5; r < grid.length; r++) {
      var row = grid[r] || [], first = cellText(row[sectionColumn]), group = groupColumn >= 0 ? cellText(row[groupColumn]) : '', name = cellText(row[nameColumn]);
      if (first) section = first;
      if (!section && !name) continue;
      var values = {}, hasProductValue = false;
      products.forEach(function (p) { var value = cellText(row[p.sourceColumn]); values[p.id] = value; if (value) hasProductValue = true; });
      if (!name && !hasProductValue) continue;
      rows.push({ id: uid('coverage'), section: section, group: group, name: name, recommended: '', status: '', total: totalColumn >= 0 ? cellText(row[totalColumn]) : '', difference: '', values: values, hidden: false, selected: false });
    }
    products.forEach(function (p) { delete p.sourceColumn; });
    return makeRecord(fileName, 'xlsx', products, rows);
  }
  function parsePdfItems(pages, fileName) {
    var lines = [];
    pages.forEach(function (items) {
      var buckets = {};
      items.forEach(function (item) { var y = Math.round((item.transform && item.transform[5]) || 0); (buckets[y] || (buckets[y] = [])).push(item); });
      Object.keys(buckets).sort(function (a, b) { return Number(b) - Number(a); }).forEach(function (y) { lines.push(buckets[y].sort(function (a, b) { return ((a.transform && a.transform[4]) || 0) - ((b.transform && b.transform[4]) || 0); }).map(function (i) { return i.str; }).join(' ').trim()); });
    });
    var sections = ['암', '뇌', '뇌혈관', '심장', '실손', '치아', '운전', '재산', '사망', '수술', '입원', '장애', '간병', '치매', '일상', '진단'];
    var section = '', rows = [];
    lines.filter(Boolean).forEach(function (line) {
      var found = sections.find(function (s) { return line === s || line.indexOf(s + ' ') === 0; });
      if (found && line.length < 15) { section = found; return; }
      if (!section || line.length < 2 || /^(페이지|고객|보험료|보험회사|상품명)/.test(line)) return;
      var amounts = line.match(/(?:MAX\s*)?[\d,]+(?:만원|천원|원)?/gi) || [];
      if (!amounts.length && !/(진단비|치료비|수술비|입원|후유장해|배상|사망|간병)/.test(line)) return;
      rows.push({ id: uid('coverage'), section: section, group: '', name: line.replace(/(?:MAX\s*)?[\d,]+(?:만원|천원|원)?/gi, '').trim().slice(0, 120), recommended: '', status: '', total: amounts[0] || '', difference: '', values: {}, hidden: false, selected: false });
    });
    if (!rows.length) throw new Error('PDF에서 표를 자동 인식하지 못했습니다. 스캔 PDF라면 OCR 처리 후 직접 행을 추가해 주세요.');
    return { version: 1, source: { name: fileName, type: 'pdf', importedAt: new Date().toISOString(), needsReview: true }, showSummary: false, showHiddenProducts: false, products: [], rows: rows, updatedAt: new Date().toISOString() };
  }
  function matchKey(value) {
    var key = String(value || '').toLowerCase().replace(/[\s·ㆍ,._()\-\/]/g, '').replace(/질환/g, '').replace(/의료비/g, '실손비').replace(/일반암진단비|암진단비(?:ⅱ|ii)?유사암제외/g, '일반암진단').replace(/소액유사암/g, '유사암').replace(/항암약물방사선/g, '항암방사선약물').replace(/허가치료/g, '치료').replace(/암수술비/g, '암수술');
    return key;
  }
  function amountKey(value) {
    var text = cellText(value).replace(/[\s,]/g, '').replace(/원$/, '');
    if (/^(?:\d+(?:\.\d+)?억)?(?:\d+(?:\.\d+)?만)?(?:\d+(?:\.\d+)?)?$/.test(text) && text) {
      var total = 0; text = text.replace(/([\d.]+)억/, function (_, n) { total += Number(n) * 100000000; return ''; }).replace(/([\d.]+)만/, function (_, n) { total += Number(n) * 10000; return ''; });
      return String(total + Number(text || 0));
    }
    return text;
  }
  function mergeAmount(row, field, previous, incoming, source) {
    if (!hasEnrolledAmount(previous)) return cellText(incoming) || cellText(previous);
    if (!hasEnrolledAmount(incoming) || amountKey(previous) === amountKey(incoming)) return previous;
    row.importConflicts = row.importConflicts || [];
    var conflict = { field: field, kept: previous, incoming: incoming, source: source && source.name || '' };
    if (!row.importConflicts.some(function (item) { return JSON.stringify(item) === JSON.stringify(conflict); })) row.importConflicts.push(conflict);
    return previous;
  }
  function conflictText(row) { return (row.importConflicts || []).map(function (item) { return '금액 확인: ' + item.kept + ' / 원본 ' + item.incoming + ' (' + item.source + ')'; }).join(' · '); }
  function productMatchKey(value) { return synonymExactKey(value).replace(/^(?:무배당|무)/, ''); }
  function mergeImportedRecord(baseRecord, importedRecord) {
    var base = normalize(baseRecord), imported = normalize(importedRecord), productIds = {}, productOccurrences = {}, usedRows = new Set();
    function templateSection(section, name) {
      var present = new Set(base.rows.map(function (r) { return r.section; }));
      if (/^(치매[·\s]?간병|간병)$/.test(section)) {
        if (/요양/.test(name)) return present.has('장기요양') ? '장기요양' : section;
        if (/치매/.test(name)) return present.has('치매') ? '치매' : section;
        if (present.has('간병인')) return '간병인';
      }
      if (present.has(section)) return section;
      var aliases = { '장애': ['장해', '후유장해'], '후유장해': ['장해'], '장해': ['후유장해'], '간병': ['간병인'], '진단': ['기타질환'], '배상책임': ['일상'] };
      if (section === '치매·간병') return /요양/.test(name) ? '장기요양' : /치매/.test(name) ? '치매' : present.has('간병인') ? '간병인' : section;
      return (aliases[section] || []).find(function (s) { return present.has(s); }) || section;
    }
    imported.products.forEach(function (incoming) {
      var key = productMatchKey(incoming.company) + '|' + productMatchKey(incoming.product), occurrence = productOccurrences[key] || 0, matches = key === '|' ? [] : base.products.filter(function (product) { return productMatchKey(product.company) + '|' + productMatchKey(product.product) === key; }), existing = matches[occurrence] || null;
      productOccurrences[key] = occurrence + 1;
      if (!existing && incoming.product) {
        var partialMatches = base.products.filter(function (product) { return productMatchKey(product.product) === productMatchKey(incoming.product) && (!product.company || !incoming.company); });
        if (partialMatches.length === 1 && occurrence === 0) existing = partialMatches[0];
      }
      if (!existing) { existing = clone(incoming); existing.id = uid('product'); base.products.push(existing); }
      else { ['company', 'product', 'renewal', 'premium', 'payment', 'generation'].forEach(function (field) { if (!existing[field] && incoming[field]) existing[field] = incoming[field]; }); }
      productIds[incoming.id] = existing.id;
    });
    imported.rows.forEach(function (incoming) {
      var synonym = coverageSynonym(incoming.name), targetSection = templateSection(synonym && synonym.section || incoming.section, incoming.name), nameKey = coverageMatchKey(incoming.name);
      var candidates = nameKey ? base.rows.filter(function (row) { return !usedRows.has(row.id) && coverageMatchKey(row.name) === nameKey && (!isSilson(targetSection) || (isSilson(row.section) && (row.group === incoming.group || (row.group === '세대 확인' && !hasEnrolledAmount(row.total) && !Object.values(row.values).some(hasEnrolledAmount))))); }) : [];
      var existing = candidates.find(function (row) { return matchKey(row.section) === matchKey(targetSection); }) || (candidates.length === 1 ? candidates[0] : null);
      if (!existing && isSilson(targetSection) && incoming.group === '세대 확인') {
        var sameContractRows = base.rows.filter(function (row) { return !usedRows.has(row.id) && isSilson(row.section) && coverageMatchKey(row.name) === nameKey && Object.keys(incoming.values).some(function (id) { return hasEnrolledAmount(incoming.values[id]) && hasEnrolledAmount(row.values[productIds[id]]); }); });
        if (sameContractRows.length === 1) existing = sameContractRows[0];
      }
      if (!existing && !hasEnrolledAmount(incoming.total) && !Object.values(incoming.values || {}).some(hasEnrolledAmount)) return;
      if (!existing) {
        existing = clone(incoming); existing.id = uid('coverage'); existing.values = {}; existing.selected = false; existing.hidden = false;
        existing.section = targetSection;
        if (synonym) { existing.name = synonym.canonical; existing.group = synonym.group || existing.group; existing.sourceNames = Array.from(new Set((incoming.sourceNames || []).concat(incoming.name))); }
        var lastSectionIndex = -1; base.rows.forEach(function (row, index) { if (matchKey(row.section) === matchKey(existing.section)) lastSectionIndex = index; });
        base.rows.splice(lastSectionIndex >= 0 ? lastSectionIndex + 1 : base.rows.length, 0, existing);
      } else if (incoming.name && synonymExactKey(incoming.name) !== synonymExactKey(existing.name)) {
        existing.sourceNames = Array.isArray(existing.sourceNames) ? existing.sourceNames : [];
        if (existing.sourceNames.indexOf(incoming.name) < 0) existing.sourceNames.push(incoming.name);
      }
      if (isSilson(targetSection) && incoming.group !== '세대 확인') existing.group = incoming.group;
      usedRows.add(existing.id);
      existing.total = mergeAmount(existing, 'total', existing.total, incoming.total, imported.source);
      if (incoming.recommended !== '') existing.recommended = incoming.recommended;
      if (incoming.status !== '') existing.status = incoming.status;
      if (incoming.difference !== '') existing.difference = incoming.difference;
      Object.keys(incoming.values || {}).forEach(function (incomingProductId) { var targetProductId = productIds[incomingProductId]; if (targetProductId && incoming.values[incomingProductId] !== '') existing.values[targetProductId] = mergeAmount(existing, targetProductId, existing.values[targetProductId], incoming.values[incomingProductId], imported.source); });
    });
    base.source = clone(imported.source); base.updatedAt = new Date().toISOString(); delete base._starter; return normalize(base);
  }
  function isEncryptedOffice(buffer) { var b = new Uint8Array(buffer); return b.length > 8 && b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0; }
  function decryptWorkbook(buffer, fileName) {
    if (!isEncryptedOffice(buffer)) return Promise.resolve(buffer);
    var password = window.prompt(fileName + '\n파일 비밀번호를 입력해 주세요. 비밀번호는 저장되지 않습니다.');
    if (password == null || password === '') return Promise.reject(new Error('암호화 엑셀을 열려면 비밀번호가 필요합니다.'));
    return loadOfficeCrypto().then(function () { return window.OSOfficeCrypto.decrypt(window.Buffer.from(new Uint8Array(buffer)), { password: password }); }).then(function (output) { return new Uint8Array(output).buffer; }).catch(function (error) { if (/password|incorrect/i.test(error && error.message || '')) throw new Error('엑셀 비밀번호가 맞지 않습니다.'); throw error; });
  }
  function recordFromStructured(data, fileName, type) {
    var sourceProducts = data && data.products || [], productColumns = [];
    function actualLabel(value) { var text = cellText(value); return /^(?:보험사|회사명?|상품명?|보험상품|가입금액|합계금액|총가입금액|보장금액|-)?$/.test(text) ? '' : text; }
    var products = sourceProducts.map(function (p, index) {
      var company = actualLabel(p.company), product = actualLabel(p.product);
      if (!company && !product && sourceProducts.length === 1) return null;
      productColumns.push(index);
      return makeProduct(company, product, p.premium, p.renewal);
    }).filter(Boolean);
    var rows = (data && data.rows || []).map(function (row) {
      var values = {};
      products.forEach(function (p, index) { values[p.id] = cellText(row.values && row.values[productColumns[index]]); });
      var total = cellText(row.total);
      // An overview's 가입금액 column is a total, never an invented insurance product.
      if (!products.length && !total && row.values && row.values.length === 1) total = cellText(row.values[0]);
      return { id: uid('coverage'), section: sectionName(row.section), group: cellText(row.group), name: cellText(row.name), recommended: cellText(row.recommended), status: cellText(row.status), total: total, difference: '', values: values, hidden: false, selected: false };
    }).filter(function (row) { return row.name && !/^(?:총\s*보험료|월\s*보험료|납입(?:완료|예정)|총\s*납입|보유\s*계약|마이데이터)/.test(row.name); });
    return makeRecord(fileName, type, products, rows);
  }
  function parseImportFile(file) {
    var ext = file.name.split('.').pop().toLowerCase();
    if (/^xlsx?$/.test(ext)) return loadSheetJs().then(function () { return file.arrayBuffer(); }).then(function (buffer) { return decryptWorkbook(buffer, file.name); }).then(function (buffer) { return parseWorkbook(buffer, file.name); });
    return Promise.resolve().then(function () { return api().extractCoverageFile(file); }).then(function (data) { return recordFromStructured(data, file.name, ext); }).catch(function (error) {
      if (ext !== 'pdf') throw error;
      return loadPdfJs().then(function () { return file.arrayBuffer(); }).then(function (buffer) { return window.pdfjsLib.getDocument({ data: buffer }).promise; }).then(async function (pdf) { var pages = []; for (var i = 1; i <= Math.min(pdf.numPages, 30); i++) pages.push((await (await pdf.getPage(i)).getTextContent()).items || []); return parsePdfItems(pages, file.name); });
    });
  }
  function importFile(customerId, input) {
    var files = Array.from(input && input.files || []); if (!files.length) return;
    if (importBusy) { input.value = ''; return; }
    if (files.some(function (file) { return !/\.(xlsx?|pdf|png|jpe?g|webp)$/i.test(file.name); })) { api().coverageError('엑셀, PDF 또는 이미지 파일을 선택해 주세요.'); input.value = ''; return; }
    // Structured spreadsheets take precedence over OCR; other sources fill gaps, never add the same amount twice.
    files.sort(function (a, b) { return Number(!/\.xlsx?$/i.test(a.name)) - Number(!/\.xlsx?$/i.test(b.name)); });
    importBusy = true;
    showImportProgress('파일의 담보명과 가입금액을 읽고 있습니다.');
    var records = [];
    var job = files.reduce(function (previous, file, index) { return previous.then(function () {
      showImportProgress((index + 1) + ' / ' + files.length + ' · ' + file.name + ' 분석 중');
      return parseImportFile(file).then(function (record) { records.push(record); });
    }); }, Promise.resolve());
    return Promise.all([job, loadCoverageSynonyms()]).then(function () {
      if (!records.some(function (record) { return record.rows.length || record.products.length; })) throw new Error('파일에서 보장 항목이나 계약 정보를 읽지 못했습니다.');
      showImportProgress('기본 양식에 금액을 연결하고 저장하고 있습니다.');
      var merged = draft(customerId);
      records.forEach(function (record) { merged = mergeImportedRecord(merged, record); });
      merged.source = Object.assign({}, merged.source, { name: files.map(function (file) { return file.name; }).join(' · '), files: records.map(function (record) { return record.source; }) });
      merged.source.notes = records.filter(function (record) { return !record.rows.length && !record.products.length; }).map(function (record) { return record.source.name + ': 보장·계약 항목 없음 (원본 보관)'; });
      return saveTarget(customerId, merged, files.length === 1 ? files[0] : files).then(function (saved) { reset(customerId, saved || merged); });
    }).then(function () { rerenderTarget(customerId); }).catch(function (error) {
      hideImportProgress(); api().coverageError(error.message || String(error));
    }).finally(function () { hideImportProgress(); importBusy = false; input.value = ''; });
  }
  function visibleProducts(d) { return d.products.filter(function (p) { return !p.hidden || d.showHiddenProducts; }); }
  function summaryHtml(d) {
    if (!d.showSummary) return '';
    var counts = { '충분': 0, '부족': 0, '없음': 0 };
    d.rows.forEach(function (r) { if (counts.hasOwnProperty(r.status)) counts[r.status]++; });
    return '<div class="iw-ca-summary"><span>충분 <b>' + counts['충분'] + '</b></span><span>부족 <b>' + counts['부족'] + '</b></span><span>없음 <b>' + counts['없음'] + '</b></span></div>';
  }
  function mergedSpan(rows, index, key) {
    var value = rows[index] && rows[index][key] || '';
    if (!value || (index > 0 && rows[index - 1][key] === value && (key !== 'group' || rows[index - 1].section === rows[index].section))) return value ? 0 : 1;
    var span = 1;
    while (index + span < rows.length && rows[index + span][key] === value && (key !== 'group' || rows[index + span].section === rows[index].section)) span++;
    return span;
  }
  function setMergedField(customerId, index, key, value) {
    var d = draft(customerId), row = d.rows[index];
    if (!row) return;
    var previous = row[key] || '';
    row[key] = value;
    if (!previous) return;
    for (var i = index + 1; i < d.rows.length && d.rows[i][key] === previous && (key !== 'group' || d.rows[i].section === row.section); i++) d.rows[i][key] = value;
  }
  function textColumnWidth(rows, key, label, minimum, maximum) {
    var values = [label].concat(rows.flatMap(function (row) { return String(row[key] || '').split(/\r\n|\r|\n/); }));
    var width = values.reduce(function (largest, value) { var measured = Array.from(String(value)).reduce(function (sum, ch) { return sum + (/[^\x00-\xff]/.test(ch) ? 14 : 8); }, 0) + 32; return Math.max(largest, measured); }, minimum);
    return Math.max(minimum, Math.min(maximum, width));
  }
  function nameColumnWidth(record, textarea) {
    if (record.nameColumnWidth > 0) return Math.max(80, record.nameColumnWidth);
    if (!textarea) return textColumnWidth(record.rows, 'name', '담보', 100, Infinity);
    var style = getComputedStyle(textarea), canvas = document.createElement('canvas'), context = canvas.getContext('2d');
    context.font = style.font;
    var spacing = parseFloat(style.letterSpacing) || 0;
    var width = record.rows.reduce(function (max, row) {
      return String(row.name || '').split(/\r\n|\r|\n/).reduce(function (longest, line) {
        return Math.max(longest, context.measureText(line).width + Math.max(0, Array.from(line).length - 1) * spacing);
      }, max);
    }, context.measureText('담보').width);
    return Math.max(100, Math.ceil(width + 28));
  }
  function fitNameRows(field) {
    var rows = field.value.split(/\r\n|\r|\n/).length;
    if (field.rows !== rows) field.rows = rows;
  }
  function syncNameColumn(customerId, editedField) {
    var panel = panelFor(customerId), textarea = panel && panel.querySelector('.iw-ca-name-cell textarea');
    if (textarea) { var section = panel.closest('.iw-coverage-analysis'), width = nameColumnWidth(draft(customerId), textarea) + 'px'; if (section.style.getPropertyValue('--iw-ca-name-w') !== width) section.style.setProperty('--iw-ca-name-w', width); if (editedField) fitNameRows(editedField); else panel.querySelectorAll('.iw-ca-name-cell textarea').forEach(fitNameRows); }
  }
  function resizeNameColumn(customerId, rowId, textarea) {
    setPath(customerId, 'row', rowId, 'name', textarea.value);
    syncNameColumn(customerId, textarea);
  }
  function inputAmount(customerId, rowId, productId, input, event) {
    var value = input.value;
    if (!(event && event.isComposing)) {
      var plain = value.replace(/,/g, '').replace(/만$/, '');
      if (value === '만') { value = ''; input.value = ''; }
      if (/^\d+(?:\.\d*)?$/.test(plain)) {
        var before = value.slice(0, input.selectionStart == null ? value.length : input.selectionStart).replace(/[,만]/g, '').length;
        var parts = plain.split('.');
        var formatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (parts.length > 1 ? '.' + parts[1] : '');
        value = formatted + '만';
        if (input.value !== value) {
          input.value = value;
          var caret = 0, digits = 0;
          while (caret < formatted.length && digits < before) { if (formatted[caret] !== ',') digits++; caret++; }
          input.setSelectionRange(caret, caret);
        }
      }
    }
    var row = draft(customerId).rows.find(function (item) { return String(item.id) === String(rowId); });
    if (row) { if (productId === null) row.total = value; else row.values[productId] = value; }
  }
  function resetNameColumn(customerId) {
    delete draft(customerId).nameColumnWidth;
    syncNameColumn(customerId);
  }
  function startNameResize(event, customerId) {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    var handle = event.currentTarget, section = handle.closest('.iw-coverage-analysis');
    var initialX = event.clientX, initialWidth = handle.parentElement.getBoundingClientRect().width;
    handle.setPointerCapture(event.pointerId);
    function move(e) {
      var width = Math.max(80, Math.round(initialWidth + e.clientX - initialX));
      draft(customerId).nameColumnWidth = width;
      section.style.setProperty('--iw-ca-name-w', width + 'px');
    }
    function stop() { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', stop); handle.removeEventListener('pointercancel', stop); handle.removeEventListener('lostpointercapture', stop); }
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', stop); handle.addEventListener('pointercancel', stop); handle.addEventListener('lostpointercapture', stop);
  }
  function toggleFreezeColumns(customerId) {
    var d = draft(customerId);
    d.freezeColumns = d.freezeColumns === false;
    rerender(customerId);
  }
  function customerHeaderInfo(customerId, record) {
    return record.customerInfo || (customerId !== WORKSPACE_KEY && api().getCoverageCustomerInfo ? api().getCoverageCustomerInfo(customerId) : null) || {};
  }
  function customerAge(info) { var age = api().coverageInsuranceAge ? api().coverageInsuranceAge(info.birthDate || '') : ''; return age === '' ? '보험나이 확인' : '보험나이 ' + age + '세'; }
  function premiumSummary(products) {
    var total = 0, missing = 0;
    products.forEach(function (product) {
      var text = cellText(product.premium).replace(/,/g, ''), match = text.match(/(?:^|[^\d.])([\d]+(?:\.\d+)?)\s*(만|천)?\s*원/);
      if (!match && /^\d+(?:\.\d+)?$/.test(text)) match = [text, text, ''];
      if (!match) { missing++; return; }
      total += Number(match[1]) * (match[2] === '만' ? 10000 : match[2] === '천' ? 1000 : 1);
    });
    if (!products.length) return '—';
    return total.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) + '원' + (missing ? ' · ' + missing + '건 확인 필요' : '');
  }
  function customerHeaderHtml(customerId, d) {
    var info = customerHeaderInfo(customerId, d);
    return '<input aria-label="고객명" placeholder="고객명" value="' + esc(info.name || '') + '" oninput="OSInsuworkCoverage.setCustomerInfo(\'' + esc(customerId) + '\',\'name\',this.value)"><input type="date" aria-label="생년월일" value="' + esc(info.birthDate || '') + '" oninput="OSInsuworkCoverage.setCustomerInfo(\'' + esc(customerId) + '\',\'birthDate\',this.value)"><span class="iw-ca-insurance-age">' + esc(customerAge(info)) + '</span>';
  }
  function setCustomerInfo(customerId, key, value) {
    var d = draft(customerId); d.customerInfo = Object.assign({}, customerHeaderInfo(customerId, d)); d.customerInfo[key] = value;
    var panel = panelFor(customerId), age = panel && panel.querySelector('.iw-ca-insurance-age'); if (age) age.textContent = customerAge(d.customerInfo);
  }
  function selectHeaderCustomer(id) {
    var d = draft(WORKSPACE_KEY); d.customerInfo = id && api().getCoverageCustomerInfo ? api().getCoverageCustomerInfo(id) : {};
    var panel = panelFor(WORKSPACE_KEY), header = panel && panel.querySelector('.iw-ca-customer-header'); if (header) header.innerHTML = customerHeaderHtml(WORKSPACE_KEY, d);
  }
  function updatePremiumHeader(customerId) {
    var panel = panelFor(customerId), header = panel && panel.querySelector('.iw-ca-premium-summary'); if (header) header.textContent = premiumSummary(visibleProducts(draft(customerId)));
  }
  function html(customerId, record, options) {
    options = options || {};
    if (typeof queueMicrotask === 'function') queueMicrotask(function () { syncNameColumn(customerId); if (document.fonts) document.fonts.ready.then(function () { syncNameColumn(customerId); }); });
    var d = draft(customerId, record), products = visibleProducts(d), hiddenCount = d.products.filter(function (p) { return p.hidden; }).length, freezeColumns = d.freezeColumns !== false;
    var activeFilter = coverageFilter(customerId);
    activeFilter.sections = activeFilter.sections.filter(function (section) { return d.rows.some(function (row) { return (row.section || '') === section; }); });
    var columnStyle = '--iw-ca-product-count:' + Math.max(1, products.length) + ';--iw-ca-section-w:' + textColumnWidth(d.rows, 'section', '대분류', 82, 150) + 'px;--iw-ca-group-w:' + textColumnWidth(d.rows, 'group', '중분류', 86, 150) + 'px;--iw-ca-name-w:' + nameColumnWidth(d) + 'px;--iw-ca-total-w:' + textColumnWidth(d.rows, 'total', '합계금액', 96, 180) + 'px';
    var productHeaders = products.map(function (p) { var label = [p.company, p.product].filter(Boolean).join(' · ') || '이 회사·상품'; return '<th draggable="true" ondragover="event.preventDefault()" ondrop="OSInsuworkCoverage.moveProduct(\'' + esc(customerId) + '\',event.dataTransfer.getData(\'text/plain\'),\'' + esc(p.id) + '\')" ondragstart="event.dataTransfer.setData(\'text/plain\',\'' + esc(p.id) + '\')" class="iw-ca-product' + (p.hidden ? ' is-hidden' : '') + '"><button type="button" class="iw-ca-product-remove" title="회사·상품 열 삭제" aria-label="' + esc(label) + ' 열 삭제" draggable="false" onmousedown="event.stopPropagation()" onclick="event.stopPropagation();OSInsuworkCoverage.removeProduct(\'' + esc(customerId) + '\',\'' + esc(p.id) + '\')">×</button><input value="' + esc(p.company) + '" placeholder="보험사" aria-label="보험사" oninput="OSInsuworkCoverage.setProduct(\'' + esc(customerId) + '\',\'' + esc(p.id) + '\',\'company\',this.value)"><textarea rows="1" wrap="soft" placeholder="상품명" aria-label="상품명" oninput="OSInsuworkCoverage.setProduct(\'' + esc(customerId) + '\',\'' + esc(p.id) + '\',\'product\',this.value)">' + esc(p.product) + '</textarea><input value="' + esc(p.premium) + '" placeholder="보험료" aria-label="보험료" oninput="OSInsuworkCoverage.setProduct(\'' + esc(customerId) + '\',\'' + esc(p.id) + '\',\'premium\',this.value)"><div class="iw-ca-product-actions"><button type="button" onclick="OSInsuworkCoverage.toggleProduct(\'' + esc(customerId) + '\',\'' + esc(p.id) + '\')">' + (p.hidden ? '다시 표시' : '상품 숨기기') + '</button>' + (!p.hidden && p.company ? '<button type="button" onclick="OSInsuworkCoverage.hideCompany(\'' + esc(customerId) + '\',\'' + esc(p.id) + '\')">보험사 전체 숨기기</button>' : '') + '</div></th>'; }).join('');
    var sectionOrdinal = -1, lastSection = null;
    var body = d.rows.map(function (r, index) {
      if (activeFilter.sections.length && activeFilter.sections.indexOf(r.section || '') < 0) return '';
      var sectionSpan = mergedSpan(d.rows, index, 'section'), groupSpan = mergedSpan(d.rows, index, 'group');
      if (r.section !== lastSection) { sectionOrdinal++; lastSection = r.section; }
      var sectionRows = d.rows.filter(function (row) { return row.section === r.section; });
      var sectionChecked = sectionRows.length && sectionRows.every(function (row) { return row.selected; });
      var selectionCell = sectionSpan ? '<td rowspan="' + sectionSpan + '" class="iw-ca-check-cell"><input type="checkbox" aria-label="' + esc(r.section) + ' 전체 선택" ' + (sectionChecked ? 'checked' : '') + ' onchange="OSInsuworkCoverage.selectSection(\'' + esc(customerId) + '\',\'' + esc(r.section) + '\',this.checked)"></td>' : '';
      var flat = flatSection(r.section);
      var sectionDrag = r.section ? ' draggable="true" title="대분류를 위아래로 이동" ondragover="event.preventDefault()" ondrop="OSInsuworkCoverage.moveSection(\'' + esc(customerId) + '\',event.dataTransfer.getData(\'text/plain\'),\'' + esc(r.id) + '\')" ondragstart="event.dataTransfer.setData(\'text/plain\',\'' + esc(r.id) + '\')"' : '';
      var sectionCell = sectionSpan ? '<td rowspan="' + sectionSpan + '"' + (flat ? ' colspan="2"' : '') + sectionDrag + ' class="iw-ca-section-cell iw-ca-merged iw-ca-section-tone-' + (sectionOrdinal % 6) + (flat ? ' iw-ca-section-flat' : '') + '"><input value="' + esc(r.section) + '" placeholder="대분류" oninput="OSInsuworkCoverage.setMergedField(\'' + esc(customerId) + '\',' + index + ',\'section\',this.value)"></td>' : '';
      var groupCell = !flat && groupSpan ? '<td rowspan="' + groupSpan + '" class="iw-ca-merged iw-ca-group-cell"><input value="' + esc(r.group) + '" placeholder="중분류" oninput="OSInsuworkCoverage.setMergedField(\'' + esc(customerId) + '\',' + index + ',\'group\',this.value)"></td>' : '';
      return '<tr class="' + (r.hidden ? 'is-hidden' : '') + '">' + selectionCell + sectionCell + groupCell + '<td class="iw-ca-name-cell"><textarea title="' + esc(conflictText(r)) + '" rows="1" wrap="off" placeholder="담보명" oninput="OSInsuworkCoverage.resizeNameColumn(\'' + esc(customerId) + '\',\'' + esc(r.id) + '\',this)">' + esc(r.name) + '</textarea></td><td class="iw-ca-total-cell"><input value="' + esc(r.total) + '" placeholder="-" aria-label="합계금액" inputmode="decimal" oninput="OSInsuworkCoverage.inputAmount(\'' + esc(customerId) + '\',\'' + esc(r.id) + '\',null,this,event)"></td>' + products.map(function (p) { return '<td class="iw-ca-product-cell"><input value="' + esc((r.values || {})[p.id] || '') + '" aria-label="' + esc(r.name + ' ' + p.company) + '" inputmode="decimal" oninput="OSInsuworkCoverage.inputAmount(\'' + esc(customerId) + '\',\'' + esc(r.id) + '\',\'' + esc(p.id) + '\',this,event)"></td>'; }).join('') + '<td class="iw-ca-row-actions"><button type="button" title="아래에 담보 삽입" onclick="OSInsuworkCoverage.addRow(\'' + esc(customerId) + '\',' + index + ')">＋</button><button type="button" title="담보 삭제" onclick="OSInsuworkCoverage.removeRow(\'' + esc(customerId) + '\',\'' + esc(r.id) + '\')">×</button></td></tr>';
    }).join('');
    var source = d.source ? '<span class="iw-ca-source" title="' + esc((d.source.notes || []).join(' · ')) + '">원본: ' + esc(d.source.name || '') + (d.source.needsReview ? ' · 인식 결과 검토 필요' : '') + (d.source.notes && d.source.notes.length ? ' · 보장·계약 항목 없는 원본 ' + d.source.notes.length + '개' : '') + (d.rows.some(function (row) { return (row.importConflicts || []).length; }) ? ' · 자료 간 금액 차이 있음 (담보명에 마우스를 올려 확인)' : '') + '</span>' : '<span class="iw-ca-source">등록된 보장분석 없음</span>';
    var expanded = options.expanded === true, accept = '.xlsx,.xls,.pdf,.png,.jpg,.jpeg,.webp', uploadLabel = '파일 불러오기';
    return '<section class="iw-coverage-analysis' + (options.page ? ' iw-ca-page' : '') + (freezeColumns ? '' : ' iw-ca-freeze-off') + '" style="' + columnStyle + '"><header><div><h3>보장분석 표</h3>' + source + '</div>' + (options.page ? '' : '<button type="button" class="iw-btn" onclick="OSInsuworkCoverage.togglePanel(\'' + esc(customerId) + '\',this)">' + (expanded ? '접기' : '펼치기') + '</button>') + '</header><div class="iw-ca-panel" data-customer-id="' + esc(customerId) + '"' + (expanded ? '' : ' hidden') + '><div class="iw-ca-toolbar"><label class="iw-btn primary">' + uploadLabel + '<input type="file" multiple accept="' + accept + '" hidden onchange="OSInsuworkCoverage.importFile(\'' + esc(customerId) + '\',this)"></label><button type="button" class="iw-btn" onclick="OSInsuworkCoverage.addProduct(\'' + esc(customerId) + '\')">+ 회사·상품</button><button type="button" class="iw-btn" aria-expanded="' + coverageFilter(customerId).open + '" onclick="OSInsuworkCoverage.toggleCoverageFilters(\'' + esc(customerId) + '\')">담보현황</button><button type="button" class="iw-btn" aria-pressed="' + freezeColumns + '" onclick="OSInsuworkCoverage.toggleFreezeColumns(\'' + esc(customerId) + '\')">' + (freezeColumns ? '틀 고정 해제' : '틀 고정') + '</button>' + (hiddenCount ? '<button type="button" class="iw-btn" onclick="OSInsuworkCoverage.toggleHiddenProducts(\'' + esc(customerId) + '\')">숨긴 상품 ' + hiddenCount + '개 ' + (d.showHiddenProducts ? '접기' : '보기') + '</button>' : '') + '</div>' + filterHtml(customerId, d) + '<div class="iw-ca-table-wrap"><table><thead><tr><th class="iw-ca-check-cell"></th><th colspan="2" class="iw-ca-customer-header">' + customerHeaderHtml(customerId, d) + '</th><th class="iw-ca-name-cell">담보<span class="iw-ca-name-resizer" title="드래그하여 너비 조절 · 더블클릭하면 자동 맞춤" onpointerdown="OSInsuworkCoverage.startNameResize(event,\'' + esc(customerId) + '\')" ondblclick="OSInsuworkCoverage.resetNameColumn(\'' + esc(customerId) + '\')"></span></th><th class="iw-ca-total-cell">합계금액<div class="iw-ca-premium-label">합계보험료</div><span class="iw-ca-premium-summary">' + esc(premiumSummary(products)) + '</span></th>' + productHeaders + '<th></th></tr></thead><tbody>' + (body || '<tr><td colspan="' + (6 + products.length) + '"><p class="iw-ca-empty">엑셀 파일을 불러오거나 담보를 추가해 주세요.</p></td></tr>') + '</tbody></table></div><footer><span>빈 금액도 원자료로 보존되며 자동 제외되지 않습니다.</span>' + saveStatusHtml(customerId) + '<div><button type="button" class="iw-btn" onclick="OSInsuworkCoverage.copySelected(\'' + esc(customerId) + '\',false)">선택 화면 복사</button>' + (options.page ? '' : '<button type="button" class="iw-btn" onclick="OSInsuworkCoverage.copySelected(\'' + esc(customerId) + '\',true)">카카오톡으로 보내기</button>') + '<button type="button" class="iw-btn primary" data-ca-save="template" onclick="OSInsuworkCoverage.save(\'' + esc(customerId) + '\')">보장분석 저장</button></div></footer></div></section>';
  }
  function addProduct(customerId) { var d = draft(customerId), p = { id: uid('product'), company: '', product: '', renewal: '', premium: '', payment: '', hidden: false }; d.products.push(p); d.rows.forEach(function (r) { r.values[p.id] = ''; }); rerender(customerId); }
  function removeProduct(customerId, id) {
    var d = draft(customerId), product = d.products.find(function (item) { return String(item.id) === String(id); });
    if (!product) return;
    var label = [product.company, product.product].filter(Boolean).join(' · ') || '이 회사·상품';
    if (!window.confirm(label + ' 열을 삭제할까요?\n이 열의 모든 담보 금액도 함께 삭제됩니다.')) return;
    d.products = d.products.filter(function (item) { return String(item.id) !== String(id); });
    d.rows.forEach(function (row) { if (row.values) delete row.values[id]; });
    rerender(customerId);
  }
  function addRow(customerId, index) { var d = draft(customerId), base = index >= 0 ? d.rows[index] : d.rows[d.rows.length - 1], values = {}; d.products.forEach(function (p) { values[p.id] = ''; }); var row = { id: uid('coverage'), section: base ? base.section : '', group: base ? base.group : '', name: '', recommended: '', status: '', total: '', difference: '', values: values, hidden: false, selected: false }, insertAt = index >= 0 ? index + 1 : d.rows.length; d.rows.splice(insertAt, 0, row); rerender(customerId, insertAt); }
  function removeRow(customerId, id) { var d = draft(customerId); d.rows = d.rows.filter(function (r) { return String(r.id) !== String(id); }); rerender(customerId); }
  function moveItem(list, fromId, toId) { var from = list.findIndex(function (item) { return String(item.id) === String(fromId); }), to = list.findIndex(function (item) { return String(item.id) === String(toId); }); if (from < 0 || to < 0 || from === to) return; var item = list.splice(from, 1)[0]; list.splice(to, 0, item); }
  function moveSection(customerId, fromId, toId) {
    var d = draft(customerId), sourceRow = d.rows.find(function (row) { return String(row.id) === String(fromId); }), targetRow = d.rows.find(function (row) { return String(row.id) === String(toId); });
    if (!sourceRow || !targetRow || !sourceRow.section || sourceRow.section === targetRow.section) return;
    var order = [];
    d.rows.forEach(function (row) { if (order.indexOf(row.section) < 0) order.push(row.section); });
    var sourceIndex = order.indexOf(sourceRow.section), targetIndex = order.indexOf(targetRow.section);
    if (sourceIndex < 0 || targetIndex < 0) return;
    order.splice(sourceIndex, 1);
    targetIndex = order.indexOf(targetRow.section) + (sourceIndex < targetIndex ? 1 : 0);
    order.splice(targetIndex, 0, sourceRow.section);
    var buckets = {};
    d.rows.forEach(function (row) { (buckets[row.section] || (buckets[row.section] = [])).push(row); });
    d.rows = [].concat.apply([], order.map(function (section) { return buckets[section] || []; }));
    rerender(customerId);
  }
  function moveProduct(customerId, fromId, toId) { var d = draft(customerId); var from = d.products.findIndex(function (item) { return String(item.id) === String(fromId); }), to = d.products.findIndex(function (item) { return String(item.id) === String(toId); }); if (from < 0 || to < 0 || from === to) return; var product = d.products.splice(from, 1)[0]; d.products.splice(to, 0, product); rerender(customerId); }
  function drawCell(ctx, x, y, width, height, text, options) {
    options = options || {};
    ctx.fillStyle = options.fill || '#ffffff'; ctx.fillRect(x, y, width, height); ctx.strokeStyle = '#cfc8ba'; ctx.strokeRect(x + .5, y + .5, width - 1, height - 1); ctx.fillStyle = options.color || '#17345d'; ctx.font = (options.bold ? '700 ' : '400 ') + (options.size || 14) + 'px Arial, sans-serif'; ctx.textAlign = options.align || 'center'; ctx.textBaseline = 'middle';
    var padding = 10, tx = options.align === 'left' ? x + padding : x + width / 2, lines = String(text || '').split('\n'); lines.forEach(function (line, index) { ctx.fillText(line, tx, y + height / 2 + (index - (lines.length - 1) / 2) * 19, width - padding * 2); });
  }
  function coverageImageBlob(customerId) {
    var d = draft(customerId), rows = d.rows.filter(function (r) { return r.selected && !r.hidden; }), products = d.products.filter(function (p) { return !p.hidden; });
    if (!rows.length) return Promise.reject(new Error('복사할 대분류를 먼저 선택해 주세요.'));
    var widths = [110, 100, 270, 110].concat(products.map(function () { return 158; })), headerHeight = 96, rowHeight = 42, totalWidth = widths.reduce(function (sum, width) { return sum + width; }, 0), canvas = document.createElement('canvas'), scale = 2;
    canvas.width = totalWidth * scale; canvas.height = (headerHeight + rows.length * rowHeight) * scale; var ctx = canvas.getContext('2d'); ctx.scale(scale, scale); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, totalWidth, canvas.height / scale);
    var info = customerHeaderInfo(customerId, d), x = widths[0] + widths[1]; drawCell(ctx, 0, 0, x, headerHeight, [info.name || '고객명', info.birthDate || '생년월일 확인', customerAge(info)].join('\n'), { fill: '#f3efe6', bold: true }); drawCell(ctx, x, 0, widths[2], headerHeight, '담보', { fill: '#f3efe6', bold: true }); x += widths[2]; drawCell(ctx, x, 0, widths[3], headerHeight, '합계금액\n합계보험료\n' + premiumSummary(products), { fill: '#f3efe6', bold: true }); x += widths[3];
    products.forEach(function (p, index) { drawCell(ctx, x, 0, widths[index + 4], headerHeight, [p.company, p.product, p.premium].filter(Boolean).join('\n'), { fill: '#f3efe6', bold: true, size: 13 }); x += widths[index + 4]; });
    var sectionColors = ['#dfe9c9', '#d7e5f5', '#e5def1', '#d8edf0', '#fae4d2', '#ececec', '#f4e2c3'];
    rows.forEach(function (row, index) { var y = headerHeight + index * rowHeight, px = widths[0] + widths[1]; drawCell(ctx, px, y, widths[2], rowHeight, row.name, { align: 'left' }); px += widths[2]; drawCell(ctx, px, y, widths[3], rowHeight, row.total || '-', { bold: true }); px += widths[3]; products.forEach(function (p, pIndex) { drawCell(ctx, px, y, widths[pIndex + 4], rowHeight, (row.values || {})[p.id] || '', { bold: true }); px += widths[pIndex + 4]; }); });
    for (var i = 0; i < rows.length;) { var section = rows[i].section, sectionEnd = i + 1; while (sectionEnd < rows.length && rows[sectionEnd].section === section) sectionEnd++; var sectionHeight = (sectionEnd - i) * rowHeight, sectionY = headerHeight + i * rowHeight, tone = sectionColors[sectionOrder(section)] || '#f3efe6'; if (flatSection(section)) drawCell(ctx, 0, sectionY, widths[0] + widths[1], sectionHeight, section, { fill: tone, bold: true }); else { drawCell(ctx, 0, sectionY, widths[0], sectionHeight, section, { fill: tone, bold: true }); for (var g = i; g < sectionEnd;) { var group = rows[g].group, groupEnd = g + 1; while (groupEnd < sectionEnd && rows[groupEnd].group === group) groupEnd++; drawCell(ctx, widths[0], headerHeight + g * rowHeight, widths[1], (groupEnd - g) * rowHeight, group, { fill: '#f5f1e8', bold: true }); g = groupEnd; } } i = sectionEnd; }
    return new Promise(function (resolve, reject) { canvas.toBlob(function (blob) { if (blob) resolve(blob); else reject(new Error('선택 화면 이미지를 만들지 못했습니다.')); }, 'image/png'); });
  }
  function copyCoverageImage(customerId) {
    if (!navigator.clipboard || !window.ClipboardItem) return Promise.reject(new Error('이 브라우저에서는 이미지 복사를 지원하지 않습니다.'));
    return coverageImageBlob(customerId).then(function (blob) { return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); });
  }
  function copyText(customerId) { var d = draft(customerId), rows = d.rows.filter(function (r) { return r.selected && !r.hidden; }); if (!rows.length) rows = d.rows.filter(function (r) { return !r.hidden; }); var products = d.products.filter(function (p) { return !p.hidden; }); var info = customerHeaderInfo(customerId, d); var lines = [[[info.name || '고객명', info.birthDate || '생년월일 확인', customerAge(info)].join(' · '), '', '담보', '합계금액 · 합계보험료 ' + premiumSummary(products)].concat(products.map(function (p) { return (p.company + ' ' + p.product).trim(); })).join('\t')]; rows.forEach(function (r) { lines.push([r.section, r.group, r.name, r.total].concat(products.map(function (p) { return (r.values || {})[p.id] || ''; })).join('\t')); }); return lines.join('\n'); }
  function saveRecord(customerId, asTemplate) {
    var d = clone(draft(customerId)); delete d._starter; delete d._templateSeed; d.updatedAt = new Date().toISOString();
    setSaveState(customerId, 'saving', '저장 중…');
    return Promise.resolve().then(function () {
      if (asTemplate) { var template = clone(d); delete template.customerInfo; return api().saveCoverageWorkspaceAnalysis(template, null).then(function () { return d; }); }
      return saveTarget(customerId, d, null);
    }).then(function (saved) {
      if (saved) reset(customerId, saved);
      setSaveState(customerId, 'saved', asTemplate ? '기본 양식 저장 완료' : customerId === WORKSPACE_KEY ? '작업표 저장 완료' : '보장분석 저장 완료');
      rerenderTarget(customerId);
    }).catch(function (e) { setSaveState(customerId, 'error', '저장 실패 · 다시 시도해 주세요'); api().coverageError(e.message || String(e)); });
  }
  function resetToBaseTemplate() {
    if (importBusy || (saveStates[WORKSPACE_KEY] || {}).tone === 'saving') return;
    var template = api().getCoverageBaseTemplate(), d = normalize(template || workspaceStarter());
    d.products = []; d.source = null; delete d.customerInfo; delete d.sourceItemId; delete d._starter; delete d._templateSeed;
    d.showHiddenProducts = false; d.updatedAt = new Date().toISOString();
    d.rows.forEach(function (row) { row.values = {}; row.total = ''; row.recommended = ''; row.status = ''; row.difference = ''; delete row.sourceTotal; row.hidden = false; row.selected = false; });
    reset(WORKSPACE_KEY, d); coverageFilter(WORKSPACE_KEY).sections = [];
    setSaveState(WORKSPACE_KEY, 'saving', '작업표 초기화 중…'); rerenderTarget(WORKSPACE_KEY);
    return Promise.resolve().then(function () { return saveTarget(WORKSPACE_KEY, d, null); }).then(function () {
      setSaveState(WORKSPACE_KEY, 'saved', '기본 양식으로 작업표 초기화 완료');
      rerenderTarget(WORKSPACE_KEY);
    }).catch(function (e) { setSaveState(WORKSPACE_KEY, 'error', '초기화 저장 실패 · 작업표 저장을 눌러 다시 저장해 주세요'); api().coverageError(e.message || String(e)); });
  }
  function workspaceHtml(record) {
    var markup = html(WORKSPACE_KEY, record || workspaceStarter(), { expanded: true, page: true });
    queueMicrotask(syncWorkspaceExpanded);
    markup = markup.replace('</header>', '<button type="button" class="iw-btn iw-ca-fullscreen-toggle" aria-pressed="false" onclick="OSInsuworkCoverage.toggleWorkspaceExpanded()">전체 화면 보기</button></header>');
    var productButton = '<button type="button" class="iw-btn" onclick="OSInsuworkCoverage.addProduct(\'' + WORKSPACE_KEY + '\')">+ 회사·상품</button>';
    var resetButton = '<button type="button" class="iw-btn" data-ca-save="reset" onclick="OSInsuworkCoverage.resetToBaseTemplate()">기본 양식으로 초기화</button>';
    var copyButton = '<button type="button" class="iw-btn" onclick="OSInsuworkCoverage.copySelected(\'' + WORKSPACE_KEY + '\',false)">선택 화면 복사</button>';
    var saveButton = '<button type="button" class="iw-btn primary" data-ca-save="template" onclick="OSInsuworkCoverage.save(\'' + WORKSPACE_KEY + '\')">보장분석 저장</button>';
    var templateButton = '';
    var orderedButtons = templateButton + '<button type="button" class="iw-btn" data-ca-save="workspace" onclick="OSInsuworkCoverage.saveWorkspace()">작업표 저장</button>' + copyButton + '<button type="button" class="iw-btn" data-ca-save="customer" onclick="OSInsuworkCoverage.saveWorkspaceToCustomer()">선택 고객에게 저장</button>';
    return markup.replace(productButton, resetButton + productButton).replace(copyButton + saveButton, orderedButtons).replace('<h3>보장분석 표</h3>', '<h3>보장분석·보험비교 표</h3>').replace('등록된 보장분석 없음', '등록된 보장분석·보험비교 없음');
  }
  var exposed = {
    toggleCoverageFilters: function (customerId) { var filter = coverageFilter(customerId); filter.open = !filter.open; if (!filter.open) filter.sections = []; rerender(customerId); },
    filterSection: function (customerId, section) { var filter = coverageFilter(customerId), index = filter.sections.indexOf(section); if (section === null) filter.sections = []; else if (index >= 0) filter.sections.splice(index, 1); else filter.sections.push(section); rerender(customerId); requestAnimationFrame(function () { var panel = panelFor(customerId), wrap = panel && panel.querySelector('.iw-ca-table-wrap'); if (wrap) wrap.scrollTop = 0; }); },
    toggleFreezeColumns: toggleFreezeColumns,
    startNameResize: startNameResize, resetNameColumn: resetNameColumn,
    resizeNameColumn: resizeNameColumn,
    toggleWorkspaceExpanded: toggleWorkspaceExpanded,
    html: html, workspaceHtml: workspaceHtml, reset: reset, importFile: importFile,
    togglePanel: function (customerId, button) { var panel = button.closest('.iw-coverage-analysis').querySelector('.iw-ca-panel'), open = panel.hidden; panel.hidden = !open; button.textContent = open ? '접기' : '펼치기'; },
    setProduct: function (customerId, id, key, value) { setPath(customerId, 'product', id, key, value); if (key === 'premium') updatePremiumHeader(customerId); },
    setRow: function (customerId, id, key, value) { setPath(customerId, 'row', id, key, value); }, setMergedField: setMergedField,
    headerCustomerId: function (record) { var d = drafts[WORKSPACE_KEY] || record || {}; return d.customerInfo && d.customerInfo.id || ''; },
    setCustomerInfo: setCustomerInfo, selectHeaderCustomer: selectHeaderCustomer,
    inputAmount: inputAmount,
    setCell: function (customerId, rowId, productId, value) { var r = draft(customerId).rows.find(function (x) { return String(x.id) === String(rowId); }); if (r) r.values[productId] = value; },
    addProduct: addProduct, removeProduct: removeProduct, addRow: addRow, removeRow: removeRow,
    toggleProduct: function (customerId, id) { var p = draft(customerId).products.find(function (x) { return String(x.id) === String(id); }); if (p) p.hidden = !p.hidden; rerender(customerId); },
    hideCompany: function (customerId, id) { var d = draft(customerId), seed = d.products.find(function (x) { return String(x.id) === String(id); }); if (!seed) return; d.products.forEach(function (p) { if (p.company === seed.company) p.hidden = true; }); rerender(customerId); },
    toggleHiddenProducts: function (customerId) { var d = draft(customerId); d.showHiddenProducts = !d.showHiddenProducts; rerender(customerId); },
    toggleSummary: function (customerId) { var d = draft(customerId); d.showSummary = !d.showSummary; rerender(customerId); },
    selectSection: function (customerId, section, checked) { var d = draft(customerId); d.rows.forEach(function (r) { if (r.section === section) r.selected = checked; }); rerender(customerId); },
    moveSection: moveSection, moveProduct: moveProduct,
    resetToBaseTemplate: resetToBaseTemplate,
    save: function (customerId) { return saveRecord(customerId, false); },
    saveWorkspace: function () { return saveRecord(WORKSPACE_KEY, false); },
    saveWorkspaceToCustomer: function () { var d = clone(draft(WORKSPACE_KEY)); delete d._starter; delete d._templateSeed; delete d.sourceItemId; d.source = null; d.updatedAt = new Date().toISOString(); setSaveState(WORKSPACE_KEY, 'saving', '선택 고객에게 저장 중…'); Promise.resolve().then(function () { return api().saveCoverageWorkspaceToCustomer(d); }).then(function () { setSaveState(WORKSPACE_KEY, 'saved', '선택 고객에게 저장 완료'); }).catch(function (e) { var message = e.message || String(e); setSaveState(WORKSPACE_KEY, 'error', /고객/.test(message) ? '고객을 먼저 선택해 주세요 · 전체 화면 밖에서 선택할 수 있습니다' : '저장 실패 · 다시 시도해 주세요'); api().coverageError(message); }); },
    importExistingPdf: function (customerId, fileId) { Promise.all([api().loadCoveragePdfFile(fileId), loadCoverageSynonyms()]).then(function (results) { var file = results[0]; return loadPdfJs().then(function () { return window.pdfjsLib.getDocument({ data: file.buffer }).promise; }).then(async function (pdf) { var pages = []; for (var i = 1; i <= Math.min(pdf.numPages, 30); i++) pages.push((await (await pdf.getPage(i)).getTextContent()).items || []); return { file: file, record: parsePdfItems(pages, file.name) }; }); }).then(function (result) { var merged = mergeImportedRecord(draft(customerId), result.record); reset(customerId, merged); return api().saveCoverageAnalysis(customerId, merged, null, fileId); }).then(function () { rerender(customerId); }).catch(function (e) { api().coverageError(e.message || String(e)); }); },
    copySelected: function (customerId, sendKakao) { var text = copyText(customerId); copyCoverageImage(customerId).then(function () { api().coverageNotice('선택한 보장분석 표를 이미지로 복사했습니다. 카카오톡에 붙여넣어 주세요.'); if (sendKakao) api().sendCoverageToKakao(customerId, text); }).catch(function (error) { api().coverageError(error.message || '선택 화면을 복사하지 못했습니다.'); }); }
  };
  window.OSInsuworkCoverage = exposed;
})();

// Template editing owns a separate draft and never resets or saves the customer workspace.
(function () {
  'use strict';
  var session = null, box = null;
  function api() { return window.OSInsuwork || {}; }
  function allowed() { return api().canEditCoverageTemplate && api().canEditCoverageTemplate(); }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function clean(record) {
    var result = clone(record || { rows: [], products: [] });
    delete result.customerInfo; delete result.sourceItemId; delete result._starter; delete result._templateSeed;
    result.source = null; result.products = []; result.showHiddenProducts = false;
    result.rows = (result.rows || []).map(function (row) {
      return { id: row.id || crypto.randomUUID(), section: row.section || '', group: row.group || '', name: row.name || '', hidden: !!row.hidden, selected: false, values: {}, total: '', recommended: '', status: '', difference: '' };
    });
    return result;
  }
  function label(row) { return [row.section, row.group, row.name].join(' / ') + (row.hidden ? ' (숨김)' : ''); }
  function changes(before, after) {
    var old = new Map(before.rows.map(function (r) { return [String(r.id), r]; }));
    var next = new Map(after.rows.map(function (r) { return [String(r.id), r]; }));
    var result = [];
    before.rows.forEach(function (r) { if (!next.has(String(r.id))) result.push({ type: '삭제', text: label(r) }); });
    after.rows.forEach(function (r) {
      var prior = old.get(String(r.id));
      if (!prior) result.push({ type: '추가', text: label(r) });
      else if (label(prior) !== label(r)) result.push({ type: '수정', text: label(prior) + ' → ' + label(r) });
    });
    var oldOrder = before.rows.filter(function (r) { return next.has(String(r.id)); }).map(function (r) { return String(r.id); });
    var newOrder = after.rows.filter(function (r) { return old.has(String(r.id)); }).map(function (r) { return String(r.id); });
    if (JSON.stringify(oldOrder) !== JSON.stringify(newOrder)) result.push({ type: '순서', text: '기존 담보의 표시 순서 변경' });
    return result;
  }
  function show(content) {
    if (!allowed()) return;
    if (!box || !box.isConnected) {
      var root = document.getElementById('v-insuwork'); if (!root) return;
      box = document.createElement('dialog'); box.className = 'iw-ca-template-dialog'; box.setAttribute('aria-labelledby', 'iw-ca-template-title');
      box.addEventListener('cancel', function (event) { event.preventDefault(); close(); });
      root.appendChild(box);
    }
    box.innerHTML = '<div class="iw-ca-template-body">' + content + '</div>';
    if (!box.open) box.showModal();
  }
  function button(text, action, primary) { return '<button type="button" class="iw-btn' + (primary ? ' primary' : '') + '" onclick="OSInsuworkCoverageTemplate.' + action + '">' + text + '</button>'; }
  function close() {
    if (session && session.busy) return;
    if (session && changes(session.base, session.draft).length && !window.confirm('저장하지 않은 기본 양식 변경을 버리고 닫을까요?')) return;
    session = null; if (box) { box.close(); box.remove(); box = null; }
  }
  function open() {
    if (!allowed() || session) return;
    show('<h2 id="iw-ca-template-title">양식 관리</h2><p>기본 양식의 담보 구성을 관리합니다.</p><div class="iw-ca-template-actions">' + button('기본 양식 편집', 'edit()', true) + button('이전 양식 확인', 'history()') + button('닫기', 'close()') + '</div>');
  }
  function edit(snapshot) {
    if (!allowed() || session && session.busy) return;
    var saved = api().getCoverageBaseTemplate();
    if (!saved) return api().coverageError('저장된 기본 양식이 없습니다.');
    var base = clean(saved);
    session = { base: base, draft: snapshot ? clean(snapshot) : clone(base), original: JSON.stringify(saved), busy: false, reviewed: null };
    render();
  }
  function render() {
    if (!allowed() || !session || session.busy) return;
    session.reviewed = null;
    show('<h2 id="iw-ca-template-title">기본 양식 편집</h2><p>저장된 기본 양식의 분류·담보명·순서를 편집합니다. 고객 정보·상품·가입금액은 포함하지 않습니다.</p>' +
      '<div class="iw-ca-template-scroll"><table><thead><tr><th>대분류</th><th>중분류</th><th>담보명</th><th>순서·추가·삭제</th></tr></thead><tbody>' + session.draft.rows.map(function (r, i) {
        return '<tr>' + ['section', 'group', 'name'].map(function (key) { return '<td><textarea rows="1" aria-label="' + ({ section: '대분류', group: '중분류', name: '담보명' }[key]) + ' ' + (i + 1) + '" oninput="OSInsuworkCoverageTemplate.set(' + i + ',\'' + key + '\',this.value)">' + esc(r[key]) + '</textarea></td>'; }).join('') +
          '<td class="iw-ca-template-row-actions">' +
          button('↑', 'move(' + i + ',-1)') + button('↓', 'move(' + i + ',1)') + button('+', 'add(' + i + ')') + button('×', 'remove(' + i + ')') + '</td></tr>';
      }).join('') + '</tbody></table></div><div class="iw-ca-template-actions">' + button('담보 추가', 'add()') + button('취소', 'close()') + button('변경 내역 확인', 'review()', true) + '</div>');
  }
  function set(index, key, value) {
    if (!allowed() || !session || session.busy || session.reviewed || ['section', 'group', 'name', 'hidden'].indexOf(key) < 0 || !session.draft.rows[index]) return;
    session.draft.rows[index][key] = value;
  }
  function mutate(action) {
    if (!allowed() || !session || session.busy || session.reviewed) return;
    var scroll = box && box.querySelector('.iw-ca-template-scroll'), top = scroll ? scroll.scrollTop : 0;
    action(session.draft.rows); render();
    scroll = box && box.querySelector('.iw-ca-template-scroll'); if (scroll) scroll.scrollTop = top;
  }
  function review() {
    if (!allowed() || !session || session.busy) return;
    var diff = changes(session.base, session.draft);
    session.reviewed = clone(session.draft);
    show('<h2 id="iw-ca-template-title">기본 양식 변경 내역</h2><p>변경 ' + diff.length + '건 · 담보 ' + session.base.rows.length + '개 → ' + session.draft.rows.length + '개</p>' +
      '<div class="iw-ca-template-scroll">' + (diff.length ? '<ul>' + diff.map(function (d) { return '<li><strong>' + esc(d.type) + '</strong> ' + esc(d.text) + '</li>'; }).join('') + '</ul>' : '<p>변경한 내용이 없습니다.</p>') +
      '</div><p>저장하면 앞으로 초기화할 때 사용할 기본 양식이 바뀝니다. 저장 전 양식은 자동 보관되며 현재 작업표는 유지됩니다.</p><p id="iw-ca-template-status" role="status"></p><div class="iw-ca-template-actions">' + button('편집으로 돌아가기', 'back()') + (diff.length ? button('기본 양식 저장', 'save()', true) : '') + button('닫기', 'close()') + '</div>');
  }
  async function save() {
    if (!allowed() || !session || session.busy || !session.reviewed || !changes(session.base, session.reviewed).length) return;
    var active = session, status = box && box.querySelector('#iw-ca-template-status');
    if (JSON.stringify(api().getCoverageBaseTemplate()) !== active.original) {
      if (status) status.textContent = '기본 양식이 다른 작업에서 변경되었습니다. 편집 내용을 확인한 후 닫고 최신 양식을 다시 열어 주세요.';
      return;
    }
    active.busy = true;
    if (box) box.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    if (status) status.textContent = '이전 양식 보관 및 저장 중…';
    try {
      var next = clean(active.reviewed); next.updatedAt = new Date().toISOString();
      await api().saveCoverageWorkspaceAnalysis(next, null);
      session = null;
      show('<h2 id="iw-ca-template-title">기본 양식 저장됨</h2><p>이전 양식을 보관하고 변경한 기본 양식을 저장했습니다. 현재 작업표는 그대로 유지됩니다.</p><div class="iw-ca-template-actions">' + button('닫기', 'close()', true) + '</div>');
    } catch (error) {
      active.busy = false;
      if (box) box.querySelectorAll('button').forEach(function (b) { b.disabled = false; });
      if (status) status.textContent = '저장 실패: ' + (error.message || String(error)) + ' · 편집 내용은 유지됩니다.';
    }
  }
  window.OSInsuworkCoverageTemplate = {
    open: open, edit: edit, close: close, set: set, review: review, save: save, back: render,
    history: function () { if (!allowed() || session) return; close(); return api().openCoverageTemplateHistory(); },
    add: function (index) { mutate(function (rows) { var prior = rows[index] || {}; rows.splice(index == null ? rows.length : index + 1, 0, { id: crypto.randomUUID(), section: prior.section || '', group: prior.group || '', name: '', hidden: false, values: {}, total: '' }); }); },
    remove: function (index) { mutate(function (rows) { if (rows[index]) rows.splice(index, 1); }); },
    move: function (index, offset) { mutate(function (rows) { var target = index + offset; if (rows[index] && target >= 0 && target < rows.length) rows.splice(target, 0, rows.splice(index, 1)[0]); }); }
  };
})();
