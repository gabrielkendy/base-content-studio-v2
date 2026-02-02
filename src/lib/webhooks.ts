export async function dispatchWebhook(orgId: string, eventType: string, data: any) {
  try {
    await fetch('/api/webhooks/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId, event_type: eventType, data })
    })
  } catch (err) {
    // Fire and forget - don't block UI on webhook failures
    console.error('Webhook dispatch error:', err)
  }
}
