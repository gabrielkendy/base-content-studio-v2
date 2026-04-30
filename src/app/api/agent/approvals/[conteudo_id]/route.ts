/**
 * GET /api/agent/approvals/:conteudo_id
 *
 * Lista todos os links de aprovação gerados pra um conteúdo + status
 * (pendente, aprovado, ajuste) + tracking (views, last_viewed_at).
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAgent } from '@/lib/agent-auth'
import { createServiceClient } from '@/lib/supabase/server'
import { getPublicBaseUrl } from '@/lib/approval-notifications'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conteudo_id: string }> },
) {
  const auth = await authenticateAgent(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { conteudo_id } = await params
  const admin = createServiceClient()

  const { data: conteudo } = await admin
    .from('conteudos')
    .select('id, titulo, status, org_id')
    .eq('id', conteudo_id)
    .maybeSingle()
  if (!conteudo) return NextResponse.json({ error: 'Conteúdo não encontrado' }, { status: 404 })
  if (conteudo.org_id !== auth.orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: links } = await admin
    .from('aprovacoes_links')
    .select('token, status, view_count, last_viewed_at, comentario_cliente, cliente_nome, created_at, expires_at, aprovado_em')
    .eq('conteudo_id', conteudo_id)
    .order('created_at', { ascending: false })

  const baseUrl = getPublicBaseUrl()
  const enriched = (links || []).map((l: any) => ({
    ...l,
    link: `${baseUrl}/aprovacao?token=${l.token}`,
  }))

  const { data: history } = await admin
    .from('approvals')
    .select('type, status, reviewer_name, comment, previous_status, new_status, reviewed_at, created_at')
    .eq('conteudo_id', conteudo_id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({
    conteudo: { id: conteudo.id, titulo: conteudo.titulo, status: conteudo.status },
    links: enriched,
    history: history || [],
  })
}
