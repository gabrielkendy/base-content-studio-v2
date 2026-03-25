import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'

export interface OrgCredentials {
  orgId: string
  instanceId: string
  token: string
}

/** Get authenticated user from request cookies */
export async function getAuthUser(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/** Get org_id for authenticated user */
export async function getOrgId(request: NextRequest): Promise<string | null> {
  const user = await getAuthUser(request)
  if (!user) return null

  const admin = createServiceClient()
  const { data: member } = await admin
    .from('members')
    .select('org_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return member?.org_id || null
}

/** Get org's Z-API credentials. Returns null if not configured. */
export async function getOrgZapiCredentials(request: NextRequest): Promise<OrgCredentials | null> {
  const user = await getAuthUser(request)
  if (!user) return null

  const admin = createServiceClient()
  const { data: member } = await admin
    .from('members')
    .select('org_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!member?.org_id) return null

  const { data: org } = await admin
    .from('organizations')
    .select('zapi_instance_id, zapi_token')
    .eq('id', member.org_id)
    .single()

  if (!org?.zapi_instance_id || !org?.zapi_token) return null

  return {
    orgId: member.org_id,
    instanceId: org.zapi_instance_id,
    token: org.zapi_token,
  }
}
