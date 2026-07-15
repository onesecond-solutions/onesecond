/* ═══════════════════════════════════════════════════════════════════════════
 * 의료실비 보장분석 1축 (#v-cov-medical) — 최소 화면 배선
 * ───────────────────────────────────────────────────────────────────────────
 * 범위(대표 승인): 실비변천사 DB(silson_generations) 재사용(읽기만) → 세대표 +
 *   자가진단(가입일→세대판정) + 판정 결과 표시. 임태성/검수(admin) 게이트 전용.
 * 데이터: window.db.fetch(REST, 서버 RLS 게이트) 성공+행 → DB 렌더 /
 *   실패·0행·타임아웃 → 정적 임베드 폴백(5세대). console.log로 DB/폴백 구분.
 * 금지 준수: 암·뇌/심장·수술비 축 없음. 종합리포트 없음. sales_customers insert 없음.
 *   coverage_* 테이블 의존 없음(silson_generations만 읽음). DDL·seed·RLS write 없음.
 *   pages/silson-generations.html·#v-silson 무접촉(별도 iframe 화면, 본 파일과 무관).
 * lead(상담신청): 데모/비활성 — insert·저장 0. payload 콘솔+화면 표시만.
 * 롤백: 본 파일 삭제 + app.html의 (a)script 태그 (b)#v-cov-medical div
 *   (c)VALID_VIEWS 'cov-medical' (d)showView 게이트·라벨·렌더 호출
 *   (e)_canSeeCoverage 인라인 (f)홈 데스크 카드 push 제거.
 * 최초 작성 2026-07-15 (feat/coverage-medical-min).
 * ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── 진입 게이트 ────────────────────────────────────────────────────────────
   * app.html 인라인에 _canSeeCoverage 를 이미 정의(showView 게이트가 동기 참조).
   * 여기서는 스크립트 단독 로드/직접 호출 방어용 폴백만 둔다(임태성 user_id 또는 admin). */
  if (typeof window._canSeeCoverage !== 'function') {
    window._canSeeCoverage = function () {
      try {
        var u = JSON.parse(localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}');
        return String(u.id || '') === '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd' || String(u.role || '') === 'admin';
      } catch (e) { return false; }
    };
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ── 정적 임베드 폴백 seed (silson_generations 라이브 0행/실패/타임아웃 시) ──
   * 값 출처: db/migrations/2026-07-13_silson_generations_seed.sql 원장 5행(요지).
   * 경계(valid_from/valid_to)는 시드와 동일 — judgeGen 판정을 DB와 일치시킴. */
  var FB = [
    { gen: 1, name: '1세대 실손 (구실손)',        range_label: '~2009.9',        valid_from: null,        valid_to: '2009-09-30', one_liner: '자기부담 거의 없어 보장 최강. 유지 1순위.' },
    { gen: 2, name: '2세대 실손 (표준화실손)',    range_label: '2009.10~2017.3', valid_from: '2009-10-01', valid_to: '2017-03-31', one_liner: '표준화실손. 본인부담 도입. 2013.4 재가입 내부 분기.' },
    { gen: 3, name: '3세대 실손 (착한실손)',      range_label: '2017.4~2021.6',  valid_from: '2017-04-01', valid_to: '2021-06-30', one_liner: '착한실손. 3대 비급여(도수·주사·MRI) 특약 분리.' },
    { gen: 4, name: '4세대 실손',                 range_label: '2021.7~2026.5',  valid_from: '2021-07-01', valid_to: '2026-05-05', one_liner: '비급여 전체 특약 분리 + 비급여 할증 도입. 보험료 최저.' },
    { gen: 5, name: '5세대 실손',                 range_label: '2026.5.6~',      valid_from: '2026-05-06', valid_to: null,        one_liner: '비급여 중증·비중증 차등. 비중증 보장·한도 축소.' }
  ];

  var _rows = null;   /* 렌더·판정에 쓰는 정규화 세대 배열(DB 성공 시 교체, 기본 폴백) */
  var _src = '폴백';  /* 'DB' | '폴백' — 콘솔·배지 표기 */

  /* ── judgeGen(dateStr) — 실손 가입일(YYYY-MM-DD) → 세대 판정 ────────────────
   * valid_from(포함) ≤ date ≤ valid_to(포함). null = 경계 없음(하한/상한 무한).
   * ISO 'YYYY-MM-DD' 문자열은 사전식 비교가 날짜 비교와 동일(안전). */
  function judgeGen(dateStr) {
    var d = String(dateStr || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
    var rows = (_rows && _rows.length) ? _rows : FB;
    for (var i = 0; i < rows.length; i++) {
      var g = rows[i];
      var from = g.valid_from ? String(g.valid_from).slice(0, 10) : null;
      var to = g.valid_to ? String(g.valid_to).slice(0, 10) : null;
      if ((from === null || d >= from) && (to === null || d <= to)) return g;
    }
    return null;
  }
  window.judgeGen = judgeGen;

  /* ── 렌더러 ─────────────────────────────────────────────────────────────── */
  function heroHtml() {
    return '' +
      '<div class="covm-hero">' +
        '<button class="covm-back" type="button" onclick="showView(\'home\')">&#8249; 홈으로</button>' +
        '<div class="covm-badge">보장분석 · 의료실비</div>' +
        '<h1 class="covm-title">내 실손, 몇 세대인가요?</h1>' +
        '<p class="covm-sub">실손은 가입 세대마다 자기부담·보장·재가입 구조가 완전히 다릅니다. ' +
        '가입일만 넣으면 세대를 판정해 드립니다.</p>' +
        '<div class="covm-src covm-src-' + (_src === 'DB' ? 'db' : 'fb') + '">데이터 출처: ' +
        (_src === 'DB' ? '라이브 DB(silson_generations)' : '정적 임베드 폴백(DB 0행/미적용)') + '</div>' +
      '</div>';
  }

  function genTableHtml() {
    var rows = (_rows && _rows.length) ? _rows : FB;
    var body = '';
    for (var i = 0; i < rows.length; i++) {
      var g = rows[i];
      body += '' +
        '<tr>' +
          '<td class="covm-td-gen"><span class="covm-genpill">' + esc(g.gen) + '세대</span></td>' +
          '<td class="covm-td-name">' + esc(g.name) + '</td>' +
          '<td class="covm-td-range">' + esc(g.range_label || '') + '</td>' +
          '<td class="covm-td-one">' + esc(g.one_liner || '') + '</td>' +
        '</tr>';
    }
    return '' +
      '<section class="covm-card">' +
        '<h2 class="covm-h2">실손 세대별 변천사 (1~5세대)</h2>' +
        '<div class="covm-tablewrap">' +
          '<table class="covm-table">' +
            '<thead><tr><th>세대</th><th>구분</th><th>가입기간</th><th>한 줄 정리</th></tr></thead>' +
            '<tbody>' + body + '</tbody>' +
          '</table>' +
        '</div>' +
      '</section>';
  }

  function quizHtml() {
    return '' +
      '<section class="covm-card">' +
        '<h2 class="covm-h2">자가진단 — 내 실손은 몇 세대?</h2>' +
        '<p class="covm-quiz-guide">실손보험 <b>가입일(청약일)</b>을 선택하면 세대를 판정합니다.</p>' +
        '<div class="covm-quiz-row">' +
          '<input type="date" id="covm-date" class="covm-date" min="1999-01-01" max="2035-12-31" aria-label="실손 가입일">' +
          '<button type="button" class="covm-judge-btn" onclick="window._covMedicalJudge()">세대 판정</button>' +
        '</div>' +
        '<div id="covm-result" class="covm-result" aria-live="polite"></div>' +
      '</section>';
  }

  function leadHtml() {
    return '' +
      '<section class="covm-card covm-lead">' +
        '<h2 class="covm-h2">상담 신청 <span class="covm-demo-tag">데모 · 저장 안 함</span></h2>' +
        '<p class="covm-lead-note">아래 버튼은 <b>데모(비활성)</b>입니다. 실제 상담 저장(insert)은 ' +
        '대표 승인·DB 배선 후 별도로 연결됩니다. 지금은 payload만 콘솔·화면에 표시합니다.</p>' +
        '<button type="button" class="covm-lead-btn" onclick="window._covMedicalLead()">상담 신청 payload 미리보기(데모)</button>' +
        '<div id="covm-lead-out"></div>' +
      '</section>';
  }

  function render() {
    var host = document.getElementById('v-cov-medical');
    if (!host) return;
    host.innerHTML =
      '<div class="covm-page">' +
        heroHtml() +
        genTableHtml() +
        quizHtml() +
        leadHtml() +
      '</div>';
  }

  /* 판정 버튼 핸들러 — 가입일 input → judgeGen → 결과 카드 */
  window._covMedicalJudge = function () {
    var inp = document.getElementById('covm-date');
    var slot = document.getElementById('covm-result');
    if (!inp || !slot) return;
    var v = inp.value;
    if (!v) {
      slot.innerHTML = '<div class="covm-result-warn">가입일을 먼저 선택해 주세요.</div>';
      return;
    }
    var g = judgeGen(v);
    if (!g) {
      slot.innerHTML = '<div class="covm-result-warn">해당 날짜의 세대를 판정할 수 없습니다. 날짜를 확인해 주세요.</div>';
      return;
    }
    console.log('[cov-medical] judgeGen(' + v + ') → ' + g.gen + '세대 (' + _src + ' 데이터)');
    slot.innerHTML = '' +
      '<div class="covm-result-card">' +
        '<div class="covm-result-head">' +
          '<span class="covm-result-genpill">' + esc(g.gen) + '세대</span>' +
          '<span class="covm-result-name">' + esc(g.name) + '</span>' +
        '</div>' +
        '<div class="covm-result-range">가입기간: ' + esc(g.range_label || '') + '</div>' +
        '<p class="covm-result-one">' + esc(g.one_liner || '') + '</p>' +
        '<div class="covm-result-foot">가입일 ' + esc(v) + ' 기준 판정입니다. 유지 vs 전환은 세대별 자기부담·재가입·비급여 구조가 달라 상담으로 점검이 필요합니다.</div>' +
      '</div>';
  };

  /* 상담신청 = payload 생성까지만(insert 비활성·데모). 저장·전송 0. */
  window._covMedicalLead = function () {
    var inp = document.getElementById('covm-date');
    var v = inp ? inp.value : null;
    var g = v ? judgeGen(v) : null;
    var payload = {
      event_name: 'coverage_medical_plan_request',
      lead_source: 'medical_interactive_page',
      category: 'medical',
      consultation_type: '보장분석',
      judged_gen: g ? g.gen : null,
      join_date: v || null,
      name: null, phone: null,       /* 개인정보 미수집(데모) */
      consent_at: null,
      _demo_notice: 'insert 비활성(데모). 대표 승인·DB 배선 후 별도 연결.'
    };
    console.log('[cov-medical] lead payload (DEMO · insert 비활성):', payload);
    var out = document.getElementById('covm-lead-out');
    if (out) {
      out.innerHTML = '<pre class="covm-lead-pre">' + esc(JSON.stringify(payload, null, 2)) + '</pre>' +
        '<div class="covm-lead-note2">저장 안 함(데모). 실제 상담 저장은 대표 승인 후 연결됩니다.</div>';
    }
  };

  /* ── 진입점: showView('cov-medical') 에서 호출 ───────────────────────────── */
  window._covMedicalShow = function () {
    if (typeof window._canSeeCoverage === 'function' && !window._canSeeCoverage()) {
      /* 이중 가드 — showView 게이트 외 직접 호출 방어 */
      if (typeof showView === 'function') showView('home');
      return;
    }
    injectStyleOnce();
    /* 기본은 폴백으로 즉시 렌더(빈 화면 방지) → DB 성공 시 재렌더 */
    _rows = FB.slice(); _src = '폴백';
    render();
    fetchLive();
  };

  function fetchLive() {
    if (!(window.db && typeof window.db.fetch === 'function')) {
      console.log('[cov-medical] window.db.fetch 없음 → 폴백 렌더');
      return;
    }
    var done = false;
    var timer = setTimeout(function () {
      if (done) return;
      done = true;
      console.log('[cov-medical] 타임아웃 → 폴백 렌더');
    }, 6000);
    window.db.fetch('/rest/v1/silson_generations?select=gen,name,range_label,valid_from,valid_to,one_liner&order=sort_order')
      .then(function (res) { return res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status)); })
      .then(function (data) {
        if (done) return;
        done = true; clearTimeout(timer);
        if (Array.isArray(data) && data.length) {
          _rows = data.slice().sort(function (a, b) { return (a.gen || 0) - (b.gen || 0); });
          _src = 'DB';
          console.log('[cov-medical] DB 렌더 — silson_generations ' + data.length + '행');
          render();
        } else {
          console.log('[cov-medical] 라이브 0행(RLS reviewing/anon) → 폴백 렌더');
        }
      })
      .catch(function (e) {
        if (done) return;
        done = true; clearTimeout(timer);
        console.log('[cov-medical] 라이브 조회 실패 → 폴백 렌더:', String(e));
      });
  }

  /* ── 스코프 스타일(1회 주입) — 토큰 var 사용, --radius-sm 이상(직각 금지) ── */
  function injectStyleOnce() {
    if (document.getElementById('covm-style')) return;
    var st = document.createElement('style');
    st.id = 'covm-style';
    st.textContent = [
      '#v-cov-medical{overflow-y:auto;}',
      '.covm-page{max-width:860px;margin:0 auto;padding:clamp(16px,3vw,28px) clamp(14px,3vw,24px) 64px;color:var(--tp,#1a1a1a);}',
      '.covm-hero{position:relative;margin-bottom:20px;}',
      '.covm-back{background:transparent;border:0;color:var(--ts,#666);font-size:14px;cursor:pointer;padding:6px 0;margin-bottom:8px;}',
      '.covm-badge{display:inline-block;font-size:12px;font-weight:700;color:var(--ac,#3b6ef5);background:color-mix(in srgb,var(--ac,#3b6ef5) 12%,transparent);padding:5px 12px;border-radius:var(--radius-full,9999px);margin-bottom:12px;}',
      '.covm-title{font-size:clamp(22px,4vw,30px);font-weight:800;margin:0 0 8px;line-height:1.25;}',
      '.covm-sub{font-size:15px;color:var(--ts,#555);line-height:1.6;margin:0 0 12px;}',
      '.covm-src{display:inline-block;font-size:12px;padding:4px 10px;border-radius:var(--radius-sm,8px);}',
      '.covm-src-db{color:var(--ok,#1b7a44);background:color-mix(in srgb,var(--ok,#1b7a44) 12%,transparent);}',
      '.covm-src-fb{color:var(--warn,#b3760a);background:color-mix(in srgb,var(--warn,#b3760a) 14%,transparent);}',
      '.covm-card{background:var(--surface,#fff);border:1px solid var(--line,#e6e6e6);border-radius:var(--radius-md,12px);padding:clamp(14px,2.4vw,22px);margin-bottom:18px;}',
      '.covm-h2{font-size:17px;font-weight:800;margin:0 0 14px;}',
      '.covm-tablewrap{overflow-x:auto;}',
      '.covm-table{width:100%;border-collapse:collapse;font-size:14px;min-width:520px;}',
      '.covm-table th{text-align:left;font-size:12px;color:var(--ts,#777);font-weight:700;padding:8px 10px;border-bottom:2px solid var(--line,#e6e6e6);}',
      '.covm-table td{padding:11px 10px;border-bottom:1px solid var(--line,#eee);vertical-align:top;}',
      '.covm-genpill{display:inline-block;font-weight:800;font-size:12px;color:#fff;background:var(--ac,#3b6ef5);border-radius:var(--radius-sm,8px);padding:3px 9px;white-space:nowrap;}',
      '.covm-td-name{font-weight:700;white-space:nowrap;}',
      '.covm-td-range{color:var(--ts,#666);white-space:nowrap;}',
      '.covm-td-one{color:var(--ts,#555);line-height:1.5;}',
      '.covm-quiz-guide{font-size:14px;color:var(--ts,#555);margin:0 0 12px;}',
      '.covm-quiz-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}',
      '.covm-date{font-size:15px;padding:10px 12px;border:1px solid var(--line,#ccc);border-radius:var(--radius-sm,8px);background:var(--surface,#fff);color:inherit;}',
      '.covm-judge-btn{font-size:15px;font-weight:700;color:#fff;background:var(--ac,#3b6ef5);border:0;border-radius:var(--radius-sm,8px);padding:10px 20px;cursor:pointer;}',
      '.covm-judge-btn:hover{filter:brightness(.95);}',
      '.covm-result{margin-top:16px;}',
      '.covm-result-warn{font-size:14px;color:var(--warn,#b3760a);background:color-mix(in srgb,var(--warn,#b3760a) 12%,transparent);padding:12px 14px;border-radius:var(--radius-sm,8px);}',
      '.covm-result-card{border:1px solid var(--ac,#3b6ef5);border-radius:var(--radius-md,12px);padding:16px 18px;background:color-mix(in srgb,var(--ac,#3b6ef5) 5%,transparent);}',
      '.covm-result-head{display:flex;align-items:center;gap:10px;margin-bottom:8px;}',
      '.covm-result-genpill{font-weight:800;font-size:14px;color:#fff;background:var(--ac,#3b6ef5);border-radius:var(--radius-sm,8px);padding:5px 12px;}',
      '.covm-result-name{font-weight:800;font-size:17px;}',
      '.covm-result-range{font-size:13px;color:var(--ts,#666);margin-bottom:8px;}',
      '.covm-result-one{font-size:15px;line-height:1.6;margin:0 0 10px;}',
      '.covm-result-foot{font-size:13px;color:var(--ts,#666);line-height:1.5;border-top:1px dashed var(--line,#ddd);padding-top:10px;}',
      '.covm-lead .covm-demo-tag{font-size:11px;font-weight:700;color:var(--warn,#b3760a);background:color-mix(in srgb,var(--warn,#b3760a) 14%,transparent);border-radius:var(--radius-xs,6px);padding:3px 8px;margin-left:6px;vertical-align:middle;}',
      '.covm-lead-note{font-size:13px;color:var(--ts,#666);line-height:1.6;margin:0 0 12px;}',
      '.covm-lead-btn{font-size:14px;font-weight:700;color:var(--ts,#555);background:var(--surface-2,#f4f4f5);border:1px solid var(--line,#ddd);border-radius:var(--radius-sm,8px);padding:10px 18px;cursor:pointer;}',
      '.covm-lead-pre{margin-top:12px;font-size:12px;background:var(--surface-2,#f7f7f8);border:1px solid var(--line,#eee);border-radius:var(--radius-sm,8px);padding:12px;overflow-x:auto;white-space:pre;}',
      '.covm-lead-note2{font-size:12px;color:var(--ts,#888);margin-top:8px;}'
    ].join('\n');
    document.head.appendChild(st);
  }

})();
