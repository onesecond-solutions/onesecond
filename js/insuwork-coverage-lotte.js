(function (root) {
  'use strict';
  // Insvalley landscape report supplied through Lotte. Only the original rider
  // tables are authoritative; the report's aggregate diagnosis pages are not.
  function hash(text) { var h = 2166136261; for (var i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  function section(name) {
    return /의료비|실손/.test(name) ? '실손' : /간병/.test(name) ? '간병인' : /암|종양/.test(name) ? '암' : /뇌/.test(name) ? '뇌' : /심장|심근/.test(name) ? '심장' : /장해/.test(name) ? '장해' : /사망/.test(name) ? '사망' : /수술/.test(name) ? '수술비' : '기타';
  }
  function parse(pages, fileName) {
    var all = pages.map(function (p) { return (p.items || []).map(function (i) { return i.str; }).join(''); }).join('\n');
    if (!/인스밸리/.test(all) || !/상품별\s*보장내용/.test(all)) return null;
    var birthDates = Array.from(all.matchAll(/고객님\s*\([^)]*\)\s*(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/g)).map(function (m) { return m[1] + '-' + m[2].padStart(2,'0') + '-' + m[3].padStart(2,'0'); });
    if (new Set(birthDates).size > 1) throw new Error('PDF에 서로 다른 생년월일이 있습니다. 고객별 파일을 확인해 주세요.');
    var products = [], rows = [], detailPages = [], customerName = '';
    pages.forEach(function (page, pageIndex) {
      var items = (page.items || []).filter(function (i) { return i.str && i.str.trim(); }).map(function (i) { return { text: i.str.trim(), x: i.transform[4] * 842 / page.width, y: i.transform[5] * 595 / page.height }; });
      if (!/상품별\s*보장내용/.test(items.map(function (i) { return i.text; }).join(''))) return;
      detailPages.push(pageIndex + 1);
      function fail() { throw new Error('롯데손해보험 자료 ' + (pageIndex + 1) + '쪽의 상품 또는 상세 담보를 읽지 못했습니다. 원본 PDF를 확인해 주세요. 기존 작업표는 유지됩니다.'); }
      if (!page.width || !page.height || Math.abs(page.width / page.height - 842 / 595) > 0.05) fail();
      function area(a,b,c,d) { return items.filter(function (i) { return i.x >= a && i.x < b && i.y >= c && i.y <= d; }).sort(function (a,b) { return Math.abs(a.y-b.y)>3 ? b.y-a.y : a.x-b.x; }).map(function (i) { return i.text; }).join(''); }
      if (!/단위\s*:\s*만원/.test(area(760,842,450,475))) fail();
      var company = area(20,85,478,507), name = area(85,290,478,507), period = area(290,390,478,507), premium = area(630,695,478,507), insured = area(475,530,490,507).replace(/\s/g,'');
      if (!company || !name || !/^\d{4}\.\d{2}\.\d{2}~\d{4}\.\d{2}\.\d{2}$/.test(period) || !/^[\d,]+$/.test(premium)) fail();
      if (insured) { if (customerName && customerName !== insured) throw new Error('서로 다른 고객의 자료가 포함되어 있습니다. 고객별 PDF로 나누어 주세요.'); customerName = insured; }
      var key = company + '|' + name + '|' + period, product = products.find(function (p) { return p.contractKey === key; });
      if (!product) { product = { id: 'lotte-product-' + hash(key), company: company, product: name, premium: premium + '원', payment: area(530,570,478,507), renewal: /갱신형/.test(name) ? '갱신형' : '', contractDate: period.split('~')[0], coveragePeriod: period, contractKey: key, coverageAuthority: 'lotte-detail', premiumNeedsReview: Number(premium.replace(/,/g,'')) === 0, hidden: false }; products.push(product); }
      var count = 0;
      [0,411.2].forEach(function (offset, column) {
        var body = items.filter(function (i) { return i.x >= 20+offset && i.x < 410+offset && i.y > 40 && i.y < 425; });
        var lines = [];
        body.forEach(function (i) { var line = lines.find(function (l) { return Math.abs(l.y-i.y)<2; }); if (!line) { line = { y: i.y, items: [] }; lines.push(line); } line.items.push(i); });
        lines.sort(function (a,b) { return b.y-a.y; }).forEach(function (line, lineIndex) {
          var names = line.items.filter(function (i) { return i.x < 220+offset; }).sort(function (a,b) { return a.x-b.x; }), amounts = line.items.filter(function (i) { return i.x >= 220+offset && i.x < 280+offset && /^[\d,]+(?:\.\d+)?$/.test(i.text); });
          if (!names.length || amounts.length !== 1) fail();
          var original = names.map(function (i) { return i.text; }).join(''), amount = amounts[0].text + '만원', creditName = line.items.filter(function (i) { return i.x >= 280+offset; }).sort(function (a,b) { return a.x-b.x; }).map(function (i) { return i.text; }).join('');
          if (!original || !creditName) fail();
          var sourceKey = key + '|' + original, duplicate = rows.find(function (r) { return r.sourceKey === sourceKey; });
          if (duplicate) { if (duplicate.values[product.id] !== amount) fail(); return; }
          var truncated = (original.match(/\(/g)||[]).length !== (original.match(/\)/g)||[]).length;
          var review = truncated ? '원문 담보명 잘림 · 조건 확인' : /회한|회당|일당|의료비|진단후|유사암|1-5종|124대질병/.test(original) ? '조건 확인' : '';
          var values = {}, valueSources = {}; values[product.id] = amount; valueSources[product.id] = 'lotte-detail';
          rows.push({ id: 'lotte-row-' + hash(sourceKey), sourceKey: sourceKey, section: section(original), group: '원문 담보', name: original, total: '', totalReview: review, reviewReason: review, values: values, valueSources: valueSources, sourceNames: [original], sourceDetails: [{ provider: 'lotte-detail', page: pageIndex+1, column: column+1, number: String(lineIndex+1), companyName: original, creditName: creditName, amount: amount, contractKey: key, truncated: truncated }], hidden: false, selected: false }); count++;
        });
      });
      if (!count) fail();
    });
    if (!products.length || !rows.length) throw new Error('롯데손해보험 자료의 상품별보장내용을 찾지 못했습니다.');
    rows.forEach(function (r) {
      var n = r.name, family = /^4대유사암진단비\(간편/.test(n) ? '4대유사암진단비' : /^질병1-5종수술비/.test(n) && !/\([1-5]종\)/.test(n) ? '질병1-5종수술비' : /^124대질병수술비/.test(n) ? '124대질병' : '';
      if (family && rows.some(function (other) { return other !== r && other.name.indexOf(family === '124대질병' ? family : family) === 0 && Object.keys(r.values).some(function (id) { return other.values[id]; }); })) { r.totalReview = r.reviewReason = '묶음·세부 담보 중복 확인'; r.excludeFromTotal = true; }
      if (!r.totalReview) r.total = Object.values(r.values)[0];
    });
    var now = new Date().toISOString();
    return { version: 1, source: { name: fileName, type: 'pdf', provider: 'lotte-detail', parserVersion: 1, importedAt: now, needsReview: true, detailPages: detailPages }, preserveTemplateLayout: true, showSummary: false, showHiddenProducts: false, customerInfo: { name: customerName, birthDate: birthDates[0] || '' }, products: products, rows: rows, updatedAt: now };
  }
  root.OSInsuworkCoverageLotte = { parse: parse };
})(typeof window !== 'undefined' ? window : globalThis);
