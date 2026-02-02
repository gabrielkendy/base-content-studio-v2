import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// SQL to create member_clients table
// Run this once via Supabase Dashboard > SQL Editor if the table doesn't exist
const SETUP_SQL = `
CREATE TABLE IF NOT EXISTS member_clients (
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
END $$;
`

export async function GET(_request: NextRequest) {
  const admin = createServiceClient()
  
  // Check if table exists by trying to query it
  const { error } = await admin.from('member_clients').select('id').limit(0)
  
  if (error) {
    return NextResponse.json({
      status: 'table_missing',
      message: 'The member_clients table does not exist yet. Please run the SQL below in Supabase Dashboard > SQL Editor:',
      sql: SETUP_SQL,
    })
  }

  return NextResponse.json({
    status: 'ok',
    message: 'member_clients table exists and is ready.',
  })
}
