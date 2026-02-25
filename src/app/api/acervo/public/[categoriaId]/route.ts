import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Listar arquivos de uma categoria (para visualização do cliente)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ categoriaId: string }> }
) {
  const { categoriaId } = await params;

  // Verificar se a categoria é pública
  const { data: categoria, error: catError } = await supabase
    .from('acervo_categorias')
    .select(`
      id,
      titulo,
      descricao,
      icone,
      is_public,
      cliente_id,
      clientes (
        nome,
        slug,
        logo_url,
        cores
      )
    `)
    .eq('id', categoriaId)
    .single();

  if (catError || !categoria) {
    return NextResponse.json(
      { error: 'Categoria não encontrada' },
      { status: 404 }
    );
  }

  if (!categoria.is_public) {
    return NextResponse.json(
      { error: 'Categoria não é pública' },
      { status: 403 }
    );
  }

  // Buscar arquivos da categoria
  const { data: arquivos, error: arquivosError } = await supabase
    .from('acervo_arquivos')
    .select(`
      id,
      filename,
      mime_type,
      file_size,
      drive_web_view_link,
      drive_download_link,
      drive_thumbnail_link,
      download_count,
      created_at
    `)
    .eq('categoria_id', categoriaId)
    .order('ordem', { ascending: true });

  if (arquivosError) {
    return NextResponse.json({ error: arquivosError.message }, { status: 500 });
  }

  return NextResponse.json({
    categoria: {
      id: categoria.id,
      titulo: categoria.titulo,
      descricao: categoria.descricao,
      icone: categoria.icone,
    },
    cliente: categoria.clientes,
    arquivos: arquivos || [],
  });
}
