import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await getUserMembership(user.id)
    if (!membership) {
      return NextResponse.json({ error: 'No active membership' }, { status: 403 })
    }

    const admin = createServiceClient()
    const now = new Date()

    // Get upcoming scheduled posts
    const { data: posts, error } = await admin
      .from('scheduled_posts')
      .select(`
        id,
        cliente_id,
        platforms,
        caption,
        scheduled_at,
        status,
        created_at,
        published_at,
        upload_post_response
      `)
      .eq('org_id', membership.org_id)
      .in('status', ['scheduled', 'publishing', 'published', 'failed'])
      .order('scheduled_at', { ascending: true })
      .limit(50)

    if (error) {
      console.error('Error fetching posts:', error)
      return NextResponse.json({ error: 'Error fetching posts' }, { status: 500 })
    }

    // Format for Brazilian time display
    const brFormatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const postsWithBRTime = (posts || []).map(post => ({
      ...post,
      scheduled_at_br: brFormatter.format(new Date(post.scheduled_at)),
      is_due: new Date(post.scheduled_at) <= now,
      minutes_until: Math.round((new Date(post.scheduled_at).getTime() - now.getTime()) / 60000),
    }))

    return NextResponse.json({
      posts: postsWithBRTime,
      current_time_br: brFormatter.format(now),
      current_time_utc: now.toISOString(),
      total: postsWithBRTime.length,
      scheduled: postsWithBRTime.filter(p => p.status === 'scheduled').length,
      published: postsWithBRTime.filter(p => p.status === 'published').length,
      failed: postsWithBRTime.filter(p => p.status === 'failed').length,
    })
  } catch (error: any) {
    console.error('Upcoming posts error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
