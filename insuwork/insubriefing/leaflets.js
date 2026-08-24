/**
 * insubriefing/leaflets.js
 * 보험브리핑 홈 "리플렛 캘린더". 로그인 여부와 무관하게 전체 공개(public.briefing_leaflets
 * anon SELECT + briefing-leaflets 공개 버킷). 업로드(드래그 앤 드롭)는 대표 계정만.
 *
 * 1장 드롭 = 이미지 그대로 저장. 2장 이상 함께 드롭 = pdf-lib로 1개 PDF로 병합 저장.
 * 클릭 시 미리보기는 insubriefing/leaflet-preview.js(LeafletPreview.open) 재사용.
 * 월/주/일/목록 보기 전환 + 공휴일·절기 표시는 js/insuwork.js 보험워크
 * 캘린더의 동일 로직을 이식(일정 등록·수정 등 개인업무 기능은 이 공개 화면에는 넣지 않음).
 */
(function () {
  'use strict';

  var PILOT_ID = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';
  var BUCKET = 'briefing-leaflets';
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  var state = { mode: 'month', cursor: new Date(), itemsByDate: {}, pdfLibPromise: null, loading: false, agendaRows: null, monthCap: 5, selectedDate: '' };
  var MAX_FILE_SIZE = 20 * 1024 * 1024;
  var OFFICE_EXTENSIONS = ['xls', 'xlsx', 'csv', 'doc', 'docx', 'ppt', 'pptx', 'hwp', 'hwpx', 'odt', 'ods', 'odp', 'rtf'];
  var TEXT_EXTENSIONS = ['txt', 'md', 'log', 'json', 'xml', 'yaml', 'yml'];

  function esc(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]; }); }
  function pad2(n) { return n < 10 ? '0' + n : String(n); }
  function ymd(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function parseDate(value) { var p = String(value).slice(0, 10).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(value, count) { var d = typeof value === 'string' ? parseDate(value) : new Date(value); d.setDate(d.getDate() + count); return ymd(d); }
  function startOfWeek(date) { var d = new Date(date); d.setDate(d.getDate() - d.getDay()); return d; }
  function monthThumbCap() { return window.innerWidth <= 560 ? 2 : window.innerWidth <= 900 ? 3 : 5; }
  function currentUser() { try { return JSON.parse(localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}'); } catch (e) { return {}; } }
  function isPilot() { return String(currentUser().id || '') === PILOT_ID; }
  function publicUrl(path) { return (window.SUPABASE_URL || '') + '/storage/v1/object/public/' + BUCKET + '/' + String(path).split('/').map(encodeURIComponent).join('/'); }
  function fileExtension(name) { var clean = String(name || '').split('?')[0], dot = clean.lastIndexOf('.'); return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : ''; }
  function formatBytes(bytes) { var size = Number(bytes || 0); if (!size) return ''; return size < 1024 * 1024 ? Math.max(1, Math.round(size / 1024)) + 'KB' : (size / 1024 / 1024).toFixed(1) + 'MB'; }
  function encodeStoredName(value) {
    var bytes = new TextEncoder().encode(String(value || '파일')), binary = '';
    Array.prototype.forEach.call(bytes, function (byte) { binary += String.fromCharCode(byte); });
    return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  function decodeStoredName(value) {
    try {
      var encoded = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
      while (encoded.length % 4) encoded += '=';
      var binary = window.atob(encoded), bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    } catch (e) { return ''; }
  }
  function originalName(path) {
    var base = String(path || '').split('/').pop() || '', marker = base.indexOf('--');
    if (marker < 0) return base;
    var stored = base.slice(marker + 2);
    return stored.indexOf('b64_') === 0 ? (decodeStoredName(stored.slice(4)) || stored) : stored;
  }
  function safeFileName(name) { return String(name || '파일').replace(/[\\/:*?"<>|%]/g, '_').replace(/\s+/g, ' ').trim().slice(-120) || '파일'; }
  function normalizedHttpUrl(value) { try { var raw = String(value || '').trim(); if (!/^https?:\/\/\S+$/i.test(raw)) return ''; var url = new URL(raw); return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : ''; } catch (e) { return ''; } }
  function linkName(url) { try { return (new URL(url).hostname || '링크') + '.url'; } catch (e) { return '링크.url'; } }
  function fileKind(file) {
    var ext = fileExtension(file && file.name), mime = String(file && file.type || '').toLowerCase();
    if (/^image\//.test(mime) || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif'].indexOf(ext) >= 0) return 'image';
    if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
    if (mime === 'text/uri-list' || ext === 'url') return 'link';
    if (OFFICE_EXTENSIONS.indexOf(ext) >= 0) return 'document';
    if (/^text\//.test(mime) || TEXT_EXTENSIONS.indexOf(ext) >= 0) return 'text';
    return '';
  }
  function showNotice(message) {
    if (window.InsuranceBriefingNotice && typeof window.InsuranceBriefingNotice.alert === 'function') { window.InsuranceBriefingNotice.alert(message); return; }
    if (typeof window.toast === 'function') { window.toast(message); return; }
    var notice = document.createElement('div');
    notice.className = 'ib-leaflet-notice'; notice.setAttribute('role', 'status'); notice.textContent = message;
    document.body.appendChild(notice);
    window.setTimeout(function () { notice.remove(); }, 3200);
  }
  function confirmAction(title, message, confirmLabel, dangerous) {
    if (window.InsuranceBriefingNotice && typeof window.InsuranceBriefingNotice.confirm === 'function') {
      return window.InsuranceBriefingNotice.confirm({ title: title, message: message, confirmLabel: confirmLabel || '확인', dangerous: !!dangerous });
    }
    return new Promise(function (resolve) {
      var dialog = document.createElement('dialog');
      dialog.className = 'ib-confirm-dialog';
      dialog.innerHTML = '<form method="dialog"><span class="ib-confirm-brand">인슈워크</span><h2></h2><p></p><div class="ib-confirm-actions"><button type="submit" value="cancel">취소</button><button type="submit" value="confirm" class="ib-confirm-submit">확인</button></div></form>';
      dialog.querySelector('h2').textContent = title;
      dialog.querySelector('p').textContent = message;
      var submit = dialog.querySelector('.ib-confirm-submit');
      submit.textContent = confirmLabel || '확인';
      if (dangerous) submit.classList.add('is-danger');
      document.body.appendChild(dialog);
      dialog.addEventListener('cancel', function (e) { e.preventDefault(); dialog.close('cancel'); });
      dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close('cancel'); });
      dialog.addEventListener('close', function () { var confirmed = dialog.returnValue === 'confirm'; dialog.remove(); resolve(confirmed); }, { once: true });
      dialog.showModal();
    });
  }

  // ── 공휴일·절기(보험워크 캘린더와 동일 로직 이식, 일정 CRUD는 제외) ──────
  var SOLAR_TERM_NAMES = ['소한', '대한', '입춘', '우수', '경칩', '춘분', '청명', '곡우', '입하', '소만', '망종', '하지', '소서', '대서', '입추', '처서', '백로', '추분', '한로', '상강', '입동', '소설', '대설', '동지'];
  var SOLAR_TERM_MINUTES = [0, 21208, 42467, 63836, 85337, 107014, 128867, 150921, 173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033, 353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758];
  var LUNAR_HOLIDAYS = [[2020, '2020-01-25', '2020-04-30', '2020-10-01'], [2021, '2021-02-12', '2021-05-19', '2021-09-21'], [2022, '2022-02-01', '2022-05-08', '2022-09-10'], [2023, '2023-01-22', '2023-05-26', '2023-09-29'], [2024, '2024-02-10', '2024-05-15', '2024-09-17'], [2025, '2025-01-29', '2025-05-05', '2025-10-06'], [2026, '2026-02-17', '2026-05-24', '2026-09-25'], [2027, '2027-02-06', '2027-05-13', '2027-09-15'], [2028, '2028-01-26', '2028-05-02', '2028-10-03'], [2029, '2029-02-13', '2029-05-20', '2029-09-22'], [2030, '2030-02-03', '2030-05-09', '2030-09-12'], [2031, '2031-01-23', '2031-05-28', '2031-10-01'], [2032, '2032-02-11', '2032-05-16', '2032-09-19'], [2033, '2033-01-31', '2033-05-06', '2033-09-08'], [2034, '2034-02-19', '2034-05-25', '2034-09-27'], [2035, '2035-02-08', '2035-05-15', '2035-09-16']];
  var builtinCache = {};
  function builtinEvent(date, title, kind) { return { date: date, title: title, kind: kind }; }
  function utcKey(date) { return date.getUTCFullYear() + '-' + pad2(date.getUTCMonth() + 1) + '-' + pad2(date.getUTCDate()); }
  function solarTermsForYear(year) {
    return SOLAR_TERM_NAMES.map(function (name, index) {
      var instant = new Date(Date.UTC(1900, 0, 6, 2, 5) + 31556925974.7 * (year - 1900) + SOLAR_TERM_MINUTES[index] * 60000);
      return builtinEvent(utcKey(instant), name, 'term');
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
      var date = year + '-' + pad2(entry[0]) + '-' + pad2(entry[1]);
      list.push(builtinEvent(date, entry[2], entry[3] ? 'holiday' : 'memorial'));
      if (entry[3]) occupied[date] = true;
      if (entry[3] && entry[4]) substitutes.push({ title: entry[2], dates: [date], trigger: 'weekend' });
    });
    (LUNAR_HOLIDAYS.find(function (row) { return row[0] === year; }) || []).slice(1).forEach(function (date, index) {
      var title = index === 0 ? '설날' : index === 1 ? '부처님오신날' : '추석', offsets = index === 1 ? [0] : [-1, 0, 1], dates = offsets.map(function (offset) { return addDays(date, offset); });
      dates.forEach(function (target, offsetIndex) { var suffix = offsets[offsetIndex] === 0 ? '' : ' 연휴'; list.push(builtinEvent(target, title + suffix, 'holiday')); occupied[target] = true; });
      substitutes.push({ title: title, dates: dates, trigger: index === 1 ? 'weekend' : 'sunday' });
    });
    substitutes.forEach(function (target) {
      var needs = target.dates.some(function (date) { var day = weekdayNumber(date); return target.trigger === 'weekend' ? day === 0 || day === 6 : day === 0; });
      if (!needs) return;
      var substitute = nextSubstituteDate(target.dates[target.dates.length - 1], occupied);
      occupied[substitute] = true;
      list.push(builtinEvent(substitute, target.title + ' 대체공휴일', 'holiday'));
    });
    list = list.concat(solarTermsForYear(year)).sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    builtinCache[year] = list;
    return list.slice();
  }
  function holidaysForDate(dateStr) {
    var year = Number(String(dateStr).slice(0, 4));
    return builtinCalendarEvents(year).filter(function (e) { return e.date === dateStr; });
  }

  // ── 데이터 조회(공개, anon) ──────────────────────────────────────────────
  function loadRange(start, end, done) {
    if (!window.db || !window.db.fetchPublic) return;
    state.loading = true; render();
    window.db.fetchPublic('/rest/v1/briefing_leaflets?received_date=gte.' + start + '&received_date=lte.' + end + '&order=received_date.asc,sort_order.asc&select=id,file_type,storage_path,mime_type,file_size,received_date,sort_order')
      .then(function (res) { return res.ok ? res.json() : []; })
      .then(function (rows) {
        var map = {};
        (rows || []).forEach(function (row) { (map[row.received_date] = map[row.received_date] || []).push(row); });
        state.itemsByDate = map; state.loading = false; if (done) done(); render();
      })
      .catch(function () { state.loading = false; render(); });
  }
  function loadAgenda() {
    if (!window.db || !window.db.fetchPublic) return;
    state.loading = true; render();
    var end = ymd(new Date()), start = addDays(end, -120);
    window.db.fetchPublic('/rest/v1/briefing_leaflets?received_date=gte.' + start + '&received_date=lte.' + end + '&order=received_date.desc,sort_order.asc&select=id,file_type,storage_path,mime_type,file_size,received_date,sort_order')
      .then(function (res) { return res.ok ? res.json() : []; })
      .then(function (rows) {
        var map = {}, order = [];
        (rows || []).forEach(function (row) { if (!map[row.received_date]) { map[row.received_date] = []; order.push(row.received_date); } map[row.received_date].push(row); });
        state.agendaRows = order.map(function (date) { return { date: date, items: map[date] }; });
        state.loading = false; render();
      })
      .catch(function () { state.loading = false; render(); });
  }

  // ── 툴바(모드 전환 + 이전/다음 + 오늘) ──────────────────────────────────
  function toolbarLabel() {
    var c = state.cursor;
    if (state.mode === 'month') return c.getFullYear() + '년 ' + (c.getMonth() + 1) + '월';
    if (state.mode === 'day') return (c.getMonth() + 1) + '월 ' + c.getDate() + '일 (' + DOW[c.getDay()] + ')';
    if (state.mode === 'week') { var s = startOfWeek(c), e = new Date(s); e.setDate(e.getDate() + 6); return (s.getMonth() + 1) + '.' + s.getDate() + ' - ' + (e.getMonth() + 1) + '.' + e.getDate(); }
    return '최근 리플렛';
  }
  function renderToolbar() {
    var label = document.getElementById('ib-leaflet-month-label'); if (label) label.textContent = toolbarLabel();
    var modes = document.querySelectorAll('.ib-leaflet-mode');
    Array.prototype.forEach.call(modes, function (btn) { btn.classList.toggle('on', btn.getAttribute('data-mode') === state.mode); });
    var nav = document.getElementById('ib-leaflet-nav-arrows'); if (nav) nav.hidden = state.mode === 'agenda';
  }

  function setMode(mode) {
    state.mode = mode; state.selectedDate = ''; renderToolbar();
    if (mode === 'agenda') { loadAgenda(); return; }
    loadForCursor();
  }
  function loadForCursor() {
    var c = state.cursor;
    if (state.mode === 'month') { var start = c.getFullYear() + '-' + pad2(c.getMonth() + 1) + '-01', endD = new Date(c.getFullYear(), c.getMonth() + 1, 0), end = c.getFullYear() + '-' + pad2(c.getMonth() + 1) + '-' + pad2(endD.getDate()); loadRange(start, end); return; }
    if (state.mode === 'week') { var s = startOfWeek(c), e = new Date(s); e.setDate(e.getDate() + 6); loadRange(ymd(s), ymd(e)); return; }
    loadRange(ymd(c), ymd(c));
  }
  function moveCursor(delta) {
    var c = new Date(state.cursor);
    if (state.mode === 'month') c.setMonth(c.getMonth() + delta);
    else if (state.mode === 'week') c.setDate(c.getDate() + delta * 7);
    else c.setDate(c.getDate() + delta);
    state.cursor = c; state.selectedDate = ''; renderToolbar(); loadForCursor();
  }
  function goToday() { state.cursor = new Date(); state.selectedDate = ''; renderToolbar(); if (state.mode === 'agenda') loadAgenda(); else loadForCursor(); }
  function goToDate(dateStr) { state.cursor = parseDate(dateStr); state.mode = 'day'; state.selectedDate = ''; renderToolbar(); loadForCursor(); }

  // ── 렌더 디스패치 ────────────────────────────────────────────────────────
  function render() {
    var host = document.getElementById('ib-leaflet-grid'); if (!host) return;
    host.classList.toggle('is-loading', state.loading);
    if (state.mode === 'month') renderMonth(host);
    else if (state.mode === 'week') renderWeek(host);
    else if (state.mode === 'day') renderDay(host);
    else renderAgenda(host);
    hydratePdfThumbs(); bindThumbEvents(); if (isPilot()) bindDropEvents();
  }

  function dayCellHtml(dateStr, opts) {
    opts = opts || {};
    var items = state.itemsByDate[dateStr] || [];
    var holidays = holidaysForDate(dateStr);
    var todayStr = ymd(new Date());
    var isToday = dateStr === todayStr;
    var admin = isPilot();
    var cap = opts.cap || 0;
    var shown = cap ? items.slice(0, cap) : items;
    var overflow = cap && items.length > cap ? items.length - cap : 0;
    var thumbs = shown.map(function (item) {
      var url = publicUrl(item.storage_path), name = originalName(item.storage_path), ext = fileExtension(name);
      var kind = fileKind({ name: name, type: item.mime_type || '' }), isPdf = kind === 'pdf', isDocument = kind === 'document' || kind === 'text' || kind === 'link';
      var content = isPdf ? '<span class="ib-leaflet-pdf-badge">PDF</span>' : isDocument
        ? '<span class="ib-leaflet-file-card"><b>' + esc(kind === 'link' ? 'LINK' : (ext || 'FILE').toUpperCase()) + '</b><small>' + esc(name) + '</small><em>' + esc(formatBytes(item.file_size)) + '</em></span>'
        : '<img loading="lazy" src="' + esc(url) + '" alt="리플렛">';
      return '<span class="ib-leaflet-thumb' + (isPdf ? ' is-pdf' : '') + (isDocument ? ' is-document' : '') + '" data-id="' + esc(item.id) + '" data-path="' + esc(item.storage_path) + '" data-url="' + esc(url) + '" data-name="' + esc(name || dateStr + ' 리플렛') + '" data-mime="' + esc(item.mime_type || '') + '" data-kind="' + esc(kind) + '" data-pdf="' + (isPdf ? '1' : '0') + '">'
        + content
        + (admin ? '<button type="button" class="ib-leaflet-delete" aria-label="리플렛 삭제" title="삭제">×</button>' : '')
        + '</span>';
    }).join('');
    var holidayHtml = holidays.map(function (h) { return '<span class="ib-leaflet-holiday ib-leaflet-holiday-' + h.kind + '">' + esc(h.title) + '</span>'; }).join('');
    var moreHtml = overflow ? '<button type="button" class="ib-leaflet-more" data-date="' + esc(dateStr) + '">+' + overflow + '개 더보기</button>' : '';
    return '<div class="ib-leaflet-day' + (isToday ? ' is-today' : '') + (admin ? ' is-droppable' : '') + (state.selectedDate === dateStr ? ' is-selected' : '') + (opts.cls ? ' ' + opts.cls : '') + '" data-date="' + esc(dateStr) + '"' + (admin ? ' tabindex="0" role="button" aria-label="' + esc(dateStr) + ' 자료 등록 날짜 선택"' : '') + '>'
      + '<span class="ib-leaflet-daynum">' + parseDate(dateStr).getDate() + '</span>'
      + holidayHtml
      + '<div class="ib-leaflet-thumbs">' + thumbs + '</div>' + moreHtml + '</div>';
  }

  function renderMonth(host) {
    var c = state.cursor, year = c.getFullYear(), month = c.getMonth();
    var cap = state.monthCap;
    var first = new Date(year, month, 1), startOffset = first.getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var html = '<div class="ib-leaflet-grid-month">' + DOW.map(function (d) { return '<div class="ib-leaflet-dow">' + d + '</div>'; }).join('');
    var leadStart = addDays(year + '-' + pad2(month + 1) + '-01', -startOffset);
    for (var i = 0; i < startOffset; i++) html += dayCellHtml(addDays(leadStart, i), { cls: 'is-other', cap: cap });
    for (var day = 1; day <= daysInMonth; day++) html += dayCellHtml(year + '-' + pad2(month + 1) + '-' + pad2(day), { cap: cap });
    html += '</div>';
    host.innerHTML = html;
    bindMoreEvents();
  }

  function renderWeek(host) {
    var s = startOfWeek(state.cursor);
    var html = '<div class="ib-leaflet-grid-week">';
    for (var i = 0; i < 7; i++) html += dayCellHtml(addDays(ymd(s), i), { cls: 'ib-leaflet-week-day' });
    html += '</div>';
    host.innerHTML = html;
  }

  function renderDay(host) {
    host.innerHTML = '<div class="ib-leaflet-grid-day">' + dayCellHtml(ymd(state.cursor), { cls: 'ib-leaflet-day-view' }) + '</div>';
  }

  function renderAgenda(host) {
    var rows = state.agendaRows;
    if (!rows) { host.innerHTML = '<div class="ib-leaflet-agenda-empty">불러오는 중…</div>'; return; }
    if (!rows.length) { host.innerHTML = '<div class="ib-leaflet-agenda-empty">최근 120일 안에 등록된 리플렛이 없습니다.</div>'; return; }
    var html = '<div class="ib-leaflet-agenda">' + rows.map(function (row) {
      var d = parseDate(row.date);
      return dayCellHtml(row.date, { cls: 'ib-leaflet-agenda-row' });
    }).join('') + '</div>';
    host.innerHTML = html;
  }

  function bindMoreEvents() {
    var nodes = document.querySelectorAll('#ib-leaflet-grid .ib-leaflet-more');
    Array.prototype.forEach.call(nodes, function (btn) {
      btn.addEventListener('click', function (e) { e.stopPropagation(); goToDate(btn.getAttribute('data-date')); });
    });
  }

  // ── PDF 첫 페이지 썸네일(지연 렌더) ──────────────────────────────────────
  function loadPdfJsForThumb() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-lfp-pdfjs]');
      if (existing) { existing.addEventListener('load', function () { resolve(window.pdfjsLib); }); return; }
      var script = document.createElement('script');
      script.setAttribute('data-lfp-pdfjs', '1');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; resolve(window.pdfjsLib); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  function hydratePdfThumbs() {
    var nodes = document.querySelectorAll('#ib-leaflet-grid .ib-leaflet-thumb.is-pdf');
    if (!nodes.length) return;
    loadPdfJsForThumb().then(function (pdfjsLib) {
      Array.prototype.forEach.call(nodes, function (node) {
        var url = node.getAttribute('data-url');
        fetch(url).then(function (r) { return r.arrayBuffer(); })
          .then(function (buf) { return pdfjsLib.getDocument({ data: buf }).promise; })
          .then(function (doc) { return doc.getPage(1); })
          .then(function (page) {
            var viewport = page.getViewport({ scale: .3 }), canvas = document.createElement('canvas');
            canvas.width = viewport.width; canvas.height = viewport.height;
            return page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise.then(function () {
              var badge = node.querySelector('.ib-leaflet-pdf-badge');
              node.insertBefore(canvas, badge);
            });
          }).catch(function () {});
      });
    }).catch(function () {});
  }

  // ── 클릭 미리보기 + 호버 확대 ────────────────────────────────────────────
  var hoverEl = null;
  function bindThumbEvents() {
    var nodes = document.querySelectorAll('#ib-leaflet-grid .ib-leaflet-thumb');
    Array.prototype.forEach.call(nodes, function (node) {
      node.addEventListener('click', function (e) {
        e.stopPropagation();
        var kind = node.getAttribute('data-kind');
        if (kind === 'document') downloadFile(node.getAttribute('data-url'), node.getAttribute('data-name'));
        else if (kind === 'link') openStoredLink(node.getAttribute('data-url'));
        else if (kind === 'text') openTextPreview(node.getAttribute('data-url'), node.getAttribute('data-name'));
        else if (window.LeafletPreview) window.LeafletPreview.open(node.getAttribute('data-url'), node.getAttribute('data-name'), node.getAttribute('data-mime'));
      });
      node.addEventListener('mouseenter', function () { showHover(node); });
      node.addEventListener('mouseleave', hideHover);
    });
    if (isPilot()) bindDeleteEvents();
  }
  function bindDeleteEvents() {
    var buttons = document.querySelectorAll('#ib-leaflet-grid .ib-leaflet-delete');
    Array.prototype.forEach.call(buttons, function (button) {
      button.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        var thumb = button.closest('.ib-leaflet-thumb');
        if (!thumb) return;
        confirmAction('리플렛 삭제', '삭제한 자료는 다시 복구할 수 없습니다. 삭제할까요?').then(function (confirmed) {
          if (confirmed) deleteLeaflet(thumb.getAttribute('data-id'), thumb.getAttribute('data-path'), button);
        });
      });
    });
  }
  function downloadFile(url, name) {
    var link = document.createElement('a');
    link.href = url; link.download = name || ''; link.target = '_blank'; link.rel = 'noopener';
    document.body.appendChild(link); link.click(); link.remove();
  }
  function openStoredLink(url) {
    fetch(url).then(function (res) { if (!res.ok) throw new Error('링크를 불러오지 못했습니다.'); return res.text(); })
      .then(function (content) {
        var target = normalizedHttpUrl(content) || normalizedHttpUrl((String(content).match(/^URL=(.+)$/im) || [])[1]);
        if (!target) throw new Error('안전하지 않거나 올바르지 않은 URL입니다.');
        window.open(target, '_blank', 'noopener');
      }).catch(function (err) { showNotice(err.message || '링크를 열지 못했습니다.'); });
  }
  function renderLinkedText(host, content) {
    var regex = /https?:\/\/[^\s<>"']+/gi, cursor = 0, match;
    while ((match = regex.exec(content))) {
      if (match.index > cursor) host.appendChild(document.createTextNode(content.slice(cursor, match.index)));
      var href = normalizedHttpUrl(match[0]);
      if (href) { var link = document.createElement('a'); link.href = href; link.target = '_blank'; link.rel = 'noopener'; link.textContent = match[0]; host.appendChild(link); }
      else host.appendChild(document.createTextNode(match[0]));
      cursor = regex.lastIndex;
    }
    if (cursor < content.length) host.appendChild(document.createTextNode(content.slice(cursor)));
  }
  function openTextPreview(url, name) {
    fetch(url).then(function (res) { if (!res.ok) throw new Error('텍스트를 불러오지 못했습니다.'); return res.text(); })
      .then(function (content) {
        var dialog = document.createElement('dialog');
        dialog.className = 'ib-text-dialog';
        dialog.innerHTML = '<div class="ib-text-head"><div><span>인슈워크</span><h2></h2></div><button type="button" aria-label="닫기">×</button></div><pre></pre><div class="ib-text-actions"><a target="_blank" rel="noopener" download>다운로드</a></div>';
        dialog.querySelector('h2').textContent = name || '텍스트 자료';
        renderLinkedText(dialog.querySelector('pre'), content);
        var close = dialog.querySelector('button'), download = dialog.querySelector('a');
        close.addEventListener('click', function () { dialog.close(); });
        download.href = url; download.download = name || '';
        dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
        dialog.addEventListener('close', function () { dialog.remove(); }, { once: true });
        document.body.appendChild(dialog); dialog.showModal();
      }).catch(function (err) { showNotice(err.message || '텍스트를 불러오지 못했습니다.'); });
  }
  function showHover(node) {
    if (node.getAttribute('data-pdf') === '1') return; // PDF는 클릭 미리보기로만(호버 확대는 이미지만)
    hideHover();
    var rect = node.getBoundingClientRect();
    hoverEl = document.createElement('div');
    hoverEl.className = 'ib-leaflet-hover';
    hoverEl.innerHTML = '<img src="' + esc(node.getAttribute('data-url')) + '" alt="">';
    document.body.appendChild(hoverEl);
    var hoverRect = hoverEl.getBoundingClientRect(), gap = 8;
    var top = rect.top - hoverRect.height - gap;
    if (top < gap) top = Math.max(gap, Math.min(window.innerHeight - hoverRect.height - gap, rect.bottom + gap));
    var left = Math.min(Math.max(gap, rect.left), Math.max(gap, window.innerWidth - hoverRect.width - gap));
    hoverEl.style.top = top + 'px'; hoverEl.style.left = left + 'px';
  }
  function hideHover() { if (hoverEl) { hoverEl.remove(); hoverEl = null; } }

  // ── pdf-lib 지연 로드 + 이미지 여러 장 → PDF 병합 ────────────────────────
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
      var canvas = document.createElement('canvas');
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0);
      return new Promise(function (resolve) { canvas.toBlob(function (blob) { blob.arrayBuffer().then(resolve); }, 'image/jpeg', .92); });
    });
  }
  function mergeImagesToPdf(files) {
    return loadPdfLib().then(function (PDFLib) {
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
    });
  }

  // ── 업로드(대표 전용) ────────────────────────────────────────────────────
  function uploadError(response, fallback) {
    var status = response && response.status;
    return response.clone().json().catch(function () { return {}; }).then(function (payload) {
      var serverMessage = payload && (payload.message || payload.error || payload.error_description);
      var message = fallback || '업로드에 실패했습니다.';
      if (status === 401) message = '로그인 인증이 만료되었습니다. 잠시 후 다시 시도해 주세요.';
      else if (status === 403) message = '캘린더 저장 권한이 없습니다.';
      else if (status === 413) message = '파일이 20MB 업로드 제한을 초과했습니다.';
      else if (status === 507 || /storage|quota|limit|exceed/i.test(String(serverMessage || ''))) message = '캘린더 저장소 용량을 확인해 주세요.';
      else if (serverMessage) message += ' (' + serverMessage + ')';
      var error = new Error(message);
      error.status = status;
      return error;
    });
  }
  function deleteLeaflet(id, storagePath, button) {
    if (!id || !storagePath || !window.db || !window.db.fetch) return;
    hideHover();
    button.disabled = true;
    var encodedPath = String(storagePath).split('/').map(encodeURIComponent).join('/');
    window.db.fetch('/storage/v1/object/' + BUCKET + '/' + encodedPath, { method: 'DELETE' })
      .then(function (res) {
        if (!res.ok && res.status !== 404) return uploadError(res, '저장 파일 삭제에 실패했습니다.').then(function (error) { throw error; });
        return window.db.fetch('/rest/v1/briefing_leaflets?id=eq.' + encodeURIComponent(id), {
          method: 'DELETE',
          headers: { Prefer: 'return=minimal' }
        });
      })
      .then(function (res) {
        if (!res.ok) return uploadError(res, '캘린더 기록 삭제에 실패했습니다.').then(function (error) { throw error; });
        reloadCurrent();
        showNotice('리플렛을 삭제했습니다.');
      })
      .catch(function (err) {
        button.disabled = false;
        showNotice(err.message || '삭제에 실패했습니다.');
      });
  }
  function uploadBlob(blob, fileType, mimeType, receivedDate, pageCount, ext, sourceName) {
    var owner = currentUser().id;
    var id = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    var storedName = safeFileName(sourceName || (id + '.' + ext));
    if (!fileExtension(storedName) && ext) storedName += '.' + ext;
    var path = owner + '/' + receivedDate + '/' + id + '--b64_' + encodeStoredName(storedName);
    var encodedPath = path.split('/').map(encodeURIComponent).join('/');
    return window.db.fetch('/storage/v1/object/' + BUCKET + '/' + encodedPath, {
      method: 'POST',
      headers: { 'Content-Type': mimeType || 'application/octet-stream', 'x-upsert': 'false' },
      body: blob
    }).then(function (res) {
      if (!res.ok) return uploadError(res, '리플렛 업로드에 실패했습니다.').then(function (error) { throw error; });
      var row = { id: id, owner_id: owner, file_type: fileType, storage_path: path, mime_type: mimeType, file_size: blob.size, page_count: pageCount || null, received_date: receivedDate, sort_order: 0 };
      return window.db.fetch('/rest/v1/briefing_leaflets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(row)
      });
    }).then(function (res) {
      if (!res.ok) return uploadError(res, '캘린더 정보 저장에 실패했습니다.').then(function (error) { throw error; });
    });
  }
  function reloadCurrent() { if (state.mode === 'agenda') loadAgenda(); else loadForCursor(); }
  // PNG 업로드는 용량 절감을 위해 저장 전 JPEG로 재인코딩(투명 배경은 흰색으로 채움)
  function pngToJpeg(file) {
    return createImageBitmap(file).then(function (bitmap) {
      var canvas = document.createElement('canvas');
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0);
      return new Promise(function (resolve) { canvas.toBlob(resolve, 'image/jpeg', .92); });
    });
  }
  function uploadSingleFile(f, receivedDate) {
    var kind = fileKind(f), ext = fileExtension(f.name) || (kind === 'image' ? 'jpg' : kind === 'text' ? 'txt' : 'bin');
    if (kind === 'image' && ext === 'png') {
      return pngToJpeg(f).then(function (blob) {
        return uploadBlob(blob, 'image', 'image/jpeg', receivedDate, null, 'jpg', f.name ? f.name.replace(/\.png$/i, '.jpg') : null);
      });
    }
    return uploadBlob(f, kind === 'image' ? 'image' : 'pdf', f.type || 'application/octet-stream', receivedDate, null, ext, f.name);
  }
  function runUpload(receivedDate, files) {
    var allImages = files.every(function (f) { return fileKind(f) === 'image'; });
    var task;
    if (files.length === 1) {
      task = uploadSingleFile(files[0], receivedDate);
    } else if (allImages) {
      task = mergeImagesToPdf(files).then(function (bytes) {
        return uploadBlob(new Blob([bytes], { type: 'application/pdf' }), 'pdf', 'application/pdf', receivedDate, files.length, 'pdf', receivedDate + ' 리플렛 ' + files.length + '장.pdf');
      });
    } else {
      task = files.reduce(function (chain, f) {
        return chain.then(function () { return uploadSingleFile(f, receivedDate); });
      }, Promise.resolve());
    }
    task.then(function () { reloadCurrent(); showNotice('리플렛을 추가했습니다.'); })
      .catch(function (err) { showNotice(err.message || '업로드에 실패했습니다.'); });
  }
  function normalizeLinkFiles(files) {
    return Promise.all(files.map(function (file) {
      if (fileKind(file) !== 'link') return Promise.resolve(file);
      return file.text().then(function (content) {
        var target = normalizedHttpUrl(content) || normalizedHttpUrl((String(content).match(/^URL=(.+)$/im) || [])[1]);
        if (!target) { showNotice('안전한 http/https 주소가 아닌 바로가기 파일은 등록할 수 없습니다: ' + (file.name || '링크')); return null; }
        return new File([target], linkName(target), { type: 'text/uri-list' });
      }).catch(function () { showNotice('바로가기 파일을 읽지 못했습니다: ' + (file.name || '링크')); return null; });
    })).then(function (rows) { return rows.filter(Boolean); });
  }
  function handleFiles(receivedDate, fileList, warningMessage) {
    var incoming = Array.prototype.slice.call(fileList || []), files = [], unsupported = [], oversized = [];
    incoming.forEach(function (file) {
      if (!fileKind(file)) unsupported.push(file.name || '알 수 없는 파일');
      else if (file.size > MAX_FILE_SIZE) oversized.push(file.name || '파일');
      else files.push(file);
    });
    if (oversized.length) showNotice('20MB를 초과해 등록하지 못했습니다: ' + oversized.join(', '));
    if (unsupported.length) showNotice('지원하지 않는 파일 형식입니다: ' + unsupported.join(', '));
    if (!files.length) return;
    normalizeLinkFiles(files).then(function (normalizedFiles) {
      if (!normalizedFiles.length) return;
      var needsPublicWarning = normalizedFiles.some(function (file) { var kind = fileKind(file); return kind === 'document' || kind === 'text' || kind === 'link'; });
      if (!needsPublicWarning) { runUpload(receivedDate, normalizedFiles); return; }
      confirmAction('공개 자료 등록', warningMessage || '보험브리핑 캘린더의 자료는 로그인하지 않은 방문자도 볼 수 있습니다. 개인정보가 없는 공개용 자료와 링크만 등록해 주세요.', '등록', false)
        .then(function (confirmed) { if (confirmed) runUpload(receivedDate, normalizedFiles); });
    });
  }
  function selectDate(dateStr) {
    state.selectedDate = dateStr;
    Array.prototype.forEach.call(document.querySelectorAll('#ib-leaflet-grid .ib-leaflet-day'), function (cell) {
      cell.classList.toggle('is-selected', cell.getAttribute('data-date') === dateStr);
    });
    showNotice(dateStr + ' 선택됨 · 복사한 자료를 붙여넣을 수 있습니다.');
  }
  function bindDropEvents() {
    var days = document.querySelectorAll('#ib-leaflet-grid .ib-leaflet-day.is-droppable');
    Array.prototype.forEach.call(days, function (cell) {
      cell.addEventListener('dragover', function (e) { e.preventDefault(); cell.classList.add('drag-over'); });
      cell.addEventListener('dragleave', function () { cell.classList.remove('drag-over'); });
      cell.addEventListener('drop', function (e) {
        e.preventDefault(); cell.classList.remove('drag-over');
        var files = e.dataTransfer && e.dataTransfer.files;
        if (files && files.length) handleFiles(cell.getAttribute('data-date'), files);
      });
      cell.addEventListener('click', function () { selectDate(cell.getAttribute('data-date')); });
      cell.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectDate(cell.getAttribute('data-date')); } });
    });
  }
  function bindPasteEvents() {
    document.addEventListener('paste', function (e) {
      if (!isPilot()) return;
      var target = e.target;
      if (target && (target.matches('input,textarea') || target.isContentEditable)) return;
      if (!state.selectedDate) { showNotice('먼저 자료를 등록할 날짜를 선택해 주세요.'); return; }
      var clipboard = e.clipboardData;
      if (!clipboard) return;
      var files = Array.prototype.slice.call(clipboard.files || []);
      if (!files.length && clipboard.items) {
        Array.prototype.forEach.call(clipboard.items, function (item) { var file = item.kind === 'file' && item.getAsFile ? item.getAsFile() : null; if (file) files.push(file); });
      }
      if (files.length) { e.preventDefault(); handleFiles(state.selectedDate, files); return; }
      var text = clipboard.getData('text/plain');
      if (!text) return;
      e.preventDefault();
      var stamp = new Date(), name = '붙여넣은 메모 ' + ymd(stamp) + ' ' + pad2(stamp.getHours()) + pad2(stamp.getMinutes()) + '.txt';
      var directUrl = normalizedHttpUrl(text);
      if (directUrl) {
        handleFiles(state.selectedDate, [new File([directUrl], linkName(directUrl), { type: 'text/uri-list' })], '붙여넣은 링크는 로그인하지 않은 방문자도 볼 수 있습니다. 공개해도 되는 주소인지 확인해 주세요.');
        return;
      }
      var sensitive = /\b\d{6}\s*[- ]?\s*[1-4]\d{6}\b|\b01[016789]\s*[- ]?\s*\d{3,4}\s*[- ]?\s*\d{4}\b/.test(text);
      handleFiles(state.selectedDate, [new File([text], name, { type: 'text/plain' })], sensitive
        ? '붙여넣은 텍스트에서 주민번호 또는 전화번호 형태가 감지됐습니다. 이 캘린더는 외부에 공개됩니다. 내용을 다시 확인한 뒤 공개용 자료만 등록해 주세요.'
        : '붙여넣은 텍스트는 로그인하지 않은 방문자도 볼 수 있습니다. 개인정보가 없는 공개용 내용만 등록해 주세요.');
    });
  }

  function init() {
    var grid = document.getElementById('ib-leaflet-grid');
    if (!grid) return;
    var prev = document.getElementById('ib-leaflet-prev'), next = document.getElementById('ib-leaflet-next'), todayBtn = document.getElementById('ib-leaflet-today');
    if (prev) prev.addEventListener('click', function () { moveCursor(-1); });
    if (next) next.addEventListener('click', function () { moveCursor(1); });
    if (todayBtn) todayBtn.addEventListener('click', goToday);
    var modeButtons = document.querySelectorAll('.ib-leaflet-mode');
    Array.prototype.forEach.call(modeButtons, function (btn) { btn.addEventListener('click', function () { setMode(btn.getAttribute('data-mode')); }); });
    state.monthCap = monthThumbCap();
    /* 2026-08-25 — init()이 인슈워크 SPA 섹션 재진입마다 다시 불린다(#iw-main이 매번 통째로
       교체되어 그리드 안 버튼 리스너를 새로 걸어야 함). 그리드 안쪽 리스너는 옛 DOM과 함께
       자연 소멸하지만, document/window에 붙는 아래 두 리스너는 그렇지 않아 재호출마다 계속
       쌓인다 — 특히 붙여넣기 리스너가 중복되면 대표(PILOT_ID) 계정이 캘린더에 자료를 붙여넣을 때
       같은 파일이 여러 번 업로드된다. 페이지 수명 동안 한 번만 바인딩되도록 가드한다. */
    if (!state.globalListenersBound) {
      state.globalListenersBound = true;
      bindPasteEvents();
      var resizeTimer = 0;
      window.addEventListener('resize', function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(function () {
          var nextCap = monthThumbCap();
          if (nextCap === state.monthCap) return;
          state.monthCap = nextCap;
          if (state.mode === 'month') render();
        }, 120);
      });
    }
    renderToolbar();
    loadForCursor();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // 2026-08-25 — 인슈워크 SPA의 '소식지·캘린더' 섹션(js/insuwork.js briefingHtml/
  // initBriefingCalendar)이 섹션 재진입 시 이 캘린더를 다시 초기화할 수 있도록 외부 노출.
  window.OSBriefingLeaflets = { init: init };
})();
