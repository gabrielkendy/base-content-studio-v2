import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractFolderId, verifyFolderAccess } from '@/lib/google-drive';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Obter categoria específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data, error } = await supabase
    .from('acervo_categorias')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PUT - Atualizar categoria
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { titulo, descricao, icone, drive_folder_url, is_public, ordem } = body;

    const updateData: Record<string, unknown> = {};
    if (titulo !== undefined) updateData.titulo = titulo;
    if (descricao !== undefined) updateData.descricao = descricao;
    if (icone !== undefined) updateData.icone = icone;
    if (is_public !== undefined) updateData.is_public = is_public;
    if (ordem !== undefined) updateData.ordem = ordem;

    // Se mudou a pasta do Drive
    if (drive_folder_url !== undefined) {
      if (drive_folder_url) {
        const folderId = extractFolderId(drive_folder_url);
        if (!folderId) {
          return NextResponse.json(
            { error: 'URL do Google Drive inválida' },
            { status: 400 }
          );
        }

        const verification = await verifyFolderAccess(folderId);
        if (!verification.ok) {
          return NextResponse.json(
            { error: verification.error },
            { status: 400 }
          );
        }

        updateData.drive_folder_id = folderId;
        updateData.drive_folder_url = drive_folder_url;
        updateData.sync_status = 'pending';
      } else {
        updateData.drive_folder_id = null;
        updateData.drive_folder_url = null;
        updateData.sync_status = null;
      }
    }

    const { data, error } = await supabase
      .from('acervo_categorias')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE - Remover categoria
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabase
    .from('acervo_categorias')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
