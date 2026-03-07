/**
 * Z-API WhatsApp client
 * Each organization brings their own Z-API instance credentials.
 * Docs: https://developer.z-api.io
 */

const ZAPI_BASE = 'https://api.z-api.io/instances'
const TIMEOUT_MS = 8000

function zapiHeaders(token: string): HeadersInit {
  return {
    'Client-Token': token,
    'Content-Type': 'application/json',
  }
}

export interface ZapiQrCode {
  value: string // base64 PNG data URL or raw QR string
  type: 'base64' | 'qr'
}

export interface ZapiStatus {
  connected: boolean
  smartphoneConnected?: boolean
  phone?: string
  session?: string
  error?: string
}

export interface ZapiSendResult {
  zaapId?: string
  messageId?: string
  id?: string
}

/** GET QR code for pairing */
export async function zapiGetQrCode(instanceId: string, token: string): Promise<ZapiQrCode> {
  const res = await fetch(`${ZAPI_BASE}/${instanceId}/token/${token}/qr-code`, {
    headers: zapiHeaders(token),
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Z-API QR: ${res.status} ${text}`)
  }
  return res.json()
}

/** GET instance connection status */
export async function zapiGetStatus(instanceId: string, token: string): Promise<ZapiStatus> {
  const res = await fetch(`${ZAPI_BASE}/${instanceId}/token/${token}/status`, {
    headers: zapiHeaders(token),
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Z-API status: ${res.status} ${text}`)
  }
  return res.json()
}

/** POST disconnect instance */
export async function zapiDisconnect(instanceId: string, token: string): Promise<boolean> {
  const res = await fetch(`${ZAPI_BASE}/${instanceId}/token/${token}/disconnect`, {
    method: 'POST',
    headers: zapiHeaders(token),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  return res.ok
}

/** POST send text message */
export async function zapiSendText(
  instanceId: string,
  token: string,
  phone: string,
  message: string,
): Promise<ZapiSendResult> {
  const res = await fetch(`${ZAPI_BASE}/${instanceId}/token/${token}/send-text`, {
    method: 'POST',
    headers: zapiHeaders(token),
    body: JSON.stringify({ phone, message }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Z-API send: ${res.status} ${text}`)
  }
  return res.json()
}
