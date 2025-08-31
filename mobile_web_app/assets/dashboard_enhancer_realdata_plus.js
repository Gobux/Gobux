// Gobux Dashboard Enhancer (realdata+)
// This script enriches the dashboard page by injecting a hero section, an upcoming bills table,
// a buckets donut, recent activity and goals/debt progress. It reads real values from the
// existing dashboard cards and attempts to populate lists from global variables or localStorage.
(function(){
  if(window.__gobuxDashPlus) return;
  window.__gobuxDashPlus = true;

  function $(sel, root=document){ return root.querySelector(sel); }
  function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  // Extract a numeric value from a string that may contain currency, commas or other characters.
  function parseNumber(str){
    const cleaned = (str||'').replace(/[^0-9.-]+/g,'');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  // Wait until the DOM is ready
  function onReady(fn){ if(document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  onReady(function(){
    // Look for a heading containing 'dashboard' (case-insensitive)
    const headings = $all('h1,h2,.page-title').filter(h => /dashboard/i.test(h.textContent));
    if(!headings.length) return; // abort on non-dashboard pages
    const anchor = headings[0];

    // Gather values from existing cards
    let remaining = 0;
    let totalDebt = 0;
    let saving = 0;
    let upcomingCount = 0;
    const cards = $all('.card');
    cards.forEach(card => {
      const h3 = $('h3', card);
      if(!h3) return;
      const text = card.textContent;
      if(/remaining funds/i.test(h3.textContent)){
        remaining = parseNumber(text);
      } else if(/total debt/i.test(h3.textContent)){
        totalDebt = parseNumber(text);
      } else if(/saving progress/i.test(h3.textContent)){
        // percent as number
        const m = text.match(/([0-9]+)%/);
        saving = m ? parseFloat(m[1]) : 0;
      } else if(/upcoming bills/i.test(h3.textContent)){
        const m = text.match(/([0-9]+)/);
        upcomingCount = m ? parseInt(m[1]) : 0;
      }
    });

    // Format functions
    const currencyFormatter = new Intl.NumberFormat('en-AU',{style:'currency',currency:'AUD'});
    const pct = v => `${v.toFixed(0)}%`;

    // Build the new dashboard section
    const section = document.createElement('section');
    section.className = 'container';
    // Compute debt progress ratio for bar: assume remaining + debt is total; avoid divide by zero
    const debtRatio = (remaining + totalDebt) ? (remaining/(remaining + totalDebt)) * 100 : 100;
    const debtLabel = totalDebt ? `${currencyFormatter.format(remaining)} remaining of ${currencyFormatter.format(remaining+totalDebt)}` : 'No debt';
    section.innerHTML = `
      <!-- Hero balance -->
      <div class="card" style="margin-bottom:24px; display:flex; justify-content:space-between; align-items:flex-end; gap:24px;">
        <div>
          <div class="muted">Remaining Funds</div>
          <div style="font-size:2.4rem;font-weight:800;">${currencyFormatter.format(remaining)}</div>
          <span class="badge ok">↑ 0% vs last fortnight</span>
        </div>
        <svg class="sparkline" viewBox="0 0 100 20" preserveAspectRatio="none" style="width:200px; height:60px;">
          <polyline fill="none" stroke="currentColor" stroke-opacity=".3" stroke-width="2"
            points="0,15 10,14 20,12 30,13 40,11 50,8 60,9 70,6 80,7 90,5 100,4"></polyline>
        </svg>
        <button class="btn" id="gobux-quick-add">Add Bill</button>
      </div>
      <div class="grid">
        <!-- Upcoming bills -->
        <article class="card col-7">
          <h3>Upcoming Bills</h3>
          <table class="table">
            <thead><tr><th>Date</th><th>Bill</th><th class="num">Amount</th><th>Status</th></tr></thead>
            <tbody id="gobux-upcoming">
              <tr><td colspan="4">${upcomingCount ? 'Loading…' : 'No bills found'}</td></tr>
            </tbody>
          </table>
        </article>
        <!-- Buckets donut -->
        <aside class="card col-5">
          <h3>Buckets</h3>
          <p class="muted">Distribution</p>
          <div style="display:flex; gap:12px; align-items:center">
            <div style="width:120px; aspect-ratio:1/1; border-radius:999px; background:
              conic-gradient(hsl(261,75%,55%) 0 33%, hsl(158,60%,40%) 33% 66%, hsl(40,95%,45%) 66% 100%);"></div>
            <ul style="margin:0; padding-left:16px">
              <li>Bucket 1</li>
              <li>Bucket 2</li>
              <li>Bucket 3</li>
            </ul>
          </div>
        </aside>
        <!-- Recent Activity -->
        <article class="card col-7">
          <h3>Recent Activity</h3>
          <ul id="gobux-activity" style="margin:0; padding:0; list-style:none">
            <li class="muted">No recent activity</li>
          </ul>
        </article>
        <!-- Goals & Debt -->
        <aside class="card col-5">
          <h3>Goals & Debt</h3>
          <div style="display:grid; gap:12px">
            <div>
              <div class="muted">Debt progress</div>
              <div style="height:10px; background:color-mix(in oklab, var(--ink) 5%, transparent); border-radius:999px; overflow:hidden">
                <div style="width:${debtRatio}%; height:100%; background:var(--ok)"></div>
              </div>
              <small class="muted">${debtLabel}</small>
            </div>
            <div>
              <div class="muted">Saving progress</div>
              <div style="height:10px; background:color-mix(in oklab, var(--ink) 5%, transparent); border-radius:999px; overflow:hidden">
                <div style="width:${saving}%; height:100%; background:var(--brand)"></div>
              </div>
              <small class="muted">${pct(saving)}</small>
            </div>
          </div>
        </aside>
      </div>
    `;

    // Insert the new section after the heading
    anchor.insertAdjacentElement('afterend', section);

    // Helper to search for arrays in various places
    function getFirstArrayCandidates(candidates){
      for(const c of candidates){
        const parts = c.split('.');
        let obj = window;
        let valid = true;
        for(const p of parts){
          if(obj && p in obj) obj = obj[p];
          else { valid = false; break; }
        }
        if(valid && Array.isArray(obj)) return obj;
      }
      return null;
    }
    function getLocalStorageArray(keys){
      for(const k of keys){
        const val = localStorage.getItem(k);
        if(!val) continue;
        try{
          const parsed = JSON.parse(val);
          if(Array.isArray(parsed)) return parsed;
        }catch(e){}
      }
      return null;
    }
    // Attempt to load bills and history arrays from globals or localStorage
    const bills = getFirstArrayCandidates(['bills','app.bills','state.bills']) || getLocalStorageArray(['bills','upcomingBills','gobux_bills']);
    const history = getFirstArrayCandidates(['history','transactions','historyItems','app.history','state.history']) || getLocalStorageArray(['history','transactions','gobux_history']);

    // Populate upcoming bills table
    const upcomingBody = document.getElementById('gobux-upcoming');
    if(bills && bills.length){
      // filter for due within next 14 days
      const now = new Date();
      const cutoff = new Date(now.getTime() + 14*24*60*60*1000);
      const upcoming = bills.filter(b => {
        const d = new Date(b.date || b.due || b.when || b.dateDue);
        return !isNaN(d) && d >= now && d <= cutoff;
      }).sort((a,b) => new Date(a.date || a.due || a.when || 0) - new Date(b.date || b.due || b.when || 0)).slice(0,6);
      upcomingBody.innerHTML = '';
      upcoming.forEach(bill => {
        const tr = document.createElement('tr');
        const d = new Date(bill.date || bill.due || bill.when || bill.dateDue);
        const dateStr = !isNaN(d) ? d.toLocaleDateString('en-AU') : '';
        const amt = bill.amt ?? bill.amount ?? bill.value ?? 0;
        const name = bill.name || bill.label || bill.description || 'Bill';
        const status = bill.status || (new Date(bill.date) < now ? 'Overdue' : 'Scheduled');
        const statusClass = /over/i.test(status) ? 'err' : (/due/i.test(status) ? 'warn' : 'ok');
        tr.innerHTML = `
          <td>${dateStr}</td>
          <td>${name}</td>
          <td class="num">${currencyFormatter.format(amt)}</td>
          <td><span class="badge ${statusClass}">${status}</span></td>
        `;
        upcomingBody.appendChild(tr);
      });
    }

    // Populate recent activity list
    const activityList = document.getElementById('gobux-activity');
    if(history && history.length){
      activityList.innerHTML = '';
      const recent = history.slice(-6).reverse();
      recent.forEach(item => {
        const li = document.createElement('li');
        li.className = 'muted';
        // compose a summary text
        let msg = '';
        if(item.type || item.action) msg += (item.type || item.action) + ': ';
        if(item.name) msg += item.name;
        if(item.amount) msg += ' ' + currencyFormatter.format(item.amount);
        if(!msg) msg = JSON.stringify(item);
        li.textContent = msg;
        activityList.appendChild(li);
      });
    }
  });
})();
