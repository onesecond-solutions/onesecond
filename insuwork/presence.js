/* Insurance Work last access: authenticated, visible pages only. */
(function () {
  'use strict';
  var timer = 0, pending = false, lastOwner = '', lastAttempt = 0;
  function owner() {
    var state = window.AppState;
    return state && state.ready && state.userId && window.db && window.db.getToken() ? state.userId : '';
  }
  function stop() { window.clearInterval(timer); timer = 0; }
  function touch() {
    var id = owner();
    if (!id || document.hidden) { stop(); return; }
    if (pending || (lastOwner === id && Date.now() - lastAttempt < 5000)) return;
    lastOwner = id; lastAttempt = Date.now(); pending = true;
    var controller = new AbortController();
    var timeout = window.setTimeout(function () { controller.abort(); }, 15000);
    Promise.resolve().then(function () {
      return window.db.fetch('/rest/v1/rpc/touch_last_seen', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: controller.signal
      });
    }).then(function (response) {
      if (!response.ok) throw new Error('Last access update failed');
    }).catch(function () {
      // Retry on the next visible heartbeat; never interrupt the user's work.
    }).finally(function () { window.clearTimeout(timeout); pending = false; });
  }
  function sync() {
    if (!owner() || document.hidden) { stop(); return; }
    touch();
    if (!timer) timer = window.setInterval(touch, 120000);
  }
  document.addEventListener('appstate:ready', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pageshow', sync);
  window.addEventListener('pagehide', stop);
  sync();
})();
