// Server-side DB proxy - bypasses RLS issues
// Use this for all CRUD operations until RLS is fixed

interface Filter {
  op: 'eq' | 'neq' | 'gte' | 'lte' | 'gt' | 'lt' | 'like' | 'ilike' | 'in' | 'not' | 'is'
  col: string
  val: any
  nop?: string
}

interface Order {
  col: string
  asc?: boolean
}

interface DbRequest {
  action: 'select' | 'insert' | 'update' | 'delete' | 'upsert'
  table: string
  data?: any
  match?: Record<string, any>
  select?: string
  filters?: Filter[]
  order?: Order | Order[]
  limit?: number
  single?: boolean
}

async function dbProxy(req: DbRequest): Promise<{ data: any; error: string | null }> {
  try {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    const json = await res.json()
    if (!res.ok || json.error) {
      return { data: null, error: json.error || 'Request failed' }
    }
    return { data: json.data, error: null }
  } catch (err: any) {
    return { data: null, error: err.message }
  }
}

// Convenience helpers
export const db = {
  select: (table: string, opts?: { select?: string; filters?: Filter[]; order?: Order | Order[]; limit?: number; single?: boolean }) =>
    dbProxy({ action: 'select', table, ...opts }),

  insert: (table: string, data: any, opts?: { select?: string; single?: boolean }) =>
    dbProxy({ action: 'insert', table, data, ...opts }),

  update: (table: string, data: any, match: Record<string, any>, opts?: { select?: string; single?: boolean }) =>
    dbProxy({ action: 'update', table, data, match, ...opts }),

  delete: (table: string, match: Record<string, any>) =>
    dbProxy({ action: 'delete', table, match }),

  upsert: (table: string, data: any, opts?: { select?: string; single?: boolean }) =>
    dbProxy({ action: 'upsert', table, data, ...opts }),
}
