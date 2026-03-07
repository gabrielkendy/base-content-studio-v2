import { NextRequest, NextResponse } from 'next/server'
import { getOrgZapiCredentials } from '../_utils'
import { zapiGetQrCode } from '@/lib/zapi'

/**
 * GET /api/whatsapp/qr
 * Fetches the QR code from Z-API for the org's instance.
 * Returns { qrCode: "data:image/png;base64,..." }
 */
export async function GET(request: NextRequest) {
  const creds = await getOrgZapiCredentials(request)
  if (!creds) {
    return NextResponse.json({ error: 'Z-API não configurado ou sem permissão' }, { status: 400 })
  }

  try {
    const qrData = await zapiGetQrCode(creds.instanceId, creds.token)
    // Z-API can return base64 or a raw QR string
    const qrCode = qrData.type === 'base64' ? qrData.value : qrData.value
    return NextResponse.json({ qrCode, type: qrData.type })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar QR code'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
