// logout_fix.js - force immediate UI flip on sign-out (no refresh needed)
(function () {
  function byId(id){ return document.getElementById(id); }
  function sections(){ return Array.from(document.querySelectorAll('.section')); }
  function flipToLogin() {
    try {
      const authPanel = byId('auth-panel');
      const navUser = byId('nav-user');
      const navLogout = byId('nav-logout');
      if (authPanel) authPanel.style.display = "";
      sections().forEach(s => s && (s.style.display = "none"));
      if (navUser) navUser.textContent = "";
      if (navLogout) navLogout.style.display = "none";
      try { if (location.hash !== "#login") history.replaceState(null, "", "#login"); } catch(e){}
      const email = byId('auth-email') || byId('email');
      if (email && email.focus) setTimeout(() => email.focus(), 0);
    } catch (e) {
      console.warn("flipToLogin error", e);
    }
  }
  async function doLogout() {
    try {
      const supa = window.supabaseClient || window.supabase;
      if (supa?.auth?.signOut) await supa.auth.signOut();
    } catch(e){ console.warn("signOut issue:", e); }
    try { localStorage.clear(); sessionStorage.clear(); } catch(e){}
    flipToLogin();
  }
  function wire() {
    const btn = byId('nav-logout') || byId('btn-logout');
    if (btn && !btn.__wired) {
      btn.__wired = true;
      btn.addEventListener('click', (ev)=>{ ev.preventDefault(); doLogout(); });
      // ensure visible state respects auth
      btn.style.display = "inline-flex";
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    wire();
    // auth state listener as belt-and-braces
    try {
      const supa = window.supabaseClient || window.supabase;
      if (supa?.auth?.onAuthStateChange) {
        supa.auth.onAuthStateChange((event)=>{
          if (event === 'SIGNED_OUT') flipToLogin();
        });
      }
    } catch(e){}
  });
  // expose as global fallback
  window.__logoutImmediateFix = doLogout;
})();