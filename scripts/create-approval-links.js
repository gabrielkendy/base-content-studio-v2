const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  'https://gpqxqykgcrpmvwxktjvp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcXhxeWtnY3JwbXZ3eGt0anZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE2MzE1MywiZXhwIjoyMDgyNzM5MTUzfQ.vc_LKoT5evW3hkDC29bgKjHB7U-XNvPbIvQMoYn8b18'
);

const clienteId = '0b60ae60-4e5c-44c1-8fab-c1e7e5384ead'; // FlexByo

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function run() {
  // Buscar conteúdos recém criados do FlexByo
  const { data: conteudos, error } = await supabase
    .from('conteudos')
    .select('*')
    .eq('empresa_id', clienteId)
    .eq('mes', 3)
    .eq('ano', 2026)
    .order('ordem', { ascending: true });
  
  if (error) {
    console.log('Erro buscando conteúdos:', error.message);
    return;
  }
  
  console.log(`Encontrados ${conteudos.length} conteúdos\n`);
  
  const results = [];
  
  for (const conteudo of conteudos) {
    console.log(`Processando: ${conteudo.titulo}`);
    
    // Verificar se já tem link de aprovação
    const { data: existing } = await supabase
      .from('aprovacoes_links')
      .select('token')
      .eq('conteudo_id', conteudo.id)
      .single();
    
    if (existing) {
      console.log('  ✓ Link já existe');
      results.push({
        titulo: conteudo.titulo,
        data: conteudo.data_publicacao,
        token: existing.token
      });
      continue;
    }
    
    // Criar novo link
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    const { error: linkError } = await supabase
      .from('aprovacoes_links')
      .insert({
        conteudo_id: conteudo.id,
        token: token,
        status: 'pendente',
        expires_at: expiresAt.toISOString()
      });
    
    if (linkError) {
      console.log('  ❌ Erro:', linkError.message);
      continue;
    }
    
    console.log('  ✓ Link criado');
    results.push({
      titulo: conteudo.titulo,
      data: conteudo.data_publicacao,
      token: token
    });
  }
  
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   LINKS DE APROVAÇÃO - FLEXBYO (Março 2026)');
  console.log('   Evento: Jornada dos 7 Chakras - Chakra Sacral');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  
  results.forEach(r => {
    console.log(`📅 ${r.data} | ${r.titulo}`);
    console.log(`🔗 https://base-content-studio-v2.vercel.app/aprovacao?token=${r.token}`);
    console.log('');
  });
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ ${results.length} links de aprovação prontos!`);
  console.log('═══════════════════════════════════════════════════════════');
}

run().catch(console.error);
