(function () {
  'use strict';

  var STORAGE_KEY = 'os_weather_enabled';
  var REFRESH_MS = 15 * 60 * 1000;
  var weather = null;
  var weatherAt = 0;
  var loading = false;

  function enabled() { try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch (_e) { return false; } }
  function setEnabled(value) { try { localStorage.setItem(STORAGE_KEY, value ? '1' : '0'); } catch (_e) {} }
  function accountBox() { return document.querySelector('.ib-account') || document.getElementById('iw-account'); }
  function popover() { return document.querySelector('.ib-account-popover,.iw-account-popover'); }
  function condition(code) {
    if (code === 0) return ['맑음', '☀️'];
    if (code === 1) return ['대체로 맑음', '🌤️'];
    if (code === 2) return ['구름 조금', '⛅'];
    if (code === 3) return ['흐림', '☁️'];
    if (code === 45 || code === 48) return ['안개', '🌫️'];
    if (code >= 51 && code <= 57) return ['이슬비', '🌦️'];
    if (code >= 61 && code <= 67) return ['비', '🌧️'];
    if (code >= 71 && code <= 77) return ['눈', '🌨️'];
    if (code >= 80 && code <= 82) return ['소나기', '🌦️'];
    if (code >= 85 && code <= 86) return ['눈 소나기', '🌨️'];
    if (code >= 95) return ['천둥번개', '⛈️'];
    return ['현재 날씨', '🌡️'];
  }
  function weatherIcon(code, isDay) {
    var result = condition(code);
    if (!isDay && code <= 1) return '🌙';
    return result[1];
  }
  function setStatus(message, isError) {
    var node = document.querySelector('.os-weather-status');
    if (!node) return;
    node.textContent = message || '';
    node.classList.toggle('is-error', !!isError);
  }
  function ensureWidget() {
    var box = accountBox();
    if (!box) return null;
    var node = box.querySelector(':scope > .os-weather-widget');
    if (!node) {
      node = document.createElement('div');
      node.className = 'os-weather-widget';
      node.hidden = true;
      node.setAttribute('aria-live', 'polite');
      box.insertBefore(node, box.firstChild);
    }
    return node;
  }
  function renderWidget() {
    var node = ensureWidget();
    if (!node) return;
    var isEnabled = enabled();
    if (node.hidden === isEnabled) node.hidden = !isEnabled;
    var viewKey = !isEnabled ? 'off' : (loading && !weather ? 'loading' : (!weather ? 'waiting' : [weather.code, weather.isDay, Math.round(weather.temperature)].join('|')));
    if (node.getAttribute('data-weather-view') === viewKey) return;
    node.setAttribute('data-weather-view', viewKey);
    if (!isEnabled) { node.textContent = ''; return; }
    if (loading && !weather) { node.textContent = '날씨 확인 중…'; return; }
    if (!weather) { node.textContent = '날씨 확인'; return; }
    var meta = condition(weather.code);
    node.innerHTML = '<span aria-hidden="true">' + weatherIcon(weather.code, weather.isDay) + '</span><strong>' + Math.round(weather.temperature) + '°</strong><small>' + meta[0] + '</small>';
    node.title = '현재 위치 날씨 · ' + meta[0] + ' · ' + Math.round(weather.temperature) + '°C';
  }
  function syncToggle() {
    var input = document.querySelector('.os-weather-toggle input');
    if (input) input.checked = enabled();
  }
  function ensureSetting() {
    var menu = popover();
    if (!menu || menu.querySelector('.os-weather-setting')) return;
    var bg = menu.querySelector('.ib-account-bgmode,.iw-account-bgmode');
    if (!bg) return;
    var setting = document.createElement('div');
    setting.className = 'os-weather-setting';
    setting.innerHTML = '<label class="os-weather-toggle"><span><b>날씨 표시</b><small>사용자 버튼 왼쪽에 현재 날씨를 표시합니다.</small></span><input type="checkbox" aria-label="현재 날씨 표시"><i aria-hidden="true"></i></label><p class="os-weather-status" role="status"></p>';
    bg.insertAdjacentElement('afterend', setting);
    var input = setting.querySelector('input');
    input.checked = enabled();
    input.addEventListener('change', function () {
      setEnabled(input.checked);
      setStatus('');
      renderWidget();
      if (input.checked) refreshWeather(true);
    });
  }
  function handleLocationError(error) {
    loading = false;
    setEnabled(false);
    syncToggle();
    renderWidget();
    var denied = error && error.code === 1;
    setStatus(denied ? '브라우저에서 위치 권한을 허용해 주세요.' : '현재 위치를 확인하지 못했습니다.', true);
  }
  function fetchWeather(position) {
    var latitude = position.coords.latitude;
    var longitude = position.coords.longitude;
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(latitude) + '&longitude=' + encodeURIComponent(longitude) + '&current=temperature_2m,weather_code,is_day&timezone=auto';
    fetch(url).then(function (response) {
      if (!response.ok) throw new Error('weather request failed');
      return response.json();
    }).then(function (data) {
      var current = data && data.current;
      if (!current || typeof current.temperature_2m !== 'number') throw new Error('weather response invalid');
      weather = { temperature: current.temperature_2m, code: Number(current.weather_code || 0), isDay: Number(current.is_day || 0) === 1 };
      weatherAt = Date.now();
      loading = false;
      setStatus('');
      renderWidget();
    }).catch(function () {
      loading = false;
      renderWidget();
      setStatus('날씨 정보를 불러오지 못했습니다.', true);
    });
  }
  function refreshWeather(force) {
    if (!enabled() || loading) return;
    if (!force && weather && Date.now() - weatherAt < REFRESH_MS) { renderWidget(); return; }
    if (!navigator.geolocation) { handleLocationError(); return; }
    loading = true;
    renderWidget();
    setStatus('현재 위치의 날씨를 확인하는 중입니다.');
    navigator.geolocation.getCurrentPosition(fetchWeather, handleLocationError, { enableHighAccuracy: false, timeout: 10000, maximumAge: REFRESH_MS });
  }
  function sync() {
    ensureSetting();
    syncToggle();
    renderWidget();
  }
  function init() {
    sync();
    var observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    if (enabled()) refreshWeather(false);
    window.setInterval(function () { refreshWeather(false); }, REFRESH_MS);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refreshWeather(false); });
    window.addEventListener('storage', function (event) { if (event.key === STORAGE_KEY) { sync(); if (enabled()) refreshWeather(true); } });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
