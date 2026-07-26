/* js/advisor-doc.js — WO-6 "설계사 전용 자료" 공용 컴포넌트 (확정본)
   ────────────────────────────────────────────────────────────────────────────
   정적 공개 문서(silson-history · cancer-treatment-history · caregiver-history)가
   공통 로드해 재사용(DRY). 향후 다른 페이지/검색결과가 다른 source 를 전달해도 되도록
   `advisorPanelInit({sourceType, sourceId, mount})` 로 일반화. 정적 문서용 자동
   초기화는 #advdoc-slot[data-doc-id] 에서 값을 읽어 knowledge_doc source 로 호출한다.

   설계 원칙(WO-6 확정):
   ① 게이트(파일럿): window.db.getToken()(로그인) + localStorage 'os_user'.id===파일럿
      user_id || role==='admin' 일 때만 "권한자". 비로그인/무권한이면 조기 return →
      DOM(레일 섹션·오버레이·패널) 자체를 만들지 않는다(비로그인 소스에 흔적 0).
   ② 전용 콘텐츠는 DB(advisor_contents)에서만 fetch. status='published' 만 조회.
      HTML/JS 하드코딩 금지. RLS 가 서버 최종 보호, 본 게이트는 "표시 통제"용.
   ③ fetch 결과 0건이면 레일 섹션/버튼/패널 미생성.
   ④ 레일 삽입 = 우측 레일(v3side)이 인라인 JS 로 목차·활용·관련자료 블록을 렌더한 "뒤"
      목차 블록 바로 아래·활용 블록 위에 "설계사 전용" 섹션 1개만 삽입. 레일 렌더 완료를
      MutationObserver + 짧은 폴링으로 대기. 레일 삽입 실패 시 폴백 없이 미표시.
   ⑤ 클릭 → 우측 슬라이드인 패널(position:fixed 오버레이). PC 420~480px / 모바일 전체 폭.
      약한 딤(클릭 시 닫힘) · 패널 내부만 스크롤(본문 스크롤 잠금) · × 닫기 · ESC 닫기 · aria.
   ⑥ content_blocks 4종 렌더(paragraph·callout·checklist·script), 알 수 없는 type 은 건너뜀.
      모든 텍스트 escape(XSS). 전역 누출 0: 오버레이/패널 스타일은 .advdoc-* 스코프. */

