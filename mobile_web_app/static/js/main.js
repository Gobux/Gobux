/*
 * main.js
 *
 * This script powers the mobile-friendly Budget Assistant. It manages
 * persistent data in localStorage, renders the various tables and forms,
 * performs the core financial calculations, and wires up user
 * interactions. The goal is to provide a streamlined but complete
 * experience comparable to the original desktop application, all
 * running entirely within the browser on your phone.
 */

// Data containers loaded from localStorage or Supabase. They persist
// between sessions. We alias the top-level arrays on `window` so
// that cloud_data.js and main.js operate on the same references.
// If window.bills/debts/goals/history already exist (e.g. after
// loadAllFromCloud), use them; otherwise initialise empty arrays.
window.bills = Array.isArray(window.bills) ? window.bills : [];
let bills = window.bills;
window.debts = Array.isArray(window.debts) ? window.debts : [];
let debts = window.debts;
window.goals = Array.isArray(window.goals) ? window.goals : [];
let goals = window.goals;
// Use a distinct property name for the budget history to avoid
// clobbering the built‑in `window.history` object. See
// cloud_data.js for related changes. If a history array already
// exists, reuse it; otherwise initialise an empty array.
window.historyData = Array.isArray(window.historyData) ? window.historyData : [];
let history = window.historyData;

// Temporary state used when computing the budget; used to save a
// snapshot after calculation.
let lastBudget = null;

// Helper to load data from localStorage on page load
async function loadData() {
  // Read persisted data from localStorage
  const billsData = JSON.parse(localStorage.getItem('bills') || '[]');
  const debtsData = JSON.parse(localStorage.getItem('debts') || '[]');
  const goalsData = JSON.parse(localStorage.getItem('goals') || '[]');
  const historyData = JSON.parse(localStorage.getItem('history') || '[]');
  // Overwrite the existing arrays in place so that both the
  // `bills`/`debts`/`goals`/`history` variables and their
  // corresponding `window` properties continue to refer to the
  // same arrays. This maintains compatibility with cloud_data.js,
  // which operates on window.bills etc.
  window.bills.splice(0, window.bills.length, ...billsData);
  window.debts.splice(0, window.debts.length, ...debtsData);
  window.goals.splice(0, window.goals.length, ...goalsData);
  window.historyData.splice(0, window.historyData.length, ...historyData);
  // Ensure debts have initialAmount property for progress bar
  window.debts.forEach(d => {
    if (d.initialAmount === undefined) {
      d.initialAmount = d.amount;
    }
  });
        // Refresh from cloud to avoid any local/remote divergence
        if (typeof window.loadAllFromCloud === 'function') {
          await window.loadAllFromCloud();
          bills = window.bills;
          renderBillsTable();
          return;
        }
  // Reassign local references in case they pointed to stale arrays
  bills = window.bills;
  debts = window.debts;
  goals = window.goals;
  history = window.historyData;
}

// Helper to save all data containers back to localStorage
function saveData() {
  localStorage.setItem('bills', JSON.stringify(bills));
  localStorage.setItem('debts', JSON.stringify(debts));
  localStorage.setItem('goals', JSON.stringify(goals));
  localStorage.setItem('history', JSON.stringify(history));
  // Update dashboard whenever data changes
  renderDashboard();
}

