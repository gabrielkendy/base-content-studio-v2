/**
 * POST /api/agent/media
 *
 * Sobe arquivo pro Supabase Storage e retorna URL pública. Aceita 3 modos:
 *
 *   A) multipart/form-data com `file` + `cliente` (id ou slug)
 *      curl -F "file=@imagem.jpg" -F "cliente=padaria-do-ze" \
 *           -H "Authorization: Bearer $TOKEN" \
 *           https://app.../api/agent/media
 *
 *   B) JSON com URL externa pra fazer mirror:
 *      { "source_url": "https://drive.google.com/...", "cliente": "slug" }
 *
 *   C) JSON com base64 (útil quando o agente recebe imagem inline):
 *      { "base64": "data:image/jpeg;base64,...", "cliente": "slug",
 *        "filename": "post.jpg" }
 *
 * Resposta: { url, filename, size, type, isVideo, path }
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAgent, resolveCliente } from '@/lib/agent-auth'
import { createServiceClient } from '@/lib/supabase/server'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v']
const MAX_IMAGE_SIZE = 50 * 1024 * 1024
const MAX_VIDEO_SIZE = 500 * 1024 * 1024

const BUCKET = 'post-media'

interface UploadResult {
  url: string
  filename: string
  size: number
  type: string
  path: string
  isVideo: boolean
}

async function uploadBuffer(
  admin: ReturnType<typeof createServiceClient>,
  orgId: string,
  clienteId: string,
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<UploadResult> {
  const isImage = ALLOWED_IMAGE_TYPES.includes(contentType)
  const isVideo = ALLOWED_VIDEO_TYPES.includes(contentType)
  if (!isImage && !isVideo) {
    throw new Error(`Tipo de arquivo não suportado: ${contentType}. Use JPG, PNG, WebP, GIF, MP4, MOV ou WebM.`)
  }
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
  if (buffer.length > maxSize) {
    const fileMB = (buffer.length / (1024 * 1024)).toFixed(1)
    const maxMB = Math.round(maxSize / (1024 * 1024))
    throw new Error(`Arquivo muito grande: ${fileMB}MB (máx: ${maxMB}MB). Pra vídeos maiores use upload direto via UI.`)
  }

  const ts = Date.now()
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${orgId}/${clienteId}/posts/${ts}_${safe}`

  let { error } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  })

  // Auto-cria bucket se não existir
  if (error && (error.message?.includes('not found') || error.message?.includes('Bucket'))) {
    const { error: bucketErr } = await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 524288000,
    })
    if (bucketErr && !bucketErr.message?.includes('already exists')) {
      throw new Error(`Erro ao criar bucket: ${bucketErr.message}`)
    }
    const retry = await admin.storage.from(BUCKET).upload(path, buffer, { contentType, upsert: false })
    if (retry.error) throw new Error(`Erro no upload: ${retry.error.message}`)
  } else if (error) {
    throw new Error(`Erro no upload: ${error.message}`)
  }

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)
  return {
    url: publicUrl,
    filename,
    size: buffer.length,
    type: contentType,
    path,
    isVideo,
  }
}

function inferContentType(input: {
  contentType?: string | null
  filename?: string
  fallback?: string
}): string {
  if (input.contentType && input.contentType !== 'application/octet-stream') return input.contentType
  const name = (input.filename || '').toLowerCase()
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.webp')) return 'image/webp'
  if (name.endsWith('.gif')) return 'image/gif'
  if (name.endsWith('.mp4')) return 'video/mp4'
  if (name.endsWith('.mov')) return 'video/quicktime'
  if (name.endsWith('.webm')) return 'video/webm'
  return input.fallback || 'application/octet-stream'
}

export async function POST(request: NextRequest) {
  const auth = await authenticateAgent(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceClient()
  const contentTypeHeader = request.headers.get('content-type') || ''

  try {
    let result: UploadResult

    if (contentTypeHeader.includes('multipart/form-data')) {
      // Modo A: arquivo via multipart
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      const clienteParam = (formData.get('cliente') as string | null) || (formData.get('cliente_slug') as string | null) || (formData.get('cliente_id') as string | null)

      if (!file) return NextResponse.json({ error: '`file` é obrigatório' }, { status: 400 })
      if (!clienteParam) return NextResponse.json({ error: '`cliente` é obrigatório (slug ou id)' }, { status: 400 })

      const cliente = await resolveCliente(auth.orgId, {
        id: /^[0-9a-f-]{36}$/i.test(clienteParam) ? clienteParam : undefined,
        slug: /^[0-9a-f-]{36}$/i.test(clienteParam) ? undefined : clienteParam,
      })
      if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

      const buffer = Buffer.from(await file.arrayBuffer())
      const ct = inferContentType({ contentType: file.type, filename: file.name })
      result = await uploadBuffer(admin, auth.orgId, cliente.id, buffer, file.name, ct)
    } else {
      // Modos B (URL) e C (base64) — JSON
      const body = await request.json().catch(() => ({}))
      const {
        cliente,
        cliente_id,
        cliente_slug,
        cliente_nome,
        source_url,
        base64,
        filename,
      } = body as Record<string, any>

      const target = await resolveCliente(auth.orgId, {
        id: cliente_id || cliente?.id,
        slug: cliente_slug || cliente?.slug || (typeof cliente === 'string' ? cliente : undefined),
        nome: cliente_nome || cliente?.nome,
      })
      if (!target) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

      if (source_url) {
        // Modo B: faz mirror de URL externa
        let res: Response
        try {
          res = await fetch(source_url, { redirect: 'follow' })
        } catch (err: any) {
          return NextResponse.json({ error: `Erro ao baixar source_url: ${err.message}` }, { status: 502 })
        }
        if (!res.ok) {
          return NextResponse.json({ error: `source_url retornou HTTP ${res.status}` }, { status: 502 })
        }
        const arr = await res.arrayBuffer()
        const buffer = Buffer.from(arr)
        const urlPath = (() => { try { return new URL(source_url).pathname } catch { return '' } })()
        const inferredName = filename || urlPath.split('/').pop() || `mirror-${Date.now()}.bin`
        const ct = inferContentType({
          contentType: res.headers.get('content-type'),
          filename: inferredName,
        })
        result = await uploadBuffer(admin, auth.orgId, target.id, buffer, inferredName, ct)
      } else if (base64) {
        // Modo C: base64 (data URL ou raw)
        const m = /^data:([^;]+);base64,(.+)$/.exec(base64)
        const dataPart = m ? m[2] : base64
        const ctFromDataUrl = m ? m[1] : null
        const buffer = Buffer.from(dataPart, 'base64')
        const inferredName = filename || `upload-${Date.now()}.bin`
        const ct = inferContentType({
          contentType: ctFromDataUrl,
          filename: inferredName,
        })
        result = await uploadBuffer(admin, auth.orgId, target.id, buffer, inferredName, ct)
      } else {
        return NextResponse.json({
          error: 'Forneça `file` (multipart), `source_url` (mirror) ou `base64` (data URL)',
        }, { status: 400 })
      }
    }

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('[agent/media] error:', err)
    return NextResponse.json({ error: err.message || 'Erro no upload' }, { status: 500 })
  }
}
