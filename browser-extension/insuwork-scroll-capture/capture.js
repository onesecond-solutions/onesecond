'use strict';

(function () {
  let session = null;

  function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function isDocumentScroller(node) { return node === document.scrollingElement || node === document.documentElement || node === document.body; }
  function scrollTop(node) { return isDocumentScroller(node) ? window.scrollY : node.scrollTop; }
  function maxScroll(node) { return isDocumentScroller(node) ? Math.max(0, document.documentElement.scrollHeight - window.innerHeight) : Math.max(0, node.scrollHeight - node.clientHeight); }
  function setScroll(node, value) { if (isDocumentScroller(node)) window.scrollTo(window.scrollX, value); else node.scrollTop = value; }
  function viewportRect(node) {
    if (isDocumentScroller(node)) return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth, height: window.innerHeight };
    const rect = node.getBoundingClientRect();
    return { left: Math.max(0, rect.left), top: Math.max(0, rect.top), right: Math.min(window.innerWidth, rect.right), bottom: Math.min(window.innerHeight, rect.bottom), width: Math.min(window.innerWidth, rect.right) - Math.max(0, rect.left), height: Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top) };
  }
  function findScroller(x, y, overlay) {
    overlay.style.pointerEvents = 'none';
    const nodes = document.elementsFromPoint(x, y);
    overlay.style.pointerEvents = '';
    for (const node of nodes) {
      if (!(node instanceof HTMLElement)) continue;
      const style = getComputedStyle(node);
      if (node.scrollHeight > node.clientHeight + 8 && /(auto|scroll|overlay)/.test(style.overflowY)) return node;
    }
    return document.scrollingElement || document.documentElement;
  }
  function findOccluders(node, left, right, overlay) {
    if (isDocumentScroller(node)) return [];
    const rect = viewportRect(node), found = new Set();
    const xs = [left + 6, (left + right) / 2, right - 6].map((x) => clamp(x, rect.left + 1, rect.right - 1));
    const previousPointerEvents = overlay.style.pointerEvents;
    overlay.style.pointerEvents = 'none';
    for (let y = rect.top + 12; y < rect.bottom; y += 28) {
      for (const x of xs) {
        const stack = document.elementsFromPoint(x, Math.min(y, rect.bottom - 2));
        const contentIndex = stack.findIndex((element) => element === node || node.contains(element));
        if (contentIndex <= 0) continue;
        const blocker = stack.slice(0, contentIndex).filter((element) => element instanceof HTMLElement && !node.contains(element)).pop();
        if (!blocker || blocker.contains(node)) continue;
        const style = getComputedStyle(blocker), blockerRect = blocker.getBoundingClientRect();
        if (!/(absolute|fixed|sticky)/.test(style.position)) continue;
        if (blockerRect.width < 24 || blockerRect.height < 24) continue;
        if (blockerRect.right <= left || blockerRect.left >= right || blockerRect.bottom <= rect.top || blockerRect.top >= rect.bottom) continue;
        found.add(blocker);
      }
    }
    overlay.style.pointerEvents = previousPointerEvents;
    return Array.from(found);
  }
  function contentY(node, clientY) { const rect = viewportRect(node); return scrollTop(node) + clientY - rect.top; }

  function removeOverlay() {
    if (session && session.raf) cancelAnimationFrame(session.raf);
    const root = document.getElementById('iwsc-root');
    if (root) root.remove();
    document.removeEventListener('keydown', onKeyDown, true);
    session = null;
  }
  function onKeyDown(event) { if (event.key === 'Escape') { event.preventDefault(); removeOverlay(); } }
  function notify(text, error) {
    const box = document.createElement('div');
    box.textContent = text;
    box.style.cssText = 'position:fixed;z-index:2147483647;left:50%;bottom:24px;transform:translateX(-50%);padding:11px 16px;border-radius:999px;background:' + (error ? '#8f2d2d' : '#172033') + ';color:#fff;font:700 13px "Malgun Gothic",sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3)';
    document.documentElement.appendChild(box); setTimeout(() => box.remove(), 3200);
  }
  function renderSelection() {
    if (!session || !session.dragging || !session.scroller) return;
    const rect = viewportRect(session.scroller), currentScroll = scrollTop(session.scroller);
    const left = Math.min(session.startX, session.currentX), right = Math.max(session.startX, session.currentX);
    const startClient = rect.top + session.startContentY - currentScroll;
    const endClient = rect.top + session.currentContentY - currentScroll;
    const top = clamp(Math.min(startClient, endClient), rect.top, rect.bottom);
    const bottom = clamp(Math.max(startClient, endClient), rect.top, rect.bottom);
    Object.assign(session.selection.style, { display: 'block', left: clamp(left, rect.left, rect.right) + 'px', top: top + 'px', width: Math.max(1, Math.min(right, rect.right) - Math.max(left, rect.left)) + 'px', height: Math.max(1, bottom - top) + 'px' });
  }
  function autoScroll() {
    if (!session || !session.dragging) return;
    const rect = viewportRect(session.scroller), edge = 54;
    let delta = 0;
    if (session.pointerY > rect.bottom - edge) delta = 18 + Math.round((session.pointerY - (rect.bottom - edge)) * .7);
    else if (session.pointerY < rect.top + edge) delta = -(18 + Math.round(((rect.top + edge) - session.pointerY) * .7));
    if (delta) {
      setScroll(session.scroller, clamp(scrollTop(session.scroller) + delta, 0, maxScroll(session.scroller)));
      session.currentContentY = contentY(session.scroller, clamp(session.pointerY, rect.top, rect.bottom));
      renderSelection();
    }
    session.raf = requestAnimationFrame(autoScroll);
  }

  function imageFromDataUrl(dataUrl) {
    return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = dataUrl; });
  }
  async function captureVisible() {
    const root = document.getElementById('iwsc-root');
    const previousVisibility = root ? root.style.visibility : '';
    if (root) root.style.visibility = 'hidden';
    await wait(40);
    try {
      const response = await chrome.runtime.sendMessage({ type: 'INSUWORK_CAPTURE_VISIBLE' });
      if (!response || !response.ok) throw new Error(response && response.error || '화면을 캡처하지 못했습니다.');
      return imageFromDataUrl(response.dataUrl);
    } finally {
      if (root) root.style.visibility = previousVisibility;
    }
  }
  function fileName() {
    const now = new Date(), pad = (n) => String(n).padStart(2, '0');
    const site = location.hostname.includes('happytalk') ? '해피톡' : '보맵플래너';
    return '보험워크-' + site + '-채팅-' + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + '-' + pad(now.getHours()) + pad(now.getMinutes()) + '.png';
  }
  async function captureRange(spec) {
    const node = spec.scroller, rect = viewportRect(node), original = scrollTop(node);
    const start = Math.min(spec.startContentY, spec.endContentY), end = Math.max(spec.startContentY, spec.endContentY);
    const left = clamp(Math.min(spec.startX, spec.endX), rect.left, rect.right), right = clamp(Math.max(spec.startX, spec.endX), rect.left, rect.right);
    const widthCss = Math.round(right - left), heightCss = Math.round(end - start);
    if (widthCss < 40 || heightCss < 40) throw new Error('캡처 영역을 조금 더 크게 지정해 주세요.');
    const hidden = (spec.occluders || []).map((element) => ({ element, visibility: element.style.visibility }));
    hidden.forEach((entry) => { entry.element.style.visibility = 'hidden'; });
    try {
      const first = await captureVisible(), scaleX = first.naturalWidth / window.innerWidth, scaleY = first.naturalHeight / window.innerHeight;
      const outWidth = Math.round(widthCss * scaleX), maxOutput = 30000;
      if (outWidth > maxOutput || Math.round(heightCss * scaleY) > maxOutput) throw new Error('선택 영역이 너무 큽니다. 두 번으로 나눠 캡처해 주세요.');
      const canvas = document.createElement('canvas'); canvas.width = outWidth; canvas.height = Math.round(heightCss * scaleY);
      const ctx = canvas.getContext('2d'); let offset = 0, firstImage = first;
      while (offset < heightCss) {
        const desired = start + offset, targetScroll = clamp(desired, 0, maxScroll(node));
        setScroll(node, targetScroll); await wait(180);
        const actual = scrollTop(node), sourceTopCss = rect.top + Math.max(0, desired - actual);
        const available = Math.max(1, rect.bottom - sourceTopCss), sliceCss = Math.min(heightCss - offset, available);
        const image = offset === 0 && Math.abs(actual - original) < 1 ? firstImage : await captureVisible();
        ctx.drawImage(image, Math.round(left * scaleX), Math.round(sourceTopCss * scaleY), outWidth, Math.round(sliceCss * scaleY), 0, Math.round(offset * scaleY), outWidth, Math.round(sliceCss * scaleY));
        offset += sliceCss;
        if (sliceCss < 1 || (targetScroll >= maxScroll(node) && offset < heightCss && desired - actual >= rect.height)) break;
      }
      const dataUrl = canvas.toDataURL('image/png');
      const result = await chrome.runtime.sendMessage({ type: 'INSUWORK_CAPTURE_DOWNLOAD', dataUrl, filename: fileName() });
      if (!result || !result.ok) throw new Error(result && result.error || '파일 저장을 시작하지 못했습니다.');
    } finally {
      setScroll(node, original);
      hidden.forEach((entry) => { entry.element.style.visibility = entry.visibility; });
    }
  }

  function begin() {
    removeOverlay();
    const root = document.createElement('div'); root.id = 'iwsc-root';
    root.innerHTML = '<div id="iwsc-shade"></div><div id="iwsc-selection"></div><div id="iwsc-guide"><strong>채팅 캡처 영역을 드래그하세요</strong>아래쪽 가장자리로 끌면 자동 스크롤됩니다.<button id="iwsc-cancel" type="button" aria-label="취소">×</button></div><div id="iwsc-progress">캡처 이미지를 만드는 중입니다…</div>';
    document.documentElement.appendChild(root);
    session = { root, selection: root.querySelector('#iwsc-selection'), dragging: false, raf: 0, pointerY: 0 };
    root.querySelector('#iwsc-cancel').addEventListener('click', removeOverlay);
    root.addEventListener('mousedown', (event) => {
      if (event.button !== 0 || event.target.id === 'iwsc-cancel' || event.target.closest('#iwsc-guide')) return;
      event.preventDefault();
      session.scroller = findScroller(event.clientX, event.clientY, root);
      const rect = viewportRect(session.scroller);
      session.startX = clamp(event.clientX, rect.left, rect.right); session.currentX = session.startX;
      session.startContentY = contentY(session.scroller, clamp(event.clientY, rect.top, rect.bottom)); session.currentContentY = session.startContentY;
      session.pointerY = event.clientY; session.dragging = true; renderSelection(); autoScroll();
    });
    root.addEventListener('mousemove', (event) => {
      if (!session || !session.dragging) return;
      const rect = viewportRect(session.scroller); session.currentX = clamp(event.clientX, rect.left, rect.right); session.pointerY = event.clientY;
      session.currentContentY = contentY(session.scroller, clamp(event.clientY, rect.top, rect.bottom)); renderSelection();
    });
    root.addEventListener('mouseup', async (event) => {
      if (!session || !session.dragging) return;
      session.dragging = false; if (session.raf) cancelAnimationFrame(session.raf);
      const left = Math.min(session.startX, session.currentX), right = Math.max(session.startX, session.currentX);
      const spec = { scroller: session.scroller, startX: session.startX, endX: session.currentX, startContentY: session.startContentY, endContentY: session.currentContentY, occluders: findOccluders(session.scroller, left, right, root) };
      root.querySelector('#iwsc-guide').style.display = 'none'; session.selection.style.display = 'none'; root.querySelector('#iwsc-progress').style.display = 'block'; root.style.cursor = 'wait';
      try { await captureRange(spec); removeOverlay(); notify('채팅 캡처 저장 창을 열었습니다.'); }
      catch (error) { removeOverlay(); notify(error.message || '캡처하지 못했습니다.', true); }
    });
    document.addEventListener('keydown', onKeyDown, true);
  }

  chrome.runtime.onMessage.addListener((message) => { if (message && message.type === 'INSUWORK_CAPTURE_START') begin(); });
})();
