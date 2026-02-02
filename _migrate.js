// Run migration via Supabase REST API using pg_net or rpc
const SUPABASE_URL = 'https://gpqxqykgcrpmvwxktjvp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcXhxeWtnY3JwbXZ3eGt0anZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE2MzE1MywiZXhwIjoyMDgyNzM5MTUzfQ.vc_LKoT5evW3hkDC29bgKjHB7U-XNvPbIvQMoYn8b18';

const SQL = `
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS brand_guidelines jsonb DEFAULT '{}';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS color_palette jsonb DEFAULT '[]';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS fonts jsonb DEFAULT '{}';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS personas jsonb DEFAULT '[]';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS bio text DEFAULT '';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}';
`;

async function run() {
  // Try via Supabase's SQL API endpoint (internal, undocumented but works)
  const sqlRes = await fetch(`${SUPABASE_URL}/pg/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: SQL }),
  });
  
  console.log('pg/sql status:', sqlRes.status);
  const text = await sqlRes.text();
  console.log('Response:', text.substring(0, 500));
  
  if (sqlRes.ok) {
    console.log('Migration OK!');
    return;
  }
  
  // Verify by checking if columns exist now
  const testRes = await fetch(`${SUPABASE_URL}/rest/v1/clientes?select=bio&limit=1`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    }
  });
  console.log('Verify bio column:', testRes.status);
}

run();
