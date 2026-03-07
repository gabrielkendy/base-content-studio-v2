import { createServiceClient } from '@/lib/supabase/server'

/**
 * Dispatch a webhook event to all active webhook configs for an org.
 * Call this directly instead of making an HTTP call to /api/webhooks/dispatch.
 */
export async function dispatchWebhookEvent(
  orgId: string,
  eventType: string,
  data: unknown,
): Promise<void> {
  const supabase = createServiceClient()

  const { data: configs, error } = await supabase
    .from('webhook_configs')
    .select('*')
    .eq('org_id', orgId)
    .eq('active', true)
    .contains('events', [eventType])

  if (error || !configs || configs.length === 0) return

  const timestamp = new Date().toISOString()

  for (const config of configs) {
    const payload = { event: eventType, timestamp, data, webhook_id: config.id }
    let status: 'sent' | 'failed' = 'failed'
    let responseCode: number | null = null

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'BASE-Content-Studio/2.0',
      }
      if (config.secret) headers['X-Webhook-Secret'] = config.secret

      const res = await fetch(config.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      })
      responseCode = res.status
      status = res.ok ? 'sent' : 'failed'
    } catch (err) {
      console.error(`Webhook delivery failed for ${config.url}:`, err)
    }

    await supabase.from('webhook_events').insert({
      org_id: orgId,
      webhook_id: config.id,
      event_type: eventType,
      payload,
      status,
      response_code: responseCode,
      sent_at: status === 'sent' ? timestamp : null,
    })
  }
}
