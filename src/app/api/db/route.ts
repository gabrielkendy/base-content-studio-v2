import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Whitelist of tables accessible via the DB proxy
const ALLOWED_TABLES = new Set([
  'organizations',
  'members', 'invites', 'member_clients',
  'clientes',
  'conteudos', 'assets', 'client_assets',
  'campaigns', 'scheduled_posts', 'social_accounts',
  'approvals', 'aprovadores', 'aprovacoes_links',
  'messages', 'notifications', 'activity_log',
  'webhook_configs', 'webhook_events',
  'tasks', 'solicitacoes',
  'admin_access', 'system_settings',
])

// Tables that have org_id column (must be scoped)
const ORG_SCOPED_TABLES = [
  'clientes', 'conteudos', 'members', 'invites', 'messages',
  'notifications', 'webhook_configs', 'webhook_events', 'activity_log',
  'solicitacoes', 'member_clients', 'social_accounts', 'scheduled_posts',
  'client_assets', 'tasks', 'campaigns',
]

// Tables that should be client-scoped for "cliente" role users
const CLIENT_SCOPED_TABLES: Record<string, string> = {
  'conteudos': 'empresa_id',
  'solicitacoes': 'cliente_id',
  'messages': 'cliente_id',
  'clientes': 'id',
  'social_accounts': 'cliente_id',
  'scheduled_posts': 'cliente_id',
  'client_assets': 'cliente_id',
}

// Tables that are org-level (the row IS the org)
const ORG_SELF_TABLES = ['organizations']

