// AuthFor Standard Integration Library
// For use across all Mobley conglomerate sites (145 ventures)
// Provides unified authentication experience with automatic conglomerate-wide SSO

class AuthForStandard {
  constructor(options = {}) {
    this.clientId = options.clientId || 'af_mascom_standard';
    this.ventureName = options.ventureName || 'unknown_venture';
    this.redirectUrl = options.redirectUrl || window.location.origin + '/auth/callback';
    this.loginUISelector = options.loginUISelector || '#login-ui';
    this.errorSelector = options.errorSelector || '#login-error';

    // State
    this._user = null;
    this._token = localStorage.getItem('_authfor_token') || null;
    this._refreshToken = localStorage.getItem('_authfor_refresh') || null;
    this._sessionId = localStorage.getItem('_authfor_session') || null;
    this._mfaRequired = false;
    this._mfaPending = null;
    this._initialized = false;

    // Token refresh timer
    this._refreshTimer = null;
    this._refreshPromise = null;
    this._sessionEpoch = 0;
  }

  // Initialize authentication state on page load
  async init() {
    if (this._initialized) return;

    try {
      // Try to use existing token
      if (this._token) {
        this._user = await this._verifyToken();
        if (this._user) {
          this._setupAutoRefresh();
          this._initialized = true;
          this._onAuthSuccess();
          return { authenticated: true, user: this._user };
        }
      }

      // Try SSO redirect (if coming from another venture)
      const ssoToken = new URLSearchParams(window.location.search).get('sso_token');
      if (ssoToken) {
        await this._redeemSSO(ssoToken);
        return { authenticated: true, user: this._user };
      }

      // Show login UI
      this._showLoginUI();
      this._initialized = true;
      return { authenticated: false };
    } catch (e) {
      console.error('AuthFor init failed:', e);
      this._showLoginUI();
      this._initialized = true;
      return { authenticated: false, error: e.message };
    }
  }

  // Verify token is still valid
  async _verifyToken() {
    try {
      const res = await fetch('https://authfor.com/api/v1/verify', {
        headers: { 'Authorization': 'Bearer ' + this._token }
      });
      if (res.ok) {
        return await res.json();
      }
      throw new Error('Token invalid');
    } catch (e) {
      // Try refresh
      if (this._refreshToken) {
        return this._refreshSession();
      }
      throw e;
    }
  }

  // Handle registration
  async register(email, password, name, emailCode) {
    const res = await fetch('https://authfor.com/api/v1/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, password, name,
        ...(emailCode ? { email_code: emailCode } : {}),
        client_id: this.clientId,
        venture_id: this.ventureName,
        redirect_url: this.redirectUrl
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Registration failed');
    }

    const data = await res.json();
    return this._processAuthResponse(data);
  }

  // Handle login
  async login(email, password) {
    const res = await fetch('https://authfor.com/api/v1/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, password,
        client_id: this.clientId,
        venture_id: this.ventureName,
        redirect_url: this.redirectUrl
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Login failed');
    }

    const data = await res.json();

    return this._processAuthResponse(data);
  }

