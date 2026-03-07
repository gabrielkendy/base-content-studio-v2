/**
 * One-time migration endpoint.
 * Creates admin_access and system_settings tables if they don't exist.
 * Access restricted to system admins.
 */
import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function isSystemAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return adminEmails.includes(email.toLowerCase())
}

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isSystemAdmin(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = createServiceClient()
    const results: Record<string, string> = {}

    // Create admin_access table
    const { error: e1 } = await admin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS admin_access (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          email text NOT NULL UNIQUE,
          granted_by text,
          created_at timestamptz DEFAULT now(),
          active boolean DEFAULT true
        );
        ALTER TABLE admin_access ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "service role full access" ON admin_access;
        CREATE POLICY "service role full access" ON admin_access USING (true) WITH CHECK (true);
      `,
    })
    results.admin_access = e1 ? `ERROR: ${e1.message}` : 'OK'

    // Create system_settings table
    const { error: e2 } = await admin.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS system_settings (
          key text PRIMARY KEY,
          value text,
          description text,
          updated_at timestamptz DEFAULT now()
        );
        ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "service role full access" ON system_settings;
        CREATE POLICY "service role full access" ON system_settings USING (true) WITH CHECK (true);

        INSERT INTO system_settings (key, value, description) VALUES
          ('maintenance_mode', 'false', 'Ativa modo de manutenção'),
          ('signup_enabled', 'true', 'Permite novos cadastros'),
          ('max_trial_days', '14', 'Dias de trial gratuito')
        ON CONFLICT (key) DO NOTHING;
      `,
    })
    results.system_settings = e2 ? `ERROR: ${e2.message}` : 'OK'

    const hasErrors = Object.values(results).some((v) => v.startsWith('ERROR'))
    return NextResponse.json({ results, success: !hasErrors }, { status: hasErrors ? 500 : 200 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// GET version for easy browser testing
export async function GET() {
  return NextResponse.json({
    instructions: 'Send a POST request to this endpoint while logged in as a system admin to run migrations.',
    curl: 'curl -X POST https://admin.agenciabase.tech/api/admin/migrate -H "Cookie: <your-session-cookie>"',
  })
}
