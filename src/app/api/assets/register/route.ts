import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Register uploaded assets in the database (after direct upload to Storage)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { assets } = await req.json()

    if (!assets?.length) {
      return NextResponse.json({ error: 'No assets to register' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const results = []

    for (const asset of assets) {
      const { data, error } = await supabase
        .from('client_assets')
        .insert({
          org_id: asset.orgId,
          cliente_id: asset.clienteId,
          folder: asset.folder || '/',
          filename: asset.fileName,
          file_url: asset.publicUrl,
          file_type: asset.fileType || null,
          file_size: asset.fileSize || null,
          thumbnail_url: asset.thumbnailUrl || null,
          tags: asset.tags || [],
          description: asset.description || null,
          uploaded_by: user.id,
        })
        .select()
        .single()

      if (error) {
        console.error('Register error:', error)
        continue
      }
      results.push(data)
    }

    return NextResponse.json({ data: results })
  } catch (err: any) {
    console.error('Register route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
