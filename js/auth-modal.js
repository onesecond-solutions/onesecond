// ============================================================================
// home_v2.html — hover preview / Read more = 실제 페이지 진입 / 통합 인증 모달
// 5/15 후 root index.html로 이전 시 아래 3 라인만 변경:
//   PREVIEW_BASE → 'assets/images/preview/'
//   PAGES_BASE   → 'pages/'
//   LOGO_SRC     → 'assets/images/logo/logo03.jpg'
// ============================================================================
var PREVIEW_BASE = '../assets/images/preview/';
var PAGES_BASE   = '';
var LOGO_SRC     = '../assets/images/logo/logo03.jpg';

var SUPABASE_URL = 'https://pdnwgzneooyygfejrvbg.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkbndnem5lb295eWdmZWpydmJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NDc5ODgsImV4cCI6MjA5MjQyMzk4OH0.I79w8Jk-pPgoLHNrcSLhem88jz6_azcDOqglBZjRjPs';

// 로고 src 주입 (5/15 후 이전 시 위 LOGO_SRC만 갱신)
(function () {
  var logoEl = document.getElementById('logoImg');
  if (logoEl) logoEl.src = LOGO_SRC;
})();

// ─────────────────────────────────────────────
//  hover preview 데이터 (5종 image + home/together text 분기는 자산 추가에 따라 갱신)
// ─────────────────────────────────────────────
var previewData = {
  home: {
    type: 'text',
    title: '오늘의 흐름',
    text: '스크립트 · 현장 질문 · Quick · 내 자료까지, 상담 흐름을 한 화면에서 이어갑니다.',
    href: null
  },
  board: {
    type: 'image',
    alt: '현장의 소리 페이지 미리보기',
    src: PREVIEW_BASE + 'board.jpg',
    fallback: '현장의 소리 미리보기 이미지는 assets/images/preview/board.jpg 경로에 있어야 합니다.',
    href: PAGES_BASE + 'board.html'
  },
  quick: {
    type: 'image',
    alt: 'Quick 메뉴 페이지 미리보기',
    src: PREVIEW_BASE + 'quick.jpg',
    fallback: 'Quick 미리보기 이미지는 assets/images/preview/quick.jpg 경로에 있어야 합니다.',
    href: PAGES_BASE + 'quick.html'
  },
  scripts: {
    type: 'image',
    alt: '스크립트 페이지 미리보기',
    src: PREVIEW_BASE + 'scripts.jpg',
    fallback: '스크립트 미리보기 이미지는 assets/images/preview/scripts.jpg 경로에 있어야 합니다.',
    href: PAGES_BASE + 'scripts.html'
  },
  myspace: {
    type: 'image',
    alt: '라이브러리 페이지 미리보기',
    src: PREVIEW_BASE + 'myspace.jpg',
    fallback: '라이브러리 미리보기 이미지는 assets/images/preview/myspace.jpg 경로에 있어야 합니다.',
    href: PAGES_BASE + 'myspace.html'
  },
  together: {
    type: 'image',
    alt: '함께해요 페이지 미리보기',
    src: PREVIEW_BASE + 'together.jpg',
    fallback: '함께해요 미리보기 이미지는 assets/images/preview/together.jpg 경로에 있어야 합니다.',
    href: PAGES_BASE + 'together.html'
  }
};

var currentPreview = 'home';

