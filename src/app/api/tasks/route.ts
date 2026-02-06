import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Lista tarefas
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const user_id = searchParams.get('user_id')
    const status = searchParams.get('status')
    const assigned_to = searchParams.get('assigned_to')
    const cliente_id = searchParams.get('cliente_id')
    const view = searchParams.get('view') || 'all' // 'all' | 'mine' | 'created'

    if (!org_id) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 })
    }

    let query = supabase
      .from('tasks')
      .select(`
        *,
        assignee:members!tasks_assigned_to_fkey(id, user_id, display_name, avatar_url, role),
        creator:members!tasks_created_by_fkey(id, user_id, display_name, avatar_url, role),
        cliente:clientes(id, nome, slug, logo_url),
        conteudo:conteudos(id, titulo, tipo, status)
      `)
      .eq('org_id', org_id)
      .order('created_at', { ascending: false })

    // Filtros
    if (view === 'mine' && user_id) {
      query = query.eq('assigned_to', user_id)
    } else if (view === 'created' && user_id) {
      query = query.eq('created_by', user_id)
    } else if (assigned_to) {
      query = query.eq('assigned_to', assigned_to)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (cliente_id) {
      query = query.eq('cliente_id', cliente_id)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ tasks: data })
  } catch (err: any) {
    console.error('GET /api/tasks error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST - Criar tarefa
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      org_id,
      titulo,
      descricao,
      prioridade = 'normal',
      assigned_to,
      created_by,
      due_date,
      cliente_id,
      conteudo_id,
      solicitacao_id,
      tags = [],
      checklist = [],
    } = body

    if (!org_id || !titulo || !created_by) {
      return NextResponse.json({ error: 'org_id, titulo, and created_by required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        org_id,
        titulo,
        descricao,
        prioridade,
        status: 'pendente',
        assigned_to,
        created_by,
        due_date,
        cliente_id,
        conteudo_id,
        solicitacao_id,
        tags,
        checklist,
      })
      .select()
      .single()

    if (error) throw error

    // Criar notificação se atribuída a alguém
    if (assigned_to && assigned_to !== created_by) {
      await supabase.from('notifications').insert({
        user_id: assigned_to,
        org_id,
        type: 'task_assigned',
        title: 'Nova tarefa atribuída',
        body: `Você recebeu uma nova tarefa: "${titulo}"`,
        reference_id: data.id,
        reference_type: 'task',
      })

      // TODO: Enviar email de notificação
    }

    return NextResponse.json({ task: data })
  } catch (err: any) {
    console.error('POST /api/tasks error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH - Atualizar tarefa
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, org_id, ...updates } = body

    if (!id || !org_id) {
      return NextResponse.json({ error: 'id and org_id required' }, { status: 400 })
    }

    // Se está marcando como concluída, adicionar completed_at
    if (updates.status === 'concluida') {
      updates.completed_at = new Date().toISOString()
    } else if (updates.status && updates.status !== 'concluida') {
      updates.completed_at = null
    }

    updates.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('org_id', org_id)
      .select()
      .single()

    if (error) throw error

    // Notificar criador quando tarefa for concluída
    if (updates.status === 'concluida' && data.created_by !== data.assigned_to) {
      await supabase.from('notifications').insert({
        user_id: data.created_by,
        org_id,
        type: 'task_completed',
        title: 'Tarefa concluída',
        body: `A tarefa "${data.titulo}" foi concluída`,
        reference_id: data.id,
        reference_type: 'task',
      })
    }

    return NextResponse.json({ task: data })
  } catch (err: any) {
    console.error('PATCH /api/tasks error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE - Remover tarefa
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const org_id = searchParams.get('org_id')

    if (!id || !org_id) {
      return NextResponse.json({ error: 'id and org_id required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('org_id', org_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('DELETE /api/tasks error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
