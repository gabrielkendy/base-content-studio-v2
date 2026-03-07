import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAuthUser, getOrgId } from '../_utils'

/**
 * GET /api/whatsapp/credentials
 * Returns org's Z-API config (never exposes the token).
 */
export async function GET(request: NextRequest) {
  const orgId = await getOrgId(request)
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceClient()
  const { data: org } = await admin
    .from('organizations')
    .select('zapi_instance_id, zapi_status, zapi_phone')
    .eq('id', orgId)
    .single()

  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  return NextResponse.json({
    hasCredentials: !!org.zapi_instance_id,
    instanceId: org.zapi_instance_id || null,
    status: org.zapi_status || 'disconnected',
    phone: org.zapi_phone || null,
  })
}

/**
 * POST /api/whatsapp/credentials
 * Save Z-API instance credentials for the org.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceClient()

  // Only admin/gestor can save credentials
  const { data: member } = await admin
    .from('members')
    .select('org_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  if (!member?.org_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['admin', 'gestor'].includes(member.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { instanceId, token } = await request.json()
  if (!instanceId?.trim() || !token?.trim()) {
    return NextResponse.json({ error: 'Instance ID e Token são obrigatórios' }, { status: 400 })
  }

  const { error } = await admin
    .from('organizations')
    .update({
      zapi_instance_id: instanceId.trim(),
      zapi_token: token.trim(),
      zapi_status: 'disconnected',
      zapi_phone: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', member.org_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
