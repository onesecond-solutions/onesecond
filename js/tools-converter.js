/* tools-converter.js — 이미지/PDF → JPG 변환기 도구. DB/인증 무관(브라우저 canvas·FileReader·clipboard만).
   app.html 인라인 <script>에서 분리(파일 분리 Phase 2, 2026-07-08). 함수 본문 무변경.
   ⚠️ 인라인 <script>보다 먼저 로드: _TOOL_PAGE_MAP·activateTool(app.html)이 빌드 시점에 renderConverterTool 참조를 캡처(호이스팅) → 외부 이동 시 인라인 실행 전 전역 정의 필요.
   전역 등록: window.renderConverterTool / convFileSelect / convFileClear / convCompute / convPdfDownload / convPdfCopy / convShowActionMenu / convCloseActionMenu / convAction (그 외 renderConvResult·renderConvPdfResult·convComputePdf = 파일 내부 전용).
   런타임 외부 의존(전역): escHomeHtml·fmtFileSize(util-format.js) / toast·openMakeCardModal(app.html 인라인) / pdf.js(PDF 경로). 모두 호출 시점(런타임)에 존재.
   외부 참조: app.html convertBackToWrite가 window._convResult(윈도우 프로퍼티)를 읽음 — 본 파일이 세팅하므로 정합.
   revert: 이 블록을 app.html 원위치(포인터 주석 자리)로 복원 + <script src="/js/tools-converter.js"> 제거. */

/* === PNG → JPG 변환기 (Phase B 3순위) === */
window._convFile = null;
window._convResult = null;
var QCK_CONV_QUALITY = 0.85;

function renderConverterTool(slotId){
  var slot = document.getElementById(slotId||'qck-content-slot');   /* slotId=독립 도구 페이지 재사용(기본값=Quick 무변경) (2026-07-05) */
  if(!slot) return;
  slot.innerHTML =
    '<div class="qck-tool-grid">' +
      '<div class="qck-tool-pane">' +
        '<h4>입력</h4>' +
        '<div class="qck-conv-drop" id="qckConvDrop" onclick="document.getElementById(\'qckConvFile\').click()">' +
          '<div class="qck-conv-drop-icon">🖼️</div>' +
          '<div class="qck-conv-drop-text">PNG · JPG · PDF 파일 선택</div>' +
          '<div class="qck-conv-drop-hint">클릭 또는 드래그&드롭 · PDF는 페이지별 JPG</div>' +
        '</div>' +
        '<input type="file" id="qckConvFile" accept="image/png,image/jpeg,application/pdf,.pdf" style="display:none" onchange="convFileSelect(this.files[0])">' +
        '<div id="qckConvFileInfo"></div>' +
        '<button class="qck-tool-fire" onclick="convCompute()">⚡ 딸깍</button>' +
      '</div>' +
      '<div class="qck-tool-pane" style="position:relative;">' +
        '<h4>결과</h4>' +
        '<div id="qckConvResult"><div class="qck-tool-empty">PNG · JPG 파일 선택 후 ⚡ 딸깍 클릭</div></div>' +
        '<div class="qck-mc-fab-wrap">' +
          '<button id="qckConvFab" class="qck-mc-fab" onclick="event.stopPropagation();convShowActionMenu()" disabled aria-label="액션 메뉴">⚡</button>' +
          '<div id="qckConvActionMenu" class="qck-mc-action-menu">' +
            '<button class="qck-mc-action-item" onclick="convAction(\'download\')">' +
              '<span class="qck-mc-action-item-title">다운로드 저장</span>' +
              '<span class="qck-mc-action-item-desc">JPG 파일 저장</span>' +
            '</button>' +
            '<button class="qck-mc-action-item" onclick="convAction(\'copy\')">' +
              '<span class="qck-mc-action-item-title">복사</span>' +
              '<span class="qck-mc-action-item-desc">클립보드로 바로 붙여넣기</span>' +
            '</button>' +
            '<button class="qck-mc-action-item" onclick="convAction(\'makeCard\')">' +
              '<span class="qck-mc-action-item-title">카드 만들기</span>' +
              '<span class="qck-mc-action-item-desc">변환 이미지로 카드</span>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  window._convFile = null;
  window._convResult = null;
  // 드래그&드롭 자체
  var drop = document.getElementById('qckConvDrop');
  if(drop){
    drop.addEventListener('dragover', function(e){ e.preventDefault(); drop.classList.add('drag'); });
    drop.addEventListener('dragleave', function(){ drop.classList.remove('drag'); });
    drop.addEventListener('drop', function(e){
      e.preventDefault();
      drop.classList.remove('drag');
      var f = e.dataTransfer.files && e.dataTransfer.files[0];
      if(f) convFileSelect(f);
    });
  }
}

