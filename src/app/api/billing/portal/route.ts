import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { getInternalAppUrl } from '@/lib/approval-notifications'
import { getAuthUser, getUserOrgId } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
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
    const { data: org } = await admin
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', orgId)
      .single()

    if (!org?.stripe_customer_id) {
      return NextResponse.json({ error: 'Nenhuma assinatura encontrada' }, { status: 400 })
    }

    const stripe = getStripe()
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${getInternalAppUrl()}/configuracoes/assinatura`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Portal error:', err)
    return NextResponse.json({ error: 'Erro ao acessar portal de pagamentos' }, { status: 500 })
  }
}
