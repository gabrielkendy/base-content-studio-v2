import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// Get authenticated user
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

// Get user's membership (org_id + role)
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
      return NextResponse.json({ error: 'No active membership found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start') // ISO date string
    const endDate = searchParams.get('end') // ISO date string
    const clienteId = searchParams.get('cliente_id') // optional filter
    const status = searchParams.get('status') // optional filter

    if (!startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Missing required parameters: start and end dates' 
      }, { status: 400 })
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ 
        error: 'Invalid date format. Use ISO date strings.' 
      }, { status: 400 })
    }

    if (start > end) {
      return NextResponse.json({ 
        error: 'Start date must be before end date' 
      }, { status: 400 })
    }

    const admin = createServiceClient()

    // Build filters
    const filters = [
      { op: 'eq', col: 'org_id', val: membership.org_id },
      { op: 'gte', col: 'scheduled_at', val: startDate },
      { op: 'lte', col: 'scheduled_at', val: endDate }
    ]

    if (clienteId) {
      filters.push({ op: 'eq', col: 'cliente_id', val: clienteId })
    }

    if (status) {
      filters.push({ op: 'eq', col: 'status', val: status })
    }

    // Get scheduled posts
    let query = admin
      .from('scheduled_posts')
      .select(`
        *,
        clientes:cliente_id (
          id,
          nome,
          logo_url,
          slug,
          cores
        ),
        conteudos:conteudo_id (
          id,
          titulo,
          tipo,
          slides
        )
      `)

    // Apply filters
    for (const filter of filters) {
      if (filter.op === 'eq') {
        query = query.eq(filter.col, filter.val)
      } else if (filter.op === 'gte') {
        query = query.gte(filter.col, filter.val)
      } else if (filter.op === 'lte') {
        query = query.lte(filter.col, filter.val)
      }
    }

    // Order by scheduled date
    query = query.order('scheduled_at', { ascending: true })

    const { data: posts, error } = await query

    if (error) {
      console.error('Error fetching scheduled posts:', error)
      return NextResponse.json({ error: 'Erro ao buscar posts agendados' }, { status: 500 })
    }

    // Process the results for easier consumption
    const processedPosts = (posts || []).map(post => {
      const platforms = typeof post.platforms === 'string' 
        ? JSON.parse(post.platforms) 
        : post.platforms

      const publishedUrls = typeof post.published_urls === 'string' 
        ? JSON.parse(post.published_urls) 
        : post.published_urls || []

      return {
        id: post.id,
        cliente_id: post.cliente_id,
        cliente: post.clientes,
        conteudo_id: post.conteudo_id,
        conteudo: post.conteudos,
        platforms,
        caption: post.caption,
        media_urls: post.media_urls,
        hashtags: post.hashtags,
        scheduled_at: post.scheduled_at,
        published_at: post.published_at,
        status: post.status,
        published_urls: publishedUrls,
        error_message: post.error_message,
        created_at: post.created_at,
        updated_at: post.updated_at
      }
    })

    // Group by date for calendar view
    const postsByDate: Record<string, typeof processedPosts> = {}
    processedPosts.forEach(post => {
      const date = post.scheduled_at.split('T')[0] // Get YYYY-MM-DD
      if (!postsByDate[date]) {
        postsByDate[date] = []
      }
      postsByDate[date].push(post)
    })

    return NextResponse.json({ 
      data: processedPosts,
      by_date: postsByDate,
      total: processedPosts.length,
      date_range: { start: startDate, end: endDate }
    })
  } catch (error: any) {
    console.error('Calendar API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}