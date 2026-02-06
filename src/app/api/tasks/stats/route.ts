import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Stats de produtividade
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const org_id = searchParams.get('org_id')
    const user_id = searchParams.get('user_id') // opcional, para stats individuais
    const period = searchParams.get('period') || '30' // dias

    if (!org_id) {
      return NextResponse.json({ error: 'org_id required' }, { status: 400 })
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    // Query base
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('org_id', org_id)

    if (user_id) {
      query = query.eq('assigned_to', user_id)
    }

    const { data: allTasks, error } = await query
    if (error) throw error

    // Tasks do período
    const tasksNoPeriodo = allTasks?.filter(t => 
      new Date(t.created_at) >= startDate
    ) || []

    // Calcular stats
    const total = tasksNoPeriodo.length
    const pendentes = tasksNoPeriodo.filter(t => t.status === 'pendente').length
    const em_andamento = tasksNoPeriodo.filter(t => t.status === 'em_andamento').length
    const concluidas = tasksNoPeriodo.filter(t => t.status === 'concluida').length
    const canceladas = tasksNoPeriodo.filter(t => t.status === 'cancelada').length

    // Atrasadas (pendentes/em_andamento com due_date passado)
    const now = new Date()
    const atrasadas = tasksNoPeriodo.filter(t => 
      ['pendente', 'em_andamento'].includes(t.status) &&
      t.due_date &&
      new Date(t.due_date) < now
    ).length

    // Concluídas no prazo
    const concluidasComPrazo = tasksNoPeriodo.filter(t => 
      t.status === 'concluida' && t.due_date && t.completed_at
    )
    const concluidas_no_prazo = concluidasComPrazo.filter(t =>
      new Date(t.completed_at!) <= new Date(t.due_date!)
    ).length

    // Tempo médio de conclusão (em horas)
    const temposConcluxao = tasksNoPeriodo
      .filter(t => t.status === 'concluida' && t.completed_at)
      .map(t => {
        const created = new Date(t.created_at).getTime()
        const completed = new Date(t.completed_at!).getTime()
        return (completed - created) / (1000 * 60 * 60) // horas
      })
    
    const tempo_medio_conclusao_horas = temposConcluxao.length > 0
      ? Math.round(temposConcluxao.reduce((a, b) => a + b, 0) / temposConcluxao.length)
      : null

    // Taxa de conclusão no prazo
    const taxa_no_prazo = concluidasComPrazo.length > 0
      ? Math.round((concluidas_no_prazo / concluidasComPrazo.length) * 100)
      : null

    // Distribuição por prioridade
    const por_prioridade = {
      baixa: tasksNoPeriodo.filter(t => t.prioridade === 'baixa').length,
      normal: tasksNoPeriodo.filter(t => t.prioridade === 'normal').length,
      alta: tasksNoPeriodo.filter(t => t.prioridade === 'alta').length,
      urgente: tasksNoPeriodo.filter(t => t.prioridade === 'urgente').length,
    }

    // Ranking por membro (se não filtrou por user_id)
    let ranking: any[] = []
    if (!user_id) {
      const memberStats: Record<string, { concluidas: number; total: number; nome?: string }> = {}
      
      for (const task of tasksNoPeriodo) {
        if (!task.assigned_to) continue
        if (!memberStats[task.assigned_to]) {
          memberStats[task.assigned_to] = { concluidas: 0, total: 0 }
        }
        memberStats[task.assigned_to].total++
        if (task.status === 'concluida') {
          memberStats[task.assigned_to].concluidas++
        }
      }

      // Buscar nomes dos membros
      const memberIds = Object.keys(memberStats)
      if (memberIds.length > 0) {
        const { data: members } = await supabase
          .from('members')
          .select('user_id, display_name')
          .in('user_id', memberIds)

        members?.forEach(m => {
          if (memberStats[m.user_id]) {
            memberStats[m.user_id].nome = m.display_name
          }
        })
      }

      ranking = Object.entries(memberStats)
        .map(([user_id, stats]) => ({
          user_id,
          nome: stats.nome || 'Desconhecido',
          concluidas: stats.concluidas,
          total: stats.total,
          taxa: stats.total > 0 ? Math.round((stats.concluidas / stats.total) * 100) : 0,
        }))
        .sort((a, b) => b.concluidas - a.concluidas)
        .slice(0, 10)
    }

    // Histórico por dia (últimos 14 dias)
    const historico: { date: string; concluidas: number; criadas: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const concluidas_dia = tasksNoPeriodo.filter(t => 
        t.completed_at && t.completed_at.startsWith(dateStr)
      ).length
      
      const criadas_dia = tasksNoPeriodo.filter(t =>
        t.created_at.startsWith(dateStr)
      ).length

      historico.push({ date: dateStr, concluidas: concluidas_dia, criadas: criadas_dia })
    }

    return NextResponse.json({
      stats: {
        total,
        pendentes,
        em_andamento,
        concluidas,
        canceladas,
        atrasadas,
        concluidas_no_prazo,
        tempo_medio_conclusao_horas,
        taxa_no_prazo,
        por_prioridade,
      },
      ranking,
      historico,
      periodo_dias: parseInt(period),
    })
  } catch (err: any) {
    console.error('GET /api/tasks/stats error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
