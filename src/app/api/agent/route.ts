/**
 * GET /api/agent
 *
 * Endpoint de descoberta — descreve a API de agente. Útil pra LLM saber o
 * que está disponível antes de chamar qualquer rota.
 *
 * Auth: bearer token via header `Authorization: Bearer <AGENT_API_TOKEN>` ou
 * `?token=...`. Alternativamente, sessão de email em `ADMIN_EMAILS`.
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAgent } from '@/lib/agent-auth'

export async function GET(request: NextRequest) {
  const auth = await authenticateAgent(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    org_id: auth.orgId,
    auth_source: auth.source,
    endpoints: {
      'GET    /api/agent': 'Este descritor',
      'GET    /api/agent/clientes': 'Lista clientes da org (?q= busca por nome)',
      'POST   /api/agent/clientes': 'Cria cliente { nome, slug?, contato?, notas?, cores? }',
      'GET    /api/agent/clientes/:slug': 'Detalhe + redes conectadas + aprovadores',
      'GET    /api/agent/conteudos': 'Lista conteúdos (?cliente=slug, ?status=, ?mes=, ?ano=)',
      'POST   /api/agent/conteudos': 'Cria conteúdo { cliente, titulo, legenda, midia_urls?, capa_url?, canais?, data_publicacao?, status? }',
      'POST   /api/agent/posts/publish-now': 'Publica imediatamente { cliente, platforms[], caption, media_urls?, hashtags?, cover_url? }',
      'POST   /api/agent/posts/schedule': 'Agenda { cliente, platforms[], caption, media_urls?, scheduled_at, timezone? }',
      'POST   /api/agent/approvals/link': 'Gera link público de aprovação { conteudo_id }',
      'POST   /api/agent/approvals/send': 'Envia link via WhatsApp { conteudo_id }',
      'GET    /api/agent/approvals/:conteudo_id': 'Status do(s) link(s) de aprovação',
      'GET    /api/agent/social/:slug': 'Redes sociais conectadas pro cliente',
      'POST   /api/agent/demandas': 'Cria solicitação/demanda { cliente, titulo, descricao, prioridade?, prazo? }',
      'POST   /api/agent/media': 'Sobe mídia (multipart file | source_url | base64) → URL pública',
    },
    notes: [
      'Todos os endpoints respeitam org_id automaticamente.',
      'Identificação de cliente aceita { id, slug, nome }.',
      'Status válidos pra conteúdo: backlog, ideia, producao, aprovacao_interna, aprovacao, agendado, publicado.',
    ],
  })
}
