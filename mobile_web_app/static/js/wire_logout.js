// static/js/wire_logout.js
// Minimal helper to ensure the Log out button always triggers the logout handler.
// If a global __logout exists, it is called; otherwise we attempt to sign out
// via Supabase and then flip the UI to the login panel without a page reload.
(function () {
  function ensure() {
    var btn = document.getElementById('nav-logout');
    if (!btn || btn.__wired) return;
    btn.__wired = true;
    btn.addEventListener('click', function () {
      if (window.__logout) {
        window.__logout();
        return;
      }
      try {
        var supabase = window.supabaseClient;
        if (supabase && supabase.auth && supabase.auth.signOut) {
          supabase.auth.signOut().finally(function () {
            localStorage.clear();
            sessionStorage.clear();
            try { if (location.hash !== '#login') history.replaceState(null, '', '#login'); } catch (_e) {}
            var panel = document.getElementById('auth-panel');
            if (panel) panel.style.display = '';
            Array.from(document.querySelectorAll('.section')).forEach(function (sec) {
              if (sec) sec.style.display = 'none';
            });
            var email = document.getElementById('auth-email');
            if (email && email.focus) setTimeout(function () { email.focus(); }, 0);
          });
          return;
        }
      } catch (e) {}
      localStorage.clear();
      sessionStorage.clear();
      try { if (location.hash !== '#login') history.replaceState(null, '', '#login'); } catch (_e) {}
      var panel = document.getElementById('auth-panel');
      if (panel) panel.style.display = '';
      Array.from(document.querySelectorAll('.section')).forEach(function (sec) {
        if (sec) sec.style.display = 'none';
      });
    });
  }
  document.addEventListener('DOMContentLoaded', ensure);
  new MutationObserver(ensure).observe(document.documentElement, { childList: true, subtree: true });
})();