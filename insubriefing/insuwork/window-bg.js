/* ── 창문(window) 배경모드 (2026-08-23) — insuwork.js의 bgModeButtonsHtml/applyBgMode에 붙는
   5번째 배경모드. weather-widget.js가 이미 수집한 실제 날씨(window.OSWeather)를 재사용해 신규
   API 호출 없이, 뷰포트 우하단에 작은 장식 창문을 그린다. 데스크톱 전용(680px 미만은 CSS로 숨김),
   실제 UI를 가리지 않도록 pointer-events:none, 화면 데이터와 겹치지 않는 고정 소형 컨테이너.
   보험워크 전용 신규 클래스(.win*)라 기존 클래스와 충돌 없음. ── */
(function () {
  'use strict';

  // WMO 날씨 코드 → 레시피 버킷. weather-widget.js의 condition()과 정확히 같은 경계값을 재사용한다.
  // 0-1 맑음 / 2-3,45-48 흐림·안개("싸늘함") / 51-57,61-67,80-82,95+ 비 계열 / 71-77,85-86 눈 계열
  function bucket(code) {
    var c = Number(code);
    if (c === 0 || c === 1) return 'sunny';
    if (c === 2 || c === 3 || c === 45 || c === 48) return 'cold';
    if ((c >= 51 && c <= 57) || (c >= 61 && c <= 67) || (c >= 80 && c <= 82) || c >= 95) return 'rain';
    if ((c >= 71 && c <= 77) || (c >= 85 && c <= 86)) return 'snow';
    return 'sunny';
  }

  var recipes = {
    'day-sunny': { a: '#4fa8e8', b: '#8ecdf2', c: '#dff2ff', sol: 1, solBg: 'radial-gradient(circle,#fff4c9,#ffd76b 60%)', solGlow: 'rgba(255,210,110,.65)', star: 0, cloud: .5, cloudC: '#ffffff', ray: 1, frost: 0, rain: 0, snow: 0 },
    'day-cold': { a: '#8fb2c9', b: '#c3d8e4', c: '#eef3f2', sol: .85, solBg: 'radial-gradient(circle,#fefefe,#dbe7ef 65%)', solGlow: 'rgba(210,225,235,.5)', star: 0, cloud: .3, cloudC: '#f3f6f7', ray: 0, frost: 1, rain: 0, snow: 0 },
    'day-rain': { a: '#5b6672', b: '#7c8790', c: '#9aa3ab', sol: 0, solBg: '', solGlow: 'transparent', star: 0, cloud: .85, cloudC: '#454e56', ray: 0, frost: 0, rain: 1, snow: 0 },
    'day-snow': { a: '#a9b3bd', b: '#c7ced4', c: '#e4e8ec', sol: 0, solBg: '', solGlow: 'transparent', star: 0, cloud: .6, cloudC: '#ffffff', ray: 0, frost: 0, rain: 0, snow: 1 },
    'night-sunny': { a: '#0b1530', b: '#16234a', c: '#223762', sol: 1, solBg: 'radial-gradient(circle,#f4f6ff,#c9d3ea 65%)', solGlow: 'rgba(200,215,245,.55)', star: 1, cloud: .2, cloudC: '#3a4666', ray: 0, frost: 0, rain: 0, snow: 0 },
    'night-cold': { a: '#060b1c', b: '#0e1730', c: '#172544', sol: .7, solBg: 'radial-gradient(circle,#e7ecff,#aab7d8 65%)', solGlow: 'rgba(170,183,216,.45)', star: 1, cloud: .15, cloudC: '#28304a', ray: 0, frost: 1, rain: 0, snow: 0 },
    'night-rain': { a: '#12151c', b: '#1c212b', c: '#262c38', sol: 0, solBg: '', solGlow: 'transparent', star: 0, cloud: .8, cloudC: '#20242c', ray: 0, frost: 0, rain: 1, snow: 0 },
    'night-snow': { a: '#161a24', b: '#232a38', c: '#333c4d', sol: 0, solBg: '', solGlow: 'transparent', star: 0, cloud: .5, cloudC: '#3a4353', ray: 0, frost: 0, rain: 0, snow: 1 }
  };

  var REFRESH_MS = 20 * 60 * 1000;
  var wrapEl = null;
  var active = false;
  var subscribed = false;
  var refreshTimer = null;

  function reducedMotion() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_e) { return false; }
  }

  function buildStars(count) {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < count; i++) {
      var star = document.createElement('span');
      star.style.top = Math.round(Math.random() * 70) + '%';
      star.style.left = Math.round(Math.random() * 100) + '%';
      star.style.opacity = String((.4 + Math.random() * .6).toFixed(2));
      frag.appendChild(star);
    }
    return frag;
  }

  // 프로토타입(briefingwindow.html)의 buildSnow()와 동일한 방어 패턴: reduced-motion이면
  // 랜덤 딜레이로 낙하시키지 않고, 애니메이션을 정지시킨 채 화면에 정적으로 흩뿌린다.
  function buildSnow(count) {
    var frag = document.createDocumentFragment();
    var reduced = reducedMotion();
    for (var i = 0; i < count; i++) {
      var flake = document.createElement('span');
      flake.className = 'win-flake';
      var size = 2 + Math.random() * 3;
      flake.style.width = size + 'px';
      flake.style.height = size + 'px';
      flake.style.left = Math.round(Math.random() * 100) + '%';
      if (reduced) {
        flake.style.top = Math.round(Math.random() * 100) + '%';
        flake.style.animationPlayState = 'paused';
      } else {
        flake.style.animationDuration = (3 + Math.random() * 3).toFixed(2) + 's';
        flake.style.animationDelay = (Math.random() * 4).toFixed(2) + 's';
      }
      frag.appendChild(flake);
    }
    return frag;
  }

  function ensureDom() {
    if (wrapEl) return wrapEl;
    wrapEl = document.createElement('div');
    wrapEl.className = 'win-wrap';
    wrapEl.id = 'iw-window-bg';
    wrapEl.setAttribute('aria-hidden', 'true');
    wrapEl.innerHTML =
      '<div class="win">' +
        '<div class="win-frame">' +
          '<div class="win-glass">' +
            '<div class="win-stars"></div>' +
            '<div class="win-celestial"></div>' +
            '<div class="win-cloud win-c1"></div>' +
            '<div class="win-cloud win-c2"></div>' +
            '<div class="win-rays"></div>' +
            '<div class="win-frost"></div>' +
            '<div class="win-rain"></div>' +
            '<div class="win-snowlayer"></div>' +
            '<div class="win-snowcap"></div>' +
            '<div class="win-mullion-v"></div>' +
            '<div class="win-mullion-h"></div>' +
          '</div>' +
          '<div class="win-sill"></div>' +
        '</div>' +
      '</div>';
    wrapEl.querySelector('.win-stars').appendChild(buildStars(18));
    wrapEl.querySelector('.win-snowlayer').appendChild(buildSnow(14));
    document.body.appendChild(wrapEl);
    return wrapEl;
  }

  function recipeKey() {
    var w = window.OSWeather && window.OSWeather.current ? window.OSWeather.current() : null;
    if (!w) return 'day-sunny';
    var isDay = w.isDay !== false;
    return (isDay ? 'day' : 'night') + '-' + bucket(w.code);
  }

  function applyRecipe() {
    if (!wrapEl) return;
    var r = recipes[recipeKey()] || recipes['day-sunny'];
    var el = wrapEl.querySelector('.win');
    if (!el) return;
    el.style.setProperty('--sky-a', r.a);
    el.style.setProperty('--sky-b', r.b);
    el.style.setProperty('--sky-c', r.c);
    el.style.setProperty('--sol-op', r.sol);
    el.style.setProperty('--sol-bg', r.solBg || 'transparent');
    el.style.setProperty('--sol-glow', r.solGlow);
    el.style.setProperty('--star-op', r.star);
    el.style.setProperty('--cloud-op', r.cloud);
    el.style.setProperty('--cloud-c', r.cloudC);
    el.style.setProperty('--ray-op', r.ray);
    el.style.setProperty('--frost-op', r.frost);
    el.style.setProperty('--rain-op', r.rain);
    el.style.setProperty('--snow-op', r.snow);
    el.style.setProperty('--cap-h', r.snow ? '14px' : '0px');
  }

  function stopTimer() {
    if (refreshTimer) { window.clearInterval(refreshTimer); refreshTimer = null; }
  }
  function startTimer() {
    if (refreshTimer) return;
    refreshTimer = window.setInterval(function () {
      if (active && window.OSWeather && window.OSWeather.refresh) window.OSWeather.refresh();
    }, REFRESH_MS);
  }

  // boot(isActive) — insuwork.js의 applyBgMode()가 모드 전환 때마다 호출. 여러 번 호출해도
  // 안전(DOM은 최초 1회만 생성, 이후엔 표시/숨김 + 레시피 재적용만).
  function boot(isActive) {
    active = !!isActive;
    if (!active) {
      if (wrapEl) wrapEl.style.display = 'none';
      stopTimer();
      return;
    }
    ensureDom();
    wrapEl.style.display = '';
    if (!subscribed) {
      subscribed = true;
      if (window.OSWeather && window.OSWeather.onChange) {
        window.OSWeather.onChange(function () { if (active) applyRecipe(); });
      }
    }
    var hasData = !!(window.OSWeather && window.OSWeather.current && window.OSWeather.current());
    applyRecipe();
    if (!hasData && window.OSWeather && window.OSWeather.refresh) window.OSWeather.refresh();
    startTimer();
  }

  window.OSInsuworkWindow = { boot: boot };

  // insuwork.js는 defer 스크립트 순서상 이 파일보다 먼저 실행되며, 페이지 로드시 저장된 모드를
  // 즉시 applyBgMode()로 적용한다 — 그 시점엔 아직 window.OSInsuworkWindow가 없어 boot()가
  // 걸리지 않는다. 새로고침 시 '창문' 모드가 유지되도록, insuwork.js가 쓰는 것과 같은
  // localStorage 키('iw_bg_mode')를 읽어 이 스크립트 로드 시점에 스스로 부팅한다.
  try {
    if (localStorage.getItem('iw_bg_mode') === 'window') boot(true);
  } catch (_e) {}
})();
