import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/proxy/image?url=...
 * Proxy para carregar imagens do Google Drive sem CORS
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url')
    
    if (!url) {
      return NextResponse.json({ error: 'URL não fornecida' }, { status: 400 })
    }

    // Validar que é uma URL do Google (segurança)
    const allowedDomains = [
      'drive.google.com',
      'lh3.googleusercontent.com',
      'drive.usercontent.google.com',
    ]
    
    const urlObj = new URL(url)
    if (!allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
      return NextResponse.json({ error: 'Domínio não permitido' }, { status: 403 })
    }

    // Fazer requisição para o Google
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Erro ao carregar imagem' }, { status: response.status })
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache 24h
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err: any) {
    console.error('Proxy image error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
