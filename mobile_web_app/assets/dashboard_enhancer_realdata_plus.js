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
          <!-- Canvas for dynamic donut chart -->
          <canvas id="gobux-donut" width="160" height="160" style="display:block; margin:0 auto;"></canvas>
          <ul style="margin-top:var(--s3); list-style:none; padding:0; font-size:.85rem;">
            <li style="color:#f87171;">Splurge</li>
            <li style="color:#fde047;">Bills</li>
            <li style="color:#fb923c;">Fire</li>
            <li style="color:#34d399;">Smile</li>
            <li style="color:#60a5fa;">Mojo</li>
          </ul>
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

    /*
     * Draw a dynamic donut chart for the bucket distribution. The original app
     * drew its budget chart using a canvas with the ID `budget-chart`. Here we
     * replicate that logic for the dashboard by drawing on the `gobux-donut`
     * canvas. Values are taken from the global `lastBudget` object if
     * available; if no budget has been calculated yet the chart remains
     * empty. Colours match the legend entries defined in the HTML.
     */
    function drawDonut(canvasId, values) {
      const canvas = document.getElementById(canvasId);
      if(!canvas) return;
      const ctx = canvas.getContext('2d');
      const segments = [
        { value: values.splurge, colour: '#f87171' },
        { value: values.bills,   colour: '#fde047' },
        { value: values.fire,    colour: '#fb923c' },
        { value: values.smile,   colour: '#34d399' },
        { value: values.mojo,    colour: '#60a5fa' }
      ];
      const total = segments.reduce((sum, s) => sum + (s.value > 0 ? s.value : 0), 0);
      // Clear previous drawing
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if(total <= 0) return;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = Math.min(canvas.width, canvas.height) * 0.45;
      let start = -Math.PI / 2;
      segments.forEach(seg => {
        if(seg.value <= 0) return;
        const angle = (seg.value / total) * 2 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, start, start + angle);
        ctx.closePath();
        ctx.fillStyle = seg.colour;
        ctx.fill();
        start += angle;
      });
      // Cut out centre to create donut effect. Use the card background to fill
      const innerRadius = radius * 0.6;
      ctx.beginPath();
      ctx.arc(cx, cy, innerRadius, 0, 2 * Math.PI);
      ctx.fillStyle = getComputedStyle(document.querySelector('.card')).backgroundColor || '#fff';
      ctx.fill();
    }

    // Update the donut chart using the current lastBudget values if available.
    function updateDonut(){
      const lb = window.lastBudget;
      let values = null;
      if(lb && typeof lb === 'object'){
        values = {
          splurge: lb.splurge ?? 0,
          bills:   lb.bills_due ?? lb.billsAmt ?? 0,
          fire:    lb.fire_amt ?? 0,
          smile:   lb.smile_amt ?? 0,
          mojo:    lb.mojo_amt ?? 0
        };
      } else if(history && history.length){
        // Use the most recent snapshot from history when no current lastBudget is available
        const lastSnap = history[history.length - 1];
        if(lastSnap){
          values = {
            splurge: lastSnap.splurge ?? 0,
            bills:   lastSnap.bills_due ?? 0,
            fire:    lastSnap.fire_amt ?? 0,
            smile:   lastSnap.smile_amt ?? 0,
            mojo:    lastSnap.mojo_amt ?? 0
          };
        }
      }
      if(values){
        drawDonut('gobux-donut', values);
      }
    }
    // Draw initially on load
    updateDonut();
    // Redraw when the page becomes visible again (e.g., user switches tab)
    document.addEventListener('visibilitychange', updateDonut);
    // Poll once after a short delay in case the budget is calculated shortly after page load
    setTimeout(updateDonut, 2000);

    // Regularly poll for budget changes. Some operations in the app modify
    // `lastBudget` or append to the history array asynchronously. Without
    // hooking into those updates directly, polling ensures the donut chart
    // refreshes whenever new budget data becomes available. The interval
    // is modest (every 5 seconds) to avoid unnecessary redraws while still
    // reflecting changes without needing a manual refresh.
    setInterval(updateDonut, 5000);
  });
})();
