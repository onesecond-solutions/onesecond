/* js/cancer-treatment.js — 암주요치료비 세대별 변천사 "본문"의 단일 원천 공용 모듈
   ────────────────────────────────────────────────────────────────────────────
   실손(js/silson-history.js) 파일럿과 동일 인터페이스:
     window.CancerTreatment.renderInto(rootEl)          — 본문(비교표+인트로+세대카드+심층패널) 렌더 + 이벤트 바인딩
     window.CancerTreatment.renderRailInto(railEl,{body}) — 우측 레일(목차·이 자료 활용·함께 보면 좋은 자료)

   공개본 insurance/cancer-treatment-history/index.html 의 인라인 데이터·렌더를 그대로 옮겨,
   로그인 SPA D영역이 공개본과 "같은 데이터·같은 렌더러"를 쓰게 한다. 공개본 HTML은 무접촉 —
   자기 인라인 렌더를 그대로 유지하고, 이 모듈이 동일 스캐폴딩을 재사용(scripts/verify_cancer_shared.mjs 대조).

   구조 차이(실손과):
   - 세대 카드 = 라디오 선택(항상 하나 선택, 초기 5세대=index 4). 클릭 시 sel 변경 → 세대카드+심층패널 재렌더.
   - 목차 앵커 = h2.sec (실손은 .section-t). */

