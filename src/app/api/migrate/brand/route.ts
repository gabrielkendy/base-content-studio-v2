import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const admin = createServiceClient()

  // We can't run DDL via PostgREST, but we can check if columns exist
  // and try to add them via a workaround using rpc if available
  
  // Test if bio column exists
  const { error: testError } = await admin
    .from('clientes')
    .select('bio')
    .limit(1)

  if (!testError) {
    return NextResponse.json({ status: 'ok', message: 'Brand columns already exist' })
  }

  // Columns don't exist - return SQL for manual execution
  return NextResponse.json({
    status: 'migration_needed',
    message: 'Run this SQL in Supabase Dashboard > SQL Editor:',
    sql: `ALTER TABLE clientes ADD COLUMN IF NOT EXISTS brand_guidelines jsonb DEFAULT '{}';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS color_palette jsonb DEFAULT '[]';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS fonts jsonb DEFAULT '{}';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS personas jsonb DEFAULT '[]';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS bio text DEFAULT '';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}';`
  })
}
