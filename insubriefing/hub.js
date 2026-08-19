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

    /* 워크스테이션과 동일한 고정 배경 이미지 + 투명 레이어 패턴.
       body 자체 background는 캔버스로 전파되어 아래 fixed 의사요소보다
       뒤에 그려지므로(HTML/BODY 특례) 그대로 두고 :before/:after만 추가. */
    body:before {
      content: "";
      position: fixed;
      z-index: -2;
      inset: 0;
      background-image: url("./assets/generated/briefing-toss-hero.webp");
      background-position: center;
      background-size: cover;
      transform: scale(1.01);
    }
    body:after {
      content: "";
      position: fixed;
      z-index: -1;
      inset: 0;
      background: linear-gradient(180deg, color-mix(in srgb, var(--s1) 16%, transparent), color-mix(in srgb, var(--s1) 6%, transparent));
    }
    .ib-tint {
      background: color-mix(in srgb, var(--s2) 40%, transparent);
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

    /* 계정 드롭다운(워크스테이션 ws-account와 동일 패턴) */
    .ib-account { position: relative; }
    .ib-account-trigger {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 38px;
      padding: 0 16px;
      border: 1px solid var(--brief-line);
      border-radius: var(--radius-full);
      background: color-mix(in srgb, var(--s1) 88%, transparent);
      color: var(--brief-navy);
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
    }
    .ib-account-trigger:hover {
      border-color: color-mix(in srgb, var(--ac) 44%, var(--brief-line));
      color: var(--ac);
      background: var(--s1);
    }
    .ib-account-trigger:after {
      content: "";
      width: 6px;
      height: 6px;
      border-right: 1.5px solid currentColor;
      border-bottom: 1.5px solid currentColor;
      transform: translateY(-2px) rotate(45deg);
      transition: transform .18s ease;
    }
    .ib-account-trigger[aria-expanded="true"]:after { transform: translateY(2px) rotate(225deg); }
    .ib-account-popover {
      position: absolute;
      z-index: 40;
      top: calc(100% + 8px);
      right: 0;
      width: 220px;
      padding: 6px;
      border: 1px solid var(--bd);
      border-radius: var(--radius-md);
      background: var(--s1);
      box-shadow: 0 16px 40px color-mix(in srgb, var(--tp) 16%, transparent);
    }
    .ib-account-popover[hidden] { display: none; }
    .ib-account-email {
      margin: 0 6px 6px;
      padding: 10px 8px 12px;
      border-bottom: 1px solid var(--bd);
      color: var(--ts);
      font-size: 12px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }
    .ib-account-popover button {
      width: 100%;
      min-height: 40px;
      justify-content: flex-start;
      display: flex;
      align-items: center;
      border: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--tp);
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
    }
    .ib-account-popover button:hover,
    .ib-account-popover button:focus-visible { background: var(--s2); }
    .ib-account-bgmode { margin: 0 6px 6px; padding: 2px 2px 12px; border-bottom: 1px solid var(--bd); }
    .ib-account-bgmode > span { display: block; margin-bottom: 7px; color: var(--ts); font-size: 12px; font-weight: 700; }
    .ib-bgmode-options { display: flex; gap: 6px; }
    .ib-account-popover .ib-bgmode-btn { width: auto; flex: 1; min-height: 34px; justify-content: center; padding: 0 4px; border: 1px solid var(--bd); border-radius: var(--radius-sm); background: var(--s1); color: var(--tp); font-size: 11px; font-weight: 700; }
    .ib-account-popover .ib-bgmode-btn:hover { background: var(--s2); }
    .ib-account-popover .ib-bgmode-btn.on { border-color: var(--ac); background: color-mix(in srgb, var(--ac) 12%, var(--s1)); color: var(--ac); }

    /* 배경화면 모드(워크스테이션과 동일 개념·동일 localStorage 키 ws_bg_mode 공유) */
    body.ib-bg-flat:before { display: none; }
    body.ib-bg-white:after { background: #f6f7fb; }
    body.ib-bg-dark:after { background: #14161b; }
    body.ib-bg-dark {
      --bg: #14161b; --s1: #1c1f26; --s2: #22262e; --sh: #1c1f26; --bd: #2c313a;
      --tp: #f4f5f7; --ts: #c7cad1; --tf: #8b8f98; --bodytx: #d7d9dd;
      --ac: #818cf8; --ach: #a5b4fc;
    }
    body.ib-bg-flat #leaflet-calendar,
    body.ib-bg-flat .ib-leaflet-dow,
    body.ib-bg-flat .ib-leaflet-day {
      background: var(--s1);
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
    body.ib-bg-flat .ib-tint { background: var(--s2); }
    body.ib-bg-flat .ib-leaflet-day.is-other { background: var(--sh); }

    .ib-profile-dialog {
      position: fixed;
      inset: 50% auto auto 50%;
      width: min(440px, calc(100vw - 32px));
      max-height: calc(100dvh - 32px);
      margin: 0;
      padding: 0;
      overflow: auto;
      border: 1px solid var(--bd);
      border-radius: var(--radius-lg, 16px);
      background: var(--s1);
      color: var(--tp);
      box-shadow: 0 24px 80px color-mix(in srgb, var(--tp) 24%, transparent);
      transform: translate(-50%, -50%);
    }
    .ib-profile-dialog::backdrop { background: color-mix(in srgb, var(--tp) 42%, transparent); backdrop-filter: blur(4px); }
    .ib-profile-dialog form { display: grid; gap: 18px; padding: 24px; }
    .ib-profile-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .ib-profile-head strong { font-size: 18px; }
    .ib-profile-head p { margin: 6px 0 0; color: var(--ts); font-size: 12px; }
    .ib-profile-dialog label { display: grid; gap: 8px; color: var(--ts); font-size: 12px; font-weight: 700; }
    .ib-profile-dialog input { min-height: 44px; padding: 0 13px; border: 1px solid var(--bd); border-radius: var(--radius-sm); background: var(--s1); color: var(--tp); font: inherit; }
    .ib-profile-close { width: 34px; height: 34px; border: 0; border-radius: var(--radius-full); background: var(--s2); color: var(--tp); font-size: 20px; cursor: pointer; }
    .ib-profile-message { min-height: 20px; margin: 0; color: var(--ts); font-size: 12px; }
    .ib-profile-actions { display: flex; justify-content: flex-end; gap: 8px; }
    .ib-profile-actions button { min-height: 40px; padding: 0 18px; border: 1px solid var(--bd); border-radius: var(--radius-full); background: var(--s1); color: var(--tp); font-weight: 700; cursor: pointer; }
    .ib-profile-actions .ib-profile-save { border-color: var(--ac); background: var(--ac); color: var(--s1); }

    #ib-app footer:after {
      content: "onesecond.solutions";
      margin-left: auto;
      color: var(--tf);
    }

    .ib-hero {
      position: relative;
      max-width: none;
      min-height: calc(100vh - 76px);
      grid-template-columns: 1fr;
      justify-items: stretch;
      align-items: stretch;
      gap: 0;
      padding: 24px 24px 56px;
      overflow: hidden;
      text-align: center;
      background: transparent;
    }

    #leaflet-calendar {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      min-height: 0;
      width: 100%;
      max-width: none;
      padding: 24px;
      border-radius: var(--radius-lg);
      background: color-mix(in srgb, var(--s1) 46%, transparent);
      backdrop-filter: blur(16px) saturate(130%);
      -webkit-backdrop-filter: blur(16px) saturate(130%);
      box-shadow: 0 30px 80px color-mix(in srgb, var(--tp) 16%, transparent);
      text-align: left;
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

    .ib-card-points {
      display: grid;
      gap: 8px;
      margin: 20px 0 0;
      padding: 0;
      list-style: none;
    }

    .ib-card-points li {
      position: relative;
      padding-left: 16px;
      color: var(--ts);
      font-size: 14px;
      line-height: 1.65;
    }

    .ib-card-points li:before {
      content: "";
      position: absolute;
      left: 0;
      top: .7em;
      width: 6px;
      height: 6px;
      border-radius: var(--radius-full);
      background: var(--ac);
    }

    .ib-source-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 20px;
    }

    .ib-source-list a,
    .ib-source-list span {
      display: inline-flex;
      align-items: center;
      min-height: 30px;
      padding: 0 11px;
      border: 1px solid var(--brief-line);
      border-radius: var(--radius-full);
      background: color-mix(in srgb, var(--s1) 86%, transparent);
      color: var(--ts);
      font-size: 12px;
      font-weight: 800;
    }

    .ib-latest-reference {
      margin-top: 14px;
      padding: 13px 14px;
      border: 1px solid color-mix(in srgb, var(--ac) 24%, var(--brief-line));
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--ac) 5%, var(--s1));
    }

    .ib-latest-reference small {
      display: block;
      margin: 0 0 6px;
      color: var(--ac);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: .04em;
    }

    .ib-latest-reference a {
      color: var(--tp);
      font-size: 13px;
      font-weight: 800;
      line-height: 1.55;
    }

    .ib-topic-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 14px;
      margin-top: 22px;
    }

    .ib-topic-detail {
      padding: 24px;
      border: 1px solid var(--brief-line);
      border-radius: var(--radius-lg);
      background: color-mix(in srgb, var(--s1) 92%, transparent);
      box-shadow: 0 14px 40px color-mix(in srgb, var(--tp) 5%, transparent);
    }

    .ib-topic-detail small {
      color: var(--ac);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: .04em;
    }

    .ib-topic-detail h3 {
      margin: 10px 0 10px;
      font-size: 21px;
      line-height: 1.35;
    }

    .ib-topic-detail p {
      color: var(--ts);
      line-height: 1.75;
    }

    .ib-detail-panel {
      margin-top: 30px;
      padding: 32px;
      border: 1px solid var(--brief-line);
      border-radius: var(--radius-lg);
      background: var(--s1);
      box-shadow: 0 18px 48px color-mix(in srgb, var(--tp) 7%, transparent);
    }

    .ib-detail-panel[hidden] { display: none; }

    .ib-detail-head {
      display: grid;
      gap: 12px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--brief-line);
    }

    .ib-detail-head small {
      color: var(--ac);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: .12em;
    }

    .ib-detail-head h3 {
      font-size: clamp(26px, 3vw, 38px);
      line-height: 1.25;
      letter-spacing: -.04em;
    }

    .ib-detail-head p {
      max-width: 820px;
      color: var(--ts);
      font-size: 16px;
      line-height: 1.8;
    }

    .ib-detail-body {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 300px;
      gap: 24px;
      margin-top: 24px;
    }

    .ib-detail-section {
      padding: 22px;
      border: 1px solid var(--brief-line);
      border-radius: var(--radius-md);
      background: color-mix(in srgb, var(--s2) 64%, var(--s1));
    }

    .ib-detail-section + .ib-detail-section { margin-top: 14px; }

    .ib-detail-section h4 {
      margin-bottom: 12px;
      font-size: 18px;
      letter-spacing: -.02em;
    }

    .ib-detail-section ul {
      display: grid;
      gap: 9px;
      margin: 0;
      padding-left: 18px;
      color: var(--ts);
      line-height: 1.75;
    }

    .ib-detail-side {
      display: grid;
      align-content: start;
      gap: 14px;
    }

    .ib-detail-actions,
    .ib-archive-list {
      padding: 18px;
      border: 1px solid var(--brief-line);
      border-radius: var(--radius-md);
      background: var(--s1);
    }

    .ib-detail-actions h4,
    .ib-archive-list h4 {
      margin-bottom: 12px;
      font-size: 15px;
    }

    .ib-detail-actions a,
    .ib-archive-list a {
      display: block;
      padding: 12px 0;
      border-top: 1px solid var(--brief-line);
      color: var(--brief-navy);
      font-size: 13px;
      font-weight: 800;
      line-height: 1.45;
    }

    .ib-detail-actions a:first-of-type,
    .ib-archive-list a:first-of-type {
      border-top: 0;
    }

    .ib-three article,
    .ib-topic-detail,
    .ib-health article {
      cursor: pointer;
    }
