import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getOrgZapiCredentials } from '../_utils'
import { zapiGetStatus } from '@/lib/zapi'

/**
 * GET /api/whatsapp/status
 * Checks Z-API connection status and syncs it to the org record.
 * Returns { connected: boolean, phone?: string, status: string }
 */
export async function GET(request: NextRequest) {
  const creds = await getOrgZapiCredentials(request)
  if (!creds) {
    return NextResponse.json({ connected: false, status: 'no_credentials' })
  }

  try {
    const zapiStatus = await zapiGetStatus(creds.instanceId, creds.token)

    // Sync status to DB
    const admin = createServiceClient()
    await admin
      .from('organizations')
      .update({
        zapi_status: zapiStatus.connected ? 'connected' : 'disconnected',
        zapi_phone: zapiStatus.connected && zapiStatus.phone ? zapiStatus.phone : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', creds.orgId)

    return NextResponse.json({
      connected: zapiStatus.connected,
      phone: zapiStatus.phone || null,
      status: zapiStatus.connected ? 'connected' : 'disconnected',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao verificar status'
    return NextResponse.json({ connected: false, status: 'error', error: message }, { status: 500 })
  }
}
