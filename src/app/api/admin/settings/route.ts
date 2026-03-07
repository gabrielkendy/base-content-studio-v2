import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_SETTINGS = [
  {
    key: 'maintenance_mode',
    value: 'false',
    description: 'Ativa modo de manutenção (bloqueia acesso à plataforma)',
    type: 'bool',
  },
  {
    key: 'signup_enabled',
    value: 'true',
    description: 'Permite novos cadastros na plataforma',
    type: 'bool',
  },
  {
    key: 'max_trial_days',
    value: '14',
    description: 'Dias de trial gratuito para novos usuários',
    type: 'int',
  },
]

function isSystemAdmin(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return adminEmails.includes(email.toLowerCase())
}

async function getUser() {
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
  return user
}

export async function GET() {
  try {
    const user = await getUser()
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isSystemAdmin(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const admin = createServiceClient()

    let dbSettings: Array<{ key: string; value: string; description: string; updated_at: string }> = []
    try {
      const { data } = await admin.from('system_settings').select('key, value, description, updated_at')
      dbSettings = data || []
    } catch {
      // Table doesn't exist — return defaults
    }

    // Merge defaults with DB values
    const dbMap = new Map(dbSettings.map((s) => [s.key, s]))
    const settings = DEFAULT_SETTINGS.map((def) => {
      const db = dbMap.get(def.key)
      return {
        key: def.key,
        value: db?.value ?? def.value,
        description: db?.description || def.description,
        updated_at: db?.updated_at ?? '',
        type: def.type,
      }
    })

    return NextResponse.json({ settings })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser()
    if (!user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isSystemAdmin(user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { key, value } = await request.json()
    if (!key) return NextResponse.json({ error: 'Key required' }, { status: 400 })

    const admin = createServiceClient()
    const { error } = await admin
      .from('system_settings')
      .upsert({ key, value: String(value), updated_at: new Date().toISOString() })

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          { error: 'Tabela system_settings não existe. Execute a migration SQL.' },
          { status: 500 }
        )
      }
      throw error
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
