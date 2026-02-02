const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gpqxqykgcrpmvwxktjvp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcXhxeWtnY3JwbXZ3eGt0anZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE2MzE1MywiZXhwIjoyMDgyNzM5MTUzfQ.vc_LKoT5evW3hkDC29bgKjHB7U-XNvPbIvQMoYn8b18'
);

async function run() {
  // Test: check if analytics_snapshots already exists
  const { error: e1 } = await supabase.from('analytics_snapshots').select('id').limit(0);
  console.log('analytics_snapshots:', e1 ? 'NOT EXISTS' : 'EXISTS');

  const { error: e2 } = await supabase.from('client_assets').select('id').limit(0);
  console.log('client_assets:', e2 ? 'NOT EXISTS' : 'EXISTS');

  // Check brand columns
  const { data: c, error: e3 } = await supabase.from('clientes').select('bio').limit(0);
  console.log('brand columns:', e3 ? 'NOT EXISTS - ' + e3.message : 'EXISTS');
}
run();
