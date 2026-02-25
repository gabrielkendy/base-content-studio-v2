import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  listFilesInFolder, 
  getDirectDownloadLink, 
  getViewLink, 
  getThumbnailLink,
  isImage 
} from '@/lib/google-drive';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Sincronizar arquivos de uma categoria
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { categoria_id } = body;

    if (!categoria_id) {
      return NextResponse.json(
        { error: 'categoria_id é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar categoria
    const { data: categoria, error: catError } = await supabase
      .from('acervo_categorias')
      .select('*')
      .eq('id', categoria_id)
      .single();

    if (catError || !categoria) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      );
    }

    if (!categoria.drive_folder_id) {
      return NextResponse.json(
        { error: 'Categoria não tem pasta do Drive configurada' },
        { status: 400 }
      );
    }

    // Atualizar status para syncing
    await supabase
      .from('acervo_categorias')
      .update({ sync_status: 'syncing' })
      .eq('id', categoria_id);

    try {
      // Listar arquivos do Drive
      const driveFiles = await listFilesInFolder(categoria.drive_folder_id);

      // Buscar arquivos existentes
      const { data: existingFiles } = await supabase
        .from('acervo_arquivos')
        .select('drive_file_id')
        .eq('categoria_id', categoria_id);

      const existingIds = new Set(existingFiles?.map(f => f.drive_file_id) || []);

      // Preparar novos arquivos para inserção
      const newFiles = driveFiles
        .filter(file => !existingIds.has(file.id))
        .map((file, index) => ({
          categoria_id,
          filename: file.name,
          mime_type: file.mimeType,
          file_size: file.size ? parseInt(file.size) : null,
          drive_file_id: file.id,
          drive_web_view_link: getViewLink(file.id),
          drive_download_link: getDirectDownloadLink(file.id),
          drive_thumbnail_link: isImage(file.mimeType) ? getThumbnailLink(file.id, 400) : null,
          drive_modified_at: file.modifiedTime || null,
          ordem: index,
        }));

      // Inserir novos arquivos
      if (newFiles.length > 0) {
        const { error: insertError } = await supabase
          .from('acervo_arquivos')
          .insert(newFiles);

        if (insertError) {
          throw insertError;
        }
      }

      // Identificar arquivos removidos do Drive
      const driveIds = new Set(driveFiles.map(f => f.id));
      const removedIds = [...existingIds].filter(id => !driveIds.has(id));

      // Remover arquivos que não existem mais no Drive
      if (removedIds.length > 0) {
        await supabase
          .from('acervo_arquivos')
          .delete()
          .in('drive_file_id', removedIds);
      }

      // Atualizar categoria com sucesso
      await supabase
        .from('acervo_categorias')
        .update({ 
          sync_status: 'success',
          last_sync_at: new Date().toISOString(),
          sync_error: null,
        })
        .eq('id', categoria_id);

      return NextResponse.json({
        success: true,
        added: newFiles.length,
        removed: removedIds.length,
        total: driveFiles.length,
      });

    } catch (syncError: unknown) {
      const error = syncError as Error;
      // Atualizar categoria com erro
      await supabase
        .from('acervo_categorias')
        .update({ 
          sync_status: 'error',
          sync_error: error.message || 'Erro desconhecido',
        })
        .eq('id', categoria_id);

      return NextResponse.json(
        { error: 'Erro ao sincronizar: ' + (error.message || 'Erro desconhecido') },
        { status: 500 }
      );
    }

  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