function escapeText(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function updatePreview(key) {
  var data = previewData[key] || previewData.home;
  var hero = document.getElementById('hero');
  var box = document.getElementById('previewBox');
  var content = document.getElementById('previewContent');
  var readmore = document.getElementById('readmoreBtn');

  if (!box || !content) return;
  currentPreview = key;

  if (hero) {
    if (key === 'home') hero.classList.remove('preview-open');
    else hero.classList.add('preview-open');
  }

  box.classList.remove('preview-active', 'preview-image-mode');

  window.requestAnimationFrame(function () {
    if (data.type === 'image') {
      box.classList.add('preview-image-mode');
      var img = document.createElement('img');
      img.className = 'preview-image';
      img.src = data.src;
      img.alt = data.alt || '';
      img.onerror = function () {
        var div = document.createElement('div');
        div.className = 'preview-fallback';
        div.textContent = data.fallback || '미리보기 이미지를 불러오지 못했습니다.';
        if (img.parentNode) img.parentNode.replaceChild(div, img);
      };
      content.innerHTML = '';
      content.appendChild(img);
    } else {
      content.innerHTML =
        '<div class="preview-title">' + escapeText(data.title) + '</div>' +
        '<div class="preview-text">' + escapeText(data.text) + '</div>';
    }
    box.classList.add('preview-active');
  });

  if (readmore) {
    if (data.href) readmore.removeAttribute('disabled');
    else readmore.setAttribute('disabled', 'disabled');
  }
}

// 메뉴 + 카드 hover/focus → preview
(function () {
  var hoverEls = document.querySelectorAll('[data-preview]');
  for (var i = 0; i < hoverEls.length; i++) {
    (function (el) {
      el.addEventListener('mouseenter', function () { updatePreview(el.dataset.preview); });
      el.addEventListener('focus',      function () { updatePreview(el.dataset.preview); });
    })(hoverEls[i]);
  }
  // 카드 클릭 → 페이지 진입 (메뉴 클릭은 진입 X — Read more 트리거)
  var cardEls = document.querySelectorAll('.card[data-preview]');
  for (var j = 0; j < cardEls.length; j++) {
    (function (el) {
      el.addEventListener('click', function () {
        var data = previewData[el.dataset.preview];
        if (data && data.href) window.location.href = data.href;
      });
    })(cardEls[j]);
  }
  // Read more → currentPreview 진입
  var readmoreBtn = document.getElementById('readmoreBtn');
  if (readmoreBtn) {
    readmoreBtn.addEventListener('click', function () {
      var data = previewData[currentPreview];
      if (data && data.href) window.location.href = data.href;
    });
  }
  updatePreview('home');
})();

// ============================================================================
//  통합 인증 모달 — 모달 컨트롤 (open/close/ESC/외부클릭/자동 스크롤·포커스)
// ============================================================================
// ============================================================================
//  v2 step navigation (카카오 톤, multi-step 본진)
// ============================================================================
var _authCurrentStep = 'login';

function openAuthModal(focusSection) {
  var overlay = document.getElementById('authOverlay');
  if (!overlay) return;
  var startStep = (focusSection === 'signup') ? 'signup-1' : 'login';
  _showStep(startStep);
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
  var overlay = document.getElementById('authOverlay');
  if (!overlay) return;
  overlay.hidden = true;
  document.body.style.overflow = '';
}

// step 표시 + CTA + 진행 본진 + back 박음 통째
function _showStep(step) {
  _authCurrentStep = step;
  var pages = document.querySelectorAll('.auth-step-page');
  pages.forEach(function(p) { p.classList.remove('is-active'); });
  var target = document.getElementById('page-' + step);
  if (target) target.classList.add('is-active');

  var body = document.getElementById('authBody');
  if (body) body.scrollTop = 0;

  // CTA 박음 (step별 분기)
  var ctaArea  = document.getElementById('authCtaArea');
  var ctaBtn   = document.getElementById('authMainCta');
  var ctaTxt   = document.getElementById('authMainCtaTxt');
  var crossLnk = document.getElementById('authCrossLink');
  var crossTxt = document.getElementById('authCrossLinkText');
  var crossBtn = document.getElementById('authCrossLinkBtn');
  var back     = document.getElementById('authBackBtn');
  var progress = document.getElementById('authProgress');

  // 모든 자리 default reset
  if (ctaArea)  ctaArea.style.display = '';
  if (back)     back.hidden = true;
  if (progress) progress.hidden = true;
  if (crossLnk) crossLnk.style.display = 'block';

  if (step === 'login') {
    if (ctaTxt)   ctaTxt.textContent = '✉️ 인증 코드 받기';
    if (ctaBtn)   ctaBtn.onclick = function() { doLogin(); };
    if (crossTxt) crossTxt.textContent = '처음 오셨나요?';
    if (crossBtn) { crossBtn.textContent = '회원가입하기 →'; crossBtn.onclick = function() { window.switchAuthSection('signup'); }; }
    setTimeout(function() {
      var el = document.getElementById('f-email-login');
      if (el) el.focus();
    }, 80);
  }
  else if (step === 'otp-verify') {
    if (ctaTxt) ctaTxt.textContent = '인증 확인';
    if (ctaBtn) ctaBtn.onclick = function() { verifyOtp(); };
    if (back) {
      back.hidden = false;
      back.onclick = function() {
        _showStep(_otpMode === 'signup' ? 'signup-3' : 'login');
      };
    }
    if (crossLnk) crossLnk.style.display = 'none';
  }
  else if (step === 'signup-1') {
    if (ctaArea)  ctaArea.style.display = 'none'; // Step 1 = 카드 클릭 = 자동 진입
    if (crossTxt) crossTxt.textContent = '이미 회원이신가요?';
    if (crossBtn) { crossBtn.textContent = '로그인 →'; crossBtn.onclick = function() { window.switchAuthSection('login'); }; }
    if (progress) { progress.hidden = false; _setProgress(1); }
  }
  else if (step === 'signup-2') {
    if (ctaTxt)   ctaTxt.textContent = '다음 →';
    if (ctaBtn)   ctaBtn.onclick = function() { window.authNextSignup3(); };
    if (back)     { back.hidden = false; back.onclick = function() { _showStep('signup-1'); }; }
    if (crossLnk) crossLnk.style.display = 'none';
    if (progress) { progress.hidden = false; _setProgress(2); }
    setTimeout(function() {
      var el = document.getElementById('f-name');
      if (el) el.focus();
    }, 80);
  }
  else if (step === 'signup-3') {
    /* 2026-05-28: site 분기 — GA = 이메일 OTP / 보험사 = 카카오 승인 요청 (signup API + 임시 비번) */
    var _isInsurer = window.gSignupSite === 'insurer';
    if (ctaTxt)   ctaTxt.textContent = _isInsurer ? '💬 카카오톡 승인 요청' : '✉️ 인증 코드 받기';
    if (ctaBtn) {
      ctaBtn.onclick = _isInsurer ? function() { doInsurerKakaoSignup(); } : function() { doSubmit(); };
      /* 카카오 노란색 (#FEE500 + 검정 텍스트) — 보험사 분기만 적용, GA는 원복 */
      if (_isInsurer) {
        ctaBtn.style.background = '#FEE500';
        ctaBtn.style.color = '#000';
      } else {
        ctaBtn.style.background = '';
        ctaBtn.style.color = '';
      }
    }
    if (back)     { back.hidden = false; back.onclick = function() { _showStep('signup-2'); }; }
    if (crossLnk) crossLnk.style.display = 'none';
    if (progress) { progress.hidden = false; _setProgress(3); }
  }
  else if (step === 'login-success' || step === 'signup-success') {
    if (ctaArea)  ctaArea.style.display = 'none';
    if (crossLnk) crossLnk.style.display = 'none';
  }
}

function _setProgress(activeIdx) {
  var dots = document.querySelectorAll('#authProgress span');
  dots.forEach(function(d, i) {
    if (i < activeIdx) d.classList.add('is-active');
    else               d.classList.remove('is-active');
  });
}

window.authPrev = function() {
  var back = document.getElementById('authBackBtn');
  if (back && !back.hidden && back.onclick) back.onclick();
};

window.authNextSignup = function() {
  // Step 1 카드 클릭 후 호출 — Step 2 진입
  _showStep('signup-2');
};

window.authNextSignup3 = function () {
  /* 2026-05-28 PR-OTP: signup-2 → signup-3 진입 시 사전 폼 검증 강제.
     consent 검사는 signup-3 자리(validateSignup) — 본 함수는 그 외만 점검. */
  if (!_validateSignupStep2Inline()) return;
  _showStep('signup-3');
};

function _validateSignupStep2Inline() {
  var ok = true;
  var errBox = document.getElementById('signupErrBox');
  errBox.classList.remove('on');

  if (!window.gSignupSite) {
    errBox.textContent = '상단 카드에서 보험사 임직원 또는 GA 중 하나를 선택해 주세요.';
    errBox.classList.add('on');
    return false;
  }
  ['f-name','f-phone'].forEach(function (id) {
    var el = document.getElementById(id);
    var er = document.getElementById('e-' + id.split('-')[1]);
    if (!el.value.trim()) { el.classList.add('err'); er.classList.add('on'); ok = false; }
    else                  { el.classList.remove('err'); er.classList.remove('on'); }
  });
  var role = document.getElementById('f-role');
  if (!role.value) { role.classList.add('err'); document.getElementById('e-role').classList.add('on'); ok = false; }
  else             { role.classList.remove('err'); document.getElementById('e-role').classList.remove('on'); }
  var email = document.getElementById('f-email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    email.classList.add('err');
    var er2 = document.getElementById('e-email');
    er2.textContent = '올바른 이메일을 입력해 주세요.';
    er2.classList.add('on'); ok = false;
  } else { email.classList.remove('err'); document.getElementById('e-email').classList.remove('on'); }

  if (window.gSignupSite === 'insurer') {
    var ins = document.getElementById('f-insurer');
    if (!ins.value) {
      ins.classList.add('err'); document.getElementById('e-insurer').classList.add('on'); ok = false;
    } else {
      ins.classList.remove('err'); document.getElementById('e-insurer').classList.remove('on');
    }
    /* 2026-05-30: 담당 지점 1개 이상 필수 */
    if (_collectInsurerBranchNames().length === 0) {
      document.getElementById('e-insurer-branch').classList.add('on'); ok = false;
    } else {
      document.getElementById('e-insurer-branch').classList.remove('on');
    }
    if (!window.gInsurerOtpVerified) {
      errBox.textContent = '이메일 인증을 먼저 통과해 주세요. ([인증 코드 받기] → 코드 입력 → [확인])';
      errBox.classList.add('on');
      ok = false;
    }
  }

  return ok;
}

window.switchAuthSection = function(target) {
  if (target === 'signup') _showStep('signup-1');
  else                     _showStep('login');
};

// ESC 닫기 + 외부 클릭 닫기 + 엔터 로그인 (v2 step 본진 정합)
document.addEventListener('keydown', function (e) {
  var overlay = document.getElementById('authOverlay');
  if (!overlay || overlay.hidden) return;
  if (e.key === 'Escape') closeAuthModal();
  // 엔터키 = step별 분기
  if (e.key === 'Enter') {
    var ae = document.activeElement;
    if (!ae) return;
    if (_authCurrentStep === 'login' && ae.id === 'f-email-login') {
      e.preventDefault();
      doLogin();
    } else if (_authCurrentStep === 'otp-verify' && ae.id === 'f-otp-code') {
      e.preventDefault();
      verifyOtp();
    }
  }
});

(function () {
  var overlay = document.getElementById('authOverlay');
  if (!overlay) return;
  /* 2026-05-18 드래그 이탈 격차 정정 정합 (commit 0a39e6a 패턴) — input/textarea 안 드래그가 외부로 빠져나가도 모달 닫히지 X */
  overlay.addEventListener('mousedown', function (e) { window._mdOv_auth = e.target; });
  overlay.addEventListener('click', function (e) {
    if (e.target === overlay && window._mdOv_auth === overlay) closeAuthModal();
  });
})();

// URL 파라미터 진입 분기 — login.html → ?auth=login / index.html → ?auth=signup 등 redirect 시 자동 모달 open
(function () {
  try {
    var params = new URLSearchParams(window.location.search);
    var authParam = params.get('auth');
    if (authParam === 'login' || authParam === 'signup') {
      setTimeout(function () { openAuthModal(authParam); }, 120);
    }
  } catch (e) { /* noop */ }
})();

// ============================================================================
//  비밀번호 보기/숨기기 토글 (로그인 + 가입 공용)
// ============================================================================
function togglePw(inputId, btnId) {
  var input = document.getElementById(inputId);
  var btn   = document.getElementById(btnId);
  if (!input || !btn) return;
  if (input.type === 'password') { input.type = 'text';     btn.textContent = '숨기기'; }
  else                           { input.type = 'password'; btn.textContent = '보기';  }
}

function clearFieldError(inputId, errorId) {
  var inp = document.getElementById(inputId);
  var err = document.getElementById(errorId);
  if (inp) inp.classList.remove('err');
  if (err) err.classList.remove('on');
}

// ============================================================================
//  로그인 (login.html doLogin/doForgot 흡수)
// ============================================================================
function validateLogin() {
  var ok = true;
  var email = document.getElementById('f-email-login');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    email.classList.add('err'); document.getElementById('e-email-login').classList.add('on'); ok = false;
  } else { email.classList.remove('err'); document.getElementById('e-email-login').classList.remove('on'); }
  return ok;
}

/* 2026-05-18 OTP 전환: 비밀번호 본진 폐기 → 이메일 6자리 OTP 본진
   - 로그인 = /auth/v1/otp (create_user=false) → /auth/v1/verify (type=email)
   - 가입 = /auth/v1/otp (create_user=true + data 메타) → /auth/v1/verify (type=email)
   - verify 후 access_token 받음 → localStorage 보관 → app.html redirect */
var _otpMode = '';            // 'login' or 'signup'
var _otpEmail = '';           // OTP 요청한 이메일 (재전송 + verify 시 사용)
var _otpSignupData = null;    // 가입 시 메타데이터 보관 (재전송 시 동일 data 다시 보내야)

