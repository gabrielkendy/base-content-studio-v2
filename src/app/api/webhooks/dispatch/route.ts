import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { org_id, event_type, data } = await req.json()

    if (!org_id || !event_type) {
      return NextResponse.json({ error: 'Missing org_id or event_type' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Find active webhook configs for this org that listen to this event
    const { data: configs, error: configError } = await supabase
      .from('webhook_configs')
      .select('*')
      .eq('org_id', org_id)
      .eq('active', true)
      .contains('events', [event_type])

    if (configError) {
      console.error('Webhook config query error:', configError)
      return NextResponse.json({ error: configError.message }, { status: 500 })
    }

    if (!configs || configs.length === 0) {
      return NextResponse.json({ dispatched: 0 })
    }

    const timestamp = new Date().toISOString()
    const results = []

    for (const config of configs) {
      const payload = {
        event: event_type,
        timestamp,
        data,
        webhook_id: config.id,
      }

      let status: 'sent' | 'failed' = 'failed'
      let responseCode: number | null = null

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'BASE-Content-Studio/2.0',
        }

        // Add secret as signature header if configured
        if (config.secret) {
          headers['X-Webhook-Secret'] = config.secret
        }

        const res = await fetch(config.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000), // 10s timeout
        })

        responseCode = res.status
        status = res.ok ? 'sent' : 'failed'
      } catch (err) {
        console.error(`Webhook delivery failed for ${config.url}:`, err)
        status = 'failed'
      }

      // Log the event
      await supabase.from('webhook_events').insert({
        org_id,
        webhook_id: config.id,
        event_type,
        payload,
        status,
        response_code: responseCode,
        sent_at: status === 'sent' ? timestamp : null,
      })

      results.push({ webhook_id: config.id, status, response_code: responseCode })
    }

    return NextResponse.json({ dispatched: results.length, results })
  } catch (err: any) {
    console.error('Webhook dispatch error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
