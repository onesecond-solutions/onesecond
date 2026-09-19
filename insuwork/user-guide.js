/* 개인정보 없는 단계별 시연. 실제 업무 데이터와 독립적으로 동작한다. */
(function () {
  'use strict';
  var lessons = [
    {name:'상담관리',section:'consultations',steps:[
      ['상담을 등록합니다','상담관리에서 상담 등록을 열고 고객 이름과 상담 내용을 입력하세요.','고객명|김예시;상담 내용|보장 점검 상담;상담 상태|예약'],
      ['진행 상태를 정리합니다','상담한 내용을 남기고 예약·진행중·제안서발송·클로징 중 현재 단계를 선택하세요.','고객명|김예시;상담 내용|제안서 설명 후 다음 상담 준비;상담 상태|제안서발송'],
      ['청약완료 후 계약관리로','실제 청약이 완료되면 상담 상태를 청약완료로 저장합니다. 계약관리에서 고객과 계약 정보를 확인하세요.','고객명|김예시;상담 상태|청약완료;반영 위치|계약관리'] ]},
    {name:'계약관리',section:'customers',steps:[
      ['고객을 선택합니다','목록에서 고객을 클릭하면 오른쪽에 상세 정보가 열립니다. 같은 고객을 다시 누르면 닫힙니다.','고객명|김예시;고객 상태|청약완료;상세 정보|오른쪽 카드'],
      ['관리 기준을 입력합니다','청약일과 생년월일을 정확히 입력하고 저장하세요. 보험나이와 케어 일정의 기준이 됩니다.','청약일|2026-09-01;생년월일|1990-04-15;고객 상태|청약완료'],
      ['다음 케어로 이어집니다','청약완료 고객은 청약일 기준 31·91·181·365일 케어 일정이 생성됩니다. 캘린더에서 확인하세요.','청약일|2026-09-01;31일 케어|2026-10-02;반영 위치|캘린더 · 홈 할 일'] ]},
    {name:'캘린더',section:'calendar',steps:[
      ['날짜를 선택합니다','오늘 버튼이나 이전·다음 버튼으로 날짜를 이동합니다. 월·주·일·일정 보기를 목적에 맞게 선택하세요.','보기 방식|월 · 주 · 일 · 일정;선택 날짜|2026-10-02;표시 일정|김예시 +31일 케어'],
      ['일정 종류를 확인합니다','상담 일정과 고객 케어, 생일, 보험상령일을 구분해 확인하세요. 같은 종류의 일정이 많으면 더보기를 사용합니다.','고객 케어|김예시 +31일;확인할 내용|고객 · 일정 종류 · 날짜;다음 행동|고객 정보 확인'],
      ['오늘 할 일과 함께 활용합니다','홈에서도 선택한 날짜의 할 일을 확인할 수 있습니다. 고객의 기준 날짜를 수정하면 관련 일정을 다시 확인하세요.','홈|오늘 할 일;고객|김예시;업무|계약 후 후속 상담 준비'] ]},
    {name:'자료·업무노트',section:'assets',steps:[
      ['자료를 보관합니다','자료에서 업무노트·자료실·메모를 선택합니다. 자료 추가로 노트를 작성하거나 파일을 업로드하세요.','선택 탭|업무노트;자료 추가|업무노트·메모 작성;제목|첫 상담 스크립트'],
      ['목록과 본문을 함께 봅니다','업무노트 목록을 클릭하면 오른쪽에 내용이 열립니다. 목록과 본문은 각각 스크롤하고, 같은 항목을 다시 누르면 닫힙니다.','선택한 노트|첫 상담 스크립트;선택 표시|금색 세로선과 제목;본문|고객님, 오늘은 현재 보장 내용을 함께 확인하겠습니다.'],
      ['검색에서 보관 위치로','상단 검색으로 자료를 찾고 팝업의 업무노트로 이동·자료실로 이동을 누르세요. 검색 결과로 돌아가기도 가능합니다.','검색어|첫 상담;검색 결과|첫 상담 스크립트;이동|업무노트로 이동 ↗'] ]},
    {name:'보장분석',section:'coverage-analysis',steps:[
      ['원본 자료를 불러옵니다','파일 불러오기에서 고객의 보장 자료를 선택합니다. 암호화된 파일은 해당 파일의 비밀번호가 필요합니다.','파일 불러오기|고객 보장 자료;처리|보장분석 중;확인|고객 정보와 상품 정보'],
      ['분석 결과를 검토합니다','보험사·상품·보험료와 담보별 가입금액을 원본과 대조하세요. 필요한 항목을 수정하고 불필요한 행을 숨겨 상담용으로 정리합니다.','보험사·상품|원본과 비교;가입금액|원본과 비교;담보현황|상담할 분류 선택'],
      ['저장하고 활용합니다','작업표 저장으로 작업을 보관하거나 고객을 선택해 고객별로 저장합니다. 선택 화면 복사로 정리한 표를 활용하세요.','작업표 저장|작업 보관;고객별 저장|선택한 고객 확인;선택 화면 복사|상담용 표 활용'] ]}
  ];
  var captures = [
    [['consult-form',26,7,47,20],['consult-list',25,14,57,9],['consult-complete',53,19,18,7]],
    [['customer-list',13,31,85,7],['customer-detail',49,34,48,20],['customer-care',39,36,22,29]],
    [['calendar',13,8,84,9],['calendar',13,17,84,74],['home',13,10,84,22]],
    [['assets',13,10,20,6],['note-detail',13,16,85,74],['assets',35,1,30,5]],
    [['coverage',13,14,6,5],['coverage-filter',13,19,28,5],['coverage',77,92,21,5]]
  ];
  var mounted = new WeakSet(), states = {};
  function esc(s) { return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function html(promo) { return '<section class="iw-demo" data-iw-demo="'+(promo?'promo':'guide')+'" aria-label="보험워크 사용 시연"></section>'; }
  function mount() { document.querySelectorAll('[data-iw-demo]').forEach(function(root){
    if(mounted.has(root))return; mounted.add(root);
    var promo=root.dataset.iwDemo==='promo', lesson=0, step=0, timer=0, playing=promo&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
    var tour=[[0,0],[0,2],[1,1],[1,2],[2,0]], tourIndex=0;
    var key=promo?'promo':'guide', saved=states[key];
    if(saved){lesson=saved.lesson;step=saved.step;tourIndex=saved.tourIndex;playing=saved.playing;}
    root.innerHTML='<header><span class="iw-demo-eyebrow">'+(promo?'보험워크, 이렇게 사용합니다':'단계별 사용 가이드')+'</span><h2>'+(promo?'상담부터 다음 고객 케어까지':'보고, 멈추고, 따라 해보세요')+'</h2><p>실제 보험워크 화면으로 사용 순서를 안내합니다. 화면 속 정보는 설명을 위한 예시입니다.</p></header><nav class="iw-demo-lessons" aria-label="가이드 메뉴">'+(promo?'':lessons.map(function(l,i){return '<button type="button" data-lesson="'+i+'">'+l.name+'</button>';}).join(''))+'</nav><div class="iw-demo-stage"></div><div class="iw-demo-controls"><button type="button" data-action="prev">이전</button><button type="button" data-action="play"></button><button type="button" data-action="next">다음</button><button type="button" data-action="restart">다시 보기</button><span class="iw-demo-count"></span></div><div class="iw-demo-dots" aria-label="단계 선택"></div><div class="iw-demo-cta"></div>';
    function stop(){clearTimeout(timer);timer=0;}
    function schedule(){stop();if(playing)timer=setTimeout(function(){if(!root.isConnected || (root.closest('dialog')&&!root.closest('dialog').open)){stop();return;}if(!document.hidden){advance();}else schedule();},6500);}
    function draw(){
      states[key]={lesson:lesson,step:step,tourIndex:tourIndex,playing:playing};
      var l=lessons[lesson], s=l.steps[step], count=promo?tour.length:l.steps.length, index=promo?tourIndex:step;
      var shot=captures[lesson][step];
      root.querySelector('.iw-demo-stage').innerHTML='<div class="iw-demo-screen"><div class="iw-demo-screenbar"><b>'+esc(l.name)+'</b><span>실제 화면 · 예시 데이터</span></div><div class="iw-demo-capture-wrap"><img class="iw-demo-capture" width="1920" height="945" src="/insuwork/assets/guide/'+shot[0]+'.png" alt="'+esc(l.name+' — '+s[0])+'"><span class="iw-demo-hotspot" aria-hidden="true" style="left:'+shot[1]+'%;top:'+shot[2]+'%;width:'+shot[3]+'%;height:'+shot[4]+'%"></span></div></div><div class="iw-demo-caption"><span>STEP '+(index+1)+'</span><h3>'+esc(s[0])+'</h3><p>'+esc(s[1])+'</p></div>';
      root.querySelector('[data-action="play"]').textContent=playing?'일시정지':'재생';
      root.querySelector('[data-action="prev"]').disabled=index===0;
      root.querySelector('[data-action="next"]').disabled=index===count-1;
      root.querySelector('.iw-demo-count').textContent=(index+1)+' / '+count;
      root.querySelector('.iw-demo-dots').innerHTML=Array.from({length:count},function(_,i){return '<button type="button" data-step="'+i+'" aria-label="'+(i+1)+'단계" aria-current="'+(i===index?'step':'false')+'">'+(i+1)+'</button>';}).join('');
      root.querySelectorAll('[data-lesson]').forEach(function(b){b.setAttribute('aria-pressed',String(Number(b.dataset.lesson)===lesson));});
      root.querySelector('.iw-demo-cta').innerHTML=promo?'<button type="button" data-action="login">보험워크 시작하기</button><small>로그인 또는 회원가입 후 내 업무를 시작하세요.</small>':'<button type="button" data-action="open">'+esc(l.name)+' 열기 ↗</button><small>실제 업무 화면으로 이동합니다.</small>';
      schedule();
    }
    function select(i){if(promo){tourIndex=i;lesson=tour[i][0];step=tour[i][1];}else step=i;}
    function advance(){var index=promo?tourIndex:step,count=promo?tour.length:lessons[lesson].steps.length;if(index===count-1){playing=false;draw();return;}select(index+1);draw();}
    root.addEventListener('click',function(e){var b=e.target.closest('button');if(!b||!root.contains(b))return;
      if(b.hasAttribute('data-lesson')){lesson=Number(b.dataset.lesson);step=0;playing=false;draw();return;}
      if(b.hasAttribute('data-step')){playing=false;select(Number(b.dataset.step));draw();return;}
      var a=b.dataset.action;
      if(a==='login'){var login=document.querySelector('[data-ib-login]')||document.getElementById('iw-account-login');if(login)login.click();return;}
      if(a==='open'){playing=false;states[key].playing=false;stop();var dialog=root.closest('dialog');if(dialog)dialog.close();window.OSInsuwork.go(lessons[lesson].section);return;}
      if(a==='play'){var last=promo?tourIndex===tour.length-1:step===lessons[lesson].steps.length-1;if(!playing&&last)select(0);playing=!playing;}
      if(a==='prev'){playing=false;select(Math.max(0,(promo?tourIndex:step)-1));}
      if(a==='next'){playing=false;advance();return;}
      if(a==='restart'){select(0);playing=true;}
      draw();
    });draw();
  }); }
  function openWelcome(owner) {
    var host=document.getElementById('v-insuwork');
    if(!host||document.querySelector('dialog[open]'))return false;
    var previous=document.getElementById('iw-guide-welcome');if(previous)previous.remove();
    var dialog=document.createElement('dialog');dialog.id='iw-guide-welcome';dialog.className='iw-guide-dialog';dialog.setAttribute('aria-label','보험워크 시작 가이드');
    dialog.innerHTML='<button class="iw-guide-dialog-close" type="button" aria-label="가이드 닫기">×</button>'+html(false)+'<footer class="iw-guide-dialog-footer"><span>처음이라면 상담 등록부터 시작해 보세요. 지원 메뉴에서 언제든 다시 볼 수 있습니다.</span><button type="button" data-guide-later>직접 둘러보기</button></footer>';
    host.appendChild(dialog);
    dialog.querySelector('.iw-guide-dialog-close').onclick=function(){dialog.close();};
    dialog.querySelector('[data-guide-later]').onclick=function(){dialog.close();};
    dialog.addEventListener('close',function(){dialog.remove();});
    dialog.showModal();mount();dialog.querySelector('.iw-guide-dialog-close').focus();return true;
  }
  window.OSInsuworkGuide={html:html,mount:mount,openWelcome:openWelcome};
})();
