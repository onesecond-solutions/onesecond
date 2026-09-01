/* PC/모바일 공통 고객 브리핑. 개인 고객 데이터와 분리된 정적 뉴스만 읽는다. */
(function () {
  'use strict';
  var base='/insuwork/insubriefing/data/', data=null, pending=null, failed=false, index=0, paused=false, timer=null;
  var filter='', archive=null, archiveItems=null, dailyCache={}, visibleCount=20, lastCheck=0;
  function esc(v){return String(v||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function safe(v){try{var u=new URL(v);return /^https?:$/.test(u.protocol)?u.href:'#';}catch(_){return '#';}}
  function day(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
  function mobile(){return location.pathname.indexOf('/insuwork/m/')===0;}
  function route(id,date){return (mobile()?'/insuwork/m/section.html':'/insuwork/')+'?view=insuwork&section=daily-briefing'+(id?'&article='+encodeURIComponent(id):'')+(date?'&briefingDate='+encodeURIComponent(date):'');}
  function stamp(){if(!data)return failed?'갱신 정보를 불러오지 못했습니다. 다시 시도해 주세요.':'기사를 불러오는 중입니다.';var stale=data.date!==day();return (stale?'오늘 갱신 대기 · ':'')+new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(data.updatedAt))+' 갱신';}
  function read(name){return fetch(base+name,{cache:'no-store'}).then(function(r){if(!r.ok)throw Error('자료를 불러오지 못했습니다.');return r.json();});}
  function load(){if(pending)return pending;if(data&&Date.now()-lastCheck<300000)return Promise.resolve(data);lastCheck=Date.now();pending=read('briefing-latest.json').then(function(d){if(!Array.isArray(d.items)||!d.updatedAt)throw Error('형식 오류');data=d;failed=false;return d;}).catch(function(){failed=true;return data;}).finally(function(){pending=null;});return pending;}
  function bannerHtml(){return '<aside class="iwb-banner" data-iwb-banner aria-label="뉴스 브리핑"><a class="iwb-brand" href="'+route()+'">뉴스 브리핑</a><div class="iwb-current"></div><div class="iwb-controls"></div></aside>';}
  function paintBanner(){document.querySelectorAll('[data-iwb-banner]').forEach(function(el){var list=data&&data.items||[],item=list[index%Math.max(list.length,1)];el.querySelector('.iwb-current').innerHTML=item?'<a class="iwb-headline" href="'+route(item.id,data.date)+'" title="'+esc(item.title)+'"><span class="iwb-category">'+esc(item.category)+'</span><span class="iwb-title">'+esc(item.title)+'</span></a>':'<span class="iwb-note">'+esc(stamp())+'</span>';el.title=stamp();el.querySelector('.iwb-brand').textContent=data&&data.date!==day()?'뉴스 브리핑 '+data.date.slice(5):'뉴스 브리핑';el.querySelector('.iwb-controls').innerHTML=list.length>1?'<span class="iwb-count">'+(index%list.length+1)+'/'+list.length+'</span><button type="button" data-iwb-action="prev" aria-label="이전 기사">‹</button><button type="button" data-iwb-action="next" aria-label="다음 기사">›</button><button type="button" data-iwb-action="pause" aria-label="'+(paused?'기사 자동 전환 재생':'기사 자동 전환 정지')+'" aria-pressed="'+paused+'">'+(paused?'▶':'Ⅱ')+'</button>':'';});}
  function advance(n){if(!data||!data.items.length)return;index=(index+n+data.items.length)%data.items.length;paintBanner();}
  function mountBanners(){var banners=document.querySelectorAll('[data-iwb-banner]');if(!banners.length)return;
    banners.forEach(function(el){if(el.dataset.bound)return;el.dataset.bound='1';el.addEventListener('click',function(e){var b=e.target.closest('[data-iwb-action]');if(!b)return;var a=b.dataset.iwbAction;if(a==='pause'){paused=!paused;b.textContent=paused?'▶':'Ⅱ';b.setAttribute('aria-label',paused?'기사 자동 전환 재생':'기사 자동 전환 정지');b.setAttribute('aria-pressed',String(paused));}else{advance(a==='prev'?-1:1);el.querySelector('[data-iwb-action="'+a+'"]').focus();}});});
    load().then(paintBanner);if(!timer)timer=setInterval(function(){var visible=document.querySelector('[data-iwb-banner]');if(!visible){clearInterval(timer);timer=null;return;}if(paused||document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches||visible.matches(':hover')||visible.contains(document.activeElement))return;if(Date.now()-lastCheck>=300000)load().then(paintBanner);advance(1);},7000);
  }
  function sectionHtml(){return '<section class="iwb-page" data-iwb-page><h2>뉴스 브리핑</h2><p class="iwb-note">기사를 불러오는 중입니다.</p></section>';}
  async function loadArchiveItems(){
    if(archiveItems)return archiveItems;
    if(!archive){try{archive=await read('briefing-archive.json');}catch(_){archive={dates:data?[data.date]:[]};}}
    var dates=Array.isArray(archive.dates)?archive.dates:[];
    var batches=await Promise.all(dates.map(async function(date){
      if(data&&date===data.date)return data;
      if(dailyCache[date])return dailyCache[date];
      try{dailyCache[date]=await read('daily/'+date+'.json');return dailyCache[date];}catch(_){return null;}
    }));
    var seen={};
    archiveItems=batches.flatMap(function(batch){return batch&&Array.isArray(batch.items)?batch.items.map(function(item){return Object.assign({_briefingDate:batch.date},item);}):[];}).filter(function(item){var key=item.url||item.id;if(!key||seen[key])return false;seen[key]=true;return true;}).sort(function(a,b){return Date.parse(b.publishedAt)-Date.parse(a.publishedAt);});
    return archiveItems;
  }
  async function mountSection(){var root=document.querySelector('[data-iwb-page]');if(!root)return;var params=new URLSearchParams(location.search);var article=params.get('article')||'';
    await load();if(!root.isConnected)return;
    var items=await loadArchiveItems();if(!root.isConnected)return;
    var detail=items.find(function(i){return i.id===article;});
    var filtered=items.filter(function(i){return !filter||i.category===filter;});
    var visible=filtered.slice(0,visibleCount);
    root.innerHTML='<header class="iwb-page-head"><h2>뉴스 브리핑</h2><p class="iwb-note">'+esc(stamp())+'</p><p class="iwb-note">최근 선별된 주요 소식을 최신순으로 쌓아 보여드립니다. 법령·의료 보도는 시행 여부, 적용 대상과 원문을 확인해 주세요.</p></header>'+
      '<div class="iwb-filters"><label>분야 <select data-iwb-filter><option value="">전체</option>'+((data&&data.categories)||[]).map(function(c){return '<option'+(filter===c?' selected':'')+'>'+esc(c)+'</option>';}).join('')+'</select></label><span class="iwb-result-count">총 '+filtered.length+'건</span><button type="button" data-iwb-retry>새로고침</button></div>'+
      (detail?'<article class="iwb-detail"><a href="'+route()+'">목록으로</a>'+card(detail,true)+'</article>':article?'<p>해당 기사를 찾지 못했습니다. 아래 목록에서 확인해 주세요.</p>':'')+
      '<div class="iwb-list">'+(visible.map(function(i){return '<article class="iwb-card"><a href="'+route(i.id,i._briefingDate)+'"><span class="iwb-category">'+esc(i.category)+'</span><h3>'+esc(i.title)+'</h3></a><p class="iwb-note">'+esc(i.sourceType)+' · '+esc(i.source)+' · '+esc(i.publishedAt.slice(0,10))+'</p></article>';}).join('')||'<p class="iwb-note">표시할 기사가 없습니다.</p>')+'</div>'+
      (visible.length<filtered.length?'<button class="iwb-more" type="button" data-iwb-more>더 보기 ('+visible.length+'/'+filtered.length+')</button>':'');
    root.querySelector('[data-iwb-filter]').addEventListener('change',function(e){filter=e.target.value;visibleCount=20;mountSection();});
    root.querySelector('[data-iwb-retry]').addEventListener('click',function(){lastCheck=0;archive=null;archiveItems=null;dailyCache={};visibleCount=20;mountSection();});
    var more=root.querySelector('[data-iwb-more]');if(more)more.addEventListener('click',function(){visibleCount+=20;mountSection();});
  }
  function card(i,detail){return '<span class="iwb-category">'+esc(i.category)+'</span><h3>'+esc(i.title)+'</h3><p class="iwb-note">'+esc(i.sourceType)+' · '+esc(i.source)+' · '+esc(i.publishedAt.slice(0,10))+'</p>'+(i.description?'<p>'+esc(i.description)+'</p><small>검색 서비스가 제공한 기사 소개문입니다.</small>':'<p>적용 대상·날짜·조건과 자세한 내용은 원문에서 확인해 주세요.</p>')+'<p><a class="iwb-original" href="'+esc(safe(i.url))+'" target="_blank" rel="noopener noreferrer">원문 보기 ↗</a></p>';}
  document.addEventListener('visibilitychange',function(){if(!document.hidden)mountBanners();});
  window.OSCustomerBriefing={bannerHtml:bannerHtml,sectionHtml:sectionHtml,mount:function(){mountBanners();mountSection();}};
})();