async function doLogin() {
  var errBox = document.getElementById('loginErrBox');
  errBox.classList.remove('on');
  if (!validateLogin()) return;

  var btn  = document.getElementById('authMainCta');
  var txt  = document.getElementById('authMainCtaTxt');
  var spin = document.getElementById('authMainCtaSpinner');
  if (btn) btn.disabled = true;
  if (txt) txt.style.opacity = '0';
  if (spin) spin.style.display = 'block';

  function _resetBtn() {
    if (btn) btn.disabled = false;
    if (txt) txt.style.opacity = '';
    if (spin) spin.style.display = 'none';
  }

  var email = document.getElementById('f-email-login').value.trim();

  /* 2026-05-28 최종 정책: 4 화이트리스트만 OTP / 비밀번호 로그인 허용.
     - bylts0428@gmail.com / bylts@naver.com / bylts@kakao.com → OTP 발송
     - kcp.review@onesecond.solutions → 비밀번호 로그인 (prompt, 심사용 한정)
     - 그 외 = maintenance.html (Google / doSubmit과 동일 차단)
     화이트리스트 자료 = window.OS_WHITELIST_EMAILS (maintenance-guard.js 단일 진실).
     PR #110 갱신 (2026-05-28) — KG이니시스 심사 담당자 공식 요구 정합. */
  if (window.OS_MAINTENANCE && window.OS_MAINTENANCE.mode === true) {
    var allowed = (typeof window.osIsWhitelistedEmail === 'function')
      ? window.osIsWhitelistedEmail(email)
      : false;
    if (!allowed) {
      _resetBtn();
      window.osShowMaintenance();
      return;
    }
  }

  /* 2026-05-28: kcp.review 한정 비밀번호 로그인 (KG이니시스 심사용).
     - 심사자는 OTP 수신 불가 → 비밀번호 로그인 단독.
     - 비밀번호 = prompt 입력 (코드 평문 X).
     - 다른 화이트리스트 3 계정 = 기존 OTP 흐름 그대로. */
  /* 2026-05-30 임시(검수용): test@meritz 2계정도 비번 로그인 허용 — 원수사 자료실 단계 1 검수 후 제거 예정 */
  var PW_LOGIN_EMAILS = ['kcp.review@onesecond.solutions', 'test@meritz.co.kr', 'test.meritz@meritz.co.kr'];
  if (PW_LOGIN_EMAILS.indexOf(email) !== -1) {
    _resetBtn();
    var password = prompt('비밀번호 입력:');
    if (!password) return;
    try {
      var pwRes = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
        body: JSON.stringify({ email: email, password: password })
      });
      if (!pwRes.ok) {
        var pwErr = {};
        try { pwErr = await pwRes.json(); } catch (_e) {}
        alert('로그인 실패: ' + (pwErr.error_description || pwErr.msg || pwRes.status));
        return;
      }
      var pwData = await pwRes.json();
      var userObj = pwData.user || {};
      if (window.db && typeof window.db.mergeUserProfile === 'function') {
        try { userObj = await window.db.mergeUserProfile(userObj, pwData.access_token); } catch (_e) {}
      }
      localStorage.setItem('os_token', pwData.access_token);
      localStorage.setItem('os_refresh_token', pwData.refresh_token);
      localStorage.setItem('os_user', JSON.stringify(userObj));
      sessionStorage.setItem('os_token', pwData.access_token);
      sessionStorage.setItem('os_user', JSON.stringify(userObj));
      window.location.href = '/app.html';
    } catch (e) {
      console.error('[kcp.review login]', e);
      alert('로그인 오류: ' + (e && e.message ? e.message : '알 수 없는 오류'));
    }
    return;
  }

  try {
    var res = await fetch(SUPABASE_URL + '/auth/v1/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({
        email: email,
        create_user: false   /* 로그인 = 미가입 시 에러 */
      })
    });

    if (res.ok) {
      _otpMode = 'login';
      _otpEmail = email;
      _otpSignupData = null;
      _resetBtn();
      _showStep('otp-verify');
      var targetEl = document.getElementById('otp-target-email');
      if (targetEl) targetEl.textContent = email;
      setTimeout(function() {
        var codeEl = document.getElementById('f-otp-code');
        if (codeEl) { codeEl.value = ''; codeEl.focus(); }
      }, 100);
    } else {
      var data = {};
      try { data = await res.json(); } catch (e) {}
      var msg = (data.error_description || data.msg || data.error || '').toLowerCase();
      if (msg.indexOf('signups not allowed') !== -1 || msg.indexOf('user not found') !== -1 || msg.indexOf('not found') !== -1) {
        errBox.textContent = '가입되지 않은 이메일입니다. 아래에서 회원가입을 진행해 주세요.';
      } else if (msg.indexOf('too many requests') !== -1 || res.status === 429) {
        errBox.textContent = '잠시 후 다시 시도해 주세요. (요청이 너무 많습니다)';
      } else if (res.status === 400) {
        errBox.textContent = '가입되지 않은 이메일이거나 잘못된 형식입니다.';
      } else {
        errBox.textContent = '인증 코드 발송 중 오류가 발생했습니다. (' + res.status + ')';
      }
      errBox.classList.add('on');
      _resetBtn();
    }
  } catch (e) {
    console.error('[login otp error]', e);
    errBox.textContent = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.';
    errBox.classList.add('on');
    _resetBtn();
  }
}

/* 가입 + 로그인 공용 OTP 6자리 검증 */
async function verifyOtp() {
  var errBox = document.getElementById('otpErrBox');
  errBox.classList.remove('on');
  var codeEl = document.getElementById('f-otp-code');
  var code = (codeEl.value || '').trim();
  if (!/^\d{6}$/.test(code)) {
    document.getElementById('e-otp-code').classList.add('on');
    codeEl.focus();
    return;
  }
  document.getElementById('e-otp-code').classList.remove('on');

  var btn  = document.getElementById('authMainCta');
  var txt  = document.getElementById('authMainCtaTxt');
  var spin = document.getElementById('authMainCtaSpinner');
  if (btn) btn.disabled = true;
  if (txt) txt.style.opacity = '0';
  if (spin) spin.style.display = 'block';

  function _resetBtn() {
    if (btn) btn.disabled = false;
    if (txt) txt.style.opacity = '';
    if (spin) spin.style.display = 'none';
  }

  try {
    var res = await fetch(SUPABASE_URL + '/auth/v1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({
        email: _otpEmail,
        token: code,
        type: 'email'
      })
    });
    var data = await res.json();

    if (res.ok && data.access_token) {
      /* 2026-05-27: public.users role/name/plan을 os_user에 박아 넣음.
         maintenance-guard.js (head 최상단 가동, AppState 박히기 전)가
         localStorage os_user.role === 'admin' 만으로 admin 통과 판정.
         fetch 실패해도 인증 흐름은 중단 X (auth.js loadUser가 후속 갱신). */
      var userObj = data.user || {};
      try {
        var profRes = await fetch(
          SUPABASE_URL + '/rest/v1/users?id=eq.' + encodeURIComponent(userObj.id)
          + '&select=role,name,plan',
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': 'Bearer ' + data.access_token
            }
          }
        );
        if (profRes.ok) {
          var rows = await profRes.json();
          if (rows && rows[0]) {
            userObj.role = rows[0].role || '';
            userObj.name = rows[0].name || '';
            userObj.plan = rows[0].plan || 'free';
          }
        }
      } catch (_e) { /* role 박지 못해도 인증은 계속 진행 */ }

      localStorage.setItem('os_token', data.access_token);
      localStorage.setItem('os_refresh_token', data.refresh_token);
      localStorage.setItem('os_user', JSON.stringify(userObj));
      sessionStorage.setItem('os_token', data.access_token);
      sessionStorage.setItem('os_user', JSON.stringify(userObj));

      _resetBtn();

      if (_otpMode === 'signup') {
        var descEl = document.getElementById('signup-success-desc');
        var pendingNoticeEl = document.getElementById('pending-notice');
        var site = (_otpSignupData && _otpSignupData.site) || 'ga';
        if (descEl) {
          descEl.innerHTML = '<strong>' + escapeText(_otpEmail) + '</strong><br>가입이 완료됐습니다!<br>잠시 후 메인 화면으로 이동합니다 😊';
        }
        if (pendingNoticeEl) {
          pendingNoticeEl.style.display = (site === 'insurer') ? 'block' : 'none';
        }
        _showStep('signup-success');
        setTimeout(function () {
          /* 2026-05-27 핫픽스: 상대 경로 격차 정정.
             /pages/landing.html에서 OTP 인증 시 → /pages/app.html 404 격차.
             절대 경로 / 자료로 정정 (어느 페이지에서 가동해도 /app.html 정합). */
          window.location.href = '/app.html';
        }, 1800);
      } else {
        _showStep('login-success');
        setTimeout(function () {
          var _r = new URLSearchParams(window.location.search).get('redirect');
          var appUrl = '/app.html';
          window.location.href = _r ? appUrl + '?redirect=' + encodeURIComponent(_r) : appUrl;
        }, 1200);
      }
    } else {
      var msg = (data.error_description || data.msg || data.error || '').toLowerCase();
      if (msg.indexOf('expired') !== -1 || msg.indexOf('invalid') !== -1 || res.status === 401 || res.status === 403) {
        errBox.textContent = '인증 코드가 일치하지 않거나 만료됐습니다. [재전송]으로 새 코드를 받아주세요.';
      } else if (res.status === 429) {
        errBox.textContent = '잠시 후 다시 시도해 주세요. (요청이 너무 많습니다)';
      } else {
        errBox.textContent = '인증 중 오류가 발생했습니다. (' + res.status + ')';
      }
      errBox.classList.add('on');
      _resetBtn();
      codeEl.focus();
      codeEl.select();
    }
  } catch (e) {
    console.error('[verify otp error]', e);
    errBox.textContent = '네트워크 오류가 발생했습니다.';
    errBox.classList.add('on');
    _resetBtn();
  }
}

