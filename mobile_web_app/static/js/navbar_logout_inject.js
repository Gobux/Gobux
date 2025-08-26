// static/js/navbar_logout_inject.js
// Ensures a logout button + current user email exist in the navbar.
(function () {
  function ensureLogoutUI() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    let icons = navbar.querySelector('.nav-icons');
    if (!icons) {
      icons = document.createElement('div');
      icons.className = 'nav-icons';
      icons.style.marginLeft = 'auto';
      icons.style.display = 'flex';
      icons.style.gap = '8px';
      icons.style.alignItems = 'center';
      navbar.appendChild(icons);
    }

    // user email label
    let navUser = document.getElementById('nav-user');
    if (!navUser) {
      navUser = document.createElement('span');
      navUser.id = 'nav-user';
      navUser.style.opacity = '.85';
      navUser.style.fontSize = '.9rem';
      icons.prepend(navUser);
    }

    // logout button
    let navLogout = document.getElementById('nav-logout');
    if (!navLogout) {
      navLogout = document.createElement('button');
      navLogout.id = 'nav-logout';
      navLogout.title = 'Log out';
      navLogout.textContent = 'Log out';
      navLogout.className = 'btn btn-secondary';
      navLogout.style.display = 'none';
      navLogout.addEventListener('click', () => {
        if (window.__logout) return window.__logout();
        const supabase = window.supabaseClient;
        if (supabase?.auth?.signOut) supabase.auth.signOut();
      });
      icons.appendChild(navLogout);
    }
  }

  document.addEventListener('DOMContentLoaded', ensureLogoutUI);
})();
