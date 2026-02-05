import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// GET: Listar aprovações de um conteúdo
export async function GET(request: NextRequest) {
  try {
    const conteudoId = request.nextUrl.searchParams.get('conteudo_id')
    const orgId = request.nextUrl.searchParams.get('org_id')

    if (!conteudoId && !orgId) {
      return NextResponse.json(
        { error: 'conteudo_id ou org_id é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    let query = supabase
      .from('approvals')
      .select('*, reviewer:members!approvals_reviewer_id_fkey(display_name, avatar_url)')
      .order('created_at', { ascending: false })

    if (conteudoId) {
      query = query.eq('conteudo_id', conteudoId)
    }

    if (orgId) {
      query = query.eq('org_id', orgId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Approvals GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    console.error('Approvals GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: Criar nova aprovação (interna ou registro de externa)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      org_id,
      conteudo_id,
      type, // 'internal' | 'external'
      status, // 'pending' | 'approved' | 'rejected' | 'adjustment'
      reviewer_id,
      reviewer_name,
      comment,
      previous_status,
      new_status,
      link_token,
    } = body

    if (!org_id || !conteudo_id || !type || !status) {
      return NextResponse.json(
        { error: 'org_id, conteudo_id, type e status são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Criar registro de aprovação
    const { data: approval, error: approvalError } = await supabase
      .from('approvals')
      .insert({
        org_id,
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
  } catch (err: any) {
    console.error('Approvals POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
