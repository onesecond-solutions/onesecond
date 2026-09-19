/* Present the existing verified history body without the legacy navigation. */
(function () {
  'use strict';
  if (new URLSearchParams(location.search).get('portal') !== '1') return;
  document.documentElement.classList.add('ip-history-embed');
  var style = document.createElement('style');
  style.textContent = '.ip-history-embed .pub-top,.ip-history-embed .kc-searchslot,.ip-history-embed .kc-tabs,.ip-history-embed .kc-chips,.ip-history-embed .kc-kicker,.ip-history-embed .kc-h1,.ip-history-embed .kc-hook,.ip-history-embed .kc-count,.ip-history-embed .kc-rule,.ip-history-embed .kc-doc-open,.ip-history-embed .v3side,.ip-history-embed #advdoc-slot{display:none!important}'
    + '.ip-history-embed body{margin:0!important;padding:0!important;background:#fff!important}'
    + '.ip-history-embed [id^="v-axis"],.ip-history-embed .kc-scroll,.ip-history-embed .kc-body{width:auto!important;max-width:none!important;margin:0!important;padding:16px!important;height:auto!important;overflow:visible!important}'
    + '.ip-history-embed .doc-grid{display:block!important}.ip-history-embed .doc-body{width:auto!important;max-width:none!important;min-width:0!important}';
  document.head.appendChild(style);
}());
