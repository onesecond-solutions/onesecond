(function () {
  "use strict";

  var TERM_NAMES = [
    "소한", "대한", "입춘", "우수", "경칩", "춘분",
    "청명", "곡우", "입하", "소만", "망종", "하지",
    "소서", "대서", "입추", "처서", "백로", "추분",
    "한로", "상강", "입동", "소설", "대설", "동지"
  ];
  var TERM_MINUTES = [
    0, 21208, 42467, 63836, 85337, 107014,
    128867, 150921, 173149, 195551, 218072, 240693,
    263343, 285989, 308563, 331033, 353350, 375494,
    397447, 419210, 440795, 462224, 483532, 504758
  ];
  var TROPICAL_YEAR_MS = 31556925974.7;
  var BASE_UTC_MS = Date.UTC(1900, 0, 6, 2, 5);
  function dateKey(date) {
    return date.getUTCFullYear() + "-" +
      String(date.getUTCMonth() + 1).padStart(2, "0") + "-" +
      String(date.getUTCDate()).padStart(2, "0");
  }

  function termsForYear(year) {
    var result = {};
    TERM_NAMES.forEach(function (name, index) {
      var instant = new Date(BASE_UTC_MS + TROPICAL_YEAR_MS * (year - 1900) + TERM_MINUTES[index] * 60000);
      result[dateKey(instant)] = name;
    });
    return result;
  }

  function pad(value) { return String(value).padStart(2, "0"); }
  function localKey(date) { return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()); }

  function renderSolarTerms() {
    var heading = document.querySelector(".calendar-heading h1, .month-switcher h1");
    var cells = Array.from(document.querySelectorAll(".calendar-grid.days .day"));
    if (!heading || !cells.length) return;
    var match = heading.textContent.match(/(\d{4})년\s*(\d{1,2})월/);
    if (!match) return;

    var year = Number(match[1]);
    var monthIndex = Number(match[2]) - 1;
    var first = new Date(year, monthIndex, 1);
    first.setDate(first.getDate() - first.getDay());
    var terms = Object.assign({}, termsForYear(year - 1), termsForYear(year), termsForYear(year + 1));

    cells.forEach(function (cell, index) {
      var date = new Date(first);
      date.setDate(first.getDate() + index);
      var name = terms[localKey(date)];
      var container = cell.querySelector(".built-in-items");
      var old = cell.querySelector(".dayfolder-solar-term");
      if (!name || !container) {
        if (old) old.remove();
        return;
      }
      if (!old) {
        old = document.createElement("span");
        old.className = "built-in-item dayfolder-solar-term";
        old.title = "대한민국 24절기";
        container.appendChild(old);
      }
      if (old.textContent !== name) old.textContent = name;
    });
  }

  var queued = false;
  function queueRender() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      renderSolarTerms();
    });
  }

  var observer = new MutationObserver(queueRender);
  function start() {
    observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
    queueRender();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
