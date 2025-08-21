
// static/js/config.js
// 1) FILL THESE IN from Supabase Project Settings → API
window.APP_CONFIG = {
  SUPABASE_URL: "https://aajqzkkxdcydwxuqgame.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhanF6a2t4ZGN5ZHd4dXFnYW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1Njk0ODcsImV4cCI6MjA3MTE0NTQ4N30.4Pnf3psuW_lHNYi2YDAKhHFWgvNivNEZMhAO2t8UX8Y"
};

// 2) Supabase JS client (v2)
window.supabaseClient = window.supabase.createClient(
  window.APP_CONFIG.SUPABASE_URL,
  window.APP_CONFIG.SUPABASE_ANON_KEY
);
