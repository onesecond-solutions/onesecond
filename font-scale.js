/**
 * font-scale.js — 원세컨드 공통 글자 크기 스케일 적용
 * app.html의 소·중·대 설정값을 localStorage에서 읽어
 * 각 pages/*.html 파일에 즉시 적용합니다.
 */
(function () {
  const VALID = [0.88, 1, 1.25];
  const SIZE_MAP = { 0.88: '14px', 1: '16px', 1.25: '20px' };
  const saved = parseFloat(localStorage.getItem('os_font_scale'));
  const scale = VALID.includes(saved) ? saved : 1;
  const px = SIZE_MAP[scale] || '16px';

  // CSS 변수 방식 (기존 calc 구조 대비)
  document.documentElement.style.setProperty('--page-scale', scale);
  document.documentElement.style.setProperty('--d-scale', scale);

  // px 직접 방식 — 페이지 루트 래퍼에 font-size 직접 지정
  document.addEventListener('DOMContentLoaded', function () {
    const root = document.querySelector('.about-wrap, .home-wrap, .quick-scale-root, .page-scale-root, .pricing-wrap');
    if (root) root.style.fontSize = px;
  });
})();