/* fmtFileSize → util-format.js */

function convFileSelect(file){
  if(!file) return;
  if(!file.type.match(/png|jpe?g|pdf/i) && !file.name.match(/\.(png|jpe?g|pdf)$/i)){
    alert('PNG · JPG · PDF 파일만 변환할 수 있어요.');
    return;
  }
  window._convFile = file;
  var info = document.getElementById('qckConvFileInfo');
  if(info){
    info.innerHTML = '<div class="qck-conv-file-info"><span>📄 ' + escHomeHtml(file.name) + ' · ' + fmtFileSize(file.size) + '</span><button class="qck-conv-file-info-clear" onclick="convFileClear()" title="삭제">✕</button></div>';
  }
}
window.convFileSelect = convFileSelect;

function convFileClear(){
  window._convFile = null;
  var info = document.getElementById('qckConvFileInfo');
  if(info) info.innerHTML = '';
  var fileEl = document.getElementById('qckConvFile');
  if(fileEl) fileEl.value = '';
}
window.convFileClear = convFileClear;

function convCompute(){
  var file = window._convFile;
  if(!file){ alert('파일을 먼저 선택해 주세요.'); return; }
  if(file.type==='application/pdf' || /\.pdf$/i.test(file.name)){ return convComputePdf(file); }
  var resultEl = document.getElementById('qckConvResult');
  if(resultEl) resultEl.innerHTML = '<div class="qck-tool-empty">변환 중...</div>';
  var reader = new FileReader();
  reader.onload = function(e){
    var img = new Image();
    img.onload = function(){
      var canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      var ctx = canvas.getContext('2d');
      // PNG 투명 영역 = JPG 가동 시 검정 자체 자체 자체 자체 자체 → 흰색 배경 자체 자체
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(function(blob){
        if(!blob){
          if(resultEl) resultEl.innerHTML = '<div class="qck-tool-empty" style="color:var(--err)">변환 실패. 다시 시도해 주세요.</div>';
          return;
        }
        var origSize = file.size;
        var newSize = blob.size;
        var reduction = origSize > 0 ? Math.round((1 - newSize/origSize) * 100) : 0;
        var url = URL.createObjectURL(blob);
        var newName = file.name.replace(/\.(png|jpe?g)$/i, '') + '.jpg';
        var origFormat = (file.type.match(/jpe?g/i)||/\.jpe?g$/i.test(file.name)) ? 'JPG' : 'PNG';
        window._convResult = {
          blob: blob, url: url, origName: file.name, newName: newName, origFormat: origFormat,
          origSize: origSize, newSize: newSize, reduction: reduction,
          width: canvas.width, height: canvas.height
        };
        renderConvResult();
      }, 'image/jpeg', QCK_CONV_QUALITY);
    };
    img.onerror = function(){
      if(resultEl) resultEl.innerHTML = '<div class="qck-tool-empty" style="color:var(--err)">이미지 자체 가동 실패. 정상 PNG 파일 자체 점검.</div>';
    };
    img.src = e.target.result;
  };
  reader.onerror = function(){
    if(resultEl) resultEl.innerHTML = '<div class="qck-tool-empty" style="color:var(--err)">파일 자체 가동 실패.</div>';
  };
  reader.readAsDataURL(file);
}
window.convCompute = convCompute;

