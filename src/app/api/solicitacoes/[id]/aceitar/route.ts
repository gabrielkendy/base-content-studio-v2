import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: solicitacaoId } = await params
    const admin = createServiceClient()

    // Get user's membership
    const { data: membership } = await admin
      .from('members')
      .select('id, org_id, role, user_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'No active membership' }, { status: 403 })
    }

    // Get the solicitação
    const { data: solicitacao, error: solErr } = await admin
      .from('solicitacoes')
      .select('*, cliente:clientes(id, nome, slug, cores)')
      .eq('id', solicitacaoId)
      .eq('org_id', membership.org_id)
      .single()

    if (solErr || !solicitacao) {
      return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })
    }

    if (solicitacao.status === 'em_producao' || solicitacao.status === 'entregue') {
      return NextResponse.json({ error: 'Solicitação já foi aceita' }, { status: 400 })
    }

    const now = new Date()

    // Create conteúdo from solicitação
    const { data: conteudo, error: createErr } = await admin
      .from('conteudos')
      .insert({
        org_id: membership.org_id,
        empresa_id: solicitacao.cliente_id,
        mes: now.getMonth() + 1,
        ano: now.getFullYear(),
        titulo: solicitacao.titulo,
        tipo: 'post',
        descricao: solicitacao.descricao,
        status: 'rascunho',
        ordem: 0,
        slides: [],
        prompts_imagem: [],
        prompts_video: [],
        midia_urls: [],
        canais: [],
        assigned_to: membership.user_id,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select()
      .single()

    if (createErr) {
      console.error('Error creating conteudo:', createErr)
      return NextResponse.json({ error: createErr.message }, { status: 500 })
    }

    // Update solicitação status
    await admin
      .from('solicitacoes')
      .update({
        status: 'em_producao',
        respondido_por: membership.user_id,
        updated_at: now.toISOString(),
      })
      .eq('id', solicitacaoId)

    return NextResponse.json({ data: conteudo })
  } catch (err: any) {
    console.error('Aceitar solicitação error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
