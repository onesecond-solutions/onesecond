(function () {
  "use strict";

  var SUPABASE_URL = "https://pdnwgzneooyygfejrvbg.supabase.co";
  var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkbndnem5lb295eWdmZWpydmJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NDc5ODgsImV4cCI6MjA5MjQyMzk4OH0.I79w8Jk-pPgoLHNrcSLhem88jz6_azcDOqglBZjRjPs";
  var TOKEN_KEY = "dayfolder_advisor_access_token";
  var REFRESH_KEY = "dayfolder_advisor_refresh_token";
  var USER_KEY = "dayfolder_advisor_user";
  var currentUser = null;

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function saveSession(data) {
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(REFRESH_KEY, data.refresh_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user || {}));
  }

  async function request(path, options) {
    var response = await fetch(SUPABASE_URL + path, options);
    var data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.error_description || data.msg || data.message || "로그인에 실패했습니다.");
    return data;
  }

  async function verifyToken(token) {
    if (!token) return null;
    try {
      return await request("/auth/v1/user", {
        headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + token }
      });
    } catch (_error) {
      return null;
    }
  }

  async function refreshSession() {
    var refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return null;
    try {
      var data = await request("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      if (!data.user) throw new Error("로그인 정보를 확인하지 못했습니다.");
      saveSession(data);
      return data.user;
    } catch (_error) {
      clearSession();
      return null;
    }
  }

  function createPkceVerifier() {
    var bytes = new Uint8Array(64);
    crypto.getRandomValues(bytes);
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    return Array.from(bytes, function (value) { return chars[value % chars.length]; }).join("");
  }

  async function createPkceChallenge(verifier) {
    var digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    var binary = "";
    new Uint8Array(digest).forEach(function (value) { binary += String.fromCharCode(value); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  async function startGoogleLogin() {
    var verifier = createPkceVerifier();
    localStorage.setItem("dayfolder_advisor_pkce_verifier", verifier);
    var challenge = await createPkceChallenge(verifier);
    var redirectTo = window.location.origin + "/dayfolder-advisor/";
    window.location.href = SUPABASE_URL + "/auth/v1/authorize" +
      "?provider=google" +
      "&code_challenge=" + encodeURIComponent(challenge) +
      "&code_challenge_method=S256" +
      "&redirect_to=" + encodeURIComponent(redirectTo);
  }

  async function handleGoogleCallback() {
    var params = new URLSearchParams(window.location.search);
    var errorDescription = params.get("error_description");
    if (params.get("error")) {
      history.replaceState(null, "", window.location.pathname);
      throw new Error(errorDescription || "Google 로그인에 실패했습니다.");
    }
    var code = params.get("code");
    if (!code) return null;
    var verifier = localStorage.getItem("dayfolder_advisor_pkce_verifier");
    if (!verifier) throw new Error("Google 로그인 확인 정보가 만료되었습니다. 다시 시도해 주세요.");
    var data = await request("/auth/v1/token?grant_type=pkce", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
      body: JSON.stringify({ auth_code: code, code_verifier: verifier })
    });
    localStorage.removeItem("dayfolder_advisor_pkce_verifier");
    history.replaceState(null, "", window.location.pathname);
    if (!data.user) throw new Error("로그인 정보를 확인하지 못했습니다.");
    saveSession(data);
    window.location.reload();
    return null;
  }

  function createGate() {
    var gate = document.createElement("div");
    gate.className = "dayfolder-advisor-auth-gate";
    gate.hidden = true;
    gate.innerHTML = '<form class="dayfolder-advisor-auth-card">' +
      '<h1>데이폴더 설계사 버전</h1>' +
      '<p>임태성 전용 계정으로 로그인해 주세요.</p>' +
      '<button class="dayfolder-advisor-google" type="button">Google로 로그인</button>' +
      '<div class="dayfolder-advisor-auth-divider">또는</div>' +
      '<label>이메일<input name="email" type="email" autocomplete="username" required></label>' +
      '<label>비밀번호<input name="password" type="password" autocomplete="current-password" required></label>' +
      '<button class="dayfolder-advisor-auth-submit" type="submit">로그인</button>' +
      '<div class="dayfolder-advisor-auth-error" role="alert"></div>' +
      '</form>';
    document.body.appendChild(gate);
    return gate;
  }

  function syncExistingUi() {
    var settingsButton = document.querySelector(".settings-button");
    if (settingsButton) {
      var label = currentUser ? "임태성" : "로그인";
      if (settingsButton.textContent !== label) settingsButton.textContent = label;
      settingsButton.removeAttribute("title");
    }

    var logoutButton = document.querySelector(".account-settings button");
    var logoutHint = document.querySelector(".account-settings small");
    if (logoutButton) {
      logoutButton.disabled = !currentUser;
      if (logoutButton.textContent !== "로그아웃") logoutButton.textContent = "로그아웃";
    }
    if (logoutHint) {
      logoutHint.hidden = true;
      logoutHint.textContent = "";
    }
  }

  function setUser(user, gate) {
    currentUser = user || null;
    // 로그아웃 상태에서도 달력 화면을 먼저 보여 주고,
    // 헤더의 로그인 버튼을 눌렀을 때만 인증 창을 연다.
    gate.hidden = true;
    syncExistingUi();
    window.dayfolderAdvisorAuthReady = true;
    window.dispatchEvent(new Event("dayfolder-advisor-auth-ready"));
  }

  async function start() {
    var gate = createGate();
    var form = gate.querySelector("form");
    var error = gate.querySelector(".dayfolder-advisor-auth-error");
    var submit = gate.querySelector("button[type=submit]");
    var googleButton = gate.querySelector(".dayfolder-advisor-google");

    var observer = new MutationObserver(syncExistingUi);
    observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });

    document.addEventListener("click", function (event) {
      var settingsButton = event.target.closest && event.target.closest(".settings-button");
      if (settingsButton && !currentUser) {
        event.preventDefault();
        event.stopImmediatePropagation();
        gate.hidden = false;
        gate.querySelector("input").focus();
        return;
      }

      var logoutButton = event.target.closest && event.target.closest(".account-settings button");
      if (logoutButton && currentUser) {
        event.preventDefault();
        event.stopImmediatePropagation();
        clearSession();
        window.location.reload();
      }
    }, true);

    var user = null;
    try {
      user = await handleGoogleCallback();
    } catch (oauthError) {
      error.textContent = oauthError.message;
    }
    if (!user) user = await verifyToken(localStorage.getItem(TOKEN_KEY));
    if (!user) user = await refreshSession();
    if (user) setUser(user, gate);
    else {
      clearSession();
      setUser(null, gate);
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      error.textContent = "";
      submit.disabled = true;
      try {
        var formData = new FormData(form);
        var email = String(formData.get("email") || "").trim().toLowerCase();
        var password = String(formData.get("password") || "");
        var data = await request("/auth/v1/token?grant_type=password", {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
          body: JSON.stringify({ email: email, password: password })
        });
        saveSession(data);
        window.location.reload();
      } catch (loginError) {
        clearSession();
        error.textContent = loginError.message === "Invalid login credentials" ? "이메일 또는 비밀번호를 확인해 주세요." : loginError.message;
      } finally {
        submit.disabled = false;
      }
    });

    googleButton.addEventListener("click", async function () {
      error.textContent = "";
      googleButton.disabled = true;
      try {
        await startGoogleLogin();
      } catch (googleError) {
        googleButton.disabled = false;
        error.textContent = googleError.message || "Google 로그인을 시작하지 못했습니다.";
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
