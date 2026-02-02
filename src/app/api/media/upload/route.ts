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

const MAX_IMAGE_SIZE = 50 * 1024 * 1024   // 50MB
const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024  // 2GB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']

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

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const clienteId = formData.get('clienteId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!clienteId) {
      return NextResponse.json({ error: 'clienteId is required' }, { status: 400 })
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type)

    if (!isImage && !isVideo) {
      return NextResponse.json({ 
        error: `Tipo de arquivo não suportado: ${file.type}. Use JPG, PNG, WebP, GIF, MP4, MOV ou WebM.` 
      }, { status: 400 })
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
    if (file.size > maxSize) {
      const maxMB = maxSize / (1024 * 1024)
      return NextResponse.json({ 
        error: `Arquivo muito grande. Máximo: ${maxMB}MB para ${isVideo ? 'vídeos' : 'imagens'}.` 
      }, { status: 400 })
    }

    const admin = createServiceClient()

    // Verify client belongs to org
    const { data: cliente, error: clienteError } = await admin
      .from('clientes')
      .select('id, org_id')
      .eq('id', clienteId)
      .eq('org_id', membership.org_id)
      .single()

    if (clienteError || !cliente) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${membership.org_id}/${clienteId}/posts/${timestamp}_${safeName}`

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: uploadData, error: uploadError } = await admin.storage
      .from('post-media')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      
      // If bucket doesn't exist, try to create it
      if (uploadError.message?.includes('not found') || uploadError.message?.includes('Bucket')) {
        // Create bucket
        const { error: bucketError } = await admin.storage.createBucket('post-media', {
          public: true,
          fileSizeLimit: 524288000, // 500MB
        })
        
        if (bucketError && !bucketError.message?.includes('already exists')) {
          console.error('Bucket creation error:', bucketError)
          return NextResponse.json({ error: 'Erro ao criar storage. Tente novamente.' }, { status: 500 })
        }

        // Retry upload
        const { data: retryData, error: retryError } = await admin.storage
          .from('post-media')
          .upload(filePath, buffer, {
            contentType: file.type,
            upsert: false,
          })

        if (retryError) {
          console.error('Storage retry error:', retryError)
          return NextResponse.json({ error: 'Erro ao fazer upload do arquivo.' }, { status: 500 })
        }
      } else {
        return NextResponse.json({ error: 'Erro ao fazer upload do arquivo.' }, { status: 500 })
      }
    }

    // Get public URL
    const { data: { publicUrl } } = admin.storage
      .from('post-media')
      .getPublicUrl(filePath)

    return NextResponse.json({
      url: publicUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
      path: filePath,
      isVideo,
    })
  } catch (error: any) {
    console.error('Media upload error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
