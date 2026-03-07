import { NextRequest, NextResponse } from 'next/server'
import { authenticate } from '@/lib/api-auth'
import { dispatchWebhookEvent } from '@/lib/webhook-dispatch'

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { orgId } = auth

    const { event_type, data } = await req.json()

    if (!event_type) {
      return NextResponse.json({ error: 'Missing event_type' }, { status: 400 })
    }

    await dispatchWebhookEvent(orgId, event_type, data)

    return NextResponse.json({ dispatched: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('Webhook dispatch error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
