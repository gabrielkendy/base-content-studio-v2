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

// Generate a presigned URL for direct upload to Supabase Storage
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await getUserMembership(user.id)
    if (!membership) {
      return NextResponse.json({ error: 'No active membership' }, { status: 403 })
    }

    const { filename, contentType, clienteId } = await request.json()

    if (!filename || !contentType || !clienteId) {
      return NextResponse.json({ error: 'Missing filename, contentType, or clienteId' }, { status: 400 })
    }

    const admin = createServiceClient()

    // Verify client belongs to org
    const { data: cliente } = await admin
      .from('clientes')
      .select('id')
      .eq('id', clienteId)
      .eq('org_id', membership.org_id)
      .single()

    if (!cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Generate path
    const timestamp = Date.now()
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${membership.org_id}/${clienteId}/posts/${timestamp}_${safeName}`

    // Create signed upload URL (valid for 10 minutes)
    const { data: signedData, error: signedError } = await admin.storage
      .from('post-media')
      .createSignedUploadUrl(filePath)

    if (signedError) {
      // Try creating bucket first
      await admin.storage.createBucket('post-media', {
        public: true,
        fileSizeLimit: 524288000, // 500MB
      })

      const { data: retryData, error: retryError } = await admin.storage
        .from('post-media')
        .createSignedUploadUrl(filePath)

      if (retryError) {
        console.error('Presign error:', retryError)
        return NextResponse.json({ error: 'Erro ao gerar URL de upload' }, { status: 500 })
      }

      const { data: { publicUrl } } = admin.storage
        .from('post-media')
        .getPublicUrl(filePath)

      return NextResponse.json({
        signedUrl: retryData.signedUrl,
        token: retryData.token,
        path: filePath,
        publicUrl,
      })
    }

    const { data: { publicUrl } } = admin.storage
      .from('post-media')
      .getPublicUrl(filePath)

    return NextResponse.json({
      signedUrl: signedData.signedUrl,
      token: signedData.token,
      path: filePath,
      publicUrl,
    })
  } catch (error: any) {
    console.error('Presign error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
