/* js/caregiver-history.js — 대한민국 간병보험 변천사 "본문"의 단일 원천 공용 모듈
   ────────────────────────────────────────────────────────────────────────────
   실손 파일럿과 동일 인터페이스:
     window.CaregiverHistory.renderInto(rootEl)          — 본문(인트로+비교표+타임라인+체크리스트+결론) 렌더
     window.CaregiverHistory.renderRailInto(railEl,{body}) — 우측 레일(목차·이 자료 활용·함께 보면 좋은 자료)

   공개본 insurance/caregiver-history/index.html 의 인라인 데이터·렌더·본문 마크업을 그대로 옮겨,
   로그인 SPA D영역이 공개본과 "같은 데이터·같은 렌더러·같은 본문"을 쓰게 한다. 공개본 HTML은 무접촉.

   구조: 본문 대부분이 정적 마크업(타임라인 .tl). JS 렌더는 #cmpCards/#cmpTable/#chk 3개 컨테이너뿐.
   인터랙션 없음(라디오/토글 없음). 목차 앵커 = h2.sec. */

(function () {
  'use strict';

  /* ══ 비교 데이터 — 한 번만 정의하고 두 가지로 그린다 ══ */
  var COLS = [
    { key: "ltc", label: "장기간병보험", sub: "돌봄 필요 상태 기준", color: "var(--ac)" },
    { key: "sup", label: "간병인 지원형", sub: "보험사가 간병인 지원", color: "var(--p2)" },
    { key: "use", label: "간병인 사용일당형", sub: "실제 사용·증빙 기준", color: "var(--p3)" }
  ];
  var ROWS = [
    { label: "지급 기준", ltc: ["치매 · ADL · 장기요양등급", "돌봄이 필요한 상태"],
                          sup: ["보험사가 간병인 연결·지원", ""],
                          use: ["실제 간병인 사용 + 증빙", ""] },
    { label: "주요 목적", ltc: ["장기 돌봄 · 생활비", ""], sup: ["간병인 수급 지원", ""], use: ["실제 간병비 보완", ""] },
    { label: "현금 지급", ltc: ["상품별 상이", "정액 · 연금"], sup: ["미지원 시 대체 일당 가능", ""], use: ["약정 일당 지급", ""] },
    { label: "갱신", ltc: ["상품별 상이", ""], sup: ["갱신형 비중 높음", ""], use: ["비갱신형 선택 가능", ""] },
    { label: "핵심 확인", ltc: ["등급 · 상태 판정 기준", ""],
                          sup: ["지원 가능 지역 · 대체 지급 조건", ""],
                          use: ["영수증 · 사용시간 · 인정 업체 기준", ""] },
    { label: "주요 위험", ltc: ["판정 기준 미충족", ""], sup: ["간병인 공급 부족", ""], use: ["증빙 누락 · 약관 불일치", ""] }
  ];
  var CHK = [
    ["지급 방식", "간병인을 보험회사가 보내주는지, 현금으로 주는지"],
    ["병원 구분", "일반병원과 요양병원의 보장금액이 같은지"],
    ["사용 시간", "하루 몇 시간 이상 사용해야 전액이 지급되는지"],
    ["가족간병", "가족이 간병한 경우 인정되는지"],
    ["인정 기준", "인정되는 간병업체·플랫폼 기준이 무엇인지"],
    ["180일 이후", "1~180일 이후에도 이어지는 보장이 있는지"],
    ["갱신 조건", "갱신형인지, 갱신주기가 몇 년인지"],
    ["통합서비스", "간호·간병통합서비스 이용 시 별도 일당이 나오는지"]
  ];

  /* 본문 마크업 — 공개본 .doc-body 내부와 텍스트·구조 동일(타임라인 전체 정적).
     #cmpCards/#cmpTable/#chk 는 빈 컨테이너로 두고 drawParts 가 채운다. */
  var BODY_HTML = `
  <div class="intro">
    간병보험은 <b>하나의 상품이 진화한 것이 아니라, 성격이 다른 세 상품군이 각각 발전하며 얽힌 역사</b>입니다.
    공적 장기요양제도와 간호·간병통합서비스가 채우지 못한 병원 간병비 공백을 민영보험이 메우는 과정에서
    지원형과 사용일당형이 분화했고, 현재는 <b>보장 확대와 구조 재조정이 동시에 진행되는 국면</b>입니다.
  </div>

  <h2 class="sec"><span class="sq"></span>간병보험은 한 종류가 아닙니다</h2>

  <div id="cmpCards"></div>
  <div id="cmpTable"></div>

  <div class="caution">
    <b>세 상품군을 하나로 묶어서 보면 안 됩니다.</b> 지급 조건과 실제로 보험금을 받는 과정이 완전히 다릅니다.
    증권에 '간병'이라는 단어가 있다고 해서 같은 담보가 아닙니다.
  </div>

  <h2 class="sec"><span class="sq"></span>어떻게 여기까지 왔나</h2>
  <div class="tl">

    <div class="row">
      <div class="rail"><div class="dot">1</div><div class="line"></div></div>
      <div class="bd">
        <div class="yr">2000년대 초</div>
        <h3>치매 · 일상생활 중심의 장기간병보험</h3>
        <p>민영 간병보험의 초기 형태는 <b>병원 간병인 비용을 주는 상품이 아니었습니다.</b>
        고령이나 질병으로 혼자 식사하기, 옷 입기, 이동하기, 목욕하기, 배변 관리하기가 어려워지거나
        치매 상태가 되었을 때 보험금을 지급하는 구조였습니다.</p>
        <div class="key"><b>이 시기의 지급 기준</b><br>
        "간병인을 썼느냐"가 아니라 <b>"장기간 타인의 돌봄이 필요한 상태가 되었느냐"</b>였습니다.</div>
      </div>
    </div>

    <div class="row">
      <div class="rail"><div class="dot">2</div><div class="line"></div></div>
      <div class="bd">
        <div class="yr">2008년</div>
        <h3>노인장기요양보험 시행</h3>
        <p>국가가 장기요양등급에 따라 시설급여·재가급여 등을 제공하는 공적 돌봄체계가 시작됐습니다.
        이후 민영보험도 장기요양등급 판정, 치매 진단 기준, 매월 간병생활자금처럼 공적 제도와 연결되는 방향으로 바뀌었습니다.</p>
        <div class="key"><b>여기서 공백이 생깁니다</b><br>
        노인장기요양보험은 <b>장기간 돌봄과 생활지원 제도</b>입니다.
        병원에 입원해서 개인 간병인을 하루 단위로 고용하는 비용 전체를 대신 내주는 제도가 아닙니다.<br>
        → 공적 제도가 생겨도 <b>병원 간병비 공백은 그대로 남았습니다.</b></div>
      </div>
    </div>

    <div class="row">
      <div class="rail"><div class="dot">3</div><div class="line"></div></div>
      <div class="bd">
        <div class="yr">2010년대</div>
        <h3>입원일당에서 간병비 목적 담보로</h3>
        <p>이 시기에는 질병·상해 입원일당이 사실상 간병비와 생활비를 보완하는 역할을 했습니다.
        그러나 단순 입원일당은 <b>실제 간병인 사용 여부와 무관하게 입원만 하면 지급</b>되어,
        보험금의 사용 목적이 제한되지 않았습니다.</p>
        <p>시장은 <b>"입원했다 → 일당 지급"</b>에서 <b>"실제로 간병인이 필요했다 → 간병비를 보완"</b>하는
        구조로 이동하기 시작합니다.</p>
      </div>
    </div>

    <div class="row">
      <div class="rail"><div class="dot">4</div><div class="line"></div></div>
      <div class="bd">
        <div class="yr">2010년대 중반</div>
        <h3>간호 · 간병통합서비스 확대</h3>
        <p>보호자나 개인 간병인 대신 병원의 간호·간병 인력이 환자를 돌보는 제도가 전국 단위로 확대됐습니다.
        다만 모든 병원과 병동에서 이용할 수 있는 것은 아니었고, 중증도·병상·지역에 따른 제약이 있었습니다.</p>
        <div class="key"><b>병원마다 부담이 달라집니다</b><br>
        통합서비스 병동에 입원하면 개인 간병비 부담이 줄지만,
        해당 병동을 이용하지 못하면 여전히 개인 간병인을 고용해야 합니다.
        이 공백이 민영 간병보험 수요를 계속 키웠습니다.</div>
      </div>
    </div>

    <div class="row">
      <div class="rail"><div class="dot">5</div><div class="line"></div></div>
      <div class="bd">
        <div class="yr">2010년대 후반 ~</div>
        <h3>지원형과 사용일당형의 분화</h3>
        <p>이 단계부터 지금 흔히 말하는 간병보험 형태가 분명해집니다.
        <b>보험사가 간병인을 보내주는 지원형</b>과 <b>직접 고용하고 비용을 증빙해 받는 사용일당형</b>으로 나뉩니다.</p>
        <p>두 형태는 이름이 비슷하지만 <b>실제로 보험금을 받는 과정이 완전히 다릅니다.</b>
        지원형은 간병인을 구하는 부담이 없는 대신 지역·공급 상황의 영향을 받고,
        사용일당형은 자유롭게 선택할 수 있는 대신 인정되는 간병인과 영수증 기준을 확인해야 합니다.</p>
      </div>
    </div>

    <div class="row">
      <div class="rail"><div class="dot">6</div><div class="line"></div></div>
      <div class="bd">
        <div class="yr">2020년대 초중반</div>
        <h3>보장 조건의 세분화</h3>
        <p>간병비 상승과 고령화로 수요가 커지면서 보장금액과 지급조건이 잘게 나뉘었습니다.</p>
        <div class="grid">
          <div class="gc"><h4><span class="n">1</span>금액 구간 차등</h4>
            <p>실제 사용금액 구간에 따라 지급액을 나누는 구조가 등장했습니다.</p></div>
          <div class="gc"><h4><span class="n">2</span>병원 유형 분리</h4>
            <p>일반병원과 요양병원의 보장금액을 다르게 설계하는 상품이 늘었습니다.</p></div>
          <div class="gc"><h4><span class="n">3</span>사용시간 기준</h4>
            <p>일정 시간 이상 사용해야 1일 전액을 인정하고, 짧으면 일부만 지급하는 약관이 있습니다.</p></div>
          <div class="gc"><h4><span class="n">4</span>가족간병 쟁점</h4>
            <p>정식 고용·매칭, 실제 비용 지급, 증빙 등이 충족돼야 인정될 수 있습니다.</p></div>
        </div>
        <div class="key"><b>"하루 15만원 보장"만 확인하면 부족합니다</b><br>
        몇 시간을 사용해야 하루로 인정되는지, 짧게 쓰면 얼마가 나오는지까지 확인해야 합니다.</div>
      </div>
    </div>

    <div class="row">
      <div class="rail"><div class="dot">7</div></div>
      <div class="bd">
        <div class="yr">2024년 ~ 현재</div>
        <h3>180일 한계 보완과 구조 재조정</h3>
        <p>기존 간병인 사용일당 담보 상당수는 <b>1회 입원당 180일 한도</b>를 두어,
        180일을 넘기면 면책 기간이 생기는 보장 공백이 있었습니다.
        이후 일부 보험사가 <b>1~180일 담보</b>와 <b>181일 이상 담보</b>를 별도로 구성해 장기입원 공백을 보완하기 시작했습니다.</p>

        <div class="stat">
          <div class="big">40.5<span>%</span></div>
          <div class="tx">건강보험심사평가원 요양병원 적정성 평가에서
            <b>181일 이상 장기입원 환자분율은 평균 40.5%</b>로 나타났습니다.
            과거 평가에서 49.1%였던 수치가 낮아졌지만, 여전히 장기입원 비중이 높습니다.
            <span class="src">※ 이 지표는 평가대상 요양병원 입원환자 중 181일 이상 입원한 환자분율이며,
            보험 담보의 실제 청구 대상과 동일한 통계가 아닙니다. 평가 차수와 대상 기간이 다를 수 있습니다.</span></div>
        </div>

        <div class="caution"><b>181일 이상 담보 = 무제한 보장이 아닙니다.</b>
        보장 개시 시점, 1회 입원 한도, 연간 한도, 요양병원 적용 여부, 간병인 사용 증빙 기준을 회사별로 다시 확인해야 합니다.</div>
      </div>
    </div>

  </div>

  <h2 class="sec"><span class="sq" style="background:var(--p3)"></span>국가 간병비 지원은 어떻게 되나요</h2>
  <div class="intro" style="background:var(--p3-s);border-color:transparent;color:var(--p3-d)">
    보건복지부는 <b>2026년 상반기에 의료중심 요양병원을 선정</b>하고,
    <b>2026년 하반기부터 의료필요도가 높은 입원환자를 대상으로 간병 급여화를 추진</b>할 계획이라고 발표했습니다.
    본인부담률은 30% 내외로 추진합니다.
  </div>
  <div class="caution">
    <b>전국 요양병원이 한번에 급여화되는 것이 아닙니다.</b>
    의료중심 요양병원으로 선정된 기관에 입원한, 의료필요도가 높은 환자가 대상입니다.
    또한 세부 방안 수립과 심의 절차가 남아 있어 <b>확정 시행이 아닌 추진 계획</b>입니다.
  </div>
  <div class="tip">
    <b>그래서 지금은 이렇게 봐야 합니다.</b>
    대상 병원이 단계적으로 늘어나므로 당분간 급여화 대상 병원과 비대상 병원이 함께 존재합니다.
    "곧 국가가 해주니 필요 없다"도, "여전히 전부 본인 부담이다"도 모두 정확하지 않습니다.
  </div>

  <h2 class="sec"><span class="sq"></span>내 보험에서 확인할 8가지</h2>
  <div class="chk" id="chk"></div>

  <div class="concl">
    <div class="lb">정리하면</div>
    <p>간병보험은 가입금액보다 <b>지급 방식, 병원 구분, 사용시간, 가족간병 인정, 180일 이후 보장, 갱신조건</b>을
    함께 확인해야 합니다.</p>
    <p style="font-size:14px;font-weight:600;opacity:.92">보장금액이 크다고 무조건 좋은 것이 아닙니다.
    실제로 간병인을 어떻게 구해야 보험금을 받을 수 있는지, 요양병원에서도 같은 금액이 나오는지,
    180일 이후에도 이어지는지를 함께 확인해야 합니다.</p>
    <div class="who">보험전문가 임태성 팀장 · 010-9241-9375</div>
  </div>

  <div class="src">
    출처: 건강보험심사평가원 요양병원 입원급여 적정성 평가 ·
    보건복지부 「의료중심 요양병원 혁신 및 간병 급여화 추진방향」(2025.9 공청회)<br>
    본 자료는 상담 전 참고용이며 특정 상품이나 보험사를 권유하지 않습니다.
  </div>
`;

  /* #cmpCards / #cmpTable / #chk 채우기 — 공개본 인라인 렌더와 동일 템플릿. */
  function drawParts(root) {
    var cardsEl = root.querySelector("#cmpCards"), tableEl = root.querySelector("#cmpTable"), chkEl = root.querySelector("#chk");
    if (cardsEl) cardsEl.innerHTML = COLS.map(function (c) {
      return `
    <div class="tcard">
      <div class="th" style="background:${c.color}">
        <b>${c.label}</b><span>${c.sub}</span>
      </div>
      <div class="tb">
      ${ROWS.map(function (r) {
        var main = r[c.key][0], sub = r[c.key][1];
        return `<div class="kv"><span class="k">${r.label}</span>
          <span class="v">${main}${sub ? `<em>${sub}</em>` : ""}</span></div>`;
      }).join("")}
      </div>
    </div>`;
    }).join("");
    if (tableEl) tableEl.innerHTML = `
    <table>
      <thead><tr><th class="k">구분</th>
      ${COLS.map(function (c) { return `<th style="background:${c.color}">${c.label}<small>${c.sub}</small></th>`; }).join("")}
      </tr></thead>
      <tbody>
      ${ROWS.map(function (r) {
        return `<tr><td class="k">${r.label}</td>
        ${COLS.map(function (c) { var m = r[c.key][0], s = r[c.key][1]; return `<td>${m}${s ? `<em>${s}</em>` : ""}</td>`; }).join("")}
      </tr>`;
      }).join("")}
      </tbody>
    </table>`;
    if (chkEl) chkEl.innerHTML = CHK.map(function (c, i) {
      return `
    <div class="r"><span class="n">${i + 1}</span>
      <span class="tx"><b>${c[0]}</b><span>${c[1]}</span></span></div>`;
    }).join("");
  }

  /* 우측 레일 — 공개본 #v3side 와 동일 스캐폴딩. 목차 앵커 = h2.sec, 관련 제외 = caregiver-history. */
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
      relItems = window.knowledgeVisibleDocs({ excludeId: 'caregiver-history' }).map(function (d) {
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
    rootEl.classList.add('caregiver-history');
    rootEl.innerHTML = BODY_HTML;
    drawParts(rootEl);
  }

  window.CaregiverHistory = {
    renderInto: renderInto,
    renderRailInto: renderRailInto,
    COLS: COLS,
    ROWS: ROWS,
    CHK: CHK
  };
})();
