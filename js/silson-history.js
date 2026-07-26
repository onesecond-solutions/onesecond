/* js/silson-history.js — 실손(의료실비) 세대별 변천사 "본문"의 단일 원천 공용 모듈
   ────────────────────────────────────────────────────────────────────────────
   목적(대표 확정 2026-07-26): 로그인 전 공개 문서(insurance/silson-history/index.html)와
   로그인 후 SPA D영역이 "같은 데이터·같은 렌더러"를 쓰게 한다. 본문 마크업을 app.html에
   복사해 두 벌 만들지 않는다 — 이 모듈 하나가 유일 원천.

   제공 API:
     window.SilsonHistory.renderInto(rootEl)
       주어진 컨테이너(rootEl)에 실손 본문(비교표 + 설명 + 세대 카드 + 세대별 심층 패널 + 출처)을
       그리고, 세대 카드 펼침/접힘 이벤트를 바인딩한다. 초기 진입 = 5세대 펼침(스크롤 X).
       rootEl 하위로 스코프하여 조회/바인딩하므로 정적 페이지·SPA D영역 어디서든 동작.

   설계 원칙:
   - 데이터(SL_COLS/SL_ROWS/세대 카드/패널)는 이 파일에만 존재. 화면(정적·SPA)은 renderInto만 호출.
   - 마크업은 기존 정적 공개본(insurance/silson-history/index.html)의 본문과 텍스트·구조 동일하게 생성
     (렌더 결과 동일 = 최우선). 세대 카드의 펼침은 인라인 onclick 대신 addEventListener로 바인딩
     (onclick 속성은 화면 픽셀·텍스트에 영향 없음 → 렌더 동일 유지, 대신 모듈 자체완결).
   - 본문 전용 스타일은 css/silson-history.css(.silson-history 루트 스코프). 토큰도 그 안에서 공급
     하므로 SPA(app.html)의 전역 토큰을 오염시키지 않는다. */

