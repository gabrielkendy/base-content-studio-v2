import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { 
  listFilesInFolder, 
  getDirectDownloadLink, 
  getViewLink, 
  getThumbnailLink,
  isImage 
} from '@/lib/google-drive'

/**
 * API para sincronizar arquivos do Google Drive
 * POST: Sincroniza arquivos da pasta do Drive com o cache local
 * Usa Service Account para acesso autenticado
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

    // Listar arquivos do Drive usando Service Account
    let driveFiles: Awaited<ReturnType<typeof listFilesInFolder>> = []
    try {
      driveFiles = await listFilesInFolder(acervo.drive_folder_id)
    } catch (error: unknown) {
      const err = error as Error
      console.error('Drive sync error:', err)
      
      // Mensagem de erro mais clara
      let errorMessage = 'Erro ao acessar pasta do Drive.'
      if (err.message?.includes('not configured')) {
        errorMessage = 'Service Account não configurada. Configure GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_SERVICE_ACCOUNT_KEY no .env'
      } else if (err.message?.includes('403') || err.message?.includes('permission')) {
        errorMessage = 'Sem permissão. Compartilhe a pasta com: base-content-drive@ia-studio-435515.iam.gserviceaccount.com'
      } else if (err.message?.includes('404') || err.message?.includes('not found')) {
        errorMessage = 'Pasta não encontrada. Verifique o link do Drive.'
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: err.message 
      }, { status: 400 })
    }

    // Limpar arquivos antigos do cache
    await admin
      .from('acervo_arquivos')
      .delete()
      .eq('acervo_id', id)

    // Inserir novos arquivos
    const arquivosParaInserir = driveFiles.map((file, index) => ({
      acervo_id: id,
      nome: file.name,
      tipo: file.mimeType,
      tamanho: file.size ? parseInt(file.size) : 0,
      url_original: getViewLink(file.id),
      url_thumbnail: isImage(file.mimeType) ? getThumbnailLink(file.id, 400) : null,
      url_download: getDirectDownloadLink(file.id),
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

  } catch (error: unknown) {
    const err = error as Error
    console.error('Sync acervo error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
