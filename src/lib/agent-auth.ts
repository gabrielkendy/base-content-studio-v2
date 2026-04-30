/**
 * Autenticação para endpoints `/api/agent/*`.
 *
 * Aceita 2 modos:
 *   1) Bearer token estático via `AGENT_API_TOKEN` (env). Recomendado para uso
 *      programático (Claude Code, MCP, n8n, scripts).
 *   2) Cookie de sessão Supabase + email do usuário em `ADMIN_EMAILS` (env).
 *
 * Sempre devolve `orgId` resolvido (do token via env `AGENT_ORG_ID` ou
 * fallback pro org da membership do usuário). Sem orgId → 403.
 */
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { authenticate as authenticateSession } from '@/lib/api-auth'

export interface AgentAuth {
  orgId: string
  /** Origem da auth — pra log/audit. */
  source: 'token' | 'admin-session'
  /** userId da sessão (apenas no modo session). */
  userId?: string
}

/** Lê tokens válidos do env `AGENT_API_TOKEN` (CSV). */
function getAllowedTokens(): string[] {
  const raw = process.env.AGENT_API_TOKEN || ''
  return raw.split(',').map(t => t.trim()).filter(Boolean)
}

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || ''
  return raw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
}

async function resolveOrgIdForToken(): Promise<string | null> {
  // Org explicita no env
  if (process.env.AGENT_ORG_ID) return process.env.AGENT_ORG_ID
  // Fallback: primeira org cadastrada (útil em SaaS single-tenant)
  const admin = createServiceClient()
  const { data } = await admin
    .from('organizations')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  return data?.id ?? null
}

export async function authenticateAgent(request: NextRequest): Promise<AgentAuth | null> {
  // 1) Token bearer
  const authHeader = request.headers.get('authorization') || ''
  const headerToken = authHeader.replace(/^Bearer\s+/i, '').trim()
  const queryToken = request.nextUrl.searchParams.get('token')?.trim() || ''
  const presentedToken = headerToken || queryToken
  const allowedTokens = getAllowedTokens()

  if (presentedToken && allowedTokens.includes(presentedToken)) {
    const orgId = await resolveOrgIdForToken()
    if (!orgId) return null
    return { orgId, source: 'token' }
  }

  // 2) Cookie de sessão + ADMIN_EMAILS
  const session = await authenticateSession(request)
  if (session) {
    const admin = createServiceClient()
    const { data: userInfo } = await admin.auth.admin.getUserById(session.userId)
    const email = userInfo?.user?.email?.toLowerCase() || ''
    const adminEmails = getAdminEmails()
    if (email && adminEmails.includes(email)) {
      return { orgId: session.orgId, source: 'admin-session', userId: session.userId }
    }
  }

  return null
}

/** Slugifica nome de cliente. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60)
}

/** Resolve cliente por id, slug ou nome (na org do agente). */
export async function resolveCliente(
  orgId: string,
  identifier: { id?: string; slug?: string; nome?: string },
): Promise<{ id: string; nome: string; slug: string; org_id: string } | null> {
  const admin = createServiceClient()
  let query = admin.from('clientes').select('id, nome, slug, org_id').eq('org_id', orgId)
  if (identifier.id) query = query.eq('id', identifier.id)
  else if (identifier.slug) query = query.eq('slug', identifier.slug)
  else if (identifier.nome) query = query.ilike('nome', identifier.nome)
  else return null
  const { data } = await query.maybeSingle()
  return data ?? null
}