(function () {
  'use strict';

  /* ══ 메인 비교표 데이터 — 한 벌 → 모바일 카드(세대 전치) + PC 표 이중 렌더 ══ */
  var SL_COLS = [
    { label: "1세대", sub: "~2009.9", color: "var(--indigo)" },
    { label: "2세대", sub: "2009.10~2017.3", color: "var(--indigo)" },
    { label: "3세대", sub: "2017.4~2021.6", color: "var(--indigo)" },
    { label: "4세대", sub: "2021.7~2026.5", color: "var(--indigo)" },
    { label: "5세대", sub: "2026.5.6~", color: "var(--g5)" }
  ];
  var SL_ROWS = [
    { label: "재가입 주기", cells: [
      { html: '<span class="gr">없음</span><br><small>80~100세</small>' },
      { html: '초기 없음<br><span class="hl">\'13.4~ 15년 재가입</span>' },
      { html: '15년 재가입' }, { html: '5년 재가입' }, { html: '5년 재가입' }] },
    { label: "갱신 주기", cells: [
      { html: '3년 또는 5년' }, { html: '1년 또는 3년' }, { html: '1년' }, { html: '1년' }, { html: '1년' }] },
    { label: "입원 자기부담", cells: [
      { html: '<span class="gr">없음(100%)</span><br><small>생보 가입 20%</small>' },
      { html: '표준형 20%<br>선택형 10%' },
      { html: '급여 10~20%<br>비급여 20%<br><small>3대비급여 30%</small>' },
      { html: '<span class="hl">급여 20%</span><br><span class="hl">비급여 30%</span>' },
      { html: '급여 20%<br>중증 30%/비중증 50%' }] },
    { label: "통원 공제금액", cells: [
      { html: '없음<br><small>5~10만</small>' },
      { html: '의원 1만<br>병원 1.5만<br>종합·상급 2만' },
      { html: '의원 1만·병원 1.5만<br>종합·상급 2만<br><small>3대비급여 별도</small>' },
      { html: '급여: 1만·2만<br>비급여: 3만<br><small>또는 20~30% 큰금액</small>' },
      { html: '급여 20%(1·2만)<br>중증 30%/비중증 50%' }] },
    { label: "통원 한도(1일)", cells: [
      { html: '25만' }, { html: '25만' },
      { html: '급여+비급여 30만<br><small>3대비급여 별도</small>' },
      { html: '급여 20만·비급여 20만<br><small>별도</small>' },
      { html: '비중증 20만<br><small>합산 한도</small>' }] },
    { label: "입원 한도(연간)", cells: [
      { html: '5천만~1억' }, { html: '5천만' }, { html: '5천만' }, { html: '5천만' },
      { html: '중증 5천만<br>비중증 <span class="o">1천만</span>' }] },
    { label: "비급여 구조", cells: [
      { html: '<span class="gr">급여+비급여<br>통합 보장</span>' },
      { html: '급여+비급여<br>통합 보장' },
      { html: '도수·주사·MRI<br><span class="hl">3대 비급여 분리</span>' },
      { html: '비급여 전체<br><span class="hl">특약 분리</span><br><small>할인·할증</small>' },
      { html: '중증·비중증 차등<br><span class="o">비중증 축소</span>' }] },
    { label: "보험료 할증", cells: [
      { html: '없음' }, { html: '없음' }, { html: '없음' },
      { html: '비급여 청구액<br>100만↑ <span class="hl">최대 300%</span>' },
      { html: '비급여 차등<br>강화' }] },
    { label: "한 줄 정리", core: 1, cells: [
      { html: '자기부담 없는<br>최강 보장' },
      { html: '표준약관 통일<br>본인부담 시작' },
      { html: '도수·주사·MRI<br>따로 떼어냄' },
      { html: '싼 대신 비급여<br>쓸수록 할증' },
      { html: '큰 병 두껍게<br>가벼운 건 얇게', cls: 'o' }] }
  ];

  /* 본문 마크업(비교표 컨테이너 + 설명 + 세대 카드 + 5개 심층 패널 + 출처).
     ⚠️ 정적 공개본(insurance/silson-history/index.html)의 .doc-body 내부와 텍스트·구조 동일.
     #cmpCards/#cmpTable 는 빈 컨테이너로 두고 drawSlCmp 가 채운다(기존과 동일). 세대 카드는
     인라인 onclick 없이 data-g 로만 두고 renderInto 가 클릭을 바인딩한다(렌더 결과 무변). */
  var BODY_HTML =
    /* ① 상세 변천사 표 (항상 고정) — 모바일: 카드 / PC: 표. 같은 데이터에서 자동 생성 */
    '<div class="section-t">📈 실손보험 세대별 변천사</div>' +
    '<div id="cmpCards"></div>' +
    '<div id="cmpTable"></div>' +

    /* ② 설명 */
    '<div class="desc">' +
      '실손보험은 <b>가입 시기</b>에 따라 1~5세대로 나뉘며, 세대마다 자기부담률·재가입 조건·비급여 보장 구조가 완전히 다릅니다. ' +
      '큰 흐름은 <b>"보장은 넓지만 비싼 옛 세대 → 보험료는 싸지만 자기부담이 큰 새 세대"</b>로 이동해 왔습니다. ' +
      '특히 <b>2013년 4월</b>(2세대 재가입 분기)과 <b>2026년 5월 6일</b>(5세대 출시·4세대 종료)이 결정적 분기점입니다. ' +
      '아래 세대 카드를 눌러 각 세대의 자기부담·보장 특징을 확인하세요.' +
    '</div>' +

    /* ③ 세대별 카드 (클릭 확장) */
    '<div class="section-t">🗂 세대별 심층</div>' +
    '<div class="hint">👆 세대 카드를 클릭하면 해당 세대의 심층 정보가 펼쳐집니다</div>' +
    '<div class="gens">' +
      '<div class="gen g1" data-g="1"><div class="n">1세대</div><div class="p">~2009.9</div>' +
        '<div class="k">돈 거의 안 냄<small>보장 가장 두꺼움</small></div><div class="arw">클릭 ▾</div></div>' +
      '<div class="gen g2" data-g="2"><div class="n">2세대</div><div class="p">2009.10~2017.3</div>' +
        '<div class="k">약관 통일<small>\'13.4~ 15년 재가입</small></div><div class="arw">클릭 ▾</div></div>' +
      '<div class="gen g3" data-g="3"><div class="n">3세대</div><div class="p">2017.4~2021.6</div>' +
        '<div class="k">착한실손<small>비급여 3종 분리</small></div><div class="arw">클릭 ▾</div></div>' +
      '<div class="gen g4" data-g="4"><div class="n">4세대</div><div class="p">2021.7~2026.5</div>' +
        '<div class="k">보험료 가장 쌈<small>쓴 만큼 할증</small></div><div class="arw">클릭 ▾</div></div>' +
      '<div class="gen g5" data-g="5"><div class="n">5세대</div><div class="p">2026.5.6~</div>' +
        '<div class="k">중증·비중증 나눔<small>가벼운 비급여 축소</small></div><div class="arw">클릭 ▾</div></div>' +
    '</div>' +

    /* 1세대 */
    '<div class="panel p1" id="pan1">' +
      '<h2>🟦 1세대 실손 <span class="badge">~2009.9 · 구실손</span></h2>' +
      '<p class="lead">자기부담이 거의 없어 보장이 가장 강력합니다. 보험료가 비싸도 보장 범위가 가장 넓은 세대입니다.</p>' +
      '<div class="d-grid">' +
        '<div class="d-card"><div class="dt">🗓 가입·재가입</div><div class="dd">~2009년 9월 · <b>재가입 없음</b>(80~100세 유지) · 갱신 3~5년</div></div>' +
        '<div class="d-card"><div class="dt">💵 자기부담</div><div class="dd"><b>없음(100% 보장)</b> · 생보사 가입분은 20%</div></div>' +
        '<div class="d-card"><div class="dt">🩹 보장 구조</div><div class="dd">급여+비급여 <b>통합 보장</b> · 통원 공제 5~10만</div></div>' +
      '</div>' +
    '</div>' +

    /* 2세대 */
    '<div class="panel p2" id="pan2">' +
      '<h2>🟩 2세대 실손 <span class="badge">2009.10~2017.3 · 표준화실손</span></h2>' +
      '<p class="lead">표준약관이 통일된 세대. <b>2013년 4월 1일</b>을 기준으로 초기·후기가 갈립니다.</p>' +
      '<div class="d-grid">' +
        '<div class="d-card"><div class="dt">🗓 재가입 분기</div><div class="dd">초기(~2013.3): <b>재가입 없음</b>, 100세 유지<br>후기(2013.4~): <b class="h">15년 재가입</b></div></div>' +
        '<div class="d-card"><div class="dt">💵 자기부담</div><div class="dd">표준형 <b>20%</b> / 선택형 <b>10%</b> · 갱신 1~3년</div></div>' +
        '<div class="d-card"><div class="dt">🩹 보장 구조</div><div class="dd">급여+비급여 통합 · 통원 공제 의원 1만·병원 1.5만·종합/상급 2만</div></div>' +
      '</div>' +
      '<div class="note">⚠️<div>2세대는 <b>가입 시점이 2013.4 이전인지 이후인지</b>가 재가입 여부를 가릅니다. 증권으로 정확한 가입일을 먼저 확인하세요.</div></div>' +
    '</div>' +

    /* 3세대 */
    '<div class="panel p3" id="pan3">' +
      '<h2>🟪 3세대 실손 <span class="badge">2017.4~2021.6 · 착한실손</span></h2>' +
      '<p class="lead">손해율 높은 3대 비급여(도수·주사·MRI)를 <b>특약으로 분리</b>해 보험료를 낮춘 세대입니다.</p>' +
      '<div class="d-grid">' +
        '<div class="d-card"><div class="dt">🗓 재가입·갱신</div><div class="dd"><b>15년 재가입</b> · 1년 갱신</div></div>' +
        '<div class="d-card"><div class="dt">💵 자기부담</div><div class="dd">급여 10~20% · 비급여 20% · <b>3대비급여 특약 30%</b></div></div>' +
        '<div class="d-card"><div class="dt">🩹 보장 구조</div><div class="dd">도수·비급여주사·MRI <b class="h">3대 비급여 특약 분리</b> · 통원 합산 30만(3대비급여 별도)</div></div>' +
      '</div>' +
    '</div>' +

    /* 4세대 */
    '<div class="panel p4" id="pan4">' +
      '<h2>🟦 4세대 실손 <span class="badge">2021.7~2026.5</span></h2>' +
      '<p class="lead">비급여 전체를 특약으로 분리하고 <b>비급여 할증</b>을 도입해 보험료를 최저로 낮춘 세대입니다.</p>' +
      '<div class="d-grid">' +
        '<div class="d-card"><div class="dt">🗓 재가입·갱신</div><div class="dd"><b>5년 재가입</b> · 1년 갱신 · 2026.5.6 신규가입 종료</div></div>' +
        '<div class="d-card"><div class="dt">💵 자기부담</div><div class="dd">급여 <b>20%</b> · 비급여 <b>30%</b></div></div>' +
        '<div class="d-card"><div class="dt">⚡ 비급여 할증</div><div class="dd">비급여 청구액 100만↑ 시 다음 해 <b class="h">최대 300% 할증</b> · 무사고 시 할인</div></div>' +
      '</div>' +
    '</div>' +

    /* 5세대 심층 */
    '<div class="panel p5" id="pan5">' +
      '<h2>🟧 5세대 실손 심층 <span class="badge">2026.5.6 출시</span></h2>' +
      '<p class="lead">비급여를 <b>중증·비중증으로 분리</b>한 것이 핵심. 보험료는 낮아졌지만 자주 쓰는 비급여의 자기부담이 크게 올랐습니다.</p>' +
      '<div class="d-grid">' +
        '<div class="d-card"><div class="dt">💰 보험료</div><div class="dd">4세대 대비 약 <b>30%</b>, 1·2세대 대비 <b>50%+</b> 저렴. 기본+중증특약1만 시 4세대의 약 50%.</div></div>' +
        '<div class="d-card"><div class="dt">🩺 급여 자기부담</div><div class="dd">입원 <b>20% 유지</b> · 통원은 건보 본인부담률 연동(최소 20%)</div></div>' +
        '<div class="d-card sev"><div class="dt">🟦 중증 비급여(특약1)</div><div class="dd">암·뇌혈관·심장·희귀난치성. 자기부담 <b>30% 유지</b>·한도 5천만 · <b class="h">연 자기부담 상한 500만 신설</b></div></div>' +
        '<div class="d-card mild"><div class="dt">🟨 비중증 비급여(특약2)</div><div class="dd">도수·체외충격파·주사·MRI. 30%→<b class="o">50%</b> · 한도 5천만→<b class="o">1천만</b> · 통원 1일 최대 20만 · 일부 <b class="o">면책</b></div></div>' +
        '<div class="d-card"><div class="dt">🍼 신규 보장</div><div class="dd">기존에 없던 <b>임신·출산·발달장애 급여 의료비</b> 신규 보장</div></div>' +
        '<div class="d-card"><div class="dt">🔄 갱신·할증</div><div class="dd">1년 갱신·5년 재가입 · 비급여 사용량 따라 갱신료 <b>2~4배</b> 상승 가능</div></div>' +
      '</div>' +

      '<div class="h3">📋 4세대 vs 5세대 비급여 한눈 비교</div>' +
      '<div class="tbl-wrap"><table>' +
        '<thead><tr><th style="background:#334155">구분</th><th>4세대</th><th class="g5">5세대 중증</th><th class="g5" style="background:#C2410C">5세대 비중증</th></tr></thead>' +
        '<tbody>' +
          '<tr><th>자기부담률</th><td>일괄 30%</td><td><span class="hl">30% 유지</span></td><td><span class="o">50% 상향</span></td></tr>' +
          '<tr><th>연간 한도</th><td>5,000만</td><td>5,000만</td><td><span class="o">1,000만</span></td></tr>' +
          '<tr><th>자기부담 상한</th><td>없음</td><td><span class="hl">연 500만</span></td><td>없음</td></tr>' +
          '<tr><th>도수·주사·MRI</th><td>특약 보장</td><td>중증 30%</td><td><span class="o">50%/면책</span></td></tr>' +
          '<tr class="core"><th>한 줄 정리</th><td>비급여 한 묶음</td><td>큰 병 부담 완화</td><td class="o">가벼운 치료 절제</td></tr>' +
        '</tbody>' +
      '</table></div>' +

      '<div class="h3">🔀 1·2세대 전환·유지 제도 (2026.11 시행)</div>' +
      '<div class="d-grid">' +
        '<div class="d-card"><div class="dt">선택형 할인 특약 <span class="tag">유지</span></div><div class="dd">기존 <b>유지</b>하며 근골격계 물리치료·체외충격파·주사·MRI 등 일부 제외 후 할인. 1세대 약 <b>40%</b>, 2세대 약 <b>30%</b>.</div></div>' +
        '<div class="d-card"><div class="dt">계약전환 할인 <span class="tag">전환</span></div><div class="dd">1·2세대→5세대 전환 시 <b>3년간 50% 할인</b>(2026.11부터 6개월 한시)</div></div>' +
        '<div class="d-card"><div class="dt">전환 후 철회 <span class="tag">안전장치</span></div><div class="dd">별도 심사 없이 전환 · <b>6개월 이내 철회</b>(3개월 경과 시 보험금 미청구 계약만)</div></div>' +
      '</div>' +
      '<div class="note">⚠️<div>관리급여(도수·영양제 주사 가격 통제)는 <b>2026년 11월 시행 예정</b>. 세부 수치는 보험사·특약별로 다를 수 있으니 최종 약관으로 확인하세요.</div></div>' +
    '</div>' +

    '<p class="src">출처: 금융감독원·손해보험협회 실손 세대 구분 · 금융위·보건복지부 5세대 개편안 · KB손해보험 GA소식지 2026.07 · 보험연구원 「5세대 실손 상생방안」(2025.12)</p>';

  /* 비교표 렌더(모바일 카드 + PC 표) — rootEl 하위의 #cmpCards/#cmpTable 에 그린다(스코프). */
  function drawCmp(root) {
    var cards = root.querySelector('#cmpCards');
    var table = root.querySelector('#cmpTable');
    if (cards) {
      cards.innerHTML = SL_COLS.map(function (c, ci) {
        return '<div class="tcard">' +
          '<div class="th" style="background:' + c.color + '"><b>' + c.label + '</b><span>' + c.sub + '</span></div>' +
          '<div class="tb">' + SL_ROWS.map(function (r) {
            return '<div class="kv' + (r.core ? ' core' : '') + '"><span class="k">' + r.label + '</span><span class="v">' + r.cells[ci].html + '</span></div>';
          }).join("") + '</div>' +
        '</div>';
      }).join("");
    }
    if (table) {
      table.innerHTML = '<table>' +
        '<thead><tr><th style="background:#334155">구분</th>' +
          SL_COLS.map(function (c) { return '<th style="background:' + c.color + '">' + c.label + '<br><small>' + c.sub + '</small></th>'; }).join("") +
        '</tr></thead>' +
        '<tbody>' +
          SL_ROWS.map(function (r) {
            return '<tr class="' + (r.core ? 'core' : '') + '"><th>' + r.label + '</th>' +
              r.cells.map(function (c) { return '<td class="' + (c.cls || '') + '">' + c.html + '</td>'; }).join("") + '</tr>';
          }).join("") +
        '</tbody>' +
      '</table>';
    }
  }

  /* 세대 카드 펼침/접힘 — rootEl 하위로 스코프. 초기 진입 = 5세대 펼침(스크롤 X, 기존 sel(5,true) 동일). */
  function wire(root) {
    var gens = root.querySelectorAll('.gen');
    var panels = root.querySelectorAll('.panel');

    function sel(g, noScroll) {
      var card = root.querySelector('.gen[data-g="' + g + '"]');
      var panel = root.querySelector('#pan' + g);
      if (!card || !panel) return;
      if (card.getAttribute('data-open') === '1') {
        panel.classList.remove('show');
        card.classList.remove('active');
        card.setAttribute('data-open', '0');
        return;
      }
      for (var i = 0; i < panels.length; i++) panels[i].classList.remove('show');
      for (var j = 0; j < gens.length; j++) { gens[j].classList.remove('active'); gens[j].setAttribute('data-open', '0'); }
      panel.classList.add('show');
      card.classList.add('active');
      card.setAttribute('data-open', '1');
      if (!noScroll) panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    for (var k = 0; k < gens.length; k++) {
      (function (card) {
        card.addEventListener('click', function () { sel(card.getAttribute('data-g')); });
      })(gens[k]);
    }
    sel('5', true);   /* 초기 진입 = 5세대 펼침만(스크롤 X). 클릭 시엔 scrollIntoView 유지 */
  }

  /* ── 공용 진입점 ──────────────────────────────────────────────────────────
     주어진 컨테이너에 본문을 그리고 이벤트를 바인딩한다. rootEl 자체에 .silson-history
     클래스를 부여해 css/silson-history.css(토큰+본문 스타일)가 rootEl 하위로 적용되게 한다. */
  function renderInto(rootEl) {
    if (!rootEl) return;
    rootEl.classList.add('silson-history');
    rootEl.innerHTML = BODY_HTML;
    drawCmp(rootEl);
    wire(rootEl);
  }

  window.SilsonHistory = {
    renderInto: renderInto,
    SL_COLS: SL_COLS,
    SL_ROWS: SL_ROWS
  };
})();
