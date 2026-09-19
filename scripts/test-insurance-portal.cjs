const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const location = {href:'https://example.test/?section=insurance-portal',search:'?section=insurance-portal'};
const window = {};
vm.runInNewContext(fs.readFileSync('insuwork/portal-histories.js','utf8'), {window});
vm.runInNewContext(fs.readFileSync('insuwork/portal-histories.js','utf8'), {window});
vm.runInNewContext(fs.readFileSync('insuwork/portal.js','utf8'), {window,location,URL,URLSearchParams,Map});
const portal = window.OSInsurancePortal;
const entries = portal.entries();
assert.equal(new Set(entries.map(x=>x.id)).size, entries.length);
assert.ok(entries.length >= 19);
for (const entry of entries) {
  location.search = '?section=insurance-portal&article='+entry.id;
  const html = portal.html();
  assert.ok(html.includes('<h1>'));
  assert.ok(!html.includes('undefined'),entry.id);
  if (['silson','cancer-history','care-history'].includes(entry.id)) {
    assert.ok(html.includes('iph-native'));
    assert.ok(!/<iframe|<table/.test(html),'History must be native editorial content');
    assert.ok(html.length>7000,'Complete content must remain');
  }
  if (['silson','cancer-history','care-history'].includes(entry.id)) {
    assert.ok(html.includes('iph-native'));
    assert.ok(!/<iframe|<table/.test(html),'History must be native editorial content, not a framed table');
    assert.ok(html.length>7000,'Complete history content must remain');
  }
  for (const m of html.matchAll(/data-ip-open="([^"]+)"/g)) assert.ok(entries.some(e=>e.id===m[1]),'Broken related topic: '+m[1]);
  for (const m of html.matchAll(/src="(\/insurance\/[^?]+)\?portal=1"/g)) assert.ok(fs.existsSync('.'+m[1]+'index.html'));
}
location.search = '?article=missing';
assert.ok(portal.html().includes('ip-masthead'),'Unknown topic falls back to portal home');
for(const topic of ['basics','treatment','compare','underwriting','history']) {
  location.search='?topic='+topic;
  assert.ok(portal.html().includes('ip-topic-view'));
  assert.ok(!portal.html().includes('undefined'));
}
const mobileWindow={addEventListener(){},innerWidth:390,matchMedia:()=>({matches:true})};
vm.runInNewContext(fs.readFileSync('insuwork/mobile-routing.js','utf8'), {window:mobileWindow,location:{pathname:'/other',hostname:'example.test'},navigator:{userAgent:'iPhone'},document:{addEventListener(){}},URLSearchParams});
assert.equal(mobileWindow.OSInsuworkMobileRouting.destination('?section=insurance-portal&article=age'),'/insuwork/m/section.html?article=age&view=insuwork&section=insurance-portal');
console.log('Portal topic rendering, related links, history paths and mobile deep links passed');
