/* ═══════════════════════════════════════════════════════════════════════════
 * X-FILE (#v-xfile) — 카드 허브
 * ───────────────────────────────────────────────────────────────────────────
 * 구조(대표 확정 2026-07-17): X-FILE = 여러 카드를 담는 그릇. 진입 = 허브(카드 목록),
 *   카드 클릭 → 해당 카드 화면. 카드는 CARDS 배열로 정의 — 다음 카드 추가 시
 *   CARDS에 {key,em,title,desc,step} 한 줄만 추가하고 그 step 렌더러만 붙이면 된다.
 * 현재 카드 1개: "내 보험 어때?" 자가 검진표 — 고객이 스스로 4항목(의료실비·암·
 *   뇌심장·수술비)을 체크 → 4축 판정 결과 → 상담 신청 CTA(전화·카톡). 앱 뷰는
 *   1개(#v-xfile)만 쓰고 그 안에서 JS 상태로 화면 전환(hub → start → quiz → result).
 * 복귀 동선: 허브 = '‹ 홈으로'(앱 홈) / 서브 = '‹ 목록으로'(허브). bojang.js와 동일.
 * 게이트: _canSeeXfile(임태성 user_id 또는 role=admin) 전용. showView 게이트가
 *   1차, _xfileShow 진입 시 2차 방어. 고객/anon 노출 0.
 * 문구 출처: js/bojang.js 기존 자산(퀴즈·판정·CTA·서명)에서 가져와 구성.
 *   단 코드는 자족(self-contained) — bojang.js를 import/의존하지 않는다.
 * 데이터: DB·fetch·Supabase write 0. 검진 상태는 JS 메모리 변수만(localStorage X).
 *   고객 실데이터·PII 0. 자유 입력 없음(선택지만) — innerHTML 삽입은 xfEsc.
 * 2차 예정(이번 범위 아님): 고객 공개 URL · 상담신청 DB 저장 · 폼 전송.
 * CSS 격리: 모든 규칙 #v-xfile 하위 + xf- 프리픽스. v2 토큰(app-core.css) 사용,
 *   라이트 톤(bojang 6862bba 라이트 전환 기준과 정합). 하드코딩·직각 금지.
 * 롤백: 본 파일 삭제 + app.html의 (a)<script src="/js/xfile.js"> (b)showView의
 *   _xfileShow 호출 (c)#v-xfile div 골격 원복.
 * 최초 작성 2026-07-17 (feat/xfile-self-check).
 * ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var PHONE = '01092419375';
  var PHONE_DISP = '010-9241-9375';
  var KAKAO = 'https://open.kakao.com/o/svu80Moi';  /* 원세컨드 공식 오픈채팅(앱 전역 동일 링크) */

  /* ── 진입 게이트 폴백(스크립트 단독/직접 호출 방어) ──────────────────────── */
  if (typeof window._canSeeXfile !== 'function') {
    window._canSeeXfile = function () {
      try {
        var u = JSON.parse(localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}');
        return String(u.id || '') === '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd' || String(u.role || '') === 'admin';
      } catch (e) { return false; }
    };
  }

  function xfEsc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * 검진 항목 4축 — 질문·판정 문구는 js/bojang.js 기존 자산에서 가져옴.
   *   의료실비 = bojang ACC[0] · renderMedical 블록 · share 퀴즈 q0
   *   암        = bojang ACC[1] · TYPES.cancer(3층 chips · q · ans0/ans1)
   *   뇌·심장   = bojang ACC[2] · TYPES.brainheart(좁은문/넓은문 cmp · q · ans)
   *   수술비    = bojang ACC[3] · TYPES.surgery(종수술 chips · q · ans)
   * 선택지 3종 공통: 네, 알아요(0) / 아니요(2) / 잘 몰라요(1). 점수 높을수록 공백.
   * ══════════════════════════════════════════════════════════════════════════ */
  var OPTS = [
    { t: '네, 알아요', v: 0 },
    { t: '아니요', v: 2 },
    { t: '잘 몰라요', v: 1 }
  ];

  var AXES = [
    {
      key: 'medical', em: '🏥', name: '의료실비',
      sub: '병원비를 실제로 돌려받는 기본기',
      qs: [
        "내 <b>실손보험이 몇 세대</b>인지 알고 계세요?",
        "도수치료·주사·MRI 같은 <b>비급여 구조</b>가 어떤지 아세요?",
        "<b>갱신보험료</b>가 어떻게 오르는지 확인해 보셨어요?"
      ],
      good: { tag: '양호', note: '병원비 바닥판은 준비돼 있어요. 세대·자기부담 구조만 한 번 같이 점검해봐요.' },
      warn: { tag: '확인 필요', note: "'있다/없다'보다 <b>몇 세대</b>인지가 중요해요. 세대에 따라 자기부담금·비급여 보장이 달라집니다." },
      weak: { tag: '보완 필요', note: '내 실손이 몇 세대인지, 비급여 구조·갱신보험료가 어떤지 — 이 세 가지를 같이 봐야 실제 체감이 잡혀요.' }
    },
    {
      key: 'cancer', em: '🎗️', name: '암',
      sub: '진단금 하나로 끝이 아니에요',
      qs: [
        "암 진단비 말고 <b>'치료비' 보장</b>도 있는지 아세요?",
        "치료 과정을 대비하는 <b>주요치료비</b> 보장이 있는지 아세요?",
        "치료 선택의 폭을 넓히는 <b>비급여</b> 보장이 있는지 아세요?"
      ],
      good: { tag: '양호', note: '잘 알고 계시네요! 그럼 주요치료비·비급여가 실제로 충분한 금액인지만 같이 점검해봐요.' },
      warn: { tag: '확인 필요', note: '진단비·주요치료비·비급여 <b>3층</b>이 함께 있어야 진단부터 치료까지 빈틈이 없어요.' },
      weak: { tag: '보완 필요', note: '많은 분이 여기서 놓치세요. 진단금만 있고 치료비가 비면 정작 치료 때 아쉬워요.' }
    },
    {
      key: 'brainheart', em: '🫀', name: '뇌 · 심장',
      sub: '이름은 비슷해도 범위가 달라요',
      qs: [
        "내 뇌·심장 보장이 <b>넓은 범위</b>인지 아세요?",
        "뇌출혈·급성심근경색을 넘어 <b>뇌혈관질환·허혈성심장질환</b>까지 담고 있나요?",
        "진단비 말고 <b>수술·치료 특약</b>도 있는지 아세요?"
      ],
      good: { tag: '양호', note: '정확히 아시네요! 넓은 범위 + 수술·치료까지 함께 있는지만 같이 점검해봐요.' },
      warn: { tag: '범위 확인', note: '뇌·심장은 진단금 액수보다 <b>어떤 병까지 보장되는지</b> 범위가 더 결정적이에요.' },
      weak: { tag: '보완 필요', note: '이건 증권을 봐야 알 수 있어요. 좁은 담보면 넓히는 게 큰 차이를 만들어요.' }
    },
    {
      key: 'surgery', em: '🩹', name: '수술비',
      sub: '살면서 자주 쓰는 생활형 보장',
      qs: [
        "내 수술비가 <b>반복 지급</b>되는지 아세요?",
        "수술을 난이도별로 나눠 지급하는 <b>종수술(1~5종)</b> 구조인지 아세요?",
        "<b>질병·상해</b> 수술이 둘 다 되는지 아세요?"
      ],
      good: { tag: '양호', note: '잘 챙기셨네요! 종수술 범위와 중복 지급 여부만 같이 점검해봐요.' },
      warn: { tag: '확인 필요', note: '1회성인지 <b>반복 지급</b>인지, 질병·상해가 구분돼 있는지 함께 봐야 해요.' },
      weak: { tag: '보완 필요', note: '이 부분을 모르는 분이 많아요. 반복 지급 여부가 실제 병원 이용에서 큰 차이예요.' }
    }
  ];

  /* 상태 = 메모리만. _ans[axisIndex][qIndex] = 점수(0|1|2) */
  var _step = 'start';
  var _ai = 0;
  var _ans = {};

  function resetState() { _step = 'start'; _ai = 0; _ans = {}; }

  function axisLevel(i) {
    var a = _ans[i] || {};
    var sum = 0;
    for (var k in a) { if (Object.prototype.hasOwnProperty.call(a, k)) sum += a[k]; }
    if (sum <= 1) return 'good';
    if (sum <= 3) return 'warn';
    return 'weak';
  }
  function axisAnswered(i) {
    var a = _ans[i] || {};
    var n = 0;
    for (var k in a) { if (Object.prototype.hasOwnProperty.call(a, k)) n++; }
    return n;
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * 공용 조각(뒤로가기 · CTA · 서명) — bojang.js 패턴 복제(xf 네임스페이스)
   * ══════════════════════════════════════════════════════════════════════════ */
  /* 허브 = 앱 홈으로 / 서브(검진표) = 허브 목록으로. bojang.js와 동일한 2단 복귀 동선. */
  function hubBackBar() {
    return '<div class="xf-topbar"><button class="smsg-back" type="button" onclick="showView(\'home\')">&#8249; 홈으로</button></div>';
  }
  function backBar() {
    return '<div class="xf-topbar"><button class="smsg-back" type="button" onclick="window._xfileShow()">&#8249; 목록으로</button></div>';
  }
  function ctaHtml() {
    return '' +
      '<div class="xf-cta">' +
        '<div class="xf-ct">궁금한 점, 지금 편하게 물어보세요</div>' +
        '<div class="xf-cs">전화 한 통이면 내 보장 상태를 5분 만에 쉽게 확인해드려요.</div>' +
        '<div class="xf-btns">' +
          '<a class="xf-btn primary" href="tel:' + PHONE + '">' +
            '<svg viewBox="0 0 24 24"><path d="M4 5c0 9 6 15 15 15l0-3.5-4-1.5-2 2c-3-1.4-5.6-4-7-7l2-2-1.5-4L4 5z"/></svg>전화 문의 · ' + PHONE_DISP + '</a>' +
          '<a class="xf-btn" href="' + KAKAO + '" target="_blank" rel="noopener">' +
            '<svg viewBox="0 0 24 24"><path d="M21 11.5c0 4.1-4 7.5-9 7.5-.9 0-1.8-.1-2.6-.3L4 20.5l1.4-3.4C3.9 15.7 3 13.7 3 11.5 3 7.4 7 4 12 4s9 3.4 9 7.5z"/></svg>카카오톡 문의</a>' +
          '<a class="xf-btn" href="sms:' + PHONE + '">' +
            '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>문자 문의</a>' +
        '</div>' +
      '</div>';
  }
  function signHtml() {
    return '' +
      '<div class="xf-foot">' +
        '<div class="xf-sign"><div class="xf-av">임</div><div class="xf-nm"><div class="xf-a">임태성 보험전문가</div><div class="xf-b">' + PHONE_DISP + '</div></div></div>' +
        '<div class="xf-disc">※ 이 자가 검진표는 보험 이해를 돕기 위한 일반 안내이며, 가입·해지를 권유하지 않습니다. 실제 보장은 증권·약관 기준으로 확인해 드립니다.</div>' +
      '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * 0) 허브 — X-FILE 진입 기본 화면. 카드 목록을 담는 그릇.
   *    카드 추가 = CARDS에 {key, em, title, desc, step} 한 줄 추가 + 그 step 렌더러 등록.
   * ══════════════════════════════════════════════════════════════════════════ */
  var CARDS = [
    { key: 'check', em: '🩺', title: '내 보험 어때?', desc: '의료실비·암·뇌/심장·수술비 4가지 자가 검진', step: 'check', href: '/pages/insurance-self-check.html' },
    /* 아래 7개(2026-07-17 대표 확정) = 자리만 잡은 빈 페이지. 내용은 대표가 채운다.
       em은 AXES 4축(의료실비·암·뇌심장·수술비) 이모지를 그대로 재사용해 톤 일관. */
    { key: 'medical', em: '🏥', title: '의료실비', desc: '준비 중', step: 'medical' },
    { key: 'cancer', em: '🎗️', title: '암', desc: '준비 중', step: 'cancer' },
    { key: 'brainheart', em: '🫀', title: '뇌/심장', desc: '준비 중', step: 'brainheart' },
    { key: 'surgery', em: '🩹', title: '수술비', desc: '준비 중', step: 'surgery' },
    { key: 'general', em: '🛡️', title: '종합보험', desc: '준비 중', step: 'general' },
    { key: 'analysis', em: '📊', title: '보장분석', desc: '준비 중', step: 'analysis' },
    { key: 'caregiver', em: '🧑‍⚕️', title: '간병인', desc: '준비 중', step: 'caregiver' }
  ];

  /* 카드 = 컴팩트 타일(홈 '자주 찾는 보험 자료' .hs2-hub-tile과 동일 성격).
     타일 전체가 버튼 = 클릭 하나로 진입(홈 타일과 동일). 별도 '›' 버튼 없음.
     아이콘 상자는 X-FILE 공용 .xf-em 재사용(검진표·결과와 톤 일치, 이모지 유지). */
  function cardTileHtml(c) {
    var action = c.href ? "location.href='" + c.href + "'" : "window._xfileShow('" + c.step + "')";
    return '' +
      '<button class="xf-tile" type="button" onclick="' + action + '">' +
        '<span class="xf-em">' + c.em + '</span>' +
        '<span class="xf-ttx"><b>' + xfEsc(c.title) + '</b><em>' + xfEsc(c.desc) + '</em></span>' +
      '</button>';
  }

  function renderHub() {
    var list = '';
    for (var i = 0; i < CARDS.length; i++) list += cardTileHtml(CARDS[i]);
    return '' +
      hubBackBar() +
      '<div class="xf-card">' +
        '<div class="xf-hero">' +
          '<h1 class="xf-heroh"><span class="xf-g">X-FILE</span></h1>' +
        '</div>' +
        '<div class="xf-hubgrid">' + list + '</div>' +
      '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * 1) 시작 화면
   * ══════════════════════════════════════════════════════════════════════════ */
  function renderStart() {
    var list = '';
    for (var i = 0; i < AXES.length; i++) {
      var a = AXES[i];
      list += '<div class="xf-li"><div class="xf-em">' + a.em + '</div><div class="xf-lmid">' +
        '<div class="xf-lt">' + xfEsc(a.name) + '</div><div class="xf-ls">' + xfEsc(a.sub) + '</div></div></div>';
    }
    return '' +
      backBar() +
      '<div class="xf-card">' +
        '<div class="xf-hero">' +
          '<div class="xf-eyebrow">X-FILE · 자가 검진표</div>' +
          '<h1 class="xf-heroh">내 보험,<br><span class="xf-g">어때?</span></h1>' +
          '<p class="xf-herop">가입한 보험이 실제로 나를 지켜주는지, 가장 중요한 4가지 기준으로 쉽게 짚어드립니다. 아는 만큼만 편하게 답해보세요.</p>' +
        '</div>' +
        '<div class="xf-list">' + list + '</div>' +
        '<button class="xf-go" type="button" onclick="window._xfileShow(\'quiz\')">검진 시작</button>' +
        signHtml() +
      '</div>';
  }

  /* ══════════════════════════════════════════════════════════════════════════
   * 2) 검진 화면 — 4항목을 순서대로(항목당 질문 3개)
   * ══════════════════════════════════════════════════════════════════════════ */
  function renderQuiz() {
    var a = AXES[_ai];
    var saved = _ans[_ai] || {};
    var qs = '';
    for (var i = 0; i < a.qs.length; i++) {
      var opts = '';
      for (var j = 0; j < OPTS.length; j++) {
        var on = (saved[i] === OPTS[j].v && Object.prototype.hasOwnProperty.call(saved, i)) ? ' on' : '';
        opts += '<button class="xf-opt' + on + '" type="button" onclick="window._xfOpt(this,' + i + ',' + OPTS[j].v + ')">' + xfEsc(OPTS[j].t) + '</button>';
      }
      /* a.qs[i]는 정적 상수(사용자 입력 아님) — <b> 강조 유지 위해 escape 미적용 */
      qs += '<div class="xf-q"><div class="xf-qt">' + a.qs[i] + '</div><div class="xf-opts">' + opts + '</div></div>';
    }
    var done = axisAnswered(_ai) === a.qs.length;
    var last = _ai === AXES.length - 1;
    var pct = Math.round(((_ai) / AXES.length) * 100);
    return '' +
      backBar() +
      '<div class="xf-card">' +
        '<div class="xf-prog">' +
          '<div class="xf-progt"><span>' + (_ai + 1) + ' / ' + AXES.length + '</span><span>' + xfEsc(a.name) + '</span></div>' +
          '<div class="xf-bar"><i style="width:' + pct + '%"></i></div>' +
        '</div>' +
        '<div class="xf-qhead"><div class="xf-em big">' + a.em + '</div><div><div class="xf-qh1">' + xfEsc(a.name) + '</div><div class="xf-qh2">' + xfEsc(a.sub) + '</div></div></div>' +
        '<div class="xf-quiz">' + qs + '</div>' +
        '<div class="xf-nav">' +
          (_ai > 0 ? '<button class="xf-prev" type="button" onclick="window._xfPrev()">이전</button>' : '') +
          '<button class="xf-next" type="button" id="xfNext"' + (done ? '' : ' disabled') + ' onclick="window._xfNext()">' + (last ? '결과 보기' : '다음') + '</button>' +
        '</div>' +
      '</div>';
  }

  window._xfOpt = function (btn, qi, val) {
    var wrap = btn.parentNode;
    var opts = wrap.querySelectorAll('.xf-opt');
    for (var i = 0; i < opts.length; i++) opts[i].classList.remove('on');
    btn.classList.add('on');
    if (!_ans[_ai]) _ans[_ai] = {};
    _ans[_ai][qi] = val;
    var next = document.getElementById('xfNext');
    if (next && axisAnswered(_ai) === AXES[_ai].qs.length) next.removeAttribute('disabled');
  };
  window._xfPrev = function () {
    if (_ai > 0) { _ai--; paint('quiz'); }
  };
  window._xfNext = function () {
    if (axisAnswered(_ai) !== AXES[_ai].qs.length) return;
    if (_ai < AXES.length - 1) { _ai++; paint('quiz'); }
    else { paint('result'); }
  };

  /* ══════════════════════════════════════════════════════════════════════════
   * 3) 결과 화면 — 4축 판정 + 종합 요약 + 상담 CTA
   *    종합 문구 = bojang share 자가진단 결과 3분기 그대로.
   * ══════════════════════════════════════════════════════════════════════════ */
  function renderResult() {
    var axes = '';
    var gaps = 0;
    for (var i = 0; i < AXES.length; i++) {
      var a = AXES[i];
      var lv = axisLevel(i);
      if (lv !== 'good') gaps++;
      var d = a[lv];
      axes += '<div class="xf-ax xf-ax-' + lv + '"><div class="xf-em">' + a.em + '</div><div class="xf-axmid">' +
        '<div class="xf-axname">' + xfEsc(a.name) + ' <span class="xf-axtag">' + xfEsc(d.tag) + '</span></div>' +
        '<div class="xf-axnote">' + d.note + '</div></div></div>';
    }
    var t, dsc, tone;
    if (gaps >= 2) {
      t = '점검이 필요한 상태예요'; tone = 'warn';
      dsc = '세대·치료비·범위 중 놓친 부분이 있어요. 대부분 여기서 체감 보장이 갈립니다. 5분이면 정확히 확인해드릴게요.';
    } else if (gaps === 1) {
      t = '거의 잘 챙기셨어요 — 딱 한 가지만'; tone = 'warn';
      dsc = '한 부분만 확인하면 균형이 딱 맞아요. 그 한 칸이 무엇인지 편하게 물어봐 주세요.';
    } else {
      t = '기본기가 탄탄하시네요 👍'; tone = 'good';
      dsc = '잘 준비돼 있어요. 그래도 세대·중복·보험료 효율은 한 번 같이 점검해두면 좋아요.';
    }
    return '' +
      backBar() +
      '<div class="xf-card">' +
        '<div class="xf-hero">' +
          '<div class="xf-eyebrow">X-FILE · 검진 결과</div>' +
          '<div class="xf-verdict xf-verdict-' + tone + '">' + xfEsc(t) + '</div>' +
          '<p class="xf-herop">' + xfEsc(dsc) + '</p>' +
        '</div>' +
        '<div class="xf-secth"><h2>4축 보장 진단</h2><span>실비 · 암 · 뇌심장 · 수술비</span></div>' +
        '<div class="xf-axes">' + axes + '</div>' +
        ctaHtml() +
        '<button class="xf-again" type="button" onclick="window._xfAgain()">다시 검진</button>' +
        signHtml() +
      '</div>';
  }

  window._xfAgain = function () { resetState(); paint('start'); };

  /* ══════════════════════════════════════════════════════════════════════════
   * 4) 빈 페이지 — 신규 카드 7종 공용. 골격만(‹ 목록으로 + 제목 + 준비 중).
   *    내용은 대표가 채운다. 여기서 기능·데이터·CTA를 임의로 만들지 말 것.
   *    카드별 렌더러는 이 함수 1개를 얇게 감싸기만 한다(중복 코드 0).
   * ══════════════════════════════════════════════════════════════════════════ */
  function renderBlank(title) {
    return '' +
      backBar() +
      '<div class="xf-card">' +
        '<div class="xf-hero">' +
          '<h1 class="xf-heroh"><span class="xf-g">' + xfEsc(title) + '</span></h1>' +
          '<p class="xf-herop">준비 중입니다.</p>' +
        '</div>' +
      '</div>';
  }
  function blankOf(title) { return function () { return renderBlank(title); }; }

  /* ══════════════════════════════════════════════════════════════════════════
   * 미니 라우터
   *   주의: 'analysis' = X-FILE 안의 빈 페이지. 앱의 보장분석 뷰(#v-bojang·
   *   js/bojang.js)와는 별개 — 혼동 방지를 위해 key를 'bojang'이 아닌
   *   'analysis'로 둔다(대표 확정 2026-07-17).
   * ══════════════════════════════════════════════════════════════════════════ */
  var RENDERERS = {
    hub: renderHub, start: renderStart, quiz: renderQuiz, result: renderResult,
    medical: blankOf('의료실비'),
    cancer: blankOf('암'),
    brainheart: blankOf('뇌/심장'),
    surgery: blankOf('수술비'),
    general: blankOf('종합보험'),
    analysis: blankOf('보장분석'),
    caregiver: blankOf('간병인')
  };

  function paint(step) {
    var host = document.getElementById('v-xfile');
    if (!host) return;
    _step = RENDERERS[step] ? step : 'hub';
    host.innerHTML = RENDERERS[_step]();
    host.scrollTop = 0;
  }

  window._xfileShow = function (step) {
    if (typeof window._canSeeXfile === 'function' && !window._canSeeXfile()) {
      if (typeof showView === 'function') showView('home');
      return;
    }
    injectStyleOnce();
    /* 'check' = 과거 내부 검진표 시작화면 하위호환. 허브 카드는 승인된 독립 페이지로 이동. 인자 없음 = 허브(기본 진입점). */
    if (step === 'check') { resetState(); paint('start'); return; }
    if (step === 'quiz') { _ai = 0; _ans = {}; paint('quiz'); return; }
    if (step === 'result') { paint('result'); return; }
    if (!step) { resetState(); paint('hub'); return; }
    paint(step);
  };

  /* ══════════════════════════════════════════════════════════════════════════
   * 스코프 스타일(1회 주입) — 전부 #v-xfile 하위, xf- 네임스페이스.
   * v2 토큰(--bg/--s1/--s2/--bd/--tp/--ts/--tf/--ac/--ok/--warn/--err/--radius-*)
   * 사용. 라이트 배경 전제 — 텍스트는 --tp/--ts/--bodytx 계열(near-white 금지).
   * ══════════════════════════════════════════════════════════════════════════ */
  function injectStyleOnce() {
    if (document.getElementById('xf-style')) return;
    var st = document.createElement('style');
    st.id = 'xf-style';
    st.textContent = [
      '#v-xfile{padding:0;overflow-y:auto;min-height:100%;background:var(--bg);color:var(--tp);}',
      '#v-xfile *{box-sizing:border-box;}',
      /* 폭 = 홈 '자주 찾는 보험 자료'(.hs2-hub max-width:860px)와 동일 기준.
         이전 560px는 bojang.js(고객 폰 카톡 발송용)에서 복제돼 들어온 모바일 폭 —
         X-FILE은 대표가 데스크톱에서 쓰는 도구라 화면 폭을 실제로 쓴다(2026-07-17 대표 지시).
         860px 상한은 초광폭에서 카드가 늘어지는 것만 막는 상식선이자 홈과의 정합선. */
      '#v-xfile .xf-topbar{max-width:860px;margin:0 auto;padding:18px 18px 0;}',
      '#v-xfile .xf-card{max-width:860px;margin:0 auto;padding:0 18px 48px;}',
      /* hero */
      '#v-xfile .xf-hero{text-align:center;padding:26px 6px 22px;}',
      '#v-xfile .xf-eyebrow{font-size:11px;font-weight:800;letter-spacing:.18em;color:var(--t-xfile);text-transform:uppercase;}',
      '#v-xfile .xf-heroh{font-size:26px;line-height:1.35;font-weight:800;margin:12px 0 10px;color:var(--tp);letter-spacing:-.5px;}',
      '#v-xfile .xf-g{color:var(--t-xfile);}',
      '#v-xfile .xf-herop{font-size:14px;line-height:1.7;color:var(--ts);max-width:360px;margin:0 auto;}',
      /* ── 허브 = 컴팩트 타일 그리드 (2026-07-17) ──────────────────────────────
         홈 '자주 찾는 보험 자료'(.hs2-hub-grid/.hs2-hub-tile)와 같은 성격.
         이전 .xf-row(긴 가로 막대 1열)는 대표가 2026-07-09에 홈에서 폐기한 형태 →
         제거하고 타일로 교체. 홈 클래스를 직접 쓰지 않고 xf- 네임스페이스로 재현
         (전역 결합 차단 — 홈 스타일이 바뀌어도 X-FILE 동반 파손 0).
         ⚠️ 열 수를 고정하지 않는다: auto-fit + minmax로 '폭'이 열 수를 정한다.
         카드가 8개든 3개든 12개든 자연스럽게 흐른다. */
      /* minmax 최소폭 224px = 홈 타일이 실제로 갖는 최소 열 폭(768px에서 222px)에 맞춘 값.
         덕분에 열 수가 홈과 같은 지점에서 같이 꺾인다(375=1 · 768=3 · 1280/1600=3).
         '3'을 적은 게 아니라 폭이 계산한 결과 — 카드 수가 늘어도 그대로 흐른다. */
      '#v-xfile .xf-hubgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(224px,1fr));gap:12px;}',
      '#v-xfile .xf-tile{display:flex;align-items:center;gap:13px;min-height:68px;padding:14px 16px;border:1px solid var(--bd);border-radius:var(--radius-md);background:var(--s1);cursor:pointer;font-family:inherit;text-align:left;transition:border-color .17s ease,background .17s ease,transform .17s ease,box-shadow .17s ease;}',
      '#v-xfile .xf-tile:hover{border-color:var(--t-xfile);background:color-mix(in srgb,var(--t-xfile) 5%,var(--s1));transform:translateY(-2px);box-shadow:0 5px 16px color-mix(in srgb,var(--t-xfile) 13%,transparent);}',
      '#v-xfile .xf-tile:active{transform:translateY(0);box-shadow:none;}',
      '#v-xfile .xf-tile:focus-visible{outline:2px solid var(--t-xfile);outline-offset:2px;}',
      '#v-xfile .xf-ttx{display:flex;flex-direction:column;gap:3px;min-width:0;}',
      '#v-xfile .xf-ttx b{font-size:15px;font-weight:800;color:var(--tp);line-height:1.3;letter-spacing:-.01em;}',
      '#v-xfile .xf-ttx em{font-style:normal;font-size:12.5px;color:var(--ts);line-height:1.45;}',
      /* start list — 검진표 시작화면의 4축(의료실비·암·뇌심장·수술비) 미리보기.
         서로 대등한 항목이고 순서 의미가 없다 → 세로 1열 강제 해제, 폭에 반응.
         최소폭은 결과 .xf-axes와 동일(300px) — 같은 4축을 보여주는 자리라 톤을 맞춘다
         (허브 타일보다 크게 잡아야 4개가 3+1 고아 없이 2×2로 흐른다). */
      '#v-xfile .xf-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px;}',
      '#v-xfile .xf-li{display:flex;align-items:center;gap:13px;background:var(--s1);border:1px solid var(--bd);border-radius:var(--radius-lg);padding:14px 15px;}',
      '#v-xfile .xf-em{width:40px;height:40px;flex-shrink:0;border-radius:var(--radius-sm);background:var(--s2);border:1px solid var(--bd);display:grid;place-items:center;font-size:19px;}',
      '#v-xfile .xf-em.big{width:46px;height:46px;font-size:22px;}',
      '#v-xfile .xf-lmid{flex:1;min-width:0;}',
      '#v-xfile .xf-lt{font-size:15px;font-weight:800;color:var(--tp);}',
      '#v-xfile .xf-ls{font-size:12.5px;color:var(--ts);margin-top:3px;line-height:1.45;}',
      '#v-xfile .xf-go{width:100%;margin-top:20px;padding:16px;border:0;border-radius:var(--radius-md);background:var(--t-xfile);color:#FFFFFF;font-size:16px;font-weight:800;cursor:pointer;font-family:inherit;}',
      '#v-xfile .xf-go:hover{filter:brightness(1.06);}',
      /* progress */
      '#v-xfile .xf-prog{margin-top:22px;}',
      '#v-xfile .xf-progt{display:flex;justify-content:space-between;font-size:12px;font-weight:800;color:var(--tf);margin-bottom:7px;}',
      '#v-xfile .xf-bar{height:5px;border-radius:var(--radius-full);background:var(--s2);border:1px solid var(--bd);overflow:hidden;}',
      '#v-xfile .xf-bar i{display:block;height:100%;background:var(--t-xfile);transition:width .3s;}',
      /* quiz */
      '#v-xfile .xf-qhead{display:flex;align-items:center;gap:13px;margin:18px 0 14px;}',
      '#v-xfile .xf-qh1{font-size:18px;font-weight:800;color:var(--tp);}',
      '#v-xfile .xf-qh2{font-size:12.5px;color:var(--ts);margin-top:3px;line-height:1.45;}',
      '#v-xfile .xf-quiz{background:var(--s1);border:1px solid var(--bd);border-radius:var(--radius-lg);padding:20px 18px;}',
      '#v-xfile .xf-q{margin-bottom:18px;}',
      '#v-xfile .xf-q:last-child{margin-bottom:0;}',
      '#v-xfile .xf-qt{font-size:14.5px;font-weight:700;line-height:1.55;margin-bottom:11px;color:var(--tp);}',
      '#v-xfile .xf-qt b{color:var(--t-xfile);font-weight:800;}',
      '#v-xfile .xf-opts{display:flex;gap:8px;}',
      '#v-xfile .xf-opt{flex:1;padding:12px 4px;border-radius:var(--radius-sm);border:1px solid var(--bd);background:var(--s2);color:var(--ts);font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:.16s;}',
      '#v-xfile .xf-opt:hover{border-color:var(--t-xfile);}',
      '#v-xfile .xf-opt.on{background:color-mix(in srgb,var(--t-xfile) 9%,var(--s1));border-color:var(--t-xfile);color:var(--t-xfile);}',
      /* nav */
      '#v-xfile .xf-nav{display:flex;gap:10px;margin-top:18px;}',
      '#v-xfile .xf-prev{flex:0 0 auto;padding:15px 22px;border-radius:var(--radius-md);border:1px solid var(--bd);background:var(--s1);color:var(--ts);font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;}',
      '#v-xfile .xf-next{flex:1;padding:15px;border-radius:var(--radius-md);border:0;background:var(--t-xfile);color:#FFFFFF;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;}',
      '#v-xfile .xf-next:disabled{background:var(--s2);color:var(--tf);border:1px solid var(--bd);cursor:not-allowed;}',
      /* result */
      '#v-xfile .xf-verdict{display:inline-block;margin:14px 0 4px;font-size:16px;font-weight:800;padding:11px 18px;border-radius:var(--radius-md);}',
      '#v-xfile .xf-verdict-warn{color:#92400E;background:color-mix(in srgb,var(--warn) 12%,var(--s1));border:1px solid color-mix(in srgb,var(--warn) 38%,var(--bd));}',
      '#v-xfile .xf-verdict-good{color:#15803D;background:color-mix(in srgb,var(--ok) 10%,var(--s1));border:1px solid color-mix(in srgb,var(--ok) 34%,var(--bd));}',
      '#v-xfile .xf-secth{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:22px 2px 12px;}',
      '#v-xfile .xf-secth h2{font-size:17px;font-weight:800;color:var(--tp);}',
      '#v-xfile .xf-secth span{font-size:12px;color:var(--tf);font-weight:600;}',
      /* 결과 4축 진단 — 대등한 항목·순서 의미 없음 → 폭에 반응.
         판정 문구가 여러 줄이라 최소폭은 타일(248px)보다 넉넉히 잡는다. */
      '#v-xfile .xf-axes{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px;}',
      '#v-xfile .xf-ax{display:flex;align-items:flex-start;gap:13px;background:var(--s1);border:1px solid var(--bd);border-radius:var(--radius-lg);padding:15px;border-left-width:3px;}',
      '#v-xfile .xf-ax-good{border-left-color:var(--ok);}',
      '#v-xfile .xf-ax-warn{border-left-color:var(--warn);}',
      '#v-xfile .xf-ax-weak{border-left-color:var(--err);}',
      '#v-xfile .xf-axmid{flex:1;min-width:0;}',
      '#v-xfile .xf-axname{font-size:15px;font-weight:800;color:var(--tp);}',
      '#v-xfile .xf-axtag{font-size:10.5px;font-weight:800;margin-left:6px;padding:2px 8px;border-radius:var(--radius-full);background:var(--s2);border:1px solid var(--bd);color:var(--ts);vertical-align:middle;}',
      '#v-xfile .xf-ax-good .xf-axtag{color:#15803D;}',
      '#v-xfile .xf-ax-warn .xf-axtag{color:#92400E;}',
      '#v-xfile .xf-ax-weak .xf-axtag{color:#991B1B;}',
      '#v-xfile .xf-axnote{font-size:12.5px;color:var(--bodytx);margin-top:5px;line-height:1.6;}',
      '#v-xfile .xf-axnote b{color:var(--tp);font-weight:800;}',
      '#v-xfile .xf-again{width:100%;margin-top:12px;padding:14px;border-radius:var(--radius-md);border:1px solid var(--bd);background:var(--s1);color:var(--ts);font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;}',
      /* cta */
      '#v-xfile .xf-cta{margin-top:24px;background:color-mix(in srgb,var(--t-xfile) 4%,var(--s1));border:1px solid color-mix(in srgb,var(--t-xfile) 30%,var(--bd));border-radius:var(--radius-lg);padding:24px 20px;text-align:center;}',
      '#v-xfile .xf-ct{font-size:18px;font-weight:800;line-height:1.45;color:var(--tp);}',
      '#v-xfile .xf-cs{font-size:13.5px;color:var(--ts);margin-top:9px;line-height:1.65;}',
      /* CTA 3종(전화·카톡·문자) — 대등한 선택지·순서 의미 없음 → 폭 넓으면 가로로. */
      '#v-xfile .xf-btns{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:9px;margin-top:18px;}',
      '#v-xfile .xf-btn{display:flex;align-items:center;justify-content:center;gap:8px;padding:15px;border-radius:var(--radius-md);font-size:15px;font-weight:800;cursor:pointer;border:1px solid var(--bd);background:var(--s1);color:var(--tp);font-family:inherit;text-decoration:none;}',
      '#v-xfile .xf-btn.primary{background:var(--t-xfile);color:#FFFFFF;border-color:var(--t-xfile);}',
      '#v-xfile .xf-btn svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;}',
      /* foot */
      '#v-xfile .xf-foot{margin-top:24px;text-align:center;}',
      '#v-xfile .xf-sign{display:inline-flex;align-items:center;gap:10px;padding:12px 18px;border-radius:var(--radius-md);background:var(--s1);border:1px solid var(--bd);}',
      '#v-xfile .xf-av{width:38px;height:38px;border-radius:var(--radius-full);background:var(--t-xfile);display:grid;place-items:center;color:#FFFFFF;font-weight:900;font-size:15px;}',
      '#v-xfile .xf-nm{text-align:left;}',
      '#v-xfile .xf-nm .xf-a{font-size:14px;font-weight:800;color:var(--tp);}',
      '#v-xfile .xf-nm .xf-b{font-size:11.5px;color:var(--tf);margin-top:2px;}',
      '#v-xfile .xf-disc{font-size:11px;color:var(--tf);line-height:1.7;margin:16px auto 0;max-width:360px;}',
      /* mobile */
      '@media(max-width:420px){#v-xfile .xf-heroh{font-size:23px;}#v-xfile .xf-opt{font-size:12px;padding:11px 3px;}#v-xfile .xf-topbar,#v-xfile .xf-card{padding-left:14px;padding-right:14px;}}'
    ].join('\n');
    document.head.appendChild(st);
  }

})();
