import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Tables that have org_id column (must be scoped)
// Tables with org_id column that must be scoped to user's org
const ORG_SCOPED_TABLES = [
  'clientes', 'conteudos', 'members', 'invites', 'messages',
  'notifications', 'webhook_configs', 'webhook_events', 'activity_log',
  'solicitacoes', 'member_clients', 'social_accounts', 'scheduled_posts',
  'client_assets',
]

// Tables that should be client-scoped for "cliente" role users
// Maps table name → column that references the cliente id
const CLIENT_SCOPED_TABLES: Record<string, string> = {
  'conteudos': 'empresa_id',
  'solicitacoes': 'cliente_id',
  'messages': 'cliente_id',
  'clientes': 'id',
  'social_accounts': 'cliente_id',
  'scheduled_posts': 'cliente_id',
  'client_assets': 'cliente_id',
}

// Tables without org_id but linked via foreign keys (empresa_id → clientes → org_id)
// These are indirectly scoped — we allow access but rely on the parent being org-scoped
const INDIRECT_ORG_TABLES = ['aprovacoes_links']

// Tables that are org-level (the row IS the org)
const ORG_SELF_TABLES = ['organizations']

// Tables with user_id scoping instead of org_id
const USER_SCOPED_TABLES = ['notifications']

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
        // Table doesn't exist yet — fallback: allow access to all org clients
        clienteIds = null
      } else {
        clienteIds = (memberClients || []).map((mc: any) => mc.cliente_id)
        
        if (clienteIds.length === 0) {
          // No linked clients — fallback: get all org clients so portal works
          const { data: allClients } = await admin
            .from('clientes')
            .select('id')
            .eq('org_id', userOrgId)
          clienteIds = (allClients || []).map((c: any) => c.id)
          
          if (clienteIds.length === 0 && action === 'select') {
            return NextResponse.json({ data: [] })
          }
        }
      }
    }

    // --- SECURITY: Enforce org scoping ---
    const isOrgScoped = ORG_SCOPED_TABLES.includes(table)
    const isOrgSelf = ORG_SELF_TABLES.includes(table)

    // For org-scoped tables: auto-inject org_id filter on reads, enforce on writes
    if (isOrgScoped) {
      if (action === 'select') {
        // Auto-add org_id filter if not already present
        const hasOrgFilter = filters?.some((f: any) => f.col === 'org_id')
        if (!hasOrgFilter) {
          // Auto-scope: only return data from user's org
          if (!body.filters) body.filters = []
          body.filters.push({ op: 'eq', col: 'org_id', val: userOrgId })
        } else {
          // Verify the org_id filter matches user's org
          const orgFilter = filters.find((f: any) => f.col === 'org_id')
          if (orgFilter && orgFilter.val !== userOrgId) {
            return NextResponse.json({ error: 'Access denied: wrong org' }, { status: 403 })
          }
        }
      } else if (action === 'insert') {
        // Force org_id on insert
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
      } else if (action === 'update' || action === 'delete') {
        // For updates/deletes we need to verify the target rows belong to user's org
        // We add org_id to the match criteria
        if (!match) {
          return NextResponse.json({ error: 'Match criteria required for update/delete' }, { status: 400 })
        }
        // Will be handled below by adding org_id eq to query
      }

      // Inject client-scoping filter for "cliente" role on select
      if (action === 'select' && clienteIds !== null && CLIENT_SCOPED_TABLES[table]) {
        const clientCol = CLIENT_SCOPED_TABLES[table]
        if (!body.filters) body.filters = []
        body.filters.push({ op: 'in', col: clientCol, val: clienteIds })
      }

      if (action === 'upsert') {
        if (Array.isArray(data)) {
          for (const row of data) {
            row.org_id = userOrgId
          }
        } else if (data) {
          data.org_id = userOrgId
        }
      }
    }

    // For organizations table: can only access own org
    if (isOrgSelf) {
      if (action === 'select') {
        if (!body.filters) body.filters = []
        body.filters.push({ op: 'eq', col: 'id', val: userOrgId })
      } else if (action === 'update') {
        // Only admin can update org
        if (userRole !== 'admin') {
          return NextResponse.json({ error: 'Only admins can update organization' }, { status: 403 })
        }
        if (!match || match.id !== userOrgId) {
          return NextResponse.json({ error: 'Access denied: wrong org' }, { status: 403 })
        }
      } else if (action === 'delete') {
        return NextResponse.json({ error: 'Cannot delete organizations via API' }, { status: 403 })
      }
    }

    // --- ROLE-BASED RESTRICTIONS ---
    // Admin-only operations
    const adminOnlyWrites: Record<string, string[]> = {
      'members': ['insert', 'update', 'delete'],
      'invites': ['insert', 'update', 'delete'],
      'webhook_configs': ['insert', 'update', 'delete'],
    }

    if (adminOnlyWrites[table]?.includes(action)) {
      if (userRole !== 'admin' && userRole !== 'gestor') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
      // Only admin (not gestor) can manage members roles
      if (table === 'members' && action === 'update' && data?.role && userRole !== 'admin') {
        return NextResponse.json({ error: 'Only admins can change roles' }, { status: 403 })
      }
    }

    // --- BUILD QUERY ---
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
            else if (f.op === 'like') query = query.like(f.col, f.val)
            else if (f.op === 'ilike') query = query.ilike(f.col, f.val)
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
        query = admin.from(table).update(data)
        if (match) {
          for (const [k, v] of Object.entries(match)) {
            query = query.eq(k, v)
          }
        }
        // Enforce org scoping on update
        if (isOrgScoped) {
          query = query.eq('org_id', userOrgId)
        }
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
        // Enforce org scoping on delete
        if (isOrgScoped) {
          query = query.eq('org_id', userOrgId)
        }
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
  } catch (err: any) {
    console.error('DB proxy error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
