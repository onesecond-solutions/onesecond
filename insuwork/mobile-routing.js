/* 보험워크 단일 진입 주소. 화면 선택만 담당하며 인증/권한 판단은 기존 화면에서 유지한다. */
(function () {
  'use strict';
  var nativePages = { home: 'index.html', calendar: 'calendar.html', customers: 'customers.html', consultations: 'consultations.html', assets: 'library.html' };
  var extraSections = ['briefing', 'daily-briefing', 'newsletters', 'sales-strategy', 'notice-updates', 'user-guide', 'feedback', 'carriers', 'payments', 'scripts', 'insurance-age', 'tools', 'trash', 'archive', 'public-library', 'admin-users'];
  function isPhone() {
    var ua = navigator.userAgent || '';
    return /iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua) ||
      (!!(navigator.userAgentData && navigator.userAgentData.mobile)) ||
      (window.innerWidth < 768 && navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches);
  }
  function signedIn() {
    try {
      var user = JSON.parse(localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}');
      return !!((user.id || (window.AppState && window.AppState.userId)) && window.db && window.db.getToken && window.db.getToken());
    } catch (_) { return false; }
  }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function destination(search) {
    var params = new URLSearchParams(search), section = params.get('section') || 'home';
    if (!nativePages[section] && extraSections.indexOf(section) < 0) section = 'home';
    // 오늘 이외의 홈 일정 링크는 해당 날짜의 모바일 일정으로 연결한다.
    if (section === 'home' && /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '') && params.get('date') !== today()) section = 'calendar';
    var page = nativePages[section] || 'section.html';
    if (params.get('q') && section === 'home') page = 'search.html';
    params.delete('view'); params.delete('section');
    if (page === 'section.html') { params.set('view', 'insuwork'); params.set('section', section); }
    return '/insuwork/m/' + page + (params.toString() ? '?' + params.toString() : '');
  }
  function run() {
    if (!/^\/insuwork\/(?:index\.html)?$/.test(location.pathname) || !isPhone() || !signedIn()) return;
    location.replace(destination(location.search));
  }
  window.OSInsuworkMobileRouting = { destination: destination, isPhone: isPhone, run: run };
  document.addEventListener('appstate:ready', run);
  window.addEventListener('pageshow', run);
  run();
})();