(function () {
  'use strict';

  /* 파일럿 = 임태성 실장 user_id (WO-6 게이트 스펙) */
  var PILOT_ID = '98c5f4f9-10c1-4ee1-a656-5c2ca63239fd';

  /* XSS escape (있으면 전역 _escHtml 재사용) */
  function esc(s) {
    if (typeof window._escHtml === 'function') return window._escHtml(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* escape 후 개행만 <br>로 살려 가독성 유지(escape 뒤라 안전) */
  function bodyHtml(s) {
    return esc(s).replace(/\r\n|\r|\n/g, '<br>');
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

  /* ── 오버레이/패널 CSS 1회 주입(.advdoc-* 네임스페이스, 전역 누출 0) ──
     레일에 삽입하는 "설계사 전용" 섹션 자체는 페이지의 .blk/.lb/.act 클래스를 재사용해
     기존 '이 자료 활용' 버튼과 동일 톤(흰 배경·테두리, hover만 강조)을 그대로 얻는다.
     여기 주입 CSS 는 슬라이드인 패널·딤·닫기 등 페이지에 없는 요소 전용. */
  function injectCss() {
    if (document.getElementById('advdoc-style')) return;
    var css =
      /* 레일 섹션(페이지 .blk/.lb/.act 위에 얹는 최소 보정 — 톤은 페이지 클래스가 담당) */
      '.advdoc-railsec .advdoc-open .i{font-size:14px;flex:0 0 auto;}' +
      /* fixed 오버레이(뷰포트 고정) + 약한 딤 */
      '.advdoc-ov{position:fixed;inset:0;z-index:2147483000;display:flex;justify-content:flex-end;' +
      'background:rgba(0,0,0,.4);opacity:0;transition:opacity .22s ease;}' +
      '.advdoc-ov.is-in{opacity:1;}' +
      /* 우측 슬라이드인 패널 — PC 460px, 모바일 전체 폭 */
      '.advdoc-panel{position:relative;width:min(460px,100%);max-width:100vw;height:100%;' +
      'background:var(--card,#fff);box-shadow:-8px 0 30px rgba(15,23,42,.22);' +
      'display:flex;flex-direction:column;transform:translateX(100%);transition:transform .26s ease;' +
      'font-family:inherit;}' +
      '.advdoc-ov.is-in .advdoc-panel{transform:translateX(0);}' +
      /* 헤더(고정) */
      '.advdoc-head{flex:0 0 auto;display:flex;align-items:flex-start;gap:12px;' +
      'padding:18px 20px 14px;border-bottom:1px solid var(--line,#E2E8F0);}' +
      '.advdoc-head-tx{flex:1 1 auto;min-width:0;}' +
      '.advdoc-title{font-size:16px;font-weight:700;color:var(--ink,#1E293B);line-height:1.35;}' +
      '.advdoc-sub{margin-top:4px;font-size:13px;line-height:1.55;color:var(--gray,#64748B);word-break:keep-all;}' +
      '.advdoc-x{flex:0 0 auto;width:32px;height:32px;border:1px solid var(--line,#E2E8F0);' +
      'background:var(--card,#fff);border-radius:9px;color:var(--gray,#64748B);font-size:17px;line-height:1;' +
      'cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;' +
      'transition:border-color .15s,color .15s;}' +
      '.advdoc-x:hover{color:var(--ink,#1E293B);border-color:var(--gray,#94A3B8);}' +
      /* 본문(패널 내부만 스크롤) */
      '.advdoc-body{flex:1 1 auto;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:16px 20px 28px;}' +
      /* 전략 섹션 */
      '.advdoc-sec{margin-bottom:22px;}' +
      '.advdoc-sec:last-child{margin-bottom:0;}' +
      '.advdoc-sec-t{font-size:15px;font-weight:700;color:var(--indigo-d,#4F46E5);line-height:1.4;' +
      'margin:0 0 10px;padding-bottom:8px;border-bottom:1px solid var(--line,#E2E8F0);}' +
      /* paragraph */
      '.advdoc-p{font-size:15px;line-height:1.7;color:var(--ink,#334155);margin:0 0 10px;word-break:keep-all;}' +
      '.advdoc-p:last-child{margin-bottom:0;}' +
      /* callout(강조 박스) */
      '.advdoc-callout{background:var(--indigo-l,#EEF0FE);border:1px solid var(--line,#E2E8F0);' +
      'border-left:3px solid var(--indigo,#6366F1);border-radius:9px;padding:11px 13px;margin:0 0 12px;}' +
      '.advdoc-callout-lb{display:inline-block;font-size:12px;font-weight:700;letter-spacing:.4px;' +
      'text-transform:uppercase;color:var(--indigo-d,#4F46E5);margin-bottom:5px;}' +
      '.advdoc-callout-tx{font-size:14px;line-height:1.7;color:var(--ink,#1E293B);word-break:keep-all;}' +
      /* checklist */
      '.advdoc-check{list-style:none;margin:0 0 12px;padding:0;}' +
      '.advdoc-check li{position:relative;padding:5px 0 5px 24px;font-size:14px;line-height:1.6;' +
      'color:var(--ink,#334155);word-break:keep-all;}' +
      '.advdoc-check li::before{content:"\\2713";position:absolute;left:2px;top:5px;font-size:12px;' +
      'font-weight:700;color:var(--indigo,#6366F1);}' +
      /* script(고객 설명 문장) */
      '.advdoc-script{border-left:3px solid var(--gray,#94A3B8);background:var(--bg,#F8FAFC);' +
      'border-radius:0 9px 9px 0;padding:10px 13px;margin:0 0 12px;font-size:14px;line-height:1.7;' +
      'color:var(--ink,#334155);font-style:italic;word-break:keep-all;}' +
      '.advdoc-script::before{content:"\\201C";}.advdoc-script::after{content:"\\201D";}' +
      /* 빈 상태(row는 있으나 렌더 가능한 블록 0) */
      '.advdoc-empty{font-size:13px;color:var(--gray,#64748B);}' /* meta 13 (V3) */ +
      '@media(max-width:520px){.advdoc-panel{width:100%;}}';
    var st = document.createElement('style');
    st.id = 'advdoc-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ── content_blocks 4종 렌더러 ─────────────────────────────────────────────
     각 row(전략 섹션) = title + content_blocks[]. type 별로 렌더, 알 수 없는 type 은 건너뜀. */
  function renderBlock(b) {
    if (!b || typeof b !== 'object') return '';
    switch (b.type) {
      case 'paragraph':
        if (b.text == null || b.text === '') return '';
        return '<p class="advdoc-p">' + bodyHtml(b.text) + '</p>';
      case 'callout':
        if (b.text == null && !b.label) return '';
        return '<div class="advdoc-callout">' +
          (b.label ? '<div class="advdoc-callout-lb">' + esc(b.label) + '</div>' : '') +
          '<div class="advdoc-callout-tx">' + bodyHtml(b.text || '') + '</div>' +
          '</div>';
      case 'checklist':
        if (!Array.isArray(b.items) || b.items.length === 0) return '';
        var lis = '';
        for (var i = 0; i < b.items.length; i++) {
          lis += '<li>' + esc(b.items[i]) + '</li>';
        }
        return '<ul class="advdoc-check">' + lis + '</ul>';
      case 'script':
        if (b.text == null || b.text === '') return '';
        return '<div class="advdoc-script">' + bodyHtml(b.text) + '</div>';
      default:
        return ''; /* 알 수 없는 type = 건너뜀(향후 확장 안전) */
    }
  }

  function renderSections(rows) {
    var html = '';
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i] || {};
      var blocks = Array.isArray(r.content_blocks) ? r.content_blocks : [];
      var inner = '';
      for (var j = 0; j < blocks.length; j++) inner += renderBlock(blocks[j]);
      if (!inner) inner = '<p class="advdoc-empty">준비 중입니다.</p>';
      html += '<section class="advdoc-sec">' +
        '<h3 class="advdoc-sec-t">' + esc(r.title || '') + '</h3>' +
        inner +
        '</section>';
    }
    return html;
  }

  /* ── 슬라이드인 패널(fixed 오버레이) ───────────────────────────────────────
     본문 스크롤 잠금 · 딤/ESC 닫기 · 패널 내부 스크롤 · 포커스 복원 · aria. */
  function openPanel(rows, triggerBtn) {
    injectCss();

    var prevOverflow = '';
    try { prevOverflow = document.documentElement.style.overflow; } catch (e) {}

    var ov = document.createElement('div');
    ov.className = 'advdoc-ov';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-labelledby', 'advdoc-title');

    ov.innerHTML =
      '<div class="advdoc-panel">' +
      '<div class="advdoc-head">' +
      '<div class="advdoc-head-tx">' +
      '<div class="advdoc-title" id="advdoc-title">설계사 전용 자료</div>' +
      '<div class="advdoc-sub">공개 자료를 바탕으로 상담 시 확인할 핵심 포인트를 정리했습니다.</div>' +
      '</div>' +
      '<button type="button" class="advdoc-x" aria-label="닫기">&#10005;</button>' +
      '</div>' +
      '<div class="advdoc-body">' + renderSections(rows) + '</div>' +
      '</div>';

    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      ov.classList.remove('is-in');
      document.removeEventListener('keydown', onKey, true);
      try { document.documentElement.style.overflow = prevOverflow; } catch (e) {}
      setTimeout(function () {
        if (ov.parentNode) ov.parentNode.removeChild(ov);
        if (triggerBtn) { triggerBtn.setAttribute('aria-expanded', 'false'); try { triggerBtn.focus(); } catch (e) {} }
      }, 260);
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.keyCode === 27) { e.stopPropagation(); close(); }
    }

    /* 딤(오버레이 배경) 클릭 = 닫힘. 패널 내부 클릭은 통과. */
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    ov.querySelector('.advdoc-x').addEventListener('click', close);
    document.addEventListener('keydown', onKey, true);

    document.body.appendChild(ov);
    try { document.documentElement.style.overflow = 'hidden'; } catch (e) {} /* 본문 스크롤 잠금 */
    if (triggerBtn) triggerBtn.setAttribute('aria-expanded', 'true');

    /* 다음 프레임에 슬라이드인(트랜지션 발동) + 닫기 버튼 포커스 */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        ov.classList.add('is-in');
        var x = ov.querySelector('.advdoc-x');
        if (x) { try { x.focus(); } catch (e) {} }
      });
    });
  }

  /* ── 레일 삽입: 목차 블록 바로 아래·활용 블록 위에 "설계사 전용" 섹션 1개 ──
     페이지의 .blk/.lb/.act 클래스를 재사용해 기존 블록과 동일 톤을 그대로 얻는다. */
  function insertRailSection(mount, rows) {
    if (!mount || mount.querySelector('.advdoc-railsec')) return true; /* 중복 방지 */

    /* 목차 블록 = nav.toc 를 품은 .blk. 없으면 첫 .blk 를 앵커로. */
    var blks = mount.querySelectorAll('.blk');
    if (!blks || blks.length === 0) return false; /* 레일 아직 미렌더 */
    var anchor = null;
    for (var i = 0; i < blks.length; i++) {
      if (blks[i].querySelector('.toc')) { anchor = blks[i]; break; }
    }
    if (!anchor) anchor = blks[0];

    injectCss();

    var sec = document.createElement('div');
    sec.className = 'blk advdoc-railsec';
    sec.innerHTML =
      '<div class="lb">설계사 전용</div>' +
      '<div class="act">' +
      '<button type="button" class="advdoc-open" aria-haspopup="dialog" aria-expanded="false">' +
      '<span class="i" aria-hidden="true">&#128274;</span>' +
      '<span class="t">설계사 전용 자료</span>' +
      '</button>' +
      '</div>';

    var btn = sec.querySelector('.advdoc-open');
    btn.addEventListener('click', function () { openPanel(rows, btn); });

    /* 목차 블록 바로 뒤(= 활용 블록 앞)에 삽입 */
    if (anchor.nextSibling) anchor.parentNode.insertBefore(sec, anchor.nextSibling);
    else anchor.parentNode.appendChild(sec);
    return true;
  }

  /* 레일 렌더 완료(= .blk 존재)까지 대기 후 삽입. MutationObserver + 짧은 폴링 폴백.
     인라인 IIFE 가 파싱 중 동기 실행돼 보통 이미 렌더돼 있으나, 타이밍 안전장치. */
  function whenRailReadyInsert(mount, rows) {
    if (insertRailSection(mount, rows)) return;

    var done = false;
    function tryInsert() {
      if (done) return true;
      if (insertRailSection(mount, rows)) { done = true; cleanup(); return true; }
      return false;
    }
    var obs = null, pollId = null, timeoutId = null;
    function cleanup() {
      if (obs) { obs.disconnect(); obs = null; }
      if (pollId) { clearInterval(pollId); pollId = null; }
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    }
    if ('MutationObserver' in window) {
      obs = new MutationObserver(function () { tryInsert(); });
      obs.observe(mount, { childList: true, subtree: true });
    }
    pollId = setInterval(tryInsert, 200);
    timeoutId = setTimeout(cleanup, 4000); /* 레일 끝내 미렌더 = 폴백 없이 미표시 */
  }

  /* ── 공용 진입점 ───────────────────────────────────────────────────────────
     advisorPanelInit({sourceType, sourceId, mount}) — 게이트 → published fetch →
     1건↑일 때만 레일 섹션 삽입. mount 는 레일 컨테이너(정적 문서=#v3side). */
  function advisorPanelInit(opts) {
    opts = opts || {};
    var sourceType = opts.sourceType, sourceId = opts.sourceId, mount = opts.mount;
    if (!sourceType || !sourceId || !mount) return;

    /* ── 게이트: 비로그인/무권한이면 여기서 끝. 어떤 DOM 도 만들지 않는다. ── */
    if (!isAuthorized()) return;
    if (!(window.db && typeof window.db.fetch === 'function')) return;

    var path = '/rest/v1/advisor_contents' +
      '?source_type=eq.' + encodeURIComponent(sourceType) +
      '&source_id=eq.' + encodeURIComponent(sourceId) +
      '&status=eq.published&order=sort_order.asc' +
      '&select=section_key,title,content_blocks';

    window.db.fetch(path).then(function (res) {
      if (!res || !res.ok) return null;
      return res.json();
    }).then(function (rows) {
      /* 0건(전용 콘텐츠 없음) 또는 실패 → 섹션/버튼/패널 미생성 (WO-6 ③) */
      if (!Array.isArray(rows) || rows.length === 0) return;
      whenRailReadyInsert(mount, rows);
    }).catch(function () { /* 네트워크/파싱 실패 = 미생성(안전측) */ });
  }

  /* ── 정적 문서 자동 초기화 ─────────────────────────────────────────────────
     #advdoc-slot[data-doc-id] 에서 sourceId 를 읽어 knowledge_doc source 로 호출.
     레일 mount = #v3side. 슬롯 div 자체엔 아무 버튼도 만들지 않는다(레일로 이동). */
  function autoInit() {
    var slot = document.getElementById('advdoc-slot');
    if (!slot) return;
    if (slot.getAttribute('data-advdoc-done') === '1') return; /* 중복 실행 방지 */
    var docId = slot.getAttribute('data-doc-id');
    if (!docId) return;
    var mount = document.getElementById('v3side');
    if (!mount) return; /* 레일 컨테이너 없는 페이지 = 무동작 */
    slot.setAttribute('data-advdoc-done', '1');
    advisorPanelInit({ sourceType: 'knowledge_doc', sourceId: docId, mount: mount });
  }

  /* 전역 등록: 공용 진입점 + 하위 호환(advisorDocInit) */
  window.advisorPanelInit = advisorPanelInit;
  window.advisorDocInit = autoInit;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
})();
