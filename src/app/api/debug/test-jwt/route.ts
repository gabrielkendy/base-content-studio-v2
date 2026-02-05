import { NextRequest, NextResponse } from 'next/server'

const API_URL = 'https://api.upload-post.com'
const API_KEY = process.env.UPLOAD_POST_API_KEY!

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username') || 'kendyproducoes'
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL 
    || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`
    || 'https://base-content-studio-v2.vercel.app'
  
  const params = {
    username,
    redirect_url: `${appUrl}/auth/social-callback?connected=true&cliente=${encodeURIComponent(username)}`,
    platforms: ['instagram', 'tiktok'],
    connect_title: 'Conectar Redes - BASE',
    connect_description: 'Conecte suas redes sociais',
    show_calendar: false,
  }
  
  try {
    const res = await fetch(`${API_URL}/api/uploadposts/users/generate-jwt`, {
      method: 'POST',
      headers: {
        'Authorization': `Apikey ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    })

    const data = await res.json()
    
    return NextResponse.json({
      debug: {
        appUrl,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
        VERCEL_URL: process.env.VERCEL_URL || 'NOT SET',
      },
      params_sent: params,
      response_status: res.status,
      response_data: data,
    })
  } catch (err: any) {
    return NextResponse.json({
      error: err.message,
      params_sent: params,
    }, { status: 500 })
  }
}
