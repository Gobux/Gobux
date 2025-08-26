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

  // Updated logout handler: sign out the user and navigate back to the root page.
  // After signing out we reload/navigate to ensure any cached state is cleared.
  async function logout() {
    console.log('Logout triggered');
    try {
      // Fire off the sign‑out but don't await it; Supabase may block/hang if the
      // network is offline. We still want to reload the page immediately.
      const signout = supabase.auth.signOut();
      // If signout resolves or rejects, we can log any errors in the background.
      signout.then(({ error }) => {
        if (error) console.error('Sign out error:', error);
      }).catch((e) => {
        console.error('Sign out exception:', e);
      });
    } catch (e) {
      console.error('Logout initiation error:', e);
    }
    // Always reload shortly after to force the UI to reset and re‑evaluate auth state.
    setTimeout(() => {
      try {
        window.location.reload();
      } catch (_) {
        location.reload();
      }
    }, 200);
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