  // Verify MFA code
  async verifyMFA(code) {
    if (!this._mfaPending) throw new Error('No MFA pending');

    const res = await fetch('https://authfor.com/api/v1/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this._mfaLegacy
        ? { mfa_token: this._mfaPending, code }
        : { challenge: this._mfaPending, totp_code: code })
    });

    if (!res.ok) throw new Error('MFA verification failed');

    const data = await res.json();
    return this._processAuthResponse(data);
  }

  // Process successful auth response
  _processAuthResponse(data) {
    if (data.mfa_required) {
      if (!data.challenge && !data.mfa_token) throw new Error('Missing MFA challenge');
      this._mfaRequired = true;
      this._mfaPending = data.challenge || data.mfa_token;
      this._mfaLegacy = !data.challenge;
      return { mfa_required: true, methods: data.mfa_methods };
    }
    if (!data.token || !data.session_id) {
      const error = new Error(data.code === 'EMAIL_CODE_REQUIRED'
        ? 'Confirm your email with a sign-in code before creating an account.' : 'Sign-in did not return a session.');
      error.code = data.code;
      throw error;
    }
    this._sessionEpoch++;
    this._saveSession(data);
    this._mfaRequired = false;
    this._mfaPending = null;
    this._setupAutoRefresh();
    this._onAuthSuccess();
    return { success: true, user: this._user };
  }

  _saveSession(data) {
    this._token = data.token;
    this._user = data.user || this._user;
    this._sessionId = data.session_id;
    localStorage.setItem('_authfor_token', this._token);
    localStorage.setItem('_authfor_session', this._sessionId);
    this._refreshToken = data.refresh_token || null;
    if (this._refreshToken) localStorage.setItem('_authfor_refresh', this._refreshToken);
    else localStorage.removeItem('_authfor_refresh');
  }

  // One refresh at a time: old refresh-secret replay revokes the session family.
  _refreshSession() {
    if (this._refreshPromise && this._refreshPromiseEpoch === this._sessionEpoch) return this._refreshPromise;
    const epoch = this._sessionEpoch;
    const refreshToken = this._refreshToken;
    const sessionId = this._sessionId;
    const rotate = async () => {
      if (epoch !== this._sessionEpoch) throw new Error('Session changed during refresh');
      const storedRefresh = localStorage.getItem('_authfor_refresh');
      const storedSession = localStorage.getItem('_authfor_session');
      if (!storedRefresh || !storedSession || storedSession !== sessionId) throw new Error('Session changed during refresh');
      // Another tab holding the same Web Lock may already have rotated this pair.
      if (storedRefresh !== refreshToken) {
        const token = localStorage.getItem('_authfor_token');
        if (!token) throw new Error('Session changed during refresh');
        this._saveSession({ token, session_id: storedSession, refresh_token: storedRefresh });
        this._setupAutoRefresh();
        return this._user;
      }
      const res = await fetch('https://authfor.com/api/v1/refresh', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken, session_id: sessionId })
      });
      if (!res.ok) throw new Error('Session refresh failed');
      const data = await res.json();
      if (epoch !== this._sessionEpoch || localStorage.getItem('_authfor_session') !== sessionId) throw new Error('Session changed during refresh');
      if (!data.token || !data.session_id || !data.refresh_token) throw new Error('Refresh did not return the rotated session');
      this._saveSession(data);
      this._setupAutoRefresh();
      return this._user;
    };
    const locks = window.navigator && window.navigator.locks;
    const pending = Promise.resolve().then(() => {
      if (!refreshToken || !sessionId) throw new Error('No refresh token');
      return locks ? locks.request('authfor-refresh:' + sessionId, rotate) : rotate();
    }).finally(() => { if (this._refreshPromise === pending) this._refreshPromise = null; });
    this._refreshPromiseEpoch = epoch;
    this._refreshPromise = pending;
    return pending;
  }

  // Setup automatic token refresh (refresh 1 min before expiry)
  _setupAutoRefresh() {
    if (this._refreshTimer) clearTimeout(this._refreshTimer);

    if (!this._refreshToken || !this._token) return;
    // Read exp only for scheduling; the server still validates the token.
    let expiresAt = Date.now() + 60 * 60 * 1000;
    try {
      const payload = JSON.parse(atob(this._token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (typeof payload.exp === 'number' && Number.isFinite(payload.exp)) expiresAt = payload.exp * 1000;
    } catch (_) { /* legacy token: bounded one-hour fallback */ }
    const refreshIn = Math.max(0, expiresAt - Date.now() - 60 * 1000);
    const epoch = this._sessionEpoch;
    const sessionId = this._sessionId;

    this._refreshTimer = setTimeout(async () => {
      try {
        await this._refreshSession();
      } catch (e) {
        if (epoch !== this._sessionEpoch || localStorage.getItem('_authfor_session') !== sessionId) return; // A later sign-in owns its own timer/session.
        console.warn('Token refresh failed:', e);
        if (window.WeylandShell && typeof window.WeylandShell.signOut === 'function') await window.WeylandShell.signOut();
        else await this.logout();
      }
    }, refreshIn);
  }

  // Redeem SSO token from another venture
  async _redeemSSO(ssoToken) {
    const res = await fetch('https://authfor.com/api/v1/sso/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sso_token: ssoToken,
        client_id: this.clientId,
        venture_id: this.ventureName
      })
    });

    if (!res.ok) throw new Error('SSO redemption failed');

    const data = await res.json();
    return this._processAuthResponse(data);
  }

  // Generate SSO link for another venture
  getSSO_LinkFor(ventureName) {
    if (!this._token) return null;

    return `https://${ventureName}.com/auth/sso?sso_token=` +
           encodeURIComponent(this._token) +
           '&from=' + encodeURIComponent(this.ventureName);
  }

  // Show standard login UI
  _showLoginUI() {
    const container = document.querySelector(this.loginUISelector);
    if (!container) return;

    container.innerHTML = `
      <div id="authfor-primary" style="max-width:400px;margin:100px auto;padding:20px;border:1px solid #333;border-radius:8px;background:#1a1a1a">
        <h2 style="margin:0 0 20px 0;color:#fff;font-size:20px">Sign In</h2>
        <div id="authfor-error" style="color:#ff4444;margin-bottom:10px;display:none"></div>

        <div style="margin-bottom:15px">
          <input type="email" id="authfor-email" placeholder="Email"
                 style="width:100%;padding:10px;border:1px solid #444;border-radius:4px;background:#0a0a0a;color:#fff;font-size:14px;box-sizing:border-box">
        </div>

        <div style="margin-bottom:15px">
          <input type="password" id="authfor-password" placeholder="Password"
                 style="width:100%;padding:10px;border:1px solid #444;border-radius:4px;background:#0a0a0a;color:#fff;font-size:14px;box-sizing:border-box">
        </div>

        <button id="authfor-login-btn" style="width:100%;padding:10px;background:#007fff;color:#fff;border:none;border-radius:4px;font-weight:600;cursor:pointer;font-size:14px">
          SIGN IN
        </button>

        <button id="authfor-register-btn" style="width:100%;padding:10px;margin-top:10px;background:transparent;color:#007fff;border:1px solid #007fff;border-radius:4px;font-weight:600;cursor:pointer;font-size:14px">
          CREATE ACCOUNT
        </button>
      </div>
      <div id="authfor-mfa" style="display:none;max-width:400px;margin:100px auto;padding:20px;border:1px solid #333;border-radius:8px;background:#1a1a1a">
        <h2 style="margin:0 0 20px 0;color:#fff;font-size:20px">Verify Code</h2>
        <input type="text" id="authfor-mfa-code" placeholder="Enter code from authenticator"
               style="width:100%;padding:10px;margin-bottom:15px;border:1px solid #444;border-radius:4px;background:#0a0a0a;color:#fff;font-size:14px;box-sizing:border-box">
        <button id="authfor-mfa-btn" style="width:100%;padding:10px;background:#007fff;color:#fff;border:none;border-radius:4px;font-weight:600;cursor:pointer;font-size:14px">
          VERIFY
        </button>
      </div>
    `;

    // Wire up UI handlers
    this._setupUIHandlers();
  }

  // Wire up login/register UI handlers
  _setupUIHandlers() {
    const emailInput = document.getElementById('authfor-email');
    const passInput = document.getElementById('authfor-password');
    const loginBtn = document.getElementById('authfor-login-btn');
    const registerBtn = document.getElementById('authfor-register-btn');
    const errorDiv = document.getElementById('authfor-error');

    loginBtn.onclick = async () => {
      const email = emailInput.value.trim();
      const password = passInput.value;

      if (!email || !password) {
        errorDiv.textContent = 'Email and password required';
        errorDiv.style.display = 'block';
        return;
      }

      loginBtn.disabled = true;
      loginBtn.textContent = 'SIGNING IN...';

      try {
        const result = await this.login(email, password);
        if (result.mfa_required) {
          // Both cards live inside the login container. Keep their parent visible.
          document.querySelector(this.loginUISelector).style.display = 'block';
          document.getElementById('authfor-primary').style.display = 'none';
          document.getElementById('authfor-mfa').style.display = 'block';
          this._setupMFAHandler();
          document.getElementById('authfor-mfa-code').focus();
        }
      } catch (e) {
        errorDiv.textContent = e.message.toUpperCase();
        errorDiv.style.display = 'block';
      } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'SIGN IN';
      }
    };

    registerBtn.onclick = () => {
      const name = prompt('Name?');
      if (!name) return;

      registerBtn.disabled = true;
      registerBtn.textContent = 'CREATING ACCOUNT...';

      this.register(emailInput.value.trim(), passInput.value, name)
        .then(() => {
          errorDiv.style.display = 'none';
        })
        .catch(e => {
          errorDiv.textContent = e.message.toUpperCase();
          errorDiv.style.display = 'block';
        })
        .finally(() => {
          registerBtn.disabled = false;
          registerBtn.textContent = 'CREATE ACCOUNT';
        });
    };
  }

  // Wire up MFA handler
  _setupMFAHandler() {
    const mfaBtn = document.getElementById('authfor-mfa-btn');
    const mfaCode = document.getElementById('authfor-mfa-code');

    mfaBtn.onclick = async () => {
      mfaBtn.disabled = true;
      try {
        await this.verifyMFA(mfaCode.value);
      } catch (e) {
        alert(e.message);
      } finally {
        mfaBtn.disabled = false;
      }
    };
  }

  // Called on successful auth
  _onAuthSuccess() {
    // Hide login UI
    const loginUI = document.querySelector(this.loginUISelector);
    if (loginUI) loginUI.style.display = 'none';

    // Fire custom event
    window.dispatchEvent(new CustomEvent('authfor-success', { detail: this._user }));
  }

  // Logout
  async logout() {
    const token = this._token;
    const sessionId = this._sessionId;
    const epoch = ++this._sessionEpoch; // An outstanding refresh cannot restore this session.
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    this._refreshTimer = null;
    this._token = null;
    this._user = null;
    this._refreshToken = null;
    this._sessionId = null;
    this._mfaRequired = false;
    this._mfaPending = null;

    // A stale tab must not clear a newer tab's primary sign-in. Clear the
    // owned pair now; the remote answer must never clear credentials later.
    const ownsStoredSession = sessionId
      ? localStorage.getItem('_authfor_session') === sessionId
      : token && localStorage.getItem('_authfor_token') === token;
    if (ownsStoredSession) {
      localStorage.removeItem('_authfor_token');
      localStorage.removeItem('_authfor_refresh');
      localStorage.removeItem('_authfor_session');
    }

    if (token) {
      try {
        await fetch('https://authfor.com/api/v1/logout', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ session_id: sessionId })
        });
      } catch (e) { /* the owned local session already ended */ }
    }

    // A newer sign-in (or MFA challenge) owns its UI and timer. Only reload
    // while this logout still owns the signed-out state.
    if (epoch === this._sessionEpoch && !this._token && !this._mfaRequired &&
        !localStorage.getItem('_authfor_token') && !localStorage.getItem('_authfor_session')) {
      window.location.reload();
    }
  }

  // Public API
  isAuthenticated() { return !!this._token && !this._mfaRequired; }
  getUser() { return Promise.resolve(this._user); } // Return Promise for backward compatibility
  getToken() { return this._token; }

  // Alias for backward compatibility with old AuthFor SDK
  signIn(opts) { return this.login(opts.email, opts.password); }
}

