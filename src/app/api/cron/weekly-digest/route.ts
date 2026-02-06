import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyWeeklyDigest } from '@/lib/notifications'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const oneWeekAgo = new Date(now)
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    const weekRange = `${oneWeekAgo.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`

    const results = {
      sent: 0,
      errors: [] as string[],
    }

    // Get all active organizations
    const { data: orgs } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        members:organization_members(
          role,
          user:profiles(id, email, name)
        )
      `)
      .in('subscription_status', ['active', 'trialing'])

    for (const org of orgs || []) {
      // Get stats for this org
      const { count: totalCreated } = await supabase
        .from('contents')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .gte('created_at', oneWeekAgo.toISOString())

      const { count: totalApproved } = await supabase
        .from('contents')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .eq('status', 'aprovado')
        .gte('updated_at', oneWeekAgo.toISOString())

      const { count: totalPublished } = await supabase
        .from('contents')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .eq('status', 'publicado')
        .gte('updated_at', oneWeekAgo.toISOString())

      const { count: totalPending } = await supabase
        .from('contents')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', org.id)
        .in('status', ['aguardando_aprovacao', 'em_producao', 'briefing'])

      // Only send if there was any activity
      if ((totalCreated || 0) + (totalApproved || 0) + (totalPublished || 0) === 0) {
        continue
      }

      // Send to admins and gestores
      const recipients = (org.members || [])
        .filter((m: any) => ['admin', 'gestor'].includes(m.role))
        .map((m: any) => m.user)
        .filter((u: any) => u?.email)

      for (const user of recipients) {
        try {
          await notifyWeeklyDigest(
            { id: user.id, email: user.email, name: user.name },
            {
              weekRange,
              totalCreated: totalCreated || 0,
              totalApproved: totalApproved || 0,
              totalPublished: totalPublished || 0,
              totalPending: totalPending || 0,
            },
            { id: org.id, name: org.name }
          )
          results.sent++
        } catch (err: any) {
          results.errors.push(`Weekly digest failed for ${user.email}: ${err.message}`)
        }
      }
    }

    console.log('Weekly digest cron completed:', results)

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: now.toISOString(),
    })
  } catch (err: any) {
    console.error('Weekly digest cron error:', err)
    return NextResponse.json(
      { error: err.message || 'Cron job failed' },
      { status: 500 }
    )
  }
}
