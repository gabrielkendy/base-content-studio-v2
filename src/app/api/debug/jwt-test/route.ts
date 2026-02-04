import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.UPLOAD_POST_API_URL || 'https://api.upload-post.com'
const API_KEY = process.env.UPLOAD_POST_API_KEY || ''

export async function GET(request: NextRequest) {
  // Mostrar info da API key (sem expor ela toda)
  const keyInfo = {
    length: API_KEY.length,
    first10: API_KEY.substring(0, 10),
    last10: API_KEY.substring(API_KEY.length - 10),
    hasNewline: API_KEY.includes('\n') || API_KEY.includes('\r'),
    api_url: API_URL,
  }

  // Testar gerar JWT
  try {
    const res = await fetch(`${API_URL}/api/uploadposts/users/generate-jwt`, {
      method: 'POST',
      headers: {
        'Authorization': `Apikey ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'thebeatlifeclub',
        redirect_url: 'https://base-content-studio-v2.vercel.app/auth/social-callback?connected=true&cliente=thebeatlifeclub',
        show_calendar: false,
      }),
    })

    const data = await res.json()

    return NextResponse.json({
      keyInfo,
      jwtTest: {
        status: res.status,
        success: data.success,
        hasAccessUrl: !!data.access_url,
        error: data.message || null,
      },
    })
  } catch (error: any) {
    return NextResponse.json({
      keyInfo,
      jwtTest: {
        error: error.message,
      },
    })
  }
}
