-- =============================================
-- MIGRATION: Blog Integration
-- Data: 2026-02-22
-- Autor: Max (Clawdbot)
-- 
-- SEGURO: Apenas ADICIONA campos, não altera nada existente
-- ROLLBACK: Colunas nullable não afetam funcionamento
-- =============================================

-- 1. Campos WordPress na tabela clientes (NOVOS)
-- Permite cada cliente ter sua própria config de WordPress
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS wp_url TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS wp_user TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS wp_app_password TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS wp_default_status TEXT DEFAULT 'draft';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS wp_default_category_id INTEGER;

-- Comentários para documentação
COMMENT ON COLUMN clientes.wp_url IS 'URL do WordPress do cliente (ex: https://site.com.br)';
COMMENT ON COLUMN clientes.wp_user IS 'Usuário WordPress para autenticação REST API';
COMMENT ON COLUMN clientes.wp_app_password IS 'Application Password do WordPress (criptografar em produção)';
COMMENT ON COLUMN clientes.wp_default_status IS 'Status padrão ao publicar: draft ou publish';
COMMENT ON COLUMN clientes.wp_default_category_id IS 'ID da categoria padrão no WordPress';

-- 2. Campos de blog na tabela conteudos (NOVOS)
-- Rastreia posts publicados no WordPress
ALTER TABLE conteudos ADD COLUMN IF NOT EXISTS wp_post_id INTEGER;
ALTER TABLE conteudos ADD COLUMN IF NOT EXISTS wp_post_url TEXT;
ALTER TABLE conteudos ADD COLUMN IF NOT EXISTS wp_published_at TIMESTAMPTZ;

-- Comentários para documentação
COMMENT ON COLUMN conteudos.wp_post_id IS 'ID do post no WordPress após publicação';
COMMENT ON COLUMN conteudos.wp_post_url IS 'URL pública do post no WordPress';
COMMENT ON COLUMN conteudos.wp_published_at IS 'Data/hora de publicação no WordPress';

-- 3. Índice para filtrar conteúdos de blog (performance)
CREATE INDEX IF NOT EXISTS idx_conteudos_categoria_blog 
ON conteudos(empresa_id, categoria) 
WHERE categoria = 'blog';

-- 4. Verificação: listar colunas adicionadas
-- Execute separadamente para confirmar:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'clientes' AND column_name LIKE 'wp_%';
