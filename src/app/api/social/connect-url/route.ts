import { NextRequest, NextResponse } from 'next/server'

const UPLOAD_POST_API_KEY = process.env.UPLOAD_POST_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImdhYnJpZWwua2VuZEBnbWFpbC5jb20iLCJleHAiOjQ5MjM4Mzg2NDIsImp0aSI6IjY3NzUzOTRkLTZhMWMtNGRhYi1iNmZiLTI4YTYwMWFjNTRhNyJ9.KP06TC86GndVw9W6SbrSr8djsLsoNOjiQklLqYczK1k'

export async function POST(request: NextRequest) {
  try {
    const { orgSlug } = await request.json()
    
    if (!orgSlug) {
      return NextResponse.json({ error: 'orgSlug is required' }, { status: 400 })
    }

    const username = `base_${orgSlug}`

    // First, ensure user exists
    await fetch('https://api.upload-post.com/api/uploadposts/users', {
      method: 'POST',
      headers: {
        'Authorization': `Apikey ${UPLOAD_POST_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username })
    })

    // Generate JWT link
    const jwtResponse = await fetch('https://api.upload-post.com/api/uploadposts/users/generate-jwt', {
      method: 'POST',
      headers: {
        'Authorization': `Apikey ${UPLOAD_POST_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        connect_title: 'Conectar Redes Sociais',
        connect_description: 'Conecte suas redes para agendar publicações automaticamente',
        platforms: ['instagram', 'tiktok', 'facebook', 'youtube'],
        show_calendar: false
      })
    })

    const jwtData = await jwtResponse.json()

    if (!jwtResponse.ok || !jwtData.access_url) {
      console.error('Upload-Post JWT error:', jwtData)
      return NextResponse.json({ error: 'Failed to generate connect URL' }, { status: 500 })
    }

    return NextResponse.json({ url: jwtData.access_url })
  } catch (error) {
    console.error('Connect URL error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
