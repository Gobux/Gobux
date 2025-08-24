// static/js/auth.js
(function () {
  const supabase = window.supabaseClient;

  function showAuthPanel() {
    const authPanel = document.getElementById('auth-panel');
    const sections = Array.from(document.querySelectorAll('.section'));
    const navUser = document.getElementById('nav-user');
    const navLogout = document.getElementById('nav-logout');
    if (navUser) navUser.textContent = '';
    if (navLogout) navLogout.style.display = 'none';
    if (authPanel) authPanel.style.display = '';
    sections.forEach(sec => sec && (sec.style.display = 'none'));
    try {
      if (location.hash !== '#login') history.replaceState(null, '', '#login');
    } catch (_) {}
    const email = document.getElementById('auth-email');
    if (email && email.focus) setTimeout(() => email.focus(), 0);
  }

  function showAppFor(user) {
    const authPanel = document.getElementById('auth-panel');
    const sections = Array.from(document.querySelectorAll('.section'));
    const navUser = document.getElementById('nav-user');
    const navLogout = document.getElementById('nav-logout');
    const navbar = document.querySelector('.navbar');
    if (navbar) navbar.style.display = 'flex';
    if (authPanel) authPanel.style.display = 'none';
    sections.forEach(sec => sec && (sec.style.display = ''));
    if (navUser) navUser.textContent = (user && user.email) || '';
    if (navLogout) navLogout.style.display = 'inline-flex';
  }

  async function refreshUI() {
    try {
      let user = null;
      if (supabase && supabase.auth && supabase.auth.getUser) {
        const res = await supabase.auth.getUser();
        user = res && res.data && res.data.user || null;
      }
      if (user) showAppFor(user);
      else showAuthPanel();
    } catch (e) {
      console.error('refreshUI error:', e);
      showAuthPanel();
    }
  }

  async function login() {
    const email = (document.getElementById('auth-email') || {}).value;
    const password = (document.getElementById('auth-pass') || {}).value;
    if (!email || !password) {
      alert('Email and password required.');
      return;
    }
    if (supabase && supabase.auth && supabase.auth.signInWithPassword) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(error.message);
        return;
      }
      await refreshUI();
    } else {
      alert('Authentication not available.');
    }
  }

  async function signup() {
    const email = (document.getElementById('auth-email') || {}).value;
    const password = (document.getElementById('auth-pass') || {}).value;
    if (!email || !password) {
      alert('Email and password required.');
      return;
    }
    if (supabase && supabase.auth && supabase.auth.signUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        alert(error.message);
        return;
      }
      alert('Sign-up complete. Check your email to confirm your account, then log in.');
    } else {
      alert('Sign-up not available.');
    }
  }

  async function logout() {
    try {
      if (supabase && supabase.auth && supabase.auth.signOut) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('supabase signOut failed (continuing):', e);
    }
    try {
      localStorage.clear();
      sessionStorage.clear();
      showAuthPanel();
      if (supabase && supabase.auth && supabase.auth.getUser) {
        setTimeout(() => {
          supabase.auth.getUser().then(() => refreshUI());
        }, 0);
      }
    } catch (e) {
      console.error('logout cleanup error:', e);
      showAuthPanel();
    }
  }

  function bindButtons() {
    const btnLogin = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    const navLogout = document.getElementById('nav-logout');
    if (btnLogin) btnLogin.onclick = login;
    if (btnSignup) btnSignup.onclick = signup;
    if (navLogout) navLogout.onclick = logout;
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindButtons();
    if (supabase && supabase.auth && supabase.auth.onAuthStateChange) {
      supabase.auth.onAuthStateChange((_event, _session) => {
        refreshUI();
      });
    }
    refreshUI();
  });

  window.__logout = logout;
})();