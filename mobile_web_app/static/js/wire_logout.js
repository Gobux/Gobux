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
          try {
            // Kick off signOut but don't await it; we will reload regardless.
            const p = client.auth.signOut();
            p.then(function ({ error }) {
              if (error) console.error('Fallback signOut error:', error);
            }).catch(function (e) {
              console.error('Fallback signOut exception:', e);
            });
          } catch (e) {
            console.error('Fallback signOut initiation error:', e);
          }
        }
        // Always reload shortly after to force the UI to reset. If reload fails,
        // show the auth panel and hide other sections as a last resort.
        setTimeout(function () {
          try {
            window.location.reload();
          } catch (_) {
            location.reload();
          }
        }, 200);
        // If for some reason reload didn't happen, hide sections and show auth panel.
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
