/**
 * BICOBS - Universal Mini Login & Registration Modal + Auth Guard
 * Taurus Bike Shop Ordering and Billing System
 * Provides seamless modal sign-in / registration for all account-required actions.
 */

const BICOBS_Auth = (() => {
  let pendingCallback = null;
  let isModalActive = false;

  // Check if current user has an active auth token
  function isAuthenticated() {
    const token = localStorage.getItem('token') || localStorage.getItem('bicobs_token');
    return !!token;
  }

  function getToken() {
    return localStorage.getItem('token') || localStorage.getItem('bicobs_token') || '';
  }

  // Get current logged in user object
  function getCurrentUser() {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) return JSON.parse(userStr);
      const name = localStorage.getItem('tb_user_name');
      if (name) {
        return {
          name: name,
          email: localStorage.getItem('tb_user_email') || '',
          phone: localStorage.getItem('tb_user_phone') || '',
          address: localStorage.getItem('tb_user_shipping') || ''
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // Clear auth tokens and user data cleanly
  function clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('bicobs_token');
    localStorage.removeItem('user');
    localStorage.removeItem('tb_user_name');
    localStorage.removeItem('tb_user_email');
    localStorage.removeItem('tb_user_phone');
    localStorage.removeItem('tb_user_shipping');
    updateHeaderUI();
  }

  // Build and inject modal DOM if not already present
  function ensureModalExists() {
    if (document.getElementById('bicobs_mini_login_modal')) return;

    const modalHTML = document.createElement('div');
    modalHTML.id = 'bicobs_mini_login_modal';
    modalHTML.className = 'modal_overlay';
    modalHTML.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      z-index: 99999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
      box-sizing: border-box;
      opacity: 0;
      transition: opacity 0.25s ease;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    `;

    modalHTML.innerHTML = `
      <div style="
        background: #ffffff;
        border-radius: 16px;
        width: 100%;
        max-width: 440px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
        overflow: hidden;
        position: relative;
        transform: translateY(20px);
        transition: transform 0.25s ease;
        border: 1px solid #e2e8f0;
      " id="bicobs_mini_login_card">
        
        <!-- Header -->
        <div style="padding: 20px 24px 16px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; background: #fafbfc;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="/frontend/Pictures/logo.png" alt="Taurus Bike" style="width: 34px; height: 34px; object-fit: contain;">
            <div>
              <h3 id="bicobs_auth_modal_title" style="margin: 0; font-size: 18px; font-weight: 700; color: #0f172a; line-height: 1.2;">Sign In to Taurus Bike</h3>
              <p id="bicobs_auth_modal_subtitle" style="margin: 3px 0 0; font-size: 13px; color: #64748b;">Please sign in to complete your action</p>
            </div>
          </div>
          <button type="button" id="btn_close_mini_login" aria-label="Close" style="background: none; border: none; font-size: 24px; color: #94a3b8; cursor: pointer; padding: 4px 8px; line-height: 1; border-radius: 6px; transition: color 0.15s;">&times;</button>
        </div>

        <!-- Mode Toggle Tabs -->
        <div style="display: flex; border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
          <button type="button" id="tab_mini_login" style="
            flex: 1;
            padding: 12px;
            font-size: 14px;
            font-weight: 700;
            color: #dc2626;
            border: none;
            background: #ffffff;
            border-bottom: 2px solid #dc2626;
            cursor: pointer;
            transition: all 0.2s;
          ">Sign In</button>
          <button type="button" id="tab_mini_register" style="
            flex: 1;
            padding: 12px;
            font-size: 14px;
            font-weight: 600;
            color: #64748b;
            border: none;
            background: #f8fafc;
            border-bottom: 2px solid transparent;
            cursor: pointer;
            transition: all 0.2s;
          ">Create Account</button>
        </div>

        <!-- Error/Success Alert Box -->
        <div style="padding: 16px 24px 0;">
          <div id="bicobs_mini_login_alert" style="display: none; background: #fee2e2; color: #dc2626; padding: 10px 14px; border-radius: 8px; font-size: 13px; border-left: 4px solid #ef4444; font-weight: 500;"></div>
        </div>

        <!-- Sign In Form -->
        <form id="bicobs_mini_login_form" style="padding: 16px 24px 24px; margin: 0; display: block;">
          <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">Email or Username</label>
            <input type="text" id="mini_login_email" placeholder="e.g. customer@example.com" required autocomplete="username" style="
              width: 100%;
              padding: 10px 14px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              font-size: 14px;
              box-sizing: border-box;
              outline: none;
              transition: border-color 0.2s;
            ">
          </div>

          <div style="margin-bottom: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label style="font-size: 12px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.5px;">Password</label>
            </div>
            <input type="password" id="mini_login_password" placeholder="Enter your password" required autocomplete="current-password" style="
              width: 100%;
              padding: 10px 14px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              font-size: 14px;
              box-sizing: border-box;
              outline: none;
              transition: border-color 0.2s;
            ">
          </div>

          <button type="submit" id="btn_submit_mini_login" style="
            width: 100%;
            padding: 12px;
            background: #dc2626;
            color: #ffffff;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
            transition: background 0.2s, transform 0.1s;
          ">
            Sign In & Continue
          </button>
        </form>

        <!-- Register Form -->
        <form id="bicobs_mini_register_form" style="padding: 16px 24px 24px; margin: 0; display: none;">
          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Full Name</label>
            <input type="text" id="mini_reg_name" placeholder="Your full name" required style="
              width: 100%;
              padding: 9px 12px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              font-size: 14px;
              box-sizing: border-box;
              outline: none;
            ">
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Email Address</label>
            <input type="email" id="mini_reg_email" placeholder="your.email@example.com" required style="
              width: 100%;
              padding: 9px 12px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              font-size: 14px;
              box-sizing: border-box;
              outline: none;
            ">
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Phone Number</label>
            <input type="tel" id="mini_reg_phone" placeholder="09171234567" style="
              width: 100%;
              padding: 9px 12px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              font-size: 14px;
              box-sizing: border-box;
              outline: none;
            ">
          </div>

          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Create Password</label>
            <input type="password" id="mini_reg_password" placeholder="At least 6 characters" required style="
              width: 100%;
              padding: 9px 12px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              font-size: 14px;
              box-sizing: border-box;
              outline: none;
            ">
          </div>

          <button type="submit" id="btn_submit_mini_register" style="
            width: 100%;
            padding: 12px;
            background: #dc2626;
            color: #ffffff;
            border: none;
            border-radius: 8px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
            transition: background 0.2s, transform 0.1s;
          ">
            Create Account & Continue
          </button>
        </form>

      </div>
    `;

    document.body.appendChild(modalHTML);

    // Tab switcher
    const tabLogin = document.getElementById('tab_mini_login');
    const tabRegister = document.getElementById('tab_mini_register');
    const formLogin = document.getElementById('bicobs_mini_login_form');
    const formRegister = document.getElementById('bicobs_mini_register_form');
    const alertBox = document.getElementById('bicobs_mini_login_alert');

    function switchMode(mode) {
      if (alertBox) alertBox.style.display = 'none';
      if (mode === 'register') {
        tabRegister.style.background = '#ffffff';
        tabRegister.style.color = '#dc2626';
        tabRegister.style.borderBottom = '2px solid #dc2626';
        tabRegister.style.fontWeight = '700';

        tabLogin.style.background = '#f8fafc';
        tabLogin.style.color = '#64748b';
        tabLogin.style.borderBottom = '2px solid transparent';
        tabLogin.style.fontWeight = '600';

        formLogin.style.display = 'none';
        formRegister.style.display = 'block';
      } else {
        tabLogin.style.background = '#ffffff';
        tabLogin.style.color = '#dc2626';
        tabLogin.style.borderBottom = '2px solid #dc2626';
        tabLogin.style.fontWeight = '700';

        tabRegister.style.background = '#f8fafc';
        tabRegister.style.color = '#64748b';
        tabRegister.style.borderBottom = '2px solid transparent';
        tabRegister.style.fontWeight = '600';

        formLogin.style.display = 'block';
        formRegister.style.display = 'none';
      }
    }

    if (tabLogin) tabLogin.addEventListener('click', () => switchMode('login'));
    if (tabRegister) tabRegister.addEventListener('click', () => switchMode('register'));

    // Close handlers
    const closeBtn = document.getElementById('btn_close_mini_login');
    if (closeBtn) closeBtn.addEventListener('click', hideLoginModal);

    modalHTML.addEventListener('click', (e) => {
      if (e.target === modalHTML) hideLoginModal();
    });

    // Login Form Submit
    if (formLogin) {
      formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('mini_login_email').value.trim();
        const password = document.getElementById('mini_login_password').value;
        const submitBtn = document.getElementById('btn_submit_mini_login');

        alertBox.style.display = 'none';
        submitBtn.disabled = true;
        const origText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';

        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });

          const data = await res.json();

          if (res.ok && data.status === 'success') {
            saveSession(data.token, data.data);
            hideLoginModal();

            if (window.BICOBS_Cart) {
              window.BICOBS_Cart.showToast(`Welcome back, ${data.data.name}!`, 'success');
            }

            executePending(data.data);
          } else {
            alertBox.textContent = data.message || 'Invalid email/username or password.';
            alertBox.style.display = 'block';
          }
        } catch (err) {
          alertBox.textContent = 'Connection error. Please check your network.';
          alertBox.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
        }
      });
    }

    // Register Form Submit
    if (formRegister) {
      formRegister.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('mini_reg_name').value.trim();
        const email = document.getElementById('mini_reg_email').value.trim();
        const phone = document.getElementById('mini_reg_phone').value.trim();
        const password = document.getElementById('mini_reg_password').value;
        const submitBtn = document.getElementById('btn_submit_mini_register');

        alertBox.style.display = 'none';
        submitBtn.disabled = true;
        const origText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password })
          });

          const data = await res.json();

          if (res.ok && data.status === 'success') {
            saveSession(data.token, data.data);
            hideLoginModal();

            if (window.BICOBS_Cart) {
              window.BICOBS_Cart.showToast(`Account created! Welcome, ${data.data.name}!`, 'success');
            }

            executePending(data.data);
          } else {
            alertBox.textContent = data.message || 'Registration failed. Please try again.';
            alertBox.style.display = 'block';
          }
        } catch (err) {
          alertBox.textContent = 'Connection error. Please try again.';
          alertBox.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerHTML = origText;
        }
      });
    }
  }

  function saveSession(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('bicobs_token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('tb_user_name', user.name || '');
    localStorage.setItem('tb_user_email', user.email || '');
    localStorage.setItem('tb_user_phone', user.phone || '');
    localStorage.setItem('tb_user_shipping', user.address || '');
    updateHeaderUI();
  }

  function executePending(user) {
    if (typeof pendingCallback === 'function') {
      const cb = pendingCallback;
      pendingCallback = null;
      cb(user);
    } else {
      window.dispatchEvent(new CustomEvent('bicobs_auth_changed', { detail: user }));
    }
  }

  // Show the mini login modal
  function showLoginModal(options = {}) {
    ensureModalExists();
    isModalActive = true;

    const modal = document.getElementById('bicobs_mini_login_modal');
    const card = document.getElementById('bicobs_mini_login_card');
    const subtitle = document.getElementById('bicobs_auth_modal_subtitle');
    const alertBox = document.getElementById('bicobs_mini_login_alert');

    if (alertBox) alertBox.style.display = 'none';

    if (subtitle && options.message) {
      subtitle.textContent = options.message;
    } else if (subtitle) {
      subtitle.textContent = 'Please sign in to complete your action';
    }

    pendingCallback = options.onSuccess || null;

    if (modal && card) {
      modal.style.display = 'flex';
      setTimeout(() => {
        modal.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 10);
    }
  }

  // Hide the mini login modal
  function hideLoginModal() {
    isModalActive = false;
    const modal = document.getElementById('bicobs_mini_login_modal');
    const card = document.getElementById('bicobs_mini_login_card');
    if (modal && card) {
      modal.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      setTimeout(() => {
        modal.style.display = 'none';
      }, 250);
    }
  }

  // Guard any action: if logged in, runs action; if not, opens login modal and runs action upon successful login
  function requireAuth(actionCallback, message = 'Please sign in to continue') {
    if (isAuthenticated()) {
      actionCallback(getCurrentUser());
    } else {
      showLoginModal({
        message,
        onSuccess: (user) => {
          actionCallback(user);
        }
      });
    }
  }

  // Page level guard: check if current page requires auth
  function checkPageAuth(promptMessage = 'Please sign in to access your account') {
    if (!isAuthenticated()) {
      showLoginModal({
        message: promptMessage,
        onSuccess: (user) => {
          window.location.reload();
        }
      });
    }
  }

  // Update header buttons & account pill
  function updateHeaderUI() {
    const user = getCurrentUser();
    const token = getToken();

    document.querySelectorAll('.btn_header, .header_actions_group a').forEach(el => {
      const text = el.textContent.trim().toLowerCase();
      if (text.includes('sign in') || text.includes('sign up') || el.id === 'header_user_btn') {
        if (token && user && user.name) {
          el.innerHTML = `<i class="fas fa-user-circle" style="color: #dc2626; margin-right: 4px;"></i> <span>${user.name.split(' ')[0]}</span>`;
          el.href = '/frontend/pages/Dashboard/dashboard.html';
          el.title = `Signed in as ${user.name}`;
        } else {
          el.innerHTML = `<span>Sign In / Sign Up</span>`;
          el.href = '/frontend/pages/login.html';
          el.title = 'Sign in or register an account';
        }
      }
    });
  }

  // Intercept global fetch to handle 401s silently and prompt mini login modal
  function installFetchInterceptor() {
    if (typeof window === 'undefined' || !window.fetch) return;
    const originalFetch = window.fetch;

    window.fetch = async function(...args) {
      const response = await originalFetch.apply(this, args);
      const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';

      // If backend returns 401 Unauthorized for an API call (excluding login/register attempts)
      if (response.status === 401 && url.includes('/api/') && !url.includes('/api/auth/login') && !url.includes('/api/auth/register')) {
        // Clear expired / invalid token
        clearAuth();

        // Prompt the mini login window gracefully
        if (!isModalActive) {
          showLoginModal({
            message: 'Your session has expired. Please sign in to continue.'
          });
        }
      }
      return response;
    };
  }

  // Auto initialize on DOMContentLoaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        ensureModalExists();
        updateHeaderUI();
        installFetchInterceptor();
      });
    } else {
      ensureModalExists();
      updateHeaderUI();
      installFetchInterceptor();
    }
  }

  return {
    isAuthenticated,
    getToken,
    getCurrentUser,
    clearAuth,
    showLoginModal,
    hideLoginModal,
    requireAuth,
    checkPageAuth,
    updateHeaderUI
  };
})();

// Attach to window
if (typeof window !== 'undefined') {
  window.BICOBS_Auth = BICOBS_Auth;
}