// Get authenticated user
async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Get user's membership (org_id + role)
async function getUserMembership(userId: string) {
  const admin = createServiceClient()
  const { data } = await admin
    .from('members')
    .select('id, org_id, role, user_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  return data
}

// Sanitize like/ilike pattern: limit length and escape raw % used by mistake
function sanitizeLikePattern(val: unknown): string {
  const str = String(val ?? '').slice(0, 200)
  return str
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, table, data, match, select, order, filters, limit: lim, single } = body

    if (!table || !action) {
      return NextResponse.json({ error: 'Missing table or action' }, { status: 400 })
    }

    // Table whitelist
    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: 'Table not allowed' }, { status: 403 })
    }

    // Get user's org membership
    const membership = await getUserMembership(user.id)
    if (!membership) {
      return NextResponse.json({ error: 'No active membership found' }, { status: 403 })
    }

    const userOrgId = membership.org_id
    const userRole = membership.role
    const memberId = membership.id

    const admin = createServiceClient()

    // --- CLIENT-SCOPING: For "cliente" role, restrict to linked clients ---
    let clienteIds: string[] | null = null
    if (userRole === 'cliente' && CLIENT_SCOPED_TABLES[table]) {
      const { data: memberClients, error: mcError } = await admin
        .from('member_clients')
        .select('cliente_id')
        .eq('member_id', memberId)
        .eq('org_id', userOrgId)

      if (mcError) {
        // Table error — be restrictive, get all org clients as fallback
        clienteIds = []
      } else {
        clienteIds = (memberClients || []).map((mc: { cliente_id: string }) => mc.cliente_id)
      }

      if (clienteIds.length === 0) {
        // No linked clients — fallback: use all org clients so portal works
        const { data: allClients } = await admin
          .from('clientes')
          .select('id')
          .eq('org_id', userOrgId)
        clienteIds = (allClients || []).map((c: { id: string }) => c.id)

        if (clienteIds.length === 0 && action === 'select') {
          return NextResponse.json({ data: [] })
        }
      }
    }

    // --- SECURITY: Enforce org scoping ---
    const isOrgScoped = ORG_SCOPED_TABLES.includes(table)
    const isOrgSelf = ORG_SELF_TABLES.includes(table)

    if (isOrgScoped) {
      if (action === 'select') {
        const hasOrgFilter = filters?.some((f: { col: string }) => f.col === 'org_id')
        if (!hasOrgFilter) {
          if (!body.filters) body.filters = []
          body.filters.push({ op: 'eq', col: 'org_id', val: userOrgId })
        } else {
          const orgFilter = filters.find((f: { col: string; val: string }) => f.col === 'org_id')
          if (orgFilter && orgFilter.val !== userOrgId) {
            return NextResponse.json({ error: 'Access denied: wrong org' }, { status: 403 })
          }
        }

        // Inject client-scoping for "cliente" role
        if (clienteIds !== null && CLIENT_SCOPED_TABLES[table]) {
          const clientCol = CLIENT_SCOPED_TABLES[table]
          if (!body.filters) body.filters = []
          body.filters.push({ op: 'in', col: clientCol, val: clienteIds })
        }
      } else if (action === 'insert') {
        if (Array.isArray(data)) {
          for (const row of data) {
            if (row.org_id && row.org_id !== userOrgId) {
              return NextResponse.json({ error: 'Access denied: wrong org' }, { status: 403 })
            }
            row.org_id = userOrgId
          }
        } else if (data) {
          if (data.org_id && data.org_id !== userOrgId) {
            return NextResponse.json({ error: 'Access denied: wrong org' }, { status: 403 })
          }
          data.org_id = userOrgId
        }
      } else if (action === 'upsert') {
        if (Array.isArray(data)) {
          for (const row of data) { row.org_id = userOrgId }
        } else if (data) {
          data.org_id = userOrgId
        }
      } else if (action === 'update' || action === 'delete') {
        if (!match) {
          return NextResponse.json({ error: 'Match criteria required for update/delete' }, { status: 400 })
        }
        // org_id enforcement is applied below in the query builder
      }
    }

    // For organizations table: can only access own org
    if (isOrgSelf) {
      if (action === 'select') {
        if (!body.filters) body.filters = []
        body.filters.push({ op: 'eq', col: 'id', val: userOrgId })
      } else if (action === 'update') {
        if (userRole !== 'admin') {
          return NextResponse.json({ error: 'Only admins can update organization' }, { status: 403 })
        }
        if (!match || match.id !== userOrgId) {
          return NextResponse.json({ error: 'Access denied: wrong org' }, { status: 403 })
        }
      } else if (action === 'delete') {
        return NextResponse.json({ error: 'Cannot delete organizations via API' }, { status: 403 })
      } else if (action === 'insert' || action === 'upsert') {
        return NextResponse.json({ error: 'Cannot create organizations via API' }, { status: 403 })
      }
    }

    // --- ROLE-BASED RESTRICTIONS ---
    const adminOnlyWrites: Record<string, string[]> = {
      'members': ['insert', 'update', 'delete'],
      'invites': ['insert', 'update', 'delete'],
      'webhook_configs': ['insert', 'update', 'delete'],
    }

    if (adminOnlyWrites[table]?.includes(action)) {
      if (userRole !== 'admin' && userRole !== 'gestor') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
      if (table === 'members' && action === 'update' && data?.role && userRole !== 'admin') {
        return NextResponse.json({ error: 'Only admins can change roles' }, { status: 403 })
      }
    }

    // --- BUILD QUERY ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any

    switch (action) {
      case 'select': {
        query = admin.from(table).select(select || '*')
        if (body.filters) {
          for (const f of body.filters) {
            if (f.op === 'eq') query = query.eq(f.col, f.val)
            else if (f.op === 'neq') query = query.neq(f.col, f.val)
            else if (f.op === 'gte') query = query.gte(f.col, f.val)
            else if (f.op === 'lte') query = query.lte(f.col, f.val)
            else if (f.op === 'gt') query = query.gt(f.col, f.val)
            else if (f.op === 'lt') query = query.lt(f.col, f.val)
            else if (f.op === 'like') query = query.like(f.col, sanitizeLikePattern(f.val))
            else if (f.op === 'ilike') query = query.ilike(f.col, sanitizeLikePattern(f.val))
            else if (f.op === 'in') query = query.in(f.col, f.val)
            else if (f.op === 'not') query = query.not(f.col, f.nop || 'eq', f.val)
            else if (f.op === 'is') query = query.is(f.col, f.val)
          }
        }
        if (order) {
          for (const o of (Array.isArray(order) ? order : [order])) {
            query = query.order(o.col, { ascending: o.asc !== false })
          }
        }
        if (lim) query = query.limit(lim)
        if (single) query = query.single()
        break
      }
      case 'insert': {
        query = admin.from(table).insert(data)
        if (select) query = query.select(select)
        if (single) query = query.single()
        break
      }
      case 'update': {
        // Strip org_id from update data to prevent org migration
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          delete data.org_id
        }
        query = admin.from(table).update(data)
        if (match) {
          for (const [k, v] of Object.entries(match)) {
            query = query.eq(k, v)
          }
        }
        if (isOrgScoped) query = query.eq('org_id', userOrgId)
        if (select) query = query.select(select)
        if (single) query = query.single()
        break
      }
      case 'delete': {
        query = admin.from(table).delete()
        if (match) {
          for (const [k, v] of Object.entries(match)) {
            query = query.eq(k, v)
          }
        }
        if (isOrgScoped) query = query.eq('org_id', userOrgId)
        break
      }
      case 'upsert': {
        query = admin.from(table).upsert(data)
        if (select) query = query.select(select)
        if (single) query = query.single()
        break
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { data: result, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data: result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('DB proxy error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
