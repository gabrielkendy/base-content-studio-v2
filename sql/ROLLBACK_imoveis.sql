-- =====================================================
-- ROLLBACK: Remover Módulo de Imóveis
-- Data: 15/02/2026
-- IMPORTANTE: Execute com cuidado!
-- =====================================================

-- =====================================================
-- 1. VERIFICAR SE TEM DADOS (execute primeiro)
-- =====================================================

-- Contar registros antes de deletar
SELECT 'imoveis' as tabela, COUNT(*) as registros FROM imoveis
UNION ALL
SELECT 'imoveis_config' as tabela, COUNT(*) as registros FROM imoveis_config;

-- =====================================================
-- 2. BACKUP DOS DADOS (execute se tiver registros)
-- =====================================================

-- Exportar dados para JSON antes de deletar (opcional)
-- SELECT * FROM imoveis;
-- SELECT * FROM imoveis_config;

-- =====================================================
-- 3. REMOVER TABELAS
-- =====================================================

-- Dropar trigger primeiro
DROP TRIGGER IF EXISTS imoveis_updated_at ON imoveis;

-- Dropar função do trigger
DROP FUNCTION IF EXISTS update_imoveis_updated_at();

-- Dropar políticas RLS
DROP POLICY IF EXISTS "imoveis_select_policy" ON imoveis;
DROP POLICY IF EXISTS "imoveis_insert_policy" ON imoveis;
DROP POLICY IF EXISTS "imoveis_update_policy" ON imoveis;
DROP POLICY IF EXISTS "imoveis_delete_policy" ON imoveis;
DROP POLICY IF EXISTS "imoveis_config_all_policy" ON imoveis_config;

-- Dropar tabelas (config primeiro por não ter FK, depois imoveis)
DROP TABLE IF EXISTS imoveis_config CASCADE;
DROP TABLE IF EXISTS imoveis CASCADE;

-- =====================================================
-- 4. VERIFICAR SE REMOVEU
-- =====================================================

-- Deve retornar vazio se funcionou
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('imoveis', 'imoveis_config');

-- =====================================================
-- FIM DO ROLLBACK
-- =====================================================
