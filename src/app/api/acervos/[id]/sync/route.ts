import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * API para sincronizar arquivos do Google Drive
 * POST: Sincroniza arquivos da pasta do Drive com o cache local
 */

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

// Função para listar arquivos do Google Drive (via página pública)
async function listDriveFiles(folderId: string) {
  // Método 1: Tentar API com key (funciona para alguns casos)
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY
  
  if (apiKey) {
    try {
      const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size,thumbnailLink,webContentLink,webViewLink)&key=${apiKey}`
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        if (data.files && data.files.length > 0) {
          return data.files
        }
      }
    } catch (e) {
      console.log('API key method failed, trying scrape method')
    }
  }

  // Método 2: Scrape da página pública do Drive
  const pageUrl = `https://drive.google.com/drive/folders/${folderId}`
  const response = await fetch(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })
  
  if (!response.ok) {
    throw new Error('Pasta não encontrada ou não é pública')
  }
  
  const html = await response.text()
  
  // Extrair arquivos do HTML/JSON embarcado
  const files: any[] = []
  
  // Padrão 1: Buscar data-id e nomes de arquivos
  const fileMatches = html.matchAll(/data-id="([^"]+)"[^>]*>([^<]*\.(png|jpg|jpeg|gif|pdf|psd|ai|svg|mp4|mov))/gi)
  const seenIds = new Set<string>()
  
  for (const match of fileMatches) {
    const id = match[1]
    const name = match[2]
    if (!seenIds.has(id)) {
      seenIds.add(id)
      const ext = name.split('.').pop()?.toLowerCase() || ''
      const mimeType = getMimeType(ext)
      files.push({
        id,
        name,
        mimeType,
        size: 0
      })
    }
  }
  
  // Se não encontrou pelo método 1, tentar extrair do JSON embutido
  if (files.length === 0) {
    // Buscar padrões de nome de arquivo com extensão conhecida
    const namePattern = /\[?"([^"]+\.(png|jpg|jpeg|gif|pdf|psd|ai|svg|mp4|mov))"\]/gi
    const nameMatches = html.matchAll(namePattern)
    
    for (const match of nameMatches) {
      const name = match[1]
      if (!files.some(f => f.name === name)) {
        const ext = name.split('.').pop()?.toLowerCase() || ''
        files.push({
          id: `file-${files.length}`,
          name,
          mimeType: getMimeType(ext),
          size: 0
        })
      }
    }
  }
  
  return files
}

function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'pdf': 'application/pdf',
    'psd': 'image/vnd.adobe.photoshop',
    'ai': 'application/illustrator',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime'
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

// POST - Sincronizar arquivos do Drive
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const membership = await getUserMembership(user.id)
    if (!membership) {
      return NextResponse.json({ error: 'No active membership' }, { status: 403 })
    }

    const admin = createServiceClient()
    const orgId = membership.org_id

    // Buscar acervo
    const { data: acervo, error: acervoError } = await admin
      .from('acervos')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (acervoError || !acervo) {
      return NextResponse.json({ error: 'Acervo não encontrado' }, { status: 404 })
    }

    if (!acervo.drive_folder_id) {
      return NextResponse.json({ error: 'Acervo não tem pasta do Drive configurada' }, { status: 400 })
    }

    // Listar arquivos do Drive
    let driveFiles: any[] = []
    try {
      driveFiles = await listDriveFiles(acervo.drive_folder_id)
    } catch (error: any) {
      console.error('Drive sync error:', error)
      return NextResponse.json({ 
        error: 'Erro ao acessar pasta do Drive. Verifique se a pasta é pública.',
        details: error.message 
      }, { status: 400 })
    }

    // Limpar arquivos antigos do cache
    await admin
      .from('acervo_arquivos')
      .delete()
      .eq('acervo_id', id)

    // Inserir novos arquivos
    const arquivosParaInserir = driveFiles.map((file: any, index: number) => {
      const fileId = file.id.startsWith('file-') ? null : file.id
      return {
        acervo_id: id,
        nome: file.name,
        tipo: file.mimeType,
        tamanho: parseInt(file.size) || 0,
        url_original: fileId ? `https://drive.google.com/file/d/${fileId}/view` : null,
        url_thumbnail: file.thumbnailLink || (fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400` : null),
        url_download: file.webContentLink || (fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : null),
        drive_file_id: fileId,
        ordem: index
      }
    })

    if (arquivosParaInserir.length > 0) {
      const { error: insertError } = await admin
        .from('acervo_arquivos')
        .insert(arquivosParaInserir)

      if (insertError) {
        console.error('Error inserting files:', insertError)
        return NextResponse.json({ error: 'Erro ao salvar arquivos' }, { status: 500 })
      }
    }

    // Atualizar acervo com data do sync e total
    await admin
      .from('acervos')
      .update({ 
        ultimo_sync: new Date().toISOString(),
        total_arquivos: arquivosParaInserir.length
      })
      .eq('id', id)

    return NextResponse.json({ 
      message: 'Sincronização concluída',
      total_arquivos: arquivosParaInserir.length,
      arquivos: arquivosParaInserir
    })

  } catch (error: any) {
    console.error('Sync acervo error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
