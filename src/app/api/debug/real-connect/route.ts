import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { ensureProfile, generateJwtUrl, buildUsername } from '@/lib/upload-post'

export async function GET(request: NextRequest) {
  const results: any = { steps: [] }
  
  try {
    const admin = createServiceClient()
    
    // 1. Get Beat Life client
    const { data: cliente, error: clienteError } = await admin
      .from('clientes')
      .select('id, nome, slug, org_id')
      .eq('slug', 'beat-life')
      .single()
    
    results.steps.push({
      step: '1. Get Cliente',
      success: !clienteError,
      data: cliente,
      error: clienteError?.message
    })
    
    if (!cliente) {
      return NextResponse.json(results)
    }
    
    // 2. Build username
    const username = buildUsername(cliente.org_id, cliente.id)
    results.steps.push({
      step: '2. Build Username',
      success: true,
      username
    })
    
    // 3. Ensure profile
    const profileResult = await ensureProfile(username)
    results.steps.push({
      step: '3. Ensure Profile',
      success: profileResult.success,
      data: profileResult.profile,
      error: profileResult.error
    })
    
    // 4. Generate JWT URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://base-content-studio-v2.vercel.app'
    const redirectUrl = `${appUrl}/clientes/${cliente.slug}/redes?connected=true`
    
    const jwtResult = await generateJwtUrl({
      username,
      redirect_url: redirectUrl,
      connect_title: 'Conectar Redes Sociais',
      connect_description: `Conecte as redes sociais de ${cliente.nome}`,
      platforms: ['instagram', 'tiktok', 'youtube', 'facebook'],
      show_calendar: false,
    })
    
    results.steps.push({
      step: '4. Generate JWT URL',
      success: jwtResult.success,
      access_url: jwtResult.access_url,
      error: jwtResult.error
    })
    
    results.summary = {
      allPassed: results.steps.every((s: any) => s.success),
      redirectUrl,
      appUrl
    }
    
  } catch (err: any) {
    results.error = err.message
    results.stack = err.stack
  }
  
  return NextResponse.json(results)
}
