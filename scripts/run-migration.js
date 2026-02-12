// Script para executar migration no Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://gpqxqykgcrpmvwxktjvp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwcXhxeWtnY3JwbXZ3eGt0anZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzE2MzE1MywiZXhwIjoyMDgyNzM5MTUzfQ.vc_LKoT5evW3hkDC29bgKjHB7U-XNvPbIvQMoYn8b18';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Iniciando migration...\n');
  
  // Ler o arquivo SQL
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260212_planejamento_anual.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  // Dividir em statements individuais (por segurança)
  // Vamos executar cada bloco separadamente
  
  const statements = sql
    .split(/;[\s]*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`📋 ${statements.length} statements para executar\n`);
  
  let success = 0;
  let errors = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' });
      
      if (error) {
        // Tentar executar diretamente via REST se rpc não existir
        const { data, error: error2 } = await supabase.from('_exec').select('*').limit(0);
        if (error2) {
          console.log(`⚠️  [${i+1}/${statements.length}] Aviso: ${error.message.substring(0, 50)}...`);
        }
        errors++;
      } else {
        console.log(`✅ [${i+1}/${statements.length}] ${preview}...`);
        success++;
      }
    } catch (e) {
      console.log(`⚠️  [${i+1}/${statements.length}] ${preview}... (${e.message})`);
      errors++;
    }
  }
  
  console.log(`\n📊 Resultado: ${success} sucesso, ${errors} erros/avisos`);
  console.log('\n💡 Para executar SQL complexo, use o Supabase Dashboard > SQL Editor');
  console.log('   URL: https://supabase.com/dashboard/project/gpqxqykgcrpmvwxktjvp/sql');
}

runMigration().catch(console.error);
