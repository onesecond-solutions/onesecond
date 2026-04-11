/**
 * font-scale.js — 원세컨드 공통 글자 크기 스케일 적용
 * app.html의 소·중·대 설정값을 localStorage에서 읽어
 * 각 pages/*.html 파일에 즉시 적용합니다.
 */
(function () {
  const VALID = [0.85, 1, 1.18];
  const saved = parseFloat(localStorage.getItem('os_font_scale'));
  const scale = VALID.includes(saved) ? saved : 1;
  document.documentElement.style.setProperty('--page-scale', scale);
  document.documentElement.style.setProperty('--d-scale', scale);
})();
