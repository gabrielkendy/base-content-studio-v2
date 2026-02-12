// Execute migration diretamente no Supabase PostgreSQL
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Connection string do Supabase (usar a connection pooler)
// Tentar conexão direta (não pooler)
const connectionString = 'postgresql://postgres:ykTx5qWzA7ThdR74@db.gpqxqykgcrpmvwxktjvp.supabase.co:5432/postgres';

async function runMigration() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Conectando ao Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado!\n');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260212_planejamento_anual.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📋 Executando migration...\n');
    
    // Executar o SQL completo
    await client.query(sql);
    
    console.log('✅ Migration executada com sucesso!\n');

    // Verificar se as tabelas foram criadas
    const { rows } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('campanhas', 'campanha_conteudos', 'campanha_historico')
      ORDER BY table_name;
    `);

    console.log('📊 Tabelas criadas:');
    rows.forEach(row => console.log(`   ✓ ${row.table_name}`));

    // Verificar views
    const { rows: views } = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'v_campanha%' OR table_name LIKE 'v_planejamento%'
      ORDER BY table_name;
    `);

    console.log('\n📊 Views criadas:');
    views.forEach(row => console.log(`   ✓ ${row.table_name}`));

    console.log('\n🎉 FASE 1 CONCLUÍDA COM SUCESSO!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    // Se for erro de tabela já existe, tudo bem
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Algumas estruturas já existiam (isso é OK se for re-execução)');
    }
  } finally {
    await client.end();
    console.log('\n🔌 Conexão encerrada.');
  }
}

runMigration();
