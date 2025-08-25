// static/js/wire_logout.js
// Guaranteed wiring for the navbar Log out button.
// Works even if auth.js didn't bind it or window.__logout is missing.
(function () {
  function wire() {
    var btn = document.getElementById('nav-logout');
    if (!btn) return;
    if (btn.__wired) return;
    btn.__wired = true;

    btn.addEventListener('click', async function () {
      try {
        if (window.__logout) {
          return window.__logout();
        }
        // Fallback: call Supabase directly
        var client = window.supabaseClient || (window.supabase && window.supabase);
        if (client && client.auth && client.auth.signOut) {
          await client.auth.signOut();
        }
        // Hide sections, show auth panel (defensive)
        var authPanel = document.getElementById('auth-panel');
        var navbar = document.querySelector('.navbar');
        var sections = Array.from(document.querySelectorAll('.section'));
        if (authPanel) authPanel.style.display = 'block';
        if (navbar) navbar.style.display = 'none';
        sections.forEach(function (sec) { sec.style.display = 'none'; });
      } catch (e) {
        console.error('Logout error:', e);
        alert('Could not log out: ' + (e.message || e));
      }
    });
  }

  document.addEventListener('DOMContentLoaded', wire);

  // In case the button is injected later:
  var obs = new MutationObserver(wire);
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();
