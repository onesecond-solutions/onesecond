(function () {
  'use strict';

  var drafts = {};
  var sheetJsPromise = null;
  var pdfJsPromise = null;

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
    if (/항암방사선.*약물치료비|암수술비/.test(text)) return '치료비1';
    if (/암.*진단|유사암.*진단/.test(text)) return '진단비';
    return '';
  }
  function flatSection(section) { return /실손/.test(String(section || '').replace(/\s+/g, '')); }
  function sectionOrder(section) {
    var text = String(section || '').replace(/\s+/g, '');
    var patterns = [/실손/, /^암$/, /뇌/, /심장/, /수술/, /배상책임/, /운전자/];
    for (var i = 0; i < patterns.length; i++) if (patterns[i].test(text)) return i;
    return patterns.length;
  }
  function normalize(record) {
    var next = Object.assign(blankRecord(), clone(record));
    next.products = (next.products || []).map(function (p) { return Object.assign({ id: uid('product'), company: '', product: '', renewal: '', premium: '', payment: '', hidden: false }, p); });
    next.rows = (next.rows || []).map(function (r) { var row = Object.assign({ id: uid('coverage'), section: '', group: '', name: '', recommended: '', status: '', total: '', difference: '', values: {}, hidden: false, selected: false }, r); if (row.section === '암') { var cancerGroup = cancerMiddleGroup(row.name); if (cancerGroup) row.group = cancerGroup; else if (/^치료비\s*[123]$/.test(row.group)) row.group = row.group.replace(/\s+/g, ''); } if (flatSection(row.section)) row.group = ''; return row; }).filter(function (row) { return !(row.section === '암' && /고액암/.test(String(row.name || '').replace(/\s+/g, ''))); });
    var cancerPositions = [], cancerRows = [], cancerOrder = { '진단비': 0, '치료비1': 1, '치료비2': 2, '치료비3': 3 };
    next.rows.forEach(function (row, index) { if (row.section === '암') { cancerPositions.push(index); cancerRows.push(row); } });
    cancerRows.sort(function (a, b) { return (Object.prototype.hasOwnProperty.call(cancerOrder, a.group) ? cancerOrder[a.group] : 99) - (Object.prototype.hasOwnProperty.call(cancerOrder, b.group) ? cancerOrder[b.group] : 99); });
    cancerPositions.forEach(function (position, index) { next.rows[position] = cancerRows[index]; });
    next.rows = next.rows.map(function (row, index) { return { row: row, index: index }; }).sort(function (a, b) { return sectionOrder(a.row.section) - sectionOrder(b.row.section) || a.index - b.index; }).map(function (item) { return item.row; });
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
  function mergedSpan(rows, index, key) {
    var value = rows[index] && rows[index][key] || '';
    if (!value || (index > 0 && rows[index - 1][key] === value)) return value ? 0 : 1;
    var span = 1;
    while (index + span < rows.length && rows[index + span][key] === value) span++;
    return span;
  }
  function setMergedField(customerId, index, key, value) {
    var d = draft(customerId), row = d.rows[index];
    if (!row) return;
    var previous = row[key] || '';
    row[key] = value;
    if (!previous) return;
    for (var i = index + 1; i < d.rows.length && d.rows[i][key] === previous; i++) d.rows[i][key] = value;
  }
  function textColumnWidth(rows, key, label, minimum, maximum) {
    var values = [label].concat(rows.map(function (row) { return row[key] || ''; }));
    var width = values.reduce(function (largest, value) { var measured = Array.from(String(value)).reduce(function (sum, ch) { return sum + (/[^\x00-\xff]/.test(ch) ? 14 : 8); }, 0) + 32; return Math.max(largest, measured); }, minimum);
    return Math.max(minimum, Math.min(maximum, width));
  }
  function html(customerId, record, options) {
    options = options || {};
    var d = draft(customerId, record), products = visibleProducts(d), hiddenCount = d.products.filter(function (p) { return p.hidden; }).length;
    var columnStyle = '--iw-ca-section-w:' + textColumnWidth(d.rows, 'section', '대분류', 82, 150) + 'px;--iw-ca-group-w:' + textColumnWidth(d.rows, 'group', '중분류', 86, 150) + 'px;--iw-ca-name-w:' + textColumnWidth(d.rows, 'name', '담보', 150, 360) + 'px;--iw-ca-total-w:' + textColumnWidth(d.rows, 'total', '합계금액', 96, 180) + 'px';
    var productHeaders = products.map(function (p) { return '<th draggable="true" ondragover="event.preventDefault()" ondrop="OSInsuworkCoverage.moveProduct(\'' + esc(customerId) + '\',event.dataTransfer.getData(\'text/plain\'),\'' + esc(p.id) + '\')" ondragstart="event.dataTransfer.setData(\'text/plain\',\'' + esc(p.id) + '\')" class="iw-ca-product' + (p.hidden ? ' is-hidden' : '') + '"><input value="' + esc(p.company) + '" placeholder="보험사" aria-label="보험사" onchange="OSInsuworkCoverage.setProduct(\'' + esc(customerId) + '\',\'' + esc(p.id) + '\',\'company\',this.value)"><input value="' + esc(p.product) + '" placeholder="상품명" aria-label="상품명" onchange="OSInsuworkCoverage.setProduct(\'' + esc(customerId) + '\',\'' + esc(p.id) + '\',\'product\',this.value)"><input value="' + esc(p.premium) + '" placeholder="보험료" aria-label="보험료" onchange="OSInsuworkCoverage.setProduct(\'' + esc(customerId) + '\',\'' + esc(p.id) + '\',\'premium\',this.value)"><div class="iw-ca-product-actions"><button type="button" onclick="OSInsuworkCoverage.toggleProduct(\'' + esc(customerId) + '\',\'' + esc(p.id) + '\')">' + (p.hidden ? '다시 표시' : '상품 숨기기') + '</button>' + (!p.hidden && p.company ? '<button type="button" onclick="OSInsuworkCoverage.hideCompany(\'' + esc(customerId) + '\',\'' + esc(p.id) + '\')">보험사 전체 숨기기</button>' : '') + '</div></th>'; }).join('');
    var sectionOrdinal = -1, lastSection = null;
    var body = d.rows.map(function (r, index) {
      var sectionSpan = mergedSpan(d.rows, index, 'section'), groupSpan = mergedSpan(d.rows, index, 'group');
      if (r.section !== lastSection) { sectionOrdinal++; lastSection = r.section; }
      var sectionRows = d.rows.filter(function (row) { return row.section === r.section; });
      var sectionChecked = sectionRows.length && sectionRows.every(function (row) { return row.selected; });
      var selectionCell = sectionSpan ? '<td rowspan="' + sectionSpan + '" class="iw-ca-check-cell"><input type="checkbox" aria-label="' + esc(r.section) + ' 전체 선택" ' + (sectionChecked ? 'checked' : '') + ' onchange="OSInsuworkCoverage.selectSection(\'' + esc(customerId) + '\',\'' + esc(r.section) + '\',this.checked)"></td>' : '';
      var flat = flatSection(r.section);
      var sectionCell = sectionSpan ? '<td rowspan="' + sectionSpan + '"' + (flat ? ' colspan="2"' : '') + ' class="iw-ca-section-cell iw-ca-merged iw-ca-section-tone-' + (sectionOrdinal % 6) + (flat ? ' iw-ca-section-flat' : '') + '"><input value="' + esc(r.section) + '" placeholder="대분류" onchange="OSInsuworkCoverage.setMergedField(\'' + esc(customerId) + '\',' + index + ',\'section\',this.value)"></td>' : '';
      var groupCell = !flat && groupSpan ? '<td rowspan="' + groupSpan + '" class="iw-ca-merged iw-ca-group-cell"><input value="' + esc(r.group) + '" placeholder="중분류" onchange="OSInsuworkCoverage.setMergedField(\'' + esc(customerId) + '\',' + index + ',\'group\',this.value)"></td>' : '';
      return '<tr draggable="true" ondragover="event.preventDefault()" ondrop="OSInsuworkCoverage.moveRow(\'' + esc(customerId) + '\',event.dataTransfer.getData(\'text/plain\'),\'' + esc(r.id) + '\')" ondragstart="event.dataTransfer.setData(\'text/plain\',\'' + esc(r.id) + '\')" class="' + (r.hidden ? 'is-hidden' : '') + '">' + selectionCell + sectionCell + groupCell + '<td class="iw-ca-name-cell"><input value="' + esc(r.name) + '" placeholder="담보명" onchange="OSInsuworkCoverage.setRow(\'' + esc(customerId) + '\',\'' + esc(r.id) + '\',\'name\',this.value)"></td><td class="iw-ca-total-cell"><input value="' + esc(r.total) + '" placeholder="합계금액" onchange="OSInsuworkCoverage.setRow(\'' + esc(customerId) + '\',\'' + esc(r.id) + '\',\'total\',this.value)"></td>' + products.map(function (p) { return '<td class="iw-ca-product-cell"><input value="' + esc((r.values || {})[p.id] || '') + '" aria-label="' + esc(r.name + ' ' + p.company) + '" onchange="OSInsuworkCoverage.setCell(\'' + esc(customerId) + '\',\'' + esc(r.id) + '\',\'' + esc(p.id) + '\',this.value)"></td>'; }).join('') + '<td class="iw-ca-row-actions"><button type="button" title="아래에 담보 삽입" onclick="OSInsuworkCoverage.addRow(\'' + esc(customerId) + '\',' + index + ')">＋</button><button type="button" title="담보 삭제" onclick="OSInsuworkCoverage.removeRow(\'' + esc(customerId) + '\',\'' + esc(r.id) + '\')">×</button></td></tr>';
    }).join('');
    var source = d.source ? '<span class="iw-ca-source">원본: ' + esc(d.source.name || '') + (d.source.needsReview ? ' · 인식 결과 검토 필요' : '') + '</span>' : '<span class="iw-ca-source">등록된 보장분석 없음</span>';
    var expanded = options.expanded === true, accept = options.excelOnly ? '.xlsx,.xls' : '.xlsx,.xls,.pdf', uploadLabel = options.excelOnly ? '엑셀 불러오기' : '엑셀·PDF 불러오기';
    return '<section class="iw-coverage-analysis' + (options.page ? ' iw-ca-page' : '') + '" style="' + columnStyle + '"><header><div><h3>보장분석 표</h3>' + source + '</div>' + (options.page ? '' : '<button type="button" class="iw-btn" onclick="OSInsuworkCoverage.togglePanel(\'' + esc(customerId) + '\',this)">' + (expanded ? '접기' : '펼치기') + '</button>') + '</header><div class="iw-ca-panel" data-customer-id="' + esc(customerId) + '"' + (expanded ? '' : ' hidden') + '><div class="iw-ca-toolbar"><label class="iw-btn primary">' + uploadLabel + '<input type="file" accept="' + accept + '" hidden onchange="OSInsuworkCoverage.importFile(\'' + esc(customerId) + '\',this)"></label><button type="button" class="iw-btn" onclick="OSInsuworkCoverage.addProduct(\'' + esc(customerId) + '\')">+ 회사·상품</button><button type="button" class="iw-btn" onclick="OSInsuworkCoverage.addRow(\'' + esc(customerId) + '\',-1)">+ 담보</button><button type="button" class="iw-btn" onclick="OSInsuworkCoverage.toggleSummary(\'' + esc(customerId) + '\')">개수 ' + (d.showSummary ? '숨기기' : '보기') + '</button>' + (hiddenCount ? '<button type="button" class="iw-btn" onclick="OSInsuworkCoverage.toggleHiddenProducts(\'' + esc(customerId) + '\')">숨긴 상품 ' + hiddenCount + '개 ' + (d.showHiddenProducts ? '접기' : '보기') + '</button>' : '') + '</div>' + summaryHtml(d) + '<div class="iw-ca-table-wrap"><table><thead><tr><th class="iw-ca-check-cell"></th><th class="iw-ca-section-cell">대분류</th><th class="iw-ca-group-cell">중분류</th><th class="iw-ca-name-cell">담보</th><th class="iw-ca-total-cell">합계금액</th>' + productHeaders + '<th></th></tr></thead><tbody>' + (body || '<tr><td colspan="' + (6 + products.length) + '"><p class="iw-ca-empty">엑셀 파일을 불러오거나 담보를 추가해 주세요.</p></td></tr>') + '</tbody></table></div><footer><span>빈 금액도 원자료로 보존되며 자동 제외되지 않습니다.</span><div><button type="button" class="iw-btn" onclick="OSInsuworkCoverage.copySelected(\'' + esc(customerId) + '\',false)">선택 화면 복사</button>' + (options.page ? '' : '<button type="button" class="iw-btn" onclick="OSInsuworkCoverage.copySelected(\'' + esc(customerId) + '\',true)">카카오톡으로 보내기</button>') + '<button type="button" class="iw-btn primary" onclick="OSInsuworkCoverage.save(\'' + esc(customerId) + '\')">보장분석 저장</button></div></footer></div></section>';
  }
  function addProduct(customerId) { var d = draft(customerId), p = { id: uid('product'), company: '', product: '', renewal: '', premium: '', payment: '', hidden: false }; d.products.push(p); d.rows.forEach(function (r) { r.values[p.id] = ''; }); rerender(customerId); }
  function addRow(customerId, index) { var d = draft(customerId), base = index >= 0 ? d.rows[index] : d.rows[d.rows.length - 1], values = {}; d.products.forEach(function (p) { values[p.id] = ''; }); var row = { id: uid('coverage'), section: base ? base.section : '', group: base ? base.group : '', name: '', recommended: '', status: '', total: '', difference: '', values: values, hidden: false, selected: false }; d.rows.splice(index >= 0 ? index + 1 : d.rows.length, 0, row); rerender(customerId); }
  function removeRow(customerId, id) { var d = draft(customerId); d.rows = d.rows.filter(function (r) { return String(r.id) !== String(id); }); rerender(customerId); }
  function moveItem(list, fromId, toId) { var from = list.findIndex(function (item) { return String(item.id) === String(fromId); }), to = list.findIndex(function (item) { return String(item.id) === String(toId); }); if (from < 0 || to < 0 || from === to) return; var item = list.splice(from, 1)[0]; list.splice(to, 0, item); }
  function moveRow(customerId, fromId, toId) { var d = draft(customerId); moveItem(d.rows, fromId, toId); rerender(customerId); }
  function moveProduct(customerId, fromId, toId) { var d = draft(customerId); var from = d.products.findIndex(function (item) { return String(item.id) === String(fromId); }), to = d.products.findIndex(function (item) { return String(item.id) === String(toId); }); if (from < 0 || to < 0 || from === to) return; var product = d.products.splice(from, 1)[0]; d.products.splice(to, 0, product); rerender(customerId); }
  function drawCell(ctx, x, y, width, height, text, options) {
    options = options || {}; ctx.fillStyle = options.fill || '#ffffff'; ctx.fillRect(x, y, width, height); ctx.strokeStyle = '#cfc8ba'; ctx.strokeRect(x + .5, y + .5, width - 1, height - 1); ctx.fillStyle = options.color || '#17345d'; ctx.font = (options.bold ? '700 ' : '400 ') + (options.size || 14) + 'px Arial, sans-serif'; ctx.textAlign = options.align || 'center'; ctx.textBaseline = 'middle';
    var padding = 10, tx = options.align === 'left' ? x + padding : x + width / 2, lines = String(text || '').split('\n'); lines.forEach(function (line, index) { ctx.fillText(line, tx, y + height / 2 + (index - (lines.length - 1) / 2) * 19, width - padding * 2); });
  }
  function coverageImageBlob(customerId) {
    var d = draft(customerId), rows = d.rows.filter(function (r) { return r.selected && !r.hidden; }), products = d.products.filter(function (p) { return !p.hidden; });
    if (!rows.length) return Promise.reject(new Error('복사할 대분류를 먼저 선택해 주세요.'));
    var widths = [110, 100, 270, 110].concat(products.map(function () { return 158; })), headerHeight = 96, rowHeight = 42, totalWidth = widths.reduce(function (sum, width) { return sum + width; }, 0), canvas = document.createElement('canvas'), scale = 2;
    canvas.width = totalWidth * scale; canvas.height = (headerHeight + rows.length * rowHeight) * scale; var ctx = canvas.getContext('2d'); ctx.scale(scale, scale); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, totalWidth, canvas.height / scale);
    var x = 0, headers = ['대분류', '중분류', '담보', '합계금액']; headers.forEach(function (label, index) { drawCell(ctx, x, 0, widths[index], headerHeight, label, { fill: '#f3efe6', bold: true }); x += widths[index]; });
    products.forEach(function (p, index) { drawCell(ctx, x, 0, widths[index + 4], headerHeight, [p.company, p.product, p.premium].filter(Boolean).join('\n'), { fill: '#f3efe6', bold: true, size: 13 }); x += widths[index + 4]; });
    var sectionColors = ['#dfe9c9', '#d7e5f5', '#e5def1', '#d8edf0', '#fae4d2', '#ececec', '#f4e2c3'];
    rows.forEach(function (row, index) { var y = headerHeight + index * rowHeight, px = widths[0] + widths[1]; drawCell(ctx, px, y, widths[2], rowHeight, row.name, { align: 'left' }); px += widths[2]; drawCell(ctx, px, y, widths[3], rowHeight, row.total, { bold: true }); px += widths[3]; products.forEach(function (p, pIndex) { drawCell(ctx, px, y, widths[pIndex + 4], rowHeight, (row.values || {})[p.id] || '', { bold: true }); px += widths[pIndex + 4]; }); });
    for (var i = 0; i < rows.length;) { var section = rows[i].section, sectionEnd = i + 1; while (sectionEnd < rows.length && rows[sectionEnd].section === section) sectionEnd++; var sectionHeight = (sectionEnd - i) * rowHeight, sectionY = headerHeight + i * rowHeight, tone = sectionColors[sectionOrder(section)] || '#f3efe6'; if (flatSection(section)) drawCell(ctx, 0, sectionY, widths[0] + widths[1], sectionHeight, section, { fill: tone, bold: true }); else { drawCell(ctx, 0, sectionY, widths[0], sectionHeight, section, { fill: tone, bold: true }); for (var g = i; g < sectionEnd;) { var group = rows[g].group, groupEnd = g + 1; while (groupEnd < sectionEnd && rows[groupEnd].group === group) groupEnd++; drawCell(ctx, widths[0], headerHeight + g * rowHeight, widths[1], (groupEnd - g) * rowHeight, group, { fill: '#f5f1e8', bold: true }); g = groupEnd; } } i = sectionEnd; }
    return new Promise(function (resolve, reject) { canvas.toBlob(function (blob) { if (blob) resolve(blob); else reject(new Error('선택 화면 이미지를 만들지 못했습니다.')); }, 'image/png'); });
  }
  function copyCoverageImage(customerId) {
    if (!navigator.clipboard || !window.ClipboardItem) return Promise.reject(new Error('이 브라우저에서는 이미지 복사를 지원하지 않습니다.'));
    return coverageImageBlob(customerId).then(function (blob) { return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); });
  }
  function copyText(customerId) { var d = draft(customerId), rows = d.rows.filter(function (r) { return r.selected && !r.hidden; }); if (!rows.length) rows = d.rows.filter(function (r) { return !r.hidden; }); var products = d.products.filter(function (p) { return !p.hidden; }); var lines = [['대분류', '중분류', '담보', '합계금액'].concat(products.map(function (p) { return (p.company + ' ' + p.product).trim(); })).join('\t')]; rows.forEach(function (r) { lines.push([r.section, r.group, r.name, r.total].concat(products.map(function (p) { return (r.values || {})[p.id] || ''; })).join('\t')); }); return lines.join('\n'); }
  function workspaceHtml(record) {
    var markup = html(WORKSPACE_KEY, record || workspaceStarter(), { expanded: true, excelOnly: true, page: true });
    var copyButton = '<button type="button" class="iw-btn" onclick="OSInsuworkCoverage.copySelected(\'' + WORKSPACE_KEY + '\',false)">선택 화면 복사</button>';
    var saveButton = '<button type="button" class="iw-btn primary" onclick="OSInsuworkCoverage.save(\'' + WORKSPACE_KEY + '\')">보장분석 저장</button>';
    var orderedButtons = '<button type="button" class="iw-btn" onclick="OSInsuworkCoverage.save(\'' + WORKSPACE_KEY + '\')">기본 양식 편집저장</button>' + copyButton + '<button type="button" class="iw-btn primary" onclick="OSInsuworkCoverage.saveWorkspaceToCustomer()">보장분석·보험비교 저장</button>';
    return markup.replace(copyButton + saveButton, orderedButtons).replace('<h3>보장분석 표</h3>', '<h3>보장분석·보험비교 표</h3>').replace('등록된 보장분석 없음', '등록된 보장분석·보험비교 없음');
  }
  var exposed = {
    html: html, workspaceHtml: workspaceHtml, reset: reset, importFile: importFile,
    togglePanel: function (customerId, button) { var panel = button.closest('.iw-coverage-analysis').querySelector('.iw-ca-panel'), open = panel.hidden; panel.hidden = !open; button.textContent = open ? '접기' : '펼치기'; },
    setProduct: function (customerId, id, key, value) { setPath(customerId, 'product', id, key, value); },
    setRow: function (customerId, id, key, value) { setPath(customerId, 'row', id, key, value); }, setMergedField: setMergedField,
    setCell: function (customerId, rowId, productId, value) { var r = draft(customerId).rows.find(function (x) { return String(x.id) === String(rowId); }); if (r) r.values[productId] = value; },
    addProduct: addProduct, addRow: addRow, removeRow: removeRow,
    toggleProduct: function (customerId, id) { var p = draft(customerId).products.find(function (x) { return String(x.id) === String(id); }); if (p) p.hidden = !p.hidden; rerender(customerId); },
    hideCompany: function (customerId, id) { var d = draft(customerId), seed = d.products.find(function (x) { return String(x.id) === String(id); }); if (!seed) return; d.products.forEach(function (p) { if (p.company === seed.company) p.hidden = true; }); rerender(customerId); },
    toggleHiddenProducts: function (customerId) { var d = draft(customerId); d.showHiddenProducts = !d.showHiddenProducts; rerender(customerId); },
    toggleSummary: function (customerId) { var d = draft(customerId); d.showSummary = !d.showSummary; rerender(customerId); },
    selectSection: function (customerId, section, checked) { var d = draft(customerId); d.rows.forEach(function (r) { if (r.section === section) r.selected = checked; }); rerender(customerId); },
    moveRow: moveRow, moveProduct: moveProduct,
    save: function (customerId) { var d = draft(customerId); delete d._starter; delete d._templateSeed; d.updatedAt = new Date().toISOString(); saveTarget(customerId, clone(d), null).then(function (saved) { if (saved) reset(customerId, saved); rerenderTarget(customerId); }).catch(function (e) { api().coverageError(e.message || String(e)); }); },
    saveWorkspaceToCustomer: function () { var d = clone(draft(WORKSPACE_KEY)); delete d._starter; delete d._templateSeed; delete d.sourceItemId; d.source = null; d.updatedAt = new Date().toISOString(); api().saveCoverageWorkspaceToCustomer(d).catch(function (e) { api().coverageError(e.message || String(e)); }); },
    importExistingPdf: function (customerId, fileId) { api().loadCoveragePdfFile(fileId).then(function (file) { return loadPdfJs().then(function () { return window.pdfjsLib.getDocument({ data: file.buffer }).promise; }).then(async function (pdf) { var pages = []; for (var i = 1; i <= Math.min(pdf.numPages, 30); i++) pages.push((await (await pdf.getPage(i)).getTextContent()).items || []); return parsePdfItems(pages, file.name); }).then(function (record) { reset(customerId, record); return api().saveCoverageAnalysis(customerId, record, null, fileId); }); }).then(function () { rerender(customerId); }).catch(function (e) { api().coverageError(e.message || String(e)); }); },
    copySelected: function (customerId, sendKakao) { var text = copyText(customerId); copyCoverageImage(customerId).then(function () { api().coverageNotice('선택한 보장분석 표를 이미지로 복사했습니다. 카카오톡에 붙여넣어 주세요.'); if (sendKakao) api().sendCoverageToKakao(customerId, text); }).catch(function (error) { api().coverageError(error.message || '선택 화면을 복사하지 못했습니다.'); }); }
  };
  window.OSInsuworkCoverage = exposed;
})();
