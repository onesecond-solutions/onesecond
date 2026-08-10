(function () {
  "use strict";

  var SUPABASE_URL = "https://pdnwgzneooyygfejrvbg.supabase.co";
  var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkbndnem5lb295eWdmZWpydmJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NDc5ODgsImV4cCI6MjA5MjQyMzk4OH0.I79w8Jk-pPgoLHNrcSLhem88jz6_azcDOqglBZjRjPs";
  var ALLOWED_EMAIL = "bylts0428@gmail.com";
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
      if (!data.user || String(data.user.email || "").toLowerCase() !== ALLOWED_EMAIL) throw new Error("허용되지 않은 계정입니다.");
      saveSession(data);
      return data.user;
    } catch (_error) {
      clearSession();
      return null;
    }
  }

  function createGate() {
    var gate = document.createElement("div");
    gate.className = "dayfolder-advisor-auth-gate";
    gate.hidden = true;
    gate.innerHTML = '<form class="dayfolder-advisor-auth-card">' +
      '<h1>데이폴더 설계사 버전</h1>' +
      '<p>임태성 전용 계정으로 로그인해 주세요.</p>' +
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
      settingsButton.title = currentUser ? "임태성 설정" : "로그인";
    }

    var logoutButton = document.querySelector(".account-settings button");
    var logoutHint = document.querySelector(".account-settings small");
    if (logoutButton) {
      logoutButton.disabled = !currentUser;
      if (logoutButton.textContent !== "로그아웃") logoutButton.textContent = "로그아웃";
    }
    if (logoutHint) {
      var hint = currentUser ? "임태성 계정으로 로그인되어 있습니다." : "로그인 후 사용할 수 있습니다.";
      if (logoutHint.textContent !== hint) logoutHint.textContent = hint;
    }
  }

  function setUser(user, gate) {
    currentUser = user || null;
    gate.hidden = !!currentUser;
    syncExistingUi();
  }

  async function start() {
    var gate = createGate();
    var form = gate.querySelector("form");
    var error = gate.querySelector(".dayfolder-advisor-auth-error");
    var submit = gate.querySelector("button[type=submit]");

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

    var user = await verifyToken(localStorage.getItem(TOKEN_KEY));
    if (!user) user = await refreshSession();
    if (user && String(user.email || "").toLowerCase() === ALLOWED_EMAIL) setUser(user, gate);
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
        if (email !== ALLOWED_EMAIL) throw new Error("임태성 전용 계정만 로그인할 수 있습니다.");
        var data = await request("/auth/v1/token?grant_type=password", {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
          body: JSON.stringify({ email: email, password: password })
        });
        saveSession(data);
        setUser(data.user, gate);
        form.reset();
      } catch (loginError) {
        clearSession();
        error.textContent = loginError.message === "Invalid login credentials" ? "이메일 또는 비밀번호를 확인해 주세요." : loginError.message;
      } finally {
        submit.disabled = false;
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
