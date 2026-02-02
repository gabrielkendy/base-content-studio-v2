import { NextResponse } from 'next/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// This endpoint creates the client_assets table and storage bucket
// Call it once to set up the Sprint 11 infrastructure
export async function POST() {
  const results: string[] = []

  // 1. Create storage bucket
  try {
    const bucketRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'client-assets',
        name: 'client-assets',
        public: true,
        file_size_limit: 104857600,
      }),
    })
    
    if (bucketRes.ok) {
      results.push('✅ Bucket "client-assets" created')
    } else {
      const err = await bucketRes.json()
      if (err.message?.includes('already exists')) {
        results.push('ℹ️ Bucket "client-assets" already exists')
      } else {
        results.push(`⚠️ Bucket error: ${JSON.stringify(err)}`)
      }
    }
  } catch (e: any) {
    results.push(`❌ Bucket error: ${e.message}`)
  }

  // 2. Check if table exists
  try {
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/client_assets?select=id&limit=0`,
      {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      }
    )

    if (checkRes.ok) {
      results.push('ℹ️ Table "client_assets" already exists')
    } else {
      results.push('⚠️ Table "client_assets" does not exist yet')
      results.push('📋 Run this SQL in Supabase Dashboard > SQL Editor:')
      results.push('')
      results.push(`CREATE TABLE IF NOT EXISTS client_assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  folder varchar(255) DEFAULT '/',
  filename varchar(500) NOT NULL,
  file_url text NOT NULL,
  file_type varchar(100),
  file_size bigint,
  thumbnail_url text,
  tags text[] DEFAULT '{}',
  description text,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE client_assets ENABLE ROW LEVEL SECURITY;

DO $policy$ BEGIN
  CREATE POLICY "service_role_all" ON client_assets FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $policy$;

CREATE INDEX IF NOT EXISTS idx_client_assets_cliente ON client_assets(cliente_id, folder);
CREATE INDEX IF NOT EXISTS idx_client_assets_org ON client_assets(org_id);`)
    }
  } catch (e: any) {
    results.push(`❌ Table check error: ${e.message}`)
  }

  return NextResponse.json({ results })
}