@media (max-width: 560px) {
      .ib-mobile-nav { grid-template-columns: repeat(4, 1fr); }
      .ib-hero {
        min-height: 0;
        padding-top: 20px;
        padding-bottom: 40px;
      }
      .ib-mobile-nav a { font-size: 11px; }
      #leaflet-calendar { padding: 16px; }
      .ib-hero-panel .ib-hero-dashboard { grid-template-columns: 1fr; }
      .ib-three article { min-height: 280px; }
    }
  `;
  document.head.appendChild(fix);

  var menu = document.querySelector(".ib-menu");
  var nav = document.getElementById("ib-nav");
  var toggle = document.getElementById("ib-topic-toggle");
  var all = document.getElementById("ib-all-topics");

  /* 배경화면 모드 — 워크스테이션과 동일 localStorage 키(ws_bg_mode) 공유.
     로그인 여부와 무관하게 항상 적용(브라우저 단위 취향), 변경 버튼만
     계정 드롭다운(로그인 시)에 노출 — 워크스테이션과 동일한 동작. */
  function currentBgMode() { try { return localStorage.getItem("ws_bg_mode") || "image"; } catch (_e) { return "image"; } }
  function applyBgMode(mode) {
    var body = document.body;
    body.classList.remove("ib-bg-flat", "ib-bg-white", "ib-bg-dark");
    if (mode === "white") body.classList.add("ib-bg-flat", "ib-bg-white");
    else if (mode === "dark") body.classList.add("ib-bg-flat", "ib-bg-dark");
    document.documentElement.setAttribute("data-theme", mode === "dark" ? "dark" : "light");
    try { localStorage.setItem("ws_bg_mode", mode); } catch (_e) {}
  }
  function bgModeButtonsHtml(active) {
    var modes = [["image", "기본이미지"], ["white", "화이트"], ["dark", "다크"]];
    return modes.map(function (m) { return '<button type="button" class="ib-bgmode-btn' + (m[0] === active ? " on" : "") + '" data-bg="' + m[0] + '">' + m[1] + "</button>"; }).join("");
  }
  applyBgMode(currentBgMode());

  function currentAccount() {
    try { return JSON.parse(window.localStorage.getItem("os_user") || window.sessionStorage.getItem("os_user") || "{}"); }
    catch (_e) { return {}; }
  }

  function hasAccountSession() {
    return !!((window.localStorage.getItem("os_token") || window.sessionStorage.getItem("os_token")) && currentAccount().id);
  }

  function esc(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function logoutAdvisor() {
    ["os_token", "os_refresh_token", "os_user", "selected_menu"].forEach(function (key) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    });
    renderAdvisorNav();
  }
  function closeAccountMenu() {
    var popover = document.getElementById("ib-account-popover"), trigger = document.getElementById("ib-account-trigger");
    if (popover) popover.hidden = true;
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  }
  function openProfileDialog() {
    closeAccountMenu();
    var dialog = document.getElementById("ib-profile-dialog");
    if (!dialog) return;
    var user = currentAccount(), state = window.AppState || {};
    document.getElementById("ib-profile-name").value = state.name || user.name || (user.user_metadata && user.user_metadata.name) || "";
    document.getElementById("ib-profile-phone").value = state.phone || user.phone || (user.user_metadata && user.user_metadata.phone) || "";
    document.getElementById("ib-profile-message").textContent = "";
    dialog.showModal();
  }

  function renderAdvisorNav() {
    if (!nav) return;
    var workstationLink = nav.querySelector(".ib-workstation-link");
    var loggedIn = hasAccountSession();

    if (!workstationLink) {
      workstationLink = document.createElement("a");
      workstationLink.className = "ib-workstation-link";
      workstationLink.href = "/insubriefing/workstation/";
      workstationLink.textContent = "워크스테이션";
      workstationLink.setAttribute("aria-label", "워크스테이션 열기");
      nav.appendChild(workstationLink);
    }

    var loginButton = nav.querySelector(".ib-login-button");
    var accountBox = nav.querySelector(".ib-account");

    if (!loggedIn) {
      if (accountBox) accountBox.remove();
      if (!loginButton) {
        loginButton = document.createElement("button");
        loginButton.className = "ib-login-button";
        loginButton.type = "button";
        nav.appendChild(loginButton);
      }
      loginButton.textContent = "원세컨드 로그인";
      loginButton.setAttribute("aria-label", "설계사 로그인");
      return;
    }

    if (loginButton) loginButton.remove();
    var user = currentAccount();
    var name = (window.AppState && window.AppState.name) || user.name || "사용자";
    var email = (window.AppState && window.AppState.email) || user.email || "";
    if (!accountBox) {
      accountBox = document.createElement("div");
      accountBox.className = "ib-account";
      nav.appendChild(accountBox);
    }
    accountBox.innerHTML = '<button type="button" class="ib-account-trigger" id="ib-account-trigger" aria-haspopup="menu" aria-expanded="false">' + esc(name) + '</button>'
      + '<div class="ib-account-popover" id="ib-account-popover" role="menu" hidden>'
      + '<div class="ib-account-email" aria-label="로그인된 이메일 주소">' + esc(email || "이메일 정보 없음") + '</div>'
      + '<div class="ib-account-bgmode"><span>배경화면</span><div class="ib-bgmode-options" role="group" aria-label="배경화면 모드">' + bgModeButtonsHtml(currentBgMode()) + '</div></div>'
      + '<button type="button" id="ib-profile-open" role="menuitem">개인정보 수정</button>'
      + '<button type="button" id="ib-logout-btn" role="menuitem">로그아웃</button>'
      + '</div>';
    accountBox.querySelector("#ib-account-trigger").addEventListener("click", function (event) {
      event.stopPropagation();
      var popover = document.getElementById("ib-account-popover"), open = popover.hidden;
      closeAccountMenu();
      popover.hidden = !open;
      this.setAttribute("aria-expanded", String(open));
    });
    accountBox.querySelector("#ib-profile-open").addEventListener("click", openProfileDialog);
    accountBox.querySelector("#ib-logout-btn").addEventListener("click", logoutAdvisor);
    Array.prototype.forEach.call(accountBox.querySelectorAll(".ib-bgmode-btn"), function (btn) {
      btn.addEventListener("click", function () {
        applyBgMode(btn.getAttribute("data-bg"));
        Array.prototype.forEach.call(accountBox.querySelectorAll(".ib-bgmode-btn"), function (b) { b.classList.toggle("on", b === btn); });
      });
    });
  }

  if (nav) {
    renderAdvisorNav();
    nav.addEventListener("click", function (event) {
      var loginButton = event.target.closest(".ib-login-button");
      if (!loginButton) return;
      window.location.href = "/pages/landing.html?auth=login&redirect=%2Finsubriefing%2Fworkstation%2F";
    });
  }

  document.addEventListener("click", function (event) {
    var box = document.querySelector(".ib-account");
    if (box && !box.contains(event.target)) closeAccountMenu();
  });
  document.addEventListener("keydown", function (event) { if (event.key === "Escape") closeAccountMenu(); });

  var profileDialog = document.getElementById("ib-profile-dialog");
  if (profileDialog) {
    profileDialog.querySelector(".ib-profile-close").addEventListener("click", function () { profileDialog.close(); });
    profileDialog.querySelector(".ib-profile-cancel").addEventListener("click", function () { profileDialog.close(); });
    document.getElementById("ib-profile-form").addEventListener("submit", function (event) {
      event.preventDefault();
      var name = document.getElementById("ib-profile-name").value.trim(), phone = document.getElementById("ib-profile-phone").value.trim(), message = document.getElementById("ib-profile-message");
      if (!name) { message.textContent = "이름을 입력해 주세요."; return; }
      message.textContent = "저장 중입니다.";
      if (!window.Auth || !window.Auth.saveUser) { message.textContent = "사용자 정보를 불러온 뒤 다시 시도해 주세요."; return; }
      window.Auth.saveUser({ name: name, phone: phone || null }).then(function (ok) {
        if (!ok) { message.textContent = "저장하지 못했습니다. 잠시 후 다시 시도해 주세요."; return; }
        var user = currentAccount();
        user.name = name; user.phone = phone;
        user.user_metadata = Object.assign({}, user.user_metadata || {}, { name: name, phone: phone });
        localStorage.setItem("os_user", JSON.stringify(user));
        sessionStorage.setItem("os_user", JSON.stringify(user));
        renderAdvisorNav();
        profileDialog.close();
      });
    });
  }

  /* 개인정보 수정(saveUser)은 window.AppState.userId만 있으면 동작한다.
     ⚠️ window.Auth.init()은 절대 호출하지 않는다 — 이 페이지는 공개
     홈이라, 토큰이 만료된 방문자가 우연히 들렀다가 로그인 페이지로
     강제 리다이렉트되면 안 된다(로컬 검수에서 실제로 재현됨: 유효하지
     않은 토큰으로 Auth.init() 호출 시 /index.html로 튕겨나감). 대신
     이미 신뢰 가능한 os_user 값만으로 AppState를 직접 채운다. */
  if (window.AppState && hasAccountSession()) {
    var _acctUser = currentAccount();
    window.AppState.userId = _acctUser.id;
    window.AppState.name = _acctUser.name || (_acctUser.user_metadata && _acctUser.user_metadata.name) || "";
    window.AppState.email = _acctUser.email || "";
  }

  var mobileNav = document.querySelector(".ib-mobile-nav");
  if (mobileNav && !mobileNav.querySelector(".ib-workstation-mobile")) {
    var mobileWorkstation = document.createElement("a");
    mobileWorkstation.className = "ib-workstation-mobile";
    mobileWorkstation.href = "/insubriefing/workstation/";
    mobileWorkstation.textContent = "워크스테이션";
    mobileNav.appendChild(mobileWorkstation);
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

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function (ch) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[ch];
    });
  }

  function safeUrl(value) {
    try {
      var url = new URL(value, window.location.href);
      if (url.protocol === "http:" || url.protocol === "https:" || url.pathname.indexOf("/") === 0) {
        return url.href;
      }
    } catch (error) {
      return "#";
    }
    return "#";
  }

  function renderPoints(points) {
    if (!Array.isArray(points) || !points.length) return "";
    return '<ul class="ib-card-points">' + points.map(function (point) {
      return "<li>" + escapeHtml(point) + "</li>";
    }).join("") + "</ul>";
  }

  function renderSources(sources) {
    if (!Array.isArray(sources) || !sources.length) return "";
    return '<div class="ib-source-list" aria-label="출처">' + sources.map(function (source) {
      if (!source || !source.url) return "";
      return '<a href="' + escapeHtml(safeUrl(source.url)) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(source.label || "출처") + "</a>";
    }).join("") + "</div>";
  }

  function renderLatestReference(reference) {
    if (!reference || !reference.title) return "";
    var source = reference.source ? " ? " + reference.source : "";
    var label = "최신 참고자료" + source;
    var title = escapeHtml(reference.title);

    if (reference.url) {
      return '<div class="ib-latest-reference"><small>' + escapeHtml(label) + '</small><a href="' + escapeHtml(safeUrl(reference.url)) + '" target="_blank" rel="noopener noreferrer">' + title + "</a></div>";
    }

    return '<div class="ib-latest-reference"><small>' + escapeHtml(label) + "</small><a>" + title + "</a></div>";
  }

  function renderDetailSections(sections) {
    if (!Array.isArray(sections) || !sections.length) return "";
    return '<div class="ib-detail-sections">' + sections.map(function (section) {
      var items = Array.isArray(section.items) ? section.items : [];
      return '<section class="ib-detail-section">' +
        '<h4>' + escapeHtml(section.title || "") + '</h4>' +
        '<ul>' + items.map(function (item) {
          return '<li>' + escapeHtml(item) + '</li>';
        }).join("") + '</ul>' +
      '</section>';
    }).join("") + '</div>';
  }

  function renderArchive(items) {
    if (!Array.isArray(items) || !items.length) {
      return '<p class="ib-detail-empty">지난 자료가 아직 준비되지 않았습니다.</p>';
    }

    return items.map(function (item) {
      var source = item.source ? escapeHtml(item.source) : "출처";
      var date = item.publishedAt ? " ? " + escapeHtml(item.publishedAt) : "";
      var url = item.url ? escapeHtml(safeUrl(item.url)) : "#";
      return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' +
        '<strong>' + escapeHtml(item.title || "제목 없음") + '</strong>' +
        '<small>' + source + date + '</small>' +
      '</a>';
    }).join("");
  }

  function renderDetailPanel(label, item, archiveTitle) {
    if (!item) return "";
    return '<div class="ib-detail-head">' +
        '<small>' + escapeHtml(label || "상세 정보") + '</small>' +
        '<h3>' + escapeHtml(item.title || "") + '</h3>' +
        '<p>' + escapeHtml(item.summary || item.body || "") + '</p>' +
      '</div>' +
      '<div class="ib-detail-body">' +
        '<div>' + renderDetailSections(item.detailSections) + renderPoints(item.points) + '</div>' +
        '<aside class="ib-detail-side">' +
          '<div class="ib-detail-actions">' +
            '<h4>원문 보기</h4>' +
            (renderSources(item.sources) || '<p class="ib-detail-empty">연결된 원문이 없습니다.</p>') +
          '</div>' +
          '<div class="ib-archive-list">' +
            '<h4>' + escapeHtml(archiveTitle || "지난 자료 보기") + '</h4>' +
            renderArchive(item.archive) +
          '</div>' +
        '</aside>' +
      '</div>';
  }

  function showDetail(containerSelector, panelId, label, item, archiveTitle) {
    var container = document.querySelector(containerSelector);
    if (!container || !item) return;

    var panel = document.getElementById(panelId);
    if (!panel) {
      panel = document.createElement("div");
      panel.id = panelId;
      panel.className = "ib-detail-panel";
      panel.tabIndex = -1;
      container.appendChild(panel);
    }

    panel.innerHTML = renderDetailPanel(label, item, archiveTitle);
    panel.hidden = false;
    panel.focus({ preventScroll: true });
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function makeInteractive(node, callback) {
    if (!node) return;
    node.setAttribute("role", "button");
    node.tabIndex = 0;
    node.addEventListener("click", callback);
    node.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      callback(event);
    });
  }

  function bindDetails(library) {
    if (!library || typeof library !== "object") return;

    var briefingCards = document.querySelectorAll(".ib-three article");
    if (Array.isArray(library.today)) {
      library.today.slice(0, briefingCards.length).forEach(function (item, index) {
        makeInteractive(briefingCards[index], function () {
          showDetail("#briefing", "ib-briefing-detail", "오늘의 브리핑 " + (item.slot || String(index + 1).padStart(2, "0")), item, "지난 자료 보기");
        });
      });
    }

    var topicButtons = document.querySelectorAll(".ib-topics button");
    var topicCards = document.querySelectorAll(".ib-topic-detail");
    if (Array.isArray(library.insuranceInfo)) {
      library.insuranceInfo.forEach(function (item, index) {
        var label = "보험정보 / " + (item.title || "");
        makeInteractive(topicButtons[index], function () {
          showDetail("#insurance", "ib-insurance-detail", label, item, "관련 자료 보기");
        });
        makeInteractive(topicCards[index], function () {
          showDetail("#insurance", "ib-insurance-detail", label, item, "관련 자료 보기");
        });
      });
    }

    var healthCards = document.querySelectorAll(".ib-health article");
    if (Array.isArray(library.healthStats)) {
      library.healthStats.slice(0, healthCards.length).forEach(function (item, index) {
        makeInteractive(healthCards[index], function () {
          showDetail("#health", "ib-health-detail", "의학통계 상세", item, "통계 원문 보기");
        });
      });
    }
  }

  function renderToday(library) {
    var cards = document.querySelectorAll(".ib-three article");
    if (!cards.length || !Array.isArray(library.today)) return;

    library.today.slice(0, cards.length).forEach(function (item, index) {
      var card = cards[index];
      var title = card.querySelector("h3");
      var body = card.querySelector("p");
      var caption = card.querySelector("small");

      if (title) title.textContent = item.title || title.textContent;
      if (body) body.textContent = item.summary || body.textContent;
      if (caption) caption.textContent = item.caption || caption.textContent;

      var old = card.querySelectorAll(".ib-card-points, .ib-source-list, .ib-latest-reference");
      old.forEach(function (node) { node.remove(); });
      card.insertAdjacentHTML("beforeend", renderPoints(item.points) + renderSources(item.sources) + renderLatestReference(item.latestReference));
    });
  }

  function renderInsuranceInfo(library) {
    if (!Array.isArray(library.insuranceInfo)) return;

    var topicButtons = document.querySelectorAll(".ib-topics button");
    library.insuranceInfo.forEach(function (item, index) {
      var button = topicButtons[index];
      if (!button) return;
      var order = button.querySelector("span");
      var title = button.querySelector("strong");
      var subtitle = button.querySelector("small");
      if (order) order.textContent = item.order || order.textContent;
      if (title) title.textContent = item.title || title.textContent;
      if (subtitle) subtitle.textContent = item.subtitle || subtitle.textContent;
    });

    var insurance = document.getElementById("insurance");
    if (!insurance) return;
    var existing = insurance.querySelector(".ib-topic-details");
    if (existing) existing.remove();

    var html = '<div class="ib-topic-details" aria-label="보험정보 상세">';
    html += library.insuranceInfo.map(function (item) {
      return '<article class="ib-topic-detail">' +
        '<small>' + escapeHtml(item.order || "") + " · " + escapeHtml(item.subtitle || "") + '</small>' +
        '<h3>' + escapeHtml(item.title || "") + '</h3>' +
        '<p>' + escapeHtml(item.summary || "") + '</p>' +
        renderPoints(item.points) +
        renderSources(item.sources) +
      '</article>';
    }).join("");
    html += "</div>";

    var after = document.getElementById("ib-topic-toggle");
    if (after) after.insertAdjacentHTML("beforebegin", html);
    else insurance.insertAdjacentHTML("beforeend", html);
  }

  function renderHealthStats(library) {
    var cards = document.querySelectorAll(".ib-health article");
    if (!cards.length || !Array.isArray(library.healthStats)) return;

    library.healthStats.slice(0, cards.length).forEach(function (item, index) {
      var card = cards[index];
      var small = card.querySelector("small");
      var title = card.querySelector("h3");
      var body = card.querySelector("p");
      if (small) small.textContent = item.sourceLabel || small.textContent;
      if (title) title.textContent = item.title || title.textContent;
      if (body) body.textContent = item.summary || body.textContent;

      var old = card.querySelectorAll(".ib-card-points, .ib-source-list");
      old.forEach(function (node) { node.remove(); });
      card.querySelector("div:last-child").insertAdjacentHTML("beforeend", renderPoints(item.points) + renderSources(item.sources));
    });
  }

  function renderClaims(library) {
    var list = document.querySelector(".ib-steps");
    if (!list || !Array.isArray(library.claims)) return;

    list.innerHTML = library.claims.map(function (item) {
      return '<li><span>' + escapeHtml(item.step || "") + '</span><div><h3>' + escapeHtml(item.title || "") + '</h3><p>' + escapeHtml(item.body || "") + '</p>' + renderPoints(item.points) + renderSources(item.sources) + '</div></li>';
    }).join("");
  }

  function applyLibrary(library) {
    if (!library || typeof library !== "object") return;
    renderToday(library);
    renderInsuranceInfo(library);
    renderHealthStats(library);
    renderClaims(library);
    bindDetails(library);
  }

  fetch("./data/library.json", { cache: "no-store" })
    .then(function (response) {
      if (!response.ok) throw new Error("library load failed");
      return response.json();
    })
    .then(applyLibrary)
    .catch(function () {
      applyLibrary(null);
    });
})();
