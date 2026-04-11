function toggleQuick(event) {
  event.stopPropagation();
  document.getElementById('quick-dropdown').classList.toggle('open');
}
document.addEventListener('click', function(e) {
  const dropdown = document.getElementById('quick-dropdown');
  const wrap = document.querySelector('.quick-wrap');
  if (dropdown && wrap && !wrap.contains(e.target)) {
    dropdown.classList.remove('open');
  }
});
function openOverlay(title, icon) {
  document.getElementById('quick-dropdown').classList.remove('open');
  document.getElementById('overlay-title').innerHTML = `${icon} ${title}`;
  document.getElementById('overlay-body').innerHTML = overlayContent[title] || '준비 중입니다.';
  document.getElementById('quick-overlay').classList.add('active');
}
function closeQuick() {
  document.getElementById('quick-overlay').classList.remove('active');
}
function closeOverlay(event) {
  if (event.target.id === 'quick-overlay') closeQuick();
}

function getCurrentBlockKey() {
  const conf = MENU_CONFIG[state.main];
  if (conf.groups) {
    const item = conf.groups[state.sub].find(([title, screen]) => screen === state.cat);
    return item ? `${item[0]}|${item[1]}` : null;
  }
  const item = conf.screens.find(([title, screen]) => screen === state.cat);
  return item ? `${item[0]}|${item[1]}` : null;
}

function renderMain() {
  const row = document.getElementById('main-row');
  const buttons = MAIN_KEYS.map(name => `
    <button class="main-btn ${state.main===name?'active':''}" onclick="selectMain('${name}')">${buttonLabel(name)}</button>
  `).join('');
  row.innerHTML = buttons + `<button class="script-write-btn top" onclick="goToMyScriptWriter()">✍️ 나만의 스크립트</button>`;
}

function buttonLabel(name) {
  const map = {
    "도입인사":"📞 도입인사",
    "필요성 강조":"🔥 필요성 강조",
    "상황 확인":"🔎 상황 확인",
    "보장분석":"📊 보장분석",
    "상품설명":"📦 상품설명",
    "클로징":"✅ 클로징"
  };
  return map[name] || name;
}

function goToMyScriptWriter() {
  window.location.href = 'myspace.html';
}

function selectMain(name) {
  state.main = name;
  const conf = MENU_CONFIG[name];
  if (conf.groups) {
    state.sub = conf.default_group;
    state.cat = conf.default_screen;
  } else {
    state.sub = "";
    state.cat = conf.default_screen;
  }
  renderAll();
}

function selectSub(name) {
  state.sub = name;
  const conf = MENU_CONFIG[state.main];
  state.cat = conf.groups[name][0][1];
  renderAll();
}

function selectCat(name) {
  state.cat = name;
  renderAll();
}

function renderSub() {
  const step2 = document.getElementById('step2');
  const subRow = document.getElementById('sub-row');
  const conf = MENU_CONFIG[state.main];
  if (!conf.groups) {
    step2.classList.add('hidden');
    subRow.innerHTML = '';
    return;
  }
  step2.classList.remove('hidden');
  const groups = Object.keys(conf.groups);
  subRow.innerHTML = groups.map(name => `
    <button class="sub-btn ${state.sub===name?'active':''}" onclick="selectSub('${name}')">${name}</button>
  `).join('');
}

function renderCat() {
  const step3 = document.getElementById('step3');
  const catRow = document.getElementById('cat-row');
  const conf = MENU_CONFIG[state.main];
  let items = [];
  if (conf.groups) {
    items = conf.groups[state.sub].map(x => x[1]);
  } else {
    items = conf.screens.map(x => x[1]);
  }
  if (!items.length) {
    step3.classList.add('hidden');
    catRow.innerHTML = '';
    return;
  }
  step3.classList.remove('hidden');
  catRow.innerHTML = items.map(name => `
    <button class="cat-btn ${state.cat===name?'active':''}" onclick="selectCat('${name}')">${name}</button>
  `).join('');
}

function nl2br(text) {
  return (text||'').replace(/\n/g, '<br>');
}

