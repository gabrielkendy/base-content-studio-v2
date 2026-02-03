import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getProfile, parseSocialAccounts, buildUsername } from '@/lib/upload-post'

async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function getUserMembership(userId: string) {
  const admin = createServiceClient()
  const { data } = await admin
    .from('members')
    .select('id, org_id, role, user_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  return data
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const membership = await getUserMembership(user.id)
    if (!membership) return NextResponse.json({ error: 'No active membership' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const clienteSlug = searchParams.get('clienteSlug')
    if (!clienteSlug) return NextResponse.json({ error: 'clienteSlug is required' }, { status: 400 })

    const admin = createServiceClient()

    // Get client
    const { data: cliente, error: clienteError } = await admin
      .from('clientes')
      .select('id, nome, slug, org_id')
      .eq('slug', clienteSlug)
      .eq('org_id', membership.org_id)
      .single()

    if (clienteError || !cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    const username = buildUsername(membership.org_id, cliente.id)

    // Get profile from Upload-Post
    const profileResult = await getProfile(username)

    console.log('[social/status] Profile result:', JSON.stringify(profileResult, null, 2))

    if (!profileResult.success || !profileResult.profile) {
      // Profile doesn't exist yet - return empty accounts
      return NextResponse.json({
        success: true,
        profile_exists: false,
        accounts: [],
        username,
        debug: { error: profileResult.error, profile: profileResult.profile }
      })
    }

    console.log('[social/status] Raw social_accounts:', JSON.stringify(profileResult.profile.social_accounts, null, 2))

    // Parse connected accounts
    const connectedAccounts = parseSocialAccounts(profileResult.profile.social_accounts)
    
    console.log('[social/status] Parsed accounts:', JSON.stringify(connectedAccounts, null, 2))

    // Sync to Supabase: upsert connected accounts, mark missing as disconnected
    const now = new Date().toISOString()

    // Get existing accounts from Supabase
    const { data: existingAccounts } = await admin
      .from('social_accounts')
      .select('*')
      .eq('cliente_id', cliente.id)

    const existingMap = new Map((existingAccounts || []).map(a => [a.platform, a]))

    // Upsert connected accounts
    for (const account of connectedAccounts) {
      const existing = existingMap.get(account.platform)

      if (existing) {
        // Update existing
        await admin
          .from('social_accounts')
          .update({
            profile_name: account.display_name || account.username || account.platform,
            profile_avatar: account.avatar_url,
            profile_id: account.username || existing.profile_id,
            upload_post_user_id: username,
            status: 'active',
            connected_at: existing.status !== 'active' ? now : existing.connected_at,
          })
          .eq('id', existing.id)
      } else {
        // Insert new
        await admin
          .from('social_accounts')
          .insert({
            cliente_id: cliente.id,
            platform: account.platform,
            profile_id: account.username || `${account.platform}_${Date.now()}`,
            profile_name: account.display_name || account.username || account.platform,
            profile_avatar: account.avatar_url,
            upload_post_user_id: username,
            status: 'active',
            connected_at: now,
          })
      }
    }

    // Mark accounts that are no longer connected in Upload-Post as disconnected
    const connectedPlatforms = new Set(connectedAccounts.map(a => a.platform))
    for (const [platform, existing] of existingMap.entries()) {
      if (!connectedPlatforms.has(platform) && existing.status === 'active') {
        await admin
          .from('social_accounts')
          .update({ status: 'disconnected' })
          .eq('id', existing.id)
      }
    }

    // Re-fetch synced accounts
    const { data: syncedAccounts } = await admin
      .from('social_accounts')
      .select('*')
      .eq('cliente_id', cliente.id)
      .eq('status', 'active')

    return NextResponse.json({
      success: true,
      profile_exists: true,
      accounts: syncedAccounts || [],
      upload_post_accounts: connectedAccounts,
      username,
      debug: {
        raw_social_accounts: profileResult.profile.social_accounts,
        parsed_count: connectedAccounts.length,
      }
    })
  } catch (error: any) {
    console.error('Status error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
