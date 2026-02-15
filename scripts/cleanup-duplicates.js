const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gpqxqykgcrpmvwxktjvp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcXhxeWtnY3JwbXZ3eGt0anZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE2MzE1MywiZXhwIjoyMDgyNzM5MTUzfQ.vc_LKoT5evW3hkDC29bgKjHB7U-XNvPbIvQMoYn8b18'
);

const clienteId = '0b60ae60-4e5c-44c1-8fab-c1e7e5384ead';

async function run() {
  // Buscar conteúdos
  const { data: conteudos } = await supabase
    .from('conteudos')
    .select('id, titulo, created_at')
    .eq('empresa_id', clienteId)
    .eq('mes', 3)
    .eq('ano', 2026)
    .order('titulo', { ascending: true })
    .order('created_at', { ascending: false });
  
  // Agrupar por título e manter apenas o mais recente
  const seen = new Map();
  const toDelete = [];
  
  for (const c of conteudos) {
    if (seen.has(c.titulo)) {
      toDelete.push(c.id);
    } else {
      seen.set(c.titulo, c.id);
    }
  }
  
  console.log(`Deletando ${toDelete.length} duplicatas...`);
  
  // Deletar links primeiro (foreign key)
  for (const id of toDelete) {
    await supabase.from('aprovacoes_links').delete().eq('conteudo_id', id);
  }
  
  // Deletar conteúdos
  if (toDelete.length > 0) {
    const { error } = await supabase
      .from('conteudos')
      .delete()
      .in('id', toDelete);
    
    if (error) console.log('Erro:', error.message);
    else console.log('✓ Duplicatas removidas');
  }
  
  // Listar os que sobraram com seus links
  console.log('\n--- CONTEÚDOS FINAIS ---\n');
  
  const { data: final } = await supabase
    .from('conteudos')
    .select('id, titulo, data_publicacao')
    .eq('empresa_id', clienteId)
    .eq('mes', 3)
    .eq('ano', 2026)
    .order('data_publicacao', { ascending: true });
  
  for (const c of final) {
    const { data: link } = await supabase
      .from('aprovacoes_links')
      .select('token')
      .eq('conteudo_id', c.id)
      .single();
    
    console.log(`📅 ${c.data_publicacao} | ${c.titulo}`);
    console.log(`🔗 https://base-content-studio-v2.vercel.app/aprovacao?token=${link?.token || 'SEM_LINK'}`);
    console.log('');
  }
}

run().catch(console.error);
