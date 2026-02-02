import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const BUCKET = 'post-media'

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

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createServiceClient()

    const { data: membership } = await admin
      .from('members')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (!membership) return NextResponse.json({ error: 'No membership' }, { status: 403 })

    const { files, conteudoId, clienteId } = await req.json()

    if (!files?.length || !conteudoId || !clienteId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Ensure bucket exists with large file support
    const { data: bucket } = await admin.storage.getBucket(BUCKET)
    if (!bucket) {
      await admin.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 5368709120, // 5GB
      })
    }

    const presigned = []

    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const ts = Date.now()
      const storagePath = `${membership.org_id}/${clienteId}/posts/${conteudoId}/${ts}-${safeName}`

      const { data, error } = await admin.storage
        .from(BUCKET)
        .createSignedUploadUrl(storagePath)

      if (error) { console.error('Presign error:', error); continue }

      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`

      presigned.push({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storagePath,
        uploadUrl: data.signedUrl,
        token: data.token,
        publicUrl,
      })
    }

    return NextResponse.json({ urls: presigned })
  } catch (err: any) {
    console.error('Post media presign error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
