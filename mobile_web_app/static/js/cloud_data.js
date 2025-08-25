// static/js/cloud_data.js
// Helpers to move your app's data from localStorage to Supabase.
// Assumes: window.supabaseClient exists (from config.js)
// Exposes: getUserId, fetch*FromCloud, insert*/update*/delete*,
//          loadAllFromCloud, migrateLocalToCloud
(function () {
  const supabase = window.supabaseClient || window.supabase;

  // ---- tiny util -----------------------------------------------------------
  async function getUserId() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error("Not authenticated");
    return user.id;
  }

  // Keep using your global arrays as UI caches if they already exist.
  // If not present, we create them.
  window.bills   = Array.isArray(window.bills)   ? window.bills   : [];
  window.debts   = Array.isArray(window.debts)   ? window.debts   : [];
  window.goals   = Array.isArray(window.goals)   ? window.goals   : [];
  // Use a separate property name for history to avoid overriding
  // the built‑in window.history object, which is used by the browser
  // for navigation. Align with main.js which uses window.historyData.
  window.historyData = Array.isArray(window.historyData) ? window.historyData : [];

  // ---- BILLS ---------------------------------------------------------------
  async function fetchBillsFromCloud() {
    const uid = await getUserId();
    const { data, error } = await supabase
      .from('bills').select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });
    if (error) { console.error(error); alert("Failed to load bills"); return []; }
    return data || [];
  }

  async function insertBillCloud(bill) {
    const uid = await getUserId();
    const payload = {
      user_id: uid,
      name: bill.name,
      amount: bill.amount,
      frequency: bill.frequency,
      start_date: bill.startDate || bill.start_date || null,
      custom_unit: (bill.frequency === 'Custom' ? (bill.customUnit || bill.custom_unit || null) : null),
      custom_value: (bill.frequency === 'Custom' ? (bill.customValue || bill.custom_value || null) : null),
    };
    const { data, error } = await supabase.from('bills').insert(payload).select().single();
    if (error) { console.error(error); alert("Failed to add bill"); return null; }
    return data;
  }

  async function updateBillCloud(id, patch) {
    const uid = await getUserId();
    const { error } = await supabase
      .from('bills')
      .update({
        name: patch.name,
        amount: patch.amount,
        frequency: patch.frequency,
        start_date: patch.startDate || patch.start_date || null,
        custom_unit: (patch.frequency === 'Custom' ? (patch.customUnit || patch.custom_unit || null) : null),
        custom_value: (patch.frequency === 'Custom' ? (patch.customValue || patch.custom_value || null) : null),
      })
      .eq('id', id).eq('user_id', uid);
    if (error) { console.error(error); alert("Failed to update bill"); }
  }

  async function deleteBillCloud(id) {
    const uid = await getUserId();
    const { error } = await supabase.from('bills').delete().eq('id', id).eq('user_id', uid);
    if (error) { console.error(error); alert("Failed to delete bill"); }
  }

  // ---- DEBTS ---------------------------------------------------------------
  async function fetchDebtsFromCloud() {
    const uid = await getUserId();
    const { data, error } = await supabase
      .from('debts').select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });
    if (error) { console.error(error); alert("Failed to load debts"); return []; }
    return data || [];
  }

  async function insertDebtCloud(debt) {
    const uid = await getUserId();
    const payload = {
      user_id: uid,
      name: debt.name,
      amount: debt.amount,
      min_payment: debt.minPayment ?? debt.min_payment,
      interest: debt.interest || 0,
      priority: debt.priority || 'Medium',
      initial_amount: (debt.initialAmount ?? debt.initial_amount ?? debt.amount)
    };
    const { data, error } = await supabase.from('debts').insert(payload).select().single();
    if (error) { console.error(error); alert("Failed to add debt"); return null; }
    return data;
  }

  async function updateDebtCloud(id, patch) {
    const uid = await getUserId();
    const { error } = await supabase.from('debts')
      .update({
        name: patch.name,
        amount: patch.amount,
        min_payment: patch.minPayment ?? patch.min_payment,
        interest: patch.interest,
        priority: patch.priority
      })
      .eq('id', id).eq('user_id', uid);
    if (error) { console.error(error); alert("Failed to update debt"); }
  }

  async function deleteDebtCloud(id) {
    const uid = await getUserId();
    const { error } = await supabase.from('debts').delete().eq('id', id).eq('user_id', uid);
    if (error) { console.error(error); alert("Failed to delete debt"); }
  }

  // ---- GOALS ---------------------------------------------------------------
  async function fetchGoalsFromCloud() {
    const uid = await getUserId();
    const { data, error } = await supabase
      .from('goals').select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });
    if (error) { console.error(error); alert("Failed to load goals"); return []; }
    return data || [];
  }

  async function insertGoalCloud(goal) {
    const uid = await getUserId();
    const payload = {
      user_id: uid,
      name: goal.name,
      target: goal.target,
      saved: goal.saved || 0,
      priority: goal.priority || 'Medium'
    };
    const { data, error } = await supabase.from('goals').insert(payload).select().single();
    if (error) { console.error(error); alert("Failed to add goal"); return null; }
    return data;
  }

  async function updateGoalCloud(id, patch) {
    const uid = await getUserId();
    const { error } = await supabase.from('goals')
      .update({
        name: patch.name,
        target: patch.target,
        saved: patch.saved,
        priority: patch.priority
      })
      .eq('id', id).eq('user_id', uid);
    if (error) { console.error(error); alert("Failed to update goal"); }
  }

  async function deleteGoalCloud(id) {
    const uid = await getUserId();
    const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', uid);
    if (error) { console.error(error); alert("Failed to delete goal"); }
  }

  // ---- HISTORY -------------------------------------------------------------
  async function fetchHistoryFromCloud() {
    const uid = await getUserId();
    const { data, error } = await supabase
      .from('history').select('*')
      .eq('user_id', uid)
      .order('timestamp', { ascending: true });
    if (error) { console.error(error); alert("Failed to load history"); return []; }
    return data || [];
  }

  async function insertSnapshotCloud(snap) {
    const uid = await getUserId();
    const payload = { user_id: uid, ...snap };
    const { error } = await supabase.from('history').insert(payload);
    if (error) { console.error(error); alert("Failed to save snapshot"); }
  }

  // ---- LOAD ALL / MIGRATE --------------------------------------------------
  async function loadAllFromCloud() {
    // Fetch remote data for each collection
    const [remoteBills, remoteDebts, remoteGoals, remoteHist] = await Promise.all([
      fetchBillsFromCloud(),
      fetchDebtsFromCloud(),
      fetchGoalsFromCloud(),
      fetchHistoryFromCloud()
    ]);
    // Replace the contents of the existing arrays in place instead of
    // reassigning them. This ensures that references used by
    // main.js remain intact. We use spread syntax to avoid
    // modifying the remote arrays.
    // Map remote field names to local field names for bills
    const mappedBills = (remoteBills || []).map(b => ({
      id: String(b.id),
      name: b.name,
      amount: b.amount,
      frequency: b.frequency,
      startDate: b.start_date,
      customUnit: b.custom_unit,
      customValue: b.custom_value
    }));
    window.bills.splice(0, window.bills.length, ...mappedBills);
    window.debts.splice(0, window.debts.length, ...remoteDebts);
    window.goals.splice(0, window.goals.length, ...remoteGoals);
    // Replace the contents of historyData rather than history
    window.historyData.splice(0, window.historyData.length, ...remoteHist);
    // Call your existing renderers, if they exist:
    try { window.renderBillsTable && window.renderBillsTable(); } catch(e){ console.warn(e); }
    try { window.renderDebtsTable && window.renderDebtsTable(); } catch(e){ console.warn(e); }
    try { window.renderGoalsTable && window.renderGoalsTable(); } catch(e){ console.warn(e); }
    try { window.renderHistoryTable && window.renderHistoryTable(); } catch(e){ console.warn(e); }
    try { window.renderDashboard && window.renderDashboard(); } catch(e){ console.warn(e); }
    try { window.renderHistoryChart && window.renderHistoryChart(); } catch(e){ console.warn(e); }
  }

  async function migrateLocalToCloud() {
    const uid = await getUserId();
    const localBills  = JSON.parse(localStorage.getItem('bills')   || '[]');
    const localDebts  = JSON.parse(localStorage.getItem('debts')   || '[]');
    const localGoals  = JSON.parse(localStorage.getItem('goals')   || '[]');
    const localHist   = JSON.parse(localStorage.getItem('history') || '[]');

    if (localBills.length) {
      const billsPayload = localBills.map(b => ({
        user_id: uid,
        name: b.name,
        amount: b.amount,
        frequency: b.frequency,
        start_date: b.start_date || b.startDate || null,
        custom_unit: (b.frequency === 'Custom' ? (b.custom_unit || b.customUnit || null) : null),
        custom_value: (b.frequency === 'Custom' ? (b.custom_value || b.customValue || null) : null)
      }));
      await supabase.from('bills').insert(billsPayload);
    }
    if (localDebts.length) {
      const debtsPayload = localDebts.map(d => ({
        user_id: uid, name: d.name, amount: d.amount,
        min_payment: d.minPayment ?? d.min_payment, interest: d.interest || 0,
        priority: d.priority || 'Medium', initial_amount: (d.initialAmount ?? d.initial_amount ?? d.amount)
      }));
      await supabase.from('debts').insert(debtsPayload);
    }
    if (localGoals.length) {
      const goalsPayload = localGoals.map(g => ({
        user_id: uid, name: g.name, target: g.target,
        saved: g.saved || 0, priority: g.priority || 'Medium'
      }));
      await supabase.from('goals').insert(goalsPayload);
    }
    if (localHist.length) {
      const histPayload = localHist.map(h => ({ user_id: uid, ...h }));
      await supabase.from('history').insert(histPayload);
    }

    // optional: clear local copies
    // localStorage.removeItem('bills'); localStorage.removeItem('debts');
    // localStorage.removeItem('goals'); localStorage.removeItem('history');

    await loadAllFromCloud();
    alert("Migration complete");
  }

  // Expose to window for your main.js to call
  window.getUserId = getUserId;
  window.fetchBillsFromCloud = fetchBillsFromCloud;
  window.insertBillCloud = insertBillCloud;
  window.updateBillCloud = updateBillCloud;
  window.deleteBillCloud = deleteBillCloud;

  window.fetchDebtsFromCloud = fetchDebtsFromCloud;
  window.insertDebtCloud = insertDebtCloud;
  window.updateDebtCloud = updateDebtCloud;
  window.deleteDebtCloud = deleteDebtCloud;

  window.fetchGoalsFromCloud = fetchGoalsFromCloud;
  window.insertGoalCloud = insertGoalCloud;
  window.updateGoalCloud = updateGoalCloud;
  window.deleteGoalCloud = deleteGoalCloud;

  window.fetchHistoryFromCloud = fetchHistoryFromCloud;
  window.insertSnapshotCloud = insertSnapshotCloud;

  window.loadAllFromCloud = loadAllFromCloud;
  window.migrateLocalToCloud = migrateLocalToCloud;
})();
