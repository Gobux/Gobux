// static/js/auth.js
(function () {
  const supabase = window.supabaseClient;

  async function requireAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    const authPanel = document.getElementById('auth-panel');
    const navbar    = document.querySelector('.navbar');
    const sections  = Array.from(document.querySelectorAll('.section'));
    const navLogout = document.getElementById('nav-logout');
    const navUser   = document.getElementById('nav-user');

    if (user) {
      if (authPanel) authPanel.style.display = 'none';
      if (navbar)    navbar.style.display    = 'flex';
      sections.forEach(sec => sec.style.display = '');
      if (navLogout) navLogout.style.display = 'inline-flex';
      if (navUser)   navUser.textContent     = user.email || '';
    } else {
      if (authPanel) authPanel.style.display = 'block';
      if (navbar)    navbar.style.display    = 'none';
      sections.forEach(sec => sec.style.display = 'none');
      if (navLogout) navLogout.style.display = 'none';
      if (navUser)   navUser.textContent     = '';
    }
    return !!user;
  }

  async function login() {
    const email = document.getElementById('auth-email')?.value.trim();
    const pass  = document.getElementById('auth-pass')?.value;
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) { alert(error.message); return; }
    await requireAuth();
  }

  async function signup() {
    const email = document.getElementById('auth-email')?.value.trim();
    const pass  = document.getElementById('auth-pass')?.value;
    const { error } = await supabase.auth.signUp({ email, password: pass });
    if (error) { alert(error.message); return; }
    alert('Account created. If email confirmation is enabled, check your inbox.');
  }

  // Updated logout handler: sign out the user and then update the UI.  Rather
  // than relying solely on a timed reload, we await the Supabase
  // signOut() promise so the session is actually cleared before we
  // reevaluate authentication.  Once sign‑out completes, we call
  // requireAuth() to flip the UI back to the login panel.  This
  // removes the need for a manual refresh.
  async function logout() {
    console.log('Logout triggered');
    try {
      // await signOut so the session is cleared before continuing
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        alert(error.message || 'Failed to sign out');
      }
    } catch (e) {
      console.error('Logout error:', e);
      alert('Failed to sign out. Please try again.');
    }
    // After signing out, refresh auth state and toggle UI accordingly
    try {
      await requireAuth();
    } catch (e) {
      console.error('requireAuth error after logout:', e);
    }
    // As a fallback, perform a hard reload with a cache‑busting query
    // to ensure any stale cached scripts or state are cleared.  We use
    // replace() instead of reload() so the history entry doesn't stick.
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('logged_out', Date.now());
      window.location.replace(url.pathname + '?' + url.searchParams.toString());
    } catch (_) {
      // If URL API fails for some reason, fallback to plain reload
      window.location.reload();
    }
  }

  function bindAuthButtons() {
    const btnLogin   = document.getElementById('btn-login');
    const btnSignup  = document.getElementById('btn-signup');
    const btnLogout  = document.getElementById('btn-logout');
    const navLogout  = document.getElementById('nav-logout');

    if (btnLogin)  btnLogin.onclick  = login;
    if (btnSignup) btnSignup.onclick = signup;
    if (btnLogout) btnLogout.onclick = logout;
    if (navLogout) navLogout.onclick = logout;
  }

  document.addEventListener('DOMContentLoaded', () => {
    bindAuthButtons();
    supabase.auth.onAuthStateChange(() => requireAuth());
    requireAuth();
  });

  window.__logout = logout;
})();