/* PDF → 각 페이지 개별 JPG (pdf.js 렌더, 기기 안 처리·저장 0). 최대 20쪽. */
window._convPages = null;
var CONV_PDF_MAXPAGES = 20;
function convComputePdf(file){
  var resultEl = document.getElementById('qckConvResult');
  if(resultEl) resultEl.innerHTML = '<div class="qck-tool-empty">PDF 변환 중… (페이지가 많으면 잠시만요)</div>';
  window._convPages = [];
  loadPdfJs().then(function(pdfjs){
    return file.arrayBuffer().then(function(buf){ return pdfjs.getDocument({data:buf}).promise; });
  }).then(function(pdf){
    var total = pdf.numPages;
    var n = Math.min(total, CONV_PDF_MAXPAGES);
    var base = file.name.replace(/\.pdf$/i,'');
    var chain = Promise.resolve();
    for(var i=1;i<=n;i++){ (function(pg){ chain = chain.then(function(){
      return pdf.getPage(pg).then(function(page){
        var vp = page.getViewport({scale:2});
        var canvas = document.createElement('canvas'); canvas.width = vp.width; canvas.height = vp.height;
        var ctx = canvas.getContext('2d'); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0,0,canvas.width,canvas.height);
        return page.render({canvasContext:ctx, viewport:vp}).promise.then(function(){
          return new Promise(function(res){ canvas.toBlob(function(blob){ window._convPages.push({page:pg, blob:blob, url:blob?URL.createObjectURL(blob):'', name:base+'_p'+pg+'.jpg', size:blob?blob.size:0}); res(); }, 'image/jpeg', QCK_CONV_QUALITY); });
        });
      });
    }); })(i); }
    return chain.then(function(){ return total; });
  }).then(function(total){
    renderConvPdfResult(total);
  }).catch(function(err){
    console.error('[conv pdf]', err);
    if(resultEl) resultEl.innerHTML = '<div class="qck-tool-empty" style="color:var(--err)">PDF 변환 실패. 다시 시도해 주세요.</div>';
  });
}
function renderConvPdfResult(total){
  var el = document.getElementById('qckConvResult'); if(!el) return;
  var pages = window._convPages || [];
  if(!pages.length){ el.innerHTML = '<div class="qck-tool-empty" style="color:var(--err)">변환된 페이지가 없습니다.</div>'; return; }
  var note = (total>pages.length) ? ('<div class="qck-pdf-note">총 '+total+'쪽 중 앞 '+pages.length+'쪽만 변환했어요.</div>') : '';
  var cards = pages.map(function(p,i){
    return '<div class="qck-pdf-card"><div class="qck-pdf-thumb"><img src="'+p.url+'" alt="'+p.page+'쪽"></div>'
      +'<div class="qck-pdf-meta">'+p.page+'쪽 · '+fmtFileSize(p.size)+'</div>'
      +'<div class="qck-pdf-acts"><button class="post-act" onclick="convPdfCopy('+i+')">📋 복사</button><button class="post-act" onclick="convPdfDownload('+i+')">⬇ 저장</button></div></div>';
  }).join('');
  el.innerHTML = '<div class="qck-pdf-grid">'+cards+'</div>'+note;
  var fab = document.getElementById('qckConvFab'); if(fab) fab.disabled = true;  /* 다중 페이지 = 카드별 액션 사용 */
}
function convPdfDownload(i){ var p=(window._convPages||[])[i]; if(!p) return; var a=document.createElement('a'); a.href=p.url; a.download=p.name; document.body.appendChild(a); a.click(); a.remove(); }
function convPdfCopy(i){ var p=(window._convPages||[])[i]; if(!p||!p.blob) return; if(navigator.clipboard&&window.ClipboardItem){ navigator.clipboard.write([new ClipboardItem({'image/jpeg':p.blob})]).then(function(){ if(typeof toast==='function') toast(p.page+'쪽 복사! 카톡에 붙여넣기'); }).catch(function(){ convPdfDownload(i); }); } else { convPdfDownload(i); } }
window.convComputePdf=convComputePdf; window.convPdfDownload=convPdfDownload; window.convPdfCopy=convPdfCopy;