function renderContent() {
  const key = getCurrentBlockKey();
  const block = CONTENT_MAP[key];
  if (!block) return;
  // 클릭 로그 기록
  logScriptUsage(state.main, state.sub, state.cat);

  document.getElementById('screen-chip').textContent = `${state.main} · ${state.sub ? state.sub + ' · ' : ''}${state.cat}`;
  document.getElementById('summary-badge').textContent = block.pill || state.cat;
  document.getElementById('summary-badge').style.color = block.summary_color || '#4155c7';
  document.getElementById('summary-badge').style.background = 'rgba(227,231,251,.95)';
  document.getElementById('summary-box').innerHTML = nl2br(block.summary_text || '내용 준비 중입니다.');

  const wrap = document.getElementById('accordion-wrap');
  wrap.innerHTML = (block.sections || []).map((sec, idx) => `
    <div class="accordion-section">
      <div class="accordion-header" onclick="toggleAccordion(this)">
        <div>
          <div class="acc-title">${sec.title || ''}</div>
          <div class="acc-sub">${sec.subtitle || ''}</div>
        </div>
        <div class="acc-arrow">${idx === 0 ? '▲' : '▼'}</div>
      </div>
      <div class="accordion-body ${idx === 0 ? '' : 'closed'}">
        <div class="section-html">${sec.content_html || ''}</div>
        ${sec.tip ? `<div class="tip-box">${sec.tip}</div>` : ''}
      </div>
    </div>
  `).join('');
}

function toggleAccordion(el) {
  const body = el.nextElementSibling;
  body.classList.toggle('closed');
  el.querySelector('.acc-arrow').textContent = body.classList.contains('closed') ? '▼' : '▲';
}

function copyCurrentText() {
  const txt = document.querySelector('.center-col').innerText.trim();
  navigator.clipboard.writeText(txt);
}

function renderAll() {
  renderMain();
  renderSub();
  renderCat();
  renderContent();
}

// URL 파라미터로 스크립트 자동 선택
function selectScriptByName(scriptName) {
  if (!scriptName) return;
  // MENU_CONFIG 전체 순회하며 cat 이름 매칭
  for (const mainKey of MAIN_KEYS) {
    const conf = MENU_CONFIG[mainKey];
    if (conf.groups) {
      for (const subKey of Object.keys(conf.groups)) {
        for (const [title, screen] of conf.groups[subKey]) {
          if (screen === scriptName) {
            state.main = mainKey;
            state.sub = subKey;
            state.cat = screen;
            renderAll();
            return;
          }
        }
      }
    } else {
      for (const [title, screen] of conf.screens) {
        if (screen === scriptName) {
          state.main = mainKey;
          state.sub = '';
          state.cat = screen;
          renderAll();
          return;
        }
      }
    }
  }
}

renderAll();

// URL ?script= 파라미터 처리
const _scriptParam = new URLSearchParams(window.location.search).get('script');
if (_scriptParam) {
  selectScriptByName(decodeURIComponent(_scriptParam));
}

// ── 사용자 정보 로드 ──
const SUPABASE_URL = 'https://qursjteiovcylqiepmlo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_JG_lIUT7MjcLwel1oa-BZg_o_IDOCIL';

// ── 토큰 관리 (자동 갱신) ──
function getToken() {
  return localStorage.getItem('os_token') || sessionStorage.getItem('os_token');
}
function getUserId() {
  const u = JSON.parse(localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}');
  return u.id || null;
}
async function refreshToken() {
  const refreshTk = localStorage.getItem('os_refresh_token');
  if (!refreshTk) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({ refresh_token: refreshTk })
    });
    if (!res.ok) return null;
    const data = await res.json();
    localStorage.setItem('os_token', data.access_token);
    localStorage.setItem('os_refresh_token', data.refresh_token);
    localStorage.setItem('os_user', JSON.stringify(data.user));
    sessionStorage.setItem('os_token', data.access_token);
    sessionStorage.setItem('os_user', JSON.stringify(data.user));
    window._userToken = data.access_token;
    return data.access_token;
  } catch(e) { return null; }
}
async function fetchWithAuth(url, options = {}) {
  options.headers = options.headers || {};
  options.headers['apikey'] = SUPABASE_KEY;
  options.headers['Authorization'] = `Bearer ${window._userToken}`;
  let res = await fetch(url, options);
  if (res.status === 401) {
    const newToken = await refreshToken();
    if (!newToken) { handleTokenExpired(); throw new Error('TOKEN_EXPIRED'); }
    options.headers['Authorization'] = `Bearer ${newToken}`;
    res = await fetch(url, options);
  }
  return res;
}
function handleTokenExpired() {
  alert('로그인 세션이 만료됐습니다.\n다시 로그인해 주세요.');
  localStorage.removeItem('os_token');
  localStorage.removeItem('os_refresh_token');
  localStorage.removeItem('os_user');
  sessionStorage.removeItem('os_token');
  sessionStorage.removeItem('os_user');
  window.location.href = 'login.html';
}


const ROLE_LABEL = {
  member: '팀장',
  manager: '실장',
  branch_manager: '지점장',
  staff: '스텝'
};

