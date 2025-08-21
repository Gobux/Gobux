/* -----------------------------------------------------------
   Bills UI patch (drop-in): compact rows, scroll container, fortnight highlight
   Usage:
     1) Ensure your bills table has id="bills-table" (or set TABLE_ID below).
     2) Include this file after your existing scripts:
        <script defer src="/static/js/bills_ui_patch.js?v=1"></script>
----------------------------------------------------------- */
(function () {
  const TABLE_ID = 'bills-table'; // change if your table uses a different id

  // Insert a wrapper DIV around the table so it can scroll nicely
  function ensureWrapped() {
    const tbl = document.getElementById(TABLE_ID);
    if (!tbl) return null;
    if (tbl.parentElement && tbl.parentElement.id === 'bills-table-wrap') return tbl.parentElement;

    const wrap = document.createElement('div');
    wrap.id = 'bills-table-wrap';
    tbl.parentElement.insertBefore(wrap, tbl);
    wrap.appendChild(tbl);
    return wrap;
  }

  // Find index of the "Next Due" / "Next Due Date" column by header text; fallback to last content column
  function findDueDateCol(table) {
    try {
      const ths = Array.from(table.tHead ? table.tHead.rows[0].cells : []);
      const idx = ths.findIndex(th => /next\s*due(\s*date)?/i.test(th.textContent.trim()));
      if (idx >= 0) return idx;
    } catch (_) { /* ignore */ }
    // fallback: prefer the second-last column if last is actions (Edit/Delete)
    const anyRow = table.tBodies && table.tBodies[0] && table.tBodies[0].rows[0];
    return anyRow ? Math.max(0, anyRow.cells.length - 2) : 0;
  }

  // Parse YYYY-MM-DD to a local Date
  function parseISO(d) {
    const m = String(d || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3]);
  }

  // Get the fortnight start from a common input or app state
  function getFortnightWindow() {
    const cand = document.querySelector('#pay-start, #pay-start-date, #pay-cycle-start, input[type="date"]');
    let start = cand ? parseISO(cand.value) : null;
    if (!start && window.appState && window.appState.fortnightStart) {
      start = parseISO(window.appState.fortnightStart);
    }
    if (!start) return {};
    const end = new Date(start);
    end.setDate(end.getDate() + 13); // 14-day window
    return { start, end };
  }

  function inRange(d, a, b) {
    if (!d || !a || !b) return false;
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const ta = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
    const tb = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
    return t >= ta && t <= tb;
  }

  // Highlight rows due this fortnight
  function highlightBills() {
    const table = document.getElementById(TABLE_ID);
    if (!table || !table.tBodies || !table.tBodies[0]) return;

    const { start, end } = getFortnightWindow();
    const dueCol = findDueDateCol(table);

    const rows = Array.from(table.tBodies[0].rows);
    rows.forEach(tr => {
      const cells = Array.from(tr.cells);
      const cellIndex = Math.min(dueCol, cells.length - 1);
      const dueText = cells[cellIndex] ? cells[cellIndex].textContent.trim() : '';
      const due = parseISO(dueText);
      if (start && end && inRange(due, start, end)) {
        tr.classList.add('due-fortnight');
      } else {
        tr.classList.remove('due-fortnight');
      }
    });
  }

  function init() {
    ensureWrapped();
    highlightBills();

    document.addEventListener('change', (e) => {
      if (e.target && e.target.matches('#pay-start, #pay-start-date, #pay-cycle-start, input[type="date"]')) {
        highlightBills();
      }
    });

    // Re-highlight if rows change
    const table = document.getElementById(TABLE_ID);
    if (table && table.tBodies && table.tBodies[0]) {
      new MutationObserver(() => highlightBills())
        .observe(table.tBodies[0], { childList: true, subtree: false });
    }

    // expose for manual calls
    window.highlightBills = highlightBills;
  }

  document.addEventListener('DOMContentLoaded', () => setTimeout(init, 80));
})();