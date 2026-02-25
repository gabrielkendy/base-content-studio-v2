// Execute migration 016 - Acervo Digital
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Connection string do Supabase
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
    const sqlPath = path.join(__dirname, '..', 'sql', '016_acervo_digital.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📋 Executando migration 016_acervo_digital.sql...\n');
    
    // Executar o SQL completo
    await client.query(sql);
    
    console.log('✅ Migration executada com sucesso!\n');

    // Verificar se as tabelas foram criadas
    const { rows } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'acervo_%'
      ORDER BY table_name;
    `);

    console.log('📊 Tabelas criadas:');
    rows.forEach(row => console.log(`   ✓ ${row.table_name}`));

    console.log('\n🎉 FASE 1 - BANCO DE DADOS CONCLUÍDA!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n⚠️  Estruturas já existiam (OK se for re-execução)');
    }
  } finally {
    await client.end();
    console.log('\n🔌 Conexão encerrada.');
  }
}

runMigration();