async function loadUserInfo() {
  const token = getToken();
  const authUser = JSON.parse(localStorage.getItem('os_user') || sessionStorage.getItem('os_user') || '{}');
  if (!token || !authUser.id) { window.location.href = 'login.html'; return; }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${authUser.id}&select=name,role,phone,email,company,branch,team`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data && data[0]) {
      const u = data[0];
      const roleLabel = ROLE_LABEL[u.role] || '';
      const displayName = `${u.name} ${roleLabel}`;
      const emailStr = u.email || '';
      // topbar-user: app.html에서 처리
      // greeting-name: scripts 페이지에 없음
      // 수정 폼에 현재값 채우기
      document.getElementById('edit-name').value = u.name || '';
      document.getElementById('edit-phone').value = u.phone || '';
      document.getElementById('edit-email').value = u.email || '';
      document.getElementById('edit-company').value = u.company || '';
      document.getElementById('edit-branch').value = u.branch || '';
      document.getElementById('edit-team').value = u.team || '';
      // 전역 저장
      window._userId = authUser.id;
      window._userToken = token;
      window._userEmail = u.email;
      // 배너 없음
    }
  } catch(e) { console.error(e); }
}
loadUserInfo();

// ── 개인정보 수정 모달 ──
function toggleUserDropdown(event) {
  if (event) event.stopPropagation();
  document.getElementById('user-dropdown').classList.toggle('open');
}
document.addEventListener('click', function(e) {
  const wrap = document.getElementById('user-dropdown-wrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('user-dropdown').classList.remove('open');
  }
});

function openEditProfile() {
  document.getElementById('edit-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeEditProfile() {
  document.getElementById('edit-overlay').classList.remove('active');
  document.body.style.overflow = '';
}
window.addEventListener('load', function() {
  document.getElementById('edit-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeEditProfile();
  });
});

async function saveProfile() {
  const name    = document.getElementById('edit-name').value.trim();
  const phone   = document.getElementById('edit-phone').value.trim();
  const company = document.getElementById('edit-company').value.trim();
  const branch  = document.getElementById('edit-branch').value.trim();
  const team    = document.getElementById('edit-team').value.trim();
  if (!name) { alert('이름을 입력해 주세요.'); return; }
  const saveBtn = document.getElementById('edit-save-btn');
  saveBtn.disabled = true; saveBtn.textContent = '저장 중...';
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${window._userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${window._userToken}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ name, phone, company, branch, team })
    });
    if (res.ok) {
      closeEditProfile();
      await loadUserInfo();
    } else {
      alert('저장 중 오류가 발생했습니다.');
    }
  } catch(e) {
    alert('네트워크 오류가 발생했습니다.');
  } finally {
    saveBtn.disabled = false; saveBtn.textContent = '저장하기';
  }
}

// ── 비밀번호 재설정 ──
async function sendPasswordReset() {
  const email = document.getElementById('edit-email').value;
  if (!email) { alert('이메일 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.'); return; }
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({ email })
    });
    if (res.ok) {
      alert(`${email} 으로 비밀번호 재설정 링크를 발송했습니다.\n메일함을 확인해 주세요.`);
    } else {
      alert('발송 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
  } catch(e) {
    alert('네트워크 오류가 발생했습니다.');
  }
}

// ── 로그아웃 ──
function doLogout() {
  localStorage.removeItem('os_token');
  localStorage.removeItem('os_refresh_token');
  localStorage.removeItem('os_user');
  sessionStorage.removeItem('os_token');
  sessionStorage.removeItem('os_user');
  window.location.href = 'index.html';
}

// ── 스크립트 클릭 로그 ──
async function logScriptUsage(main, sub, cat) {
  if (!window._userToken || !window._userId) return;
  try {
    await fetchWithAuth(`${SUPABASE_URL}/rest/v1/script_usage_logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ user_id: window._userId, script_main: main, script_screen: sub, script_title: cat })
    });
  } catch(e) { /* 로그 실패는 무시 */ }
}

// ── app.html에서 호출하는 초기화 함수 ──
window.initScriptsPage = function() {
  // DOM 확인 후 실행
  if (!document.getElementById('main-row') || !document.getElementById('step2')) {
    setTimeout(window.initScriptsPage, 50);
    return;
  }
  renderAll();
  const _scriptParam = new URLSearchParams(window.location.search).get('script');
  if (_scriptParam) selectScriptByName(decodeURIComponent(_scriptParam));
};

// scripts-page.js 로드 완료 시 자동 초기화
(function _autoInit() {
  if (typeof MENU_CONFIG === 'undefined') {
    // MENU_CONFIG 아직 없으면 대기 (비정상 케이스)
    setTimeout(_autoInit, 50);
    return;
  }
  if (!document.getElementById('main-row')) {
    setTimeout(_autoInit, 50);
    return;
  }
  renderAll();
  var _p = new URLSearchParams(window.location.search).get('script');
  if (_p) selectScriptByName(decodeURIComponent(_p));
})();