/* 인증 코드 재전송 (가입 + 로그인 공용) */
async function resendOtp() {
  var btn = document.getElementById('otpResendBtn');
  if (!btn || !_otpEmail) return;
  var oldText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '발송 중…';

  try {
    var body = { email: _otpEmail, create_user: (_otpMode === 'signup') };
    if (_otpMode === 'signup' && _otpSignupData && _otpSignupData.data) {
      body.data = _otpSignupData.data;
    }
    var res = await fetch(SUPABASE_URL + '/auth/v1/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify(body)
    });
    if (res.ok) {
      btn.textContent = '✅ 재전송 완료';
      setTimeout(function () { btn.textContent = oldText; btn.disabled = false; }, 3000);
    } else if (res.status === 429) {
      btn.textContent = '잠시 후 다시 시도 (요청 한도)';
      setTimeout(function () { btn.textContent = oldText; btn.disabled = false; }, 5000);
    } else {
      btn.textContent = '재전송 실패';
      setTimeout(function () { btn.textContent = oldText; btn.disabled = false; }, 3000);
    }
  } catch (e) {
    btn.textContent = '네트워크 오류';
    setTimeout(function () { btn.textContent = oldText; btn.disabled = false; }, 3000);
  }
}

/* 2026-05-18 Google OAuth 본진 (Phase 1 = 로그인 본진)
   - Supabase Authorize 엔드포인트 진입 → Google OAuth 박힘 → 인증 후 redirect_to URL fragment 토큰 박힘
   - app.html 진입 시 js/auth.js의 _handleOAuthCallback이 fragment 파싱 + localStorage 박음
   - 사용자 동일 이메일 정합 매칭 = Supabase Dashboard "Allow manual linking" ON 박혀 있어야 함 */
