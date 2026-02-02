import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const admin = createServiceClient()

  // Check if member_clients exists
  const { error: checkErr } = await admin.from('member_clients').select('id').limit(0)

  if (!checkErr) {
    return NextResponse.json({ status: 'ok', message: 'member_clients table already exists' })
  }

  // Table doesn't exist — try to create via raw SQL using pg_net or admin
  // Since we can't run DDL via PostgREST, we'll use a workaround:
  // Create the table structure by leveraging Supabase's SQL editor API
  // For now, return the SQL the user needs to run
  return NextResponse.json({
    status: 'table_missing',
    message: 'Run this SQL in Supabase Dashboard > SQL Editor:',
    sql: `CREATE TABLE IF NOT EXISTS member_clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(member_id, cliente_id)
);
ALTER TABLE member_clients ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "service_role_all" ON member_clients FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;`,
  })
}