function renderConvResult(){
  var r = window._convResult;
  var el = document.getElementById('qckConvResult');
  if(!r || !el) return;
  var savedBytes = r.origSize - r.newSize;
  var savedTxt = savedBytes > 0 ? fmtFileSize(savedBytes) : fmtFileSize(Math.abs(savedBytes));
  var reductionTxt = r.reduction > 0 ? (r.reduction + '%') : (r.reduction < 0 ? ('-' + Math.abs(r.reduction) + '%') : '동일');
  var savingsClass = r.reduction > 0 ? 'ok' : '';
  var resolution = r.width + ' × ' + r.height;
  // 우측 결과 패널 안 통째: 비교 박스 + 가로 절감 카드 + 미리보기 + 파일명
  el.innerHTML =
    '<div class="qck-conv-compare">' +
      '<div class="qck-conv-box">' +
        '<div class="qck-conv-box-label">원본</div>' +
        '<div class="qck-conv-box-format">'+(r.origFormat||'PNG')+'</div>' +
        '<div class="qck-conv-box-size">' + fmtFileSize(r.origSize) + '</div>' +
        '<div class="qck-conv-box-res">' + resolution + '</div>' +
      '</div>' +
      '<div class="qck-conv-arrow">→</div>' +
      '<div class="qck-conv-box after">' +
        '<div class="qck-conv-box-label">결과</div>' +
        '<div class="qck-conv-box-format">JPG</div>' +
        '<div class="qck-conv-box-size">' + fmtFileSize(r.newSize) + '</div>' +
        '<div class="qck-conv-box-res">' + resolution + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="qck-conv-savings">' +
      '<div class="qck-conv-savings-row">' +
        '<span class="qck-conv-savings-label">용량 감소</span>' +
        '<span class="qck-conv-savings-value ' + savingsClass + '">' + reductionTxt + '</span>' +
      '</div>' +
      '<div class="qck-conv-savings-row">' +
        '<span class="qck-conv-savings-label">절약</span>' +
        '<span class="qck-conv-savings-value">' + savedTxt + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="qck-conv-preview"><img src="' + r.url + '" alt="변환 결과 미리보기"></div>' +
    '<div class="qck-conv-filename">' + escHomeHtml(r.newName) + '</div>';
  // 우하단 FAB 활성
  var fab = document.getElementById('qckConvFab');
  if(fab) fab.disabled = false;
  /* 스크립트 글쓰기에서 딸깍으로 왔으면 → 성공 팝업(글쓰기로 돌아가 자동 첨부) */
  try{ if(sessionStorage.getItem('mys_script_from_write')&&typeof showConvertDonePopup==='function') showConvertDonePopup(); }catch(e){}
}

function convShowActionMenu(){
  var menu = document.getElementById('qckConvActionMenu');
  if(!menu) return;
  if(menu.classList.contains('show')) convCloseActionMenu();
  else menu.classList.add('show');
}
window.convShowActionMenu = convShowActionMenu;

function convCloseActionMenu(){
  var menu = document.getElementById('qckConvActionMenu');
  if(menu) menu.classList.remove('show');
}
window.convCloseActionMenu = convCloseActionMenu;

function convAction(action){
  var r = window._convResult;
  convCloseActionMenu();
  if(!r){ alert('먼저 ⚡ 딸깍을 눌러 변환해 주세요.'); return; }
  if(action === 'download'){
    var a = document.createElement('a');
    a.href = r.url;
    a.download = r.newName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else if(action === 'copy'){
    if(navigator.clipboard && window.ClipboardItem && r.blob){
      navigator.clipboard.write([new ClipboardItem({'image/jpeg': r.blob})]).then(function(){
        alert('변환 이미지를 클립보드에 복사했습니다.');
      }).catch(function(){
        var a = document.createElement('a');
        a.href = r.url;
        a.download = r.newName;
        a.click();
      });
    } else {
      alert('본 브라우저는 이미지 복사를 지원하지 않습니다. 다운로드로 저장해 주세요.');
    }
  } else if(action === 'makeCard'){
    openMakeCardModal({
      imageDataUrl: r.url,
      contentType: 'general',
      title: '카드 만들기 · 이미지'
    });
  }
}
window.convAction = convAction;
