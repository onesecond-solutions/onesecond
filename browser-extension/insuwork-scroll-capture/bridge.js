'use strict';

window.addEventListener('insuwork-scroll-capture:start', (event) => {
  const target = event && event.detail && event.detail.target;
  chrome.runtime.sendMessage({ type: 'INSUWORK_CAPTURE_FROM_SITE', target }).then((result) => {
    const code = result && result.ok ? 'started' : (result && result.code === 'NO_TARGET' ? 'no-target' : result && result.code === 'RELOAD_TARGET' ? 'reload-target' : 'error');
    window.dispatchEvent(new Event('insuwork-scroll-capture:' + code));
  }).catch(() => window.dispatchEvent(new Event('insuwork-scroll-capture:error')));
});

window.dispatchEvent(new Event('insuwork-scroll-capture:ready'));
