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
    // If this bill uses a custom frequency, encode the unit and value
    // into the frequency text itself. For example: "Custom:Month:3".
    let remoteFreq;
    if (bill.frequency === 'Custom') {
      const unit = bill.customUnit || bill.custom_unit || 'Week';
      const value = bill.customValue || bill.custom_value || '1';
      remoteFreq = `Custom:${unit}:${value}`;
    } else {
      remoteFreq = bill.frequency;
    }
    const payload = {
      user_id: uid,
      name: bill.name,
      amount: bill.amount,
      frequency: remoteFreq,
      start_date: bill.startDate || bill.start_date || null,
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
        // Encode custom frequency details into the frequency field.
        frequency: (patch.frequency === 'Custom' ?
          `Custom:${patch.customUnit || patch.custom_unit || 'Week'}:${patch.customValue || patch.custom_value || '1'}`
          : patch.frequency),
        start_date: patch.startDate || patch.start_date || null,
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
      priority: goal.priority || 'Medium',
      deadline: goal.deadline || null
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
        priority: patch.priority,
        deadline: patch.deadline || null
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
    // Extract fields from the local snapshot. The Supabase `history` table
    // includes a `timestamp` column for the snapshot time. It also expects
    // `bills` instead of `bills_due`. Only include known fields to avoid
    // inserting columns that don't exist in the remote schema.
    const {
      ts,
      pay_cycle,
      income1,
      income2,
      splurge,
      bills_due,
      fire_pct,
      smile_pct,
      fire_amt,
      smile_amt,
      mojo_amt,
      remaining,
      total_income
    } = snap;
    const payload = {
      user_id: uid,
      timestamp: ts,
      pay_cycle,
      income1,
      income2,
      splurge,
      bills: bills_due,
      fire_pct,
      smile_pct,
      fire_amt,
      smile_amt,
      mojo_amt,
      remaining,
      total_income
    };
    const { error } = await supabase.from('history').insert(payload);
    if (error) {
      console.error(error);
      alert("Failed to save snapshot");
    }
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
    // Map remote field names to local field names for bills.
    // If the remote frequency begins with "Custom:", parse the unit and value.
    const mappedBills = (remoteBills || []).map(b => {
      let freq = b.frequency;
      let cUnit;
      let cValue;
      if (typeof freq === 'string' && freq.startsWith('Custom:')) {
        const parts = freq.split(':');
        if (parts.length >= 3) {
          cUnit = parts[1];
          cValue = parts[2];
        }
        freq = 'Custom';
      }
      return {
        id: String(b.id),
        name: b.name,
        amount: b.amount,
        frequency: freq,
        startDate: b.start_date,
        customUnit: cUnit,
        customValue: cValue
      };
    });
    window.bills.splice(0, window.bills.length, ...mappedBills);
    const mappedDebts = (remoteDebts || []).map(d => ({
      id: String(d.id),
      name: d.name,
      amount: d.amount,
      minPayment: d.min_payment,
      interest: d.interest,
      priority: d.priority,
      initialAmount: d.initial_amount
    }));
    window.debts.splice(0, window.debts.length, ...mappedDebts);
    const mappedGoals = (remoteGoals || []).map(g => ({
      id: String(g.id),
      name: g.name,
      targetAmount: g.target,
      savedAmount: g.saved,
      deadline: g.deadline || null,
      priority: g.priority
    }));
    window.goals.splice(0, window.goals.length, ...mappedGoals);
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
      const billsPayload = localBills.map(b => {
        // Encode custom frequencies into the frequency field
        let remoteFreq;
        if (b.frequency === 'Custom') {
          const unit = b.customUnit || b.custom_unit || 'Week';
          const value = b.customValue || b.custom_value || '1';
          remoteFreq = `Custom:${unit}:${value}`;
        } else {
          remoteFreq = b.frequency;
        }
        return {
          user_id: uid,
          name: b.name,
          amount: b.amount,
          frequency: remoteFreq,
          start_date: b.start_date || b.startDate || null
        };
      });
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
