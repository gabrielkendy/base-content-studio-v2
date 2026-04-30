/**
 * GET /api/agent/clientes/:slug
 *
 * Detalhe completo do cliente: dados base, redes conectadas (Upload-Post),
 * aprovadores cadastrados.
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAgent } from '@/lib/agent-auth'
import { createServiceClient } from '@/lib/supabase/server'
import * as UP from '@/lib/upload-post-v2'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await authenticateAgent(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await params
  const admin = createServiceClient()

  const { data: cliente } = await admin
    .from('clientes')
    .select('*')
    .eq('org_id', auth.orgId)
    .eq('slug', slug)
    .maybeSingle()

  if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  // Redes conectadas via Upload-Post API (best-effort)
  let socials: any[] = []
  try {
    socials = await UP.verificarConexoes(cliente.slug)
  } catch (err: any) {
    console.warn('[agent/clientes/:slug] verificarConexoes:', err?.message)
  }

  const { data: aprovadores } = await admin
    .from('aprovadores')
    .select('id, nome, whatsapp, email, tipo, nivel, ativo, recebe_notificacao, pode_editar_legenda')
    .eq('empresa_id', cliente.id)
    .eq('ativo', true)
    .order('nivel', { ascending: true })

  return NextResponse.json({
    cliente,
    socials,
    aprovadores: aprovadores || [],
  })
}