function _pkceVerifier() {
  var arr = new Uint8Array(64);
  (window.crypto || window.msCrypto).getRandomValues(arr);
  var cs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~', s = '';
  for (var i = 0; i < arr.length; i++) s += cs[arr[i] % cs.length];
  return s;
}
async function _pkceChallenge(verifier) {
  var data = new TextEncoder().encode(verifier);
  var digest = await window.crypto.subtle.digest('SHA-256', data);
  var bytes = new Uint8Array(digest), bin = '';
  for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function signInWithGoogle() {
  /* 2026-06-04: PKCE 강제 — code_challenge 전송 → Supabase가 ?code 반환 → app.html에서
     code_verifier로 교환(js/auth.js _handleOAuthCallback). implicit(#access_token) 폴백 유지. */
  try {
    var verifier = _pkceVerifier();
    try { localStorage.setItem('os_pkce_verifier', verifier); sessionStorage.setItem('os_pkce_verifier', verifier); } catch (e) {}
    var challenge = await _pkceChallenge(verifier);
    var redirectTo = window.location.origin + '/app.html';
    var url = SUPABASE_URL + '/auth/v1/authorize'
            + '?provider=google'
            + '&code_challenge=' + encodeURIComponent(challenge)
            + '&code_challenge_method=S256'
            + '&redirect_to=' + encodeURIComponent(redirectTo);
    window.location.href = url;
  } catch (e) {
    alert('Google 로그인 시작 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  }
}

// ============================================================================
//  가입 (Step 5-C 흡수: site-picker / 도메인 화이트리스트 / 9 role 매핑 / signup endpoint)
// ============================================================================
var INSURER_DOMAINS = {
  'aig-fire':       '@aig.com',
  'db-fire':        '@dbins.co.kr',
  'kb-fire':        '@kbinsure.co.kr',
  'nh-fire':        '@nonghyup.com',
  'lina-fire':      '@chubb.com',
  'lotte-fire':     '@lotteins.co.kr',
  'meritz':         '@meritz.co.kr',
  'samsung-fire':   '@samsung.com',
  'hanwha-fire':    '@hanwha.com',
  'heungkuk-fire':  '@heungkukfire.co.kr',
  'abl':            '@abllife.co.kr',
  'aia':            '@aia.com',
  'bnp-cardif':     '@cardif.co.kr',
  'ibk':            '@ibki.co.kr',
  'kdb':            '@kdblife.co.kr',
  'nh-life':        '@nonghyup.com',
  'kyobo':          '@kyobo.com',
  'dongyang':       '@myangel.co.kr',
  'lina-life':      '@cigna.com',
  'metlife':        '@metlife.com',
  'miraeasset':     '@miraeasset.com',
  'samsung-life':   '@samsunglife.com',
  'shinhan':        '@shinhan.com',
  'chubb':          '@chubb.com',
  'fubon-hyundai':  '@fubonhyundai.com',
  'hanwha-life':    '@hanwha.com',
  'heungkuk-elife': '@heungkuklife.co.kr',
  'heungkuk-tlife': '@heungkuklife.co.kr'
  // db-life / im-life / kb-life — domain NULL (별 트랙 #43 사후 검증)
};

// ─────────────────────────────────────────────
//  signup 모달 select 동적 lookup (별 트랙 #46)
//    · insurers 31건 → optgroup 손해/생명 동적
//    · branches (AZ금융 한정) → 동적
//    · teams (branch cascade) → 동적
//    · option value = UUID 직접 / data-slug 보존 (INSURER_DOMAINS lookup 정합)
// ─────────────────────────────────────────────
var _signupSelectsLoaded = false;

async function loadSignupSelects() {
  if (_signupSelectsLoaded) return;
  _signupSelectsLoaded = true;
  var headers = { 'apikey': SUPABASE_KEY };
  try {
    var insRes = await fetch(SUPABASE_URL + '/rest/v1/insurers?is_active=eq.true&select=id,slug,name,type&order=type,name', { headers: headers });
    var insurers = insRes.ok ? await insRes.json() : [];
    populateInsurerSelect(insurers);
    /* 2026-05-30 B안: 담당 지점 = input 자유 입력 → branches fetch 불필요 (admin 승인 시 매핑) */
    /* 2026-05-28: GA 분기 지점/팀 select 듀얼 폐기 → 단일 input.
       branches/teams fetch + populateBranchSelect + loadTeamsByBranch 호출 제거. */
  } catch (e) {
    console.error('[loadSignupSelects 실패]', e);
    _signupSelectsLoaded = false;
  }
}

function populateInsurerSelect(insurers) {
  var sel = document.getElementById('f-insurer');
  if (!sel) return;
  sel.innerHTML = '';
  var ph = document.createElement('option');
  ph.value = '';
  ph.textContent = '선택해 주세요';
  sel.appendChild(ph);
  var groups = {};
  for (var i = 0; i < insurers.length; i++) {
    var ins = insurers[i];
    var label = ins.type || '기타';
    if (!groups[label]) groups[label] = [];
    groups[label].push(ins);
  }
  var order = ['손해보험', '생명보험'];
  for (var k = 0; k < order.length; k++) {
    var lab = order[k];
    if (!groups[lab]) continue;
    var og = document.createElement('optgroup');
    og.label = lab;
    for (var j = 0; j < groups[lab].length; j++) {
      var row = groups[lab][j];
      var opt = document.createElement('option');
      opt.value = row.id;
      opt.setAttribute('data-slug', row.slug || '');
      opt.textContent = row.name;
      og.appendChild(opt);
    }
    sel.appendChild(og);
    delete groups[lab];
  }
  var remaining = Object.keys(groups);
  for (var r = 0; r < remaining.length; r++) {
    var labR = remaining[r];
    var ogR = document.createElement('optgroup');
    ogR.label = labR;
    for (var jj = 0; jj < groups[labR].length; jj++) {
      var rowR = groups[labR][jj];
      var optR = document.createElement('option');
      optR.value = rowR.id;
      optR.setAttribute('data-slug', rowR.slug || '');
      optR.textContent = rowR.name;
      ogR.appendChild(optR);
    }
    sel.appendChild(ogR);
  }
}

/* 2026-05-30 B안: 보험사 임직원 담당 지점 = input 자유 입력 (멀티, branch_id는 admin 승인 시 매핑) */
window.addInsurerBranchRow = function(){
  var rows = document.getElementById('insurer-branch-rows');
  if (!rows) return;
  var row = document.createElement('div');
  row.className = 'insurer-branch-row';
  row.innerHTML = '<input class="auth-input insurer-branch-inp" type="text" placeholder="담당 지점 입력" maxlength="50">'
    + '<button type="button" class="auth-branch-del" onclick="this.parentElement.remove()" aria-label="담당 지점 삭제">&#10005;</button>';
  rows.appendChild(row);
};
function _collectInsurerBranchNames(){
  var inps = document.querySelectorAll('.insurer-branch-inp');
  var names = [], seen = {};
  for (var i = 0; i < inps.length; i++){
    var v = (inps[i].value || '').trim();
    if (v && !seen[v]) { seen[v] = 1; names.push(v); }
  }
  return names;
}

function populateBranchSelect(branches) {
  var sel = document.getElementById('f-branch-select');
  if (!sel) return;
  sel.innerHTML = '';
  var ph = document.createElement('option');
  ph.value = '';
  ph.textContent = branches.length ? '지점을 선택하세요' : '등록된 지점이 없습니다 — 기타 입력';
  sel.appendChild(ph);
  for (var i = 0; i < branches.length; i++) {
    var b = branches[i];
    var opt = document.createElement('option');
    opt.value = b.id;
    opt.setAttribute('data-name', b.name || '');
    opt.textContent = b.name;
    sel.appendChild(opt);
  }
  var other = document.createElement('option');
  other.value = '__other__';
  other.setAttribute('data-name', '');
  other.textContent = '기타 입력';
  sel.appendChild(other);
}

function populateTeamSelect(teams) {
  var sel = document.getElementById('f-team-select');
  if (!sel) return;
  sel.innerHTML = '';
  var ph = document.createElement('option');
  ph.value = '';
  ph.textContent = '선택 안 함';
  sel.appendChild(ph);
  for (var i = 0; i < teams.length; i++) {
    var t = teams[i];
    var opt = document.createElement('option');
    opt.value = t.id;
    opt.setAttribute('data-name', t.name || '');
    opt.textContent = t.name;
    sel.appendChild(opt);
  }
  var other = document.createElement('option');
  other.value = '__other__';
  other.setAttribute('data-name', '');
  other.textContent = '기타 입력';
  sel.appendChild(other);
}

function clearTeamSelect() {
  var sel = document.getElementById('f-team-select');
  if (!sel) return;
  sel.innerHTML = '';
  var ph = document.createElement('option');
  ph.value = '';
  ph.textContent = '선택 안 함';
  sel.appendChild(ph);
  var other = document.createElement('option');
  other.value = '__other__';
  other.setAttribute('data-name', '');
  other.textContent = '기타 입력';
  sel.appendChild(other);
}

async function loadTeamsByBranch(branchId) {
  if (!branchId || branchId === '__other__' || branchId === '') {
    clearTeamSelect();
    return;
  }
  try {
    var res = await fetch(SUPABASE_URL + '/rest/v1/teams?branch_id=eq.' + encodeURIComponent(branchId) + '&is_active=eq.true&select=id,name&order=name', {
      headers: { 'apikey': SUPABASE_KEY }
    });
    var teams = res.ok ? await res.json() : [];
    populateTeamSelect(teams);
  } catch (e) {
    console.error('[loadTeamsByBranch 실패]', e);
    clearTeamSelect();
  }
}

window.loadSignupSelects = loadSignupSelects;
window.loadTeamsByBranch = loadTeamsByBranch;

/* PR-1 (2026-06-12): GA 회사 선택 → 그 회사의 기존 지점 목록 동적 로드. 하드코딩 0. */
async function loadBranchesByCompany(companyId) {
  var bs = document.getElementById('f-branch-select');
  if (!bs) return;
  if (!companyId) { _resetGaBranchTeam(); return; }
  try {
    var res = await fetch(SUPABASE_URL + '/rest/v1/branches?company_id=eq.' + encodeURIComponent(companyId) + '&is_active=eq.true&select=id,name&order=name', { headers: { 'apikey': SUPABASE_KEY } });
    var branches = res.ok ? await res.json() : [];
    populateBranchSelect(branches);
    clearTeamSelect();
    var tt = document.getElementById('f-team-text');
    if (tt) { tt.value = ''; tt.disabled = true; tt.style.opacity = '0.5'; }
  } catch (e) {
    console.error('[loadBranchesByCompany 실패]', e);
  }
}
window.loadBranchesByCompany = loadBranchesByCompany;

/* PR-1: 회사 변경 시 지점/팀 선택 초기화 (재선택 강제) */
function _resetGaBranchTeam() {
  var bs = document.getElementById('f-branch-select');
  if (bs) bs.innerHTML = '<option value="">먼저 회사를 선택하세요</option>';
  var bt = document.getElementById('f-branch-text');
  if (bt) { bt.value = ''; bt.disabled = true; bt.style.opacity = '0.5'; }
  var ts = document.getElementById('f-team-select');
  if (ts) ts.innerHTML = '<option value="">먼저 지점을 선택하세요</option>';
  var tt = document.getElementById('f-team-text');
  if (tt) { tt.value = ''; tt.disabled = true; tt.style.opacity = '0.5'; }
}

window.gSignupSite = null;

/* 보험사 분기 카카오 승인 요청 — _showStep('signup-3') onclick에서 호출 */
window.doInsurerKakaoSignup = function() { return doInsurerKakaoSignup(); };

function selectSite(site) {
  window.gSignupSite = site;
  var cardGa      = document.getElementById('site-card-ga');
  var cardInsurer = document.getElementById('site-card-insurer');
  /* 2026-05-29 PR-OTP-v2: 전체 본문 try/catch 안전망.
     본 함수 안 어느 자료가 throw 해도 함수 중단 X → onclick 다음 줄 window.authNextSignup() 호출 통과.
     PR #155 = try/catch 미적용 → 한 자료 격차 시 카드 클릭 통째 먹통 → 재발 방지. */
  try {
    if (cardGa)      cardGa.classList.toggle('is-active',      site === 'ga');
    if (cardInsurer) cardInsurer.classList.toggle('is-active', site === 'insurer');
    if (cardGa)      cardGa.setAttribute('aria-checked',      site === 'ga');
    if (cardInsurer) cardInsurer.setAttribute('aria-checked', site === 'insurer');

    var formBody = document.getElementById('signup-form-body');
    var insurerFields = document.getElementById('insurer-fields');
    var gaFields = document.getElementById('ga-fields');
    if (formBody) formBody.classList.add('is-open');
    if (insurerFields) insurerFields.classList.toggle('is-open', site === 'insurer');
    if (gaFields)      gaFields.classList.toggle('is-open',      site === 'ga');

    /* DOM 재배치 — 보험사 분기 한정 입력폼 순서 정정 */
    try {
      var formDivider = document.getElementById('form-divider-affiliation');
      if (formBody && insurerFields) {
        if (site === 'insurer') {
          formBody.insertBefore(insurerFields, formBody.firstChild);
          if (formDivider) formDivider.style.display = 'none';
        } else {
          if (formDivider && formDivider.parentNode === formBody) {
            formBody.insertBefore(insurerFields, formDivider.nextSibling);
            formDivider.style.display = '';
          }
        }
      }
    } catch (e) {
      console.error('[selectSite DOM 재배치 격차]', e);
    }

    /* OTP 인라인 박스 노출 + 상태 리셋 */
    try {
      var otpBox = document.getElementById('otp-inline-box');
      if (otpBox) otpBox.style.display = (site === 'insurer') ? 'block' : 'none';
      if (typeof resetInsurerOtp === 'function') resetInsurerOtp();
    } catch (e) {
      console.error('[selectSite OTP 리셋 격차]', e);
    }

    /* 배지 + 부제 + 이메일 안내 + 직급 옵션 동적 분기 */
    var badge = document.querySelector('#page-signup-2 .auth-page-badge');
    if (badge) {
      badge.textContent = site === 'insurer' ? '보험사 임직원 전용' : '보험 설계사·매니저 전용';
    }
    /* 2026-05-29 PR-OTP-v2: 부제도 site 분기에 따라 갈아끼움 (배지/부제 정합) */
    var sub = document.querySelector('#page-signup-2 .auth-page-sub');
    if (sub) {
      sub.textContent = site === 'insurer'
        ? '보험사 임직원 가입 — 소속 보험사 운영자 승인 후 사용이 활성화됩니다'
        : '보험 설계사·매니저 가입 — 정확한 정보일수록 매니저 매핑이 정확합니다';
    }
    var emailHint = document.getElementById('f-email-hint');
    if (emailHint) {
      emailHint.textContent = site === 'insurer'
        ? '소속 보험사 공식 이메일로 입력 후 [인증 코드 받기]를 눌러 주세요. 운영자가 직접 승인합니다.'
        : '이 이메일로 인증 코드가 발송됩니다.';
    }
    /* 2026-05-29: 이메일 placeholder도 site 분기 동적 갈아끼움 (보험사 한정) */
    var emailInput = document.getElementById('f-email');
    if (emailInput) {
      emailInput.setAttribute(
        'placeholder',
        site === 'insurer'
          ? '소속 보험사 공식 이메일 등록 후 인증'
          : 'example@email.com'
      );
    }
    var roleSel = document.getElementById('f-role');
    if (roleSel) {
      if (site === 'insurer') {
        roleSel.innerHTML =
          '<option value="">선택해 주세요</option>' +
          '<option value="branch_manager">원수사 지점장</option>' +
          '<option value="manager">원수사 매니저</option>';
      } else {
        roleSel.innerHTML =
          '<option value="">선택해 주세요</option>' +
          '<option value="branch_manager">지점장 / 센터장</option>' +
          '<option value="manager">매니저 / 실장</option>' +
          '<option value="member">설계사 / 팀장</option>' +
          '<option value="staff">스텝 / 총무</option>';
      }
    }

    onRoleChange();

    /* site 선택 후 이름 input 자동 포커스 — 진입 직후 site-picker 카드에 포커스 있을 때만 */
    setTimeout(function () {
      var nameEl = document.getElementById('f-name');
      var active = document.activeElement;
      if (nameEl && active && active.classList && active.classList.contains('site-card')) {
        nameEl.focus();
      }
    }, 80);
  } catch (e) {
    /* 최후 안전망 — 본 함수 어느 자료 격차 시에도 onclick 다음 줄 authNextSignup() 호출 통과 보장 */
    console.error('[selectSite 전체 격차 — 안전망 발동]', e);
  }
}

function onInsurerChange() {
  var sel = document.getElementById('f-insurer');
  var opt = sel && sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex] : null;
  var slug = opt ? (opt.getAttribute('data-slug') || '') : '';
  var guide = document.getElementById('domain-guide');
  var nameEl = document.getElementById('domain-guide-name');
  var domEl  = document.getElementById('domain-guide-domain');
  var domain = INSURER_DOMAINS[slug] || null;
  if (slug && domain) {
    var label = sel.options[sel.selectedIndex].textContent;
    if (nameEl) nameEl.textContent = label;
    if (domEl)  domEl.textContent  = domain;
    if (guide)  guide.style.display = 'block';
  } else if (slug && !domain) {
    var label2 = sel.options[sel.selectedIndex].textContent;
    if (nameEl) nameEl.textContent = label2;
    if (domEl)  domEl.textContent  = '(미확인 — admin 확인 후 활성화 예정)';
    if (guide)  guide.style.display = 'block';
  } else {
    if (guide) guide.style.display = 'none';
  }
  /* 2026-05-28 PR-OTP: 도메인 자동검증 폐기 — 운영자 눈 확인 + OTP 인증만 가동 */
}

function _toggleOtherInput(selectId, textId) {
  var sel = document.getElementById(selectId);
  var txt = document.getElementById(textId);
  if (!sel || !txt) return;
  var isOther = sel.value === '__other__';
  txt.disabled = !isOther;
  txt.style.opacity = isOther ? '1' : '0.5';
  if (!isOther) txt.value = '';
}
/* 2026-05-28: 회사명 typeahead (companies 마스터 search_text ILIKE 검색).
   GA 분기 단일 input + 후보 드롭다운. select 듀얼 폐기. */
var _companyTaTimer = null;
var _companyTaController = null;

function onCompanyTaInput() {
  var input = document.getElementById('f-company-text');
  var list = document.getElementById('company-ta-list');
  if (!input || !list) return;
  var q = (input.value || '').trim();
  /* PR-1: 회사명을 다시 타이핑하면 이전 선택(company_id) 무효화 + 지점/팀 리셋(재선택 강제) */
  var _hid = document.getElementById('f-company-id');
  if (_hid && _hid.value) { _hid.value = ''; _resetGaBranchTeam(); }

  if (_companyTaTimer) clearTimeout(_companyTaTimer);
  if (q.length < 2) {
    list.style.display = 'none';
    list.innerHTML = '';
    return;
  }
  _companyTaTimer = setTimeout(function () { _companyTaFetch(q); }, 200);
}

async function _companyTaFetch(q) {
  if (_companyTaController) { try { _companyTaController.abort(); } catch (e) {} }
  _companyTaController = new AbortController();
  var list = document.getElementById('company-ta-list');
  if (!list) return;
  try {
    var url = SUPABASE_URL + '/rest/v1/companies?select=id,name'
      + '&search_text=ilike.*' + encodeURIComponent(q) + '*'
      + '&order=agent_count.desc.nullslast&limit=10';
    var res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY },
      signal: _companyTaController.signal
    });
    if (!res.ok) { list.style.display = 'none'; return; }
    var rows = await res.json();
    if (!rows || rows.length === 0) { list.style.display = 'none'; return; }
    var html = rows.map(function (r) {
      var safe = String(r.name).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      var idAttr = String(r.id == null ? '' : r.id);
      return '<div class="ta-item" onmousedown="onCompanyTaPick(this)" data-id="' + idAttr + '" data-name="' + safe + '">' + safe + '</div>';
    }).join('');
    list.innerHTML = html;
    list.style.display = 'block';
  } catch (e) {
    if (e && e.name !== 'AbortError') console.error('[company ta]', e);
  }
}

