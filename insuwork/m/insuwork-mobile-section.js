/* 보조 메뉴는 기존 콘텐츠/권한/데이터 로직을 재사용하고 모바일 공통 셸 안에서 렌더한다. */
(function () {
  'use strict';
  var titles = { briefing: '보험브리핑', newsletters: '참고자료', 'sales-strategy': '영업자료', 'notice-updates': '공지·업데이트', 'user-guide': '사용자 가이드', feedback: '의견 보내기' };
  window.OSInsuworkMobileSection = {
    navigate: function (section) {
      var target = window.OSInsuworkMobileRouting.destination('?section=' + encodeURIComponent(section));
      if (target.indexOf('/section.html?') >= 0) return false;
      location.assign(target); return true;
    },
    mount: function (view, section) {
      var shell = view.querySelector('.iw-shell'), body = view.querySelector('.iw-body'), nav = view.querySelector('.iw-nav');
      if (!shell || !body) return;
      if (nav) nav.remove();
      shell.insertAdjacentHTML('afterbegin', window.OSInsuworkMobileNav.header(titles[section] || '보험워크', ''));
      shell.insertAdjacentHTML('beforeend', window.OSInsuworkMobileNav.render(''));
      window.OSInsuworkMobileNav.bindHeader();
    }
  };
  // 직접 저장한 보조 메뉴 주소도 로그인 전에는 공개 랜딩으로 보낸다.
  var user;
  try { user = JSON.parse(localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}'); } catch (_) { user = {}; }
  if (!user.id || !window.db || !window.db.getToken || !window.db.getToken()) {
    if (!(location.hostname === 'localhost' || location.hostname === '127.0.0.1')) location.replace('/insuwork/' + location.search);
  }
  if (window.Auth && window.Auth.init && window.db && window.db.getToken && window.db.getToken()) window.Auth.init().catch(function () {});
})();
