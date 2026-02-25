import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { extractFolderId, verifyFolderAccess } from '@/lib/google-drive';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Listar categorias de um cliente
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get('cliente_id');
  const orgId = searchParams.get('org_id');

  if (!clienteId && !orgId) {
    return NextResponse.json({ error: 'cliente_id ou org_id é obrigatório' }, { status: 400 });
  }

  let query = supabase
    .from('acervo_categorias')
    .select('*')
    .order('ordem', { ascending: true });

  if (clienteId) {
    query = query.eq('cliente_id', clienteId);
  }
  if (orgId) {
    query = query.eq('org_id', orgId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST - Criar nova categoria
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { org_id, cliente_id, titulo, descricao, icone, drive_folder_url } = body;

    if (!org_id || !cliente_id || !titulo) {
      return NextResponse.json(
        { error: 'org_id, cliente_id e titulo são obrigatórios' },
        { status: 400 }
      );
    }

    // Se tiver URL do Drive, validar e extrair folder ID
    let drive_folder_id: string | null = null;
    if (drive_folder_url) {
      drive_folder_id = extractFolderId(drive_folder_url);
      if (!drive_folder_id) {
        return NextResponse.json(
          { error: 'URL do Google Drive inválida' },
          { status: 400 }
        );
      }

      // Verificar acesso à pasta
      const verification = await verifyFolderAccess(drive_folder_id);
      if (!verification.ok) {
        return NextResponse.json(
          { error: verification.error },
          { status: 400 }
        );
      }
    }

    // Buscar próxima ordem
    const { data: lastCategoria } = await supabase
      .from('acervo_categorias')
      .select('ordem')
      .eq('cliente_id', cliente_id)
      .order('ordem', { ascending: false })
      .limit(1)
      .single();

    const ordem = (lastCategoria?.ordem || 0) + 1;

    // Criar categoria
    const { data, error } = await supabase
      .from('acervo_categorias')
      .insert({
        org_id,
        cliente_id,
        titulo,
        descricao: descricao || null,
        icone: icone || 'folder',
        drive_folder_id,
        drive_folder_url: drive_folder_url || null,
        ordem,
        sync_status: drive_folder_id ? 'pending' : null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe uma categoria com esse título para este cliente' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
