import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'

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

/** Get org_id for authenticated user's active membership */
export async function getUserOrgId(userId: string): Promise<string | null> {
  const admin = createServiceClient()
  const { data: member } = await admin
    .from('members')
    .select('org_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  return member?.org_id ?? null
}

/** Authenticate request and return { userId, orgId } or null */
export async function authenticate(
  request: NextRequest,
): Promise<{ userId: string; orgId: string } | null> {
  const user = await getAuthUser(request)
  if (!user) return null
  const orgId = await getUserOrgId(user.id)
  if (!orgId) return null
  return { userId: user.id, orgId }
}
