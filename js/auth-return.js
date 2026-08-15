(function () {
  'use strict';
  var STORAGE_KEY = 'os_auth_return';
  function safePath(value) { value = String(value || ''); return value.charAt(0) === '/' && value.charAt(1) !== '/' && value.indexOf('\\') === -1 ? value : ''; }
  function queryReturn() { try { return safePath(new URLSearchParams(window.location.search || '').get('redirect')); } catch (_e) { return ''; } }
  function storedReturn() { try { return safePath(window.sessionStorage.getItem(STORAGE_KEY)); } catch (_e) { return ''; } }
  function remember() { var target = queryReturn(); if (!target) return; try { window.sessionStorage.setItem(STORAGE_KEY, target); } catch (_e) {} }
  function redirectWhenReady() {
    var target = queryReturn() || storedReturn();
    if (!target || target === window.location.pathname) return false;
    var token = window.db && window.db.getToken ? window.db.getToken() : null;
    var userId = window.AppState && window.AppState.userId;
    if (!token || !userId) return false;
    try { window.sessionStorage.removeItem(STORAGE_KEY); } catch (_e) {}
    window.location.replace(target);
    return true;
  }
  remember();
  document.addEventListener('appstate:ready', redirectWhenReady);
  window.addEventListener('load', function () { window.setTimeout(redirectWhenReady, 500); });
})();
