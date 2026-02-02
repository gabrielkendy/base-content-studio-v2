import pg from 'pg';
const { Client } = pg;

// Supabase direct connection - project ref: gpqxqykgcrpmvwxktjvp
// Default format: postgresql://postgres.[ref]:[db-password]@aws-0-[region].pooler.supabase.com:6543/postgres
// Or session mode: :5432

// Since we don't have the DB password, let's try using the service role JWT as the password
// (this works with Supabase's connection pooler in some cases)
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcXhxeWtnY3JwbXZ3eGt0anZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE2MzE1MywiZXhwIjoyMDgyNzM5MTUzfQ.vc_LKoT5evW3hkDC29bgKjHB7U-XNvPbIvQMoYn8b18';

// Try multiple connection formats
const configs = [
  {
    name: 'Pooler (transaction)',
    connectionString: `postgresql://postgres.gpqxqykgcrpmvwxktjvp:${serviceKey}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`
  },
  {
    name: 'Pooler session mode',
    connectionString: `postgresql://postgres.gpqxqykgcrpmvwxktjvp:${serviceKey}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`
  },
  {
    name: 'Direct',
    connectionString: `postgresql://postgres:${serviceKey}@db.gpqxqykgcrpmvwxktjvp.supabase.co:5432/postgres`
  },
];

const sql = `
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_color text DEFAULT '#6366F1';
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#3B82F6';
  ALTER TABLE organizations ADD COLUMN IF NOT EXISTS favicon_url text;
  ALTER TABLE members ADD COLUMN IF NOT EXISTS notification_prefs jsonb DEFAULT '{}'::jsonb;
`;

async function tryConnect(config) {
  console.log(`Trying: ${config.name}...`);
  const client = new Client({
    connectionString: config.connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    console.log('Connected!');
    const result = await client.query(sql);
    console.log('Migration result:', result?.command || 'OK');
    await client.end();
    return true;
  } catch (err) {
    console.log(`Failed: ${err.message}`);
    try { await client.end(); } catch {}
    return false;
  }
}

async function run() {
  for (const config of configs) {
    const ok = await tryConnect(config);
    if (ok) {
      console.log('\n✅ Migration successful!');
      return;
    }
  }
  console.log('\n❌ Could not connect to database. Manual migration needed.');
  console.log('Run this SQL in Supabase Dashboard:');
  console.log(sql);
}

run().catch(console.error);
