/* insubriefing/workstation/m/workstation-mobile-nav.js
   워크스테이션 모바일 공통 하단 탭바 (feat/workstation-mobile-bottom-nav, 2026-08-22).
   대표 요청 — 상단 텍스트 탭 링크를 다른 모바일 앱들처럼 하단 고정 아이콘 탭바로 전환.
   상태 없는 순수 렌더 함수 하나만 제공한다. 4개 화면(오늘/캘린더/고객/자료)이 각자 독립 정적 페이지로
   운영되는 기존 방식(게이트 로직도 4개 파일에 거의 동일하게 복제)과 같은 맥락으로, 이 파일은 게이트·데이터
   로직은 전혀 건드리지 않고 "하단 탭바 HTML을 그려주는 것"만 공통화한다.
   네임스페이스 = OSWorkstationMobileNav (다른 OSWorkstationMobile* 네임스페이스와 충돌 없음). */
(function () {
  'use strict';

  /* 아이콘 = 이모지(새 아이콘 폰트/외부 리소스 로드 금지). 화면마다 한눈에 구분되도록 단순한 것으로 선택.
     오늘=집(하루의 홈 베이스) · 캘린더=달력 · 고객=사람 · 자료=폴더. */
  var ITEMS = [
    { key: 'today', href: './index.html', label: '오늘', icon: '🏠' },
    { key: 'calendar', href: './calendar.html', label: '캘린더', icon: '📅' },
    { key: 'customers', href: './customers.html', label: '고객', icon: '👤' },
    { key: 'library', href: './library.html', label: '자료', icon: '📁' }
  ];

  /* activeKey와 일치하는 항목만 활성 스타일(.is-active) + aria-current="page"를 받는다.
     항목 라벨/href는 전부 고정 문자열이라 별도 escape 없이 그대로 조립한다(사용자 입력 없음). */
  function render(activeKey) {
    var itemsHtml = ITEMS.map(function (item) {
      var active = item.key === activeKey;
      return '<a class="wsm-bottom-nav-item' + (active ? ' is-active' : '') + '" href="' + item.href + '"'
        + (active ? ' aria-current="page"' : '') + '>'
        + '<span class="wsm-bottom-nav-icon" aria-hidden="true">' + item.icon + '</span>'
        + '<span class="wsm-bottom-nav-label">' + item.label + '</span>'
        + '</a>';
    }).join('');
    return '<nav class="wsm-bottom-nav" aria-label="워크스테이션 하단 메뉴">' + itemsHtml + '</nav>';
  }

  window.OSWorkstationMobileNav = { render: render };
})();