(function () {
  'use strict';

  /* ══ 메인 비교표 데이터 — 한 벌 → 모바일 카드 + PC 표 이중 렌더 ══ */
  var CT_COLS = [
    { label: "1세대", sub: "~2019", color: "var(--ac)" },
    { label: "2세대", sub: "2020~2023", color: "var(--ac)" },
    { label: "3세대", sub: "2024.1~2024.10", color: "var(--ac)" },
    { label: "4세대", sub: "2024.11~2025.2", color: "var(--ac)" },
    { label: "5세대", sub: "2025.3~", color: "var(--cur)" }
  ];
  var CT_ROWS = [
    { label: "보장 논리", cells: [
      '<span class="em-g">진단 시 목돈</span><small>생활비 성격</small>',
      '<span class="em">특정 치료법 지정</span><small>표적항암</small>',
      '<span class="em">치료 행위 통합</span><small>치료법 무관</small>',
      '치료 행위 통합<small>지급방식 정리</small>',
      '<span class="em-o">급여·비급여 분리</span><small>비급여 전담</small>'] },
    { label: "대표 담보명", cells: [
      '암진단비',
      '표적항암약물<br>허가치료비',
      '<span class="em">암주요치료비</span><small>암특정치료비</small>',
      '암주요치료비',
      '<span class="em-o">비급여(전액본인부담)<br>암주요치료비</span>'] },
    { label: "지급 방식", cells: [
      '정액',
      '정액',
      '정액 <span class="x">/</span> <span class="em">비례 혼재</span>',
      '<span class="em">정액만</span><small>비례형 판매중단</small>',
      '정액'] },
    { label: "지급 횟수", cells: [
      '진단 1회',
      '<span class="em">최초 1회</span><small>KB 최초 도입 기준</small>',
      '연간 1회',
      '연간 1회',
      '연간 1회'] },
    { label: "보장 기간", cells: [
      '—',
      '—',
      '진단 후 <span class="em">5년</span><small>10년형 상품 존재</small>',
      '진단 후 5년<small>10년형 존재</small>',
      '진단 후 5년<small>10년형 존재</small>'] },
    { label: "치료법 범위", cells: [
      '<span class="x">해당 없음</span>',
      '<span class="x">표적항암 한정</span><small>그 외 미지급</small>',
      '<span class="em-g">수술·방사선·약물<br>구분 없음</span>',
      '<span class="em-g">수술·방사선·약물<br>구분 없음</span>',
      '수술·방사선·약물<small>비급여 영역 한정</small>'] },
    { label: "암 종류", cells: [
      '원발암 중심',
      '원발암 중심',
      '<span class="em-g">원발·전이·재발<br>구분 없음</span>',
      '원발·전이·재발<br>구분 없음',
      '기타피부암·갑상선암도<br><span class="em-o">일반암 수준</span>'] },
    { label: "급여 / 비급여", cells: [
      '—',
      '<span class="em-g">구분 없음</span><small>치료법으로 제한</small>',
      '<span class="em-g">구분 없음</span>',
      '<span class="em-g">구분 없음</span>',
      '<span class="em-o">비급여·전액본인부담<br>일 때만 지급</span>'] },
    { label: "보험료 수준", cells: [
      '—',
      '갱신형 위주',
      '—',
      '—',
      '<span class="em-o">기존 대비 약 1/4</span><small>삼성화재 기준</small>'] },
    { label: "핵심 한계", cells: [
      '<span class="x">치료 장기화<br>대응 불가</span>',
      '<span class="x">신의료기술<br>미대응</span>',
      '비급여 고액치료<br>대응 부족',
      '비급여 고액치료<br>대응 부족',
      '<span class="x">급여 표준치료<br>사각지대</span>'] }
  ];

  var GENS = [
    { no: "1세대", yr: "~2019", hl: "진단 시 목돈", sub: "생활비 성격", c: "#6366F1", cs: "#EEF0FE",
      sum: "암보험의 원형. 진단 시점에 목돈을 지급하는 구조로, 치료 과정이 길어지는 상황까지는 다루지 못했습니다.",
      cards: [
        { t: "보장 논리", b: "암 진단 확정 시 약정 금액을 <b>일시금</b>으로 지급. 치료 실행 여부와 무관합니다." },
        { t: "당시 시장", b: "기사 기준으로 <b>생활비를 지급하는 암보험</b>이 주류였던 시기로 서술됩니다." },
        { t: "보장 구성", b: "암보험 보장은 통상 <b>진단비·수술비·치료비</b> 세 갈래로 구분되며, 이 시기는 진단비에 집중됐습니다." },
        { t: "한계", b: "치료가 수술→항암→방사선→추적검사로 이어지는 <b>단계별 현금 흐름</b>을 감당하기 어렵습니다.", hi: 1 },
        { t: "확인 포인트", b: "진단비 외에 <b>치료 과정 단계</b>를 받치는 담보가 있는지 확인이 필요합니다." },
        { t: "현재 위치", b: "이 시기 계약만 보유하고 있다면 최신 치료법 관련 담보가 전무할 가능성이 있습니다." }
      ] },
    { no: "2세대", yr: "2020~2023", hl: "표적항암 지정", sub: "특정 치료법 한정", c: "#8B5CF6", cs: "#F3EEFE",
      sum: "표적항암약물허가치료비 등장. 특정 치료법을 지정해 보장하는 방식으로, 치료법이 다르면 지급되지 않는 구조입니다.",
      cards: [
        { t: "최초 도입", b: "업계 최초는 <b>라이나생명</b>, 손해보험 최초는 <b>KB손해보험</b>(2020.5, 'KB암보험과 건강하게 사는 이야기'). 보험개발원 요율검증·금감원 심사 후 출시." },
        { t: "시장 반응", b: "KB손보 기준 월평균 신규매출 <b>2억 → 16억</b>, 시장점유율 <b>3배인 30%</b>로 확대. 전 업계가 뒤따른 계기." },
        { t: "지급 기준", b: "암 진단 확정 후 표적항암약물허가치료 시 <b>최초 1회</b> 지급. 식약처 허가 효능·효과 범위 내." },
        { t: "확산", b: "2020.12 NH농협생명·삼성생명, 이어 삼성화재·현대해상·한화손보 등이 <b>5,000만 원</b> 수준으로 탑재." },
        { t: "치료 배경", b: "표적항암제는 암세포만 공격해 부작용이 적음. 1회 <b>200만~500만 원</b>, 통상 10회가량 진행." },
        { t: "핵심 한계", b: "<span class='r'>표적항암이 아니면 미지급.</span> 수술 없이 항암만 하거나 중입자치료 등 신의료기술은 대응 불가. 갱신형 위주라 보험료 인상 가능성도 지적됐습니다.", hi: 1 }
      ] },
    { no: "3세대", yr: "2024.1~2024.10", hl: "치료 행위 통합", sub: "암주요치료비 등장", c: "#6366F1", cs: "#EEF0FE",
      sum: "치료법을 구분하지 않고 특약 하나로 보장. 진단비 중심에서 치료비 중심으로 시장이 이동한 분기점입니다.",
      cards: [
        { t: "정의", b: "<b>수술·방사선·약물치료를 구분하지 않고</b> 특약 하나로 보장. 약관상 '주요 치료'로 분류되면 지급하며, <b>급여·비급여를 가리지 않습니다.</b>" },
        { t: "암 종류", b: "<b>원발암·전이암·재발암 구분 없이</b> 보장. 2세대 대비 결정적 확장." },
        { t: "지급 구조", b: "정액보상. <b>연간 1회 한도, 최대 5년</b>. 진단 후 10년형 상품도 존재합니다." },
        { t: "탑재사", b: "2024.3 기준 현대해상·DB손보·메리츠화재·롯데손보. 삼성화재·한화손보는 <b>암진단후암특정치료비</b>라는 유사 담보." },
        { t: "확인 포인트", b: "이 시기 가입 계약은 <span class='r'>정액형인지 비례형인지</span> 확인이 필요합니다. 비례형은 이후 판매중단됩니다.", hi: 1 }
      ] },
    { no: "4세대", yr: "2024.11~2025.2", hl: "정액형 일원화", sub: "비례형 판매중단", c: "#0891B2", cs: "#E6F6FA",
      sum: "비례형 암주요치료비 판매가 중단되며 정액형만 남았습니다. 담보 자체보다 지급방식이 정리된 구간입니다.",
      cards: [
        { t: "무엇이 바뀌었나", b: "<b>2024년 11월부터 비례형 판매중단.</b> 현재는 정액형만 가입 가능합니다." },
        { t: "중단 사유", b: "과잉진료 유발 및 <b>건강보험 제도 왜곡</b> 우려. 치료비가 클수록 보험금이 늘어 병원비 지출을 부추길 수 있다는 판단." },
        { t: "정액형이란", b: "치료 사실만으로 <b>약정 금액 지급</b>. 실제 치료비와 무관하며, 치료비가 정액을 넘으면 초과분은 본인 부담." },
        { t: "비례형이란", b: "실제 발생 치료비에 <b>일정 비율</b>로 지급하던 방식. 현재 신규 가입은 불가합니다." },
        { t: "확인 포인트", b: "<b>2024년 10월 이전</b>에 가입했다면 비례형일 수 있습니다. 가입한 계약의 지급방식을 확인해 보세요.", hi: 1 }
      ] },
    { no: "5세대", yr: "2025.3~", hl: "급여·비급여 분리", sub: "비급여 전담 담보", c: "#EA580C", cs: "#FFF3EC",
      sum: "비급여와 전액본인부담 영역을 떼어내 전담 보장하는 구조. 보험료는 낮지만 급여 표준치료 구간이 비게 됩니다.",
      cards: [
        { t: "시작", b: "<b>2025년 3월 5일 삼성화재</b> '하이클래스 암치료비 특약'. 이후 4월 손보사 전면전으로 확산." },
        { t: "보장 범위", b: "비급여 + <b>급여 중 전액본인부담</b> 항암치료비. 비급여·전액본인부담 수술, 항암방사선치료, 항암약물치료(면역·표적항암제 등)." },
        { t: "보험료", b: "기존 암치료비 특약 대비 <b>약 4분의 1 수준</b>. 진입 문턱이 크게 낮아졌습니다." },
        { t: "배경", b: "암 생존율 상승 → 고가 항암치료 수요 증가. 면역항암제·표적항암제·HIFU·비급여 방사선은 1회 <b>수백만~수천만 원</b>. 여기에 <b>4세대 실손의 비급여 축소</b>가 겹쳤습니다." },
        { t: "세부 조건", b: "보장 대상 의료기관 제한 없음(대학병원·종합병원·암전문병원 등). 기타피부암·갑상선암도 <b>일반암과 동일 수준</b>." },
        { t: "★ 사각지대", b: "<span class='r'>암 진단 후 표준 치료의 상당 부분은 건강보험 급여로 처리됩니다.</span> 비급여형만으로는 급여 구간이 비어 있을 수 있습니다.", hi: 1 }
      ] }
  ];

  /* 본문 마크업 — 공개본 .doc-body 내부와 텍스트·구조 동일. #cmpCards/#cmpTable/#gens/#deep 은 빈 컨테이너로 두고
     drawCmp/drawGens/drawDeep 가 채운다. */
  var BODY_HTML =
    '<h2 class="sec"><span class="sq" style="background:var(--ac)"></span>암 치료비 담보 변천사</h2>' +
    '<div id="cmpCards"></div>' +
    '<div id="cmpTable"></div>' +
    '<div class="intro" style="margin-top:22px">' +
      '암 담보는 <b>「진단 시 목돈」 → 「특정 치료법 보장」 → 「치료 행위 통합」 → 「급여·비급여 분리」</b> 순으로 이동해 왔습니다. ' +
      '특히 <b>2024년 초</b>(암주요치료비 등장), <b>2024년 11월</b>(비례형 판매중단), <b class="o">2025년 3월</b>(비급여 분리 시작)이 결정적 분기점입니다. ' +
      '아래 세대 카드를 눌러 각 세대의 구조와 확인 포인트를 보세요.' +
    '</div>' +
    '<h2 class="sec"><span class="sq" style="background:var(--ac)"></span>세대별 심층 · 확인 포인트</h2>' +
    '<div class="hint">세대 카드를 클릭하면 해당 세대의 심층 정보가 펼쳐집니다</div>' +
    '<div class="gens" id="gens"></div>' +
    '<div id="deep"></div>' +
    '<div class="src">' +
      '출처: 대한금융신문(2020.05) · 이코노믹리뷰(2020.09) · 농민신문(2021.01) · 파이낸셜뉴스(2021.06) · ' +
      '블로터(2024.03) · KB의 생각 · 보험저널(2025.03, 2026.03) · 현대해상·ABL생명 상품안내 · 뱅크샐러드<br>' +
      '본 자료는 상담 전 참고용이며 특정 상품·보험사를 권유하지 않습니다. 실제 보장은 약관과 가입 시기에 따라 달라집니다.' +
    '</div>';

  function drawCmp(root) {
    var cards = root.querySelector("#cmpCards"), table = root.querySelector("#cmpTable");
    if (cards) cards.innerHTML = CT_COLS.map(function (c, ci) {
      return '<div class="tcard">' +
        '<div class="th" style="background:' + c.color + '"><b>' + c.label + '</b><span>' + c.sub + '</span></div>' +
        '<div class="tb">' + CT_ROWS.map(function (r) {
          return '<div class="kv"><span class="k">' + r.label + '</span><span class="v">' + r.cells[ci] + '</span></div>';
        }).join("") + '</div>' +
      '</div>';
    }).join("");
    if (table) table.innerHTML = '<table>' +
      '<thead><tr><th class="k">구분</th>' +
        CT_COLS.map(function (c) { return '<th style="background:' + c.color + '">' + c.label + '<small>' + c.sub + '</small></th>'; }).join("") +
      '</tr></thead>' +
      '<tbody>' +
        CT_ROWS.map(function (r) {
          return '<tr><td class="k">' + r.label + '</td>' + r.cells.map(function (cell) { return '<td>' + cell + '</td>'; }).join("") + '</tr>';
        }).join("") +
      '</tbody>' +
    '</table>';
  }

  /* 세대 카드(라디오) + 심층 패널 — 인스턴스별 sel 상태. 초기 5세대(index 4), 공개본 let sel=4 정합. */
  function wire(root) {
    var gensEl = root.querySelector("#gens"), deepEl = root.querySelector("#deep");
    if (!gensEl || !deepEl) return;
    var sel = 4;

    function drawGens() {
      gensEl.innerHTML = GENS.map(function (g, i) {
        return '<div class="gen' + (i === sel ? " on" : "") + '" data-i="' + i + '" style="--bar:' + g.c + '">' +
          '<div class="no">' + g.no + '</div>' +
          '<div class="yr">' + g.yr + '</div>' +
          '<div class="hl">' + g.hl + '</div>' +
          '<div class="sub">' + g.sub + '</div>' +
          '<div class="cl">클릭 ▾</div>' +
        '</div>';
      }).join("");
      var cards = gensEl.querySelectorAll(".gen");
      for (var i = 0; i < cards.length; i++) {
        (function (el) {
          el.addEventListener('click', function () { sel = +el.getAttribute('data-i'); drawGens(); drawDeep(); });
        })(cards[i]);
      }
    }
    function drawDeep() {
      var g = GENS[sel];
      deepEl.innerHTML = '<div class="deep" style="--pc:' + g.c + ';--pcs:' + g.cs + '">' +
        '<div class="dh"><span class="sq"></span><h3>' + g.no + ' 심층</h3><span class="bd">' + g.yr + '</span></div>' +
        '<p class="dsum">' + g.sum + '</p>' +
        '<div class="dgrid">' +
          g.cards.map(function (c) {
            return '<div class="dc' + (c.hi ? " hi" : "") + '"><h4><span class="d"></span>' + c.t + '</h4><p>' + c.b + '</p></div>';
          }).join("") +
        '</div>' +
      '</div>';
    }
    drawGens();
    drawDeep();
  }

  /* 우측 레일 — 공개본 #v3side(side.innerHTML) 와 동일 스캐폴딩. 목차 앵커 = h2.sec, 관련 제외 = cancer-treatment. */
  function _railEsc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function renderRailInto(railEl, opts) {
    opts = opts || {};
    var body = opts.body;
    if (!railEl || !body) return;

    var secs = [].slice.call(body.querySelectorAll('h2.sec'));
    secs.forEach(function (h, i) { if (!h.id) h.id = 'v3sec-' + i; });
    var toc = secs.map(function (h) {
      return '<a href="#' + h.id + '" data-t="' + h.id + '">' + h.textContent.trim() + '</a>';
    }).join('');

    var relItems = '';
    if (typeof window.knowledgeVisibleDocs === 'function') {
      relItems = window.knowledgeVisibleDocs({ excludeId: 'cancer-treatment' }).map(function (d) {
        return '<a href="' + _railEsc(d.url) + '"><b>' + _railEsc(d.label) + '</b><span>' + _railEsc(d.description) + '</span></a>';
      }).join('');
    }

    railEl.innerHTML =
      '<div class="blk"><div class="lb">목차</div><nav class="toc">' + toc + '</nav></div>' +
      '<div class="blk"><div class="lb">이 자료 활용</div><div class="act">' +
        '<button type="button" id="v3print"><span class="i">📄</span><span class="t">PDF로 저장</span></button>' +
        '<button type="button" id="v3copy"><span class="i">🔗</span><span class="t">링크 복사</span></button>' +
      '</div></div>' +
      '<div class="blk"><div class="lb">함께 보면 좋은 자료</div><div class="rel">' + relItems + '</div></div>';

    var tocLinks = [].slice.call(railEl.querySelectorAll('.toc a'));
    tocLinks.forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var t = body.querySelector('#' + a.getAttribute('data-t'));
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    var links = {};
    tocLinks.forEach(function (a) { links[a.getAttribute('data-t')] = a; });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (ents) {
        ents.forEach(function (en) {
          if (en.isIntersecting) {
            Object.keys(links).forEach(function (k) { links[k].classList.remove('on'); });
            var cur = links[en.target.id]; if (cur) cur.classList.add('on');
          }
        });
      }, { rootMargin: '0px 0px -70% 0px', threshold: 0 });
      secs.forEach(function (h) { io.observe(h); });
    }
    var pb = railEl.querySelector('#v3print');
    if (pb) pb.addEventListener('click', function () { window.print(); });
    var cb = railEl.querySelector('#v3copy');
    if (cb) cb.addEventListener('click', function () {
      var url; try { url = location.href; } catch (e) { url = ''; }
      var lab = this.querySelector('.t') || this, orig = lab.textContent;
      function done(ok) { lab.textContent = ok ? '복사됨' : '복사 실패'; setTimeout(function () { lab.textContent = orig; }, 1400); }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
        } else { done(false); }
      } catch (e) { done(false); }
    });
  }

  function renderInto(rootEl) {
    if (!rootEl) return;
    rootEl.classList.add('cancer-history');
    rootEl.innerHTML = BODY_HTML;
    drawCmp(rootEl);
    wire(rootEl);
  }

  window.CancerTreatment = {
    renderInto: renderInto,
    renderRailInto: renderRailInto,
    CT_COLS: CT_COLS,
    CT_ROWS: CT_ROWS,
    GENS: GENS
  };
})();
