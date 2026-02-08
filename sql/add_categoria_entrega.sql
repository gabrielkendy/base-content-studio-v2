-- Migration: Adicionar categoria de entrega
-- Data: 2026-02-07
-- Descrição: Permite criar demandas que não são posts de redes sociais

-- 1. Adicionar coluna categoria na tabela conteudos
ALTER TABLE conteudos 
ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) DEFAULT 'post_social';

-- 2. Adicionar colunas categoria e tipo na tabela solicitacoes
ALTER TABLE solicitacoes 
ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) DEFAULT 'post_social';

ALTER TABLE solicitacoes 
ADD COLUMN IF NOT EXISTS tipo VARCHAR(50);

-- 3. Criar índice para melhor performance em filtros
CREATE INDEX IF NOT EXISTS idx_conteudos_categoria ON conteudos(categoria);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_categoria ON solicitacoes(categoria);

-- 4. Comentários para documentação
COMMENT ON COLUMN conteudos.categoria IS 'Categoria de entrega: post_social, material_grafico, apresentacao, video_offline';
COMMENT ON COLUMN solicitacoes.categoria IS 'Categoria de entrega: post_social, material_grafico, apresentacao, video_offline';
COMMENT ON COLUMN solicitacoes.tipo IS 'Tipo específico dentro da categoria (ex: banner, flyer, pitch)';
