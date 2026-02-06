import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient as createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Get user's organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization:organizations(stripe_customer_id)')
      .eq('user_id', user.id)
      .single()

    const customerId = (member?.organization as any)?.stripe_customer_id

    if (!customerId) {
      return NextResponse.json({ error: 'Nenhuma assinatura encontrada' }, { status: 400 })
    }

    const stripe = getStripe()

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/configuracoes/assinatura`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Portal error:', err)
    return NextResponse.json(
      { error: 'Erro ao acessar portal de pagamentos' },
      { status: 500 }
    )
  }
}
