/**
 * insubriefing/leaflet-preview.js
 * 리플렛 캘린더 전용 PDF/이미지 미리보기(연속 세로 스크롤, 고해상도 렌더).
 * js/insuwork.js의 보험워크 미리보기(iw-preview)를 그대로 본떠
 * Supabase 인증·insuwork_items 의존 없이 순수 URL만으로 동작하도록 축소한 버전.
 * 공개 페이지(로그인 불필요)에서 그대로 쓸 수 있다.
 */
(function () {
  'use strict';

  var state = { preview: null, pdfJsPromise: null };

  function esc(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]; }); }

  function previewType(name, mime) {
    var m = String(mime || '').toLowerCase(), ext = String(name || '').split('?')[0].split('.').pop().toLowerCase();
    if (/^image\//.test(m) || /^(png|jpe?g|gif|webp|bmp|avif)$/.test(ext)) return 'image';
    if (m === 'application/pdf' || ext === 'pdf') return 'pdf';
    return '';
  }

  function isLoggedIn() {
    try {
      return !!((window.db && typeof window.db.getToken === 'function' && window.db.getToken()) || localStorage.getItem('os_token') || sessionStorage.getItem('os_token'));
    } catch (_e) {
      return false;
    }
  }

  function showNotice(message) {
    if (window.InsuranceBriefingNotice && typeof window.InsuranceBriefingNotice.alert === 'function') {
      window.InsuranceBriefingNotice.alert(message);
      return;
    }
    if (typeof window.toast === 'function') window.toast(message);
  }

  function ensureOverlay() {
    if (document.getElementById('leaflet-preview')) return;
    var div = document.createElement('div');
    div.innerHTML =
      '<div class="lfp-preview" id="leaflet-preview" aria-hidden="true" onclick="if(event.target===this)LeafletPreview.close()">'
      + '<button type="button" class="lfp-preview-close" onclick="LeafletPreview.close()" aria-label="미리보기 닫기">×</button>'
      + '<button type="button" class="lfp-preview-nav lfp-preview-nav-prev" onclick="LeafletPreview.navigate(-1)" aria-label="이전 자료">‹</button>'
      + '<button type="button" class="lfp-preview-nav lfp-preview-nav-next" onclick="LeafletPreview.navigate(1)" aria-label="다음 자료">›</button>'
      + '<div class="lfp-preview-thumbs" id="lfp-preview-thumbs"></div>'
      + '<div class="lfp-preview-stage" id="lfp-preview-stage" onclick="if(event.target===this||(event.target.classList&&event.target.classList.contains(\'lfp-preview-page-wrap\')))LeafletPreview.close()"></div>'
      + '<div class="lfp-preview-bar">'
      + '<button type="button" onclick="LeafletPreview.zoom(-1)" title="축소">−</button>'
      + '<button type="button" onclick="LeafletPreview.zoom(1)" title="확대">＋</button>'
      + '<button type="button" onclick="LeafletPreview.rotate()" title="회전">↻</button>'
      + '<button type="button" class="lfp-preview-pdf-only" onclick="LeafletPreview.page(-1)" title="이전 페이지">‹</button>'
      + '<span id="lfp-preview-page"></span>'
      + '<button type="button" class="lfp-preview-pdf-only" onclick="LeafletPreview.page(1)" title="다음 페이지">›</button>'
      + '<a id="lfp-preview-download" class="lfp-preview-public-download" href="#" target="_blank" rel="noopener" download title="다운로드">⬇</a>'
      + '<div class="lfp-ddak-wrap"><button type="button" class="lfp-preview-ddak" aria-haspopup="menu" aria-expanded="false" onclick="LeafletPreview.toggleDdakMenu(event)">⚡ 딸깍</button><div class="lfp-ddak-menu" id="lfp-preview-ddak-menu" role="menu" hidden><a id="lfp-preview-ddak-download" href="#" target="_blank" rel="noopener" download role="menuitem" onclick="LeafletPreview.closeDdakMenu()">⬇ 다운로드 저장</a><button type="button" role="menuitem" onclick="LeafletPreview.saveToInsuwork()">📁 보험워크 저장</button><button type="button" role="menuitem" onclick="LeafletPreview.copy()">📋 복사</button></div></div>'
      + '</div></div>';
    document.body.appendChild(div.firstChild);
  }

  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (state.pdfJsPromise) return state.pdfJsPromise;
    state.pdfJsPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = function () { if (!window.pdfjsLib) { reject(new Error('PDF 미리보기 모듈을 불러오지 못했습니다.')); return; } window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; resolve(window.pdfjsLib); };
      script.onerror = function () { reject(new Error('PDF 미리보기 모듈을 불러오지 못했습니다.')); };
      document.head.appendChild(script);
    });
    return state.pdfJsPromise;
  }

  function previewUi(type, name, url, navigation) {
    ensureOverlay();
    var overlay = document.getElementById('leaflet-preview'), page = document.getElementById('lfp-preview-page'), download = document.getElementById('lfp-preview-download'), ddakDownload = document.getElementById('lfp-preview-ddak-download');
    var prev = document.querySelector('.lfp-preview-nav-prev'), next = document.querySelector('.lfp-preview-nav-next');
    var loggedIn = isLoggedIn();
    overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); overlay.classList.toggle('is-pdf', type === 'pdf'); overlay.classList.toggle('is-image', type === 'image'); overlay.classList.toggle('is-authenticated', loggedIn);
    if (page) page.textContent = type === 'pdf' ? '불러오는 중…' : name;
    if (download) { download.href = url; download.download = name || ''; }
    if (ddakDownload) { ddakDownload.href = url; ddakDownload.download = name || ''; }
    if (prev) { prev.hidden = !navigation; prev.disabled = !navigation || !navigation.previous; }
    if (next) { next.hidden = !navigation; next.disabled = !navigation || !navigation.next; }
    document.body.classList.add('lfp-preview-open');
  }

  function open(url, name, mime, navigation) {
    var type = previewType(name, mime);
    if (!type) { window.open(url, '_blank', 'noopener'); return; }
    previewUi(type, name, url, navigation);
    var stage = document.getElementById('lfp-preview-stage'), overlay = document.getElementById('leaflet-preview'), thumbs = document.getElementById('lfp-preview-thumbs');
    if (stage) { stage.onscroll = handleScroll; stage.onwheel = handleWheel; stage.scrollTop = 0; stage.scrollLeft = 0; }
    if (thumbs) { thumbs.innerHTML = ''; thumbs.removeAttribute('data-rendered-for'); }
    if (overlay) overlay.classList.remove('has-pages');
    state.preview = { type: type, url: url, name: name || '파일', mime: mime || '', zoom: 1, rotate: 0, page: 1, pages: 1, doc: null, navigation: navigation || null };
    if (type === 'image') {
      stage.innerHTML = '<div class="lfp-preview-page-wrap lfp-preview-image-wrap"><img id="lfp-preview-image" src="' + esc(url) + '" alt="' + esc(name || '') + '"></div>';
      var previewImage = document.getElementById('lfp-preview-image');
      if (previewImage) previewImage.onload = renderImageTransform;
      renderImageTransform();
      return;
    }
    stage.innerHTML = '<div class="lfp-preview-loading">PDF를 불러오는 중입니다.</div>';
    Promise.all([loadPdfJs(), fetch(url).then(function (response) { if (!response.ok) throw new Error('PDF를 불러오지 못했습니다.'); return response.arrayBuffer(); })])
      .then(function (values) { return values[0].getDocument({ data: values[1] }).promise; })
      .then(function (doc) { if (!state.preview || state.preview.url !== url) return; state.preview.doc = doc; state.preview.pages = doc.numPages; renderPdf(); renderThumbs(); })
      .catch(function (error) { if (stage) stage.innerHTML = '<div class="lfp-preview-loading">' + esc(error.message || 'PDF 미리보기를 불러오지 못했습니다.') + '</div>'; });
  }

  function renderImageTransform() {
    var p = state.preview, image = document.getElementById('lfp-preview-image'), stage = document.getElementById('lfp-preview-stage');
    if (!p || !image || !stage) return;
    var naturalW = image.naturalWidth || image.width || 1, naturalH = image.naturalHeight || image.height || 1;
    var rotated = p.rotate % 180 !== 0;
    var availW = Math.max(160, stage.clientWidth - 32), availH = Math.max(160, stage.clientHeight - 48);
    var fitW = rotated ? naturalH : naturalW, fitH = rotated ? naturalW : naturalH;
    var fitScale = Math.min(availW / fitW, availH / fitH, 1);
    var displayW = Math.max(1, Math.round(naturalW * fitScale * p.zoom));
    var displayH = Math.max(1, Math.round(naturalH * fitScale * p.zoom));
    image.style.width = displayW + 'px';
    image.style.height = displayH + 'px';
    image.style.transform = 'rotate(' + p.rotate + 'deg)';
    if (stage.scrollTop < 4) stage.scrollTop = 0;
  }

  function renderPdf() {
    var p = state.preview, stage = document.getElementById('lfp-preview-stage'); if (!p || !p.doc || !stage) return;
    var doc = p.doc, availW = Math.max(160, stage.clientWidth - 32), availH = Math.max(160, stage.clientHeight - 48);
    stage.innerHTML = '';
    var wraps = [];
    for (var n = 1; n <= p.pages; n++) {
      var wrap = document.createElement('div'); wrap.className = 'lfp-preview-page-wrap'; wrap.setAttribute('data-page', String(n));
      stage.appendChild(wrap); wraps.push(wrap);
    }
    scrollToPage(p.page);
    wraps.forEach(function (wrap, idx) {
      doc.getPage(idx + 1).then(function (page) {
        if (!state.preview || state.preview !== p) return;
        var base = page.getViewport({ scale: 1, rotation: p.rotate });
        var fitScale = Math.min(availW / base.width, availH / base.height, 2);
        var renderMultiplier = Math.max(2, window.devicePixelRatio || 1);
        var displayViewport = page.getViewport({ scale: fitScale * p.zoom, rotation: p.rotate });
        var viewport = page.getViewport({ scale: fitScale * p.zoom * renderMultiplier, rotation: p.rotate }), canvas = document.createElement('canvas');
        canvas.width = viewport.width; canvas.height = viewport.height;
        canvas.style.width = displayViewport.width + 'px'; canvas.style.height = displayViewport.height + 'px';
        wrap.appendChild(canvas);
        return page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
      }).catch(function () {});
    });
  }

  function scrollToPage(pageNum) {
    var p = state.preview, stage = document.getElementById('lfp-preview-stage'); if (!stage) return;
    var wrap = stage.querySelector('.lfp-preview-page-wrap[data-page="' + pageNum + '"]'); if (!wrap) return;
    wrap.scrollIntoView({ behavior: 'auto', block: 'start' });
    if (!p) return;
    p.page = pageNum;
    var pageText = document.getElementById('lfp-preview-page'); if (pageText) pageText.textContent = pageNum + ' / ' + p.pages;
    highlightThumb();
  }

  function handleScroll() {
    var p = state.preview, stage = document.getElementById('lfp-preview-stage');
    if (!p || p.type !== 'pdf' || !stage) return;
    var wraps = stage.querySelectorAll('.lfp-preview-page-wrap'); if (!wraps.length) return;
    var stageTop = stage.getBoundingClientRect().top, closest = 1, closestDist = Infinity;
    Array.prototype.forEach.call(wraps, function (wrap) {
      var dist = Math.abs(wrap.getBoundingClientRect().top - stageTop);
      if (dist < closestDist) { closestDist = dist; closest = Number(wrap.getAttribute('data-page')); }
    });
    if (closest === p.page) return;
    p.page = closest;
    var pageText = document.getElementById('lfp-preview-page'); if (pageText) pageText.textContent = p.page + ' / ' + p.pages;
    highlightThumb();
  }

  function handleWheel(event) {
    if (!event.ctrlKey) return;
    event.preventDefault();
    zoom(event.deltaY < 0 ? 1 : -1);
  }

  function renderThumbs() {
    var p = state.preview, box = document.getElementById('lfp-preview-thumbs'), overlay = document.getElementById('leaflet-preview');
    if (!p || !box || !overlay) return;
    var show = p.type === 'pdf' && p.doc && p.pages > 1;
    overlay.classList.toggle('has-pages', show);
    if (!show) { box.innerHTML = ''; box.removeAttribute('data-rendered-for'); return; }
    if (box.getAttribute('data-rendered-for') === p.url) { highlightThumb(); return; }
    box.setAttribute('data-rendered-for', p.url);
    box.innerHTML = '';
    var doc = p.doc;
    for (var n = 1; n <= p.pages; n++) {
      (function (pageNum) {
        var btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'lfp-preview-thumb'; btn.setAttribute('data-page', String(pageNum));
        btn.innerHTML = '<span>' + pageNum + '</span>';
        btn.onclick = function () { if (!state.preview || state.preview.url !== p.url) return; scrollToPage(pageNum); };
        box.appendChild(btn);
        doc.getPage(pageNum).then(function (page) {
          var viewport = page.getViewport({ scale: .18 }), canvas = document.createElement('canvas');
          canvas.width = viewport.width; canvas.height = viewport.height;
          return page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise.then(function () { btn.insertBefore(canvas, btn.firstChild); });
        }).catch(function () {});
      })(n);
    }
    highlightThumb();
  }

  function highlightThumb() {
    var box = document.getElementById('lfp-preview-thumbs'); if (!box) return;
    var page = state.preview && state.preview.page;
    Array.prototype.forEach.call(box.querySelectorAll('.lfp-preview-thumb'), function (btn) { btn.classList.toggle('on', Number(btn.getAttribute('data-page')) === page); });
  }

  function close() {
    var overlay = document.getElementById('leaflet-preview'), thumbs = document.getElementById('lfp-preview-thumbs');
    if (overlay) { overlay.classList.remove('open'); overlay.classList.remove('has-pages'); overlay.setAttribute('aria-hidden', 'true'); }
    if (thumbs) { thumbs.innerHTML = ''; thumbs.removeAttribute('data-rendered-for'); }
    closeDdakMenu();
    state.preview = null; document.body.classList.remove('lfp-preview-open');
  }
  function zoom(direction) { var p = state.preview; if (!p) return; p.zoom = Math.min(4, Math.max(.5, p.zoom + direction * .25)); if (p.type === 'pdf') renderPdf(); else renderImageTransform(); }
  function rotate() { var p = state.preview; if (!p) return; p.rotate = (p.rotate + 90) % 360; if (p.type === 'pdf') renderPdf(); else renderImageTransform(); }
  function page(direction) { var p = state.preview; if (!p || p.type !== 'pdf') return; var next = Math.min(p.pages, Math.max(1, p.page + direction)); if (next !== p.page) scrollToPage(next); }
  function navigate(direction) {
    var navigation = state.preview && state.preview.navigation;
    var action = direction < 0 ? navigation && navigation.previous : navigation && navigation.next;
    if (typeof action === 'function') action();
  }

  function canvasBlob(canvas) { return new Promise(function (resolve) { if (!canvas) resolve(null); else canvas.toBlob(resolve, 'image/png'); }); }
  function closeDdakMenu() {
    var menu = document.getElementById('lfp-preview-ddak-menu'), trigger = document.querySelector('.lfp-ddak-wrap .lfp-preview-ddak');
    if (menu) menu.hidden = true;
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }
  function toggleDdakMenu(event) {
    if (event) event.stopPropagation();
    var menu = document.getElementById('lfp-preview-ddak-menu'), trigger = event && event.currentTarget;
    if (!menu) return;
    var open = menu.hidden;
    menu.hidden = !open;
    if (trigger) trigger.setAttribute('aria-expanded', String(open));
  }
  function copy() {
    var p = state.preview;
    if (!p) return;
    closeDdakMenu();
    var makeBlob = p.type === 'pdf'
      ? canvasBlob(document.querySelector('.lfp-preview-page-wrap[data-page="' + p.page + '"] canvas'))
      : fetch(p.url).then(function (response) { return response.blob(); }).then(function (blob) { return createImageBitmap(blob); }).then(function (bitmap) { var canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height; canvas.getContext('2d').drawImage(bitmap, 0, 0); return canvasBlob(canvas); });
    makeBlob.then(function (blob) {
      if (!blob) throw new Error('이미지를 만들지 못했습니다.');
      if (!navigator.clipboard || !window.ClipboardItem) throw new Error('clipboard');
      return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    }).then(function () {
      showNotice('복사했습니다. 카카오톡에 붙여넣으세요.');
    }).catch(function () {
      showNotice('이 브라우저에서는 복사를 지원하지 않습니다. 다운로드를 이용해 주세요.');
    });
  }

  // ── 보험워크(내 파일함)에 저장 ─────────────────────────────────────────
  function currentUserId() {
    try { return JSON.parse(localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}').id || ''; } catch (e) { return ''; }
  }
  function extensionFromName(name) { var clean = String(name || '').split('?')[0], dot = clean.lastIndexOf('.'); return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : ''; }

  function saveToInsuwork() {
    closeDdakMenu();
    var p = state.preview;
    if (!p) return;
    var owner = currentUserId();
    if (!owner || !window.db || !window.db.fetch) { showNotice('로그인이 필요합니다.'); return; }
    window.db.fetch('/rest/v1/insuwork_items?owner_id=eq.' + encodeURIComponent(owner) + '&item_type=eq.folder&deleted_at=is.null&order=title.asc&select=id,title,parent_id')
      .then(function (res) { if (!res.ok) throw new Error('폴더 목록을 불러오지 못했습니다.'); return res.json(); })
      .then(function (folders) { openFolderPicker(folders || [], p, owner); })
      .catch(function (err) { showNotice(err.message || '폴더 목록을 불러오지 못했습니다.'); });
  }

  function openFolderPicker(folders, preview, owner) {
    var path = [{ id: null, title: '내 파일함' }];
    var ext = preview.type === 'pdf' ? 'pdf' : (extensionFromName(preview.name) || 'jpg');
    var baseName = String(preview.name || '리플렛').replace(/\.[^.]+$/, '');
    var dialog = document.createElement('dialog');
    dialog.className = 'lfp-folder-dialog';
    dialog.innerHTML = '<div class="lfp-folder-head"><h2>보험워크 저장</h2><button type="button" class="lfp-folder-close" aria-label="닫기">×</button></div>'
      + '<label class="lfp-folder-name-field"><span>파일명</span><div class="lfp-folder-filename"><input type="text" class="lfp-folder-name-input" maxlength="80" value="' + esc(baseName) + '"><span>.' + esc(ext) + '</span></div></label>'
      + '<nav class="lfp-folder-trail"></nav>'
      + '<div class="lfp-folder-list"></div>'
      + '<form class="lfp-folder-new" hidden><input type="text" maxlength="60" placeholder="새 폴더 이름" required><button type="submit">추가</button><button type="button" class="lfp-folder-new-cancel">취소</button></form>'
      + '<div class="lfp-folder-actions"><button type="button" class="lfp-folder-new-btn">+ 새 폴더</button><span class="lfp-folder-actions-right"><button type="button" class="lfp-folder-cancel">취소</button><button type="button" class="lfp-folder-confirm">이 폴더에 저장</button></span></div>'
      + '<p class="lfp-folder-status" role="status"></p>';
    document.body.appendChild(dialog);

    var trailEl = dialog.querySelector('.lfp-folder-trail'), listEl = dialog.querySelector('.lfp-folder-list'), statusEl = dialog.querySelector('.lfp-folder-status');
    var newForm = dialog.querySelector('.lfp-folder-new'), newBtn = dialog.querySelector('.lfp-folder-new-btn'), confirmBtn = dialog.querySelector('.lfp-folder-confirm');

    function currentParentId() { return path[path.length - 1].id; }
    function render() {
      trailEl.innerHTML = path.map(function (crumb, i) {
        return (i > 0 ? '<span>›</span>' : '') + '<button type="button" data-idx="' + i + '">' + esc(crumb.title) + '</button>';
      }).join('');
      var children = folders.filter(function (f) { return String(f.parent_id || '') === String(currentParentId() || ''); });
      listEl.innerHTML = children.length
        ? children.map(function (f) { return '<button type="button" class="lfp-folder-row" data-id="' + esc(f.id) + '">📁 ' + esc(f.title) + '</button>'; }).join('')
        : '<p class="lfp-folder-empty">하위 폴더가 없습니다.</p>';
    }
    trailEl.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-idx]'); if (!btn) return;
      path = path.slice(0, Number(btn.getAttribute('data-idx')) + 1); render();
    });
    listEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.lfp-folder-row'); if (!btn) return;
      var id = btn.getAttribute('data-id'), folder = folders.find(function (f) { return String(f.id) === String(id); });
      if (folder) { path.push({ id: folder.id, title: folder.title }); render(); }
    });
    newBtn.addEventListener('click', function () { newForm.hidden = false; newForm.querySelector('input').focus(); });
    newForm.querySelector('.lfp-folder-new-cancel').addEventListener('click', function () { newForm.hidden = true; newForm.reset(); });
    newForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = newForm.querySelector('input'), name = input.value.trim();
      if (!name) return;
      var submitBtn = newForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      window.db.fetch('/rest/v1/insuwork_items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({ owner_id: owner, parent_id: currentParentId() || null, item_type: 'folder', title: name, visibility: 'private' })
      }).then(function (res) { if (!res.ok) throw new Error('폴더를 만들지 못했습니다.'); return res.json(); })
        .then(function (rows) {
          var created = rows && rows[0]; if (!created) throw new Error('폴더를 만들지 못했습니다.');
          folders.push(created); path.push({ id: created.id, title: created.title });
          if (window.OSInsuwork && typeof window.OSInsuwork.syncSavedWorkspaceItem === 'function') window.OSInsuwork.syncSavedWorkspaceItem(created);
          newForm.hidden = true; newForm.reset(); render();
        })
        .catch(function (err) { statusEl.textContent = err.message || '폴더를 만들지 못했습니다.'; })
        .then(function () { submitBtn.disabled = false; });
    });
    function closePicker() { dialog.close(); dialog.remove(); }
    dialog.querySelector('.lfp-folder-close').addEventListener('click', closePicker);
    dialog.querySelector('.lfp-folder-cancel').addEventListener('click', closePicker);
    dialog.addEventListener('cancel', function (e) { e.preventDefault(); closePicker(); });
    // 파일명 텍스트를 드래그 선택하다 포인터가 dialog 밖에서 놓이면 Chrome이 배경 click으로
    // 합성할 수 있다. 저장창은 명시적인 닫기·취소·Esc로만 닫아 작성 중 입력을 보호한다.

    confirmBtn.addEventListener('click', function () {
      confirmBtn.disabled = true; statusEl.textContent = '저장하는 중…';
      var nameInput = dialog.querySelector('.lfp-folder-name-input');
      var titleName = ((nameInput && nameInput.value.trim()) || baseName || '리플렛') + '.' + ext;
      var mime = preview.mime || (preview.type === 'pdf' ? 'application/pdf' : 'image/jpeg');
      fetch(preview.url).then(function (res) { if (!res.ok) throw new Error('원본 파일을 불러오지 못했습니다.'); return res.blob(); })
        .then(function (blob) {
          var id = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
          var path2 = owner + '/root/' + id + (ext ? '.' + ext.replace(/[^a-z0-9]/g, '') : '');
          return window.db.fetch('/storage/v1/object/myspace/' + path2.split('/').map(encodeURIComponent).join('/'), {
            method: 'POST', headers: { 'Content-Type': mime, 'x-upsert': 'false' }, body: blob
          }).then(function (res) { if (!res.ok) throw new Error('파일 저장에 실패했습니다.'); return { id: id, path: path2, blob: blob }; });
        })
        .then(function (saved) {
          return window.db.fetch('/rest/v1/insuwork_items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
            body: JSON.stringify({ id: saved.id, owner_id: owner, parent_id: currentParentId() || null, item_type: 'file', title: titleName, storage_path: saved.path, mime_type: mime, extension: ext, file_size: saved.blob.size, visibility: 'private', created_at: new Date().toISOString() })
          });
        })
        .then(function (res) { if (!res.ok) throw new Error('저장 정보를 기록하지 못했습니다.'); return res.json(); })
        .then(function (rows) {
          var created = rows && rows[0]; if (!created) throw new Error('저장 결과를 확인하지 못했습니다.');
          if (window.OSInsuwork && typeof window.OSInsuwork.syncSavedWorkspaceItem === 'function') window.OSInsuwork.syncSavedWorkspaceItem(created);
          closePicker(); showNotice('보험워크 "' + path[path.length - 1].title + '"에 저장했습니다.');
        })
        .catch(function (err) { statusEl.textContent = err.message || '저장에 실패했습니다.'; confirmBtn.disabled = false; });
    });

    render();
    dialog.showModal();
  }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.preview && !document.querySelector('.lfp-folder-dialog')) close(); });

  window.LeafletPreview = { open: open, close: close, zoom: zoom, rotate: rotate, page: page, navigate: navigate, toggleDdakMenu: toggleDdakMenu, closeDdakMenu: closeDdakMenu, copy: copy, saveToInsuwork: saveToInsuwork };
})();
