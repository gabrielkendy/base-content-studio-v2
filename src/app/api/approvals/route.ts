import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/api-auth'

// GET: Listar aprovações de um conteúdo
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { orgId } = auth

    const conteudoId = request.nextUrl.searchParams.get('conteudo_id')

    if (!conteudoId) {
      return NextResponse.json(
        { error: 'conteudo_id é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Verify conteudo belongs to user's org
    const { data: conteudo } = await supabase
      .from('conteudos')
      .select('empresa_id')
      .eq('id', conteudoId)
      .single()

    if (!conteudo) {
      return NextResponse.json({ error: 'Conteúdo não encontrado' }, { status: 404 })
    }

    const { data: empresa } = await supabase
      .from('clientes')
      .select('id')
      .eq('id', conteudo.empresa_id)
      .eq('org_id', orgId)
      .single()

    if (!empresa) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('approvals')
      .select('*, reviewer:members!approvals_reviewer_id_fkey(display_name, avatar_url)')
      .eq('conteudo_id', conteudoId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Approvals GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('Approvals GET error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST: Criar nova aprovação (interna ou registro de externa)
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticate(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { orgId } = auth

    const body = await request.json()
    const {
      conteudo_id,
      type,
      status,
      reviewer_id,
      reviewer_name,
      comment,
      previous_status,
      new_status,
      link_token,
    } = body

    if (!conteudo_id || !type || !status) {
      return NextResponse.json(
        { error: 'conteudo_id, type e status são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Verify conteudo belongs to user's org
    const { data: conteudo } = await supabase
      .from('conteudos')
      .select('empresa_id')
      .eq('id', conteudo_id)
      .single()

    if (!conteudo) {
      return NextResponse.json({ error: 'Conteúdo não encontrado' }, { status: 404 })
    }

    const { data: empresa } = await supabase
      .from('clientes')
      .select('id')
      .eq('id', conteudo.empresa_id)
      .eq('org_id', orgId)
      .single()

    if (!empresa) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: approval, error: approvalError } = await supabase
      .from('approvals')
      .insert({
        org_id: orgId,
        conteudo_id,
        type,
        status,
        reviewer_id: reviewer_id || null,
        reviewer_name: reviewer_name || null,
        comment: comment || null,
        previous_status: previous_status || null,
        new_status: new_status || null,
        link_token: link_token || null,
        reviewed_at: ['approved', 'rejected', 'adjustment'].includes(status)
          ? new Date().toISOString()
          : null,
      })
      .select()
      .single()

    if (approvalError) {
      console.error('Approval insert error:', approvalError)
      return NextResponse.json({ error: approvalError.message }, { status: 500 })
    }

    return NextResponse.json({ data: approval })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('Approvals POST error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