function onCompanyTaPick(el) {
  var name = el && el.getAttribute('data-name') || '';
  var id   = el && el.getAttribute('data-id')   || '';
  var input = document.getElementById('f-company-text');
  if (input) input.value = name;
  var hid = document.getElementById('f-company-id');
  if (hid) hid.value = id;
  var list = document.getElementById('company-ta-list');
  if (list) list.style.display = 'none';
  loadBranchesByCompany(id);   /* PR-1: 회사 → 그 회사 지점 목록 동적 로드 */
}

function onCompanyTaBlur() {
  /* 200ms 후 드롭다운 닫기 (클릭 시간 확보 — onmousedown이 먼저 가동) */
  setTimeout(function () {
    var list = document.getElementById('company-ta-list');
    if (list) list.style.display = 'none';
  }, 200);
}
function onGaBranchChange()  {
  _toggleOtherInput('f-branch-select', 'f-branch-text');
  var sel = document.getElementById('f-branch-select');
  if (!sel) return;
  loadTeamsByBranch(sel.value);
}
function onGaTeamChange()    { _toggleOtherInput('f-team-select',    'f-team-text');    }

function mapToRoleKey(site, gradeShort) {
  if (!site || !gradeShort) return 'ga_member';
  return site + '_' + gradeShort;
}

function onRoleChange() {
  var sel  = document.getElementById('f-role');
  var hint = document.getElementById('roleHint');
  var text = document.getElementById('roleHintText');
  if (!sel || !hint || !text) return;
  var grade = sel.value;
  var site = window.gSignupSite;
  if (!grade || !site) {
    hint.classList.remove('on');
    return;
  }
  var sitePrefix = site === 'insurer' ? '보험사' : 'GA';
  var labels = {
    branch_manager: '지점장/센터장',
    manager:        '매니저/실장',
    member:         '설계사/팀장',
    staff:          '스텝/총무'
  };
  var freeBenefit = (grade === 'branch_manager' || grade === 'manager')
    ? ' (<strong>무료 플랜에서도 글쓰기 가능</strong>)'
    : '';
  text.innerHTML = sitePrefix + ' ' + labels[grade] + ' 권한으로 가입됩니다.' + freeBenefit;
  hint.classList.add('on');
}

function fmtPhone(input) {
  var v = input.value.replace(/\D/g, '');
  if (v.length <= 3)      input.value = v;
  else if (v.length <= 7) input.value = v.slice(0, 3) + '-' + v.slice(3);
  else                    input.value = v.slice(0, 3) + '-' + v.slice(3, 7) + '-' + v.slice(7, 11);
}

