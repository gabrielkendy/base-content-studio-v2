import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { buildUsername } from '@/lib/upload-post'

const API_URL = process.env.UPLOAD_POST_API_URL || 'https://api.upload-post.com'
const API_KEY = process.env.UPLOAD_POST_API_KEY!

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

interface AnalyticsData {
  platform: string
  followers: number
  impressions: number
  reach: number
  profile_views: number
  likes: number
  comments: number
  shares: number
  engagement_rate: number
  raw_data: any
}

async function fetchUploadPostAnalytics(profileUsername: string): Promise<AnalyticsData[]> {
  try {
    const res = await fetch(`${API_URL}/api/analytics/${encodeURIComponent(profileUsername)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Apikey ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      console.error(`Upload-Post analytics error: HTTP ${res.status}`)
      return []
    }

    const data = await res.json()
    const results: AnalyticsData[] = []

    // Parse Upload-Post response - adapt to actual response format
    // The API may return per-platform data or aggregated data
    if (data.platforms) {
      for (const [platform, metrics] of Object.entries(data.platforms) as [string, any][]) {
        results.push({
          platform,
          followers: metrics.followers || 0,
          impressions: metrics.impressions || 0,
          reach: metrics.reach || 0,
          profile_views: metrics.profile_views || metrics.profileViews || 0,
          likes: metrics.likes || 0,
          comments: metrics.comments || 0,
          shares: metrics.shares || 0,
          engagement_rate: metrics.engagement_rate || metrics.engagementRate || 0,
          raw_data: metrics,
        })
      }
    } else if (data.data && Array.isArray(data.data)) {
      for (const item of data.data) {
        results.push({
          platform: item.platform || 'unknown',
          followers: item.followers || 0,
          impressions: item.impressions || 0,
          reach: item.reach || 0,
          profile_views: item.profile_views || item.profileViews || 0,
          likes: item.likes || 0,
          comments: item.comments || 0,
          shares: item.shares || 0,
          engagement_rate: item.engagement_rate || item.engagementRate || 0,
          raw_data: item,
        })
      }
    } else {
      // Single platform or flat response
      const platforms = ['instagram', 'tiktok', 'linkedin', 'facebook', 'x']
      for (const platform of platforms) {
        if (data[platform]) {
          const m = data[platform]
          results.push({
            platform,
            followers: m.followers || 0,
            impressions: m.impressions || 0,
            reach: m.reach || 0,
            profile_views: m.profile_views || m.profileViews || 0,
            likes: m.likes || 0,
            comments: m.comments || 0,
            shares: m.shares || 0,
            engagement_rate: m.engagement_rate || m.engagementRate || 0,
            raw_data: m,
          })
        }
      }
    }

    return results
  } catch (error: any) {
    console.error('Failed to fetch Upload-Post analytics:', error.message)
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const membership = await getUserMembership(user.id)
    if (!membership) return NextResponse.json({ error: 'No active membership' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get('clienteId')
    const clienteSlug = searchParams.get('clienteSlug')

    if (!clienteId && !clienteSlug) {
      return NextResponse.json({ error: 'clienteId or clienteSlug is required' }, { status: 400 })
    }

    const admin = createServiceClient()

    // Get client
    let clienteQuery = admin.from('clientes').select('id, nome, slug, org_id')
    if (clienteId) {
      clienteQuery = clienteQuery.eq('id', clienteId)
    } else {
      clienteQuery = clienteQuery.eq('slug', clienteSlug!)
    }
    clienteQuery = clienteQuery.eq('org_id', membership.org_id)

    const { data: cliente, error: clienteError } = await clienteQuery.single()
    if (clienteError || !cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    const username = buildUsername(membership.org_id, cliente.id, cliente.slug)

    // Fetch analytics from Upload-Post
    const analyticsData = await fetchUploadPostAnalytics(username)

    // Also get connected social accounts to know which platforms to show
    const { data: socialAccounts } = await admin
      .from('social_accounts')
      .select('platform, profile_name, profile_avatar')
      .eq('cliente_id', cliente.id)
      .eq('status', 'active')

    const today = new Date().toISOString().split('T')[0]
    const snapshots: any[] = []

    // Upsert snapshots for each platform
    for (const analytics of analyticsData) {
      const snapshotData = {
        org_id: membership.org_id,
        cliente_id: cliente.id,
        platform: analytics.platform,
        snapshot_date: today,
        followers: analytics.followers,
        impressions: analytics.impressions,
        reach: analytics.reach,
        profile_views: analytics.profile_views,
        likes: analytics.likes,
        comments: analytics.comments,
        shares: analytics.shares,
        engagement_rate: analytics.engagement_rate,
        raw_data: analytics.raw_data,
      }

      const { data: upserted, error: upsertError } = await admin
        .from('analytics_snapshots')
        .upsert(snapshotData, { onConflict: 'cliente_id,platform,snapshot_date' })
        .select()
        .single()

      if (!upsertError && upserted) {
        snapshots.push(upserted)
      } else if (upsertError) {
        console.error(`Upsert error for ${analytics.platform}:`, upsertError)
      }
    }

    // If no data from API, return latest snapshots from DB
    if (snapshots.length === 0) {
      const { data: latestSnapshots } = await admin
        .from('analytics_snapshots')
        .select('*')
        .eq('cliente_id', cliente.id)
        .order('snapshot_date', { ascending: false })
        .limit(10)

      return NextResponse.json({
        success: true,
        snapshots: latestSnapshots || [],
        social_accounts: socialAccounts || [],
        from_cache: true,
      })
    }

    return NextResponse.json({
      success: true,
      snapshots,
      social_accounts: socialAccounts || [],
      from_cache: false,
    })
  } catch (error: any) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
