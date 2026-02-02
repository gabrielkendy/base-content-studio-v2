import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const BUCKET = 'client-assets'

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

// Generate presigned upload URLs so client uploads directly to Supabase Storage
// This bypasses Vercel's 4.5MB body limit
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { files, clienteId, orgId, folder } = await req.json()

    if (!files?.length || !clienteId || !orgId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Ensure bucket exists
    const { data: bucket } = await supabase.storage.getBucket(BUCKET)
    if (!bucket) {
      await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 52428800,
      })
    }

    const folderClean = (folder || '/').replace(/^\/+|\/+$/g, '') || 'root'
    const presignedUrls = []

    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const timestamp = Date.now()
      const storagePath = `${orgId}/${clienteId}/${folderClean}/${timestamp}-${safeName}`

      // Create signed upload URL (valid for 10 minutes)
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUploadUrl(storagePath)

      if (error) {
        console.error('Presign error:', error)
        continue
      }

      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
      const thumbnailUrl = isImage
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/render/image/public/${BUCKET}/${storagePath}?width=300&height=300&resize=contain`
        : null

      presignedUrls.push({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        storagePath,
        uploadUrl: data.signedUrl,
        token: data.token,
        publicUrl,
        thumbnailUrl,
        folder: folder === '/' ? '/' : `/${folderClean}`,
      })
    }

    return NextResponse.json({ urls: presignedUrls, userId: user.id })
  } catch (err: any) {
    console.error('Presign route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