function validateSignup() {
  var ok = true;
  var errBox = document.getElementById('signupErrBox');
  errBox.classList.remove('on');

  if (!window.gSignupSite) {
    errBox.textContent = '상단 카드에서 보험사 임직원 또는 GA 중 하나를 선택해 주세요.';
    errBox.classList.add('on');
    return false;
  }

  ['f-name','f-phone'].forEach(function (id) {
    var el = document.getElementById(id);
    var er = document.getElementById('e-' + id.split('-')[1]);
    if (!el.value.trim()) { el.classList.add('err'); er.classList.add('on'); ok = false; }
    else                  { el.classList.remove('err'); er.classList.remove('on'); }
  });
  var role = document.getElementById('f-role');
  if (!role.value) { role.classList.add('err'); document.getElementById('e-role').classList.add('on'); ok = false; }
  else             { role.classList.remove('err'); document.getElementById('e-role').classList.remove('on'); }
  var email = document.getElementById('f-email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    email.classList.add('err');
    var er2 = document.getElementById('e-email');
    er2.textContent = '올바른 이메일을 입력해 주세요.';
    er2.classList.add('on'); ok = false;
  } else { email.classList.remove('err'); document.getElementById('e-email').classList.remove('on'); }

  // 보험사 분기 (2026-05-28 정정: 도메인 자동검증 폐기, 운영자 눈 확인. OTP verified 검사로 단순화)
  if (window.gSignupSite === 'insurer') {
    var ins = document.getElementById('f-insurer');
    if (!ins.value) {
      ins.classList.add('err'); document.getElementById('e-insurer').classList.add('on'); ok = false;
    } else {
      ins.classList.remove('err'); document.getElementById('e-insurer').classList.remove('on');
    }
    /* 2026-05-30: 담당 지점 1개 이상 필수 */
    if (_collectInsurerBranchNames().length === 0) {
      document.getElementById('e-insurer-branch').classList.add('on'); ok = false;
    } else {
      document.getElementById('e-insurer-branch').classList.remove('on');
    }
    if (!window.gInsurerOtpVerified) {
      errBox.textContent = '이메일 인증을 먼저 통과해 주세요. ([인증 코드 받기] → 코드 입력 → [확인])';
      errBox.classList.add('on');
      ok = false;
    }
  }

  if (!document.getElementById('f-consent').checked) {
    document.getElementById('e-consent').classList.add('on'); ok = false;
  } else { document.getElementById('e-consent').classList.remove('on'); }

  return ok;
}

/* 2026-05-28 PR-OTP: 보험사 분기 가입 흐름 통합 정정.
   - 기존: signup-3 카톡 버튼 = /auth/v1/signup (password) 호출 → auth.users row 신규 생성
   - 정정: 가입 자체는 OTP가 책임 (sendInsurerOtp + verifyInsurerOtp + updateInsurerProfile).
     본 함수는 약관 동의 후 마지막 자리 — 카톡 새 창 열기 + signup-success 화면 진입만.
   - signup API 호출 X (이미 verifyInsurerOtp 시점에 auth.users row + 입력값 update_user 마감) */
function doInsurerKakaoSignup() {
  if (!validateSignup()) return;

  var email = document.getElementById('f-email').value.trim();

  /* 카톡 새 창 + 가입 완료 화면 (pending-notice 자동 노출) */
  window.open('https://open.kakao.com/o/svu80Moi', '_blank', 'noopener');
  _showStep('signup-success');
  var descEl = document.getElementById('signup-success-desc');
  if (descEl) descEl.textContent = email + ' — 운영자 승인 대기';
  var pendingEl = document.getElementById('pending-notice');
  if (pendingEl) pendingEl.style.display = 'block';
}

/* ════════════════════════════════════════════════════════════════
   2026-05-28 PR-OTP: 보험사 분기 한정 이메일 OTP 인라인 인증
   ────────────────────────────────────────────────────────────────
   흐름:
   1. 사용자 이메일 입력 → [인증 코드 받기] 클릭
   2. sendInsurerOtp() = /auth/v1/otp create_user=true, data={status:'pending'} (최소 메타)
      → auth.users row 즉시 생성 (이메일만, 입력값 동봉 X)
      → 사용자 메일함에 6자리 코드 발송
   3. 사용자 코드 입력 → [확인] 클릭
   4. verifyInsurerOtp() = /auth/v1/verify type=email → access_token 수신
      → updateInsurerProfile(access_token) = /auth/v1/user PUT { data: 입력값 }
      → user_metadata에 이름·핸드폰·보험사·role 한 번에 기록
   5. window.gInsurerOtpVerified = true → validateSignup 통과 → [다음] 활성
   6. 사용자 약관 동의 → [💬 카카오톡 승인 요청] = doInsurerKakaoSignup (카톡 + signup-success만)

   §4 중립 원칙 정합:
   - 미인증 단계 (sendInsurerOtp ~ verifyInsurerOtp 통과 전) = data 메타 = status:'pending'만
   - 통과 후 = updateInsurerProfile로 입력값 user_metadata 기록
   - 발송만 받고 코드 미입력 row = 개인정보 잔존 0 (expires_at 자동 만료 정합)
   ════════════════════════════════════════════════════════════════ */

window.onInsurerEmailInput = function () {
  if (window.gSignupSite !== 'insurer') return;
  if (window.gInsurerOtpVerified || window.gInsurerOtpSent) {
    resetInsurerOtp();
  }
};
window.sendInsurerOtp    = function () { return sendInsurerOtp();    };
window.verifyInsurerOtp  = function () { return verifyInsurerOtp();  };
window.resetInsurerOtp   = function () { return resetInsurerOtp();   };

async function sendInsurerOtp() {
  var emailEl = document.getElementById('f-email');
  var btn     = document.getElementById('btnSendInsurerOtp');
  var btnTxt  = document.getElementById('btnSendInsurerOtpTxt');
  var errBox  = document.getElementById('signupErrBox');
  errBox.classList.remove('on');

  var email = (emailEl.value || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errBox.textContent = '먼저 올바른 이메일을 입력해 주세요.';
    errBox.classList.add('on');
    emailEl.focus();
    return;
  }

  btn.disabled = true;
  if (btnTxt) btnTxt.textContent = '발송 중…';

  try {
    var res = await fetch(SUPABASE_URL + '/auth/v1/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({
        email: email,
        create_user: true,
        data: { status: 'pending' }   /* 미인증 단계 — 최소 메타만 동봉 (§4 중립 정합) */
      })
    });

    if (res.ok) {
      window.gInsurerOtpSent     = true;
      window.gInsurerOtpEmail    = email;
      window.gInsurerOtpVerified = false;
      document.getElementById('otp-send-area').style.display = 'none';
      document.getElementById('otp-verify-area').style.display = 'block';
      var sentTo = document.getElementById('otp-sent-to');
      if (sentTo) sentTo.textContent = email;
      var codeEl = document.getElementById('f-insurer-otp-code');
      if (codeEl) { codeEl.value = ''; setTimeout(function () { codeEl.focus(); }, 80); }
    } else {
      var errTxt = '';
      try { var j = await res.json(); errTxt = j.msg || j.message || j.error_description || ''; } catch (e) {}
      errBox.textContent = '인증 코드 발송 실패 (' + res.status + '): ' + errTxt;
      errBox.classList.add('on');
    }
  } catch (e) {
    errBox.textContent = '네트워크 오류: ' + (e && e.message ? e.message : e);
    errBox.classList.add('on');
  } finally {
    btn.disabled = false;
    if (btnTxt) btnTxt.textContent = '✉️ 이메일 인증 코드 받기';
  }
}

async function verifyInsurerOtp() {
  var codeEl = document.getElementById('f-insurer-otp-code');
  var btn    = document.getElementById('btnVerifyInsurerOtp');
  var errBox = document.getElementById('signupErrBox');
  var errFld = document.getElementById('e-insurer-otp');
  var okMsg  = document.getElementById('otp-verified-msg');
  errBox.classList.remove('on');
  errFld.classList.remove('on');

  var code = (codeEl.value || '').trim();
  if (!/^\d{6}$/.test(code)) {
    errFld.textContent = '6자리 숫자 코드를 입력해 주세요.';
    errFld.classList.add('on');
    codeEl.focus();
    return;
  }
  if (!window.gInsurerOtpSent || !window.gInsurerOtpEmail) {
    errBox.textContent = '먼저 [인증 코드 받기]를 눌러 주세요.';
    errBox.classList.add('on');
    return;
  }

  btn.disabled = true;
  var oldTxt = btn.textContent;
  btn.textContent = '확인 중…';

  try {
    var res = await fetch(SUPABASE_URL + '/auth/v1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({
        type:  'email',
        email: window.gInsurerOtpEmail,
        token: code
      })
    });

    if (!res.ok) {
      var errTxt = '';
      try { var j = await res.json(); errTxt = j.msg || j.message || j.error_description || ''; } catch (e) {}
      errFld.textContent = '코드가 일치하지 않거나 만료되었습니다. (' + res.status + ') ' + errTxt;
      errFld.classList.add('on');
      codeEl.focus();
      btn.disabled = false;
      btn.textContent = oldTxt;
      return;
    }

    var data = await res.json();
    var accessToken = data && data.access_token;
    if (!accessToken) {
      errFld.textContent = '인증 응답에 토큰이 없습니다 — 다시 시도해 주세요.';
      errFld.classList.add('on');
      btn.disabled = false;
      btn.textContent = oldTxt;
      return;
    }

    /* verify 통과 → 입력값 user_metadata 기록 (조건 정합: 본 자리부터 입력값 동봉) */
    var updateOk = await updateInsurerProfile(accessToken);
    if (!updateOk) {
      errBox.textContent = '프로필 갱신 실패 — 잠시 후 다시 시도해 주세요.';
      errBox.classList.add('on');
      btn.disabled = false;
      btn.textContent = oldTxt;
      return;
    }

    window.gInsurerOtpVerified = true;
    if (okMsg) okMsg.style.display = 'block';
    btn.textContent = '통과';
    if (codeEl) codeEl.disabled = true;
    /* btn.disabled = true 유지 (통과 후 재클릭 차단) */
  } catch (e) {
    errBox.textContent = '네트워크 오류: ' + (e && e.message ? e.message : e);
    errBox.classList.add('on');
    btn.disabled = false;
    btn.textContent = oldTxt;
  }
}

