/* insubriefing/insuwork/m/insuwork-mobile-nav.js
   보험워크 모바일 공통 하단 탭바 (feat/workstation-mobile-bottom-nav, 2026-08-22).
   대표 요청 — 상단 텍스트 탭 링크를 다른 모바일 앱들처럼 하단 고정 아이콘 탭바로 전환.
   상태 없는 순수 렌더 함수 하나만 제공한다. 4개 화면(오늘/캘린더/고객/자료)이 각자 독립 정적 페이지로
   운영되는 기존 방식(게이트 로직도 4개 파일에 거의 동일하게 복제)과 같은 맥락으로, 이 파일은 게이트·데이터
   로직은 전혀 건드리지 않고 "하단 탭바 HTML을 그려주는 것"만 공통화한다.
   네임스페이스 = OSInsuworkMobileNav (다른 OSInsuworkMobile* 네임스페이스와 충돌 없음). */
(function () {
  'use strict';

  /* 아이콘 = 이모지(새 아이콘 폰트/외부 리소스 로드 금지). 화면마다 한눈에 구분되도록 단순한 것으로 선택.
     오늘=집(하루의 홈 베이스) · 캘린더=달력 · 고객=사람 · 상담=메모(전체 고객을 가로지르는 상담 목록,
     feat/workstation-mobile-consultations-list, 2026-08-22 대표 직접 요청 — PC 데스크탑에는 있던
     "상담관리" 화면이 모바일에 없던 격차) · 자료=폴더.
     순서는 고객 다음이 자연스러워 고객→상담→자료로 배치(청약 전 상담 흐름이 고객 바로 옆). */
  var ITEMS = [
    { key: 'today', href: './index.html', label: '오늘', icon: '🏠' },
    { key: 'calendar', href: './calendar.html', label: '캘린더', icon: '📅' },
    { key: 'customers', href: './customers.html', label: '고객', icon: '👤' },
    { key: 'consultations', href: './consultations.html', label: '상담', icon: '📝' },
    { key: 'library', href: './library.html', label: '자료', icon: '📁' }
  ];

  /* activeKey와 일치하는 항목만 활성 스타일(.is-active) + aria-current="page"를 받는다.
     항목 라벨/href는 전부 고정 문자열이라 별도 escape 없이 그대로 조립한다(사용자 입력 없음). */
  function render(activeKey) {
    var itemsHtml = ITEMS.map(function (item) {
      var active = item.key === activeKey;
      return '<a class="iwm-bottom-nav-item' + (active ? ' is-active' : '') + '" href="' + item.href + '"'
        + (active ? ' aria-current="page"' : '') + '>'
        + '<span class="iwm-bottom-nav-icon" aria-hidden="true">' + item.icon + '</span>'
        + '<span class="iwm-bottom-nav-label">' + item.label + '</span>'
        + '</a>';
    }).join('');
    return '<nav class="iwm-bottom-nav" aria-label="보험워크 하단 메뉴">' + itemsHtml + '</nav>';
  }

  window.OSInsuworkMobileNav = { render: render };
})();
