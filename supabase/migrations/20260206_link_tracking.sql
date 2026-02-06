-- Adicionar campos de tracking nos links de aprovação
ALTER TABLE aprovacoes_links 
ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS views JSONB DEFAULT '[]'::jsonb;

-- Campos de feedback no conteúdo
ALTER TABLE conteudos 
ADD COLUMN IF NOT EXISTS comentario_cliente TEXT,
ADD COLUMN IF NOT EXISTS cliente_nome_feedback TEXT;

-- Índice para busca por links visualizados
CREATE INDEX IF NOT EXISTS idx_aprovacoes_links_viewed ON aprovacoes_links(last_viewed_at) WHERE last_viewed_at IS NOT NULL;