async function updateInsurerProfile(accessToken) {
  /* verify 통과 후 입력값 user_metadata 한 번에 PUT — 이름·핸드폰·보험사·role */
  var insSel = document.getElementById('f-insurer');
  var insurerId = insSel ? insSel.value : '';
  var companyName = insSel && insSel.selectedIndex >= 0 ? insSel.options[insSel.selectedIndex].textContent : '';
  var gradeShort = document.getElementById('f-role').value;
  var roleKey = mapToRoleKey('insurer', gradeShort);

  var meta = {
    name:    document.getElementById('f-name').value.trim(),
    phone:   document.getElementById('f-phone').value.trim(),
    company: companyName,
    branch:  '',
    role:    roleKey,
    team:    '',
    insurer_id: insurerId,
    branch_id:  '',
    team_id:    '',
    status:     'pending',
    desired_branch_names: _collectInsurerBranchNames()  /* 희망 담당 지점명(자유 입력) — admin 승인 시 branches 매핑 */
  };

  try {
    var res = await fetch(SUPABASE_URL + '/auth/v1/user', {
      method: 'PUT',
      headers: {
        'Content-Type':  'application/json',
        'apikey':         SUPABASE_KEY,
        'Authorization': 'Bearer ' + accessToken
      },
      body: JSON.stringify({ data: meta })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

function resetInsurerOtp() {
  window.gInsurerOtpVerified = false;
  window.gInsurerOtpSent     = false;
  window.gInsurerOtpEmail    = '';

  var sendArea   = document.getElementById('otp-send-area');
  var verifyArea = document.getElementById('otp-verify-area');
  var okMsg      = document.getElementById('otp-verified-msg');
  var errFld     = document.getElementById('e-insurer-otp');
  var codeEl     = document.getElementById('f-insurer-otp-code');
  var verifyBtn  = document.getElementById('btnVerifyInsurerOtp');

  if (sendArea)   sendArea.style.display   = 'block';
  if (verifyArea) verifyArea.style.display = 'none';
  if (okMsg)      okMsg.style.display      = 'none';
  if (errFld)     errFld.classList.remove('on');
  if (codeEl)     { codeEl.value = ''; codeEl.disabled = false; }
  if (verifyBtn)  { verifyBtn.disabled = false; verifyBtn.textContent = '확인'; }
}

async function doSubmit() {
  /* 2026-06-04: 개방 복구 — 공사중 가입 차단(osShowMaintenance+return) 제거. GA 가입 로직 부활. */
  if (!validateSignup()) return;

  var btn  = document.getElementById('authMainCta');
  var txt  = document.getElementById('authMainCtaTxt');
  var spin = document.getElementById('authMainCtaSpinner');
  var errBox = document.getElementById('signupErrBox');

  btn.disabled = true;
  if (txt)  txt.style.opacity = '0';
  if (spin) spin.style.display = 'block';

  function _resetBtn() {
    btn.disabled = false;
    if (txt)  txt.style.opacity = '';
    if (spin) spin.style.display = 'none';
  }

  var email = document.getElementById('f-email').value.trim();
  var site  = window.gSignupSite;
  var gradeShort = document.getElementById('f-role').value;
  var roleKey = mapToRoleKey(site, gradeShort);

  var insurerId = '';
  var branchId  = '';
  var teamId    = '';
  var statusValue = 'active';
  var companyName = '';
  var companyId   = '';
  var branchName  = '';
  var teamName    = '';

  if (site === 'insurer') {
    var insSel = document.getElementById('f-insurer');
    insurerId = insSel.value || '';  // option value = UUID (#46 slug→UUID 전환)
    companyName = insSel.selectedIndex >= 0 ? insSel.options[insSel.selectedIndex].textContent : '';
    statusValue = 'pending'; // 매니저 승인 대기

    if (!insurerId) {
      errBox.textContent = '보험사를 선택해 주세요.';
      errBox.classList.add('on');
      _resetBtn();
      return;
    }
  } else {
    /* 2026-06-12 PR-1: GA 분기 — 회사>지점>팀 ID 선택 위저드.
       기존 조직 선택 = branch_id/team_id 전송(미배정 해소).
       "기타 입력"(__other__)·미선택 = 텍스트 폴백 → branch_id/team_id NULL (PR-2까지 하위호환). */
    companyName = (document.getElementById('f-company-text').value || '').trim();
    companyId   = (document.getElementById('f-company-id') ? (document.getElementById('f-company-id').value || '') : '');
    var brSel = document.getElementById('f-branch-select');
    var brVal = brSel ? brSel.value : '';
    if (brVal && brVal !== '__other__') {
      branchId = brVal;
      var brOpt = brSel.options[brSel.selectedIndex];
      branchName = ((brOpt && (brOpt.getAttribute('data-name') || brOpt.textContent)) || '').trim();
    } else {
      branchName = (document.getElementById('f-branch-text').value || '').trim();
      branchId = '';
    }
    var tmSel = document.getElementById('f-team-select');
    var tmVal = tmSel ? tmSel.value : '';
    if (tmVal && tmVal !== '__other__') {
      teamId = tmVal;
      var tmOpt = tmSel.options[tmSel.selectedIndex];
      teamName = ((tmOpt && (tmOpt.getAttribute('data-name') || tmOpt.textContent)) || '').trim();
    } else {
      teamName = (document.getElementById('f-team-text').value || '').trim();
      teamId = '';
    }
    statusValue = 'active';
  }

  /* 2026-05-18 OTP 전환: /auth/v1/signup (비밀번호) → /auth/v1/otp (create_user=true + data 메타)
     verify 후 access_token 받음 → app.html redirect (verifyOtp 함수에서 처리) */
  var signupData = {
    name:    document.getElementById('f-name').value.trim(),
    phone:   document.getElementById('f-phone').value.trim(),
    company: companyName,
    company_id: companyId,
    branch:  branchName,
    role:    roleKey,
    team:    teamName,
    insurer_id:  insurerId,
    branch_id:   branchId,
    team_id:     teamId,
    status:      statusValue
  };

  try {
    var authRes = await fetch(SUPABASE_URL + '/auth/v1/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY },
      body: JSON.stringify({
        email: email,
        create_user: true,
        data: signupData
      })
    });

    if (authRes.ok) {
      _otpMode = 'signup';
      _otpEmail = email;
      _otpSignupData = { site: site, data: signupData };
      _resetBtn();
      _showStep('otp-verify');
      var targetEl = document.getElementById('otp-target-email');
      if (targetEl) targetEl.textContent = email;
      setTimeout(function () {
        var codeEl = document.getElementById('f-otp-code');
        if (codeEl) { codeEl.value = ''; codeEl.focus(); }
      }, 100);
    } else {
      var authData = {};
      try { authData = await authRes.json(); } catch (e) {}
      var msg = (authData.error_description || authData.msg || authData.error || '').toLowerCase();
      console.error('[signup otp error]', { status: authRes.status, authData: authData });
      if (msg.indexOf('already registered') !== -1 || msg.indexOf('already been registered') !== -1 || msg.indexOf('user already') !== -1) {
        errBox.innerHTML = '이미 가입된 이메일입니다. 위 로그인 영역에서 로그인해 주세요.';
      } else if (msg.indexOf('rate') !== -1 || msg.indexOf('limit') !== -1 || authRes.status === 429) {
        errBox.textContent = '이메일 발송 한도를 초과했습니다. 1시간 후 다시 시도해 주세요.';
      } else {
        errBox.textContent = '가입 중 오류가 발생했습니다. (' + authRes.status + ')';
      }
      errBox.classList.add('on');
      _resetBtn();
    }
  } catch (e) {
    console.error('[signup otp network error]', e);
    errBox.textContent = '네트워크 오류가 발생했습니다.';
    errBox.classList.add('on');
    _resetBtn();
  }
}

// 페이지 로드 직후 signup 모달 select 동적 채움 (별 트랙 #46)
loadSignupSelects();
