/**
 * js/theme.js — 다크/라이트 토글 + 폰트 크기 컨트롤러 (v2, 2026-05-22)
 *
 * ▸ data-theme 속성으로 다크(기본) / 라이트 전환
 * ▸ data-fontsize 속성으로 4단계 (90 / 100 / 110 / 125) 폰트 크기 전환
 * ▸ localStorage 저장 (os_theme / os_fontsize)
 * ▸ 초기 로드 자동 적용 (FOUC 방지: visibility 패턴은 페이지 측에서 별도 처리)
 *
 * 등록 함수 (CLAUDE.md window.* 전역 등록 원칙 정합):
 *   - window.setTheme(mode)
 *   - window.toggleTheme()
 *   - window.getTheme()
 *   - window.setFontSize(size)
 *   - window.cycleFontSize()
 *   - window.getFontSize()
 *
 * 사용 예:
 *   <span onclick="setTheme('dark')">다크</span>
 *   <span onclick="setTheme('light')">라이트</span>
 *   <span onclick="setFontSize(110)">크게</span>
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────────────────
     상수
     ───────────────────────────────────────────────────────────────────── */

  var THEME_KEY = 'os_theme';
  var FONTSIZE_KEY = 'os_fontsize';
  var DEFAULT_THEME = 'dark';
  var DEFAULT_FONTSIZE = 100;
  var VALID_THEMES = ['dark', 'light'];
  var VALID_FONTSIZES = [90, 100, 110, 125];

  /* ─────────────────────────────────────────────────────────────────────
     테마 (dark / light)
     ───────────────────────────────────────────────────────────────────── */

  function getTheme() {
    var stored = '';
    try {
      stored = localStorage.getItem(THEME_KEY) || '';
    } catch (e) {
      stored = '';
    }
    return VALID_THEMES.indexOf(stored) >= 0 ? stored : DEFAULT_THEME;
  }

  function setTheme(mode) {
    if (VALID_THEMES.indexOf(mode) < 0) {
      mode = DEFAULT_THEME;
    }
    document.documentElement.setAttribute('data-theme', mode);
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch (e) { /* private mode 등 무시 */ }

    // 메타 theme-color 동기화 (모바일 브라우저 상태바)
    var metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', mode === 'light' ? '#FBFBFC' : '#0B0C0E');
    }

    // 활성 표시용 dispatch (옵션)
    try {
      document.dispatchEvent(new CustomEvent('os:theme-change', { detail: { theme: mode } }));
    } catch (e) { /* IE 등 무시 */ }
  }

  function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }

  /* ─────────────────────────────────────────────────────────────────────
     폰트 크기 (90 / 100 / 110 / 125)
     ───────────────────────────────────────────────────────────────────── */

  function getFontSize() {
    var stored = NaN;
    try {
      stored = parseInt(localStorage.getItem(FONTSIZE_KEY) || '', 10);
    } catch (e) {
      stored = NaN;
    }
    return VALID_FONTSIZES.indexOf(stored) >= 0 ? stored : DEFAULT_FONTSIZE;
  }

  function setFontSize(size) {
    size = parseInt(size, 10);
    if (VALID_FONTSIZES.indexOf(size) < 0) {
      size = DEFAULT_FONTSIZE;
    }
    document.documentElement.setAttribute('data-fontsize', String(size));
    try {
      localStorage.setItem(FONTSIZE_KEY, String(size));
    } catch (e) { /* 무시 */ }

    try {
      document.dispatchEvent(new CustomEvent('os:fontsize-change', { detail: { size: size } }));
    } catch (e) { /* 무시 */ }
  }

  function cycleFontSize() {
    var current = getFontSize();
    var idx = VALID_FONTSIZES.indexOf(current);
    var next = VALID_FONTSIZES[(idx + 1) % VALID_FONTSIZES.length];
    setFontSize(next);
  }

  /* ─────────────────────────────────────────────────────────────────────
     초기 로드 (DOM 준비 전 즉시 적용 = FOUC 최소화)
     본 스크립트는 <head> 안에서 deferred 없이 로드 권장
     ───────────────────────────────────────────────────────────────────── */

  function applyInitial() {
    var theme = getTheme();
    var fontsize = getFontSize();

    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-fontsize', String(fontsize));

    var metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'light' ? '#FBFBFC' : '#0B0C0E');
    }
  }

  applyInitial();

  /* ─────────────────────────────────────────────────────────────────────
     전역 등록
     ───────────────────────────────────────────────────────────────────── */

  window.setTheme = setTheme;
  window.toggleTheme = toggleTheme;
  window.getTheme = getTheme;
  window.setFontSize = setFontSize;
  window.cycleFontSize = cycleFontSize;
  window.getFontSize = getFontSize;

  // 디버그용 한 줄 네임스페이스
  window.Theme = {
    set: setTheme,
    toggle: toggleTheme,
    get: getTheme,
    setSize: setFontSize,
    cycleSize: cycleFontSize,
    getSize: getFontSize
  };
})();
