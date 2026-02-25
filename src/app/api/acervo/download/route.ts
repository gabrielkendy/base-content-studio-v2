import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Registrar download e redirecionar
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const arquivoId = searchParams.get('id');

  if (!arquivoId) {
    return NextResponse.json(
      { error: 'id é obrigatório' },
      { status: 400 }
    );
  }

  // Buscar arquivo
  const { data: arquivo, error } = await supabase
    .from('acervo_arquivos')
    .select('*')
    .eq('id', arquivoId)
    .single();

  if (error || !arquivo) {
    return NextResponse.json(
      { error: 'Arquivo não encontrado' },
      { status: 404 }
    );
  }

  // Registrar download
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';

  await supabase
    .from('acervo_downloads')
    .insert({
      arquivo_id: arquivoId,
      ip_address: ip.split(',')[0].trim(),
      user_agent: userAgent,
      referer: referer,
    });

  // Incrementar contador
  await supabase
    .from('acervo_arquivos')
    .update({ download_count: (arquivo.download_count || 0) + 1 })
    .eq('id', arquivoId);

  // Redirecionar para o download
  return NextResponse.redirect(arquivo.drive_download_link);
}
