import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Default sources for fitness/health niche
const DEFAULT_SOURCES = [
  {
    platform: 'instagram',
    handle: 'hubermanlab',
    name: 'Dr. Andrew Huberman',
    avatar_url: 'https://pbs.twimg.com/profile_images/1587566863556902912/xZ_pL3wD_400x400.jpg',
    niche: ['neurociencia', 'saude', 'longevidade', 'performance'],
    language: 'en',
    followers_count: 6200000,
    avg_engagement: 3.5,
  },
  {
    platform: 'instagram',
    handle: 'drpeterattia',
    name: 'Dr. Peter Attia',
    avatar_url: 'https://pbs.twimg.com/profile_images/1683579247827746817/i4T5xCkB_400x400.jpg',
    niche: ['longevidade', 'medicina', 'performance', 'nutricao'],
    language: 'en',
    followers_count: 1800000,
    avg_engagement: 4.2,
  },
  {
    platform: 'instagram',
    handle: 'foundmyfitness',
    name: 'Rhonda Patrick',
    avatar_url: 'https://pbs.twimg.com/profile_images/1533488438093836288/JD5Zy5Rp_400x400.jpg',
    niche: ['saude', 'nutricao', 'longevidade', 'ciencia'],
    language: 'en',
    followers_count: 980000,
    avg_engagement: 3.8,
  },
  {
    platform: 'instagram',
    handle: 'davidasinclair',
    name: 'David Sinclair',
    avatar_url: 'https://pbs.twimg.com/profile_images/1587165650978181120/k9C9KH2J_400x400.jpg',
    niche: ['longevidade', 'envelhecimento', 'ciencia', 'biohacking'],
    language: 'en',
    followers_count: 1500000,
    avg_engagement: 5.1,
  },
  {
    platform: 'instagram',
    handle: 'stanefferding',
    name: 'Stan Efferding',
    avatar_url: 'https://pbs.twimg.com/profile_images/1588989447519297536/xqUCnNY8_400x400.jpg',
    niche: ['nutricao', 'treino', 'performance', 'hipertrofia'],
    language: 'en',
    followers_count: 520000,
    avg_engagement: 4.5,
  },
  {
    platform: 'instagram',
    handle: 'laaboratorio',
    name: 'Layne Norton',
    avatar_url: 'https://pbs.twimg.com/profile_images/1587160925226455040/J_YB6U4H_400x400.jpg',
    niche: ['nutricao', 'treino', 'ciencia', 'emagrecimento'],
    language: 'en',
    followers_count: 890000,
    avg_engagement: 3.9,
  },
  {
    platform: 'instagram',
    handle: 'mindpumpmedia',
    name: 'Mind Pump',
    avatar_url: 'https://pbs.twimg.com/profile_images/1540380295650402304/5q3Cz6Wk_400x400.jpg',
    niche: ['fitness', 'treino', 'lifestyle', 'saude'],
    language: 'en',
    followers_count: 1200000,
    avg_engagement: 3.2,
  },
]

export async function GET(request: NextRequest) {
  try {
    // In production, get tenant_id from auth and load from DB
    // For now, return default sources
    
    const sources = DEFAULT_SOURCES.map((source, index) => ({
      id: `source-${index + 1}`,
      tenant_id: 'mock-tenant-id',
      ...source,
      is_active: true,
      last_scraped_at: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      scrape_frequency: 'daily',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    return NextResponse.json({ sources })

  } catch (error) {
    console.error('Sources fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sources' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { platform, handle, name, niche } = body

    if (!platform || !handle) {
      return NextResponse.json(
        { error: 'Platform and handle are required' },
        { status: 400 }
      )
    }

    // In production, save to Supabase
    // const { data, error } = await supabase
    //   .from('content_sources')
    //   .insert({
    //     tenant_id: tenantId,
    //     platform,
    //     handle,
    //     name,
    //     niche: niche || [],
    //   })
    //   .select()
    //   .single()

    const newSource = {
      id: `source-${Date.now()}`,
      tenant_id: 'mock-tenant-id',
      platform,
      handle,
      name: name || handle,
      avatar_url: null,
      niche: niche || [],
      language: 'en',
      followers_count: 0,
      avg_engagement: 0,
      is_active: true,
      last_scraped_at: null,
      scrape_frequency: 'daily',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return NextResponse.json({ source: newSource })

  } catch (error) {
    console.error('Source creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create source' },
      { status: 500 }
    )
  }
}
