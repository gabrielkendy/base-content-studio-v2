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

// Função para listar arquivos do Google Drive
async function listDriveFiles(folderId: string) {
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY
  
  if (!apiKey) {
    throw new Error('GOOGLE_DRIVE_API_KEY não configurada')
  }

  const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size,thumbnailLink,webContentLink,webViewLink)&key=${apiKey}`
  
  const response = await fetch(url)
  
  if (!response.ok) {
    const error = await response.text()
    console.error('Google Drive API error:', error)
    throw new Error('Erro ao acessar Google Drive')
  }
  
  const data = await response.json()
  return data.files || []
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
    const arquivosParaInserir = driveFiles.map((file: any, index: number) => ({
      acervo_id: id,
      nome: file.name,
      tipo: file.mimeType,
      tamanho: parseInt(file.size) || 0,
      url_original: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
      url_thumbnail: file.thumbnailLink || null,
      url_download: file.webContentLink || `https://drive.google.com/uc?export=download&id=${file.id}`,
      drive_file_id: file.id,
      ordem: index
    }))

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
