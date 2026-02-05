-- M1: Workflow Kanban V3 - Novos status e sub-status
-- Data: 2026-02-05

-- Adicionar sub_status na tabela conteudos
ALTER TABLE conteudos 
ADD COLUMN IF NOT EXISTS sub_status varchar(50) DEFAULT NULL;

-- Adicionar campo de mídia se não existir
ALTER TABLE conteudos 
ADD COLUMN IF NOT EXISTS midia_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS midia_type varchar(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS canais text[] DEFAULT '{}';

-- Atualizar status existentes para o novo padrão
UPDATE conteudos SET status = 'conteudo' WHERE status = 'producao';
UPDATE conteudos SET status = 'aprovacao_cliente' WHERE status = 'aprovacao';
UPDATE conteudos SET status = 'aguardando_agendamento' WHERE status = 'aprovado';

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_conteudos_sub_status ON conteudos(sub_status) WHERE sub_status IS NOT NULL;

-- Comentários
COMMENT ON COLUMN conteudos.sub_status IS 'Sub-status para a coluna Conteúdo: aguardando_texto, texto_concluido, aguardando_design, design_concluido';
COMMENT ON COLUMN conteudos.midia_url IS 'URL da mídia principal (imagem ou vídeo)';
COMMENT ON COLUMN conteudos.midia_type IS 'Tipo da mídia: image/*, video/*';
COMMENT ON COLUMN conteudos.canais IS 'Array de canais para publicação: instagram, tiktok, facebook, etc';
