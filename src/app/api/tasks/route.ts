import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { authenticate } from '@/lib/api-auth'

// GET - Lista tarefas
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { orgId } = auth

    const { searchParams } = new URL(req.url)
    const user_id = searchParams.get('user_id')
    const status = searchParams.get('status')
    const assigned_to = searchParams.get('assigned_to')
    const cliente_id = searchParams.get('cliente_id')
    const view = searchParams.get('view') || 'all' // 'all' | 'mine' | 'created'

    const supabase = createServiceClient()

    let query = supabase
      .from('tasks')
      .select(`
        *,
        assignee:members!tasks_assigned_to_fkey(id, user_id, display_name, avatar_url, role),
        creator:members!tasks_created_by_fkey(id, user_id, display_name, avatar_url, role),
        cliente:clientes(id, nome, slug, logo_url),
        conteudo:conteudos(id, titulo, tipo, status)
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('GET /api/tasks error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST - Criar tarefa
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { orgId } = auth

    const body = await req.json()
    const {
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

    if (!titulo || !created_by) {
      return NextResponse.json({ error: 'titulo and created_by required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        org_id: orgId,
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

    if (assigned_to && assigned_to !== created_by) {
      await supabase.from('notifications').insert({
        user_id: assigned_to,
        org_id: orgId,
        type: 'task_assigned',
        title: 'Nova tarefa atribuída',
        body: `Você recebeu uma nova tarefa: "${titulo}"`,
        reference_id: data.id,
        reference_type: 'task',
      })
    }

    return NextResponse.json({ task: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('POST /api/tasks error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH - Atualizar tarefa
export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticate(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { orgId } = auth

    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    if (updates.status === 'concluida') {
      updates.completed_at = new Date().toISOString()
    } else if (updates.status && updates.status !== 'concluida') {
      updates.completed_at = null
    }

    updates.updated_at = new Date().toISOString()
    // Prevent client from overriding org_id
    delete updates.org_id

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) throw error

    if (updates.status === 'concluida' && data.created_by !== data.assigned_to) {
      await supabase.from('notifications').insert({
        user_id: data.created_by,
        org_id: orgId,
        type: 'task_completed',
        title: 'Tarefa concluída',
        body: `A tarefa "${data.titulo}" foi concluída`,
        reference_id: data.id,
        reference_type: 'task',
      })
    }

    return NextResponse.json({ task: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('PATCH /api/tasks error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE - Remover tarefa
export async function DELETE(req: NextRequest) {
  try {
    const auth = await authenticate(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { orgId } = auth

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('DELETE /api/tasks error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
