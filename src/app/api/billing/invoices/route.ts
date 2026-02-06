import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Get user's organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!member?.organization_id) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
    }

    // Get invoices
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', member.organization_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invoices:', error)
      return NextResponse.json({ error: 'Erro ao buscar faturas' }, { status: 500 })
    }

    return NextResponse.json({ invoices: invoices || [] })
  } catch (err) {
    console.error('Invoices API error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
