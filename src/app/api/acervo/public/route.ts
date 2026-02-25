import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Listar acervos públicos de um cliente (para visualização do cliente)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clienteSlug = searchParams.get('cliente');

  if (!clienteSlug) {
    return NextResponse.json(
      { error: 'cliente é obrigatório' },
      { status: 400 }
    );
  }

  // Buscar cliente pelo slug
  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('id, nome, logo_url, cores')
    .eq('slug', clienteSlug)
    .single();

  if (clienteError || !cliente) {
    return NextResponse.json(
      { error: 'Cliente não encontrado' },
      { status: 404 }
    );
  }

  // Buscar categorias públicas do cliente
  const { data: categorias, error: categoriasError } = await supabase
    .from('acervo_categorias')
    .select(`
      id,
      titulo,
      descricao,
      icone,
      ordem,
      sync_status,
      last_sync_at
    `)
    .eq('cliente_id', cliente.id)
    .eq('is_public', true)
    .order('ordem', { ascending: true });

  if (categoriasError) {
    return NextResponse.json({ error: categoriasError.message }, { status: 500 });
  }

  // Contar arquivos por categoria
  const categoriasComContagem = await Promise.all(
    (categorias || []).map(async (cat) => {
      const { count } = await supabase
        .from('acervo_arquivos')
        .select('*', { count: 'exact', head: true })
        .eq('categoria_id', cat.id);

      return {
        ...cat,
        total_arquivos: count || 0,
      };
    })
  );

  return NextResponse.json({
    cliente: {
      nome: cliente.nome,
      logo_url: cliente.logo_url,
      cores: cliente.cores,
    },
    categorias: categoriasComContagem,
  });
}
