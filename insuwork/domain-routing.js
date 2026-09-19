/* Dedicated-domain entry. Existing asset and deep-link paths remain valid. */
(function () {
  'use strict';
  var entry = /^\/insuwork\/(?:index\.html)?$/.test(location.pathname);
  if (location.hostname === 'insuwork.onesecond.solutions') {
    if (entry) location.replace('/' + location.search + location.hash);
    return;
  }
  if (location.hostname !== 'onesecond.solutions' && location.hostname !== 'www.onesecond.solutions') return;
  if (location.pathname.indexOf('/insuwork/') !== 0) return;
  // PKCE verifiers and sessions belong to their original origin. Finish in-flight
  // callbacks there; never transfer authentication tokens to another hostname.
  var query = new URLSearchParams(location.search);
  if (query.has('code') || query.has('error') || /(?:access_token|refresh_token|error)=/.test(location.hash)) return;
  location.replace('https://insuwork.onesecond.solutions' + (entry ? '/' : location.pathname) + location.search + location.hash);
})();