// Formatting helper for currency
function fmtMoney(val) {
  if (val === null || isNaN(val)) return '$0.00';
  return '$' + Number(val).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// Date formatting helper (yyyy-mm-dd)
function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ===================== Custom frequency helpers =====================
// Human-readable label for a bill frequency (supports Custom)
function frequencyLabel(bill) {
  if (!bill || bill.frequency !== 'Custom') return bill.frequency;
  const v = Number(bill.customValue || 1);
  const u = bill.customUnit || 'Week';
  const plural = v > 1 ? 's' : '';
  return `Every ${v} ${u}${plural}`;
}
// Internal: advance a date by this bill's period
function addPeriodForBill(date, bill) {
  const newDate = new Date(date);
  if (bill && bill.frequency === 'Custom') {
    const v = Number(bill.customValue || 1);
    const u = bill.customUnit || 'Week';
    if (u === 'Day') newDate.setDate(newDate.getDate() + v);
    else if (u === 'Week') newDate.setDate(newDate.getDate() + 7 * v);
    else if (u === 'Month') newDate.setMonth(newDate.getMonth() + v);
    else if (u === 'Year') newDate.setFullYear(newDate.getFullYear() + v);
    return newDate;
  }
  switch (bill && bill.frequency) {
    case 'Weekly': newDate.setDate(newDate.getDate() + 7); break;
    case 'Fortnightly': newDate.setDate(newDate.getDate() + 14); break;
    case 'Monthly': newDate.setMonth(newDate.getMonth() + 1); break;
    case 'Annually': newDate.setFullYear(newDate.getFullYear() + 1); break;
    default: break;
  }
  return newDate;
}
// Compute the next due date of a bill relative to today (supports Custom)
function computeNextDueBill(bill) {
  if (!bill || !bill.startDate) return null;
  let d = new Date(bill.startDate);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Once Off bills return null if past
  if (bill.frequency === 'Once Off') {
    return (d >= today) ? d : null;
  }
  while (d < today) {
    d = addPeriodForBill(d, bill);
  }
  return d;
}
// Determine if a bill is due within the current fortnight window (supports Custom)
function isDueThisFortnightCustom(bill, fStart) {
  if (!bill || !bill.startDate) return false;
  const startDate = new Date(bill.startDate);
  startDate.setHours(0, 0, 0, 0);
  const fStartDate = new Date(fStart);
  fStartDate.setHours(0, 0, 0, 0);
  const fEndDate = new Date(fStartDate.getTime() + 14 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000);
  // Once Off
  if (bill.frequency === 'Once Off') {
    return (startDate >= fStartDate && startDate <= fEndDate);
  }
  let d = new Date(startDate);
  d.setHours(0, 0, 0, 0);
  while (d < fStartDate) {
    d = addPeriodForBill(d, bill);
  }
  return (d >= fStartDate && d <= fEndDate);
}
// ===================== End custom frequency helpers =====================

// Compute the next due date of a bill relative to today
function computeNextDue(startDate, frequency) {
  if (!startDate) return null;
  let d = new Date(startDate);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // For once off bills, return null if already past
  if (frequency === 'Once Off') {
    return (d >= today) ? d : null;
  }
  // Determine the increment in days or months
  function addPeriod(date, freq) {
    const newDate = new Date(date);
    switch (freq) {
      case 'Weekly': newDate.setDate(newDate.getDate() + 7); break;
      case 'Fortnightly': newDate.setDate(newDate.getDate() + 14); break;
      case 'Monthly': newDate.setMonth(newDate.getMonth() + 1); break;
      case 'Annually': newDate.setFullYear(newDate.getFullYear() + 1); break;
      default: break;
    }
    return newDate;
  }
  let freq = frequency;
  while (d < today) {
    d = addPeriod(d, freq);
  }
  return d;
}

// Determine if a bill is due within the current fortnight window
function isDueThisFortnight(bill, fStart) {
  const startDate = new Date(bill.startDate);
  startDate.setHours(0, 0, 0, 0);
  const fStartDate = new Date(fStart);
  fStartDate.setHours(0, 0, 0, 0);
  const fEndDate = new Date(fStartDate.getTime() + 14 * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000);
  let freq = bill.frequency;
  let d = new Date(startDate);
  d.setHours(0, 0, 0, 0);
  // Once Off
  if (freq === 'Once Off') {
    return (d >= fStartDate && d <= fEndDate);
  }
  // Determine the increment
  function addPeriod(date, freq) {
    const newDate = new Date(date);
    switch (freq) {
      case 'Weekly': newDate.setDate(newDate.getDate() + 7); break;
      case 'Fortnightly': newDate.setDate(newDate.getDate() + 14); break;
      case 'Monthly': newDate.setMonth(newDate.getMonth() + 1); break;
      case 'Annually': newDate.setFullYear(newDate.getFullYear() + 1); break;
      default: break;
    }
    return newDate;
  }
  // Advance d until it's on or after fStart
  while (d < fStartDate) {
    d = addPeriod(d, freq);
  }
  return (d >= fStartDate && d <= fEndDate);
}

// Render functions for each table
function renderBillsTable() {
  const tbody = document.querySelector('#bills-table tbody');
  tbody.innerHTML = '';
  const showFilter = document.getElementById('filter-show').value;
  const searchQ = document.getElementById('search-bills').value.trim().toLowerCase();
  const payStart = document.getElementById('pay-start').value;
  let fStart = null;
  if (payStart) {
    fStart = new Date(payStart);
  }
  bills.forEach(bill => {
    // search filter
    if (searchQ && !bill.name.toLowerCase().includes(searchQ)) {
      return;
    }
    // show filter
    let include = true;
    let nextDue = computeNextDueBill(bill);
    if (showFilter === 'due' && payStart) {
      include = isDueThisFortnightCustom(bill, payStart);
    }
    if (!include) return;
    const tr = document.createElement('tr');
    const nextDueStr = nextDue ? fmtDate(nextDue) : '';
    tr.innerHTML = `<td>${bill.name}</td>
                    <td>${fmtMoney(bill.amount)}</td>
                    <td>${frequencyLabel(bill)}</td>
                    <td>${bill.startDate}</td>
                    <td>${nextDueStr}</td>
                    <td>
                      <button class="btn btn-secondary" onclick="editBill('${bill.id}')">Edit</button>
                      <button class="btn btn-danger" onclick="deleteBill('${bill.id}')">Delete</button>
                    </td>`;
    tbody.appendChild(tr);
  });
}

function renderDebtsTable() {
  const tbody = document.querySelector('#debts-table tbody');
  tbody.innerHTML = '';
  debts.forEach(debt => {
    const tr = document.createElement('tr');
    // Compute progress (how much has been paid off)
    let pct = 0;
    if (debt.initialAmount && debt.initialAmount > 0) {
      pct = Math.round(((debt.initialAmount - debt.amount) / debt.initialAmount) * 100);
      if (pct < 0) pct = 0;
      if (pct > 100) pct = 100;
    }
    // Choose bar colour based on priority for a more informative visual
    let barCol;
    switch (debt.priority) {
      case 'High': barCol = '#ef4444'; break;       // red
      case 'Medium': barCol = '#fbbf24'; break;     // amber
      case 'Low': barCol = '#34d399'; break;        // green
      default: barCol = getComputedStyle(document.documentElement).getPropertyValue('--primary-col');
    }
    const progressBar = `<div class="progress"><div class="progress-bar" style="width:${pct}%;background-color:${barCol};"></div></div>`;
    tr.innerHTML = `<td>${debt.name}</td>
                    <td>${fmtMoney(debt.amount)}</td>
                    <td>${fmtMoney(debt.minPayment)}</td>
                    <td>${Number(debt.interest).toFixed(2)}%</td>
                    <td>${debt.priority}<br>${progressBar}</td>
                    <td>
                      <button class="btn btn-secondary" onclick="editDebt('${debt.id}')">Edit</button>
                      <button class="btn btn-danger" onclick="deleteDebt('${debt.id}')">Delete</button>
                      <button class="btn btn-primary" onclick="showDebtDeposit('${debt.id}')">Deposit</button>
                    </td>`;
    tbody.appendChild(tr);
  });
}

function renderGoalsTable() {
  const tbody = document.querySelector('#goals-table tbody');
  tbody.innerHTML = '';
  goals.forEach(goal => {
    const pct = goal.targetAmount ? Math.round((goal.savedAmount / goal.targetAmount) * 100) : 0;
    // Colour progress bar by priority (high/medium/low)
    let gBarCol;
    switch (goal.priority) {
      case 'High': gBarCol = '#ef4444'; break;
      case 'Medium': gBarCol = '#fbbf24'; break;
      case 'Low': gBarCol = '#34d399'; break;
      default: gBarCol = getComputedStyle(document.documentElement).getPropertyValue('--primary-col');
    }
    const progressBar = `<div class="progress"><div class="progress-bar" style="width:${pct}%;background-color:${gBarCol};"></div></div>`;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${goal.name}</td>
                    <td>${fmtMoney(goal.targetAmount)}</td>
                    <td>${goal.deadline}</td>
                    <td>${goal.priority}<br>${progressBar}</td>
                    <td>${fmtMoney(goal.savedAmount)}</td>
                    <td>${pct}%</td>
                    <td>
                      <button class="btn btn-secondary" onclick="editGoal('${goal.id}')">Edit</button>
                      <button class="btn btn-danger" onclick="deleteGoal('${goal.id}')">Delete</button>
                      <button class="btn btn-primary" onclick="showGoalDeposit('${goal.id}')">Deposit</button>
                    </td>`;
    tbody.appendChild(tr);
  });
}

function renderHistoryTable() {
  const tbody = document.querySelector('#history-table tbody');
  tbody.innerHTML = '';
  history.sort((a,b) => new Date(b.ts) - new Date(a.ts));
  history.forEach((snap, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${snap.ts}</td>
                    <td>${snap.pay_cycle}</td>
                    <td>${fmtMoney(snap.income1)}</td>
                    <td>${fmtMoney(snap.income2)}</td>
                    <td>${fmtMoney(snap.splurge)}</td>
                    <td>${fmtMoney(snap.bills_due)}</td>
                    <td>${snap.fire_pct.toFixed(2)}%</td>
                    <td>${snap.smile_pct.toFixed(2)}%</td>
                    <td>${fmtMoney(snap.fire_amt)}</td>
                    <td>${fmtMoney(snap.smile_amt)}</td>
                    <td>${fmtMoney(snap.mojo_amt)}</td>
                    <td>${fmtMoney(snap.remaining)}</td>
                    <td>${fmtMoney(snap.total_income)}</td>
                    <td><button class="btn btn-danger" onclick="deleteSnapshot(${idx})">Delete</button></td>`;
    tbody.appendChild(tr);
  });
}

// Bill CRUD
function clearBillForm() {
  document.getElementById('bill-id').value = '';
  document.getElementById('bill-name').value = '';
  document.getElementById('bill-amount').value = '';
  document.getElementById('bill-freq').value = 'Fortnightly';
  document.getElementById('bill-start').value = '';
  // Hide custom controls and reset to defaults
  const customDiv = document.getElementById('custom-frequency');
  if (customDiv) {
    customDiv.style.display = 'none';
    document.getElementById('custom-unit').value = 'Week';
    document.getElementById('custom-value').value = '1';
  }
}

async function addOrUpdateBill() {
  const id = document.getElementById('bill-id').value;
  const name = document.getElementById('bill-name').value.trim();
  const amount = parseFloat(document.getElementById('bill-amount').value || '0');
  const freq = document.getElementById('bill-freq').value;
  // Read custom period inputs
  const cUnit = document.getElementById('custom-unit')?.value;
  const cValue = document.getElementById('custom-value')?.value;
  let start = document.getElementById('bill-start').value;
  if (!start) {
    // default to today so new bills aren't hidden by filters
    start = new Date().toISOString().slice(0,10);
    const startEl = document.getElementById('bill-start');
    if (startEl) startEl.value = start;
  }
  if (!name || isNaN(amount) || amount <= 0) {
    alert('Please enter valid bill information.');
    return;
  }
  if (id) {
    // update
    const idx = bills.findIndex(b => b.id === id);
    if (idx >= 0) {
      bills[idx].name = name;
      bills[idx].amount = amount;
      bills[idx].frequency = freq;
      bills[idx].startDate = start;
      if (freq === 'Custom') {
        bills[idx].customUnit = cUnit;
        bills[idx].customValue = cValue;
      } else {
        delete bills[idx].customUnit;
        delete bills[idx].customValue;
      }
      // Persist update to Supabase if available
      if (typeof window.updateBillCloud === 'function') {
        try {
        await window.updateBillCloud(id, {
            name: name,
            amount: amount,
            frequency: freq,
            startDate: start,
            customUnit: (freq === 'Custom' ? cUnit : null),
            customValue: (freq === 'Custom' ? cValue : null)
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
  } else {
    // Create a local bill object
    const newBill = { id: String(Date.now()), name: name, amount: amount, frequency: freq, startDate: start };
    if (freq === 'Custom') {
      newBill.customUnit = cUnit;
      newBill.customValue = cValue;
    }
    // Attempt to persist to Supabase and adopt returned ID
    if (typeof window.insertBillCloud === 'function') {
      try {
        const remoteBill = await window.insertBillCloud(newBill);
        // Always reload from cloud after attempting remote insert (whether it returned id or not)
        if (remoteBill && remoteBill.id) {
          newBill.id = String(remoteBill.id);
        }
        if (typeof window.loadAllFromCloud === 'function') {
          await window.loadAllFromCloud();
          bills = window.bills;
          renderBillsTable();
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    bills.push(newBill);
  }
  saveData();
  clearBillForm();
  renderBillsTable();
}

function editBill(id) {
  const bill = bills.find(b => b.id === id);
  if (!bill) return;
  document.getElementById('bill-id').value = bill.id;
  document.getElementById('bill-name').value = bill.name;
  document.getElementById('bill-amount').value = bill.amount;
  document.getElementById('bill-freq').value = bill.frequency;
  document.getElementById('bill-start').value = bill.startDate;
  // Show or hide custom controls based on current frequency
  const customDiv = document.getElementById('custom-frequency');
  if (customDiv) {
    const isCustom = (bill.frequency === 'Custom');
    customDiv.style.display = isCustom ? 'flex' : 'none';
    if (isCustom) {
      document.getElementById('custom-unit').value = bill.customUnit || 'Week';
      document.getElementById('custom-value').value = String(bill.customValue || '1');
    }
  }
}

function deleteBill(id) {
  if (!confirm('Delete this bill?')) return;
  // Remove from the existing array in place so that the
  // reference to `window.bills` is maintained. Reassigning
  // `bills` would break the link between main.js and
  // cloud_data.js. Use splice to mutate instead.
  const idx = bills.findIndex(b => b.id === id);
  if (idx >= 0) {
    bills.splice(idx, 1);
    // Also attempt to delete remotely if the helper exists. We
    // deliberately do not await this before saving locally to
    // maintain responsiveness.
    if (typeof window.deleteBillCloud === 'function') {
      window.deleteBillCloud(id).catch(err => console.error(err));
    }
  }
  saveData();
  renderBillsTable();
}

// Debt CRUD
function clearDebtForm() {
  document.getElementById('debt-id').value = '';
  document.getElementById('debt-name').value = 'Credit Card';
  document.getElementById('debt-owed').value = '';
  document.getElementById('debt-minpay').value = '';
  document.getElementById('debt-interest').value = '';
  document.getElementById('debt-priority').value = 'Medium';
}

async function addOrUpdateDebt() {
  const id = document.getElementById('debt-id').value;
  const name = document.getElementById('debt-name').value;
  const owed = parseFloat(document.getElementById('debt-owed').value || '0');
  const minPay = parseFloat(document.getElementById('debt-minpay').value || '0');
  const interest = parseFloat(document.getElementById('debt-interest').value || '0');
  const priority = document.getElementById('debt-priority').value;
  if (!name || isNaN(owed) || owed < 0 || isNaN(minPay) || minPay < 0 || isNaN(interest) || interest < 0) {
    alert('Please enter valid debt information.');
    return;
  }
  if (id) {
    const idx = debts.findIndex(d => d.id === id);
    if (idx >= 0) {
      debts[idx].name = name;
      debts[idx].amount = owed;
      debts[idx].minPayment = minPay;
      debts[idx].interest = interest;
      debts[idx].priority = priority;
      // Persist update to Supabase
      if (typeof window.updateDebtCloud === 'function') {
        try {
          await window.updateDebtCloud(id, {
            name: name,
            amount: owed,
            minPayment: minPay,
            interest: interest,
            priority: priority
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
  } else {
    // When creating a new debt, capture the original owed amount as
    // `initialAmount`. This is used to calculate progress later on.
    const newDebt = {
      id: String(Date.now()),
      name: name,
      amount: owed,
      minPayment: minPay,
      interest: interest,
      priority: priority,
      initialAmount: owed
    };
    // Persist to Supabase and adopt remote id
    if (typeof window.insertDebtCloud === 'function') {
      try {
        const remoteDebt = await window.insertDebtCloud(newDebt);
        if (remoteDebt && remoteDebt.id) {
          newDebt.id = String(remoteDebt.id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    debts.push(newDebt);
  }
  saveData();
  clearDebtForm();
  renderDebtsTable();
}

function editDebt(id) {
  const d = debts.find(x => x.id === id);
  if (!d) return;
  document.getElementById('debt-id').value = d.id;
  document.getElementById('debt-name').value = d.name;
  document.getElementById('debt-owed').value = d.amount;
  document.getElementById('debt-minpay').value = d.minPayment;
  document.getElementById('debt-interest').value = d.interest;
  document.getElementById('debt-priority').value = d.priority;
}

async function deleteDebt(id) {
  if (!confirm('Delete this debt?')) return;
  // Find the index and remove it in place so that the
  // `debts` array remains the same instance. This avoids
  // breaking the alias to window.debts used by cloud_data.js.
  const idx = debts.findIndex(d => d.id === id);
  if (idx >= 0) {
    debts.splice(idx, 1);
    // Persist deletion to Supabase, but do not block the UI
    if (typeof window.deleteDebtCloud === 'function') {
      try {
        await window.deleteDebtCloud(id);
      } catch (e) {
        console.error(e);
      }
    }
  }
  saveData();
  renderDebtsTable();
}

async function showDebtDeposit(id) {
  const d = debts.find(x => x.id === id);
  if (!d) return;
  // Build modal
  const container = document.getElementById('modal-container');
  container.innerHTML = '';
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.innerHTML = `<div style="background:#fff;padding:20px;border-radius:6px;max-width:360px;width:90%;">
    <h3>Deposit — ${d.name}</h3>
    <p>Current balance: ${fmtMoney(d.amount)}</p>
    <label for="debt-deposit-amt">Payment amount</label>
    <input type="number" id="debt-deposit-amt" min="0" step="0.01" style="width:100%;">
    <label for="debt-deposit-note">Note (optional)</label>
    <input type="text" id="debt-deposit-note" style="width:100%;">
    <div style="margin-top:12px;text-align:right;">
      <button class="btn btn-secondary" id="debt-deposit-cancel">Cancel</button>
      <button class="btn btn-primary" id="debt-deposit-save">Add</button>
    </div>
  </div>`;
  container.appendChild(modal);
  // Cancel handler
  document.getElementById('debt-deposit-cancel').onclick = () => {
    container.innerHTML = '';
  };
  // Save handler
  document.getElementById('debt-deposit-save').onclick = async () => {
    const amt = parseFloat(document.getElementById('debt-deposit-amt').value || '0');
    if (isNaN(amt) || amt <= 0) {
      alert('Enter a positive amount');
      return;
    }
    // reduce owed
    d.amount = Math.max(0, d.amount - amt);
    // optional: record note; we ignore for now but could store
    saveData();
    renderDebtsTable();
    container.innerHTML = '';
    // Persist updated debt to Supabase
    if (typeof window.updateDebtCloud === 'function') {
      try {
        await window.updateDebtCloud(d.id, {
          name: d.name,
          amount: d.amount,
          minPayment: d.minPayment,
          interest: d.interest,
          priority: d.priority
        });
      } catch (e) {
        console.error(e);
      }
    }
  };
}

// Goal CRUD
function clearGoalForm() {
  document.getElementById('goal-id').value = '';
  document.getElementById('goal-name').value = '';
  document.getElementById('goal-target').value = '';
  document.getElementById('goal-deadline').value = '';
  document.getElementById('goal-priority').value = 'Medium';
}

async function addOrUpdateGoal() {
  const id = document.getElementById('goal-id').value;
  const name = document.getElementById('goal-name').value.trim();
  const target = parseFloat(document.getElementById('goal-target').value || '0');
  const deadline = document.getElementById('goal-deadline').value;
  const priority = document.getElementById('goal-priority').value;
  if (!name || isNaN(target) || target <= 0 || !deadline) {
    alert('Please enter valid goal information.');
    return;
  }
  if (id) {
    const idx = goals.findIndex(g => g.id === id);
    if (idx >= 0) {
      goals[idx].name = name;
      goals[idx].targetAmount = target;
      goals[idx].deadline = deadline;
      goals[idx].priority = priority;
      // Persist update to Supabase
      if (typeof window.updateGoalCloud === 'function') {
        try {
          await window.updateGoalCloud(id, {
            name: name,
            target: target,
            saved: goals[idx].savedAmount,
            priority: priority
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
  } else {
    const newGoal = { id: String(Date.now()), name: name, targetAmount: target, savedAmount: 0, deadline: deadline, priority: priority };
    // Persist to Supabase and adopt remote id
    if (typeof window.insertGoalCloud === 'function') {
      try {
        const remoteGoal = await window.insertGoalCloud({
          name: newGoal.name,
          target: newGoal.targetAmount,
          saved: newGoal.savedAmount,
          priority: newGoal.priority
        });
        if (remoteGoal && remoteGoal.id) {
          newGoal.id = String(remoteGoal.id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    goals.push(newGoal);
  }
  saveData();
  clearGoalForm();
  renderGoalsTable();
}

function editGoal(id) {
  const g = goals.find(x => x.id === id);
  if (!g) return;
  document.getElementById('goal-id').value = g.id;
  document.getElementById('goal-name').value = g.name;
  document.getElementById('goal-target').value = g.targetAmount;
  document.getElementById('goal-deadline').value = g.deadline;
  document.getElementById('goal-priority').value = g.priority;
}

async function deleteGoal(id) {
  if (!confirm('Delete this goal?')) return;
  // Remove the goal in place to maintain the reference to
  // `window.goals`. Filtering into a new array would break the
  // alias between main.js and cloud_data.js.
  const idx = goals.findIndex(g => g.id === id);
  if (idx >= 0) {
    goals.splice(idx, 1);
    // Persist deletion to Supabase
    if (typeof window.deleteGoalCloud === 'function') {
      try {
        await window.deleteGoalCloud(id);
      } catch (e) {
        console.error(e);
      }
    }
  }
  saveData();
  renderGoalsTable();
}

async function showGoalDeposit(id) {
  const g = goals.find(x => x.id === id);
  if (!g) return;
  const container = document.getElementById('modal-container');
  container.innerHTML = '';
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.innerHTML = `<div style="background:#fff;padding:20px;border-radius:6px;max-width:360px;width:90%;">
    <h3>Deposit — ${g.name}</h3>
    <p>Currently saved: ${fmtMoney(g.savedAmount)} / ${fmtMoney(g.targetAmount)}</p>
    <label for="goal-deposit-amt">Deposit amount</label>
    <input type="number" id="goal-deposit-amt" min="0" step="0.01" style="width:100%;">
    <div style="margin-top:12px;text-align:right;">
      <button class="btn btn-secondary" id="goal-deposit-cancel">Cancel</button>
      <button class="btn btn-primary" id="goal-deposit-save">Add</button>
    </div>
  </div>`;
  container.appendChild(modal);
  document.getElementById('goal-deposit-cancel').onclick = () => {
    container.innerHTML = '';
  };
  document.getElementById('goal-deposit-save').onclick = async () => {
    const amt = parseFloat(document.getElementById('goal-deposit-amt').value || '0');
    if (isNaN(amt) || amt <= 0) {
      alert('Enter a positive amount');
      return;
    }
    g.savedAmount += amt;
    if (g.savedAmount > g.targetAmount) g.savedAmount = g.targetAmount;
    saveData();
    renderGoalsTable();
    container.innerHTML = '';
    // Persist updated goal to Supabase
    if (typeof window.updateGoalCloud === 'function') {
      try {
        await window.updateGoalCloud(g.id, {
          name: g.name,
          target: g.targetAmount,
          saved: g.savedAmount,
          priority: g.priority
        });
      } catch (e) {
        console.error(e);
      }
    }
  };
}

// History functions
function deleteSnapshot(index) {
  if (!confirm('Delete this history entry?')) return;
  history.splice(index, 1);
  saveData();
  renderHistoryTable();
}

function exportHistoryCSV() {
  if (history.length === 0) {
    alert('No history to export.');
    return;
  }
  const header = ['ts','pay_cycle','income1','income2','splurge','bills_due','fire_pct','smile_pct','fire_amt','smile_amt','mojo_amt','remaining','total_income'];
  const rows = history.map(snap => [
    snap.ts,
    snap.pay_cycle,
    snap.income1,
    snap.income2,
    snap.splurge,
    snap.bills_due,
    snap.fire_pct,
    snap.smile_pct,
    snap.fire_amt,
    snap.smile_amt,
    snap.mojo_amt,
    snap.remaining,
    snap.total_income,
  ]);
  let csvContent = header.join(',') + '\n';
  rows.forEach(r => {
    csvContent += r.join(',') + '\n';
  });
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'budget_history.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export all data (bills, debts, goals, history) as JSON for backup
function exportAllData() {
  const data = {
    bills: bills,
    debts: debts,
    goals: goals,
    history: history
  };
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'budget_backup.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import all data from a JSON file. Triggered when file input changes.
function importAllData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (typeof data !== 'object') throw new Error('Invalid file');
      // Replace data containers without breaking references. If the
      // imported file provides arrays, mutate the existing arrays
      // (on both the local variables and window.*) so that
      // cloud_data.js and main.js continue to share the same
      // references. Otherwise leave the arrays untouched.
      if (Array.isArray(data.bills)) {
        window.bills.splice(0, window.bills.length, ...data.bills);
        bills = window.bills;
      }
      if (Array.isArray(data.debts)) {
        window.debts.splice(0, window.debts.length, ...data.debts);
        debts = window.debts;
      }
      if (Array.isArray(data.goals)) {
        window.goals.splice(0, window.goals.length, ...data.goals);
        goals = window.goals;
      }
      if (Array.isArray(data.history)) {
        window.historyData.splice(0, window.historyData.length, ...data.history);
        history = window.historyData;
      }
      // Save and re-render
      saveData();
      renderBillsTable();
      renderDebtsTable();
      renderGoalsTable();
      renderHistoryTable();
      alert('Data imported successfully.');
    } catch (err) {
      alert('Failed to import data: ' + err.message);
    }
    // Reset the file input value so the same file can be selected again if needed
    event.target.value = '';
  };
  reader.readAsText(file);
}

// Budget calculation
function calculateBudget() {
  const payStart = document.getElementById('pay-start').value;
  const income1 = parseFloat(document.getElementById('income-1').value || '0');
  const income2 = parseFloat(document.getElementById('income-2').value || '0');
  const splurge = parseFloat(document.getElementById('splurge').value || '0');
  const firePct = parseFloat(document.getElementById('fire-pct').value || '0');
  const smilePct = parseFloat(document.getElementById('smile-pct').value || '0');
  // If no pay cycle start date is provided, the due filter will not
  // include any bills in the "due this fortnight" option. This allows
  // calculations without forcing the user to pick a date. When a date
  // is supplied, only bills falling within that fortnight are
  // considered if the "due" filter is selected.
  if (firePct + smilePct > 100) {
    alert('Fire % + Smile % cannot exceed 100%.');
    return;
  }
  // compute bills due amount based on filter (due or all)
  let billsDueAmount = 0;
  const showFilter = document.getElementById('filter-show').value;
  bills.forEach(bill => {
    if (showFilter === 'due') {
      if (isDueThisFortnightCustom(bill, payStart)) {
        billsDueAmount += bill.amount;
      }
    } else {
      billsDueAmount += bill.amount;
    }
  });
  const totalIncome = income1 + income2;
  const remaining = totalIncome - splurge - billsDueAmount;
  const fireAmt = remaining * firePct / 100;
  const smileAmt = remaining * smilePct / 100;
  const mojoAmt = remaining - fireAmt - smileAmt;
  // Display results
  document.getElementById('res-splurge').textContent = fmtMoney(splurge);
  document.getElementById('res-bills').textContent = fmtMoney(billsDueAmount);
  document.getElementById('res-fire').textContent = fmtMoney(fireAmt);
  document.getElementById('res-smile').textContent = fmtMoney(smileAmt);
  document.getElementById('res-mojo').textContent = fmtMoney(mojoAmt);
  const summary = `Total Income: ${fmtMoney(totalIncome)} | Bills Due: ${fmtMoney(billsDueAmount)} | Remaining: ${fmtMoney(remaining)}`;
  document.getElementById('budget-summary').textContent = summary;
  document.getElementById('budget-results').style.display = 'block';
  // Enable save snapshot
  document.getElementById('btn-save-snapshot').disabled = false;
  lastBudget = {
    ts: new Date().toISOString().slice(0,19),
    pay_cycle: payStart,
    income1: income1,
    income2: income2,
    splurge: splurge,
    bills_due: billsDueAmount,
    fire_pct: firePct,
    smile_pct: smilePct,
    fire_amt: fireAmt,
    smile_amt: smileAmt,
    mojo_amt: mojoAmt,
    remaining: remaining,
    total_income: totalIncome
  };

  // Draw the donut chart to visually represent bucket allocations
  drawBudgetChart(splurge, billsDueAmount, fireAmt, smileAmt, mojoAmt);
  // Refresh dashboard to reflect the newly calculated budget
  renderDashboard();
  // Update history chart in case of new snapshot later
  renderHistoryChart();
}

async function saveSnapshot() {
  if (!lastBudget) return;
  history.push(lastBudget);
  saveData();
  renderHistoryTable();
  // Persist snapshot to Supabase
  if (typeof window.insertSnapshotCloud === 'function') {
    try {
      await window.insertSnapshotCloud(lastBudget);
    } catch (e) {
      console.error(e);
    }
  }
  // Reset temporary and disable snapshot button
  lastBudget = null;
  document.getElementById('btn-save-snapshot').disabled = true;
  alert('Snapshot saved to history.');
}

/*
 * Draw a simple donut chart to visualise bucket allocations. A custom
 * implementation is used instead of an external library to keep the
 * project self‑contained. Each segment corresponds to one of the
 * buckets: Splurge, Bills, Fire, Smile and MOJO, with colours
 * matching the legend icons in the results table.
 */
function drawBudgetChart(splurge, billsAmt, fireAmt, smileAmt, mojoAmt) {
  const canvas = document.getElementById('budget-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const data = [
    { value: splurge, colour: '#f87171' },
    { value: billsAmt, colour: '#fde047' },
    { value: fireAmt, colour: '#fb923c' },
    { value: smileAmt, colour: '#34d399' },
    { value: mojoAmt, colour: '#60a5fa' }
  ];
  const total = data.reduce((sum, d) => sum + (d.value > 0 ? d.value : 0), 0);
  // Clear previous drawing
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (total <= 0) {
    return;
  }
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) * 0.45;
  let start = -Math.PI / 2;
  data.forEach(item => {
    if (item.value <= 0) return;
    const angle = (item.value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = item.colour;
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

/*
 * Compute and render dashboard metrics. The dashboard summarises the
 * current state of the application: total income based on the values
 * entered in the budget planner, remaining funds from the last
 * calculation, the number and names of upcoming bills, total debt
 * outstanding, and the average progress across all savings goals. All
 * figures are formatted for display and injected into the appropriate
 * dashboard cards.
 */
function renderDashboard() {
  // Total income is simply the sum of the two income inputs
  const inc1 = parseFloat(document.getElementById('income-1').value || '0');
  const inc2 = parseFloat(document.getElementById('income-2').value || '0');
  const totalInc = inc1 + inc2;
  document.getElementById('dash-income').textContent = fmtMoney(totalInc);
  // Remaining funds come from the last calculated budget if available
  let remainingVal = 0;
  if (lastBudget) {
    remainingVal = lastBudget.remaining;
  }
  document.getElementById('dash-remaining').textContent = fmtMoney(remainingVal);
  // Upcoming bills count and preview
  const payStart = document.getElementById('pay-start').value;
  let dueBills = [];
  if (payStart) {
    bills.forEach(b => {
      if (isDueThisFortnightCustom(b, payStart)) dueBills.push(b);
    });
  }
  // Sort upcoming bills by next due date for display
  dueBills.sort((a, b) => {
    const da = computeNextDueBill(a);
    const db = computeNextDueBill(b);
    return (da ? da.getTime() : Infinity) - (db ? db.getTime() : Infinity);
  });
  document.getElementById('dash-bills').textContent = dueBills.length;
  // Show names of up to three upcoming bills as a title attribute for the card
  const nextNames = dueBills.slice(0, 3).map(b => b.name).join(', ');
  const billsCard = document.getElementById('card-bills');
  if (nextNames) {
    billsCard.title = `Next: ${nextNames}`;
  } else {
    billsCard.title = '';
  }
  // Sum of all current debt amounts
  const totalDebt = debts.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  document.getElementById('dash-debt').textContent = fmtMoney(totalDebt);
  // Average goal completion (percentage). If there are no goals, show 0%.
  let avgGoalPct = 0;
  if (goals.length > 0) {
    const totalPct = goals.reduce((sum, g) => {
      const pct = g.targetAmount ? (g.savedAmount / g.targetAmount) : 0;
      return sum + pct;
    }, 0);
    avgGoalPct = Math.round((totalPct / goals.length) * 100);
  }
  document.getElementById('dash-goals').textContent = `${avgGoalPct}%`;
}

/*
 * Draw a simple line chart to visualise trends over time. The history
 * chart plots total income and remaining funds from each snapshot.
 * Older entries appear on the left; newer ones on the right. The y‑axis
 * is scaled automatically based on the maximum value in the data set.
 */
function renderHistoryChart() {
  const canvas = document.getElementById('history-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (history.length === 0) {
    return;
  }
  // Sort by timestamp ascending to draw chronologically
  const sorted = [...history].sort((a, b) => new Date(a.ts) - new Date(b.ts));
  const n = sorted.length;
  // Determine maximum value to scale both income and remaining lines
  let maxVal = 0;
  sorted.forEach(snap => {
    maxVal = Math.max(maxVal, snap.total_income || 0, snap.remaining || 0);
  });
  if (maxVal === 0) maxVal = 1;
  const m = 30; // margin for axes
  const w = canvas.width - m * 2;
  const h = canvas.height - m * 2;
  // Draw axes
  ctx.strokeStyle = getComputedStyle(document.body).color;
  ctx.lineWidth = 1;
  // y axis
  ctx.beginPath();
  ctx.moveTo(m, m);
  ctx.lineTo(m, m + h);
  ctx.lineTo(m + w, m + h);
  ctx.stroke();
  // Plot remaining line
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 2;
  ctx.beginPath();
  sorted.forEach((snap, idx) => {
    const x = m + (idx / (n - 1)) * w;
    const y = m + h - (snap.remaining / maxVal) * h;
    if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
  // Plot total income line
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2;
  ctx.beginPath();
  sorted.forEach((snap, idx) => {
    const x = m + (idx / (n - 1)) * w;
    const y = m + h - (snap.total_income / maxVal) * h;
    if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
  // Optionally draw small circles at each point
  sorted.forEach((snap, idx) => {
    const x = m + (idx / (n - 1)) * w;
    const yR = m + h - (snap.remaining / maxVal) * h;
    const yT = m + h - (snap.total_income / maxVal) * h;
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.arc(x, yR, 2.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(x, yT, 2.5, 0, 2 * Math.PI);
    ctx.fill();
  });
}

/*
 * Theme handling. The theme is persisted in localStorage so that the
 * user’s preference is remembered across sessions. When toggled, the
 * body’s `dark-mode` class is added or removed and the nav theme
 * button’s icon is updated to reflect the current state.
 */
function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  const body = document.body;
  const btn = document.getElementById('nav-theme');
  if (saved === 'dark') {
    body.classList.add('dark-mode');
    if (btn) btn.innerHTML = '&#9790;'; // moon symbol
  } else {
    body.classList.remove('dark-mode');
    if (btn) btn.innerHTML = '&#9788;'; // sun symbol
  }
}

/*
 * Display and hide the help overlay. When the help button is
 * clicked or the application is loaded for the first time, the
 * overlay becomes visible. Closing the overlay sets a flag in
 * localStorage so that it is not shown again automatically. The
 * overlay itself is a full‑screen flex container defined in
 * index.html and styled in the CSS. Its display property is
 * toggled to show or hide it.
 */
function showHelp() {
  const overlay = document.getElementById('help-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    // Mark that the user has seen the help so it does not auto‑show again
    localStorage.setItem('helpSeen', 'true');
  }
}

function closeHelp() {
  const overlay = document.getElementById('help-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}
function toggleTheme() {
  const body = document.body;
  const btn = document.getElementById('nav-theme');
  const isDark = body.classList.toggle('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  if (btn) {
    btn.innerHTML = isDark ? '&#9790;' : '&#9788;';
  }
}

// Navigation switching
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  document.getElementById(sectionId).classList.add('active');
  document.querySelectorAll('.navbar button').forEach(btn => btn.classList.remove('active'));
  switch(sectionId) {
    case 'section-dashboard':
      document.getElementById('nav-dashboard').classList.add('active');
      break;
    case 'section-budget': document.getElementById('nav-budget').classList.add('active'); break;
    case 'section-accounts': document.getElementById('nav-accounts').classList.add('active'); break;
    case 'section-history': document.getElementById('nav-history').classList.add('active'); break;
  }
}

// Initialisation function executed once the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Load persisted data
  loadData();
  // Render tables
  renderBillsTable();
  renderDebtsTable();
  renderGoalsTable();
  renderHistoryTable();
  // Bind nav buttons
  document.getElementById('nav-dashboard').onclick = () => showSection('section-dashboard');
  document.getElementById('nav-budget').onclick = () => showSection('section-budget');
  document.getElementById('nav-accounts').onclick = () => showSection('section-accounts');
  document.getElementById('nav-history').onclick = () => showSection('section-history');
  // Bind forms
  document.getElementById('btn-add-bill').onclick = addOrUpdateBill;
  document.getElementById('btn-clear-bill').onclick = clearBillForm;
  document.getElementById('filter-show').onchange = renderBillsTable;
  document.getElementById('search-bills').oninput = renderBillsTable;
  document.getElementById('btn-add-debt').onclick = addOrUpdateDebt;
  document.getElementById('btn-clear-debt').onclick = clearDebtForm;
  document.getElementById('btn-add-goal').onclick = addOrUpdateGoal;
  document.getElementById('btn-clear-goal').onclick = clearGoalForm;
  document.getElementById('btn-calc').onclick = calculateBudget;
  document.getElementById('btn-save-snapshot').onclick = saveSnapshot;
  document.getElementById('btn-export-history').onclick = exportHistoryCSV;

  // Backup & restore handlers
  document.getElementById('btn-export-data').onclick = exportAllData;
  document.getElementById('btn-import-data').onclick = () => document.getElementById('file-import-data').click();
  document.getElementById('file-import-data').onchange = importAllData;

  // Theme toggle
  initTheme();
  const themeBtn = document.getElementById('nav-theme');
  if (themeBtn) {
    themeBtn.onclick = toggleTheme;
  }

  // Help overlay: bind open/close behaviour and auto show on first visit
  const helpBtn = document.getElementById('nav-help');
  const helpCloseBtn = document.getElementById('help-close');
  if (helpBtn) helpBtn.onclick = () => showHelp();
  if (helpCloseBtn) helpCloseBtn.onclick = () => closeHelp();
  // Automatically display the help overlay on first visit if the user has
  // not dismissed it previously. The flag is stored in localStorage.
  if (!localStorage.getItem('helpSeen')) {
    showHelp();
  }

  // Bind frequency selector to show/hide custom controls
  const freqSel = document.getElementById('bill-freq');
  const customDiv = document.getElementById('custom-frequency');
  if (freqSel && customDiv) {
    const updateCustomVis = () => {
      customDiv.style.display = (freqSel.value === 'Custom') ? 'flex' : 'none';
    };
    freqSel.addEventListener('change', updateCustomVis);
    // Initialise on load
    updateCustomVis();
  }
  // Render initial dashboard and history chart after loading data
  renderDashboard();
  renderHistoryChart();
});