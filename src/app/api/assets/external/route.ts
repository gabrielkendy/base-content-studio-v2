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

// Detect external service from URL
function detectService(url: string): { service: string; fileId: string | null; name: string | null } {
  // Google Drive patterns
  // https://drive.google.com/file/d/FILE_ID/view
  // https://drive.google.com/open?id=FILE_ID
  // https://docs.google.com/document/d/DOC_ID/edit
  // https://docs.google.com/spreadsheets/d/SHEET_ID/edit
  // https://docs.google.com/presentation/d/SLIDE_ID/edit
  
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([^\/\?]+)/)
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/)
  const docsMatch = url.match(/docs\.google\.com\/(document|spreadsheets|presentation)\/d\/([^\/\?]+)/)
  const driveFolderMatch = url.match(/drive\.google\.com\/drive\/folders\/([^\/\?]+)/)
  
  if (driveFileMatch) {
    return { service: 'google-drive', fileId: driveFileMatch[1], name: null }
  }
  if (driveOpenMatch) {
    return { service: 'google-drive', fileId: driveOpenMatch[1], name: null }
  }
  if (docsMatch) {
    const types: Record<string, string> = {
      'document': 'google-docs',
      'spreadsheets': 'google-sheets', 
      'presentation': 'google-slides'
    }
    return { service: types[docsMatch[1]] || 'google-drive', fileId: docsMatch[2], name: null }
  }
  if (driveFolderMatch) {
    return { service: 'google-drive-folder', fileId: driveFolderMatch[1], name: null }
  }
  
  // Dropbox patterns
  // https://www.dropbox.com/s/FILE_ID/filename.ext
  // https://www.dropbox.com/scl/fi/FILE_ID/filename.ext
  const dropboxMatch = url.match(/dropbox\.com\/(?:s|scl\/fi)\/([^\/\?]+)\/([^\?]+)/)
  if (dropboxMatch) {
    return { service: 'dropbox', fileId: dropboxMatch[1], name: decodeURIComponent(dropboxMatch[2]) }
  }
  
  // OneDrive patterns
  const onedriveMatch = url.match(/onedrive\.live\.com|1drv\.ms/)
  if (onedriveMatch) {
    return { service: 'onedrive', fileId: null, name: null }
  }
  
  // Figma patterns
  const figmaMatch = url.match(/figma\.com\/(file|design)\/([^\/\?]+)/)
  if (figmaMatch) {
    return { service: 'figma', fileId: figmaMatch[2], name: null }
  }
  
  // Canva patterns
  const canvaMatch = url.match(/canva\.com\/design\/([^\/\?]+)/)
  if (canvaMatch) {
    return { service: 'canva', fileId: canvaMatch[1], name: null }
  }
  
  // Generic URL
  return { service: 'external', fileId: null, name: null }
}

// Get file extension from name or URL
function getFileType(name: string, service: string): string {
  if (service === 'google-docs') return 'application/vnd.google-apps.document'
  if (service === 'google-sheets') return 'application/vnd.google-apps.spreadsheet'
  if (service === 'google-slides') return 'application/vnd.google-apps.presentation'
  if (service === 'google-drive-folder') return 'folder'
  if (service === 'figma') return 'application/figma'
  if (service === 'canva') return 'application/canva'
  
  const ext = name.split('.').pop()?.toLowerCase()
  const types: Record<string, string> = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'psd': 'image/vnd.adobe.photoshop',
    'ai': 'application/illustrator',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
  }
  
  return types[ext || ''] || 'application/octet-stream'
}

// Register an external file (Google Drive, Dropbox, etc.)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { url, name, clienteId, orgId, folder } = await req.json()

    if (!url || !clienteId || !orgId) {
      return NextResponse.json({ error: 'url, clienteId, and orgId required' }, { status: 400 })
    }

    // Detect service and extract info
    const detected = detectService(url)
    const fileName = name || detected.name || `Arquivo ${detected.service}`
    const fileType = getFileType(fileName, detected.service)
    
    const supabase = createServiceClient()

    // Check if this URL already exists for this client
    const { data: existing } = await supabase
      .from('client_assets')
      .select('id')
      .eq('cliente_id', clienteId)
      .eq('file_url', url)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Este link já foi adicionado', existing: true }, { status: 400 })
    }

    // Insert record
    const { data, error } = await supabase
      .from('client_assets')
      .insert({
        org_id: orgId,
        cliente_id: clienteId,
        folder: folder || '/',
        filename: fileName,
        file_url: url,
        file_type: fileType,
        file_size: null, // External files don't have size
        thumbnail_url: null,
        tags: [detected.service], // Tag with service name
        description: `Arquivo externo: ${detected.service}`,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Insert external asset error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      data, 
      service: detected.service,
      message: `Arquivo do ${detected.service} adicionado com sucesso!`
    })
  } catch (err: any) {
    console.error('External asset route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
