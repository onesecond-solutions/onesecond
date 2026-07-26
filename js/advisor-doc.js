/* js/advisor-doc.js — WO-6 "설계사 전용 자료 보기" (정적 공개 문서 공용 스크립트)
   ────────────────────────────────────────────────────────────────────────────
   3개 정적 문서(silson-history · cancer-treatment-history · caregiver-history)가
   공통 로드해 재사용(DRY). docId는 각 문서 HTML의 <div id="advdoc-slot" data-doc-id="...">
   에서 읽는다. 이 파일은 문서별 하드코딩이 전혀 없다.

   설계 원칙(작업지시서 WO-6):
   ① 게이트(파일럿): localStorage 'os_user'.id === 임태성 실장 || role === 'admin' 이고
      window.db.getToken()(로그인) 이 있을 때만 "권한자". 비로그인/무권한이면 조기 return →
      버튼 DOM 자체를 만들지 않는다(CSS display:none 숨김 아님. 비로그인 소스에 버튼 흔적 0).
   ② 전용 콘텐츠는 DB(advisor_doc_contents)에서만 fetch. 정적/JS 하드코딩 금지.
      status='published' 만 조회. RLS가 서버 최종 보호, 본 게이트는 "표시 통제"용.
   ③ 결과 0건이면 버튼 미생성(전용 콘텐츠 없는 문서엔 버튼 안 뜬다). 현재 시드 전 = 0건이 정상.
   ④ body는 escape 처리(XSS 방지). knowledge-category.js _kcEsc 패턴 재사용.
   ⑤ 전역 누출 0: 모든 클래스는 .advdoc-* 프리픽스. 전역 등록은 window.advisorDocInit 하나뿐. */

