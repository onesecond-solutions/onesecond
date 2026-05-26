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
    alt: 'MY SPACE 페이지 미리보기',
    src: PREVIEW_BASE + 'myspace.jpg',
    fallback: 'MY SPACE 미리보기 이미지는 assets/images/preview/myspace.jpg 경로에 있어야 합니다.',
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
    if (ctaTxt)   ctaTxt.textContent = '✉️ 인증 코드 받기';
    if (ctaBtn)   ctaBtn.onclick = function() { doSubmit(); };
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

window.authNextSignup3 = function() {
  // Step 2 → Step 3 진입 (사전 폼 검증 박음)
  if (typeof _validateSignupStep2 === 'function') {
    if (!_validateSignupStep2()) return;
  }
  _showStep('signup-3');
};

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

  /* 2026-05-27: 이메일 화이트리스트 폐지 — 공사중 모드 ON 시 로그인 시도 무조건 차단.
     admin은 ?dev=1 진입 후 정상 흐름으로 로그인. (Google / doSubmit과 동일 흐름) */
  if (window.OS_MAINTENANCE && window.OS_MAINTENANCE.mode === true) {
    var params = new URLSearchParams(window.location.search);
    if (params.get('dev') !== '1') {
      _resetBtn();
      window.osShowMaintenance();
      return;
    }
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
      localStorage.setItem('os_token', data.access_token);
      localStorage.setItem('os_refresh_token', data.refresh_token);
      localStorage.setItem('os_user', JSON.stringify(data.user));
      sessionStorage.setItem('os_token', data.access_token);
      sessionStorage.setItem('os_user', JSON.stringify(data.user));

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
          window.location.href = 'app.html';
        }, 1800);
      } else {
        _showStep('login-success');
        setTimeout(function () {
          var _r = new URLSearchParams(window.location.search).get('redirect');
          var appUrl = 'app.html';
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
function signInWithGoogle() {
  /* 2026-05-23: 공사중 흐름 — Google 로그인은 사전 이메일 확인 불가 → 무조건 차단 */
  window.osShowMaintenance();
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

    var brRes = await fetch(SUPABASE_URL + '/rest/v1/branches?ga_org_name=eq.' + encodeURIComponent('AZ금융') + '&is_active=eq.true&select=id,name&order=name', { headers: headers });
    var branches = brRes.ok ? await brRes.json() : [];
    populateBranchSelect(branches);

    var initBranchId = branches.length > 0 ? branches[0].id : '';
    if (initBranchId) {
      await loadTeamsByBranch(initBranchId);
    } else {
      clearTeamSelect();
    }
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

function populateBranchSelect(branches) {
  var sel = document.getElementById('f-branch-select');
  if (!sel) return;
  sel.innerHTML = '';
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

window.gSignupSite = null;

function selectSite(site) {
  window.gSignupSite = site;
  var cardGa      = document.getElementById('site-card-ga');
  var cardInsurer = document.getElementById('site-card-insurer');
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

  onRoleChange();

  // site 선택 후 이름 input 자동 포커스 (UX — 진입 직후 site-picker 카드에 포커스 박혀있을 때만)
  setTimeout(function () {
    var nameEl = document.getElementById('f-name');
    var active = document.activeElement;
    if (nameEl && active && active.classList && active.classList.contains('site-card')) {
      nameEl.focus();
    }
  }, 80);
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
  checkInsurerDomain();
}

function checkInsurerDomain() {
  if (window.gSignupSite !== 'insurer') return;
  var sel = document.getElementById('f-insurer');
  var emailEl = document.getElementById('f-email');
  if (!sel || !emailEl) return;
  var opt = sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex] : null;
  var slug = opt ? (opt.getAttribute('data-slug') || '') : '';
  var email = (emailEl.value || '').trim().toLowerCase();
  var domain = INSURER_DOMAINS[slug];
  if (!slug || !domain || !email) return;
  if (!email.endsWith(domain.toLowerCase())) {
    emailEl.classList.add('err');
    var er = document.getElementById('e-email');
    if (er) {
      er.textContent = '이메일이 ' + domain + ' 도메인이어야 합니다.';
      er.classList.add('on');
    }
  }
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
function onGaCompanyChange() { _toggleOtherInput('f-company-select', 'f-company-text'); }
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

  // 4중 방어 #1: 보험사 분기 도메인 화이트리스트
  if (window.gSignupSite === 'insurer') {
    var ins = document.getElementById('f-insurer');
    if (!ins.value) {
      ins.classList.add('err'); document.getElementById('e-insurer').classList.add('on'); ok = false;
    } else {
      ins.classList.remove('err'); document.getElementById('e-insurer').classList.remove('on');
      var insOpt = ins.selectedIndex >= 0 ? ins.options[ins.selectedIndex] : null;
      var insSlug = insOpt ? (insOpt.getAttribute('data-slug') || '') : '';
      var expectedDomain = INSURER_DOMAINS[insSlug];
      if (expectedDomain) {
        var emailVal = (email.value || '').trim().toLowerCase();
        if (!emailVal.endsWith(expectedDomain.toLowerCase())) {
          email.classList.add('err');
          var er3 = document.getElementById('e-email');
          er3.textContent = '이메일이 ' + expectedDomain + ' 도메인이어야 합니다.';
          er3.classList.add('on'); ok = false;
        }
      } else {
        // 미확인 도메인 (db-life / im-life / kb-life) 일시 차단
        errBox.textContent = '선택하신 보험사는 도메인 확인이 진행 중입니다. admin 확인 후 가입이 활성화됩니다.';
        errBox.classList.add('on');
        ok = false;
      }
    }
  }

  if (!document.getElementById('f-consent').checked) {
    document.getElementById('e-consent').classList.add('on'); ok = false;
  } else { document.getElementById('e-consent').classList.remove('on'); }

  return ok;
}

async function doSubmit() {
  /* 2026-05-23: 공사중 흐름 — 가입 무조건 차단 (신규 사용자 진입로 폐쇄) */
  window.osShowMaintenance();
  return;

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
    // GA 분기 — 시드 매핑 또는 free text
    var bSel = document.getElementById('f-branch-select');
    var tSel = document.getElementById('f-team-select');
    if (bSel.value && bSel.value !== '__other__') {
      branchId = bSel.value;
      branchName = bSel.options[bSel.selectedIndex].getAttribute('data-name') || '';
    } else {
      branchName = (document.getElementById('f-branch-text').value || '').trim();
    }
    if (tSel.value && tSel.value !== '__other__') {
      teamId = tSel.value;
      teamName = tSel.options[tSel.selectedIndex].getAttribute('data-name') || '';
    } else {
      teamName = (document.getElementById('f-team-text').value || '').trim();
    }
    var compSel = document.getElementById('f-company-select');
    if (compSel.value && compSel.value !== '__other__') {
      companyName = compSel.value;
    } else {
      companyName = (document.getElementById('f-company-text').value || '').trim();
    }
    statusValue = 'active';
  }

  /* 2026-05-18 OTP 전환: /auth/v1/signup (비밀번호) → /auth/v1/otp (create_user=true + data 메타)
     verify 후 access_token 받음 → app.html redirect (verifyOtp 함수에서 처리) */
  var signupData = {
    name:    document.getElementById('f-name').value.trim(),
    phone:   document.getElementById('f-phone').value.trim(),
    company: companyName,
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
