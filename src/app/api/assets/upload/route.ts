import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const BUCKET = 'client-assets'

async function ensureBucket(supabase: ReturnType<typeof createServiceClient>) {
  const { data } = await supabase.storage.getBucket(BUCKET)
  if (!data) {
    await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 52428800, // 50MB per file
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient()
    await ensureBucket(supabase)

    const formData = await req.formData()
    const files = formData.getAll('file') as File[]
    const clienteId = formData.get('clienteId') as string
    const orgId = formData.get('orgId') as string
    const folder = (formData.get('folder') as string) || '/'
    const userId = formData.get('userId') as string | null

    if (!files.length || !clienteId || !orgId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const results = []

    for (const file of files) {
      const ext = file.name.split('.').pop() || 'bin'
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const timestamp = Date.now()
      const storageName = `${timestamp}-${safeName}`
      const folderClean = folder.replace(/^\/+|\/+$/g, '') || 'root'
      const storagePath = `${orgId}/${clienteId}/${folderClean}/${storageName}`

      // Upload to storage
      const arrayBuffer = await file.arrayBuffer()
      const uploadRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': file.type || 'application/octet-stream',
            'x-upsert': 'true',
          },
          body: arrayBuffer,
        }
      )

      if (!uploadRes.ok) {
        console.error('Upload error:', await uploadRes.text())
        continue
      }

      const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`

      // Generate thumbnail URL for images
      const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)
      const thumbnailUrl = isImage
        ? `${SUPABASE_URL}/storage/v1/render/image/public/${BUCKET}/${storagePath}?width=300&height=300&resize=contain`
        : null

      // Insert record
      const { data: record, error } = await supabase
        .from('client_assets')
        .insert({
          org_id: orgId,
          cliente_id: clienteId,
          folder: folder === '/' ? '/' : `/${folderClean}`,
          filename: file.name,
          file_url: fileUrl,
          file_type: file.type || null,
          file_size: file.size,
          thumbnail_url: thumbnailUrl,
          tags: [],
          uploaded_by: userId || null,
        })
        .select()
        .single()

      if (error) {
        console.error('DB insert error:', error)
        continue
      }

      results.push(record)
    }

    return NextResponse.json({ data: results })
  } catch (err: unknown) {
    console.error('Upload route error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