// Export for use
window.AuthForStandard = AuthForStandard;

// Ephemeral-first identity (Suno.ai-style zero-friction entry): every
// visitor gets a real, immediately usable guest token with no signup
// wall, proxied through to AuthFor's real POST /api/v1/ephemeral/create.
// Shared across every page on this origin via the same sessionStorage
// key index.html's own copy of this helper uses, so navigating from the
// main story page to a standalone product page in the same tab reuses
// the same token instead of minting a second one. Each standalone
// product page should call this as a fallback when AuthForStandard has
// no real token yet, rather than showing a sign-in wall before first use
// - the backend's own per-product EPHEMERAL_TRIAL_PRODUCTS allowlist (see
// each worker's lib/auth.js) decides what an ephemeral token can actually
// reach; a product that isn't eligible returns a real, honest 402 rather
// than silently failing.
(function () {
  var EPHEMERAL_TOKEN_KEY = "weylandai_ephemeral_token_v1";
  window.ephemeralToken = function () {
    try {
      var existing = sessionStorage.getItem(EPHEMERAL_TOKEN_KEY);
      if (existing) return Promise.resolve(existing);
    } catch (_) {}
    return fetch("/api/auth/ephemeral", { method: "POST" })
      .then(function (r) { if (!r.ok) throw new Error("ephemeral auth failed"); return r.json(); })
      .then(function (d) {
        try { sessionStorage.setItem(EPHEMERAL_TOKEN_KEY, d.token); } catch (_) {}
        return d.token;
      });
  };
})();
