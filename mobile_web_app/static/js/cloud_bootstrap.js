// static/js/cloud_bootstrap.js
// Hooks into auth state and pulls data once the user is logged in.
// Include this AFTER main.js and cloud_data.js (all with defer).
(function () {
  const supabase = window.supabaseClient || window.supabase;

  async function refreshAfterLogin() {
    try {
      if (typeof window.loadAllFromCloud === 'function') {
        await window.loadAllFromCloud();
      }
    } catch (e) {
      console.error("Failed to load from cloud:", e);
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    // If already logged in on first load, fetch immediately
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await refreshAfterLogin();

    // React to auth changes (login/logout)
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN') {
            // When a user signs in, fetch their data from the cloud.
            await refreshAfterLogin();
          } else if (event === 'SIGNED_OUT') {
            // When a user signs out, ensure the UI returns to the login panel.
            try {
              if (typeof requireAuth === 'function') {
                await requireAuth();
              } else if (typeof window.requireAuth === 'function') {
                await window.requireAuth();
              }
            } catch (e) {
              console.error('Error while refreshing auth state after sign‑out:', e);
            }
          }
        });
  });
})();
