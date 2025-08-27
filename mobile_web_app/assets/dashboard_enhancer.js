
// Gobux Dashboard Enhancer (runtime; visual only, no logic changes)
(function(){
  if (window.__gobuxDashEnh) return; window.__gobuxDashEnh = true;

  function $(sel, root=document){ return root.querySelector(sel); }
  function el(tag, cls, html){ const n=document.createElement(tag); if(cls) n.className=cls; if(html) n.innerHTML=html; return n; }

  function inject(){
    // Only run on the Dashboard page (look for 'Dashboard' heading)
    const h1s = Array.from(document.querySelectorAll('h1, .page-title, h2')).filter(h=>/dashboard/i.test(h.textContent));
    if (!h1s.length) return; // not on dashboard

    const anchor = h1s[0];

    // Wrapper section
    const section = el('section', 'container');
    section.innerHTML = `
      <div class="card hero" style="margin-bottom:24px">
        <div>
          <div class="muted">Remaining Funds</div>
          <div style="display:flex; align-items:flex-end; gap:16px">
            <div class="value" id="gobux-remaining">$0.00</div>
            <div class="badge ok" id="gobux-trend">↑ 0% vs last fortnight</div>
          </div>
          <div class="muted">Includes buckets and bills</div>
        </div>
        <svg class="sparkline" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
          <polyline fill="none" stroke="currentColor" stroke-opacity=".3" stroke-width="2"
            points="0,15 10,14 20,12 30,13 40,11 50,8 60,9 70,6 80,7 90,5 100,4"></polyline>
        </svg>
        <a href="#" class="btn" id="gobux-quick-add">Add Bill</a>
      </div>

      <div class="grid">
        <article class="card col-7">
          <h3>Upcoming Bills</h3>
          <table class="table">
            <thead><tr><th>Date</th><th>Bill</th><th class="num">Amount</th><th>Status</th></tr></thead>
            <tbody id="gobux-upcoming">
              <tr><td>—</td><td>No bills loaded yet</td><td class="num">—</td><td><span class="badge warn">Empty</span></td></tr>
            </tbody>
          </table>
        </article>

        <aside class="card col-5">
          <h3>Buckets</h3>
          <p class="muted">Smile / Fire / Mojo</p>
          <div style="display:flex; gap:12px; align-items:center">
            <div style="width:120px; aspect-ratio:1/1; border-radius:999px; background:
              conic-gradient(hsl(261 75% 55%) 0 20%, hsl(158 60% 40%) 20% 50%, hsl(40 95% 45%) 50% 100%);"></div>
            <ul style="margin:0; padding-left:16px">
              <li>Smile — 20%</li>
              <li>Fire — 30%</li>
              <li>Mojo — 50%</li>
            </ul>
          </div>
        </aside>

        <article class="card col-7">
          <h3>Recent Activity</h3>
          <ul id="gobux-activity" style="margin:0; padding:0; list-style:none">
            <li class="muted">No activity yet</li>
          </ul>
        </article>

        <aside class="card col-5">
          <h3>Goals & Debt</h3>
          <div style="display:grid; gap:12px">
            <div><div class="muted">Debt progress</div>
              <div style="height:10px; background:color-mix(in oklab, var(--ink) 5%, transparent); border-radius:999px; overflow:hidden">
                <div style="width:35%; height:100%; background:var(--ok)"></div>
              </div>
              <small class="muted">35% paid</small>
            </div>
            <div><div class="muted">Top goal</div>
              <div style="height:10px; background:color-mix(in oklab, var(--ink) 5%, transparent); border-radius:999px; overflow:hidden">
                <div style="width:60%; height:100%; background:var(--brand)"></div>
              </div>
              <small class="muted">Camera fund · 60%</small>
            </div>
          </div>
        </aside>
      </div>
    `;

    anchor.insertAdjacentElement('afterend', section);

    // Show Log out only on dashboard: add button to heading if missing
    if (!/Log\s*out/i.test(anchor.innerHTML)){
      const a = el('a', 'btn', 'Log out');
      a.href='logout'; a.style.fontWeight='600'; a.style.marginLeft='auto';
      anchor.style.display='flex'; anchor.style.alignItems='center'; anchor.style.gap='12px';
      anchor.appendChild(a);
    }
    // Hide any logout links in the top nav (if present)
    document.querySelectorAll('nav a, header a').forEach(link=>{
      if (/log\s*out/i.test(link.textContent) && !anchor.contains(link)){
        link.style.display='none';
      }
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive'){
    setTimeout(inject, 0);
  } else {
    document.addEventListener('DOMContentLoaded', inject);
  }
})();
