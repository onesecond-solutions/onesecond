/* Dedicated-domain entry. Existing asset and deep-link paths remain valid. */
(function () {
  'use strict';
  if (location.hostname !== 'insuwork.onesecond.solutions') return;
  if (/^\/insuwork\/(?:index\.html)?$/.test(location.pathname)) {
    location.replace('/' + location.search + location.hash);
  }
})();
