import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Listar arquivos de uma categoria
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoriaId = searchParams.get('categoria_id');

  if (!categoriaId) {
    return NextResponse.json(
      { error: 'categoria_id é obrigatório' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('acervo_arquivos')
    .select('*')
    .eq('categoria_id', categoriaId)
    .order('ordem', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
