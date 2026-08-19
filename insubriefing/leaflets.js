/**
 * insubriefing/leaflets.js
 * 보험브리핑 홈 "리플렛 캘린더". 로그인 여부와 무관하게 전체 공개(public.briefing_leaflets
 * anon SELECT + briefing-leaflets 공개 버킷). 업로드(드래그 앤 드롭)는 대표 계정만.
 *
 * 1장 드롭 = 이미지 그대로 저장. 2장 이상 함께 드롭 = pdf-lib로 1개 PDF로 병합 저장.
 * 클릭 시 미리보기는 insubriefing/leaflet-preview.js(LeafletPreview.open) 재사용.
 */
(function () {
  'use strict';

  var PILOT_ID = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';
  var BUCKET = 'briefing-leaflets';
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];

  var state = { year: 0, month: 0, itemsByDate: {}, pdfLibPromise: null, loading: false };

  function esc(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]; }); }
  function pad2(n) { return n < 10 ? '0' + n : String(n); }
  function ymd(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function currentUser() { try { return JSON.parse(localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}'); } catch (e) { return {}; } }
  function isPilot() { return String(currentUser().id || '') === PILOT_ID; }
  function publicUrl(path) { return (window.SUPABASE_URL || '') + '/storage/v1/object/public/' + BUCKET + '/' + String(path).split('/').map(encodeURIComponent).join('/'); }

  // ── 데이터 조회(공개, anon) ──────────────────────────────────────────────
  function loadMonth(year, month) {
    if (!window.db || !window.db.fetchPublic) return;
    state.year = year; state.month = month; state.loading = true; renderGrid();
    var start = year + '-' + pad2(month + 1) + '-01';
    var endD = new Date(year, month + 1, 0);
    var end = year + '-' + pad2(month + 1) + '-' + pad2(endD.getDate());
    window.db.fetchPublic('/rest/v1/briefing_leaflets?received_date=gte.' + start + '&received_date=lte.' + end + '&order=received_date.asc,sort_order.asc&select=id,file_type,storage_path,mime_type,received_date,sort_order')
      .then(function (res) { return res.ok ? res.json() : []; })
      .then(function (rows) {
        var map = {};
        (rows || []).forEach(function (row) { (map[row.received_date] = map[row.received_date] || []).push(row); });
        state.itemsByDate = map; state.loading = false; renderGrid();
      })
      .catch(function () { state.loading = false; renderGrid(); });
  }

  // ── 캘린더 렌더 ──────────────────────────────────────────────────────────
  function renderGrid() {
    var host = document.getElementById('ib-leaflet-grid'), label = document.getElementById('ib-leaflet-month-label');
    if (!host) return;
    if (label) label.textContent = state.year + '년 ' + (state.month + 1) + '월';
    var first = new Date(state.year, state.month, 1), startOffset = first.getDay();
    var daysInMonth = new Date(state.year, state.month + 1, 0).getDate();
    var todayStr = ymd(new Date());
    var admin = isPilot();
    var html = DOW.map(function (d) { return '<div class="ib-leaflet-dow">' + d + '</div>'; }).join('');
    for (var i = 0; i < startOffset; i++) html += '<div class="ib-leaflet-day is-other"></div>';
    for (var day = 1; day <= daysInMonth; day++) {
      var dateStr = state.year + '-' + pad2(state.month + 1) + '-' + pad2(day);
      var items = state.itemsByDate[dateStr] || [];
      var isToday = dateStr === todayStr;
      var thumbs = items.map(function (item) {
        var url = publicUrl(item.storage_path), isPdf = item.file_type === 'pdf';
        return '<span class="ib-leaflet-thumb' + (isPdf ? ' is-pdf' : '') + '" data-url="' + esc(url) + '" data-name="' + esc(dateStr + ' 리플렛') + '" data-mime="' + esc(item.mime_type || '') + '" data-pdf="' + (isPdf ? '1' : '0') + '">'
          + (isPdf ? '<span class="ib-leaflet-pdf-badge">PDF</span>' : '<img loading="lazy" src="' + esc(url) + '" alt="리플렛">')
          + '</span>';
      }).join('');
      html += '<div class="ib-leaflet-day' + (isToday ? ' is-today' : '') + (admin ? ' is-droppable' : '') + '" data-date="' + dateStr + '">'
        + '<span class="ib-leaflet-daynum">' + day + '</span>'
        + '<div class="ib-leaflet-thumbs">' + thumbs + '</div>'
        + '</div>';
    }
    host.innerHTML = html;
    host.classList.toggle('is-loading', state.loading);
    hydratePdfThumbs();
    bindThumbEvents();
    if (admin) bindDropEvents();
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
        if (window.LeafletPreview) window.LeafletPreview.open(node.getAttribute('data-url'), node.getAttribute('data-name'), node.getAttribute('data-mime'));
      });
      node.addEventListener('mouseenter', function () { showHover(node); });
      node.addEventListener('mouseleave', hideHover);
    });
  }
  function showHover(node) {
    if (node.getAttribute('data-pdf') === '1') return; // PDF는 클릭 미리보기로만(호버 확대는 이미지만)
    hideHover();
    var rect = node.getBoundingClientRect();
    hoverEl = document.createElement('div');
    hoverEl.className = 'ib-leaflet-hover';
    hoverEl.innerHTML = '<img src="' + esc(node.getAttribute('data-url')) + '" alt="">';
    document.body.appendChild(hoverEl);
    var top = Math.max(8, rect.top - 180), left = Math.min(window.innerWidth - 220, rect.left);
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
  function uploadBlob(blob, fileType, mimeType, receivedDate, pageCount, ext) {
    var token = window.db.getToken(), owner = currentUser().id;
    var id = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    var path = owner + '/' + receivedDate + '/' + id + '.' + ext;
    var encodedPath = path.split('/').map(encodeURIComponent).join('/');
    return fetch(window.db.url('/storage/v1/object/' + BUCKET + '/' + encodedPath), {
      method: 'POST',
      headers: { apikey: window.db.key, Authorization: 'Bearer ' + token, 'Content-Type': mimeType || 'application/octet-stream', 'x-upsert': 'false' },
      body: blob
    }).then(function (res) {
      if (!res.ok) throw new Error('업로드 실패');
      var row = { id: id, owner_id: owner, file_type: fileType, storage_path: path, mime_type: mimeType, file_size: blob.size, page_count: pageCount || null, received_date: receivedDate, sort_order: 0 };
      return fetch(window.db.url('/rest/v1/briefing_leaflets'), {
        method: 'POST',
        headers: { apikey: window.db.key, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(row)
      });
    }).then(function (res) { if (!res.ok) throw new Error('저장 실패'); });
  }
  function handleDrop(receivedDate, fileList) {
    var files = Array.prototype.filter.call(fileList, function (f) { return /^image\//.test(f.type) || f.type === 'application/pdf'; });
    if (!files.length) return;
    var allImages = files.every(function (f) { return /^image\//.test(f.type); });
    var task;
    if (files.length === 1) {
      var f = files[0], isPdf = f.type === 'application/pdf';
      var ext = isPdf ? 'pdf' : (f.name.split('.').pop() || 'jpg');
      task = uploadBlob(f, isPdf ? 'pdf' : 'image', f.type, receivedDate, null, ext);
    } else if (allImages) {
      task = mergeImagesToPdf(files).then(function (bytes) {
        return uploadBlob(new Blob([bytes], { type: 'application/pdf' }), 'pdf', 'application/pdf', receivedDate, files.length, 'pdf');
      });
    } else {
      task = files.reduce(function (chain, f) {
        var isPdf = f.type === 'application/pdf', ext = isPdf ? 'pdf' : (f.name.split('.').pop() || 'jpg');
        return chain.then(function () { return uploadBlob(f, isPdf ? 'pdf' : 'image', f.type, receivedDate, null, ext); });
      }, Promise.resolve());
    }
    task.then(function () { loadMonth(state.year, state.month); if (typeof window.toast === 'function') window.toast('리플렛을 추가했습니다.'); })
      .catch(function (err) { if (typeof window.toast === 'function') window.toast(err.message || '업로드에 실패했습니다.'); else alert(err.message || '업로드에 실패했습니다.'); });
  }
  function bindDropEvents() {
    var days = document.querySelectorAll('#ib-leaflet-grid .ib-leaflet-day.is-droppable');
    Array.prototype.forEach.call(days, function (cell) {
      cell.addEventListener('dragover', function (e) { e.preventDefault(); cell.classList.add('drag-over'); });
      cell.addEventListener('dragleave', function () { cell.classList.remove('drag-over'); });
      cell.addEventListener('drop', function (e) {
        e.preventDefault(); cell.classList.remove('drag-over');
        var files = e.dataTransfer && e.dataTransfer.files;
        if (files && files.length) handleDrop(cell.getAttribute('data-date'), files);
      });
    });
  }

  // ── 헤더(날짜 타이틀) + 월 이동 ──────────────────────────────────────────
  function renderHeaderDate() {
    var el = document.getElementById('ib-hero-date'); if (!el) return;
    var d = new Date();
    el.textContent = (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + DOW[d.getDay()] + ')';
  }
  function shiftMonth(delta) {
    var next = new Date(state.year, state.month + delta, 1);
    loadMonth(next.getFullYear(), next.getMonth());
  }

  function init() {
    var grid = document.getElementById('ib-leaflet-grid');
    if (!grid) return;
    renderHeaderDate();
    var today = new Date();
    loadMonth(today.getFullYear(), today.getMonth());
    var prev = document.getElementById('ib-leaflet-prev'), next = document.getElementById('ib-leaflet-next'), todayBtn = document.getElementById('ib-leaflet-today');
    if (prev) prev.addEventListener('click', function () { shiftMonth(-1); });
    if (next) next.addEventListener('click', function () { shiftMonth(1); });
    if (todayBtn) todayBtn.addEventListener('click', function () { var t = new Date(); loadMonth(t.getFullYear(), t.getMonth()); });
    var hint = document.getElementById('ib-leaflet-admin-hint');
    if (hint) hint.hidden = !isPilot();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
