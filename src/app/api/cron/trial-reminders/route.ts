import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyTrialEnding, notifyTrialExpired } from '@/lib/notifications'

// Use service role for cron (no auth context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const results = {
      trialEnding: 0,
      trialExpired: 0,
      errors: [] as string[],
    }

    // 1. Find organizations with trial ending in 3 days
    const threeDaysFromNow = new Date(now)
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    
    const { data: endingOrgs } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        trial_end,
        members:organization_members(
          user:profiles(id, email, name)
        )
      `)
      .eq('subscription_status', 'trialing')
      .gte('trial_end', now.toISOString())
      .lte('trial_end', threeDaysFromNow.toISOString())

    // Send trial ending emails
    for (const org of endingOrgs || []) {
      const daysLeft = Math.ceil(
        (new Date(org.trial_end).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      for (const member of org.members || []) {
        const user = member.user as any
        if (user?.email) {
          try {
            await notifyTrialEnding(
              { id: user.id, email: user.email, name: user.name },
              daysLeft,
              { id: org.id, name: org.name }
            )
            results.trialEnding++
          } catch (err: any) {
            results.errors.push(`Trial ending email failed for ${user.email}: ${err.message}`)
          }
        }
      }
    }

    // 2. Find organizations with trial expired (trial_end < now)
    const { data: expiredOrgs } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        members:organization_members(
          user:profiles(id, email, name)
        )
      `)
      .eq('subscription_status', 'trialing')
      .lt('trial_end', now.toISOString())

    // Update status and send trial expired emails
    for (const org of expiredOrgs || []) {
      // Update org status
      await supabase
        .from('organizations')
        .update({ subscription_status: 'canceled' })
        .eq('id', org.id)

      // Send emails to admins
      const admins = (org.members || []).filter((m: any) => m.role === 'admin')
      for (const member of admins.length ? admins : org.members || []) {
        const user = member.user as any
        if (user?.email) {
          try {
            await notifyTrialExpired(
              { id: user.id, email: user.email, name: user.name },
              { id: org.id, name: org.name }
            )
            results.trialExpired++
          } catch (err: any) {
            results.errors.push(`Trial expired email failed for ${user.email}: ${err.message}`)
          }
        }
      }
    }

    console.log('Trial reminders cron completed:', results)

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: now.toISOString(),
    })
  } catch (err: any) {
    console.error('Trial reminders cron error:', err)
    return NextResponse.json(
      { error: err.message || 'Cron job failed' },
      { status: 500 }
    )
  }
}