(function () {
  'use strict';

  /* 파일럿 = 임태성 실장 user_id (작업지시서 게이트 스펙) */
  var PILOT_ID = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';

  /* XSS escape — knowledge-category.js _kcEsc 와 동일 패턴(있으면 전역 _escHtml 재사용) */
  function esc(s) {
    if (typeof window._escHtml === 'function') return window._escHtml(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* escape 후 개행만 <br>로 살려 본문 가독성 유지(escape 뒤라 안전) */
  function bodyHtml(body) {
    return esc(body).replace(/\r\n|\r|\n/g, '<br>');
  }

  /* 게이트 판정: 로그인 토큰 존재 + (파일럿 id || admin). 하나라도 아니면 false → 조기 return */
  function isAuthorized() {
    if (!(window.db && typeof window.db.getToken === 'function' && window.db.getToken())) return false;
    var raw = null;
    try { raw = localStorage.getItem('os_user'); } catch (e) { return false; }
    if (!raw) return false;
    var u = null;
    try { u = JSON.parse(raw); } catch (e) { return false; }
    if (!u || typeof u !== 'object') return false;
    return (u.id === PILOT_ID) || (u.role === 'admin');
  }

  /* CSS 1회 주입(.advdoc-* 네임스페이스). 페이지 자체 변수(--card/--line/--ink/--indigo/--radius)를
     참조하되 없을 때 대비 fallback 지정. 직각 모서리 금지(최소 radius), 모바일 대응. */
  function injectCss() {
    if (document.getElementById('advdoc-style')) return;
    var css =
      '.advdoc-wrap{max-width:710px;margin:1.5rem auto 0;padding:0 0 .5rem;font-family:inherit;}' +
      '.advdoc-btn{display:flex;align-items:center;gap:.5rem;width:100%;justify-content:center;' +
      'background:var(--indigo,#6366F1);color:#fff;border:0;border-radius:var(--radius,.75rem);' +
      'padding:.85rem 1.1rem;font-size:.95rem;font-weight:700;cursor:pointer;font-family:inherit;' +
      'box-shadow:0 2px 8px rgba(99,102,241,.25);transition:filter .15s,transform .05s;}' +
      '.advdoc-btn:hover{filter:brightness(1.05);}' +
      '.advdoc-btn:active{transform:translateY(1px);}' +
      '.advdoc-btn.is-open{background:var(--indigo-d,#4F46E5);}' +
      '.advdoc-btn-ic{font-size:1rem;line-height:1;}' +
      '.advdoc-btn-cnt{background:rgba(255,255,255,.25);border-radius:1rem;font-size:.78rem;' +
      'font-weight:700;padding:.05rem .5rem;min-width:1.2rem;text-align:center;}' +
      '.advdoc-panel{margin-top:.75rem;background:var(--indigo-l,#EEF0FE);' +
      'border:1px solid var(--indigo,#6366F1);border-radius:var(--radius,.75rem);' +
      'padding:1rem 1.1rem 1.25rem;}' +
      '.advdoc-panel[hidden]{display:none;}' +
      '.advdoc-panel-head{display:flex;align-items:center;justify-content:space-between;gap:.75rem;' +
      'margin-bottom:.85rem;padding-bottom:.65rem;border-bottom:1px solid var(--line,#E2E8F0);}' +
      '.advdoc-panel-title{font-size:.95rem;font-weight:800;color:var(--indigo-d,#4F46E5);}' +
      '.advdoc-close{background:#fff;border:1px solid var(--line,#E2E8F0);border-radius:var(--radius,.6rem);' +
      'color:var(--gray,#64748B);font-size:.82rem;font-weight:600;padding:.35rem .7rem;cursor:pointer;' +
      'font-family:inherit;white-space:nowrap;}' +
      '.advdoc-close:hover{color:var(--ink,#1E293B);border-color:var(--gray,#94A3B8);}' +
      '.advdoc-item{background:var(--card,#FFFFFF);border:1px solid var(--line,#E2E8F0);' +
      'border-radius:var(--radius,.6rem);padding:.9rem 1rem;margin-bottom:.75rem;}' +
      '.advdoc-item:last-child{margin-bottom:0;}' +
      '.advdoc-item-h{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.5rem;}' +
      '.advdoc-badge{display:inline-block;background:var(--indigo-d,#4F46E5);color:#fff;font-size:.68rem;' +
      'font-weight:800;letter-spacing:.02em;padding:.18rem .5rem;border-radius:1rem;white-space:nowrap;}' +
      '.advdoc-item-t{font-size:.95rem;font-weight:700;color:var(--ink,#1E293B);}' +
      '.advdoc-item-b{font-size:.88rem;line-height:1.7;color:var(--ink,#334155);word-break:keep-all;}' +
      '@media(max-width:520px){.advdoc-wrap{padding:0 .25rem;}.advdoc-btn{font-size:.9rem;}}';
    var st = document.createElement('style');
    st.id = 'advdoc-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* 전용 콘텐츠 항목 렌더(각 항목: 배지 + title + escape된 body) */
  function renderItems(rows) {
    var html = '';
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i] || {};
      html += '<div class="advdoc-item">' +
        '<div class="advdoc-item-h">' +
        '<span class="advdoc-badge">설계사 전용</span>' +
        '<span class="advdoc-item-t">' + esc(r.title || '') + '</span>' +
        '</div>' +
        '<div class="advdoc-item-b">' + bodyHtml(r.body || '') + '</div>' +
        '</div>';
    }
    return html;
  }

  /* 진입점: slot(#advdoc-slot) 탐색 → 게이트 → published fetch → 1건↑일 때만 버튼+패널 삽입 */
  function init() {
    var slot = document.getElementById('advdoc-slot');
    if (!slot) return;                                   // 슬롯 없는 페이지 = 무동작
    if (slot.getAttribute('data-advdoc-done') === '1') return; // 중복 실행 방지
    var docId = slot.getAttribute('data-doc-id');
    if (!docId) return;

    /* ── 게이트: 비로그인/무권한이면 여기서 끝. 버튼·패널 DOM을 만들지 않는다. ── */
    if (!isAuthorized()) return;

    var path = '/rest/v1/advisor_doc_contents?doc_id=eq.' + encodeURIComponent(docId) +
      '&status=eq.published&order=sort_order.asc&select=section_key,title,body';

    window.db.fetch(path).then(function (res) {
      if (!res || !res.ok) return null;
      return res.json();
    }).then(function (rows) {
      /* 0건(현재 시드 전 정상 상태) 또는 실패 → 버튼 미생성 (WO-6) */
      if (!Array.isArray(rows) || rows.length === 0) return;

      slot.setAttribute('data-advdoc-done', '1');
      injectCss();

      var wrap = document.createElement('div');
      wrap.className = 'advdoc-wrap';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'advdoc-btn';
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = '<span class="advdoc-btn-ic" aria-hidden="true">&#128274;</span>' +
        '<span>설계사 전용 자료 보기</span>' +
        '<span class="advdoc-btn-cnt">' + rows.length + '</span>';

      var panel = document.createElement('div');
      panel.className = 'advdoc-panel';
      panel.hidden = true;
      panel.innerHTML = '<div class="advdoc-panel-head">' +
        '<span class="advdoc-panel-title">설계사 전용 자료</span>' +
        '<button type="button" class="advdoc-close" aria-label="닫기">닫기 &#10005;</button>' +
        '</div>' +
        '<div class="advdoc-list">' + renderItems(rows) + '</div>';

      function openPanel() { panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); btn.classList.add('is-open'); }
      function closePanel() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.classList.remove('is-open'); }

      btn.addEventListener('click', function () { if (panel.hidden) openPanel(); else closePanel(); });
      var closeBtn = panel.querySelector('.advdoc-close');
      if (closeBtn) closeBtn.addEventListener('click', closePanel);

      wrap.appendChild(btn);
      wrap.appendChild(panel);
      slot.appendChild(wrap);
    }).catch(function () { /* 네트워크/파싱 실패 = 버튼 미생성(안전측) */ });
  }

  window.advisorDocInit = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
