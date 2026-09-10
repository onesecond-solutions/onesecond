(function () {
  'use strict';

  var drafts = {};
  var sheetJsPromise = null;
  var pdfJsPromise = null;

  function esc(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]; }); }
  function uid(prefix) { return (prefix || 'id') + '-' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)); }
  function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
  function blankRecord() { return { version: 1, source: null, showSummary: false, showHiddenProducts: false, products: [], rows: [], updatedAt: '' }; }
  function normalize(record) {
    var next = Object.assign(blankRecord(), clone(record));
    next.products = (next.products || []).map(function (p) { return Object.assign({ id: uid('product'), company: '', product: '', renewal: '', premium: '', payment: '', hidden: false }, p); });
    next.rows = (next.rows || []).map(function (r) { return Object.assign({ id: uid('coverage'), section: '', group: '', name: '', recommended: '', status: '', total: '', difference: '', values: {}, hidden: false, selected: false }, r); });
    return next;
  }
  function draft(customerId, record) {
    var key = String(customerId || '');
    if (!drafts[key]) drafts[key] = normalize(record);
    return drafts[key];
  }
  function reset(customerId, record) { drafts[String(customerId || '')] = normalize(record); }
  function api() { return window.OSInsuwork || {}; }
  function rerender(customerId) { if (customerId === WORKSPACE_KEY && api().rerenderCoverageWorkspace) api().rerenderCoverageWorkspace(); else if (api().rerenderCoverageAnalysis) api().rerenderCoverageAnalysis(customerId); }
  var WORKSPACE_KEY = '__coverage_workspace__';
  function rerenderTarget(customerId) { if (customerId === WORKSPACE_KEY && api().rerenderCoverageWorkspace) api().rerenderCoverageWorkspace(); else rerender(customerId); }
  function saveTarget(customerId, record, file) { return customerId === WORKSPACE_KEY ? api().saveCoverageWorkspaceAnalysis(record, file) : api().saveCoverageAnalysis(customerId, record, file); }
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
  function loadPdfJs() {
    if (!pdfJsPromise) pdfJsPromise = loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', function () { return !!window.pdfjsLib; }).then(function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; });
    return pdfJsPromise;
  }
  function cellText(value) { if (value == null) return ''; if (value instanceof Date) return value.toISOString().slice(0, 10); return String(value).trim(); }
  function parseWorkbook(buffer, fileName) {
    var workbook = window.XLSX.read(buffer, { type: 'array', cellDates: true });
    var sheet = workbook.Sheets[workbook.SheetNames[0]];
    var grid = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    var headerIndex = grid.findIndex(function (row) { var joined = row.map(cellText).join('|'); return joined.indexOf('보장구분') >= 0 && (joined.indexOf('주요특약') >= 0 || joined.indexOf('담보') >= 0); });
    if (headerIndex < 0) throw new Error('보장구분과 주요특약 열을 찾지 못했습니다. 보장분석 엑셀 형식을 확인해 주세요.');
    var header = grid[headerIndex].map(cellText), known = ['보장구분', '중분류', '주요특약', '담보', '추천금액', '상태', '가입금액', '차이'];
    var productStart = header.findIndex(function (value, index) { return index >= 2 && known.indexOf(value) < 0 && value !== ''; });
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
      var row = grid[r] || [], first = cellText(row[0]), name = cellText(row[1]);
      if (first) section = first;
      if (!section && !name) continue;
      var values = {}, hasProductValue = false;
      products.forEach(function (p) { var value = cellText(row[p.sourceColumn]); values[p.id] = value; if (value) hasProductValue = true; });
      if (!name && !hasProductValue) continue;
      rows.push({ id: uid('coverage'), section: section, group: '', name: name, recommended: cellText(row[2]), status: cellText(row[3]), total: cellText(row[4]), difference: cellText(row[5]), values: values, hidden: false, selected: false });
    }
    products.forEach(function (p) { delete p.sourceColumn; });
    return { version: 1, source: { name: fileName, type: 'xlsx', importedAt: new Date().toISOString() }, showSummary: false, showHiddenProducts: false, products: products, rows: rows, updatedAt: new Date().toISOString() };
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
  function importFile(customerId, input) {
    var file = input && input.files && input.files[0]; if (!file) return;
    var ext = (file.name.split('.').pop() || '').toLowerCase(), job;
    if (ext === 'xlsx' || ext === 'xls') job = loadSheetJs().then(function () { return file.arrayBuffer(); }).then(function (buffer) { return parseWorkbook(buffer, file.name); });
    else if (ext === 'pdf') job = loadPdfJs().then(function () { return file.arrayBuffer(); }).then(function (buffer) { return window.pdfjsLib.getDocument({ data: buffer }).promise; }).then(async function (pdf) { var pages = []; for (var i = 1; i <= Math.min(pdf.numPages, 30); i++) pages.push((await (await pdf.getPage(i)).getTextContent()).items || []); return parsePdfItems(pages, file.name); });
    else { api().coverageError('엑셀 또는 PDF 파일을 선택해 주세요.'); input.value = ''; return; }
    job.then(function (record) { reset(customerId, record); return saveTarget(customerId, record, file); }).then(function () { rerenderTarget(customerId); }).catch(function (error) { api().coverageError(error.message || String(error)); }).finally(function () { input.value = ''; });
  }
  function visibleProducts(d) { return d.products.filter(function (p) { return !p.hidden || d.showHiddenProducts; }); }
  function summaryHtml(d) {
    if (!d.showSummary) return '';
    var counts = { '충분': 0, '부족': 0, '없음': 0 };
    d.rows.forEach(function (r) { if (counts.hasOwnProperty(r.status)) counts[r.status]++; });
    return '<div class="iw-ca-summary"><span>충분 <b>' + counts['충분'] + '</b></span><span>부족 <b>' + counts['부족'] + '</b></span><span>없음 <b>' + counts['없음'] + '</b></span></div>';
  }
  function html(customerId, record, options) {
    options = options || {};
    var d = draft(customerId, record), products = visibleProducts(d), hiddenCount = d.products.filter(function (p) { return p.hidden; }).length;
    var productHeaders = products.map(function (p) { return '<th class="iw-ca-product' + (p.hidden ? ' is-hidden' : '') + '"><input value="' + esc(p.company) + '" placeholder="보험사" aria-label="보험사" onchange="OSInsuworkCoverage.setProduct(\'' + esc(customerId) + '\',\'' + esc(p.id) + '\',\'company\',this.value)"><input value="' + esc(p.product) + '" placeholder="상품명" aria-label="상품명" onchange="OSInsuworkCoverage.setProduct(\'' + esc(customerId) + '\',\'' + esc(p.id) + '\',\'product\',this.value)"><input value="' + esc(p.premium) + '" placeholder="보험료" aria-label="보험료" onchange="OSInsuworkCoverage.setProduct(\'' + esc(customerId) + '\',\'' + esc(p.id) + '\',\'premium\',this.value)"><div class="iw-ca-product-actions"><button type="button" onclick="OSInsuworkCoverage.toggleProduct(\'' + esc(customerId) + '\',\'' + esc(p.id) + '\')">' + (p.hidden ? '다시 표시' : '상품 숨기기') + '</button>' + (!p.hidden && p.company ? '<button type="button" onclick="OSInsuworkCoverage.hideCompany(\'' + esc(customerId) + '\',\'' + esc(p.id) + '\')">보험사 전체 숨기기</button>' : '') + '</div></th>'; }).join('');
    var body = d.rows.map(function (r, index) { return '<tr class="' + (r.hidden ? 'is-hidden' : '') + '"><td><input type="checkbox" ' + (r.selected ? 'checked' : '') + ' onchange="OSInsuworkCoverage.selectRow(\'' + esc(customerId) + '\',\'' + esc(r.id) + '\',this.checked)"></td><td><input value="' + esc(r.section) + '" placeholder="대분류" onchange="OSInsuworkCoverage.setRow(\'' + esc(customerId) + '\',\'' + esc(r.id) + '\',\'section\',this.value)"></td><td><input value="' + esc(r.group) + '" placeholder="중분류" onchange="OSInsuworkCoverage.setRow(\'' + esc(customerId) + '\',\'' + esc(r.id) + '\',\'group\',this.value)"></td><td><input value="' + esc(r.name) + '" placeholder="담보명" onchange="OSInsuworkCoverage.setRow(\'' + esc(customerId) + '\',\'' + esc(r.id) + '\',\'name\',this.value)"></td><td><input value="' + esc(r.recommended) + '" placeholder="추천금액" onchange="OSInsuworkCoverage.setRow(\'' + esc(customerId) + '\',\'' + esc(r.id) + '\',\'recommended\',this.value)"></td>' + products.map(function (p) { return '<td><input value="' + esc((r.values || {})[p.id] || '') + '" aria-label="' + esc(r.name + ' ' + p.company) + '" onchange="OSInsuworkCoverage.setCell(\'' + esc(customerId) + '\',\'' + esc(r.id) + '\',\'' + esc(p.id) + '\',this.value)"></td>'; }).join('') + '<td class="iw-ca-row-actions"><button type="button" title="아래에 담보 삽입" onclick="OSInsuworkCoverage.addRow(\'' + esc(customerId) + '\',' + index + ')">＋</button><button type="button" title="담보 삭제" onclick="OSInsuworkCoverage.removeRow(\'' + esc(customerId) + '\',\'' + esc(r.id) + '\')">×</button></td></tr>'; }).join('');
    var source = d.source ? '<span class="iw-ca-source">원본: ' + esc(d.source.name || '') + (d.source.needsReview ? ' · 인식 결과 검토 필요' : '') + '</span>' : '<span class="iw-ca-source">등록된 보장분석 없음</span>';
    var expanded = options.expanded === true, accept = options.excelOnly ? '.xlsx,.xls' : '.xlsx,.xls,.pdf', uploadLabel = options.excelOnly ? '엑셀 불러오기' : '엑셀·PDF 불러오기';
    return '<section class="iw-coverage-analysis' + (options.page ? ' iw-ca-page' : '') + '"><header><div><h3>보장분석 표</h3>' + source + '</div>' + (options.page ? '' : '<button type="button" class="iw-btn" onclick="OSInsuworkCoverage.togglePanel(\'' + esc(customerId) + '\',this)">' + (expanded ? '접기' : '펼치기') + '</button>') + '</header><div class="iw-ca-panel" data-customer-id="' + esc(customerId) + '"' + (expanded ? '' : ' hidden') + '><div class="iw-ca-toolbar"><label class="iw-btn primary">' + uploadLabel + '<input type="file" accept="' + accept + '" hidden onchange="OSInsuworkCoverage.importFile(\'' + esc(customerId) + '\',this)"></label><button type="button" class="iw-btn" onclick="OSInsuworkCoverage.addProduct(\'' + esc(customerId) + '\')">+ 회사·상품</button><button type="button" class="iw-btn" onclick="OSInsuworkCoverage.addRow(\'' + esc(customerId) + '\',-1)">+ 담보</button><button type="button" class="iw-btn" onclick="OSInsuworkCoverage.selectAll(\'' + esc(customerId) + '\')">전체 선택</button><button type="button" class="iw-btn" onclick="OSInsuworkCoverage.selectSection(\'' + esc(customerId) + '\')">선택 담보의 섹션 선택</button><button type="button" class="iw-btn" onclick="OSInsuworkCoverage.toggleSummary(\'' + esc(customerId) + '\')">개수 ' + (d.showSummary ? '숨기기' : '보기') + '</button>' + (hiddenCount ? '<button type="button" class="iw-btn" onclick="OSInsuworkCoverage.toggleHiddenProducts(\'' + esc(customerId) + '\')">숨긴 상품 ' + hiddenCount + '개 ' + (d.showHiddenProducts ? '접기' : '보기') + '</button>' : '') + '</div>' + summaryHtml(d) + '<div class="iw-ca-table-wrap"><table><thead><tr><th class="iw-ca-check"></th><th>대분류</th><th>중분류</th><th>담보</th><th>추천금액</th>' + productHeaders + '<th></th></tr></thead><tbody>' + (body || '<tr><td colspan="' + (6 + products.length) + '"><p class="iw-ca-empty">엑셀 파일을 불러오거나 담보를 추가해 주세요.</p></td></tr>') + '</tbody></table></div><footer><span>빈 금액도 원자료로 보존되며 자동 제외되지 않습니다.</span><div><button type="button" class="iw-btn" onclick="OSInsuworkCoverage.copySelected(\'' + esc(customerId) + '\',false)">선택 복사</button>' + (options.page ? '' : '<button type="button" class="iw-btn" onclick="OSInsuworkCoverage.copySelected(\'' + esc(customerId) + '\',true)">카카오톡으로 보내기</button>') + '<button type="button" class="iw-btn primary" onclick="OSInsuworkCoverage.save(\'' + esc(customerId) + '\')">보장분석 저장</button></div></footer></div></section>';
  }
  function addProduct(customerId) { var d = draft(customerId), p = { id: uid('product'), company: '', product: '', renewal: '', premium: '', payment: '', hidden: false }; d.products.push(p); d.rows.forEach(function (r) { r.values[p.id] = ''; }); rerender(customerId); }
  function addRow(customerId, index) { var d = draft(customerId), base = index >= 0 ? d.rows[index] : d.rows[d.rows.length - 1], values = {}; d.products.forEach(function (p) { values[p.id] = ''; }); var row = { id: uid('coverage'), section: base ? base.section : '', group: base ? base.group : '', name: '', recommended: '', status: '', total: '', difference: '', values: values, hidden: false, selected: false }; d.rows.splice(index >= 0 ? index + 1 : d.rows.length, 0, row); rerender(customerId); }
  function removeRow(customerId, id) { var d = draft(customerId); d.rows = d.rows.filter(function (r) { return String(r.id) !== String(id); }); rerender(customerId); }
  function copyText(customerId) { var d = draft(customerId), rows = d.rows.filter(function (r) { return r.selected && !r.hidden; }); if (!rows.length) rows = d.rows.filter(function (r) { return !r.hidden; }); var products = d.products.filter(function (p) { return !p.hidden; }); var lines = [['구분', '분류', '담보', '추천금액'].concat(products.map(function (p) { return (p.company + ' ' + p.product).trim(); })).join('\t')]; rows.forEach(function (r) { lines.push([r.section, r.group, r.name, r.recommended].concat(products.map(function (p) { return (r.values || {})[p.id] || ''; })).join('\t')); }); return lines.join('\n'); }
  var exposed = {
    html: html, workspaceHtml: function (record) { return html(WORKSPACE_KEY, record, { expanded: true, excelOnly: true, page: true }); }, reset: reset, importFile: importFile,
    togglePanel: function (customerId, button) { var panel = button.closest('.iw-coverage-analysis').querySelector('.iw-ca-panel'), open = panel.hidden; panel.hidden = !open; button.textContent = open ? '접기' : '펼치기'; },
    setProduct: function (customerId, id, key, value) { setPath(customerId, 'product', id, key, value); },
    setRow: function (customerId, id, key, value) { setPath(customerId, 'row', id, key, value); },
    setCell: function (customerId, rowId, productId, value) { var r = draft(customerId).rows.find(function (x) { return String(x.id) === String(rowId); }); if (r) r.values[productId] = value; },
    addProduct: addProduct, addRow: addRow, removeRow: removeRow,
    toggleProduct: function (customerId, id) { var p = draft(customerId).products.find(function (x) { return String(x.id) === String(id); }); if (p) p.hidden = !p.hidden; rerender(customerId); },
    hideCompany: function (customerId, id) { var d = draft(customerId), seed = d.products.find(function (x) { return String(x.id) === String(id); }); if (!seed) return; d.products.forEach(function (p) { if (p.company === seed.company) p.hidden = true; }); rerender(customerId); },
    toggleHiddenProducts: function (customerId) { var d = draft(customerId); d.showHiddenProducts = !d.showHiddenProducts; rerender(customerId); },
    toggleSummary: function (customerId) { var d = draft(customerId); d.showSummary = !d.showSummary; rerender(customerId); },
    selectRow: function (customerId, id, checked) { var r = draft(customerId).rows.find(function (x) { return String(x.id) === String(id); }); if (r) r.selected = checked; },
    selectAll: function (customerId) { var d = draft(customerId), all = d.rows.length && d.rows.every(function (r) { return r.selected; }); d.rows.forEach(function (r) { r.selected = !all; }); rerender(customerId); },
    selectSection: function (customerId) { var d = draft(customerId), seed = d.rows.find(function (r) { return r.selected; }); if (!seed) { api().coverageError('먼저 담보 한 개를 선택해 주세요.'); return; } d.rows.forEach(function (r) { if (r.section === seed.section) r.selected = true; }); rerender(customerId); },
    save: function (customerId) { var d = draft(customerId); d.updatedAt = new Date().toISOString(); saveTarget(customerId, clone(d), null).then(function (saved) { if (saved) reset(customerId, saved); rerenderTarget(customerId); }).catch(function (e) { api().coverageError(e.message || String(e)); }); },
    importExistingPdf: function (customerId, fileId) { api().loadCoveragePdfFile(fileId).then(function (file) { return loadPdfJs().then(function () { return window.pdfjsLib.getDocument({ data: file.buffer }).promise; }).then(async function (pdf) { var pages = []; for (var i = 1; i <= Math.min(pdf.numPages, 30); i++) pages.push((await (await pdf.getPage(i)).getTextContent()).items || []); return parsePdfItems(pages, file.name); }).then(function (record) { reset(customerId, record); return api().saveCoverageAnalysis(customerId, record, null, fileId); }); }).then(function () { rerender(customerId); }).catch(function (e) { api().coverageError(e.message || String(e)); }); },
    copySelected: function (customerId, sendKakao) { var text = copyText(customerId); navigator.clipboard.writeText(text).then(function () { if (sendKakao) api().sendCoverageToKakao(customerId, text); else api().coverageNotice('선택한 보장분석 내용을 복사했습니다.'); }).catch(function () { api().coverageError('클립보드에 복사하지 못했습니다.'); }); }
  };
  window.OSInsuworkCoverage = exposed;
})();
