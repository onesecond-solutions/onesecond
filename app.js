const rightPanelMap = {
  home: 'c-home',
  scripts: 'c-scripts',
  board: 'c-board',
  myspace: 'c-myspace',
  news: 'c-news',
  quick: 'c-quick'
};

const quickContentMap = {
  consent: '<div style="background:#fff;border:1px solid #e6dfd7;border-radius:14px;padding:16px;"><h3 style="margin-bottom:8px;">가입설계 / 선심사 동의 녹취 스크립트</h3><p>실전 스크립트 본문은 다음 단계에서 실제 원세컨드 콘텐츠로 교체합니다.</p></div>',
  mirror: '<div style="background:#fff;border:1px solid #e6dfd7;border-radius:14px;padding:16px;"><h3 style="margin-bottom:8px;">미러링 전 녹취 스크립트</h3><p>회사별 녹취 스크립트 영역입니다.</p></div>',
  bmi: '<div style="background:#fff;border:1px solid #e6dfd7;border-radius:14px;padding:16px;"><h3 style="margin-bottom:8px;">회사별 BMI 심사기준</h3><p>보험사별 BMI 기준 콘텐츠 영역입니다.</p></div>',
  age: '<div style="background:#fff;border:1px solid #e6dfd7;border-radius:14px;padding:16px;"><h3 style="margin-bottom:8px;">보험연령표</h3><p>보험연령표 콘텐츠 영역입니다.</p></div>'
};

async function loadPage(pageKey){
  const target = document.getElementById('dynamic-content');
  target.innerHTML = '<div class="loading">불러오는 중...</div>';
  try{
    const res = await fetch(`pages/${pageKey}-content.html`, { cache: 'no-store' });
    if(!res.ok) throw new Error('페이지 로드 실패');
    const html = await res.text();
    target.innerHTML = html;
  }catch(err){
    target.innerHTML = '<div class="loading">페이지를 불러오지 못했습니다.<br>pages/' + pageKey + '-content.html 파일을 확인해 주세요.</div>';
  }
}

function switchMenu(menuKey){
  document.querySelectorAll('.menu-item').forEach(el => {
    el.classList.toggle('active', el.dataset.menu === menuKey);
  });
  document.querySelectorAll('.tab-item').forEach(el => {
    el.classList.toggle('active', el.dataset.menu === menuKey);
  });
  document.querySelectorAll('.c-section').forEach(el => {
    el.classList.remove('active');
  });
  const activePanel = document.getElementById(rightPanelMap[menuKey]);
  if(activePanel) activePanel.classList.add('active');
  localStorage.setItem('selected_menu', menuKey);
  loadPage(menuKey);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.menu-item').forEach(el => {
    el.addEventListener('click', () => switchMenu(el.dataset.menu));
  });
  document.querySelectorAll('.tab-item').forEach(el => {
    el.addEventListener('click', () => switchMenu(el.dataset.menu));
  });
  document.getElementById('openQuick').addEventListener('click', () => {
    document.getElementById('quickOverlay').classList.add('show');
  });
  document.getElementById('quickOverlay').addEventListener('click', (e) => {
    if(e.target.id === 'quickOverlay') e.currentTarget.classList.remove('show');
  });
  document.querySelectorAll('.qm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.qm-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('qm-content').style.display = 'block';
      document.getElementById('qm-content-inner').innerHTML = quickContentMap[btn.dataset.quick] || '<p>준비 중입니다.</p>';
    });
  });
  const saved = localStorage.getItem('selected_menu') || 'home';
  switchMenu(saved);
});
