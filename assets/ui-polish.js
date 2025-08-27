
/* Gobux Polish Pack — ui-polish.js
   Adds non-invasive UI chrome (topbar/footer) without touching app logic.
   Safe: does not replace or move your existing elements.
   Include once on each page, preferably after the body has content.
*/
(function(){
  if (document.documentElement.classList.contains('polish-init')) return;
  document.documentElement.classList.add('polish-init');
  document.body.classList.add('app');

  // Topbar (inserted at top of body, does not move existing nodes)
  var top = document.createElement('header');
  top.className = 'topbar';
  top.innerHTML = '<div class="topbar-inner">\
    <div class="brand"><span class="dot"></span>Gobux</div>\
    <div style="display:flex; gap:10px; align-items:center; color:var(--muted)">\
      <span>Budget Assistant</span>\
    </div>\
  </div>';
  document.body.insertBefore(top, document.body.firstChild);

  // Footer (purely cosmetic)
  var foot = document.createElement('footer');
  foot.className = 'container';
  foot.style.paddingTop = '0';
  foot.style.color = 'var(--muted)';
  foot.innerHTML = '<small>Made with 💜 in QLD · Gobux</small>';
  document.body.appendChild(foot);
})();
