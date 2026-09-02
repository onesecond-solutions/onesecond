/* insuwork/m/insuwork-mobile-nav.js
   보험워크 모바일 공통 하단 탭바 (feat/workstation-mobile-bottom-nav, 2026-08-22).
   대표 요청 — 상단 텍스트 탭 링크를 다른 모바일 앱들처럼 하단 고정 아이콘 탭바로 전환.
   상태 없는 순수 렌더 함수 하나만 제공한다. 4개 화면(오늘/캘린더/고객/자료)이 각자 독립 정적 페이지로
   운영되는 기존 방식(게이트 로직도 4개 파일에 거의 동일하게 복제)과 같은 맥락으로, 이 파일은 게이트·데이터
   로직은 전혀 건드리지 않고 "하단 탭바 HTML을 그려주는 것"만 공통화한다.
   네임스페이스 = OSInsuworkMobileNav (다른 OSInsuworkMobile* 네임스페이스와 충돌 없음). */
(function () {
  'use strict';

  /* 모바일 핵심 업무 흐름을 왼쪽부터 고객→상담→홈→일정→자료로 배치한다.
     홈은 항상 정중앙에 고정하고 별도 클래스(.is-home)로 강조해 어느 화면에서도 복귀 지점을
     즉시 찾을 수 있게 한다. 아이콘은 currentColor를 따르는 동일한 선형 SVG 세트로 통일한다. */
  function icon(path) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + path + '"></path></svg>';
  }
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }
  function header(title, activeKey, opts) {
    opts = opts || {};
    var searchValue = opts.searchValue || '';
    var searchAction = opts.searchAction || './search.html';
    return '<header class="iwm-header">'
      + '<div class="iwm-header-row">'
      + '<a class="iwm-mobile-brand" href="./index.html" aria-label="보험워크 홈">'
      + '<img src="/insuwork/assets/brand/insurance-work-logo-ci.png?v=20260830ci" alt="보험워크">'
      + '</a>'
      + '<form class="iwm-global-search" action="' + esc(searchAction) + '" method="get" role="search">'
      + '<span aria-hidden="true">⌕</span>'
      + '<input type="search" name="q" value="' + esc(searchValue) + '" placeholder="검색" autocomplete="off" inputmode="search" aria-label="자료·고객 검색">'
      + '</form>'
      + '<button type="button" class="iwm-menu-btn" id="iwm-menu-btn" aria-label="메뉴 열기" aria-haspopup="menu" aria-expanded="false">'
      + '<span></span><span></span><span></span>'
      + '</button>'
      + '<div class="iwm-menu-panel" id="iwm-menu-panel" role="menu" hidden>'
      + '<a class="iwm-menu-item" href="./section.html?view=insuwork&section=daily-briefing" role="menuitem">뉴스 브리핑</a>'
      + '<a class="iwm-menu-item" href="./section.html?view=insuwork&section=briefing" role="menuitem">보험브리핑</a>'
      + '<a class="iwm-menu-item" href="./section.html?view=insuwork&section=newsletters" role="menuitem">참고자료</a>'
      + '<a class="iwm-menu-item" href="./section.html?view=insuwork&section=sales-strategy" role="menuitem">영업자료</a>'
      + (window._canSeeInsuworkLedger && window._canSeeInsuworkLedger() ? '<a class="iwm-menu-item" href="./section.html?view=insuwork&section=ledger" role="menuitem">가계부</a>' : '')
      + '<span class="iwm-menu-label" role="presentation">지원</span>'
      + '<a class="iwm-menu-item" href="./section.html?view=insuwork&section=notice-updates" role="menuitem">공지·업데이트</a>'
      + '<a class="iwm-menu-item" href="./section.html?view=insuwork&section=user-guide" role="menuitem">사용자 가이드</a>'
      + '<a class="iwm-menu-item" href="./section.html?view=insuwork&section=feedback" role="menuitem">의견 보내기</a>'
      + '</div>'
      + '</div>'
      + '<strong class="iwm-screen-title">' + esc(title) + '</strong>'
      + '</header>';
  }
  var headerOutsideBound = false;
  function bindHeader() {
    var form = document.querySelector('.iwm-global-search');
    if (form) {
      form.addEventListener('submit', function (event) {
        var input = form.querySelector('input[name="q"]');
        if (!input || !input.value.trim()) event.preventDefault();
      });
    }
    var menuBtn = document.getElementById('iwm-menu-btn');
    var menuPanel = document.getElementById('iwm-menu-panel');
    if (menuBtn && menuPanel) {
      menuBtn.addEventListener('click', function (event) {
        event.stopPropagation();
        var willOpen = menuPanel.hidden;
        menuPanel.hidden = !willOpen;
        menuBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });
    }
    if (!headerOutsideBound) {
      headerOutsideBound = true;
      document.addEventListener('click', function (event) {
        var panel = document.getElementById('iwm-menu-panel');
        var btn = document.getElementById('iwm-menu-btn');
        if (!panel || panel.hidden) return;
        if (panel.contains(event.target) || (btn && btn.contains(event.target))) return;
        panel.hidden = true;
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }
  }
  var ITEMS = [
    { key: 'customers', href: './customers.html', label: '계약관리', icon: icon('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75') },
    { key: 'consultations', href: './consultations.html', label: '상담', icon: icon('M21 15a4 4 0 0 1-4 4H8l-5 3v-3a4 4 0 0 1-2-3.46V7a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4z M6 8h10 M6 12h7') },
    { key: 'today', href: './index.html', label: '홈', icon: icon('M3 11.5 12 4l9 7.5 M5 10v10h14V10 M9 20v-6h6v6'), home: true },
    { key: 'calendar', href: './calendar.html', label: '일정', icon: icon('M3 5h18v16H3z M16 3v4 M8 3v4 M3 10h18 M8 14h.01 M12 14h.01 M16 14h.01 M8 18h.01 M12 18h.01') },
    { key: 'library', href: './library.html', label: '자료', icon: icon('M3 6h7l2 2h9v12H3z M3 6V4h7l2 2') }
  ];

  /* activeKey와 일치하는 항목만 활성 스타일(.is-active) + aria-current="page"를 받는다.
     항목 라벨/href는 전부 고정 문자열이라 별도 escape 없이 그대로 조립한다(사용자 입력 없음). */
  function render(activeKey) {
    var itemsHtml = ITEMS.map(function (item) {
      var active = item.key === activeKey;
      return '<a class="iwm-bottom-nav-item' + (item.home ? ' is-home' : '') + (active ? ' is-active' : '') + '" href="' + item.href + '"'
        + (active ? ' aria-current="page"' : '') + '>'
        + '<span class="iwm-bottom-nav-icon" aria-hidden="true">' + item.icon + '</span>'
        + '<span class="iwm-bottom-nav-label">' + item.label + '</span>'
        + '</a>';
    }).join('');
    return '<nav class="iwm-bottom-nav" aria-label="보험워크 하단 메뉴">' + itemsHtml + '</nav>';
  }

  window.OSInsuworkMobileNav = { render: render, header: header, bindHeader: bindHeader };
})();
