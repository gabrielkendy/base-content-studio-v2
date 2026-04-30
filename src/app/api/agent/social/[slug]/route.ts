/**
 * GET /api/agent/social/:slug
 *
 * Status das redes conectadas no Upload-Post pra um cliente (pelo slug).
 * Útil pro agente saber se pode publicar antes de tentar.
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAgent, resolveCliente } from '@/lib/agent-auth'
import * as UP from '@/lib/upload-post-v2'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await authenticateAgent(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const cliente = await resolveCliente(auth.orgId, { slug })
  if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  try {
    const contas = await UP.verificarConexoes(cliente.slug)
    return NextResponse.json({
      cliente,
      socials: contas,
      connected: contas.filter((c: any) => c.conectada).map((c: any) => c.plataforma),
    })
  } catch (err: any) {
    return NextResponse.json({
      error: `Erro ao consultar Upload-Post: ${err.message}`,
      cliente,
    }, { status: 502 })
  }
}
