import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthUser, getUserOrgId } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const orgId = await getUserOrgId(user.id)
    if (!orgId) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 404 })
    }

    const admin = createServiceClient()
    const { data: invoices, error } = await admin
      .from('invoices')
      .select('*')
      .eq('organization_id', orgId)
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
