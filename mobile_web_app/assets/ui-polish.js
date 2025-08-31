// Gobux UI Polish
// Applies the app layout class and injects a frosted top bar and a footer when missing.
(function(){
  // Prevent multiple injections
  if(window.__gobuxUIPolish) return;
  window.__gobuxUIPolish = true;
  // Run when DOM is ready
  function onReady(fn){ if(document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  onReady(function(){
    const body = document.body;
    // Add the generic layout class
    if(!body.classList.contains('app')) body.classList.add('app');
    // Add a default top bar if none exists
    if(!document.querySelector('.topbar')){
      const header = document.createElement('header');
      header.className = 'topbar';
      header.innerHTML = '<div class="topbar-inner"><div class="brand"><span class="dot"></span> Gobux</div><div class="user">Budget Assistant</div></div>';
      body.insertBefore(header, body.firstChild);
    }
    // Add a simple footer if there isn't one
    if(!document.querySelector('footer')){
      const footer = document.createElement('footer');
      footer.className = 'container';
      footer.style.paddingTop = '0';
      footer.style.color = 'var(--muted)';
      footer.innerHTML = '<small>Made with 💜 in QLD · Gobux</small>';
      body.appendChild(footer);
    }
  });
})();