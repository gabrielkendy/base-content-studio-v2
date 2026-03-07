import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getOrgZapiCredentials } from '../_utils'
import { zapiDisconnect } from '@/lib/zapi'

/**
 * POST /api/whatsapp/disconnect
 * Disconnects the Z-API instance and clears phone/status in DB.
 */
export async function POST(request: NextRequest) {
  const creds = await getOrgZapiCredentials(request)
  if (!creds) {
    return NextResponse.json({ error: 'Z-API não configurado' }, { status: 400 })
  }

  // Best-effort disconnect (Z-API side)
  await zapiDisconnect(creds.instanceId, creds.token).catch(() => null)

  // Always clear in DB
  const admin = createServiceClient()
  await admin
    .from('organizations')
    .update({
      zapi_status: 'disconnected',
      zapi_phone: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', creds.orgId)

  return NextResponse.json({ success: true })
}
