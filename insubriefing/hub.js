(function () {
  "use strict";

  var fix = document.createElement("style");
  fix.textContent = `
    .ib-heading > p,
    .ib-note,
    .ib-partner > span,
    #ib-app footer p { display: none; }

    #ib-app {
      --brief-navy: #172033;
      --brief-line: color-mix(in srgb, var(--bd) 84%, transparent);
      --brief-soft: color-mix(in srgb, var(--ac) 8%, var(--s1));
      --brief-blue: color-mix(in srgb, var(--ac) 88%, #2563eb);
    }

    #ib-app footer {
      display: flex;
      min-height: 120px;
      align-items: center;
      margin-top: 64px;
      border-top: 1px solid var(--bd);
    }

    #ib-nav .ib-dayfolder-link,
    #ib-nav .ib-login-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 38px;
      padding: 0 16px;
      border: 1px solid var(--brief-line);
      border-radius: var(--radius-full);
      background: color-mix(in srgb, var(--s1) 88%, transparent);
      color: var(--brief-navy);
      font-size: 13px;
      font-weight: 800;
      text-decoration: none;
      box-shadow: 0 8px 24px color-mix(in srgb, var(--tp) 5%, transparent);
    }

    #ib-nav .ib-dayfolder-link {
      border-color: transparent;
      background: transparent;
      box-shadow: none;
    }

    #ib-nav .ib-dayfolder-link:hover,
    #ib-nav .ib-login-button:hover {
      border-color: color-mix(in srgb, var(--ac) 44%, var(--brief-line));
      color: var(--ac);
      background: var(--s1);
    }

    #ib-app footer:after {
      content: "onesecond.solutions";
      margin-left: auto;
      color: var(--tf);
    }

    .ib-hero {
      position: relative;
      max-width: none;
      min-height: 760px;
      grid-template-columns: 1fr;
      justify-items: center;
      align-items: start;
      gap: 0;
      padding: 120px 24px 360px;
      overflow: hidden;
      text-align: center;
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--s1) 94%, transparent) 0%, color-mix(in srgb, var(--s1) 22%, transparent) 58%, color-mix(in srgb, var(--s1) 0%, transparent) 100%),
        url("./assets/generated/briefing-toss-hero.webp") center bottom / cover no-repeat;
    }

    .ib-hero-copy {
      position: relative;
      z-index: 1;
      max-width: 860px;
    }

    .ib-hero h1 {
      font-size: clamp(48px, 5.2vw, 76px);
      line-height: 1.14;
    }

    .ib-hero-copy > p:not(.ib-kicker) {
      max-width: 720px;
      margin-left: auto;
      margin-right: auto;
    }

    .ib-hero-panel {
      min-height: 390px;
      display: none;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      border: 1px solid var(--brief-line);
      background:
        radial-gradient(circle at 82% 18%, color-mix(in srgb, var(--ac) 14%, transparent), transparent 30%),
        linear-gradient(145deg, var(--s1) 0%, color-mix(in srgb, var(--s2) 72%, var(--s1)) 100%);
      color: var(--tp);
      box-shadow: 0 24px 70px color-mix(in srgb, var(--tp) 10%, transparent);
    }

    .ib-hero-panel:before { display: none; }
    .ib-hero-panel > p {
      color: var(--ac);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: .12em;
    }

    .ib-hero-panel > strong {
      max-width: 360px;
      margin: 14px 0 20px;
      color: var(--brief-navy);
      text-shadow: 0 1px 0 color-mix(in srgb, var(--s1) 92%, transparent);
    }

    .ib-hero-panel ul {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .ib-hero-panel li {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 0 14px;
      border: 1px solid var(--brief-line);
      border-radius: var(--radius-sm);
      background: color-mix(in srgb, var(--s1) 88%, transparent);
      backdrop-filter: blur(10px);
      color: var(--ts);
      font-weight: 800;
    }

    .ib-hero-panel li:before {
      content: "";
      width: 9px;
      height: 9px;
      border-radius: var(--radius-full);
      background: var(--ac);
      box-shadow: 0 0 0 5px color-mix(in srgb, var(--ac) 12%, transparent);
    }

    .ib-hero-panel .ib-hero-dashboard {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 26px;
    }

    .ib-hero-panel .ib-hero-tile {
      min-height: 82px;
      padding: 14px;
      border: 1px solid var(--brief-line);
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--s1) 86%, transparent);
      backdrop-filter: blur(10px);
    }

    .ib-hero-panel .ib-hero-tile b {
      display: block;
      color: var(--brief-navy);
      font-size: 20px;
      line-height: 1.1;
    }

    .ib-hero-panel .ib-hero-tile span {
      display: block;
      margin-top: 8px;
      color: var(--tf);
      font-size: 12px;
      font-weight: 800;
    }

    .ib-hero-panel .ib-hero-bar {
      position: relative;
      height: 7px;
      margin-top: 12px;
      overflow: hidden;
      border-radius: var(--radius-full);
      background: var(--s2);
    }

    .ib-hero-panel .ib-hero-bar:after {
      content: "";
      position: absolute;
      inset: 0 auto 0 0;
      width: var(--w, 70%);
      border-radius: inherit;
      background: linear-gradient(90deg, var(--ac), var(--ach));
    }

    .ib-three article {
      position: relative;
      min-height: 320px;
      padding: 30px;
      overflow: hidden;
      background:
        radial-gradient(circle at 84% 18%, color-mix(in srgb, var(--ac) 12%, transparent), transparent 32%),
        var(--s1);
      transition: transform .2s ease, box-shadow .2s ease;
    }

    .ib-three article:hover {
      transform: translateY(-4px);
      box-shadow: 0 22px 60px color-mix(in srgb, var(--tp) 9%, transparent);
    }

    .ib-three article:before {
      display: grid;
      place-items: center;
      width: 68px;
      height: 68px;
      margin-bottom: 34px;
      border-radius: var(--radius-lg);
      background: var(--brief-soft);
      color: var(--ac);
      font-size: 30px;
      font-weight: 900;
    }

    .ib-three article:nth-child(1):before { content: "01"; }
    .ib-three article:nth-child(2):before { content: "02"; }
    .ib-three article:nth-child(3):before { content: "03"; }

    .ib-three article:after {
      content: "";
      position: absolute;
      right: 24px;
      top: 34px;
      width: 126px;
      height: 78px;
      opacity: .62;
      background:
        linear-gradient(var(--brief-line), var(--brief-line)) 0 14px / 100% 1px no-repeat,
        linear-gradient(var(--brief-line), var(--brief-line)) 0 38px / 100% 1px no-repeat,
        linear-gradient(var(--brief-line), var(--brief-line)) 0 62px / 80% 1px no-repeat,
        linear-gradient(90deg, var(--brief-blue), var(--ach)) 0 0 / 52px 8px no-repeat;
    }

    .ib-three h3 { margin-top: 0; }

    .ib-topics button {
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--s1) 28%, transparent);
      filter: saturate(.82) contrast(.98);
    }

    .ib-topics button:before {
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--tp) 4%, transparent) 0%, color-mix(in srgb, var(--tp) 78%, transparent) 100%),
        linear-gradient(135deg, color-mix(in srgb, var(--ac) 20%, transparent), transparent 54%);
    }

    .ib-topics button:nth-child(1) { background-image: url("./assets/cards-v2/topic-indemnity.webp"); }
    .ib-topics button:nth-child(2) { background-image: url("./assets/cards-v2/topic-cancer.webp"); }
    .ib-topics button:nth-child(3) { background-image: url("./assets/cards-v2/topic-heart.webp"); }
    .ib-topics button:nth-child(4) { background-image: url("./assets/cards-v2/topic-care.webp"); }
    .ib-topics button:nth-child(5) { background-image: url("./assets/cards-v2/topic-driver.webp"); }
    .ib-topics button:nth-child(6) { background-image: url("./assets/cards-v2/topic-fire.webp"); }

    .ib-health article {
      position: relative;
      min-height: 250px;
      overflow: hidden;
      background:
        linear-gradient(145deg, var(--s1), color-mix(in srgb, var(--s2) 70%, var(--s1)));
    }

    .ib-health-photo {
      height: 130px;
      background:
        radial-gradient(circle at 78% 35%, color-mix(in srgb, var(--ac) 24%, transparent), transparent 28%),
        linear-gradient(135deg, color-mix(in srgb, var(--ac) 12%, var(--s1)), var(--s1));
    }

    .ib-health-photo:before {
      content: "";
      display: block;
      width: calc(100% - 48px);
      height: 72px;
      margin: 30px auto 0;
      border-left: 3px solid var(--ac);
      border-bottom: 3px solid var(--bd);
      background:
        linear-gradient(135deg, transparent 47%, var(--ac) 48% 52%, transparent 53%) 8px 18px / 86% 42px no-repeat,
        repeating-linear-gradient(90deg, transparent 0 20%, color-mix(in srgb, var(--bd) 82%, transparent) 20% calc(20% + 1px));
    }

    .ib-health article:nth-child(2) .ib-health-photo {
      background:
        radial-gradient(circle at 80% 32%, color-mix(in srgb, var(--mint) 22%, transparent), transparent 28%),
        linear-gradient(135deg, color-mix(in srgb, var(--mint) 10%, var(--s1)), var(--s1));
    }

    .ib-health article:nth-child(2) .ib-health-photo:before {
      border-left-color: var(--mint);
      background:
        linear-gradient(135deg, transparent 47%, var(--mint) 48% 52%, transparent 53%) 8px 18px / 86% 42px no-repeat,
        repeating-linear-gradient(90deg, transparent 0 20%, color-mix(in srgb, var(--bd) 82%, transparent) 20% calc(20% + 1px));
    }

    .ib-health article:nth-child(3) .ib-health-photo {
      background:
        radial-gradient(circle at 80% 32%, color-mix(in srgb, var(--warn) 22%, transparent), transparent 28%),
        linear-gradient(135deg, color-mix(in srgb, var(--warn) 10%, var(--s1)), var(--s1));
    }

    .ib-health article:nth-child(3) .ib-health-photo:before {
      border-left-color: var(--warn);
      background:
        linear-gradient(135deg, transparent 47%, var(--warn) 48% 52%, transparent 53%) 8px 18px / 86% 42px no-repeat,
        repeating-linear-gradient(90deg, transparent 0 20%, color-mix(in srgb, var(--bd) 82%, transparent) 20% calc(20% + 1px));
    }

    @media (max-width: 560px) {
      .ib-hero {
        min-height: 640px;
        padding-top: 76px;
        padding-bottom: 300px;
        background-size: auto 76%;
      }
      .ib-hero h1 { font-size: 38px; }
      .ib-mobile-nav a { font-size: 11px; }
      .ib-hero-copy > p:not(.ib-kicker) br { display: none; }
      .ib-hero-panel .ib-hero-dashboard { grid-template-columns: 1fr; }
      .ib-three article { min-height: 280px; }
    }
  `;
  document.head.appendChild(fix);

  var lead = document.querySelector(".ib-hero-copy > p:not(.ib-kicker)");
  if (lead) {
    lead.innerHTML = "보험 소식부터 보장별 정보, 건강 통계와 보험금 청구 방법까지<br>복잡하지 않게 확인하세요.";
  }

  var menu = document.querySelector(".ib-menu");
  var nav = document.getElementById("ib-nav");
  var toggle = document.getElementById("ib-topic-toggle");
  var all = document.getElementById("ib-all-topics");

  var advisorSessionKey = "insubriefingAdvisorSession";

  function isAdvisorLoggedIn() {
    return window.localStorage.getItem(advisorSessionKey) === "1";
  }

  function renderAdvisorNav() {
    if (!nav) return;

    var dayfolderLink = nav.querySelector(".ib-dayfolder-link");
    var loginButton = nav.querySelector(".ib-login-button");
    var loggedIn = isAdvisorLoggedIn();

    if (!loginButton) {
      loginButton = document.createElement("button");
      loginButton.className = "ib-login-button";
      loginButton.type = "button";
      nav.appendChild(loginButton);
    }

    if (loggedIn && !dayfolderLink) {
      dayfolderLink = document.createElement("a");
      dayfolderLink.className = "ib-dayfolder-link";
      dayfolderLink.href = "./dayfolder-advisor/";
      dayfolderLink.target = "_blank";
      dayfolderLink.rel = "noopener";
      dayfolderLink.textContent = "데이폴더";
      dayfolderLink.setAttribute("aria-label", "데이폴더 설계사 버전 열기");
      nav.insertBefore(dayfolderLink, loginButton);
    }

    if (!loggedIn && dayfolderLink) {
      dayfolderLink.remove();
    }

    loginButton.textContent = loggedIn ? "로그아웃" : "로그인";
    loginButton.setAttribute("aria-label", loggedIn ? "설계사 로그아웃" : "설계사 로그인");
  }

  if (nav) {
    renderAdvisorNav();
    nav.addEventListener("click", function (event) {
      var loginButton = event.target.closest(".ib-login-button");
      if (!loginButton) return;

      if (isAdvisorLoggedIn()) {
        window.localStorage.removeItem(advisorSessionKey);
      } else {
        window.localStorage.setItem(advisorSessionKey, "1");
      }
      renderAdvisorNav();
    });
  }

  if (menu && nav) {
    menu.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      menu.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", function () {
      nav.classList.remove("is-open");
      menu.setAttribute("aria-expanded", "false");
    });
  }

  if (toggle && all) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      all.hidden = open;
      toggle.firstChild.nodeValue = open ? "전체 보험정보 보기 " : "보험정보 접기 ";
      toggle.querySelector("span").textContent = open ? "＋" : "−";
    });
  }
})();
