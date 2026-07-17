/* ═══════════════════════════════════════════════════════════════════════════
 * 보장분석 허브 (#v-bojang) — 발송센터 + 6개 서브화면 미니라우터
 * ───────────────────────────────────────────────────────────────────────────
 * 범위(총괄 확정): 어제 제작한 보장분석 프로토타입 6종(허브/종합/의료실비/암/
 *   뇌심장/수술비 + 맞춤결과 샘플)을 원세컨드 앱 SPA에 정식 통합. 앱 뷰는 1개
 *   (#v-bojang)만 쓰고, 그 안에서 JS 상태로 화면 전환(내부 스왑 라우터).
 * 게이트: _canSeeCoverage(임태성 user_id 또는 role=admin) 전용. showView 게이트가
 *   1차, _bojangShow 진입 시 2차 방어. 고객/anon 노출 0.
 * 데이터: 실데이터 무접촉. 맞춤결과는 sanitized 샘플 1건. 의료실비 자가진단은
 *   silson_generations 읽기 재사용(RLS 그대로) + 정적 폴백(cov-medical.js 로직 흡수).
 * 금지 준수: DDL·seed·RLS·migration·Supabase write 없음. innerHTML에 들어가는 유일한
 *   사용자 입력(가입일 date input)은 bjEsc로 escape. 전역 CSS는 #v-bojang 하위로
 *   스코프 + bj- 프리픽스 네임스페이스(앱 라이트 테마 무오염).
 * CSS 격리: 모든 규칙 #v-bojang 하위. 팔레트 var는 #v-bojang 에만 정의.
 * 롤백: 본 파일 삭제 + app.html의 (a)<script src="/js/bojang.js"> (b)#v-bojang div
 *   (c)VALID_VIEWS 'bojang' (d)showView 게이트·라벨·렌더·cov-medical 리다이렉트
 *   (e)js/home.js 타일 원복(cov-medical).
 * 최초 작성 2026-07-16 (feat/bojang-app-integration).
 * ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var PHONE = '01092419375';
  var PHONE_DISP = '010-9241-9375';

  /* ── 진입 게이트 폴백(스크립트 단독/직접 호출 방어) ──────────────────────── */
  if (typeof window._canSeeCoverage !== 'function') {
    window._canSeeCoverage = function () {
      try {
        var u = JSON.parse(localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}');
        return String(u.id || '') === '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd' || String(u.role || '') === 'admin';
      } catch (e) { return false; }
    };
  }

  function bjEsc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function bjAttr(s) {
    return bjEsc(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * 의료실비 세대판정 로직 — cov-medical.js에서 흡수(읽기만). silson_generations
   * 라이브 조회 성공+행 → DB, 실패·0행·타임아웃 → 정적 임베드 폴백(5세대).
   * ══════════════════════════════════════════════════════════════════════════ */
  var GEN_FB = [
    { gen: 1, name: '1세대 실손 (구실손)',     range_label: '~2009.9',        valid_from: null,        valid_to: '2009-09-30', one_liner: '자기부담 거의 없어 보장 최강. 유지 1순위.' },
    { gen: 2, name: '2세대 실손 (표준화실손)', range_label: '2009.10~2017.3', valid_from: '2009-10-01', valid_to: '2017-03-31', one_liner: '표준화실손. 본인부담 도입. 2013.4 재가입 내부 분기.' },
    { gen: 3, name: '3세대 실손 (착한실손)',   range_label: '2017.4~2021.6',  valid_from: '2017-04-01', valid_to: '2021-06-30', one_liner: '착한실손. 3대 비급여(도수·주사·MRI) 특약 분리.' },
    { gen: 4, name: '4세대 실손',              range_label: '2021.7~2026.5',  valid_from: '2021-07-01', valid_to: '2026-05-05', one_liner: '비급여 전체 특약 분리 + 비급여 할증 도입. 보험료 최저.' },
    { gen: 5, name: '5세대 실손',              range_label: '2026.5.6~',      valid_from: '2026-05-06', valid_to: null,        one_liner: '비급여 중증·비중증 차등. 비중증 보장·한도 축소.' }
  ];
  var _genRows = null;   /* DB 성공 시 교체, 기본 폴백 */
  var _genSrc = '폴백';  /* 'DB' | '폴백' */
  var _genFetched = false;

  function judgeGen(dateStr) {
    var d = String(dateStr || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
    var rows = (_genRows && _genRows.length) ? _genRows : GEN_FB;
    for (var i = 0; i < rows.length; i++) {
      var g = rows[i];
      var from = g.valid_from ? String(g.valid_from).slice(0, 10) : null;
      var to = g.valid_to ? String(g.valid_to).slice(0, 10) : null;
      if ((from === null || d >= from) && (to === null || d <= to)) return g;
    }
    return null;
  }
  /* window.judgeGen 는 cov-medical.js가 이미 등록. 없을 때만 폴백 등록(중복 방지). */
  if (typeof window.judgeGen !== 'function') window.judgeGen = judgeGen;

  function fetchGenLive(after) {
    if (_genFetched) { if (after) after(); return; }
    _genFetched = true;
    if (!(window.db && typeof window.db.fetch === 'function')) { if (after) after(); return; }
    var done = false;
    var timer = setTimeout(function () { if (done) return; done = true; console.log('[bojang] silson 타임아웃 → 폴백'); if (after) after(); }, 6000);
    window.db.fetch('/rest/v1/silson_generations?select=gen,name,range_label,valid_from,valid_to,one_liner&order=sort_order')
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status)); })
      .then(function (data) {
        if (done) return; done = true; clearTimeout(timer);
        if (Array.isArray(data) && data.length) {
          _genRows = data.slice().sort(function (a, b) { return (a.gen || 0) - (b.gen || 0); });
          _genSrc = 'DB';
          console.log('[bojang] silson_generations DB ' + data.length + '행');
        } else {
          console.log('[bojang] silson 라이브 0행(RLS/anon) → 폴백');
        }
        if (after) after();
      })
      .catch(function (e) {
        if (done) return; done = true; clearTimeout(timer);
        console.log('[bojang] silson 라이브 실패 → 폴백:', String(e));
        if (after) after();
      });
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * 공용 조각(footer 서명 · CTA · 뒤로가기)
   * ══════════════════════════════════════════════════════════════════════════ */
  function backBar() {
    return '<div class="bj-topbar"><button class="bj-back" type="button" onclick="window._bojangShow()">&#8249; 목록으로</button></div>';
  }
  function signHtml() {
    return '' +
      '<div class="bj-foot">' +
        '<div class="bj-sign"><div class="bj-av">임</div><div class="bj-nm"><div class="bj-a">임태성 보험전문가</div><div class="bj-b">원세컨드 · 보장분석 상담</div></div></div>' +
        '<div class="bj-disc">※ 이 자료는 보험 이해를 돕기 위한 일반 안내이며, 가입·해지를 권유하지 않습니다. 실제 보장은 증권·약관 기준으로 확인해 드립니다.</div>' +
      '</div>';
  }
  function ctaHtml(title, sub) {
    return '' +
      '<div class="bj-cta">' +
        '<div class="bj-ct">' + title + '</div>' +
        '<div class="bj-cs">' + sub + '</div>' +
        '<div class="bj-btns"><a class="bj-btn primary" href="tel:' + PHONE + '">' +
          '<svg viewBox="0 0 24 24"><path d="M4 5c0 9 6 15 15 15l0-3.5-4-1.5-2 2c-3-1.4-5.6-4-7-7l2-2-1.5-4L4 5z"/></svg>전화 문의 · ' + PHONE_DISP + '</a></div>' +
      '</div>';
  }
  var RING_SVG = '<svg class="bj-ring" viewBox="0 0 320 320" aria-hidden="true"><circle cx="160" cy="160" r="142" fill="none" stroke="rgba(217,178,104,.20)" stroke-width="1"/><circle cx="160" cy="160" r="110" fill="none" stroke="rgba(217,178,104,.12)" stroke-width="1"/><circle cx="160" cy="160" r="78" fill="none" stroke="rgba(217,178,104,.08)" stroke-width="1"/></svg>';

  /* ══════════════════════════════════════════════════════════════════════════
   * 1) 허브(발송센터)
   * ══════════════════════════════════════════════════════════════════════════ */
  var HUB_ITEMS = [
    { sub: 'share',      em: '🛡️', t: '종합 보장분석 안내', w: '"보장분석 자료 보내드릴게요" — 4대 보장 + 자가진단' },
    { sub: 'medical',    em: '🏥', t: '의료실비',            w: '"실비 자료 보내드릴게요" — 세대 설명 + 가입일 세대판정' },
    { sub: 'cancer',     em: '🎗️', t: '암',                 w: '"암보험 자료 보내드릴게요" — 진단·치료·비급여 3층' },
    { sub: 'brainheart', em: '🫀', t: '뇌 · 심장',          w: '"뇌심장 자료 보내드릴게요" — 좁은문vs넓은문 범위' },
    { sub: 'surgery',    em: '🩹', t: '수술비',              w: '"수술비 자료 보내드릴게요" — 종수술·반복지급 구조' }
  ];
  function hubRowHtml(it, note) {
    return '' +
      '<div class="bj-row" onclick="window._bojangShow(\'' + it.sub + '\')">' +
        '<div class="bj-em">' + it.em + '</div>' +
        '<div class="bj-mid"><div class="bj-t">' + bjEsc(it.t) + (note ? ' <span class="bj-ex">· ' + bjEsc(note) + '</span>' : '') + '</div><div class="bj-w">' + bjEsc(it.w) + '</div></div>' +
        '<div class="bj-acts">' +
          '<button class="bj-ab" type="button" title="열기" onclick="event.stopPropagation();window._bojangShow(\'' + it.sub + '\')">&#8250;</button>' +
          '<button class="bj-ab copy" type="button" title="링크 복사(준비중)" onclick="event.stopPropagation();window._bojangCopyDemo()">' +
            '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button>' +
        '</div>' +
      '</div>';
  }
  function renderHub() {
    var list1 = '';
    for (var i = 0; i < HUB_ITEMS.length; i++) list1 += hubRowHtml(HUB_ITEMS[i], null);
    var resultRow = '' +
      '<div class="bj-row" onclick="window._bojangShow(\'result\')">' +
        '<div class="bj-em">📋</div>' +
        '<div class="bj-mid"><div class="bj-t">맞춤 결과 리포트 <span class="bj-ex">· 샘플</span></div><div class="bj-w">보장분석 자료로 만든 4축 진단 결과(샘플 미리보기)</div></div>' +
        '<div class="bj-acts">' +
          '<button class="bj-ab" type="button" title="열기" onclick="event.stopPropagation();window._bojangShow(\'result\')">&#8250;</button>' +
          '<button class="bj-ab copy" type="button" title="링크 복사(준비중)" onclick="event.stopPropagation();window._bojangCopyDemo()">' +
            '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button>' +
        '</div>' +
      '</div>';
    return '' +
      '<div class="bj-topbar"><button class="smsg-back" type="button" onclick="showView(\'home\')">&#8249; 홈으로</button></div>' +
      '<div class="bj-card bj-hubcard">' +
        '<div class="bj-top">' +
          '<div class="bj-eyebrow">보장분석 발송 센터</div>' +
          '<h1 class="bj-h1">상황에 맞는 자료를 골라 보내세요</h1>' +
          '<p class="bj-topp">통화가 끝나면 여기서 자료를 골라 열어보고, 고객에게 보낼 링크를 준비하세요. 고객이 열어보고 먼저 연락 오게 만드는 흐름이에요.</p>' +
        '</div>' +
        '<div class="bj-sec-h"><span class="bj-n">설명형 자료</span><span class="bj-tag">상태 모를 때 · 누구에게나</span><span class="bj-ln"></span></div>' +
        '<div class="bj-list">' + list1 + '</div>' +
        '<div class="bj-sec-h"><span class="bj-n">맞춤 결과</span><span class="bj-tag">고객 자료 있을 때</span><span class="bj-ln"></span></div>' +
        '<div class="bj-list">' + resultRow + '</div>' +
        '<div class="bj-note">💡 새 고객 맞춤 결과는 지금은 <b>보장분석 PDF·엑셀을 총괄에게 전달 → 결과 링크 생성</b> 방식이에요. <b>직접 업로드 → 자동 생성</b>과 <b>고객 공개 링크 발급</b>은 다음 단계(Phase 2)에서 붙습니다.</div>' +
        '<div class="bj-hubfoot">※ 이 센터는 임태성 전문가 전용 관리 화면입니다. 고객에게는 노출되지 않습니다.</div>' +
      '</div>' +
      '<div class="bj-toast" id="bjToast">공개 링크 발급은 준비중이에요 (Phase 2)</div>';
  }

  window._bojangCopyDemo = function () {
    var t = document.getElementById('bjToast');
    if (!t) return;
    t.classList.add('show');
    clearTimeout(window._bjToastTmr);
    window._bjToastTmr = setTimeout(function () { t.classList.remove('show'); }, 2200);
  };

  /* ══════════════════════════════════════════════════════════════════════════
   * 2) 종합 설명형(share) — 아코디언 4대 보장 + 30초 자가진단
   * ══════════════════════════════════════════════════════════════════════════ */
  var ACC = [
    { ic: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h5"/><path d="M15.5 15.5v4M13.5 17.5h4"/>', t: '의료실비', s: '병원비를 실제로 돌려받는 기본기',
      why: "병원비 부담을 실제 손해 기준으로 덜어주는 기본 축이에요. 없으면 안 되는 바닥판입니다.",
      miss: "'있다/없다'보다 <b>몇 세대 실손인지</b>가 중요해요. 세대에 따라 자기부담금·비급여 보장이 크게 달라집니다." },
    { ic: '<path d="M12 21s-7-4.4-7-9.3A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7 3.7C19 16.6 12 21 12 21z"/><circle cx="12" cy="11" r="1.6"/>', t: '암', s: '진단금 하나로 끝이 아니에요',
      why: "진단 직후 생활, 이어지는 치료, 비급여 치료 선택까지 — 한 번에 흔들릴 수 있어 나눠서 봐야 해요.",
      miss: "진단비만 크게 있고 <b>치료비(주요치료·비급여)</b>가 비어 있는 경우가 많아요." },
    { ic: '<path d="M3 12h4l2-5 3 9 2-6 1.5 2H21"/>', t: '뇌 · 심장', s: '이름은 비슷해도 범위가 달라요',
      why: "발생하면 부담이 큰 만큼, 보장 범위가 넓은지가 핵심이에요.",
      miss: "뇌출혈·급성심근경색 같은 <b>좁은 담보</b>인지, 뇌혈관·허혈성심장질환까지 <b>넓게</b> 담는지 확인이 필요해요." },
    { ic: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>', t: '수술비', s: '살면서 자주 쓰는 생활형 보장',
      why: "큰 병 하나가 아니라, 질병·상해 전반의 실제 수술에서 자주 쓰이는 보장이에요.",
      miss: "1회성인지 <b>반복 지급</b>인지, 질병·상해가 구분돼 있는지 함께 봐야 해요." }
  ];
  function renderShare() {
    var acc = '';
    for (var i = 0; i < ACC.length; i++) {
      var a = ACC[i];
      acc += '' +
        '<div class="bj-item">' +
          '<button class="bj-head" type="button" onclick="window._bjAcc(this)" aria-expanded="false">' +
            '<span class="bj-ic"><svg viewBox="0 0 24 24">' + a.ic + '</svg></span>' +
            '<span class="bj-ht"><span class="bj-itt">' + bjEsc(a.t) + '</span><span class="bj-its">' + bjEsc(a.s) + '</span></span>' +
            '<svg class="bj-chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>' +
          '</button>' +
          '<div class="bj-accbody"><div class="bj-accbody-in">' +
            '<div class="bj-accrow"><div class="bj-k">왜 중요한가요</div><div class="bj-v">' + a.why + '</div></div>' +
            '<div class="bj-accrow"><div class="bj-k">놓치기 쉬운 점</div><div class="bj-v">' + a.miss + '</div></div>' +
          '</div></div>' +
        '</div>';
    }
    var quiz = '' +
      '<div class="bj-quiz">' +
        '<div class="bj-q" data-q="0"><div class="bj-qt">내 <b>실손보험이 몇 세대</b>인지 알고 계세요?</div>' +
          '<div class="bj-opts"><button class="bj-opt" type="button" onclick="window._bjShareOpt(this,0,0)">네, 알아요</button><button class="bj-opt" type="button" onclick="window._bjShareOpt(this,0,1)">아니요</button></div></div>' +
        '<div class="bj-q" data-q="1"><div class="bj-qt">암 진단비 말고 <b>\'치료비\' 보장</b>도 있는지 아세요?</div>' +
          '<div class="bj-opts"><button class="bj-opt" type="button" onclick="window._bjShareOpt(this,1,0)">네, 알아요</button><button class="bj-opt" type="button" onclick="window._bjShareOpt(this,1,1)">잘 몰라요</button></div></div>' +
        '<div class="bj-q" data-q="2"><div class="bj-qt">마지막으로 <b>보장을 점검</b>한 게 언제세요?</div>' +
          '<div class="bj-opts"><button class="bj-opt" type="button" onclick="window._bjShareOpt(this,2,0)">1년 내</button><button class="bj-opt" type="button" onclick="window._bjShareOpt(this,2,1)">오래됨/처음</button></div></div>' +
        '<div class="bj-result" id="bjShareResult"><div class="bj-rt" id="bjShareRT"></div><div class="bj-rd" id="bjShareRD"></div></div>' +
      '</div>';
    return '' +
      backBar() +
      '<div class="bj-card">' +
        '<div class="bj-hero">' + RING_SVG +
          '<div class="bj-eyebrow">보장분석 · Coverage Report</div>' +
          '<h1 class="bj-heroh">내 보험,<br><span class="bj-g">제대로</span> 알고 계신가요?</h1>' +
          '<p class="bj-herop">가입한 보험이 실제로 나를 지켜주는지, 가장 중요한 4가지 기준으로 쉽게 짚어드립니다.</p>' +
          '<div class="bj-rule"></div>' +
        '</div>' +
        '<div class="bj-sect"><div class="bj-secth"><h2>꼭 봐야 할 4가지 보장</h2><span>탭하면 설명이 열려요</span></div><div class="bj-acc">' + acc + '</div></div>' +
        '<div class="bj-sect"><div class="bj-secth"><h2>30초 자가진단</h2><span>가볍게 답해보세요</span></div>' + quiz + '</div>' +
        ctaHtml('궁금한 점, 지금 편하게 물어보세요', '전화 한 통이면 내 보장 상태를 5분 만에 쉽게 확인해드려요.') +
        signHtml() +
      '</div>';
  }
  var _shareAns = {};
  window._bjAcc = function (btn) {
    var item = btn.parentNode;
    var body = item.querySelector('.bj-accbody');
    var open = item.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    body.style.maxHeight = open ? (body.scrollHeight + 'px') : '0px';
  };
  window._bjShareOpt = function (btn, qi, idx) {
    var q = btn.closest('.bj-q');
    var opts = q.querySelectorAll('.bj-opt');
    for (var i = 0; i < opts.length; i++) opts[i].classList.remove('on');
    btn.classList.add('on');
    _shareAns[qi] = idx;
    if (Object.keys(_shareAns).length === 3) {
      var gaps = (_shareAns[0] === 1 ? 1 : 0) + (_shareAns[1] === 1 ? 1 : 0) + (_shareAns[2] === 1 ? 1 : 0);
      var t, d;
      if (gaps >= 2) { t = '점검이 필요한 상태예요'; d = '세대·치료비·최근 점검 중 놓친 부분이 있어요. 대부분 여기서 체감 보장이 갈립니다. 5분이면 정확히 확인해드릴게요.'; }
      else if (gaps === 1) { t = '거의 잘 챙기셨어요 — 딱 한 가지만'; d = '한 부분만 확인하면 균형이 딱 맞아요. 그 한 칸이 무엇인지 편하게 물어봐 주세요.'; }
      else { t = '기본기가 탄탄하시네요 👍'; d = '잘 준비돼 있어요. 그래도 세대·중복·보험료 효율은 한 번 같이 점검해두면 좋아요.'; }
      var rt = document.getElementById('bjShareRT'), rd = document.getElementById('bjShareRD'), r = document.getElementById('bjShareResult');
      if (rt) rt.textContent = t;
      if (rd) rd.textContent = d;
      if (r) r.classList.add('show');
    }
  };

  /* ══════════════════════════════════════════════════════════════════════════
   * 3) 타입 설명형(cancer · brainheart · surgery) — 공통 blocks 레이아웃
   *    의료실비(medical)는 아래 별도 렌더(세대표 + 가입일 판정 흡수)
   * ══════════════════════════════════════════════════════════════════════════ */
  function chipsHtml(arr) {
    var h = '<div class="bj-gens">';
    for (var i = 0; i < arr.length; i++) h += '<div class="bj-gen"><div class="bj-genn">' + bjEsc(arr[i][0]) + '</div><div class="bj-genx">' + bjEsc(arr[i][1]) + '</div></div>';
    return h + '</div>';
  }
  function cmpHtml(arr) {
    var h = '<div class="bj-cmp">';
    for (var i = 0; i < arr.length; i++) h += '<div class="bj-cmpr"><div class="bj-lo">' + bjEsc(arr[i][0]) + '</div><div class="bj-ar">&#8594;</div><div class="bj-hi">' + bjEsc(arr[i][1]) + '</div></div>';
    return h + '</div>';
  }
  var TYPES = {
    cancer: {
      badgeIc: '<path d="M12 21s-7-4.4-7-9.3A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7 3.7C19 16.6 12 21 12 21z"/><circle cx="12" cy="11" r="1.6"/>',
      badge: '암', h1: '암보험, <span class="bj-g">진단금 하나</span>로<br>끝이 아니에요',
      lead: '진단 직후 생활, 이어지는 치료, 비급여 선택까지 — 나눠서 준비해야 진짜 대비가 됩니다.',
      blocks: [
        { k: '왜 중요한가요', t: "진단 '이후'가 더 길어요", d: '진단금은 시작일 뿐이에요. 치료는 몇 달에서 몇 년까지 이어지고, 그동안 <b>생활비·치료비·치료 선택</b>이 동시에 흔들릴 수 있어요.' },
        { k: '이렇게 봐요', t: "암 보장은 '3층'으로 봐요", d: '이 셋이 함께 있어야 진단부터 치료까지 빈틈이 없어요.', chips: [['진단비', '진단 직후 목돈'], ['주요치료비', '치료 과정 대비'], ['비급여', '치료 선택의 폭']] },
        { k: '놓치기 쉬운 점', t: '진단비만 크고, 치료비는 공백', d: '진단금은 2억이 넘는데 <b>주요치료비·비급여 치료 보장은 0원</b>인 경우가 정말 많아요. 진단금이 넉넉하다면, 이제 치료 과정 보장을 볼 차례예요.' }
      ],
      q: "암 진단비 말고 <b>'치료비' 보장</b>도 있는지 아세요?",
      opt0: '네, 알아요', ans0: '잘 알고 계시네요! 그럼 주요치료비·비급여가 실제로 충분한 금액인지만 같이 점검해봐요.',
      opt1: '잘 몰라요', ans1: '많은 분이 여기서 놓치세요. 진단금만 있고 치료비가 비면 정작 치료 때 아쉬워요 — 편하게 확인해드릴게요.',
      ctaT: '진단부터 치료까지 채워졌는지 봐드릴게요', ctaS: '진단비·주요치료비·비급여 3층 구조, 5분이면 확인해요.'
    },
    brainheart: {
      badgeIc: '<path d="M3 12h4l2-5 3 9 2-6 1.5 2H21"/>',
      badge: '뇌 · 심장', h1: "뇌·심장, <span class=\"bj-g\">'좁은 문'</span> 말고<br>'넓은 문'인지",
      lead: '이름은 비슷해도 실제 보장 범위가 달라요. 얼마나 넓게 담는 구조인지가 핵심입니다.',
      blocks: [
        { k: '왜 중요한가요', t: "발생하면 부담이 큰 만큼, '범위'가 핵심", d: '뇌·심장은 진단금 액수도 중요하지만, <b>어떤 병까지 보장되는지</b> 범위가 더 결정적이에요. 범위가 좁으면 정작 필요할 때 못 받을 수 있어요.' },
        { k: '이렇게 봐요', t: "'좁은 담보'인지 '넓은 담보'인지", d: '같은 뇌·심장이라도 담는 범위가 이렇게 달라요.', cmp: [['뇌출혈', '뇌혈관질환'], ['급성심근경색', '허혈성심장질환']] },
        { k: '놓치기 쉬운 점', t: '진단 + 수술 + 치료 특약', d: '진단비만 있고 <b>수술·치료 특약</b>이 빠져 있는 경우가 많아요. 넓은 범위 + 수술·치료까지 함께 있는지 봐야 든든해요.' }
      ],
      q: '내 뇌·심장 보장이 <b>넓은 범위</b>인지 아세요?',
      opt0: '네, 알아요', ans0: '정확히 아시네요! 그럼 수술·치료 특약까지 함께 있는지만 같이 점검해봐요.',
      opt1: '잘 몰라요', ans1: '이건 증권을 봐야 알 수 있어요. 좁은 담보면 넓히는 게 큰 차이를 만들어요 — 편하게 확인해드릴게요.',
      ctaT: '좁은 담보인지 넓은 담보인지 봐드릴게요', ctaS: '진단 범위·수술 특약까지 5분이면 쉽게 확인해요.'
    },
    surgery: {
      badgeIc: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>',
      badge: '수술비', h1: '수술비, 큰 병보다<br><span class="bj-g">자주 쓰는</span> 생활형 보장',
      lead: '암 같은 특정 질환만이 아니라, 질병·상해 전반의 실제 수술에서 쓰이는 보장이에요.',
      blocks: [
        { k: '왜 중요한가요', t: '생각보다 자주, 반복돼요', d: '큰 진단 하나보다, 살면서 <b>크고 작은 수술</b>이 더 자주 생겨요. 당일 수술·내시경 시술까지 늘면서 실제 활용도가 높은 보장이에요.' },
        { k: '이렇게 봐요', t: "'종수술' 구조로 봐요", d: '수술을 난이도별로 나눠 지급하는 구조예요. 이 세 가지를 함께 봐야 해요.', chips: [['1~5종', '난이도별 지급'], ['반복 지급', '1회성 아님'], ['질병·상해', '둘 다 되는지']] },
        { k: '놓치기 쉬운 점', t: '1회성인지, 반복 지급인지', d: '큰 진단비는 있어도 <b>실제 수술비가 얇으면</b> 병원 이용에서 체감이 약해요. 반복 지급되는지, 질병·상해가 함께 되는지 꼭 확인해요.' }
      ],
      q: '내 수술비가 <b>반복 지급</b>되는지 아세요?',
      opt0: '네, 알아요', ans0: '잘 챙기셨네요! 그럼 종수술 범위와 중복 지급 여부만 같이 점검해봐요.',
      opt1: '잘 몰라요', ans1: '이 부분을 모르는 분이 많아요. 반복 지급 여부가 실제 병원 이용에서 큰 차이예요 — 편하게 확인해드릴게요.',
      ctaT: '수술비 구조·중복 지급, 점검해드릴게요', ctaS: '종수술 체계와 반복 지급 여부, 5분이면 확인해요.'
    }
  };
  function renderType(key) {
    var c = TYPES[key];
    if (!c) return renderHub();
    var blocks = '';
    for (var i = 0; i < c.blocks.length; i++) {
      var b = c.blocks[i];
      blocks += '<div class="bj-b"><div class="bj-k">' + bjEsc(b.k) + '</div><div class="bj-bt">' + b.t + '</div><div class="bj-bd">' + b.d + '</div>' +
        (b.chips ? chipsHtml(b.chips) : '') + (b.cmp ? cmpHtml(b.cmp) : '') + '</div>';
    }
    return '' +
      backBar() +
      '<div class="bj-card">' +
        '<div class="bj-hero">' + RING_SVG +
          '<div class="bj-badge"><svg viewBox="0 0 24 24">' + c.badgeIc + '</svg><span>' + bjEsc(c.badge) + '</span></div>' +
          '<h1 class="bj-heroh">' + c.h1 + '</h1>' +
          '<p class="bj-herop">' + bjEsc(c.lead) + '</p>' +
        '</div>' +
        '<div class="bj-blocks">' + blocks + '</div>' +
        '<div class="bj-check"><div class="bj-cq">' + c.q + '</div>' +
          '<div class="bj-opts">' +
            '<button class="bj-opt" type="button" data-ans="' + bjAttr(c.ans0) + '" onclick="window._bjTypeOpt(this)">' + bjEsc(c.opt0) + '</button>' +
            '<button class="bj-opt" type="button" data-ans="' + bjAttr(c.ans1) + '" onclick="window._bjTypeOpt(this)">' + bjEsc(c.opt1) + '</button>' +
          '</div><div class="bj-ans" id="bjTypeAns"></div></div>' +
        ctaHtml(c.ctaT, c.ctaS) +
        signHtml() +
      '</div>';
  }
  window._bjTypeOpt = function (btn) {
    var opts = btn.parentNode.querySelectorAll('.bj-opt');
    for (var i = 0; i < opts.length; i++) opts[i].classList.remove('on');
    btn.classList.add('on');
    var a = document.getElementById('bjTypeAns');
    if (a) { a.textContent = btn.getAttribute('data-ans') || ''; a.classList.add('show'); }
  };

  /* ══════════════════════════════════════════════════════════════════════════
   * 4) 의료실비(medical) — 세대 설명(프로토타입) + 세대표 + 가입일 자가진단(흡수)
   * ══════════════════════════════════════════════════════════════════════════ */
  function genTableHtml() {
    var rows = (_genRows && _genRows.length) ? _genRows : GEN_FB;
    var body = '';
    for (var i = 0; i < rows.length; i++) {
      var g = rows[i];
      body += '<tr><td><span class="bj-genpill">' + bjEsc(g.gen) + '세대</span></td><td class="bj-tdname">' + bjEsc(g.name) +
        '</td><td class="bj-tdrange">' + bjEsc(g.range_label || '') + '</td><td class="bj-tdone">' + bjEsc(g.one_liner || '') + '</td></tr>';
    }
    var srcCls = _genSrc === 'DB' ? 'db' : 'fb';
    var srcTxt = _genSrc === 'DB' ? '라이브 DB(silson_generations)' : '정적 임베드 폴백(DB 0행/미적용)';
    return '' +
      '<div class="bj-b bj-medtable">' +
        '<div class="bj-k">실손 세대별 변천사 (1~5세대)</div>' +
        '<div class="bj-src bj-src-' + srcCls + '">데이터 출처: ' + srcTxt + '</div>' +
        '<div class="bj-tablewrap"><table class="bj-table"><thead><tr><th>세대</th><th>구분</th><th>가입기간</th><th>한 줄 정리</th></tr></thead><tbody>' + body + '</tbody></table></div>' +
      '</div>';
  }
  function renderMedical() {
    var gens = chipsHtml([['1·2세대', '자기부담 적음'], ['3세대', '비급여 특약 분리'], ['4세대', '보험료↓·자기부담↑']]);
    return '' +
      backBar() +
      '<div class="bj-card">' +
        '<div class="bj-hero">' + RING_SVG +
          '<div class="bj-badge"><svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h5"/><path d="M15.5 15.5v4M13.5 17.5h4"/></svg><span>의료실비</span></div>' +
          '<h1 class="bj-heroh">실손보험, 있는 것보다<br><span class="bj-g">\'몇 세대\'</span>가 중요해요</h1>' +
          '<p class="bj-herop">병원비를 실제로 돌려받는 가장 기본기. 그런데 가입 시기에 따라 보장이 꽤 달라집니다.</p>' +
        '</div>' +
        '<div class="bj-blocks">' +
          '<div class="bj-b"><div class="bj-k">왜 중요한가요</div><div class="bj-bt">병원비의 \'바닥판\'이에요</div><div class="bj-bd">진단비·수술비가 정액으로 나온다면, 실손은 <b>실제 쓴 병원비</b>를 손해 기준으로 돌려받는 기본 보장이에요. 그래서 빠지면 안 되는 바닥판입니다.</div></div>' +
          '<div class="bj-b"><div class="bj-k">가장 중요한 점</div><div class="bj-bt">\'있다/없다\'보다 \'몇 세대\'예요</div><div class="bj-bd">같은 실손이라도 세대에 따라 <b>자기부담금·비급여 보장</b>이 크게 달라져요.</div>' + gens + '</div>' +
          '<div class="bj-b"><div class="bj-k">놓치기 쉬운 점</div><div class="bj-bt">세대·자기부담·갱신보험료</div><div class="bj-bd">내 실손이 몇 세대인지, 도수치료·주사·MRI 같은 <b>비급여 구조</b>가 어떤지, 갱신보험료는 어떻게 오르는지 — 이 세 가지를 같이 봐야 실제 체감이 잡혀요.</div></div>' +
          genTableHtml() +
          '<div class="bj-b bj-medquiz">' +
            '<div class="bj-k">자가진단 — 내 실손은 몇 세대?</div>' +
            '<div class="bj-bt">가입일(청약일)로 세대를 판정해요</div>' +
            '<div class="bj-quizrow"><input type="date" id="bjMedDate" class="bj-date" min="1999-01-01" max="2035-12-31" aria-label="실손 가입일"><button type="button" class="bj-judge" onclick="window._bjMedJudge()">세대 판정</button></div>' +
            '<div id="bjMedResult" class="bj-medresult" aria-live="polite"></div>' +
          '</div>' +
        '</div>' +
        ctaHtml('내 실손, 몇 세대인지 확인해드릴게요', '자기부담·비급여 구조까지 5분이면 쉽게 풀어드려요.') +
        signHtml() +
      '</div>';
  }
  window._bjMedJudge = function () {
    var inp = document.getElementById('bjMedDate');
    var slot = document.getElementById('bjMedResult');
    if (!inp || !slot) return;
    var v = inp.value;
    if (!v) { slot.innerHTML = '<div class="bj-medwarn">가입일을 먼저 선택해 주세요.</div>'; return; }
    var g = judgeGen(v);
    if (!g) { slot.innerHTML = '<div class="bj-medwarn">해당 날짜의 세대를 판정할 수 없습니다. 날짜를 확인해 주세요.</div>'; return; }
    console.log('[bojang] judgeGen(' + v + ') → ' + g.gen + '세대 (' + _genSrc + ')');
    slot.innerHTML = '' +
      '<div class="bj-medcard">' +
        '<div class="bj-medhead"><span class="bj-genpill">' + bjEsc(g.gen) + '세대</span><span class="bj-medname">' + bjEsc(g.name) + '</span></div>' +
        '<div class="bj-medrange">가입기간: ' + bjEsc(g.range_label || '') + '</div>' +
        '<p class="bj-medone">' + bjEsc(g.one_liner || '') + '</p>' +
        '<div class="bj-medfoot">가입일 ' + bjEsc(v) + ' 기준 판정입니다. 유지 vs 전환은 세대별 자기부담·재가입·비급여 구조가 달라 상담으로 점검이 필요합니다.</div>' +
      '</div>';
  };

  /* ══════════════════════════════════════════════════════════════════════════
   * 5) 맞춤 결과(result) — sanitized 샘플 1건. 결론 배지→4축→중요한점→최종판정→CTA
   *    ⚠ 실고객 데이터 하드코딩 금지: 아래는 전부 가상의 예시 값.
   * ══════════════════════════════════════════════════════════════════════════ */
  var SAMPLE = {
    who: '샘플 고객 (40대 · 예시)',
    verdict: '치료 과정 보장이 비어 있어요',
    verdictTone: 'warn',
    axes: [
      { ic: '🏥', name: '의료실비', level: 'good', tag: '양호', note: '3세대 실손 보유 — 병원비 바닥판은 준비돼 있어요.' },
      { ic: '🎗️', name: '암', level: 'weak', tag: '보완 필요', note: '진단비는 넉넉하나 주요치료비·비급여 보장이 비어 있어요.' },
      { ic: '🫀', name: '뇌 · 심장', level: 'warn', tag: '범위 확인', note: '뇌출혈·급성심근경색 위주(좁은 담보). 넓은 범위 점검 권장.' },
      { ic: '🩹', name: '수술비', level: 'good', tag: '양호', note: '종수술 반복 지급 구조 보유 — 생활형 보장은 든든해요.' }
    ],
    points: [
      '진단비 중심으로만 쌓여 있어, 실제 <b>치료가 길어질 때</b> 체감 보장이 약해질 수 있어요.',
      '뇌·심장은 <b>담보 범위</b>부터 확인하는 게 우선이에요(좁은문 → 넓은문).'
    ],
    final: '실비·수술비 기본기는 탄탄합니다. 다음 상담에서는 암 치료비(주요치료·비급여)와 뇌·심장 범위 두 가지만 채우면 균형이 맞습니다.'
  };
  function axisRow(a) {
    return '<div class="bj-ax bj-ax-' + a.level + '"><div class="bj-axic">' + a.ic + '</div><div class="bj-axmid"><div class="bj-axname">' + bjEsc(a.name) +
      ' <span class="bj-axtag">' + bjEsc(a.tag) + '</span></div><div class="bj-axnote">' + bjEsc(a.note) + '</div></div></div>';
  }
  function renderResult() {
    var axes = '';
    for (var i = 0; i < SAMPLE.axes.length; i++) axes += axisRow(SAMPLE.axes[i]);
    var pts = '';
    for (var j = 0; j < SAMPLE.points.length; j++) pts += '<li>' + SAMPLE.points[j] + '</li>';
    return '' +
      backBar() +
      '<div class="bj-card">' +
        '<div class="bj-samplebar">샘플 미리보기 · 자동생성 준비중 (Phase 2)</div>' +
        '<div class="bj-hero bj-rzhero">' +
          '<div class="bj-eyebrow">맞춤 보장분석 결과</div>' +
          '<h1 class="bj-heroh">' + bjEsc(SAMPLE.who) + '</h1>' +
          '<div class="bj-verdict bj-verdict-' + SAMPLE.verdictTone + '">' + bjEsc(SAMPLE.verdict) + '</div>' +
        '</div>' +
        '<div class="bj-sect"><div class="bj-secth"><h2>4축 보장 진단</h2><span>실비 · 암 · 뇌심장 · 수술비</span></div><div class="bj-axes">' + axes + '</div></div>' +
        '<div class="bj-b bj-rzpoints"><div class="bj-k">중요한 점</div><ul class="bj-ptlist">' + pts + '</ul></div>' +
        '<div class="bj-b bj-rzfinal"><div class="bj-k">최종 판정</div><div class="bj-bd">' + bjEsc(SAMPLE.final) + '</div></div>' +
        ctaHtml('내 결과도 이렇게 만들어드릴게요', '보장분석 자료만 있으면 4축 진단 리포트로 정리해 드려요.') +
        signHtml() +
      '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * 라우터 진입점
   * ══════════════════════════════════════════════════════════════════════════ */
  var RENDERERS = {
    hub: renderHub, share: renderShare, medical: renderMedical,
    cancer: function () { return renderType('cancer'); },
    brainheart: function () { return renderType('brainheart'); },
    surgery: function () { return renderType('surgery'); },
    result: renderResult
  };

  function paint(sub) {
    var host = document.getElementById('v-bojang');
    if (!host) return;
    var fn = RENDERERS[sub] || RENDERERS.hub;
    host.innerHTML = fn();
    host.scrollTop = 0;
    _shareAns = {};
  }

  window._bojangShow = function (sub) {
    if (typeof window._canSeeCoverage === 'function' && !window._canSeeCoverage()) {
      if (typeof showView === 'function') showView('home');
      return;
    }
    injectStyleOnce();
    sub = sub && RENDERERS[sub] ? sub : 'hub';
    if (sub === 'medical') {
      /* 세대표/판정에 라이브 DB 반영 — 폴백으로 즉시 그린 뒤 DB 성공 시 재그림 */
      paint('medical');
      fetchGenLive(function () { if (document.getElementById('v-bojang') && document.getElementById('bjMedDate')) paint('medical'); });
    } else {
      paint(sub);
    }
  };

  /* ══════════════════════════════════════════════════════════════════════════
   * 스코프 스타일(1회 주입) — 전부 #v-bojang 하위, bj- 네임스페이스.
   * 다크 남색+골드 팔레트는 #v-bojang 안에서만(앱 라이트 테마 무오염).
   * ══════════════════════════════════════════════════════════════════════════ */
  function injectStyleOnce() {
    if (document.getElementById('bj-style')) return;
    var st = document.createElement('style');
    st.id = 'bj-style';
    st.textContent = [
      '#v-bojang{--bj-ground:#F5F6F8;--bj-ground2:#EDEFF2;--bj-panel:#FFFFFF;--bj-panel2:#FCFCFD;--bj-ink:#1F2937;--bj-body:#374151;--bj-muted:#6B7280;--bj-faint:#9CA3AF;--bj-soft:#F2F3F5;--bj-gold:#96702A;--bj-gold-b:#B0842F;--bj-line:#E7E2D6;--bj-good:#0F9D6B;--bj-warn:#B7791F;--bj-weak:#C2410C;--bj-sh:0 1px 2px rgba(17,24,39,.05),0 8px 20px -8px rgba(17,24,39,.12);--bj-r:20px;padding:0;overflow-y:auto;min-height:100%;background:radial-gradient(120% 55% at 50% -6%,rgba(217,178,104,.08),transparent 60%),linear-gradient(180deg,var(--bj-ground),var(--bj-ground2));color:var(--bj-ink);font-family:\'Pretendard\',\'Apple SD Gothic Neo\',\'Malgun Gothic\',\'맑은 고딕\',\'Noto Sans KR\',system-ui,sans-serif;-webkit-font-smoothing:antialiased;letter-spacing:-.2px;}',
      '#v-bojang *{box-sizing:border-box;}',
      '#v-bojang .bj-card{max-width:560px;margin:0 auto;padding:0 18px 48px;}',
      '#v-bojang .bj-topbar{max-width:560px;margin:0 auto;padding:16px 18px 0;}',
      '#v-bojang .bj-back{background:var(--bj-soft);border:1px solid var(--bj-line);color:var(--bj-ink);font-size:13px;font-weight:700;padding:8px 15px;border-radius:11px;cursor:pointer;font-family:inherit;}',
      '#v-bojang .bj-back:hover{border-color:rgba(217,178,104,.4);}',
      '#v-bojang .bj-eyebrow{font-size:11px;font-weight:800;letter-spacing:.22em;color:var(--bj-gold);text-transform:uppercase;}',
      /* hub */
      '#v-bojang .bj-top{text-align:center;padding:34px 8px 16px;}',
      '#v-bojang .bj-h1{font-size:25px;font-weight:800;margin:12px 0 10px;letter-spacing:-.5px;}',
      '#v-bojang .bj-topp{font-size:14px;line-height:1.7;color:var(--bj-muted);max-width:400px;margin:0 auto;}',
      '#v-bojang .bj-sec-h{display:flex;align-items:center;gap:9px;margin:24px 4px 13px;}',
      '#v-bojang .bj-sec-h .bj-n{font-size:15px;font-weight:800;}',
      '#v-bojang .bj-sec-h .bj-tag{font-size:11px;font-weight:800;color:var(--bj-faint);border:1px solid var(--bj-line);padding:3px 9px;border-radius:99px;}',
      '#v-bojang .bj-sec-h .bj-ln{flex:1;height:1px;background:var(--bj-line);}',
      '#v-bojang .bj-list{display:flex;flex-direction:column;gap:10px;}',
      '#v-bojang .bj-row{display:flex;align-items:center;gap:13px;background:linear-gradient(160deg,var(--bj-panel),var(--bj-panel2));border:1px solid var(--bj-line);border-radius:18px;padding:14px 15px;cursor:pointer;transition:.16s;box-shadow:var(--bj-sh);}',
      '#v-bojang .bj-row:hover{border-color:rgba(217,178,104,.4);}',
      '#v-bojang .bj-em{width:40px;height:40px;flex-shrink:0;border-radius:11px;background:rgba(217,178,104,.10);border:1px solid rgba(217,178,104,.22);display:grid;place-items:center;font-size:19px;}',
      '#v-bojang .bj-mid{flex:1;min-width:0;}',
      '#v-bojang .bj-mid .bj-t{font-size:15px;font-weight:800;}',
      '#v-bojang .bj-mid .bj-w{font-size:12px;color:var(--bj-muted);margin-top:2px;line-height:1.45;}',
      '#v-bojang .bj-ex{color:var(--bj-faint);font-weight:700;font-size:11px;}',
      '#v-bojang .bj-acts{display:flex;gap:7px;flex-shrink:0;}',
      '#v-bojang .bj-ab{display:grid;place-items:center;width:38px;height:38px;border-radius:11px;cursor:pointer;border:1px solid var(--bj-line);background:var(--bj-soft);color:var(--bj-ink);font-size:18px;font-weight:800;line-height:1;}',
      '#v-bojang .bj-ab svg{width:17px;height:17px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;}',
      '#v-bojang .bj-ab.copy{background:linear-gradient(135deg,var(--bj-gold-b),var(--bj-gold));color:#241B08;border:0;}',
      '#v-bojang .bj-note{margin-top:16px;background:rgba(217,178,104,.10);border:1px solid rgba(217,178,104,.30);border-radius:14px;padding:14px 16px;font-size:12.5px;line-height:1.7;color:var(--bj-body);}',
      '#v-bojang .bj-note b{color:var(--bj-gold-b);}',
      '#v-bojang .bj-hubfoot{margin-top:18px;text-align:center;font-size:11px;color:var(--bj-faint);line-height:1.7;}',
      '#v-bojang .bj-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(20px);background:var(--bj-gold-b);color:#241B08;font-size:13.5px;font-weight:800;padding:12px 20px;border-radius:12px;opacity:0;pointer-events:none;transition:.3s;box-shadow:0 10px 30px rgba(17,24,39,.22);z-index:50;}',
      '#v-bojang .bj-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}',
      /* hero */
      '#v-bojang .bj-hero{position:relative;padding:40px 20px 26px;text-align:center;overflow:hidden;}',
      '#v-bojang .bj-ring{position:absolute;left:50%;top:-30px;transform:translateX(-50%);width:320px;height:320px;pointer-events:none;opacity:.45;}',
      '#v-bojang .bj-heroh{font-size:27px;line-height:1.34;font-weight:800;margin:14px 0 12px;}',
      '#v-bojang .bj-g{color:var(--bj-gold-b);}',
      '#v-bojang .bj-herop{font-size:14px;line-height:1.72;color:var(--bj-muted);max-width:340px;margin:0 auto;}',
      '#v-bojang .bj-rule{width:46px;height:2px;background:linear-gradient(90deg,var(--bj-gold),transparent);margin:18px auto 0;border-radius:2px;}',
      '#v-bojang .bj-badge{display:inline-flex;align-items:center;gap:8px;margin-bottom:12px;padding:8px 15px;border-radius:99px;background:rgba(217,178,104,.10);border:1px solid rgba(217,178,104,.28);}',
      '#v-bojang .bj-badge svg{width:19px;height:19px;stroke:var(--bj-gold-b);fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;}',
      '#v-bojang .bj-badge span{font-size:13px;font-weight:800;color:var(--bj-gold-b);}',
      /* sect */
      '#v-bojang .bj-sect{margin-top:28px;}',
      '#v-bojang .bj-secth{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:0 2px 13px;}',
      '#v-bojang .bj-secth h2{font-size:18px;font-weight:800;}',
      '#v-bojang .bj-secth span{font-size:12px;color:var(--bj-faint);font-weight:600;}',
      /* accordion */
      '#v-bojang .bj-acc{display:flex;flex-direction:column;gap:11px;}',
      '#v-bojang .bj-item{background:linear-gradient(160deg,var(--bj-panel),var(--bj-panel2));border:1px solid var(--bj-line);border-radius:var(--bj-r);overflow:hidden;box-shadow:var(--bj-sh);}',
      '#v-bojang .bj-head{display:flex;align-items:center;gap:14px;padding:17px;cursor:pointer;width:100%;background:none;border:0;color:inherit;text-align:left;font-family:inherit;}',
      '#v-bojang .bj-ic{width:44px;height:44px;flex-shrink:0;border-radius:13px;background:rgba(217,178,104,.10);border:1px solid rgba(217,178,104,.22);display:grid;place-items:center;}',
      '#v-bojang .bj-ic svg{width:24px;height:24px;stroke:var(--bj-gold-b);fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;}',
      '#v-bojang .bj-ht{flex:1;min-width:0;}',
      '#v-bojang .bj-itt{display:block;font-size:16px;font-weight:800;letter-spacing:-.3px;}',
      '#v-bojang .bj-its{display:block;font-size:12.5px;color:var(--bj-muted);margin-top:3px;line-height:1.5;}',
      '#v-bojang .bj-chev{width:20px;height:20px;flex-shrink:0;stroke:var(--bj-faint);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .3s;}',
      '#v-bojang .bj-item.open .bj-chev{transform:rotate(180deg);}',
      '#v-bojang .bj-accbody{max-height:0;overflow:hidden;transition:max-height .34s ease;}',
      '#v-bojang .bj-accbody-in{padding:2px 17px 18px;}',
      '#v-bojang .bj-accrow{padding:11px 0;border-top:1px solid var(--bj-line);}',
      '#v-bojang .bj-k{font-size:11px;font-weight:800;letter-spacing:.04em;color:var(--bj-gold);margin-bottom:6px;text-transform:uppercase;}',
      '#v-bojang .bj-v{font-size:13.5px;line-height:1.65;color:var(--bj-body);}',
      '#v-bojang .bj-v b,#v-bojang .bj-bd b{color:var(--bj-gold-b);font-weight:800;}',
      /* quiz(share) */
      '#v-bojang .bj-quiz{background:linear-gradient(160deg,var(--bj-panel),var(--bj-panel2));border:1px solid var(--bj-line);border-radius:var(--bj-r);padding:20px 18px;box-shadow:var(--bj-sh);}',
      '#v-bojang .bj-q{margin-bottom:16px;}',
      '#v-bojang .bj-q:last-of-type{margin-bottom:0;}',
      '#v-bojang .bj-qt{font-size:14.5px;font-weight:700;line-height:1.5;margin-bottom:10px;color:var(--bj-ink);}',
      '#v-bojang .bj-qt b{color:var(--bj-gold-b);font-weight:800;}',
      '#v-bojang .bj-opts{display:flex;gap:9px;}',
      '#v-bojang .bj-opt{flex:1;padding:12px 6px;border-radius:12px;border:1px solid var(--bj-line);background:var(--bj-soft);color:var(--bj-muted);font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit;transition:.18s;}',
      '#v-bojang .bj-opt:hover{border-color:rgba(217,178,104,.4);}',
      '#v-bojang .bj-opt.on{background:rgba(217,178,104,.16);border-color:var(--bj-gold);color:var(--bj-gold-b);}',
      '#v-bojang .bj-result{margin-top:18px;padding:16px;border-radius:15px;background:rgba(217,178,104,.09);border:1px solid rgba(217,178,104,.28);opacity:0;transform:translateY(8px);transition:.4s;display:none;}',
      '#v-bojang .bj-result.show{opacity:1;transform:none;display:block;}',
      '#v-bojang .bj-rt{font-size:15px;font-weight:800;color:var(--bj-gold-b);line-height:1.5;margin-bottom:6px;}',
      '#v-bojang .bj-rd{font-size:13px;color:var(--bj-body);line-height:1.65;}',
      /* blocks(type) */
      '#v-bojang .bj-blocks{display:flex;flex-direction:column;gap:12px;margin-top:24px;}',
      '#v-bojang .bj-b{background:linear-gradient(160deg,var(--bj-panel),var(--bj-panel2));border:1px solid var(--bj-line);border-radius:var(--bj-r);padding:19px 18px;box-shadow:var(--bj-sh);}',
      '#v-bojang .bj-bt{font-size:16.5px;font-weight:800;line-height:1.45;margin-bottom:7px;}',
      '#v-bojang .bj-bd{font-size:13.5px;line-height:1.72;color:var(--bj-body);}',
      '#v-bojang .bj-gens{display:flex;gap:7px;margin-top:14px;flex-wrap:wrap;}',
      '#v-bojang .bj-gen{flex:1;min-width:78px;text-align:center;padding:10px 6px;border-radius:11px;background:var(--bj-soft);border:1px solid var(--bj-line);}',
      '#v-bojang .bj-genn{font-size:12px;font-weight:800;color:var(--bj-gold-b);}',
      '#v-bojang .bj-genx{font-size:10.5px;color:var(--bj-faint);margin-top:3px;line-height:1.35;}',
      '#v-bojang .bj-cmp{display:flex;flex-direction:column;gap:9px;margin-top:14px;}',
      '#v-bojang .bj-cmpr{display:flex;align-items:center;gap:10px;font-size:12.5px;}',
      '#v-bojang .bj-lo{flex:1;text-align:center;padding:9px 6px;border-radius:10px;background:var(--bj-soft);border:1px solid var(--bj-line);color:var(--bj-muted);font-weight:700;}',
      '#v-bojang .bj-ar{color:var(--bj-gold);font-weight:900;flex-shrink:0;}',
      '#v-bojang .bj-hi{flex:1;text-align:center;padding:9px 6px;border-radius:10px;background:rgba(217,178,104,.12);border:1px solid rgba(217,178,104,.3);color:var(--bj-gold-b);font-weight:800;}',
      '#v-bojang .bj-check{margin-top:24px;background:linear-gradient(160deg,var(--bj-panel),var(--bj-panel2));border:1px solid var(--bj-line);border-radius:var(--bj-r);padding:20px 18px;text-align:center;box-shadow:var(--bj-sh);}',
      '#v-bojang .bj-cq{font-size:15px;font-weight:800;line-height:1.5;margin-bottom:14px;}',
      '#v-bojang .bj-cq b{color:var(--bj-gold-b);}',
      '#v-bojang .bj-ans{margin-top:14px;font-size:13.5px;line-height:1.65;color:var(--bj-gold-b);font-weight:700;opacity:0;max-height:0;overflow:hidden;transition:.35s;}',
      '#v-bojang .bj-ans.show{opacity:1;max-height:160px;}',
      /* medical table + quiz */
      '#v-bojang .bj-medtable .bj-tablewrap{overflow-x:auto;margin-top:10px;}',
      '#v-bojang .bj-table{width:100%;border-collapse:collapse;font-size:13px;min-width:460px;}',
      '#v-bojang .bj-table th{text-align:left;font-size:11px;color:var(--bj-faint);font-weight:800;padding:8px 10px;border-bottom:1px solid var(--bj-line);}',
      '#v-bojang .bj-table td{padding:10px;border-bottom:1px solid var(--bj-line);vertical-align:top;color:var(--bj-body);}',
      '#v-bojang .bj-genpill{display:inline-block;font-weight:800;font-size:11px;color:#241B08;background:linear-gradient(135deg,var(--bj-gold-b),var(--bj-gold));border-radius:8px;padding:3px 9px;white-space:nowrap;}',
      '#v-bojang .bj-tdname{font-weight:700;white-space:nowrap;color:var(--bj-ink);}',
      '#v-bojang .bj-tdrange{color:var(--bj-muted);white-space:nowrap;}',
      '#v-bojang .bj-tdone{color:var(--bj-body);line-height:1.5;}',
      '#v-bojang .bj-src{display:inline-block;font-size:11px;padding:4px 10px;border-radius:8px;margin-top:8px;}',
      '#v-bojang .bj-src-db{color:var(--bj-good);background:rgba(87,194,149,.12);}',
      '#v-bojang .bj-src-fb{color:var(--bj-warn);background:rgba(230,182,91,.14);}',
      '#v-bojang .bj-quizrow{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:12px;}',
      '#v-bojang .bj-date{font-size:15px;padding:10px 12px;border:1px solid var(--bj-line);border-radius:11px;background:var(--bj-soft);color:var(--bj-ink);color-scheme:light;}',
      '#v-bojang .bj-judge{font-size:15px;font-weight:800;color:#241B08;background:linear-gradient(135deg,var(--bj-gold-b),var(--bj-gold));border:0;border-radius:11px;padding:10px 20px;cursor:pointer;font-family:inherit;}',
      '#v-bojang .bj-medresult{margin-top:14px;}',
      '#v-bojang .bj-medwarn{font-size:13.5px;color:var(--bj-warn);background:rgba(230,182,91,.12);padding:12px 14px;border-radius:11px;}',
      '#v-bojang .bj-medcard{border:1px solid rgba(217,178,104,.4);border-radius:15px;padding:16px 18px;background:rgba(217,178,104,.08);}',
      '#v-bojang .bj-medhead{display:flex;align-items:center;gap:10px;margin-bottom:8px;}',
      '#v-bojang .bj-medname{font-weight:800;font-size:16px;color:var(--bj-ink);}',
      '#v-bojang .bj-medrange{font-size:13px;color:var(--bj-muted);margin-bottom:8px;}',
      '#v-bojang .bj-medone{font-size:14.5px;line-height:1.6;margin:0 0 10px;color:var(--bj-ink);}',
      '#v-bojang .bj-medfoot{font-size:12.5px;color:var(--bj-faint);line-height:1.55;border-top:1px dashed var(--bj-line);padding-top:10px;}',
      /* cta */
      '#v-bojang .bj-cta{margin-top:26px;background:linear-gradient(155deg,#FFFCF4,#FAF3E2);border:1px solid rgba(217,178,104,.34);border-radius:var(--bj-r);padding:24px 20px;text-align:center;position:relative;overflow:hidden;box-shadow:var(--bj-sh);}',
      '#v-bojang .bj-ct{font-size:18px;font-weight:800;line-height:1.45;position:relative;}',
      '#v-bojang .bj-cs{font-size:13.5px;color:var(--bj-muted);margin-top:9px;line-height:1.65;position:relative;}',
      '#v-bojang .bj-btns{display:flex;flex-direction:column;gap:10px;margin-top:18px;position:relative;}',
      '#v-bojang .bj-btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:15px;border-radius:14px;font-size:15px;font-weight:800;cursor:pointer;border:0;font-family:inherit;text-decoration:none;}',
      '#v-bojang .bj-btn.primary{background:linear-gradient(135deg,var(--bj-gold-b),var(--bj-gold));color:#241B08;}',
      '#v-bojang .bj-btn svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}',
      /* foot */
      '#v-bojang .bj-foot{margin-top:26px;text-align:center;}',
      '#v-bojang .bj-sign{display:inline-flex;align-items:center;gap:10px;padding:12px 18px;border-radius:14px;background:var(--bj-soft);border:1px solid var(--bj-line);}',
      '#v-bojang .bj-av{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--bj-gold-b),var(--bj-gold));display:grid;place-items:center;color:#241B08;font-weight:900;font-size:15px;}',
      '#v-bojang .bj-nm{text-align:left;}',
      '#v-bojang .bj-nm .bj-a{font-size:14px;font-weight:800;}',
      '#v-bojang .bj-nm .bj-b{font-size:11.5px;color:var(--bj-faint);margin-top:2px;}',
      '#v-bojang .bj-disc{font-size:11px;color:var(--bj-faint);line-height:1.7;margin-top:16px;max-width:360px;margin-left:auto;margin-right:auto;}',
      /* result */
      '#v-bojang .bj-samplebar{margin-top:14px;text-align:center;font-size:11.5px;font-weight:800;letter-spacing:.02em;color:var(--bj-gold-b);background:rgba(217,178,104,.1);border:1px solid rgba(217,178,104,.28);border-radius:99px;padding:8px 14px;}',
      '#v-bojang .bj-rzhero{padding-top:28px;}',
      '#v-bojang .bj-verdict{display:inline-block;margin-top:14px;font-size:15px;font-weight:800;padding:10px 18px;border-radius:13px;}',
      '#v-bojang .bj-verdict-warn{color:var(--bj-warn);background:rgba(230,182,91,.13);border:1px solid rgba(230,182,91,.32);}',
      '#v-bojang .bj-verdict-good{color:var(--bj-good);background:rgba(87,194,149,.13);border:1px solid rgba(87,194,149,.32);}',
      '#v-bojang .bj-axes{display:flex;flex-direction:column;gap:10px;}',
      '#v-bojang .bj-ax{display:flex;align-items:flex-start;gap:13px;background:linear-gradient(160deg,var(--bj-panel),var(--bj-panel2));border:1px solid var(--bj-line);border-radius:16px;padding:15px;border-left-width:3px;box-shadow:var(--bj-sh);}',
      '#v-bojang .bj-ax-good{border-left-color:var(--bj-good);}',
      '#v-bojang .bj-ax-warn{border-left-color:var(--bj-warn);}',
      '#v-bojang .bj-ax-weak{border-left-color:var(--bj-weak);}',
      '#v-bojang .bj-axic{width:38px;height:38px;flex-shrink:0;border-radius:11px;background:rgba(217,178,104,.10);border:1px solid rgba(217,178,104,.22);display:grid;place-items:center;font-size:18px;}',
      '#v-bojang .bj-axmid{flex:1;min-width:0;}',
      '#v-bojang .bj-axname{font-size:15px;font-weight:800;}',
      '#v-bojang .bj-axtag{font-size:10.5px;font-weight:800;margin-left:6px;padding:2px 8px;border-radius:99px;background:var(--bj-soft);border:1px solid var(--bj-line);color:var(--bj-muted);vertical-align:middle;}',
      '#v-bojang .bj-ax-good .bj-axtag{color:var(--bj-good);}',
      '#v-bojang .bj-ax-warn .bj-axtag{color:var(--bj-warn);}',
      '#v-bojang .bj-ax-weak .bj-axtag{color:var(--bj-weak);}',
      '#v-bojang .bj-axnote{font-size:12.5px;color:var(--bj-muted);margin-top:4px;line-height:1.55;}',
      '#v-bojang .bj-rzpoints{margin-top:18px;}',
      '#v-bojang .bj-ptlist{margin:8px 0 0;padding-left:18px;}',
      '#v-bojang .bj-ptlist li{font-size:13.5px;line-height:1.7;color:var(--bj-body);margin-bottom:6px;}',
      '#v-bojang .bj-ptlist li b{color:var(--bj-gold-b);}',
      '#v-bojang .bj-rzfinal{margin-top:12px;}'
    ].join('\n');
    document.head.appendChild(st);
  }

})();
