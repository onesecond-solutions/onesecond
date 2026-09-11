(function () {
  'use strict';
  var frame = null;
  var loaded = false;
  var messageBound = false;
  var TEMPLATE_URL = '/insuwork/assets/templates/coverage-base-template.xlsx?v=20260911sheet1';

  function sectionHtml() {
    return '<div class="iw-coverage-sheet-page"><div class="iw-toolbar"><div><h2>보장분석 엑셀</h2><p class="iw-subtitle">엑셀 설치 없이 보장분석 기본표를 편집하고 비공개 작업본으로 저장합니다.</p></div></div>'
      + '<section class="iw-coverage-sheet-shell" aria-label="보장분석 엑셀 편집기"><iframe id="iw-coverage-sheet-frame" title="보장분석 엑셀 편집기" src="/pages/coverage-sheet-editor.html?v=20260911sheet1"></iframe></section></div>';
  }

  function post(payload) {
    if (frame && frame.contentWindow) frame.contentWindow.postMessage(payload, location.origin);
  }

  function loadWorkbook() {
    if (loaded || !window.OSInsuwork || !window.OSInsuwork.loadCoverageSheetWorkbook) return;
    loaded = true;
    window.OSInsuwork.loadCoverageSheetWorkbook().then(function (saved) {
      post({ type: 'coverage-sheet:init', templateUrl: TEMPLATE_URL, saved: saved });
    }).catch(function (error) {
      post({ type: 'coverage-sheet:init', templateUrl: TEMPLATE_URL, saved: null, error: error && error.message || String(error) });
    });
  }

  function onMessage(event) {
    if (event.origin !== location.origin || !frame || event.source !== frame.contentWindow || !event.data) return;
    if (event.data.type === 'coverage-sheet:ready') { loadWorkbook(); return; }
    if (event.data.type !== 'coverage-sheet:save') return;
    if (!window.OSInsuwork || !window.OSInsuwork.saveCoverageSheetWorkbook) return post({ type: 'coverage-sheet:saved', ok: false, error: '저장 기능을 불러오지 못했습니다.' });
    window.OSInsuwork.saveCoverageSheetWorkbook(event.data.data, event.data.fileName).then(function (saved) {
      post({ type: 'coverage-sheet:saved', ok: true, updatedAt: saved.updatedAt });
    }).catch(function (error) {
      post({ type: 'coverage-sheet:saved', ok: false, error: error && error.message || String(error) });
    });
  }

  function mount() {
    frame = document.getElementById('iw-coverage-sheet-frame');
    loaded = false;
    if (!messageBound) { window.addEventListener('message', onMessage); messageBound = true; }
    if (frame) frame.addEventListener('load', loadWorkbook, { once: true });
  }

  window.OSInsuworkCoverageSheet = { sectionHtml: sectionHtml, mount: mount };
})();
