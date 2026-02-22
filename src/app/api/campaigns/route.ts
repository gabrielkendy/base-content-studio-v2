import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getCampaignInsights, getCampaignInsightsCustom, DatePreset } from '@/lib/meta-ads'

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

async function getUserMembership(userId: string) {
  const admin = createServiceClient()
  const { data } = await admin
    .from('members')
    .select('id, org_id, role, user_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  return data
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const membership = await getUserMembership(user.id)
    if (!membership) {
      return NextResponse.json({ error: 'No active membership' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const clienteSlug = searchParams.get('clienteSlug')
    const clienteId = searchParams.get('clienteId')
    const datePreset = (searchParams.get('datePreset') || 'last_7d') as DatePreset
    const dateStart = searchParams.get('dateStart')
    const dateEnd = searchParams.get('dateEnd')
    
    if (!clienteSlug && !clienteId) {
      return NextResponse.json({ error: 'clienteSlug or clienteId required' }, { status: 400 })
    }
    
    const admin = createServiceClient()
    
    // Buscar cliente
    let query = admin.from('clientes').select('id, nome, slug, ad_account_id, ad_account_name')
    if (clienteId) {
      query = query.eq('id', clienteId)
    } else {
      query = query.eq('slug', clienteSlug!)
    }
    query = query.eq('org_id', membership.org_id)
    
    const { data: cliente, error: clienteError } = await query.single()
    
    if (clienteError || !cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }
    
    if (!cliente.ad_account_id) {
      return NextResponse.json({
        success: true,
        campaigns: [],
        message: 'Conta de anúncios não configurada',
        needs_setup: true,
      })
    }
    
    // Buscar campanhas
    let campaigns
    if (dateStart && dateEnd) {
      campaigns = await getCampaignInsightsCustom(cliente.ad_account_id, dateStart, dateEnd)
    } else {
      campaigns = await getCampaignInsights(cliente.ad_account_id, datePreset)
    }
    
    // Calcular totais
    const totals = {
      spend: campaigns.reduce((sum, c) => sum + c.spend, 0),
      results: campaigns.reduce((sum, c) => sum + c.results, 0),
      cost_per_result: 0,
      roas: 0,
      active_campaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
      total_campaigns: campaigns.length,
    }
    
    totals.cost_per_result = totals.results > 0 ? totals.spend / totals.results : 0
    
    // Calcular ROAS médio (só de campanhas com ROAS > 0)
    const campaignsWithRoas = campaigns.filter(c => c.roas > 0)
    totals.roas = campaignsWithRoas.length > 0
      ? campaignsWithRoas.reduce((sum, c) => sum + c.roas, 0) / campaignsWithRoas.length
      : 0
    
    return NextResponse.json({
      success: true,
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        slug: cliente.slug,
        ad_account_id: cliente.ad_account_id,
        ad_account_name: cliente.ad_account_name,
      },
      campaigns,
      totals,
      date_preset: datePreset,
    })
  } catch (error: any) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
