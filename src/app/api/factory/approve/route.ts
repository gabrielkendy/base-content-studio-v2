import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Approve content and create workflow task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      creationId,
      clienteId,
      generatedContent,
      assignTo,
      dueDate,
    } = body

    if (!creationId) {
      return NextResponse.json(
        { error: 'Creation ID is required' },
        { status: 400 }
      )
    }

    // 1. Update creation_queue status
    // In production:
    // await supabase
    //   .from('creation_queue')
    //   .update({ 
    //     status: 'approved',
    //     approved_at: new Date().toISOString(),
    //     cliente_id: clienteId,
    //   })
    //   .eq('id', creationId)

    // 2. Create workflow task (conteudo)
    // In production:
    // const { data: conteudo, error } = await supabase
    //   .from('conteudos')
    //   .insert({
    //     empresa_id: clienteId,
    //     titulo: generatedContent.slides[0]?.text?.slice(0, 100) || 'Novo conteúdo',
    //     descricao: `Carrossel gerado via Content Factory\n\n${generatedContent.slides.length} slides`,
    //     tipo_conteudo: 'carrossel',
    //     status: 'aprovado_interno',
    //     slides: generatedContent.slides,
    //     hashtags: generatedContent.hashtags,
    //     cta: generatedContent.cta,
    //     creation_queue_id: creationId,
    //   })
    //   .select()
    //   .single()

    // 3. Create task for designer
    // const { data: task } = await supabase
    //   .from('tasks')
    //   .insert({
    //     org_id: orgId,
    //     titulo: `Design: ${generatedContent.slides[0]?.text?.slice(0, 50)}...`,
    //     descricao: `Criar design para carrossel de ${generatedContent.slides.length} slides.\n\nCopy aprovada, seguir briefing de imagens.`,
    //     prioridade: 'media',
    //     status: 'pendente',
    //     assigned_to: assignTo,
    //     cliente_id: clienteId,
    //     conteudo_id: conteudo.id,
    //     due_date: dueDate,
    //   })
    //   .select()
    //   .single()

    // Mock response
    const result = {
      creationId,
      status: 'approved',
      approved_at: new Date().toISOString(),
      workflow: {
        conteudo_id: `conteudo-${Date.now()}`,
        task_id: `task-${Date.now()}`,
      },
    }

    return NextResponse.json({
      success: true,
      result,
      message: 'Conteúdo aprovado e demanda criada no workflow!',
    })

  } catch (error) {
    console.error('Approve error:', error)
    return NextResponse.json(
      { error: 'Failed to approve content' },
      { status: 500 }
    )
  }
}
