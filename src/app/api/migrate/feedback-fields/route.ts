import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST: Adicionar campos de feedback e migrar dados existentes
export async function POST() {
  try {
    const supabase = createServiceClient()

    // 1. Adicionar colunas (Supabase ignora se já existir via raw SQL)
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE conteudos 
        ADD COLUMN IF NOT EXISTS comentario_cliente TEXT,
        ADD COLUMN IF NOT EXISTS cliente_nome_feedback TEXT;
      `
    }).single()

    // Se rpc não funcionar, tentamos via update direto (as colunas podem já existir)
    
    // 2. Migrar feedbacks existentes
    // Buscar approvals com ajustes
    const { data: adjustments } = await supabase
      .from('approvals')
      .select('conteudo_id, comment, reviewer_name')
      .eq('type', 'external')
      .eq('status', 'adjustment')
      .not('comment', 'is', null)

    if (adjustments && adjustments.length > 0) {
      let updated = 0
      for (const adj of adjustments) {
        const { error } = await supabase
          .from('conteudos')
          .update({
            comentario_cliente: adj.comment,
            cliente_nome_feedback: adj.reviewer_name
          })
          .eq('id', adj.conteudo_id)
          .is('comentario_cliente', null)

        if (!error) updated++
      }
      
      return NextResponse.json({ 
        success: true, 
        message: `Migração concluída! ${updated} conteúdos atualizados com feedback.`,
        total_adjustments: adjustments.length,
        updated
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Nenhum feedback para migrar',
      updated: 0
    })
  } catch (err: any) {
    console.error('Migration error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
