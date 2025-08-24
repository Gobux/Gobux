// static/js/auth.js
// Improved authentication handler for Gobux mobile web app.
// This script manages login, signup, and logout flows using Supabase,
// and updates the UI in place without forcing a hard page reload.
(function () {
  const supabase = window.supabaseClient;

  // Show only the login/register panel and hide app sections.
  function showAuthPanel() {
    const authPanel = document.getElementById('auth-panel');
    const sections  = Array.from(document.querySelectorAll('.section'));
    const navUser   = document.getElementById('nav-user');
    const navLogout = document.getElementById('nav-logout');

    if (navUser)   navUser.textContent = '';
    if (navLogout) navLogout.style.display = 'none';

    if (authPanel) authPanel.style.display = '';
    sections.forEach(sec => sec && (sec.style.display = 'none'));

    // Update location hash for any simple routers/guards.
    try { if (location.hash !== '#login') history.replaceState(null, '', '#login'); } catch (_e) {}
    // Focus the email field for convenience.
    const email = document.getElementById('auth-email');
    if (email && email.focus) setTimeout(() => email.focus(), 0);
  }

  // Show the main app UI for an authenticated user.
  function showAppFor(user) {
    const authPanel = document.getElementById('auth-panel');
    const sections  = Array.from(document.querySelectorAll('.section'));
    const navUser   = document.getElementById('nav-user');
    const navLogout = document.getElementById('nav-logout');
    const navbar    = document.querySelector('.navbar');

    if (navbar) navbar.style.display = 'flex';
    if (authPanel) authPanel.style.display = 'none';
    sections.forEach(sec => sec && (sec.style.display = ''));
    if (navUser)   navUser.textContent = user?.email || '';
    if (navLogout) navLogout.style.display = 'inline-flex';
  }

  // Check current auth state and update the UI accordingly.
  async function refreshUI() {
    try {
      let user = null;
      if (supabase?.auth?.getUser) {
        const res = await supabase.auth.getUser();
        user = res?.data?.user || null;
      }
      if (user) showAppFor(user);
      else showAuthPanel();
    } catch (e) {
      console.error('refreshUI error:', e);
    }
  }

  // Perform login with Supabase and refresh the UI.
  async function login() {
    const email = document.getElementById('auth-email')?.value;
    const pass  = document.getElementById('auth-pass')?.value;
    if (!email || !pass) return alert('Email and password required.');
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return alert(error.message);
    await refreshUI();
  }

  // Perform signup with Supabase. Informs the user to confirm email if needed.
  async function signup() {
    const email = document.getElementById('auth-email')?.value;
    const pass  = document.getElementById('auth-pass')?.value;
    if (!email || !pass) return alert('Email and password required.');
    const { error } = await supabase.auth.signUp({ email, password: pass });
    if (error) return alert(error.message);
    alert('Sign-up complete. Check your email to confirm your account, then log in.');
  }

  // Log the user out, clear local state, and display the login panel.
  async function logout() {
    try {
      if (supabase?.auth?.signOut) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('supabase signOut failed (continuing):', e);
    }
    try {
      localStorage.clear();
      sessionStorage.clear();
      // Immediately flip the UI to login
      showAuthPanel();
      // Re-check auth in a tick in case Supabase had lag
      if (supabase?.auth?.getUser) {
        setTimeout(() => supabase.auth.getUser().then(() => refreshUI()), 0);
      }
    } catch (e) {
      console.error('logout cleanup error:', e);
      showAuthPanel();
    }
  }

  // Bind click handlers to buttons and links.
  function bindButtons() {
    const btnLogin  = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    const btnLogout = document.getElementById('btn-logout');
    const navLogout = document.getElementById('nav-logout');
    if (btnLogin)  btnLogin.onclick  = login;
    if (btnSignup) btnSignup.onclick = signup;
    if (btnLogout) btnLogout.onclick = logout;
    if (navLogout) navLogout.onclick = logout;
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindButtons();
    if (supabase?.auth?.onAuthStateChange) {
      supabase.auth.onAuthStateChange(() => refreshUI());
    }
    refreshUI();
  });

  // Expose logout globally for other scripts or inline handlers.
  window.__logout = logout;
})();